/**
 * Chart-style assistant tests (plain Node, no network).
 *
 * Covers the whole host half of natural-language chart styling:
 *   1. `sanitizeChartStyle` — whitelist, clamping, enum/boolean coercion, junk;
 *   2. `parseChartStyleReply` — clean/fenced/prose/repaired JSON, presets, notes;
 *   3. `buildChartStylePrompt` — request + vocabulary + JSON contract + context;
 *   4. `buildChartStyleHandler` — fake `llm` stream end-to-end;
 *   5. the registered `POST /api/dsh-distfit/chart-style` route via a fake context.
 */
import {
  MAX_REQUEST_CHARS,
  NOTES_LIMIT,
  PRESET_IDS,
  RAW_EXCERPT_LIMIT,
  STYLE_FIELDS,
  buildChartStyleHandler,
  buildChartStylePrompt,
  parseChartStyleReply,
  sanitizeChartStyle,
} from '../src/host/chartStyle.js'
import { apply } from '../src/host/index.js'

const fails = []
const check = (label, ok, detail) => {
  if (!ok) fails.push(`${label}${detail ? ` - ${detail}` : ''}`)
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok || !detail ? '' : ` - ${detail}`}`)
}

/* ------------------------------------------------------------- sanitizer -- */
const junk = [null, undefined, 42, 'not a style', [], () => {}]
const junkResults = junk.map((value) => sanitizeChartStyle(value))
check(
  'sanitizer never throws on junk',
  junkResults.every((r) => r && typeof r.style === 'object' && Array.isArray(r.dropped) && Array.isArray(r.warnings)),
)
check('sanitizer warns on non-object input', junkResults[2].warnings.length === 1, JSON.stringify(junkResults[2]))
check('sanitizer accepts an empty object', Object.keys(sanitizeChartStyle({}).style).length === 0)

const clean = sanitizeChartStyle({
  font: 'song',
  fontScale: 1.15,
  strokeScale: 1.1,
  palette: 'cvd',
  grayscale: true,
  grid: false,
  axes: 'box',
  legend: 'right',
  legendSize: 1.05,
  background: 'transparent',
  title: ' 拟合对比 ',
  barOpacity: 0.24,
  barEdge: false,
  barTone: 'medium',
  barGap: 3,
  barRadius: 4,
  pointSize: 1.2,
})
check('sanitizer keeps every whitelisted key', Object.keys(clean.style).length === Object.keys(STYLE_FIELDS).length, Object.keys(clean.style).join(','))
check('sanitizer keeps enum values', clean.style.font === 'song' && clean.style.palette === 'cvd' && clean.style.axes === 'box' && clean.style.legend === 'right')
check('sanitizer keeps numbers and booleans', clean.style.fontScale === 1.15 && clean.style.grayscale === true && clean.style.grid === false)
check(
  'sanitizer keeps the bar look fields',
  clean.style.barTone === 'medium' && clean.style.barGap === 3 && clean.style.barRadius === 4,
  JSON.stringify({ tone: clean.style.barTone, gap: clean.style.barGap, radius: clean.style.barRadius }),
)
check('sanitizer trims the title', clean.style.title === '拟合对比', clean.style.title)
check('sanitizer reports no drops for clean input', clean.dropped.length === 0 && clean.warnings.length === 0, JSON.stringify(clean.warnings))

const clamped = sanitizeChartStyle({ fontScale: 0.1, strokeScale: 9, legendSize: 0.1, barOpacity: 0, pointSize: 9 })
check(
  'sanitizer clamps numbers into range',
  clamped.style.fontScale === 0.5 &&
    clamped.style.strokeScale === 6 &&
    clamped.style.legendSize === 0.7 &&
    clamped.style.barOpacity === 0.05 &&
    clamped.style.pointSize === 3,
  JSON.stringify(clamped.style),
)
check('sanitizer warns when clamping', clamped.warnings.length === 5, JSON.stringify(clamped.warnings))

const droppedKeys = sanitizeChartStyle({ fontStack: 'Times', foo: 1, bar: 'y' })
check('sanitizer drops unknown keys', Object.keys(droppedKeys.style).length === 0 && droppedKeys.dropped.length === 3, droppedKeys.dropped.join(','))

const badEnum = sanitizeChartStyle({ palette: 'neon', font: 123 })
check('sanitizer drops unknown enum values', !('palette' in badEnum.style) && !('font' in badEnum.style))
check('sanitizer warns about bad enum values', badEnum.warnings.some((w) => w.includes('neon')), JSON.stringify(badEnum.warnings))

const caseEnum = sanitizeChartStyle({ font: 'SONG', axes: 'BOX', background: 'Transparent', legend: 'RIGHT' })
check(
  'sanitizer normalises enum case',
  caseEnum.style.font === 'song' && caseEnum.style.axes === 'box' && caseEnum.style.background === 'transparent' && caseEnum.style.legend === 'right',
)

const boolCoercion = sanitizeChartStyle({ grayscale: 'true', grid: '否', barEdge: 1, pointSize: 2 })
check(
  'sanitizer coerces friendly booleans',
  boolCoercion.style.grayscale === true && boolCoercion.style.grid === false && boolCoercion.style.barEdge === true,
  JSON.stringify(boolCoercion.style),
)
const badBool = sanitizeChartStyle({ grid: 'maybe', grayscale: {} })
check('sanitizer drops invalid booleans and non-primitives', !('grid' in badBool.style) && !('grayscale' in badBool.style) && badBool.warnings.length === 2)

const longTitle = sanitizeChartStyle({ title: '图'.repeat(45) })
check('sanitizer truncates the title to 40 chars', longTitle.style.title.length === 40 && longTitle.warnings.length === 1)
check('sanitizer drops a blank title', !('title' in sanitizeChartStyle({ title: '   ' }).style))

const numericStrings = sanitizeChartStyle({ fontScale: '1.5', strokeScale: ' 2 ' })
check('sanitizer accepts numeric strings', numericStrings.style.fontScale === 1.5 && numericStrings.style.strokeScale === 2)
const nanStyle = sanitizeChartStyle({ pointSize: 'abc', legendSize: Number.NaN })
check('sanitizer drops non-finite numbers', !('pointSize' in nanStyle.style) && !('legendSize' in nanStyle.style) && nanStyle.warnings.length === 2)

/* ---------------------------------------------------------------- parser -- */
const contractReply = JSON.stringify({ preset: 'paper-cn', style: { font: 'song', grid: false }, notes: '中文期刊用宋体、无网格。' })

const cleanParse = parseChartStyleReply(contractReply)
check('parser accepts clean JSON', cleanParse.ok === true, JSON.stringify(cleanParse.warnings))
check('parser reads the preset', cleanParse.preset === 'paper-cn', String(cleanParse.preset))
check('parser reads the style patch', cleanParse.style.font === 'song' && cleanParse.style.grid === false)
check('parser keeps the notes', cleanParse.notes === '中文期刊用宋体、无网格。', cleanParse.notes)

const fenced = parseChartStyleReply(`\`\`\`json\n${contractReply}\n\`\`\``)
check('parser strips ```json fences', fenced.ok === true && fenced.preset === 'paper-cn', JSON.stringify(fenced.warnings))

const prose = parseChartStyleReply(`好的，我的建议是：\n${contractReply}\n如果还需要调整请告诉我。`)
check('parser finds JSON surrounded by prose', prose.ok === true && prose.style.font === 'song', JSON.stringify(prose.warnings))

const trailingComma = parseChartStyleReply('{"preset":"print-bw","style":{"font":"serif","grayscale":true,},"notes":"黑白打印。",}')
check('parser repairs trailing commas', trailingComma.ok === true && trailingComma.style.font === 'serif', JSON.stringify(trailingComma.warnings))
check('parser flags the repair', trailingComma.warnings.some((w) => w.includes('修复')), JSON.stringify(trailingComma.warnings))

const singleQuotes = parseChartStyleReply("{'preset':'thesis','style':{'font':'song','grid':false},'notes':'论文用宋体。'}")
check('parser repairs single quotes', singleQuotes.ok === true && singleQuotes.preset === 'thesis' && singleQuotes.style.font === 'song', JSON.stringify(singleQuotes.warnings))

const smartQuotes = parseChartStyleReply('{“preset”:“print-bw”,“style”:{“font”:“serif”},“notes”:“灰”}')
check('parser repairs smart quotes', smartQuotes.ok === true && smartQuotes.preset === 'print-bw' && smartQuotes.style.font === 'serif')

const flatPatch = parseChartStyleReply('{"preset":null,"font":"mono","noteIgnored":1}')
check('parser accepts a flat top-level patch', flatPatch.ok === true && flatPatch.style.font === 'mono', JSON.stringify(flatPatch.style))
check('parser warns about the flat patch', flatPatch.warnings.some((w) => w.includes('style 字段')), JSON.stringify(flatPatch.warnings))
check('parser warns about unknown top-level fields', flatPatch.warnings.some((w) => w.includes('顶层字段')), JSON.stringify(flatPatch.warnings))

const nestedStyle = parseChartStyleReply('{"preset":null,"style":"{\\"font\\":\\"serif\\",\\"grid\\":false}"}')
check('parser unwraps a stringified style object', nestedStyle.ok === true && nestedStyle.style.font === 'serif')

const unknownPreset = parseChartStyleReply('{"preset":"ieee","style":{"font":"serif"},"notes":"x"}')
check('parser rejects unknown presets', unknownPreset.preset === null && unknownPreset.ok === true)
check('parser warns about unknown presets', unknownPreset.warnings.some((w) => w.includes('ieee')), JSON.stringify(unknownPreset.warnings))
check('parser normalises preset case', parseChartStyleReply('{"preset":"PAPER-EN","style":{}}').preset === 'paper-en')
check('parser accepts preset null', parseChartStyleReply('{"preset":null,"style":{"grid":false}}').preset === null)

const unknownStyleKey = parseChartStyleReply('{"preset":null,"style":{"font":"song","fontStack":"Times"}}')
check('parser drops unknown style keys', unknownStyleKey.ok === true && unknownStyleKey.style.font === 'song' && !('fontStack' in unknownStyleKey.style))
check('parser warns about unknown style keys', unknownStyleKey.warnings.some((w) => w.includes('fontStack')), JSON.stringify(unknownStyleKey.warnings))

const longNotes = parseChartStyleReply(JSON.stringify({ preset: null, style: { grid: false }, notes: '好'.repeat(300) }))
check('parser truncates long notes', longNotes.notes.length === NOTES_LIMIT && longNotes.notes.endsWith('…'), String(longNotes.notes.length))
check('parser warns about note truncation', longNotes.warnings.some((w) => w.includes('截断')), JSON.stringify(longNotes.warnings))

const emptyObject = parseChartStyleReply('{}')
check('parser accepts an empty patch', emptyObject.ok === true && emptyObject.preset === null && Object.keys(emptyObject.style).length === 0)
check('parser warns about an empty patch', emptyObject.warnings.some((w) => w.includes('没有给出任何样式修改')), JSON.stringify(emptyObject.warnings))

const garbage = parseChartStyleReply('抱歉，我无法完成这个请求。')
check('parser rejects prose-only replies', garbage.ok === false && Object.keys(garbage.style).length === 0)
check('parser echoes a short raw excerpt on failure', typeof garbage.raw === 'string' && garbage.raw.length > 0 && garbage.raw.length <= RAW_EXCERPT_LIMIT)
check('parser rejects empty replies', parseChartStyleReply('').ok === false)
check('parser caps the raw excerpt', parseChartStyleReply('x'.repeat(1000)).raw.length <= RAW_EXCERPT_LIMIT)
check('parser reports failure warnings', Array.isArray(garbage.warnings) && garbage.warnings.length > 0)

/* ---------------------------------------------------------------- prompt -- */
const styleRequest = '我要投中文核心期刊，双栏，灰度可打印'
const styleContext = {
  tab: 'pp',
  tabLabel: 'P-P 图',
  columns: ['木材', '塑料'],
  families: ['normal', 'weibull'],
  size: { width: 1800, height: 1200 },
  style: { fontStack: 'Times New Roman, serif', fontScale: 1.1, palette: 'gray' },
  preset: 'paper-cn',
}
const prompt = buildChartStylePrompt(styleRequest, styleContext)
check('prompt contains the user request', prompt.includes(styleRequest))
check('prompt states the JSON contract', prompt.includes('"preset"') && prompt.includes('"style"') && prompt.includes('"notes"') && prompt.includes('只输出一个 JSON 对象'))
check('prompt lists every vocabulary key', Object.keys(STYLE_FIELDS).every((key) => prompt.includes(`- ${key}：`)), Object.keys(STYLE_FIELDS).join(','))
check('prompt lists every preset id', PRESET_IDS.every((id) => prompt.includes(`- ${id}：`)), PRESET_IDS.join(','))
check('prompt forbids inventing keys', prompt.includes('禁止发明'))
check('prompt embeds the panel context', prompt.includes('P-P 图') && prompt.includes('木材') && prompt.includes('weibull') && prompt.includes('1800') && prompt.includes('"font":"serif"'))
check(
  'prompt states paper-figure defaults',
  prompt.includes('衬线') && prompt.includes('无网格') && prompt.includes('全框线') && prompt.includes('灰度'),
)
const barePrompt = buildChartStylePrompt('随便画', undefined)
check('prompt tolerates a missing context', barePrompt.includes('随便画') && barePrompt.includes('{}'))

/* --------------------------------------------------------------- handler -- */
let captured = []
let streamOptions
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

function makeLlm(reply, events) {
  return {
    listProviders: () => ['deepseek-official'],
    listModels: async () => [{ id: 'deepseek-v4-flash' }],
    resolveModelInfo: async () => ({ reasoning: { efforts: [{ id: 'high' }, { id: 'off' }] } }),
    async *stream(options) {
      streamOptions = options
      if (events) {
        for (const event of events) yield event
        return
      }
      yield { type: 'block-start', index: 0, blockType: 'text' }
      yield { type: 'text-delta', index: 0, text: reply }
      yield { type: 'finish', reason: { kind: 'stop' } }
    },
  }
}

async function captureError(promise) {
  try {
    await promise
    return ''
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

const successReply =
  '```json\n{"preset":"print-bw","style":{"font":"serif","grayscale":true,"grid":false},"notes":"黑白打印：衬线字体、无网格、灰度。"}\n```'
const selection = () => ({ currentSelection: () => ({ provider: 'deepseek-official', model: 'deepseek-v4-pro' }) })
const successHandler = buildChartStyleHandler({
  getLlm: () => makeLlm(successReply),
  getSelection: selection,
  loadModule: async () => fakeModule,
})
captured = []
const outcome = await successHandler({
  request: styleRequest,
  context: styleContext,
  signal: new AbortController().signal,
})
check('handler returns ok', outcome.ok === true, JSON.stringify(outcome).slice(0, 160))
check('handler reads the preset', outcome.preset === 'print-bw', String(outcome.preset))
check('handler applies the style patch', outcome.style.font === 'serif' && outcome.style.grayscale === true && outcome.style.grid === false)
check('handler returns the notes', typeof outcome.notes === 'string' && outcome.notes.includes('灰度'), outcome.notes)
check('handler reports provider and model', outcome.provider === 'deepseek-official' && outcome.model === 'deepseek-v4-pro', `${outcome.provider}/${outcome.model}`)
check('handler reports a duration', typeof outcome.ms === 'number' && outcome.ms >= 0, String(outcome.ms))
check('handler passes the prompt to the model', String(captured[0]?.content?.[0]?.text ?? '').includes(styleRequest) && String(captured[0]?.content?.[0]?.text ?? '').includes('"preset"'))
check('handler declares a user source', captured[0]?.source?.kind === 'user', JSON.stringify(captured[0]?.source))
check('handler picks the cheapest reasoning effort', streamOptions?.reasoningEffort === 'off', String(streamOptions?.reasoningEffort))
check('handler sets a token budget', Number(streamOptions?.maxTokens) > 0, String(streamOptions?.maxTokens))

const discoveryHandler = buildChartStyleHandler({
  getLlm: () => makeLlm(successReply),
  getSelection: () => ({ currentSelection: () => undefined }),
  loadModule: async () => fakeModule,
})
const discovered = await discoveryHandler({ request: '期刊图', signal: new AbortController().signal })
check('handler falls back to model discovery', discovered.ok === true && discovered.model === 'deepseek-v4-flash', discovered.model)

const unparsableHandler = buildChartStyleHandler({
  getLlm: () => makeLlm('抱歉，我无法完成这个请求。'),
  getSelection: selection,
  loadModule: async () => fakeModule,
})
const unparsable = await unparsableHandler({ request: '期刊图', signal: new AbortController().signal })
check('handler reports unparseable replies', unparsable.ok === false && typeof unparsable.error === 'string', JSON.stringify(unparsable).slice(0, 160))
check('handler returns a short raw excerpt', typeof unparsable.raw === 'string' && unparsable.raw.length <= RAW_EXCERPT_LIMIT)

const noLlmHandler = buildChartStyleHandler({ getLlm: () => undefined })
check('handler rejects an empty request', (await captureError(noLlmHandler({ request: '  ' }))).includes('请先描述'))
check(
  'handler rejects an oversized request',
  (await captureError(noLlmHandler({ request: 'x'.repeat(MAX_REQUEST_CHARS + 1) }))).includes(String(MAX_REQUEST_CHARS)),
)
check('handler reports a missing llm service', (await captureError(noLlmHandler({ request: '期刊图' }))).includes('llm'))

const reasoningOnlyHandler = buildChartStyleHandler({
  getLlm: () =>
    makeLlm(undefined, [
      { type: 'block-start', index: 0, blockType: 'reasoning' },
      { type: 'reasoning-delta', index: 0, text: '先想想……' },
      { type: 'finish', reason: { kind: 'max-tokens' } },
    ]),
  getSelection: selection,
  loadModule: async () => fakeModule,
})
check(
  'handler reports a truncated reasoning-only call',
  (await captureError(reasoningOnlyHandler({ request: '期刊图' }))).includes('token 上限'),
)

/* ----------------------------------------------------------------- route -- */
const routes = []
const scope = {
  effect(fn) {
    const dispose = fn()
    return typeof dispose === 'function' ? dispose : () => {}
  },
  get() {
    return undefined
  },
  tools: {
    register() {
      return () => {}
    },
  },
  webServer: {
    register(definition) {
      routes.push(definition)
      return () => {}
    },
  },
}
apply({
  effect(fn) {
    const dispose = fn()
    return typeof dispose === 'function' ? dispose : () => {}
  },
  inject(_deps, callback) {
    callback(scope)
    return { dispose() {} }
  },
})

const routeFor = (path) => routes.find((route) => route.path === path)
const styleRoute = routeFor('/api/dsh-distfit/chart-style')
check('chart-style route registered', Boolean(styleRoute), routes.map((r) => r.path).join(','))
check('chart-route keeps the plugin prefix', styleRoute?.path === '/api/dsh-distfit/chart-style')

function fakeRes() {
  const res = {
    status: 0,
    headers: {},
    body: '',
    headersSent: false,
    listeners: new Map(),
    writeHead(status, headers = {}) {
      res.status = status
      Object.assign(res.headers, headers)
      res.headersSent = true
    },
    end(chunk) {
      if (chunk) res.body += String(chunk)
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

const callRoute = async (method, payload) => {
  const res = fakeRes()
  await styleRoute.handler(fakeReq(method, payload), res)
  return res
}

const wrongMethod = await callRoute('GET')
check('chart-style rejects GET', wrongMethod.status === 405, String(wrongMethod.status))
const emptyBody = await callRoute('POST', {})
check('chart-style requires a request', emptyBody.status === 400 && emptyBody.json().ok === false, emptyBody.body.slice(0, 120))
const blankRequest = await callRoute('POST', { request: '   ' })
check('chart-style rejects a blank request', blankRequest.status === 400, blankRequest.body.slice(0, 120))
const longRequest = await callRoute('POST', { request: 'x'.repeat(MAX_REQUEST_CHARS + 1) })
check('chart-style rejects an oversized request', longRequest.status === 400 && longRequest.json().error.includes('600'), longRequest.body.slice(0, 120))
const noLlmRoute = await callRoute('POST', { request: styleRequest, context: styleContext })
check(
  'chart-style fails gracefully without a model service',
  noLlmRoute.status === 200 && noLlmRoute.json().ok === false && typeof noLlmRoute.json().error === 'string',
  noLlmRoute.body.slice(0, 120),
)
const healthRoute = routeFor('/api/dsh-distfit/health')
const health = fakeRes()
await healthRoute.handler(fakeReq('GET'), health)
check('health advertises the style route', health.json().chartStyle === true)

const wideBars = sanitizeChartStyle({ barGap: 32, barRadius: 40, barTone: 'outline' })
check(
  'sanitizer accepts the wider 0-40 bar range',
  wideBars.style.barGap === 32 && wideBars.style.barRadius === 40,
  JSON.stringify({ gap: wideBars.style.barGap, radius: wideBars.style.barRadius }),
)
const clampedBars = sanitizeChartStyle({ barGap: 400, barRadius: -20 })
check(
  'sanitizer clamps beyond the wider bar range',
  clampedBars.style.barGap === 40 && clampedBars.style.barRadius === 0,
  JSON.stringify({ gap: clampedBars.style.barGap, radius: clampedBars.style.barRadius }),
)

console.log('')
if (fails.length) {
  console.error(`FAILED (${fails.length})`)
  for (const failure of fails) console.error(` - ${failure}`)
  process.exitCode = 1
} else {
  console.log('PASS - chart-style: sanitizer + parser + prompt + handler + route behave as specified')
}
