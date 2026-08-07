# CogniPath Enterprise Database Architecture & RAG Embeddings

Our persistence architecture ensures zero data loss, real-time sync across Analytics/Progress pages, and zero external dependency failures through an intelligent **Hybrid Supabase + Local Storage Engine**.

---

## 22 Enterprise Entity Schema (Overview)

All tables are represented both in SQL (`database/migrations/002_production_enterprise_schema.sql`) and JSON structure (`database/local_db.json`).

### 1. Core Profile & Identity
- `profiles`: Stores user bio, daily/weekly learning objectives, XP, rank levels, and coin totals.
- `user_settings`: User theme choices and telemetry privacy flags.

### 2. Curriculum & Interactive Topics
- `courses`: Higher-level skill roadmaps (e.g., Full Stack Web Engineering, Core Computer Science).
- `subjects`: Dedicated skill segments with progress completion percentages (HTML, Python, Data Structures, etc.).
- `lessons` & `topics`: Atomic learning materials designed for crisp visual display when selected.

### 3. Real-Time Learning Telemetry
- `progress`: Maps (user_id, topic_id) to completion status (`not_started`, `in_progress`, `completed`), mastery percentages, and study seconds.
- `study_sessions`: Timed focus blocks captured via automated study inactivity timer heartbeats.
- `goals`: Daily and weekly minute milestones with completion triggers.

### 4. Vector RAG & Study Materials
- `pdf_uploads`: Metadoc records of uploaded lecture texts and textbooks.
- `embeddings`: Stores text chunks alongside **384-dimensional cosine similarity vectors** (powered by `all-MiniLM-L6-v2`) for instant contextual chat answers.
- `notes` & `bookmarks`: Structured definitions and pinned study aids.
- `flashcards`: Spaced repetition interactive active recall cards categorized by difficulty ratings.

### 5. Gamified Motivators
- `achievements` & `user_achievements`: Badge catalog and unlocked rewards for continuous study streaks and quiz accuracies.
- `quizzes`, `questions`, & `quiz_results`: Complete record of assessment evaluations and topic mastery scores.
- `notifications`: Real-time system notices for daily goal completions and new AI quiz availability.

---

## Automatic Failover Design (`server/services/db.js`)
When an endpoint requests data, `db.select()` or `db.insert()` attempts to connect to remote Postgres instances via Supabase. If network disconnects or API limits trigger, the system silently resolves operations against `database/local_db.json`, ensuring uninterrupted learning sessions for users worldwide.
