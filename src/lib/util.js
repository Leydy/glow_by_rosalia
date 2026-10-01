

/* ---------- Carga local (solo el carrito del visitante) ----------
   Los productos y los ajustes ahora viven en la base de datos (Postgres) y se
   piden al backend a través de src/api.js. El carrito sí se queda en el
   navegador, porque es de cada visitante. */

/* ---------- Migración desde el navegador ----------
   Lee los productos que quedaron guardados en localStorage (la versión vieja de
   la tienda) para poder pasarlos a la base de datos. */
export function readBrowserProducts() {
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
export function readBrowserSettings() {
  try {
    const raw = localStorage.getItem("glow:settings");
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s && typeof s === "object" ? s : null;
  } catch {
    return null;
  }
}

export function loadCart() {
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
export function fileToDataURL(file, maxSize = 800, quality = 0.8) {
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

/* ---------- Modo prueba ----------
   Con ?prueba en la dirección se activa para esta pestaña: muestra un aviso,
   permite simular el registro y usar una captura de Yape de ejemplo. Los
   pedidos se marcan como prueba y se pueden borrar desde el panel. */
export const TEST_MODE = (() => {
  try {
    if (new URLSearchParams(window.location.search).has("prueba")) sessionStorage.setItem("glow:prueba", "1");
    return sessionStorage.getItem("glow:prueba") === "1";
  } catch {
    return false;
  }
})();

export function exitTestMode() {
  try { sessionStorage.removeItem("glow:prueba"); } catch { /* sin almacenamiento */ }
  window.location.href = window.location.pathname;
}

// Cliente registrado: se recuerda en este navegador (solo nombre, correo y foto).
export function loadCustomer() {
  try {
    return JSON.parse(localStorage.getItem("glow:cliente") || "null");
  } catch {
    return null;
  }
}

export function saveCustomer(c) {
  try {
    if (c) localStorage.setItem("glow:cliente", JSON.stringify(c));
    else localStorage.removeItem("glow:cliente");
  } catch {
    /* sin almacenamiento: la sesión dura lo que dure la pestaña */
  }
}

// Carga el script de "Acceder con Google" una sola vez.
export let gsiPromise = null;

export function loadGoogleScript() {
  gsiPromise ||= new Promise((ok, fail) => {
    const sc = document.createElement("script");
    sc.src = "https://accounts.google.com/gsi/client";
    sc.async = true;
    sc.onload = ok;
    sc.onerror = () => { gsiPromise = null; fail(new Error("No se pudo cargar Google")); };
    document.head.appendChild(sc);
  });
  return gsiPromise;
}

/* ---------- Favoritos ----------
   Se guardan en este navegador y, si el cliente inició sesión, también en su
   cuenta (así lo acompañan a cualquier dispositivo). */
export function loadFavs() {
  try {
    const v = JSON.parse(localStorage.getItem("glow:favs") || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function storeFavs(list) {
  try {
    localStorage.setItem("glow:favs", JSON.stringify(list));
  } catch {
    /* sin almacenamiento: los favoritos duran lo que dure la pestaña */
  }
}

// Estado del pedido tal como lo ve el cliente.
export const ORDER_STEP = {
  pendiente: { label: "Pago en verificación", color: "#D48A12", bg: "#FFF6E5" },
  verificado: { label: "Pago confirmado", color: "#1FA971", bg: "#EAF8F1" },
  enviado: { label: "¡Pedido enviado!", color: "#742284", bg: "#F4ECF8" },
  rechazado: { label: "Pago no válido · escríbenos", color: "#C0392B", bg: "#FDECEA" },
};

/* ---------- Michipuntos ---------- */
export const fmtPts = (n) => Number(n || 0).toLocaleString("es-PE");

/* ---------- Guía de compras ----------
   La clienta elige quién la acompaña (Doña Baneco, Rosalía, Comisario Willy o
   Cuyito). Vive abajo a la izquierda: saluda, da tips, celebra lo que añade al
   carrito, sugiere algo que combine y la lleva a pagar. Se puede cambiar o
   esconder cuando quiera (se recuerda en este navegador). */
export function loadGuide() {
  try {
    const k = localStorage.getItem("glow:guia"); // clave | "none" | null (sin elegir)
    return k === "capitan" ? "willy" : k; // el doberman ahora es el Comisario Willy
  } catch {
    return "none";
  }
}

export function storeGuide(k) {
  try {
    localStorage.setItem("glow:guia", k);
  } catch {
    /* sin almacenamiento: dura lo que la pestaña */
  }
}

/* ---------- Michi-crédito ---------- */
export const CREDIT_MIN = 30;

// compra mínima para usarlo
export const CREDIT_SHARE = 0.2;

// cubre como máximo el 20% del carrito
export const round2 = (n) => Math.round(n * 100) / 100;

export const creditsChanged = () => window.dispatchEvent(new Event("glow:credits"));

// "3 d 4 h" / "5 h 20 min" hasta una fecha.
export function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "0 min";
  const d = Math.floor(ms / 864e5), h = Math.floor(ms / 36e5) % 24, m = Math.floor(ms / 6e4) % 60;
  return d ? `${d} d ${h} h` : h ? `${h} h ${m} min` : `${m} min`;
}

/* ---------- Reseñas ---------- */
export const REVIEW_PTS = { text: 20, photo: 60 };

// Productos vistos hace poco (en este navegador).
export function loadSeen() {
  try {
    const v = JSON.parse(localStorage.getItem("glow:vistos") || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function markSeen(id) {
  try {
    const next = [id, ...loadSeen().filter((x) => x !== id)].slice(0, 12);
    localStorage.setItem("glow:vistos", JSON.stringify(next));
  } catch {
    /* sin almacenamiento: no se recuerdan */
  }
}

/* ---------- Horarios de entrega en Juliaca ---------- */
export const DAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

// Horas elegibles en el panel: de 6:00 a. m. a 10:00 p. m., cada 30 min.
export const HALF_HOURS = Array.from({ length: 33 }, (_, k) => `${String(6 + Math.floor(k / 2)).padStart(2, "0")}:${k % 2 ? "30" : "00"}`);

export const hour12 = (t) => {
  const [h, m] = t.split(":").map(Number);
  const suf = h < 12 ? "a. m." : h === 12 && m === 0 ? "m." : "p. m.";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${suf}`;
};

// "Lun a Sáb · 4:00 p. m. – 7:00 p. m."
export function scheduleText(p) {
  const d = [...(p.days || [])].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)); // lunes primero
  let days = d.map((x) => DAY_SHORT[x]).join(", ");
  const seq = d.map((x) => (x + 6) % 7);
  if (d.length > 2 && seq.every((x, i) => i === 0 || x === seq[i - 1] + 1)) days = `${DAY_SHORT[d[0]]} a ${DAY_SHORT[d[d.length - 1]]}`;
  if (d.length === 7) days = "Todos los días";
  return `${days} · ${hour12(p.from)} – ${hour12(p.to)}`;
}

export const ymd = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;

// Próximos días con atención en ese punto (hasta 10 fechas en 3 semanas).
export function nextDates(p) {
  const out = [];
  const now = new Date();
  for (let i = 0; i < 21 && out.length < 10; i++) {
    const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    if (p.days.includes(dt.getDay()) && slotsFor(p, ymd(dt)).length) out.push(dt);
  }
  return out;
}

// Horas cada 30 min dentro del horario; si es hoy, solo desde dentro de 1 hora.
export function slotsFor(p, date) {
  const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const now = new Date();
  const isToday = date === ymd(now);
  const minNow = now.getHours() * 60 + now.getMinutes() + 60;
  const out = [];
  for (let m = toMin(p.from); m < toMin(p.to); m += 30) {
    if (isToday && m < minNow) continue;
    out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return out;
}

export function whenText(date, time) {
  if (!date) return "";
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${dt.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })} · ${hour12(time)}`;
}

// Primera foto subida de cada producto (solo imágenes reales).
export const firstPhoto = (p) => (p.images || []).find(Boolean);

/* ---------- Los 3 mundos ---------- */
export const scrollToId = (id) => setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);

// Fotos de Cloudinary al tamaño justo y en el formato más liviano que acepte
// el navegador (WebP/AVIF). Las demás direcciones se dejan igual.
export function imgUrl(url, w) {
  if (!url || !/^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(url) || /\/upload\/f_auto/.test(url)) return url;
  return url.replace("/image/upload/", `/image/upload/f_auto,q_auto,c_limit,w_${w}/`);
}
