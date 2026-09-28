# Guía: base de datos Postgres + subida de imágenes 🐱

Tu tienda ahora guarda los productos y los ajustes en una **base de datos
Postgres** (en la nube) y las **imágenes como archivos** en el servidor, en lugar
de quedarse solo en el navegador. Sigue estos pasos una sola vez.

---

## 1) Crear la base de datos gratis (Neon)

1. Entra a **https://neon.tech** y crea una cuenta (puedes usar tu Google).
2. Crea un proyecto (botón **Create project**). Nombre: `glow`. Región: la más
   cercana a ti.
3. Cuando termine, te muestra una **Connection string** (botón **Connect**).
   Cópiala completa. Se ve parecida a esto:

   ```
   postgresql://glow_owner:abc123XYZ@ep-cool-name-12345.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

> ¿Prefieres Supabase? Funciona igual: Project Settings → **Database** →
> **Connection string (URI)**. Pega esa URL en el paso siguiente.

---

## 2) Configurar el proyecto

1. En la carpeta `server/`, copia el archivo `.env.example` y renómbralo a
   **`.env`** (sin `.example`).
2. Ábrelo y pega tu URL después de `DATABASE_URL=`. Debe quedar así:

   ```
   DATABASE_URL=postgresql://glow_owner:abc123XYZ@ep-cool-name-12345.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

3. Guarda el archivo.

> ⚠️ El archivo `.env` **nunca** se comparte ni se sube a internet: contiene la
> clave de tu base. Ya está protegido en `.gitignore`.

---

## 3) Arrancar la tienda

Abre una terminal en la carpeta del proyecto y ejecuta **una** de estas opciones:

### Opción A — todo junto (recomendado)

```bash
npm run start
```

Esto enciende a la vez el **servidor** (puerto 3001) y la **web** (puerto 5173).
La primera vez, el servidor crea las tablas y carga tus 8 productos de ejemplo.

Luego abre en tu navegador: **http://localhost:5173**

### Opción B — en dos terminales

```bash
# Terminal 1: el servidor + base de datos
npm run server

# Terminal 2: la web
npm run dev
```

---

## 4) Usar el panel y subir imágenes

1. En la web, entra a **Administración** (arriba a la derecha).
2. PIN inicial: **1234** (cámbialo en la pestaña **Ajustes**).
3. Pulsa **Agregar** o el lápiz de un producto.
4. En **Imágenes del producto** → botón **Subir imágenes**: elige las fotos
   desde tu computadora o celular. Se suben al servidor y se guardan en la
   carpeta `server/uploads/`. La base de datos solo guarda la ruta.
5. **Guardar**. ¡Listo! La foto ya aparece en la tienda.

---

## ¿Qué hace cada parte?

| Carpeta / archivo        | Para qué sirve                                            |
| ------------------------ | -------------------------------------------------------- |
| `server/index.js`        | El servidor: API de productos, ajustes e imágenes.       |
| `server/db.js`           | Conexión a Postgres y creación de las tablas.            |
| `server/.env`            | Tu URL secreta de la base de datos.                      |
| `server/uploads/`        | Las fotos subidas (se guardan aquí como archivos).       |
| `src/api.js`             | El puente entre la web y el servidor.                    |

### Tablas en Postgres

- **products** — un producto por fila (nombre, categoría, costo, precio, stock,
  emoji, "más vendido", lista de imágenes y descripción).
- **settings** — una sola fila con los ajustes de la tienda (nombre, WhatsApp,
  PIN, alerta de stock bajo, logo, eslogan).

---

## Notas importantes

- **Migrar tus datos viejos del navegador**: si ya tenías productos o ajustes
  guardados en este navegador (la versión anterior de la tienda), entra a
  **Administración** desde **ese mismo navegador**. Arriba aparecerá un aviso con
  el botón **Importar de este navegador**. Un clic y todo pasa a Postgres:
  - Los **productos** (con sus fotos; las que estén en base64 se suben solas como
    archivos).
  - Los **ajustes**: nombre de la tienda, número de WhatsApp, PIN, logo y eslogan.

  Hazlo una sola vez. Si usabas la tienda en otra computadora o celular, repite
  el paso en cada uno. **Ojo:** si migras los ajustes y tu PIN viejo era distinto
  de `1234`, a partir de ahí el panel pedirá ese PIN viejo.
- **Seguridad**: los cambios del panel piden el PIN. Es una protección básica,
  pensada para una tienda personal. Si algún día publicas la tienda abierta a
  internet, conviene reforzarla con un login real antes de exponerla.
- **Publicar online (más adelante)**: el frontend (`npm run build`) puede ir a
  Vercel/Netlify y el servidor a Render/Railway. La base ya está en la nube
  (Neon), así que ese paso es directo cuando lo necesites.
