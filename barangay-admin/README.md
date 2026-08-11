# Barangay San Isidro — Admin Website

A responsive, mobile-friendly admin panel for managing your barangay website.
Plain HTML / CSS / JavaScript — no build tools, no frameworks. Just open
`index.html` in a browser (or upload the whole folder to any web host).

## Demo login
- Username: `admin`
- Password: `admin123`

(Change/remove this in `index.js` once you connect a real backend.)

## File structure

```
barangay-admin/
├── index.html      + index.js        → Login page
├── home.html        + home.js        → Dashboard + Announcements (posts for the homepage)
├── cert.html         + cert.js       → Certificate catalog (editable)
├── complaint.html    + complaint.js  → View & update resident complaints
├── officials.html    + officials.js  → Manage barangay officials (editable)
├── contacts.html      + contacts.js  → Office contact info (editable)
├── css/style.css                     → Shared styling (colors, layout, responsive rules)
└── js/common.js                      → Shared logic: login guard, sidebar, logout, demo data
```

Each page has its **own** HTML and JS file, as requested, so you can edit or
replace one section without touching the others. `css/style.css` and
`js/common.js` are shared by every page (sidebar, colors, login check, etc.).

## How the data works right now (demo mode)

There is no backend yet, so all data (announcements, certificates,
complaints, officials, contact info) is stored in the browser's
`localStorage`. This lets you click around and test everything — add/edit/
delete announcements, change a complaint's status, etc. — before your
server exists. `js/common.js` seeds some sample data the first time you
open the site.

## 🔌 Connecting your real server / API

Every `.js` file has clearly marked comment blocks like this:

```js
/* 🔌 SERVER CONNECTION POINT
   Replace this with:
   fetch('/api/announcements') ... */
```

Search each file for `SERVER CONNECTION POINT` and swap the localStorage
line(s) directly below/above it for a `fetch()` call to your real API.
The rendering code (the part that draws tables, cards, forms) does **not**
need to change — it just calls functions like `loadAnnouncements()`, so as
long as those functions still return the same shape of data, everything
else keeps working.

Suggested order to connect things:
1. `index.js` — real admin login (returns a token/session)
2. `js/common.js` — `requireLogin()` should verify that token with your server
3. `home.js` — announcements (GET/POST/PUT/DELETE `/api/announcements`)
4. `cert.js` — certificate catalog (`/api/certificates`)
5. `complaint.js` — complaints are created by residents on the **user-facing
   site**; this page only needs GET (list) and PATCH (update status) —
   `/api/complaints`
6. `officials.js` — `/api/officials`
7. `contacts.js` — `/api/contacts` (single record, not a list)

## Responsive behavior

- Above 900px: sidebar is always visible on the left.
- 900px and below (tablets/phones): sidebar hides off-screen; tap the ☰
  button top-left to open it as a slide-in menu with a dark overlay.
- All tables scroll horizontally on very small screens instead of
  breaking the layout.
