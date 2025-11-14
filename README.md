# Seamless Loop Player

A minimal web-based loop player that produces gapless background loops with smooth fades and iOS-friendly background/lock playback.

## Features
- Web Audio API with sample-accurate `loopStart`/`loopEnd`.
- Micro fade-in/out on start/stop via GainNode ramps.
- iOS background/lock-friendly: routes audio through a hidden `<audio>` via `MediaStreamDestination`.
- Load audio from file picker, drag-and-drop, or clipboard (when supported).
- Simple volume control.
- Media Session metadata + lock screen play/pause (where supported).
- URL loading (input, paste, or drop a link).
- Settings to tune loop detection (threshold, margin ms, window ms).
- Waveform preview canvas with loop boundary markers.

## Quick Start
This is a static site. Serve the folder over HTTP and open in a browser.

### Option 1: VS Code Live Server (recommended)
- Install the "Live Server" extension.
- Right-click `index.html` → "Open with Live Server".

### Option 2: Node one-liners
```powershell
npx http-server . -p 5173
# or
npx serve -l 5173 .
```
Open http://localhost:5173 in your browser.

## Usage
- Click "Play" to start. If no file loaded, it tries `audio/your_loop.mp3`.
- Use the file picker, drag-and-drop, or "Paste From Clipboard" to import audio.
- Enter a URL and click "Load URL" or paste/drop a link.
- Volume slider adjusts the master output.
- Use the Settings panel to tweak loop detection and click "Recompute".

## iOS Notes
- Audio is routed to a hidden `<audio id="audioOut" playsinline>` to increase resilience when backgrounded/locked.
- A user gesture is required before audio can play. Use the Play button first.
- Background persistence still depends on iOS policies; this setup maximizes the chance it keeps playing.

## Add to Home Screen / Favicon
This project includes a simple `manifest.json` and placeholder `favicon.png` and `apple-touch-icon.png`.
- For best results on Safari / iOS Add to Home Screen, replace `apple-touch-icon.png` with a 180x180 PNG of your app icon.
- Replace `favicon.png` with a 48x48 (or multi-size) icon for browsers.
- After replacing the files, serve the site over HTTPS (some platforms require secure context) and use Safari's "Add to Home Screen" to pin the web app.

## Structure
- `index.html` — UI (Play/Stop/Volume), hidden audio element.
- `app.js` — AudioContext + Gain graph, buffer decode, loop point computation (tunable), play/stop, imports, Media Session, waveform.
- `audio/` — Place your audio files here (e.g., `your_loop.mp3`).

## Implementation Highlights
- Loop points are computed by threshold scanning head/tail, margining edges, and choosing low-amplitude samples within ~10ms windows near boundaries.
- Gains are always ramped to avoid clicks on start/stop.
- Clipboard import uses `navigator.clipboard.read()` when available and falls back to paste events.

## Known Limitations
- Some browsers may restrict clipboard file access; use paste or file picker.
- Background playback behavior varies by platform/version.

## License
Proprietary – for internal development/testing.
