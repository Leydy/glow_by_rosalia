// Nombre corto y descripción tierna para los productos que vienen de Temu
// (sus títulos son larguísimos y llenos de palabras clave).

const plain = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// "Aretes de gato con perla, 2 piezas, estilo coreano, regalo para mujer…" → "Aretes de gato con perla"
export function shortName(title) {
  let t = String(title || "").replace(/\s+/g, " ").trim();
  t = t.split(/\s*[,|;/–—(]\s*|\s+-\s+/)[0] || t; // hasta la primera coma o separador
  t = t
    .replace(/^([A-Z0-9]{3,}\s+)+/, "") // marca en mayúsculas al inicio (SEYIZE, XIUASE…)
    .replace(/^\d+\s*en\s*\d+\s+/i, "") // "6 en 1 Sérum…" → "Sérum…"
    .replace(/(\bde\s+)?\b\d+\s*(piezas|pieza|pzs|pz|pcs|pares|unidades|uds|ud)\b/gi, "") // "de 2 piezas"
    .replace(/\b(para (mujer|mujeres|hombre|niña|niño|niñas|niños|bebé)|regalo|nuevo|unisex|estilo coreano)\b.*$/i, "")
    .replace(/\s+/g, " ").trim();
  let words = t.split(" ");
  if (words.length > 6) words = words.slice(0, 6);
  while (words.length > 1 && /^(de|del|con|para|y|en|a|la|el|los|las|por)$/i.test(words[words.length - 1])) words.pop();
  t = words.join(" ");
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : String(title || "").slice(0, 60);
}

// Rasgos que se reconocen en el título (en español o inglés).
const TRAITS = [
  [/gat|cat|kitt|michi|neko/, "con carita de michi"],
  [/corazon|heart/, "con corazón"],
  [/perla|pearl/, "con perlita"],
  [/mariposa|butterfly/, "de mariposa"],
  [/luna|moon/, "con lunita"],
  [/estrella|star/, "con estrellita"],
  [/flor|flower|sakura/, "con flores"],
  [/oso|bear/, "de osito"],
  [/dino/, "de dinosaurio"],
  [/cocodril|crocodil|caiman/, "de cocodrilo"],
  [/conejo|bunny|rabbit/, "de conejito"],
  [/vitamina c|vitamin c/, "con vitamina C"],
  [/hialuron|hyaluron/, "con ácido hialurónico"],
  [/niacinamid/, "con niacinamida"],
  [/retinol/, "con retinol"],
  [/peptid/, "con péptidos"],
  [/colageno|collagen/, "con colágeno"],
  [/rosa|rose/, "de rosas"],
  [/durazno|melocoton|peach/, "aroma a durazno"],
  [/fresa|strawberry/, "aroma a fresa"],
  [/plata|silver/, "plateado"],
  [/dorad|oro\b|gold/, "dorado"],
];
function trait(title) {
  const p = plain(title);
  const t = TRAITS.find(([re]) => re.test(p));
  return t ? t[1] : "";
}

// Frases por categoría, con el estilo de la tienda (corto, tierno, con un emoji).
const TPL = {
  Aretes: (r) => `Aretes ${r || "delicados"} que le dan un toque tierno a tu look. Livianos y cómodos para todo el día ✨`,
  Collares: (r) => `Collar ${r || "delicado"} para llevar un detallito lindo cerca del corazón 💕`,
  Anillos: (r) => `Anillo ${r || "delicado"} para lucir en tus manos todos los días. ¡Combina con todo! 💍`,
  Ropa: (r) => `Prenda ${r || "linda"}, suavecita y cómoda para tus días de mimos 🐾`,
  Llaveros: (r) => `Llaverito ${r || "adorable"} para acompañar tus llaves con estilo 🧶`,
  Bolsos: (r) => `Bolso ${r || "lindo"} y práctico, ¡perfecto para salir con todo lo tuyo! 👜`,
  Limpiadores: (r) => `Limpiador ${r || "suave"} que deja tu piel fresca y limpia, lista para tu rutina 🧼`,
  Tónicos: (r) => `Tónico ${r || "refrescante"} que calma y prepara tu piel después de limpiarla 🌸`,
  Sérums: (r) => `Sérum ${r || "ligero"} para una piel más luminosa. Unas gotitas en tu rutina y listo ✨`,
  Cremas: (r) => `Crema ${r || "hidratante"} que deja tu piel suave y cuidada todo el día ☁️`,
  "Protector solar": (r) => `Protector solar ${r || "ligero"} para cuidar tu piel del sol todos los días ☀️`,
  Labiales: (r) => `Para unos labios suaves y bonitos${r ? ", " + r : ""}. ¡Ideal para llevar en tu cartera! 💋`,
  Maquillaje: (r) => `Maquillaje ${r || "fácil de usar"} para un look lindo y natural ✨`,
  Polos: (r) => `Polo ${r || "estampado"}, suavecito y fresco para que tu peque juegue todo el día 🧸`,
  Vestidos: (r) => `Vestido ${r || "cute"}, cómodo y bonito para pasear y celebrar 🎀`,
  Casacas: (r) => `Casaca ${r || "abrigadita"} para que tu peque esté calientito y con estilo 🧥`,
  Pantalones: (r) => `Pantalón ${r || "cómodo"} para jugar y pasear sin parar 🧸`,
  Faldas: (r) => `Falda ${r || "linda"} para que tu peque brille en cada salida 🎀`,
  Zapatitos: (r) => `Zapatitos ${r || "cómodos"} y livianos para cada aventura de tu peque 👟`,
  Gorritos: (r) => `Gorrito ${r || "tierno"} que abriga y se ve súper cute 🧶`,
  Conjuntos: (r) => `Conjunto ${r || "lindo"}, suave y cómodo para que tu peque juegue todo el día 🧸`,
};

export function autoDesc(title, category) {
  const r = trait(title);
  const f = TPL[category];
  return f ? f(r) : `Un detalle ${r || "lindo"} elegido con cariño para ti ✨`;
}

// Nombre sugerido: el corto y, si queda de una sola palabra, con su rasgo ("Conjunto de dinosaurio").
export function suggestName(title) {
  const n = shortName(title);
  const r = trait(title);
  return n.split(" ").length < 2 && r ? `${n} ${r}` : n;
}
