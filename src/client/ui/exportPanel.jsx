/**
 * Export dialog for the diagnostic chart.
 *
 * Three things live here:
 *   1. a template gallery (journal / thesis / slide / print presets + saved ones),
 *   2. fine-grained style controls (font, palette, axes, legend, title, size …),
 *   3. an AI helper that turns a sentence ("我要投中文核心期刊，双栏、灰度可打印")
 *      into a style patch through the host route `/api/dsh-distfit/chart-style`.
 *
 * The preview is not a screenshot: the chart is rendered off-screen at the exact
 * export size with the chosen style, then serialised to SVG by the same
 * `buildExportSvg` the export buttons use. What you see is what you download.
 */
import * as React from 'react'
import { ChartFrame, HistFitChart, CdfChart, PpChart, QqChart } from './charts.jsx'
import { buildExportSvg, rasterizeSvg, buildPdfBytes, downloadBlob, exportName } from './chartExport.js'
import {
  TEMPLATE_PRESETS,
  FONT_STACKS,
  PALETTES,
  normalizeStyle,
  normalizeBarColor,
  BAR_GAP_MAX,
  chartStyleProps,
  exportOptionsOf,
  describeStyle,
  loadTemplates,
  saveTemplate,
  removeTemplate,
} from './chartStyle.js'

const { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } = React

const SIZE_PRESETS = [
  { id: 'p1280', label: '1280 × 720（16:9 幻灯片）', width: 1280, height: 720 },
  { id: 'p1600', label: '1600 × 900（16:9 高清）', width: 1600, height: 900 },
  { id: 'p1200x800', label: '1200 × 800（4:3 幻灯片）', width: 1200, height: 800 },
  { id: 'p1800x1200', label: '1800 × 1200（双栏期刊）', width: 1800, height: 1200 },
  { id: 'p1600x1200', label: '1600 × 1200（单栏期刊）', width: 1600, height: 1200 },
  { id: 'p2400', label: '2400 × 1350（印刷高清）', width: 2400, height: 1350 },
  { id: 'p900', label: '900 × 600（草稿）', width: 900, height: 600 },
  { id: 'custom', label: '自定义尺寸…', width: 0, height: 0 },
]

const FONT_OPTIONS = [
  ['sans', '无衬线（Segoe / 雅黑）'],
  ['hei', '黑体（雅黑 · 思源黑）'],
  ['song', '宋体 + Times（中文期刊）'],
  ['serif', 'Times（英文期刊）'],
  ['mono', '等宽'],
]

const PALETTE_OPTIONS = [
  ['default', '默认彩色'],
  ['cvd', '色盲友好（Okabe-Ito）'],
  ['mono', '单色蓝'],
  ['warm', '暖色系'],
  ['gray', '灰阶'],
]

const AXES_OPTIONS = [
  ['L', 'L 形坐标轴'],
  ['box', '四边框线'],
]

const LEGEND_OPTIONS = [
  ['bottom', '图例在下方'],
  ['right', '图例在右侧'],
  ['none', '不显示图例'],
]

/** Histogram bar looks; `soft` is the panel's default tint. */
const BAR_TONE_OPTIONS = [
  ['soft', '浅（默认）'],
  ['medium', '中'],
  ['bold', '深'],
  ['outline', '空心'],
]
const BAR_GAPS = [0, 1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40]
const BAR_RADII = [0, 1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40]

/** Colour shown in the picker while the bars still follow the theme. */
const BAR_COLOR_FALLBACK = '#c8ccd4'

/**
 * Scale factors offered by the 字号 / 线宽 selects.
 *
 * The upper end exists for print: an 1800–2400 px canvas needs 3–4× type for the
 * figure to survive being shrunk into a journal column or a slide body.
 */
const FONT_SCALES = [0.5, 0.7, 0.85, 1, 1.15, 1.3, 1.6, 2, 2.4, 2.8, 3.2, 3.6, 4, 5]
const STROKE_SCALES = [0.3, 0.5, 0.8, 1, 1.2, 1.6, 2, 2.4, 3, 3.6, 4.5, 6]

/**
 * Options for a numeric select, with the current value always present so a
 * template (or an AI patch) cannot leave the select showing a different number.
 * @param values - the offered values.
 * @param current - the value currently applied.
 * @returns the sorted option values.
 */
function scaleOptions(values, current) {
  const numeric = Number(current)
  if (!Number.isFinite(numeric) || values.includes(numeric)) return values
  return [...values, numeric].sort((a, b) => a - b)
}

const clamp = (value, min, max, fallback) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

/** Reply styles carry `font` (a stack key); everything else matches the style. */
function fromReplyStyle(reply, current) {
  const raw = reply && typeof reply === 'object' ? reply : {}
  const next = { ...current }
  if (typeof raw.font === 'string' && FONT_STACKS[raw.font]) next.fontStack = FONT_STACKS[raw.font]
  if (raw.fontStack) next.fontStack = raw.fontStack
  for (const key of ['fontScale', 'strokeScale', 'legendSize', 'barOpacity', 'pointSize']) {
    if (raw[key] !== undefined) next[key] = clamp(raw[key], 0.05, 4, next[key])
  }
  for (const key of ['barGap', 'barRadius']) {
    if (raw[key] !== undefined) next[key] = clamp(raw[key], 0, BAR_GAP_MAX, next[key])
  }
  if (['soft', 'medium', 'bold', 'outline'].includes(raw.barTone)) next.barTone = raw.barTone
  if (raw.barColor !== undefined) next.barColor = normalizeBarColor(raw.barColor)
  for (const key of ['grayscale', 'grid', 'barEdge']) {
    if (typeof raw[key] === 'boolean') next[key] = raw[key]
  }
  if (PALETTES[raw.palette]) next.palette = raw.palette
  if (raw.axes === 'L' || raw.axes === 'box') next.axes = raw.axes
  if (raw.legend === 'bottom' || raw.legend === 'right' || raw.legend === 'none') next.legend = raw.legend
  if (raw.background === 'white' || raw.background === 'transparent') next.background = raw.background
  if (typeof raw.title === 'string') next.title = raw.title.slice(0, 64)
  return normalizeStyle(next)
}

export function ExportPanel({ open, onClose, tab, tabNames, chart, columns, chosen }) {
  const [templateId, setTemplateId] = useState('default')
  const [sizeId, setSizeId] = useState('p1280')
  const [width, setWidth] = useState(1280)
  const [height, setHeight] = useState(720)
  const [style, setStyle] = useState(() => normalizeStyle(TEMPLATE_PRESETS[0].style))
  const [scale, setScale] = useState(2)
  const [saved, setSaved] = useState(() => loadTemplates())
  const [saveName, setSaveName] = useState('')
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [pane, setPane] = useState('template')
  const [aiReq, setAiReq] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [aiNotes, setAiNotes] = useState('')
  const [aiErr, setAiErr] = useState('')
  const stageRef = useRef(null)
  const aiAbort = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    setError('')
    setPane('template')
    return undefined
  }, [open])

  useEffect(() => () => aiAbort.current?.abort?.(), [])

  const applyTemplate = useCallback((template) => {
    if (!template) return
    setTemplateId(template.id)
    setWidth(template.width)
    setHeight(template.height)
    setSizeId(SIZE_PRESETS.find((s) => s.width === template.width && s.height === template.height)?.id ?? 'custom')
    setStyle(normalizeStyle(template.style))
  }, [])

  const patchStyle = useCallback((patch) => {
    setTemplateId('custom')
    setStyle((prev) => normalizeStyle({ ...prev, ...patch }))
  }, [])

  const legendMode = style.legend === 'none' ? 'none' : 'svg'
  const styleProps = useMemo(() => chartStyleProps(style), [style])

  const chartNode = useMemo(() => {
    if (!chart) return null
    const common = { width, height, style: styleProps, legendMode }
    if (tab === 'cdf') {
      return <CdfChart ecdf={chart.ecdf} curves={chart.curves} xLabel={chart.xLabel} yLabel={chart.yLabel} {...common} />
    }
    if (tab === 'pp') {
      return (
        <PpChart
          points={chart.ppPoints}
          distName={chart.distName}
          color={chart.color}
          xLabel={chart.xLabel}
          yLabel={chart.yLabel}
          {...common}
        />
      )
    }
    if (tab === 'qq') {
      return (
        <QqChart
          points={chart.qqPoints}
          distName={chart.distName}
          color={chart.color}
          xLabel={chart.xLabel}
          yLabel={chart.yLabel}
          {...common}
        />
      )
    }
    return (
      <HistFitChart
        histogram={chart.histogram}
        curves={chart.curves}
        xLabel={chart.xLabel}
        yLabel={chart.yLabel}
        {...common}
      />
    )
  }, [chart, tab, width, height, styleProps, legendMode])

  const exportOptions = useMemo(() => exportOptionsOf(style, { width, height }), [style, width, height])

  // Render → serialise: one layout pass gives a preview identical to the file.
  useLayoutEffect(() => {
    if (!open) return
    const svg = stageRef.current?.querySelector('svg')
    if (!svg) {
      setPreview('')
      setError('当前页签没有可导出的图表')
      return
    }
    try {
      const text = buildExportSvg(svg, exportOptions)
      setPreview(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`)
      setError('')
    } catch (err) {
      setPreview('')
      setError(err?.message ?? '预览生成失败')
    }
  }, [open, exportOptions, tab, chartNode])

  const runExport = useCallback(
    async (format) => {
      const svg = stageRef.current?.querySelector('svg')
      if (!svg) {
        setError('当前页签没有可导出的图表')
        return
      }
      setBusy(format)
      setError('')
      try {
        const text = buildExportSvg(svg, exportOptions)
        const base = `${chart?.xLabel || 'data'}-${tab}`
        if (format === 'svg') {
          downloadBlob(exportName(base, 'svg'), new Blob([text], { type: 'image/svg+xml;charset=utf-8' }))
          return
        }
        if (format === 'pdf') {
          const jpeg = await rasterizeSvg(text, {
            width,
            height,
            type: 'image/jpeg',
            quality: 0.95,
            scale: Math.max(2, scale),
          })
          const bytes = buildPdfBytes(new Uint8Array(await jpeg.arrayBuffer()), width, height)
          downloadBlob(exportName(base, 'pdf'), new Blob([bytes], { type: 'application/pdf' }))
          return
        }
        const blob = await rasterizeSvg(text, {
          width,
          height,
          type: format === 'jpg' ? 'image/jpeg' : 'image/png',
          quality: 0.92,
          scale,
        })
        downloadBlob(exportName(base, format), blob)
      } catch (err) {
        setError(err?.message ?? '导出失败')
      } finally {
        setBusy('')
      }
    },
    [exportOptions, chart, tab, width, height, scale],
  )

  const askAi = useCallback(async () => {
    const request = aiReq.trim()
    if (!request || aiBusy) return
    setAiBusy(true)
    setAiErr('')
    setAiNotes('')
    const controller = typeof AbortController === 'function' ? new AbortController() : null
    aiAbort.current = controller
    try {
      const res = await fetch('/api/dsh-distfit/chart-style', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          request,
          context: {
            tab,
            tabLabel: tabNames?.[tab] ?? tab,
            columns: Array.isArray(columns) ? columns : [],
            families: Array.isArray(chosen) ? chosen : [],
            size: { width, height },
            preset: templateId,
            style,
            summary: describeStyle(style),
          },
        }),
        signal: controller?.signal,
      })
      if (res.status === 404) throw new Error('AI 样式服务尚未就绪：重启一次 DeepSeek Harness 后再试')
      const payload = await res.json().catch(() => null)
      if (!payload) throw new Error(`服务返回异常（HTTP ${res.status}）`)
      if (!payload.ok) throw new Error(payload.error || '模型没有给出可用的样式')
      let nextStyle = fromReplyStyle(payload.style, style)
      let nextWidth = width
      let nextHeight = height
      const preset = TEMPLATE_PRESETS.find((p) => p.id === payload.preset)
      if (preset) {
        nextStyle = fromReplyStyle(payload.style, normalizeStyle(preset.style))
        nextWidth = preset.width
        nextHeight = preset.height
        setTemplateId(preset.id)
        setSizeId(SIZE_PRESETS.find((s) => s.width === preset.width && s.height === preset.height)?.id ?? 'custom')
      } else {
        setTemplateId('custom')
      }
      /*
       * The model answers a style patch, and "灰度可打印" is easy for it to drop
       * when it maps the request onto a preset. Honour the explicit words the
       * user typed instead of trusting the reply for this one flag.
       */
      if (/灰度|黑白|单色|灰阶|grayscale|print|打印/i.test(request) && typeof payload.style?.grayscale !== 'boolean') {
        nextStyle = { ...nextStyle, grayscale: true }
      }
      setStyle(nextStyle)
      setWidth(nextWidth)
      setHeight(nextHeight)
      setAiNotes(
        [payload.notes, Array.isArray(payload.warnings) && payload.warnings.length ? `提示：${payload.warnings.join('；')}` : '']
          .filter(Boolean)
          .join('\n') || '已按描述调整样式。',
      )
    } catch (err) {
      setAiErr(err?.message ?? 'AI 调整失败')
    } finally {
      setAiBusy(false)
      aiAbort.current = null
    }
  }, [aiReq, aiBusy, tab, tabNames, columns, chosen, width, height, templateId, style])

  if (!open) return null

  const activeTemplate = templateId === 'custom' ? null : [...TEMPLATE_PRESETS, ...saved].find((t) => t.id === templateId)

  return (
    <div className="df-overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="df-modal df-modal-export" role="dialog" aria-modal="true" aria-label="导出图表">
        <div className="df-modal-head">
          <div>
            <h2 className="df-card-title">导出图表</h2>
            <p className="df-export-meta">
              {tabNames?.[tab] ?? tab} · {chart?.xLabel || '—'} · {width} × {height} px · {describeStyle(style)}
            </p>
          </div>
          <button type="button" className="df-btn df-btn-ghost df-btn-sm" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="df-modal-body df-export-body">
          <div className="df-export-preview">
            {preview ? (
              <img src={preview} alt={`${tabNames?.[tab] ?? tab} 预览`} />
            ) : (
              <p className="df-hint">{error || '正在生成预览…'}</p>
            )}
            <div className="df-export-actions">
              {['svg', 'png', 'jpg', 'pdf'].map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  className={`df-btn${fmt === 'svg' ? ' df-btn-primary' : ''}`}
                  disabled={Boolean(busy)}
                  onClick={() => void runExport(fmt)}
                >
                  {busy === fmt ? '导出中…' : fmt.toUpperCase()}
                </button>
              ))}
            </div>
            <p className="df-hint df-export-filename">文件名：distfit-{chart?.xLabel || 'data'}-{tab}-{'<时间戳>'}.{'{'}svg|png|jpg|pdf{'}'}</p>
          </div>

          <div className="df-export-controls">
            <div className="df-tabs df-export-panes" role="tablist">
              {[
                ['template', '模板'],
                ['style', '样式'],
                ['ai', 'AI 调整'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={pane === id}
                  className={`df-tab${pane === id ? ' df-tab-on' : ''}`}
                  onClick={() => setPane(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            {pane === 'template' ? (
              <div className="df-export-pane">
                <div className="df-export-templates">
                  {TEMPLATE_PRESETS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`df-export-tpl${templateId === t.id ? ' df-export-tpl-on' : ''}`}
                      onClick={() => applyTemplate(t)}
                    >
                      <span className="df-export-tpl-name">{t.name}</span>
                      <span className="df-export-tpl-desc">{t.desc}</span>
                    </button>
                  ))}
                </div>
                {saved.length > 0 ? (
                  <>
                    <p className="df-export-sec-title">我的模板</p>
                    <div className="df-export-templates">
                      {saved.map((t) => (
                        <div key={t.id} className={`df-export-tpl${templateId === t.id ? ' df-export-tpl-on' : ''}`}>
                          <button type="button" className="df-export-tpl-pick" onClick={() => applyTemplate(t)}>
                            <span className="df-export-tpl-name">{t.name}</span>
                            <span className="df-export-tpl-desc">
                              {t.width} × {t.height} · {describeStyle(t.style)}
                            </span>
                          </button>
                          <button
                            type="button"
                            className="df-export-tpl-del"
                            title="删除模板"
                            onClick={() => setSaved(removeTemplate(t.id))}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
                <p className="df-note">
                  {activeTemplate
                    ? `当前：${activeTemplate.name}（${activeTemplate.desc}）`
                    : '当前：自定义样式。可切到「样式」手动微调，或在下方保存为模板。'}
                </p>
                <div className="df-export-save">
                  <input
                    className="df-input"
                    placeholder="模板名称，如「课题组论文图」"
                    value={saveName}
                    maxLength={24}
                    onChange={(e) => setSaveName(e.target.value)}
                  />
                  <button
                    type="button"
                    className="df-btn df-btn-sm"
                    onClick={() => {
                      const name = saveName.trim() || `我的模板 ${saved.length + 1}`
                      const list = saveTemplate({ name, desc: describeStyle(style), width, height, style })
                      setSaved(list)
                      setSaveName('')
                      setTemplateId(list[0]?.id ?? 'custom')
                    }}
                  >
                    保存为模板
                  </button>
                </div>
              </div>
            ) : null}

            {pane === 'style' ? (
              <div className="df-export-pane">
                <div className="df-field">
                  <label htmlFor="df-ex-size">尺寸</label>
                  <select
                    id="df-ex-size"
                    className="df-select"
                    value={sizeId}
                    onChange={(e) => {
                      const id = e.target.value
                      setSizeId(id)
                      const preset = SIZE_PRESETS.find((s) => s.id === id)
                      if (preset && preset.width) {
                        setWidth(preset.width)
                        setHeight(preset.height)
                      }
                      setTemplateId('custom')
                    }}
                  >
                    {SIZE_PRESETS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="df-field">
                  <label htmlFor="df-ex-w">宽 × 高（px）</label>
                  <span className="df-export-size">
                    <input
                      id="df-ex-w"
                      className="df-input"
                      type="number"
                      min={320}
                      max={4000}
                      value={width}
                      onChange={(e) => {
                        setWidth(clamp(e.target.value, 320, 4000, width))
                        setSizeId('custom')
                        setTemplateId('custom')
                      }}
                    />
                    <span className="df-export-x">×</span>
                    <input
                      className="df-input"
                      type="number"
                      min={240}
                      max={4000}
                      value={height}
                      onChange={(e) => {
                        setHeight(clamp(e.target.value, 240, 4000, height))
                        setSizeId('custom')
                        setTemplateId('custom')
                      }}
                    />
                  </span>
                </div>
                <div className="df-field">
                  <label htmlFor="df-ex-font">字体</label>
                  <select
                    id="df-ex-font"
                    className="df-select"
                    value={Object.keys(FONT_STACKS).find((k) => FONT_STACKS[k] === style.fontStack) ?? 'custom'}
                    onChange={(e) => {
                      const stack = FONT_STACKS[e.target.value]
                      if (stack) patchStyle({ fontStack: stack })
                    }}
                  >
                    {FONT_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="df-field">
                  <label htmlFor="df-ex-palette">配色</label>
                  <select
                    id="df-ex-palette"
                    className="df-select"
                    value={style.palette}
                    onChange={(e) => patchStyle({ palette: e.target.value })}
                  >
                    {PALETTE_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="df-export-grid2">
                  <div className="df-field">
                    <label htmlFor="df-ex-fontscale">字号</label>
                    <select
                      id="df-ex-fontscale"
                      className="df-select"
                      value={String(style.fontScale)}
                      onChange={(e) => patchStyle({ fontScale: Number(e.target.value) })}
                    >
                      {scaleOptions(FONT_SCALES, style.fontScale).map((v) => (
                        <option key={v} value={v}>
                          {v}×{v === 1 ? '（默认）' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="df-field">
                    <label htmlFor="df-ex-stroke">线宽</label>
                    <select
                      id="df-ex-stroke"
                      className="df-select"
                      value={String(style.strokeScale)}
                      onChange={(e) => patchStyle({ strokeScale: Number(e.target.value) })}
                    >
                      {scaleOptions(STROKE_SCALES, style.strokeScale).map((v) => (
                        <option key={v} value={v}>
                          {v}×{v === 1 ? '（默认）' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="df-export-grid2">
                  <div className="df-field">
                    <label htmlFor="df-ex-axes">边框</label>
                    <select
                      id="df-ex-axes"
                      className="df-select"
                      value={style.axes}
                      onChange={(e) => patchStyle({ axes: e.target.value })}
                    >
                      {AXES_OPTIONS.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="df-field">
                    <label htmlFor="df-ex-legend">图例</label>
                    <select
                      id="df-ex-legend"
                      className="df-select"
                      value={style.legend}
                      onChange={(e) => patchStyle({ legend: e.target.value })}
                    >
                      {LEGEND_OPTIONS.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="df-export-grid3">
                  <div className="df-field">
                    <label htmlFor="df-ex-bartone">填充</label>
                    <select
                      id="df-ex-bartone"
                      className="df-select"
                      value={style.barTone}
                      onChange={(e) => patchStyle({ barTone: e.target.value })}
                    >
                      {BAR_TONE_OPTIONS.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="df-field">
                    <label htmlFor="df-ex-bargap">间距</label>
                    <select
                      id="df-ex-bargap"
                      className="df-select"
                      value={String(style.barGap)}
                      onChange={(e) => patchStyle({ barGap: Number(e.target.value) })}
                    >
                      {scaleOptions(BAR_GAPS, style.barGap).map((v) => (
                        <option key={v} value={v}>
                          {v === 0 ? '紧贴' : `${v} px`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="df-field">
                    <label htmlFor="df-ex-barradius">圆角</label>
                    <select
                      id="df-ex-barradius"
                      className="df-select"
                      value={String(style.barRadius)}
                      onChange={(e) => patchStyle({ barRadius: Number(e.target.value) })}
                    >
                      {scaleOptions(BAR_RADII, style.barRadius).map((v) => (
                        <option key={v} value={v}>
                          {v === 0 ? '直角' : `${v} px`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="df-field">
                  <label htmlFor="df-ex-barcolor">柱体颜色</label>
                  <span className="df-export-color">
                    <input
                      id="df-ex-barcolor"
                      className="df-color"
                      type="color"
                      value={style.barColor ?? BAR_COLOR_FALLBACK}
                      onChange={(e) => patchStyle({ barColor: e.target.value })}
                    />
                    <button
                      type="button"
                      className="df-btn df-btn-sm df-btn-ghost"
                      onClick={() => patchStyle({ barColor: null })}
                      title="清空自选颜色，柱体跟随主题"
                    >
                      {style.barColor ? '跟随主题' : '跟随主题（当前）'}
                    </button>
                  </span>
                </div>
                <div className="df-field">
                  <label htmlFor="df-ex-title">图注标题（可留空）</label>
                  <input
                    id="df-ex-title"
                    className="df-input"
                    maxLength={40}
                    placeholder="如：木材 / 塑料 / 纤维 强度分布拟合"
                    value={style.title}
                    onChange={(e) => patchStyle({ title: e.target.value })}
                  />
                </div>
                <div className="df-export-grid2">
                  <label className="df-field-check">
                    <input
                      type="checkbox"
                      checked={style.grayscale}
                      onChange={(e) => patchStyle({ grayscale: e.target.checked })}
                    />
                    <span>灰度图</span>
                  </label>
                  <label className="df-field-check">
                    <input
                      type="checkbox"
                      checked={style.grid}
                      onChange={(e) => patchStyle({ grid: e.target.checked })}
                    />
                    <span>显示网格线</span>
                  </label>
                  <label className="df-field-check">
                    <input
                      type="checkbox"
                      checked={style.barEdge}
                      onChange={(e) => patchStyle({ barEdge: e.target.checked })}
                    />
                    <span>柱体描边</span>
                  </label>
                  <label className="df-field-check">
                    <input
                      type="checkbox"
                      checked={style.background === 'transparent'}
                      onChange={(e) => patchStyle({ background: e.target.checked ? 'transparent' : 'white' })}
                    />
                    <span>透明背景</span>
                  </label>
                </div>
                <div className="df-field">
                  <label htmlFor="df-ex-scale">位图倍率</label>
                  <select
                    id="df-ex-scale"
                    className="df-select"
                    value={String(scale)}
                    onChange={(e) => setScale(Number(e.target.value))}
                  >
                    <option value="1">1×（原尺寸）</option>
                    <option value="2">2×（清晰，推荐）</option>
                    <option value="3">3×（印刷）</option>
                  </select>
                </div>
                <p className="df-export-note">
                  SVG 保留矢量与可编辑文字；PNG / JPG 按倍率栅格化；PDF 为内嵌位图的单页。透明度仅对 SVG 与 PNG 生效。
                </p>
              </div>
            ) : null}

            {pane === 'ai' ? (
              <div className="df-export-pane">
                <p className="df-export-note">
                  用一句话说明用途，模型会给出尺寸 + 样式方案：例如「投中文核心期刊，双栏、灰度可打印」或「组会 PPT，用大字粗线」。
                </p>
                <p className="df-export-note">
                  AI 只能调整样式参数（字体、配色、坐标轴、图例、尺寸、灰度）；数据、多子图排版、柱体花纹等需要手动处理。
                </p>
                <textarea
                  className="df-textarea"
                  rows={3}
                  maxLength={600}
                  placeholder="我要把这张图放进学位论文：A4 单栏，宋体，灰度打印也能分清各条曲线"
                  value={aiReq}
                  onChange={(e) => setAiReq(e.target.value)}
                />
                <div className="df-export-ai-actions">
                  <button type="button" className="df-btn df-btn-primary df-btn-sm" disabled={aiBusy || !aiReq.trim()} onClick={() => void askAi()}>
                    {aiBusy ? '正在生成…' : 'AI 生成样式'}
                  </button>
                  <span className="df-hint">调用 DSH 模型服务，约 5–20 秒</span>
                </div>
                {aiErr ? <p className="df-ai-error">{aiErr}</p> : null}
                {aiNotes ? (
                  <div className="df-export-ai-notes">
                    <p className="df-export-sec-title">模型说明</p>
                    <p className="df-note">{aiNotes}</p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {error ? <p className="df-ai-error df-export-error">{error}</p> : null}

        {/* Off-screen render target: exact export pixels, serialised on every change. */}
        <div className="df-export-stage" ref={stageRef} aria-hidden="true" style={{ width, height }}>
          {chartNode}
        </div>
      </div>
    </div>
  )
}
