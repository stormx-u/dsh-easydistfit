/**
 * scripts/engine-test-analyze.mjs — SPEC §2.7 self-tests, checks 4 and 5.
 *
 *   node scripts/engine-test-analyze.mjs
 *
 * Check 4: `analyze()` end-to-end on the bundled 3-column sample
 *          (木材 / 塑料 / 纤维, first 40 data rows of `src/client/ui/sample.js`)
 *          — rows for every family, finite AIC, sane ranking, aligned curves,
 *          histograms, ECDF, P-P/Q-Q, quantiles, optimal picks and the exact
 *          SPEC §2.6 result shape.
 * Check 5: KS p-value spot check: 200 seeded N(0,1) samples fitted as normal.
 *          (a) default asymptotic p is known to be conservative for composite
 *              hypotheses → mean p must be > 0.65 (measured ≈ 0.79);
 *          (b) a re-fitting parametric bootstrap (`refit` hook, the mechanism
 *              behind `analyze({ mcRefit: true })`) must be calibrated →
 *              mean p ∈ [0.4, 0.6].
 *
 * Exit code 1 on any failure. Uses `process` (allowed here — only `src/engine/**`
 * is restricted).
 */

import { analyze, DISTS, ksTest } from '../src/engine/index.js';
import { normCdf, normInv, mulberry32 } from '../src/engine/special.js';
import { SAMPLE_CSV } from '../src/client/ui/sample.js';

const failures = [];
let checks = 0;

function ok(cond, label, detail) {
  checks++;
  if (!cond) failures.push(detail === undefined ? label : `${label} — ${detail}`);
  return Boolean(cond);
}

function fmt(v, digits = 4) {
  if (v === null || v === undefined) return '—';
  if (typeof v !== 'number' || !Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  if (a !== 0 && (a >= 1e5 || a < 1e-3)) return v.toExponential(1);
  return String(Number(v.toPrecision(digits)));
}

function table(headers, rows, widths) {
  const line = (cells) => cells.map((c, i) => String(c).padEnd(widths[i])).join('  ');
  console.log('  ' + line(headers));
  console.log('  ' + line(widths.map((w) => '─'.repeat(w))));
  for (const r of rows) console.log('  ' + line(r));
}

/* ------------------------------------------------------------------ */
/* sample parsing (first 40 data rows of the bundled CSV)             */
/* ------------------------------------------------------------------ */

function parseFirstRows(csv, limit) {
  const lines = String(csv)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((l) => l.trim() !== '');
  const header = lines[0].split(',').map((s) => s.trim());
  const columns = header.map(() => []);
  const taken = Math.min(limit, lines.length - 1);
  for (let r = 1; r <= taken; r++) {
    const cells = lines[r].split(',');
    for (let c = 0; c < columns.length; c++) {
      const raw = (cells[c] ?? '').trim();
      // keep nulls so analyze() can report how many observations it dropped
      columns[c].push(raw === '' ? null : Number(raw));
    }
  }
  return header.map((name, i) => ({ name, values: columns[i] }));
}

function firstFinite(values) {
  for (const v of values) if (Number.isFinite(v)) return v;
  return null;
}

const SAMPLE = parseFirstRows(SAMPLE_CSV, 40);
const SAMPLE_EXPECT = SAMPLE.map((col) => {
  const finite = col.values.filter((v) => Number.isFinite(v));
  const mean = finite.reduce((s, v) => s + v, 0) / Math.max(1, finite.length);
  return {
    name: col.name,
    n: finite.length,
    removed: col.values.length - finite.length,
    first: firstFinite(col.values),
    min: Math.min(...finite),
    max: Math.max(...finite),
    mean,
  };
});

/* ------------------------------------------------------------------ */
/* check 4 — analyze end-to-end                                       */
/* ------------------------------------------------------------------ */

const familyIds = (Array.isArray(DISTS) ? DISTS : Object.values(DISTS || {})).map((d) => d.id);
const distById = new Map((Array.isArray(DISTS) ? DISTS : Object.values(DISTS || {})).map((d) => [d.id, d]));

console.log(`\n§2.7 check 4 — analyze() on ${SAMPLE.map((s) => s.name).join(' / ')} (first 40 rows)`);
console.log(`  families: ${familyIds.length} [${familyIds.join(', ')}]`);

const t0 = Date.now();
const result = analyze(SAMPLE, {
  dists: familyIds,
  tests: ['ks', 'ad', 'cvm', 'chi2'],
  alpha: 0.05,
  B: 0,
  bins: 0,
  seed: 20260101,
  maxDists: Math.max(32, familyIds.length),
  gridSize: 240,
});
const elapsed = Date.now() - t0;

/* --- exact result shape (SPEC §2.6) -------------------------------- */
const TOP_KEYS = [
  'datasets',
  'rows',
  'ranking',
  'histograms',
  'ecdf',
  'curves',
  'pp',
  'qq',
  'quantiles',
  'optimal',
  'warnings',
];
ok(JSON.stringify(Object.keys(result)) === JSON.stringify(TOP_KEYS), 'top-level keys exactly match SPEC §2.6', JSON.stringify(Object.keys(result)));
for (const k of ['datasets', 'rows', 'ranking', 'histograms', 'ecdf', 'curves', 'pp', 'qq', 'quantiles', 'optimal', 'warnings']) {
  ok(Array.isArray(result[k]), `result.${k} is an array`);
}
ok(result.datasets.length === 3, 'three datasets returned', result.datasets.length);
ok(result.ecdf.length === 3, 'three ECDF entries', result.ecdf.length);
ok(result.histograms.length === 3, 'three histograms', result.histograms.length);

ok(SAMPLE.length === 3, 'bundled sample has exactly 3 numeric columns', SAMPLE.length);
ok(
  SAMPLE.every((c) => c.values.length === 40),
  'the first 40 data rows of the bundled sample are used',
  SAMPLE.map((c) => c.values.length).join('/'),
);
ok(
  SAMPLE_EXPECT.every((e) => e.n >= 30),
  'every sample column has ≥ 30 finite observations',
  SAMPLE_EXPECT.map((e) => e.n).join('/'),
);

/* --- per-dataset statistics ---------------------------------------- */
console.log('\n  dataset statistics');
table(
  ['dataset', 'n', 'removed', 'mean', 'sd', 'cv', 'min', 'q1', 'median', 'q3', 'max', 'skew', 'kurt'],
  result.datasets.map((d) => [
    d.name,
    d.n,
    d.removed,
    fmt(d.stats.mean),
    fmt(d.stats.sd),
    fmt(d.stats.cv),
    fmt(d.stats.min),
    fmt(d.stats.q1),
    fmt(d.stats.median),
    fmt(d.stats.q3),
    fmt(d.stats.max),
    fmt(d.stats.skew),
    fmt(d.stats.kurt),
  ]),
  [8, 4, 7, 9, 8, 7, 8, 8, 9, 8, 9, 8, 8],
);

SAMPLE_EXPECT.forEach((exp, i) => {
  const ds = result.datasets[i];
  ok(ds && ds.name === exp.name, `dataset[${i}].name === ${exp.name}`, ds && ds.name);
  ok(ds && ds.n === exp.n, `${exp.name}: n === ${exp.n}`, ds && ds.n);
  ok(ds && ds.removed === exp.removed, `${exp.name}: removed === ${exp.removed}`, ds && ds.removed);
  ok(
    ds && ds.stats && ds.stats.min !== null && Number.isFinite(ds.stats.min),
    `${exp.name}: sample stats.min finite`,
    ds && ds.stats && ds.stats.min,
  );
  const statKeys = ['mean', 'sd', 'cv', 'min', 'max', 'q1', 'median', 'q3', 'skew', 'kurt', 'iqr'];
  ok(
    ds && JSON.stringify(Object.keys(ds.stats)) === JSON.stringify(statKeys),
    `${exp.name}: stats keys exactly match SPEC`,
    ds && JSON.stringify(Object.keys(ds.stats || {})),
  );
  ok(ds && ds.stats && ds.stats.min === exp.min, `${exp.name}: stats.min matches the parsed data`, ds && ds.stats && ds.stats.min);
  ok(ds && ds.stats && ds.stats.max === exp.max, `${exp.name}: stats.max matches the parsed data`, ds && ds.stats && ds.stats.max);
  ok(ds && ds.stats && Math.abs(ds.stats.mean - exp.mean) < 1e-9, `${exp.name}: stats.mean matches the parsed data`);
  if (ds && ds.stats && ds.stats.q1 !== null) {
    ok(ds.stats.q1 <= ds.stats.median && ds.stats.median <= ds.stats.q3, `${exp.name}: q1 ≤ median ≤ q3`);
  }
});

/* --- rows: every family, finite AIC where converged ---------------- */
for (const exp of SAMPLE_EXPECT) {
  const rows = result.rows.filter((r) => r.dataset === exp.name);
  const ids = new Set(rows.map((r) => r.distId));
  ok(ids.size === familyIds.length, `${exp.name}: rows cover every family`, `${ids.size}/${familyIds.length}`);
  for (const id of familyIds) ok(ids.has(id), `${exp.name}: row for family ${id}`);
}
ok(
  result.rows.every((r) => typeof r.distId === 'string' && typeof r.distName === 'string'),
  'rows have distId + distName',
);
ok(
  result.rows.every((r) => typeof r.converged === 'boolean' && Number.isInteger(r.k) && r.k >= 1),
  'rows have boolean converged + integer k ≥ 1',
);

const convergedRows = result.rows.filter((r) => r.converged);
ok(convergedRows.length >= familyIds.length * 2, 'most fits converged', `${convergedRows.length}/${result.rows.length}`);
for (const r of convergedRows) {
  ok(Number.isFinite(r.aic), `${r.dataset}/${r.distId}: converged ⇒ finite AIC`, r.aic);
  ok(Number.isFinite(r.bic), `${r.dataset}/${r.distId}: converged ⇒ finite BIC`, r.bic);
  ok(Math.abs(r.aic - (2 * r.k - 2 * r.loglik)) < 1e-9, `${r.dataset}/${r.distId}: AIC = 2k − 2ℓ`);
  ok(Number.isFinite(r.loglik), `${r.dataset}/${r.distId}: finite loglik`);
  ok(r.params && typeof r.params === 'object', `${r.dataset}/${r.distId}: params object`);
  ok(typeof r.paramsText === 'string' && r.paramsText.length > 0, `${r.dataset}/${r.distId}: non-empty paramsText`);
  const spec = distById.get(r.distId);
  ok(
    spec && JSON.stringify(Object.keys(r.params).sort()) === JSON.stringify([...(spec.paramNames || [])].sort()),
    `${r.dataset}/${r.distId}: params keys match dist.paramNames`,
    JSON.stringify(Object.keys(r.params)),
  );
  ok(
    Object.values(r.params).every((v) => Number.isFinite(v)),
    `${r.dataset}/${r.distId}: every fitted parameter is finite`,
  );
  ok(Object.keys(r.tests).length > 0, `${r.dataset}/${r.distId}: at least one test ran`);
  for (const [tid, t] of Object.entries(r.tests)) {
    ok(
      Number.isFinite(t.stat) && Number.isFinite(t.p) && Number.isFinite(t.crit) && typeof t.pass === 'boolean' && ['asymptotic', 'mc'].includes(t.method),
      `${r.dataset}/${r.distId}: tests.${tid} well-formed`,
      JSON.stringify(t),
    );
    ok(t.p >= 0 && t.p <= 1, `${r.dataset}/${r.distId}: tests.${tid}.p ∈ [0,1]`, t.p);
    ok(Number.isNaN(t.stat) === false, `${r.dataset}/${r.distId}: tests.${tid}.stat available`);
  }
}
ok(
  result.rows.every((r) => Object.values(r.tests).every((t) => t !== undefined && t !== null)),
  'rows[].tests holds only executed tests (no undefined placeholders)',
);
for (const name of ['木材', '塑料', '纤维']) {
  const tests = result.rows.filter((r) => r.dataset === name && r.converged).map((r) => r.tests);
  ok(
    tests.every((t) => ['ks', 'ad', 'cvm', 'chi2'].every((id) => t[id] === undefined || (Number.isFinite(t[id].p) && t[id].method))),
    `${name}: each requested test present only when it ran`,
  );
}

/* --- ranking -------------------------------------------------------- */
console.log('\n  AIC ranking (top 3 per dataset)');
const rankRows = [];
for (const exp of SAMPLE_EXPECT) {
  const rank = result.ranking.filter((r) => r.dataset === exp.name);
  ok(rank.length === convergedRows.filter((r) => r.dataset === exp.name).length, `${exp.name}: ranking covers every converged row`);
  ok(rank[0] && rank[0].deltaAic === 0, `${exp.name}: best ΔAIC = 0`, rank[0] && rank[0].deltaAic);
  ok(rank[0] && rank[0].rank === 1, `${exp.name}: best rank = 1`);
  let wsum = 0;
  rank.forEach((r, i) => {
    wsum += r.weight;
    ok(r.rank === i + 1, `${exp.name}: ranking rank sequence`, `[${i}] ${r.rank}`);
    if (i > 0) {
      ok(r.aic >= rank[i - 1].aic, `${exp.name}: AIC ascending at rank ${i + 1}`);
      ok(r.deltaAic >= 0, `${exp.name}: ΔAIC ≥ 0 at rank ${i + 1}`);
      ok(r.weight <= rank[i - 1].weight + 1e-12, `${exp.name}: weight non-increasing at rank ${i + 1}`);
    }
    ok(r.weight >= 0 && r.weight <= 1, `${exp.name}: weight ∈ [0,1]`, r.weight);
  });
  ok(Math.abs(wsum - 1) < 1e-9, `${exp.name}: Akaike weights sum to 1`, wsum);
  const opt = result.optimal.find((r) => r.dataset === exp.name);
  ok(opt && opt.distId === rank[0].distId, `${exp.name}: optimal = ranking #1`, opt && opt.distId);
  ok(opt && Math.abs(opt.aic - rank[0].aic) < 1e-12, `${exp.name}: optimal AIC matches`);
  for (const r of rank.slice(0, 3)) {
    rankRows.push([exp.name, r.rank, r.distId, fmt(r.aic), fmt(r.deltaAic), fmt(r.weight, 3)]);
  }
}
table(['dataset', 'rank', 'distId', 'AIC', 'ΔAIC', 'weight'], rankRows, [8, 4, 12, 10, 9, 8]);

/* --- curves --------------------------------------------------------- */
for (const exp of SAMPLE_EXPECT) {
  const curved = result.curves.filter((c) => c.dataset === exp.name);
  const convIds = result.rows.filter((r) => r.dataset === exp.name && r.converged).map((r) => r.distId);
  ok(curved.length === convIds.length, `${exp.name}: one curve per converged family`, `${curved.length}/${convIds.length}`);
  ok(curved.every((c) => c.x.length === 240), `${exp.name}: curves have gridSize = 240 points`);
  const refX = JSON.stringify(curved[0]?.x || []);
  ok(curved.every((c) => JSON.stringify(c.x) === refX), `${exp.name}: every curve shares the same x grid`);
  const x = curved[0]?.x || [];
  ok(x.length > 1 && x[0] < x[x.length - 1], `${exp.name}: grid ascending`);
  ok(x[0] < exp.first || exp.first <= x[x.length - 1], `${exp.name}: grid covers the data`);
  const topId = (result.ranking.find((r) => r.dataset === exp.name) || {}).distId;
  for (const c of curved) {
    ok(c.pdf.length === c.x.length && c.cdf.length === c.x.length, `${exp.name}/${c.distId}: pdf/cdf match grid length`);
    const pdfFinite = c.pdf.filter((v) => Number.isFinite(v));
    ok(pdfFinite.length >= c.x.length * 0.9, `${exp.name}/${c.distId}: pdf finite on ≥90% of grid`, `${pdfFinite.length}/${c.x.length}`);
    ok(pdfFinite.every((v) => v >= 0), `${exp.name}/${c.distId}: pdf ≥ 0`);
    const cdfs = c.cdf.filter((v) => Number.isFinite(v));
    ok(cdfs.length >= c.x.length * 0.9, `${exp.name}/${c.distId}: cdf finite on ≥90% of grid`);
    ok(
      cdfs.every((v) => v >= 0 && v <= 1),
      `${exp.name}/${c.distId}: cdf values ∈ [0,1]`,
    );
    let mono = true;
    for (let i = 1; i < cdfs.length; i++) if (cdfs[i] + 1e-9 < cdfs[i - 1]) mono = false;
    ok(mono, `${exp.name}/${c.distId}: cdf monotone non-decreasing`);
    if (c.distId === topId) {
      // the chosen family should actually explain the observed range
      ok(
        Math.min(...cdfs) <= 0.1 && Math.max(...cdfs) >= 0.9,
        `${exp.name}: top family ${c.distId} cdf spans the plotted range`,
        `${fmt(Math.min(...cdfs))}→${fmt(Math.max(...cdfs))}`,
      );
    }
  }
}

/* --- histogram / ECDF ---------------------------------------------- */
for (const exp of SAMPLE_EXPECT) {
  const h = result.histograms.find((e) => e.dataset === exp.name);
  ok(h && Array.isArray(h.bins) && h.bins.length >= 5 && h.bins.length <= 60, `${exp.name}: histogram 5…60 bins`, h && h.bins.length);
  const total = h.bins.reduce((s, b) => s + b.count, 0);
  ok(total === exp.n, `${exp.name}: histogram counts sum to n`, `${total}/${exp.n}`);
  const mass = h.bins.reduce((s, b) => s + b.density * (b.x1 - b.x0), 0);
  ok(Math.abs(mass - 1) < 1e-9, `${exp.name}: histogram density integrates to 1`, mass);
  ok(h.n === exp.n, `${exp.name}: histogram.n === n`, h && h.n);

  const e = result.ecdf.find((v) => v.dataset === exp.name);
  ok(e && e.x.length === exp.n + 1 && e.y.length === exp.n + 1, `${exp.name}: ECDF has n+1 points`);
  ok(e && e.y[0] === 0 && Math.abs(e.y[e.y.length - 1] - 1) < 1e-12, `${exp.name}: ECDF runs 0 → 1`);
  let mono = true;
  for (let i = 1; i < e.y.length; i++) if (e.y[i] + 1e-12 < e.y[i - 1]) mono = false;
  ok(mono, `${exp.name}: ECDF monotone`);
}

/* --- P-P / Q-Q / quantiles ----------------------------------------- */
for (const exp of SAMPLE_EXPECT) {
  const convIds = result.rows.filter((r) => r.dataset === exp.name && r.converged).map((r) => r.distId);
  const pp = result.pp.filter((p) => p.dataset === exp.name);
  const qq = result.qq.filter((p) => p.dataset === exp.name);
  const qz = result.quantiles.filter((p) => p.dataset === exp.name);
  ok(pp.length === convIds.length, `${exp.name}: one P-P set per converged family`, `${pp.length}/${convIds.length}`);
  ok(qq.length === convIds.length, `${exp.name}: one Q-Q set per converged family`);
  ok(qz.length === convIds.length, `${exp.name}: one quantile set per converged family`);
  for (const p of pp) {
    ok(p.points.length === exp.n, `${exp.name}/${p.distId}: P-P point count`);
    ok(p.points.every((pt) => pt.theoretical >= 0 && pt.theoretical <= 1 && pt.empirical > 0 && pt.empirical <= 1), `${exp.name}/${p.distId}: P-P values in range`);
  }
  for (const p of qq) {
    ok(p.points.length === exp.n, `${exp.name}/${p.distId}: Q-Q point count`);
    ok(p.points.every((pt) => pt.sample !== null && typeof pt.sample === 'number'), `${exp.name}/${p.distId}: Q-Q sample values`);
  }
  for (const q of qz) {
    ok(
      JSON.stringify(q.probs) === JSON.stringify([0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99]),
      `${exp.name}/${q.distId}: quantile probs match SPEC`,
    );
    ok(q.values.length === 7, `${exp.name}/${q.distId}: 7 quantile values`);
    const finite = q.values.filter((v) => Number.isFinite(v));
    ok(finite.length >= 6, `${exp.name}/${q.distId}: quantiles mostly finite`, finite.length);
    let mono = true;
    for (let i = 1; i < q.values.length; i++) {
      if (Number.isFinite(q.values[i]) && Number.isFinite(q.values[i - 1]) && q.values[i] < q.values[i - 1] - 1e-9) mono = false;
    }
    ok(mono, `${exp.name}/${q.distId}: quantiles non-decreasing`);
  }
}

ok(Array.isArray(result.warnings), 'warnings is an array');
ok(
  result.warnings.every((w) => w && typeof w.dataset === 'string' && typeof w.reason === 'string' && (w.distId === null || typeof w.distId === 'string')),
  'warnings entries are {dataset, distId|null, reason}',
);
console.log(`\n  ${result.rows.length} rows, ${result.ranking.length} ranked, ${result.curves.length} curves, ${result.warnings.length} warnings · ${elapsed} ms`);
for (const w of result.warnings.slice(0, 5)) console.log(`  warning: ${w.dataset} · ${w.distId ?? '（全部）'}：${w.reason}`);
if (result.warnings.length > 5) console.log(`  … ${result.warnings.length - 5} more warnings`);

/* --- cleaning contract: non-finite values are dropped and counted --- */
const dirty = analyze(
  [{ name: 'dirty', values: [1, null, 2, NaN, 3, Infinity, 4, 5, 6, 7] }],
  { dists: ['normal'], tests: [], gridSize: 60 },
);
ok(dirty.datasets[0].n === 7, 'non-finite values dropped when cleaning', dirty.datasets[0].n);
ok(dirty.datasets[0].removed === 3, 'dropped values counted in `removed`', dirty.datasets[0].removed);
ok(dirty.warnings.length >= 0 && Array.isArray(dirty.warnings), 'cleaning keeps the warnings array');

/* ------------------------------------------------------------------ */
/* check 5 — KS p-value calibration                                   */
/* ------------------------------------------------------------------ */

console.log('\n§2.7 check 5 — KS p-value: 200 seeded N(0,1) samples fitted as normal');

/** Analytic normal fit (closed-form MLE) — only used to build the refit null. */
function fitNormal(xs) {
  const n = xs.length;
  let s = 0;
  for (const v of xs) s += v;
  const m = s / n;
  let ss = 0;
  for (const v of xs) ss += (v - m) * (v - m);
  const sd = Math.sqrt(ss / (n - 1));
  return {
    cdf: (v) => normCdf((v - m) / sd),
    quantile: (p) => m + sd * normInv(p),
  };
}

const N_SAMPLES = 200;
const N_OBS = 100;
const mcB = 200;
const rng = mulberry32(20260101);

let sumPDefault = 0;
let sumPRefit = 0;
let mcMethods = 0;
let rejectedDefault = 0;
for (let s = 0; s < N_SAMPLES; s++) {
  const xs = new Array(N_OBS);
  for (let i = 0; i < N_OBS; i++) xs[i] = rng.nextGauss();
  xs.sort((a, b) => a - b);
  const fit = fitNormal(xs);
  const cdfFn = fit.cdf;

  const base = ksTest(xs, cdfFn, { k: 2, alpha: 0.05, B: 0 });
  sumPDefault += base.p;
  if (!base.pass) rejectedDefault++;

  const mc = ksTest(xs, cdfFn, {
    k: 2,
    alpha: 0.05,
    B: mcB,
    seed: 20260101 + s,
    quantileFn: fit.quantile,
    refit: (simSorted) => fitNormal(simSorted).cdf,
  });
  if (mc.method === 'mc') mcMethods++;
  sumPRefit += mc.p;
}

const meanDefault = sumPDefault / N_SAMPLES;
const meanRefit = sumPRefit / N_SAMPLES;

table(
  ['KS variant', 'mean p', 'verdict', 'expected'],
  [
    ['asymptotic (no refit)', fmt(meanDefault, 3), meanDefault > 0.65 ? 'ok (conservative)' : 'FAIL', '> 0.65'],
    ['MC with refit', fmt(meanRefit, 3), meanRefit >= 0.4 && meanRefit <= 0.6 ? 'ok (calibrated)' : 'FAIL', '0.4 … 0.6'],
  ],
  [24, 10, 20, 12],
);

ok(meanDefault > 0.65, 'default asymptotic KS p is conservative (mean p > 0.65)', fmt(meanDefault, 4));
ok(meanRefit >= 0.4 && meanRefit <= 0.6, 'refit-MC KS p is calibrated (0.4 ≤ mean p ≤ 0.6)', fmt(meanRefit, 4));
ok(mcMethods === N_SAMPLES, 'every MC call reports method:"mc"', `${mcMethods}/${N_SAMPLES}`);
ok(rejectedDefault <= N_SAMPLES * 0.1, 'asymptotic KS rarely rejects N(0,1) data', `${rejectedDefault}/200 rejected`);

/* (c) plumbing smoke: `analyze({ mcRefit: true })` really routes MC through re-fits */
const smokeN = 12;
const smokeB = 60;
const smokeRng = mulberry32(424242);
let smokeMc = 0;
let smokeMean = 0;
for (let s = 0; s < smokeN; s++) {
  const xs = new Array(80);
  for (let i = 0; i < xs.length; i++) xs[i] = smokeRng.nextGauss();
  const res = analyze([{ name: 'smoke', values: xs }], {
    dists: ['normal'],
    tests: ['ks'],
    alpha: 0.05,
    B: smokeB,
    bins: 0,
    seed: 900 + s,
    maxDists: 1,
    gridSize: 40,
    mcRefit: true,
  });
  const t = res.rows[0] && res.rows[0].tests && res.rows[0].tests.ks;
  if (t && t.method === 'mc' && Number.isFinite(t.p)) {
    smokeMc++;
    smokeMean += t.p;
  }
}
ok(smokeMc === smokeN, 'analyze({mcRefit:true}) routes KS through MC', `${smokeMc}/${smokeN}`);
ok(
  smokeMc === smokeN && smokeMean / smokeN > 0.2 && smokeMean / smokeN < 0.8,
  'analyze({mcRefit:true}) p is roughly calibrated (0.2…0.8 at n=12)',
  fmt(smokeMean / Math.max(1, smokeMc), 3),
);

/* ------------------------------------------------------------------ */
/* summary                                                            */
/* ------------------------------------------------------------------ */

console.log('');
if (failures.length) {
  console.log(`FAIL — ${checks} checks, ${failures.length} failed`);
  for (const f of failures) console.log('  ✗ ' + f);
  process.exit(1);
} else {
  console.log(`PASS — ${checks} checks green`);
}
