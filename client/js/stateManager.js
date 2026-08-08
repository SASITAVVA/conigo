class StateManager {
    constructor() {
        const savedUser = localStorage.getItem('cognipath_user');
        const parsedUser = savedUser ? JSON.parse(savedUser) : null;

        this.state = {
            dashboard: null,
            progress: null,
            analytics: null,
            gamification: null,
            studyMaterials: null,
            courses: null,
            admin: null,
            user: parsedUser || {
              id: '11111111-1111-1111-1111-111111111111',
              name: 'Alex Rivera',
              email: 'alex.student@cognipath.ai',
              role: 'student',
              xp: 1450,
              level: 5,
              photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
            },
            userId: parsedUser ? (parsedUser.id || parsedUser.user_id) : '11111111-1111-1111-1111-111111111111',
            token: localStorage.getItem('cognipath_token') || null
        };
        this.listeners = [];
        this.isFetching = false;
        this.eventSource = null;

        this.initSSE();
        this.initSupabaseAuth();
    }

    async initSupabaseAuth() {
        if (!window.supabase) return;
        
        // Initial session check (in case of OAuth redirect or page reload)
        const { data: { session } } = await window.supabase.auth.getSession();
        if (session) {
            // We only sync if we haven't already locally authenticated with this token
            if (this.state.token !== session.access_token) {
                await this.syncSessionWithBackend(session).catch(e => console.warn(e));
            }
        }

        // Listen for OAuth redirects or other auth events globally
        window.supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
                if (this.state.token !== session.access_token) {
                    await this.syncSessionWithBackend(session).catch(e => console.warn(e));
                }
            } else if (event === 'SIGNED_OUT') {
                this.logout();
            }
        });
    }

    // Connect to real-time Server-Sent Events stream for instant UI updates
    initSSE() {
        if (typeof EventSource === 'undefined') return;
        try {
            this.eventSource = new EventSource(`${window.location.origin}/api/events/stream`);
            this.eventSource.onmessage = (e) => {
                try {
                    const eventData = JSON.parse(e.data);
                    if (eventData && eventData.type !== 'CONNECTED') {
                        this.handleRealtimeEvent(eventData.type, eventData.data);
                    }
                } catch (err) {
                    console.error("SSE message parse error:", err);
                }
            };
            this.eventSource.onerror = (e) => {
                // Reconnect will happen automatically by EventSource standard
            };
        } catch(e) {
            console.warn("SSE not available in offline preview mode.");
        }
    }

    handleRealtimeEvent(eventType, payload) {
        if (window.DEBUG_TELEMETRY) {
            console.debug(`[Realtime Event Received] ${eventType}`, payload);
        }

        // Display interactive toast banner for unlocked achievements
        if (eventType === 'ACHIEVEMENT_UNLOCKED') {
            this.showNotificationToast("🎉 Badge Unlocked!", payload.title, "achievement-toast");
        } else if (payload && payload.xpAward > 0) {
            this.showXPToast(`+${payload.xpAward} XP`, payload.title || "Activity completed!");
        }

        // Instantly sync dynamic data to reflect changes across all tabs without page reload
        this.refreshAll(true);
    }

    showNotificationToast(title, message, styleClass = "") {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = 'position: fixed; bottom: 24px; right: 24px; z-index: 9999; display: flex; flex-direction: column; gap: 10px; pointer-events: none;';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `surface-card fade-in-up ${styleClass}`;
        toast.style.cssText = 'padding: 1rem 1.25rem; min-width: 280px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); border-left: 4px solid var(--primary); pointer-events: auto; display: flex; flex-direction: column; gap: 4px; border-radius: 12px; background: var(--card-bg, #1e1e24); color: var(--text, #fff);';
        toast.innerHTML = `
            <strong style="font-size: 0.95rem; color: #6366f1;">${title}</strong>
            <span style="font-size: 0.85rem; color: #a1a1aa;">${message}</span>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.4s ease';
            setTimeout(() => toast.remove(), 400);
        }, 4500);
    }

    showXPToast(xpText, reason) {
        let el = document.getElementById('xp-floating-popup');
        if (!el) {
            el = document.createElement('div');
            el.id = 'xp-floating-popup';
            el.style.cssText = 'position: fixed; top: 80px; right: 30px; z-index: 9998; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; padding: 0.6rem 1rem; border-radius: 20px; font-weight: bold; box-shadow: 0 4px 15px rgba(79, 70, 229, 0.5); transform: translateY(-10px); opacity: 0; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); pointer-events: none; display: flex; align-items: center; gap: 8px;';
            document.body.appendChild(el);
        }
        el.innerHTML = `<span style="background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 10px; font-size: 0.85rem;">${xpText}</span> <span style="font-size: 0.85rem; font-weight: normal;">${reason}</span>`;
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(-10px)';
        }, 3500);
    }

    subscribe(listener) {
        this.listeners.push(listener);
        if (this.state.dashboard || this.state.progress) {
            listener(this.state);
        }
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(listener => listener(this.state));
        this.updateTopBarUI();
    }

    updateTopBarUI() {
        // Automatically sync topbar name, XP, coins, and level
        const xpSpan = document.getElementById('topbar-user-xp');
        const levelSpan = document.getElementById('topbar-user-level');
        const coinSpan = document.getElementById('topbar-user-coins');
        const nameSpan = document.getElementById('topbar-user-name');
        const roleBadge = document.getElementById('topbar-user-role');

        if (this.state.gamification) {
            if (xpSpan) this.animateCounter(xpSpan, parseInt(xpSpan.innerText || "0", 10), this.state.gamification.xp || 0);
            if (levelSpan) levelSpan.innerText = `Lvl ${this.state.gamification.level || 1}`;
            if (coinSpan) coinSpan.innerText = `${this.state.gamification.coins || 0} 💎`;
        }
        if (this.state.user && nameSpan) {
            nameSpan.innerText = this.state.user.name;
        }
        if (roleBadge) {
            const isAdmin = this.state.user && this.state.user.role === 'admin';
            roleBadge.style.display = isAdmin ? 'inline-block' : 'none';
            const adminLink = document.querySelector('a[href="#page-admin"]');
            if (adminLink) adminLink.style.display = isAdmin ? 'flex' : 'none';
        }
    }

    // Smooth numerical counting micro-interaction animation
    animateCounter(element, start, end, duration = 600) {
        if (!element || start === end || isNaN(start) || isNaN(end)) {
            if (element && !isNaN(end)) element.innerText = end;
            return;
        }
        const startTime = performance.now();
        const diff = end - start;
        const step = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const value = Math.floor(start + diff * progress);
            element.innerText = value;
            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                element.innerText = end;
            }
        };
        requestAnimationFrame(step);
    }

    async refreshAll(silent = false) {
        if (this.isFetching && !silent) return;
        this.isFetching = true;
        try {
            await Promise.all([
                this.fetchDashboard(),
                this.fetchProgress(),
                this.fetchAnalytics(),
                this.fetchGamification(),
                this.fetchStudyMaterials(),
                this.fetchCourses()
            ]);
            if (this.state.user && this.state.user.role === 'admin') {
                await this.fetchAdmin();
            }
            this.notify();
        } catch (error) {
            console.error("Failed to refresh real-time state:", error);
        } finally {
            this.isFetching = false;
        }
    }

    async authenticatedFetch(url, options = {}) {
        const headers = { ...options.headers };
        if (this.state.token) {
            headers['Authorization'] = `Bearer ${this.state.token}`;
        }
        return fetch(url, { ...options, headers });
    }

    async fetchDashboard() {
        try {
            const res = await this.authenticatedFetch(`${window.location.origin}/api/dashboard/stats?userId=${this.state.userId}`);
            if (!res.ok) return;
            this.state.dashboard = await res.json();
        } catch (error) {
            console.error("fetchDashboard err:", error);
        }
    }

    async fetchProgress() {
        try {
            const res = await this.authenticatedFetch(`${window.location.origin}/api/progress/summary?userId=${this.state.userId}`);
            if (!res.ok) return;
            this.state.progress = await res.json();
        } catch (error) {
            console.error("fetchProgress err:", error);
        }
    }

    async fetchAnalytics() {
        try {
            const res = await this.authenticatedFetch(`${window.location.origin}/api/analytics/summary?userId=${this.state.userId}`);
            if (!res.ok) return;
            this.state.analytics = await res.json();
        } catch (error) {
            console.error("fetchAnalytics err:", error);
        }
    }

    async fetchGamification() {
        try {
            const res = await this.authenticatedFetch(`${window.location.origin}/api/gamification/summary?userId=${this.state.userId}`);
            if (!res.ok) return;
            this.state.gamification = await res.json();
        } catch (error) {
            console.error("fetchGamification err:", error);
        }
    }

    async fetchStudyMaterials() {
        try {
            const res = await this.authenticatedFetch(`${window.location.origin}/api/study-materials/all?userId=${this.state.userId}`);
            if (!res.ok) return;
            this.state.studyMaterials = await res.json();
        } catch (error) {
            console.error("fetchStudyMaterials err:", error);
        }
    }

    async fetchCourses() {
        try {
            const res = await this.authenticatedFetch(`${window.location.origin}/api/courses/all?userId=${this.state.userId}`);
            if (!res.ok) return;
            this.state.courses = await res.json();
        } catch (error) {
            console.error("fetchCourses err:", error);
        }
    }

    async fetchAdmin() {
        try {
            const res = await this.authenticatedFetch(`${window.location.origin}/api/admin/summary?userId=${this.state.userId}`);
            if (!res.ok) return;
            this.state.admin = await res.json();
        } catch (error) {
            console.error("fetchAdmin err:", error);
        }
    }

    async login(email, password, rememberMe = true) {
        try {
            const { data, error } = await window.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw new Error(error.message);
            if (!data.session) throw new Error('Login failed. No session returned.');

            return await this.syncSessionWithBackend(data.session);
        } catch (err) {
            console.error("Supabase login error:", err);
            throw new Error(err.message || 'Login failed.');
        }
    }

    async register(name, email, password, learningGoal) {
        try {
            const { data, error } = await window.supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: name,
                        name: name,
                        learning_goal: learningGoal
                    }
                }
            });

            if (error) throw new Error(error.message);

            if (!data.session) {
                throw new Error("Registration successful. Please check your email to confirm your account.");
            }

            return await this.syncSessionWithBackend(data.session);
        } catch (err) {
            console.error("Supabase register error:", err);
            throw new Error(err.message || 'Registration failed.');
        }
    }

    async syncSessionWithBackend(session) {
        try {
            const res = await fetch(`${window.location.origin}/api/auth/sync-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to sync session with backend.');
            }

            const data = await res.json();
            
            this.setUserSession(data.user, session.access_token);
            await this.refreshAll();
            
            return data.user;
        } catch (err) {
            throw new Error('Session synchronization failed: ' + err.message);
        }
    }

    setUserSession(user, token) {
        this.state.user = user;
        this.state.userId = user.id || user.user_id;
        this.state.token = token;
        localStorage.setItem('cognipath_user', JSON.stringify(user));
        if (token) localStorage.setItem('cognipath_token', token);
        this.notify();
    }

    async logout() {
        if (window.supabase) {
            await window.supabase.auth.signOut();
        }
        localStorage.removeItem('cognipath_user');
        localStorage.removeItem('cognipath_token');
        this.state.user = null;
        this.state.userId = '11111111-1111-1111-1111-111111111111';
        this.state.token = null;
        await this.refreshAll();
        window.location.hash = '#page-login';
    }
}

// Global instance
window.appState = new StateManager();
