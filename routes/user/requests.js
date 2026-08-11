/* ============================================================
   routes/user/requests.js
   PUBLIC router for residents requesting a certificate.

   Mount in server.js as:
       app.use("/api/requests", require("./routes/user/requests"));

   No login system exists on the public site, so each browser
   generates its own random clientId (see certificate.js) and
   sends it with every call. It's not real auth — just enough to
   show a resident their own requests and stop a random visitor
   from cancelling someone else's — same trust level as the rest
   of this public site.
   ============================================================ */

const express = require("express");
const router = express.Router();
const pool = require("../../db");

/* Submit a new request for a certificate type. */
router.post("/", async (req, res) => {
    const { certificateId, clientId } = req.body;

    if (!certificateId || !clientId) {
        return res.status(400).json({
            error: "certificateId and clientId are required"
        });
    }

    try {
        const certRes = await pool.query(
            "SELECT id, name, requirements FROM certificates WHERE id = $1",
            [certificateId]
        );

        if (!certRes.rows.length) {
            return res.status(404).json({ error: "Certificate type not found" });
        }

        const cert = certRes.rows[0];

        const result = await pool.query(
            `
            INSERT INTO certificate_requests
                (certificate_id, certificate_name, requirements, client_id)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            `,
            [cert.id, cert.name, JSON.stringify(cert.requirements), clientId]
        );

        res.status(201).json(result.rows[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to submit request" });
    }
});

/* This browser's own requests (pending + approved), newest first. */
router.get("/", async (req, res) => {
    const { clientId } = req.query;

    if (!clientId) {
        return res.status(400).json({ error: "clientId is required" });
    }

    try {
        const result = await pool.query(
            `
            SELECT * FROM certificate_requests
            WHERE client_id = $1 AND status IN ('pending', 'approved')
            ORDER BY created_at DESC
            `,
            [clientId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to load your requests" });
    }
});

/* Cancel one of this browser's own requests — only while it's
   still pending; once approved it can no longer be cancelled here. */
router.delete("/:id", async (req, res) => {
    const { clientId } = req.query;

    if (!clientId) {
        return res.status(400).json({ error: "clientId is required" });
    }

    try {
        const result = await pool.query(
            `
            DELETE FROM certificate_requests
            WHERE id = $1 AND client_id = $2 AND status = 'pending'
            RETURNING *
            `,
            [req.params.id, clientId]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                error: "Request not found, or it can no longer be cancelled"
            });
        }

        res.json({ message: "Request cancelled" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to cancel request" });
    }
});

module.exports = router;