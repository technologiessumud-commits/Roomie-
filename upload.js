// ─── CLOUDINARY UPLOAD ────────────────────────────────────────
const CLOUD_NAME    = "ddciyvvds";
const UPLOAD_PRESET = "Roomie"; // 🔧 Replace with your preset name from Cloudinary

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

export async function uploadImages(files, onProgress) {
  const urls = [];
  for (let i = 0; i < files.length; i++) {
    const url = await uploadImage(files[i]);
    urls.push(url);
    if (onProgress) onProgress(i + 1, files.length);
  }
  return urls;
}
