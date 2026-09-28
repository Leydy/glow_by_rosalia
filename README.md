# Glow by Rosalía — App web

Tienda de cosméticos con catálogo para clientes (pedidos por WhatsApp) y panel
de administración (inventario, precios de compra/venta, control de stock y
ganancias). Hecha con React + Vite.

## Cómo ejecutarla

Necesitas Node.js 18 o superior.

```bash
npm install      # instala las dependencias (solo la primera vez)
npm run dev      # arranca el servidor de desarrollo
```

Abre la dirección que aparece en la terminal (normalmente http://localhost:5173).

Otros comandos:

```bash
npm run build    # genera la versión para publicar (carpeta dist/)
npm run preview  # previsualiza esa versión ya construida
```

## Cómo usarla

- **Tienda:** es lo que ven los clientes. Filtran por categoría, buscan y pulsan
  "Pedir por WhatsApp", que abre el chat con el pedido ya escrito.
- **Administración:** PIN por defecto **1234**. Desde ahí gestionas productos,
  stock y ves el resumen de ganancias. En **Ajustes** cambia tu número de
  WhatsApp real, el nombre de la tienda y el PIN.

Los datos se guardan en el navegador (localStorage), así que persisten entre
sesiones en ese mismo dispositivo.

## Estructura

```
src/
  main.jsx      Punto de arranque de React
  index.css     Estilos base y tipografías
  theme.js      Paleta de colores y formato de dinero
  data.js       Productos de ejemplo y ajustes por defecto
  App.jsx       Toda la app: Tienda + Administración
```

## Siguiente paso

Cuando quieras que el inventario sea central y compartido entre dispositivos,
se reemplaza el guardado en localStorage por llamadas a la API REST del backend
Spring Boot.
