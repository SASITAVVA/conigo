import { db } from '../services/db.js';

export const getAllCourses = async (req, res) => {
  try {
    const rawDb = db.getRawLocalDb();
    const courses = (rawDb.courses || []).map(course => {
      const subjects = (rawDb.subjects || []).filter(sub => sub.course_id === course.id).map(sub => {
        const topics = (rawDb.topics || []).filter(t => t.subject_id === sub.id);
        return { ...sub, topics };
      });
      return { ...course, subjects };
    });

    res.json({ success: true, courses });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve courses roadmap.' });
  }
};

export default {
  getAllCourses
};
