import { db } from '../services/db.js';

export const getAllCourses = async (req, res) => {
  try {
    const rawDb = db.getRawLocalDb();
    let courses = (rawDb.courses || []).map(course => {
      const subjects = (rawDb.subjects || []).filter(sub => sub.course_id === course.id).map(sub => {
        const topics = (rawDb.topics || []).filter(t => t.subject_id === sub.id);
        return { ...sub, topics };
      });
      return { ...course, subjects };
    });

    // Auto-seed default catalog if empty (for new deployments)
    if (courses.length === 0) {
      const defaultCourses = [
        {
          id: 'course-cs101',
          title: 'Computer Science Foundation',
          description: 'Master the fundamentals of algorithms, data structures, and computational thinking required for top-tier software engineering.',
          difficulty: 'Intermediate',
          icon: '💻',
          subjects: [
            { id: 'sub-algo', title: 'Algorithms & Data Structures' },
            { id: 'sub-sys', title: 'System Design Basics' },
            { id: 'sub-net', title: 'Networking Fundamentals' }
          ]
        },
        {
          id: 'course-ai200',
          title: 'Artificial Intelligence & Machine Learning',
          description: 'Deep dive into neural networks, deep learning architectures, and modern LLM application development.',
          difficulty: 'Advanced',
          icon: '🤖',
          subjects: [
            { id: 'sub-nn', title: 'Neural Networks' },
            { id: 'sub-nlp', title: 'Natural Language Processing' },
            { id: 'sub-mlops', title: 'MLOps & Deployment' }
          ]
        },
        {
          id: 'course-med300',
          title: 'Pre-Med Biology & Anatomy',
          description: 'Comprehensive overview of human anatomy, cellular biology, and organic chemistry for medical students.',
          difficulty: 'Advanced',
          icon: '🧬',
          subjects: [
            { id: 'sub-cell', title: 'Cellular Biology' },
            { id: 'sub-anat', title: 'Human Anatomy' },
            { id: 'sub-chem', title: 'Organic Chemistry' }
          ]
        },
        {
          id: 'course-bus100',
          title: 'Business & Finance Analytics',
          description: 'Learn modern financial modeling, market analysis, and enterprise business strategies.',
          difficulty: 'Beginner',
          icon: '📈',
          subjects: [
            { id: 'sub-fin', title: 'Financial Accounting' },
            { id: 'sub-econ', title: 'Microeconomics' },
            { id: 'sub-stats', title: 'Business Statistics' }
          ]
        }
      ];
      courses = defaultCourses;
      
      // Save them back to rawDb so they persist locally
      rawDb.courses = defaultCourses.map(({ subjects, ...rest }) => rest);
      rawDb.subjects = defaultCourses.flatMap(c => c.subjects.map(s => ({ ...s, course_id: c.id })));
      db.saveRawLocalDb(rawDb);
    }

    res.json({ success: true, courses });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve courses roadmap.' });
  }
};

export default {
  getAllCourses
};
