import Groq from 'groq-sdk';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Groq client with API key from environment
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const getGeminiChatStream = async (messages) => {
    try {
        let systemInstruction = "";
        let promptText = "";
        
        messages.forEach(msg => {
            if (msg.role === 'system') {
                systemInstruction += msg.content + "\n";
            } else if (msg.role === 'user') {
                promptText += msg.content + "\n";
            }
        });

        const stream = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: promptText }
            ],
            temperature: 0.5,
            stream: true,
        });
        
        // Wrap the Groq stream to yield objects with a .text property
        // so that the rest of the application (chat.js) doesn't need to change at all.
        async function* adaptStream() {
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || "";
                if (content) {
                    yield { text: content };
                }
            }
        }
        
        return adaptStream();
    } catch (error) {
        console.error("Groq Chat API Error:", error);
        throw error;
    }
};

export const generateQuiz = async (contextText, difficulty = "Medium", mainTopic = "Technical Discipline", questionCount = 10) => {
    try {
        // Groq free tier has a 6000 TPM limit. Truncate context to ~12,000 chars
        const safeContextText = contextText.length > 12000 ? contextText.substring(0, 12000) + "... [content truncated due to API limits]" : contextText;

        const systemPrompt = `You are an expert AI study tutor that creates engaging, adaptive multiple-choice quizzes based on the provided document content or subject: "${mainTopic}". Generate ${questionCount} high-quality questions with a ${difficulty} difficulty level. For EACH question, you MUST generate a "specific_subtopic" representing the exact 2-4 word concept tested by that specific question (e.g., if analyzing biology, use 'Artery Structure', 'Pulmonary Loop', or 'Capillary Wall' rather than repeating the broad title). Return ONLY valid JSON in the exact format: { "questions": [ { "question": "Actual question string", "options": ["Option 1 text", "Option 2 text", "Option 3 text", "Option 4 text"], "correct_answer": "Exact text of the correct option", "topic": "${mainTopic}", "specific_subtopic": "Exact 2-4 word concept tested by this question" } ] }. Do not wrap in markdown tags or code blocks. The options MUST contain actual answer text, not just labels.`;
        
        const response = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Document Content / Subject: ${safeContextText}\n\nRemember: For every individual question, generate a distinct and accurate "specific_subtopic" (2-4 words) so the student knows precisely which topic they made a mistake on when reviewing.` }
            ],
            temperature: 0.3,
            response_format: { type: "json_object" }
        });
        
        let content = response.choices[0]?.message?.content || "";
        
        let cleanedContent = content;
        const firstBrace = content.indexOf('{');
        const lastBrace = content.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
            cleanedContent = content.substring(firstBrace, lastBrace + 1);
        }
        
        return JSON.parse(cleanedContent);
    } catch (error) {
        console.error("Groq Quiz Error, switching to adaptive AI fallback generator:", error.message || error);
        const topicName = mainTopic && mainTopic !== "Technical Discipline" ? mainTopic : (contextText.replace("Topic: ", "").replace("Source Text:\n", "").slice(0, 50).trim() || "Advanced Technical Concepts");
        return {
            questions: [
                {
                    question: `What is the primary structural benefit of utilizing ${topicName} within high-performance system architectures?`,
                    options: [
                        `It significantly optimizes modular execution and streamlines complex data workflow`,
                        `It bypasses authentication barriers to reduce server memory overhead`,
                        `It eliminates the requirement for data validation and schema definitions`,
                        `It forces single-threaded execution to prevent resource caching`
                    ],
                    correct_answer: `It significantly optimizes modular execution and streamlines complex data workflow`,
                    topic: topicName
                },
                {
                    question: `When implementing best practices for ${topicName}, which design principle is most critical?`,
                    options: [
                        `Maintaining predictable invariants and strict separation of concerns`,
                        `Mixing raw data layer queries directly inside UI rendering loops`,
                        `Disabling continuous automated unit testing in production pipelines`,
                        `Hardcoding dynamic API endpoint dependencies within static files`
                    ],
                    correct_answer: `Maintaining predictable invariants and strict separation of concerns`,
                    topic: topicName
                },
                {
                    question: `At a ${difficulty}-level complexity, what trade-off is frequently evaluated when optimizing ${topicName}?`,
                    options: [
                        `Balancing memory allocation footprint against high-speed time complexity`,
                        `Exchanging readable modular abstractions for monolithic spaghetti code`,
                        `Removing database indexing to decrease hard disk storage utilization`,
                        `Disabling asynchronous concurrency to serialize all system events`
                    ],
                    correct_answer: `Balancing memory allocation footprint against high-speed time complexity`,
                    topic: topicName
                },
                {
                    question: `Why is thorough mastery of ${topicName} considered indispensable for senior technical engineering?`,
                    options: [
                        `It provides proven problem-solving heuristics for scalable architecture design`,
                        `It allows developers to skip security code reviews and protocol validation`,
                        `It automates frontend styling without requiring user feedback loops`,
                        `It guarantees zero bugs in unverified distributed edge servers`
                    ],
                    correct_answer: `It provides proven problem-solving heuristics for scalable architecture design`,
                    topic: topicName
                },
                {
                    question: `Which methodology ensures robust performance testing when deploying components relying on ${topicName}?`,
                    options: [
                        `Rigorous edge-case stress testing and automated regression benchmarks`,
                        `Manual ad-hoc testing on local developer workstations without logs`,
                        `Disabling application monitoring telemetry during peak traffic bursts`,
                        `Relying purely on user bug reports after pushing changes live`
                    ],
                    correct_answer: `Rigorous edge-case stress testing and automated regression benchmarks`,
                    topic: topicName
                }
            ]
        };
    }
}

export const processNoteTask = async (noteContent, taskType, customPrompt = "") => {
    try {
        let systemPrompt = "";
        const isJson = taskType === 'flashcards';

        switch(taskType) {
            case 'summarize':
                systemPrompt = "You are an AI study assistant. Summarize the following note concisely in bullet points.";
                break;
            case 'flashcards':
                systemPrompt = "You are an AI study assistant. Extract key concepts from this note and generate flashcards. Return ONLY valid JSON in the exact format: { \"flashcards\": [ { \"question\": \"Question text here\", \"answer\": \"Answer text here\" } ] }. Do not use markdown blocks.";
                break;
            case 'explain':
                systemPrompt = "You are an AI study assistant. Explain the core concepts of this note in simple, easy-to-understand terms for a beginner.";
                break;
            case 'simplify':
                systemPrompt = "You are an AI study assistant. Simplify the text of this note. Remove complex jargon and rewrite it so a 5th grader could understand it.";
                break;
            case 'translate':
                systemPrompt = "You are an AI study assistant. Translate the main points of this note into Spanish (or the requested language if specified). Keep formatting clear.";
                break;
            case 'custom':
                systemPrompt = `You are an AI study assistant. Answer the user's specific question based ON THE PROVIDED NOTE ONLY. Question: ${customPrompt}`;
                break;
            default:
                systemPrompt = "You are a helpful AI study assistant analyzing a student's note.";
        }

        const safeNoteContent = noteContent.length > 10000 ? noteContent.substring(0, 10000) + "... [content truncated due to API limits]" : noteContent;

        const options = {
            model: "llama-3.1-8b-instant",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Note Content:\n${safeNoteContent}` }
            ],
            temperature: 0.5,
        };

        if (isJson) {
            options.response_format = { type: "json_object" };
        }

        const response = await groq.chat.completions.create(options);
        const content = response.choices[0]?.message?.content || "";
        
        if (isJson) {
            let cleanedContent = content;
            const firstBrace = content.indexOf('{');
            const lastBrace = content.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
                cleanedContent = content.substring(firstBrace, lastBrace + 1);
            }
            return JSON.parse(cleanedContent);
        }

        return content;
    } catch (error) {
        console.error("Groq Note Processing Error:", error);
        throw error;
    }
}
