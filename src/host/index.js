/**
 * DistFit host half.
 *
 * Runs inside the DSH Host process. Registers:
 *   - the `distfit_fit` agent tool: fit distributions from chat and answer with
 *     a ranked goodness-of-fit summary, so the assistant can reason about data
 *     without opening the panel;
 *   - plugin HTTP routes under `/api/dsh-distfit/*` (the only prefix the web
 *     shell's connection layer accepts from a plugin): family inventory plus
 *     the AI interpretation endpoint the panel calls after every fit.
 *
 * The heavy analysis itself runs in the browser half; the host only owns what
 * needs process privileges (model credentials) or persistence.
 */
import { analyze, DISTS } from '../engine/index.js'
import { explainFit, MAX_SUMMARY_CHARS } from './explain.js'
import { buildChartStyleHandler, MAX_REQUEST_CHARS } from './chartStyle.js'

const NS = 'dsh-distfit'

export const name = NS
export const inject = []

const DEFAULT_DISTS = ['normal', 'lognormal', 'gumbel', 'gev', 'gamma', 'weibull']
const DEFAULT_TESTS = ['ks', 'ad', 'chi2']

const familyList = () => (Array.isArray(DISTS) ? DISTS : Object.values(DISTS || {}))

/* --------------------------------------------------------------- parsing -- */
function splitLine(line, delim) {
  return delim === '\t' ? line.split('\t') : delim === ';' ? line.split(';') : line.split(',')
}

function detectDelimiter(line) {
  const counts = [
    [',', (line.match(/,/g) || []).length],
    ['\t', (line.match(/\t/g) || []).length],
    [';', (line.match(/;/g) || []).length],
  ].sort((a, b) => b[1] - a[1])
  return counts[0][1] > 0 ? counts[0][0] : ','
}

function parseTable(text) {
  const lines = String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((line) => line.trim() !== '')
  if (!lines.length) return []
  const delim = detectDelimiter(lines[0])
  const head = splitLine(lines[0], delim).map((c) => c.trim())
  const headerless = head.every((c) => c === '' || Number.isFinite(Number(c.replace(/[,\s]/g, ''))))
  const header = headerless ? head.map((_, i) => `列 ${i + 1}`) : head.map((c, i) => c || `列 ${i + 1}`)
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
  return buckets.filter((b) => b.values.length >= 5)
}

function sigNum(v, n = 4) {
  if (!Number.isFinite(Number(v))) return '—'
  const a = Math.abs(Number(v))
  if (a === 0) return '0'
  if (a >= 1e5 || a < 1e-3) return Number(v).toExponential(n - 1)
  return String(Number(Number(v).toPrecision(n)))
}

function fmtP(p) {
  if (!Number.isFinite(Number(p))) return '—'
  const v = Number(p)
  if (v < 0.001) return '<0.001'
  return v.toFixed(3)
}

function toMarkdown(result, alpha) {
  const lines = []
  for (const ds of result.datasets) {
    const rank = result.ranking.filter((r) => r.dataset === ds.name)
    lines.push(`### ${ds.name}（n=${ds.n}${ds.removed ? `，剔除 ${ds.removed}` : ''}）`)
    lines.push(
      `样本：均值 ${sigNum(ds.stats.mean)}，标准差 ${sigNum(ds.stats.sd)}，CV ${sigNum(ds.stats.cv)}，偏度 ${sigNum(ds.stats.skew)}，峰度 ${sigNum(ds.stats.kurt)}`,
    )
    lines.push('')
    lines.push('| 排名 | 分布 | 参数 | AIC | ΔAIC | 权重 | K-S p | A-D p | 结论 |')
    lines.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    rank.slice(0, 8).forEach((r, i) => {
      const detail = result.rows.find((x) => x.dataset === ds.name && x.distId === r.distId) || {}
      const tests = detail.tests || {}
      const entries = Object.values(tests).filter((t) => t && Number.isFinite(t.p))
      const failed = entries.filter((t) => t.p < alpha).length
      const verdict = entries.length === 0 ? '—' : failed === 0 ? '接受' : failed === entries.length ? '拒绝' : '部分拒绝'
      lines.push(
        `| ${i + 1} | ${detail.distName ?? r.distId} | ${detail.paramsText ?? ''} | ${sigNum(r.aic)} | ${sigNum(r.deltaAic)} | ${sigNum(r.weight, 3)} | ${fmtP(tests.ks?.p)} | ${fmtP(tests.ad?.p)} | ${verdict} |`,
      )
    })
    lines.push('')
  }
  const warnings = (result.warnings || []).slice(0, 8)
  if (warnings.length) {
    lines.push('跳过/告警：')
    for (const w of warnings) lines.push(`- ${w.dataset} · ${w.distId ?? ''}：${w.reason}`)
  }
  return lines.join('\n')
}

/* ----------------------------------------------------------------- routes -- */

/** The only URL prefix the web shell's connection layer serves to plugins. */
const API_PREFIX = '/api/dsh-distfit'

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  })
  res.end(body)
}

async function readJsonBody(req, limit) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) throw new Error('请求体过大')
    chunks.push(chunk)
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim()
  return raw ? JSON.parse(raw) : {}
}

/** `ctx.get` throws for services outside the current inject scope. */
function safeService(ctx, name) {
  try {
    return ctx.get(name)
  } catch {
    return undefined
  }
}

const familiesPayload = () =>
  familyList().map((d) => ({ id: d.id, name: d.name, group: d.group, k: d.k, support: d.support }))

const explainTimeoutMs = 120_000

/** How long one natural-language style request may take (same budget as `/explain`). */
const chartStyleTimeoutMs = 120_000

/** JSON body cap for `/chart-style`: a 600-char request plus a compact context. */
const CHART_STYLE_BODY_LIMIT = 64 * 1024

function exactRoute(method, subpath, handler) {
  return {
    kind: 'exact',
    path: `${API_PREFIX}/${subpath}`,
    handler: async (req, res) => {
      if (String(req.method ?? 'GET').toUpperCase() !== method) {
        sendJson(res, 405, { ok: false, error: `仅支持 ${method}` })
        return
      }
      try {
        await handler(req, res)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (!res.headersSent) sendJson(res, 500, { ok: false, error: message })
        else res.end()
      }
    },
  }
}

/**
 * Build the plugin's HTTP routes.
 * @param scoped - context injected with `webServer`.
 * @returns the route descriptors handed to `webServer.register`.
 */
function buildRoutes(scoped) {
  const chartStyle = buildChartStyleHandler({
    getLlm: () => safeService(scoped, 'llm'),
    getSelection: () => safeService(scoped, 'agentDefaultModel'),
  })
  return [
    exactRoute('GET', 'health', async (_req, res) => {
      sendJson(res, 200, { ok: true, plugin: NS, families: familyList().length, explain: true, chartStyle: true })
    }),
    exactRoute('GET', 'families', async (_req, res) => {
      sendJson(res, 200, { ok: true, families: familiesPayload() })
    }),
    exactRoute('POST', 'explain', async (req, res) => {
      const controller = new AbortController()
      const abort = () => controller.abort()
      const timer = setTimeout(abort, explainTimeoutMs)
      res.on('close', abort)
      try {
        const body = await readJsonBody(req, MAX_SUMMARY_CHARS * 2)
        const summary = body?.summary ?? body
        const startedAt = Date.now()
        const outcome = await explainFit({
          llm: safeService(scoped, 'llm'),
          agentDefaultModel: safeService(scoped, 'agentDefaultModel'),
          summary,
          signal: controller.signal,
        })
        sendJson(res, 200, {
          ok: true,
          text: outcome.text,
          provider: outcome.provider,
          model: outcome.model,
          ms: Date.now() - startedAt,
        })
      } catch (error) {
        sendJson(res, 200, {
          ok: false,
          error: controller.signal.aborted ? '解读请求超时或被取消' : error instanceof Error ? error.message : String(error),
        })
      } finally {
        clearTimeout(timer)
        res.off?.('close', abort)
      }
    }),
    exactRoute('POST', 'chart-style', async (req, res) => {
      const controller = new AbortController()
      const abort = () => controller.abort()
      const timer = setTimeout(abort, chartStyleTimeoutMs)
      res.on('close', abort)
      try {
        const body = await readJsonBody(req, CHART_STYLE_BODY_LIMIT)
        const request = typeof body?.request === 'string' ? body.request.trim() : ''
        if (!request) {
          sendJson(res, 400, { ok: false, error: '请先描述你想要的图表样式' })
          return
        }
        if (request.length > MAX_REQUEST_CHARS) {
          sendJson(res, 400, { ok: false, error: `样式需求过长，请控制在 ${MAX_REQUEST_CHARS} 字以内` })
          return
        }
        const outcome = await chartStyle({
          request,
          context: body?.context,
          signal: controller.signal,
        })
        sendJson(res, 200, outcome)
      } catch (error) {
        sendJson(res, 200, {
          ok: false,
          error: controller.signal.aborted ? '样式请求超时或被取消' : error instanceof Error ? error.message : String(error),
        })
      } finally {
        clearTimeout(timer)
        res.off?.('close', abort)
      }
    }),
  ]
}

/* ----------------------------------------------------------------- plugin -- */
export function apply(ctx) {
  ctx.effect(() => {
    console.info(`[${NS}] host half ready · ${familyList().length} families`)
    const fiber = ctx.inject(['tools', 'webServer'], (scoped) => {
      scoped.effect(() => {
        const dispose = scoped.tools.register({
          name: 'distfit_fit',
          description:
            'Fit probability distributions to numeric samples and rank them with goodness-of-fit tests. ' +
            'Pass `data` as CSV/TSV text (first row = column names) or `columns` as [{name, values}]. ' +
            `Available families: ${familyList()
              .map((d) => `${d.id}(${d.name})`)
              .join(', ')}. ` +
            'Returns per-column descriptive statistics, a ranked table (AIC/ΔAIC/Akaike weight, K-S/A-D/CvM/chi² p-values), ' +
            'the best-fit parameters and a suggested distribution.',
          parameters: {
            type: 'object',
            additionalProperties: false,
            properties: {
              data: { type: 'string', description: 'CSV/TSV text: first row is the header, one numeric column per dataset.' },
              columns: {
                type: 'array',
                description: 'Alternative to `data`: explicit numeric columns.',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    name: { type: 'string' },
                    values: { type: 'array', items: { type: 'number' } },
                  },
                  required: ['name', 'values'],
                },
              },
              datasets: {
                type: 'array',
                items: { type: 'string' },
                description: 'Only analyze columns with these names (optional).',
              },
              dists: {
                type: 'array',
                items: { type: 'string' },
                description: `Family ids to fit (optional; default ${DEFAULT_DISTS.join(', ')}).`,
              },
              tests: {
                type: 'array',
                items: { type: 'string', enum: ['ks', 'ad', 'cvm', 'chi2'] },
                description: 'Goodness-of-fit tests to report (optional; default ks, ad, chi2).',
              },
              alpha: { type: 'number', description: 'Significance level, default 0.05.' },
              B: { type: 'number', description: 'Monte-Carlo replicates for p-value calibration, default 0 (asymptotic).' },
              bins: { type: 'number', description: 'Histogram bins, 0 = auto.' },
            },
          },
          output: {
            schema: { type: 'object', additionalProperties: true },
            render: (_args, value) => {
              if (!value || value.ok === false) {
                return [{ type: 'text', text: `DistFit 失败：${value?.error ?? '未知错误'}` }]
              }
              return [{ type: 'text', text: value.markdown }, { type: 'json', value }]
            },
          },
          timeoutMs: 180000,
          async execute(args) {
            const alpha = Number(args?.alpha) > 0 && Number(args?.alpha) < 1 ? Number(args.alpha) : 0.05
            let parsed = []
            if (Array.isArray(args?.columns) && args.columns.length) {
              parsed = args.columns
                .map((c) => ({ name: String(c?.name ?? ''), values: (c?.values ?? []).map(Number).filter((v) => Number.isFinite(v)) }))
                .filter((c) => c.values.length >= 5)
            } else if (typeof args?.data === 'string') {
              parsed = parseTable(args.data)
            }
            if (!parsed.length) {
              return { ok: false, error: '没有可分析的数据：请提供 data（CSV/TSV 文本）或 columns（[{name, values}]），每列至少 5 个数值。' }
            }
            const wanted = Array.isArray(args?.datasets) && args.datasets.length ? new Set(args.datasets.map(String)) : null
            const datasets = parsed.filter((c) => !wanted || wanted.has(c.name)).map((c) => ({ name: c.name, values: c.values }))
            const distsInput = Array.isArray(args?.dists) && args.dists.length ? args.dists.map(String) : DEFAULT_DISTS
            const known = new Set(familyList().map((d) => d.id))
            const dists = distsInput.filter((id) => known.has(id))
            const testsInput = Array.isArray(args?.tests) && args.tests.length ? args.tests.map(String) : DEFAULT_TESTS
            const result = analyze(datasets, {
              dists: dists.length ? dists : DEFAULT_DISTS,
              tests: testsInput,
              alpha,
              B: Math.max(0, Number(args?.B) || 0),
              bins: Math.max(0, Number(args?.bins) || 0),
              seed: 20260101,
              maxDists: 32,
              gridSize: 160,
            })
            const best = {}
            for (const ds of result.datasets) {
              const top = result.ranking.find((r) => r.dataset === ds.name)
              const detail = result.rows.find((r) => r.dataset === ds.name && r.distId === top?.distId)
              best[ds.name] = detail
                ? { distId: detail.distId, distName: detail.distName, params: detail.params, paramsText: detail.paramsText, aic: detail.aic, bic: detail.bic }
                : null
            }
            return {
              ok: true,
              alpha,
              families: familyList().length,
              datasets: result.datasets,
              ranking: result.ranking,
              rows: result.rows.map((r) => ({
                dataset: r.dataset,
                distId: r.distId,
                distName: r.distName,
                k: r.k,
                paramsText: r.paramsText,
                aic: r.aic,
                bic: r.bic,
                tests: r.tests,
              })),
              best,
              warnings: result.warnings,
              markdown: toMarkdown(result, alpha),
            }
          },
        })
        return () => dispose()
      }, `${NS}: agent tool`)

      scoped.effect(() => {
        const ROUTES = buildRoutes(scoped)
        const disposers = ROUTES.map((route) => scoped.webServer.register(route))
        return () => {
          for (const dispose of disposers) {
            try {
              dispose()
            } catch {}
          }
        }
      }, `${NS}: http routes`)
    })
    return () => {
      try {
        fiber?.dispose?.()
      } catch {}
    }
  }, `${NS}: mount`)
}
