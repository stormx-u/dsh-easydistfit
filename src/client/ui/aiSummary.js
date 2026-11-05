/**
 * DistFit — compact result digest for the AI interpreter.
 *
 * The full analysis result contains curves, histograms and matrices that the
 * model does not need. This module distils it into the handful of numbers an
 * analyst actually argues from: sample shape, per-family AIC/ΔAIC/weight and
 * the goodness-of-fit p-values, plus the engine warnings.
 *
 * Keeping this on the client means the host route stays a dumb transport, and
 * the same digest can be shown to the user before anything leaves the browser.
 */

import { getDist } from '../../engine/distributions.js'

/** How many ranking rows per dataset travel to the model. */
const TOP_PER_DATASET = 6

/** How many histogram bins travel to the model (the shape is what matters). */
const MAX_BINS = 14

const SMALL_SAMPLE = 15

/** Quantiles that describe the centre, the spread and both tails. */
const QUANTILE_LEVELS = [0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99]

const finite = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const round = (value, digits = 4) => {
  const n = finite(value)
  if (n === null) return null
  return Number(n.toPrecision(digits))
}

const compactStats = (stats) => {
  if (!stats) return null
  return {
    mean: round(stats.mean),
    sd: round(stats.sd),
    cv: round(stats.cv),
    skew: round(stats.skew),
    kurt: round(stats.kurt),
    min: round(stats.min),
    max: round(stats.max),
  }
}

/** Linear-interpolated empirical quantiles (the R type-7 definition). */
function empiricalQuantiles(values, levels) {
  const xs = (values ?? []).filter((v) => Number.isFinite(v)).slice().sort((a, b) => a - b)
  const n = xs.length
  if (!n) return null
  const at = (level) => {
    const position = (n - 1) * level
    const lower = Math.floor(position)
    const upper = Math.ceil(position)
    if (lower === upper) return xs[lower]
    return xs[lower] + (xs[upper] - xs[lower]) * (position - lower)
  }
  const out = {}
  for (const level of levels) out[`p${Math.round(level * 100)}`] = round(at(level), 5)
  return out
}

/**
 * How far the best fit's probability plot strays, and whether the straying sits
 * in a tail. This is the evidence behind "the fit is off in the upper tail".
 */
function ppDeviation(points) {
  const usable = (points ?? []).filter(
    (p) => Number.isFinite(p?.theoretical) && Number.isFinite(p?.empirical),
  )
  if (!usable.length) return null
  let max = 0
  let at = 0
  let lowerTail = 0
  let upperTail = 0
  for (const p of usable) {
    const dev = Math.abs(p.theoretical - p.empirical)
    if (dev > max) {
      max = dev
      at = p.theoretical
    }
    if (p.theoretical < 0.1) lowerTail = Math.max(lowerTail, dev)
    if (p.theoretical > 0.9) upperTail = Math.max(upperTail, dev)
  }
  return {
    maxDev: round(max, 3),
    atQuantile: round(at, 3),
    lowerTailDev: round(lowerTail, 3),
    upperTailDev: round(upperTail, 3),
  }
}

/** Compress a histogram into the counts an analyst reads a shape from. */
function compactHistogram(bins) {
  return (bins ?? []).slice(0, MAX_BINS).map((bin) => ({
    lo: round(bin?.x0, 4),
    hi: round(bin?.x1, 4),
    n: finite(bin?.count),
  }))
}

/** Registry facts about the fitted family (support decides what is plausible). */
function familyOf(distId) {
  const dist = getDist(distId)
  if (!dist) return null
  return { group: dist.group, support: dist.support, k: dist.k }
}

const truncateText = (value, limit) => {
  const text = String(value ?? '')
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`
}

/**
 * Build the digest posted to `/api/dsh-distfit/explain`.
 * @param result - engine `analyze()` result.
 * @param columns - parsed table columns (`{name, values}`).
 * @param chosen - selected distribution ids.
 * @param alpha - significance level.
 * @returns plain JSON summary, or null when there is nothing to analyse.
 */
export function buildAiSummary(result, columns, chosen, alpha) {
  if (!result || !Array.isArray(result.rows) || !result.rows.length) return null

  const names = (columns ?? []).map((c) => (typeof c === 'string' ? c : c.name)).filter(Boolean)
  const datasets = []
  const ranking = []

  for (const name of names) {
    // The engine nests descriptive statistics inside each dataset entry
    // (`result.datasets[i].stats`); there is no separate `result.stats` array.
    const dataset = (result.datasets ?? []).find((entry) => entry.name === name)
    const n = finite(dataset?.n) ?? 0
    if (!n) continue

    const column = (columns ?? []).find((c) => (typeof c === 'string' ? c : c.name) === name)
    const values = typeof column === 'object' ? column?.values : undefined
    const histogram = (result.histograms ?? []).find((h) => h.dataset === name)
    const best = (result.optimal ?? []).find((o) => o.dataset === name)

    datasets.push({
      name,
      n,
      removed: finite(dataset?.removed) ?? 0,
      smallSample: n < SMALL_SAMPLE,
      stats: compactStats(dataset?.stats),
      // Numbers the model needs to describe the data itself, not just the fit.
      quantiles: empiricalQuantiles(values, QUANTILE_LEVELS),
      histogram: compactHistogram(histogram?.bins),
      best: best
        ? {
            dist: truncateText(best.distId, 40),
            family: familyOf(best.distId),
            ppDeviation: ppDeviation(
              (result.pp ?? []).find((p) => p.dataset === name && p.distId === best.distId)?.points,
            ),
          }
        : null,
    })

    const rows = (result.rows ?? []).filter((r) => r.dataset === name && Number.isFinite(r.aic))
    const byId = new Map(rows.map((r) => [r.distId, r]))
    const top = (result.ranking ?? [])
      .filter((r) => r.dataset === name && Number.isFinite(r.aic))
      .slice(0, TOP_PER_DATASET)

    for (const entry of top) {
      const detail = byId.get(entry.distId) ?? {}
      ranking.push({
        dataset: name,
        dist: detail.distName ?? entry.distId,
        distId: entry.distId,
        family: familyOf(entry.distId),
        k: finite(detail.k),
        params: detail.paramsText ?? '',
        aic: round(entry.aic),
        deltaAic: round(entry.deltaAic),
        weight: round(entry.weight),
        p: {
          ks: round(detail.tests?.ks?.p),
          ad: round(detail.tests?.ad?.p),
          cvm: round(detail.tests?.cvm?.p),
          chi2: round(detail.tests?.chi2?.p),
        },
        verdict: detail.converged === false ? '未收敛' : '',
      })
    }
  }

  if (!datasets.length) return null

  // The verdict wording lives in the panel; recompute it here from p-values so
  // the digest and the table always agree.
  for (const row of ranking) {
    if (row.verdict) continue
    const p = Object.values(row.p).filter((v) => v !== null)
    if (!p.length) {
      row.verdict = '无检验'
      continue
    }
    const failed = p.filter((v) => v < alpha).length
    row.verdict = failed === 0 ? '接受' : failed === p.length ? '拒绝' : '部分拒绝'
  }

  const warnings = (result.warnings ?? [])
    .map((w) => (typeof w === 'string' ? w : w?.reason))
    .filter(Boolean)
    .slice(0, 8)

  return {
    alpha: finite(alpha) ?? 0.05,
    tests: Array.isArray(result.testsUsed) ? result.testsUsed : Object.keys(ranking[0]?.p ?? { ks: 1, ad: 1, cvm: 1, chi2: 1 }),
    chosen: Array.isArray(chosen) ? chosen.slice(0, 40) : [],
    datasets,
    ranking,
    warnings,
  }
}
