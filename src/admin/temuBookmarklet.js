// Marcador «🐾 Copiar de Temu». Se arrastra a la barra de favoritos y se toca
// en la página de un producto de Temu: copia el nombre, las fotos grandes y el
// precio para pegarlos en el panel → «Importar de Temu». Va sumando productos
// (la lista se guarda en el navegador, en temu.com) hasta que se vacía.
//
// Este código corre dentro de temu.com, así que no puede usar nada de la tienda.
function copyFromTemu() {
  const KEY = "glow:temu";
  // Solo fotos de los servidores de Temu; sin los parámetros de tamaño, que es
  // como se obtiene la foto original (la más grande).
  const clean = (u) => {
    try {
      const x = new URL(u, location.href);
      if (!/(^|\.)kwcdn\.com$/.test(x.hostname)) return "";
      const p = x.origin + x.pathname;
      // los banners, íconos y logos de Temu viven en /upload_aimg/; las fotos de productos no
      if (/upload_aimg|\/icon|\/logo|\/avatar|\/emoji/i.test(p)) return "";
      return /\.(jpe?g|png|webp|avif)$/i.test(p) ? p : "";
    } catch (e) {
      return "";
    }
  };
  const fotos = [];
  const add = (u) => { const c = clean(u); if (c && !fotos.includes(c)) fotos.push(c); };

  // 1) Datos del producto que la página trae para Google (los más confiables).
  let ld = null;
  document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
    try {
      const j = JSON.parse(s.textContent);
      [].concat(j["@graph"] || j).forEach((o) => { if (!ld && o && /Product/i.test(String(o["@type"]))) ld = o; });
    } catch (e) { /* bloque que no es del producto */ }
  });
  if (ld) [].concat(ld.image || []).forEach((u) => add(typeof u === "string" ? u : u && u.url));
  const og = document.querySelector('meta[property="og:image"]');
  if (og) add(og.content);

  // 2) Si faltan, la galería del producto: se parte de la foto más grande de
  //    arriba (la principal) y se sube hasta el bloque que contiene sus
  //    miniaturas. Así no entran fotos de recomendaciones ni banners.
  if (fotos.length < 3) {
    const src = (im) => im.currentSrc || im.src || im.getAttribute("data-src") || "";
    const imgs = Array.from(document.querySelectorAll("img")).filter((im) => clean(src(im)));
    let main = null;
    let area = 0;
    imgs.forEach((im) => {
      const r = im.getBoundingClientRect();
      if (r.top + window.scrollY < 1200 && r.width * r.height > area) { area = r.width * r.height; main = im; }
    });
    if (main) {
      add(src(main));
      let box = main.parentElement;
      for (let k = 0; box && k < 8; k++, box = box.parentElement) {
        const inside = Array.from(box.querySelectorAll("img")).filter((im) => clean(src(im)));
        if (inside.length >= 3 && inside.length <= 20) { inside.forEach((im) => add(src(im))); break; }
        if (inside.length > 20) break; // ya sería la página entera
      }
    }
  }

  const meta = (p) => { const m = document.querySelector('meta[property="' + p + '"]'); return m ? m.content : ""; };
  const h1 = document.querySelector("h1");
  const nombre = String((ld && ld.name) || meta("og:title") || (h1 && h1.innerText) || document.title).replace(/\s*[-|–]\s*Temu.*$/i, "").trim().slice(0, 160);
  let precio = null;
  const of = ld && [].concat(ld.offers || [])[0];
  if (of && Number(of.price || of.lowPrice)) precio = Number(of.price || of.lowPrice);
  if (!precio) {
    const m = /S\/\s?(\d{1,4}(?:[.,]\d{1,2})?)/.exec(document.body.innerText);
    if (m) precio = Number(m[1].replace(",", "."));
  }

  const aviso = (html, ok) => {
    const old = document.getElementById("glow-temu-box");
    if (old) old.remove();
    const box = document.createElement("div");
    box.id = "glow-temu-box";
    box.style.cssText = "position:fixed;top:16px;right:16px;z-index:2147483647;max-width:330px;background:#3B2146;color:#fff;border-radius:16px;padding:14px 16px;font:14px/1.45 system-ui,sans-serif;box-shadow:0 14px 34px rgba(0,0,0,.35)";
    box.innerHTML = html + '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">' +
      (ok ? '<button data-a="vaciar" style="border:0;border-radius:99px;padding:6px 12px;background:rgba(255,255,255,.15);color:#fff;cursor:pointer">Vaciar lista</button>' : "") +
      '<button data-a="cerrar" style="border:0;border-radius:99px;padding:6px 12px;background:#FF3D8B;color:#fff;cursor:pointer">Cerrar</button></div>';
    box.addEventListener("click", (e) => {
      const a = e.target.getAttribute("data-a");
      if (a === "cerrar") box.remove();
      if (a === "vaciar") { try { localStorage.removeItem(KEY); } catch (er) { /* nada */ } box.innerHTML = "🐾 Lista vaciada. ¡Lista para copiar productos nuevos!"; setTimeout(() => box.remove(), 2500); }
    });
    document.body.appendChild(box);
    return box;
  };

  if (!fotos.length) {
    aviso("<b>🐾 No encontré fotos del producto</b><br>Abre la página del producto (no la lista de pedidos) y vuelve a tocar el marcador.", false);
    return;
  }

  let lista = [];
  try { lista = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { lista = []; }
  const url = location.origin + location.pathname;
  lista = lista.filter((x) => x.url !== url);
  lista.push({ nombre, precio, fotos: fotos.slice(0, 12), url });
  try { localStorage.setItem(KEY, JSON.stringify(lista)); } catch (e) { /* sin almacenamiento: solo este producto */ }
  const texto = JSON.stringify({ glowTemu: 1, productos: lista });

  const resumen = "<b style=\"display:block;margin-bottom:4px\">🐾 ¡Copiado para Glow!</b>" + nombre.replace(/[<>&]/g, "").slice(0, 70) +
    '<div style="opacity:.85;margin-top:6px">📸 ' + Math.min(fotos.length, 12) + " fotos · 💰 " + (precio ? "S/ " + precio.toFixed(2) : "sin precio") + " · 🧺 " + lista.length + (lista.length === 1 ? " producto copiado" : " productos copiados") + "</div>";
  const fin = () => aviso(resumen + '<div style="margin-top:6px">Ahora pégalo en tu panel → «Importar de Temu».</div>', true);
  const manual = () => {
    const box = aviso(resumen + '<div style="margin-top:6px">Copia este texto con <b>Ctrl + C</b> y pégalo en tu panel:</div><textarea style="width:100%;height:70px;margin-top:6px;border-radius:8px;font-size:11px"></textarea>', true);
    const ta = box.querySelector("textarea");
    ta.value = texto;
    ta.focus();
    ta.select();
  };
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texto).then(fin, manual);
  else manual();
}

// Dirección "javascript:" del marcador (se arrastra a la barra de favoritos).
export function temuBookmarklet() {
  return "javascript:" + encodeURIComponent("(" + copyFromTemu.toString() + ")();void 0");
}

// Lee lo que se pegó en el panel. Devuelve la lista de productos o null.
export function parseTemuPaste(text) {
  try {
    const j = JSON.parse(String(text || "").trim());
    if (!j || j.glowTemu !== 1 || !Array.isArray(j.productos)) return null;
    return j.productos
      .filter((p) => p && Array.isArray(p.fotos) && p.fotos.length)
      .map((p) => ({
        nombre: String(p.nombre || "").slice(0, 160),
        precio: Number(p.precio) > 0 ? Number(p.precio) : null,
        fotos: p.fotos.filter((u) => /^https:\/\/[a-z0-9.-]*kwcdn\.com\//i.test(u)).slice(0, 12),
        url: String(p.url || ""),
      }))
      .filter((p) => p.fotos.length);
  } catch {
    return null;
  }
}
