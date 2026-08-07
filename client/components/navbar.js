/**
 * CogniPath Enterprise Navigation Bar Component
 * Handles header interactions, notifications toggle, and profile menu dropdowns.
 */

class NavbarComponent {
  constructor() {
    this.navElement = null;
    this.init();
  }

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      this.navElement = document.querySelector('header, .navbar, #navbar');
      this.setupEventListeners();
    });
  }

  setupEventListeners() {
    const profileBtn = document.getElementById('user-profile-btn') || document.querySelector('.user-profile-toggle');
    const notificationBtn = document.getElementById('notification-bell') || document.querySelector('.notifications-btn');

    if (profileBtn) {
      profileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menu = document.getElementById('profile-dropdown');
        if (menu) menu.classList.toggle('hidden');
      });
    }

    if (notificationBtn) {
      notificationBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const drawer = document.getElementById('notification-drawer');
        if (drawer) drawer.classList.toggle('hidden');
      });
    }

    // Close open dropdowns on outside click
    document.addEventListener('click', (e) => {
      const menu = document.getElementById('profile-dropdown');
      const drawer = document.getElementById('notification-drawer');
      if (menu && !menu.classList.contains('hidden') && !e.target.closest('#user-profile-btn')) {
        menu.classList.add('hidden');
      }
      if (drawer && !drawer.classList.contains('hidden') && !e.target.closest('#notification-bell')) {
        drawer.classList.add('hidden');
      }
    });
  }

  updateUserInfo(user) {
    if (!user) return;
    const nameEl = document.getElementById('nav-user-name');
    const xpEl = document.getElementById('nav-user-xp');
    const avatarEl = document.getElementById('nav-user-avatar');

    if (nameEl) nameEl.textContent = user.name || 'Student';
    if (xpEl) xpEl.textContent = `${user.xp || 0} XP`;
    if (avatarEl && user.profile_photo) avatarEl.src = user.profile_photo;
  }

  setNotificationCount(count = 0) {
    const badge = document.getElementById('nav-notification-badge');
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }
}

window.CogniPathNavbar = new NavbarComponent();
