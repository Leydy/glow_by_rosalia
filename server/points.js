// Michipuntos: reglas y cálculo del saldo.
//
// Idea: números grandes para la clienta y costo pequeño para la tienda.
//  • Se gana 1.25 Michipunto por cada S/ 1 pagado (×1.25 o ×1.5 según nivel,
//    ×2 en productos marcados), solo cuando el pago está verificado.
//  • 100 Michipuntos ≈ S/ 1. Canjes en escalones con compra mínima; el
//    descuento nunca supera el 20% del carrito. Un canje por pedido.
//  • Los puntos vencen a los 12 meses (se gastan primero los más antiguos).
import { pool } from "./db.js";

export const RULES = {
  perSol: 1.25,
  expiryMonths: 12,
  welcome: 100,
  birthday: 50,
  levels: [
    { key: "gatito", name: "Gatito", min: 0, mult: 1 },
    { key: "curioso", name: "Gato Curioso", min: 300, mult: 1.25 },
    { key: "real", name: "Gato Real", min: 800, mult: 1.5 },
  ],
  rewards: [
    { key: "r5", points: 500, value: 5, min: 40 },
    { key: "r12", points: 1000, value: 12, min: 80 },
    { key: "r30", points: 2500, value: 30, min: 150 },
    // Premio misterioso: un producto de pocas ventas y bajo costo (≤ S/ 10).
    { key: "sorpresa", points: 1800, value: 0, min: 60, surprise: true },
  ],
  surpriseMaxCost: 10,
  // Reseñas (al aprobarlas): texto vale poco, con foto del producto vale más.
  reviewText: 20,
  reviewPhoto: 60,
};

const expiry = (from = new Date()) => {
  const d = new Date(from);
  d.setMonth(d.getMonth() + RULES.expiryMonths);
  return d;
};

// Registra un movimiento; si la ref ya existe no hace nada (devuelve false).
export async function addPoints(email, amount, kind, ref, note = "", db = pool) {
  if (!email || !amount) return false;
  const { rowCount } = await db.query(
    `INSERT INTO points (email, amount, kind, ref, note, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email, ref) DO NOTHING`,
    [email, Math.round(amount), kind, ref, note, amount > 0 ? expiry() : null]
  );
  return rowCount > 0;
}

export async function hasRef(email, ref, db = pool) {
  const { rows } = await db.query("SELECT 1 FROM points WHERE email=$1 AND ref=$2", [email, ref]);
  return rows.length > 0;
}

// Saldo: recorre los movimientos en orden; los canjes consumen primero los
// lotes más antiguos y los lotes vencidos se descartan.
export async function balance(email, db = pool) {
  const { rows } = await db.query("SELECT * FROM points WHERE email=$1 ORDER BY created_at, id", [email]);
  let lots = [];
  const drop = (t) => { lots = lots.filter((l) => l.exp > t); };
  for (const r of rows) {
    const t = new Date(r.created_at).getTime();
    drop(t);
    if (r.amount > 0) lots.push({ amt: r.amount, exp: new Date(r.expires_at).getTime() });
    else {
      let left = -r.amount;
      for (const l of lots) {
        const use = Math.min(l.amt, left);
        l.amt -= use;
        left -= use;
        if (!left) break;
      }
      lots = lots.filter((l) => l.amt > 0);
    }
  }
  const now = Date.now();
  drop(now);
  const soon = now + 30 * 864e5;
  return {
    balance: lots.reduce((s, l) => s + l.amt, 0),
    expiringSoon: lots.filter((l) => l.exp <= soon).reduce((s, l) => s + l.amt, 0),
    history: rows.slice(-30).reverse().map((r) => ({
      amount: r.amount, kind: r.kind, note: r.note || "", createdAt: r.created_at, expiresAt: r.expires_at,
    })),
  };
}

// Gasto del último año en pedidos verificados/enviados → nivel.
export async function yearSpend(email, excludeOrderId = 0, db = pool) {
  const { rows } = await db.query(
    `SELECT COALESCE(SUM(total - shipping), 0) AS s FROM orders
      WHERE customer_email=$1 AND status IN ('verificado','enviado')
        AND created_at > now() - interval '365 days' AND id <> $2`,
    [email, excludeOrderId]
  );
  return Number(rows[0].s);
}
export function levelFor(spend) {
  return [...RULES.levels].reverse().find((l) => spend >= l.min);
}

// Michipuntos que da un pedido (sobre lo pagado de verdad, tras el descuento).
export function orderPoints(order, mult) {
  const items = Array.isArray(order.items) ? order.items : [];
  const subtotal = items.reduce((s, l) => s + l.qty * l.price, 0);
  if (!subtotal) return 0;
  const weighted = items.reduce((s, l) => s + l.qty * l.price * (l.double ? 2 : 1), 0);
  const paid = Number(order.total) - Number(order.shipping || 0); // el envío no suma
  return Math.floor(weighted * (paid / subtotal) * RULES.perSol * mult);
}

// Elige el regalo de "SORPRESAA!!!": producto con stock, costo ≤ S/ 10, el que
// menos se vendió en los últimos 90 días (empate: el más barato, luego el de
// más stock). Así rota lo que no sale y casi no afecta la liquidez.
export async function pickSurprise(excludeIds = [], db = pool) {
  const { rows: prods } = await db.query(
    "SELECT * FROM products WHERE stock > 0 AND cost > 0 AND cost <= $1",
    [RULES.surpriseMaxCost]
  );
  if (!prods.length) return null;
  const { rows: sold } = await db.query(
    `SELECT l->>'id' AS id, SUM((l->>'qty')::int) AS units
       FROM orders, jsonb_array_elements(items) l
      WHERE status <> 'rechazado' AND created_at > now() - interval '90 days'
      GROUP BY 1`
  );
  const units = Object.fromEntries(sold.map((r) => [r.id, Number(r.units)]));
  const pool2 = prods.filter((p) => !excludeIds.includes(p.id));
  const list = (pool2.length ? pool2 : prods).sort(
    (a, b) => (units[a.id] || 0) - (units[b.id] || 0) || Number(a.cost) - Number(b.cost) || b.stock - a.stock
  );
  return list[0];
}

// Bono de cumpleaños: una vez al año, durante el mes de su cumpleaños.
export async function maybeBirthday(email, birthday) {
  if (!birthday) return;
  const b = new Date(birthday);
  const now = new Date();
  if (b.getUTCMonth() !== now.getMonth()) return;
  await addPoints(email, RULES.birthday, "cumple", `cumple-${now.getFullYear()}`, "¡Feliz cumpleaños!");
}
