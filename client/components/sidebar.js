/**
 * CogniPath Enterprise Sidebar Component
 * Manages view navigation, responsive collapse state, and active link highlighting.
 */

class SidebarComponent {
  constructor() {
    this.activeView = 'dashboard';
    this.init();
  }

  init() {
    document.addEventListener('DOMContentLoaded', () => {
      this.sidebarElement = document.querySelector('aside, .sidebar, #sidebar');
      this.bindNavigation();
    });
  }

  bindNavigation() {
    const navLinks = document.querySelectorAll('.nav-link, [data-target], .sidebar-item');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const targetView = link.getAttribute('data-target') || link.getAttribute('href')?.replace('#', '');
        if (targetView && targetView !== '') {
          this.setActiveView(targetView);
        }
      });
    });

    // Mobile sidebar toggle
    const toggleBtn = document.getElementById('sidebar-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        if (this.sidebarElement) {
          this.sidebarElement.classList.toggle('collapsed');
          this.sidebarElement.classList.toggle('mobile-open');
        }
      });
    }
  }

  setActiveView(viewName) {
    this.activeView = viewName;
    
    // Highlight active menu item
    document.querySelectorAll('.nav-link, .sidebar-item').forEach(el => {
      const target = el.getAttribute('data-target') || el.getAttribute('href')?.replace('#', '');
      if (target === viewName) {
        el.classList.add('active', 'bg-indigo-600/10', 'text-indigo-400', 'border-r-2', 'border-indigo-500');
        el.classList.remove('text-slate-400');
      } else {
        el.classList.remove('active', 'bg-indigo-600/10', 'text-indigo-400', 'border-r-2', 'border-indigo-500');
        el.classList.add('text-slate-400');
      }
    });

    // Toggle corresponding view panels if handled by standard container IDs
    const views = document.querySelectorAll('.page-view, .app-view-panel');
    views.forEach(panel => {
      if (panel.id === `view-${viewName}` || panel.id === `${viewName}-page` || panel.id === `${viewName}View`) {
        panel.classList.remove('hidden', 'd-none');
      } else {
        panel.classList.add('hidden', 'd-none');
      }
    });
  }
}

window.CogniPathSidebar = new SidebarComponent();
