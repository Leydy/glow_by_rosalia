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
  "Ropa coreana": (r) => `Prenda estilo coreano ${r || "linda"}, cómoda y fácil de combinar para un look tierno ✨`,
  Relojes: (r) => `Reloj ${r || "elegante"} que combina con todo y le da un toque lindo a tu muñeca ⌚`,
  Accesorios: (r) => `Accesorio ${r || "delicado"} para completar tu look con un detalle bonito 💕`,
  Chompas: (r) => `Chompa ${r || "abrigadita"}, suave y calientita para los días de frío 🧶`,
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

// Categoría sugerida según el título (se puede cambiar antes de crear el producto).
// La Michitienda es solo para cosas con forma o estampado de michi.
const CAT_RULES = [
  [/s[eé]rum/, "Sérums"], [/t[oó]nico/, "Tónicos"], [/limpiador|gel limpiador|espuma limpiadora/, "Limpiadores"],
  [/protector solar|bloqueador|spf|fps/, "Protector solar"], [/labial|lip|labios/, "Labiales"],
  [/crema|hidratante|contorno de ojos|eye gel|gel para ojos/, "Cremas"], [/maquillaje|rubor|sombra|base de maquillaje/, "Maquillaje"],
];
const KIDS_RULES = [
  [/chompa|su[eé]ter|sweater/, "Chompas"], [/vestido/, "Vestidos"], [/casaca|chaqueta|abrigo/, "Casacas"],
  [/pantal[oó]n|jean|short/, "Pantalones"], [/falda/, "Faldas"], [/zapat|tenis|sandalia/, "Zapatitos"],
  [/gorr|sombrero/, "Gorritos"], [/conjunto|set de|piezas/, "Conjuntos"], [/polo|camiseta|polera/, "Polos"],
];
export function guessCategory(title) {
  const p = plain(title);
  const michi = /gat|michi|kitty|\bcat\b|kitten|huell|neko|miau/.test(p);
  const kids = /\bni[nñ]o|\bni[nñ]a|infantil|beb[eé]|kids|\bpeque/.test(p);
  if (kids) return (KIDS_RULES.find(([re]) => re.test(p)) || [, "Conjuntos"])[1];
  const skin = CAT_RULES.find(([re]) => re.test(p));
  if (skin) return skin[1];
  if (/reloj|watch/.test(p)) return "Relojes";
  if (michi) {
    if (/collar|colgante/.test(p)) return "Collares";
    if (/anillo/.test(p)) return "Anillos";
    if (/llavero/.test(p)) return "Llaveros";
    if (/bolso|cartera|mochila/.test(p)) return "Bolsos";
    if (/polo|camiseta|polera|blusa|chompa|su[eé]ter/.test(p)) return "Ropa";
    return "Aretes";
  }
  if (/chaqueta|c[aá]rdigan|camiseta|blusa|polera|chompa|su[eé]ter|vestido|falda|pantal[oó]n|top\b|camisa/.test(p)) return "Ropa coreana";
  return "Accesorios";
}

// Nombre sugerido: el corto y, si queda de una sola palabra, con su rasgo ("Conjunto de dinosaurio").
export function suggestName(title) {
  const n = shortName(title);
  const r = trait(title);
  return n.split(" ").length < 2 && r ? `${n} ${r}` : n;
}
