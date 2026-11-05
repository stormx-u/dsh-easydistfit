/**
 * Chart templates — the styling layer shared by the on-screen chart and the
 * export pipeline.
 *
 * A *style* is a flat, serialisable object. Every field is optional: missing or
 * unknown values fall back to `STYLE_DEFAULTS`, which keeps the export path safe
 * when a template arrives from localStorage or from the AI helper.
 *
 * A *template* is `{ id, name, desc, width, height, style }`; presets live in
 * `TEMPLATE_PRESETS`, user templates in localStorage under `STORAGE_KEY`.
 */
import { PALETTE } from './styles.js'

/** Physical size / purpose hints shown under each preset name. */
export const FONT_STACKS = {
  sans: `'Segoe UI', 'Microsoft YaHei', 'PingFang SC', 'Noto Sans CJK SC', Arial, sans-serif`,
  hei: `'Microsoft YaHei', 'PingFang SC', 'Source Han Sans SC', 'Noto Sans CJK SC', 'Segoe UI', sans-serif`,
  song: `'Times New Roman', 'Nimbus Roman No9 L', 'Songti SC', SimSun, 'Noto Serif CJK SC', serif`,
  serif: `'Times New Roman', 'Nimbus Roman No9 L', Georgia, 'Songti SC', SimSun, serif`,
  mono: `'JetBrains Mono', Consolas, 'Courier New', monospace`,
}

/** Series colour sets. `gray` is a real luminance ladder, not a CSS filter. */
export const PALETTES = {
  default: Array.isArray(PALETTE) && PALETTE.length > 0 ? PALETTE : ['#4c7dff'],
  cvd: [
    '#0072b2', '#e69f00', '#009e73', '#cc79a7', '#56b4e9',
    '#d55e00', '#f0e442', '#8c564b', '#7f7f7f', '#a6761d',
  ],
  mono: [
    '#1f4e9c', '#2f6fbf', '#4c8fd9', '#6da9e8', '#8dc1f2',
    '#2b3a55', '#546c8c', '#7b91ad', '#a3b4c9', '#c9d5e2',
  ],
  warm: [
    '#b3591f', '#d9822b', '#e8a33d', '#a13d2d', '#7b4a2e',
    '#c94f68', '#8b5cf6', '#3ea45d', '#3f7fb5', '#6f7680',
  ],
  gray: [
    '#1c2026', '#3b424b', '#5a626c', '#787f89', '#949ba4',
    '#adb3bb', '#c3c8ce', '#d6dade', '#e6e9ec', '#b0b6be',
  ],
}

/** Default style — equals the current colourful, gridded look. */
export const STYLE_DEFAULTS = {
  fontStack: FONT_STACKS.sans,
  fontScale: 1,
  strokeScale: 1,
  palette: 'default',
  grayscale: false,
  grid: true,
  axes: 'L',
  legend: 'bottom',
  legendSize: 1,
  background: 'white',
  title: '',
  // `styles.js` already paints bars with a 16 % colour mix, so 1 means "as on screen".
  barOpacity: 1,
  barEdge: true,
  // Bar look: how heavily the histogram is tinted, how far bars sit apart and
  // how round their tops are. `soft` is the default on-screen look.
  barTone: 'soft',
  barGap: 2,
  barRadius: 3,
  // Explicit bar colour (`#rrggbb`); null = follow the panel theme.
  barColor: null,
  pointSize: 1,
}

const FONT_KEYS = Object.keys(FONT_STACKS)
const PALETTE_KEYS = Object.keys(PALETTES)
const AXES = ['L', 'box']
const LEGENDS = ['bottom', 'right', 'none']
const BACKGROUNDS = ['white', 'transparent']
const BAR_TONES = ['soft', 'medium', 'bold', 'outline']
const TITLE_LIMIT = 64
/** Upper bound for the bar gap / radius sliders (px). */
export const BAR_GAP_MAX = 40
export const BAR_RADIUS_MAX = 40

/** `#rgb` / `#rrggbb` in, lowercase `#rrggbb` out; anything else becomes null. */
export function normalizeBarColor(value) {
  if (typeof value !== 'string') return null
  const raw = value.trim().toLowerCase()
  const short = /^#([0-9a-f]{3})$/.exec(raw)
  if (short) {
    const [r, g, b] = short[1].split('').map((ch) => ch + ch)
    return `#${r}${g}${b}`
  }
  return /^#[0-9a-f]{6}$/.test(raw) ? raw : null
}

const num = (value, min, max, fallback) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

/**
 * Coerce anything (template file, AI reply, stale localStorage) into a style the
 * chart layer and export pipeline can trust.
 */
export function normalizeStyle(input) {
  const raw = input && typeof input === 'object' ? input : {}
  const base = STYLE_DEFAULTS
  const palette = String(raw.palette ?? '')
  const axes = String(raw.axes ?? '')
  const legend = String(raw.legend ?? '')
  const background = String(raw.background ?? '')
  const fontStack = String(raw.fontStack ?? '')
  const barTone = String(raw.barTone ?? '')
  return {
    fontStack: fontStack.length > 0 ? fontStack : base.fontStack,
    fontScale: num(raw.fontScale, 0.5, 6, base.fontScale),
    strokeScale: num(raw.strokeScale, 0.3, 6, base.strokeScale),
    palette: PALETTE_KEYS.includes(palette) ? palette : base.palette,
    grayscale: typeof raw.grayscale === 'boolean' ? raw.grayscale : base.grayscale,
    grid: typeof raw.grid === 'boolean' ? raw.grid : base.grid,
    axes: AXES.includes(axes) ? axes : base.axes,
    legend: LEGENDS.includes(legend) ? legend : base.legend,
    legendSize: num(raw.legendSize, 0.7, 2, base.legendSize),
    background: BACKGROUNDS.includes(background) ? background : base.background,
    title: String(raw.title ?? '').slice(0, TITLE_LIMIT),
    barOpacity: num(raw.barOpacity, 0.05, 1, base.barOpacity),
    barEdge: typeof raw.barEdge === 'boolean' ? raw.barEdge : base.barEdge,
    barTone: BAR_TONES.includes(barTone) ? barTone : base.barTone,
    barGap: num(raw.barGap, 0, BAR_GAP_MAX, base.barGap),
    barRadius: num(raw.barRadius, 0, BAR_RADIUS_MAX, base.barRadius),
    barColor: normalizeBarColor(raw.barColor),
    pointSize: num(raw.pointSize, 0.4, 3, base.pointSize),
  }
}

/** Resolved colours for the current series order. */
export function paletteOf(style) {
  const key = PALETTE_KEYS.includes(style?.palette) ? style.palette : 'default'
  return PALETTES[key]
}

/** What the chart component needs; mirrors the `style` prop contract. */
export function chartStyleProps(style) {
  const s = normalizeStyle(style)
  return {
    fontStack: s.fontStack,
    fontScale: s.fontScale,
    strokeScale: s.strokeScale,
    palette: paletteOf(s),
    grid: s.grid,
    axes: s.axes,
    legend: s.legend,
    legendSize: s.legendSize,
    title: s.title,
    barOpacity: s.barOpacity,
    barEdge: s.barEdge,
    barTone: s.barTone,
    barGap: s.barGap,
    barRadius: s.barRadius,
    barColor: s.barColor,
    pointSize: s.pointSize,
  }
}

/**
 * Export options derived from a style. Grayscale stays a serializer concern
 * (it also has to de-colour the background), so it is forwarded separately.
 *
 * `fontScale`/`strokeScale` are deliberately NOT forwarded: the chart components
 * bake them into inline `font-size`/`stroke-width`, and `buildExportSvg` scales
 * computed values again — forwarding them would apply the factor twice.
 */
export function exportOptionsOf(style, size) {
  const s = normalizeStyle(style)
  return {
    width: size?.width ?? 0,
    height: size?.height ?? 0,
    grayscale: s.grayscale,
    background: s.background === 'transparent' ? '' : '#ffffff',
    grid: s.grid,
    fontFamily: s.fontStack,
    fontScale: 1,
    strokeScale: 1,
  }
}

/** True when the template wants its legend baked into the SVG. */
export function legendInSvg(style) {
  return normalizeStyle(style).legend !== 'none'
}

/**
 * Presets cover the two real use cases: a paper figure (serif, no grid, tight
 * canvas) and a slide (sans, heavier strokes, 16:9, transparent option).
 */
export const TEMPLATE_PRESETS = [
  {
    id: 'default',
    name: '默认（彩色 · 网格）',
    desc: '1280×720 · 无衬线 · 浅网格',
    width: 1280,
    height: 720,
    style: { ...STYLE_DEFAULTS },
  },
  {
    id: 'paper-cn',
    name: '中文期刊 · 双栏',
    desc: '1800×1200 · 宋体+Times · 全框线 · 无网格',
    width: 1800,
    height: 1200,
    style: {
      fontStack: FONT_STACKS.song,
      fontScale: 3.2,
      strokeScale: 2.6,
      palette: 'default',
      grid: false,
      axes: 'box',
      legend: 'bottom',
      legendSize: 1.05,
      title: '',
      barOpacity: 1,
      barTone: 'medium',
      barGap: 2,
      barRadius: 0,
    },
  },
  {
    id: 'paper-en',
    name: '英文期刊 · 单栏',
    desc: '1600×1200 · Times · Okabe-Ito 色 · 图例在右',
    width: 1600,
    height: 1200,
    style: {
      fontStack: FONT_STACKS.serif,
      fontScale: 2.9,
      strokeScale: 2.4,
      palette: 'cvd',
      grid: false,
      axes: 'box',
      legend: 'right',
      legendSize: 1,
      barOpacity: 1,
      barTone: 'medium',
      barGap: 2,
      barRadius: 0,
    },
  },
  {
    id: 'thesis',
    name: '学位论文 · 单栏',
    desc: '1800×1300 · 宋体 · L 形轴 · 无网格',
    width: 1800,
    height: 1300,
    style: {
      fontStack: FONT_STACKS.song,
      fontScale: 3.3,
      strokeScale: 2.6,
      palette: 'default',
      grid: false,
      axes: 'L',
      legend: 'bottom',
      barOpacity: 1,
      barTone: 'medium',
      barGap: 3,
      barRadius: 2,
    },
  },
  {
    id: 'ppt',
    name: '演示文稿 · 16:9',
    desc: '1920×1080 · 黑体 · 粗线 · 大字',
    width: 1920,
    height: 1080,
    style: {
      fontStack: FONT_STACKS.hei,
      fontScale: 3,
      strokeScale: 2.4,
      palette: 'default',
      grid: false,
      axes: 'L',
      legend: 'bottom',
      legendSize: 1.2,
      barOpacity: 1,
      barTone: 'medium',
      barGap: 3,
      barRadius: 4,
    },
  },
  {
    id: 'ppt-clear',
    name: '演示文稿 · 透明底',
    desc: '1600×900 · 透明背景 · 贴到深色母版',
    width: 1600,
    height: 900,
    style: {
      fontStack: FONT_STACKS.hei,
      fontScale: 2.8,
      strokeScale: 2.3,
      palette: 'default',
      grid: false,
      axes: 'L',
      legend: 'bottom',
      legendSize: 1.15,
      background: 'transparent',
      barOpacity: 1,
      barTone: 'soft',
      barGap: 3,
      barRadius: 4,
    },
  },
  {
    id: 'print-bw',
    name: '黑白打印',
    desc: '1800×1200 · 灰度 · 全框线',
    width: 1800,
    height: 1200,
    style: {
      fontStack: FONT_STACKS.serif,
      fontScale: 3.2,
      strokeScale: 2.6,
      palette: 'gray',
      grayscale: true,
      grid: false,
      axes: 'box',
      legend: 'bottom',
      barOpacity: 1,
      barTone: 'outline',
      barGap: 2,
      barRadius: 0,
    },
  },
]

export const CUSTOM_TEMPLATE = {
  id: 'custom',
  name: '自定义',
  desc: '手动调整尺寸与样式',
  width: 1280,
  height: 720,
  style: { ...STYLE_DEFAULTS },
}

const STORAGE_KEY = 'distfit.templates.v1'

function storage() {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    return null
  }
}

/** User templates saved from the export dialog, newest first. */
export function loadTemplates() {
  const store = storage()
  if (!store) return []
  try {
    const raw = store.getItem(STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : []
    if (!Array.isArray(list)) return []
    return list
      .filter((t) => t && typeof t === 'object' && typeof t.id === 'string')
      .map((t) => ({
        id: `user:${t.id}`,
        name: String(t.name ?? '我的模板').slice(0, 24),
        desc: String(t.desc ?? '自定义模板').slice(0, 60),
        width: Math.round(num(t.width, 320, 4000, 1280)),
        height: Math.round(num(t.height, 240, 4000, 720)),
        style: normalizeStyle(t.style),
      }))
  } catch {
    return []
  }
}

function writeTemplates(list) {
  const store = storage()
  if (!store) return list
  try {
    store.setItem(
      STORAGE_KEY,
      JSON.stringify(
        list.map((t) => ({
          id: String(t.id).replace(/^user:/, ''),
          name: t.name,
          desc: t.desc,
          width: t.width,
          height: t.height,
          style: normalizeStyle(t.style),
        })),
      ),
    )
  } catch {
    /* quota / private mode: saving is best effort */
  }
  return list
}

/** Insert or replace one template (matched by `name`), newest first. */
export function saveTemplate({ id, name, desc, width, height, style }) {
  const list = loadTemplates()
  const rawId = String(id ?? '').replace(/^user:/, '')
  const key = rawId || `t${Date.now().toString(36)}`
  const entry = {
    id: `user:${key}`,
    name: String(name || '我的模板').slice(0, 24),
    desc: String(desc ?? '').slice(0, 60),
    width: Math.round(num(width, 320, 4000, 1280)),
    height: Math.round(num(height, 240, 4000, 720)),
    style: normalizeStyle(style),
  }
  const next = [entry, ...list.filter((t) => String(t.id).replace(/^user:/, '') !== key)]
  writeTemplates(next)
  return next
}

export function removeTemplate(id) {
  const key = String(id ?? '').replace(/^user:/, '')
  const next = loadTemplates().filter((t) => String(t.id).replace(/^user:/, '') !== key)
  writeTemplates(next)
  return next
}

/** Presets followed by the user's own templates. */
export function allTemplates() {
  return [...TEMPLATE_PRESETS, ...loadTemplates()]
}

export function templateById(id) {
  return allTemplates().find((t) => t.id === id) ?? null
}

/** Human summary of a style, used in the dialog and the AI reply header. */
export function describeStyle(style) {
  const s = normalizeStyle(style)
  const bits = []
  const fontName =
    s.fontStack === FONT_STACKS.song
      ? '宋体'
      : s.fontStack === FONT_STACKS.serif
        ? 'Times'
        : s.fontStack === FONT_STACKS.hei
          ? '黑体'
          : s.fontStack === FONT_STACKS.mono
            ? '等宽'
            : '无衬线'
  bits.push(fontName)
  bits.push(`${s.fontScale.toFixed(2).replace(/0$/, '')}× 字号`)
  bits.push(s.axes === 'box' ? '全框线' : 'L 形轴')
  bits.push(s.grid ? '有网格' : '无网格')
  bits.push(s.grayscale ? '灰度' : `配色 ${s.palette}`)
  const toneName = { soft: '浅', medium: '中', bold: '深', outline: '空心' }[s.barTone]
  if (toneName) bits.push(`柱体${toneName}`)
  if (s.background === 'transparent') bits.push('透明底')
  bits.push(s.legend === 'none' ? '无图例' : s.legend === 'right' ? '图例在右' : '图例在下')
  return bits.join(' · ')
}
