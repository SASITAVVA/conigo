/**
 * CogniPath Intelligent Interactive Study Timer
 * Automatically tracks active student engagement, pauses after 60s of total inactivity,
 * and transmits study session heartbeats to the database without page refreshing.
 */
class StudyTimer {
    constructor() {
        this.isActive = false;
        this.lastInteraction = Date.now();
        this.accumulatedSeconds = 0;
        this.heartbeatThreshold = 30; // Send heartbeat to backend every 30 active seconds
        this.inactivityTimeout = 60000; // 60 seconds
        this.timerInterval = null;
        this.activeSubjectId = 'sub-dsa'; // Default or currently selected learning subject
        this.statusListeners = [];

        this.initListeners();
        this.start();
    }

    initListeners() {
        // Track interactive actions across the document
        const events = ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];
        const handleActivity = () => {
            this.lastInteraction = Date.now();
            if (!this.isActive && document.visibilityState === 'visible') {
                this.resume();
            }
        };

        events.forEach(evt => window.addEventListener(evt, handleActivity, { passive: true }));

        // Track tab visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.pause("Tab Switched");
            } else {
                this.lastInteraction = Date.now();
                this.resume();
            }
        });

        // Ensure closing session is transmitted on unload
        window.addEventListener('beforeunload', () => {
            if (this.accumulatedSeconds > 0) {
                this.sendHeartbeatSync();
            }
        });
    }

    start() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.isActive = true;
        this.notifyStatus("Active 🟢", "study-badge-active");

        this.timerInterval = setInterval(() => {
            if (!this.isActive) return;

            const now = Date.now();
            if (now - this.lastInteraction > this.inactivityTimeout) {
                this.pause("Idle (60s)");
                return;
            }

            this.accumulatedSeconds += 1;
            this.notifySecondTick();

            // Send heartbeat pulse to server
            if (this.accumulatedSeconds >= this.heartbeatThreshold) {
                this.sendHeartbeat();
            }
        }, 1000);
    }

    pause(reason = "Inactive") {
        if (!this.isActive) return;
        this.isActive = false;
        this.notifyStatus(`Paused ⏸ (${reason})`, "study-badge-paused");
        // Flush remaining accumulated seconds
        if (this.accumulatedSeconds > 5) {
            this.sendHeartbeat();
        }
    }

    resume() {
        if (this.isActive) return;
        this.isActive = true;
        this.notifyStatus("Active 🟢", "study-badge-active");
    }

    setSubject(subjectId) {
        if (this.accumulatedSeconds > 0) {
            this.sendHeartbeat(); // send remaining time to previous subject
        }
        this.activeSubjectId = subjectId;
    }

    async sendHeartbeat() {
        if (this.accumulatedSeconds <= 0) return;
        const secondsToSend = this.accumulatedSeconds;
        this.accumulatedSeconds = 0;

        const userId = (window.appState && window.appState.state.userId) ? window.appState.state.userId : '11111111-1111-1111-1111-111111111111';

        try {
            await fetch(`${window.location.origin}/api/study-sessions/heartbeat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    subjectId: this.activeSubjectId,
                    addedSeconds: secondsToSend,
                    activeInteractions: 5
                })
            });
            // Heartbeat succeeds; server will trigger SSE event broadcast to update UI counters!
        } catch (err) {
            console.error("Study heartbeat failed to send:", err);
            // Restore un-sent seconds
            this.accumulatedSeconds += secondsToSend;
        }
    }

    sendHeartbeatSync() {
        const userId = (window.appState && window.appState.state.userId) ? window.appState.state.userId : '11111111-1111-1111-1111-111111111111';
        const url = `${window.location.origin}/api/study-sessions/heartbeat`;
        const payload = JSON.stringify({
            userId,
            subjectId: this.activeSubjectId,
            addedSeconds: this.accumulatedSeconds,
            activeInteractions: 2
        });

        if (navigator.sendBeacon) {
            navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
        }
        this.accumulatedSeconds = 0;
    }

    subscribeStatus(callback) {
        this.statusListeners.push(callback);
        callback(this.currentStatus || "Active 🟢", this.currentStyle || "study-badge-active");
    }

    notifyStatus(text, styleClass) {
        this.currentStatus = text;
        this.currentStyle = styleClass;
        this.statusListeners.forEach(fn => fn(text, styleClass));
        const indicator = document.getElementById('topbar-study-timer');
        if (indicator) {
            indicator.innerHTML = `<span class="study-badge ${styleClass}">${text}</span>`;
        }
    }

    notifySecondTick() {
        // Optimistically increment any UI seconds timer if needed
        const timerDisplay = document.getElementById('live-session-timer');
        if (timerDisplay) {
            const current = parseInt(timerDisplay.getAttribute('data-seconds') || "0", 10) + 1;
            timerDisplay.setAttribute('data-seconds', current);
            const m = Math.floor(current / 60).toString().padStart(2, '0');
            const s = (current % 60).toString().padStart(2, '0');
            timerDisplay.innerText = `${m}:${s}`;
        }
    }
}

// Instantiate global intelligent study timer
window.studyTimer = new StudyTimer();
