/* =========================================================
   routes/announcements.js

   CRUD for barangay announcements, backed by Postgres.
   Supports MULTIPLE images per announcement:
     - files are saved to disk under  barangay-admin/Image/announcements/
     - the file path of each image (e.g. /Image/announcements/xyz.jpg)
       is stored in the "announcement_images" table, one row per image
     - that stored path is what the frontend (admin + public homepage)
       uses directly as an <img src>, since it's served statically
       by express.static("barangay-admin") in server.js
   ========================================================= */

const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const pool = require("../db");

/* ---------------------------------------------------------
   UPLOAD CONFIG
   --------------------------------------------------------- */
// Resolves to <project root>/barangay-admin/Image/announcements
const UPLOAD_DIR = path.join(__dirname, "..","barangay-admin", "Image", "announcements");

// Make sure the folder exists so multer doesn't fail on first run
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
  }
});

const ALLOWED_EXT = /\.(jpe?g|png|gif|webp)$/i;

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per image
    files: 10                  // max 10 images per announcement
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_EXT.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (jpg, png, gif, webp) are allowed"));
    }
  }
});

// Public URL prefix that gets stored in the DB / sent to the frontend
const PUBLIC_PATH_PREFIX = "/admin/Image/announcements";

function toPublicPath(filename) {
  return `${PUBLIC_PATH_PREFIX}/${filename}`;
}

function deleteFileQuietly(filepath) {
  const filename = path.basename(filepath);
  fs.unlink(path.join(UPLOAD_DIR, filename), (err) => {
    if (err && err.code !== "ENOENT") {
      console.error("Failed to delete image file:", filename, err.message);
    }
  });
}

/* ---------------------------------------------------------
   GET /announcements  — list all, each with its images[]
   --------------------------------------------------------- */
router.get("/", async (req, res) => {
  try {
    const announcements = await pool.query(
      "SELECT * FROM announcements ORDER BY date DESC, id DESC"
    );
    const images = await pool.query("SELECT * FROM announcement_images");

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
   GET /announcements/:id  — single announcement with images[]
   --------------------------------------------------------- */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await pool.query(
      "SELECT * FROM announcements WHERE id = $1",
      [id]
    );
    if (announcement.rows.length === 0) {
      return res.status(404).json({ error: "Announcement not found" });
    }
    const images = await pool.query(
      "SELECT * FROM announcement_images WHERE announcement_id = $1 ORDER BY id ASC",
      [id]
    );
    res.json({ ...announcement.rows[0], images: images.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load announcement" });
  }
});

/* ---------------------------------------------------------
   POST /announcements  — create (multipart/form-data)
   Fields: title, date, content, images (0-10 files)
   --------------------------------------------------------- */
router.post("/", upload.array("images", 10), async (req, res) => {
  const { title, date, content } = req.body;

  if (!title || !date || !content) {
    return res.status(400).json({ error: "Title, date, and content are required" });
  }

  try {
    const inserted = await pool.query(
      "INSERT INTO announcements (title, date, content) VALUES ($1, $2, $3) RETURNING *",
      [title, date, content]
    );
    const announcement = inserted.rows[0];

    const files = req.files || [];
    const images = [];
    for (const file of files) {
      const filepath = toPublicPath(file.filename);
      const imgRow = await pool.query(
        "INSERT INTO announcement_images (announcement_id, filepath) VALUES ($1, $2) RETURNING *",
        [announcement.id, filepath]
      );
      images.push(imgRow.rows[0]);
    }

    res.status(201).json({ ...announcement, images });
  } catch (err) {
    console.error(err);
    // clean up any files that were already saved to disk before the DB error
    (req.files || []).forEach((f) => deleteFileQuietly(f.filename));
    res.status(500).json({ error: "Failed to create announcement" });
  }
});

/* ---------------------------------------------------------
   PUT /announcements/:id  — edit (multipart/form-data)
   Fields: title, date, content, images (0-10 NEW files to add)
   Existing images are removed separately via the endpoint below.
   --------------------------------------------------------- */
router.put("/:id", upload.array("images", 10), async (req, res) => {
  const { id } = req.params;
  const { title, date, content } = req.body;

  if (!title || !date || !content) {
    return res.status(400).json({ error: "Title, date, and content are required" });
  }

  try {
    const updated = await pool.query(
      "UPDATE announcements SET title = $1, date = $2, content = $3 WHERE id = $4 RETURNING *",
      [title, date, content, id]
    );
    if (updated.rows.length === 0) {
      return res.status(404).json({ error: "Announcement not found" });
    }

    const files = req.files || [];
    for (const file of files) {
      const filepath = toPublicPath(file.filename);
      await pool.query(
        "INSERT INTO announcement_images (announcement_id, filepath) VALUES ($1, $2)",
        [id, filepath]
      );
    }

    const images = await pool.query(
      "SELECT * FROM announcement_images WHERE announcement_id = $1 ORDER BY id ASC",
      [id]
    );

    res.json({ ...updated.rows[0], images: images.rows });
  } catch (err) {
    console.error(err);
    (req.files || []).forEach((f) => deleteFileQuietly(f.filename));
    res.status(500).json({ error: "Failed to update announcement" });
  }
});

/* ---------------------------------------------------------
   DELETE /announcements/:id/images/:imageId
   Removes ONE image from an announcement (both DB row and file).
   --------------------------------------------------------- */
router.delete("/:id/images/:imageId", async (req, res) => {
  const { id, imageId } = req.params;
  try {
    const deleted = await pool.query(
      "DELETE FROM announcement_images WHERE id = $1 AND announcement_id = $2 RETURNING *",
      [imageId, id]
    );
    if (deleted.rows.length === 0) {
      return res.status(404).json({ error: "Image not found" });
    }
    deleteFileQuietly(deleted.rows[0].filepath);
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete image" });
  }
});

/* ---------------------------------------------------------
   DELETE /announcements/:id  — delete announcement + all its images
   --------------------------------------------------------- */
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const images = await pool.query(
      "SELECT * FROM announcement_images WHERE announcement_id = $1",
      [id]
    );
    const deleted = await pool.query(
      "DELETE FROM announcements WHERE id = $1 RETURNING *",
      [id]
    );
    if (deleted.rows.length === 0) {
      return res.status(404).json({ error: "Announcement not found" });
    }
    // announcement_images rows are removed automatically via ON DELETE CASCADE;
    // we still need to clean up the actual files on disk.
    images.rows.forEach((img) => deleteFileQuietly(img.filepath));

    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete announcement" });
  }
});

/* ---------------------------------------------------------
   Multer error handler (file too large, too many files, etc.)
   --------------------------------------------------------- */
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message.includes("Only image files")) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = router;
