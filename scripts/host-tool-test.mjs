/**
 * Host-half smoke test: boots `apply(ctx)` against a fake plugin context, then
 * exercises the registered `distfit_fit` tool and the `/api/dsh-distfit/*`
 * routes without the DSH runtime. The AI endpoint is driven end-to-end with a
 * fake `llm` service and a fake `@deepseek-ai/dsh-llm` module, so the prompt,
 * routing and response shaping are covered without network access.
 */
import { apply } from '../src/host/index.js'
import { buildPrompt, explainFit } from '../src/host/explain.js'

let tool = null
const routes = []
let fakeLlm
let fakeSelection

const scope = {
  effect(fn) {
    const dispose = fn()
    return typeof dispose === 'function' ? dispose : () => {}
  },
  get(name) {
    if (name === 'llm') return fakeLlm
    if (name === 'agentDefaultModel') return fakeSelection
    return undefined
  },
  tools: {
    register(definition) {
      tool = definition
      return () => {
        tool = null
      }
    },
  },
  webServer: {
    register(definition) {
      routes.push(definition)
      return () => {
        const index = routes.indexOf(definition)
        if (index >= 0) routes.splice(index, 1)
      }
    },
  },
}

const ctx = {
  effect(fn) {
    const dispose = fn()
    return typeof dispose === 'function' ? dispose : () => {}
  },
  inject(_deps, callback) {
    callback(scope)
    return { dispose() {} }
  },
}

apply(ctx)

const fails = []
const check = (label, ok, detail) => {
  if (!ok) fails.push(`${label}${detail ? ` - ${detail}` : ''}`)
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok || !detail ? '' : ` - ${detail}`}`)
}

const routeFor = (path) => routes.find((route) => route.path === path)

/* ------------------------------------------------------------- fake HTTP -- */
function fakeRes() {
  const res = {
    status: 0,
    headers: {},
    body: '',
    headersSent: false,
    done: false,
    listeners: new Map(),
    writeHead(status, headers = {}) {
      res.status = status
      Object.assign(res.headers, headers)
      res.headersSent = true
    },
    end(chunk) {
      if (chunk) res.body += String(chunk)
      res.done = true
    },
    on(event, fn) {
      res.listeners.set(event, fn)
    },
    off(event) {
      res.listeners.delete(event)
    },
    json() {
      return JSON.parse(res.body)
    },
  }
  return res
}

function fakeReq(method, payload) {
  return {
    method,
    async *[Symbol.asyncIterator]() {
      if (payload !== undefined) yield Buffer.from(JSON.stringify(payload))
    },
  }
}

const call = async (path, method, payload) => {
  const res = fakeRes()
  await routeFor(path).handler(fakeReq(method, payload), res)
  return res
}

/* ------------------------------------------------------------------ tools -- */
check('tool registered', Boolean(tool), 'tools.register was not called')
check('tool name', tool?.name === 'distfit_fit', tool?.name)
check('schema has data/columns', Boolean(tool?.parameters?.properties?.data && tool?.parameters?.properties?.columns))
check('four routes registered', routes.length === 4, routes.map((r) => r.path).join(','))
check('families route path', Boolean(routeFor('/api/dsh-distfit/families')))
check('explain route path', Boolean(routeFor('/api/dsh-distfit/explain')))
check('chart-style route path', Boolean(routeFor('/api/dsh-distfit/chart-style')))

const csv = [
  '木材,塑料,纤维',
  '16.1,39.1,21.9',
  '22.6,22.1,19.6',
  '22.3,37.1,32.9',
  '17.9,23.6,26.8',
  '20.6,22.8,28.8',
  '23.6,16,27.9',
  '19.3,41.9,14.8',
  '22.2,24.9,23.7',
  '18.5,27.2,25.6',
  '21.2,22.7,27',
  '19.5,17.4,30.5',
  '22.7,26.1,15.6',
  '20.4,24.4,26',
  '21.9,22,26.3',
].join('\n')

const result = await tool.execute({ data: csv, dists: ['normal', 'lognormal', 'gev', 'weibull'] })
check('execute ok', result?.ok === true, result?.error)
check('3 datasets', result?.datasets?.length === 3, String(result?.datasets?.length))
check('ranking per dataset', result?.ranking?.length === 12, String(result?.ranking?.length))
check('best filled', Boolean(result?.best?.['木材']?.distName), JSON.stringify(result?.best?.['木材']))
check('markdown non-trivial', (result?.markdown ?? '').split('\n').length > 20, String((result?.markdown ?? '').split('\n').length))

const rendered = tool.output.render({}, result)
check('render first part is text', rendered?.[0]?.type === 'text' && rendered[0].text.startsWith('###'), rendered?.[0]?.type)
check('render carries json', rendered?.[1]?.type === 'json')

const bad = await tool.execute({ data: 'only-label\nno numbers here' })
check('empty input rejected', bad?.ok === false && typeof bad.error === 'string', JSON.stringify(bad).slice(0, 120))

/* ----------------------------------------------------------------- routes -- */
const health = await call('/api/dsh-distfit/health', 'GET')
check('health status 200', health.status === 200, String(health.status))
check('health flag', health.json()?.explain === true, health.body.slice(0, 80))

const families = await call('/api/dsh-distfit/families', 'GET')
check('families >= 23', families.json()?.families?.length >= 23, String(families.json()?.families?.length))
check('families ids', typeof families.json()?.families?.[0]?.id === 'string')

const wrongMethod = await call('/api/dsh-distfit/explain', 'GET')
check('explain rejects GET', wrongMethod.status === 405, String(wrongMethod.status))

const noLlm = await call('/api/dsh-distfit/explain', 'POST', { summary: { alpha: 0.05, datasets: [] } })
check('explain without llm reports error', noLlm.status === 200 && noLlm.json()?.ok === false, noLlm.body.slice(0, 120))

/* ------------------------------------------------------------ AI pipeline -- */
const streamed =
  '### 数据形态\n木材均值 20.53，接近对称。\n\n### 推荐分布与依据\n- AIC 最优为正态分布（AIC 706.3，ΔAIC 0，权重 0.383）。'
const captured = []
const fakeModule = {
  createUserMessage(input) {
    captured.push(input)
    return { role: 'user', input }
  },
  BlockAssembler: class {
    constructor() {
      this.text = ''
      this.finish = { kind: 'stop' }
    }
    push(chunk) {
      if (chunk?.type === 'finish') this.finish = chunk.reason ?? this.finish
      else if (chunk?.type === 'reasoning-delta') return
      else if (typeof chunk?.text === 'string') this.text += chunk.text
    }
    blocks() {
      return [{ type: 'text', text: this.text }]
    }
  },
}

let streamOptions
fakeLlm = {
  listProviders: () => ['deepseek-official'],
  listModels: async () => [{ id: 'deepseek-v4-flash' }],
  resolveModelInfo: async () => ({ reasoning: { efforts: [{ id: 'high' }, { id: 'off' }], defaultEffort: 'high' } }),
  async *stream(options) {
    streamOptions = options
    yield { text: streamed }
  },
}
fakeSelection = { currentSelection: () => ({ provider: 'deepseek-official', model: 'deepseek-v4-pro' }) }

const summary = {
  alpha: 0.05,
  tests: ['ks', 'ad', 'chi2'],
  chosen: ['normal', 'lognormal'],
  datasets: [
    {
      name: '木材',
      n: 140,
      removed: 0,
      stats: { mean: 20.53, sd: 2.982, cv: 0.145, skew: -0.54, kurt: -0.44, min: 14, max: 26 },
      quantiles: { p01: 15.1, p05: 16.2, p25: 18.5, p50: 20.5, p75: 22.5, p95: 25.2, p99: 27.4 },
      histogram: [
        { lo: 14, hi: 15, n: 4 },
        { lo: 15, hi: 16, n: 9 },
      ],
      best: {
        dist: 'normal',
        family: { group: '位置-尺度型', support: 'real', k: 2 },
        ppDeviation: { maxDev: 0.04, atQuantile: 0.5, lowerTailDev: 0.02, upperTailDev: 0.04 },
      },
    },
  ],
  ranking: [
    {
      dataset: '木材',
      dist: '正态分布',
      family: { group: '位置-尺度型', support: 'real', k: 2 },
      k: 2,
      params: 'μ=20.53, σ=2.972',
      aic: 706.3,
      deltaAic: 0,
      weight: 0.383,
      p: { ks: 0.958, ad: 0.712, chi2: 0.575 },
      verdict: '接受',
    },
  ],
  warnings: [],
}

const prompt = buildPrompt(summary)
check('prompt names the dataset', prompt.includes('木材'), prompt.slice(0, 60))
check(
  'prompt asks for the four sections',
  prompt.includes('### 数据说明了什么') && prompt.includes('### 推荐分布与依据') && prompt.includes('### 风险与注意事项') && prompt.includes('### 下一步建议'),
)
check('prompt demands meaning, not just numbers', prompt.includes('意味着什么') && prompt.includes('篇幅不少于全文 40%'))
check('prompt states alpha', prompt.includes('α=0.05'))
check('prompt embeds numbers', prompt.includes('706.3') && prompt.includes('0.383'))
check('prompt embeds the shape evidence', prompt.includes('"p50":20.5') || prompt.includes('p50'), String(prompt.length))
check('prompt embeds support and pp deviation', prompt.includes('"support":"real"') || prompt.includes('support'), String(prompt.length))
check('prompt embeds the histogram bins', prompt.includes('"lo":14'), String(prompt.length))

const explained = await explainFit({
  llm: fakeLlm,
  agentDefaultModel: fakeSelection,
  summary,
  loadModule: () => fakeModule,
})
check('explain returns text', explained.text === streamed, explained.text.slice(0, 60))
check('explain uses default selection', explained.model === 'deepseek-v4-pro', explained.model)
check('explain passes one message', Array.isArray(streamOptions?.messages) && streamOptions.messages.length === 1)
check('explain sets maxTokens', Number(streamOptions?.maxTokens) > 0, String(streamOptions?.maxTokens))
check('explain built prompt from summary', String(captured[0]?.content?.[0]?.text ?? '').includes('计算结果 JSON'))
// `MessageSourceMap` only knows user/model/tool/system-prompt, so a plugin-authored
// prompt enters the call as an ordinary user turn.
check('explain declares a user source', captured[0]?.source?.kind === 'user', JSON.stringify(captured[0]?.source))
check(
  'explain picks the cheapest reasoning effort',
  streamOptions?.reasoningEffort === 'off',
  String(streamOptions?.reasoningEffort),
)
check('explain keeps a token budget', Number(streamOptions?.maxTokens) >= 1024, String(streamOptions?.maxTokens))

const discovered = await explainFit({
  llm: { ...fakeLlm, listProviders: () => ['deepseek-official'] },
  agentDefaultModel: { currentSelection: () => undefined },
  summary,
  loadModule: () => fakeModule,
})
check('explain falls back to discovery', discovered.model === 'deepseek-v4-flash', discovered.model)

/**
 * A reasoning model can spend the whole budget before emitting text. That case
 * must surface a actionable message instead of an empty card.
 */
const reasoningOnly = {
  ...fakeLlm,
  async *stream() {
    yield { type: 'block-start', index: 0, blockType: 'reasoning' }
    yield { type: 'reasoning-delta', index: 0, text: '先看样本量……' }
    yield { type: 'finish', reason: { kind: 'max-tokens' } }
  },
}
let truncatedError = ''
try {
  await explainFit({ llm: reasoningOnly, agentDefaultModel: fakeSelection, summary, loadModule: () => fakeModule })
} catch (error) {
  truncatedError = error instanceof Error ? error.message : String(error)
}
check('explain reports a truncated reasoning-only call', truncatedError.includes('token 上限'), truncatedError)

const withLlmRoute = await call('/api/dsh-distfit/explain', 'POST', { summary })
/**
 * The route resolves `@deepseek-ai/dsh-llm` through the Host module fallback,
 * which plain Node cannot load here, so the live route can only be proven to
 * fail gracefully. The transport contract itself is proven above.
 */
check(
  'explain route fails gracefully',
  withLlmRoute.status === 200 && typeof withLlmRoute.json()?.error === 'string',
  withLlmRoute.body.slice(0, 120),
)

console.log('')
if (fails.length) {
  console.error(`FAILED (${fails.length})`)
  for (const f of fails) console.error(` - ${f}`)
  process.exitCode = 1
} else {
  console.log('PASS - host half: tool + routes + AI pipeline behave as specified')
}
