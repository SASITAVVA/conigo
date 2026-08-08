import crypto from 'crypto';
import { db } from '../services/db.js';
import { EventSystem } from '../services/events.js';
import { checkAndAwardBadges } from '../controllers/gamificationController.js';

export const recordHeartbeat = async (req, res) => {
  try {
    const { userId = '11111111-1111-1111-1111-111111111111', subjectId, addedSeconds = 10, activeInteractions = 5 } = req.body;
    const rawDb = db.getRawLocalDb();
    const todayStr = new Date().toISOString().split('T')[0];

    // Find or create today's study session
    let session = (rawDb.study_sessions || []).find(s => s.user_id === userId && s.session_date === todayStr && s.subject_id === (subjectId || 'sub-dsa'));
    
    if (!session) {
      session = {
        id: "sess-" + crypto.randomUUID(),
        user_id: userId,
        subject_id: subjectId || 'sub-dsa',
        session_date: todayStr,
        duration_seconds: addedSeconds,
        active_interactions: activeInteractions,
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString()
      };
      rawDb.study_sessions = rawDb.study_sessions || [];
      rawDb.study_sessions.push(session);
    } else {
      session.duration_seconds = (session.duration_seconds || 0) + Number(addedSeconds);
      session.active_interactions = (session.active_interactions || 0) + Number(activeInteractions);
      session.ended_at = new Date().toISOString();
    }

    // Also increment subject total study time if available
    if (subjectId) {
      const subject = (rawDb.subjects || []).find(sub => sub.id === subjectId || sub.slug === subjectId);
      if (subject) {
        subject.study_time_seconds = (subject.study_time_seconds || 0) + Number(addedSeconds);
      }
    }

    db.saveRawLocalDb(rawDb);

    // Re-calculate streak and trigger real-time broadcast
    const totalTodaySeconds = (rawDb.study_sessions || [])
      .filter(s => s.user_id === userId && s.session_date === todayStr)
      .reduce((acc, s) => acc + (s.duration_seconds || 0), 0);

    let xpGain = 0;
    if (totalTodaySeconds % 300 < addedSeconds) {
      xpGain = 10;
    }

    await EventSystem.emit('STUDY_TIME_UPDATED', {
      userId,
      title: `Active Study Heartbeat (+${addedSeconds}s)`,
      details: { totalTodaySeconds, addedSeconds, subjectId },
      xpAward: xpGain
    });

    await checkAndAwardBadges(userId);

    res.json({ success: true, totalTodaySeconds, session });
  } catch (err) {
    console.error("Heartbeat Error:", err);
    res.status(500).json({ error: 'Failed to record study heartbeat.' });
  }
};

export const getSessionHistory = async (req, res) => {
  try {
    const userId = req.query.userId || '11111111-1111-1111-1111-111111111111';
    const rawDb = db.getRawLocalDb();
    const sessions = (rawDb.study_sessions || []).filter(s => s.user_id === userId);
    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch study session history.' });
  }
};

export const recordActivity = async (req, res) => {
  try {
    const { 
      userId, 
      type, 
      title, 
      description, 
      extraData, 
      subjectId, 
      subjectName, 
      topicName, 
      duration, 
      status = 'Completed',
      metadata 
    } = req.body;

    // Use authenticated user ID if available
    const realUserId = req.user?.id || userId || '11111111-1111-1111-1111-111111111111';

    // Build comprehensive metadata
    const payloadMetadata = {
        extraData, subjectId, subjectName, topicName, duration, status, ...metadata
    };

    // Standardize action type for Admin Panel queries
    let actionType = type ? type.toUpperCase() : 'STUDY';
    if (actionType === 'UPLOAD') actionType = 'UPLOAD_PDF';
    if (actionType === 'TOPIC') actionType = 'START_TOPIC';

    // 1. Insert directly into Supabase activity_logs
    const { supabaseAdmin, activityLogService } = await import('../services/supabase.js');
    await activityLogService(
      realUserId, 
      actionType, 
      title || 'Learning Activity', 
      description || 'Active study engagement', 
      payloadMetadata
    );

    // Try to trigger Gamification/Badges (Local logic still runs temporarily until full migration)
    try {
      await checkAndAwardBadges(realUserId);
    } catch(e) {}

    // Emit event for real-time frontend updates
    EventSystem.emit("ACTIVITY_RECORDED", {
      userId: realUserId,
      activity: { type, title, description },
      subjectName: subjectName || 'General Study'
    });

    res.json({ success: true, activity: { type, title }, addedSeconds: duration || 120 });
  } catch (err) {
    console.error("Record Activity Error:", err);
    res.status(500).json({ error: 'Failed to record activity in Supabase.' });
  }
};

export default {
  recordHeartbeat,
  getSessionHistory,
  recordActivity
};
