#!/usr/bin/env node
// One-shot PWA asset generator for Cobraya. Adapted from luma-ai pattern.
// Generates a placeholder logo "C" on Cobraya green (#0F8B4A) background.
// Outputs:
//   public/icons/icon-{192,512}.png
//   public/icons/icon-maskable-512.png
//   public/icons/apple-touch-icon-{120,152,180}.png
//   public/splashes/splash-iphone-{1170x2532,1284x2778}.png
//   public/splashes/splash-ipad-1668x2388.png

import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'

const ROOT = resolve(fileURLToPath(import.meta.url), '../..')
const GREEN = { r: 0x0F, g: 0x8B, b: 0x4A }     // #0F8B4A (Cobraya brand)
const WHITE = { r: 0xFC, g: 0xF7, b: 0xF3 }     // off-white

function newCanvas(w, h, bg) {
  const png = new PNG({ width: w, height: h })
  for (let i = 0; i < w * h; i++) {
    const o = i * 4
    png.data[o + 0] = bg.r
    png.data[o + 1] = bg.g
    png.data[o + 2] = bg.b
    png.data[o + 3] = 255
  }
  return png
}

// Draw filled rectangle into canvas.
function fillRect(png, x, y, w, h, color) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      const px = x + dx, py = y + dy
      if (px < 0 || py < 0 || px >= png.width || py >= png.height) continue
      const o = (py * png.width + px) * 4
      png.data[o + 0] = color.r
      png.data[o + 1] = color.g
      png.data[o + 2] = color.b
      png.data[o + 3] = 255
    }
  }
}

// Draw a filled circle (anti-aliased edges).
function fillCircle(png, cx, cy, r, color) {
  const r2 = r * r
  const rInner2 = (r - 1.5) * (r - 1.5)
  for (let y = Math.floor(cy - r) - 1; y <= Math.ceil(cy + r) + 1; y++) {
    for (let x = Math.floor(cx - r) - 1; x <= Math.ceil(cx + r) + 1; x++) {
      if (x < 0 || y < 0 || x >= png.width || y >= png.height) continue
      const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy
      if (d2 > r2) continue
      let alpha = 1
      if (d2 > rInner2) alpha = Math.max(0, (r - Math.sqrt(d2)) / 1.5)
      const o = (y * png.width + x) * 4
      png.data[o + 0] = (color.r * alpha + png.data[o + 0] * (1 - alpha)) | 0
      png.data[o + 1] = (color.g * alpha + png.data[o + 1] * (1 - alpha)) | 0
      png.data[o + 2] = (color.b * alpha + png.data[o + 2] * (1 - alpha)) | 0
      png.data[o + 3] = 255
    }
  }
}

// Draw "C" shape: a circle with a notch cut out on the right.
function drawC(png, cx, cy, radius, color, bg) {
  const innerR = radius * 0.6
  fillCircle(png, cx, cy, radius, color)
  // Punch out inner circle
  fillCircle(png, cx, cy, innerR, bg)
  // Punch out right notch (rectangle) to form the "C" opening
  const notchH = radius * 0.5
  const notchW = radius * 1.1
  fillRect(png, cx, (cy - notchH / 2) | 0, notchW | 0, notchH | 0, bg)
}

function writePNG(png, outPath) {
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, PNG.sync.write(png))
  const { width, height } = png
  console.log(`  ✓ ${outPath}  (${width}x${height})`)
}

// --- pipeline -------------------------------------------------------------
console.log('Generating Cobraya PWA assets...')

// 1. PWA icons (full-bleed C glyph)
for (const size of [192, 512]) {
  const canvas = newCanvas(size, size, GREEN)
  drawC(canvas, size / 2, size / 2, size * 0.36, WHITE, GREEN)
  writePNG(canvas, resolve(ROOT, `public/icons/icon-${size}.png`))
}

// 2. Maskable 512 (smaller safe zone 80%)
{
  const canvas = newCanvas(512, 512, GREEN)
  drawC(canvas, 256, 256, 512 * 0.30, WHITE, GREEN)
  writePNG(canvas, resolve(ROOT, 'public/icons/icon-maskable-512.png'))
}

// 3. Apple touch icons
for (const size of [120, 152, 180]) {
  const canvas = newCanvas(size, size, GREEN)
  drawC(canvas, size / 2, size / 2, size * 0.32, WHITE, GREEN)
  writePNG(canvas, resolve(ROOT, `public/icons/apple-touch-icon-${size}.png`))
}

// 4. iOS splash screens
const splashes = [
  { w: 1170, h: 2532, file: 'splash-iphone-1170x2532.png' },
  { w: 1284, h: 2778, file: 'splash-iphone-1284x2778.png' },
  { w: 1668, h: 2388, file: 'splash-ipad-1668x2388.png' },
]
for (const { w, h, file } of splashes) {
  const canvas = newCanvas(w, h, GREEN)
  const short = Math.min(w, h)
  drawC(canvas, w / 2, h / 2, short * 0.18, WHITE, GREEN)
  writePNG(canvas, resolve(ROOT, `public/splashes/${file}`))
}

console.log('\nDone.')
