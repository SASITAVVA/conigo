import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const dbConfig = {
  localDbPath: process.env.VERCEL ? path.join('/tmp', 'local_db.json') : path.join(__dirname, '../../database/local_db.json'),
  backupIntervalMs: 300000, // 5 minutes default
  defaultCollections: [
    'profiles',
    'courses',
    'subjects',
    'topics',
    'progress',
    'study_sessions',
    'achievements',
    'user_achievements',
    'flashcards',
    'bookmarks',
    'goals',
    'notifications',
    'recent_activity',
    'notes',
    'quizzes',
    'quiz_results',
    'pdf_uploads',
    'activity_logs',
    'admin_logs',
    'chat_history'
  ]
};

export default dbConfig;
