# SAFE Security Manager v1.9 — Cotizador, herramientas técnicas y proveedores

Sistema local de presupuestos, relevamiento técnico, paquetes comerciales editables, estimación de grabación y gestión de proveedores para cámaras, redes e instalación. Funciona en Chrome/Edge, es editable, no requiere hosting ni librerías externas, y genera un PDF profesional en USD o UYU con logo SAFE Security. Conserva el catálogo, presupuestos de versiones anteriores, fichas técnicas, paquetes propios y proveedores, manteniendo los datos internos separados de lo que ve el cliente.


## Novedades v1.9 — diseño y acceso a respaldos

### Plano CCTV: imagen de referencia y medidas editables

- En **Diseño CCTV → Plano de fondo** (icono de imagen en la barra), carga un PNG, JPG o WebP de hasta 20 MB. La imagen se optimiza y se incluye en el plano, el borrador y los respaldos habituales.
- Ajusta **Opacidad del fondo**, de **0% a 100%**. El porcentaje se muestra junto al control; **Quitar fondo** también se puede deshacer. Usa **Calibrar** con una distancia conocida para obtener medidas reales.
- Con **Seleccionar**, haz **doble clic en una medida** de casa, terreno o pared. También puedes enfocar la etiqueta con Tab y pulsar Enter o Espacio. Introduce metros, con punto o coma decimal, y pulsa **Aplicar medida**.
- En un rectángulo se ajusta el lado y su opuesto sin perder los ángulos rectos ni la otra dimensión. En otras formas se conserva el inicio y dirección del lado y se mueve su extremo final: los lados vecinos pueden cambiar. No se permiten cruces de lados ni medidas inválidas. No cambia la calibración global ni mueve cámaras o recorridos independientes.
- **Deshacer** restaura la geometría anterior. La imagen y las medidas se conservan en JSON, SVG e informe técnico. Para mostrar más del fondo bajo una casa, también puedes reducir la intensidad del relleno de esa forma.

Desarrollo: `planner/` contiene las fuentes del editor; `planner/embedded-bridge.js` conserva su integración con SAFE. Después de editar el planificador, ejecuta `node tests/build-planner.cjs` para actualizar `planner-document.js`, usado por la aplicación principal. `node tests/build-planner.cjs --check` comprueba que ambas versiones coincidan.

- **Espaciado uniforme:** Relevamiento técnico, Paquetes comerciales, Grabación y discos y Proveedores separan sus paneles principales con **20 px en escritorio y 15 px en móvil**, igual que el Cotizador. Las fichas internas y los campos mantienen su distribución.
- **Proveedores → Guardado y respaldo:** incorporamos un segundo módulo desplegable que explica dónde se almacenan los proveedores y un botón **Descargar respaldo completo**. Descarga exactamente el mismo respaldo JSON integral que Configuración; incluye los proveedores y sus relaciones con el catálogo.
- **Sin cambios en los datos:** no se migran ni reescriben presupuestos, proveedores o precios para aplicar estos estilos. Se mantienen el PDF, el cálculo de IVA y los paquetes editables.

### Ubicación de archivos y respaldo

| Modo de uso | Proveedores | Presupuestos | Respaldo recomendado |
| --- | --- | --- | --- |
| `INICIAR-COTIZADOR.bat` + Python 3 | `proveedores/proveedores.json` | `cotizaciones/SAFE-....json` y PDF | Botón «Descargar respaldo completo» y copia de ambas carpetas |
| `index.html` abierto directamente | Navegador (almacenamiento local) | Navegador / descargas PDF | Exportar respaldo JSON antes de borrar datos del navegador o cambiar de equipo |
| Carpeta autorizada en Chrome/Edge | `cotizaciones/proveedores.json` en la carpeta elegida cuando se concede escritura | JSON y PDF bajo `cotizaciones/` | Exportar respaldo JSON y copiar la carpeta |

**Para importar:** Configuración → Respaldo de información → Importar respaldo JSON. La importación **reemplaza** el catálogo, proveedores, presupuestos y configuración; hacé un backup del estado actual antes de importar.

## Herramientas técnicas conectadas al presupuesto

### 1. Relevamiento técnico

- Datos del inmueble, grabador, alimentación y conectividad.
- Un punto por cámara en ficha desplegable, con ubicación, distancia desde NVR/DVR, canalización, altura, notas y fotografía opcional comprimida.
- Botón para crear puntos a partir de los equipos del presupuesto sin volver a cargarlos.
- Ficha de relevamiento imprimible y opción de incorporar un **resumen escrito** en el PDF (sin fotos).

### 2. Paquetes prediseñados y personalizados

- Cinco paquetes de ejemplo para empezar más rápido.
- Podés crear, editar y reutilizar tus propios paquetes, y editar los predeterminados (con opción de restaurarlos).
- La aplicación usa el precio de venta sugerido del catálogo al cargar cada kit.
- Antes de reemplazar productos existentes se solicita confirmación.

### 3. Grabación y discos

- Estimación por cantidad de cámaras, bitrate, códec, espacio útil, HDD y modalidad de grabación.
- Elegí entre «Quiero X días» para calcular GB necesarios, o «Tengo un disco» para estimar días de grabación.
- Dos modalidades: grabación continua 100% y por movimiento con porcentaje efectivo estimado. Reserva técnica del 10% predeterminada.
- Resultado orientativo: depende de movimiento, compresión, configuración y bitrate real.
- Podés incluir el resumen en el PDF del cliente, opcionalmente.

## Nuevo v1.8 — Proveedores

En el menú lateral, **Administración → Proveedores**:

1. Hacé clic en **Nuevo proveedor** y cargá **nombre comercial** (obligatorio), **página web**, contacto, teléfono/WhatsApp, correo, dirección, marcas y observaciones.
2. Presioná **Crear proveedor**. El registro aparece como tarjeta con la información y el botón **Ir al proveedor**, que abre el enlace en una nueva pestaña.
3. Podés **buscar por nombre, contacto, marcas o ciudad**, ordenar, editar o eliminar.
4. Desde **Catálogo y precios → Editar producto** podés elegir un proveedor vinculado, de forma opcional. La asociación no cambia los costos ni los precios de venta.
5. La lista se guarda automáticamente en el navegador. Con `INICIAR-COTIZADOR.bat` **y Python 3**, se crea también la carpeta privada `proveedores/proveedores.json`, que se recupera al volver a iniciar desde la misma carpeta.
6. El respaldo de **Configuración → Descargar respaldo JSON** incluye proveedores y la asociación producto–proveedor. Los respaldos de versiones antiguas se pueden importar: si no incluyen proveedores, el directorio queda vacío.

**Seguridad:** únicamente se admiten enlaces web HTTP/HTTPS, nunca scripts ni `javascript:`. El servidor local bloquea la descarga directa de `proveedores/` por URL. Las notas del proveedor y sus datos de contacto **no** se agregan al PDF del cliente. No guardar contraseñas ni claves de acceso en el directorio.

## Inicio recomendado en Windows

1. **Descomprimí todo el ZIP**. No ejecutes el HTML dentro del ZIP.
2. Ejecutá **`INICIAR-COTIZADOR.bat`**. Si tenés Python 3, inicia automáticamente el servidor en `http://127.0.0.1:8787/`, abre el navegador y guarda archivos en `cotizaciones/`.
3. Mantené abierta la ventana de la consola mientras usás el programa. Cerrarla detiene el servidor, **no elimina los archivos**.
4. Si no está instalado Python 3, el .bat abre `index.html` en modo navegador. El cotizador y la descarga del PDF siguen funcionando. En **Mis presupuestos → Seleccionar carpeta**, Chrome/Edge pueden guardar el PDF y el JSON en una subcarpeta `cotizaciones/` de la carpeta que autorices. En modo carpeta seleccionada, se guarda también `cotizaciones/proveedores.json` cuando el permiso de escritura está concedido. Si esa opción no está disponible, los PDF se descargan normalmente y el historial y proveedores quedan en el navegador.
5. Completá los datos comerciales y el logo en **Configuración**.

> Para iniciar en Linux/macOS, ejecutá `python3 servidor_safe.py` desde la carpeta del proyecto. El servidor usa solo la biblioteca estándar de Python 3 y escucha **exclusivamente en 127.0.0.1**, sin publicar cotizaciones en Internet.

## Guardado real en carpeta

- **Guardar presupuesto:** añade o actualiza la cotización en el historial del navegador y, con el servidor local o una carpeta autorizada, en `cotizaciones/SAFE-0001-Cliente.json`.
- **Exportar PDF al cliente:** además de descargar el PDF, guarda `cotizaciones/SAFE-0001-Cliente-USD.pdf` (o `-UYU.pdf`) y actualiza el JSON de esa cotización.
- **Recuperación:** al usar el servidor local, la lista de *Mis presupuestos* se reconstruye desde los JSON aunque limpies los datos del navegador. En modo carpeta seleccionada, el sistema recupera los JSON al elegir la carpeta.
- **Importante:** el archivo **JSON contiene los costos internos, márgenes y observaciones privadas**. No se lo envíes al cliente; compartí únicamente el PDF.
- El botón **Exportar respaldo JSON** de Configuración sigue disponible y respalda **toda la aplicación** (catálogo, proveedores, paquetes, ajustes, historial y borrador).
- La carpeta `cotizaciones/` está incluida en el proyecto con un LEEME. No contiene cotizaciones reales al instalar.

Los archivos en esta carpeta quedan en tu computadora, no en la nube. Hacé copias de respaldo periódicas en una ubicación distinta, especialmente antes de reinstalar Windows o cambiar de equipo.

## Precios e IVA (v1.5)

**Los precios que aparecen en el cotizador son finales**: no es necesario sumarle IVA en la pantalla. Se eliminó el texto repetido “IVA incl.” en las tarjetas, encabezados, campos y totales. Los costos de compra se visualizan también como costo final en USD o UYU. Los USD iniciales del proveedor fueron informados antes de IVA, por lo que internamente se conserva la base y se muestra el costo final.

- **Equipamiento:** el IVA de venta comienza en 22%, incorporado al precio sugerido. El precio de venta inicial se calcula con un margen comercial sugerido de 35% sobre la venta neta, editable en Configuración. El detalle de IVA se obtiene desde los importes finales, **sin sumarlo por segunda vez**.
- **Instalación y otros servicios:** tienen por defecto **tasa de IVA de 0%** a pedido del usuario; el precio ya indicado por instalación no cambia al pasar de v1.4 a v1.5. Incluye ayudantes, transporte, viáticos y trabajos adicionales. La tasa de servicios es editable en Configuración por si necesitás modificar el tratamiento.
- **Descuentos:** se prorratean proporcionalmente entre equipamiento y servicios para ajustar correctamente el IVA de los equipos.
- **PDF del cliente:** muestra importes unitarios y finales, subtotal sin IVA, IVA **únicamente de equipamiento** (si el servicio tiene tasa cero) y total final; no incluye costos internos ni rentabilidad. En el renglón de instalación dice “Sin IVA”.

**Advertencia fiscal:** que el programa pueda cotizar la instalación con tasa 0% **no significa que esa operación esté exonerada legalmente**. Confirmá con tu contador qué corresponde facturar según tu actividad y régimen en Uruguay antes de usarlo como documento tributario. Es un **presupuesto comercial**, no una factura electrónica.

## Presupuestar una instalación

1. En **Datos del presupuesto** indicá cliente, dirección y validez.
2. En **Equipamiento y materiales** elegí kits WiFi EZVIZ, HiLook/Hikvision/Dahua DVR, Tiandy IP/NVR, microSD, cable UTP, fichas RJ45 y accesorios. También podés crear productos personalizados.
3. En **Instalación técnica** elegí cálculo automático por cámaras, porcentaje o manual. Ajustá dificultad, cantidad de ayudantes, movilidad y trabajos adicionales.
4. En **Condiciones comerciales** configurá seña, plazos, alcance, exclusiones, garantía y descuentos.
5. Los **cuatro módulos se pliegan**. El botón **Aplicar cambios** actualiza el borrador; **Guardar presupuesto** lo incorpora al historial y, en modo carpeta, lo archiva como JSON.
6. En la barra derecha elegí PDF en **USD** o **UYU** y presioná **Exportar PDF al cliente**.

## Tipo de cambio UYU

Se consulta `https://uy.dolarapi.com/v1/cotizaciones/usd` y se utiliza el campo **`venta`** (referencia BROU publicada por DolarAPI). Se registra la fecha de actualización. Si falla la consulta, el programa requiere una cotización **manual confirmada en el día** y la identifica así en el PDF. La consulta en vivo necesita conexión y disponibilidad del proveedor; **el programa no inventa el tipo de cambio**.

## Catálogo inicial

18 artículos: 4 EZVIZ WiFi, 3 microSD, 4 kits analógicos (Dahua, HiLook, HiLook ColorVu, Hikvision ColorVu), 2 Tiandy IP con NVR y HDD, 2 rollos UTP Cat 5e, caja de 100 RJ45, enchufe/toma UYU 90, caja estanca chica UYU 85. Se mantienen las especificaciones originales; verificá con tu proveedor cuántas cámaras incluyen realmente los kits analógicos.

## Actualización desde versiones anteriores

- Antes de actualizar, **exportá el respaldo JSON** desde la versión anterior.
- Si pasás de abrir `index.html` (`file://`) a `http://127.0.0.1:8787/`, el almacenamiento del navegador será distinto: importá ese respaldo desde **Configuración** para recuperar catálogo, presupuestos y ajustes.
- El formato JSON de respaldo y los precios internos de v1.4, v1.5 y v1.8 continúan siendo compatibles.
- Los PDF de `examples/` son **demostraciones**. La tasa de cambio UYU utilizada para pruebas no es necesariamente la cotización del día.

## Organización del proyecto

| Archivo | Función |
|---|---|
| `index.html`, `styles.css`, `app.js` | Interfaz y cálculos |
| `pdf.js` | PDF profesional generado íntegramente en el navegador |
| `assets/` | Logo y piezas gráficas SAFE Security |
| `servidor_safe.py` | Servidor local para guardar y recuperar cotizaciones de la carpeta (sin dependencias) |
| `INICIAR-COTIZADOR.bat` | Iniciador principal Windows (servidor automático o modo sin Python) |
| `cotizaciones/` | PDFs para cliente y JSON de presupuestos internos |
| `proveedores/` | Archivo privado `proveedores.json` en modo servidor local |
| `technical.js` | Cuatro herramientas técnicas |
| `tests/` | Pruebas de los módulos, proveedores y PDF |
| `examples/` | PDFs demostrativos en USD/UYU |
| `docs/` | Capturas y notas técnicas |

No hay usuarios, autenticación, hosting ni sincronización entre varias computadoras. El servidor escucha **solo la propia PC**. Resguardá especialmente los JSON internos.


## Novedades de v1.8

- Los paneles de Cotizador, Configuración y pantallas técnicas se pliegan y despliegan por encabezado o flecha.
- Las confirmaciones sensibles son ventanas UI personalizadas de SAFE Security (cancelación y confirmación). Ya no se usan confirmaciones nativas de JavaScript.
- Relevamiento: botón «Agregar cámara» y cada cámara se guarda como ficha individual desplegable, con campo «Distancia desde NVR/DVR (m)». Las distancias no se estiman automáticamente.
- Se retiró la Calculadora de materiales del menú y de los accesos rápidos. Los materiales siguen pudiéndose agregar al presupuesto manualmente, desde el catálogo.
- Paquetes: editar nombre, tipo, descripción, productos y cantidades de todos los paquetes; los predefinidos mantienen opción Restaurar original. Botón de guardado corregido para pantallas pequeñas.
- Grabación: dos objetivos de cálculo, continuidad al 100% o movimiento estimado, reserva fija del 10%, aviso de cálculo no garantizado. El PDF comercial distingue entre capacidad necesaria y autonomía según el modo elegido.
- Copias de versiones anteriores: exportá un respaldo JSON antes de actualizar. El historial seguirá usando la clave de almacenamiento anterior para conservar las cotizaciones en el mismo navegador/origen. No abras dos versiones simultáneamente sobre los mismos archivos.

### Privacidad y limitaciones
Los PDF comerciales no contienen costo del proveedor. Los JSON de respaldos sí contienen costos, datos de clientes y fotos, por lo que deben permanecer privados. La cotización UYU depende de la tasa de cambio consultada o confirmada manualmente; este desarrollo no requiere nube.


## Integración de planos CCTV y modo oscuro

- El modo oscuro está activo inicialmente. El botón de la barra superior alterna claro/oscuro y conserva la preferencia en este navegador. También se aplica al editor; los PDF mantienen su presentación de impresión.
- Abrí **Herramientas técnicas → Plano CCTV**. El plano pertenece al presupuesto activo y se guarda automáticamente en su borrador. Usá **Guardar presupuesto** para incluirlo en el historial, archivos locales y respaldo JSON habitual. Cada presupuesto tiene su plano independiente.
- Importá una imagen PNG/JPG/WebP como fondo, calibrá dos puntos con su distancia real, dibujá paredes y ubicá cámaras. **NVR** coloca el grabador; **Cablear** selecciona una cámara, marca giros y termina con Enter.
- **Pasar al relevamiento** crea/actualiza puntos vinculados, manteniendo puntos manuales, fotos y notas. Revisa IP/WiFi/analógico, subidas, bajadas y holgura. Al eliminar una cámara del plano y volver a transferir, desaparece su punto vinculado.
- **Materiales / cotizador** agrega cantidades explícitas del catálogo con los precios y reglas de SAFE. Un kit es una unidad de kit. Revisá materiales pendientes del relevamiento para aprovechar cable y accesorios incluidos en kits. El plano no usa precios genéricos para modificar tu presupuesto.
- **Informe del plano** imprime un anexo técnico con cliente y número del presupuesto, sin costos ni márgenes internos. Los importes y las condiciones se exportan con el PDF comercial existente de SAFE.
- El editor está aislado para que sus estilos no alteren el cotizador. Funciona con el iniciador habitual o con index.html directo, sin nuevas dependencias ni servicios externos.


### Editor CCTV: controles de ángulo y pantalla completa

- Paleta azul y superficies de SAFE, en claro y oscuro.
- Seleccioná una cámara y arrastrá ↻ para orientarla; los dos controles ↔ ajustan su campo de visión. Los valores exactos y las aperturas de 60°, 90° y 110° están en Propiedades. La cámara se mueve desde su cuerpo.
- **Pantalla completa** está disponible en la barra de SAFE y dentro del editor. **Esc** o **Salir de pantalla completa** vuelve a la vista normal. Si el navegador no admite fullscreen, la vista ampliada ocupa toda la ventana.
- Los botones **Herramientas** y **Propiedades** ocultan los paneles para ampliar el plano. La edición conserva el mismo presupuesto y guardado automático. Los controles auxiliares no se incluyen en el informe ni en el SVG exportado.


### Editor con plano a todo el ancho

- La barra flotante concentra selección, terreno, casa, pared, cámara, grabador, cable y opciones. No hay columnas laterales permanentes.
- **Cámaras** abre los cuatro modelos; seleccioná uno y hacé clic en el plano. **Opciones** agrupa el fondo, calibración, capas, cableado e importación del proyecto. Los menús se cierran con × o Esc.
- Un clic izquierdo en una cámara abre su inspector flotante. Doble clic también lo abre y enfoca su nombre. Un clic en el fondo o × lo cierra; la cámara conserva sus controles sobre el plano.
- El inspector no achica el área de dibujo. Los campos de ángulo y alcance mantienen su guardado en el mismo presupuesto.
- Se reemplazó la pila de estilos anteriores por una única hoja del editor, con tipografía del sistema y controles adaptables sin scroll horizontal de herramientas.


### Casa y terreno: dibujo guiado

- Elegí **Rectángulo** y arrastrá entre dos esquinas opuestas, o hacé dos clics. Las medidas se ven antes de terminar.
- **Forma libre** permite marcar esquinas. Cerrá haciendo clic cerca del primer punto, con Enter, doble clic o con el botón Cerrar forma. No se duplica el primer vértice.
- **Shift** al marcar o mover esquinas alinea en horizontal/vertical. Con Ajustar a cuadrícula activo, las esquinas cercanas de otras formas encajan exactamente. El cierre sobre el primer punto funciona con o sin cuadrícula.
- **Retroceso** o **Ctrl+Z** durante el dibujo quita la última esquina; **Esc** cancela la forma sin borrar elementos existentes. Las figuras de área cero, vértices repetidos o lados cruzados no se guardan.
- Al editar un vértice, se usa su posición absoluta para evitar saltos por redondeo. Si el movimiento cruzaría los lados, se restaura la posición anterior.


### Lienzo navegable y colores

- El lienzo admite coordenadas negativas y positivas sin bordes de trabajo. Arrastrá con Espacio, botón central o la herramienta Mover. La rueda acerca/aleja sobre el cursor; Shift + rueda desplaza horizontalmente. No se agregan barras de desplazamiento al plano.
- Los botones + y − mantienen el centro de la vista. El botón ⌖ encuadra todos los objetos, incluidos los que quedan fuera de la vista inicial.
- Seleccioná una casa o terreno para elegir relleno, borde e intensidad. El estilo se guarda en el presupuesto, respaldo JSON, plano SVG e informe. Restaurar color original vuelve a los valores anteriores.
- La navegación no altera posiciones, dimensiones ni precios. El informe y SVG encuadran el plano completo, aunque dibujes lejos del origen.
