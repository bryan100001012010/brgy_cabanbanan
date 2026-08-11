/* =========================================================
   CERT.JS — Manage the certificate types offered by the barangay.
   Whatever is saved here is what should appear as the list of
   requestable certificates on the public/user-facing website.
   ========================================================= */

/* ---------------------------------------------------------
   🔌 SERVER CONNECTION POINT
   Replace localStorage calls with real API requests, e.g.:

     async function loadCertificates() {
       const res = await fetch('/api/certificates');
       return await res.json();
     }
     async function createCertificate(data) {
       await fetch('/api/certificates', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(data)
       });
     }
     async function updateCertificate(id, data) {
       await fetch(`/api/certificates/${id}`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(data)
       });
     }
     async function deleteCertificateApi(id) {
       await fetch(`/api/certificates/${id}`, { method: 'DELETE' });
     }
   --------------------------------------------------------- */
async function loadCertificates() {
    const res = await fetch("/certificates");

    if (!res.ok) {
        throw new Error(`Failed to load certificates (${res.status})`);
    }

    return await res.json();
}
async function createCertificate(data) {

    const res = await fetch("/certificates", {
        method: "POST",
        headers: {
            "Content-Type":"application/json"
        },
        body: JSON.stringify(data)
    });

    if(!res.ok){
        throw new Error(`Failed to create certificate (${res.status})`);
    }

    return await res.json();

}
async function updateCertificate(id,data){

    const res = await fetch(`/certificates/${id}`,{
        method:"PUT",
        headers:{
            "Content-Type":"application/json"
        },
        body:JSON.stringify(data)
    });

    if(!res.ok){
        throw new Error(`Failed to update certificate (${res.status})`);
    }

    return await res.json();

}
async function deleteCertificateApi(id){

    const res = await fetch(`/certificates/${id}`,{
        method:"DELETE"
    });

    if(!res.ok){
        throw new Error(`Failed to delete certificate (${res.status})`);
    }

}

/* ---------------------------------------------------------
   RENDER
   --------------------------------------------------------- */

async function renderCertificates() {
    try {

        const list = await loadCertificates();
        const container = document.getElementById("certList");
        const empty = document.getElementById("certEmpty");

        if (list.length === 0) {
            container.innerHTML = "";
            empty.style.display = "block";
            return;
        }

        empty.style.display = "none";

        container.innerHTML = list.map(cert => {

            const reqs = normalizeRequirements(cert.requirements);

            return `
                <div class="item-card">
                    <div class="avatar">📄</div>

                    <h4>${escapeHtmlCert(cert.name)}</h4>

                    <div class="muted">${escapeHtmlCert(cert.description)}</div>

                    <div class="muted">
                        <strong>Fee:</strong>
                        ${Number(cert.fee) === 0 ? "Free" : "₱" + cert.fee}
                    </div>

                    <div class="muted">
                        <strong>Processing:</strong>
                        ${escapeHtmlCert(cert.processingTime || cert.processing_time)}
                    </div>

                    <div class="muted">
                        <strong>Requirements (${reqs.length}):</strong>

                        ${
                            reqs.length
                                ? "<ul class='req-summary-list'>" +
                                  reqs.map(r => `<li>${escapeHtmlCert(r.title)}</li>`).join("") +
                                  "</ul>"
                                : "<em>None added yet</em>"
                        }
                    </div>

                    <div class="item-actions">
                        <button class="btn btn-secondary btn-sm" onclick="openCertModal(${cert.id})">Edit</button>

                        <button class="btn btn-danger btn-sm" onclick="deleteCertificate(${cert.id})">Delete</button>
                    </div>

                </div>
            `;

        }).join("");

    } catch (err) {

        console.error(err);
        showToast("Unable to load certificates.");

    }
}
/* ---------------------------------------------------------
   MODAL
   --------------------------------------------------------- */
async function openCertModal(id) {
  const modal = document.getElementById('certModal');
  const form = document.getElementById('certForm');
  form.reset();

  clearReqEditor();

  if (id) {
   const list = await loadCertificates();
   const item = list.find(c => c.id === Number(id));
   if (!item) {
    showToast("Certificate not found.");
    return;
}
    document.getElementById('certModalTitle').textContent = 'Edit Certificate Type';
    document.getElementById('certId').value = item.id;
    document.getElementById('certName').value = item.name;
    document.getElementById('certDescription').value = item.description;
    document.getElementById('certFee').value = item.fee;
    document.getElementById('certProcessing').value = item.processingTime;

    const reqs = normalizeRequirements(item.requirements);
    if (reqs.length) {
      reqs.forEach(r => addRequirementRow(r.title, r.detail));
    } else {
      addRequirementRow();
    }
  } else {
    document.getElementById('certModalTitle').textContent = 'Add Certificate Type';
    document.getElementById('certId').value = '';
    addRequirementRow();
  }
  modal.classList.add('open');
}

/* ---------------------------------------------------------
   REQUIREMENTS CHECKLIST EDITOR
   Each requirement is stored as { title, detail } so the public
   certificate.html page can render the same tap-to-expand
   checklist format it already uses, instead of one long string.
   --------------------------------------------------------- */
function clearReqEditor() {
  document.getElementById('reqListEditor').innerHTML = '';
}

function addRequirementRow(title = '', detail = '') {
  const editor = document.getElementById('reqListEditor');
  const row = document.createElement('div');
  row.className = 'req-editor-item';
  row.innerHTML = `
    <div class="req-editor-row">
      <input type="text" class="req-title-input" placeholder="Requirement title, e.g. Valid ID" value="${escapeAttrCert(title)}" required>
      <button type="button" class="btn btn-danger btn-sm remove-req-btn">✕</button>
    </div>
    <textarea class="req-detail-input" placeholder="Details residents should know (e.g. accepted IDs, notes)" required>${escapeHtmlCert(detail)}</textarea>
  `;
  row.querySelector('.remove-req-btn').addEventListener('click', () => {
    row.remove();
  });
  editor.appendChild(row);
}

function collectRequirements() {
  const rows = document.querySelectorAll('#reqListEditor .req-editor-item');
  const list = [];
  rows.forEach(row => {
    const title = row.querySelector('.req-title-input').value.trim();
    const detail = row.querySelector('.req-detail-input').value.trim();
    if (title || detail) list.push({ title, detail });
  });
  return list;
}

// Handles certs saved under the old format (requirements as one plain string)
// so existing localStorage data doesn't break when the admin edits it.
function normalizeRequirements(requirements) {
  if (Array.isArray(requirements)) return requirements;
  if (typeof requirements === 'string' && requirements.trim()) {
    return [{ title: requirements.trim(), detail: '' }];
  }
  return [];
}

function escapeAttrCert(str) {
  return escapeHtmlCert(str).replace(/"/g, '&quot;');
}
function closeCertModal() {
  document.getElementById('certModal').classList.remove('open');
}

/* ---------------------------------------------------------
   CRUD
   --------------------------------------------------------- */
   async function deleteCertificate(id) {
    if (!confirm("Delete this certificate type?")) return;

    await deleteCertificateApi(id);

    await renderCertificates();

    showToast("Certificate type deleted.");
}
async function handleCertSubmit(e) {
  e.preventDefault();
   const id = document.getElementById('certId').value;

  const requirements = collectRequirements();
  if (!requirements.length) {
    showToast('Add at least one requirement.');
    return;
  }

  const data = {
    name: document.getElementById('certName').value.trim(),
    description: document.getElementById('certDescription').value.trim(),
    fee: document.getElementById('certFee').value,
    processingTime: document.getElementById('certProcessing').value.trim(),
    requirements: requirements
  };

 if (id) {
    await updateCertificate(id, data);
} else {
    await createCertificate(data);
}

await renderCertificates();
closeCertModal();
showToast("Certificate type saved.");

}

/* ---------------------------------------------------------
   HELPERS
   --------------------------------------------------------- */
function escapeHtmlCert(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}


/* ---------------------------------------------------------
   INIT
   --------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  renderCertificates();
  document.getElementById('addCertBtn').addEventListener('click', () => openCertModal(null));
  document.getElementById('addReqBtn').addEventListener('click', () => addRequirementRow());
  document.getElementById('closeCertModalBtn').addEventListener('click', closeCertModal);
  document.getElementById('cancelCertModalBtn').addEventListener('click', closeCertModal);
  document.getElementById('certForm').addEventListener('submit', handleCertSubmit);
});