#!/bin/sh
# start.sh v5: idempotent (anti process-storm): does NOT start sshd if one is already running.
# Reason (incident 2026-10-11): a call loop (elevated LS2 activity)
# spawned dozens of sshd processes -> RAM exhausted -> OOM -> reboot loop.
export PATH=/usr/sbin:/sbin:/usr/bin:/bin
H=/media/developer/natxo
export LD_LIBRARY_PATH=/lib:/usr/lib:$H/openssh/lib/openssh
echo "--- start.sh v5 $(date) ---" >> $H/boot.log

# GUARD: if one of our sshd processes is already running, exit without doing anything
for p in $(ls /proc | grep -E '^[0-9]+$'); do
  c=$(cat /proc/$p/cmdline 2>/dev/null | tr '\0' ' ')
  case "$c" in
    */media/developer/natxo/openssh/sbin/sshd*) echo "sshd already running (pid $p), skip" >> $H/boot.log; exit 0 ;;
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
echo "sshd started rc=$?" >> $H/boot.log
