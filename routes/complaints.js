/* =========================================================
   routes/complaints.js

     🔒 ADMIN   (admin_html/complaint.js) — should sit behind your admin login
        GET    /complaints         — list all
        GET    /complaints/:id     — view one
        PATCH  /complaints/:id     — update status
        DELETE /complaints/:id     — delete complaint + all evidence
        DELETE /complaints/:id/images/:imageId — remove one evidence file

   ⚠️ This file itself does not check who's calling it — if your
   admin routes aren't already behind an auth check elsewhere in
   the app, add one before GET/PATCH/DELETE here, otherwise anyone
   who finds the URL could view, edit, or delete complaints.

   Evidence files live in Supabase Storage (bucket "barangay-images",
   folder "complaints/"), uploaded by routes/public/complaints.js.
   The public URL of each one is stored in the "complaint_images"
   table, one row per file — same pattern as
   announcements/announcement_images.
   ========================================================= */

const express = require("express");
const router = express.Router();
const pool = require("../db");
const { deleteImage } = require("../utils/imageUpload");

/* ---------------------------------------------------------
   GET /complaints  — admin: list all, each with its images[]
   --------------------------------------------------------- */
router.get("/", async (req, res) => {
  try {
    const complaints = await pool.query(
      "SELECT * FROM complaints ORDER BY date_filed DESC, id DESC"
    );
    const images = await pool.query("SELECT * FROM complaint_images");

    const imagesByComplaint = {};
    for (const img of images.rows) {
      if (!imagesByComplaint[img.complaint_id]) {
        imagesByComplaint[img.complaint_id] = [];
      }
      imagesByComplaint[img.complaint_id].push({
        id: img.id,
        filepath: img.filepath
      });
    }

    const result = complaints.rows.map((c) => ({
      ...c,
      images: imagesByComplaint[c.id] || []
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load complaints" });
  }
});

/* ---------------------------------------------------------
   GET /complaints/:id  — single complaint with images[]
   --------------------------------------------------------- */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const complaint = await pool.query("SELECT * FROM complaints WHERE id = $1", [id]);
    if (complaint.rows.length === 0) {
      return res.status(404).json({ error: "Complaint not found" });
    }
    const images = await pool.query(
      "SELECT * FROM complaint_images WHERE complaint_id = $1 ORDER BY id ASC",
      [id]
    );
    res.json({ ...complaint.rows[0], images: images.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load complaint" });
  }
});

/* ---------------------------------------------------------
   PATCH /complaints/:id  — ADMIN: update status only
   Body: { status: "Pending" | "In Progress" | "Resolved" }
   --------------------------------------------------------- */
router.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ["Pending", "In Progress", "Resolved"];
  if (!allowed.includes(status)) {
    return res.status(400).json({ error: "Status must be Pending, In Progress, or Resolved" });
  }

  try {
    const updated = await pool.query(
      "UPDATE complaints SET status = $1 WHERE id = $2 RETURNING *",
      [status, id]
    );
    if (updated.rows.length === 0) {
      return res.status(404).json({ error: "Complaint not found" });
    }
    const images = await pool.query(
      "SELECT * FROM complaint_images WHERE complaint_id = $1 ORDER BY id ASC",
      [id]
    );
    res.json({ ...updated.rows[0], images: images.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update complaint" });
  }
});

/* ---------------------------------------------------------
   DELETE /complaints/:id/images/:imageId
   ADMIN: remove ONE piece of evidence (DB row + object in Storage)
   --------------------------------------------------------- */
router.delete("/:id/images/:imageId", async (req, res) => {
  const { id, imageId } = req.params;
  try {
    const deleted = await pool.query(
      "DELETE FROM complaint_images WHERE id = $1 AND complaint_id = $2 RETURNING *",
      [imageId, id]
    );
    if (deleted.rows.length === 0) {
      return res.status(404).json({ error: "Image not found" });
    }
    await deleteImage(deleted.rows[0].filepath);
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete image" });
  }
});

/* ---------------------------------------------------------
   DELETE /complaints/:id  — ADMIN: delete complaint + all evidence
   --------------------------------------------------------- */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {

    // Start transaction
    await pool.query("BEGIN");

    const images = await pool.query(
      "SELECT * FROM complaint_images WHERE complaint_id = $1",
      [id]
    );

    const deleted = await pool.query(
      "DELETE FROM complaints WHERE id = $1 RETURNING *",
      [id]
    );

    if (deleted.rows.length === 0) {
      await pool.query("ROLLBACK");
      return res.status(404).json({
        error: "Complaint not found"
      });
    }

    // Save database changes
    await pool.query("COMMIT");

    // Delete the objects from Supabase Storage AFTER the database commit
    await Promise.all(images.rows.map((img) => deleteImage(img.filepath)));

    res.json({
      deleted: true
    });

  } catch (err) {

    // Undo database changes if something failed
    await pool.query("ROLLBACK");

    console.error(err);

    res.status(500).json({
      error: "Failed to delete complaint"
    });
  }
});



module.exports = router;