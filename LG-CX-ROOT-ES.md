# LG webOS 5.x, Root permanente (Dev Mode)

> Certificado en **LG CX** (OLED65CX6LA, webOS 5.6.2, fw 04.64.00). Otros modelos webOS 5.x:
> probablemente funcionen (cadena independiente del modelo, exploit auto-calibrable) pero **sin probar**: se aceptan reportes.

> **⚠️ ESTADO: BETA.** Funcional y probado, pero beta, úsalo bajo tu responsabilidad, lee
> el código antes de ejecutarlo y espera bordes rugosos. Sin garantías ni postureo: es un kit
> comunitario certificado en **un solo** televisor (abajo), no un producto pulido.

**Versión 1**: probado y certificado en **LG OLED65CX6LA (webOS 5.6.2, fw 04.64.00)** el 2026-10-12:
el SSH root (`:22`) arranca **solo ~75 segundos después de cada encendido**, sin ordenador.

## Qué hace
La propia cadena de arranque del Dev Mode ejecuta `devmode-helper.js` **como root en cada boot**.
Este kit se monta en esa ejecución a través de una **dependencia sin verificar**
(`node_modules/chokidar/index.js`) y lanza una cadena init que levanta un servidor SSH root en el puerto 22.

**Nunca se modifica ningún fichero firmado.** Las verificaciones de firma (que desactivarían
el Dev Mode) pasan intactas.

```
devmode.sh (NAND, RO)
 └─ verifica start-devmode.sh (firma OK, intacto)
     └─ start-devmode.sh → verifica devmode-helper.js + devmode-helper-util.js (intactos)
         └─ node devmode-helper.js  ← SE EJECUTA COMO ROOT EN CADA BOOT
             └─ require('chokidar')  ← node_modules/chokidar/index.js, SIN VERIFICAR ✅
                 └─ 🔥 NATXO SHIM → sh /media/developer/natxo/boot-root.sh
                     └─ run-parts /media/developer/natxo/init.d
                         ├─ 90-natxo-sshd → start.sh → sshd :22 (root)
                         ├─ 98-natxo-daemon → daemon root (API :7777 + telnet opcional)
                         └─ 95-natxo-restore / 99-suidtest
```

## ¿Por qué una store propia (NZ Store) en vez del Homebrew Channel?

El Homebrew Channel es un gran proyecto webosbrew, pero en webOS 5 su vía de elevación
(autostart como servicio privilegiado) provocó **bucles de arranque y caídas OOM** en el TV
certificado. Con el root permanente de este kit ese riesgo es innecesario: la NZ Store usa el
daemon root local en vez de elevarse. Sus ventajas: navegación completa con el mando de LG
(flechas/OK/Atrás), 6 idiomas, catálogos webosbrew + non-free + Stremio más tus propios repos
persistentes, pestaña Control con toggles del sistema (eco, rastreo LG, SSH, Telnet,
**Dev Mode ∞**), instalaciones registradas con icono en el launcher, y ~28 KB de HTML/JS puro
sin servicio en segundo plano.

## ¿Es seguro?

- **No se toca nada firmado.** La cadena solo antepone código a `node_modules/chokidar/index.js`
  (una dependencia npm *sin verificar* del helper del Dev Mode) y escribe bajo
  `/media/developer/natxo/`. La verificación de firmas pasa; el Dev Mode sigue funcionando.
- **Sin cambios de firmware.** Nada de reescribir NAND, ni ficheros DRM, ni trucos con el
  bootloader. NO actualices el firmware del TV con el root puesto, este kit es para el
  firmware certificado.
- **Seguro ante cortes de luz.** La cadena no hace escrituras delicadas en el arranque; si se
  interrumpe, simplemente lo reintenta en el siguiente boot.
- **Totalmente reversible** (ver *Cómo quitarlo*). Un factory reset del Dev Mode también lo borra.
- **Riesgos conocidos (¡beta!):** LG puede cambiar los internos del Dev Mode en firmware futuros;
  está certificado en un solo modelo/firmware; ejecutar código sin firmar como root siempre
  conlleva riesgo. Lee el código antes de usarlo.

## Cómo quitarlo
```sh
# con SSH root (o cualquier shell root):
rm -rf /media/developer/natxo          # la cadena, el daemon, el build de sshd
# restaurar el chokidar original (backup guardado al instalar):
cp /media/developer/natxo/devmode-state/chokidar-index.js.ORIGINAL \
   /media/cryptofs/apps/usr/palm/services/com.palmdts.devmode.service/node_modules/chokidar/index.js
```
O simplemente desactiva el Dev Mode / haz factory reset: todo vive en el área de developer y
en la única dependencia modificada, el sistema queda intacto.

## Contenido
- **`one-click.sh`**: el kit completo para usuarios: descarga de clave, exploit, instalación
  de la cadena, etapa SSH final (shim + verificación + inyección de token), diagnósticos. ~15-30 min.
- `payload/`: el payload que se sirve al TV durante la instalación:
  - `gfx_cred_escalate.py`: el exploit de GPU (James McVay)
  - `rootcmd_install.sh`: el instalador en el TV (el one-click le inyecta su propia IP)
  - `openssh-build.tgz`: el build de OpenSSH para el TV (ARM)
  - `shim-chokidar.js`: el shim (prepend en `node_modules/chokidar/index.js`)
  - `natxo-daemon.js` + `install-app.sh`: daemon root (API `:7777`) + helper de ipk
  - `apps/`: `manifest.txt` + `*.ipk` que se auto-instalan al final (p. ej. la NZ Store);
    el one-click también genera aquí `hostkey` (PEM) y `authorized_keys`
- `nzstore/`: fuentes de la NZ Store (tienda homebrew: catálogo webosbrew + repos propios,
  6 idiomas, pestaña Control con toggles del sistema incl. **Dev Mode ∞**)
- `scripts/`: la cadena: `boot-root.sh`, `start.sh` (lanzador de sshd con guardia de proceso),
  `init.d/` (`90-natxo-sshd`, `95-natxo-restore`, `98-natxo-daemon`, `99-suidtest`)

## Instalación (manual, se necesita shell root una vez)
```sh
mkdir -p /media/developer/natxo/init.d /media/developer/natxo/openssh
cp scripts/boot-root.sh scripts/start.sh /media/developer/natxo/
cp scripts/init.d/* /media/developer/natxo/init.d/
chmod 755 /media/developer/natxo/*.sh /media/developer/natxo/init.d/*
# coloca tu build de OpenSSH (→ /media/developer/natxo/openssh/), más:
#   hostkey          , ¡RSA 2048 en formato PEM! El OpenSSH 6.1 de la TV NO lee
#                       ficheros "OPENSSH PRIVATE KEY" modernos: ssh-keygen -t rsa -b 2048 -m PEM
#   authorized_keys  , tu clave pública
# y antepone payload/shim-chokidar.js a:
#   /media/cryptofs/apps/usr/palm/services/com.palmdts.devmode.service/node_modules/chokidar/index.js
# (guarda antes el original; usa rutas /proc/1/root/… desde contextos con jail)
```

## ⚠️ Lecciones críticas (aprendidas a las malas)

1. **NUNCA modifiques `devmode-helper.js`**: se verifica con openssl en cada boot. Si falla,
   el helper simplemente no arranca (`devmode-helper files verification is not valid`).
2. **NUNCA modifiques `start-devmode.sh`**: es la trampa: una firma mala desactiva el Dev Mode
   y dispara la vía de borrado.
3. La clave de verificación del helper es de solo lectura (`/usr/palm/services/com.palm.service.devmode/pub.pem`)
   y compartida con la comprobación exterior, no se puede quitar ni sustituir.
4. El sshd debe crear `/var/run/sshd` (PrivSep) antes de arrancar o muere **en silencio**.
5. Registra todo en un fichero de la partición developer, el arranque temprano no da otra señal.
6. `node --check` falla con errores `lstat` en rutas `/proc/1/root/...`: prueba en copias de `/tmp`.
7. Las guardias de proceso deben coincidir con la **ruta exacta** (`/media/developer/natxo/openssh/sbin/sshd`): el sshd del Dev Mode (`...devmode.service/openssh/sbin/sshd -p 9922`) comparte el sufijo y un
   patrón laxo produce falsos positivos (tu sshd nunca arranca y *parece* que se perdió el root).
8. La TV **no tiene `ssh-keygen`**: genera el hostkey en otro sitio (¡formato PEM!) y llévalo.
9. El hijo root del exploit corre dentro de la jail de prisoner: puede escribir en
   `/media/developer` pero **no ve `/proc/1/root`** (ni el cryptofs plano), el shim de chokidar
   debe instalarse desde un contexto root completo (p. ej. por SSH cuando `:22` esté arriba).
   El one-click lo hace por ti.

## Créditos
- Exploit de escalada de credenciales por GPU: **James McVay** (`gfx_cred_escalate.py`).
- Comunidad RootMyTV / webosbrew por la investigación de la cadena de arranque del Dev Mode.
- Cadena de root permanente (método del shim chokidar), **v1**: Natxo, 2026-10-11.
