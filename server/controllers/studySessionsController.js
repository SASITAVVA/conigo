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

export default {
  startSession,
  endSession,
  getSessionHistory
};
