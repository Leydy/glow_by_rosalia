// Correos de la tienda (bienvenida al club), enviados con Brevo.
//
// Brevo tiene plan gratis (300 correos/día) y envía por HTTPS, que funciona en
// Render (el plan gratis de Render no deja usar SMTP). Variables:
//   BREVO_API_KEY   → clave de Brevo (Configuración → Claves API)
//   MAIL_FROM       → el correo remitente, verificado en Brevo (tu Gmail)
//   MAIL_FROM_NAME  → nombre que ve la clienta (por defecto "Glow by Rosalía")
//   PUBLIC_URL      → dirección de la tienda para los botones del correo
// Sin BREVO_API_KEY no se envía nada (la tienda funciona igual).

export const mailEnabled = () => !!(process.env.BREVO_API_KEY && process.env.MAIL_FROM);

const STORE = () => (process.env.PUBLIC_URL || "https://glow-by-rosalia.onrender.com").replace(/\/$/, "");
const FACE = "https://res.cloudinary.com/iclone/image/upload/v1790808130/glow/marca/pdqvcmv4rskup43xoluw.png";

const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// Correo de bienvenida. Tablas y estilos en línea: así se ve bien en Gmail,
// Outlook y el celular.
export function welcomeEmail({ name, points = 100 }) {
  const first = esc((name || "").trim().split(/\s+/)[0] || "michi-lover");
  const url = STORE();
  // Beneficio en "columna flotante": 2 por fila en computadora, 1 en el celular.
  const perk = (icon, title, text) => `
      <div style="display:inline-block;width:100%;max-width:292px;vertical-align:top">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
          <td style="padding:8px">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#FBF7FD;border-radius:16px"><tr>
              <td width="46" valign="top" style="padding:14px 0 14px 14px;font-size:24px;line-height:1">${icon}</td>
              <td style="padding:14px 14px 14px 8px;font-family:Arial,Helvetica,sans-serif;color:#3B2146;font-size:14.5px;line-height:1.5;text-align:left">
                <b>${title}</b><br><span style="color:#6B5A63">${text}</span>
              </td>
            </tr></table>
          </td>
        </tr></table>
      </div>`;
  const W = 680; // ancho del correo en computadora
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>Bienvenida al club de Rosalía</title></head>
<body style="margin:0;padding:0;background:#FFF1F7">
<div style="display:none;max-height:0;overflow:hidden">¡Te regalamos ${points} gatupuntos por unirte! 🐾</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF1F7">
  <!-- franja berenjena de lado a lado; la tarjeta blanca empieza encima -->
  <tr><td align="center" style="background:#3B2146;padding:30px 12px 0">
    <div style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:34px;color:#FFB3D0">Glow</div>
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:4px;color:#E9D6F0;padding-bottom:26px">BY ROSALÍA</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:${W}px;background:#FFFFFF;border-radius:28px 28px 0 0">
      <tr><td align="center" style="padding:30px 28px 8px">
        <img src="${FACE}" width="120" height="120" alt="Rosalía" style="display:block;border-radius:60px;border:0">
      </td></tr>
    </table>
  </td></tr>
  <tr><td align="center" style="padding:0 12px 28px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:${W}px;background:#FFFFFF;border-radius:0 0 28px 28px;overflow:hidden">
      <tr><td align="center" style="padding:14px 28px 6px">
        <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:34px;line-height:1.2;color:#3B2146">¡Holiiii, <i style="color:#D6357F">${first}</i>!</h1>
        <p style="margin:10px 0 0;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:19px;color:#6B5A63">Bienvenida al club de Rosalía 🐾</p>
      </td></tr>
      <tr><td align="center" style="padding:22px 36px">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#FFFBEF;border:2px solid #F0B429;border-radius:20px">
          <tr><td align="center" style="padding:20px 16px">
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:2px;color:#A8741A;font-weight:bold">TU REGALO DE BIENVENIDA</div>
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:52px;font-weight:bold;color:#3B2146;line-height:1.1;padding-top:4px">${points}</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#A8741A;font-weight:bold">gatupuntos 🧶</div>
            <div style="font-family:Arial,Helvetica,sans-serif;font-size:13.5px;color:#6B5A63;padding-top:8px">Ya están en tu cesto. ¡Junta 500 y canjéalos por S/ 5 de descuento!</div>
          </td></tr>
        </table>
      </td></tr>
      <tr><td align="center" style="padding:0 28px 4px">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:21px;font-weight:bold;color:#3B2146;padding:6px 0 4px">Lo que te espera en el club</div>
      </td></tr>
      <tr><td align="center" style="padding:0 20px 6px;font-size:0">
        ${perk("🧶", "Gatupuntos en cada compra", "Ganas 1.25 por cada S/ 1 y los canjeas por descuentos.")}${perk("💰", "Michi-crédito", "Al confirmar tu pago te devolvemos crédito para tu próxima compra.")}${perk("⭐", "Reseñas que premian", "Cuéntanos qué te pareció tu compra y gana hasta +60 gatupuntos.")}${perk("🎂", "Regalo de cumpleaños", "Agrega tu cumpleaños en Mi perfil y recibe +50 gatupuntos.")}${perk("🎁", "¡Sorpresas misteriosas!", "Canjea tus gatupuntos por un regalo sorpresa en tu pedido.")}${perk("📍", "Entrega gratis en Juliaca", "Y envíos por Shalom a todo el Perú.")}
      </td></tr>
      <tr><td align="center" style="padding:18px 28px 32px">
        <a href="${url}" style="display:inline-block;background:#FF3D8B;color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:17px;text-decoration:none;padding:15px 40px;border-radius:999px">Ir a la tienda 🐾</a>
        <p style="margin:20px 0 0;font-family:'Brush Script MT',cursive;font-size:24px;color:#D6357F">con cariño, Rosalía</p>
      </td></tr>
      <tr><td align="center" style="background:#FBF5F8;padding:18px 28px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#857C8A">
        Recibes este correo porque te uniste al club de Glow by Rosalía.<br>
        Si no quieres recibir novedades, apágalo en <a href="${url}" style="color:#742284">Mi perfil</a> → «Recibir novedades y ofertas».
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
  const text = `¡Holiiii, ${first}! Bienvenida al club de Rosalía.\n\nTe regalamos ${points} gatupuntos por unirte. Junta 500 y canjéalos por S/ 5 de descuento.\n\nIr a la tienda: ${url}\n\nCon cariño, Rosalía`;
  return { subject: `🐾✨ ¡Bienvenida al club de Rosalía, ${first}! 🎁 ${points} gatupuntos para ti 😻`, html, text };
}

export async function sendMail({ to, name, subject, html, text }) {
  if (!mailEnabled()) return { sent: false, reason: "sin configurar" };
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { email: process.env.MAIL_FROM, name: process.env.MAIL_FROM_NAME || "Glow by Rosalía" },
      to: [{ email: to, name: name || undefined }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(`Brevo ${r.status}: ${j.message || "error"}`);
  }
  return { sent: true };
}
