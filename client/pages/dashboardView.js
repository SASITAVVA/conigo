/**
 * CogniPath Enterprise Dashboard View
 * Manages real-time data ingestion, widget rendering, and live Event-Stream synchronization.
 */

class DashboardView {
  constructor() {
    this.userId = '11111111-1111-1111-1111-111111111111';
    this.sseSource = null;
    this.init();
  }

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      this.setupLiveSync();
    });
  }

  async fetchDashboardMetrics(userId = this.userId) {
    try {
      const response = await fetch(`/api/dashboard/stats?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        this.renderMetrics(data.stats);
        this.renderActivityFeed(data.recentActivity || []);
        return data;
      }
    } catch (err) {
      console.warn('Dashboard online fetch failed, using state buffer:', err.message);
    }
  }

  renderMetrics(stats) {
    if (!stats) return;
    const studyHoursEl = document.getElementById('stat-study-time');
    const topicsCompletedEl = document.getElementById('stat-topics-completed');
    const streakEl = document.getElementById('stat-streak-days');
    const quizAccuracyEl = document.getElementById('stat-quiz-accuracy');

    if (studyHoursEl) studyHoursEl.textContent = `${(stats.studyTimeSeconds / 3600).toFixed(1)}h`;
    if (topicsCompletedEl) topicsCompletedEl.textContent = stats.topicsCompleted || 0;
    if (streakEl) streakEl.textContent = `${stats.streakDays || 1} Days 🔥`;
    if (quizAccuracyEl) quizAccuracyEl.textContent = `${stats.averageQuizScore || 0}%`;
  }

  renderActivityFeed(activities) {
    const listEl = document.getElementById('activity-feed-list');
    if (!listEl) return;

    const cleanActivities = activities.filter(a => !a.type?.includes('study_time_updated') && !a.title?.includes('Active Study Heartbeat') && !a.title?.includes('Study Heartbeat'));

    if (cleanActivities.length === 0) {
      listEl.innerHTML = `
        <div class="p-6 text-center text-slate-400 bg-slate-800/40 rounded-xl border border-slate-700/50">
          <div class="text-2xl mb-2">🌱</div>
          <div class="font-medium text-slate-300">No recent activities recorded yet.</div>
          <div class="text-xs text-slate-500 mt-1">Begin studying topics, uploading PDFs, or generating quizzes to build your learning footprint!</div>
        </div>
      `;
      return;
    }

    listEl.innerHTML = cleanActivities.slice(0, 8).map(act => `
      <div class="flex items-center gap-4 p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/40 hover:border-indigo-500/30 transition-all">
        <div class="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-base flex-shrink-0">
          ${act.type === 'quiz' ? '🧠' : act.type === 'topic' ? '📖' : act.type === 'upload' ? '📄' : '⚡'}
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium text-slate-200 truncate">${act.title}</div>
          <div class="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
            <span>${(() => { const dt = new Date(act.created_at || act.timestamp || act.date || Date.now()); const vDt = !isNaN(dt) ? dt : new Date(); return vDt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + ' • ' + vDt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }); })()}</span>
            ${act.xp_earned > 0 ? `<span class="text-purple-400 font-semibold">+${act.xp_earned} XP</span>` : ''}
          </div>
        </div>
      </div>
    `).join('');
  }

  setupLiveSync() {
    if (!window.EventSource) return;
    try {
      this.sseSource = new EventSource('/api/events/stream');
      this.sseSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload && payload.type && window.CogniPathToast) {
            if (payload.type === 'STUDY_TIME_UPDATED') {
              // Silently sync metrics without disturbing user focus
              this.fetchDashboardMetrics();
            } else if (payload.type === 'ACTIVITY_TRACKED') {
              this.fetchDashboardMetrics();
            }
          }
        } catch (e) {}
      };
    } catch (e) {
      console.warn("SSE connection uninitialized:", e.message);
    }
  }
}

window.CogniPathDashboard = new DashboardView();
