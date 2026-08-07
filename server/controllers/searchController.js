import { db } from '../services/db.js';

export const globalSearch = async (req, res) => {
  try {
    const query = (req.query.q || '').trim().toLowerCase();
    const userId = req.query.userId || '11111111-1111-1111-1111-111111111111';

    if (!query) {
      return res.json({ success: true, results: [], totalCount: 0 });
    }

    const rawDb = db.getRawLocalDb();
    const results = [];

    // 1. Search Courses
    (rawDb.courses || []).forEach(c => {
      if (c.title.toLowerCase().includes(query) || c.description.toLowerCase().includes(query)) {
        results.push({ type: 'Course', id: c.id, title: c.title, snippet: c.description, url: '#page-courses' });
      }
    });

    // 2. Search Subjects & Topics
    (rawDb.subjects || []).forEach(sub => {
      if (sub.title.toLowerCase().includes(query)) {
        results.push({ type: 'Subject', id: sub.id, title: sub.title, snippet: `Subject with ${sub.total_topics} interactive topics`, url: '#page-progress' });
      }
    });

    (rawDb.topics || []).forEach(t => {
      if (t.title.toLowerCase().includes(query)) {
        results.push({ type: 'Topic', id: t.id, title: t.title, snippet: `Difficulty: ${t.difficulty}`, url: '#page-progress' });
      }
    });

    // 3. Search Chat History & Messages
    (rawDb.messages || []).forEach(m => {
      if (m.content && m.content.toLowerCase().includes(query)) {
        results.push({ type: 'AI Chat', id: m.id, title: `Q: ${m.question || m.content.slice(0, 40)}`, snippet: m.answer ? m.answer.slice(0, 100) : m.content.slice(0, 100), url: '#page-tutor' });
      }
    });

    // 4. Search Flashcards & Bookmarks
    (rawDb.flashcards || []).forEach(f => {
      if (f.question.toLowerCase().includes(query) || f.answer.toLowerCase().includes(query)) {
        results.push({ type: 'Flashcard', id: f.id, title: f.question, snippet: f.answer, url: '#page-flashcards' });
      }
    });

    res.json({ success: true, results, totalCount: results.length });
  } catch (err) {
    console.error("Search API Error:", err);
    res.status(500).json({ error: 'Failed to complete global search.' });
  }
};

export default {
  globalSearch
};
