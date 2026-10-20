# SAFE Security Manager v1.7 — Proveedores y cierre de las cuatro herramientas

## Alcance

- Relevamiento técnico, calculadora de materiales, paquetes comerciales y calculadora de almacenamiento funcionales y asociados a los presupuestos (v1.6).
- Apartado **Proveedores** para registrar nombre, enlace web, contacto, teléfono, correo, dirección, marcas y notas (v1.7).
- Tarjetas, filtro, orden, editar, borrar, botón «Ir al proveedor», asociación opcional con productos del catálogo.
- Respaldo JSON de proveedores y recuperación en servidor local desde `proveedores/proveedores.json`.
- Enlaces HTTP/HTTPS; sin exponer contactos o anotaciones de proveedor en el PDF.

## Validación

- `tests/qa_regression.py`: cálculos materiales, relevamiento con fotos, paquetes, autonomía HDD, PDF y privacidad.
- `tests/qa_proveedores.py`: formulario completo, validación de URL, edición, búsqueda, enlace seguro, asociación a producto, respaldo y no aparición en PDF; pruebas API local, carpeta privada y bloqueo de orígenes ajenos.
- `python -m py_compile servidor_safe.py` y `node --check app.js`.
- La ejecución de Chromium con navegación a servidor localhost puede estar bloqueada en algunos entornos; la interfaz se comprobó mediante inyección local, el servidor por peticiones HTTP y quedan las pruebas de apertura Windows pendientes en el equipo de destino.

## Compatibilidad

Importar un respaldo v1.5/v1.6 preserva cotizaciones y productos; si no contiene la clave `suppliers`, se usa directorio vacío. No hay proveedores precargados ni credenciales.
