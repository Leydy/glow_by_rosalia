// Dónde se guardan las fotos (productos, logo, QR, capturas de Yape, reseñas).
//
//  • Con CLOUDINARY_URL (cloudinary://API_KEY:API_SECRET@CLOUD_NAME) se suben a
//    Cloudinary y se guarda su dirección https. Es lo que se usa al publicar
//    en Render, porque ahí la carpeta del servidor se borra en cada reinicio.
//  • Sin esa variable (en tu computadora) se guardan en server/uploads.
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const cfg = (() => {
  // Tolera errores comunes al pegarla en Render: "CLOUDINARY_URL=" delante,
  // comillas o espacios.
  const raw = String(process.env.CLOUDINARY_URL || "").trim().replace(/^CLOUDINARY_URL\s*=\s*/i, "").replace(/^["']|["']$/g, "").trim();
  const m = /^cloudinary:\/\/([^:\s]+):([^@\s]+)@([^\s/]+)\/?$/.exec(raw);
  return m ? { key: m[1], secret: m[2], cloud: m[3] } : null;
})();
export const usingCloudinary = !!cfg;
// En Render la carpeta del servidor se borra en cada reinicio: ahí no se
// guardan fotos en disco (se perderían). Mejor avisar que falta Cloudinary.
const EPHEMERAL = !!process.env.RENDER;

let uploadsDir = "";
export function setUploadsDir(dir) {
  uploadsDir = dir;
}

// Firma de Cloudinary: sha1 de los parámetros ordenados + el secreto.
function sign(params) {
  const str = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
  return crypto.createHash("sha1").update(str + cfg.secret).digest("hex");
}

async function cloudUpload(dataUrl, folder) {
  const params = { folder: `glow/${folder}`, timestamp: Math.floor(Date.now() / 1000) };
  const body = new URLSearchParams({ ...params, file: dataUrl, api_key: cfg.key, signature: sign(params) });
  const r = await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloud}/image/upload`, { method: "POST", body });
  const j = await r.json();
  if (!r.ok || !j.secure_url) throw new Error("Cloudinary: " + (j.error?.message || r.status));
  return j.secure_url;
}

/**
 * Guarda una imagen en data URL y devuelve su dirección pública.
 * folder: productos | yape | resenas | ajustes
 */
export async function saveImage(dataUrl, folder = "productos", maxBytes = 8 * 1024 * 1024) {
  const m = /^data:image\/(png|jpe?g|webp|gif|avif);base64,(.+)$/i.exec(dataUrl || "");
  if (!m) return "";
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > maxBytes) throw Object.assign(new Error("La imagen es demasiado grande."), { status: 413 });
  if (cfg) return cloudUpload(dataUrl, folder);
  if (EPHEMERAL) {
    throw Object.assign(new Error("Las fotos no se pueden guardar: falta conectar Cloudinary en Render (variable CLOUDINARY_URL)."), { status: 503 });
  }
  const ext = m[1].toLowerCase() === "jpeg" ? "jpg" : m[1].toLowerCase();
  const name = `${folder === "yape" ? "yape-" : ""}${crypto.randomUUID()}.${ext}`;
  await fs.writeFile(path.join(uploadsDir, name), buf);
  return `/uploads/${name}`;
}

// Borra una imagen guardada (de Cloudinary o de la carpeta local). Si falla,
// no interrumpe nada.
export async function deleteImage(url) {
  if (!url) return;
  try {
    if (url.startsWith("/uploads/")) {
      await fs.rm(path.join(uploadsDir, path.basename(url)), { force: true });
    } else if (cfg && url.includes(`res.cloudinary.com/${cfg.cloud}/`)) {
      // .../upload/v123/glow/yape/abc.jpg → public_id "glow/yape/abc"
      const pid = url.split("/upload/")[1]?.replace(/^v\d+\//, "").replace(/\.[a-z0-9]+$/i, "");
      if (!pid) return;
      const params = { public_id: pid, timestamp: Math.floor(Date.now() / 1000) };
      await fetch(`https://api.cloudinary.com/v1_1/${cfg.cloud}/image/destroy`, {
        method: "POST",
        body: new URLSearchParams({ ...params, api_key: cfg.key, signature: sign(params) }),
      });
    }
  } catch {
    /* no es grave: la imagen queda huérfana */
  }
}
