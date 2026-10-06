// Service Worker de Glow: hace que la app abra rápido (guarda la tienda en el
// celular) y recibe las notificaciones. Cambia VERSION para renovar la caché.
const VERSION = "glow-v1";
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // La API siempre va a internet (precios y stock al día); sin señal, la última respuesta guardada.
  if (url.origin === location.origin && url.pathname.startsWith("/api/")) {
    if (url.pathname === "/api/products" || url.pathname === "/api/settings") {
      e.respondWith(
        fetch(req)
          .then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return res; })
          .catch(() => caches.match(req))
      );
    }
    return;
  }

  // Páginas: primero internet (para tener siempre la versión nueva), si no, la guardada.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put("/", copy)); return res; })
        .catch(() => caches.match("/"))
    );
    return;
  }

  // Código, estilos, íconos y fotos de Cloudinary: lo guardado al instante y se actualiza por detrás.
  const sameAssets = url.origin === location.origin && (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/"));
  const photos = url.hostname === "res.cloudinary.com";
  if (sameAssets || photos) {
    e.respondWith(
      caches.open(VERSION).then(async (c) => {
        const hit = await c.match(req);
        const net = fetch(req).then((res) => { if (res.ok || res.type === "opaque") c.put(req, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      })
    );
  }
});

/* ---------- Notificaciones ---------- */
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : "" }; }
  e.waitUntil(
    self.registration.showNotification(d.title || "Glow by Rosalía 🐾", {
      body: d.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      image: d.image || undefined,
      data: { url: d.url || "/" },
      tag: d.tag || undefined,
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || "/", location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const open = list.find((w) => w.url.startsWith(location.origin));
      if (open) { open.navigate(url); return open.focus(); }
      return self.clients.openWindow(url);
    })
  );
});
