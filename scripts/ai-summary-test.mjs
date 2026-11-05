/**
 * DistFit — AI digest contract test.
 *
 * The panel only shows its AI card when `buildAiSummary` returns a digest, and
 * the host prompt only produces a useful answer when that digest actually
 * carries numbers. This test runs the real engine over the bundled demo data and
 * pins the digest shape the host route consumes, so the two halves cannot drift
 * apart again (the first version read a non-existent `result.stats` array and
 * silently produced `null`).
 */
import { analyze } from '../src/engine/index.js'
import { buildAiSummary } from '../src/client/ui/aiSummary.js'
import { SAMPLE_CSV } from '../src/client/ui/sample.js'

let failures = 0
const check = (name, ok, detail = '') => {
  if (ok) console.log(`ok   ${name}`)
  else {
    failures += 1
    console.error(`FAIL ${name}${detail ? ` - ${detail}` : ''}`)
  }
}

/** Mirror of the panel's CSV parser (`parseTable` in `App.jsx`). */
function parseTable(text) {
  const lines = text.trim().split(/\r?\n/).filter((line) => line.trim())
  const names = lines[0].split(',').map((cell) => cell.trim())
  const values = names.map(() => [])
  for (const line of lines.slice(1)) {
    line.split(',').forEach((cell, index) => {
      const value = Number(cell)
      if (cell.trim() !== '' && Number.isFinite(value)) values[index]?.push(value)
    })
  }
  return { columns: names.map((name, index) => ({ name, values: values[index] })) }
}

const table = parseTable(SAMPLE_CSV)
const chosen = ['normal', 'lognormal', 'gamma', 'weibull', 'gev', 'gumbel']
const result = analyze(table.columns, { dists: chosen, tests: ['ks', 'ad', 'cvm', 'chi2'], alpha: 0.05 })
const summary = buildAiSummary(result, table.columns, chosen, 0.05)

check('digest is not null', summary !== null)
check('digest covers every dataset', summary?.datasets?.length === result.datasets.length, String(summary?.datasets?.length))
check('digest ranks families', (summary?.ranking?.length ?? 0) >= 6, String(summary?.ranking?.length))
check('digest carries alpha', summary?.alpha === 0.05, String(summary?.alpha))
check('digest carries candidate ids', summary?.chosen?.length === chosen.length, String(summary?.chosen?.length))
check(
  'every dataset has descriptive stats',
  (summary?.datasets ?? []).every((dataset) => Number.isFinite(dataset.stats?.mean) && Number.isFinite(dataset.stats?.sd)),
  JSON.stringify(summary?.datasets?.[0]),
)
check(
  'every ranking row has AIC and p-values',
  (summary?.ranking ?? []).every(
    (row) => Number.isFinite(row.aic) && typeof row.dist === 'string' && row.dist.length > 0 && row.p && typeof row.p === 'object',
  ),
  JSON.stringify(summary?.ranking?.[0]),
)
check(
  'every ranking row has a verdict',
  (summary?.ranking ?? []).every((row) => ['接受', '部分拒绝', '拒绝', '无检验', '未收敛'].includes(row.verdict)),
  JSON.stringify((summary?.ranking ?? []).map((row) => row.verdict)),
)
check(
  'every dataset carries the shape evidence the model needs',
  (summary?.datasets ?? []).every(
    (dataset) =>
      dataset.quantiles &&
      Number.isFinite(dataset.quantiles.p1) &&
      Number.isFinite(dataset.quantiles.p50) &&
      Array.isArray(dataset.histogram) &&
      dataset.histogram.length >= 5 &&
      dataset.histogram.every((bin) => Number.isFinite(bin.lo) && Number.isFinite(bin.hi) && Number.isFinite(bin.n)) &&
      dataset.best &&
      typeof dataset.best.dist === 'string' &&
      dataset.best.family &&
      typeof dataset.best.family.support === 'string' &&
      dataset.best.ppDeviation &&
      Number.isFinite(dataset.best.ppDeviation.maxDev),
  ),
  JSON.stringify(summary?.datasets?.[0]?.best),
)
check(
  'empirical quantiles stay ordered',
  (summary?.datasets ?? []).every((dataset) => {
    const q = dataset.quantiles ?? {}
    return q.p1 <= q.p5 && q.p5 <= q.p25 && q.p25 <= q.p50 && q.p50 <= q.p75 && q.p75 <= q.p95 && q.p95 <= q.p99
  }),
  JSON.stringify((summary?.datasets ?? []).map((dataset) => dataset.quantiles)),
)
check(
  'every ranking row names its support',
  (summary?.ranking ?? []).every((row) => ['real', 'positive', 'bounded'].includes(row.family?.support)),
  JSON.stringify((summary?.ranking ?? []).map((row) => row.family?.support)),
)
check(
  'best-fit pp deviation points at a quantile',
  (summary?.datasets ?? []).every((dataset) => Number.isFinite(dataset.best?.ppDeviation?.atQuantile)),
  JSON.stringify((summary?.datasets ?? []).map((dataset) => dataset.best?.ppDeviation)),
)
check(
  'digest stays small enough to ship to a model',
  JSON.stringify(summary).length < 24 * 1024,
  String(JSON.stringify(summary).length),
)
check('empty result yields no digest', buildAiSummary({ rows: [], datasets: [] }, table.columns, chosen, 0.05) === null)

console.log('')
if (failures) {
  console.error(`FAILED (${failures})`)
  process.exitCode = 1
} else {
  console.log('PASS - AI digest matches what the host prompt consumes')
}
