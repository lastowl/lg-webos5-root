# LG webOS 5.x, Permanent Root (Dev Mode)

> Certified on **LG CX** (OLED65CX6LA, webOS 5.6.2, fw 04.64.00). Other webOS 5.x models:
> likely to work (model-independent chain, self-calibrating exploit) but **untested**: reports welcome.

> **⚠️ STATUS: BETA.** Functional and tested, but beta, use at your own risk, read the
> code before running it, and expect rough edges. No warranties, no pretence: this is a
> community kit certified on **one** TV (see below), not a polished product.

**Version 1**: tested and certified on **LG OLED65CX6LA (webOS 5.6.2, fw 04.64.00)** on 2026-10-12:
root SSH (`:22`) comes up **by itself in ~75 seconds on every boot**, no computer needed.

## What it does
The TV's own Dev Mode boot chain runs `devmode-helper.js` **as root on every boot**. This kit
piggybacks on that execution through an **unsigned dependency** (`node_modules/chokidar/index.js`)
and launches an init chain that starts a root SSH server on port 22.

**No signed file is ever modified.** The signature checks (which would disable Dev Mode) pass untouched.

```
devmode.sh (NAND, RO)
 └─ verifies start-devmode.sh (signature OK, untouched)
     └─ start-devmode.sh → verifies devmode-helper.js + devmode-helper-util.js (untouched)
         └─ node devmode-helper.js  ← RUNS AS ROOT ON EVERY BOOT
             └─ require('chokidar')  ← node_modules/chokidar/index.js, NOT VERIFIED ✅
                 └─ 🔥 NATXO SHIM → sh /media/developer/natxo/boot-root.sh
                     └─ run-parts /media/developer/natxo/init.d
                         ├─ 90-natxo-sshd → start.sh → sshd :22 (root)
                         ├─ 98-natxo-daemon → root daemon (API :7777 + optional telnet)
                         └─ 95-natxo-restore / 99-suidtest
```

## Why a store of our own (NZ Store) instead of the Homebrew Channel?

The Homebrew Channel is a great webosbrew project, but on webOS 5 its elevation path (autostart
as a privileged service) caused **boot loops and OOM crashes** on the certified TV. With this
kit's permanent root that risk is unnecessary: the NZ Store uses the local root daemon instead
of elevating itself. Its advantages: full LG-remote navigation (D-pad/OK/Back), 6 languages,
webosbrew + non-free + Stremio catalogs plus your own persistent repos, a Control tab with
system toggles (eco, LG tracking, SSH, Telnet, **Dev Mode ∞**), registered installs with
launcher icons, and a ~28 KB plain HTML/JS footprint with no background service.

## Is this safe?

- **Nothing signed is touched.** The chain only prepends to `node_modules/chokidar/index.js`
  (an *unverified* npm dependency of the Dev Mode helper) and writes under
  `/media/developer/natxo/`. Signature verification passes; Dev Mode keeps working.
- **No firmware changes.** No NAND rewrites, no DRM files, no bootloader tricks. Do NOT
  update the TV firmware while rooted, re-run the kit on the same firmware only.
- **Power-cut safe.** The chain makes no delicate writes at boot; if interrupted, it simply
  retries on the next boot.
- **Fully reversible** (see *How to remove* below). A Dev Mode factory reset also wipes it.
- **Known risks (beta!):** LG may change the Dev Mode internals in future firmware; this is
  certified on one model/firmware only; running unsigned code as root always carries risk.
  Read the code before using it.

## How to remove
```sh
# with root SSH (or any root shell):
rm -rf /media/developer/natxo          # the chain, daemon, sshd build
# restore the original chokidar (backup saved at install time):
cp /media/developer/natxo/devmode-state/chokidar-index.js.ORIGINAL \
   /media/cryptofs/apps/usr/palm/services/com.palmdts.devmode.service/node_modules/chokidar/index.js
```
Or simply turn Dev Mode off / factory-reset the TV: everything lives in the developer area
and the one prepended dependency, the system is untouched.

## Contents
- **`one-click.sh`**: the whole thing for end users: key fetch, exploit, chain install,
  final SSH stage (shim + verification + token injection), diagnostics. ~15-30 min.
- `payload/`: TV-side payload served to the TV during install:
  - `gfx_cred_escalate.py`: the GPU exploit (James McVay)
  - `rootcmd_install.sh`: the TV-side installer (the one-click embeds its own IP in it)
  - `openssh-build.tgz`: the OpenSSH build for the TV (ARM)
  - `shim-chokidar.js`: the shim (prepend to `node_modules/chokidar/index.js`)
  - `natxo-daemon.js` + `install-app.sh`: root daemon (API `:7777`) + ipk helper
  - `apps/`: `manifest.txt` + `*.ipk` auto-installed at the end (e.g. the NZ Store);
    the one-click also generates `hostkey` (PEM) and `authorized_keys` here
- `nzstore/`: NZ Store sources (homebrew store: webosbrew catalog + custom repos,
  6 languages, Control tab with system toggles incl. **Dev Mode ∞**)
- `scripts/`: the chain: `boot-root.sh`, `start.sh` (sshd launcher with process guard),
  `init.d/` (`90-natxo-sshd`, `95-natxo-restore`, `98-natxo-daemon`, `99-suidtest`)

## Install (manual, root shell required once)
```sh
mkdir -p /media/developer/natxo/init.d /media/developer/natxo/openssh
cp scripts/boot-root.sh scripts/start.sh /media/developer/natxo/
cp scripts/init.d/* /media/developer/natxo/init.d/
chmod 755 /media/developer/natxo/*.sh /media/developer/natxo/init.d/*
# place your OpenSSH build (→ /media/developer/natxo/openssh/), plus:
#   hostkey          , RSA 2048 in PEM format! The TV's OpenSSH 6.1 can NOT read
#                       modern "OPENSSH PRIVATE KEY" files: ssh-keygen -t rsa -b 2048 -m PEM
#   authorized_keys  , your public key
# then prepend payload/shim-chokidar.js to:
#   /media/cryptofs/apps/usr/palm/services/com.palmdts.devmode.service/node_modules/chokidar/index.js
# (backup the original first; use /proc/1/root/… paths from jailed contexts)
```

## ⚠️ Critical lessons (learned the hard way)

1. **NEVER modify `devmode-helper.js`**: it is openssl-verified on every boot. On failure the
   helper simply does not start (`devmode-helper files verification is not valid`).
2. **NEVER modify `start-devmode.sh`**: it is the tripwire: a bad signature disables Dev Mode
   and triggers the wipe path.
3. The helper's verification key is read-only (`/usr/palm/services/com.palm.service.devmode/pub.pem`)
   and shared with the outer check, it cannot be removed or swapped.
4. The sshd must create `/var/run/sshd` (PrivSep) before starting or it dies **silently**.
5. Log everything to a file on the developer partition, early boot gives no other feedback.
6. `node --check` fails with `lstat` errors on `/proc/1/root/...` paths, test on `/tmp` copies.
7. Process guards must match the **exact path** (`/media/developer/natxo/openssh/sbin/sshd`): the Dev Mode sshd (`...devmode.service/openssh/sbin/sshd -p 9922`) shares the suffix and a
   loose pattern produces false positives (your sshd never starts and it *looks* like root is lost).
8. The TV has **no `ssh-keygen`**: generate the hostkey elsewhere (PEM format!) and ship it.
9. The exploit's root child runs inside the prisoner jail: it can write `/media/developer`
   but **cannot see `/proc/1/root`** (or plain cryptofs), the chokidar shim must be installed
   from a full root context (e.g. over SSH once `:22` is up). The one-click does this for you.

## Credits
- GPU credential-escalation exploit: **James McVay** (`gfx_cred_escalate.py`).
- RootMyTV / webosbrew community for the Dev Mode boot-chain research.
- Permanent-root chain (chokidar shim method), **v1**: Natxo, 2026-10-11.
