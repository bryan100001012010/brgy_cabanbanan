const express = require("express");
const router = express.Router();
const pool = require("../../db");

router.get("/", async (req, res) => {
    try {

        const result = await pool.query(`
            SELECT
                id,
                name,
                description,
                fee,
                processing_time AS "processingTime",
                requirements
            FROM certificates
            ORDER BY name ASC
        `);

        res.json(result.rows);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: "Failed to load certificates"
        });

    }
});

module.exports = router;