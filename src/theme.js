// Paleta de "Glow by Rosalía" (mismos tonos del diseño).
// Tenerla en un solo lugar permite cambiar la marca completa desde aquí.
export const C = {
  bg: "#FFF7FB", // rosa-blanco muy claro y limpio (fondo aireado)
  surface: "#FFFFFF",
  ink: "#2B2530", // tinta oscura neutra (texto, buen contraste)
  inkSoft: "#857C8A", // texto secundario
  rose: "#F26D9C", // rosa vibrante
  roseDeep: "#D6357F", // magenta fuerte para acentos, etiquetas y precios
  primary: "#FF3D8B", // rosa fucsia vibrante — botones de acción (CTA que resalta)
  primaryInk: "#FFFFFF", // texto/icono blanco sobre el fucsia
  gold: "#F0B429", // dorado brillante del "glow"
  blush: "#FFE6F0", // rosa claro y luminoso
  line: "#F0E3EA", // bordes suaves
  ok: "#1FA971",
  warn: "#E8791F",
};

// Formatea números como soles peruanos: 18 -> "S/ 18.00"
export const money = (n) =>
  "S/ " +
  (Number(n) || 0).toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
