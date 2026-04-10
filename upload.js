// ─── CLOUDINARY UPLOAD HELPER ─────────────────────────────────

const CLOUD_NAME   = "ddciyvvds";
const UPLOAD_PRESET = "Roomie";

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
 * Upload multiple files with progress callback
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
