import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import { C, money } from "../theme.js";
import { GUIDES } from "../guides.js";
import { WORLDS, WORLD_HERO } from "../worlds.js";
import { CATEGORIES, CATEGORY_INFO, HERO_INTRO_WORDS, HERO_TICKER } from "../data.js";
import { FavButton, PAWS, Paw, PawTrail, SingleImage, Sparkle, catPattern } from "../components/ui.jsx";
import { CatMascot } from "./rosalia.jsx";
import { SPA_ROSALIA } from "./worldParts.jsx";
import { firstPhoto, imgUrl } from "../lib/util.js";
import { HalloweenHero } from "./halloween.jsx";

// Sección "Más vendidos": carrusel que avanza solo y se pausa al pasar el mouse.
export function BestSellers({ products, onAdd, favs = [], onToggleFav }) {
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
export function HeroCollage({ imgs, variant, picks, active, world = "michi" }) {
  const [main, ...rest] = imgs;
  const photo = (src, cls) => (
    <div className={`glow-hero-photo ${cls}`}>
      <img src={imgUrl(src, 800)} alt="" loading="lazy" decoding="async" />
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
      <CatMascot variant={variant} picks={picks} active={active} art={world === "skin" ? SPA_ROSALIA : world === "kids" ? GUIDES.cuyito.art : world === "variedades" ? GUIDES.baneco.art : null} say={WORLD_HERO[world]?.say} />
    </div>
  );
}

// Producto estrella de la diapositiva: tarjeta flotante con foto, precio y
// botón para añadirlo directo al carrito.
export function HeroStar({ p, onAdd, active, fav, onToggleFav }) {
  const out = p.stock <= 0;
  return (
    <div className="glow-hero-star">
      <span className="glow-hero-star-ribbon" style={{ background: C.gold }}>{p.bestSeller ? "El más vendido" : "Favorito"}</span>
      <div style={{ position: "relative" }}>
        <img src={imgUrl(firstPhoto(p), 520)} alt={p.name} />
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

// Portada: slider con fotos reales de la tienda. Una diapositiva de bienvenida
// + una por cada categoría que tenga productos. Avanza solo, se pausa al pasar
// el mouse y en el celular se puede deslizar con el dedo.
// Diapositivas de Glow Skin / Glow Kids: presentación y una por categoría.
export function worldSlides(world, withPhoto, featured) {
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
export const BALLOON_COLORS = ["#FF9EC4", "#7CC4FF", "#FFE07A", "#9EE6B8"];

export function WorldDeco({ world }) {
  if (world === "variedades") {
    // brillitos que suben
    return Array.from({ length: 12 }, (_, i) => (
      <span key={i} className="glow-wd-spark" style={{ left: `${(i * 41) % 100}%`, fontSize: 12 + (i % 4) * 5, animationDuration: `${9 + (i % 5) * 2}s`, animationDelay: `-${i * 1.4}s` }}>✦</span>
    ));
  }
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

export function HeroSlider({ products, settings, onPickCategory, onAction, onAdd, favs = [], onToggleFav, season, world = "michi" }) {
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
