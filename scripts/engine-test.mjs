/**
 * dsh-distfit engine self-test  (SPEC §2.7 checks 1–3)
 *
 *   node scripts/engine-test.mjs
 *
 * Check 1  every family: pdf integrates to 1, cdf monotone 0→1,
 *          quantile(cdf(x)) = x round-trip, pdf ≥ 0.
 * Check 2  special functions against published values; optimisers behave.
 * Check 3  fit() recovers the generating parameters from 400 seeded samples,
 *          per-family documented tolerances; loglik == Σ log pdf.
 *
 * Prints a compact table and exits 1 on the first failing family / on any
 * assertion failure.  Only imports the engine modules.
 */
import { DISTS, getDist } from '../src/engine/distributions.js'
import {
  lgamma,
  erf,
  erfc,
  gammaIncompleteP,
  gammaIncompleteQ,
  betaIncomplete,
  normInv,
  digamma,
  trigamma,
  log1mexp,
  mulberry32,
  brentMin,
  nelderMead,
  bisect,
} from '../src/engine/special.js'

let failures = 0
const fail = (where, msg) => {
  failures += 1
  if (failures <= 40) console.log(`  FAIL  [${where}] ${msg}`)
}

const fmt = (v) => (typeof v === 'number' ? String(Number(v.toPrecision(5))) : String(v))

/* ================================================================== *
 * Registry vs SPEC §2.3 (the table lists 23 rows: 13 ported + 10 new)
 * ================================================================== */

const EXPECT = [
  ['normal', '正态分布', '位置-尺度型', 2, 'real', ['mu', 'sigma']],
  ['logistic', 'Logistic 分布', '位置-尺度型', 2, 'real', ['mu', 's']],
  ['laplace', 'Laplace 分布', '位置-尺度型', 2, 'real', ['mu', 'b']],
  ['cauchy', 'Cauchy 分布', '位置-尺度型', 2, 'real', ['x0', 'gamma']],
  ['uniform', '均匀分布', '有界型', 2, 'real', ['a', 'b']],
  ['lognormal', '对数正态分布', '正偏寿命型', 2, 'positive', ['mu', 'sigma']],
  ['gamma', 'Gamma 分布', '正偏寿命型', 2, 'positive', ['alpha', 'beta']],
  ['weibull', 'Weibull 分布', '正偏寿命型', 2, 'positive', ['k', 'lambda']],
  ['exponential', '指数分布', '正偏寿命型', 1, 'positive', ['lambda']],
  ['rayleigh', 'Rayleigh 分布', '正偏寿命型', 1, 'positive', ['sigma']],
  ['invgauss', '逆高斯分布', '正偏寿命型', 2, 'positive', ['mu', 'lambda']],
  ['loglogistic', '对数 Logistic', '正偏寿命型', 2, 'positive', ['c', 'lambda']],
  ['lomax', 'Lomax 分布 (Pareto II)', '正偏寿命型', 2, 'positive', ['alpha', 'lambda']],
  ['burr', 'Burr XII 分布', '正偏寿命型', 3, 'positive', ['c', 'k', 'lambda']],
  ['fatiguelife', '疲劳寿命分布 (BS)', '正偏寿命型', 2, 'positive', ['beta', 'c']],
  ['nakagami', 'Nakagami 分布', '正偏寿命型', 2, 'positive', ['nu', 'omega']],
  ['maxwell', 'Maxwell 分布', '正偏寿命型', 1, 'positive', ['a']],
  ['chi2', '卡方分布', '正偏寿命型', 1, 'positive', ['df']],
  ['halfnormal', '半正态分布', '正偏寿命型', 1, 'positive', ['sigma']],
  ['beta', 'Beta 分布', '有界型', 4, 'real', ['a', 'b', 'loc', 'scale']],
  ['gumbel', '极值 I 型 (Gumbel)', '极值型', 2, 'real', ['beta', 'alpha']],
  ['gev', '广义极值 (GEV)', '极值型', 3, 'real', ['xi', 'mu', 'sigma']],
  ['gpd', '广义帕累托 (GPD)', '极值型', 3, 'real', ['xi', 'mu', 'sigma']],
]

function checkRegistry() {
  console.log('check 1a  registry vs SPEC §2.3 table')
  if (DISTS.length !== EXPECT.length) {
    fail('registry', `expected ${EXPECT.length} families, got ${DISTS.length}`)
  }
  for (let i = 0; i < Math.min(DISTS.length, EXPECT.length); i++) {
    const d = DISTS[i]
    const [id, name, group, k, support, names] = EXPECT[i]
    if (d.id !== id) fail('registry', `row ${i}: id ${d.id} != ${id}`)
    if (d.name !== name) fail(id, `name "${d.name}" != "${name}"`)
    if (d.group !== group) fail(id, `group "${d.group}" != "${group}"`)
    if (d.k !== k) fail(id, `k ${d.k} != ${k}`)
    if (d.support !== support) fail(id, `support "${d.support}" != "${support}"`)
    if (JSON.stringify(d.paramNames) !== JSON.stringify(names)) {
      fail(id, `paramNames ${JSON.stringify(d.paramNames)} != ${JSON.stringify(names)}`)
    }
    if (!Array.isArray(d.params) || d.params.length !== k) {
      fail(id, `params metadata should have ${k} entries`)
    } else {
      for (let j = 0; j < k; j++) {
        const p = d.params[j]
        if (p.name !== names[j]) fail(id, `params[${j}].name ${p.name} != ${names[j]}`)
        if (typeof p.label !== 'string' || !p.label.length) fail(id, `params[${j}] missing label`)
      }
    }
    for (const f of ['pdf', 'cdf', 'quantile', 'initial', 'fit']) {
      if (typeof d[f] !== 'function') fail(id, `missing ${f}()`)
    }
  }
  const ids = new Set(DISTS.map((d) => d.id))
  if (ids.size !== DISTS.length) fail('registry', 'duplicate family ids')
  for (const id of ids) if (getDist(id) !== DISTS.find((d) => d.id === id)) fail('registry', `getDist(${id}) mismatch`)
  return EXPECT.length
}

/* ================================================================== *
 * Numeric helpers
 * ================================================================== */

function simpson(f, a, b, n) {
  const h = (b - a) / n
  let s = f(a) + f(b)
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2)
  return (h / 3) * s
}

function sampleStats(xs) {
  const n = xs.length
  let m = 0
  for (const v of xs) m += v
  m /= n
  let v = 0
  for (const x of xs) v += (x - m) * (x - m)
  return { n, mean: m, sd: Math.sqrt(v / n) }
}

/* ================================================================== *
 * Check 1: pdf integrates to 1, cdf monotone, quantile round-trip
 * ================================================================== */

const TEST_PARAMS = {
  normal: { mu: 5, sigma: 2 },
  logistic: { mu: 5, s: 1.5 },
  laplace: { mu: 5, b: 1.2 },
  cauchy: { x0: 5, gamma: 1.5 },
  uniform: { a: 2, b: 8 },
  lognormal: { mu: 1.2, sigma: 0.6 },
  gamma: { alpha: 2.5, beta: 2 },
  weibull: { k: 2, lambda: 5 },
  exponential: { lambda: 3 },
  rayleigh: { sigma: 2 },
  invgauss: { mu: 3, lambda: 8 },
  loglogistic: { c: 2, lambda: 4 },
  lomax: { alpha: 3, lambda: 2 },
  burr: { c: 2, k: 2.5, lambda: 3 },
  fatiguelife: { beta: 4, c: 0.8 },
  nakagami: { nu: 2.5, omega: 9 },
  maxwell: { a: 2 },
  chi2: { df: 4 },
  halfnormal: { sigma: 2 },
  beta: { a: 2.5, b: 4, loc: 0, scale: 10 },
  gumbel: { beta: 5, alpha: 2 },
  gev: { xi: 0.1, mu: 5, sigma: 2 },
  gpd: { xi: 0.2, mu: 2, sigma: 3 },
}

// Tail cut-off used by the Simpson integration.  Heavy-tailed families need a
// larger eps so that the plain (uniform-grid) Simpson rule stays accurate.
const EPS = {
  cauchy: 1e-3,
  gev: 1e-6,
  gpd: 1e-6,
  lomax: 1e-6,
}
const INT_N = 20000
const INT_TOL = 5e-4

function check1() {
  console.log('check 1b  pdf/cdf/quantile consistency')
  const rows = []
  for (const d of DISTS) {
    const p = TEST_PARAMS[d.id]
    const eps = EPS[d.id] || 1e-6
    let lo = d.quantile(eps, p)
    const hi = d.quantile(1 - eps, p)
    if (d.support === 'positive') lo = 0
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || !(hi > lo)) {
      fail(d.id, `bad integration bounds [${lo}, ${hi}]`)
      continue
    }
    // pdf sanity + Simpson integral
    let nonNeg = true
    const f = (x) => {
      const v = d.pdf(x, p)
      if (!(v >= 0) || Number.isNaN(v)) nonNeg = false
      return v
    }
    const integral = simpson(f, lo, hi, INT_N)
    const expected = 1 - 2 * eps
    if (!nonNeg) fail(d.id, 'pdf produced negative or NaN values')
    if (Math.abs(integral - expected) > INT_TOL) {
      fail(d.id, `∫pdf = ${integral.toFixed(8)}, expected ${expected.toFixed(8)} (±${INT_TOL})`)
    }
    // cdf monotone + range
    const M = 400
    let mono = true
    let prev = -Infinity
    let fLo = NaN
    let fHi = NaN
    for (let i = 0; i <= M; i++) {
      const x = lo + ((hi - lo) * i) / M
      const c = d.cdf(x, p)
      if (!(c >= 0 && c <= 1) || Number.isNaN(c)) fail(d.id, `cdf out of [0,1] at x=${fmt(x)}: ${c}`)
      if (c < prev - 1e-12) mono = false
      prev = c
      if (i === 0) fLo = c
      if (i === M) fHi = c
    }
    if (!mono) fail(d.id, 'cdf is not monotone')
    if (Math.abs(fLo - eps) > 20 * eps + 1e-6) fail(d.id, `cdf(lo)=${fmt(fLo)} vs ${eps}`)
    if (Math.abs(fHi - (1 - eps)) > 20 * eps + 1e-6) fail(d.id, `cdf(hi)=${fmt(fHi)} vs ${1 - eps}`)
    // quantile(cdf(x)) ≈ x for interior probabilities
    let rtErr = 0
    for (let k = 1; k < 50; k++) {
      const q = k / 50
      const x = d.quantile(q, p)
      const back = d.cdf(x, p)
      rtErr = Math.max(rtErr, Math.abs(back - q))
      // and the other direction, measured relative to the data scale
      if (q >= 0.1 && q <= 0.9) {
        const back2 = d.quantile(d.cdf(x, p), p)
        const scale = Math.max(Math.abs(hi - lo), 1e-12)
        rtErr = Math.max(rtErr, Math.abs(back2 - x) / scale)
      }
    }
    if (!(rtErr <= 1e-6)) fail(d.id, `quantile∘cdf round-trip error ${rtErr.toExponential(2)} > 1e-6`)
    rows.push([d.id, integral, rtErr])
  }
  console.log('  pdf integral = 1 (Simpson), cdf monotone, quantile round-trip')
  for (const [id, integral, rtErr] of rows) {
    if (!failures) console.log(`    ${id.padEnd(12)} ∫pdf=${integral.toFixed(9)}  round-trip=${rtErr.toExponential(1)}`)
  }
  return rows.length
}

/* ================================================================== *
 * Check 2: special functions + optimisers
 * ================================================================== */

function close(where, got, want, tol, rel = false) {
  const err = rel ? Math.abs(got - want) / Math.max(1e-300, Math.abs(want)) : Math.abs(got - want)
  if (!(err <= tol)) fail(where, `got ${fmt(got)}, want ${fmt(want)} (err ${err.toExponential(2)} > ${tol})`)
  return err
}

function check2() {
  console.log('check 2   special functions / optimisers')
  const LN_SQRT_PI = 0.5 * Math.log(Math.PI)
  close('lgamma(0.5)', lgamma(0.5), LN_SQRT_PI, 1e-13)
  close('lgamma(5)', lgamma(5), Math.log(24), 1e-13)
  close('lgamma(100)', lgamma(100), 359.1342053695754, 1e-13, true)
  close('lgamma(-0.5)', lgamma(-0.5), 1.2655121234846454, 1e-11)
  close('erf(1)', erf(1), 0.8427007929497149, 1e-14)
  close('erfc(1)', erfc(1), 0.15729920705028513, 1e-14)
  close('erf+erfc', erf(0.7) + erfc(0.7), 1, 1e-15)
  close('P(2,3)', gammaIncompleteP(2, 3), 0.8008517265285442, 1e-13)
  close('Q(2,3)', gammaIncompleteQ(2, 3), 0.19914827347145578, 1e-13)
  close('I(2,3;0.5)', betaIncomplete(2, 3, 0.5), 0.6875, 1e-13)
  close('I(.5,.5;.25)', betaIncomplete(0.5, 0.5, 0.25), 1 / 3, 1e-13)
  close('normInv(0.975)', normInv(0.975), 1.959963984540054, 1e-13)
  close('normInv(0.5)', normInv(0.5), 0, 1e-15)
  close('normInv(0.025)', normInv(0.025), -1.959963984540054, 1e-13)
  close('digamma(1)', digamma(1), -0.5772156649015329, 1e-10)
  close('trigamma(1)', trigamma(1), (Math.PI * Math.PI) / 6, 1e-9)
  close('log1mexp(-1)', log1mexp(-1), Math.log(1 - Math.exp(-1)), 1e-15)

  // RNG: deterministic, uniform, Gaussian moments
  const a = mulberry32(12345)
  const b = mulberry32(12345)
  let same = true
  for (let i = 0; i < 100; i++) if (a() !== b()) same = false
  if (!same) fail('mulberry32', 'not deterministic for identical seeds')
  const rng = mulberry32(7)
  let sum = 0
  let sq = 0
  for (let i = 0; i < 100000; i++) {
    const u = rng()
    if (!(u >= 0 && u < 1)) fail('mulberry32', 'value outside [0,1)')
    sum += u
    sq += u * u
  }
  const mean = sum / 100000
  const varU = sq / 100000 - mean * mean
  if (Math.abs(mean - 0.5) > 5e-3) fail('mulberry32', `mean ${mean}`)
  if (Math.abs(varU - 1 / 12) > 5e-3) fail('mulberry32', `variance ${varU}`)
  const grng = mulberry32(7)
  let gs = 0
  let gq = 0
  for (let i = 0; i < 50000; i++) {
    const g = grng.nextGauss()
    gs += g
    gq += g * g
  }
  if (Math.abs(gs / 50000) > 2e-2 || Math.abs(gq / 50000 - 1) > 4e-2) fail('mulberry32.nextGauss', 'bad moments')

  // brentMin: minimum of (x-2)^2 + 3 on [0,5]
  const br = brentMin((x) => (x - 2) * (x - 2) + 3, 0, 5)
  close('brentMin x', br.x, 2, 1e-6)
  close('brentMin fx', br.fx, 3, 1e-12)
  if (!br.converged) fail('brentMin', 'did not converge')

  // Nelder–Mead on Rosenbrock
  const nm = nelderMead((v) => Math.pow(1 - v[0], 2) + 100 * Math.pow(v[1] - v[0] * v[0], 2), [-1.2, 1])
  if (Math.abs(nm.x[0] - 1) > 1e-3 || Math.abs(nm.x[1] - 1) > 1e-3) fail('nelderMead', `Rosenbrock -> ${nm.x}`)
  if (!(nm.fx < 1e-8)) fail('nelderMead', `Rosenbrock fx=${nm.fx}`)

  // bisection on x^3 = 2
  const bi = bisect((x) => x * x * x - 2, 1, 2)
  close('bisect cbrt(2)', bi.x, Math.cbrt(2), 1e-12)
  if (!bi.converged) fail('bisect', 'did not converge')
}

/* ================================================================== *
 * Check 3: parameter recovery from 400 seeded samples
 * ================================================================== */

// Relative tolerance per family (max over parameters unless overridden).
// 3-parameter extremal families (burr / gev / gpd) are documented as fragile
// and get the loosest bounds; closed-form MLEs get tight bounds.
const TOL = {
  normal: 0.05,
  logistic: 0.08,
  laplace: 0.08,
  cauchy: 0.20,
  uniform: 0.03,
  lognormal: 0.05,
  gamma: 0.12,
  weibull: 0.08,
  exponential: 0.03,
  rayleigh: 0.03,
  invgauss: 0.15,
  loglogistic: 0.12,
  lomax: 0.25,
  burr: 0.35,
  fatiguelife: 0.15,
  nakagami: 0.12,
  maxwell: 0.03,
  chi2: 0.05,
  halfnormal: 0.03,
  beta: 0.35,
  gumbel: 0.08,
  gev: 0.30,
  gpd: 0.30,
}
// Parameters compared relatively to their absolute true value (everything
// else uses max(|true|, sample sd) as the error scale).
const RAW_REL = {
  normal: ['sigma'],
  logistic: ['s'],
  laplace: ['b'],
  cauchy: ['gamma'],
  lognormal: ['sigma'],
  gamma: ['alpha', 'beta'],
  weibull: ['k', 'lambda'],
  exponential: ['lambda'],
  rayleigh: ['sigma'],
  invgauss: ['mu', 'lambda'],
  loglogistic: ['c', 'lambda'],
  lomax: ['alpha', 'lambda'],
  burr: ['c', 'k', 'lambda'],
  fatiguelife: ['beta', 'c'],
  nakagami: ['nu', 'omega'],
  maxwell: ['a'],
  chi2: ['df'],
  halfnormal: ['sigma'],
  gumbel: ['beta', 'alpha'],
  gev: ['xi', 'mu', 'sigma'],
  gpd: ['xi', 'mu', 'sigma'],
}
// Families whose fit fixes one parameter at the sample edge (documented):
// gpd μ = min(x); beta loc/scale are estimated endpoints and are only checked
// for consistency (data inside the support, positive scale).
const FIXED = { gpd: ['mu'], beta: ['loc', 'scale'] }

function makeSample(d, p, n, seed) {
  const rng = mulberry32(seed)
  const xs = new Array(n)
  for (let i = 0; i < n; i++) xs[i] = d.quantile((i + rng()) / n, p)
  return xs
}

function check3() {
  console.log('check 3   fit recovery (n=400, stratified seeded sample)')
  const rows = []
  for (let idx = 0; idx < DISTS.length; idx++) {
    const d = DISTS[idx]
    const truth = TEST_PARAMS[d.id]
    const xs = makeSample(d, truth, 400, 20260101 + 17 * idx)
    const t0 = Date.now()
    const res = d.fit(xs)
    const ms = Date.now() - t0
    if (!res || !res.params) {
      fail(d.id, 'fit returned no parameters')
      continue
    }
    if (!res.converged) fail(d.id, 'fit did not converge')
    if (!Number.isFinite(res.loglik)) fail(d.id, `fit loglik ${res.loglik} is not finite`)
    // returned loglik must equal Σ log pdf of the returned parameters
    let manual = 0
    let sumOk = true
    for (const x of xs) {
      const lp = d.logpdf ? d.logpdf(x, res.params) : Math.log(d.pdf(x, res.params))
      if (!Number.isFinite(lp)) sumOk = false
      manual += lp
    }
    if (!sumOk) fail(d.id, 'Σ log pdf produced non-finite values')
    const llErr = Math.abs(manual - res.loglik) / Math.max(1, Math.abs(res.loglik))
    if (!(llErr <= 1e-9)) fail(d.id, `loglik ${res.loglik} != Σ ln pdf ${manual} (rel ${llErr.toExponential(1)})`)
    const st = sampleStats(xs)
    const worst = []
    for (const key of d.paramNames) {
      const trueV = truth[key]
      const gotV = res.params[key]
      if (typeof gotV !== 'number' || !Number.isFinite(gotV)) {
        fail(d.id, `params.${key} is not finite: ${fmt(gotV)}`)
        continue
      }
      if ((FIXED[d.id] || []).includes(key)) continue
      let allowed
      const raw = (RAW_REL[d.id] || []).includes(key)
      if (d.support === 'positive' || raw) {
        allowed = TOL[d.id] * Math.max(Math.abs(trueV), 1e-9)
      } else {
        allowed = TOL[d.id] * Math.max(Math.abs(trueV), st.sd, 1e-9)
      }
      const err = Math.abs(gotV - trueV)
      if (err > allowed) {
        fail(
          d.id,
          `params.${key} = ${fmt(gotV)}, truth ${fmt(trueV)}; |err| ${fmt(err)} > tol ${fmt(allowed)} (${((100 * err) / Math.max(Math.abs(trueV), 1e-9)).toFixed(1)}%)`
        )
      }
      worst.push(`${key}:${((100 * err) / Math.max(Math.abs(trueV), 1e-9)).toFixed(1)}%`)
    }
    // beta: loc/scale only need to be consistent with the data
    if (d.id === 'beta') {
      const q = res.params
      if (!(q.loc <= xs[0] + 1e-9) || !(q.loc + q.scale >= xs[xs.length - 1] - 1e-9)) {
        fail('beta', 'loc/scale do not cover the data')
      }
      if (!(q.scale > 0)) fail('beta', 'scale not positive')
    }
    rows.push({ id: d.id, ms, it: res.iterations, ll: res.loglik, err: worst.join(' ') })
  }
  console.log('  family        conv  iters   loglik        param rel. errors')
  for (const r of rows) {
    console.log(`  ${r.id.padEnd(13)} yes   ${String(r.it).padStart(4)}   ${r.ll.toFixed(2).padStart(10)}   ${r.err}`)
  }
  return rows.length
}

/* ================================================================== *
 * Timing report (budget: one fit n=5000 < 150 ms, 23 fits < 2 s)
 * ================================================================== */

function timingReport() {
  console.log('timing    23 fits on n=5000 samples')
  let total = 0
  let slowest = { id: '', ms: 0 }
  for (let idx = 0; idx < DISTS.length; idx++) {
    const d = DISTS[idx]
    const xs = makeSample(d, TEST_PARAMS[d.id], 5000, 900001 + idx)
    const t0 = Date.now()
    d.fit(xs)
    const ms = Date.now() - t0
    total += ms
    if (ms > slowest.ms) slowest = { id: d.id, ms }
    if (ms > 150) fail('timing', `${d.id} fit took ${ms} ms (> 150 ms)`)
  }
  console.log(`  total ${total} ms   slowest ${slowest.id} ${slowest.ms} ms`)
  if (total > 2000) fail('timing', `23 fits took ${total} ms (> 2000 ms)`)
}

/* ================================================================== *
 * main
 * ================================================================== */

const t0 = Date.now()
const nReg = checkRegistry()
check1()
check2()
check3()
timingReport()
const dt = Date.now() - t0
console.log('')
if (failures) {
  console.log(`FAILED: ${failures} failure(s) in ${dt} ms`)
  process.exit(1)
} else {
  console.log(`OK: ${DISTS.length} families (registry rows: ${nReg}), checks 1-3 passed in ${dt} ms`)
}
