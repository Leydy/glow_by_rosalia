import React from "react";
import { ChevronRight } from "lucide-react";
import { BLACK_CAT, GHOST, MOON, PUMPKIN, SPIDER, batSvg, candySvg, catSkullSvg, webSvg } from "../seasons.js";
import { svg } from "../components/ui.jsx";

/* ---------- Halloween ----------
   Decoración tenue: telarañas en las esquinas de la portada, una arañita que
   se mece, murciélagos que cruzan despacio y una franja con calaveritas de
   michi. No tapa fotos ni botones (pointer-events: none). */
export const HALLOWEEN = {
  web: webSvg(),
  cardWeb: webSvg("#3B2146", 0.22),
  bandWeb: webSvg("#FFFFFF", 0.22),
  skull: catSkullSvg(),
  skull2: catSkullSvg("#F6EEF8"),
  bat: batSvg("#3B2146", 0.45),
  bat2: batSvg("#742284", 0.35),
  batLight: batSvg("#FFB3D0", 0.7),
  batDark: batSvg("#2A1630", 0.8),

  candies: ["#F26D9C", "#F7A440", "#B48BE0", "#7BC67E"].map(candySvg),
};

// Gatito negro que pasea de ida y vuelta por la cabecera.
export function HalloweenCat() {
  return <span className="glow-hw-cat" aria-hidden="true"><span dangerouslySetInnerHTML={{ __html: BLACK_CAT }} /></span>;
}

// Bandada de murciélagos que cruza la pantalla de vez en cuando.
export function HalloweenFlock() {
  return (
    <div className="glow-hw-flock" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => svg(HALLOWEEN.batDark, `glow-hw-flock-bat is-${i}`, null, i))}
    </div>
  );
}

export function HalloweenHero() {
  return (
    <div className="glow-hw-hero" aria-hidden="true">
      {svg(HALLOWEEN.web, "glow-hw-web is-left")}
      {svg(HALLOWEEN.web, "glow-hw-web is-right")}
      {svg(SPIDER, "glow-hw-spider")}
      {svg(HALLOWEEN.bat, "glow-hw-bat is-1")}
      {svg(HALLOWEEN.bat2, "glow-hw-bat is-2")}
      {svg(HALLOWEEN.bat, "glow-hw-bat is-3")}
      {svg(MOON, "glow-hw-moon")}
      {[0, 1, 2].map((i) => svg(GHOST, `glow-hw-ghost is-${i}`, null, i))}
      <span className="glow-hw-fog is-1" />
      <span className="glow-hw-fog is-2" />
    </div>
  );
}

export function HalloweenBand({ season, onGo }) {
  return (
    <section className="glow-hw-band">
      {svg(HALLOWEEN.bandWeb, "glow-hw-band-web")}
      {svg(HALLOWEEN.skull, "glow-hw-skull is-1")}
      {svg(PUMPKIN, "glow-hw-pumpkin")}
      <div className="glow-hw-band-text">
        <b>{season.title} 🎃</b>
        <span>{season.text}</span>
      </div>
      <button onClick={onGo}>{season.cta} <ChevronRight size={16} /></button>
      {svg(HALLOWEEN.skull2, "glow-hw-skull is-2")}
      {svg(HALLOWEEN.batLight, "glow-hw-band-bat")}
      {HALLOWEEN.candies.map((c, i) => svg(c, `glow-hw-candy is-${i}`, null, i))}
    </section>
  );
}
