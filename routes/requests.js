/* ============================================================
   routes/requests.js
   ADMIN router for the certificate request queue.

   Mount in server.js as:
       app.use("/requests", require("./routes/requests"));
   ============================================================ */

const express = require("express");
const router = express.Router();
const pool = require("../db");

/* GET all requests, newest first. The admin page filters/sorts
   pending vs approved client-side. */
router.get("/", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM certificate_requests ORDER BY created_at DESC"
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch requests" });
    }
});

/* Approve a pending request — generates the claim code the
   resident will be shown / must bring to the barangay. */
router.put("/:id/approve", async (req, res) => {
    const { id } = req.params;
    const code = generateClaimCode();

    try {
        const result = await pool.query(
            `
            UPDATE certificate_requests
            SET status = 'approved',
                code = $1,
                approved_at = NOW()
            WHERE id = $2 AND status = 'pending'
            RETURNING *
            `,
            [code, id]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                error: "Request not found, or it was already handled"
            });
        }

        res.json(result.rows[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to approve request" });
    }
});

/* Remove a request from the queue (e.g. after it's been claimed,
   or to clear out a stale one). */
router.delete("/:id", async (req, res) => {
    try {
        await pool.query(
            "DELETE FROM certificate_requests WHERE id = $1",
            [req.params.id]
        );
        res.json({ message: "Request removed" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to remove request" });
    }
});

/* 6-character code, no ambiguous characters (no 0/O, 1/I/L). */
function generateClaimCode() {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

module.exports = router;