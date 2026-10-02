// "Importar de Temu": se pega lo que copió el marcador, se eligen fotos y
// datos de cada producto, y se crean en la tienda (las fotos se suben a Cloudinary).
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { C, money } from "../theme.js";
import { WORLDS, WORLD_KEYS, worldOf } from "../worlds.js";
import { importImages } from "../api.js";
import { temuBookmarklet, parseTemuPaste } from "./temuBookmarklet.js";
import { suggestName, autoDesc, guessCategory, guessGender } from "./temuText.js";


export function TemuImport({ onSave, onClose }) {
  const [items, setItems] = useState([]);
  const [paste, setPaste] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [done, setDone] = useState(0);
  const linkRef = useRef(null);

  // React no deja poner "javascript:" en href; se pone directo en el enlace.
  useEffect(() => {
    linkRef.current?.setAttribute("href", temuBookmarklet());
  }, []);

  const read = (text) => {
    setPaste(text);
    if (!text.trim()) return setMsg("");
    const list = parseTemuPaste(text);
    if (!list) return setMsg("Eso no parece copiado con el marcador «🐾 Copiar de Temu». Vuelve a tocarlo en Temu y pega otra vez.");
    setItems((cur) => {
      const urls = new Set(cur.map((i) => i.url));
      const nuevos = list.filter((p) => !urls.has(p.url)).map((p) => ({
        url: p.url,
        sel: true,
        title: p.nombre, // título original de Temu (largo)
        name: suggestName(p.nombre),
        desc: autoDesc(p.nombre, guessCategory(p.nombre + " " + p.ruta)),
        descEdited: false,
        cost: p.precio ?? "",
        price: p.precio ? String(Math.ceil(p.precio * 3)) : "",
        stock: "5",
        category: guessCategory(p.nombre + " " + p.ruta), // sugerida: se puede cambiar
        ruta: p.ruta,
        fotos: p.fotos,
        keep: p.fotos.map(() => true),
        main: 0,
      }));
      setMsg(nuevos.length ? `✓ ${nuevos.length} producto${nuevos.length === 1 ? "" : "s"} nuevo${nuevos.length === 1 ? "" : "s"} · ${nuevos.reduce((n, p) => n + p.fotos.length, 0)} fotos` : "Esos productos ya estaban en la lista.");
      return [...cur, ...nuevos];
    });
    setPaste("");
  };

  const set = (i, patch) => setItems((l) => l.map((it, k) => (k === i ? { ...it, ...patch } : it)));
  // Borra una foto del producto (la principal pasa a ser la primera que quede).
  const removePhoto = (i, k) => setItems((l) => l.map((it, n) => {
    if (n !== i) return it;
    const main = k === it.main ? 0 : k < it.main ? it.main - 1 : it.main;
    return { ...it, fotos: it.fotos.filter((_, j) => j !== k), keep: it.keep.filter((_, j) => j !== k), main };
  }));
  const chosen = items.filter((it) => it.sel);
  const valid = (it) => it.name.trim() && Number(it.price) > 0 && it.cost !== "" && it.stock !== "" && it.keep.some(Boolean);

  const create = async () => {
    const list = chosen.filter(valid);
    if (!list.length) return;
    setDone(0);
    for (const [n, it] of list.entries()) {
      setBusy(`Creando ${n + 1} de ${list.length}: ${it.name}…`);
      // la foto principal va primero
      const urls = it.fotos.filter((_, k) => it.keep[k]);
      const main = it.fotos[it.main];
      const ordered = it.keep[it.main] ? [main, ...urls.filter((u) => u !== main)] : urls;
      try {
        const { urls: images } = await importImages(ordered);
        if (!images.length) throw new Error("no se pudieron traer las fotos");
        await onSave({
          name: it.name.trim(), category: it.category, cost: Number(it.cost) || 0, price: Number(it.price), stock: Number(it.stock) || 0,
          emoji: "✨", bestSeller: false, images, desc: it.desc.trim(), details: worldOf(it.category) === "kids" ? { sizes: [], gender: guessGender(it.title + " " + (it.ruta || "")) } : {},
        });
        setItems((l) => l.filter((x) => x.url !== it.url));
        setDone((d) => d + 1);
      } catch (e) {
        setBusy("");
        setMsg(`No se pudo crear «${it.name}»: ${e.message}. Los demás quedan en la lista.`);
        return;
      }
    }
    setBusy("");
    setMsg(list.length === 1 ? "🎉 ¡Listo! Se creó 1 producto. Ya está en tu tienda." : `🎉 ¡Listo! Se crearon ${list.length} productos. Ya están en tu tienda.`);
  };

  return (
    <div className="glow-modal-bg" onClick={busy ? undefined : onClose}>
      <div className="glow-temu" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Importar de Temu">
        <button className="glow-join-x" onClick={onClose} disabled={!!busy} aria-label="Cerrar"><X size={20} /></button>
        <h3>📦 Importar de Temu</h3>

        <details className="glow-temu-how" open={!items.length}>
          <summary>¿Cómo se usa?</summary>
          <ol>
            <li>
              Arrastra este botón a la <b>barra de favoritos</b> de tu navegador (solo la primera vez):{" "}
              <a ref={linkRef} className="glow-temu-bm" onClick={(e) => e.preventDefault()} title="Arrástrame a tu barra de favoritos">🐾 Copiar de Temu</a>
              <small>¿No ves la barra de favoritos? Presiona <b>Ctrl + Shift + B</b>.</small>
            </li>
            <li>En Temu (en tu computadora), abre la <b>página del producto</b> que compraste y toca <b>«🐾 Copiar de Temu»</b> en tu barra. Puedes hacerlo con varios productos: se van sumando.</li>
            <li>Vuelve aquí y pega (<b>Ctrl + V</b>) en el cuadro de abajo.</li>
          </ol>
        </details>

        <textarea
          className="glow-temu-paste"
          value={paste}
          onChange={(e) => read(e.target.value)}
          placeholder="Pega aquí lo que copiaste en Temu (Ctrl + V)"
          rows={2}
        />
        {msg && <p className="glow-temu-msg">{msg}</p>}

        {items.length > 0 && (
          <div className="glow-temu-list">
            {items.map((it, i) => {
              const w = worldOf(it.category);
              const gain = Number(it.price) - Number(it.cost || 0);
              return (
                <div key={it.url} className={`glow-temu-item${it.sel ? "" : " is-off"}`}>
                  <label className="glow-temu-check">
                    <input type="checkbox" checked={it.sel} onChange={(e) => set(i, { sel: e.target.checked })} />
                    <span>{it.sel ? "Importar" : "No importar"}</span>
                  </label>
                  <div className="glow-temu-gal">
                    {it.fotos.map((u, k) => (
                      <div key={u} className={`glow-temu-ph${k === it.main ? " is-main" : ""}`}>
                        <button type="button" className="glow-temu-pick" onClick={() => set(i, { main: k })} title={k === it.main ? "Foto principal" : "Toca para hacerla principal"}>
                          <img src={u + "?imageView2/2/w/240/q/70"} alt="" loading="lazy" referrerPolicy="no-referrer" />
                          {k === it.main && <span>Principal</span>}
                        </button>
                        <button type="button" className="glow-temu-del" onClick={() => removePhoto(i, k)} aria-label="Borrar esta foto" title="Borrar esta foto">✕</button>
                      </div>
                    ))}
                    <p className="glow-temu-galhint">Toca una foto para hacerla <b>principal</b> · <b>✕</b> para borrarla</p>
                    {it.fotos.length > 1 && (
                      <div className="glow-temu-galbtns">
                        <button type="button" onClick={() => set(i, { fotos: [it.fotos[it.main]], keep: [true], main: 0 })}>Dejar solo la principal</button>
                      </div>
                    )}
                    {!it.fotos.length && <p className="glow-temu-galhint" style={{ color: "#C0394F" }}>Sin fotos: este producto no se puede crear.</p>}
                  </div>
                  <div className="glow-temu-fields">
                    <label className="is-wide">Nombre en tu tienda<input value={it.name} onChange={(e) => set(i, { name: e.target.value })} />
                      <small className="glow-temu-orig" title={it.title}>En Temu: {it.title}</small>
                    </label>
                    <label>Categoría
                      <select value={it.category} onChange={(e) => set(i, { category: e.target.value, ...(it.descEdited ? {} : { desc: autoDesc(it.title, e.target.value) }) })}>
                        {WORLD_KEYS.map((k) => (
                          <optgroup key={k} label={`${WORLDS[k].emoji} ${WORLDS[k].name}`}>
                            {WORLDS[k].cats.map((c) => <option key={c}>{c}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    </label>
                    <label>Stock<input type="number" min="0" value={it.stock} onChange={(e) => set(i, { stock: e.target.value })} /></label>
                    <label>Compraste a (S/)<input type="number" min="0" step="0.1" className="is-auto" value={it.cost} onChange={(e) => set(i, { cost: e.target.value })} /></label>
                    <label>Vendes a (S/)<input type="number" min="0" step="0.1" value={it.price} onChange={(e) => set(i, { price: e.target.value })} /></label>
                    <label className="is-wide">Descripción {it.descEdited ? "" : <em className="glow-temu-sug">✨ sugerida, puedes cambiarla</em>}
                      <textarea rows={2} value={it.desc} onChange={(e) => set(i, { desc: e.target.value, descEdited: true })} />
                    </label>
                    <span className="glow-temu-gain">
                      {WORLDS[w].emoji} {WORLDS[w].name}
                      {it.cost !== "" && Number(it.price) > 0 && <> · {gain >= 0 ? `Ganas ${money(gain)} por unidad` : `⚠ Pierdes ${money(-gain)}`}</>}
                    </span>
                    <a className="glow-temu-src" href={it.url} target="_blank" rel="noreferrer">Ver en Temu ↗</a>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {items.length > 0 && (
          <div className="glow-temu-go">
            <span>{busy || `Las fotos se suben a tu Cloudinary. Luego puedes editar descripción, tallas o datos de Skin en Inventario.`}</span>
            <button onClick={create} disabled={!!busy || !chosen.some(valid)} style={{ background: busy || !chosen.some(valid) ? C.line : C.primary }}>
              {busy ? `Creando… (${done})` : `Crear ${chosen.filter(valid).length} producto${chosen.filter(valid).length === 1 ? "" : "s"}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
