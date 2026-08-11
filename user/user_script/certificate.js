/* ==========================================================================
   certificate.js — CERTIFICATE REQUIREMENTS PAGE
   Requires js/common.js to be loaded first (SITE_CONFIG).
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function () {

  /* ---------------- Certificate tabs ---------------- */


  /* ---------------- Requirement accordion (click ID, etc. to expand) ----------------
     Uses event delegation (rather than binding each .req-toggle individually) because
     loadCertificateData() below may replace a panel's checklist with the admin's own
     requirements after this handler is attached — delegation means newly-inserted
     buttons work without any extra wiring. ---------------- */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.req-toggle');
    if (!btn) return;
    var item = btn.closest('.req-item');
    var wasOpen = item.classList.contains('is-open');
    item.classList.toggle('is-open', !wasOpen);
    btn.setAttribute('aria-expanded', !wasOpen ? 'true' : 'false');
  });

  loadCertificateData();
  renderMyRequests();
  wireRequestConfirmModal();

  // Poll so an approval made by the admin shows up here without
  // the resident needing to manually reload the page.
  setInterval(renderMyRequests, 15000);
});

/* ==========================================================================
   CERTIFICATE FEES / PROCESSING TIME / REQUIREMENTS — pulls the fee,
   processing time, description, and requirements checklist the admin sets
   on the "Certificates" page and updates the matching tab on
   certificate.html by certificate name. The admin's requirements are now
   stored as a list of { title, detail } items (same shape used here), so
   the checklist markup is rebuilt to match whatever the admin saved.
   ========================================================================== */
async function loadCertificateData() {

    const tabsContainer = document.getElementById("certificateTabs");
    const panelsContainer = document.getElementById("certificatePanels");

    try {

        const res = await fetch("/api/certificates");

        if (!res.ok) {
            throw new Error("Failed to load certificates");
        }

        const certificates = await res.json();

        tabsContainer.innerHTML = "";
        panelsContainer.innerHTML = "";

        certificates.forEach((cert, index) => {

            const tabId = `cert-tab-${cert.id}`;
            const panelId = `cert-panel-${cert.id}`;

            // ---------- TAB ----------
            tabsContainer.innerHTML += `
                <button
                    class="cert-tab ${index === 0 ? "is-active" : ""}"
                    data-target="${panelId}"
                    role="tab"
                    aria-selected="${index === 0}">
                    ${escapeHtmlCertificate(cert.name)}
                </button>
            `;

            // ---------- REQUIREMENTS ----------
            const requirements = normalizeRequirements(cert.requirements);

            const requirementHtml = requirements.map((req, i) => {

                const number = String(i + 1).padStart(2, "0");

                return `
                    <div class="req-item">

                        <button class="req-toggle" aria-expanded="false">

                            <span>

                                <span class="req-index">${number}</span>

                                ${escapeHtmlCertificate(req.title)}

                            </span>

                            <span class="chev">&#9662;</span>

                        </button>

                        <div class="req-detail">

                            ${req.detail
                                ? req.detail
                                      .split("\n")
                                      .map(line => `<p>${escapeHtmlCertificate(line)}</p>`)
                                      .join("")
                                : ""}

                        </div>

                    </div>
                `;

            }).join("");

// ---------- PANEL ----------
            panelsContainer.innerHTML += `
            <div
                class="cert-panel ${index === 0 ? "is-active" : ""}"
                id="${panelId}">

                <div class="cert-doc">

                    <div class="cert-doc-visual">

                        <div class="cert-stamp">
                            Official Document
                        </div>

                        <div class="fee">
                            <div class="amount">
                                ${Number(cert.fee) === 0 ? "Free" : "₱" + cert.fee}
                            </div>

                            <div class="amount-label">
                                Processing Fee
                            </div>
                        </div>

                        <div class="processing">
                            <strong>Processing Time</strong><br>
                            ${escapeHtmlCertificate(cert.processingTime || cert.processing_time)}
                        </div>

                        <button
                            type="button"
                            class="cert-request-btn"
                            data-cert-id="${cert.id}"
                            data-cert-name="${escapeAttrCertificate(cert.name)}"
                            onclick="handleRequestClick(this)">
                            Request This Certificate
                        </button>

                    </div>

                    <div class="cert-doc-body">

                        <h3>${escapeHtmlCertificate(cert.name)}</h3>

                        <p class="used-for">
                            ${escapeHtmlCertificate(cert.description)}
                        </p>

                        <div class="req-list">
                            ${requirementHtml}
                        </div>

                    </div>

                </div>

            </div>
            `;
        });

        // Reconnect the tab buttons
        document.querySelectorAll(".cert-tab").forEach(tab => {

            tab.addEventListener("click", function () {

                const target = this.dataset.target;

                document.querySelectorAll(".cert-tab").forEach(t => {
                    t.classList.remove("is-active");
                    t.setAttribute("aria-selected", "false");
                });

                this.classList.add("is-active");
                this.setAttribute("aria-selected", "true");

                document.querySelectorAll(".cert-panel").forEach(panel => {
                    panel.classList.toggle("is-active", panel.id === target);
                });

            });

        });

    } catch (err) {

        console.error(err);

    }

}

// Admin certificates saved before the checklist editor existed may still
// have `requirements` as one plain string — treat that as a single item
// so old data doesn't break this page.
function normalizeRequirements(requirements) {
  if (Array.isArray(requirements)) return requirements;
  if (typeof requirements === 'string' && requirements.trim()) {
    return [{ title: requirements.trim(), detail: '' }];
  }
  return [];
}

function renderRequirementChecklist(reqListEl, requirements) {
  reqListEl.innerHTML = requirements.map(function (req, i) {
    var index = String(i + 1).padStart(2, '0');
    var detailHtml = req.detail
      ? req.detail.split(/\n+/).map(function (line) {
          return '<p>' + escapeHtmlCertificate(line) + '</p>';
        }).join('')
      : '';
    return (
      '<div class="req-item">' +
        '<button class="req-toggle" aria-expanded="false">' +
          '<span><span class="req-index">' + index + '</span>' + escapeHtmlCertificate(req.title) + '</span>' +
          '<span class="chev">&#9662;</span>' +
        '</button>' +
        '<div class="req-detail">' + detailHtml + '</div>' +
      '</div>'
    );
  }).join('');
}

function escapeHtmlCertificate(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttrCertificate(str) {
  return escapeHtmlCertificate(str).replace(/"/g, '&quot;');
}

/* ==========================================================================
   CERTIFICATE REQUESTS — resident-facing flow
   1. Tap "Request This Certificate" on a panel.
   2. Confirm modal (Proceed / Cancel).
   3. On proceed, POST the request; it shows up under "Your Requests" as
      pending until the admin approves it, at which point it shows the
      claim code and what to bring.

   There's no login on this site, so each browser keeps a random clientId
   in localStorage and uses it to fetch/cancel only its own requests.
   ========================================================================== */

function getClientId() {
  var key = 'bsi_client_id';
  var id = localStorage.getItem(key);
  if (!id) {
    id = 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(key, id);
  }
  return id;
}

var pendingRequestCertId = null;

function wireRequestConfirmModal() {
  var overlay = document.getElementById('reqConfirmModal');
  var cancelBtn = document.getElementById('reqConfirmCancelBtn');
  var proceedBtn = document.getElementById('reqConfirmProceedBtn');

  cancelBtn.addEventListener('click', function () {
    pendingRequestCertId = null;
    overlay.classList.remove('open');
  });

  proceedBtn.addEventListener('click', async function () {
    var certId = pendingRequestCertId;
    overlay.classList.remove('open');
    pendingRequestCertId = null;
    if (certId) {
      await submitCertificateRequest(certId);
    }
  });
}

function handleRequestClick(btn) {
  var certId = btn.getAttribute('data-cert-id');
  var certName = btn.getAttribute('data-cert-name');

  pendingRequestCertId = certId;
  document.getElementById('reqConfirmText').textContent =
    'Request "' + certName + '"? This will be sent to the barangay admin for approval.';
  document.getElementById('reqConfirmModal').classList.add('open');
}

async function submitCertificateRequest(certId) {
  try {
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ certificateId: Number(certId), clientId: getClientId() })
    });

    if (!res.ok) throw new Error('Failed to submit request');

    await renderMyRequests();

    const section = document.getElementById('myRequestsSection');
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (err) {
    console.error(err);
    alert('Sorry, we could not send your request. Please try again.');
  }
}

async function cancelCertificateRequest(id) {
  if (!confirm('Cancel this request?')) return;

  try {
    const res = await fetch(`/api/requests/${id}?clientId=${encodeURIComponent(getClientId())}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to cancel request');
    await renderMyRequests();
  } catch (err) {
    console.error(err);
    alert('Sorry, we could not cancel this request. Please try again.');
  }
}

async function renderMyRequests() {
  const section = document.getElementById('myRequestsSection');
  const list = document.getElementById('myRequestsList');

  try {
    const res = await fetch(`/api/requests?clientId=${encodeURIComponent(getClientId())}`);
    if (!res.ok) throw new Error('Failed to load your requests');
    const requests = await res.json();

    if (!requests.length) {
      section.classList.add('is-empty');
      list.innerHTML = '';
      return;
    }

    section.classList.remove('is-empty');

    list.innerHTML = requests.map(r => {
      if (r.status === 'approved') {
        const reqs = normalizeRequirements(r.requirements);
        const reqListHtml = reqs.length
          ? reqs.map(req => `<li>${escapeHtmlCertificate(req.title)}</li>`).join('')
          : '';

        return `
          <div class="req-status-card">
            <span class="req-status-pill approved">Approved</span>
            <h4>${escapeHtmlCertificate(r.certificate_name)}</h4>
            <div class="req-code-box">
              <div class="lbl">Claim Code</div>
              <div class="code">${escapeHtmlCertificate(r.code)}</div>
            </div>
            <p class="req-approved-msg">Barangay approved to complete your request. Go to the barangay and bring:</p>
            <ul class="req-approved-list">${reqListHtml}</ul>
            <p class="req-claim-time">Claim until 1:00 PM – 5:00 PM.</p>
          </div>
        `;
      }

      // pending
      return `
        <div class="req-status-card">
          <span class="req-status-pill pending">Pending</span>
          <h4>${escapeHtmlCertificate(r.certificate_name)}</h4>
          <p class="req-status-note">Waiting for barangay admin approval.</p>
          <button class="req-status-cancel" onclick="cancelCertificateRequest(${r.id})">Cancel Request</button>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error(err);
  }
}