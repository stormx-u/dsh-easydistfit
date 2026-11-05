/**
 * DistFit panel — the whole workbench: data intake, family selection, fitting
 * controls, KPI strip, interactive charts and the ranking / test tables.
 *
 * The heavy lifting is `src/engine` (pure JS); this file only orchestrates
 * state, layout and presentation. Charts come from `./charts.jsx`.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { analyze, DISTS } from '../../engine/index.js'
import { PALETTE } from './styles.js'
import { FORMULAS, FAMILY_HINT } from './formulas.js'
import { SAMPLE_CSV, SAMPLE_NAME } from './sample.js'
import { ChartFrame, HistFitChart, CdfChart, PpChart, QqChart } from './charts.jsx'
import { buildAiSummary } from './aiSummary.js'
import { ExportPanel } from './exportPanel.jsx'

const DEFAULT_DISTS = ['normal', 'lognormal', 'gumbel', 'gev', 'gamma', 'weibull']
const TEST_DEFS = [
  { id: 'ks', label: 'K-S', full: 'Kolmogorov–Smirnov' },
  { id: 'ad', label: 'A-D', full: 'Anderson–Darling' },
  { id: 'cvm', label: 'CvM', full: 'Cramér–von Mises' },
  { id: 'chi2', label: 'χ²', full: 'Pearson 卡方' },
]
const GROUP_ORDER = ['位置-尺度型', '正偏寿命型', '极值型', '有界型']
const DEFAULT_TESTS = ['ks', 'ad', 'cvm', 'chi2']
const QPROBS = [0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99]
const TAB_NAMES = { density: '概率密度', cdf: '累积分布', pp: 'P-P', qq: 'Q-Q' }

/* ------------------------------------------------------------------ format */
const nf = (v, d = 3) =>
  v === null || v === undefined || !Number.isFinite(Number(v))
    ? '—'
    : Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: d })

function fmtP(p) {
  if (p === null || p === undefined || !Number.isFinite(Number(p))) return '—'
  const v = Number(p)
  if (v < 0.001) return '<0.001'
  if (v > 0.999) return '>0.999'
  return v.toFixed(3)
}

function sigNum(v, n = 4) {
  if (!Number.isFinite(Number(v))) return '—'
  const a = Math.abs(Number(v))
  if (a === 0) return '0'
  if (a >= 1e5 || a < 1e-3) return Number(v).toExponential(n - 1)
  return Number(Number(v).toPrecision(n)).toString()
}

/* -------------------------------------------------------------- csv intake */
function splitLine(line, delim) {
  if (delim === '\t') return line.split('\t')
  if (delim === ';') return line.split(';')
  return line.split(',')
}

function detectDelimiter(line) {
  const counts = [
    [',', (line.match(/,/g) || []).length],
    ['\t', (line.match(/\t/g) || []).length],
    [';', (line.match(/;/g) || []).length],
  ].sort((a, b) => b[1] - a[1])
  return counts[0][1] > 0 ? counts[0][0] : ','
}

function isNumericCell(cell) {
  const t = String(cell ?? '').trim()
  if (t === '') return true // blank = missing, still "numeric" column
  return Number.isFinite(Number(t.replace(/[,\s]/g, '')))
}

/** Parse pasted CSV / TSV / semicolon text into numeric columns. */
export function parseTable(text) {
  const lines = String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((line) => line.trim() !== '')
  if (lines.length === 0) return { header: [], columns: [] }
  const delim = detectDelimiter(lines[0])
  const firstCells = splitLine(lines[0], delim).map((c) => c.trim())
  const headerless = firstCells.every(isNumericCell)
  const header = headerless ? firstCells.map((_, i) => `列 ${i + 1}`) : firstCells.map((c, i) => c || `列 ${i + 1}`)
  const body = headerless ? lines : lines.slice(1)
  const buckets = header.map((name) => ({ name, values: [], missing: 0 }))
  for (const line of body) {
    const cells = splitLine(line, delim)
    for (let i = 0; i < buckets.length; i += 1) {
      const raw = (cells[i] ?? '').trim().replace(/[,\s]/g, '')
      if (raw === '') {
        buckets[i].missing += 1
        continue
      }
      const v = Number(raw)
      if (Number.isFinite(v)) buckets[i].values.push(v)
      else buckets[i].missing += 1
    }
  }
  return { header, columns: buckets.filter((c) => c.values.length >= 5) }
}

function buildCsv(rows, columns) {
  const head = ['数据集', '排名', '分布', '参数', 'logL', 'AIC', 'BIC', 'ΔAIC', '权重', ...TEST_DEFS.map((t) => `${t.label} p`), '判定']
  const lines = [head.join(',')]
  for (const r of rows) {
    lines.push(
      [
        r.dataset,
        r.rank,
        r.distName,
        `"${r.paramsText ?? ''}"`,
        sigNum(r.loglik),
        sigNum(r.aic),
        sigNum(r.bic),
        sigNum(r.deltaAic),
        sigNum(r.weight),
        ...TEST_DEFS.map((t) => (r.tests?.[t.id] ? sigNum(r.tests[t.id].p) : '')),
        r.verdict ?? '',
      ].join(','),
    )
  }
  return lines.join('\n')
}

function buildMarkdown(result, columns, chosen, alpha, aiText = '') {
  const stamp = new Date().toLocaleString('zh-CN')
  const names = (columns ?? []).map((c) => (typeof c === 'string' ? c : c.name))
  const lines = [`# 分布拟合报告`, '', `生成时间：${stamp}`, `候选分布：${chosen.length} 个 · 显著性水平 α = ${alpha}`, '']
  for (const col of names) {
    const rows = (result.rows ?? []).filter((r) => r.dataset === col)
    const dataset = (result.datasets ?? []).find((d) => d.name === col)
    const stats = dataset?.stats
    if (!rows.length) continue
    lines.push(`## ${col}`, '')
    if (stats) {
      lines.push(
        `- 样本量 n = ${nf(dataset.n, 0)}，均值 = ${nf(stats.mean)}，标准差 = ${nf(stats.sd)}，偏度 = ${nf(stats.skew, 2)}，超额峰度 = ${nf(stats.kurt, 2)}`,
        '',
      )
    }
    lines.push('| # | 分布 | 参数估计 | logL | AIC | ΔAIC | 权重 | 结论 |', '| --- | --- | --- | --- | --- | --- | --- | --- |')
    const usable = rows.filter((r) => Number.isFinite(r.aic))
    const sorted = [...usable].sort((a, b) => a.aic - b.aic)
    const minAic = sorted.length ? sorted[0].aic : NaN
    const deltas = sorted.map((r) => Math.exp(-0.5 * (r.aic - minAic)))
    const total = deltas.reduce((acc, v) => acc + v, 0) || 1
    sorted.forEach((r, i) => {
      const deltaAic = r.aic - minAic
      const weight = deltas[i] / total
      lines.push(
        `| ${i + 1} | ${r.distName} | ${(r.paramsText ?? '').replace(/\|/g, '/')} | ${sigNum(r.loglik)} | ${sigNum(r.aic)} | ${nf(deltaAic, 1)} | ${nf(weight, 3)} | ${verdictOf(r.tests, alpha).text} |`,
      )
    })
    lines.push('')
    const best = sorted[0]
    if (best) {
      lines.push(`最优：**${best.distName}**（AIC ${sigNum(best.aic)}，ΔAIC 0）。`, '')
    }
  }
  if (String(aiText || '').trim()) {
    lines.push(`## AI 解读`, '', String(aiText).trim(), '')
  }
  return lines.join('\n')
}

function buildJson(result, columns) {
  return JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      columns: (columns ?? []).map((c) => (typeof c === 'string' ? { name: c } : { name: c.name, n: c.values?.length })),
      // The engine carries descriptive statistics on each dataset entry.
      stats: (result.datasets ?? []).map((d) => ({
        dataset: d.name,
        n: d.n,
        removed: d.removed ?? 0,
        ...(d.stats ?? {}),
      })),
      rows: (result.rows ?? []).map((r) => ({
        dataset: r.dataset,
        rank: r.rank,
        distId: r.distId,
        distName: r.distName,
        k: r.k,
        params: r.params,
        paramsText: r.paramsText,
        loglik: r.loglik,
        aic: r.aic,
        bic: r.bic,
        deltaAic: r.deltaAic,
        weight: r.weight,
        tests: r.tests,
      })),
    },
    null,
    2,
  )
}

function download(filename, text, mime = 'text/csv;charset=utf-8', bom = true) {
  try {
    const blob = new Blob([bom ? `\ufeff${text}` : text], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.rel = 'noopener'
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => {
      a.remove()
      URL.revokeObjectURL(url)
    }, 2000)
  } catch (error) {
    console.warn('[distfit] download failed', error)
  }
}

/* ------------------------------------------------------------------- atoms */
function Check({ on, onClick, color, name, hint, k }) {
  return (
    <button
      type="button"
      className={`df-check${on ? ' df-check-on' : ''}`}
      onClick={onClick}
      title={hint ? `${name} — ${hint}` : name}
      aria-pressed={on}
    >
      <span className="df-check-box" aria-hidden="true">
        {on ? (
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1.5 5.2l2.2 2.2 4.8-4.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>
      <span className="df-check-dot" style={{ background: color || 'transparent' }} aria-hidden="true" />
      <span className="df-check-name">{name}</span>
      <span className="df-check-k">{k ? `${k} 参` : ''}</span>
    </button>
  )
}

function Kpi({ label, value, unit, foot }) {
  return (
    <div className="df-kpi">
      <div className="df-kpi-label">{label}</div>
      <div className="df-kpi-value">
        {value}
        {unit ? <span className="df-kpi-unit">{unit}</span> : null}
      </div>
      {foot ? <div className="df-kpi-foot">{foot}</div> : null}
    </div>
  )
}

function Badge({ kind = 'idle', children }) {
  return <span className={`df-badge df-badge-${kind}`}>{children}</span>
}

function verdictOf(tests, alpha) {
  const entries = Object.values(tests || {}).filter((t) => t && Number.isFinite(t.p))
  if (!entries.length) return { kind: 'idle', text: '—', pass: null }
  const failed = entries.filter((t) => t.p < alpha)
  if (failed.length === 0) return { kind: 'ok', text: '接受', pass: true }
  if (failed.length === entries.length) return { kind: 'err', text: '拒绝', pass: false }
  return { kind: 'warn', text: '部分拒绝', pass: false }
}

/* ----------------------------------------------------------------- ai text */
const AI_ENDPOINT = '/api/dsh-distfit/explain'
const AI_TIMEOUT_MS = 120000

/** Split an inline string into text and <strong> runs (`**bold**`). */
function inlineRuns(text) {
  const out = []
  let rest = String(text ?? '')
  let key = 0
  while (rest) {
    const open = rest.indexOf('**')
    if (open < 0) {
      out.push(rest)
      break
    }
    const close = rest.indexOf('**', open + 2)
    if (close < 0) {
      out.push(rest)
      break
    }
    if (open > 0) out.push(rest.slice(0, open))
    out.push(<strong key={`b${key++}`}>{rest.slice(open + 2, close)}</strong>)
    rest = rest.slice(close + 2)
  }
  return out
}

/**
 * Minimal Markdown renderer for the analyst answer: headings, bullet and
 * numbered lists, bold runs and paragraphs. The model is asked for exactly
 * these four sections, so a full parser would be dead weight.
 */
function AiText({ text }) {
  const lines = String(text ?? '').split(/\r?\n/)
  const blocks = []
  let list = null
  const flushList = () => {
    if (!list) return
    const items = list.items
    blocks.push(
      list.ordered ? (
        <ol key={`l${blocks.length}`} className="df-ai-list">
          {items.map((item, i) => (
            <li key={i}>{inlineRuns(item)}</li>
          ))}
        </ol>
      ) : (
        <ul key={`l${blocks.length}`} className="df-ai-list">
          {items.map((item, i) => (
            <li key={i}>{inlineRuns(item)}</li>
          ))}
        </ul>
      ),
    )
    list = null
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      flushList()
      continue
    }
    const head = /^(#{1,4})\s+(.*)$/.exec(line)
    if (head) {
      flushList()
      const depth = Math.min(head[1].length, 3)
      const Tag = depth === 1 ? 'h3' : 'h4'
      blocks.push(
        <Tag key={`h${blocks.length}`} className={`df-ai-h df-ai-h${depth}`}>
          {inlineRuns(head[2])}
        </Tag>,
      )
      continue
    }
    const bullet = /^[-*•]\s+(.*)$/.exec(line)
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line)
    if (bullet || numbered) {
      const ordered = Boolean(numbered)
      if (!list || list.ordered !== ordered) {
        flushList()
        list = { ordered, items: [] }
      }
      list.items.push((bullet ?? numbered)[1])
      continue
    }
    flushList()
    blocks.push(
      <p key={`p${blocks.length}`} className="df-ai-p">
        {inlineRuns(line)}
      </p>,
    )
  }
  flushList()
  return <div className="df-ai-text">{blocks}</div>
}

/* -------------------------------------------------------------------- logo */
function LogoTile() {
  return (
    <div className="df-logo" aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 20h18" opacity="0.5" />
        <path d="M5 18V11M9 18V7M13 18v-5M17 18V8M21 18v-4" opacity="0.75" />
        <path d="M3.2 14.6c2.6-4.4 5-5.9 8.8-5.9s6.2 1.5 8.8 5.9" />
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------- panel */
export default function DistFitApp() {
  const [csvText, setCsvText] = useState(SAMPLE_CSV)
  const [activeCol, setActiveCol] = useState('')
  const [selected, setSelected] = useState(DEFAULT_DISTS)
  const [tests, setTests] = useState(DEFAULT_TESTS)
  const [alpha, setAlpha] = useState(0.05)
  const [mc, setMc] = useState(false)
  const [mcB, setMcB] = useState(999)
  const [bins, setBins] = useState(0)
  const [tab, setTab] = useState('density')
  const [focusId, setFocusId] = useState('')
  const [sortKey, setSortKey] = useState('aic')
  const [legendAll, setLegendAll] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [ai, setAi] = useState({ status: 'idle', text: '', model: '', provider: '', ms: 0, error: '', key: '' })
  const [aiOpen, setAiOpen] = useState(true)
  const [aiElapsed, setAiElapsed] = useState(0)
  const [exportOpen, setExportOpen] = useState(false)
  const aiCache = useRef(new Map())
  const aiAbort = useRef(null)
  const fileRef = useRef(null)

  // A model call can take a minute; a live counter proves the card is not stuck.
  useEffect(() => {
    if (ai.status !== 'loading') {
      setAiElapsed(0)
      return undefined
    }
    const startedAt = Date.now()
    setAiElapsed(0)
    const timer = setInterval(() => setAiElapsed(Math.round((Date.now() - startedAt) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [ai.status])

  const table = useMemo(() => parseTable(csvText), [csvText])
  const columns = table.columns

  useEffect(() => {
    if (!columns.length) {
      setActiveCol('')
      return
    }
    if (!columns.some((c) => c.name === activeCol)) setActiveCol(columns[0].name)
  }, [columns, activeCol])

  const datasets = useMemo(
    () => columns.map((c) => ({ name: c.name, values: c.values })),
    [columns],
  )
  const dataKey = useMemo(() => datasets.map((d) => `${d.name}:${d.values.length}`).join('|'), [datasets])
  const selKey = selected.join(',')
  const testKey = tests.join(',')

  useEffect(() => {
    if (!datasets.length || !selected.length) {
      setResult(null)
      return undefined
    }
    setBusy(true)
    const timer = setTimeout(() => {
      try {
        const out = analyze(datasets, {
          dists: selected,
          tests,
          alpha,
          B: mc ? Math.max(99, Math.min(5000, Number(mcB) || 999)) : 0,
          bins: Number(bins) || 0,
          seed: 20260101,
          maxDists: 32,
          gridSize: 260,
        })
        setResult(out)
        setError('')
      } catch (err) {
        console.error('[distfit] analyze failed', err)
        setError(String(err?.message || err))
        setResult(null)
      } finally {
        setBusy(false)
      }
    }, 24)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey, selKey, testKey, alpha, mc, mcB, bins])

  /* ------------------------------------------------------------- ai interpret */
  const aiSummary = useMemo(
    () => (result ? buildAiSummary(result, columns, selected, alpha) : null),
    [result, columns, selected, alpha],
  )
  const aiSummaryKey = useMemo(() => (aiSummary ? JSON.stringify(aiSummary) : ''), [aiSummary])

  useEffect(() => {
    if (!aiSummary) {
      setAi({ status: 'idle', text: '', model: '', provider: '', ms: 0, error: '', key: '' })
      return undefined
    }
    const cached = aiCache.current.get(aiSummaryKey)
    if (cached) {
      setAi(cached)
      return undefined
    }
    const timer = setTimeout(() => {
      void requestAi(aiSummary, aiSummaryKey)
    }, 600)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiSummaryKey])

  /**
   * Ask the host to interpret the current result. The host owns the model
   * credentials and the prompt; this side only ships the digest and renders
   * whatever comes back.
   */
  async function requestAi(payload, key, { force = false } = {}) {
    if (!force) {
      const cached = aiCache.current.get(key)
      if (cached) {
        setAi(cached)
        return
      }
    }
    try {
      aiAbort.current?.abort()
    } catch {
      /* older browsers */
    }
    const controller = typeof AbortController === 'function' ? new AbortController() : null
    aiAbort.current = controller
    const started = Date.now()
    setAi({ status: 'loading', text: '', model: '', provider: '', ms: 0, error: '', key })
    try {
      const res = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ summary: payload }),
        signal: controller?.signal,
      })
      const data = await res.json().catch(() => ({}))
      if (!data || data.ok !== true) {
        // A 404 means the running host was booted before this route existed
        // (the client bundle updates on refresh, the host half only on restart).
        const fallback =
          res.status === 404 ? 'AI 服务尚未就绪：重启 DSH 后再试' : `请求失败（HTTP ${res.status}）`
        throw new Error(data?.error || fallback)
      }
      const text = String(data.text ?? '').trim()
      if (!text) throw new Error('模型没有返回内容')
      const next = {
        status: 'ok',
        text,
        model: String(data.model ?? ''),
        provider: String(data.provider ?? ''),
        ms: Number(data.ms) || Date.now() - started,
        error: '',
        key,
      }
      aiCache.current.set(key, next)
      if (controller?.signal?.aborted) return
      setAi(next)
    } catch (err) {
      if (controller?.signal?.aborted) return
      setAi({
        status: 'err',
        text: '',
        model: '',
        provider: '',
        ms: Date.now() - started,
        error: String(err?.message || err),
        key,
      })
    }
  }

  /* ------------------------------------------------------- derived views */
  const orderIndex = useMemo(() => {
    const map = new Map()
    const list = Array.isArray(DISTS) ? DISTS : Object.values(DISTS || {})
    list.forEach((d, i) => map.set(d.id, i))
    return map
  }, [])
  const colorOf = (id) => PALETTE[(orderIndex.get(id) ?? 0) % PALETTE.length]

  const familyList = useMemo(() => {
    const list = Array.isArray(DISTS) ? DISTS : Object.values(DISTS || {})
    return list.slice().sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group))
  }, [])

  const activeData = result?.datasets?.find((d) => d.name === activeCol)
  const activeValues = useMemo(
    () => columns.find((c) => c.name === activeCol)?.values ?? [],
    [columns, activeCol],
  )
  const activeRows = useMemo(() => {
    if (!result) return []
    return result.rows.filter((r) => r.dataset === activeCol && r.converged)
  }, [result, activeCol])

  const ranking = useMemo(() => {
    if (!result) return []
    const byId = new Map(activeRows.map((r) => [r.distId, r]))
    const rows = result.ranking
      .filter((r) => r.dataset === activeCol)
      .map((r) => {
        const detail = byId.get(r.distId) || {}
        const tests_ = detail.tests || {}
        return {
          ...detail,
          ...r,
          distName: detail.distName || r.distId,
          tests: tests_,
          verdict: verdictOf(tests_, alpha).text,
        }
      })
    const dir = sortKey === 'ks' ? -1 : 1
    const val = (r) => {
      if (sortKey === 'aic') return r.aic
      if (sortKey === 'bic') return r.bic
      if (sortKey === 'ks') return r.tests?.ks?.p ?? -1
      return r.aic
    }
    return rows
      .slice()
      .sort((a, b) => dir * (Number(val(a)) - Number(val(b))))
      .map((r, i) => ({ ...r, rank: i + 1 }))
  }, [result, activeCol, activeRows, alpha, sortKey])

  const best = ranking[0]
  const focus = useMemo(() => {
    if (!ranking.length) return null
    return ranking.find((r) => r.distId === focusId) || best
  }, [ranking, focusId, best])

  useEffect(() => {
    if (ranking.length && !ranking.some((r) => r.distId === focusId)) setFocusId(ranking[0].distId)
  }, [ranking, focusId])

  const curves = useMemo(() => {
    if (!result) return []
    return result.curves
      .filter((c) => c.dataset === activeCol)
      .map((c) => ({
        distId: c.distId,
        name: activeRows.find((r) => r.distId === c.distId)?.distName || c.distId,
        color: colorOf(c.distId),
        pdf: c.pdf,
        cdf: c.cdf,
        x: c.x,
        active: c.distId === focus?.distId,
      }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, activeCol, focus, activeRows])

  const histogram = useMemo(
    () => result?.histograms?.find((h) => h.dataset === activeCol) || null,
    [result, activeCol],
  )
  const ecdfData = useMemo(
    () => result?.ecdf?.find((e) => e.dataset === activeCol) || null,
    [result, activeCol],
  )
  const ppData = useMemo(() => {
    if (!result || !focus) return null
    return result.pp.find((p) => p.dataset === activeCol && p.distId === focus.distId) || null
  }, [result, activeCol, focus])
  const qqData = useMemo(() => {
    if (!result || !focus) return null
    return result.qq.find((p) => p.dataset === activeCol && p.distId === focus.distId) || null
  }, [result, activeCol, focus])
  const quantileRow = useMemo(() => {
    if (!result || !focus) return null
    return result.quantiles.find((q) => q.dataset === activeCol && q.distId === focus.distId) || null
  }, [result, activeCol, focus])

  // Data bundle for the export dialog: it re-renders the active tab at full size.
  const exportChart = useMemo(
    () => ({
      histogram,
      curves,
      ecdf: ecdfData,
      ppPoints: ppData?.points,
      qqPoints: qqData?.points,
      distName: activeRows.find((r) => r.distId === focus?.distId)?.distName,
      color: focus ? colorOf(focus.distId) : undefined,
      xLabel: activeCol,
      yLabel: '密度',
    }),
    [histogram, curves, ecdfData, ppData, qqData, activeRows, focus, activeCol],
  )

  /* --------------------------------------------------------- interactions */
  const toggleDist = (id) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.length > 1 ? prev.filter((x) => x !== id) : prev
      return [...prev, id]
    })
  }

  const summaryText = () => {
    if (!result) return ''
    const parts = [`# DistFit 拟合摘要`, '']
    for (const ds of result.datasets) {
      const rows = result.ranking.filter((r) => r.dataset === ds.name).slice(0, 3)
      parts.push(`## ${ds.name}（n=${ds.n}）`)
      rows.forEach((r, i) => {
        const detail = result.rows.find((x) => x.dataset === ds.name && x.distId === r.distId)
        parts.push(`${i + 1}. ${detail?.distName ?? r.distId}  AIC=${sigNum(r.aic)}  ${detail?.paramsText ?? ''}`)
      })
      parts.push('')
    }
    return parts.join('\n')
  }

  const openEditor = () => {
    setDraft(csvText)
    setEditorOpen(true)
  }
  const applyEditor = () => {
    setCsvText(draft)
    setEditorOpen(false)
  }
  const onPickFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setCsvText(String(reader.result ?? ''))
      setEditorOpen(false)
    }
    reader.readAsText(file, 'utf-8')
    event.target.value = ''
  }

  const colCountLabel = `${columns.length} 列 · ${columns.reduce((s, c) => s + c.values.length, 0)} 个数值`
  const stats = activeData?.stats

  /* ------------------------------------------------------------------ view */
  return (
    <div className="df-root">
      <div className="df-shell">
        <header className="df-header">
          <LogoTile />
          <div className="df-titles">
            <h1 className="df-title">分布拟合 · DistFit</h1>
            <p className="df-sub">
              {familyList.length} 种分布 · K-S / A-D / CvM / χ² 拟合优度 · 极大似然估计
              {busy ? ' · 计算中…' : ''}
            </p>
          </div>
          <div className="df-actions">
            {busy ? <span className="df-spinner" aria-label="计算中" /> : null}
            <button type="button" className="df-btn df-btn-sm" onClick={() => setCsvText(SAMPLE_CSV)}>
              示例数据
            </button>
            <button type="button" className="df-btn df-btn-sm" onClick={openEditor}>
              编辑数据
            </button>
            <button
              type="button"
              className="df-btn df-btn-sm"
              onClick={() => download('distfit-拟合结果.csv', buildCsv(ranking, columns))}
              disabled={!ranking.length}
            >
              导出 CSV
            </button>
            <button
              type="button"
              className="df-btn df-btn-sm df-btn-primary"
              onClick={() => {
                const text = summaryText()
                if (text) {
                  navigator.clipboard?.writeText(text).catch(() => {})
                }
              }}
              disabled={!result}
            >
              复制摘要
            </button>
          </div>
        </header>

        {columns.length === 0 ? (
          <div className="df-card">
            <div className="df-empty">
              <div className="df-empty-icon">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                  <path d="M4 19h16M7 19V9M11 19V5M15 19v-6M19 19v-3" />
                </svg>
              </div>
              <strong>还没有可分析的数据</strong>
              <span className="df-note">粘贴 CSV / Excel 复制出的多列数据，或直接载入示例数据（木材 / 塑料 / 纤维）。</span>
              <div className="df-row" style={{ marginTop: 6 }}>
                <button type="button" className="df-btn df-btn-primary df-btn-sm" onClick={() => setCsvText(SAMPLE_CSV)}>
                  载入示例数据
                </button>
                <button type="button" className="df-btn df-btn-sm" onClick={openEditor}>
                  粘贴数据
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="df-grid">
            {/* ------------------------------------------------------- rail */}
            <aside className="df-rail">
              <section className="df-card">
                <div className="df-card-head">
                  <h2 className="df-card-title">数据列</h2>
                  <span className="df-card-sub">{colCountLabel}</span>
                  <div className="df-card-tools">
                    <button type="button" className="df-btn df-btn-ghost df-btn-sm" onClick={openEditor}>
                      编辑
                    </button>
                  </div>
                </div>
                <div className="df-card-body df-card-body-tight">
                  <div className="df-chips">
                    {columns.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        className={`df-chip${c.name === activeCol ? ' df-chip-on' : ''}`}
                        onClick={() => setActiveCol(c.name)}
                        title={`${c.name}：${c.values.length} 个有效值${c.missing ? `，${c.missing} 个缺失` : ''}`}
                      >
                        {c.name}
                        <span className="df-chip-count">{c.values.length}</span>
                      </button>
                    ))}
                  </div>
                  <p className="df-hint" style={{ marginTop: 8 }}>
                    选中列在右侧分析；缺失值与非数值自动跳过。
                  </p>
                </div>
              </section>

              <section className="df-card">
                <div className="df-card-head">
                  <h2 className="df-card-title">候选分布</h2>
                  <span className="df-card-sub">
                    {selected.length}/{familyList.length}
                  </span>
                  <div className="df-card-tools">
                    <button
                      type="button"
                      className="df-btn df-btn-ghost df-btn-sm"
                      onClick={() => setSelected(familyList.map((d) => d.id))}
                      title="选择全部 23 种分布"
                    >
                      全选
                    </button>
                    <button
                      type="button"
                      className="df-btn df-btn-ghost df-btn-sm"
                      onClick={() => setSelected(DEFAULT_DISTS)}
                      title="回到常用 6 种"
                    >
                      常用
                    </button>
                  </div>
                </div>
                <div className="df-card-body df-card-body-tight">
                  <div className="df-checkgroup df-scroll-y">
                    {GROUP_ORDER.map((group) => {
                      const items = familyList.filter((d) => d.group === group)
                      if (!items.length) return null
                      return (
                        <div key={group}>
                          <div className="df-checkgroup-title">{group}</div>
                          {items.map((d) => (
                            <Check
                              key={d.id}
                              on={selected.includes(d.id)}
                              onClick={() => toggleDist(d.id)}
                              color={colorOf(d.id)}
                              name={d.name}
                              k={d.k}
                              hint={FAMILY_HINT[d.id]}
                            />
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </section>

              <section className="df-card">
                <div className="df-card-head">
                  <h2 className="df-card-title">检验与估计</h2>
                </div>
                <div className="df-card-body">
                  <div className="df-field">
                    <label htmlFor="df-alpha">显著性水平 α</label>
                    <select id="df-alpha" className="df-select" value={alpha} onChange={(e) => setAlpha(Number(e.target.value))}>
                      <option value={0.10}>0.10</option>
                      <option value={0.05}>0.05</option>
                      <option value={0.01}>0.01</option>
                    </select>
                  </div>
                  <div className="df-field">
                    <label htmlFor="df-bins">直方图分箱</label>
                    <select id="df-bins" className="df-select" value={bins} onChange={(e) => setBins(Number(e.target.value))}>
                      <option value={0}>自动</option>
                      <option value={6}>6</option>
                      <option value={8}>8</option>
                      <option value={10}>10</option>
                      <option value={14}>14</option>
                      <option value={20}>20</option>
                    </select>
                  </div>
                  <div className="df-field">
                    <label htmlFor="df-mc">蒙特卡洛校准</label>
                    <input
                      id="df-mc"
                      type="checkbox"
                      checked={mc}
                      onChange={(e) => setMc(e.target.checked)}
                      title="参数由样本估计时，经典 p 值偏乐观；用参数自助法重抽样校准。"
                    />
                  </div>
                  {mc ? (
                    <div className="df-field">
                      <label htmlFor="df-mcb">重抽样次数 B</label>
                      <input
                        id="df-mcb"
                        className="df-input df-input-num"
                        type="number"
                        min={99}
                        max={5000}
                        step={100}
                        value={mcB}
                        onChange={(e) => setMcB(Number(e.target.value))}
                      />
                    </div>
                  ) : null}
                  <div className="df-divider" />
                  <div className="df-row df-wrap" style={{ gap: 6 }}>
                    {TEST_DEFS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className={`df-chip${tests.includes(t.id) ? ' df-chip-on' : ''}`}
                        onClick={() =>
                          setTests((prev) =>
                            prev.includes(t.id)
                              ? prev.length > 1
                                ? prev.filter((x) => x !== t.id)
                                : prev
                              : [...prev, t.id],
                          )
                        }
                        title={t.full}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <p className="df-hint" style={{ marginTop: 8 }}>
                    {mc ? `自助法 B=${mcB}：慢约 ${Math.round((Number(mcB) || 999) / 500)} 倍` : '经典渐近 p 值；勾选左项可做参数自助校准。'}
                  </p>
                </div>
              </section>
            </aside>

            {/* ------------------------------------------------------- main */}
            <main className="df-main">
              {error ? (
                <div className="df-card">
                  <div className="df-card-body">
                    <Badge kind="err">计算出错</Badge>
                    <p className="df-note" style={{ marginTop: 6 }}>
                      {error}
                    </p>
                  </div>
                </div>
              ) : null}

              {activeData?.n > 0 && activeData.n < 15 ? (
                <div className="df-alert">
                  <Badge kind="warn">样本量偏小</Badge>
                  <span>
                    当前只有 {activeData.n} 个有效观测。Beta、Burr XII、GPD 等 3–4 参数分布族在少样本下容易过拟合而占据
                    AIC 首位，排名结论仅供参考，建议样本量达到 30 以上再比较多参数族。
                  </span>
                </div>
              ) : null}

              <div className="df-kpis">
                <Kpi label="样本量" value={nf(activeData?.n, 0)} foot={activeData?.removed ? `剔除 ${activeData.removed} 个` : '有效观测'} />
                <Kpi label="均值 ± 标准差" value={`${nf(stats?.mean)} ± ${nf(stats?.sd)}`} />
                <Kpi label="变异系数 CV" value={stats ? nf(stats.cv, 3) : '—'} foot={stats ? `极差 ${nf(stats.max - stats.min)}` : ''} />
                <Kpi label="偏度 / 峰度" value={`${stats ? nf(stats.skew, 2) : '—'} / ${stats ? nf(stats.kurt, 2) : '—'}`} foot="峰度为超额峰度" />
                <Kpi
                  label="AIC 最优分布"
                  value={best ? (activeRows.find((r) => r.distId === best.distId)?.distName ?? best.distId) : '—'}
                  foot={best ? `AIC ${sigNum(best.aic)} · ΔAIC ${nf(best.deltaAic, 1)}` : ''}
                />
                <Kpi
                  label="拟合结论"
                  value={best ? (verdictOf(best.tests, alpha).text === '接受' ? '可接受' : '需谨慎') : '—'}
                  foot={
                    best
                      ? `K-S p=${fmtP(best.tests?.ks?.p)} · A-D p=${fmtP(best.tests?.ad?.p)}`
                      : ''
                  }
                />
              </div>

              {aiSummary ? (
                <section className={`df-card df-ai-card df-ai-${ai.status}`} data-df-ai={ai.status}>
                  <div className="df-card-head">
                    <span className="df-ai-dot" aria-hidden="true" />
                    <h2 className="df-card-title">AI 解读</h2>
                    <span className="df-card-sub">
                      {ai.status === 'loading'
                        ? `正在分析当前结果…${aiElapsed > 0 ? ` ${aiElapsed} s` : ''}`
                        : ai.status === 'ok'
                          ? `${ai.model || '默认模型'}${ai.ms ? ` · ${(ai.ms / 1000).toFixed(1)} s` : ''}`
                          : ai.status === 'err'
                            ? '分析失败'
                            : ''}
                    </span>
                    <div className="df-card-tools">
                      <button
                        type="button"
                        className="df-btn df-btn-ghost"
                        disabled={ai.status === 'loading'}
                        onClick={() => {
                          if (aiSummary) void requestAi(aiSummary, aiSummaryKey, { force: true })
                        }}
                        title="重新调用模型分析当前结果"
                      >
                        {ai.status === 'loading' ? '分析中…' : '重新分析'}
                      </button>
                      <button
                        type="button"
                        className="df-btn df-btn-ghost"
                        onClick={() => setAiOpen((v) => !v)}
                        aria-expanded={aiOpen}
                      >
                        {aiOpen ? '收起' : '展开'}
                      </button>
                    </div>
                  </div>
                  {aiOpen ? (
                    <div className="df-card-body df-ai-body">
                      {ai.status === 'loading' ? (
                        <div className="df-ai-skeleton" aria-busy="true">
                          <span />
                          <span />
                          <span />
                          <span />
                        </div>
                      ) : null}
                      {ai.status === 'loading' ? (
                        <p className="df-hint">模型正在读取上表的统计量，通常需要 10–90 秒，取决于所选模型；这期间可以继续操作。</p>
                      ) : null}
                      {ai.status === 'ok' ? <AiText text={ai.text} /> : null}
                      {ai.status === 'err' ? (
                        <div className="df-ai-error">
                          <Badge kind="warn">未生成解读</Badge>
                          <p className="df-note">{ai.error}</p>
                          <p className="df-hint">
                            该功能需要宿主侧可用的模型通道（DSH 的 llm 服务）。若刚升级插件，请重启一次 DeepSeek Harness 让宿主代码生效。
                          </p>
                        </div>
                      ) : null}
                      {ai.status === 'ok' ? (
                        <p className="df-hint df-ai-foot">
                          AI 解读基于上表统计量自动生成，用于快速定位问题；最终结论请结合专业判断。
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </section>
              ) : null}

              <section className="df-card">
                <div className="df-card-head">
                  <h2 className="df-card-title">拟合诊断图</h2>
                  <span className="df-card-sub">
                    {focus ? `${activeRows.find((r) => r.distId === focus.distId)?.distName ?? focus.distId} 高亮` : ''}
                  </span>
                  <div className="df-card-tools">
                    <button
                      type="button"
                      className="df-btn df-btn-ghost df-btn-sm"
                      onClick={() => setExportOpen(true)}
                      title="选择论文 / PPT 模板、预览并导出 SVG / PNG / JPG / PDF"
                    >
                      导出图
                    </button>
                    <div className="df-tabs" role="tablist">
                      {[
                        ['density', '概率密度'],
                        ['cdf', '累积分布'],
                        ['pp', 'P-P'],
                        ['qq', 'Q-Q'],
                      ].map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          role="tab"
                          aria-selected={tab === id}
                          className={`df-tab${tab === id ? ' df-tab-on' : ''}`}
                          onClick={() => setTab(id)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="df-chartwrap">
                  {tab === 'density' ? (
                    <HistFitChart histogram={histogram} curves={curves} xLabel={activeCol} yLabel="密度" />
                  ) : null}
                  {tab === 'cdf' ? <CdfChart ecdf={ecdfData} curves={curves} xLabel={activeCol} /> : null}
                  {tab === 'pp' ? (
                    <PpChart
                      points={ppData?.points}
                      distName={activeRows.find((r) => r.distId === focus?.distId)?.distName}
                      color={focus ? colorOf(focus.distId) : undefined}
                    />
                  ) : null}
                  {tab === 'qq' ? (
                    <QqChart
                      points={qqData?.points}
                      distName={activeRows.find((r) => r.distId === focus?.distId)?.distName}
                      color={focus ? colorOf(focus.distId) : undefined}
                    />
                  ) : null}
                </div>
                <div className="df-legend">
                  {(legendAll ? curves : curves.slice(0, 12)).map((c) => (
                    <button
                      key={c.distId}
                      type="button"
                      className={`df-legend-item${c.active ? ' df-legend-on' : ''}`}
                      onClick={() => setFocusId(c.distId)}
                      title={`高亮 ${c.name}`}
                    >
                      <span className="df-legend-swatch" style={{ background: c.color }} />
                      {c.name}
                    </button>
                  ))}
                  {curves.length > 12 ? (
                    <button
                      type="button"
                      className="df-legend-more"
                      onClick={() => setLegendAll((v) => !v)}
                    >
                      {legendAll ? '收起图例' : `+${curves.length - 12} 条曲线`}
                    </button>
                  ) : null}
                </div>
              </section>

              <section className="df-card">
                <div className="df-card-head">
                  <h2 className="df-card-title">拟合排名</h2>
                  <span className="df-card-sub">{activeCol} · AIC 越小越好，ΔAIC ≤ 2 视为同档</span>
                  <div className="df-card-tools">
                    <select className="df-select" value={sortKey} onChange={(e) => setSortKey(e.target.value)} aria-label="排序依据">
                      <option value="aic">按 AIC 排序</option>
                      <option value="bic">按 BIC 排序</option>
                      <option value="ks">按 K-S p 排序</option>
                    </select>
                    <button
                      type="button"
                      className="df-btn df-btn-sm df-btn-ghost"
                      disabled={!ranking.length}
                      onClick={() =>
                        download(
                          'distfit-report.md',
                          buildMarkdown(result, columns, selected, alpha, ai.status === 'ok' ? ai.text : ''),
                          'text/markdown;charset=utf-8',
                        )
                      }
                      title="导出 Markdown 报告（含 KPI、排名与结论）"
                    >
                      报告 .md
                    </button>
                    <button
                      type="button"
                      className="df-btn df-btn-sm df-btn-ghost"
                      disabled={!ranking.length}
                      onClick={() => download('distfit-result.json', buildJson(result, columns), 'application/json;charset=utf-8', false)}
                      title="导出完整结果 JSON（参数、AIC、各项检验 p 值）"
                    >
                      JSON
                    </button>
                  </div>
                </div>
                <div className="df-card-body df-card-body-flush">
                  <div className="df-table-scroll">
                    <table className="df-table">
                      <thead>
                        <tr>
                          <th className="df-num" style={{ width: 44 }}>#</th>
                          <th>分布</th>
                          <th>参数估计</th>
                          <th className="df-num">logL</th>
                          <th className="df-num">AIC</th>
                          <th className="df-num">ΔAIC</th>
                          <th className="df-num">权重</th>
                          {TEST_DEFS.filter((t) => tests.includes(t.id)).map((t) => (
                            <th key={t.id} className="df-num" title={`${t.full} p 值`}>
                              {t.label} p
                            </th>
                          ))}
                          <th>结论</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ranking.map((r) => {
                          const v = verdictOf(r.tests, alpha)
                          return (
                            <tr
                              key={r.distId}
                              className={r.distId === focus?.distId ? 'df-row-on' : ''}
                              onClick={() => setFocusId(r.distId)}
                            >
                              <td className="df-num">{r.rank}</td>
                              <td>
                                <span className="df-swatch" style={{ background: colorOf(r.distId) }} />
                                {r.distName}
                                {r.k >= 3 && r.k * 10 > (activeData?.n ?? 0) ? (
                                  <span
                                    className="df-flag"
                                    title={`该族有 ${r.k} 个参数，样本仅 ${activeData?.n ?? 0} 个：估计与拟合优度都可能失真`}
                                  >
                                    ⚠
                                  </span>
                                ) : null}
                              </td>
                              <td className="df-params">{r.paramsText || '—'}</td>
                              <td className="df-num">{sigNum(r.loglik)}</td>
                              <td className="df-num">{sigNum(r.aic)}</td>
                              <td className="df-num">{nf(r.deltaAic, 1)}</td>
                              <td className="df-num">{nf(r.weight, 3)}</td>
                              {TEST_DEFS.filter((t) => tests.includes(t.id)).map((t) => (
                                <td key={t.id} className="df-num">
                                  {fmtP(r.tests?.[t.id]?.p)}
                                </td>
                              ))}
                              <td>
                                <Badge kind={v.kind}>{v.text}</Badge>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>

              <div className="df-grid" style={{ gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)', gap: 14 }}>
                <section className="df-card">
                  <div className="df-card-head">
                    <h2 className="df-card-title">分位数估计</h2>
                    <span className="df-card-sub">
                      {focus ? activeRows.find((r) => r.distId === focus.distId)?.distName : ''}
                    </span>
                  </div>
                  <div className="df-card-body df-card-body-flush">
                    <table className="df-table">
                      <thead>
                        <tr>
                          <th>重现期</th>
                          {QPROBS.map((p) => (
                            <th key={p} className="df-num">
                              P{Math.round(p * 100)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="df-note">{activeCol} 分位值</td>
                          {QPROBS.map((p, i) => (
                            <td key={p} className="df-num">
                              {nf(quantileRow?.values?.[i], 3)}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="df-note">样本经验值</td>
                          {QPROBS.map((p) => (
                            <td key={p} className="df-num">
                              {nf(sampleQuantile(activeValues, p), 3)}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="df-card">
                  <div className="df-card-head">
                    <h2 className="df-card-title">分布说明</h2>
                    <span className="df-card-sub">参数含义与密度函数</span>
                  </div>
                  <div className="df-card-body">
                    {focus ? (
                      <>
                        <div className="df-row" style={{ marginBottom: 6 }}>
                          <span className="df-swatch" style={{ background: colorOf(focus.distId) }} />
                          <strong style={{ fontSize: 13 }}>
                            {activeRows.find((r) => r.distId === focus.distId)?.distName}
                          </strong>
                          <Badge kind="idle">{activeRows.find((r) => r.distId === focus.distId)?.k} 参数</Badge>
                        </div>
                        <div className="df-formula">{FORMULAS[focus.distId]?.plain}</div>
                        <div className="df-divider" />
                        <div className="df-field">
                          <label>支撑集</label>
                          <span className="df-mono">{FORMULAS[focus.distId]?.support ?? '—'}</span>
                        </div>
                        <div className="df-field">
                          <label>参数估计</label>
                          <span className="df-params">{focus.paramsText || '—'}</span>
                        </div>
                        <div className="df-field">
                          <label>AIC / BIC</label>
                          <span className="df-mono">
                            {sigNum(focus.aic)} / {sigNum(focus.bic)}
                          </span>
                        </div>
                        <p className="df-hint" style={{ marginTop: 8 }}>
                          {FORMULAS[focus.distId]?.note}
                        </p>
                      </>
                    ) : (
                      <p className="df-note">选择一种分布查看详情。</p>
                    )}
                  </div>
                </section>
              </div>

              {activeData ? (
                <div className="df-row df-wrap" style={{ gap: 10, justifyContent: 'space-between' }}>
                  <span className="df-hint">
                    数据：{SAMPLE_NAME} · 当前列 {activeCol} · n={activeData.n} · 估计方法：极大似然（Nelder–Mead 多起点）
                  </span>
                  <span className="df-hint">
                    参数估计值由样本反推，p 值对“复合假设”偏乐观{alpha ? `；判定阈值 α=${alpha}` : ''}。
                  </span>
                </div>
              ) : null}
            </main>
          </div>
        )}
      </div>

      <ExportPanel
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        tab={tab}
        tabNames={TAB_NAMES}
        chart={exportChart}
        columns={columns}
        chosen={selected}
      />

      {editorOpen ? (
        <div className="df-overlay" role="dialog" aria-modal="true" aria-label="编辑数据" onClick={() => setEditorOpen(false)}>
          <div className="df-modal" onClick={(e) => e.stopPropagation()}>
            <div className="df-modal-head">
              <h2 className="df-card-title">编辑数据</h2>
              <span className="df-card-sub">第一行为列名；支持逗号 / 制表符 / 分号分隔，空单元格视为缺失</span>
              <div className="df-card-tools">
                <button type="button" className="df-btn df-btn-sm" onClick={() => fileRef.current?.click()}>
                  导入 CSV
                </button>
                <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,text/csv" hidden onChange={onPickFile} />
              </div>
            </div>
            <div className="df-modal-body">
              <textarea className="df-textarea" value={draft} spellCheck={false} onChange={(e) => setDraft(e.target.value)} />
              <p className="df-note">{describeParse(draft)}</p>
            </div>
            <div className="df-modal-foot">
              <button type="button" className="df-btn df-btn-ghost df-btn-sm" onClick={() => setDraft(SAMPLE_CSV)}>
                填入示例
              </button>
              <span className="df-spacer" />
              <button type="button" className="df-btn df-btn-sm" onClick={() => setEditorOpen(false)}>
                取消
              </button>
              <button type="button" className="df-btn df-btn-primary df-btn-sm" onClick={applyEditor}>
                应用
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function describeParse(text) {
  const { columns } = parseTable(text)
  if (!columns.length) return '未识别到数值列：至少需要 5 个有效数值。'
  const parts = columns.map((c) => `${c.name}（${c.values.length}${c.missing ? `，缺失 ${c.missing}` : ''}）`)
  return `识别到 ${columns.length} 列：${parts.join('、')}`
}

function sampleQuantile(values, p) {
  if (!Array.isArray(values) || values.length === 0) return NaN
  const sorted = values.slice().sort((a, b) => a - b)
  const pos = (sorted.length - 1) * p
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}
