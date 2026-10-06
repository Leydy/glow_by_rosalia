// "Instala Glow en tu celular": aviso para instalar la tienda como app (PWA).
// En Android/Chrome usa el aviso nativo; en iPhone explica cómo hacerlo desde Safari.
import { useEffect, useState } from "react";
import { X } from "lucide-react";

const isStandalone = () => window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
const seenRecently = () => {
  try { return Date.now() - Number(localStorage.getItem("glow:app-visto") || 0) < 5 * 86400e3; } catch { return true; }
};
const markSeen = () => { try { localStorage.setItem("glow:app-visto", String(Date.now())); } catch { /* sin almacenamiento */ } };

// Registra el Service Worker (app instalable + notificaciones).
export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => { /* sin SW: la tienda funciona igual */ });
  });
}

// Guarda el aviso nativo de Chrome para mostrarlo cuando nosotros queramos.
let deferred = null;
const listeners = new Set();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    listeners.forEach((f) => f());
  });
  window.addEventListener("appinstalled", () => { deferred = null; markSeen(); listeners.forEach((f) => f()); });
}

// Para botones de "Instalar la app" en otros lugares (menú de cuenta).
export function canInstall() {
  return !isStandalone() && (!!deferred || isIOS());
}
export async function installApp() {
  if (deferred) {
    deferred.prompt();
    const r = await deferred.userChoice.catch(() => null);
    deferred = null;
    return r?.outcome === "accepted";
  }
  window.dispatchEvent(new Event("glow:install-ios"));
  return false;
}

export function InstallApp() {
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    const offer = () => { if (!seenRecently() && (deferred || isIOS())) setShow(true); };
    // se ofrece después de un ratito, para no interrumpir la llegada
    const t = setTimeout(offer, 25000);
    listeners.add(offer);
    const openIos = () => { setIos(true); setShow(true); };
    window.addEventListener("glow:install-ios", openIos);
    return () => { clearTimeout(t); listeners.delete(offer); window.removeEventListener("glow:install-ios", openIos); };
  }, []);

  if (!show) return null;
  const close = () => { markSeen(); setShow(false); setIos(false); };
  const install = async () => {
    if (isIOS() && !deferred) return setIos(true);
    await installApp();
    close();
  };

  return (
    <div className="glow-install" role="dialog" aria-label="Instalar la app">
      <img src="/icons/icon-192.png" alt="" />
      {ios ? (
        <div>
          <b>Instala Glow en tu iPhone</b>
          <span>Toca <b>Compartir</b> <span aria-hidden="true">⬆️</span> abajo en Safari y luego <b>«Añadir a pantalla de inicio»</b>.</span>
        </div>
      ) : (
        <div>
          <b>📲 Instala Glow en tu celular</b>
          <span>Ábrela con un toque, más rápido y con avisos de tus pedidos.</span>
        </div>
      )}
      {!ios && <button className="glow-install-go" onClick={install}>Instalar</button>}
      <button className="glow-install-x" onClick={close} aria-label="Ahora no"><X size={18} /></button>
    </div>
  );
}
