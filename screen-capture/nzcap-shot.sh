#!/bin/sh
# Screen capture at max quality. Always writes /tmp/nz-cap.png (overwritten each
# time, so it never fills /tmp). If a USB drive is mounted the capture is also
# copied there with a timestamp under nz-capturas/.
OUT=/tmp/nz-cap.png
luna-send -n 1 -a com.webos.service.capture.client.nz luna://com.webos.service.capture/executeOneShot "{\"path\":\"$OUT\",\"method\":\"DISPLAY\",\"format\":\"PNG\",\"width\":3840,\"height\":2160}" > /tmp/nz-cap.log 2>&1
TS=$(date +%Y%m%d-%H%M%S)
for d in /tmp/media/usb/sda1 /tmp/media/sda1 /tmp/media/usb/sda /mnt/usb /tmp/media/usb/sdb1; do
  if [ -d "$d" ]; then
    mkdir -p "$d/nz-capturas" 2>/dev/null
    if cp "$OUT" "$d/nz-capturas/captura-$TS.png" 2>/dev/null; then
      echo "saved to $d/nz-capturas/captura-$TS.png"
      break
    fi
  fi
done
ls -la "$OUT"
