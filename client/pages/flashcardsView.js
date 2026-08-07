/**
 * CogniPath AI-Powered Active Recall Learning Center (Flashcards View)
 * Interactive spaced repetition review engine with confidence grading and flip transitions.
 */

class FlashcardsView {
  constructor() {
    this.currentIndex = 0;
    this.deck = [];
    this.isFlipped = false;
  }

  async initDeck(userId = '11111111-1111-1111-1111-111111111111') {
    try {
      const res = await fetch(`/api/study-materials/all?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        this.deck = data.flashcards || [];
        this.currentIndex = 0;
        this.renderCurrentCard();
      }
    } catch (e) {
      console.warn("Failed to load flashcard deck:", e.message);
    }
  }

  renderCurrentCard() {
    const cardContainer = document.getElementById('flashcard-deck-viewer');
    if (!cardContainer) return;

    if (this.deck.length === 0) {
      cardContainer.innerHTML = `
        <div class="p-10 text-center max-w-xl mx-auto bg-slate-800/70 border border-slate-700/50 rounded-3xl text-slate-300">
          <div class="text-4xl mb-4">📇</div>
          <h3 class="text-xl font-bold text-white mb-2">No Active Recall Cards Available</h3>
          <p class="text-sm text-slate-400 mb-6">Upload study documents or engage with course topics to automatically generate interactive AI review decks.</p>
          <button onclick="window.CogniPathSidebar.setActiveView('documents')" class="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl shadow-lg transition">Upload Document</button>
        </div>
      `;
      return;
    }

    const card = this.deck[this.currentIndex];
    this.isFlipped = false;

    cardContainer.innerHTML = `
      <div class="max-w-2xl mx-auto flex flex-col items-center">
        <div class="w-full flex justify-between items-center mb-4 text-sm text-slate-400 font-medium px-2">
          <span>Card ${this.currentIndex + 1} of ${this.deck.length}</span>
          <span class="px-3 py-1 bg-slate-800 rounded-full border border-slate-700 text-indigo-400 capitalize">Difficulty: ${card.difficulty_rating || 'normal'}</span>
        </div>
        
        <!-- Interactive Flip Card -->
        <div id="active-recall-card" onclick="window.CogniPathFlashcards.toggleFlip()" class="w-full h-80 bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/60 hover:border-indigo-500/50 rounded-3xl p-8 cursor-pointer shadow-2xl transition-all duration-300 flex flex-col justify-center items-center text-center relative overflow-hidden group">
          <div class="absolute top-4 right-4 text-xs tracking-wider uppercase bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full font-bold border border-indigo-500/20" id="card-side-badge">QUESTION</div>
          <h3 id="card-text-content" class="text-2xl font-bold text-slate-100 max-w-lg leading-relaxed transition-all">${card.question}</h3>
          <div class="absolute bottom-4 text-xs text-slate-400 font-medium group-hover:text-indigo-400 transition">Click anywhere to flip & view answer ✨</div>
        </div>

        <!-- Self-Assessment Action Controls -->
        <div id="card-action-controls" class="w-full flex justify-center gap-4 mt-8 opacity-40 pointer-events-none transition-all duration-300">
          <button onclick="window.CogniPathFlashcards.rateCard('hard')" class="px-6 py-3 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-semibold rounded-2xl transition shadow-lg flex items-center gap-2">
            <span>🔴 Hard (Repeat Soon)</span>
          </button>
          <button onclick="window.CogniPathFlashcards.rateCard('good')" class="px-6 py-3 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 font-semibold rounded-2xl transition shadow-lg flex items-center gap-2">
            <span>🔵 Good (Normal Pace)</span>
          </button>
          <button onclick="window.CogniPathFlashcards.rateCard('easy')" class="px-6 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-semibold rounded-2xl transition shadow-lg flex items-center gap-2">
            <span>🟢 Easy (Mastered)</span>
          </button>
        </div>
      </div>
    `;
  }

  toggleFlip() {
    if (this.deck.length === 0) return;
    const card = this.deck[this.currentIndex];
    const textEl = document.getElementById('card-text-content');
    const badgeEl = document.getElementById('card-side-badge');
    const controlsEl = document.getElementById('card-action-controls');
    const cardBox = document.getElementById('active-recall-card');

    this.isFlipped = !this.isFlipped;

    if (this.isFlipped) {
      textEl.textContent = card.answer;
      textEl.classList.replace('text-slate-100', 'text-indigo-200');
      badgeEl.textContent = 'ANSWER';
      badgeEl.classList.replace('bg-indigo-500/10', 'bg-purple-500/20');
      badgeEl.classList.replace('text-indigo-400', 'text-purple-300');
      cardBox.style.background = 'linear-gradient(135deg, rgba(30, 27, 75, 0.85), rgba(15, 23, 42, 0.95))';
      controlsEl.classList.remove('opacity-40', 'pointer-events-none');
    } else {
      textEl.textContent = card.question;
      textEl.classList.replace('text-indigo-200', 'text-slate-100');
      badgeEl.textContent = 'QUESTION';
      badgeEl.classList.replace('bg-purple-500/20', 'bg-indigo-500/10');
      badgeEl.classList.replace('text-purple-300', 'text-indigo-400');
      cardBox.style.background = '';
    }
  }

  rateCard(rating) {
    if (window.CogniPathToast) {
      const xp = rating === 'easy' ? 15 : 10;
      window.CogniPathToast.show(`Reviewed flashcard (${rating.toUpperCase()}) +${xp} XP`, 'xp', 2000);
    }
    this.nextCard();
  }

  nextCard() {
    if (this.currentIndex < this.deck.length - 1) {
      this.currentIndex++;
      this.renderCurrentCard();
    } else {
      // Completed deck cycle
      const viewer = document.getElementById('flashcard-deck-viewer');
      if (viewer) {
        viewer.innerHTML = `
          <div class="p-10 text-center max-w-xl mx-auto bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/30 rounded-3xl text-white shadow-2xl">
            <div class="text-5xl mb-4">🏆</div>
            <h3 class="text-2xl font-bold mb-2">Active Recall Session Complete!</h3>
            <p class="text-slate-300 mb-6 text-sm">You have reviewed all interactive flashcards in this deck and hardened your long-term memory.</p>
            <button onclick="window.CogniPathFlashcards.initDeck()" class="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 font-bold rounded-2xl transition shadow-lg">Review Again</button>
          </div>
        `;
      }
    }
  }
}

window.CogniPathFlashcards = new FlashcardsView();
