/* ============================================================
   routes/officials.js
   ADMIN-ONLY router. Mount in server.js as:

       app.use("/admin/officials", require("./routes/officials"));

   Full CRUD + photo upload (now via Supabase Storage, bucket
   "barangay-images", folder "officials/"). The public, read-only
   counterpart is routes/user/officials.js (unchanged — it just
   passes photo_url straight through).
   ============================================================ */

const express = require("express");
const multer = require("multer");
const router = express.Router();
const pool = require("../db");
const { uploadImage } = require("../utils/imageUpload");

const FOLDER = "officials";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  }
});

// Every valid category, in one place, so it can't drift between routes.
const VALID_CATEGORIES = ["captain", "kagawad", "sk", "secretariat"];

// GET all (admin panel's own list view)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM officials ORDER BY category, sort_order, id"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// UPLOAD a photo -> uploads to Supabase, returns its public URL
router.post("/upload", upload.single("photo"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const { publicUrl } = await uploadImage(req.file, FOLDER);
    res.json({ url: publicUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to upload photo" });
  }
});

// CREATE
router.post("/", async (req, res) => {
  try {
    const { name, position, category, committee, photo_url, sort_order } = req.body;

    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: "Invalid category" });
    }

    // Only "captain" is capped at one; kagawad/sk/secretariat are lists.
    if (category === "captain") {
      const existing = await pool.query(
        "SELECT id FROM officials WHERE category = 'captain'"
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: "A Barangay Captain already exists. Edit the existing one instead." });
      }
    }

    const result = await pool.query(
      `INSERT INTO officials (name, position, category, committee, photo_url, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, position, category, committee || null, photo_url || null, sort_order || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// UPDATE
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, position, category, committee, photo_url, sort_order } = req.body;

  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: "Invalid category" });
  }

  try {
    const result = await pool.query(
      `UPDATE officials
       SET name = $1, position = $2, category = $3, committee = $4, photo_url = $5, sort_order = $6
       WHERE id = $7
       RETURNING *`,
      [name, position, category, committee || null, photo_url || null, sort_order || 0, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Official not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: "Server Error" });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM officials WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Official not found" });
    }

    res.json({ message: "Official deleted successfully", official: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;