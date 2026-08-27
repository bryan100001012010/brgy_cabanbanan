/* =========================================================
   HOME.JS — Dashboard stats + Announcement management.

   Announcements talk to the real backend (routes/announcements.js)
   over the /admin/announcements API instead of localStorage. This is
   the ADMIN-ONLY endpoint (full create/edit/delete/upload) — the
   public homepage talks to a separate, read-only /api/announcements
   endpoint (routes/public/announcements.js) instead. Images are
   uploaded as real files (multipart/form-data); the server saves them
   under Image/announcements and stores the resulting file path in the
   database, which is what gets used as the <img src> everywhere,
   including on the public homepage.

   NOTE: Complaint/certificate stats below still read localStorage —
   there's no backend route for complaints yet, so that part was left
   alone. Ask if you'd like those wired up too.
   ========================================================= */

const ANNOUNCEMENTS_API = "/admin/announcements";


let announcementsCache = [];   // last-fetched list (avoids re-fetching just to open the edit modal)
let existingImages = [];       // images already saved on the announcement currently being edited
let imagesToDelete = [];       // ids of existing images queued for removal on next save

/* ---------------------------------------------------------
   STATS (unchanged — still localStorage, see note above)
   --------------------------------------------------------- */
async function loadComplaints() {
    const res = await fetch("/admin/complaints");

    if (!res.ok) {
        throw new Error("Failed to load complaints");
    }

    return await res.json();
}

async function loadCertificates() {
    const res = await fetch("/certificates");

    if (!res.ok) {
        throw new Error("Failed to load certificates");
    }

    return await res.json();
}

async function renderStats() {

    const complaints = await loadComplaints();

    document.getElementById("statPending").textContent =
        complaints.filter(c => c.status === "Pending").length;

    document.getElementById("statProgress").textContent =
        complaints.filter(c => c.status === "In Progress").length;

    document.getElementById("statResolved").textContent =
        complaints.filter(c => c.status === "Resolved").length;

    const certificates = await loadCertificates();

    document.getElementById("statCerts").textContent =
        certificates.length;
}
/* ---------------------------------------------------------
   ANNOUNCEMENTS — backed by /announcements API
   --------------------------------------------------------- */
async function fetchAnnouncements() {
  const res = await fetch(ANNOUNCEMENTS_API);
  if (!res.ok) throw new Error('Failed to load announcements');
  return res.json();
}

async function renderAnnouncements() {
  const container = document.getElementById('announcementList');
  const empty = document.getElementById('announcementEmpty');

  let list;
  try {
    list = await fetchAnnouncements();
  } catch (err) {
    console.error(err);
    showToast('Could not load announcements.');
    return;
  }

  announcementsCache = list;
  list.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (list.length === 0) {
    container.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  container.innerHTML = list.map(item => `
    <div class="item-card" style="margin-bottom:12px; flex-direction:row; align-items:flex-start;">
      ${renderThumb(item.images)}
      <div style="flex:1; min-width:0;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:10px;">
          <div>
            <h4>${escapeHtml(item.title)}</h4>
            <div class="muted">${formatDate(item.date)}</div>
          </div>
          <div class="row-actions">
            <button class="icon-btn" title="Edit" onclick="openAnnouncementModal(${item.id})">✎</button>
            <button class="icon-btn danger" title="Delete" onclick="deleteAnnouncement(${item.id})">🗑</button>
          </div>
        </div>
        <p style="font-size:13.5px; color:var(--text); margin:4px 0 0;">${escapeHtml(item.content)}</p>
        ${item.images && item.images.length > 1
          ? `<div class="muted" style="font-size:12px; margin-top:4px;">${item.images.length} photos</div>`
          : ''}
      </div>
    </div>
  `).join('');
}

function renderThumb(images) {
  if (!images || images.length === 0) return '';
  return `<img src="${escapeHtml(images[0].filepath)}" alt="" style="width:64px; height:64px; border-radius:8px; object-fit:cover; flex-shrink:0;">`;
}

/* ---------------------------------------------------------
   MODAL: open for add / edit
   --------------------------------------------------------- */
function openAnnouncementModal(id) {
  const modal = document.getElementById('announcementModal');
  const form = document.getElementById('announcementForm');
  form.reset();
  imagesToDelete = [];
  existingImages = [];

  if (id) {
    const item = announcementsCache.find(a => a.id === id);
    if (!item) return;
    document.getElementById('modalTitle').textContent = 'Edit Announcement';
    document.getElementById('announcementId').value = item.id;
    document.getElementById('annTitle').value = item.title;
    document.getElementById('annDate').value = item.date ? String(item.date).split('T')[0] : '';
    document.getElementById('annContent').value = item.content;
    existingImages = item.images || [];
  } else {
    document.getElementById('modalTitle').textContent = 'New Announcement';
    document.getElementById('announcementId').value = '';
    document.getElementById('annDate').value = new Date().toISOString().split('T')[0];
  }
  renderExistingImages();
  modal.classList.add('open');
}

function closeAnnouncementModal() {
  document.getElementById('announcementModal').classList.remove('open');
}

/* Small gallery of already-saved photos, shown only when editing,
   each with a × button that queues it for deletion on save. */
function renderExistingImages() {
  const wrap = document.getElementById('existingImages');
  if (!wrap) return;
  const visible = existingImages.filter(img => !imagesToDelete.includes(img.id));

  if (visible.length === 0) {
    wrap.innerHTML = '';
    return;
  }
  wrap.innerHTML = visible.map(img => `
    <div class="existing-image-thumb">
      <img src="${escapeHtml(img.filepath)}" alt="">
      <button type="button" class="existing-image-remove" onclick="markImageForDeletion(${img.id})" title="Remove photo">×</button>
    </div>
  `).join('');
}

function markImageForDeletion(imageId) {
  imagesToDelete.push(imageId);
  renderExistingImages();
}

/* ---------------------------------------------------------
   CRUD actions
   --------------------------------------------------------- */
async function deleteAnnouncement(id) {
  if (!confirm('Delete this announcement? This cannot be undone.')) return;
  try {
    const res = await fetch(`${ANNOUNCEMENTS_API}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    await renderAnnouncements();
    renderStats();
    showToast('Announcement deleted.');
  } catch (err) {
    console.error(err);
    showToast('Could not delete announcement.');
  }
}

async function handleAnnouncementSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('announcementId').value;

  const formData = new FormData();
  formData.append('title', document.getElementById('annTitle').value.trim());
  formData.append('date', document.getElementById('annDate').value);
  formData.append('content', document.getElementById('annContent').value.trim());

  const fileInput = document.getElementById('annImages');
  for (const file of fileInput.files) {
    formData.append('images', file); // field name must match upload.array("images", ...) on the server
  }

  try {
    let res;
    if (id) {
      // remove any existing photos the user marked with × before saving the rest
      for (const imageId of imagesToDelete) {
        await fetch(`${ANNOUNCEMENTS_API}/${id}/images/${imageId}`, { method: 'DELETE' });
      }
      res = await fetch(`${ANNOUNCEMENTS_API}/${id}`, { method: 'PUT', body: formData });
    } else {
      res = await fetch(ANNOUNCEMENTS_API, { method: 'POST', body: formData });
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || 'Save failed');
    }

    await renderAnnouncements();
    renderStats();
    closeAnnouncementModal();
    showToast('Announcement saved.');
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Could not save announcement.');
  }
}

/* ---------------------------------------------------------
   HELPERS
   --------------------------------------------------------- */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

/* ---------------------------------------------------------
   INIT
   --------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", async () => {

    await renderStats();
    await renderAnnouncements();

    document.getElementById("addAnnouncementBtn")
        .addEventListener("click", () => openAnnouncementModal(null));

    document.getElementById("closeModalBtn")
        .addEventListener("click", closeAnnouncementModal);

    document.getElementById("cancelModalBtn")
        .addEventListener("click", closeAnnouncementModal);

    document.getElementById("announcementForm")
        .addEventListener("submit", handleAnnouncementSubmit);
});