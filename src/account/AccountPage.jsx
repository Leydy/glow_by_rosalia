import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { getMyOrders, getMyPoints, getMyReviews } from "../api.js";
import { C, money } from "../theme.js";
import { ORDER_STEP, fmtPts, loadSeen, imgUrl } from "../lib/util.js";
import { CatHomeIcon, FavButton, GiftIcon, HeartIcon, Thumb, YarnBasket, catPattern } from "../components/ui.jsx";
import { HelpModal, OrderReviews, PointsHelp, WalletCard } from "./account.jsx";

// Página "Mi cuenta" (estilo tienda grande, versión gatuna).
export function AccountPage({ customer, favs, products, onToggleFav, onAdd, onPanel, settings, wallet, onClaimCredit }) {
  const [info, setInfo] = useState(null);
  const [myReviews, setMyReviews] = useState([]);
  useEffect(() => {
    getMyReviews().then(setMyReviews).catch(() => {});
  }, []);
  const [modal, setModal] = useState(null); // 'puntos' | 'ayuda'
  const seen = loadSeen().map((id) => products.find((p) => p.id === id)).filter(Boolean).slice(0, 6);
  const [orders, setOrders] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    getMyPoints().then(setInfo).catch((e) => setErr(e.message));
    getMyOrders().then(setOrders).catch(() => setOrders([]));
  }, []);
  const favList = favs.map((id) => products.find((p) => p.id === id)).filter(Boolean);
  const bestReward = info && [...info.rewards].reverse().find((r) => info.balance >= r.points);
  const firstReward = info?.rewards[0];
  const progress = info?.next ? Math.min(100, (info.spend / info.next.min) * 100) : 100;
  const tiles = [
    ["pedidos", <Package key="p" size={26} />, "Mis compras"],
    ["perfil", <CatHomeIcon key="c" />, "Mi perfil"],
    ["favoritos", <HeartIcon key="h" size={26} />, "Mis favoritos"],
    ["ayuda", <span key="a" className="glow-tile-q">?</span>, "Ayuda"],
  ];
  return (
    <div className="glow-wrap glow-account-page">
      <div className="glow-acc-hero" style={{ "--pat": catPattern(C.roseDeep) }}>
        <div className="glow-acc-row">
          <div>
            <h1 className="glow-acc-hello">Holiiii, <b>{customer.name}</b></h1>
            {info && (
              <span className="glow-level">
                <i>🐱</i>Nivel {info.level.name}{info.level.mult > 1 ? ` · ganas ×${info.level.mult} Michipuntos` : ""}
              </span>
            )}
          </div>
          <div className="glow-pts-card">
            <YarnBasket points={info?.balance || 0} />
            <div className="glow-pts-info">
              <small>Tienes para canjear</small>
              <div className="glow-pts-big"><b>{info ? fmtPts(info.balance) : "…"}</b><span>Michipuntos</span></div>
              {info && (
                <p className="glow-pts-eq">
                  {bestReward
                    ? <>¡Ya puedes canjear <b>S/ {bestReward.value} de descuento</b>!</>
                    : <>Te faltan <b>{fmtPts(firstReward.points - info.balance)}</b> para tu primer descuento de S/ {firstReward.value}</>}
                </p>
              )}
              {info?.pending > 0 && <p className="glow-pts-pend">⏳ +{fmtPts(info.pending)} por confirmar</p>}
              {info?.expiringSoon > 0 && <p className="glow-pts-pend">⌛ {fmtPts(info.expiringSoon)} vencen este mes</p>}
              {info && (
                <>
                  <div className="glow-pts-bar"><i style={{ width: `${progress}%` }} /></div>
                  <p className="glow-pts-barlbl">
                    {info.next
                      ? <>Te faltan {money(info.next.min - info.spend)} en compras este año para <b>{info.next.name}</b> (×{info.next.mult})</>
                      : <>¡Eres del nivel más alto! 👑</>}
                  </p>
                </>
              )}
            </div>
          </div>
          <WalletCard wallet={wallet} onClaim={onClaimCredit} />
        </div>
      </div>
      {err && <p className="glow-err">{err}</p>}

      <div className="glow-acc-tiles">
        {tiles.map(([k, icon, label]) => (
          <button key={k} onClick={() => (k === "ayuda" ? setModal("ayuda") : onPanel(k))}>{icon}<span>{label}</span></button>
        ))}
      </div>

      <section className="glow-acc-sec">
        <div className="glow-acc-sec-h"><h2>Últimas compras {orders ? `(${orders.length})` : ""}</h2>{orders?.length > 3 && <button onClick={() => onPanel("pedidos")}>Revisar todas ›</button>}</div>
        {orders && orders.length === 0 && <p className="glow-soft" style={{ fontSize: 19 }}>Aún no tienes compras. ¡Tu primer michi te espera!</p>}
        <div className="glow-acc-orders">
          {(orders || []).slice(0, 3).map((o) => {
            const st = ORDER_STEP[o.status] || ORDER_STEP.pendiente;
            return (
              <div key={o.id} className="glow-acc-order">
                <span className="glow-chip" style={{ color: st.color, background: st.bg }}>{st.label}</span>
                <div className="glow-acc-order-row">
                  {o.items.slice(0, 3).map((l, i) => (l.image ? <img key={`${l.id}-${i}`} src={imgUrl(l.image, 160)} alt={l.name} /> : null))}
                  <div>
                    <b>{o.items.length === 1 ? o.items[0].name : `${o.items.length} productos`}</b>
                    <small>#{o.code} · {new Date(o.createdAt).toLocaleDateString("es-PE", { day: "numeric", month: "short" })} · {money(o.total)}</small>
                  </div>
                </div>
                {o.pointsEarned > 0 && <span className="glow-acc-plus">🧶 +{fmtPts(o.pointsEarned)} Michipuntos ganados</span>}
                {o.pointsPending > 0 && <span className="glow-acc-plus is-pend">⏳ +{fmtPts(o.pointsPending)} Michipuntos al confirmar</span>}
                <OrderReviews order={o} reviews={myReviews} onReviewed={(r) => setMyReviews((x) => [r, ...x])} />
              </div>
            );
          })}
        </div>
      </section>

      {info && (
        <section className="glow-acc-sec">
          <div className="glow-acc-sec-h"><h2>Canjea tus Michipuntos</h2><button onClick={() => setModal("puntos")}>¿Cómo funciona? ›</button></div>
          <div className="glow-acc-rewards">
            {info.rewards.map((r, k) => {
              const ok = info.balance >= r.points;
              return (
                <div key={r.key} className={`glow-acc-rw${ok ? " is-ok" : ""}${r.surprise ? " is-surprise" : ""}`}>
                  {k === 1 && <span className="glow-acc-rw-tag">⭐ Te conviene más</span>}
                  {r.surprise && <span className="glow-acc-rw-tag is-mystery">Misterio 🤫</span>}
                  {r.surprise ? (
                    <div className="glow-surprise-row">
                      <GiftIcon />
                      <div><h3>¡Sorpresa!</h3><p>Un regalo misterioso en tu compra desde S/ {r.min}</p></div>
                    </div>
                  ) : (
                    <><h3>S/ {r.value}</h3><p>de descuento en compras desde S/ {r.min}</p></>
                  )}
                  <span className="glow-acc-rw-cost">{fmtPts(r.points)} Michipuntos</span>
                  <div className="glow-acc-rw-state">{ok ? "Disponible · elígelo en el carrito al pagar" : `Te faltan ${fmtPts(r.points - info.balance)}`}</div>
                </div>
              );
            })}
          </div>
          <p className="glow-acc-how">
            🛍️ Compras <b>S/ 40</b> → ganas <b>{Math.floor(40 * info.perSol)} Michipuntos</b>. Junta <b>{fmtPts(info.rewards[0].points)}</b> y tienes <b>S/ {info.rewards[0].value} de descuento</b>.{" "}
            <button className="glow-inline-link" onClick={() => setModal("puntos")}>¿Cómo funciona?</button>
          </p>
        </section>
      )}

      <section className="glow-acc-sec">
        <div className="glow-acc-sec-h"><h2>Mis favoritos</h2>{favList.length > 0 && <button onClick={() => onPanel("favoritos")}>Ver todos ›</button>}</div>
        {favList.length === 0 ? (
          <p className="glow-soft" style={{ fontSize: 19 }}>Toca el corazón de un producto para guardarlo aquí.</p>
        ) : (
          <div className="glow-acc-favs">
            {favList.slice(0, 6).map((p) => (
              <div key={p.id} className="glow-acc-fav">
                <div style={{ position: "relative" }}>
                  <Thumb src={p.images?.[0]} alt={p.name} size={"100%"} />
                  <FavButton active onClick={() => onToggleFav(p.id)} style={{ top: 8, right: 8 }} />
                  {p.doublePoints && <span className="glow-x2">×2 Michipuntos</span>}
                </div>
                <b className="glow-name" style={{ color: C.aubergine }}>{p.name}</b>
                <span>{money(p.price)}</span>
                <button disabled={p.stock <= 0} onClick={() => onAdd(p)} style={{ background: p.stock <= 0 ? C.line : C.primary }}>
                  {p.stock <= 0 ? "Agotado" : "Añadir"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {seen.length > 0 && (
        <section className="glow-acc-sec">
          <div className="glow-acc-sec-h"><h2>Tus últimos vistos</h2></div>
          <div className="glow-acc-favs">
            {seen.map((p) => (
              <div key={p.id} className="glow-acc-fav">
                <div style={{ position: "relative" }}>
                  <Thumb src={p.images?.[0]} alt={p.name} size={"100%"} />
                  <FavButton active={favs.includes(p.id)} onClick={() => onToggleFav(p.id)} style={{ top: 8, right: 8 }} />
                </div>
                <b className="glow-name" style={{ color: C.aubergine }}>{p.name}</b>
                <span>{money(p.price)}</span>
                <button disabled={p.stock <= 0} onClick={() => onAdd(p)} style={{ background: p.stock <= 0 ? C.line : C.primary }}>
                  {p.stock <= 0 ? "Agotado" : "Añadir"}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {modal === "puntos" && info && <PointsHelp info={info} onClose={() => setModal(null)} />}
      {modal === "ayuda" && <HelpModal settings={settings} onClose={() => setModal(null)} onPoints={() => setModal("puntos")} />}

      {info?.history?.length > 0 && (
        <section className="glow-acc-sec">
          <div className="glow-acc-sec-h"><h2>Movimientos de Michipuntos</h2></div>
          <div className="glow-acc-hist">
            {info.history.map((h, k) => (
              <div key={k}>
                <span>{h.note || h.kind}<small>{new Date(h.createdAt).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" })}</small></span>
                <b className={h.amount > 0 ? "is-plus" : "is-minus"}>{h.amount > 0 ? "+" : ""}{fmtPts(h.amount)}</b>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
