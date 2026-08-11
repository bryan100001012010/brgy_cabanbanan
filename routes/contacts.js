const express = require("express");
const router = express.Router();
const pool = require("../db");
console.log(pool);

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

router.put("/", async (req, res) => {

    const {
        address,
        phone,
        email,
        office_hours,
        facebook
    } = req.body;

    try {

        const exists = await pool.query(
            "SELECT id FROM contacts LIMIT 1"
        );

        if (exists.rows.length) {

            await pool.query(
                `UPDATE contacts
                 SET address=$1,
                     phone=$2,
                     email=$3,
                     office_hours=$4,
                     facebook=$5
                 WHERE id=$6`,
                [
                    address,
                    phone,
                    email,
                    office_hours,
                    facebook,
                    exists.rows[0].id
                ]
            );

        } else {

            await pool.query(
                `INSERT INTO contacts
                (address,phone,email,office_hours,facebook)
                VALUES($1,$2,$3,$4,$5)`,
                [
                    address,
                    phone,
                    email,
                    office_hours,
                    facebook
                ]
            );

        }

        res.json({
            message:"Contact updated"
        });

    } catch(err){

        console.error(err);

        res.status(500).json({
            error:"Database error"
        });

    }

});

router.get("/hotlines", async (req,res)=>{

    const result = await pool.query(
        "SELECT * FROM hotlines ORDER BY priority DESC,id ASC"
    );

    res.json(result.rows);

});


router.post("/hotlines", async (req,res)=>{

    const {
        label,
        number,
        availability,
        note,
        priority
    } = req.body;

    const result = await pool.query(
        `INSERT INTO hotlines
        (label,number,availability,note,priority)
        VALUES($1,$2,$3,$4,$5)
        RETURNING *`,
        [
            label,
            number,
            availability,
            note,
            priority
        ]
    );

    res.status(201).json(result.rows[0]);

});

router.put("/hotlines/:id", async (req,res)=>{

    const {id}=req.params;

    const {
        label,
        number,
        availability,
        note,
        priority
    } = req.body;

    const result = await pool.query(
        `UPDATE hotlines
         SET label=$1,
             number=$2,
             availability=$3,
             note=$4,
             priority=$5
         WHERE id=$6
         RETURNING *`,
         [
            label,
            number,
            availability,
            note,
            priority,
            id
         ]
    );

    res.json(result.rows[0]);

});

router.delete("/hotlines/:id", async(req,res)=>{

    await pool.query(
        "DELETE FROM hotlines WHERE id=$1",
        [req.params.id]
    );

    res.json({
        message:"Deleted"
    });

});

module.exports = router;