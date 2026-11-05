/**
 * Chart-export helper tests.
 *
 * `chartExport.js` is deliberately split so the DOM-free half can be exercised
 * in Node: colour conversion, file naming and the hand-rolled PDF writer all
 * run headless. The DOM half (`buildExportSvg`, `rasterizeSvg`) is covered in
 * the browser probe instead.
 */
import assert from 'node:assert/strict'

import { CHART_PRESETS, luminance, toGrayColor, buildPdfBytes, exportName } from '../src/client/ui/chartExport.js'

let checks = 0
function ok(label, condition, detail) {
  checks += 1
  assert.ok(condition, `${label}${detail === undefined ? '' : ` — ${detail}`}`)
}

/* --------------------------------------------------------------- presets */
ok('presets are exported', Array.isArray(CHART_PRESETS) && CHART_PRESETS.length >= 4, CHART_PRESETS.length)
ok(
  'every preset has an id and label',
  CHART_PRESETS.every((preset) => preset.id && preset.label),
)
ok(
  'fixed presets carry a positive size',
  CHART_PRESETS.filter((preset) => preset.id !== 'custom').every(
    (preset) => Number(preset.width) > 0 && Number(preset.height) > 0,
  ),
)
ok('custom preset defers the size to the dialog', CHART_PRESETS.find((preset) => preset.id === 'custom')?.width === 0)
const sizes = CHART_PRESETS.filter((preset) => preset.id !== 'custom').map((preset) => `${preset.width}x${preset.height}`)
ok('preset sizes are unique', new Set(sizes).size === sizes.length, sizes.join(','))
ok('custom preset is offered', CHART_PRESETS.some((preset) => preset.id === 'custom'))

/* -------------------------------------------------------------- luminance */
ok('white is fully bright', Math.abs(luminance(255, 255, 255) - 255) < 1e-6, luminance(255, 255, 255))
ok('black is fully dark', Math.abs(luminance(0, 0, 0)) < 1e-6, luminance(0, 0, 0))
ok('green dominates luminance', luminance(0, 255, 0) > luminance(0, 0, 255))
ok('luminance stays inside 0..255', luminance(999, 999, 999) === 255 && luminance(-5, -5, -5) === 0)

/* ------------------------------------------------------------ toGrayColor */
function toRgb(value) {
  const match = /^rgba?\(([^)]+)\)$/.exec(value)
  return match ? match[1].split(',').map((part) => Number(part.trim())) : null
}

const blue = toGrayColor('#4c7dff')
const blueChannels = toRgb(blue)
ok('hex colour becomes grey rgb()', /^rgb\(\d+, \d+, \d+\)$/.test(blue), blue)
ok('grey channels are equal', blueChannels && blueChannels[0] === blueChannels[1] && blueChannels[1] === blueChannels[2], blue)
ok('grey level matches BT.601 luminance', blueChannels && blueChannels[0] === luminance(0x4c, 0x7d, 0xff), blue)

const rgba = toGrayColor('rgba(200, 40, 40, 0.5)')
ok('rgba keeps its alpha', /^rgba\(\d+, \d+, \d+, 0\.5\)$/.test(rgba), rgba)
const rgbaChannels = toRgb(rgba)
ok('rgba channels are grey too', rgbaChannels && rgbaChannels[0] === rgbaChannels[1] && rgbaChannels[1] === rgbaChannels[2], rgba)

const shortHex = toRgb(toGrayColor('#abc'))
ok('3-digit hex is expanded to grey', shortHex !== null && shortHex[0] === luminance(0xaa, 0xbb, 0xcc), shortHex?.join(','))

for (const passthrough of ['none', 'currentColor', 'var(--df-axis)', 'url(#paint0)', 'transparent', '']) {
  ok(`non-colour value is untouched (${passthrough || 'empty'})`, toGrayColor(passthrough) === passthrough, toGrayColor(passthrough))
}

/* ------------------------------------------------------------- exportName */
const named = exportName('木材-density', 'svg')
ok('name carries prefix, timestamp and format', /^distfit-木材-density-\d{8}-\d{6}\.svg$/.test(named), named)
ok('unsafe path characters are stripped', !/[\\/:*?"<>|]/.test(exportName('a/b:c*d e', 'png')), exportName('a/b:c*d e', 'png'))
ok('empty prefix falls back to chart', /^distfit-chart-/.test(exportName('   ', 'pdf')), exportName('   ', 'pdf'))
ok('format is lower-cased', exportName('x', 'JPG').endsWith('.jpg'), exportName('x', 'JPG'))

/* ----------------------------------------------------------- buildPdfBytes */
// Smallest legal-looking JPEG payload; only the container around it is tested.
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9])
const pdf = buildPdfBytes(jpeg, 1280, 720)
ok('pdf is a byte array', pdf instanceof Uint8Array, pdf?.constructor?.name)
const text = Buffer.from(pdf).toString('latin1')
ok('pdf has a header', text.startsWith('%PDF-1.'), text.slice(0, 8))
ok('pdf embeds the jpeg stream', text.includes('/DCTDecode') && text.includes('/Subtype /Image'))
ok('pdf MediaBox is the chart size in points (1px = 0.75pt)', text.includes('/MediaBox [0 0 960 540]'), text.match(/\/MediaBox \[[^\]]+\]/)?.[0])
ok('pdf image keeps the pixel size', text.includes('/Width 1280') && text.includes('/Height 720'))
ok('pdf has a cross-reference table', text.includes('xref') && text.includes('/Root 1 0 R'))
ok('pdf is terminated', text.trimEnd().endsWith('%%EOF'))
ok('pdf stream length matches payload', text.includes(`/Length ${jpeg.length}`), text.match(/\/Length \d+/)?.[0])
ok('pdf contains no NaN', !text.includes('NaN'))

console.log(`PASS — ${checks} chart-export checks green`)
