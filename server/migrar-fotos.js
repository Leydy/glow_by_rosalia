// Pasa a Cloudinary las fotos que hoy están en server/uploads y actualiza sus
// direcciones en la base de datos (productos, logo, QR de Yape, capturas y
// reseñas). Se ejecuta UNA vez, desde tu computadora, antes de publicar:
//
//   1. Pon CLOUDINARY_URL en server/.env
//   2. npm run migrar-fotos
//
// Es seguro repetirlo: solo toca direcciones que aún empiezan con /uploads/.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./db.js";
import { saveImage, setUploadsDir, usingCloudinary } from "./storage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "uploads");
setUploadsDir(uploadsDir);

if (!usingCloudinary) {
  console.error("\n❌ Falta CLOUDINARY_URL en server/.env (cloudinary://API_KEY:API_SECRET@CLOUD_NAME).\n");
  process.exit(1);
}

const MIME = { jpg: "jpeg", jpeg: "jpeg", png: "png", webp: "webp", gif: "gif", avif: "avif" };
const done = new Map(); // /uploads/x → https://res.cloudinary.com/…
let missing = 0;

async function move(url, folder) {
  if (typeof url !== "string" || !url.startsWith("/uploads/")) return url;
  if (done.has(url)) return done.get(url);
  const file = path.join(uploadsDir, path.basename(url));
  let buf;
  try {
    buf = await fs.readFile(file);
  } catch {
    missing++;
    console.warn("   ⚠ no existe:", url);
    return url;
  }
  const ext = path.extname(file).slice(1).toLowerCase();
  const out = await saveImage(`data:image/${MIME[ext] || "jpeg"};base64,${buf.toString("base64")}`, folder, 20 * 1024 * 1024);
  done.set(url, out);
  console.log("   ✓", url, "→", out);
  return out;
}

console.log("\n📦 Productos");
for (const p of (await pool.query("SELECT id, images FROM products")).rows) {
  const imgs = [];
  for (const u of p.images || []) imgs.push(await move(u, "productos"));
  await pool.query("UPDATE products SET images=$2::jsonb WHERE id=$1", [p.id, JSON.stringify(imgs)]);
}

console.log("\n⚙️  Ajustes (logo y QR de Yape)");
const st = (await pool.query("SELECT logo, yape_qr FROM settings WHERE id=1")).rows[0] || {};
await pool.query("UPDATE settings SET logo=$1, yape_qr=$2 WHERE id=1", [await move(st.logo, "ajustes"), await move(st.yape_qr, "ajustes")]);

console.log("\n🧾 Pedidos (capturas y fotos de los productos)");
for (const o of (await pool.query("SELECT id, capture, items FROM orders")).rows) {
  const items = [];
  for (const l of o.items || []) items.push({ ...l, image: await move(l.image, "productos") });
  await pool.query("UPDATE orders SET capture=$2, items=$3::jsonb WHERE id=$1", [o.id, await move(o.capture, "yape"), JSON.stringify(items)]);
}

console.log("\n⭐ Reseñas");
for (const r of (await pool.query("SELECT id, photo FROM reviews WHERE photo LIKE '/uploads/%'")).rows) {
  await pool.query("UPDATE reviews SET photo=$2 WHERE id=$1", [r.id, await move(r.photo, "resenas")]);
}

console.log(`\n✅ Listo: ${done.size} foto(s) subidas a Cloudinary${missing ? ` · ${missing} no encontradas` : ""}.\n`);
await pool.end();
