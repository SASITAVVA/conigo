-- Migration 002: Production Relational Schema for CogniPath AI Learning Platform
-- Covers all 22 required enterprise entities with proper indexes and RLS structure

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles (Linked to auth.users or local users table)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  profile_photo TEXT,
  bio TEXT DEFAULT 'Passionate lifelong learner on CogniPath.',
  learning_goal TEXT DEFAULT 'Master Software Engineering and Artificial Intelligence.',
  current_level TEXT DEFAULT 'Intermediate',
  daily_goal INTEGER DEFAULT 60, -- minutes
  weekly_goal INTEGER DEFAULT 420, -- minutes
  preferred_language TEXT DEFAULT 'English',
  timezone TEXT DEFAULT 'UTC',
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  coins INTEGER DEFAULT 0,
  joined_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 2. Courses
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  difficulty TEXT DEFAULT 'Beginner',
  estimated_hours INTEGER DEFAULT 20,
  category TEXT DEFAULT 'General',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 3. Subjects
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL, -- e.g., HTML, CSS, JavaScript, Python, Data Structures, Algorithms, DBMS, Operating Systems, Computer Networks
  slug TEXT UNIQUE NOT NULL,
  icon_color TEXT DEFAULT '#4f46e5',
  bg_color TEXT DEFAULT '#e0e7ff',
  total_topics INTEGER DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 4. Lessons
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  order_index INTEGER DEFAULT 1,
  description TEXT,
  estimated_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 5. Topics
CREATE TABLE IF NOT EXISTS topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  difficulty TEXT DEFAULT 'Medium',
  order_index INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 6. Progress (Topic & Subject completion tracking)
CREATE TABLE IF NOT EXISTS progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  mastery_score FLOAT DEFAULT 0.0,
  study_time_seconds INTEGER DEFAULT 0,
  quiz_accuracy FLOAT DEFAULT 0.0,
  revision_count INTEGER DEFAULT 0,
  last_studied TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  UNIQUE(user_id, topic_id)
);

-- 7. StudySessions (Real study active/inactive timer records)
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  session_date DATE DEFAULT CURRENT_DATE NOT NULL,
  duration_seconds INTEGER DEFAULT 0 NOT NULL,
  active_interactions INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 8. ChatHistory (Conversations)
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  title TEXT DEFAULT 'New Conversation' NOT NULL,
  topic TEXT DEFAULT 'General Learning',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 9. Messages (Individual conversational exchanges)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID REFERENCES chat_history(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  question TEXT,
  answer TEXT,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  response_time_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 10. PDFUploads (Documents & Assets)
CREATE TABLE IF NOT EXISTS pdf_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  file_url TEXT,
  file_type TEXT DEFAULT 'PDF', -- PDF, DOCX, TXT, PPT, IMAGE
  status TEXT DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'failed')),
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 11. Embeddings (Vector chunks for local & cloud RAG)
CREATE TABLE IF NOT EXISTS embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES pdf_uploads(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  embedding vector(384), -- Supports all-MiniLM-L6-v2 dimensions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);
CREATE INDEX IF NOT EXISTS embeddings_idx ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 12. Notes (AI Notes generation)
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  document_id UUID REFERENCES pdf_uploads(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT,
  definitions JSONB DEFAULT '[]'::jsonb,
  examples JSONB DEFAULT '[]'::jsonb,
  key_points JSONB DEFAULT '[]'::jsonb,
  tables JSONB DEFAULT '[]'::jsonb,
  formulas JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 13. Flashcards (Auto-generated interactive review cards)
CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  document_id UUID REFERENCES pdf_uploads(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  difficulty_rating TEXT DEFAULT 'normal' CHECK (difficulty_rating IN ('easy', 'normal', 'hard')),
  is_favorite BOOLEAN DEFAULT false,
  review_count INTEGER DEFAULT 0,
  next_revision_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 14. Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  topic TEXT NOT NULL,
  difficulty TEXT DEFAULT 'Medium',
  total_questions INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 15. Questions (Quiz Question banks)
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT DEFAULT 'MCQ' CHECK (question_type IN ('MCQ', 'Coding', 'True/False', 'Fill Blank', 'Short Answer')),
  options JSONB DEFAULT '[]'::jsonb,
  correct_answer TEXT NOT NULL,
  explanation TEXT,
  order_index INTEGER DEFAULT 1
);

-- 16. QuizResults
CREATE TABLE IF NOT EXISTS quiz_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  score FLOAT NOT NULL,
  accuracy FLOAT NOT NULL,
  time_taken_seconds INTEGER DEFAULT 120,
  correct_answers INTEGER DEFAULT 0,
  wrong_answers INTEGER DEFAULT 0,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 17. Bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('Topic', 'Chat', 'Course', 'PDF', 'Note')),
  reference_id UUID NOT NULL,
  title TEXT NOT NULL,
  snippet TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 18. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'system' CHECK (type IN ('Daily Goal', 'Learning Reminder', 'Quiz Available', 'Revision', 'Achievement', 'PDF Processing', 'System')),
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 19. Goals (Daily, Weekly, Monthly milestone objectives)
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('daily', 'weekly', 'monthly')),
  target_minutes INTEGER NOT NULL,
  achieved_minutes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed')),
  start_date DATE DEFAULT CURRENT_DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 20. Achievements (Gamification Badges & Milestones Catalog)
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- Emoji or SVG path
  xp_reward INTEGER DEFAULT 100,
  requirement_type TEXT NOT NULL, -- e.g., 'streak', 'study_time', 'quizzes_completed'
  requirement_value INTEGER NOT NULL
);

-- 21. UserAchievements (Unlocked achievements per student)
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  UNIQUE(user_id, achievement_id)
);

-- 22. Settings (User preferences)
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL,
  dark_mode BOOLEAN DEFAULT true,
  preferred_language TEXT DEFAULT 'English',
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  privacy_share_leaderboard BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- Indexing for high-performance dashboard aggregation
CREATE INDEX IF NOT EXISTS idx_progress_user_subject ON progress(user_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_date ON study_sessions(user_id, session_date);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_quiz_results_user_submitted ON quiz_results(user_id, submitted_at);
