import { useEffect, useId, useState } from "react";
import { C, money } from "../theme.js";
import { firstPhoto, imgUrl } from "../lib/util.js";

// Rosalía, la gatita de la tienda (SVG realista, animado con CSS). Es una
// calico atigrada: cara blanca con gorro atigrado asimétrico, ojos dorado-oliva,
// y en el cuerpo manchas naranja, negra y atigrada. En cada diapositiva lleva el
// accesorio de esa categoría. Parpadea, mueve una oreja, ladea la cabeza y la cola.
export const ROS = {
  white: "#FBF8F5", shade: "#E6DDD6", tabby: "#7E664F", tabbyLight: "#A88A68",
  stripe: "#2F2620", orange: "#D98A4A", orangeLight: "#E9A76A", black: "#26211F",
  earIn: "#E9AFAB", earInDeep: "#C98B8A", irisIn: "#DCC258", irisOut: "#8D8534",
  noseDeep: "#D48489", line: "#3A2E2A",
};

// Textura de pelo: trazos cortos que salen desde un punto, con semilla fija
// (se calculan una sola vez y siempre salen iguales).
export function furPath(n, [bx, by, bw, bh], [fx, fy], seed, [l0, l1] = [3, 7]) {
  let s = seed;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  let d = "";
  for (let i = 0; i < n; i++) {
    const x = bx + r() * bw, y = by + r() * bh;
    const a = Math.atan2(y - fy, x - fx) + (r() - 0.5) * 0.5;
    const L = l0 + r() * (l1 - l0);
    d += `M${x.toFixed(1)} ${y.toFixed(1)}l${(Math.cos(a) * L).toFixed(1)} ${(Math.sin(a) * L).toFixed(1)}`;
  }
  return d;
}

export const FUR = {
  earL: furPath(26, [68, 16, 20, 30], [70, 50], 11, [5, 10]),
  earR: furPath(26, [112, 16, 20, 30], [130, 50], 12, [5, 10]),
  capDark: furPath(170, [55, 30, 95, 62], [100, 100], 3),
  capLight: furPath(120, [60, 30, 85, 60], [100, 100], 7, [3, 6]),
  face: furPath(160, [60, 60, 82, 60], [100, 96], 5, [3, 6]),
  orange: furPath(60, [38, 114, 40, 42], [58, 110], 21, [3, 6]),
  body: furPath(240, [44, 112, 112, 122], [100, 150], 9, [4, 8]),
  chest: furPath(44, [78, 116, 44, 36], [100, 110], 17, [6, 11]),
};

export const HEAD = "M60 72 C58 50 73 33 100 31 C127 33 142 50 140 72 C145 90 137 106 122 115 C111 121 89 121 78 115 C63 106 55 90 60 72 Z";

export const BODY = "M70 108 C50 122 40 152 42 184 C44 212 60 230 84 234 H116 C140 230 156 212 158 184 C160 152 150 122 130 108 Z";

export function CatArt({ variant }) {
  const u = useId().replace(/:/g, "");
  const sweater = variant === "Ropa";
  const pawUp = variant === "Anillos" || variant === "Llaveros";
  const ear = (d) => <path d={d} fill={`url(#tb${u})`} />;
  return (
    <>
      <defs>
        <clipPath id={`hc${u}`}><path d={HEAD} /></clipPath>
        <clipPath id={`bc${u}`}><path d={BODY} /></clipPath>
        <radialGradient id={`hs${u}`} cx="50%" cy="58%" r="62%"><stop offset=".55" stopColor={ROS.white} /><stop offset="1" stopColor={ROS.shade} /></radialGradient>
        <radialGradient id={`bs${u}`} cx="50%" cy="40%" r="65%"><stop offset=".5" stopColor={ROS.white} /><stop offset="1" stopColor={ROS.shade} /></radialGradient>
        <radialGradient id={`ir${u}`} cx="50%" cy="50%" r="55%"><stop offset="0" stopColor={ROS.irisIn} /><stop offset=".75" stopColor={ROS.irisOut} /><stop offset="1" stopColor="#3F3A18" /></radialGradient>
        <linearGradient id={`ei${u}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={ROS.earInDeep} /><stop offset="1" stopColor={ROS.earIn} /></linearGradient>
        <linearGradient id={`tb${u}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={ROS.tabby} /><stop offset="1" stopColor={ROS.tabbyLight} /></linearGradient>
        <linearGradient id={`og${u}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={ROS.orangeLight} /><stop offset="1" stopColor={ROS.orange} /></linearGradient>
        <radialGradient id={`ns${u}`} cx="50%" cy="35%" r="70%"><stop offset="0" stopColor="#F6BDBF" /><stop offset="1" stopColor={ROS.noseDeep} /></radialGradient>
      </defs>

      {/* cola atigrada alrededor de las patas */}
      <g className="glow-cat-tail">
        <path d="M146 224 C172 224 188 208 184 188 C182 178 174 174 170 180 C176 192 168 210 142 212 Z" fill={ROS.tabby} />
        <path d="M156 212 L160 222 M168 206 L176 214 M176 194 L184 196" stroke={ROS.stripe} strokeWidth="3" strokeLinecap="round" opacity=".85" />
      </g>

      {/* cuerpo gordito */}
      <path d={BODY} fill={sweater ? C.rose : `url(#bs${u})`} />
      <g clipPath={`url(#bc${u})`}>
        {sweater ? (
          <>
            {[[64, 140], [100, 132], [136, 142], [58, 180], [96, 172], [140, 184], [74, 212], [124, 214]].map(([x, y], k) => (
              <g key={k} fill="#fff">
                <circle cx={x - 3.5} cy={y} r="3.2" /><circle cx={x + 3.5} cy={y} r="3.2" />
                <circle cx={x} cy={y - 3.5} r="3.2" /><circle cx={x} cy={y + 3.5} r="3.2" />
                <circle cx={x} cy={y} r="2.4" fill={C.gold} />
              </g>
            ))}
            <path d="M44 150 Q100 166 156 150" stroke="#fff" strokeWidth="3" strokeDasharray="1 7" strokeLinecap="round" fill="none" />
          </>
        ) : (
          <>
            <path d="M36 120 C52 108 76 114 78 134 C78 152 58 158 40 152 Z" fill={`url(#og${u})`} />
            <path d={FUR.orange} stroke="#B86E34" strokeWidth=".8" strokeLinecap="round" opacity=".5" fill="none" />
            <path d="M122 114 C144 110 162 128 160 156 C148 164 130 156 120 138 Z" fill={ROS.black} />
            <path d="M130 170 C148 166 162 190 156 216 C142 222 128 206 126 188 Z" fill={ROS.tabby} />
            <path d="M134 178 C140 180 146 180 152 178 M132 190 C138 192 146 192 152 190" stroke={ROS.stripe} strokeWidth="2.4" fill="none" opacity=".8" />
            <path d="M144 170 C150 172 154 178 154 184" stroke={ROS.orange} strokeWidth="5" opacity=".5" fill="none" />
            <path d={FUR.body} stroke="#DDD4CC" strokeWidth=".8" strokeLinecap="round" opacity=".35" fill="none" />
          </>
        )}
      </g>
      {!sweater && <path d={FUR.chest} stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity=".95" fill="none" />}

      {/* patas delanteras */}
      <path d="M78 142 C76 174 76 202 78 228 H97 C98 202 98 174 97 142 Z" fill={ROS.white} />
      {!pawUp && <path d="M103 142 C102 174 102 202 103 228 H122 C124 202 124 174 122 142 Z" fill={ROS.white} />}
      <path d={pawUp ? "M97 152 C98 182 98 206 97 228" : "M97 152 C98 182 98 206 97 228 M103 152 C102 182 102 206 103 228"} stroke={ROS.shade} strokeWidth="2" fill="none" />
      <ellipse cx="87" cy="230" rx="12.5" ry="7" fill={ROS.white} />
      {!pawUp && <ellipse cx="113" cy="230" rx="12.5" ry="7" fill={ROS.white} />}
      <path d={pawUp ? "M82 232 V236 M87 232 V237 M92 232 V236" : "M82 232 V236 M87 232 V237 M92 232 V236 M108 232 V236 M113 232 V237 M118 232 V236"} stroke={ROS.shade} strokeWidth="1.3" />

      {/* collar de la tienda (en Collares lleva su cadenita con dije) */}
      {variant !== "Collares" && (
        <>
          <path d="M72 113 Q100 127 128 113" stroke={C.primary} strokeWidth="6" strokeLinecap="round" fill="none" />
          <g className="glow-acc-swing" style={{ transformOrigin: "100px 121px" }}>
            <circle cx="100" cy="129" r="7" fill={C.gold} stroke="#B8861C" strokeWidth="1.6" />
            <circle cx="97.5" cy="126.5" r="1.8" fill="#fff" opacity=".8" />
          </g>
        </>
      )}
      {variant === "Collares" && (
        <>
          <path d="M72 113 Q100 129 128 113" stroke={C.gold} strokeWidth="2.6" strokeDasharray="2 2.6" strokeLinecap="round" fill="none" />
          <g className="glow-acc-swing" style={{ transformOrigin: "100px 121px" }}>
            <path d="M100 121 V126" stroke={C.gold} strokeWidth="2.4" />
            <path d="M100 131 C93 124 86 130 100 144 C114 130 107 124 100 131 Z" fill={C.primary} stroke="#B01E62" strokeWidth="1.6" />
            <circle cx="95" cy="130" r="2" fill="#fff" opacity=".85" />
          </g>
        </>
      )}

      {/* patita levantada (anillo / llavero) */}
      {pawUp && (
        <g className="glow-cat-wave">
          <path d="M112 150 C122 140 138 126 146 112" stroke={ROS.shade} strokeWidth="21" strokeLinecap="round" fill="none" />
          <path d="M112 150 C122 140 138 126 146 112" stroke={ROS.white} strokeWidth="18" strokeLinecap="round" fill="none" />
          <ellipse cx="148" cy="106" rx="11" ry="9.5" fill={ROS.white} stroke={ROS.shade} strokeWidth="1.4" />
          <path d="M142 101 V97 M148 99 V95 M154 101 V97" stroke={ROS.shade} strokeWidth="1.3" />
          {variant === "Anillos" && (
            <>
              <ellipse cx="148" cy="114" rx="9" ry="3.4" fill="none" stroke={C.gold} strokeWidth="3.4" />
              <path d="M148 104 L153 109 L148 114 L143 109 Z" transform="translate(0 -1)" fill="#BFE9FF" stroke="#6BA6C4" strokeWidth="1.3" />
            </>
          )}
          {variant === "Llaveros" && (
            <g className="glow-acc-swing" style={{ transformOrigin: "148px 114px" }}>
              <circle cx="148" cy="122" r="7.5" fill="none" stroke={C.gold} strokeWidth="3" />
              <path d="M148 129.5 V135" stroke={C.gold} strokeWidth="2.4" />
              <circle cx="148" cy="143" r="8" fill={C.primary} stroke="#B01E62" strokeWidth="1.6" />
              <path d="M144 141 L146 137.5 L148 141 M148 141 L150 137.5 L152 141" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
            </g>
          )}
        </g>
      )}

      {/* bolso delante de las patitas */}
      {variant === "Bolsos" && (
        <g className="glow-acc-swing" style={{ transformOrigin: "100px 186px" }}>
          <path d="M84 204 Q84 186 100 186 Q116 186 116 204" fill="none" stroke="#B01E62" strokeWidth="3.4" />
          <rect x="74" y="200" width="52" height="34" rx="9" fill={C.primary} stroke="#B01E62" strokeWidth="2" />
          <path d="M74 212 H126" stroke="#B01E62" strokeWidth="1.6" opacity=".5" />
          <circle cx="100" cy="212" r="4" fill={C.gold} stroke="#B8861C" strokeWidth="1.4" />
        </g>
      )}

      {/* cabeza */}
      <g className="glow-cat-head">
        <g className="glow-cat-ear">
          {ear("M68 60 C62 40 61 20 67 6 C79 14 92 27 96 38 Z")}
          <path d="M71 50 C68 36 68 23 71 14 C80 22 87 30 90 39 Z" fill={`url(#ei${u})`} />
          <path d={FUR.earL} stroke="#fff" strokeWidth=".8" strokeLinecap="round" opacity=".8" fill="none" />
          <path d="M67 6 C63 14 62 26 64 38" stroke={ROS.orange} strokeWidth="3" opacity=".35" fill="none" />
        </g>
        {ear("M132 60 C138 40 139 20 133 6 C121 14 108 27 104 38 Z")}
        <path d="M129 50 C132 36 132 23 129 14 C120 22 113 30 110 39 Z" fill={`url(#ei${u})`} />
        <path d={FUR.earR} stroke="#fff" strokeWidth=".8" strokeLinecap="round" opacity=".8" fill="none" />

        <path d={HEAD} fill={`url(#hs${u})`} />
        <g clipPath={`url(#hc${u})`}>
          {/* gorro atigrado asimétrico con la franja blanca */}
          <path d="M50 20 H150 V60 C144 66 137 68 131 67 C125 65 119 63 113 61 C109 55 106 49 103 44 C99 45 95 48 92 53 C88 58 86 64 88 72 C88 82 82 90 74 94 C66 97 58 95 50 90 Z" fill={`url(#tb${u})`} />
          <path d="M52 64 C58 70 64 80 68 92" stroke={ROS.tabbyLight} strokeWidth="6" opacity=".5" fill="none" />
          <g stroke={ROS.stripe} strokeLinecap="round" fill="none" opacity=".85">
            <path d="M77 40 C79 47 82 52 85 57" strokeWidth="2.6" />
            <path d="M86 36 C87 42 89 47 91 51" strokeWidth="2.4" />
            <path d="M94 34 C95 38 96 42 97 45" strokeWidth="2" />
            <path d="M123 40 C121 47 118 52 115 57" strokeWidth="2.6" />
            <path d="M114 36 C113 42 111 47 109 51" strokeWidth="2.4" />
            <path d="M106 34 C105 38 104 42 103 45" strokeWidth="2" />
            <path d="M58 70 C63 72 68 72 72 70" strokeWidth="2.6" />
            <path d="M59 79 C63 81 67 81 70 79" strokeWidth="2.2" />
            <path d="M134 58 C130 61 126 62 122 61" strokeWidth="2.4" />
          </g>
          <path d={FUR.capDark} stroke={ROS.stripe} strokeWidth=".8" strokeLinecap="round" opacity=".35" fill="none" />
          <path d={FUR.capLight} stroke={ROS.tabbyLight} strokeWidth=".7" strokeLinecap="round" opacity=".5" fill="none" />
          <path d={FUR.face} stroke="#D9CFC7" strokeWidth=".7" strokeLinecap="round" opacity=".28" fill="none" />
          <path d="M60 50 C64 44 70 42 74 44 C70 50 66 54 60 56 Z" fill={ROS.orange} opacity=".45" />
        </g>

        {/* ojos dorado-oliva, mirada serena */}
        <g className="glow-cat-eyes">
          <path d="M70 77 C73 68 88 67 95 75 C90 84 76 85 70 77 Z" fill={`url(#ir${u})`} />
          <ellipse cx="83" cy="76.5" rx="3.2" ry="5.6" fill="#15110E" />
          <circle cx="86" cy="73.5" r="1.6" fill="#fff" opacity=".9" />
          <path d="M70 77 C73 68 88 67 95 75 C90 84 76 85 70 77 Z" fill="none" stroke={ROS.line} strokeWidth="1.8" />
          <path d="M130 77 C127 68 112 67 105 75 C110 84 124 85 130 77 Z" fill={`url(#ir${u})`} />
          <ellipse cx="117" cy="76.5" rx="3.2" ry="5.6" fill="#15110E" />
          <circle cx="120" cy="73.5" r="1.6" fill="#fff" opacity=".9" />
          <path d="M130 77 C127 68 112 67 105 75 C110 84 124 85 130 77 Z" fill="none" stroke={ROS.line} strokeWidth="1.8" />
        </g>
        <path d="M69.5 76 C73 67.5 88 66.5 95.5 74 M130.5 76 C127 67.5 112 66.5 104.5 74" stroke={ROS.line} strokeWidth="1.8" fill="none" strokeLinecap="round" />

        {/* cachetes, hocico, nariz, boca y bigotes */}
        <ellipse cx="91" cy="105" rx="10" ry="7" fill="#fff" />
        <ellipse cx="109" cy="105" rx="10" ry="7" fill="#fff" />
        <path d="M100 82 C98 88 97 92 96 94 M100 82 C102 88 103 92 104 94" stroke="#DED4CC" strokeWidth="1.2" fill="none" />
        <path d="M94.5 93 C96 90.5 104 90.5 105.5 93 C105.5 96 102.5 98.5 100 99.5 C97.5 98.5 94.5 96 94.5 93 Z" fill={`url(#ns${u})`} />
        <path d="M100 99.5 V103.5 M100 103.5 C97.5 107 93.5 107.5 91 105 M100 103.5 C102.5 107 106.5 107.5 109 105" stroke="#9C7475" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <g stroke="#BDB2AA" strokeWidth=".8" strokeLinecap="round" opacity=".9" fill="none">
          <path d="M86 103 C70 99 52 99 34 103" /><path d="M86 106 C70 105 54 107 38 112" /><path d="M87 109 C74 110 60 114 46 121" />
          <path d="M114 103 C130 99 148 99 166 103" /><path d="M114 106 C130 105 146 107 162 112" /><path d="M113 109 C126 110 140 114 154 121" />
        </g>

        {/* aretes colgando de las orejas */}
        {variant === "Aretes" && (
          <>
            <g className="glow-acc-swing" style={{ transformOrigin: "63px 18px" }}>
              <circle cx="63" cy="22" r="3.6" fill="none" stroke={C.gold} strokeWidth="2.2" />
              <path d="M63 25.5 V30" stroke={C.gold} strokeWidth="2" />
              <path d="M63 32 C58 28 55 33 63 41 C71 33 68 28 63 32 Z" fill={C.primary} stroke="#B01E62" strokeWidth="1.4" />
            </g>
            <g className="glow-acc-swing is-late" style={{ transformOrigin: "137px 18px" }}>
              <circle cx="137" cy="22" r="3.6" fill="none" stroke={C.gold} strokeWidth="2.2" />
              <path d="M137 25.5 V30" stroke={C.gold} strokeWidth="2" />
              <path d="M137 32 C132 28 129 33 137 41 C145 33 142 28 137 32 Z" fill={C.primary} stroke="#B01E62" strokeWidth="1.4" />
            </g>
          </>
        )}
      </g>
    </>
  );
}

// Zona que la lupa amplía en cada variante (x y ancho alto, en el viewBox 200×250).
export const CAT_ZOOM = {
  intro: "76 106 48 40",
  Collares: "74 108 52 44",
  Aretes: "46 8 36 38",
  Anillos: "126 90 44 40",
  Ropa: "48 128 72 60",
  Llaveros: "126 100 44 56",
  Bolsos: "68 180 64 60",
};

export const CAT_SAYS = {
  intro: "¡Hola! Soy Rosalía",
  Collares: "¡Mira mi collar!",
  Aretes: "¡Mis aretes nuevos!",
  Anillos: "¡Brilla, brilla!",
  Ropa: "¿Me veo linda?",
  Llaveros: "¡Nunca pierdo mis llaves!",
  Bolsos: "¡Lista para salir!",
};

export function CatMascot({ variant = "intro", picks = [], active = false, art = null, say = "" }) {
  const zoom = CAT_ZOOM[variant] || CAT_ZOOM.intro;
  const [n, setN] = useState(0);

  // Mientras la diapositiva está visible, la lupa va mostrando otro producto.
  useEffect(() => {
    if (!active || picks.length <= 1) return;
    setN(0);
    const t = setInterval(() => setN((i) => i + 1), 2000);
    return () => clearInterval(t);
  }, [active, picks.length]);

  const cur = picks.length ? n % picks.length : 0;
  const p = picks[cur];
  return (
    <div className="glow-cat-wrap" aria-hidden="true">
      {art ? (
        <span className="glow-cat glow-cat-guide" dangerouslySetInnerHTML={{ __html: art }} />
      ) : (
        <svg className="glow-cat" viewBox="0 0 200 250">
          <CatArt variant={variant} />
        </svg>
      )}
      {/* lupa: productos reales de la tienda (o el accesorio ampliado si no hay fotos) */}
      <div className="glow-cat-zoom">
        {picks.length ? (
          picks.map((q, k) => (
            <img key={q.id} src={imgUrl(firstPhoto(q), 300)} alt="" className={k === cur ? "is-on" : ""} />
          ))
        ) : art ? null : (
          <svg viewBox={zoom} preserveAspectRatio="xMidYMid slice">
            <CatArt variant={variant} />
          </svg>
        )}
      </div>
      {p && <span className="glow-cat-price" style={{ background: `var(--wacc, ${C.primary})` }}>{money(p.price)}</span>}
      {[0, 1, 2].map((k) => (
        <svg key={k} className="glow-cat-heart" viewBox="0 0 24 24" style={{ fill: C.primary, animationDelay: `${k * 1.2}s`, left: `${38 + k * 12}%` }}>
          <path d="M12 21 C4 14 2 10 4 6.5 C6 3.5 10 4 12 7 C14 4 18 3.5 20 6.5 C22 10 20 14 12 21 Z" />
        </svg>
      ))}
      <span className="glow-cat-say" style={{ color: `var(--wacc, ${C.roseDeep})` }}>{say || CAT_SAYS[variant] || CAT_SAYS.intro}</span>
    </div>
  );
}
