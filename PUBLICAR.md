# Publicar Glow by Rosalía gratis (Render + Neon + Cloudinary)

Tu tienda quedará en una dirección como **https://glow-by-rosalia.onrender.com**
(sin comprar dominio) y tu panel en **https://glow-by-rosalia.onrender.com/#admin**.

| Pieza | Servicio gratis |
|---|---|
| Tienda + API | Render |
| Base de datos | Neon (la que ya usas) |
| Fotos | Cloudinary |

> Plan gratis de Render: si nadie entra en ~15 minutos el servidor «se duerme»
> y la siguiente visita tarda unos 30–60 segundos en abrir. Después va normal.

---

## 1) Cloudinary (fotos) — una sola vez

1. Crea tu cuenta gratis en **https://cloudinary.com**.
2. En el **Dashboard** copia la **API Environment variable**. Se ve así:
   `cloudinary://123456789012345:abcDEF...@tu-cloud-name`
3. En tu computadora, pégala en `server/.env`:
   ```
   CLOUDINARY_URL=cloudinary://123456789012345:abcDEF...@tu-cloud-name
   ```
4. Pasa tus fotos actuales a Cloudinary (una sola vez):
   ```
   npm run migrar-fotos
   ```
   Verás cada foto con ✓. Desde ahora, las fotos nuevas también van a Cloudinary.

## 2) Antes de publicar

- **Cambia tu PIN** del panel (Ajustes) por uno que no sea `1234`.
- **Borra los datos de prueba**: Panel → Pedidos → «Borrar pedidos de prueba».
- Sube el código a GitHub (el archivo `server/.env` **nunca** se sube).

## 3) Render (la tienda) — una sola vez

1. Crea tu cuenta gratis en **https://render.com** entrando con tu GitHub.
2. **New → Blueprint** y elige el repositorio `glow_by_rosalia`.
   Render lee el archivo `render.yaml` y arma todo solo.
3. Te pedirá estas claves (cópialas de tu `server/.env`):
   - `DATABASE_URL` → la de Neon
   - `CLOUDINARY_URL` → la de Cloudinary
   - `GOOGLE_CLIENT_ID` y `SHALOM_API_KEY` → déjalas vacías si aún no las tienes
4. **Apply**. En unos minutos tu tienda estará en `https://glow-by-rosalia.onrender.com`.

Cada vez que se suba código nuevo a GitHub, Render actualiza la tienda solo.

## Qué cambia al publicar

- El **modo prueba** queda apagado (`TEST_MODE=off`): `?prueba` no funciona y
  nadie puede crear pedidos de prueba.
- Tu computadora sigue funcionando igual con `npm run start` para probar cosas.
