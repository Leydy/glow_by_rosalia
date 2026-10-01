import { useState } from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon } from "lucide-react";
import { C } from "../theme.js";
import { WITCH_HAT } from "../seasons.js";
import { ROS } from "../shop/rosalia.jsx";
import { fmtPts, imgUrl } from "../lib/util.js";

// Pantalla de carga: Rosalía (de perfil, con sus manchas) corre sobre un suelo
// que se desliza, dejando nubecitas de polvo.
export function RunningCat() {
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

export function PageLoader({ leaving, error }) {
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

export function HeartIcon({ filled, size = 18 }) {
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
export function FavButton({ active, onClick, style }) {
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

// Cesto de mimbre con pelotitas de lana: una pelotita por cada 100 Michipuntos
// (hasta 15). Caen al cesto una tras otra.
export const BALL_COLORS = ["#F26D9C", "#B892FF", "#F0B429", "#7FD1C7", "#FF8A65", "#9FC5FF", "#E58FD8"];

export const BALL_SPOTS = [
  [60, 88], [88, 90], [116, 88], [74, 72], [102, 72], [46, 74], [130, 74],
  [88, 56], [60, 58], [116, 58], [74, 42], [102, 42], [46, 50], [130, 50], [88, 28],
];

export function YarnBall({ x, y, color, delay }) {
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

export function YarnBasket({ points = 0, size = 150 }) {
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

export function CreditCoin({ size = 64, spin = false }) {
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

// Calificación con patitas de gato (en vez de estrellas).
export function PawMark({ on, size }) {
  return (
    <svg className={on ? "is-on" : ""} width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <ellipse cx="20" cy="26.5" rx="8.5" ry="7" /><ellipse cx="9.5" cy="17" rx="3.8" ry="4.8" />
      <ellipse cx="16" cy="10" rx="3.8" ry="4.8" /><ellipse cx="24" cy="10" rx="3.8" ry="4.8" />
      <ellipse cx="30.5" cy="17" rx="3.8" ry="4.8" />
    </svg>
  );
}

export function Stars({ value = 0, size = 18 }) {
  return (
    <span className="glow-stars" aria-label={`${value} de 5 patitas`}>
      {[1, 2, 3, 4, 5].map((k) => <PawMark key={k} on={k <= Math.round(value)} size={size} />)}
    </span>
  );
}

// Regalito dibujado (la tapa salta de vez en cuando).
export function GiftIcon({ size = 54 }) {
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

/* ---------- Registro (opcional) ---------- */
// Inicial del nombre dentro de una carita con orejitas de gato.
export function CatAvatar({ customer, size = 34 }) {
  return (
    <span className="glow-cat-avatar" style={{ width: size, height: size }}>
      {customer.picture ? <img src={customer.picture} alt="" referrerPolicy="no-referrer" /> : <b>{(customer.name || "?")[0].toUpperCase()}</b>}
    </span>
  );
}

// Nombre de la tienda: "Glow" en letra script con degradado brillante y
// "by Rosalía" en cursiva debajo. Si el nombre no lleva " by ", va entero.
export function BrandName({ name, onClick, season }) {
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

export function TruckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 6h11v10H2zM13 9h4.5l3.5 3.5V16h-8" />
      <circle cx="6" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" />
    </svg>
  );
}

export function PawIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 40 40" fill="currentColor" aria-hidden="true">
      <ellipse cx="20" cy="27" rx="9" ry="7.5" /><ellipse cx="9" cy="17" rx="4" ry="5" /><ellipse cx="16" cy="10" rx="4" ry="5" /><ellipse cx="24" cy="10" rx="4" ry="5" /><ellipse cx="31" cy="17" rx="4" ry="5" />
    </svg>
  );
}

// Íconos gatunos de la barra (mismo trazo que lucide).
export function CatHomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 21V11L4 3.5L9 7h6l5-3.5L19 11v10z" />
      <path d="M10 21v-4a2 2 0 0 1 4 0v4" />
      <path d="M1.5 13.5H5M1.5 16.5L5 15.5M22.5 13.5H19M22.5 16.5L19 15.5" />
    </svg>
  );
}

// Marca simple para los botones de Yape (no es el logo oficial).
export function YapeMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="5" fill="currentColor" opacity=".25" />
      <path d="M8 8.5l3.2 4.2L14.6 8.5M11.2 12.7V16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="17.5" cy="15" r="1.4" fill="currentColor" />
    </svg>
  );
}

// Botón de la barra superior. "round" = solo ícono (el candado del panel).
export function NavBtn({ active, onClick, icon, label, round }) {
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
export function ProductGallery({ images = [], alt, size = 52 }) {
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
        src={imgUrl(src, 640)}
        alt={alt}
        loading="lazy"
        decoding="async"
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
export function Thumb({ src, alt, size }) {
  return (
    <div style={{ position: "relative", flexShrink: 0, width: size, height: typeof size === "number" ? size : "auto", aspectRatio: "1 / 1", borderRadius: 10, overflow: "hidden", display: "grid", placeItems: "center", background: C.blush }}>
      <SingleImage src={src} alt={alt} size={typeof size === "number" ? size * 0.6 : 40} fit="cover" />
    </div>
  );
}

// Marcador discreto para productos que aún no tienen foto.
export function NoPhoto({ size = 52 }) {
  return <ImageIcon size={Math.round(size * 0.7)} color={C.rose} strokeWidth={1.4} aria-label="Sin foto" />;
}

// Imagen única (primera foto del producto) con marcador si no hay foto.
// fit="contain" muestra la foto completa; fit="cover" la usa de fondo a sangre.
export function SingleImage({ src, alt, size = 64, fit = "contain" }) {
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
      src={imgUrl(src, size > 60 ? 900 : 240)}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: fit }}
    />
  );
}

export const svg = (html, className, style, key) => <span key={key} className={className} style={style} aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />;

// Estampado gatuno del fondo: carita de michi, huellita, pescadito, ovillo y
// corazón en un mosaico de 140px, en el color de acento de cada diapositiva.
export function catPattern(color) {
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
export const TRAIL = Array.from({ length: 12 }, (_, k) => ({
  left: `${3 + k * 8}%`,
  top: `${14 + (k % 2) * 16 + k * 1.2}px`,
  delay: `${k * 0.35}s`,
}));

export function PawTrail({ color }) {
  return TRAIL.map((t, k) => (
    <Paw key={k} className="glow-paw-step" style={{ left: t.left, top: t.top, color, animationDelay: t.delay }} />
  ));
}

// Huellita (fondo animado del slider).
export function Paw({ style, className = "glow-paw" }) {
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
export function Sparkle({ style }) {
  return (
    <svg className="glow-sparkle" viewBox="0 0 24 24" style={style} aria-hidden="true">
      <path d="M12 0 C13 8 16 11 24 12 C16 13 13 16 12 24 C11 16 8 13 0 12 C8 11 11 8 12 0 Z" />
    </svg>
  );
}

export const PAWS = [
  { left: "6%", size: 26, delay: "0s", dur: "11s" },
  { left: "18%", size: 18, delay: "4s", dur: "13s" },
  { left: "34%", size: 22, delay: "7s", dur: "12s" },
  { left: "49%", size: 16, delay: "2s", dur: "14s" },
  { left: "63%", size: 24, delay: "9s", dur: "12s" },
  { left: "88%", size: 20, delay: "5s", dur: "15s" },
];

export const ART = (html, className = "glow-world-art") => <span className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: html }} />;

export function Field({ label, children }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: C.inkSoft, display: "block", marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}

export function Inp({ value, onChange, placeholder, type = "text" }) {
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
