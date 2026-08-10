import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin, activityLogService } from '../services/supabase.js';

export const syncSession = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header.' });
    }

    const token = authHeader.split(' ')[1];

    // Check if the backend is missing the environment variables
    if (supabaseAdmin.supabaseUrl.includes('missing-env')) {
      return res.status(500).json({ error: 'CRITICAL ERROR: Vercel is missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.' });
    }

    // 1. Verify the Supabase JWT using the Supabase Admin client
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token or user not found in Supabase Auth.' });
    }

    const userId = user.id;
    const email = user.email;
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || 'Student';

    // Create a user-scoped client to perform profile operations safely bypassing RLS if service_role is missing
    const userSupabase = createClient(
      process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    // 2. Safely create or find the profile in public.profiles
    let { data: profile, error: profileError } = await userSupabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError && profileError.code === 'PGRST116') {
      // Profile does not exist yet (e.g. trigger failed or didn't run)
      const { data: newProfile, error: insertError } = await userSupabase
        .from('profiles')
        .insert([{
          id: userId,
          email: email,
          full_name: fullName,
          role: 'student',
          account_status: 'Active',
          last_login_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString()
        }])
        .select()
        .single();
        
      if (insertError) {
        console.error("Profile creation error:", insertError);
        return res.status(500).json({ error: `Failed to synchronize user profile. Database error: ${insertError.message}` });
      }
      profile = newProfile;
    } else if (profileError) {
      console.error("Profile fetch error:", profileError);
      return res.status(500).json({ error: `Failed to retrieve user profile. Database error: ${profileError.message}` });
    } else {
      // Profile exists, update last_login_at
      const { data: updatedProfile, error: updateError } = await userSupabase
        .from('profiles')
        .update({
          last_login_at: new Date().toISOString(),
          last_activity_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single();
        
      if (!updateError) {
         profile = updatedProfile;
      }
    }

    // 3. Log the activity
    await activityLogService({
      userId: userId,
      actionType: 'LOGIN',
      entityType: 'user',
      entityId: userId,
      metadata: { method: 'token_sync' }
    });

    // 4. Return success and the profile
    const frontendUser = {
      id: profile.id,
      name: profile.full_name || profile.name || email,
      email: profile.email,
      role: profile.role || 'student',
      account_status: profile.account_status,
      xp: 100, // Legacy stub if needed
      level: 1
    };

    res.json({
      success: true,
      user: frontendUser
    });

  } catch (err) {
    console.error("Sync Session Error:", err);
    res.status(500).json({ error: 'Server error during session synchronization.' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { name, bio, learningGoal } = req.body;
    
    const updates = {};
    if (name) updates.full_name = name;
    
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) return res.status(404).json({ error: 'Profile update failed.' });

    await activityLogService({
      userId: user.id,
      actionType: 'PROFILE_UPDATED',
      entityType: 'profile',
      entityId: user.id,
      metadata: updates
    });
    res.json({ success: true, profile });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { data: profile, error } = await supabaseAdmin.from('profiles').select('*').eq('id', user.id).single();
    if (error) return res.status(404).json({ error: 'Profile not found' });
    
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export default {
  syncSession,
  updateProfile,
  getCurrentUser
};
