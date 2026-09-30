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
//   GET    /api/settings          → ajustes públicos (sin PIN)
//   GET    /api/admin/settings    → ajustes completos             (requiere PIN)
//   GET    /api/admin/products    → productos con costo           (requiere PIN)
//   PUT    /api/settings          → guarda ajustes               (requiere PIN)
//   POST   /api/upload            → sube imágenes (base64) y devuelve sus URLs (requiere PIN)
//   GET    /api/config            → datos públicos de configuración (ID de Google)
//   GET    /api/shalom/agencies   → agencias Shalom de un departamento (si hay SHALOM_API_KEY)
//   POST   /api/customers/google  → registro/inicio de sesión con Google (opcional)
//   POST   /api/customers/test    → sesión de la cuenta de prueba (modo prueba)
//   GET    /api/me                → mi perfil                     (requiere sesión)
//   PUT    /api/me                → guarda mi perfil              (requiere sesión)
//   GET    /api/me/orders         → mis pedidos                   (requiere sesión)
//   PUT    /api/me/favorites      → guarda mis favoritos          (requiere sesión)
//   GET    /api/me/points         → mis Michipuntos, nivel y canjes (requiere sesión)
//   GET    /api/me/credits        → mi Michi-crédito               (requiere sesión)
//   POST   /api/me/credits/:id/claim → reclamar un crédito        (requiere sesión)
//   GET    /api/me/reviews        → mis reseñas                   (requiere sesión)
//   POST   /api/me/reviews        → reseñar un producto comprado  (requiere sesión)
//   GET    /api/products/:id/reviews → reseñas aprobadas (público)
//   GET    /api/admin/reviews     → reseñas por revisar           (requiere PIN)
//   PUT    /api/admin/reviews/:id → aprobar / rechazar            (requiere PIN)
//   GET    /api/customers         → clientes registrados         (requiere PIN)
//   DELETE /api/orders/test       → borra los pedidos de prueba  (requiere PIN)
//   POST   /api/orders            → registra un pedido pagado con Yape (público)
//   GET    /api/orders            → lista de pedidos             (requiere PIN)
//   PUT    /api/orders/:id        → cambia el estado de un pedido (requiere PIN)
//   GET    /uploads/<archivo>     → sirve las imágenes subidas
import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool, initSchema, rowToProduct, rowToSettings, rowToOrder, rowToCustomer, rowToReview, PE_DEPARTMENTS, shippingOf, shippingCost, publicProduct, publicSettings } from "./db.js";
import { RULES, addPoints, hasRef, balance, yearSpend, levelFor, orderPoints, maybeBirthday, pickSurprise } from "./points.js";
import { CREDIT, grantCredit, revokeCredit, claimCredit, wallet, spendCredit } from "./credits.js";
import { saveImage, deleteImage, setUploadsDir, usingCloudinary } from "./storage.js";
import { mailEnabled, welcomeEmail, sendMail } from "./mail.js";
import { SEED_PRODUCTS, DEFAULT_SETTINGS } from "../src/data.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Departamentos → provincias → distritos del Perú (INEI, vía github.com/jmcastagnetto/ubigeo-peru-aumentado).
const UBIGEO = JSON.parse(await fs.readFile(path.join(__dirname, "../src/ubigeo.json"), "utf8"));
const uploadsDir = path.join(__dirname, "uploads");
setUploadsDir(uploadsDir);
// Modo prueba (?prueba): activo salvo que TEST_MODE=off (al publicar).
const TEST_MODE_ON = process.env.TEST_MODE !== "off";
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

/* ---------- Configuración pública ---------- */
// El ID de cliente de Google no es secreto (va en la página); se configura en
// server/.env como GOOGLE_CLIENT_ID.
app.get("/api/config", (_req, res) => {
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || "", departments: PE_DEPARTMENTS, shalomAgencies: !!process.env.SHALOM_API_KEY, testMode: TEST_MODE_ON });
});

/* ---------- Sesión del cliente ----------
   Tras entrar con Google, el servidor entrega una llave firmada (HMAC) con el
   correo y la fecha de vencimiento. El navegador la envía en la cabecera
   "x-customer-token"; sin ella nadie puede ver pedidos ni datos de otra persona. */
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash("sha256").update("glow-session:" + process.env.DATABASE_URL).digest("hex");
const SESSION_DAYS = 60;

function signSession(email) {
  const body = Buffer.from(JSON.stringify({ email, exp: Date.now() + SESSION_DAYS * 864e5 })).toString("base64url");
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}
function readSession(token) {
  const [body, sig] = String(token || "").split(".");
  if (!body || !sig) return null;
  const good = crypto.createHmac("sha256", SESSION_SECRET).update(body).digest("base64url");
  if (sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  try {
    const d = JSON.parse(Buffer.from(body, "base64url").toString());
    return d.exp > Date.now() ? d.email : null;
  } catch {
    return null;
  }
}
function requireCustomer(req, res, next) {
  const email = readSession(req.get("x-customer-token"));
  if (!email) return res.status(401).json({ error: "Tu sesión venció. Vuelve a entrar." });
  req.customerEmail = email;
  next();
}
const customerOut = (row) => ({ ...rowToCustomer(row), token: signSession(row.email) });

// Cuenta compartida del modo prueba (?prueba). Se desactiva con TEST_MODE=off
// en server/.env cuando la tienda esté publicada.
const TEST_EMAIL = "prueba@glow.test";
app.post("/api/customers/test", async (_req, res, next) => {
  try {
    if (!TEST_MODE_ON) return res.status(404).json({ error: "Modo prueba desactivado." });
    const { rows } = await pool.query(
      `INSERT INTO customers (email, name) VALUES ($1, 'Leydy')
       ON CONFLICT (email) DO UPDATE SET last_login = now() RETURNING *`,
      [TEST_EMAIL]
    );
    await addPoints(TEST_EMAIL, RULES.welcome, "registro", "registro", "Bienvenida al club");
    res.json(customerOut(rows[0]));
  } catch (e) {
    next(e);
  }
});

app.get("/api/me", requireCustomer, async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT * FROM customers WHERE email=$1", [req.customerEmail]);
    if (!rows.length) return res.status(401).json({ error: "Tu sesión venció. Vuelve a entrar." });
    await maybeBirthday(req.customerEmail, rows[0].birthday);
    res.json(rowToCustomer(rows[0]));
  } catch (e) {
    next(e);
  }
});

app.put("/api/me", requireCustomer, async (req, res, next) => {
  try {
    const b = req.body || {};
    const clip = (v, n) => String(v ?? "").trim().slice(0, n);
    const { rows } = await pool.query(
      `UPDATE customers SET name=$2, phone=$3, address=$4, district=$5, newsletter=$6,
              birthday = COALESCE(birthday, $7::date)
       WHERE email=$1 RETURNING *`,
      [req.customerEmail, clip(b.name, 60), clip(b.phone, 20), clip(b.address, 160), clip(b.district, 60), b.newsletter !== false,
       /^\d{4}-\d{2}-\d{2}$/.test(b.birthday || "") ? b.birthday : null]
    );
    await maybeBirthday(req.customerEmail, rows[0].birthday);
    res.json(rowToCustomer(rows[0]));
  } catch (e) {
    next(e);
  }
});

app.get("/api/me/orders", requireCustomer, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM orders WHERE customer_email=$1 ORDER BY created_at DESC LIMIT 100",
      [req.customerEmail]
    );
    const { rows: earned } = await pool.query(
      "SELECT ref, amount FROM points WHERE email=$1 AND ref LIKE 'pedido-%'",
      [req.customerEmail]
    );
    const mult = levelFor(await yearSpend(req.customerEmail)).mult;
    res.json(rows.map((r) => {
      const o = rowToOrder(r);
      const got = earned.find((e) => e.ref === `pedido-${r.id}`);
      o.pointsEarned = got ? got.amount : 0;
      o.pointsPending = !got && r.status === "pendiente" ? orderPoints(r, mult) : 0;
      return o;
    }));
  } catch (e) {
    next(e);
  }
});

app.get("/api/me/points", requireCustomer, async (req, res, next) => {
  try {
    const email = req.customerEmail;
    const b = await balance(email);
    const spend = await yearSpend(email);
    const level = levelFor(spend);
    const next = RULES.levels.find((l) => l.min > spend) || null;
    const { rows: pend } = await pool.query(
      "SELECT * FROM orders WHERE customer_email=$1 AND status='pendiente'",
      [email]
    );
    res.json({
      ...b,
      pending: pend.reduce((s, o) => s + orderPoints(o, level.mult), 0),
      level, next, spend,
      perSol: RULES.perSol,
      rewards: RULES.rewards,
      levels: RULES.levels,
      reviewText: RULES.reviewText,
      reviewPhoto: RULES.reviewPhoto,
      expiryMonths: RULES.expiryMonths,
      welcome: RULES.welcome,
      birthday: RULES.birthday,
    });
  } catch (e) {
    next(e);
  }
});

/* ---------- Reseñas ----------
   Solo de productos comprados en pedidos con pago confirmado (una por producto
   y pedido). Los Michipuntos se dan cuando la administradora la aprueba. */
app.get("/api/me/credits", requireCustomer, async (req, res, next) => {
  try {
    res.json(await wallet(req.customerEmail));
  } catch (e) {
    next(e);
  }
});

app.post("/api/me/credits/:id/claim", requireCustomer, async (req, res, next) => {
  try {
    const c = await claimCredit(req.customerEmail, Number(req.params.id));
    if (!c) return res.status(400).json({ error: "Ese crédito ya no se puede reclamar." });
    res.json(await wallet(req.customerEmail));
  } catch (e) {
    next(e);
  }
});

app.get("/api/me/reviews", requireCustomer, async (req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT * FROM reviews WHERE email=$1 ORDER BY created_at DESC", [req.customerEmail]);
    res.json(rows.map(rowToReview));
  } catch (e) {
    next(e);
  }
});

app.post("/api/me/reviews", requireCustomer, async (req, res, next) => {
  try {
    const b = req.body || {};
    const orderId = Number(b.orderId);
    const rating = Math.round(Number(b.rating));
    const text = String(b.text || "").trim().slice(0, 600);
    if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ error: "Elige de 1 a 5 estrellas." });
    if (text.length < 15) return res.status(400).json({ error: "Cuéntanos un poquito más (al menos 15 letras)." });
    const { rows: ord } = await pool.query("SELECT * FROM orders WHERE id=$1 AND customer_email=$2", [orderId, req.customerEmail]);
    const o = ord[0];
    if (!o || !["verificado", "enviado"].includes(o.status))
      return res.status(400).json({ error: "Podrás reseñar cuando confirmemos el pago de ese pedido." });
    const item = (o.items || []).find((l) => l.id === String(b.productId));
    if (!item) return res.status(400).json({ error: "Ese producto no está en tu pedido." });
    const photo = b.photo ? await saveImage(b.photo, "resenas") : "";
    const { rows: me } = await pool.query("SELECT name FROM customers WHERE email=$1", [req.customerEmail]);
    const { rows } = await pool.query(
      `INSERT INTO reviews (email, name, order_id, product_id, rating, text, photo)
       VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (email, order_id, product_id) DO NOTHING RETURNING *`,
      [req.customerEmail, me[0]?.name || "", orderId, item.id, rating, text, photo]
    );
    if (!rows.length) return res.status(409).json({ error: "Ya reseñaste este producto de ese pedido." });
    res.status(201).json(rowToReview(rows[0]));
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    next(e);
  }
});

app.get("/api/products/:id/reviews", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.* FROM reviews r WHERE r.product_id=$2 AND ${REVIEW_VISIBLE}
        ORDER BY (r.photo <> '') DESC, r.created_at DESC LIMIT 50`,
      ["prueba" in req.query, req.params.id]
    );
    res.json(rows.map((r) => {
      const v = rowToReview(r);
      v.name = (v.name || "Clienta").split(/\s+/)[0]; // solo el primer nombre
      delete v.orderId;
      return v;
    }));
  } catch (e) {
    next(e);
  }
});

app.get("/api/admin/reviews", requirePin, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, p.name AS product_name FROM reviews r LEFT JOIN products p ON p.id = r.product_id
        ORDER BY (r.status = 'pendiente') DESC, r.created_at DESC LIMIT 200`
    );
    res.json(rows.map((r) => ({ ...rowToReview(r), productName: r.product_name || "", email: r.email })));
  } catch (e) {
    next(e);
  }
});

app.put("/api/admin/reviews/:id", requirePin, async (req, res, next) => {
  try {
    const status = String(req.body?.status || "");
    if (!["aprobada", "rechazada"].includes(status)) return res.status(400).json({ error: "Estado no válido." });
    const { rows } = await pool.query("UPDATE reviews SET status=$2 WHERE id=$1 RETURNING *", [Number(req.params.id), status]);
    const r = rows[0];
    if (!r) return res.status(404).json({ error: "Reseña no encontrada." });
    if (status === "aprobada") {
      // una sola vez por reseña (ref única)
      const pts = r.photo ? RULES.reviewPhoto : RULES.reviewText;
      await addPoints(r.email, pts, "resena", `resena-${r.id}`, r.photo ? "Reseña con foto" : "Reseña");
    }
    res.json(rowToReview(r));
  } catch (e) {
    next(e);
  }
});

app.put("/api/me/favorites", requireCustomer, async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body?.favorites) ? req.body.favorites.map(String).slice(0, 300) : [];
    const { rows } = await pool.query(
      "UPDATE customers SET favorites=$2::jsonb WHERE email=$1 RETURNING favorites",
      [req.customerEmail, JSON.stringify([...new Set(ids)])]
    );
    res.json({ favorites: rows[0]?.favorites || [] });
  } catch (e) {
    next(e);
  }
});

/* ---------- Agencias Shalom ----------
   Shalom no tiene API pública oficial. Se usa la API de terceros
   shalom-api-peru.com (requiere clave: SHALOM_API_KEY en server/.env). Sin
   clave, la clienta escribe la agencia a mano. Se guarda en memoria 12 h. */
const agencyCache = new Map();
const plainUpper = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
app.get("/api/shalom/agencies", async (req, res) => {
  const key = process.env.SHALOM_API_KEY;
  const dep = String(req.query.departamento || "");
  if (!key) return res.json({ enabled: false, items: [] });
  if (!PE_DEPARTMENTS.includes(dep)) return res.status(400).json({ error: "Departamento no válido." });
  const hit = agencyCache.get(dep);
  if (hit && hit.at > Date.now() - 12 * 3600e3) return res.json({ enabled: true, items: hit.items });
  try {
    const url = `https://api.shalom-api-peru.com/v1/agencies/search?departamento=${encodeURIComponent(plainUpper(dep))}&per_page=500`;
    const r = await fetch(url, { headers: { "X-API-Key": key }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    const list = Array.isArray(j) ? j : j.items || j.data || [];
    const pick = (o, ...ks) => ks.map((k) => o?.[k]).find((v) => v != null && v !== "") ?? "";
    const items = list
      .map((a) => ({
        id: String(pick(a, "id", "agencia_id")),
        name: String(pick(a, "name", "nombre", "agencia")),
        province: String(pick(a, "provincia", "province")),
        district: String(pick(a, "distrito", "district")),
        address: String(pick(a, "direccion", "address")),
      }))
      .filter((a) => a.name)
      .sort((x, y) => x.province.localeCompare(y.province) || x.name.localeCompare(y.name));
    agencyCache.set(dep, { at: Date.now(), items });
    res.json({ enabled: true, items });
  } catch (e) {
    // si la API falla, la tienda sigue funcionando con la agencia escrita a mano
    res.json({ enabled: false, items: [], error: "No se pudo consultar las agencias ahora." });
  }
});

/* ---------- Clientes (registro opcional con Google) ----------
   El navegador recibe de Google un "credential" (token firmado). Aquí se
   comprueba con Google que sea válido y que fue emitido para ESTA tienda. */
app.post("/api/customers/google", async (req, res, next) => {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return res.status(503).json({ error: "El registro con Google aún no está configurado." });
    const token = String(req.body?.credential || "");
    const r = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(token));
    const info = await r.json();
    if (!r.ok || info.aud !== clientId || info.email_verified !== "true")
      return res.status(401).json({ error: "No se pudo verificar tu cuenta de Google." });
    const { rows } = await pool.query(
      `INSERT INTO customers (email, name, picture) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET picture = EXCLUDED.picture, last_login = now()
       RETURNING *`,
      [info.email, info.given_name || info.name || "", info.picture || ""]
    );
    await addPoints(info.email, RULES.welcome, "registro", "registro", "Bienvenida al club");
    if (!rows[0].welcome_sent_at) sendWelcome(rows[0]); // sin esperar: el registro no se demora
    res.json(customerOut(rows[0]));
  } catch (e) {
    next(e);
  }
});

// Correo de bienvenida (una sola vez por clienta; si falla se puede reenviar).
async function sendWelcome(c) {
  if (!mailEnabled()) return { sent: false, reason: "El envío de correos no está configurado (BREVO_API_KEY)." };
  try {
    const m = welcomeEmail({ name: c.name, points: RULES.welcome });
    await sendMail({ to: c.email, name: c.name, ...m });
    await pool.query("UPDATE customers SET welcome_sent_at = now() WHERE email=$1", [c.email]);
    return { sent: true };
  } catch (e) {
    console.error("No se pudo enviar la bienvenida a", c.email, "-", e.message);
    return { sent: false, reason: e.message };
  }
}

// Clientas registradas, con sus números (solo la administradora).
app.get("/api/customers", requirePin, async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*,
              COALESCE(o.n, 0) AS orders, COALESCE(o.spent, 0) AS spent, o.last_order
         FROM customers c
         LEFT JOIN (SELECT customer_email, COUNT(*) AS n,
                           SUM(CASE WHEN status IN ('verificado','enviado') THEN total - shipping ELSE 0 END) AS spent,
                           MAX(created_at) AS last_order
                      FROM orders WHERE NOT is_test GROUP BY customer_email) o ON o.customer_email = c.email
        WHERE c.email <> $1
        ORDER BY c.created_at DESC`,
      [TEST_EMAIL]
    );
    const out = [];
    for (const r of rows) {
      const [pts, w] = await Promise.all([balance(r.email), wallet(r.email)]);
      out.push({
        email: r.email, name: r.name || "", picture: r.picture || "", phone: r.phone || "", district: r.district || "",
        birthday: r.birthday ? new Date(r.birthday).toISOString().slice(0, 10) : "",
        newsletter: r.newsletter, createdAt: r.created_at, lastLogin: r.last_login,
        welcomeSent: !!r.welcome_sent_at, orders: Number(r.orders), spent: Number(r.spent), lastOrder: r.last_order,
        points: pts.balance, credit: w.balance,
      });
    }
    res.json({ customers: out, mail: mailEnabled() });
  } catch (e) {
    next(e);
  }
});

app.post("/api/customers/welcome", requirePin, async (req, res, next) => {
  try {
    const email = String(req.body?.email || "");
    const test = !!req.body?.test;
    if (test) {
      // prueba: envía el correo a la dirección indicada, sin tocar a ninguna clienta
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: "Correo no válido." });
      if (!mailEnabled()) return res.status(400).json({ error: "El envío de correos no está configurado (BREVO_API_KEY)." });
      const name = String(req.body?.name || "Leydy");
      const r = await sendMail({ to: email, name, ...welcomeEmail({ name, points: RULES.welcome }) }).catch((e) => ({ sent: false, reason: e.message }));
      return r.sent ? res.json(r) : res.status(400).json({ error: r.reason });
    }
    const { rows } = await pool.query("SELECT * FROM customers WHERE email=$1", [email]);
    if (!rows.length) return res.status(404).json({ error: "Clienta no encontrada." });
    const r = await sendWelcome(rows[0]);
    return r.sent ? res.json(r) : res.status(400).json({ error: r.reason });
  } catch (e) {
    next(e);
  }
});

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
// Reseñas de pedidos de prueba: solo se ven con ?prueba (modo prueba).
const REVIEW_VISIBLE = `r.status='aprobada' AND ($1 OR NOT EXISTS (SELECT 1 FROM orders o WHERE o.id = r.order_id AND o.is_test))`;

app.get("/api/products", async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, r.review_avg, COALESCE(r.review_count, 0) AS review_count
         FROM products p
         LEFT JOIN (SELECT r.product_id, AVG(r.rating) AS review_avg, COUNT(*) AS review_count
                      FROM reviews r WHERE ${REVIEW_VISIBLE} GROUP BY r.product_id) r ON r.product_id = p.id
        ORDER BY p.created_at ASC`,
      ["prueba" in req.query]
    );
    res.json(rows.map(publicProduct));
  } catch (e) {
    next(e);
  }
});

app.get("/api/admin/products", requirePin, async (_req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT * FROM products ORDER BY created_at ASC");
    res.json(rows.map(rowToProduct));
  } catch (e) {
    next(e);
  }
});

function genId() {
  return "p" + crypto.randomUUID().slice(0, 12);
}

// Marca opcional "×2 Michipuntos" de un producto.
async function saveDoublePoints(row, p) {
  if (!("doublePoints" in p)) return row;
  const { rows } = await pool.query("UPDATE products SET double_points=$2 WHERE id=$1 RETURNING *", [row.id, !!p.doublePoints]);
  return rows[0];
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
    const saved = await saveDoublePoints(rows[0], p);
    res.status(201).json(rowToProduct(saved));
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
    res.json(rowToProduct(await saveDoublePoints(rows[0], p)));
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

/* ---------- Pedidos (pago con Yape) ----------
   El cliente envía qué compró (id + cantidad), el Nro. de operación y la
   captura. Los precios se recalculan aquí con los de la base de datos, así
   nadie puede cambiar el total desde el navegador. */
const ORDER_STATUS = ["pendiente", "verificado", "enviado", "rechazado"];

const saveDataUrl = (dataUrl) => saveImage(dataUrl, "yape", 6 * 1024 * 1024);

app.post("/api/orders", async (req, res, next) => {
  try {
    const { items, yapeOp, capture, reward, delivery, useCredit } = req.body || {};
    const test = TEST_MODE_ON && !!req.body?.test; // al publicar, nadie puede crear pedidos "de prueba"
    if (reward && useCredit) return res.status(400).json({ error: "Elige un solo beneficio por pedido: Michi-crédito o Michipuntos." });
    const customerEmail = readSession(req.get("x-customer-token"));
    const op = String(yapeOp || "").replace(/\D/g, "");
    if (op.length < 4 || op.length > 14)
      return res.status(400).json({ error: "El Nro. de operación no es válido." });
    if (!Array.isArray(items) || items.length === 0 || items.length > 50)
      return res.status(400).json({ error: "El pedido está vacío." });

    const ids = items.map((i) => String(i.id));
    const { rows: prods } = await pool.query("SELECT * FROM products WHERE id = ANY($1)", [ids]);
    const lines = [];
    for (const it of items) {
      const p = prods.find((x) => x.id === String(it.id));
      const qty = Math.max(1, Math.min(99, Math.floor(Number(it.qty) || 0)));
      if (!p) return res.status(400).json({ error: "Un producto del carrito ya no existe." });
      lines.push({ id: p.id, name: p.name, qty, price: Number(p.price), image: (p.images || [])[0] || "", double: !!p.double_points });
    }
    const subtotal = lines.reduce((s, l) => s + l.qty * l.price, 0);

    // Canje de Michipuntos (opcional, uno por pedido, con compra mínima).
    let tier = null;
    if (reward) {
      tier = RULES.rewards.find((r) => r.key === reward);
      if (!tier || !customerEmail) return res.status(400).json({ error: "Ese canje no está disponible." });
      if (subtotal < tier.min) return res.status(400).json({ error: `Ese canje es para compras desde S/ ${tier.min}.` });
      if ((await balance(customerEmail)).balance < tier.points)
        return res.status(400).json({ error: "No tienes Michipuntos suficientes para ese canje." });
    }
    const discount = tier ? tier.value : 0;

    // SORPRESAA!!!: se agrega un regalo (precio 0) elegido por la tienda.
    if (tier?.surprise) {
      const gift = await pickSurprise(lines.map((l) => l.id));
      if (!gift) return res.status(400).json({ error: "La sorpresa no está disponible ahora. Elige otro canje." });
      lines.push({ id: gift.id, name: gift.name, qty: 1, price: 0, image: (gift.images || [])[0] || "", gift: true });
    }

    // Entrega: gratis en Juliaca (punto elegido) o envío por Shalom (tarifa del panel).
    const { rows: st } = await pool.query("SELECT shipping FROM settings WHERE id=1");
    const cfg = shippingOf(st[0]?.shipping);
    const d = delivery || {};
    const clip = (v, n) => String(v ?? "").trim().slice(0, n);
    let deliv, shipping = 0;
    if (d.type === "juliaca") {
      const pt = cfg.juliacaPoints.find((p) => p.name === d.point);
      if (!pt) return res.status(400).json({ error: "Elige un punto de entrega en Juliaca." });
      // día y hora exactos, dentro del horario del punto y en el futuro (hora de Perú)
      const date = String(d.date || ""), time = String(d.time || "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
        return res.status(400).json({ error: "Elige el día y la hora de entrega." });
      const [y, mo, da] = date.split("-").map(Number);
      const [h, mi] = time.split(":").map(Number);
      const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
      if (!pt.days.includes(new Date(Date.UTC(y, mo - 1, da)).getUTCDay()))
        return res.status(400).json({ error: "Ese día no hay entregas en ese punto." });
      if (h * 60 + mi < toMin(pt.from) || h * 60 + mi >= toMin(pt.to) || (h * 60 + mi - toMin(pt.from)) % 30 !== 0)
        return res.status(400).json({ error: `En ese punto entregamos de ${pt.from} a ${pt.to}.` });
      const limaNow = Date.now() - 5 * 3600e3; // Perú: UTC-5 todo el año
      const slot = Date.UTC(y, mo - 1, da, h, mi);
      if (slot < limaNow + 30 * 60e3 || slot > limaNow + 31 * 864e5)
        return res.status(400).json({ error: "Elige una hora de entrega en los próximos días." });
      if (!clip(d.name, 60) || !/^9\d{8}$/.test(String(d.phone || "").replace(/\D/g, "").replace(/^51(?=9\d{8}$)/, "")))
        return res.status(400).json({ error: "Escribe tu nombre y un celular de 9 dígitos." });
      deliv = { type: "juliaca", point: pt.name, date, time, name: clip(d.name, 60), phone: clip(d.phone, 20), note: clip(d.note, 160) };
    } else if (d.type === "shalom") {
      if (!PE_DEPARTMENTS.includes(d.department)) return res.status(400).json({ error: "Elige el departamento de destino." });
      if (!/^\d{8}$/.test(String(d.dni || ""))) return res.status(400).json({ error: "El DNI debe tener 8 dígitos." });
      const provs = UBIGEO[d.department] || {};
      if (!provs[d.province] || !provs[d.province].includes(d.district))
        return res.status(400).json({ error: "Elige la provincia y el distrito de destino." });
      if (clip(d.name, 80).split(/\s+/).filter((w) => w.length > 1).length < 2)
        return res.status(400).json({ error: "Escribe los nombres y apellidos completos de quien recoge." });
      if (!/^9\d{8}$/.test(String(d.phone || "").replace(/\D/g, "").replace(/^51(?=9\d{8}$)/, "")))
        return res.status(400).json({ error: "El celular debe tener 9 dígitos." });
      if (!clip(d.agency, 120))
        return res.status(400).json({ error: "Elige la agencia Shalom donde recogerás." });
      shipping = shippingCost(cfg, d.department);
      deliv = { type: "shalom", department: d.department, province: d.province, district: d.district, city: d.district, agency: clip(d.agency, 120),
        name: clip(d.name, 80), dni: String(d.dni), phone: clip(d.phone, 20), note: clip(d.note, 160) };
    } else return res.status(400).json({ error: "Elige cómo quieres recibir tu pedido." });

    if (useCredit && (!customerEmail || subtotal < CREDIT.minPurchase))
      return res.status(400).json({ error: `El Michi-crédito se usa en compras desde S/ ${CREDIT.minPurchase}.` });
    let total = subtotal - discount + shipping;

    const dup = await pool.query("SELECT id FROM orders WHERE yape_op = $1", [op]);
    if (dup.rows.length)
      return res.status(409).json({ error: "Ese Nro. de operación ya se registró en otro pedido." });

    // Descuenta stock (en una transacción: o se descuenta todo o nada).
    const takeStock = !test;
    const client = await pool.connect();
    let rows;
    try {
      await client.query("BEGIN");
      if (takeStock) {
        for (const l of lines) {
          const r = await client.query("UPDATE products SET stock = stock - $2 WHERE id=$1 AND stock >= $2", [l.id, l.qty]);
          if (!r.rowCount) {
            await client.query("ROLLBACK");
            return res.status(409).json({ error: `Lo sentimos, «${l.name}» ya no tiene stock suficiente.` });
          }
        }
      }
    // Michi-crédito (dentro de la transacción): el total se recalcula.
    let creditUsed = 0;
    if (useCredit) {
      creditUsed = await spendCredit(client, customerEmail, subtotal);
      if (!creditUsed) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "No tienes Michi-crédito disponible." });
      }
      total = Math.round((total - creditUsed) * 100) / 100;
    }
    const captureUrl = await saveDataUrl(capture);
    ({ rows } = await client.query(
      `INSERT INTO orders (items, total, yape_op, capture, is_test, customer_email, subtotal, discount, reward_points, delivery, shipping)
       VALUES ($1::jsonb, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11) RETURNING *`,
      [JSON.stringify(lines), total, op, captureUrl, !!test, customerEmail, subtotal, discount, tier ? tier.points : 0, JSON.stringify(deliv), shipping]
    ));
      if (takeStock) await client.query("UPDATE orders SET stock_taken=true WHERE id=$1", [rows[0].id]);
      if (creditUsed) {
        await client.query("UPDATE orders SET credit_used=$2 WHERE id=$1", [rows[0].id, creditUsed]);
        rows[0].credit_used = creditUsed;
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    } finally {
      client.release();
    }
    if (tier) {
      const code = `#GLW-${String(rows[0].id).padStart(4, "0")}`;
      await addPoints(customerEmail, -tier.points, "canje", `canje-${rows[0].id}`,
        tier.surprise ? `SORPRESAA!!! en ${code}` : `Descuento de S/ ${tier.value} en ${code}`);
    }
    res.status(201).json(rowToOrder(rows[0]));
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message });
    next(e);
  }
});

app.delete("/api/orders/test", requirePin, async (_req, res, next) => {
  try {
    const { rows: revs } = await pool.query(
      "DELETE FROM reviews WHERE order_id IN (SELECT id FROM orders WHERE is_test) RETURNING photo"
    );
    await pool.query("DELETE FROM credits WHERE order_id IN (SELECT id FROM orders WHERE is_test)");
    const { rows } = await pool.query("DELETE FROM orders WHERE is_test RETURNING capture");
    for (const r of [...rows.map((x) => x.capture), ...revs.map((x) => x.photo)]) {
      await deleteImage(r);
    }
    res.json({ deleted: rows.length });
  } catch (e) {
    next(e);
  }
});

app.get("/api/orders", requirePin, async (_req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT * FROM orders ORDER BY created_at DESC LIMIT 200");
    res.json(rows.map(rowToOrder));
  } catch (e) {
    next(e);
  }
});

app.put("/api/orders/:id", requirePin, async (req, res, next) => {
  try {
    const status = String(req.body?.status || "");
    if (!ORDER_STATUS.includes(status)) return res.status(400).json({ error: "Estado no válido." });
    const id = Number(req.params.id);
    const cur = await pool.query("SELECT status FROM orders WHERE id=$1", [id]);
    if (!cur.rows.length) return res.status(404).json({ error: "Pedido no encontrado." });
    if (cur.rows[0].status === "rechazado" && status !== "rechazado")
      return res.status(400).json({ error: "Un pedido rechazado no se puede reabrir (sus Michipuntos ya se devolvieron)." });
    const { rows } = await pool.query("UPDATE orders SET status=$1 WHERE id=$2 RETURNING *", [status, id]);
    const o = rows[0];
    const code = "#GLW-" + String(id).padStart(4, "0");
    if (status === "rechazado" && o.stock_taken) {
      // pago no válido → los productos vuelven al stock
      for (const l of o.items || []) await pool.query("UPDATE products SET stock = stock + $2 WHERE id=$1", [l.id, Number(l.qty) || 0]);
      await pool.query("UPDATE orders SET stock_taken=false WHERE id=$1", [id]);
    }
    if (o.customer_email) {
      if (status === "verificado" || status === "enviado") {
        // pago confirmado → gana Michipuntos (una sola vez por pedido)
        await grantCredit(o); // Michi-crédito por reclamar (una vez por pedido)
        if (!(await hasRef(o.customer_email, `pedido-${id}`))) {
          const mult = levelFor(await yearSpend(o.customer_email, id)).mult;
          await addPoints(o.customer_email, orderPoints(o, mult), "compra", `pedido-${id}`, `Compra ${code}`);
        }
      } else if (status === "rechazado") {
        // pago no válido → se quitan los puntos ganados y se devuelve el canje
        const { rows: got } = await pool.query("SELECT amount FROM points WHERE email=$1 AND ref=$2", [o.customer_email, `pedido-${id}`]);
        if (got.length) await addPoints(o.customer_email, -got[0].amount, "reverso", `reverso-${id}`, `Pedido ${code} rechazado`);
        if (o.reward_points > 0) await addPoints(o.customer_email, o.reward_points, "devolucion", `devol-${id}`, `Devolución del canje de ${code}`);
        await revokeCredit(o);
      }
    }
    res.json(rowToOrder(o));
  } catch (e) {
    next(e);
  }
});

/* ---------- Ajustes ---------- */
app.get("/api/settings", async (_req, res, next) => {
  try {
    const { rows } = await pool.query("SELECT * FROM settings WHERE id=1");
    res.json(publicSettings(rows[0]));
  } catch (e) {
    next(e);
  }
});

app.get("/api/admin/settings", requirePin, async (_req, res, next) => {
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
    if (!String(s.pin ?? "").trim()) s.pin = await getPin(); // PIN vacío: se conserva el actual
    const { rows } = await pool.query(
      `UPDATE settings
         SET store_name=$1, whatsapp=$2, pin=$3, low_stock=$4, logo=$5, tagline=$6,
             yape_number=$7, yape_name=$8, yape_qr=$9, shipping=$10::jsonb
       WHERE id=1
       RETURNING *`,
      [
        s.storeName,
        s.whatsapp,
        s.pin,
        Number(s.lowStock) || 0,
        s.logo || "",
        s.tagline || "",
        String(s.yapeNumber || "").replace(/\D/g, ""),
        s.yapeName || "",
        s.yapeQr || "",
        JSON.stringify(shippingOf(s.shipping)),
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
      const url = await saveImage(dataUrl, "productos");
      if (url) urls.push(url);
    }
    res.json({ urls });
  } catch (e) {
    next(e);
  }
});

/* ---------- La tienda (publicada) ----------
   Tras "npm run build", el mismo servidor entrega la página: una sola
   dirección para la tienda, el panel (/#admin) y la API. */
const distDir = path.join(__dirname, "../dist");
const hasDist = await fs.access(path.join(distDir, "index.html")).then(() => true, () => false);
if (hasDist) {
  app.use(express.static(distDir, {
    index: false,
    maxAge: "7d",
    setHeaders: (res, p) => { if (p.endsWith(".html")) res.setHeader("Cache-Control", "no-cache"); },
  }));
  app.get(/^\/(?!api\/|uploads\/).*/, (_req, res) => {
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(distDir, "index.html"));
  });
}

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
    console.log(`   Imágenes en: ${usingCloudinary ? "Cloudinary" : uploadsDir}`);
    console.log(`   Tienda: ${hasDist ? "servida desde dist/" : "usa npm run dev"} · modo prueba: ${TEST_MODE_ON ? "activo" : "apagado"}\n`);
  });
}

main().catch((e) => {
  console.error("No se pudo iniciar el servidor:", e);
  process.exit(1);
});
