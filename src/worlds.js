// Los 3 mundos de la tienda: Michitienda (accesorios michi), Glow Skin
// (cuidado de la piel) y Glow Kids (ropita para niños). La sección de un
// producto sale de su categoría; el carrito y los beneficios son los mismos.
/* eslint-disable */

export const WORLDS = {
  michi: {
    key: "michi", emoji: "🐾", name: "Michitienda", logo: "by Rosalía",
    cats: ["Aretes", "Collares", "Anillos", "Ropa", "Llaveros", "Bolsos"],
  },
  skin: {
    key: "skin", emoji: "✨", name: "Glow Skin", logo: "Skin",
    cats: ["Limpiadores", "Tónicos", "Sérums", "Cremas", "Protector solar", "Labiales", "Maquillaje"],
    bg: "#FBF6F1", hdr: ["#F8EBE2", "#EEF3EC"],
  },
  kids: {
    key: "kids", emoji: "🧸", name: "Glow Kids", logo: "Kids",
    cats: ["Polos", "Vestidos", "Casacas", "Pantalones", "Faldas", "Zapatitos", "Gorritos", "Conjuntos"],
    bg: "#F5FAFF", hdr: ["#DDF0FF", "#FFF6D6"],
  },
};
export const WORLD_KEYS = ["michi", "skin", "kids"];

const CAT_WORLD = Object.fromEntries(
  Object.values(WORLDS).flatMap((w) => w.cats.map((c) => [c, w.key]))
);
export const worldOf = (category) => CAT_WORLD[category] || "michi";

/* ---------- Glow Skin ---------- */
export const SKIN_TYPES = ["Todo tipo", "Grasa", "Seca", "Mixta", "Sensible"];
export const CONCERNS = ["Manchas", "Granitos", "Hidratación", "Brillo", "Poros", "Líneas finas"];
export const ROUTINE_STEPS = [
  { key: "limpia", label: "Limpia", emoji: "🧼" },
  { key: "tonifica", label: "Tonifica", emoji: "🌸" },
  { key: "serum", label: "Sérum", emoji: "💧" },
  { key: "hidrata", label: "Hidrata", emoji: "☁️" },
  { key: "protege", label: "Protege (de día)", emoji: "☀️" },
];
export const BUDGETS = ["Hasta S/ 100", "S/ 100 – 200", "Lo mejor"];

// Rutina recomendada con los productos de la tienda. Cada producto de Skin
// guarda en details: step, skinTypes[], concerns[].
export function buildRoutine(products, { piel, meta, budget }) {
  const score = (p) => {
    const d = p.details || {};
    let s = 0;
    const types = d.skinTypes || [];
    if (types.includes(piel)) s += 3;
    else if (types.includes("Todo tipo") || types.length === 0) s += 1;
    else s -= 2; // pensado para otra piel
    if ((d.concerns || []).includes(meta)) s += 3;
    return s;
  };
  const cheap = budget === BUDGETS[0];
  const best = budget === BUDGETS[2];
  const steps = ROUTINE_STEPS.filter((st) =>
    !cheap || ["limpia", "tonifica", "hidrata"].includes(st.key) || (st.key === "protege" && meta === "Manchas")
  );
  return steps
    .map((st) => {
      const pool = products.filter((p) => p.stock > 0 && p.details?.step === st.key);
      if (!pool.length) return null;
      pool.sort((a, b) => score(b) - score(a) || (best ? b.price - a.price : a.price - b.price));
      return { step: st, product: pool[0] };
    })
    .filter(Boolean);
}

/* ---------- Glow Kids: tallas y muñequito ---------- */
export const KID_SIZES = ["2", "4", "6", "8", "10", "12", "14"];
export const SHOE_SIZES = Array.from({ length: 17 }, (_, k) => String(20 + k)); // calzado 20 a 36

// Talla recomendada para un producto según la edad del peque.
export function recommendedSize(sizes = [], ageIdx = 1) {
  const a = AGES[ageIdx] || AGES[1];
  if (!sizes.length) return "";
  if (sizes.includes(a.size)) return a.size;
  const [lo, hi] = a.shoe.split("–").map(Number);
  const nums = sizes.filter((t) => Number(t) >= 16); // calzado
  if (!nums.length) return sizes[0];
  // la más cercana al rango de calzado de esa edad
  const dist = (t) => (Number(t) < lo ? lo - Number(t) : Number(t) > hi ? Number(t) - hi : 0);
  return nums.reduce((b, t) => (dist(t) < dist(b) ? t : b), nums[0]);
}
export const AGES = [
  { label: "2-3 años", scale: 0.84, size: "2", cm: "86–98", shoe: "22–24" },
  { label: "4-5 años", scale: 0.9, size: "4", cm: "99–115", shoe: "25–28" },
  { label: "6-7 años", scale: 0.97, size: "6", cm: "116–128", shoe: "29–31" },
  { label: "8-10 años", scale: 1.04, size: "8", cm: "129–146", shoe: "32–35" },
];
export const SKIN_TONES = ["#FBE3CF", "#E8B98F", "#C68B5C", "#8D5A3B"];
export const HAIR_COLORS = ["#3A2A22", "#7A4A2A", "#C98B3E", "#1E1A1A"];
export const HAIR_STYLES = ["corto", "colitas", "rulos"];
export const PRINTS = ["liso", "michi", "rayas", "puntos", "corazón"];

const K = "#24476B";

// Aclara/oscurece un color hex (amt entre -1 y 1).
function shade(hex, amt) {
  const n = parseInt(String(hex).replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const f = (c) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return "#" + [r, g, b].map((x) => Math.max(0, Math.min(255, x)).toString(16).padStart(2, "0")).join("");
}

// Estampado sobre el pecho (polos, vestidos, casacas).
function printOn(print, color, cx = 100, cy = 158) {
  const d = shade(color, -0.35), l = "#fff";
  if (print === "michi") return `<path d="M${cx - 12} ${cy - 8} l4 -9 5 7 h6 l5 -7 4 9 c3 10 -4 18 -12 18 s-15 -8 -12 -18z" fill="${l}"/><circle cx="${cx - 5}" cy="${cy - 2}" r="1.8" fill="${K}"/><circle cx="${cx + 5}" cy="${cy - 2}" r="1.8" fill="${K}"/><path d="M${cx - 2} ${cy + 3} q2 2 4 0" stroke="${K}" stroke-width="1.3" fill="none"/>`;
  if (print === "corazón") return `<path d="M${cx} ${cy - 2} c-5 -8 -16 -3 -10 6 l10 9 l10 -9 c6 -9 -5 -14 -10 -6z" fill="${shade(color, -0.25)}"/>`;
  return "";
}
function pattern(print, color, clip) {
  const d = shade(color, -0.2);
  if (print === "rayas") return `<g clip-path="url(#${clip})" stroke="${d}" stroke-width="5">${[140, 156, 172, 188, 204, 220, 236].map((y) => `<path d="M30 ${y}h140"/>`).join("")}</g>`;
  if (print === "puntos") return `<g clip-path="url(#${clip})" fill="#fff" fill-opacity=".8">${[[78, 146], [104, 140], [124, 152], [86, 172], [112, 178], [76, 196], [98, 202], [126, 192], [90, 226], [116, 232]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3"/>`).join("")}</g>`;
  return "";
}

// Figuras de ropa en el sistema del muñequito (viewBox 200×320).
// slot: dónde va · full: cubre arriba y abajo · over: va encima del polo.
export const SHAPES = {
  polo: { label: "Polo", slot: "top", view: "40 118 120 96", draw: (c, pr, id) => {
    const path = "M60 136 Q62 126 80 124 L120 124 Q138 126 140 136 L152 160 L137 167 L133 208 L67 208 L63 167 L48 160 Z";
    return `<defs><clipPath id="${id}"><path d="${path}"/></clipPath></defs><path d="${path}" fill="${c}" stroke="${K}" stroke-width="2.5" stroke-linejoin="round"/>${pattern(pr, c, id)}${printOn(pr, c)}`;
  } },
  vestido: { label: "Vestido", slot: "top", full: true, view: "40 118 120 140", draw: (c, pr, id) => {
    const path = "M62 136 Q64 126 80 124 L120 124 Q136 126 138 136 L148 156 L136 162 L134 190 L156 250 Q100 262 44 250 L66 190 L64 162 L52 156 Z";
    return `<defs><clipPath id="${id}"><path d="${path}"/></clipPath></defs><path d="${path}" fill="${c}" stroke="${K}" stroke-width="2.5" stroke-linejoin="round"/>${pattern(pr, c, id)}<path d="M66 190 H134" stroke="${shade(c, -0.3)}" stroke-width="5"/>${printOn(pr, c)}`;
  } },
  casaca: { label: "Casaca", slot: "outer", view: "36 46 128 168", back: (c) => `<path d="M62 84 L54 50 L80 66 Z M138 84 L146 50 L120 66 Z" fill="${c}" stroke="${K}" stroke-width="2.5" stroke-linejoin="round"/>`, draw: (c, pr, id) => {
    const path = "M58 136 Q60 124 80 122 L120 122 Q140 124 142 136 L158 196 L144 202 L134 168 L134 210 L66 210 L66 168 L56 202 L42 196 Z";
    return `<defs><clipPath id="${id}"><path d="${path}"/></clipPath></defs><path d="${path}" fill="${c}" stroke="${K}" stroke-width="2.5" stroke-linejoin="round"/>${pattern(pr, c, id)}<path d="M100 124 V210" stroke="${K}" stroke-width="2"/><path d="M80 182 h40 v20 h-40z" fill="${shade(c, -0.12)}" stroke="${K}" stroke-width="2"/><path d="M80 124 q20 14 40 0" fill="none" stroke="#fff" stroke-width="4" opacity=".7"/>`;
  } },
  pantalon: { label: "Pantalón", slot: "bottom", view: "60 196 80 100", draw: (c) =>
    `<path d="M68 200 H132 L130 290 H104 L100 228 L96 290 H70 Z" fill="${c}" stroke="${K}" stroke-width="2.5" stroke-linejoin="round"/><path d="M70 282 h26 M104 282 h26" stroke="${shade(c, 0.35)}" stroke-width="5"/><path d="M100 204 v20" stroke="${shade(c, -0.25)}" stroke-width="2"/>` },
  falda: { label: "Falda", slot: "bottom", view: "46 196 108 64", draw: (c) =>
    `<path d="M68 200 H132 L150 244 Q100 256 50 244 Z" fill="${c}" stroke="${K}" stroke-width="2.5" stroke-linejoin="round"/><path d="M60 238 Q100 252 140 238" fill="none" stroke="${shade(c, -0.15)}" stroke-width="5"/><path d="M68 200 H132 V210 H68 Z" fill="${shade(c, -0.2)}" stroke="${K}" stroke-width="2"/><g fill="#fff"><circle cx="80" cy="226" r="2"/><circle cx="104" cy="232" r="2"/><circle cx="124" cy="224" r="2"/></g>` },
  short: { label: "Short", slot: "bottom", view: "60 196 80 48", draw: (c) =>
    `<path d="M68 200 H132 L134 238 H104 L100 222 L96 238 H66 Z" fill="${c}" stroke="${K}" stroke-width="2.5" stroke-linejoin="round"/><path d="M66 232 h30 M104 232 h30" stroke="${shade(c, 0.35)}" stroke-width="4"/>` },
  jardinero: { label: "Jardinero", slot: "bottom", over: true, view: "60 120 80 172", draw: (c) =>
    `<path d="M76 150 H124 V200 H76 Z" fill="${c}" stroke="${K}" stroke-width="2.5"/><path d="M78 150 L72 126 M122 150 L128 126" stroke="${c}" stroke-width="7" stroke-linecap="round"/><path d="M68 196 H132 L130 286 H104 L100 228 L96 286 H70 Z" fill="${c}" stroke="${K}" stroke-width="2.5" stroke-linejoin="round"/><path d="M100 166 c-4 -6 -12 -2 -8 4 l8 7 l8 -7 c4 -6 -4 -10 -8 -4z" fill="#FF8DB5"/><circle cx="80" cy="154" r="3" fill="#F2C14E"/><circle cx="120" cy="154" r="3" fill="#F2C14E"/>` },
  zapatillas: { label: "Zapatillas", slot: "shoes", view: "52 282 96 30", draw: (c) =>
    `<path d="M68 288 h30 v10 q0 8 -8 8 h-26 q-6 0 -6 -6 q0 -8 10 -12z M132 288 h-30 v10 q0 8 8 8 h26 q6 0 6 -6 q0 -8 -10 -12z" fill="${c}" stroke="${K}" stroke-width="2.5" stroke-linejoin="round"/><path d="M58 302 h40 M102 302 h40" stroke="#fff" stroke-width="4"/>` },
  botas: { label: "Botitas", slot: "shoes", view: "52 268 96 42", draw: (c) =>
    `<path d="M70 274 h26 v26 q0 6 -6 6 h-30 q-6 0 -5 -6 q2 -8 15 -10z M130 274 h-26 v26 q0 6 6 6 h30 q6 0 5 -6 q-2 -8 -15 -10z" fill="${c}" stroke="${K}" stroke-width="2.5" stroke-linejoin="round"/><path d="M70 278 h26 M104 278 h26" stroke="${shade(c, 0.6)}" stroke-width="6"/>` },
  gorro: { label: "Gorrito", slot: "hat", view: "50 6 100 74", draw: (c) =>
    `<path d="M56 70 Q56 26 100 26 Q144 26 144 70 Z" fill="${c}" stroke="${K}" stroke-width="2.5"/><path d="M62 36 L60 10 L84 28 Z M138 36 L140 10 L116 28 Z" fill="${c}" stroke="${K}" stroke-width="2.5" stroke-linejoin="round"/><path d="M64 32 L64 18 L76 28 Z M136 32 L136 18 L124 28 Z" fill="${shade(c, 0.5)}"/><rect x="54" y="62" width="92" height="14" rx="7" fill="${shade(c, 0.5)}" stroke="${K}" stroke-width="2.5"/>` },
};
export const SHAPE_KEYS = Object.keys(SHAPES);

let uid = 0;
// Dibujo de una prenda sola (miniatura).
export function garmentSvg(fit) {
  const sh = SHAPES[fit?.shape];
  if (!sh) return "";
  const id = "gc" + ++uid;
  const c = fit.color || "#FFB3CF";
  return `<svg viewBox="${sh.view}">${sh.back ? sh.back(c) : ""}${sh.draw(c, fit.print || "liso", id)}</svg>`;
}

const HAIR = {
  corto: (c) => ({ back: "", front: `<path d="M54 80 Q50 32 100 30 Q150 32 146 80 Q138 54 112 52 Q120 62 116 66 Q100 50 80 56 Q66 60 54 80z" fill="${c}"/>` }),
  colitas: (c) => ({ back: `<circle cx="44" cy="70" r="16" fill="${c}"/><circle cx="156" cy="70" r="16" fill="${c}"/>`, front: `<path d="M54 80 Q50 30 100 30 Q150 30 146 80 Q140 52 100 50 Q60 52 54 80z" fill="${c}"/><circle cx="58" cy="62" r="5" fill="#FF8DB5"/><circle cx="142" cy="62" r="5" fill="#FF8DB5"/>` }),
  rulos: (c) => ({ back: `<g fill="${c}">${[[52, 70], [148, 70], [50, 92], [150, 92]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="14"/>`).join("")}</g>`, front: `<g fill="${c}">${[[62, 52], [80, 38], [100, 33], [120, 38], [138, 52], [70, 64], [130, 64], [90, 46], [110, 46]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="15"/>`).join("")}</g>` }),
};

// Muñequito vestido. look = { top, outer, bottom, shoes, hat } con el fit de
// cada producto ({ shape, color, print }).
export function kidSvg({ skin = 1, hairColor = 0, hair = "colitas", age = 1 }, look = {}) {
  const s = SKIN_TONES[skin] || SKIN_TONES[1];
  const h = (HAIR[hair] || HAIR.colitas)(HAIR_COLORS[hairColor] || HAIR_COLORS[0]);
  const part = (fit) => {
    const sh = fit && SHAPES[fit.shape];
    return sh ? sh.draw(fit.color || "#FFB3CF", fit.print || "liso", "kc" + ++uid) : "";
  };
  const back = (fit) => {
    const sh = fit && SHAPES[fit.shape];
    return sh?.back ? sh.back(fit.color || "#FFB3CF") : "";
  };
  const { top, outer, bottom, shoes, hat } = look;
  const full = top && SHAPES[top.shape]?.full;
  const over = bottom && SHAPES[bottom.shape]?.over;
  const sc = (AGES[age] || AGES[1]).scale;
  return `<svg viewBox="0 0 200 320"><g transform="translate(100 312) scale(${sc}) translate(-100 -312)">
   ${back(outer)}${h.back}
   <path d="M66 136 L50 196" stroke="${s}" stroke-width="17" stroke-linecap="round"/><path d="M134 136 L150 196" stroke="${s}" stroke-width="17" stroke-linecap="round"/>
   <circle cx="49" cy="200" r="9" fill="${s}" stroke="${K}" stroke-width="2"/><circle cx="151" cy="200" r="9" fill="${s}" stroke="${K}" stroke-width="2"/>
   <rect x="73" y="200" width="24" height="96" rx="10" fill="${s}" stroke="${K}" stroke-width="2"/><rect x="103" y="200" width="24" height="96" rx="10" fill="${s}" stroke="${K}" stroke-width="2"/>
   ${shoes ? "" : `<ellipse cx="84" cy="300" rx="16" ry="7" fill="#fff" stroke="${K}" stroke-width="2"/><ellipse cx="116" cy="300" rx="16" ry="7" fill="#fff" stroke="${K}" stroke-width="2"/>`}
   <rect x="91" y="114" width="18" height="16" fill="${s}"/>
   ${bottom || full ? "" : `<path d="M68 200 H132 L132 226 H68Z" fill="#F4F4F4" stroke="${K}" stroke-width="2"/>`}
   ${top ? "" : `<path d="M66 132 Q66 126 80 126 L120 126 Q134 126 134 132 L132 206 L68 206 Z" fill="#F4F4F4" stroke="${K}" stroke-width="2"/>`}
   ${part(shoes)}
   ${bottom && !over && !full ? part(bottom) : ""}
   ${part(top)}
   ${bottom && over && !full ? part(bottom) : ""}
   ${part(outer)}
   <circle cx="100" cy="78" r="46" fill="${s}" stroke="${K}" stroke-width="2.5"/>
   <ellipse cx="54" cy="84" rx="7" ry="10" fill="${s}" stroke="${K}" stroke-width="2"/><ellipse cx="146" cy="84" rx="7" ry="10" fill="${s}" stroke="${K}" stroke-width="2"/>
   ${h.front}
   <ellipse cx="84" cy="84" rx="5" ry="6.5" fill="${K}"/><ellipse cx="116" cy="84" rx="5" ry="6.5" fill="${K}"/><circle cx="86" cy="82" r="1.8" fill="#fff"/><circle cx="118" cy="82" r="1.8" fill="#fff"/>
   <ellipse cx="72" cy="98" rx="8" ry="5" fill="#FF9FB6" opacity=".55"/><ellipse cx="128" cy="98" rx="8" ry="5" fill="#FF9FB6" opacity=".55"/>
   <path d="M92 102 Q100 110 108 102" stroke="${K}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
   ${part(hat)}
  </g></svg>`;
}

/* ---------- Rosalía en modo spa ---------- */
const INK = "#3A2E2A";
export function spaArt(catArt) {
  return catArt.replace(/<\/svg>\s*$/, `<g class="gd-bob"><path d="M58 60 Q100 30 142 60" fill="none" stroke="#F7C6D4" stroke-width="11" stroke-linecap="round"/><path d="M58 60 Q100 30 142 60" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="2 6" stroke-linecap="round"/><path d="M118 40 l-12 -9 v18 z M118 40 l12 -9 v18 z" fill="#F29BB5" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><circle cx="118" cy="40" r="4" fill="#F7C6D4" stroke="${INK}" stroke-width="2"/><ellipse cx="70" cy="110" rx="7" ry="5" fill="#BFE3CF" stroke="${INK}" stroke-width="1.5"/><ellipse cx="130" cy="110" rx="7" ry="5" fill="#BFE3CF" stroke="${INK}" stroke-width="1.5"/></g><g fill="#F2C14E"><path d="M30 60l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/><path d="M168 96l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></g></svg>`);
}
