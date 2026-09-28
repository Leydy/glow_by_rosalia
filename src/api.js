// Cliente de la API: el frontend habla con el backend (Express + Postgres)
// a través de estas funciones. En desarrollo, Vite redirige "/api" y "/uploads"
// al servidor (ver vite.config.js).

// El PIN del panel se recuerda en memoria mientras la sesión esté abierta y se
// envía en cada operación de escritura como cabecera "x-admin-pin".
let adminPin = "";
export function setAdminPin(pin) {
  adminPin = pin || "";
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
export async function getProducts() {
  return handle(await fetch("/api/products"));
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

/* ---------- Ajustes ---------- */
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
