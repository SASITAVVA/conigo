import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'cognipath-enterprise-secure-jwt-secret-key-2026',
  supabaseUrl: process.env.SUPABASE_URL || 'http://localhost',
  supabaseKey: process.env.SUPABASE_ANON_KEY || 'missing',
  geminiApiKey: process.env.GEMINI_API_KEY || ''
};

export default config;
