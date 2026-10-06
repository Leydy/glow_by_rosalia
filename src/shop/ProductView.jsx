// Vista de producto: se abre al tocar la foto o el nombre de una tarjeta.
// Foto grande con zoom (computadora) o deslizable (celular), miniaturas,
// precio, descripción, tallas, cantidad y botón para añadir al carrito.
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus, ShoppingCart, X } from "lucide-react";
import { money } from "../theme.js";
import { WORLDS, worldOf, ROUTINE_STEPS, sizeForHeight } from "../worlds.js";
import { imgUrl } from "../lib/util.js";
import { FavButton, Stars } from "../components/ui.jsx";

export function ProductView({ p, fav, onToggleFav, onAdd, onClose, onReviews, initialSize = "", kidCm }) {
  const imgs = (p.images || []).filter(Boolean);
  const [i, setI] = useState(0);
  const [size, setSize] = useState(initialSize);
  const colors = (p.details?.colors || []).filter((c) => c.name);
  const [color, setColor] = useState(colors.length === 1 ? colors[0].name : "");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [zoom, setZoom] = useState(null); // {x, y} en % mientras el mouse está sobre la foto
  const track = useRef(null);
  const w = worldOf(p.category);
  const sizes = p.details?.sizes || [];
  const d = p.details || {};
  const out = p.stock <= 0;
  const needSize = sizes.length > 0 && !size;
  const needColor = colors.length > 0 && !color;
  // al elegir un color se muestra su foto
  const pickColor = (c) => {
    setColor(c.name);
    const k = imgs.indexOf(c.img);
    if (k >= 0) show(k);
  };

  // La página de atrás no se mueve mientras la vista está abierta.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  // Esc cierra; las flechas del teclado cambian de foto.
  useEffect(() => {
    const key = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  const show = (k) => {
    const n = imgs.length ? (k + imgs.length) % imgs.length : 0;
    setI(n);
    const el = track.current;
    if (el) el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
  };
  const go = (dlt) => show(i + dlt);
  // en celular, al deslizar se actualiza la foto activa
  const onScroll = () => {
    const el = track.current;
    if (el) setI(Math.round(el.scrollLeft / el.clientWidth));
  };

  const add = () => {
    if (needSize || needColor || out) return;
    for (let k = 0; k < qty; k++) onAdd(p, size, color);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const step = ROUTINE_STEPS.find((s) => s.key === d.step);
  const kidRec = w === "kids" && kidCm ? sizeForHeight(kidCm) : null;

  return (
    <div className="glow-modal-bg glow-pv-bg" onClick={onClose}>
      <div className={`glow-pv is-${w}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-label={p.name}>
        <button className="glow-pv-x" onClick={onClose} aria-label="Cerrar"><X size={22} /></button>

        {/* fotos */}
        <div className="glow-pv-media">
          <div className="glow-pv-main">
            <div className="glow-pv-track" ref={track} onScroll={onScroll}>
              {(imgs.length ? imgs : [""]).map((src, k) => (
                <div
                  key={k}
                  className="glow-pv-slide"
                  onMouseMove={(e) => {
                    if (!src || window.matchMedia("(hover: none)").matches) return;
                    const r = e.currentTarget.getBoundingClientRect();
                    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
                  }}
                  onMouseLeave={() => setZoom(null)}
                >
                  {src ? (
                    <img
                      src={imgUrl(src, 1100)}
                      alt={k === 0 ? p.name : ""}
                      draggable={false}
                      style={zoom && k === i ? { transform: "scale(2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : null}
                    />
                  ) : <span className="glow-pv-nophoto">Sin foto</span>}
                </div>
              ))}
            </div>
            {imgs.length > 1 && (
              <>
                <button className="glow-pv-arrow is-left" onClick={() => go(-1)} aria-label="Foto anterior"><ChevronLeft size={22} /></button>
                <button className="glow-pv-arrow is-right" onClick={() => go(1)} aria-label="Foto siguiente"><ChevronRight size={22} /></button>
                <span className="glow-pv-count">{i + 1} / {imgs.length}</span>
              </>
            )}
            <FavButton active={fav} onClick={() => onToggleFav(p.id)} style={{ bottom: 12, right: 12 }} />
          </div>
          {imgs.length > 1 && (
            <div className="glow-pv-thumbs">
              {imgs.map((src, k) => (
                <button key={src + k} className={k === i ? "is-on" : ""} onClick={() => show(k)} aria-label={`Ver foto ${k + 1}`}>
                  <img src={imgUrl(src, 160)} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* datos */}
        <div className="glow-pv-info">
          <span className="glow-pv-cat">{WORLDS[w].emoji} {p.category}</span>
          <h2>{p.name}</h2>
          {p.reviews > 0 && (
            <button className="glow-pv-rating" onClick={() => onReviews(p)}>
              <Stars value={p.rating} size={17} /> <b>{p.rating}</b> <span>({p.reviews} reseña{p.reviews === 1 ? "" : "s"})</span>
            </button>
          )}
          <div className="glow-pv-price">{money(p.price)}</div>
          <p className="glow-pv-earn">🧶 Ganas <b>{Math.floor(p.price * 1.25)} Michipuntos</b> con esta compra</p>
          {p.desc && <p className="glow-pv-desc">{p.desc}</p>}

          {w === "skin" && (d.size || d.skinTypes?.length || d.concerns?.length || d.usage || d.ingredients || step) && (
            <dl className="glow-pv-facts">
              {d.size && <><dt>Contenido</dt><dd>{d.size}</dd></>}
              {step && <><dt>En tu rutina</dt><dd>{step.emoji} {step.label}</dd></>}
              {d.skinTypes?.length > 0 && <><dt>Para piel</dt><dd>{d.skinTypes.join(", ").toLowerCase()}</dd></>}
              {d.concerns?.length > 0 && <><dt>Ayuda con</dt><dd>{d.concerns.join(", ").toLowerCase()}</dd></>}
              {d.ingredients && <><dt>Ingredientes</dt><dd>{d.ingredients}</dd></>}
              {d.usage && <><dt>Modo de uso</dt><dd>{d.usage}</dd></>}
            </dl>
          )}

          {colors.length > 0 && (
            <div className="glow-pv-colors">
              <p>Color{color ? <>: <b>{color}</b></> : ""}</p>
              <div>
                {colors.map((c) => (
                  <button key={c.name} className={color === c.name ? "is-on" : ""} aria-pressed={color === c.name} onClick={() => pickColor(c)} title={c.name}>
                    {c.img ? <img src={imgUrl(c.img, 120)} alt="" /> : <span className="glow-pv-colorname">{c.name}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {sizes.length > 0 && (
            <div className="glow-pv-sizes">
              <p>Talla{size ? <>: <b>{size}</b></> : ""}</p>
              <div>
                {sizes.map((t) => (
                  <button key={t} className={size === t ? "is-on" : ""} aria-pressed={size === t} onClick={() => setSize(t)}>{t}</button>
                ))}
              </div>
              {kidRec && <small>📏 Para tu peque de {kidCm} cm te recomendamos <b>talla {kidRec.size}</b></small>}
            </div>
          )}

          <div className="glow-pv-buy">
            <div className="glow-pv-qty" aria-label="Cantidad">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Quitar uno"><Minus size={16} /></button>
              <b>{qty}</b>
              <button onClick={() => setQty((q) => Math.min(p.stock, q + 1))} disabled={qty >= p.stock} aria-label="Agregar uno"><Plus size={16} /></button>
            </div>
            <button className="glow-pv-add" disabled={out || needSize || needColor} onClick={add}>
              <ShoppingCart size={18} /> {out ? "Agotado" : needColor ? "Elige un color" : needSize ? "Elige tu talla" : added ? "✓ Añadido al carrito" : "Añadir al carrito"}
            </button>
          </div>
          <p className="glow-pv-stock">{out ? "Sin stock por ahora" : p.stock <= 3 ? `¡Quedan solo ${p.stock}!` : "Disponible"}</p>
          <ul className="glow-pv-perks">
            <li>📍 Entrega gratis en Juliaca</li>
            <li>🚚 Envíos a todo el Perú por Shalom</li>
            <li>💜 Pagas fácil con Yape</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
