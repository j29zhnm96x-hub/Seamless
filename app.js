let audioCtx, master, mediaDest, audioOut;
let volumeVal = 0.5;
let loopSource = null;
let loopGain = null;
let currentRate = 1.0;
const RATE_MIN = 0.5;
const RATE_MAX = 2.0;
// User-imported presets (persisted when possible)
const userPresets = [];

// Persist imported audio blobs across restarts via IndexedDB.
const UPLOAD_DB_NAME = 'seamlessplayer-uploads';
const UPLOAD_DB_VERSION = 1;
const UPLOAD_STORE = 'uploads';
const MAX_PERSISTED_UPLOADS = 25;

// Persist renamed loop titles without rewriting large Blob records.
// This avoids iOS/Safari instability when repeatedly re-putting Blob-heavy IndexedDB objects.
const UPLOAD_NAME_OVERRIDES_KEY = 'seamlessplayer-upload-name-overrides';

// Persist playlists across restarts via IndexedDB.
const PLAYLIST_DB_NAME = 'seamlessplayer-playlists';
const PLAYLIST_DB_VERSION = 1;
const PLAYLIST_STORE = 'playlists';

// Language (simple i18n)
const LANG_STORAGE_KEY = 'seamlessplayer-lang';
let currentLang = 'en';
const I18N = {
  en: {
    status_ready: 'Ready',
    status_stopped: 'Stopped',
    player_playlist_prefix: 'Playlist',
    tab_player: 'Player',
    tab_playlists: 'Playlists',
    tab_loops: 'Audio Loops',
    tab_settings: 'Settings',
    playlists_title: 'Playlists',
    playlists_new: '+ New',
    loops_title: 'Audio Loops',
    loops_hint: 'Built-ins and anything you imported during this session.',
    loops_import: 'Import Loop',
    loops_paste: 'Paste',
    loops_builtin: 'Built-in',
    loops_imported: 'IMPORTED',
    trimmer_info_hint: 'Drag the IN/OUT cursors to adjust loop points',
    trimmer_zoom: 'Zoom',
    trimmer_test: 'Test Loop',
    trimmer_stop: 'Stop',
    trimmer_save: 'Save',
    trimmer_reset: 'Reset',
    trimmer_set_in: 'Set IN',
    trimmer_set_out: 'Set OUT',
    trimmer_rename: 'Rename',
    trimmer_rename_prompt: 'Rename loop',
    trimmer_rename_placeholder: 'Loop name',
    settings_title: 'Settings',
    settings_data: 'Data',
    settings_export_main: 'Export Playlists & Loops',
    settings_export_hint: 'Download as JSON backup',
    settings_import_main: 'Import Playlists & Loops',
    settings_import_hint: 'Restore from JSON file',
    settings_appearance: 'Appearance',
    settings_theme: 'Theme',
    settings_theme_dark: 'Dark',
    settings_theme_light: 'Light',
    settings_language: 'Language',
    settings_about: 'About',
    settings_help_main: 'Help',
    settings_help_hint: 'How to use the app',
    help_title: 'Help',
    help_player_h: 'Player',
    help_player_p: 'Tap Play to start the loaded loop. Use the volume slider and rate jog to adjust playback. The Repeat button toggles whole-playlist looping.',
    help_playlists_h: 'Playlists',
    help_playlists_p: 'Create playlists and add loops to them. Tap a playlist to see its details — edit, reorder, or adjust per-loop volume.',
    help_loops_h: 'Audio Loops',
    help_loops_p: 'Browse built-in loops or import your own. Imported loops have an edit button to adjust loop start/end points.',
    help_trimmer_h: 'Trimmer',
    help_trimmer_p: 'Drag the green IN and red OUT cursors to set loop boundaries. Zoom in for precision. Tap Test Loop to hear the result before saving.',
    help_settings_h: 'Settings',
    help_settings_p: 'Export/import your data as JSON. Switch between dark and light themes.',
    help_close: 'Close',
    playlist_create_title: 'Create Playlist',
    playlist_name_label: 'Playlist name',
    playlist_name_placeholder: 'My playlist',
    playlist_create_btn: 'Create',
    common_close: 'Close',
    playlist_add: 'Add',
    playlist_play: 'Play'
  },
  hr: {
    status_ready: 'Spremno',
    status_stopped: 'Zaustavljeno',
    player_playlist_prefix: 'Playlista',
    tab_player: 'Reprodukcija',
    tab_playlists: 'Playliste',
    tab_loops: 'Audio petlje',
    tab_settings: 'Postavke',
    playlists_title: 'Playliste',
    playlists_new: '+ Novo',
    loops_title: 'Audio petlje',
    loops_hint: 'Ugrađene petlje i sve što ste uvezli tijekom ove sesije.',
    loops_import: 'Uvezi petlju',
    loops_paste: 'Zalijepi',
    loops_builtin: 'Ugrađeno',
    loops_imported: 'UVEZENO',
    trimmer_info_hint: 'Povucite IN/OUT pokazivače za podešavanje početka/kraja petlje',
    trimmer_zoom: 'Zum',
    trimmer_test: 'Testiraj petlju',
    trimmer_stop: 'Zaustavi',
    trimmer_save: 'Spremi',
    trimmer_reset: 'Vrati',
    trimmer_set_in: 'Postavi IN',
    trimmer_set_out: 'Postavi OUT',
    trimmer_rename: 'Preimenuj',
    trimmer_rename_prompt: 'Preimenuj petlju',
    trimmer_rename_placeholder: 'Naziv petlje',
    settings_title: 'Postavke',
    settings_data: 'Podaci',
    settings_export_main: 'Izvezi playliste i petlje',
    settings_export_hint: 'Preuzmi kao JSON sigurnosnu kopiju',
    settings_import_main: 'Uvezi playliste i petlje',
    settings_import_hint: 'Vrati iz JSON datoteke',
    settings_appearance: 'Izgled',
    settings_theme: 'Tema',
    settings_theme_dark: 'Tamna',
    settings_theme_light: 'Svijetla',
    settings_language: 'Jezik',
    settings_about: 'O aplikaciji',
    settings_help_main: 'Pomoć',
    settings_help_hint: 'Kako koristiti aplikaciju',
    help_title: 'Pomoć',
    help_player_h: 'Reprodukcija',
    help_player_p: 'Dodirnite Play za pokretanje učitane petlje. Koristite klizač glasnoće i kontrolu brzine za podešavanje reprodukcije. Gumb Repeat uključuje/isključuje ponavljanje playliste.',
    help_playlists_h: 'Playliste',
    help_playlists_p: 'Stvorite playliste i dodajte petlje. Dodirnite playlistu za detalje — uređivanje, promjenu redoslijeda ili glasnoću po petlji.',
    help_loops_h: 'Audio petlje',
    help_loops_p: 'Pregledajte ugrađene petlje ili uvezite svoje. Uvezene petlje imaju gumb za uređivanje obrezivanja početka/kraja petlje.',
    help_trimmer_h: 'Trimer',
    help_trimmer_p: 'Povucite zeleni IN i crveni OUT pokazivač za granice petlje. Zumirajte za preciznost. Dodirnite Testiraj petlju da čujete rezultat prije spremanja.',
    help_settings_h: 'Postavke',
    help_settings_p: 'Izvoz/uvoz podataka kao JSON. Prebacivanje između tamne i svijetle teme.',
    help_close: 'Zatvori',
    playlist_create_title: 'Nova playlista',
    playlist_name_label: 'Naziv playliste',
    playlist_name_placeholder: 'Moja playlista',
    playlist_create_btn: 'Stvori',
    common_close: 'Zatvori',
    playlist_add: 'Dodaj',
    playlist_play: 'Pokreni'
  }
};

function t(key) {
  const langTable = I18N[currentLang] || I18N.en;
  return (langTable && langTable[key]) || (I18N.en && I18N.en[key]) || key;
}

function getStoredLang() {
  try {
    const v = localStorage.getItem(LANG_STORAGE_KEY);
    return (v === 'hr' || v === 'en') ? v : 'en';
  } catch {
    return 'en';
  }
}

function setText(elOrSelector, text) {
  const el = typeof elOrSelector === 'string' ? document.querySelector(elOrSelector) : elOrSelector;
  if (!el) return;
  el.textContent = text;
}

function setButtonTextAfterSvg(btn, text) {
  if (!btn) return;
  try {
    // Collect non-text nodes (like SVG) and the new text
    const elements = Array.from(btn.childNodes).filter(n => n.nodeType !== Node.TEXT_NODE);
    btn.innerHTML = '';
    elements.forEach(el => btn.appendChild(el));
    btn.appendChild(document.createTextNode(text.startsWith(' ') ? text : ` ${text}`));
  } catch {
    try { btn.textContent = text; } catch {}
  }
}

function applyLanguage(lang) {
  currentLang = (lang === 'hr') ? 'hr' : 'en';
  try { document.documentElement.lang = currentLang; } catch {}
  try { localStorage.setItem(LANG_STORAGE_KEY, currentLang); } catch {}

  const langSelect = document.getElementById('langSelect');
  if (langSelect) {
    try { langSelect.value = currentLang; } catch {}
    try { langSelect.setAttribute('aria-label', t('settings_language')); } catch {}
  }

  // Tabs
  const tabPlayer = document.querySelector('.tabbar .tab[data-tab="player"]');
  const tabPlaylists = document.querySelector('.tabbar .tab[data-tab="playlists"]');
  const tabLoops = document.querySelector('.tabbar .tab[data-tab="loops"]');
  const tabSettings = document.querySelector('.tabbar .tab[data-tab="settings"]');
  if (tabPlayer) { tabPlayer.textContent = t('tab_player'); tabPlayer.setAttribute('aria-label', t('tab_player')); }
  if (tabPlaylists) { tabPlaylists.textContent = t('tab_playlists'); tabPlaylists.setAttribute('aria-label', t('tab_playlists')); }
  if (tabLoops) { tabLoops.textContent = t('tab_loops'); tabLoops.setAttribute('aria-label', t('tab_loops')); }
  if (tabSettings) { tabSettings.textContent = t('tab_settings'); tabSettings.setAttribute('aria-label', t('tab_settings')); }

  // Playlists page
  setText('#page-playlists .page-header h2', t('playlists_title'));
  const newPl = document.getElementById('newPlaylistFromPage');
  if (newPl) { newPl.textContent = t('playlists_new'); newPl.setAttribute('aria-label', t('playlists_new')); }

  // Loops page
  setText('#page-loops .card h2', t('loops_title'));
  setText('#page-loops .card .hint', t('loops_hint'));
  const importLoopBtn = document.getElementById('importLoop');
  if (importLoopBtn) { importLoopBtn.textContent = t('loops_import'); importLoopBtn.setAttribute('aria-label', t('loops_import')); }
  const pasteLoopBtn = document.getElementById('pasteBtn');
  if (pasteLoopBtn) { pasteLoopBtn.textContent = t('loops_paste'); pasteLoopBtn.setAttribute('aria-label', t('loops_paste')); }
  const loopsSectionTitles = document.querySelectorAll('#page-loops .list-section h3');
  if (loopsSectionTitles && loopsSectionTitles.length >= 2) {
    loopsSectionTitles[0].textContent = t('loops_builtin');
    loopsSectionTitles[1].textContent = t('loops_imported');
  }

  // Trimmer
  const trimInfo = document.getElementById('trimInfo');
  if (trimInfo) trimInfo.textContent = t('trimmer_info_hint');
  const zoomLabel = document.querySelector('label[for="trimZoom"]');
  if (zoomLabel) zoomLabel.textContent = t('trimmer_zoom');
  const btnTest = document.getElementById('trimPlayTest');
  if (btnTest) {
    setButtonTextAfterSvg(btnTest, t('trimmer_test'));
  }
  const btnStop = document.getElementById('trimStopTest');
  if (btnStop) { btnStop.textContent = t('trimmer_stop'); btnStop.setAttribute('aria-label', t('trimmer_stop')); }
  const btnSave = document.getElementById('trimSave');
  if (btnSave) { btnSave.textContent = t('trimmer_save'); btnSave.setAttribute('aria-label', t('trimmer_save')); }
  const btnReset = document.getElementById('trimReset');
  if (btnReset) { btnReset.textContent = t('trimmer_reset'); btnReset.setAttribute('aria-label', t('trimmer_reset')); }

  const btnSetIn = document.getElementById('trimSetIn');
  if (btnSetIn) { btnSetIn.textContent = t('trimmer_set_in'); btnSetIn.setAttribute('aria-label', t('trimmer_set_in')); }
  const btnSetOut = document.getElementById('trimSetOut');
  if (btnSetOut) { btnSetOut.textContent = t('trimmer_set_out'); btnSetOut.setAttribute('aria-label', t('trimmer_set_out')); }

  const btnRename = document.getElementById('trimRename');
  if (btnRename) { btnRename.textContent = t('trimmer_rename'); btnRename.setAttribute('aria-label', t('trimmer_rename')); }

  // Settings page
  setText('#page-settings .page-header h2', t('settings_title'));
  const sectionTitles = document.querySelectorAll('#page-settings .settings-section-title');
  if (sectionTitles && sectionTitles.length >= 4) {
    sectionTitles[0].textContent = t('settings_data');
    sectionTitles[1].textContent = t('settings_appearance');
    sectionTitles[2].textContent = t('settings_language');
    sectionTitles[3].textContent = t('settings_about');
  }
  const exportBtn = document.getElementById('exportJson');
  if (exportBtn) {
    const main = exportBtn.querySelector('.settings-item-main');
    const hint = exportBtn.querySelector('.settings-item-hint');
    if (main) main.textContent = t('settings_export_main');
    if (hint) hint.textContent = t('settings_export_hint');
  }
  const importBtn = document.getElementById('importJson');
  if (importBtn) {
    const main = importBtn.querySelector('.settings-item-main');
    const hint = importBtn.querySelector('.settings-item-hint');
    if (main) main.textContent = t('settings_import_main');
    if (hint) hint.textContent = t('settings_import_hint');
  }
  const themeRows = document.querySelectorAll('#page-settings .settings-toggle-row .settings-item-main');
  if (themeRows && themeRows.length >= 2) {
    themeRows[0].textContent = t('settings_theme');
    themeRows[1].textContent = t('settings_language');
  }
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    const darkBtn = themeToggle.querySelector('.theme-opt[data-theme="dark"]');
    const lightBtn = themeToggle.querySelector('.theme-opt[data-theme="light"]');
    if (darkBtn) { darkBtn.textContent = t('settings_theme_dark'); darkBtn.setAttribute('aria-label', t('settings_theme_dark')); }
    if (lightBtn) { lightBtn.textContent = t('settings_theme_light'); lightBtn.setAttribute('aria-label', t('settings_theme_light')); }
  }
  const helpBtn = document.getElementById('settingsHelp');
  if (helpBtn) {
    const main = helpBtn.querySelector('.settings-item-main');
    const hint = helpBtn.querySelector('.settings-item-hint');
    if (main) main.textContent = t('settings_help_main');
    if (hint) hint.textContent = t('settings_help_hint');
    helpBtn.setAttribute('aria-label', t('settings_help_main'));
  }

  // Playlist overlay
  setText('#playlistCreateView h2', t('playlist_create_title'));
  const plLabel = document.querySelector('label[for="playlistName"]');
  if (plLabel) plLabel.textContent = t('playlist_name_label');
  const plInput = document.getElementById('playlistName');
  if (plInput) plInput.setAttribute('placeholder', t('playlist_name_placeholder'));
  const createBtn = document.getElementById('createPlaylistBtn');
  if (createBtn) createBtn.textContent = t('playlist_create_btn');
  const closeOverlay = document.getElementById('closePlaylistOverlay');
  if (closeOverlay) closeOverlay.textContent = t('common_close');
  const addBtn = document.getElementById('playlistAddLoop');
  if (addBtn) addBtn.textContent = t('playlist_add');
  const playBtn = document.getElementById('playlistPlay');
  if (playBtn) playBtn.textContent = t('playlist_play');
  const closeBtn = document.getElementById('playlistClose');
  if (closeBtn) closeBtn.textContent = t('common_close');

  // If help is open, re-render it in the new language.
  try {
    const helpOv = document.getElementById('helpOverlay');
    if (helpOv && !helpOv.classList.contains('hidden')) showHelpOverlay();
  } catch {}

  // Player page dynamic bits
  try { updatePlayerPlaylistUI(); } catch {}
}

function openPlaylistsDb() {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(PLAYLIST_DB_NAME, PLAYLIST_DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(PLAYLIST_STORE)) {
          const store = db.createObjectStore(PLAYLIST_STORE, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
    } catch (e) {
      reject(e);
    }
  });
}

function playlistTx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(PLAYLIST_STORE, mode);
      const store = tx.objectStore(PLAYLIST_STORE);
      let result;
      try { result = fn(store); } catch (e) { tx.abort(); return reject(e); }
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    } catch (e) {
      reject(e);
    }
  });
}

function makePlaylistId() {
  try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch {}
  return `pl_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function makePlaylistItemId() {
  try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch {}
  return `pli_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function savePlaylistRecord(record) {
  if (!record || !record.id) return;
  const db = await openPlaylistsDb();
  await playlistTx(db, 'readwrite', (store) => store.put(record));
  try { db.close(); } catch {}
}

async function loadPlaylistRecord(id) {
  if (!id) return null;
  const db = await openPlaylistsDb();
  const rec = await playlistTx(db, 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  });
  try { db.close(); } catch {}
  return rec;
}

async function listPlaylistRecords() {
  const db = await openPlaylistsDb();
  const items = await playlistTx(db, 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  });
  try { db.close(); } catch {}
  return items;
}

async function deletePlaylistRecord(id) {
  if (!id) return;
  const db = await openPlaylistsDb();
  await playlistTx(db, 'readwrite', (store) => store.delete(id));
  try { db.close(); } catch {}
}

function openUploadsDb() {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(UPLOAD_DB_NAME, UPLOAD_DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(UPLOAD_STORE)) {
          const store = db.createObjectStore(UPLOAD_STORE, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
    } catch (e) {
      reject(e);
    }
  });
}

function idbTx(db, mode, fn) {
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(UPLOAD_STORE, mode);
      const store = tx.objectStore(UPLOAD_STORE);
      let result;
      try { result = fn(store); } catch (e) { tx.abort(); return reject(e); }
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
    } catch (e) {
      reject(e);
    }
  });
}

function makeUploadId() {
  try { if (crypto && crypto.randomUUID) return crypto.randomUUID(); } catch {}
  return `u_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getUploadNameOverrides() {
  try {
    const raw = localStorage.getItem(UPLOAD_NAME_OVERRIDES_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== 'object') return {};
    return obj;
  } catch {
    return {};
  }
}

function getUploadNameOverride(id) {
  const key = (id == null) ? '' : String(id);
  if (!key) return '';
  try {
    const overrides = getUploadNameOverrides();
    const v = overrides[key];
    return (v == null) ? '' : String(v);
  } catch {
    return '';
  }
}

function setUploadNameOverride(id, name) {
  const key = (id == null) ? '' : String(id);
  if (!key) return;
  const nm = String(name || '').trim();
  try {
    const overrides = getUploadNameOverrides();
    if (nm) overrides[key] = nm;
    else delete overrides[key];
    localStorage.setItem(UPLOAD_NAME_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {}
}

function addUserPresetFromBlob({ name, blob, saved }) {
  const presetObj = {
    id: (saved && saved.id) || makeUploadId(),
    name: name || 'Audio',
    blob,
    persisted: !!(saved && saved.id),
    createdAt: (saved && saved.createdAt) || Date.now()
  };
  userPresets.unshift(presetObj);
  currentPresetId = presetObj.id || null;
  currentPresetRef = presetObj;
  return presetObj;
}

async function listPersistedUploads() {
  const db = await openUploadsDb();
  const items = await idbTx(db, 'readonly', (store) => {
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  });
  try { db.close(); } catch {}
  return items;
}

async function savePersistedUpload({ name, blob, trimIn, trimOut }) {
  if (!blob) return null;
  const record = {
    id: makeUploadId(),
    name: name || 'Audio',
    blob,
    createdAt: Date.now(),
    ...(trimIn != null ? { trimIn } : {}),
    ...(trimOut != null ? { trimOut } : {})
  };
  const db = await openUploadsDb();

  await idbTx(db, 'readwrite', (store) => store.put(record));

  // Enforce a simple cap to reduce quota risk.
  try {
    const all = await idbTx(db, 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    });
    if (Array.isArray(all) && all.length > MAX_PERSISTED_UPLOADS) {
      all.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      const toDelete = all.slice(0, Math.max(0, all.length - MAX_PERSISTED_UPLOADS));
      await idbTx(db, 'readwrite', (store) => {
        toDelete.forEach(r => { try { store.delete(r.id); } catch {} });
      });
    }
  } catch {}

  try { db.close(); } catch {}
  return record;
}

async function renamePersistedUpload(id, newName) {
  if (!id) return false;
  const name = String(newName || '').trim();
  if (!name) return false;
  const db = await openUploadsDb();
  try {
    const rec = await idbTx(db, 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    });
    if (!rec) return false;
    rec.name = name;
    await idbTx(db, 'readwrite', (store) => store.put(rec));
    return true;
  } catch {
    return false;
  } finally {
    try { db.close(); } catch {}
  }
}

async function deletePersistedUpload(id) {
  if (!id) return;
  const db = await openUploadsDb();
  await idbTx(db, 'readwrite', (store) => store.delete(id));
  try { db.close(); } catch {}
}

async function hydratePersistedUploadsIntoUserPresets() {
  try {
    const items = await listPersistedUploads();
    if (!Array.isArray(items) || !items.length) return;
    items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const existingIds = new Set(userPresets.map(p => p && p.id).filter(Boolean));
    for (const it of items) {
      if (!it || !it.blob) continue;
      if (it.id && existingIds.has(it.id)) continue;
      const overrideName = getUploadNameOverride(it.id);
      const preset = { id: it.id, name: overrideName || it.name || 'Audio', blob: it.blob, persisted: true, createdAt: it.createdAt || 0 };
      if (it.trimIn != null) preset.trimIn = it.trimIn;
      if (it.trimOut != null) preset.trimOut = it.trimOut;
      userPresets.unshift(preset);
    }
  } catch {}
}

async function deleteUserPresetNow(preset) {
  if (!preset) return;
  const name = preset.name || 'Audio';

  try {
    const isDeletingCurrent = (currentPresetRef && preset === currentPresetRef)
      || (currentPresetId && preset.id && currentPresetId === preset.id);

    if (isDeletingCurrent) {
      stopLoop(0, true);
      currentBuffer = null;
      currentSourceLabel = null;
      currentPresetId = null;
      currentPresetRef = null;
      try { setLoopInfo(''); } catch {}
      try { drawWaveform(); } catch {}
    }
  } catch {}

  try {
    const idx = userPresets.indexOf(preset);
    if (idx >= 0) userPresets.splice(idx, 1);
    else if (preset.id) {
      const idx2 = userPresets.findIndex(p => p && p.id === preset.id);
      if (idx2 >= 0) userPresets.splice(idx2, 1);
    }
  } catch {}

  const idToDelete = preset && preset.id;

  try { if (activeTab === 'loops') renderLoopsPage(); } catch {}
  try { updateScrollState(); } catch {}
  setStatus(`Deleted: ${name}`);

  // Defer IndexedDB work to reduce the chance of audio glitches on iOS.
  if (idToDelete) {
    setTimeout(() => {
      deletePersistedUpload(idToDelete).catch(() => {});
    }, 0);
  }
}
const builtinPresets = [
  { name: 'ambientalsynth.mp3', path: 'audio/ambientalsynth.mp3' },
  { name: 'white_noise_432hz.mp3', path: 'audio/white_noise_432hz.mp3' }
];
let currentBuffer = null;
let currentSourceLabel = null;
let currentPresetId = null;
let currentPresetRef = null;

function updateNowPlayingNameUI() {
  const el = document.getElementById('nowPlayingName');
  if (!el) return;
  const isPlaying = !!loopSource;
  const label = (currentSourceLabel || '').trim();
  if (isPlaying && label) {
    el.textContent = label;
    el.classList.remove('hidden');
    el.setAttribute('aria-hidden', 'false');
  } else {
    el.textContent = '';
    el.classList.add('hidden');
    el.setAttribute('aria-hidden', 'true');
  }
}
const bufferCache = new Map();
const defaultSettings = { threshold: 1e-3, marginMs: 2, windowMs: 10 };
let currentSettings = { ...defaultSettings };
let lastLoopPoints = null;
let mediaSessionHandlersSet = false;
let stopCleanupToken = 0;

// Playlist state
let activePlaylistId = null;
let activePlaylist = null; // {id,name,items:[{presetKey,label,reps,volume}]}
// Playlist loaded into the Player page (sticky until user loads a loop or chooses another playlist to play).
let playerPlaylistId = null;
let playerPlaylist = null; // {id,name,items:[{presetKey,label,reps,volume}]}
let playlistPickIndex = -1;
let playlistPlayToken = 0;
let playlistIsPlaying = false;
let playlistRepeat = false;
let pendingDeletePlaylistId = null;
let detailPlaylistId = null;
let detailEditMode = false;

function setPlayerPlaylist(record) {
  playerPlaylist = record || null;
  playerPlaylistId = (record && record.id) ? record.id : null;
  try { updatePlayerPlaylistUI(); } catch {}
}

function clearPlayerPlaylistContext() {
  try { stopPlaylistPlayback(); } catch {}
  playlistIsPlaying = false;
  playerPlaylist = null;
  playerPlaylistId = null;
  try { updatePlayerPlaylistUI(); } catch {}
}

function updatePlayerPlaylistUI() {
  const el = document.getElementById('playerPlaylist');
  if (!el) return;

  const pl = playerPlaylist;
  const name = (pl && pl.name) ? String(pl.name).trim() : '';
  if (pl && (name || pl.id)) {
    const prefix = t('player_playlist_prefix');
    el.textContent = name ? `${prefix}: ${name}` : `${prefix}`;
    el.classList.remove('hidden');
    el.setAttribute('aria-hidden', 'false');
  } else {
    el.textContent = '';
    el.classList.add('hidden');
    el.setAttribute('aria-hidden', 'true');
  }
}

// Trimmer state
let trimBuffer = null;
let trimPreset = null;  // the userPresets entry being trimmed
let trimIn = 0;
let trimOut = 0;
let trimZoomLevel = 1;
let trimViewStart = 0; // left edge of zoomed view (seconds)
let trimDragging = null; // 'in' | 'out' | 'pan' | null
let trimDragStartX = 0;
let trimPanStartView = 0;
let trimTestSource = null;
let trimTestGain = null;
let trimStopCleanupToken = 0;
let trimCursorTime = 0;
let trimCursorDragging = false;
let trimCursorPointerId = null;
let trimCursorFollowRaf = 0;
let trimCursorFollowStartAt = 0;

// Exposed by bindUI so the Playlists page can open the editor.
let openPlaylistCreateOverlay = null;
let openPlaylistEditOverlay = null;

let activeTab = 'player';

let analyser = null;
let vizCanvas = null;
let vizCtx = null;
let vizRafId = 0;
let vizFreqData = null;
let vizTimeData = null;
let lastTouchEndAt = 0;

const VIEWPORT_LOCK_CONTENT = 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';

function lockViewportScale() {
  const meta = document.querySelector('meta[name="viewport"]');
  if (!meta) return;
  if (meta.getAttribute('content') !== VIEWPORT_LOCK_CONTENT) {
    meta.setAttribute('content', VIEWPORT_LOCK_CONTENT);
  }
}

function setStatus(msg) {
  const el = document.getElementById('status');
  if (el) el.textContent = msg;
}

function setLoopInfo(info) {
  const el = document.getElementById('loopInfo');
  if (el) el.textContent = info || '';
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function setPlaybackRate(rate, { smooth = true } = {}) {
  currentRate = clamp(Number(rate) || 1.0, RATE_MIN, RATE_MAX);
  try {
    if (loopSource && audioCtx) {
      const now = audioCtx.currentTime;
      try {
        loopSource.playbackRate.cancelScheduledValues(now);
        if (smooth) loopSource.playbackRate.setTargetAtTime(currentRate, now, 0.03);
        else loopSource.playbackRate.setValueAtTime(currentRate, now);
      } catch {
        try { loopSource.playbackRate.value = currentRate; } catch {}
      }
    }
  } catch {}
  return currentRate;
}

function stopPlaylistPlayback() {
  playlistPlayToken++;
  playlistIsPlaying = false;
}

function getAllLoopChoices() {
  const choices = [];
  for (const p of builtinPresets) {
    if (!p || !p.path) continue;
    choices.push({ presetKey: `builtin:${p.path}`, label: p.name || p.path });
  }
  for (const p of userPresets) {
    if (!p) continue;
    if (p.blob && p.id) choices.push({ presetKey: `upload:${p.id}`, label: p.name || 'Imported' });
    else if (p.url) choices.push({ presetKey: `url:${p.url}`, label: p.name || p.url });
  }
  return choices;
}

async function loadBufferFromPresetKey(presetKey) {
  if (!presetKey) return null;
  const s = String(presetKey);
  const sep = s.indexOf(':');
  if (sep < 0) return null;
  const kind = s.slice(0, sep);
  const rest = s.slice(sep + 1);
  if (!kind || !rest) return null;

  if (kind === 'builtin') {
    const buf = await loadBufferFromUrl(rest);
    return { buffer: buf, sourceLabel: rest.split('/').pop() || rest, presetId: null, presetRef: null };
  }
  if (kind === 'url') {
    const buf = await loadBufferFromUrl(rest);
    return { buffer: buf, sourceLabel: rest, presetId: null, presetRef: null };
  }
  if (kind === 'upload') {
    const preset = userPresets.find(p => p && String(p.id) === String(rest)) || null;
    if (!preset || !preset.blob) return null;
    const ab = await preset.blob.arrayBuffer();
    const buf = await decodeArrayBuffer(ab);
    return { buffer: buf, sourceLabel: preset.name || 'Imported', presetId: preset.id || null, presetRef: preset };
  }
  return null;
}

async function playActivePlaylist() {
  const pl = playerPlaylist;
  if (!pl || !Array.isArray(pl.items) || !pl.items.length) {
    setStatus('Playlist is empty.');
    return;
  }
  stopPlaylistPlayback();
  const token = playlistPlayToken;
  playlistIsPlaying = true;

  ensureAudio();
  if (audioCtx && audioCtx.state === 'suspended') { try { await audioCtx.resume(); } catch {} }
  startOutputIfNeeded();

  // Stop whatever is currently playing, but keep the HTMLAudio element running.
  stopLoop(0, false);

  try { switchTab('player'); } catch {}

  try { updatePlayerPlaylistUI(); } catch {}

  const items = Array.isArray(pl.items) ? pl.items.slice() : [];
  if (!items.length) {
    playlistIsPlaying = false;
    setStatus('Playlist is empty.');
    return;
  }

  // Preload/decode each unique presetKey up front to avoid gaps between items.
  setStatus('Loading playlist\u2026');
  const loadPromises = new Map();
  for (const it of items) {
    if (!it || !it.presetKey) continue;
    if (!loadPromises.has(it.presetKey)) {
      loadPromises.set(it.presetKey, loadBufferFromPresetKey(it.presetKey).catch(() => null));
    }
  }
  const loadedByKey = new Map();
  for (const [k, p] of loadPromises.entries()) {
    loadedByKey.set(k, await p);
    if (playlistPlayToken !== token) return;
  }

  // Precompute per-buffer segment length once, respecting custom trim points.
  const segByKey = new Map();
  for (const [k, loaded] of loadedByKey.entries()) {
    if (!loaded || !loaded.buffer) continue;
    let seg = 0;
    try {
      // Check if this preset has custom trim points.
      const ref = loaded.presetRef;
      if (ref && ref.trimIn != null && ref.trimOut != null) {
        seg = Math.max(0.02, ref.trimOut - ref.trimIn);
      } else {
        const pts = computeLoopPoints(loaded.buffer);
        seg = Math.max(0.02, (pts.end - pts.start) || 0);
      }
    } catch {
      seg = Math.max(0.02, loaded.buffer.duration || 0);
    }
    segByKey.set(k, seg);
  }

  // Play through the items, possibly repeating the whole sequence.
  do {
    for (const it of items) {
      if (playlistPlayToken !== token) return;
      if (!it || !it.presetKey) continue;

      const loaded = loadedByKey.get(it.presetKey);
      if (!loaded || !loaded.buffer) continue;

      const reps = Math.max(1, parseInt(it.reps, 10) || 1);
      const seg = segByKey.get(it.presetKey) || Math.max(0.02, loaded.buffer.duration || 0);
      const itemVol = clamp((it.volume !== undefined && it.volume !== null) ? it.volume : 1.0, 0, 1);

      currentBuffer = loaded.buffer;
      currentSourceLabel = it.label || loaded.sourceLabel || 'Playlist';
      currentPresetId = loaded.presetId || null;
      currentPresetRef = loaded.presetRef || null;
      setStatus(`Playlist: ${currentSourceLabel} \u00d7${reps}`);

      const rateNow = clamp(currentRate, RATE_MIN, RATE_MAX);
      await startLoopFromBuffer(loaded.buffer, itemVol * 0.5, 0.03);

      // Wait for repetitions of the computed loop segment.
      const totalSec = Math.max(0.02, (seg * reps) / Math.max(0.001, rateNow));
      const endAt = (audioCtx ? audioCtx.currentTime : 0) + totalSec;
      while (audioCtx && audioCtx.currentTime < endAt) {
        if (playlistPlayToken !== token) return;
        const remaining = endAt - audioCtx.currentTime;
        await new Promise(r => setTimeout(r, Math.min(50, Math.max(0, remaining * 1000))));
      }
    }
  } while (playlistRepeat && playlistPlayToken === token);

  if (playlistPlayToken !== token) return;
  playlistIsPlaying = false;
  stopLoop(0, true);
  setStatus('Playlist finished');
} 

function isIOS() {
  const ua = navigator.userAgent || '';
  const isAppleMobile = /iPhone|iPad|iPod/i.test(ua);
  const isMacTouch = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isAppleMobile || isMacTouch;
}

function isStandaloneDisplayMode() {
  try {
    // iOS Safari legacy
    if ('standalone' in navigator && navigator.standalone) return true;
    // PWA display-mode
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
  } catch {}
  return false;
}

function looksLikeAudioFile(file) {
  if (!file) return false;
  const type = (file.type || '').toLowerCase();
  if (type.startsWith('audio/')) return true;
  const name = (file.name || '').toLowerCase();
  return /\.(mp3|wav|m4a|aac|aif|aiff|caf|flac|ogg)$/i.test(name);
}

// Disable page scrolling when content fits within the viewport.
function updateScrollState() {
  try {
    const overlayOpen = !!document.querySelector('.overlay:not(.hidden)');
    if (overlayOpen) {
      document.documentElement.classList.add('no-scroll');
      document.body.classList.add('no-scroll');
      return;
    }
    const ui = document.querySelector('.app-shell') || document.body;
    const needScroll = ui.scrollHeight > window.innerHeight + 1;
    document.documentElement.classList.toggle('no-scroll', !needScroll);
    document.body.classList.toggle('no-scroll', !needScroll);
  } catch (e) {}
}

let openSwipeRow = null;

function closeSwipeRow(row) {
  if (!row) return;
  row.classList.remove('open');
  row.classList.remove('swiping');
  const content = row.querySelector('.preset-content');
  if (content) content.style.transform = '';
}

function attachSwipeHandlers(row) {
  if (!row) return;
  const content = row.querySelector('.preset-content');
  if (!content) return;

  const DELETE_W = 84;
  const OPEN_THRESHOLD = 40;
  const MAX_SLOP = 10;

  let active = false;
  let startX = 0;
  let startY = 0;
  let lastDx = 0;
  let raf = 0;
  let pointerId = null;

  const isEditableTarget = (t) => !!(t && t.closest && t.closest('input, textarea, [contenteditable="true"]'));

  const setDx = (dx) => {
    lastDx = Math.max(-DELETE_W, Math.min(0, dx));
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      content.style.transform = lastDx ? `translateX(${lastDx}px)` : '';
    });
  };

  const onDown = (e) => {
    // Only swipe on touch/pen to avoid fighting desktop selection.
    if (e.pointerType === 'mouse') return;
    if (isEditableTarget(e.target)) return;
    if (e.target && e.target.closest && e.target.closest('.preset-delete')) return;

    active = true;
    pointerId = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    lastDx = 0;
    row.classList.add('swiping');
    try { row.setPointerCapture(pointerId); } catch {}
  };

  const onMove = (e) => {
    if (!active) return;
    if (pointerId != null && e.pointerId !== pointerId) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    // If user is scrolling vertically, bail.
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > MAX_SLOP) {
      active = false;
      row.classList.remove('swiping');
      setDx(0);
      return;
    }

    if (dx > 0) {
      setDx(0);
      return;
    }
    setDx(dx);
  };

  const onUp = () => {
    if (!active) return;
    active = false;
    row.classList.remove('swiping');

    const shouldOpen = lastDx < -OPEN_THRESHOLD;
    if (shouldOpen) {
      // Only stop playback if the swiped row is the one currently playing.
      try {
        const rowId = row && row.dataset && row.dataset.id;
        if (rowId && currentPresetId && rowId === currentPresetId) stopLoop(0, true);
      } catch {}
      if (openSwipeRow && openSwipeRow !== row) closeSwipeRow(openSwipeRow);
      openSwipeRow = row;
      row.classList.add('open');
      content.style.transform = '';
    } else {
      if (openSwipeRow === row) openSwipeRow = null;
      closeSwipeRow(row);
    }
  };

  row.addEventListener('pointerdown', onDown);
  row.addEventListener('pointermove', onMove);
  row.addEventListener('pointerup', onUp);
  row.addEventListener('pointercancel', onUp);
}

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    master = audioCtx.createGain();
    master.gain.value = 0;
    mediaDest = audioCtx.createMediaStreamDestination();
    master.connect(mediaDest);
    // For visualization only (parallel tap). Do NOT connect to audioCtx.destination.
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    try { master.connect(analyser); } catch {}
    audioOut = document.getElementById('audioOut');
    if (audioOut) audioOut.srcObject = mediaDest.stream;
  }
}

function isLandscape() {
  try {
    if (window.matchMedia) return window.matchMedia('(orientation: landscape)').matches;
  } catch {}
  return window.innerWidth > window.innerHeight;
}

function updateLandscapeVizState() {
  const landscape = isLandscape();
  document.documentElement.classList.toggle('landscape', landscape);
  try {
    const shell = document.querySelector('.app-shell');
    if (shell) {
      if (landscape) shell.setAttribute('aria-hidden', 'true');
      else shell.removeAttribute('aria-hidden');
    }
  } catch {}
  if (landscape) startViz();
  else stopViz();
}

function ensureVizCanvas() {
  if (!vizCanvas) vizCanvas = document.getElementById('viz');
  if (vizCanvas && !vizCtx) vizCtx = vizCanvas.getContext('2d');
}

function resizeVizCanvas() {
  ensureVizCanvas();
  if (!vizCanvas || !vizCtx) return;
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(1, Math.floor(window.innerWidth * dpr));
  const h = Math.max(1, Math.floor(window.innerHeight * dpr));
  if (vizCanvas.width !== w) vizCanvas.width = w;
  if (vizCanvas.height !== h) vizCanvas.height = h;
  vizCtx.setTransform(1, 0, 0, 1, 0, 0);
  vizCtx.scale(dpr, dpr);
}

function startViz() {
  ensureAudio();
  ensureVizCanvas();
  if (!vizCanvas || !vizCtx || !analyser) return;
  if (vizRafId) return;

  const freqBins = analyser.frequencyBinCount;
  vizFreqData = new Uint8Array(freqBins);
  vizTimeData = new Uint8Array(freqBins);

  const rootStyles = getComputedStyle(document.documentElement);
  const accent = (rootStyles.getPropertyValue('--accent') || '').trim() || '#4a90e2';
  const danger = (rootStyles.getPropertyValue('--danger') || '').trim() || '#e24a6a';
  const text = (rootStyles.getPropertyValue('--text') || '').trim() || '#e6edf3';

  const draw = () => {
    vizRafId = requestAnimationFrame(draw);
    if (!isLandscape()) return;
    resizeVizCanvas();

    const w = window.innerWidth;
    const h = window.innerHeight;
    if (!w || !h) return;

    analyser.getByteFrequencyData(vizFreqData);
    analyser.getByteTimeDomainData(vizTimeData);

    // Clear (keep UI readable; viz acts like an overlay)
    vizCtx.clearRect(0, 0, w, h);

    // Frequency bars
    const bars = Math.min(96, vizFreqData.length);
    const barW = w / bars;
    const grad = vizCtx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, accent);
    grad.addColorStop(1, danger);
    vizCtx.fillStyle = grad;

    for (let i = 0; i < bars; i++) {
      const idx = Math.floor((i / bars) * vizFreqData.length);
      const v = vizFreqData[idx] / 255;
      const bh = Math.max(2, v * (h * 0.55));
      const x = i * barW;
      const y = h - bh - 18;
      vizCtx.globalAlpha = 0.35 + v * 0.65;
      vizCtx.fillRect(x + barW * 0.12, y, Math.max(1, barW * 0.76), bh);
    }
    vizCtx.globalAlpha = 1;

    // Time-domain line
    vizCtx.lineWidth = 2;
    vizCtx.strokeStyle = text;
    vizCtx.globalAlpha = 0.65;
    vizCtx.beginPath();
    const step = Math.max(1, Math.floor(vizTimeData.length / w));
    for (let x = 0; x < w; x++) {
      const ti = Math.min(vizTimeData.length - 1, x * step);
      const t = (vizTimeData[ti] - 128) / 128;
      const y = (h * 0.35) + t * (h * 0.12);
      if (x === 0) vizCtx.moveTo(x, y);
      else vizCtx.lineTo(x, y);
    }
    vizCtx.stroke();
    vizCtx.globalAlpha = 1;
  };

  draw();
}

function stopViz() {
  if (vizRafId) {
    cancelAnimationFrame(vizRafId);
    vizRafId = 0;
  }
  ensureVizCanvas();
  if (vizCanvas && vizCtx) {
    vizCtx.clearRect(0, 0, vizCanvas.width, vizCanvas.height);
  }
}

function startOutputIfNeeded() {
  if (!audioOut) return;
  const p = audioOut.play();
  if (p && p.catch) p.catch(() => {});
}

async function loadBufferFromUrl(url) {
  ensureAudio();
  if (bufferCache.has(url)) return bufferCache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ab = await res.arrayBuffer();
  const buf = await new Promise((resolve, reject) => {
    audioCtx.decodeAudioData(ab, resolve, reject);
  });
  bufferCache.set(url, buf);
  return buf;
}

async function decodeArrayBuffer(ab) {
  ensureAudio();
  return new Promise((resolve, reject) => {
    audioCtx.decodeAudioData(ab, resolve, reject);
  });
}

function computeLoopPoints(buffer, opts = currentSettings) {
  const sr = buffer.sampleRate;
  const ch = buffer.numberOfChannels;
  const len = buffer.length;
  const threshold = Math.max(0, Number(opts.threshold) || defaultSettings.threshold);
  const maxScan = Math.min(len - 1, Math.floor(sr * 2));
  const channels = Array.from({ length: ch }, (_, i) => buffer.getChannelData(i));

  let start = 0, end = len - 1;

  let sFound = false;
  for (let i = 0; i < maxScan; i++) {
    let above = false;
    for (let c = 0; c < ch; c++) {
      if (Math.abs(channels[c][i]) > threshold) { above = true; break; }
    }
    if (above) { start = i; sFound = true; break; }
  }
  if (!sFound) start = 0;

  let eFound = false;
  const minEnd = Math.max(start + 1, len - 1 - maxScan);
  for (let j = len - 1; j >= minEnd; j--) {
    let aboveE = false;
    for (let c = 0; c < ch; c++) {
      if (Math.abs(channels[c][j]) > threshold) { aboveE = true; break; }
    }
    if (aboveE) { end = j; eFound = true; break; }
  }
  if (!eFound) end = len - 1;

  const margin = Math.floor(sr * (Math.max(0, Number(opts.marginMs) || defaultSettings.marginMs) / 1000));
  start = Math.max(0, start - margin);
  end   = Math.min(len, end + margin);
  if (end <= start + 10) { start = 0; end = len; }

  const win = Math.floor(sr * (Math.max(1, Number(opts.windowMs) || defaultSettings.windowMs) / 1000));

  let s0 = Math.max(1, start - win), s1 = Math.min(len - 2, start + win);
  let bestS = start, bestSA = 1;
  for (let si = s0; si <= s1; si++) {
    let acc = 0;
    for (let c = 0; c < ch; c++) acc += Math.abs(channels[c][si]);
    acc /= Math.max(1, ch);
    if (acc < bestSA) { bestSA = acc; bestS = si; if (acc === 0) break; }
  }
  start = bestS;

  let e0 = Math.max(start + 1, end - win), e1 = Math.min(len - 2, end + win);
  let bestE = end, bestEA = 1;
  for (let ei = e0; ei <= e1; ei++) {
    let acc2 = 0;
    for (let c = 0; c < ch; c++) acc2 += Math.abs(channels[c][ei]);
    acc2 /= Math.max(1, ch);
    if (acc2 < bestEA) { bestEA = acc2; bestE = ei; if (acc2 === 0) break; }
  }
  end = bestE;

  return { start: start / sr, end: end / sr };
}

async function startLoopFromBuffer(buffer, targetVolume = 0.5, rampIn = 0.03, customTrim = null) {
  ensureAudio();
  if (audioCtx.state === 'suspended') { try { await audioCtx.resume(); } catch {} }
  startOutputIfNeeded();

  // Internal switch: stop old source, but keep HTMLAudio element playing.
  stopLoop(0, false);

  // Use custom trim points if provided; else check preset ref for saved trims; else auto-detect.
  let start, end;
  if (customTrim && typeof customTrim.start === 'number' && typeof customTrim.end === 'number') {
    start = customTrim.start;
    end = customTrim.end;
  } else if (currentPresetRef && currentPresetRef.trimIn != null && currentPresetRef.trimOut != null) {
    start = currentPresetRef.trimIn;
    end = currentPresetRef.trimOut;
  } else {
    const pts = computeLoopPoints(buffer);
    start = pts.start;
    end = pts.end;
  }
  lastLoopPoints = { start, end };

  loopSource = audioCtx.createBufferSource();
  loopSource.buffer = buffer;
  loopSource.loop = true;
  loopSource.loopStart = start;
  loopSource.loopEnd = end;

  // Apply current playback rate (jog wheel).
  try {
    loopSource.playbackRate.setValueAtTime(clamp(currentRate, RATE_MIN, RATE_MAX), audioCtx.currentTime);
  } catch {}

  loopGain = audioCtx.createGain();
  loopGain.gain.setValueAtTime(0, audioCtx.currentTime);

  loopSource.connect(loopGain);
  loopGain.connect(master);

  master.gain.cancelScheduledValues(audioCtx.currentTime);
  master.gain.setValueAtTime(master.gain.value, audioCtx.currentTime);
  master.gain.linearRampToValueAtTime(volumeVal, audioCtx.currentTime + rampIn);

  loopGain.gain.linearRampToValueAtTime(targetVolume, audioCtx.currentTime + rampIn);

  loopSource.start(audioCtx.currentTime);

  // iOS can end up with <audio> paused after rapid actions; nudge playback.
  startOutputIfNeeded();

  setLoopInfo(`Loop: ${start.toFixed(3)}s → ${end.toFixed(3)}s | dur ${buffer.duration.toFixed(2)}s`);
  setStatus('Playing');
  drawWaveform();
  updateScrollState();
  try {
    if (!currentSourceLabel) currentSourceLabel = 'Loaded Loop';
    updateNowPlayingNameUI();
  } catch {}
  updateMediaSession('playing');
}

function switchTab(tab) {
  activeTab = tab;
  const pages = {
    player: document.getElementById('page-player'),
    playlists: document.getElementById('page-playlists'),
    'playlist-detail': document.getElementById('page-playlist-detail'),
    loops: document.getElementById('page-loops'),
    trimmer: document.getElementById('page-trimmer'),
    settings: document.getElementById('page-settings')
  };
  Object.entries(pages).forEach(([k, el]) => {
    if (!el) return;
    el.classList.toggle('active', k === tab);
  });

  // Highlight the parent tab for sub-pages.
  let highlightTab = tab;
  if (tab === 'playlist-detail') highlightTab = 'playlists';
  if (tab === 'trimmer') highlightTab = 'loops';
  const tabs = document.querySelectorAll('.tabbar .tab');
  tabs.forEach(btn => {
    const isActive = btn.getAttribute('data-tab') === highlightTab;
    btn.classList.toggle('active', isActive);
    if (isActive) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });

  if (tab === 'loops') renderLoopsPage();
  if (tab === 'playlists') renderPlaylistsPage();
  if (tab === 'player') setTimeout(drawWaveform, 0);
  if (tab === 'trimmer') setTimeout(drawTrimWaveform, 0);
  if (tab !== 'trimmer') stopTrimTest();
  setTimeout(updateScrollState, 50);
}

async function renderPlaylistsPage() {
  const listEl = document.getElementById('playlistsList');
  if (!listEl) return;
  listEl.innerHTML = '';

  let items = [];
  try { items = await listPlaylistRecords(); } catch { items = []; }
  if (!Array.isArray(items)) items = [];
  items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  if (!items.length) {
    const li = document.createElement('li');
    const div = document.createElement('div');
    div.className = 'hint';
    div.textContent = 'No playlists yet. Tap + New to create one.';
    div.style.padding = '10px 0';
    li.appendChild(div);
    listEl.appendChild(li);
    return;
  }

  for (const pl of items) {
    const li = document.createElement('li');
    li.className = 'playlist-list-row';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'playlist-list-item';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'pl-item-name';
    nameSpan.textContent = (pl && pl.name) ? pl.name : 'Playlist';

    const countSpan = document.createElement('span');
    countSpan.className = 'pl-item-count';
    const n = (pl && Array.isArray(pl.items)) ? pl.items.length : 0;
    countSpan.textContent = `${n} loop${n !== 1 ? 's' : ''}`;

    const chevron = document.createElement('span');
    chevron.className = 'pl-item-chevron';
    chevron.textContent = '›';

    btn.appendChild(nameSpan);
    btn.appendChild(countSpan);
    btn.appendChild(chevron);

    btn.addEventListener('click', () => {
      openPlaylistDetail(pl.id);
    });

    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'playlist-list-play';
    playBtn.setAttribute('aria-label', `${t('playlist_play')}: ${(pl && pl.name) ? pl.name : 'Playlist'}`);
    playBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="7,4 20,12 7,20"/></svg>';
    playBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!pl || !pl.id) return;
      setPlayerPlaylist(pl);
      await playActivePlaylist();
    });

    li.appendChild(btn);
    li.appendChild(playBtn);
    listEl.appendChild(li);
  }
  try { setTimeout(updateScrollState, 50); } catch {}
}

async function openPlaylistDetail(id) {
  if (!id) return;
  detailPlaylistId = id;
  detailEditMode = false;
  try {
    const rec = await loadPlaylistRecord(id);
    if (!rec) { setStatus('Playlist not found'); return; }
    activePlaylist = rec;
    activePlaylistId = rec.id;
    if (Array.isArray(rec.items)) {
      rec.items.forEach(it => {
        if (it && !it.itemId) it.itemId = makePlaylistItemId();
        if (it && (it.volume === undefined || it.volume === null)) it.volume = 1.0;
      });
    }
    switchTab('playlist-detail');
    renderPlaylistDetail();
  } catch (e) {
    setStatus('Failed to open playlist');
  }
}

function renderPlaylistDetail() {
  const titleEl = document.getElementById('detailTitle');
  const infoEl = document.getElementById('detailInfo');
  const itemsEl = document.getElementById('detailItems');
  const editBtn = document.getElementById('detailEdit');
  if (!itemsEl) return;
  const rec = activePlaylist;
  if (!rec) return;

  if (titleEl) titleEl.textContent = rec.name || 'Playlist';
  const n = (rec.items && rec.items.length) || 0;
  if (infoEl) infoEl.textContent = `${n} loop${n !== 1 ? 's' : ''}`;
  if (editBtn) editBtn.textContent = detailEditMode ? 'Done' : 'Edit';

  itemsEl.innerHTML = '';

  if (!rec.items || !rec.items.length) {
    const empty = document.createElement('div');
    empty.className = 'hint';
    empty.style.padding = '16px 0';
    empty.textContent = detailEditMode ? 'Tap + Add Loop below to add loops.' : 'No loops in this playlist.';
    itemsEl.appendChild(empty);
  }

  if (detailEditMode) {
    renderPlaylistDetailEdit(itemsEl, rec);
  } else {
    renderPlaylistDetailReadonly(itemsEl, rec);
  }
}

function renderPlaylistDetailReadonly(container, rec) {
  if (!rec.items) return;
  for (const it of rec.items) {
    if (!it) continue;
    const row = document.createElement('div');
    row.className = 'detail-loop';
    const header = document.createElement('div');
    header.className = 'detail-loop-header';
    const nameEl = document.createElement('div');
    nameEl.className = 'detail-loop-name';
    nameEl.textContent = it.label || 'Loop';
    const repsEl = document.createElement('div');
    repsEl.className = 'detail-loop-reps';
    const reps = Math.max(1, parseInt(it.reps, 10) || 1);
    const vol = Math.round((it.volume !== undefined && it.volume !== null ? it.volume : 1.0) * 100);
    repsEl.textContent = `\u00d7${reps}  \u00b7  ${vol}%`;
    header.appendChild(nameEl);
    header.appendChild(repsEl);
    row.appendChild(header);
    container.appendChild(row);
  }
}

function renderPlaylistDetailEdit(container, rec) {
  if (!rec.items) rec.items = [];

  const saveDetailSoon = () => {
    if (!activePlaylist || !activePlaylist.id) return;
    savePlaylistRecord(activePlaylist).catch(() => {});
  };

  let draggingRow = null;
  let dragPointerId = null;

  const rebuildOrder = () => {
    if (!activePlaylist || !Array.isArray(activePlaylist.items)) return;
    const order = Array.from(container.querySelectorAll('.detail-loop-edit'))
      .map(r => r.dataset.itemId).filter(Boolean);
    const map = new Map(activePlaylist.items.map(it => [it && it.itemId, it]));
    const next = [];
    for (const id of order) { const it = map.get(id); if (it) next.push(it); }
    for (const it of activePlaylist.items) {
      if (it && it.itemId && !order.includes(it.itemId)) next.push(it);
    }
    activePlaylist.items = next;
    saveDetailSoon();
  };

  for (let idx = 0; idx < rec.items.length; idx++) {
    const it = rec.items[idx];
    if (!it) continue;

    const row = document.createElement('div');
    row.className = 'detail-loop-edit';
    if (it.itemId) row.dataset.itemId = it.itemId;

    const top = document.createElement('div');
    top.className = 'detail-edit-top';

    const handle = document.createElement('div');
    handle.className = 'detail-edit-handle';
    handle.textContent = '\u2261';
    handle.setAttribute('aria-label', 'Reorder');

    const nameEl = document.createElement('div');
    nameEl.className = 'detail-edit-name';
    nameEl.textContent = it.label || 'Loop';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'detail-edit-remove';
    removeBtn.textContent = '\u00d7';
    removeBtn.setAttribute('aria-label', `Remove ${it.label || 'loop'}`);
    removeBtn.addEventListener('click', () => {
      const i = activePlaylist.items.findIndex(x => x && x.itemId === it.itemId);
      if (i >= 0) activePlaylist.items.splice(i, 1);
      saveDetailSoon();
      renderPlaylistDetail();
    });

    top.appendChild(handle);
    top.appendChild(nameEl);
    top.appendChild(removeBtn);

    const controls = document.createElement('div');
    controls.className = 'detail-edit-controls';

    // Volume slider
    const volGroup = document.createElement('div');
    volGroup.className = 'detail-ctrl-group';
    const volLabel = document.createElement('div');
    volLabel.className = 'detail-ctrl-label';
    volLabel.textContent = 'Volume';
    const volVal = document.createElement('div');
    volVal.className = 'detail-ctrl-val';
    volVal.textContent = `${Math.round((it.volume !== undefined ? it.volume : 1.0) * 100)}%`;
    const volSlider = document.createElement('input');
    volSlider.type = 'range';
    volSlider.min = '0';
    volSlider.max = '100';
    volSlider.value = String(Math.round((it.volume !== undefined ? it.volume : 1.0) * 100));
    volSlider.setAttribute('aria-label', 'Loop volume');
    volSlider.addEventListener('input', () => {
      const v = Math.max(0, Math.min(100, parseInt(volSlider.value, 10) || 0));
      it.volume = v / 100;
      volVal.textContent = `${v}%`;
    });
    volSlider.addEventListener('change', saveDetailSoon);
    volGroup.appendChild(volLabel);
    volGroup.appendChild(volSlider);
    volGroup.appendChild(volVal);

    // Reps input
    const repsGroup = document.createElement('div');
    repsGroup.className = 'detail-ctrl-group';
    const repsLabel = document.createElement('div');
    repsLabel.className = 'detail-ctrl-label';
    repsLabel.textContent = 'Reps';
    const repsInput = document.createElement('input');
    repsInput.type = 'number';
    repsInput.min = '1';
    repsInput.step = '1';
    repsInput.value = String(Math.max(1, parseInt(it.reps, 10) || 1));
    repsInput.setAttribute('aria-label', 'Repetitions');
    repsInput.addEventListener('change', () => {
      it.reps = Math.max(1, parseInt(repsInput.value, 10) || 1);
      saveDetailSoon();
    });
    repsGroup.appendChild(repsLabel);
    repsGroup.appendChild(repsInput);

    controls.appendChild(volGroup);
    controls.appendChild(repsGroup);

    row.appendChild(top);
    row.appendChild(controls);
    container.appendChild(row);

    // Drag-to-reorder
    handle.addEventListener('pointerdown', (e) => {
      if (e.target && e.target.closest && e.target.closest('input')) return;
      draggingRow = row;
      dragPointerId = e.pointerId;
      try { row.classList.add('dragging'); } catch {}
      try { container.setPointerCapture(e.pointerId); } catch {}
      e.preventDefault();
    });
  }

  // Add loop button
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'detail-add-btn';
  addBtn.textContent = '+ Add Loop';
  addBtn.addEventListener('click', () => {
    openDetailLoopPicker();
  });
  container.appendChild(addBtn);

  container.onpointermove = (e) => {
    if (!draggingRow) return;
    if (dragPointerId != null && e.pointerId !== dragPointerId) return;
    const siblings = Array.from(container.querySelectorAll('.detail-loop-edit'))
      .filter(r => r !== draggingRow);
    for (const sib of siblings) {
      const rect = sib.getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) {
        if (sib !== draggingRow.nextSibling) container.insertBefore(draggingRow, sib);
        return;
      }
    }
    const aBtn = container.querySelector('.detail-add-btn');
    if (aBtn) container.insertBefore(draggingRow, aBtn);
    e.preventDefault();
  };
  container.onpointerup = container.onpointercancel = (e) => {
    if (!draggingRow) return;
    if (dragPointerId != null && e.pointerId !== dragPointerId) return;
    try { draggingRow.classList.remove('dragging'); } catch {}
    try { container.releasePointerCapture(dragPointerId); } catch {}
    draggingRow = null;
    dragPointerId = null;
    rebuildOrder();
    renderPlaylistDetail();
  };
}

function openDetailLoopPicker() {
  const loopPickerOverlay = document.getElementById('loopPickerOverlay');
  const loopPickerList = document.getElementById('loopPickerList');
  if (!loopPickerList) return;
  loopPickerList.innerHTML = '';
  const choices = getAllLoopChoices();
  choices.forEach(ch => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = ch.label;
    b.addEventListener('click', () => {
      if (!activePlaylist) return;
      if (!Array.isArray(activePlaylist.items)) activePlaylist.items = [];
      const item = { itemId: makePlaylistItemId(), presetKey: ch.presetKey, label: ch.label, reps: 1, volume: 1.0 };
      activePlaylist.items.push(item);
      savePlaylistRecord(activePlaylist).catch(() => {});
      const ov = document.getElementById('loopPickerOverlay');
      if (ov) ov.classList.add('hidden');
      try { updateScrollState(); } catch {}
      renderPlaylistDetail();
    });
    loopPickerList.appendChild(b);
  });
  if (loopPickerOverlay) loopPickerOverlay.classList.remove('hidden');
  try { updateScrollState(); } catch {}
}

/* ================================================================
   Loop Trimmer
   ================================================================ */

async function openTrimmer(preset) {
  if (!preset || !preset.blob) { setStatus('No audio to trim'); return; }
  try {
    // iOS/Safari: decoding + heavy canvas work while a MediaStream-backed loop is playing
    // can put the output into a stuttery state until the stream is paused.
    // Entering the trimmer is a user gesture anyway, so we safely stop playback first.
    try { stopPlaylistPlayback(); } catch {}
    try {
      if (loopSource) {
        const ramp = 0.05;
        stopLoop(ramp, true);
        await new Promise(r => setTimeout(r, Math.ceil((ramp + 0.04) * 1000)));
      }
    } catch {}

    setStatus('Loading for trim…');
    const ab = await preset.blob.arrayBuffer();
    const buf = await decodeArrayBuffer(ab);
    if (!buf) { setStatus('Failed to decode audio'); return; }
    trimBuffer = buf;
    trimPreset = preset;
    // Initialize IN/OUT from saved trim or auto-detect.
    if (preset.trimIn != null && preset.trimOut != null) {
      trimIn = preset.trimIn;
      trimOut = preset.trimOut;
    } else {
      const pts = computeLoopPoints(buf);
      trimIn = pts.start;
      trimOut = pts.end;
    }
    trimCursorTime = clamp(trimIn, 0, Math.max(0, buf.duration || 0));
    trimZoomLevel = 1;
    trimViewStart = 0;
    trimDragging = null;
    const titleEl = document.getElementById('trimTitle');
    const infoEl = document.getElementById('trimInfo');
    if (titleEl) titleEl.textContent = preset.name || 'Trim Loop';
    if (infoEl) infoEl.textContent = `Duration ${buf.duration.toFixed(2)}s`;
    const zoomSlider = document.getElementById('trimZoom');
    if (zoomSlider) zoomSlider.value = '1';
    switchTab('trimmer');
    updateTrimReadouts();
    setTimeout(drawTrimWaveform, 0);
    setStatus('Trimmer ready');
  } catch (e) {
    setStatus('Failed to open trimmer');
  }
}

function getTrimViewSpan() {
  if (!trimBuffer) return { start: 0, end: 1 };
  const dur = trimBuffer.duration || 1;
  const viewDur = Math.max(0.01, dur / Math.max(1, trimZoomLevel));
  let vs = trimViewStart;
  if (vs + viewDur > dur) vs = Math.max(0, dur - viewDur);
  if (vs < 0) vs = 0;
  trimViewStart = vs;
  return { start: vs, end: vs + viewDur };
}

function centerTrimViewAt(timeSec) {
  if (!trimBuffer) return;
  const dur = trimBuffer.duration || 1;
  const viewDur = Math.max(0.01, dur / Math.max(1, trimZoomLevel));
  trimViewStart = clamp(timeSec - viewDur / 2, 0, Math.max(0, dur - viewDur));
}

function updateTrimCursorUI(vStart = null, vEnd = null) {
  const cursorEl = document.getElementById('trimCursor');
  if (!cursorEl || !trimBuffer) return;
  const labelEl = document.getElementById('trimCursorLabel');

  if (vStart == null || vEnd == null) {
    const span = getTrimViewSpan();
    vStart = span.start;
    vEnd = span.end;
  }

  const dur = Math.max(0, trimBuffer.duration || 0);
  trimCursorTime = clamp(trimCursorTime, 0, dur);
  const spanDur = Math.max(0.000001, (vEnd - vStart));
  const frac = (trimCursorTime - vStart) / spanDur;
  const pct = clamp(frac, 0, 1) * 100;
  cursorEl.style.left = `${pct}%`;

  try {
    cursorEl.setAttribute('aria-valuemin', '0');
    cursorEl.setAttribute('aria-valuemax', dur.toFixed(3));
    cursorEl.setAttribute('aria-valuenow', trimCursorTime.toFixed(3));
    cursorEl.setAttribute('aria-valuetext', `${trimCursorTime.toFixed(3)}s`);
    cursorEl.setAttribute('role', 'slider');
  } catch {}
  if (labelEl) labelEl.textContent = `${trimCursorTime.toFixed(3)}s`;
}

function stopTrimCursorFollow() {
  if (trimCursorFollowRaf) {
    try { cancelAnimationFrame(trimCursorFollowRaf); } catch {}
    trimCursorFollowRaf = 0;
  }
}

function startTrimCursorFollow() {
  stopTrimCursorFollow();
  if (!audioCtx || !trimTestSource || !trimBuffer) return;
  const loopLen = Math.max(0.001, (trimOut - trimIn));
  trimCursorFollowStartAt = audioCtx.currentTime;

  const tick = () => {
    trimCursorFollowRaf = requestAnimationFrame(tick);
    if (!trimTestSource || trimCursorDragging) return;
    const elapsed = Math.max(0, audioCtx.currentTime - trimCursorFollowStartAt);
    const pos = (elapsed % loopLen);
    trimCursorTime = trimIn + pos;
    const span = getTrimViewSpan();
    updateTrimCursorUI(span.start, span.end);
  };
  tick();
}

function drawTrimWaveform() {
  const cvs = document.getElementById('trimCanvas');
  if (!cvs || !trimBuffer) return;
  const rootStyles = getComputedStyle(document.documentElement);
  const waveBg = (rootStyles.getPropertyValue('--wave-bg') || '').trim() || '#141418';
  const accent = (rootStyles.getPropertyValue('--accent') || '').trim() || '#5b8def';
  const textCol = (rootStyles.getPropertyValue('--text-2') || '').trim() || '#82828c';
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(10, Math.floor(cvs.clientWidth * dpr));
  const h = Math.max(50, Math.floor((cvs.clientHeight || cvs.height) * dpr));
  if (cvs.width !== w) cvs.width = w;
  if (cvs.height !== h) cvs.height = h;
  const ctx = cvs.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = waveBg;
  ctx.fillRect(0, 0, w, h);

  const sr = trimBuffer.sampleRate;
  const ch0 = trimBuffer.getChannelData(0);
  const { start: vStart, end: vEnd } = getTrimViewSpan();
  const viewSamples = Math.max(1, Math.floor((vEnd - vStart) * sr));
  const s0 = Math.floor(vStart * sr);
  const mid = h / 2;

  // Draw waveform
  const step = Math.max(1, Math.floor(viewSamples / w));
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.45;
  for (let px = 0; px < w; px++) {
    const sampleIdx = s0 + Math.floor((px / w) * viewSamples);
    let min = 0, max = 0;
    for (let j = 0; j < step && sampleIdx + j < ch0.length; j++) {
      const v = ch0[sampleIdx + j] || 0;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const y1 = mid + min * mid;
    const y2 = mid + max * mid;
    ctx.fillRect(px, y1, 1, Math.max(1, y2 - y1));
  }
  ctx.globalAlpha = 1;

  // Dimmed region outside trim
  const inPx = Math.round(((trimIn - vStart) / (vEnd - vStart)) * w);
  const outPx = Math.round(((trimOut - vStart) / (vEnd - vStart)) * w);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  if (inPx > 0) ctx.fillRect(0, 0, Math.min(w, inPx), h);
  if (outPx < w) ctx.fillRect(Math.max(0, outPx), 0, w - outPx, h);

  // IN cursor (green line)
  if (inPx >= 0 && inPx <= w) {
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(inPx - 1, 0, 3, h);
    ctx.font = `bold ${Math.round(11 * dpr)}px sans-serif`;
    ctx.fillText('IN', Math.min(inPx + 4, w - 20 * dpr), 14 * dpr);
  }

  // OUT cursor (red line)
  if (outPx >= 0 && outPx <= w) {
    ctx.fillStyle = '#f87171';
    ctx.fillRect(outPx - 1, 0, 3, h);
    ctx.font = `bold ${Math.round(11 * dpr)}px sans-serif`;
    ctx.fillText('OUT', Math.max(outPx - 30 * dpr, 2), 14 * dpr);
  }

  updateTrimCursorUI(vStart, vEnd);
}

function updateTrimReadouts() {
  const inEl = document.getElementById('trimInTime');
  const outEl = document.getElementById('trimOutTime');
  const durEl = document.getElementById('trimDuration');
  if (inEl) inEl.textContent = `${trimIn.toFixed(3)}s`;
  if (outEl) outEl.textContent = `${trimOut.toFixed(3)}s`;
  if (durEl) durEl.textContent = `${Math.max(0, trimOut - trimIn).toFixed(3)}s`;
}

function setTrimPointToPlayhead(which) {
  if (!trimBuffer) return;
  const MIN_GAP = 0.001;
  const dur = Math.max(0, trimBuffer.duration || 0);
  const t0 = clamp(trimCursorTime, 0, dur);

  if (which === 'in') {
    let newIn = clamp(t0, 0, Math.max(0, dur - MIN_GAP));
    let newOut = trimOut;
    if (newIn > newOut - MIN_GAP) {
      newOut = clamp(newIn + MIN_GAP, MIN_GAP, dur);
    }
    trimOut = clamp(newOut, MIN_GAP, dur);
    trimIn = clamp(newIn, 0, Math.max(0, trimOut - MIN_GAP));
  } else if (which === 'out') {
    let newOut = clamp(t0, MIN_GAP, dur);
    let newIn = trimIn;
    if (newOut < newIn + MIN_GAP) {
      newIn = clamp(newOut - MIN_GAP, 0, Math.max(0, dur - MIN_GAP));
    }
    trimIn = clamp(newIn, 0, Math.max(0, newOut - MIN_GAP));
    trimOut = clamp(newOut, trimIn + MIN_GAP, dur);
  } else {
    return;
  }

  try {
    if (trimTestSource) {
      trimTestSource.loopStart = trimIn;
      trimTestSource.loopEnd = trimOut;
    }
  } catch {}

  updateTrimReadouts();
  drawTrimWaveform();
}

function handleTrimPointerDown(e) {
  const cvs = document.getElementById('trimCanvas');
  if (!cvs || !trimBuffer) return;
  const rect = cvs.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const frac = x / rect.width;
  const { start: vStart, end: vEnd } = getTrimViewSpan();
  const timeAtX = vStart + frac * (vEnd - vStart);

  // Determine which cursor is closest (within grab radius).
  const pixelWidth = rect.width;
  const grabRadius = 20; // px
  const inPx = ((trimIn - vStart) / (vEnd - vStart)) * pixelWidth;
  const outPx = ((trimOut - vStart) / (vEnd - vStart)) * pixelWidth;
  const distIn = Math.abs(x - inPx);
  const distOut = Math.abs(x - outPx);

  if (distIn <= grabRadius && distIn <= distOut) {
    trimDragging = 'in';
  } else if (distOut <= grabRadius) {
    trimDragging = 'out';
  } else {
    // Tap background: move playhead here for easier zoom focus.
    trimCursorTime = clamp(timeAtX, 0, Math.max(0, trimBuffer.duration || 0));
    updateTrimCursorUI(vStart, vEnd);
    trimDragging = 'pan';
    trimDragStartX = e.clientX;
    trimPanStartView = trimViewStart;
  }
  try { cvs.setPointerCapture(e.pointerId); } catch {}
  e.preventDefault();
}

function handleTrimPointerMove(e) {
  if (!trimDragging || !trimBuffer) return;
  const cvs = document.getElementById('trimCanvas');
  if (!cvs) return;
  const rect = cvs.getBoundingClientRect();
  const dur = trimBuffer.duration;

  if (trimDragging === 'pan') {
    const dx = e.clientX - trimDragStartX;
    const { start: vStart, end: vEnd } = getTrimViewSpan();
    const viewDur = vEnd - vStart;
    const shift = -(dx / rect.width) * viewDur;
    trimViewStart = Math.max(0, Math.min(dur - viewDur, trimPanStartView + shift));
    drawTrimWaveform();
    return;
  }

  const x = e.clientX - rect.left;
  const frac = Math.max(0, Math.min(1, x / rect.width));
  const { start: vStart, end: vEnd } = getTrimViewSpan();
  const time = vStart + frac * (vEnd - vStart);

  if (trimDragging === 'in') {
    trimIn = Math.max(0, Math.min(time, trimOut - 0.001));
  } else if (trimDragging === 'out') {
    trimOut = Math.max(trimIn + 0.001, Math.min(time, dur));
  }
  updateTrimReadouts();
  drawTrimWaveform();
}

function handleTrimPointerUp(e) {
  if (!trimDragging) return;
  trimDragging = null;
  const cvs = document.getElementById('trimCanvas');
  try { if (cvs) cvs.releasePointerCapture(e.pointerId); } catch {}
}

function handleTrimCursorPointerDown(e) {
  if (!trimBuffer) return;
  stopTrimCursorFollow();
  trimCursorDragging = true;
  trimCursorPointerId = e.pointerId;
  const cursorEl = e.currentTarget;
  try { cursorEl.setPointerCapture(e.pointerId); } catch {}
  handleTrimCursorPointerMove(e);
  e.preventDefault();
}

function handleTrimCursorPointerMove(e) {
  if (!trimCursorDragging || !trimBuffer) return;
  if (trimCursorPointerId != null && e.pointerId !== trimCursorPointerId) return;
  const cursorEl = document.getElementById('trimCursor');
  if (!cursorEl || !cursorEl.parentElement) return;

  const rect = cursorEl.parentElement.getBoundingClientRect();
  const x = clamp(e.clientX - rect.left, 0, rect.width);
  const frac = rect.width ? (x / rect.width) : 0;
  const { start: vStart, end: vEnd } = getTrimViewSpan();
  trimCursorTime = vStart + frac * (vEnd - vStart);
  updateTrimCursorUI(vStart, vEnd);
  e.preventDefault();
}

function handleTrimCursorPointerUp(e) {
  if (!trimCursorDragging) return;
  if (trimCursorPointerId != null && e.pointerId !== trimCursorPointerId) return;
  trimCursorDragging = false;
  const cursorEl = document.getElementById('trimCursor');
  try { if (cursorEl) cursorEl.releasePointerCapture(e.pointerId); } catch {}
  trimCursorPointerId = null;
}

function handleTrimCursorKeyDown(e) {
  if (!trimBuffer) return;
  const dur = Math.max(0, trimBuffer.duration || 0);
  const step = e.shiftKey ? 0.05 : 0.005;
  if (e.key === 'ArrowLeft') {
    trimCursorTime = clamp(trimCursorTime - step, 0, dur);
    updateTrimCursorUI();
    e.preventDefault();
  } else if (e.key === 'ArrowRight') {
    trimCursorTime = clamp(trimCursorTime + step, 0, dur);
    updateTrimCursorUI();
    e.preventDefault();
  }
}

function stopTrimTest(rampOut = 0.05, pauseOutput = true) {
  stopTrimCursorFollow();
  trimStopCleanupToken++;
  const token = trimStopCleanupToken;

  const src = trimTestSource;
  const gain = trimTestGain;
  trimTestSource = null;
  trimTestGain = null;

  if (!audioCtx || !src) {
    if (pauseOutput) {
      try { if (!loopSource && audioOut) audioOut.pause(); } catch {}
    }
    try { if (gain) gain.disconnect(); } catch {}
    return;
  }

  const now = audioCtx.currentTime;

  // Avoid an audible wrap during the fade window.
  try { src.loop = false; } catch {}

  // Fast-path stop.
  if (!rampOut || rampOut <= 0) {
    try { if (gain) { try { gain.disconnect(); } catch {} } } catch {}
    try { src.stop(now); } catch {}
    try { src.disconnect(); } catch {}
    if (pauseOutput) {
      try { if (!loopSource && audioOut) audioOut.pause(); } catch {}
    }
    return;
  }

  try {
    if (gain) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + rampOut);
    }

    // Mirror main stop behavior: ramp master down so the stream is truly quiet.
    try {
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + rampOut);
    } catch {}

    try { src.stop(now + rampOut + 0.001); } catch {}
  } finally {
    setTimeout(() => {
      if (trimStopCleanupToken !== token) return;
      try { src.disconnect(); } catch {}
      try { if (gain) gain.disconnect(); } catch {}

      // iOS/Safari: pausing flushes the MediaStream-><audio> buffer to prevent stutter tails.
      if (pauseOutput) {
        try {
          if (!loopSource && !trimTestSource && audioOut) audioOut.pause();
        } catch {}
      }
    }, Math.ceil((rampOut + 0.01) * 1000));
  }
}

async function playTrimTest() {
  if (!trimBuffer || !audioCtx) return;
  stopTrimTest();
  ensureAudio();
  if (audioCtx.state === 'suspended') { try { await audioCtx.resume(); } catch {} }
  startOutputIfNeeded();
  // Stop any main playback to avoid overlap.
  stopLoop(0, false);

  trimTestSource = audioCtx.createBufferSource();
  trimTestSource.buffer = trimBuffer;
  trimTestSource.loop = true;
  trimTestSource.loopStart = trimIn;
  trimTestSource.loopEnd = trimOut;
  try { trimTestSource.playbackRate.setValueAtTime(1, audioCtx.currentTime); } catch {}

  trimTestGain = audioCtx.createGain();
  trimTestGain.gain.setValueAtTime(0, audioCtx.currentTime);
  trimTestGain.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.03);

  trimTestSource.connect(trimTestGain);
  trimTestGain.connect(master);

  master.gain.cancelScheduledValues(audioCtx.currentTime);
  master.gain.setValueAtTime(master.gain.value, audioCtx.currentTime);
  master.gain.linearRampToValueAtTime(volumeVal, audioCtx.currentTime + 0.03);

  trimTestSource.start(audioCtx.currentTime, trimIn);
  startOutputIfNeeded();
  setStatus('Playing trim preview…');
  startTrimCursorFollow();
}

async function renderTrimmedBufferOffline(buffer, startSec, endSec) {
  const sr = buffer.sampleRate;
  const channels = buffer.numberOfChannels;
  const dur = Math.max(0, (endSec - startSec) || 0);
  const frames = Math.max(1, Math.ceil(dur * sr));

  // Prefer OfflineAudioContext render (handles any internal format nuances).
  try {
    const off = new OfflineAudioContext(channels, frames, sr);
    const src = off.createBufferSource();
    src.buffer = buffer;
    src.connect(off.destination);
    src.start(0, Math.max(0, startSec), dur);
    const rendered = await off.startRendering();
    if (rendered) return rendered;
  } catch {}

  // Fallback: direct channel copy.
  const out = new AudioBuffer({ length: frames, numberOfChannels: channels, sampleRate: sr });
  const s0 = Math.max(0, Math.floor(startSec * sr));
  for (let c = 0; c < channels; c++) {
    const srcCh = buffer.getChannelData(c);
    const dstCh = out.getChannelData(c);
    for (let i = 0; i < frames; i++) {
      dstCh[i] = srcCh[s0 + i] || 0;
    }
  }
  return out;
}

function encodeWavBlobFromAudioBuffer(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;
  const totalSize = 44 + dataSize;
  const ab = new ArrayBuffer(totalSize);
  const view = new DataView(ab);

  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  // RIFF header
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');

  // fmt chunk
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM
  view.setUint16(20, 1, true);  // AudioFormat=PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits

  // data chunk
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave and convert to int16
  const channels = [];
  for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c));
  let o = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let c = 0; c < numChannels; c++) {
      let s = channels[c][i] || 0;
      s = Math.max(-1, Math.min(1, s));
      const v = s < 0 ? Math.round(s * 32768) : Math.round(s * 32767);
      view.setInt16(o, v, true);
      o += 2;
    }
  }

  return new Blob([ab], { type: 'audio/wav' });
}

function getCurrentTrimRange() {
  if (!trimBuffer) return null;
  const dur = trimBuffer.duration || 0;
  const inSec = clamp(trimIn, 0, Math.max(0, dur - 0.001));
  const outSec = clamp(trimOut, inSec + 0.001, dur);
  const segDur = outSec - inSec;
  if (!isFinite(segDur) || segDur <= 0.001) return null;
  return { inSec, outSec, segDur };
}

function withTrimmedSuffix(name, suffix) {
  const base = (name || 'Audio').trim();
  const cleaned = base.replace(/\s*\(trimmed[^)]*\)\s*$/i, '').trim();
  return `${cleaned} ${suffix}`;
}

async function saveTrimPointsToOriginal() {
  if (!trimPreset || !trimPreset.id || !trimBuffer) { setStatus('Nothing to save'); return; }
  const range = getCurrentTrimRange();
  if (!range) { setStatus('Trim is too short'); return; }

  trimPreset.trimIn = range.inSec;
  trimPreset.trimOut = range.outSec;
  // Persist to IndexedDB upload record.
  try {
    const db = await openUploadsDb();
    const rec = await idbTx(db, 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const req = store.get(trimPreset.id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    });
    if (rec) {
      rec.trimIn = range.inSec;
      rec.trimOut = range.outSec;
      await idbTx(db, 'readwrite', (store) => store.put(rec));
    }
    try { db.close(); } catch {}
  } catch {}
  setStatus('Trim points saved');
}

async function createTrimmedLoopAsWav() {
  if (!trimPreset || !trimBuffer) { setStatus('Nothing to save'); return; }
  const range = getCurrentTrimRange();
  if (!range) { setStatus('Trim is too short'); return; }

  try {
    setStatus('Rendering trimmed loop…');
    const rendered = await renderTrimmedBufferOffline(trimBuffer, range.inSec, range.outSec);
    setStatus('Encoding WAV…');
    const wavBlob = encodeWavBlobFromAudioBuffer(rendered);

    const baseName = (trimPreset.name || 'Audio').trim();
    const name = baseName.toLowerCase().includes('(trimmed)') ? baseName : `${baseName} (Trimmed)`;

    const saved = await savePersistedUpload({
      name,
      blob: wavBlob,
      trimIn: 0,
      trimOut: rendered.duration || range.segDur
    });

    addUserPresetFromBlob({ name, blob: wavBlob, saved });
    try { renderLoopsPage(); } catch {}
    stopTrimTest();
    switchTab('loops');
    setStatus('Trimmed loop created (WAV)');
  } catch {
    setStatus('Failed to create trimmed loop');
  }
}

async function encodeCompressedWithMediaRecorder(buffer, mimeType) {
  // Returns Blob or null.
  try {
    if (typeof MediaRecorder === 'undefined') return null;
    if (!MediaRecorder.isTypeSupported || !MediaRecorder.isTypeSupported(mimeType)) return null;

    const sr = buffer.sampleRate;
    const channels = buffer.numberOfChannels;
    // Use a short-lived context only for encoding.
    const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: sr });
    const dest = ctx.createMediaStreamDestination();
    const gain = ctx.createGain();
    gain.gain.value = 1;
    gain.connect(dest);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);

    const rec = new MediaRecorder(dest.stream, { mimeType });
    const chunks = [];
    rec.ondataavailable = (e) => { try { if (e.data && e.data.size) chunks.push(e.data); } catch {} };

    const result = await new Promise((resolve) => {
      rec.onstop = () => {
        try { resolve(chunks.length ? new Blob(chunks, { type: mimeType }) : null); } catch { resolve(null); }
      };
      rec.onerror = () => resolve(null);
      try { rec.start(250); } catch { resolve(null); return; }
      try { source.start(0); } catch {}
      // Stop after playback ends.
      const ms = Math.max(50, Math.ceil((buffer.duration + 0.05) * 1000));
      setTimeout(() => {
        try { rec.stop(); } catch {}
        try { source.stop(); } catch {}
        try { source.disconnect(); } catch {}
        try { gain.disconnect(); } catch {}
        try { ctx.close(); } catch {}
      }, ms);
    });

    return result;
  } catch {
    return null;
  }
}

async function createTrimmedLoopAsCompressed() {
  if (!trimPreset || !trimBuffer) { setStatus('Nothing to save'); return; }
  const range = getCurrentTrimRange();
  if (!range) { setStatus('Trim is too short'); return; }

  try {
    setStatus('Rendering trimmed loop…');
    const rendered = await renderTrimmedBufferOffline(trimBuffer, range.inSec, range.outSec);

    // Try a smaller format first (Safari/iOS often supports audio/mp4).
    setStatus('Encoding compressed audio…');
    const preferredTypes = [
      'audio/mp4',
      'audio/aac',
      'audio/webm;codecs=opus'
    ];

    let blob = null;
    let usedType = '';
    for (const t of preferredTypes) {
      blob = await encodeCompressedWithMediaRecorder(rendered, t);
      if (blob && blob.size) { usedType = t; break; }
    }

    let suffix = '(Trimmed Compressed)';
    let statusLabel = 'compressed';
    if (usedType.includes('mp4') || usedType.includes('aac')) {
      suffix = '(Trimmed AAC)';
      statusLabel = 'AAC';
    }

    if (!blob || !blob.size) {
      // Fallback to WAV.
      setStatus('Compressed not supported — saving WAV…');

      setStatus('Encoding WAV…');
      const wavBlob = encodeWavBlobFromAudioBuffer(rendered);
      const name = withTrimmedSuffix(trimPreset.name, '(Trimmed WAV)');

      const saved = await savePersistedUpload({
        name,
        blob: wavBlob,
        trimIn: 0,
        trimOut: rendered.duration || range.segDur
      });

      addUserPresetFromBlob({ name, blob: wavBlob, saved });
      try { renderLoopsPage(); } catch {}
      stopTrimTest();
      switchTab('loops');
      setStatus('Trimmed loop created (WAV)');
      return;
    }

    const name = withTrimmedSuffix(trimPreset.name, suffix);

    const saved = await savePersistedUpload({
      name,
      blob,
      trimIn: 0,
      trimOut: rendered.duration || range.segDur
    });

    addUserPresetFromBlob({ name, blob, saved });
    try { renderLoopsPage(); } catch {}
    stopTrimTest();
    switchTab('loops');
    setStatus(`Trimmed loop created (${statusLabel})`);
  } catch {
    setStatus('Failed to create trimmed loop');
  }
}

function showTrimSaveOptions() {
  let ov = document.getElementById('trimSaveOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'trimSaveOverlay';
    ov.className = 'overlay hidden';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', 'Save trim');
    ov.innerHTML = `<div class="overlay-card">
      <h2>Save Trim</h2>
      <p class="hint">Choose how you want to save this trim.</p>
      <div class="picker-list" aria-label="Save options">
        <button id="trimSavePoints" type="button">Save trim points (original)</button>
        <button id="trimSaveWav" type="button">Create new trimmed loop (WAV)</button>
        <button id="trimSaveCompressed" type="button">Create new trimmed loop (smaller file)</button>
      </div>
      <div class="overlay-actions">
        <button id="trimSaveCancel" class="secondary" type="button">Cancel</button>
      </div>
    </div>`;
    document.body.appendChild(ov);

    const close = () => {
      ov.classList.add('hidden');
      try { updateScrollState(); } catch {}
    };

    ov.querySelector('#trimSaveCancel').addEventListener('click', close);
    ov.addEventListener('click', (e) => { if (e.target === ov) close(); });

    ov.querySelector('#trimSavePoints').addEventListener('click', async () => {
      close();
      await saveTrimPointsToOriginal();
    });
    ov.querySelector('#trimSaveWav').addEventListener('click', async () => {
      close();
      await createTrimmedLoopAsWav();
    });
    ov.querySelector('#trimSaveCompressed').addEventListener('click', async () => {
      close();
      await createTrimmedLoopAsCompressed();
    });
  }
  ov.classList.remove('hidden');
  try { updateScrollState(); } catch {}
}

async function resetTrimPoints() {
  if (!trimBuffer) return;
  const pts = computeLoopPoints(trimBuffer);
  trimIn = pts.start;
  trimOut = pts.end;
  updateTrimReadouts();
  drawTrimWaveform();
  // Also clear persisted trim.
  if (trimPreset) {
    delete trimPreset.trimIn;
    delete trimPreset.trimOut;
    if (trimPreset.id) {
      try {
        const db = await openUploadsDb();
        const rec = await idbTx(db, 'readonly', (store) => {
          return new Promise((resolve, reject) => {
            const req = store.get(trimPreset.id);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
          });
        });
        if (rec) {
          delete rec.trimIn;
          delete rec.trimOut;
          await idbTx(db, 'readwrite', (store) => store.put(rec));
        }
        try { db.close(); } catch {}
      } catch {}
    }
  }
  setStatus('Trim reset to auto');
}

function refreshLoopsPageSoon() {
  // Some browsers can delay layout/paint after file pickers or long async tasks.
  // Rendering twice (now + next frame) makes the Loops list update reliably.
  try { renderLoopsPage(); } catch {}
  try {
    requestAnimationFrame(() => {
      try { renderLoopsPage(); } catch {}
      try { updateScrollState(); } catch {}
    });
  } catch {
    setTimeout(() => {
      try { renderLoopsPage(); } catch {}
      try { updateScrollState(); } catch {}
    }, 0);
  }
}

function renderLoopsPage() {
  const bl = document.getElementById('builtinListPage');
  const ul = document.getElementById('uploadsListPage');
  if (!bl || !ul) return;
  bl.innerHTML = '';
  ul.innerHTML = '';

  const mkBtn = (label, onClick) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    li.appendChild(btn);
    return li;
  };

  builtinPresets.forEach(p => {
    bl.appendChild(mkBtn(p.name, async () => {
      try {
        setStatus(`Loading ${p.name}...`);
        const buf = await loadBufferFromUrl(p.path);
        clearPlayerPlaylistContext();
        currentBuffer = buf;
        currentSourceLabel = p.name;
        currentPresetId = null;
        currentPresetRef = null;
        await startLoopFromBuffer(buf, 0.5, 0.03);
        switchTab('player');
      } catch {
        setStatus(`Failed to load ${p.name}`);
      }
    }));
  });

  userPresets.forEach(p => {
    const li = document.createElement('li');
    const row = document.createElement('div');
    row.className = 'preset-item';
    if (p.id) row.dataset.id = p.id;

    const content = document.createElement('div');
    content.className = 'preset-content';

    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'preset-play';
    playBtn.textContent = p.name;
    playBtn.addEventListener('click', async () => {
      try {
        setStatus(`Loading ${p.name}...`);
        let buf = null;
        if (p.blob) {
          const ab = await p.blob.arrayBuffer();
          buf = await decodeArrayBuffer(ab);
        } else if (p.url) {
          buf = await loadBufferFromUrl(p.url);
        }
        if (!buf) { setStatus('Failed to decode.'); return; }
        clearPlayerPlaylistContext();
        currentBuffer = buf;
        currentSourceLabel = p.name;
        currentPresetId = p.id || null;
        currentPresetRef = p;
        await startLoopFromBuffer(buf, 0.5, 0.03);
        switchTab('player');
      } catch {
        setStatus(`Failed to load ${p.name}`);
      }
    });
    content.appendChild(playBtn);

    // Trim button
    if (p.blob) {
      const trimBtn = document.createElement('button');
      trimBtn.type = 'button';
      trimBtn.className = 'preset-trim';
      trimBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>';
      trimBtn.setAttribute('aria-label', `Trim ${p.name}`);
      trimBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openTrimmer(p);
      });
      content.appendChild(trimBtn);
    }

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'preset-delete';
    delBtn.textContent = 'Delete';
    delBtn.setAttribute('aria-label', `Delete ${p.name}`);
    delBtn.addEventListener('click', () => {
      // One tap deletes (swipe-to-reveal is the confirmation step).
      try {
        delBtn.disabled = true;
        delBtn.textContent = 'Deleting…';
      } catch {}
      deleteUserPresetNow(p);
    });

    row.appendChild(content);
    row.appendChild(delBtn);
    li.appendChild(row);
    ul.appendChild(li);

    attachSwipeHandlers(row);
  });
  setTimeout(updateScrollState, 50);
}

function stopLoop(rampOut = 0.05, pauseOutput = true) {
  stopCleanupToken++;
  const token = stopCleanupToken;

  if (!audioCtx) { setStatus('Stopped'); return; }
  const now = audioCtx.currentTime;
  const sourceToStop = loopSource;
  const gainToStop = loopGain;

  // Nothing playing: just ensure output is quiet.
  if (!sourceToStop) {
    try {
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + Math.max(0, rampOut));
    } catch {}
    setStatus('Stopped');
    updateMediaSession('paused');
    return;
  }

  // Fast-path for internal stop/start (startLoopFromBuffer calls stopLoop(0)).
  if (!rampOut || rampOut <= 0) {
    // If this is a looping source, turning off looping avoids an audible wrap.
    try { sourceToStop.loop = false; } catch {}
    try { if (gainToStop) { try { gainToStop.disconnect(); } catch {} } } catch {}
    try { sourceToStop.stop(now); } catch {}
    try { sourceToStop.disconnect(); } catch {}
    if (loopSource === sourceToStop) loopSource = null;
    if (loopGain === gainToStop) loopGain = null;
    try {
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(0, now);
    } catch {}

    // iOS/Safari can have a small MediaStream-><audio> buffer; pausing flushes audible tail.
    // But during an internal switch we must NOT pause the element (it can stay silent until user gesture).
    if (pauseOutput) {
      try { if (audioOut) audioOut.pause(); } catch {}
    }

    setStatus('Stopped');
    updateMediaSession('paused');
    return;
  }

  try {
    // Avoid hearing a loop wrap during the fade-out window.
    try { sourceToStop.loop = false; } catch {}
    if (gainToStop) {
      gainToStop.gain.cancelScheduledValues(now);
      gainToStop.gain.setValueAtTime(gainToStop.gain.value, now);
      gainToStop.gain.linearRampToValueAtTime(0, now + rampOut);
    }
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + rampOut);
    try { sourceToStop.stop(now + rampOut + 0.001); } catch {}
  } finally {
    setTimeout(() => {
      if (stopCleanupToken !== token) return;
      try { sourceToStop.disconnect(); } catch {}
      try { if (gainToStop) gainToStop.disconnect(); } catch {}
      if (loopSource === sourceToStop) loopSource = null;
      if (loopGain === gainToStop) loopGain = null;
      if (pauseOutput) {
        try { if (audioOut) audioOut.pause(); } catch {}
      }
      setStatus('Stopped');
    }, Math.ceil((rampOut + 0.01) * 1000));
  }
  updateMediaSession('paused');
}

function drawWaveform() {
  const cvs = document.getElementById('wave');
  if (!cvs) return;
  const rootStyles = getComputedStyle(document.documentElement);
  const waveBg = (rootStyles.getPropertyValue('--wave-bg') || '').trim() || '#0f141b';
  const accent = (rootStyles.getPropertyValue('--accent') || '').trim() || '#4a90e2';
  const danger = (rootStyles.getPropertyValue('--danger') || '').trim() || '#e24a6a';
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(10, Math.floor(cvs.clientWidth * dpr));
  const h = Math.max(50, Math.floor((cvs.clientHeight || cvs.height) * dpr));
  if (cvs.width !== w) cvs.width = w;
  if (cvs.height !== h) cvs.height = h;
  const ctx = cvs.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = waveBg;
  ctx.fillRect(0, 0, w, h);

  // No buffer loaded: keep an empty/cleared waveform area.
  if (!currentBuffer) {
    updateScrollState();
    return;
  }
  const ch = currentBuffer.numberOfChannels;
  const len = currentBuffer.length;
  const mid = h / 2;
  const step = Math.ceil(len / w);
  ctx.strokeStyle = accent;
  ctx.lineWidth = Math.max(1, dpr);
  ctx.beginPath();
  for (let x = 0; x < w; x++) {
    const i0 = x * step;
    let min = 1, max = -1;
    for (let i = i0; i < Math.min(len, i0 + step); i++) {
      let v = 0;
      for (let c = 0; c < ch; c++) v += currentBuffer.getChannelData(c)[i] || 0;
      v /= Math.max(1, ch);
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const y1 = mid + min * (mid - 2);
    const y2 = mid + max * (mid - 2);
    ctx.moveTo(x + 0.5, y1);
    ctx.lineTo(x + 0.5, y2);
  }
  ctx.stroke();

  if (lastLoopPoints) {
    const { start, end } = lastLoopPoints;
    const dur = currentBuffer.duration || 1;
    const xs = Math.floor((start / dur) * w);
    const xe = Math.floor((end / dur) * w);
    ctx.strokeStyle = danger;
    ctx.lineWidth = Math.max(1, dpr);
    ctx.beginPath();
    ctx.moveTo(xs + 0.5, 0);
    ctx.lineTo(xs + 0.5, h);
    ctx.moveTo(xe + 0.5, 0);
    ctx.lineTo(xe + 0.5, h);
    ctx.stroke();
  }
  updateScrollState();
}

function updateMediaSession(state) {
  if (!('mediaSession' in navigator)) return;
  const ms = navigator.mediaSession;
  try {
    const title = currentSourceLabel || 'SeamlessPlayer Loop';
    ms.metadata = new MediaMetadata({ title, artist: 'SeamlessPlayer', album: 'Loops' });
    if (!mediaSessionHandlersSet) {
      ms.setActionHandler('play', async () => {
        if (!playlistIsPlaying && playerPlaylist && Array.isArray(playerPlaylist.items) && playerPlaylist.items.length) {
          await playActivePlaylist();
          return;
        }
        if (currentBuffer) await startLoopFromBuffer(currentBuffer, 0.5, 0.03);
      });
      ms.setActionHandler('pause', () => { try { stopPlaylistPlayback(); } catch {} stopLoop(0); });
      ms.setActionHandler('stop', () => { try { stopPlaylistPlayback(); } catch {} stopLoop(0); });
      mediaSessionHandlersSet = true;
    }
    ms.playbackState = state || (loopSource ? 'playing' : 'paused');
  } catch {}
}

/* ================================================================
   Settings: Export/Import, Theme, Help
   ================================================================ */

async function exportAppData() {
  try {
    setStatus('Exporting…');
    const playlists = await listPlaylistRecords().catch(() => []);
    const uploads = await listPersistedUploads().catch(() => []);
    // Strip blobs from uploads (too large); export metadata + trim points only.
    const uploadMeta = (uploads || []).map(u => {
      const overrideName = getUploadNameOverride(u && u.id);
      return ({
        id: u.id,
        name: overrideName || u.name,
        createdAt: u.createdAt,
        trimIn: u.trimIn != null ? u.trimIn : undefined,
        trimOut: u.trimOut != null ? u.trimOut : undefined,
      });
    });
    const data = {
      app: 'seamlessplayer',
      version: 1,
      exportedAt: new Date().toISOString(),
      playlists: playlists || [],
      uploads: uploadMeta,
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seamlessplayer-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
    setStatus('Export complete');
  } catch (e) {
    setStatus('Export failed');
  }
}

async function importAppData(file) {
  if (!file) return;
  try {
    setStatus('Importing…');
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data || data.app !== 'seamlessplayer') { setStatus('Invalid backup file'); return; }
    // Import playlists.
    if (Array.isArray(data.playlists)) {
      for (const pl of data.playlists) {
        if (!pl || !pl.id) continue;
        await savePlaylistRecord(pl).catch(() => {});
      }
    }
    // Import upload trim metadata (merge with existing uploads).
    if (Array.isArray(data.uploads)) {
      try {
        const db = await openUploadsDb();
        for (const meta of data.uploads) {
          if (!meta || !meta.id) continue;
          const existing = await idbTx(db, 'readonly', (store) => {
            return new Promise((resolve, reject) => {
              const req = store.get(meta.id);
              req.onsuccess = () => resolve(req.result || null);
              req.onerror = () => reject(req.error);
            });
          }).catch(() => null);
          if (existing) {
            if (meta.trimIn != null) existing.trimIn = meta.trimIn;
            if (meta.trimOut != null) existing.trimOut = meta.trimOut;
            await idbTx(db, 'readwrite', (store) => store.put(existing)).catch(() => {});
          }
        }
        try { db.close(); } catch {}
      } catch {}
    }
    // Refresh userPresets trim data from imported metadata.
    if (Array.isArray(data.uploads)) {
      for (const meta of data.uploads) {
        if (!meta || !meta.id) continue;
        const preset = userPresets.find(p => p && p.id === meta.id);
        if (preset) {
          if (meta.trimIn != null) preset.trimIn = meta.trimIn;
          if (meta.trimOut != null) preset.trimOut = meta.trimOut;
        }
      }
    }
    setStatus('Import complete');
    if (activeTab === 'playlists') renderPlaylistsPage();
    if (activeTab === 'loops') renderLoopsPage();
  } catch (e) {
    setStatus('Import failed — invalid JSON');
  }
}

function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.remove('theme-light');
  if (theme === 'light') root.classList.add('theme-light');
  try { localStorage.setItem('seamlessplayer-theme', theme); } catch {}
  // Update toggle buttons.
  document.querySelectorAll('.theme-opt').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
}

function loadSavedTheme() {
  try {
    const saved = localStorage.getItem('seamlessplayer-theme');
    if (saved === 'light' || saved === 'dark') applyTheme(saved);
  } catch {}
}

function showHelpOverlay() {
  // Reuse the picker overlay (or create a dynamic one).
  let ov = document.getElementById('helpOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'helpOverlay';
    ov.className = 'overlay hidden';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    document.body.appendChild(ov);
  }

  // Always re-render content so language updates apply immediately.
  ov.setAttribute('aria-label', t('help_title'));
  ov.innerHTML = `<div class="overlay-card">
    <h2>${t('help_title')}</h2>
    <div class="help-content">
      <h3>${t('help_player_h')}</h3>
      <p>${t('help_player_p')}</p>
      <h3>${t('help_playlists_h')}</h3>
      <p>${t('help_playlists_p')}</p>
      <h3>${t('help_loops_h')}</h3>
      <p>${t('help_loops_p')}</p>
      <h3>${t('help_trimmer_h')}</h3>
      <p>${t('help_trimmer_p')}</p>
      <h3>${t('help_settings_h')}</h3>
      <p>${t('help_settings_p')}</p>
    </div>
    <div class="overlay-actions"><button id="closeHelp" class="secondary">${t('help_close')}</button></div>
  </div>`;

  ov.querySelector('#closeHelp').addEventListener('click', () => {
    ov.classList.add('hidden');
    try { updateScrollState(); } catch {}
  });

  ov.classList.remove('hidden');
  try { updateScrollState(); } catch {}
}

function bindUI() {
  const playBtn = document.getElementById('play');
  const stopBtn = document.getElementById('stop');
  const repeatBtn = document.getElementById('repeat');
  const volume = document.getElementById('volume');
  const volumeReadout = document.getElementById('volumeReadout');
  const rateJog = document.getElementById('rateJog');
  const rateJogThumb = document.getElementById('rateJogThumb');
  const rateReadout = document.getElementById('rateReadout');
  const fileInput = document.getElementById('fileInput');
  const importLoop = document.getElementById('importLoop');
  const playlistOverlay = document.getElementById('playlistOverlay');
  const playlistCreateView = document.getElementById('playlistCreateView');
  const playlistEditView = document.getElementById('playlistEditView');
  const playlistName = document.getElementById('playlistName');
  const createPlaylistBtn = document.getElementById('createPlaylistBtn');
  const closePlaylistOverlay = document.getElementById('closePlaylistOverlay');
  const playlistTitle = document.getElementById('playlistTitle');
  const playlistRows = document.getElementById('playlistRows');
  const playlistAddLoop = document.getElementById('playlistAddLoop');
  const playlistPlay = document.getElementById('playlistPlay');
  const playlistClose = document.getElementById('playlistClose');

  const newPlaylistFromPage = document.getElementById('newPlaylistFromPage');
  const playlistDeleteOverlay = document.getElementById('playlistDeleteOverlay');
  const confirmDeletePlaylist = document.getElementById('confirmDeletePlaylist');
  const cancelDeletePlaylist = document.getElementById('cancelDeletePlaylist');

  // Detail page buttons
  const detailBack = document.getElementById('detailBack');
  const detailPlay = document.getElementById('detailPlay');
  const detailEdit = document.getElementById('detailEdit');
  const detailDelete = document.getElementById('detailDelete');

  const loopPickerOverlay = document.getElementById('loopPickerOverlay');
  const loopPickerList = document.getElementById('loopPickerList');
  const closeLoopPicker = document.getElementById('closeLoopPicker');
  const pasteBtn = document.getElementById('pasteBtn');
  const urlInput = document.getElementById('urlInput');
  const loadUrl = document.getElementById('loadUrl');
  const loadPreset = document.getElementById('loadPreset');
  const dropZone = document.getElementById('dropZone');

  // Trimmer elements
  const trimBack = document.getElementById('trimBack');
  const trimCanvas = document.getElementById('trimCanvas');
  const trimCursor = document.getElementById('trimCursor');
  const trimZoom = document.getElementById('trimZoom');
  const trimPlayTest = document.getElementById('trimPlayTest');
  const trimStopTest = document.getElementById('trimStopTest');
  const trimSaveBtn = document.getElementById('trimSave');
  const trimResetBtn = document.getElementById('trimReset');
  const trimSetInBtn = document.getElementById('trimSetIn');
  const trimSetOutBtn = document.getElementById('trimSetOut');
  const trimRenameBtn = document.getElementById('trimRename');

  // Settings elements
  const exportJsonBtn = document.getElementById('exportJson');
  const importJsonBtn = document.getElementById('importJson');
  const importJsonInput = document.getElementById('importJsonInput');
  const themeToggle = document.getElementById('themeToggle');
  const settingsHelpBtn = document.getElementById('settingsHelp');
  const langSelect = document.getElementById('langSelect');

  let dragCounter = 0;

  // iOS Files app can be picky about MIME/UTI; broaden accept at runtime (especially in standalone).
  try {
    if (fileInput) {
      const baseAccept = 'audio/*,.mp3,.wav,.m4a,.aac,.aif,.aiff,.caf,.flac,.ogg';
      const accept = (isIOS() && isStandaloneDisplayMode()) ? `${baseAccept},*/*` : baseAccept;
      fileInput.setAttribute('accept', accept);
    }
  } catch {}

  document.querySelectorAll('.tabbar .tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      if (tab) switchTab(tab);
    });
  });

  // Prevent iOS/Safari rotate-zoom by re-locking viewport scale.
  lockViewportScale();

  // Prevent iOS double-tap zoom and gesture zoom.
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEndAt <= 300) {
      e.preventDefault();
      e.stopPropagation();
    }
    lastTouchEndAt = now;
  }, { passive: false });
  document.addEventListener('dblclick', (e) => { e.preventDefault(); }, { passive: false });
  ;['gesturestart','gesturechange','gestureend'].forEach(ev => {
    document.addEventListener(ev, (e) => { e.preventDefault(); }, { passive: false });
  });

  playBtn && playBtn.addEventListener('click', async () => {
    ensureAudio();
    startOutputIfNeeded();

    // If a playlist is loaded in the Player page, Play restarts it.
    if (!playlistIsPlaying && playerPlaylist && Array.isArray(playerPlaylist.items) && playerPlaylist.items.length) {
      await playActivePlaylist();
      return;
    }

    if (currentBuffer) {
      await startLoopFromBuffer(currentBuffer, 0.5, 0.03);
      return;
    }
    try {
      const buf = await loadBufferFromUrl('audio/ambientalsynth.mp3');
      clearPlayerPlaylistContext();
      currentBuffer = buf;
      currentSourceLabel = 'ambientalsynth.mp3';
      currentPresetId = null;
      currentPresetRef = null;
      await startLoopFromBuffer(buf, 0.5, 0.03);
    } catch (e) {
      setStatus('No buffer loaded. Choose a file.');
    }
  });

  // Overall volume
  try {
    if (volume) {
      const v = clamp(Math.round((Number(volumeVal) || 0) * 100), 0, 100);
      volume.value = String(v);
      if (volumeReadout) volumeReadout.textContent = `${v}%`;
    }
  } catch {}

  volume && volume.addEventListener('input', () => {
    const v = clamp(Number(volume.value) || 0, 0, 100);
    volumeVal = clamp(v / 100, 0, 1);
    try { if (volumeReadout) volumeReadout.textContent = `${Math.round(v)}%`; } catch {}
    try {
      if (audioCtx && master) {
        const now = audioCtx.currentTime;
        master.gain.cancelScheduledValues(now);
        master.gain.setValueAtTime(master.gain.value, now);
        master.gain.setTargetAtTime(volumeVal, now, 0.06);
      }
    } catch {}
  });

  // Initialize now-playing label state.
  try { updateNowPlayingNameUI(); } catch {}

  stopBtn && stopBtn.addEventListener('click', () => stopLoop(0));

  // Stop should also stop playlist sequencing.
  stopBtn && stopBtn.addEventListener('click', () => {
    try { stopPlaylistPlayback(); } catch {}
  });

  // Repeat button toggles playlist repeat mode.
  repeatBtn && repeatBtn.addEventListener('click', () => {
    playlistRepeat = !playlistRepeat;
    repeatBtn.classList.toggle('active', playlistRepeat);
    repeatBtn.setAttribute('aria-pressed', String(playlistRepeat));
    setStatus(playlistRepeat ? 'Repeat: ON' : 'Repeat: OFF');
  });

  // ---- Playlist detail page wiring ----
  detailBack && detailBack.addEventListener('click', () => {
    detailEditMode = false;
    switchTab('playlists');
  });

  detailPlay && detailPlay.addEventListener('click', async () => {
    if (!activePlaylist) return;
    setPlayerPlaylist(activePlaylist);
    await playActivePlaylist();
  });

  detailEdit && detailEdit.addEventListener('click', () => {
    detailEditMode = !detailEditMode;
    renderPlaylistDetail();
  });

  detailDelete && detailDelete.addEventListener('click', () => {
    if (!activePlaylist) return;
    pendingDeletePlaylistId = activePlaylist.id;
    const txt = document.getElementById('playlistDeleteText');
    if (txt) txt.textContent = `Delete "${activePlaylist.name || 'Playlist'}"?`;
    const ov = document.getElementById('playlistDeleteOverlay');
    if (ov) ov.classList.remove('hidden');
    try { updateScrollState(); } catch {}
  });

  // Import Loop button (Audio Loops page)
  importLoop && importLoop.addEventListener('click', () => {
    try { fileInput && fileInput.click(); } catch {}
  });

  // Playback rate jog wheel
  if (rateJog) {
    const rateJogTrack = rateJog.querySelector('.rate-jog-track');

    const getJogMetrics = () => {
      const jogRect = rateJog.getBoundingClientRect();
      const trackRect = (rateJogTrack ? rateJogTrack.getBoundingClientRect() : jogRect);
      const thumbRect = (rateJogThumb ? rateJogThumb.getBoundingClientRect() : { width: 54 });

      const thumbHalf = Math.max(1, (thumbRect.width || 54) / 2);

      const localTrackLeft = trackRect.left - jogRect.left;
      const localTrackRight = trackRect.right - jogRect.left;

      let minCenterX = localTrackLeft + thumbHalf;
      let maxCenterX = localTrackRight - thumbHalf;
      if (!(maxCenterX > minCenterX)) {
        const mid = (localTrackLeft + localTrackRight) / 2;
        minCenterX = mid;
        maxCenterX = mid;
      }

      return { jogRect, minCenterX, maxCenterX };
    };

    const updateRateUI = (norm, displayRate = currentRate) => {
      const n = clamp(norm || 0, -1, 1);
      if (rateJogThumb) {
        const { minCenterX, maxCenterX } = getJogMetrics();
        const t = (n + 1) / 2;
        const cx = minCenterX + t * (maxCenterX - minCenterX);
        rateJogThumb.style.left = `${cx}px`;
        rateJogThumb.style.transform = 'translateX(-50%)';
      }
      if (rateReadout) rateReadout.textContent = `${Number(displayRate).toFixed(2)}×`;
      try {
        rateJog.setAttribute('aria-valuenow', String(displayRate));
        rateJog.setAttribute('aria-valuetext', `${Number(displayRate).toFixed(2)}x`);
      } catch {}
    };

    const normToRate = (norm) => {
      const n = clamp(norm, -1, 1);
      // Reduce sensitivity near center for finer control.
      const shaped = Math.sign(n) * Math.pow(Math.abs(n), 1.7);
      if (shaped < 0) return 1.0 + shaped * (1.0 - RATE_MIN);
      return 1.0 + shaped * (RATE_MAX - 1.0);
    };

    let active = false;
    let pointerId = null;
    let committedNorm = 0;
    let dragNorm = 0;
    let pendingRate = 1.0;
    let lastTapAt = 0;
    let lastTapX = 0;
    let lastTapY = 0;

    const setFromClientX = (clientX) => {
      const { jogRect, minCenterX, maxCenterX } = getJogMetrics();
      const x = clientX - jogRect.left;
      const clampedX = clamp(x, minCenterX, maxCenterX);
      const span = Math.max(1e-6, (maxCenterX - minCenterX));
      const t = (clampedX - minCenterX) / span;
      const norm = clamp(t * 2 - 1, -1, 1);
      dragNorm = norm;
      pendingRate = normToRate(norm);
      updateRateUI(norm, pendingRate);
    };

    const commitPending = () => {
      ensureAudio();
      setPlaybackRate(pendingRate, { smooth: true });
      committedNorm = dragNorm;
      updateRateUI(committedNorm, currentRate);
    };

    const resetToCenter = () => {
      pendingRate = 1.0;
      dragNorm = 0;
      committedNorm = 0;
      ensureAudio();
      setPlaybackRate(1.0, { smooth: true });
      updateRateUI(0, 1.0);
    };

    const onDown = (e) => {
      active = true;
      pointerId = e.pointerId;
      try { rateJog.setPointerCapture(pointerId); } catch {}
      setFromClientX(e.clientX);
      e.preventDefault();
    };

    const onMove = (e) => {
      if (!active) return;
      if (pointerId != null && e.pointerId !== pointerId) return;
      setFromClientX(e.clientX);
      e.preventDefault();
    };

    const onUp = (e) => {
      if (!active) return;
      if (pointerId != null && e.pointerId !== pointerId) return;
      active = false;
      pointerId = null;

      // Double-tap to reset to center (0 => 1.0x).
      try {
        const now = Date.now();
        const dx = Math.abs((e.clientX || 0) - lastTapX);
        const dy = Math.abs((e.clientY || 0) - lastTapY);
        const within = (now - lastTapAt) <= 320 && dx < 22 && dy < 22;
        lastTapAt = now;
        lastTapX = e.clientX || 0;
        lastTapY = e.clientY || 0;
        if (within) {
          resetToCenter();
          e.preventDefault();
          return;
        }
      } catch {}

      // Apply rate only after release.
      commitPending();
      e.preventDefault();
    };

    rateJog.addEventListener('pointerdown', onDown);
    rateJog.addEventListener('pointermove', onMove);
    rateJog.addEventListener('pointerup', onUp);
    rateJog.addEventListener('pointercancel', onUp);

    // Minimal keyboard nudges: arrow keys adjust and apply immediately.
    rateJog.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      ensureAudio();
      const step = 0.02;
      const dir = (e.key === 'ArrowLeft') ? -1 : 1;
      const target = clamp(currentRate + dir * step, RATE_MIN, RATE_MAX);
      setPlaybackRate(target, { smooth: true });
      // Approximate thumb position from rate.
      // Map back to a norm for display only.
      let n = 0;
      if (currentRate < 1) n = -Math.pow((1 - currentRate) / (1 - RATE_MIN), 1 / 1.7);
      else n = Math.pow((currentRate - 1) / (RATE_MAX - 1), 1 / 1.7);
      committedNorm = clamp(n, -1, 1);
      pendingRate = currentRate;
      dragNorm = committedNorm;
      updateRateUI(committedNorm, currentRate);
      e.preventDefault();
    });

    // Desktop double-click reset.
    rateJog.addEventListener('dblclick', (e) => {
      try { resetToCenter(); } catch {}
      e.preventDefault();
    });

    // Initialize
    setPlaybackRate(currentRate, { smooth: false });
    committedNorm = 0;
    pendingRate = currentRate;
    dragNorm = committedNorm;
    updateRateUI(committedNorm, currentRate);
  }

  const showOverlay = (el) => {
    if (!el) return;
    el.classList.remove('hidden');
    try { updateScrollState(); } catch {}
  };

  const hideOverlay = (el) => {
    if (!el) return;
    el.classList.add('hidden');
    try { updateScrollState(); } catch {}
  };

  let savePlaylistTimer = 0;
  const saveActivePlaylistSoon = () => {
    if (!activePlaylist || !activePlaylist.id) return;
    if (savePlaylistTimer) clearTimeout(savePlaylistTimer);
    savePlaylistTimer = setTimeout(() => {
      savePlaylistTimer = 0;
      savePlaylistRecord(activePlaylist).catch(() => {});
    }, 150);
  };

  const renderPlaylistRows = () => {
    if (!playlistRows) return;
    playlistRows.innerHTML = '';
    const items = (activePlaylist && Array.isArray(activePlaylist.items)) ? activePlaylist.items : [];

    const addRow = (label, reps, isAddRow, index) => {
      const row = document.createElement('div');
      row.className = 'pl-row';

      if (!isAddRow) {
        const it = items[index];
        if (it && it.itemId) row.dataset.itemId = it.itemId;
      }

      if (isAddRow) {
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.textContent = 'Add';
        addBtn.addEventListener('click', () => {
          playlistPickIndex = index;
          openLoopPicker();
        });
        row.appendChild(addBtn);
      } else {
        const nameWrap = document.createElement('div');
        nameWrap.className = 'pl-name-wrap';

        const handle = document.createElement('div');
        handle.className = 'pl-handle';
        handle.textContent = '≡';
        handle.setAttribute('aria-label', 'Reorder');
        handle.setAttribute('role', 'button');
        handle.tabIndex = 0;

        const nameEl = document.createElement('div');
        nameEl.className = 'pl-name';
        nameEl.textContent = label || 'Loop';

        nameWrap.appendChild(handle);
        nameWrap.appendChild(nameEl);
        row.appendChild(nameWrap);
      }

      const repsInput = document.createElement('input');
      repsInput.className = 'pl-reps';
      repsInput.type = 'number';
      repsInput.min = '1';
      repsInput.step = '1';
      repsInput.value = String(Math.max(1, parseInt(reps, 10) || 1));
      repsInput.setAttribute('aria-label', 'Repetitions');
      if (isAddRow) repsInput.disabled = true;
      repsInput.addEventListener('change', () => {
        if (!activePlaylist || !activePlaylist.items || !activePlaylist.items[index]) return;
        const v = Math.max(1, parseInt(repsInput.value, 10) || 1);
        activePlaylist.items[index].reps = v;
        saveActivePlaylistSoon();
      });
      row.appendChild(repsInput);

      playlistRows.appendChild(row);
    };

    items.forEach((it, idx) => {
      addRow(it && it.label, it && it.reps, false, idx);
    });

    // Next row shows Add button for next loop.
    addRow('', 1, true, items.length);

    // Enable drag-to-reorder for item rows.
    attachPlaylistReorderHandlers();
  };

  const attachPlaylistReorderHandlers = () => {
    if (!playlistRows || !activePlaylist || !Array.isArray(activePlaylist.items)) return;
    const rows = Array.from(playlistRows.querySelectorAll('.pl-row'));
    const itemRows = rows.filter(r => r && r.dataset && r.dataset.itemId);

    let draggingRow = null;
    let draggingId = null;
    let pointerId = null;

    const rebuildOrderFromDom = () => {
      if (!activePlaylist || !Array.isArray(activePlaylist.items)) return;
      const order = Array.from(playlistRows.querySelectorAll('.pl-row'))
        .map(r => r && r.dataset && r.dataset.itemId)
        .filter(Boolean);

      const map = new Map(activePlaylist.items.map(it => [it && it.itemId, it]));
      const next = [];
      for (const id of order) {
        const it = map.get(id);
        if (it) next.push(it);
      }
      // Keep any items that may have been missed (shouldn't happen).
      for (const it of activePlaylist.items) {
        if (it && it.itemId && !order.includes(it.itemId)) next.push(it);
      }
      activePlaylist.items = next;
      saveActivePlaylistSoon();
    };

    const moveRowToPointer = (clientY) => {
      if (!draggingRow) return;
      const siblings = Array.from(playlistRows.querySelectorAll('.pl-row'))
        .filter(r => r && r !== draggingRow && r.dataset && r.dataset.itemId);

      for (const sib of siblings) {
        const rect = sib.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        if (clientY < mid) {
          if (sib !== draggingRow.nextSibling) {
            playlistRows.insertBefore(draggingRow, sib);
          }
          return;
        }
      }
      // If we're below all, append before the add-row (last row without itemId).
      const addRow = Array.from(playlistRows.querySelectorAll('.pl-row')).find(r => !(r && r.dataset && r.dataset.itemId));
      if (addRow) playlistRows.insertBefore(draggingRow, addRow);
      else playlistRows.appendChild(draggingRow);
    };

    const onMove = (e) => {
      if (!draggingRow) return;
      if (pointerId != null && e.pointerId !== pointerId) return;
      moveRowToPointer(e.clientY);
      e.preventDefault();
    };

    const onUp = (e) => {
      if (!draggingRow) return;
      if (pointerId != null && e.pointerId !== pointerId) return;
      try { draggingRow.classList.remove('dragging'); } catch {}
      try { playlistRows.releasePointerCapture(pointerId); } catch {}
      draggingRow = null;
      draggingId = null;
      pointerId = null;
      rebuildOrderFromDom();
      // Re-render to ensure handlers and indices stay consistent.
      renderPlaylistRows();
      e.preventDefault();
    };

    // Remove any previous listeners by re-binding fresh on each render.
    playlistRows.onpointermove = null;
    playlistRows.onpointerup = null;
    playlistRows.onpointercancel = null;
    playlistRows.addEventListener('pointermove', onMove);
    playlistRows.addEventListener('pointerup', onUp);
    playlistRows.addEventListener('pointercancel', onUp);

    itemRows.forEach(r => {
      const handle = r.querySelector('.pl-handle');
      if (!handle) return;
      handle.addEventListener('pointerdown', (e) => {
        // Don't start drag if user interacts with the reps input.
        if (e.target && e.target.closest && e.target.closest('input')) return;
        draggingRow = r;
        draggingId = r.dataset.itemId;
        pointerId = e.pointerId;
        try { r.classList.add('dragging'); } catch {}
        try { playlistRows.setPointerCapture(pointerId); } catch {}
        e.preventDefault();
      });
    });
  };

  const openPlaylistCreate = () => {
    activePlaylistId = null;
    activePlaylist = null;
    if (playlistCreateView) playlistCreateView.classList.remove('hidden');
    if (playlistEditView) playlistEditView.classList.add('hidden');
    showOverlay(playlistOverlay);
    try { if (playlistName) { playlistName.value = ''; playlistName.focus(); } } catch {}
  };

  const openPlaylistEdit = (record) => {
    activePlaylist = record;
    activePlaylistId = record && record.id;
    try {
      if (activePlaylist && Array.isArray(activePlaylist.items)) {
        activePlaylist.items.forEach(it => {
          if (it && !it.itemId) it.itemId = makePlaylistItemId();
        });
      }
    } catch {}
    if (playlistTitle) playlistTitle.textContent = record && record.name ? record.name : 'Playlist';
    if (playlistCreateView) playlistCreateView.classList.add('hidden');
    if (playlistEditView) playlistEditView.classList.remove('hidden');
    showOverlay(playlistOverlay);
    renderPlaylistRows();
  };

  const closePlaylist = () => {
    hideOverlay(playlistOverlay);
    try { setTimeout(updateScrollState, 50); } catch {}
  };

  // Expose to Playlists page renderer.
  openPlaylistCreateOverlay = openPlaylistCreate;
  openPlaylistEditOverlay = openPlaylistEdit;

  const closePicker = () => hideOverlay(loopPickerOverlay);

  const openLoopPicker = () => {
    if (!loopPickerList) return;
    loopPickerList.innerHTML = '';
    const choices = getAllLoopChoices();
    choices.forEach(ch => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = ch.label;
      b.addEventListener('click', () => {
        if (!activePlaylist) return;
        if (!Array.isArray(activePlaylist.items)) activePlaylist.items = [];
        const idx = Math.max(0, playlistPickIndex);
        const item = { itemId: makePlaylistItemId(), presetKey: ch.presetKey, label: ch.label, reps: 1 };
        if (idx >= activePlaylist.items.length) activePlaylist.items.push(item);
        else activePlaylist.items[idx] = item;
        saveActivePlaylistSoon();
        closePicker();
        renderPlaylistRows();
      });
      loopPickerList.appendChild(b);
    });
    showOverlay(loopPickerOverlay);
  };

  newPlaylistFromPage && newPlaylistFromPage.addEventListener('click', () => {
    if (openPlaylistCreateOverlay) openPlaylistCreateOverlay();
  });

  closePlaylistOverlay && closePlaylistOverlay.addEventListener('click', closePlaylist);
  playlistClose && playlistClose.addEventListener('click', closePlaylist);

  createPlaylistBtn && createPlaylistBtn.addEventListener('click', async () => {
    const name = (playlistName && playlistName.value || '').trim();
    if (!name) { setStatus('Enter a playlist name.'); return; }
    const record = { id: makePlaylistId(), name, createdAt: Date.now(), items: [] };
    try {
      await savePlaylistRecord(record);
      // After creating, go to the detail page for the new playlist.
      closePlaylist();
      openPlaylistDetail(record.id);
    } catch {
      setStatus('Failed to create playlist.');
    }
  });

  playlistAddLoop && playlistAddLoop.addEventListener('click', () => {
    playlistPickIndex = activePlaylist && Array.isArray(activePlaylist.items) ? activePlaylist.items.length : 0;
    openLoopPicker();
  });

  closeLoopPicker && closeLoopPicker.addEventListener('click', closePicker);

  playlistPlay && playlistPlay.addEventListener('click', () => {
    if (activePlaylist) setPlayerPlaylist(activePlaylist);
    playActivePlaylist();
    closePlaylist();
  });

  // Playlist delete confirmation overlay
  cancelDeletePlaylist && cancelDeletePlaylist.addEventListener('click', () => {
    pendingDeletePlaylistId = null;
    hideOverlay(playlistDeleteOverlay);
  });

  confirmDeletePlaylist && confirmDeletePlaylist.addEventListener('click', async () => {
    const id = pendingDeletePlaylistId;
    pendingDeletePlaylistId = null;
    hideOverlay(playlistDeleteOverlay);
    if (!id) return;
    try {
      await deletePlaylistRecord(id);
      // If deleting the currently loaded playlist, stop sequencing.
      if (activePlaylist && activePlaylist.id === id) {
        stopPlaylistPlayback();
        activePlaylist = null;
        activePlaylistId = null;
        playlistIsPlaying = false;
      }
      if (playerPlaylistId && String(playerPlaylistId) === String(id)) {
        clearPlayerPlaylistContext();
      }
      // Navigate back to playlists list if on detail page.
      if (activeTab === 'playlist-detail' || activeTab === 'playlists') {
        switchTab('playlists');
      }
      setStatus('Playlist deleted');
    } catch {
      setStatus('Failed to delete playlist');
    }
  });

  fileInput && fileInput.addEventListener('click', () => {
    if (isIOS() && isStandaloneDisplayMode()) {
      setStatus('If your Files items are greyed out, open this site in Safari to import.');
    }
  });

  fileInput && fileInput.addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setStatus(`Decoding ${f.name}...`);
    const ab = await f.arrayBuffer();
    try {
      const buf = await decodeArrayBuffer(ab);
      clearPlayerPlaylistContext();
      currentBuffer = buf;
      currentSourceLabel = f.name || 'File';
      await startLoopFromBuffer(buf, 0.5, 0.03);
      try {
        const saved = await savePersistedUpload({ name: f.name || 'File', blob: f });
        addUserPresetFromBlob({ name: f.name || 'File', blob: f, saved });
        refreshLoopsPageSoon();
      } catch {
        try {
          addUserPresetFromBlob({ name: f.name || 'File', blob: f, saved: null });
          refreshLoopsPageSoon();
        } catch {}
      }
    } catch (err) {
      // Fallback for some iOS exports: decode via object URL -> fetch -> arrayBuffer
      try {
        const url = URL.createObjectURL(f);
        const res = await fetch(url);
        const ab2 = await res.arrayBuffer();
        URL.revokeObjectURL(url);
        const buf2 = await decodeArrayBuffer(ab2);
        clearPlayerPlaylistContext();
        currentBuffer = buf2;
        currentSourceLabel = f.name || 'File';
        await startLoopFromBuffer(buf2, 0.5, 0.03);
        try {
          const saved = await savePersistedUpload({ name: f.name || 'File', blob: f });
          addUserPresetFromBlob({ name: f.name || 'File', blob: f, saved });
          refreshLoopsPageSoon();
        } catch {
          try {
            addUserPresetFromBlob({ name: f.name || 'File', blob: f, saved: null });
            refreshLoopsPageSoon();
          } catch {}
        }
      } catch {
        setStatus('Decode failed. Try a different file or open in Safari for import.');
      }
    }
    // Allow selecting the same file again to retrigger change.
    try { fileInput.value = ''; } catch {}
  });

  pasteBtn && pasteBtn.addEventListener('click', async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          for (const type of item.types) {
            if (type.startsWith('audio/')) {
              const blob = await item.getType(type);
              const ab = await blob.arrayBuffer();
              const buf = await decodeArrayBuffer(ab);
              clearPlayerPlaylistContext();
              currentBuffer = buf;
              currentSourceLabel = `Clipboard ${type}`;
              await startLoopFromBuffer(buf, 0.5, 0.03);
              try {
                const saved = await savePersistedUpload({ name: `Clipboard ${type}`, blob });
                addUserPresetFromBlob({ name: `Clipboard ${type}`, blob, saved });
                refreshLoopsPageSoon();
              } catch {
                try {
                  addUserPresetFromBlob({ name: `Clipboard ${type}`, blob, saved: null });
                  refreshLoopsPageSoon();
                } catch {}
              }
              return;
            }
          }
        }
        setStatus('No audio on clipboard.');
      } else {
        setStatus('Clipboard API not available. Try Cmd/Ctrl+V.');
      }
    } catch (e) {
      setStatus('Clipboard read blocked or failed.');
    }
  });

  window.addEventListener('paste', async (evt) => {
    const files = evt.clipboardData && evt.clipboardData.files;
    if (!files || !files.length) {
      const text = evt.clipboardData && evt.clipboardData.getData('text/plain');
      if (text && /^https?:\/\//i.test(text)) {
        setStatus('Loading from pasted URL...');
        try {
          const buf = await loadBufferFromUrl(text);
          clearPlayerPlaylistContext();
          currentBuffer = buf;
          currentSourceLabel = text;
          await startLoopFromBuffer(buf, 0.5, 0.03);
        } catch {
          setStatus('Failed to load pasted URL');
        }
      }
      return;
    }
    const f = files[0];
    if (!looksLikeAudioFile(f)) return;
    setStatus(`Decoding pasted ${f.name || f.type}...`);
    const ab = await f.arrayBuffer();
    try {
      const buf = await decodeArrayBuffer(ab);
      clearPlayerPlaylistContext();
      currentBuffer = buf;
      currentSourceLabel = f.name || 'Pasted File';
      await startLoopFromBuffer(buf, 0.5, 0.03);
      try {
        const saved = await savePersistedUpload({ name: f.name || 'Pasted File', blob: f });
        addUserPresetFromBlob({ name: f.name || 'Pasted File', blob: f, saved });
        refreshLoopsPageSoon();
      } catch {
        try {
          addUserPresetFromBlob({ name: f.name || 'Pasted File', blob: f, saved: null });
          refreshLoopsPageSoon();
        } catch {}
      }
    } catch (err) {
      setStatus('Decode failed.');
    }
  });

  loadUrl && loadUrl.addEventListener('click', async () => {
    const url = (urlInput && urlInput.value || '').trim();
    if (!url) { setStatus('Enter a URL to load.'); return; }
    try {
      setStatus('Loading URL...');
      const buf = await loadBufferFromUrl(url);
      clearPlayerPlaylistContext();
      currentBuffer = buf;
      currentSourceLabel = url;
      await startLoopFromBuffer(buf, 0.5, 0.03);
      try { userPresets.unshift({ name: url, url }); if (activeTab === 'loops') renderLoopsPage(); } catch {}
    } catch (e) {
      setStatus('Failed to load URL. Check CORS/format.');
    }
  });

  loadPreset && loadPreset.addEventListener('click', () => switchTab('loops'));

  document.addEventListener('visibilitychange', () => {
    try { if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); } catch {}
    startOutputIfNeeded();
  });

  if (dropZone) {
    ['dragenter','dragover','dragleave','drop'].forEach(ev => {
      dropZone.addEventListener(ev, e => {
        e.preventDefault();
        e.stopPropagation();
        if (ev === 'dragenter') {
          dragCounter++;
          dropZone.classList.add('drag-hover');
        } else if (ev === 'dragleave') {
          dragCounter = Math.max(0, dragCounter - 1);
          if (dragCounter === 0) dropZone.classList.remove('drag-hover');
        } else if (ev === 'drop') {
          dragCounter = 0;
          dropZone.classList.remove('drag-hover');
        } else {
          dropZone.classList.add('drag-hover');
        }
      });
    });

    dropZone.addEventListener('drop', async e => {
    const dt = e.dataTransfer;
    dropZone.classList.remove('drag-hover');
    if (!dt) return;
    if (dt.files && dt.files.length) {
      const f = dt.files[0];
      if (!looksLikeAudioFile(f)) { setStatus('Not an audio file.'); return; }
      setStatus(`Decoding ${f.name}...`);
      const ab = await f.arrayBuffer();
      try {
        const buf = await decodeArrayBuffer(ab);
        clearPlayerPlaylistContext();
        currentBuffer = buf;
        currentSourceLabel = f.name || 'Dropped File';
        await startLoopFromBuffer(buf, 0.5, 0.03);
        try {
          const saved = await savePersistedUpload({ name: f.name || 'Dropped File', blob: f });
          addUserPresetFromBlob({ name: f.name || 'Dropped File', blob: f, saved });
          refreshLoopsPageSoon();
        } catch {
          try {
            addUserPresetFromBlob({ name: f.name || 'Dropped File', blob: f, saved: null });
            refreshLoopsPageSoon();
          } catch {}
        }
      } catch (err) {
        setStatus('Decode failed.');
      }
      return;
    }
    const uriList = dt.getData('text/uri-list');
    const text = dt.getData('text/plain');
    const maybeUrl = (uriList || text || '').trim();
    if (maybeUrl && /^https?:\/\//i.test(maybeUrl)) {
      try {
        setStatus('Loading dropped URL...');
        const buf = await loadBufferFromUrl(maybeUrl);
        clearPlayerPlaylistContext();
        currentBuffer = buf;
        currentSourceLabel = maybeUrl;
        await startLoopFromBuffer(buf, 0.5, 0.03);
        try { userPresets.unshift({ name: maybeUrl, url: maybeUrl }); if (activeTab === 'loops') renderLoopsPage(); } catch {}
      } catch {
        setStatus('Failed to load dropped URL');
      }
    }
    });
  }

  // ---- Trimmer bindings ----
  trimBack && trimBack.addEventListener('click', () => {
    stopTrimTest();
    switchTab('loops');
  });

  if (trimCanvas) {
    trimCanvas.addEventListener('pointerdown', handleTrimPointerDown);
    trimCanvas.addEventListener('pointermove', handleTrimPointerMove);
    trimCanvas.addEventListener('pointerup', handleTrimPointerUp);
    trimCanvas.addEventListener('pointercancel', handleTrimPointerUp);
  }

  if (trimCursor) {
    trimCursor.addEventListener('pointerdown', handleTrimCursorPointerDown);
    trimCursor.addEventListener('pointermove', handleTrimCursorPointerMove);
    trimCursor.addEventListener('pointerup', handleTrimCursorPointerUp);
    trimCursor.addEventListener('pointercancel', handleTrimCursorPointerUp);
    trimCursor.addEventListener('keydown', handleTrimCursorKeyDown);
  }

  trimZoom && trimZoom.addEventListener('input', () => {
    const v = parseInt(trimZoom.value, 10) || 1;
    trimZoomLevel = Math.max(1, v);
    // Centre the view around the playhead (drag cursor) when zooming.
    if (trimBuffer) {
      const dur = Math.max(0, trimBuffer.duration || 0);
      const fallback = (trimIn + trimOut) / 2;
      const focus = isFinite(trimCursorTime) ? trimCursorTime : fallback;
      centerTrimViewAt(clamp(focus, 0, dur));
    }
    drawTrimWaveform();
  });

  trimPlayTest && trimPlayTest.addEventListener('click', () => playTrimTest());
  trimStopTest && trimStopTest.addEventListener('click', () => { stopTrimTest(); setStatus('Stopped'); });
  trimSaveBtn && trimSaveBtn.addEventListener('click', () => showTrimSaveOptions());
  trimResetBtn && trimResetBtn.addEventListener('click', () => resetTrimPoints());
  trimSetInBtn && trimSetInBtn.addEventListener('click', () => setTrimPointToPlayhead('in'));
  trimSetOutBtn && trimSetOutBtn.addEventListener('click', () => setTrimPointToPlayhead('out'));

  trimRenameBtn && trimRenameBtn.addEventListener('click', async () => {
    if (!trimPreset) return;
    const current = String(trimPreset.name || '').trim();
    const proposed = prompt(t('trimmer_rename_prompt'), current || t('trimmer_rename_placeholder'));
    if (proposed == null) return;
    const name = String(proposed).trim();
    if (!name) return;

    trimPreset.name = name;
    try {
      if (currentPresetRef && trimPreset === currentPresetRef) {
        currentSourceLabel = name;
      }
    } catch {}

    const titleEl = document.getElementById('trimTitle');
    if (titleEl) titleEl.textContent = name;
    try { if (activeTab === 'loops') renderLoopsPage(); } catch {}
    try { if (trimPreset.id) setUploadNameOverride(trimPreset.id, name); } catch {}
  });

  // ---- Settings bindings ----
  exportJsonBtn && exportJsonBtn.addEventListener('click', () => exportAppData());
  importJsonBtn && importJsonBtn.addEventListener('click', () => {
    if (importJsonInput) importJsonInput.click();
  });
  importJsonInput && importJsonInput.addEventListener('change', () => {
    const f = importJsonInput.files && importJsonInput.files[0];
    if (f) importAppData(f);
    try { importJsonInput.value = ''; } catch {}
  });

  if (themeToggle) {
    themeToggle.querySelectorAll('.theme-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme || 'dark';
        applyTheme(theme);
      });
    });
  }

  settingsHelpBtn && settingsHelpBtn.addEventListener('click', () => showHelpOverlay());

  langSelect && langSelect.addEventListener('change', () => {
    try { applyLanguage(langSelect.value); } catch {}
  });

  // Load saved theme on startup.
  loadSavedTheme();

  // Load saved language on startup.
  applyLanguage(getStoredLang());

  window.addEventListener('resize', () => { drawWaveform(); drawTrimWaveform(); });
  window.addEventListener('orientationchange', () => { setTimeout(drawWaveform, 250); setTimeout(drawTrimWaveform, 250); });
  window.addEventListener('resize', () => updateLandscapeVizState());
  window.addEventListener('orientationchange', () => setTimeout(updateLandscapeVizState, 50));
  window.addEventListener('resize', () => lockViewportScale());
  window.addEventListener('orientationchange', () => {
    lockViewportScale();
    setTimeout(lockViewportScale, 250);
  });
}

window.addEventListener('load', () => {
  ensureAudio();
  lockViewportScale();
  bindUI();
  setStatus(t('status_ready'));
  drawWaveform();
  switchTab('player');
  try { document.body.style.touchAction = 'manipulation'; } catch {}
  updateLandscapeVizState();
  updateScrollState();

  // Load persisted imports (if IndexedDB is available).
  hydratePersistedUploadsIntoUserPresets().then(() => {
    try { if (activeTab === 'loops') renderLoopsPage(); } catch {}
    try { updateScrollState(); } catch {}
  });
});

window.addEventListener('resize', () => setTimeout(updateScrollState, 50));
window.addEventListener('orientationchange', () => setTimeout(updateScrollState, 150));
