/* =========================================================
   REQUESTS.JS — Admin queue of certificate requests submitted
   by residents on the public site. Approving a request generates
   a claim code that is then shown back to the resident.
   ========================================================= */

async function loadRequests() {
    const res = await fetch("/requests");

    if (!res.ok) {
        throw new Error(`Failed to load requests (${res.status})`);
    }

    return await res.json();
}

async function approveRequestApi(id) {
    const res = await fetch(`/requests/${id}/approve`, { method: "PUT" });

    if (!res.ok) {
        throw new Error(`Failed to approve request (${res.status})`);
    }

    return await res.json();
}

async function removeRequestApi(id) {
    const res = await fetch(`/requests/${id}`, { method: "DELETE" });

    if (!res.ok) {
        throw new Error(`Failed to remove request (${res.status})`);
    }
}

/* ---------------------------------------------------------
   RENDER
   --------------------------------------------------------- */
async function renderRequests() {
    try {
        const all = await loadRequests();

        const pending = all.filter(r => r.status === "pending");
        const approved = all.filter(r => r.status === "approved");

        renderPending(pending);
        renderApproved(approved);

    } catch (err) {
        console.error(err);
        showToast("Unable to load requests.");
    }
}

function renderPending(pending) {
    const container = document.getElementById("pendingList");
    const empty = document.getElementById("pendingEmpty");

    if (!pending.length) {
        container.innerHTML = "";
        empty.style.display = "block";
        return;
    }
    empty.style.display = "none";

    container.innerHTML = pending.map(r => `
        <div class="item-card req-card">
            <div class="req-card-top">
                <h4>${escapeHtmlReq(r.certificate_name)}</h4>
                <span class="badge badge-pending">Pending</span>
            </div>

            <div class="req-when">Requested ${formatWhen(r.created_at)}</div>

            <div class="muted">
                <strong>Requirements:</strong>
                ${renderReqSummary(r.requirements)}
            </div>

            <div class="item-actions">
                <button class="btn btn-primary btn-sm" onclick="approveRequest(${r.id})">Approve</button>
                <button class="btn btn-danger btn-sm" onclick="removeRequest(${r.id})">Remove</button>
            </div>
        </div>
    `).join("");
}

function renderApproved(approved) {
    const container = document.getElementById("approvedList");
    const empty = document.getElementById("approvedEmpty");

    if (!approved.length) {
        container.innerHTML = "";
        empty.style.display = "block";
        return;
    }
    empty.style.display = "none";

    container.innerHTML = approved.map(r => `
        <div class="item-card req-card">
            <div class="req-card-top">
                <h4>${escapeHtmlReq(r.certificate_name)}</h4>
                <span class="badge badge-resolved">Approved</span>
            </div>

            <div class="req-when">Approved ${formatWhen(r.approved_at)}</div>

            <div class="req-code-block">
                <span>Claim code</span>
                <span class="code">${escapeHtmlReq(r.code)}</span>
            </div>

            <div class="item-actions">
                <button class="btn btn-danger btn-sm" onclick="removeRequest(${r.id})">Mark Claimed / Remove</button>
            </div>
        </div>
    `).join("");
}

function renderReqSummary(requirements) {
    const list = normalizeRequirementsReq(requirements);
    if (!list.length) return "<em>None listed</em>";
    return "<ul class='req-reqs'>" + list.map(r => `<li>${escapeHtmlReq(r.title)}</li>`).join("") + "</ul>";
}

function normalizeRequirementsReq(requirements) {
    if (Array.isArray(requirements)) return requirements;
    if (typeof requirements === "string" && requirements.trim()) {
        try {
            const parsed = JSON.parse(requirements);
            if (Array.isArray(parsed)) return parsed;
        } catch (e) { /* not JSON, fall through */ }
        return [{ title: requirements.trim(), detail: "" }];
    }
    return [];
}

function formatWhen(isoString) {
    if (!isoString) return "";
    const d = new Date(isoString);
    return d.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

/* ---------------------------------------------------------
   ACTIONS
   --------------------------------------------------------- */
async function approveRequest(id) {
    if (!confirm("Approve this request and generate a claim code?")) return;

    try {
        await approveRequestApi(id);
        await renderRequests();
        showToast("Request approved.");
    } catch (err) {
        console.error(err);
        showToast("Unable to approve this request.");
    }
}

async function removeRequest(id) {
    if (!confirm("Remove this request from the queue?")) return;

    try {
        await removeRequestApi(id);
        await renderRequests();
        showToast("Request removed.");
    } catch (err) {
        console.error(err);
        showToast("Unable to remove this request.");
    }
}

function escapeHtmlReq(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
}

/* ---------------------------------------------------------
   INIT — refresh on load, and poll so approvals for freshly
   submitted requests show up without a manual reload.
   --------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
    renderRequests();
    document.getElementById("refreshBtn").addEventListener("click", renderRequests);
    setInterval(renderRequests, 20000);
});