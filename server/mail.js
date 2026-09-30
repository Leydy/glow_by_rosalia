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
  const perk = (icon, title, text) => `
    <tr><td style="padding:8px 0">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
        <td width="44" valign="top" style="font-size:24px;line-height:1">${icon}</td>
        <td style="font-family:Arial,Helvetica,sans-serif;color:#3B2146;font-size:15px;line-height:1.5">
          <b>${title}</b><br><span style="color:#6B5A63">${text}</span>
        </td>
      </tr></table>
    </td></tr>`;
  const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bienvenida al club de Rosalía</title></head>
<body style="margin:0;padding:0;background:#FFF1F7">
<div style="display:none;max-height:0;overflow:hidden">¡Te regalamos ${points} gatupuntos por unirte! 🐾</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF1F7;padding:24px 12px">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:24px;overflow:hidden">
    <tr><td align="center" style="background:#3B2146;padding:28px 24px 64px">
      <div style="font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:30px;color:#FFB3D0">Glow</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:3px;color:#E9D6F0">BY ROSALÍA</div>
    </td></tr>
    <tr><td align="center" style="padding:0 24px">
      <img src="${FACE}" width="112" height="112" alt="Rosalía" style="display:block;margin-top:-56px;border-radius:56px;border:0">
    </td></tr>
    <tr><td align="center" style="padding:16px 28px 6px">
      <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.2;color:#3B2146">¡Holiiii, <i style="color:#D6357F">${first}</i>!</h1>
      <p style="margin:10px 0 0;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:18px;color:#6B5A63">Bienvenida al club de Rosalía 🐾</p>
    </td></tr>
    <tr><td align="center" style="padding:20px 28px">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#FFFBEF;border:2px solid #F0B429;border-radius:18px">
        <tr><td align="center" style="padding:18px 16px">
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:2px;color:#A8741A;font-weight:bold">TU REGALO DE BIENVENIDA</div>
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:44px;font-weight:bold;color:#3B2146;line-height:1.1;margin-top:4px">${points}</div>
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#A8741A;font-weight:bold">gatupuntos 🧶</div>
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6B5A63;margin-top:6px">Ya están en tu cesto. ¡Junta 500 y canjéalos por S/ 5 de descuento!</div>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:4px 32px 8px">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        ${perk("🧶", "Gatupuntos en cada compra", "Ganas 1.25 por cada S/ 1 y los canjeas por descuentos o una ¡sorpresa!")}
        ${perk("💰", "Michi-crédito", "Cuando confirmamos tu pago te devolvemos crédito para tu próxima compra.")}
        ${perk("⭐", "Reseñas que premian", "Cuéntanos qué te pareció tu compra y gana hasta +60 gatupuntos.")}
        ${perk("🎂", "Regalo de cumpleaños", "Agrega tu cumpleaños en Mi perfil y recibe +50 gatupuntos en tu mes.")}
        ${perk("📍", "Entrega gratis en Juliaca", "O envíos por Shalom a todo el Perú.")}
      </table>
    </td></tr>
    <tr><td align="center" style="padding:16px 28px 30px">
      <a href="${url}" style="display:inline-block;background:#FF3D8B;color:#FFFFFF;font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:16px;text-decoration:none;padding:14px 32px;border-radius:999px">Ir a la tienda 🐾</a>
      <p style="margin:18px 0 0;font-family:'Brush Script MT',cursive;font-size:22px;color:#D6357F">con cariño, Rosalía</p>
    </td></tr>
    <tr><td align="center" style="background:#FBF5F8;padding:16px 24px;font-family:Arial,Helvetica,sans-serif;font-size:11.5px;line-height:1.6;color:#857C8A">
      Recibes este correo porque te uniste al club de Glow by Rosalía.<br>
      Si no quieres recibir novedades, apágalo en <a href="${url}" style="color:#742284">Mi perfil</a> → «Recibir novedades y ofertas».
    </td></tr>
  </table>
</td></tr></table>
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
