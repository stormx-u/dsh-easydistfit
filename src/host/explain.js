/**
 * DistFit — host-side AI interpretation.
 *
 * The panel computes the fit in the browser; to explain the result it posts a
 * compact summary to `/api/dsh-distfit/explain`, which reaches this module.
 * Here we build the analyst prompt, resolve the user's default model, stream
 * one short completion through the DSH `llm` service and return plain text.
 *
 * Why the host: model credentials never reach the browser, and the `llm`
 * service keeps retry/auth/proxy behaviour identical to the chat UI.
 */

/** Upper bound on the summary we accept from the browser (JSON chars). */
export const MAX_SUMMARY_CHARS = 96 * 1024

/** One explanation call is a single short completion (reasoning included). */
export const MAX_TOKENS = 4000

/** Providers we prefer when nothing else is configured. */
const PREFERRED_PROVIDERS = ['deepseek-official']

const TEXT_LIMIT = 3200

const truncate = (value, limit) => {
  const text = String(value ?? '')
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`
}

const num = (value, digits = 4) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Number(n.toPrecision(digits))
}

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

/**
 * Build the analyst prompt from the panel summary.
 *
 * The summary is data only — no instruction inside it is trusted — so every
 * free-text field is truncated and the model is told to quote, not invent.
 * @param summary - compact result digest produced by the panel.
 * @returns the complete user prompt.
 */
export function buildPrompt(summary) {
  const alpha = num(summary?.alpha, 4) ?? 0.05
  const tests = Array.isArray(summary?.tests) ? summary.tests.map((t) => truncate(t, 12)).slice(0, 6) : []
  const chosen = Array.isArray(summary?.chosen) ? summary.chosen.map((t) => truncate(t, 40)).slice(0, 40) : []
  const datasets = Array.isArray(summary?.datasets) ? summary.datasets.slice(0, 8) : []
  const ranking = Array.isArray(summary?.ranking) ? summary.ranking.slice(0, 40) : []
  const warnings = Array.isArray(summary?.warnings) ? summary.warnings.map((w) => truncate(w, 160)).slice(0, 8) : []
  const digest = {
    significance: alpha,
    tests,
    candidateFamilies: chosen,
    datasets: datasets.map((ds) => ({
      name: truncate(ds?.name, 24),
      n: num(ds?.n, 6),
      removed: num(ds?.removed, 6) ?? 0,
      mean: num(ds?.stats?.mean),
      sd: num(ds?.stats?.sd),
      cv: num(ds?.stats?.cv),
      skewness: num(ds?.stats?.skew),
      kurtosis: num(ds?.stats?.kurt),
      min: num(ds?.stats?.min),
      max: num(ds?.stats?.max),
      quantiles: isObject(ds?.quantiles) ? ds.quantiles : null,
      histogram: Array.isArray(ds?.histogram)
        ? ds.histogram.slice(0, 14).map((bin) => ({
            lo: num(bin?.lo),
            hi: num(bin?.hi),
            n: num(bin?.n, 6),
          }))
        : [],
      best: ds?.best
        ? {
            distribution: truncate(ds.best.dist, 40),
            group: truncate(ds.best.family?.group, 20),
            support: truncate(ds.best.family?.support, 12),
            parameterCount: num(ds.best.family?.k, 3),
            ppDeviation: isObject(ds.best.ppDeviation) ? ds.best.ppDeviation : null,
          }
        : null,
      smallSample: Boolean(ds?.smallSample),
    })),
    ranking: ranking.map((row) => ({
      dataset: truncate(row?.dataset, 24),
      distribution: truncate(row?.dist, 40),
      support: truncate(row?.family?.support, 12),
      params: num(row?.k, 3),
      paramsText: truncate(row?.params, 120),
      aic: num(row?.aic),
      deltaAic: num(row?.deltaAic),
      weight: num(row?.weight),
      ksP: num(row?.p?.ks),
      adP: num(row?.p?.ad),
      cvmP: num(row?.p?.cvm),
      chi2P: num(row?.p?.chi2),
      verdict: truncate(row?.verdict, 12),
    })),
    warnings,
  }
  return [
    '你是资深统计与可靠性工程顾问。下面是一次“数据分布拟合”计算的机器输出（JSON）。',
    '请用简体中文向提出需求的工程师解读，核心是回答两件事：这组数据本身有什么特征，以及这些特征意味着什么。',
    '',
    '1. 开头用 1–2 句话给出总体结论：各列数据最贴合什么分布、可信到什么程度。',
    '2. 正文必须使用以下四个二级标题，顺序不变：「### 数据说明了什么」「### 推荐分布与依据」「### 风险与注意事项」「### 下一步建议」。',
    '3. 「数据说明了什么」是重点，篇幅不少于全文 40%。逐列用工程语言描述形态，并且每个判断都要“数字 + 意味着什么”：',
    '   - 中心与离散：均值、中位数 P50、标准差、CV → 波动有多大、过程稳不稳定；',
    '   - 对称与偏斜：偏度正负、均值与 P50 的相对位置 → 长尾拖在哪个方向（右偏=偶发大值，左偏=偶发小值）；',
    '   - 尾部与极值：min/max 相对 P1/P99 的距离、峰度 → 是否存在异常值、极端风险有多厚；',
    '   - 是否有界：best.support（real=可取任意实数、positive=只能为正、bounded=有上下限）与实测 min/max 是否一致 → 数据本身的取值边界；这里要把枚举值翻成中文说明，不要直接写字段名；',
    '   - 形状细节：histogram 的计数值 → 是否单峰、是否有空档、双峰、截断或堆积；',
    '   - 多列时对比列间差异：哪列更稳定、哪列偏得更厉害，并给出可能的工程原因。',
    '4. 「推荐分布与依据」要把分布族和形态对应起来，而不是只报排名：例如 Weibull 形状参数<1 提示早期失效/衰减、>1 提示磨损失效；对数正态对应乘性过程；Gamma 对应累积/等待过程；GPD/GEV 对应超阈值尾部；正态对应加性误差；均匀对应有明确上下限且分布平坦。引用 AIC、ΔAIC、Akaike 权重、参数文本与各项 p 值支撑结论。',
    `5. 解释显著性水平 α=${alpha} 下「接受 / 部分拒绝 / 拒绝」的含义：p<α 只表示在该检验下不能认为数据来自该分布，并不说明数据来自哪个分布；并说明 best.ppDeviation 的 maxDev 与 atQuantile 落在何处（如 maxDev 出现在 P>0.9 表示上尾偏差大，落在 P<0.1 表示下尾偏差大）。`,
    '6. 关注参数个数相对样本量的过拟合风险，指出 AIC 靠前但检验被拒绝这类矛盾怎么读；若 smallSample=true 或 warnings 非空，必须明确提醒结论仅供参考。',
    '7. 不要重复原始表格、不要输出 JSON、不要编造 JSON 里没有的数字；不确定就直说不确定。总长度 500–900 字，短句、可执行。',
    '',
    '计算结果 JSON：',
    JSON.stringify(digest),
  ].join('\n')
}

/** Read the user's configured default model selection. */
export function selectionOf(agentDefaultModel) {
  try {
    const selection = agentDefaultModel?.currentSelection?.()
    if (selection?.provider && selection?.model) {
      return { provider: String(selection.provider), model: String(selection.model) }
    }
  } catch {
    /* the selection service is optional; fall through to discovery */
  }
  return undefined
}

/** Discover any usable provider/model pair, preferring the DeepSeek ones. */
export async function discoverRoute(llm) {
  let providers = []
  try {
    providers = (await llm.listProviders?.()) ?? []
  } catch {
    providers = []
  }
  const ids = providers
    .map((p) => (typeof p === 'string' ? p : p?.id))
    .filter((id) => typeof id === 'string' && id.length > 0)
  const ordered = [
    ...PREFERRED_PROVIDERS.filter((id) => ids.includes(id)),
    ...ids.filter((id) => !PREFERRED_PROVIDERS.includes(id)),
  ]
  for (const provider of ordered) {
    try {
      const models = (await llm.listModels?.(provider)) ?? []
      const list = models.map((m) => (typeof m === 'string' ? m : m?.id)).filter((id) => typeof id === 'string' && id.length > 0)
      const model =
        list.find((id) => /v4|deepseek-chat|chat|flash|pro/i.test(id)) ??
        list.find((id) => !/embed|rerank|vision-only/i.test(id)) ??
        list[0]
      if (model) return { provider, model }
    } catch {
      /* a single provider failing must not abort discovery */
    }
  }
  return undefined
}

/** Convert a terminal finish reason into an error. */
export function finishError(finish) {
  switch (finish?.kind) {
    case 'error':
    case 'aborted':
      return new Error(finish.failure?.message ?? '模型调用被中止')
    default:
      return undefined
  }
}

/** Prefer the cheapest reasoning effort so the answer is not starved of tokens. */
export function cheapestEffort(info) {
  const efforts = info?.reasoning?.efforts
  if (!Array.isArray(efforts) || efforts.length === 0) return undefined
  const ids = efforts.map((effort) => String(effort?.id ?? '')).filter(Boolean)
  return ids.find((id) => /off|none|minimal|low/i.test(id)) ?? ids[0]
}

/**
 * Run one explanation completion.
 * @param options.llm - DSH `llm` service.
 * @param options.agentDefaultModel - DSH `agentDefaultModel` service (optional).
 * @param options.summary - compact result digest from the panel.
 * @param options.signal - abort signal.
 * @param options.loadModule - test seam for `@deepseek-ai/dsh-llm`.
 * @returns `{ text, provider, model }`.
 */
export async function explainFit({ llm, agentDefaultModel, summary, signal, loadModule }) {
  if (!llm || typeof llm.stream !== 'function') {
    throw new Error('宿主没有可用的 llm 服务，无法生成解读')
  }
  const prompt = buildPrompt(summary)
  if (prompt.length > MAX_SUMMARY_CHARS) {
    throw new Error('结果摘要过大，无法提交给模型')
  }
  const route = selectionOf(agentDefaultModel) ?? (await discoverRoute(llm))
  if (!route) {
    throw new Error('未找到可用模型：请先在设置里选择一个默认模型再试')
  }
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
  const text = (streamed || assembled).trim()
  if (!text) {
    const reason = finishKind ?? assembler.finish?.reason?.kind ?? assembler.finish?.kind
    const seenList = [...seen].join(' / ') || '无'
    throw new Error(
      reason === 'max-tokens'
        ? `模型输出被 token 上限截断（只收到思考内容：${seenList}），请重试`
        : `模型没有返回内容（收到的事件：${seenList}）`,
    )
  }
  return { text: truncate(text, TEXT_LIMIT * 4), provider: route.provider, model: route.model }
}
