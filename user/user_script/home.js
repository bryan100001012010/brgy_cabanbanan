/* ==========================================================================
   home.js — HOME PAGE (public, user-facing)
   Requires js/common.js to be loaded first (SITE_CONFIG, escapeHtmlJs).

   Pulls posts the admin creates on the "Home / Dashboard" page of the
   admin panel from the PUBLIC, read-only API (routes/public/announcements.js,
   mounted at /api/announcements) and shows them here inside the existing
   .featured-announcement and .announcement-grid containers, using the
   SAME markup/CSS classes already in the HTML — so nothing about the
   design changes.

   This is a different endpoint from the one the admin panel uses
   (/admin/announcements): this page can only GET data, never
   create/edit/delete/upload anything.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {
  loadAnnouncements();
});

var ANNOUNCEMENTS_PUBLIC_API =
  (typeof SITE_CONFIG !== 'undefined' && SITE_CONFIG.API_BASE_URL ? SITE_CONFIG.API_BASE_URL : '') +
  '/api/announcements';

var FALLBACK_IMG = 'https://picsum.photos/seed/barangay-default/700/500';

function loadAnnouncements() {
  var grid = document.getElementById('announcementGrid');
  var featuredSlot = document.getElementById('featuredAnnouncement');
  if (!grid && !featuredSlot) return; // containers not on this page

  /* -----------------------------------------------------------------
     🔌 SERVER CONNECTION POINT
     Talks to the real backend now. If the request fails (server not
     running, offline, etc.) or there are no posts yet, we deliberately
     leave the original static HTML in the page untouched instead of
     showing an empty/broken section.
     ----------------------------------------------------------------- */
  fetch(ANNOUNCEMENTS_PUBLIC_API)
    .then(function (res) {
      if (!res.ok) throw new Error('Failed to load announcements (' + res.status + ')');
      return res.json();
    })
    .then(function (posts) {
      if (!posts || !posts.length) return; // no posts yet — keep static fallback markup
      renderAnnouncements(posts, featuredSlot, grid);
    })
    .catch(function (err) {
      console.warn('Announcements API unavailable, keeping static fallback content.', err);
    });
}

function renderAnnouncements(posts, featuredSlot, grid) {
  posts = posts.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

  // ---- Featured (most recent) announcement ----
  if (featuredSlot) {
    var f = posts[0];
    var fImg = firstImagePath(f.images);
    featuredSlot.innerHTML =
      '<div class="featured-media">' +
        // loading="lazy" + decoding="async" keep large admin-uploaded
        // photos from slowing down mobile/Android page loads.
        '<img src="' + escapeHtmlJs(fImg) + '" alt="" loading="lazy" decoding="async">' +
      '</div>' +
      '<div class="featured-copy">' +
        '<span class="announcement-tag" style="position:static; display:inline-flex; margin-bottom:14px; width:fit-content;">Featured</span>' +
        '<span class="announcement-date">' + formatAnnouncementDate(f.date) + '</span>' +
        '<h3>' + escapeHtmlJs(f.title) + '</h3>' +
        '<p>' + escapeHtmlJs(f.content) + '</p>' +
        '<a class="btn btn-ghost" href="contacts.html">Coordinate with the Barangay Office &rarr;</a>' +
      '</div>';

    tagImageOrientation(
      featuredSlot.querySelector('.featured-media img'),
      featuredSlot.querySelector('.featured-media')
    );
  }

  // ---- Remaining announcements as cards ----
  if (grid) {
    var rest = posts.slice(featuredSlot ? 1 : 0);
    if (!rest.length) { grid.innerHTML = ''; return; }

    grid.innerHTML = rest.map(function (item) {
      var img = firstImagePath(item.images);
      return (
        '<article class="announcement-card">' +
          '<div class="announcement-media">' +
            '<span class="announcement-tag">Announcement</span>' +
            '<img src="' + escapeHtmlJs(img) + '" alt="" loading="lazy" decoding="async">' +
          '</div>' +
          '<div class="announcement-body">' +
            '<span class="announcement-date">' + formatAnnouncementDate(item.date) + '</span>' +
            '<h3>' + escapeHtmlJs(item.title) + '</h3>' +
            '<p>' + escapeHtmlJs(item.content) + '</p>' +
          '</div>' +
        '</article>'
      );
    }).join('');

    var mediaBlocks = grid.querySelectorAll('.announcement-media');
    mediaBlocks.forEach(function (block) {
      tagImageOrientation(block.querySelector('img'), block);
    });
  }
}

// Admin can upload several photos per announcement; the public homepage
// only shows one per card/feature slot, so we always use the first.
function firstImagePath(images) {
  return (images && images.length && images[0].filepath) ? images[0].filepath : FALLBACK_IMG;
}

/* -----------------------------------------------------------------------
   Reads the image's REAL pixel dimensions once it finishes loading and
   tags its container with .is-landscape / .is-portrait / .is-square.
   style.css then uses those classes to frame each photo appropriately
   (wide crop for landscape, taller box for portrait, etc.) instead of
   forcing every photo — regardless of how it was actually shot — into
   one fixed box shape. See the ".featured-media" / ".announcement-media"
   orientation rules in style.css.
   ----------------------------------------------------------------------- */
function tagImageOrientation(imgEl, containerEl) {
  if (!imgEl || !containerEl) return;

  function tag() {
    if (!imgEl.naturalWidth || !imgEl.naturalHeight) return;
    var ratio = imgEl.naturalWidth / imgEl.naturalHeight;
    containerEl.classList.remove('is-landscape', 'is-portrait', 'is-square');
    if (ratio > 1.15) {
      containerEl.classList.add('is-landscape');
    } else if (ratio < 0.85) {
      containerEl.classList.add('is-portrait');
    } else {
      containerEl.classList.add('is-square');
    }
  }

  if (imgEl.complete) {
    tag();
  } else {
    imgEl.addEventListener('load', tag);
    imgEl.addEventListener('error', function () {
      imgEl.src = FALLBACK_IMG;
    });
  }
}

function formatAnnouncementDate(dateStr) {
  var d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}