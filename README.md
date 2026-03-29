# SeamlessPlayer

A minimal web-based loop player that produces gapless background loops with smooth fades and iOS-friendly background/lock playback.

## Features
- Web Audio API with sample-accurate `loopStart`/`loopEnd`.
- Micro fade-in/out on start/stop via GainNode ramps.
- iOS background/lock-friendly: routes audio through a hidden `<audio>` via `MediaStreamDestination`.
- Load audio from file picker, drag-and-drop, or clipboard (when supported).
- Imported audio is saved locally (IndexedDB) when supported.
- Project snapshots save the full working setup: player context, pads, drum machine, and transport state.
- Loop Trigger and Drum Machine grids preview unsaved assignment changes live while their assignment popups are open.
- Drum Machine includes a 16-step pattern sequencer with four pattern banks, copy/paste, tempo, swing, and per-step accent/chance/velocity editing that persists in drum sessions, projects, and full backups.
- Individual playlists, sessions, and projects can be exported as standalone share packages with only the audio they use.
- The Playlists page also provides section-level import buttons so shared playlist, session, or project packages can be imported directly into the matching section.
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
- Click "Play" to start. If no file loaded, it tries `audio/ambientalsynth.mp3`.
- Use the file picker, drag-and-drop, or "Paste From Clipboard" to import audio.
- Enter a URL and click "Load URL" or paste/drop a link.
- Volume slider adjusts the master output.
- Open the "Audio Loops" tab to browse built-in loops and session imports.
- Use the Settings tab to tweak loop detection and click "Recompute".
- Use the Playlists tab to save a Project when you want to reopen the current player, Loop Trigger, and Drum Machine setup together.
- Use the share action on saved playlists, sessions, or projects to export just that item and its required audio for another device or user.
- Use the import icon in each Playlists-page section header to import the matching shared package type without going through the full app restore flow.
- In playlist detail view, use Play From Here on any row to start playback from that point in the sequence.
- While editing a playlist, use Duplicate and Move Up/Move Down for touch-friendly sequence changes when drag reordering is not convenient.
- The playlist loop picker now includes search, and going back from the repetitions prompt keeps your current search context.
- Loop Trigger now shows a live status strip for the current pad state, including queued-next and final-cycle states, plus a quick finish or stop action.
- Pad and Drum Machine assignment popups now support Save + Prev as well as Save + Next for faster two-way setup across all 9 pads.
- Drum Machine now shows a live status strip for the latest hit and active voice count, with a quick stop-all action when layered voices are still playing.
- Drum pad assignment now shows a choke summary under Link / Choke so it is clearer which other pad will be stopped when the selected drum is triggered.
- Drum Machine pads now show choke badges on the grid itself, so you can see which pads stop another pad and which pads are targets of those choke links without opening the editor.
- While editing Link / Choke, the drum grid now previews the currently selected choke source and target before you save the assignment.
- While editing Loop Trigger or Drum Machine assignments, the live grids now preview unsaved draft sound, color, naming, and one-shot changes before you save.
- Drum Machine includes a 16-step sequencer with start/stop, clear, bank switching, bank copy/paste, tempo, swing, and step-shaping controls directly below the live status strip.
- In the Drum Machine sequencer, click a step to select it, click an empty step to arm it, and use the Step Editor to shape accent, chance, and velocity for the selected hit.
- The sequencer renders its active pattern bank into a loop buffer before playback so the result is more resilient on iOS when the app is backgrounded or the screen is locked.
- In Loop Trigger and Drum Machine assignment popups, use Save + Next to move through pads faster while keeping your current library search context.
- Use Copy and Paste inside Loop Trigger and Drum Machine assignment popups to duplicate assignment settings across pads without rebuilding them from scratch.
- When you open the Trimmer from a pad or drum assignment popup, saving the trim now returns you to that same assignment flow with the trimmed sound selected.

### Backup / Restore
- Settings → Export creates a `.zip` backup that includes playlists, imported audio files, saved projects, current pad assignments, and saved pad sessions.
- Settings → Import accepts `.zip` backups (full restore) and `.json` backups (metadata-only / backward compatible).
- Drum Machine sequencer banks, swing, and per-step accent/chance/velocity values are included in drum sessions, project snapshots, and full backup export/import.
- ZIP backups and standalone shared item packages preserve imported loop trim ranges and fade-in/fade-out metadata.
- If a ZIP or shared-package import has to clean up older unreferenced uploads to stay within the local browser storage cap, the app now reports that in the status message after import.

## iOS Notes
- Audio is routed to a hidden `<audio id="audioOut" playsinline>` to increase resilience when backgrounded/locked.
- A user gesture is required before audio can play. Use the Play button first.
- Drum Machine sequencer playback is pre-rendered into a loop buffer before it starts so iOS has less live timer work to keep alive in the background.
- Background persistence still depends on iOS policies; this setup maximizes the chance it keeps playing.

### iPhone Files import note
- If audio files show up greyed out in the iOS Files picker (especially when running from the Home Screen / standalone PWA), open the site in Safari and import from there.
- Some iOS versions are picky about file type metadata (UTI/MIME). The app attempts to accept common extensions and decode even if `file.type` is empty.

### Persistence note
- Imported files are stored locally in your browser using IndexedDB. Clearing website data will remove them.

## Add to Home Screen / Favicon
This project includes a simple `manifest.json`.
- The iOS Add to Home Screen icon is served via `<link rel="apple-touch-icon">` and currently points at `img/favicon.PNG`.
- The browser favicon is served via `<link rel="icon">` and currently points at `img/favicon.PNG`.
- After replacing the files, serve the site over HTTPS (some platforms require secure context) and use Safari's "Add to Home Screen" to pin the web app.

### Generate icons from a single source image (recommended)
If you have a single high-resolution PNG (e.g. 1024x1024) you can generate all needed icons automatically.

1. Install `sharp` (Node >=12 recommended):
```powershell
npm install sharp
```
2. Run the generator (replace `icon-source.png` with your image path):
```powershell
node scripts/generate-icons.js icon-source.png .
```
This will write `apple-touch-icon.png`, `favicon.png` and other size variants into the repository root. Overwrite the placeholder files and re-serve the site.

Note: iOS prefers `apple-touch-icon.png` at 180×180. Use HTTPS when testing Add to Home Screen.

## Structure
- `index.html` — UI (Play/Stop/Volume), hidden audio element.
- `app.js` — AudioContext + Gain graph, buffer decode, loop point computation (tunable), play/stop, imports, Media Session, waveform.
- `audio/` — Place your audio files here (e.g., `ambientalsynth.mp3`).

## Implementation Highlights
- Loop points are computed by threshold scanning head/tail, margining edges, and choosing low-amplitude samples within ~10ms windows near boundaries.
- Gains are always ramped to avoid clicks on start/stop.
- Clipboard import uses `navigator.clipboard.read()` when available and falls back to paste events.

## Known Limitations
- Some browsers may restrict clipboard file access; use paste or file picker.
- Background playback behavior varies by platform/version.

## License
Proprietary – for internal development/testing.
