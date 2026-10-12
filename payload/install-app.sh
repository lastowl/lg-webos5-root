#!/bin/sh
# install-app.sh v1: install an .ipk over SSH (as root)
# usage: install-app.sh <path.ipk> <app.id>
IPK="$1"; ID="$2"
if [ -z "$IPK" ] || [ -z "$ID" ]; then echo "usage: $0 <path.ipk> <app.id>"; exit 1; fi
luna-send -n 1 -f luna://com.webos.appInstallService/dev/install \
  "{\"id\":\"$ID\",\"ipk\":\"$IPK\",\"subscribe\":false}"
