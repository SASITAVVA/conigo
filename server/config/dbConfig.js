import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const dbConfig = {
  localDbPath: path.join(__dirname, '../../database/local_db.json'),
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
    'quizzes'
  ]
};

export default dbConfig;
