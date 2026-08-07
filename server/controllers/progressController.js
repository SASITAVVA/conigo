import crypto from 'crypto';
import { db } from '../services/db.js';
import { EventSystem } from '../services/events.js';
import { checkAndAwardBadges } from '../controllers/gamificationController.js';

export const getProgressSummary = async (req, res) => {
    const userId = req.query.userId || '11111111-1111-1111-1111-111111111111';
    const isDemoUser = (userId === '11111111-1111-1111-1111-111111111111');

    try {
        const rawDb = db.getRawLocalDb();
        const subjects = rawDb.subjects || [];
        const allTopics = rawDb.topics || [];
        const userProgress = (rawDb.progress || []).filter(p => p.user_id === userId);

        let totalTopics = subjects.reduce((acc, s) => acc + (s.total_topics || 20), 0);
        let completedTopics = userProgress.filter(p => p.status === 'completed').length;
        if (isDemoUser && userProgress.length === 0) {
            completedTopics = subjects.reduce((acc, s) => acc + (s.completed_topics || 0), 0);
        }
        
        let inProgressTopics = userProgress.filter(p => p.status === 'in_progress').length;
        let notStartedTopics = Math.max(0, totalTopics - completedTopics - inProgressTopics);
        let percentage = Math.round((completedTopics / Math.max(totalTopics, 1)) * 100);

        const subjectBreakdown = subjects.map(sub => {
            let completed = 0;
            if (isDemoUser && userProgress.length === 0) {
                completed = sub.completed_topics || 0;
            } else {
                completed = userProgress.filter(p => {
                    const top = allTopics.find(t => t.id === p.topic_id && p.status === 'completed');
                    return top && top.subject_id === sub.id;
                }).length;
            }
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

        const allSessions = (rawDb.study_sessions || []).filter(s => s.user_id === userId);
        const timeSeriesLabels = [];
        const timeSeriesData = [];
        const now = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            
            timeSeriesLabels.push(i === 0 ? 'Today' : `Day -${i}`);
            if (isDemoUser && allSessions.length === 0) {
                timeSeriesData.push(Math.min(100, Math.round(percentage * (0.8 + (6-i)*0.03))));
            } else {
                const cumulativeCompleted = userProgress.filter(p => (p.completed_at || p.created_at || '').split('T')[0] <= dateStr && p.status === 'completed').length;
                timeSeriesData.push(Math.round((cumulativeCompleted / Math.max(totalTopics, 1)) * 100));
            }
        }

        const completedTopicList = allTopics
            .filter(t => (isDemoUser && t.completed && userProgress.length === 0) || userProgress.some(p => p.topic_id === t.id && p.status === 'completed'))
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
            .filter(t => !(isDemoUser && t.completed && userProgress.length === 0) && !userProgress.some(p => p.topic_id === t.id && p.status === 'completed'))
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
    const { userId = '11111111-1111-1111-1111-111111111111', topicId, topicTitle, subjectId, status = 'completed', masteryScore = 100 } = req.body;
    
    try {
        const rawDb = db.getRawLocalDb();

        let topicObj = (rawDb.topics || []).find(t => t.id === topicId || t.title === topicTitle);
        if (topicObj && status === 'completed') {
          topicObj.completed = true;
        }

        let record = (rawDb.progress || []).find(p => p.user_id === userId && (p.topic_id === topicId || p.topic === topicTitle));
        if (!record) {
          record = {
            id: "prog-" + crypto.randomUUID(),
            user_id: userId,
            topic_id: topicId || "top-custom",
            subject_id: subjectId || (topicObj ? topicObj.subject_id : 'sub-dsa'),
            status,
            mastery_score: masteryScore,
            study_time_seconds: 1800,
            quiz_accuracy: 100,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          rawDb.progress = rawDb.progress || [];
          rawDb.progress.push(record);
        } else {
          record.status = status;
          record.mastery_score = Math.max(record.mastery_score || 0, masteryScore);
          record.updated_at = new Date().toISOString();
        }

        const sub = (rawDb.subjects || []).find(s => s.id === (subjectId || (topicObj ? topicObj.subject_id : null)));
        if (sub && status === 'completed') {
          sub.completed_topics = Math.min((sub.total_topics || 20), (sub.completed_topics || 0) + 1);
        }

        db.saveRawLocalDb(rawDb);

        await EventSystem.emit('TOPIC_COMPLETED', {
          userId,
          title: `Completed Topic: ${topicObj ? topicObj.title : (topicTitle || 'Algorithm Concept')}`,
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
