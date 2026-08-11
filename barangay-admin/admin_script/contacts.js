/* =========================================================
   CONTACTS.JS — Manage the barangay office contact details
   and the emergency hotline directory.

   Data shape stored under localStorage key 'brgy_contacts':
   {
     address, phone, email, officeHours, facebook,
     hotlines: [
       { id, label, number, availability, priority, note }
     ]
   }
   ========================================================= */

/* ---------------------------------------------------------
   🔌 SERVER CONNECTION POINT
   Replace localStorage with real API calls, e.g.:

     async function loadContacts() {
       const res = await fetch('/api/contacts');
       return await res.json();
     }
     async function saveContacts(data) {
       await fetch('/api/contacts', {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(data)
       });
     }

   The hotline Add/Edit/Delete actions below all go through
   saveContacts(data), so once loadContacts/saveContacts talk
   to a real API, hotline CRUD automatically does too — no
   other function needs to change.
   --------------------------------------------------------- */
async function loadContacts() {

    const contactRes = await fetch("/contacts");

    if (!contactRes.ok) {
        throw new Error(`Failed to load contacts (${contactRes.status})`);
    }

    const hotlineRes = await fetch("/contacts/hotlines");

    if (!hotlineRes.ok) {
        throw new Error(`Failed to load hotlines (${hotlineRes.status})`);
    }

    const contact = await contactRes.json();
    const hotlines = await hotlineRes.json();

   return {
    address: contact.address || "",
    phone: contact.phone || "",
    email: contact.email || "",
    officeHours: contact.office_hours || "",
    facebook: contact.facebook || "",
    hotlines: hotlines || []
};
}
async function saveContacts(data){

    await fetch("/contacts",{

        method:"PUT",

        headers:{
            "Content-Type":"application/json"
        },

        body:JSON.stringify({
            address:data.address,
            phone:data.phone,
            email:data.email,
            office_hours:data.officeHours,
            facebook:data.facebook
        })

    });

}

/* ---------------------------------------------------------
   FILL OFFICE-DETAILS FORM WITH CURRENT DATA
   --------------------------------------------------------- */
async function fillContactsForm() {

    const data = await loadContacts();

    document.getElementById("cAddress").value = data.address;
    document.getElementById("cPhone").value = data.phone;
    document.getElementById("cEmail").value = data.email;
    document.getElementById("cHours").value = data.officeHours;
    document.getElementById("cFacebook").value = data.facebook;

}

/* ---------------------------------------------------------
   SAVE OFFICE-DETAILS FORM ON SUBMIT
   --------------------------------------------------------- */
async function handleContactsSubmit(e){

    e.preventDefault();

    const data = {

        address:document.getElementById("cAddress").value.trim(),
        phone:document.getElementById("cPhone").value.trim(),
        email:document.getElementById("cEmail").value.trim(),
        officeHours:document.getElementById("cHours").value.trim(),
        facebook:document.getElementById("cFacebook").value.trim()

    };

    await saveContacts(data);

    showToast("Contact info updated.");

}
/* ---------------------------------------------------------
   HOTLINE DIRECTORY — RENDER
   --------------------------------------------------------- */
async function renderHotlines() {
  const data = await loadContacts();
  const tbody = document.getElementById('hotlineTableBody');
  const emptyState = document.getElementById('hotlineEmptyState');

  tbody.innerHTML = '';

  if (!data.hotlines.length) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  data.hotlines.forEach(h => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(h.label)}</td>
      <td class="num">${escapeHtml(h.number)}</td>
      <td>${escapeHtml(h.availability || '')}</td>
      <td>${h.priority ? '<span class="badge badge-resolved">Priority</span>' : ''}</td>
      <td>
        <div class="row-actions">
          <button type="button" class="icon-btn" title="Edit" data-edit="${h.id}">✎</button>
          <button type="button" class="icon-btn danger" title="Delete" data-delete="${h.id}">🗑</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

/* ---------------------------------------------------------
   HOTLINE DIRECTORY — ADD / EDIT MODAL
   --------------------------------------------------------- */
async function openHotlineModal(hotlineId) {
  const overlay = document.getElementById('hotlineModalOverlay');
  const title = document.getElementById('hotlineModalTitle');
  const form = document.getElementById('hotlineForm');
  form.reset();
  document.getElementById('hLineId').value = '';

  if (hotlineId) {
    const data = await loadContacts();
    const hotline = data.hotlines.find(h => h.id === hotlineId);
    if (hotline) {
      title.textContent = 'Edit Hotline';
      document.getElementById('hLineId').value = hotline.id;
      document.getElementById('hLabel').value = hotline.label || '';
      document.getElementById('hNumber').value = hotline.number || '';
      document.getElementById('hAvailability').value = hotline.availability || '';
      document.getElementById('hNote').value = hotline.note || '';
      document.getElementById('hPriority').checked = !!hotline.priority;
    }
  } else {
    title.textContent = 'Add Hotline';
  }

  overlay.classList.add('open');
}

function closeHotlineModal() {
  document.getElementById('hotlineModalOverlay').classList.remove('open');
}

async function handleHotlineSubmit(e){

    e.preventDefault();

    const id = document.getElementById("hLineId").value;

    const entry = {

        label:document.getElementById("hLabel").value.trim(),
        number:document.getElementById("hNumber").value.trim(),
        availability:document.getElementById("hAvailability").value.trim(),
        note:document.getElementById("hNote").value.trim(),
        priority:document.getElementById("hPriority").checked

    };

    if(id){

        await fetch(`/contacts/hotlines/${id}`,{

            method:"PUT",

            headers:{
                "Content-Type":"application/json"
            },

            body:JSON.stringify(entry)

        });

    }else{

        await fetch("/contacts/hotlines",{

            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },

            body:JSON.stringify(entry)

        });

    }

    closeHotlineModal();

    await renderHotlines();

    showToast(id ? "Hotline updated." : "Hotline added.");

}

async function deleteHotline(id){

    if(!confirm("Remove this hotline?")) return;

    await fetch(`/contacts/hotlines/${id}`,{

        method:"DELETE"

    });


    await renderHotlines();

    showToast("Hotline removed.");

}
/* ---------------------------------------------------------
   INIT
   --------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", async () => {

    await fillContactsForm();

    await renderHotlines();

    document.getElementById("contactsForm")
        .addEventListener("submit", handleContactsSubmit);

    document.getElementById("hotlineForm")
        .addEventListener("submit", handleHotlineSubmit);

    document.getElementById("addHotlineBtn")
        .addEventListener("click", () => openHotlineModal(null));

    document.getElementById("hotlineModalClose")
        .addEventListener("click", closeHotlineModal);

    document.getElementById("hotlineCancelBtn")
        .addEventListener("click", closeHotlineModal);

    document.getElementById("hotlineModalOverlay")
        .addEventListener("click", e => {

            if(e.target.id==="hotlineModalOverlay")
                closeHotlineModal();

        });

    document.getElementById("hotlineTableBody")
        .addEventListener("click", e=>{

            const editId=e.target.dataset.edit;
            const deleteId=e.target.dataset.delete;

            if(editId)
                openHotlineModal(editId);

            if(deleteId)
                deleteHotline(deleteId);

        });

});
