// Panel: prepara la foto de un arete para el probador con cámara. Le quita el
// fondo con IA (en este navegador, gratis) y separa un solo arete del par.
import { useState } from "react";
import { uploadImages } from "../api.js";
import { imgUrl } from "../lib/util.js";

const REMOVER = "https://esm.sh/@imgly/background-removal@1.4.5";

// Partes con color de la imagen (columnas con píxeles visibles): normalmente 2 aretes.
function findPieces(canvas) {
  const { width: w, height: h } = canvas;
  const data = canvas.getContext("2d").getImageData(0, 0, w, h).data;
  const col = new Array(w).fill(0);
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 40) col[x]++;
  const runs = [];
  let start = -1;
  for (let x = 0; x <= w; x++) {
    const on = x < w && col[x] > 1;
    if (on && start < 0) start = x;
    if (!on && start >= 0) { if (x - start > w * 0.06) runs.push([start, x]); start = -1; }
  }
  return runs.map(([x0, x1]) => {
    let y0 = h, y1 = 0;
    for (let y = 0; y < h; y++) for (let x = x0; x < x1; x += 2) if (data[(y * w + x) * 4 + 3] > 40) { if (y < y0) y0 = y; if (y > y1) y1 = y; break; }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 + 1 };
  });
}

function crop(canvas, r) {
  const pad = 6;
  const c = document.createElement("canvas");
  c.width = r.w + pad * 2;
  c.height = r.h + pad * 2;
  c.getContext("2d").drawImage(canvas, r.x, r.y, r.w, r.h, pad, pad, r.w, r.h);
  return c.toDataURL("image/png");
}

export function TryOnPrep({ images, value, onChange }) {
  const [src, setSrc] = useState(images[0] || "");
  const [state, setState] = useState(""); // "" | working | pick | saving | error
  const [msg, setMsg] = useState("");
  const [options, setOptions] = useState([]); // [{label, url(dataURL)}]

  const run = async () => {
    setState("working");
    setMsg("Quitando el fondo… (puede tardar un minuto la primera vez)");
    try {
      // la foto en PNG (la librería no lee todos los formatos)
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = imgUrl(src, 900).replace("f_auto", "f_png");
      await img.decode();
      const c0 = document.createElement("canvas");
      c0.width = img.naturalWidth;
      c0.height = img.naturalHeight;
      c0.getContext("2d").drawImage(img, 0, 0);
      const blob = await new Promise((ok) => c0.toBlob(ok, "image/png"));
      const mod = await import(/* @vite-ignore */ REMOVER);
      const out = await mod.removeBackground(blob, { output: { format: "image/png" } });
      const cut = new Image();
      cut.src = URL.createObjectURL(out);
      await cut.decode();
      const c = document.createElement("canvas");
      c.width = cut.naturalWidth;
      c.height = cut.naturalHeight;
      c.getContext("2d").drawImage(cut, 0, 0);
      const pieces = findPieces(c).sort((a, b) => a.x - b.x);
      const opts = [];
      if (pieces.length >= 2) {
        opts.push({ label: "Arete de la izquierda", url: crop(c, pieces[0]) });
        opts.push({ label: "Arete de la derecha", url: crop(c, pieces[pieces.length - 1]) });
      }
      const all = pieces.length ? pieces.reduce((r, p) => ({ x: Math.min(r.x, p.x), y: Math.min(r.y, p.y), w: Math.max(r.x + r.w, p.x + p.w) - Math.min(r.x, p.x), h: Math.max(r.y + r.h, p.y + p.h) - Math.min(r.y, p.y) }), pieces[0]) : { x: 0, y: 0, w: c.width, h: c.height };
      opts.push({ label: pieces.length >= 2 ? "Los dos juntos" : "Así como está", url: crop(c, all) });
      setOptions(opts);
      setState("pick");
      setMsg("Elige UN solo arete (se pondrá uno en cada oreja).");
    } catch (e) {
      setState("error");
      setMsg("No se pudo quitar el fondo. Prueba con otra foto donde el arete se vea solo y sobre fondo liso.");
    }
  };

  const choose = async (o) => {
    setState("saving");
    setMsg("Guardando…");
    try {
      const [url] = await uploadImages([o.url]);
      onChange(url);
      setOptions([]);
      setState("");
      setMsg("✓ Listo: este producto ya tiene «Pruébatelo».");
    } catch {
      setState("error");
      setMsg("No se pudo guardar la foto. Revisa tu conexión.");
    }
  };

  return (
    <div className="glow-pf-extra glow-tryprep">
      <b>✨ Probador con cámara</b>
      {value && (
        <div className="glow-tryprep-now">
          <img src={value} alt="" />
          <span>Las clientas ya pueden probarse este arete.</span>
          <button type="button" onClick={() => onChange("")}>Quitar</button>
        </div>
      )}
      {!value && <p className="glow-pf-hint">Elige la foto donde el arete se vea mejor (ideal: fondo liso, sin modelo) y la tienda le quitará el fondo.</p>}
      {images.length > 0 && state !== "pick" && (
        <div className="glow-tryprep-pics">
          {images.map((u) => (
            <button type="button" key={u} className={src === u ? "is-on" : ""} onClick={() => setSrc(u)}><img src={imgUrl(u, 100)} alt="" /></button>
          ))}
        </div>
      )}
      {state === "pick" && (
        <div className="glow-tryprep-opts">
          {options.map((o) => (
            <button type="button" key={o.label} onClick={() => choose(o)}><img src={o.url} alt="" /><span>{o.label}</span></button>
          ))}
        </div>
      )}
      {msg && <p className={`glow-tryprep-msg${state === "error" ? " is-err" : ""}`}>{msg}</p>}
      {state !== "pick" && (
        <button type="button" className="glow-tryprep-go" disabled={!src || state === "working" || state === "saving"} onClick={run}>
          {state === "working" ? "Trabajando…" : value ? "Preparar otra vez" : "Preparar para «Pruébatelo»"}
        </button>
      )}
    </div>
  );
}
