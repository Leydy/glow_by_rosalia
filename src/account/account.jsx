import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Image as ImageIcon, LogOut, MessageCircle, Package, Settings as SettingsIcon, ShoppingCart, X } from "lucide-react";
import { C, money } from "../theme.js";
import { createReview, getMe, getMyOrders, getMyReviews, getProductReviews, googleLogin, testLogin, updateMe } from "../api.js";
import { CatAvatar, CreditCoin, FavButton, Field, HeartIcon, Inp, PawIcon, PawMark, Stars, Thumb, YarnBasket } from "../components/ui.jsx";
import { CREDIT_MIN, CREDIT_SHARE, ORDER_STEP, REVIEW_PTS, TEST_MODE, fileToDataURL, fmtPts, loadGoogleScript, round2, timeLeft, imgUrl } from "../lib/util.js";
import { NoteLetter, RosaliaFace } from "../components/note.jsx";
import { NotifyButton } from "../components/NotifyButton.jsx";
import { canInstall, installApp } from "../components/InstallApp.jsx";

// Menú de la cuenta (se abre al tocar el avatar).
export function AccountMenu({ customer, onPick, onLogout, onClose }) {
  const ref = useRef(null);
  // En el celular el menú va fijo: se coloca justo debajo de la barra superior.
  useLayoutEffect(() => {
    const h = document.querySelector(".glow-header");
    if (h && ref.current) ref.current.style.setProperty("--menu-top", `${Math.round(h.getBoundingClientRect().bottom) + 8}px`);
  }, []);
  useEffect(() => {
    const out = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const esc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("pointerdown", out);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", out); document.removeEventListener("keydown", esc); };
  }, [onClose]);
  const item = (key, icon, label) => (
    <button key={key} role="menuitem" onClick={() => onPick(key)}>{icon}<span>{label}</span></button>
  );
  return (
    <div className="glow-menu" role="menu" ref={ref}>
      <div className="glow-menu-head">
        <CatAvatar customer={customer} size={40} />
        <div><b>{customer.name}</b><small>{customer.email}</small></div>
      </div>
      {item("cuenta", <span className="glow-menu-basket"><YarnBasket points={300} size={22} /></span>, "Mi cuenta · Michipuntos")}
      {item("perfil", <SettingsIcon size={17} />, "Mi perfil")}
      {item("pedidos", <Package size={17} />, "Mis pedidos")}
      {item("favoritos", <HeartIcon size={17} />, "Mis favoritos")}
      <button role="menuitem" onClick={() => { onClose(); window.dispatchEvent(new Event("glow:game")); }}><span aria-hidden="true">🎮</span><span>Juego del día</span></button>
      <div className="glow-menu-extra"><NotifyButton text="🔔 Activar avisos" className="glow-menu-notify" /></div>
      {canInstall() && <button role="menuitem" onClick={() => { installApp(); onClose(); }}><span aria-hidden="true">📲</span><span>Instalar la app</span></button>}
      <button role="menuitem" className="is-out" onClick={onLogout}><LogOut size={17} /><span>Cerrar sesión</span></button>
    </div>
  );
}

// Panel lateral de la cuenta: perfil, pedidos o favoritos.
export function AccountDrawer({ section, onSection, onClose, customer, onCustomer, favs, products, onToggleFav, onAdd, onJoin }) {
  const titles = { perfil: "Mi perfil", pedidos: "Mis pedidos", favoritos: "Mis favoritos" };
  const tabs = customer ? ["perfil", "pedidos", "favoritos"] : ["favoritos"];
  return (
    <div className="glow-drawer-bg" onClick={onClose}>
      <aside className="glow-drawer" onClick={(e) => e.stopPropagation()} aria-label={titles[section]}>
        <div className="glow-drawer-head">
          <h3>{titles[section]}</h3>
          <button onClick={onClose} aria-label="Cerrar"><X size={22} /></button>
        </div>
        {tabs.length > 1 && (
          <div className="glow-tabs">
            {tabs.map((t) => (
              <button key={t} className={t === section ? "is-on" : ""} onClick={() => onSection(t)}>{titles[t].replace("Mis ", "").replace("Mi ", "")}</button>
            ))}
          </div>
        )}
        <div className="glow-drawer-body">
          {section === "perfil" && customer && <ProfileForm customer={customer} onCustomer={onCustomer} />}
          {section === "pedidos" && customer && <MyOrders />}
          {section === "favoritos" && (
            <FavoritesList favs={favs} products={products} onToggleFav={onToggleFav} onAdd={onAdd} customer={customer} onJoin={onJoin} />
          )}
        </div>
      </aside>
    </div>
  );
}

export function FavoritesList({ favs, products, onToggleFav, onAdd, customer, onJoin }) {
  const list = favs.map((id) => products.find((p) => p.id === id)).filter(Boolean);
  if (list.length === 0)
    return (
      <div className="glow-empty">
        <span className="glow-empty-heart"><HeartIcon size={34} /></span>
        <p className="glow-soft" style={{ fontSize: 20, margin: "10px 0 4px" }}>Aún no tienes favoritos</p>
        <p style={{ color: C.inkSoft, fontSize: 13, margin: 0 }}>Toca el corazón de cualquier producto para guardarlo aquí.</p>
      </div>
    );
  return (
    <>
      {!customer && onJoin && (
        <button className="glow-fav-tip" onClick={onJoin}>
          <PawIcon /> Únete para guardarlos en tu cuenta y verlos en cualquier dispositivo
        </button>
      )}
      <div className="glow-fav-list">
        {list.map((p) => {
          const out = p.stock <= 0;
          return (
            <div key={p.id} className="glow-fav-item">
              <Thumb src={p.images?.[0]} alt={p.name} size={64} />
              <div className="glow-fav-info">
                <b className="glow-name" style={{ color: C.aubergine }}>{p.name}</b>
                <span style={{ color: C.aubergine, fontWeight: 800 }}>{money(p.price)}</span>
                <button
                  disabled={out}
                  onClick={() => onAdd(p)}
                  style={{ background: out ? C.line : C.primary, color: out ? C.inkSoft : C.primaryInk }}
                >
                  <ShoppingCart size={14} /> {out ? "Agotado" : "Añadir"}
                </button>
              </div>
              <FavButton active onClick={() => onToggleFav(p.id)} style={{ position: "static" }} />
            </div>
          );
        })}
      </div>
    </>
  );
}

export function ProfileForm({ customer, onCustomer }) {
  const [f, setF] = useState(customer);
  const [state, setState] = useState(""); // '' | 'saving' | 'saved' | error
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  useEffect(() => {
    getMe().then((me) => setF((x) => ({ ...x, ...me }))).catch(() => {});
  }, []);
  const save = async () => {
    setState("saving");
    try {
      const me = await updateMe(f);
      onCustomer(me);
      setState("saved");
      setTimeout(() => setState(""), 1800);
    } catch (e) {
      setState(e.message);
    }
  };
  return (
    <div className="glow-profile">
      <div className="glow-profile-head">
        <CatAvatar customer={f} size={64} />
        <div><b className="glow-name" style={{ color: C.aubergine, fontSize: 20 }}>{f.name}</b><small>{f.email}</small></div>
      </div>
      <Field label="¿Cómo te llamamos?"><Inp value={f.name} onChange={(v) => set("name", v)} placeholder="Tu nombre" /></Field>
      <Field label="Celular (para coordinar tu envío)"><Inp value={f.phone} onChange={(v) => set("phone", v.replace(/[^\d+ ]/g, ""))} placeholder="987 654 321" /></Field>
      <Field label="Distrito"><Inp value={f.district} onChange={(v) => set("district", v)} placeholder="Ej. Miraflores" /></Field>
      <Field label="Dirección de envío"><Inp value={f.address} onChange={(v) => set("address", v)} placeholder="Calle, número, referencia" /></Field>
      <Field label={customer.birthday ? "Tu cumpleaños 🎂" : "Tu cumpleaños 🎂 (+50 Michipuntos en tu mes)"}>
        <input
          type="date"
          className="glow-date"
          value={f.birthday || ""}
          disabled={!!customer.birthday}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => set("birthday", e.target.value)}
        />
        {customer.birthday
          ? <small style={{ color: C.inkSoft }}>Ya está registrado. Para cambiarlo, escríbenos por WhatsApp.</small>
          : <small style={{ color: C.inkSoft }}>Solo se puede registrar una vez.</small>}
      </Field>
      <label className="glow-switch">
        <input type="checkbox" checked={f.newsletter !== false} onChange={(e) => set("newsletter", e.target.checked)} />
        <span />
        <div><b>Recibir novedades y ofertas</b><small>Correos del club de Rosalía. Puedes apagarlo cuando quieras.</small></div>
      </label>
      <button className="glow-pay-btn" onClick={save} disabled={state === "saving"} style={{ background: C.aubergine, marginTop: 16 }}>
        {state === "saving" ? "Guardando…" : state === "saved" ? "¡Guardado!" : "Guardar cambios"}
      </button>
      {state && !["saving", "saved"].includes(state) && <p className="glow-err">{state}</p>}
    </div>
  );
}

export function MyOrders() {
  const [orders, setOrders] = useState(null);
  const [reviews, setReviews] = useState([]);
  useEffect(() => {
    getMyReviews().then(setReviews).catch(() => {});
  }, []);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState(null);
  useEffect(() => {
    getMyOrders().then(setOrders).catch((e) => setErr(e.message));
  }, []);
  if (err) return <p className="glow-err">{err}</p>;
  if (!orders) return <p style={{ color: C.inkSoft }}>Cargando tus pedidos…</p>;
  if (orders.length === 0)
    return (
      <div className="glow-empty">
        <span className="glow-empty-heart"><Package size={32} /></span>
        <p className="glow-soft" style={{ fontSize: 20, margin: "10px 0 4px" }}>Aún no tienes pedidos</p>
        <p style={{ color: C.inkSoft, fontSize: 13, margin: 0 }}>Cuando pagues con Yape con tu sesión iniciada, aparecerán aquí.</p>
      </div>
    );
  return (
    <div className="glow-my-orders">
      {orders.map((o) => {
        const st = ORDER_STEP[o.status] || ORDER_STEP.pendiente;
        return (
          <div key={o.id} className="glow-my-order">
            <div className="glow-my-order-top">
              <b>#{o.code}</b>
              <span>{new Date(o.createdAt).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
            <div className="glow-my-order-imgs">
              {o.items.map((l, i) => (l.image ? <img key={`${l.id}-${i}`} src={imgUrl(l.image, 160)} alt={l.name} title={l.name} /> : null))}
              <div>{o.items.reduce((n, l) => n + l.qty, 0)} producto(s)<b>{money(o.total)}</b></div>
            </div>
            {o.pointsEarned > 0 && <span className="glow-acc-plus">🧶 +{fmtPts(o.pointsEarned)} Michipuntos</span>}
            {o.pointsPending > 0 && <span className="glow-acc-plus is-pend">⏳ +{fmtPts(o.pointsPending)} Michipuntos al confirmar</span>}
            <div className="glow-my-order-bottom">
              <span className="glow-chip" style={{ color: st.color, background: st.bg }}>{st.label}</span>
              <button onClick={() => setOpen(o)} style={{ color: C.yape }}>Ver notita</button>
            </div>
            <OrderReviews order={o} reviews={reviews} onReviewed={(r) => setReviews((x) => [r, ...x])} />
          </div>
        );
      })}
      {open && (
        <div className="glow-modal-bg" onClick={() => setOpen(null)}>
          <div style={{ width: "100%", maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
            <NoteLetter order={open} />
            <button className="glow-pay-btn" onClick={() => setOpen(null)} style={{ background: C.aubergine, marginTop: 12 }}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}

// "¡Reclámalo!": aparece cuando se confirma un pago.
export function ClaimModal({ credit, onClaim, onClose }) {
  const [help, setHelp] = useState(false);
  const [left, setLeft] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.floor((new Date(credit.claimUntil).getTime() - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [credit.claimUntil]);
  const pad = (n) => String(n).padStart(2, "0");
  const claim = async () => {
    await onClaim(credit.id);
    setDone(true);
    setTimeout(onClose, 1800);
  };
  return (
    <div className="glow-modal-bg" onClick={onClose}>
      <div className="glow-claim" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Michi-crédito">
        <span className="glow-claim-rays" />
        <div className="glow-claim-in">
          <small>{done ? "¡Listo! Ya está en tu billetera" : "Tu pago fue confirmado · te devolvemos"}</small>
          <CreditCoin size={88} spin />
          <div className="glow-claim-amt">{money(credit.amount)}</div>
          <p>de <b>Michi-crédito</b> para tu próxima compra 🎉</p>
          {done ? (
            <p className="glow-claim-ok">✓ Úsalo en los próximos 10 días en compras desde S/ {CREDIT_MIN}</p>
          ) : (
            <>
              <button className="glow-pay-btn is-gold" onClick={claim}>Reclamar mi crédito</button>
              <div className="glow-timer">
                <span>{pad(Math.floor(left / 3600))}<small>horas</small></span>
                <span>{pad(Math.floor(left / 60) % 60)}<small>min</small></span>
                <span>{pad(left % 60)}<small>seg</small></span>
              </div>
              <button className="glow-link-btn" onClick={onClose} style={{ color: C.plum }}>Luego</button>
              <button className="glow-inline-link" onClick={() => setHelp(true)} style={{ fontSize: 13 }}>¿Qué es el Michi-crédito?</button>
            </>
          )}
          {help && <CreditHelp onClose={() => setHelp(false)} />}
        </div>
      </div>
    </div>
  );
}

// Michi-crédito explicado en palabras sencillas.
export function CreditHelp({ onClose }) {
  const ex = 170; // compra de ejemplo: la que da el máximo
  const back = Math.min(5, Math.floor((ex * 0.03) / 0.5) * 0.5);
  return (
    <div className="glow-modal-bg" onClick={onClose}>
      <div className="glow-ship glow-help" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Cómo funciona el Michi-crédito">
        <button className="glow-join-x" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        <div className="glow-help-head"><CreditCoin size={58} /><h3>¿Cómo funciona el Michi-crédito?</h3></div>
        <p className="glow-ship-sub" style={{ textAlign: "center", margin: "-4px 0 12px" }}>
          Es <b>plata de vuelta</b>: en cada compra te devolvemos <b>hasta S/ 5</b> para la siguiente 💸
        </p>

        <div className="glow-steps3">
          <div><span>🛍️</span><b>1. Compra</b><small>Confirmamos tu pago</small></div>
          <div><span>💰</span><b>2. Reclámalo</b><small>Te devolvemos soles de crédito</small></div>
          <div><span>🛒</span><b>3. Úsalo</b><small>Se descuenta en tu próxima compra</small></div>
        </div>

        <div className="glow-help-example">
          <b>Ejemplo:</b> compras <b>{money(ex)}</b> → te regalamos <b>{money(back)}</b> 🎉<br />
          En tu siguiente compra, esos <b>{money(back)}</b> los pagamos nosotras.
        </div>

        <div className="glow-ship-sec">
          <h4>⏰ No lo dejes pasar</h4>
          <div className="glow-help-levels">
            <div><b>Reclámalo</b><span>toca «Reclamar» cuando aparezca</span><em>48 horas</em></div>
            <div><b>Úsalo</b><span>después de reclamarlo</span><em>10 días</em></div>
          </div>
        </div>

        <div className="glow-ship-sec">
          <h4>💡 Bueno saber</h4>
          <ul className="glow-help-list">
            <li>Te devolvemos el <b>3%</b> de lo que pagas, hasta <b>S/ 5</b> por compra.</li>
            <li>Se usa en compras desde <b>S/ {CREDIT_MIN}</b>.</li>
            <li>Por compra usas <b>una cosa</b>: tu Michi-crédito <b>o</b> tus Michipuntos.</li>
          </ul>
        </div>

        <p className="glow-help-fine">El Michi-crédito es saldo de la tienda: no se cambia por dinero en efectivo.</p>
      </div>
    </div>
  );
}

// Billetera de Michi-crédito (en Mi cuenta).
export function WalletCard({ wallet, onClaim }) {
  const [help, setHelp] = useState(false);
  if (!wallet) return null;
  const stateTxt = { reclamado: "", no_reclamado: "no se reclamó", vencido: "venció sin usar", anulado: "pago rechazado", por_reclamar: "por reclamar" };
  return (
    <div className="glow-wallet">
      <div className="glow-wallet-top">
        <CreditCoin size={58} />
        <div>
          <small>Tu Michi-crédito</small>
          <b>{money(wallet.balance)}</b>
          {wallet.balance > 0 && wallet.expiresAt && <span className="glow-wallet-exp">⏳ vence en {timeLeft(wallet.expiresAt)}</span>}
          {wallet.balance === 0 && <span className="glow-wallet-hint">Ganas hasta S/ 5 por compra confirmada</span>}
        </div>
      </div>
      {wallet.toClaim.map((c) => (
        <button key={c.id} className="glow-wallet-claim" onClick={() => onClaim(c)}>
          🎉 Reclama {money(c.amount)} · te quedan {timeLeft(c.claimUntil)}
        </button>
      ))}
      {wallet.history.length > 0 && (
        <div className="glow-wallet-hist">
          {wallet.history.slice(0, 4).map((h, k) => {
            const lost = ["no_reclamado", "vencido", "anulado"].includes(h.state);
            return (
              <div key={k}>
                <span>{h.note === "devolucion" ? "Devolución" : `Compra #GLW-${String(h.orderId).padStart(4, "0")}`}
                  <small>{new Date(h.createdAt).toLocaleDateString("es-PE", { day: "numeric", month: "short" })}{stateTxt[h.state] ? ` · ${stateTxt[h.state]}` : h.used > 0 ? ` · usaste ${money(h.used)}` : ""}</small>
                </span>
                <b className={lost ? "is-lost" : "is-plus"}>{lost ? money(h.amount) : `+${money(h.amount)}`}</b>
              </div>
            );
          })}
        </div>
      )}
      <p className="glow-wallet-rules">
        Se usa en compras desde S/ {CREDIT_MIN}.{" "}
        <button className="glow-inline-link" onClick={() => setHelp(true)}>¿Cómo funciona?</button>
      </p>
      {help && <CreditHelp onClose={() => setHelp(false)} />}
    </div>
  );
}

// Selector de canje en el carrito.
export function RewardPicker({ info, subtotal, value, onChange, wallet }) {
  if (!info) return null;
  const creditAmt = wallet && subtotal >= CREDIT_MIN ? round2(Math.min(wallet.balance, subtotal * CREDIT_SHARE)) : 0;
  return (
    <div className="glow-rw-pick">
      <div className="glow-rw-pick-head">
        <YarnBasket points={info.balance} size={42} />
        <div><b>🎁 Tu beneficio para este pedido</b><small>Elige uno · tienes {fmtPts(info.balance)} Michipuntos{wallet?.balance ? ` y ${money(wallet.balance)} de Michi-crédito` : ""}</small></div>
      </div>
      {wallet?.balance > 0 && (
        <button
          type="button"
          disabled={!creditAmt}
          className={value === "credito" ? "is-on" : ""}
          onClick={() => onChange(value === "credito" ? "" : "credito")}
        >
          <span className="glow-rw-dot" />
          <span><b>Michi-crédito −{money(creditAmt || Math.min(wallet.balance, CREDIT_MIN * CREDIT_SHARE))}</b></span>
          <small>{!creditAmt ? `compra desde S/ ${CREDIT_MIN}` : value === "credito" ? "aplicado ✓" : "usar"}</small>
        </button>
      )}
      {info.rewards.map((r) => {
        const okPts = info.balance >= r.points;
        const okMin = subtotal >= r.min;
        const on = value === r.key;
        return (
          <button
            key={r.key}
            type="button"
            disabled={!okPts || !okMin}
            className={on ? "is-on" : ""}
            onClick={() => onChange(on ? "" : r.key)}
          >
            <span className="glow-rw-dot" />
            <span>{r.surprise ? <b>🎁 ¡Sorpresa!</b> : <b>−S/ {r.value}</b>} · {fmtPts(r.points)} Michipuntos</span>
            <small>{!okPts ? `te faltan ${fmtPts(r.points - info.balance)}` : !okMin ? `compra desde S/ ${r.min}` : on ? "aplicado ✓" : "usar"}</small>
          </button>
        );
      })}
    </div>
  );
}

// Formulario de reseña de un producto comprado.
export function ReviewModal({ order, item, onClose, onSent }) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState("");
  const [state, setState] = useState(""); // '' | 'sending' | error
  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) setPhoto(await fileToDataURL(file, 1200, 0.85));
  };
  const send = async () => {
    setState("sending");
    try {
      const r = await createReview({ orderId: order.id, productId: item.id, rating, text, photo });
      onSent(r);
    } catch (e) {
      setState(e.message);
    }
  };
  const pts = photo ? REVIEW_PTS.photo : REVIEW_PTS.text;
  return (
    <div className="glow-modal-bg" onClick={onClose}>
      <div className="glow-ship glow-review" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Reseña">
        <button className="glow-join-x" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        <div className="glow-review-head">
          {item.image && <img src={imgUrl(item.image, 240)} alt="" />}
          <div><small>Tu reseña de</small><b>{item.name}</b></div>
        </div>
        <div className="glow-review-stars" role="radiogroup" aria-label="Calificación">
          {[1, 2, 3, 4, 5].map((k) => (
            <button key={k} type="button" onClick={() => setRating(k)} aria-label={`${k} patitas`}><PawMark on={k <= rating} size={38} /></button>
          ))}
          <span className="glow-review-rating-lbl">{["", "No me gustó", "Regular", "Bonito", "¡Me encantó!", "¡Lo amo! 😻"][rating]}</span>
        </div>
        <textarea className="glow-textarea" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="¿Qué te pareció? ¿Cómo te queda? ¿Se lo recomendarías a otra michi-lover?" />
        <p className="glow-hint">{text.trim().length < 15 ? `Escribe al menos 15 letras (${text.trim().length}/15)` : "¡Perfecto! 💕"}</p>

        <label className={`glow-review-photo${photo ? " has-photo" : ""}`}>
          {photo ? <img src={photo} alt="Tu foto" /> : <ImageIcon size={28} />}
          <span>{photo ? "Cambiar foto" : <>Sube una foto con tu producto <b>¡y gana el triple!</b></>}</span>
          <input type="file" accept="image/*" onChange={onPick} hidden />
        </label>
        {photo && <button className="glow-inline-link" onClick={() => setPhoto("")}>Quitar foto</button>}

        <div className="glow-review-pts">
          <span className={!photo ? "is-on" : ""}>✍️ Solo texto <b>+{REVIEW_PTS.text}</b></span>
          <span className={photo ? "is-on" : ""}>📸 Con foto <b>+{REVIEW_PTS.photo}</b></span>
        </div>
        {state && state !== "sending" && <p className="glow-err">{state}</p>}
        <button className="glow-pay-btn" disabled={text.trim().length < 15 || state === "sending"} onClick={send}
          style={{ background: text.trim().length < 15 ? C.line : C.aubergine, marginTop: 12 }}>
          {state === "sending" ? "Enviando…" : `Enviar reseña · +${pts} Michipuntos`}
        </button>
        <p className="glow-hint" style={{ textAlign: "center" }}>Los Michipuntos se suman cuando revisemos tu reseña.</p>
      </div>
    </div>
  );
}

// Productos de un pedido para reseñar (solo con pago confirmado).
export function OrderReviews({ order, reviews, onReviewed }) {
  const [open, setOpen] = useState(null);
  if (!["verificado", "enviado"].includes(order.status)) return null;
  const items = order.items.filter((l, i, a) => a.findIndex((x) => x.id === l.id) === i);
  return (
    <div className="glow-order-reviews">
      <p>⭐ Reseña y gana hasta <b>+{REVIEW_PTS.photo} Michipuntos</b> por producto</p>
      {items.map((l) => {
        const r = reviews.find((x) => x.orderId === order.id && x.productId === l.id);
        return (
          <div key={l.id} className="glow-order-review">
            {l.image && <img src={imgUrl(l.image, 200)} alt="" />}
            <span>{l.name}</span>
            {r ? (
              <em className={`is-${r.status}`}>
                {r.status === "aprobada" ? `✓ +${r.photo ? REVIEW_PTS.photo : REVIEW_PTS.text}` : r.status === "rechazada" ? "No aprobada" : "En revisión"}
              </em>
            ) : (
              <button onClick={() => setOpen(l)}>Reseñar</button>
            )}
          </div>
        );
      })}
      {open && (
        <ReviewModal
          order={order}
          item={open}
          onClose={() => setOpen(null)}
          onSent={(r) => { setOpen(null); onReviewed(r); }}
        />
      )}
    </div>
  );
}

// Reseñas aprobadas de un producto (para la tienda).
export function ProductReviews({ product, onClose, reviewOrder, customer, onWrite }) {
  const [list, setList] = useState(null);
  useEffect(() => {
    getProductReviews(product.id, TEST_MODE).then(setList).catch(() => setList([]));
  }, [product.id]);
  return (
    <div className="glow-modal-bg" onClick={onClose}>
      <div className="glow-ship" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Reseñas">
        <button className="glow-join-x" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        <h3>{product.name}</h3>
        {product.reviews > 0 ? (
          <p className="glow-rev-summary"><Stars value={product.rating} size={24} /> <b>{product.rating}</b> · {product.reviews} reseña{product.reviews === 1 ? "" : "s"}</p>
        ) : (
          <p className="glow-rev-summary">Aún no hay reseñas de este producto.</p>
        )}
        {reviewOrder ? (
          <button className="glow-pay-btn" style={{ background: C.aubergine, margin: "4px 0 10px" }} onClick={() => onWrite(product, reviewOrder)}>
            ✍️ Escribir mi reseña · hasta +{REVIEW_PTS.photo} Michipuntos
          </button>
        ) : (
          <p className="glow-hint" style={{ margin: "0 0 10px" }}>
            {customer ? "Podrás reseñar este producto cuando lo compres y confirmemos tu pago." : "Únete y compra este producto para dejar tu reseña y ganar Michipuntos."}
          </p>
        )}
        {!list && <p style={{ color: C.inkSoft }}>Cargando…</p>}
        {list?.map((r) => (
          <div key={r.id} className="glow-rev-item">
            <div className="glow-rev-top"><span className="glow-rev-av">{(r.name || "C")[0]}</span><div><b>{r.name}</b><small>{new Date(r.createdAt).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" })}</small></div><Stars value={r.rating} size={20} /></div>
            <p>{r.text}</p>
            {r.photo && <img src={r.photo} alt={`Foto de ${r.name}`} />}
          </div>
        ))}
      </div>
    </div>
  );
}

// Reglas de Michipuntos explicadas a la clienta, en palabras sencillas.
export function PointsHelp({ info, onClose }) {
  const [credit, setCredit] = useState(false);
  const ex = 40; // compra de ejemplo
  const exPts = Math.floor(ex * info.perSol);
  const first = info.rewards[0];
  const pct = (m) => Math.round((m - 1) * 100);
  return (
    <div className="glow-modal-bg" onClick={onClose}>
      <div className="glow-ship glow-help" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Cómo funcionan los Michipuntos">
        <button className="glow-join-x" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        <div className="glow-help-head"><YarnBasket points={600} size={64} /><h3>¿Cómo funcionan los Michipuntos?</h3></div>

        {/* 3 pasos */}
        <div className="glow-steps3">
          <div><span>🛍️</span><b>1. Compra</b><small>Cada compra te da Michipuntos</small></div>
          <div><span>🧶</span><b>2. Junta</b><small>Se guardan en tu cesto</small></div>
          <div><span>🎁</span><b>3. Canjea</b><small>Úsalos como descuento</small></div>
        </div>

        <div className="glow-help-example">
          <b>Ejemplo:</b> compras <b>{money(ex)}</b> → ganas <b>{exPts} Michipuntos</b>.<br />
          Cuando juntes <b>{fmtPts(first.points)}</b>, tienes <b>S/ {first.value} de descuento</b> 🎉
        </div>

        <div className="glow-ship-sec">
          <h4>🎁 ¿Qué puedo canjear?</h4>
          <div className="glow-help-levels">
            {info.rewards.map((r) => (
              <div key={r.key}>
                <b>{r.surprise ? "🎁 Un regalo sorpresa" : `S/ ${r.value} de descuento`}</b>
                <span>en compras desde {money(r.min)}</span>
                <em>{fmtPts(r.points)} puntos</em>
              </div>
            ))}
          </div>
          <p className="glow-ship-sub" style={{ margin: "8px 0 0" }}>Lo eliges en tu carrito antes de pagar (uno por compra).</p>
        </div>

        <div className="glow-ship-sec">
          <h4>✨ Más formas de ganar</h4>
          <div className="glow-help-chips">
            <span>🐾 Al unirte <b>+{info.welcome}</b></span>
            <span>🎂 En tu cumpleaños <b>+{info.birthday}</b></span>
            <span>⭐ Reseña <b>+{info.reviewText}</b></span>
            <span>📸 Reseña con foto <b>+{info.reviewPhoto}</b></span>
          </div>
        </div>

        <div className="glow-ship-sec">
          <h4>👑 Mientras más compras, más ganas</h4>
          <div className="glow-help-levels">
            {info.levels.map((l) => (
              <div key={l.key} className={info.level.key === l.key ? "is-on" : ""}>
                <b>{l.name}{info.level.key === l.key ? " · tu nivel" : ""}</b>
                <span>{l.min ? `si compras ${money(l.min)} o más en el año` : "al unirte"}</span>
                <em>{l.mult > 1 ? `+${pct(l.mult)}% puntos` : "normal"}</em>
              </div>
            ))}
          </div>
        </div>

        <div className="glow-help-example" style={{ background: "#F6EEF8", borderColor: "#C9A0DC" }}>
          <b>💰 ¿Y el Michi-crédito?</b> Es distinto: son <b>soles</b> que te devolvemos al confirmar tu pago (hasta S/ 5),
          para usar en tu próxima compra.{" "}
          <button className="glow-inline-link" onClick={() => setCredit(true)}>¿Cómo funciona?</button>
        </div>
        {credit && <CreditHelp onClose={() => setCredit(false)} />}

        <p className="glow-help-fine">
          Los puntos se suman cuando confirmamos tu pago · el envío no suma puntos · vencen al año de ganarlos.
        </p>
      </div>
    </div>
  );
}

// Ayuda: preguntas frecuentes.
export function HelpModal({ settings, onClose, onPoints }) {
  const faqs = [
    ["¿Cómo compro?", "Añade tus productos al carrito, toca «Pagar con Yape», elige cómo recibirlo y sigue los pasos. Al final recibes tu notita de venta."],
    ["¿Cómo pago?", `Por Yape al ${(settings.yapeNumber || "").replace(/(\d{3})(?=\d)/g, "$1 ")}. Subes la captura de tu comprobante y nosotras confirmamos el pago.`],
    ["¿Hacen entregas en Juliaca?", "Sí, gratis. Eliges el punto de encuentro, el día y la hora exacta al pagar."],
    ["¿Envían a otras ciudades?", "Sí, por Shalom a todo el Perú. Recoges en la agencia que elijas con tu DNI. El costo depende del departamento."],
    ["¿Qué son los Michipuntos?", "Son puntos que ganas con cada compra. Por ejemplo, si compras S/ 40 ganas 50 Michipuntos. Cuando juntas 500, los cambias por S/ 5 de descuento en tu carrito."],
    ["¿Qué es el Michi-crédito?", "Cuando confirmamos tu pago te devolvemos hasta S/ 5 en crédito. Reclámalo en 48 horas y úsalo en los siguientes 10 días en una compra desde S/ 30. Es un beneficio por pedido: crédito o Michipuntos."],
    ["¿Dónde veo mi pedido?", "En Mi cuenta → Mis compras. Ahí ves si tu pago está en verificación, confirmado o enviado."],
  ];
  return (
    <div className="glow-modal-bg" onClick={onClose}>
      <div className="glow-ship glow-help" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Ayuda">
        <button className="glow-join-x" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        <h3>¿En qué te ayudamos?</h3>
        {faqs.map(([q, a]) => (
          <details key={q} className="glow-faq">
            <summary>{q}</summary>
            <p>{a}</p>
            {q.includes("Michipuntos") && <button className="glow-link-btn" style={{ color: C.yape, justifyContent: "flex-start" }} onClick={onPoints}>Ver cómo funcionan ›</button>}
          </details>
        ))}
        <a className="glow-pay-btn" style={{ background: "#25D366", marginTop: 14, textDecoration: "none" }}
          href={`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent("Hola, necesito ayuda con mi pedido")}`} target="_blank" rel="noreferrer">
          <MessageCircle size={18} /> Escríbenos por WhatsApp
        </a>
      </div>
    </div>
  );
}

export function JoinModal({ googleClientId, onClose, onJoined }) {
  const btnRef = useRef(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!googleClientId) return;
    let alive = true;
    loadGoogleScript()
      .then(() => {
        if (!alive || !btnRef.current) return;
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async ({ credential }) => {
            try {
              onJoined(await googleLogin(credential));
            } catch (e) {
              setErr(e.message);
            }
          },
        });
        window.google.accounts.id.renderButton(btnRef.current, { theme: "outline", size: "large", shape: "pill", text: "continue_with", locale: "es" });
      })
      .catch((e) => setErr(e.message));
    return () => { alive = false; };
  }, [googleClientId, onJoined]);

  return (
    <div className="glow-modal-bg" onClick={onClose}>
      <div className="glow-join" onClick={(e) => e.stopPropagation()}>
        <button className="glow-join-x" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        <div className="glow-join-face"><RosaliaFace /></div>
        <h3>Únete al club de Rosalía</h3>
        <p className="glow-soft" style={{ fontSize: 18, margin: "0 0 14px" }}>Es opcional y gratis</p>
        <ul className="glow-join-perks">
          <li>✉️ Novedades y nuevos michis en tu correo</li>
          <li>🏷️ Ofertas y descuentos solo para el club</li>
          <li>✨ Te saludamos por tu nombre al entrar</li>
        </ul>
        {googleClientId ? (
          <div ref={btnRef} className="glow-join-gbtn" />
        ) : (
          !TEST_MODE && <p className="glow-hint" style={{ textAlign: "center" }}>El registro con Google aún no está configurado.</p>
        )}
        {TEST_MODE && (
          <button className="glow-pay-btn is-ghost" style={{ color: C.aubergine, borderColor: C.aubergine, marginTop: 10 }}
            onClick={async () => { try { onJoined(await testLogin()); } catch (e) { setErr(e.message); } }}>
            Simular registro (modo prueba)
          </button>
        )}
        {err && <p className="glow-err" style={{ textAlign: "center" }}>{err}</p>}
        <p className="glow-join-legal">Al registrarte aceptas recibir correos con novedades y ofertas de {"Glow by Rosalía"}. Puedes darte de baja cuando quieras. Solo guardamos tu nombre, correo y foto de Google.</p>
      </div>
    </div>
  );
}
