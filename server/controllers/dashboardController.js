import { db } from '../services/db.js';

export const getDashboardStats = async (req, res) => {
    const userId = req.query.userId || '11111111-1111-1111-1111-111111111111';

    try {
        db.autoSeedUser(userId);
        const rawDb = db.getRawLocalDb();
        const subjects = rawDb.subjects || [];
        const topics = rawDb.topics || [];

        const userProgress = (rawDb.progress || []).filter(p => p.user_id === userId && p.status === 'completed');
        const userSessions = (rawDb.study_sessions || []).filter(s => s.user_id === userId);
        const userActivities = (rawDb.recent_activity || []).filter(a => a.user_id === userId);
        const userPdfs = (rawDb.pdf_uploads || []).filter(p => p.user_id === userId).length;
        const userQuestions = (rawDb.messages || []).filter(m => m.user_id === userId && m.role === 'assistant').length || 
                              userActivities.filter(a => a.type === 'chat').length;

        const isEmpty = (userProgress.length === 0 && userSessions.length === 0 && userActivities.length === 0 && userPdfs === 0);

        let totalTopicsCount = subjects.reduce((acc, s) => acc + (s.total_topics || 20), 0);
        if (totalTopicsCount === 0) totalTopicsCount = 120; // safe default for DB structure

        let completedTopicsCount = userProgress.length;
        const overallPercentage = Math.round((completedTopicsCount / totalTopicsCount) * 100);

        const subjectBreakdown = subjects.map(sub => {
            const completed = userProgress.filter(p => {
                const top = topics.find(t => t.id === p.topic_id);
                return top && top.subject_id === sub.id;
            }).length;
            const studySecs = userSessions.filter(s => s.subject_id === sub.id || s.subject === sub.title).reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
            
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
            .filter(s => s.session_date === todayStr)
            .reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
        const todayMinutes = Math.floor(todaySeconds / 60);

        const uniqueDates = [...new Set(userSessions.map(s => s.session_date))].sort().reverse();
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
            const daySessions = userSessions.filter(s => s.session_date === dStr);
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
            .slice(0, 10);

        const unreadNotificationsCount = (rawDb.notifications || []).filter(n => n.user_id === userId && !n.read).length;

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
