import { db } from '../services/db.js';
import { supabase } from '../config/supabase.js';
import { hashPassword } from '../utils/authUtils.js';

// Helper to push user profile to Supabase matching exact table schema columns
async function syncProfileToSupabase(profile) {
  if (!profile) return;
  const payload = {
    id: profile.id || profile.user_id,
    name: profile.name || profile.student_name || 'Student Name',
    learning_goals: profile.learning_goals || profile.learning_goal || 'Master Software Engineering & AI',
    preferred_subjects: profile.preferred_subjects || 'Computer Science & Full-Stack Development',
    skill_level: profile.skill_level || (profile.level ? `Level ${profile.level} (${profile.xp || 100} XP)` : 'Beginner / Level 1')
  };

  try {
    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
    if (error) {
      if (error.code === '42501' || (error.message && error.message.includes('row-level security'))) {
        console.warn(`[Supabase Sync Warning] Profile insert blocked by Row-Level Security (RLS) on table 'profiles'. To display user data in Supabase, please disable RLS or add an RLS policy allowing inserts/updates.`);
      } else {
        console.warn(`[Supabase Sync Error] Could not upsert profile for ${payload.name}:`, error.message);
      }
    } else {
      console.log(`✅ Profile synchronized to Supabase cloud database for user: ${payload.name}`);
    }
  } catch (err) {
    console.warn(`[Supabase Sync Exception]:`, err.message || err);
  }
}

export const userModel = {
  findProfileById(userId) {
    const rawDb = db.getRawLocalDb();
    return (rawDb.profiles || []).find(p => p.user_id === userId || p.id === userId) || null;
  },

  findProfileByEmail(email) {
    if (!email) return null;
    const rawDb = db.getRawLocalDb();
    return (rawDb.profiles || []).find(p => p.email.toLowerCase() === email.toLowerCase()) || null;
  },

  findProfileByVerificationTokenHash(hash) {
    if (!hash) return null;
    const rawDb = db.getRawLocalDb();
    return (rawDb.profiles || []).find(p => p.verificationTokenHash === hash) || null;
  },

  createProfile(profileData) {
    const rawDb = db.getRawLocalDb();
    if (!rawDb.profiles) rawDb.profiles = [];
    rawDb.profiles.push(profileData);
    db.saveRawLocalDb(rawDb);
    
    // Explicitly synchronize to Supabase profiles table
    syncProfileToSupabase(profileData);
    return profileData;
  },

  updateProfile(userId, updates) {
    const rawDb = db.getRawLocalDb();
    const profile = (rawDb.profiles || []).find(p => p.user_id === userId || p.id === userId);
    if (!profile) return null;
    Object.assign(profile, updates, { updated_at: new Date().toISOString() });
    db.saveRawLocalDb(rawDb);
    
    // Synchronize updated profile to Supabase
    syncProfileToSupabase(profile);
    return profile;
  },

  getAllProfiles() {
    return db.getRawLocalDb().profiles || [];
  },

// Sync all stored accounts to Supabase
  async syncAllToSupabase() {
    const profiles = this.getAllProfiles();
    for (const p of profiles) {
      await syncProfileToSupabase(p);
    }
  },

  seedDefaultAdmin() {
    const rawDb = db.getRawLocalDb();
    if (!rawDb.profiles) rawDb.profiles = [];
    const adminExists = rawDb.profiles.some(p => p.role === 'admin' && p.email === 'admin@cognipath.ai');
    if (!adminExists) {
      const adminId = 'admin-' + Date.now();
      const adminProfile = {
        id: adminId,
        user_id: adminId,
        name: 'Master Admin',
        email: 'admin@cognipath.ai',
        password_hash: hashPassword('Admin123!'),
        role: 'admin',
        joined_date: new Date().toISOString(),
        emailVerified: true
      };
      this.createProfile(adminProfile);
      console.log('✅ Default Master Admin account seeded: admin@cognipath.ai / Admin123!');
    }
  }
};

// Automatically attempt to sync all stored profiles on load
setTimeout(() => {
  userModel.syncAllToSupabase();
  userModel.seedDefaultAdmin();
}, 2000);

export default userModel;
