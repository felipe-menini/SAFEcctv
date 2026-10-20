# SAFE Security Manager v1.8 — Validaciones y puesta en marcha

## Pruebas realizadas

- `node --check`: validación sintáctica de `app.js`, `technical.js` y `pdf.js`.
- Playwright/Chromium: paneles desplegables, confirmaciones propias, relevamiento con cámara plegable, alta/eliminación y edición de paquetes predeterminados y personalizados.
- Capturas reales de UI `docs/relevamiento-v1.8.png`, `docs/paquetes-v1.8.png` y `docs/grabacion-v1.8.png`.
- Grabación: cuatro cámaras de 2 Mbps continuas y 500 GB → aproximadamente 5,21 días; 14 días → 1.344 GB estimados de capacidad antes de elegir un disco comercial; con grabación al 25% → unos 336 GB.
- Reserva técnica fija del 10%; grabación continua y por movimiento diferenciadas.
- PDF generado de 2 páginas, comprobado por extracción de texto con PyMuPDF, con la capacidad necesaria, aviso orientativo y sin costos internos. Ejemplo: `examples/Presupuesto-demostracion-v1.8.pdf`.
- Proveedores: pruebas de gestión y API local, protección de archivos privados y respaldo.

## Validación pendiente en tu Windows

1. Hacé un respaldo JSON de la versión anterior.
2. Descomprimí el ZIP en una carpeta nueva y abrí `INICIAR-COTIZADOR.bat`.
3. Verificá que funcione la flecha de cada módulo en las distintas pestañas.
4. Agregá dos cámaras en Relevamiento, cerrá/abrí sus fichas y cargá distancias. Guardá el presupuesto y recuperalo.
5. Editá un paquete comercial existente, guardalo y cerrá/reabrí el programa; verificá que persista.
6. En Grabación probá ambos cálculos y abrí el PDF de un cliente con la opción de resumen activada.
7. Si hay Python 3, verificá los JSON y PDF archivados en `cotizaciones/`. Si no, utilizá el respaldo manual.
8. Nunca envíes archivos JSON con costos internos o fotografías a clientes; compartí solo PDF.

La navegación automática real a `127.0.0.1` no fue posible por restricciones del entorno de pruebas; por eso no se afirma que la apertura Windows esté comprobada.
