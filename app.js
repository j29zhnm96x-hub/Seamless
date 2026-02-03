let audioCtx, master, mediaDest, audioOut;
let volumeVal = 0.5;
let loopSource = null;
let loopGain = null;
// session user-imported presets
const userPresets = [];
const builtinPresets = [
  { name: 'ambientalsynth.mp3', path: 'audio/ambientalsynth.mp3' },
  { name: 'white_noise_432hz.mp3', path: 'audio/white_noise_432hz.mp3' }
];
let currentBuffer = null;
let currentSourceLabel = null;
const bufferCache = new Map();
const defaultSettings = { threshold: 1e-3, marginMs: 2, windowMs: 10 };
let currentSettings = { ...defaultSettings };
let lastLoopPoints = null;
let mediaSessionHandlersSet = false;
let stopCleanupToken = 0;

let activeTab = 'player';

function setStatus(msg) {
  const el = document.getElementById('status');
  if (el) el.textContent = msg;
}

function setLoopInfo(info) {
  const el = document.getElementById('loopInfo');
  if (el) el.textContent = info || '';
}

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    master = audioCtx.createGain();
    master.gain.value = 0;
    mediaDest = audioCtx.createMediaStreamDestination();
    master.connect(mediaDest);
    audioOut = document.getElementById('audioOut');
    if (audioOut) audioOut.srcObject = mediaDest.stream;
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

async function startLoopFromBuffer(buffer, targetVolume = 0.5, rampIn = 0.03) {
  ensureAudio();
  if (audioCtx.state === 'suspended') { try { await audioCtx.resume(); } catch {} }
  startOutputIfNeeded();

  stopLoop(0);

  const { start, end } = computeLoopPoints(buffer);
  lastLoopPoints = { start, end };

  loopSource = audioCtx.createBufferSource();
  loopSource.buffer = buffer;
  loopSource.loop = true;
  loopSource.loopStart = start;
  loopSource.loopEnd = end;

  loopGain = audioCtx.createGain();
  loopGain.gain.setValueAtTime(0, audioCtx.currentTime);

  loopSource.connect(loopGain);
  loopGain.connect(master);

  master.gain.cancelScheduledValues(audioCtx.currentTime);
  master.gain.setValueAtTime(master.gain.value, audioCtx.currentTime);
  master.gain.linearRampToValueAtTime(volumeVal, audioCtx.currentTime + rampIn);

  loopGain.gain.linearRampToValueAtTime(targetVolume, audioCtx.currentTime + rampIn);

  loopSource.start(audioCtx.currentTime);

  setLoopInfo(`Loop: ${start.toFixed(3)}s → ${end.toFixed(3)}s | dur ${buffer.duration.toFixed(2)}s`);
  setStatus('Playing');
  drawWaveform();
  updateMediaSession('playing');
}

function switchTab(tab) {
  activeTab = tab;
  const pages = {
    player: document.getElementById('page-player'),
    loops: document.getElementById('page-loops'),
    settings: document.getElementById('page-settings')
  };
  Object.entries(pages).forEach(([k, el]) => {
    if (!el) return;
    el.classList.toggle('active', k === tab);
  });

  const tabs = document.querySelectorAll('.tabbar .tab');
  tabs.forEach(btn => {
    const isActive = btn.getAttribute('data-tab') === tab;
    btn.classList.toggle('active', isActive);
    if (isActive) btn.setAttribute('aria-current', 'page');
    else btn.removeAttribute('aria-current');
  });

  if (tab === 'loops') renderLoopsPage();
  if (tab === 'player') setTimeout(drawWaveform, 0);
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
        await startLoopFromBuffer(buf, 0.5, 0.03);
        switchTab('player');
      } catch {
        setStatus(`Failed to load ${p.name}`);
      }
    }));
  });

  userPresets.forEach(p => {
    ul.appendChild(mkBtn(p.name, async () => {
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
        await startLoopFromBuffer(buf, 0.5, 0.03);
        switchTab('player');
      } catch {
        setStatus(`Failed to load ${p.name}`);
      }
    }));
  });
}

function stopLoop(rampOut = 0.05) {
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
    try { if (gainToStop) { try { gainToStop.disconnect(); } catch {} } } catch {}
    try { sourceToStop.stop(now); } catch {}
    try { sourceToStop.disconnect(); } catch {}
    if (loopSource === sourceToStop) loopSource = null;
    if (loopGain === gainToStop) loopGain = null;
    try {
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + 0.005);
    } catch {}
    setStatus('Stopped');
    updateMediaSession('paused');
    return;
  }

  try {
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
      setStatus('Stopped');
    }, Math.ceil((rampOut + 0.01) * 1000));
  }
  updateMediaSession('paused');
}

function getSettingsFromUI() {
  const th = document.getElementById('s-threshold');
  const mg = document.getElementById('s-margin');
  const wn = document.getElementById('s-window');
  return {
    threshold: Number(th && th.value) || defaultSettings.threshold,
    marginMs: Number(mg && mg.value) || defaultSettings.marginMs,
    windowMs: Number(wn && wn.value) || defaultSettings.windowMs,
  };
}

function drawWaveform() {
  const cvs = document.getElementById('wave');
  if (!cvs || !currentBuffer) return;
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(10, Math.floor(cvs.clientWidth * dpr));
  const h = Math.max(50, Math.floor((cvs.clientHeight || cvs.height) * dpr));
  if (cvs.width !== w) cvs.width = w;
  if (cvs.height !== h) cvs.height = h;
  const ctx = cvs.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#fafafa';
  ctx.fillRect(0, 0, w, h);
  const ch = currentBuffer.numberOfChannels;
  const len = currentBuffer.length;
  const mid = h / 2;
  const step = Math.ceil(len / w);
  ctx.strokeStyle = '#4a90e2';
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
    ctx.strokeStyle = '#e24a6a';
    ctx.lineWidth = Math.max(1, dpr);
    ctx.beginPath();
    ctx.moveTo(xs + 0.5, 0);
    ctx.lineTo(xs + 0.5, h);
    ctx.moveTo(xe + 0.5, 0);
    ctx.lineTo(xe + 0.5, h);
    ctx.stroke();
  }
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
      ms.setActionHandler('pause', () => stopLoop(0.05));
      ms.setActionHandler('stop', () => stopLoop(0.05));
      mediaSessionHandlersSet = true;
    }
    ms.playbackState = state || (loopSource ? 'playing' : 'paused');
  } catch {}
}

function bindUI() {
  const playBtn = document.getElementById('play');
  const stopBtn = document.getElementById('stop');
  const volume = document.getElementById('volume');
  const fileInput = document.getElementById('fileInput');
  const pasteBtn = document.getElementById('pasteBtn');
  const urlInput = document.getElementById('urlInput');
  const loadUrl = document.getElementById('loadUrl');
  const loadPreset = document.getElementById('loadPreset');
  const dropZone = document.getElementById('dropZone');
  const recomputeBtn = document.getElementById('recompute');
  const toggleSettings = document.getElementById('toggleSettings');
  const settingsBody = document.getElementById('settingsBody');
  let dragCounter = 0;

  document.querySelectorAll('.tabbar .tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      if (tab) switchTab(tab);
    });
  });

  playBtn.addEventListener('click', async () => {
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
      await startLoopFromBuffer(buf, 0.5, 0.03);
    } catch (e) {
      setStatus('No buffer loaded. Choose a file.');
    }
  });

  stopBtn.addEventListener('click', () => stopLoop(0.05));

  volume.addEventListener('input', e => {
    volumeVal = Number(e.target.value) / 100;
    if (!audioCtx || !master) return;
    const now = audioCtx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(volumeVal, now, 0.02);
  });

  fileInput.addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setStatus(`Decoding ${f.name}...`);
    const ab = await f.arrayBuffer();
    try {
      const buf = await decodeArrayBuffer(ab);
      currentBuffer = buf;
      currentSourceLabel = f.name || 'File';
      await startLoopFromBuffer(buf, 0.5, 0.03);
      try { userPresets.unshift({ name: f.name || 'File', blob: f }); if (activeTab === 'loops') renderLoopsPage(); } catch {}
    } catch (err) {
      setStatus('Decode failed.');
    }
  });

  pasteBtn.addEventListener('click', async () => {
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
              try { userPresets.unshift({ name: `Clipboard ${type}`, blob }); if (activeTab === 'loops') renderLoopsPage(); } catch {}
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
    if (!f.type.startsWith('audio/')) return;
    setStatus(`Decoding pasted ${f.name || f.type}...`);
    const ab = await f.arrayBuffer();
    try {
      const buf = await decodeArrayBuffer(ab);
      currentBuffer = buf;
      currentSourceLabel = f.name || 'Pasted File';
      await startLoopFromBuffer(buf, 0.5, 0.03);
      try { userPresets.unshift({ name: f.name || 'Pasted File', blob: f }); if (activeTab === 'loops') renderLoopsPage(); } catch {}
    } catch (err) {
      setStatus('Decode failed.');
    }
  });

  loadUrl.addEventListener('click', async () => {
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

  loadPreset.addEventListener('click', () => switchTab('loops'));

  document.addEventListener('visibilitychange', () => {
    try { if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); } catch {}
    startOutputIfNeeded();
  });

  ;['dragenter','dragover','dragleave','drop'].forEach(ev => {
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
      if (!f.type.startsWith('audio/')) { setStatus('Not an audio file.'); return; }
      setStatus(`Decoding ${f.name}...`);
      const ab = await f.arrayBuffer();
      try {
        const buf = await decodeArrayBuffer(ab);
        currentBuffer = buf;
        currentSourceLabel = f.name || 'Dropped File';
        await startLoopFromBuffer(buf, 0.5, 0.03);
        try { userPresets.unshift({ name: f.name || 'Dropped File', blob: f }); if (activeTab === 'loops') renderLoopsPage(); } catch {}
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

  recomputeBtn.addEventListener('click', async () => {
    currentSettings = getSettingsFromUI();
    if (!currentBuffer) { setStatus('No buffer to analyze.'); return; }
    const pts = computeLoopPoints(currentBuffer, currentSettings);
    lastLoopPoints = pts;
    setLoopInfo(`Loop: ${pts.start.toFixed(3)}s → ${pts.end.toFixed(3)}s | dur ${currentBuffer.duration.toFixed(2)}s`);
    drawWaveform();
    if (loopSource) await startLoopFromBuffer(currentBuffer, 0.5, 0.03);
  });

  window.addEventListener('resize', () => drawWaveform());
  window.addEventListener('orientationchange', () => setTimeout(drawWaveform, 250));

  toggleSettings.addEventListener('click', () => {
    const hidden = settingsBody.classList.toggle('hidden');
    toggleSettings.textContent = hidden ? 'SHOW' : 'HIDE';
    toggleSettings.setAttribute('aria-expanded', hidden ? 'false' : 'true');
  });
}

window.addEventListener('load', () => {
  ensureAudio();
  bindUI();
  setStatus('Ready');
  drawWaveform();
  switchTab('player');
});
