import { supabaseAdmin } from '../services/supabase.js';

export const getDashboardStats = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid authorization header' });
        }

        const token = authHeader.split(' ')[1];
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !user) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        const userId = user.id;

        const [
            { data: subjectsData },
            { data: topicsData },
            { data: progressData },
            { data: sessionsData },
            { data: activitiesData },
            { data: resourcesData }
        ] = await Promise.all([
            supabaseAdmin.from('subjects').select('*'),
            supabaseAdmin.from('topics').select('*'),
            supabaseAdmin.from('learning_progress').select('*').eq('user_id', userId),
            supabaseAdmin.from('study_sessions').select('*').eq('user_id', userId),
            supabaseAdmin.from('activity_logs').select('*').eq('user_id', userId),
            supabaseAdmin.from('resources').select('*').eq('user_id', userId)
        ]);

        const subjects = subjectsData || [];
        const topics = topicsData || [];
        const userProgress = (progressData || []).filter(p => p.status === 'completed');
        const userSessions = sessionsData || [];
        const userActivities = activitiesData || [];
        const userResources = resourcesData || [];

        const userPdfs = userResources.length;
        const userQuestions = userActivities.filter(a => a.action_type === 'chat' || a.action_type === 'ask_question').length;

        const isEmpty = (userProgress.length === 0 && userSessions.length === 0 && userActivities.length === 0 && userPdfs === 0);

        let totalTopicsCount = subjects.reduce((acc, s) => acc + (s.total_topics || 20), 0);
        if (totalTopicsCount === 0) totalTopicsCount = 120;

        let completedTopicsCount = userProgress.length;
        const overallPercentage = Math.round((completedTopicsCount / totalTopicsCount) * 100) || 0;

        const subjectBreakdown = subjects.map(sub => {
            const completed = userProgress.filter(p => {
                const top = topics.find(t => t.id === p.topic_id);
                return (top && top.subject_id === sub.id) || p.subject_id === sub.id;
            }).length;
            
            const studySecs = userSessions.filter(s => {
                const top = topics.find(t => t.id === s.topic_id);
                return top && top.subject_id === sub.id;
            }).reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
            
            const total = sub.total_topics || 20;
            return {
                id: sub.id,
                title: sub.title,
                iconColor: sub.icon_color || '#4f46e5',
                bgColor: sub.bg_color || '#e0e7ff',
                totalTopics: total,
                completedTopics: completed,
                percentage: Math.round((completed / Math.max(total, 1)) * 100),
                studyHours: Math.round(studySecs / 3600 * 10) / 10,
                avgQuizScore: sub.average_quiz_score || 85
            };
        });

        let totalStudySeconds = userSessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
        const hours = Math.floor(totalStudySeconds / 3600);
        const minutes = Math.floor((totalStudySeconds % 3600) / 60);

        const todayStr = new Date().toISOString().split('T')[0];
        const todaySeconds = userSessions
            .filter(s => s.started_at && s.started_at.split('T')[0] === todayStr)
            .reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
        const todayMinutes = Math.floor(todaySeconds / 60);

        const uniqueDates = [...new Set(userSessions.map(s => s.started_at ? s.started_at.split('T')[0] : null).filter(Boolean))].sort().reverse();
        let currentStreak = 0;
        let checkDate = new Date();
        for (let i = 0; i < 30; i++) {
            const dateStr = checkDate.toISOString().split('T')[0];
            if (uniqueDates.includes(dateStr)) {
                currentStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else if (i === 0) {
                checkDate.setDate(checkDate.getDate() - 1);
                const yesterdayStr = checkDate.toISOString().split('T')[0];
                if (uniqueDates.includes(yesterdayStr)) {
                    currentStreak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    break;
                }
            } else {
                break;
            }
        }

        const heatmap = [];
        const endDate = new Date();
        for (let idx = 83; idx >= 0; idx--) {
            const d = new Date();
            d.setDate(endDate.getDate() - idx);
            const dStr = d.toISOString().split('T')[0];
            const daySessions = userSessions.filter(s => s.started_at && s.started_at.split('T')[0] === dStr);
            const daySeconds = daySessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
            
            let intensity = 0;
            if (daySeconds > 7200) intensity = 4;
            else if (daySeconds > 3600) intensity = 3;
            else if (daySeconds > 1800) intensity = 2;
            else if (daySeconds > 0) intensity = 1;

            heatmap.push({ date: dStr, seconds: daySeconds, intensity });
        }

        const activity = userActivities
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 10)
            .map(a => ({
                id: a.id,
                type: a.action_type,
                title: `Activity: ${a.action_type.replace('_', ' ')}`,
                description: '',
                created_at: a.created_at
            }));

        const unreadNotificationsCount = 0;

        res.json({
            success: true,
            isEmpty,
            overallPercentage,
            completedTopics: completedTopicsCount,
            totalTopics: totalTopicsCount,
            studyHours: `${hours}h ${minutes}m`,
            rawStudyHours: Math.round(totalStudySeconds / 3600 * 10) / 10,
            todayStudyMinutes: todayMinutes,
            currentStreak,
            longestStreak: currentStreak,
            totalPdfs: userPdfs,
            questionsAsked: userQuestions,
            subjectBreakdown,
            heatmap,
            recentActivity: activity,
            unreadNotifications: unreadNotificationsCount
        });
    } catch (error) {
        console.error("Dashboard Stats API Error:", error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
};

export default {
    getDashboardStats
};
