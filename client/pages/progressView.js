/**
 * CogniPath Enterprise Progress Page View
 * Visualizes curriculum topic completion rates and mastery percentages without using dummy data.
 */

class ProgressView {
  constructor() {
    this.userId = '11111111-1111-1111-1111-111111111111';
  }

  async loadAndRender(userId = this.userId) {
    const container = document.getElementById('progress-view-container') || document.getElementById('progress-table-body');
    if (!container) return;

    try {
      const res = await fetch(`/api/progress/summary?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        this.renderSubjectProgress(data.subjects || [], data.progress || []);
      }
    } catch (err) {
      console.warn("Failed loading progress summary:", err.message);
    }
  }

  renderSubjectProgress(subjects, progressList) {
    const container = document.getElementById('subjects-progress-grid');
    if (!container) return;

    if (subjects.length === 0) {
      container.innerHTML = `
        <div class="col-span-full p-8 text-center bg-slate-800/40 rounded-2xl border border-slate-700/50 text-slate-400">
          <h3 class="text-lg font-semibold text-slate-200">No Curriculum Progress Yet</h3>
          <p class="text-sm text-slate-400 mt-1">Start engaging with course lessons and practice quizzes to unlock detailed mastery breakdowns.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = subjects.map(sub => {
      const pct = sub.total_topics > 0 ? Math.min(100, Math.round((sub.completed_topics / sub.total_topics) * 100)) : 0;
      return `
        <div class="p-5 bg-slate-800/60 backdrop-blur rounded-2xl border border-slate-700/50 hover:border-indigo-500/40 transition shadow-lg">
          <div class="flex items-center justify-between mb-3">
            <h4 class="font-semibold text-slate-100 text-lg flex items-center gap-2">
              <span class="w-3 h-3 rounded-full" style="background: ${sub.icon_color || '#4f46e5'}"></span>
              ${sub.title}
            </h4>
            <span class="text-sm font-bold px-2.5 py-1 bg-slate-900 rounded-lg text-indigo-400 border border-indigo-500/20">${pct}% Mastery</span>
          </div>
          <div class="w-full bg-slate-700/60 h-2.5 rounded-full overflow-hidden mb-3">
            <div class="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500" style="width: ${pct}%"></div>
          </div>
          <div class="flex justify-between items-center text-xs text-slate-400">
            <span>Completed: ${sub.completed_topics || 0} / ${sub.total_topics} topics</span>
            <span>Study time: ${(sub.study_time_seconds ? (sub.study_time_seconds/3600).toFixed(1) : '0')}h</span>
          </div>
        </div>
      `;
    }).join('');
  }
}

window.CogniPathProgress = new ProgressView();
