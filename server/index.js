// Servidor de la tienda "Glow by Rosalía".
// Expone una API REST sobre Postgres y guarda las imágenes como archivos.
//
// Rutas:
//   GET    /api/health            → comprobar que el servidor vive
//   POST   /api/auth              → valida el PIN del panel
//   GET    /api/products          → lista de productos
//   POST   /api/products          → crea un producto            (requiere PIN)
//   PUT    /api/products/:id       → edita un producto            (requiere PIN)
//   DELETE /api/products/:id       → borra un producto            (requiere PIN)
//   GET    /api/settings          → ajustes de la tienda
//   PUT    /api/settings          → guarda ajustes               (requiere PIN)
//   POST   /api/upload            → sube imágenes (base64) y devuelve sus URLs (requiere PIN)
//   GET    /uploads/<archivo>     → sirve las imágenes subidas
import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool, initSchema, rowToProduct, rowToSettings } from "./db.js";
import { SEED_PRODUCTS, DEFAULT_SETTINGS } from "../src/data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "uploads");
const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
// Las imágenes llegan como texto base64, por eso subimos el límite del body.
app.use(express.json({ limit: "20mb" }));

// Carpeta pública de imágenes.
app.use("/uploads", express.static(uploadsDir));

/* ---------- Seguridad ligera del panel ----------
   Las rutas de escritura piden la cabecera "x-admin-pin" igual al PIN guardado.
   Es una protección básica (suficiente para una tienda personal). Si algún día
   publicas esto abierto a internet, conviene reforzarlo con login/usuarios. */
async function getPin() {
  const { rows } = await pool.query("SELECT pin FROM settings WHERE id = 1");
  return rows[0]?.pin ?? "";
}
async function requirePin(req, res, next) {
  try {
    const sent = req.get("x-admin-pin");
    const real = await getPin();
    if (sent && sent === real) return next();
    res.status(401).json({ error: "PIN incorrecto o ausente." });
  } catch (e) {
    next(e);
  }
}

/* ---------- Salud ---------- */
app.get("/api/health", (_req, res) => res.json({ ok: true }));

/* ---------- Autenticación del panel ---------- */
app.post("/api/auth", async (req, res, next) => {
  try {
    const ok = String(req.body.pin ?? "") === (await getPin());
    res.json({ ok });
  } catch (e) {
    next(e);
  }
});

/* ---------- Productos ---------- */
app.get("/api/products", async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM products ORDER BY created_at ASC"
    );
    res.json(rows.map(rowToProduct));
  } catch (e) {
    next(e);
  }
});

function genId() {
  return "p" + crypto.randomUUID().slice(0, 12);
}

app.post("/api/products", requirePin, async (req, res, next) => {
  try {
    const p = req.body;
    const id = p.id || genId();
    const { rows } = await pool.query(
      `INSERT INTO products (id, name, category, cost, price, stock, emoji, best_seller, images, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10)
       RETURNING *`,
      [
        id,
        p.name,
        p.category,
        Number(p.cost) || 0,
        Number(p.price) || 0,
        Number(p.stock) || 0,
        p.emoji || "",
        !!p.bestSeller,
        JSON.stringify(Array.isArray(p.images) ? p.images : []),
        p.desc || "",
      ]
    );
    res.status(201).json(rowToProduct(rows[0]));
  } catch (e) {
    next(e);
  }
});

app.put("/api/products/:id", requirePin, async (req, res, next) => {
  try {
    const p = req.body;
    const { rows } = await pool.query(
      `UPDATE products
         SET name=$2, category=$3, cost=$4, price=$5, stock=$6,
             emoji=$7, best_seller=$8, images=$9::jsonb, description=$10
       WHERE id=$1
       RETURNING *`,
      [
        req.params.id,
        p.name,
        p.category,
        Number(p.cost) || 0,
        Number(p.price) || 0,
        Number(p.stock) || 0,
        p.emoji || "",
        !!p.bestSeller,
        JSON.stringify(Array.isArray(p.images) ? p.images : []),
        p.desc || "",
      ]
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "Producto no encontrado." });
    res.json(rowToProduct(rows[0]));
  } catch (e) {
    next(e);
  }
});

app.delete("/api/products/:id", requirePin, async (req, res, next) => {
  try {
    await pool.query("DELETE FROM products WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/* ---------- Importación masiva ----------
   Recibe una lista de productos (p. ej. los que estaban guardados en el
   navegador) y los inserta. Si un producto ya existe (mismo id), lo actualiza
   en vez de duplicarlo. Devuelve la lista completa de productos ya guardados. */
app.post("/api/import", requirePin, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const incoming = Array.isArray(req.body.products) ? req.body.products : [];
    await client.query("BEGIN");
    let saved = 0;
    for (const p of incoming) {
      if (!p || !p.name) continue;
      await client.query(
        `INSERT INTO products (id, name, category, cost, price, stock, emoji, best_seller, images, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10)
         ON CONFLICT (id) DO UPDATE SET
           name=EXCLUDED.name, category=EXCLUDED.category, cost=EXCLUDED.cost,
           price=EXCLUDED.price, stock=EXCLUDED.stock, emoji=EXCLUDED.emoji,
           best_seller=EXCLUDED.best_seller, images=EXCLUDED.images,
           description=EXCLUDED.description`,
        [
          p.id || genId(),
          p.name,
          p.category || "Otros",
          Number(p.cost) || 0,
          Number(p.price) || 0,
          Number(p.stock) || 0,
          p.emoji || "",
          !!p.bestSeller,
          JSON.stringify(Array.isArray(p.images) ? p.images : []),
          p.desc || "",
        ]
      );
      saved++;
    }
    await client.query("COMMIT");
    const { rows } = await client.query(
      "SELECT * FROM products ORDER BY created_at ASC"
    );
    res.json({ saved, products: rows.map(rowToProduct) });
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    next(e);
  } finally {
    client.release();
  }
});

/* ---------- Ajustes ---------- */
app.get("/api/settings", async (_req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT * FROM settings WHERE id=1");
    res.json(rowToSettings(rows[0]));
  } catch (e) {
    next(e);
  }
});

app.put("/api/settings", requirePin, async (req, res, next) => {
  try {
    const s = req.body;
    const { rows } = await pool.query(
      `UPDATE settings
         SET store_name=$1, whatsapp=$2, pin=$3, low_stock=$4, logo=$5, tagline=$6
       WHERE id=1
       RETURNING *`,
      [
        s.storeName,
        s.whatsapp,
        s.pin,
        Number(s.lowStock) || 0,
        s.logo || "",
        s.tagline || "",
      ]
    );
    res.json(rowToSettings(rows[0]));
  } catch (e) {
    next(e);
  }
});

/* ---------- Subida de imágenes ----------
   El frontend ya comprime cada foto a un JPEG pequeño (data URL). Aquí la
   decodificamos y la guardamos como archivo dentro de /uploads. Se devuelve
   la ruta pública de cada imagen para guardarla en el producto. */
app.post("/api/upload", requirePin, async (req, res, next) => {
  try {
    const images = Array.isArray(req.body.images) ? req.body.images : [];
    const urls = [];
    for (const dataUrl of images) {
      const m = /^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl || "");
      if (!m) continue;
      const ext = m[1] === "jpeg" ? "jpg" : m[1].toLowerCase();
      const buf = Buffer.from(m[2], "base64");
      const name = `${crypto.randomUUID()}.${ext}`;
      await fs.writeFile(path.join(uploadsDir, name), buf);
      urls.push(`/uploads/${name}`);
    }
    res.json({ urls });
  } catch (e) {
    next(e);
  }
});

/* ---------- Manejo de errores ---------- */
app.use((err, _req, res, _next) => {
  console.error("Error en la API:", err);
  res.status(500).json({ error: "Error interno del servidor." });
});

/* ---------- Datos iniciales ----------
   La primera vez que arranca (tabla vacía) carga los productos y ajustes de
   ejemplo que ya tenías en src/data.js. */
async function seedIfEmpty() {
  const { rows } = await pool.query("SELECT count(*)::int AS n FROM products");
  if (rows[0].n === 0) {
    for (const p of SEED_PRODUCTS) {
      await pool.query(
        `INSERT INTO products (id, name, category, cost, price, stock, emoji, best_seller, images, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10)`,
        [
          p.id,
          p.name,
          p.category,
          p.cost,
          p.price,
          p.stock,
          p.emoji || "",
          !!p.bestSeller,
          JSON.stringify(p.images || []),
          p.desc || "",
        ]
      );
    }
    console.log(`🌱 Cargados ${SEED_PRODUCTS.length} productos de ejemplo.`);
  }

  const s = await pool.query("SELECT count(*)::int AS n FROM settings");
  if (s.rows[0].n === 0) {
    const d = DEFAULT_SETTINGS;
    await pool.query(
      `INSERT INTO settings (id, store_name, whatsapp, pin, low_stock, logo, tagline)
       VALUES (1,$1,$2,$3,$4,$5,$6)`,
      [d.storeName, d.whatsapp, d.pin, d.lowStock, d.logo || "", d.tagline || ""]
    );
    console.log("🌱 Ajustes de la tienda inicializados.");
  }
}

async function main() {
  await fs.mkdir(uploadsDir, { recursive: true });
  await initSchema();
  await seedIfEmpty();
  app.listen(PORT, () => {
    console.log(`\n✅ Servidor de Glow listo en http://localhost:${PORT}`);
    console.log(`   Imágenes en: ${uploadsDir}\n`);
  });
}

main().catch((e) => {
  console.error("No se pudo iniciar el servidor:", e);
  process.exit(1);
});
