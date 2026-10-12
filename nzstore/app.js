/* NZ Store by NatxoBSD, apps + toggles. Vanilla JS (sin frameworks). v1.1 + i18n */
'use strict';

var state = {
  tab: 'apps',
  packages: [],
  installed: [],
  toggles: {},
  focusIdx: 0,
  current: null,
  pollTimer: null
};

/* ---------- i18n ---------- */
var I18N = {
  es: {
    featured: '⭐ Destacados (curados por NatxoBSD)', catalog: '📦 Catálogo', all_repos: 'Todos los repos',
    ctrl_label: '🎛️ Ajustes rápidos (root)', ctrl_tab: 'Control',
    hint: 'Los cambios son inmediatos. Cuidado con SSH/Telnet: si los apagas, pierdes acceso remoto hasta reactivarlos desde la TV o la store.',
    install: '⬇️ Instalar', close: 'Cerrar', downloading: 'Descargando e instalando…',
    installed_badge: '✓ instalada', toast_installed: 'instalada', toast_failed: 'instalación fallida',
    empty: 'Sin resultados', no_desc: '(sin descripción)', no_ipk: 'Sin ipkUrl en el manifiesto',
    conn_bad: 'daemon caído', err_conn: 'Error de conexión con el daemon', err_generic: 'desconocido',
    err_toggle: 'Error al cambiar', toggles_down: 'Daemon caído, sin toggles',
    t_eco: 'Apagados automáticos (eco)', d_eco: 'OFF = la TV NUNCA se apaga sola (recomendado)',
    t_track: 'Rastreo LG (LivePlus)', d_track: 'OFF = sin rastreo de visualización (recomendado)',
    t_ssh: 'SSH root (:22)', d_ssh: 'Acceso remoto root, apagar = perder acceso remoto',
    t_telnet: 'Telnet (:23)', d_telnet: 'Shell root por red local (clave = token)',
    t_devext: 'Dev Mode ∞ (tiempo extendido)', d_devext: 'ON = la sesión del Dev Mode NUNCA caduca (contador siempre a tope)',
    st_downloading: 'Descargando…', st_verifying: 'Verificando…', st_installing: 'Instalando…',
    st_installed_msg: '¡Instalada!', st_failed: 'Instalación fallida',
    add_repo: '➕ Añadir repo', repo_title: 'Añadir repositorio', repo_ph: 'https://…/apps.json',
    save: 'Guardar', added: '✅ Repo añadido', bad_url: 'URL no válida, debe empezar por https:// y devolver apps',
    exists: 'Ese repo ya está añadido', no_custom: 'Sin repos propios, añade uno', del: '🗑️'
  },
  en: {
    featured: '⭐ Featured (curated by NatxoBSD)', catalog: '📦 Catalog', all_repos: 'All repos',
    ctrl_label: '🎛️ Quick settings (root)', ctrl_tab: 'Control',
    hint: 'Changes apply immediately. Careful with SSH/Telnet: turning them off loses remote access until re-enabled from the TV or the store.',
    install: '⬇️ Install', close: 'Close', downloading: 'Downloading and installing…',
    installed_badge: '✓ installed', toast_installed: 'installed', toast_failed: 'install failed',
    empty: 'No results', no_desc: '(no description)', no_ipk: 'No ipkUrl in the manifest',
    conn_bad: 'daemon down', err_conn: 'Daemon connection error', err_generic: 'unknown',
    err_toggle: 'Error changing', toggles_down: 'Daemon down, no toggles',
    t_eco: 'Auto power-off (eco)', d_eco: 'OFF = the TV NEVER turns off by itself (recommended)',
    t_track: 'LG tracking (LivePlus)', d_track: 'OFF = no viewing tracking (recommended)',
    t_ssh: 'SSH root (:22)', d_ssh: 'Root remote access, turning off loses remote access',
    t_telnet: 'Telnet (:23)', d_telnet: 'Root shell over local network (password = token)',
    t_devext: 'Dev Mode ∞ (extend time)', d_devext: 'ON = the Dev Mode session NEVER expires (counter kept full)',
    st_downloading: 'Downloading…', st_verifying: 'Verifying…', st_installing: 'Installing…',
    st_installed_msg: 'Installed!', st_failed: 'Install failed',
    add_repo: '➕ Add repo', repo_title: 'Add repository', repo_ph: 'https://…/apps.json',
    save: 'Save', added: '✅ Repo added', bad_url: 'Invalid URL, must start with https:// and return apps',
    exists: 'That repo is already added', no_custom: 'No custom repos, add one', del: '🗑️'
  },
  it: {
    featured: '⭐ In evidenza (curati da NatxoBSD)', catalog: '📦 Catalogo', all_repos: 'Tutti i repo',
    ctrl_label: '🎛️ Impostazioni rapide (root)', ctrl_tab: 'Controllo',
    hint: 'Le modifiche sono immediate. Attenzione con SSH/Telnet: disattivarli fa perdere l\'accesso remoto fino a riattivarli dalla TV o dallo store.',
    install: '⬇️ Installa', close: 'Chiudi', downloading: 'Scaricamento e installazione…',
    installed_badge: '✓ installata', toast_installed: 'installata', toast_failed: 'installazione fallita',
    empty: 'Nessun risultato', no_desc: '(nessuna descrizione)', no_ipk: 'Nessun ipkUrl nel manifesto',
    conn_bad: 'daemon giù', err_conn: 'Errore di connessione al daemon', err_generic: 'sconosciuto',
    err_toggle: 'Errore nel cambiare', toggles_down: 'Daemon giù, niente toggles',
    t_eco: 'Spegnimento automatico (eco)', d_eco: 'OFF = la TV NON si spegne MAI da sola (consigliato)',
    t_track: 'Tracciamento LG (LivePlus)', d_track: 'OFF = nessun tracciamento della visione (consigliato)',
    t_ssh: 'SSH root (:22)', d_ssh: 'Accesso remoto root, disattivarlo perde l\'accesso remoto',
    t_telnet: 'Telnet (:23)', d_telnet: 'Shell root in rete locale (password = token)',
    t_devext: 'Dev Mode ∞ (tempo esteso)', d_devext: 'ON = la sessione Dev Mode NON scade mai (contatore sempre pieno)',
    st_downloading: 'Scaricamento…', st_verifying: 'Verifica…', st_installing: 'Installazione…',
    st_installed_msg: 'Installata!', st_failed: 'Installazione fallita',
    add_repo: '➕ Aggiungi repo', repo_title: 'Aggiungi repository', repo_ph: 'https://…/apps.json',
    save: 'Salva', added: '✅ Repo aggiunto', bad_url: 'URL non valido, deve iniziare con https:// e restituire app',
    exists: 'Questo repo è già stato aggiunto', no_custom: 'Nessun repo personalizzato, aggiungine uno', del: '🗑️'
  },
  fr: {
    featured: '⭐ En vedette (sélection NatxoBSD)', catalog: '📦 Catalogue', all_repos: 'Tous les dépôts',
    ctrl_label: '🎛️ Réglages rapides (root)', ctrl_tab: 'Commandes',
    hint: 'Les changements sont immédiats. Attention avec SSH/Telnet : les couper fait perdre l\'accès distant jusqu\'à les réactiver depuis la TV ou le store.',
    install: '⬇️ Installer', close: 'Fermer', downloading: 'Téléchargement et installation…',
    installed_badge: '✓ installée', toast_installed: 'installée', toast_failed: 'installation échouée',
    empty: 'Aucun résultat', no_desc: '(pas de description)', no_ipk: 'Pas d\'ipkUrl dans le manifeste',
    conn_bad: 'daemon hors ligne', err_conn: 'Erreur de connexion au daemon', err_generic: 'inconnu',
    err_toggle: 'Erreur lors du changement', toggles_down: 'Daemon hors ligne, pas de toggles',
    t_eco: 'Extinction automatique (eco)', d_eco: 'OFF = la TV ne s\'éteint JAMAIS toute seule (recommandé)',
    t_track: 'Suivi LG (LivePlus)', d_track: 'OFF = pas de suivi de visionnage (recommandé)',
    t_ssh: 'SSH root (:22)', d_ssh: 'Accès distant root, couper = perdre l\'accès distant',
    t_telnet: 'Telnet (:23)', d_telnet: 'Shell root sur le réseau local (mot de passe = token)',
    t_devext: 'Dev Mode ∞ (temps étendu)', d_devext: 'ON = la session Dev Mode n\'expire JAMAIS (compteur toujours plein)',
    st_downloading: 'Téléchargement…', st_verifying: 'Vérification…', st_installing: 'Installation…',
    st_installed_msg: 'Installée !', st_failed: 'Installation échouée',
    add_repo: '➕ Ajouter un dépôt', repo_title: 'Ajouter un dépôt', repo_ph: 'https://…/apps.json',
    save: 'Enregistrer', added: '✅ Dépôt ajouté', bad_url: 'URL invalide, doit commencer par https:// et renvoyer des apps',
    exists: 'Ce dépôt est déjà ajouté', no_custom: 'Aucun dépôt perso, ajoutez-en un', del: '🗑️'
  },
  de: {
    featured: '⭐ Empfohlen (kuratiert von NatxoBSD)', catalog: '📦 Katalog', all_repos: 'Alle Repos',
    ctrl_label: '🎛️ Schnelleinstellungen (root)', ctrl_tab: 'Steuerung',
    hint: 'Änderungen gelten sofort. Vorsicht bei SSH/Telnet: Ausschalten = Fernzugriff verloren, bis wieder aktiviert.',
    install: '⬇️ Installieren', close: 'Schließen', downloading: 'Wird heruntergeladen und installiert…',
    installed_badge: '✓ installiert', toast_installed: 'installiert', toast_failed: 'Installation fehlgeschlagen',
    empty: 'Keine Ergebnisse', no_desc: '(keine Beschreibung)', no_ipk: 'Keine ipkUrl im Manifest',
    conn_bad: 'daemon offline', err_conn: 'Daemon-Verbindungsfehler', err_generic: 'unbekannt',
    err_toggle: 'Fehler beim Ändern', toggles_down: 'Daemon offline, keine Toggles',
    t_eco: 'Automatische Ausschaltung (eco)', d_eco: 'OFF = das TV schaltet sich NIE von selbst aus (empfohlen)',
    t_track: 'LG-Tracking (LivePlus)', d_track: 'OFF = keine Seh-Verfolgung (empfohlen)',
    t_ssh: 'SSH root (:22)', d_ssh: 'Root-Fernzugriff, ausschalten = Zugriff verloren',
    t_telnet: 'Telnet (:23)', d_telnet: 'Root-Shell im lokalen Netzwerk (Passwort = token)',
    t_devext: 'Dev Mode ∞ (Zeit verlängert)', d_devext: 'ON = die Dev-Mode-Sitzung läuft NIE ab (Zähler immer voll)',
    st_downloading: 'Wird heruntergeladen…', st_verifying: 'Überprüfung…', st_installing: 'Installation…',
    st_installed_msg: 'Installiert!', st_failed: 'Installation fehlgeschlagen',
    add_repo: '➕ Repo hinzufügen', repo_title: 'Repository hinzufügen', repo_ph: 'https://…/apps.json',
    save: 'Speichern', added: '✅ Repo hinzugefügt', bad_url: 'Ungültige URL, muss mit https:// beginnen und Apps liefern',
    exists: 'Dieses Repo ist bereits vorhanden', no_custom: 'Keine eigenen Repos, füge eines hinzu', del: '🗑️'
  },
  pt: {
    featured: '⭐ Destaques (curados por NatxoBSD)', catalog: '📦 Catálogo', all_repos: 'Todos os repositórios',
    ctrl_label: '🎛️ Definições rápidas (root)', ctrl_tab: 'Controlo',
    hint: 'As alterações são imediatas. Cuidado com SSH/Telnet: desligá-los perde o acesso remoto até reativar.',
    install: '⬇️ Instalar', close: 'Fechar', downloading: 'Baixando e instalando…',
    installed_badge: '✓ instalada', toast_installed: 'instalada', toast_failed: 'instalação falhou',
    empty: 'Sem resultados', no_desc: '(sem descrição)', no_ipk: 'Sem ipkUrl no manifesto',
    conn_bad: 'daemon fora do ar', err_conn: 'Erro de conexão com o daemon', err_generic: 'desconhecido',
    err_toggle: 'Erro ao alterar', toggles_down: 'Daemon fora do ar, sem toggles',
    t_eco: 'Desligamento automático (eco)', d_eco: 'OFF = a TV NUNCA se desliga sozinha (recomendado)',
    t_track: 'Rastreamento LG (LivePlus)', d_track: 'OFF = sem rastreamento de visualização (recomendado)',
    t_ssh: 'SSH root (:22)', d_ssh: 'Acesso remoto root, desligar = perder acesso remoto',
    t_telnet: 'Telnet (:23)', d_telnet: 'Shell root na rede local (senha = token)',
    t_devext: 'Dev Mode ∞ (tempo estendido)', d_devext: 'ON = a sessão Dev Mode NUNCA expira (contador sempre cheio)',
    st_downloading: 'Baixando…', st_verifying: 'Verificando…', st_installing: 'Instalando…',
    st_installed_msg: 'Instalada!', st_failed: 'Instalação falhou',
    add_repo: '➕ Adicionar repo', repo_title: 'Adicionar repositório', repo_ph: 'https://…/apps.json',
    save: 'Guardar', added: '✅ Repo adicionado', bad_url: 'URL inválida, deve começar com https:// e devolver apps',
    exists: 'Esse repositório já foi adicionado', no_custom: 'Sem repositórios próprios, adiciona um', del: '🗑️'
  }
};
var LANG = (function () {
  try { return localStorage.getItem('nz-lang') || 'es'; } catch (e) { return 'es'; }
})();
function t(k) { return (I18N[LANG] || I18N.es)[k] || I18N.es[k] || k; }

var BASE_REPOS = [
  { id: 'webosbrew', name: 'webosbrew', url: 'https://repo.webosbrew.org/api/apps.json' },
  { id: 'nonfree', name: 'webosbrew non-free', url: 'https://repo.webosbrew.org/api/non-free/apps.json' },
  { id: 'stremio', name: 'Stremio', url: 'https://raw.githubusercontent.com/kieranbrown/stremio-webos/main/webosbrew/apps.json' }
];
var REPOS = BASE_REPOS.slice();

// User custom repos (persisted in localStorage)
function loadCustomRepos() {
  try {
    var raw = localStorage.getItem('nz-repos');
    var arr = raw ? JSON.parse(raw) : [];
    if (arr && arr.length) REPOS = BASE_REPOS.concat(arr);
  } catch (e) { REPOS = BASE_REPOS.slice(); }
}
function saveCustomRepos() {
  try { localStorage.setItem('nz-repos', JSON.stringify(REPOS.slice(BASE_REPOS.length))); } catch (e) {}
}

// Featured curated by NatxoBSD (by title keywords)
var FEATURED = ['kodi', 'jellyfin', 'immich', 'moonlight', 'retroarch', 'vnc', 'youtube', 'hyperion', 'piccap', 'pinball'];

var TOGGLES = [
  { name: 'eco', title: 't_eco', desc: 'd_eco' },
  { name: 'tracking', title: 't_track', desc: 'd_track' },
  { name: 'ssh', title: 't_ssh', desc: 'd_ssh' },
  { name: 'telnet', title: 't_telnet', desc: 'd_telnet' },
  { name: 'devext', title: 't_devext', desc: 'd_devext' }
];

function $(id) { return document.getElementById(id); }

// Safe setter: a missing id must never crash the whole app
function setTxt(id, txt) { var el = $(id); if (el) el.textContent = txt; }

// Focus + scroll: on the TV webview focus does NOT auto-scroll (top cards would "disappear")
function focusEl(el) {
  if (!el) return;
  el.focus();
  try { el.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {}
}

// Friendly install status (raw LG JSON scares users: "verified": false != error)
function friendlyStatus(raw) {
  raw = raw || '';
  if (/install failed|"reason"/.test(raw)) return '⚠ ' + t('st_failed');
  if (/"state": "installed"/.test(raw)) return '✅ ' + t('st_installed_msg');
  if (/installing/.test(raw)) return '📦 ' + t('st_installing');
  if (/verifying/.test(raw)) return '🔍 ' + t('st_verifying');
  return '⬇️ ' + t('st_downloading');
}

function fmtSize(b) {
  if (!b) return '';
  return b < 1048576 ? Math.round(b / 1024) + ' KB' : Math.round(b / 1048576) + ' MB';
}

// Leave a trace of any JS error on the TV (/tmp/nzstore-js.log) for remote debugging
window.onerror = function (msg, src, line) {
  try {
    var safe = String(msg).replace(/["'\\]/g, '_');
    var xhr = new XMLHttpRequest();
    xhr.open('POST', NZ_API + '/exec', true);
    xhr.setRequestHeader('X-Natxo-Token', NZ_TOKEN);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({ cmd: 'echo "' + safe + ' @' + line + '" >> /tmp/nzstore-js.log' }));
  } catch (e) {}
};

function api(method, path, body) {
  return fetch(NZ_API + path, {
    method: method,
    headers: { 'X-Natxo-Token': NZ_TOKEN, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  }).then(function (r) { return r.json(); });
}

function toast(msg) {
  var el = $('toast');
  el.textContent = msg;
  el.hidden = false;
  setTimeout(function () { el.hidden = true; }, 3200);
}

function applyLang() {
  try { localStorage.setItem('nz-lang', LANG); } catch (e) {}
  Array.prototype.slice.call(document.querySelectorAll('.lang-chip')).forEach(function (c) {
    c.className = 'lang-chip' + (c.dataset.lang === LANG ? ' active' : '');
  });
  setTxt('featured-label', t('featured'));
  setTxt('cat-label', t('catalog'));
  setTxt('ctrl-label', t('ctrl_label'));
  setTxt('tab-control-txt', t('ctrl_tab'));
  setTxt('ctrl-hint', t('hint'));
  setTxt('m-install', t('install'));
  setTxt('m-close', t('close'));
  setTxt('empty', t('empty'));
  setTxt('add-repo-btn', t('add_repo'));
  setTxt('r-title', t('repo_title'));
  setTxt('r-save', t('save'));
  setTxt('r-close', t('close'));
  var ru = $('r-url'); if (ru) ru.placeholder = t('repo_ph');
  renderRepoSel();
  renderRepoList();
  renderAll();
  if (state.tab === 'control') renderToggles();
}

/* ---------- connection ---------- */
function checkConn() {
  api('GET', '/status').then(function (s) {
    var c = $('conn');
    c.textContent = '● daemon v' + (s.version || '?').split(' ').pop() + (s.root ? ' root' : '');
    c.className = 'conn ok';
  }).catch(function () {
    var c = $('conn');
    c.textContent = '● ' + t('conn_bad');
    c.className = 'conn bad';
  });
}

/* ---------- catalog ---------- */
function loadRepos() {
  var sel = $('repo-sel');
  renderRepoSel();

  var merged = [];
  var pending = REPOS.length;
  REPOS.forEach(function (repo) {
    fetch(repo.url).then(function (r) { return r.json(); }).then(function (data) {
      (data.packages || []).forEach(function (p) {
        p._repo = repo.name;
        merged.push(p);
      });
    }).catch(function () {
      console.log('repo caido: ' + repo.url);
    }).then(function () {
      pending--;
      if (pending === 0) {
        var seen = {};
        state.packages = merged.filter(function (p) {
          if (seen[p.id]) return false;
          seen[p.id] = true;
          return true;
        });
        renderAll();
      }
    });
  });

  sel.onchange = renderAll;
}

// The selector re-translates on language change (keeps the selection)
function renderRepoSel() {
  var sel = $('repo-sel');
  var keep = sel.value || 'all';
  sel.innerHTML = '<option value="all">' + t('all_repos') + '</option>' +
    REPOS.map(function (r) { return '<option value="' + r.id + '">' + r.name + '</option>'; }).join('');
  sel.value = keep;
}

function cardHtml(p, idx, installed) {
  var icon = (p.manifest && p.manifest.iconUri) || p.iconUri || '';
  return '<div class="card" tabindex="0" data-idx="' + idx + '">' +
    '<img src="' + icon + '" alt="">' +
    '<div class="name">' + (p.title || p.id) + '</div>' +
    (installed ? '<div class="badge">' + t('installed_badge') + '</div>' : '') +
    '</div>';
}

function renderAll() {
  var repoSel = $('repo-sel').value;
  var pkgs = state.packages.filter(function (p) {
    if (repoSel !== 'all') {
      var r = REPOS.filter(function (x) { return x.id === repoSel; })[0];
      if (r && r.name !== p._repo) return false;
    }
    return true;
  });

  var isInstalled = function (p) { return state.installed.indexOf(p.id) >= 0; };

  var f = pkgs.filter(function (p) {
    var ttl = (p.title || '').toLowerCase();
    return FEATURED.some(function (k) { return ttl.indexOf(k) >= 0; });
  }).slice(0, 12);
  $('featured').innerHTML = f.map(function (p) {
    return cardHtml(p, state.packages.indexOf(p), isInstalled(p));
  }).join('');
  $('featured-label').hidden = f.length === 0;

  $('grid').innerHTML = pkgs.map(function (p) {
    return cardHtml(p, state.packages.indexOf(p), isInstalled(p));
  }).join('');
  $('empty').hidden = pkgs.length > 0;

  var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
  cards.forEach(function (c) {
    c.addEventListener('click', function () { openDetail(parseInt(c.dataset.idx, 10)); });
    c.addEventListener('focus', function () { state.focusIdx = cards.indexOf(c); });
  });
  if (cards.length) focusEl(cards[Math.min(state.focusIdx, cards.length - 1)]);
}

function openDetail(idx) {
  var p = state.packages[idx];
  if (!p) return;
  state.current = p;
  var m = p.manifest || {};
  $('m-icon').src = (m.iconUri || p.iconUri || '');
  $('m-title').textContent = p.title || p.id;
  $('m-meta').textContent = (m.version ? 'v' + m.version + ' · ' : '') + (fmtSize(m.ipkSize) ? (fmtSize(m.ipkSize) + ' · ') : '') + (p._repo || '') + (m.sourceUrl ? ' · ' + m.sourceUrl : '');
  $('m-desc').textContent = m.appDescription || p.shortDescription || t('no_desc');
  $('m-log').textContent = '';
  $('modal').hidden = false;
  focusEl($('m-install'));
  $('m-install').onclick = function () { installCurrent(); };
  $('m-close').onclick = function () { closeDetail(); };
}

function closeDetail() {
  $('modal').hidden = true;
  if (state.pollTimer) { clearInterval(state.pollTimer); state.pollTimer = null; }
  var cards = document.querySelectorAll('.card');
  if (cards.length) cards[Math.min(state.focusIdx, cards.length - 1)].focus();
}

function resolveIpUrl(mm, p) {
  var u = mm.ipkUrl || '';
  if (u && !/^https?:/i.test(u) && p.manifestUrl) {
    try { u = new URL(u, p.manifestUrl).href; } catch (e) {}
  }
  return u;
}

function installCurrent() {
  var p = state.current;
  if (!p) return;
  var m = p.manifest || {};
  if (m.ipkUrl) { doInstall(p, resolveIpUrl(m, p)); return; }
  // kieranbrown-style repo: manifestUrl ONLY (no inline manifest) -> fetch it now
  if (!p.manifestUrl) { $('m-log').textContent = t('no_ipk'); return; }
  $('m-log').textContent = t('downloading');
  fetch(p.manifestUrl).then(function (r) { return r.json(); }).then(function (mm) {
    mm = mm || {};
    if (!mm.ipkUrl) { $('m-log').textContent = t('no_ipk'); return; }
    p.manifest = mm;
    doInstall(p, resolveIpUrl(mm, p));
  }).catch(function () { $('m-log').textContent = t('err_conn'); });
}

function doInstall(p, ipkUrl) {
  $('m-log').textContent = t('downloading');
  api('POST', '/app/install', { url: ipkUrl, name: p.id }).then(function (r) {
    if (!r.ok) { $('m-log').textContent = 'Error: ' + (r.error || t('err_generic')); return; }
    if (state.pollTimer) clearInterval(state.pollTimer);
    state.pollTimer = setInterval(function () {
      api('GET', '/app/log').then(function (x) {
        var raw = x.log || '';
        $('m-log').textContent = friendlyStatus(raw);
        if (raw.indexOf('"state": "installed"') >= 0) {
          clearInterval(state.pollTimer); state.pollTimer = null;
          toast('✅ ' + (p.title || p.id) + ', ' + t('toast_installed'));
          refreshInstalled();
        } else if (raw.indexOf('install failed') >= 0) {
          clearInterval(state.pollTimer); state.pollTimer = null;
          toast('⚠ ' + t('toast_failed'));
        }
      });
    }, 2500);
  }).catch(function () { $('m-log').textContent = t('err_conn'); });
}

function refreshInstalled() {
  api('GET', '/app/installed').then(function (r) {
    state.installed = (r.dev || []).concat(r.store || []);
  }).catch(function () {});
}

/* ---------- repos propios ---------- */
function openRepoModal() {
  $('r-url').value = '';
  renderRepoList();
  $('modal-repo').hidden = false;
  focusEl($('r-url'));
  $('r-save').onclick = function () { addRepo(); };
  $('r-close').onclick = function () { closeRepoModal(); };
}
function closeRepoModal() {
  $('modal-repo').hidden = true;
  focusEl($('add-repo-btn'));
}
function renderRepoList() {
  var custom = REPOS.slice(BASE_REPOS.length);
  if (!custom.length) {
    $('r-list').innerHTML = '<div class="r-empty">' + t('no_custom') + '</div>';
    return;
  }
  $('r-list').innerHTML = custom.map(function (r) {
    return '<div class="r-item"><span>' + r.name + '</span>' +
      '<button class="r-del" data-id="' + r.id + '" tabindex="0">' + t('del') + '</button></div>';
  }).join('');
  Array.prototype.slice.call(document.querySelectorAll('.r-del')).forEach(function (b) {
    b.addEventListener('click', function () { removeRepo(b.dataset.id); });
  });
}
function addRepo() {
  var u = ($('r-url').value || '').trim();
  if (!/^https?:\/\//.test(u)) { toast(t('bad_url')); return; }
  if (REPOS.some(function (r) { return r.url === u; })) { toast(t('exists')); return; }
  // real validation: it must return JSON with packages[]
  fetch(u).then(function (r) { return r.json(); }).then(function (data) {
    if (!data || !data.packages || !data.packages.length) { toast(t('bad_url')); return; }
    var repo = { id: 'c' + Date.now(), name: u.split('/')[2] || u, url: u };
    REPOS.push(repo);
    saveCustomRepos();
    renderRepoList();
    renderRepoSel();
    $('r-url').value = '';
    toast(t('added'));
    loadRepos();
  }).catch(function () { toast(t('bad_url')); });
}
function removeRepo(id) {
  REPOS = REPOS.filter(function (r) { return r.id !== id; });
  saveCustomRepos();
  renderRepoList();
  renderRepoSel();
  loadRepos();
}

/* ---------- control ---------- */
function renderToggles() {
  api('GET', '/toggle').then(function (r) {
    state.toggles = r.toggles || {};
    $('toggles').innerHTML = TOGGLES.map(function (tg) {
      var on = state.toggles[tg.name] === 'on';
      return '<div class="toggle" tabindex="0" data-toggle="' + tg.name + '">' +
        '<div><div class="t-name">' + t(tg.title) + '</div><div class="t-desc">' + t(tg.desc) + '</div></div>' +
        '<div class="switch' + (on ? ' on' : '') + '"></div></div>';
    }).join('');
    Array.prototype.slice.call(document.querySelectorAll('.toggle')).forEach(function (el) {
      el.addEventListener('click', function () { flipToggle(el.dataset.toggle); });
    });
    // do not steal focus while on the tabs (left/right navigation); otherwise back to the remembered toggle
    var aeNow = document.activeElement;
    if (aeNow !== $('tab-apps') && aeNow !== $('tab-control')) {
      var list = Array.prototype.slice.call(document.querySelectorAll('.toggle'));
      if (list.length) focusEl(list[Math.min(state.toggleIdx || 0, list.length - 1)]);
    }
  }).catch(function () { toast(t('toggles_down')); });
}

function flipToggle(name) {
  var cur = state.toggles[name] === 'on';
  api('POST', '/toggle', { name: name, on: !cur }).then(function (r) {
    if (r.ok) {
      state.toggles[name] = r.result.value;
      toast(name + ' → ' + r.result.value);
      renderToggles();
    }
  }).catch(function () { toast(t('err_toggle') + ' ' + name); });
}

/* ---------- tabs + teclado (mando) ---------- */
function setTab(tab) {
  state.tab = tab;
  $('tab-apps').className = 'tab' + (tab === 'apps' ? ' active' : '');
  $('tab-control').className = 'tab' + (tab === 'control' ? ' active' : '');
  $('sec-apps').hidden = tab !== 'apps';
  $('sec-control').hidden = tab !== 'control';
  if (tab === 'control') renderToggles();
}

function gridMove(dx, dy) {
  var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
  if (!cards.length) return;
  var cols = 6;
  if (dy < 0 && state.focusIdx < cols) { focusEl($('repo-sel')); return; } // fila superior → barra de herramientas
  var i = state.focusIdx + dx + dy * cols;
  if (i < 0) i = 0;
  if (i >= cards.length) i = cards.length - 1;
  state.focusIdx = i;
  focusEl(cards[i]);
}

document.addEventListener('keydown', function (e) {
  if (!$('modal').hidden) {
    if (e.keyCode === 461 || e.keyCode === 27 || e.keyCode === 8) { closeDetail(); e.preventDefault(); }
    else if (e.keyCode === 37) { $('m-install').focus(); e.preventDefault(); }
    else if (e.keyCode === 39) { $('m-close').focus(); e.preventDefault(); }
    return;
  }
  // Global BACK: close repo modal -> back to Apps -> (on Apps) leave the app (TV standard)
  if (e.keyCode === 461) {
    if (!$('modal-repo').hidden) { closeRepoModal(); e.preventDefault(); }
    else if (state.tab === 'control') { setTab('apps'); focusEl($('tab-apps')); e.preventDefault(); }
    return;
  }
  if (e.keyCode === 13) { // remote OK
    var ae = document.activeElement;
    if (ae && ae.classList && ae.classList.contains('card')) { openDetail(parseInt(ae.dataset.idx, 10)); e.preventDefault(); }
    else if (ae && ae.classList && ae.classList.contains('toggle')) { flipToggle(ae.dataset.toggle); e.preventDefault(); }
    else if (ae && ae.id === 'r-url') { addRepo(); e.preventDefault(); }
    return; // botones nativos: Enter ya dispara click
  }
  // modal añadir repo: ↑↓ y ←→ recorren sus controles (dentro del input ←→ es texto)
  if (!$('modal-repo').hidden) {
    var flat = Array.prototype.slice.call(document.querySelectorAll('#modal-repo [tabindex]'));
    var fi = flat.indexOf(document.activeElement);
    if (e.keyCode === 27) { closeRepoModal(); e.preventDefault(); }
    else if (e.keyCode === 38) { focusEl(flat[Math.max(0, fi - 1)]); e.preventDefault(); }
    else if (e.keyCode === 40) { focusEl(flat[Math.min(flat.length - 1, fi + 1)]); e.preventDefault(); }
    else if ((e.keyCode === 37 || e.keyCode === 39) && document.activeElement.id !== 'r-url') {
      focusEl(flat[e.keyCode === 37 ? Math.max(0, fi - 1) : Math.min(flat.length - 1, fi + 1)]);
      e.preventDefault();
    }
    return;
  }
  // chips de idioma: L/R entre chips, abajo → pestañas
  if (document.activeElement && document.activeElement.classList && document.activeElement.classList.contains('lang-chip')) {
    var chips = Array.prototype.slice.call(document.querySelectorAll('.lang-chip'));
    var ci = chips.indexOf(document.activeElement);
    if (e.keyCode === 37) { focusEl(chips[Math.max(0, ci - 1)]); e.preventDefault(); }
    else if (e.keyCode === 39) { focusEl(chips[Math.min(chips.length - 1, ci + 1)]); e.preventDefault(); }
    else if (e.keyCode === 40) { focusEl(state.tab === 'apps' ? $('tab-apps') : $('tab-control')); e.preventDefault(); }
    return;
  }
  // pestañas Apps/Control: L/R cambia de pestaña, arriba → chips, abajo → contenido
  if (document.activeElement === $('tab-apps') || document.activeElement === $('tab-control')) {
    if (e.keyCode === 37) { setTab('apps'); focusEl($('tab-apps')); e.preventDefault(); }
    else if (e.keyCode === 39) { setTab('control'); focusEl($('tab-control')); e.preventDefault(); }
    else if (e.keyCode === 38) { focusEl(document.querySelector('.lang-chip.active') || document.querySelector('.lang-chip')); e.preventDefault(); }
    else if (e.keyCode === 40) {
      if (state.tab === 'control') { var t0 = document.querySelector('.toggle'); if (t0) focusEl(t0); }
      else focusEl($('repo-sel'));
      e.preventDefault();
    }
    return;
  }
  // barra de herramientas (selector de repos + botón añadir): L/R entre ellos
  if (document.activeElement === $('repo-sel') || document.activeElement === $('add-repo-btn')) {
    if (e.keyCode === 38) { focusEl(state.tab === 'apps' ? $('tab-apps') : $('tab-control')); e.preventDefault(); }
    else if (e.keyCode === 40) {
      var cs = document.querySelectorAll('.card');
      if (cs.length) { state.focusIdx = 0; focusEl(cs[0]); }
      e.preventDefault();
    }
    else if (e.keyCode === 37) { focusEl($('repo-sel')); e.preventDefault(); }
    else if (e.keyCode === 39) { focusEl($('add-repo-btn')); e.preventDefault(); }
    return;
  }
  // pestaña control: arriba/abajo entre toggles (arriba del primero → pestañas)
  if (state.tab === 'control' && (e.keyCode === 38 || e.keyCode === 40)) {
    var tgs = Array.prototype.slice.call(document.querySelectorAll('.toggle'));
    if (tgs.length) {
      var ti = tgs.indexOf(document.activeElement);
      if (ti < 0) ti = 0;
      else if (e.keyCode === 38 && ti === 0) { focusEl($('tab-control')); e.preventDefault(); return; }
      else ti = e.keyCode === 38 ? Math.max(0, ti - 1) : Math.min(tgs.length - 1, ti + 1);
      state.toggleIdx = ti;
      focusEl(tgs[ti]);
    }
    e.preventDefault();
    return;
  }
  if (e.keyCode === 38) { // up
    if (state.tab === 'apps') gridMove(0, -1);
    e.preventDefault();
  } else if (e.keyCode === 40) { // down
    if (state.tab === 'apps') gridMove(0, 1);
    e.preventDefault();
  } else if (e.keyCode === 37) { // left
    if (state.tab === 'apps' && document.activeElement.id !== 'repo-sel' && document.activeElement.id !== 'lang-sel') gridMove(-1, 0);
    e.preventDefault();
  } else if (e.keyCode === 39) { // right
    if (state.tab === 'apps' && document.activeElement.id !== 'repo-sel' && document.activeElement.id !== 'lang-sel') gridMove(1, 0);
    e.preventDefault();
  } else if (e.keyCode === 461) { // BACK del mando
    if (state.tab === 'control') setTab('apps');
    e.preventDefault();
  }
});

$('tab-apps').addEventListener('click', function () { setTab('apps'); });
$('tab-control').addEventListener('click', function () { setTab('control'); });
$('add-repo-btn').addEventListener('click', function () { openRepoModal(); });
Array.prototype.slice.call(document.querySelectorAll('.lang-chip')).forEach(function (c) {
  c.addEventListener('click', function () {
    LANG = c.dataset.lang;
    applyLang();
  });
});

/* ---------- init ---------- */
applyLang();
checkConn();
loadCustomRepos();
loadRepos();
refreshInstalled();
setInterval(checkConn, 20000);
