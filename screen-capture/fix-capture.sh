#!/bin/sh
# Boot-time setup for screen capture. IDEMPOTENTE. Called from boot-root.sh.
# Re-applies the capture bind-mounts, copies the scripts to /tmp and reloads
# the LS2 hub permissions.
D=/media/developer/natxo/nzcap

# work scripts in /tmp (the store button calls them from there)
cp $D/nzcap-shot.sh /tmp/nzcap-shot.sh 2>/dev/null
cp $D/nzcap-timer.sh /tmp/nzcap-timer.sh 2>/dev/null

# 1) device config: enable screen capture support for this model
echo '{"supportScreenCapture" : true}' > /tmp/capture-conf.json
mount --bind /tmp/capture-conf.json /etc/configd/layers/devicename/k6lpweefhd/com.webos.service.capture.json 2>/dev/null

# 2) service whitelist: allowed capture clients
printf '{\n "permissionClient":["com.webos.service.capturepermission"],\n "forceCaptureClient":["com.webos.service.capture.client.nz"]\n}' > /tmp/whitelist-conf.json
mount --bind /tmp/whitelist-conf.json /etc/palm/whitelist-conf.json 2>/dev/null

# 3) LS2 hub permissions: let com.natxobsd.* call the capture API
printf '{\n    "com.webos.service.capture": ["all"],\n    "com.webos.service.capture.client*": ["all"],\n    "com.webos.service.capturepermission": ["all"],\n    "com.natxobsd.*": ["all"]\n}' > /tmp/perm-new.json
mount --bind /tmp/perm-new.json /usr/share/luna-service2/client-permissions.d/com.webos.service.capture.perm.json 2>/dev/null

# 4) reload hub permissions if the hub is already up (it reads them at startup otherwise)
HP=$(ps | grep [l]s-hubd | head -1 | awk '{print $1}')
if [ -n "$HP" ]; then kill -HUP $HP 2>/dev/null; fi

# 5) restart captureservice so it re-reads the configs (it respawns via the hub)
sleep 2
pkill -9 captureservice 2>/dev/null

exit 0
