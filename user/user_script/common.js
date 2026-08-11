/* ==========================================================================
   Barangay San Isidro — Common Script (PUBLIC / RESIDENT-FACING SITE)
   Loaded on EVERY page, before the page's own script. Handles the stuff
   every page needs (mobile nav, active nav-link highlight, demo-mode
   config, and a shared HTML-escaping helper) so each page-specific file
   only has to contain logic unique to that page — same pattern as the
   admin panel's js/common.js.

   ---------------------------------------------------------------------
   🔌 HOW THIS SITE CONNECTS TO YOUR SERVER — READ THIS FIRST
   ---------------------------------------------------------------------
   LIVE now — talking to the real backend, no localStorage involved:
     - Announcements (index.js / home.js) -> GET /api/announcements
     - Contacts & hotlines                -> GET /api/contacts,
                                              GET /api/contacts/hotlines

   These are read-only, public routes (routes/public/announcements.js,
   routes/public/contacts.js) — separate from the admin panel's own
   /admin/announcements and /admin/contacts routes, which also allow
   create/edit/delete and are never called from this site.

   STILL DEMO MODE — no backend route wired up yet, still read/write
   localStorage keys shared with the admin panel until their turn:
     - Complaints (brgy_complaints)
     - Certificates, if the certificate request page still uses
       brgy_certificates — check that page's own .js file

   Any place still in demo mode is wrapped in a block that starts with:

        🔌 SERVER CONNECTION POINT

   Search the relevant page's .js file for that phrase to find it. Once
   its backend route exists, swap that block for a fetch() call the same
   way announcements and contacts were done — you do NOT need to touch
   the rendering/markup code, since it already uses the site's existing
   CSS classes and the design stays identical.
   ---------------------------------------------------------------------- */

var SITE_CONFIG = {
  // Real backend is same-origin, so this stays empty (relative fetch
  // paths like '/api/announcements' work as-is). Only set this if the
  // API ever moves to a different origin, e.g. 'https://api.barangaysanisidro.gov.ph'
  API_BASE_URL: '',

  // Only affects pages that haven't been wired to a real backend yet
  // (currently: complaints, and certificates if its page still checks
  // this flag). Announcements and contacts ignore this now — they
  // always fetch the live API. Flip this to false once every page's
  // SERVER CONNECTION POINT above has been swapped for a real fetch().
  DEMO_MODE: true
};

document.addEventListener('DOMContentLoaded', function () {

  /* ---------------- Mobile nav toggle ---------------- */
  var navToggle = document.querySelector('.nav-toggle');
  var mainNav = document.querySelector('.main-nav');
  if (navToggle && mainNav) {
    navToggle.addEventListener('click', function () {
      var isOpen = mainNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });
    mainNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mainNav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------------- Active nav link by filename ---------------- */
  var currentPage = window.location.pathname.split('/').pop() || 'index.html';
  if (currentPage === '' || currentPage === 'index.html') {
    currentPage = 'home.html';
  }
  document.querySelectorAll('.main-nav a').forEach(function (link) {
    var href = link.getAttribute('href');
    if (href === currentPage) {
      link.classList.add('is-active');
      link.setAttribute('aria-current', 'page');
    }
  });

});

/* ---------------------------------------------------------
   Small shared helper — escape text before inserting as HTML.
   Used by index.js / home.js when rendering announcements.
   --------------------------------------------------------- */
function escapeHtmlJs(str) {
  var div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}