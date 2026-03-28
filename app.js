let audioCtx, master, mediaDest, audioOut;
let volumeVal = 0.5;
let loopSource = null;
let loopGain = null;
let currentRate = 1.0;
const RATE_MIN = 0.5;
const RATE_MAX = 2.0;
let preservePitch = false;
let pitchShifterNode = null;
// User-imported presets (persisted when possible)
const userPresets = [];
let trimPadTargetIndex = -1;
let trimDrumTargetIndex = -1;

// Persist imported audio blobs across restarts via IndexedDB.
const UPLOAD_DB_NAME = 'seamlessplayer-uploads';
const UPLOAD_DB_VERSION = 1;
const UPLOAD_STORE = 'uploads';
const MAX_PERSISTED_UPLOADS = 25;

// Persist renamed loop titles without rewriting large Blob records.
// This avoids iOS/Safari instability when repeatedly re-putting Blob-heavy IndexedDB objects.
const UPLOAD_NAME_OVERRIDES_KEY = 'seamlessplayer-upload-name-overrides';

// Loop archive categories, descriptions, and category assignments.
const LOOP_CATEGORIES_KEY = 'seamlessplayer-loop-categories';
const LOOP_DESCRIPTIONS_KEY = 'seamlessplayer-loop-descriptions';
const LOOP_CAT_ASSIGNMENTS_KEY = 'seamlessplayer-loop-cat-assignments';
const LOOP_COLLAPSED_CATEGORIES_KEY = 'seamlessplayer-loop-collapsed-categories';
const LOOP_COLLAPSED_SUBFOLDERS_KEY = 'seamlessplayer-loop-collapsed-subfolders';
const PAD_PICKER_COLLAPSED_SUBFOLDERS_KEY = 'seamlessplayer-pad-picker-collapsed-subfolders';
const DRUM_PICKER_COLLAPSED_SUBFOLDERS_KEY = 'seamlessplayer-drum-picker-collapsed-subfolders';
const FAVORITES_KEY = 'seamlessplayer-favorites';
const DEFAULT_CATEGORIES = ['DRUM-KIT', 'Drums & Percussions', 'Edited', 'Frequencies', 'Imported', 'Nature', 'Noises', 'Rythmical loops', 'Soundscapes'];

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
    loops_hint: 'Browse by category or search your loops.',
    loops_import: 'Import Loop',
    loops_paste: 'Paste',
    loops_builtin: 'Built-in',
    loops_edited: 'EDITED',
    loops_imported: 'IMPORTED',
    loops_search_placeholder: 'Search loops…',
    loops_search_clear: 'Clear search',
    loops_no_results: 'No loops match your search.',
    loops_new_category: '+ New Category',
    loop_category_drum_kit: 'DRUM-KIT',
    loop_category_drums_percussions: 'Drums & Percussions',
    loop_category_edited: 'Edited',
    loop_category_frequencies: 'Frequencies',
    loop_category_imported: 'Imported',
    loop_category_nature: 'Nature',
    loop_category_noises: 'Noises',
    loop_category_rythmical_loops: 'Rythmical loops',
    loop_category_soundscapes: 'Soundscapes',
    loopinfo_back: 'Back',
    loopinfo_desc_label: 'Description',
    loopinfo_desc_placeholder: 'Add a description…',
    loopinfo_category: 'Category',
    loopinfo_filesize: 'File size',
    loopinfo_type: 'Type',
    trimmer_info_hint: 'Drag IN/OUT markers and use the lower waveform edges for fade-in and fade-out.',
    trimmer_zoom: 'Zoom',
    trimmer_test: 'Test Loop',
    trimmer_stop: 'Stop',
    trimmer_repeat_on: 'Repeat On',
    trimmer_repeat_off: 'Repeat Off',
    trimmer_save: 'Save',
    trimmer_reset: 'Reset',
    trimmer_set_in: 'Set IN',
    trimmer_set_out: 'Set OUT',
    trimmer_readout_in: 'IN',
    trimmer_readout_out: 'OUT',
    trimmer_readout_length: 'Length',
    trimmer_readout_fade_in: 'Fade In',
    trimmer_readout_fade_out: 'Fade Out',
    trimmer_rename: 'Rename',
    trimmer_rename_prompt: 'Rename loop',
    trimmer_rename_placeholder: 'Loop name',
    trim_save_title: 'Save Trim',
    trim_save_hint: 'Choose how you want to save this trim.',
    trim_save_name_hint: 'Name for the new saved loop',
    trim_save_overwrite_original: 'Overwrite the original',
    trim_save_overwrite_confirm: 'Overwrite the original loop with this trimmed audio? This cannot be undone.',
    trim_save_create_wav: 'Create new trimmed loop (WAV)',
    trim_save_create_compressed: 'Create new trimmed loop (smaller file)',
    settings_title: 'Settings',
    settings_data: 'Data',
    settings_export_main: 'Export Playlists & Loops',
    settings_export_hint: 'Download as backup (ZIP)',
    settings_import_main: 'Import Playlists & Loops',
    settings_import_hint: 'Restore from backup (ZIP/JSON)',
    settings_appearance: 'Appearance',
    settings_theme: 'Theme',
    settings_theme_dark: 'Dark',
    settings_theme_light: 'Light',
    settings_language: 'Language',
    settings_about: 'About',
    settings_help_main: 'Help',
    settings_help_hint: 'Controls, pads, playlists, backups',
    help_title: 'Help',
    help_intro_kicker: 'SeamlessPlayer Guide',
    help_intro_p: 'A complete guide to playback, loop management, live performance tools, backups, and mobile behavior.',
    help_meta_playback_label: 'Playback',
    help_meta_playback_value: 'Gapless loops, playlists, and live triggering',
    help_meta_storage_label: 'Storage',
    help_meta_storage_value: 'Local browser data with export and import backups',
    help_meta_mobile_label: 'Mobile',
    help_meta_mobile_value: 'Built to behave well on iPhone and iPad after user-initiated playback',
    help_index_title: 'Index',
    help_overview_h: 'Overview',
    help_overview_p: 'SeamlessPlayer is a browser-based audio app for gapless loop playback, loop curation, playlists, and pad-based performance.',
    help_overview_b1: 'The app runs locally in your browser. Imported audio, playlists, favorites, pad sessions, and most settings stay on this device until you export them.',
    help_overview_b2: 'Built-in libraries such as DRUM-KIT, Drums & Percussions, Frequencies, Nature, Noises, and Soundscapes are available immediately with no setup.',
    help_overview_b3: 'A typical workflow is: browse or import audio, trim it if needed, organize it into favorites or playlists, then assign it to Loop Trigger or Drum Machine pads for quick recall.',
    help_quickstart_h: 'Quick Start',
    help_quickstart_p: 'If you are opening the app for the first time, this is the fastest way to get useful results.',
    help_quickstart_b1: 'Open Audio Loops and choose a built-in file, or import your own sample from a file, clipboard, drag-and-drop, or supported URL paste.',
    help_quickstart_b2: 'Tap a loop to load it into the Player page, then adjust Volume, Rate, and Preserve pitch as needed.',
    help_quickstart_b3: 'Open Trim Loop for imported or edited audio when you need cleaner loop points, shorter regions, or a one-shot test.',
    help_quickstart_b4: 'Use the plus buttons to save favorites, or build a playlist from the Playlists tab.',
    help_quickstart_b5: 'Long-press a Loop Trigger or Drum Machine pad to assign sounds, then save the session if you want to reopen the exact setup later.',
    help_player_h: 'Player',
    help_player_p: 'The Player page is the main transport for current loop playback and playlist playback.',
    help_player_b1: 'Play starts the current loop or the active playlist entry. Stop fades playback out instead of cutting abruptly.',
    help_player_b2: 'Volume controls the master output. Rate changes playback speed, and Preserve pitch keeps pitch stable while tempo changes.',
    help_player_b3: 'Repeat applies to playlist playback. When enabled, the app loops the full playlist after the last entry finishes.',
    help_player_b4: 'The countdown row shows remaining time for the current playlist cycle, and the waveform area shows the active loop.',
    help_player_b5: 'On desktop, you can enable the visualizer and expand it to fullscreen.',
    help_loop_trigger_h: 'Loop Trigger',
    help_loop_trigger_p: 'Loop Trigger is the timed performance section for switching loops musically without losing sync.',
    help_loop_trigger_b1: 'There are 9 pads. Long-press a pad to assign a loop, display name, rate, per-pad volume, preserve-pitch setting, repeat mode, and color.',
    help_loop_trigger_b2: 'Single tap starts a pad immediately if nothing else is playing, or queues the switch at the next loop boundary if another loop-trigger pad is active.',
    help_loop_trigger_b3: 'Double tap lets the current pad finish its final cycle and stop, or turns a queued next pad into an ending one-shot depending on the current state.',
    help_loop_trigger_b4: 'Use Save to store the full 9-pad setup as a Loop Trigger session and recall it later from the Playlists page.',
    help_drum_machine_h: 'Drum Machine',
    help_drum_machine_p: 'Drum Machine is the separate one-shot performance layer for hits, drums, stabs, vocals, and sound effects.',
    help_drum_machine_b1: 'It provides 9 drum pads with up to 32 overlapping voices, so fast rolls and layered playback are possible.',
    help_drum_machine_b2: 'Each pad can store its own sound, display name, color, and volume, which is useful for balancing mixed kits.',
    help_drum_machine_b3: 'Link or Choke lets one used drum pad stop another immediately, which is ideal for open and closed hi-hat behavior or exclusive sample groups.',
    help_drum_machine_b4: 'Save stores the current drum layout as a Drum Machine session so you can switch kits quickly.',
    help_playlists_h: 'Playlists',
    help_playlists_p: 'Playlists are for structured playback sequences, ambient sets, practice routines, and layered arrangements.',
    help_playlists_b1: 'Create a playlist from the Playlists page, then add loops, rename the playlist, or delete it when it is no longer needed.',
    help_playlists_b2: 'Each row can store repetitions and per-loop volume, letting you shape intensity over time without editing the source audio.',
    help_playlists_b3: 'Open a playlist detail page to play it, favorite it, edit it, or inspect how many loops it contains.',
    help_playlists_b4: 'When a playlist is running, SeamlessPlayer advances automatically from one entry to the next and respects the Repeat toggle for full-sequence looping.',
    help_library_h: 'Audio Loops Library',
    help_library_p: 'The Audio Loops page is the central browser for built-in content and imported material.',
    help_library_b1: 'Browse by category, use search across all loops, and expand or collapse built-in subfolders such as DRUM-KIT sections.',
    help_library_b2: 'Imported loops can be renamed, moved to another category, described, favorited, trimmed, and reused anywhere in the app.',
    help_library_b3: 'Loop info shows description, category, file size, and file type, which makes large libraries easier to organize.',
    help_library_b4: 'Import supports local files, pasted audio where the browser allows it, drag-and-drop, and supported links, but remote URLs still depend on CORS permissions.',
    help_library_b5: 'Edited trims are stored separately so you can keep original recordings and shorter derived versions side by side.',
    help_trimmer_h: 'Trimmer',
    help_trimmer_p: 'The Trimmer lets you refine loop boundaries, create shorter playable regions, and save polished versions of imported audio.',
    help_trimmer_b1: 'Drag IN and OUT markers to set the playable range. Use the lower waveform edges to adjust fade-in and fade-out.',
    help_trimmer_b2: 'Set IN and Set OUT place markers at the current playhead for precise edits after zooming in.',
    help_trimmer_b3: 'Test Loop previews the current selection. The repeat toggle can be turned off when you want one-shot testing for drum hits or stabs.',
    help_trimmer_b4: 'Save can overwrite the original imported loop or create a new edited version, depending on the save option you choose.',
    help_trimmer_b5: 'When trimming from pad assignment flows, the result can be sent back into the pad workflow after saving.',
    help_favorites_h: 'Favorites',
    help_favorites_p: 'Favorites are the fastest recall layer for loops and playlists you use often.',
    help_favorites_b1: 'Use the plus button beside a current loop, playlist, playlist detail view, or loop info view to add or remove it from Favorites.',
    help_favorites_b2: 'The Favorites island on the Player page becomes a quick launcher for pinned loops and playlists.',
    help_settings_h: 'Settings and Backups',
    help_settings_p: 'Settings covers appearance, language, and backup or restore workflows.',
    help_settings_b1: 'Export creates a backup package containing local playlists, imported or edited loops, favorites, pad assignments, sessions, and related metadata.',
    help_settings_b2: 'Import restores backups from supported ZIP or legacy JSON packages into the current browser storage.',
    help_settings_b3: 'Theme lets you switch between dark and light mode. Language changes the full interface, including this help guide.',
    help_settings_b4: 'If you work across devices or browsers, export regularly because local browser storage does not sync automatically by itself.',
    help_mobile_h: 'Mobile and iOS Notes',
    help_mobile_p: 'The app is optimized for mobile browsers, but a few playback rules come from the operating system.',
    help_mobile_b1: 'On iPhone and iPad, the first playback action should come from a direct user tap so the browser unlocks audio output.',
    help_mobile_b2: 'Background or lock-screen playback can vary by browser and iOS version, but the app uses a hidden audio output path to maximize reliability.',
    help_mobile_b3: 'Clipboard import, drag-and-drop, and some link workflows depend on browser support, so desktop browsers usually offer the broadest import options.',
    help_storage_h: 'Storage and Data Safety',
    help_storage_p: 'Understanding what is stored locally helps avoid accidental data loss.',
    help_storage_b1: 'Imported audio and saved app data live in the current browser profile on the current device.',
    help_storage_b2: 'Clearing site storage, using private browsing, or switching browsers can remove access to imported loops unless you exported a backup first.',
    help_storage_b3: 'Built-in audio libraries ship with the app, so they do not need to be backed up the same way imported files do.',
    help_storage_b4: 'For important projects, keep periodic exports so playlists, pad setups, favorites, and edited audio can be restored quickly.',
    help_troubleshooting_h: 'Troubleshooting',
    help_troubleshooting_p: 'If something does not behave as expected, these checks usually solve it quickly.',
    help_troubleshooting_b1: 'No sound on mobile usually means the browser is still waiting for a user-initiated play action or the device volume is muted.',
    help_troubleshooting_b2: 'If a remote URL will not import, the source server may be blocking cross-origin requests.',
    help_troubleshooting_b3: 'If a trim still clicks or loops awkwardly, zoom in further, adjust fades, and test again with repeat on or off depending on the sound.',
    help_troubleshooting_b4: 'If saved data appears missing, confirm you are in the same browser profile and restore the latest export if necessary.',
    help_actions_note: 'Tip: change the app language in Settings and reopen Help to read the guide in the selected language.',
    help_close: 'Close',
    playlist_create_title: 'Create Playlist',
    playlist_name_label: 'Playlist name',
    playlist_name_placeholder: 'My playlist',
    playlist_create_btn: 'Create',
    common_close: 'Close',
    common_cancel: 'Cancel',
    playlist_add: 'Add',
    playlist_play: 'Play',
    preserve_pitch: 'Preserve pitch',
    pads_title: 'Loop Trigger',
    pads_save: 'Save',
    pads_sessions_title: 'Loop Trigger Sessions',
    pads_no_sessions: 'No saved sessions yet.',
    pads_assign_title: 'Assign Pad',
    pads_loop_label: 'Loop',
    pads_rate_label: 'Rate',
    pads_color_label: 'Color',
    pads_repeat_label: 'Repeat',
    common_volume: 'Volume',
    pads_assign_trim: 'Trim',
    pads_assign_trim_unavailable: 'Only imported or edited loops can be trimmed',
    pads_assign_save: 'Save',
    pads_assign_clear: 'Clear',
    pads_session_save_title: 'Save Pads Session',
    pads_session_name_label: 'Session name',
    pads_session_recall_title: 'Load Session',
    pads_session_recall_text: 'Replace current pad assignments with this session?',
    island_collapsed_note: 'Double-tap the title to expand.',
    drum_title: 'Drum Machine',
    drum_save: 'Save',
    drum_sessions_title: 'Drum Machine Sessions',
    drum_no_sessions: 'No saved drum machine sessions yet.',
    drum_session_save_title: 'Save Drum Machine Session',
    drum_session_recall_title: 'Load Session',
    drum_session_recall_text: 'Replace current drum machine assignments with this session?',
    drum_assign_title: 'Assign Drum Pad',
    drum_loop_label: 'Loop',
    drum_display_name_label: 'Display Name',
    drum_color_label: 'Color',
    drum_choke_label: 'Link / Choke',
    drum_choke_none: 'None',
    drum_assign_save: 'Save',
    drum_assign_clear: 'Clear'
  },
  hr: {
    status_ready: 'Spremno',
    status_stopped: 'Zaustavljeno',
    player_playlist_prefix: 'Playlista',
    tab_player: 'Reprodukcija',
    tab_playlists: 'Playliste',
    tab_loops: 'Loopovi',
    tab_settings: 'Postavke',
    playlists_title: 'Playliste',
    playlists_new: '+ Novo',
    loops_title: 'Audio loopovi',
    loops_hint: 'Pregledajte po kategoriji ili pretražite loopove.',
    loops_import: 'Uvezi loop',
    loops_paste: 'Zalijepi',
    loops_builtin: 'Ugrađeno',
    loops_edited: 'UREĐENO',
    loops_imported: 'UVEZENO',
    loops_search_placeholder: 'Pretraži loopove…',
    loops_search_clear: 'Očisti pretragu',
    loops_no_results: 'Nema loopova za ovaj upit.',
    loops_new_category: '+ Nova kategorija',
    loop_category_drum_kit: 'DRUM-KIT',
    loop_category_drums_percussions: 'Bubnjevi i perkusije',
    loop_category_edited: 'Uređeno',
    loop_category_frequencies: 'Frekvencije',
    loop_category_imported: 'Uvezeno',
    loop_category_nature: 'Priroda',
    loop_category_noises: 'Šumovi',
    loop_category_rythmical_loops: 'Ritmički loopovi',
    loop_category_soundscapes: 'Zvučni pejzaži',
    loopinfo_back: 'Natrag',
    loopinfo_desc_label: 'Opis',
    loopinfo_desc_placeholder: 'Dodaj opis…',
    loopinfo_category: 'Kategorija',
    loopinfo_filesize: 'Veličina',
    loopinfo_type: 'Vrsta',
    trimmer_info_hint: 'Povucite IN/OUT markere i koristite donje rubove vala za fade-in i fade-out.',
    trimmer_zoom: 'Zum',
    trimmer_test: 'Testiraj loop',
    trimmer_stop: 'Zaustavi',
    trimmer_repeat_on: 'Ponavljanje uključeno',
    trimmer_repeat_off: 'Ponavljanje isključeno',
    trimmer_save: 'Spremi',
    trimmer_reset: 'Vrati',
    trimmer_set_in: 'Postavi IN',
    trimmer_set_out: 'Postavi OUT',
    trimmer_readout_in: 'IN',
    trimmer_readout_out: 'OUT',
    trimmer_readout_length: 'Duljina',
    trimmer_readout_fade_in: 'Fade In',
    trimmer_readout_fade_out: 'Fade Out',
    trimmer_rename: 'Preimenuj',
    trimmer_rename_prompt: 'Preimenuj loop',
    trimmer_rename_placeholder: 'Naziv loopa',
    trim_save_title: 'Spremi trim',
    trim_save_hint: 'Odaberite kako želite spremiti ovaj trim.',
    trim_save_name_hint: 'Naziv za novi spremljeni loop',
    trim_save_overwrite_original: 'Prepiši izvornik',
    trim_save_overwrite_confirm: 'Prepisati izvorni loop ovim trimanim audiom? Ovu radnju nije moguće poništiti.',
    trim_save_create_wav: 'Stvori novi trimani loop (WAV)',
    trim_save_create_compressed: 'Stvori novi trimani loop (manja datoteka)',
    settings_title: 'Postavke',
    settings_data: 'Podaci',
    settings_export_main: 'Izvezi playliste i loopove',
    settings_export_hint: 'Preuzmi kao ZIP sigurnosnu kopiju',
    settings_import_main: 'Uvezi playliste i loopove',
    settings_import_hint: 'Vrati iz ZIP/JSON sigurnosne kopije',
    settings_appearance: 'Izgled',
    settings_theme: 'Tema',
    settings_theme_dark: 'Tamna',
    settings_theme_light: 'Svijetla',
    settings_language: 'Jezik',
    settings_about: 'O aplikaciji',
    settings_help_main: 'Pomoć',
    settings_help_hint: 'Kontrole, padovi, playliste, sigurnosne kopije',
    help_title: 'Pomoć',
    help_intro_kicker: 'Vodič za SeamlessPlayer',
    help_intro_p: 'Potpuni vodič za reprodukciju, upravljanje loopovima, live alate, sigurnosne kopije i ponašanje na mobitelu.',
    help_meta_playback_label: 'Reprodukcija',
    help_meta_playback_value: 'Gapless loopovi, playliste i live okidanje',
    help_meta_storage_label: 'Pohrana',
    help_meta_storage_value: 'Lokalni podaci preglednika uz export i import sigurnosne kopije',
    help_meta_mobile_label: 'Mobitel',
    help_meta_mobile_value: 'Prilagođeno za iPhone i iPad nakon prvog pokretanja dodirom',
    help_index_title: 'Sadržaj',
    help_overview_h: 'Pregled',
    help_overview_p: 'SeamlessPlayer je preglednička audio aplikacija za gapless reprodukciju loopova, organizaciju sadržaja, playliste i sviranje preko padova.',
    help_overview_b1: 'Aplikacija radi lokalno u pregledniku. Uvezeni audio, playliste, favoriti, pad sesije i većina postavki ostaju na ovom uređaju dok ih ne izvezete.',
    help_overview_b2: 'Ugrađene biblioteke poput DRUM-KIT, Bubnjevi i perkusije, Frekvencije, Priroda, Šumovi i Zvučni pejzaži dostupne su odmah bez dodatnog podešavanja.',
    help_overview_b3: 'Tipičan tijek rada je: pregledaj ili uvezi audio, po potrebi ga trimaj, organiziraj u favorite ili playliste, pa ga dodijeli Loop Trigger ili Drum Machine padovima za brzi pristup.',
    help_quickstart_h: 'Brzi početak',
    help_quickstart_p: 'Ako aplikaciju otvarate prvi put, ovo je najbrži put do korisnog rezultata.',
    help_quickstart_b1: 'Otvorite Audio loopove i odaberite ugrađenu datoteku ili uvezite vlastiti sample iz datoteke, međuspremnika, drag-and-drop postupkom ili podržanim URL lijepljenjem.',
    help_quickstart_b2: 'Dodirnite loop kako biste ga učitali na stranicu Reprodukcija, zatim po potrebi prilagodite Volume, Rate i Preserve pitch.',
    help_quickstart_b3: 'Otvorite Trim Loop za uvezeni ili uređeni audio kada trebate čistije granice, kraći raspon ili one-shot test.',
    help_quickstart_b4: 'Koristite plus gumbe za spremanje favorita ili složite playlistu na kartici Playliste.',
    help_quickstart_b5: 'Dugo pritisnite Loop Trigger ili Drum Machine pad za dodjelu zvuka, a zatim spremite sesiju ako želite kasnije vratiti isti raspored.',
    help_player_h: 'Reprodukcija',
    help_player_p: 'Stranica Reprodukcija glavni je transport za trenutačni loop i reprodukciju playliste.',
    help_player_b1: 'Play pokreće trenutačni loop ili aktivnu stavku playliste. Stop postupno gasi zvuk umjesto naglog prekida.',
    help_player_b2: 'Volume upravlja glavnim izlazom. Rate mijenja brzinu reprodukcije, a Preserve pitch zadržava visinu tona dok se tempo mijenja.',
    help_player_b3: 'Repeat se odnosi na playlistu. Kada je uključen, aplikacija ponovno pokreće cijelu playlistu nakon zadnje stavke.',
    help_player_b4: 'Red s odbrojavanjem pokazuje preostalo vrijeme trenutačnog ciklusa playliste, a područje valnog oblika prikazuje aktivni loop.',
    help_player_b5: 'Na desktopu možete uključiti vizualizator i otvoriti ga preko cijelog zaslona.',
    help_loop_trigger_h: 'Loop Trigger',
    help_loop_trigger_p: 'Loop Trigger je izvedbeni dio za glazbeno prebacivanje loopova bez gubitka sinkronizacije.',
    help_loop_trigger_b1: 'Na raspolaganju je 9 padova. Dugi pritisak otvara dodjelu loopa, prikaznog naziva, brzine, glasnoće po padu, Preserve pitch postavke, načina ponavljanja i boje.',
    help_loop_trigger_b2: 'Jedan dodir pokreće pad odmah ako ništa drugo ne svira ili zakazuje prijelaz na sljedećoj granici loopa ako je drugi Loop Trigger pad već aktivan.',
    help_loop_trigger_b3: 'Dvostruki dodir dopušta da trenutačni pad odsvira zadnji ciklus i zaustavi se ili pretvara sljedeći zakazani pad u završni one-shot, ovisno o stanju.',
    help_loop_trigger_b4: 'Save sprema cijeli raspored od 9 padova kao Loop Trigger sesiju koju kasnije možete vratiti sa stranice Playliste.',
    help_drum_machine_h: 'Drum Machine',
    help_drum_machine_p: 'Drum Machine je odvojeni izvedbeni sloj za one-shot udarce, bubnjeve, stabove, vokale i efekte.',
    help_drum_machine_b1: 'Ima 9 drum padova s do 32 istodobna glasa pa su mogući brzi rollovi i slojevita reprodukcija.',
    help_drum_machine_b2: 'Svaki pad može imati vlastiti zvuk, prikazni naziv, boju i glasnoću, što je korisno za balansiranje kompleta.',
    help_drum_machine_b3: 'Link ili Choke omogućuje da jedan korišteni drum pad odmah prekine drugi, što je idealno za open i closed hi-hat ponašanje ili ekskluzivne sample grupe.',
    help_drum_machine_b4: 'Save sprema trenutačni drum raspored kao Drum Machine sesiju kako biste brzo mijenjali kitove.',
    help_playlists_h: 'Playliste',
    help_playlists_p: 'Playliste služe za strukturirane sekvence, ambijentalne setove, rutine za vježbu i složene aranžmane.',
    help_playlists_b1: 'Stvorite playlistu na stranici Playliste, zatim dodajte loopove, preimenujte playlistu ili je izbrišite kada više nije potrebna.',
    help_playlists_b2: 'Svaki red može spremiti broj ponavljanja i glasnoću po loopu, što omogućuje oblikovanje dinamike bez uređivanja izvornog zvuka.',
    help_playlists_b3: 'Otvorite detalje playliste da biste je pokrenuli, označili kao favorit, uredili ili provjerili koliko sadrži loopova.',
    help_playlists_b4: 'Dok playlista svira, SeamlessPlayer automatski prelazi sa stavke na stavku i poštuje Repeat za ponovno pokretanje cijelog niza.',
    help_library_h: 'Biblioteka audio loopova',
    help_library_p: 'Stranica Audio loopovi glavni je preglednik ugrađenog sadržaja i uvezenog materijala.',
    help_library_b1: 'Pregledavajte po kategorijama, koristite pretragu kroz sve loopove i otvarajte ili zatvarajte ugrađene podmape poput DRUM-KIT sekcija.',
    help_library_b2: 'Uvezeni loopovi mogu se preimenovati, premjestiti u drugu kategoriju, opisati, dodati u favorite, trimati i ponovno koristiti bilo gdje u aplikaciji.',
    help_library_b3: 'Informacije o loopu prikazuju opis, kategoriju, veličinu i vrstu datoteke, što olakšava organizaciju većih biblioteka.',
    help_library_b4: 'Uvoz podržava lokalne datoteke, lijepljeni audio kada ga preglednik dopušta, drag-and-drop i podržane poveznice, ali udaljeni URL-ovi i dalje ovise o CORS pravilima.',
    help_library_b5: 'Uređeni trimovi spremaju se odvojeno pa možete zadržati izvornike i kraće izvedene verzije jednu uz drugu.',
    help_trimmer_h: 'Trimer',
    help_trimmer_p: 'Trimer služi za preciziranje granica loopa, izradu kraćih odsječaka i spremanje dotjeranih verzija uvezenog audija.',
    help_trimmer_b1: 'Povucite IN i OUT markere za određivanje raspona reprodukcije. Donje rubove vala koristite za fade-in i fade-out.',
    help_trimmer_b2: 'Set IN i Set OUT postavljaju markere na trenutačni playhead za precizne izmjene nakon zumiranja.',
    help_trimmer_b3: 'Test Loop reproducira trenutačni odabir. Ponavljanje se može isključiti kada želite one-shot test za udarce, stabove ili kratke sampleove.',
    help_trimmer_b4: 'Save može prepisati izvorni uvezeni loop ili stvoriti novu uređenu verziju, ovisno o odabranoj opciji spremanja.',
    help_trimmer_b5: 'Kada trim pokrenete iz dodjele padova, spremljeni rezultat možete vratiti natrag u taj isti workflow.',
    help_favorites_h: 'Favoriti',
    help_favorites_p: 'Favoriti su najbrži sloj za ponovno otvaranje loopova i playlista koje često koristite.',
    help_favorites_b1: 'Koristite plus pokraj trenutačnog loopa, playliste, detalja playliste ili prikaza informacija o loopu kako biste stavku dodali ili uklonili iz favorita.',
    help_favorites_b2: 'Favorites otok na stranici Reprodukcija postaje brzi pokretač spremljenih loopova i playlista.',
    help_settings_h: 'Postavke i sigurnosne kopije',
    help_settings_p: 'Postavke pokrivaju izgled, jezik i tijek rada za sigurnosne kopije i vraćanje podataka.',
    help_settings_b1: 'Export stvara paket sigurnosne kopije koji sadrži lokalne playliste, uvezene ili uređene loopove, favorite, dodjele padova, sesije i povezane metapodatke.',
    help_settings_b2: 'Import vraća sigurnosne kopije iz podržanih ZIP ili starijih JSON paketa u trenutačnu pohranu preglednika.',
    help_settings_b3: 'Tema omogućuje prebacivanje između tamnog i svijetlog izgleda. Jezik mijenja cijelo sučelje, uključujući i ovaj vodič.',
    help_settings_b4: 'Ako radite na više uređaja ili u više preglednika, redovito izvozite podatke jer se lokalna pohrana ne sinkronizira sama od sebe.',
    help_mobile_h: 'Napomene za mobitel i iOS',
    help_mobile_p: 'Aplikacija je optimizirana za mobilne preglednike, ali neka pravila reprodukcije određuje sam operativni sustav.',
    help_mobile_b1: 'Na iPhoneu i iPadu prvo pokretanje zvuka treba doći iz izravnog dodira korisnika kako bi preglednik otključao audio izlaz.',
    help_mobile_b2: 'Reprodukcija u pozadini ili na zaključanom zaslonu može varirati ovisno o pregledniku i verziji iOS-a, ali aplikacija koristi skriveni audio izlaz kako bi povećala pouzdanost.',
    help_mobile_b3: 'Uvoz iz međuspremnika, drag-and-drop i neke poveznice ovise o podršci preglednika pa desktop obično nudi najšire mogućnosti uvoza.',
    help_storage_h: 'Pohrana i sigurnost podataka',
    help_storage_p: 'Ako razumijete što se sprema lokalno, lakše ćete izbjeći slučajni gubitak podataka.',
    help_storage_b1: 'Uvezeni audio i spremljeni podaci aplikacije žive u trenutačnom profilu preglednika na ovom uređaju.',
    help_storage_b2: 'Brisanje podataka stranice, privatno pregledavanje ili prelazak u drugi preglednik može ukloniti pristup uvezenim loopovima ako prethodno niste izvezli sigurnosnu kopiju.',
    help_storage_b3: 'Ugrađene biblioteke audija dolaze s aplikacijom pa ih nije potrebno sigurnosno kopirati na isti način kao uvezene datoteke.',
    help_storage_b4: 'Za važne projekte čuvajte povremene izvoze kako bi se playliste, pad postavke, favoriti i uređeni audio mogli brzo vratiti.',
    help_troubleshooting_h: 'Rješavanje problema',
    help_troubleshooting_p: 'Ako se nešto ne ponaša kako očekujete, ove provjere obično brzo riješe problem.',
    help_troubleshooting_b1: 'Ako nema zvuka na mobitelu, preglednik vjerojatno još čeka prvo pokretanje dodirom ili je glasnoća uređaja utišana.',
    help_troubleshooting_b2: 'Ako se udaljeni URL ne može uvesti, izvorni server možda blokira cross-origin zahtjeve.',
    help_troubleshooting_b3: 'Ako trim i dalje klikće ili neugodno loopa, dodatno zumirajte, prilagodite fadeove i ponovno testirajte s uključenim ili isključenim ponavljanjem, ovisno o zvuku.',
    help_troubleshooting_b4: 'Ako vam se čini da nedostaju spremljeni podaci, provjerite jeste li u istom profilu preglednika i po potrebi vratite zadnji export.',
    help_actions_note: 'Savjet: promijenite jezik aplikacije u Postavkama i ponovno otvorite Pomoć kako biste vodič čitali na odabranom jeziku.',
    help_close: 'Zatvori',
    playlist_create_title: 'Nova playlista',
    playlist_name_label: 'Naziv playliste',
    playlist_name_placeholder: 'Moja playlista',
    playlist_create_btn: 'Stvori',
    common_close: 'Zatvori',
    common_cancel: 'Odustani',
    playlist_add: 'Dodaj',
    playlist_play: 'Pokreni',
    preserve_pitch: 'Očuvaj visinu tona',
    pads_title: 'Loop Trigger',
    pads_save: 'Spremi',
    pads_sessions_title: 'Loop Trigger sesije',
    pads_no_sessions: 'Nema spremljenih sesija.',
    pads_assign_title: 'Dodijeli pad',
    pads_loop_label: 'Loop',
    pads_rate_label: 'Brzina',
    pads_color_label: 'Boja',
    pads_repeat_label: 'Ponovi',
    common_volume: 'Glasnoća',
    pads_assign_trim: 'Trim',
    pads_assign_trim_unavailable: 'Samo uvezeni ili uređeni loopovi mogu se trimati',
    pads_assign_save: 'Spremi',
    pads_assign_clear: 'Obriši',
    pads_session_save_title: 'Spremi pad sesiju',
    pads_session_name_label: 'Naziv sesije',
    pads_session_recall_title: 'Učitaj sesiju',
    pads_session_recall_text: 'Zamijeniti trenutne pad postavke ovom sesijom?',
    island_collapsed_note: 'Dvostruko dodirnite naslov za otvaranje.',
    drum_title: 'Drum Machine',
    drum_save: 'Spremi',
    drum_sessions_title: 'Drum Machine sesije',
    drum_no_sessions: 'Nema spremljenih Drum Machine sesija.',
    drum_session_save_title: 'Spremi Drum Machine sesiju',
    drum_session_recall_title: 'Učitaj sesiju',
    drum_session_recall_text: 'Zamijeniti trenutne Drum Machine postavke ovom sesijom?',
    drum_assign_title: 'Dodijeli drum pad',
    drum_loop_label: 'Loop',
    drum_display_name_label: 'Prikazni naziv',
    drum_color_label: 'Boja',
    drum_choke_label: 'Link / Choke',
    drum_choke_none: 'Ništa',
    drum_assign_save: 'Spremi',
    drum_assign_clear: 'Obriši'
  }
};

function t(key) {
  const langTable = I18N[currentLang] || I18N.en;
  return (langTable && langTable[key]) || (I18N.en && I18N.en[key]) || key;
}

function getHelpSections() {
  return [
    {
      id: 'overview',
      title: t('help_overview_h'),
      intro: t('help_overview_p'),
      bullets: [t('help_overview_b1'), t('help_overview_b2'), t('help_overview_b3')]
    },
    {
      id: 'quickstart',
      title: t('help_quickstart_h'),
      intro: t('help_quickstart_p'),
      bullets: [
        t('help_quickstart_b1'),
        t('help_quickstart_b2'),
        t('help_quickstart_b3'),
        t('help_quickstart_b4'),
        t('help_quickstart_b5')
      ]
    },
    {
      id: 'player',
      title: t('help_player_h'),
      intro: t('help_player_p'),
      bullets: [t('help_player_b1'), t('help_player_b2'), t('help_player_b3'), t('help_player_b4'), t('help_player_b5')]
    },
    {
      id: 'loop-trigger',
      title: t('help_loop_trigger_h'),
      intro: t('help_loop_trigger_p'),
      bullets: [
        t('help_loop_trigger_b1'),
        t('help_loop_trigger_b2'),
        t('help_loop_trigger_b3'),
        t('help_loop_trigger_b4')
      ]
    },
    {
      id: 'drum-machine',
      title: t('help_drum_machine_h'),
      intro: t('help_drum_machine_p'),
      bullets: [
        t('help_drum_machine_b1'),
        t('help_drum_machine_b2'),
        t('help_drum_machine_b3'),
        t('help_drum_machine_b4')
      ]
    },
    {
      id: 'playlists',
      title: t('help_playlists_h'),
      intro: t('help_playlists_p'),
      bullets: [
        t('help_playlists_b1'),
        t('help_playlists_b2'),
        t('help_playlists_b3'),
        t('help_playlists_b4')
      ]
    },
    {
      id: 'library',
      title: t('help_library_h'),
      intro: t('help_library_p'),
      bullets: [
        t('help_library_b1'),
        t('help_library_b2'),
        t('help_library_b3'),
        t('help_library_b4'),
        t('help_library_b5')
      ]
    },
    {
      id: 'trimmer',
      title: t('help_trimmer_h'),
      intro: t('help_trimmer_p'),
      bullets: [
        t('help_trimmer_b1'),
        t('help_trimmer_b2'),
        t('help_trimmer_b3'),
        t('help_trimmer_b4'),
        t('help_trimmer_b5')
      ]
    },
    {
      id: 'favorites',
      title: t('help_favorites_h'),
      intro: t('help_favorites_p'),
      bullets: [t('help_favorites_b1'), t('help_favorites_b2')]
    },
    {
      id: 'settings',
      title: t('help_settings_h'),
      intro: t('help_settings_p'),
      bullets: [
        t('help_settings_b1'),
        t('help_settings_b2'),
        t('help_settings_b3'),
        t('help_settings_b4')
      ]
    },
    {
      id: 'mobile',
      title: t('help_mobile_h'),
      intro: t('help_mobile_p'),
      bullets: [t('help_mobile_b1'), t('help_mobile_b2'), t('help_mobile_b3')]
    },
    {
      id: 'storage',
      title: t('help_storage_h'),
      intro: t('help_storage_p'),
      bullets: [t('help_storage_b1'), t('help_storage_b2'), t('help_storage_b3'), t('help_storage_b4')]
    },
    {
      id: 'troubleshooting',
      title: t('help_troubleshooting_h'),
      intro: t('help_troubleshooting_p'),
      bullets: [
        t('help_troubleshooting_b1'),
        t('help_troubleshooting_b2'),
        t('help_troubleshooting_b3'),
        t('help_troubleshooting_b4')
      ]
    }
  ];
}

function renderHelpSection(section, index) {
  const bulletsHtml = section.bullets && section.bullets.length
    ? `<ul class="help-section-list">${section.bullets.map((item) => `<li>${item}</li>`).join('')}</ul>`
    : '';
  return `<section id="help-section-${section.id}" class="help-section">
    <div class="help-section-head">
      <span class="help-section-number">${String(index + 1).padStart(2, '0')}</span>
      <div>
        <h3>${section.title}</h3>
      </div>
    </div>
    <p class="help-section-intro">${section.intro}</p>
    ${bulletsHtml}
  </section>`;
}

function getTranslatedLoopCategoryName(category) {
  switch (String(category || '')) {
    case 'DRUM-KIT': return t('loop_category_drum_kit');
    case 'Drums & Percussions': return t('loop_category_drums_percussions');
    case 'Edited': return t('loop_category_edited');
    case 'Frequencies': return t('loop_category_frequencies');
    case 'Imported': return t('loop_category_imported');
    case 'Nature': return t('loop_category_nature');
    case 'Noises': return t('loop_category_noises');
    case 'Rythmical loops': return t('loop_category_rythmical_loops');
    case 'Soundscapes': return t('loop_category_soundscapes');
    default: return String(category || '');
  }
}

function applyTrimSaveOverlayTranslations(overlay = document.getElementById('trimSaveOverlay')) {
  if (!overlay) return;
  overlay.setAttribute('aria-label', t('trim_save_title'));
  const title = overlay.querySelector('#trimSaveOverlayTitle');
  if (title) title.textContent = t('trim_save_title');
  const hint = overlay.querySelector('#trimSaveOverlayHint');
  if (hint) hint.textContent = t('trim_save_hint');
  const nameHint = overlay.querySelector('#trimSaveOverlayNameHint');
  if (nameHint) nameHint.textContent = t('trim_save_name_hint');
  const nameInput = overlay.querySelector('#trimSaveName');
  if (nameInput) nameInput.placeholder = t('trimmer_rename_placeholder');
  const picker = overlay.querySelector('.picker-list');
  if (picker) picker.setAttribute('aria-label', t('trim_save_title'));
  const savePoints = overlay.querySelector('#trimSavePoints');
  if (savePoints) savePoints.textContent = t('trim_save_overwrite_original');
  const saveWav = overlay.querySelector('#trimSaveWav');
  if (saveWav) saveWav.textContent = t('trim_save_create_wav');
  const saveCompressed = overlay.querySelector('#trimSaveCompressed');
  if (saveCompressed) saveCompressed.textContent = t('trim_save_create_compressed');
  const cancel = overlay.querySelector('#trimSaveCancel');
  if (cancel) cancel.textContent = t('common_cancel');
}

function updateLoopsSearchClearButton() {
  const loopsSearchInput = document.getElementById('loopsSearch');
  const clearBtn = document.getElementById('loopsSearchClear');
  if (!clearBtn) return;
  clearBtn.setAttribute('aria-label', t('loops_search_clear'));
  clearBtn.title = t('loops_search_clear');
  const hasValue = !!(loopsSearchInput && String(loopsSearchInput.value || '').length);
  clearBtn.classList.toggle('hidden', !hasValue);
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
  setText('.pads-sessions-header h2', t('pads_sessions_title'));

  // Pads island
  const padsHead = document.getElementById('loopTriggerTitle');
  if (padsHead) padsHead.textContent = t('pads_title');
  const padsSaveBtn = document.getElementById('padsSaveSession');
  if (padsSaveBtn) padsSaveBtn.textContent = t('pads_save');
  const loopTriggerCard = document.getElementById('loopTriggerCard');
  if (loopTriggerCard) loopTriggerCard.setAttribute('aria-label', t('pads_title'));
  const loopTriggerNote = document.getElementById('loopTriggerCollapsedNote');
  if (loopTriggerNote) loopTriggerNote.textContent = t('island_collapsed_note');
  const padRepeatLabel = document.getElementById('padRepeatLabel');
  if (padRepeatLabel) padRepeatLabel.textContent = t('pads_repeat_label');
  const padVolumeLabel = document.getElementById('padVolumeLabel');
  if (padVolumeLabel) padVolumeLabel.textContent = t('common_volume');
  const padAssignTrimBtn = document.getElementById('padAssignTrim');
  if (padAssignTrimBtn) padAssignTrimBtn.textContent = t('pads_assign_trim');
  const padRepeatBtn = document.getElementById('padRepeatBtn');
  if (padRepeatBtn) {
    padRepeatBtn.setAttribute('aria-label', t('pads_repeat_label'));
    padRepeatBtn.title = t('pads_repeat_label');
  }
  updatePadAssignTrimButton();

  const drumTitle = document.getElementById('drumMachineTitle');
  if (drumTitle) drumTitle.textContent = t('drum_title');
  const drumCard = document.getElementById('drumMachineCard');
  if (drumCard) drumCard.setAttribute('aria-label', t('drum_title'));
  const drumSaveBtn = document.getElementById('drumSaveSession');
  if (drumSaveBtn) drumSaveBtn.textContent = t('drum_save');
  const drumNote = document.getElementById('drumMachineCollapsedNote');
  if (drumNote) drumNote.textContent = t('island_collapsed_note');
  setText('#drumSessionsTitle', t('drum_sessions_title'));
  const drumAssignTitle = document.getElementById('drumAssignTitle');
  if (drumAssignTitle) drumAssignTitle.textContent = t('drum_assign_title');
  const drumOverlay = document.getElementById('drumAssignOverlay');
  if (drumOverlay) drumOverlay.setAttribute('aria-label', t('drum_assign_title'));
  const drumLabels = drumOverlay ? drumOverlay.querySelectorAll('.pad-assign-label') : [];
  if (drumLabels[0]) drumLabels[0].textContent = t('drum_loop_label');
  if (drumLabels[1]) drumLabels[1].textContent = t('drum_display_name_label');
  if (drumLabels[2]) drumLabels[2].textContent = t('common_volume');
  if (drumLabels[3]) drumLabels[3].textContent = t('drum_color_label');
  if (drumLabels[4]) drumLabels[4].textContent = t('drum_choke_label');
  const drumAssignSave = document.getElementById('drumAssignSave');
  if (drumAssignSave) drumAssignSave.textContent = t('drum_assign_save');
  const drumAssignClear = document.getElementById('drumAssignClear');
  if (drumAssignClear) drumAssignClear.textContent = t('drum_assign_clear');
  const drumAssignClose = document.getElementById('drumAssignClose');
  if (drumAssignClose) drumAssignClose.textContent = t('common_cancel');
  setText('#drumSessionSaveTitle', t('drum_session_save_title'));
  setText('#drumSessionNameLabel', t('pads_session_name_label'));
  setText('#drumSessionRecallTitle', t('drum_session_recall_title'));
  setText('#drumSessionRecallText', t('drum_session_recall_text'));
  const drumDisplayNameInput = document.getElementById('drumDisplayNameInput');
  if (drumDisplayNameInput) drumDisplayNameInput.placeholder = 'Custom name (optional)';
  try { renderDrumChokeOptions(); } catch {}

  // Loops page
  setText('#page-loops .card h2', t('loops_title'));
  setText('#page-loops .card .hint', t('loops_hint'));
  const importLoopBtn = document.getElementById('importLoop');
  if (importLoopBtn) { importLoopBtn.textContent = t('loops_import'); importLoopBtn.setAttribute('aria-label', t('loops_import')); }
  const pasteLoopBtn = document.getElementById('pasteBtn');
  if (pasteLoopBtn) { pasteLoopBtn.textContent = t('loops_paste'); pasteLoopBtn.setAttribute('aria-label', t('loops_paste')); }
  const loopsSearchInput = document.getElementById('loopsSearch');
  if (loopsSearchInput) loopsSearchInput.placeholder = t('loops_search_placeholder');
  updateLoopsSearchClearButton();

  // Loop info page
  const loopInfoBackBtn = document.getElementById('loopInfoBack');
  if (loopInfoBackBtn) {
    const lbl = loopInfoBackBtn.querySelector('svg');
    const textNode = loopInfoBackBtn.lastChild;
    if (textNode && textNode.nodeType === 3) textNode.textContent = ' ' + t('loopinfo_back');
  }
  const loopInfoDescLabel = document.querySelector('#page-loopinfo .loop-info-desc-row .loop-info-label');
  if (loopInfoDescLabel) loopInfoDescLabel.textContent = t('loopinfo_desc_label');
  const loopInfoDescInput = document.getElementById('loopInfoDescInput');
  if (loopInfoDescInput) loopInfoDescInput.placeholder = t('loopinfo_desc_placeholder');
  const loopInfoCatLabel = document.querySelectorAll('#page-loopinfo .loop-info-row .loop-info-label');
  if (loopInfoCatLabel && loopInfoCatLabel.length >= 4) {
    loopInfoCatLabel[1].textContent = t('loopinfo_category');
    loopInfoCatLabel[2].textContent = t('loopinfo_filesize');
    loopInfoCatLabel[3].textContent = t('loopinfo_type');
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
  updateTrimRepeatToggleButton();
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
  const trimReadoutLabels = document.querySelectorAll('#page-trimmer .trim-readout-label');
  if (trimReadoutLabels && trimReadoutLabels.length >= 5) {
    trimReadoutLabels[0].textContent = t('trimmer_readout_in');
    trimReadoutLabels[1].textContent = t('trimmer_readout_out');
    trimReadoutLabels[2].textContent = t('trimmer_readout_length');
    trimReadoutLabels[3].textContent = t('trimmer_readout_fade_in');
    trimReadoutLabels[4].textContent = t('trimmer_readout_fade_out');
  }

  const btnRename = document.getElementById('trimRename');
  if (btnRename) { btnRename.textContent = t('trimmer_rename'); btnRename.setAttribute('aria-label', t('trimmer_rename')); }
  applyTrimSaveOverlayTranslations();

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

  // Preserve-pitch label
  const ppLbl = document.querySelector('.preserve-pitch-label');
  if (ppLbl) ppLbl.textContent = t('preserve_pitch');

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

/* ================================================================
   Loop Archive — categories, descriptions, utility helpers
   ================================================================ */

function stripFileExt(name) {
  if (!name) return '';
  return name.replace(/\.[^.]+$/, '');
}

function getBuiltinPresetSubfolder(preset) {
  const subfolder = String((preset && preset.subfolder) || '').trim();
  return subfolder;
}

function getBuiltinPresetDisplayName(preset, { includeSubfolder = false } = {}) {
  const baseName = stripFileExt((preset && preset.name) || (preset && preset.path) || 'Audio');
  const subfolder = getBuiltinPresetSubfolder(preset);
  if (includeSubfolder && subfolder) return `${subfolder} / ${baseName}`;
  return baseName;
}

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1) + ' ' + units[i];
}

function formatClockDuration(totalSec) {
  const sec = Math.max(0, Math.ceil(Number(totalSec) || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function getPlaylistDisplayDurationText(totalSec) {
  return formatClockDuration(totalSec || 0);
}

function getLoopCategories() {
  try {
    const raw = localStorage.getItem(LOOP_CATEGORIES_KEY);
    if (!raw) return [...DEFAULT_CATEGORIES];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [...DEFAULT_CATEGORIES];
    const set = new Set(arr);
    DEFAULT_CATEGORIES.forEach(c => set.add(c));
    return [...set].sort((a, b) => a.localeCompare(b));
  } catch { return [...DEFAULT_CATEGORIES]; }
}

function saveLoopCategories(cats) {
  try { localStorage.setItem(LOOP_CATEGORIES_KEY, JSON.stringify(cats || [])); } catch {}
}

function addLoopCategory(name) {
  const n = (name || '').trim();
  if (!n) return false;
  const cats = getLoopCategories();
  if (cats.some(c => c.toLowerCase() === n.toLowerCase())) return false;
  cats.push(n);
  cats.sort((a, b) => a.localeCompare(b));
  saveLoopCategories(cats);
  return true;
}

function deleteLoopCategory(name) {
  if (DEFAULT_CATEGORIES.includes(name)) return false;
  const cats = getLoopCategories().filter(c => c !== name);
  saveLoopCategories(cats);
  const assignments = getLoopCatAssignments();
  let changed = false;
  for (const [id, cat] of Object.entries(assignments)) {
    if (cat === name) { assignments[id] = 'Imported'; changed = true; }
  }
  if (changed) saveLoopCatAssignments(assignments);
  return true;
}

function getLoopCatAssignments() {
  try {
    const raw = localStorage.getItem(LOOP_CAT_ASSIGNMENTS_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return (obj && typeof obj === 'object') ? obj : {};
  } catch { return {}; }
}

function saveLoopCatAssignments(obj) {
  try { localStorage.setItem(LOOP_CAT_ASSIGNMENTS_KEY, JSON.stringify(obj || {})); } catch {}
}

function getLoopCategory(presetIdOrKey) {
  const key = String(presetIdOrKey || '');
  if (!key) return 'Imported';
  return getLoopCatAssignments()[key] || 'Imported';
}

function setLoopCategory(presetIdOrKey, category) {
  const key = String(presetIdOrKey || '');
  if (!key) return;
  const assignments = getLoopCatAssignments();
  assignments[key] = category || 'Imported';
  saveLoopCatAssignments(assignments);
}

function getLoopDescriptions() {
  try {
    const raw = localStorage.getItem(LOOP_DESCRIPTIONS_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return (obj && typeof obj === 'object') ? obj : {};
  } catch { return {}; }
}

function getLoopDescription(key) {
  const k = String(key || '');
  if (!k) return '';
  try {
    const stored = getLoopDescriptions()[k];
    if (stored) return stored;
  } catch {}
  // Fall back to hardcoded description from builtinPresets.
  const bp = builtinPresets.find(p => p.path === k);
  return (bp && bp.description) ? bp.description : '';
}

function setLoopDescription(key, desc) {
  const k = String(key || '');
  if (!k) return;
  const descs = getLoopDescriptions();
  const d = (desc || '').trim();
  if (d) descs[k] = d; else delete descs[k];
  try { localStorage.setItem(LOOP_DESCRIPTIONS_KEY, JSON.stringify(descs)); } catch {}
}

// Session-only collapse state for category sections.
const collapsedCategories = new Set();
const collapsedLoopSubfolders = new Set();
let collapsedLoopSubfoldersLoaded = false;

function getLoopSubfolderCollapseKey(category, subfolder) {
  return `${String(category || '')}::${String(subfolder || '')}`;
}

function loadCollapsedCategoriesState() {
  const categories = getLoopCategories();
  try {
    const raw = localStorage.getItem(LOOP_COLLAPSED_CATEGORIES_KEY);
    if (!raw) {
      collapsedCategories.clear();
      categories.forEach(cat => collapsedCategories.add(cat));
      localStorage.setItem(LOOP_COLLAPSED_CATEGORIES_KEY, JSON.stringify([...collapsedCategories]));
      return;
    }
    const arr = JSON.parse(raw);
    const stored = Array.isArray(arr) ? new Set(arr.map(v => String(v || ''))) : new Set();
    collapsedCategories.clear();
    categories.forEach(cat => {
      if (stored.has(cat) || !stored.size) collapsedCategories.add(cat);
    });
    // Any newly added categories should default to collapsed as well.
    localStorage.setItem(LOOP_COLLAPSED_CATEGORIES_KEY, JSON.stringify([...collapsedCategories]));
  } catch {
    collapsedCategories.clear();
    categories.forEach(cat => collapsedCategories.add(cat));
  }
}

function saveCollapsedCategoriesState() {
  try { localStorage.setItem(LOOP_COLLAPSED_CATEGORIES_KEY, JSON.stringify([...collapsedCategories])); } catch {}
}

function loadCollapsedLoopSubfoldersState() {
  collapsedLoopSubfoldersLoaded = true;
  try {
    const raw = localStorage.getItem(LOOP_COLLAPSED_SUBFOLDERS_KEY);
    const arr = JSON.parse(raw || '[]');
    collapsedLoopSubfolders.clear();
    if (Array.isArray(arr)) arr.forEach(key => collapsedLoopSubfolders.add(String(key || '')));
  } catch {
    collapsedLoopSubfolders.clear();
  }
}

function saveCollapsedLoopSubfoldersState() {
  try { localStorage.setItem(LOOP_COLLAPSED_SUBFOLDERS_KEY, JSON.stringify([...collapsedLoopSubfolders])); } catch {}
}

// Loop info page state.
let loopInfoPreset = null;
let loopInfoIsBuiltin = false;


function addUserPresetFromBlob({ name, blob, saved }) {
  const presetObj = {
    id: (saved && saved.id) || makeUploadId(),
    name: name || 'Audio',
    blob,
    persisted: !!(saved && saved.id),
    createdAt: (saved && saved.createdAt) || Date.now()
  };
  if (saved && saved.fadeIn != null) presetObj.fadeIn = saved.fadeIn;
  if (saved && saved.fadeOut != null) presetObj.fadeOut = saved.fadeOut;
  userPresets.unshift(presetObj);
  currentPresetId = presetObj.id || null;
  currentPresetRef = presetObj;
  currentPresetKey = presetObj.id ? `upload:${presetObj.id}` : null;
  try { updateFavoritesUI(); } catch {}
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

async function savePersistedUpload({ name, blob, trimIn, trimOut, fadeIn, fadeOut }) {
  if (!blob) return null;
  const record = {
    id: makeUploadId(),
    name: name || 'Audio',
    blob,
    createdAt: Date.now(),
    ...(trimIn != null ? { trimIn } : {}),
    ...(trimOut != null ? { trimOut } : {}),
    ...(fadeIn != null ? { fadeIn } : {}),
    ...(fadeOut != null ? { fadeOut } : {})
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

async function putPersistedUploadRecord(record) {
  if (!record || !record.id || !record.blob) return null;
  let createdAt = Number(record.createdAt);
  if (!Number.isFinite(createdAt)) createdAt = Date.now();
  const rec = {
    id: String(record.id),
    name: String(record.name || 'Audio'),
    blob: record.blob,
    createdAt,
    ...(record.trimIn != null ? { trimIn: record.trimIn } : {}),
    ...(record.trimOut != null ? { trimOut: record.trimOut } : {}),
    ...(record.fadeIn != null ? { fadeIn: record.fadeIn } : {}),
    ...(record.fadeOut != null ? { fadeOut: record.fadeOut } : {})
  };
  const db = await openUploadsDb();

  await idbTx(db, 'readwrite', (store) => store.put(rec));

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
  return rec;
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

async function getPersistedUploadRecord(id) {
  if (!id) return null;
  const db = await openUploadsDb();
  try {
    return await idbTx(db, 'readonly', (store) => {
      return new Promise((resolve, reject) => {
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    });
  } catch {
    return null;
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
      if (it.fadeIn != null) preset.fadeIn = it.fadeIn;
      if (it.fadeOut != null) preset.fadeOut = it.fadeOut;
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
      currentPresetKey = null;
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
  const loopFavoriteKey = preset && preset.id ? `upload:${preset.id}` : (preset && preset.url ? `url:${preset.url}` : null);
  if (loopFavoriteKey) {
    favoriteEntries = favoriteEntries.filter(entry => !(entry && entry.kind === 'loop' && entry.key === loopFavoriteKey));
    saveFavoriteEntries();
    try { updateFavoritesUI(); } catch {}
  }

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
const DRUM_KIT_BUILTIN_GROUPS = [
  { folder: 'Cymbals', files: ['Crash.wav', 'Ride.wav', 'Splash.wav'] },
  { folder: 'HiHat', files: ['hat_close_01.wav', 'hat_close_02.wav', 'hat_close_03.wav', 'hat_close_04.wav'] },
  { folder: 'HiHat open', files: ['HH open 01.wav', 'HH open 02.wav', 'HH open 03.wav', 'HH open 04.wav', 'HH open 05.wav'] },
  { folder: 'Kick', files: ['Kick 01.wav', 'Kick 02.wav', 'Kick 03.wav', 'Kick 04.wav'] },
  { folder: 'Snare', files: ['Side Stick 01.wav', 'Side Stick 02.wav', 'Side Stick 03.wav', 'Side Stick 04.wav', 'Snare 01.wav', 'Snare 02.wav', 'Snare 03.wav', 'Snare 04.wav'] }
];

const DRUM_KIT_BUILTINS = DRUM_KIT_BUILTIN_GROUPS.flatMap(({ folder, files }) => {
  return files.map(file => ({
    name: file,
    path: `audio/drum-kit/${folder}/${file}`,
    category: 'DRUM-KIT',
    subfolder: folder
  }));
});

const DRUMS_PERCUSSIONS_BUILTINS = [
  'Percussion 01.wav',
  'Percussion 02.wav',
  'Percussion 03.wav',
  'Percussion 04.wav',
  'Percussion 05.wav',
  'Percussion 06.wav'
].map(file => ({
  name: file,
  path: `audio/drums & percussions/${file}`,
  category: 'Drums & Percussions'
}));

const builtinPresets = [
  ...DRUM_KIT_BUILTINS,
  ...DRUMS_PERCUSSIONS_BUILTINS,
  // Frequencies — sorted numerically. Files live in audio/frequencies/<name>.mp3.
  // Entries without a physical file yet are pre-registered so descriptions and
  // categories appear as soon as you drop the matching .mp3 into the folder.
  { name: '111hz.mp3',   path: 'audio/frequencies/111hz.mp3',   category: 'Frequencies', description: 'Promotes mental clarity and alignment; often used for angelic guidance and new beginnings in manifestation practices. Health benefits include stimulating the brain for improved focus and reducing mental fatigue, potentially supporting neurological health and cognitive function.' },
  { name: '123hz.mp3',   path: 'audio/frequencies/123hz.mp3',   category: 'Frequencies', description: 'Gentle grounding, emotional balance, early chakra alignment. Health benefits include stimulating the lower chakras, which may aid in supporting kidney and adrenal gland function, helping to alleviate stress-related imbalances in these organs.' },
  { name: '147hz.mp3',   path: 'audio/frequencies/147hz.mp3',   category: 'Frequencies', description: 'Clarity of thought, removal of mental fog, supportive for focus. Health benefits include stimulating brain activity for enhanced cognitive processing, potentially benefiting the nervous system and reducing symptoms associated with brain fog or mild cognitive strain.' },
  { name: '174hz.mp3',   path: 'audio/frequencies/174hz.mp3',   category: 'Frequencies', description: 'Relieves pain and stress; promotes a sense of security and grounding. Often linked to foundational energy. Health benefits include acting as a natural anesthetic for pain reduction, particularly supporting the musculoskeletal system and organs like the kidneys and bladder by easing physical tension and promoting overall bodily relaxation.' },
  { name: '222hz.mp3',   path: 'audio/frequencies/222hz.mp3',   category: 'Frequencies', description: 'Enhances balance and partnerships; supports emotional healing and duality resolution. Health benefits include stimulating the sacral chakra, which may support reproductive organs and the urinary system, aiding in emotional regulation that indirectly benefits hormonal balance.' },
  { name: '258hz.mp3',   path: 'audio/frequencies/258hz.mp3',   category: 'Frequencies', description: 'Cellular repair, nurturing energy, often paired with 285 Hz. Health benefits include promoting cellular regeneration, which can support organ tissue repair, particularly in the liver and skin, enhancing overall vitality and healing processes.' },
  { name: '285hz.mp3',   path: 'audio/frequencies/285hz.mp3',   category: 'Frequencies', description: 'Enhances multidimensional awareness; aids in tissue regeneration and cellular healing. Health benefits include stimulating tissue and organ repair, boosting immunity, and supporting regeneration in organs like the skin, muscles, and internal tissues, helping with wounds and cellular health.' },
  { name: '333hz.mp3',   path: 'audio/frequencies/333hz.mp3',   category: 'Frequencies', description: 'Fosters creativity and spiritual growth; linked to ascended masters and self-expression. Health benefits include stimulating the solar plexus chakra, which may support digestive organs like the stomach, liver, and pancreas, aiding in energy flow and reducing digestive discomfort.' },
  { name: '369hz.mp3',   path: 'audio/frequencies/369hz.mp3',   category: 'Frequencies', description: 'Known as the "Tesla code" frequency; aids in manifestation, universal alignment, and removing negative energy. Health benefits include promoting overall vibrational harmony, which can indirectly support organ function by reducing stress, potentially benefiting the heart and nervous system through balanced energy.' },
  { name: '396hz.mp3',   path: 'audio/frequencies/396hz.mp3',   category: 'Frequencies', description: 'Liberates guilt and fear; supports root chakra balance and emotional release. Health benefits include stimulating the root chakra, which aids organs like the kidneys, bladder, colon, and spine, helping to alleviate fear-related stress that impacts these areas.' },
  { name: '417hz.mp3',   path: 'audio/frequencies/417hz.mp3',   category: 'Frequencies', description: 'Facilitates change and removes negative influences; resonates with the sacral chakra for creativity and undoing past traumas. Health benefits include stimulating the sacral chakra, supporting reproductive organs, bladder, and kidneys, aiding in hormonal balance and emotional healing that benefits these systems.' },
  { name: '432hz.mp3',   path: 'audio/frequencies/432hz.mp3',   category: 'Frequencies', description: 'Often called the "universal frequency"; promotes harmony with nature, stress reduction, and alignment with cosmic patterns; linked to Tesla\'s theories for its mathematical resonance with energy and vibration. Health benefits include general stress relief that supports the heart and cardiovascular system, potentially aiding in overall organ harmony and reducing inflammation through vibrational alignment.' },
  { name: '444hz.mp3',   path: 'audio/frequencies/444hz.mp3',   category: 'Frequencies', description: 'Strengthens protection and stability; encourages focus on practical foundations and angelic support. Health benefits include stimulating foundational energy, which may support the skeletal system and organs like the bones and joints, promoting stability and reducing physical vulnerabilities.' },
  { name: '456hz.mp3',   path: 'audio/frequencies/456hz.mp3',   category: 'Frequencies', description: 'Harmonizing relationships, heart-centered calm. Health benefits include supporting the heart chakra, benefiting organs like the heart and lungs, aiding in emotional calm that reduces strain on the cardiovascular and respiratory systems.' },
  { name: '528hz.mp3',   path: 'audio/frequencies/528hz.mp3',   category: 'Frequencies', description: 'Known as the "love frequency" or "miracle tone"; promotes DNA repair, transformation, and solar plexus chakra harmony. Health benefits include stimulating DNA repair at a cellular level, supporting organs like the stomach, liver, and pancreas through enhanced vitality and reduced stress hormones.' },
  { name: '555hz.mp3',   path: 'audio/frequencies/555hz.mp3',   category: 'Frequencies', description: 'Facilitates change and transformation; promotes adaptability and personal freedom. Health benefits include supporting adaptive energy, which may benefit the endocrine system and organs like the adrenals, aiding in stress adaptation and hormonal flexibility.' },
  { name: '567hz.mp3',   path: 'audio/frequencies/567hz.mp3',   category: 'Frequencies', description: 'Completion of cycles, spiritual insight, letting go. Health benefits include promoting release and insight, potentially supporting detox organs like the liver and kidneys, aiding in emotional and physical cycle completion.' },
  { name: '639hz.mp3',   path: 'audio/frequencies/639hz.mp3',   category: 'Frequencies', description: 'Enhances relationships and communication; balances the heart chakra for harmony and connection. Health benefits include stimulating the heart chakra, supporting organs like the heart, lungs, and thymus gland, promoting emotional harmony that benefits cardiovascular health.' },
  { name: '666hz.mp3',   path: 'audio/frequencies/666hz.mp3',   category: 'Frequencies', description: 'Balances material and spiritual aspects; aids in compassion and overcoming fears related to abundance. Health benefits include balancing energies that support the solar plexus, aiding organs like the pancreas and digestive tract, promoting compassion that reduces fear-induced stress.' },
  { name: '693hz.mp3',   path: 'audio/frequencies/693hz.mp3',   category: 'Frequencies', description: 'Deep emotional release, forgiveness frequency variant. Health benefits include facilitating emotional release, which may support the liver and gallbladder, organs associated with processing emotions like anger and resentment.' },
  { name: '714hz.mp3',   path: 'audio/frequencies/714hz.mp3',   category: 'Frequencies', description: 'Problem-solving energy, awakening intuition. Health benefits include stimulating intuitive centers, potentially benefiting the brain and pineal gland, aiding in cognitive problem-solving and reducing mental blocks.' },
  { name: '741hz.mp3',   path: 'audio/frequencies/741hz.mp3',   category: 'Frequencies', description: 'Awakens intuition and self-expression; cleanses toxins and supports throat chakra clarity. Health benefits include stimulating the throat chakra, supporting organs like the thyroid, throat, and lungs, aiding in detoxification and clear communication that benefits respiratory health.' },
  { name: '777hz.mp3',   path: 'audio/frequencies/777hz.mp3',   category: 'Frequencies', description: 'Enhances spiritual awakening and intuition; connected to divine wisdom and inner guidance. Health benefits include stimulating higher intuition, supporting the brain and nervous system, promoting wisdom that aids in overall mental and spiritual health.' },
  { name: '825hz.mp3',   path: 'audio/frequencies/825hz.mp3',   category: 'Frequencies', description: 'Inner peace, balancing polarities, soothing overthinking. Health benefits include promoting peace that soothes the mind, potentially benefiting the brain and reducing overactivity in the nervous system.' },
  { name: '852hz.mp3',   path: 'audio/frequencies/852hz.mp3',   category: 'Frequencies', description: 'Returns one to spiritual order; activates the third eye chakra for inner vision and awareness. Health benefits include stimulating the third eye chakra, supporting organs like the pituitary gland, eyes, and brain, aiding in vision and hormonal regulation.' },
  { name: '888hz.mp3',   path: 'audio/frequencies/888hz.mp3',   category: 'Frequencies', description: 'Attracts abundance and infinite potential; supports karmic balance and prosperity. Health benefits include promoting abundance energy, which may support the endocrine system and organs like the thymus, aiding in immune balance and vitality.' },
  { name: '936hz.mp3',   path: 'audio/frequencies/936hz.mp3',   category: 'Frequencies', description: 'Pineal gland activation, higher-self connection (extended 963 variant). Health benefits include stimulating the pineal gland, supporting brain function and melatonin production, aiding in sleep regulation and spiritual awareness.' },
  { name: '963hz.mp3',   path: 'audio/frequencies/963hz.mp3',   category: 'Frequencies', description: 'Connects to higher consciousness; awakens the crown chakra for unity and enlightenment. Health benefits include stimulating the crown chakra, supporting the pineal gland and brain, promoting enlightenment that enhances overall neurological harmony.' },
  { name: '999hz.mp3',   path: 'audio/frequencies/999hz.mp3',   category: 'Frequencies', description: 'Signifies completion and closure; facilitates letting go and transitioning to higher states of consciousness. Health benefits include promoting closure, which may support detox organs like the liver and kidneys, aiding in emotional and physical release.' },
  { name: '1008hz.mp3',  path: 'audio/frequencies/1008hz.mp3',  category: 'Frequencies', description: 'Sacred geometry resonance, unity consciousness. Health benefits include resonating with unity, potentially supporting the entire body\'s systems, aiding in holistic organ harmony and cellular coherence.' },
  { name: '1080hz.mp3',  path: 'audio/frequencies/1080hz.mp3',  category: 'Frequencies', description: 'Associated with sacred geometry and enlightenment; used in advanced meditation for universal connection (extended harmonic). Health benefits include promoting enlightenment, supporting brain and pineal gland function, aiding in higher consciousness that benefits neurological health.' },
  { name: '1116hz.mp3',  path: 'audio/frequencies/1116hz.mp3',  category: 'Frequencies', description: 'Amplification of intention, spiritual protection. Health benefits include amplifying protective energy, potentially supporting the immune system and organs like the thymus, aiding in spiritual and physical resilience.' },
  { name: '1125hz.mp3',  path: 'audio/frequencies/1125hz.mp3',  category: 'Frequencies', description: 'Transformation through surrender, deep healing. Health benefits include facilitating deep transformation, supporting regenerative processes in organs like the liver and skin, aiding in profound healing and surrender.' },
  // Nature
  { name: 'rain_forest.mp3', path: 'audio/nature/rain_forest.mp3', category: 'Nature' },
  // Noises
  { name: 'white_noise.mp3', path: 'audio/noises/white_noise.mp3', category: 'Noises', description: 'Continuous white noise for masking distractions, sleep support, focus, and relaxation.' },
  { name: 'white_noise_432hz.mp3', path: 'audio/noises/white_noise_432hz.mp3', category: 'Noises' },
  // Soundscapes
  { name: 'ambiental_synth.mp3', path: 'audio/soundscapes/ambiental_synth.mp3', category: 'Soundscapes' },
];
let currentBuffer = null;
let currentSourceLabel = null;
let currentPresetKey = null;
let currentPresetId = null;
let currentPresetRef = null;

// Visual-only playhead state (Player waveform).
let wavePlayheadRaf = 0;
let wavePlayheadPosSec = 0;
let wavePlayheadLastCtxTime = 0;
let wavePlayheadLoopStart = 0;
let wavePlayheadLoopEnd = 0;
let wavePlayheadDur = 0;

function stopWavePlayhead() {
  try { if (wavePlayheadRaf) cancelAnimationFrame(wavePlayheadRaf); } catch {}
  wavePlayheadRaf = 0;
  wavePlayheadPosSec = 0;
  wavePlayheadLastCtxTime = 0;
  wavePlayheadLoopStart = 0;
  wavePlayheadLoopEnd = 0;
  wavePlayheadDur = 0;
  const el = document.getElementById('wavePlayhead');
  if (el) {
    el.classList.add('hidden');
    el.setAttribute('aria-hidden', 'true');
    try { el.style.transform = 'translateX(0px)'; } catch {}
  }
}

function startWavePlayhead(buffer, loopStartSec, loopEndSec) {
  const el = document.getElementById('wavePlayhead');
  const canvas = document.getElementById('wave');
  if (!el || !canvas || !buffer || !audioCtx) return;

  const dur = Number(buffer.duration || 0);
  if (!Number.isFinite(dur) || dur <= 0) return;

  wavePlayheadDur = dur;
  wavePlayheadLoopStart = Math.max(0, Number(loopStartSec || 0));
  wavePlayheadLoopEnd = Math.max(wavePlayheadLoopStart, Number(loopEndSec || 0));
  wavePlayheadPosSec = 0;
  wavePlayheadLastCtxTime = audioCtx.currentTime;

  el.classList.remove('hidden');
  el.setAttribute('aria-hidden', 'true');

  const tick = () => {
    if (!audioCtx || !loopSource) { stopWavePlayhead(); return; }

    const now = audioCtx.currentTime;
    const dt = Math.max(0, now - (wavePlayheadLastCtxTime || now));
    wavePlayheadLastCtxTime = now;

    const rate = clamp(currentRate, RATE_MIN, RATE_MAX);
    wavePlayheadPosSec += dt * rate;

    // Wrap at loopEnd -> loopStart, matching AudioBufferSourceNode looping.
    const ls = wavePlayheadLoopStart;
    const le = wavePlayheadLoopEnd;
    const seg = le - ls;
    if (seg > 0 && wavePlayheadPosSec >= le) {
      wavePlayheadPosSec = ls + ((wavePlayheadPosSec - le) % seg);
    } else if (wavePlayheadPosSec >= wavePlayheadDur) {
      wavePlayheadPosSec = 0;
    }

    try {
      const rect = canvas.getBoundingClientRect();
      const w = rect && rect.width ? rect.width : 0;
      if (w > 0) {
        const x = Math.max(0, Math.min(w, (wavePlayheadPosSec / wavePlayheadDur) * w));
        el.style.transform = `translateX(${x}px)`;
      }
    } catch {}

    wavePlayheadRaf = requestAnimationFrame(tick);
  };

  try { if (wavePlayheadRaf) cancelAnimationFrame(wavePlayheadRaf); } catch {}
  wavePlayheadRaf = requestAnimationFrame(tick);
}

function updateNowPlayingNameUI() {
  const el = document.getElementById('nowPlayingName');
  if (!el) return;
  const isPlaying = !!loopSource;
  const label = (currentSourceLabel || '').trim();
  if (isPlaying && label) {
    el.replaceChildren();
    const nameSpan = document.createElement('span');
    nameSpan.textContent = label;
    el.appendChild(nameSpan);

    if (playlistIsPlaying && playlistCurrentLoopRep > 0 && playlistCurrentLoopRepTotal > 0) {
      const progressSpan = document.createElement('span');
      progressSpan.textContent = `${playlistCurrentLoopRep}/${playlistCurrentLoopRepTotal}`;
      progressSpan.style.display = 'block';
      progressSpan.style.marginTop = '3px';
      progressSpan.style.fontSize = '11px';
      progressSpan.style.fontWeight = '500';
      progressSpan.style.color = 'var(--text-3)';
      el.appendChild(progressSpan);
    }
    el.classList.remove('hidden');
    el.setAttribute('aria-hidden', 'false');
  } else {
    el.textContent = '';
    el.classList.add('hidden');
    el.setAttribute('aria-hidden', 'true');
  }
  try { updateCurrentLoopFavoriteButton(); } catch {}
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
let playlistCountdownTimer = 0;
let playlistCountdownEndAt = 0;
let playlistCurrentLoopRep = 0;
let playlistCurrentLoopRepTotal = 0;
let pendingDeletePlaylistId = null;
let detailPlaylistId = null;
let detailEditMode = false;
let pendingDetailLoopChoice = null;
let pendingDetailNewItemId = null;
let favoriteEntries = loadFavoriteEntries();

function setPlayerPlaylist(record) {
  playerPlaylist = record || null;
  playerPlaylistId = (record && record.id) ? record.id : null;
  if (record && record.id && record.name) updateFavoriteEntryLabel('playlist', record.id, record.name);
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
  const metaEl = document.getElementById('playerPlaylistCountdown');
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
    if (metaEl) {
      metaEl.textContent = '';
      metaEl.classList.add('hidden');
      metaEl.setAttribute('aria-hidden', 'true');
    }
  }

  try { updatePlayerPlaylistFavoriteButton(); } catch {}
}

function loadFavoriteEntries() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.map(entry => {
      const kind = entry && entry.kind === 'playlist' ? 'playlist' : (entry && entry.kind === 'loop' ? 'loop' : '');
      const key = entry && entry.key != null ? String(entry.key) : '';
      if (!kind || !key) return null;
      return {
        kind,
        key,
        label: String((entry && entry.label) || (kind === 'playlist' ? 'Playlist' : 'Loop')),
        addedAt: Number(entry && entry.addedAt) || Date.now()
      };
    }).filter(Boolean);
  } catch {}
  return [];
}

function saveFavoriteEntries() {
  try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteEntries || [])); } catch {}
}

function getLoopFavoriteKeyForPreset(preset, isBuiltin) {
  if (!preset) return null;
  if (isBuiltin && preset.path) return `builtin:${preset.path}`;
  if (!isBuiltin && preset.id) return `upload:${preset.id}`;
  if (!isBuiltin && preset.url) return `url:${preset.url}`;
  return null;
}

function resolveLoopFavoriteLabelByKey(presetKey, fallback = 'Loop') {
  const key = String(presetKey || '');
  if (!key) return fallback;
  if (key.startsWith('builtin:')) {
    const path = key.slice('builtin:'.length);
    const preset = builtinPresets.find(p => p && p.path === path);
    return stripFileExt((preset && preset.name) || path.split('/').pop() || fallback);
  }
  if (key.startsWith('upload:')) {
    const id = key.slice('upload:'.length);
    const preset = userPresets.find(p => p && String(p.id) === String(id));
    const raw = (preset && preset.id && getUploadNameOverride(preset.id)) || (preset && preset.name) || fallback;
    return stripFileExt(raw);
  }
  if (key.startsWith('url:')) {
    const url = key.slice('url:'.length);
    const preset = userPresets.find(p => p && p.url === url);
    return stripFileExt((preset && preset.name) || url || fallback);
  }
  return fallback;
}

function findFavoriteIndex(kind, key) {
  return favoriteEntries.findIndex(entry => entry && entry.kind === kind && entry.key === String(key));
}

function isFavorite(kind, key) {
  if (!kind || key == null) return false;
  return findFavoriteIndex(kind, key) >= 0;
}

function updateFavoriteEntryLabel(kind, key, label) {
  const idx = findFavoriteIndex(kind, key);
  if (idx < 0) return;
  const nextLabel = String(label || '').trim();
  if (!nextLabel || favoriteEntries[idx].label === nextLabel) return;
  favoriteEntries[idx].label = nextLabel;
  saveFavoriteEntries();
}

function toggleFavoriteEntry(entry) {
  if (!entry || !entry.kind || entry.key == null) return false;
  const key = String(entry.key);
  const idx = findFavoriteIndex(entry.kind, key);
  let active = false;
  if (idx >= 0) {
    favoriteEntries.splice(idx, 1);
  } else {
    favoriteEntries.unshift({
      kind: entry.kind,
      key,
      label: String(entry.label || (entry.kind === 'playlist' ? 'Playlist' : 'Loop')),
      addedAt: Date.now()
    });
    active = true;
  }
  saveFavoriteEntries();
  try { updateFavoritesUI(); } catch {}
  return active;
}

function updateFavoriteToggleButton(btn, active, label) {
  if (!btn) return;
  btn.classList.toggle('active', !!active);
  btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  btn.setAttribute('aria-label', `${active ? 'Remove' : 'Add'} ${label} ${active ? 'from' : 'to'} favorites`);
  btn.title = active ? 'Remove from favorites' : 'Add to favorites';
  btn.textContent = '+';
}

function getCurrentLoopFavoriteEntry() {
  if (!currentPresetKey || !currentSourceLabel) return null;
  return {
    kind: 'loop',
    key: currentPresetKey,
    label: stripFileExt(currentSourceLabel || resolveLoopFavoriteLabelByKey(currentPresetKey, 'Loop'))
  };
}

function getCurrentPlaylistFavoriteEntry() {
  if (!playerPlaylist || !playerPlaylist.id) return null;
  return {
    kind: 'playlist',
    key: playerPlaylist.id,
    label: String(playerPlaylist.name || 'Playlist')
  };
}

function updateCurrentLoopFavoriteButton() {
  const row = document.getElementById('playerLoopFavRow');
  const btn = document.getElementById('playerLoopFavBtn');
  const entry = getCurrentLoopFavoriteEntry();
  const show = !!(entry && currentSourceLabel && String(currentSourceLabel).trim());
  if (row) {
    row.classList.toggle('hidden', !show);
    row.setAttribute('aria-hidden', show ? 'false' : 'true');
  }
  if (!btn) return;
  if (!show) {
    btn.classList.remove('active');
    btn.setAttribute('aria-pressed', 'false');
    return;
  }
  updateFavoriteToggleButton(btn, isFavorite('loop', entry.key), 'loop');
}

function updatePlayerPlaylistFavoriteButton() {
  const row = document.getElementById('playerPlaylistFavRow');
  const btn = document.getElementById('playerPlaylistFavBtn');
  const entry = getCurrentPlaylistFavoriteEntry();
  const show = !!entry;
  if (row) {
    row.classList.toggle('hidden', !show);
    row.setAttribute('aria-hidden', show ? 'false' : 'true');
  }
  if (!btn) return;
  if (!show) {
    btn.classList.remove('active');
    btn.setAttribute('aria-pressed', 'false');
    return;
  }
  updateFavoriteToggleButton(btn, isFavorite('playlist', entry.key), 'playlist');
}

function updateLoopInfoFavoriteButton() {
  const btn = document.getElementById('loopInfoFavoriteBtn');
  if (!btn || !loopInfoPreset) return;
  const key = getLoopFavoriteKeyForPreset(loopInfoPreset, loopInfoIsBuiltin);
  if (!key) {
    btn.classList.add('hidden');
    return;
  }
  btn.classList.remove('hidden');
  const label = stripFileExt(((!loopInfoIsBuiltin && loopInfoPreset.id && getUploadNameOverride(loopInfoPreset.id)) || loopInfoPreset.name || 'Loop'));
  updateFavoriteToggleButton(btn, isFavorite('loop', key), 'loop');
  updateFavoriteEntryLabel('loop', key, label);
}

function updateDetailFavoriteButton() {
  const btn = document.getElementById('detailFavoriteBtn');
  if (!btn || !activePlaylist || !activePlaylist.id) return;
  updateFavoriteToggleButton(btn, isFavorite('playlist', activePlaylist.id), 'playlist');
  updateFavoriteEntryLabel('playlist', activePlaylist.id, activePlaylist.name || 'Playlist');
}

async function activateFavoriteEntry(entry) {
  if (!entry) return;
  if (entry.kind === 'playlist') {
    try {
      const rec = await loadPlaylistRecord(entry.key);
      if (!rec) {
        favoriteEntries = favoriteEntries.filter(f => !(f && f.kind === 'playlist' && f.key === entry.key));
        saveFavoriteEntries();
        updateFavoritesUI();
        setStatus('Favorite playlist not found.');
        return;
      }
      setPlayerPlaylist(rec);
      switchTab('player');
      await playActivePlaylist();
      return;
    } catch {
      setStatus('Failed to load favorite playlist.');
      return;
    }
  }

  try {
    const loaded = await loadBufferFromPresetKey(entry.key);
    if (!loaded || !loaded.buffer) {
      favoriteEntries = favoriteEntries.filter(f => !(f && f.kind === 'loop' && f.key === entry.key));
      saveFavoriteEntries();
      updateFavoritesUI();
      setStatus('Favorite loop unavailable.');
      return;
    }
    clearPlayerPlaylistContext();
    currentBuffer = loaded.buffer;
    currentSourceLabel = resolveLoopFavoriteLabelByKey(entry.key, entry.label || loaded.sourceLabel || 'Loop');
    currentPresetKey = entry.key;
    currentPresetId = loaded.presetId || null;
    currentPresetRef = loaded.presetRef || null;
    updateFavoriteEntryLabel('loop', entry.key, currentSourceLabel);
    await startLoopFromBuffer(loaded.buffer, 0.5, 0.03);
    switchTab('player');
  } catch {
    setStatus('Failed to load favorite loop.');
  }
}

function renderFavoritesIsland() {
  const container = document.getElementById('favoritesIsland');
  const countEl = document.getElementById('favoritesCount');
  if (!container) return;
  container.innerHTML = '';
  const items = [...favoriteEntries].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  if (countEl) countEl.textContent = String(items.length);

  if (!items.length) {
    const empty = document.createElement('p');
    empty.className = 'favorites-empty';
    empty.textContent = 'No favorites yet.';
    container.appendChild(empty);
    return;
  }

  items.forEach(entry => {
    const row = document.createElement('div');
    const active = entry.kind === 'playlist'
      ? !!(playerPlaylistId && playerPlaylistId === entry.key)
      : !!(currentPresetKey && currentPresetKey === entry.key);
    row.className = 'favorite-entry' + (active ? ' active' : '');

    const mainBtn = document.createElement('button');
    mainBtn.type = 'button';
    mainBtn.className = 'favorite-entry-main';

    const label = document.createElement('span');
    label.className = 'favorite-entry-label';
    label.textContent = entry.kind === 'loop'
      ? resolveLoopFavoriteLabelByKey(entry.key, entry.label || 'Loop')
      : String(entry.label || 'Playlist');
    mainBtn.appendChild(label);

    const meta = document.createElement('span');
    meta.className = 'favorite-entry-meta';
    const type = document.createElement('span');
    type.className = 'favorite-entry-type';
    type.textContent = entry.kind;
    meta.appendChild(type);
    mainBtn.appendChild(meta);
    mainBtn.addEventListener('click', async () => {
      await activateFavoriteEntry(entry);
      updateFavoritesUI();
    });

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'favorite-toggle-btn active';
    updateFavoriteToggleButton(toggleBtn, true, entry.kind);
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavoriteEntry(entry);
    });

    row.appendChild(mainBtn);
    row.appendChild(toggleBtn);
    container.appendChild(row);
  });
}

function updateFavoritesUI() {
  try { updateCurrentLoopFavoriteButton(); } catch {}
  try { updatePlayerPlaylistFavoriteButton(); } catch {}
  try { updateLoopInfoFavoriteButton(); } catch {}
  try { updateDetailFavoriteButton(); } catch {}
  try { renderFavoritesIsland(); } catch {}
}

function stopPlaylistCountdown() {
  if (playlistCountdownTimer) {
    clearInterval(playlistCountdownTimer);
    playlistCountdownTimer = 0;
  }
  playlistCountdownEndAt = 0;
  const metaEl = document.getElementById('playerPlaylistCountdown');
  if (metaEl) {
    metaEl.textContent = '';
    metaEl.classList.add('hidden');
    metaEl.setAttribute('aria-hidden', 'true');
  }
}

function startPlaylistCountdown(endAt) {
  const metaEl = document.getElementById('playerPlaylistCountdown');
  if (!metaEl || !audioCtx || !Number.isFinite(endAt)) return;
  stopPlaylistCountdown();
  playlistCountdownEndAt = endAt;

  const tick = () => {
    if (!audioCtx || !playlistCountdownEndAt || !playerPlaylist) {
      stopPlaylistCountdown();
      return;
    }
    const remaining = Math.max(0, playlistCountdownEndAt - audioCtx.currentTime);
    metaEl.textContent = `Ends in ${formatClockDuration(remaining)}`;
    metaEl.classList.remove('hidden');
    metaEl.setAttribute('aria-hidden', 'false');
  };

  tick();
  playlistCountdownTimer = setInterval(tick, 250);
}

// Trimmer state
let trimBuffer = null;
let trimPreset = null;  // the userPresets entry being trimmed
let trimIn = 0;
let trimOut = 0;
let trimFadeInSec = 0;
let trimFadeOutSec = 0;
let trimZoomLevel = 1;
let trimViewStart = 0; // left edge of zoomed view (seconds)
let trimDragging = null; // 'in' | 'out' | 'fadeIn' | 'fadeOut' | 'pan' | null
let trimDragPointerId = null;
let trimDragCaptureEl = null;
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
let trimTestRepeats = true;

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
let vizAutoPeak = 0;
let vizBarScratch = [];
let vizBarSmooth = [];
let desktopVizActive = false;
let desktopVizRafId = 0;
let desktopVizCanvas = null;
let desktopVizCtx = null;
let desktopVizBarSmooth = [];
let desktopVizAutoPeak = 0;
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

function normalizeAssignmentVolume(value, fallback = 1.0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return clamp(Number(fallback) || 1.0, 0, 1);
  return clamp(parsed, 0, 1);
}

function setAssignmentVolumeUI(input, readout, value) {
  const volume = normalizeAssignmentVolume(value, 1.0);
  const percent = clamp(Math.round(volume * 100), 0, 100);
  if (input) input.value = String(percent);
  if (readout) readout.textContent = `${percent}%`;
  return volume;
}

function readAssignmentVolumeUI(input, fallback = 1.0) {
  const fallbackPercent = Math.round(normalizeAssignmentVolume(fallback, 1.0) * 100);
  const percent = clamp(parseInt(input && input.value, 10) || fallbackPercent, 0, 100);
  return percent / 100;
}

function updateTrimRepeatToggleButton() {
  const btn = document.getElementById('trimRepeatToggle');
  if (!btn) return;
  const text = trimTestRepeats ? t('trimmer_repeat_on') : t('trimmer_repeat_off');
  btn.textContent = text;
  btn.setAttribute('aria-pressed', trimTestRepeats ? 'true' : 'false');
  btn.setAttribute('aria-label', text);
  btn.title = text;
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
  // Update pitch correction when preserve-pitch is active.
  try { updatePitchShifter(); } catch {}
  return currentRate;
}

/* ================================================================
   Granular pitch shifter — corrects pitch when preservePitch is on.
   Uses ScriptProcessorNode with overlap-add granular resampling.
   Inserted between loopGain and master only when needed.
   Stereo-aware (2-channel); handles mono sources transparently.
   ================================================================ */

function createPitchShifterNode(ctx, pitchFactor) {
  const bufSize = 4096;
  const grainSize = 1024;
  const overlap = 4;
  const hop = (grainSize / overlap) | 0; // 256

  const node = ctx.createScriptProcessor(bufSize, 2, 2);
  node._pitchFactor = pitchFactor;
  node._chState = null;

  // Pre-compute Hann window.
  const win = new Float32Array(grainSize);
  for (let i = 0; i < grainSize; i++) {
    win[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (grainSize - 1)));
  }

  function makeState() {
    return {
      inBuf: new Float32Array(bufSize * 4),
      inW: 0,   // input write cursor
      inR: 0,   // input read cursor
      outBuf: new Float32Array(bufSize * 4),
      outW: 0,  // OLA write cursor
      outR: 0,  // read cursor
    };
  }

  node.onaudioprocess = function (e) {
    const pf = node._pitchFactor;
    const inCh = e.inputBuffer.numberOfChannels;
    const outCh = e.outputBuffer.numberOfChannels;
    const ch = Math.min(inCh, outCh, 2);
    const bLen = e.outputBuffer.length;

    // Bypass when near unity.
    if (!pf || Math.abs(pf - 1.0) < 0.005) {
      for (let c = 0; c < ch; c++)
        e.outputBuffer.getChannelData(c).set(e.inputBuffer.getChannelData(c));
      for (let c = ch; c < outCh; c++)
        e.outputBuffer.getChannelData(c).fill(0);
      return;
    }

    if (!node._chState) {
      node._chState = [];
      for (let c = 0; c < ch; c++) node._chState.push(makeState());
    }

    // How many input samples each grain reads from (may be < or > grainSize).
    const readLen = Math.ceil(grainSize * pf);

    for (let c = 0; c < ch; c++) {
      const inp = e.inputBuffer.getChannelData(c);
      const out = e.outputBuffer.getChannelData(c);
      const s = node._chState[c];

      // ---- append input ----
      const inAvailBefore = s.inW - s.inR;
      const neededIn = inAvailBefore + inp.length;
      if (s.inW + inp.length > s.inBuf.length) {
        const nb = new Float32Array(Math.max(neededIn * 2, bufSize * 4));
        nb.set(s.inBuf.subarray(s.inR, s.inW));
        s.inW = inAvailBefore;
        s.inR = 0;
        s.inBuf = nb;
      }
      s.inBuf.set(inp, s.inW);
      s.inW += inp.length;

      // ---- grow output buffer if needed ----
      const outNeed = s.outW + grainSize + bLen;
      if (outNeed > s.outBuf.length) {
        const nb = new Float32Array(outNeed * 2);
        nb.set(s.outBuf.subarray(0, s.outW));
        s.outBuf = nb;
      }

      // ---- OLA: produce grains while enough input available ----
      while ((s.inW - s.inR) >= readLen) {
        const base = s.inR; // grain reads from base..base+readLen-1
        for (let i = 0; i < grainSize; i++) {
          const srcPos = i * pf;
          const idx = (srcPos | 0) + base;
          const frac = srcPos - (srcPos | 0);
          const v0 = idx < s.inW ? s.inBuf[idx] : 0;
          const v1 = (idx + 1) < s.inW ? s.inBuf[idx + 1] : v0;
          s.outBuf[s.outW + i] += (v0 + frac * (v1 - v0)) * win[i];
        }
        s.outW += hop;  // advance output by hop (overlap-add)
        s.inR += hop;   // consume hop input (balanced I/O rate)
      }

      // ---- compact input when read cursor drifts far ----
      if (s.inR > bufSize * 2) {
        const remain = s.inW - s.inR;
        s.inBuf.copyWithin(0, s.inR, s.inW);
        s.inR = 0;
        s.inW = remain;
      }

      // ---- read output ----
      const avail = s.outW - s.outR;
      const rd = Math.min(bLen, Math.max(0, avail));
      for (let i = 0; i < rd; i++) out[i] = s.outBuf[s.outR + i];
      for (let i = rd; i < bLen; i++) out[i] = 0;

      // Clear consumed output region for future OLA additions.
      s.outBuf.fill(0, s.outR, s.outR + rd);
      s.outR += rd;

      // ---- compact output ----
      if (s.outR > bufSize * 2) {
        const shift = s.outR;
        s.outBuf.copyWithin(0, shift, s.outW);
        s.outW -= shift;
        s.outR = 0;
        s.outBuf.fill(0, s.outW);
      }
    }

    for (let c = ch; c < outCh; c++)
      e.outputBuffer.getChannelData(c).fill(0);
  };

  return node;
}

function connectPitchShifter() {
  if (!audioCtx || !loopGain || !master) return;
  disconnectPitchShifter();
  const pf = 1.0 / clamp(currentRate, RATE_MIN, RATE_MAX);
  if (Math.abs(pf - 1.0) < 0.005) return; // No correction needed at 1× rate.
  try {
    pitchShifterNode = createPitchShifterNode(audioCtx, pf);
    loopGain.disconnect();
    loopGain.connect(pitchShifterNode);
    pitchShifterNode.connect(master);
  } catch {}
}

function disconnectPitchShifter() {
  if (pitchShifterNode) {
    try { pitchShifterNode.disconnect(); } catch {}
    pitchShifterNode = null;
  }
  // Restore direct connection.
  if (loopGain && master) {
    try { loopGain.disconnect(); } catch {}
    try { loopGain.connect(master); } catch {}
  }
}

function updatePitchShifter() {
  if (!preservePitch || !loopGain || !master) {
    if (pitchShifterNode) disconnectPitchShifter();
    return;
  }
  const pf = 1.0 / clamp(currentRate, RATE_MIN, RATE_MAX);
  if (Math.abs(pf - 1.0) < 0.005) {
    if (pitchShifterNode) disconnectPitchShifter();
    return;
  }
  if (pitchShifterNode) {
    pitchShifterNode._pitchFactor = pf;
  } else {
    connectPitchShifter();
  }
}

function togglePreservePitch(on) {
  preservePitch = !!on;
  try { localStorage.setItem('seamlessplayer-preserve-pitch', preservePitch ? '1' : '0'); } catch {}
  const btn = document.getElementById('preservePitchBtn');
  if (btn) btn.setAttribute('aria-pressed', preservePitch ? 'true' : 'false');
  updatePitchShifter();
}

function stopPlaylistPlayback() {
  playlistPlayToken++;
  playlistIsPlaying = false;
  playlistCurrentLoopRep = 0;
  playlistCurrentLoopRepTotal = 0;
  stopPlaylistCountdown();
  try { updateNowPlayingNameUI(); } catch {}
}

function getAllLoopChoices() {
  const choices = [];
  for (const p of builtinPresets) {
    if (!p || !p.path) continue;
    choices.push({ presetKey: `builtin:${p.path}`, label: getBuiltinPresetDisplayName(p, { includeSubfolder: true }) });
  }
  for (const p of userPresets) {
    if (!p) continue;
    if (p.blob && p.id) choices.push({ presetKey: `upload:${p.id}`, label: stripFileExt(p.name || 'Imported') });
    else if (p.url) choices.push({ presetKey: `url:${p.url}`, label: stripFileExt(p.name || p.url) });
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
    if (bufferCache.has(s)) {
      return { buffer: bufferCache.get(s), sourceLabel: preset.name || 'Imported', presetId: preset.id || null, presetRef: preset };
    }
    const ab = await preset.blob.arrayBuffer();
    const buf = await decodeArrayBuffer(ab);
    bufferCache.set(s, buf);
    return { buffer: buf, sourceLabel: preset.name || 'Imported', presetId: preset.id || null, presetRef: preset };
  }
  return null;
}

async function getPlaylistTotalDurationSec(record, rate = 1) {
  if (!record || !Array.isArray(record.items) || !record.items.length) return 0;
  const safeRate = Math.max(0.001, Number(rate) || 1);
  const segByKey = new Map();

  for (const it of record.items) {
    if (!it || !it.presetKey || segByKey.has(it.presetKey)) continue;
    try {
      const loaded = await loadBufferFromPresetKey(it.presetKey);
      if (!loaded || !loaded.buffer) { segByKey.set(it.presetKey, 0); continue; }
      let seg = 0;
      const ref = loaded.presetRef;
      if (ref && ref.trimIn != null && ref.trimOut != null) {
        seg = Math.max(0.02, ref.trimOut - ref.trimIn);
      } else {
        const pts = computeLoopPoints(loaded.buffer);
        seg = Math.max(0.02, (pts.end - pts.start) || 0);
      }
      segByKey.set(it.presetKey, seg);
    } catch {
      segByKey.set(it.presetKey, 0);
    }
  }

  let total = 0;
  for (const it of record.items) {
    if (!it || !it.presetKey) continue;
    const reps = Math.max(1, parseInt(it.reps, 10) || 1);
    total += ((segByKey.get(it.presetKey) || 0) * reps) / safeRate;
  }
  return total;
}

async function playActivePlaylist() {
  const pl = playerPlaylist;
  if (!pl || !Array.isArray(pl.items) || !pl.items.length) {
    setStatus('Playlist is empty.');
    stopPlaylistCountdown();
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
  playlistCurrentLoopRep = 0;
  playlistCurrentLoopRepTotal = 0;
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
    const cycleRate = clamp(currentRate, RATE_MIN, RATE_MAX);
    const cycleTotalSec = items.reduce((sum, it) => {
      if (!it || !it.presetKey) return sum;
      const reps = Math.max(1, parseInt(it.reps, 10) || 1);
      const seg = segByKey.get(it.presetKey) || 0;
      return sum + ((seg * reps) / Math.max(0.001, cycleRate));
    }, 0);
    if (audioCtx && cycleTotalSec > 0) {
      startPlaylistCountdown(audioCtx.currentTime + cycleTotalSec);
    }

    for (let idx = 0; idx < items.length; idx++) {
      const it = items[idx];
      if (playlistPlayToken !== token) return;
      if (!it || !it.presetKey) continue;

      const loaded = loadedByKey.get(it.presetKey);
      if (!loaded || !loaded.buffer) continue;

      const reps = Math.max(1, parseInt(it.reps, 10) || 1);
      const seg = segByKey.get(it.presetKey) || Math.max(0.02, loaded.buffer.duration || 0);
      const itemVol = clamp((it.volume !== undefined && it.volume !== null) ? it.volume : 1.0, 0, 1);

      currentBuffer = loaded.buffer;
      currentSourceLabel = it.label || loaded.sourceLabel || 'Playlist';
      currentPresetKey = it.presetKey || null;
      currentPresetId = loaded.presetId || null;
      currentPresetRef = loaded.presetRef || null;
      playlistCurrentLoopRep = 1;
      playlistCurrentLoopRepTotal = reps;
      try { updateNowPlayingNameUI(); } catch {}
      setStatus(`Playlist: ${currentSourceLabel} \u00d7${reps}`);

      const rateNow = clamp(currentRate, RATE_MIN, RATE_MAX);
      await startLoopFromBuffer(loaded.buffer, itemVol * 0.5, 0.03);

      // Wait for repetitions of the computed loop segment.
      const totalSec = Math.max(0.02, (seg * reps) / Math.max(0.001, rateNow));
      const repSec = Math.max(0.02, seg / Math.max(0.001, rateNow));
      const startAt = (audioCtx ? audioCtx.currentTime : 0);
      const endAt = (audioCtx ? audioCtx.currentTime : 0) + totalSec;
      while (audioCtx && audioCtx.currentTime < endAt) {
        if (playlistPlayToken !== token) return;
        const elapsed = Math.max(0, audioCtx.currentTime - startAt);
        const currentRep = Math.min(reps, Math.max(1, Math.floor(elapsed / repSec) + 1));
        if (currentRep !== playlistCurrentLoopRep) {
          playlistCurrentLoopRep = currentRep;
          try { updateNowPlayingNameUI(); } catch {}
        }
        const remaining = endAt - audioCtx.currentTime;
        await new Promise(r => setTimeout(r, Math.min(50, Math.max(0, remaining * 1000))));
      }
    }
  } while (playlistRepeat && playlistPlayToken === token);

  if (playlistPlayToken !== token) return;
  playlistIsPlaying = false;
  playlistCurrentLoopRep = 0;
  playlistCurrentLoopRepTotal = 0;
  stopPlaylistCountdown();
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
    analyser.smoothingTimeConstant = 0.86;
    try { master.connect(analyser); } catch {}
    audioOut = document.getElementById('audioOut');
    if (audioOut) audioOut.srcObject = mediaDest.stream;
  }
}

function isMobileDevice() {
  try {
    if ('ontouchstart' in window && navigator.maxTouchPoints > 0) {
      // Tablets / phones: screen width under a desktop threshold
      const w = screen.width || window.innerWidth;
      if (w < 1024) return true;
    }
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
  } catch {}
  return false;
}

function isLandscape() {
  try {
    if (window.matchMedia) return window.matchMedia('(orientation: landscape)').matches;
  } catch {}
  return window.innerWidth > window.innerHeight;
}

function updateLandscapeVizState() {
  // Landscape fullscreen viz only applies to mobile devices.
  if (!isMobileDevice()) {
    // Ensure landscape class is removed on desktop so the UI is never hidden.
    document.documentElement.classList.remove('landscape');
    try {
      const shell = document.querySelector('.app-shell');
      if (shell) shell.removeAttribute('aria-hidden');
    } catch {}
    return;
  }
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
    const binCount = vizFreqData.length;
    const nyquist = audioCtx ? (audioCtx.sampleRate / 2) : 22050;
    const minHz = 60;
    const maxHz = 18000;
    const hzPerBin = nyquist / Math.max(1, binCount);
    const startBin = Math.max(0, Math.min(binCount - 1, Math.floor(minHz / Math.max(1e-6, hzPerBin))));
    const endBin = Math.max(startBin + 1, Math.min(binCount - 1, Math.floor(maxHz / Math.max(1e-6, hzPerBin))));
    const usableBins = Math.max(1, endBin - startBin);

    const bars = Math.min(usableBins, Math.max(96, Math.min(220, Math.floor(w / 6))));
    const barW = w / Math.max(1, bars);
    const grad = vizCtx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, accent);
    grad.addColorStop(1, danger);
    vizCtx.fillStyle = grad;

    const maxBarH = h * 0.75;
    const bottomPad = 8;

    // Smoothed auto-gain so quieter material can still use most of the height.
    // Also reduces twitchiness by avoiding per-frame rescaling.
    let peak = 0;
    if (!vizBarScratch || vizBarScratch.length < bars) vizBarScratch = new Array(bars);
    if (!vizBarSmooth || vizBarSmooth.length < bars) vizBarSmooth = new Array(bars).fill(0);
    for (let i = 0; i < bars; i++) {
      const t = (bars <= 1) ? 0 : (i / (bars - 1));
      const idx = startBin + Math.floor(t * usableBins);
      const raw = (vizFreqData[Math.min(binCount - 1, idx)] || 0) / 255;
      vizBarScratch[i] = raw;
      if (raw > peak) peak = raw;
    }
    // Follow peaks slowly (less responsive), and clamp to sane bounds.
    vizAutoPeak = (vizAutoPeak * 0.985) + (peak * 0.015);
    vizAutoPeak = Math.max(0.06, Math.min(0.95, vizAutoPeak));
    const gain = Math.min(8, 1 / Math.max(0.08, vizAutoPeak));

    for (let i = 0; i < bars; i++) {
      let v = (vizBarScratch[i] || 0) * gain;
      v = Math.max(0, Math.min(1, v));
      // Softer curve (less twitchy) but still tall.
      v = Math.pow(v, 0.9);

      // Extra easing per bar for smooth visuals.
      const prev = vizBarSmooth[i] || 0;
      const eased = (prev * 0.88) + (v * 0.12);
      vizBarSmooth[i] = eased;
      v = eased;

      const bh = Math.max(2, v * maxBarH);
      const x = i * barW;
      const y = (h - bottomPad) - bh;

      vizCtx.globalAlpha = 0.35 + v * 0.65;
      vizCtx.fillRect(x + barW * 0.12, y, Math.max(1, barW * 0.76), bh);
    }
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

function startDesktopViz() {
  ensureAudio();
  if (!desktopVizCanvas) desktopVizCanvas = document.getElementById('desktopViz');
  if (desktopVizCanvas && !desktopVizCtx) desktopVizCtx = desktopVizCanvas.getContext('2d');
  if (!desktopVizCanvas || !desktopVizCtx || !analyser) return;
  if (desktopVizRafId) return;

  const freqBins = analyser.frequencyBinCount;
  const freqData = new Uint8Array(freqBins);

  const draw = () => {
    desktopVizRafId = requestAnimationFrame(draw);
    const cvs = desktopVizCanvas;
    const ctx = desktopVizCtx;
    if (!cvs || !ctx || !analyser) return;

    // Resize canvas to match its CSS layout size.
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, cvs.clientWidth);
    const h = Math.max(1, cvs.clientHeight);
    const pw = Math.floor(w * dpr);
    const ph = Math.floor(h * dpr);
    if (cvs.width !== pw) cvs.width = pw;
    if (cvs.height !== ph) cvs.height = ph;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    analyser.getByteFrequencyData(freqData);
    ctx.clearRect(0, 0, w, h);

    const rootStyles = getComputedStyle(document.documentElement);
    const accent = (rootStyles.getPropertyValue('--accent') || '').trim() || '#4a90e2';
    const danger = (rootStyles.getPropertyValue('--danger') || '').trim() || '#e24a6a';

    const binCount = freqData.length;
    const nyquist = audioCtx ? (audioCtx.sampleRate / 2) : 22050;
    const hzPerBin = nyquist / Math.max(1, binCount);
    const startBin = Math.max(0, Math.floor(60 / Math.max(1e-6, hzPerBin)));
    const endBin = Math.min(binCount - 1, Math.floor(18000 / Math.max(1e-6, hzPerBin)));
    const usableBins = Math.max(1, endBin - startBin);

    const bars = Math.min(usableBins, Math.max(64, Math.min(220, Math.floor(w / 5))));
    const barW = w / Math.max(1, bars);

    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, accent);
    grad.addColorStop(1, danger);
    ctx.fillStyle = grad;

    const maxBarH = h * 0.92;
    const bottomPad = 4;

    let peak = 0;
    if (desktopVizBarSmooth.length < bars) desktopVizBarSmooth = new Array(bars).fill(0);
    const scratch = new Array(bars);
    for (let i = 0; i < bars; i++) {
      const t = bars <= 1 ? 0 : i / (bars - 1);
      const idx = startBin + Math.floor(t * usableBins);
      const raw = (freqData[Math.min(binCount - 1, idx)] || 0) / 255;
      scratch[i] = raw;
      if (raw > peak) peak = raw;
    }
    desktopVizAutoPeak = (desktopVizAutoPeak * 0.985) + (peak * 0.015);
    desktopVizAutoPeak = Math.max(0.06, Math.min(0.95, desktopVizAutoPeak));
    const gain = Math.min(8, 1 / Math.max(0.08, desktopVizAutoPeak));

    for (let i = 0; i < bars; i++) {
      let v = Math.max(0, Math.min(1, (scratch[i] || 0) * gain));
      v = Math.pow(v, 0.9);
      const prev = desktopVizBarSmooth[i] || 0;
      const eased = (prev * 0.88) + (v * 0.12);
      desktopVizBarSmooth[i] = eased;
      v = eased;
      const bh = Math.max(2, v * maxBarH);
      const x = i * barW;
      const y = (h - bottomPad) - bh;
      ctx.globalAlpha = 0.35 + v * 0.65;
      ctx.fillRect(x + barW * 0.12, y, Math.max(1, barW * 0.76), bh);
    }
    ctx.globalAlpha = 1;
  };

  draw();
}

function stopDesktopViz() {
  if (desktopVizRafId) { cancelAnimationFrame(desktopVizRafId); desktopVizRafId = 0; }
  if (desktopVizCanvas && desktopVizCtx) {
    desktopVizCtx.clearRect(0, 0, desktopVizCanvas.width, desktopVizCanvas.height);
  }
  desktopVizBarSmooth = [];
  desktopVizAutoPeak = 0;
}

function toggleDesktopViz() {
  desktopVizActive = !desktopVizActive;
  const wrap = document.getElementById('desktopVizWrap');
  const btn = document.getElementById('desktopVizBtn');
  if (wrap) { wrap.classList.toggle('hidden', !desktopVizActive); wrap.setAttribute('aria-hidden', desktopVizActive ? 'false' : 'true'); }
  if (btn) btn.setAttribute('aria-pressed', desktopVizActive ? 'true' : 'false');
  if (desktopVizActive) startDesktopViz();
  else { stopDesktopViz(); exitDesktopVizFullscreen(); }
}

function toggleDesktopVizFullscreen() {
  const wrap = document.getElementById('desktopVizWrap');
  if (!wrap) return;
  const isFull = wrap.classList.contains('fullscreen');
  if (isFull) {
    exitDesktopVizFullscreen();
  } else {
    wrap.classList.add('fullscreen');
    // Try native Fullscreen API for true fullscreen.
    try {
      if (wrap.requestFullscreen) wrap.requestFullscreen();
      else if (wrap.webkitRequestFullscreen) wrap.webkitRequestFullscreen();
    } catch {}
  }
}

function exitDesktopVizFullscreen() {
  const wrap = document.getElementById('desktopVizWrap');
  if (wrap) wrap.classList.remove('fullscreen');
  try {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.webkitFullscreenElement) document.webkitExitFullscreen();
  } catch {}
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

  try { stopPadPlayback(0); } catch {}

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

  // Re-insert pitch shifter if preserve-pitch is active.
  try { updatePitchShifter(); } catch {}

  master.gain.cancelScheduledValues(audioCtx.currentTime);
  master.gain.setValueAtTime(master.gain.value, audioCtx.currentTime);
  master.gain.linearRampToValueAtTime(volumeVal, audioCtx.currentTime + rampIn);

  loopGain.gain.linearRampToValueAtTime(targetVolume, audioCtx.currentTime + rampIn);

  loopSource.start(audioCtx.currentTime);

  // Visual-only playhead.
  try { startWavePlayhead(buffer, start, end); } catch {}

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
  try { updateFavoritesUI(); } catch {}
  updateMediaSession('playing');
}

function switchTab(tab) {
  activeTab = tab;
  const pages = {
    player: document.getElementById('page-player'),
    playlists: document.getElementById('page-playlists'),
    'playlist-detail': document.getElementById('page-playlist-detail'),
    loops: document.getElementById('page-loops'),
    loopinfo: document.getElementById('page-loopinfo'),
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
  if (tab === 'trimmer' || tab === 'loopinfo') highlightTab = 'loops';
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
  try { updateFavoritesUI(); } catch {}
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
    li.className = 'playlist-empty';
    const div = document.createElement('div');
    div.className = 'hint';
    div.textContent = 'No playlists yet. Tap + New to create one.';
    li.appendChild(div);
    listEl.appendChild(li);
    try { renderPadSessionsList(); } catch {}
    try { renderDrumSessionsList(); } catch {}
    try { setTimeout(updateScrollState, 50); } catch {}
    return;
  }

  for (const pl of items) {
    const li = document.createElement('li');
    li.className = 'playlist-list-row';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'playlist-list-item';

    const mainSpan = document.createElement('span');
    mainSpan.className = 'pl-item-main';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'pl-item-name';
    nameSpan.textContent = (pl && pl.name) ? pl.name : 'Playlist';

    const durationSpan = document.createElement('span');
    durationSpan.className = 'pl-item-duration';
    durationSpan.textContent = 'Calculating…';

    const countSpan = document.createElement('span');
    countSpan.className = 'pl-item-count';
    const n = (pl && Array.isArray(pl.items)) ? pl.items.length : 0;
    countSpan.textContent = `${n} loop${n !== 1 ? 's' : ''}`;

    const chevron = document.createElement('span');
    chevron.className = 'pl-item-chevron';
    chevron.textContent = '›';

    mainSpan.appendChild(nameSpan);
    mainSpan.appendChild(durationSpan);
    btn.appendChild(mainSpan);
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

    getPlaylistTotalDurationSec(pl).then((totalSec) => {
      durationSpan.textContent = getPlaylistDisplayDurationText(totalSec);
    }).catch(() => {
      durationSpan.textContent = '—';
    });
  }
  try { renderPadSessionsList(); } catch {}
  try { renderDrumSessionsList(); } catch {}
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
  if (rec && rec.id && rec.name) updateFavoriteEntryLabel('playlist', rec.id, rec.name);

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

  try {
    requestAnimationFrame(() => {
      try { updateScrollState(); } catch {}
      try { setTimeout(updateScrollState, 50); } catch {}
    });
  } catch {
    try { updateScrollState(); } catch {}
  }
  try { updateDetailFavoriteButton(); } catch {}
}

function selectTextInputValue(input) {
  if (!input) return;
  try { if (typeof input.select === 'function') input.select(); } catch {}
  try {
    const len = String(input.value || '').length;
    if (typeof input.setSelectionRange === 'function') input.setSelectionRange(0, len);
  } catch {}
}

function focusAndSelectTextInput(input) {
  if (!input) return;
  try { input.focus(); } catch {}
  try { requestAnimationFrame(() => selectTextInputValue(input)); }
  catch { selectTextInputValue(input); }
}

function openDetailLoopRepsPrompt(choice) {
  if (!choice) return;
  pendingDetailLoopChoice = choice;
  const loopPickerOverlay = document.getElementById('loopPickerOverlay');
  const repsOverlay = document.getElementById('detailLoopRepsOverlay');
  const repsText = document.getElementById('detailLoopRepsText');
  const repsInput = document.getElementById('detailLoopRepsInput');
  if (repsText) repsText.textContent = `How many repetitions should ${stripFileExt(choice.label || 'this loop')} use?`;
  if (loopPickerOverlay) loopPickerOverlay.classList.add('hidden');
  if (repsOverlay) repsOverlay.classList.remove('hidden');
  if (repsInput) {
    repsInput.value = '1';
    focusAndSelectTextInput(repsInput);
  }
  try { updateScrollState(); } catch {}
}

function scrollPlaylistDetailEditorToBottom() {
  const itemsEl = document.getElementById('detailItems');
  if (!itemsEl) return;
  const addBtn = itemsEl.querySelector('.detail-add-btn');
  const rows = Array.from(itemsEl.querySelectorAll('.detail-loop-edit'));
  const target = addBtn || rows[rows.length - 1] || itemsEl;
  const perform = () => {
    try { target.scrollIntoView({ behavior: 'smooth', block: 'end' }); } catch {}
    try {
      const maxTop = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
      window.scrollTo({ top: maxTop, behavior: 'smooth' });
    } catch {}
  };
  try { requestAnimationFrame(() => setTimeout(perform, 50)); }
  catch { perform(); }
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
    nameEl.textContent = stripFileExt(it.label || 'Loop');
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
    const repsHead = document.createElement('div');
    repsHead.className = 'detail-ctrl-head';
    const repsLabel = document.createElement('div');
    repsLabel.className = 'detail-ctrl-label';
    repsLabel.textContent = 'Reps';
    const repsEditBtn = document.createElement('button');
    repsEditBtn.type = 'button';
    repsEditBtn.className = 'detail-ctrl-link';
    repsEditBtn.textContent = 'Edit';
    const repsInput = document.createElement('input');
    repsInput.className = 'detail-reps-input';
    repsInput.type = 'text';
    repsInput.inputMode = 'numeric';
    repsInput.setAttribute('pattern', '[0-9]*');
    repsInput.setAttribute('enterkeyhint', 'done');
    repsInput.value = String(Math.max(1, parseInt(it.reps, 10) || 1));
    repsInput.setAttribute('aria-label', 'Repetitions');
    const commitRepsInput = () => {
      const clean = String(repsInput.value || '').replace(/\D+/g, '');
      const nextVal = Math.max(1, parseInt(clean, 10) || 1);
      repsInput.value = String(nextVal);
      it.reps = nextVal;
      saveDetailSoon();
    };
    repsEditBtn.addEventListener('click', () => focusAndSelectTextInput(repsInput));
    repsInput.addEventListener('focus', () => selectTextInputValue(repsInput));
    repsInput.addEventListener('click', () => selectTextInputValue(repsInput));
    repsInput.addEventListener('input', () => {
      repsInput.value = String(repsInput.value || '').replace(/\D+/g, '');
    });
    repsInput.addEventListener('change', commitRepsInput);
    repsInput.addEventListener('blur', commitRepsInput);
    repsInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      commitRepsInput();
      try { repsInput.blur(); } catch {}
      e.preventDefault();
    });
    repsHead.appendChild(repsLabel);
    repsHead.appendChild(repsEditBtn);
    repsGroup.appendChild(repsHead);
    repsGroup.appendChild(repsInput);

    controls.appendChild(volGroup);
    controls.appendChild(repsGroup);

    row.appendChild(top);
    row.appendChild(controls);
    container.appendChild(row);

    // Drag-to-reorder (mouse only — touch scrolls the page)
    handle.addEventListener('pointerdown', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      if (e.button != null && e.button !== 0) return;
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

  if (pendingDetailNewItemId) {
    const newItemId = pendingDetailNewItemId;
    pendingDetailNewItemId = null;
    const newRow = Array.from(container.querySelectorAll('.detail-loop-edit'))
      .find(r => r && r.dataset && r.dataset.itemId === newItemId);
    const scrollTarget = addBtn || newRow || container;
    try {
      requestAnimationFrame(() => {
        try { scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'end' }); } catch {}
        try { scrollPlaylistDetailEditorToBottom(); } catch {}
      });
    } catch {}
  }

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
      openDetailLoopRepsPrompt(ch);
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
    trimFadeInSec = clamp(Number(preset.fadeIn) || 0, 0, Math.max(0, trimOut - trimIn - 0.001));
    trimFadeOutSec = clamp(Number(preset.fadeOut) || 0, 0, Math.max(0, trimOut - trimIn - trimFadeInSec - 0.001));
    trimCursorTime = clamp(trimIn, 0, Math.max(0, buf.duration || 0));
    trimZoomLevel = 1;
    trimViewStart = 0;
    trimDragging = null;
    const titleEl = document.getElementById('trimTitle');
    const infoEl = document.getElementById('trimInfo');
    const trimDisplayName = stripFileExt(preset.name || 'Trim Loop');
    if (titleEl) titleEl.textContent = trimDisplayName;
    if (infoEl) infoEl.textContent = `Duration ${buf.duration.toFixed(2)}s`;

    const zoomSlider = document.getElementById('trimZoom');
    if (zoomSlider) zoomSlider.value = '1';
    switchTab('trimmer');
    updateTrimReadouts();
    updateTrimHandlesUI();
    updateTrimCursorUI();
    setTimeout(drawTrimWaveform, 0);
    setStatus('Trimmer ready');
  } catch (e) {
    setStatus('Failed to open trimmer');
  }
}

function canOverwriteTrimPreset() {
  return !!(trimPreset && trimPreset.id && trimPreset.persisted && trimPreset.blob);
}

function clearPresetBufferCache(presetId) {
  if (!presetId) return;
  try { bufferCache.delete(`upload:${presetId}`); } catch {}
}

function refreshPresetReferenceAfterOverwrite(preset, { name, blob, trimIn, trimOut }) {
  if (!preset) return;
  preset.name = name;
  preset.blob = blob;
  preset.persisted = true;
  preset.trimIn = trimIn;
  preset.trimOut = trimOut;
  preset.fadeIn = trimFadeInSec;
  preset.fadeOut = trimFadeOutSec;
  if (currentPresetRef && preset === currentPresetRef) {
    currentSourceLabel = stripFileExt(name);
  }
}

function clampTrimFadeDurations() {
  const segmentDuration = Math.max(0, trimOut - trimIn);
  if (!isFinite(segmentDuration) || segmentDuration <= 0) {
    trimFadeInSec = 0;
    trimFadeOutSec = 0;
    return;
  }
  const maxTotal = Math.max(0, segmentDuration - 0.001);
  trimFadeInSec = clamp(Number(trimFadeInSec) || 0, 0, maxTotal);
  trimFadeOutSec = clamp(Number(trimFadeOutSec) || 0, 0, maxTotal);
  const total = trimFadeInSec + trimFadeOutSec;
  if (total > maxTotal) {
    const overflow = total - maxTotal;
    if (trimDragging === 'fadeIn') trimFadeInSec = Math.max(0, trimFadeInSec - overflow);
    else if (trimDragging === 'fadeOut') trimFadeOutSec = Math.max(0, trimFadeOutSec - overflow);
    else trimFadeOutSec = Math.max(0, trimFadeOutSec - overflow);
  }
}

function applyFadeEnvelopeToBuffer(buffer, fadeInSec = 0, fadeOutSec = 0) {
  if (!buffer) return buffer;
  const sampleRate = buffer.sampleRate || 44100;
  const fadeInSamples = Math.max(0, Math.floor((Number(fadeInSec) || 0) * sampleRate));
  const fadeOutSamples = Math.max(0, Math.floor((Number(fadeOutSec) || 0) * sampleRate));
  if (!fadeInSamples && !fadeOutSamples) return buffer;
  for (let channelIndex = 0; channelIndex < buffer.numberOfChannels; channelIndex++) {
    const channel = buffer.getChannelData(channelIndex);
    const length = channel.length;
    const safeFadeIn = Math.min(fadeInSamples, length);
    const safeFadeOut = Math.min(fadeOutSamples, length);
    for (let index = 0; index < safeFadeIn; index++) {
      const gain = safeFadeIn <= 1 ? 1 : (index / (safeFadeIn - 1));
      channel[index] *= gain;
    }
    for (let index = 0; index < safeFadeOut; index++) {
      const sampleIndex = length - safeFadeOut + index;
      if (sampleIndex < 0 || sampleIndex >= length) continue;
      const gain = safeFadeOut <= 1 ? 0 : (1 - (index / (safeFadeOut - 1)));
      channel[sampleIndex] *= gain;
    }
  }
  return buffer;
}

async function renderCurrentTrimmedAudio(applyFades = true) {
  const range = getCurrentTrimRange();
  if (!trimBuffer || !range) return null;
  const rendered = await renderTrimmedBufferOffline(trimBuffer, range.inSec, range.outSec);
  if (!applyFades) return { rendered, range };
  clampTrimFadeDurations();
  applyFadeEnvelopeToBuffer(rendered, trimFadeInSec, trimFadeOutSec);
  return { rendered, range };
}

function clearTrimAssignmentTargets() {
  trimPadTargetIndex = -1;
  trimDrumTargetIndex = -1;
}

function assignSavedLoopToPadTarget(saved, presetName) {
  if (!saved || !saved.id) return;
  const presetKey = `upload:${saved.id}`;
  const label = stripFileExt((saved.id && getUploadNameOverride(saved.id)) || presetName || saved.name || 'Audio');
  if (trimPadTargetIndex >= 0 && trimPadTargetIndex < PAD_COUNT) {
    const assignment = padAssignments[trimPadTargetIndex];
    if (assignment) {
      assignment.presetKey = presetKey;
      assignment.label = label;
      savePadAssignments();
      void warmPadAssignmentBuffer(assignment);
      renderPadGrid();
    }
  }
  if (trimDrumTargetIndex >= 0 && trimDrumTargetIndex < PAD_COUNT) {
    const assignment = drumAssignments[trimDrumTargetIndex];
    if (assignment) {
      assignment.presetKey = presetKey;
      assignment.label = label;
      saveDrumAssignments();
      void warmDrumAssignmentBuffer(assignment);
      renderDrumGrid();
    }
  }
}

function applyTrimmedSoundToPadTarget(preset) {
  const presetKey = preset.id ? `upload:${preset.id}` : '';
  if (!preset || !presetKey) return;
  const nextLabel = stripFileExt((preset.id && getUploadNameOverride(preset.id)) || preset.name || 'Audio');
  if (trimPadTargetIndex >= 0 && trimPadTargetIndex < PAD_COUNT) {
    const assignment = padAssignments[trimPadTargetIndex];
    if (assignment && assignment.presetKey === presetKey) {
      assignment.label = nextLabel;
      savePadAssignments();
      void warmPadAssignmentBuffer(assignment);
      renderPadGrid();
    }
  }
  if (trimDrumTargetIndex >= 0 && trimDrumTargetIndex < PAD_COUNT) {
    const assignment = drumAssignments[trimDrumTargetIndex];
    if (assignment && assignment.presetKey === presetKey) {
      assignment.label = nextLabel;
      saveDrumAssignments();
      void warmDrumAssignmentBuffer(assignment);
      renderDrumGrid();
    }
  }
}

async function overwriteTrimmedLoopOriginal() {
  if (!canOverwriteTrimPreset() || !trimBuffer) { setStatus('Nothing to overwrite'); return false; }
  const range = getCurrentTrimRange();
  if (!range) { setStatus('Trim is too short'); return false; }

  try {
    setStatus('Overwriting original loop…');
    const renderedResult = await renderCurrentTrimmedAudio(true);
    if (!renderedResult || !renderedResult.rendered) { setStatus('Trim is too short'); return false; }
    const rendered = renderedResult.rendered;
    const wavBlob = encodeWavBlobFromAudioBuffer(rendered);
    const record = await getPersistedUploadRecord(trimPreset.id);
    if (!record) {
      setStatus('Original loop not found');
      return false;
    }

    const nextRecord = {
      ...record,
      name: trimPreset.name || record.name || 'Audio',
      blob: wavBlob,
      trimIn: 0,
      trimOut: rendered.duration || range.segDur,
      fadeIn: trimFadeInSec,
      fadeOut: trimFadeOutSec,
      updatedAt: Date.now()
    };
    const saved = await putPersistedUploadRecord(nextRecord);
    if (!saved) {
      setStatus('Failed to overwrite original loop');
      return false;
    }

    refreshPresetReferenceAfterOverwrite(trimPreset, {
      name: saved.name,
      blob: wavBlob,
      trimIn: 0,
      trimOut: saved.trimOut != null ? saved.trimOut : (rendered.duration || range.segDur)
    });
    clearPresetBufferCache(saved.id);
    if (currentPresetRef && trimPreset === currentPresetRef) {
      currentBuffer = rendered;
      try { drawWaveform(); } catch {}
    }
    if (saved.id) setLoopCategory(saved.id, 'Edited');
    if (currentPresetId && saved.id && String(currentPresetId) === String(saved.id)) {
      currentPresetKey = `upload:${saved.id}`;
    }
    applyTrimmedSoundToPadTarget(trimPreset);
    try { renderLoopsPage(); } catch {}
    try { updateNowPlayingNameUI(); } catch {}
    stopTrimTest();
    switchTab('loops');
    setStatus('Original loop overwritten');
    return true;
  } catch {
    setStatus('Failed to overwrite original loop');
    return false;
  } finally {
    clearTrimAssignmentTargets();
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

function setTrimHandlePosition(el, pct, extraAttrs = {}) {
  if (!el) return;
  const boundedPct = clamp(Number(pct) || 0, 0, 100);
  el.style.left = `${boundedPct}%`;
  if (extraAttrs.min != null) el.setAttribute('aria-valuemin', extraAttrs.min);
  if (extraAttrs.max != null) el.setAttribute('aria-valuemax', extraAttrs.max);
  if (extraAttrs.now != null) el.setAttribute('aria-valuenow', extraAttrs.now);
  if (extraAttrs.text != null) el.setAttribute('aria-valuetext', extraAttrs.text);
}

function updateTrimHandlesUI(vStart = null, vEnd = null) {
  if (!trimBuffer) return;
  if (vStart == null || vEnd == null) {
    const span = getTrimViewSpan();
    vStart = span.start;
    vEnd = span.end;
  }
  const spanDur = Math.max(0.000001, vEnd - vStart);
  const trimDuration = Math.max(0, trimOut - trimIn);
  const inPct = ((trimIn - vStart) / spanDur) * 100;
  const outPct = ((trimOut - vStart) / spanDur) * 100;
  const fadeInPct = (((trimIn + trimFadeInSec) - vStart) / spanDur) * 100;
  const fadeOutPct = (((trimOut - trimFadeOutSec) - vStart) / spanDur) * 100;

  setTrimHandlePosition(document.getElementById('trimInHandle'), inPct, {
    min: '0',
    max: (trimBuffer.duration || 0).toFixed(3),
    now: trimIn.toFixed(3),
    text: `${trimIn.toFixed(3)}s`
  });
  setTrimHandlePosition(document.getElementById('trimOutHandle'), outPct, {
    min: '0',
    max: (trimBuffer.duration || 0).toFixed(3),
    now: trimOut.toFixed(3),
    text: `${trimOut.toFixed(3)}s`
  });
  setTrimHandlePosition(document.getElementById('trimFadeInHandle'), fadeInPct, {
    min: '0',
    max: trimDuration.toFixed(3),
    now: trimFadeInSec.toFixed(3),
    text: `${trimFadeInSec.toFixed(3)}s`
  });
  setTrimHandlePosition(document.getElementById('trimFadeOutHandle'), fadeOutPct, {
    min: '0',
    max: trimDuration.toFixed(3),
    now: trimFadeOutSec.toFixed(3),
    text: `${trimFadeOutSec.toFixed(3)}s`
  });
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
    if (!trimTestRepeats && elapsed >= loopLen) {
      trimCursorTime = trimOut;
      const endSpan = getTrimViewSpan();
      updateTrimCursorUI(endSpan.start, endSpan.end);
      stopTrimCursorFollow();
      return;
    }
    const pos = trimTestRepeats ? (elapsed % loopLen) : Math.min(elapsed, loopLen);
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
  const fadeInPx = Math.round((((trimIn + trimFadeInSec) - vStart) / (vEnd - vStart)) * w);
  const fadeOutPx = Math.round((((trimOut - trimFadeOutSec) - vStart) / (vEnd - vStart)) * w);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  if (inPx > 0) ctx.fillRect(0, 0, Math.min(w, inPx), h);
  if (outPx < w) ctx.fillRect(Math.max(0, outPx), 0, w - outPx, h);

  if (trimFadeInSec > 0 && fadeInPx > inPx) {
    ctx.fillStyle = 'rgba(74, 222, 128, 0.18)';
    ctx.beginPath();
    ctx.moveTo(inPx, h);
    ctx.lineTo(inPx, 0);
    ctx.lineTo(fadeInPx, h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(fadeInPx - 1, Math.floor(h * 0.58), 3, Math.ceil(h * 0.42));
  }

  if (trimFadeOutSec > 0 && fadeOutPx < outPx) {
    ctx.fillStyle = 'rgba(248, 113, 113, 0.18)';
    ctx.beginPath();
    ctx.moveTo(fadeOutPx, h);
    ctx.lineTo(outPx, 0);
    ctx.lineTo(outPx, h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f87171';
    ctx.fillRect(fadeOutPx - 1, Math.floor(h * 0.58), 3, Math.ceil(h * 0.42));
  }

  // IN cursor (green line)
  if (inPx >= 0 && inPx <= w) {
    ctx.fillStyle = '#4ade80';
    ctx.fillRect(inPx - 1, 0, 3, h);
  }

  // OUT cursor (red line)
  if (outPx >= 0 && outPx <= w) {
    ctx.fillStyle = '#f87171';
    ctx.fillRect(outPx - 1, 0, 3, h);
  }

  updateTrimHandlesUI(vStart, vEnd);
  updateTrimCursorUI(vStart, vEnd);
}

function updateTrimReadouts() {
  const inEl = document.getElementById('trimInTime');
  const outEl = document.getElementById('trimOutTime');
  const durEl = document.getElementById('trimDuration');
  const fadeInEl = document.getElementById('trimFadeInTime');
  const fadeOutEl = document.getElementById('trimFadeOutTime');
  if (inEl) inEl.textContent = `${trimIn.toFixed(3)}s`;
  if (outEl) outEl.textContent = `${trimOut.toFixed(3)}s`;
  if (durEl) durEl.textContent = `${Math.max(0, trimOut - trimIn).toFixed(3)}s`;
  if (fadeInEl) fadeInEl.textContent = `${trimFadeInSec.toFixed(3)}s`;
  if (fadeOutEl) fadeOutEl.textContent = `${trimFadeOutSec.toFixed(3)}s`;
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

  clampTrimFadeDurations();

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

  trimDragging = 'pan';
  trimDragStartX = e.clientX;
  trimPanStartView = trimViewStart;
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
  } else if (trimDragging === 'fadeIn') {
    trimFadeInSec = Math.max(0, Math.min(time - trimIn, (trimOut - trimIn) - trimFadeOutSec - 0.001));
  } else if (trimDragging === 'fadeOut') {
    trimFadeOutSec = Math.max(0, Math.min(trimOut - time, (trimOut - trimIn) - trimFadeInSec - 0.001));
  }
  clampTrimFadeDurations();
  updateTrimReadouts();
  drawTrimWaveform();
}

function handleTrimPointerUp(e) {
  if (!trimDragging) return;
  if (trimDragPointerId != null && e.pointerId !== trimDragPointerId && trimDragging !== 'pan') return;
  trimDragging = null;
  const dragEl = trimDragCaptureEl;
  trimDragPointerId = null;
  trimDragCaptureEl = null;
  const cvs = document.getElementById('trimCanvas');
  try {
    if (dragEl) dragEl.releasePointerCapture(e.pointerId);
    else if (cvs) cvs.releasePointerCapture(e.pointerId);
  } catch {}
}

function beginTrimHandleDrag(mode, e) {
  if (!trimBuffer) return;
  trimDragging = mode;
  trimDragPointerId = e.pointerId;
  trimDragCaptureEl = e.currentTarget;
  try { if (trimDragCaptureEl) trimDragCaptureEl.setPointerCapture(e.pointerId); } catch {}
  handleTrimPointerMove(e);
  e.stopPropagation();
  e.preventDefault();
}

function handleTrimInHandlePointerDown(e) {
  beginTrimHandleDrag('in', e);
}

function handleTrimOutHandlePointerDown(e) {
  beginTrimHandleDrag('out', e);
}

function handleTrimFadeInHandlePointerDown(e) {
  beginTrimHandleDrag('fadeIn', e);
}

function handleTrimFadeOutHandlePointerDown(e) {
  beginTrimHandleDrag('fadeOut', e);
}

function handleTrimCursorPointerDown(e) {
  if (!trimBuffer) return;
  stopTrimCursorFollow();
  trimCursorDragging = true;
  trimCursorPointerId = e.pointerId;
  const cursorEl = e.currentTarget;
  try { cursorEl.setPointerCapture(e.pointerId); } catch {}
  handleTrimCursorPointerMove(e);
  e.stopPropagation();
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
  try { if (e.currentTarget) e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
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
  ensureAudio();
  if (!trimBuffer || !audioCtx) return;
  stopTrimTest();
  if (audioCtx.state === 'suspended') { try { await audioCtx.resume(); } catch {} }
  startOutputIfNeeded();
  // Stop any main playback to avoid overlap.
  stopLoop(0, false);

  const renderedResult = await renderCurrentTrimmedAudio(true);
  if (!renderedResult || !renderedResult.rendered) return;
  const previewBuffer = renderedResult.rendered;

  trimTestSource = audioCtx.createBufferSource();
  trimTestSource.buffer = previewBuffer;
  trimTestSource.loop = trimTestRepeats;
  trimTestSource.loopStart = 0;
  trimTestSource.loopEnd = Math.max(0.001, previewBuffer.duration || 0.001);
  try { trimTestSource.playbackRate.setValueAtTime(1, audioCtx.currentTime); } catch {}

  trimTestGain = audioCtx.createGain();
  trimTestGain.gain.setValueAtTime(0, audioCtx.currentTime);
  trimTestGain.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.03);

  trimTestSource.connect(trimTestGain);
  trimTestGain.connect(master);

  master.gain.cancelScheduledValues(audioCtx.currentTime);
  master.gain.setValueAtTime(master.gain.value, audioCtx.currentTime);
  master.gain.linearRampToValueAtTime(volumeVal, audioCtx.currentTime + 0.03);

  if (!trimTestRepeats) {
    const sourceRef = trimTestSource;
    trimTestSource.addEventListener('ended', () => {
      if (trimTestSource !== sourceRef) return;
      trimCursorTime = trimOut;
      try { updateTrimCursorUI(); } catch {}
      stopTrimTest(0, true);
      setStatus('Trim preview stopped');
    }, { once: true });
  }

  trimTestSource.start(audioCtx.currentTime, 0);
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

function getDefaultTrimmedLoopName() {
  return withTrimmedSuffix(trimPreset && trimPreset.name, '(Trimmed)');
}

async function createTrimmedLoopAsWav(customName = '') {
  if (!trimPreset || !trimBuffer) { setStatus('Nothing to save'); return; }
  const range = getCurrentTrimRange();
  if (!range) { setStatus('Trim is too short'); return; }

  try {
    setStatus('Rendering trimmed loop…');
    const renderedResult = await renderCurrentTrimmedAudio(true);
    if (!renderedResult || !renderedResult.rendered) { setStatus('Trim is too short'); return; }
    const rendered = renderedResult.rendered;
    setStatus('Encoding WAV…');
    const wavBlob = encodeWavBlobFromAudioBuffer(rendered);

    const requestedName = String(customName || '').trim();
    const name = requestedName || getDefaultTrimmedLoopName();

    const saved = await savePersistedUpload({
      name,
      blob: wavBlob,
      trimIn: 0,
      trimOut: rendered.duration || range.segDur,
      fadeIn: trimFadeInSec,
      fadeOut: trimFadeOutSec
    });

    addUserPresetFromBlob({ name, blob: wavBlob, saved });
    if (saved && saved.id) setLoopCategory(saved.id, 'Edited');
    assignSavedLoopToPadTarget(saved, name);
    clearTrimAssignmentTargets();
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

async function createTrimmedLoopAsCompressed(customName = '') {
  if (!trimPreset || !trimBuffer) { setStatus('Nothing to save'); return; }
  const range = getCurrentTrimRange();
  if (!range) { setStatus('Trim is too short'); return; }

  try {
    setStatus('Rendering trimmed loop…');
    const renderedResult = await renderCurrentTrimmedAudio(true);
    if (!renderedResult || !renderedResult.rendered) { setStatus('Trim is too short'); return; }
    const rendered = renderedResult.rendered;

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
      const requestedName = String(customName || '').trim();
      const name = requestedName || withTrimmedSuffix(trimPreset.name, '(Trimmed WAV)');

      const saved = await savePersistedUpload({
        name,
        blob: wavBlob,
        trimIn: 0,
        trimOut: rendered.duration || range.segDur,
        fadeIn: trimFadeInSec,
        fadeOut: trimFadeOutSec
      });

      addUserPresetFromBlob({ name, blob: wavBlob, saved });
      if (saved && saved.id) setLoopCategory(saved.id, 'Edited');
      assignSavedLoopToPadTarget(saved, name);
      clearTrimAssignmentTargets();
      try { renderLoopsPage(); } catch {}
      stopTrimTest();
      switchTab('loops');
      setStatus('Trimmed loop created (WAV)');
      return;
    }

    const requestedName = String(customName || '').trim();
    const name = requestedName || withTrimmedSuffix(trimPreset.name, suffix);

    const saved = await savePersistedUpload({
      name,
      blob,
      trimIn: 0,
      trimOut: rendered.duration || range.segDur,
      fadeIn: trimFadeInSec,
      fadeOut: trimFadeOutSec
    });

    addUserPresetFromBlob({ name, blob, saved });
    if (saved && saved.id) setLoopCategory(saved.id, 'Edited');
    assignSavedLoopToPadTarget(saved, name);
    clearTrimAssignmentTargets();
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
    ov.setAttribute('aria-label', t('trim_save_title'));
    ov.innerHTML = `<div class="overlay-card">
      <h2 id="trimSaveOverlayTitle">${t('trim_save_title')}</h2>
      <p id="trimSaveOverlayHint" class="hint">${t('trim_save_hint')}</p>
      <p id="trimSaveOverlayNameHint" class="hint">${t('trim_save_name_hint')}</p>
      <input id="trimSaveName" class="text-input" type="text" placeholder="${t('trimmer_rename_placeholder')}" />
      <div class="picker-list" aria-label="${t('trim_save_title')}">
        <button id="trimSavePoints" type="button">${t('trim_save_overwrite_original')}</button>
        <button id="trimSaveWav" type="button">${t('trim_save_create_wav')}</button>
        <button id="trimSaveCompressed" type="button">${t('trim_save_create_compressed')}</button>
      </div>
      <div class="overlay-actions">
        <button id="trimSaveCancel" class="secondary" type="button">${t('common_cancel')}</button>
      </div>
    </div>`;
    document.body.appendChild(ov);

    const close = () => {
      ov.classList.add('hidden');
      try { updateScrollState(); } catch {}
    };
    const getSaveName = () => {
      const input = ov.querySelector('#trimSaveName');
      return input ? String(input.value || '').trim() : '';
    };

    ov.querySelector('#trimSaveCancel').addEventListener('click', close);
    ov.addEventListener('click', (e) => { if (e.target === ov) close(); });

    ov.querySelector('#trimSavePoints').addEventListener('click', async () => {
      if (!canOverwriteTrimPreset()) return;
      const confirmed = confirm(t('trim_save_overwrite_confirm'));
      if (!confirmed) return;
      close();
      await overwriteTrimmedLoopOriginal();
    });
    ov.querySelector('#trimSaveWav').addEventListener('click', async () => {
      const saveName = getSaveName();
      close();
      await createTrimmedLoopAsWav(saveName);
    });
    ov.querySelector('#trimSaveCompressed').addEventListener('click', async () => {
      const saveName = getSaveName();
      close();
      await createTrimmedLoopAsCompressed(saveName);
    });
  }
  applyTrimSaveOverlayTranslations(ov);
  const savePointsBtn = ov.querySelector('#trimSavePoints');
  if (savePointsBtn) savePointsBtn.classList.toggle('hidden', !canOverwriteTrimPreset());
  const saveNameInput = ov.querySelector('#trimSaveName');
  if (saveNameInput) {
    saveNameInput.value = getDefaultTrimmedLoopName();
    try { saveNameInput.focus(); saveNameInput.select(); } catch {}
  }
  ov.classList.remove('hidden');
  try { updateScrollState(); } catch {}
}

async function resetTrimPoints() {
  if (!trimBuffer) return;
  const pts = computeLoopPoints(trimBuffer);
  trimIn = pts.start;
  trimOut = pts.end;
  trimFadeInSec = 0;
  trimFadeOutSec = 0;
  updateTrimReadouts();
  drawTrimWaveform();
  // Also clear persisted trim.
  if (trimPreset) {
    delete trimPreset.trimIn;
    delete trimPreset.trimOut;
    delete trimPreset.fadeIn;
    delete trimPreset.fadeOut;
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
          delete rec.fadeIn;
          delete rec.fadeOut;
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
  const container = document.getElementById('loopsCategoryContainer');
  if (!container) return;
  container.innerHTML = '';

  if (!collapsedCategories.size) loadCollapsedCategoriesState();
  if (!collapsedLoopSubfoldersLoaded) loadCollapsedLoopSubfoldersState();

  const searchInput = document.getElementById('loopsSearch');
  const query = (searchInput && searchInput.value || '').trim().toLowerCase();

  const categories = getLoopCategories();
  const catAssignments = getLoopCatAssignments();

  // Build category → items map.
  const catMap = {};
  categories.forEach(c => { catMap[c] = []; });

  builtinPresets.forEach(p => {
    const cat = catAssignments[p.path] || p.category || 'Imported';
    if (!catMap[cat]) catMap[cat] = [];
    catMap[cat].push({ preset: p, isBuiltin: true });
  });

  userPresets.forEach(p => {
    const cat = (p.id && catAssignments[p.id]) || 'Imported';
    if (!catMap[cat]) catMap[cat] = [];
    catMap[cat].push({ preset: p, isBuiltin: false });
  });

  // Filter by search query.
  const filteredCatMap = {};
  for (const [cat, items] of Object.entries(catMap)) {
    if (!query) {
      filteredCatMap[cat] = items;
    } else {
      filteredCatMap[cat] = items.filter(({ preset, isBuiltin }) => {
        const raw = (!isBuiltin && preset.id && getUploadNameOverride(preset.id)) || preset.name || '';
        const name = (isBuiltin ? getBuiltinPresetDisplayName(preset, { includeSubfolder: true }) : stripFileExt(raw)).toLowerCase();
        const descKey = isBuiltin ? (preset.path || '') : (preset.id || '');
        const desc = getLoopDescription(descKey).toLowerCase();
        const localizedCat = getTranslatedLoopCategoryName(cat).toLowerCase();
        return name.includes(query) || desc.includes(query) || cat.toLowerCase().includes(query) || localizedCat.includes(query);
      });
    }
  }

  const infoIconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
  const trimIconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>';

  function buildLoopsList(listItems) {
    const ul = document.createElement('ul');
    ul.className = 'list';

    listItems.forEach(({ preset, isBuiltin }) => {
      const rawName = (!isBuiltin && preset.id && getUploadNameOverride(preset.id)) || preset.name || 'Audio';
      const displayName = isBuiltin ? getBuiltinPresetDisplayName(preset) : stripFileExt(rawName);

      const li = document.createElement('li');
      const row = document.createElement('div');
      row.className = 'preset-item' + (isBuiltin ? ' builtin-item' : '');
      if (!isBuiltin && preset.id) row.dataset.id = preset.id;

      const content = document.createElement('div');
      content.className = 'preset-content';

      const playBtn = document.createElement('button');
      playBtn.type = 'button';
      playBtn.className = 'preset-play' + (isBuiltin ? '' : ' user-preset-name');
      playBtn.textContent = displayName;
      playBtn.addEventListener('click', async () => {
        try {
          setStatus(`Loading ${displayName}…`);
          let buf = null;
          if (isBuiltin) {
            buf = await loadBufferFromUrl(preset.path);
          } else if (preset.blob) {
            const ab = await preset.blob.arrayBuffer();
            buf = await decodeArrayBuffer(ab);
          } else if (preset.url) {
            buf = await loadBufferFromUrl(preset.url);
          }
          if (!buf) { setStatus('Failed to decode.'); return; }
          clearPlayerPlaylistContext();
          currentBuffer = buf;
          currentSourceLabel = displayName;
          currentPresetKey = getLoopFavoriteKeyForPreset(preset, isBuiltin);
          currentPresetId = isBuiltin ? null : (preset.id || null);
          currentPresetRef = isBuiltin ? null : preset;
          await startLoopFromBuffer(buf, 0.5, 0.03);
          switchTab('player');
        } catch { setStatus(`Failed to load ${displayName}`); }
      });
      content.appendChild(playBtn);

      const infoBtn = document.createElement('button');
      infoBtn.type = 'button';
      infoBtn.className = 'preset-info';
      infoBtn.innerHTML = infoIconSvg;
      infoBtn.setAttribute('aria-label', `Info: ${displayName}`);
      infoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openLoopInfo(preset, isBuiltin);
      });
      content.appendChild(infoBtn);

      if (!isBuiltin && preset.blob) {
        const trimBtn = document.createElement('button');
        trimBtn.type = 'button';
        trimBtn.className = 'preset-trim';
        trimBtn.innerHTML = trimIconSvg;
        trimBtn.setAttribute('aria-label', `Trim ${displayName}`);
        trimBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          clearTrimAssignmentTargets();
          openTrimmer(preset);
        });
        content.appendChild(trimBtn);
      }

      row.appendChild(content);

      if (!isBuiltin) {
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'preset-delete';
        delBtn.textContent = 'Delete';
        delBtn.setAttribute('aria-label', `Delete ${displayName}`);
        delBtn.addEventListener('click', () => {
          try { delBtn.disabled = true; delBtn.textContent = 'Deleting…'; } catch {}
          deleteUserPresetNow(preset);
        });
        row.appendChild(delBtn);
        li.appendChild(row);
        ul.appendChild(li);
        attachSwipeHandlers(row);
      } else {
        li.appendChild(row);
        ul.appendChild(li);
      }
    });

    return ul;
  }

  const sortedCats = Object.keys(filteredCatMap).sort((a, b) => a.localeCompare(b));
  let anyVisible = false;

  for (const cat of sortedCats) {
    const items = filteredCatMap[cat];
    if (!items || !items.length) continue;
    anyVisible = true;

    const section = document.createElement('div');
    section.className = 'loops-category';
    const collapsed = query ? false : collapsedCategories.has(cat);
    if (collapsed) section.classList.add('collapsed');

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'loops-category-header';
    header.innerHTML = `<span class="loops-cat-chevron">${collapsed ? '▸' : '▾'}</span><span class="loops-cat-name">${getTranslatedLoopCategoryName(cat)}</span><span class="loops-cat-count">${items.length}</span>`;
    header.addEventListener('click', () => {
      if (collapsedCategories.has(cat)) collapsedCategories.delete(cat);
      else collapsedCategories.add(cat);
      saveCollapsedCategoriesState();
      renderLoopsPage();
    });
    section.appendChild(header);

    if (!collapsed) {
      const grouped = new Map();
      items.forEach((item) => {
        const subfolder = item.isBuiltin ? getBuiltinPresetSubfolder(item.preset) : '';
        if (!grouped.has(subfolder)) grouped.set(subfolder, []);
        grouped.get(subfolder).push(item);
      });

      const subfolders = Array.from(grouped.keys());
      const hasNestedSubfolders = subfolders.some(Boolean);

      if (!hasNestedSubfolders) {
        section.appendChild(buildLoopsList(items));
      } else {
        subfolders.sort((a, b) => {
          if (!a && !b) return 0;
          if (!a) return -1;
          if (!b) return 1;
          return a.localeCompare(b);
        }).forEach((subfolder) => {
          const subItems = grouped.get(subfolder) || [];
          if (!subItems.length) return;
          if (!subfolder) {
            section.appendChild(buildLoopsList(subItems));
            return;
          }

          const subSection = document.createElement('div');
          subSection.className = 'loops-subfolder';
          const collapseKey = getLoopSubfolderCollapseKey(cat, subfolder);
          const subCollapsed = query ? false : collapsedLoopSubfolders.has(collapseKey);
          if (subCollapsed) subSection.classList.add('collapsed');

          const subHeader = document.createElement('button');
          subHeader.type = 'button';
          subHeader.className = 'loops-subfolder-header';
          subHeader.setAttribute('aria-expanded', subCollapsed ? 'false' : 'true');
          subHeader.innerHTML = `<span class="loops-subfolder-chevron">${subCollapsed ? '▸' : '▾'}</span><span class="loops-subfolder-name">${subfolder}</span><span class="loops-subfolder-count">${subItems.length}</span>`;
          subHeader.addEventListener('click', () => {
            if (collapsedLoopSubfolders.has(collapseKey)) collapsedLoopSubfolders.delete(collapseKey);
            else collapsedLoopSubfolders.add(collapseKey);
            saveCollapsedLoopSubfoldersState();
            renderLoopsPage();
          });
          subSection.appendChild(subHeader);
          subSection.appendChild(buildLoopsList(subItems));
          section.appendChild(subSection);
        });
      }
    }

    container.appendChild(section);
  }

  if (!anyVisible && query) {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = t('loops_no_results');
    container.appendChild(empty);
  }

  setTimeout(updateScrollState, 50);
}

/* ================================================================
   Loop Info sub-page
   ================================================================ */

function openLoopInfo(preset, isBuiltin) {
  loopInfoPreset = preset;
  loopInfoIsBuiltin = isBuiltin;

  const rawName = (!isBuiltin && preset.id && getUploadNameOverride(preset.id)) || preset.name || 'Audio';
  const displayName = stripFileExt(rawName);
  const descKey = isBuiltin ? (preset.path || '') : (preset.id || '');
  const desc = getLoopDescription(descKey);
  const catAssignments = getLoopCatAssignments();
  const cat = isBuiltin
    ? (catAssignments[preset.path] || preset.category || 'Imported')
    : (preset.id ? (catAssignments[preset.id] || 'Imported') : 'Imported');

  const titleEl = document.getElementById('loopInfoTitle');
  if (titleEl) titleEl.textContent = displayName;

  // Description — read-only for built-ins, editable for user loops.
  const descText = document.getElementById('loopInfoDescText');
  const descInput = document.getElementById('loopInfoDescInput');
  if (isBuiltin) {
    if (descText) {
      descText.textContent = desc || '';
      descText.classList.toggle('hidden', !desc);
    }
    if (descInput) descInput.classList.add('hidden');
  } else {
    if (descText) descText.classList.add('hidden');
    if (descInput) {
      descInput.classList.remove('hidden');
      descInput.value = desc;
      descInput.placeholder = t('loopinfo_desc_placeholder');
      descInput.onblur = () => {
        setLoopDescription(descKey, descInput.value);
      };
    }
  }

  // Category select — hidden for built-ins, editable for user loops.
  const catRow = document.getElementById('loopInfoCatRow');
  const catSelect = document.getElementById('loopInfoCatSelect');
  if (isBuiltin) {
    if (catRow) catRow.classList.add('hidden');
  } else {
    if (catRow) catRow.classList.remove('hidden');
    if (catSelect) {
      catSelect.innerHTML = '';
      const cats = getLoopCategories();
      cats.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = getTranslatedLoopCategoryName(c);
        if (c === cat) opt.selected = true;
        catSelect.appendChild(opt);
      });
      // + New Category option
      const newOpt = document.createElement('option');
      newOpt.value = '__new__';
      newOpt.textContent = t('loops_new_category');
      catSelect.appendChild(newOpt);

      catSelect.onchange = () => {
        const key = isBuiltin ? preset.path : preset.id;
        if (catSelect.value === '__new__') {
          const name = prompt(t('loops_new_category').replace('+', '').trim() + ':');
          if (!name || !name.trim()) { catSelect.value = cat; return; }
          addLoopCategory(name.trim());
          setLoopCategory(key, name.trim());
          openLoopInfo(preset, isBuiltin);
        } else {
          setLoopCategory(key, catSelect.value);
        }
      };
    }
  }

  // File size & type
  const sizeEl = document.getElementById('loopInfoSize');
  const typeEl = document.getElementById('loopInfoType');
  let size = '—';
  let type = '—';
  if (!isBuiltin && preset.blob) {
    size = formatBytes(preset.blob.size || 0);
    type = preset.blob.type || 'unknown';
  } else if (isBuiltin) {
    type = 'audio/mpeg';
  }
  if (sizeEl) sizeEl.textContent = size;
  if (typeEl) typeEl.textContent = type;

  try { updateLoopInfoFavoriteButton(); } catch {}

  switchTab('loopinfo');
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
    stopWavePlayhead();
    try { updateNowPlayingNameUI(); } catch {}
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
    stopWavePlayhead();
    try { updateNowPlayingNameUI(); } catch {}
    // If this is a looping source, turning off looping avoids an audible wrap.
    try { sourceToStop.loop = false; } catch {}
    try { if (pitchShifterNode) { try { pitchShifterNode.disconnect(); } catch {} pitchShifterNode = null; } } catch {}
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
    stopWavePlayhead();
    try { updateNowPlayingNameUI(); } catch {}
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
    try { stopPlaylistPlayback(); } catch {}
    try { stopLoop(0.03); } catch {}

    setStatus('Exporting…');
    const playlists = await listPlaylistRecords().catch(() => []);
    const uploads = await listPersistedUploads().catch(() => []);
    const overrides = (() => {
      try { return getUploadNameOverrides() || {}; } catch { return {}; }
    })();

    const uploadMeta = (uploads || []).map(u => {
      const overrideName = getUploadNameOverride(u && u.id);
      const id = u && u.id;
      const filePath = id ? `uploads/${String(id)}` : '';
      return ({
        id,
        name: overrideName || (u && u.name) || 'Audio',
        createdAt: u && u.createdAt,
        trimIn: (u && u.trimIn != null) ? u.trimIn : undefined,
        trimOut: (u && u.trimOut != null) ? u.trimOut : undefined,
        file: filePath,
        type: (u && u.blob && u.blob.type) ? u.blob.type : undefined,
        size: (u && u.blob && u.blob.size) ? u.blob.size : undefined,
      });
    });

    const exportedPadAssignments = (() => {
      try { return padAssignments.map(a => serializePadAssignment(a)); } catch { return []; }
    })();
    const exportedPadSessions = (() => {
      try {
        return loadPadSessions().map(session => ({
          id: session && session.id ? session.id : Date.now().toString(36),
          name: session && session.name ? session.name : 'Session',
          createdAt: session && session.createdAt ? session.createdAt : Date.now(),
          assignments: Array.isArray(session && session.assignments)
            ? session.assignments.map(a => serializePadAssignment(a))
            : []
        }));
      } catch {
        return [];
      }
    })();
    const exportedDrumAssignments = (() => {
      try { return drumAssignments.map(a => serializeDrumAssignment(a)); } catch { return []; }
    })();
    const exportedDrumSessions = (() => {
      try {
        return loadDrumSessions().map(session => ({
          id: session && session.id ? session.id : Date.now().toString(36),
          name: session && session.name ? session.name : 'Session',
          createdAt: session && session.createdAt ? session.createdAt : Date.now(),
          assignments: Array.isArray(session && session.assignments)
            ? session.assignments.map(a => serializeDrumAssignment(a))
            : []
        }));
      } catch {
        return [];
      }
    })();

    const data = {
      app: 'seamlessplayer',
      version: 2,
      exportedAt: new Date().toISOString(),
      playlists: playlists || [],
      uploads: uploadMeta,
      uploadNameOverrides: overrides,
      loopCategories: (() => { try { return JSON.parse(localStorage.getItem(LOOP_CATEGORIES_KEY)) || []; } catch { return []; } })(),
      loopDescriptions: (() => { try { return JSON.parse(localStorage.getItem(LOOP_DESCRIPTIONS_KEY)) || {}; } catch { return {}; } })(),
      loopCatAssignments: (() => { try { return JSON.parse(localStorage.getItem(LOOP_CAT_ASSIGNMENTS_KEY)) || {}; } catch { return {}; } })(),
      padAssignments: exportedPadAssignments,
      padSessions: exportedPadSessions,
      drumAssignments: exportedDrumAssignments,
      drumSessions: exportedDrumSessions,
    };

    const JSZipRef = (typeof window !== 'undefined') ? window.JSZip : null;
    if (JSZipRef) {
      const zip = new JSZipRef();
      zip.file('backup.json', JSON.stringify(data, null, 2));

      const folder = zip.folder('uploads');
      for (const u of (uploads || [])) {
        if (!u || !u.id || !u.blob) continue;
        // Store blobs with stable IDs so playlists keep working.
        try { folder.file(String(u.id), u.blob); } catch {}
      }

      setStatus('Building ZIP…');
      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `seamlessplayer-backup-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
      setStatus('Export complete');
      return;
    }

    // Fallback: JSON-only export (metadata only).
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seamlessplayer-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
    setStatus('Export complete (JSON)');
  } catch (e) {
    setStatus('Export failed');
  }
}

async function importZipBackup(file) {
  if (!file) return;
  const JSZipRef = (typeof window !== 'undefined') ? window.JSZip : null;
  if (!JSZipRef) { setStatus('ZIP import not available'); return; }

  try { stopPlaylistPlayback(); } catch {}
  try { stopLoop(0.03); } catch {}
  try { stopDrumPlayback(true); } catch {}

  setStatus('Importing ZIP…');
  const ab = await file.arrayBuffer();
  const zip = await JSZipRef.loadAsync(ab);
  const backupFile = zip.file('backup.json');
  if (!backupFile) { setStatus('Invalid backup: missing backup.json'); return; }

  const jsonText = await backupFile.async('string');
  const data = JSON.parse(jsonText);
  if (!data || data.app !== 'seamlessplayer') { setStatus('Invalid backup file'); return; }

  // Restore upload name overrides (safe even if uploads are missing).
  try {
    if (data.uploadNameOverrides && typeof data.uploadNameOverrides === 'object') {
      localStorage.setItem(UPLOAD_NAME_OVERRIDES_KEY, JSON.stringify(data.uploadNameOverrides));
    }
  } catch {}

  // Restore loop archive metadata.
  try {
    if (data.loopCategories && Array.isArray(data.loopCategories)) {
      localStorage.setItem(LOOP_CATEGORIES_KEY, JSON.stringify(data.loopCategories));
    }
  } catch {}
  try {
    if (data.loopDescriptions && typeof data.loopDescriptions === 'object') {
      localStorage.setItem(LOOP_DESCRIPTIONS_KEY, JSON.stringify(data.loopDescriptions));
    }
  } catch {}
  try {
    if (data.loopCatAssignments && typeof data.loopCatAssignments === 'object') {
      localStorage.setItem(LOOP_CAT_ASSIGNMENTS_KEY, JSON.stringify(data.loopCatAssignments));
    }
  } catch {}
  try {
    if (Array.isArray(data.padAssignments)) {
      const serialized = Array.from({ length: PAD_COUNT }, (_, index) => serializePadAssignment(data.padAssignments[index]));
      localStorage.setItem(PADS_ASSIGNMENTS_KEY, JSON.stringify(serialized));
      padAssignments = Array.from({ length: PAD_COUNT }, (_, index) => normalizePadAssignment(data.padAssignments[index]));
      warmAssignedPadBuffers();
    }
  } catch {}
  try {
    if (Array.isArray(data.padSessions)) {
      const sessions = data.padSessions.map((session, sessionIndex) => ({
        id: session && session.id ? session.id : `imported-${Date.now().toString(36)}-${sessionIndex}`,
        name: session && session.name ? session.name : `Session ${sessionIndex + 1}`,
        createdAt: session && session.createdAt ? session.createdAt : Date.now(),
        assignments: Array.from({ length: PAD_COUNT }, (_, index) => serializePadAssignment(session && Array.isArray(session.assignments) ? session.assignments[index] : null))
      }));
      savePadSessions(sessions);
    }
  } catch {}
  try {
    if (Array.isArray(data.drumAssignments)) {
      const serialized = Array.from({ length: PAD_COUNT }, (_, index) => serializeDrumAssignment(data.drumAssignments[index]));
      localStorage.setItem(DRUM_ASSIGNMENTS_KEY, JSON.stringify(serialized));
      drumAssignments = Array.from({ length: PAD_COUNT }, (_, index) => normalizeDrumAssignment(data.drumAssignments[index]));
      warmAssignedDrumBuffers();
    }
  } catch {}
  try {
    if (Array.isArray(data.drumSessions)) {
      const sessions = data.drumSessions.map((session, sessionIndex) => ({
        id: session && session.id ? session.id : `imported-drum-${Date.now().toString(36)}-${sessionIndex}`,
        name: session && session.name ? session.name : `Session ${sessionIndex + 1}`,
        createdAt: session && session.createdAt ? session.createdAt : Date.now(),
        assignments: Array.from({ length: PAD_COUNT }, (_, index) => serializeDrumAssignment(session && Array.isArray(session.assignments) ? session.assignments[index] : null))
      }));
      saveDrumSessions(sessions);
    }
  } catch {}

  // Import playlists.
  if (Array.isArray(data.playlists)) {
    for (const pl of data.playlists) {
      if (!pl || !pl.id) continue;
      await savePlaylistRecord(pl).catch(() => {});
    }
  }

  // Import uploads (blob + trim metadata) preserving IDs.
  if (Array.isArray(data.uploads)) {
    let imported = 0;
    for (const meta of data.uploads) {
      if (!meta || !meta.id) continue;
      const id = String(meta.id);
      const path = String(meta.file || `uploads/${id}`);

      const entry = zip.file(path) || zip.file(`uploads/${id}`);
      if (!entry) continue;

      try {
        let blob = await entry.async('blob');
        // JSZip blobs often come back with empty/unknown MIME type; restore if we have it.
        try {
          const mt = (meta && meta.type) ? String(meta.type) : '';
          if (mt && (!blob.type || blob.type === 'application/octet-stream') && blob.size) {
            blob = blob.slice(0, blob.size, mt);
          }
        } catch {}
        await putPersistedUploadRecord({
          id,
          name: meta.name || 'Audio',
          blob,
          createdAt: meta.createdAt || Date.now(),
          trimIn: meta.trimIn != null ? meta.trimIn : undefined,
          trimOut: meta.trimOut != null ? meta.trimOut : undefined,
        });
        imported++;
        if (imported % 3 === 0) setStatus(`Importing… (${imported})`);
      } catch {}
    }
  }

  // Sync in-memory presets with persisted uploads.
  try {
    const items = await listPersistedUploads();
    if (Array.isArray(items)) {
      const byId = new Map();
      userPresets.forEach(p => { if (p && p.id) byId.set(String(p.id), p); });

      // Add/update upload presets.
      for (const it of items) {
        if (!it || !it.id || !it.blob) continue;
        const id = String(it.id);
        const overrideName = getUploadNameOverride(id);
        const name = overrideName || it.name || 'Audio';

        const existing = byId.get(id);
        if (existing) {
          existing.blob = it.blob;
          existing.persisted = true;
          existing.createdAt = it.createdAt || existing.createdAt || 0;
          existing.name = name;
          if (it.trimIn != null) existing.trimIn = it.trimIn; else delete existing.trimIn;
          if (it.trimOut != null) existing.trimOut = it.trimOut; else delete existing.trimOut;
        } else {
          const preset = { id: it.id, name, blob: it.blob, persisted: true, createdAt: it.createdAt || 0 };
          if (it.trimIn != null) preset.trimIn = it.trimIn;
          if (it.trimOut != null) preset.trimOut = it.trimOut;
          userPresets.unshift(preset);
        }
      }
    }
  } catch {}

  setStatus('Import complete');
  if (activeTab === 'playlists') renderPlaylistsPage();
  if (activeTab === 'loops') renderLoopsPage();
  try { renderPadGrid(); } catch {}
  try { renderDrumGrid(); } catch {}
  try { renderPadSessionsList(); } catch {}
  try { renderDrumSessionsList(); } catch {}
}

async function importAppData(file) {
  if (!file) return;
  try {
    const isZip = (() => {
      try {
        const n = (file && file.name) ? String(file.name).toLowerCase() : '';
        if (n.endsWith('.zip')) return true;
        const t = (file && file.type) ? String(file.type).toLowerCase() : '';
        return t.includes('zip');
      } catch {
        return false;
      }
    })();
    if (isZip) {
      await importZipBackup(file);
      return;
    }

    setStatus('Importing…');
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data || data.app !== 'seamlessplayer') { setStatus('Invalid backup file'); return; }

    // Restore upload name overrides if present.
    try {
      if (data.uploadNameOverrides && typeof data.uploadNameOverrides === 'object') {
        localStorage.setItem(UPLOAD_NAME_OVERRIDES_KEY, JSON.stringify(data.uploadNameOverrides));
      }
    } catch {}

    // Restore loop archive metadata if present.
    try {
      if (data.loopCategories && Array.isArray(data.loopCategories)) {
        localStorage.setItem(LOOP_CATEGORIES_KEY, JSON.stringify(data.loopCategories));
      }
    } catch {}
    try {
      if (data.loopDescriptions && typeof data.loopDescriptions === 'object') {
        localStorage.setItem(LOOP_DESCRIPTIONS_KEY, JSON.stringify(data.loopDescriptions));
      }
    } catch {}
    try {
      if (data.loopCatAssignments && typeof data.loopCatAssignments === 'object') {
        localStorage.setItem(LOOP_CAT_ASSIGNMENTS_KEY, JSON.stringify(data.loopCatAssignments));
      }
    } catch {}
    try {
      if (Array.isArray(data.padAssignments)) {
        const serialized = Array.from({ length: PAD_COUNT }, (_, index) => serializePadAssignment(data.padAssignments[index]));
        localStorage.setItem(PADS_ASSIGNMENTS_KEY, JSON.stringify(serialized));
        padAssignments = Array.from({ length: PAD_COUNT }, (_, index) => normalizePadAssignment(data.padAssignments[index]));
        warmAssignedPadBuffers();
      }
    } catch {}
    try {
      if (Array.isArray(data.padSessions)) {
        const sessions = data.padSessions.map((session, sessionIndex) => ({
          id: session && session.id ? session.id : `imported-${Date.now().toString(36)}-${sessionIndex}`,
          name: session && session.name ? session.name : `Session ${sessionIndex + 1}`,
          createdAt: session && session.createdAt ? session.createdAt : Date.now(),
          assignments: Array.from({ length: PAD_COUNT }, (_, index) => serializePadAssignment(session && Array.isArray(session.assignments) ? session.assignments[index] : null))
        }));
        savePadSessions(sessions);
      }
    } catch {}
    try {
      if (Array.isArray(data.drumAssignments)) {
        const serialized = Array.from({ length: PAD_COUNT }, (_, index) => serializeDrumAssignment(data.drumAssignments[index]));
        localStorage.setItem(DRUM_ASSIGNMENTS_KEY, JSON.stringify(serialized));
        drumAssignments = Array.from({ length: PAD_COUNT }, (_, index) => normalizeDrumAssignment(data.drumAssignments[index]));
        warmAssignedDrumBuffers();
      }
    } catch {}
    try {
      if (Array.isArray(data.drumSessions)) {
        const sessions = data.drumSessions.map((session, sessionIndex) => ({
          id: session && session.id ? session.id : `imported-drum-${Date.now().toString(36)}-${sessionIndex}`,
          name: session && session.name ? session.name : `Session ${sessionIndex + 1}`,
          createdAt: session && session.createdAt ? session.createdAt : Date.now(),
          assignments: Array.from({ length: PAD_COUNT }, (_, index) => serializeDrumAssignment(session && Array.isArray(session.assignments) ? session.assignments[index] : null))
        }));
        saveDrumSessions(sessions);
      }
    } catch {}

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
    // Refresh userPresets trim/name data from imported metadata.
    if (Array.isArray(data.uploads)) {
      for (const meta of data.uploads) {
        if (!meta || !meta.id) continue;
        const mid = String(meta.id);
        const preset = userPresets.find(p => p && p.id != null && String(p.id) === mid);
        if (preset) {
          if (meta.trimIn != null) preset.trimIn = meta.trimIn;
          if (meta.trimOut != null) preset.trimOut = meta.trimOut;
          const overrideName = getUploadNameOverride(mid);
          if (overrideName) preset.name = overrideName;
        }
      }
    }
    setStatus('Import complete');
    if (activeTab === 'playlists') renderPlaylistsPage();
    if (activeTab === 'loops') renderLoopsPage();
    try { renderPadGrid(); } catch {}
    try { renderDrumGrid(); } catch {}
    try { renderPadSessionsList(); } catch {}
    try { renderDrumSessionsList(); } catch {}
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
  refreshPadColorPalette(theme);
  renderPadGrid();
  refreshDrumColorPalette(theme);
  renderDrumGrid();
}

function loadSavedTheme() {
  try {
    const saved = localStorage.getItem('seamlessplayer-theme');
    if (saved === 'light' || saved === 'dark') applyTheme(saved);
  } catch {}
}

function showHelpOverlay() {
  let ov = document.getElementById('helpOverlay');
  if (!ov) {
    ov = document.createElement('div');
    ov.id = 'helpOverlay';
    ov.className = 'overlay hidden';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    document.body.appendChild(ov);
  }

  const sections = getHelpSections();
  const indexMarkup = sections
    .map((section, index) => `<button type="button" class="help-index-link" data-help-target="${section.id}"><span>${String(index + 1).padStart(2, '0')}</span>${section.title}</button>`)
    .join('');
  const sectionsMarkup = sections.map((section, index) => renderHelpSection(section, index)).join('');

  ov.setAttribute('aria-label', t('help_title'));
  ov.innerHTML = `<div class="overlay-card help-overlay-card">
    <div class="help-scroll">
      <div class="help-hero">
        <div class="help-hero-copy">
          <p class="help-kicker">${t('help_intro_kicker')}</p>
          <h2>${t('help_title')}</h2>
          <p class="help-hero-text">${t('help_intro_p')}</p>
        </div>
        <div class="help-meta" aria-label="${t('help_title')}">
          <div class="help-meta-item">
            <span class="help-meta-label">${t('help_meta_playback_label')}</span>
            <strong>${t('help_meta_playback_value')}</strong>
          </div>
          <div class="help-meta-item">
            <span class="help-meta-label">${t('help_meta_storage_label')}</span>
            <strong>${t('help_meta_storage_value')}</strong>
          </div>
          <div class="help-meta-item">
            <span class="help-meta-label">${t('help_meta_mobile_label')}</span>
            <strong>${t('help_meta_mobile_value')}</strong>
          </div>
        </div>
      </div>
      <div class="help-layout">
        <nav class="help-index" aria-label="${t('help_index_title')}">
          <p class="help-index-title">${t('help_index_title')}</p>
          ${indexMarkup}
        </nav>
        <div class="help-body">
          ${sectionsMarkup}
        </div>
      </div>
      <div class="overlay-actions help-actions">
        <p class="help-actions-note">${t('help_actions_note')}</p>
        <button id="closeHelp" class="secondary">${t('help_close')}</button>
      </div>
    </div>
  </div>`;

  const closeHelp = () => {
    ov.classList.add('hidden');
    try { updateScrollState(); } catch {}
  };

  ov.onclick = (event) => {
    if (event.target === ov) closeHelp();
  };
  const card = ov.querySelector('.help-overlay-card');
  card.onclick = (event) => event.stopPropagation();
  const closeButton = ov.querySelector('#closeHelp');
  closeButton.onclick = closeHelp;
  ov.querySelectorAll('[data-help-target]').forEach((button) => {
    button.onclick = () => {
      const section = ov.querySelector(`#help-section-${button.getAttribute('data-help-target')}`);
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  });

  ov.classList.remove('hidden');
  try { closeButton.focus({ preventScroll: true }); } catch {}
  try { updateScrollState(); } catch {}
}

/* ================================================================
   PADS SYSTEM — real-time loop triggering
   ================================================================ */
const PADS_ASSIGNMENTS_KEY = 'seamlessplayer-pads-assignments';
const PADS_SESSIONS_KEY = 'seamlessplayer-pads-sessions';
const DRUM_ASSIGNMENTS_KEY = 'seamlessplayer-drum-assignments';
const DRUM_SESSIONS_KEY = 'seamlessplayer-drum-sessions';
const LOOP_TRIGGER_COLLAPSED_KEY = 'seamlessplayer-loop-trigger-collapsed';
const DRUM_MACHINE_COLLAPSED_KEY = 'seamlessplayer-drum-machine-collapsed';
const PAD_COUNT = 9;
const DRUM_VOICE_LIMIT = 32;
const PAD_COLOR_KEYS = Object.freeze(['blue', 'red', 'green', 'yellow', 'purple', 'orange', 'cyan', 'pink', 'silver']);
const PAD_COLOR_DEFAULT_KEY = 'blue';
const PAD_DARK_COLOR_PALETTE = Object.freeze({
  blue: '#2c5aa0',
  red: '#8b2e2e',
  green: '#3f7f4f',
  yellow: '#9a7b1f',
  purple: '#6f4b8b',
  orange: '#a85f24',
  cyan: '#2a7c88',
  pink: '#9a4f72',
  silver: '#5f636b'
});
const PAD_LIGHT_COLOR_PALETTE = Object.freeze({
  blue: '#a9c8ff',
  red: '#f6b0b0',
  green: '#bfe3c2',
  yellow: '#f5e7a3',
  purple: '#dcc2f2',
  orange: '#f4c59d',
  cyan: '#b6e7ee',
  pink: '#efbfd3',
  silver: '#d6d9df'
});
const PAD_LEGACY_COLOR_KEY_MAP = Object.freeze({
  '#5b8def': 'blue',
  '#d94f4f': 'red',
  '#9be2a8': 'green',
  '#f5c542': 'yellow',
  '#c774e8': 'purple',
  '#ff8c42': 'orange',
  '#42d4f5': 'cyan',
  '#f57dba': 'pink',
  '#bbb': 'silver',
  '#bbbbbb': 'silver',
  '#2c5aa0': 'blue',
  '#8b2e2e': 'red',
  '#3f7f4f': 'green',
  '#9a7b1f': 'yellow',
  '#6f4b8b': 'purple',
  '#a85f24': 'orange',
  '#2a7c88': 'cyan',
  '#9a4f72': 'pink',
  '#5f636b': 'silver',
  '#a9c8ff': 'blue',
  '#f6b0b0': 'red',
  '#bfe3c2': 'green',
  '#f5e7a3': 'yellow',
  '#dcc2f2': 'purple',
  '#f4c59d': 'orange',
  '#b6e7ee': 'cyan',
  '#efbfd3': 'pink',
  '#d6d9df': 'silver'
});
const padPickerCollapsedCategories = new Set();
let padPickerLastOpenCategory = '';
const padPickerCollapsedSubfolders = new Set();
let padPickerCollapsedSubfoldersLoaded = false;
const drumPickerCollapsedCategories = new Set();
let drumPickerLastOpenCategory = '';
const drumPickerCollapsedSubfolders = new Set();
let drumPickerCollapsedSubfoldersLoaded = false;

function loadPickerCollapsedSubfolders(storageKey, targetSet) {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = JSON.parse(raw || '[]');
    targetSet.clear();
    if (Array.isArray(parsed)) parsed.forEach(value => targetSet.add(String(value || '')));
  } catch {
    targetSet.clear();
  }
}

function savePickerCollapsedSubfolders(storageKey, sourceSet) {
  try { localStorage.setItem(storageKey, JSON.stringify([...sourceSet])); } catch {}
}

let padAssignments = new Array(PAD_COUNT).fill(null);
let drumAssignments = new Array(PAD_COUNT).fill(null);
// Each assignment: { presetKey, label, rate, colorKey, color }

let padActiveIndex = -1;      // currently playing pad
let padQueuedIndex = -1;      // pad queued to play after current finishes
let padQueuedOneShot = false;
let padLastPlayedIndex = -1;  // for double-click "finish session"
let padFinishing = false;     // double-click triggered finish
let padSource = null;         // current AudioBufferSourceNode for pads
let padGainNode = null;
let padPitchShifterNode = null;
let padPlaying = false;
const padBufferWarmPromises = new Map();
let padStartRequestToken = 0;
let padCountdownEl = null;
let padCountdownRaf = 0;
let padCountdownStartTime = 0;
let padCountdownDuration = 0;
let padCountdownRepeats = true;
let padCountdownCircumference = 2 * Math.PI * 18;
const drumBufferWarmPromises = new Map();
const drumVoices = [];
const drumPadHitUntil = new Array(PAD_COUNT).fill(0);
let drumAssignTarget = -1;
let drumAssignSelectedKey = '';
let drumAssignSelectedColorKey = PAD_COLOR_DEFAULT_KEY;

function setIslandCollapsed(cardId, titleId, storageKey, collapsed) {
  const card = document.getElementById(cardId);
  if (!card) return;
  card.classList.toggle('collapsed', !!collapsed);
  const title = document.getElementById(titleId);
  if (title) title.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  try { localStorage.setItem(storageKey, collapsed ? '1' : '0'); } catch {}
}

function toggleIslandCollapsed(cardId, titleId, storageKey) {
  const card = document.getElementById(cardId);
  if (!card) return;
  setIslandCollapsed(cardId, titleId, storageKey, !card.classList.contains('collapsed'));
}

function bindIslandCollapseTitle(titleId, cardId, storageKey) {
  const title = document.getElementById(titleId);
  if (!title) return;
  let lastTapAt = 0;
  title.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'mouse' && e.detail !== 2) return;
    const now = Date.now();
    if (now - lastTapAt <= 320) {
      e.preventDefault();
      toggleIslandCollapsed(cardId, titleId, storageKey);
      lastTapAt = 0;
      return;
    }
    lastTapAt = now;
  });
  title.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    toggleIslandCollapsed(cardId, titleId, storageKey);
  });
}

function loadIslandCollapsedState() {
  try {
    setIslandCollapsed('loopTriggerCard', 'loopTriggerTitle', LOOP_TRIGGER_COLLAPSED_KEY, localStorage.getItem(LOOP_TRIGGER_COLLAPSED_KEY) === '1');
    setIslandCollapsed('drumMachineCard', 'drumMachineTitle', DRUM_MACHINE_COLLAPSED_KEY, localStorage.getItem(DRUM_MACHINE_COLLAPSED_KEY) === '1');
  } catch {}
}

function ensurePadCountdownElement() {
  if (padCountdownEl) return padCountdownEl;
  padCountdownEl = document.getElementById('padCountdown');
  if (!padCountdownEl) return null;
  const front = padCountdownEl.querySelector('.pad-countfront');
  if (front) {
    const r = parseFloat(front.getAttribute('r')) || 18;
    padCountdownCircumference = 2 * Math.PI * r;
    front.style.strokeDasharray = String(padCountdownCircumference);
    front.style.strokeDashoffset = String(padCountdownCircumference);
  }
  return padCountdownEl;
}

function stopPadCountdownFrame() {
  if (!padCountdownRaf) return;
  cancelAnimationFrame(padCountdownRaf);
  padCountdownRaf = 0;
}

function updatePadCountdown() {
  const el = ensurePadCountdownElement();
  if (!el || !audioCtx || padCountdownDuration <= 0) {
    stopPadCountdownFrame();
    return;
  }
  const front = el.querySelector('.pad-countfront');
  if (!front) return;

  const elapsed = Math.max(0, audioCtx.currentTime - padCountdownStartTime);
  const rawProgress = elapsed / padCountdownDuration;
  const progress = padCountdownRepeats
    ? rawProgress - Math.floor(rawProgress)
    : Math.min(rawProgress, 1);
  const offset = padCountdownCircumference * (1 - progress);
  front.style.strokeDashoffset = String(offset);

  if (!padCountdownRepeats && rawProgress >= 1) {
    stopPadCountdownFrame();
  }
}

function startPadCountdownFrame() {
  if (padCountdownRaf) return;
  const tick = () => {
    padCountdownRaf = requestAnimationFrame(tick);
    updatePadCountdown();
  };
  padCountdownRaf = requestAnimationFrame(tick);
}

function showPadCountdown(durationSeconds, repeats = true, startOffsetSeconds = 0) {
  const el = ensurePadCountdownElement();
  if (!el || !audioCtx) return;
  padCountdownDuration = Math.max(0.0001, durationSeconds);
  padCountdownRepeats = !!repeats;
  padCountdownStartTime = audioCtx.currentTime - Math.max(0, startOffsetSeconds);
  el.classList.remove('is-inactive');
  el.setAttribute('aria-hidden', 'false');
  updatePadCountdown();
  startPadCountdownFrame();
}

function hidePadCountdown() {
  const el = ensurePadCountdownElement();
  if (!el) return;
  stopPadCountdownFrame();
  padCountdownDuration = 0;
  el.classList.add('is-inactive');
  el.setAttribute('aria-hidden', 'true');
  const front = el.querySelector('.pad-countfront');
  if (front) front.style.strokeDashoffset = String(padCountdownCircumference);
}

function normalizeHexColor(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text.startsWith('#')) return text;
  if (text.length === 4) {
    return `#${text[1]}${text[1]}${text[2]}${text[2]}${text[3]}${text[3]}`;
  }
  return text;
}

function getCurrentTheme() {
  return document.documentElement.classList.contains('theme-light') ? 'light' : 'dark';
}

function getPadThemePalette(theme = getCurrentTheme()) {
  return theme === 'light' ? PAD_LIGHT_COLOR_PALETTE : PAD_DARK_COLOR_PALETTE;
}

function getPadColorKeyFromLegacyColor(value) {
  return PAD_LEGACY_COLOR_KEY_MAP[normalizeHexColor(value)] || '';
}

function normalizePadColorKey(colorKey, fallbackColor = '') {
  const key = String(colorKey || '').trim().toLowerCase();
  if (PAD_COLOR_KEYS.includes(key)) return key;
  return getPadColorKeyFromLegacyColor(fallbackColor) || PAD_COLOR_DEFAULT_KEY;
}

function resolvePadDisplayColor(colorKey, theme = getCurrentTheme()) {
  const palette = getPadThemePalette(theme);
  const normalizedKey = normalizePadColorKey(colorKey);
  return palette[normalizedKey] || palette[PAD_COLOR_DEFAULT_KEY];
}

function normalizePadAssignment(a, theme = getCurrentTheme()) {
  if (!a || !a.presetKey) return null;
  const colorKey = normalizePadColorKey(a.colorKey, a.color);
  return {
    presetKey: String(a.presetKey),
    label: String(a.label || ''),
    rate: clamp(Number(a.rate) || 1.0, RATE_MIN, RATE_MAX),
    colorKey,
    color: resolvePadDisplayColor(colorKey, theme),
    volume: normalizeAssignmentVolume(a.volume, 1.0),
    loop: a.loop !== false,
    preservePitch: !!(a && a.preservePitch),
    displayName: String(a.displayName || '')
  };
}

function serializePadAssignment(a, theme = getCurrentTheme()) {
  if (!a || !a.presetKey) return null;
  const normalized = normalizePadAssignment(a, theme);
  return normalized ? {
    presetKey: normalized.presetKey,
    label: normalized.label,
    rate: normalized.rate,
    colorKey: normalized.colorKey,
    color: normalized.color,
    volume: normalized.volume,
    loop: normalized.loop !== false,
    preservePitch: normalized.preservePitch,
    displayName: normalized.displayName
  } : null;
}

function normalizeDrumAssignment(a, theme = getCurrentTheme()) {
  if (!a || !a.presetKey) return null;
  const colorKey = normalizePadColorKey(a.colorKey, a.color);
  const chokeTargetIndex = Number.isInteger(a.chokeTargetIndex)
    ? clamp(a.chokeTargetIndex, -1, PAD_COUNT - 1)
    : -1;
  return {
    presetKey: String(a.presetKey),
    label: String(a.label || ''),
    displayName: String(a.displayName || ''),
    volume: normalizeAssignmentVolume(a.volume, 1.0),
    colorKey,
    color: resolvePadDisplayColor(colorKey, theme),
    chokeTargetIndex
  };
}

function serializeDrumAssignment(a, theme = getCurrentTheme()) {
  if (!a || !a.presetKey) return null;
  const normalized = normalizeDrumAssignment(a, theme);
  return normalized ? {
    presetKey: normalized.presetKey,
    label: normalized.label,
    displayName: normalized.displayName,
    volume: normalized.volume,
    colorKey: normalized.colorKey,
    color: normalized.color,
    chokeTargetIndex: normalized.chokeTargetIndex
  } : null;
}

function refreshPadColorPalette(theme = getCurrentTheme()) {
  const paletteEl = document.getElementById('padColorPalette');
  if (!paletteEl) return;
  const palette = getPadThemePalette(theme);
  paletteEl.querySelectorAll('.pad-color-swatch').forEach((swatch, index) => {
    const colorKey = normalizePadColorKey(
      swatch.getAttribute('data-color-key') || PAD_COLOR_KEYS[index],
      swatch.getAttribute('data-color') || ''
    );
    const color = palette[colorKey] || palette[PAD_COLOR_DEFAULT_KEY];
    swatch.setAttribute('data-color', color);
    swatch.style.background = color;
    swatch.classList.toggle('selected', colorKey === padAssignSelectedColorKey);
  });
}

function refreshDrumColorPalette(theme = getCurrentTheme()) {
  const paletteEl = document.getElementById('drumColorPalette');
  if (!paletteEl) return;
  const palette = getPadThemePalette(theme);
  paletteEl.querySelectorAll('.pad-color-swatch').forEach((swatch, index) => {
    const colorKey = normalizePadColorKey(
      swatch.getAttribute('data-color-key') || PAD_COLOR_KEYS[index],
      swatch.getAttribute('data-color') || ''
    );
    const color = palette[colorKey] || palette[PAD_COLOR_DEFAULT_KEY];
    swatch.setAttribute('data-color', color);
    swatch.style.background = color;
    swatch.classList.toggle('selected', colorKey === drumAssignSelectedColorKey);
  });
}

function getPadAssignableTrimPreset() {
  const key = String(padAssignSelectedKey || '');
  if (!key.startsWith('upload:')) return null;
  const id = key.slice('upload:'.length);
  return userPresets.find(preset => preset && preset.blob && String(preset.id) === String(id)) || null;
}

function getDrumAssignableTrimPreset() {
  const key = String(drumAssignSelectedKey || '');
  if (!key.startsWith('upload:')) return null;
  const id = key.slice('upload:'.length);
  return userPresets.find(preset => preset && preset.blob && String(preset.id) === String(id)) || null;
}

function updatePadAssignTrimButton() {
  const trimBtn = document.getElementById('padAssignTrim');
  if (!trimBtn) return;
  const preset = getPadAssignableTrimPreset();
  trimBtn.textContent = t('pads_assign_trim');
  trimBtn.setAttribute('aria-label', t('pads_assign_trim'));
  trimBtn.disabled = !preset;
  trimBtn.title = preset ? t('pads_assign_trim') : t('pads_assign_trim_unavailable');
}

function updateDrumAssignTrimButton() {
  const trimBtn = document.getElementById('drumAssignTrim');
  if (!trimBtn) return;
  const preset = getDrumAssignableTrimPreset();
  trimBtn.textContent = t('pads_assign_trim');
  trimBtn.setAttribute('aria-label', t('pads_assign_trim'));
  trimBtn.disabled = !preset;
  trimBtn.title = preset ? t('pads_assign_trim') : t('pads_assign_trim_unavailable');
}

async function openSelectedPadLoopInTrimmer() {
  const preset = getPadAssignableTrimPreset();
  if (!preset) {
    updatePadAssignTrimButton();
    setStatus(t('pads_assign_trim_unavailable'));
    return;
  }
  trimPadTargetIndex = padAssignTarget;
  trimDrumTargetIndex = -1;
  closePadAssignModal();
  await openTrimmer(preset);
}

async function openSelectedDrumLoopInTrimmer() {
  const preset = getDrumAssignableTrimPreset();
  if (!preset) {
    updateDrumAssignTrimButton();
    setStatus(t('pads_assign_trim_unavailable'));
    return;
  }
  trimDrumTargetIndex = drumAssignTarget;
  trimPadTargetIndex = -1;
  closeDrumAssignModal();
  await openTrimmer(preset);
}

function getPadLoopChoicesByCategory() {
  const categories = getLoopCategories();
  const catAssignments = getLoopCatAssignments();
  const map = {};
  categories.forEach(cat => { map[cat] = []; });

  builtinPresets.forEach(preset => {
    if (!preset || !preset.path) return;
    const cat = catAssignments[preset.path] || preset.category || 'Imported';
    if (!map[cat]) map[cat] = [];
    map[cat].push({
      presetKey: `builtin:${preset.path}`,
      label: getBuiltinPresetDisplayName(preset),
      category: cat,
      isBuiltin: true,
      subfolder: getBuiltinPresetSubfolder(preset)
    });
  });

  userPresets.forEach(preset => {
    if (!preset) return;
    const cat = (preset.id && catAssignments[preset.id]) || 'Imported';
    if (!map[cat]) map[cat] = [];
    const presetKey = preset.blob && preset.id ? `upload:${preset.id}` : (preset.url ? `url:${preset.url}` : '');
    if (!presetKey) return;
    const rawName = (preset.id && getUploadNameOverride(preset.id)) || preset.name || 'Imported';
    map[cat].push({
      presetKey,
      label: stripFileExt(rawName),
      category: cat,
      isBuiltin: false,
      subfolder: ''
    });
  });

  Object.values(map).forEach(items => items.sort((a, b) => a.label.localeCompare(b.label)));
  return map;
}

function normalizePadRateValue(rawValue, fallback = 1.0) {
  const raw = String(rawValue || '').trim().replace(/,/g, '.');
  if (!raw) return clamp(fallback, RATE_MIN, RATE_MAX);

  const digitsOnly = raw.replace(/\D/g, '');
  let parsed = NaN;

  if (/^\d+$/.test(raw) && digitsOnly) {
    parsed = Number(digitsOnly) / 100;
  } else {
    const safe = raw.replace(/[^\d.]/g, '');
    const firstDot = safe.indexOf('.');
    const normalized = firstDot >= 0
      ? `${safe.slice(0, firstDot + 1)}${safe.slice(firstDot + 1).replace(/\./g, '')}`
      : safe;
    parsed = Number.parseFloat(normalized);
  }

  if (!Number.isFinite(parsed)) parsed = fallback;
  return clamp(parsed, RATE_MIN, RATE_MAX);
}

function formatPadRateValue(value) {
  return clamp(Number(value) || 1, RATE_MIN, RATE_MAX).toFixed(2);
}

function syncPadRateInput(commit = false) {
  const input = document.getElementById('padRateInput');
  if (!input) return;
  const fallback = padAssignTarget >= 0 && padAssignments[padAssignTarget] ? padAssignments[padAssignTarget].rate : 1.0;
  const normalized = normalizePadRateValue(input.value, fallback || 1.0);
  if (commit) input.value = formatPadRateValue(normalized);
}

function setPadPickerExpandedCategory(category, categories) {
  padPickerCollapsedCategories.clear();
  if (!category) {
    categories.forEach(cat => padPickerCollapsedCategories.add(cat));
    return;
  }
  categories.forEach(cat => {
    if (cat !== category) padPickerCollapsedCategories.add(cat);
  });
}

function setDrumPickerExpandedCategory(category, categories) {
  drumPickerCollapsedCategories.clear();
  if (!category) {
    categories.forEach(cat => drumPickerCollapsedCategories.add(cat));
    return;
  }
  categories.forEach(cat => {
    if (cat !== category) drumPickerCollapsedCategories.add(cat);
  });
}

function initializeDrumPickerView(categories) {
  if (!drumPickerCollapsedSubfoldersLoaded) {
    loadPickerCollapsedSubfolders(DRUM_PICKER_COLLAPSED_SUBFOLDERS_KEY, drumPickerCollapsedSubfolders);
    drumPickerCollapsedSubfoldersLoaded = true;
  }
  const remembered = drumPickerLastOpenCategory && categories.includes(drumPickerLastOpenCategory)
    ? drumPickerLastOpenCategory
    : '';
  setDrumPickerExpandedCategory(remembered, categories);
}

function initializePadPickerView(categories) {
  if (!padPickerCollapsedSubfoldersLoaded) {
    loadPickerCollapsedSubfolders(PAD_PICKER_COLLAPSED_SUBFOLDERS_KEY, padPickerCollapsedSubfolders);
    padPickerCollapsedSubfoldersLoaded = true;
  }
  const remembered = padPickerLastOpenCategory && categories.includes(padPickerLastOpenCategory)
    ? padPickerLastOpenCategory
    : '';
  setPadPickerExpandedCategory(remembered, categories);
}

function renderPadLoopPicker() {
  const list = document.getElementById('padLoopPickerList');
  if (!list) return;
  list.innerHTML = '';

  const byCategory = getPadLoopChoicesByCategory();
  const categories = Object.keys(byCategory).sort((a, b) => a.localeCompare(b));

  categories.forEach(category => {
    const items = byCategory[category];
    if (!items || !items.length) return;

    const section = document.createElement('div');
    section.className = 'pad-picker-category';
    const collapsed = padPickerCollapsedCategories.has(category);
    if (collapsed) section.classList.add('collapsed');

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'pad-picker-category-header';
    header.innerHTML = `<span class="pad-picker-category-name"><span class="pad-picker-chevron">${collapsed ? '▸' : '▾'}</span><span>${getTranslatedLoopCategoryName(category)}</span></span><span class="pad-picker-count">${items.length}</span>`;
    header.addEventListener('click', () => {
      const nextExpandedCategory = padPickerCollapsedCategories.has(category) ? category : '';
      padPickerLastOpenCategory = category;
      setPadPickerExpandedCategory(nextExpandedCategory, categories);
      renderPadLoopPicker();
    });
    section.appendChild(header);
    section.dataset.category = category;

    const body = document.createElement('div');
    body.className = 'pad-picker-items';

    const grouped = new Map();
    items.forEach(item => {
      const subfolder = String(item.subfolder || '');
      if (!grouped.has(subfolder)) grouped.set(subfolder, []);
      grouped.get(subfolder).push(item);
    });

    const renderPadPickerButtons = (target, subItems) => {
      subItems.forEach(item => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `pad-picker-item${item.presetKey === padAssignSelectedKey ? ' selected' : ''}`;
        button.innerHTML = `<span>${item.label}</span><span class="pad-picker-item-meta">${item.isBuiltin ? t('loops_builtin') : t('loops_imported')}</span>`;
        button.addEventListener('click', () => {
          padAssignSelectedKey = item.presetKey;
          updatePadAssignTrimButton();
          renderPadLoopPicker();
        });
        target.appendChild(button);
      });
    };

    const subfolders = Array.from(grouped.keys()).sort((a, b) => {
      if (!a && !b) return 0;
      if (!a) return -1;
      if (!b) return 1;
      return a.localeCompare(b);
    });
    const hasNestedSubfolders = subfolders.some(Boolean);

    if (!hasNestedSubfolders) {
      renderPadPickerButtons(body, items);
    } else {
      subfolders.forEach(subfolder => {
        const subItems = grouped.get(subfolder) || [];
        if (!subItems.length) return;
        if (!subfolder) {
          renderPadPickerButtons(body, subItems);
          return;
        }

        const subSection = document.createElement('div');
        subSection.className = 'pad-picker-subfolder';
        const subKey = `${category}::${subfolder}`;
        const subCollapsed = padPickerCollapsedSubfolders.has(subKey);
        if (subCollapsed) subSection.classList.add('collapsed');

        const subHeader = document.createElement('button');
        subHeader.type = 'button';
        subHeader.className = 'pad-picker-subfolder-header';
        subHeader.setAttribute('aria-expanded', subCollapsed ? 'false' : 'true');
        subHeader.innerHTML = `<span class="pad-picker-category-name"><span class="pad-picker-chevron">${subCollapsed ? '▸' : '▾'}</span><span>${subfolder}</span></span><span class="pad-picker-count">${subItems.length}</span>`;
        subHeader.addEventListener('click', () => {
          if (padPickerCollapsedSubfolders.has(subKey)) padPickerCollapsedSubfolders.delete(subKey);
          else padPickerCollapsedSubfolders.add(subKey);
          savePickerCollapsedSubfolders(PAD_PICKER_COLLAPSED_SUBFOLDERS_KEY, padPickerCollapsedSubfolders);
          renderPadLoopPicker();
        });

        const subBody = document.createElement('div');
        subBody.className = 'pad-picker-subfolder-items';
        renderPadPickerButtons(subBody, subItems);

        subSection.appendChild(subHeader);
        subSection.appendChild(subBody);
        body.appendChild(subSection);
      });
    }

    section.appendChild(body);
    list.appendChild(section);
  });

  if (padPickerLastOpenCategory) {
    const target = Array.from(list.querySelectorAll('.pad-picker-category')).find(el => el.dataset.category === padPickerLastOpenCategory);
    if (target) {
      try { target.scrollIntoView({ block: 'nearest' }); } catch {}
    }
  }
}

function renderDrumLoopPicker() {
  const list = document.getElementById('drumLoopPickerList');
  if (!list) return;
  list.innerHTML = '';

  const byCategory = getPadLoopChoicesByCategory();
  const categories = Object.keys(byCategory).sort((a, b) => a.localeCompare(b));

  categories.forEach(category => {
    const items = byCategory[category];
    if (!items || !items.length) return;

    const section = document.createElement('div');
    section.className = 'pad-picker-category';
    const collapsed = drumPickerCollapsedCategories.has(category);
    if (collapsed) section.classList.add('collapsed');

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'pad-picker-category-header';
    header.innerHTML = `<span class="pad-picker-category-name"><span class="pad-picker-chevron">${collapsed ? '▸' : '▾'}</span><span>${getTranslatedLoopCategoryName(category)}</span></span><span class="pad-picker-count">${items.length}</span>`;
    header.addEventListener('click', () => {
      const nextExpandedCategory = drumPickerCollapsedCategories.has(category) ? category : '';
      drumPickerLastOpenCategory = category;
      setDrumPickerExpandedCategory(nextExpandedCategory, categories);
      renderDrumLoopPicker();
    });
    section.appendChild(header);
    section.dataset.category = category;

    const body = document.createElement('div');
    body.className = 'pad-picker-items';
    const grouped = new Map();
    items.forEach(item => {
      const subfolder = String(item.subfolder || '');
      if (!grouped.has(subfolder)) grouped.set(subfolder, []);
      grouped.get(subfolder).push(item);
    });

    const renderDrumPickerButtons = (target, subItems) => {
      subItems.forEach(item => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `pad-picker-item${item.presetKey === drumAssignSelectedKey ? ' selected' : ''}`;
        button.innerHTML = `<span>${item.label}</span><span class="pad-picker-item-meta">${item.isBuiltin ? t('loops_builtin') : t('loops_imported')}</span>`;
        button.addEventListener('click', () => {
          drumAssignSelectedKey = item.presetKey;
          updateDrumAssignTrimButton();
          renderDrumLoopPicker();
        });
        target.appendChild(button);
      });
    };

    const subfolders = Array.from(grouped.keys()).sort((a, b) => {
      if (!a && !b) return 0;
      if (!a) return -1;
      if (!b) return 1;
      return a.localeCompare(b);
    });
    const hasNestedSubfolders = subfolders.some(Boolean);

    if (!hasNestedSubfolders) {
      renderDrumPickerButtons(body, items);
    } else {
      subfolders.forEach(subfolder => {
        const subItems = grouped.get(subfolder) || [];
        if (!subItems.length) return;
        if (!subfolder) {
          renderDrumPickerButtons(body, subItems);
          return;
        }

        const subSection = document.createElement('div');
        subSection.className = 'pad-picker-subfolder';
        const subKey = `${category}::${subfolder}`;
        const subCollapsed = drumPickerCollapsedSubfolders.has(subKey);
        if (subCollapsed) subSection.classList.add('collapsed');

        const subHeader = document.createElement('button');
        subHeader.type = 'button';
        subHeader.className = 'pad-picker-subfolder-header';
        subHeader.setAttribute('aria-expanded', subCollapsed ? 'false' : 'true');
        subHeader.innerHTML = `<span class="pad-picker-category-name"><span class="pad-picker-chevron">${subCollapsed ? '▸' : '▾'}</span><span>${subfolder}</span></span><span class="pad-picker-count">${subItems.length}</span>`;
        subHeader.addEventListener('click', () => {
          if (drumPickerCollapsedSubfolders.has(subKey)) drumPickerCollapsedSubfolders.delete(subKey);
          else drumPickerCollapsedSubfolders.add(subKey);
          savePickerCollapsedSubfolders(DRUM_PICKER_COLLAPSED_SUBFOLDERS_KEY, drumPickerCollapsedSubfolders);
          renderDrumLoopPicker();
        });

        const subBody = document.createElement('div');
        subBody.className = 'pad-picker-subfolder-items';
        renderDrumPickerButtons(subBody, subItems);

        subSection.appendChild(subHeader);
        subSection.appendChild(subBody);
        body.appendChild(subSection);
      });
    }

    section.appendChild(body);
    list.appendChild(section);
  });
}

function loadPadAssignments() {
  try {
    const raw = localStorage.getItem(PADS_ASSIGNMENTS_KEY);
    const parsed = JSON.parse(raw || '[]');
    if (Array.isArray(parsed)) {
      padAssignments = Array.from({ length: PAD_COUNT }, (_, index) => {
        return normalizePadAssignment(parsed[index]);
      });
    }
  } catch {}
  try { warmAssignedPadBuffers(); } catch {}
}

function warmPadAssignmentBuffer(assignment) {
  const presetKey = assignment && assignment.presetKey;
  if (!presetKey) return Promise.resolve(null);
  if (padBufferWarmPromises.has(presetKey)) return padBufferWarmPromises.get(presetKey);

  const warmPromise = loadBufferFromPresetKey(presetKey)
    .catch(() => null)
    .finally(() => {
      padBufferWarmPromises.delete(presetKey);
    });

  padBufferWarmPromises.set(presetKey, warmPromise);
  return warmPromise;
}

function warmAssignedPadBuffers() {
  const seen = new Set();
  for (const assignment of padAssignments) {
    const presetKey = assignment && assignment.presetKey;
    if (!presetKey || seen.has(presetKey)) continue;
    seen.add(presetKey);
    void warmPadAssignmentBuffer(assignment);
  }
}

function loadDrumAssignments() {
  try {
    const raw = localStorage.getItem(DRUM_ASSIGNMENTS_KEY);
    const parsed = JSON.parse(raw || '[]');
    if (Array.isArray(parsed)) {
      drumAssignments = Array.from({ length: PAD_COUNT }, (_, index) => normalizeDrumAssignment(parsed[index]));
    }
  } catch {}
  try { warmAssignedDrumBuffers(); } catch {}
}

function saveDrumAssignments() {
  try {
    const serialized = drumAssignments.map(a => serializeDrumAssignment(a));
    localStorage.setItem(DRUM_ASSIGNMENTS_KEY, JSON.stringify(serialized));
  } catch {}
}

function warmDrumAssignmentBuffer(assignment) {
  const presetKey = assignment && assignment.presetKey;
  if (!presetKey) return Promise.resolve(null);
  if (drumBufferWarmPromises.has(presetKey)) return drumBufferWarmPromises.get(presetKey);
  const warmPromise = loadBufferFromPresetKey(presetKey)
    .catch(() => null)
    .finally(() => {
      drumBufferWarmPromises.delete(presetKey);
    });
  drumBufferWarmPromises.set(presetKey, warmPromise);
  return warmPromise;
}

function warmAssignedDrumBuffers() {
  const seen = new Set();
  for (const assignment of drumAssignments) {
    const presetKey = assignment && assignment.presetKey;
    if (!presetKey || seen.has(presetKey)) continue;
    seen.add(presetKey);
    void warmDrumAssignmentBuffer(assignment);
  }
}

function formatDrumChokeOptionLabel(index, assignment = drumAssignments[index]) {
  const fallback = `Pad ${index + 1}`;
  if (!assignment) return fallback;
  const name = String(assignment.displayName || assignment.label || '').trim();
  return name ? `${index + 1} - ${name}` : fallback;
}

function renderDrumChokeOptions() {
  const select = document.getElementById('drumChokeSelect');
  if (!select) return;
  const previousValue = select.value;
  select.innerHTML = '';

  const noneOption = document.createElement('option');
  noneOption.value = '-1';
  noneOption.textContent = t('drum_choke_none');
  select.appendChild(noneOption);

  drumAssignments.forEach((assignment, index) => {
    if (!assignment || index === drumAssignTarget) return;
    const option = document.createElement('option');
    option.value = String(index);
    option.textContent = formatDrumChokeOptionLabel(index, assignment);
    select.appendChild(option);
  });

  const currentAssignment = drumAssignTarget >= 0 ? drumAssignments[drumAssignTarget] : null;
  const desired = currentAssignment && Number.isInteger(currentAssignment.chokeTargetIndex)
    ? String(currentAssignment.chokeTargetIndex)
    : (previousValue || '-1');
  select.value = Array.from(select.options).some(option => option.value === desired) ? desired : '-1';
}

function renderDrumGrid() {
  const grid = document.getElementById('drumPadsGrid');
  if (!grid) return;
  const theme = getCurrentTheme();
  const pads = grid.querySelectorAll('.drum-pad');
  const now = Date.now();
  pads.forEach((el, i) => {
    const assignment = drumAssignments[i];
    const oldName = el.querySelector('.pad-loop-name');
    if (oldName) oldName.remove();

    if (assignment) {
      const colorKey = normalizePadColorKey(assignment.colorKey, assignment.color);
      const displayText = assignment.displayName || assignment.label || '';
      el.style.background = resolvePadDisplayColor(colorKey, theme);
      el.setAttribute('aria-label', `Drum pad ${i + 1} - ${displayText || 'Assigned'}`);
      const nameEl = document.createElement('span');
      nameEl.className = 'pad-loop-name';
      nameEl.textContent = formatPadDisplayText(displayText);
      el.appendChild(nameEl);
    } else {
      el.style.background = '';
      el.setAttribute('aria-label', `Drum pad ${i + 1} - Empty`);
    }

    el.classList.toggle('pad-hit', drumPadHitUntil[i] > now);
  });
}

function flashDrumPad(index) {
  if (index < 0 || index >= PAD_COUNT) return;
  drumPadHitUntil[index] = Date.now() + 160;
  renderDrumGrid();
  setTimeout(() => {
    if (drumPadHitUntil[index] <= Date.now()) renderDrumGrid();
  }, 180);
}

function unregisterDrumVoice(voice) {
  const idx = drumVoices.indexOf(voice);
  if (idx >= 0) drumVoices.splice(idx, 1);
}

function destroyDrumVoice(voice) {
  if (!voice) return;
  if (voice.cleanupTimer) {
    clearTimeout(voice.cleanupTimer);
    voice.cleanupTimer = 0;
  }
  try { voice.source.removeEventListener('ended', voice.endedHandler); } catch {}
  try { voice.source.disconnect(); } catch {}
  try { if (voice.gainNode) voice.gainNode.disconnect(); } catch {}
  try { if (voice.pitchShifterNode) voice.pitchShifterNode.disconnect(); } catch {}
  unregisterDrumVoice(voice);
}

function stopDrumVoice(voice, immediate = false) {
  if (!voice || voice.stopping) return;
  voice.stopping = true;
  const fade = immediate ? 0.005 : 0.03;
  try {
    if (audioCtx && voice.gainNode) {
      const now = audioCtx.currentTime;
      voice.gainNode.gain.cancelScheduledValues(now);
      voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, now);
      voice.gainNode.gain.linearRampToValueAtTime(0, now + fade);
    }
  } catch {}
  voice.cleanupTimer = setTimeout(() => {
    try { voice.source.stop(); } catch {}
    destroyDrumVoice(voice);
  }, Math.max(16, Math.round((fade + 0.03) * 1000)));
}

function stopDrumVoicesByPad(index, immediate = true) {
  if (index < 0 || index >= PAD_COUNT) return;
  drumVoices
    .filter(voice => voice && voice.padIndex === index)
    .forEach(voice => stopDrumVoice(voice, immediate));
}

function stopDrumPlayback(immediate = false) {
  drumVoices.slice().forEach(voice => stopDrumVoice(voice, immediate));
}

async function triggerDrumPad(index) {
  const assignment = drumAssignments[index];
  if (!assignment) return;

  ensureAudio();
  if (audioCtx.state === 'suspended') {
    try { await audioCtx.resume(); } catch {}
  }
  startOutputIfNeeded();

  const chokeTargetIndex = Number.isInteger(assignment.chokeTargetIndex) ? assignment.chokeTargetIndex : -1;
  if (chokeTargetIndex >= 0 && chokeTargetIndex !== index) {
    stopDrumVoicesByPad(chokeTargetIndex, true);
  }

  const loaded = await loadBufferFromPresetKey(assignment.presetKey);
  if (!loaded || !loaded.buffer || !audioCtx || !master) {
    setStatus('Drum pad: failed to load sample');
    return;
  }

  const buffer = loaded.buffer;
  const ref = loaded.presetRef;
  const startOffset = ref && ref.trimIn != null ? clamp(Number(ref.trimIn) || 0, 0, Math.max(0, buffer.duration - 0.001)) : 0;
  const endOffset = ref && ref.trimOut != null
    ? clamp(Number(ref.trimOut) || buffer.duration, startOffset + 0.001, buffer.duration)
    : buffer.duration;
  const duration = Math.max(0.01, endOffset - startOffset);

  if (drumVoices.length >= DRUM_VOICE_LIMIT) {
    stopDrumVoice(drumVoices[0], true);
  }

  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.loop = false;

  const gainNode = audioCtx.createGain();
  try { gainNode.gain.setValueAtTime(normalizeAssignmentVolume(assignment.volume, 1.0), audioCtx.currentTime); } catch {}
  source.connect(gainNode);
  gainNode.connect(master);

  try {
    const now = audioCtx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(volumeVal, now + 0.01);
  } catch {}

  const voice = {
    source,
    gainNode,
    pitchShifterNode: null,
    padIndex: index,
    cleanupTimer: 0,
    stopping: false,
    endedHandler: null
  };

  voice.endedHandler = () => destroyDrumVoice(voice);
  source.addEventListener('ended', voice.endedHandler);
  drumVoices.push(voice);

  source.start(audioCtx.currentTime, startOffset, duration);
  flashDrumPad(index);
  setStatus(`Drum ${index + 1}: ${assignment.displayName || assignment.label || 'Playing'}`);
}

function openDrumAssignModal(padIndex) {
  drumAssignTarget = padIndex;
  const existing = drumAssignments[padIndex];
  const overlay = document.getElementById('drumAssignOverlay');
  const title = document.getElementById('drumAssignTitle');
  const displayNameInput = document.getElementById('drumDisplayNameInput');
  const volumeInput = document.getElementById('drumAssignVolume');
  const volumeReadout = document.getElementById('drumAssignVolumeReadout');

  if (!overlay) return;
  if (title) title.textContent = `${t('drum_assign_title')} ${padIndex + 1}`;
  drumAssignSelectedKey = (existing && existing.presetKey) || '';
  drumAssignSelectedColorKey = normalizePadColorKey(existing && existing.colorKey, existing && existing.color);
  initializeDrumPickerView(Object.keys(getPadLoopChoicesByCategory()).sort((a, b) => a.localeCompare(b)));
  renderDrumLoopPicker();
  renderDrumChokeOptions();
  refreshDrumColorPalette();
  if (displayNameInput) displayNameInput.value = (existing && existing.displayName) || '';
  setAssignmentVolumeUI(volumeInput, volumeReadout, existing && existing.volume != null ? existing.volume : 1.0);
  const chokeSelect = document.getElementById('drumChokeSelect');
  if (chokeSelect) chokeSelect.value = existing && Number.isInteger(existing.chokeTargetIndex) ? String(existing.chokeTargetIndex) : '-1';
  updateDrumAssignTrimButton();
  overlay.classList.remove('hidden');
  try { updateScrollState(); } catch {}
}

function closeDrumAssignModal() {
  const overlay = document.getElementById('drumAssignOverlay');
  if (overlay) overlay.classList.add('hidden');
  drumAssignTarget = -1;
  try { updateScrollState(); } catch {}
}

function saveDrumAssignment() {
  if (drumAssignTarget < 0 || drumAssignTarget >= PAD_COUNT) return;
  if (!drumAssignSelectedKey) {
    closeDrumAssignModal();
    return;
  }

  const displayNameInput = document.getElementById('drumDisplayNameInput');
  const chokeSelect = document.getElementById('drumChokeSelect');
  const volumeInput = document.getElementById('drumAssignVolume');
  const choices = getAllLoopChoices();
  const match = choices.find(choice => choice.presetKey === drumAssignSelectedKey);
  const label = match ? match.label : '';
  const chokeTargetIndex = chokeSelect ? clamp(parseInt(chokeSelect.value, 10) || -1, -1, PAD_COUNT - 1) : -1;

  drumAssignments[drumAssignTarget] = {
    presetKey: drumAssignSelectedKey,
    label,
    displayName: displayNameInput ? displayNameInput.value.trim() : '',
    volume: readAssignmentVolumeUI(volumeInput, 1.0),
    colorKey: drumAssignSelectedColorKey,
    color: resolvePadDisplayColor(drumAssignSelectedColorKey),
    chokeTargetIndex: chokeTargetIndex === drumAssignTarget ? -1 : chokeTargetIndex
  };
  saveDrumAssignments();
  void warmDrumAssignmentBuffer(drumAssignments[drumAssignTarget]);
  renderDrumGrid();
  closeDrumAssignModal();
}

function clearDrumAssignment() {
  if (drumAssignTarget < 0 || drumAssignTarget >= PAD_COUNT) return;
  stopDrumVoicesByPad(drumAssignTarget, true);
  drumAssignments[drumAssignTarget] = null;
  drumAssignments = drumAssignments.map((assignment, index) => {
    if (!assignment || index === drumAssignTarget) return assignment;
    if (assignment.chokeTargetIndex !== drumAssignTarget) return assignment;
    return { ...assignment, chokeTargetIndex: -1 };
  });
  saveDrumAssignments();
  renderDrumGrid();
  closeDrumAssignModal();
}

function disconnectPadPitchShifter() {
  if (padPitchShifterNode) {
    try { padPitchShifterNode.disconnect(); } catch {}
    padPitchShifterNode = null;
  }
  if (padGainNode && master) {
    try { padGainNode.disconnect(); } catch {}
    try { padGainNode.connect(master); } catch {}
  }
}

function connectPadPitchShifter(rate) {
  if (!audioCtx || !padGainNode || !master) return;
  disconnectPadPitchShifter();
  const pf = 1.0 / clamp(rate, RATE_MIN, RATE_MAX);
  if (Math.abs(pf - 1.0) < 0.005) return;
  try {
    padPitchShifterNode = createPitchShifterNode(audioCtx, pf);
    padGainNode.disconnect();
    padGainNode.connect(padPitchShifterNode);
    padPitchShifterNode.connect(master);
  } catch {}
}

function savePadAssignments() {
  try {
    const serialized = padAssignments.map(a => serializePadAssignment(a));
    localStorage.setItem(PADS_ASSIGNMENTS_KEY, JSON.stringify(serialized));
  } catch {}
}

function loadPadSessions() {
  try {
    const raw = localStorage.getItem(PADS_SESSIONS_KEY);
    return JSON.parse(raw || '[]').filter(s => s && s.name && Array.isArray(s.assignments));
  } catch { return []; }
}

function savePadSessions(sessions) {
  try { localStorage.setItem(PADS_SESSIONS_KEY, JSON.stringify(sessions)); } catch {}
}

function loadDrumSessions() {
  try {
    const raw = localStorage.getItem(DRUM_SESSIONS_KEY);
    return JSON.parse(raw || '[]').filter(s => s && s.name && Array.isArray(s.assignments));
  } catch { return []; }
}

function saveDrumSessions(sessions) {
  try { localStorage.setItem(DRUM_SESSIONS_KEY, JSON.stringify(sessions)); } catch {}
}

function formatPadDisplayText(label) {
  const text = String(label || '').trim();
  if (text.length <= 10) return text;

  const midpoint = Math.ceil(text.length / 2);
  let splitIndex = text.lastIndexOf(' ', midpoint);
  if (splitIndex <= 0) splitIndex = text.indexOf(' ', midpoint);
  if (splitIndex <= 0) splitIndex = 10;

  const firstLine = text.slice(0, splitIndex).trim();
  const secondLine = text.slice(splitIndex).trim();
  return secondLine ? `${firstLine}\n${secondLine}` : firstLine;
}

function renderPadGrid() {
  const grid = document.getElementById('padsGrid');
  if (!grid) return;
  const theme = getCurrentTheme();
  const pads = grid.querySelectorAll('.pad');
  pads.forEach((el, i) => {
    const a = padAssignments[i];
    // Remove old dynamic children
    const oldName = el.querySelector('.pad-loop-name');
    if (oldName) oldName.remove();

    if (a) {
      const colorKey = normalizePadColorKey(a.colorKey, a.color);
      const displayText = a.displayName || a.label || '';
      el.style.background = resolvePadDisplayColor(colorKey, theme);
      el.setAttribute('aria-label', `Pad ${i + 1} - ${displayText || 'Assigned'}`);
      const nameEl = document.createElement('span');
      nameEl.className = 'pad-loop-name';
      nameEl.textContent = formatPadDisplayText(displayText);
      el.appendChild(nameEl);
    } else {
      el.style.background = '';
      el.setAttribute('aria-label', `Pad ${i + 1} - Empty`);
    }

    el.classList.toggle('pad-active', i === padActiveIndex && padPlaying);
    el.classList.toggle('pad-queued', i === padQueuedIndex);
    el.classList.toggle('pad-finishing', i === padActiveIndex && padFinishing);
  });
}

function stopPadPlayback(ramp = 0.05) {
  padStartRequestToken++;
  padPlaying = false;
  padActiveIndex = -1;
  padQueuedIndex = -1;
  padQueuedOneShot = false;
  padFinishing = false;
  hidePadCountdown();
  if (padSource) {
    try {
      if (padGainNode && audioCtx) {
        const now = audioCtx.currentTime;
        padGainNode.gain.cancelScheduledValues(now);
        padGainNode.gain.setValueAtTime(padGainNode.gain.value, now);
        padGainNode.gain.linearRampToValueAtTime(0, now + ramp);
      }
      setTimeout(() => {
        try { padSource.stop(); } catch {}
        try { padSource.disconnect(); } catch {}
        try { disconnectPadPitchShifter(); } catch {}
        try { if (padGainNode) padGainNode.disconnect(); } catch {}
        padSource = null;
        padGainNode = null;
      }, (ramp + 0.05) * 1000);
    } catch {}
  }
  try {
    if (master && audioCtx && !loopSource) {
      const now = audioCtx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + Math.max(0, ramp));
    }
  } catch {}
  renderPadGrid();
}

async function startPadLoop(index) {
  return startPadLoopInternal(index, false);
}

async function startPadLoopOnce(index) {
  return startPadLoopInternal(index, true);
}

async function startPadLoopInternal(index, oneShot = false) {
  const a = padAssignments[index];
  if (!a) return;
  const effectiveOneShot = !!oneShot || a.loop === false;
  const tapPerfNow = (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0;
  const requestToken = ++padStartRequestToken;

  ensureAudio();
  if (audioCtx.state === 'suspended') { try { await audioCtx.resume(); } catch {} }
  startOutputIfNeeded();

  try { stopPlaylistPlayback(); } catch {}
  try { stopLoop(0, false); } catch {}
  try { clearPlayerPlaylistContext(); } catch {}

  // Stop any existing pad source immediately
  if (padSource) {
    try { padSource.stop(); } catch {}
    try { padSource.disconnect(); } catch {}
    try { if (padGainNode) padGainNode.disconnect(); } catch {}
    padSource = null;
    padGainNode = null;
    hidePadCountdown();
  }

  const result = await loadBufferFromPresetKey(a.presetKey);
  if (requestToken !== padStartRequestToken) return;
  if (!result || !result.buffer) {
    hidePadCountdown();
    setStatus('Pad: failed to load loop');
    return;
  }

  const buffer = result.buffer;
  const pts = computeLoopPoints(buffer);
  const playDuration = Math.max(0.01, pts.end - pts.start);
  const assignmentVolume = normalizeAssignmentVolume(a.volume, 1.0);

  padSource = audioCtx.createBufferSource();
  padSource.buffer = buffer;
  padSource.loop = !effectiveOneShot;
  padSource.loopStart = pts.start;
  padSource.loopEnd = pts.end;

  const rate = clamp(a.rate || 1.0, RATE_MIN, RATE_MAX);
  const startTime = audioCtx.currentTime;
  try { padSource.playbackRate.setValueAtTime(rate, startTime); } catch {}

  padGainNode = audioCtx.createGain();
  try {
    padGainNode.gain.cancelScheduledValues(startTime);
    padGainNode.gain.setValueAtTime(assignmentVolume, startTime);
  } catch {}

  try {
    master.gain.cancelScheduledValues(startTime);
    master.gain.setValueAtTime(volumeVal, startTime);
  } catch {}

  padSource.connect(padGainNode);
  padGainNode.connect(master);
  if (a.preservePitch) {
    connectPadPitchShifter(rate);
  } else {
    disconnectPadPitchShifter();
    try { padGainNode.disconnect(); } catch {}
    try { padGainNode.connect(master); } catch {}
  }
  if (requestToken !== padStartRequestToken) {
    try { padSource.disconnect(); } catch {}
    try { if (padGainNode) padGainNode.disconnect(); } catch {}
    return;
  }
  if (effectiveOneShot) {
    padSource.start(startTime, pts.start, playDuration);
  } else {
    padSource.start(startTime);
  }
  try {
    const startedAtPerf = (typeof performance !== 'undefined' && performance.now) ? performance.now() : 0;
    console.debug('[pads] start', {
      padIndex: index,
      pointerLatencyMs: tapPerfNow && startedAtPerf ? Math.round((startedAtPerf - tapPerfNow) * 100) / 100 : null,
      audioCtxTime: Math.round(startTime * 1000) / 1000,
      mode: effectiveOneShot ? 'one-shot' : 'loop'
    });
  } catch {}
  const effectiveLoopDuration = (pts.end - pts.start) / Math.max(0.000001, rate);
  showPadCountdown(effectiveLoopDuration, !effectiveOneShot);

  padActiveIndex = index;
  padLastPlayedIndex = index;
  padPlaying = true;
  padQueuedIndex = -1;
  padQueuedOneShot = false;
  padFinishing = !!oneShot;

  if (effectiveOneShot) {
    const sourceRef = padSource;
    const gainRef = padGainNode;
    const onEnded = () => {
      try { sourceRef.removeEventListener('ended', onEnded); } catch {}
      try { disconnectPadPitchShifter(); } catch {}
      hidePadCountdown();
      if (padSource !== sourceRef) return;
      padPlaying = false;
      padActiveIndex = -1;
      padFinishing = false;
      padSource = null;
      if (padGainNode === gainRef) padGainNode = null;
      setStatus(t('status_stopped'));
      renderPadGrid();
    };
    sourceRef.addEventListener('ended', onEnded);
  }

  setStatus(`Pad ${index + 1}: ${a.label || 'Playing'}${oneShot ? ' (final)' : ''}`);
  renderPadGrid();
}

function schedulePadSwitch(nextIndex, oneShot = false) {
  if (!padSource || !padPlaying || !audioCtx) {
    // No current playback, start directly
    if (oneShot) startPadLoopOnce(nextIndex);
    else startPadLoop(nextIndex);
    return;
  }

  // Queue the next pad; we need to wait until current loop iteration ends
  padQueuedIndex = nextIndex;
  padQueuedOneShot = !!oneShot;
  renderPadGrid();

  const a = padAssignments[padActiveIndex];
  if (!a || !padSource.buffer) { startPadLoop(nextIndex); return; }

  const buffer = padSource.buffer;
  const pts = computeLoopPoints(buffer);
  const loopDuration = pts.end - pts.start;
  if (loopDuration <= 0) { startPadLoop(nextIndex); return; }

  const rate = clamp(a.rate || 1.0, RATE_MIN, RATE_MAX);
  const now = audioCtx.currentTime;

  // Determine where we are in the current loop iteration
  // loopStart + ((currentTime - startTime) * rate) % loopDuration gives position
  // Since we can't easily get startTime, use a simpler approach:
  // Stop looping so the source plays to loopEnd and ends, then start the next.
  padSource.loop = false;
  padFinishing = true;

  const sourceRef = padSource;
  const onEnded = () => {
    try { sourceRef.removeEventListener('ended', onEnded); } catch {}
    hidePadCountdown();
    if (padQueuedIndex === nextIndex) {
      if (padQueuedOneShot) startPadLoopOnce(nextIndex);
      else startPadLoop(nextIndex);
    }
  };
  sourceRef.addEventListener('ended', onEnded);
}

function schedulePadFinish() {
  if (!padSource || !padPlaying) return;
  padFinishing = true;
  padQueuedIndex = -1;
  renderPadGrid();

  // Let current loop play to end, then stop
  padSource.loop = false;
  const sourceRef = padSource;
  const onEnded = () => {
    try { sourceRef.removeEventListener('ended', onEnded); } catch {}
    try { disconnectPadPitchShifter(); } catch {}
    hidePadCountdown();
    if (padSource !== sourceRef) return;
    padPlaying = false;
    padActiveIndex = -1;
    padFinishing = false;
    padSource = null;
    padGainNode = null;
    setStatus(t('status_stopped'));
    renderPadGrid();
  };
  sourceRef.addEventListener('ended', onEnded);
}

// ---- Pad Assignment Modal ----
let padAssignTarget = -1;
let padAssignSelectedKey = '';
let padAssignSelectedColorKey = PAD_COLOR_DEFAULT_KEY;
let padAssignPreservePitch = false;
let padAssignLoop = true;

function openPadAssignModal(padIndex) {
  padAssignTarget = padIndex;
  const existing = padAssignments[padIndex];

  const overlay = document.getElementById('padAssignOverlay');
  const title = document.getElementById('padAssignTitle');
   const displayNameInput = document.getElementById('padDisplayNameInput');
  const rateInput = document.getElementById('padRateInput');
  const volumeInput = document.getElementById('padAssignVolume');
  const volumeReadout = document.getElementById('padAssignVolumeReadout');
  const palette = document.getElementById('padColorPalette');
  const preservePitchBtn = document.getElementById('padPreservePitchBtn');
  const repeatBtn = document.getElementById('padRepeatBtn');
  const repeatLabel = document.getElementById('padRepeatLabel');

  if (!overlay) return;
  if (title) title.textContent = `Assign Pad ${padIndex + 1}`;

  padAssignSelectedKey = (existing && existing.presetKey) || '';
  initializePadPickerView(Object.keys(getPadLoopChoicesByCategory()).sort((a, b) => a.localeCompare(b)));
  renderPadLoopPicker();

  if (displayNameInput) displayNameInput.value = (existing && existing.displayName) || '';
  if (rateInput) rateInput.value = formatPadRateValue(existing && existing.rate ? existing.rate : 1.0);
  setAssignmentVolumeUI(volumeInput, volumeReadout, existing && existing.volume != null ? existing.volume : 1.0);
  padAssignPreservePitch = !!(existing && existing.preservePitch);
  if (preservePitchBtn) preservePitchBtn.setAttribute('aria-pressed', padAssignPreservePitch ? 'true' : 'false');
  padAssignLoop = existing ? existing.loop !== false : true;
  if (repeatBtn) {
    repeatBtn.setAttribute('aria-pressed', padAssignLoop ? 'true' : 'false');
    repeatBtn.setAttribute('aria-label', t('pads_repeat_label'));
    repeatBtn.title = t('pads_repeat_label');
  }
  if (repeatLabel) repeatLabel.textContent = t('pads_repeat_label');

  // Color
  padAssignSelectedColorKey = normalizePadColorKey(existing && existing.colorKey, existing && existing.color);
  if (palette) refreshPadColorPalette();
  updatePadAssignTrimButton();

  overlay.classList.remove('hidden');
  try { updateScrollState(); } catch {}
}

function closePadAssignModal() {
  const overlay = document.getElementById('padAssignOverlay');
  if (overlay) overlay.classList.add('hidden');
  padAssignTarget = -1;
  try { updateScrollState(); } catch {}
}

function savePadAssignment() {
  if (padAssignTarget < 0 || padAssignTarget >= PAD_COUNT) return;
  if (!padAssignSelectedKey) { closePadAssignModal(); return; }

   const displayNameInput = document.getElementById('padDisplayNameInput');
  const rateInput = document.getElementById('padRateInput');
  const volumeInput = document.getElementById('padAssignVolume');
   const displayName = displayNameInput ? displayNameInput.value.trim() : '';
  const rate = normalizePadRateValue(rateInput && rateInput.value, 1.0);
  if (rateInput) rateInput.value = formatPadRateValue(rate);

  // Determine label from choices
  const choices = getAllLoopChoices();
  const match = choices.find(c => c.presetKey === padAssignSelectedKey);
  const label = match ? match.label : '';

  padAssignments[padAssignTarget] = {
    presetKey: padAssignSelectedKey,
    label,
    displayName,
    rate,
    volume: readAssignmentVolumeUI(volumeInput, 1.0),
    colorKey: padAssignSelectedColorKey,
    color: resolvePadDisplayColor(padAssignSelectedColorKey),
    loop: padAssignLoop,
    preservePitch: padAssignPreservePitch
  };
  savePadAssignments();
  void warmPadAssignmentBuffer(padAssignments[padAssignTarget]);
  renderPadGrid();
  closePadAssignModal();
}

function clearPadAssignment() {
  if (padAssignTarget < 0 || padAssignTarget >= PAD_COUNT) return;
  if (padActiveIndex === padAssignTarget) stopPadPlayback();
  padAssignments[padAssignTarget] = null;
  savePadAssignments();
  renderPadGrid();
  closePadAssignModal();
}

// ---- Session Save / Recall ----
function openPadSessionSaveModal() {
  const overlay = document.getElementById('padSessionSaveOverlay');
  const input = document.getElementById('padSessionNameInput');
  if (!overlay) return;
  const now = new Date();
  const pad2 = n => String(n).padStart(2, '0');
  const suggestion = `Session ${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  if (input) { input.value = suggestion; }
  overlay.classList.remove('hidden');
  if (input) { input.focus(); input.select(); }
  try { updateScrollState(); } catch {}
}

function closePadSessionSaveModal() {
  const overlay = document.getElementById('padSessionSaveOverlay');
  if (overlay) overlay.classList.add('hidden');
  try { updateScrollState(); } catch {}
}

function confirmSavePadSession() {
  const input = document.getElementById('padSessionNameInput');
  const name = (input && input.value || '').trim();
  if (!name) { setStatus('Enter a session name.'); return; }

  const sessions = loadPadSessions();
  sessions.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name,
    createdAt: Date.now(),
    assignments: padAssignments.map(a => serializePadAssignment(a))
  });
  savePadSessions(sessions);
  closePadSessionSaveModal();
  setStatus(`Session "${name}" saved.`);
  if (activeTab === 'playlists') renderPadSessionsList();
}

function renderPadSessionsList() {
  const listEl = document.getElementById('padsSessionsList');
  if (!listEl) return;
  listEl.innerHTML = '';

  const sessions = loadPadSessions();
  if (!sessions.length) {
    const li = document.createElement('li');
    li.className = 'playlist-empty';
    const div = document.createElement('div');
    div.className = 'hint';
    div.textContent = t('pads_no_sessions');
    li.appendChild(div);
    listEl.appendChild(li);
    return;
  }

  sessions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  for (const session of sessions) {
    const li = document.createElement('li');
    li.className = 'playlist-list-row';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'playlist-list-item';

    const mainSpan = document.createElement('span');
    mainSpan.className = 'pl-item-main';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'pl-item-name';
    nameSpan.textContent = session.name;

    const countSpan = document.createElement('span');
    countSpan.className = 'pl-item-count';
    const assigned = (session.assignments || []).filter(Boolean).length;
    countSpan.textContent = `${assigned} pad${assigned !== 1 ? 's' : ''}`;

    const chevron = document.createElement('span');
    chevron.className = 'pl-item-chevron';
    chevron.textContent = '›';

    mainSpan.appendChild(nameSpan);
    btn.appendChild(mainSpan);
    btn.appendChild(countSpan);
    btn.appendChild(chevron);

    btn.addEventListener('click', () => {
      confirmRecallPadSession(session);
    });

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'playlist-list-play';
    delBtn.setAttribute('aria-label', `Delete: ${session.name}`);
    delBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmDeletePadSession(session);
    });

    li.appendChild(btn);
    li.appendChild(delBtn);
    listEl.appendChild(li);
  }
}

let pendingRecallSession = null;
let pendingDeletePadSession = null;
let pendingRecallDrumSession = null;
let pendingDeleteDrumSession = null;

function confirmRecallPadSession(session) {
  const hasAssignments = padAssignments.some(Boolean);
  if (hasAssignments) {
    pendingRecallSession = session;
    const overlay = document.getElementById('padSessionRecallOverlay');
    const text = document.getElementById('padSessionRecallText');
    if (text) text.textContent = `Replace current pad assignments with "${session.name}"?`;
    if (overlay) overlay.classList.remove('hidden');
    try { updateScrollState(); } catch {}
  } else {
    applyPadSession(session);
  }
}

function confirmDeletePadSession(session) {
  if (!session) return;
  pendingDeletePadSession = session;
  const overlay = document.getElementById('padSessionDeleteOverlay');
  const text = document.getElementById('padSessionDeleteText');
  if (text) text.textContent = `Delete session "${session.name}"?`;
  if (overlay) overlay.classList.remove('hidden');
  try { updateScrollState(); } catch {}
}

function closePadSessionDeleteModal() {
  const overlay = document.getElementById('padSessionDeleteOverlay');
  if (overlay) overlay.classList.add('hidden');
  pendingDeletePadSession = null;
  try { updateScrollState(); } catch {}
}

function confirmDeletePendingPadSession() {
  const session = pendingDeletePadSession;
  closePadSessionDeleteModal();
  if (!session || !session.id) return;
  const all = loadPadSessions();
  const filtered = all.filter(s => s.id !== session.id);
  savePadSessions(filtered);
  renderPadSessionsList();
  setStatus(`Session "${session.name}" deleted.`);
}

function applyPadSession(session) {
  if (!session || !Array.isArray(session.assignments)) return;
  for (let i = 0; i < PAD_COUNT; i++) {
    padAssignments[i] = normalizePadAssignment(session.assignments[i]);
  }
  savePadAssignments();
  try { warmAssignedPadBuffers(); } catch {}
  stopPadPlayback(0.02);
  renderPadGrid();
  setStatus(`Session "${session.name}" loaded.`);
  // Switch to player to see the pads
  switchTab('player');
}

function openDrumSessionSaveModal() {
  const overlay = document.getElementById('drumSessionSaveOverlay');
  const input = document.getElementById('drumSessionNameInput');
  if (!overlay) return;
  const now = new Date();
  const pad2 = n => String(n).padStart(2, '0');
  const suggestion = `Session ${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  if (input) input.value = suggestion;
  overlay.classList.remove('hidden');
  if (input) { input.focus(); input.select(); }
  try { updateScrollState(); } catch {}
}

function closeDrumSessionSaveModal() {
  const overlay = document.getElementById('drumSessionSaveOverlay');
  if (overlay) overlay.classList.add('hidden');
  try { updateScrollState(); } catch {}
}

function confirmSaveDrumSession() {
  const input = document.getElementById('drumSessionNameInput');
  const name = (input && input.value || '').trim();
  if (!name) { setStatus('Enter a session name.'); return; }

  const sessions = loadDrumSessions();
  sessions.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name,
    createdAt: Date.now(),
    assignments: drumAssignments.map(a => serializeDrumAssignment(a))
  });
  saveDrumSessions(sessions);
  closeDrumSessionSaveModal();
  setStatus(`Session "${name}" saved.`);
  if (activeTab === 'playlists') renderDrumSessionsList();
}

function renderDrumSessionsList() {
  const listEl = document.getElementById('drumSessionsList');
  if (!listEl) return;
  listEl.innerHTML = '';

  const sessions = loadDrumSessions();
  if (!sessions.length) {
    const li = document.createElement('li');
    li.className = 'playlist-empty';
    const div = document.createElement('div');
    div.className = 'hint';
    div.textContent = t('drum_no_sessions');
    li.appendChild(div);
    listEl.appendChild(li);
    return;
  }

  sessions.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  for (const session of sessions) {
    const li = document.createElement('li');
    li.className = 'playlist-list-row';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'playlist-list-item';

    const mainSpan = document.createElement('span');
    mainSpan.className = 'pl-item-main';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'pl-item-name';
    nameSpan.textContent = session.name;

    const countSpan = document.createElement('span');
    countSpan.className = 'pl-item-count';
    const assigned = (session.assignments || []).filter(Boolean).length;
    countSpan.textContent = `${assigned} pad${assigned !== 1 ? 's' : ''}`;

    const chevron = document.createElement('span');
    chevron.className = 'pl-item-chevron';
    chevron.textContent = '›';

    mainSpan.appendChild(nameSpan);
    btn.appendChild(mainSpan);
    btn.appendChild(countSpan);
    btn.appendChild(chevron);
    btn.addEventListener('click', () => {
      confirmRecallDrumSession(session);
    });

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'playlist-list-play';
    delBtn.setAttribute('aria-label', `Delete: ${session.name}`);
    delBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmDeleteDrumSession(session);
    });

    li.appendChild(btn);
    li.appendChild(delBtn);
    listEl.appendChild(li);
  }
}

function confirmRecallDrumSession(session) {
  const hasAssignments = drumAssignments.some(Boolean);
  if (hasAssignments) {
    pendingRecallDrumSession = session;
    const overlay = document.getElementById('drumSessionRecallOverlay');
    const text = document.getElementById('drumSessionRecallText');
    if (text) text.textContent = `Replace current drum machine assignments with "${session.name}"?`;
    if (overlay) overlay.classList.remove('hidden');
    try { updateScrollState(); } catch {}
  } else {
    applyDrumSession(session);
  }
}

function confirmDeleteDrumSession(session) {
  if (!session) return;
  pendingDeleteDrumSession = session;
  const overlay = document.getElementById('drumSessionDeleteOverlay');
  const text = document.getElementById('drumSessionDeleteText');
  if (text) text.textContent = `Delete session "${session.name}"?`;
  if (overlay) overlay.classList.remove('hidden');
  try { updateScrollState(); } catch {}
}

function closeDrumSessionDeleteModal() {
  const overlay = document.getElementById('drumSessionDeleteOverlay');
  if (overlay) overlay.classList.add('hidden');
  pendingDeleteDrumSession = null;
  try { updateScrollState(); } catch {}
}

function confirmDeletePendingDrumSession() {
  const session = pendingDeleteDrumSession;
  closeDrumSessionDeleteModal();
  if (!session || !session.id) return;
  const all = loadDrumSessions();
  const filtered = all.filter(s => s.id !== session.id);
  saveDrumSessions(filtered);
  renderDrumSessionsList();
  setStatus(`Session "${session.name}" deleted.`);
}

function applyDrumSession(session) {
  if (!session || !Array.isArray(session.assignments)) return;
  for (let i = 0; i < PAD_COUNT; i++) {
    drumAssignments[i] = normalizeDrumAssignment(session.assignments[i]);
  }
  saveDrumAssignments();
  try { warmAssignedDrumBuffers(); } catch {}
  stopDrumPlayback(true);
  renderDrumGrid();
  setStatus(`Session "${session.name}" loaded.`);
  switchTab('player');
}

function bindPadsUI() {
  const grid = document.getElementById('padsGrid');
  if (!grid) return;

  const longPressDelay = 750;
  let longPressTimer = 0;
  let longPressFired = false;
  let dblClickTimer = 0;
  let lastTapPad = -1;
  const DBL_CLICK_MS = 350;

  grid.querySelectorAll('.pad').forEach(padEl => {
    const idx = parseInt(padEl.getAttribute('data-pad'), 10) - 1;

    const startLongPress = () => {
      longPressFired = false;
      longPressTimer = setTimeout(() => {
        longPressFired = true;
        dblClickTimer = 0;
        lastTapPad = -1;
        if (padActiveIndex === idx && padPlaying) {
          stopPadPlayback(0.02);
        }
        openPadAssignModal(idx);
      }, longPressDelay);
    };

    const cancelLongPress = () => {
      if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = 0; }
    };

    const handleTap = () => {
      if (longPressFired) return;
      if (!padAssignments[idx]) return;

      const now = Date.now();
      if (lastTapPad === idx && dblClickTimer && (now - dblClickTimer) < DBL_CLICK_MS) {
        // Double tap — finish session
        dblClickTimer = 0;
        lastTapPad = -1;
        if (!padPlaying) {
          startPadLoopOnce(idx);
        } else if (padActiveIndex === idx) {
          schedulePadFinish();
        } else {
          schedulePadSwitch(idx, true);
        }
        return;
      }

      lastTapPad = idx;
      dblClickTimer = now;

      if (padActiveIndex === idx && padPlaying && !padFinishing) return;

      if (padPlaying) {
        schedulePadSwitch(idx);
      } else {
        startPadLoop(idx);
      }
    };

    padEl.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button === 0) {
        e.preventDefault();
      }
      startLongPress();
      handleTap();
    });
    padEl.addEventListener('pointerup', () => {
      cancelLongPress();
    });
    padEl.addEventListener('pointerleave', cancelLongPress);
    padEl.addEventListener('pointercancel', cancelLongPress);

    // Prevent context menu on long press
    padEl.addEventListener('contextmenu', (e) => e.preventDefault());
  });

  // Color palette
  const palette = document.getElementById('padColorPalette');
  if (palette) {
    palette.addEventListener('click', (e) => {
      const swatch = e.target.closest('.pad-color-swatch');
      if (!swatch) return;
      padAssignSelectedColorKey = normalizePadColorKey(
        swatch.getAttribute('data-color-key') || '',
        swatch.getAttribute('data-color') || ''
      );
      refreshPadColorPalette();
    });
    refreshPadColorPalette();
  }

  const padPreservePitchBtn = document.getElementById('padPreservePitchBtn');
  if (padPreservePitchBtn) {
    padPreservePitchBtn.addEventListener('click', () => {
      padAssignPreservePitch = !padAssignPreservePitch;
      padPreservePitchBtn.setAttribute('aria-pressed', padAssignPreservePitch ? 'true' : 'false');
    });
  }

  const padRepeatBtn = document.getElementById('padRepeatBtn');
  if (padRepeatBtn) {
    padRepeatBtn.addEventListener('click', () => {
      padAssignLoop = !padAssignLoop;
      padRepeatBtn.setAttribute('aria-pressed', padAssignLoop ? 'true' : 'false');
    });
  }

  const rateInput = document.getElementById('padRateInput');
  const volumeInput = document.getElementById('padAssignVolume');
  const volumeReadout = document.getElementById('padAssignVolumeReadout');
  if (rateInput) {
    const selectRateValue = () => {
      try { rateInput.select(); } catch {}
    };

    rateInput.addEventListener('input', () => {
      const cleaned = String(rateInput.value || '').replace(/,/g, '.').replace(/[^\d.]/g, '');
      if (rateInput.value !== cleaned) rateInput.value = cleaned;
    });
    rateInput.addEventListener('focus', () => {
      setTimeout(selectRateValue, 0);
    });
    rateInput.addEventListener('pointerup', () => {
      setTimeout(selectRateValue, 0);
    });
    rateInput.addEventListener('blur', () => {
      syncPadRateInput(true);
    });
    rateInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        syncPadRateInput(true);
      }
    });
  }

  if (volumeInput) {
    volumeInput.addEventListener('input', () => {
      setAssignmentVolumeUI(volumeInput, volumeReadout, readAssignmentVolumeUI(volumeInput, 1.0));
    });
  }

  // Assign modal buttons
  const saveBtn = document.getElementById('padAssignSave');
  const trimBtn = document.getElementById('padAssignTrim');
  const clearBtn = document.getElementById('padAssignClear');
  const closeBtn = document.getElementById('padAssignClose');
  if (trimBtn) trimBtn.addEventListener('click', () => { void openSelectedPadLoopInTrimmer(); });
  if (saveBtn) saveBtn.addEventListener('click', savePadAssignment);
  if (clearBtn) clearBtn.addEventListener('click', clearPadAssignment);
  if (closeBtn) closeBtn.addEventListener('click', closePadAssignModal);

  // Save Session
  const saveSessBtn = document.getElementById('padsSaveSession');
  if (saveSessBtn) saveSessBtn.addEventListener('click', openPadSessionSaveModal);

  const sessConfirm = document.getElementById('padSessionSaveConfirm');
  const sessCancel = document.getElementById('padSessionSaveCancel');
  if (sessConfirm) sessConfirm.addEventListener('click', confirmSavePadSession);
  if (sessCancel) sessCancel.addEventListener('click', closePadSessionSaveModal);

  // Recall confirmations
  const recallConfirm = document.getElementById('padSessionRecallConfirm');
  const recallCancel = document.getElementById('padSessionRecallCancel');
  if (recallConfirm) recallConfirm.addEventListener('click', () => {
    const overlay = document.getElementById('padSessionRecallOverlay');
    if (overlay) overlay.classList.add('hidden');
    if (pendingRecallSession) applyPadSession(pendingRecallSession);
    pendingRecallSession = null;
    try { updateScrollState(); } catch {}
  });
  if (recallCancel) recallCancel.addEventListener('click', () => {
    const overlay = document.getElementById('padSessionRecallOverlay');
    if (overlay) overlay.classList.add('hidden');
    pendingRecallSession = null;
    try { updateScrollState(); } catch {}
  });

  const deleteSessionConfirm = document.getElementById('padSessionDeleteConfirm');
  const deleteSessionCancel = document.getElementById('padSessionDeleteCancel');
  if (deleteSessionConfirm) deleteSessionConfirm.addEventListener('click', confirmDeletePendingPadSession);
  if (deleteSessionCancel) deleteSessionCancel.addEventListener('click', closePadSessionDeleteModal);
}

function bindDrumMachineUI() {
  const grid = document.getElementById('drumPadsGrid');
  if (!grid) return;

  const longPressDelay = 750;
  let longPressTimer = 0;
  let longPressFired = false;

  grid.querySelectorAll('.drum-pad').forEach(padEl => {
    const idx = parseInt(padEl.getAttribute('data-drum-pad'), 10) - 1;

    const startLongPress = () => {
      longPressFired = false;
      longPressTimer = setTimeout(() => {
        longPressFired = true;
        stopDrumVoicesByPad(idx, true);
        openDrumAssignModal(idx);
      }, longPressDelay);
    };

    const cancelLongPress = () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = 0;
      }
    };

    const handleTap = () => {
      if (longPressFired) return;
      if (!drumAssignments[idx]) return;
      void triggerDrumPad(idx);
    };

    padEl.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button === 0) {
        e.preventDefault();
      }
      startLongPress();
      handleTap();
    });
    padEl.addEventListener('pointerup', cancelLongPress);
    padEl.addEventListener('pointerleave', cancelLongPress);
    padEl.addEventListener('pointercancel', cancelLongPress);
    padEl.addEventListener('contextmenu', (e) => e.preventDefault());
  });

  const drumPalette = document.getElementById('drumColorPalette');
  const drumVolumeInput = document.getElementById('drumAssignVolume');
  const drumVolumeReadout = document.getElementById('drumAssignVolumeReadout');
  if (drumPalette) {
    drumPalette.addEventListener('click', (e) => {
      const swatch = e.target.closest('.pad-color-swatch');
      if (!swatch) return;
      drumAssignSelectedColorKey = normalizePadColorKey(
        swatch.getAttribute('data-color-key') || '',
        swatch.getAttribute('data-color') || ''
      );
      refreshDrumColorPalette();
    });
    refreshDrumColorPalette();
  }

  if (drumVolumeInput) {
    drumVolumeInput.addEventListener('input', () => {
      setAssignmentVolumeUI(drumVolumeInput, drumVolumeReadout, readAssignmentVolumeUI(drumVolumeInput, 1.0));
    });
  }

  const drumAssignSave = document.getElementById('drumAssignSave');
  const drumAssignTrim = document.getElementById('drumAssignTrim');
  const drumAssignClear = document.getElementById('drumAssignClear');
  const drumAssignClose = document.getElementById('drumAssignClose');
  const drumSaveSessBtn = document.getElementById('drumSaveSession');
  const drumSessConfirm = document.getElementById('drumSessionSaveConfirm');
  const drumSessCancel = document.getElementById('drumSessionSaveCancel');
  const drumRecallConfirm = document.getElementById('drumSessionRecallConfirm');
  const drumRecallCancel = document.getElementById('drumSessionRecallCancel');
  const drumDeleteConfirm = document.getElementById('drumSessionDeleteConfirm');
  const drumDeleteCancel = document.getElementById('drumSessionDeleteCancel');
  if (drumAssignTrim) drumAssignTrim.addEventListener('click', () => { void openSelectedDrumLoopInTrimmer(); });
  if (drumAssignSave) drumAssignSave.addEventListener('click', saveDrumAssignment);
  if (drumAssignClear) drumAssignClear.addEventListener('click', clearDrumAssignment);
  if (drumAssignClose) drumAssignClose.addEventListener('click', closeDrumAssignModal);
  if (drumSaveSessBtn) drumSaveSessBtn.addEventListener('click', openDrumSessionSaveModal);
  if (drumSessConfirm) drumSessConfirm.addEventListener('click', confirmSaveDrumSession);
  if (drumSessCancel) drumSessCancel.addEventListener('click', closeDrumSessionSaveModal);
  if (drumRecallConfirm) drumRecallConfirm.addEventListener('click', () => {
    const overlay = document.getElementById('drumSessionRecallOverlay');
    if (overlay) overlay.classList.add('hidden');
    if (pendingRecallDrumSession) applyDrumSession(pendingRecallDrumSession);
    pendingRecallDrumSession = null;
    try { updateScrollState(); } catch {}
  });
  if (drumRecallCancel) drumRecallCancel.addEventListener('click', () => {
    const overlay = document.getElementById('drumSessionRecallOverlay');
    if (overlay) overlay.classList.add('hidden');
    pendingRecallDrumSession = null;
    try { updateScrollState(); } catch {}
  });
  if (drumDeleteConfirm) drumDeleteConfirm.addEventListener('click', confirmDeletePendingDrumSession);
  if (drumDeleteCancel) drumDeleteCancel.addEventListener('click', closeDrumSessionDeleteModal);

  bindIslandCollapseTitle('loopTriggerTitle', 'loopTriggerCard', LOOP_TRIGGER_COLLAPSED_KEY);
  bindIslandCollapseTitle('drumMachineTitle', 'drumMachineCard', DRUM_MACHINE_COLLAPSED_KEY);
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
  const detailFavorite = document.getElementById('detailFavoriteBtn');

  const loopPickerOverlay = document.getElementById('loopPickerOverlay');
  const loopPickerList = document.getElementById('loopPickerList');
  const closeLoopPicker = document.getElementById('closeLoopPicker');
  const loopInfoFavoriteBtn = document.getElementById('loopInfoFavoriteBtn');
  const playerLoopFavBtn = document.getElementById('playerLoopFavBtn');
  const playerPlaylistFavBtn = document.getElementById('playerPlaylistFavBtn');
  const detailLoopRepsOverlay = document.getElementById('detailLoopRepsOverlay');
  const detailLoopRepsInput = document.getElementById('detailLoopRepsInput');
  const confirmDetailLoopReps = document.getElementById('confirmDetailLoopReps');
  const cancelDetailLoopReps = document.getElementById('cancelDetailLoopReps');
  const pasteBtn = document.getElementById('pasteBtn');
  const urlInput = document.getElementById('urlInput');
  const loadUrl = document.getElementById('loadUrl');
  const loadPreset = document.getElementById('loadPreset');
  const dropZone = document.getElementById('dropZone');

  // Trimmer elements
  const trimBack = document.getElementById('trimBack');
  const trimCanvas = document.getElementById('trimCanvas');
  const trimCursor = document.getElementById('trimCursor');
  const trimCursorHandle = trimCursor ? trimCursor.querySelector('.trim-playhead-handle') : null;
  const trimInHandle = document.getElementById('trimInHandle');
  const trimOutHandle = document.getElementById('trimOutHandle');
  const trimFadeInHandle = document.getElementById('trimFadeInHandle');
  const trimFadeOutHandle = document.getElementById('trimFadeOutHandle');
  const trimZoom = document.getElementById('trimZoom');
  const trimPlayTest = document.getElementById('trimPlayTest');
  const trimRepeatToggle = document.getElementById('trimRepeatToggle');
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
    try { stopPadPlayback(0); } catch {}

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
      const buf = await loadBufferFromUrl('audio/soundscapes/ambiental_synth.mp3');
      clearPlayerPlaylistContext();
      currentBuffer = buf;
      currentSourceLabel = 'ambiental_synth.mp3';
      currentPresetKey = 'builtin:audio/soundscapes/ambiental_synth.mp3';
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
  try { updateFavoritesUI(); } catch {}

  stopBtn && stopBtn.addEventListener('click', () => stopLoop(0));
  stopBtn && stopBtn.addEventListener('click', () => stopPadPlayback(0));
  stopBtn && stopBtn.addEventListener('click', () => stopDrumPlayback(true));

  // Stop should also stop playlist sequencing.
  stopBtn && stopBtn.addEventListener('click', () => {
    try { stopPlaylistPlayback(); } catch {}
  });

  const desktopVizBtn = document.getElementById('desktopVizBtn');
  desktopVizBtn && desktopVizBtn.addEventListener('click', () => toggleDesktopViz());

  const desktopVizFsBtn = document.getElementById('desktopVizFullscreenBtn');
  desktopVizFsBtn && desktopVizFsBtn.addEventListener('click', () => toggleDesktopVizFullscreen());

  // Sync fullscreen class when user exits via Escape key.
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
      const wrap = document.getElementById('desktopVizWrap');
      if (wrap) wrap.classList.remove('fullscreen');
    }
  });
  document.addEventListener('webkitfullscreenchange', () => {
    if (!document.webkitFullscreenElement) {
      const wrap = document.getElementById('desktopVizWrap');
      if (wrap) wrap.classList.remove('fullscreen');
    }
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

  detailFavorite && detailFavorite.addEventListener('click', () => {
    if (!activePlaylist || !activePlaylist.id) return;
    toggleFavoriteEntry({ kind: 'playlist', key: activePlaylist.id, label: activePlaylist.name || 'Playlist' });
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

  // Preserve-pitch toggle.
  const ppBtn = document.getElementById('preservePitchBtn');
  const ppLabel = document.querySelector('.preserve-pitch-label');
  if (ppBtn) {
    ppBtn.addEventListener('click', () => { togglePreservePitch(!preservePitch); });
  }
  if (ppLabel) {
    ppLabel.addEventListener('click', () => { togglePreservePitch(!preservePitch); });
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
        nameEl.textContent = stripFileExt(label || 'Loop');

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

    // Replace previous handlers so scrolling/reordering stays stable across re-renders.
    playlistRows.onpointermove = onMove;
    playlistRows.onpointerup = onUp;
    playlistRows.onpointercancel = onUp;

    itemRows.forEach(r => {
      const handle = r.querySelector('.pl-handle');
      if (!handle) return;
      handle.addEventListener('pointerdown', (e) => {
        // On touch devices keep the editor scrollable; only mouse initiates reorder.
        if (e.pointerType && e.pointerType !== 'mouse') return;
        if (e.button != null && e.button !== 0) return;
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

  const closeDetailLoopRepsPrompt = (reopenPicker = false) => {
    if (detailLoopRepsOverlay) hideOverlay(detailLoopRepsOverlay);
    if (reopenPicker && loopPickerOverlay) showOverlay(loopPickerOverlay);
  };

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

  loopInfoFavoriteBtn && loopInfoFavoriteBtn.addEventListener('click', () => {
    if (!loopInfoPreset) return;
    const key = getLoopFavoriteKeyForPreset(loopInfoPreset, loopInfoIsBuiltin);
    if (!key) return;
    const rawName = ((!loopInfoIsBuiltin && loopInfoPreset.id && getUploadNameOverride(loopInfoPreset.id)) || loopInfoPreset.name || 'Loop');
    toggleFavoriteEntry({ kind: 'loop', key, label: stripFileExt(rawName) });
  });

  playerLoopFavBtn && playerLoopFavBtn.addEventListener('click', () => {
    const entry = getCurrentLoopFavoriteEntry();
    if (!entry) return;
    toggleFavoriteEntry(entry);
  });

  playerPlaylistFavBtn && playerPlaylistFavBtn.addEventListener('click', () => {
    const entry = getCurrentPlaylistFavoriteEntry();
    if (!entry) return;
    toggleFavoriteEntry(entry);
  });

  if (detailLoopRepsInput) {
    detailLoopRepsInput.addEventListener('focus', () => selectTextInputValue(detailLoopRepsInput));
    detailLoopRepsInput.addEventListener('click', () => selectTextInputValue(detailLoopRepsInput));
    detailLoopRepsInput.addEventListener('input', () => {
      detailLoopRepsInput.value = String(detailLoopRepsInput.value || '').replace(/\D+/g, '');
    });
    detailLoopRepsInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      confirmDetailLoopReps && confirmDetailLoopReps.click();
      e.preventDefault();
    });
  }

  cancelDetailLoopReps && cancelDetailLoopReps.addEventListener('click', () => {
    pendingDetailLoopChoice = null;
    closeDetailLoopRepsPrompt(true);
    try {
      requestAnimationFrame(() => {
        const firstLoopBtn = loopPickerList && loopPickerList.querySelector('button');
        if (firstLoopBtn) firstLoopBtn.focus();
      });
    } catch {}
  });

  confirmDetailLoopReps && confirmDetailLoopReps.addEventListener('click', async () => {
    if (!activePlaylist || !pendingDetailLoopChoice) return;
    if (!Array.isArray(activePlaylist.items)) activePlaylist.items = [];
    const raw = detailLoopRepsInput ? String(detailLoopRepsInput.value || '') : '1';
    const reps = Math.max(1, parseInt(raw.replace(/\D+/g, ''), 10) || 1);
    const choice = pendingDetailLoopChoice;
    const item = { itemId: makePlaylistItemId(), presetKey: choice.presetKey, label: choice.label, reps, volume: 1.0 };
    activePlaylist.items.push(item);
    pendingDetailNewItemId = item.itemId;
    pendingDetailLoopChoice = null;
    closeDetailLoopRepsPrompt(false);
    try { await savePlaylistRecord(activePlaylist); } catch {}
    renderPlaylistDetail();
  });

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
      favoriteEntries = favoriteEntries.filter(entry => !(entry && entry.kind === 'playlist' && entry.key === String(id)));
      saveFavoriteEntries();
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
      try { updateFavoritesUI(); } catch {}
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
      currentPresetKey = null;
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
        currentPresetKey = null;
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
              currentPresetKey = null;
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
          currentPresetKey = `url:${text}`;
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
      currentPresetKey = null;
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
      currentPresetKey = `url:${url}`;
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
        currentPresetKey = null;
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
        currentPresetKey = `url:${maybeUrl}`;
        await startLoopFromBuffer(buf, 0.5, 0.03);
        try { userPresets.unshift({ name: maybeUrl, url: maybeUrl }); if (activeTab === 'loops') renderLoopsPage(); } catch {}
      } catch {
        setStatus('Failed to load dropped URL');
      }
    }
    });
  }

  // ---- Loop Info / Search bindings ----
  const loopInfoBack = document.getElementById('loopInfoBack');
  loopInfoBack && loopInfoBack.addEventListener('click', () => { switchTab('loops'); });

  const loopsSearch = document.getElementById('loopsSearch');
  loopsSearch && loopsSearch.addEventListener('input', () => {
    updateLoopsSearchClearButton();
    renderLoopsPage();
  });
  const loopsSearchClear = document.getElementById('loopsSearchClear');
  loopsSearchClear && loopsSearchClear.addEventListener('click', () => {
    if (!loopsSearch) return;
    loopsSearch.value = '';
    updateLoopsSearchClearButton();
    renderLoopsPage();
    try { loopsSearch.focus(); } catch {}
  });

  // ---- Trimmer bindings ----
  trimBack && trimBack.addEventListener('click', () => {
    stopTrimTest();
    clearTrimAssignmentTargets();
    switchTab('loops');
  });

  if (trimCanvas) {
    trimCanvas.addEventListener('pointerdown', handleTrimPointerDown);
    trimCanvas.addEventListener('pointermove', handleTrimPointerMove);
    trimCanvas.addEventListener('pointerup', handleTrimPointerUp);
    trimCanvas.addEventListener('pointercancel', handleTrimPointerUp);
  }

  trimInHandle && trimInHandle.addEventListener('pointerdown', handleTrimInHandlePointerDown);
  trimOutHandle && trimOutHandle.addEventListener('pointerdown', handleTrimOutHandlePointerDown);
  trimFadeInHandle && trimFadeInHandle.addEventListener('pointerdown', handleTrimFadeInHandlePointerDown);
  trimFadeOutHandle && trimFadeOutHandle.addEventListener('pointerdown', handleTrimFadeOutHandlePointerDown);
  trimInHandle && trimInHandle.addEventListener('pointermove', handleTrimPointerMove);
  trimOutHandle && trimOutHandle.addEventListener('pointermove', handleTrimPointerMove);
  trimFadeInHandle && trimFadeInHandle.addEventListener('pointermove', handleTrimPointerMove);
  trimFadeOutHandle && trimFadeOutHandle.addEventListener('pointermove', handleTrimPointerMove);
  trimInHandle && trimInHandle.addEventListener('pointerup', handleTrimPointerUp);
  trimOutHandle && trimOutHandle.addEventListener('pointerup', handleTrimPointerUp);
  trimFadeInHandle && trimFadeInHandle.addEventListener('pointerup', handleTrimPointerUp);
  trimFadeOutHandle && trimFadeOutHandle.addEventListener('pointerup', handleTrimPointerUp);
  trimInHandle && trimInHandle.addEventListener('pointercancel', handleTrimPointerUp);
  trimOutHandle && trimOutHandle.addEventListener('pointercancel', handleTrimPointerUp);
  trimFadeInHandle && trimFadeInHandle.addEventListener('pointercancel', handleTrimPointerUp);
  trimFadeOutHandle && trimFadeOutHandle.addEventListener('pointercancel', handleTrimPointerUp);

  if (trimCursorHandle) {
    trimCursorHandle.addEventListener('pointerdown', handleTrimCursorPointerDown);
    trimCursorHandle.addEventListener('pointermove', handleTrimCursorPointerMove);
    trimCursorHandle.addEventListener('pointerup', handleTrimCursorPointerUp);
    trimCursorHandle.addEventListener('pointercancel', handleTrimCursorPointerUp);
  }
  if (trimCursor) {
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
  trimRepeatToggle && trimRepeatToggle.addEventListener('click', () => {
    trimTestRepeats = !trimTestRepeats;
    updateTrimRepeatToggleButton();
    if (trimTestSource) {
      try { trimTestSource.loop = trimTestRepeats; } catch {}
    }
  });
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
  loadCollapsedCategoriesState();
  loadIslandCollapsedState();
  // Restore saved preserve-pitch preference.
  try {
    preservePitch = localStorage.getItem('seamlessplayer-preserve-pitch') === '1';
    const ppb = document.getElementById('preservePitchBtn');
    if (ppb) ppb.setAttribute('aria-pressed', preservePitch ? 'true' : 'false');
  } catch {}

  ensureAudio();
  lockViewportScale();
  bindUI();
  loadPadAssignments();
  loadDrumAssignments();
  bindPadsUI();
  bindDrumMachineUI();
  renderPadGrid();
  renderDrumGrid();
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
