/* ============================================================
   routes/user/officials.js
   PUBLIC, READ-ONLY router. Mount in server.js as:

       app.use("/api/officials", require("./routes/user/officials"));

   Only exposes GET — no create/update/delete/upload here, so the
   public site can never reach those, same pattern as
   routes/user/announcements.js -> /api/announcements.
   ============================================================ */

const express = require("express");
const router = express.Router();
const pool = require("../../db");

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, position, category, committee, photo_url FROM officials ORDER BY category, sort_order, id"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

module.exports = router;