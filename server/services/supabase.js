import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// Use service_role key to bypass RLS for admin operations on the backend
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY; 

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("⚠️ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing. Backend Supabase operations will fail.");
}

export const supabaseAdmin = createClient(
  supabaseUrl || 'https://missing-env.supabase.co', 
  supabaseServiceKey || 'missing_key_dummy_value_to_prevent_crash', 
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Reusable backend service to track user activity in Supabase
 */
export const activityLogService = async ({ userId, actionType, entityType, entityId, metadata = {} }) => {
  try {
    const { error } = await supabaseAdmin
      .from('activity_logs')
      .insert([
        {
          user_id: userId,
          action_type: actionType,
          entity_type: entityType,
          entity_id: entityId,
          metadata: metadata
        }
      ]);
    if (error) {
      console.error("Failed to insert activity log to Supabase:", error);
    }
  } catch (err) {
    console.error("activityLogService error:", err);
  }
};
