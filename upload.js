// ─── CLOUDINARY UPLOAD HELPER ─────────────────────────────────
// 🔧 Replace these two values with yours from cloudinary.com
const CLOUD_NAME   = "ddciyvvds";    // e.g. "dxyz123abc"
const UPLOAD_PRESET = "Roomie"; // e.g. "roomie_upload"

/**
 * Upload a single File object to Cloudinary.
 * Returns the secure URL string.
 */
export async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return data.secure_url;
}

/**
 * Upload multiple files. Returns array of URLs.
 * Shows progress on a callback: onProgress(uploadedCount, totalCount)
 */
export async function uploadImages(files, onProgress) {
  const urls = [];
  for (let i = 0; i < files.length; i++) {
    const url = await uploadImage(files[i]);
    urls.push(url);
    if (onProgress) onProgress(i + 1, files.length);
  }
  return urls;
                               }

