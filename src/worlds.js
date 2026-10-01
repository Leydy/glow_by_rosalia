// Los 3 mundos de la tienda: Michitienda (accesorios michi), Glow Skin
// (cuidado de la piel) y Glow Kids (ropita para niños). La sección de un
// producto sale de su categoría; el carrito y los beneficios son los mismos.
/* eslint-disable */

export const WORLDS = {
  michi: {
    key: "michi", emoji: "🐾", name: "Michitienda", short: "Michi", logo: "by Rosalía",
    cats: ["Aretes", "Collares", "Anillos", "Ropa", "Llaveros", "Bolsos"],
  },
  skin: {
    key: "skin", emoji: "✨", name: "Glow Skin", short: "Skin", logo: "Skin",
    cats: ["Limpiadores", "Tónicos", "Sérums", "Cremas", "Protector solar", "Labiales", "Maquillaje"],
    bg: "#FBF6F1", hdr: ["#F8EBE2", "#EEF3EC"],
  },
  kids: {
    key: "kids", emoji: "🧸", name: "Glow Kids", short: "Kids", logo: "Kids",
    cats: ["Polos", "Vestidos", "Casacas", "Pantalones", "Faldas", "Zapatitos", "Gorritos", "Conjuntos"],
    bg: "#F5FAFF", hdr: ["#DDF0FF", "#FFF6D6"],
  },
};
export const WORLD_KEYS = ["michi", "skin", "kids"];

// Portada (slider) de Glow Skin y Glow Kids.
export const WORLD_HERO = {
  skin: {
    eyebrow: "Glow Skin · cuidado de la piel", title: "Tu piel también", words: ["merece mimos", "brilla", "se cuida"],
    text: "Sérums, cremas y cuidados elegidos con cariño para tu rutina de cada día.", cta: "Arma tu rutina", action: "rutina",
    catWords: ["que iluminan", "que hidratan", "que enamoran"], say: "¡Yo también me cuido! 🧖‍♀️",
    grads: [["#F9E6DB", "#EEF3EC"], ["#FBE9DF", "#F6EFE8"], ["#EEF3EC", "#F9EDE4"], ["#F7E3E6", "#F3EFE6"]],
    ticker: ["Cuida tu piel con cariño", "Rutinas sencillas", "Envíos a todo el Perú", "Entrega gratis en Juliaca"],
    tagline: "Cuida tu piel",
  },
  kids: {
    eyebrow: "Glow Kids · ropita cute", title: "Ropita linda", words: ["para jugar", "para pasear", "para abrazar"],
    text: "Conjuntos suaves y cómodos para tu peque. Te ayudamos a elegir la talla.", cta: "Encuentra su talla", action: "tallas",
    catWords: ["para jugar", "con estilo", "súper cute"], say: "¡Cuí cuí! 🎈",
    grads: [["#DDF0FF", "#FFF4CC"], ["#E2F7EC", "#DDF0FF"], ["#FFF4CC", "#FFE3EE"], ["#E7E2FF", "#DDF0FF"]],
    ticker: ["Ropita suave y cómoda", "Tallas según su estatura", "Envíos a todo el Perú", "Entrega gratis en Juliaca"],
    tagline: "Ropita cute",
  },
};

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
  return ROUTINE_STEPS.map((st) => {
    if (!steps.includes(st)) return { step: st, product: null, skipped: true };
    const pool = products.filter((p) => p.stock > 0 && p.details?.step === st.key);
    if (!pool.length) return { step: st, product: null };
    pool.sort((a, b) => score(b) - score(a) || (best ? b.price - a.price : a.price - b.price));
    return { step: st, product: pool[0] };
  });
}

/* ---------- Glow Kids: tallas según la estatura ---------- */
export const KID_SIZES = ["2", "4", "6", "8", "10", "12", "14"];
export const SHOE_SIZES = Array.from({ length: 17 }, (_, k) => String(20 + k)); // calzado 20 a 36

// Tabla de tallas: hasta qué estatura (cm) va cada talla y su calzado aproximado.
export const SIZE_CHART = [
  { size: "2", max: 98, shoe: "22–24" },
  { size: "4", max: 112, shoe: "25–28" },
  { size: "6", max: 124, shoe: "29–31" },
  { size: "8", max: 136, shoe: "32–34" },
  { size: "10", max: 146, shoe: "34–36" },
  { size: "12", max: 154, shoe: "36" },
  { size: "14", max: 999, shoe: "36" },
];
export const sizeForHeight = (cm) => SIZE_CHART.find((s) => cm <= s.max) || SIZE_CHART[SIZE_CHART.length - 1];
// Estatura promedio por edad (para elegir rápido).
export const AGE_HEIGHTS = [["2 años", 88], ["3 años", 96], ["4 años", 103], ["5 años", 110], ["6 años", 116], ["7 años", 122], ["8 años", 128], ["10 años", 138], ["12 años", 150]];

// Talla recomendada de un producto para un peque de esa estatura.
export function recommendedSize(sizes = [], cm = 105) {
  if (!sizes.length) return "";
  const s = sizeForHeight(cm);
  if (sizes.includes(s.size)) return s.size;
  const nums = sizes.filter((t) => Number(t) >= 16); // calzado
  if (!nums.length) return "";
  const [lo, hi = lo] = s.shoe.split("–").map(Number);
  const dist = (t) => (Number(t) < lo ? lo - Number(t) : Number(t) > hi ? Number(t) - hi : 0);
  return nums.reduce((b, t) => (dist(t) < dist(b) ? t : b), nums[0]);
}

/* ---------- Rosalía en modo spa ---------- */
const INK = "#3A2E2A";
export function spaArt(catArt) {
  return catArt.replace(/<\/svg>\s*$/, `<g class="gd-bob"><path d="M58 60 Q100 30 142 60" fill="none" stroke="#F7C6D4" stroke-width="11" stroke-linecap="round"/><path d="M58 60 Q100 30 142 60" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="2 6" stroke-linecap="round"/><path d="M118 40 l-12 -9 v18 z M118 40 l12 -9 v18 z" fill="#F29BB5" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><circle cx="118" cy="40" r="4" fill="#F7C6D4" stroke="${INK}" stroke-width="2"/><ellipse cx="70" cy="110" rx="7" ry="5" fill="#BFE3CF" stroke="${INK}" stroke-width="1.5"/><ellipse cx="130" cy="110" rx="7" ry="5" fill="#BFE3CF" stroke="${INK}" stroke-width="1.5"/></g><g fill="#F2C14E"><path d="M30 60l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/><path d="M168 96l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></g></svg>`);
}
