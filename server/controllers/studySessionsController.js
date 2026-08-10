import { supabaseAdmin, activityLogService } from '../services/supabase.js';

const getUserIdFromAuth = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) throw new Error('No authorization header');
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) throw new Error('Unauthorized');
  return user.id;
};

export const startSession = async (req, res) => {
  try {
    const userId = await getUserIdFromAuth(req);
    const { subjectId, topicId } = req.body;

    const { data: session, error } = await supabaseAdmin
      .from('study_sessions')
      .insert([{
        user_id: userId,
        subject_id: subjectId,
        topic_id: topicId,
        started_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;

    await activityLogService({
      userId,
      actionType: 'STUDY_SESSION_STARTED',
      entityType: 'study_session',
      entityId: session.id
    });

    res.json({ success: true, session });
  } catch (err) {
    console.error("Start Session Error:", err);
    res.status(err.message === 'Unauthorized' || err.message === 'No authorization header' ? 401 : 500)
       .json({ error: err.message || 'Failed to start session' });
  }
};

export const endSession = async (req, res) => {
  try {
    const userId = await getUserIdFromAuth(req);
    const { sessionId, durationSeconds } = req.body;

    const { data: session, error } = await supabaseAdmin
      .from('study_sessions')
      .update({
        ended_at: new Date().toISOString(),
        duration_seconds: durationSeconds
      })
      .eq('id', sessionId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    await activityLogService({
      userId,
      actionType: 'STUDY_SESSION_COMPLETED',
      entityType: 'study_session',
      entityId: session.id
    });

    res.json({ success: true, session });
  } catch (err) {
    console.error("End Session Error:", err);
    res.status(err.message === 'Unauthorized' || err.message === 'No authorization header' ? 401 : 500)
       .json({ error: err.message || 'Failed to end session' });
  }
};

export const getSessionHistory = async (req, res) => {
  try {
    const userId = await getUserIdFromAuth(req);

    const { data: sessions, error } = await supabaseAdmin
      .from('study_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, sessions });
  } catch (err) {
    console.error("Session History Error:", err);
    res.status(err.message === 'Unauthorized' || err.message === 'No authorization header' ? 401 : 500)
       .json({ error: err.message || 'Failed to fetch study session history.' });
  }
};

export const recordActivity = async (req, res) => {
  try {
    // Accept userId from body (client sends it since not all requests are authenticated via header)
    const authHeader = req.headers.authorization;
    let userId = req.body.userId || null;

    // If a valid auth token is present, prefer that
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        if (user?.id) userId = user.id;
      } catch (_) {}
    }

    // Reject stub/guest user IDs
    if (!userId || userId === '11111111-1111-1111-1111-111111111111') {
      return res.json({ success: false, message: 'Guest user — activity not logged.' });
    }

    const { type, title, description, extraData, subjectId, subjectName, topicName, duration, status, metadata } = req.body;

    // Map client-side type strings to standardized action_type values
    const actionTypeMap = {
      'upload':    'NOTE_SAVED',
      'quiz':      'QUIZ_COMPLETED',
      'tutor':     'AI_TASK_TRIGGERED',
      'chat':      'AI_CHAT',
      'login':     'LOGIN',
      'note':      'NOTE_SAVED',
      'flashcard': 'FLASHCARD_REVIEWED',
      'pdf':       'PDF_UPLOADED',
      'translate': 'NOTE_TRANSLATED',
      'summarize': 'NOTE_SUMMARIZED',
    };

    const actionType = actionTypeMap[type] || (type ? type.toUpperCase().replace(/\s+/g, '_') : 'ACTIVITY');

    await activityLogService({
      userId,
      actionType,
      entityType: type || 'activity',
      entityId: null,
      metadata: {
        title: title || null,
        description: description || null,
        extraData: extraData || null,
        subjectId: subjectId || null,
        subjectName: subjectName || null,
        topicName: topicName || null,
        duration: duration || null,
        status: status || 'Completed',
        ...(metadata || {})
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('recordActivity error:', err);
    // Don't break the client — always return 200
    res.json({ success: false, error: err.message });
  }
};

export default {
  startSession,
  endSession,
  getSessionHistory,
  recordActivity
};
