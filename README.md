# Huellas Callejeras

Sitio con React y Vite. La interfaz HTML y sus scripts originales se conservan
temporalmente como una capa de compatibilidad mientras se migra el sitio a
componentes React.

## Estructura

- `src/pages`: contenido HTML original de las páginas.
- `src/scripts`: interacciones JavaScript existentes.
- `src/styles`: hojas de estilo.
- `public/img` y `public/db`: archivos estáticos que Vite copia a la compilación.
- `index.html` y `donaciones/donaciones.html`: puntos de entrada de Vite.
- `src/App.jsx` y `src/main.jsx`: aplicación y punto de entrada React.

## Desarrollo

```bash
npm install
npm run dev
```

La aplicación tiene dos páginas: la principal y
`/donaciones/donaciones.html`.

## Compilar para producción

```bash
npm run build
npm run preview
```

Para servirlo con XAMPP/Apache, copia el contenido de `dist` a la carpeta del
sitio. La compilación incluye ambas páginas y sus recursos.
