/*
  ADMIN PANEL MODULE — logic
  --------------------------
  Wires up the .admin-chip in the topbar to open a modal for managing
  admin accounts (create / edit / remove name + username + password).

  BACKEND HOOKUP
  --------------
  Everything talks to the "AdminAPI" object below. Right now it's backed
  by localStorage as a placeholder so the UI is fully testable on its own.
  When your backend is ready, replace the 4 method bodies with real
  fetch() calls to your API — the rest of the file (rendering, modals,
  form handling) doesn't need to change. Example swap:
*/

/*
  IMPORTANT: passwords should never be hashed/verified client-side in a
  real deployment — send the plain password over HTTPS and hash it
  server-side (e.g. bcrypt). The localStorage placeholder below stores
  it in plain text purely for local demo purposes; don't ship that part.
*/

(function () {
  const STORAGE_KEY = 'barangay_admins';

  // ---------------------------------------------------------------------
  // AdminAPI — swap method bodies for real fetch() calls when ready
  // ---------------------------------------------------------------------
 const AdminAPI = {
    async getAll() {
      const res = await fetch('/admins');
      if (!res.ok) {
    throw new Error("Failed to load admins");
}
      return res.json();
      
      
    },
    async create(admin) {
      const res = await fetch('/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(admin)
      });
      if (!res.ok) {
    throw new Error("Failed to create admin");
}
      return res.json();
    },
    async update(id, changes) {
      const res = await fetch(`/admins/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes)
      });
      if (!res.ok) {
    throw new Error("Failed to update admin");
}
      return res.json();
    },
    async remove(id) {
    const res = await fetch(`/admins/${id}`, {
        method: "DELETE"
    });

    if (!res.ok) {
        throw new Error("Failed to delete admin");
    }

    return await res.json();
}
    
  }

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    const adminChip = document.querySelector('.admin-chip');
    const adminPanelModal = document.getElementById('adminPanelModal');
    const adminFormModal = document.getElementById('adminFormModal');

    // If this page doesn't have the admin panel markup included, do nothing.
    if (!adminChip || !adminPanelModal || !adminFormModal) return;

    const closeAdminPanelBtn = document.getElementById('closeAdminPanelBtn');
    const adminList = document.getElementById('adminList');
    const adminEmpty = document.getElementById('adminEmpty');
    const addAdminBtn = document.getElementById('addAdminBtn');

    const adminForm = document.getElementById('adminForm');
    const adminFormTitle = document.getElementById('adminFormTitle');
    const closeAdminFormBtn = document.getElementById('closeAdminFormBtn');
    const cancelAdminFormBtn = document.getElementById('cancelAdminFormBtn');
    const adminPasswordHint = document.getElementById('adminPasswordHint');

    const adminIdInput = document.getElementById('adminId');
    const adminNameInput = document.getElementById('adminName');
    const adminUsernameInput = document.getElementById('adminUsername');
    const adminPasswordInput = document.getElementById('adminPassword');

    // ---- Make the chip clickable & keyboard accessible -----------------
    adminChip.classList.add('clickable');
    adminChip.setAttribute('role', 'button');
    adminChip.setAttribute('tabindex', '0');
    adminChip.setAttribute('aria-haspopup', 'dialog');

    adminChip.addEventListener('click', openAdminPanel);
    adminChip.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openAdminPanel();
      }
    });

    // ---- Panel (list) open/close ---------------------------------------
    function openAdminPanel() {
      renderAdminList();
      adminPanelModal.classList.add('active');
    }
    function closeAdminPanel() {
      adminPanelModal.classList.remove('active');
    }
    closeAdminPanelBtn.addEventListener('click', closeAdminPanel);
    adminPanelModal.addEventListener('click', (e) => {
      if (e.target === adminPanelModal) closeAdminPanel();
    });

    // ---- Render list -----------------------------------------------------
    async function renderAdminList() {
      const admins = await AdminAPI.getAll();
      adminList.innerHTML = '';

      if (!admins.length) {
        adminEmpty.style.display = 'block';
        return;
      }
      adminEmpty.style.display = 'none';

      admins.forEach(admin => {
        const row = document.createElement('div');
        row.className = 'admin-row';
        row.dataset.id = admin.admin_id;
        row.innerHTML = `
          <div class="admin-row-info">
            <div class="admin-row-name">${escapeHtml(admin.full_name)}</div>
            <div class="admin-row-username">@${escapeHtml(admin.username)}</div>
          </div>
          <div class="admin-row-actions">
            <button type="button" class="btn-icon edit-admin-btn" data-id="${admin.admin_id}" title="Edit">✏️</button>
            <button type="button" class="btn-icon delete-admin-btn" data-id="${admin.admin_id}" title="Remove">🗑️</button>
          </div>
        `;
        adminList.appendChild(row);
      });
    }

    adminList.addEventListener('click', async (e) => {
      const editBtn = e.target.closest('.edit-admin-btn');
      const delBtn = e.target.closest('.delete-admin-btn');

      if (editBtn) {
        const admins = await AdminAPI.getAll();
        const admin = admins.find(a => a.admin_id === Number(editBtn.dataset.id));
        if (admin) openAdminForm(admin);
      }

      if (delBtn) {
        const admins = await AdminAPI.getAll();
        const admin = admins.find(a => a.admin_id === Number(delBtn.dataset.id));
        const label = admin ? `"${admin.full_name}"` : 'this admin';
        if (confirm(`Remove ${label}? This cannot be undone.`)) {
          await AdminAPI.remove(delBtn.dataset.id);
          renderAdminList();
        }
      }
    });

    // ---- Add/edit form ---------------------------------------------------
    addAdminBtn.addEventListener('click', () => openAdminForm(null));

    function openAdminForm(admin) {
      adminForm.reset();
      if (admin) {
        adminFormTitle.textContent = 'Edit Admin';
        adminIdInput.value = admin.admin_id;
        adminNameInput.value = admin.full_name;
        adminUsernameInput.value = admin.username;
        adminPasswordInput.required = false;
        adminPasswordInput.placeholder = 'Leave blank to keep current password';
        adminPasswordHint.textContent = 'Leave blank to keep the current password.';
      } else {
        adminFormTitle.textContent = 'New Admin';
        adminIdInput.value = '';
        adminPasswordInput.required = true;
        adminPasswordInput.placeholder = 'Set a password';
        adminPasswordHint.textContent = 'Minimum 6 characters.';
      }
      adminFormModal.classList.add('active');
      adminNameInput.focus();
    }

    function closeAdminForm() {
      adminFormModal.classList.remove('active');
    }
    closeAdminFormBtn.addEventListener('click', closeAdminForm);
    cancelAdminFormBtn.addEventListener('click', closeAdminForm);
    adminFormModal.addEventListener('click', (e) => {
      if (e.target === adminFormModal) closeAdminForm();
    });

    adminForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const id = adminIdInput.value;
      const full_name = adminNameInput.value.trim();
      const username = adminUsernameInput.value.trim();
      const password = adminPasswordInput.value;

      if (!id && password.length < 6) {
        alert('Password must be at least 6 characters.');
        return;
      }
      if (password && password.length < 6) {
        alert('Password must be at least 6 characters.');
        return;
      }

      try {
        if (id) {
          const changes = { full_name, username };
          if (password) changes.password = password;
          await AdminAPI.update(id, changes);
        } else {
          await AdminAPI.create({ full_name, username, password });
        }
        closeAdminForm();
        renderAdminList();
      } catch (err) {
        alert('Something went wrong: ' + err.message);
      }
    });

    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str == null ? '' : str;
      return div.innerHTML;
    }
  }
})();
