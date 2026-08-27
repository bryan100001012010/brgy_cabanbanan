/* =========================================================
   utils/imageUpload.js

   Drop-in replacement for the old "save to disk" / "delete from
   disk" helpers that used to live in each routes file
   (UPLOAD_DIR + multer.diskStorage + fs.unlink).

   All images now live in ONE Supabase Storage bucket, organized
   by folder ("announcements/", "officials/", "complaints/") so
   you don't have to create/manage a separate bucket per feature.

   >>> Requires a PUBLIC bucket in your Supabase dashboard
   >>> (Storage -> New bucket) named exactly:

         images

   Usage in a route file:
     const { uploadImage, deleteImage } = require("../utils/imageUpload");
     // (or "../../utils/imageUpload" from routes/public/*)

     const { publicUrl } = await uploadImage(file, "announcements");
     // store publicUrl in the DB exactly like the old filepath

     await deleteImage(storedFilepath);
     // storedFilepath is whatever you saved in the DB (the full URL)
   ========================================================= */

const path = require("path");
const supabase = require("../config/supabase");

const BUCKET = "barangay-images";

/**
 * Uploads a single multer file (in memory, i.e. file.buffer) to
 * Supabase Storage under the given folder, and returns its public URL.
 *
 * @param {Express.Multer.File} file - from multer.memoryStorage()
 * @param {string} folder - e.g. "announcements", "officials", "complaints"
 * @returns {Promise<{ storagePath: string, publicUrl: string }>}
 */
async function uploadImage(file, folder) {
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = path.extname(file.originalname).toLowerCase();
  const storagePath = `${folder}/${unique}${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  return { storagePath, publicUrl: data.publicUrl };
}

/**
 * Deletes an image from Supabase Storage given the full public URL
 * that was stored in the database (same string toPublicPath() used
 * to produce for the old disk-based version).
 *
 * Safe to call even if the URL is malformed/missing — logs and
 * returns quietly instead of throwing, matching the old
 * deleteFileQuietly() behavior.
 *
 * @param {string} publicUrl
 */
async function deleteImage(publicUrl) {
  if (!publicUrl) return;

  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);

  if (idx === -1) {
    console.warn("[imageUpload] Could not parse storage path from:", publicUrl);
    return;
  }

  const storagePath = publicUrl.substring(idx + marker.length);

  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);

  if (error) {
    console.error("[imageUpload] Failed to delete from Supabase:", storagePath, error.message);
  }
}

module.exports = { uploadImage, deleteImage, BUCKET };