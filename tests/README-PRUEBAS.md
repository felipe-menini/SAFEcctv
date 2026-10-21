# Pruebas servidor y Docker

Las pruebas nuevas y la ruta de ejecución están en [Despliegue Docker](../docs/DESPLIEGUE-DOCKER.md#actualizar-y-verificar). `test_server.py` usa datos temporales; `qa_docker.py` usa un proyecto Compose aislado y elimina únicamente su volumen. `qa_server.cjs` requiere un servidor fixture con clave de prueba generada vía SAFE_TEST_PASSWORD.

## Pruebas previas del editor y módulos

# QA automatizada — SAFE Security Manager v1.8

## Regresiones de CCTV y aplicación integrada

Requieren Node.js, el paquete `playwright` y Chrome (o `SAFE_CHROMIUM` con la ruta de otro Chromium). No instalan dependencias ni acceden a los datos del usuario. En PowerShell, si Playwright no está en el proyecto, define `NODE_PATH` con el directorio `node_modules` donde esté disponible.

```powershell
node tests/build-planner.cjs --check
node tests/qa_cctv.cjs
node tests/qa_cctv_integration.cjs
node tests/qa_packages.cjs
```

- `qa_cctv.cjs`: 16 casos en editor independiente e integrado: doble clic, cotas reales, rectángulos, polígonos sin cruces, validación, deshacer, calibración, persistencia, imagen/opacidad 0%, teclado, Escape, navegación con Espacio y aislamiento de importación asíncrona entre proyectos.
- `qa_cctv_integration.cjs`: aplicación SAFE completa con iframe real, guardado del borrador y round trip de respaldo/importación con geometría e imagen a 0%. Reproduce los controles de paneles escritorio/móvil y proveedores de `qa_v19.py` mediante Node Playwright.
- `qa_packages.cjs`: paquetes comerciales: alta desde cero con el editor (`+ Nuevo paquete`), nombre obligatorio, paquete con **precio propio y sin artículos del catálogo** (y el rechazo del editor cuando no hay precio ni artículos), alta desde los equipos del presupuesto, edición y **Restaurar original** de un predeterminado, baja de paquetes propios y predeterminados (con confirmación y cancelación), **Restaurar predeterminados**, **agregar un paquete sin reemplazar lo cargado** (línea `paquete (nombre)` al final) y **línea manual de paquete desde el Cotizador** (`+ Agregar paquete`). Cubre además los casos de paquetes de `qa_v18.py` (5 predeterminados, 2 paneles plegables y sustituciones en `state.packages`).
- Los fixtures usan almacenamiento aislado en memoria y bloquean las solicitudes HTTP externas. Se valida el contenido real del Blob de respaldo; **no certifican la descarga física**, la selección de carpeta ni la apertura mediante BAT. Chromium canceló la descarga física de Blob en este entorno.
- Los scripts Python originales se conservan como referencia. Se ejecutaron con Playwright de Python apuntando al Chrome del sistema (`SAFE_CHROMIUM`); en este equipo no se descargaron los navegadores de Playwright.

Para desarrolladores. Requiere Python 3, Playwright y Chromium instalado; para el PDF también `PyMuPDF`. Los scripts aceptan `SAFE_CHROMIUM` con la ruta de otro Chromium (igual que los QA de Node) y, si no se define, usan `/usr/bin/chromium`.

```bash
python tests/qa_v18.py
python tests/qa_pdf_v18.py
python tests/qa_proveedores.py
```

- `qa_v18.py` prueba navegación, plegado, confirmaciones UI, cámaras desplegables, distancias, almacenamiento en ambos sentidos y reglas de movimiento/reserva. En paquetes: 5 predeterminados con **Eliminar** en cada tarjeta, edición de un predeterminado con marca **EDITADO** y **Restaurar original**, **alta desde cero** con `+ Nuevo paquete`, alta desde los equipos del presupuesto, baja de un paquete propio y de un predeterminado (que queda como baja `{id,deleted:true}` en `state.packages`), imposibilidad de aplicar un paquete eliminado y **Restaurar predeterminados**. Suma el paquete con **precio propio sin artículos**, su aplicación **sumando al final sin reemplazar**, y la **línea manual de paquete desde el Cotizador** (`+ Agregar paquete`) con su precio final en la tabla de ítems. Regenera las capturas `docs/*-v1.8.png`.
- `qa_pdf_v18.py` genera un PDF real y verifica que el modo «Quiero X días» muestre GB calculados y no los días de un HDD no seleccionado, y que no se expongan los costos de proveedor.
- `qa_proveedores.py` prueba gestión de proveedores y el servidor opcional, incluyendo protección HTTP de directorios privados.

**Limitación de pruebas:** las políticas del navegador de este entorno bloquean navegar a `127.0.0.1`. Las pruebas de UI inyectan los archivos JS/HTML; la API del servidor se prueba por separado. La apertura BAT y el guardado completo desde Windows deben comprobarse en el equipo del usuario.

### Dibujo en HTTP de red local
- `node tests/qa_drawing.cjs`: 22 gestos reales (casa/terreno: arrastre, dos clics, Enter, cierre y doble clic; pared: dos vértices), standalone y bundle integrado. Sin polyfill de `crypto.randomUUID` en el fixture.
- `node tests/qa_drawing_hosts.cjs`: 12 gestos sobre hosts reales CCTV y presupuesto, iframe no seguro, persistencia aislada y UUID v4 válido. No conecta con datos reales; el host CCTV usa una API en memoria.
- `uuid.js` conserva `crypto.randomUUID` cuando existe y usa bytes de `crypto.getRandomValues` en HTTP LAN. Esto corrige las identidades del plano, NO convierte HTTP en transporte seguro; para proteger sesiones y datos use HTTPS.
- Después de cambiar fuentes: `node tests/build-planner.cjs` y `node tests/build-planner.cjs --check`.
