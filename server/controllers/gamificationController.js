import crypto from 'crypto';
import { supabaseAdmin } from '../services/supabase.js';
import { EventSystem } from '../services/events.js';

const getXPAward = (actionType) => {
    if (!actionType) return 0;
    const type = actionType.toUpperCase();
    if (type.includes('UPLOAD') || type.includes('PDF')) return 50;
    if (type.includes('QUIZ')) return 100;
    if (type.includes('CHAT') || type.includes('QUESTION')) return 10;
    if (type.includes('FLASHCARD') || type.includes('REVIEW')) return 15;
    if (type.includes('NOTE') || type.includes('STUDY')) return 20;
    if (type.includes('LOGIN')) return 10;
    if (type.includes('GOAL')) return 20;
    return 5;
};

export const getGamificationSummary = async (req, res) => {
  try {
    const userId = req.query.userId || '11111111-1111-1111-1111-111111111111';
    
    // Fetch user profile from Supabase
    let { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (!profile) {
        profile = { id: userId, full_name: "Student", email: "student@cognipath.ai" };
    }

    // Fetch user's activity logs to calculate real XP
    const { data: logs } = await supabaseAdmin.from('activity_logs').select('action_type').eq('user_id', userId);
    
    let totalXp = 0;
    if (logs && logs.length > 0) {
        logs.forEach(log => {
            totalXp += getXPAward(log.action_type);
        });
    }

    const calculatedLevel = Math.floor(totalXp / 400) + 1;
    
    // Default dummy badges for MVP
    const badges = [
        { id: 'b1', title: 'First Steps', icon: '🌟', unlocked: totalXp > 0 },
        { id: 'b2', title: 'Bookworm', icon: '📚', unlocked: totalXp > 100 },
        { id: 'b3', title: 'Quiz Master', icon: '🧠', unlocked: totalXp > 500 },
        { id: 'b4', title: 'AI Whisperer', icon: '🤖', unlocked: totalXp > 1000 }
    ];

    // Dummy leaderboard combining current user and some fake competitors
    const leaderboard = [
        { id: userId, name: profile.full_name || 'You', xp: totalXp, level: calculatedLevel, isUser: true },
        { id: 'u1', name: 'Alex Johnson', xp: 1250, level: 4, isUser: false },
        { id: 'u2', name: 'Maria Garcia', xp: 840, level: 3, isUser: false },
        { id: 'u3', name: 'David Chen', xp: Math.max(100, totalXp - 50), level: 2, isUser: false }
    ].sort((a, b) => b.xp - a.xp).map((p, index) => ({ ...p, rank: index + 1 }));

    res.json({
      success: true,
      xp: totalXp,
      level: calculatedLevel,
      coins: Math.floor(totalXp / 10),
      badges,
      leaderboard,
      dailyGoal: 150,
      weeklyGoal: 1000
    });
  } catch (err) {
    console.error("Gamification API Error:", err);
    res.status(500).json({ error: 'Failed to retrieve gamification summary.' });
  }
};

export async function checkAndAwardBadges(userId) {
    // Dynamic XP logic handles badge progression now
}

export default {
  getGamificationSummary,
  checkAndAwardBadges
};
