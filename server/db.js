// Conexión a Postgres y creación de las tablas.
// La URL de conexión se lee de la variable DATABASE_URL (archivo server/.env).
import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Carga server/.env sin importar desde qué carpeta se ejecute el comando.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error(
    "\n❌ Falta DATABASE_URL.\n" +
      "   Copia server/.env.example a server/.env y pega ahí la URL de tu base Postgres.\n"
  );
  process.exit(1);
}

// Neon/Supabase exigen SSL; un Postgres local (localhost) no.
const isLocal = /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

// Crea las tablas si todavía no existen (seguro de ejecutar muchas veces).
export async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      category    TEXT NOT NULL,
      cost        NUMERIC NOT NULL DEFAULT 0,
      price       NUMERIC NOT NULL DEFAULT 0,
      stock       INTEGER NOT NULL DEFAULT 0,
      emoji       TEXT,
      best_seller BOOLEAN NOT NULL DEFAULT false,
      images      JSONB NOT NULL DEFAULT '[]'::jsonb,
      description TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS settings (
      id         INTEGER PRIMARY KEY DEFAULT 1,
      store_name TEXT,
      whatsapp   TEXT,
      pin        TEXT,
      low_stock  INTEGER,
      logo       TEXT,
      tagline    TEXT,
      CONSTRAINT settings_single_row CHECK (id = 1)
    );

    -- Pago con Yape (se añaden a tiendas que ya tenían la tabla creada).
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS yape_number TEXT;
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS yape_name   TEXT;
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS yape_qr     TEXT;

    -- Pedidos pagados con Yape (con la captura del comprobante).
    CREATE TABLE IF NOT EXISTS orders (
      id          SERIAL PRIMARY KEY,
      items       JSONB NOT NULL,
      total       NUMERIC NOT NULL,
      yape_op     TEXT NOT NULL,
      capture     TEXT,
      status      TEXT NOT NULL DEFAULT 'pendiente',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS orders_yape_op_key ON orders (yape_op);
    -- Pedidos hechos en el modo prueba (?prueba): se marcan para borrarlos fácil.
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;
    -- Cliente que hizo el pedido (si tenía la sesión iniciada).
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email TEXT;

    -- Clientes registrados con Google (opcional). Aceptan recibir novedades.
    CREATE TABLE IF NOT EXISTS customers (
      email       TEXT PRIMARY KEY,
      name        TEXT,
      picture     TEXT,
      newsletter  BOOLEAN NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_login  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    -- Perfil (datos de envío) y lista de favoritos (ids de productos).
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone     TEXT;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS address   TEXT;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS district  TEXT;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS favorites JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS birthday  DATE;
    ALTER TABLE customers ADD COLUMN IF NOT EXISTS welcome_sent_at TIMESTAMPTZ;

    -- Michipuntos: libro de movimientos. "ref" evita dar dos veces el mismo
    -- bono (registro, cumple-2026, pedido-12, canje-12…).
    CREATE TABLE IF NOT EXISTS points (
      id          SERIAL PRIMARY KEY,
      email       TEXT NOT NULL,
      amount      INTEGER NOT NULL,
      kind        TEXT NOT NULL,
      ref         TEXT NOT NULL,
      note        TEXT,
      expires_at  TIMESTAMPTZ,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS points_email_ref_key ON points (email, ref);

    -- Pedidos: subtotal, descuento canjeado con Michipuntos.
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal      NUMERIC;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount      NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS reward_points INTEGER NOT NULL DEFAULT 0;

    -- Envíos: configuración (puntos de entrega en Juliaca y tarifas Shalom)
    -- y, en cada pedido, a dónde va y cuánto se cobró de envío.
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS shipping JSONB;
    -- Temporadas (Halloween, Navidad…): { clave: { on, from, to, title, text, cta } }
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS seasons JSONB;
    ALTER TABLE orders   ADD COLUMN IF NOT EXISTS delivery JSONB;
    ALTER TABLE orders   ADD COLUMN IF NOT EXISTS shipping NUMERIC NOT NULL DEFAULT 0;
    -- Revisión automática de la captura (app, monto, titular, fecha) para el panel.
    ALTER TABLE orders   ADD COLUMN IF NOT EXISTS pay_check JSONB;
    -- true cuando el pedido descontó stock (se devuelve si se rechaza).
    ALTER TABLE orders   ADD COLUMN IF NOT EXISTS stock_taken BOOLEAN NOT NULL DEFAULT false;

    -- Reseñas de productos comprados (dan Michipuntos al aprobarlas).
    CREATE TABLE IF NOT EXISTS reviews (
      id          SERIAL PRIMARY KEY,
      email       TEXT NOT NULL,
      name        TEXT,
      order_id    INTEGER NOT NULL,
      product_id  TEXT NOT NULL,
      rating      INTEGER NOT NULL,
      text        TEXT NOT NULL,
      photo       TEXT,
      status      TEXT NOT NULL DEFAULT 'pendiente',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS reviews_once_key ON reviews (email, order_id, product_id);

    -- Michi-crédito: soles que se "devuelven" al confirmar un pago. Hay que
    -- reclamarlos (48 h) y usarlos antes de que venzan (10 días).
    CREATE TABLE IF NOT EXISTS credits (
      id           SERIAL PRIMARY KEY,
      email        TEXT NOT NULL,
      order_id     INTEGER,
      amount       NUMERIC NOT NULL,
      used         NUMERIC NOT NULL DEFAULT 0,
      status       TEXT NOT NULL DEFAULT 'por_reclamar',
      note         TEXT,
      claim_until  TIMESTAMPTZ,
      expires_at   TIMESTAMPTZ,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS credits_order_key ON credits (order_id, note);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS credit_used NUMERIC NOT NULL DEFAULT 0;

    -- Productos con ×2 Michipuntos (para rotar stock).
    ALTER TABLE products ADD COLUMN IF NOT EXISTS double_points BOOLEAN NOT NULL DEFAULT false;
    -- Datos extra por sección: Skin (piel, paso de rutina, ml, NSO…) y Kids (tallas, figura del muñequito).
    ALTER TABLE products ADD COLUMN IF NOT EXISTS details JSONB;
  `);
}

// Convierte una fila de la tabla al formato que ya usa el frontend
// (camelCase, campo "desc", números como Number).
export function rowToProduct(r) {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    cost: Number(r.cost),
    price: Number(r.price),
    stock: Number(r.stock),
    emoji: r.emoji || "",
    bestSeller: r.best_seller,
    doublePoints: !!r.double_points,
    images: Array.isArray(r.images) ? r.images : [],
    desc: r.description || "",
    details: detailsOf(r.details),
  };
}

// Datos extra de un producto (Skin / Kids), limpios y con tamaños acotados.
const HEX = /^#[0-9a-fA-F]{6}$/;
export function detailsOf(raw) {
  const d = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const txt = (v, n) => String(v ?? "").trim().slice(0, n);
  const list = (v, n, len = 24) => (Array.isArray(v) ? v : []).map((x) => txt(x, len)).filter(Boolean).slice(0, n);
  const out = {};
  if (d.step) out.step = txt(d.step, 20);
  if (d.skinTypes) out.skinTypes = list(d.skinTypes, 8);
  if (d.concerns) out.concerns = list(d.concerns, 8);
  if (d.size) out.size = txt(d.size, 20);
  if (d.ingredients) out.ingredients = txt(d.ingredients, 400);
  if (d.usage) out.usage = txt(d.usage, 400);
  if (d.nso) out.nso = txt(d.nso, 40);
  if (d.sizes) out.sizes = list(d.sizes, 20, 12);
  if (["niña", "niño", "unisex"].includes(d.gender)) out.gender = d.gender;
  // Colores (variantes): nombre + foto que lo muestra.
  if (Array.isArray(d.colors)) {
    const seen = new Set();
    out.colors = d.colors
      .map((c) => {
        const o = { name: txt(c && c.name, 30), img: txt(c && c.img, 400) };
        // stock propio del color (si se indicó)
        if (c && c.stock !== undefined && c.stock !== null && c.stock !== "" && Number.isFinite(Number(c.stock))) o.stock = Math.max(0, Math.floor(Number(c.stock)));
        return o;
      })
      .filter((c) => c.name && !seen.has(c.name.toLowerCase()) && seen.add(c.name.toLowerCase()))
      .slice(0, 16);
  }
  return out;
}

// Código visible del pedido: GLW-0001, GLW-0002…
// Para la tienda pública: sin el precio de costo (solo lo ve la administradora).
export function publicProduct(r) {
  const { cost, ...rest } = rowToProduct(r);
  if (r.review_count != null) {
    rest.rating = r.review_avg == null ? 0 : Math.round(Number(r.review_avg) * 10) / 10;
    rest.reviews = Number(r.review_count);
  }
  return rest;
}

export function rowToOrder(r) {
  return {
    id: r.id,
    code: "GLW-" + String(r.id).padStart(4, "0"),
    items: Array.isArray(r.items) ? r.items : [],
    total: Number(r.total),
    yapeOp: r.yape_op,
    payCheck: r.pay_check || null,
    capture: r.capture || "",
    status: r.status,
    isTest: !!r.is_test,
    subtotal: r.subtotal == null ? Number(r.total) : Number(r.subtotal),
    discount: Number(r.discount || 0),
    rewardPoints: Number(r.reward_points || 0),
    shipping: Number(r.shipping || 0),
    creditUsed: Number(r.credit_used || 0),
    delivery: r.delivery || null,
    createdAt: r.created_at,
  };
}

export function rowToReview(r) {
  return {
    id: r.id,
    name: r.name || "",
    orderId: r.order_id,
    productId: r.product_id,
    rating: Number(r.rating),
    text: r.text,
    photo: r.photo || "",
    status: r.status,
    createdAt: r.created_at,
  };
}

export function rowToCustomer(r) {
  return {
    email: r.email,
    name: r.name || "",
    picture: r.picture || "",
    phone: r.phone || "",
    address: r.address || "",
    district: r.district || "",
    newsletter: r.newsletter,
    favorites: Array.isArray(r.favorites) ? r.favorites : [],
    birthday: r.birthday ? new Date(r.birthday).toISOString().slice(0, 10) : "",
  };
}

// Envíos por defecto: entrega gratis en Juliaca (puntos editables) y tarifas
// Shalom por departamento. La tarifa por defecto es un EJEMPLO: se ajusta en
// el panel con el cotizador oficial de Shalom.
export const PE_DEPARTMENTS = [
  "Amazonas", "Áncash", "Apurímac", "Arequipa", "Ayacucho", "Cajamarca", "Callao", "Cusco",
  "Huancavelica", "Huánuco", "Ica", "Junín", "La Libertad", "Lambayeque", "Lima", "Loreto",
  "Madre de Dios", "Moquegua", "Pasco", "Piura", "Puno", "San Martín", "Tacna", "Tumbes", "Ucayali",
];
export const DEFAULT_SHIPPING = {
  // days: 0 = domingo … 6 = sábado; from/to en formato 24 h
  juliacaPoints: [
    { name: "Plaza de Armas de Juliaca", days: [1, 2, 3, 4, 5, 6], from: "16:00", to: "19:00" },
    { name: "Real Plaza Juliaca", days: [6, 0], from: "11:00", to: "18:00" },
    { name: "Universidad Andina (UANCV)", days: [1, 2, 3, 4, 5], from: "12:00", to: "14:00" },
  ],
  defaultRate: 12,
  rates: {},
};
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
export function normPoint(p) {
  const o = typeof p === "string" ? { name: p } : p || {};
  const days = Array.isArray(o.days) ? [...new Set(o.days.map(Number).filter((d) => d >= 0 && d <= 6))].sort() : [1, 2, 3, 4, 5, 6];
  const from = HHMM.test(o.from || "") ? o.from : "10:00";
  let to = HHMM.test(o.to || "") ? o.to : "18:00";
  if (to <= from) to = from.replace(/^\d{2}/, (h) => String(Math.min(23, Number(h) + 1)).padStart(2, "0"));
  return { name: String(o.name || "").trim().slice(0, 80), days, from, to };
}

export function shippingOf(raw) {
  const s = raw && typeof raw === "object" ? raw : {};
  return {
    // cada punto: { name, days, from, to } (los antiguos se completan con Lun–Sáb 10–18 h)
    juliacaPoints: Array.isArray(s.juliacaPoints)
      ? s.juliacaPoints.map(normPoint).filter((p) => p.name)
      : DEFAULT_SHIPPING.juliacaPoints,
    defaultRate: Number.isFinite(Number(s.defaultRate)) ? Number(s.defaultRate) : DEFAULT_SHIPPING.defaultRate,
    // agencias Shalom sugeridas: { "Puno": ["Juliaca – Jr. …", …], … }
    agencies: Object.fromEntries(
      Object.entries(s.agencies && typeof s.agencies === "object" ? s.agencies : {})
        .filter(([d]) => PE_DEPARTMENTS.includes(d))
        .map(([d, list]) => [d, (Array.isArray(list) ? list : []).map((x) => String(x).trim().slice(0, 120)).filter(Boolean).slice(0, 40)])
        .filter(([, list]) => list.length)
    ),
    rates: s.rates && typeof s.rates === "object" ? s.rates : {},
  };
}
export function shippingCost(cfg, department) {
  const r = Number(cfg.rates?.[department]);
  return Number.isFinite(r) && cfg.rates?.[department] !== "" && cfg.rates?.[department] != null ? r : cfg.defaultRate;
}

// Temporadas guardadas por la tienda. Las fechas son "MM-DD" (se repiten cada año).
const MMDD = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export function seasonsOf(raw) {
  const src = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const txt = (v, n) => String(v ?? "").trim().slice(0, n);
  return Object.fromEntries(
    Object.entries(src)
      .filter(([k, v]) => /^[a-z]{2,20}$/.test(k) && v && typeof v === "object")
      .slice(0, 40)
      .map(([k, v]) => [k, {
        on: v.on !== false,
        from: MMDD.test(v.from || "") ? v.from : "",
        to: MMDD.test(v.to || "") ? v.to : "",
        title: txt(v.title, 60),
        text: txt(v.text, 140),
        cta: txt(v.cta, 30),
      }])
  );
}

export function publicSettings(r) {
  const { pin, ...rest } = rowToSettings(r);
  return rest;
}

export function rowToSettings(r) {
  return {
    storeName: r.store_name,
    whatsapp: r.whatsapp,
    pin: r.pin,
    lowStock: Number(r.low_stock),
    logo: r.logo || "",
    tagline: r.tagline || "",
    yapeNumber: r.yape_number || "",
    yapeName: r.yape_name || "",
    yapeQr: r.yape_qr || "",
    shipping: shippingOf(r.shipping),
    seasons: seasonsOf(r.seasons),
  };
}
