import { createClient } from '@supabase/supabase-js';
import config from './environment.js';

if (config.supabaseUrl === 'http://localhost' || config.supabaseKey === 'missing') {
  console.warn("Supabase URL or Key is fallback default in config/environment.js.");
}

export const supabase = createClient(config.supabaseUrl, config.supabaseKey);
export default supabase;
