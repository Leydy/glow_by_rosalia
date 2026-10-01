import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { guideArt } from "../seasons.js";
import { GUIDES, GUIDE_KEYS } from "../guides.js";
import { C } from "../theme.js";
import { loadGuide, storeGuide } from "../lib/util.js";

// Con temporada activa la mascota se viste para la ocasión (ej. sombrero de bruja).
export const GuideArt = ({ k, season }) => <span className="glow-guide-art" dangerouslySetInnerHTML={{ __html: guideArt(GUIDES[k].art, k, season) }} />;

export function GuidePicker({ current, onPick, onClose, season }) {
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

export function ShopGuide({ products, cartLines, cartCount, onAdd, onOpenCart, event, season }) {
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
