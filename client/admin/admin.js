/* ════════════════════════════════════════════════
   CONIGO Admin Panel — JavaScript
   ════════════════════════════════════════════════ */

const API = '/api/admin';
let adminToken = localStorage.getItem('admin_token') || '';
let adminEmail = localStorage.getItem('admin_email') || '';
let currentSection = 'dashboard';
let usersState = { page: 1, limit: 20, search: '', status: '', sort: 'created_at', order: 'desc', total: 0, pages: 0 };
let logsState  = { page: 1, limit: 50, action_type: '', user_id: '', from: '', to: '' };
let userCharts = {};
let selectedUserId = null;

// ─── API HELPERS ─────────────────────────────────────────────────────────────
const apiFetch = async (path, opts = {}) => {
    const res = await fetch(API + path, {
        ...opts,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
            ...(opts.headers || {})
        }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
};

// ─── TOAST ────────────────────────────────────────────────────────────────────
const toast = (msg, type = 'info', duration = 3500) => {
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span>${icons[type] || '•'}</span> ${msg}`;
    document.getElementById('toast-container').appendChild(el);
    setTimeout(() => el.remove(), duration);
};

// ─── CONFIRM DIALOG ──────────────────────────────────────────────────────────
const confirm = (title, msg, onConfirm, danger = true) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.innerHTML = `
        <div class="confirm-dialog">
            <div class="confirm-icon">${danger ? '⚠️' : '❓'}</div>
            <h3>${title}</h3>
            <p>${msg}</p>
            <div class="confirm-actions">
                <button class="btn btn-secondary w-full" id="confirmCancel">Cancel</button>
                <button class="btn ${danger ? 'btn-danger' : 'btn-primary'} w-full" id="confirmOk">Confirm</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#confirmCancel').onclick = () => overlay.remove();
    overlay.querySelector('#confirmOk').onclick = () => { overlay.remove(); onConfirm(); };
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
};

// ─── FORMAT HELPERS ───────────────────────────────────────────────────────────
const fmt = {
    date: d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
    datetime: d => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—',
    num: n => n?.toLocaleString() || '0',
    timeAgo: d => {
        if (!d) return '—';
        const secs = Math.floor((Date.now() - new Date(d)) / 1000);
        if (secs < 60) return 'just now';
        if (secs < 3600) return Math.floor(secs/60) + 'm ago';
        if (secs < 86400) return Math.floor(secs/3600) + 'h ago';
        if (secs < 604800) return Math.floor(secs/86400) + 'd ago';
        return fmt.date(d);
    },
    initials: name => name ? name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase() : '?',
    statusBadge: s => {
        if (!s) return `<span class="badge badge-inactive">Unknown</span>`;
        if (s.toLowerCase() === 'active') return `<span class="badge badge-active">Active</span>`;
        return `<span class="badge badge-inactive">${s}</span>`;
    },
    logBadge: type => {
        if (!type) return `<span class="log-type-badge badge-info">unknown</span>`;
        const t = type.toLowerCase();
        if (t.includes('login')) return `<span class="log-type-badge badge-active">LOGIN</span>`;
        if (t.includes('quiz')) return `<span class="log-type-badge badge-warning">QUIZ</span>`;
        if (t.includes('note')) return `<span class="log-type-badge badge-info">NOTE</span>`;
        if (t.includes('chat') || t.includes('ai')) return `<span class="log-type-badge badge-primary">AI</span>`;
        if (t.includes('pdf') || t.includes('upload') || t.includes('document')) return `<span class="log-type-badge badge-admin">PDF</span>`;
        if (t.includes('flash')) return `<span class="log-type-badge badge-success">FLASH</span>`;
        if (t.includes('delete')) return `<span class="log-type-badge badge-danger">DELETE</span>`;
        return `<span class="log-type-badge badge-inactive">${type.slice(0,12)}</span>`;
    }
};

// ─── AUTH ─────────────────────────────────────────────────────────────────────
const checkAuth = () => {
    if (adminToken) {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('adminApp').classList.remove('hidden');
        document.getElementById('adminEmailDisplay').textContent = adminEmail;
        document.getElementById('adminInitials').textContent = adminEmail.slice(0,2).toUpperCase();
        loadSection('dashboard');
    } else {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('adminApp').classList.add('hidden');
    }
};

document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const errEl = document.getElementById('loginError');
    btn.disabled = true;
    btn.textContent = 'Logging in…';
    errEl.style.display = 'none';
    try {
        const { token, email } = await apiFetch('/login', {
            method: 'POST',
            headers: { 'Authorization': undefined },
            body: JSON.stringify({
                email: document.getElementById('loginEmail').value,
                password: document.getElementById('loginPassword').value
            })
        });
        adminToken = token;
        adminEmail = email;
        localStorage.setItem('admin_token', token);
        localStorage.setItem('admin_email', email);
        checkAuth();
    } catch (err) {
        errEl.style.display = 'block';
        errEl.textContent = err.message || 'Login failed. Check your credentials.';
    }
    btn.disabled = false;
    btn.textContent = 'Login to Admin Panel';
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    confirm('Logout', 'Are you sure you want to logout from the admin panel?', () => {
        adminToken = '';
        adminEmail = '';
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_email');
        checkAuth();
        toast('Logged out successfully.', 'info');
    }, false);
});

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const section = item.dataset.section;
        if (section) loadSection(section);
    });
});

const loadSection = (section) => {
    currentSection = section;
    document.querySelectorAll('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.section === section));
    const titles = {
        dashboard: 'Dashboard Overview',
        users: 'User Management',
        logs: 'Activity Logs',
        content: 'Content Overview',
    };
    document.getElementById('pageTitle').textContent = titles[section] || section;
    const area = document.getElementById('contentArea');
    area.innerHTML = '';

    if (section === 'dashboard') renderDashboard();
    else if (section === 'users') renderUsers();
    else if (section === 'logs') renderLogs();
    else if (section === 'content') renderContent();
};

// ═══════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════
const renderDashboard = async () => {
    const area = document.getElementById('contentArea');
    area.innerHTML = `
        <div class="section-header fade-in">
            <h2>Platform Overview</h2>
            <p>Real-time statistics from the CONIGO database</p>
        </div>
        <div id="dashSkeleton" class="stat-grid">
            ${Array(8).fill('<div class="stat-card"><div class="skeleton skeleton-line" style="width:60%;height:40px;margin-bottom:8px"></div><div class="skeleton skeleton-line" style="width:80%"></div></div>').join('')}
        </div>
        <div id="dashStats" class="hidden"></div>
        <div id="dashCharts" class="hidden charts-grid">
            <div class="chart-card">
                <div class="chart-card-header">
                    <div><div class="chart-title">User Growth</div><div class="chart-subtitle">New registrations — last 30 days</div></div>
                </div>
                <div class="chart-container"><canvas id="growthChart"></canvas></div>
            </div>
            <div class="chart-card">
                <div class="chart-card-header">
                    <div><div class="chart-title">Daily Active Users</div><div class="chart-subtitle">Unique active users — last 14 days</div></div>
                </div>
                <div class="chart-container"><canvas id="dauChart"></canvas></div>
            </div>
        </div>
        <div id="dashFeatureCard" class="hidden chart-card" style="margin-bottom:1.5rem">
            <div class="chart-card-header">
                <div><div class="chart-title">Feature Usage Breakdown</div><div class="chart-subtitle">All-time activity distribution</div></div>
            </div>
            <div class="chart-container" style="height:260px"><canvas id="featureChart"></canvas></div>
        </div>`;

    try {
        const { stats, charts } = await apiFetch('/stats');

        document.getElementById('dashSkeleton').classList.add('hidden');
        const statsEl = document.getElementById('dashStats');
        statsEl.classList.remove('hidden');
        statsEl.className = 'stat-grid fade-in';

        const cards = [
            { label: 'Total Users', value: stats.totalUsers, sub: `+${stats.newThisMonth} this month`, icon: '👥', color: 'var(--primary)', trend: stats.userGrowthRate, bg: 'var(--primary-glow)' },
            { label: 'Active Users', value: stats.activeUsers, sub: `${Math.round(stats.activeUsers/Math.max(stats.totalUsers,1)*100)}% of total`, icon: '✅', color: 'var(--success)', bg: 'rgba(16,185,129,0.12)' },
            { label: 'Inactive Users', value: stats.inactiveUsers, sub: 'Deactivated accounts', icon: '⏸️', color: 'var(--warning)', bg: 'rgba(245,158,11,0.12)' },
            { label: 'New Today', value: stats.newToday, sub: `+${stats.newThisWeek} this week`, icon: '🆕', color: 'var(--info)', bg: 'rgba(6,182,212,0.12)' },
            { label: 'Flashcards', value: stats.totalFlashcards, sub: `+${stats.fcThisMonth} this month`, icon: '🃏', color: 'var(--secondary)', bg: 'rgba(139,92,246,0.12)' },
            { label: 'PDFs Uploaded', value: stats.totalPdfs, sub: 'Unique documents', icon: '📄', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
            { label: 'AI Conversations', value: stats.totalAI, sub: 'Total chat interactions', icon: '🤖', color: 'var(--primary)', bg: 'var(--primary-glow)' },
            { label: 'Quizzes Generated', value: stats.totalQuizzes, sub: 'Auto-generated quizzes', icon: '📝', color: 'var(--success)', bg: 'rgba(16,185,129,0.12)' },
            { label: 'Notes Created', value: stats.totalNotes, sub: 'Study notes logged', icon: '📓', color: 'var(--info)', bg: 'rgba(6,182,212,0.12)' },
            { label: 'Study Hours', value: stats.totalStudyHours + 'h', sub: 'Total platform study time', icon: '⏱️', color: 'var(--warning)', bg: 'rgba(245,158,11,0.12)' },
        ];

        statsEl.innerHTML = cards.map(c => `
            <div class="stat-card" style="--card-color:${c.color}">
                <div class="stat-card-top">
                    <div class="stat-icon" style="background:${c.bg}; color:${c.color}; font-size:1.1rem">${c.icon}</div>
                    ${c.trend !== undefined ? `<span class="stat-badge ${c.trend >= 0 ? 'up' : 'down'}">${c.trend >= 0 ? '↑' : '↓'} ${Math.abs(c.trend)}%</span>` : ''}
                </div>
                <div class="stat-value">${fmt.num(c.value)}</div>
                <div class="stat-label">${c.label}</div>
                <div class="stat-sub">${c.sub}</div>
            </div>`).join('');

        // Charts
        document.getElementById('dashCharts').classList.remove('hidden');
        document.getElementById('dashFeatureCard').classList.remove('hidden');

        const chartDefaults = {
            color: '#94a3b8',
            plugins: { legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } }, tooltip: { backgroundColor: '#1a2235', titleColor: '#f8fafc', bodyColor: '#94a3b8', borderColor: 'rgba(255,255,255,0.07)', borderWidth: 1 } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } } },
                y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } } }
            }
        };

        // Growth chart
        const growthLabels = charts.growthChart.map(d => d.date.slice(5));
        const growthData = charts.growthChart.map(d => d.count);
        new Chart(document.getElementById('growthChart'), {
            type: 'line',
            data: {
                labels: growthLabels,
                datasets: [{ label: 'New Users', data: growthData, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.08)', fill: true, tension: 0.4, pointRadius: 2 }]
            },
            options: { ...chartDefaults, responsive: true, maintainAspectRatio: false }
        });

        // DAU chart
        const dauLabels = charts.dauChart.map(d => d.date.slice(5));
        const dauData = charts.dauChart.map(d => d.count);
        new Chart(document.getElementById('dauChart'), {
            type: 'bar',
            data: {
                labels: dauLabels,
                datasets: [{ label: 'Active Users', data: dauData, backgroundColor: 'rgba(16,185,129,0.5)', borderColor: '#10b981', borderWidth: 1, borderRadius: 4 }]
            },
            options: { ...chartDefaults, responsive: true, maintainAspectRatio: false }
        });

        // Feature usage donut chart
        const featureEntries = Object.entries(charts.featureUsage).sort((a,b) => b[1]-a[1]).slice(0,8);
        const featureColors = ['#6366f1','#10b981','#f59e0b','#06b6d4','#8b5cf6','#ef4444','#f97316','#64748b'];
        new Chart(document.getElementById('featureChart'), {
            type: 'doughnut',
            data: {
                labels: featureEntries.map(([k]) => k.replace(/_/g,' ').toUpperCase()),
                datasets: [{ data: featureEntries.map(([,v]) => v), backgroundColor: featureColors, borderColor: '#1a2235', borderWidth: 2 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, padding: 12 } }, tooltip: { backgroundColor: '#1a2235', titleColor: '#f8fafc', bodyColor: '#94a3b8', borderColor: 'rgba(255,255,255,0.07)', borderWidth: 1 } } }
        });

    } catch (err) {
        toast('Failed to load dashboard: ' + err.message, 'error');
        document.getElementById('dashSkeleton').innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h4>Failed to load stats</h4><p>${err.message}</p></div>`;
    }
};

// ═══════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════
const renderUsers = async () => {
    const area = document.getElementById('contentArea');
    area.innerHTML = `
        <div class="section-header fade-in">
            <h2>User Management</h2>
            <p>View, search, filter, and manage all registered users</p>
        </div>
        <div class="table-card fade-in">
            <div class="table-header">
                <div class="table-title">All Users <span id="userTotalBadge" class="badge badge-info" style="margin-left:0.5rem"></span></div>
                <div class="table-actions">
                    <input class="search-input" id="userSearch" placeholder="Search by name or email…" value="${usersState.search}">
                    <select class="filter-select" id="userStatusFilter">
                        <option value="">All Status</option>
                        <option value="Active" ${usersState.status==='Active'?'selected':''}>Active</option>
                        <option value="Inactive" ${usersState.status==='Inactive'?'selected':''}>Inactive</option>
                    </select>
                    <select class="filter-select" id="userSortFilter">
                        <option value="created_at" ${usersState.sort==='created_at'?'selected':''}>Sort: Registered</option>
                        <option value="last_login_at" ${usersState.sort==='last_login_at'?'selected':''}>Sort: Last Login</option>
                        <option value="full_name" ${usersState.sort==='full_name'?'selected':''}>Sort: Name</option>
                    </select>
                    <select class="filter-select" id="userOrderFilter">
                        <option value="desc" ${usersState.order==='desc'?'selected':''}>Newest First</option>
                        <option value="asc" ${usersState.order==='asc'?'selected':''}>Oldest First</option>
                    </select>
                </div>
            </div>
            <div id="usersTableWrap">
                ${renderUsersSkeleton()}
            </div>
            <div class="pagination" id="usersPagination"></div>
        </div>`;

    // Event listeners for filters
    let searchTimeout;
    document.getElementById('userSearch').addEventListener('input', e => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            usersState.search = e.target.value;
            usersState.page = 1;
            fetchUsers();
        }, 400);
    });
    ['userStatusFilter', 'userSortFilter', 'userOrderFilter'].forEach(id => {
        document.getElementById(id).addEventListener('change', () => {
            usersState.status = document.getElementById('userStatusFilter').value;
            usersState.sort = document.getElementById('userSortFilter').value;
            usersState.order = document.getElementById('userOrderFilter').value;
            usersState.page = 1;
            fetchUsers();
        });
    });

    fetchUsers();
};

const renderUsersSkeleton = () => {
    return `<table><thead><tr><th>User</th><th>Status</th><th>Registered</th><th>Last Login</th><th>Notes</th><th>Flashcards</th><th>PDFs</th><th>AI Chats</th><th>Actions</th></tr></thead><tbody>
        ${Array(8).fill(`<tr><td><div class="skeleton-row"><div class="skeleton skeleton-circle"></div><div style="flex:1"><div class="skeleton skeleton-line" style="width:60%;margin-bottom:4px"></div><div class="skeleton skeleton-line" style="width:40%"></div></div></div></td>${Array(7).fill('<td><div class="skeleton skeleton-line" style="width:60%"></div></td>').join('')}<td></td></tr>`).join('')}
    </tbody></table>`;
};

const fetchUsers = async () => {
    const wrap = document.getElementById('usersTableWrap');
    if (!wrap) return;
    wrap.innerHTML = renderUsersSkeleton();
    try {
        const params = new URLSearchParams({
            search: usersState.search,
            status: usersState.status,
            sort: usersState.sort,
            order: usersState.order,
            page: usersState.page,
            limit: usersState.limit
        });
        const { users, total, pages } = await apiFetch('/users?' + params);
        usersState.total = total;
        usersState.pages = pages;

        const badge = document.getElementById('userTotalBadge');
        if (badge) badge.textContent = fmt.num(total) + ' users';

        if (!users || users.length === 0) {
            wrap.innerHTML = `<div class="empty-state"><div class="empty-icon">👤</div><h4>No users found</h4><p>Try adjusting your search or filters.</p></div>`;
        } else {
            wrap.innerHTML = `<table>
                <thead><tr>
                    <th>User</th><th>Status</th><th>Role</th>
                    <th class="sortable" data-col="created_at">Registered ↕</th>
                    <th class="sortable" data-col="last_login_at">Last Login ↕</th>
                    <th>Notes</th><th>Flashcards</th><th>PDFs</th><th>AI Chats</th><th>Actions</th>
                </tr></thead>
                <tbody>${users.map(u => `
                <tr>
                    <td>
                        <div class="td-user">
                            <div class="user-avatar-sm">${fmt.initials(u.full_name || u.email)}</div>
                            <div>
                                <div class="td-user-name">${u.full_name || '—'}</div>
                                <div class="td-user-email">${u.email || '—'}</div>
                            </div>
                        </div>
                    </td>
                    <td>${fmt.statusBadge(u.account_status)}</td>
                    <td><span class="badge ${u.role === 'admin' ? 'badge-admin' : 'badge-inactive'}">${u.role || 'student'}</span></td>
                    <td class="text-secondary fs-sm">${fmt.date(u.created_at)}</td>
                    <td class="text-secondary fs-sm">${fmt.timeAgo(u.last_login_at)}</td>
                    <td class="fw-600">${fmt.num(u.notes)}</td>
                    <td class="fw-600">${fmt.num(u.flashcards)}</td>
                    <td class="fw-600">${fmt.num(u.pdfs)}</td>
                    <td class="fw-600">${fmt.num(u.aiConversations)}</td>
                    <td>
                        <div class="actions-cell">
                            <button class="action-btn view" onclick="viewUser('${u.id}')" title="View Profile">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            </button>
                            <button class="action-btn toggle" onclick="toggleUserStatus('${u.id}', '${u.account_status}', '${(u.full_name||'this user').replace(/'/g,"\\'")}' )" title="${u.account_status === 'Active' ? 'Deactivate' : 'Activate'}">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>
                            </button>
                            <button class="action-btn danger" onclick="deleteUserConfirm('${u.id}', '${(u.full_name||u.email).replace(/'/g,"\\'")}' )" title="Delete User">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                            </button>
                        </div>
                    </td>
                </tr>`).join('')}</tbody>
            </table>`;

            // Sortable column headers
            wrap.querySelectorAll('th.sortable').forEach(th => {
                th.addEventListener('click', () => {
                    const col = th.dataset.col;
                    if (usersState.sort === col) {
                        usersState.order = usersState.order === 'desc' ? 'asc' : 'desc';
                    } else {
                        usersState.sort = col;
                        usersState.order = 'desc';
                    }
                    usersState.page = 1;
                    fetchUsers();
                });
            });
        }

        renderUsersPagination();
    } catch (err) {
        toast('Failed to load users: ' + err.message, 'error');
        wrap.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h4>Failed to load users</h4><p>${err.message}</p></div>`;
    }
};

const renderUsersPagination = () => {
    const el = document.getElementById('usersPagination');
    if (!el) return;
    const { page, pages, total, limit } = usersState;
    const from = (page-1)*limit + 1;
    const to = Math.min(page*limit, total);
    el.innerHTML = `
        <div class="pagination-info">Showing ${fmt.num(from)}–${fmt.num(to)} of ${fmt.num(total)}</div>
        <div class="pagination-btns">
            <button class="pg-btn" onclick="goUsersPage(1)" ${page===1?'disabled':''}>«</button>
            <button class="pg-btn" onclick="goUsersPage(${page-1})" ${page===1?'disabled':''}>‹</button>
            ${Array.from({length: Math.min(5,pages)}, (_,i) => {
                const start = Math.max(1, Math.min(page-2, pages-4));
                const p = start + i;
                return p <= pages ? `<button class="pg-btn ${p===page?'active':''}" onclick="goUsersPage(${p})">${p}</button>` : '';
            }).join('')}
            <button class="pg-btn" onclick="goUsersPage(${page+1})" ${page>=pages?'disabled':''}>›</button>
            <button class="pg-btn" onclick="goUsersPage(${pages})" ${page>=pages?'disabled':''}>»</button>
        </div>`;
};
window.goUsersPage = (p) => { usersState.page = p; fetchUsers(); };

// ─── USER ACTIONS ────────────────────────────────────────────────────────────
window.viewUser = async (id) => {
    selectedUserId = id;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'userModal';
    overlay.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <div class="modal-title">User Profile</div>
                <button class="modal-close" onclick="document.getElementById('userModal').remove()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div class="modal-body">
                <div class="skeleton skeleton-line" style="height:80px;margin-bottom:1rem"></div>
                <div class="skeleton skeleton-line" style="height:120px;margin-bottom:1rem"></div>
                <div class="skeleton skeleton-line" style="height:200px"></div>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };

    try {
        const { user, stats, timeline, documents } = await apiFetch('/users/' + id);
        const modal = overlay.querySelector('.modal');
        modal.querySelector('.modal-body').innerHTML = `
            <div class="profile-hero">
                <div class="profile-avatar-lg">${fmt.initials(user.full_name || user.email)}</div>
                <div class="profile-meta">
                    <h3>${user.full_name || 'Unnamed User'}</h3>
                    <p>${user.email}</p>
                    <div class="badges">
                        ${fmt.statusBadge(user.account_status)}
                        <span class="badge ${user.role === 'admin' ? 'badge-admin' : 'badge-inactive'}">${user.role || 'student'}</span>
                    </div>
                </div>
            </div>
            <div class="info-grid">
                <div class="info-item"><div class="info-label">User ID</div><div class="info-value fs-xs text-muted">${user.id}</div></div>
                <div class="info-item"><div class="info-label">Registered</div><div class="info-value">${fmt.date(user.created_at)}</div></div>
                <div class="info-item"><div class="info-label">Last Login</div><div class="info-value">${fmt.datetime(user.last_login_at)}</div></div>
                <div class="info-item"><div class="info-label">Last Activity</div><div class="info-value">${fmt.timeAgo(user.last_activity_at)}</div></div>
            </div>
            <div class="stats-mini-grid">
                <div class="stats-mini"><div class="val" style="color:var(--primary)">${fmt.num(stats.notes)}</div><div class="lbl">Notes</div></div>
                <div class="stats-mini"><div class="val" style="color:var(--success)">${fmt.num(stats.flashcards)}</div><div class="lbl">Flashcards</div></div>
                <div class="stats-mini"><div class="val" style="color:var(--info)">${fmt.num(stats.pdfs)}</div><div class="lbl">PDFs</div></div>
                <div class="stats-mini"><div class="val" style="color:var(--secondary)">${fmt.num(stats.aiConversations)}</div><div class="lbl">AI Chats</div></div>
                <div class="stats-mini"><div class="val" style="color:var(--warning)">${fmt.num(stats.quizzes)}</div><div class="lbl">Quizzes</div></div>
                <div class="stats-mini"><div class="val" style="color:var(--success)">${stats.studyHours}h</div><div class="lbl">Study Time</div></div>
            </div>
            <div style="margin-bottom:1rem">
                <div class="chart-title mb-1">Activity Timeline <span class="text-muted fs-xs">(last 50 events)</span></div>
                <div class="timeline">
                    ${timeline.length === 0 ? '<p class="text-muted fs-sm">No activity recorded yet.</p>' :
                    timeline.map(t => `
                        <div class="timeline-item">
                            <div class="timeline-action">${t.type?.replace(/_/g, ' ') || 'Activity'}</div>
                            <div class="timeline-time">${fmt.datetime(t.timestamp)}</div>
                            ${t.description && t.description !== t.type ? `<div class="timeline-desc">${t.description}</div>` : ''}
                        </div>`).join('')}
                </div>
            </div>`;

        modal.querySelector('.modal-body').insertAdjacentHTML('beforeend', `
            <div class="modal-footer" style="border-top:1px solid var(--border);padding-top:1rem;display:flex;gap:0.75rem;justify-content:flex-end">
                <button class="btn btn-secondary btn-sm" onclick="document.getElementById('userModal').remove()">Close</button>
                <button class="btn btn-danger btn-sm" onclick="document.getElementById('userModal').remove(); deleteUserConfirm('${user.id}','${(user.full_name||user.email).replace(/'/g,"\\'")}')">Delete User</button>
                <button class="btn btn-${user.account_status === 'Active' ? 'warning' : 'success'} btn-sm" onclick="document.getElementById('userModal').remove(); toggleUserStatus('${user.id}','${user.account_status}','${(user.full_name||'this user').replace(/'/g,"\\'")}')">
                    ${user.account_status === 'Active' ? 'Deactivate' : 'Activate'}
                </button>
            </div>`);
    } catch (err) {
        toast('Failed to load user: ' + err.message, 'error');
        overlay.remove();
    }
};

window.toggleUserStatus = (id, currentStatus, name) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    confirm(
        `${newStatus === 'Active' ? 'Activate' : 'Deactivate'} User`,
        `Are you sure you want to ${newStatus === 'Active' ? 'activate' : 'deactivate'} <strong>${name}</strong>? Their account status will be set to <strong>${newStatus}</strong>.`,
        async () => {
            try {
                await apiFetch('/users/' + id, { method: 'PATCH', body: JSON.stringify({ account_status: newStatus }) });
                toast(`User ${newStatus === 'Active' ? 'activated' : 'deactivated'} successfully.`, 'success');
                fetchUsers();
            } catch (err) { toast('Failed: ' + err.message, 'error'); }
        }, newStatus !== 'Active'
    );
};

window.deleteUserConfirm = (id, name) => {
    confirm(
        'Delete User',
        `This will permanently delete <strong>${name}</strong> and all their data. This action <strong>cannot be undone</strong>.`,
        async () => {
            try {
                await apiFetch('/users/' + id, { method: 'DELETE' });
                toast('User deleted successfully.', 'success');
                fetchUsers();
            } catch (err) { toast('Delete failed: ' + err.message, 'error'); }
        }, true
    );
};

// ═══════════════════════════════════════════════
// ACTIVITY LOGS
// ═══════════════════════════════════════════════
const renderLogs = async () => {
    const area = document.getElementById('contentArea');
    area.innerHTML = `
        <div class="section-header fade-in">
            <h2>Activity Logs</h2>
            <p>All platform events — user actions, logins, AI usage, and more</p>
        </div>
        <div class="table-card fade-in">
            <div class="table-header">
                <div class="table-title">Event Log <span id="logTotalBadge" class="badge badge-info" style="margin-left:0.5rem"></span></div>
                <div class="table-actions">
                    <input class="search-input" id="logActionFilter" placeholder="Filter by action type…" value="${logsState.action_type}">
                    <input class="date-input" id="logFromDate" type="date" value="${logsState.from}" title="From date">
                    <input class="date-input" id="logToDate" type="date" value="${logsState.to}" title="To date">
                    <button class="btn btn-secondary btn-sm" id="logFilterBtn">Filter</button>
                    <button class="btn btn-secondary btn-sm" id="logResetBtn">Reset</button>
                </div>
            </div>
            <div id="logsTableWrap"><div class="empty-state"><div class="empty-icon">⏳</div><h4>Loading…</h4></div></div>
            <div class="pagination" id="logsPagination"></div>
        </div>`;

    document.getElementById('logFilterBtn').addEventListener('click', () => {
        logsState.action_type = document.getElementById('logActionFilter').value;
        logsState.from = document.getElementById('logFromDate').value;
        logsState.to = document.getElementById('logToDate').value;
        logsState.page = 1;
        fetchLogs();
    });
    document.getElementById('logResetBtn').addEventListener('click', () => {
        logsState = { page: 1, limit: 50, action_type: '', user_id: '', from: '', to: '' };
        document.getElementById('logActionFilter').value = '';
        document.getElementById('logFromDate').value = '';
        document.getElementById('logToDate').value = '';
        fetchLogs();
    });
    document.getElementById('logActionFilter').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('logFilterBtn').click(); });

    fetchLogs();
};

const fetchLogs = async () => {
    const wrap = document.getElementById('logsTableWrap');
    if (!wrap) return;
    try {
        const params = new URLSearchParams(logsState);
        const { logs, total, pages } = await apiFetch('/activity-logs?' + params);
        const badge = document.getElementById('logTotalBadge');
        if (badge) badge.textContent = fmt.num(total) + ' events';

        if (!logs || logs.length === 0) {
            wrap.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><h4>No logs found</h4><p>Try adjusting your filters or date range.</p></div>`;
        } else {
            wrap.innerHTML = `<table>
                <thead><tr><th>User</th><th>Action</th><th>Description</th><th>Date & Time</th></tr></thead>
                <tbody>${logs.map(l => `
                <tr>
                    <td>
                        ${l.profiles ? `<div class="td-user">
                            <div class="user-avatar-sm" style="width:28px;height:28px;font-size:0.7rem">${fmt.initials(l.profiles.full_name || l.profiles.email)}</div>
                            <div><div class="td-user-name fs-sm">${l.profiles.full_name || '—'}</div><div class="td-user-email">${l.profiles.email || ''}</div></div>
                        </div>` : `<span class="text-muted fs-sm">${l.user_id?.slice(0,8)||'—'}…</span>`}
                    </td>
                    <td>${fmt.logBadge(l.action_type)}</td>
                    <td class="text-secondary fs-sm" style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.metadata?.description || l.metadata?.title || l.action_type?.replace(/_/g,' ') || '—'}</td>
                    <td class="text-muted fs-sm" style="white-space:nowrap">${fmt.datetime(l.created_at)}</td>
                </tr>`).join('')}</tbody>
            </table>`;
        }

        // Pagination
        const pagEl = document.getElementById('logsPagination');
        if (pagEl) {
            const { page, limit } = logsState;
            const from = (page-1)*limit + 1;
            const to = Math.min(page*limit, total);
            pagEl.innerHTML = `
                <div class="pagination-info">Showing ${fmt.num(from)}–${fmt.num(to)} of ${fmt.num(total)}</div>
                <div class="pagination-btns">
                    <button class="pg-btn" onclick="goLogsPage(${page-1})" ${page===1?'disabled':''}>‹ Prev</button>
                    <button class="pg-btn" onclick="goLogsPage(${page+1})" ${page>=pages?'disabled':''}>Next ›</button>
                </div>`;
        }
    } catch (err) {
        toast('Failed to load logs: ' + err.message, 'error');
        if (wrap) wrap.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h4>Error</h4><p>${err.message}</p></div>`;
    }
};
window.goLogsPage = (p) => { logsState.page = Math.max(1,p); fetchLogs(); };

// ═══════════════════════════════════════════════
// CONTENT OVERVIEW
// ═══════════════════════════════════════════════
const renderContent = async () => {
    const area = document.getElementById('contentArea');
    area.innerHTML = `
        <div class="section-header fade-in"><h2>Content Overview</h2><p>Flashcards, documents, and study materials across the platform</p></div>
        <div id="contentBody" class="fade-in"><div class="empty-state"><div class="empty-icon">⏳</div><h4>Loading…</h4></div></div>`;

    try {
        const { content } = await apiFetch('/content');
        document.getElementById('contentBody').innerHTML = `
            <div class="content-overview-grid">
                <div class="overview-card" style="--card-color:var(--secondary)"><div class="ov-val" style="color:var(--secondary)">${fmt.num(content.totalFlashcards)}</div><div class="ov-lbl">Total Flashcards</div></div>
                <div class="overview-card"><div class="ov-val" style="color:#f97316">${fmt.num(content.totalDocuments)}</div><div class="ov-lbl">Unique Documents (PDFs)</div></div>
                <div class="overview-card"><div class="ov-val" style="color:var(--success)">${fmt.num(content.completedTopics)}</div><div class="ov-lbl">Completed Topics</div></div>
                <div class="overview-card"><div class="ov-val" style="color:var(--info)">${fmt.num(content.totalSessions)}</div><div class="ov-lbl">Study Sessions</div></div>
            </div>

            <div class="charts-grid" style="margin-bottom:1.5rem">
                <div class="chart-card">
                    <div class="chart-card-header"><div class="chart-title">Top Flashcard Topics</div></div>
                    <div class="chart-container"><canvas id="topicsChart"></canvas></div>
                </div>
                <div class="chart-card">
                    <div class="chart-card-header"><div class="chart-title">Content Distribution</div></div>
                    <div class="chart-container"><canvas id="contentDistChart"></canvas></div>
                </div>
            </div>

            <div class="table-card">
                <div class="table-header"><div class="table-title">Recent Documents</div></div>
                <table>
                    <thead><tr><th>Document Title</th><th>User ID</th><th>Uploaded</th></tr></thead>
                    <tbody>${(content.recentDocs || []).map(d => `
                        <tr>
                            <td><span style="display:flex;align-items:center;gap:0.5rem">📄 ${d.title || 'Untitled'}</span></td>
                            <td class="text-muted fs-xs">${d.user_id?.slice(0,12)||'—'}…</td>
                            <td class="text-muted fs-sm">${fmt.datetime(d.created_at)}</td>
                        </tr>`).join('') || '<tr><td colspan="3" class="text-muted" style="padding:1.5rem;text-align:center">No documents found</td></tr>'}
                    </tbody>
                </table>
            </div>`;

        // Topics bar chart
        const topicsData = content.topFlashcardTopics || [];
        if (topicsData.length > 0) {
            new Chart(document.getElementById('topicsChart'), {
                type: 'bar',
                data: {
                    labels: topicsData.map(t => t.topic.slice(0,20)),
                    datasets: [{ label: 'Flashcards', data: topicsData.map(t => t.count), backgroundColor: 'rgba(139,92,246,0.6)', borderColor: '#8b5cf6', borderWidth: 1, borderRadius: 4 }]
                },
                options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1a2235', titleColor: '#f8fafc', bodyColor: '#94a3b8' } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b' } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#94a3b8', font: { size: 11 } } } } }
            });
        }

        // Distribution doughnut
        new Chart(document.getElementById('contentDistChart'), {
            type: 'doughnut',
            data: {
                labels: ['Flashcards', 'Documents', 'Study Sessions', 'Progress Records'],
                datasets: [{ data: [content.totalFlashcards, content.totalDocuments, content.totalSessions, content.totalProgressRecords], backgroundColor: ['#8b5cf6','#f97316','#06b6d4','#10b981'], borderColor: '#1a2235', borderWidth: 2 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, padding: 16 } }, tooltip: { backgroundColor: '#1a2235', titleColor: '#f8fafc', bodyColor: '#94a3b8' } } }
        });

    } catch (err) {
        toast('Failed to load content: ' + err.message, 'error');
        document.getElementById('contentBody').innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><h4>Error loading content</h4><p>${err.message}</p></div>`;
    }
};

// ─── BOOT ────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});
