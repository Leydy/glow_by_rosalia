// "Pruébatelo": la clienta se ve con los aretes puestos, en vivo con la cámara
// (o con una foto suya). Usa MediaPipe Face Landmarker de Google, que corre en
// el propio celular: la imagen no sale del dispositivo. Gratis.
import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";

const VISION = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
const MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

let landmarkerP = null;
async function getLandmarker(mode) {
  if (!landmarkerP) {
    landmarkerP = (async () => {
      const v = await import(/* @vite-ignore */ `${VISION}/vision_bundle.mjs`);
      const files = await v.FilesetResolver.forVisionTasks(`${VISION}/wasm`);
      return v.FaceLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: MODEL, delegate: "GPU" },
        runningMode: "VIDEO",
        numFaces: 1,
      });
    })();
  }
  const lm = await landmarkerP;
  await lm.setOptions({ runningMode: mode });
  return lm;
}

// Puntos de la cara (malla de 478 puntos): borde de la cara junto a la oreja
// (234 / 454) y ángulo de la mandíbula (132 / 361). El lóbulo queda entre ambos.
const SIDES = [
  { top: 234, jaw: 132, out: -1 }, // oreja izquierda de la imagen
  { top: 454, jaw: 361, out: 1 },
];

function drawEarrings(ctx, pts, w, h, img, scale) {
  const P = (i) => ({ x: pts[i].x * w, y: pts[i].y * h });
  const faceW = Math.hypot(P(454).x - P(234).x, P(454).y - P(234).y);
  // cabeza girada: el arete de la oreja que se esconde no se dibuja
  const nose = P(1);
  const mid = (P(234).x + P(454).x) / 2;
  const turn = (nose.x - mid) / faceW; // negativo = mira a un lado, positivo = al otro
  const size = faceW * 0.2 * scale;
  const ratio = img.naturalHeight / img.naturalWidth;
  SIDES.forEach((s, k) => {
    if ((k === 0 && turn < -0.12) || (k === 1 && turn > 0.12)) return;
    const a = P(s.top), b = P(s.jaw);
    const lobe = { x: a.x + (b.x - a.x) * 0.55 + s.out * faceW * 0.02, y: a.y + (b.y - a.y) * 0.55 };
    // inclinación de la cabeza: el arete cuelga en la dirección frente → mentón
    const ang = -Math.atan2(P(152).x - P(10).x, P(152).y - P(10).y);
    ctx.save();
    ctx.translate(lobe.x, lobe.y);
    ctx.rotate(ang);
    ctx.drawImage(img, -size / 2, 0, size, size * ratio);
    ctx.restore();
  });
}

export function TryOn({ product, onClose, onAdd }) {
  const video = useRef(null);
  const canvas = useRef(null);
  const earring = useRef(null);
  const stream = useRef(null);
  const raf = useRef(0);
  const [mode, setMode] = useState("intro"); // intro | loading | live | photo | error
  const [msg, setMsg] = useState("");
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);
  scaleRef.current = scale;
  const [found, setFound] = useState(true);

  // la foto del arete sin fondo
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = product.details.tryon;
    earring.current = img;
  }, [product]);

  const stop = () => {
    cancelAnimationFrame(raf.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  };
  useEffect(() => () => stop(), []);

  const startCamera = async () => {
    setMode("loading");
    setMsg("Preparando el probador…");
    try {
      const [lm, s] = await Promise.all([
        getLandmarker("VIDEO"),
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 1280 } }, audio: false }),
      ]);
      stream.current = s;
      const v = video.current;
      v.srcObject = s;
      await v.play();
      setMode("live");
      let last = -1;
      const loop = () => {
        const c = canvas.current;
        if (!c || !v.videoWidth) { raf.current = requestAnimationFrame(loop); return; }
        if (c.width !== v.videoWidth) { c.width = v.videoWidth; c.height = v.videoHeight; }
        const ctx = c.getContext("2d");
        ctx.drawImage(v, 0, 0, c.width, c.height);
        if (v.currentTime !== last) {
          last = v.currentTime;
          const r = lm.detectForVideo(v, performance.now());
          const pts = r.faceLandmarks?.[0];
          setFound(!!pts);
          if (pts && earring.current?.complete) drawEarrings(ctx, pts, c.width, c.height, earring.current, scaleRef.current);
        }
        raf.current = requestAnimationFrame(loop);
      };
      loop();
    } catch (e) {
      stop();
      setMode("error");
      setMsg(e?.name === "NotAllowedError" ? "No diste permiso para usar la cámara. Puedes probar con una foto tuya." : "No pudimos abrir la cámara. Prueba con una foto tuya.");
    }
  };

  // con una foto (selfie de frente, con las orejas visibles)
  const photoRef = useRef(null);
  const [photo, setPhoto] = useState(null);
  const drawPhoto = async (img) => {
    const lm = await getLandmarker("IMAGE");
    // se detecta sobre la foto misma (no sobre el lienzo, que la IA podría limpiar)
    const r = lm.detect(img);
    const pts = r.faceLandmarks?.[0];
    const c = canvas.current;
    const k = Math.min(1, 1100 / Math.max(img.naturalWidth, img.naturalHeight));
    c.width = img.naturalWidth * k;
    c.height = img.naturalHeight * k;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0, c.width, c.height);
    setFound(!!pts);
    if (pts) drawEarrings(ctx, pts, c.width, c.height, earring.current, scaleRef.current);
  };
  const onPhoto = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    stop();
    setMode("loading");
    setMsg("Buscando tu carita…");
    try {
      const img = new Image();
      img.src = URL.createObjectURL(f);
      await img.decode();
      photoRef.current = img;
      setPhoto(img);
      setMode("photo");
      await drawPhoto(img);
    } catch {
      setMode("error");
      setMsg("No pudimos leer esa foto. Prueba con otra.");
    }
  };
  useEffect(() => { if (mode === "photo" && photoRef.current) drawPhoto(photoRef.current); }, [scale]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = () => {
    const a = document.createElement("a");
    a.href = canvas.current.toDataURL("image/jpeg", 0.9);
    a.download = `glow-${product.name.slice(0, 20).replace(/\W+/g, "-")}.jpg`;
    a.click();
  };

  return (
    <div className="glow-modal-bg glow-tryon-bg" onClick={() => { stop(); onClose(); }}>
      <div className="glow-tryon" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Pruébatelo">
        <button className="glow-pv-x" onClick={() => { stop(); onClose(); }} aria-label="Cerrar"><X size={22} /></button>
        <h3>✨ Pruébatelo</h3>
        <p className="glow-tryon-sub">{product.name}</p>

        <div className={`glow-tryon-stage${mode === "live" ? " is-mirror" : ""}`}>
          <video ref={video} playsInline muted style={{ display: "none" }} />
          <canvas ref={canvas} style={{ display: mode === "live" || mode === "photo" ? "block" : "none" }} />
          {(mode === "intro" || mode === "error") && (
            <div className="glow-tryon-intro">
              <img src={product.details.tryon} alt="" />
              {mode === "error" ? <p>{msg}</p> : <p>Mírate con los aretes puestos. Ponte de frente, con buena luz y el cabello detrás de las orejas.</p>}
            </div>
          )}
          {mode === "loading" && <div className="glow-tryon-intro"><div className="glow-tryon-spin" /><p>{msg}</p></div>}
          {(mode === "live" || mode === "photo") && !found && <span className="glow-tryon-hint">No vemos tu carita: acércate y ponte de frente 🙂</span>}
        </div>

        {(mode === "live" || mode === "photo") && (
          <label className="glow-tryon-size">Tamaño
            <input type="range" min="0.6" max="1.6" step="0.05" value={scale} onChange={(e) => setScale(Number(e.target.value))} />
          </label>
        )}

        <div className="glow-tryon-btns">
          {mode !== "live" && <button className="is-main" onClick={startCamera}><Camera size={18} /> Usar mi cámara</button>}
          <label className="is-ghost"><ImagePlus size={18} /> {photo ? "Otra foto" : "Subir una foto"}<input type="file" accept="image/*" hidden onChange={onPhoto} /></label>
          {(mode === "live" || mode === "photo") && found && <button className="is-ghost" onClick={save}>📸 Guardar foto</button>}
          {onAdd && <button className="is-add" onClick={() => { stop(); onAdd(); }}>Añadir al carrito</button>}
        </div>
        <p className="glow-tryon-privacy">🔒 Todo pasa en tu celular: tu imagen no se envía ni se guarda en ningún lado.</p>
      </div>
    </div>
  );
}
