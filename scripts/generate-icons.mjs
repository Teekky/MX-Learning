/**
 * Generate the PWA icon set — `node scripts/generate-icons.mjs`.
 *
 * Everything is drawn procedurally and encoded with Node's built-in zlib,
 * so there is no image dependency to install and no binary asset to keep
 * in sync with the design tokens: change the palette here (or in
 * src/tokens.css) and re-run.
 *
 * The mark is a flashcard with a hard offset shadow — the same "soft
 * brutalism" language as the UI: ink stroke, no blur, cobalt ground.
 *
 * Outputs into public/:
 *   pwa-192x192.png          launcher icon
 *   pwa-512x512.png          splash / high-density
 *   pwa-maskable-512x512.png Android adaptive icon (art inside the 80% safe zone)
 *   favicon.svg              same mark, vector, for the browser tab
 */

import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(HERE, '..', 'public')

/* ------------------------------------------------------------------ */
/*  Palette (mirrors src/tokens.css)                                   */
/* ------------------------------------------------------------------ */

const COBALT = [27, 77, 255, 255]
const PAPER = [247, 243, 238, 255]
const INK = [26, 22, 20, 255]

/* ------------------------------------------------------------------ */
/*  Tiny software rasteriser                                           */
/* ------------------------------------------------------------------ */

/** Samples per pixel per axis — 4×4 supersampling gives clean curves. */
const SS = 4

function createCanvas(size) {
  return { size, data: new Uint8Array(size * size * 4) }
}

/** Signed-distance test for a rounded rectangle, in canvas units. */
function insideRoundRect(px, py, x, y, w, h, r) {
  const cx = Math.min(Math.max(px, x + r), x + w - r)
  const cy = Math.min(Math.max(py, y + r), y + h - r)
  if (px >= x + r && px <= x + w - r) return py >= y && py <= y + h
  if (py >= y + r && py <= y + h - r) return px >= x && px <= x + w
  const dx = px - cx
  const dy = py - cy
  return dx * dx + dy * dy <= r * r
}

/** Source-over composite of `rgba` onto the pixel at (ix, iy) with `coverage`. */
function blend(canvas, ix, iy, rgba, coverage) {
  if (coverage <= 0) return
  const i = (iy * canvas.size + ix) * 4
  const a = (rgba[3] / 255) * coverage
  const d = canvas.data
  const dstA = d[i + 3] / 255
  const outA = a + dstA * (1 - a)
  if (outA === 0) return
  for (let c = 0; c < 3; c++) {
    d[i + c] = Math.round((rgba[c] * a + d[i + c] * dstA * (1 - a)) / outA)
  }
  d[i + 3] = Math.round(outA * 255)
}

/** Fill a rounded rect, anti-aliased by supersampling. */
function fillRoundRect(canvas, x, y, w, h, r, rgba) {
  const x0 = Math.max(0, Math.floor(x - 1))
  const y0 = Math.max(0, Math.floor(y - 1))
  const x1 = Math.min(canvas.size - 1, Math.ceil(x + w + 1))
  const y1 = Math.min(canvas.size - 1, Math.ceil(y + h + 1))
  const step = 1 / SS
  const total = SS * SS
  for (let iy = y0; iy <= y1; iy++) {
    for (let ix = x0; ix <= x1; ix++) {
      let hits = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = ix + (sx + 0.5) * step
          const py = iy + (sy + 0.5) * step
          if (insideRoundRect(px, py, x, y, w, h, r)) hits++
        }
      }
      blend(canvas, ix, iy, rgba, hits / total)
    }
  }
}

/* ------------------------------------------------------------------ */
/*  The mark                                                           */
/* ------------------------------------------------------------------ */

/**
 * Draw the flashcard mark.
 *
 * @param inset fraction of the canvas kept empty around the art. Android
 *   adaptive icons crop to a circle of ~80% width, so maskable variants
 *   pass a larger inset to keep the card inside the safe zone.
 */
function drawMark(canvas, { inset = 0.14, background = COBALT } = {}) {
  const S = canvas.size

  // Full-bleed ground — maskable icons must have no transparent corners.
  fillRoundRect(canvas, 0, 0, S, S, 0, background)

  const pad = S * inset
  const w = S - pad * 2
  const h = w * 0.78
  const x = pad
  const y = (S - h) / 2
  const r = w * 0.14
  const offset = S * 0.045 // the hard shadow's displacement

  // 1. Hard offset shadow, in ink.
  fillRoundRect(canvas, x + offset, y + offset, w, h, r, INK)
  // 2. Ink stroke: a slightly larger card behind the paper one.
  const stroke = S * 0.018
  fillRoundRect(canvas, x - stroke, y - stroke, w + stroke * 2, h + stroke * 2, r + stroke, INK)
  // 3. The card face.
  fillRoundRect(canvas, x, y, w, h, r, PAPER)

  // 4. Content lines: one cobalt "headword", two ink "definition" rules.
  const lineX = x + w * 0.14
  const lineH = h * 0.115
  const gap = h * 0.1
  const topY = y + h * 0.22
  fillRoundRect(canvas, lineX, topY, w * 0.52, lineH, lineH / 2, COBALT)
  fillRoundRect(canvas, lineX, topY + lineH + gap, w * 0.72, lineH * 0.62, lineH * 0.31, INK)
  fillRoundRect(canvas, lineX, topY + (lineH + gap) * 1.75, w * 0.44, lineH * 0.62, lineH * 0.31, INK)
}

/* ------------------------------------------------------------------ */
/*  PNG encoding                                                       */
/* ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePng(canvas) {
  const { size, data } = canvas
  // Filter byte 0 (None) in front of every scanline.
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1)
    raw[rowStart] = 0
    Buffer.from(data.buffer, y * size * 4, size * 4).copy(raw, rowStart + 1)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  ihdr[10] = 0 // deflate
  ihdr[11] = 0 // adaptive filtering
  ihdr[12] = 0 // no interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ------------------------------------------------------------------ */
/*  Vector twin, for the browser tab                                   */
/* ------------------------------------------------------------------ */

function faviconSvg() {
  const rgb = (c) => `rgb(${c[0]} ${c[1]} ${c[2]})`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="MX Learning">
  <rect width="512" height="512" rx="96" fill="${rgb(COBALT)}"/>
  <g transform="translate(72 96)">
    <rect x="23" y="23" width="345" height="269" rx="48" fill="${rgb(INK)}"/>
    <rect x="-9" y="-9" width="381" height="305" rx="57" fill="${rgb(INK)}"/>
    <rect x="0" y="0" width="363" height="287" rx="48" fill="${rgb(PAPER)}"/>
    <rect x="51" y="63" width="189" height="33" rx="17" fill="${rgb(COBALT)}"/>
    <rect x="51" y="125" width="261" height="21" rx="10" fill="${rgb(INK)}"/>
    <rect x="51" y="176" width="160" height="21" rx="10" fill="${rgb(INK)}"/>
  </g>
</svg>
`
}

/* ------------------------------------------------------------------ */
/*  Run                                                                */
/* ------------------------------------------------------------------ */

mkdirSync(OUT_DIR, { recursive: true })

const targets = [
  { file: 'pwa-192x192.png', size: 192, inset: 0.14 },
  { file: 'pwa-512x512.png', size: 512, inset: 0.14 },
  // Adaptive icons are cropped hard; keep the art well inside the safe zone.
  { file: 'pwa-maskable-512x512.png', size: 512, inset: 0.24 },
]

for (const t of targets) {
  const canvas = createCanvas(t.size)
  drawMark(canvas, { inset: t.inset })
  const png = encodePng(canvas)
  writeFileSync(join(OUT_DIR, t.file), png)
  console.log(`  ✓ ${t.file}  ${(png.length / 1024).toFixed(1)} KB`)
}

writeFileSync(join(OUT_DIR, 'favicon.svg'), faviconSvg(), 'utf8')
console.log('  ✓ favicon.svg')
console.log('\nIcons written to public/.')
