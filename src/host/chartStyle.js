/**
 * DistFit — host-side chart-style assistant.
 *
 * The panel ships preset templates (paper/journal/thesis/PPT/black-white) and a
 * flat style vocabulary. A user describes the figure they need in words
 * ("我要投中文核心期刊，双栏，灰度可打印"); this module turns that description into a
 * *style patch* the client applies on top of its current template.
 *
 * Everything here is pure except `buildChartStyleHandler`, which follows the
 * same model-discovery/streaming plumbing as `explain.js`: the host owns the
 * credentials, so no prompt or token ever reaches the browser.
 */

import {
  MAX_TOKENS,
  cheapestEffort,
  discoverRoute,
  finishError,
  selectionOf,
} from './explain.js'

/** Longest user requirement the route/handler accepts. */
export const MAX_REQUEST_CHARS = 600

/** Contract limit for the model's `notes` explanation. */
export const NOTES_LIMIT = 200

/** How much of an unparseable reply is echoed back to the panel. */
export const RAW_EXCERPT_LIMIT = 400

/** Hard cap on the accumulated model reply (a style JSON is a few hundred chars). */
const MAX_REPLY_CHARS = 24 * 1024

/** Preset ids the model may name (mirrors the client's `TEMPLATE_PRESETS`). */
export const PRESET_IDS = ['default', 'paper-cn', 'paper-en', 'thesis', 'ppt', 'ppt-clear', 'print-bw']

/** One line of prompt guidance per preset. */
const PRESET_HINTS = {
  default: '默认彩色网格，适合屏幕查看',
  'paper-cn': '中文期刊双栏，宋体、全框线、无网格',
  'paper-en': '英文期刊单栏，Times 衬线、色盲友好配色、图例在右',
  thesis: '学位论文单栏，宋体、L 形轴、无网格',
  ppt: '演示文稿 16:9，黑体、粗线、大字',
  'ppt-clear': '演示文稿，透明背景，贴到深色母版',
  'print-bw': '黑白打印，灰度、全框线',
}

/**
 * The style vocabulary. This object is the single source of truth for the
 * sanitizer, the prompt wording and the client contract: keys not listed here
 * are never forwarded to the chart.
 */
export const STYLE_FIELDS = {
  font: {
    type: 'enum',
    values: ['sans', 'hei', 'song', 'serif', 'mono'],
    detail: '字体（sans=无衬线、hei=黑体、song=宋体、serif=Times/衬线、mono=等宽）',
  },
  fontScale: { type: 'number', min: 0.5, max: 6, detail: '字号倍率' },
  strokeScale: { type: 'number', min: 0.3, max: 6, detail: '线宽倍率' },
  palette: {
    type: 'enum',
    values: ['default', 'cvd', 'mono', 'warm', 'gray'],
    detail: '配色（default=默认彩色、cvd=色盲友好、mono=单色蓝、warm=暖色、gray=灰阶）',
  },
  grayscale: { type: 'boolean', detail: '是否整体转为灰度' },
  grid: { type: 'boolean', detail: '是否显示网格' },
  axes: { type: 'enum', values: ['L', 'box'], detail: '坐标轴样式（L=仅左下 L 形轴、box=全框线）' },
  legend: {
    type: 'enum',
    values: ['bottom', 'right', 'none'],
    detail: '图例位置（bottom=下方、right=右侧、none=隐藏）',
  },
  legendSize: { type: 'number', min: 0.7, max: 2, detail: '图例字号倍率' },
  background: { type: 'enum', values: ['white', 'transparent'], detail: '背景（white=白底、transparent=透明底）' },
  title: { type: 'string', maxLength: 40, detail: '图题' },
  barOpacity: { type: 'number', min: 0.05, max: 1, detail: '柱体填充不透明度' },
  barEdge: { type: 'boolean', detail: '柱体是否描边' },
  barTone: {
    type: 'enum',
    values: ['soft', 'medium', 'bold', 'outline'],
    detail: '柱体深浅（soft=浅、medium=中、bold=深、outline=空心只描边）',
  },
  barGap: { type: 'number', min: 0, max: 40, detail: '柱间距（像素，0=紧贴，常用 0–12）' },
  barRadius: { type: 'number', min: 0, max: 40, detail: '柱体圆角（像素，0=直角，常用 0–16）' },
  pointSize: { type: 'number', min: 0.4, max: 3, detail: '数据点大小倍率' },
}

const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

/** Truncate to `limit` characters, ending with an ellipsis when cut. */
const clip = (value, limit) => {
  const text = String(value ?? '')
  if (text.length <= limit) return text
  return `${text.slice(0, Math.max(0, limit - 1))}…`
}

/** Coerce the friendly boolean spellings a model may emit. */
function toBoolean(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') {
    if (value === 1) return true
    if (value === 0) return false
    return undefined
  }
  if (typeof value === 'string') {
    const text = value.trim().toLowerCase()
    if (['true', 'yes', 'y', '1', '是', '开', 'on'].includes(text)) return true
    if (['false', 'no', 'n', '0', '否', '关', 'off'].includes(text)) return false
  }
  return undefined
}

/** Render one field's range/type hint for the prompt. */
function typeHint(spec) {
  if (spec.type === 'number') return `；数值 ${spec.min}–${spec.max}`
  if (spec.type === 'boolean') return '；true/false'
  if (spec.type === 'string') return `；字符串，不超过 ${spec.maxLength} 字`
  return ''
}

/**
 * Coerce anything (model reply, stale client state, garbage) into a legal
 * style patch. Unknown keys and non-primitive values are dropped; numbers are
 * clamped into their documented ranges; booleans accept `"true"`/`"是"` too.
 *
 * Never throws: a malformed patch degrades to an empty object.
 * @param raw - candidate style patch.
 * @returns `{ style, dropped, warnings }`.
 */
export function sanitizeChartStyle(raw) {
  const style = {}
  const dropped = []
  const warnings = []
  try {
    if (!isPlainObject(raw)) {
      if (raw !== undefined && raw !== null) warnings.push('样式内容不是对象，已忽略')
      return { style, dropped, warnings }
    }
    for (const [key, value] of Object.entries(raw)) {
      const spec = STYLE_FIELDS[key]
      if (!spec) {
        dropped.push(key)
        continue
      }
      if (value === null || value === undefined) {
        dropped.push(key)
        continue
      }
      const primitive =
        typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
      if (!primitive) {
        dropped.push(key)
        warnings.push(`字段 ${key} 不是基本类型的值，已忽略`)
        continue
      }
      if (spec.type === 'enum') {
        const text = String(value).trim()
        const match = spec.values.find((option) => option.toLowerCase() === text.toLowerCase())
        if (!match) {
          dropped.push(key)
          warnings.push(`字段 ${key} 的取值「${clip(text, 20)}」不在允许范围，已忽略`)
          continue
        }
        style[key] = match
        continue
      }
      if (spec.type === 'number') {
        if (typeof value === 'boolean' || (typeof value === 'string' && value.trim() === '')) {
          dropped.push(key)
          warnings.push(`字段 ${key} 不是有效数字，已忽略`)
          continue
        }
        const n = Number(value)
        if (!Number.isFinite(n)) {
          dropped.push(key)
          warnings.push(`字段 ${key} 不是有效数字，已忽略`)
          continue
        }
        const clamped = Math.min(spec.max, Math.max(spec.min, n))
        if (clamped !== n) warnings.push(`字段 ${key} 已限制在 ${spec.min}–${spec.max}`)
        style[key] = clamped
        continue
      }
      if (spec.type === 'boolean') {
        const flag = toBoolean(value)
        if (flag === undefined) {
          dropped.push(key)
          warnings.push(`字段 ${key} 不是布尔值，已忽略`)
          continue
        }
        style[key] = flag
        continue
      }
      if (spec.type === 'string') {
        const text = String(value).trim()
        if (!text) {
          dropped.push(key)
          continue
        }
        const limit = spec.maxLength ?? 40
        if (text.length > limit) {
          style[key] = text.slice(0, limit)
          warnings.push(`字段 ${key} 已截断到 ${limit} 字`)
        } else {
          style[key] = text
        }
        continue
      }
      dropped.push(key)
    }
  } catch {
    warnings.push('样式解析失败，已忽略异常内容')
  }
  return { style, dropped, warnings }
}

/* ---------------------------------------------------------------- parsing -- */

/** Remove a leading/trailing Markdown fence around the reply. */
function stripFence(text) {
  let out = text.trim()
  out = out.replace(/^```[a-zA-Z0-9_-]*[ \t]*\r?\n?/, '')
  out = out.replace(/\r?\n?```[ \t]*$/, '')
  return out.trim()
}

/**
 * Collect every top-level balanced `{...}` block, ignoring braces inside
 * strings. `allowSingle` also treats `'` as a string delimiter, which the repair
 * pass needs; the first pass leaves it alone so English prose ("Here's the
 * JSON: {…}") does not swallow the object.
 */
function balancedObjects(text, allowSingle) {
  const found = []
  let depth = 0
  let start = -1
  let inString = false
  let quote = ''
  let escaped = false
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === quote) inString = false
      continue
    }
    if (ch === '"' || (allowSingle && ch === "'")) {
      inString = true
      quote = ch
      continue
    }
    if (ch === '{') {
      if (depth === 0) start = i
      depth += 1
      continue
    }
    if (ch === '}') {
      if (depth === 0) continue
      depth -= 1
      if (depth === 0 && start >= 0) {
        found.push(text.slice(start, i + 1))
        start = -1
      }
    }
  }
  return found
}

/** Best-effort repair for the two slips models make most: trailing commas, quotes. */
function repairJson(text) {
  let out = text.replace(/^\uFEFF/, '')
  // Smart quotes around keys/strings are a common Chinese-model slip.
  out = out.replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
  out = out.replace(/,\s*([}\]])/g, '$1')
  out = out.replace(/'((?:[^'\\]|\\.)*)'/g, (_match, body) => {
    const inner = String(body).replace(/\\'/g, "'").replace(/"/g, '\\"')
    return `"${inner}"`
  })
  return out
}

/** Short single-line excerpt of the reply, safe to echo to the browser. */
function excerpt(text) {
  const flat = String(text ?? '').replace(/\s+/g, ' ').trim()
  if (flat.length <= RAW_EXCERPT_LIMIT) return flat
  return `${flat.slice(0, RAW_EXCERPT_LIMIT - 1)}…`
}

/**
 * Parse a model reply into a style patch.
 *
 * Accepts clean JSON, fenced JSON, JSON surrounded by prose, and lightly broken
 * JSON (trailing commas / single quotes). Rejects anything with no object.
 * @param text - raw model output.
 * @returns `{ ok, preset, style, notes, warnings, raw }`.
 */
export function parseChartStyleReply(text) {
  const source = typeof text === 'string' ? text : String(text ?? '')
  const raw = excerpt(source)
  const fail = (...warnings) => ({ ok: false, preset: null, style: {}, notes: '', warnings, raw })
  if (!source.trim()) return fail('模型没有返回任何内容')

  const body = stripFence(source.replace(/^\uFEFF/, ''))
  let value
  let repaired = false
  for (const allowSingle of [false, true]) {
    const candidates = balancedObjects(body, allowSingle)
    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate)
        if (isPlainObject(parsed)) {
          value = parsed
          break
        }
      } catch {
        /* the repair pass below retries the same candidate */
      }
      const fixed = repairJson(candidate)
      if (fixed === candidate) continue
      try {
        const parsed = JSON.parse(fixed)
        if (isPlainObject(parsed)) {
          value = parsed
          repaired = true
          break
        }
      } catch {
        /* try the next candidate */
      }
    }
    if (value) break
  }
  if (!value) {
    const warnings = ['没有在回复中找到可解析的 JSON 对象']
    if (balancedObjects(body, false).length || balancedObjects(body, true).length) {
      warnings.push('模型返回的 JSON 无法解析')
    }
    return fail(...warnings)
  }

  const warnings = []
  if (repaired) warnings.push('已自动修复模型返回的 JSON 格式')

  // `preset` may be absent/null; anything unknown degrades to null.
  let preset = null
  if (value.preset !== undefined && value.preset !== null) {
    const name = String(value.preset).trim().toLowerCase()
    if (name && name !== 'null' && name !== 'none') {
      if (PRESET_IDS.includes(name)) preset = name
      else warnings.push(`预设「${clip(name, 20)}」不存在，已忽略`)
    }
  }

  // The contract nests the patch under `style`; tolerate a flat top-level patch.
  let styleInput
  if (isPlainObject(value.style)) {
    styleInput = value.style
  } else if (typeof value.style === 'string') {
    try {
      const nested = JSON.parse(value.style)
      if (isPlainObject(nested)) styleInput = nested
    } catch {
      /* fall through to the flat patch */
    }
  }
  if (!styleInput) {
    const flat = {}
    for (const key of Object.keys(value)) {
      if (Object.prototype.hasOwnProperty.call(STYLE_FIELDS, key)) flat[key] = value[key]
    }
    if (Object.keys(flat).length) {
      styleInput = flat
      warnings.push('模型未使用 style 字段，已按顶层样式键解析')
    }
  }
  const sanitized = sanitizeChartStyle(styleInput ?? {})
  warnings.push(...sanitized.warnings)
  if (sanitized.dropped.length) {
    warnings.push(`已忽略无法识别的字段：${sanitized.dropped.slice(0, 8).join('、')}`)
  }

  const extra = Object.keys(value).filter((key) => key !== 'preset' && key !== 'style' && key !== 'notes')
  if (extra.length) warnings.push(`已忽略额外的顶层字段：${extra.slice(0, 8).join('、')}`)

  let notes = ''
  if (value.notes !== undefined && value.notes !== null) {
    const text = String(value.notes).trim()
    if (text.length > NOTES_LIMIT) {
      notes = `${text.slice(0, NOTES_LIMIT - 1)}…`
      warnings.push(`说明过长，已截断到 ${NOTES_LIMIT} 字`)
    } else {
      notes = text
    }
  }
  if (!preset && Object.keys(sanitized.style).length === 0) {
    warnings.push('模型没有给出任何样式修改')
  }
  return { ok: true, preset, style: sanitized.style, notes, warnings, raw }
}

/* ----------------------------------------------------------------- prompt -- */

const finiteNumber = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const stringList = (value, limit = 12) => {
  const list = Array.isArray(value) ? value : value === undefined || value === null ? [] : [value]
  return list
    .map((item) => {
      if (typeof item === 'string') return item.trim()
      if (item && typeof item === 'object') return String(item.name ?? item.id ?? '').trim()
      return String(item ?? '').trim()
    })
    .filter(Boolean)
    .slice(0, limit)
    .map((item) => clip(item, 40))
}

/** Infer the vocabulary font from a CSS font stack sent by the client. */
function fontFromStack(stack) {
  const text = String(stack ?? '').toLowerCase()
  if (/seg(oe)? ui/.test(text) && !/simsun|songti|times/.test(text)) return 'sans'
  if (/mono|consolas|courier|jetbrains/.test(text)) return 'mono'
  if (/simsun|songti|source han serif|noto serif cjk/.test(text)) return 'song'
  if (/times|georgia|nimbus roman/.test(text)) return 'serif'
  if (/yahei|pingfang|heiti|source han sans|noto sans cjk/.test(text)) return 'hei'
  return 'sans'
}

/**
 * Compact, trustworthy context digest. Only primitives are forwarded so a
 * hostile or stale context object can never bloat the prompt.
 */
function compactContext(context) {
  const c = isPlainObject(context) ? context : {}
  const out = {}
  const tab = c.tab ?? c.currentTab ?? c.tabId
  if (typeof tab === 'string' && tab.trim()) out.tab = clip(tab.trim(), 30)
  const tabLabel = c.tabLabel ?? c.currentTabLabel
  if (typeof tabLabel === 'string' && tabLabel.trim()) out.tabLabel = clip(tabLabel.trim(), 30)
  const columns = stringList(c.columns ?? c.datasets ?? c.columnNames)
  if (columns.length) out.columns = columns
  const families = stringList(c.families ?? c.chosen ?? c.chosenFamilies, 24)
  if (families.length) out.families = families
  const width = finiteNumber(c.size?.width ?? c.width)
  const height = finiteNumber(c.size?.height ?? c.height)
  if (width && height) out.size = { width: Math.round(width), height: Math.round(height) }
  const preset = c.preset ?? c.currentPreset
  if (typeof preset === 'string' && preset.trim()) out.preset = clip(preset.trim(), 20)
  const style = sanitizeChartStyle(c.style ?? c.currentStyle).style
  const styleStack = c.style?.fontStack ?? c.currentStyle?.fontStack
  if (!style.font && typeof styleStack === 'string' && styleStack.trim()) {
    style.font = fontFromStack(styleStack)
  }
  if (Object.keys(style).length) out.style = style
  return out
}

/**
 * Build the Chinese prompt that turns a plain-language layout requirement into
 * a style patch.
 * @param request - the user's own words (becomes data, not instructions).
 * @param context - optional panel state (tab, columns, size, style, families).
 * @returns the complete prompt.
 */
export function buildChartStylePrompt(request, context) {
  const requirement = clip(String(request ?? '').trim(), MAX_REQUEST_CHARS)
  const digest = compactContext(context)
  const vocabulary = Object.entries(STYLE_FIELDS)
    .map(([key, spec]) => `- ${key}：${spec.detail}${typeHint(spec)}`)
    .join('\n')
  const presets = PRESET_IDS.map((id) => `- ${id}：${PRESET_HINTS[id] ?? ''}`).join('\n')
  return [
    '你是 DistFit 图表样式助手。DistFit 是“分布拟合与拟合优度检验”面板，会画直方图、密度/分布曲线、Q-Q/P-P 图等统计图，并可导出 PNG/SVG 用于期刊、论文或演示。用户会用自然语言说出出图要求，你要把它翻译成一次可执行的“样式补丁”。',
    '',
    '【可用样式字段（只能使用这些键，禁止发明任何新键或别名）】',
    vocabulary,
    '',
    '【预设模板（需求贴近时优先直接套用）】',
    presets,
    '',
    '【输出契约】只输出一个 JSON 对象：不要 Markdown 代码块，不要任何解释文字，不要输出 JSON 以外的内容。格式固定为：',
    '{"preset":"<预设 id 或 null>","style":{"<字段名>":<值>},"notes":"<不超过 200 字的中文说明>"}',
    '',
    '【规则】',
    '1. 只允许上面列出的字段键。无法用这些字段表达的需求不要硬编字段，写进 notes 说明即可。',
    '2. style 只写需要改动的字段；用户没提到的字段不要写，不要输出完整样式对象。',
    '3. 如果需求与某个预设高度接近，把 preset 设为该 id；预设已经覆盖的部分不要在 style 里重复，只在 style 里补预设没有覆盖、或用户额外提出的要求。拿不准时 preset 用 null。',
    '4. 数值必须落在给定范围内；布尔字段只写 true/false；title 不超过 40 字。',
    '4.1 画布尺寸与字号/线宽要配套：画布越宽，字号与线宽倍率必须越大，否则导出后文字会小到看不清。经验值：宽 1280–1600 px 用 1–1.5；1800–2000 px 用 2.8–3.4；2400 px 以上用 3.6–4.5。用户说“字大一点”“PPT 看不清”时，先按此表取上限再略加。',
    '5. 论文/期刊用图的默认常识：衬线或宋体字体、无网格、全框线、灰度可打印（palette=gray 或 grayscale=true）、图例字号不要过大；只有用户明确要彩色时才给彩色。',
    '6. notes 用简体中文，说明改了哪些字段、为什么这样改，不要复述 JSON。',
    '',
    '【用户需求】',
    requirement || '（用户没有填写具体需求，请只输出空补丁并在 notes 里说明）',
    '',
    '【当前图表状态（JSON，只作参考，输出时不要照抄整份）】',
    JSON.stringify(digest),
  ].join('\n')
}

/* ---------------------------------------------------------------- handler -- */

/**
 * Build the model-calling handler used by the HTTP route.
 * @param options.getLlm - returns the DSH `llm` service (may be undefined).
 * @param options.getSelection - returns the DSH `agentDefaultModel` service.
 * @param options.loadModule - test seam for `@deepseek-ai/dsh-llm`.
 * @returns `async ({ request, context, signal }) => outcome`.
 */
export function buildChartStyleHandler({ getLlm, getSelection, loadModule } = {}) {
  return async function chartStyleHandler({ request, context, signal } = {}) {
    const startedAt = Date.now()
    const requirement = typeof request === 'string' ? request.trim() : ''
    if (!requirement) throw new Error('请先描述你想要的图表样式')
    if (requirement.length > MAX_REQUEST_CHARS) {
      throw new Error(`样式需求过长，请控制在 ${MAX_REQUEST_CHARS} 字以内`)
    }
    const llm = typeof getLlm === 'function' ? getLlm() : undefined
    if (!llm || typeof llm.stream !== 'function') {
      throw new Error('宿主没有可用的 llm 服务，无法生成图表样式')
    }
    const prompt = buildChartStylePrompt(requirement, context)
    const route =
      selectionOf(typeof getSelection === 'function' ? getSelection() : undefined) ?? (await discoverRoute(llm))
    if (!route) throw new Error('未找到可用模型：请先在设置里选择一个默认模型再试')
    let reasoningEffort
    try {
      const info = await llm.resolveModelInfo?.(route.provider, route.model)
      reasoningEffort = cheapestEffort(info)
    } catch {
      /* capability lookup is advisory; the adapter default is a fine fallback */
    }
    const mod = await (loadModule ? loadModule() : import('@deepseek-ai/dsh-llm'))
    const { createUserMessage, BlockAssembler } = mod ?? {}
    if (typeof createUserMessage !== 'function' || typeof BlockAssembler !== 'function') {
      throw new Error('无法加载 @deepseek-ai/dsh-llm，请重启 DSH 后再试')
    }
    const message = createUserMessage({
      content: [{ type: 'text', text: prompt }],
      source: { kind: 'user' },
    })
    const assembler = new BlockAssembler()
    let streamed = ''
    const seen = new Set()
    let finishKind
    for await (const chunk of llm.stream({
      provider: route.provider,
      model: route.model,
      messages: [message],
      maxTokens: MAX_TOKENS,
      ...(reasoningEffort ? { reasoningEffort } : {}),
      signal,
    })) {
      if (typeof chunk?.type === 'string') seen.add(chunk.type)
      if (chunk?.type === 'text-delta' && typeof chunk.text === 'string') streamed += chunk.text
      if (chunk?.type === 'finish') finishKind = chunk.reason?.kind ?? finishKind
      assembler.push(chunk)
    }
    const terminal = finishError(assembler.finish)
    if (terminal) throw terminal
    const assembled = assembler
      .blocks()
      .filter((block) => block?.type === 'text')
      .map((block) => block.text)
      .join('')
    const text = (streamed || assembled).trim().slice(0, MAX_REPLY_CHARS)
    if (!text) {
      const reason = finishKind ?? assembler.finish?.reason?.kind ?? assembler.finish?.kind
      const seenList = [...seen].join(' / ') || '无'
      throw new Error(
        reason === 'max-tokens'
          ? `模型输出被 token 上限截断（只收到思考内容：${seenList}），请重试`
          : `模型没有返回内容（收到的事件：${seenList}）`,
      )
    }
    const parsed = parseChartStyleReply(text)
    const ms = Date.now() - startedAt
    if (!parsed.ok) {
      return {
        ok: false,
        error: '模型返回的内容无法解析为样式 JSON，请重试',
        raw: parsed.raw,
        warnings: parsed.warnings,
        provider: route.provider,
        model: route.model,
        ms,
      }
    }
    return {
      ok: true,
      preset: parsed.preset,
      style: parsed.style,
      notes: parsed.notes,
      warnings: parsed.warnings,
      provider: route.provider,
      model: route.model,
      ms,
    }
  }
}
