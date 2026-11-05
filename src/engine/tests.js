/**
 * tests.js — goodness-of-fit tests for the DistFit engine.
 *
 * Pure ESM, zero dependencies, no DOM / Node built-ins: this module runs
 * unchanged inside the browser bundle, the DSH host process and node scripts.
 *
 * Every test has the same contract (docs/DESIGN.md):
 *
 *   fn(xSorted, cdfFn, { k, alpha, B, seed, bins, quantileFn, refit })
 *     -> { stat, p, crit, pass, method }
 *
 *   xSorted    ascending finite number[] — the sample
 *   cdfFn      x => F(x; fitted params), the CDF of the FITTED distribution
 *   k          number of fitted parameters (chi-square degrees of freedom)
 *   alpha      significance level (default 0.05)
 *   B          Monte-Carlo replicates; 0 => asymptotic p-value only
 *   seed       integer seed for the Monte-Carlo generator (default 20260101)
 *   bins       chi-square: requested bin count, 0 => ceil(sqrt(n)) clamped 5…30
 *   quantileFn p => Q(p; fitted params) — needed for MC simulation and for the
 *              equal-probability chi-square bins; falls back to asymptotic p
 *              when absent
 *   refit      optional hook `sorted => cdfFn | null`: when supplied, each MC
 *              replicate is re-fitted and its own CDF is used for the null
 *              distribution ("refit MC", Lilliefors-style, see below)
 *
 * `method` is `'asymptotic' | 'mc' | 'none'`; `'none'` means the sample was too
 * small / the CDF produced non-finite values and the test could not be run.
 * `pass` is `p >= alpha` (fail to reject the fitted distribution).
 *
 * ## Composite-hypothesis conservatism (IMPORTANT)
 *
 * The fitted parameters are estimated from the same sample the test is applied
 * to. Asymptotic p-values (and the default parametric bootstrap, which does NOT
 * re-fit the simulated samples) therefore assume the parameters were known in
 * advance, which they were not: the fitted-parameter Kolmogorov statistic is
 * only ≈0.65× the known-parameter statistic, so the reported p-value is far too
 * large (simulated N(0,1) samples fitted as normal give a mean KS p ≈ 0.80
 * instead of ≈0.5). Treat asymptotic KS/AD/CvM p-values as optimistic indicators,
 * use AIC/BIC for ranking, and pass `refit` (exposed by `analyze(..., {mcRefit:
 * true})`) for a calibrated Monte-Carlo p-value when it matters.
 */

import { mulberry32, gammaIncompleteQ, lgamma } from './special.js';

const SQRT_2PI = Math.sqrt(2 * Math.PI);
const PI_SQ = Math.PI * Math.PI;
const DEFAULT_SEED = 20260101;

/* ------------------------------------------------------------------ */
/* tiny helpers                                                        */
/* ------------------------------------------------------------------ */

function clamp(v, lo, hi) {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

function clamp01(v) {
  return clamp(v, 0, 1);
}

/** Significance level normalisation. */
function levelOpt(opts) {
  const a = Number(opts && opts.alpha);
  return a > 0 && a < 1 ? a : 0.05;
}

/** Monte-Carlo replicate count. */
function replicates(opts) {
  const b = Math.floor(Number(opts && opts.B) || 0);
  return b > 0 ? Math.min(b, 100000) : 0;
}

/** Type-7 (linear) quantile of an already sorted numeric array. */
function sortedQuantile(sorted, p) {
  const n = sorted.length;
  if (!n) return NaN;
  const h = (n - 1) * clamp01(p);
  const i = Math.floor(h);
  if (i >= n - 1) return sorted[n - 1];
  const f = h - i;
  return sorted[i] + f * (sorted[i + 1] - sorted[i]);
}

/**
 * Monte-Carlo draws of a test statistic under the fitted distribution.
 *
 * Samples are produced by the inverse-CDF transform of the FITTED distribution
 * (`quantileFn(rand())`) — they are exact draws from that family. With `refit`
 * the sampled order statistic is re-fitted and its CDF used for the null; else
 * the original `cdfFn` is reused (no refit: the documented SPEC behaviour, which
 * is conservative for composite hypotheses).
 *
 * @param {number[]} xSorted sample (only its length is used)
 * @param {(x:number)=>number} cdfFn fitted CDF
 * @param {object} opts test options
 * @param {number} salt per-test seed offset
 * @param {(sorted:number[], cdf:(x:number)=>number)=>number} statFn statistic
 * @returns {Float64Array|null} sorted draws, or null when MC is impossible
 */
function mcDraws(xSorted, cdfFn, opts, salt, statFn) {
  const B = replicates(opts);
  const quantileFn = opts && opts.quantileFn;
  if (!(B > 0) || typeof quantileFn !== 'function') return null;
  const n = xSorted.length;
  const rand = mulberry32(((Number(opts && opts.seed) || DEFAULT_SEED) + salt) >>> 0);
  const refit = typeof (opts && opts.refit) === 'function' ? opts.refit : null;
  const draws = new Float64Array(B);
  const sim = new Array(n);
  let good = 0;
  for (let b = 0; b < B; b++) {
    let okSim = true;
    for (let i = 0; i < n; i++) {
      const v = quantileFn(rand());
      if (!Number.isFinite(v)) {
        okSim = false;
        break;
      }
      sim[i] = v;
    }
    if (!okSim) continue;
    sim.sort((a, c) => a - c);
    let cdf = cdfFn;
    if (refit) {
      const fittedCdf = refit(sim.slice());
      if (typeof fittedCdf === 'function') cdf = fittedCdf;
    }
    const d = statFn(sim, cdf);
    if (Number.isFinite(d)) draws[good++] = d;
  }
  if (good === 0) return null;
  const out = draws.slice(0, good);
  out.sort();
  return out;
}

/** MC p-value and critical value from draws (sorted ascending). */
function mcResult(stat, draws, alpha) {
  let greater = 0;
  for (let i = 0; i < draws.length; i++) if (draws[i] >= stat) greater++;
  const B = draws.length;
  const p = (greater + 1) / (B + 1);
  const crit = sortedQuantile(draws, 1 - alpha);
  return { p, crit };
}

/**
 * Bisection on a decreasing p-value function to recover the critical statistic.
 * @param {(stat:number)=>number} pOf stat => p-value (decreasing)
 * @param {number} alpha target p
 * @param {number} lo lower bracket (p ≈ 1)
 * @param {number} hi upper bracket (p ≈ 0)
 */
function invertCritical(pOf, alpha, lo, hi) {
  let a = lo;
  let b = hi;
  let fa = pOf(a);
  if (!(fa > alpha)) return a;
  let fb = pOf(b);
  if (fb > alpha) return b;
  for (let i = 0; i < 100; i++) {
    const mid = 0.5 * (a + b);
    const fm = pOf(mid);
    if (fm > alpha) {
      a = mid;
      fa = fm;
    } else {
      b = mid;
      fb = fm;
    }
    if (Math.abs(b - a) < 1e-12 * (1 + Math.abs(mid))) break;
  }
  return 0.5 * (a + b);
}

/* ------------------------------------------------------------------ */
/* Kolmogorov–Smirnov                                                  */
/* ------------------------------------------------------------------ */

/**
 * Two-sided Kolmogorov–Smirnov statistic D = max(D⁺, D⁻).
 * @param {number[]} xSorted ascending sample
 * @param {(x:number)=>number} cdfFn fitted CDF
 * @returns {number} D (NaN when the CDF is not finite somewhere)
 */
export function ksStatistic(xSorted, cdfFn) {
  const n = xSorted.length;
  if (!n) return NaN;
  let dPlus = 0;
  let dMinus = 0;
  for (let i = 0; i < n; i++) {
    const F = cdfFn(xSorted[i]);
    if (!Number.isFinite(F)) return NaN;
    const Fc = clamp01(F);
    const up = (i + 1) / n - Fc;
    const dn = Fc - i / n;
    if (up > dPlus) dPlus = up;
    if (dn > dMinus) dMinus = dn;
  }
  return Math.max(dPlus > 0 ? dPlus : 0, dMinus > 0 ? dMinus : 0);
}

/**
 * Kolmogorov limiting-distribution tail probability P(√n·D ≥ λ), i.e. the
 * asymptotic p-value of the statistic for KNOWN parameters.
 *
 * Two numerically complementary series are used (the classic switch at
 * λ = 0.82):
 *   λ ≥ 0.82 : Q(λ) = 2 Σ_{j≥1} (−1)^{j−1} exp(−2j²λ²)
 *   λ <  0.82: Q(λ) = 1 − (√(2π)/λ) Σ_{j≥1} exp(−(2j−1)²π²/(8λ²))
 *
 * @param {number} lambda √n·D (Stephens correction may be applied first)
 * @returns {number} p in [0,1]
 */
export function ksPValue(lambda) {
  if (!Number.isFinite(lambda) || lambda < 0) return NaN;
  if (lambda === 0) return 1;
  if (lambda < 0.82) {
    let s = 0;
    const denom = 8 * lambda * lambda;
    for (let j = 1; j <= 200; j++) {
      const t = 2 * j - 1;
      const term = Math.exp((-t * t * PI_SQ) / denom);
      s += term;
      if (term < 1e-18) break;
    }
    return clamp01(1 - (SQRT_2PI / lambda) * s);
  }
  let s = 0;
  for (let j = 1; j <= 200; j++) {
    const term = Math.exp(-2 * j * j * lambda * lambda);
    s += j % 2 === 1 ? term : -term;
    if (term < 1e-18) break;
  }
  return clamp01(2 * s);
}

/**
 * Kolmogorov–Smirnov goodness-of-fit test for a fully specified (fitted) CDF.
 *
 * **Composite-hypothesis caveat:** if the parameters were fitted from `xSorted`,
 * the asymptotic p-value is conservative (mean p ≈ 0.80 rather than 0.5 for
 * N(0,1) data fitted as a normal). Pass `B > 0` plus `refit` for calibrated MC.
 *
 * @param {number[]} xSorted ascending finite sample
 * @param {(x:number)=>number} cdfFn fitted CDF
 * @param {{k?:number, alpha?:number, B?:number, seed?:number, quantileFn?:Function, refit?:Function}} [opts]
 * @returns {{stat:number, p:number, crit:number, pass:boolean, method:'asymptotic'|'mc'|'none'}}
 */
export function ksTest(xSorted, cdfFn, opts = {}) {
  const n = Array.isArray(xSorted) ? xSorted.length : 0;
  const alpha = levelOpt(opts);
  const stat = typeof cdfFn === 'function' && n >= 2 ? ksStatistic(xSorted, cdfFn) : NaN;
  if (!Number.isFinite(stat)) return none(stat, alpha, n);

  const draws = mcDraws(xSorted, cdfFn, opts, 101, ksStatistic);
  if (draws) {
    const { p, crit } = mcResult(stat, draws, alpha);
    return { stat, p, crit, pass: p >= alpha, method: 'mc' };
  }

  // Stephens (1970) finite-n correction — the classic √n + 0.12 + 0.11/√n scale.
  const sqrtN = Math.sqrt(n);
  const lambda = (sqrtN + 0.12 + 0.11 / sqrtN) * stat;
  const p = ksPValue(lambda);
  const crit = invertCritical(
    (d) => ksPValue((sqrtN + 0.12 + 0.11 / sqrtN) * d),
    alpha,
    0,
    1,
  );
  return { stat, p, crit, pass: p >= alpha, method: 'asymptotic' };
}

/* ------------------------------------------------------------------ */
/* Anderson–Darling                                                    */
/* ------------------------------------------------------------------ */

/**
 * Anderson–Darling statistic A² (uncorrected):
 *   A² = −n − (1/n) Σ_{i=1..n} (2i−1)·[ln F(x_i) + ln(1 − F(x_{n+1−i}))]
 * @param {number[]} xSorted ascending sample
 * @param {(x:number)=>number} cdfFn fitted CDF
 */
export function adStatistic(xSorted, cdfFn) {
  const n = xSorted.length;
  if (!n) return NaN;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const lo = cdfFn(xSorted[i]);
    const hi = cdfFn(xSorted[n - 1 - i]);
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return NaN;
    const a = clamp(lo, 1e-15, 1 - 1e-15);
    const b = clamp(1 - hi, 1e-15, 1 - 1e-15);
    s += (2 * i + 1) * (Math.log(a) + Math.log(b));
  }
  return -n - s / n;
}

/** D'Agostino–Stephens (1986) finite-sample correction for A². */
export function adCorrect(a2, n) {
  return a2 * (1 + 0.75 / n + 2.25 / (n * n));
}

/**
 * D'Agostino–Stephens normal-null approximation for the p-value of the
 * corrected A² (piecewise exponential-quadratic fit; valid for the composite
 * normal null and a good approximation for other fitted families).
 * @param {number} a2c corrected A²
 */
export function adPValue(a2c) {
  if (!Number.isFinite(a2c) || a2c <= 0) return NaN;
  const a = a2c;
  let p;
  if (a < 0.2) p = 1 - Math.exp(-13.436 + 101.14 * a - 223.73 * a * a);
  else if (a < 0.34) p = 1 - Math.exp(-8.318 + 42.796 * a - 59.938 * a * a);
  else if (a < 0.6) p = Math.exp(0.9177 - 4.279 * a - 1.38 * a * a);
  else p = Math.exp(1.2937 - 5.709 * a + 0.0186 * a * a);
  return clamp01(p);
}

/**
 * Anderson–Darling goodness-of-fit test.
 *
 * `stat` is the UNCORRECTED A² of the SPEC formula; the asymptotic p-value uses
 * the D'Agostino–Stephens finite-sample correction. With `B > 0` a parametric
 * bootstrap is used instead (no refit unless `refit` is supplied — see the
 * composite-hypothesis note at the top of the file).
 *
 * @param {number[]} xSorted ascending finite sample
 * @param {(x:number)=>number} cdfFn fitted CDF
 * @param {{k?:number, alpha?:number, B?:number, seed?:number, quantileFn?:Function, refit?:Function}} [opts]
 */
export function adTest(xSorted, cdfFn, opts = {}) {
  const n = Array.isArray(xSorted) ? xSorted.length : 0;
  const alpha = levelOpt(opts);
  const stat = typeof cdfFn === 'function' && n >= 2 ? adStatistic(xSorted, cdfFn) : NaN;
  if (!Number.isFinite(stat)) return none(stat, alpha, n);

  const draws = mcDraws(xSorted, cdfFn, opts, 202, adStatistic);
  if (draws) {
    const { p, crit } = mcResult(stat, draws, alpha);
    return { stat, p, crit, pass: p >= alpha, method: 'mc' };
  }

  const corr = (a) => adCorrect(a, n);
  const p = adPValue(corr(stat));
  const crit = invertCritical(
    (s) => adPValue(corr(s)),
    alpha,
    1e-6,
    10,
  );
  return { stat, p, crit, pass: p >= alpha, method: 'asymptotic' };
}

/* ------------------------------------------------------------------ */
/* Cramér–von Mises                                                     */
/* ------------------------------------------------------------------ */

/**
 * √(π/2) — large-argument limit of the scaled Bessel integral used below.
 */
const BESSEL_S_MAX = 8;
const BESSEL_N = 200;

/**
 * e^{−q}·K_{1/4}(q) for the modified Bessel function of the second kind.
 *
 * Integral representation with the substitution u = cosh t, u = 1 + s²/q:
 *   e^{−q}·K_ν(q) = (e^{−2q}/√q) · ∫₀^∞ e^{−s²} cosh(ν·acosh(1+s²/q))·2/√(2+s²/q) ds
 * The integrand is smooth and decays like e^{−s²}; composite Simpson on [0,8]
 * is exact to ~1e-15 relative (verified against scipy.special.kv).
 * @param {number} q argument > 0
 * @param {number} [nu=0.25] Bessel order
 */
export function besselKQuarterScaled(q, nu = 0.25) {
  if (!(q > 0) || !Number.isFinite(q)) return 0;
  if (2 * q > 700) return 0; // e^{-2q} underflows
  const h = BESSEL_S_MAX / BESSEL_N;
  const invQ = 1 / q;
  let s = 0;
  for (let i = 0; i <= BESSEL_N; i++) {
    const x = i * h;
    const w = x * x * invQ;
    const val =
      Math.exp(-x * x) *
      Math.cosh(nu * Math.acosh(1 + w)) *
      (2 / Math.sqrt(2 + w));
    s += i === 0 || i === BESSEL_N ? val : i % 2 === 1 ? 4 * val : 2 * val;
  }
  return (Math.exp(-2 * q) / Math.sqrt(q)) * ((s * h) / 3);
}

/**
 * Csörgő–Faraway (1996, eq. 1.2) asymptotic CDF of the Cramér–von Mises W²
 * under a SIMPLE null:
 *   F(x) = Σ_{k≥0} [Γ(k+½)/(k!·π^{3/2}·√x)]·√(4k+1)·e^{−q}·K_{1/4}(q),
 *   q = (4k+1)²/(16x)
 * For x > ~2 the series can overshoot 1 (caller clamps); it is not accurate for
 * very small samples — the MC path is the honest option there.
 * @param {number} x statistic value > 0
 * @returns {number} P(W² ≤ x)
 */
export function cvmCdfInf(x) {
  if (!(x > 0) || !Number.isFinite(x)) return 0;
  const pref = Math.pow(Math.PI, 1.5) * Math.sqrt(x);
  let tot = 0;
  for (let k = 0; k < 60; k++) {
    const y = 4 * k + 1;
    const q = (y * y) / (16 * x);
    if (2 * q > 700) break;
    const u = Math.exp(lgamma(k + 0.5) - lgamma(k + 1)) / pref;
    const term = u * Math.sqrt(y) * besselKQuarterScaled(q);
    tot += term;
    if (k >= 1 && Math.abs(term) < 1e-13) break;
  }
  return tot;
}

/** Asymptotic simple-null p-value of the Cramér–von Mises statistic. */
export function cvmPValue(w2) {
  if (!Number.isFinite(w2) || w2 <= 0) return NaN;
  return clamp01(1 - cvmCdfInf(w2));
}

/**
 * Cramér–von Mises statistic:
 *   W² = 1/(12n) + Σ_i (F(x_i) − (2i−1)/(2n))²
 * @param {number[]} xSorted ascending sample
 * @param {(x:number)=>number} cdfFn fitted CDF
 */
export function cvmStatistic(xSorted, cdfFn) {
  const n = xSorted.length;
  if (!n) return NaN;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const F = cdfFn(xSorted[i]);
    if (!Number.isFinite(F)) return NaN;
    const d = clamp01(F) - (2 * (i + 1) - 1) / (2 * n);
    s += d * d;
  }
  return 1 / (12 * n) + s;
}

/**
 * Cramér–von Mises goodness-of-fit test.
 *
 * The asymptotic p-value uses the Csörgő–Faraway simple-null CDF; with `B > 0`
 * a parametric bootstrap replaces it (no refit unless `refit` is supplied).
 *
 * @param {number[]} xSorted ascending finite sample
 * @param {(x:number)=>number} cdfFn fitted CDF
 * @param {{k?:number, alpha?:number, B?:number, seed?:number, quantileFn?:Function, refit?:Function}} [opts]
 */
export function cvmTest(xSorted, cdfFn, opts = {}) {
  const n = Array.isArray(xSorted) ? xSorted.length : 0;
  const alpha = levelOpt(opts);
  const stat = typeof cdfFn === 'function' && n >= 2 ? cvmStatistic(xSorted, cdfFn) : NaN;
  if (!Number.isFinite(stat)) return none(stat, alpha, n);

  const draws = mcDraws(xSorted, cdfFn, opts, 303, cvmStatistic);
  if (draws) {
    const { p, crit } = mcResult(stat, draws, alpha);
    return { stat, p, crit, pass: p >= alpha, method: 'mc' };
  }

  const p = cvmPValue(stat);
  const crit = invertCritical((s) => cvmPValue(s), alpha, 1e-6, 6);
  return { stat, p, crit, pass: p >= alpha, method: 'asymptotic' };
}

/* ------------------------------------------------------------------ */
/* chi-square                                                          */
/* ------------------------------------------------------------------ */

/** Equal-probability bin edges from the fitted quantile function. */
function quantileEdges(quantileFn, m) {
  const edges = new Array(m + 1);
  for (let j = 0; j <= m; j++) {
    if (j === 0) {
      edges[j] = -Infinity;
    } else if (j === m) {
      edges[j] = Infinity;
    } else {
      const q = quantileFn(j / m);
      if (!Number.isFinite(q)) return null;
      edges[j] = q;
    }
  }
  for (let j = 1; j <= m; j++) {
    if (!(edges[j] > edges[j - 1])) return null; // degenerate quantiles
  }
  return edges;
}

/** Equal-width bin edges over the sample range (fallback without quantileFn). */
function widthEdges(xSorted, m) {
  const lo = xSorted[0];
  const hi = xSorted[xSorted.length - 1];
  const width = (hi - lo) / m;
  if (!(width > 0)) return null;
  const edges = new Array(m + 1);
  for (let j = 0; j <= m; j++) edges[j] = j === 0 ? -Infinity : j === m ? Infinity : lo + j * width;
  return edges;
}

function binCounts(xSorted, edges) {
  const m = edges.length - 1;
  const counts = new Array(m).fill(0);
  for (let i = 0; i < xSorted.length; i++) {
    const v = xSorted[i];
    let idx = m - 1;
    for (let j = 0; j < m; j++) {
      if (v >= edges[j] && v < edges[j + 1]) {
        idx = j;
        break;
      }
    }
    counts[idx]++;
  }
  return counts;
}

/**
 * Merge adjacent bins with expected count < 1 (the SPEC rule: tail bins with
 * expected < 1 are merged). Returns the group boundaries (bin indices).
 * @param {number} m number of equal-probability bins
 * @param {number} expected expected count per bin (n/m)
 */
function mergeGroups(m, expected) {
  const groups = [];
  let start = 0;
  let expSum = 0;
  for (let j = 0; j < m; j++) {
    expSum += expected;
    if (expSum >= 1 || j === m - 1) {
      groups.push([start, j]);
      start = j + 1;
      expSum = 0;
    }
  }
  return groups;
}

function chi2FromCounts(counts, groups, expected) {
  let stat = 0;
  let used = 0;
  for (let g = 0; g < groups.length; g++) {
    const [a, b] = groups[g];
    let o = 0;
    for (let j = a; j <= b; j++) o += counts[j];
    const e = expected * (b - a + 1);
    if (!(e > 0)) continue;
    const d = o - e;
    stat += (d * d) / e;
    used++;
  }
  return { stat, bins: used };
}

/**
 * Pearson chi-square goodness-of-fit test with equal-probability bins.
 *
 * Bins are cut at the fitted quantiles (requires `opts.quantileFn`; without it
 * equal-width bins over the sample range are used as a fallback), adjacent
 * intervals with expected count < 1 are merged, and `df = bins − 1 − k`.
 * `B > 0` switches to a parametric bootstrap with the SAME edges (replicates
 * are simulated from the fitted distribution; a refit would only add noise for
 * this test, so `refit` is ignored here).
 *
 * @param {number[]} xSorted ascending finite sample
 * @param {(x:number)=>number} cdfFn fitted CDF (used only for the sanity check)
 * @param {{k?:number, alpha?:number, B?:number, seed?:number, bins?:number, quantileFn?:Function}} [opts]
 */
export function chi2Test(xSorted, cdfFn, opts = {}) {
  const n = Array.isArray(xSorted) ? xSorted.length : 0;
  const alpha = levelOpt(opts);
  const kParams = Math.max(0, Math.floor(Number(opts.k) || 0));
  const requested = Math.floor(Number(opts.bins) || 0);
  const m = requested > 0 ? clamp(requested, 2, 200) : clamp(Math.ceil(Math.sqrt(n)), 5, 30);
  const fail = (stat) => ({ stat, p: NaN, crit: NaN, pass: false, method: 'none' });
  if (n < 5 || typeof cdfFn !== 'function') return fail(NaN);

  const quantileFn = typeof opts.quantileFn === 'function' ? opts.quantileFn : null;
  let edges = quantileFn ? quantileEdges(quantileFn, m) : null;
  if (!edges) edges = widthEdges(xSorted, m);
  if (!edges) return fail(NaN);

  const counts = binCounts(xSorted, edges);
  const expected = n / m;
  const groups = mergeGroups(m, expected);
  const base = chi2FromCounts(counts, groups, expected);
  const df = base.bins - 1 - kParams;
  if (!(df >= 1) || !Number.isFinite(base.stat)) return fail(base.stat);

  const crit = invertCritical(
    (s) => gammaIncompleteQ(df / 2, s / 2),
    alpha,
    0,
    1000,
  );

  const B = replicates(opts);
  if (B > 0 && quantileFn) {
    const rand = mulberry32(((Number(opts.seed) || DEFAULT_SEED) + 404) >>> 0);
    const draws = [];
    for (let b = 0; b < B; b++) {
      const sim = new Array(n);
      let okSim = true;
      for (let i = 0; i < n; i++) {
        const v = quantileFn(rand());
        if (!Number.isFinite(v)) {
          okSim = false;
          break;
        }
        sim[i] = v;
      }
      if (!okSim) continue;
      sim.sort((a, c) => a - c);
      const c = binCounts(sim, edges);
      const s = chi2FromCounts(c, groups, expected).stat;
      if (Number.isFinite(s)) draws.push(s);
    }
    if (draws.length) {
      draws.sort((a, c) => a - c);
      const arr = Float64Array.from(draws);
      const { p, crit: mcCrit } = mcResult(base.stat, arr, alpha);
      return { stat: base.stat, p, crit: mcCrit, pass: p >= alpha, method: 'mc' };
    }
  }

  const p = gammaIncompleteQ(df / 2, base.stat / 2);
  return { stat: base.stat, p, crit, pass: p >= alpha, method: 'asymptotic' };
}

/* ------------------------------------------------------------------ */
/* registry                                                            */
/* ------------------------------------------------------------------ */

/** Default no-op result for tests that cannot run. */
function none(stat, alpha, n) {
  return {
    stat: Number.isFinite(stat) ? stat : NaN,
    p: NaN,
    crit: NaN,
    pass: false,
    method: 'none',
    n,
  };
}

/**
 * Test registry keyed by the ids used in `analyze(datasets, { tests })`.
 * @type {Record<string, Function>}
 */
export const TESTS = { ks: ksTest, ad: adTest, cvm: cvmTest, chi2: chi2Test };

/** Supported test ids, in the default report order. */
export const TEST_IDS = ['ks', 'ad', 'cvm', 'chi2'];
