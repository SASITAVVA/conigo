import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../services/supabase.js';

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'conigo_admin_secret_2025_change_in_production';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@conigo.app';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ConigoAdmin2025!';

// ─── LOGIN ────────────────────────────────────────────────────────────────────
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password are required.' });
        }
        if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
            return res.status(401).json({ success: false, error: 'Invalid admin credentials.' });
        }
        const token = jwt.sign({ role: 'admin', email }, ADMIN_JWT_SECRET, { expiresIn: '8h' });
        res.json({ success: true, token, email });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── PLATFORM STATS ───────────────────────────────────────────────────────────
export const getStats = async (req, res) => {
    try {
        const now = new Date();
        const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
        const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
        const monthStart = new Date(now); monthStart.setDate(now.getDate() - 30);
        const prevMonthStart = new Date(now); prevMonthStart.setDate(now.getDate() - 60);

        const [
            { data: profiles, error: profErr },
            { data: flashcards },
            { data: activityLogs },
            { data: docChunks },
            { data: sessions },
        ] = await Promise.all([
            supabaseAdmin.from('profiles').select('id, account_status, created_at, last_login_at'),
            supabaseAdmin.from('flashcards').select('id, created_at, user_id'),
            supabaseAdmin.from('activity_logs').select('id, action_type, created_at, user_id'),
            supabaseAdmin.from('document_chunks').select('id, document_id, user_id, created_at'),
            supabaseAdmin.from('study_sessions').select('id, user_id, started_at, duration_seconds'),
        ]);

        if (profErr) throw profErr;

        const allProfiles = profiles || [];
        const allFlashcards = flashcards || [];
        const allLogs = activityLogs || [];
        const allChunks = docChunks || [];
        const allSessions = sessions || [];

        const totalUsers = allProfiles.length;
        const activeUsers = allProfiles.filter(p => p.account_status === 'Active').length;
        const inactiveUsers = totalUsers - activeUsers;
        const newToday = allProfiles.filter(p => new Date(p.created_at) >= todayStart).length;
        const newThisWeek = allProfiles.filter(p => new Date(p.created_at) >= weekStart).length;
        const newThisMonth = allProfiles.filter(p => new Date(p.created_at) >= monthStart).length;
        const newPrevMonth = allProfiles.filter(p => {
            const d = new Date(p.created_at);
            return d >= prevMonthStart && d < monthStart;
        }).length;
        const userGrowthRate = newPrevMonth > 0 ? Math.round(((newThisMonth - newPrevMonth) / newPrevMonth) * 100) : (newThisMonth > 0 ? 100 : 0);

        const totalFlashcards = allFlashcards.length;
        const fcThisMonth = allFlashcards.filter(f => new Date(f.created_at) >= monthStart).length;

        // Deduplicate PDFs by document_id
        const uniqueDocs = new Set(allChunks.map(c => c.document_id).filter(Boolean));
        const totalPdfs = uniqueDocs.size;

        const aiLogs = allLogs.filter(l => ['chat', 'CHAT', 'AI_CHAT', 'ask_question'].includes(l.action_type));
        const quizLogs = allLogs.filter(l => l.action_type && (l.action_type.includes('QUIZ') || l.action_type.includes('quiz')));
        const noteLogs = allLogs.filter(l => l.action_type && (l.action_type.includes('NOTE') || l.action_type.includes('note')));
        const completedLogs = allLogs.filter(l => l.action_type && (l.action_type.includes('COMPLETE') || l.action_type.includes('complete')));

        const totalAI = aiLogs.length;
        const totalQuizzes = quizLogs.length;
        const totalNotes = noteLogs.length;
        const totalCompleted = completedLogs.length;
        const totalStudySeconds = allSessions.reduce((a, s) => a + (s.duration_seconds || 0), 0);

        // User growth chart — last 30 days
        const growthChart = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            const dStr = d.toISOString().split('T')[0];
            const count = allProfiles.filter(p => p.created_at && p.created_at.startsWith(dStr)).length;
            growthChart.push({ date: dStr, count });
        }

        // Feature usage breakdown
        const featureUsage = {};
        allLogs.forEach(l => {
            const key = l.action_type || 'other';
            featureUsage[key] = (featureUsage[key] || 0) + 1;
        });

        // Daily active users — last 14 days
        const dauChart = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            const dStr = d.toISOString().split('T')[0];
            const activeOnDay = new Set(allLogs.filter(l => l.created_at && l.created_at.startsWith(dStr)).map(l => l.user_id));
            dauChart.push({ date: dStr, count: activeOnDay.size });
        }

        res.json({
            success: true,
            stats: {
                totalUsers, activeUsers, inactiveUsers,
                newToday, newThisWeek, newThisMonth, userGrowthRate,
                totalFlashcards, fcThisMonth,
                totalPdfs, totalAI, totalQuizzes,
                totalNotes, totalCompleted,
                totalStudyHours: Math.round(totalStudySeconds / 3600),
                totalActivityLogs: allLogs.length,
            },
            charts: { growthChart, dauChart, featureUsage }
        });
    } catch (err) {
        console.error('[Admin] getStats error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── USERS LIST ───────────────────────────────────────────────────────────────
export const getUsers = async (req, res) => {
    try {
        const { search = '', status = '', sort = 'created_at', order = 'desc', page = 1, limit = 20 } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;

        let query = supabaseAdmin.from('profiles').select('*', { count: 'exact' });

        if (search) {
            query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
        }
        if (status) {
            query = query.eq('account_status', status);
        }

        const validSorts = ['created_at', 'last_login_at', 'full_name', 'email', 'account_status'];
        const safeSort = validSorts.includes(sort) ? sort : 'created_at';
        query = query.order(safeSort, { ascending: order === 'asc' });
        query = query.range(offset, offset + limitNum - 1);

        const { data: users, error, count } = await query;
        if (error) throw error;

        // Fetch per-user stats from activity_logs and flashcards
        const userIds = (users || []).map(u => u.id);
        let logCounts = {};
        let flashcardCounts = {};
        let docCounts = {};

        if (userIds.length > 0) {
            const { data: logs } = await supabaseAdmin.from('activity_logs').select('user_id, action_type').in('user_id', userIds);
            const { data: fcs } = await supabaseAdmin.from('flashcards').select('user_id').in('user_id', userIds);
            const { data: chunks } = await supabaseAdmin.from('document_chunks').select('user_id, document_id').in('user_id', userIds);

            (logs || []).forEach(l => {
                if (!logCounts[l.user_id]) logCounts[l.user_id] = { notes: 0, quizzes: 0, ai: 0, total: 0 };
                logCounts[l.user_id].total++;
                if (l.action_type && (l.action_type.includes('NOTE') || l.action_type.includes('note'))) logCounts[l.user_id].notes++;
                if (l.action_type && (l.action_type.includes('QUIZ') || l.action_type.includes('quiz'))) logCounts[l.user_id].quizzes++;
                if (['chat', 'CHAT', 'AI_CHAT', 'ask_question'].includes(l.action_type)) logCounts[l.user_id].ai++;
            });
            (fcs || []).forEach(f => { flashcardCounts[f.user_id] = (flashcardCounts[f.user_id] || 0) + 1; });
            const docMap = {};
            (chunks || []).forEach(c => {
                if (!docMap[c.user_id]) docMap[c.user_id] = new Set();
                if (c.document_id) docMap[c.user_id].add(c.document_id);
            });
            Object.entries(docMap).forEach(([uid, set]) => { docCounts[uid] = set.size; });
        }

        const enrichedUsers = (users || []).map(u => ({
            ...u,
            notes: (logCounts[u.id] || {}).notes || 0,
            quizzes: (logCounts[u.id] || {}).quizzes || 0,
            aiConversations: (logCounts[u.id] || {}).ai || 0,
            totalActivities: (logCounts[u.id] || {}).total || 0,
            flashcards: flashcardCounts[u.id] || 0,
            pdfs: docCounts[u.id] || 0,
        }));

        res.json({
            success: true,
            users: enrichedUsers,
            total: count || 0,
            page: pageNum,
            limit: limitNum,
            pages: Math.ceil((count || 0) / limitNum)
        });
    } catch (err) {
        console.error('[Admin] getUsers error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── USER DETAIL ──────────────────────────────────────────────────────────────
export const getUserDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const { data: profile, error: profErr } = await supabaseAdmin.from('profiles').select('*').eq('id', id).single();
        if (profErr) return res.status(404).json({ success: false, error: 'User not found.' });

        const [
            { data: logs },
            { data: flashcards },
            { data: chunks },
            { data: sessions },
            { data: progress },
        ] = await Promise.all([
            supabaseAdmin.from('activity_logs').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(100),
            supabaseAdmin.from('flashcards').select('id, topic, created_at').eq('user_id', id),
            supabaseAdmin.from('document_chunks').select('document_id, document_title, created_at').eq('user_id', id),
            supabaseAdmin.from('study_sessions').select('*').eq('user_id', id),
            supabaseAdmin.from('learning_progress').select('*').eq('user_id', id),
        ]);

        const uniqueDocs = new Map();
        (chunks || []).forEach(c => {
            if (c.document_id && !uniqueDocs.has(c.document_id)) {
                uniqueDocs.set(c.document_id, { id: c.document_id, title: c.document_title, created_at: c.created_at });
            }
        });

        const allLogs = logs || [];
        const timeline = allLogs.slice(0, 50).map(l => ({
            id: l.id,
            type: l.action_type,
            description: l.metadata?.description || l.action_type?.replace(/_/g, ' ') || 'Activity',
            timestamp: l.created_at,
            metadata: l.metadata
        }));

        const totalStudySecs = (sessions || []).reduce((a, s) => a + (s.duration_seconds || 0), 0);

        res.json({
            success: true,
            user: profile,
            stats: {
                totalActivities: allLogs.length,
                notes: allLogs.filter(l => l.action_type && (l.action_type.includes('NOTE') || l.action_type.includes('note'))).length,
                quizzes: allLogs.filter(l => l.action_type && (l.action_type.includes('QUIZ') || l.action_type.includes('quiz'))).length,
                aiConversations: allLogs.filter(l => ['chat', 'CHAT', 'AI_CHAT', 'ask_question'].includes(l.action_type)).length,
                flashcards: (flashcards || []).length,
                pdfs: uniqueDocs.size,
                completedTopics: (progress || []).filter(p => p.status === 'completed').length,
                studyHours: Math.round(totalStudySecs / 3600 * 10) / 10,
            },
            documents: [...uniqueDocs.values()].slice(0, 20),
            flashcardsSample: (flashcards || []).slice(0, 10),
            timeline,
        });
    } catch (err) {
        console.error('[Admin] getUserDetail error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── UPDATE USER ──────────────────────────────────────────────────────────────
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, account_status } = req.body;
        const updates = {};
        if (full_name !== undefined) updates.full_name = full_name;
        if (account_status !== undefined) updates.account_status = account_status;
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ success: false, error: 'No valid fields to update.' });
        }
        const { data, error } = await supabaseAdmin.from('profiles').update(updates).eq('id', id).select().single();
        if (error) throw error;
        res.json({ success: true, user: data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── DELETE USER ──────────────────────────────────────────────────────────────
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        // Delete from profiles table first
        const { error: profErr } = await supabaseAdmin.from('profiles').delete().eq('id', id);
        if (profErr) throw profErr;
        // Delete from Supabase Auth
        const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (authErr) console.warn('[Admin] Auth user delete warning:', authErr.message);
        res.json({ success: true, message: 'User deleted successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── ACTIVITY LOGS ────────────────────────────────────────────────────────────
export const getActivityLogs = async (req, res) => {
    try {
        const { search = '', action_type = '', user_id = '', from = '', to = '', page = 1, limit = 50 } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
        const offset = (pageNum - 1) * limitNum;

        let query = supabaseAdmin.from('activity_logs').select('*, profiles(full_name, email)', { count: 'exact' });
        if (user_id) query = query.eq('user_id', user_id);
        if (action_type) query = query.ilike('action_type', `%${action_type}%`);
        if (from) query = query.gte('created_at', from);
        if (to) query = query.lte('created_at', to + 'T23:59:59');
        query = query.order('created_at', { ascending: false }).range(offset, offset + limitNum - 1);

        const { data: logs, error, count } = await query;
        if (error) throw error;

        res.json({
            success: true,
            logs: logs || [],
            total: count || 0,
            page: pageNum,
            pages: Math.ceil((count || 0) / limitNum)
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// ─── CONTENT OVERVIEW ─────────────────────────────────────────────────────────
export const getContent = async (req, res) => {
    try {
        const [
            { data: flashcards, count: fcCount },
            { data: chunks, count: chunkCount },
            { data: sessions, count: sessCount },
            { data: progress, count: progCount },
        ] = await Promise.all([
            supabaseAdmin.from('flashcards').select('id, user_id, topic, created_at', { count: 'exact' }).limit(100),
            supabaseAdmin.from('document_chunks').select('document_id, document_title, user_id, created_at', { count: 'exact' }).limit(200),
            supabaseAdmin.from('study_sessions').select('id, user_id, duration_seconds, started_at', { count: 'exact' }).limit(100),
            supabaseAdmin.from('learning_progress').select('id, user_id, status', { count: 'exact' }).limit(100),
        ]);

        const uniqueDocs = new Map();
        (chunks || []).forEach(c => {
            if (c.document_id && !uniqueDocs.has(c.document_id)) {
                uniqueDocs.set(c.document_id, { id: c.document_id, title: c.document_title, user_id: c.user_id, created_at: c.created_at });
            }
        });

        // Top flashcard topics
        const topicCounts = {};
        (flashcards || []).forEach(f => { topicCounts[f.topic || 'General'] = (topicCounts[f.topic || 'General'] || 0) + 1; });
        const topTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([topic, count]) => ({ topic, count }));

        res.json({
            success: true,
            content: {
                totalFlashcards: fcCount || 0,
                totalDocuments: uniqueDocs.size,
                totalChunks: chunkCount || 0,
                totalSessions: sessCount || 0,
                totalProgressRecords: progCount || 0,
                completedTopics: (progress || []).filter(p => p.status === 'completed').length,
                recentDocs: [...uniqueDocs.values()].slice(0, 20),
                recentFlashcards: (flashcards || []).slice(0, 20),
                topFlashcardTopics: topTopics,
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

export default { login, getStats, getUsers, getUserDetail, updateUser, deleteUser, getActivityLogs, getContent };
