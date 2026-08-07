import crypto from 'crypto';
import { supabase } from '../config/supabase.js';
import { db } from '../services/db.js';
import { pipeline } from '@xenova/transformers';

let extractor;
const getExtractor = async () => {
    if (!extractor) {
        try {
            extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        } catch (e) {
            console.warn("Transformers offline/error, relying on native local semantic search:", e.message);
            return null;
        }
    }
    return extractor;
};

// Intelligent text chunking preserving headings, paragraphs, and formatting
const processPageChunks = (pages, documentId, userId, documentTitle) => {
    const chunks = [];
    let currentHeading = "General Content";
    
    pages.forEach((pageObj) => {
        const pageNum = pageObj.pageNumber || 1;
        const text = (pageObj.text || '').trim();
        if (!text) return;

        const lines = text.split(/\r?\n/);
        let currentParagraphs = [];
        let wordCount = 0;

        const saveChunk = () => {
            if (currentParagraphs.length === 0) return;
            const chunkText = currentParagraphs.join('\n\n').trim();
            if (chunkText.length >= 10) {
                chunks.push({
                    id: "chk-" + crypto.randomUUID(),
                    document_id: documentId,
                    user_id: userId,
                    document_title: documentTitle,
                    page_number: pageNum,
                    section_heading: currentHeading,
                    content: chunkText,
                    created_at: new Date().toISOString()
                });
            }
        };

        lines.forEach(line => {
            const cleaned = line.trim();
            if (!cleaned) return;

            const isHeading = (cleaned.length < 75 && (!cleaned.endsWith('.') && !cleaned.endsWith(',')) && (/^[0-9]+\.[0-9]*/.test(cleaned) || /^(CHAPTER|SECTION|UNIT|MODULE|TOPIC|PART)/i.test(cleaned) || /^[A-Z0-9\s-_:]{4,40}$/.test(cleaned) || cleaned.split(/\s+/).length <= 6));

            if (isHeading && cleaned.length > 3 && wordCount > 0) {
                saveChunk();
                currentHeading = cleaned;
                currentParagraphs = [cleaned];
                wordCount = cleaned.split(/\s+/).length;
            } else {
                currentParagraphs.push(cleaned);
                wordCount += cleaned.split(/\s+/).length;
                if (wordCount >= 300) {
                    saveChunk();
                    const lastPara = currentParagraphs[currentParagraphs.length - 1] || cleaned;
                    currentParagraphs = [lastPara];
                    wordCount = lastPara.split(/\s+/).length;
                }
            }
        });
        saveChunk();
    });

    return chunks;
};

export const processDocument = async (req, res) => {
    const { title, extractedText, userId = '11111111-1111-1111-1111-111111111111', pages } = req.body;

    if (!title || (!extractedText && (!pages || pages.length === 0))) {
        return res.status(400).json({ error: 'Missing required fields (title and text/pages)' });
    }

    try {
        const rawDb = db.getRawLocalDb();
        const documentId = "doc-" + crypto.randomUUID();

        const newDoc = {
            id: documentId,
            user_id: userId,
            title,
            status: 'processing',
            created_at: new Date().toISOString()
        };

        rawDb.documents = rawDb.documents || [];
        rawDb.documents.unshift(newDoc);
        rawDb.pdf_uploads = rawDb.pdf_uploads || [];
        rawDb.pdf_uploads.unshift(newDoc);
        db.saveRawLocalDb(rawDb);

        res.status(202).json({ message: 'Processing started', documentId });

        try {
            const extract = await getExtractor();
            const inputPages = (pages && Array.isArray(pages) && pages.length > 0) 
                ? pages 
                : [{ pageNumber: 1, text: extractedText || '' }];

            const generatedChunks = processPageChunks(inputPages, documentId, userId, title);

            for (const chunk of generatedChunks) {
                let embeddingArray = [];
                if (extract) {
                    try {
                        const chunkEmbedding = await extract(chunk.content, { pooling: 'mean', normalize: true });
                        embeddingArray = Array.from(chunkEmbedding.data);
                    } catch(e) {}
                }
                chunk.embedding = embeddingArray;
            }

            const latestDb = db.getRawLocalDb();
            latestDb.document_chunks = latestDb.document_chunks || [];
            latestDb.document_chunks.push(...generatedChunks);
            
            if (latestDb.documents) {
                const target = latestDb.documents.find(d => d.id === documentId);
                if (target) target.status = 'completed';
            }
            if (latestDb.pdf_uploads) {
                const targetPdf = latestDb.pdf_uploads.find(d => d.id === documentId);
                if (targetPdf) targetPdf.status = 'completed';
            }

            latestDb.notifications = latestDb.notifications || [];
            latestDb.notifications.unshift({
                id: "notif-" + crypto.randomUUID(),
                user_id: userId,
                title: 'PDF Processed & Embedded',
                message: `Your document "${title}" (${generatedChunks.length} chunks indexed) is ready in your AI knowledge base.`,
                read: false,
                created_at: new Date().toISOString()
            });

            db.saveRawLocalDb(latestDb);
            
            try {
                await supabase.from('documents').insert(newDoc);
                for (const chk of generatedChunks) {
                    await supabase.from('document_chunks').insert({
                        document_id: documentId,
                        content: chk.content,
                        embedding: chk.embedding
                    });
                }
            } catch(sErr) {}

        } catch (processError) {
            console.error("Chunking/Embedding Error:", processError);
            const errDb = db.getRawLocalDb();
            const d = (errDb.documents || []).find(x => x.id === documentId);
            if(d) d.status = 'failed';
            db.saveRawLocalDb(errDb);
        }
    } catch (error) {
        console.error("Document Process API Error:", error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};

export default {
    processDocument
};
