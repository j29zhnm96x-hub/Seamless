#!/usr/bin/env node
// Usage: node scripts/generate-icons.js path/to/source.png [output-dir]
// Requires `sharp` (install with `npm install sharp`)

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const src = process.argv[2] || 'icon-source.png';
const outDir = process.argv[3] || '.';

if (!fs.existsSync(src)) {
  console.error('Source image not found:', src);
  console.error('Place your master PNG (square, 512x512 or larger) at the path above and try again.');
  process.exit(2);
}

const tasks = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-48.png', size: 48 },
  { name: 'favicon-96.png', size: 96 },
  { name: 'favicon-192.png', size: 192 },
  { name: 'favicon-512.png', size: 512 },
  { name: 'favicon.png', size: 48 }
];

(async () => {
  try {
    for (const t of tasks) {
      const outPath = path.join(outDir, t.name);
      await sharp(src)
        .resize(t.size, t.size, { fit: 'cover' })
        .png({ quality: 90 })
        .toFile(outPath);
      console.log('Wrote', outPath);
    }
    console.log('Icon generation complete. Update manifest.json if you want different filenames.');
  } catch (err) {
    console.error('Error generating icons:', err);
    process.exit(1);
  }
})();
