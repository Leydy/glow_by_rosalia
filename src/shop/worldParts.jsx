import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { AGE_HEIGHTS, BUDGETS, CONCERNS, ROUTINE_STEPS, SKIN_TYPES, WORLDS, WORLD_KEYS, buildRoutine, recommendedSize, sizeForHeight, spaArt } from "../worlds.js";
import { GUIDES } from "../guides.js";
import { money } from "../theme.js";
import { ART } from "../components/ui.jsx";
import { imgUrl } from "../lib/util.js";

export const SPA_ROSALIA = spaArt(GUIDES.rosalia.art);

// Pestañas de los mundos, al lado del logo (en el celular, debajo).
export function WorldTabs({ world, onPick }) {
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
export function ComingSoon({ world, onBack }) {
  const w = WORLDS[world];
  return (
    <div className={`glow-soon is-${world}`}>
      <b>{w.emoji} {w.name} llega muy pronto</b>
      <p>{world === "skin" ? "Rosalía está eligiendo con cariño los productos para tu piel." : world === "variedades" ? "Estamos eligiendo ropa coreana, relojes y accesorios lindos." : "Estamos preparando ropita linda para los peques."} ¡Vuelve pronto!</p>
      <button onClick={onBack}>Mientras tanto, mira la Michitienda 🐾</button>
    </div>
  );
}

// Aviso al final de la Michitienda: invita a pasar a Glow Skin.
export function CrossToSkin({ hasSkin, onGo }) {
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
export function SkinTags({ p, onInfo }) {
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

export function SkinInfo({ p, onClose, onAdd }) {
  const d = p.details || {};
  const step = ROUTINE_STEPS.find((s) => s.key === d.step);
  return (
    <div className="glow-modal-bg" onClick={onClose}>
      <div className="glow-ship glow-skin-info" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={p.name}>
        <button className="glow-join-x" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        <div className="glow-skin-info-top">
          {p.images?.[0] ? <img src={imgUrl(p.images[0], 300)} alt="" /> : <span className="glow-skin-info-noimg">✨</span>}
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
export function RoutineBuilder({ products, onAddAll }) {
  const [a, setA] = useState({ piel: "Mixta", meta: ["Hidratación"], budget: BUDGETS[1] });
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
  // multi: se pueden marcar varias opciones (siempre queda al menos una).
  const q = (k, label, opts, multi = false) => {
    const isOn = (o) => (multi ? a[k].includes(o) : a[k] === o);
    const pick = (o) => {
      setAdded(false);
      setA((x) => {
        if (!multi) return { ...x, [k]: o };
        const list = x[k].includes(o) ? x[k].filter((v) => v !== o) : [...x[k], o];
        return { ...x, [k]: list.length ? list : x[k] };
      });
    };
    return (
      <div className="glow-rq">
        <p>{label}</p>
        <div>{opts.map((o) => <button key={o} className={isOn(o) ? "is-on" : ""} aria-pressed={isOn(o)} onClick={() => pick(o)}>{multi && isOn(o) ? "✓ " : ""}{o}</button>)}</div>
      </div>
    );
  };
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
          {q("meta", "2. ¿Qué quieres mejorar? (elige varias)", CONCERNS, true)}
          {q("budget", "3. ¿Cuánto quieres invertir?", BUDGETS)}
        </div>
        <div className="glow-rpath">
          {steps.map(({ step, product, skipped }, i) => (
            <div key={step.key} className={`glow-rstep${product ? "" : " is-empty"}`} style={{ animationDelay: `${i * 0.06}s` }}>
              <i>{i + 1}</i>
              {product ? (
                product.images?.[0] ? <img src={imgUrl(product.images[0], 500)} alt="" loading="lazy" /> : <span className="glow-rstep-ph">{step.emoji}</span>
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
export function SizeBoard({ products, kid, setKid, onAdd }) {
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
                {p.images?.[0] ? <img src={imgUrl(p.images[0], 520)} alt="" loading="lazy" /> : <span className="glow-pin-noimg">🧸</span>}
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
