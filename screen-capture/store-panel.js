<script>
// Screen capture panel for a webOS 5 web app (NZ Store style).
// Drop this block before </body> in the app index.html. It adds a
// "Screen captures" section to the Control tab with capture now / in 10s / in 20s.
// The timer runs in the background daemon via POST /exec, so it still fires
// after you close the app and switch to another screen.
// Replace TOKENPLACEHOLDER with the token from /media/developer/natxo/daemon/token.
(function(){
  var TOKEN = "TOKENPLACEHOLDER";
  var TR = {
    es: { title:'Capturas de pantalla', desc:'Captura a máxima calidad (4K). Pulsa y tienes 10-20s para ir a la app o pantalla que quieras capturar. Se guarda en /tmp (se sobrescribe siempre) y se copia al pendrive USB si está puesto, en la carpeta nz-capturas.', now:'Capturar ya', t10:'Capturar en 10s', t20:'Capturar en 20s', wait:'ve a la pantalla que quieras capturar', done:'captura lista en /tmp/nz-cap.png (y en el pendrive si había)', working:'capturando...' },
    en: { title:'Screen captures', desc:'Maximum quality capture (4K). Press and you have 10-20s to go to the app or screen you want to capture. Saved to /tmp (always overwritten) and copied to the USB drive if present, in the nz-capturas folder.', now:'Capture now', t10:'Capture in 10s', t20:'Capture in 20s', wait:'go to the screen you want to capture', done:'capture ready in /tmp/nz-cap.png (and on the USB drive if present)', working:'capturing...' },
    it: { title:'Catture di schermo', desc:'Cattura alla massima qualità (4K). Premi e hai 10-20s per andare all\'app o schermo che vuoi catturare. Salvata in /tmp (sempre sovrascritta) e copiata sulla chiavetta USB se presente, nella cartella nz-capturas.', now:'Cattura ora', t10:'Cattura tra 10s', t20:'Cattura tra 20s', wait:'vai allo schermo che vuoi catturare', done:'cattura pronta in /tmp/nz-cap.png (e sulla chiavetta se presente)', working:'cattura in corso...' },
    fr: { title:'Captures d\'écran', desc:'Capture en qualité maximale (4K). Appuie et tu as 10-20s pour aller sur l\'app ou l\'écran à capturer. Enregistrée dans /tmp (toujours écrasée) et copiée sur la clé USB si présente, dans le dossier nz-capturas.', now:'Capturer maintenant', t10:'Capturer dans 10s', t20:'Capturer dans 20s', wait:'va sur l\'écran à capturer', done:'capture prête dans /tmp/nz-cap.png (et sur la clé USB si présente)', working:'capture en cours...' },
    de: { title:'Bildschirmaufnahmen', desc:'Aufnahme in maximaler Qualität (4K). Drücke und du hast 10-20s Zeit, zur App oder zum Bildschirm zu wechseln. Wird in /tmp gespeichert (immer überschrieben) und auf den USB-Stick kopiert, falls vorhanden, in den Ordner nz-capturas.', now:'Jetzt aufnehmen', t10:'In 10s aufnehmen', t20:'In 20s aufnehmen', wait:'geh zum Bildschirm, den du aufnehmen willst', done:'Aufnahme fertig in /tmp/nz-cap.png (und auf dem USB-Stick falls vorhanden)', working:'Aufnahme läuft...' },
    pt: { title:'Capturas de tela', desc:'Captura em qualidade máxima (4K). Carrega e tens 10-20s para ir à app ou tela que queres capturar. Guardada em /tmp (sempre substituída) e copiada para o pen USB se estiver ligado, na pasta nz-capturas.', now:'Capturar agora', t10:'Capturar em 10s', t20:'Capturar em 20s', wait:'vai para a tela que queres capturar', done:'captura pronta em /tmp/nz-cap.png (e no pen se existir)', working:'a capturar...' }
  };
  function lang(){ try { return localStorage.getItem('nz-lang') || 'es'; } catch(e){ return 'es'; } }
  function L(){ return TR[lang()] || TR.es; }
  function daemonPost(path, body, cb){
    if (typeof api === 'function') {
      api('POST', path, body).then(function(r){ cb(JSON.stringify(r)); }).catch(function(e){ cb('error'); });
    } else {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", "http://127.0.0.1:7777" + path, true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader("X-Natxo-Token", TOKEN);
      xhr.onload = function(){ cb(xhr.responseText); };
      xhr.onerror = function(){ cb('error conexion'); };
      xhr.send(JSON.stringify(body));
    }
  }
  function applyLang(){
    var b = document.getElementById('nzcap-block'); if (!b) return;
    var l = L();
    var msg = document.getElementById('nzcap-msg');
    var old = msg ? msg.textContent : '';
    b.querySelector('.nzcap-title').textContent = '\ud83d\udcf8 ' + l.title;
    b.querySelector('.nzcap-desc').textContent = l.desc;
    document.getElementById('nzcap-now').textContent = l.now;
    document.getElementById('nzcap-10').textContent = '\u23f1 ' + l.t10;
    document.getElementById('nzcap-20').textContent = '\u23f1 ' + l.t20;
    if (msg && msg.dataset.busy !== '1') msg.textContent = old;
  }
  function ready(){
    var sec = document.getElementById('sec-control');
    if (!sec || document.getElementById('nzcap-block')) return !!document.getElementById('nzcap-block');
    var box = document.createElement('div');
    box.id = 'nzcap-block';
    box.className = 'toggle';
    box.style.cssText = 'flex-direction:column;align-items:stretch;gap:12px;margin-top:16px';
    box.innerHTML = '<div><div class="t-name nzcap-title"></div><div class="t-desc nzcap-desc"></div></div>' +
      '<div style="display:flex;gap:12px;flex-wrap:wrap">' +
      '<button id="nzcap-now" class="nzcap-btn"></button>' +
      '<button id="nzcap-10" class="nzcap-btn"></button>' +
      '<button id="nzcap-20" class="nzcap-btn"></button></div>' +
      '<div id="nzcap-msg" class="t-desc"></div>';
    sec.appendChild(box);
    var st = document.createElement('style');
    st.textContent = '.nzcap-btn{font-size:17px;padding:12px 22px;background:#2b6cb0;color:#fff;border:0;border-radius:10px;cursor:pointer}.nzcap-btn:focus{outline:3px solid #fff}';
    document.head.appendChild(st);
    function fire(secs){
      var msg = document.getElementById('nzcap-msg');
      var l = L();
      msg.dataset.busy = '1';
      msg.textContent = secs ? ('\u23f1 ' + secs + 's... ' + l.wait) : ('\ud83d\udcf8 ' + l.working);
      daemonPost('/exec', {cmd: 'sh /tmp/nzcap-timer.sh ' + secs + ' &'}, function(resp){
        setTimeout(function(){
          msg.textContent = '\u2705 ' + l.done;
          msg.dataset.busy = '';
        }, (secs + 3) * 1000);
      });
    }
    document.getElementById('nzcap-now').onclick = function(){ fire(0); };
    document.getElementById('nzcap-10').onclick = function(){ fire(10); };
    document.getElementById('nzcap-20').onclick = function(){ fire(20); };
    applyLang();
    return true;
  }
  if (!ready()) { var iv = setInterval(function(){ if (ready()) clearInterval(iv); }, 500); }
  setInterval(applyLang, 1500);
})();
</script>
