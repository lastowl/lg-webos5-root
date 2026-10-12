#!/bin/sh
# start.sh v5: idempotente (anti-tormenta de procesos): NO lanza sshd si ya hay uno.
# Motivo incidente 2026-10-11: un bucle de llamadas (actividad LS2 del HBC elevado)
# generaba docenas de sshd -> RAM muerta -> OOM -> reinicio en bucle.
export PATH=/usr/sbin:/sbin:/usr/bin:/bin
H=/media/developer/natxo
export LD_LIBRARY_PATH=/lib:/usr/lib:$H/openssh/lib/openssh
echo "--- start.sh v5 $(date) ---" >> $H/boot.log

# BLINDAJE: si ya existe un sshd nuestro, salir sin hacer nada
for p in $(ls /proc | grep -E '^[0-9]+$'); do
  c=$(cat /proc/$p/cmdline 2>/dev/null | tr '\0' ' ')
  case "$c" in
    */media/developer/natxo/openssh/sbin/sshd*) echo "sshd ya corriendo (pid $p), skip" >> $H/boot.log; exit 0 ;;
  esac
done

mkdir -p /var/run/sshd && chmod 0755 /var/run/sshd && echo "privsep ok" >> $H/boot.log
mkdir -p /var/rootssh
cp -f $H/authorized_keys /var/rootssh/authorized_keys 2>/dev/null
cp -f $H/hostkey /var/rootssh/hostkey 2>/dev/null
chmod 600 /var/rootssh/hostkey 2>/dev/null
$H/openssh/sbin/sshd -p 22 -o StrictModes=no -f $H/openssh/etc/ssh/sshd_config \
  -h /var/rootssh/hostkey -o PasswordAuthentication=no -o PermitRootLogin=yes \
  -o AuthorizedKeysFile=/var/rootssh/authorized_keys -o UseDNS=no >> $H/boot.log 2>&1
echo "sshd lanzado rc=$?" >> $H/boot.log
