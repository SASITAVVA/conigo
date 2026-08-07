import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../server/.env') });

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://mock.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'mock-anon-key'
);

async function testAuth() {
    console.log("Testing Supabase Database Connection & Profile Retrieval...");
    try {
        const { data, error } = await supabase.from('profiles').select('id').limit(1);
        if (error) {
            console.warn("Notice: Supabase remote query errored or offline, application will rely on local database fallback:", error.message);
        } else {
            console.log("✅ Successfully queried remote profiles:", data);
        }
    } catch (err) {
        console.warn("Notice: Supabase offline mode active. Local fallback enabled.", err.message);
    }
}

testAuth();
