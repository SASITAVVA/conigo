/**
 * CogniPath Enterprise Notification Toast Component
 * Generates custom animated toast alerts with glassmorphic aesthetic styling.
 */

class ToastManager {
  constructor() {
    this.container = null;
    this.initContainer();
  }

  initContainer() {
    document.addEventListener('DOMContentLoaded', () => {
      let cont = document.getElementById('cogni-toast-container');
      if (!cont) {
        cont = document.createElement('div');
        cont.id = 'cogni-toast-container';
        cont.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; gap: 12px; max-width: 380px; pointer-events: none;';
        document.body.appendChild(cont);
      }
      this.container = cont;
    });
  }

  show(message, type = 'info', durationMs = 4000) {
    if (!this.container) {
      this.initContainer();
    }

    const toast = document.createElement('div');
    toast.style.cssText = `
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      border-radius: 12px;
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(16px);
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 1px 1px rgba(255, 255, 255, 0.1);
      border-left: 4px solid #4f46e5;
      color: #f8fafc;
      font-family: inherit;
      font-size: 0.925rem;
      transform: translateX(120%);
      transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease;
      opacity: 0;
    `;

    let icon = 'ℹ️';
    let borderColor = '#4f46e5';
    if (type === 'success') { icon = '✅'; borderColor = '#10b981'; }
    else if (type === 'warning') { icon = '⚠️'; borderColor = '#f59e0b'; }
    else if (type === 'error') { icon = '🚨'; borderColor = '#ef4444'; }
    else if (type === 'xp') { icon = '⚡'; borderColor = '#8b5cf6'; }
    else if (type === 'streak') { icon = '🔥'; borderColor = '#f97316'; }

    toast.style.borderLeftColor = borderColor;
    toast.innerHTML = `
      <span style="font-size: 1.35rem; line-height: 1;">${icon}</span>
      <div style="flex: 1; word-break: break-word;">
        <div style="font-weight: 500; letter-spacing: 0.01em;">${message}</div>
      </div>
      <button onclick="this.parentElement.remove()" style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 1.1rem; padding: 0 4px;">&times;</button>
    `;

    this.container.appendChild(toast);

    // Trigger appear animation
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
    });

    if (durationMs > 0) {
      setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 350);
      }, durationMs);
    }
  }
}

window.CogniPathToast = new ToastManager();
