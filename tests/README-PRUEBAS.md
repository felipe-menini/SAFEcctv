# QA automatizada — SAFE Security Manager v1.8

## Regresiones de CCTV y aplicación integrada

Requieren Node.js, el paquete `playwright` y Chrome (o `SAFE_CHROMIUM` con la ruta de otro Chromium). No instalan dependencias ni acceden a los datos del usuario. En PowerShell, si Playwright no está en el proyecto, define `NODE_PATH` con el directorio `node_modules` donde esté disponible.

```powershell
node tests/build-planner.cjs --check
node tests/qa_cctv.cjs
node tests/qa_cctv_integration.cjs
```

- `qa_cctv.cjs`: 16 casos en editor independiente e integrado: doble clic, cotas reales, rectángulos, polígonos sin cruces, validación, deshacer, calibración, persistencia, imagen/opacidad 0%, teclado, Escape, navegación con Espacio y aislamiento de importación asíncrona entre proyectos.
- `qa_cctv_integration.cjs`: aplicación SAFE completa con iframe real, guardado del borrador y round trip de respaldo/importación con geometría e imagen a 0%. Reproduce los controles de paneles escritorio/móvil y proveedores de `qa_v19.py` mediante Node Playwright.
- Los fixtures usan almacenamiento aislado en memoria y bloquean las solicitudes HTTP externas. Se valida el contenido real del Blob de respaldo; **no certifican la descarga física**, la selección de carpeta ni la apertura mediante BAT. Chromium canceló la descarga física de Blob en este entorno.
- Los scripts Python originales se conservan sin modificaciones. No se ejecutaron aquí porque los intérpretes disponibles no tienen el módulo Python `playwright`; los escenarios v1.9 indicados se verificaron con el harness Node.

Para desarrolladores. Requiere Python 3, Playwright y Chromium instalado; para el PDF también `PyMuPDF`.

```bash
python tests/qa_v18.py
python tests/qa_pdf_v18.py
python tests/qa_proveedores.py
```

- `qa_v18.py` prueba navegación, plegado, confirmaciones UI, cámaras desplegables, distancias, edición y persistencia de paquetes en el estado, almacenamiento en ambos sentidos y reglas de movimiento/reserva.
- `qa_pdf_v18.py` genera un PDF real y verifica que el modo «Quiero X días» muestre GB calculados y no los días de un HDD no seleccionado, y que no se expongan los costos de proveedor.
- `qa_proveedores.py` prueba gestión de proveedores y el servidor opcional, incluyendo protección HTTP de directorios privados.

**Limitación de pruebas:** las políticas del navegador de este entorno bloquean navegar a `127.0.0.1`. Las pruebas de UI inyectan los archivos JS/HTML; la API del servidor se prueba por separado. La apertura BAT y el guardado completo desde Windows deben comprobarse en el equipo del usuario.
