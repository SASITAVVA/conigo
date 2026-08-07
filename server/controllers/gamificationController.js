import crypto from 'crypto';
import { db } from '../services/db.js';
import { EventSystem } from '../services/events.js';

export const getGamificationSummary = async (req, res) => {
  try {
    const userId = req.query.userId || '11111111-1111-1111-1111-111111111111';
    const rawDb = db.getRawLocalDb();
    let profile = rawDb.profiles.find(p => (p.user_id === userId || p.id === userId));
    if (!profile) {
        profile = { id: userId, user_id: userId, name: "Student", xp: 0, level: 1, coins: 0, daily_goal: 60, weekly_goal: 420 };
    }

    const allAchievements = rawDb.achievements || [];
    const unlockedIds = (rawDb.user_achievements || [])
      .filter(ua => ua.user_id === userId)
      .map(ua => ua.achievement_id);

    const badges = allAchievements.map(ach => ({
      ...ach,
      unlocked: unlockedIds.includes(ach.id),
      unlockedAt: unlockedIds.includes(ach.id) ? rawDb.user_achievements.find(u => u.achievement_id === ach.id && u.user_id === userId)?.unlocked_at : null
    }));

    // Generate Leaderboard ranking
    const leaderboard = (rawDb.profiles || [])
      .map(p => ({
        id: p.user_id || p.id,
        name: p.name || 'Student',
        photo: p.profile_photo,
        xp: p.xp || 0,
        level: p.level || 1,
        isCurrentUser: (p.user_id === userId || p.id === userId)
      }))
      .sort((a, b) => b.xp - a.xp)
      .map((p, index) => ({ ...p, rank: index + 1 }));

    res.json({
      success: true,
      xp: profile.xp || 0,
      level: profile.level || 1,
      coins: profile.coins || 0,
      badges,
      leaderboard,
      dailyGoal: profile.daily_goal || 60,
      weeklyGoal: profile.weekly_goal || 420
    });
  } catch (err) {
    console.error("Gamification API Error:", err);
    res.status(500).json({ error: 'Failed to retrieve gamification summary.' });
  }
};

// Automatic Badge Evaluation Engine
export async function checkAndAwardBadges(userId) {
  try {
    const rawDb = db.getRawLocalDb();
    const allAchievements = rawDb.achievements || [];
    const unlocked = new Set((rawDb.user_achievements || []).filter(ua => ua.user_id === userId).map(u => u.achievement_id));

    // Gather metrics
    const completedTopics = (rawDb.progress || []).filter(p => p.user_id === userId && p.status === 'completed').length;
    const questionsAsked = (rawDb.recent_activity || []).filter(a => a.user_id === userId && a.type === 'chat').length;
    const studyTimeSeconds = (rawDb.study_sessions || []).filter(s => s.user_id === userId).reduce((acc, s) => acc + (s.duration_seconds || 0), 0);

    for (const ach of allAchievements) {
      if (!unlocked.has(ach.id)) {
        let qual = false;
        if (ach.requirement_type === 'topics_completed' && completedTopics >= ach.requirement_value) qual = true;
        if (ach.requirement_type === 'questions_asked' && questionsAsked >= ach.requirement_value) qual = true;
        if (ach.requirement_type === 'study_time_seconds' && studyTimeSeconds >= ach.requirement_value) qual = true;

        if (qual) {
          rawDb.user_achievements = rawDb.user_achievements || [];
          rawDb.user_achievements.push({
            id: "uach-" + crypto.randomUUID(),
            user_id: userId,
            achievement_id: ach.id,
            unlocked_at: new Date().toISOString()
          });
          db.saveRawLocalDb(rawDb);

          // Emit instant real-time achievement notification
          await EventSystem.emit('ACHIEVEMENT_UNLOCKED', {
            userId,
            title: `Unlocked Badge: ${ach.title} ${ach.icon}`,
            details: { achievement: ach },
            xpAward: ach.xp_reward || 100
          });
        }
      }
    }
  } catch (e) {
    console.error("Badge Check Error:", e);
  }
}

export default {
  getGamificationSummary,
  checkAndAwardBadges
};
