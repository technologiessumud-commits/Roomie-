// ─── CLOUDINARY UPLOAD (Images + Videos) ──────────────────────
const CLOUD_NAME    = "ddciyvvds";
const UPLOAD_PRESET = "Roomie";

export async function uploadImage(file) {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {method:"POST",body:fd});
  if (!res.ok) throw new Error("Image upload failed");
  return (await res.json()).secure_url;
}

export async function uploadVideo(file, onProgress) {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", UPLOAD_PRESET);
    fd.append("resource_type", "video");
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`);
    xhr.upload.onprogress = e => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded/e.total)*100));
    };
    xhr.onload = () => {
      if (xhr.status === 200) resolve(JSON.parse(xhr.responseText).secure_url);
      else reject(new Error("Video upload failed"));
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(fd);
  });
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
