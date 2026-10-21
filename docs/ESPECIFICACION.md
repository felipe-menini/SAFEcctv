# SAFE Security Manager — Especificación v1.8

## Arquitectura

- **Cliente:** HTML5, CSS y JavaScript sin framework ni dependencias externas obligatorias.
- **Persistencia local:** `localStorage` para ajustes, catálogo, proveedores, paquetes, borrador y cotizaciones. Exportar respaldo JSON antes de actualizar, y regularmente.
- **Servidor opcional:** `servidor_safe.py` (Python 3, librería estándar) escuchando exclusivamente en `127.0.0.1:8787`, para archivar PDF y JSON en `cotizaciones/` y directorio de proveedores en `proveedores/`.
- **PDF:** generador offline `pdf.js`, con logo, USD/UYU, subtotal, IVA correspondiente, total y condiciones; **excluye costos internos y fotos**. El selector **IVA desglosado / Solo total** del panel de exportación decide si el resumen muestra subtotal e IVA o únicamente el importe final con IVA incluido; si hay descuento, las líneas «Total previo» y «Descuento» se mantienen para que el importe cierre.
- **Configuración comercial:** catálogo de equipos, IVA de productos, tasa de servicios y márgenes configurables. Los servicios se ofrecen inicialmente sin IVA, sujeto a validación fiscal profesional.

## Interfaz

Los paneles de Cotizador, Relevamiento, Paquetes, Grabación/Discos, Configuración y las listas de Catálogo, Proveedores e Historial tienen encabezados y flechas desplegables. Las confirmaciones usan la ventana modal corporativa `safeConfirm`, no `window.confirm()`.

En el Cotizador solo «Datos del presupuesto» y «Equipamiento y materiales» arrancan abiertos: «Instalación técnica» y «Condiciones comerciales» quedan plegados y el navegador recuerda la última elección (`localStorage`, clave `safe.cotizadorPanels`). Dentro de «Instalación técnica», los bloques de valores, ayudantes, movilidad y otros gastos funcionan como acordeón con un solo bloque abierto; el bloque del modo elegido (automático, porcentaje o precio base) se abre solo al cambiar el modo. Los trabajos adicionales y el resumen del cálculo quedan siempre visibles. En la tarjeta del Catálogo se muestra únicamente «Proveedor: nombre» (sin ID ni otros metadatos).

### Equipamiento y materiales

El panel usa dos columnas en escritorio (catálogo a la izquierda, selección a la derecha con posición fija y scroll propio) y se apila en una sola columna por debajo de 1400 px. La selección muestra el resumen económico, los avisos de compatibilidad, las sugerencias de accesorios y la tabla compacta de ítems.

- **Tarjetas de producto:** imagen 4:3 con `object-fit: contain` y respaldo cuando falta la foto, marca y modelo deducidos del nombre más categoría, descripción recortada, proveedor, precio de venta final y botón **+ Agregar**. Cuando el costo está en otra moneda y no hay tasa de cambio, el precio se muestra como **A consultar** (el precio se define al agregar el producto).
- **Cantidades sin duplicar:** agregar un producto ya cargado suma cantidad a la línea existente. La tarjeta pasa a mostrar un control `−`/`+` y la etiqueta «En el presupuesto» en lugar del botón.
- **Filtros:** búsqueda por nombre, marca, modelo, código, descripción y proveedor; filtros de categoría, marca y proveedor; accesos rápidos **Todo / Favoritos / Recientes / Paquetes**; filtros avanzados por rango de precio de venta, con imagen, con proveedor y solo grabadores. El contador indica cuántos productos coinciden y **Limpiar filtros** restablece todo.
- **Favoritos y recientes:** se guardan por separado del catálogo en `localStorage` (`safe.catalogFavorites` y `safe.catalogRecent`). Marcar o desmarcar la estrella no modifica el producto ni el presupuesto.
- **Sugerencias de accesorios:** se calculan a partir del último equipo agregado que tenga accesorios asociados (`SUGGEST_MAP`) y sólo se suman cuando se toca la sugerencia; nunca se agregan solas. Excluyen lo que ya está en el presupuesto y priorizan el mismo proveedor.
- **Avisos de compatibilidad:** combinar kit analógico con equipos IP, cámaras sin grabador ni microSD, microSD sin cámaras y cableado sin cámaras. Son advertencias informativas: no bloquean ni alteran el cálculo.
- **Equivalentes:** productos del mismo tipo con la misma marca y primer token de modelo se agrupan; la tarjeta ofrece **comparar proveedores**, con precio de venta, diferencia contra el más barato y alta directa de cualquiera de ellos.
- **Tabla de ítems:** nombre con detalle, cantidad con control numérico y `−`/`+`, costo interno unitario (con IVA de compra, de sólo lectura cuando el costo está en UYU), precio de venta final editable y subtotal por línea. Editar la venta recalcula totales, IVA, PDF y el resumen lateral. Eliminar una línea actualiza todo de inmediato.
- **Resumen lateral:** total de equipos a precio de venta, costo interno de los equipos y total al cliente. Es informativo y se recalcula con los mismos helpers de siempre.
- **Lista de compras por proveedor:** documento interno agrupado por proveedor con costos internos y subtotales; no incluye precios de venta ni instalación y no se envía al cliente.
- **Paquetes:** el acceso rápido **Paquetes** lista las plantillas comerciales y las aplica sumando al presupuesto, sin reemplazar lo cargado.

No cambian fórmulas, márgenes, IVA, monedas ni persistencia: los ítems siguen guardando la venta neta y el costo neto, y la interfaz muestra el precio de venta con IVA y el costo con IVA de compra.

### Relevamiento

La ficha del sitio y las fichas por cámara son parte del borrador y del presupuesto guardado. Cada cámara tiene identificación, tecnología, ubicación, **distancia desde NVR/DVR** (trayecto real en m), canalización, altura, toma, caja, observaciones y fotografía opcional comprimida. Las fichas individuales usan `<details>/<summary>`. El PDF del cliente solo puede contener un resumen, si se selecciona explícitamente.

**La calculadora de materiales fue retirada de la UI en v1.8**; la compra y venta de artículos sigue disponible manualmente desde Equipamiento y Catálogo.

### Paquetes comerciales

Cinco paquetes predeterminados editables y paquetes personalizados. Cada entrada lleva nombre, tipo, descripción y lista de productos con cantidad. Las modificaciones de predefinidos se guardan como sustituciones en `state.packages` con el mismo identificador; la acción **Restaurar original** elimina esa sustitución. El guardado de plantillas NO altera cotizaciones existentes.

Alta y baja de paquetes: **+ Nuevo paquete** abre el mismo editor para armar una plantilla desde cero (nombre, tipo, descripción y artículos del catálogo, sin depender del presupuesto actual), con un máximo de 60 paquetes personalizados; el alta **desde los equipos del presupuesto** se conserva. **Eliminar** está disponible en todos los paquetes: los personalizados se quitan del estado y los predeterminados se registran como baja `{id,deleted:true}` en `state.packages`, porque la plantilla vive en el código. Mientras exista alguna baja, el encabezado muestra **Restaurar predeterminados** para volver al listado de fábrica sin tocar los paquetes propios.

Paquetes con precio propio: además de los artículos del catálogo, una plantilla puede llevar `price` (precio de venta obligatorio de este tipo de paquete) y `cost` (costo sin IVA, opcional: es lo que te cuesta a vos y el IVA de compra se agrega al analizarlo). La validación exige nombre y al menos un artículo del catálogo o un precio; un paquete sin artículos se muestra con su precio en la tarjeta y se agrega al presupuesto como una sola línea comercial `paquete (nombre)` con la descripción de la plantilla. Si la plantilla combina artículos y precio, primero entra la línea del paquete y después los equipos. El precio se carga como precio final y se guarda neto para el IVA, igual que el resto de los ítems; el costo se guarda tal como se carga, sin IVA.

Aplicar un paquete («Agregar paquete») SUMA al presupuesto actual, nunca reemplaza: no pide confirmación destructiva, respeta lo que ya estaba cargado y agrega las líneas al final del listado, de modo que todo lo que se cargue después quede listado debajo.

Línea manual desde el Cotizador: el botón **+ Agregar paquete** del panel de equipos abre un formulario corto (título, descripción, precio de venta y costo sin IVA opcional) y crea la misma línea `paquete (título)` sin pasar por la plantilla ni por el catálogo.

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
