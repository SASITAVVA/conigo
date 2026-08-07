import { db } from './db.js';
import crypto from 'crypto';

// Pool of connected SSE client response streams
const clients = new Map();

/**
 * Real-Time Event Dispatcher and SSE Manager
 */
export const EventSystem = {
  /**
   * Connect a new frontend client to the real-time event stream
   */
  addClient(clientId, res) {
    clients.set(clientId, res);
    // Send initial connection affirmation packet
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);
    
    reqCleanup(res, clientId);
  },

  /**
   * Remove disconnected client from pool
   */
  removeClient(clientId) {
    clients.delete(clientId);
  },

  /**
   * Broadcast an event payload to all listening clients instantly
   */
  broadcast(eventType, payload) {
    const message = JSON.stringify({ type: eventType, data: payload, timestamp: new Date().toISOString() });
    for (const [clientId, res] of clients.entries()) {
      try {
        res.write(`data: ${message}\n\n`);
      } catch (err) {
        clients.delete(clientId);
      }
    }
  },

  /**
   * Dispatch system event, log to recent activity, award XP if applicable, and broadcast to frontend
   */
  async emit(eventType, { userId, title, details = {}, xpAward = 0, subjectId = null }) {
    if (eventType !== 'STUDY_TIME_UPDATED' && process.env.NODE_ENV === 'development') {
      console.log(`[Event Emitted] ${eventType}: ${title} (+${xpAward} XP)`);
    }

    // 1. Record activity in DB if relevant (exclude background heartbeat pulses)
    if (title && userId && eventType !== 'STUDY_TIME_UPDATED' && !title.includes('Active Study Heartbeat')) {
      const activityRecord = {
        id: "act-" + crypto.randomUUID(),
        user_id: userId,
        type: eventType.toLowerCase(),
        title,
        xp_earned: xpAward,
        created_at: new Date().toISOString()
      };
      await db.insert('recent_activity', activityRecord);
    }

    // 2. Award XP and update levels if xpAward > 0
    if (xpAward > 0 && userId) {
      const rawDb = db.getRawLocalDb();
      const userProfile = rawDb.profiles.find(p => p.user_id === userId);
      if (userProfile) {
        userProfile.xp = (userProfile.xp || 0) + xpAward;
        userProfile.level = Math.floor(userProfile.xp / 300) + 1;
        userProfile.updated_at = new Date().toISOString();
        db.saveRawLocalDb(rawDb);
        
        // Empt extra XP event
        this.broadcast('XP_EARNED', { xpGained: xpAward, totalXp: userProfile.xp, newLevel: userProfile.level });
      }
    }

    // 3. Broadcast real-time update to all clients
    this.broadcast(eventType, { userId, title, details, xpAward, subjectId });
  }
};

function reqCleanup(res, clientId) {
  res.on('close', () => {
    EventSystem.removeClient(clientId);
  });
}
