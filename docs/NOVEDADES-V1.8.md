# SAFE Security Manager v1.8 — Cambios de interfaz

## Cambios pedidos y realizados

1. **Módulos plegables:** flechas en paneles de Cotizador, Relevamiento, Paquetes, Grabación/Discos, Configuración, Proveedores, Catálogo e Historial. El estado de despliegue de paneles técnicos se mantiene cuando sus formularios se vuelven a dibujar durante la sesión.
2. **Confirmaciones corporativas:** modal SAFE para limpiar/nuevo presupuesto, importar información, eliminar presupuesto, producto, cámara, paquete o proveedor, restaurar catálogo y recalcular márgenes. Admite aceptar/cancelar; escapar cancela.
3. **Relevamiento:** botón «Agregar cámara», fichas individuales plegables con `<details>`; campo «Distancia desde NVR/DVR (m)». Los borradores guardan las medidas y las fotos comprimidas.
4. **Calculadora de materiales retirada de la interfaz:** ya no aparece en el menú, ni como acceso rápido, ni desde las tarjetas técnicas. Los artículos siguen pudiéndose cotizar manualmente.
5. **Paquetes:** editor para predeterminados y personalizados; nombre, descripción, tipo, artículos y cantidades; restaurar los originales. Se corrigió superposición del botón guardar y su adaptación en móvil.
6. **Grabación:** modo objetivo «Quiero X días» → tamaño mínimo estimado; modo «Tengo un disco» → días estimados. Grabación continua 100% o por movimiento (porcentaje configurable), con reserva técnica fija del 10%. El PDF usa el objetivo activo.

## Comprobaciones de QA

- 31 comprobaciones principales de interfaz y cálculos en Chromium.
- Prueba adicional en ancho móvil de 390 px.
- Generación real de un PDF de 2 páginas y verificación textual de modo días, capacidad y exclusión de costos.
- Pruebas de proveedores, API local y rutas privadas.

**Pendiente de comprobar fuera de este entorno:** apertura real del servidor local desde Chromium/Edge en Windows, afectada por políticas del navegador de pruebas. La API se validó por separado.
