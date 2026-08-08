import { supabaseAdmin } from '../services/supabase.js';
import crypto from 'crypto';

export const getAdminSummary = async (req, res) => {
  try {
    const [{ count: totalUsers }, { count: activeUsersToday }, { count: totalPdfs }, { count: totalTopics }] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('activity_logs').select('*', { count: 'exact', head: true }).eq('action_type', 'LOGIN').gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
      supabaseAdmin.from('activity_logs').select('*', { count: 'exact', head: true }).eq('action_type', 'UPLOAD_PDF'),
      supabaseAdmin.from('activity_logs').select('*', { count: 'exact', head: true }).eq('action_type', 'START_TOPIC')
    ]);

    const stats = {
      totalUsers: totalUsers || 0,
      activeUsersToday: activeUsersToday || 0,
      totalStudyHoursFormatted: `0h 0m`, 
      totalPdfsUploaded: totalPdfs || 0,
      totalTopicsStarted: totalTopics || 0,
      totalTopicsCompleted: 0,
      avgMasteryLevelFormatted: `0% (Beginner)`,
      avgLearningTimeFormatted: `0h 0m`,
      totalCourses: 0,
      totalSubjects: 0,
      totalQuizzes: 0
    };

    const { data: users } = await supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false }).limit(50);
    const mappedUsers = (users || []).map(p => ({
      id: p.id,
      fullName: p.full_name || p.email,
      name: p.full_name || p.email,
      email: p.email,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      accountStatus: p.account_status,
      registrationDate: p.created_at,
      lastLogin: p.last_login_at || p.created_at,
      role: p.role,
      lastActivityTimestamp: p.last_activity_at || p.last_login_at,
      studyTimeSeconds: 0,
      pdfCount: 0,
      topicsStarted: 0,
      topicsCompleted: 0
    }));

    res.json({ success: true, stats, users: mappedUsers, courses: [], subjects: [] });
  } catch (err) {
    console.error("Admin dashboard summary error:", err);
    res.status(500).json({ error: 'Failed to retrieve admin dashboard summary.' });
  }
};

export const getUsers = async (req, res) => {
  try {
    const { data: profiles, error } = await supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false });
    
    if (error) throw error;
    
    const users = (profiles || []).map(p => ({
      id: p.id,
      name: p.full_name || p.email,
      email: p.email,
      role: p.role,
      status: p.account_status,
      joined_date: p.created_at,
      last_login: p.last_login_at,
      studyTimeSeconds: 0,
      pdfCount: 0,
      topicsStarted: 0,
      topicsCompleted: 0
    }));
    
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getUserDetails = async (req, res) => {
  try {
    const targetId = req.params.id;
    const { data: profile, error } = await supabaseAdmin.from('profiles').select('*').eq('id', targetId).single();
    
    if (error || !profile) return res.status(404).json({ error: 'User not found.' });
    
    const { data: activityLogs } = await supabaseAdmin
      .from('activity_logs')
      .select('*')
      .eq('user_id', targetId)
      .order('created_at', { ascending: false });
      
    res.json({
      success: true,
      profile,
      sessions: [],
      pdfs: [],
      progress: [],
      quizzes: [],
      flashcards: [],
      chatHistory: [],
      activityLogs: activityLogs || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateUserStatus = async (req, res) => {
  try {
    const targetId = req.params.id;
    const { status } = req.body;
    
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .update({ account_status: status })
      .eq('id', targetId)
      .select()
      .single();
      
    if (error || !profile) return res.status(404).json({ error: 'User not found.' });
    
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAnalytics = async (req, res) => {
  try {
    const [{ count: totalUsers }, { count: activeUsers }] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).neq('account_status', 'Suspended')
    ]);
    
    res.json({
      success: true,
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      totalSessions: 0,
      totalQuizzes: 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createCourse = async (req, res) => {
  res.json({ success: true, course: { id: "stub", title: "stub" } });
};

export const createSubject = async (req, res) => {
  res.json({ success: true, subject: { id: "stub", title: "stub" } });
};

export const deleteUser = async (req, res) => {
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'User account deleted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export default {
  getAdminSummary,
  createCourse,
  createSubject,
  deleteUser,
  getUsers,
  getUserDetails,
  updateUserStatus,
  getAnalytics
};
