/* =========================================================
   routes/public/complaints.js

   PUBLIC: residents file complaints and check status here.
   Evidence files (images or PDFs) are uploaded to Supabase
   Storage (bucket "barangay-images", folder "complaints/")
   instead of the local disk. The public URL of each file is
   stored in the "complaint_images" table.
   ========================================================= */

const express = require("express");
const router = express.Router();
const multer = require("multer");
const pool = require("../../db");
const { uploadImage, deleteImage } = require("../../utils/imageUpload");

const FOLDER = "complaints";

/* ---------------------------------------------------------
   UPLOAD CONFIG — files kept in memory, then sent to Supabase
   --------------------------------------------------------- */
const ALLOWED_EXT = /\.(jpe?g|png|gif|webp|pdf)$/i;

const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf"
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 10
  },
  fileFilter: (req, file, cb) => {
    const validExtension = ALLOWED_EXT.test(file.originalname);
    const validMime = ALLOWED_MIME.includes(file.mimetype);

    if (validExtension && validMime) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, GIF, WEBP images or PDF files are allowed."));
    }
  }
});

/* ---------------------------------------------------------
   HELPERS
   --------------------------------------------------------- */
function generateTrackingCode(issueType) {
  const prefix = "BSI";
  const typeCode = (issueType || "GEN").substring(0, 3).toUpperCase();
  const stamp = Date.now().toString().slice(-6);

  return `${prefix}-${typeCode}-${stamp}`;
}

/* ---------------------------------------------------------
   GET /complaints/status?token=xxx
   PUBLIC: Status panel — returns this browser's complaints that are
   Pending, In Progress, or Resolved with expires_at still in the
   future. Once a Resolved complaint's expires_at passes, it simply
   stops being returned, so the panel naturally drops it (and
   disappears entirely if none remain).

   NOTE: this route must be declared before any "/:id"-style GET
   route you add later, or Express will try to match "status" as an id.
   --------------------------------------------------------- */
router.get("/status/:trackingCode", async (req, res) => {

    const { trackingCode } = req.params;

    try{

        const result = await pool.query(`
           SELECT
        tracking_code,
        category,
        status,
        date_filed,
        resolved_at,
        expires_at
        FROM complaints
        WHERE tracking_code = $1
        `,[trackingCode]);

        if(result.rows.length === 0){
            return res.status(404).json({
                error:"Complaint not found."
            });
        }

        res.json(result.rows[0]);

    }catch(err){

        console.error(err);

        res.status(500).json({
            error:"Failed to load complaint."
        });

    }

});
/* ---------------------------------------------------------
   POST /complaints
   PUBLIC: Submit a new complaint
   --------------------------------------------------------- */
router.post("/", upload.array("evidence", 10), async (req, res) => {

  const {
  name,
  contact,
  address,
  issueType,
  category,
  otherParty,
  details,
  urgency
} = req.body;

  if (!name || !contact || !address || !category || !details) {
    return res.status(400).json({
      error: "Name, contact, address, category, and details are required."
    });
  }

  const allowedUrgency = [
    "routine",
    "ongoing",
    "urgent"
  ];

  if (urgency && !allowedUrgency.includes(urgency)) {
    return res.status(400).json({
      error: "Invalid urgency."
    });
  }

  const files = req.files || [];
  const uploadedUrls = []; // track what made it to Supabase, for cleanup on failure

  try {

    // Upload evidence to Supabase first, before touching the DB
    const uploaded = [];
    for (const file of files) {
      const { publicUrl } = await uploadImage(file, FOLDER);
      uploadedUrls.push(publicUrl);
      uploaded.push(publicUrl);
    }

    await pool.query("BEGIN");

    const trackingCode = generateTrackingCode(issueType);

    const inserted = await pool.query(
      `INSERT INTO complaints
      (
        tracking_code,
        name,
        contact,
        address,
        category,
        other_party,
        details,
        urgency,
        status,
        date_filed
            )
      VALUES
      (
        $1,$2,$3,$4,$5,$6,$7,$8,
        'Pending',
        CURRENT_DATE
      )
      RETURNING *`,
      [
        trackingCode,
        name,
        contact,
        address,
        category,
        otherParty || null,
        details,
        urgency || "routine",
        
      ]
    );

    const complaint = inserted.rows[0];

    for (const publicUrl of uploaded) {

      await pool.query(
        `INSERT INTO complaint_images
        (complaint_id, filepath)
        VALUES ($1,$2)`,
        [
          complaint.id,
          publicUrl
        ]
      );

    }

    await pool.query("COMMIT");

    res.status(201).json({
      success: true,
      tracking_code: complaint.tracking_code,
      complaint
    });

  } catch (err) {

    await pool.query("ROLLBACK");

    console.error(err);

    // clean up anything that made it to Supabase before the error
    await Promise.all(uploadedUrls.map((url) => deleteImage(url)));

    res.status(500).json({
      error: "Failed to submit complaint."
    });

  }

});

/* ---------------------------------------------------------
   Upload error handler
   --------------------------------------------------------- */
router.use((err, req, res, next) => {

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: err.message
    });
  }

  if (err && err.message) {
    return res.status(400).json({
      error: err.message
    });
  }

  next(err);

});

module.exports = router;