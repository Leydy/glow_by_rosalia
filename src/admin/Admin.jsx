import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Image as ImageIcon, Lock, LogOut, Package, Pencil, Plus, Settings as SettingsIcon, Sparkles, Trash2, TrendingUp, Wallet, X } from "lucide-react";
import { checkPin, getHealth, deleteTestOrders, getAdminReviews, getConfig, getCustomers, getOrders, sendWelcomeMail, setAdminPin, setOrderStatus, setReviewStatus, uploadImages } from "../api.js";
import { C, money } from "../theme.js";
import { CONCERNS, KID_SIZES, ROUTINE_STEPS, SHOE_SIZES, SKIN_TYPES, WORLDS, WORLD_KEYS, worldOf, ADULT_SIZE_CATS, ADULT_SIZES, SHOE_CATS, GENDERS } from "../worlds.js";
import { daysUntil, inRange, seasonList } from "../seasons.js";
import { DAY_SHORT, HALF_HOURS, REVIEW_PTS, fileToDataURL, fmtPts, hour12, readBrowserProducts, readBrowserSettings, whenText, imgUrl } from "../lib/util.js";
import { CatAvatar, Field, Inp, Stars, Thumb, YapeMark } from "../components/ui.jsx";
import { TemuImport } from "./TemuImport.jsx";

/* =========================================================================
   VISTA ADMINISTRACIÓN — inventario, márgenes, ganancias, stock
========================================================================= */
export function Admin({ products, settings, onSaveProduct, onRemoveProduct, onSaveSettings, onSaveSeasons, onImportFromBrowser, onAuthed }) {
  // Aviso si el servidor publicado guarda las fotos en su disco (se pierden en cada reinicio de Render).
  const [diskWarn, setDiskWarn] = useState(false);
  useEffect(() => {
    if (/^(localhost|127.)/.test(window.location.hostname)) return;
    getHealth().then((h) => setDiskWarn(h.images === "disco")).catch(() => {});
  }, []);
  const [temu, setTemu] = useState(false); // ventana "Importar de Temu"
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

      {diskWarn && (
        <div className="glow-disk-warn" role="alert">
          <b>⚠ Las fotos no se están guardando en Cloudinary</b>
          <span>En Render falta la variable <code>CLOUDINARY_URL</code> (o está mal escrita). Mientras tanto no se pueden subir fotos nuevas. Revísala en Render → Environment.</span>
        </div>
      )}
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
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={() => setTemu(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.line}`, color: C.ink, background: C.surface, fontWeight: 600 }}>
                📦 Importar de Temu
              </button>
              <button onClick={() => setEditing({})} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, border: "none", color: C.primaryInk, background: C.primary, fontWeight: 600 }}>
                <Plus size={16} /> Agregar
              </button>
            </div>
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

      {temu && <TemuImport onSave={onSaveProduct} onClose={() => setTemu(false)} />}
      {editing && <ProductForm initial={editing} busy={busy} onSave={saveProduct} onClose={() => setEditing(null)} />}
    </div>
  );
}

export function Card({ icon, label, value, sub, accent, warn }) {
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

// Colores (variantes): cada color con su nombre y la foto que lo muestra.
const COLOR_IDEAS = ["Dorado", "Plateado", "Oro rosa", "Negro", "Blanco", "Rosa"];
function ColorEditor({ colors, images, onChange }) {
  const [open, setOpen] = useState(colors.length > 0);
  const set = (i, patch) => onChange(colors.map((c, k) => (k === i ? { ...c, ...patch } : c)));
  const add = (name = "") => onChange([...colors, { name, img: images[colors.length] || images[0] || "" }]);
  if (!open) {
    return (
      <button type="button" className="glow-colors-open" onClick={() => { setOpen(true); if (!colors.length) add(); }}>
        🎨 ¿Lo tienes en varios colores? (ej. dorado y plateado)
      </button>
    );
  }
  return (
    <div className="glow-pf-extra glow-colors-ed">
      <b>🎨 Colores</b>
      <p className="glow-pf-hint">Escribe cada color y toca la foto que lo muestra. La clienta elegirá el color antes de añadirlo al carrito.</p>
      {colors.map((c, i) => (
        <div key={i} className="glow-color-row">
          <input value={c.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="Ej. Dorado" maxLength={30} />
          <div className="glow-color-pics">
            {images.length ? images.map((u) => (
              <button type="button" key={u} className={c.img === u ? "is-on" : ""} onClick={() => set(i, { img: u })} title="Esta foto muestra el color">
                <img src={imgUrl(u, 90)} alt="" />
              </button>
            )) : <small>Sube fotos del producto para elegir la de cada color.</small>}
          </div>
          <button type="button" className="glow-color-del" onClick={() => onChange(colors.filter((_, k) => k !== i))} aria-label="Quitar color">✕</button>
        </div>
      ))}
      <div className="glow-color-ideas">
        <button type="button" onClick={() => add()}>+ Otro color</button>
        {COLOR_IDEAS.filter((n) => !colors.some((c) => c.name.toLowerCase() === n.toLowerCase())).slice(0, 6).map((n) => (
          <button type="button" key={n} className="is-idea" onClick={() => add(n)}>+ {n}</button>
        ))}
      </div>
    </div>
  );
}

export function ProductForm({ initial, busy, onSave, onClose }) {
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
      : fw === "kids" ? { sizes: d.sizes, gender: d.gender || "unisex" }
      : ADULT_SIZE_CATS.includes(f.category) ? { sizes: d.sizes } : {};
    const colors = (d.colors || []).filter((c) => c.name.trim()).map((c) => ({ name: c.name.trim(), img: f.images.includes(c.img) ? c.img : "" }));
    if (colors.length) details.colors = colors;
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
            <Field label="Tallas disponibles"><div className="glow-pf-chips">{(SHOE_CATS.includes(f.category) ? SHOE_SIZES : KID_SIZES).map((t) => <button type="button" key={t} className={(f.details.sizes || []).includes(t) ? "is-on" : ""} onClick={() => toggleIn("sizes", t)}>{t}</button>)}</div></Field>
            <Field label="Para"><div className="glow-pf-chips">{GENDERS.map(([k, l]) => <button type="button" key={k} className={(f.details.gender || "unisex") === k ? "is-on" : ""} onClick={() => setD("gender", k)}>{l}</button>)}</div></Field>
            <p className="glow-pf-hint">💡 La tienda recomienda la talla según la estatura del peque (tabla: 2 → hasta 98 cm, 4 → 112, 6 → 124, 8 → 136, 10 → 146).</p>
          </div>
        )}
        {ADULT_SIZE_CATS.includes(f.category) && (
          <div className="glow-pf-extra is-kids">
            <b>👗 Tallas</b>
            <Field label="Tallas disponibles"><div className="glow-pf-chips">{ADULT_SIZES.map((t) => <button type="button" key={t} className={(f.details.sizes || []).includes(t) ? "is-on" : ""} onClick={() => toggleIn("sizes", t)}>{t}</button>)}</div></Field>
            <p className="glow-pf-hint">La clienta elige su talla en la tarjeta del producto antes de añadirlo al carrito.</p>
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
                  <img src={imgUrl(src, 160)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
        <ColorEditor
          colors={f.details.colors || []}
          images={f.images}
          onChange={(colors) => setD("colors", colors)}
        />
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
export const STATUS_INFO = {
  pendiente: { label: "Por verificar", color: "#D48A12", bg: "#FFF6E5" },
  verificado: { label: "Pago verificado", color: "#1FA971", bg: "#EAF8F1" },
  enviado: { label: "Enviado", color: "#742284", bg: "#F4ECF8" },
  rechazado: { label: "Rechazado", color: "#C0392B", bg: "#FDECEA" },
};

// Lo que la tienda leyó en la captura del cliente (orientativo: el pago real
// siempre se confirma viendo el movimiento en tu Yape).
export function PayCheck({ c }) {
  const item = (v, ok, warn, unknown) => <span className={v === true ? "is-ok" : v === false ? "is-warn" : ""}>{v === true ? ok : v === false ? warn : unknown}</span>;
  const doubt = c.toMe !== true || c.amountOk !== true || c.dateOk === false || !c.app;
  return (
    <div className={`glow-paycheck${doubt ? " is-doubt" : ""}`}>
      <b>{doubt ? "⚠ Revisa bien esta captura" : "✓ La captura se ve bien"}</b>
      {item(c.app ? true : null, `App: ${c.app === "plin" ? "Plin" : "Yape"}`, "", "App: no reconocida")}
      {item(c.amountOk, `Monto ✓${c.amount != null ? " " + money(c.amount) : ""}`, "Monto no coincide", "Monto: no leído")}
      {item(c.toMe, "Titular ✓", "Titular no coincide", "Titular: no leído")}
      {item(c.dateOk, "Fecha ✓", "Fecha antigua", "Fecha: no leída")}
    </div>
  );
}

export function OrdersPanel() {
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
              {o.payCheck && <PayCheck c={o.payCheck} />}
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
export function ShippingSettings({ value, onChange }) {
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
export function CustomersPanel() {
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
export function ReviewsPanel() {
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
export const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];

export const dayMonthText = (v) => { const [m, d] = v.split("-").map(Number); return `${d} ${MONTHS[m - 1]}`; };

export function DayMonth({ value, onChange }) {
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

export function SeasonsPanel({ settings, onSave }) {
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

export function SettingsPanel({ settings, onSave }) {
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
