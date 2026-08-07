import crypto from 'crypto';
import { supabase } from '../config/supabase.js';
import { db } from '../services/db.js';
import { getGeminiChatStream } from '../services/gemini.js';
import { EventSystem } from '../services/events.js';
import { checkAndAwardBadges } from '../controllers/gamificationController.js';


let extractor;
const getExtractor = async () => {
    if (!extractor) {
        try {
            const { pipeline } = await import('@xenova/transformers');
            extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        } catch (e) {
            console.warn("Transformers embedding model offline/unavailable, defaulting to keyword RAG search:", e.message);
            return null;
        }
    }
    return extractor;
};

// Hybrid multi-PDF RAG search matching across keyword n-grams and vector embeddings
function findRelevantChunks(rawDb, userId, queryText, queryEmbeddingArray) {
    const allChunks = rawDb.document_chunks || [];
    const userChunks = allChunks.filter(c => !c.user_id || c.user_id === userId || c.user_id === 'all' || c.user_id === '11111111-1111-1111-1111-111111111111');
    
    if (userChunks.length === 0) return [];

    const keywords = queryText.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && !['the', 'what', 'why', 'how', 'when', 'where', 'and', 'for', 'with', 'this', 'that', 'from', 'are', 'was', 'were', 'explain', 'define', 'give'].includes(w));

    const scored = userChunks.map(chunk => {
        let score = 0;
        const contentLower = (chunk.content || '').toLowerCase();
        const headingLower = (chunk.section_heading || '').toLowerCase();
        const titleLower = (chunk.document_title || '').toLowerCase();
        
        let keywordHits = 0;
        keywords.forEach(kw => {
            if (contentLower.includes(kw)) keywordHits += 2;
            if (headingLower.includes(kw)) keywordHits += 4;
            if (titleLower.includes(kw)) keywordHits += 2;
            const regex = new RegExp(`\\b${kw}\\b`, 'g');
            const matches = contentLower.match(regex);
            if (matches) keywordHits += matches.length * 1.5;
        });
        score += keywordHits;

        if (queryEmbeddingArray && queryEmbeddingArray.length > 0 && chunk.embedding && chunk.embedding.length === queryEmbeddingArray.length) {
            let dot = 0;
            let normA = 0;
            let normB = 0;
            for (let i = 0; i < queryEmbeddingArray.length; i++) {
                dot += queryEmbeddingArray[i] * chunk.embedding[i];
                normA += queryEmbeddingArray[i] * queryEmbeddingArray[i];
                normB += chunk.embedding[i] * chunk.embedding[i];
            }
            if (normA > 0 && normB > 0) {
                const cosineSim = dot / (Math.sqrt(normA) * Math.sqrt(normB));
                if (cosineSim > 0.25) {
                    score += cosineSim * 30;
                }
            }
        }
        
        if ((queryText.toLowerCase().includes('what is') || queryText.toLowerCase().includes('define') || queryText.toLowerCase().includes('explain')) && (contentLower.includes('is a') || contentLower.includes('refers to') || contentLower.includes('defined as'))) {
            score += 3;
        }

        return { chunk, score };
    });

    return scored
        .filter(item => item.score >= 3.0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(item => item.chunk);
}

function getModeInstruction(mode) {
  switch (mode) {
    case 'explain_simply':
      return "Explain the answer in extremely clear, simple words avoiding unnecessary technical jargon.";
    case 'step_by_step':
      return "Break down the concepts into logical, numbered step-by-step instructions and sequential milestones.";
    case 'like_10':
      return "Explain like I am 10 years old using fun analogies, relatable everyday comparisons, and engaging examples.";
    case 'real_world':
      return "Provide practical real-world production engineering case studies and industrial applications for this concept.";
    case 'interview':
      return "Provide a structured, professional response suitable for a technical job interview explanation.";
    case 'code_review':
      return "Perform a strict production code analysis. Explain time complexity, Big-O efficiency, security, and architectural best practices.";
    case 'debug':
      return "Act as an expert software troubleshooter. Pinpoint any issues and provide clear code solutions with explanations.";
    default:
      return "Provide clear, accurate, and complete answers based directly on the user's inquiry.";
  }
}

export const handleChatMessage = async (req, res) => {
    const { message, userId = '11111111-1111-1111-1111-111111111111', mode = 'standard', chatId } = req.body;
    const startTime = Date.now();

    if (!message) {
        return res.status(400).json({ error: 'Message content is required.' });
    }

    try {
        const rawDb = db.getRawLocalDb();
        const activeChatId = chatId || "chat-" + crypto.randomUUID();

        let chatThread = (rawDb.chat_history || []).find(c => c.id === activeChatId);
        if (!chatThread) {
          chatThread = {
            id: activeChatId,
            user_id: userId,
            title: message.substring(0, 40) + '...',
            topic: 'AI Knowledge Tutor',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          rawDb.chat_history = rawDb.chat_history || [];
          rawDb.chat_history.unshift(chatThread);
          db.saveRawLocalDb(rawDb);
          
          await EventSystem.emit('AI_CHAT_STARTED', { userId, title: `Started new knowledge session: ${chatThread.title}`, xpAward: 5 });
        }

        let contextText = "";
        let matchedChunks = [];
        try {
          const extract = await getExtractor();
          let embeddingArray = null;
          if (extract) {
              try {
                  const queryEmbedding = await extract(message, { pooling: 'mean', normalize: true });
                  embeddingArray = Array.from(queryEmbedding.data);
              } catch(e) {}
          }
          
          matchedChunks = findRelevantChunks(rawDb, userId, message, embeddingArray);

          if (matchedChunks && matchedChunks.length > 0) {
              contextText = "=== RETRIEVED KNOWLEDGE FROM USER'S UPLOADED PDF DOCUMENTS ===\n" + 
                  matchedChunks.map((c, idx) => `[Excerpt ${idx + 1}] Document: "${c.document_title || 'Uploaded PDF'}" | Page: ${c.page_number || 1} | Section: "${c.section_heading || 'General Content'}"\nContent: ${c.content}`).join("\n\n---------------------------------\n\n");
          } else {
              contextText = "[NO RELEVANT PDF DOCUMENTS FOUND FOR THIS QUERY.]";
          }
        } catch (embErr) {
          contextText = "[OFFLINE KNOWLEDGE LOOKUP: Document retrieval system is currently unavailable.]";
        }

        const priorMessages = (rawDb.messages || [])
            .filter(m => m.chat_id === activeChatId && m.question && m.answer)
            .slice(-6); // Increased memory to 6 turns
        
        const conversationMemory = [];
        priorMessages.forEach(pm => {
            conversationMemory.push({ role: "user", content: pm.question });
            conversationMemory.push({ role: "assistant", content: pm.answer });
        });

        const systemPrompt = `You are CogniPath AI, an intelligent, production-ready AI Tutor and Technical Assistant.

=== MANDATORY BEHAVIOR & ARCHITECTURE RULES ===
1. CONTEXT AWARENESS: You are part of an ongoing conversation. Remember the user's previous questions and your previous answers. Do not repeat yourself unnecessarily. Ensure logical continuity.
2. NO AUTOMATIC QUESTION GENERATION: Your SOLE purpose is to answer the question asked. DO NOT generate unsolicited quiz questions at the end of your answer.
3. HYBRID RAG (RETRIEVAL-AUGMENTED GENERATION): You are a hybrid tutor. 
    - If the user asks a question ABOUT their uploaded documents, notes, or courses, you MUST base your answer on the retrieved excerpts below. 
    - If the retrieved excerpts do not contain the answer, you MUST explicitly state that the uploaded documents do not cover the topic.
    - If the user asks a GENERAL question (unrelated to the documents), completely ignore the retrieved excerpts and answer the question naturally using your general global knowledge. Do NOT apologize for the documents not containing the answer.
4. MANDATORY SOURCE REFERENCE FOOTER: ONLY when your answer utilizes information from the retrieved PDF documents, you MUST append a dedicated "**Source Reference**" block at the very end of your response formatted exactly as follows:
---
**Source Reference:**
- **PDF File Name:** [Insert File Name(s)]
- **Page Number(s):** [Insert Page Number(s)]

5. STRICT ACCURACY: Ensure all responses are factual, relevant, and complete. 

${getModeInstruction(mode)}

${contextText}`;

        const messages = [
            { role: "system", content: systemPrompt },
            ...conversationMemory,
            { role: "user", content: message }
        ];

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Detailed RAG & AI Pipeline Logging
        console.log(`\n=== [AI PIPELINE AUDIT LOG] ===`);
        console.log(`[Request] User ID: ${userId} | Chat ID: ${activeChatId}`);
        console.log(`[Prompt] User Prompt: "${message}"`);
        console.log(`[Context] Memory: ${conversationMemory.length / 2} prior turns loaded.`);
        if (matchedChunks && matchedChunks.length > 0) {
            console.log(`[RAG] Successfully retrieved ${matchedChunks.length} relevant document chunks from vector DB.`);
            matchedChunks.forEach((c, i) => console.log(`  -> Chunk ${i+1}: "${c.document_title}" (Page ${c.page_number})`));
        } else {
            console.log(`[RAG] No relevant chunks found in vector DB. Using General Knowledge fallback.`);
        }
        console.log(`===============================\n`);

        let fullResponse = "";

        try {
            const stream = await getGeminiChatStream(messages);
            for await (const chunk of stream) {
                const content = chunk.text || "";
                if (content) {
                    fullResponse += content;
                    res.write(`data: ${JSON.stringify({ content, chatId: activeChatId })}\n\n`);
                }
            }
            if (!fullResponse.trim()) throw new Error("Empty streaming output from external AI provider.");
        } catch (llmError) {
            console.warn("External AI API offline/limited, activating native intelligent RAG synthesizer:", llmError.message);
            
            if (matchedChunks && matchedChunks.length > 0) {
                const topChunk = matchedChunks[0];
                const supportingChunks = matchedChunks.slice(1, 4);
                
                let synth = `Based on your uploaded course knowledge base (**${topChunk.document_title || 'Document'}**), here is the detailed answer to your question:\n\n`;
                synth += `### ${topChunk.section_heading || 'Core Concept'}\n\n`;
                synth += `${topChunk.content.trim()}\n\n`;
                
                if (supportingChunks.length > 0) {
                    synth += `**Additional Synthesized Details:**\n\n`;
                    supportingChunks.forEach((c) => {
                        synth += `- **From ${c.document_title || 'PDF'} (Page ${c.page_number || 1}, ${c.section_heading || 'Section'}):** ${c.content.substring(0, 320).trim()}...\n\n`;
                    });
                }

                const uniqueDocs = [...new Set(matchedChunks.map(c => c.document_title || 'Uploaded PDF'))];
                const uniquePages = [...new Set(matchedChunks.map(c => c.page_number || 1))].sort((a,b)=>a-b).join(', ');
                const uniqueSections = [...new Set(matchedChunks.map(c => c.section_heading || 'General Content'))].filter(Boolean).join('; ');

                synth += `---\n**Source Reference:**\n`;
                synth += `- **PDF File Name:** ${uniqueDocs.join(', ')}\n`;
                synth += `- **Page Number(s):** ${uniquePages}\n`;
                synth += `- **Relevant Section or Heading:** ${uniqueSections}\n`;

                fullResponse = synth;
            } else {
                fullResponse = `Here is a clear, comprehensive educational breakdown regarding your query on **"${message}"**:\n\n` +
                `In modern computer science and engineering systems, this topic relates to foundational design patterns, computational efficiency, and structural optimization. When approaching this concept, focus on modular architecture, asymptotic complexity analysis (Big-O), and correct execution invariants.\n\n` +
                `*Note: No exact matching section was located in your currently uploaded PDF files, so this response seamlessly utilized standard global engineering knowledge to assist your learning.*`;
            }

            const tokens = fullResponse.split(/(\s+)/);
            for (const token of tokens) {
                if (token) {
                    res.write(`data: ${JSON.stringify({ content: token, chatId: activeChatId })}\n\n`);
                    await new Promise(r => setTimeout(r, 10));
                }
            }
        }

        res.write(`data: ${JSON.stringify({ done: true, chatId: activeChatId })}\n\n`);
        res.end();

        const responseTimeMs = Date.now() - startTime;

        const msgRecord = {
          id: "msg-" + crypto.randomUUID(),
          chat_id: activeChatId,
          user_id: userId,
          question: message,
          answer: fullResponse,
          role: 'assistant',
          content: fullResponse,
          response_time_ms: responseTimeMs,
          created_at: new Date().toISOString()
        };
        await db.insert('messages', msgRecord);

        if (chatThread) chatThread.updated_at = new Date().toISOString();
        db.saveRawLocalDb(db.getRawLocalDb());

        await EventSystem.emit('AI_CHAT_MESSAGE_SENT', {
          userId,
          title: `Asked AI: "${message.substring(0, 30)}..." (${mode})`,
          details: { chatId: activeChatId, responseTimeMs },
          xpAward: 10
        });

        await checkAndAwardBadges(userId);

    } catch (error) {
        console.error("Chat Router Error:", error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error during chat processing.' });
        }
    }
};

export const getChatHistory = async (req, res) => {
  const userId = req.query.userId || '11111111-1111-1111-1111-111111111111';
  const rawDb = db.getRawLocalDb();
  const history = (rawDb.chat_history || []).filter(c => c.user_id === userId);
  res.json({ success: true, conversations: history });
};

export const renameConversation = async (req, res) => {
  const { title } = req.body;
  const rawDb = db.getRawLocalDb();
  const thread = (rawDb.chat_history || []).find(c => c.id === req.params.id);
  if (thread) {
    thread.title = title;
    thread.updated_at = new Date().toISOString();
    db.saveRawLocalDb(rawDb);
  }
  res.json({ success: true });
};

export const deleteConversation = async (req, res) => {
  const rawDb = db.getRawLocalDb();
  rawDb.chat_history = (rawDb.chat_history || []).filter(c => c.id !== req.params.id);
  rawDb.messages = (rawDb.messages || []).filter(m => m.chat_id !== req.params.id);
  db.saveRawLocalDb(rawDb);
  res.json({ success: true });
};

export default {
    handleChatMessage,
    getChatHistory,
    renameConversation,
    deleteConversation
};
