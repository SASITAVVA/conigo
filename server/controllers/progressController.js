import { supabaseAdmin } from '../services/supabase.js';
import { EventSystem } from '../services/events.js';
import { checkAndAwardBadges } from '../controllers/gamificationController.js';

const getUserFromReq = async (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Unauthorized');
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) throw new Error('Unauthorized');
    return user.id;
};

export const getProgressSummary = async (req, res) => {
    try {
        let userId;
        try {
            userId = await getUserFromReq(req);
        } catch (e) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const [
            { data: subjectsData },
            { data: topicsData },
            { data: progressData },
            { data: sessionsData }
        ] = await Promise.all([
            supabaseAdmin.from('subjects').select('*'),
            supabaseAdmin.from('topics').select('*'),
            supabaseAdmin.from('learning_progress').select('*').eq('user_id', userId),
            supabaseAdmin.from('study_sessions').select('*').eq('user_id', userId)
        ]);

        const subjects = subjectsData || [];
        const allTopics = topicsData || [];
        const userProgress = progressData || [];

        let totalTopics = subjects.reduce((acc, s) => acc + (s.total_topics || 20), 0);
        if (totalTopics === 0) totalTopics = 120; // fallback

        let completedTopics = userProgress.filter(p => p.status === 'completed').length;
        let inProgressTopics = userProgress.filter(p => p.status === 'in_progress').length;
        let notStartedTopics = Math.max(0, totalTopics - completedTopics - inProgressTopics);
        let percentage = Math.round((completedTopics / Math.max(totalTopics, 1)) * 100) || 0;

        const subjectBreakdown = subjects.map(sub => {
            const completed = userProgress.filter(p => {
                const top = allTopics.find(t => t.id === p.topic_id);
                return p.status === 'completed' && ((top && top.subject_id === sub.id) || p.subject_id === sub.id);
            }).length;
            const total = sub.total_topics || 20;
            return {
                id: sub.id,
                name: sub.title,
                percent: Math.round((completed / Math.max(total, 1)) * 100),
                completed,
                total,
                iconColor: sub.icon_color || '#4f46e5',
                bgColor: sub.bg_color || '#e0e7ff'
            };
        });

        const timeSeriesLabels = [];
        const timeSeriesData = [];
        const now = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            
            timeSeriesLabels.push(i === 0 ? 'Today' : `Day -${i}`);
            
            const cumulativeCompleted = userProgress.filter(p => p.status === 'completed' && (p.created_at || '').split('T')[0] <= dateStr).length;
            timeSeriesData.push(Math.round((cumulativeCompleted / Math.max(totalTopics, 1)) * 100));
        }

        const completedTopicList = allTopics
            .filter(t => userProgress.some(p => p.topic_id === t.id && p.status === 'completed'))
            .map(t => {
                const sub = subjects.find(s => s.id === t.subject_id);
                return {
                    id: t.id,
                    title: t.title,
                    subject: sub ? sub.title : 'General CS',
                    date: new Date().toISOString().split('T')[0]
                };
            }).slice(0, 8);

        const upcomingTopicList = allTopics
            .filter(t => !userProgress.some(p => p.topic_id === t.id && p.status === 'completed'))
            .map(t => {
                const sub = subjects.find(s => s.id === t.subject_id);
                return {
                    id: t.id,
                    title: t.title,
                    subject: sub ? sub.title : 'General CS',
                    difficulty: t.difficulty || 'Medium'
                };
            }).slice(0, 8);

        res.json({
            success: true,
            overall: {
                totalTopics,
                completedTopics,
                inProgressTopics,
                notStartedTopics,
                percentage
            },
            subjects: subjectBreakdown,
            timeSeries: {
                labels: timeSeriesLabels,
                data: timeSeriesData
            },
            recentCompleted: completedTopicList,
            upcoming: upcomingTopicList
        });

    } catch (error) {
        console.error("Progress API Error:", error);
        res.status(500).json({ error: 'Failed to fetch progress stats from database.' });
    }
};

export const updateProgress = async (req, res) => {
    try {
        let userId;
        try {
            userId = await getUserFromReq(req);
        } catch (e) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { topicId, topicTitle, subjectId, status = 'completed', masteryScore = 100 } = req.body;
        
        // Find existing record
        let { data: existingProgress } = await supabaseAdmin
            .from('learning_progress')
            .select('*')
            .eq('user_id', userId)
            .eq('topic_id', topicId)
            .maybeSingle();

        let record;
        if (!existingProgress) {
            const { data: newRecord, error: insertErr } = await supabaseAdmin
                .from('learning_progress')
                .insert({
                    user_id: userId,
                    topic_id: topicId,
                    subject_id: subjectId,
                    status,
                    mastery_score: masteryScore
                })
                .select()
                .single();
            if (insertErr) throw insertErr;
            record = newRecord;
        } else {
            const { data: updatedRecord, error: updateErr } = await supabaseAdmin
                .from('learning_progress')
                .update({
                    status,
                    mastery_score: Math.max(existingProgress.mastery_score || 0, masteryScore)
                })
                .eq('id', existingProgress.id)
                .select()
                .single();
            if (updateErr) throw updateErr;
            record = updatedRecord;
        }

        // Add to activity logs
        await supabaseAdmin.from('activity_logs').insert({
            user_id: userId,
            action_type: `topic_${status}`,
        });

        await EventSystem.emit('TOPIC_COMPLETED', {
            userId,
            title: `Completed Topic: ${topicTitle || 'Algorithm Concept'}`,
            details: { topicId, status, masteryScore },
            xpAward: 30
        });

        await checkAndAwardBadges(userId);

        res.json({ success: true, record });
    } catch (error) {
        console.error("Progress Update Error:", error);
        res.status(500).json({ error: 'Failed to update progress database.' });
    }
};

export default {
    getProgressSummary,
    updateProgress
};
