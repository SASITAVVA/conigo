import { db } from '../services/db.js';

export const activityModel = {
  getRecentActivity(userId, limit = 100) {
    const rawDb = db.getRawLocalDb();
    let activities = rawDb.recent_activity || [];
    if (userId && userId !== '11111111-1111-1111-1111-111111111111') {
      const userSpecific = activities.filter(a => a.userId === userId || a.user_id === userId);
      if (userSpecific.length > 0) return userSpecific.slice(0, limit);
    }
    return activities.slice(0, limit);
  },

  logActivity(activityRecord) {
    const rawDb = db.getRawLocalDb();
    if (!rawDb.recent_activity) rawDb.recent_activity = [];
    rawDb.recent_activity.unshift(activityRecord);
    // Keep max 500 actions
    if (rawDb.recent_activity.length > 500) rawDb.recent_activity.length = 500;
    db.saveRawLocalDb(rawDb);
    return activityRecord;
  },

  getStudySessions(userId) {
    const rawDb = db.getRawLocalDb();
    return (rawDb.study_sessions || []).filter(s => !userId || s.userId === userId || s.user_id === userId);
  }
};

export default activityModel;
