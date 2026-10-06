// Botón "🔔 Avísame": activa las notificaciones del celular.
import { useState } from "react";
import { enablePush, pushState } from "./notify.js";
import { canInstall, installApp } from "./InstallApp.jsx";

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

export function NotifyButton({ text = "🔔 Avísame de mi pedido", className = "glow-notify-btn" }) {
  const [st, setSt] = useState(pushState());
  if (st === "granted" || st === "ok") return <p className="glow-notify-ok">🔔 Avisos activados: te contaremos cuando tu pedido avance.</p>;
  if (st === "unsupported") {
    // iPhone: los avisos funcionan solo con la app instalada
    if (isIOS() && canInstall()) {
      return <button className={className} onClick={() => installApp()}>📲 Instala la app para recibir avisos</button>;
    }
    return null;
  }
  if (st === "denied") return <p className="glow-notify-off">Los avisos están bloqueados. Puedes activarlos desde los permisos del navegador.</p>;
  return (
    <button className={className} onClick={async () => setSt(await enablePush())}>
      {st === "error" ? "No se pudo activar, prueba otra vez" : text}
    </button>
  );
}
