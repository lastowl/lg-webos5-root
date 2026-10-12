#!/bin/sh
# install-app.sh v1: instalar .ipk por SSH (como root)
# uso: install-app.sh <ruta-ipk> <id.app>
IPK="$1"; ID="$2"
if [ -z "$IPK" ] || [ -z "$ID" ]; then echo "uso: $0 <ruta.ipk> <id.app>"; exit 1; fi
luna-send -n 1 -f luna://com.webos.appInstallService/dev/install \
  "{\"id\":\"$ID\",\"ipk\":\"$IPK\",\"subscribe\":false}"
