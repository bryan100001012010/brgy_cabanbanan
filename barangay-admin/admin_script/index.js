/* =========================================================
   INDEX.JS — Login page logic ONLY.
   This file is separate from common.js because the login page
   is the one page that must NOT run the "requireLogin()" guard
   (otherwise nobody could ever reach the login form).
   ========================================================= */

document.addEventListener('DOMContentLoaded', async () => {

  /* ---------------------------------------------------------
     PASSWORD SHOW/HIDE TOGGLE (the eye icon)
     Purely visual — toggles the input's type between
     "password" and "text" and swaps which eye icon is shown.
     --------------------------------------------------------- */
  const passwordInput = document.getElementById('password');
  const toggleBtn = document.getElementById('togglePasswordBtn');
  const eyeOpenIcon = document.getElementById('eyeOpenIcon');
  const eyeOffIcon = document.getElementById('eyeOffIcon');

  if (passwordInput && toggleBtn && eyeOpenIcon && eyeOffIcon) {
    toggleBtn.addEventListener('click', () => {
      const isCurrentlyHidden = passwordInput.type === 'password';

      passwordInput.type = isCurrentlyHidden ? 'text' : 'password';
      eyeOpenIcon.style.display = isCurrentlyHidden ? 'none' : 'block';
      eyeOffIcon.style.display = isCurrentlyHidden ? 'block' : 'none';

      toggleBtn.setAttribute('aria-pressed', String(isCurrentlyHidden));
      toggleBtn.setAttribute('aria-label', isCurrentlyHidden ? 'Hide password' : 'Show password');
    });
  }

  // If this browser already has a valid server-side session, skip
  // the login form. Checked against the server (not sessionStorage),
  // since a client-side flag can be faked from devtools without ever
  // actually logging in.
  try {
    const meRes = await fetch('/admins/me');
    if (meRes.ok) {
      window.location.href = '/admin/admin_html/home.html';
      return; // don't reveal the form — we're navigating away
    }
  } catch (err) {
    // Network hiccup — fall through and just show the login form.
  }

  // Only reached if the browser is NOT already logged in (or the
  // session check failed) — safe to reveal the form now.
  const loginWrap = document.querySelector('.login-wrap');
  if (loginWrap) loginWrap.classList.add('ready');

  const form = document.getElementById('loginForm');
  const errorMsg = document.getElementById('errorMsg');

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

   const username = document.getElementById("username").value.trim();
   const password = document.getElementById("password").value;
  
errorMsg.style.display = "none";

    try {
        const res = await fetch("/admins/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username,
                password
            })
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || "Invalid username or password");
        }

        // The server just set a real, httpOnly session cookie — that's
        // the actual login state now. This flag is kept only so pages
        // can redirect instantly without waiting on a fetch; every
        // admin page and every admin API call still checks the real
        // session server-side, not this flag.
        sessionStorage.setItem("brgy_admin_logged_in", "true");

        if (data.admin) {
            sessionStorage.setItem(
                "admin",
                JSON.stringify(data.admin)
            );
        }

        window.location.href = "/admin/admin_html/home.html";

    } catch (err) {
        errorMsg.textContent = err.message;
        errorMsg.style.display = "block";
    }
});
});