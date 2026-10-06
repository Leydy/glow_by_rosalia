// Juego del día «Atrapa al michi»: 30 segundos para atrapar michis con el
// cesto. Michi = +1, michi dorado = +3, pepino = −2 (¡a los michis les asusta!).
// Una vez al día da hasta 10 Michipuntos (si la clienta tiene cuenta).
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { getGameToday, sendGameScore } from "../api.js";

const SECONDS = 30;
const KINDS = [
  { emoji: "🐱", pts: 1, w: 62 },
  { emoji: "😺", pts: 1, w: 20 },
  { emoji: "🌟", pts: 3, w: 8, gold: true },
  { emoji: "🥒", pts: -2, w: 10 },
];
const pick = () => {
  let r = Math.random() * KINDS.reduce((s, k) => s + k.w, 0);
  return KINDS.find((k) => (r -= k.w) < 0) || KINDS[0];
};
export const gamePoints = (score) => Math.max(0, Math.min(10, Math.ceil(score / 3)));

export function CatchGame({ customer, onClose, onJoin }) {
  const canvas = useRef(null);
  const [phase, setPhase] = useState("intro"); // intro | play | end
  const [score, setScore] = useState(0);
  const [left, setLeft] = useState(SECONDS);
  const [today, setToday] = useState(null); // { played, points }
  const [result, setResult] = useState(null);
  const state = useRef(null);

  useEffect(() => {
    if (customer?.token) getGameToday().then(setToday).catch(() => setToday(null));
  }, [customer?.token]);

  const start = () => {
    setScore(0);
    setLeft(SECONDS);
    setResult(null);
    setPhase("play");
  };

  useEffect(() => {
    if (phase !== "play") return;
    const c = canvas.current;
    const ctx = c.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const W = c.clientWidth, H = c.clientHeight;
    c.width = W * dpr; c.height = H * dpr;
    ctx.scale(dpr, dpr);
    const s = { x: W / 2, items: [], pops: [], score: 0, t0: performance.now(), last: performance.now(), spawn: 0, keys: {} };
    state.current = s;
    const move = (clientX) => { const r = c.getBoundingClientRect(); s.x = Math.max(40, Math.min(W - 40, clientX - r.left)); };
    const onPointer = (e) => move(e.clientX);
    const onTouch = (e) => { if (e.touches[0]) move(e.touches[0].clientX); e.preventDefault(); };
    const onKey = (e) => { s.keys[e.key] = e.type === "keydown"; };
    c.addEventListener("pointermove", onPointer);
    c.addEventListener("pointerdown", onPointer);
    c.addEventListener("touchmove", onTouch, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    let raf;
    const frame = (now) => {
      const dt = Math.min(0.05, (now - s.last) / 1000);
      s.last = now;
      const elapsed = (now - s.t0) / 1000;
      const remain = Math.max(0, SECONDS - elapsed);
      setLeft(Math.ceil(remain));
      if (s.keys.ArrowLeft) s.x = Math.max(40, s.x - 520 * dt);
      if (s.keys.ArrowRight) s.x = Math.min(W - 40, s.x + 520 * dt);
      // cada vez caen más rápido y más seguido
      const speed = 150 + elapsed * 9;
      s.spawn -= dt;
      if (s.spawn <= 0) {
        const k = pick();
        s.items.push({ ...k, x: 24 + Math.random() * (W - 48), y: -30, vy: speed * (0.8 + Math.random() * 0.5), rot: Math.random() * 6 });
        s.spawn = Math.max(0.28, 0.75 - elapsed * 0.015);
      }
      ctx.clearRect(0, 0, W, H);
      // cesto
      const by = H - 46;
      ctx.font = "54px serif";
      ctx.textAlign = "center";
      ctx.fillText("🧺", s.x, by + 24);
      ctx.font = "36px serif";
      s.items = s.items.filter((it) => {
        it.y += it.vy * dt;
        it.rot += dt * 2;
        if (it.y > by - 18 && it.y < by + 20 && Math.abs(it.x - s.x) < 46) {
          s.score = Math.max(0, s.score + it.pts);
          setScore(s.score);
          s.pops.push({ x: it.x, y: by - 30, txt: it.pts > 0 ? `+${it.pts}` : `${it.pts}`, good: it.pts > 0, life: 0.8 });
          if (navigator.vibrate && it.pts < 0) navigator.vibrate(60);
          return false;
        }
        if (it.y > H + 30) return false;
        ctx.save();
        ctx.translate(it.x, it.y);
        ctx.rotate(Math.sin(it.rot) * 0.25);
        if (it.gold) { ctx.shadowColor = "#F2C14E"; ctx.shadowBlur = 18; }
        ctx.fillText(it.emoji, 0, 12);
        ctx.restore();
        return true;
      });
      ctx.font = "800 22px Manrope, sans-serif";
      s.pops = s.pops.filter((p) => {
        p.life -= dt; p.y -= 40 * dt;
        ctx.globalAlpha = Math.max(0, p.life / 0.8);
        ctx.fillStyle = p.good ? "#2E8B57" : "#C0394F";
        ctx.fillText(p.txt, p.x, p.y);
        ctx.globalAlpha = 1;
        return p.life > 0;
      });
      if (remain <= 0) { finish(s.score); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      c.removeEventListener("pointermove", onPointer);
      c.removeEventListener("pointerdown", onPointer);
      c.removeEventListener("touchmove", onTouch);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const finish = async (final) => {
    setPhase("end");
    if (!customer?.token) return setResult({ guest: true, pts: gamePoints(final) });
    try {
      const r = await sendGameScore(final);
      setResult(r);
      setToday({ played: true, points: r.points });
      window.dispatchEvent(new Event("glow:points"));
    } catch (e) {
      setResult({ error: e.message });
    }
  };

  const played = today?.played;
  return (
    <div className="glow-modal-bg glow-game-bg" onClick={phase === "play" ? undefined : onClose}>
      <div className="glow-game" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Atrapa al michi">
        {phase !== "play" && <button className="glow-pv-x" onClick={onClose} aria-label="Cerrar"><X size={22} /></button>}
        {phase === "play" ? (
          <>
            <div className="glow-game-hud"><span>🐱 <b>{score}</b></span><span>⏱️ <b>{left}</b> s</span></div>
            <canvas ref={canvas} className="glow-game-canvas" />
            <p className="glow-game-tip">Mueve el cesto con el dedo, el mouse o las flechas ← →</p>
          </>
        ) : phase === "end" ? (
          <div className="glow-game-end">
            <div className="glow-game-big">🧺</div>
            <h3>¡Atrapaste {score} michi{score === 1 ? "" : "s"}!</h3>
            {result?.guest && <p>Con tu cuenta habrías ganado <b>{result.pts} Michipuntos</b>. <button className="glow-inline-link" onClick={() => { onClose(); onJoin?.(); }}>Únete gratis</button> y juega cada día.</p>}
            {result?.points > 0 && <p className="glow-game-win">🎉 ¡Ganaste <b>{result.points} Michipuntos</b>! Vuelve mañana por más.</p>}
            {result?.already && <p>Hoy ya ganaste tus Michipuntos del juego. ¡Vuelve mañana! Puedes seguir jugando por diversión.</p>}
            {result?.points === 0 && !result?.already && <p>Esta vez no sumaste puntos. ¡Inténtalo otra vez mañana!</p>}
            {result?.error && <p>{result.error}</p>}
            <button className="glow-game-go" onClick={start}>Jugar otra vez</button>
          </div>
        ) : (
          <div className="glow-game-intro">
            <div className="glow-game-big">🐱🧺</div>
            <h3>Atrapa al michi</h3>
            <p>Tienes <b>{SECONDS} segundos</b>. Atrapa los michis con tu cesto:</p>
            <ul>
              <li>🐱 Michi <b>+1</b></li>
              <li>🌟 Estrella dorada <b>+3</b></li>
              <li>🥒 Pepino <b>−2</b> (¡a los michis les asusta!)</li>
            </ul>
            <p className="glow-game-prize">{customer?.token ? (played ? "Hoy ya ganaste tus puntos: juega por diversión 💕" : "Gana hasta 10 Michipuntos, una vez al día 🧶") : "Únete gratis para ganar hasta 10 Michipuntos al día 🧶"}</p>
            <button className="glow-game-go" onClick={start}>¡Jugar!</button>
          </div>
        )}
      </div>
    </div>
  );
}

// Banner para invitar a jugar.
export function GameBanner({ onPlay }) {
  return (
    <button className="glow-game-banner" onClick={onPlay}>
      <span className="glow-game-banner-emoji" aria-hidden="true">🐱🧺</span>
      <span><b>Juego del día: Atrapa al michi</b><small>30 segundos · gana hasta 10 Michipuntos</small></span>
      <span className="glow-game-banner-go">Jugar ›</span>
    </button>
  );
}
