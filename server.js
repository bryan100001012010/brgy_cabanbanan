const express = require ("express");
const app = express();
const path = require("path");
const pool = require("./db");
const session = require("express-session");
const requireAuth = require("./middleware/requireAuth");


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ------------------------------------------------------------------
   SESSIONS — this is what actually keeps an admin "logged in" now.
   POST /admins/login sets req.session.adminId; every admin-only route
   below requires that session via requireAuth. The browser only ever
   holds a signed, httpOnly cookie — it can't read or fake this the
   way it could fake the old sessionStorage flag.

   SESSION_SECRET must be set in .env (any long random string). Set
   cookie.secure to true once this is served over HTTPS in production.
   ------------------------------------------------------------------ */
app.set("trust proxy", 1);

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 8 // 8 hours
    }
}));

// Serve static files (HTML, CSS, JS)
// Admin website
app.use("/admin", express.static(path.join(__dirname, "barangay-admin")));

// User website

app.use(express.static(path.join(__dirname, "user")));

// Routes
const adminRoutes = require("./routes/admin");
app.use("/admins", adminRoutes);

const contactsRoutes = require("./routes/contacts");
app.use("/contacts", requireAuth, contactsRoutes);

const certificateRoutes = require("./routes/certificates");
app.use("/certificates", requireAuth, certificateRoutes);

/* ------------------------------------------------------------------
   CERTIFICATE REQUESTS — same split as certificates:

     /requests      -> full admin queue (list all / approve / remove),
                        used only by the admin panel's
                        admin_script/requests.js

     /api/requests  -> resident-facing (submit / view own / cancel),
                        used only by the public site's
                        user_script/certificate.js
   ------------------------------------------------------------------ */
const requestsAdminRoutes = require("./routes/requests");
app.use("/requests", requireAuth, requestsAdminRoutes);

const requestsPublicRoutes = require("./routes/user/requests");
app.use("/api/requests", requestsPublicRoutes);

/* ------------------------------------------------------------------
   ANNOUNCEMENTS — split into two routers so the public site and the
   admin panel never share the same endpoints:

     /admin/announcements  -> full CRUD (create/edit/delete/upload),
                               used only by the admin panel's
                               admin_script/home.js

     /api/announcements    -> read-only feed, used only by the public
                               homepage's user_script/home.js
   ------------------------------------------------------------------ */
const announcementsAdminRoutes = require("./routes/announcements");
app.use("/admin/announcements", requireAuth, announcementsAdminRoutes);


const complaintsRoutes = require("./routes/complaints");
app.use("/admin/complaints", requireAuth, complaintsRoutes);

/* ------------------------------------------------------------------
   OFFICIALS — same split as announcements:

     /admin/officials  -> full CRUD + photo upload (admin panel only,
                           admin_script/officials-admin.js)

     /api/officials     -> read-only list (public site only,
                           user_script/officials.js)
   ------------------------------------------------------------------ */
const officialsAdminRoutes = require("./routes/officials");
app.use("/admin/officials", requireAuth, officialsAdminRoutes);

const officialsPublicRoutes = require("./routes/user/officials");
app.use("/api/officials", officialsPublicRoutes);


const announcementsPublicRoutes = require("./routes/user/announcements");
app.use("/api/announcements", announcementsPublicRoutes);

const publicContacts = require("./routes/user/contacts");
app.use("/user/contacts", publicContacts);

const publicComplaintRoutes = require("./routes/user/complaints");
app.use("/complaints", publicComplaintRoutes);


const publicCertificateRoutes = require("./routes/user/certificates");
app.use("/api/certificates", publicCertificateRoutes);

/* a root becaause I used a subfolder*/

app.use("/Image",express.static(path.join(__dirname, "barangay-admin", "Image"))
);
app.get("/admin", (req, res) => {
    // Check the real server-side session BEFORE sending any HTML.
    // If already logged in, redirect straight to the dashboard —
    // this way the browser never receives/paints the login page at
    // all, so there's no flash/flicker to fix on the client side.
    if (req.session && req.session.adminId) {
        return res.redirect("/admin/admin_html/home.html");
    }
    res.sendFile(path.join(__dirname, "barangay-admin", "admin_html",  "index.html"));
});
 


app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "user", "user_html",  "index.html"));
});

// Start server
const PORT = process.env.PORT || 3000;



app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});