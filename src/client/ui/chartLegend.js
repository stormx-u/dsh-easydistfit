/**
 * chartLegend.js — React-free geometry for the in-SVG chart legend, plus the
 * defensive reading of the optional chart `style` prop.
 *
 * `charts.jsx` must draw the legend *inside* the SVG when a template asks for
 * it (otherwise the exported SVG would lose the legend, because
 * `chartExport.js` only serialises the `<svg>` node). Doing that needs exact
 * chip positions, and chip positions are the one part of the legend that is
 * worth testing head-lessly — so they live here, away from React:
 *
 *   computeLegendLayout({ items, width, height, fontSize, mode })
 *     -> { mode, entries, rows, overflow, legendBox, plotInset }
 *
 * The module is dependency-free on purpose (no React, no DOM, no imports from
 * the panel), so `scripts/chart-legend-test.mjs` can import it with plain Node.
 *
 * Coordinates are SVG user units (the charts render 1:1 with their box).
 *
 * Layout rules
 *   bottom : wrapped chip rows anchored to the bottom edge of the SVG; each
 *            chip is [8px dot][2px gap][name], chips are 14px apart, a row
 *            wraps when the next chip would leave the canvas, and
 *            `plotInset.bottom` grows so the plot leaves room for the rows.
 *   right  : one chip per row, right-aligned column; `plotInset.right` grows
 *            so the plot shrinks instead of running under the legend.
 *   none   : no entries, a zero legend box and zero insets.
 *
 * At most LEGEND_MAX_ENTRIES (12) names are shown; the rest collapse into a
 * single `+N 条` chip so a 23-distribution result page cannot flood the figure.
 * `overflow` reports both numbers (`{ shown, hidden, label }`).
 */

/** Names shown individually; everything beyond this becomes one `+N 条` chip. */
export const LEGEND_MAX_ENTRIES = 12

/** Chip geometry, all in SVG user units. */
const DOT_SIZE = 8
const DOT_GAP = 2
const CHIP_GAP = 14
const ROW_GAP = 6
const MARGIN = 8
const PAD = 6
const LEGEND_GAP = 4
const OVERFLOW_COLOR = '#9aa3ad'

const MODES = ['bottom', 'right', 'none']
const ZERO_INSET = Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 })

const round2 = (value) => {
  const rounded = Math.round(Number(value) * 100) / 100
  return Object.is(rounded, -0) ? 0 : rounded
}

function finiteOr(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function clampNumber(value, lo, hi, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(hi, Math.max(lo, n))
}

/** Code points that draw roughly one em wide (CJK, Hangul, fullwidth forms). */
function isWideCodePoint(code) {
  return (
    (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe30 && code <= 0xfe4f) ||
    (code >= 0xff00 && code <= 0xff60) ||
    (code >= 0xffe0 && code <= 0xffe6) ||
    (code >= 0x1f300 && code <= 0x1faff) ||
    (code >= 0x20000 && code <= 0x3fffd)
  )
}

/**
 * Estimated advance width of `text` at `fontSize` pixels.
 *
 * The real chart measures nothing (there is no canvas in the export path), so
 * this is a deterministic estimate: CJK/fullwidth glyphs count as one em,
 * ASCII and friends as 0.56 em, spaces as 0.32 em. Erring slightly wide is
 * deliberate — a chip that is a few pixels too wide still looks fine, whereas
 * one that is too narrow ellipsises the series name.
 */
export function legendTextWidth(text, fontSize) {
  const size = Math.max(1, finiteOr(fontSize, 11))
  let width = 0
  for (const char of String(text ?? '')) {
    if (char === ' ' || char === '\t' || char === '\u00a0') {
      width += size * 0.32
      continue
    }
    const code = char.codePointAt(0)
    width += isWideCodePoint(code) ? size : size * 0.56
  }
  return round2(width)
}

function normalizeMode(mode) {
  return MODES.includes(mode) ? mode : 'none'
}

function normalizeItem(raw, index) {
  const item = raw && typeof raw === 'object' ? raw : { name: raw }
  const name = String(item.name ?? item.label ?? '').trim()
  return {
    name: name || `图例 ${index + 1}`,
    color: typeof item.color === 'string' && item.color ? item.color : 'currentColor',
    active: item.active === true,
  }
}

function emptyLayout(mode, overflow) {
  return {
    mode,
    entries: [],
    rows: 0,
    overflow,
    legendBox: { x: 0, y: 0, width: 0, height: 0 },
    plotInset: { top: 0, right: 0, bottom: 0, left: 0 },
  }
}

/**
 * Deterministic legend geometry for the SVG legend.
 *
 * @param input.items    - `[{ name, color?, active? }]` (plain strings allowed).
 * @param input.width    - SVG width in user units.
 * @param input.height   - SVG height in user units.
 * @param input.fontSize - chip text size in user units (charts pass
 *                         `11 * fontScale * legendSize`).
 * @param input.mode     - `'bottom' | 'right' | 'none'` (unknown -> 'none').
 * @returns {{
 *   mode: string,
 *   entries: Array<{ name: string, color: string, active: boolean,
 *                    x: number, y: number, w: number, h: number }>,
 *   rows: number,
 *   overflow: { shown: number, hidden: number, label: string },
 *   legendBox: { x: number, y: number, width: number, height: number },
 *   plotInset: { top: number, right: number, bottom: number, left: number },
 * }}
 *   `entries[].y` is the chip's top edge; the dot centre sits at
 *   `y + h / 2`. `plotInset` is how much the plot rectangle must give up on
 *   that side so the legend never overlaps it.
 */
export function computeLegendLayout(input) {
  const raw = input && typeof input === 'object' ? input : {}
  const mode = normalizeMode(raw.mode)
  const width = Math.max(60, Math.round(finiteOr(raw.width, 640)))
  const height = Math.max(60, Math.round(finiteOr(raw.height, 320)))
  const fontSize = clampNumber(raw.fontSize, 6, 96, 11)
  const source = Array.isArray(raw.items) ? raw.items : []

  const items = []
  for (let i = 0; i < source.length; i += 1) {
    items.push(normalizeItem(source[i], i))
  }

  const shown = Math.min(items.length, LEGEND_MAX_ENTRIES)
  const hidden = Math.max(0, items.length - shown)
  const overflow = {
    shown,
    hidden,
    label: hidden > 0 ? `+${hidden} 条` : '',
  }

  if (mode === 'none' || items.length === 0) return emptyLayout(mode, overflow)

  const chipHeight = round2(Math.max(DOT_SIZE + 4, fontSize * 1.5))
  const rowHeight = round2(chipHeight + ROW_GAP)
  const chips = items.slice(0, shown)
  if (hidden > 0) {
    chips.push({ name: overflow.label, color: OVERFLOW_COLOR, active: false, overflow: true })
  }

  const chipWidth = (chip) => round2(DOT_SIZE + DOT_GAP + legendTextWidth(chip.name, fontSize))

  if (mode === 'right') {
    let widest = 0
    for (const chip of chips) widest = Math.max(widest, chipWidth(chip))
    const boxWidth = round2(widest + PAD * 2)
    const boxX = round2(Math.max(0, width - boxWidth))
    const contentHeight = round2(chips.length * chipHeight + Math.max(0, chips.length - 1) * ROW_GAP)
    const boxHeight = round2(contentHeight + PAD)
    const boxY = round2(Math.max(0, (height - boxHeight) / 2))
    const entries = chips.map((chip, index) => ({
      name: chip.name,
      color: chip.color,
      active: chip.active === true,
      x: round2(boxX + PAD),
      y: round2(boxY + PAD / 2 + index * rowHeight),
      w: chipWidth(chip),
      h: chipHeight,
    }))
    return {
      mode,
      entries,
      rows: entries.length,
      overflow,
      legendBox: { x: boxX, y: boxY, width: boxWidth, height: boxHeight },
      plotInset: { top: 0, right: round2(boxWidth + LEGEND_GAP), bottom: 0, left: 0 },
    }
  }

  // bottom: greedy wrap, then anchor the whole band to the bottom edge.
  const placed = []
  let x = MARGIN
  let row = 0
  for (const chip of chips) {
    const w = chipWidth(chip)
    if (x > MARGIN && x + w > width - MARGIN) {
      row += 1
      x = MARGIN
    }
    placed.push({ chip, x: round2(x), row, w })
    x = round2(x + w + CHIP_GAP)
  }
  const rows = row + 1
  const contentHeight = round2(rows * chipHeight + Math.max(0, rows - 1) * ROW_GAP)
  const boxHeight = round2(contentHeight + PAD)
  const boxY = round2(Math.max(0, height - boxHeight))
  const entries = placed.map((entry) => ({
    name: entry.chip.name,
    color: entry.chip.color,
    active: entry.chip.active === true,
    x: entry.x,
    y: round2(boxY + PAD / 2 + entry.row * rowHeight),
    w: entry.w,
    h: chipHeight,
  }))
  return {
    mode,
    entries,
    rows,
    overflow,
    legendBox: { x: 0, y: boxY, width, height: boxHeight },
    plotInset: { ...ZERO_INSET, bottom: round2(boxHeight + LEGEND_GAP) },
  }
}

/* ───────────────────────────────── style prop ─────────────────────────────── */

/**
 * Fallbacks that reproduce the pre-template chart look. `null` means "the
 * caller said nothing": the chart then leaves the attribute to the panel
 * stylesheet instead of overriding it with a guessed value.
 */
export const CHART_STYLE_FALLBACK = Object.freeze({
  fontStack: '',
  fontScale: 1,
  strokeScale: 1,
  palette: null,
  grid: true,
  axes: 'L',
  legend: 'bottom',
  legendSize: 1,
  title: '',
  barOpacity: null,
  barEdge: null,
  barTone: null,
  barGap: null,
  barRadius: null,
  barColor: null,
  pointSize: 1,
})

const TONES = ['soft', 'medium', 'bold', 'outline']

function optionalNumber(value, lo, hi) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return round2(Math.min(hi, Math.max(lo, n)))
}

/** `#rgb` / `#rrggbb` passthrough (lowercased); anything else = "not specified". */
function optionalColor(value) {
  if (typeof value !== 'string') return null
  const raw = value.trim().toLowerCase()
  if (/^#[0-9a-f]{3}$/.test(raw)) return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`
  return /^#[0-9a-f]{6}$/.test(raw) ? raw : null
}

/**
 * Defensive reader for the optional `style` prop.
 *
 * Every key may be missing, so each one falls back to the current look.
 * `style.palette` is expected to be a resolved colour array (what
 * `chartStyle.js#chartStyleProps` returns); a string palette key is ignored
 * here because resolving it would mean importing the Lead-owned module.
 *
 * @param input - the `style` prop, or anything else.
 * @returns a complete, safe style record (never `null`).
 */
export function resolveChartStyle(input) {
  const raw = input && typeof input === 'object' ? input : {}
  const paletteRaw = Array.isArray(raw.palette) ? raw.palette : []
  const palette = paletteRaw.filter((color) => typeof color === 'string' && color.length > 0)
  const barEdge = typeof raw.barEdge === 'boolean' ? raw.barEdge : null
  return {
    fontStack: typeof raw.fontStack === 'string' ? raw.fontStack.trim() : CHART_STYLE_FALLBACK.fontStack,
    fontScale: clampNumber(raw.fontScale, 0.5, 6, CHART_STYLE_FALLBACK.fontScale),
    strokeScale: clampNumber(raw.strokeScale, 0.3, 6, CHART_STYLE_FALLBACK.strokeScale),
    palette: palette.length > 0 ? palette.slice() : CHART_STYLE_FALLBACK.palette,
    grid: typeof raw.grid === 'boolean' ? raw.grid : CHART_STYLE_FALLBACK.grid,
    axes: raw.axes === 'box' ? 'box' : 'L',
    legend: raw.legend === 'none' ? 'none' : raw.legend === 'right' ? 'right' : 'bottom',
    legendSize: clampNumber(raw.legendSize, 0.5, 2.5, CHART_STYLE_FALLBACK.legendSize),
    title: String(raw.title ?? '').slice(0, 64),
    barOpacity: optionalNumber(raw.barOpacity, 0.05, 1),
    barEdge,
    barTone: TONES.includes(raw.barTone) ? raw.barTone : CHART_STYLE_FALLBACK.barTone,
    barGap: optionalNumber(raw.barGap, 0, 40),
    barRadius: optionalNumber(raw.barRadius, 0, 40),
    barColor: optionalColor(raw.barColor),
    pointSize: clampNumber(raw.pointSize, 0.2, 3, CHART_STYLE_FALLBACK.pointSize),
  }
}
