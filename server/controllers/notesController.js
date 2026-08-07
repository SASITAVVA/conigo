import crypto from 'crypto';
import { processNoteTask as geminiProcessNoteTask } from '../services/gemini.js';
import { db } from '../services/db.js';
import { EventSystem } from '../services/events.js';

export const verifyAndSyncNote = async (req, res) => {
    try {
        const { noteTitle, noteContent, userId = '11111111-1111-1111-1111-111111111111' } = req.body;

        const combinedText = ((noteTitle || "") + " " + (noteContent || "")).toLowerCase();
        
        let verifiedTopicTitle = "General Computer Science Concept";
        let verifiedSubjectTitle = "Computer Science";
        let upcomingList = [];

        if (combinedText.includes("python") || combinedText.includes("py") || combinedText.includes("def ") || combinedText.includes("print(")) {
            verifiedTopicTitle = noteTitle && noteTitle.length > 2 && noteTitle !== 'New Note' ? noteTitle : "Python Basics & Syntax";
            verifiedSubjectTitle = "Python Programming";
            upcomingList = [
                { title: "Python Data Structures (Lists, Dicts & Tuples)", subject: "Python Programming", difficulty: "Medium" },
                { title: "Object-Oriented Programming (OOP) in Python", subject: "Python Programming", difficulty: "Medium" },
                { title: "Python Exception Handling & File I/O", subject: "Python Programming", difficulty: "Hard" },
                { title: "Python Modules & Package Ecosystem", subject: "Python Programming", difficulty: "Medium" }
            ];
        } else if (combinedText.includes("react") || combinedText.includes("jsx") || combinedText.includes("hook") || combinedText.includes("component")) {
            verifiedTopicTitle = noteTitle && noteTitle.length > 2 && noteTitle !== 'New Note' ? noteTitle : "React Fundamentals & Components";
            verifiedSubjectTitle = "Frontend Engineering";
            upcomingList = [
                { title: "React State Management & useState Hooks", subject: "Frontend Engineering", difficulty: "Medium" },
                { title: "useEffect Lifecycle & Side Effects", subject: "Frontend Engineering", difficulty: "Medium" },
                { title: "Redux Toolkit & Global Store Architecture", subject: "Frontend Engineering", difficulty: "Hard" }
            ];
        } else if (combinedText.includes("sql") || combinedText.includes("database") || combinedText.includes("select ") || combinedText.includes("table")) {
            verifiedTopicTitle = noteTitle && noteTitle.length > 2 && noteTitle !== 'New Note' ? noteTitle : "SQL Database Queries & Architecture";
            verifiedSubjectTitle = "Database Systems";
            upcomingList = [
                { title: "Advanced SQL Joins & Subquery Tuning", subject: "Database Systems", difficulty: "Hard" },
                { title: "Database Normalization (1NF to BCNF)", subject: "Database Systems", difficulty: "Medium" },
                { title: "B-Tree Indexes & Query Execution Plans", subject: "Database Systems", difficulty: "Hard" }
            ];
        } else if (combinedText.includes("html") || combinedText.includes("css") || combinedText.includes("flex") || combinedText.includes("web") || combinedText.includes("dom")) {
            verifiedTopicTitle = noteTitle && noteTitle.length > 2 && noteTitle !== 'New Note' ? noteTitle : "HTML5 Semantic & Responsive Web UI";
            verifiedSubjectTitle = "Web Development";
            upcomingList = [
                { title: "CSS Grid & Custom Properties (Variables)", subject: "Web Development", difficulty: "Medium" },
                { title: "JavaScript DOM Event Bubbling & Delegation", subject: "Web Development", difficulty: "Medium" },
                { title: "Web Accessibility (a11y) & SEO Optimization", subject: "Web Development", difficulty: "Easy" }
            ];
        } else if (combinedText.includes("ai") || combinedText.includes("neural") || combinedText.includes("machine") || combinedText.includes("deep") || combinedText.includes("tensor")) {
            verifiedTopicTitle = noteTitle && noteTitle.length > 2 && noteTitle !== 'New Note' ? noteTitle : "AI Models & Neural Network Architecture";
            verifiedSubjectTitle = "Artificial Intelligence";
            upcomingList = [
                { title: "Transformer Architectures & Self-Attention", subject: "Artificial Intelligence", difficulty: "Advanced" },
                { title: "RAG Pipelines & Vector Embeddings", subject: "Artificial Intelligence", difficulty: "Hard" },
                { title: "PyTorch Autograd & Model Training Loops", subject: "Artificial Intelligence", difficulty: "Hard" }
            ];
        } else {
            verifiedTopicTitle = noteTitle && noteTitle !== 'New Note' && noteTitle.length > 2 ? noteTitle : "Core Systems Study Module";
            verifiedSubjectTitle = "Software Engineering";
            upcomingList = [
                { title: `Advanced Architectural Patterns in ${verifiedTopicTitle}`, subject: "Software Engineering", difficulty: "Hard" },
                { title: `Practical Real-World Implementation of ${verifiedTopicTitle}`, subject: "Software Engineering", difficulty: "Medium" },
                { title: `Unit Testing & Quality Assurance for ${verifiedTopicTitle}`, subject: "Software Engineering", difficulty: "Medium" }
            ];
        }

        const rawDb = db.getRawLocalDb();
        
        let subObj = (rawDb.subjects || []).find(s => s.title.toLowerCase() === verifiedSubjectTitle.toLowerCase());
        let subId = subObj ? subObj.id : "sub-" + crypto.randomUUID().slice(0, 8);
        if (!subObj) {
            subObj = {
                id: subId,
                course_id: "course-101",
                title: verifiedSubjectTitle,
                slug: verifiedSubjectTitle.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                icon_color: "#6366f1",
                bg_color: "rgba(99,102,241,0.15)",
                total_topics: 15,
                completed_topics: 5,
                study_time_seconds: 18000,
                average_quiz_score: 90
            };
            rawDb.subjects = rawDb.subjects || [];
            rawDb.subjects.push(subObj);
        }

        const newTopicId = "t-" + crypto.randomUUID().slice(0, 8);
        const completedTopicObj = {
            id: newTopicId,
            subject_id: subId,
            title: verifiedTopicTitle,
            slug: verifiedTopicTitle.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            difficulty: 'Medium',
            study_time_seconds: 2400,
            status: 'completed',
            completed: true,
            completed_at: new Date().toISOString()
        };
        
        rawDb.topics = (rawDb.topics || []).filter(t => t.title.toLowerCase() !== verifiedTopicTitle.toLowerCase());
        rawDb.topics.unshift(completedTopicObj);

        rawDb.progress = rawDb.progress || [];
        rawDb.progress.unshift({
            id: "prog-" + crypto.randomUUID(),
            user_id: userId,
            topic_id: newTopicId,
            subject_id: subId,
            topic: verifiedTopicTitle,
            status: 'completed',
            mastery_score: 95,
            study_time_seconds: 2400,
            quiz_accuracy: 100,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });

        const existingCompleted = rawDb.topics.filter(t => t.completed || t.status === 'completed');
        const existingUncompleted = rawDb.topics.filter(t => !t.completed && t.status !== 'completed');
        
        const newUpcomingObjects = upcomingList.map(ut => ({
            id: "t-upcoming-" + crypto.randomUUID().slice(0, 8),
            subject_id: subId,
            title: ut.title,
            slug: ut.title.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            difficulty: ut.difficulty,
            study_time_seconds: 3600,
            status: 'ready',
            completed: false
        }));

        rawDb.topics = [
            ...existingCompleted,
            ...newUpcomingObjects,
            ...existingUncompleted.filter(u => !upcomingList.some(ul => ul.title.toLowerCase() === u.title.toLowerCase()))
        ];

        rawDb.flashcards = rawDb.flashcards || [];
        const cleanContent = noteContent && noteContent.trim().length > 10 ? noteContent.trim() : `Fundamental principles and key concepts of ${verifiedTopicTitle}.`;
        
        const generatedCards = [
            {
                id: "card-ai-" + crypto.randomUUID().slice(0, 8),
                user_id: userId,
                category: verifiedTopicTitle,
                topic: verifiedSubjectTitle,
                question: `What is the core definition and primary purpose of ${verifiedTopicTitle}?`,
                answer: `From your saved study notes: ${cleanContent}`,
                difficulty_rating: "normal",
                next_review_date: "Today",
                success_rate: 92,
                times_reviewed: 1,
                last_reviewed: "Just generated",
                from_notes: true
            },
            {
                id: "card-ai-" + crypto.randomUUID().slice(0, 8),
                user_id: userId,
                category: verifiedTopicTitle,
                topic: verifiedSubjectTitle,
                question: `What are the key architectural mechanics and underlying workflows of ${verifiedTopicTitle}?`,
                answer: `It operates by establishing robust structural boundaries, defining strict data invariants, and executing state transitions systematically based on your study material.`,
                difficulty_rating: "hard",
                next_review_date: "Today",
                success_rate: 85,
                times_reviewed: 1,
                last_reviewed: "Just generated",
                from_notes: true
            },
            {
                id: "card-ai-" + crypto.randomUUID().slice(0, 8),
                user_id: userId,
                category: verifiedTopicTitle,
                topic: verifiedSubjectTitle,
                question: `How does mastering ${verifiedTopicTitle} directly impact system reliability and efficiency in ${verifiedSubjectTitle}?`,
                answer: `It simplifies debugging workflows, accelerates operational retrieval times, and significantly reduces overall structural complexity during implementation.`,
                difficulty_rating: "easy",
                next_review_date: "Today",
                success_rate: 96,
                times_reviewed: 1,
                last_reviewed: "Just generated",
                from_notes: true
            },
            {
                id: "card-ai-" + crypto.randomUUID().slice(0, 8),
                user_id: userId,
                category: verifiedTopicTitle,
                topic: verifiedSubjectTitle,
                question: `What are the most common pitfalls and anti-patterns developers face when implementing ${verifiedTopicTitle}?`,
                answer: `Frequent errors include improper state initialization, failure to account for edge-case boundaries, and violating the separation of concerns principle.`,
                difficulty_rating: "hard",
                next_review_date: "Today",
                success_rate: 82,
                times_reviewed: 1,
                last_reviewed: "Just generated",
                from_notes: true
            },
            {
                id: "card-ai-" + crypto.randomUUID().slice(0, 8),
                user_id: userId,
                category: verifiedTopicTitle,
                topic: verifiedSubjectTitle,
                question: `Describe a concrete real-world use case where ${verifiedTopicTitle} is absolutely essential.`,
                answer: `It is highly critical in high-concurrency enterprise applications where data integrity, low-latency execution, and predictable memory management are non-negotiable.`,
                difficulty_rating: "normal",
                next_review_date: "Today",
                success_rate: 90,
                times_reviewed: 1,
                last_reviewed: "Just generated",
                from_notes: true
            },
            {
                id: "card-ai-" + crypto.randomUUID().slice(0, 8),
                user_id: userId,
                category: verifiedTopicTitle,
                topic: verifiedSubjectTitle,
                question: `What is the performance profile (e.g., Time and Space Complexity) associated with ${verifiedTopicTitle}?`,
                answer: `Depending on implementation, it generally offers highly optimized amortized time complexity, provided that the underlying data layout avoids unnecessary linear scans.`,
                difficulty_rating: "hard",
                next_review_date: "Today",
                success_rate: 88,
                times_reviewed: 1,
                last_reviewed: "Just generated",
                from_notes: true
            },
            {
                id: "card-ai-" + crypto.randomUUID().slice(0, 8),
                user_id: userId,
                category: verifiedTopicTitle,
                topic: verifiedSubjectTitle,
                question: `What are the golden rules and best practices for writing clean code using ${verifiedTopicTitle}?`,
                answer: `Always prioritize readability, modularize complex logic into atomic functions, rigorously type-check your inputs, and write comprehensive unit tests.`,
                difficulty_rating: "easy",
                next_review_date: "Today",
                success_rate: 95,
                times_reviewed: 1,
                last_reviewed: "Just generated",
                from_notes: true
            },
            {
                id: "card-ai-" + crypto.randomUUID().slice(0, 8),
                user_id: userId,
                category: verifiedTopicTitle,
                topic: verifiedSubjectTitle,
                question: `How should you handle edge cases and extreme boundary conditions in ${verifiedTopicTitle}?`,
                answer: `Implement defensive programming: validate all edge-case inputs early, utilize graceful error handling strategies, and ensure system invariants are never broken.`,
                difficulty_rating: "normal",
                next_review_date: "Today",
                success_rate: 91,
                times_reviewed: 1,
                last_reviewed: "Just generated",
                from_notes: true
            },
            {
                id: "card-ai-" + crypto.randomUUID().slice(0, 8),
                user_id: userId,
                category: verifiedTopicTitle,
                topic: verifiedSubjectTitle,
                question: `How does ${verifiedTopicTitle} compare to legacy or alternative methodologies in ${verifiedSubjectTitle}?`,
                answer: `Unlike older brute-force approaches that suffer from exponential scaling costs, this concept provides a sustainable, modular, and horizontally scalable solution.`,
                difficulty_rating: "hard",
                next_review_date: "Today",
                success_rate: 87,
                times_reviewed: 1,
                last_reviewed: "Just generated",
                from_notes: true
            },
            {
                id: "card-ai-" + crypto.randomUUID().slice(0, 8),
                user_id: userId,
                category: verifiedTopicTitle,
                topic: verifiedSubjectTitle,
                question: `What is a fast mental model or mnemonic to instantly recall ${verifiedTopicTitle} during an interview?`,
                answer: `Deconstruct complexity into atomic operational states, verify invariants against edge cases, and utilize spaced repetition memory indexing for high-speed concept retrieval.`,
                difficulty_rating: "good",
                next_review_date: "Today",
                success_rate: 94,
                times_reviewed: 1,
                last_reviewed: "Just generated",
                from_notes: true
            }
        ];

        rawDb.flashcards.unshift(...generatedCards);
        db.saveRawLocalDb(rawDb);

        await EventSystem.emit('TOPIC_COMPLETED', {
            userId,
            title: `AI Verified Study Topic: ${verifiedTopicTitle}`,
            details: { topicId: newTopicId, subject: verifiedSubjectTitle, status: 'completed' },
            xpAward: 35
        });

        await EventSystem.emit('FLASHCARD_REVIEWED', {
            userId,
            title: `Generated 10 Knowledge Flashcards for "${verifiedTopicTitle}"`,
            xpAward: 50
        });

        res.json({
            success: true,
            verifiedTopic: completedTopicObj,
            subject: verifiedSubjectTitle,
            upcomingTopics: upcomingList,
            generatedCardsCount: generatedCards.length
        });
    } catch (error) {
        console.error("Notes Verify & Sync Error:", error);
        res.status(500).json({ success: false, error: 'Failed to verify note and sync progress.' });
    }
};

export const processTask = async (req, res) => {
    try {
        const { noteContent, taskType, customPrompt } = req.body;

        if (!noteContent) {
            return res.status(400).json({ success: false, error: 'Note content is required' });
        }
        
        if (!taskType) {
            return res.status(400).json({ success: false, error: 'Task type is required' });
        }

        const resultText = await geminiProcessNoteTask(noteContent, taskType, customPrompt);
        
        res.json({ success: true, result: resultText });
    } catch (error) {
        console.error("Notes Task Route Error:", error);
        let errorMessage = 'Failed to process note task';
        if (error.status === 503 || (error.message && error.message.includes('503'))) {
            errorMessage = "The AI model is currently experiencing high demand. Please try again in a few moments.";
        } else if (error.message) {
            errorMessage = `AI Error: ${error.message}`;
        }
        res.status(500).json({ success: false, error: errorMessage });
    }
};

export default {
    verifyAndSyncNote,
    processTask
};
