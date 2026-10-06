import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { Search, ShoppingCart, X } from "lucide-react";
import { getConfig, getMyOrders, getMyReviews } from "../api.js";
import { C, money } from "../theme.js";
import { WORLDS, recommendedSize, worldOf, fitsGender } from "../worlds.js";
import { SPIDER } from "../seasons.js";
import { REVIEW_PTS, loadCart, markSeen, scheduleText, scrollToId, imgUrl } from "../lib/util.js";
import { BestSellers, HeroSlider } from "./hero.jsx";
import { HALLOWEEN, HalloweenBand } from "./halloween.jsx";
import { ComingSoon, CrossToSkin, RoutineBuilder, SizeBoard, SkinInfo, SkinTags } from "./worldParts.jsx";
import { FavButton, ProductGallery, Stars, svg } from "../components/ui.jsx";
import { AccountDrawer, ProductReviews, ReviewModal } from "../account/account.jsx";
import { ShopGuide } from "../components/guide.jsx";
import { ProductView } from "./ProductView.jsx";
// Se descargan recién cuando se usan (la tienda carga más rápido).
const CartDrawer = lazy(() => import("../checkout/checkout.jsx").then((m) => ({ default: m.CartDrawer })));
const AccountPage = lazy(() => import("../account/AccountPage.jsx").then((m) => ({ default: m.AccountPage })));
import { CatchGame, GameBanner } from "./CatchGame.jsx";

// Ventanita pública: puntos de encuentro en Juliaca y tarifas Shalom.
export function ShippingInfo({ settings, onClose }) {
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

/* =========================================================================
   VISTA CLIENTE — catálogo + pedido por WhatsApp
========================================================================= */
export function Shop({ products: allProducts, settings, favs = [], onToggleFav, panel, onPanel, customer, onCustomer, onJoin, accountPage, wallet, onClaimCredit, season, world = "michi", onWorld }) {
  const [cat, setCat] = useState("Todos");
  // Solo los productos del mundo elegido (el carrito usa todos).
  const products = useMemo(() => allProducts.filter((p) => worldOf(p.category) === world), [allProducts, world]);
  useEffect(() => { setCat("Todos"); }, [world]);
  // Kids: filtro Niña / Niño (las prendas para ambos salen en los dos).
  const [gender, setGender] = useState("");
  useEffect(() => { setGender(""); }, [world]);
  const worldCats = ["Todos", ...WORLDS[world].cats.filter((c) => products.some((p) => p.category === c && fitsGender(p, gender)))];
  const [skinInfo, setSkinInfo] = useState(null); // producto de Skin con sus detalles abiertos
  const [viewing, setViewing] = useState(null); // producto abierto en grande
  const [playing, setPlaying] = useState(false); // juego del día abierto
  useEffect(() => {
    const open = () => setPlaying(true);
    window.addEventListener("glow:game", open);
    return () => window.removeEventListener("glow:game", open);
  }, []);
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
    if (worldOf(p.category) !== "kids") return sizes[0];
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
        const okCat = (cat === "Todos" || p.category === cat) && fitsGender(p, gender);
        const okQ = p.name.toLowerCase().includes(q.toLowerCase());
        return okCat && okQ;
      }),
    [products, cat, q, gender]
  );

  // Líneas del carrito (resuelve cada id contra el producto actual y respeta el stock).
  // La clave es el id, o "id::talla::color" cuando hay talla o color.
  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([key, qty]) => {
          const [id, size = "", color = ""] = key.split("::");
          const p = allProducts.find((x) => x.id === id);
          if (!p) return null;
          const col = (p.details?.colors || []).find((c) => c.name === color);
          const extra = [size ? `Talla ${size}` : "", col ? `Color ${col.name}` : ""].filter(Boolean).join(" · ");
          return {
            ...p, key, size, color: col ? col.name : "",
            images: col?.img ? [col.img, ...(p.images || [])] : p.images, // la foto del color elegido
            // con stock por color, el máximo es el de ese color
            stock: Number.isInteger(col?.stock) ? col.stock : p.stock,
            name: extra ? `${p.name} · ${extra}` : p.name, qty: Math.min(qty, Number.isInteger(col?.stock) ? col.stock : p.stock),
          };
        })
        .filter((l) => l && l.qty > 0),
    [cart, allProducts]
  );

  const cartCount = cartLines.reduce((n, l) => n + l.qty, 0);
  const cartTotal = cartLines.reduce((n, l) => n + l.price * l.qty, 0);

  const [guideEvent, setGuideEvent] = useState(null);
  const addToCart = (p, size = "", color = "") => {
    // con colores hay que elegir uno: se abre la vista del producto
    if (p.details?.colors?.length && !color) return setViewing(p);
    setGuideEvent({ type: "added", product: p, at: Date.now() });
    addToCartRaw(p, size, color);
  };
  const addToCartRaw = (p, size = "", color = "") =>
    setCart((c) => {
      const key = size || color ? [p.id, size, color].join("::").replace(/::$/, "") : p.id;
      const col = (p.details?.colors || []).find((x) => x.name === color);
      const next = Math.min((c[key] || 0) + 1, Number.isInteger(col?.stock) ? col.stock : p.stock);
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
        <Suspense fallback={<div style={{ minHeight: "70vh" }} />}>
          <AccountPage customer={customer} favs={favs} products={products} onToggleFav={onToggleFav} onAdd={addToCart} onPanel={onPanel} settings={settings} wallet={wallet} onClaimCredit={onClaimCredit} />
        </Suspense>
      ) : (
      <>
      <HeroSlider key={world} world={world} products={products} settings={settings} onPickCategory={goToCategory} onAction={(a) => { if (a === "rutina") window.dispatchEvent(new Event("glow:rutina")); scrollToId(a === "rutina" ? "glow-rutina" : "glow-tallas"); }} onAdd={addToCart} favs={favs} onToggleFav={onToggleFav} season={season} />
      {world === "michi" && season?.key === "halloween" && <HalloweenBand season={season} onGo={() => goToCategory("Todos")} />}
      {world === "michi" && <div className="glow-wrap" style={{ paddingTop: 18 }}><GameBanner onPlay={() => setPlaying(true)} /></div>}
      {world === "skin" && products.length > 0 && <RoutineBuilder products={products} onAddAll={(list) => list.forEach((p) => addToCart(p))} />}
      {!products.length ? <ComingSoon world={world} onBack={() => onWorld("michi")} /> : (<>

      <div id="catalogo" className="glow-wrap" style={{ paddingTop: 28, scrollMarginTop: 70 }}>
        {/* filtros */}
        <div className="glow-filters">
          {world === "kids" && (
            <div className="glow-gender" role="group" aria-label="Para quién">
              {[["", "Todos"], ["niña", "👧 Niña"], ["niño", "👦 Niño"]].map(([k, l]) => (
                <button key={k || "todos"} className={gender === k ? "is-on" : ""} aria-pressed={gender === k} onClick={() => { setGender(k); setCat("Todos"); }}>{l}</button>
              ))}
            </div>
          )}
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
                  <div className="glow-card-img" onClick={() => setViewing(p)} title="Ver en grande" style={{ cursor: "zoom-in", position: "relative", overflow: "hidden", display: "grid", placeItems: "center", borderRadius: 14, background: `linear-gradient(135deg, ${C.blush}, ${C.bg})`, border: "2px solid #fff", boxShadow: `0 0 0 2px ${C.blush}` }}>
                    <ProductGallery images={p.images} alt={p.name} />
                    {season?.key === "halloween" && world === "michi" && svg(HALLOWEEN.cardWeb, "glow-card-web")}
                    {season?.key === "halloween" && world === "michi" && svg(SPIDER, "glow-card-spider")}
                    {p.details?.nso && <span className="glow-nso">NSO ✓</span>}
                    {p.details?.tryon && <span className="glow-try-badge">✨ Pruébatelo</span>}
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
                  <h3 className="glow-card-name glow-name" style={{ color: C.aubergine, cursor: "pointer" }} onClick={() => setViewing(p)}>{p.name}</h3>
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
                  {p.details?.colors?.length > 1 && (
                    <button className="glow-card-colors" onClick={() => setViewing(p)} title="Ver colores">
                      {p.details.colors.slice(0, 5).map((c) => (c.img ? <img key={c.name} src={imgUrl(c.img, 60)} alt="" /> : null))}
                      <span>{p.details.colors.length} colores</span>
                    </button>
                  )}
                  {p.details?.sizes?.length > 0 && (
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
                      onClick={() => addToCart(p, sizeFor(p))}
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
      {world === "kids" && <SizeBoard products={products} kid={kid} setKid={setKid} onAdd={(p, size) => addToCart(p, size || sizeFor(p))} />}

      {/* Sección "Más vendidos" */}
      {world === "michi" && <BestSellers products={products} onAdd={addToCart} favs={favs} onToggleFav={onToggleFav} />}
      </>)}
      {playing && <CatchGame customer={customer} onClose={() => setPlaying(false)} onJoin={onJoin} />}
      {viewing && (
        <ProductView
          p={viewing}
          fav={favs.includes(viewing.id)}
          onToggleFav={onToggleFav}
          onAdd={(prod, size, color) => addToCart(prod, size, color)}
          onClose={() => setViewing(null)}
          onReviews={(prod) => { setViewing(null); setReviewing(prod); }}
          initialSize={(viewing.details?.sizes || []).length === 1 ? viewing.details.sizes[0] : worldOf(viewing.category) === "kids" ? sizeFor(viewing) : ""}
          kidCm={kid.cm}
        />
      )}
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
        <button className="glow-cart-fab" onClick={() => setCartOpen(true)} aria-label={`Abrir carrito: ${cartCount} producto${cartCount === 1 ? "" : "s"}, ${money(cartTotal)}`}>
          <ShoppingCart size={20} />
          <span className="glow-cart-fab-total">{money(cartTotal)}</span>
          <span className="glow-cart-fab-count">{cartCount}</span>
        </button>
      )}

      {/* Panel del carrito */}
      {cartOpen && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}
    </div>
  );
}
