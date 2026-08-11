/* =========================================================
   🔒 ADMIN PANEL — complaint.js
   Path in project: admin_script/complaint.js
   Paired page:      admin_html/complaint.html

   COMPLAINT.JS (admin panel)
   Shows complaints filed by residents on the PUBLIC website and
   lets the admin view evidence, update status, or delete a
   complaint entirely. Talks to the real backend at /complaints
   instead of localStorage — the public site's complaint.js POSTs
   directly into the same database this reads from.
   ========================================================= */

const COMPLAINTS_API = '/admin/complaints';

let complaintsCache = [];   // last-fetched list, so the modal doesn't need to re-fetch
let currentFilter = 'All';
let currentSearch = '';

/* ---------------------------------------------------------
   DATA
   --------------------------------------------------------- */
async function fetchComplaints() {
  const res = await fetch(COMPLAINTS_API);
  if (!res.ok) throw new Error('Failed to load complaints');
  return res.json();
}

/* ---------------------------------------------------------
   RENDER TABLE
   --------------------------------------------------------- */
async function renderComplaints() {
  let list;
  try {
    list = await fetchComplaints();
  } catch (err) {
    console.error(err);
    showToast('Could not load complaints.');
    return;
  }

  complaintsCache = list;
  list = [...list].sort((a, b) => new Date(b.date_filed) - new Date(a.date_filed));

  if (currentFilter !== 'All') {
    list = list.filter(c => c.status === currentFilter);
  }
  if (currentSearch.trim() !== '') {
    const q = currentSearch.toLowerCase();
    list = list.filter(c =>
      c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
    );
  }

  const tbody = document.getElementById('complaintTableBody');
  const empty = document.getElementById('complaintEmpty');

  if (list.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  tbody.innerHTML = list.map(c => `
    <tr>
      <td>${formatDateComplaint(c.date_filed)}</td>
      <td>${escapeHtmlComplaint(c.name)}</td>
      <td>${escapeHtmlComplaint(c.category)}</td>
      <td>${urgencyTag(c.urgency)}</td>
      <td><span class="badge ${badgeClass(c.status)}">${c.status}</span></td>
      <td>
        <div class="row-actions">
          <button class="icon-btn" title="View / Update" onclick="openComplaintModal(${c.id})">👁</button>
          <button class="icon-btn danger" title="Delete" onclick="quickDeleteComplaint(${c.id})">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function badgeClass(status) {
  if (status === 'Pending') return 'badge-pending';
  if (status === 'In Progress') return 'badge-progress';
  return 'badge-resolved';
}

function urgencyTag(urgency) {
  const labels = { routine: 'Routine', ongoing: 'Ongoing', urgent: 'Urgent' };
  const cls = { routine: 'urgency-routine', ongoing: 'urgency-ongoing', urgent: 'urgency-urgent' };
  const key = urgency || 'routine';
  return `<span class="urgency-tag ${cls[key] || 'urgency-routine'}">${labels[key] || 'Routine'}</span>`;
}

/* ---------------------------------------------------------
   MODAL: view details + evidence + update status
   --------------------------------------------------------- */
function openComplaintModal(id) {
  const item = complaintsCache.find(c => c.id === id);
  if (!item) return;

  document.getElementById('viewName').textContent = item.name;
  document.getElementById('viewContact').textContent = item.contact;
  document.getElementById('viewCategory').textContent = item.category;
  document.getElementById('viewUrgency').innerHTML = urgencyTag(item.urgency);
  document.getElementById('viewDate').textContent = formatDateComplaint(item.date_filed);
  document.getElementById('viewDetails').textContent = item.details;
  document.getElementById('complaintId').value = item.id;
  document.getElementById('statusSelect').value = item.status;

  renderEvidenceGallery(item.id, item.images || []);

  document.getElementById('complaintModal').classList.add('open');
}
function closeComplaintModal() {
  document.getElementById('complaintModal').classList.remove('open');
  hideEvidencePreview();
}

function renderEvidenceGallery(complaintId, images) {
  const gallery = document.getElementById('evidenceGallery');
  const empty = document.getElementById('evidenceEmpty');

  if (!images || images.length === 0) {
    gallery.innerHTML = '';
    empty.style.display = 'block';
    hideEvidencePreview();
    return;
  }
  empty.style.display = 'none';

  gallery.innerHTML = images.map(img => {
    const isPdf = /\.pdf$/i.test(img.filepath);

    const thumb = isPdf
      ? `<a class="pdf-chip" href="${escapeHtmlComplaint(img.filepath)}" target="_blank" rel="noopener">📄 PDF<br>view</a>`
      : `<img class="evidence-img" src="${escapeHtmlComplaint(img.filepath)}" data-src="${escapeAttrComplaint(img.filepath)}" alt="" title="Click to preview">`;

    return `
      <div class="evidence-thumb">
        ${thumb}
        <button type="button" class="evidence-remove" title="Remove this file"
          onclick="deleteComplaintImage(${complaintId}, ${img.id})">×</button>
      </div>
    `;
  }).join('');

  // Nothing enlarged until the admin actually clicks a thumbnail.
  hideEvidencePreview();
}

/* ---------------------------------------------------------
   EVIDENCE PREVIEW — larger view inside the same modal,
   sized to fit the modal's own width/height (no separate popup)
   --------------------------------------------------------- */
function showEvidencePreview(src, thumbImgEl) {
  document.getElementById('evidencePreviewImg').src = src;
  document.getElementById('evidencePreview').style.display = 'flex';

  document.querySelectorAll('#evidenceGallery .evidence-thumb').forEach(el => {
    el.classList.remove('is-selected');
  });
  if (thumbImgEl) {
    thumbImgEl.closest('.evidence-thumb').classList.add('is-selected');
  }
}

function hideEvidencePreview() {
  document.getElementById('evidencePreview').style.display = 'none';
  document.getElementById('evidencePreviewImg').src = '';
}

/* ---------------------------------------------------------
   ACTIONS
   --------------------------------------------------------- */
async function deleteComplaintImage(complaintId, imageId) {
  if (!confirm('Remove this evidence file? This cannot be undone.')) return;
  try {
    const res = await fetch(`${COMPLAINTS_API}/${complaintId}/images/${imageId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to remove file');

    // update local cache + modal without a full reload
    const item = complaintsCache.find(c => c.id === complaintId);
    if (item) {
      item.images = (item.images || []).filter(img => img.id !== imageId);
      renderEvidenceGallery(complaintId, item.images);
    }
    showToast('Evidence file removed.');
  } catch (err) {
    console.error(err);
    showToast('Could not remove that file.');
  }
}

async function quickDeleteComplaint(id) {
  if (!confirm('Delete this complaint and all its attached evidence? This cannot be undone.')) return;
  try {
    const res = await fetch(`${COMPLAINTS_API}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    await renderComplaints();
    showToast('Complaint deleted.');
  } catch (err) {
    console.error(err);
    showToast('Could not delete complaint.');
  }
}

async function handleDeleteFromModal() {
  const id = Number(document.getElementById('complaintId').value);
  if (!id) return;
  if (!confirm('Delete this complaint and all its attached evidence? This cannot be undone.')) return;
  try {
    const res = await fetch(`${COMPLAINTS_API}/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    closeComplaintModal();
    await renderComplaints();
    showToast('Complaint deleted.');
  } catch (err) {
    console.error(err);
    showToast('Could not delete complaint.');
  }
}

async function handleStatusSubmit(e) {
  e.preventDefault();
  const id = Number(document.getElementById('complaintId').value);
  const newStatus = document.getElementById('statusSelect').value;

  try {
    const res = await fetch(`${COMPLAINTS_API}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (!res.ok) throw new Error('Update failed');

    await renderComplaints();
    closeComplaintModal();
    showToast('Complaint status updated to "' + newStatus + '".');
  } catch (err) {
    console.error(err);
    showToast('Could not update status.');
  }
}

/* ---------------------------------------------------------
   HELPERS
   --------------------------------------------------------- */
function escapeHtmlComplaint(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : str;
  return div.innerHTML;
}
function escapeAttrComplaint(str) {
  return escapeHtmlComplaint(str).replace(/"/g, '&quot;');
}
function formatDateComplaint(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

/* ---------------------------------------------------------
   INIT
   --------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  renderComplaints();

  document.getElementById('statusFilter').addEventListener('change', (e) => {
    currentFilter = e.target.value;
    renderComplaints();
  });
  document.getElementById('searchInput').addEventListener('input', (e) => {
    currentSearch = e.target.value;
    renderComplaints();
  });

  document.getElementById('closeComplaintModalBtn').addEventListener('click', closeComplaintModal);
  document.getElementById('cancelComplaintModalBtn').addEventListener('click', closeComplaintModal);
  document.getElementById('statusForm').addEventListener('submit', handleStatusSubmit);
  document.getElementById('deleteComplaintBtn').addEventListener('click', handleDeleteFromModal);

  // Click a thumbnail to preview it larger, right inside the modal
  document.getElementById('evidenceGallery').addEventListener('click', (e) => {
    const img = e.target.closest('.evidence-img');
    if (!img) return;
    showEvidencePreview(img.dataset.src, img);
  });
});