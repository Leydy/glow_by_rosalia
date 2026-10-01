import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useId, useCallback } from "react";
import {
  Store, Lock, Plus, Minus, Pencil, Trash2, X, Search,
  TrendingUp, Package, Wallet, AlertTriangle, Settings as SettingsIcon,
  MessageCircle, LogOut, Sparkles, ShoppingCart, Image as ImageIcon,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { C, money } from "./theme.js";
import { CATEGORIES, CATEGORY_INFO, HERO_INTRO_WORDS, HERO_TICKER } from "./data.js";
import ChatBot from "./ChatBot.jsx";
import {
  setAdminPin, checkPin,
  createProduct, updateProduct, deleteProduct, importProducts,
  getProducts, getSettings, updateSettings, uploadImages,
  createOrder, getOrders, setOrderStatus, deleteTestOrders, getAdminSettings, getAdminProducts, getCustomers, sendWelcomeMail,
  getConfig, googleLogin, testLogin, setCustomerToken, getMe, updateMe, getMyOrders, saveFavorites, getMyPoints, getShalomAgencies,
  getMyReviews, createReview, getProductReviews, getAdminReviews, setReviewStatus, getMyCredits, claimMyCredit, updateSeasons,
} from "./api.js";
import { toPng } from "html-to-image";
import UBIGEO from "./ubigeo.json"; // departamentos → provincias → distritos (INEI)
import { GUIDES, GUIDE_KEYS } from "./guides.js";
import {
  WORLDS, WORLD_KEYS, WORLD_HERO, worldOf, SKIN_TYPES, CONCERNS, ROUTINE_STEPS, BUDGETS, buildRoutine,
  KID_SIZES, SHOE_SIZES, SIZE_CHART, sizeForHeight, AGE_HEIGHTS, recommendedSize, spaArt,
} from "./worlds.js";
import { activeSeason, seasonList, guideArt, inRange, daysUntil, webSvg, SPIDER, catSkullSvg, batSvg, PUMPKIN, WITCH_HAT, GHOST, MOON, BLACK_CAT, candySvg } from "./seasons.js";

/* ---------- Carga local (solo el carrito del visitante) ----------
   Los productos y los ajustes ahora viven en la base de datos (Postgres) y se
   piden al backend a través de src/api.js. El carrito sí se queda en el
   navegador, porque es de cada visitante. */

/* ---------- Migración desde el navegador ----------
   Lee los productos que quedaron guardados en localStorage (la versión vieja de
   la tienda) para poder pasarlos a la base de datos. */
function readBrowserProducts() {
  try {
    const raw = localStorage.getItem("glow:products");
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    // Normaliza al formato actual: siempre con un arreglo `images`.
    return list.map((p) => {
      const images = Array.isArray(p.images)
        ? p.images.filter(Boolean)
        : p.image
        ? [p.image]
        : [];
      const { image, ...rest } = p;
      return { ...rest, images };
    });
  } catch {
    return [];
  }
}

// Lee los ajustes guardados en este navegador (o null si no hay).
function readBrowserSettings() {
  try {
    const raw = localStorage.getItem("glow:settings");
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s && typeof s === "object" ? s : null;
  } catch {
    return null;
  }
}

function loadCart() {
  try {
    const raw = localStorage.getItem("glow:cart");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/* ---------- Imágenes locales ----------
   Lee un archivo del dispositivo, lo reduce a un tamaño máximo y lo comprime
   a JPEG. Se guarda como "data URL" dentro del navegador (no necesita servidor)
   y así no se llena el almacenamiento con fotos enormes. */
function fileToDataURL(file, maxSize = 800, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Imagen inválida"));
      img.onload = () => {
        let { width, height } = img;
        if (width >= height && width > maxSize) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else if (height > maxSize) {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// Pantalla de carga: Rosalía (de perfil, con sus manchas) corre sobre un suelo
// que se desliza, dejando nubecitas de polvo.
function RunningCat() {
  const leg = (x, y, cls, fill) => (
    <g transform={`translate(${x} ${y})`}>
      <path className={cls} d="M-5 0 H5 V24 A5 5 0 0 1 -5 24 Z" fill={fill} stroke="#CFC3BA" strokeWidth="1.4" />
    </g>
  );
  return (
    <svg className="glow-run-cat" viewBox="0 0 170 100" aria-hidden="true">
      <defs>
        <clipPath id="run-body"><ellipse cx="72" cy="52" rx="42" ry="18" /></clipPath>
        <clipPath id="run-head"><circle cx="118" cy="38" r="17" /></clipPath>
      </defs>
      <g className="glow-run-bob">
        <path className="glow-run-tail" d="M32 46 C18 44 10 34 8 20 C7 14 13 13 14 19 C16 30 22 36 34 38 Z" fill={ROS.tabby} />
        <path d="M11 22 L16 21 M13 30 L19 28" stroke={ROS.stripe} strokeWidth="2.4" strokeLinecap="round" />
        {leg(44, 60, "glow-run-leg is-b2", ROS.shade)}
        {leg(100, 60, "glow-run-leg is-f2", ROS.shade)}
        <ellipse cx="72" cy="52" rx="42" ry="18" fill={ROS.white} stroke="#CFC3BA" strokeWidth="1.4" />
        <g clipPath="url(#run-body)">
          <path d="M28 40 C36 30 52 32 54 44 C52 54 38 58 28 54 Z" fill={ROS.orange} />
          <path d="M62 32 C76 28 92 32 96 42 C86 48 70 46 62 32 Z" fill={ROS.black} />
        </g>
        {leg(40, 60, "glow-run-leg is-b1", ROS.white)}
        {leg(104, 60, "glow-run-leg is-f1", ROS.white)}
        <path d="M109 24 L112 8 L121 21 Z" fill={ROS.tabby} />
        <path d="M121 21 L128 8 L130 25 Z" fill={ROS.tabby} />
        <path d="M112 12 L114 21 L119 20 Z" fill={ROS.earIn} />
        <circle cx="118" cy="38" r="17" fill={ROS.white} stroke="#CFC3BA" strokeWidth="1.4" />
        <g clipPath="url(#run-head)">
          <path d="M98 18 H140 V30 C134 32 128 30 124 28 C120 32 114 36 108 44 L98 46 Z" fill={ROS.tabby} />
          <path d="M112 24 L114 30 M118 22 L119 28" stroke={ROS.stripe} strokeWidth="2" strokeLinecap="round" />
        </g>
        <path d="M120 36 C122 32 128 32 130 36 C128 40 122 40 120 36 Z" fill={ROS.irisIn} stroke={ROS.line} strokeWidth="1.2" />
        <ellipse cx="125.5" cy="36" rx="1.2" ry="2.4" fill="#15110E" />
        <path d="M132 43 L136 42 L134 46 Z" fill="#EDA3A6" />
        <path d="M130 47 C138 46 146 45 152 43 M130 49 C138 50 146 51 152 52" stroke="#BDB2AA" strokeWidth=".8" fill="none" />
        <path d="M104 50 Q118 58 128 48" stroke={C.primary} strokeWidth="4" strokeLinecap="round" fill="none" />
        <circle cx="120" cy="56" r="3.6" fill={C.gold} />
      </g>
    </svg>
  );
}

function PageLoader({ leaving, error }) {
  return (
    <div className={`glow-loader${leaving ? " is-leaving" : ""}`} style={{ background: C.bg }}>
      {error ? (
        <p style={{ color: C.warn, fontWeight: 600, maxWidth: 420, textAlign: "center", padding: "0 20px" }}>{error}</p>
      ) : (
        <>
          <div className="glow-loader-stage">
            <RunningCat />
            <span className="glow-dust is-1" /><span className="glow-dust is-2" /><span className="glow-dust is-3" />
            <div className="glow-loader-ground" style={{ color: C.rose }} />
          </div>
          <p className="glow-loader-text" style={{ color: C.roseDeep }}>
            Cargando la tienda<span>.</span><span>.</span><span>.</span>
          </p>
        </>
      )}
    </div>
  );
}

/* ---------- Modo prueba ----------
   Con ?prueba en la dirección se activa para esta pestaña: muestra un aviso,
   permite simular el registro y usar una captura de Yape de ejemplo. Los
   pedidos se marcan como prueba y se pueden borrar desde el panel. */
const TEST_MODE = (() => {
  try {
    if (new URLSearchParams(window.location.search).has("prueba")) sessionStorage.setItem("glow:prueba", "1");
    return sessionStorage.getItem("glow:prueba") === "1";
  } catch {
    return false;
  }
})();
function exitTestMode() {
  try { sessionStorage.removeItem("glow:prueba"); } catch { /* sin almacenamiento */ }
  window.location.href = window.location.pathname;
}

// Cliente registrado: se recuerda en este navegador (solo nombre, correo y foto).
function loadCustomer() {
  try {
    return JSON.parse(localStorage.getItem("glow:cliente") || "null");
  } catch {
    return null;
  }
}
function saveCustomer(c) {
  try {
    if (c) localStorage.setItem("glow:cliente", JSON.stringify(c));
    else localStorage.removeItem("glow:cliente");
  } catch {
    /* sin almacenamiento: la sesión dura lo que dure la pestaña */
  }
}

// Carga el script de "Acceder con Google" una sola vez.
let gsiPromise = null;
function loadGoogleScript() {
  gsiPromise ||= new Promise((ok, fail) => {
    const sc = document.createElement("script");
    sc.src = "https://accounts.google.com/gsi/client";
    sc.async = true;
    sc.onload = ok;
    sc.onerror = () => { gsiPromise = null; fail(new Error("No se pudo cargar Google")); };
    document.head.appendChild(sc);
  });
  return gsiPromise;
}

// Captura de Yape de ejemplo (solo modo prueba): se dibuja al momento con el
// monto del carrito, el titular y un Nro. de operación al azar.
function makeSampleCapture(total, yapeName) {
  const W = 390, H = 560;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const g = cv.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#742284"; g.fillRect(0, 0, W, 110);
  g.textAlign = "center";
  g.fillStyle = "#fff"; g.font = "bold 30px Arial"; g.fillText("¡Yapeaste!", W / 2, 68);
  g.fillStyle = "#222"; g.font = "bold 46px Arial";
  g.fillText("S/ " + (Number.isInteger(total) ? total : total.toFixed(2)), W / 2, 190);
  const short = (yapeName || "Titular").split(/\s+/).map((w, i) => (i === 0 || i === 2 ? w : w[0] + ".")).slice(0, 4).join(" ");
  g.fillStyle = "#333"; g.font = "20px Arial"; g.fillText(short, W / 2, 232);
  const d = new Date();
  g.fillStyle = "#666"; g.font = "16px Arial";
  g.fillText(d.toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" }) + " - " + d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }), W / 2, 280);
  const op = String(Math.floor(10000000 + Math.random() * 89999999));
  g.textAlign = "left"; g.fillStyle = "#333"; g.font = "17px Arial";
  g.fillText("Destino: Yape", 28, 360);
  g.fillText("Nro. de operación: " + op, 28, 400);
  g.fillStyle = "#999"; g.font = "13px Arial"; g.textAlign = "center";
  g.fillText("CAPTURA DE PRUEBA · NO ES UN PAGO REAL", W / 2, 520);
  return new Promise((ok) => cv.toBlob((b) => ok(new File([b], "captura-prueba.png", { type: "image/png" })), "image/png"));
}

/* ---------- Favoritos ----------
   Se guardan en este navegador y, si el cliente inició sesión, también en su
   cuenta (así lo acompañan a cualquier dispositivo). */
function loadFavs() {
  try {
    const v = JSON.parse(localStorage.getItem("glow:favs") || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function storeFavs(list) {
  try {
    localStorage.setItem("glow:favs", JSON.stringify(list));
  } catch {
    /* sin almacenamiento: los favoritos duran lo que dure la pestaña */
  }
}

function HeartIcon({ filled, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 20.5C5 15 2.5 11.5 3.3 8 4 5 7.5 3.6 10 5.4c.8.6 1.5 1.3 2 2 .5-.7 1.2-1.4 2-2C16.5 3.6 20 5 20.7 8c.8 3.5-1.7 7-8.7 12.5z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Corazón para marcar un producto como favorito (va sobre la foto).
function FavButton({ active, onClick, style }) {
  return (
    <button
      type="button"
      className={`glow-fav${active ? " is-on" : ""}`}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      aria-label={active ? "Quitar de favoritos" : "Añadir a favoritos"}
      aria-pressed={active}
      title={active ? "Quitar de favoritos" : "Añadir a favoritos"}
      style={style}
    >
      <HeartIcon filled={active} />
    </button>
  );
}

// Estado del pedido tal como lo ve el cliente.
const ORDER_STEP = {
  pendiente: { label: "Pago en verificación", color: "#D48A12", bg: "#FFF6E5" },
  verificado: { label: "Pago confirmado", color: "#1FA971", bg: "#EAF8F1" },
  enviado: { label: "¡Pedido enviado!", color: "#742284", bg: "#F4ECF8" },
  rechazado: { label: "Pago no válido · escríbenos", color: "#C0392B", bg: "#FDECEA" },
};

// Menú de la cuenta (se abre al tocar el avatar).
function AccountMenu({ customer, onPick, onLogout, onClose }) {
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
      <button role="menuitem" className="is-out" onClick={onLogout}><LogOut size={17} /><span>Cerrar sesión</span></button>
    </div>
  );
}

// Panel lateral de la cuenta: perfil, pedidos o favoritos.
function AccountDrawer({ section, onSection, onClose, customer, onCustomer, favs, products, onToggleFav, onAdd, onJoin }) {
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

function FavoritesList({ favs, products, onToggleFav, onAdd, customer, onJoin }) {
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

function ProfileForm({ customer, onCustomer }) {
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

function MyOrders() {
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
              {o.items.map((l, i) => (l.image ? <img key={`${l.id}-${i}`} src={l.image} alt={l.name} title={l.name} /> : null))}
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

/* ---------- Michipuntos ---------- */
const fmtPts = (n) => Number(n || 0).toLocaleString("es-PE");

// Cesto de mimbre con pelotitas de lana: una pelotita por cada 100 Michipuntos
// (hasta 15). Caen al cesto una tras otra.
const BALL_COLORS = ["#F26D9C", "#B892FF", "#F0B429", "#7FD1C7", "#FF8A65", "#9FC5FF", "#E58FD8"];
const BALL_SPOTS = [
  [60, 88], [88, 90], [116, 88], [74, 72], [102, 72], [46, 74], [130, 74],
  [88, 56], [60, 58], [116, 58], [74, 42], [102, 42], [46, 50], [130, 50], [88, 28],
];
function YarnBall({ x, y, color, delay }) {
  return (
    <g className="glow-ball" style={{ animationDelay: `${delay}s` }}>
      <circle cx={x} cy={y} r="14" fill={color} />
      <g fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".55">
        <path d={`M${x - 11} ${y - 5} q11 7 22 0`} />
        <path d={`M${x - 12} ${y + 3} q12 7 24 -1`} />
        <path d={`M${x - 4} ${y - 13} q-5 13 2 26`} />
      </g>
      <circle cx={x - 5} cy={y - 6} r="3" fill="#fff" opacity=".35" />
    </g>
  );
}
function YarnBasket({ points = 0, size = 150 }) {
  const n = Math.min(BALL_SPOTS.length, Math.ceil(points / 100));
  return (
    <svg className="glow-basket" viewBox="0 0 176 150" width={size} aria-label={`${fmtPts(points)} Michipuntos`} role="img">
      {/* asa */}
      <path d="M34 92 C34 20 142 20 142 92" fill="none" stroke="#B9824A" strokeWidth="7" strokeLinecap="round" />
      <path d="M34 92 C34 20 142 20 142 92" fill="none" stroke="#D9A566" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 6" />
      {BALL_SPOTS.slice(0, n).map(([x, y], k) => (
        <YarnBall key={k} x={x} y={y} color={BALL_COLORS[k % BALL_COLORS.length]} delay={0.15 + k * 0.08} />
      ))}
      {/* cuerpo tejido */}
      <path d="M18 92 H158 L144 142 H32 Z" fill="#C98E52" />
      <g stroke="#A86F37" strokeWidth="2" opacity=".8">
        <path d="M22 106 H154 M26 120 H150 M29 132 H147" />
        <path d="M40 92 L46 142 M62 92 L65 142 M88 92 V142 M114 92 L111 142 M136 92 L130 142" />
      </g>
      <rect x="12" y="86" width="152" height="12" rx="6" fill="#DDA868" />
      <path d="M18 92 H158" stroke="#B9824A" strokeWidth="2" />
      {/* lacito */}
      <path d="M88 104 L74 96 L74 112 Z M88 104 L102 96 L102 112 Z" fill="#FF3D8B" />
      <circle cx="88" cy="104" r="4" fill="#FF3D8B" stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}

/* ---------- Guía de compras ----------
   La clienta elige quién la acompaña (Doña Baneco, Rosalía, Comisario Willy o
   Cuyito). Vive abajo a la izquierda: saluda, da tips, celebra lo que añade al
   carrito, sugiere algo que combine y la lleva a pagar. Se puede cambiar o
   esconder cuando quiera (se recuerda en este navegador). */
function loadGuide() {
  try {
    const k = localStorage.getItem("glow:guia"); // clave | "none" | null (sin elegir)
    return k === "capitan" ? "willy" : k; // el doberman ahora es el Comisario Willy
  } catch {
    return "none";
  }
}
function storeGuide(k) {
  try {
    localStorage.setItem("glow:guia", k);
  } catch {
    /* sin almacenamiento: dura lo que la pestaña */
  }
}
// Con temporada activa la mascota se viste para la ocasión (ej. sombrero de bruja).
const GuideArt = ({ k, season }) => <span className="glow-guide-art" dangerouslySetInnerHTML={{ __html: guideArt(GUIDES[k].art, k, season) }} />;

function GuidePicker({ current, onPick, onClose, season }) {
  const [sel, setSel] = useState(current && GUIDES[current] ? current : "rosalia");
  return (
    <div className="glow-modal-bg" onClick={onClose}>
      <div className="glow-gpick" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Elige tu guía">
        <button className="glow-join-x" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        <h3>¿Quién te acompaña hoy?</h3>
        <p className="glow-soft" style={{ fontSize: 18, margin: "0 0 14px" }}>Tu guía te da tips y te ayuda con tu carrito</p>
        <div className="glow-gpick-grid">
          {GUIDE_KEYS.map((k) => {
            const g = GUIDES[k];
            return (
              <button key={k} type="button" className={`glow-gpick-card${sel === k ? " is-on" : ""}`} onClick={() => setSel(k)} aria-pressed={sel === k}>
                <span className="glow-gpick-stage" style={{ background: g.bg }}><GuideArt k={k} season={season} /></span>
                <small>{g.tag}</small>
                <b>{g.name}</b>
                <span className="glow-gpick-desc">{g.desc}</span>
              </button>
            );
          })}
        </div>
        <p className="glow-gpick-sel">{GUIDES[sel].desc}</p>
        <button className="glow-pay-btn" style={{ background: C.primary, marginTop: 14 }} onClick={() => onPick(sel)}>
          Elegir a {GUIDES[sel].name} 🐾
        </button>
        <button className="glow-link-btn" style={{ color: C.plum }} onClick={() => onPick("none")}>Prefiero comprar sin guía</button>
      </div>
    </div>
  );
}

function ShopGuide({ products, cartLines, cartCount, onAdd, onOpenCart, event, season }) {
  const [k, setK] = useState(loadGuide);
  const [picker, setPicker] = useState(false);
  const [msg, setMsg] = useState(null); // { html, acts: [{ label, run, ghost }] }
  const [jump, setJump] = useState(0);
  const timer = useRef(null);
  const stats = useRef({ tips: 0, nudges: 0, last: Date.now() });
  const g = GUIDES[k];

  // Primera visita: ofrece elegir guía (sin interrumpir la carga).
  useEffect(() => {
    if (k !== null) return;
    const t = setTimeout(() => setPicker(true), 4500);
    return () => clearTimeout(t);
  }, [k]);

  const say = useCallback((html, acts = [], ms = 9000) => {
    clearTimeout(timer.current);
    setMsg({ html, acts });
    setJump((j) => j + 1);
    stats.current.last = Date.now();
    if (ms) timer.current = setTimeout(() => setMsg(null), ms);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  const inStock = products.filter((p) => p.stock > 0);
  const best = () => {
    const pool = inStock.filter((p) => p.bestSeller);
    const list = pool.length ? pool : inStock;
    return list[Math.floor(Math.random() * list.length)];
  };
  // Lleva la vista a un producto y lo resalta un momento.
  const showProduct = (p) => {
    const el = document.getElementById(`prod-${p.id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("glow-card-hi");
    setTimeout(() => el.classList.remove("glow-card-hi"), 2600);
    setMsg(null);
  };
  const recommend = () => {
    const p = best();
    if (p) say(g.pick(p.name), [{ label: "Ver", run: () => showProduct(p) }, { label: "Luego", ghost: true, run: () => setMsg(null) }], 12000);
  };

  // Saludo al elegir guía o al volver.
  useEffect(() => {
    if (!g) return;
    const t = setTimeout(() => say(g.hi, [{ label: "Recomiéndame algo", run: recommend }], 7000), 1800);
    return () => clearTimeout(t);
  }, [k]); // eslint-disable-line react-hooks/exhaustive-deps

  // Al añadir al carrito: celebra y sugiere algo que combine.
  useEffect(() => {
    if (!g || !event || event.type !== "added") return;
    const p = event.product;
    const inCart = new Set(cartLines.map((l) => l.id));
    const cands = inStock.filter((x) => x.id !== p.id && !inCart.has(x.id));
    const pair = cands.find((x) => x.category === p.category) || cands.find((x) => x.bestSeller) || cands[0];
    if (pair && Math.random() < 0.7) {
      say(`${g.added(p.name)}<br>${g.pair(pair.name)}`, [
        { label: "¡Sí!", run: () => { onAdd(pair); setMsg(null); } },
        { label: "No, gracias", ghost: true, run: () => setMsg(null) },
      ], 12000);
    } else {
      say(g.added(p.name), [{ label: "Ver carrito", run: () => { onOpenCart(); setMsg(null); } }], 7000);
    }
  }, [event]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tips y recordatorio del carrito, sin molestar: cada ~40 s y pocas veces.
  useEffect(() => {
    if (!g) return;
    const t = setInterval(() => {
      const st = stats.current;
      if (msg || document.querySelector(".glow-modal-bg, .glow-drawer-bg") || Date.now() - st.last < 40000) return;
      if (cartCount > 0 && st.nudges < 2) {
        st.nudges++;
        say(g.go(cartCount), [
          { label: "Ir a pagar", run: () => { onOpenCart(); setMsg(null); } },
          { label: "Seguir viendo", ghost: true, run: () => setMsg(null) },
        ], 12000);
      } else if (st.tips < 3) {
        say(g.tips[st.tips % g.tips.length]);
        st.tips++;
      }
    }, 8000);
    return () => clearInterval(t);
  }, [k, msg, cartCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Se puede arrastrar a cualquier parte de la pantalla; la posición se recuerda.
  const [pos, setPos] = useState(() => {
    try { return JSON.parse(localStorage.getItem("glow:guia-pos")) || null; } catch { return null; }
  });
  const drag = useRef(null);
  const dragged = useRef(false);
  const onDragStart = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    drag.current = { x: e.clientX, y: e.clientY, r, moved: false };
    dragged.current = false;
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onDragMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    d.moved = true;
    setMsg(null);
    const left = Math.max(4, Math.min(window.innerWidth - d.r.width - 4, d.r.left + dx));
    const bottom = Math.max(4, Math.min(window.innerHeight - d.r.height - 4, window.innerHeight - d.r.bottom - dy));
    setPos({ left, bottom, w: d.r.width });
  };
  const onDragEnd = () => {
    const d = drag.current;
    drag.current = null;
    if (d?.moved) {
      dragged.current = true;
      setPos((p) => { try { localStorage.setItem("glow:guia-pos", JSON.stringify(p)); } catch { /* sin almacenamiento */ } return p; });
    }
  };
  const guideStyle = (() => {
    if (!pos) return undefined;
    const w = pos.w || 124;
    const left = Math.max(4, Math.min(window.innerWidth - w - 4, pos.left));
    const bottom = Math.max(4, Math.min(window.innerHeight - w - 4, pos.bottom));
    // en la mitad derecha, el globito sale hacia la izquierda
    return left + w / 2 > window.innerWidth / 2 ? { left: "auto", right: window.innerWidth - left - w, bottom } : { left, bottom };
  })();
  const guideRight = !!guideStyle && guideStyle.left === "auto";

  const choose = (key) => {
    storeGuide(key);
    setK(key);
    setPicker(false);
    setMsg(null);
  };
  const menu = () =>
    say(`¿En qué te ayudo? 🐾`, [
      { label: "Recomiéndame", run: recommend },
      ...(cartCount ? [{ label: `Mi carrito (${cartCount})`, run: () => { onOpenCart(); setMsg(null); } }] : []),
      { label: "Cambiar guía", ghost: true, run: () => { setMsg(null); setPicker(true); } },
      { label: "Esconder", ghost: true, run: () => choose("none") },
    ], 15000);

  return (
    <>
      {picker && <GuidePicker current={k} season={season} onPick={choose} onClose={() => { setPicker(false); if (k === null) choose("none"); }} />}
      {g ? (
        <div className={`glow-guide${guideRight ? " is-right" : ""}`} style={guideStyle}>
          {msg && (
            <div className="glow-guide-bubble" role="status">
              <button className="glow-guide-x" onClick={() => setMsg(null)} aria-label="Cerrar"><X size={14} /></button>
              <span dangerouslySetInnerHTML={{ __html: msg.html }} />
              {msg.acts.length > 0 && (
                <span className="glow-guide-acts">
                  {msg.acts.map((a) => <button key={a.label} className={a.ghost ? "is-ghost" : ""} onClick={a.run}>{a.label}</button>)}
                </span>
              )}
            </div>
          )}
          <button
            key={jump}
            className="glow-guide-btn"
            onClick={() => { if (dragged.current) { dragged.current = false; return; } menu(); }}
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
            aria-label={`Tu guía ${g.name} (puedes arrastrarla)`}
            title={`${g.name} · arrástrame para moverme`}
          >
            <GuideArt k={k} season={season} />
          </button>
        </div>
      ) : (
        k === "none" && (
          <button className="glow-guide-mini" onClick={() => setPicker(true)} aria-label="Elegir un guía" title="Elegir un guía">🐾</button>
        )
      )}
    </>
  );
}

/* ---------- Michi-crédito ---------- */
const CREDIT_MIN = 30; // compra mínima para usarlo
const CREDIT_SHARE = 0.2; // cubre como máximo el 20% del carrito
const round2 = (n) => Math.round(n * 100) / 100;
const creditsChanged = () => window.dispatchEvent(new Event("glow:credits"));

function CreditCoin({ size = 64, spin = false }) {
  return (
    <span className={`glow-coin${spin ? " is-spin" : ""}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 40 40" width={size * 0.56} aria-hidden="true">
        <ellipse cx="20" cy="26" rx="8" ry="6.5" /><ellipse cx="10" cy="17" rx="3.6" ry="4.5" />
        <ellipse cx="16.5" cy="11" rx="3.6" ry="4.5" /><ellipse cx="23.5" cy="11" rx="3.6" ry="4.5" />
        <ellipse cx="30" cy="17" rx="3.6" ry="4.5" />
      </svg>
    </span>
  );
}

// "3 d 4 h" / "5 h 20 min" hasta una fecha.
function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "0 min";
  const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60;
  return d ? `${d} d ${h} h` : h ? `${h} h ${m} min` : `${m} min`;
}

// "¡Reclámalo!": aparece cuando se confirma un pago.
function ClaimModal({ credit, onClaim, onClose }) {
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
function CreditHelp({ onClose }) {
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
function WalletCard({ wallet, onClaim }) {
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
function RewardPicker({ info, subtotal, value, onChange, wallet }) {
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

/* ---------- Reseñas ---------- */
const REVIEW_PTS = { text: 20, photo: 60 };

// Calificación con patitas de gato (en vez de estrellas).
function PawMark({ on, size }) {
  return (
    <svg className={on ? "is-on" : ""} width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <ellipse cx="20" cy="26.5" rx="8.5" ry="7" /><ellipse cx="9.5" cy="17" rx="3.8" ry="4.8" />
      <ellipse cx="16" cy="10" rx="3.8" ry="4.8" /><ellipse cx="24" cy="10" rx="3.8" ry="4.8" />
      <ellipse cx="30.5" cy="17" rx="3.8" ry="4.8" />
    </svg>
  );
}
function Stars({ value = 0, size = 18 }) {
  return (
    <span className="glow-stars" aria-label={`${value} de 5 patitas`}>
      {[1, 2, 3, 4, 5].map((k) => <PawMark key={k} on={k <= Math.round(value)} size={size} />)}
    </span>
  );
}

// Formulario de reseña de un producto comprado.
function ReviewModal({ order, item, onClose, onSent }) {
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
          {item.image && <img src={item.image} alt="" />}
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
function OrderReviews({ order, reviews, onReviewed }) {
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
            {l.image && <img src={l.image} alt="" />}
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
function ProductReviews({ product, onClose, reviewOrder, customer, onWrite }) {
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

// Regalito dibujado (la tapa salta de vez en cuando).
function GiftIcon({ size = 54 }) {
  return (
    <svg className="glow-gift-ico" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="10" y="30" width="44" height="28" rx="5" fill="#7A3F73" />
      <rect x="29" y="30" width="6" height="28" fill="#F0B429" />
      <g className="glow-gift-lid">
        <rect x="6" y="20" width="52" height="12" rx="4" fill="#3B2146" />
        <rect x="29" y="20" width="6" height="12" fill="#F0B429" />
        <path d="M32 20 C24 8 12 12 18 19 C21 22 28 21 32 20 Z M32 20 C40 8 52 12 46 19 C43 22 36 21 32 20 Z" fill="#FF3D8B" />
      </g>
      <text x="32" y="52" textAnchor="middle" fontSize="15" fontWeight="800" fill="#fff" fontFamily="Fraunces, serif">?</text>
    </svg>
  );
}

// Productos vistos hace poco (en este navegador).
function loadSeen() {
  try {
    const v = JSON.parse(localStorage.getItem("glow:vistos") || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function markSeen(id) {
  try {
    const next = [id, ...loadSeen().filter((x) => x !== id)].slice(0, 12);
    localStorage.setItem("glow:vistos", JSON.stringify(next));
  } catch {
    /* sin almacenamiento: no se recuerdan */
  }
}

// Reglas de Michipuntos explicadas a la clienta, en palabras sencillas.
function PointsHelp({ info, onClose }) {
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
function HelpModal({ settings, onClose, onPoints }) {
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

// Página "Mi cuenta" (estilo tienda grande, versión gatuna).
function AccountPage({ customer, favs, products, onToggleFav, onAdd, onPanel, settings, wallet, onClaimCredit }) {
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
                  {o.items.slice(0, 3).map((l, i) => (l.image ? <img key={`${l.id}-${i}`} src={l.image} alt={l.name} /> : null))}
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

/* ---------- Registro (opcional) ---------- */
// Inicial del nombre dentro de una carita con orejitas de gato.
function CatAvatar({ customer, size = 34 }) {
  return (
    <span className="glow-cat-avatar" style={{ width: size, height: size }}>
      {customer.picture ? <img src={customer.picture} alt="" referrerPolicy="no-referrer" /> : <b>{(customer.name || "?")[0].toUpperCase()}</b>}
    </span>
  );
}

function JoinModal({ googleClientId, onClose, onJoined }) {
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

export default function App() {
  const [view, setView] = useState("shop"); // 'shop' | 'admin'
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  // Mundo de la tienda (Michitienda · Glow Skin · Glow Kids); se recuerda.
  const [world, setWorldState] = useState(() => {
    try {
      const w = localStorage.getItem("glow:mundo");
      return WORLDS[w] ? w : "michi";
    } catch {
      return "michi";
    }
  });
  const setWorld = (w) => {
    setWorldState(w);
    try { localStorage.setItem("glow:mundo", w); } catch { /* sin almacenamiento */ }
  };
  const [loadError, setLoadError] = useState("");
  const [customer, setCustomer] = useState(loadCustomer);
  const [joinOpen, setJoinOpen] = useState(false);
  const [googleClientId, setGoogleClientId] = useState("");
  useEffect(() => {
    getConfig()
      .then((c) => {
        setGoogleClientId(c.googleClientId || "");
        if (TEST_MODE && c.testMode === false) exitTestMode(); // tienda publicada: sin modo prueba
      })
      .catch(() => {});
  }, []);
  const [favs, setFavs] = useState(loadFavs);
  // Michi-crédito de la clienta (billetera, créditos por reclamar, aviso de vencimiento)
  const [wallet, setWallet] = useState(null);
  const [claimOpen, setClaimOpen] = useState(null);
  const [expToast, setExpToast] = useState(false);
  const loadWallet = useCallback(() => {
    if (!loadCustomer()?.token) return setWallet(null);
    getMyCredits()
      .then((w) => {
        setWallet(w);
        let seen = false;
        try { seen = sessionStorage.getItem("glow:claim-visto") === "1"; } catch { /* sin almacenamiento */ }
        if (w.toClaim.length && !seen) setClaimOpen(w.toClaim[0]);
        const soon = w.balance > 0 && w.expiresAt && new Date(w.expiresAt).getTime() - Date.now() < 2 * 864e5;
        let toasted = false;
        try { toasted = sessionStorage.getItem("glow:vence-visto") === "1"; } catch { /* sin almacenamiento */ }
        if (soon && !toasted) setExpToast(true);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    window.addEventListener("glow:credits", loadWallet);
    return () => window.removeEventListener("glow:credits", loadWallet);
  }, [loadWallet]);
  const claim = async (id) => {
    const w = await claimMyCredit(id);
    setWallet(w);
  };
  const closeClaim = () => {
    setClaimOpen(null);
    try { sessionStorage.setItem("glow:claim-visto", "1"); } catch { /* sin almacenamiento */ }
  };
  const [panel, setPanel] = useState(null); // null | 'perfil' | 'pedidos' | 'favoritos'
  const [menuOpen, setMenuOpen] = useState(false);

  // Actualiza el cliente conservando su llave de sesión.
  const onCustomer = useCallback((c) => {
    setCustomer((prev) => {
      const next = c ? { ...prev, ...c, token: c.token || prev?.token } : null;
      saveCustomer(next);
      return next;
    });
  }, []);
  const onJoined = useCallback((c) => {
    setCustomerToken(c.token);
    onCustomer(c);
    setJoinOpen(false);
    setTimeout(creditsChanged, 0);
    // une los favoritos de este navegador con los de su cuenta
    setFavs((local) => {
      const merged = [...new Set([...(c.favorites || []), ...local])];
      storeFavs(merged);
      if (merged.length !== (c.favorites || []).length) saveFavorites(merged).catch(() => {});
      return merged;
    });
  }, [onCustomer]);
  const logout = () => {
    setWallet(null);
    setCustomerToken("");
    setCustomer(null);
    saveCustomer(null);
    setMenuOpen(false);
    setPanel(null);
    window.google?.accounts?.id?.disableAutoSelect?.();
  };
  // Al abrir la página con la sesión guardada: comprueba que siga vigente.
  useEffect(() => {
    const c = loadCustomer();
    if (!c?.token) {
      if (c) { saveCustomer(null); setCustomer(null); }
      return;
    }
    setCustomerToken(c.token);
    getMe()
      .then((me) => {
        onCustomer(me);
        creditsChanged();
        setFavs((local) => {
          const merged = [...new Set([...(me.favorites || []), ...local])];
          storeFavs(merged);
          return merged;
        });
      })
      .catch(() => { setCustomerToken(""); saveCustomer(null); setCustomer(null); });
  }, [onCustomer]);
  const toggleFav = useCallback((id) => {
    setFavs((list) => {
      const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
      storeFavs(next);
      if (loadCustomer()?.token) saveFavorites(next).catch(() => {});
      return next;
    });
  }, []);
  const [page, setPage] = useState("tienda"); // 'tienda' | 'cuenta'
  const [shipInfo, setShipInfo] = useState(false);

  // El panel no se muestra en la tienda: se abre con la dirección …/#admin
  useEffect(() => {
    const sync = () => { if (window.location.hash === "#admin") setView("admin"); };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const leaveAdmin = () => {
    if (window.location.hash === "#admin") history.replaceState(null, "", window.location.pathname + window.location.search);
  };
  // Tras entrar con el PIN: ajustes completos (con PIN) y productos con costo.
  const onAdminAuthed = async () => {
    try {
      const [st, prods] = await Promise.all([getAdminSettings(), getAdminProducts()]);
      setSettings(st);
      setProducts(prods);
    } catch {
      /* si falla, el panel sigue con los datos públicos */
    }
  };
  const openPanel = (section) => {
    setMenuOpen(false);
    leaveAdmin();
    setView("shop");
    if (section === "cuenta") {
      setPanel(null);
      setPage("cuenta");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else setPanel(section);
  };
  useEffect(() => {
    if (!customer && page === "cuenta") setPage("tienda");
  }, [customer, page]);
  const favCount = favs.filter((id) => products.some((p) => p.id === id)).length;
  // La pantalla de carga se muestra al menos 1.6 s para que se vea a Rosalía
  // correr; luego se desvanece sobre la tienda ya cargada.
  const [minDone, setMinDone] = useState(false);
  const [loaderGone, setLoaderGone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMinDone(true), 1600);
    return () => clearTimeout(t);
  }, []);
  const ready = !loading && !!settings && minDone;
  // Colores de fondo y cabecera de Glow Skin / Glow Kids (la Michitienda usa los de su portada).
  useEffect(() => {
    const w = WORLDS[world];
    if (view !== "shop" || !w.bg) return;
    const root = document.documentElement;
    root.dataset.world = world;
    root.style.setProperty("--world-bg", w.bg);
    return () => {
      delete root.dataset.world;
      root.style.removeProperty("--world-bg");
    };
  }, [world, view]);

  // Temporada del día (Halloween, Navidad…); fuera de fecha es null.
  const season = useMemo(() => (settings ? activeSeason(settings.seasons) : null), [settings]);
  useEffect(() => {
    const root = document.documentElement;
    if (season && view === "shop") root.dataset.season = season.key;
    else delete root.dataset.season;
  }, [season, view]);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setLoaderGone(true), 600);
    return () => clearTimeout(t);
  }, [ready]);

  // Al abrir la página se piden productos y ajustes al servidor.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [p, s] = await Promise.all([getProducts(TEST_MODE), getSettings()]);
        if (!alive) return;
        setProducts(p);
        setSettings(s);
      } catch {
        if (alive)
          setLoadError(
            "No se pudo conectar con el servidor. Asegúrate de que esté encendido (npm run server)."
          );
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Crear / editar / borrar productos y guardar ajustes (todo va a Postgres).
  const saveProduct = async (prod) => {
    if (prod.id) {
      const saved = await updateProduct(prod.id, prod);
      setProducts((arr) => arr.map((p) => (p.id === saved.id ? saved : p)));
    } else {
      const saved = await createProduct(prod);
      setProducts((arr) => [...arr, saved]);
    }
  };
  const removeProduct = async (id) => {
    await deleteProduct(id);
    setProducts((arr) => arr.filter((p) => p.id !== id));
  };
  const saveSettings = async (next) => {
    const saved = await updateSettings(next);
    setSettings(saved);
    setAdminPin(saved.pin); // por si cambió el PIN, seguir autorizados
  };

  // Pasa a la base de datos los productos y ajustes que estaban guardados en
  // este navegador. Las fotos/logo en base64 se suben primero como archivos.
  const importFromBrowser = async () => {
    const list = readBrowserProducts();
    let saved = 0;

    if (list.length > 0) {
      for (const p of list) {
        const dataUrls = p.images.filter(
          (u) => typeof u === "string" && u.startsWith("data:")
        );
        const uploaded = dataUrls.length ? await uploadImages(dataUrls) : [];
        let i = 0;
        p.images = p.images
          .map((u) =>
            typeof u === "string" && u.startsWith("data:") ? uploaded[i++] : u
          )
          .filter(Boolean);
      }
      ({ saved } = await importProducts(list));
      const fresh = await getProducts(); // recarga ya con todo guardado
      setProducts(fresh);
    }

    // Ajustes (nombre, WhatsApp, PIN, logo, eslogan).
    let settingsMigrated = false;
    const b = readBrowserSettings();
    if (b) {
      let logo = b.logo;
      if (typeof logo === "string" && logo.startsWith("data:")) {
        const [url] = await uploadImages([logo]); // sube el logo como archivo
        logo = url;
      }
      const merged = { ...settings, ...b, logo: logo ?? settings.logo };
      const savedSettings = await updateSettings(merged);
      setSettings(savedSettings);
      setAdminPin(savedSettings.pin); // por si el PIN viejo era distinto
      settingsMigrated = true;
    }

    return { saved, settingsMigrated };
  };

  if (loading || !settings) {
    return <PageLoader error={loadError} />;
  }

  // Inicio: vuelve a la tienda y arriba del todo.
  const goHome = () => {
    leaveAdmin();
    setView("shop");
    setPage("tienda");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  // Búsqueda: baja al catálogo y deja el cursor en el buscador.
  const goSearch = () => {
    leaveAdmin();
    setView("shop");
    setPage("tienda");
    setTimeout(() => {
      document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" });
      document.getElementById("glow-search")?.focus({ preventScroll: true });
    }, 50);
  };

  return (
    <div style={{ background: `var(--world-bg, ${C.bg})`, color: C.ink, minHeight: "100vh", transition: "background .4s" }}>
      {!loaderGone && <PageLoader leaving={ready} />}
      {TEST_MODE && (
        <div className="glow-testbar">
          🧪 <b>Modo prueba</b> · nada de lo que hagas aquí es real
          <button onClick={exitTestMode}>Salir</button>
        </div>
      )}
      <header className="glow-header" style={{ "--pat": catPattern(C.roseDeep) }}>
        <BrandName name={settings.storeName} onClick={goHome} season={view === "shop" ? season : null} />
        {view === "shop" && <WorldTabs world={world} onPick={(w) => { setWorld(w); setPage("tienda"); window.scrollTo({ top: 0, behavior: "smooth" }); }} />}
        {season?.key === "halloween" && view === "shop" && <HalloweenCat />}

        <nav className="glow-nav">
          {/* 1 · navegación */}
          <div className="glow-nav-links">
            <NavBtn active={view === "shop" && page === "tienda"} onClick={goHome} icon={<CatHomeIcon />} label="Inicio" />
            <NavBtn onClick={goSearch} icon={<CatSearchIcon />} label="Búsqueda" />
            <NavBtn onClick={() => setShipInfo(true)} icon={<TruckIcon />} label="Envíos a todo el Perú" />
          </div>
          <span className="glow-nav-sep" aria-hidden="true" />
          {/* 2 · lo personal: favoritos y cuenta (con su Michi-crédito) */}
          <button className="glow-heart-btn" onClick={() => openPanel("favoritos")} aria-label={`Mis favoritos (${favCount})`} title="Mis favoritos" style={{ color: C.roseDeep }}>
            <HeartIcon filled={favCount > 0} size={19} />
            {favCount > 0 && <span key={favCount} className="glow-heart-count" style={{ background: C.aubergine }}>{favCount}</span>}
          </button>
          {customer ? (
            <div className="glow-account">
              <button className="glow-hello" onClick={() => setMenuOpen((v) => !v)} aria-haspopup="menu" aria-expanded={menuOpen} title="Tu cuenta">
                <span className="glow-hello-lines">
                  <span className="glow-hello-text">Holiiii, <b>{customer.name}</b></span>
                  {wallet?.balance > 0 && (
                    <span className="glow-hello-credit">
                      <CreditCoin size={14} /> {money(wallet.balance)} de crédito
                      {wallet.expiresAt && <em> · {timeLeft(wallet.expiresAt).split(" ").slice(0, 2).join(" ")}</em>}
                    </span>
                  )}
                </span>
                <CatAvatar customer={customer} />
                {wallet?.balance > 0 && <span className="glow-avatar-dot" aria-hidden="true" />}
              </button>
              {menuOpen && <AccountMenu customer={customer} onPick={openPanel} onLogout={logout} onClose={() => setMenuOpen(false)} />}
            </div>
          ) : (
            (googleClientId || TEST_MODE) && view === "shop" && (
              <button className="glow-join-btn" onClick={() => setJoinOpen(true)} style={{ background: C.aubergine }}>
                <PawIcon /> <span className="glow-mode-label">Únete</span>
              </button>
            )
          )}
        </nav>
      </header>

      {shipInfo && <ShippingInfo settings={settings} onClose={() => setShipInfo(false)} />}
      {claimOpen && view === "shop" && <ClaimModal credit={claimOpen} onClaim={claim} onClose={closeClaim} />}
      {expToast && wallet?.balance > 0 && (
        <div className="glow-toast" role="status">
          ⏰ <span>¡Tu <b>Michi-crédito de {money(wallet.balance)}</b> vence en <b>{timeLeft(wallet.expiresAt)}</b>! Úsalo en tu próxima compra desde S/ {CREDIT_MIN}.</span>
          <button onClick={() => { setExpToast(false); try { sessionStorage.setItem("glow:vence-visto", "1"); } catch { /* sin almacenamiento */ } }} aria-label="Cerrar"><X size={16} /></button>
        </div>
      )}
      {joinOpen && <JoinModal googleClientId={googleClientId} onClose={() => setJoinOpen(false)} onJoined={onJoined} />}

      {view === "shop" ? (
        <Shop
          products={products}
          settings={settings}
          favs={favs}
          onToggleFav={toggleFav}
          panel={panel}
          onPanel={setPanel}
          customer={customer}
          onCustomer={onCustomer}
          onJoin={googleClientId || TEST_MODE ? () => { setPanel(null); setJoinOpen(true); } : null}
          accountPage={page === "cuenta" && !!customer}
          wallet={wallet}
          onClaimCredit={(c) => setClaimOpen(c)}
          season={season}
          world={world}
          onWorld={(w) => { setWorld(w); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        />
      ) : (
        <Admin
          onAuthed={onAdminAuthed}
          products={products}
          settings={settings}
          onSaveProduct={saveProduct}
          onRemoveProduct={removeProduct}
          onSaveSettings={saveSettings}
          onSaveSeasons={async (v) => setSettings(await updateSeasons(v))}
          onImportFromBrowser={importFromBrowser}
        />
      )}

      {/* Asistente de la tienda (solo para los clientes, no en el panel). */}
      {view === "shop" && <ChatBot products={products} settings={settings} />}
      {season?.key === "halloween" && view === "shop" && <HalloweenFlock />}
    </div>
  );
}

// Nombre de la tienda: "Glow" en letra script con degradado brillante y
// "by Rosalía" en cursiva debajo. Si el nombre no lleva " by ", va entero.
function BrandName({ name, onClick, season }) {
  const [main, sub] = name.split(/\s+by\s+/i);
  return (
    <button type="button" className="glow-brand" aria-label={`${name} · ir al inicio`} title="Ir al inicio" onClick={onClick}>
      <span className="glow-brand-main">
        {season?.key === "halloween" && <span className="glow-brand-hat" aria-hidden="true" dangerouslySetInnerHTML={{ __html: WITCH_HAT }} />}
        {main}
      </span>
      <Sparkle style={{ position: "static", width: 14, color: C.gold, alignSelf: "flex-start" }} />
      {sub && <span className="glow-brand-sub" style={{ color: C.roseDeep }}>by {sub}</span>}
    </button>
  );
}

function TruckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 6h11v10H2zM13 9h4.5l3.5 3.5V16h-8" />
      <circle cx="6" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" />
    </svg>
  );
}

/* ---------- Horarios de entrega en Juliaca ---------- */
const DAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
// Horas elegibles en el panel: de 6:00 a. m. a 10:00 p. m., cada 30 min.
const HALF_HOURS = Array.from({ length: 33 }, (_, k) => `${String(6 + Math.floor(k / 2)).padStart(2, "0")}:${k % 2 ? "30" : "00"}`);
const hour12 = (t) => {
  const [h, m] = t.split(":").map(Number);
  const suf = h < 12 ? "a. m." : h === 12 && m === 0 ? "m." : "p. m.";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${suf}`;
};
// "Lun a Sáb · 4:00 p. m. – 7:00 p. m."
function scheduleText(p) {
  const d = [...(p.days || [])].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)); // lunes primero
  let days = d.map((x) => DAY_SHORT[x]).join(", ");
  const seq = d.map((x) => (x + 6) % 7);
  if (d.length > 2 && seq.every((x, i) => i === 0 || x === seq[i - 1] + 1)) days = `${DAY_SHORT[d[0]]} a ${DAY_SHORT[d[d.length - 1]]}`;
  if (d.length === 7) days = "Todos los días";
  return `${days} · ${hour12(p.from)} – ${hour12(p.to)}`;
}
const ymd = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
// Próximos días con atención en ese punto (hasta 10 fechas en 3 semanas).
function nextDates(p) {
  const out = [];
  const now = new Date();
  for (let i = 0; i < 21 && out.length < 10; i++) {
    const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    if (p.days.includes(dt.getDay()) && slotsFor(p, ymd(dt)).length) out.push(dt);
  }
  return out;
}
// Horas cada 30 min dentro del horario; si es hoy, solo desde dentro de 1 hora.
function slotsFor(p, date) {
  const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const now = new Date();
  const isToday = date === ymd(now);
  const minNow = now.getHours() * 60 + now.getMinutes() + 60;
  const out = [];
  for (let m = toMin(p.from); m < toMin(p.to); m += 30) {
    if (isToday && m < minNow) continue;
    out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return out;
}
function whenText(date, time) {
  if (!date) return "";
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${dt.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })} · ${hour12(time)}`;
}

// Ventanita pública: puntos de encuentro en Juliaca y tarifas Shalom.
function ShippingInfo({ settings, onClose }) {
  const cfg = settings.shipping || { juliacaPoints: [], defaultRate: 0, rates: {} };
  const [deps, setDeps] = useState([]);
  useEffect(() => {
    getConfig().then((c) => setDeps(c.departments || [])).catch(() => {});
  }, []);
  const rate = (d) => {
    const r = cfg.rates?.[d];
    return r !== "" && r != null && Number.isFinite(Number(r)) ? Number(r) : cfg.defaultRate;
  };
  return (
    <div className="glow-modal-bg" onClick={onClose}>
      <div className="glow-ship" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Envíos">
        <button className="glow-join-x" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        <h3>🚚 Envíos a todo el Perú</h3>

        <div className="glow-ship-sec">
          <h4>📍 Juliaca · <span className="glow-free">ENTREGA GRATIS</span></h4>
          <p className="glow-ship-sub">Al pagar eliges el punto, el día y la hora exacta:</p>
          {cfg.juliacaPoints.map((p) => (
            <div key={p.name} className="glow-ship-point">
              <b>{p.name}</b>
              <span>🕒 {scheduleText(p)}</span>
            </div>
          ))}
        </div>

        <div className="glow-ship-sec">
          <h4>📦 Resto del Perú · por Shalom</h4>
          <p className="glow-ship-sub">Recoges en la agencia Shalom que elijas, con tu DNI. Al pagar te pedimos nombres completos, DNI, celular y agencia. Costo por departamento:</p>
          <div className="glow-ship-table">
            {deps.map((d) => (
              <div key={d} className={d === "Puno" ? "is-home" : ""}>
                <span>{d}</span><b>{money(rate(d))}</b>
              </div>
            ))}
          </div>
          <p className="glow-ship-sub" style={{ marginTop: 10 }}>El envío se suma al total al pagar. Los Michipuntos se calculan sin el envío.</p>
        </div>
      </div>
    </div>
  );
}

function PawIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 40 40" fill="currentColor" aria-hidden="true">
      <ellipse cx="20" cy="27" rx="9" ry="7.5" /><ellipse cx="9" cy="17" rx="4" ry="5" /><ellipse cx="16" cy="10" rx="4" ry="5" /><ellipse cx="24" cy="10" rx="4" ry="5" /><ellipse cx="31" cy="17" rx="4" ry="5" />
    </svg>
  );
}

// Íconos gatunos de la barra (mismo trazo que lucide).
function CatHomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 21V11L4 3.5L9 7h6l5-3.5L19 11v10z" />
      <path d="M10 21v-4a2 2 0 0 1 4 0v4" />
      <path d="M1.5 13.5H5M1.5 16.5L5 15.5M22.5 13.5H19M22.5 16.5L19 15.5" />
    </svg>
  );
}
function CatSearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5.3 7.2L4.6 2.6L8.6 4.9" />
      <path d="M14.7 7.2L15.4 2.6L11.4 4.9" />
      <circle cx="10" cy="11" r="6.3" />
      <path d="M9 11.2h2l-1 1.2z" fill="currentColor" strokeWidth="1.2" />
      <path d="M14.6 15.6L21 22" />
    </svg>
  );
}

// Marca simple para los botones de Yape (no es el logo oficial).
function YapeMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="5" fill="currentColor" opacity=".25" />
      <path d="M8 8.5l3.2 4.2L14.6 8.5M11.2 12.7V16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="17.5" cy="15" r="1.4" fill="currentColor" />
    </svg>
  );
}

// Botón de la barra superior. "round" = solo ícono (el candado del panel).
function NavBtn({ active, onClick, icon, label, round }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={round ? "glow-nav-btn is-round" : "glow-nav-btn"}
      style={{
        background: active || round ? C.surface : "transparent",
        color: active || round ? C.roseDeep : C.ink,
        boxShadow: active || round ? "0 2px 8px rgba(214,53,127,0.15)" : "none",
      }}
    >
      {icon}
      {!round && <span className="glow-mode-label">{label}</span>}
    </button>
  );
}

// Galería del producto: muestra varias imágenes con flechas para cambiarlas.
// La imagen llena el recuadro (sin desbordarse). Si una URL falla, se descarta;
// si fallan todas, muestra un marcador "sin foto".
function ProductGallery({ images = [], alt, size = 52 }) {
  const [idx, setIdx] = useState(0);
  const [broken, setBroken] = useState({});
  const valid = images.filter((u) => u && !broken[u]);

  if (valid.length === 0) return <NoPhoto size={size} />;

  const cur = ((idx % valid.length) + valid.length) % valid.length; // rota en círculo
  const src = valid[cur];
  const go = (e, d) => { e.stopPropagation(); setIdx((i) => i + d); };

  const arrow = (side) => ({
    position: "absolute", top: "50%", [side]: 6, transform: "translateY(-50%)",
    width: 28, height: 28, borderRadius: 999, border: "none", cursor: "pointer", padding: 0,
    display: "grid", placeItems: "center", color: C.ink,
    background: "#ffffffcc", boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
  });

  return (
    <>
      <img
        src={src}
        alt={alt}
        onError={() => setBroken((b) => ({ ...b, [src]: true }))}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
      {valid.length > 1 && (
        <>
          <button onClick={(e) => go(e, -1)} aria-label="Imagen anterior" style={arrow("left")}>
            <ChevronLeft size={18} />
          </button>
          <button onClick={(e) => go(e, 1)} aria-label="Imagen siguiente" style={arrow("right")}>
            <ChevronRight size={18} />
          </button>
        </>
      )}
    </>
  );
}

// Miniatura cuadrada (carrito y panel): foto real o marcador "sin foto".
function Thumb({ src, alt, size }) {
  return (
    <div style={{ position: "relative", flexShrink: 0, width: size, height: typeof size === "number" ? size : "auto", aspectRatio: "1 / 1", borderRadius: 10, overflow: "hidden", display: "grid", placeItems: "center", background: C.blush }}>
      <SingleImage src={src} alt={alt} size={typeof size === "number" ? size * 0.6 : 40} fit="cover" />
    </div>
  );
}

// Marcador discreto para productos que aún no tienen foto.
function NoPhoto({ size = 52 }) {
  return <ImageIcon size={Math.round(size * 0.7)} color={C.rose} strokeWidth={1.4} aria-label="Sin foto" />;
}

// Imagen única (primera foto del producto) con marcador si no hay foto.
// fit="contain" muestra la foto completa; fit="cover" la usa de fondo a sangre.
function SingleImage({ src, alt, size = 64, fit = "contain" }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    if (fit === "cover") {
      return (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: `linear-gradient(135deg, ${C.blush}, ${C.bg})` }}>
          <NoPhoto size={size} />
        </div>
      );
    }
    return <NoPhoto size={size} />;
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: fit }}
    />
  );
}

/* ---------- Halloween ----------
   Decoración tenue: telarañas en las esquinas de la portada, una arañita que
   se mece, murciélagos que cruzan despacio y una franja con calaveritas de
   michi. No tapa fotos ni botones (pointer-events: none). */
const HALLOWEEN = {
  web: webSvg(),
  cardWeb: webSvg("#3B2146", 0.22),
  bandWeb: webSvg("#FFFFFF", 0.22),
  skull: catSkullSvg(),
  skull2: catSkullSvg("#F6EEF8"),
  bat: batSvg("#3B2146", 0.45),
  bat2: batSvg("#742284", 0.35),
  batLight: batSvg("#FFB3D0", 0.7),
  batDark: batSvg("#2A1630", 0.8),

  candies: ["#F26D9C", "#F7A440", "#B48BE0", "#7BC67E"].map(candySvg),
};

// Gatito negro que pasea de ida y vuelta por la cabecera.
function HalloweenCat() {
  return <span className="glow-hw-cat" aria-hidden="true"><span dangerouslySetInnerHTML={{ __html: BLACK_CAT }} /></span>;
}

// Bandada de murciélagos que cruza la pantalla de vez en cuando.
function HalloweenFlock() {
  return (
    <div className="glow-hw-flock" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => svg(HALLOWEEN.batDark, `glow-hw-flock-bat is-${i}`, null, i))}
    </div>
  );
}
const svg = (html, className, style, key) => <span key={key} className={className} style={style} aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />;

function HalloweenHero() {
  return (
    <div className="glow-hw-hero" aria-hidden="true">
      {svg(HALLOWEEN.web, "glow-hw-web is-left")}
      {svg(HALLOWEEN.web, "glow-hw-web is-right")}
      {svg(SPIDER, "glow-hw-spider")}
      {svg(HALLOWEEN.bat, "glow-hw-bat is-1")}
      {svg(HALLOWEEN.bat2, "glow-hw-bat is-2")}
      {svg(HALLOWEEN.bat, "glow-hw-bat is-3")}
      {svg(MOON, "glow-hw-moon")}
      {[0, 1, 2].map((i) => svg(GHOST, `glow-hw-ghost is-${i}`, null, i))}
      <span className="glow-hw-fog is-1" />
      <span className="glow-hw-fog is-2" />
    </div>
  );
}

function HalloweenBand({ season, onGo }) {
  return (
    <section className="glow-hw-band">
      {svg(HALLOWEEN.bandWeb, "glow-hw-band-web")}
      {svg(HALLOWEEN.skull, "glow-hw-skull is-1")}
      {svg(PUMPKIN, "glow-hw-pumpkin")}
      <div className="glow-hw-band-text">
        <b>{season.title} 🎃</b>
        <span>{season.text}</span>
      </div>
      <button onClick={onGo}>{season.cta} <ChevronRight size={16} /></button>
      {svg(HALLOWEEN.skull2, "glow-hw-skull is-2")}
      {svg(HALLOWEEN.batLight, "glow-hw-band-bat")}
      {HALLOWEEN.candies.map((c, i) => svg(c, `glow-hw-candy is-${i}`, null, i))}
    </section>
  );
}

// Sección "Más vendidos": carrusel que avanza solo y se pausa al pasar el mouse.
function BestSellers({ products, onAdd, favs = [], onToggleFav }) {
  const featured = products.filter((p) => p.bestSeller);
  const items = featured.length ? featured : products.slice(0, 5);
  const n = items.length;
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || n <= 1) return;
    const t = setInterval(() => setIdx((i) => i + 1), 4000);
    return () => clearInterval(t);
  }, [paused, n]);

  if (n === 0) return null;
  const cur = ((idx % n) + n) % n;
  const p = items[cur];
  const out = p.stock <= 0;

  const arrow = (side) => ({
    position: "absolute", top: "50%", [side]: 10, transform: "translateY(-50%)", zIndex: 2,
    width: 36, height: 36, borderRadius: 999, border: "none", cursor: "pointer", padding: 0,
    display: "grid", placeItems: "center", color: C.ink,
    background: "#ffffffdd", boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
  });

  return (
    <section
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{ background: C.blush, padding: "44px 20px 56px" }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 600, textAlign: "center", margin: "0 0 4px" }}>
          Más vendidos
        </h2>
        <p className="glow-soft" style={{ textAlign: "center", fontSize: 19, margin: "0 0 22px" }}>Los favoritos de la tienda</p>

        <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", background: C.surface, border: `1px solid ${C.line}`, display: "flex", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1 1 280px", minHeight: 260, background: `linear-gradient(135deg, ${C.blush}, ${C.bg})`, display: "grid", placeItems: "center" }}>
            <SingleImage src={p.images?.[0]} alt={p.name} size={72} fit="cover" />
            {onToggleFav && <FavButton active={favs.includes(p.id)} onClick={() => onToggleFav(p.id)} style={{ top: 12, right: 12 }} />}
          </div>
          <div style={{ flex: "1 1 280px", padding: 28, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <p className="glow-card-cat" style={{ color: C.antique, fontSize: 12 }}>{p.category}</p>
            <h3 className="glow-name" style={{ fontSize: 30, color: C.aubergine, margin: "4px 0 8px" }}>{p.name}</h3>
            <p className="glow-soft" style={{ fontSize: 18, margin: "0 0 18px" }}>{p.desc}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: C.aubergine }}>{money(p.price)}</span>
              <button
                disabled={out}
                onClick={() => onAdd(p)}
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "10px 18px", borderRadius: 12, fontSize: 14, fontWeight: 600, border: "none",
                  background: out ? C.line : C.primary, color: out ? C.inkSoft : C.primaryInk, cursor: out ? "not-allowed" : "pointer",
                }}
              >
                <ShoppingCart size={16} /> {out ? "Agotado" : "Añadir al carrito"}
              </button>
            </div>
          </div>

          {n > 1 && (
            <>
              <button onClick={() => setIdx((i) => i - 1)} aria-label="Anterior" style={arrow("left")}><ChevronLeft size={20} /></button>
              <button onClick={() => setIdx((i) => i + 1)} aria-label="Siguiente" style={arrow("right")}><ChevronRight size={20} /></button>
            </>
          )}
        </div>

        {n > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Ir al producto ${i + 1}`}
                style={{ width: i === cur ? 22 : 8, height: 8, borderRadius: 999, border: "none", padding: 0, cursor: "pointer", background: i === cur ? C.roseDeep : "#0000001a", transition: "width .2s" }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// Collage de fotos reales para la portada: una foto grande y hasta dos
// pequeñas superpuestas, con marco blanco y sombra suave.
function HeroCollage({ imgs, variant, picks, active, world = "michi" }) {
  const [main, ...rest] = imgs;
  const photo = (src, cls) => (
    <div className={`glow-hero-photo ${cls}`}>
      <img src={src} alt="" loading="lazy" />
    </div>
  );
  return (
    <div className="glow-hero-collage">
      {main && photo(main, "is-main")}
      {rest[0] && photo(rest[0], "is-a")}
      {rest[1] && photo(rest[1], "is-b")}
      <Sparkle style={{ top: "-4%", left: "2%", width: 26, color: C.gold }} />
      <Sparkle style={{ top: "44%", right: "-5%", width: 18, color: C.rose, animationDelay: "1.2s" }} />
      <Sparkle style={{ bottom: "20%", left: "40%", width: 14, color: "#fff", animationDelay: "2.1s" }} />
      <CatMascot variant={variant} picks={picks} active={active} art={world === "skin" ? SPA_ROSALIA : world === "kids" ? GUIDES.cuyito.art : null} say={WORLD_HERO[world]?.say} />
    </div>
  );
}

// Rosalía, la gatita de la tienda (SVG realista, animado con CSS). Es una
// calico atigrada: cara blanca con gorro atigrado asimétrico, ojos dorado-oliva,
// y en el cuerpo manchas naranja, negra y atigrada. En cada diapositiva lleva el
// accesorio de esa categoría. Parpadea, mueve una oreja, ladea la cabeza y la cola.
const ROS = {
  white: "#FBF8F5", shade: "#E6DDD6", tabby: "#7E664F", tabbyLight: "#A88A68",
  stripe: "#2F2620", orange: "#D98A4A", orangeLight: "#E9A76A", black: "#26211F",
  earIn: "#E9AFAB", earInDeep: "#C98B8A", irisIn: "#DCC258", irisOut: "#8D8534",
  noseDeep: "#D48489", line: "#3A2E2A",
};

// Textura de pelo: trazos cortos que salen desde un punto, con semilla fija
// (se calculan una sola vez y siempre salen iguales).
function furPath(n, [bx, by, bw, bh], [fx, fy], seed, [l0, l1] = [3, 7]) {
  let s = seed;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  let d = "";
  for (let i = 0; i < n; i++) {
    const x = bx + r() * bw, y = by + r() * bh;
    const a = Math.atan2(y - fy, x - fx) + (r() - 0.5) * 0.5;
    const L = l0 + r() * (l1 - l0);
    d += `M${x.toFixed(1)} ${y.toFixed(1)}l${(Math.cos(a) * L).toFixed(1)} ${(Math.sin(a) * L).toFixed(1)}`;
  }
  return d;
}
const FUR = {
  earL: furPath(26, [68, 16, 20, 30], [70, 50], 11, [5, 10]),
  earR: furPath(26, [112, 16, 20, 30], [130, 50], 12, [5, 10]),
  capDark: furPath(170, [55, 30, 95, 62], [100, 100], 3),
  capLight: furPath(120, [60, 30, 85, 60], [100, 100], 7, [3, 6]),
  face: furPath(160, [60, 60, 82, 60], [100, 96], 5, [3, 6]),
  orange: furPath(60, [38, 114, 40, 42], [58, 110], 21, [3, 6]),
  body: furPath(240, [44, 112, 112, 122], [100, 150], 9, [4, 8]),
  chest: furPath(44, [78, 116, 44, 36], [100, 110], 17, [6, 11]),
};

const HEAD = "M60 72 C58 50 73 33 100 31 C127 33 142 50 140 72 C145 90 137 106 122 115 C111 121 89 121 78 115 C63 106 55 90 60 72 Z";
const BODY = "M70 108 C50 122 40 152 42 184 C44 212 60 230 84 234 H116 C140 230 156 212 158 184 C160 152 150 122 130 108 Z";

function CatArt({ variant }) {
  const u = useId().replace(/:/g, "");
  const sweater = variant === "Ropa";
  const pawUp = variant === "Anillos" || variant === "Llaveros";
  const ear = (d) => <path d={d} fill={`url(#tb${u})`} />;
  return (
    <>
      <defs>
        <clipPath id={`hc${u}`}><path d={HEAD} /></clipPath>
        <clipPath id={`bc${u}`}><path d={BODY} /></clipPath>
        <radialGradient id={`hs${u}`} cx="50%" cy="58%" r="62%"><stop offset=".55" stopColor={ROS.white} /><stop offset="1" stopColor={ROS.shade} /></radialGradient>
        <radialGradient id={`bs${u}`} cx="50%" cy="40%" r="65%"><stop offset=".5" stopColor={ROS.white} /><stop offset="1" stopColor={ROS.shade} /></radialGradient>
        <radialGradient id={`ir${u}`} cx="50%" cy="50%" r="55%"><stop offset="0" stopColor={ROS.irisIn} /><stop offset=".75" stopColor={ROS.irisOut} /><stop offset="1" stopColor="#3F3A18" /></radialGradient>
        <linearGradient id={`ei${u}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={ROS.earInDeep} /><stop offset="1" stopColor={ROS.earIn} /></linearGradient>
        <linearGradient id={`tb${u}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={ROS.tabby} /><stop offset="1" stopColor={ROS.tabbyLight} /></linearGradient>
        <linearGradient id={`og${u}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={ROS.orangeLight} /><stop offset="1" stopColor={ROS.orange} /></linearGradient>
        <radialGradient id={`ns${u}`} cx="50%" cy="35%" r="70%"><stop offset="0" stopColor="#F6BDBF" /><stop offset="1" stopColor={ROS.noseDeep} /></radialGradient>
      </defs>

      {/* cola atigrada alrededor de las patas */}
      <g className="glow-cat-tail">
        <path d="M146 224 C172 224 188 208 184 188 C182 178 174 174 170 180 C176 192 168 210 142 212 Z" fill={ROS.tabby} />
        <path d="M156 212 L160 222 M168 206 L176 214 M176 194 L184 196" stroke={ROS.stripe} strokeWidth="3" strokeLinecap="round" opacity=".85" />
      </g>

      {/* cuerpo gordito */}
      <path d={BODY} fill={sweater ? C.rose : `url(#bs${u})`} />
      <g clipPath={`url(#bc${u})`}>
        {sweater ? (
          <>
            {[[64, 140], [100, 132], [136, 142], [58, 180], [96, 172], [140, 184], [74, 212], [124, 214]].map(([x, y], k) => (
              <g key={k} fill="#fff">
                <circle cx={x - 3.5} cy={y} r="3.2" /><circle cx={x + 3.5} cy={y} r="3.2" />
                <circle cx={x} cy={y - 3.5} r="3.2" /><circle cx={x} cy={y + 3.5} r="3.2" />
                <circle cx={x} cy={y} r="2.4" fill={C.gold} />
              </g>
            ))}
            <path d="M44 150 Q100 166 156 150" stroke="#fff" strokeWidth="3" strokeDasharray="1 7" strokeLinecap="round" fill="none" />
          </>
        ) : (
          <>
            <path d="M36 120 C52 108 76 114 78 134 C78 152 58 158 40 152 Z" fill={`url(#og${u})`} />
            <path d={FUR.orange} stroke="#B86E34" strokeWidth=".8" strokeLinecap="round" opacity=".5" fill="none" />
            <path d="M122 114 C144 110 162 128 160 156 C148 164 130 156 120 138 Z" fill={ROS.black} />
            <path d="M130 170 C148 166 162 190 156 216 C142 222 128 206 126 188 Z" fill={ROS.tabby} />
            <path d="M134 178 C140 180 146 180 152 178 M132 190 C138 192 146 192 152 190" stroke={ROS.stripe} strokeWidth="2.4" fill="none" opacity=".8" />
            <path d="M144 170 C150 172 154 178 154 184" stroke={ROS.orange} strokeWidth="5" opacity=".5" fill="none" />
            <path d={FUR.body} stroke="#DDD4CC" strokeWidth=".8" strokeLinecap="round" opacity=".35" fill="none" />
          </>
        )}
      </g>
      {!sweater && <path d={FUR.chest} stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity=".95" fill="none" />}

      {/* patas delanteras */}
      <path d="M78 142 C76 174 76 202 78 228 H97 C98 202 98 174 97 142 Z" fill={ROS.white} />
      {!pawUp && <path d="M103 142 C102 174 102 202 103 228 H122 C124 202 124 174 122 142 Z" fill={ROS.white} />}
      <path d={pawUp ? "M97 152 C98 182 98 206 97 228" : "M97 152 C98 182 98 206 97 228 M103 152 C102 182 102 206 103 228"} stroke={ROS.shade} strokeWidth="2" fill="none" />
      <ellipse cx="87" cy="230" rx="12.5" ry="7" fill={ROS.white} />
      {!pawUp && <ellipse cx="113" cy="230" rx="12.5" ry="7" fill={ROS.white} />}
      <path d={pawUp ? "M82 232 V236 M87 232 V237 M92 232 V236" : "M82 232 V236 M87 232 V237 M92 232 V236 M108 232 V236 M113 232 V237 M118 232 V236"} stroke={ROS.shade} strokeWidth="1.3" />

      {/* collar de la tienda (en Collares lleva su cadenita con dije) */}
      {variant !== "Collares" && (
        <>
          <path d="M72 113 Q100 127 128 113" stroke={C.primary} strokeWidth="6" strokeLinecap="round" fill="none" />
          <g className="glow-acc-swing" style={{ transformOrigin: "100px 121px" }}>
            <circle cx="100" cy="129" r="7" fill={C.gold} stroke="#B8861C" strokeWidth="1.6" />
            <circle cx="97.5" cy="126.5" r="1.8" fill="#fff" opacity=".8" />
          </g>
        </>
      )}
      {variant === "Collares" && (
        <>
          <path d="M72 113 Q100 129 128 113" stroke={C.gold} strokeWidth="2.6" strokeDasharray="2 2.6" strokeLinecap="round" fill="none" />
          <g className="glow-acc-swing" style={{ transformOrigin: "100px 121px" }}>
            <path d="M100 121 V126" stroke={C.gold} strokeWidth="2.4" />
            <path d="M100 131 C93 124 86 130 100 144 C114 130 107 124 100 131 Z" fill={C.primary} stroke="#B01E62" strokeWidth="1.6" />
            <circle cx="95" cy="130" r="2" fill="#fff" opacity=".85" />
          </g>
        </>
      )}

      {/* patita levantada (anillo / llavero) */}
      {pawUp && (
        <g className="glow-cat-wave">
          <path d="M112 150 C122 140 138 126 146 112" stroke={ROS.shade} strokeWidth="21" strokeLinecap="round" fill="none" />
          <path d="M112 150 C122 140 138 126 146 112" stroke={ROS.white} strokeWidth="18" strokeLinecap="round" fill="none" />
          <ellipse cx="148" cy="106" rx="11" ry="9.5" fill={ROS.white} stroke={ROS.shade} strokeWidth="1.4" />
          <path d="M142 101 V97 M148 99 V95 M154 101 V97" stroke={ROS.shade} strokeWidth="1.3" />
          {variant === "Anillos" && (
            <>
              <ellipse cx="148" cy="114" rx="9" ry="3.4" fill="none" stroke={C.gold} strokeWidth="3.4" />
              <path d="M148 104 L153 109 L148 114 L143 109 Z" transform="translate(0 -1)" fill="#BFE9FF" stroke="#6BA6C4" strokeWidth="1.3" />
            </>
          )}
          {variant === "Llaveros" && (
            <g className="glow-acc-swing" style={{ transformOrigin: "148px 114px" }}>
              <circle cx="148" cy="122" r="7.5" fill="none" stroke={C.gold} strokeWidth="3" />
              <path d="M148 129.5 V135" stroke={C.gold} strokeWidth="2.4" />
              <circle cx="148" cy="143" r="8" fill={C.primary} stroke="#B01E62" strokeWidth="1.6" />
              <path d="M144 141 L146 137.5 L148 141 M148 141 L150 137.5 L152 141" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
            </g>
          )}
        </g>
      )}

      {/* bolso delante de las patitas */}
      {variant === "Bolsos" && (
        <g className="glow-acc-swing" style={{ transformOrigin: "100px 186px" }}>
          <path d="M84 204 Q84 186 100 186 Q116 186 116 204" fill="none" stroke="#B01E62" strokeWidth="3.4" />
          <rect x="74" y="200" width="52" height="34" rx="9" fill={C.primary} stroke="#B01E62" strokeWidth="2" />
          <path d="M74 212 H126" stroke="#B01E62" strokeWidth="1.6" opacity=".5" />
          <circle cx="100" cy="212" r="4" fill={C.gold} stroke="#B8861C" strokeWidth="1.4" />
        </g>
      )}

      {/* cabeza */}
      <g className="glow-cat-head">
        <g className="glow-cat-ear">
          {ear("M68 60 C62 40 61 20 67 6 C79 14 92 27 96 38 Z")}
          <path d="M71 50 C68 36 68 23 71 14 C80 22 87 30 90 39 Z" fill={`url(#ei${u})`} />
          <path d={FUR.earL} stroke="#fff" strokeWidth=".8" strokeLinecap="round" opacity=".8" fill="none" />
          <path d="M67 6 C63 14 62 26 64 38" stroke={ROS.orange} strokeWidth="3" opacity=".35" fill="none" />
        </g>
        {ear("M132 60 C138 40 139 20 133 6 C121 14 108 27 104 38 Z")}
        <path d="M129 50 C132 36 132 23 129 14 C120 22 113 30 110 39 Z" fill={`url(#ei${u})`} />
        <path d={FUR.earR} stroke="#fff" strokeWidth=".8" strokeLinecap="round" opacity=".8" fill="none" />

        <path d={HEAD} fill={`url(#hs${u})`} />
        <g clipPath={`url(#hc${u})`}>
          {/* gorro atigrado asimétrico con la franja blanca */}
          <path d="M50 20 H150 V60 C144 66 137 68 131 67 C125 65 119 63 113 61 C109 55 106 49 103 44 C99 45 95 48 92 53 C88 58 86 64 88 72 C88 82 82 90 74 94 C66 97 58 95 50 90 Z" fill={`url(#tb${u})`} />
          <path d="M52 64 C58 70 64 80 68 92" stroke={ROS.tabbyLight} strokeWidth="6" opacity=".5" fill="none" />
          <g stroke={ROS.stripe} strokeLinecap="round" fill="none" opacity=".85">
            <path d="M77 40 C79 47 82 52 85 57" strokeWidth="2.6" />
            <path d="M86 36 C87 42 89 47 91 51" strokeWidth="2.4" />
            <path d="M94 34 C95 38 96 42 97 45" strokeWidth="2" />
            <path d="M123 40 C121 47 118 52 115 57" strokeWidth="2.6" />
            <path d="M114 36 C113 42 111 47 109 51" strokeWidth="2.4" />
            <path d="M106 34 C105 38 104 42 103 45" strokeWidth="2" />
            <path d="M58 70 C63 72 68 72 72 70" strokeWidth="2.6" />
            <path d="M59 79 C63 81 67 81 70 79" strokeWidth="2.2" />
            <path d="M134 58 C130 61 126 62 122 61" strokeWidth="2.4" />
          </g>
          <path d={FUR.capDark} stroke={ROS.stripe} strokeWidth=".8" strokeLinecap="round" opacity=".35" fill="none" />
          <path d={FUR.capLight} stroke={ROS.tabbyLight} strokeWidth=".7" strokeLinecap="round" opacity=".5" fill="none" />
          <path d={FUR.face} stroke="#D9CFC7" strokeWidth=".7" strokeLinecap="round" opacity=".28" fill="none" />
          <path d="M60 50 C64 44 70 42 74 44 C70 50 66 54 60 56 Z" fill={ROS.orange} opacity=".45" />
        </g>

        {/* ojos dorado-oliva, mirada serena */}
        <g className="glow-cat-eyes">
          <path d="M70 77 C73 68 88 67 95 75 C90 84 76 85 70 77 Z" fill={`url(#ir${u})`} />
          <ellipse cx="83" cy="76.5" rx="3.2" ry="5.6" fill="#15110E" />
          <circle cx="86" cy="73.5" r="1.6" fill="#fff" opacity=".9" />
          <path d="M70 77 C73 68 88 67 95 75 C90 84 76 85 70 77 Z" fill="none" stroke={ROS.line} strokeWidth="1.8" />
          <path d="M130 77 C127 68 112 67 105 75 C110 84 124 85 130 77 Z" fill={`url(#ir${u})`} />
          <ellipse cx="117" cy="76.5" rx="3.2" ry="5.6" fill="#15110E" />
          <circle cx="120" cy="73.5" r="1.6" fill="#fff" opacity=".9" />
          <path d="M130 77 C127 68 112 67 105 75 C110 84 124 85 130 77 Z" fill="none" stroke={ROS.line} strokeWidth="1.8" />
        </g>
        <path d="M69.5 76 C73 67.5 88 66.5 95.5 74 M130.5 76 C127 67.5 112 66.5 104.5 74" stroke={ROS.line} strokeWidth="1.8" fill="none" strokeLinecap="round" />

        {/* cachetes, hocico, nariz, boca y bigotes */}
        <ellipse cx="91" cy="105" rx="10" ry="7" fill="#fff" />
        <ellipse cx="109" cy="105" rx="10" ry="7" fill="#fff" />
        <path d="M100 82 C98 88 97 92 96 94 M100 82 C102 88 103 92 104 94" stroke="#DED4CC" strokeWidth="1.2" fill="none" />
        <path d="M94.5 93 C96 90.5 104 90.5 105.5 93 C105.5 96 102.5 98.5 100 99.5 C97.5 98.5 94.5 96 94.5 93 Z" fill={`url(#ns${u})`} />
        <path d="M100 99.5 V103.5 M100 103.5 C97.5 107 93.5 107.5 91 105 M100 103.5 C102.5 107 106.5 107.5 109 105" stroke="#9C7475" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <g stroke="#BDB2AA" strokeWidth=".8" strokeLinecap="round" opacity=".9" fill="none">
          <path d="M86 103 C70 99 52 99 34 103" /><path d="M86 106 C70 105 54 107 38 112" /><path d="M87 109 C74 110 60 114 46 121" />
          <path d="M114 103 C130 99 148 99 166 103" /><path d="M114 106 C130 105 146 107 162 112" /><path d="M113 109 C126 110 140 114 154 121" />
        </g>

        {/* aretes colgando de las orejas */}
        {variant === "Aretes" && (
          <>
            <g className="glow-acc-swing" style={{ transformOrigin: "63px 18px" }}>
              <circle cx="63" cy="22" r="3.6" fill="none" stroke={C.gold} strokeWidth="2.2" />
              <path d="M63 25.5 V30" stroke={C.gold} strokeWidth="2" />
              <path d="M63 32 C58 28 55 33 63 41 C71 33 68 28 63 32 Z" fill={C.primary} stroke="#B01E62" strokeWidth="1.4" />
            </g>
            <g className="glow-acc-swing is-late" style={{ transformOrigin: "137px 18px" }}>
              <circle cx="137" cy="22" r="3.6" fill="none" stroke={C.gold} strokeWidth="2.2" />
              <path d="M137 25.5 V30" stroke={C.gold} strokeWidth="2" />
              <path d="M137 32 C132 28 129 33 137 41 C145 33 142 28 137 32 Z" fill={C.primary} stroke="#B01E62" strokeWidth="1.4" />
            </g>
          </>
        )}
      </g>
    </>
  );
}

// Zona que la lupa amplía en cada variante (x y ancho alto, en el viewBox 200×250).
const CAT_ZOOM = {
  intro: "76 106 48 40",
  Collares: "74 108 52 44",
  Aretes: "46 8 36 38",
  Anillos: "126 90 44 40",
  Ropa: "48 128 72 60",
  Llaveros: "126 100 44 56",
  Bolsos: "68 180 64 60",
};
const CAT_SAYS = {
  intro: "¡Hola! Soy Rosalía",
  Collares: "¡Mira mi collar!",
  Aretes: "¡Mis aretes nuevos!",
  Anillos: "¡Brilla, brilla!",
  Ropa: "¿Me veo linda?",
  Llaveros: "¡Nunca pierdo mis llaves!",
  Bolsos: "¡Lista para salir!",
};

function CatMascot({ variant = "intro", picks = [], active = false, art = null, say = "" }) {
  const zoom = CAT_ZOOM[variant] || CAT_ZOOM.intro;
  const [n, setN] = useState(0);

  // Mientras la diapositiva está visible, la lupa va mostrando otro producto.
  useEffect(() => {
    if (!active || picks.length <= 1) return;
    setN(0);
    const t = setInterval(() => setN((i) => i + 1), 2000);
    return () => clearInterval(t);
  }, [active, picks.length]);

  const cur = picks.length ? n % picks.length : 0;
  const p = picks[cur];
  return (
    <div className="glow-cat-wrap" aria-hidden="true">
      {art ? (
        <span className="glow-cat glow-cat-guide" dangerouslySetInnerHTML={{ __html: art }} />
      ) : (
        <svg className="glow-cat" viewBox="0 0 200 250">
          <CatArt variant={variant} />
        </svg>
      )}
      {/* lupa: productos reales de la tienda (o el accesorio ampliado si no hay fotos) */}
      <div className="glow-cat-zoom">
        {picks.length ? (
          picks.map((q, k) => (
            <img key={q.id} src={firstPhoto(q)} alt="" className={k === cur ? "is-on" : ""} />
          ))
        ) : art ? null : (
          <svg viewBox={zoom} preserveAspectRatio="xMidYMid slice">
            <CatArt variant={variant} />
          </svg>
        )}
      </div>
      {p && <span className="glow-cat-price" style={{ background: `var(--wacc, ${C.primary})` }}>{money(p.price)}</span>}
      {[0, 1, 2].map((k) => (
        <svg key={k} className="glow-cat-heart" viewBox="0 0 24 24" style={{ fill: C.primary, animationDelay: `${k * 1.2}s`, left: `${38 + k * 12}%` }}>
          <path d="M12 21 C4 14 2 10 4 6.5 C6 3.5 10 4 12 7 C14 4 18 3.5 20 6.5 C22 10 20 14 12 21 Z" />
        </svg>
      ))}
      <span className="glow-cat-say" style={{ color: `var(--wacc, ${C.roseDeep})` }}>{say || CAT_SAYS[variant] || CAT_SAYS.intro}</span>
    </div>
  );
}

// Estampado gatuno del fondo: carita de michi, huellita, pescadito, ovillo y
// corazón en un mosaico de 140px, en el color de acento de cada diapositiva.
function catPattern(color) {
  const c = encodeURIComponent(color);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140' viewBox='0 0 140 140'>
    <g fill='${c}'>
      <path d='M14 30 L17 16 L25 24 Q30 22 35 24 L43 16 L46 30 Q48 44 30 46 Q12 44 14 30 Z'/>
      <g transform='translate(92 20) rotate(20)'><ellipse cx='0' cy='6' rx='6' ry='5'/><circle cx='-7' cy='-2' r='2.6'/><circle cx='-2.5' cy='-6.5' r='2.6'/><circle cx='2.5' cy='-6.5' r='2.6'/><circle cx='7' cy='-2' r='2.6'/></g>
      <path d='M62 84 Q76 72 90 84 Q76 96 62 84 Z M90 84 L100 76 L100 92 Z'/>
      <path d='M22 108 C22 98 36 98 36 108 C36 118 22 118 22 108 Z M122 104 C118 98 110 101 116 110 L122 116 L128 110 C134 101 126 98 122 104 Z'/>
    </g>
    <g fill='none' stroke='${c}' stroke-width='2'><circle cx='112' cy='60' r='8'/><path d='M105 56 Q112 60 119 56 M104 62 Q112 67 120 62 M120 64 C128 72 124 80 132 82'/></g>
  </svg>`;
  return `url("data:image/svg+xml,${svg.replace(/\s+/g, " ")}")`;
}

// Rastro de huellitas: aparecen una tras otra cruzando el slider, como si un
// gato acabara de pasar caminando.
const TRAIL = Array.from({ length: 12 }, (_, k) => ({
  left: `${3 + k * 8}%`,
  top: `${14 + (k % 2) * 16 + k * 1.2}px`,
  delay: `${k * 0.35}s`,
}));

function PawTrail({ color }) {
  return TRAIL.map((t, k) => (
    <Paw key={k} className="glow-paw-step" style={{ left: t.left, top: t.top, color, animationDelay: t.delay }} />
  ));
}

// Huellita (fondo animado del slider).
function Paw({ style, className = "glow-paw" }) {
  return (
    <svg className={className} viewBox="0 0 40 40" style={style} aria-hidden="true">
      <ellipse cx="20" cy="27" rx="9" ry="7.5" />
      <ellipse cx="9" cy="17" rx="4" ry="5" />
      <ellipse cx="16" cy="10" rx="4" ry="5" />
      <ellipse cx="24" cy="10" rx="4" ry="5" />
      <ellipse cx="31" cy="17" rx="4" ry="5" />
    </svg>
  );
}

// Destello de cuatro puntas (brilla y se apaga).
function Sparkle({ style }) {
  return (
    <svg className="glow-sparkle" viewBox="0 0 24 24" style={style} aria-hidden="true">
      <path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z" />
    </svg>
  );
}

const PAWS = [
  { left: "6%", size: 26, delay: "0s", dur: "11s" },
  { left: "18%", size: 18, delay: "4s", dur: "13s" },
  { left: "34%", size: 22, delay: "7s", dur: "12s" },
  { left: "49%", size: 16, delay: "2s", dur: "14s" },
  { left: "63%", size: 24, delay: "9s", dur: "12s" },
  { left: "88%", size: 20, delay: "5s", dur: "15s" },
];

// Producto estrella de la diapositiva: tarjeta flotante con foto, precio y
// botón para añadirlo directo al carrito.
function HeroStar({ p, onAdd, active, fav, onToggleFav }) {
  const out = p.stock <= 0;
  return (
    <div className="glow-hero-star">
      <span className="glow-hero-star-ribbon" style={{ background: C.gold }}>{p.bestSeller ? "El más vendido" : "Favorito"}</span>
      <div style={{ position: "relative" }}>
        <img src={firstPhoto(p)} alt={p.name} />
        {onToggleFav && <FavButton active={fav} onClick={() => onToggleFav(p.id)} style={{ bottom: 8, right: 8 }} />}
      </div>
      <h4 style={{ color: C.aubergine }}>{p.name}</h4>
      <div className="glow-hero-star-row">
        <span style={{ color: C.aubergine }}>{money(p.price)}</span>
        <button
          disabled={out}
          tabIndex={active ? 0 : -1}
          onClick={() => onAdd(p)}
          style={{ background: out ? C.line : `var(--wacc, ${C.primary})`, color: out ? C.inkSoft : C.primaryInk }}
        >
          {out ? "Agotado" : "Añadir"}
        </button>
      </div>
    </div>
  );
}

// Primera foto subida de cada producto (solo imágenes reales).
const firstPhoto = (p) => (p.images || []).find(Boolean);

// Portada: slider con fotos reales de la tienda. Una diapositiva de bienvenida
// + una por cada categoría que tenga productos. Avanza solo, se pausa al pasar
// el mouse y en el celular se puede deslizar con el dedo.
// Diapositivas de Glow Skin / Glow Kids: presentación y una por categoría.
function worldSlides(world, withPhoto, featured) {
  const W = WORLD_HERO[world];
  const cats = WORLDS[world].cats.filter((c) => withPhoto.some((p) => p.category === c));
  return [
    {
      key: "intro", eyebrow: W.eyebrow, title: W.title, words: W.words, text: W.text, cta: W.cta, action: W.action, cat: "Todos",
      star: featured[0], imgs: featured.slice(1, 4).map(firstPhoto), picks: featured.slice(0, 6), grad: W.grads[0],
    },
    ...cats.map((c, i) => {
      const items = withPhoto.filter((p) => p.category === c);
      const from = Math.min(...items.map((p) => Number(p.price) || 0));
      const star = items.length > 1 ? items.find((p) => p.bestSeller) || items[0] : null;
      const rest = star ? items.filter((p) => p !== star) : items;
      return {
        key: c, eyebrow: `${items.length} ${items.length === 1 ? "producto" : "productos"} · desde ${money(from)}`,
        title: c, words: W.catWords, text: W.text, cta: `Ver ${c.toLowerCase()}`, cat: c,
        star, imgs: (rest.length ? rest : items).slice(0, 3).map(firstPhoto), picks: items, grad: W.grads[(i + 1) % W.grads.length],
      };
    }),
  ];
}

// Burbujitas (Skin) o globitos (Kids) que suben por la portada.
const BALLOON_COLORS = ["#FF9EC4", "#7CC4FF", "#FFE07A", "#9EE6B8"];
function WorldDeco({ world }) {
  if (world === "skin") {
    return Array.from({ length: 14 }, (_, i) => (
      <span key={i} className="glow-wd-bubble" style={{ left: `${(i * 37) % 100}%`, width: 8 + (i % 4) * 7, height: 8 + (i % 4) * 7, animationDuration: `${8 + (i % 5) * 2}s`, animationDelay: `-${i * 1.3}s` }} />
    ));
  }
  return BALLOON_COLORS.concat(BALLOON_COLORS).map((c, i) => (
    <span key={i} className="glow-wd-balloon" style={{ left: `${(i * 29 + 5) % 100}%`, width: 24 + (i % 3) * 8, animationDuration: `${12 + (i % 4) * 3}s`, animationDelay: `-${i * 2.4}s` }}
      dangerouslySetInnerHTML={{ __html: `<svg viewBox="0 0 30 62"><ellipse cx="15" cy="15" rx="13" ry="15" fill="${c}"/><ellipse cx="10" cy="9" rx="3" ry="5" fill="#fff" opacity=".55"/><path d="M15 30 l-2 3 h4z" fill="${c}"/><path d="M15 33 q-4 8 0 14 q4 6 0 13" stroke="#9AA3B0" fill="none"/></svg>` }} />
  ));
}

function HeroSlider({ products, settings, onPickCategory, onAction, onAdd, favs = [], onToggleFav, season, world = "michi" }) {
  const withPhoto = products.filter(firstPhoto);
  const featured = [
    ...withPhoto.filter((p) => p.bestSeller),
    ...withPhoto.filter((p) => !p.bestSeller),
  ];

  const slides = world !== "michi" ? worldSlides(world, withPhoto, featured) : [
    {
      key: "intro",
      eyebrow: "Nueva colección",
      title: settings.storeName,
      words: HERO_INTRO_WORDS,
      text: settings.tagline || "Accesorios de gatitos para alegrar tu día.",
      cta: "Ver catálogo",
      cat: "Todos",
      star: featured[0],
      imgs: featured.slice(1, 4).map(firstPhoto),
      picks: featured.slice(0, 6),
      grad: [C.blush, "#FFF3F8"],
    },
    ...CATEGORIES.filter((c) => c !== "Todos").flatMap((c) => {
      const items = withPhoto.filter((p) => p.category === c);
      if (!items.length) return [];
      const info = CATEGORY_INFO[c] || {};
      const from = Math.min(...items.map((p) => Number(p.price) || 0));
      // Con 2 o más productos, el más vendido va en la tarjeta estrella y el
      // collage muestra los demás (así no se repite la misma foto).
      const star = items.length > 1 ? items.find((p) => p.bestSeller) || items[0] : null;
      const rest = star ? items.filter((p) => p !== star) : items;
      return [{
        key: c,
        eyebrow: `${items.length} ${items.length === 1 ? "producto" : "productos"} · desde ${money(from)}`,
        title: c,
        words: (info.words || []).map((w) => `que ${w}`),
        text: info.desc,
        cta: `Ver ${c.toLowerCase()}`,
        cat: c,
        star,
        imgs: rest.slice(0, 3).map(firstPhoto),
        picks: items,
        grad: info.grad || [C.blush, C.bg],
      }];
    }),
  ];

  const n = slides.length;
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef(null);

  useEffect(() => {
    if (paused || n <= 1) return;
    const t = setInterval(() => setIdx((i) => i + 1), 6000);
    return () => clearInterval(t);
  }, [paused, n]);

  const cur = ((idx % n) + n) % n;

  // La barra superior toma los colores de la diapositiva visible (variables
  // CSS en <html>); al salir de la tienda vuelve a su degradado por defecto.
  const [ga, gb] = slides[cur].grad;
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--hdr-a", ga);
    root.setProperty("--hdr-b", gb);
  }, [ga, gb]);
  useEffect(() => () => {
    document.documentElement.style.removeProperty("--hdr-a");
    document.documentElement.style.removeProperty("--hdr-b");
  }, []);

  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 40) setIdx((i) => i + (dx < 0 ? 1 : -1));
    touchX.current = null;
  };

  return (
    <section
      className="glow-hero"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-roledescription="carrusel"
    >
      {slides.map((s, i) => (
        <div
          key={s.key}
          className={`glow-hero-slide${i === cur ? " is-active" : ""}`}
          aria-hidden={i !== cur}
          style={{ background: `linear-gradient(120deg, ${s.grad[0]}, ${s.grad[1]})` }}
        >
          {world === "michi" && <span className="glow-hero-pattern" style={{ backgroundImage: catPattern(C.roseDeep) }} />}
          <span className="glow-hero-blob is-1" style={{ background: s.grad[1] }} />
          <span className="glow-hero-blob is-2" style={{ background: "#fff" }} />
          {world === "michi" ? (
            <>
              <PawTrail color={C.roseDeep} />
              {PAWS.map((p, k) => (
                <Paw key={k} style={{ left: p.left, width: p.size, color: C.roseDeep, animationDelay: p.delay, animationDuration: p.dur }} />
              ))}
            </>
          ) : <WorldDeco world={world} />}

          <div className="glow-hero-inner">
            <div className="glow-hero-left">
            <div className="glow-hero-text">
              <p className="glow-hero-eyebrow" style={{ color: `var(--web, ${C.antique})` }}>{s.eyebrow}</p>
              <h2 className="glow-hero-title" style={{ color: `var(--wtitle, ${C.aubergine})` }}>
                {s.title}
                {s.words?.length > 0 && (
                  <span className="glow-hero-rot">
                    {/* la primera palabra se repite al final para que el giro sea continuo */}
                    <span>{[...s.words, s.words[0]].map((w, k) => <span key={k}>{w}</span>)}</span>
                  </span>
                )}
              </h2>
              {s.text && <p className="glow-hero-desc glow-soft">{s.text}</p>}
              <button
                className="glow-hero-cta glow-shine"
                tabIndex={i === cur ? 0 : -1}
                onClick={() => (s.action && onAction ? onAction(s.action) : onPickCategory(s.cat))}
                style={{ background: `var(--wacc, ${C.primary})`, color: C.primaryInk, boxShadow: `0 10px 24px color-mix(in srgb, var(--wacc, ${C.primary}) 27%, transparent)` }}
              >
                {s.cta} <ChevronRight size={18} />
              </button>
            </div>
            {s.star && <HeroStar p={s.star} onAdd={onAdd} active={i === cur} fav={favs.includes(s.star.id)} onToggleFav={onToggleFav} />}
            </div>
            <HeroCollage imgs={s.imgs} variant={world === "michi" ? s.key : "intro"} picks={s.picks} active={i === cur} world={world} />
          </div>
        </div>
      ))}

      {season?.key === "halloween" && world === "michi" && <HalloweenHero />}
      <div className="glow-yarn" aria-hidden="true">
        <svg viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" fill={C.rose} />
          <path d="M6 12 C16 18 24 18 34 12 M4 22 C16 28 26 28 36 20 M10 32 C18 34 26 32 32 28 M14 4 C10 16 12 28 20 38 M26 3 C30 14 30 26 24 38" stroke="#fff" strokeWidth="1.6" fill="none" opacity=".7" />
        </svg>
      </div>
      <div className="glow-ticker" aria-label="Novedades de la tienda">
        <div>
          {[...(WORLD_HERO[world]?.ticker || HERO_TICKER), ...(WORLD_HERO[world]?.ticker || HERO_TICKER)].map((t, k) => (
            <span key={k} aria-hidden={k >= (WORLD_HERO[world]?.ticker || HERO_TICKER).length}>
              <Sparkle style={{ position: "static", width: 12, color: C.primary, animation: "none" }} />
              {t}
            </span>
          ))}
        </div>
      </div>

      {n > 1 && (
        <>
          <button className="glow-hero-arrow is-left" onClick={() => setIdx((i) => i - 1)} aria-label="Anterior" style={{ color: C.roseDeep }}><ChevronLeft size={22} /></button>
          <button className="glow-hero-arrow is-right" onClick={() => setIdx((i) => i + 1)} aria-label="Siguiente" style={{ color: C.roseDeep }}><ChevronRight size={22} /></button>
          <div className="glow-hero-dots">
            {slides.map((s, i) => (
              <button
                key={s.key}
                onClick={() => setIdx(i)}
                aria-label={`Ir a ${s.title}`}
                style={{ width: i === cur ? 26 : 8, background: i === cur ? C.roseDeep : "#2B253033" }}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

/* ---------- Los 3 mundos ---------- */
const scrollToId = (id) => setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
const SPA_ROSALIA = spaArt(GUIDES.rosalia.art);
const ART = (html, className = "glow-world-art") => <span className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />;

// Pestañas de los mundos, al lado del logo (en el celular, debajo).
function WorldTabs({ world, onPick }) {
  return (
    <div className="glow-wtabs" role="tablist" aria-label="Secciones de la tienda">
      {WORLD_KEYS.map((k) => (
        <button key={k} role="tab" aria-selected={world === k} className={`is-${k}${world === k ? " is-on" : ""}`} onClick={() => onPick(k)}>
          <span aria-hidden="true">{WORLDS[k].emoji}</span>
          <span className="glow-wtabs-long">{WORLDS[k].name}</span>
          <span className="glow-wtabs-short">{WORLDS[k].short}</span>
        </button>
      ))}
    </div>
  );
}

// Mundo sin productos todavía.
function ComingSoon({ world, onBack }) {
  const w = WORLDS[world];
  return (
    <div className={`glow-soon is-${world}`}>
      <b>{w.emoji} {w.name} llega muy pronto</b>
      <p>{world === "skin" ? "Rosalía está eligiendo con cariño los productos para tu piel." : "Estamos preparando ropita linda para los peques."} ¡Vuelve pronto!</p>
      <button onClick={onBack}>Mientras tanto, mira la Michitienda 🐾</button>
    </div>
  );
}

// Aviso al final de la Michitienda: invita a pasar a Glow Skin.
function CrossToSkin({ hasSkin, onGo }) {
  return (
    <section className="glow-cross">
      {ART(SPA_ROSALIA, "glow-cross-art")}
      <div>
        <b>Rosalía también cuida tu piel ✨</b>
        <span>{hasSkin ? "Sérums, tónicos y labiales elegidos con cariño. ¡Tus Michipuntos también valen allá!" : "Muy pronto: sérums, tónicos y labiales elegidos con cariño."}</span>
      </div>
      <button onClick={onGo}>{hasSkin ? "Conocer Glow Skin →" : "Echar un vistazo →"}</button>
    </section>
  );
}

// Chips de una tarjeta de Skin: para qué piel es, contenido y detalles.
function SkinTags({ p, onInfo }) {
  const d = p.details || {};
  const tags = [...(d.skinTypes || []).map((t) => (t === "Todo tipo" ? "Todo tipo de piel" : `Piel ${t.toLowerCase()}`)), ...(d.concerns || [])].slice(0, 3);
  return (
    <div className="glow-skin-tags">
      {d.size && <small>{d.size}</small>}
      {tags.map((t) => <span key={t}>{t}</span>)}
      {(d.ingredients || d.usage || d.nso) && <button onClick={(e) => { e.stopPropagation(); onInfo(); }}>Ver detalles</button>}
    </div>
  );
}

function SkinInfo({ p, onClose, onAdd }) {
  const d = p.details || {};
  const step = ROUTINE_STEPS.find((s) => s.key === d.step);
  return (
    <div className="glow-modal-bg" onClick={onClose}>
      <div className="glow-ship glow-skin-info" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={p.name}>
        <button className="glow-join-x" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        <div className="glow-skin-info-top">
          {p.images?.[0] ? <img src={p.images[0]} alt="" /> : <span className="glow-skin-info-noimg">✨</span>}
          <div>
            <small>{p.category}{d.size ? ` · ${d.size}` : ""}</small>
            <h3>{p.name}</h3>
            <b>{money(p.price)}</b>
          </div>
        </div>
        {step && <p><b>Paso de la rutina:</b> {step.emoji} {step.label}</p>}
        {d.skinTypes?.length > 0 && <p><b>Para piel:</b> {d.skinTypes.join(", ").toLowerCase()}</p>}
        {d.concerns?.length > 0 && <p><b>Ayuda con:</b> {d.concerns.join(", ").toLowerCase()}</p>}
        {d.ingredients && <p><b>Ingredientes clave:</b> {d.ingredients}</p>}
        {d.usage && <p><b>Modo de uso:</b> {d.usage}</p>}
        {d.nso && <p className="glow-skin-info-nso">✓ Notificación Sanitaria: <b>{d.nso}</b></p>}
        <button className="glow-skin-info-btn" disabled={p.stock <= 0} onClick={onAdd}>{p.stock > 0 ? "Añadir al carrito" : "Agotado"}</button>
      </div>
    </div>
  );
}

// "Arma tu rutina": 3 preguntas arriba y los 5 pasos en fila con fotos reales.
function RoutineBuilder({ products, onAddAll }) {
  const [a, setA] = useState({ piel: "Mixta", meta: "Hidratación", budget: BUDGETS[1] });
  const [added, setAdded] = useState(false);
  const [open, setOpen] = useState(null); // null: pregunta · true: abierta · false: "no, gracias"
  // El botón "Arma tu rutina" de la portada la abre directamente.
  useEffect(() => {
    const go = () => setOpen(true);
    window.addEventListener("glow:rutina", go);
    return () => window.removeEventListener("glow:rutina", go);
  }, []);
  if (open !== true) {
    return (
      <section id="glow-rutina" className="glow-routine is-ask">
        <div className="glow-wrap glow-rask">
          {ART(SPA_ROSALIA, "glow-rask-art")}
          {open === null ? (
            <>
              <div><b>¿Quieres armar tu rutina skincare? 🌿</b><span>Te hago 3 preguntitas y te digo qué usar y en qué orden.</span></div>
              <div className="glow-rask-btns">
                <button className="is-yes" onClick={() => setOpen(true)}>Sí, ¡quiero!</button>
                <button className="is-no" onClick={() => setOpen(false)}>No, gracias</button>
              </div>
            </>
          ) : (
            <>
              <div><b>¡Está bien! 💕</b><span>Cuando quieras, armamos tu rutina juntas.</span></div>
              <div className="glow-rask-btns"><button className="is-yes" onClick={() => setOpen(true)}>Armar mi rutina</button></div>
            </>
          )}
        </div>
      </section>
    );
  }
  const steps = buildRoutine(products, a);
  const chosen = steps.filter((s) => s.product);
  const total = chosen.reduce((t, s) => t + s.product.price, 0);
  const q = (k, label, opts) => (
    <div className="glow-rq">
      <p>{label}</p>
      <div>{opts.map((o) => <button key={o} className={a[k] === o ? "is-on" : ""} onClick={() => { setA((x) => ({ ...x, [k]: o })); setAdded(false); }}>{o}</button>)}</div>
    </div>
  );
  return (
    <section id="glow-rutina" className="glow-routine">
      <div className="glow-wrap">
        <div className="glow-routine-top">
          <div>
            <h3>Arma tu rutina 🌿</h3>
            <span className="glow-routine-sub">Responde y te armamos la rutina en orden, con productos de la tienda.</span>
          </div>
          <button className="glow-routine-close" onClick={() => setOpen(false)}>Cerrar ✕</button>
        </div>
        <div className="glow-rqs">
          {q("piel", "1. ¿Cómo es tu piel?", SKIN_TYPES.filter((t) => t !== "Todo tipo"))}
          {q("meta", "2. ¿Qué quieres mejorar?", CONCERNS)}
          {q("budget", "3. ¿Cuánto quieres invertir?", BUDGETS)}
        </div>
        <div className="glow-rpath">
          {steps.map(({ step, product, skipped }, i) => (
            <div key={step.key} className={`glow-rstep${product ? "" : " is-empty"}`} style={{ animationDelay: `${i * 0.06}s` }}>
              <i>{i + 1}</i>
              {product ? (
                product.images?.[0] ? <img src={product.images[0]} alt="" loading="lazy" /> : <span className="glow-rstep-ph">{step.emoji}</span>
              ) : (
                <span className="glow-rstep-ph">{skipped ? "Opcional" : "Muy pronto ✨"}</span>
              )}
              <b>{step.emoji} {step.label}</b>
              <small>{product ? product.name : skipped ? "Fuera de tu presupuesto" : "Aún sin producto"}</small>
              {product && <em>{money(product.price)}</em>}
            </div>
          ))}
        </div>
        <div className="glow-routine-tot">
          {chosen.length ? (
            <>
              <span>Tu rutina: {money(total)} · +{Math.floor(total * 1.25)} Michipuntos</span>
              <button onClick={() => { onAddAll(chosen.map((s) => s.product)); setAdded(true); }}>{added ? "✓ Añadida" : "Añadir la rutina"}</button>
            </>
          ) : <span>Aún no tenemos productos para esta rutina. ¡Muy pronto!</span>}
        </div>
      </div>
    </section>
  );
}

// "Encuentra su talla": regla con la estatura del peque (al centro) y debajo
// las prendas como fotos pegadas, cada una con la talla que le corresponde.
function SizeBoard({ products, kid, setKid, onAdd }) {
  const [added, setAdded] = useState(""); // id recién añadido (para el ✓)
  if (!products.length) return null;
  const cm = Math.max(80, Math.min(160, Number(kid.cm) || 105));
  const s = sizeForHeight(cm);
  const pct = ((cm - 60) / (165 - 60)) * 100; // altura del peque en la regla
  return (
    <section id="glow-tallas" className="glow-sboard">
      <div className="glow-wrap">
        <div className="glow-sboard-h">
          <h3>📏 Encuentra su talla</h3>
          <span>Mueve la regla con la estatura de tu peque y te decimos qué talla pedir.</span>
        </div>
        <div className="glow-ruler">
          <div className="glow-ruler-body">
            <div className="glow-ruler-scale">
              {[80, 100, 120, 140, 160].map((v) => <span key={v} style={{ bottom: `${((v - 60) / (165 - 60)) * 100}%` }}>{v}</span>)}
            </div>
            <div className="glow-ruler-kid" style={{ height: `${pct}%` }}>
              <svg viewBox="0 0 60 160" preserveAspectRatio="none"><circle cx="30" cy="18" r="16" /><path d="M14 42 Q30 34 46 42 L50 94 H42 L40 158 H32 L30 106 L28 158 H20 L18 94 H10 Z" /></svg>
              <span className="glow-ruler-mark">{cm} cm</span>
            </div>
          </div>
          <div className="glow-ruler-side">
            <div className="glow-ruler-res">Tu peque mide <b>{cm} cm</b><br /><b className="is-size">Talla {s.size}</b><small> · calzado {s.shoe}</small></div>
            <input type="range" min="80" max="160" value={cm} onChange={(e) => setKid({ cm: Number(e.target.value) })} aria-label="Estatura en centímetros" />
            <div className="glow-ruler-ages">
              {AGE_HEIGHTS.map(([l, v]) => <button key={l} className={Math.abs(cm - v) < 3 ? "is-on" : ""} onClick={() => setKid({ cm: v })}>{l}</button>)}
            </div>
          </div>
        </div>
        <div className="glow-sboard-pins">
          {products.map((p, i) => {
            const sizes = p.details?.sizes || [];
            const rec = recommendedSize(sizes, cm);
            const out = p.stock <= 0 || (sizes.length > 0 && !rec);
            return (
              <div key={p.id} className="glow-pin" style={{ "--r": `${[-2.5, 2, -1.5, 2.5, -2, 1.5][i % 6]}deg` }}>
                {p.images?.[0] ? <img src={p.images[0]} alt="" loading="lazy" /> : <span className="glow-pin-noimg">🧸</span>}
                <b>{p.name}</b>
                <span className="glow-pin-row">
                  <em>{money(p.price)}</em>
                  {sizes.length > 0 && (rec ? <small className="is-ok">Talla {rec} ✓</small> : <small className="is-no">Sin talla {s.size}</small>)}
                </span>
                <button className="glow-pin-add" disabled={out} onClick={() => { onAdd(p, rec); setAdded(p.id); setTimeout(() => setAdded((x) => (x === p.id ? "" : x)), 1800); }}>
                  {added === p.id ? "✓ Añadido" : out ? "No disponible" : rec ? `Añadir talla ${rec}` : "Añadir"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* =========================================================================
   VISTA CLIENTE — catálogo + pedido por WhatsApp
========================================================================= */
function Shop({ products: allProducts, settings, favs = [], onToggleFav, panel, onPanel, customer, onCustomer, onJoin, accountPage, wallet, onClaimCredit, season, world = "michi", onWorld }) {
  const [cat, setCat] = useState("Todos");
  // Solo los productos del mundo elegido (el carrito usa todos).
  const products = useMemo(() => allProducts.filter((p) => worldOf(p.category) === world), [allProducts, world]);
  useEffect(() => { setCat("Todos"); }, [world]);
  const worldCats = ["Todos", ...WORLDS[world].cats.filter((c) => products.some((p) => p.category === c))];
  const [skinInfo, setSkinInfo] = useState(null); // producto de Skin con sus detalles abiertos
  // Estatura del peque (cm) → talla recomendada en las tarjetas de Kids.
  const [kid, setKidState] = useState(() => {
    try { return { cm: 105, ...JSON.parse(localStorage.getItem("glow:peque") || "{}") }; } catch { return { cm: 105 }; }
  });
  const setKid = (patch) => setKidState((k) => {
    const next = { ...k, ...patch };
    try { localStorage.setItem("glow:peque", JSON.stringify(next)); } catch { /* sin almacenamiento */ }
    return next;
  });
  const [sizePick, setSizePick] = useState({}); // talla elegida en cada tarjeta de Kids
  const sizeFor = (p) => {
    const sizes = p.details?.sizes || [];
    if (!sizes.length) return "";
    if (sizePick[p.id] && sizes.includes(sizePick[p.id])) return sizePick[p.id];
    return recommendedSize(sizes, kid.cm) || sizes[0];
  };
  const [q, setQ] = useState("");
  const [cart, setCart] = useState(loadCart); // { [productId]: qty }
  const [cartOpen, setCartOpen] = useState(false);
  const [reviewing, setReviewing] = useState(null); // producto cuyas reseñas se muestran
  const [writing, setWriting] = useState(null); // { product, order } reseña que se está escribiendo
  // Pedidos confirmados de la clienta → productos que aún puede reseñar.
  const [mine, setMine] = useState({ orders: [], reviews: [] });
  const loadMine = useCallback(() => {
    if (!customer?.token) return setMine({ orders: [], reviews: [] });
    Promise.all([getMyOrders(), getMyReviews()])
      .then(([orders, reviews]) => setMine({ orders, reviews }))
      .catch(() => {});
  }, [customer?.token]);
  useEffect(() => { loadMine(); }, [loadMine]);
  const reviewOrderFor = (pid) =>
    mine.orders.find(
      (o) => ["verificado", "enviado"].includes(o.status) &&
        o.items.some((l) => l.id === pid) &&
        !mine.reviews.some((r) => r.orderId === o.id && r.productId === pid)
    ) || null;

  // El carrito se guarda solo en el navegador.
  useEffect(() => {
    localStorage.setItem("glow:cart", JSON.stringify(cart));
  }, [cart]);

  const visible = useMemo(
    () =>
      products.filter((p) => {
        const okCat = cat === "Todos" || p.category === cat;
        const okQ = p.name.toLowerCase().includes(q.toLowerCase());
        return okCat && okQ;
      }),
    [products, cat, q]
  );

  // Líneas del carrito (resuelve cada id contra el producto actual y respeta el stock).
  // La clave es el id, o "id::talla" en la ropa de Kids.
  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([key, qty]) => {
          const [id, size = ""] = key.split("::");
          const p = allProducts.find((x) => x.id === id);
          if (!p) return null;
          return { ...p, key, size, name: size ? `${p.name} · Talla ${size}` : p.name, qty: Math.min(qty, p.stock) };
        })
        .filter((l) => l && l.qty > 0),
    [cart, allProducts]
  );

  const cartCount = cartLines.reduce((n, l) => n + l.qty, 0);
  const cartTotal = cartLines.reduce((n, l) => n + l.price * l.qty, 0);

  const [guideEvent, setGuideEvent] = useState(null);
  const addToCart = (p, size = "") => {
    setGuideEvent({ type: "added", product: p, at: Date.now() });
    addToCartRaw(p, size);
  };
  const addToCartRaw = (p, size = "") =>
    setCart((c) => {
      const key = size ? `${p.id}::${size}` : p.id;
      const next = Math.min((c[key] || 0) + 1, p.stock);
      return { ...c, [key]: next };
    });
  const setQty = (id, qty) =>
    setCart((c) => {
      if (qty <= 0) {
        const { [id]: _, ...rest } = c;
        return rest;
      }
      return { ...c, [id]: qty };
    });
  const clearCart = () => setCart({});

  // Desde la portada: filtra el catálogo a la categoría y baja hasta él.
  const goToCategory = (c) => {
    setCat(c);
    setQ("");
    setTimeout(() => document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" }), 0);
  };

  // Pedido de todo el carrito por WhatsApp. Con paidYape=true avisa que ya
  // se pagó por Yape y pide adjuntar la captura del comprobante.
  const orderCart = (paidYape = false) => {
    if (cartLines.length === 0) return;
    const items = cartLines
      .map((l) => `• ${l.qty}x ${l.name} — ${money(l.price * l.qty)}`)
      .join("\n");
    const end = paidYape
      ? `Ya pagué ${money(cartTotal)} por Yape. Te envío la captura del comprobante.`
      : "¿Está disponible?";
    const msg = `Hola ${settings.storeName}, quiero pedir:\n${items}\n\nTotal: ${money(cartTotal)}\n\n${end}`;
    window.open(`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div>
      {/* Portada: slider llamativo */}
      {accountPage ? (
        <AccountPage customer={customer} favs={favs} products={products} onToggleFav={onToggleFav} onAdd={addToCart} onPanel={onPanel} settings={settings} wallet={wallet} onClaimCredit={onClaimCredit} />
      ) : (
      <>
      <HeroSlider key={world} world={world} products={products} settings={settings} onPickCategory={goToCategory} onAction={(a) => { if (a === "rutina") window.dispatchEvent(new Event("glow:rutina")); scrollToId(a === "rutina" ? "glow-rutina" : "glow-tallas"); }} onAdd={addToCart} favs={favs} onToggleFav={onToggleFav} season={season} />
      {world === "michi" && season?.key === "halloween" && <HalloweenBand season={season} onGo={() => goToCategory("Todos")} />}
      {!products.length ? <ComingSoon world={world} onBack={() => onWorld("michi")} /> : (<>

      <div id="catalogo" className="glow-wrap" style={{ paddingTop: 28, scrollMarginTop: 70 }}>
        {/* filtros */}
        <div className="glow-filters">
          <div className="glow-cats">
            {worldCats.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                style={{
                  padding: "6px 14px", borderRadius: 999, fontSize: 14, fontWeight: 500,
                  border: `1px solid ${cat === c ? `var(--wacc, ${C.primary})` : C.line}`,
                  background: cat === c ? `var(--wacc, ${C.primary})` : "transparent",
                  color: cat === c ? C.primaryInk : C.plum,
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="glow-search">
            <Search size={16} color={C.inkSoft} style={{ position: "absolute", left: 12, top: 11 }} />
            <input
              id="glow-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar producto…"
              style={{
                padding: "8px 12px 8px 36px", borderRadius: 999, fontSize: 14, outline: "none",
                border: `1px solid ${C.line}`, background: C.surface, color: C.ink,
              }}
            />
          </div>
        </div>

        {/* grilla */}
        <div className="glow-grid" style={{ paddingBottom: 64 }}>
          {visible.map((p) => {
            const out = p.stock <= 0;
            return (
              <div key={p.id} id={`prod-${p.id}`} className={`glow-pcard is-${world}`} onPointerEnter={(e) => { if (e.pointerType === "mouse") e.currentTarget._seen = setTimeout(() => markSeen(p.id), 1000); }} onPointerLeave={(e) => clearTimeout(e.currentTarget._seen)} onClick={() => markSeen(p.id)} style={{ borderRadius: 18, overflow: "hidden", display: "flex", flexDirection: "column", background: C.surface, border: `1px solid ${C.line}`, boxShadow: "0 6px 20px rgba(214,53,127,0.08)" }}>
                {/* foto con marco kawaii */}
                <div className="glow-card-pad" style={{ padding: 10 }}>
                  <div className="glow-card-img" style={{ position: "relative", overflow: "hidden", display: "grid", placeItems: "center", borderRadius: 14, background: `linear-gradient(135deg, ${C.blush}, ${C.bg})`, border: "2px solid #fff", boxShadow: `0 0 0 2px ${C.blush}` }}>
                    <ProductGallery images={p.images} alt={p.name} />
                    {season?.key === "halloween" && world === "michi" && svg(HALLOWEEN.cardWeb, "glow-card-web")}
                    {season?.key === "halloween" && world === "michi" && svg(SPIDER, "glow-card-spider")}
                    {p.details?.nso && <span className="glow-nso">NSO ✓</span>}
                    <FavButton active={favs.includes(p.id)} onClick={() => onToggleFav(p.id)} style={{ bottom: 8, right: 8 }} />
                    {p.doublePoints && <span className="glow-x2 is-card">×2 Michipuntos</span>}
                    {p.bestSeller && (
                      <span className="glow-badge" style={{ position: "absolute", top: 8, left: 8, padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: "#fff", color: C.roseDeep, boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }}>
                        Más vendido
                      </span>
                    )}
                    <span
                      className={`glow-badge ${out ? "is-out" : "is-available"}`}
                      style={{
                        position: "absolute", top: 8, right: 8, padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                        background: C.surface, color: out ? C.warn : C.ok, border: `1px solid ${out ? C.warn : C.ok}33`,
                      }}
                    >
                      {out ? "Agotado" : "Disponible"}
                    </span>
                  </div>
                </div>
                <div className="glow-card-body" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                  <p className="glow-card-cat" style={{ color: C.antique }}>{p.category}</p>
                  <h3 className="glow-card-name glow-name" style={{ color: C.aubergine }}>{p.name}</h3>
                  {p.reviews > 0 && (
                    <button className="glow-card-rating" onClick={(e) => { e.stopPropagation(); setReviewing(p); }}>
                      <Stars value={p.rating} size={18} /> <b>{p.rating}</b> <small>({p.reviews}<span className="glow-hide-sm"> reseña{p.reviews === 1 ? "" : "s"}</span>)</small>
                    </button>
                  )}
                  {reviewOrderFor(p.id) && (
                    <button className="glow-card-write" onClick={(e) => { e.stopPropagation(); setWriting({ product: p, order: reviewOrderFor(p.id) }); }}>
                      ✍️ Escribe tu reseña · +{REVIEW_PTS.photo}
                    </button>
                  )}
                  {world === "skin" && <SkinTags p={p} onInfo={() => setSkinInfo(p)} />}
                  <p className="glow-card-desc">{p.desc}</p>
                  {world === "kids" && p.details?.sizes?.length > 0 && (
                    <div className="glow-sizes" role="group" aria-label="Talla">
                      {p.details.sizes.map((t) => (
                        <button key={t} className={sizeFor(p) === t ? "is-on" : ""} onClick={(e) => { e.stopPropagation(); setSizePick((m) => ({ ...m, [p.id]: t })); }}>{t}</button>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: "auto", paddingTop: 12 }}>
                    <span className="glow-card-price" style={{ color: C.aubergine }}>{money(p.price)}</span>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <button
                      disabled={out}
                      onClick={() => addToCart(p, world === "kids" ? sizeFor(p) : "")}
                      className="glow-card-btn"
                      style={{
                        width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        padding: "10px 0", borderRadius: 12, fontSize: 14, fontWeight: 600, border: "none",
                        background: out ? C.line : C.primary, color: out ? C.inkSoft : C.primaryInk,
                        cursor: out ? "not-allowed" : "pointer",
                      }}
                    >
                      <ShoppingCart size={16} />
                      <span className="glow-btn-long">{out ? "No disponible" : "Añadir al carrito"}</span>
                      <span className="glow-btn-short">{out ? "Agotado" : "Añadir"}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {visible.length === 0 && (
          <p className="glow-soft" style={{ textAlign: "center", paddingBottom: 64, fontSize: 19 }}>
            No hay productos que coincidan con tu búsqueda.
          </p>
        )}
      </div>

      {world === "michi" && <CrossToSkin hasSkin={allProducts.some((p) => worldOf(p.category) === "skin")} onGo={() => onWorld("skin")} />}
      {world === "skin" && <RoutineBuilder products={products} onAddAll={(list) => list.forEach((p) => addToCart(p))} />}
      {world === "kids" && <SizeBoard products={products} kid={kid} setKid={setKid} onAdd={(p, size) => addToCart(p, size || sizeFor(p))} />}

      {/* Sección "Más vendidos" */}
      {world === "michi" && <BestSellers products={products} onAdd={addToCart} favs={favs} onToggleFav={onToggleFav} />}
      </>)}
      {skinInfo && <SkinInfo p={skinInfo} onClose={() => setSkinInfo(null)} onAdd={() => { addToCart(skinInfo); setSkinInfo(null); }} />}
      </>
      )}

      {reviewing && (
        <ProductReviews
          product={reviewing}
          customer={customer}
          reviewOrder={reviewOrderFor(reviewing.id)}
          onClose={() => setReviewing(null)}
          onWrite={(product, order) => { setReviewing(null); setWriting({ product, order }); }}
        />
      )}
      {writing && (
        <ReviewModal
          order={writing.order}
          item={writing.order.items.find((l) => l.id === writing.product.id)}
          onClose={() => setWriting(null)}
          onSent={() => { setWriting(null); loadMine(); alert("¡Gracias por tu reseña! 💕 Sumarás tus Michipuntos cuando la revisemos."); }}
        />
      )}
      {panel && (
        <AccountDrawer
          section={panel}
          onSection={onPanel}
          onClose={() => onPanel(null)}
          customer={customer}
          onCustomer={onCustomer}
          favs={favs}
          products={products}
          onToggleFav={onToggleFav}
          onAdd={addToCart}
          onJoin={onJoin}
        />
      )}

      {/* Guía de compras */}
      {!accountPage && (
        <ShopGuide
          products={products}
          cartLines={cartLines}
          cartCount={cartCount}
          onAdd={addToCart}
          onOpenCart={() => setCartOpen(true)}
          event={guideEvent}
          season={season}
        />
      )}

      {/* Botón flotante del carrito (encima del botón del chat) */}
      {cartCount > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          aria-label="Abrir carrito"
          style={{
            position: "fixed", bottom: 90, right: 20, zIndex: 55,
            display: "flex", alignItems: "center", gap: 8, padding: "14px 20px",
            borderRadius: 999, border: "none", color: C.primaryInk, background: C.primary,
            fontWeight: 600, fontSize: 15, cursor: "pointer",
            boxShadow: `0 8px 24px ${C.rose}66`,
          }}
        >
          <ShoppingCart size={20} />
          <span>{money(cartTotal)}</span>
          <span
            style={{
              minWidth: 22, height: 22, padding: "0 6px", borderRadius: 999,
              background: "#fff", color: C.roseDeep, fontSize: 13, fontWeight: 700,
              display: "grid", placeItems: "center",
            }}
          >
            {cartCount}
          </span>
        </button>
      )}

      {/* Panel del carrito */}
      {cartOpen && (
        <CartDrawer
          lines={cartLines}
          total={cartTotal}
          onClose={() => setCartOpen(false)}
          onSetQty={setQty}
          onClear={clearCart}
          onOrder={orderCart}
          settings={settings}
          customer={customer}
          onJoin={onJoin ? () => { setCartOpen(false); onJoin(); } : null}
        />
      )}
    </div>
  );
}

// Lee una captura de Yape (texto de OCR) y saca el Nro. de operación, el
// monto y si el destinatario coincide con el titular configurado.
const plain = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
function parseYapeText(text, yapeName) {
  const flat = text.replace(/\s+/g, " ");
  let op = "";
  const m = /operaci[oó0]n\D{0,25}(\d[\d ]{4,14}\d)/i.exec(flat);
  if (m) op = m[1].replace(/\s/g, "");
  else {
    // sin la etiqueta: el número largo que no sea un celular (9 dígitos que empieza en 9)
    const nums = (flat.match(/\b\d{6,12}\b/g) || []).filter((n) => !/^9\d{8}$/.test(n));
    op = nums.sort((a, b) => b.length - a.length)[0] || "";
  }
  // "S/ 25": el OCR a veces lee la barra como I, l o 1, y la S como 5
  const a = /\b[S5$]\s*[/|Il1]\s*\.?\s*(\d{1,5}(?:[.,]\d{1,2})?)\b/.exec(flat);
  const amount = a ? Number(a[1].replace(",", ".")) : null;
  const words = plain(yapeName || "").split(/\s+/).filter((w) => w.length >= 4);
  const hits = words.filter((w) => plain(flat).includes(w)).length;
  const toMe = words.length ? hits >= Math.min(2, words.length) : null;
  return { op, amount, toMe };
}

async function readYapeCapture(file) {
  const { createWorker, PSM } = await import("tesseract.js");
  const worker = await createWorker("spa");
  try {
    // modo "texto disperso": así no se salta el monto grande del comprobante
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    const { data } = await worker.recognize(file);
    return data.text || "";
  } finally {
    await worker.terminate();
  }
}

// Carita de Rosalía (la misma de la portada, recortada a la cabeza).
function RosaliaFace() {
  return (
    <svg viewBox="56 4 88 108" aria-hidden="true">
      <CatArt variant="face" />
    </svg>
  );
}

// Cartita de venta que recibe el cliente al terminar.
const NoteLetter = React.forwardRef(function NoteLetter({ order }, ref) {
  const date = new Date(order.createdAt).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
  return (
    <div className="glow-letter" ref={ref}>
      <div className="glow-letter-stamp"><div><RosaliaFace /></div></div>
      <p className="glow-letter-hi">¡Hola!</p>
      <h3 className="glow-letter-title">¡Gracias por<br />tu compra!</h3>
      {order.items.map((l, i) => (
        <div key={`${l.id}-${i}`} className="glow-letter-row">
          {l.image ? <img src={l.image} alt="" /> : <span className="glow-letter-noimg" />}
          <div>{l.name}<small>{l.gift ? "🎁 SORPRESAA!!!" : `${l.qty} × ${money(l.price)}`}</small></div>
          <b>{l.gift ? "Regalo" : money(l.qty * l.price)}</b>
        </div>
      ))}
      {order.discount > 0 && (
        <div className="glow-letter-disc"><span>Michipuntos canjeados</span><span>−{money(order.discount)}</span></div>
      )}
      {order.creditUsed > 0 && (
        <div className="glow-letter-disc"><span>Michi-crédito</span><span>−{money(order.creditUsed)}</span></div>
      )}
      {order.delivery && (
        <div className="glow-letter-disc" style={{ color: "#6b5a63" }}>
          <span>{order.delivery.type === "juliaca" ? "Entrega en Juliaca" : `Envío Shalom · ${order.delivery.department}`}</span>
          <span>{order.shipping > 0 ? money(order.shipping) : "Gratis"}</span>
        </div>
      )}
      <div className="glow-letter-tot"><span>Total</span><b>{money(order.total)}</b></div>
      <dl className="glow-letter-meta">
        <dt>Pedido</dt><dd>#{order.code} · {date}</dd>
        <dt>Pago</dt><dd>Yape · op. <span>{order.yapeOp}</span></dd>
        {order.delivery && (
          <>
            <dt>Entrega</dt>
            <dd>{order.delivery.type === "juliaca" ? `${order.delivery.point}${order.delivery.date ? " · " + whenText(order.delivery.date, order.delivery.time) : ""}` : `Shalom: ${order.delivery.agency || "agencia"} · ${order.delivery.district || order.delivery.city}${order.delivery.province ? ", " + order.delivery.province : ""}`}</dd>
          </>
        )}
      </dl>
      {(() => {
        const st = order.status === "pendiente" || !order.status ? null : ORDER_STEP[order.status];
        return st ? (
          <span className="glow-letter-verif" style={{ color: st.color, background: st.bg }}><i style={{ background: st.color }} />{st.label}</span>
        ) : (
          <span className="glow-letter-verif"><i />Pago enviado · en verificación</span>
        );
      })()}
      <div className="glow-letter-sign">con cariño, Rosalía</div>
    </div>
  );
});

// Pago con Yape en 5 pasos: pagar → subir captura → leerla → revisar → notita.
// Paso 1 del pago: cómo recibe su pedido (gratis en Juliaca o envío Shalom).
function DeliveryStep({ settings, customer, value, onChange, itemsTotal, discount, discountLabel = "Michipuntos", onNext, onBack }) {
  const [deps, setDeps] = useState([]);
  useEffect(() => {
    getConfig().then((c) => setDeps(c.departments || [])).catch(() => {});
  }, []);
  const cfg = settings.shipping || { juliacaPoints: [], defaultRate: 0, rates: {} };
  const v = value;
  // Agencias Shalom del departamento elegido (si la tienda tiene la clave).
  const [agencies, setAgencies] = useState({ enabled: false, items: [], loading: false });
  useEffect(() => {
    if (v.type !== "shalom" || !v.department) return;
    let alive = true;
    setAgencies((a) => ({ ...a, loading: true }));
    getShalomAgencies(v.department)
      .then((r) => alive && setAgencies({ ...r, loading: false }))
      .catch(() => alive && setAgencies({ enabled: false, items: [], loading: false }));
    return () => { alive = false; };
  }, [v.type, v.department]);
  const agencyList = agencies.enabled && agencies.items.length > 0;
  const suggested = (cfg.agencies || {})[v.department] || [];
  const OTHER = "__otra__";
  const set = (k, x) => onChange({ ...v, [k]: x });
  const rate = (dep) => {
    const r = cfg.rates?.[dep];
    return r !== "" && r != null && Number.isFinite(Number(r)) ? Number(r) : cfg.defaultRate;
  };
  const shipping = v.type === "shalom" && v.department ? rate(v.department) : 0;
  const cel = (v.phone || "").replace(/\D/g, "").replace(/^51(?=9\d{8}$)/, "");
  const celOk = /^9\d{8}$/.test(cel);
  const fullName = (v.name || "").trim().split(/\s+/).filter((w) => w.length > 1).length >= 2;
  const pt = cfg.juliacaPoints.find((p) => p.name === v.point);
  const ok =
    v.type === "juliaca" ? !!pt && !!v.date && !!v.time && v.name?.trim() && celOk
    : v.type === "shalom" ? !!v.department && !!v.province && !!v.district && v.agency?.trim() && fullName && /^\d{8}$/.test(v.dni || "") && celOk
    : false;
  const missing =
    v.type === "juliaca"
      ? !pt ? "Elige el punto de encuentro" : !v.date ? "Elige el día" : !v.time ? "Elige la hora" : !v.name?.trim() ? "Escribe tu nombre" : !celOk ? "Escribe un celular de 9 dígitos" : ""
      : v.type === "shalom"
      ? !v.department ? "Elige el departamento" : !v.province ? "Elige la provincia" : !v.district ? "Elige el distrito" : !v.agency?.trim() ? "Elige la agencia Shalom" : !fullName ? "Escribe nombres y apellidos completos" : !/^\d{8}$/.test(v.dni || "") ? "El DNI debe tener 8 dígitos" : !celOk ? "El celular debe tener 9 dígitos" : ""
      : "";
  // primera vez: completa con los datos del perfil
  useEffect(() => {
    if (customer && !v.name) onChange({ ...v, name: customer.name || "", phone: customer.phone || "" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="glow-deliv">
      <p className="glow-field-label" style={{ marginTop: 0 }}>¿Cómo quieres recibir tu pedido?</p>
      <div className="glow-deliv-opts">
        <button type="button" className={v.type === "juliaca" ? "is-on" : ""} onClick={() => set("type", "juliaca")}>
          <span className="glow-deliv-ico">📍</span>
          <b>Entrega en Juliaca</b>
          <small className="glow-free">GRATIS</small>
        </button>
        <button type="button" className={v.type === "shalom" ? "is-on" : ""} onClick={() => set("type", "shalom")}>
          <span className="glow-deliv-ico">🚚</span>
          <b>Envío por Shalom</b>
          <small>resto del Perú</small>
        </button>
      </div>

      {v.type === "juliaca" && (
        <>
          <p className="glow-field-label">Punto de entrega</p>
          <div className="glow-points">
            {cfg.juliacaPoints.map((pt) => (
              <label key={pt.name} className={v.point === pt.name ? "is-on" : ""}>
                <input type="radio" name="punto" checked={v.point === pt.name} onChange={() => onChange({ ...v, point: pt.name, date: "", time: "" })} />
                <span className="glow-rw-dot" />
                <span>{pt.name}<small className="glow-point-time">🕒 {scheduleText(pt)}</small></span>
              </label>
            ))}
          </div>
          {pt && (
            <>
              <p className="glow-field-label">Día</p>
              <div className="glow-chips">
                {nextDates(pt).map((dt) => {
                  const k = ymd(dt);
                  return (
                    <button key={k} type="button" className={v.date === k ? "is-on" : ""} onClick={() => onChange({ ...v, date: k, time: "" })}>
                      <small>{DAY_SHORT[dt.getDay()]}</small><b>{dt.getDate()}</b><small>{dt.toLocaleDateString("es-PE", { month: "short" })}</small>
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {pt && v.date && (
            <>
              <p className="glow-field-label">Hora exacta</p>
              <div className="glow-chips is-time">
                {slotsFor(pt, v.date).map((t) => (
                  <button key={t} type="button" className={v.time === t ? "is-on" : ""} onClick={() => set("time", t)}>{hour12(t)}</button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {v.type === "shalom" && (
        <>
          <p className="glow-field-label">Departamento de destino</p>
          <select className="glow-select" value={v.department || ""} onChange={(e) => onChange({ ...v, department: e.target.value, province: "", district: "", agency: "", agencyPick: "", agencyId: "" })}>
            <option value="">Elige…</option>
            {deps.map((d) => <option key={d}>{d}</option>)}
          </select>
          {v.department && (
            <div className="glow-2col">
              <div>
                <p className="glow-field-label">Provincia</p>
                <select className="glow-select" value={v.province || ""} onChange={(e) => onChange({ ...v, province: e.target.value, district: "" })}>
                  <option value="">Elige…</option>
                  {Object.keys(UBIGEO[v.department] || {}).sort((a, b) => a.localeCompare(b, "es")).map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <p className="glow-field-label">Distrito</p>
                <select className="glow-select" value={v.district || ""} disabled={!v.province} onChange={(e) => set("district", e.target.value)}>
                  <option value="">{v.province ? "Elige…" : "Primero la provincia"}</option>
                  {((UBIGEO[v.department] || {})[v.province] || []).map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
          )}
          {agencyList ? (
            <>
              <p className="glow-field-label">Agencia Shalom donde recogerás</p>
              <select
                className="glow-select"
                value={v.agencyId || ""}
                onChange={(e) => {
                  const a = agencies.items.find((x) => x.id === e.target.value);
                  onChange({ ...v, agencyId: a?.id || "", agency: a ? `${a.name}${a.address ? " – " + a.address : ""}` : "" });
                }}
              >
                <option value="">Elige la agencia…</option>
                {[...new Set(agencies.items.map((a) => a.province))].map((prov) => (
                  <optgroup key={prov} label={prov || v.department}>
                    {agencies.items.filter((a) => a.province === prov).map((a) => (
                      <option key={a.id} value={a.id}>{a.name}{a.district ? ` · ${a.district}` : ""}{a.address ? ` – ${a.address}` : ""}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </>
          ) : (
            <>
              <p className="glow-field-label">Agencia Shalom donde recogerás</p>
              {suggested.length > 0 && (
                <select
                  className="glow-select"
                  value={v.agencyPick || ""}
                  onChange={(e) => onChange({ ...v, agencyPick: e.target.value, agency: e.target.value === OTHER ? "" : e.target.value })}
                  style={{ marginBottom: 6 }}
                >
                  <option value="">Elige una agencia…</option>
                  {suggested.map((a) => <option key={a} value={a}>{a}</option>)}
                  <option value={OTHER}>Otra agencia (la escribo)</option>
                </select>
              )}
              {(suggested.length === 0 || v.agencyPick === OTHER) && (
                <>
                  <input className="glow-input" value={v.agency || ""} onChange={(e) => set("agency", e.target.value)} placeholder="DIRECCIÓN DE LA AGENCIA SHALOM" />
                  <p className="glow-hint">⚠️ Es la dirección de la <b>agencia Shalom</b> donde recogerás, no la de tu casa.</p>
                </>
              )}
            </>
          )}
          <a className="glow-map-link" href="https://shalom.com.pe/agencias" target="_blank" rel="noreferrer">
            🗺️ ¿No sabes qué agencia? Búscala en el mapa de Shalom
          </a>
          <p className="glow-field-label">DNI de quien recoge</p>
          <input className="glow-input" inputMode="numeric" value={v.dni || ""} onChange={(e) => set("dni", e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="8 dígitos" />
        </>
      )}

      {v.type && (
        <>
          <div className="glow-2col">
            <div><p className="glow-field-label">{v.type === "shalom" ? "Nombres y apellidos completos" : "Tu nombre"}</p><input className="glow-input" value={v.name || ""} onChange={(e) => set("name", e.target.value)} placeholder={v.type === "shalom" ? "Como figura en su DNI" : "Nombre y apellido"} /></div>
            <div><p className="glow-field-label">Celular</p><input className="glow-input" inputMode="tel" value={v.phone || ""} onChange={(e) => set("phone", e.target.value.replace(/[^\d+ ]/g, ""))} placeholder="987 654 321" /></div>
          </div>
          <p className="glow-field-label">Nota <small>(opcional)</small></p>
          <input className="glow-input" value={v.note || ""} onChange={(e) => set("note", e.target.value)} placeholder={v.type === "juliaca" ? "Ej. estaré con polera rosada" : "Algo que debamos saber"} />

          {v.type === "juliaca" && pt && v.date && v.time && (
            <p className="glow-when">📍 {pt.name}<br />🕒 {whenText(v.date, v.time)}</p>
          )}
          <div className="glow-sum">
            <div><span>Productos</span><span>{money(itemsTotal + discount)}</span></div>
            {discount > 0 && <div className="is-gold"><span>{discountLabel}</span><span>−{money(discount)}</span></div>}
            <div><span>Envío</span><span>{v.type === "juliaca" ? "Gratis 🎉" : v.department ? money(shipping) : "—"}</span></div>
            <div className="is-total"><span>Total a yapear</span><b>{money(itemsTotal + shipping)}</b></div>
          </div>
        </>
      )}
      <button className="glow-pay-btn" disabled={!ok} onClick={() => onNext(shipping)} style={{ background: ok ? C.yape : C.line, marginTop: 14 }}>
        {ok || !missing ? "Continuar al pago" : missing}
      </button>
      <button className="glow-link-btn" onClick={onBack} style={{ color: C.plum }}><ChevronLeft size={16} /> Volver al carrito</button>
    </div>
  );
}

function YapeCheckout({ settings, lines, total: itemsTotal, discount = 0, discountLabel = "Michipuntos", reward = "", useCredit = false, willEarn = 0, customer, onBack, onDone, order }) {
  const [step, setStep] = useState(order ? "done" : "entrega");
  const [delivery, setDelivery] = useState({ type: "" });
  const [shipping, setShipping] = useState(0);
  const total = itemsTotal + shipping;
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [read, setRead] = useState({ op: "", amount: null, toMe: null });
  const [op, setOp] = useState("");
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const noteRef = useRef(null);
  const num = settings.yapeNumber || "";
  const pretty = num.replace(/(\d{3})(?=\d)/g, "$1 ").trim();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(num);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* sin permiso para copiar: el número queda visible igual */
    }
  };

  const useSample = async () => processFile(await makeSampleCapture(total, settings.yapeName));
  const onPick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) processFile(f);
  };
  const processFile = async (f) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setErr("");
    setStep("reading");
    const started = Date.now();
    let r = { op: "", amount: null, toMe: null };
    try {
      r = parseYapeText(await readYapeCapture(f), settings.yapeName);
    } catch {
      /* si la lectura falla, el cliente escribe el número a mano */
    }
    await new Promise((ok) => setTimeout(ok, Math.max(0, 1500 - (Date.now() - started))));
    setRead(r);
    setOp(r.op);
    setStep("review");
  };

  const confirm = async () => {
    setSending(true);
    setErr("");
    try {
      const capture = await fileToDataURL(file, 1400, 0.85);
      const o = await createOrder({ items: lines.map((l) => ({ id: l.id, qty: l.qty, size: l.size || "" })), yapeOp: op, capture, test: TEST_MODE, reward, delivery, useCredit });
      creditsChanged();
      onDone(o);
      setStep("done");
    } catch (e) {
      setErr(e.message || "No se pudo registrar el pedido.");
    } finally {
      setSending(false);
    }
  };

  const download = async () => {
    if (!noteRef.current) return;
    try {
      const url = await toPng(noteRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: "#FFFDF8" });
      const a = document.createElement("a");
      a.href = url;
      a.download = `notita-${order.code}.png`;
      a.click();
    } catch {
      alert("No se pudo descargar la notita. Puedes tomarle captura de pantalla.");
    }
  };

  const whatsapp = () => {
    const items = order.items.map((l) => `• ${l.qty}x ${l.name} — ${money(l.price * l.qty)}`).join("\n");
    const link = order.capture ? `\nCaptura: ${window.location.origin}${order.capture}` : "";
    const msg = `Hola ${settings.storeName}, pagué mi pedido #${order.code} por Yape:\n${items}\n\nTotal: ${money(order.total)}\nNro. de operación: ${order.yapeOp}${link}`;
    window.open(`https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const dots = { entrega: 1, pay: 2, upload: 3, reading: 4, review: 5 }[step];
  const amountOk = read.amount == null ? null : Math.abs(read.amount - total) < 0.01;

  return (
    <div className="glow-yape">
      {dots && (
        <div className="glow-steps-dots">
          {[1, 2, 3, 4, 5].map((k) => <i key={k} className={k <= dots ? "on" : ""} style={k <= dots ? { background: C.yape } : null} />)}
        </div>
      )}

      {step === "entrega" && (
        <DeliveryStep
          settings={settings}
          customer={customer}
          value={delivery}
          onChange={setDelivery}
          itemsTotal={itemsTotal}
          discount={discount}
          discountLabel={discountLabel}
          onNext={(ship) => { setShipping(ship); setStep("pay"); }}
          onBack={onBack}
        />
      )}

      {step === "pay" && (
        <>
          <p className="glow-yape-label">Monto a yapear</p>
          <p className="glow-yape-total" style={{ color: C.yape }}>{money(total)}</p>
          {settings.yapeQr && (
            <div className="glow-yape-qr" style={{ borderColor: C.yape }}>
              <img src={settings.yapeQr} alt="Código QR de Yape" />
            </div>
          )}
          {num && (
            <div className="glow-yape-num">
              <div>
                <small>Número Yape</small>
                <b>{pretty}</b>
                {settings.yapeName && <span>{settings.yapeName}</span>}
              </div>
              <button onClick={copy} style={{ color: C.yape, borderColor: C.yape }}>{copied ? "¡Copiado!" : "Copiar"}</button>
            </div>
          )}
          <ol className="glow-yape-steps">
            <li>Abre Yape y {settings.yapeQr ? "escanea el QR" : "yapea al número"}{settings.yapeQr && num ? " o yapea al número" : ""}.</li>
            <li>Paga exactamente <b>{money(total)}</b>.</li>
            <li>Guarda la captura del comprobante: la subes en el siguiente paso.</li>
          </ol>
          <button className="glow-pay-btn" onClick={() => setStep("upload")} style={{ background: C.yape }}>Ya yapeé · siguiente</button>
          <button className="glow-link-btn" onClick={() => setStep("entrega")} style={{ color: C.plum }}><ChevronLeft size={16} /> Cambiar entrega</button>
        </>
      )}

      {step === "upload" && (
        <>
          <label className="glow-drop" style={{ color: C.yape }}>
            <ImageIcon size={46} strokeWidth={1.6} />
            <b>Sube la captura de tu Yape</b>
            <small>JPG o PNG · desde tu galería</small>
            <input type="file" accept="image/*" onChange={onPick} hidden />
          </label>
          <p className="glow-tip">Que se vean el <b>monto</b> y el <b>Nro. de operación</b>. Lo leemos automáticamente.</p>
          {TEST_MODE && (
            <button className="glow-pay-btn is-ghost" onClick={useSample} style={{ color: C.aubergine, borderColor: C.aubergine, marginTop: 12 }}>
              🧪 Usar captura de ejemplo (prueba)
            </button>
          )}
          <button className="glow-link-btn" onClick={() => setStep("pay")} style={{ color: C.plum }}><ChevronLeft size={16} /> Volver</button>
        </>
      )}

      {step === "reading" && (
        <>
          <div className="glow-scan">
            <img src={preview} alt="Tu captura" />
            <span />
          </div>
          <p className="glow-reading" style={{ color: C.aubergine }}>Rosalía está leyendo tu comprobante…</p>
        </>
      )}

      {step === "review" && (
        <>
          <div className="glow-review-thumb">
            <img src={preview} alt="" />
            <div>
              <b>Tu captura</b>
              <label style={{ color: C.yape }}>Cambiar<input type="file" accept="image/*" onChange={onPick} hidden /></label>
            </div>
          </div>
          <div className="glow-checks">
            <div className={amountOk === false ? "is-warn" : amountOk ? "is-ok" : ""}>
              <span>Monto</span>
              <span>
                <b>{read.amount != null ? money(read.amount) : "—"}</b>{" "}
                {amountOk ? "✓ coincide" : amountOk === false ? `⚠ el pedido es ${money(total)}` : "no se pudo leer"}
              </span>
            </div>
            {read.toMe != null && (
              <div className={read.toMe ? "is-ok" : "is-warn"}>
                <span>Para</span>
                <span>{read.toMe ? `✓ ${settings.yapeName}` : "⚠ no se reconoce el destinatario"}</span>
              </div>
            )}
          </div>
          <label className="glow-field-label">Nro. de operación {read.op ? "(leído de tu captura)" : ""}</label>
          <input
            className="glow-op-input"
            style={{ color: C.yape }}
            inputMode="numeric"
            value={op}
            onChange={(e) => setOp(e.target.value.replace(/\D/g, "").slice(0, 14))}
            placeholder="Escríbelo si no se leyó"
          />
          <p className="glow-hint">Está en tu comprobante de Yape, debajo del monto.</p>
          {err && <p className="glow-err">{err}</p>}
          <button className="glow-pay-btn" onClick={confirm} disabled={op.length < 4 || sending} style={{ background: op.length < 4 ? C.line : C.yape, marginTop: 14 }}>
            {sending ? "Enviando…" : "Confirmar y ver mi notita"}
          </button>
        </>
      )}

      {step === "done" && order && (
        <>
          {order.items.some((l) => l.gift) && (() => {
            const g = order.items.find((l) => l.gift);
            return (
              <div className="glow-gift">
                <p className="glow-gift-title">🎁 SORPRESAA!!!</p>
                {g.image && <img src={g.image} alt={g.name} />}
                <p>Tu regalo es: <b>{g.name}</b></p>
              </div>
            );
          })()}
          <NoteLetter order={order} ref={noteRef} />
          {willEarn > 0 && <p className="glow-earn" style={{ marginTop: 14 }}>🧶 Cuando confirmemos tu pago sumarás <b>{fmtPts(willEarn)} Michipuntos</b></p>}
          <button className="glow-pay-btn" onClick={download} style={{ background: C.primary, boxShadow: "none", marginTop: 16 }}>Descargar mi notita</button>
          <button className="glow-pay-btn is-ghost" onClick={whatsapp} style={{ color: C.yape, borderColor: C.yape, marginTop: 8 }}>
            <MessageCircle size={18} /> Enviar a la tienda por WhatsApp
          </button>
        </>
      )}
    </div>
  );
}

function CartDrawer({ lines, total: subtotal, onClose, onSetQty, onClear, onOrder, settings, customer, onJoin }) {
  const [step, setStep] = useState("cart"); // 'cart' | 'yape'
  const [order, setOrder] = useState(null); // pedido ya registrado (muestra la notita)
  const [pts, setPts] = useState(null); // Michipuntos de la clienta
  const [reward, setReward] = useState(""); // clave del canje de Michipuntos o "credito"
  const [wallet, setWallet] = useState(null); // Michi-crédito
  useEffect(() => {
    if (!customer?.token) return;
    getMyPoints().then(setPts).catch(() => {});
    getMyCredits().then(setWallet).catch(() => {});
  }, [customer?.token]);
  const tier = pts?.rewards.find((r) => r.key === reward);
  const creditAmt = reward === "credito" && wallet && subtotal >= CREDIT_MIN ? round2(Math.min(wallet.balance, subtotal * CREDIT_SHARE)) : 0;
  // si cambia el carrito y el beneficio ya no aplica, se quita
  useEffect(() => {
    if ((tier && subtotal < tier.min) || (reward === "credito" && subtotal < CREDIT_MIN)) setReward("");
  }, [subtotal, tier, reward]);
  const discount = reward === "credito" ? creditAmt : tier ? tier.value : 0;
  const discountLabel = reward === "credito" ? "Michi-crédito" : "Michipuntos";
  const total = subtotal - discount;
  const weighted = lines.reduce((s, l) => s + l.qty * l.price * (l.doublePoints ? 2 : 1), 0);
  const willEarn = subtotal ? Math.floor(weighted * (total / subtotal) * (pts?.perSol || 1.25) * (pts?.level.mult || 1)) : 0;
  const yapeReady = !!(settings.yapeNumber || settings.yapeQr);
  useEffect(() => {
    if (lines.length === 0 && !order) setStep("cart");
  }, [lines.length, order]);
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, display: "flex", justifyContent: "flex-end", background: "#2e1b2c66", zIndex: 70 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 420, height: "100%", display: "flex", flexDirection: "column", background: C.surface }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ShoppingCart size={20} color={C.roseDeep} />
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 600, margin: 0 }}>{order ? "¡Listo!" : step === "yape" ? "Pagar con Yape" : "Tu pedido"}</h3>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.inkSoft }}><X size={22} /></button>
        </div>

        {step === "yape" ? (
          <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px 20px" }}>
            <YapeCheckout
              settings={settings}
              lines={lines}
              total={total}
              reward={reward === "credito" ? "" : reward}
              useCredit={reward === "credito"}
              discount={discount}
              discountLabel={discountLabel}
              customer={customer}
              willEarn={customer ? willEarn : 0}
              order={order}
              onBack={() => setStep("cart")}
              onDone={(o) => { setOrder(o); onClear(); }}
            />
          </div>
        ) : (
        <>
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px" }}>
          {lines.length === 0 ? (
            <p className="glow-soft" style={{ textAlign: "center", fontSize: 19, marginTop: 40 }}>Tu carrito está vacío.</p>
          ) : (
            lines.map((l) => (
              <div key={l.key || l.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${C.line}` }}>
                <Thumb src={l.images?.[0]} alt={l.name} size={52} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{l.name}</div>
                  <div style={{ color: C.plum, fontSize: 13 }}>{money(l.price)} c/u</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => onSetQty(l.key || l.id, l.qty - 1)} aria-label="Quitar uno" style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.line}`, background: C.bg, color: C.ink, display: "grid", placeItems: "center", cursor: "pointer" }}>
                    <Minus size={14} />
                  </button>
                  <span style={{ minWidth: 20, textAlign: "center", fontWeight: 600 }}>{l.qty}</span>
                  <button onClick={() => onSetQty(l.key || l.id, Math.min(l.qty + 1, l.stock))} disabled={l.qty >= l.stock} aria-label="Agregar uno" style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.line}`, background: C.bg, color: l.qty >= l.stock ? C.inkSoft : C.ink, display: "grid", placeItems: "center", cursor: l.qty >= l.stock ? "not-allowed" : "pointer" }}>
                    <Plus size={14} />
                  </button>
                  <button onClick={() => onSetQty(l.key || l.id, 0)} aria-label="Eliminar" style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "none", color: C.roseDeep, display: "grid", placeItems: "center", cursor: "pointer" }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ padding: "16px 20px", borderTop: `1px solid ${C.line}` }}>
          {lines.length > 0 && customer && <RewardPicker info={pts} wallet={wallet} subtotal={subtotal} value={reward} onChange={setReward} />}
          {tier?.surprise && <p className="glow-earn">🎁 Recibirás un regalo misterioso con tu pedido</p>}
          {discount > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: C.inkSoft, marginBottom: 4 }}>
              <span>Subtotal {money(subtotal)}</span><span style={{ color: C.antique, fontWeight: 700 }}>{discountLabel} −{money(discount)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
            <span style={{ color: C.inkSoft }}>Total <small>(sin envío)</small></span>
            <span style={{ fontSize: 22, fontWeight: 700 }}>{money(total)}</span>
          </div>
          {lines.length > 0 && <p style={{ margin: "0 0 8px", fontSize: 12, color: C.inkSoft }}>📍 Entrega gratis en Juliaca · 🚚 envío Shalom al resto del Perú</p>}
          {lines.length > 0 && (customer ? (
            <p className="glow-earn">🧶 Con esta compra ganarás <b>{fmtPts(willEarn)} Michipuntos</b></p>
          ) : onJoin ? (
            <button className="glow-earn is-join" onClick={onJoin}>🧶 Únete y gana <b>{fmtPts(Math.floor(weighted * 1.25) + 100)} Michipuntos</b> con esta compra</button>
          ) : null)}
          {yapeReady && (
            <button
              className="glow-pay-btn"
              onClick={() => setStep("yape")}
              disabled={lines.length === 0}
              style={{ background: lines.length === 0 ? C.line : C.yape, color: lines.length === 0 ? C.inkSoft : "#fff", marginBottom: 8 }}
            >
              <YapeMark /> Pagar con Yape
            </button>
          )}
          <button
            onClick={() => onOrder(false)}
            disabled={lines.length === 0}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "12px 0", borderRadius: 12, fontSize: 15, fontWeight: 600,
              border: yapeReady ? `2px solid ${lines.length === 0 ? C.line : C.primary}` : "none",
              background: yapeReady ? C.surface : lines.length === 0 ? C.line : C.primary,
              color: lines.length === 0 ? C.inkSoft : yapeReady ? C.primary : C.primaryInk,
              cursor: lines.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            <MessageCircle size={18} />
            {yapeReady ? "Consultar por WhatsApp" : "Finalizar pedido por WhatsApp"}
          </button>
          {lines.length > 0 && (
            <button onClick={onClear} style={{ width: "100%", marginTop: 8, padding: "8px 0", borderRadius: 12, border: "none", background: "none", color: C.inkSoft, fontWeight: 600, cursor: "pointer" }}>
              Vaciar carrito
            </button>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   VISTA ADMINISTRACIÓN — inventario, márgenes, ganancias, stock
========================================================================= */
function Admin({ products, settings, onSaveProduct, onRemoveProduct, onSaveSettings, onSaveSeasons, onImportFromBrowser, onAuthed }) {
  const [authed, setAuthed] = useState(false);
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState(null);
  const [tab, setTab] = useState("inventario");
  const [busy, setBusy] = useState(false);
  // Qué quedó guardado en este navegador (para ofrecer migrarlo).
  const [browserCount] = useState(() => readBrowserProducts().length);
  const [hasBrowserSettings] = useState(() => readBrowserSettings() != null);
  const [migrating, setMigrating] = useState(false);
  const [migrateMsg, setMigrateMsg] = useState("");
  const [migrated, setMigrated] = useState(false);

  const migrar = async () => {
    setMigrating(true);
    setMigrateMsg("");
    try {
      const { saved, settingsMigrated } = await onImportFromBrowser();
      setMigrated(true);
      const partes = [];
      if (saved > 0) partes.push(`${saved} producto(s)`);
      if (settingsMigrated) partes.push("los ajustes de la tienda");
      setMigrateMsg(
        partes.length
          ? `✅ Listo: se migró ${partes.join(" y ")} a la base de datos.`
          : "No había nada que migrar en este navegador."
      );
    } catch (e) {
      setMigrateMsg("❌ No se pudo migrar: " + e.message);
    } finally {
      setMigrating(false);
    }
  };

  const stats = useMemo(() => {
    let costValue = 0, revenue = 0, profit = 0, low = 0, units = 0;
    for (const p of products) {
      costValue += p.cost * p.stock;
      revenue += p.price * p.stock;
      profit += (p.price - p.cost) * p.stock;
      units += p.stock;
      if (p.stock <= settings.lowStock) low++;
    }
    return { costValue, revenue, profit, low, units };
  }, [products, settings.lowStock]);

  if (!authed) {
    const intentar = async () => {
      try {
        const ok = await checkPin(pin);
        if (ok) {
          setAdminPin(pin); // se recuerda para autorizar los cambios
          await onAuthed?.();
          setAuthed(true);
        } else {
          setErr("PIN incorrecto.");
        }
      } catch {
        setErr("No se pudo verificar (¿el servidor está encendido?).");
      }
    };
    return (
      <div style={{ display: "grid", placeItems: "center", padding: "0 20px", minHeight: "70vh" }}>
        <div style={{ width: "100%", maxWidth: 360, borderRadius: 16, padding: 28, textAlign: "center", background: C.surface, border: `1px solid ${C.line}` }}>
          <div style={{ width: 52, height: 52, borderRadius: 999, background: C.blush, display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
            <Lock size={22} color={C.roseDeep} />
          </div>
          <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 600, margin: 0 }}>Panel privado</h2>
          <p style={{ color: C.inkSoft, fontSize: 14, margin: "4px 0 20px" }}>Ingresa tu PIN para administrar la tienda.</p>
          <input
            type="password"
            value={pin}
            onChange={(e) => { setPin(e.target.value); setErr(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") intentar(); }}
            placeholder="••••"
            style={{
              width: "100%", textAlign: "center", fontSize: 18, padding: "12px 0", borderRadius: 12, outline: "none",
              letterSpacing: 6, border: `1px solid ${err ? C.warn : C.line}`, background: C.bg, color: C.ink,
            }}
          />
          {err && <p style={{ color: C.warn, fontSize: 13, marginTop: 8 }}>{err}</p>}
          <button onClick={intentar} style={{ width: "100%", marginTop: 16, padding: "12px 0", borderRadius: 12, border: "none", color: C.primaryInk, background: C.primary, fontWeight: 600 }}>
            Entrar
          </button>
          <p style={{ color: C.inkSoft, fontSize: 12, marginTop: 16 }}>
            PIN de demostración: <b>1234</b> (cámbialo en Ajustes).
          </p>
        </div>
      </div>
    );
  }

  const saveProduct = async (prod) => {
    setBusy(true);
    try {
      await onSaveProduct(prod);
      setEditing(null);
    } catch (e) {
      alert("No se pudo guardar el producto: " + e.message);
    } finally {
      setBusy(false);
    }
  };
  const removeProduct = async (id) => {
    if (!confirm("¿Seguro que quieres eliminar este producto?")) return;
    try {
      await onRemoveProduct(id);
    } catch (e) {
      alert("No se pudo eliminar: " + e.message);
    }
  };

  return (
    <div style={{ padding: "24px 20px", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 600, margin: 0 }}>Administración</h2>
        <button onClick={() => setAuthed(false)} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, background: "none", border: "none", color: C.inkSoft }}>
          <LogOut size={15} /> Salir
        </button>
      </div>

      <div style={{ display: "grid", gap: 12, marginBottom: 24, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
        <Card icon={<Package size={18} />} label="Inventario (al costo)" value={money(stats.costValue)} sub={`${stats.units} unidades`} />
        <Card icon={<Wallet size={18} />} label="Venta potencial" value={money(stats.revenue)} />
        <Card icon={<TrendingUp size={18} />} label="Ganancia potencial" value={money(stats.profit)} accent />
        <Card icon={<AlertTriangle size={18} />} label="Stock bajo" value={String(stats.low)} sub={`≤ ${settings.lowStock} unid.`} warn={stats.low > 0} />
      </div>

      <div className="glow-admin-tabs">
        {[["inventario", "Inventario"], ["pedidos", "Pedidos"], ["clientas", "Clientas"], ["resenas", "Reseñas"], ["temporadas", "Temporadas"], ["ajustes", "Ajustes"]].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{ padding: "8px 16px", borderRadius: 8, fontSize: 14, border: "none", fontWeight: 600, background: tab === k ? C.ink : "transparent", color: tab === k ? "#fff" : C.inkSoft }}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Migración: datos guardados en este navegador (versión vieja). */}
      {(browserCount > 0 || hasBrowserSettings) && !migrated && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, padding: "14px 16px", marginBottom: 16, borderRadius: 14, background: C.blush, border: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Package size={18} color={C.roseDeep} />
            <div>
              <div style={{ fontWeight: 600 }}>
                {browserCount > 0
                  ? `Tienes ${browserCount} producto(s)${hasBrowserSettings ? " y tus ajustes" : ""} guardados en este navegador`
                  : "Tienes ajustes guardados en este navegador"}
              </div>
              <div style={{ color: C.inkSoft, fontSize: 13 }}>
                Pásalos a la base de datos para tenerlos en cualquier dispositivo.
              </div>
            </div>
          </div>
          <button
            onClick={migrar}
            disabled={migrating}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px", borderRadius: 10, border: "none", color: C.primaryInk, background: C.primary, fontWeight: 600, cursor: migrating ? "wait" : "pointer", opacity: migrating ? 0.7 : 1 }}
          >
            {migrating ? "Migrando…" : "Importar de este navegador"}
          </button>
        </div>
      )}
      {migrateMsg && (
        <div style={{ padding: "12px 16px", marginBottom: 16, borderRadius: 14, background: C.surface, border: `1px solid ${C.line}`, fontWeight: 600 }}>
          {migrateMsg}
        </div>
      )}

      {tab === "inventario" ? (
        <div style={{ borderRadius: 16, overflow: "hidden", background: C.surface, border: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: `1px solid ${C.line}` }}>
            <span style={{ fontWeight: 600 }}>Productos ({products.length})</span>
            <button onClick={() => setEditing({})} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, border: "none", color: C.primaryInk, background: C.primary, fontWeight: 600 }}>
              <Plus size={16} /> Agregar
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ color: C.inkSoft, textAlign: "left" }}>
                  {["Producto", "Compra", "Venta", "Margen", "Stock", ""].map((h, i) => (
                    <th key={i} style={{ padding: "10px 16px", fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const margin = p.price - p.cost;
                  const pct = p.price > 0 ? Math.round((margin / p.price) * 100) : 0;
                  const low = p.stock <= settings.lowStock;
                  return (
                    <tr key={p.id} style={{ borderTop: `1px solid ${C.line}` }}>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Thumb src={p.images?.[0]} alt={p.name} size={40} />
                          <div>
                            <div style={{ fontWeight: 600 }}>{p.name}</div>
                            <div style={{ color: C.inkSoft, fontSize: 12 }}>{p.category}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", color: C.inkSoft }}>{money(p.cost)}</td>
                      <td style={{ padding: "12px 16px", fontWeight: 600 }}>{money(p.price)}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ color: margin >= 0 ? C.ok : C.warn, fontWeight: 600 }}>{money(margin)}</span>
                        <span style={{ color: C.inkSoft, fontSize: 12 }}> · {pct}%</span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: low ? "#FBE9DC" : C.blush, color: low ? C.warn : C.roseDeep }}>
                          {p.stock} unid.
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                          <button onClick={() => setEditing(p)} style={{ padding: 6, borderRadius: 8, border: "none", background: "none", color: C.inkSoft }}><Pencil size={16} /></button>
                          <button onClick={() => removeProduct(p.id)} style={{ padding: 6, borderRadius: 8, border: "none", background: "none", color: C.roseDeep }}><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === "pedidos" ? (
        <OrdersPanel />
      ) : tab === "resenas" ? (
        <ReviewsPanel />
      ) : tab === "clientas" ? (
        <CustomersPanel />
      ) : tab === "temporadas" ? (
        <SeasonsPanel settings={settings} onSave={onSaveSeasons} />
      ) : (
        <SettingsPanel settings={settings} onSave={onSaveSettings} />
      )}

      {editing && <ProductForm initial={editing} busy={busy} onSave={saveProduct} onClose={() => setEditing(null)} />}
    </div>
  );
}

function Card({ icon, label, value, sub, accent, warn }) {
  return (
    <div style={{ borderRadius: 16, padding: 16, background: accent ? C.ink : C.surface, border: `1px solid ${accent ? C.ink : C.line}`, color: accent ? "#fff" : C.ink }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: accent ? C.blush : warn ? C.warn : C.roseDeep }}>
        {icon}
        <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: accent ? "#ffffffaa" : C.inkSoft, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function ProductForm({ initial, busy, onSave, onClose }) {
  const [f, setF] = useState({
    id: initial.id || "",
    name: initial.name || "",
    category: initial.category || WORLDS.michi.cats[0],
    cost: initial.cost ?? "",
    price: initial.price ?? "",
    stock: initial.stock ?? "",
    emoji: initial.emoji || "✨",
    images: initial.images || (initial.image ? [initial.image] : []),
    desc: initial.desc || "",
    doublePoints: !!initial.doublePoints,
    details: initial.details || {},
  });
  const setD = (k, v) => setF((s) => ({ ...s, details: { ...s.details, [k]: v } }));
  const toggleIn = (k, v) => setF((s) => {
    const list = s.details[k] || [];
    return { ...s, details: { ...s.details, [k]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] } };
  });
  const fw = worldOf(f.category);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const valid = f.name.trim() && f.cost !== "" && f.price !== "" && f.stock !== "";

  const [imgErr, setImgErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const addImage = (url) => setF((s) => ({ ...s, images: [...s.images, url] }));
  const removeImage = (i) => setF((s) => ({ ...s, images: s.images.filter((_, k) => k !== i) }));

  // Sube las fotos al servidor: primero se comprimen en el navegador y luego
  // se envían; el servidor las guarda como archivos y devuelve sus URLs.
  const onPickImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const dataUrls = await Promise.all(files.map((file) => fileToDataURL(file)));
      const urls = await uploadImages(dataUrls);
      setF((s) => ({ ...s, images: [...s.images, ...urls] }));
      setImgErr("");
    } catch {
      setImgErr("No se pudo subir alguna imagen. Revisa tu conexión con el servidor.");
    } finally {
      setUploading(false);
      e.target.value = ""; // permite volver a elegir los mismos archivos
    }
  };
  const addUrl = () => {
    const u = urlInput.trim();
    if (!u) return;
    addImage(u);
    setUrlInput("");
  };

  const submit = () => {
    if (!valid) return;
    // Solo se guardan los datos extra de la sección del producto.
    const d = f.details || {};
    const details = fw === "skin"
      ? { step: d.step, skinTypes: d.skinTypes, concerns: d.concerns, size: d.size, ingredients: d.ingredients, usage: d.usage, nso: d.nso }
      : fw === "kids" ? { sizes: d.sizes } : {};
    onSave({ ...f, details, cost: Number(f.cost), price: Number(f.price), stock: Number(f.stock) });
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", padding: 16, background: "#2e1b2c66", zIndex: 50 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, borderRadius: 16, padding: 24, maxHeight: "100%", overflowY: "auto", background: C.surface }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 600, margin: 0 }}>
            {f.id ? "Editar producto" : "Nuevo producto"}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.inkSoft }}><X size={20} /></button>
        </div>

        <Field label="Nombre"><Inp value={f.name} onChange={(v) => set("name", v)} placeholder="Aretes Michi Cristal" /></Field>
        <Field label="Categoría">
          <select value={f.category} onChange={(e) => set("category", e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 12, outline: "none", border: `1px solid ${C.line}`, background: C.bg, color: C.ink }}>
            {WORLD_KEYS.map((k) => (
              <optgroup key={k} label={`${WORLDS[k].emoji} ${WORLDS[k].name}`}>
                {WORLDS[k].cats.map((c) => <option key={c}>{c}</option>)}
              </optgroup>
            ))}
          </select>
        </Field>
        {fw === "skin" && (
          <div className="glow-pf-extra is-skin">
            <b>✨ Datos de Glow Skin</b>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Contenido"><Inp value={f.details.size || ""} onChange={(v) => setD("size", v)} placeholder="30 ml" /></Field>
              <Field label="Paso de la rutina">
                <select value={f.details.step || ""} onChange={(e) => setD("step", e.target.value)} className="glow-pf-select">
                  <option value="">— No va en la rutina —</option>
                  {ROUTINE_STEPS.map((s) => <option key={s.key} value={s.key}>{s.emoji} {s.label}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Para piel"><div className="glow-pf-chips">{SKIN_TYPES.map((t) => <button type="button" key={t} className={(f.details.skinTypes || []).includes(t) ? "is-on" : ""} onClick={() => toggleIn("skinTypes", t)}>{t}</button>)}</div></Field>
            <Field label="Ayuda con"><div className="glow-pf-chips">{CONCERNS.map((t) => <button type="button" key={t} className={(f.details.concerns || []).includes(t) ? "is-on" : ""} onClick={() => toggleIn("concerns", t)}>{t}</button>)}</div></Field>
            <Field label="Ingredientes clave"><Inp value={f.details.ingredients || ""} onChange={(v) => setD("ingredients", v)} placeholder="Vitamina C 10%, ácido hialurónico" /></Field>
            <Field label="Modo de uso"><Inp value={f.details.usage || ""} onChange={(v) => setD("usage", v)} placeholder="3 gotitas en la noche sobre la piel limpia" /></Field>
            <Field label="Notificación Sanitaria (NSO)"><Inp value={f.details.nso || ""} onChange={(v) => setD("nso", v)} placeholder="NSOC12345-23PE" /></Field>
          </div>
        )}
        {fw === "kids" && (
          <div className="glow-pf-extra is-kids">
            <b>🧸 Datos de Glow Kids</b>
            <Field label="Tallas disponibles"><div className="glow-pf-chips">{(f.category === "Zapatitos" ? SHOE_SIZES : KID_SIZES).map((t) => <button type="button" key={t} className={(f.details.sizes || []).includes(t) ? "is-on" : ""} onClick={() => toggleIn("sizes", t)}>{t}</button>)}</div></Field>
            <p className="glow-pf-hint">💡 La tienda recomienda la talla según la estatura del peque (tabla: 2 → hasta 98 cm, 4 → 112, 6 → 124, 8 → 136, 10 → 146).</p>
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="P. compra (S/)"><Inp type="number" value={f.cost} onChange={(v) => set("cost", v)} placeholder="8" /></Field>
          <Field label="P. venta (S/)"><Inp type="number" value={f.price} onChange={(v) => set("price", v)} placeholder="18" /></Field>
          <Field label="Stock"><Inp type="number" value={f.stock} onChange={(v) => set("stock", v)} placeholder="12" /></Field>
        </div>
        <Field label="Imágenes del producto (opcional)">
          {f.images.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              {f.images.map((src, i) => (
                <div key={i} style={{ position: "relative", width: 64, height: 64, borderRadius: 12, overflow: "hidden", background: C.bg, border: `1px solid ${C.line}` }}>
                  <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    aria-label="Quitar imagen"
                    style={{ position: "absolute", top: 2, right: 2, width: 20, height: 20, borderRadius: 999, border: "none", background: "#2e1b2ccc", color: "#fff", display: "grid", placeItems: "center", cursor: "pointer", padding: 0 }}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.bg, color: C.ink, fontSize: 13, fontWeight: 600, cursor: uploading ? "wait" : "pointer", width: "fit-content", opacity: uploading ? 0.6 : 1 }}>
            <ImageIcon size={15} /> {uploading ? "Subiendo…" : "Subir imágenes"}
            <input type="file" accept="image/*" multiple disabled={uploading} onChange={onPickImages} style={{ display: "none" }} />
          </label>
          {imgErr && <p style={{ color: C.warn, fontSize: 12, margin: "6px 0 0" }}>{imgErr}</p>}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <Inp value={urlInput} onChange={setUrlInput} placeholder="…o pega una URL: https://…" />
            <button type="button" onClick={addUrl} disabled={!urlInput.trim()} style={{ flexShrink: 0, padding: "0 14px", borderRadius: 12, border: "none", fontWeight: 600, color: C.primaryInk, background: urlInput.trim() ? C.primary : C.line, cursor: urlInput.trim() ? "pointer" : "not-allowed" }}>
              Agregar
            </button>
          </div>
        </Field>
        <Field label="Descripción"><Inp value={f.desc} onChange={(v) => set("desc", v)} placeholder="Acabado mate de larga duración." /></Field>
        <label className="glow-switch" style={{ marginBottom: 12 }}>
          <input type="checkbox" checked={!!f.doublePoints} onChange={(e) => set("doublePoints", e.target.checked)} />
          <span />
          <div><b>×2 Michipuntos</b><small>Da el doble de Michipuntos: úsalo para rotar productos que se venden lento.</small></div>
        </label>

        {f.cost !== "" && f.price !== "" && (
          <p style={{ color: C.inkSoft, fontSize: 13, marginBottom: 12 }}>
            Margen: <b style={{ color: C.ok }}>{money(Number(f.price) - Number(f.cost))}</b> por unidad
          </p>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} disabled={busy} style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: `1px solid ${C.line}`, background: "none", color: C.inkSoft, fontWeight: 600 }}>Cancelar</button>
          <button onClick={submit} disabled={!valid || busy || uploading} style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "none", color: valid && !busy ? C.primaryInk : C.inkSoft, background: valid && !busy ? C.primary : C.line, fontWeight: 600, cursor: valid && !busy ? "pointer" : "not-allowed" }}>{busy ? "Guardando…" : "Guardar"}</button>
        </div>
      </div>
    </div>
  );
}

// Pedidos pagados con Yape: captura, Nro. de operación y estado.
const STATUS_INFO = {
  pendiente: { label: "Por verificar", color: "#D48A12", bg: "#FFF6E5" },
  verificado: { label: "Pago verificado", color: "#1FA971", bg: "#EAF8F1" },
  enviado: { label: "Enviado", color: "#742284", bg: "#F4ECF8" },
  rechazado: { label: "Rechazado", color: "#C0392B", bg: "#FDECEA" },
};

function OrdersPanel() {
  const [orders, setOrders] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    getOrders().then(setOrders).catch((e) => setErr(e.message));
  }, []);
  const change = async (id, status) => {
    try {
      const o = await setOrderStatus(id, status);
      setOrders((list) => list.map((x) => (x.id === id ? o : x)));
    } catch (e) {
      alert("No se pudo cambiar el estado: " + e.message);
    }
  };
  const clearTests = async () => {
    if (!confirm("¿Borrar todos los pedidos de prueba?")) return;
    try {
      await deleteTestOrders();
      setOrders((list) => list.filter((x) => !x.isTest));
    } catch (e) {
      alert("No se pudieron borrar: " + e.message);
    }
  };
  if (err) return <p style={{ color: C.warn }}>{err}</p>;
  if (!orders) return <p style={{ color: C.inkSoft }}>Cargando pedidos…</p>;
  const tests = orders.filter((o) => o.isTest).length;
  if (orders.length === 0)
    return (
      <div style={{ borderRadius: 16, padding: 24, background: C.surface, border: `1px solid ${C.line}`, color: C.inkSoft }}>
        Aún no hay pedidos pagados con Yape. Aparecerán aquí con la captura del comprobante.
      </div>
    );
  return (
    <div className="glow-orders">
      {tests > 0 && (
        <button onClick={clearTests} style={{ justifySelf: "start", padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.surface, color: C.warn, fontWeight: 700 }}>
          Borrar {tests} pedido{tests > 1 ? "s" : ""} de prueba
        </button>
      )}
      {orders.map((o) => {
        const st = STATUS_INFO[o.status] || STATUS_INFO.pendiente;
        return (
          <div key={o.id} className="glow-order" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
            {o.capture ? (
              <a href={o.capture} target="_blank" rel="noreferrer" className="glow-order-shot" title="Ver captura">
                <img src={o.capture} alt="Captura del Yape" />
              </a>
            ) : <div className="glow-order-shot" />}
            <div className="glow-order-info">
              <div className="glow-order-head">
                <b>#{o.code} {o.isTest && <span className="glow-test-tag">PRUEBA</span>}</b>
                <span>{new Date(o.createdAt).toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" })}</span>
              </div>
              <div style={{ fontSize: 13, color: C.plum, margin: "4px 0" }}>
                {o.items.map((l) => (l.gift ? `🎁 SORPRESA: ${l.name}` : `${l.qty}× ${l.name}`)).join(" · ")}
              </div>
              {o.delivery && (
                <div className="glow-order-deliv">
                  {o.delivery.type === "juliaca" ? (
                    <>📍 <b>Juliaca · {o.delivery.point}</b> (gratis){o.delivery.date ? <> · <b>🕒 {whenText(o.delivery.date, o.delivery.time)}</b></> : ""}</>
                  ) : (
                    <>🚚 <b>Shalom · {o.delivery.department}{o.delivery.province ? ` › ${o.delivery.province}` : ""} › {o.delivery.district || o.delivery.city}</b>{o.delivery.agency ? ` · agencia ${o.delivery.agency}` : ""} · envío {money(o.shipping)} · DNI {o.delivery.dni}</>
                  )}
                  <br />{o.delivery.name} · {o.delivery.phone}{o.delivery.note ? ` · «${o.delivery.note}»` : ""}
                </div>
              )}
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "baseline" }}>
                <b style={{ fontSize: 18 }}>{money(o.total)}</b>
                {o.discount > 0 && <span style={{ fontSize: 12, color: C.antique, fontWeight: 700 }}>(canjeó {o.rewardPoints} Michipuntos · −{money(o.discount)})</span>}
                {o.creditUsed > 0 && <span style={{ fontSize: 12, color: C.antique, fontWeight: 700 }}>(usó Michi-crédito −{money(o.creditUsed)})</span>}
                <span style={{ fontSize: 13 }}>Yape op. <b style={{ fontFamily: "monospace", color: C.yape }}>{o.yapeOp}</b></span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
                {o.status === "pendiente" && (
                  <>
                    <button className="glow-admin-ok" onClick={() => change(o.id, "verificado")}>✓ Confirmar pago</button>
                    <button className="glow-admin-no" onClick={() => confirm(`¿Rechazar el pago del pedido #${o.code}? Se devolverán sus Michipuntos canjeados.`) && change(o.id, "rechazado")}>✗ Rechazar</button>
                  </>
                )}
                {o.status === "verificado" && (
                  <button className="glow-admin-ship" onClick={() => change(o.id, "enviado")}>📦 Marcar como enviado</button>
                )}
                <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999, color: st.color, background: st.bg }}>{st.label}</span>
                <select value={o.status} disabled={o.status === "rechazado"} onChange={(e) => change(o.id, e.target.value)} style={{ padding: "6px 8px", borderRadius: 8, border: `1px solid ${C.line}`, background: C.bg, fontSize: 13 }}>
                  {Object.entries(STATUS_INFO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Envíos: puntos de entrega gratis en Juliaca y tarifas Shalom por departamento.
function ShippingSettings({ value, onChange }) {
  const v = value || { juliacaPoints: [], defaultRate: 12, rates: {} };
  const [deps, setDeps] = useState([]);
  useEffect(() => {
    getConfig().then((c) => setDeps(c.departments || [])).catch(() => {});
  }, []);
  const setRate = (dep, r) => onChange({ ...v, rates: { ...v.rates, [dep]: r === "" ? "" : Number(r) } });
  return (
    <div style={{ margin: "18px 0 6px", paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
      <div style={{ fontWeight: 700, color: C.aubergine, marginBottom: 4 }}>🚚 Entregas y envíos</div>
      <p style={{ margin: "0 0 12px", color: C.inkSoft, fontSize: 13 }}>
        En Juliaca la entrega es gratis en los puntos que pongas aquí. Para el resto del Perú, pon la tarifa de Shalom por departamento
        (revísala en el <a href="https://shalom.com.pe/" target="_blank" rel="noreferrer">cotizador de Shalom</a>).
      </p>
      <Field label="Puntos de encuentro en Juliaca y horarios">
        <div className="glow-pt-edit">
          {v.juliacaPoints.map((p, i) => {
            const upd = (k, x) => onChange({ ...v, juliacaPoints: v.juliacaPoints.map((q, j) => (j === i ? { ...q, [k]: x } : q)) });
            return (
              <div key={i} className="glow-pt-row">
                <div className="glow-pt-top">
                  <input value={p.name} onChange={(e) => upd("name", e.target.value)} placeholder="Lugar de encuentro" />
                  <button type="button" aria-label="Quitar punto" onClick={() => onChange({ ...v, juliacaPoints: v.juliacaPoints.filter((_, j) => j !== i) })}><Trash2 size={15} /></button>
                </div>
                <div className="glow-pt-days">
                  {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                    const on = (p.days || []).includes(d);
                    return (
                      <button key={d} type="button" className={on ? "is-on" : ""} aria-pressed={on}
                        onClick={() => upd("days", on ? p.days.filter((x) => x !== d) : [...(p.days || []), d])}>{DAY_SHORT[d]}</button>
                    );
                  })}
                </div>
                <div className="glow-pt-hours">
                  <label>Desde{" "}
                    <select value={p.from || "10:00"} onChange={(e) => {
                      const from = e.target.value;
                      onChange({ ...v, juliacaPoints: v.juliacaPoints.map((q, j) => (j === i ? { ...q, from, to: q.to > from ? q.to : HALF_HOURS[HALF_HOURS.indexOf(from) + 1] } : q)) });
                    }}>
                      {HALF_HOURS.slice(0, -1).map((t) => <option key={t} value={t}>{hour12(t)}</option>)}
                    </select>
                  </label>
                  <label>Hasta{" "}
                    <select value={p.to || "18:00"} onChange={(e) => upd("to", e.target.value)}>
                      {HALF_HOURS.filter((t) => t > (p.from || "10:00")).map((t) => <option key={t} value={t}>{hour12(t)}</option>)}
                    </select>
                  </label>
                </div>
              </div>
            );
          })}
          <button type="button" className="glow-pt-add" onClick={() => onChange({ ...v, juliacaPoints: [...v.juliacaPoints, { name: "", days: [1, 2, 3, 4, 5, 6], from: "10:00", to: "18:00" }] })}>
            <Plus size={15} /> Agregar punto
          </button>
        </div>
      </Field>
      <Field label="Tarifa Shalom por defecto (S/)">
        <Inp type="number" value={v.defaultRate} onChange={(x) => onChange({ ...v, defaultRate: Number(x) })} />
      </Field>
      <details className="glow-rates" style={{ marginBottom: 10 }}>
        <summary>Agencias Shalom sugeridas por departamento</summary>
        <p style={{ margin: "0 0 8px", color: C.inkSoft, fontSize: 12.5 }}>
          Una por línea, por ejemplo «Juliaca – Jr. Mariano Núñez 123». La clienta las verá en una lista (y podrá escribir otra).
          Búscalas en <a href="https://shalom.com.pe/agencias" target="_blank" rel="noreferrer">shalom.com.pe/agencias</a>.
        </p>
        <div className="glow-agency-edit">
          {deps.map((d) => {
            const list = (v.agencies || {})[d] || [];
            return (
              <label key={d}>
                <span>{d}{list.length ? ` (${list.length})` : ""}</span>
                <textarea
                  rows={list.length ? Math.min(6, list.length + 1) : 1}
                  value={list.join("\n")}
                  placeholder="Sin agencias sugeridas"
                  onChange={(e) => onChange({ ...v, agencies: { ...(v.agencies || {}), [d]: e.target.value.split("\n") } })}
                  onBlur={(e) => onChange({ ...v, agencies: { ...(v.agencies || {}), [d]: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) } })}
                />
              </label>
            );
          })}
        </div>
      </details>
      <details className="glow-rates">
        <summary>Tarifa por departamento (vacío = usa la de por defecto)</summary>
        <div className="glow-rates-grid">
          {deps.map((d) => (
            <label key={d}>
              <span>{d}</span>
              <input type="number" min="0" step="0.5" value={v.rates?.[d] ?? ""} placeholder={String(v.defaultRate)} onChange={(e) => setRate(d, e.target.value)} />
            </label>
          ))}
        </div>
      </details>
    </div>
  );
}

// Clientas registradas con Google.
function CustomersPanel() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [testTo, setTestTo] = useState("");
  const load = () => getCustomers().then(setData).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(""), 3500); };
  const resend = async (c) => {
    try {
      await sendWelcomeMail(c.email);
      flash(`✓ Bienvenida enviada a ${c.email}`);
      load();
    } catch (e) {
      flash("✗ " + e.message);
    }
  };
  const test = async () => {
    try {
      await sendWelcomeMail(testTo.trim(), true);
      flash(`✓ Correo de prueba enviado a ${testTo.trim()}. Revisa también Promociones y Spam.`);
    } catch (e) {
      flash("✗ " + e.message);
    }
  };
  if (err) return <p style={{ color: C.warn }}>{err}</p>;
  if (!data) return <p style={{ color: C.inkSoft }}>Cargando clientas…</p>;
  const list = data.customers.filter((c) => `${c.name} ${c.email} ${c.district}`.toLowerCase().includes(q.toLowerCase()));
  const subs = data.customers.filter((c) => c.newsletter);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(subs.map((c) => c.email).join(", "));
      flash(`✓ ${subs.length} correos copiados`);
    } catch {
      flash("No se pudo copiar");
    }
  };
  const date = (d) => (d ? new Date(d).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" }) : "—");
  return (
    <div className="glow-cust">
      <div className="glow-cust-stats">
        <div><b>{data.customers.length}</b><span>clientas registradas</span></div>
        <div><b>{subs.length}</b><span>aceptan novedades</span></div>
        <div><b>{data.customers.filter((c) => c.orders > 0).length}</b><span>ya compraron</span></div>
        <div><b>{money(data.customers.reduce((s, c) => s + c.spent, 0))}</b><span>vendido a clientas del club</span></div>
      </div>

      <div className="glow-cust-tools">
        <input className="glow-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, correo o distrito…" />
        <button className="glow-cust-btn" onClick={copy} disabled={!subs.length}>📋 Copiar correos que aceptan novedades</button>
      </div>

      <div className={`glow-cust-mail${data.mail ? " is-on" : ""}`}>
        {data.mail ? (
          <>
            <span>✉️ Correo de bienvenida <b>activado</b>: se envía solo cuando una clienta se registra.</span>
            <span className="glow-cust-test">
              <input className="glow-input" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="tu correo" />
              <button className="glow-cust-btn" onClick={test} disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testTo.trim())}>Enviarme una prueba</button>
            </span>
          </>
        ) : (
          <span>✉️ El correo de bienvenida está <b>desactivado</b>: falta conectar Brevo (BREVO_API_KEY y MAIL_FROM).</span>
        )}
      </div>
      {msg && <p className="glow-cust-flash">{msg}</p>}

      {list.length === 0 ? (
        <div style={{ borderRadius: 16, padding: 24, background: C.surface, border: `1px solid ${C.line}`, color: C.inkSoft }}>
          {data.customers.length ? "Nadie coincide con tu búsqueda." : "Aún no hay clientas registradas. Aparecerán aquí cuando se unan con Google."}
        </div>
      ) : (
        <div className="glow-cust-list">
          {list.map((c) => (
            <div key={c.email} className="glow-cust-card">
              <CatAvatar customer={c} size={46} />
              <div className="glow-cust-info">
                <div className="glow-cust-top">
                  <b>{c.name || "Sin nombre"}</b>
                  {c.newsletter ? <span className="glow-chip" style={{ color: "#1FA971", background: "#EAF8F1" }}>✉️ novedades</span>
                    : <span className="glow-chip" style={{ color: "#857C8A", background: "#F4ECF3" }}>sin novedades</span>}
                </div>
                <div className="glow-cust-sub">{c.email}{c.phone ? ` · ${c.phone}` : ""}{c.district ? ` · ${c.district}` : ""}</div>
                <div className="glow-cust-nums">
                  <span>🛍️ <b>{c.orders}</b> pedido{c.orders === 1 ? "" : "s"} · {money(c.spent)}</span>
                  <span>🧶 <b>{fmtPts(c.points)}</b> Michipuntos</span>
                  {c.credit > 0 && <span>💰 <b>{money(c.credit)}</b> crédito</span>}
                  {c.birthday && <span>🎂 {new Date(c.birthday + "T12:00").toLocaleDateString("es-PE", { day: "numeric", month: "long" })}</span>}
                </div>
                <div className="glow-cust-foot">
                  <span>Se unió el {date(c.createdAt)} · última visita {date(c.lastLogin)}</span>
                  {data.mail && (
                    c.welcomeSent
                      ? <button className="glow-inline-link" onClick={() => resend(c)}>Reenviar bienvenida</button>
                      : <button className="glow-inline-link" onClick={() => resend(c)} style={{ color: C.warn }}>Bienvenida no enviada · enviar</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Reseñas por revisar: al aprobar, la clienta recibe sus Michipuntos.
function ReviewsPanel() {
  const [list, setList] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    getAdminReviews().then(setList).catch((e) => setErr(e.message));
  }, []);
  const change = async (id, status) => {
    try {
      const r = await setReviewStatus(id, status);
      setList((l) => l.map((x) => (x.id === id ? { ...x, status: r.status } : x)));
    } catch (e) {
      alert("No se pudo guardar: " + e.message);
    }
  };
  if (err) return <p style={{ color: C.warn }}>{err}</p>;
  if (!list) return <p style={{ color: C.inkSoft }}>Cargando reseñas…</p>;
  if (!list.length)
    return <div style={{ borderRadius: 16, padding: 24, background: C.surface, border: `1px solid ${C.line}`, color: C.inkSoft }}>Aún no hay reseñas.</div>;
  return (
    <div className="glow-orders">
      <p style={{ margin: 0, color: C.inkSoft, fontSize: 13 }}>
        Aprueba solo reseñas reales. Con foto del producto: +{REVIEW_PTS.photo} Michipuntos · solo texto: +{REVIEW_PTS.text}. Las aprobadas se muestran en la tienda.
      </p>
      {list.map((r) => (
        <div key={r.id} className="glow-order" style={{ background: C.surface, border: `1px solid ${C.line}` }}>
          {r.photo ? (
            <a href={r.photo} target="_blank" rel="noreferrer" className="glow-order-shot"><img src={r.photo} alt="Foto de la reseña" /></a>
          ) : <div className="glow-order-shot" style={{ display: "grid", placeItems: "center", color: C.inkSoft, fontSize: 12 }}>sin foto</div>}
          <div className="glow-order-info">
            <div className="glow-order-head"><b>{r.productName}</b><span>{new Date(r.createdAt).toLocaleDateString("es-PE")}</span></div>
            <div style={{ fontSize: 13, color: C.plum }}>{r.name} · {r.email} · pedido #GLW-{String(r.orderId).padStart(4, "0")}</div>
            <div style={{ margin: "4px 0" }}><Stars value={r.rating} size={16} /></div>
            <p style={{ margin: "0 0 8px", fontSize: 14, color: C.ink }}>{r.text}</p>
            {r.status === "pendiente" ? (
              <div style={{ display: "flex", gap: 8 }}>
                <button className="glow-admin-ok" onClick={() => change(r.id, "aprobada")}>✓ Aprobar · +{r.photo ? REVIEW_PTS.photo : REVIEW_PTS.text}</button>
                <button className="glow-admin-no" onClick={() => change(r.id, "rechazada")}>✗ Rechazar</button>
              </div>
            ) : (
              <span className="glow-chip" style={r.status === "aprobada" ? { color: "#1FA971", background: "#EAF8F1" } : { color: "#C0392B", background: "#FDECEA" }}>
                {r.status === "aprobada" ? "Aprobada" : "Rechazada"}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Pestaña "Temporadas": cada fecha se activa sola en sus semanas.
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];
const dayMonthText = (v) => { const [m, d] = v.split("-").map(Number); return `${d} ${MONTHS[m - 1]}`; };

function DayMonth({ value, onChange }) {
  const [m, d] = value.split("-");
  const set = (mm, dd) => onChange(`${mm}-${dd}`);
  return (
    <span className="glow-dm">
      <select value={d} onChange={(e) => set(m, e.target.value)} aria-label="Día">
        {Array.from({ length: 31 }, (_, k) => String(k + 1).padStart(2, "0")).map((x) => <option key={x} value={x}>{Number(x)}</option>)}
      </select>
      <select value={m} onChange={(e) => set(e.target.value, d)} aria-label="Mes">
        {MONTHS.map((x, k) => <option key={x} value={String(k + 1).padStart(2, "0")}>{x}</option>)}
      </select>
    </span>
  );
}

function SeasonsPanel({ settings, onSave }) {
  const [list, setList] = useState(() => seasonList(settings.seasons));
  const [open, setOpen] = useState("");
  const [state, setState] = useState(""); // '' | 'saving' | 'ok' | mensaje de error
  const set = (key, patch) => { setList((l) => l.map((s) => (s.key === key ? { ...s, ...patch } : s))); setState(""); };
  const save = async () => {
    setState("saving");
    try {
      // Solo las que ya tienen diseño (las demás se encenderán al estar listas).
      await onSave(Object.fromEntries(list.filter((s) => s.ready).map((s) => [s.key, { on: s.on, from: s.from, to: s.to, title: s.title, text: s.text, cta: s.cta }])));
      setState("ok");
    } catch (e) {
      setState(e.message);
    }
  };
  // Primero las listas, de la más próxima a la más lejana.
  const sorted = [...list].sort((a, b) => Number(b.ready) - Number(a.ready) || daysUntil(a) - daysUntil(b));

  return (
    <div className="glow-seasons">
      <p className="glow-seasons-intro">
        La tienda se decora sola en estas fechas y vuelve a la normalidad al terminar. Cada una se puede apagar,
        cambiar de fecha o cambiar el texto de su banner.
      </p>
      {sorted.map((s) => {
        const now = s.on && inRange(s);
        const days = daysUntil(s);
        return (
          <div key={s.key} className={`glow-season${now ? " is-now" : ""}${s.ready ? "" : " is-soon"}`}>
            <div className="glow-season-row">
              <span className="glow-season-emoji">{s.emoji}</span>
              <div className="glow-season-info">
                <b>{s.name}</b>
                <small>
                  {dayMonthText(s.from)} → {dayMonthText(s.to)}
                  {!s.ready ? " · diseño en camino ✨" : now ? " · ¡activa ahora!" : s.on ? ` · empieza en ${days} día${days === 1 ? "" : "s"}` : " · apagada"}
                </small>
              </div>
              {s.ready && (
                <div className="glow-season-actions">
                  <a className="glow-season-see" href={`/?tema=${s.key}`} target="_blank" rel="noreferrer">Ver cómo se ve</a>
                  <button className="glow-season-edit" onClick={() => setOpen(open === s.key ? "" : s.key)}>{open === s.key ? "Cerrar" : "Editar"}</button>
                  <label className="glow-switch" title={s.on ? "Encendida" : "Apagada"}>
                    <input type="checkbox" checked={s.on} onChange={(e) => set(s.key, { on: e.target.checked })} aria-label={`${s.name} encendida`} />
                    <span />
                  </label>
                </div>
              )}
            </div>
            {open === s.key && (
              <div className="glow-season-form">
                <div className="glow-season-dates">
                  <label>Desde <DayMonth value={s.from} onChange={(v) => set(s.key, { from: v })} /></label>
                  <label>Hasta <DayMonth value={s.to} onChange={(v) => set(s.key, { to: v })} /></label>
                </div>
                <Field label="Título del banner"><Inp value={s.title} onChange={(v) => set(s.key, { title: v })} /></Field>
                <Field label="Texto"><Inp value={s.text} onChange={(v) => set(s.key, { text: v })} /></Field>
                <Field label="Botón"><Inp value={s.cta} onChange={(v) => set(s.key, { cta: v })} /></Field>
              </div>
            )}
          </div>
        );
      })}
      <div className="glow-seasons-save">
        <button onClick={save} disabled={state === "saving"} style={{ background: C.ink }}>{state === "saving" ? "Guardando…" : "Guardar temporadas"}</button>
        {state === "ok" && <span style={{ color: C.ok }}>✓ Guardado</span>}
        {state && state !== "ok" && state !== "saving" && <span style={{ color: C.warn }}>{state}</span>}
      </div>
    </div>
  );
}

function SettingsPanel({ settings, onSave }) {
  const [f, setF] = useState(settings);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoErr, setLogoErr] = useState("");
  const onPickLogo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToDataURL(file, 400, 0.9);
      const [url] = await uploadImages([dataUrl]);
      set("logo", url);
      setLogoErr("");
    } catch {
      setLogoErr("No se pudo subir el logo. Revisa tu conexión con el servidor.");
    }
    e.target.value = "";
  };
  const [qrErr, setQrErr] = useState("");
  const onPickQr = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      // el QR se guarda más grande y nítido para que se pueda escanear
      const dataUrl = await fileToDataURL(file, 900, 0.95);
      const [url] = await uploadImages([dataUrl]);
      set("yapeQr", url);
      setQrErr("");
    } catch {
      setQrErr("No se pudo subir el QR. Revisa tu conexión con el servidor.");
    }
    e.target.value = "";
  };
  const guardar = async () => {
    setSaving(true);
    try {
      await onSave(f);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (e) {
      alert("No se pudo guardar: " + e.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div style={{ borderRadius: 16, padding: 24, maxWidth: 440, background: C.surface, border: `1px solid ${C.line}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, color: C.roseDeep }}>
        <SettingsIcon size={18} />
        <span style={{ fontWeight: 600 }}>Ajustes de la tienda</span>
      </div>
      <Field label="Nombre de la tienda"><Inp value={f.storeName} onChange={(v) => set("storeName", v)} /></Field>

      <Field label="Logo de la portada (opcional)">
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: 14, overflow: "hidden", flexShrink: 0, display: "grid", placeItems: "center", background: C.bg, border: `1px solid ${C.line}` }}>
            {f.logo ? (
              <img src={f.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            ) : (
              <Sparkles size={26} color={C.roseDeep} />
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.bg, color: C.ink, fontSize: 13, fontWeight: 600, cursor: "pointer", width: "fit-content" }}>
              <ImageIcon size={15} /> {f.logo ? "Cambiar logo" : "Subir logo"}
              <input type="file" accept="image/*" onChange={onPickLogo} style={{ display: "none" }} />
            </label>
            {f.logo && (
              <button type="button" onClick={() => set("logo", "")} style={{ background: "none", border: "none", color: C.roseDeep, fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left", padding: 0 }}>
                Quitar logo
              </button>
            )}
          </div>
        </div>
        {logoErr && <p style={{ color: C.warn, fontSize: 12, margin: "6px 0 0" }}>{logoErr}</p>}
        {(!f.logo || /^https?:\/\//.test(f.logo)) && (
          <div style={{ marginTop: 8 }}>
            <Inp value={f.logo || ""} onChange={(v) => set("logo", v)} placeholder="…o pega una URL del logo" />
          </div>
        )}
      </Field>

      <Field label="Eslogan (frase de la portada)"><Inp value={f.tagline || ""} onChange={(v) => set("tagline", v)} placeholder="Accesorios de gatitos para alegrar tu día 🐾" /></Field>

      <Field label="Número de WhatsApp (con código de país)"><Inp value={f.whatsapp} onChange={(v) => set("whatsapp", v.replace(/\D/g, ""))} placeholder="51900000000" /></Field>
      <div style={{ margin: "18px 0 6px", paddingTop: 16, borderTop: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.yape, fontWeight: 700, marginBottom: 4 }}>
          <YapeMark /> Pago con Yape
        </div>
        <p style={{ margin: "0 0 12px", color: C.inkSoft, fontSize: 13 }}>
          Con el QR o el número configurados, el carrito muestra el botón «Pagar con Yape».
        </p>
        <Field label="QR de Yape (captura de «Mi QR» en tu app)">
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 88, height: 88, borderRadius: 14, overflow: "hidden", flexShrink: 0, display: "grid", placeItems: "center", background: C.bg, border: `1px solid ${C.line}` }}>
              {f.yapeQr ? <img src={f.yapeQr} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <ImageIcon size={26} color={C.yape} />}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 10, border: `1px solid ${C.line}`, background: C.bg, color: C.ink, fontSize: 13, fontWeight: 600, cursor: "pointer", width: "fit-content" }}>
                <ImageIcon size={15} /> {f.yapeQr ? "Cambiar QR" : "Subir QR"}
                <input type="file" accept="image/*" onChange={onPickQr} style={{ display: "none" }} />
              </label>
              {f.yapeQr && (
                <button type="button" onClick={() => set("yapeQr", "")} style={{ background: "none", border: "none", color: C.roseDeep, fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left", padding: 0 }}>
                  Quitar QR
                </button>
              )}
            </div>
          </div>
          {qrErr && <p style={{ color: C.warn, fontSize: 12, margin: "6px 0 0" }}>{qrErr}</p>}
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Número Yape"><Inp value={f.yapeNumber || ""} onChange={(v) => set("yapeNumber", v.replace(/\D/g, "").slice(0, 9))} placeholder="987654321" /></Field>
          <Field label="Titular"><Inp value={f.yapeName || ""} onChange={(v) => set("yapeName", v)} placeholder="Nombre en Yape" /></Field>
        </div>
      </div>

      <ShippingSettings value={f.shipping} onChange={(v) => set("shipping", v)} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="PIN del panel (solo tú lo ves)"><Inp value={f.pin || ""} onChange={(v) => set("pin", v)} placeholder="Vacío = no cambiar" /></Field>
        <Field label="Alerta de stock bajo"><Inp type="number" value={f.lowStock} onChange={(v) => set("lowStock", Number(v))} /></Field>
      </div>
      <button
        onClick={guardar}
        disabled={saving}
        style={{ width: "100%", padding: "10px 0", borderRadius: 12, border: "none", color: C.primaryInk, background: C.primary, fontWeight: 600, marginTop: 8, cursor: saving ? "wait" : "pointer", opacity: saving ? 0.7 : 1 }}
      >
        {saving ? "Guardando…" : saved ? "Guardado ✓" : "Guardar cambios"}
      </button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.inkSoft, display: "block", marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}

function Inp({ value, onChange, placeholder, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: "100%", padding: "10px 12px", borderRadius: 12, outline: "none", border: `1px solid ${C.line}`, background: C.bg, color: C.ink }}
    />
  );
}
