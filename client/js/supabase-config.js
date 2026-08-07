const supabaseUrl = 'https://tcyslennzzexshzpbgzd.supabase.co'; // Replace with real URL
const supabaseAnonKey = 'sb_publishable_DwQtX2llPuSjlJdjV5YbjA_aVdljsBM'; // Replace with real anon key

// Initialize Supabase Client
window.supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);
