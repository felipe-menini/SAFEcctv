# Dónde se guardan los datos — SAFE Security Manager v1.9

## Forma recomendada de uso

Descomprimí el proyecto y ejecutá `INICIAR-COTIZADOR.bat` en Windows. Si Python 3 está instalado, el programa abre el servidor privado `http://127.0.0.1:8787/`.

- `proveedores/proveedores.json`: directorio completo de proveedores en el disco.
- `cotizaciones/SAFE-NNNN-Cliente.json`: cotización editable, relevamiento (incluidas fotos comprimidas), costos y datos internos.
- `cotizaciones/SAFE-NNNN-Cliente-USD.pdf` o `...-UYU.pdf`: PDF del cliente.
- Paquetes, preferencias, catálogo y borrador también se conservan en el almacenamiento local del navegador; por ello **copiar solo estas carpetas NO es un respaldo integral**.

En modo `index.html` directamente, los datos se almacenan en el navegador. Si seleccionás una carpeta en «Mis presupuestos», los archivos se guardan dentro de `cotizaciones/` de esa carpeta y los proveedores pueden guardarse en `cotizaciones/proveedores.json`, cuando hay permiso de escritura.

## Copia de seguridad completa (recomendada)

1. Abrí **Proveedores → Guardado y respaldo → Descargar respaldo completo**, o **Configuración → Respaldo de información → Descargar respaldo JSON**.
2. Guardá el archivo `SAFE-Security-respaldo-AAAA-MM-DD.json` en otro disco o almacenamiento privado confiable.
3. Si usás Python, copiá también las carpetas `proveedores/` y `cotizaciones/`.
4. Para recuperar toda la aplicación en otra computadora, entrá en **Configuración → Importar respaldo JSON**. **Atención:** reemplaza el catálogo, proveedores, cotizaciones y ajustes actualmente cargados. Exportá primero el estado existente.
5. Conservá siempre el respaldo general antes de actualizar de versión, reinstalar Windows o cambiar el navegador.

> **Privacidad:** los JSON contienen datos de clientes, costos de proveedor, notas internas y eventualmente fotografías. No los compartas con clientes. Enviá solo el PDF comercial.

## Editar datos de un proveedor

La forma normal y segura es desde **Proveedores → Editar**. Evitá modificar manualmente `proveedores.json` mientras la aplicación está abierta: al guardar un proveedor, el programa podría sobrescribir el cambio externo con el estado de la sesión.
