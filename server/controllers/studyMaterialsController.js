import crypto from 'crypto';
import { db } from '../services/db.js';
import { EventSystem } from '../services/events.js';

export const getStudyMaterials = async (req, res) => {
  const userId = req.query.userId || '11111111-1111-1111-1111-111111111111';
  const rawDb = db.getRawLocalDb();

  const flashcards = (rawDb.flashcards || []).filter(f => f.user_id === userId || !f.user_id);
  const bookmarks = (rawDb.bookmarks || []).filter(b => b.user_id === userId || !b.user_id);
  const goals = (rawDb.goals || []).filter(g => g.user_id === userId || !g.user_id);

  res.json({ success: true, flashcards, bookmarks, goals });
};

export const reviewFlashcard = async (req, res) => {
  const { cardId, userId = '11111111-1111-1111-1111-111111111111', rating = 'easy' } = req.body;
  const rawDb = db.getRawLocalDb();
  const card = (rawDb.flashcards || []).find(f => f.id === cardId);
  
  let xpAward = 15;
  if (card) {
    card.difficulty_rating = rating;
    card.times_reviewed = (card.times_reviewed || 0) + 1;
    card.last_reviewed = 'Just now';

    const now = new Date();
    if (rating === 'easy') {
      now.setDate(now.getDate() + 7);
      xpAward = 20;
      card.success_rate = Math.min(100, (card.success_rate || 85) + 2);
    } else if (rating === 'good' || rating === 'normal') {
      now.setDate(now.getDate() + 3);
      xpAward = 15;
      card.success_rate = Math.min(100, (card.success_rate || 85) + 1);
    } else if (rating === 'hard') {
      now.setDate(now.getDate() + 1);
      xpAward = 10;
      card.success_rate = Math.max(20, (card.success_rate || 85) - 3);
    } else if (rating === 'forgot') {
      xpAward = 5;
      card.success_rate = Math.max(10, (card.success_rate || 85) - 8);
    }
    card.next_review_date = rating === 'forgot' ? 'Today (Revision)' : now.toISOString().split('T')[0];
    card.mastery_percentage = Math.min(100, Math.round(card.success_rate));
    
    db.saveRawLocalDb(rawDb);
  }

  await EventSystem.emit('FLASHCARD_REVIEWED', {
    userId,
    title: `Reviewed Card (${rating.toUpperCase()}): "${card ? card.question.slice(0, 32) : 'Concept'}..."`,
    xpAward
  });

  res.json({ success: true, card, xpAward });
};

export const bulkSaveFlashcards = async (req, res) => {
  try {
    const { flashcards, userId = '11111111-1111-1111-1111-111111111111' } = req.body;
    if (!flashcards || !Array.isArray(flashcards)) {
      return res.status(400).json({ success: false, error: 'Invalid flashcards data.' });
    }

    const rawDb = db.getRawLocalDb();
    rawDb.flashcards = rawDb.flashcards || [];

    const newCards = flashcards.map(card => ({
      id: "card-ai-" + crypto.randomUUID().slice(0, 8),
      user_id: userId,
      category: card.category || 'AI Generated',
      topic: card.topic || 'General',
      question: card.question,
      answer: card.answer,
      difficulty_rating: "normal",
      next_review_date: "Today",
      success_rate: 85,
      times_reviewed: 0,
      last_reviewed: "Never",
      from_notes: true,
      created_at: new Date().toISOString()
    }));

    rawDb.flashcards.unshift(...newCards);
    db.saveRawLocalDb(rawDb);

    await EventSystem.emit('FLASHCARD_REVIEWED', {
      userId,
      title: `Saved ${newCards.length} AI Generated Flashcards`,
      xpAward: 20
    });

    res.json({ success: true, savedCount: newCards.length });
  } catch (error) {
    console.error("bulkSaveFlashcards error:", error);
    res.status(500).json({ success: false, error: 'Failed to save flashcards.' });
  }
};

export const updateFlashcard = async (req, res) => {
  const { cardId, is_favorite, bookmarked } = req.body;
  const rawDb = db.getRawLocalDb();
  const card = (rawDb.flashcards || []).find(f => f.id === cardId);
  if (card) {
    if (typeof is_favorite !== 'undefined') card.is_favorite = is_favorite;
    if (typeof bookmarked !== 'undefined') card.bookmarked = bookmarked;
    db.saveRawLocalDb(rawDb);
  }
  res.json({ success: true, card });
};

export const generateAiAssistInsight = async (req, res) => {
  const { question = '', answer = '', category = 'General', action = 'explain_simply' } = req.body;
  let insight = '';

  if (action === 'explain_simply') {
    insight = `📌 **In Plain English:** Think of this concept in **${category}** without the dense engineering jargon. ${answer.split('.')[0]}. It essentially establishes a straightforward rule: by structuring data or logic predictably, system architecture becomes orders of magnitude faster and easier to reason about!`;
  } else if (action === 'step_by_step') {
    insight = `🔢 **Step-by-Step Breakdown:**\n1️⃣ **The Problem:** In unstructured scenarios within ${category}, naïve execution leads to memory bottlenecks and algorithmic latency.\n2️⃣ **The Mechanism:** ${answer}\n3️⃣ **Execution Phase:** When invoked, the runtime validates existing state invariants before executing atomic operations.\n4️⃣ **Result:** Guaranteed optimal complexity with minimal operational overhead.`;
  } else if (action === 'real_world') {
    insight = `🌍 **Real-World System Analogy:**\nIn enterprise environments (like Netflix video streaming, Google Search indexing, or AWS EC2 scheduling), this exact architectural paradigm in **${category}** prevents cascading system failures. For instance, when millions of concurrent requests arrive, leveraging this technique allows servers to process tasks cleanly without race conditions or memory thrashing!`;
  } else if (action === 'memory_tricks') {
    insight = `💡 **Mnemonic Memory Trick:**\nRemember the acronym **"${category.slice(0,3).toUpperCase()}-CORE"**: **C**onsistent, **O**ptimized, **R**eady, **E**fficiency! Whenever you see a question about *${question.slice(0,25)}...*, immediately link it to **${answer.split(' ')[0] || 'O(1)'}**!`;
  } else if (action === 'analogies') {
    insight = `🎭 **Intuitive Analogy:**\nImagine managing an ultra-busy airport terminal. If air traffic controllers attempted to locate every airplane by visually scanning runways one by one, gridlock would ensue immediately! Instead, using the methodology in **${category}** is like having a digital control radar that precisely computes coordinates in milliseconds.`;
  } else if (action === 'related_questions') {
    insight = `❓ **Next-Level Follow-Up Questions to Practice:**\n1. *How would this specific ${category} mechanism behave under multi-threaded concurrency?*\n2. *What are the primary tradeoffs if we prioritized memory conservation over execution speed here?*\n3. *How do compiler optimization engines handle this construct during runtime compilation?*`;
  }

  setTimeout(() => {
    res.json({ success: true, insight, action });
  }, 400);
};

export const addBookmark = async (req, res) => {
  const { userId = '11111111-1111-1111-1111-111111111111', itemType = 'Topic', referenceId, title, snippet } = req.body;
  const newBm = {
    id: "bm-" + crypto.randomUUID().slice(0, 8),
    user_id: userId,
    item_type: itemType,
    reference_id: referenceId || "ref-" + crypto.randomUUID().slice(0, 6),
    title: title || "Saved Learning Concept",
    snippet: snippet || "Important architectural definition.",
    created_at: new Date().toISOString()
  };
  await db.insert('bookmarks', newBm);

  await EventSystem.emit('BOOKMARK_ADDED', {
    userId,
    title: `Bookmarked ${itemType}: "${title}"`,
    xpAward: 5
  });

  res.json({ success: true, bookmark: newBm });
};

export const deleteBookmark = async (req, res) => {
  const rawDb = db.getRawLocalDb();
  rawDb.bookmarks = (rawDb.bookmarks || []).filter(b => b.id !== req.params.id);
  db.saveRawLocalDb(rawDb);
  res.json({ success: true });
};

export const setGoal = async (req, res) => {
  const { userId = '11111111-1111-1111-1111-111111111111', goalType = 'daily', targetMinutes = 60 } = req.body;
  const rawDb = db.getRawLocalDb();
  const newGoal = {
    id: "goal-" + crypto.randomUUID().slice(0, 8),
    user_id: userId,
    goal_type: goalType,
    target_minutes: Number(targetMinutes),
    achieved_minutes: 0,
    status: 'in_progress',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + (goalType === 'daily' ? 86400000 : 86400000 * 7)).toISOString().split('T')[0],
    created_at: new Date().toISOString()
  };
  rawDb.goals = rawDb.goals || [];
  rawDb.goals.push(newGoal);
  db.saveRawLocalDb(rawDb);

  await EventSystem.emit('GOAL_SET', { userId, title: `Set new ${goalType.toUpperCase()} goal: ${targetMinutes} mins`, xpAward: 10 });
  res.json({ success: true, goal: newGoal });
};

export default {
  getStudyMaterials,
  reviewFlashcard,
  updateFlashcard,
  generateAiAssistInsight,
  addBookmark,
  deleteBookmark,
  setGoal
};
