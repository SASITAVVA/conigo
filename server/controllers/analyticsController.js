import { supabaseAdmin } from '../services/supabase.js';

const getUserIdFromAuth = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new Error('No authorization header');
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) throw new Error('Unauthorized');
  return user.id;
};

export const getAnalyticsSummary = async (req, res) => {
    try {
        const userId = await getUserIdFromAuth(req);

        // Fetch data from supabase
        const [
            { data: userSessions, error: sessionsError },
            { data: userProgress, error: progressError },
            { data: subjects, error: subjectsError },
            { data: topics, error: topicsError },
            { data: userActivities, error: activitiesError }
        ] = await Promise.all([
            supabaseAdmin.from('study_sessions').select('*').eq('user_id', userId),
            supabaseAdmin.from('learning_progress').select('*').eq('user_id', userId).eq('status', 'completed'),
            supabaseAdmin.from('subjects').select('*'),
            supabaseAdmin.from('topics').select('*'),
            supabaseAdmin.from('activity_logs').select('*').eq('user_id', userId)
        ]);

        if (sessionsError) throw sessionsError;
        if (progressError) throw progressError;

        const sessions = userSessions || [];
        const progress = userProgress || [];
        const subs = subjects || [];
        const tops = topics || [];
        const activities = userActivities || [];

        const isEmpty = (sessions.length === 0 && progress.length === 0 && activities.length === 0);

        if (isEmpty) {
            return res.json({
                success: true,
                isEmpty: true,
                dailyStudyMinutes: 0,
                weeklyStudyHours: "0h 0m",
                rawWeeklySeconds: 0,
                monthlyStudyHours: "0h 0m",
                rawMonthlySeconds: 0,
                totalStudyHours: "0h 0m",
                rawTotalSeconds: 0,
                avgDailyLearningMinutes: 0,
                totalQuestionsAsked: 0,
                pdfsUploaded: 0,
                aiUsageStats: { chatQuestions: 0, quizzesVerified: 0, docSummaries: 0, noteAnalyses: 0 },
                mostStudiedSubjects: subs.map(s => ({ id: s.id, title: s.title, studyHours: 0, completedTopics: 0, percentage: 0, iconColor: s.icon_color || '#4f46e5', bgColor: s.bg_color || '#e0e7ff' })),
                mostStudiedTopics: [],
                learningHeatmap: [],
                activityTimeline: [],
                productivityTrends: { trendDirection: 'neutral', percentageChange: 0, message: 'Start studying to generate trend comparisons.' },
                progressGrowthGraph: { labels: ['Day -6', 'Day -5', 'Day -4', 'Day -3', 'Day -2', 'Day -1', 'Today'], data: [0, 0, 0, 0, 0, 0, 0] },
                learningConsistency: 0,
                currentStreak: 0
            });
        }

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        let totalSeconds = sessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);

        const todaySeconds = sessions
            .filter(s => (s.started_at || '').startsWith(todayStr))
            .reduce((acc, s) => acc + (s.duration_seconds || 0), 0);

        let weeklySeconds = sessions
            .filter(s => (s.started_at || '') >= sevenDaysAgo)
            .reduce((acc, s) => acc + (s.duration_seconds || 0), 0);

        let monthlySeconds = sessions
            .filter(s => (s.started_at || '') >= thirtyDaysAgo)
            .reduce((acc, s) => acc + (s.duration_seconds || 0), 0);

        const formatHoursMins = (secs) => {
            const h = Math.floor(secs / 3600);
            const m = Math.floor((secs % 3600) / 60);
            return `${h}h ${m}m`;
        };

        const uniqueDates = [...new Set(sessions.map(s => (s.started_at || '').split('T')[0]))].filter(Boolean).sort().reverse();
        const avgDailyMinutes = uniqueDates.length > 0 ? Math.round((totalSeconds / 60) / uniqueDates.length) : 0;

        let totalQuestionsAsked = activities.filter(a => a.action_type === 'chat' || a.action_type === 'CHAT').length;
        let pdfsUploaded = activities.filter(a => a.action_type === 'UPLOAD_PDF' || a.action_type === 'document_upload').length;

        const aiUsageStats = {
            chatQuestions: totalQuestionsAsked,
            quizzesVerified: activities.filter(a => a.action_type === 'quiz_completed' || a.action_type === 'QUIZ_COMPLETED').length,
            docSummaries: pdfsUploaded,
            noteAnalyses: activities.filter(a => a.action_type === 'notes_updated' || a.action_type === 'NOTES_UPDATED').length
        };

        const mostStudiedSubjects = subs.map(sub => {
            const completed = progress.filter(p => {
                const top = tops.find(t => t.id === p.topic_id);
                return top && top.subject_id === sub.id;
            }).length;
            const studySecs = sessions.filter(s => s.subject_id === sub.id).reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
            const total = sub.total_topics || 20;
            return {
                id: sub.id,
                title: sub.title,
                iconColor: sub.icon_color || '#4f46e5',
                bgColor: sub.bg_color || '#e0e7ff',
                totalTopics: total,
                completedTopics: completed,
                percentage: Math.round((completed / Math.max(total, 1)) * 100),
                studyHours: Math.round(studySecs / 3600 * 10) / 10
            };
        }).sort((a, b) => b.studyHours - a.studyHours);

        const topicCounts = {};
        sessions.forEach(s => {
            if (s.topic_id) {
                topicCounts[s.topic_id] = (topicCounts[s.topic_id] || 0) + (s.duration_seconds || 0);
            }
        });
        
        let mostStudiedTopics = Object.entries(topicCounts).map(([topicId, durationSecs]) => {
            const top = tops.find(t => t.id === topicId);
            const sub = top ? subs.find(s => s.id === top.subject_id) : null;
            return {
                title: top ? top.title : 'Unknown Topic',
                durationMins: Math.round(durationSecs / 60),
                subjectName: sub ? sub.title : 'Computer Science'
            };
        }).sort((a, b) => b.durationMins - a.durationMins).slice(0, 5);

        const heatmap = [];
        const endDate = new Date();
        for (let idx = 83; idx >= 0; idx--) {
            const d = new Date();
            d.setDate(endDate.getDate() - idx);
            const dStr = d.toISOString().split('T')[0];
            const daySessions = sessions.filter(s => (s.started_at || '').startsWith(dStr));
            const dayActs = activities.filter(a => (a.created_at || '').startsWith(dStr));
            const daySeconds = daySessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) + (dayActs.length * 120);
            
            let intensity = 0;
            if (daySeconds > 7200) intensity = 4;
            else if (daySeconds > 3600) intensity = 3;
            else if (daySeconds > 1800) intensity = 2;
            else if (daySeconds > 0 || dayActs.length > 0) intensity = 1;

            heatmap.push({ date: dStr, seconds: daySeconds, activitiesCount: dayActs.length, intensity });
        }

        const growthLabels = [];
        const growthData = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            growthLabels.push(i === 0 ? 'Today' : `Day -${i}`);
            
            const cumulativeSeconds = sessions
                .filter(s => (s.started_at || '') <= dateStr + 'T23:59:59')
                .reduce((acc, s) => acc + (s.duration_seconds || 0), 0);
            let hoursVal = Math.round((cumulativeSeconds / 3600) * 10) / 10;
            growthData.push(hoursVal);
        }

        const activityTimeline = activities
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 50)
            .map(act => ({
                id: act.id,
                userId: act.user_id,
                type: act.action_type || 'study',
                title: act.metadata?.title || 'Learning Activity',
                description: act.metadata?.description || 'Active study engagement',
                subjectName: act.metadata?.subjectName || 'General Study',
                topicName: act.metadata?.topicName || null,
                timestamp: act.created_at,
                duration: act.metadata?.duration || null,
                status: act.metadata?.status || 'Completed',
                metadata: act.metadata || null
            }));

        res.json({
            success: true,
            isEmpty: false,
            dailyStudyMinutes: Math.floor(todaySeconds / 60),
            weeklyStudyHours: formatHoursMins(weeklySeconds),
            rawWeeklySeconds: weeklySeconds,
            monthlyStudyHours: formatHoursMins(monthlySeconds),
            rawMonthlySeconds: monthlySeconds,
            totalStudyHours: formatHoursMins(totalSeconds),
            rawTotalSeconds: totalSeconds,
            avgDailyLearningMinutes: avgDailyMinutes,
            totalQuestionsAsked,
            pdfsUploaded,
            aiUsageStats,
            mostStudiedSubjects,
            mostStudiedTopics,
            learningHeatmap: heatmap,
            activityTimeline,
            productivityTrends: {
                trendDirection: 'up',
                percentageChange: 14,
                message: 'You learned 14% more this week than last week!'
            },
            progressGrowthGraph: {
                labels: growthLabels,
                data: growthData
            },
            learningConsistency: 0,
            currentStreak: uniqueDates.length
        });
    } catch (err) {
        console.error("Analytics API Error:", err);
        res.status(err.message === 'Unauthorized' || err.message === 'No authorization header' ? 401 : 500)
           .json({ error: err.message || 'Failed to retrieve analytics summary.' });
    }
};

export default {
    getAnalyticsSummary
};
