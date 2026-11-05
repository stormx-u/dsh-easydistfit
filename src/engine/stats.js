/**
 * dsh-distfit — descriptive statistics, quantiles, histogram and ECDF.
 *
 * Pure ESM, zero dependencies, no DOM / Node built-ins: this module runs
 * unchanged inside the browser bundle, the DSH host process and node scripts.
 *
 * Notes on conventions (kept consistent with the reference Python tool):
 *  - `sd` is the SAMPLE standard deviation (ddof = 1); `n < 2` yields `null`.
 *  - `skew` is the bias-corrected Fisher–Pearson skewness (scipy's
 *    `stats.skew(x)` default, bias=False); `null` when n < 3.
 *  - `kurt` is the EXCESS kurtosis (normal = 0), bias-corrected (scipy's
 *    `stats.kurtosis(x)` default, bias=False); `null` when n < 4.
 *  - `cv = sd / mean` (`null` when mean is 0 / non-finite).
 *  - Quantiles use the Hyndman–Fan type 7 definition (numpy's default,
 *    linear interpolation of the order statistics) — the same convention as
 *    the reference Python implementation's `np.percentile`.
 */

/** Euler–Mascheroni constant (kept local so stats.js has no dependencies). */
const EULER_GAMMA = 0.5772156649015329;

/** Smallest positive normal used to avoid 0 in log/ratio computations. */
const TINY = 1e-300;

/* ------------------------------------------------------------------ */
/* small numeric helpers                                               */
/* ------------------------------------------------------------------ */

/** Sum of a numeric array (NaN-safe: non-finite entries are skipped). */
export function sum(arr) {
  let s = 0;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (Number.isFinite(v)) s += v;
  }
  return s;
}

/** Arithmetic mean of the finite entries of `arr` (`NaN` when empty). */
export function mean(arr) {
  let s = 0;
  let n = 0;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (Number.isFinite(v)) {
      s += v;
      n++;
    }
  }
  return n ? s / n : NaN;
}

/**
 * Variance of the finite entries of `arr`.
 * @param {number[]} arr
 * @param {number} [ddof=1] delta degrees of freedom (1 = sample variance)
 */
export function variance(arr, ddof = 1) {
  let s = 0;
  let n = 0;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (Number.isFinite(v)) {
      s += v;
      n++;
    }
  }
  if (n - ddof <= 0) return NaN;
  const m = s / n;
  let ss = 0;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (Number.isFinite(v)) ss += (v - m) * (v - m);
  }
  return ss / (n - ddof);
}

/** Clamp `v` into [lo, hi]. `NaN` propagates (returns NaN). */
export function clamp(v, lo, hi) {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

/**
 * Copy of `x` keeping only finite numbers, sorted ascending.
 * Accepts strings (a pasted CSV may hand us strings) — non-numeric strings are
 * dropped, numeric strings are converted.
 */
export function sortNumbers(x) {
  const out = [];
  if (!x) return out;
  for (let i = 0; i < x.length; i++) {
    let v = x[i];
    if (typeof v === 'string') v = v.trim() === '' ? NaN : Number(v);
    if (Number.isFinite(v)) out.push(v);
  }
  out.sort((a, b) => a - b);
  return out;
}

/* ------------------------------------------------------------------ */
/* quantiles                                                           */
/* ------------------------------------------------------------------ */

/**
 * Type-7 quantile of an ALREADY SORTED array (Hyndman–Fan type 7, the numpy
 * `percentile` / R `quantile(type=7)` default):
 *   h = (n − 1)p ; x(p) = x[⌊h⌋] + (h − ⌊h⌋)·(x[⌊h⌋+1] − x[⌊h⌋])
 * @param {number[]} sortedArr ascending numeric array
 * @param {number} p probability in [0, 1]
 * @returns {number} the quantile, or NaN for an empty array / non-finite p
 */
export function quantile(sortedArr, p) {
  if (!sortedArr || !sortedArr.length) return NaN;
  if (!Number.isFinite(p)) return NaN;
  const pp = clamp(p, 0, 1);
  const n = sortedArr.length;
  if (n === 1) return sortedArr[0];
  const h = (n - 1) * pp;
  const i = Math.floor(h);
  if (i >= n - 1) return sortedArr[n - 1];
  const f = h - i;
  return sortedArr[i] + f * (sortedArr[i + 1] - sortedArr[i]);
}

/* ------------------------------------------------------------------ */
/* describe                                                            */
/* ------------------------------------------------------------------ */

function round6(v) {
  return Number.isFinite(v) ? Math.round(v * 1e6) / 1e6 : null;
}

/**
 * Descriptive statistics of a numeric sample.
 *
 * @param {number[]|string[]} x raw values (non-finite values are dropped)
 * @returns {{
 *   n:number, mean:number|null, sd:number|null, cv:number|null,
 *   min:number|null, max:number|null, q1:number|null, median:number|null,
 *   q3:number|null, iqr:number|null, skew:number|null, kurt:number|null,
 *   range:number|null
 * }} `sd` sample (n−1); `kurt` is EXCESS kurtosis (normal = 0). Fields that
 *   need more observations than are available are `null`, never `NaN`, so the
 *   object is JSON-safe.
 */
export function describe(x) {
  const xs = sortNumbers(x);
  const n = xs.length;
  if (!n) {
    return {
      n: 0, mean: null, sd: null, cv: null, min: null, max: null,
      q1: null, median: null, q3: null, iqr: null, skew: null, kurt: null,
      range: null,
    };
  }

  const m = sum(xs) / n;
  let m2 = 0;
  let m3 = 0;
  let m4 = 0;
  for (let i = 0; i < n; i++) {
    const d = xs[i] - m;
    const d2 = d * d;
    m2 += d2;
    m3 += d2 * d;
    m4 += d2 * d2;
  }
  m2 /= n;
  m3 /= n;
  m4 /= n;

  const sd = n >= 2 ? Math.sqrt((m2 * n) / (n - 1)) : null;
  const cv = sd !== null && m !== 0 && Number.isFinite(m) ? sd / m : null;

  // bias-corrected Fisher–Pearson skewness G1 (scipy bias=False)
  let skew = null;
  if (n >= 3 && m2 > 0) {
    const g1 = m3 / Math.pow(m2, 1.5);
    skew = (Math.sqrt((n * (n - 1)) / (n - 2)) * g1);
  }
  // unbiased EXCESS kurtosis G2 (scipy bias=False)
  let kurt = null;
  if (n >= 4 && m2 > 0) {
    kurt = (n - 1) * (((n + 1) * (m4 / (m2 * m2))) - 3 * (n - 1)) / ((n - 2) * (n - 3));
  }

  const q1 = quantile(xs, 0.25);
  const median = quantile(xs, 0.5);
  const q3 = quantile(xs, 0.75);
  const min = xs[0];
  const max = xs[n - 1];

  return {
    n,
    mean: round6(m),
    sd: sd === null ? null : round6(sd),
    cv: cv === null ? null : round6(cv),
    min: round6(min),
    max: round6(max),
    q1: round6(q1),
    median: round6(median),
    q3: round6(q3),
    iqr: round6(q3 - q1),
    skew: skew === null ? null : round6(skew),
    kurt: kurt === null ? null : round6(kurt),
    range: round6(max - min),
  };
}

/* ------------------------------------------------------------------ */
/* histogram                                                           */
/* ------------------------------------------------------------------ */

/** Number of bins by the Freedman–Diaconis rule, Sturges as fallback. */
export function freedmanDiaconisBins(xs) {
  const n = xs.length;
  if (n < 2) return 5;
  const lo = xs[0];
  const hi = xs[n - 1];
  const range = hi - lo;
  if (!(range > 0)) return 5;
  const iqr = quantile(xs, 0.75) - quantile(xs, 0.25);
  let nb;
  if (iqr > 0) {
    // bin width h = 2·IQR·n^(−1/3)  ⇒  nbins = range / h
    const h = 2 * iqr * Math.pow(n, -1 / 3);
    nb = Math.ceil(range / h);
  } else {
    nb = 0;
  }
  if (!(nb > 0) || !Number.isFinite(nb)) nb = Math.ceil(Math.log2(n)) + 1; // Sturges
  return clamp(nb, 5, 60);
}

/**
 * Equal-width histogram.
 *
 * @param {number[]} x raw values (non-finite dropped)
 * @param {number} [bins=0] number of bins; `0` → Freedman–Diaconis auto rule
 *   (Sturges fallback when the IQR degenerates), clamped to 5…60
 * @returns {{n:number, bins:{x0:number,x1:number,count:number,density:number}[],
 *            width:number, x0:number, x1:number}}
 *   `density = count / (n · width)` so that Σ density·width = 1.
 */
export function histogram(x, bins = 0) {
  const xs = sortNumbers(x);
  const n = xs.length;
  if (!n) return { n: 0, bins: [], width: 0, x0: NaN, x1: NaN };

  const x0 = xs[0];
  const x1 = xs[n - 1];
  const range = x1 - x0;

  let nb;
  const want = Math.floor(Number(bins) || 0);
  if (want > 0) nb = clamp(want, 1, 1000);
  else nb = freedmanDiaconisBins(xs);

  if (!(range > 0)) {
    // Degenerate sample (all values equal): one zero-width bin, density 0.
    return {
      n,
      bins: [{ x0, x1, count: n, density: 0 }],
      width: 0,
      x0,
      x1,
    };
  }

  const width = range / nb;
  const counts = new Array(nb).fill(0);
  for (let i = 0; i < n; i++) {
    let idx = Math.floor((xs[i] - x0) / width);
    if (idx < 0) idx = 0;
    else if (idx >= nb) idx = nb - 1;
    counts[idx]++;
  }
  const denom = n * width;
  const out = new Array(nb);
  for (let i = 0; i < nb; i++) {
    out[i] = {
      x0: x0 + i * width,
      x1: x0 + (i + 1) * width,
      count: counts[i],
      density: counts[i] / denom,
    };
  }
  return { n, bins: out, width, x0, x1 };
}

/* ------------------------------------------------------------------ */
/* empirical CDF                                                       */
/* ------------------------------------------------------------------ */

/**
 * Empirical distribution function as a step polyline.
 * The first point is the y = 0 start point at the minimum observation, so
 * `<path d="M ... L ...">` (or a step renderer) needs no extra handling:
 *   ecdf([1,2,3]) → { x:[1,1,2,3], y:[0,1/3,2/3,1] }
 *
 * @param {number[]} x raw values (non-finite dropped)
 * @returns {{x:number[], y:number[]}}
 */
export function ecdf(x) {
  const xs = sortNumbers(x);
  const n = xs.length;
  if (!n) return { x: [], y: [] };
  const outX = new Array(n + 1);
  const outY = new Array(n + 1);
  outX[0] = xs[0];
  outY[0] = 0;
  for (let i = 0; i < n; i++) {
    outX[i + 1] = xs[i];
    outY[i + 1] = (i + 1) / n;
  }
  return { x: outX, y: outY };
}

/* ------------------------------------------------------------------ */
/* fitted moments (used by analyze for row.mean / row.sd)              */
/* ------------------------------------------------------------------ */

/**
 * Mean and standard deviation implied by a distribution, computed numerically
 * from its quantile function:
 *   E[X] = ∫₀¹ Q(u) du,  Var[X] = ∫₀¹ (Q(u) − E[X])² du
 * (Simpson on a u-grid). This works for every family regardless of whether a
 * closed-form moment exists; heavy-tailed families whose moments do not exist
 * (e.g. Cauchy) produce absurd numbers and are reported as `null` by the
 * magnitude guard.
 *
 * @param {(p:number)=>number} qf quantile function Q(p)
 * @param {number} [points=1025] odd number of abscissae (Simpson)
 * @param {number} [eps=1e-7] clip u into [eps, 1−eps]
 * @returns {{mean:number|null, sd:number|null}}
 */
export function quantileMoments(qf, points = 1025, eps = 1e-7) {
  const m = points % 2 === 0 ? points + 1 : points;
  const h = 1 / (m - 1);
  const vals = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    const u = clamp(i * h, eps, 1 - eps);
    const q = qf(u);
    vals[i] = Number.isFinite(q) ? q : NaN;
  }
  // Simpson weights: 1,4,2,4,...,2,4,1
  const w = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    if (i === 0 || i === m - 1) w[i] = 1;
    else w[i] = i % 2 === 1 ? 4 : 2;
  }
  let s = 0;
  let ok = true;
  for (let i = 0; i < m; i++) {
    if (!Number.isFinite(vals[i])) {
      ok = false;
      break;
    }
    s += w[i] * vals[i];
  }
  if (!ok) return { mean: null, sd: null };
  const mu = (s * h) / 3;

  let v = 0;
  for (let i = 0; i < m; i++) {
    const d = vals[i] - mu;
    v += w[i] * d * d;
  }
  const varq = (v * h) / 3;
  const sd = varq > 0 ? Math.sqrt(varq) : 0;

  // Magnitude guard: undefined moments (Cauchy etc.) blow up in the u→0/1
  // limit; report null instead of a meaningless 1e12.
  const LIMIT = 1e8;
  if (!Number.isFinite(mu) || Math.abs(mu) > LIMIT) return { mean: null, sd: null };
  if (!Number.isFinite(sd) || sd > LIMIT) return { mean: null, sd: null };
  return { mean: mu, sd };
}

/** Euler–Mascheroni constant, exported for callers that need it. */
export { EULER_GAMMA, TINY };
