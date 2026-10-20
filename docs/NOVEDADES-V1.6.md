# SAFE Security Manager v1.6 — Nuevos módulos

## Alcance real implementado

| Componente | Funciones | Conexión con cotizador |
|---|---|---|
| Relevamiento | Inmueble, conectividad, electricidad, canalización, posición grabador, puntos con tipo, ubicación, cable m, canalización m, altura, tomas, cajas, notas, foto y ficha imprimible | Se guarda dentro de `quote.survey`; genera puntos a partir de equipos del presupuesto |
| Materiales | Faltante UTP, rollos óptimos, RJ45, cajas, tomas y metraje de canalización | Descuenta equipamiento actual, agrega líneas a `quote.items` y tareas a `quote.installTasks` |
| Paquetes | Cinco opciones predeterminadas; creación y borrado de propias; reuso del catálogo actualizado | Reemplaza equipos de presupuesto tras confirmación; mantiene cliente e instalación |
| Almacenamiento | NVR/DVR o SD, cámaras, codec, MP, Mbps, HDD, modo de grabación, reserva, días | Se guarda en `quote.storagePlan`; opcionalmente aparece en PDF |

## Decisiones de diseño

- Todos los apartados aparecen en navegación izquierda y se pueden abrir en cualquier orden.
- Los campos de relevamiento **no inventan medidas**: el recorrido inicia en 0 m, por lo que las advertencias piden ingresarlo.
- El catálogo sigue siendo la única fuente de costo de equipamiento. Los paquetes referencian SKU y los precios de venta se sugieren al aplicar, a partir del margen configurado.
- El PDF al cliente incluye opcionalmente un resumen textual del relevamiento y autonomía de grabación, pero **nunca imágenes del domicilio**.
- Relevamientos completos y fotos se archivan en el JSON privado, no en el PDF del cliente.
- Se advierte expresamente la cantidad NO CONFIRMADA de cámaras físicas en los kits DVR de 4 canales.
- El cálculo recomienda comprar rollos completos, no cantidades ficticias de metros que no coincidan con el precio del proveedor.
- La aplicación mantiene compatibilidad de respaldo con la v1.5, incluyendo el formato del archivo.

## Limitaciones intencionales

- No se cotizan automáticamente caños y canaletas (no hay precios de estos materiales en el catálogo).
- No se calcula caída de tensión específica PoE/UTP ni potencia de fuente analógica: falta conocer modelo, corriente, calibre, clase PoE y topología.
- No se confirma la duración de grabación: es una estimación basada en bitrate y porcentaje de actividad.
- Fotos comprimidas: máximo 15 por presupuesto, una por cámara. Son útiles para planificación, pero el JSON puede crecer. Si el navegador queda sin espacio, se muestra una alerta.
- Los paquetes propios se respaldan junto con el catálogo; no hay cuenta de usuario ni sincronización entre PCs.
- El botón Aplicar de los módulos actualiza borrador. **Guardar presupuesto** archiva el JSON; **Exportar PDF** archiva también un PDF cuando la modalidad local lo permite.

## Comprobaciones realizadas

- Renderizar cuatro vistas; generar puntos desde kit Tiandy; adjuntar y comprimir foto; edición y persistencia del relevamiento.
- Medidas 12+17+21+25 m, holgura 2 m por cámara, 10% de reserva ⇒ 92 m; el kit aporta 75 m ⇒ 17 m por cubrir ⇒ 1 rollo de 150 m.
- Agregar rollo y paquete RJ45 y recalcular: el faltante desaparece; no se duplican artículos al volver a abrir.
- Agregar 8 m de canalización como trabajo editable de instalación.
- Guardar plantilla propia, añadir paquete Tiandy y calcular 4 cámaras IP.
- HDD de 500 GB para 4 cámaras a 2 Mbps y reserva 10% ≈ 5,21 días; HDD 1 TB ≈ 10,42 días; meta de 14 días requiere ~1344 GB y recomienda 2 TB.
- Generar PDF de 2 páginas, con IVA de equipos y el anexo técnico opcional, sin costos internos ni datos de fotos.
- API local de archivo: guardar JSON, recuperar mediante `/api/presupuestos`, bloqueo de acceso directo a `cotizaciones/`, eliminar un registro de prueba.

Todos los archivos de prueba usan datos sintéticos. Se recomienda verificar instalación y ejecución mediante Windows en el equipo de destino.
