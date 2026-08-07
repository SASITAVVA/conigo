-- ==============================================================================
-- SUPABASE MIGRATION 003: ENRICHED USER LEARNING ANALYTICS VIEW
-- Purpose: Creates a Postgres View in Supabase to display total study time,
-- mastery levels, total uploaded PDFs, and exact started topic names per user.
-- ==============================================================================

-- Drop view if it already exists to allow updates
DROP VIEW IF EXISTS vw_user_learning_summary;

CREATE OR REPLACE VIEW vw_user_learning_summary AS
WITH user_study_time AS (
    SELECT 
        user_id,
        SUM(COALESCE(duration_seconds, 0)) AS total_seconds,
        CONCAT(
            FLOOR(SUM(COALESCE(duration_seconds, 0)) / 3600), 'h ', 
            FLOOR((SUM(COALESCE(duration_seconds, 0)) % 3600) / 60), 'm'
        ) AS study_time_formatted
    FROM study_sessions
    GROUP BY user_id
),
user_pdf_stats AS (
    SELECT 
        user_id,
        COUNT(id) AS total_pdfs_uploaded,
        STRING_AGG(title, ', ' ORDER BY created_at DESC) AS pdf_file_names
    FROM pdf_uploads
    GROUP BY user_id
),
user_topic_stats AS (
    SELECT 
        p.user_id,
        COUNT(DISTINCT COALESCE(p.topic, t.title)) AS topics_started_count,
        STRING_AGG(DISTINCT COALESCE(p.topic, t.title), ', ') AS topic_names_started
    FROM progress p
    LEFT JOIN topics t ON p.topic_id = t.id
    WHERE p.status IN ('in_progress', 'completed', 'started', 'active') OR p.study_time_seconds > 0
    GROUP BY p.user_id
)
SELECT 
    p.user_id AS supabase_user_id,
    p.name AS student_name,
    p.email AS student_email,
    COALESCE(st.study_time_formatted, '0m') AS study_time_duration,
    COALESCE(st.total_seconds, 0) AS study_time_total_seconds,
    CONCAT('Level ', COALESCE(p.level, 1), ' (', COALESCE(p.xp, 0), ' XP)') AS mastery_level,
    COALESCE(p.level, 1) AS level_num,
    COALESCE(p.xp, 0) AS xp_total,
    COALESCE(pdf.total_pdfs_uploaded, 0) AS pdfs_uploaded_count,
    COALESCE(pdf.pdf_file_names, 'None') AS pdfs_uploaded_names,
    COALESCE(ts.topics_started_count, 0) AS topics_started_count,
    COALESCE(ts.topic_names_started, 'No topics started yet') AS topics_started_names,
    p.joined_date AS account_created_at
FROM profiles p
LEFT JOIN user_study_time st ON p.user_id = st.user_id
LEFT JOIN user_pdf_stats pdf ON p.user_id = pdf.user_id
LEFT JOIN user_topic_stats ts ON p.user_id = ts.user_id;

-- Grant access to authenticated and service roles
GRANT SELECT ON vw_user_learning_summary TO authenticated, service_role, anon;

-- Comment on VIEW for Supabase Studio clarity
COMMENT ON VIEW vw_user_learning_summary IS 'Enterprise aggregated view displaying real-time study time, mastery levels, uploaded document counts, and specific topics started for each student account in Supabase.';
