# SAFE Security Manager — Especificación v1.8

## Arquitectura

- **Cliente:** HTML5, CSS y JavaScript sin framework ni dependencias externas obligatorias.
- **Persistencia local:** `localStorage` para ajustes, catálogo, proveedores, paquetes, borrador y cotizaciones. Exportar respaldo JSON antes de actualizar, y regularmente.
- **Servidor opcional:** `servidor_safe.py` (Python 3, librería estándar) escuchando exclusivamente en `127.0.0.1:8787`, para archivar PDF y JSON en `cotizaciones/` y directorio de proveedores en `proveedores/`.
- **PDF:** generador offline `pdf.js`, con logo, USD/UYU, subtotal, IVA correspondiente, total y condiciones; **excluye costos internos y fotos**.
- **Configuración comercial:** catálogo de equipos, IVA de productos, tasa de servicios y márgenes configurables. Los servicios se ofrecen inicialmente sin IVA, sujeto a validación fiscal profesional.

## Interfaz

Los paneles de Cotizador, Relevamiento, Paquetes, Grabación/Discos, Configuración y las listas de Catálogo, Proveedores e Historial tienen encabezados y flechas desplegables. Las confirmaciones usan la ventana modal corporativa `safeConfirm`, no `window.confirm()`.

### Relevamiento

La ficha del sitio y las fichas por cámara son parte del borrador y del presupuesto guardado. Cada cámara tiene identificación, tecnología, ubicación, **distancia desde NVR/DVR** (trayecto real en m), canalización, altura, toma, caja, observaciones y fotografía opcional comprimida. Las fichas individuales usan `<details>/<summary>`. El PDF del cliente solo puede contener un resumen, si se selecciona explícitamente.

**La calculadora de materiales fue retirada de la UI en v1.8**; la compra y venta de artículos sigue disponible manualmente desde Equipamiento y Catálogo.

### Paquetes comerciales

Cinco paquetes predeterminados editables y paquetes personalizados. Cada entrada lleva nombre, tipo, descripción y lista de productos con cantidad. Las modificaciones de predefinidos se guardan como sustituciones en `state.packages` con el mismo identificador; la acción **Restaurar original** elimina esa sustitución. El guardado de plantillas NO altera cotizaciones existentes y la aplicación del paquete pregunta antes de reemplazar artículos.

### Grabación y discos

- **Modo objetivo:** `days` («Quiero X días») → cantidad de GB necesaria; `capacity` («Tengo un disco») → días teóricos.
- **Modalidad:** grabación `continuous` (100% 24/7) o `motion` (porcentaje efectivo estimado, por defecto 30%).
- **Reserva técnica:** fija en 10%, no editable en la interfaz.
- **Fórmula:** `GB/día = cámaras × bitrate_Mbps × 1.000.000 / 8 × 86.400 / 1.000.000.000 × fracción_de_grabación`; `capacidad_necesaria = techo(GB/día × días / 0,9)`; `días = capacidad_GB × 0,9 / GB_por_día`.
- **Alerta:** estimaciones no garantizadas; bitrate real, audio, VBR y actividad alteran la retención. La microSD se calcula individualmente por cámara.
- **PDF:** refleja el modo elegido; en objetivo días muestra capacidad requerida, y en objetivo disco muestra días estimados.

## Privacidad y limitaciones

- El servidor limita HTTP al loopback, filtra rutas privadas `/cotizaciones` y `/proveedores` y valida origen en POST.
- Los JSON privados contienen costos, datos personales del cliente y fotos. No compartir fuera del equipo o de los respaldos seguros.
- No es multiusuario, no es software de facturación ni valida requisitos legales/tributarios. El navegador en modo `file://` y el servidor local usan orígenes de almacenamiento distintos.
- Si el navegador bloquea la consulta del dólar venta, la cotización UYU debe ingresarse manualmente y queda identificada.
