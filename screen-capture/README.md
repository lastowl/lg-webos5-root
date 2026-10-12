# Screen capture (4K)

Real screen capture on LG webOS 5 TVs. LG ships the `com.webos.service.capture`
service but disables it per device model (`supportScreenCapture: false` in the
device config layer). The service itself works fine once you re-enable it and
call it from an allowed client.

Verified on an OLED CX (webOS 5.6.2, firmware 04.64.00) at 3840x2160.

## How it works

Four layers have to line up:

1. Device config: `/etc/configd/layers/devicename/<model>/com.webos.service.capture.json`
   must contain `{"supportScreenCapture": true}`. The rootfs is squashfs
   (read-only), so use a bind-mount over the file.
2. Service whitelist: `/etc/palm/whitelist-conf.json` needs your client in
   `forceCaptureClient`. Also bind-mounted.
3. LS2 hub permissions: `/usr/share/luna-service2/client-permissions.d/com.webos.service.capture.perm.json`
   controls which appIds may call the API. Bind-mount a copy that adds your
   appId. The hub caches this file at startup. `kill -HUP <ls-hubd pid>` makes
   it reload without a reboot (this was the missing piece for a long evening).
4. The caller must use an appId matching the allowed pattern. The API is not
   public, so plain CLI calls get `Denied method call "executeOneShot" for
   category "/"`. Call it with `luna-send -a <appid>`, from a web app through
   `PalmServiceBridge`, or from a background daemon using one of those.

## Files

- `nzcap-shot.sh` takes one capture at max quality (3840x2160 when supported).
  It always writes `/tmp/nz-cap.png` (overwritten every time, so /tmp never
  fills up) and copies to a USB drive under `nz-capturas/` when one is mounted.
- `nzcap-timer.sh N` waits N seconds (default 10) and then takes the shot. Run
  it from a background process so you have time to switch to the screen you
  want. `sh /tmp/nzcap-timer.sh 10 &`
- `fix-capture.sh` re-applies everything at boot (bind-mounts, scripts, hub
  reload). Call it from `boot-root.sh` before `exit 0` to survive reboots.
- `store-panel.js` is a self-contained HTML fragment that adds a "Screen
  captures" panel to a web app (capture now / in 10s / in 20s, 6 languages).
  Copy it before `</body>` and replace `TOKENPLACEHOLDER` if your app calls the
  background daemon directly.

## Capture call

```sh
luna-send -n 1 -a com.webos.service.capture.client.nz \
  luna://com.webos.service.capture/executeOneShot \
  '{"path":"/tmp/nz-cap.png","method":"DISPLAY","format":"PNG","width":3840,"height":2160}'
```

Supported formats: BMP, JPG, PNG, RGB, RGBA, YUV422. Methods: SCREEN / DISPLAY.
Without `width`/`height` the default is 960x540. The response JSON reports the
real `capturedWidth`/`capturedHeight`, but the ground truth is the file.

Some devices name the service `com.webos.service.tv.capture` instead. Same
signature.

## Gotchas

- The LG sample binaries (`com.webos.exampleapp.videocapture`,
  `vtCaptureTestSuite`) crash against the compositor and can wedge the TV UI
  badly enough that even the power button stops working. Do not run them.
- `pkill` on the stock busybox accepts only one pattern.
- The luna-send CLI can go silent after service restarts. Judge results by the
  output file, not by the CLI output.
- appIds starting with `com.webos.`, `com.palm.` or `com.lge.` are treated as
  privileged by `appinstalld` and cannot be installed in developer mode, so a
  client app cannot pick an appId matching the default capture permission
  pattern. Add your own appId to the permissions file instead (layer 3).
