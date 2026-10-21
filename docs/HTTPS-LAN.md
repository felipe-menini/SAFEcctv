# SAFE por HTTPS en la red local

Acceso: **https://192.168.1.10**. No necesita VPN, dominio público ni acceso a Internet del cliente. Cada dispositivo debe confiar MANUALMENTE en la CA privada de SAFE una sola vez; no continúe ignorando advertencias del navegador.

## Confiar en el certificado (cliente)

1. Obtenga `SAFE-LAN-root.crt` del administrador por un canal confiable y compare su huella SHA-256 con la entregada por separado. No importe certificados desconocidos: esta CA puede emitir certificados para otros sitios si su clave privada se compromete.
2. **Windows:** abra `certmgr.msc` (usuario actual), vaya a **Entidades de certificación raíz de confianza > Certificados > Todas las tareas > Importar** e importe el archivo público. Cierre y vuelva a abrir el navegador. No hace falta instalar software ni ejecutar scripts de confianza.
3. **Android:** Ajustes > Seguridad y privacidad > Más ajustes de seguridad > Cifrado y credenciales > Instalar un certificado > Certificado de CA. Los nombres varían según fabricante. Elija el archivo verificado.
4. **iPhone/iPad:** instale el perfil del certificado desde Ajustes y, después, en General > Información > Ajustes de confianza de certificados, habilite explícitamente la confianza SSL para esa raíz.
5. Abra la URL HTTPS. Debe aparecer SIN advertencias. Si persisten, revise IP, fecha y confianza; NO desactive la validación TLS. Firefox u otros navegadores con almacén propio pueden requerir importar esa misma CA en sus autoridades de confianza.

El archivo `.crt` contiene SOLO el certificado público. Nunca comparta `root.key` ni copie el volumen completo de Caddy a los clientes. Para retirar confianza, quite exclusivamente esta CA del almacén donde la instaló.

## Instalar en el servidor (administrador)

Requiere Docker Compose >= 2.24.4 (`!override`), IP LAN reservada y puerto TCP443 libre. Antes: backup consistente ZIP de SAFE (incluye DB y medios), `.env`, overrides y referencia de imagen/commit anterior; mantenga archivos privados en modo600. No use `down -v`.

En `.env`, conserve los secretos existentes y configure:

```dotenv
COMPOSE_PROJECT_NAME=safe-manager
COMPOSE_FILE=docker-compose.yml:compose.override.yml:compose.lan-https.yml
SAFE_LAN_IP=192.168.1.10
SAFE_SECURE_COOKIE=1
```

Si no tiene override local, omita `compose.override.yml` de la lista. El override HTTPS debe ir ÚLTIMO: reemplaza la publicación HTTP por `127.0.0.1:8787`. En Docker Snap afectado por LP1908448, el override local de SAFE conserva `security_opt: !reset []`; NO desactive AppArmor/seccomp globalmente.

```sh
docker compose config --quiet
docker compose build
docker compose up -d --wait --wait-timeout 120
docker compose cp safe-proxy:/data/caddy/pki/authorities/local/root.crt ./SAFE-LAN-root.crt
openssl x509 -in SAFE-LAN-root.crt -noout -fingerprint -sha256
curl --cacert SAFE-LAN-root.crt https://192.168.1.10/healthz
```

No use `docker compose config` sin `--quiet`: puede revelar secretos. Verifique que `http://192.168.1.10:8787` ya no acepte conexiones. El backend HTTP es SOLO loopback y red interna Docker. Caddy conserva Host/Origin, termina TLS en8443 y publica únicamente443 en la IP LAN; no publica80 ni su API administrativa. Aplicación y proxy corren sin root, con filesystem de solo lectura y todas las capacidades eliminadas. El build quita la file-cap de enlace a puertos bajos que trae Caddy oficial:8443 no la necesita. `default_sni` selecciona el certificado IP correcto para clientes que no envían SNI a través del NAT Docker.

## Actualizar, respaldar y revertir

- Actualización: ZIP consistente DB/medios y backup privado de `.env`/overrides primero; `git pull --ff-only`, `docker compose build`, luego `docker compose up -d --wait`. No reinicialice datos ni cambie contraseñas existentes. Las migraciones de cuentas fuerzan al usuario a elegir una contraseña nueva al entrar; mínimo15 caracteres.
- CA: preserve los volúmenes `safe-manager_safe_tls_data` y `safe-manager_safe_tls_config` para mantener confianza entre recreaciones. Respalde el volumen de CA con acceso restringido, aparte del ZIP de la aplicación: contiene CLAVES PRIVADAS. No va en Git ni en la entrega pública.
- Rollback: antes del update etiquete la imagen backend anterior con una etiqueta local estable y registre su ID. Detenga SOLO SAFE; restaure el backup consistente anterior DB/medios si hubo migración. Conserve los archivos TLS de esta versión, los volúmenes CA y `COMPOSE_FILE` con el overlay HTTPS al final: el commit anterior puede no incluirlos. Seleccione la imagen backend guardada mediante un override local `safe.image`, sin reconstruir (`docker compose up -d --no-build --pull never safe`). No restaure ciegamente la `.env` HTTP anterior: conserve `SAFE_SECURE_COOKIE=1`, IP y composición HTTPS, restaurando únicamente secretos/configuración necesarios. No elimine volúmenes ni quite TLS. Compruebe healthcheck, recuentos, hash del workspace/archivos y rechazo de HTTP LAN tras restaurar.
- Si cambia la IP, actualice `SAFE_LAN_IP` y recree el proxy. Caddy emite un certificado nuevo bajo la misma CA; no es necesario reinstalar la raíz mientras se preserve el volumen. No exponga este despliegue a Internet sin una evaluación adicional.

## Verificación

`python -B tests/test_lan_https.py` comprueba el contrato de configuración. La prueba de despliegue debe usar proyecto y volúmenes temporales distintos, contraseña aleatoria y CA explícita; confirme rechazo sin la CA, health200, cookie Secure, cambio obligatorio y contraseña débil422 (no403 por falta de HTTPS), más persistencia de CA tras recrear. No use flags TLS inseguros ni pruebe cambios de contraseña sobre usuarios reales.

Referencias: [Caddy TLS interno](https://caddyserver.com/docs/caddyfile/directives/tls), [opciones globales](https://caddyserver.com/docs/caddyfile/options), [imagen oficial](https://hub.docker.com/_/caddy), [Microsoft certificados](https://learn.microsoft.com/en-us/windows-hardware/drivers/install/trusted-root-certification-authorities-certificate-store), [Apple confianza SSL](https://support.apple.com/en-gb/102390), [Google certificados Android](https://support.google.com/pixelphone/answer/2844832/add-amp-remove-certificates?hl=en-GB).
