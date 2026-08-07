-- ==============================================================================
-- SUPABASE MIGRATION 004: ENRICH ALL TABLES WITH HUMAN-READABLE STUDENT NAMES
-- Purpose: Replaces confusing UUID displays in Supabase table views with
-- the actual Student Names by adding student_name and user_name columns and
-- backfilling existing data from profiles.
-- ==============================================================================

-- 1. Add student_name and user_name columns to major activity & progress tables
DO $$ 
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN ARRAY['study_sessions', 'pdf_uploads', 'recent_activity', 'progress', 'user_achievements', 'notes', 'goals', 'chat_history'] LOOP
        EXECUTE format('ALTER TABLE IF EXISTS %I ADD COLUMN IF NOT EXISTS student_name TEXT;', tbl);
        EXECUTE format('ALTER TABLE IF EXISTS %I ADD COLUMN IF NOT EXISTS user_name TEXT;', tbl);
    END LOOP;
END $$;

-- 2. Backfill existing rows in all tables with the real student names from profiles
UPDATE study_sessions s SET student_name = COALESCE(p.name, p.email, 'Student'), user_name = COALESCE(p.name, p.email, 'Student') FROM profiles p WHERE s.user_id = p.user_id AND (s.student_name IS NULL OR s.student_name = '');
UPDATE pdf_uploads u SET student_name = COALESCE(p.name, p.email, 'Student'), user_name = COALESCE(p.name, p.email, 'Student') FROM profiles p WHERE u.user_id = p.user_id AND (u.student_name IS NULL OR u.student_name = '');
UPDATE recent_activity a SET student_name = COALESCE(p.name, p.email, 'Student'), user_name = COALESCE(p.name, p.email, 'Student') FROM profiles p WHERE a.user_id = p.user_id AND (a.student_name IS NULL OR a.student_name = '');
UPDATE progress pr SET student_name = COALESCE(p.name, p.email, 'Student'), user_name = COALESCE(p.name, p.email, 'Student') FROM profiles p WHERE pr.user_id = p.user_id AND (pr.student_name IS NULL OR pr.student_name = '');
UPDATE user_achievements ua SET student_name = COALESCE(p.name, p.email, 'Student'), user_name = COALESCE(p.name, p.email, 'Student') FROM profiles p WHERE ua.user_id = p.user_id AND (ua.student_name IS NULL OR ua.student_name = '');

-- 3. Create an automatic trigger function to keep names synchronized on future inserts
CREATE OR REPLACE FUNCTION fn_auto_enrich_student_name()
RETURNS TRIGGER AS $$
DECLARE
    prof_name TEXT;
BEGIN
    IF NEW.user_id IS NOT NULL THEN
        SELECT COALESCE(name, email, 'Student') INTO prof_name FROM profiles WHERE user_id = NEW.user_id OR id::text = NEW.user_id::text LIMIT 1;
        IF prof_name IS NOT NULL THEN
            NEW.student_name := prof_name;
            NEW.user_name := prof_name;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Apply triggers to tables so future inserts automatically receive student_name
DO $$ 
DECLARE
    tbl TEXT;
BEGIN
    FOR tbl IN ARRAY['study_sessions', 'pdf_uploads', 'recent_activity', 'progress', 'user_achievements', 'notes', 'goals', 'chat_history'] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_enrich_name ON %I;', tbl);
        EXECUTE format('CREATE TRIGGER trg_enrich_name BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION fn_auto_enrich_student_name();', tbl);
    END LOOP;
END $$;

COMMENT ON FUNCTION fn_auto_enrich_student_name() IS 'Automatically resolves user_id UUIDs to human-readable Student Names across all tables.';
