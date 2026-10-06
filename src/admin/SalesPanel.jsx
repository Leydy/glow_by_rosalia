// Pestaña "Ventas": cuánto vendes, qué se vende más y qué reponer pronto.
// Usa los pedidos confirmados (verificado o enviado), sin los de prueba.
import { useEffect, useMemo, useState } from "react";
import { getOrders } from "../api.js";
import { money } from "../theme.js";
import { WORLDS, worldOf } from "../worlds.js";
import { imgUrl } from "../lib/util.js";

const DAY = 86400e3;
const startOfWeek = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const fmtDay = (d) => d.toLocaleDateString("es-PE", { day: "numeric", month: "short" });

export function SalesPanel({ products }) {
  const [orders, setOrders] = useState(null);
  const [err, setErr] = useState("");
  const [range, setRange] = useState(8); // semanas en la gráfica
  useEffect(() => { getOrders().then(setOrders).catch((e) => setErr(e.message)); }, []);

  const data = useMemo(() => {
    if (!orders) return null;
    const sold = orders.filter((o) => !o.isTest && (o.status === "verificado" || o.status === "enviado"));
    const pending = orders.filter((o) => !o.isTest && o.status === "pendiente");
    const now = Date.now();
    const sum = (list) => list.reduce((s, o) => s + o.total, 0);
    const since = (days) => sold.filter((o) => now - new Date(o.createdAt).getTime() <= days * DAY);
    // semanas
    const w0 = startOfWeek(now);
    const weeks = Array.from({ length: range }, (_, k) => {
      const from = new Date(w0.getTime() - (range - 1 - k) * 7 * DAY);
      const to = new Date(from.getTime() + 7 * DAY);
      const list = sold.filter((o) => { const t = new Date(o.createdAt); return t >= from && t < to; });
      return { from, total: sum(list), count: list.length };
    });
    // productos (ganancia con el precio de compra del inventario)
    const byProd = new Map();
    for (const o of sold) for (const l of o.items) {
      if (l.gift) continue;
      const r = byProd.get(l.id) || { id: l.id, units: 0, revenue: 0, name: l.name.split(" · ")[0], image: l.image };
      r.units += l.qty; r.revenue += l.qty * l.price;
      byProd.set(l.id, r);
    }
    const prodById = new Map(products.map((p) => [p.id, p]));
    const top = [...byProd.values()].sort((a, b) => b.units - a.units).slice(0, 6);
    let profit = 0;
    for (const r of byProd.values()) { const p = prodById.get(r.id); profit += r.revenue - r.units * (Number(p?.cost) || 0); }
    // por mundo
    const worlds = {};
    for (const r of byProd.values()) { const w = worldOf(prodById.get(r.id)?.category); worlds[w] = (worlds[w] || 0) + r.revenue; }
    // reponer: ventas de los últimos 30 días → en cuántos días se acaba
    const last30 = new Map();
    for (const o of since(30)) for (const l of o.items) if (!l.gift) last30.set(l.id, (last30.get(l.id) || 0) + l.qty);
    const restock = products
      .map((p) => {
        const perDay = (last30.get(p.id) || 0) / 30;
        const days = perDay > 0 ? Math.floor(p.stock / perDay) : null;
        return { p, perDay, days };
      })
      .filter((x) => x.p.stock <= 0 || (x.days !== null && x.days <= 21) || x.p.stock <= 2)
      .sort((a, b) => (a.p.stock - b.p.stock) || ((a.days ?? 999) - (b.days ?? 999)))
      .slice(0, 10);
    const sleeping = products.filter((p) => p.stock > 0 && !last30.has(p.id)).length;
    return { sold, pending, weeks, top, profit, worlds, restock, sleeping, total: sum(sold), month: sum(since(30)), week: sum(since(7)), monthCount: since(30).length };
  }, [orders, products, range]);

  if (err) return <p style={{ color: "#C0394F" }}>{err}</p>;
  if (!data) return <p>Cargando ventas…</p>;
  const max = Math.max(1, ...data.weeks.map((w) => w.total));
  const avg = data.sold.length ? data.total / data.sold.length : 0;
  const worldTotal = Object.values(data.worlds).reduce((s, v) => s + v, 0) || 1;

  return (
    <div className="glow-sales">
      <div className="glow-sales-kpis">
        <div><span>Últimos 7 días</span><b>{money(data.week)}</b></div>
        <div><span>Últimos 30 días</span><b>{money(data.month)}</b><small>{data.monthCount} pedido{data.monthCount === 1 ? "" : "s"}</small></div>
        <div><span>Ganancia total</span><b className="is-good">{money(data.profit)}</b><small>según tus precios de compra</small></div>
        <div><span>Ticket promedio</span><b>{money(avg)}</b><small>{data.pending.length} pago{data.pending.length === 1 ? "" : "s"} por revisar</small></div>
      </div>

      <section className="glow-sales-card">
        <div className="glow-sales-h">
          <h3>Ventas por semana</h3>
          <div className="glow-sales-range">
            {[8, 12, 26].map((n) => <button key={n} className={range === n ? "is-on" : ""} onClick={() => setRange(n)}>{n === 26 ? "6 meses" : `${n} semanas`}</button>)}
          </div>
        </div>
        {data.total === 0 ? <p className="glow-sales-empty">Aún no hay ventas confirmadas. ¡Aquí verás crecer tu tienda! 🐾</p> : (
          <div className="glow-sales-chart" role="img" aria-label="Ventas por semana">
            {data.weeks.map((w, k) => (
              <div key={k} className="glow-sales-bar" title={`Semana del ${fmtDay(w.from)}: ${money(w.total)} · ${w.count} pedido(s)`}>
                <span className="glow-sales-val">{w.total > 0 ? Math.round(w.total) : ""}</span>
                <i style={{ height: `${(w.total / max) * 100}%` }} className={k === data.weeks.length - 1 ? "is-now" : ""} />
                <small>{k % (range > 12 ? 4 : 2) === 0 || k === data.weeks.length - 1 ? fmtDay(w.from) : ""}</small>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="glow-sales-two">
        <section className="glow-sales-card">
          <h3>⭐ Lo que más se vende</h3>
          {data.top.length === 0 ? <p className="glow-sales-empty">Todavía sin ventas.</p> : (
            <ol className="glow-sales-top">
              {data.top.map((r) => (
                <li key={r.id}>
                  {r.image ? <img src={imgUrl(r.image, 80)} alt="" /> : <span />}
                  <div><b>{r.name}</b><small>{r.units} vendido{r.units === 1 ? "" : "s"} · {money(r.revenue)}</small></div>
                </li>
              ))}
            </ol>
          )}
          {Object.keys(data.worlds).length > 0 && (
            <>
              <h4>Por mundo</h4>
              <div className="glow-sales-worlds">
                {Object.entries(data.worlds).sort((a, b) => b[1] - a[1]).map(([w, v]) => (
                  <div key={w}><span>{WORLDS[w]?.emoji} {WORLDS[w]?.name}</span><i style={{ width: `${(v / worldTotal) * 100}%` }} /><b>{Math.round((v / worldTotal) * 100)}%</b></div>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="glow-sales-card">
          <h3>📦 Para reponer</h3>
          {data.restock.length === 0 ? <p className="glow-sales-empty">Todo tiene stock suficiente por ahora ✓</p> : (
            <ul className="glow-sales-restock">
              {data.restock.map(({ p, days, perDay }) => (
                <li key={p.id} className={p.stock <= 0 ? "is-out" : days !== null && days <= 7 ? "is-soon" : ""}>
                  {p.images?.[0] ? <img src={imgUrl(p.images[0], 80)} alt="" /> : <span />}
                  <div>
                    <b>{p.name}</b>
                    <small>
                      {p.stock <= 0 ? "Agotado" : `Quedan ${p.stock}`}
                      {perDay > 0 ? (p.stock > 0 ? ` · se acaba en ~${Math.max(1, days)} día${days === 1 ? "" : "s"}` : " · se vende bien") : ""}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {data.sleeping > 0 && <p className="glow-sales-note">💤 {data.sleeping} producto{data.sleeping === 1 ? "" : "s"} sin ventas en 30 días. Prueba darles «×2 Michipuntos» o mandar un aviso.</p>}
        </section>
      </div>
    </div>
  );
}
