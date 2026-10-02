// Cliente de la API: el frontend habla con el backend (Express + Postgres)
// a través de estas funciones. En desarrollo, Vite redirige "/api" y "/uploads"
// al servidor (ver vite.config.js).

// El PIN del panel se recuerda en memoria mientras la sesión esté abierta y se
// envía en cada operación de escritura como cabecera "x-admin-pin".
let adminPin = "";
export function setAdminPin(pin) {
  adminPin = pin || "";
}

// Llave de sesión del cliente registrado (la entrega el servidor al entrar).
let customerToken = "";
export function setCustomerToken(t) {
  customerToken = t || "";
}
function customerHeaders() {
  return { "Content-Type": "application/json", "x-customer-token": customerToken };
}

function writeHeaders() {
  return { "Content-Type": "application/json", "x-admin-pin": adminPin };
}

async function handle(res) {
  if (!res.ok) {
    let msg = `Error ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json();
}

/* ---------- Autenticación ---------- */
export async function checkPin(pin) {
  const r = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  const { ok } = await handle(r);
  return ok;
}

/* ---------- Productos ---------- */
// prueba=true incluye las reseñas de pedidos de prueba (modo prueba).
export async function getProducts(prueba = false) {
  return handle(await fetch("/api/products" + (prueba ? "?prueba" : "")));
}

export async function createProduct(product) {
  return handle(
    await fetch("/api/products", {
      method: "POST",
      headers: writeHeaders(),
      body: JSON.stringify(product),
    })
  );
}

export async function updateProduct(id, product) {
  return handle(
    await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: writeHeaders(),
      body: JSON.stringify(product),
    })
  );
}

export async function deleteProduct(id) {
  return handle(
    await fetch(`/api/products/${id}`, {
      method: "DELETE",
      headers: writeHeaders(),
    })
  );
}

// Importa varios productos de una vez (inserta o actualiza por id).
// Devuelve { saved, products }.
export async function importProducts(products) {
  return handle(
    await fetch("/api/import", {
      method: "POST",
      headers: writeHeaders(),
      body: JSON.stringify({ products }),
    })
  );
}

/* ---------- Datos solo para la administradora ---------- */
export async function getAdminSettings() {
  return handle(await fetch("/api/admin/settings", { headers: writeHeaders() }));
}
export async function getAdminProducts() {
  return handle(await fetch("/api/admin/products", { headers: writeHeaders() }));
}

export async function getCustomers() {
  return handle(await fetch("/api/customers", { headers: writeHeaders() }));
}
export async function sendWelcomeMail(email, test = false) {
  return handle(await fetch("/api/customers/welcome", { method: "POST", headers: writeHeaders(), body: JSON.stringify({ email, test }) }));
}

/* ---------- Pedidos ---------- */
// items: [{ id, qty }]. capture: data URL de la captura del Yape.
export async function createOrder({ items, yapeOp, capture, test = false, reward = "", delivery = null, useCredit = false, payCheck = null }) {
  return handle(
    await fetch("/api/orders", {
      method: "POST",
      headers: customerHeaders(),
      body: JSON.stringify({ items, yapeOp, capture, test, reward, delivery, useCredit, payCheck }),
    })
  );
}

export async function deleteTestOrders() {
  return handle(await fetch("/api/orders/test", { method: "DELETE", headers: writeHeaders() }));
}

/* ---------- Clientes ---------- */
export async function getConfig() {
  return handle(await fetch("/api/config"));
}

export async function testLogin() {
  return handle(await fetch("/api/customers/test", { method: "POST" }));
}

export async function getMe() {
  return handle(await fetch("/api/me", { headers: customerHeaders() }));
}

export async function updateMe(profile) {
  return handle(await fetch("/api/me", { method: "PUT", headers: customerHeaders(), body: JSON.stringify(profile) }));
}

export async function getMyOrders() {
  return handle(await fetch("/api/me/orders", { headers: customerHeaders() }));
}

export async function getMyPoints() {
  return handle(await fetch("/api/me/points", { headers: customerHeaders() }));
}

export async function getMyCredits() {
  return handle(await fetch("/api/me/credits", { headers: customerHeaders() }));
}
export async function claimMyCredit(id) {
  return handle(await fetch(`/api/me/credits/${id}/claim`, { method: "POST", headers: customerHeaders() }));
}

export async function getMyReviews() {
  return handle(await fetch("/api/me/reviews", { headers: customerHeaders() }));
}
export async function createReview(review) {
  return handle(await fetch("/api/me/reviews", { method: "POST", headers: customerHeaders(), body: JSON.stringify(review) }));
}
export async function getProductReviews(id, prueba = false) {
  return handle(await fetch(`/api/products/${encodeURIComponent(id)}/reviews${prueba ? "?prueba" : ""}`));
}
export async function getAdminReviews() {
  return handle(await fetch("/api/admin/reviews", { headers: writeHeaders() }));
}
export async function setReviewStatus(id, status) {
  return handle(await fetch(`/api/admin/reviews/${id}`, { method: "PUT", headers: writeHeaders(), body: JSON.stringify({ status }) }));
}

export async function saveFavorites(favorites) {
  return handle(await fetch("/api/me/favorites", { method: "PUT", headers: customerHeaders(), body: JSON.stringify({ favorites }) }));
}

export async function getShalomAgencies(departamento) {
  return handle(await fetch("/api/shalom/agencies?departamento=" + encodeURIComponent(departamento)));
}

export async function googleLogin(credential) {
  return handle(
    await fetch("/api/customers/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    })
  );
}

export async function getOrders() {
  return handle(await fetch("/api/orders", { headers: writeHeaders() }));
}

export async function setOrderStatus(id, status) {
  return handle(
    await fetch(`/api/orders/${id}`, {
      method: "PUT",
      headers: writeHeaders(),
      body: JSON.stringify({ status }),
    })
  );
}

/* ---------- Ajustes ---------- */
// Estado del servidor (y dónde guarda las fotos).
export async function getHealth() {
  return handle(await fetch("/api/health"));
}

export async function getSettings() {
  return handle(await fetch("/api/settings"));
}

export async function updateSettings(settings) {
  return handle(
    await fetch("/api/settings", {
      method: "PUT",
      headers: writeHeaders(),
      body: JSON.stringify(settings),
    })
  );
}

export async function updateSeasons(seasons) {
  return handle(await fetch("/api/seasons", { method: "PUT", headers: writeHeaders(), body: JSON.stringify({ seasons }) }));
}

// Importar de Temu: el servidor trae las fotos y devuelve sus nuevas URLs.
export async function importImages(urls) {
  return handle(await fetch("/api/import-images", { method: "POST", headers: writeHeaders(), body: JSON.stringify({ urls }) }));
}

/* ---------- Imágenes ----------
   Recibe data URLs (ya comprimidas en el navegador) y devuelve las rutas
   públicas guardadas en el servidor, p. ej. ["/uploads/abc.jpg"]. */
export async function uploadImages(dataUrls) {
  const { urls } = await handle(
    await fetch("/api/upload", {
      method: "POST",
      headers: writeHeaders(),
      body: JSON.stringify({ images: dataUrls }),
    })
  );
  return urls;
}
