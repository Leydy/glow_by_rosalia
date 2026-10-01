import { money } from "../theme.js";

// Captura de Yape de ejemplo (solo modo prueba): se dibuja al momento con el
// monto del carrito, el titular y un Nro. de operación al azar.
export function makeSampleCapture(total, yapeName) {
  const W = 390, H = 560;
  const cv = document.createElement("canvas");
  cv.width = W; cv.height = H;
  const g = cv.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, W, H);
  g.fillStyle = "#742284"; g.fillRect(0, 0, W, 110);
  g.textAlign = "center";
  g.fillStyle = "#fff"; g.font = "bold 30px Arial"; g.fillText("¡Yapeaste!", W / 2, 68);
  g.fillStyle = "#222"; g.font = "bold 46px Arial";
  g.fillText("S/ " + (Number.isInteger(total) ? total : total.toFixed(2)), W / 2, 190);
  const short = (yapeName || "Titular").split(/\s+/).map((w, i) => (i === 0 || i === 2 ? w : w[0] + ".")).slice(0, 4).join(" ");
  g.fillStyle = "#333"; g.font = "20px Arial"; g.fillText(short, W / 2, 232);
  const d = new Date();
  g.fillStyle = "#666"; g.font = "16px Arial";
  g.fillText(d.toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" }) + " - " + d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" }), W / 2, 280);
  const op = String(Math.floor(10000000 + Math.random() * 89999999));
  g.textAlign = "left"; g.fillStyle = "#333"; g.font = "17px Arial";
  g.fillText("Destino: Yape", 28, 360);
  g.fillText("Nro. de operación: " + op, 28, 400);
  g.fillStyle = "#999"; g.font = "13px Arial"; g.textAlign = "center";
  g.fillText("CAPTURA DE PRUEBA · NO ES UN PAGO REAL", W / 2, 520);
  return new Promise((ok) => cv.toBlob((b) => ok(new File([b], "captura-prueba.png", { type: "image/png" })), "image/png"));
}

// Lee una captura de Yape (texto de OCR) y saca el Nro. de operación, el
// monto y si el destinatario coincide con el titular configurado.
export const plain = (t) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function parseYapeText(text, yapeName) {
  const flat = text.replace(/\s+/g, " ");
  let op = "";
  const m = /operaci[oó0]n\D{0,25}(\d[\d ]{4,14}\d)/i.exec(flat);
  if (m) op = m[1].replace(/\s/g, "");
  else {
    // sin la etiqueta: el número largo que no sea un celular (9 dígitos que empieza en 9)
    const nums = (flat.match(/\b\d{6,12}\b/g) || []).filter((n) => !/^9\d{8}$/.test(n));
    op = nums.sort((a, b) => b.length - a.length)[0] || "";
  }
  // "S/ 25": el OCR a veces lee la barra como I, l o 1, y la S como 5
  const a = /\b[S5$]\s*[/|Il1]\s*\.?\s*(\d{1,5}(?:[.,]\d{1,2})?)\b/.exec(flat);
  const amount = a ? Number(a[1].replace(",", ".")) : null;
  const low = plain(flat);

  // ¿De qué app es? Yape y Plin (y los bancos con Plin) se pueden pagar entre sí.
  const app = /yape/.test(low) ? "yape" : /plin|interbank|bbva|scotiabank/.test(low) ? "plin" : null;

  // Titular: Yape y Plin la muestran recortada ("Leydy Coy.", "Leydy Coyllo M."),
  // así que basta el primer nombre + el comienzo (3 letras o más) de otro nombre o apellido.
  const tokens = low.split(/[^a-zñ]+/).filter((t) => t.length >= 3 && !MONTHS_ES.includes(t));
  const words = plain(yapeName || "").split(/\s+/).filter((w) => w.length >= 3);
  const match = (w) => tokens.some((t) => w.startsWith(t) || (t.length >= 4 && t.startsWith(w)));
  const toMe = words.length ? match(words[0]) && (words.length === 1 || words.slice(1).some(match)) : null;

  // Fecha del comprobante ("1 oct. 2026", "01 de octubre de 2026").
  let date = null;
  const dm = /\b(\d{1,2})\s*(?:de\s*)?(ene|feb|mar|abr|may|jun|jul|ago|set|sep|oct|nov|dic)[a-z.]*\s*(?:de\s*)?(\d{4})?/.exec(low);
  if (dm) {
    const mi = MONTHS_ES.indexOf(dm[2] === "sep" ? "set" : dm[2]);
    date = new Date(Number(dm[3]) || new Date().getFullYear(), mi, Number(dm[1]));
  }
  // captura de la pantalla de pago de la tienda (no es un comprobante)
  const storeShot = /monto a yapear|pagar con yape|numero yape|escanea el qr/.test(low);
  return { op, amount, toMe, app, date, labeled: !!m, storeShot };
}

export const MONTHS_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"];

// Revisión de la captura: qué se encontró y si se puede continuar.
// Bloquea si no es un comprobante, si el monto no es exacto o no se lee, si es
// otra titular o si es una captura vieja; lo demás queda marcado en tu panel.
export function checkYape(r, total) {
  const days = r.date ? Math.round((Date.now() - r.date.getTime()) / 86400000) : null;
  const dateOk = days == null ? null : days >= -1 && days <= 2;
  // el monto debe ser exactamente el total del pedido
  const amountOk = r.amount == null ? null : Math.abs(r.amount - total) < 0.01;
  // un comprobante real trae la app y además el nro. de operación o la fecha
  const isReceipt = r.labeled || (!!r.app && !!r.date);
  let block = "";
  if (r.storeShot) block = "Esa es la pantalla de pago de la tienda. Sube la captura del comprobante que te muestra Yape o Plin después de pagar.";
  else if (!isReceipt && r.amount == null && !r.toMe) block = "Esta imagen no parece un comprobante de Yape o Plin. Sube la captura de tu pago, donde se vean el monto y el nro. de operación.";
  else if (!isReceipt && !r.toMe) block = "No reconocemos esta captura como un pago de Yape o Plin a la tienda. Sube la captura completa del comprobante.";
  else if (amountOk === false) block = `El monto de la captura (${money(r.amount)}) no coincide con el total de tu pedido (${money(total)}). Yapea el monto exacto.`;
  else if (amountOk === null) block = `No pudimos leer el monto en tu captura. Sube una captura clara donde se vea el monto (${money(total)}).`;
  else if (r.toMe === false) block = "En la captura no aparece el nombre de la titular de la tienda. Revisa que hayas pagado al número correcto.";
  else if (dateOk === false) block = `Esta captura es del ${r.date.toLocaleDateString("es-PE", { day: "numeric", month: "long" })}. Sube el comprobante de este pago.`;
  return { dateOk, amountOk, block };
}

export async function readYapeCapture(file) {
  const { createWorker, PSM } = await import("tesseract.js");
  const worker = await createWorker("spa");
  try {
    // modo "texto disperso": así no se salta el monto grande del comprobante
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    const { data } = await worker.recognize(file);
    return data.text || "";
  } finally {
    await worker.terminate();
  }
}
