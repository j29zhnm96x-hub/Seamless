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
const UPLOAD_DB_NAME = 'seamless-uploads';
const UPLOAD_DB_VERSION = 1;
const UPLOAD_STORE = 'uploads';
const MAX_PERSISTED_UPLOADS = 25;

// Persist playlists across restarts via IndexedDB.
const PLAYLIST_DB_NAME = 'seamless-playlists';
const PLAYLIST_DB_VERSION = 1;
const PLAYLIST_STORE = 'playlists';

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

async function savePersistedUpload({ name, blob }) {
  if (!blob) return null;
  const record = { id: makeUploadId(), name: name || 'Audio', blob, createdAt: Date.now() };
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
      const preset = { id: it.id, name: it.name || 'Audio', blob: it.blob, persisted: true, createdAt: it.createdAt || 0 };
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
let playlistPickIndex = -1;
let playlistPlayToken = 0;
let playlistIsPlaying = false;
let playlistRepeat = false;
let pendingDeletePlaylistId = null;
let detailPlaylistId = null;
let detailEditMode = false;

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
  if (!activePlaylist || !Array.isArray(activePlaylist.items) || !activePlaylist.items.length) {
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

  const items = Array.isArray(activePlaylist.items) ? activePlaylist.items.slice() : [];
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
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'playlist-list-item';

    const nameSpan = document.createElement('span');
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

    const li = document.createElement('li');
    li.appendChild(btn);
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
}

function updateTrimReadouts() {
  const inEl = document.getElementById('trimInTime');
  const outEl = document.getElementById('trimOutTime');
  const durEl = document.getElementById('trimDuration');
  if (inEl) inEl.textContent = `${trimIn.toFixed(3)}s`;
  if (outEl) outEl.textContent = `${trimOut.toFixed(3)}s`;
  if (durEl) durEl.textContent = `${Math.max(0, trimOut - trimIn).toFixed(3)}s`;
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

function stopTrimTest() {
  try { if (trimTestSource) { trimTestSource.stop(); trimTestSource.disconnect(); } } catch {}
  try { if (trimTestGain) trimTestGain.disconnect(); } catch {}
  trimTestSource = null;
  trimTestGain = null;
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
}

async function saveTrimPoints() {
  if (!trimPreset || !trimPreset.id) { setStatus('Nothing to save'); return; }
  trimPreset.trimIn = trimIn;
  trimPreset.trimOut = trimOut;
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
      rec.trimIn = trimIn;
      rec.trimOut = trimOut;
      await idbTx(db, 'readwrite', (store) => store.put(rec));
    }
    try { db.close(); } catch {}
  } catch {}
  setStatus('Trim saved');
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
      trimBtn.textContent = '✂';
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
    const title = currentSourceLabel || 'Seamless Loop';
    ms.metadata = new MediaMetadata({ title, artist: 'Seamless', album: 'Loops' });
    if (!mediaSessionHandlersSet) {
      ms.setActionHandler('play', async () => {
        if (currentBuffer) await startLoopFromBuffer(currentBuffer, 0.5, 0.03);
      });
      ms.setActionHandler('pause', () => stopLoop(0));
      ms.setActionHandler('stop', () => stopLoop(0));
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
    const uploadMeta = (uploads || []).map(u => ({
      id: u.id, name: u.name, createdAt: u.createdAt,
      trimIn: u.trimIn != null ? u.trimIn : undefined,
      trimOut: u.trimOut != null ? u.trimOut : undefined,
    }));
    const data = {
      app: 'seamless',
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
    a.download = `seamless-backup-${Date.now()}.json`;
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
    if (!data || data.app !== 'seamless') { setStatus('Invalid backup file'); return; }
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
  try { localStorage.setItem('seamless-theme', theme); } catch {}
  // Update toggle buttons.
  document.querySelectorAll('.theme-opt').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
}

function loadSavedTheme() {
  try {
    const saved = localStorage.getItem('seamless-theme');
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
    ov.setAttribute('aria-label', 'Help');
    ov.innerHTML = `<div class="overlay-card">
      <h2>Help</h2>
      <div class="help-content">
        <h3>Player</h3>
        <p>Tap <b>Play</b> to start the loaded loop. Use the volume slider and rate jog to adjust playback. The <b>Repeat</b> button toggles whole-playlist looping.</p>
        <h3>Playlists</h3>
        <p>Create playlists and add loops to them. Tap a playlist to see its details — edit, reorder, or adjust per-loop volume.</p>
        <h3>Audio Loops</h3>
        <p>Browse built-in loops or import your own. Imported loops have a <b>✂ trim</b> button to adjust loop start/end points.</p>
        <h3>Trimmer</h3>
        <p>Drag the green <b>IN</b> and red <b>OUT</b> cursors to set loop boundaries. Zoom in for precision. Tap <b>Test Loop</b> to hear the result before saving.</p>
        <h3>Settings</h3>
        <p>Export/import your data as JSON. Switch between dark and light themes.</p>
      </div>
      <div class="overlay-actions"><button id="closeHelp" class="secondary">Close</button></div>
    </div>`;
    document.body.appendChild(ov);
    ov.querySelector('#closeHelp').addEventListener('click', () => {
      ov.classList.add('hidden');
      try { updateScrollState(); } catch {}
    });
  }
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
  const trimZoom = document.getElementById('trimZoom');
  const trimPlayTest = document.getElementById('trimPlayTest');
  const trimStopTest = document.getElementById('trimStopTest');
  const trimSaveBtn = document.getElementById('trimSave');
  const trimResetBtn = document.getElementById('trimReset');

  // Settings elements
  const exportJsonBtn = document.getElementById('exportJson');
  const importJsonBtn = document.getElementById('importJson');
  const importJsonInput = document.getElementById('importJsonInput');
  const themeToggle = document.getElementById('themeToggle');
  const settingsHelpBtn = document.getElementById('settingsHelp');

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
    if (currentBuffer) {
      await startLoopFromBuffer(currentBuffer, 0.5, 0.03);
      return;
    }
    try {
      const buf = await loadBufferFromUrl('audio/ambientalsynth.mp3');
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
      currentBuffer = buf;
      currentSourceLabel = f.name || 'File';
      await startLoopFromBuffer(buf, 0.5, 0.03);
      try {
        const saved = await savePersistedUpload({ name: f.name || 'File', blob: f });
        addUserPresetFromBlob({ name: f.name || 'File', blob: f, saved });
        try { renderLoopsPage(); } catch {}
      } catch {
        try {
          addUserPresetFromBlob({ name: f.name || 'File', blob: f, saved: null });
          try { renderLoopsPage(); } catch {}
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
        currentBuffer = buf2;
        currentSourceLabel = f.name || 'File';
        await startLoopFromBuffer(buf2, 0.5, 0.03);
        try {
          const saved = await savePersistedUpload({ name: f.name || 'File', blob: f });
          addUserPresetFromBlob({ name: f.name || 'File', blob: f, saved });
          try { renderLoopsPage(); } catch {}
        } catch {
          try {
            addUserPresetFromBlob({ name: f.name || 'File', blob: f, saved: null });
            try { renderLoopsPage(); } catch {}
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
              currentBuffer = buf;
              currentSourceLabel = `Clipboard ${type}`;
              await startLoopFromBuffer(buf, 0.5, 0.03);
              try {
                const saved = await savePersistedUpload({ name: `Clipboard ${type}`, blob });
                addUserPresetFromBlob({ name: `Clipboard ${type}`, blob, saved });
                try { renderLoopsPage(); } catch {}
              } catch {
                try {
                  addUserPresetFromBlob({ name: `Clipboard ${type}`, blob, saved: null });
                  try { renderLoopsPage(); } catch {}
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
      currentBuffer = buf;
      currentSourceLabel = f.name || 'Pasted File';
      await startLoopFromBuffer(buf, 0.5, 0.03);
      try {
        const saved = await savePersistedUpload({ name: f.name || 'Pasted File', blob: f });
        addUserPresetFromBlob({ name: f.name || 'Pasted File', blob: f, saved });
        try { renderLoopsPage(); } catch {}
      } catch {
        try {
          addUserPresetFromBlob({ name: f.name || 'Pasted File', blob: f, saved: null });
          try { renderLoopsPage(); } catch {}
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
        currentBuffer = buf;
        currentSourceLabel = f.name || 'Dropped File';
        await startLoopFromBuffer(buf, 0.5, 0.03);
        try {
          const saved = await savePersistedUpload({ name: f.name || 'Dropped File', blob: f });
          addUserPresetFromBlob({ name: f.name || 'Dropped File', blob: f, saved });
          try { renderLoopsPage(); } catch {}
        } catch {
          try {
            addUserPresetFromBlob({ name: f.name || 'Dropped File', blob: f, saved: null });
            try { renderLoopsPage(); } catch {}
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

  trimZoom && trimZoom.addEventListener('input', () => {
    const v = parseInt(trimZoom.value, 10) || 1;
    trimZoomLevel = Math.max(1, v);
    // Centre the view around the midpoint of the trim region when zooming.
    if (trimBuffer) {
      const midTrim = (trimIn + trimOut) / 2;
      const viewDur = trimBuffer.duration / trimZoomLevel;
      trimViewStart = Math.max(0, midTrim - viewDur / 2);
    }
    drawTrimWaveform();
  });

  trimPlayTest && trimPlayTest.addEventListener('click', () => playTrimTest());
  trimStopTest && trimStopTest.addEventListener('click', () => { stopTrimTest(); setStatus('Stopped'); });
  trimSaveBtn && trimSaveBtn.addEventListener('click', () => saveTrimPoints());
  trimResetBtn && trimResetBtn.addEventListener('click', () => resetTrimPoints());

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

  // Load saved theme on startup.
  loadSavedTheme();

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
  setStatus('Ready');
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
