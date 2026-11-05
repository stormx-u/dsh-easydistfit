/**
 * In-SVG legend geometry tests (plain Node, no browser).
 *
 * `src/client/ui/chartLegend.js` owns the deterministic part of the legend:
 * chip wrapping, the `+N 条` overflow chip, the reserved plot insets and the
 * defensive reading of the chart `style` prop. Everything there is pure, so it
 * is tested here instead of in the sandbox GUI probe.
 *
 *   node scripts/chart-legend-test.mjs
 *
 * Prints one PASS / FAIL line per check and exits non-zero on any failure.
 */
import assert from 'node:assert/strict'

import {
  CHART_STYLE_FALLBACK,
  LEGEND_MAX_ENTRIES,
  computeLegendLayout,
  legendTextWidth,
  resolveChartStyle,
} from '../src/client/ui/chartLegend.js'

let checks = 0
let failed = 0

function check(label, run) {
  checks += 1
  try {
    const detail = run()
    console.log(`PASS  ${label}${detail === undefined ? '' : ` — ${detail}`}`)
  } catch (error) {
    failed += 1
    console.log(`FAIL  ${label} — ${error && error.message ? error.message : error}`)
  }
}

/** Realistic series names: long enough that 13 of them must wrap. */
const NAMES = [
  'Normal (μ, σ)',
  'Weibull (3P)',
  'Lognormal (3P)',
  'Gamma (3P)',
  'Beta (4P)',
  'Exponential (2P)',
  'Rayleigh (2P)',
  'Inverse Gaussian',
  'Log-Logistic (3P)',
  'Lomax (Pareto II)',
  'Burr XII (4P)',
  'Fatigue Life (BS)',
  'Nakagami (3P)',
]
const ITEMS = NAMES.map((name, index) => ({ name, color: `#${(index + 3).toString(16).repeat(6)}`, active: index === 0 }))

const BASE = { width: 640, height: 320, fontSize: 11 }

/* ───────────────────────────── bottom mode ───────────────────────────────── */

const bottom = computeLegendLayout({ ...BASE, items: ITEMS, mode: 'bottom' })

check('bottom: 13 items wrap into at least two rows', () => {
  assert.ok(bottom.rows >= 2, `rows=${bottom.rows}`)
  return `rows=${bottom.rows}`
})

check('bottom: overflow names 12 shown', () => {
  assert.equal(bottom.overflow.shown, 12)
  return `shown=${bottom.overflow.shown}`
})

check('bottom: overflow names 1 hidden', () => {
  assert.equal(bottom.overflow.hidden, 1)
  return `hidden=${bottom.overflow.hidden}`
})

check('bottom: overflow label is the Chinese chip text', () => {
  assert.equal(bottom.overflow.label, '+1 条')
  return bottom.overflow.label
})

check('bottom: 12 names + 1 overflow chip are laid out', () => {
  assert.equal(bottom.entries.length, LEGEND_MAX_ENTRIES + 1)
  assert.ok(bottom.entries.some((entry) => entry.name === '+1 条'))
  return `entries=${bottom.entries.length}`
})

check('bottom: legend box is anchored to the bottom edge', () => {
  assert.equal(bottom.legendBox.y + bottom.legendBox.height, BASE.height)
  assert.equal(bottom.legendBox.x, 0)
  assert.equal(bottom.legendBox.width, BASE.width)
  return `box=${bottom.legendBox.width}×${bottom.legendBox.height}`
})

check('bottom: every chip stays inside the canvas horizontally', () => {
  for (const entry of bottom.entries) {
    assert.ok(entry.x >= 0, `x=${entry.x}`)
    assert.ok(entry.x + entry.w <= BASE.width, `${entry.name}: x+w=${entry.x + entry.w}`)
  }
  return `width ${BASE.width}`
})

check('bottom: reported rows equal the number of distinct chip rows', () => {
  const distinct = new Set(bottom.entries.map((entry) => entry.y))
  assert.equal(distinct.size, bottom.rows)
  return `${distinct.size} rows`
})

check('bottom: chips stay inside the legend box vertically', () => {
  const boxBottom = bottom.legendBox.y + bottom.legendBox.height
  for (const entry of bottom.entries) {
    assert.ok(entry.y >= bottom.legendBox.y, `${entry.name}: y=${entry.y}`)
    assert.ok(entry.y + entry.h <= boxBottom, `${entry.name}: bottom=${entry.y + entry.h}`)
  }
  return `box bottom=${boxBottom}`
})

check('bottom: plotInset reserves height below the plot only', () => {
  assert.equal(bottom.plotInset.top, 0)
  assert.equal(bottom.plotInset.left, 0)
  assert.equal(bottom.plotInset.right, 0)
  assert.ok(bottom.plotInset.bottom >= bottom.legendBox.height + 4)
  assert.ok(bottom.plotInset.bottom < BASE.height)
  return `bottom inset=${bottom.plotInset.bottom}`
})

check('bottom: a narrow canvas wraps into more rows', () => {
  const narrow = computeLegendLayout({ ...BASE, width: 320, items: ITEMS, mode: 'bottom' })
  assert.ok(narrow.rows > bottom.rows, `narrow=${narrow.rows} wide=${bottom.rows}`)
  return `narrow rows=${narrow.rows}`
})

/* ────────────────────────────── right mode ───────────────────────────────── */

const right = computeLegendLayout({ ...BASE, items: ITEMS, mode: 'right' })

check('right: one row per entry (12 names + overflow)', () => {
  assert.equal(right.rows, LEGEND_MAX_ENTRIES + 1)
  assert.equal(right.entries.length, right.rows)
  return `rows=${right.rows}`
})

check('right: every chip gets its own row', () => {
  const distinct = new Set(right.entries.map((entry) => entry.y))
  assert.equal(distinct.size, right.entries.length)
  const tallest = Math.max(...right.entries.map((entry) => entry.h))
  assert.ok(right.entries.every((entry) => entry.h === tallest))
  return `${distinct.size} distinct y`
})

check('right: reserves horizontal space so the plot shrinks', () => {
  assert.ok(right.plotInset.right >= right.legendBox.width, `inset=${right.plotInset.right}`)
  assert.equal(right.plotInset.bottom, 0)
  assert.equal(right.plotInset.top, 0)
  assert.equal(right.plotInset.left, 0)
  assert.ok(right.plotInset.right < BASE.width / 2, `inset=${right.plotInset.right}`)
  return `right inset=${right.plotInset.right}`
})

check('right: column is anchored to the right edge', () => {
  assert.equal(right.legendBox.x + right.legendBox.width, BASE.width)
  return `x=${right.legendBox.x} w=${right.legendBox.width}`
})

check('right: chips stay inside the reserved column', () => {
  for (const entry of right.entries) {
    assert.ok(entry.x >= right.legendBox.x, `${entry.name}: x=${entry.x}`)
    assert.ok(entry.x + entry.w <= right.legendBox.x + right.legendBox.width, `${entry.name}: right edge`)
  }
  return `${right.entries.length} chips`
})

/* ───────────────────────── determinism / scaling ─────────────────────────── */

check('layout is deterministic across two calls', () => {
  const first = computeLegendLayout({ ...BASE, items: ITEMS, mode: 'bottom' })
  const second = computeLegendLayout({ ...BASE, items: ITEMS, mode: 'bottom' })
  assert.deepEqual(first, second)
  return 'deep equal'
})

check('longer names widen the chips and the right column', () => {
  const short = computeLegendLayout({ width: 640, height: 320, fontSize: 11, mode: 'right', items: [{ name: 'X', color: '#111111' }] })
  const long = computeLegendLayout({
    width: 640,
    height: 320,
    fontSize: 11,
    mode: 'right',
    items: [{ name: 'Log-Logistic with three parameters', color: '#111111' }],
  })
  assert.ok(long.entries[0].w > short.entries[0].w)
  assert.ok(long.legendBox.width > short.legendBox.width)
  return `${short.entries[0].w} -> ${long.entries[0].w}`
})

check('fontSize scales the chip widths up', () => {
  const small = computeLegendLayout({ width: 640, height: 320, fontSize: 11, mode: 'bottom', items: [{ name: 'Weibull (3P)' }] })
  const large = computeLegendLayout({ width: 640, height: 320, fontSize: 22, mode: 'bottom', items: [{ name: 'Weibull (3P)' }] })
  assert.ok(large.entries[0].w > small.entries[0].w * 1.5, `${small.entries[0].w} -> ${large.entries[0].w}`)
  assert.ok(large.entries[0].h > small.entries[0].h)
  return `${small.entries[0].w} -> ${large.entries[0].w}`
})

check('CJK text is measured wider than ASCII of the same length', () => {
  // Same code-point count: CJK glyphs are one em wide, Latin roughly 0.56 em.
  assert.ok(legendTextWidth('分布图例', 11) > legendTextWidth('abcd', 11))
  assert.equal(legendTextWidth('分布图例', 11), legendTextWidth('分布图例', 11))
  return `${legendTextWidth('分布图例', 11)} > ${legendTextWidth('abcd', 11)}`
})


/* ─────────────────────── empty / defensive input ─────────────────────────── */

check('zero items -> zero legend box and zero insets (bottom)', () => {
  const layout = computeLegendLayout({ ...BASE, items: [], mode: 'bottom' })
  assert.equal(layout.entries.length, 0)
  assert.equal(layout.rows, 0)
  assert.equal(layout.legendBox.height, 0)
  assert.equal(layout.legendBox.width, 0)
  assert.deepEqual(layout.plotInset, { top: 0, right: 0, bottom: 0, left: 0 })
  return 'height=0'
})

check('zero items -> zero legend box and zero insets (right)', () => {
  const layout = computeLegendLayout({ ...BASE, items: [], mode: 'right' })
  assert.equal(layout.legendBox.width, 0)
  assert.equal(layout.legendBox.height, 0)
  assert.deepEqual(layout.plotInset, { top: 0, right: 0, bottom: 0, left: 0 })
  return 'width=0'
})

check('mode none renders nothing', () => {
  const layout = computeLegendLayout({ ...BASE, items: ITEMS, mode: 'none' })
  assert.equal(layout.mode, 'none')
  assert.equal(layout.entries.length, 0)
  assert.equal(layout.rows, 0)
  assert.deepEqual(layout.plotInset, { top: 0, right: 0, bottom: 0, left: 0 })
  return 'no entries'
})

check('missing / garbage input degrades to an empty layout', () => {
  for (const input of [undefined, null, {}, { items: 'nope', mode: 'sideways', width: NaN, height: -4, fontSize: 'huge' }]) {
    const layout = computeLegendLayout(input)
    assert.equal(layout.mode, 'none')
    assert.equal(layout.entries.length, 0)
    assert.equal(layout.legendBox.height, 0)
  }
  return '4 inputs'
})

check('plain string items are accepted as names', () => {
  const layout = computeLegendLayout({ width: 640, height: 320, fontSize: 11, mode: 'bottom', items: ['Normal', 'Weibull'] })
  assert.equal(layout.entries.length, 2)
  assert.equal(layout.entries[0].name, 'Normal')
  return '2 names'
})

/* ───────────────────────────── style prop reader ─────────────────────────── */

check('resolveChartStyle fills every missing key with the current look', () => {
  const style = resolveChartStyle(undefined)
  assert.equal(style.fontScale, 1)
  assert.equal(style.strokeScale, 1)
  assert.equal(style.grid, true)
  assert.equal(style.axes, 'L')
  assert.equal(style.legend, 'bottom')
  assert.equal(style.legendSize, 1)
  assert.equal(style.pointSize, 1)
  assert.equal(style.title, '')
  assert.equal(style.barOpacity, null)
  assert.equal(style.barEdge, null)
  assert.equal(style.palette, null)
  assert.deepEqual(style, { ...CHART_STYLE_FALLBACK })
  return 'defaults'
})

check('resolveChartStyle clamps hostile values and keeps a palette array', () => {
  const style = resolveChartStyle({
    fontScale: 99,
    strokeScale: -2,
    grid: false,
    axes: 'box',
    legend: 'right',
    legendSize: 9,
    title: 'x'.repeat(200),
    barOpacity: 4,
    barEdge: false,
    pointSize: 0,
    palette: ['#111111', 42, '#222222'],
  })
  assert.equal(style.fontScale, 6)
  assert.equal(style.strokeScale, 0.3)
  assert.equal(style.grid, false)
  assert.equal(style.axes, 'box')
  assert.equal(style.legend, 'right')
  assert.equal(style.legendSize, 2.5)
  assert.equal(style.title.length, 64)
  assert.equal(style.barOpacity, 1)
  assert.equal(style.barEdge, false)
  assert.equal(style.pointSize, 0.2)
  assert.deepEqual(style.palette, ['#111111', '#222222'])
  return 'clamped'
})

check('resolveChartStyle keeps an explicit empty palette as "use module PALETTE"', () => {
  assert.equal(resolveChartStyle({ palette: [] }).palette, null)
  assert.equal(resolveChartStyle({ palette: 'cvd' }).palette, null, 'a palette *key* is not resolved here')
  return 'null'
})

check('every layout mode keeps the legend clear of the plot rectangle', () => {
  for (const mode of ['bottom', 'right']) {
    const layout = computeLegendLayout({ ...BASE, items: ITEMS, mode })
    assert.ok(layout.plotInset.bottom + layout.plotInset.top < BASE.height, `${mode}: vertical insets`)
    assert.ok(layout.plotInset.left + layout.plotInset.right < BASE.width, `${mode}: horizontal insets`)
    // The reserved band must be non-trivial, otherwise the legend would overlap.
    assert.ok(layout.legendBox.height > 0 && layout.legendBox.width > 0, `${mode}: empty box`)
  }
  return 'bottom + right'
})

check('bar look: colour and wide gap/radius survive the reader', () => {
  const style = resolveChartStyle({ barColor: '#7A9E6B', barGap: 32, barRadius: 40, barTone: 'bold' })
  assert.equal(style.barColor, '#7a9e6b')
  assert.equal(style.barGap, 32)
  assert.equal(style.barRadius, 40)
  assert.equal(resolveChartStyle({ barGap: 999 }).barGap, 40, 'gap clamps at 40')
  assert.equal(resolveChartStyle({ barRadius: -5 }).barRadius, 0, 'radius clamps at 0')
  assert.equal(resolveChartStyle({ barColor: 'not-a-colour' }).barColor, null)
  assert.equal(resolveChartStyle({ barColor: '#abc' }).barColor, '#aabbcc', 'short hex expands')
  return 'colour + 0–40 range'
})

/* ───────────────────────────────── summary ───────────────────────────────── */

console.log('')
if (failed > 0) {
  console.log(`FAIL — ${failed} of ${checks} chart-legend checks failed`)
  process.exitCode = 1
} else {
  console.log(`PASS — ${checks} chart-legend checks green`)
}
