// Temporadas de la tienda (Halloween, Navidad…). Cada una dura solo sus
// semanas: fuera de esas fechas la tienda luce normal. Las fechas son
// "MM-DD" y se repiten cada año; la dueña las puede cambiar en el panel.
// `ready` indica si la decoración ya está diseñada.

export const SEASONS = [
  { key: "halloween", emoji: "🎃", name: "Halloween", from: "10-01", to: "10-31", ready: true,
    title: "Noche de michis", text: "Collares, aretes y regalitos con un toque misterioso.", cta: "Ver la colección" },
  { key: "santos", emoji: "🍞", name: "Todos los Santos", from: "11-01", to: "11-02",
    title: "Llegaron las tantawawas", text: "Recordamos con cariño a quienes amamos.", cta: "Regalitos para compartir" },
  { key: "puno", emoji: "🌊", name: "Semana Jubilar de Puno", from: "11-03", to: "11-07",
    title: "Semana Jubilar de Puno", text: "Del Titicaca nació Manco Cápac… y aquí, Glow.", cta: "Ofertas de aniversario" },
  { key: "black", emoji: "🐈‍⬛", name: "Black Friday", from: "11-24", to: "11-30",
    title: "Black Michi Friday", text: "Solo este fin de semana.", cta: "Ver ofertas" },
  { key: "navidad", emoji: "🎄", name: "Navidad", from: "12-08", to: "12-25",
    title: "Navidad michi", text: "Regalos lindos, envueltos con cariño.", cta: "Ideas de regalo" },
  { key: "anionuevo", emoji: "💛", name: "Año Nuevo", from: "12-26", to: "12-31",
    title: "Recibe el año con suerte", text: "El amarillo trae suerte… y lo dorado también.", cta: "Ver lo dorado" },
  { key: "candelaria", emoji: "💃", name: "Candelaria", from: "02-01", to: "02-15",
    title: "¡Viva la Mamita Candelaria!", text: "Brilla en la fiesta más grande de Puno.", cta: "Accesorios para bailar" },
  { key: "sanvalentin", emoji: "💘", name: "San Valentín", from: "02-08", to: "02-14",
    title: "Para tu michi favorito", text: "Regalos de San Valentín.", cta: "Ver regalos" },
  { key: "mujer", emoji: "💜", name: "Día de la Mujer", from: "03-02", to: "03-08",
    title: "Día de la Mujer", text: "Para ti, que brillas todos los días.", cta: "Consiéntete" },
  { key: "madre", emoji: "🌷", name: "Día de la Madre", from: "04-28", to: "05-11",
    title: "Para mamá, con todo el amor", text: "Regalos que la harán sonreír.", cta: "Ideas para mamá" },
  { key: "padre", emoji: "☀️", name: "Día del Padre e Inti Raymi", from: "06-10", to: "06-24",
    title: "Inti Raymi y Día del Papá", text: "Detalles para él.", cta: "Ver regalos" },
  { key: "patrias", emoji: "🎊", name: "Fiestas Patrias", from: "07-20", to: "07-29",
    title: "¡Felices Fiestas Patrias!", text: "Orgullo peruano, hecho con cariño.", cta: "Ofertas patrias" },
  { key: "gato", emoji: "🐾", name: "Día del Gato", from: "08-04", to: "08-08",
    title: "Día Internacional del Gato", text: "Nuestro día favorito del año.", cta: "Celebrar" },
  { key: "santarosa", emoji: "🌹", name: "Santa Rosa", from: "08-24", to: "08-30",
    title: "Santa Rosa, la de Rosalía", text: "Rosas para todas las Rosas.", cta: "Ver la colección" },
  { key: "primavera", emoji: "🌼", name: "Primavera", from: "09-18", to: "09-25",
    title: "¡Llegó la primavera!", text: "Colores nuevos.", cta: "Ver novedades" },
];

// Junta lo diseñado con lo que guardó la tienda (fechas, textos, encendida).
export function seasonList(saved = {}) {
  return SEASONS.map((s) => {
    const v = saved[s.key] || {};
    return {
      ...s,
      on: !!s.ready && v.on !== false,
      from: v.from || s.from,
      to: v.to || s.to,
      title: v.title || s.title,
      text: v.text || s.text,
      cta: v.cta || s.cta,
    };
  });
}

const mmdd = (d) => `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// ¿La fecha cae dentro del rango? (admite rangos que cruzan el año: 12-26 → 01-02)
export function inRange(s, date = new Date()) {
  const d = mmdd(date);
  return s.from <= s.to ? d >= s.from && d <= s.to : d >= s.from || d <= s.to;
}

// Días que faltan para que empiece (0 si ya está activa).
export function daysUntil(s, date = new Date()) {
  if (inRange(s, date)) return 0;
  const [m, d] = s.from.split("-").map(Number);
  let start = new Date(date.getFullYear(), m - 1, d);
  const today = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (start < today) start = new Date(date.getFullYear() + 1, m - 1, d);
  return Math.round((start - today) / 86400000);
}

// Vista previa: ?tema=halloween la muestra en esta pestaña; ?tema=no la quita.
function previewKey() {
  try {
    const q = new URLSearchParams(window.location.search).get("tema");
    if (q === "no") sessionStorage.removeItem("glow:tema");
    else if (q) sessionStorage.setItem("glow:tema", q);
    return sessionStorage.getItem("glow:tema") || "";
  } catch {
    return "";
  }
}

// La temporada que se ve hoy en la tienda (o null).
export function activeSeason(saved, date = new Date()) {
  const list = seasonList(saved);
  const pk = previewKey();
  const preview = list.find((s) => s.key === pk && s.ready);
  if (preview) return { ...preview, preview: true };
  return list.find((s) => s.on && inRange(s, date)) || null;
}

/* ---------- Dibujos de Halloween (SVG en texto) ---------- */
const ink = "#3B2146";

export function webSvg(color = ink, opacity = 0.3) {
  const rays = [0, 18, 36, 54, 72, 90].map((a) => {
    const r = (a * Math.PI) / 180;
    return `<line x1="0" y1="0" x2="${(120 * Math.cos(r)).toFixed(1)}" y2="${(120 * Math.sin(r)).toFixed(1)}"/>`;
  }).join("");
  const rings = [24, 46, 68, 92].map((r) => {
    let p = "";
    for (let i = 0; i < 5; i++) {
      const a1 = (i * 18 * Math.PI) / 180, a2 = ((i + 1) * 18 * Math.PI) / 180, m = (a1 + a2) / 2;
      p += `<path d="M${(r * Math.cos(a1)).toFixed(1)} ${(r * Math.sin(a1)).toFixed(1)} Q${(r * 0.82 * Math.cos(m)).toFixed(1)} ${(r * 0.82 * Math.sin(m)).toFixed(1)} ${(r * Math.cos(a2)).toFixed(1)} ${(r * Math.sin(a2)).toFixed(1)}"/>`;
    }
    return p;
  }).join("");
  return `<svg viewBox="0 0 120 120" fill="none" stroke="${color}" stroke-opacity="${opacity}" stroke-width="1.3">${rays}${rings}</svg>`;
}

export const SPIDER = `<svg viewBox="0 0 30 60"><line x1="15" y1="0" x2="15" y2="38" stroke="${ink}" stroke-opacity=".35"/><g fill="${ink}" fill-opacity=".75"><ellipse cx="15" cy="44" rx="6" ry="7"/><circle cx="15" cy="36" r="4"/></g><g stroke="${ink}" stroke-opacity=".75" stroke-width="1.3" fill="none" stroke-linecap="round"><path d="M9 42 3 37M9 45 2 46M9 48 4 54M21 42 27 37M21 45 28 46M21 48 26 54"/></g><circle cx="13.5" cy="35" r="1" fill="#fff"/><circle cx="16.5" cy="35" r="1" fill="#fff"/></svg>`;

export function catSkullSvg(fill = "#FFFDF8") {
  return `<svg viewBox="0 0 60 56"><path d="M8 4 20 16Q30 12 40 16L52 4 54 26Q56 44 42 46V52H18V46Q4 44 6 26Z" fill="${fill}" stroke="${ink}" stroke-opacity=".55" stroke-width="2" stroke-linejoin="round"/><ellipse cx="21" cy="29" rx="6" ry="7" fill="${ink}" fill-opacity=".78"/><ellipse cx="39" cy="29" rx="6" ry="7" fill="${ink}" fill-opacity=".78"/><path d="M27 37h6l-3 4z" fill="${ink}" fill-opacity=".7"/><path d="M22 46v6M27 46v6M33 46v6M38 46v6" stroke="${ink}" stroke-opacity=".45" stroke-width="1.5"/><circle cx="22" cy="27" r="1.6" fill="#FF9F43"/><circle cx="40" cy="27" r="1.6" fill="#FF9F43"/><path d="M2 30h10M2 35l10-2M58 30H48M58 35l-10-2" stroke="${ink}" stroke-opacity=".3" stroke-linecap="round"/></svg>`;
}

// Murciélago: las alas aletean con una animación propia del dibujo (se ve
// nítido a cualquier tamaño, sin estirar la imagen).
export function batSvg(color = ink, opacity = 0.55, speed = 0.45) {
  const wing = (side) => {
    const d = side < 0
      ? "M27 15 C22 6 12 4 2 9 C6 11 8 14 8 18 C11 15 14 15 16 18 C18 15 21 15 23 19 C24 17 26 16 27 17 Z"
      : "M33 15 C38 6 48 4 58 9 C54 11 52 14 52 18 C49 15 46 15 44 18 C42 15 39 15 37 19 C36 17 34 16 33 17 Z";
    const v = side < 0 ? "0 28 15; 28 28 15; 0 28 15; -14 28 15; 0 28 15" : "0 32 15; -28 32 15; 0 32 15; 14 32 15; 0 32 15";
    return `<path d="${d}"><animateTransform attributeName="transform" type="rotate" values="${v}" dur="${speed}s" repeatCount="indefinite"/></path>`;
  };
  return `<svg viewBox="0 0 60 30" shape-rendering="geometricPrecision"><g fill="${color}" fill-opacity="${opacity}">${wing(-1)}${wing(1)}<ellipse cx="30" cy="16" rx="4.5" ry="6.5"/><circle cx="30" cy="9.5" r="4"/><path d="M26.8 7 L26 2.5 L28.8 5.6 Z M33.2 7 L34 2.5 L31.2 5.6 Z"/></g><circle cx="28.6" cy="9.2" r=".9" fill="#FFE27A"/><circle cx="31.4" cy="9.2" r=".9" fill="#FFE27A"/></svg>`;
}

// Calabaza con ojos que brillan (clase hw-flicker: parpadeo de vela).
export const PUMPKIN = `<svg viewBox="0 0 60 54"><path d="M30 12c-2-6 0-10 5-11" stroke="#5B7A2E" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="18" cy="33" rx="14" ry="18" fill="#F7A440"/><ellipse cx="42" cy="33" rx="14" ry="18" fill="#F7A440"/><ellipse cx="30" cy="33" rx="13" ry="19" fill="#FFB65C"/><g class="hw-flicker"><path d="M21 28l4 4h-6zM39 28l4 4h-6z" fill="#FFE27A"/><path d="M22 40q8 6 16 0" stroke="#FFE27A" stroke-width="2.6" fill="none" stroke-linecap="round"/></g><g fill="${ink}" fill-opacity=".55"><path d="M21 28l4 4h-6zM39 28l4 4h-6z"/></g></svg>`;

// Fantasmita con orejas de michi.
export const GHOST = `<svg viewBox="0 0 60 70"><path d="M8 34C8 16 18 8 30 8s22 8 22 26v28l-6-5-6 5-5-5-5 5-5-5-6 5-6-5-5 5z" fill="#FFFFFF" fill-opacity=".92" stroke="#3B2146" stroke-opacity=".25" stroke-width="2" stroke-linejoin="round"/><path d="M12 20 10 4l12 8M48 20l2-16-12 8" fill="#FFFFFF" stroke="#3B2146" stroke-opacity=".25" stroke-width="2" stroke-linejoin="round"/><ellipse cx="23" cy="32" rx="3.4" ry="4.4" fill="${ink}"/><ellipse cx="37" cy="32" rx="3.4" ry="4.4" fill="${ink}"/><circle cx="24" cy="30.5" r="1.2" fill="#fff"/><circle cx="38" cy="30.5" r="1.2" fill="#fff"/><path d="M27 39q3 3 6 0" stroke="${ink}" stroke-width="1.8" fill="none" stroke-linecap="round"/><ellipse cx="17" cy="39" rx="4" ry="2.4" fill="#FF9FB6" opacity=".6"/><ellipse cx="43" cy="39" rx="4" ry="2.4" fill="#FF9FB6" opacity=".6"/></svg>`;

// Luna creciente con brillo.
export const MOON = `<svg viewBox="0 0 80 80"><defs><radialGradient id="hwglow"><stop offset="0" stop-color="#FFF4C2" stop-opacity=".9"/><stop offset="1" stop-color="#FFF4C2" stop-opacity="0"/></radialGradient></defs><circle cx="40" cy="40" r="40" fill="url(#hwglow)"/><path d="M48 16a24 24 0 1 0 14 38A20 20 0 0 1 48 16z" fill="#FFE9A3"/><circle cx="34" cy="44" r="3" fill="#F2D27A"/><circle cx="28" cy="32" r="2" fill="#F2D27A"/></svg>`;

// Gatito negro que pasea por la cabecera (patitas que se mueven: clase hw-legs).
export const BLACK_CAT = `<svg viewBox="0 0 90 60"><path d="M78 20 C88 10 90 28 80 30" stroke="#1E1424" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse cx="50" cy="34" rx="28" ry="13" fill="#1E1424"/><g class="hw-legs"><rect x="28" y="40" width="6" height="16" rx="3" fill="#1E1424"/><rect x="58" y="40" width="6" height="16" rx="3" fill="#1E1424"/></g><g class="hw-legs is-b"><rect x="40" y="42" width="6" height="14" rx="3" fill="#1E1424"/><rect x="68" y="42" width="6" height="14" rx="3" fill="#1E1424"/></g><circle cx="22" cy="26" r="13" fill="#1E1424"/><path d="M12 18 10 4 20 14zM28 14 34 3 34 18z" fill="#1E1424"/><path d="M13 16 12 8 18 13z" fill="#5A3A5E"/><ellipse class="hw-blink" cx="17" cy="25" rx="2.6" ry="3.4" fill="#C6F25B"/><ellipse class="hw-blink" cx="26" cy="25" rx="2.6" ry="3.4" fill="#C6F25B"/><path d="M8 30h-7M8 33l-6 2" stroke="#1E1424" stroke-width="1"/></svg>`;

// Caramelo envuelto.
export function candySvg(c = "#F26D9C") {
  return `<svg viewBox="0 0 40 20"><path d="M10 10 1 3v14zM30 10l9-7v14z" fill="${c}" fill-opacity=".8"/><circle cx="20" cy="10" r="9" fill="${c}"/><path d="M14 6q6 8 12 0" stroke="#fff" stroke-opacity=".7" stroke-width="2" fill="none"/></svg>`;
}

export const WITCH_HAT = `<svg viewBox="0 0 60 50"><ellipse cx="30" cy="42" rx="29" ry="7" fill="${ink}"/><path d="M14 41 34 2q2 14 12 39z" fill="${ink}"/><rect x="16" y="33" width="29" height="6" fill="#F7A440"/><circle cx="35" cy="5" r="2.2" fill="#F7A440"/></svg>`;

// Sombrero de bruja para las mascotas guía: se suma al dibujo (viewBox
// 200×200) y se mece junto con ellas (misma animación gd-bob).
const HAT_SHAPES = `<ellipse cx="30" cy="42" rx="29" ry="7" fill="${ink}" stroke="#1E1424" stroke-width="1.5"/><path d="M14 41 34 2q2 14 12 39z" fill="${ink}" stroke="#1E1424" stroke-width="1.5" stroke-linejoin="round"/><rect x="16" y="33" width="29" height="6" fill="#F7A440"/><circle cx="35" cy="5" r="2.6" fill="#F7A440"/>`;
// Quienes no llevan nada en la cabeza usan sombrero de bruja.
const HAT_AT = {
  baneco: [100, 46, 1.1, -12],
  rosalia: [100, 50, 0.95, -8],
};
// Willy ya tiene gorra de policía: va de vampiro (capa y colmillitos).
const WILLY_CAPE = `<path d="M62 120 C44 140 36 168 40 188 L160 188 C164 168 156 140 138 120 Z" fill="#2A1630" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/><path d="M70 126 C58 146 54 168 56 186 L144 186 C146 168 142 146 130 126 Z" fill="#B3263C"/>`;
const WILLY_FRONT = `<path d="M66 128 L48 104 L84 122 Z M134 128 L152 104 L116 122 Z" fill="#2A1630" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/><path d="M66 124 L56 110 L80 122 Z M134 124 L144 110 L120 122 Z" fill="#B3263C"/><path d="M93.5 113.5 l2.2 5.4 2.2 -4.6 z M102.1 114.3 l2.2 4.6 2.2 -5.4 z" fill="#fff" stroke="${ink}" stroke-width="1" stroke-linejoin="round"/>`;
// Cuyito ya tiene chullo: lleva su baldecito-calabaza lleno de dulces.
const CUY_BUCKET = `<g transform="translate(132 146)"><path d="M6 10 C6 -6 40 -6 40 10" fill="none" stroke="${ink}" stroke-width="2.5"/><circle cx="14" cy="10" r="4" fill="#F26D9C"/><circle cx="23" cy="8" r="4" fill="#7BC67E"/><circle cx="31" cy="11" r="4" fill="#B48BE0"/><ellipse cx="23" cy="24" rx="20" ry="16" fill="#F7A440" stroke="${ink}" stroke-width="2.5"/><path d="M23 9 v30 M12 12 q-4 12 0 24 M34 12 q4 12 0 24" stroke="#E08A2A" stroke-width="1.6" fill="none"/><g class="hw-flicker"><path d="M14 20l4 4h-6zM32 20l4 4h-6z" fill="#FFE27A"/><path d="M15 30q8 5 16 0" stroke="#FFE27A" stroke-width="2.4" fill="none" stroke-linecap="round"/></g></g>`;

export function guideArt(art, key, season) {
  if (season?.key !== "halloween") return art;
  const add = (svg) => art.replace(/<\/svg>\s*$/, `<g class="gd-bob">${svg}</g></svg>`);
  if (key === "willy") {
    // la capa va detrás del cuerpo: dentro del mismo grupo, al principio
    return add(WILLY_FRONT).replace('<g class="gd-bob">', `<g class="gd-bob">${WILLY_CAPE}`);
  }
  if (key === "cuyito") return add(CUY_BUCKET);
  const at = HAT_AT[key];
  if (!at) return art;
  const [x, y, s, r] = at;
  return add(`<g transform="translate(${x - 30 * s} ${y - 42 * s}) scale(${s}) rotate(${r} 30 42)">${HAT_SHAPES}</g>`);
}
