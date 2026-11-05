/**
 * chartkit.js — dependency-free geometry / formatting helpers for the DistFit
 * charts (SPEC §3).
 *
 * Deliberate constraints:
 *   • No app imports and NO colors: the palette lives in `./styles.js`
 *     (Lead-owned) and the chart components receive per-series colors as props.
 *   • No static `react` import. The project does not install react in
 *     `node_modules` (esbuild marks it `external`), so a bare `import ... from
 *     'react'` here would make this module impossible to smoke-test from plain
 *     Node. Instead the one hook we need is offered as a *factory*
 *     (`makeChartSizeHook(React)`); `charts.jsx` calls it once and exports the
 *     ready-made `useChartSize`. That keeps this file importable with:
 *       node --input-type=module -e "import('./src/client/ui/chartkit.js')"
 *
 * Exports:
 *   DEFAULT_SIZE                      : {width:640, height:320} fallback box
 *   clamp(v, lo, hi)                  : numeric clamp (NaN-safe)
 *   extent(values, fallback)          : [min, max] over finite numbers
 *   linearScale({domain, range})      : (v) => px, with .invert/.domain/.range
 *   niceTicks(min, max, count)        : "nice" 1/2/5×10^k tick values
 *   fmtNum(v, sig = 4)                : compact 4-significant-digit string
 *   fmtP(p)                           : p-value string ("<0.001", "0.012", …)
 *   pathFromPoints(points)            : SVG "M x y L …" polyline path
 *   stepPath(points, opts)            : SVG step path (ECDF), opts.toX extends
 *   observeSize(el, onChange)         : ResizeObserver subscription, returns cleanup
 *   makeChartSizeHook(react)          : factory for the `useChartSize` hook
 */

export const DEFAULT_SIZE = Object.freeze({ width: 640, height: 320 })

const MAX_TICK_COUNT = 64
const DEFAULT_FALLBACK = [0, 1]

/** Round to 2 decimals for compact SVG path strings. */
function round2(value) {
  const rounded = Math.round(value * 100) / 100
  return Object.is(rounded, -0) ? 0 : rounded
}

/** Clamp `value` into [lo, hi]; non-finite bounds are treated as open. */
export function clamp(value, lo, hi) {
  const v = Number(value)
  const a = Number(lo)
  const b = Number(hi)
  if (!Number.isFinite(v)) return Number.isFinite(a) ? a : 0
  if (!Number.isFinite(a) && !Number.isFinite(b)) return v
  if (!Number.isFinite(a)) return Math.min(v, b)
  if (!Number.isFinite(b)) return Math.max(v, a)
  return a <= b ? Math.min(Math.max(v, a), b) : Math.min(Math.max(v, b), a)
}

/**
 * [min, max] over the finite numbers in `values` (array or any iterable).
 * Returns `fallback` when nothing finite was found.
 */
export function extent(values, fallback = DEFAULT_FALLBACK) {
  const fb = Array.isArray(fallback) ? fallback : DEFAULT_FALLBACK
  const fbLo = Number(fb[0])
  const fbHi = Number(fb[1])
  let lo = Infinity
  let hi = -Infinity
  const iterable =
    values != null &&
    typeof values !== 'string' &&
    typeof values[Symbol.iterator] === 'function'
  if (iterable) {
    for (const item of values) {
      const v = typeof item === 'number' ? item : Number(item)
      if (!Number.isFinite(v)) continue
      if (v < lo) lo = v
      if (v > hi) hi = v
    }
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    return [Number.isFinite(fbLo) ? fbLo : 0, Number.isFinite(fbHi) ? fbHi : 1]
  }
  return [lo, hi]
}

/**
 * Linear scale: maps `domain` to `range`.
 *   const s = linearScale({ domain: [0, 10], range: [50, 500] })
 *   s(5) === 275; s.invert(275) === 5
 * A degenerate domain is expanded by ±0.5 so `.invert` stays usable.
 */
export function linearScale(options = {}) {
  const domain = Array.isArray(options.domain) ? options.domain : DEFAULT_FALLBACK
  const range = Array.isArray(options.range) ? options.range : [0, 1]
  let d0 = Number(domain[0])
  let d1 = Number(domain[1])
  let r0 = Number(range[0])
  let r1 = Number(range[1])
  if (!Number.isFinite(d0)) d0 = 0
  if (!Number.isFinite(d1)) d1 = 1
  if (!Number.isFinite(r0)) r0 = 0
  if (!Number.isFinite(r1)) r1 = 1
  if (d0 === d1) {
    d0 -= 0.5
    d1 += 0.5
  }
  const k = (r1 - r0) / (d1 - d0)
  const scale = (value) => {
    const v = Number(value)
    if (!Number.isFinite(v)) return NaN
    return r0 + (v - d0) * k
  }
  scale.domain = [d0, d1]
  scale.range = [r0, r1]
  scale.invert = (pixel) => {
    const p = Number(pixel)
    if (!Number.isFinite(p)) return NaN
    return d0 + (p - r0) / k
  }
  return scale
}

/**
 * "Nice" ticks inside [min, max] using a 1/2/5 × 10^k step.
 * Returns at least one value; never loops forever on degenerate input.
 */
export function niceTicks(min, max, count = 5) {
  let lo = Number(min)
  let hi = Number(max)
  if (!Number.isFinite(lo)) lo = 0
  if (!Number.isFinite(hi)) hi = 1
  if (hi < lo) {
    const swap = lo
    lo = hi
    hi = swap
  }
  if (!(hi > lo)) return [lo]
  const want = Math.max(1, Math.min(MAX_TICK_COUNT, Math.floor(Number(count) || 5)))
  const raw = (hi - lo) / want
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)))
  const normalized = raw / magnitude
  const multiplier = normalized < 1.5 ? 1 : normalized < 3 ? 2 : normalized < 7 ? 5 : 10
  let step = multiplier * magnitude
  if (!Number.isFinite(step) || step <= 0) step = (hi - lo) / want
  const start = Math.ceil(lo / step - 1e-9) * step
  const ticks = []
  for (let i = 0; i < MAX_TICK_COUNT; i += 1) {
    const value = start + i * step
    if (value > hi + step * 1e-9) break
    ticks.push(Number(value.toPrecision(12)))
  }
  if (ticks.length === 0) ticks.push(Number(lo.toPrecision(12)), Number(hi.toPrecision(12)))
  return ticks
}

/**
 * Compact number with `sig` significant digits.
 *   3.14159 -> "3.142"   123456 -> "1.235e5"   0.0001234 -> "1.234e-4"
 * Non-finite input renders as "—" / "∞" / "−∞" so SVG text never says NaN.
 */
export function fmtNum(value, sig = 4) {
  const v = typeof value === 'number' ? value : Number(value)
  const digits = Math.max(1, Math.min(12, Math.floor(Number(sig)) || 4))
  if (Number.isNaN(v)) return '—'
  if (!Number.isFinite(v)) return v > 0 ? '∞' : '−∞'
  if (v === 0) return '0'
  const abs = Math.abs(v)
  if (abs >= 1e5 || abs < 1e-3) {
    let text = v.toExponential(digits - 1)
    text = text.replace(/(\.\d*?)0+e/, '$1e').replace(/\.e/, 'e')
    return text.replace(/e\+?(-?)0*(\d)/, 'e$1$2')
  }
  const decimals = Math.max(0, digits - 1 - Math.floor(Math.log10(abs)))
  let text = v.toFixed(Math.min(decimals, 12))
  if (text.includes('.')) text = text.replace(/0+$/, '').replace(/\.$/, '')
  return text === '-0' ? '0' : text
}

/** Format a p-value the way the results table wants it: "<0.001", "0.012". */
export function fmtP(p) {
  const v = Number(p)
  if (!Number.isFinite(v)) return '—'
  if (v < 0.001) return '<0.001'
  if (v >= 1) return '1'
  if (v > 0.999) return '>0.999'
  return v.toFixed(3)
}

/**
 * Polyline path from points.
 * Each point may be `[x, y]` or `{x, y}`; non-finite points are skipped.
 * Returns '' when nothing plottable remains.
 */
export function pathFromPoints(points) {
  if (!Array.isArray(points) || points.length === 0) return ''
  let d = ''
  for (const point of points) {
    const x = Array.isArray(point) ? Number(point[0]) : Number(point && point.x)
    const y = Array.isArray(point) ? Number(point[1]) : Number(point && point.y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    d += d ? ` L ${round2(x)} ${round2(y)}` : `M ${round2(x)} ${round2(y)}`
  }
  return d
}

/**
 * Step (ECDF) path from pixel points, in order.
 * Draws a horizontal run to the next x, then a vertical rise at that x.
 * `opts.toX` (pixel) extends the final horizontal run to the right edge.
 */
export function stepPath(points, options = {}) {
  const opts = options || {}
  if (!Array.isArray(points) || points.length === 0) return ''
  const clean = []
  for (const point of points) {
    const x = Array.isArray(point) ? Number(point[0]) : Number(point && point.x)
    const y = Array.isArray(point) ? Number(point[1]) : Number(point && point.y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue
    clean.push([x, y])
  }
  if (clean.length === 0) return ''
  let d = `M ${round2(clean[0][0])} ${round2(clean[0][1])}`
  for (let i = 1; i < clean.length; i += 1) {
    const [x, y] = clean[i]
    d += ` H ${round2(x)} L ${round2(x)} ${round2(y)}`
  }
  const toX = Number(opts.toX)
  if (Number.isFinite(toX)) {
    const last = clean[clean.length - 1]
    if (toX > last[0]) d += ` H ${round2(toX)}`
  }
  return d
}

/**
 * Subscribe to an element's box size.
 * Uses ResizeObserver when available, otherwise falls back to the window resize
 * event (callers should also render a sane default size immediately).
 * Returns a cleanup function; never throws.
 */
export function observeSize(element, onChange) {
  if (!element || typeof onChange !== 'function') return () => {}
  const doc = element.ownerDocument
  const win = (doc && doc.defaultView) || (typeof window !== 'undefined' ? window : null)
  let observer = null
  if (win && typeof win.ResizeObserver === 'function') {
    try {
      observer = new win.ResizeObserver(() => onChange())
      observer.observe(element)
    } catch {
      observer = null
    }
  }
  const onWindowResize = () => onChange()
  if (!observer && win && typeof win.addEventListener === 'function') {
    win.addEventListener('resize', onWindowResize)
  }
  return () => {
    if (observer) {
      try {
        observer.disconnect()
      } catch {}
      return
    }
    if (win && typeof win.removeEventListener === 'function') {
      win.removeEventListener('resize', onWindowResize)
    }
  }
}

function normalizeFallbackSize(fallback) {
  if (Array.isArray(fallback)) {
    const w = Number(fallback[0])
    const h = Number(fallback[1])
    return { width: w > 0 && Number.isFinite(w) ? w : DEFAULT_SIZE.width,
      height: h > 0 && Number.isFinite(h) ? h : DEFAULT_SIZE.height }
  }
  if (fallback && typeof fallback === 'object') {
    const w = Number(fallback.width)
    const h = Number(fallback.height)
    return { width: w > 0 && Number.isFinite(w) ? w : DEFAULT_SIZE.width,
      height: h > 0 && Number.isFinite(h) ? h : DEFAULT_SIZE.height }
  }
  return { width: DEFAULT_SIZE.width, height: DEFAULT_SIZE.height }
}

/**
 * Build the `useChartSize(ref, fallback)` hook for a given React namespace.
 * Kept as a factory so this module stays importable without React installed:
 *
 *   import * as React from 'react'
 *   const useChartSize = makeChartSizeHook(React)
 *
 * The hook returns `{width, height}` measured from `ref.current`, falling back
 * to 640×320 (or the supplied fallback) until the element is measurable.
 */
export function makeChartSizeHook(react) {
  const useState = react ? react.useState : null
  const useEffect = react ? react.useEffect : null
  return function useChartSize(ref, fallback) {
    if (typeof useState !== 'function' || typeof useEffect !== 'function') {
      throw new Error('[distfit] makeChartSizeHook(React) needs the React namespace with hooks')
    }
    const fb = normalizeFallbackSize(fallback)
    const [size, setSize] = useState({ width: fb.width, height: fb.height })
    const fbWidth = fb.width
    const fbHeight = fb.height
    useEffect(() => {
      const element = ref && ref.current
      if (!element) return undefined
      const read = () => {
        let width = 0
        let height = 0
        if (typeof element.getBoundingClientRect === 'function') {
          const rect = element.getBoundingClientRect()
          width = Math.round((rect && rect.width) || 0)
          height = Math.round((rect && rect.height) || 0)
        }
        if (!(width > 0)) width = Math.round(element.clientWidth || 0)
        if (!(height > 0)) height = Math.round(element.clientHeight || 0)
        const next =
          width > 0 && height > 0
            ? { width, height }
            : { width: fbWidth, height: fbHeight }
        setSize((prev) =>
          prev.width === next.width && prev.height === next.height ? prev : next,
        )
      }
      read()
      return observeSize(element, read)
    }, [ref, fbWidth, fbHeight])
    return size
  }
}
