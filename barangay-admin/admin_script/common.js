/* =========================================================
   COMMON.JS
   Shared logic used by EVERY admin page (except the login page
   loads a slightly smaller version of this, see index.js).

   Handles:
   - Mobile sidebar open/close
   - "Is the admin logged in" guard (checked against the real
     server-side session, not a client-side flag)
   - Logout
   - Toast notifications
   ========================================================= */

/* ---------------------------------------------------------
   1) LOGIN GUARD
   ---------------------------------------------------------
   Checks the real session via GET /admins/me. A client-side
   flag (sessionStorage) can be set by anyone from devtools
   without ever logging in, so it's never trusted as proof of
   auth — only the server's session cookie is.
   --------------------------------------------------------- */
async function requireLogin() {
  try {
    const res = await fetch('/admins/me');
    if (!res.ok) {
      window.location.href = '/admin/admin_html/index.html';
    }
  } catch (err) {
    window.location.href = '/admin/admin_html/index.html';
  }
}

/* ---------------------------------------------------------
   2) LOGOUT
   Calls the server so the session is actually destroyed, then
   clears the local UX flag and redirects.
   --------------------------------------------------------- */
function setupLogout() {
  const btn = document.getElementById('logoutBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    try {
      await fetch('/admins/logout', { method: 'POST' });
    } catch (err) {
      // Ignore — redirect to login either way.
    }
    sessionStorage.removeItem('brgy_admin_logged_in');
    sessionStorage.removeItem('admin');
    window.location.href = '/admin/admin_html/index.html';
  });
}

/* ---------------------------------------------------------
   3) MOBILE SIDEBAR TOGGLE
   --------------------------------------------------------- */
function setupSidebar() {
  const hamburger = document.getElementById('hamburger');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (!hamburger || !sidebar || !overlay) return;

  function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('open');
  }
  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  }

  hamburger.addEventListener('click', openSidebar);
  overlay.addEventListener('click', closeSidebar);

  // Close sidebar automatically when a nav link is tapped (mobile)
  sidebar.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', closeSidebar);
  });
}

/* ---------------------------------------------------------
   4) HIGHLIGHT ACTIVE NAV LINK based on current file name
   --------------------------------------------------------- */
function highlightActiveNav() {
  const page = window.location.pathname.split('/').pop() || ' /admin_html/home.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('href') === page) {
      link.classList.add('active');
    }
  });
}

/* ---------------------------------------------------------
   5) TOAST — small "Saved!" style notification
   --------------------------------------------------------- */
function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

/* ---------------------------------------------------------
   INIT — runs on every protected admin page
   --------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', async () => {
  await requireLogin();
  setupSidebar();
  setupLogout();
  highlightActiveNav();
});