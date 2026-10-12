#!/usr/bin/node
// NATXO daemon v2: local root API (127.0.0.1) + password telnet + app installer + NZ Store toggles
const http = require('http'), net = require('net'), fs = require('fs'), cp = require('child_process');
const BASE = '/media/developer/natxo';
const TOKEN = (fs.readFileSync(BASE + '/daemon/token', 'utf8') || '').trim();
const STATE = BASE + '/daemon/state.json';
const PORT = 7777, TELNET_PORT = 23;
const APPS = '/media/developer/apps';
const NZLOG = '/tmp/nzstore-install.log';

function log(m){ try { fs.appendFileSync(BASE + '/daemon/daemon.log', new Date().toISOString() + ' ' + m + '\n'); } catch(e){} }
function state(){ try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch(e){ return {telnet:false}; } }
function saveState(s){ fs.writeFileSync(STATE, JSON.stringify(s)); }
function sh(cmd, t){ return new Promise(r => cp.exec(cmd, {timeout: t || 20000}, (e, o, e2) => r((o || e2 || '').toString()))); }

// ---------- IPK = 'ar' archive -> extract data.tar.gz (no ar binary on the TV) ----------
function extractIpkData(buf){
  if (!buf || buf.length < 8 || buf.slice(0, 8).toString() !== '!<arch>\n') return null;
  let off = 8;
  while (off + 60 <= buf.length) {
    const h = buf.slice(off, off + 60);
    if (h.slice(58, 60).toString() !== '`\n') return null;
    let name = h.slice(0, 16).toString().trim();
    let size = parseInt(h.slice(48, 58).toString().trim(), 10);
    if (isNaN(size)) return null;
    let start = off + 60;
    if (name.indexOf('#1/') === 0) {
      const nl = parseInt(name.slice(3), 10) || 0;
      name = buf.slice(start, start + nl).toString().replace(/\0+$/, '');
      start += nl; size -= nl;
    } else {
      name = name.replace(/\/+$/, '');
    }
    if (name.indexOf('data.tar') === 0) return buf.slice(start, start + size);
    off = start + size + (size % 2);
  }
  return null;
}

// ---------- TOGGLES (NZ Store) ----------
// eco: eco category -> 8 on/off keys. tracking: option/livePlus.
const ECO_KEYS = ['autoPowerOff','noSignalAutoOff','noSignalScreenSaver','noActivityPowerOffHours','autoPowerOff2Hour','autoPowerOff2HourMute','enSleepTimer','sleepTimer'];
function ecoSettings(v){ const s = {}; ECO_KEYS.forEach(k => s[k] = v); return JSON.stringify({category:'eco', settings:s}); }

async function getToggle(name){
  if (name === 'eco') {
    const out = await sh(`luna-send -n 1 -f luna://com.webos.settingsservice/getSystemSettings '{"category":"eco","keys":["autoPowerOff"]}'`, 15000);
    const m = out.match(/"autoPowerOff":\s*"([^"]+)"/);
    return { name, value: m ? m[1] : 'unknown' };
  }
  if (name === 'tracking') {
    const out = await sh(`luna-send -n 1 -f luna://com.webos.settingsservice/getSystemSettings '{"category":"option","keys":["livePlus"]}'`, 15000);
    const m = out.match(/"livePlus":\s*"([^"]+)"/);
    return { name, value: m ? m[1] : 'unknown' };
  }
  if (name === 'ssh') {
    const out = await sh(`for p in /proc/[0-9]*/cmdline; do c=$(tr '\\0' ' ' < $p 2>/dev/null); case "$c" in */media/developer/natxo/openssh/sbin/sshd*) echo ON;; esac; done | head -1`, 15000);
    return { name, value: out.indexOf('ON') >= 0 ? 'on' : 'off' };
  }
  if (name === 'telnet') return { name, value: state().telnet ? 'on' : 'off' };
  if (name === 'devext') return { name, value: state().devext ? 'on' : 'off' };
  return { name, value: 'unknown' };
}

// ---------- DEVMODE ∞ (extend time) ----------
// devkey.js: remaining = file value - (now - mtime). Writing devSessionTime
// resets value+mtime at once, so the Dev Mode session never expires.
let devextTimer = null;
const DEVSESSION_PATHS = [
  '/proc/1/root/media/cryptofs/apps/usr/palm/services/com.palmdts.devmode.service/devSessionTime',
  '/media/cryptofs/apps/usr/palm/services/com.palmdts.devmode.service/devSessionTime'
];
function refreshDevSession(){
  let ok = false;
  for (const p of DEVSESSION_PATHS) {
    try { fs.writeFileSync(p, '999:59:59'); ok = true; } catch (e) {}
  }
  if (ok) log('devext refresh ok');
}
function startDevExt(){ if (devextTimer) return; refreshDevSession(); devextTimer = setInterval(refreshDevSession, 30 * 60 * 1000); }
function stopDevExt(){ if (devextTimer) { clearInterval(devextTimer); devextTimer = null; } }

async function setToggle(name, on){
  const v = on ? 'on' : 'off';
  if (name === 'eco') {
    const out = await sh(`luna-send -n 1 -f luna://com.webos.settingsservice/setSystemSettings '` + ecoSettings(v) + `'`, 15000);
    log('toggle eco=' + v); return { name, value: v, out: out.slice(0, 120) };
  }
  if (name === 'tracking') {
    const out = await sh(`luna-send -n 1 -f luna://com.webos.settingsservice/setSystemSettings '{"category":"option","settings":{"livePlus":"` + v + `"}}'`, 15000);
    log('toggle tracking=' + v); return { name, value: v, out: out.slice(0, 120) };
  }
  if (name === 'ssh') {
    if (on) {
      await sh(`sh ${BASE}/start.sh`, 20000);
    } else {
      await sh(`for p in /proc/[0-9]*/cmdline; do c=$(tr '\\0' ' ' < $p 2>/dev/null); case "$c" in */media/developer/natxo/openssh/sbin/sshd*) pid=${'$'}{p#/proc/}; pid=${'$'}{pid%/cmdline}; kill $pid 2>/dev/null;; esac; done`, 15000);
    }
    log('toggle ssh=' + v); return { name, value: v };
  }
  if (name === 'telnet') {
    const s = state(); s.telnet = on; saveState(s);
    if (on) startTelnet(); else stopTelnet();
    log('toggle telnet=' + v); return { name, value: v };
  }
  if (name === 'devext') {
    const s = state(); s.devext = on; saveState(s);
    if (on) startDevExt(); else stopDevExt();
    log('toggle devext=' + v); return { name, value: v };
  }
  return { name, value: 'unknown', error: 'toggle desconocido' };
}

// ---------- TELNET (only when enabled) ----------
let telnetSrv = null;
function startTelnet(){
  if (telnetSrv) return true;
  telnetSrv = net.createServer(sock => {
    sock.write('NATXO shell, password: ');
    let buf = '', authed = false, child = null;
    sock.on('data', d => {
      if (!authed) {
        buf += d.toString();
        if (buf.indexOf('\n') >= 0) {
          if (buf.trim() === TOKEN) {
            authed = true;
            sock.write('\nOK, root shell\n# ');
            child = cp.spawn('/bin/sh', ['-i'], {stdio: ['pipe','pipe','pipe']});
            child.stdout.on('data', x => sock.write(x));
            child.stderr.on('data', x => sock.write(x));
            child.on('exit', () => { sock.end('bye\n'); });
            buf = '';
          } else { sock.write('\nWRONG\n'); sock.end(); }
        }
      } else if (child) {
        child.stdin.write(d.toString());
      }
    });
    sock.on('close', () => { if (child) child.kill(); });
  });
  telnetSrv.on('error', e => log('telnet error ' + e));
  telnetSrv.listen(TELNET_PORT, '0.0.0.0', () => log('telnet ON :' + TELNET_PORT));
  return true;
}
function stopTelnet(){ if (telnetSrv) { try { telnetSrv.close(); } catch(e){} telnetSrv = null; log('telnet OFF'); } }

// ---------- API HTTP local ----------
function json(res, code, obj){ res.writeHead(code, {'Content-Type': 'application/json'}); res.end(JSON.stringify(obj)); }

const srv = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  if (req.method === 'GET' && url === '/status') {
    cp.exec('cat /proc/uptime | cut -d" " -f1', (e, up) => {
      json(res, 200, {
        root: process.getuid() === 0,
        uid: process.getuid(),
        telnet: !!telnetSrv,
        telnet_port: TELNET_PORT,
        uptime_s: parseFloat(up || '0'),
        version: 'natxo-daemon v2'
      });
    });
    return;
  }
  // resto: requiere token
  if ((req.headers['x-natxo-token'] || '') !== TOKEN) { json(res, 401, {error: 'bad token'}); return; }

  if (req.method === 'GET' && url === '/toggle') {
    (async () => {
      const names = ['eco','tracking','ssh','telnet','devext'];
      const out = {};
      for (const n of names) out[n] = (await getToggle(n)).value;
      json(res, 200, {ok: true, toggles: out});
    })();
  } else if (req.method === 'POST' && url === '/toggle') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', async () => {
      try {
        const o = JSON.parse(body);
        const r = await setToggle(o.name, !!o.on);
        json(res, 200, {ok: true, result: r});
      } catch (e) { json(res, 400, {error: 'JSON invalido'}); }
    });
  } else if (req.method === 'GET' && url === '/app/installed') {
    sh(`ls ${APPS}/usr/palm/applications/ 2>/dev/null; echo ---; ls /media/cryptofs/apps/usr/palm/applications/ 2>/dev/null`, 15000).then(out => {
      const [dev, store] = out.split('---');
      json(res, 200, {ok: true, dev: (dev || '').trim().split('\n').filter(Boolean), store: (store || '').trim().split('\n').filter(Boolean)});
    });
  } else if (req.method === 'GET' && url === '/app/log') {
    sh(`tail -12 ${NZLOG}`, 10000).then(out => json(res, 200, {ok: true, log: out}));
  } else if (req.method === 'POST' && url === '/app/install') {
    // REGISTERED INSTALL (dev/install with live subscription) -> launcher icon.
    // 1) download ipk  2) chmod 644  3) luna-send keep-alive  (proven recipe 2026-10-11)
    let body = '';
    req.on('data', d => body += d);
    req.on('end', async () => {
      try {
        const o = JSON.parse(body);
        const u = (o.url || '').trim();
        if (!/^https?:\/\//.test(u)) { json(res, 200, {ok: false, error: 'url http(s) requerida'}); return; }
        const fname = ((o.name || 'app').replace(/[^A-Za-z0-9._-]/g, '')).slice(0, 60) + '.ipk';
        const dest = BASE + '/apps/' + fname;
        const dl = await sh(`wget -q -O '${dest}' '${u.replace(/'/g, '')}' && chmod 644 '${dest}' && wc -c < '${dest}'`, 300000);
        const size = parseInt((dl || '').trim(), 10);
        if (!size) { log('app/install descarga fallida ' + u); json(res, 200, {ok: false, error: 'descarga fallida'}); return; }
        // JSON payload in a FILE: nested shells ate the quotes ("lexical error in json text")
        fs.writeFileSync('/tmp/nzp.json', JSON.stringify({id: 'testing', ipkUrl: dest, subscribe: true}));
        cp.exec(`setsid sh -c 'luna-send -n 30 -f luna://com.webos.appInstallService/dev/install "$(cat /tmp/nzp.json)" > ${NZLOG} 2>&1 < /dev/null' >/dev/null 2>&1 &`, {timeout: 3000});
        log('app/install lanzado ' + fname + ' (' + size + ' bytes)');
        json(res, 200, {ok: true, started: true, file: dest, size});
      } catch (e) { json(res, 400, {error: 'JSON invalido'}); }
    });
  } else if (req.method === 'POST' && (url === '/telnet/on' || url === '/telnet/off')) {
    const on = url.endsWith('/on');
    const s = state(); s.telnet = on; saveState(s);
    if (on) startTelnet(); else stopTelnet();
    json(res, 200, {telnet: on});
  } else if (req.method === 'POST' && url === '/install') {
    // ROOT INSTALL: parses the .ipk (ar) in place and extracts into the apps dir.
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const o = JSON.parse(body);
        const ipk = o.ipk || '';
        if (!ipk) { json(res, 200, {ok: false, error: 'ipk required (path on the TV, e.g. /tmp/app.ipk)'}); return; }
        if (!fs.existsSync(ipk)) { json(res, 200, {ok: false, error: 'no existe: ' + ipk}); return; }
        const data = extractIpkData(fs.readFileSync(ipk));
        if (!data) { json(res, 200, {ok: false, error: 'no es un .ipk valido (sin data.tar dentro)'}); return; }
        fs.writeFileSync('/tmp/natxo-ipk-data.tar.gz', data);
        cp.exec('tar tzf /tmp/natxo-ipk-data.tar.gz | head -40', {timeout: 20000}, (e1, list) => {
          const mm = (list || '').match(/usr\/palm\/applications\/([A-Za-z0-9._-]+)\//);
          if (!mm) { log('install-fallo: id no encontrado'); json(res, 200, {ok: false, error: 'id de app no encontrado dentro del ipk', out: (list || '').slice(0, 200)}); return; }
          const id = mm[1];
          const dest = APPS + '/usr/palm/applications/' + id;
          const cmd = 'rm -rf "' + dest + '" && tar xzf /tmp/natxo-ipk-data.tar.gz -C "' + APPS + '/" && echo INSTALADO';
          cp.exec(cmd, {timeout: 120000}, (e2, out2, err2) => {
            log('install ' + id + ' -> ' + (e2 ? 'ERR ' + ((err2 || '') + '').slice(0, 120) : 'OK'));
            json(res, 200, {ok: !e2, id: id, error: e2 ? ((err2 || '') + '').slice(0, 150) : undefined, out: ((out2 || err2) || '').trim().slice(0, 200)});
          });
        });
      } catch (e3) { json(res, 400, {error: 'JSON invalido'}); }
    });
  } else if (req.method === 'POST' && url === '/exec') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const o = JSON.parse(body);
        cp.exec(o.cmd || 'true', {timeout: 30000}, (e, out, err2) => {
          log('exec: ' + (o.cmd || '').slice(0, 80));
          json(res, 200, {ok: !e, out: (out || err2 || '').trim().slice(0, 2000)});
        });
      } catch (e2) { json(res, 400, {error: 'JSON invalido'}); }
    });
  } else {
    json(res, 404, {error: 'ruta desconocida'});
  }
});
srv.listen(PORT, '127.0.0.1', () => log('API ON 127.0.0.1:' + PORT + ' uid=' + process.getuid()));
if (state().telnet) startTelnet();
if (state().devext) startDevExt();
