const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get("/", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                id,
                name,
                description,
                fee,
                processing_time AS "processingTime",
                requirements,
                created_at
            FROM certificates
            ORDER BY id DESC
        `);

        res.json(result.rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: "Failed to fetch certificates"
        });
    }
});


router.post("/", async (req, res) => {

    const {
        name,
        description,
        fee,
        processingTime,
        requirements
    } = req.body;

    try {

        const result = await pool.query(
            `
            INSERT INTO certificates
            (name, description, fee, processing_time, requirements)
            VALUES ($1,$2,$3,$4,$5)
            RETURNING id, name, description, fee, processing_time AS "processingTime", requirements, created_at
            `,
            [
                name,
                description,
                fee,
                processingTime,
                JSON.stringify(requirements)
            ]
        );

        res.status(201).json(result.rows[0]);

    } catch(err){

        console.error(err);

        res.status(500).json({
            error:"Failed to create certificate"
        });

    }

});

router.put("/:id", async (req, res) => {

    const { id } = req.params;

    const {
        name,
        description,
        fee,
        processingTime,
        requirements
    } = req.body;

    try{

        const result = await pool.query(
            `
            UPDATE certificates
            SET
                name=$1,
                description=$2,
                fee=$3,
                processing_time=$4,
                requirements=$5
            WHERE id=$6
            RETURNING id, name, description, fee, processing_time AS "processingTime", requirements, created_at
            `,
            [
                name,
                description,
                fee,
                processingTime,
                JSON.stringify(requirements),
                id
            ]
        );

        res.json(result.rows[0]);

    }catch(err){

        console.error(err);

        res.status(500).json({
            error:"Failed to update certificate"
        });

    }

});

router.delete("/:id", async (req, res) => {

    try{

        await pool.query(
            "DELETE FROM certificates WHERE id=$1",
            [req.params.id]
        );

        res.json({
            message:"Certificate deleted"
        });

    }catch(err){

        console.error(err);

        res.status(500).json({
            error:"Failed to delete certificate"
        });

    }

});

module.exports = router;