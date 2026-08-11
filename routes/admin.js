const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require("bcrypt");
const requireAuth = require("../middleware/requireAuth");

/* Create an admin account — protected, so only an already-logged-in
   admin can create another one (not open to the public). */
router.post("/", requireAuth, async(req,res)=>{

    try{

        const {
            full_name,
            username,
            password
        } = req.body;

        const hash = await bcrypt.hash(password,10);

        const result = await pool.query(
            `
            INSERT INTO admins
            (full_name, username, password_hash)
            VALUES($1,$2,$3)
            RETURNING admin_id, full_name, username
            `,
            [full_name,username,hash]
        );

        res.status(201).json(result.rows[0]);

    }
    catch(err){
        console.log(err);
        res.status(500).json({
            error:"Server Error"
        });
    }

});

/* List admins — protected, was previously exposing every admin's
   full name and username to anyone. */
router.get("/", requireAuth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                admin_id,
                full_name,
                username
            FROM admins
            ORDER BY admin_id;
        `);

        res.json(result.rows);

    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: "Server error"
        });
    }
});

router.put("/:id", requireAuth, async (req, res) => {

    try {

        const { id } = req.params;
        const { full_name, username, password } = req.body;

        if (password) {

            const hash = await bcrypt.hash(password, 10);

            const result = await pool.query(
                `
                UPDATE admins
                SET
                    full_name = $1,
                    username = $2,
                    password_hash = $3
                WHERE admin_id = $4
                RETURNING admin_id, full_name, username;
                `,
                [full_name, username, hash, id]
            );

            return res.json(result.rows[0]);
        }

        const result = await pool.query(
            `
            UPDATE admins
            SET
                full_name = $1,
                username = $2
            WHERE admin_id = $3
            RETURNING admin_id, full_name, username;
            `,
            [full_name, username, id]
        );

        res.json(result.rows[0]);

    } catch (err) {

        console.log(err);

        res.status(500).json({
            error: "Server Error"
        });

    }

});

router.delete("/:id", requireAuth, async (req, res) => {

    try {

        const { id } = req.params;

        await pool.query(
            `
            DELETE FROM admins
            WHERE admin_id = $1
            `,
            [id]
        );

        res.json({
            message: "Admin deleted."
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            error: "Server Error"
        });

    }

});

router.post("/login", async (req, res) => {
    console.log("Login route reached");
    try {

        const { username, password } = req.body;

        // Find the admin by username
        const result = await pool.query(
            `
            SELECT *
            FROM admins
            WHERE username = $1
            `,
            [username]
        );

        // Username doesn't exist
        if (result.rows.length === 0) {
            return res.status(401).json({
                error: "Invalid username or password"
            });
        }

        const admin = result.rows[0];

        // Compare password with the stored bcrypt hash
        const validPassword = await bcrypt.compare(
            password,
            admin.password_hash
        );

        if (!validPassword) {
            return res.status(401).json({
                error: "Invalid username or password"
            });
        }

        // Login successful — this is the real security boundary now.
        // req.session is signed + stored server-side by express-session
        // (configured in server.js); the browser only ever holds an
        // opaque, httpOnly cookie it can't read or forge.
        req.session.adminId = admin.admin_id;
        req.session.username = admin.username;

        res.json({
            message: "Login successful",
            admin: {
                admin_id: admin.admin_id,
                full_name: admin.full_name,
                username: admin.username
            }
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: "Server error"
        });

    }
});

/* Lets the frontend ask "is this browser actually logged in?" by
   checking the real session, instead of trusting a client-side flag. */
router.get("/me", (req, res) => {
    if (!req.session || !req.session.adminId) {
        return res.status(401).json({ error: "Not authenticated" });
    }
    res.json({
        admin_id: req.session.adminId,
        username: req.session.username
    });
});

router.post("/logout", (req, res) => {
    if (!req.session) {
        return res.json({ message: "Logged out" });
    }
    req.session.destroy(err => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: "Failed to log out" });
        }
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out" });
    });
});

module.exports = router;