// Michi-crédito: "devolución" en soles al confirmar un pago (estilo Temu).
//
// Diseñado para no regalar de más:
//  • 3% de lo pagado en productos (sin envío), redondeado HACIA ABAJO a
//    múltiplos de S/ 0.50, máximo S/ 5 por compra (menos de S/ 0.50 → nada).
//  • Hay que reclamarlo en 48 h; luego vence a los 10 días.
//  • Solo se usa en compras desde S/ 30 y cubre como máximo el 20% del carrito.
//  • Un beneficio por pedido: Michi-crédito o canje de gatupuntos.
import { pool } from "./db.js";

export const CREDIT = { rate: 0.03, step: 0.5, max: 5, claimHours: 48, validDays: 10, minPurchase: 30, maxShare: 0.2 };

const round2 = (n) => Math.round(n * 100) / 100;

export function creditFor(order) {
  const paid = Number(order.total) - Number(order.shipping || 0);
  const raw = Math.floor((paid * CREDIT.rate) / CREDIT.step) * CREDIT.step;
  return Math.min(CREDIT.max, raw);
}

// Al confirmar el pago: crea el crédito por reclamar (una vez por pedido).
export async function grantCredit(order) {
  const amount = creditFor(order);
  if (!order.customer_email || amount < CREDIT.step) return;
  await pool.query(
    `INSERT INTO credits (email, order_id, amount, note, claim_until)
     VALUES ($1, $2, $3, 'compra', now() + ($4 || ' hours')::interval)
     ON CONFLICT (order_id, note) DO NOTHING`,
    [order.customer_email, order.id, amount, CREDIT.claimHours]
  );
}

// Pago rechazado: se anula el crédito de ese pedido (si no se reclamó o no se
// usó) y, si el pedido había usado crédito, se devuelve como crédito nuevo.
export async function revokeCredit(order) {
  await pool.query("UPDATE credits SET status='anulado' WHERE order_id=$1 AND note='compra' AND used=0", [order.id]);
  const back = Number(order.credit_used || 0);
  if (order.customer_email && back > 0) {
    await pool.query(
      `INSERT INTO credits (email, order_id, amount, note, status, expires_at)
       VALUES ($1, $2, $3, 'devolucion', 'reclamado', now() + ($4 || ' days')::interval)
       ON CONFLICT (order_id, note) DO NOTHING`,
      [order.customer_email, order.id, back, CREDIT.validDays]
    );
  }
}

export async function claimCredit(email, id) {
  const { rows } = await pool.query(
    `UPDATE credits SET status='reclamado', expires_at = now() + ($3 || ' days')::interval
      WHERE id=$1 AND email=$2 AND status='por_reclamar' AND claim_until > now() RETURNING *`,
    [id, email, CREDIT.validDays]
  );
  return rows[0] || null;
}

export async function wallet(email, db = pool) {
  const { rows } = await db.query("SELECT * FROM credits WHERE email=$1 ORDER BY created_at DESC", [email]);
  const now = Date.now();
  const live = rows.filter((r) => r.status === "reclamado" && new Date(r.expires_at).getTime() > now && Number(r.amount) > Number(r.used));
  const balance = round2(live.reduce((s, r) => s + Number(r.amount) - Number(r.used), 0));
  const soonest = live.map((r) => new Date(r.expires_at).getTime()).sort((a, b) => a - b)[0] || null;
  const toClaim = rows
    .filter((r) => r.status === "por_reclamar" && new Date(r.claim_until).getTime() > now)
    .map((r) => ({ id: r.id, amount: Number(r.amount), claimUntil: r.claim_until, orderId: r.order_id }));
  const history = rows.slice(0, 20).map((r) => {
    const expired = r.status === "reclamado" && new Date(r.expires_at).getTime() <= now && Number(r.used) < Number(r.amount);
    const lost = r.status === "por_reclamar" && new Date(r.claim_until).getTime() <= now;
    return {
      amount: Number(r.amount), used: Number(r.used), note: r.note, orderId: r.order_id, createdAt: r.created_at,
      state: r.status === "anulado" ? "anulado" : lost ? "no_reclamado" : expired ? "vencido" : r.status,
    };
  });
  return { balance, expiresAt: soonest ? new Date(soonest).toISOString() : null, toClaim, history, rules: CREDIT };
}

// Aplica crédito a un pedido (dentro de la transacción del pedido): consume
// primero lo que vence antes. Devuelve el monto aplicado.
export async function spendCredit(client, email, subtotal) {
  if (subtotal < CREDIT.minPurchase) return 0;
  const { rows } = await client.query(
    `SELECT * FROM credits WHERE email=$1 AND status='reclamado' AND expires_at > now() AND amount > used
      ORDER BY expires_at FOR UPDATE`,
    [email]
  );
  let want = round2(Math.min(rows.reduce((s, r) => s + Number(r.amount) - Number(r.used), 0), subtotal * CREDIT.maxShare));
  const applied = want;
  for (const r of rows) {
    if (want <= 0) break;
    const take = round2(Math.min(want, Number(r.amount) - Number(r.used)));
    await client.query("UPDATE credits SET used = used + $2 WHERE id=$1", [r.id, take]);
    want = round2(want - take);
  }
  return applied;
}
