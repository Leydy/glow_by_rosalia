// Activar las notificaciones del celular (Web Push, gratis).
import { getPushKey, savePushSub } from "../api.js";

export const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
export const pushState = () => (!pushSupported() ? "unsupported" : Notification.permission); // granted | denied | default

const toKey = (b64) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

// Pide permiso y guarda el celular en la tienda. Devuelve "ok" | "denied" | "unsupported" | "error".
export async function enablePush() {
  if (!pushSupported()) return "unsupported";
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return "denied";
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const { key } = await getPushKey();
      if (!key) return "error";
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(key) });
    }
    await savePushSub(sub.toJSON());
    return "ok";
  } catch {
    return "error";
  }
}

// Si ya dio permiso, vuelve a guardar (p. ej. al iniciar sesión, para ligarlo a su cuenta).
export async function refreshPush() {
  if (pushState() !== "granted") return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await savePushSub(sub.toJSON());
  } catch { /* nada */ }
}
