// Notificaciones (Web Push, gratis): avisos al celular de las clientas que
// las activaron. Las llaves VAPID se crean solas la primera vez y se guardan
// en la base de datos, así no hay que configurar nada en Render.
import webpush from "web-push";
import { pool } from "./db.js";

let ready = false;
let publicKey = "";

export async function initPush() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS push_subs (
      endpoint       TEXT PRIMARY KEY,
      keys           JSONB NOT NULL,
      customer_email TEXT,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    ALTER TABLE settings ADD COLUMN IF NOT EXISTS vapid JSONB;
  `);
  let { rows } = await pool.query("SELECT vapid FROM settings WHERE id=1");
  let v = rows[0]?.vapid;
  if (!v?.publicKey) {
    v = webpush.generateVAPIDKeys();
    await pool.query("UPDATE settings SET vapid=$1::jsonb WHERE id=1", [JSON.stringify(v)]);
  }
  webpush.setVapidDetails("https://glow-by-rosalia.onrender.com", v.publicKey, v.privateKey);
  publicKey = v.publicKey;
  ready = true;
}

export const pushKey = () => publicKey;

export async function subscribe(sub, email = null) {
  if (!sub?.endpoint || !/^https:\/\//.test(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) throw Object.assign(new Error("Suscripción no válida."), { status: 400 });
  await pool.query(
    `INSERT INTO push_subs (endpoint, keys, customer_email) VALUES ($1, $2::jsonb, $3)
     ON CONFLICT (endpoint) DO UPDATE SET keys=EXCLUDED.keys, customer_email=COALESCE(EXCLUDED.customer_email, push_subs.customer_email)`,
    [String(sub.endpoint).slice(0, 1000), JSON.stringify({ p256dh: sub.keys.p256dh, auth: sub.keys.auth }), email]
  );
}

export async function unsubscribe(endpoint) {
  await pool.query("DELETE FROM push_subs WHERE endpoint=$1", [String(endpoint || "")]);
}

// Envía a una lista de suscripciones; borra las que ya no existen (celular desinstaló, etc.).
async function sendTo(rows, payload) {
  if (!ready) return { sent: 0, failed: 0 };
  const body = JSON.stringify(payload);
  let sent = 0, failed = 0;
  await Promise.all(rows.map(async (r) => {
    try {
      await webpush.sendNotification({ endpoint: r.endpoint, keys: r.keys }, body, { TTL: 86400 });
      sent++;
    } catch (e) {
      failed++;
      if (e.statusCode === 404 || e.statusCode === 410) await unsubscribe(r.endpoint).catch(() => {});
    }
  }));
  return { sent, failed };
}

export async function pushToAll(payload) {
  const { rows } = await pool.query("SELECT endpoint, keys FROM push_subs");
  return sendTo(rows, payload);
}

export async function pushToCustomer(email, payload) {
  if (!email) return { sent: 0, failed: 0 };
  const { rows } = await pool.query("SELECT endpoint, keys FROM push_subs WHERE customer_email=$1", [email]);
  return sendTo(rows, payload);
}

export async function pushCount() {
  const { rows } = await pool.query("SELECT count(*)::int AS n, count(customer_email)::int AS c FROM push_subs");
  return { total: rows[0].n, customers: rows[0].c };
}
