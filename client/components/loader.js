/**
 * CogniPath Enterprise Neural Loader Component
 * Implements modern futuristic loading transitions and strictly enforces the mandatory
 * minimum 5-second loading animation constraint requested by the user during sign-in/initialization.
 */

class NeuralLoaderComponent {
  constructor() {
    this.MINIMUM_LOGIN_ANIMATION_MS = 5000; // Mandatory neural link animation constraint
    this.loaderEl = null;
    this.init();
  }

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      this.loaderEl = document.getElementById('neural-loading-overlay') || document.querySelector('.app-loader-container');
    });
  }

  /**
   * Displays neural login animation for AT LEAST 5 seconds regardless of network speed.
   * @param {string} statusText - Text to display during animation (e.g. "Establishing Neural Connection...")
   * @param {Function} callback - Callback executed after the 5s mandatory duration completes.
   */
  async runLoginNeuralAnimation(statusText = "Synchronizing Neural Learning Matrix...", callback = () => {}) {
    const startTime = Date.now();
    this.show(statusText);

    if (window.CogniPathToast) {
      window.CogniPathToast.show("Initializing active learning telemetry & neural embeddings...", "xp", 3500);
    }

    const elapsed = Date.now() - startTime;
    const remainingTime = Math.max(0, this.MINIMUM_LOGIN_ANIMATION_MS - elapsed);

    // Strictly enforce minimum 5 second display constraint
    await new Promise(resolve => setTimeout(resolve, remainingTime));

    this.hide();
    if (typeof callback === 'function') {
      callback();
    }
  }

  show(text = "Loading Learning Matrix...") {
    if (!this.loaderEl) {
      const el = document.createElement('div');
      el.id = 'neural-loading-overlay';
      el.style.cssText = `
        position: fixed; inset: 0; z-index: 99999;
        background: rgba(8, 11, 22, 0.95); backdrop-filter: blur(24px);
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        color: #f8fafc; font-family: inherit; transition: opacity 0.4s ease;
      `;
      el.innerHTML = `
        <div style="position: relative; width: 96px; height: 96px; margin-bottom: 28px;">
          <div style="position: absolute; inset: 0; border-radius: 50%; border: 3px solid transparent; border-top-color: #6366f1; border-right-color: #8b5cf6; animation: spin 1.2s linear infinite;"></div>
          <div style="position: absolute; inset: 12px; border-radius: 50%; border: 3px solid transparent; border-bottom-color: #ec4899; border-left-color: #3b82f6; animation: spin 0.8s linear reverse infinite;"></div>
          <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 2rem;">⚡</div>
        </div>
        <div id="neural-loader-text" style="font-size: 1.25rem; font-weight: 600; letter-spacing: 0.04em; background: linear-gradient(135deg, #a5b4fc, #f472b6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">${text}</div>
        <div style="margin-top: 12px; font-size: 0.85rem; color: #64748b; font-family: monospace;">[NEURAL_LINK_LATENCY: 4ms | RAG_EMBEDDINGS: ONLINE]</div>
        <style> @keyframes spin { to { transform: rotate(360deg); } } </style>
      `;
      document.body.appendChild(el);
      this.loaderEl = el;
    } else {
      const textEl = document.getElementById('neural-loader-text');
      if (textEl) textEl.textContent = text;
      this.loaderEl.style.display = 'flex';
      this.loaderEl.style.opacity = '1';
    }
  }

  hide() {
    if (this.loaderEl) {
      this.loaderEl.style.opacity = '0';
      setTimeout(() => {
        if (this.loaderEl) this.loaderEl.style.display = 'none';
      }, 400);
    }
  }
}

window.CogniPathLoader = new NeuralLoaderComponent();
