/* ==========================================================================
   🌐 PUBLIC SITE — complaint.js
   Path in project: user_script/complaint.js
   Paired page:      user_html/complaint.html

   complaint.js — FILE A COMPLAINT PAGE (public site)
   Requires js/common.js to be loaded first (SITE_CONFIG), if present.

   Submits directly to the backend at POST /complaints as
   multipart/form-data, since residents can now attach MULTIPLE
   evidence photos/files per complaint. No more localStorage for the
   complaint data itself — the admin panel's Complaints page reads
   straight from the same database this writes to.

   NEW: a "status token" is generated once per browser and stored in
   localStorage. It's sent along with every complaint filed from this
   browser so status-panel.js can later look up "my complaints" without
   requiring an account/login.
   ========================================================== */
document.addEventListener('DOMContentLoaded', function () {

  var API_BASE = (typeof SITE_CONFIG !== 'undefined' && SITE_CONFIG.API_BASE_URL) || '';
  const COMPLAINT_API = API_BASE + "/complaints";

  var complaintForm = document.getElementById('complaint-form');
  var confirmPanel = document.getElementById('confirm-panel');
  var confirmBadge = document.getElementById('confirm-badge');
  var confirmTitle = document.getElementById('confirm-title');
  var confirmMessage = document.getElementById('confirm-message');
  var confirmStatusLine = document.getElementById('confirm-status-line');
  var confirmNote = document.getElementById('confirm-note');
  var trackingEl = document.getElementById('tracking-code');

  var STATUS_LABELS = {
    Pending: 'Pending review by the barangay',
    'In Progress': 'Currently being handled',
    Resolved: 'Resolved'
  };

  /* ---------------------------------------------------------------------
     "One open complaint at a time" — a resident can't file a new one
     while their last complaint (tracked via a code kept in localStorage,
     no login needed) is still Pending or In Progress. This checks the
     real status from the backend, not just whether a tracking code
     exists locally, so it also unlocks automatically once an admin
     marks it Resolved.
     --------------------------------------------------------------------- */
  function showOngoingPanel(data) {
    if (complaintForm) complaintForm.style.display = 'none';
    if (trackingEl) trackingEl.textContent = data.tracking_code;
    if (confirmBadge) confirmBadge.textContent = '⏳';
    if (confirmTitle) confirmTitle.textContent = 'You Have an Ongoing Complaint';
    if (confirmMessage) {
      confirmMessage.textContent = 'Please wait for your existing complaint to be resolved by the barangay before filing another one.';
    }
    if (confirmStatusLine) {
      confirmStatusLine.textContent = 'Current status: ' + (STATUS_LABELS[data.status] || data.status);
    }
    if (confirmNote) {
      confirmNote.textContent = 'This page will unlock automatically once the barangay marks your complaint resolved.';
    }
    if (confirmPanel) {
      confirmPanel.classList.add('is-active');
      confirmPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function showJustSubmittedPanel(data) {
    if (complaintForm) complaintForm.style.display = 'none';
    if (trackingEl) trackingEl.textContent = data.tracking_code;
    if (confirmBadge) confirmBadge.textContent = '✓';
    if (confirmTitle) confirmTitle.textContent = 'Complaint Received';
    if (confirmMessage) {
      confirmMessage.textContent = 'Your complaint has been logged. Please keep your tracking number for follow-up at the Barangay Hall.';
    }
    if (confirmStatusLine) {
      confirmStatusLine.textContent = 'Current status: Pending review by the barangay';
    }
    if (confirmNote) {
      confirmNote.textContent = "A barangay staff member will contact you within 2 business days to schedule mediation. You won't be able to file another complaint until this one is marked resolved.";
    }
    if (confirmPanel) {
      confirmPanel.classList.add('is-active');
      confirmPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function unlockForm() {
    if (confirmPanel) confirmPanel.classList.remove('is-active');
    if (complaintForm) complaintForm.style.display = 'grid';
  }

  function checkExistingComplaint() {
    var trackingCode = localStorage.getItem('complaintTracking');
    if (!trackingCode) {
      unlockForm();
      return;
    }

    fetch(COMPLAINT_API + '/status/' + encodeURIComponent(trackingCode))
      .then(function (res) {
        if (res.status === 404) {
          // Stale/unknown code — don't block filing.
          localStorage.removeItem('complaintTracking');
          unlockForm();
          return null;
        }
        if (!res.ok) throw new Error('Failed to check complaint status');
        return res.json();
      })
      .then(function (data) {
        if (!data) return;
        if (data.status === 'Resolved') {
          localStorage.removeItem('complaintTracking');
          unlockForm();
        } else {
          showOngoingPanel(data);
        }
      })
      .catch(function (err) {
        console.error(err);
        // Network hiccup — don't lock the resident out over that.
        unlockForm();
      });
  }

  checkExistingComplaint();

  var checkStatusBtn = document.getElementById('check-status-btn');
  if (checkStatusBtn) {
    checkStatusBtn.addEventListener('click', function () {
      checkStatusBtn.disabled = true;
      checkStatusBtn.textContent = 'Checking...';
      Promise.resolve(checkExistingComplaint()).finally(function () {
        checkStatusBtn.disabled = false;
        checkStatusBtn.textContent = 'Check Status';
      });
    });
  }
 

  /* ---------------- File picker (complaint attachments) ----------------
     A plain <input type="file" multiple"> REPLACES its selection every
     time the picker is opened again — it doesn't add to it. So a resident
     attaching evidence one photo at a time (open picker, pick one, open
     picker again, pick another) would only ever end up submitting the
     last one picked. This keeps its own running list (stagedFiles) that
     files get added to across multiple picker opens, and rebuilds the
     FormData from that list on submit instead of from fileInput.files
     directly. ---------------- */
  var fileInput = document.getElementById('evidence-file');
  var fileDrop = document.getElementById('file-drop');
  var stagedList = document.getElementById('staged-files');
  var MAX_FILES = 10; // matches upload.array("evidence", 10) on the server
  var stagedFiles = [];

  function isDuplicate(file) {
    return stagedFiles.some(function (f) {
      return f.name === file.name && f.size === file.size && f.lastModified === file.lastModified;
    });
  }

  function renderStagedFiles() {
    var label = fileDrop ? fileDrop.querySelector('.fname') : null;
    if (label) {
      label.textContent = stagedFiles.length === 0
        ? 'No file selected'
        : stagedFiles.length + ' file' + (stagedFiles.length === 1 ? '' : 's') + ' attached';
    }
    if (!stagedList) return;
    stagedList.innerHTML = '';
    stagedFiles.forEach(function (file, index) {
      var li = document.createElement('li');
      var nameSpan = document.createElement('span');
      nameSpan.className = 'staged-name';
      nameSpan.textContent = file.name;
      var removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.title = 'Remove this file';
      removeBtn.textContent = '✕';
      removeBtn.addEventListener('click', function () {
        stagedFiles.splice(index, 1);
        renderStagedFiles();
      });
      li.appendChild(nameSpan);
      li.appendChild(removeBtn);
      stagedList.appendChild(li);
    });
  }

  if (fileInput && fileDrop) {
    fileInput.addEventListener('change', function () {
      var picked = fileInput.files ? Array.from(fileInput.files) : [];

      picked.forEach(function (file) {
        if (stagedFiles.length >= MAX_FILES) return;
        if (isDuplicate(file)) return;
        stagedFiles.push(file);
      });

      if (stagedFiles.length > MAX_FILES) {
        stagedFiles = stagedFiles.slice(0, MAX_FILES);
      }

      // Clear the input so the SAME file can be re-picked later if
      // removed, and so the next "change" event always reflects a
      // fresh selection rather than appending browser-side duplicates.
      fileInput.value = '';

      renderStagedFiles();
    });
  }

  /* ---------------------------------------------------------------------
     Complaint form submission — sends straight to the backend.
     --------------------------------------------------------------------- */
  if (complaintForm) {
    complaintForm.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!complaintForm.checkValidity()) {
        complaintForm.reportValidity();
        return;
      }

      var submitBtn = complaintForm.querySelector('button[type="submit"]');
      var issueType = document.getElementById('issue-type');

      var formData = new FormData();
      formData.append('name', document.getElementById('c-name').value.trim());
      formData.append('contact', document.getElementById('c-contact').value.trim());
      formData.append('address', document.getElementById('c-address').value.trim());
      formData.append('issueType', issueType ? issueType.value : 'other');
      formData.append(
        'category',
        issueType && issueType.options[issueType.selectedIndex]
          ? issueType.options[issueType.selectedIndex].text
          : 'Other Concern'
      );
      formData.append('otherParty', document.getElementById('c-otherparty').value.trim());
      formData.append('details', document.getElementById('c-details').value.trim());
      formData.append(
        'urgency',
        (document.querySelector('input[name="urgency"]:checked') || {}).value || 'routine'
      );
     

      var files = stagedFiles;
      for (var i = 0; i < files.length; i++) {
        formData.append('evidence', files[i]); // field name must match upload.array("evidence", ...) on the server
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
      }

      fetch(COMPLAINT_API, {
        method: 'POST',
        body: formData
      })
        .then(function (res) {
          if (!res.ok) {
            return res.json().catch(function () { return {}; }).then(function (body) {
              throw new Error(body.error || 'Failed to submit complaint');
            });
          }
          return res.json();
        })
        .then(function (data) {

                // Save the tracking code for future visits — this is what
                // locks the form until an admin marks it Resolved.
                localStorage.setItem(
                    "complaintTracking",
                    data.tracking_code
                );

                showJustSubmittedPanel(data);

                stagedFiles = [];
                renderStagedFiles();

                if (window.BSIStatusPanel &&
                    typeof window.BSIStatusPanel.refresh === 'function') {
                    window.BSIStatusPanel.refresh();
                }

        })
        .catch(function (err) {
          console.error(err);
          alert(err.message || 'Something went wrong submitting your complaint. Please try again.');
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Complaint';
          }
        });
    });
  }

});