/* =========================================================
   routes/public/announcements.js

   READ-ONLY announcements feed for the public barangay website.

   Deliberately kept separate from routes/announcements.js (the admin
   CRUD router): this file only exposes GET endpoints, so there is no
   code path here that can create, edit, upload to, or delete an
   announcement — the public site literally cannot reach those
   operations, regardless of what routes exist elsewhere.

   Mounted in server.js at /api/announcements.
   ========================================================= */

const express = require("express");
const router = express.Router();
const pool = require("../../db");

/* ---------------------------------------------------------
   GET /api/announcements
   All announcements, newest first, each with its images[].
   Used by user_script/home.js to populate the homepage
   featured announcement + announcement grid.
   --------------------------------------------------------- */
router.get("/", async (req, res) => {
  try {
    const announcements = await pool.query(
      "SELECT id, title, date, content, created_at FROM announcements ORDER BY date DESC, id DESC"
    );
    const images = await pool.query(
      "SELECT id, announcement_id, filepath FROM announcement_images ORDER BY id ASC"
    );

    const imagesByAnnouncement = {};
    for (const img of images.rows) {
      if (!imagesByAnnouncement[img.announcement_id]) {
        imagesByAnnouncement[img.announcement_id] = [];
      }
      imagesByAnnouncement[img.announcement_id].push({
        id: img.id,
        filepath: img.filepath
      });
    }

    const result = announcements.rows.map((a) => ({
      ...a,
      images: imagesByAnnouncement[a.id] || []
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load announcements" });
  }
});

/* ---------------------------------------------------------
   GET /api/announcements/:id
   Single announcement with images[] — handy if you add a
   "read more" detail page on the public site later.
   --------------------------------------------------------- */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await pool.query(
      "SELECT id, title, date, content, created_at FROM announcements WHERE id = $1",
      [id]
    );
    if (announcement.rows.length === 0) {
      return res.status(404).json({ error: "Announcement not found" });
    }
    const images = await pool.query(
      "SELECT id, filepath FROM announcement_images WHERE announcement_id = $1 ORDER BY id ASC",
      [id]
    );
    res.json({ ...announcement.rows[0], images: images.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load announcement" });
  }
});

module.exports = router;