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
    images: Array.isArray(r.images) ? r.images : [],
    desc: r.description || "",
  };
}

export function rowToSettings(r) {
  return {
    storeName: r.store_name,
    whatsapp: r.whatsapp,
    pin: r.pin,
    lowStock: Number(r.low_stock),
    logo: r.logo || "",
    tagline: r.tagline || "",
  };
}
