/* =========================================================
   config/supabase.js

   Single shared Supabase client, used server-side only.

   Uses the SECRET/SERVICE key (not the anon/publishable one),
   because every upload in this app goes through our own Express
   routes, not directly from the browser — so it's safe to keep
   the powerful key here, on the server, and never send it to
   the client.

   Requires these in your .env (and in Render's Environment tab):
     SUPABASE_URL=https://xxxxx.supabase.co
     SUPABASE_KEY=sb_secret_xxxxx   (or the legacy service_role key)
   ========================================================= */

const { createClient } = require("@supabase/supabase-js");

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.warn(
    "[supabase] SUPABASE_URL or SUPABASE_KEY is missing from environment variables."
  );
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

module.exports = supabase;