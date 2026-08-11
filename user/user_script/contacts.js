/* =========================================================
   CONTACTS.JS (public site) — Reads the office details and
   emergency hotline directory maintained by the admin's
   "Contact Info" page and renders them on this page.

   Data shape read from localStorage key 'brgy_contacts':
   {
     address, phone, email, officeHours, facebook,
     hotlines: [
       { id, label, number, availability, priority, note }
     ]
   }
   ========================================================= */

/* ---------------------------------------------------------
   🔌 SERVER CONNECTION POINT
   Replace localStorage with a real API call, e.g.:

     async function loadContactsInfo() {
       const res = await fetch('/api/contacts');
       return await res.json();
     }
   --------------------------------------------------------- */
const CONTACT_API = "/user/contacts";
const HOTLINE_API = "/user/contacts/hotlines";


async function loadContactsInfo() {
  try {

    const [contactRes, hotlineRes] = await Promise.all([
      fetch(CONTACT_API),
      fetch(HOTLINE_API)
    ]);

    if (!contactRes.ok || !hotlineRes.ok) {
      throw new Error("Failed to load contact data");
    }

    const contact = (await contactRes.json()) || {};

    let hotlines = await hotlineRes.json();

    if (!Array.isArray(hotlines)) {
      hotlines = [];
    }

    return {
      ...contact,
      hotlines
    };

  } catch (err) {

    console.error(err);

    return {
      hotlines: []
    };

  }
}


/* Starter hotlines shown the first time the page loads, before
   the admin has added anything of their own. The admin can edit,
   add to, or delete these from the Contact Info page. */


function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

/* ---------------------------------------------------------
   RENDER: priority cards + full directory table
   --------------------------------------------------------- */
function renderHotlines(data) {
  const grid = document.getElementById('hotlinePriorityGrid');
  const tbody = document.getElementById('hotlineTableBody');
  if (!grid || !tbody) return;

  const priorityLines = data.hotlines.filter(h => h.priority);

  grid.innerHTML = priorityLines.map(h => `
    <div class="hotline-priority-card">
      <span class="label">${escapeHtml(h.label)}</span>
      <div class="number">${escapeHtml(h.number)}</div>
      <span class="service">${escapeHtml(h.note || h.availability || '')}</span>
    </div>
  `).join('');

  tbody.innerHTML = data.hotlines.map(h => `
    <tr>
      <td>${escapeHtml(h.label)}</td>
      <td class="num">${escapeHtml(h.number)}</td>
      <td>${escapeHtml(h.availability || '')}</td>
    </tr>
  `).join('');
}

/* ---------------------------------------------------------
   RENDER: office details column
   --------------------------------------------------------- */
function renderOfficeDetails(data) {
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el && value) el.textContent = value;
  };
  setText('contactAddress', data.address);
  setText('contactPhone', data.phone);
  setText('contactEmail', data.email);
  setText('contactHours', data.office_hours);
}

/* ---------------------------------------------------------
   INIT
   --------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", async () => {

  const data = await loadContactsInfo();

  renderOfficeDetails(data);

  renderHotlines(data);

});