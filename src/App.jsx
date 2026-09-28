import { useState, useEffect, useMemo, useRef } from "react";
import {
  Store, Lock, Plus, Minus, Pencil, Trash2, X, Search,
  TrendingUp, Package, Wallet, AlertTriangle, Settings as SettingsIcon,
  MessageCircle, LogOut, Sparkles, ShoppingCart, Image as ImageIcon,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { C, money } from "./theme.js";
import { CATEGORIES, CATEGORY_INFO } from "./data.js";
import ChatBot from "./ChatBot.jsx";
import {
  setAdminPin, checkPin,
  createProduct, updateProduct, deleteProduct, importProducts,
  getProducts, getSettings, updateSettings, uploadImages,
} from "./api.js";

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

export default function App() {
  const [view, setView] = useState("shop"); // 'shop' | 'admin'
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Al abrir la página se piden productos y ajustes al servidor.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [p, s] = await Promise.all([getProducts(), getSettings()]);
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
    return (
      <div style={{ background: C.bg, color: C.inkSoft, minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, textAlign: "center" }}>
        {loadError ? (
          <div style={{ maxWidth: 420 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🐱💤</div>
            <p style={{ color: C.warn, fontWeight: 600 }}>{loadError}</p>
          </div>
        ) : (
          <p>Cargando la tienda… ✨</p>
        )}
      </div>
    );
  }

  return (
    <div style={{ background: C.bg, color: C.ink, minHeight: "100vh" }}>
      <header
        className="glow-header"
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: `1px solid ${C.line}`,
          background: "rgba(255,255,255,0.7)", backdropFilter: "blur(6px)",
          position: "sticky", top: 0, zIndex: 30,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <div
            style={{
              flexShrink: 0, width: 34, height: 34, borderRadius: 999,
              background: `radial-gradient(circle at 35% 30%, ${C.gold}, ${C.rose})`,
              boxShadow: `0 0 18px ${C.rose}55`,
              display: "grid", placeItems: "center",
            }}
          >
            <Sparkles size={18} color="#fff" />
          </div>
          <span className="glow-brand" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600 }}>
            {settings.storeName}
          </span>
        </div>

        <div style={{ display: "flex", flexShrink: 0, gap: 4, padding: 4, borderRadius: 999, background: C.blush }}>
          <ModeBtn active={view === "shop"} onClick={() => setView("shop")} icon={<Store size={15} />} label="Tienda" />
          <ModeBtn active={view === "admin"} onClick={() => setView("admin")} icon={<Lock size={15} />} label="Administración" />
        </div>
      </header>

      {view === "shop" ? (
        <Shop products={products} settings={settings} />
      ) : (
        <Admin
          products={products}
          settings={settings}
          onSaveProduct={saveProduct}
          onRemoveProduct={removeProduct}
          onSaveSettings={saveSettings}
          onImportFromBrowser={importFromBrowser}
        />
      )}

      {/* Asistente de la tienda (solo para los clientes, no en el panel). */}
      {view === "shop" && <ChatBot products={products} settings={settings} />}
    </div>
  );
}

function ModeBtn({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      style={{
        display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
        borderRadius: 999, border: "none", fontSize: 14,
        background: active ? C.surface : "transparent",
        color: active ? C.roseDeep : C.inkSoft,
        fontWeight: active ? 600 : 500,
        boxShadow: active ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
      }}
    >
      {icon}
      <span className="glow-mode-label">{label}</span>
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
    <div style={{ position: "relative", flexShrink: 0, width: size, height: size, borderRadius: 10, overflow: "hidden", display: "grid", placeItems: "center", background: C.blush }}>
      <SingleImage src={src} alt={alt} size={size * 0.6} fit="cover" />
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

// Sección "Más vendidos": carrusel que avanza solo y se pausa al pasar el mouse.
function BestSellers({ products, onAdd }) {
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
        <p style={{ textAlign: "center", color: C.inkSoft, margin: "0 0 22px" }}>Los favoritos de la tienda</p>

        <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", background: C.surface, border: `1px solid ${C.line}`, display: "flex", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1 1 280px", minHeight: 260, background: `linear-gradient(135deg, ${C.blush}, ${C.bg})`, display: "grid", placeItems: "center" }}>
            <SingleImage src={p.images?.[0]} alt={p.name} size={72} fit="cover" />
          </div>
          <div style={{ flex: "1 1 280px", padding: 28, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <p style={{ color: C.roseDeep, fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", margin: 0 }}>{p.category}</p>
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 600, margin: "4px 0 8px" }}>{p.name}</h3>
            <p style={{ color: C.inkSoft, fontSize: 14, margin: "0 0 18px" }}>{p.desc}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <span style={{ fontSize: 24, fontWeight: 700 }}>{money(p.price)}</span>
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
function HeroCollage({ imgs }) {
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
    </div>
  );
}

// Primera foto subida de cada producto (solo imágenes reales).
const firstPhoto = (p) => (p.images || []).find(Boolean);

// Portada: slider con fotos reales de la tienda. Una diapositiva de bienvenida
// + una por cada categoría que tenga productos. Avanza solo, se pausa al pasar
// el mouse y en el celular se puede deslizar con el dedo.
function HeroSlider({ products, settings, onPickCategory }) {
  const withPhoto = products.filter(firstPhoto);
  const featured = [
    ...withPhoto.filter((p) => p.bestSeller),
    ...withPhoto.filter((p) => !p.bestSeller),
  ];

  const slides = [
    {
      key: "intro",
      eyebrow: "Nueva colección",
      title: settings.storeName,
      text: settings.tagline || "Accesorios de gatitos para alegrar tu día.",
      cta: "Ver catálogo",
      cat: "Todos",
      imgs: featured.slice(0, 3).map(firstPhoto),
      grad: [C.blush, "#FFF3F8"],
    },
    ...CATEGORIES.filter((c) => c !== "Todos").flatMap((c) => {
      const items = withPhoto.filter((p) => p.category === c);
      if (!items.length) return [];
      const info = CATEGORY_INFO[c] || {};
      const from = Math.min(...items.map((p) => Number(p.price) || 0));
      return [{
        key: c,
        eyebrow: `${items.length} ${items.length === 1 ? "producto" : "productos"} · desde ${money(from)}`,
        title: c,
        text: info.desc,
        cta: `Ver ${c.toLowerCase()}`,
        cat: c,
        imgs: items.slice(0, 3).map(firstPhoto),
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
          <span className="glow-hero-blob is-1" style={{ background: s.grad[1] }} />
          <span className="glow-hero-blob is-2" style={{ background: "#fff" }} />

          <div className="glow-hero-inner">
            <div className="glow-hero-text">
              <p className="glow-hero-eyebrow" style={{ color: C.roseDeep }}>{s.eyebrow}</p>
              <h2 className="glow-hero-title" style={{ color: C.ink }}>{s.title}</h2>
              {s.text && <p className="glow-hero-desc" style={{ color: C.ink }}>{s.text}</p>}
              <button
                className="glow-hero-cta"
                tabIndex={i === cur ? 0 : -1}
                onClick={() => onPickCategory(s.cat)}
                style={{ background: C.primary, color: C.primaryInk, boxShadow: `0 10px 24px ${C.primary}44` }}
              >
                {s.cta} <ChevronRight size={18} />
              </button>
            </div>
            <HeroCollage imgs={s.imgs} />
          </div>
        </div>
      ))}

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

/* =========================================================================
   VISTA CLIENTE — catálogo + pedido por WhatsApp
========================================================================= */
function Shop({ products, settings }) {
  const [cat, setCat] = useState("Todos");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState(loadCart); // { [productId]: qty }
  const [cartOpen, setCartOpen] = useState(false);

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
  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => {
          const p = products.find((x) => x.id === id);
          if (!p) return null;
          return { ...p, qty: Math.min(qty, p.stock) };
        })
        .filter((l) => l && l.qty > 0),
    [cart, products]
  );

  const cartCount = cartLines.reduce((n, l) => n + l.qty, 0);
  const cartTotal = cartLines.reduce((n, l) => n + l.price * l.qty, 0);

  const addToCart = (p) =>
    setCart((c) => {
      const next = Math.min((c[p.id] || 0) + 1, p.stock);
      return { ...c, [p.id]: next };
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

  // Pedido de todo el carrito.
  const orderCart = () => {
    if (cartLines.length === 0) return;
    const items = cartLines
      .map((l) => `• ${l.qty}x ${l.name} — ${money(l.price * l.qty)}`)
      .join("%0A");
    const msg = `Hola ${settings.storeName} 👋 Quiero pedir:%0A${items}%0A%0ATotal: ${money(cartTotal)}%0A%0A¿Está disponible?`;
    window.open(`https://wa.me/${settings.whatsapp}?text=${msg}`, "_blank");
  };

  return (
    <div>
      {/* Portada: slider llamativo */}
      <HeroSlider products={products} settings={settings} onPickCategory={goToCategory} />

      <div id="catalogo" className="glow-wrap" style={{ paddingTop: 28, scrollMarginTop: 70 }}>
        {/* filtros */}
        <div className="glow-filters">
          <div className="glow-cats">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                style={{
                  padding: "6px 14px", borderRadius: 999, fontSize: 14, fontWeight: 500,
                  border: `1px solid ${cat === c ? C.primary : C.line}`,
                  background: cat === c ? C.primary : "transparent",
                  color: cat === c ? C.primaryInk : C.inkSoft,
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="glow-search">
            <Search size={16} color={C.inkSoft} style={{ position: "absolute", left: 12, top: 11 }} />
            <input
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
              <div key={p.id} style={{ borderRadius: 18, overflow: "hidden", display: "flex", flexDirection: "column", background: C.surface, border: `1px solid ${C.line}`, boxShadow: "0 6px 20px rgba(214,53,127,0.08)" }}>
                {/* foto con marco kawaii */}
                <div className="glow-card-pad" style={{ padding: 10 }}>
                  <div className="glow-card-img" style={{ position: "relative", overflow: "hidden", display: "grid", placeItems: "center", borderRadius: 14, background: `linear-gradient(135deg, ${C.blush}, ${C.bg})`, border: "2px solid #fff", boxShadow: `0 0 0 2px ${C.blush}` }}>
                    <ProductGallery images={p.images} alt={p.name} />
                    {p.bestSeller && (
                      <span className="glow-badge" style={{ position: "absolute", top: 8, left: 8, padding: "3px 9px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: "#fff", color: C.roseDeep, boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }}>
                        Más vendido
                      </span>
                    )}
                    <span
                      className="glow-badge"
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
                  <p style={{ color: C.roseDeep, fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", margin: 0 }}>{p.category}</p>
                  <h3 className="glow-card-name" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, lineHeight: 1.15, margin: "2px 0 0" }}>{p.name}</h3>
                  <p className="glow-card-desc" style={{ color: C.inkSoft, margin: "4px 0 0", flex: 1 }}>{p.desc}</p>
                  <div style={{ marginTop: 12 }}>
                    <span className="glow-card-price" style={{ fontWeight: 800, color: C.roseDeep }}>{money(p.price)}</span>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <button
                      disabled={out}
                      onClick={() => addToCart(p)}
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
          <p style={{ textAlign: "center", paddingBottom: 64, color: C.inkSoft }}>
            No hay productos que coincidan con tu búsqueda.
          </p>
        )}
      </div>

      {/* Sección "Más vendidos" */}
      <BestSellers products={products} onAdd={addToCart} />

      {/* Botón flotante del carrito */}
      {cartCount > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          aria-label="Abrir carrito"
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 40,
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
        />
      )}
    </div>
  );
}

function CartDrawer({ lines, total, onClose, onSetQty, onClear, onOrder }) {
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, display: "flex", justifyContent: "flex-end", background: "#2e1b2c66", zIndex: 50 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 420, height: "100%", display: "flex", flexDirection: "column", background: C.surface }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ShoppingCart size={20} color={C.roseDeep} />
            <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 600, margin: 0 }}>Tu pedido</h3>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.inkSoft }}><X size={22} /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px" }}>
          {lines.length === 0 ? (
            <p style={{ textAlign: "center", color: C.inkSoft, marginTop: 40 }}>Tu carrito está vacío.</p>
          ) : (
            lines.map((l) => (
              <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${C.line}` }}>
                <Thumb src={l.images?.[0]} alt={l.name} size={52} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{l.name}</div>
                  <div style={{ color: C.inkSoft, fontSize: 13 }}>{money(l.price)} c/u</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <button onClick={() => onSetQty(l.id, l.qty - 1)} aria-label="Quitar uno" style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.line}`, background: C.bg, color: C.ink, display: "grid", placeItems: "center", cursor: "pointer" }}>
                    <Minus size={14} />
                  </button>
                  <span style={{ minWidth: 20, textAlign: "center", fontWeight: 600 }}>{l.qty}</span>
                  <button onClick={() => onSetQty(l.id, Math.min(l.qty + 1, l.stock))} disabled={l.qty >= l.stock} aria-label="Agregar uno" style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${C.line}`, background: C.bg, color: l.qty >= l.stock ? C.inkSoft : C.ink, display: "grid", placeItems: "center", cursor: l.qty >= l.stock ? "not-allowed" : "pointer" }}>
                    <Plus size={14} />
                  </button>
                  <button onClick={() => onSetQty(l.id, 0)} aria-label="Eliminar" style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "none", color: C.roseDeep, display: "grid", placeItems: "center", cursor: "pointer" }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ padding: "16px 20px", borderTop: `1px solid ${C.line}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <span style={{ color: C.inkSoft }}>Total</span>
            <span style={{ fontSize: 22, fontWeight: 700 }}>{money(total)}</span>
          </div>
          <button
            onClick={onOrder}
            disabled={lines.length === 0}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "12px 0", borderRadius: 12, fontSize: 15, fontWeight: 600, border: "none",
              background: lines.length === 0 ? C.line : C.primary, color: lines.length === 0 ? C.inkSoft : C.primaryInk,
              cursor: lines.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            <MessageCircle size={18} />
            Finalizar pedido por WhatsApp
          </button>
          {lines.length > 0 && (
            <button onClick={onClear} style={{ width: "100%", marginTop: 8, padding: "8px 0", borderRadius: 12, border: "none", background: "none", color: C.inkSoft, fontWeight: 600, cursor: "pointer" }}>
              Vaciar carrito
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   VISTA ADMINISTRACIÓN — inventario, márgenes, ganancias, stock
========================================================================= */
function Admin({ products, settings, onSaveProduct, onRemoveProduct, onSaveSettings, onImportFromBrowser }) {
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

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[["inventario", "Inventario"], ["ajustes", "Ajustes"]].map(([k, l]) => (
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
    category: initial.category || CATEGORIES[1],
    cost: initial.cost ?? "",
    price: initial.price ?? "",
    stock: initial.stock ?? "",
    emoji: initial.emoji || "✨",
    images: initial.images || (initial.image ? [initial.image] : []),
    desc: initial.desc || "",
  });
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
    onSave({ ...f, cost: Number(f.cost), price: Number(f.price), stock: Number(f.stock) });
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
            {CATEGORIES.filter((c) => c !== "Todos").map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="PIN de acceso"><Inp value={f.pin} onChange={(v) => set("pin", v)} /></Field>
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
