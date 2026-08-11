/* ==========================================================================
   officials.js — BARANGAY OFFICIALS PAGE (public, read-only)
   Requires js/common.js to be loaded first (mobile nav, active link, etc.)

   Pulls live data from the admin panel via:  GET /api/officials
   Renders four groups: category === 'captain' | 'kagawad' | 'sk' | 'secretariat'.
   ========================================================================== */

const FALLBACK_PHOTO = "https://picsum.photos/seed/bsi-placeholder/400/400";

async function fetchOfficials() {
  try {
    const res = await fetch("/api/officials");
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return await res.json();
  } catch (err) {
    console.error("Could not load officials:", err);
    return [];
  }
}

function renderCaptain(captain) {
  const container = document.getElementById("captainContainer");
  if (!container) return;

  if (!captain) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <div class="official-card captain">
      <div class="official-photo">
        <span class="official-rank">Punong Barangay</span>
        <img src="${captain.photo_url || FALLBACK_PHOTO}" alt="Portrait of ${escapeHtml(captain.name)}">
      </div>
      <div class="official-info">
        <div class="name">${escapeHtml(captain.name)}</div>
        <div class="role">${escapeHtml(captain.position)}</div>
        ${captain.committee ? `<p class="committee">${escapeHtml(captain.committee)}</p>` : ""}
      </div>
    </div>
  `;
}

function renderKagawads(list) {
  const container = document.getElementById("kagawadContainer");
  if (!container) return;

  container.innerHTML = list.map(o => `
    <div class="official-card">
      <div class="official-photo">
        <span class="official-rank">Kagawad</span>
        <img src="${o.photo_url || FALLBACK_PHOTO}" alt="Portrait of ${escapeHtml(o.name)}">
      </div>
      <div class="official-info">
        <div class="name">${escapeHtml(o.name)}</div>
        <div class="role">${escapeHtml(o.position)}</div>
        ${o.committee ? `<p class="committee">${escapeHtml(o.committee)}</p>` : ""}
      </div>
    </div>
  `).join("");
}

function renderSk(list) {
  const container = document.getElementById("skContainer");
  if (!container) return;

  container.innerHTML = list.map(o => `
    <div class="staff-card">
      <img src="${o.photo_url || FALLBACK_PHOTO}" alt="Portrait of ${escapeHtml(o.name)}">
      <div>
        <div class="name">${escapeHtml(o.name)}</div>
        <div class="role">${escapeHtml(o.position)}</div>
      </div>
    </div>
  `).join("");
}

function renderSecretariat(list) {
  const container = document.getElementById("secretariatContainer");
  if (!container) return;

  container.innerHTML = list.map(o => `
    <div class="staff-card">
      <img src="${o.photo_url || FALLBACK_PHOTO}" alt="Portrait of ${escapeHtml(o.name)}">
      <div>
        <div class="name">${escapeHtml(o.name)}</div>
        <div class="role">${escapeHtml(o.position)}</div>
      </div>
    </div>
  `).join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

async function loadOfficials() {
  const all = await fetchOfficials();
  const captain = all.find(o => o.category === "captain") || null;
  const kagawads = all.filter(o => o.category === "kagawad");
  const sk = all.filter(o => o.category === "sk");
  const secretariat = all.filter(o => o.category === "secretariat");

  renderCaptain(captain);
  renderKagawads(kagawads);
  renderSk(sk);
  renderSecretariat(secretariat);
}

document.addEventListener("DOMContentLoaded", loadOfficials);