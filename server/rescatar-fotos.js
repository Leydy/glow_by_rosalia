// Rescate: pasa a Cloudinary las fotos que quedaron en el disco temporal de
// Render (/uploads/...) antes de que se borren. Las que ya no existen se quitan
// del producto. También rescata capturas de Yape de los pedidos y reseñas.
// Uso (desde la carpeta del proyecto): node server/rescatar-fotos.js
import "dotenv/config";
import { pool } from "./db.js";
import { saveImage, usingCloudinary } from "./storage.js";

const RENDER = "https://glow-by-rosalia.onrender.com";
if (!usingCloudinary) {
  console.error("Falta CLOUDINARY_URL en server/.env: sin eso no hay dónde guardar las fotos.");
  process.exit(1);
}

// Descarga una foto de Render y la sube a Cloudinary. null si ya no existe.
async function rescue(url, folder) {
  const r = await fetch(RENDER + url);
  const type = (r.headers.get("content-type") || "").split(";")[0];
  if (!r.ok || !type.startsWith("image/")) return null;
  const buf = Buffer.from(await r.arrayBuffer());
  return saveImage(`data:${type};base64,${buf.toString("base64")}`, folder, 15 * 1024 * 1024);
}

let ok = 0, lost = 0;
const { rows: prods } = await pool.query("SELECT id, name, images FROM products");
for (const p of prods) {
  const imgs = Array.isArray(p.images) ? p.images : [];
  if (!imgs.some((u) => String(u).startsWith("/uploads/"))) continue;
  const next = [];
  for (const u of imgs) {
    if (!String(u).startsWith("/uploads/")) { next.push(u); continue; }
    const nu = await rescue(u, "productos");
    if (nu) { next.push(nu); ok++; } else lost++;
  }
  await pool.query("UPDATE products SET images=$2::jsonb WHERE id=$1", [p.id, JSON.stringify(next)]);
  console.log(`${next.length ? "✓" : "⚠ sin fotos"}  ${p.name.slice(0, 50)} (${next.length}/${imgs.length})`);
}
for (const [table, col, folder] of [["orders", "capture", "yape"], ["reviews", "photo", "resenas"]]) {
  const { rows } = await pool.query(`SELECT id, ${col} AS u FROM ${table} WHERE ${col} LIKE '/uploads/%'`);
  for (const r of rows) {
    const nu = await rescue(r.u, folder);
    if (nu) { await pool.query(`UPDATE ${table} SET ${col}=$2 WHERE id=$1`, [r.id, nu]); ok++; } else lost++;
    console.log(`${nu ? "✓" : "⚠ perdida"}  ${table} #${r.id}`);
  }
}
console.log(`\nRescatadas: ${ok} · ya perdidas: ${lost}`);
await pool.end();
