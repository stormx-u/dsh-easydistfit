/**
 * DistFit — chart export.
 *
 * The diagnosis charts are live React SVG: colours come partly from inline
 * props and partly from the panel stylesheet, so an exported file must not
 * depend on that stylesheet. This module therefore walks the live chart and
 * the clone side by side, inlines every computed paint/text property, then
 * serialises the result at the requested pixel size.
 *
 * Export targets: SVG (vector), PNG, JPG (raster via canvas) and PDF (a
 * minimal single-image PDF, so no PDF library is bundled).
 *
 * Everything here is browser-side and DOM-optional at import time, so the pure
 * helpers stay testable under Node.
 */

/** Paper sizes offered in the export dialog (CSS pixels). */
export const CHART_PRESETS = [
  { id: 'p1280', label: '1280 × 720（16:9 幻灯片）', width: 1280, height: 720 },
  { id: 'p1600', label: '1600 × 900（大图 16:9）', width: 1600, height: 900 },
  { id: 'p1200x800', label: '1200 × 800（4:3 报告）', width: 1200, height: 800 },
  { id: 'p2400', label: '2400 × 1350（高清 2×）', width: 2400, height: 1350 },
  { id: 'p900x600', label: '900 × 600（网页插图）', width: 900, height: 600 },
  { id: 'custom', label: '自定义尺寸…', width: 0, height: 0 },
]

/** Computed properties copied from the live chart into the export clone. */
const PAINT_PROPS = [
  'fill',
  'fill-opacity',
  'fill-rule',
  'stroke',
  'stroke-width',
  'stroke-opacity',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-linecap',
  'stroke-linejoin',
  'opacity',
  'visibility',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'letter-spacing',
  'text-anchor',
  'dominant-baseline',
  'paint-order',
]

/** A font stack that exists on Windows, macOS and Linux and covers CJK. */
const EXPORT_FONT = "'Microsoft YaHei', 'PingFang SC', 'Noto Sans CJK SC', 'Segoe UI', sans-serif"

const HEX = /^#([0-9a-f]{3,8})$/i
const RGB = /^rgba?\(([^)]+)\)$/i

const clampChannel = (value) => Math.max(0, Math.min(255, Math.round(value)))

/** Relative luminance of a colour channel triple (ITU-R BT.601). */
export function luminance(r, g, b) {
  return clampChannel(0.299 * r + 0.587 * g + 0.114 * b)
}

/**
 * Convert a CSS colour to its grey equivalent, keeping any alpha channel.
 * Unknown values (`none`, `url(#…)`, `transparent`) are returned untouched.
 * @param value - computed CSS colour.
 * @returns grey colour string, or the original value when it is not a colour.
 */
export function toGrayColor(value) {
  const text = String(value ?? '').trim()
  if (!text || text === 'none' || text === 'transparent' || text === 'currentColor') return value
  if (text.startsWith('url(')) return value

  const hex = HEX.exec(text)
  if (hex) {
    const digits = hex[1]
    if (digits.length === 3) {
      const [r, g, b] = digits.split('').map((c) => parseInt(c + c, 16))
      return `rgb(${luminance(r, g, b)}, ${luminance(r, g, b)}, ${luminance(r, g, b)})`
    }
    const r = parseInt(digits.slice(0, 2), 16)
    const g = parseInt(digits.slice(2, 4), 16)
    const b = parseInt(digits.slice(4, 6), 16)
    const grey = luminance(r, g, b)
    return `rgb(${grey}, ${grey}, ${grey})`
  }

  const rgb = RGB.exec(text)
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean)
    const nums = parts.slice(0, 4).map((part) => (part.endsWith('%') ? (parseFloat(part) / 100) * 255 : parseFloat(part)))
    if (nums.length >= 3 && nums.every((n) => Number.isFinite(n))) {
      const grey = luminance(nums[0], nums[1], nums[2])
      const alpha = nums.length > 3 ? nums[3] : 1
      return alpha < 1 ? `rgba(${grey}, ${grey}, ${grey}, ${alpha})` : `rgb(${grey}, ${grey}, ${grey})`
    }
  }
  return value
}

/**
 * Parse a CSS colour into channels; returns null for anything that is not a
 * plain hex/rgb/rgba colour (so gradients and `none` fall through untouched).
 */
function parseColor(value) {
  const text = String(value ?? '').trim()
  const hex = HEX.exec(text)
  if (hex) {
    const digits = hex[1]
    const expand = digits.length === 3 ? digits.split('').map((c) => c + c).join('') : digits
    return {
      r: parseInt(expand.slice(0, 2), 16),
      g: parseInt(expand.slice(2, 4), 16),
      b: parseInt(expand.slice(4, 6), 16),
      a: 1,
    }
  }
  const rgb = RGB.exec(text)
  if (!rgb) return null
  const parts = rgb[1]
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map((part) => (part.endsWith('%') ? (parseFloat(part) / 100) * 255 : parseFloat(part)))
  if (parts.length < 3 || parts.slice(0, 3).some((n) => !Number.isFinite(n))) return null
  return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 }
}

const INK_TEXT = '#22262b'
const INK_LINE = '#8a9099'
const INK_FAINT = '#d9dee5'

/**
 * The panel paints near-white ink in dark mode, which would vanish on the white
 * export canvas. Map those paints onto readable equivalents.
 * @param value - computed paint value.
 * @param faint - keep hairline strokes faint instead of full ink.
 */
function readableOnLight(value, faint) {
  const colour = parseColor(value)
  if (!colour || colour.a < 0.05) return value
  if (luminance(colour.r, colour.g, colour.b) < 200) return value
  if (colour.a < 0.6) return faint ? INK_FAINT : INK_LINE
  return INK_TEXT
}

/** Pixel size of the live chart, ignoring CSS scaling. */function chartSize(svgEl) {
  const box = svgEl.getBoundingClientRect()
  const viewBox = svgEl.viewBox?.baseVal
  const width = (viewBox && viewBox.width) || box.width || svgEl.clientWidth || 720
  const height = (viewBox && viewBox.height) || box.height || svgEl.clientHeight || 360
  return { width, height }
}

/**
 * Build the standalone SVG text for one chart.
 *
 * @param svgEl - the live `<svg>` node rendered by `charts.jsx`.
 * @param options.width - output width in CSS pixels.
 * @param options.height - output height in CSS pixels.
 * @param options.grayscale - convert every paint colour to grey.
 * @param options.background - page colour; `null` keeps the SVG transparent.
 * @param options.grid - keep (`true`) or hide the grid lines.
 * @param options.fontScale - typography multiplier (0.8 – 1.4).
 * @param options.strokeScale - stroke-width multiplier (0.6 – 2).
 * @returns serialised SVG document text.
 */
export function buildExportSvg(svgEl, options = {}) {
  if (!svgEl || typeof svgEl.cloneNode !== 'function') throw new Error('当前页签还没有可导出的图表')
  const {
    width = 1200,
    height = 675,
    grayscale = false,
    background = '#ffffff',
    grid = true,
    fontScale = 1,
    strokeScale = 1,
    fontFamily = EXPORT_FONT,
  } = options
  const size = chartSize(svgEl)
  const clone = svgEl.cloneNode(true)
  const bgColour = parseColor(background)
  const lightBackground = !bgColour || (bgColour.a > 0.05 && luminance(bgColour.r, bgColour.g, bgColour.b) > 190)

  const originals = [svgEl, ...svgEl.querySelectorAll('*')]
  const copies = [clone, ...clone.querySelectorAll('*')]
  const count = Math.min(originals.length, copies.length)

  for (let i = 0; i < count; i += 1) {
    const source = originals[i]
    const target = copies[i]
    if (!(source instanceof Element) || !(target instanceof Element)) continue
    const computed = window.getComputedStyle(source)
    const className = source.getAttribute('class') || ''
    const hiddenByGrid = !grid && /gridline/.test(className)
    const tag = String(source.tagName || '').toLowerCase()
    const isText = tag === 'text' || tag === 'tspan'

    for (const prop of PAINT_PROPS) {
      const value = computed.getPropertyValue(prop)
      if (!value) continue
      let next = value
      if (prop === 'font-size') next = `${parseFloat(value) * fontScale}px`
      if (prop === 'stroke-width') next = `${parseFloat(value) * strokeScale}`
      if (prop === 'font-family') next = fontFamily
      if (lightBackground && (prop === 'fill' || prop === 'stroke')) next = readableOnLight(next, !isText)
      if (grayscale && (prop === 'fill' || prop === 'stroke')) next = String(toGrayColor(next))
      target.style.setProperty(prop, next)
      // Keep the presentation attribute in sync, otherwise a viewer that prefers
      // attributes over inline CSS would still paint the original hue.
      if ((prop === 'fill' || prop === 'stroke') && target.hasAttribute(prop)) target.setAttribute(prop, next)
    }
    if (hiddenByGrid) target.style.setProperty('visibility', 'hidden')
    // Classes are dropped: the export must not depend on the panel stylesheet.
    if (target.hasAttribute('class')) target.removeAttribute('class')
  }

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
  clone.setAttribute('width', String(Math.round(width)))
  clone.setAttribute('height', String(Math.round(height)))
  clone.setAttribute('viewBox', `0 0 ${size.width} ${size.height}`)
  clone.setAttribute('preserveAspectRatio', 'xMidYMid meet')
  if (typeof clone.style?.removeProperty === 'function') {
    clone.style.removeProperty('font-family')
  }
  clone.style.setProperty('font-family', fontFamily)
  clone.style.setProperty('background', background ?? 'transparent')

  if (background) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    rect.setAttribute('x', '0')
    rect.setAttribute('y', '0')
    rect.setAttribute('width', '100%')
    rect.setAttribute('height', '100%')
    rect.setAttribute('fill', grayscale ? '#ffffff' : background)
    clone.insertBefore(rect, clone.firstChild)
  }

  const serialized = new XMLSerializer().serializeToString(clone)
  return `<?xml version="1.0" encoding="UTF-8"?>\n${serialized}`
}

/** Turn one SVG string into a PNG/JPG blob at `scale` device pixels. */
export function rasterizeSvg(svgText, { width, height, type = 'image/png', quality = 0.92, scale = 2 } = {}) {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('当前环境不支持栅格化导出'))
      return
    }
    const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }))
    const image = new Image()
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const factor = Math.max(1, Math.min(4, scale))
        canvas.width = Math.round(width * factor)
        canvas.height = Math.round(height * factor)
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
        URL.revokeObjectURL(url)
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('图像编码失败'))),
          type,
          type === 'image/jpeg' ? quality : undefined,
        )
      } catch (error) {
        URL.revokeObjectURL(url)
        reject(error)
      }
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('SVG 渲染失败，无法导出位图'))
    }
    image.src = url
  })
}

const ascii = (text) => new TextEncoder().encode(text)

/**
 * Wrap one JPEG in a minimal single-page PDF (`DCTDecode` image XObject).
 * @param jpeg - JPEG bytes produced by `canvas.toBlob`.
 * @param width - page width in CSS pixels.
 * @param height - page height in CSS pixels.
 * @returns PDF bytes.
 */
export function buildPdfBytes(jpeg, width, height) {
  const pageWidth = Number((width * 0.75).toFixed(2))
  const pageHeight = Number((height * 0.75).toFixed(2))
  const imageWidth = Math.round(width)
  const imageHeight = Math.round(height)
  const content = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ\n`
  const contentBytes = ascii(content)

  const chunks = []
  const offsets = [0]
  let length = 0
  const push = (data) => {
    const bytes = typeof data === 'string' ? ascii(data) : data
    chunks.push(bytes)
    length += bytes.length
  }
  const beginObject = () => {
    offsets.push(length)
  }

  push('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n')
  beginObject()
  push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n')
  beginObject()
  push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n')
  beginObject()
  push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
      `/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
  )
  beginObject()
  push(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
  )
  push(jpeg)
  push('\nendstream\nendobj\n')
  beginObject()
  push(`5 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`)
  push(contentBytes)
  push('endstream\nendobj\n')

  const xrefOffset = length
  const xref = [`xref\n0 ${offsets.length}\n`, '0000000000 65535 f \n']
  for (let i = 1; i < offsets.length; i += 1) {
    xref.push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`)
  }
  push(xref.join(''))
  push(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`)

  const out = new Uint8Array(length)
  let at = 0
  for (const chunk of chunks) {
    out.set(chunk, at)
    at += chunk.length
  }
  return out
}

/** Save a blob through a temporary anchor. */
export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

/** Build the file name used for every export of one chart. */
export function exportName(prefix, format) {
  const raw = String(prefix ?? '').trim()
  const safe = (raw || 'chart').replace(/[\\/:*?"<>|\s]+/g, '-')
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  return `distfit-${safe}-${stamp}.${String(format || 'png').toLowerCase()}`
}
