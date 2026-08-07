import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../server/.env') });

const apiKey = process.env.GEMINI_API_KEY;

async function run() {
    console.log("Testing Google Gemini AI Models Connection...");
    if (!apiKey) {
        console.warn("⚠️ No GEMINI_API_KEY set in server/.env. Application will automatically use offline intelligent fallback generators.");
        return;
    }
    const ai = new GoogleGenAI({ apiKey });
    const modelsToTest = ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-flash-latest"];
    for (const m of modelsToTest) {
        try {
            const response = await ai.models.generateContent({
                model: m,
                contents: "Say 'hello world'",
            });
            console.log(`✅ [${m}] WORKS! Response: ${response.text}`);
        } catch(e) {
            console.log(`⚠️ [${m}] FAILED or UNAVAILABLE: ${e.message}`);
        }
    }
}

run();
