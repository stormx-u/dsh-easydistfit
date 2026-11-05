/**
 * charts.jsx — the DistFit workbench's hand-written SVG charts (SPEC §3).
 *
 * React 18 + plain SVG only, no chart library. Geometry/formatting comes from
 * `./chartkit.js`; series colors come from props or `PALETTE` (owned by the
 * Lead's `./styles.js`). Everything typographic is delegated to CSS classes so
 * the panel stylesheet can theme light/dark without touching this file.
 *
 * ── CSS CLASS CONTRACT ───────────────────────────────────────────────────────
 * [styles] = already defined in src/client/ui/styles.js. OPEN = not yet styled
 * there; the component still renders correctly (inline geometry + fallbacks),
 * but the Lead can make these nicer. The chart paints no colours of its own
 * except per-series colours passed in via props / PALETTE, and all typography
 * is driven by the classes below. A small number of OPEN rules (frame title /
 * subtitle, legend name, tooltip title) carry inline fallbacks using the
 * --df-fg / --df-fg-2 variables so they look right before the Lead styles them.
 *
 *  .df-chart             ChartFrame root (flex column; height:100%)          OPEN
 *  .df-chart-head        header row                                          OPEN
 *  .df-chart-title       13px / 600 / var(--df-fg)                           OPEN
 *  .df-chart-sub         11px / var(--df-fg-2)                               OPEN
 *  .df-chart-right       right-hand slot (title + subtitle + actions)        OPEN
 *  .df-chart-body        measured body (flex:1; min-height:120)              OPEN
 *  .df-chart-body-inner  absolute inset:0 wrapper                            OPEN
 *  .df-plot              chart root box (position:relative; 100% or px)      OPEN
 *  .df-chart-svg         the <svg>                                           [styles]
 *  .df-chart-empty       empty state (inline: centred, muted, 12px)          OPEN
 *  .df-axes              <g> wrapper for grid + ticks                        OPEN
 *  .df-axis              tick labels (11px, var(--df-fg-2))                  [styles]
 *  .df-axis-title        axis titles (11px, 500, var(--df-fg-2))             [styles]
 *  .df-gridline          grid lines (var(--df-grid), 1px, dash 2 4)          [styles]
 *  .df-axisline          baselines (var(--df-border-2), 1px)                 [styles]
 *  .df-crosshair         hover guide (var(--df-fg-3), dash 3 3)              [styles]
 *  .df-bar               histogram bar (accent 16% fill, 34% stroke, 1px)    [styles]
 *  .df-bar-active        hovered bar (same class, needs stronger fill)       OPEN
 *  .df-curve             theory curve — stroke/width/opacity set inline      OPEN
 *  .df-curve-active      selected series — 2.6px, opacity 1 (inline)         OPEN
 *  .df-cdf-emp           empirical step CDF (var(--df-fg-2), 1.6px)          [styles]
 *  .df-ref-line          45° identity line (var(--df-fg-3), dash 5 4)        [styles]
 *  .df-point             P-P/Q-Q dot — fill inline from props, 2.2px, .75     OPEN
 *  .df-point-active      hovered dot — r 4, opacity 1                        OPEN
 *  .df-focus-dot         crosshair marker — fill var(--df-fg), r 3           OPEN
 *  (SVG <clipPath> ids df-hist-clip-N / df-cdf-clip-N are ids, not classes.)
 *  .df-chart-legend      OPTIONAL internal legend row (HTML; legendMode 'html').
 *                        The app already draws its own legend row (.df-legend)
 *                        under the chart, so this stays hidden unless
 *                        `showLegend` / `legendMode` asks for it.
 *    .df-chart-legend-chip / -chip-active / -chip-inactive / -dot / -name
 *  .df-chart-legend-svg  OPTIONAL legend drawn INSIDE the <svg> (legendMode
 *                        'svg'); chips are .df-legend-dot + .df-chart-legend-text
 *                        so chartExport.js keeps them in exported files.
 *  .df-axes-frame        closed plot frame when style.axes === 'box'         OPEN
 *  .df-chart-svg-title   bold centred style.title drawn inside the <svg>     OPEN
 *  .df-tooltip           tooltip card                                        [styles]
 *  .df-tooltip-title     first line (contains <b>)                           OPEN
 *  .df-tooltip-row       row (flex, space-between)                           [styles]
 *  .df-tooltip-key       muted label (var(--df-fg-2))                        [styles]
 *  .df-tooltip-value     <b> value; tabular-nums via `.df-tooltip b`         [styles]
 *  .df-tooltip-dot       6px coloured dot (background set inline)            OPEN
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * TEMPLATE STYLING (`style` prop, produced by chartStyle.js#chartStyleProps)
 * Every chart also accepts:
 *   style = { fontStack, fontScale, strokeScale, palette[], grid, axes, legend,
 *             legendSize, title, barOpacity, barEdge, barTone, barGap, barRadius,
 *             barColor, pointSize }   (all optional)
 *   legendMode = 'none' | 'html' | 'svg'   (default: showLegend ? 'html' : 'none')
 * Missing keys keep today's look. Because `.df-axis`/`.df-axisline`/`.df-bar`
 * set font-size and stroke-width in CSS (which beats SVG presentation
 * attributes), template scaling is applied with inline `style` — never by
 * dropping the class names. Palette-indexed colours replace the module PALETTE
 * for curves, P-P/Q-Q dots and legend dots; an explicit per-series `color` prop
 * still wins. `style.title` is drawn inside the SVG (so exports keep it);
 * `style.legend === 'right'` reserves width via the pure
 * `./chartLegend.js#computeLegendLayout`.
 *
 * Exported components (SPEC §3):
 *   ChartFrame({ title, subtitle, right, children(width, height), className,
 *                style })
 *   HistFitChart({ histogram, curves, xLabel, yLabel, width, height, title,
 *                  showLegend = false, style, legendMode })
 *   CdfChart({ ecdf, curves, xLabel, yLabel, width, height, title,
 *              showLegend = false, style, legendMode })
 *   PpChart({ points, distName, color, width, height, xLabel, yLabel, title,
 *             showLegend = false, style, legendMode })
 *   QqChart({ points, distName, color, width, height, xLabel, yLabel, title,
 *             showLegend = false, style, legendMode })
 *   useChartSize(ref, fallback) — ResizeObserver hook (the React-free factory
 *   `makeChartSizeHook(React)` is exported from ./chartkit.js).
 *
 * Sizing: pass `width`/`height` when the parent already measured the box
 * (ChartFrame does exactly that). Omitted / non-positive values make the chart
 * measure its own container (width:100%) with DEFAULT_SIZE.height, so it adapts
 * to the card width instead of overflowing.
 */
import * as React from 'react'
import { PALETTE } from './styles.js'
import { computeLegendLayout, resolveChartStyle } from './chartLegend.js'
import {
  DEFAULT_SIZE,
  clamp,
  extent,
  fmtNum,
  linearScale,
  makeChartSizeHook,
  niceTicks,
  pathFromPoints,
  stepPath,
} from './chartkit.js'

const { useMemo, useRef, useState } = React

/** Ready-to-use ResizeObserver hook (the React-free factory lives in chartkit). */
export const useChartSize = makeChartSizeHook(React)

const LEGEND_H = 24
const MAX_VISIBLE_CURVES = 10
const PROB_TICKS = [0, 0.25, 0.5, 0.75, 1]
const HOVER_DOT_RADIUS = 3

let uidSeq = 0
function nextUid(prefix) {
  uidSeq += 1
  return `${prefix}-${uidSeq}`
}

function paletteAt(index) {
  if (Array.isArray(PALETTE) && PALETTE.length > 0) return PALETTE[index % PALETTE.length]
  return 'currentColor'
}

/** Series colour: an explicit template palette wins, else the panel PALETTE. */
function paletteColor(palette, index, explicit) {
  if (Array.isArray(palette) && palette.length > 0) return palette[index % palette.length]
  return explicit || paletteAt(index)
}

/** Shared no-style fallback, so Axes/SvgLegend stay total when a prop is missing. */
const PLAIN_CHART_STYLE = Object.freeze(resolveChartStyle(undefined))

/**
 * Legend rendering mode. An explicit `legendMode` wins; otherwise the legacy
 * `showLegend` boolean keeps old callers on the HTML legend (or no legend).
 */
function resolveLegendMode(requested, showLegend) {
  if (requested === 'none' || requested === 'html' || requested === 'svg') return requested
  return showLegend ? 'html' : 'none'
}

/** Chip text size for the in-SVG legend (11px base, like the HTML chips). */
function legendFontSize(chartStyle) {
  return 11 * chartStyle.fontScale * chartStyle.legendSize
}

/**
 * Geometry for the legend drawn inside the SVG, or `null` when the legend is
 * not in the SVG. Kept in chartLegend.js so the wrapping is testable headlessly.
 */
function svgLegendLayout({ mode, items, width, height, chartStyle }) {
  if (mode !== 'svg' || chartStyle.legend === 'none') return null
  if (!Array.isArray(items) || items.length === 0) return null
  return computeLegendLayout({
    items,
    width,
    height,
    mode: chartStyle.legend === 'right' ? 'right' : 'bottom',
    fontSize: legendFontSize(chartStyle),
  })
}

/** Plot top padding added by the optional in-SVG title. */
function titleInset(chartStyle) {
  return chartStyle.title ? Math.round(16 * chartStyle.fontScale) : 0
}

/**
 * Plot margins, grown with the type size.
 *
 * The base numbers are tuned for 11 px labels; a 3x print template would push
 * the tick labels and axis titles outside the canvas if they stayed fixed.
 * @param chartStyle - resolved chart style.
 * @param rightBase - extra right margin for charts that need it (P-P/Q-Q).
 * @returns {{top: number, right: number, bottom: number, left: number}} margins.
 */
function axisInsets(chartStyle, rightBase = 16) {
  const sc = Math.max(1, chartStyle.fontScale)
  return {
    top: Math.round(10 * sc + titleInset(chartStyle)),
    right: Math.round(rightBase * sc),
    bottom: Math.round(40 * sc),
    left: Math.round(52 * sc),
  }
}

/** Grow the plot box so the in-SVG legend never covers the data. */
function withLegendInsets(insets, layout) {
  if (!layout) return insets
  const inset = layout.plotInset || {}
  return {
    top: insets.top + (inset.top || 0),
    right: insets.right + (inset.right || 0),
    bottom: insets.bottom + (inset.bottom || 0),
    left: insets.left + (inset.left || 0),
  }
}

/** `#rgb` / `#rrggbb` -> [r, g, b]; null when the value is not a colour. */
function parseHexColor(value) {
  if (typeof value !== 'string') return null
  const raw = value.trim()
  const short = /^#([0-9a-f]{3})$/i.exec(raw)
  if (short) {
    return short[1].split('').map((ch) => parseInt(ch + ch, 16))
  }
  const long = /^#([0-9a-f]{6})$/i.exec(raw)
  if (!long) return null
  const int = parseInt(long[1], 16)
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
}

/** Fill/stroke alpha per tone when the caller picked an explicit bar colour. */
const BAR_COLOR_ALPHA = {
  soft: { fill: 0.34, stroke: 0.55 },
  medium: { fill: 0.52, stroke: 0.7 },
  bold: { fill: 0.78, stroke: 0.85 },
  outline: { fill: 0, stroke: 0.85 },
}

/** Inline bar paint (`styles.js` sets fill/stroke, so overrides must be inline). */
function barPaint(chartStyle) {
  const paint = { strokeWidth: 1 * chartStyle.strokeScale }
  const rgb = parseHexColor(chartStyle.barColor)
  if (rgb === null) {
    if (chartStyle.barOpacity != null) paint.fillOpacity = chartStyle.barOpacity
    if (chartStyle.barEdge === false) paint.stroke = 'none'
    return paint
  }
  const tone = ['soft', 'medium', 'bold', 'outline'].includes(chartStyle.barTone)
    ? chartStyle.barTone
    : 'soft'
  const alpha = BAR_COLOR_ALPHA[tone]
  const color = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
  const opacity = chartStyle.barOpacity != null ? chartStyle.barOpacity : 1
  if (tone === 'outline') {
    paint.fill = '#ffffff'
    paint.fillOpacity = 0.92
  } else {
    paint.fill = color
    paint.fillOpacity = Math.min(1, alpha.fill * opacity)
  }
  paint.stroke = color
  paint.strokeOpacity = alpha.stroke
  if (chartStyle.barEdge === false) paint.stroke = 'none'
  return paint
}

/** Bar fill/edge tint class: soft | medium | bold | outline. */
function barToneClass(chartStyle, hovered) {
  const tone = ['soft', 'medium', 'bold', 'outline'].includes(chartStyle.barTone)
    ? chartStyle.barTone
    : 'soft'
  return `df-bar df-bar-${tone}${hovered ? ' df-bar-active' : ''}`
}

function normalizeSize(width, height) {
  const w = Number(width)
  const h = Number(height)
  return [
    Number.isFinite(w) && w > 0 ? Math.round(w) : DEFAULT_SIZE.width,
    Number.isFinite(h) && h > 0 ? Math.round(h) : DEFAULT_SIZE.height,
  ]
}

/** Width/height props can be numbers, numeric strings, undefined or NaN. */
function positiveNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

/**
 * Resolve a chart's pixel box: explicit `width`/`height` props win (e.g. a
 * ChartFrame already measured the slot); otherwise the chart measures its own
 * container via ResizeObserver and lays out at that width. The root box is
 * always `width:100%` when auto, so the SVG can never overflow its parent.
 */
function useChartLayout(width, height) {
  const rootRef = useRef(null)
  const measured = useChartSize(rootRef, {
    width: DEFAULT_SIZE.width,
    height: DEFAULT_SIZE.height,
  })
  const explicitW = positiveNumber(width)
  const explicitH = positiveNumber(height)
  const w = explicitW || positiveNumber(measured.width) || DEFAULT_SIZE.width
  const h = explicitH || positiveNumber(measured.height) || DEFAULT_SIZE.height
  return {
    rootRef,
    width: Math.max(80, Math.round(w)),
    height: Math.max(80, Math.round(h)),
    autoWidth: explicitW === 0,
  }
}

/** Inner plotting rectangle inside an SVG of `width` × `height`. */
function plotBox(width, height, options = {}) {
  const opts = options || {}
  const left = Number.isFinite(opts.left) ? opts.left : 52
  const right = Number.isFinite(opts.right) ? opts.right : 16
  const top = Number.isFinite(opts.top) ? opts.top : 10
  const bottom = Number.isFinite(opts.bottom) ? opts.bottom : 36
  const w = Math.max(8, width - left - right)
  const h = Math.max(8, height - top - bottom)
  return { x: left, y: top, width: w, height: h, right: left + w, bottom: top + h }
}

function insidePlot(point, plot) {
  return (
    point.x >= plot.x - 0.5 &&
    point.x <= plot.x + plot.width + 0.5 &&
    point.y >= plot.y - 0.5 &&
    point.y <= plot.y + plot.height + 0.5
  )
}

/** Pointer position in SVG user units (the SVG is drawn 1:1 with its box). */
function pointerPosition(event, width, height) {
  const element = event && event.currentTarget
  if (!element || typeof element.getBoundingClientRect !== 'function') return null
  const rect = element.getBoundingClientRect()
  if (!rect || !(rect.width > 0) || !(rect.height > 0)) return null
  const x = ((event.clientX - rect.left) / rect.width) * width
  const y = ((event.clientY - rect.top) / rect.height) * height
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return { x, y }
}

function maxFinite(values) {
  if (!Array.isArray(values)) return 0
  let max = 0
  for (const value of values) {
    const n = Number(value)
    if (Number.isFinite(n) && n > max) max = n
  }
  return max
}

function binIndexAt(bins, xValue) {
  if (!bins.length) return -1
  let lo = 0
  let hi = bins.length - 1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const bin = bins[mid]
    if (xValue < bin.x0) hi = mid - 1
    else if (xValue >= bin.x1) lo = mid + 1
    else return mid
  }
  if (lo <= 0) return 0
  if (lo >= bins.length) return bins.length - 1
  return lo
}

/** Linear interpolation on a (sorted) curve grid; clamps at the ends. */
function interpAt(xs, ys, xValue) {
  const n = Math.min(xs.length, ys.length)
  if (n === 0) return NaN
  if (n === 1) return Number(ys[0])
  if (!(xValue > xs[0])) return Number(ys[0])
  if (!(xValue < xs[n - 1])) return Number(ys[n - 1])
  let lo = 0
  let hi = n - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (Number(xs[mid]) <= xValue) lo = mid
    else hi = mid
  }
  const x0 = Number(xs[lo])
  const x1 = Number(xs[hi])
  const y0 = Number(ys[lo])
  const y1 = Number(ys[hi])
  if (!Number.isFinite(x0) || !Number.isFinite(x1) || x1 === x0) {
    return Number.isFinite(y1) ? y1 : y0
  }
  return y0 + ((y1 - y0) * (xValue - x0)) / (x1 - x0)
}

/** Empirical CDF value: F̂(x) = y of the last point with x_i <= x. */
function ecdfValueAt(points, xValue) {
  if (!points.length) return NaN
  if (xValue < points[0].x) return 0
  let lo = 0
  let hi = points.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (points[mid].x <= xValue) lo = mid
    else hi = mid - 1
  }
  return points[lo].y
}

/** Accepts {bins, n} | {bins} | bin[] and returns normalised bins. */
function normalizeBins(histogram) {
  const source = Array.isArray(histogram)
    ? histogram
    : Array.isArray(histogram && histogram.bins)
      ? histogram.bins
      : []
  const sampleCount = Array.isArray(histogram)
    ? 0
    : Number(histogram && histogram.n) || 0
  const bins = []
  for (const raw of source) {
    if (!raw) continue
    const x0 = Number(raw.x0)
    const x1 = Number(raw.x1)
    if (!Number.isFinite(x0) || !Number.isFinite(x1) || !(x1 > x0)) continue
    const count = Number.isFinite(Number(raw.count)) ? Number(raw.count) : 0
    let density = Number(raw.density)
    if (!Number.isFinite(density)) {
      // Engine histograms always carry `density`; if the app passes bins
      // without it, fall back to count/width so the shape stays readable.
      density = sampleCount > 0 ? count / ((x1 - x0) * sampleCount) : count / (x1 - x0)
    }
    bins.push({ x0, x1, count, density: density > 0 ? density : 0 })
  }
  bins.sort((a, b) => a.x0 - b.x0)
  return bins
}

/** Accepts {x:[…], y:[…]} | [{dataset,x,y}] | [{x,y}] and returns sorted points. */
function normalizeEcdf(ecdf) {
  if (!ecdf) return []
  if (Array.isArray(ecdf)) {
    if (ecdf.length === 0) return []
    const first = ecdf[0]
    if (!first) return []
    // An entry from analyze(): { dataset, x: [...], y: [...] }
    if (typeof first === 'object' && Array.isArray(first.x) && Array.isArray(first.y)) {
      return normalizeEcdf(first)
    }
    // A bare list of points.
    if (Array.isArray(first) || (typeof first === 'object' && 'x' in first && 'y' in first)) {
      const points = []
      for (const raw of ecdf) {
        const x = Number(Array.isArray(raw) ? raw[0] : raw && raw.x)
        const y = Number(Array.isArray(raw) ? raw[1] : raw && raw.y)
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue
        points.push({ x, y })
      }
      points.sort((a, b) => a.x - b.x)
      return points
    }
    return []
  }
  if (typeof ecdf === 'object' && Array.isArray(ecdf.x) && Array.isArray(ecdf.y)) {
    const points = []
    const n = Math.min(ecdf.x.length, ecdf.y.length)
    for (let i = 0; i < n; i += 1) {
      const x = Number(ecdf.x[i])
      const y = Number(ecdf.y[i])
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue
      points.push({ x, y })
    }
    points.sort((a, b) => a.x - b.x)
    return points
  }
  return []
}

/** Accepts `[{theoretical, empirical|sample}]` or `{points:[…]}`. */
function normalizePairs(points, secondKey) {
  const source = Array.isArray(points)
    ? points
    : Array.isArray(points && points.points)
      ? points.points
      : []
  const key = typeof secondKey === 'string' && secondKey ? secondKey : 'empirical'
  const pairs = []
  for (const raw of source) {
    if (!raw) continue
    const x = Number(raw.theoretical)
    let y = Number(raw[key])
    if (!Number.isFinite(y) && key !== 'empirical') y = Number(raw.empirical)
    if (!Number.isFinite(y) && key !== 'sample') y = Number(raw.sample)
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    pairs.push({ x, y })
  }
  return pairs
}

/**
 * Normalise `curves` prop entries into drawable series:
 *   { distId, name, color, active, x, y }
 * Only the first MAX_VISIBLE_CURVES are kept (selected series always survive);
 * active ones are ordered last so they paint on top.
 */
function normalizeSeries(curves, valueKey, palette) {
  const source = Array.isArray(curves) ? curves : []
  const list = []
  for (let i = 0; i < source.length; i += 1) {
    const raw = source[i]
    if (!raw) continue
    const xs = Array.isArray(raw.x) ? raw.x : []
    const ys = Array.isArray(raw[valueKey]) ? raw[valueKey] : []
    if (xs.length < 2 || ys.length < 2) continue
    list.push({
      distId: raw.distId != null ? String(raw.distId) : `curve-${i}`,
      name: raw.name || raw.distName || (raw.distId != null ? String(raw.distId) : `曲线 ${i + 1}`),
      color: paletteColor(palette, i, raw.color),
      active: raw.active === true,
      x: xs,
      y: ys,
    })
  }
  const active = list.filter((series) => series.active)
  const muted = list.filter((series) => !series.active)
  if (list.length <= MAX_VISIBLE_CURVES) return [...muted, ...active]
  const room = Math.max(0, MAX_VISIBLE_CURVES - active.length)
  return [...muted.slice(0, room), ...active].slice(-MAX_VISIBLE_CURVES)
}

function useSeries(curves, valueKey, palette) {
  return useMemo(() => normalizeSeries(curves, valueKey, palette), [curves, valueKey, palette])
}

function legendItemsOf(series) {
  return series.map((item) => ({
    distId: item.distId,
    name: item.name,
    color: item.color,
    active: item.active,
  }))
}

/** Which series get a tooltip row: the selected one, else the first few. */
function tooltipSeriesOf(series, max = 4) {
  const active = series.filter((item) => item.active)
  if (active.length > 0) return active.slice(0, max)
  return series.slice(0, max)
}

function tickLabel(value) {
  return fmtNum(value, 4)
}

/** Grid lines, axes, tick labels and axis titles. */
function Axes({
  plot,
  xScale,
  yScale,
  xTicks,
  yTicks,
  xTickFormat,
  yTickFormat,
  xLabel,
  yLabel,
  chartStyle = PLAIN_CHART_STYLE,
}) {
  const xFormat = typeof xTickFormat === 'function' ? xTickFormat : tickLabel
  const yFormat = typeof yTickFormat === 'function' ? yTickFormat : tickLabel
  const baseY = plot.y + plot.height
  // `.df-axis` / `.df-axisline` in styles.js set font-size and stroke-width,
  // and CSS beats presentation attributes — so the scale factors go inline.
  const tickStyle = { fontSize: 11 * chartStyle.fontScale }
  const strokeStyle = { strokeWidth: 1 * chartStyle.strokeScale }
  // Every pixel offset below is tuned for the default 11 px type; scale it with
  // the type so big print templates don't push labels outside the canvas.
  const sc = Math.max(1, chartStyle.fontScale)
  const boxed = chartStyle.axes === 'box'
  return (
    <g className="df-axes">
      {chartStyle.grid
        ? yTicks.map((value, index) => {
            const y = yScale(value)
            if (!Number.isFinite(y)) return null
            return (
              <line
                key={`ygrid-${index}`}
                className="df-gridline"
                x1={plot.x}
                y1={y}
                x2={plot.x + plot.width}
                y2={y}
                style={strokeStyle}
              />
            )
          })
        : null}
      {yTicks.map((value, index) => {
        const y = yScale(value)
        if (!Number.isFinite(y)) return null
        return (
          <text
            key={`y-${index}`}
            className="df-axis"
            x={plot.x - 8 * sc}
            y={y}
            textAnchor="end"
            dominantBaseline="middle"
            style={tickStyle}
          >
            {yFormat(value)}
          </text>
        )
      })}
      {xTicks.map((value, index) => {
        const x = xScale(value)
        if (!Number.isFinite(x)) return null
        return (
          <g key={`x-${index}`}>
            <line
              className="df-axisline"
              x1={x}
              y1={baseY}
              x2={x}
              y2={baseY + 4 * sc}
              style={strokeStyle}
            />
            <text className="df-axis" x={x} y={baseY + 16 * sc} textAnchor="middle" style={tickStyle}>
              {xFormat(value)}
            </text>
          </g>
        )
      })}
      {boxed ? (
        <rect
          className="df-axisline df-axes-frame"
          x={plot.x}
          y={plot.y}
          width={plot.width}
          height={plot.height}
          fill="none"
          style={strokeStyle}
        />
      ) : (
        <>
          <line
            className="df-axisline"
            x1={plot.x}
            y1={baseY}
            x2={plot.x + plot.width}
            y2={baseY}
            style={strokeStyle}
          />
          <line
            className="df-axisline"
            x1={plot.x}
            y1={plot.y}
            x2={plot.x}
            y2={baseY}
            style={strokeStyle}
          />
        </>
      )}
      {xLabel ? (
        <text
          className="df-axis-title"
          x={plot.x + plot.width / 2}
          y={baseY + 32 * sc}
          textAnchor="middle"
          style={tickStyle}
        >
          {xLabel}
        </text>
      ) : null}
      {yLabel ? (
        <text
          className="df-axis-title"
          transform={`translate(${13 * sc} ${plot.y + plot.height / 2}) rotate(-90)`}
          textAnchor="middle"
          style={tickStyle}
        >
          {yLabel}
        </text>
      ) : null}
    </g>
  )
}

/** Legend chips (a coloured dot + series name; selection is handled by the app). */
function Legend({ items, chartStyle = PLAIN_CHART_STYLE }) {
  if (!Array.isArray(items) || items.length === 0) return null
  const fontSize = 11.5 * chartStyle.fontScale * chartStyle.legendSize
  return (
    <div
      className="df-chart-legend"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: LEGEND_H,
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'nowrap',
        columnGap: 12,
        overflow: 'hidden',
      }}
    >
      {items.map((item, index) => (
        <span
          key={`${item.distId || item.name}-${index}`}
          className={
            item.active
              ? 'df-chart-legend-chip df-chart-legend-chip-active'
              : 'df-chart-legend-chip df-chart-legend-chip-inactive'
          }
          title={item.name}
          data-dist-id={item.distId || undefined}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            flex: '0 0 auto',
            minWidth: 0,
            maxWidth: 190,
            overflow: 'hidden',
          }}
        >
          <span
            className="df-chart-legend-dot"
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: item.color,
              flex: '0 0 auto',
            }}
          />
          <span
            className="df-chart-legend-name"
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
              fontSize,
              color: item.active ? 'var(--df-fg)' : 'var(--df-fg-2)',
            }}
          >
            {item.name}
          </span>
        </span>
      ))}
    </div>
  )
}

/**
 * The legend drawn INSIDE the SVG, so `chartExport.js` (which serialises the
 * `<svg>` node) keeps it in exported PNG/PDF/SVG files. `layout` comes from
 * computeLegendLayout(); this component only paints the chips.
 */
function SvgLegend({ layout, chartStyle = PLAIN_CHART_STYLE }) {
  if (!layout || !Array.isArray(layout.entries) || layout.entries.length === 0) return null
  const fontSize = legendFontSize(chartStyle)
  return (
    <g className="df-chart-legend-svg">
      {layout.entries.map((entry, index) => {
        const cy = entry.y + entry.h / 2
        return (
          <g key={`${entry.name}-${index}`}>
            <circle
              className="df-legend-dot"
              cx={entry.x + 4}
              cy={cy}
              r={4}
              fill={entry.color}
              style={{ fill: entry.color }}
            />
            <text
              className="df-axis df-chart-legend-text"
              x={entry.x + 10}
              y={cy + fontSize * 0.35}
              textAnchor="start"
              style={{ fontSize, fill: entry.active ? 'var(--df-fg)' : 'var(--df-fg-2)' }}
            >
              {entry.name}
            </text>
          </g>
        )
      })}
    </g>
  )
}

/** Optional bold, centred title inside the SVG (`style.title`). */
function SvgTitle({ width, chartStyle = PLAIN_CHART_STYLE }) {
  if (!chartStyle.title) return null
  return (
    <text
      className="df-axis-title df-chart-svg-title"
      x={width / 2}
      y={11 * chartStyle.fontScale + 3}
      textAnchor="middle"
      style={{ fontSize: 12 * chartStyle.fontScale, fontWeight: 700, fill: 'var(--df-fg)' }}
    >
      {chartStyle.title}
    </text>
  )
}

/** Hover tooltip card. Positioned in `.df-plot` coordinates. */
function Tooltip({ x, y, width, height, offsetY = 0, title, rows }) {
  const list = Array.isArray(rows) ? rows : []
  if (list.length === 0 && !title) return null
  const flip = x > width * 0.62
  const left = clamp(x, 6, Math.max(6, width - 6))
  const top = clamp(y + offsetY, offsetY + 26, Math.max(offsetY + 26, height - 10))
  return (
    <div
      className="df-tooltip"
      style={{
        position: 'absolute',
        left,
        top,
        zIndex: 3,
        pointerEvents: 'none',
        transform: flip
          ? 'translate(calc(-100% - 10px), -50%)'
          : 'translate(10px, -50%)',
      }}
    >
      {title ? (
        <div
          className="df-tooltip-title"
          style={{ fontSize: 11, lineHeight: 1.4, marginBottom: 2, color: 'var(--df-fg-2)' }}
        >
          <b style={{ color: 'var(--df-fg)' }}>{title}</b>
        </div>
      ) : null}
      {list.map((row, index) => (
        <div
          className="df-tooltip-row"
          key={`${row.key}-${index}`}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          {row.color ? (
            <span
              className="df-tooltip-dot"
              style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: row.color,
                flex: '0 0 auto',
              }}
            />
          ) : null}
          <span className="df-tooltip-key">{row.key}</span>
          <b className="df-tooltip-value" style={{ marginLeft: 'auto' }}>
            {row.value}
          </b>
        </div>
      ))}
    </div>
  )
}

/**
 * Measured chart surface: a legend row (optional) + the SVG + a tooltip layer.
 * `children(width, svgHeight)` must return the SVG content.
 */
function ChartBody({
  width,
  height,
  title,
  desc,
  legend,
  tooltip,
  onPointerMove,
  onPointerLeave,
  rootRef,
  autoWidth,
  chartStyle = PLAIN_CHART_STYLE,
  children,
}) {
  const [w, h] = normalizeSize(width, height)
  const legendHeight = legend ? LEGEND_H : 0
  const svgHeight = Math.max(60, h - legendHeight)
  return (
    <div
      className="df-plot"
      ref={rootRef}
      style={{ position: 'relative', width: autoWidth ? '100%' : w, height: h }}
    >
      {legend}
      <svg
        className="df-chart-svg"
        width={w}
        height={svgHeight}
        viewBox={`0 0 ${w} ${svgHeight}`}
        role="img"
        aria-label={title}
        style={{
          display: 'block',
          position: 'absolute',
          left: 0,
          top: legendHeight,
          fontFamily: chartStyle.fontStack || undefined,
        }}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <title>{title}</title>
        {desc ? <desc>{desc}</desc> : null}
        {typeof children === 'function' ? children(w, svgHeight) : children}
      </svg>
      {tooltip}
    </div>
  )
}

function EmptyState({ width, height, text, rootRef, autoWidth }) {
  const [w, h] = normalizeSize(width, height)
  const message = text || '暂无数据'
  return (
    <div
      className="df-plot"
      ref={rootRef}
      style={{ position: 'relative', width: autoWidth ? '100%' : w, height: h }}
      role="img"
      aria-label={message}
    >
      <div
        className="df-chart-empty"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 80,
          padding: '0 18px',
          textAlign: 'center',
          color: 'var(--df-fg-2)',
          fontSize: 12,
          lineHeight: 1.6,
        }}
      >
        {message}
      </div>
    </div>
  )
}

/**
 * Card frame: header (title / subtitle / right slot) + measured body.
 * `children` may be a render function `(width, height) => node`.
 */
export function ChartFrame({ title, subtitle, right, children, className, style }) {
  const bodyRef = useRef(null)
  const size = useChartSize(bodyRef)
  const chartStyle = resolveChartStyle(style)
  const content = typeof children === 'function' ? children(size.width, size.height) : children
  const headerFont = chartStyle.fontScale
  return (
    <section
      className={className ? `df-chart ${className}` : 'df-chart'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        minHeight: 0,
        height: '100%',
        fontFamily: chartStyle.fontStack || undefined,
      }}
    >
      <header
        className="df-chart-head"
        style={{
          display: 'flex',
          alignItems: 'baseline',
          columnGap: 8,
          flex: '0 0 auto',
          minWidth: 0,
          paddingBottom: 6,
        }}
      >
        {title ? (
          <div
            className="df-chart-title"
            style={{
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              /* inline fallback because `[styles]` has no .df-chart-title rule yet */
              fontSize: 13 * headerFont,
              fontWeight: 600,
              color: 'var(--df-fg)',
            }}
          >
            {title}
          </div>
        ) : null}
        {subtitle ? (
          <div
            className="df-chart-sub"
            style={{
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: 11 * headerFont,
              color: 'var(--df-fg-2)',
            }}
          >
            {subtitle}
          </div>
        ) : null}
        <div
          className="df-chart-right"
          style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' }}
        >
          {right}
        </div>
      </header>
      <div
        className="df-chart-body"
        ref={bodyRef}
        style={{
          position: 'relative',
          flex: '1 1 auto',
          minHeight: 120,
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <div className="df-chart-body-inner" style={{ position: 'absolute', inset: 0 }}>
          {content}
        </div>
      </div>
    </section>
  )
}

/* ────────────────────────────── Histogram + PDF ───────────────────────────── */

/**
 * Histogram (density scale) with overlaid theoretical PDF curves.
 * props.histogram = { bins: [{x0,x1,count,density}], n } (or the bins array).
 * props.curves    = [{ distId, name, color, pdf: [...], x: [...], active }]
 */
export function HistFitChart({
  histogram,
  curves,
  xLabel,
  yLabel,
  width,
  height,
  title,
  showLegend = false,
  style,
  legendMode,
}) {
  const bins = useMemo(() => normalizeBins(histogram), [histogram])
  const chartStyle = resolveChartStyle(style)
  const series = useSeries(curves, 'pdf', chartStyle.palette)
  const [hover, setHover] = useState(null)
  const [clipId] = useState(() => nextUid('df-hist-clip'))
  const { rootRef, width: w, height: h, autoWidth } = useChartLayout(width, height)
  const mode = resolveLegendMode(legendMode, showLegend)
  const legendItems = series.length ? legendItemsOf(series) : []
  const legend = mode === 'html' && chartStyle.legend !== 'none' && legendItems.length ? <Legend items={legendItems} chartStyle={chartStyle} /> : null
  const legendHeight = legend ? LEGEND_H : 0
  const svgHeight = Math.max(60, h - legendHeight)
  const svgLegend = svgLegendLayout({ mode, items: legendItems, width: w, height: svgHeight, chartStyle })

  if (bins.length === 0) {
    return (
      <EmptyState
        width={w}
        height={h}
        rootRef={rootRef}
        autoWidth={autoWidth}
        text="暂无直方图数据：解析数据并完成拟合后会显示分布直方图与概率密度曲线。"
      />
    )
  }

  let xLo = bins[0].x0
  let xHi = bins[bins.length - 1].x1
  for (const item of series) {
    const bounds = extent(item.x)
    if (Number.isFinite(bounds[0])) xLo = Math.min(xLo, bounds[0])
    if (Number.isFinite(bounds[1])) xHi = Math.max(xHi, bounds[1])
  }
  if (!(xHi > xLo)) {
    xLo -= 0.5
    xHi += 0.5
  }
  const xPadding = (xHi - xLo) * 0.015
  const xDomain = [xLo - xPadding, xHi + xPadding]

  let maxBarDensity = 0
  for (const bin of bins) if (bin.density > maxBarDensity) maxBarDensity = bin.density
  let maxCurvePdf = 0
  for (const item of series) maxCurvePdf = Math.max(maxCurvePdf, maxFinite(item.y))
  const base = maxBarDensity > 0 ? maxBarDensity : maxCurvePdf > 0 ? maxCurvePdf : 1
  // Keep the curve readable without letting a spiky fitted PDF crush the bars.
  const cappedCurve = maxCurvePdf > 0 ? Math.min(maxCurvePdf, base * 1.9) : base
  const yMax = Math.max(base * 1.06, cappedCurve * 1.04, 1e-9)
  const yDomain = [0, yMax]

  const plot = plotBox(
    w,
    svgHeight,
    withLegendInsets(
      axisInsets(chartStyle),
      svgLegend,
    ),
  )
  const xScale = linearScale({ domain: xDomain, range: [plot.x, plot.x + plot.width] })
  const yScale = linearScale({ domain: yDomain, range: [plot.y + plot.height, plot.y] })
  const xTicks = niceTicks(xDomain[0], xDomain[1], clamp(Math.round(plot.width / (78 * Math.max(1, chartStyle.fontScale))), 3, 7))
  const yTicks = niceTicks(0, yMax, clamp(Math.round(plot.height / (46 * Math.max(1, chartStyle.fontScale))), 3, 6))

  const focusCurve = series.find((item) => item.active) || series[0] || null
  const hoveredIndex = hover ? hover.bin : -1
  const hoveredBin = hoveredIndex >= 0 && hoveredIndex < bins.length ? bins[hoveredIndex] : null

  const handlePointerMove = (event) => {
    const point = pointerPosition(event, w, svgHeight)
    if (!point || !insidePlot(point, plot)) {
      setHover(null)
      return
    }
    const xValue = xScale.invert(point.x)
    setHover({
      px: clamp(point.x, plot.x, plot.x + plot.width),
      py: clamp(point.y, plot.y, plot.y + plot.height),
      xValue,
      bin: binIndexAt(bins, xValue),
    })
  }

  const handlePointerLeave = () => setHover(null)

  const rows = []
  if (hoveredBin) {
    rows.push({ key: '频数', value: fmtNum(hoveredBin.count, 4) })
    rows.push({ key: '密度', value: fmtNum(hoveredBin.density, 4) })
    if (focusCurve) {
      rows.push({
        key: `${focusCurve.name}·pdf`,
        value: fmtNum(interpAt(focusCurve.x, focusCurve.y, hover.xValue), 4),
        color: focusCurve.color,
      })
    }
  }

  const tooltip = hover ? (
    <Tooltip
      x={hover.px}
      y={hover.py}
      width={w}
      height={h}
      offsetY={legendHeight}
      title={hoveredBin ? `${fmtNum(hoveredBin.x0, 4)} ~ ${fmtNum(hoveredBin.x1, 4)}` : ''}
      rows={rows}
    />
  ) : null

  const anyActive = series.some((item) => item.active)
  const svgTitle = title || `直方图与拟合概率密度（${bins.length} 个区间）`

  return (
    <ChartBody
      width={w}
      height={h}
      rootRef={rootRef}
      autoWidth={autoWidth}
      title={svgTitle}
      legend={legend}
      tooltip={tooltip}
      chartStyle={chartStyle}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {() => (
        <>
          <defs>
            <clipPath id={clipId}>
              <rect x={plot.x} y={plot.y} width={plot.width} height={plot.height} />
            </clipPath>
          </defs>
          <SvgTitle width={w} chartStyle={chartStyle} />
          <Axes
            plot={plot}
            xScale={xScale}
            yScale={yScale}
            xTicks={xTicks}
            yTicks={yTicks}
            xLabel={xLabel}
            yLabel={yLabel === undefined ? '概率密度' : yLabel}
            chartStyle={chartStyle}
          />
          <g clipPath={`url(#${clipId})`}>
            {bins.map((bin, index) => {
              const x0 = xScale(bin.x0)
              const x1 = xScale(bin.x1)
              const y = yScale(bin.density)
              const zero = yScale(0)
              if (!Number.isFinite(x0) || !Number.isFinite(y) || !Number.isFinite(zero)) {
                return null
              }
              const barWidth = Math.max(1, x1 - x0 - chartStyle.barGap)
              const barHeight = Math.max(0, zero - y)
              return (
                <rect
                  key={`bin-${index}`}
                  className={barToneClass(chartStyle, index === hoveredIndex)}
                  x={x0 + chartStyle.barGap / 2}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={Math.min(chartStyle.barRadius, barWidth / 2, barHeight / 2)}
                  style={barPaint(chartStyle)}
                />
              )
            })}
            {series.map((item, index) => {
              const points = []
              const n = Math.min(item.x.length, item.y.length)
              for (let i = 0; i < n; i += 1) {
                const px = xScale(item.x[i])
                const py = yScale(item.y[i])
                if (Number.isFinite(px) && Number.isFinite(py)) points.push([px, py])
              }
              const d = pathFromPoints(points)
              if (!d) return null
              const isActive = item.active
              const strokeWidth = isActive ? 2.6 : anyActive ? 1.6 : 1.8
              const opacity = isActive ? 1 : anyActive ? 0.35 : 0.9
              return (
                <path
                  key={`curve-${item.distId}-${index}`}
                  className={isActive ? 'df-curve df-curve-active' : 'df-curve'}
                  d={d}
                  fill="none"
                  stroke={item.color}
                  strokeWidth={strokeWidth * chartStyle.strokeScale}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={opacity}
                />
              )
            })}
          </g>
          {hover ? (
            <line
              className="df-crosshair"
              x1={hover.px}
              x2={hover.px}
              y1={plot.y}
              y2={plot.y + plot.height}
              style={{ strokeWidth: 1 * chartStyle.strokeScale }}
            />
          ) : null}
          <SvgLegend layout={svgLegend} chartStyle={chartStyle} />
        </>
      )}
    </ChartBody>
  )
}

/* ──────────────────────────── Empirical vs theory CDF ─────────────────────── */

/**
 * Empirical step CDF + theoretical CDF curves.
 * props.ecdf   = { x: [...], y: [...] } (or a `[{dataset,x,y}]` entry / points).
 * props.curves = [{ distId, name, color, cdf: [...], x: [...], active }]
 */
export function CdfChart({
  ecdf,
  curves,
  xLabel,
  yLabel,
  width,
  height,
  title,
  showLegend = false,
  style,
  legendMode,
}) {
  const points = useMemo(() => normalizeEcdf(ecdf), [ecdf])
  const chartStyle = resolveChartStyle(style)
  const series = useSeries(curves, 'cdf', chartStyle.palette)
  const [hover, setHover] = useState(null)
  const [clipId] = useState(() => nextUid('df-cdf-clip'))
  const { rootRef, width: w, height: h, autoWidth } = useChartLayout(width, height)
  const mode = resolveLegendMode(legendMode, showLegend)
  const legendItems = series.length ? legendItemsOf(series) : []
  const legend = mode === 'html' && chartStyle.legend !== 'none' && legendItems.length ? <Legend items={legendItems} chartStyle={chartStyle} /> : null
  const legendHeight = legend ? LEGEND_H : 0
  const svgHeight = Math.max(60, h - legendHeight)
  const svgLegend = svgLegendLayout({ mode, items: legendItems, width: w, height: svgHeight, chartStyle })

  if (points.length === 0 && series.length === 0) {
    return (
      <EmptyState
        width={w}
        height={h}
        rootRef={rootRef}
        autoWidth={autoWidth}
        text="暂无累积分布数据：完成拟合后会显示经验分布与理论分布函数。"
      />
    )
  }

  let xLo = points.length ? points[0].x : Infinity
  let xHi = points.length ? points[points.length - 1].x : -Infinity
  for (const item of series) {
    const bounds = extent(item.x)
    if (Number.isFinite(bounds[0])) xLo = Math.min(xLo, bounds[0])
    if (Number.isFinite(bounds[1])) xHi = Math.max(xHi, bounds[1])
  }
  if (!Number.isFinite(xLo) || !Number.isFinite(xHi)) {
    xLo = 0
    xHi = 1
  }
  if (!(xHi > xLo)) {
    xLo -= 0.5
    xHi += 0.5
  }
  const xPadding = (xHi - xLo) * 0.015
  const xDomain = [xLo - xPadding, xHi + xPadding]
  const yDomain = [0, 1]

  const plot = plotBox(
    w,
    svgHeight,
    withLegendInsets(
      axisInsets(chartStyle),
      svgLegend,
    ),
  )
  const xScale = linearScale({ domain: xDomain, range: [plot.x, plot.x + plot.width] })
  const yScale = linearScale({ domain: yDomain, range: [plot.y + plot.height, plot.y] })
  const xTicks = niceTicks(xDomain[0], xDomain[1], clamp(Math.round(plot.width / (78 * Math.max(1, chartStyle.fontScale))), 3, 7))

  const stepPoints = [[xScale(xDomain[0]), yScale(0)]]
  for (const point of points) {
    const px = xScale(point.x)
    const py = yScale(point.y)
    if (Number.isFinite(px) && Number.isFinite(py)) stepPoints.push([px, py])
  }
  const empiricalPath = stepPath(stepPoints, { toX: plot.x + plot.width })
  const empiricalValue = hover ? ecdfValueAt(points, hover.xValue) : NaN
  const focusPoints = tooltipSeriesOf(series, 4)

  const handlePointerMove = (event) => {
    const point = pointerPosition(event, w, svgHeight)
    if (!point || !insidePlot(point, plot)) {
      setHover(null)
      return
    }
    setHover({
      px: clamp(point.x, plot.x, plot.x + plot.width),
      py: clamp(point.y, plot.y, plot.y + plot.height),
      xValue: xScale.invert(point.x),
    })
  }

  const handlePointerLeave = () => setHover(null)

  const rows = []
  if (hover) {
    if (points.length > 0) rows.push({ key: '经验 F̂', value: fmtNum(empiricalValue, 4) })
    for (const item of focusPoints) {
      rows.push({
        key: item.name,
        value: fmtNum(interpAt(item.x, item.y, hover.xValue), 4),
        color: item.color,
      })
    }
  }

  const tooltip = hover ? (
    <Tooltip
      x={hover.px}
      y={hover.py}
      width={w}
      height={h}
      offsetY={legendHeight}
      title={`x = ${fmtNum(hover.xValue, 4)}`}
      rows={rows}
    />
  ) : null

  const anyActive = series.some((item) => item.active)
  const svgTitle = title || '经验分布函数与理论分布函数'

  return (
    <ChartBody
      width={w}
      height={h}
      rootRef={rootRef}
      autoWidth={autoWidth}
      title={svgTitle}
      legend={legend}
      tooltip={tooltip}
      chartStyle={chartStyle}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {() => (
        <>
          <defs>
            <clipPath id={clipId}>
              <rect x={plot.x} y={plot.y} width={plot.width} height={plot.height} />
            </clipPath>
          </defs>
          <SvgTitle width={w} chartStyle={chartStyle} />
          <Axes
            plot={plot}
            xScale={xScale}
            yScale={yScale}
            xTicks={xTicks}
            yTicks={PROB_TICKS}
            xLabel={xLabel}
            yLabel={yLabel === undefined ? 'F(x)' : yLabel}
            chartStyle={chartStyle}
          />
          <g clipPath={`url(#${clipId})`}>
            {points.length > 0 && empiricalPath ? (
              <path
                className="df-cdf-emp"
                d={empiricalPath}
                fill="none"
                stroke="currentColor"
                style={{ strokeWidth: 1.6 * chartStyle.strokeScale }}
                strokeLinejoin="round"
                opacity={0.85}
              />
            ) : null}
            {series.map((item, index) => {
              const curvePoints = []
              const n = Math.min(item.x.length, item.y.length)
              for (let i = 0; i < n; i += 1) {
                const px = xScale(item.x[i])
                const py = yScale(item.y[i])
                if (Number.isFinite(px) && Number.isFinite(py)) curvePoints.push([px, py])
              }
              const d = pathFromPoints(curvePoints)
              if (!d) return null
              const isActive = item.active
              const strokeWidth = isActive ? 2.6 : anyActive ? 1.6 : 1.8
              const opacity = isActive ? 1 : anyActive ? 0.35 : 0.9
              return (
                <path
                  key={`cdf-${item.distId}-${index}`}
                  className={isActive ? 'df-curve df-curve-active' : 'df-curve'}
                  d={d}
                  fill="none"
                  stroke={item.color}
                  strokeWidth={strokeWidth * chartStyle.strokeScale}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={opacity}
                />
              )
            })}
          </g>
          {hover ? (
            <>
              <line
                className="df-crosshair"
                x1={hover.px}
                x2={hover.px}
                y1={plot.y}
                y2={plot.y + plot.height}
                style={{ strokeWidth: 1 * chartStyle.strokeScale }}
              />
              {points.length > 0 && Number.isFinite(empiricalValue) ? (
                <circle
                  className="df-focus-dot"
                  cx={hover.px}
                  cy={yScale(empiricalValue)}
                  r={HOVER_DOT_RADIUS}
                />
              ) : null}
            </>
          ) : null}
          <SvgLegend layout={svgLegend} chartStyle={chartStyle} />
        </>
      )}
    </ChartBody>
  )
}

/* ──────────────────────────────── P-P / Q-Q ───────────────────────────────── */

/**
 * Shared implementation for probability plots.
 * props.pairs = [{ x: theoretical, y: empirical | sample }]
 */
function ProbPlot({
  pairs,
  distName,
  color,
  xLabel,
  yLabel,
  width,
  height,
  title,
  unitSquare,
  emptyText,
  showLegend,
  style,
  legendMode,
}) {
  const [hover, setHover] = useState(null)
  const chartStyle = resolveChartStyle(style)
  const { rootRef, width: w, height: h, autoWidth } = useChartLayout(width, height)
  const pointColor = paletteColor(chartStyle.palette, 0, color)
  const mode = resolveLegendMode(legendMode, showLegend)
  const legendItems = distName
    ? [{ distId: '', name: distName, color: pointColor, active: true }]
    : []
  const legend =
    mode === 'html' && chartStyle.legend !== 'none' && legendItems.length ? (
      <Legend items={legendItems} chartStyle={chartStyle} />
    ) : null
  const legendHeight = legend ? LEGEND_H : 0
  const svgHeight = Math.max(60, h - legendHeight)
  const svgLegend = svgLegendLayout({ mode, items: legendItems, width: w, height: svgHeight, chartStyle })

  if (pairs.length === 0) {
    return (
      <EmptyState width={w} height={h} rootRef={rootRef} autoWidth={autoWidth} text={emptyText || '暂无概率图数据'} />
    )
  }

  let lo = Infinity
  let hi = -Infinity
  for (const pair of pairs) {
    if (pair.x < lo) lo = pair.x
    if (pair.x > hi) hi = pair.x
    if (pair.y < lo) lo = pair.y
    if (pair.y > hi) hi = pair.y
  }
  if (unitSquare) {
    lo = Math.min(0, lo)
    hi = Math.max(1, hi)
  }
  if (!(hi > lo)) {
    lo -= 0.5
    hi += 0.5
  }
  const padding = unitSquare ? 0 : (hi - lo) * 0.04
  const domain = [lo - padding, hi + padding]

  const rawPlot = plotBox(
    w,
    svgHeight,
    withLegendInsets(
      axisInsets(chartStyle, 18),
      svgLegend,
    ),
  )
  // A probability plot is only honest when one data unit spans the same number
  // of pixels on both axes, so square the plotting rectangle and centre it;
  // only then is the dashed identity line a true 45°.
  const side = Math.max(8, Math.floor(Math.min(rawPlot.width, rawPlot.height)))
  const plotX = rawPlot.x + Math.floor((rawPlot.width - side) / 2)
  const plotY = rawPlot.y + Math.floor((rawPlot.height - side) / 2)
  const plot = {
    x: plotX,
    y: plotY,
    width: side,
    height: side,
    right: plotX + side,
    bottom: plotY + side,
  }
  const xScale = linearScale({ domain, range: [plot.x, plot.x + plot.width] })
  const yScale = linearScale({ domain, range: [plot.y + plot.height, plot.y] })
  const xTicks = unitSquare
    ? PROB_TICKS
    : niceTicks(domain[0], domain[1], clamp(Math.round(plot.width / (78 * Math.max(1, chartStyle.fontScale))), 3, 7))
  const yTicks = unitSquare
    ? PROB_TICKS
    : niceTicks(domain[0], domain[1], clamp(Math.round(plot.height / (46 * Math.max(1, chartStyle.fontScale))), 3, 6))

  const hoverPair = hover ? pairs[hover.index] : null

  const handlePointerMove = (event) => {
    const point = pointerPosition(event, w, svgHeight)
    if (!point || !insidePlot(point, plot)) {
      setHover(null)
      return
    }
    let best = -1
    let bestDistance = 18
    for (let i = 0; i < pairs.length; i += 1) {
      const dx = xScale(pairs[i].x) - point.x
      const dy = yScale(pairs[i].y) - point.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance <= bestDistance) {
        best = i
        bestDistance = distance
      }
    }
    if (best < 0) {
      setHover(null)
      return
    }
    setHover({
      index: best,
      px: xScale(pairs[best].x),
      py: yScale(pairs[best].y),
    })
  }

  const handlePointerLeave = () => setHover(null)

  const rows = hoverPair
    ? [
        { key: xLabel, value: fmtNum(hoverPair.x, 4) },
        { key: yLabel, value: fmtNum(hoverPair.y, 4) },
      ]
    : []

  const tooltip = hover ? (
    <Tooltip
      x={hover.px}
      y={hover.py}
      width={w}
      height={h}
      offsetY={legendHeight}
      title={distName || ''}
      rows={rows}
    />
  ) : null

  const svgTitle = title || `${distName || '分布'}概率图（${pairs.length} 个点）`

  return (
    <ChartBody
      width={w}
      height={h}
      rootRef={rootRef}
      autoWidth={autoWidth}
      title={svgTitle}
      legend={legend}
      tooltip={tooltip}
      chartStyle={chartStyle}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {() => (
        <>
          <SvgTitle width={w} chartStyle={chartStyle} />
          <Axes
            plot={plot}
            xScale={xScale}
            yScale={yScale}
            xTicks={xTicks}
            yTicks={yTicks}
            xLabel={xLabel}
            yLabel={yLabel}
            chartStyle={chartStyle}
          />
          <line
            className="df-ref-line"
            x1={xScale(domain[0])}
            y1={yScale(domain[0])}
            x2={xScale(domain[1])}
            y2={yScale(domain[1])}
            style={{ strokeWidth: 1.2 * chartStyle.strokeScale }}
          />
          {pairs.map((pair, index) => {
            const active = hover && hover.index === index
            const radius = (active ? 4 : 2.2) * chartStyle.pointSize
            return (
              <circle
                key={`point-${index}`}
                className={active ? 'df-point df-point-active' : 'df-point'}
                cx={xScale(pair.x)}
                cy={yScale(pair.y)}
                r={radius}
                /* `.df-point-active` sets `r` in styles.js, so scale inline too */
                style={{ r: `${radius}px` }}
                fill={pointColor}
                opacity={active ? 1 : 0.75}
              />
            )
          })}
          {hover ? (
            <circle
              className="df-focus-dot"
              cx={hover.px}
              cy={hover.py}
              r={HOVER_DOT_RADIUS}
              opacity={0.55}
            />
          ) : null}
          <SvgLegend layout={svgLegend} chartStyle={chartStyle} />
        </>
      )}
    </ChartBody>
  )
}

/**
 * P-P plot: theoretical CDF vs empirical CDF.
 * props.points = [{ theoretical, empirical }] (or an analyze() pp entry).
 */
export function PpChart({
  points,
  distName,
  color,
  width,
  height,
  xLabel,
  yLabel,
  title,
  showLegend = false,
  style,
  legendMode,
}) {
  const pairs = useMemo(() => normalizePairs(points, 'empirical'), [points])
  return (
    <ProbPlot
      pairs={pairs}
      distName={distName}
      color={color}
      width={width}
      height={height}
      title={title}
      showLegend={showLegend}
      style={style}
      legendMode={legendMode}
      unitSquare
      xLabel={xLabel === undefined ? '理论累积概率' : xLabel}
      yLabel={yLabel === undefined ? '经验累积概率' : yLabel}
      emptyText="暂无 P-P 图数据：完成拟合后会显示理论概率与经验概率的对应点。"
    />
  )
}

/**
 * Q-Q plot: theoretical quantiles vs sample quantiles.
 * props.points = [{ theoretical, sample }] (or an analyze() qq entry).
 */
export function QqChart({
  points,
  distName,
  color,
  width,
  height,
  xLabel,
  yLabel,
  title,
  showLegend = false,
  style,
  legendMode,
}) {
  const pairs = useMemo(() => normalizePairs(points, 'sample'), [points])
  return (
    <ProbPlot
      pairs={pairs}
      distName={distName}
      color={color}
      width={width}
      height={height}
      title={title}
      showLegend={showLegend}
      style={style}
      legendMode={legendMode}
      xLabel={xLabel === undefined ? '理论分位数' : xLabel}
      yLabel={yLabel === undefined ? '样本分位数' : yLabel}
      emptyText="暂无 Q-Q 图数据：完成拟合后会显示理论分位数与样本分位数的对应点。"
    />
  )
}
