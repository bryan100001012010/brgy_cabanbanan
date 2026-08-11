const express = require("express");
const router = express.Router();
const pool = require("../../db");

// Barangay contact
router.get("/", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM contacts LIMIT 1"
        );

        res.json(result.rows[0] || {});
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: "Failed to load contacts"
        });
    }
});

// Public hotlines
router.get("/hotlines", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM hotlines ORDER BY priority DESC, id ASC"
        );

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: "Failed to load hotlines"
        });
    }
});

module.exports = router;