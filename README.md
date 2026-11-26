# Huellas Callejeras

Sitio con React y Vite. La interfaz HTML y sus scripts originales se conservan
temporalmente como una capa de compatibilidad mientras se migra el sitio a
componentes React.

## Estructura

- `src/pages`: contenido HTML original de las páginas.
- `src/scripts`: interacciones JavaScript existentes.
- `src/styles`: hojas de estilo.
- `public/img`: imágenes estáticas.
- `server`: API de Node.js, conexión MySQL, sesiones y esquema de base de datos.
- `index.html` y `donaciones/donaciones.html`: puntos de entrada de Vite.
- `src/App.jsx` y `src/main.jsx`: aplicación y punto de entrada React.

## Desarrollo

```bash
npm install
npm run dev
```

`npm run dev` inicia Vite y la API de Node.js. La aplicación tiene las páginas
principal y `donaciones/donaciones.html`; el panel está en `/admin/`.
Antes de iniciar por primera vez, completa la configuración de MySQL indicada
abajo.

## Panel de administración (Node.js y MySQL)

El panel usa sesiones seguras en el servidor y MySQL para usuarios, mascotas,
reportes, donaciones y mensajes. Para configurarlo con XAMPP:

1. Inicia **MySQL** desde el panel de XAMPP.
2. En phpMyAdmin, importa `server/schema.sql`; crea la base `huellas_callejeras`
   y sus tablas.
3. En PowerShell, copia `.env.example` a `.env` con `Copy-Item .env.example .env`
   y configura la conexión a MySQL. Cambia
   `SESSION_SECRET` por una clave aleatoria de al menos 32 caracteres (puedes
   generar una con `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`).
4. Ejecuta `npm install` una vez y luego `npm run create-admin` para crear la
   primera cuenta de administrador. La contraseña se solicita en la terminal y
   se guarda cifrada; no se puede registrar un administrador desde el sitio.
5. Ejecuta `npm run dev` y abre `http://localhost:5173/admin/`.

En las siguientes sesiones, inicia MySQL y ejecuta `npm run dev`; no necesitas
repetir `npm install`. Las cuentas registradas desde el sitio son usuarios
normales. Desde el panel puedes crear cuentas de entidad y usuarios. Los datos
que estaban guardados solo en el `localStorage` del navegador no se migran
automáticamente a MySQL.

## Compilar para producción

```bash
npm run build
```

En producción, configura las variables del archivo `.env`, incluyendo
`APP_ORIGIN` con el origen público exacto del sitio (por ejemplo,
`https://tudominio.com`), una base MySQL y HTTPS delante del servidor Node.
En desarrollo se permiten `localhost:5173` y `127.0.0.1:5173`. En PowerShell, inicia con
`$env:NODE_ENV="production"; npm run server`. Servir únicamente `dist` con
Apache no inicia la API ni habilita el acceso protegido al panel.
