// Datos iniciales (se cargan la primera vez y luego se guardan en localStorage).

// Las imágenes son URLs públicas y temáticas (loremflickr) para que se vean en
// cualquier dispositivo. Cada producto puede tener VARIAS imágenes.
// También puedes pegar tus propias URLs o subir fotos desde el panel de admin.
const img = (tags, lock) => `https://loremflickr.com/600/600/${tags}?lock=${lock}`;

export const SEED_PRODUCTS = [
  {
    id: "p1", name: "Aretes Michi Dorado", category: "Aretes",
    cost: 6, price: 16, stock: 14, emoji: "🐱", bestSeller: true,
    images: [img("cat,earrings", 1), img("cat,jewelry", 1), img("cat,earrings", 3)],
    desc: "Gatitos diminutos que cuelgan de tus orejas 🐱 acabado dorado que combina con todo. ¡Miau de elegancia!",
  },
  {
    id: "p2", name: "Aretes Gato Perla", category: "Aretes",
    cost: 7, price: 18, stock: 10, emoji: "😻",
    images: [img("cat,jewelry", 2), img("cat,earrings", 2), img("cat,jewelry", 3)],
    desc: "Carita de michi con una perlita brillante ✨ delicados y ligeros para llevar todo el día.",
  },
  {
    id: "p3", name: "Collar Gatito Plata", category: "Collares",
    cost: 9, price: 24, stock: 8, emoji: "🐈", bestSeller: true,
    images: [img("cat,necklace", 1), img("cat,jewelry", 1), img("cat,necklace", 3)],
    desc: "Un gatito de plata que descansa sobre tu pecho 🐈 cadena ajustable y muy resistente.",
  },
  {
    id: "p4", name: "Collar Luna & Gato", category: "Collares",
    cost: 10, price: 28, stock: 6, emoji: "🌙",
    images: [img("cat,necklace", 2), img("cat,jewelry", 2), img("cat,necklace", 3)],
    desc: "Lunita y gatito tomados de la patita 🌙🐱 el dúo más tierno para tu cuello.",
  },
  {
    id: "p5", name: "Polo Estampado Gatito", category: "Ropa",
    cost: 18, price: 39, stock: 12, emoji: "👕", bestSeller: true,
    images: [img("cat,tshirt", 1), img("cat,tshirt", 2), img("cat,sweater", 1)],
    desc: "Polo suavecito con michis estampados por todas partes 🐾 algodón fresquito y abrazable.",
  },
  {
    id: "p6", name: "Sudadera Gato Kawaii", category: "Ropa",
    cost: 28, price: 59, stock: 7, emoji: "🧥",
    images: [img("cat,sweater", 1), img("cat,sweater", 2), img("cat,tshirt", 2)],
    desc: "Sudadera mullidita con un gato kawaii al frente ☁️ calientita para los días de mimos.",
  },
  {
    id: "p7", name: "Llavero Gatito Felpa", category: "Llaveros",
    cost: 5, price: 14, stock: 20, emoji: "🧶",
    images: [img("cat,keychain", 1), img("cat,keychain", 2), img("kitten", 1)],
    desc: "Llaverito de felpa con forma de gatito 🧶 tan suave que querrás abrazarlo. Cuida tus llaves con estilo.",
  },
  {
    id: "p8", name: "Bolso Tote Gatito", category: "Bolsos",
    cost: 14, price: 32, stock: 9, emoji: "👜", bestSeller: true,
    images: [img("cat,tote", 1), img("cat,bag", 1), img("cat,tote", 2)],
    desc: "Bolso tote con un gato estampado 🛍️ espacioso, resistente y ¡demasiado lindo para dejarlo en casa!",
  },
];

export const DEFAULT_SETTINGS = {
  storeName: "Glow by Rosalía",
  whatsapp: "51900000000", // ← cámbialo por tu número real (51 = código de Perú)
  pin: "1234",
  lowStock: 5,
  logo: "", // URL o imagen del logo para la portada (se configura en Ajustes)
  tagline: "Accesorios de gatitos para alegrar tu día 🐾",
  yapeNumber: "", // número de celular de Yape (9 dígitos)
  yapeName: "", // nombre del titular, tal como aparece en Yape
  yapeQr: "", // imagen del QR de Yape (se sube en Ajustes)
};

export const CATEGORIES = ["Todos", "Aretes", "Collares", "Anillos", "Ropa", "Llaveros", "Bolsos"];

// Info para los banners de portada por categoría: descripción general, emoji
// grande y degradado pastel (kawaii y llamativo).
export const CATEGORY_INFO = {
  Aretes: { emoji: "🎀", desc: "Gatitos diminutos para tus orejas, en dorado y plata. ¡Dulces y elegantes!", grad: ["#FFE0EC", "#FFC7D0"], words: ["brillan", "enamoran", "ronronean"] },
  Collares: { emoji: "🐈", desc: "Lleva un michi cerquita del corazón con nuestros collares más tiernos.", grad: ["#ECE0FF", "#D8C7FF"], words: ["enamoran", "brillan", "ronronean"] },
  Anillos: { emoji: "💍", desc: "Anillos con huellitas y michis para llevar en cada mano un poquito de ternura.", grad: ["#FFF0DC", "#FFDDB8"], words: ["brillan", "enamoran", "abrazan"] },
  Ropa: { emoji: "👕", desc: "Polos y sudaderas con estampados de gatitos, suavecitos y abrazables.", grad: ["#DFF1FF", "#C7E6FF"], words: ["abraza", "enamora", "ronronea"] },
  Llaveros: { emoji: "🧶", desc: "Llaveritos de felpa que querrás abrazar. Cuida tus llaves con estilo.", grad: ["#FFF1DA", "#FFE3C0"], words: ["acompañan", "enamoran", "sonríen"] },
  Bolsos: { emoji: "👜", desc: "Bolsos espaciosos con gatitos, ¡demasiado lindos para dejarlos en casa!", grad: ["#DEFBEA", "#C3F2D6"], words: ["enamoran", "combinan", "acompañan"] },
};

// Portada: frases que rotan bajo el nombre de la tienda en la diapositiva de
// bienvenida, y mensajes de la cinta que se desliza al pie del slider.
export const HERO_INTRO_WORDS = ["hecho con amor", "lleno de michis", "para consentirte"];
export const HERO_TICKER = [
  "Pide por WhatsApp",
  "Envíos a todo el Perú",
  "Nuevos michis cada semana",
  "Hecho con amor por Rosalía",
];

// Versión del catálogo de ejemplo. Súbela cuando cambies SEED_PRODUCTS para que
// las tiendas que aún tienen el catálogo viejo guardado se actualicen.
export const SEED_VERSION = "3";
