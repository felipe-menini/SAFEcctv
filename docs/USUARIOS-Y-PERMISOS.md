# Usuarios y permisos de SAFE

## Uso administrativo

1. Ingrese como **fmenini**. En el primer inicio tras esta actualización complete el **cambio obligatorio** de contraseña con su contraseña actual. Luego vuelva a ingresar.
2. Abra **Usuarios y módulos** en la barra superior. Cree una cuenta con nombre único, módulos y contraseña temporal de **15 caracteres o más**, o un **PIN numérico de 6 o más dígitos**. Entréguela por un canal privado, nunca en registros o capturas.
3. El usuario debe cambiar esa contraseña antes de recibir workspace, scripts comerciales, planos o imágenes. Una cuenta sin módulos no puede ingresar.
4. Para modificar una cuenta selecciónela, marque sus módulos y confirme con **su propia contraseña administrativa actual**. Deje la contraseña temporal vacía para conservar la existente. Para restablecerla, ingrese una nueva temporal.
5. Desmarque **Cuenta activa** para suspender el acceso. No se borran cuentas ni planos; reactivarla conserva los datos. Cada modificación de permisos, estado, rol o contraseña revoca TODAS las sesiones de la cuenta afectada.

`fmenini` conserva administración completa. No puede desactivar/limitar su propia cuenta administrativa; tampoco se permite eliminar el último administrador activo. Un usuario sin rol administrador no puede crear cuentas, cambiar permisos ni elevarse a administrador aunque invoque la API directamente. Un administrador adicional es una concesión de confianza TOTAL, no un módulo parcial.

## Contrato de módulos y dependencias

Los permisos se verifican en el servidor, no solamente ocultando botones. Un permiso no concede el workspace completo.

| Módulo | Lectura y escritura autorizadas |
|---|---|
| Cotizador | Borrador comercial **propio**. Lee catálogo de **precios de venta** calculados, sin costo de compra ni proveedor, e identidad/datos fiscales para cálculo y PDF. Sin configuración global privada. No archiva historial sin Presupuestos. |
| Plano CCTV | Planos autónomos propios; administrador puede gestionar todos. En el gestor comercial puede usar el esquema CCTV del borrador propio. No concede cotizaciones ni proveedores. Solo este permiso abre el host técnico `/cctv`. |
| Relevamiento | Subdocumento `survey` del borrador propio, incluidas fotos. No recibe clientes/precios/ítems comerciales de otro módulo. Generar puntos desde equipos requiere además Cotizador o Paquetes; sin ellos puede añadir puntos manualmente. |
| Paquetes | Lee/edita plantillas compartidas y sus snapshots personalizados; estos pueden incluir valores comerciales del paquete. Lee catálogo proyectado de venta y datos fiscales. Puede preparar su selección privada de ítems. Para usarla en una cotización y consultar dólar conceda también Cotizador. |
| Almacenamiento | Subdocumento `storagePlan` del borrador propio. Sin Cotizador/Paquetes, use conteo manual; no se reciben ítems comerciales. |
| Presupuestos | Historial **propio**, con los datos comerciales necesarios para lista/PDF. Survey, plano y storage se proyectan solo si tiene sus permisos. Para abrir/editar una cotización conceda también Cotizador. Sin Cotizador puede listar y generar PDFs de su historial, no editar el borrador. |
| Catálogo | Lee/edita el catálogo compartido completo, incluidos costos y referencias a proveedor. NO concede el directorio de proveedores ni configuración global. |
| Proveedores | Lee/edita el directorio compartido de proveedores; no concede catálogo ni cotizaciones. |
| Configuración | Lee/edita configuración global compartida. No concede los otros datos. |
| Ayuda | Guía de uso, sin datos comerciales. |
| Usuarios | Siempre y únicamente administradores; no es un permiso asignable a un usuario limitado. |

Los cambios compartidos afectan a todos. Las cuentas limitadas tienen borrador/historial separados: no reciben ni sobrescriben el historial administrativo anterior. El servidor acepta solo campos autorizados y hace un **merge transaccional parcial**: al guardar, conserva los campos ocultos de otros módulos. El control de revisión sigue devolviendo **409** ante cambios concurrentes; se usa una revisión global, incluso cuando cambió otro borrador privado, para priorizar integridad sobre concurrencia optimista fina. Recargue y reingrese sus cambios autorizados ante un conflicto.

Las fotografías nuevas se asocian al módulo que las sube. Lecturas y HEAD de `/media/…` verifican permisos vigentes, ACL y referencias actualmente visibles. Revocar un módulo revoca sus imágenes aunque el usuario conserve otro módulo. Las respuestas llevan `Cache-Control: no-store`. No es posible retirar una copia ya descargada o borrar lo que una persona ya vio; las pestañas abiertas verifican la sesión cada 15 segundos y al recuperar el foco. La siguiente solicitud al backend se rechaza inmediatamente tras revocación.

## Migración y respaldos

- **Antes de actualizar:** detenga el servicio y conserve un ZIP completo de SQLite/media mediante el comando `backup` ya documentado. No use una copia de SQLite en caliente mediante el explorador.
- La inferencia de medios CCTV anteriores se ejecuta una sola vez al migrar desde el esquema sin módulos y queda registrada como `access-media-modules-v1`. Los reinicios siguientes NO vuelven a inferir permisos desde la ACL de propietario; así no reconceden fotos de módulos revocados.
- La migración es automática y aditiva: agrega estado, permisos, cambio obligatorio, workspaces privados y grants por módulo; conserva hashes PBKDF2 existentes, workspace, revisiones, planos y medios. `admin` conserva todo; el rol legado `cctv` recibe únicamente `plano`.
- Todas las cuentas anteriores y las cuentas bootstrap deben cambiar su contraseña al ingresar por primera vez tras la migración. Las sesiones anteriores se invalidan. La contraseña actual sigue siendo la existente: NO se crea una contraseña fija o alternativa y NO se deben copiar contraseñas a la guía.
- Las variables bootstrap solo sirven para una base vacía. No modifican usuarios de una base existente ni sustituyen la gestión de cuentas.
- Respaldo comercial JSON e importación completa son **solo administrativos** y conservan su contrato anterior; no contienen usuarios ni workspaces privados. El **ZIP completo** incluye tablas de cuentas/permisos, borradores/historial privados, planos y medios. Restaurar un ZIP invalida sesiones. Conserve además configuración de despliegue por separado, como ya indica la guía Docker.
- El comando local `python servidor_safe.py password USUARIO` admite nombres de cuentas nuevas, solicita contraseña sin eco y revoca sesiones. Es una operación confiable de recuperación local que establece la contraseña definitiva; no marca temporal. No pase contraseñas como argumentos.

## Límites de seguridad

PBKDF2-HMAC-SHA256 mantiene **600.000 iteraciones** con sal aleatoria por contraseña. Contraseñas nuevas: mínimo 15 caracteres —o un PIN numérico de 6 o más dígitos—, máximo 1024 **bytes UTF-8**, sin truncamiento; no se guarda ni devuelve texto plano. Credenciales fallidas usan respuestas genéricas y hash dummy para usuario inexistente. Hay límites de intentos de login, reautenticación y escrituras; contraseñas, cuerpos y tokens no se registran. Los formularios administrativos no recuperan ni muestran hashes.

Sesiones opacas de 8 horas, cookie HttpOnly/SameSite=Strict, CSRF y validación de Origin en escrituras. Cambio de contraseña, estado o permisos revoca sesiones; logout elimina la sesión actual. La reautenticación administrativa se transmite solo en POST; para operaciones sensibles fuera de localhost se exige configurar HTTPS (`SAFE_SECURE_COOKIE=1` detrás de terminación TLS confiable). **HTTP es solo para desarrollo local.** No hay MFA implementado ni se promete seguridad absoluta. Proteja el equipo, el volumen/ZIP y el acceso administrativo al proceso y al proxy TLS.

## Verificación aislada

Las pruebas usan directorios temporales, contraseñas aleatorias y HTTP en `127.0.0.1:0`; nunca `.env` ni datos reales. En sandbox Windows configure TEMP/TMP del proceso a un directorio `work/` permitido; el loopback y Chromium pueden requerir aprobación. NODE_PATH debe apuntar a las dependencias Node/Playwright disponibles.

```text
python -m unittest tests.test_server.ServerTests tests.test_users.UserModuleTests -q
python tests/run_users_browser.py
node tests/qa_cctv.cjs
node tests/qa_cctv_integration.cjs
node tests/build-planner.cjs --check
```

El fixture de regresión original representa cuentas que YA completaron el cambio inicial; la obligación bootstrap/migración se prueba por separado. El E2E nuevo crea cuenta desde UI, cambia contraseña temporal, concede dos módulos, valida datos/precios, revoca y comprueba UI/API, desactiva/reactiva, restablece y exige cambio nuevamente.
