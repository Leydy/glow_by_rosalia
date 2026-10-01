// Guías de compras: dibujos (SVG en texto) y personalidad de cada uno.
// Se dibujan con dangerouslySetInnerHTML: son textos fijos de la tienda.
/* eslint-disable */
const INK = "#3A2E2A";

// Gallina gordita tejiendo
const hen = () => `
<svg viewBox="0 0 200 200">
  <ellipse cx="100" cy="188" rx="58" ry="7" fill="#0000000f"/>
  <g class="gd-bob">
    <path d="M40 120 C30 100 36 84 46 80 C44 94 48 104 56 110 Z" fill="#5A3622" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <ellipse cx="100" cy="128" rx="68" ry="60" fill="#8A5634" stroke="${INK}" stroke-width="3.5"/>
    <path d="M52 124 C62 112 78 110 88 120" fill="none" stroke="#6E4127" stroke-width="10" stroke-linecap="round"/>
    <path d="M100 38 C92 22 104 16 108 28 C112 16 124 20 118 34 C128 30 132 42 120 44 Z" fill="#FF5A6E" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="100" cy="78" r="40" fill="#8A5634" stroke="${INK}" stroke-width="3.5"/>
    <g class="gd-blink"><ellipse cx="86" cy="74" rx="8" ry="9" fill="#fff"/><ellipse cx="114" cy="74" rx="8" ry="9" fill="#fff"/>
      <ellipse cx="87" cy="75" rx="4.5" ry="6" fill="${INK}"/><ellipse cx="115" cy="75" rx="4.5" ry="6" fill="${INK}"/>
      <circle cx="88.5" cy="72.5" r="1.8" fill="#fff"/><circle cx="116.5" cy="72.5" r="1.8" fill="#fff"/></g>
    <ellipse cx="72" cy="88" rx="8" ry="4.5" fill="#FF8FAE" opacity=".75"/><ellipse cx="128" cy="88" rx="8" ry="4.5" fill="#FF8FAE" opacity=".75"/>
    <path d="M92 84 L108 84 L100 96 Z" fill="#F7B32B" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M100 96 C96 102 98 108 102 104" fill="#FF5A6E" stroke="${INK}" stroke-width="2"/>
    <!-- chalina tejida -->
    <path d="M66 108 Q100 124 134 108 L134 120 Q100 136 66 120 Z" fill="#B892FF" stroke="${INK}" stroke-width="2.5"/>
    <path d="M74 114 v8 M86 118 v8 M98 120 v8 M110 119 v8 M122 116 v8" stroke="#fff" stroke-width="2" opacity=".6"/>
    <!-- tejido en las alas -->
    <g class="gd-knitL"><path d="M58 148 L102 132" stroke="#C08A2C" stroke-width="4" stroke-linecap="round"/><circle cx="58" cy="148" r="4" fill="#C08A2C"/></g>
    <g class="gd-knitR"><path d="M142 148 L98 132" stroke="#C08A2C" stroke-width="4" stroke-linecap="round"/><circle cx="142" cy="148" r="4" fill="#C08A2C"/></g>
    <path d="M78 140 Q100 132 122 140 L118 158 Q100 164 82 158 Z" fill="#FF7FA8" stroke="${INK}" stroke-width="2.5"/>
    <path d="M84 146 h32 M85 152 h30" stroke="#fff" stroke-width="2" stroke-dasharray="3 3" opacity=".8"/>
    <path d="M70 176 l-6 10 M70 176 l0 11 M70 176 l6 10 M130 176 l-6 10 M130 176 l0 11 M130 176 l6 10" stroke="#F7B32B" stroke-width="3.5" stroke-linecap="round"/>
  </g>
  <g class="gd-ball"><circle cx="160" cy="176" r="15" fill="#FF7FA8" stroke="${INK}" stroke-width="2.5"/>
    <path d="M148 170 q12 8 24 0 M147 180 q13 8 26 -1 M156 162 q-4 14 2 28" fill="none" stroke="#fff" stroke-width="1.8" opacity=".7"/></g>
  <path d="M146 170 C130 160 124 152 118 150" fill="none" stroke="#FF7FA8" stroke-width="2.5" stroke-dasharray="1 0"/>
</svg>`;

// Rosalía (calico atigrada, como en la tienda)
const cat = () => `
<svg viewBox="0 0 200 200">
  <ellipse cx="100" cy="190" rx="54" ry="7" fill="#0000000f"/>
  <path class="gd-tail" d="M140 170 C176 170 184 134 168 118 C160 110 152 118 158 126 C170 142 160 158 134 160 Z" fill="#7E664F" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
  <g class="gd-bob">
    <ellipse cx="100" cy="148" rx="50" ry="42" fill="#FBF8F5" stroke="${INK}" stroke-width="3.5"/>
    <path d="M56 136 C66 124 84 128 84 144 C82 156 64 160 54 154 Z" fill="#D98A4A"/>
    <path d="M122 126 C138 122 150 134 148 150 C138 154 126 148 120 138 Z" fill="#26211F"/>
    <path class="gd-ear" d="M58 70 L62 22 L94 50 Z" fill="#7E664F" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M142 70 L138 22 L106 50 Z" fill="#7E664F" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M66 58 L67 34 L84 48 Z M134 58 L133 34 L116 48 Z" fill="#E9AFAB"/>
    <ellipse cx="100" cy="84" rx="50" ry="42" fill="#FBF8F5" stroke="${INK}" stroke-width="3.5"/>
    <path d="M52 76 C56 56 72 44 94 44 L98 58 C92 66 84 74 82 88 C70 92 58 88 52 76 Z" fill="#7E664F"/>
    <path d="M148 76 C144 56 128 44 106 44 L102 58 C108 66 116 72 118 80 C130 82 142 82 148 76 Z" fill="#7E664F"/>
    <path d="M70 58 l6 8 M80 52 l4 8 M130 58 l-6 8 M120 52 l-4 8" stroke="#2F2620" stroke-width="2.4" stroke-linecap="round"/>
    <g class="gd-blink"><path d="M70 84 C74 76 86 76 90 84 C86 90 74 90 70 84 Z" fill="#D3B84A" stroke="${INK}" stroke-width="2"/><ellipse cx="80" cy="84" rx="2.2" ry="4.6" fill="#15110E"/>
      <path d="M110 84 C114 76 126 76 130 84 C126 90 114 90 110 84 Z" fill="#D3B84A" stroke="${INK}" stroke-width="2"/><ellipse cx="120" cy="84" rx="2.2" ry="4.6" fill="#15110E"/></g>
    <ellipse cx="66" cy="98" rx="7" ry="4" fill="#FF9FB6" opacity=".55"/><ellipse cx="134" cy="98" rx="7" ry="4" fill="#FF9FB6" opacity=".55"/>
    <path class="gd-nose" d="M95 96 C97 93 103 93 105 96 C105 99 102 101 100 102 C98 101 95 99 95 96 Z" fill="#EDA3A6"/>
    <path d="M100 102 v4 M100 106 C97 110 92 110 90 107 M100 106 C103 110 108 110 110 107" stroke="#9C7475" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M60 116 Q100 132 140 116" fill="none" stroke="#FF3D8B" stroke-width="7" stroke-linecap="round"/>
    <circle cx="100" cy="128" r="7" fill="#F0B429" stroke="${INK}" stroke-width="2"/>
    <ellipse cx="80" cy="184" rx="14" ry="8" fill="#FBF8F5" stroke="${INK}" stroke-width="3"/><ellipse cx="120" cy="184" rx="14" ry="8" fill="#FBF8F5" stroke="${INK}" stroke-width="3"/>
  </g>
  <path class="gd-heart" d="M154 44 C146 38 140 44 146 52 L154 58 L162 52 C168 44 162 38 154 44 Z" fill="#FF3D8B"/>
</svg>`;

// Comisario Willy: monito con uniforme de policía, saludando
const monkey = () => `
<svg viewBox="0 0 200 200">
  <ellipse cx="100" cy="190" rx="56" ry="7" fill="#0000000f"/>
  <path class="gd-tail" d="M140 166 C174 168 184 138 170 124 C160 114 148 124 156 132" fill="none" stroke="${INK}" stroke-width="11" stroke-linecap="round"/>
  <path class="gd-tail" d="M140 166 C174 168 184 138 170 124 C160 114 148 124 156 132" fill="none" stroke="#8B5A3C" stroke-width="6" stroke-linecap="round"/>
  <g class="gd-bob">
    <!-- uniforme -->
    <ellipse cx="100" cy="152" rx="46" ry="38" fill="#2E3F6E" stroke="${INK}" stroke-width="3.5"/>
    <path d="M80 118 L100 140 L120 118 Z" fill="#9CC0EA" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M96 128 L104 128 L106 152 L100 160 L94 152 Z" fill="#1E2A4A" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
    <path d="M124 136 l3 6 6 1 -4.5 4 1 6 -5.5 -3 -5.5 3 1 -6 -4.5 -4 6 -1 z" fill="#F0B429" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>
    <circle cx="100" cy="168" r="2.4" fill="#F0B429"/><circle cx="100" cy="178" r="2.4" fill="#F0B429"/>
    <path d="M70 138 h14 M116 138 h0" stroke="#F0B429" stroke-width="3" stroke-linecap="round"/>
    <ellipse cx="146" cy="160" rx="10" ry="16" fill="#2E3F6E" stroke="${INK}" stroke-width="3"/>
    <circle cx="148" cy="176" r="8" fill="#F2D3B0" stroke="${INK}" stroke-width="2.5"/>
    <ellipse cx="80" cy="186" rx="14" ry="7" fill="#F2D3B0" stroke="${INK}" stroke-width="3"/><ellipse cx="120" cy="186" rx="14" ry="7" fill="#F2D3B0" stroke="${INK}" stroke-width="3"/>
    <!-- orejas -->
    <g class="gd-ear"><circle cx="52" cy="90" r="16" fill="#8B5A3C" stroke="${INK}" stroke-width="3.5"/><circle cx="52" cy="90" r="8.5" fill="#F2D3B0"/></g>
    <circle cx="148" cy="90" r="16" fill="#8B5A3C" stroke="${INK}" stroke-width="3.5"/><circle cx="148" cy="90" r="8.5" fill="#F2D3B0"/>
    <!-- cabeza -->
    <circle cx="100" cy="88" r="44" fill="#8B5A3C" stroke="${INK}" stroke-width="3.5"/>
    <path d="M100 74 C88 60 62 64 64 90 C66 112 84 124 100 124 C116 124 134 112 136 90 C138 64 112 60 100 74 Z" fill="#F2D3B0"/>
    <g class="gd-blink"><ellipse cx="86" cy="88" rx="6" ry="7.5" fill="${INK}"/><ellipse cx="114" cy="88" rx="6" ry="7.5" fill="${INK}"/>
      <circle cx="88" cy="85" r="2.2" fill="#fff"/><circle cx="116" cy="85" r="2.2" fill="#fff"/></g>
    <ellipse cx="74" cy="104" rx="7" ry="4" fill="#FF9FB6" opacity=".6"/><ellipse cx="126" cy="104" rx="7" ry="4" fill="#FF9FB6" opacity=".6"/>
    <g class="gd-nose"><ellipse cx="96" cy="102" rx="2" ry="2.6" fill="#6B4430"/><ellipse cx="104" cy="102" rx="2" ry="2.6" fill="#6B4430"/></g>
    <path d="M88 109 Q100 119 112 109" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>
    <!-- gorra de policía -->
    <path d="M58 60 C56 30 144 30 142 60 Z" fill="#2E3F6E" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="58" y="52" width="84" height="10" fill="#1E2A4A" stroke="${INK}" stroke-width="2.5"/>
    <path d="M58 62 Q100 78 142 62 Q100 70 58 62 Z" fill="#141012" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M100 34 l3.5 7 7.5 1 -5.5 5 1.4 7.5 -6.9 -3.6 -6.9 3.6 1.4 -7.5 -5.5 -5 7.5 -1 z" fill="#F0B429" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
    <!-- saludo -->
    <path d="M62 140 C44 124 40 92 54 68" fill="none" stroke="${INK}" stroke-width="17" stroke-linecap="round"/>
    <path d="M62 140 C44 124 40 92 54 68" fill="none" stroke="#2E3F6E" stroke-width="11" stroke-linecap="round"/>
    <ellipse cx="58" cy="62" rx="10" ry="8" transform="rotate(-30 58 62)" fill="#F2D3B0" stroke="${INK}" stroke-width="2.5"/>
  </g>
</svg>`;

// Cuysito peruano (tricolor, con chullito)
const cuy = () => `
<svg viewBox="0 0 200 200">
  <ellipse cx="100" cy="190" rx="66" ry="7" fill="#0000000f"/>
  <g class="gd-bob">
    <path d="M30 150 C30 104 64 76 104 76 C148 76 176 104 174 146 C172 178 144 188 100 188 C58 188 30 180 30 150 Z" fill="#FBF3E6" stroke="${INK}" stroke-width="3.5"/>
    <path d="M30 150 C30 118 44 96 66 86 C76 104 74 128 58 146 C48 156 36 158 30 150 Z" fill="#C8783A"/>
    <path d="M140 84 C160 92 174 112 174 136 C160 140 146 130 138 114 C134 104 134 92 140 84 Z" fill="#3A2E2A"/>
    <path d="M100 76 C110 90 112 110 104 124 C96 110 94 92 100 76 Z" fill="#E6C49A"/>
    <!-- chullo -->
    <path d="M70 70 C72 40 128 40 130 70 Z" fill="#FF3D8B" stroke="${INK}" stroke-width="3"/>
    <path d="M72 62 h56" stroke="#F0B429" stroke-width="5"/><path d="M74 54 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6" fill="none" stroke="#fff" stroke-width="2.2"/>
    <circle cx="100" cy="36" r="8" fill="#F0B429" stroke="${INK}" stroke-width="2.5"/>
    <path d="M70 70 v24 M130 70 v24" stroke="#FF3D8B" stroke-width="5" stroke-linecap="round"/>
    <circle cx="70" cy="98" r="4" fill="#F0B429"/><circle cx="130" cy="98" r="4" fill="#F0B429"/>
    <path class="gd-ear" d="M58 84 C50 74 56 64 66 70" fill="#E9A6A0" stroke="${INK}" stroke-width="3"/>
    <path d="M142 84 C150 74 144 64 134 70" fill="#E9A6A0" stroke="${INK}" stroke-width="3"/>
    <g class="gd-blink"><circle cx="80" cy="110" r="6" fill="${INK}"/><circle cx="120" cy="110" r="6" fill="${INK}"/>
      <circle cx="82" cy="108" r="2" fill="#fff"/><circle cx="122" cy="108" r="2" fill="#fff"/></g>
    <ellipse cx="68" cy="124" rx="8" ry="5" fill="#FF9FB6" opacity=".6"/><ellipse cx="132" cy="124" rx="8" ry="5" fill="#FF9FB6" opacity=".6"/>
    <path class="gd-nose" d="M95 120 C97 117 103 117 105 120 C104 123 101 125 100 125 C99 125 96 123 95 120 Z" fill="#E88E96"/>
    <path d="M100 125 v3 M100 128 C97 132 93 131 92 128 M100 128 C103 132 107 131 108 128" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M84 124 L64 120 M84 128 L66 130 M116 124 L136 120 M116 128 L134 130" stroke="${INK}" stroke-width="1.4" opacity=".6"/>
    <ellipse cx="72" cy="184" rx="12" ry="6" fill="#E9A6A0" stroke="${INK}" stroke-width="2.5"/><ellipse cx="128" cy="184" rx="12" ry="6" fill="#E9A6A0" stroke="${INK}" stroke-width="2.5"/>
  </g>
</svg>`;


export const GUIDES = {
  baneco: {
    name: "Doña Baneco", tag: "Gallina tejedora", art: hen(), bg: "linear-gradient(160deg,#FFF3D9,#FFE3EF)",
    desc: "Morochita, gordita, cariñosa y siempre tejiendo. Te ayuda a combinar colores.",
    hi: "¡Ay mi amor, qué gusto verte! Yo te acompaño mientras eliges 🧶",
    pick: (p) => `Mi amor, mira <b>${p}</b>: ¡te va a quedar precioso! 💕`,
    added: (p) => `¡Ay qué lindo! 💕 Ya está <b>${p}</b> en tu carrito.`,
    pair: (p) => `¿Le sumamos <b>${p}</b>? Combinan precioso, como un buen tejido 🧶`,
    go: (n) => `Tienes <b>${n} producto${n === 1 ? "" : "s"}</b> esperándote, corazón. ¿Vamos a pagar?`,
    tips: [
      "Si eres de Juliaca, la entrega es <b>gratis</b> en nuestros puntos de encuentro 📍",
      "Con cada compra juntas <b>Michipuntos</b> para descuentos, mi amor 🧶",
      "Agrega tu cumpleaños en Mi perfil y te regalamos <b>+50 Michipuntos</b> 🎂",
    ],
  },
  rosalia: {
    name: "Rosalía", tag: "La jefa de la tienda", art: cat(), bg: "linear-gradient(160deg,#FFE0EC,#ECE0FF)",
    desc: "Conoce cada producto y sabe cuál es el más vendido.",
    hi: "Miau… bienvenida a mi tienda. Te muestro lo mejor 😼",
    pick: (p) => `Miau… <b>${p}</b> es el favorito de todas 😼`,
    added: (p) => `¡Excelente elección! 😻 <b>${p}</b> ya está en tu carrito.`,
    pair: (p) => `Miau, con eso queda divino <b>${p}</b>. ¿Lo agrego?`,
    go: (n) => `Tienes <b>${n} producto${n === 1 ? "" : "s"}</b>. ¿Pasamos a pagar? Miau 🐾`,
    tips: [
      "Reseña tus compras con foto y gana hasta <b>+60 Michipuntos</b> ⭐",
      "Al confirmar tu pago te devuelvo <b>Michi-crédito</b> para tu próxima compra 💰",
      "Si eres de Juliaca, te lo entrego <b>gratis</b> 📍",
    ],
  },
  willy: {
    name: "Comisario Willy", tag: "Mono policía", art: monkey(), bg: "linear-gradient(160deg,#E2EAF7,#FFE9D9)",
    desc: "Pone orden en la tienda y cuida tu carrito y tus puntos.",
    hi: "¡Alto ahí! 🚨 Comisario Willy a tu servicio. Yo cuido tu carrito 🐒",
    pick: (p) => `Reporte del comisario: <b>${p}</b> es de los más buscados 🚨`,
    added: (p) => `¡Asegurado! <b>${p}</b> queda bajo custodia en tu carrito 👮`,
    pair: (p) => `Recomendación oficial: sumar <b>${p}</b>. ¿Lo agrego, jefa?`,
    go: (n) => `Tienes <b>${n} producto${n === 1 ? "" : "s"}</b> bajo custodia. ¿Procedemos al pago? 🚨`,
    tips: [
      "Tus <b>Michipuntos</b> están seguros conmigo. ¡Junta 500 y canjéalos! 🐒",
      "Envíos por Shalom a <b>todo el Perú</b>, o gratis en Juliaca 🚓",
      "Paga con Yape y sube tu captura: yo vigilo que todo llegue bien 👮",
    ],
  },
  cuyito: {
    name: "Cuyito", tag: "Cuy peruano con chullo", art: cuy(), bg: "linear-gradient(160deg,#DFF5E8,#FFF3D9)",
    desc: "Curioso y rapidito, te avisa de ofertas y envíos.",
    hi: "¡Cuí cuí! Soy Cuyito. ¡Vamos a buscar cositas lindas! 🎉",
    pick: (p) => `¡Cuí cuí! Mira <b>${p}</b>, ¡está bien bonito! ✨`,
    added: (p) => `¡Cuí! <b>${p}</b> ya va en tu carrito 🎉`,
    pair: (p) => `¡Cuí cuí! ¿Y si le sumamos <b>${p}</b>? 🙈`,
    go: (n) => `¡Cuí! Tienes <b>${n} producto${n === 1 ? "" : "s"}</b>. ¡Corre a pagar! 🏃`,
    tips: [
      "¡Cuí cuí! Si eres de Juliaca, la entrega es <b>gratis</b> 🎉",
      "Únete al club y recibe <b>100 Michipuntos</b> de regalo 🎁",
      "Canjea tus Michipuntos por una <b>¡sorpresa!</b> 🙈",
    ],
  },
};
export const GUIDE_KEYS = ["baneco", "rosalia", "willy", "cuyito"];
