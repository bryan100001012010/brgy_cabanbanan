/* ============================================================
   middleware/requireAuth.js
   Server-side guard for admin-only API routes.

   Unlike the old sessionStorage flag (which any visitor could set
   from devtools without ever actually logging in), this checks the
   real session Express created when POST /admins/login succeeded.
   If there's no valid session, the request is rejected before it
   ever reaches the route handler — no matter how it was made
   (browser, curl, Postman, etc.), not just when the admin UI
   happens to be the one calling it.
   ============================================================ */

function requireAuth(req, res, next) {
    if (req.session && req.session.adminId) {
        return next();
    }
    res.status(401).json({ error: "Not authenticated" });
}

module.exports = requireAuth;