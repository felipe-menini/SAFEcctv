# Desplegar SAFE en Docker

## Ruta rápida

Requiere Docker Engine y Docker Compose v2 en el servidor Linux. Esta guía corresponde al código de la copia actual; el remoto debe recibir estos cambios antes de clonarlo.

```sh
git clone https://github.com/felipe-menini/SAFEcctv.git
cd SAFEcctv
cp .env.example .env
chmod 600 .env
nano .env                    # Complete ambas contraseñas de bootstrap.
docker compose config --quiet
docker compose up -d --build --wait
curl --fail http://127.0.0.1:8787/healthz
```

Abra `http://IP_DEL_SERVIDOR:8787` **solo después** de configurar el acceso LAN de la sección siguiente. Por defecto únicamente escucha en loopback; desde otra computadora puede usar un túnel SSH: `ssh -L 8787:127.0.0.1:8787 usuario@servidor` y abrir `http://127.0.0.1:8787`.

**¿Tiene datos previos?** Antes del primer `up`, haga la migración de la sección «Traer datos existentes». Un servidor vacío muestra el catálogo de referencia, no recupera por sí solo información del navegador de otra computadora.

## Usuarios y acceso

| Usuario | Permisos |
| --- | --- |
| `fmenini` | Administración completa, información comercial y todos los planos técnicos. |
| `smenini` | Solo diseño CCTV y sus planos propios. No puede leer catálogo, precios comerciales, proveedores, presupuestos ni imágenes privadas de administración. |

Las contraseñas iniciales se suministran en `SAFE_ADMIN_PASSWORD` y `SAFE_CCTV_PASSWORD`, **no en el código**. Se aplican únicamente cuando no existen usuarios. El servidor rechaza inicializar una base vacía sin ambas variables. En esta computadora se dejó un `.env` privado ignorado por Git; no se incluye al clonar. Los valores iniciales solicitados son débiles: cámbielos al primer acceso desde **Cambiar contraseña** (mínimo 12 caracteres).

También puede rotar una contraseña sin navegador:

```sh
docker compose exec safe python servidor_safe.py password fmenini
docker compose exec safe python servidor_safe.py password smenini
```

La rotación revoca todas las sesiones del usuario. Editar `.env` y recrear el contenedor **no** cambia contraseñas de una base existente. Conserve `.env` con permisos restringidos: Compose requiere las variables al validar su configuración.

Las sesiones expiran a las ocho horas; las cookies son HttpOnly/SameSite Strict. Los permisos se verifican en el servidor, incluyendo archivos estáticos, HEAD e imágenes. `smenini` entra en `/cctv`; la interfaz administrativa no se le entrega.

## LAN, HTTPS y exposición

- **Loopback/túnel SSH o VPN:** opción predeterminada y recomendada para acceso privado.
- **LAN confiable:** configure `SAFE_BIND_HOST` con la IP LAN del servidor, o `0.0.0.0`, y limite el puerto con firewall a sus dispositivos. HTTP no cifra contraseñas ni datos; prefiera HTTPS incluso en LAN.
- **Acceso externo:** use un proxy HTTPS como Caddy/Nginx y firewall. Mantenga el backend sin acceso público directo y active `SAFE_SECURE_COOKIE=1`. El proxy debe conservar `Host`, servir desde el mismo origen y permitir cargas de hasta 40 MB. No habilite `Secure` si navega por HTTP: el navegador no enviará la cookie.

No hay recuperación pública de contraseñas ni registro de nuevos usuarios. El servicio es para una instancia doméstica/pequeño equipo, no un clúster. No exponga el servidor Python directamente a Internet sin proxy TLS/VPN.

## Dónde viven los datos

| Elemento | Ubicación persistente |
| --- | --- |
| Usuarios, hashes, sesiones, revisiones, configuración, catálogo, paquetes, proveedores, cotizaciones y borrador | Volumen `safe_data`, `/data/state/safe.sqlite3`. |
| Planos autónomos de cada usuario | La misma base SQLite, separados por propietario. |
| Imágenes de productos, logos, relevamiento y fondos de planos | `/data/state/media/<SHA256>`, fuera del código y del directorio web. |
| PDFs archivados | BLOBs en SQLite; también entran en el ZIP de respaldo. |

`COMPOSE_PROJECT_NAME=safe-manager` estabiliza el nombre del volumen aunque cambie de carpeta. `docker compose up --build --force-recreate` conserva los datos. **No ejecute `docker compose down -v` sobre producción:** elimina el volumen. Un `git pull` no sustituye un respaldo.

Las imágenes se decodifican realmente (PNG/JPEG/WebP, hasta 12 MB y 25 millones de píxeles), se orientan, se quitan metadatos y se limitan a 4096 px por lado. PNG mantiene texto/alpha sin pérdidas; fotografías JPEG/WebP pasan a WebP calidad 90. Una misma imagen normalizada se guarda una sola vez. El catálogo usa URLs autenticadas en lugar de repetir base64; planos y exportaciones recuperan data URLs portátiles. No hay borrado automático de imágenes para evitar romper referencias o respaldos. El almacenamiento puede crecer: supervise espacio disponible.

En modo servidor no se guarda información comercial en localStorage. La preferencia visual sí puede recordarse en el navegador. Un fallo de carga de sesión/persistencia bloquea la aplicación: nunca cambia silenciosamente a datos locales. El modo archivo `index.html` sin servidor sigue siendo una utilidad offline heredada, **sin login ni respaldo compartido**.

## Traer datos existentes

**Haga primero una copia externa de las carpetas originales y exporte el JSON desde el navegador que tiene los datos.** No se reescriben ni borran los originales.

### JSON de versiones anteriores en disco

Antes de usar el workspace nuevo, con el servicio detenido:

```sh
docker compose build
docker compose run --rm --no-deps \
  -v "$PWD:/legacy:ro" \
  safe python servidor_safe.py migrate /legacy
docker compose up -d --wait
```

Importa `catalogo/catalogo.json`, `proveedores/proveedores.json`, `cotizaciones/SAFE-*.json` y PDFs. Es idempotente: repetirla no duplica ni pisa datos. Exige workspace vacío la primera vez; si ya se editó el servidor, use la importación JSON explícita. Para otra carpeta origen sustituya `$PWD` por su ruta absoluta. El montaje es **solo lectura**.

El catálogo legado que ya estaba versionado sigue intacto, pero está excluido de la imagen Docker. `.gitignore` no elimina archivos que ya estaban tracked: revise la privacidad del repositorio/historial antes de publicarlo. No haga commit de bases, fotos, cotizaciones ni `.env`.

### Configuración, paquetes, borrador y fotos del navegador

En el navegador original descargue el **respaldo comercial JSON**. Entre como administrador en el servidor → Configuración → Importar respaldo JSON y confirme. La importación reemplaza todo el workspace comercial en una transacción: configuración/logo, catálogo/imágenes, proveedores, paquetes, presupuestos y borrador (incluidos planos vinculados y relevamientos).

Los datos solo existentes en localStorage **no** se migran automáticamente: sería peligroso mezclar el contenido privado de otro navegador/usuario. Si usa el JSON integral, este es la fuente final y sustituye lo importado previamente de las carpetas.

## Dos clases de respaldo

| Respaldo | Incluye | No incluye |
| --- | --- | --- |
| Botón **Respaldo comercial JSON** | Workspace comercial, imágenes inline portátiles, planos vinculados a cotizaciones, borrador, paquetes y ajustes. | Usuarios/sesiones, planos autónomos `/cctv`, PDFs ya archivados. |
| Comando **ZIP completo** | Snapshot consistente de SQLite (usuarios, planos autónomos, PDFs, workspace) y todas las imágenes referenciadas por la base. | Código, `.env` y configuración del proxy. Respalde estos por separado. |

Los respaldos contienen información interna y hashes de contraseñas: protéjalos y mantenga una copia fuera del servidor.

### Crear un ZIP completo

```sh
mkdir -p backups
docker compose exec -T safe python servidor_safe.py backup /data/safe-backup.zip
docker compose cp safe:/data/safe-backup.zip ./backups/safe-backup.zip
```

Puede hacerse con el servicio activo: usa SQLite online backup; las imágenes son inmutables. Copie el ZIP a otra máquina y pruebe su restauración periódicamente. No copie solamente el archivo SQLite mientras está activo: WAL puede contener transacciones pendientes.

### Restaurar sin sobrescribir el volumen anterior

Se recomienda un proyecto Compose **nuevo** para conservar intacto el original:

```sh
# En la misma carpeta del código y con .env configurado:
docker compose stop safe
docker compose -p safe-recuperado run --rm --no-deps \
  -v "$PWD/backups/safe-backup.zip:/restore.zip:ro" \
  safe python servidor_safe.py restore /restore.zip
docker compose -p safe-recuperado up -d --wait
```

La restauración exige destino vacío, verifica SQLite/esquema y SHA256 de las imágenes en un staging del mismo volumen, y solo promueve datos si todo es válido. El destino es `/data/state` (un subdirectorio, no el mountpoint `/data`); funciona con UID 10001 y raíz de contenedor solo lectura. Revoca sesiones restauradas: vuelva a iniciar sesión con las contraseñas contenidas en el respaldo.

Desde ese momento utilice siempre `docker compose -p safe-recuperado ...` o ajuste `COMPOSE_PROJECT_NAME=safe-recuperado` en `.env`. No elimine el proyecto/volumen anterior hasta verificar usuarios, catálogo, imágenes y planos. Para ensayar sin interrumpir el servicio, use otro puerto en `.env` del proyecto de recuperación.

## Guardado y conflictos

El indicador superior confirma **Guardado en servidor** solo tras la respuesta HTTP. Las ediciones se serializan y llevan revisión. Si otro navegador ya guardó, el servidor devuelve 409 y no pisa sus cambios: use **Exportar cambios pendientes**, recargue y reconcilie manualmente. No hay fusión colaborativa en tiempo real.

Cerrar sesión espera el guardado pendiente. Si falla red o autenticación, se mantiene la pantalla y el error visible. El navegador avisa antes de cerrar con cambios pendientes/en vuelo; no garantiza salvar una pestaña cerrada a la fuerza. Cargas JSON están limitadas a 40 MB por petición: divida/importaciones extraordinariamente grandes antes de usar el sistema o ajuste límites y proxy con una prueba específica.

## Actualizar y verificar

```sh
# Primero respaldo ZIP y copia externa:
git pull
docker compose up -d --build --wait
docker compose ps
docker compose logs --tail=60 safe
curl --fail http://127.0.0.1:8787/healthz
```

Pruebas aisladas de desarrollo:

```sh
python -m pip install -r requirements.txt
python -m unittest discover -s tests -p test_server.py
node tests/build-planner.cjs --check
# Requiere Playwright/Chromium disponibles: qa_server.cjs usa SAFE_TEST_URL y
# SAFE_TEST_PASSWORD de un servidor fixture, nunca credenciales reales.
docker build -t safe-manager-qa:local .
python tests/qa_docker.py
```

`qa_docker.py` crea un proyecto/volumen de prueba con nombre aleatorio, verifica login/ACL, imágenes, recreación y backup/restore no-root, y elimina **solo sus propios** recursos.
