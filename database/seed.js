import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, 'local_db.json');

// Initial seed dataset covering all requested Subjects, Courses, Achievements, Admin Profile, and dynamic initial stats
const defaultSeedData = {
  profiles: [
    {
      id: "11111111-1111-1111-1111-111111111111",
      user_id: "11111111-1111-1111-1111-111111111111",
      email: "alex.student@cognipath.ai",
      name: "Alex Rivera",
      profile_photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      bio: "Software Engineering enthusiast aiming for Full-Stack mastery.",
      learning_goal: "Master Artificial Intelligence and Distributed Systems.",
      current_level: "Intermediate",
      daily_goal: 60,
      weekly_goal: 420,
      preferred_language: "English",
      timezone: "America/New_York",
      role: "student",
      xp: 1450,
      level: 5,
      coins: 320,
      joined_date: "2026-06-01T10:00:00.000Z",
      updated_at: new Date().toISOString()
    },
    {
      id: "99999999-9999-9999-9999-999999999999",
      user_id: "99999999-9999-9999-9999-999999999999",
      email: "admin@cognipath.ai",
      name: "Platform Administrator",
      profile_photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
      bio: "Senior Architect & Curriculum Director.",
      learning_goal: "Platform Management & System Integrity.",
      current_level: "Expert",
      role: "admin",
      xp: 9999,
      level: 50,
      coins: 5000,
      joined_date: "2026-01-01T00:00:00.000Z",
      updated_at: new Date().toISOString()
    }
  ],
  courses: [
    {
      id: "course-101",
      title: "Full Stack Web Engineering",
      description: "Comprehensive deep dive into HTML, CSS, JavaScript, and Backend architecture.",
      icon: "🌐",
      difficulty: "Intermediate",
      estimated_hours: 45,
      category: "Web Development"
    },
    {
      id: "course-102",
      title: "Core Computer Science & Algorithms",
      description: "Master Data Structures, Algorithms, Operating Systems, DBMS, and Networks.",
      icon: "⚡",
      difficulty: "Advanced",
      estimated_hours: 80,
      category: "Computer Science"
    }
  ],
  subjects: [
    { id: "sub-html", course_id: "course-101", title: "HTML", slug: "html", icon_color: "#e11d48", bg_color: "#ffe4e6", total_topics: 12, completed_topics: 12, study_time_seconds: 14400, average_quiz_score: 95 },
    { id: "sub-css", course_id: "course-101", title: "CSS", slug: "css", icon_color: "#2563eb", bg_color: "#dbeafe", total_topics: 15, completed_topics: 13, study_time_seconds: 18000, average_quiz_score: 88 },
    { id: "sub-js", course_id: "course-101", title: "JavaScript", slug: "javascript", icon_color: "#d97706", bg_color: "#fef3c7", total_topics: 25, completed_topics: 18, study_time_seconds: 36000, average_quiz_score: 91 },
    { id: "sub-python", course_id: "course-102", title: "Python", slug: "python", icon_color: "#059669", bg_color: "#d1fae5", total_topics: 20, completed_topics: 16, study_time_seconds: 28800, average_quiz_score: 92 },
    { id: "sub-dsa", course_id: "course-102", title: "Data Structures", slug: "data-structures", icon_color: "#4f46e5", bg_color: "#e0e7ff", total_topics: 22, completed_topics: 15, study_time_seconds: 43200, average_quiz_score: 84 },
    { id: "sub-algo", course_id: "course-102", title: "Algorithms", slug: "algorithms", icon_color: "#7c3aed", bg_color: "#ede9fe", total_topics: 18, completed_topics: 10, study_time_seconds: 32400, average_quiz_score: 79 },
    { id: "sub-dbms", course_id: "course-102", title: "DBMS", slug: "dbms", icon_color: "#ea580c", bg_color: "#ffedd5", total_topics: 20, completed_topics: 16, study_time_seconds: 25200, average_quiz_score: 89 },
    { id: "sub-os", course_id: "course-102", title: "Operating Systems", slug: "operating-systems", icon_color: "#0284c7", bg_color: "#e0f2fe", total_topics: 20, completed_topics: 11, study_time_seconds: 21600, average_quiz_score: 82 },
    { id: "sub-cn", course_id: "course-102", title: "Computer Networks", slug: "computer-networks", icon_color: "#db2777", bg_color: "#fce7f3", total_topics: 20, completed_topics: 9, study_time_seconds: 18000, average_quiz_score: 85 }
  ],
  topics: [
    { id: "top-1", subject_id: "sub-dsa", title: "Arrays and Memory Allocation", difficulty: "Beginner", order_index: 1, completed: true },
    { id: "top-2", subject_id: "sub-dsa", title: "Linked Lists & Doubly Pointers", difficulty: "Intermediate", order_index: 2, completed: true },
    { id: "top-3", subject_id: "sub-dsa", title: "Binary Search Trees & Traversal", difficulty: "Advanced", order_index: 3, completed: false },
    { id: "top-4", subject_id: "sub-python", title: "AsyncIO & Event Loops", difficulty: "Advanced", order_index: 1, completed: true },
    { id: "top-5", subject_id: "sub-dbms", title: "B-Tree Indexes & Query Optimization", difficulty: "Advanced", order_index: 1, completed: true },
    { id: "top-6", subject_id: "sub-js", title: "Closures & Prototypes in Depth", difficulty: "Intermediate", order_index: 1, completed: true },
    { id: "top-7", subject_id: "sub-os", title: "Virtual Memory & Page Replacement", difficulty: "Advanced", order_index: 1, completed: false },
    { id: "top-8", subject_id: "sub-cn", title: "TCP/IP Handshake & Congestion Control", difficulty: "Intermediate", order_index: 1, completed: true }
  ],
  progress: [
    { id: "prog-1", user_id: "11111111-1111-1111-1111-111111111111", topic_id: "top-1", subject_id: "sub-dsa", status: "completed", mastery_score: 95.0, study_time_seconds: 3600, quiz_accuracy: 100.0 },
    { id: "prog-2", user_id: "11111111-1111-1111-1111-111111111111", topic_id: "top-2", subject_id: "sub-dsa", status: "completed", mastery_score: 88.0, study_time_seconds: 4200, quiz_accuracy: 90.0 },
    { id: "prog-3", user_id: "11111111-1111-1111-1111-111111111111", topic_id: "top-4", subject_id: "sub-python", status: "completed", mastery_score: 92.0, study_time_seconds: 5400, quiz_accuracy: 95.0 }
  ],
  study_sessions: [
    { id: "sess-1", user_id: "11111111-1111-1111-1111-111111111111", subject_id: "sub-dsa", session_date: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0], duration_seconds: 5400 },
    { id: "sess-2", user_id: "11111111-1111-1111-1111-111111111111", subject_id: "sub-python", session_date: new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0], duration_seconds: 7200 },
    { id: "sess-3", user_id: "11111111-1111-1111-1111-111111111111", subject_id: "sub-js", session_date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0], duration_seconds: 6300 },
    { id: "sess-4", user_id: "11111111-1111-1111-1111-111111111111", subject_id: "sub-dbms", session_date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0], duration_seconds: 8100 },
    { id: "sess-5", user_id: "11111111-1111-1111-1111-111111111111", subject_id: "sub-os", session_date: new Date(Date.now() - 86400000 * 1).toISOString().split('T')[0], duration_seconds: 4500 },
    { id: "sess-6", user_id: "11111111-1111-1111-1111-111111111111", subject_id: "sub-cn", session_date: new Date().toISOString().split('T')[0], duration_seconds: 3600 }
  ],
  achievements: [
    { id: "ach-1", title: "First Step", description: "Complete your very first topic study session.", icon: "🔥", xp_reward: 50, requirement_type: "topics_completed", requirement_value: 1 },
    { id: "ach-2", title: "Knowledge Seeker", description: "Ask 10 questions to the AI Learning Assistant.", icon: "💡", xp_reward: 100, requirement_type: "questions_asked", requirement_value: 10 },
    { id: "ach-3", title: "Night Owl", description: "Accumulate over 10 hours of focused study time.", icon: "🦉", xp_reward: 250, requirement_type: "study_time_seconds", requirement_value: 36000 },
    { id: "ach-4", title: "Streak Master", description: "Maintain a 7-day consecutive learning streak.", icon: "🏆", xp_reward: 500, requirement_type: "streak_days", requirement_value: 7 },
    { id: "ach-5", title: "Quiz Champion", description: "Score over 90% accuracy on 5 interactive quizzes.", icon: "🌟", xp_reward: 350, requirement_type: "quiz_high_scores", requirement_value: 5 },
    { id: "ach-6", title: "Document Scholar", description: "Upload and process 3 course textbooks or PDFs.", icon: "📚", xp_reward: 200, requirement_type: "pdfs_uploaded", requirement_value: 3 }
  ],
  user_achievements: [
    { id: "uach-1", user_id: "11111111-1111-1111-1111-111111111111", achievement_id: "ach-1", unlocked_at: new Date(Date.now() - 86400000 * 10).toISOString() },
    { id: "uach-2", user_id: "11111111-1111-1111-1111-111111111111", achievement_id: "ach-2", unlocked_at: new Date(Date.now() - 86400000 * 6).toISOString() },
    { id: "uach-3", user_id: "11111111-1111-1111-1111-111111111111", achievement_id: "ach-3", unlocked_at: new Date(Date.now() - 86400000 * 2).toISOString() }
  ],
  flashcards: [
    { id: "fc-1", user_id: "11111111-1111-1111-1111-111111111111", topic_id: "top-1", question: "What is the time complexity of indexing an element in a contiguous Array?", answer: "O(1) - Because elements are stored in sequential memory addresses, allowing direct offset address computation.", difficulty_rating: "easy", is_favorite: true },
    { id: "fc-2", user_id: "11111111-1111-1111-1111-111111111111", topic_id: "top-2", question: "Why is insertion into a Doubly Linked List faster than an Array at an arbitrary known pointer?", answer: "O(1) vs O(n) - No shifting of existing subsequent elements is required; only pointer reassignments are needed.", difficulty_rating: "normal", is_favorite: false },
    { id: "fc-3", user_id: "11111111-1111-1111-1111-111111111111", topic_id: "top-5", question: "What is the primary advantage of a B+ Tree over a standard Binary Search Tree for database indexing?", answer: "High branching factor reduces disk IO depth, and linked leaf nodes allow ultra-fast sequential range scan queries.", difficulty_rating: "hard", is_favorite: true },
    { id: "fc-4", user_id: "11111111-1111-1111-1111-111111111111", topic_id: "top-6", question: "Explain Lexical Scoping and Closures in JavaScript.", answer: "A closure gives a function access to its outer enclosing lexical scope even after the outer function has finished executing.", difficulty_rating: "normal", is_favorite: false }
  ],
  bookmarks: [
    { id: "bm-1", user_id: "11111111-1111-1111-1111-111111111111", item_type: "Topic", reference_id: "top-3", title: "Binary Search Trees & Traversal", snippet: "Key recursive algorithms for pre-order, in-order, and post-order node traversals." },
    { id: "bm-2", user_id: "11111111-1111-1111-1111-111111111111", item_type: "Note", reference_id: "note-101", title: "Asynchronous JavaScript Engine Notes", snippet: "Deep dive into Microtask queues vs Macrotask Event Loops in V8 engine." }
  ],
  goals: [
    { id: "goal-1", user_id: "11111111-1111-1111-1111-111111111111", goal_type: "daily", target_minutes: 60, achieved_minutes: 60, status: "completed", start_date: new Date().toISOString().split('T')[0], end_date: new Date().toISOString().split('T')[0] },
    { id: "goal-2", user_id: "11111111-1111-1111-1111-111111111111", goal_type: "weekly", target_minutes: 420, achieved_minutes: 360, status: "in_progress", start_date: new Date(Date.now() - 86400000*3).toISOString().split('T')[0], end_date: new Date(Date.now() + 86400000*3).toISOString().split('T')[0] }
  ],
  notifications: [
    { id: "notif-1", user_id: "11111111-1111-1111-1111-111111111111", title: "Daily Goal Achieved! 🚀", message: "Congratulations! You completed your 60 minutes of study time today and earned +50 XP.", type: "Daily Goal", read: false, created_at: new Date().toISOString() },
    { id: "notif-2", user_id: "11111111-1111-1111-1111-111111111111", title: "New AI Quiz Available 🧠", message: "We generated a personalized review test for Operating Systems based on your recent activity.", type: "Quiz Available", read: true, created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: "notif-3", user_id: "11111111-1111-1111-1111-111111111111", title: "Streak Master Badge Unlocked! 🏆", message: "Amazing consistency! You've unlocked the 7-Day Streak Master badge.", type: "Achievement", read: false, created_at: new Date().toISOString() }
  ],
  recent_activity: [
    { id: "act-1", user_id: "11111111-1111-1111-1111-111111111111", type: "topic", title: "Completed Topic: Arrays and Memory Allocation", xp_earned: 50, created_at: new Date(Date.now() - 1200000).toISOString() },
    { id: "act-2", user_id: "11111111-1111-1111-1111-111111111111", type: "quiz", title: "Completed Quiz on Python Basics (Score: 100%)", xp_earned: 100, created_at: new Date(Date.now() - 7200000).toISOString() },
    { id: "act-3", user_id: "11111111-1111-1111-1111-111111111111", type: "chat", title: "Asked AI: Explain B+ Tree split operations simply", xp_earned: 10, created_at: new Date(Date.now() - 14400000).toISOString() },
    { id: "act-4", user_id: "11111111-1111-1111-1111-111111111111", type: "flashcard", title: "Reviewed 4 Flashcards in Data Structures", xp_earned: 20, created_at: new Date(Date.now() - 28800000).toISOString() },
    { id: "act-5", user_id: "11111111-1111-1111-1111-111111111111", type: "upload", title: "Uploaded PDF: Distributed_Systems_Concepts.pdf", xp_earned: 30, created_at: new Date(Date.now() - 86400000).toISOString() }
  ],
  chat_history: [],
  messages: [],
  pdf_uploads: [],
  notes: [],
  quizzes: [],
  questions: [],
  quiz_results: []
};

export function seedDatabase() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      console.log("Initializing database with production seed dataset...");
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultSeedData, null, 2), 'utf-8');
      console.log("Database seeded successfully at:", DB_FILE);
    } else {
      // Ensure all keys from defaultSeedData exist in existing local_db in case of schema expansions
      const existingData = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      let modified = false;
      for (const key of Object.keys(defaultSeedData)) {
        if (!existingData[key] || !Array.isArray(existingData[key])) {
          existingData[key] = defaultSeedData[key];
          modified = true;
        }
      }
      if (modified) {
        fs.writeFileSync(DB_FILE, JSON.stringify(existingData, null, 2), 'utf-8');
        console.log("Existing database synchronized with new schema tables.");
      } else {
        console.log("Database is already seeded and synchronized.");
      }
    }
  } catch (err) {
    console.error("Failed to seed database:", err);
  }
}

// Allow standalone execution: node seed.js
if (import.meta.url.endsWith('seed.js') || import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase();
}
