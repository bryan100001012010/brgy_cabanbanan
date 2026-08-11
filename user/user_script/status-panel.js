/* ==========================================================================
   🌐 PUBLIC SITE — status-panel.js
   Path in project: user_script/status-panel.js

   Shows a "Your Complaint Status" panel ONLY when the current browser
   (identified by the token in localStorage, set by complaint.js when a
   complaint is filed) has at least one complaint that is:
     - Pending
     - Ongoing
     - Resolved AND resolved within the last 3 days

   Once a Resolved complaint passes the 3-day mark, the backend simply
   stops returning it — so it naturally disappears from the panel (and
   the panel itself disappears once no qualifying complaints remain).

   Include this script (after common.js) on any public page where you
   want the panel to appear — e.g. home.html, complaint.html, etc.
   ========================================================== */
(function () {

  var API_BASE = (typeof SITE_CONFIG !== 'undefined' && SITE_CONFIG.API_BASE_URL) || '';
  var STATUS_API = API_BASE + '/complaints/status';
  var TRACKING_KEY = 'complaintTracking';
  var PANEL_ID = 'my-complaint-status-panel';

  function statusMeta(status) {
    switch (status) {
      case 'Pending':
        return {
          label: 'Pending',
          text: 'Waiting for the barangay to review your complaint.',
          color: '#C89B3C'
        };
      case 'In Progress':
        return {
          label: 'Ongoing',
          text: 'Your complaint is currently being handled by the barangay.',
          color: '#2B6CB0'
        };
      case 'Resolved':
        return {
          label: 'Resolved',
          text: 'Your complaint has been resolved. This will be removed from your status list after 3 days.',
          color: '#2F855A'
        };
      default:
        return { label: status, text: '', color: '#666' };
    }
  }

  function removePanel() {
    var existing = document.getElementById(PANEL_ID);
    if (existing) existing.remove();
  }

  function renderPanel(complaints) {
    removePanel();

    var panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.style.cssText = 'max-width:900px;margin:20px auto;padding:16px 20px;' +
      'border:1px solid #e2c98a;border-radius:10px;background:#fffaf0;' +
      'font-family:inherit;';

    var title = document.createElement('h3');
    title.textContent = 'Your Complaint Status';
    title.style.cssText = 'margin:0 0 10px 0;font-size:1.05rem;color:#12283F;';
    panel.appendChild(title);

    complaints.forEach(function (c) {
      var meta = statusMeta(c.status);

      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:flex-start;gap:10px;' +
        'padding:10px 0;border-top:1px solid #eee;';

      var badge = document.createElement('span');
      badge.textContent = meta.label;
      badge.style.cssText = 'flex:0 0 auto;padding:3px 10px;border-radius:999px;' +
        'font-size:0.78rem;font-weight:600;color:#fff;background:' + meta.color + ';' +
        'white-space:nowrap;';
      row.appendChild(badge);

      var body = document.createElement('div');

      var line1 = document.createElement('div');
      line1.style.cssText = 'font-size:0.9rem;color:#222;';
      line1.textContent = (c.category || 'Complaint') + ' — Tracking #' + c.tracking_code;

      var line2 = document.createElement('div');
      line2.style.cssText = 'font-size:0.82rem;color:#555;margin-top:2px;';
      line2.textContent = meta.text;

      body.appendChild(line1);
      body.appendChild(line2);
      row.appendChild(body);
      panel.appendChild(row);
    });

    var anchor = document.querySelector('.page-hero .container')
      || document.querySelector('main')
      || document.body;
    anchor.parentNode.insertBefore(panel, anchor.nextSibling);
  }

  function load() {
    var tracking = localStorage.getItem(TRACKING_KEY);

        if (!tracking) {
        removePanel();
        return;
        }

        fetch(STATUS_API + '/' + encodeURIComponent(tracking))
            .then(function (res) {
        if (!res.ok) throw new Error('Failed to load complaint status');
        return res.json();
      })
      .then(function (data) {

      if (!data || !data.tracking_code) {
        removePanel();
        return;
       }

       renderPanel([data]);

      })
      .catch(function (err) {
        console.error('Status panel error:', err);
      });
  }

  document.addEventListener('DOMContentLoaded', load);

  // Exposed so complaint.js can force a refresh right after a new
  // complaint is filed, without waiting for a page reload.
  window.BSIStatusPanel = { refresh: load };

})();