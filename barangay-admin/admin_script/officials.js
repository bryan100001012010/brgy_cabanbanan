/* =========================================================
   OFFICIALS-ADMIN.JS
   Manages Captain (single) / Kagawad (list) / SK (list) /
   Secretariat (list).
   Mirrors the grouping shown on the public officials page.
   ========================================================= */

/* ---------------------------------------------------------
   API
   --------------------------------------------------------- */
async function loadOfficials() {
  const res = await fetch("/admin/officials");
  return await res.json();
}

async function createOfficial(data) {
  const res = await fetch("/admin/officials", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Failed to create official (status ${res.status})`);
  }
  return await res.json();
}

async function updateOfficial(id, data) {
  const res = await fetch(`/admin/officials/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`Failed to update official (status ${res.status})`);
  return await res.json();
}

async function deleteOfficialApi(id) {
  const res = await fetch(`/admin/officials/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete official (status ${res.status})`);
  return await res.json();
}

async function uploadOfficialPhoto(file) {
  const fd = new FormData();
  fd.append("photo", file);
  const res = await fetch("/admin/officials/upload", { method: "POST", body: fd });
  if (!res.ok) throw new Error("Failed to upload photo");
  const { url } = await res.json();
  return url;
}

/* ---------------------------------------------------------
   RENDER
   --------------------------------------------------------- */
async function renderOfficials() {
  const all = await loadOfficials();

  const captain = all.find(o => o.category === "captain") || null;
  const kagawads = all.filter(o => o.category === "kagawad");
  const sk = all.filter(o => o.category === "sk");
  const secretariat = all.filter(o => o.category === "secretariat");

  renderCaptain(captain);
  renderGroup(kagawads, "kagawadList", "kagawadEmpty");
  renderGroup(sk, "skList", "skEmpty");
  renderGroup(secretariat, "secretariatList", "secretariatEmpty");
}

function renderCaptain(captain) {
  const card = document.getElementById("captainCard");
  const empty = document.getElementById("captainEmpty");
  const addBtn = document.getElementById("addCaptainBtn");

  if (!captain) {
    card.innerHTML = "";
    empty.style.display = "block";
    addBtn.style.display = "inline-flex";
    return;
  }

  empty.style.display = "none";
  addBtn.style.display = "none";

  card.innerHTML = `
    <div class="captain-item-card">
      <div class="avatar"${captain.photo_url ? ` style="background-image:url('${captain.photo_url}')"` : ""}>${captain.photo_url ? "" : initials(captain.name)}</div>
      <div class="captain-info">
        <h4>${escapeHtmlOfficial(captain.name)}</h4>
        <div class="muted">${escapeHtmlOfficial(captain.position)}</div>
        ${captain.committee ? `<div class="muted">${escapeHtmlOfficial(captain.committee)}</div>` : ""}
      </div>
      <div class="captain-actions">
        <button class="btn btn-secondary btn-sm" onclick="openOfficialModal('captain', ${captain.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteOfficial(${captain.id})">Delete</button>
      </div>
    </div>
  `;
}

function renderGroup(list, listId, emptyId) {
  const container = document.getElementById(listId);
  const empty = document.getElementById(emptyId);

  if (list.length === 0) {
    container.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  container.innerHTML = list.map(o => `
    <div class="item-card">
      <div class="avatar"${o.photo_url ? ` style="background-image:url('${o.photo_url}')"` : ""}>${o.photo_url ? "" : initials(o.name)}</div>
      <h4>${escapeHtmlOfficial(o.name)}</h4>
      <div class="muted">${escapeHtmlOfficial(o.position)}</div>
      ${o.committee ? `<div class="muted">${escapeHtmlOfficial(o.committee)}</div>` : ""}
      <div class="item-actions">
        <button class="btn btn-secondary btn-sm" onclick="openOfficialModal('${o.category}', ${o.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteOfficial(${o.id})">Delete</button>
      </div>
    </div>
  `).join("");
}

/* ---------------------------------------------------------
   PHOTO HANDLING (real upload, not a data URL)
   --------------------------------------------------------- */
function setPhotoPreview(url, name) {
  const preview = document.getElementById("officialPhotoPreview");
  const removeBtn = document.getElementById("removeOfficialPhotoBtn");
  document.getElementById("officialPhotoUrl").value = url || "";

  if (url) {
    preview.style.backgroundImage = `url('${url}')`;
    preview.innerHTML = "";
    removeBtn.style.display = "inline-flex";
  } else {
    preview.style.backgroundImage = "";
    preview.innerHTML = `<span id="officialPhotoPreviewInitials">${name ? initials(name) : "＋"}</span>`;
    removeBtn.style.display = "none";
  }
}

function initials(name) {
  return name.replace("Hon.", "").trim().split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

/* ---------------------------------------------------------
   MODAL
   --------------------------------------------------------- */
const CATEGORY_LABELS = {
  captain: { title: "Barangay Captain", positionLabel: "Position", positionPlaceholder: "e.g. Barangay Captain" },
  kagawad: { title: "Kagawad", positionLabel: "Committee Assignment", positionPlaceholder: "e.g. Committee on Health" },
  sk: { title: "SK Official", positionLabel: "SK Position", positionPlaceholder: "e.g. SK Chairperson" },
  secretariat: { title: "Secretariat Staff", positionLabel: "Role", positionPlaceholder: "e.g. Barangay Secretary" }
};

async function openOfficialModal(category, id) {
  const modal = document.getElementById("officialModal");
  const form = document.getElementById("officialForm");
  form.reset();

  const labels = CATEGORY_LABELS[category];
  document.getElementById("officialCategory").value = category;
  document.getElementById("officialPositionLabel").textContent = labels.positionLabel;
  document.getElementById("officialPosition").placeholder = labels.positionPlaceholder;

  if (id) {
    const all = await loadOfficials();
    const item = all.find(o => String(o.id) === String(id));

    if (!item) {
      showToast("Could not load that official for editing.");
      return;
    }

    document.getElementById("officialModalTitle").textContent = `Edit ${labels.title}`;
    document.getElementById("officialId").value = item.id;
    document.getElementById("officialName").value = item.name;
    document.getElementById("officialPosition").value = item.position;
    document.getElementById("officialCommittee").value = item.committee || "";
    setPhotoPreview(item.photo_url || "", item.name);
  } else {
    document.getElementById("officialModalTitle").textContent = `Add ${labels.title}`;
    document.getElementById("officialId").value = "";
    setPhotoPreview("", "");
  }

  modal.classList.add("open");
}

function closeOfficialModal() {
  document.getElementById("officialModal").classList.remove("open");
}

/* ---------------------------------------------------------
   CRUD
   --------------------------------------------------------- */
async function deleteOfficial(id) {
  if (!confirm("Remove this official from the list?")) return;
  try {
    await deleteOfficialApi(id);
  } catch (err) {
    console.error(err);
    showToast("Could not remove official. Please try again.");
    return;
  }
  await renderOfficials();
  showToast("Official removed.");
}

async function handleOfficialSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("officialId").value;

  const data = {
    name: document.getElementById("officialName").value.trim(),
    position: document.getElementById("officialPosition").value.trim(),
    category: document.getElementById("officialCategory").value,
    committee: document.getElementById("officialCommittee").value.trim(),
    photo_url: document.getElementById("officialPhotoUrl").value || ""
  };

  try {
    if (id) {
      await updateOfficial(id, data);
    } else {
      await createOfficial(data);
    }
  } catch (err) {
    console.error(err);
    showToast(err.message || "Could not save official. Please try again.");
    return;
  }

  await renderOfficials();
  closeOfficialModal();
  showToast("Official saved.");
}

/* ---------------------------------------------------------
   HELPERS
   --------------------------------------------------------- */
function escapeHtmlOfficial(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ---------------------------------------------------------
   INIT
   --------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  renderOfficials();

  document.getElementById("addCaptainBtn").addEventListener("click", () => openOfficialModal("captain", null));
  document.getElementById("addKagawadBtn").addEventListener("click", () => openOfficialModal("kagawad", null));
  document.getElementById("addSkBtn").addEventListener("click", () => openOfficialModal("sk", null));
  document.getElementById("addSecretariatBtn").addEventListener("click", () => openOfficialModal("secretariat", null));

  document.getElementById("closeOfficialModalBtn").addEventListener("click", closeOfficialModal);
  document.getElementById("cancelOfficialModalBtn").addEventListener("click", closeOfficialModal);
  document.getElementById("officialForm").addEventListener("submit", handleOfficialSubmit);

  document.getElementById("officialPhoto").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await uploadOfficialPhoto(file);
      setPhotoPreview(url, document.getElementById("officialName").value);
    } catch (err) {
      console.error(err);
      showToast("Could not upload that image.");
    }
    e.target.value = "";
  });

  document.getElementById("removeOfficialPhotoBtn").addEventListener("click", () => {
    setPhotoPreview("", document.getElementById("officialName").value);
  });
});