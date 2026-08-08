document.addEventListener('DOMContentLoaded', () => {
    // Authentication Check
    const token = localStorage.getItem('cognipath_token') || localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('cognipath_user') || localStorage.getItem('currentUser') || '{}');
    
    // In dev mode, or if role missing, we can override or redirect
    if (!token) {
        window.location.href = '/'; // Redirect to main app if not authenticated
        return;
    }

    document.getElementById('adminNameDisplay').innerText = user.name || 'Admin';
    if (user.photo) {
        document.getElementById('adminAvatar').src = user.photo;
    }

    // Navigation Logic
    const navItems = document.querySelectorAll('.admin-nav li');
    const contentArea = document.getElementById('adminContentArea');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            loadView(item.getAttribute('data-view'));
        });
    });

    document.getElementById('btnReturnApp').addEventListener('click', () => {
        window.location.href = '/';
    });

    document.getElementById('btnAdminLogout').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/';
    });

    // View Loading
    async function loadView(viewName) {
        contentArea.innerHTML = '<div class="empty-state">Loading...</div>';
        try {
            if (viewName === 'dashboard') await renderDashboard();
            else if (viewName === 'users') await renderUsers();
            else if (viewName === 'resources') contentArea.innerHTML = '<div class="empty-state">Resource Management (Coming Soon)</div>';
            else if (viewName === 'logs') contentArea.innerHTML = '<div class="empty-state">Activity Logs (Coming Soon)</div>';
        } catch (err) {
            contentArea.innerHTML = `<div class="empty-state" style="color:var(--warning)">Error loading view: ${err.message}</div>`;
        }
    }

    // --- Dashboard View ---
    async function renderDashboard() {
        const res = await fetch('/api/admin/analytics', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch analytics');
        const data = await res.json();

        contentArea.innerHTML = `
            <div class="admin-grid">
                <div class="admin-card">
                    <h3>Total Users</h3>
                    <div class="val">${data.totalUsers || 0}</div>
                </div>
                <div class="admin-card">
                    <h3>Active Users</h3>
                    <div class="val" style="color: #34d399">${data.activeUsers || 0}</div>
                </div>
                <div class="admin-card">
                    <h3>Study Sessions</h3>
                    <div class="val" style="color: #3b82f6">${data.totalSessions || 0}</div>
                </div>
                <div class="admin-card">
                    <h3>Quizzes Generated</h3>
                    <div class="val" style="color: #a855f7">${data.totalQuizzes || 0}</div>
                </div>
            </div>
            <div class="admin-card" style="min-height: 300px;">
                <h3>System Status</h3>
                <p style="color:var(--admin-text-muted); margin-top:1rem;">All systems operational. Database connected and synchronized.</p>
            </div>
        `;
    }

    // --- Users View ---
    async function renderUsers() {
        const res = await fetch('/api/admin/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch users');
        const data = await res.json();

        let rows = '';
        data.users.forEach(u => {
            const statusClass = u.status === 'Active' ? 'active' : 'inactive';
            rows += `
                <tr>
                    <td>
                        <div class="user-cell">
                            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random" alt="Avatar">
                            <div>
                                <div style="font-weight:600">${u.name}</div>
                                <div style="font-size:0.8rem; color:var(--admin-text-muted)">${u.email}</div>
                            </div>
                        </div>
                    </td>
                    <td>${new Date(u.joined_date).toLocaleDateString()}</td>
                    <td><span class="badge ${statusClass}">${u.status}</span></td>
                    <td>${u.topicsStarted}</td>
                    <td>${Math.floor((u.studyTimeSeconds || 0) / 3600)}h ${Math.floor(((u.studyTimeSeconds || 0) % 3600) / 60)}m</td>
                    <td>
                        <button class="btn-ghost" style="font-size:0.8rem; padding:0.4rem 0.8rem;" onclick="window.viewUserDetails('${u.id}')">View</button>
                    </td>
                </tr>
            `;
        });

        contentArea.innerHTML = `
            <div class="admin-table-container">
                <table class="admin-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Joined</th>
                            <th>Status</th>
                            <th>Topics</th>
                            <th>Study Time</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>${rows || '<tr><td colspan="6" class="empty-state">No users found</td></tr>'}</tbody>
                </table>
            </div>
        `;
    }

    // --- User Details Modal ---
    const modal = document.getElementById('userDetailsModal');
    const modalBody = document.getElementById('modalBody');
    const tabBtns = document.querySelectorAll('.tab-btn');
    let currentUserData = null;

    document.getElementById('btnCloseModal').addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderUserTab(btn.getAttribute('data-target'));
        });
    });

    window.viewUserDetails = async (userId) => {
        modalBody.innerHTML = '<div class="empty-state">Loading user details...</div>';
        modal.classList.remove('hidden');
        tabBtns.forEach(b => b.classList.remove('active'));
        tabBtns[0].classList.add('active');
        
        try {
            const res = await fetch(`/api/admin/users/${userId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to load user profile');
            currentUserData = await res.json();
            
            document.getElementById('modalUserName').innerText = currentUserData.profile.name || 'User Profile';
            renderUserTab('tab-overview');
        } catch (err) {
            modalBody.innerHTML = `<div class="empty-state" style="color:var(--warning)">${err.message}</div>`;
        }
    };

    function renderUserTab(tab) {
        if (!currentUserData) return;
        const d = currentUserData;
        const p = d.profile;

        if (tab === 'tab-overview') {
            modalBody.innerHTML = `
                <div style="display:flex; gap:2rem;">
                    <div>
                        <p><strong>Email:</strong> ${p.email}</p>
                        <p><strong>Role:</strong> ${p.role}</p>
                        <p><strong>Joined:</strong> ${new Date(p.joined_date).toLocaleString()}</p>
                        <p><strong>Last Login:</strong> ${new Date(p.updated_at || p.last_login).toLocaleString()}</p>
                        <p><strong>Level:</strong> ${p.level || 1} (${p.xp || 0} XP)</p>
                    </div>
                    <div>
                        <p><strong>Status:</strong> <span class="badge ${p.status === 'Active' ? 'active' : 'inactive'}">${p.status || 'Active'}</span></p>
                        <div style="margin-top:1rem;">
                            <button class="btn-primary" onclick="window.toggleUserStatus('${p.id}', '${p.status === 'Active' ? 'Suspended' : 'Active'}')">
                                ${p.status === 'Active' ? 'Suspend User' : 'Activate User'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else if (tab === 'tab-progress') {
            const progHtml = d.progress.map(pr => `<li>${pr.topic || pr.topic_id} - <strong>${pr.status}</strong></li>`).join('') || 'No progress recorded';
            modalBody.innerHTML = `<ul>${progHtml}</ul>`;
        } else if (tab === 'tab-resources') {
            const pdfHtml = d.pdfs.map(pdf => `<li>${pdf.title || pdf.file_name} (${Math.round((pdf.file_size_bytes||0)/1024)} KB) - ${new Date(pdf.created_at).toLocaleDateString()}</li>`).join('') || 'No resources uploaded';
            modalBody.innerHTML = `<ul>${pdfHtml}</ul>`;
        } else if (tab === 'tab-logs') {
            const logHtml = d.activityLogs.map(log => `
                <div style="padding:0.5rem; border-bottom:1px solid var(--admin-border)">
                    <span style="color:var(--admin-text-muted); font-size:0.8rem;">${new Date(log.created_at).toLocaleString()}</span><br>
                    <strong>${log.type.toUpperCase()}</strong>: ${log.title}
                </div>
            `).join('') || 'No recent activity';
            modalBody.innerHTML = `<div style="max-height: 400px; overflow-y:auto;">${logHtml}</div>`;
        }
    }

    window.toggleUserStatus = async (userId, newStatus) => {
        if (!confirm(`Are you sure you want to change user status to ${newStatus}?`)) return;
        try {
            const res = await fetch(`/api/admin/users/${userId}/status`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });
            if (!res.ok) throw new Error('Update failed');
            alert('User status updated!');
            window.viewUserDetails(userId); // reload modal
            renderUsers(); // reload background table
        } catch(err) {
            alert(err.message);
        }
    };

    // Initial Load
    loadView('dashboard');
});
