import { processNoteTask as geminiProcessNoteTask } from '../services/gemini.js';
import { supabaseAdmin, activityLogService } from '../services/supabase.js';

// Helper to get userId from Bearer token
const getUserId = async (req) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        if (user) return user.id;
    }
    return req.body.userId || null;
};

export const verifyAndSyncNote = async (req, res) => {
    try {
        const { noteTitle, noteContent } = req.body;
        const userId = await getUserId(req);

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const combinedText = ((noteTitle || '') + ' ' + (noteContent || '')).toLowerCase();

        // Detect subject from note content
        let verifiedTopicTitle = noteTitle && noteTitle !== 'New Note' && noteTitle.length > 2
            ? noteTitle : 'General Study Module';
        let verifiedSubjectTitle = 'Software Engineering';

        if (combinedText.includes('python') || combinedText.includes('def ') || combinedText.includes('print(')) {
            verifiedSubjectTitle = 'Python Programming';
            if (!verifiedTopicTitle || verifiedTopicTitle === 'General Study Module') verifiedTopicTitle = 'Python Basics & Syntax';
        } else if (combinedText.includes('react') || combinedText.includes('jsx') || combinedText.includes('component')) {
            verifiedSubjectTitle = 'Frontend Engineering';
        } else if (combinedText.includes('sql') || combinedText.includes('database') || combinedText.includes('select ')) {
            verifiedSubjectTitle = 'Database Systems';
        } else if (combinedText.includes('html') || combinedText.includes('css') || combinedText.includes('web')) {
            verifiedSubjectTitle = 'Web Development';
        } else if (combinedText.includes('ai') || combinedText.includes('neural') || combinedText.includes('machine learning')) {
            verifiedSubjectTitle = 'Artificial Intelligence';
        }

        // --- 1. Upsert Subject into Supabase ---
        let { data: existingSubject } = await supabaseAdmin
            .from('subjects')
            .select('id')
            .ilike('title', verifiedSubjectTitle)
            .maybeSingle();

        let subjectId;
        if (!existingSubject) {
            const { data: newSubject } = await supabaseAdmin
                .from('subjects')
                .insert([{ title: verifiedSubjectTitle, icon_color: '#6366f1', total_topics: 15 }])
                .select('id')
                .single();
            subjectId = newSubject?.id;
        } else {
            subjectId = existingSubject.id;
        }

        // --- 2. Upsert Topic into Supabase ---
        let { data: existingTopic } = await supabaseAdmin
            .from('topics')
            .select('id')
            .ilike('title', verifiedTopicTitle)
            .maybeSingle();

        let topicId;
        if (!existingTopic) {
            const { data: newTopic } = await supabaseAdmin
                .from('topics')
                .insert([{ title: verifiedTopicTitle, subject_id: subjectId, difficulty: 'Medium' }])
                .select('id')
                .single();
            topicId = newTopic?.id;
        } else {
            topicId = existingTopic.id;
        }

        // --- 3. Upsert Learning Progress ---
        const { data: existingProgress } = await supabaseAdmin
            .from('learning_progress')
            .select('id')
            .eq('user_id', userId)
            .eq('topic_id', topicId)
            .maybeSingle();

        if (!existingProgress) {
            await supabaseAdmin.from('learning_progress').insert([{
                user_id: userId,
                topic_id: topicId,
                subject_id: subjectId,
                status: 'completed',
                mastery_score: 95,
                progress_percentage: 100,
                completed_at: new Date().toISOString()
            }]);
        } else {
            await supabaseAdmin.from('learning_progress')
                .update({ status: 'completed', mastery_score: 95, progress_percentage: 100, completed_at: new Date().toISOString() })
                .eq('id', existingProgress.id);
        }

        // --- 4. Generate exactly 10 AI Flashcards ---
        let generatedCards = [];
        try {
            const aiResponseStr = await geminiProcessNoteTask(noteContent, 'flashcards');
            const aiResult = JSON.parse(aiResponseStr);
            if (aiResult && aiResult.flashcards && Array.isArray(aiResult.flashcards)) {
                generatedCards = aiResult.flashcards.slice(0, 10);
            }
        } catch (aiErr) {
            console.error('AI Flashcard Generation Failed:', aiErr);
        }

        // If AI returned fewer than 10, pad with fallback cards
        while (generatedCards.length < 10) {
            const idx = generatedCards.length + 1;
            generatedCards.push({
                question: `Key Concept #${idx} from "${verifiedTopicTitle}": What is the core principle?`,
                answer: `Refer to your saved notes on "${verifiedTopicTitle}" for the detailed answer.`
            });
        }

        // --- 5. Save exactly 10 flashcards to Supabase ---
        const flashcardRows = generatedCards.map(card => ({
            user_id: userId,
            topic: verifiedTopicTitle,
            question: card.question || `Key concept from "${verifiedTopicTitle}"`,
            answer: card.answer || 'Refer to your notes.',
            difficulty_rating: 'normal',
            times_reviewed: 0,
            success_rate: 85,
            next_review_date: new Date().toISOString().split('T')[0]
        }));

        await supabaseAdmin.from('flashcards').insert(flashcardRows);

        // --- 6. Log Activity ---
        await activityLogService({
            userId,
            actionType: 'FLASHCARD_SET_CREATED',
            entityType: 'flashcard_set',
            entityId: topicId,
            metadata: { topic: verifiedTopicTitle, count: 10 }
        });

        await activityLogService({
            userId,
            actionType: 'TOPIC_COMPLETED',
            entityType: 'topic',
            entityId: topicId,
            metadata: { topic: verifiedTopicTitle, subject: verifiedSubjectTitle }
        });

        res.json({
            success: true,
            verifiedTopic: { id: topicId, title: verifiedTopicTitle },
            subject: verifiedSubjectTitle,
            generatedCardsCount: 10
        });

    } catch (error) {
        console.error('Notes Verify & Sync Error:', error);
        res.status(500).json({ success: false, error: 'Failed to verify note and sync progress.' });
    }
};

export const processTask = async (req, res) => {
    try {
        const { noteContent, taskType, customPrompt } = req.body;

        if (!noteContent) return res.status(400).json({ success: false, error: 'Note content is required' });
        if (!taskType) return res.status(400).json({ success: false, error: 'Task type is required' });

        const resultText = await geminiProcessNoteTask(noteContent, taskType, customPrompt);
        res.json({ success: true, result: resultText });
    } catch (error) {
        console.error('Notes Task Route Error:', error);
        let errorMessage = 'Failed to process note task';
        if (error.status === 503 || (error.message && error.message.includes('503'))) {
            errorMessage = 'The AI model is currently experiencing high demand. Please try again.';
        } else if (error.message) {
            errorMessage = `AI Error: ${error.message}`;
        }
        res.status(500).json({ success: false, error: errorMessage });
    }
};

export default { verifyAndSyncNote, processTask };
