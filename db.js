const { Pool } = require("pg");
require("dotenv").config();

/* ------------------------------------------------------------------
   NEON CONFIG

   Neon is just Postgres, but it's remote and requires SSL, so instead
   of building the Pool from separate DB_HOST/DB_USER/etc vars, we use
   a single connection string from the Neon dashboard.

   Put this in your .env (use the POOLED connection string Neon gives
   you, since this is a normal long-running server, not a serverless
   function):

     DATABASE_URL=postgres://user:password@ep-xxxx-pooler.region.aws.neon.tech/dbname?sslmode=require

   rejectUnauthorized: false is the standard setting for Neon with
   node-postgres — Neon's certs are valid, but pg's default TLS
   validation can still choke on the chain, so this avoids that
   without disabling encryption itself.
   ------------------------------------------------------------------ */

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.on("error", (err) => {
    // Catches errors on idle clients in the pool (e.g. connection drop)
    // so one bad connection doesn't crash the whole server.
    console.error("Unexpected error on idle Postgres client", err);
});

module.exports = pool;