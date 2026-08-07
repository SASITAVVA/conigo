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
      userId = '11111111-1111-1111-1111-111111111111', 
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

    const rawDb = db.getRawLocalDb();
    const todayStr = new Date().toISOString().split('T')[0];
    rawDb.recent_activity = rawDb.recent_activity || [];

    const nowMs = Date.now();
    const recentDuplicate = rawDb.recent_activity.find(a => 
      (a.user_id === userId || a.userId === userId) &&
      a.type === type &&
      a.title === title &&
      (nowMs - new Date(a.created_at || a.timestamp || 0).getTime()) < 2000
    );

    if (recentDuplicate) {
      return res.json({ success: true, duplicateIgnored: true, activity: recentDuplicate });
    }

    let resolvedSubjectName = subjectName || (subjectId ? (rawDb.subjects || []).find(s => s.id === subjectId)?.title : 'General Study') || 'General Study';

    const newActivity = {
      id: "act-" + crypto.randomUUID(),
      user_id: userId,
      userId: userId,
      type: type || 'study',
      title: title || 'Learning Activity',
      description: description || 'Active study engagement',
      subjectName: resolvedSubjectName,
      topicName: topicName || null,
      duration: duration || null,
      status: status,
      metadata: metadata || extraData || null,
      created_at: new Date().toISOString(),
      timestamp: new Date().toISOString()
    };

    rawDb.recent_activity.unshift(newActivity);
    if (rawDb.recent_activity.length > 500) rawDb.recent_activity = rawDb.recent_activity.slice(0, 500);

    let addedSeconds = duration ? Math.min(3600, duration) : 120;
    if (!duration) {
      if (type === 'quiz') addedSeconds = 300;
      else if (type === 'upload' || type === 'note') addedSeconds = 240;
      else if (type === 'flashcard' || type === 'topic' || type === 'course') addedSeconds = 180;
    }

    let targetSubject = (rawDb.subjects || []).find(s => s.id === subjectId || s.title.toLowerCase() === resolvedSubjectName.toLowerCase());
    if (!targetSubject && rawDb.subjects && rawDb.subjects.length > 0) {
      targetSubject = rawDb.subjects.find(s => title && title.toLowerCase().includes(s.title.toLowerCase().split(' ')[0])) || rawDb.subjects[0];
    }
    if (targetSubject) {
      targetSubject.study_time_seconds = (targetSubject.study_time_seconds || 0) + addedSeconds;
    }

    let session = (rawDb.study_sessions || []).find(s => s.user_id === userId && s.session_date === todayStr);
    if (!session) {
      session = {
        id: "sess-" + crypto.randomUUID(),
        user_id: userId,
        subject_id: targetSubject ? targetSubject.id : 'sub-dsa',
        session_date: todayStr,
        duration_seconds: addedSeconds,
        active_interactions: 1,
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString()
      };
      rawDb.study_sessions = rawDb.study_sessions || [];
      rawDb.study_sessions.push(session);
    } else {
      session.duration_seconds = (session.duration_seconds || 0) + addedSeconds;
      session.active_interactions = (session.active_interactions || 0) + 1;
      session.ended_at = new Date().toISOString();
    }

    db.saveRawLocalDb(rawDb);
    await checkAndAwardBadges(userId);

    EventSystem.emit("ACTIVITY_RECORDED", {
      userId,
      activity: newActivity,
      addedSeconds,
      subjectName: resolvedSubjectName
    });

    res.json({ success: true, activity: newActivity, updatedSubject: targetSubject ? targetSubject.title : null, addedSeconds });
  } catch (err) {
    console.error("Record Activity Error:", err);
    res.status(500).json({ error: 'Failed to record activity and link study metrics.' });
  }
};

export default {
  recordHeartbeat,
  getSessionHistory,
  recordActivity
};
