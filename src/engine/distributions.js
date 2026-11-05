/**
 * dsh-distfit — distribution registry (pure ESM, zero dependencies).
 *
 * Every family object follows the contract in docs/DESIGN.md:
 *   { id, name, group, k, support, paramNames,
 *     params: [{ name, label, init }],
 *     pdf(x, p), cdf(x, p), quantile(q, p), initial(x), fit(x, options) }
 *
 * `pdf` / `cdf` / `quantile` take a plain params object keyed by `paramNames`
 * (ASCII keys, Chinese labels) — never scipy names.
 *
 * `initial(x)`  closed-form moment estimator (used as the fit start point).
 * `fit(x, o)`   returns { params, loglik, converged, iterations, start } and
 *               never throws (invalid optima yield converged:false).
 *
 * Internal (non-contract) helpers used by the generic optimizer:
 *   logpdf(x, p), prepare(x) -> ctx, sumLogpdf(ctx, p),
 *   pack(params) -> unconstrained vector, unpack(vector) -> params,
 *   valid(params, ctx), customFit(x, o, init) for closed-form MLEs.
 *
 * This module must stay free of `process`, `fs`, `window`, `require`.
 */

import {
  EULER_GAMMA,
  lgamma,
  gammaFn,
  gammaIncompleteP,
  betaIncomplete,
  erf,
  normCdf,
  logNormCdf,
  normInv,
  digamma,
  log1pexp,
  expit,
  mulberry32,
  nelderMead,
  bisect,
} from './special.js'

/* ------------------------------------------------------------------ *
 * numeric helpers
 * ------------------------------------------------------------------ */

const SQRT2PI = 2.5066282746310002
const LN_SQRT2PI = 0.9189385332046728
const LN_SQRT_2_OVER_PI = 0.5 * Math.log(2 / Math.PI)
const SQRT2 = Math.SQRT2
const Z75 = 0.6744897501960817

function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v)
}

function clamp01(v) {
  return v <= 0 ? 0 : v >= 1 ? 1 : v
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v
}

function sortedCopy(x) {
  return x.slice().sort((a, b) => a - b)
}

/** Type-7 (R default) sample quantile of an already sorted array. */
function sampleQuantile(sorted, p) {
  const n = sorted.length
  if (n === 0) return NaN
  if (n === 1) return sorted[0]
  const h = (n - 1) * p
  const i = Math.floor(h)
  const f = h - i
  if (i + 1 >= n) return sorted[n - 1]
  return sorted[i] + f * (sorted[i + 1] - sorted[i])
}

/** Lightweight descriptive statistics (stats.js is a sibling module). */
function dataStats(x) {
  const s = sortedCopy(x)
  const n = s.length
  let sum = 0
  for (let i = 0; i < n; i++) sum += s[i]
  const mean = sum / n
  let ss = 0
  for (let i = 0; i < n; i++) {
    const d = s[i] - mean
    ss += d * d
  }
  const variance = n > 1 ? ss / n : 0
  return {
    n,
    x: s,
    mean,
    variance,
    sd: Math.sqrt(variance),
    min: s[0],
    max: s[n - 1],
    median: sampleQuantile(s, 0.5),
    q1: sampleQuantile(s, 0.25),
    q3: sampleQuantile(s, 0.75),
  }
}

function logaddexp(a, b) {
  if (a === -Infinity) return b
  if (b === -Infinity) return a
  const m = a > b ? a : b
  return m + Math.log(Math.exp(a - m) + Math.exp(b - m))
}

function lbeta(a, b) {
  return lgamma(a) + lgamma(b) - lgamma(a + b)
}

/** Sum logpdf over ctx.x; returns -Infinity on any invalid (non-finite) term. */
function sumLogpdfGeneric(ctx, p, fn) {
  const xs = ctx.x
  let s = 0
  for (let i = 0; i < xs.length; i++) {
    const v = fn(xs[i], p)
    if (!isNum(v)) return -Infinity
    s += v
  }
  return s
}

function hashSeed(seed, str) {
  let h = (seed >>> 0) ^ 0x9e3779b9
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0
  }
  return h >>> 0
}

/** Inverse of the regularized lower incomplete gamma P(a, x), x > 0. */
function gammaQuantileUnit(q, a) {
  if (!(q > 0)) return 0
  if (q >= 1) return Infinity
  if (!(a > 0) || !isNum(a)) return NaN
  let hi = a > 1e-12 ? a : 1e-12
  let guard = 0
  while (gammaIncompleteP(a, hi) < q && guard++ < 400) hi *= 1.7
  if (!isNum(hi)) return Infinity
  const r = bisect((x) => gammaIncompleteP(a, x) - q, 0, hi, {
    tol: 1e-15,
    maxIter: 140,
  })
  return r.converged ? r.x : r.x
}

/** Inverse of the regularized incomplete beta I_x(a, b), x in (0,1). */
function betaQuantileUnit(q, a, b) {
  if (!(q > 0)) return 0
  if (q >= 1) return 1
  if (!(a > 0) || !(b > 0)) return NaN
  const r = bisect((x) => betaIncomplete(a, b, x) - q, 0, 1, {
    tol: 1e-15,
    maxIter: 120,
  })
  return r.converged ? r.x : r.x
}

/* ------------------------------------------------------------------ *
 * generic fit machinery
 * ------------------------------------------------------------------ */

function naFit(init, iterations) {
  return {
    params: init || null,
    loglik: -Infinity,
    converged: false,
    iterations: iterations || 0,
    start: init || null,
  }
}

/**
 * Attach a `fit` method to a family. Uses the moment estimator as the first
 * Nelder–Mead start, plus one jittered restart; keeps the best log-likelihood.
 * Families may override with `customFit` when the MLE is closed form.
 */
function attachFit(fam) {
  if (!fam.prepare) {
    fam.prepare = (x) => ({ x })
  }
  fam.fit = function (x, options) {
    try {
      return fitImpl(fam, x, options || {})
    } catch (err) {
      return naFit(null, 0)
    }
  }
}

function fitImpl(fam, x, o) {
  const n = x.length
  let init = null
  try {
    init = fam.initial(x)
  } catch (err) {
    init = null
  }
  if (!init || n < fam.k + 2) return naFit(init, 0)
  if (fam.customFit) return fam.customFit(x, o, init)

  const ctx = fam.prepare(x)
  const pack = (ctx && ctx.pack) || fam.pack
  const unpack = (ctx && ctx.unpack) || fam.unpack
  const u0 = pack(init)
  if (!Array.isArray(u0) || u0.length === 0) return naFit(init, 0)
  for (let i = 0; i < u0.length; i++) if (!isNum(u0[i])) return naFit(init, 0)

  const nll = (u) => {
    const p = unpack(u)
    if (!p) return Infinity
    if (fam.valid && !fam.valid(p, ctx)) return Infinity
    const ll = fam.sumLogpdf(ctx, p)
    return isNum(ll) ? -ll : Infinity
  }

  const maxIter = isNum(o.maxIter) ? o.maxIter : 400
  const tol = isNum(o.tol) ? o.tol : 1e-9
  const restarts = isNum(o.restarts) ? o.restarts : 1
  const seed = isNum(o.seed) ? o.seed : 20260101

  let bestU = null
  let bestF = Infinity
  let iterations = 0

  const f0 = nll(u0)
  if (isNum(f0)) bestF = f0
  if (f0 < Infinity) {
    const r = nelderMead(nll, u0, { maxIter, tol })
    iterations += r.iterations
    if (isNum(r.fx) && r.fx < bestF) {
      bestF = r.fx
      bestU = r.x.slice()
    }
  }

  if (restarts > 0) {
    const rng = mulberry32(hashSeed(seed, fam.id))
    const gauss = typeof rng.nextGauss === 'function' ? rng.nextGauss : null
    const u1 = new Array(u0.length)
    for (let i = 0; i < u0.length; i++) {
      const jitter = gauss ? gauss.call(rng) : 0
      u1[i] = u0[i] + 0.6 * jitter
    }
    const f1 = nll(u1)
    if (f1 < Infinity) {
      const r = nelderMead(nll, u1, {
        maxIter: Math.max(150, Math.floor(maxIter * 0.6)),
        tol: Math.max(tol * 10, 1e-8),
      })
      iterations += r.iterations
      if (isNum(r.fx) && r.fx < bestF) {
        bestF = r.fx
        bestU = r.x.slice()
      }
    }
  }

  if (!bestU) {
    if (isNum(f0) && f0 < Infinity) bestU = u0.slice()
    else return naFit(init, iterations)
  }

  const params = unpack(bestU)
  if (!params) return naFit(init, iterations)
  if (fam.valid && !fam.valid(params, ctx)) return naFit(init, iterations)

  // Report the exact full-sample log-likelihood of the returned parameters.
  let ll = 0
  for (let i = 0; i < n; i++) {
    const lp = fam.logpdf(x[i], params)
    if (!isNum(lp)) return naFit(init, iterations)
    ll += lp
  }
  if (!isNum(ll)) return naFit(init, iterations)

  return {
    params,
    loglik: ll,
    converged: true,
    iterations,
    start: init,
  }
}

/** Shared pack/unpack for location–scale style families. */
function packLocScale(p) {
  return [p.mu, Math.log(p.sigma)]
}

function makeUnpack(order) {
  // order: list of [key, 'id'|'log'] plus optional fixed extras
  return function unpack(u) {
    const p = {}
    for (let i = 0; i < order.length; i++) {
      const key = order[i][0]
      const mode = order[i][1]
      const v = mode === 'log' ? Math.exp(u[i]) : u[i]
      if (!isNum(v)) return null
      p[key] = v
    }
    return p
  }
}

/* ------------------------------------------------------------------ *
 * 1. normal
 * ------------------------------------------------------------------ */

const normal = {
  id: 'normal',
  name: '正态分布',
  group: '位置-尺度型',
  k: 2,
  support: 'real',
  paramNames: ['mu', 'sigma'],
  params: [
    { name: 'mu', label: 'μ 位置', init: 0 },
    { name: 'sigma', label: 'σ 尺度', init: 1 },
  ],
  pdf(x, p) {
    const lp = normal.logpdf(x, p)
    return lp === -Infinity ? 0 : Math.exp(lp)
  },
  logpdf(x, p) {
    const s = p.sigma
    if (!(s > 0) || !isNum(x) || !isNum(p.mu)) return NaN
    const z = (x - p.mu) / s
    return -0.5 * z * z - Math.log(s) - LN_SQRT2PI
  },
  cdf(x, p) {
    if (!(p.sigma > 0)) return NaN
    return clamp01(normCdf((x - p.mu) / p.sigma))
  },
  quantile(q, p) {
    if (q <= 0) return -Infinity
    if (q >= 1) return Infinity
    return p.mu + p.sigma * normInv(q)
  },
  initial(x) {
    const st = dataStats(x)
    return { mu: st.mean, sigma: Math.max(st.sd, 1e-12) }
  },
  prepare: (x) => ({ x }),
  sumLogpdf(ctx, p) {
    const xs = ctx.x
    const mu = p.mu
    const s = p.sigma
    const lnS = Math.log(s)
    let acc = 0
    for (let i = 0; i < xs.length; i++) {
      const z = (xs[i] - mu) / s
      const v = -0.5 * z * z - lnS - LN_SQRT2PI
      if (!isNum(v)) return -Infinity
      acc += v
    }
    return acc
  },
  pack: packLocScale,
  unpack: makeUnpack([['mu', 'id'], ['sigma', 'log']]),
  valid: (p) => isNum(p.mu) && p.sigma > 0,
}

/* ------------------------------------------------------------------ *
 * 2. logistic
 * ------------------------------------------------------------------ */

const logistic = {
  id: 'logistic',
  name: 'Logistic 分布',
  group: '位置-尺度型',
  k: 2,
  support: 'real',
  paramNames: ['mu', 's'],
  params: [
    { name: 'mu', label: 'μ 位置', init: 0 },
    { name: 's', label: 's 尺度', init: 1 },
  ],
  pdf(x, p) {
    const lp = logistic.logpdf(x, p)
    return lp === -Infinity ? 0 : Math.exp(lp)
  },
  logpdf(x, p) {
    const s = p.s
    if (!(s > 0) || !isNum(x) || !isNum(p.mu)) return NaN
    const z = (x - p.mu) / s
    return -z - Math.log(s) - 2 * log1pexp(-z)
  },
  cdf(x, p) {
    if (!(p.s > 0)) return NaN
    return clamp01(expit((x - p.mu) / p.s))
  },
  quantile(q, p) {
    if (q <= 0) return -Infinity
    if (q >= 1) return Infinity
    return p.mu + p.s * Math.log(q / (1 - q))
  },
  initial(x) {
    const st = dataStats(x)
    return { mu: st.median, s: Math.max((st.sd * Math.sqrt(3)) / Math.PI, 1e-12) }
  },
  prepare: (x) => ({ x }),
  sumLogpdf(ctx, p) {
    const xs = ctx.x
    const mu = p.mu
    const s = p.s
    const lnS = Math.log(s)
    let acc = 0
    for (let i = 0; i < xs.length; i++) {
      const z = (xs[i] - mu) / s
      const v = -z - lnS - 2 * log1pexp(-z)
      if (!isNum(v)) return -Infinity
      acc += v
    }
    return acc
  },
  pack: (p) => [p.mu, Math.log(p.s)],
  unpack: makeUnpack([['mu', 'id'], ['s', 'log']]),
  valid: (p) => isNum(p.mu) && p.s > 0,
}

/* ------------------------------------------------------------------ *
 * 3. laplace
 * ------------------------------------------------------------------ */

const laplace = {
  id: 'laplace',
  name: 'Laplace 分布',
  group: '位置-尺度型',
  k: 2,
  support: 'real',
  paramNames: ['mu', 'b'],
  params: [
    { name: 'mu', label: 'μ 位置', init: 0 },
    { name: 'b', label: 'b 尺度', init: 1 },
  ],
  pdf(x, p) {
    const b = p.b
    if (!(b > 0) || !isNum(x) || !isNum(p.mu)) return 0
    return Math.exp(-Math.abs(x - p.mu) / b) / (2 * b)
  },
  logpdf(x, p) {
    const b = p.b
    if (!(b > 0) || !isNum(x) || !isNum(p.mu)) return NaN
    return -Math.abs(x - p.mu) / b - Math.log(2 * b)
  },
  cdf(x, p) {
    const b = p.b
    if (!(b > 0)) return NaN
    const z = (x - p.mu) / b
    return z < 0 ? 0.5 * Math.exp(z) : clamp01(1 - 0.5 * Math.exp(-z))
  },
  quantile(q, p) {
    if (q <= 0) return -Infinity
    if (q >= 1) return Infinity
    return q < 0.5
      ? p.mu + p.b * Math.log(2 * q)
      : p.mu - p.b * Math.log(2 * (1 - q))
  },
  initial(x) {
    const st = dataStats(x)
    let mad = 0
    for (let i = 0; i < st.n; i++) mad += Math.abs(st.x[i] - st.median)
    mad /= Math.max(1, st.n)
    return { mu: st.median, b: Math.max(mad, 1e-12) }
  },
  prepare: (x) => ({ x }),
  sumLogpdf(ctx, p) {
    const xs = ctx.x
    const mu = p.mu
    const b = p.b
    const ln2b = Math.log(2 * b)
    let acc = 0
    for (let i = 0; i < xs.length; i++) {
      const v = -Math.abs(xs[i] - mu) / b - ln2b
      if (!isNum(v)) return -Infinity
      acc += v
    }
    return acc
  },
  pack: (p) => [p.mu, Math.log(p.b)],
  unpack: makeUnpack([['mu', 'id'], ['b', 'log']]),
  valid: (p) => isNum(p.mu) && p.b > 0,
}

/* ------------------------------------------------------------------ *
 * 4. cauchy
 * ------------------------------------------------------------------ */

const cauchy = {
  id: 'cauchy',
  name: 'Cauchy 分布',
  group: '位置-尺度型',
  k: 2,
  support: 'real',
  paramNames: ['x0', 'gamma'],
  params: [
    { name: 'x0', label: 'x₀ 位置', init: 0 },
    { name: 'gamma', label: 'γ 尺度', init: 1 },
  ],
  pdf(x, p) {
    const g = p.gamma
    if (!(g > 0) || !isNum(x) || !isNum(p.x0)) return 0
    const z = (x - p.x0) / g
    return 1 / (Math.PI * g * (1 + z * z))
  },
  logpdf(x, p) {
    const g = p.gamma
    if (!(g > 0) || !isNum(x) || !isNum(p.x0)) return NaN
    const z = (x - p.x0) / g
    return -Math.log(Math.PI * g) - Math.log1p(z * z)
  },
  cdf(x, p) {
    const g = p.gamma
    if (!(g > 0)) return NaN
    return clamp01(0.5 + Math.atan((x - p.x0) / g) / Math.PI)
  },
  quantile(q, p) {
    if (q <= 0) return -Infinity
    if (q >= 1) return Infinity
    if (q === 0.5) return p.x0
    const z =
      q < 0.5
        ? -1 / Math.tan(Math.PI * q)
        : 1 / Math.tan(Math.PI * (1 - q))
    return p.x0 + p.gamma * z
  },
  initial(x) {
    const st = dataStats(x)
    const g = (st.q3 - st.q1) / 2
    return {
      x0: st.median,
      gamma: Math.max(g > 0 ? g : st.sd, 1e-12),
    }
  },
  prepare: (x) => ({ x }),
  sumLogpdf(ctx, p) {
    const xs = ctx.x
    const g = p.gamma
    const x0 = p.x0
    const ln = Math.log(Math.PI * g)
    let acc = 0
    for (let i = 0; i < xs.length; i++) {
      const z = (xs[i] - x0) / g
      const v = -ln - Math.log1p(z * z)
      if (!isNum(v)) return -Infinity
      acc += v
    }
    return acc
  },
  pack: (p) => [p.x0, Math.log(p.gamma)],
  unpack: makeUnpack([['x0', 'id'], ['gamma', 'log']]),
  valid: (p) => isNum(p.x0) && p.gamma > 0,
}

/* ------------------------------------------------------------------ *
 * 5. uniform
 * ------------------------------------------------------------------ */

const uniform = {
  id: 'uniform',
  name: '均匀分布',
  group: '有界型',
  k: 2,
  support: 'real',
  paramNames: ['a', 'b'],
  params: [
    { name: 'a', label: 'a 下限', init: 0 },
    { name: 'b', label: 'b 上限', init: 1 },
  ],
  pdf(x, p) {
    const a = p.a
    const b = p.b
    if (!(b > a) || !isNum(x)) return 0
    return x < a || x > b ? 0 : 1 / (b - a)
  },
  logpdf(x, p) {
    const a = p.a
    const b = p.b
    if (!(b > a) || !isNum(x) || x < a || x > b) return -Infinity
    return -Math.log(b - a)
  },
  cdf(x, p) {
    const a = p.a
    const b = p.b
    if (!(b > a)) return NaN
    return clamp01((x - a) / (b - a))
  },
  quantile(q, p) {
    if (q <= 0) return p.a
    if (q >= 1) return p.b
    return p.a + q * (p.b - p.a)
  },
  initial(x) {
    const st = dataStats(x)
    return { a: st.min, b: st.max }
  },
  prepare: (x) => ({ x }),
  sumLogpdf(ctx, p) {
    const a = p.a
    const b = p.b
    if (!(b > a)) return -Infinity
    return -ctx.x.length * Math.log(b - a)
  },
  valid: (p) => isNum(p.a) && isNum(p.b) && p.b > p.a,
  customFit(x, o, init) {
    const st = dataStats(x)
    const a = st.min
    const b = st.max
    if (!(b > a)) return naFit(init, 0)
    const loglik = -st.n * Math.log(b - a)
    return {
      params: { a, b },
      loglik,
      converged: true,
      iterations: 0,
      start: { a, b },
    }
  },
}

/* ------------------------------------------------------------------ *
 * 6. lognormal
 * ------------------------------------------------------------------ */

const lognormal = {
  id: 'lognormal',
  name: '对数正态分布',
  group: '正偏寿命型',
  k: 2,
  support: 'positive',
  paramNames: ['mu', 'sigma'],
  params: [
    { name: 'mu', label: 'μ (ln x 均值)', init: 0 },
    { name: 'sigma', label: 'σ (ln x 标准差)', init: 1 },
  ],
  pdf(x, p) {
    const lp = lognormal.logpdf(x, p)
    return lp === -Infinity ? 0 : Math.exp(lp)
  },
  logpdf(x, p) {
    const s = p.sigma
    if (!(s > 0) || !(x > 0) || !isNum(p.mu)) return x > 0 ? NaN : -Infinity
    const u = Math.log(x)
    const z = (u - p.mu) / s
    return -u - Math.log(s) - LN_SQRT2PI - 0.5 * z * z
  },
  cdf(x, p) {
    if (!(p.sigma > 0)) return NaN
    if (!(x > 0)) return 0
    return clamp01(normCdf((Math.log(x) - p.mu) / p.sigma))
  },
  quantile(q, p) {
    if (q <= 0) return 0
    if (q >= 1) return Infinity
    return Math.exp(p.mu + p.sigma * normInv(q))
  },
  initial(x) {
    const st = dataStats(x)
    let s = 0
    let c = 0
    for (let i = 0; i < st.n; i++) {
      s += Math.log(st.x[i])
      c++
    }
    const m = s / c
    let ss = 0
    for (let i = 0; i < st.n; i++) {
      const d = Math.log(st.x[i]) - m
      ss += d * d
    }
    return { mu: m, sigma: Math.max(Math.sqrt(ss / c), 1e-9) }
  },
  prepare(x) {
    const lnx = new Array(x.length)
    for (let i = 0; i < x.length; i++) lnx[i] = Math.log(x[i])
    return { x, lnx }
  },
  sumLogpdf(ctx, p) {
    const u = ctx.lnx
    const mu = p.mu
    const s = p.sigma
    const lnS = Math.log(s)
    let acc = 0
    for (let i = 0; i < u.length; i++) {
      const z = (u[i] - mu) / s
      const v = -u[i] - lnS - LN_SQRT2PI - 0.5 * z * z
      if (!isNum(v)) return -Infinity
      acc += v
    }
    return acc
  },
  pack: packLocScale,
  unpack: makeUnpack([['mu', 'id'], ['sigma', 'log']]),
  valid: (p) => isNum(p.mu) && p.sigma > 0,
}

/* ------------------------------------------------------------------ *
 * 7. gamma
 * ------------------------------------------------------------------ */

const gamma = {
  id: 'gamma',
  name: 'Gamma 分布',
  group: '正偏寿命型',
  k: 2,
  support: 'positive',
  paramNames: ['alpha', 'beta'],
  params: [
    { name: 'alpha', label: 'α 形状', init: 2 },
    { name: 'beta', label: 'β 尺度', init: 1 },
  ],
  pdf(x, p) {
    const lp = gamma.logpdf(x, p)
    return lp === -Infinity ? 0 : Math.exp(lp)
  },
  logpdf(x, p) {
    const a = p.alpha
    const b = p.beta
    if (!(a > 0) || !(b > 0) || !isNum(p.alpha) || !isNum(p.beta)) return NaN
    if (!(x > 0)) return -Infinity
    return (a - 1) * Math.log(x) - x / b - lgamma(a) - a * Math.log(b)
  },
  cdf(x, p) {
    const a = p.alpha
    const b = p.beta
    if (!(a > 0) || !(b > 0)) return NaN
    if (!(x > 0)) return 0
    return clamp01(gammaIncompleteP(a, x / b))
  },
  quantile(q, p) {
    if (q <= 0) return 0
    if (q >= 1) return Infinity
    return p.beta * gammaQuantileUnit(q, p.alpha)
  },
  initial(x) {
    const st = dataStats(x)
    const m = st.mean
    const v = st.variance
    if (!(m > 0)) return null
    let a = v > 0 ? (m * m) / v : 1
    a = clamp(a, 0.05, 1e5)
    const b = m / a
    return { alpha: a, beta: b }
  },
  prepare(x) {
    const lnx = new Array(x.length)
    for (let i = 0; i < x.length; i++) lnx[i] = Math.log(x[i])
    return { x, lnx }
  },
  sumLogpdf(ctx, p) {
    const xs = ctx.x
    const lnx = ctx.lnx
    const a = p.alpha
    const b = p.beta
    const c = lgamma(a) + a * Math.log(b)
    let acc = 0
    for (let i = 0; i < xs.length; i++) {
      const v = (a - 1) * lnx[i] - xs[i] / b - c
      if (!isNum(v)) return -Infinity
      acc += v
    }
    return acc
  },
  pack: (p) => [Math.log(p.alpha), Math.log(p.beta)],
  unpack: makeUnpack([['alpha', 'log'], ['beta', 'log']]),
  valid: (p) => p.alpha > 0 && p.beta > 0,
}

/* ------------------------------------------------------------------ *
 * 8. weibull
 * ------------------------------------------------------------------ */

const weibull = {
  id: 'weibull',
  name: 'Weibull 分布',
  group: '正偏寿命型',
  k: 2,
  support: 'positive',
  paramNames: ['k', 'lambda'],
  params: [
    { name: 'k', label: 'k 形状', init: 2 },
    { name: 'lambda', label: 'λ 尺度', init: 1 },
  ],
  pdf(x, p) {
    const lp = weibull.logpdf(x, p)
    return lp === -Infinity ? 0 : Math.exp(lp)
  },
  logpdf(x, p) {
    const k = p.k
    const lam = p.lambda
    if (!(k > 0) || !(lam > 0) || !isNum(p.k) || !isNum(p.lambda)) return NaN
    if (!(x > 0)) return -Infinity
    const u = Math.log(x) - Math.log(lam)
    const t = Math.exp(k * u)
    if (!isNum(t)) return -1e300
    return Math.log(k) - Math.log(lam) + (k - 1) * u - t
  },
  cdf(x, p) {
    const k = p.k
    const lam = p.lambda
    if (!(k > 0) || !(lam > 0)) return NaN
    if (!(x > 0)) return 0
    const t = Math.exp(k * (Math.log(x) - Math.log(lam)))
    if (!isNum(t)) return 1
    return clamp01(-Math.expm1(-t))
  },
  quantile(q, p) {
    if (q <= 0) return 0
    if (q >= 1) return Infinity
    return p.lambda * Math.pow(-Math.log1p(-q), 1 / p.k)
  },
  initial(x) {
    const st = dataStats(x)
    let m = 0
    for (let i = 0; i < st.n; i++) m += Math.log(st.x[i])
    m /= st.n
    let ss = 0
    for (let i = 0; i < st.n; i++) {
      const d = Math.log(st.x[i]) - m
      ss += d * d
    }
    const sl = Math.sqrt(ss / st.n)
    // Var(ln X) = psi'(1)/k^2  =>  k = (pi/sqrt(6)) / sd(ln X)
    let k = sl > 1e-9 ? 1.282549830161864 / sl : 2
    k = clamp(k, 0.05, 100)
    const lam = Math.exp(m + EULER_GAMMA / k)
    return { k, lambda: Math.max(lam, 1e-12) }
  },
  prepare(x) {
    const lnx = new Array(x.length)
    for (let i = 0; i < x.length; i++) lnx[i] = Math.log(x[i])
    return { x, lnx }
  },
  sumLogpdf(ctx, p) {
    const u = ctx.lnx
    const k = p.k
    const lam = p.lambda
    const lnLam = Math.log(lam)
    const lnK = Math.log(k)
    let acc = 0
    for (let i = 0; i < u.length; i++) {
      const t = u[i] - lnLam
      const exp = Math.exp(k * t)
      if (!isNum(exp)) return -Infinity
      const v = lnK - lnLam + (k - 1) * t - exp
      if (!isNum(v)) return -Infinity
      acc += v
    }
    return acc
  },
  pack: (p) => [Math.log(p.k), Math.log(p.lambda)],
  unpack: makeUnpack([['k', 'log'], ['lambda', 'log']]),
  valid: (p) => p.k > 0 && p.lambda > 0,
}

/* ------------------------------------------------------------------ *
 * 9. exponential
 * ------------------------------------------------------------------ */

const exponential = {
  id: 'exponential',
  name: '指数分布',
  group: '正偏寿命型',
  k: 1,
  support: 'positive',
  paramNames: ['lambda'],
  params: [{ name: 'lambda', label: 'λ 尺度 (= 均值)', init: 1 }],
  pdf(x, p) {
    const lam = p.lambda
    if (!(lam > 0) || !isNum(x)) return 0
    if (x < 0) return 0
    return Math.exp(-x / lam) / lam
  },
  logpdf(x, p) {
    const lam = p.lambda
    if (!(lam > 0) || !isNum(x)) return NaN
    if (x < 0) return -Infinity
    return -x / lam - Math.log(lam)
  },
  cdf(x, p) {
    const lam = p.lambda
    if (!(lam > 0)) return NaN
    if (x <= 0) return 0
    return clamp01(-Math.expm1(-x / lam))
  },
  quantile(q, p) {
    if (q <= 0) return 0
    if (q >= 1) return Infinity
    return -p.lambda * Math.log1p(-q)
  },
  initial(x) {
    const st = dataStats(x)
    return { lambda: Math.max(st.mean, 1e-12) }
  },
  prepare: (x) => ({ x }),
  sumLogpdf(ctx, p) {
    const xs = ctx.x
    const lam = p.lambda
    const lnLam = Math.log(lam)
    let acc = 0
    for (let i = 0; i < xs.length; i++) {
      const v = -xs[i] / lam - lnLam
      if (!isNum(v)) return -Infinity
      acc += v
    }
    return acc
  },
  valid: (p) => p.lambda > 0,
  customFit(x, o, init) {
    const st = dataStats(x)
    const lam = st.mean
    if (!(lam > 0)) return naFit({ lambda: lam }, 0)
    const loglik = exponential.sumLogpdf({ x }, { lambda: lam })
    return {
      params: { lambda: lam },
      loglik,
      converged: isNum(loglik),
      iterations: 0,
      start: { lambda: lam },
    }
  },
}

/* ------------------------------------------------------------------ *
 * 10. rayleigh
 * ------------------------------------------------------------------ */

const rayleigh = {
  id: 'rayleigh',
  name: 'Rayleigh 分布',
  group: '正偏寿命型',
  k: 1,
  support: 'positive',
  paramNames: ['sigma'],
  params: [{ name: 'sigma', label: 'σ 尺度', init: 1 }],
  pdf(x, p) {
    const s = p.sigma
    if (!(s > 0) || !isNum(x) || x < 0) return 0
    return (x / (s * s)) * Math.exp(-(x * x) / (2 * s * s))
  },
  logpdf(x, p) {
    const s = p.sigma
    if (!(s > 0) || !isNum(x)) return NaN
    if (!(x > 0)) return -Infinity
    return Math.log(x) - 2 * Math.log(s) - (x * x) / (2 * s * s)
  },
  cdf(x, p) {
    const s = p.sigma
    if (!(s > 0)) return NaN
    if (x <= 0) return 0
    return clamp01(-Math.expm1(-(x * x) / (2 * s * s)))
  },
  quantile(q, p) {
    if (q <= 0) return 0
    if (q >= 1) return Infinity
    return p.sigma * Math.sqrt(-2 * Math.log1p(-q))
  },
  initial(x) {
    const st = dataStats(x)
    let s2 = 0
    for (let i = 0; i < st.n; i++) s2 += st.x[i] * st.x[i]
    return { sigma: Math.max(Math.sqrt(s2 / (2 * st.n)), 1e-12) }
  },
  prepare: (x) => ({ x }),
  sumLogpdf(ctx, p) {
    const xs = ctx.x
    const s = p.sigma
    const s2 = s * s
    let acc = 0
    for (let i = 0; i < xs.length; i++) {
      const v = Math.log(xs[i]) - 2 * Math.log(s) - (xs[i] * xs[i]) / (2 * s2)
      if (!isNum(v)) return -Infinity
      acc += v
    }
    return acc
  },
  valid: (p) => p.sigma > 0,
  customFit(x, o, init) {
    const st = dataStats(x)
    let s2 = 0
    for (let i = 0; i < st.n; i++) s2 += st.x[i] * st.x[i]
    const sigma = Math.sqrt(s2 / (2 * st.n))
    const loglik = rayleigh.sumLogpdf({ x }, { sigma })
    return {
      params: { sigma },
      loglik,
      converged: isNum(loglik) && sigma > 0,
      iterations: 0,
      start: { sigma },
    }
  },
}

/* ------------------------------------------------------------------ *
 * 11. inverse Gaussian
 * ------------------------------------------------------------------ */

const invgauss = {
  id: 'invgauss',
  name: '逆高斯分布',
  group: '正偏寿命型',
  k: 2,
  support: 'positive',
  paramNames: ['mu', 'lambda'],
  params: [
    { name: 'mu', label: 'μ 均值', init: 1 },
    { name: 'lambda', label: 'λ 形状', init: 1 },
  ],
  pdf(x, p) {
    const lp = invgauss.logpdf(x, p)
    return lp === -Infinity ? 0 : Math.exp(lp)
  },
  logpdf(x, p) {
    const mu = p.mu
    const lam = p.lambda
    if (!(mu > 0) || !(lam > 0) || !isNum(p.mu) || !isNum(p.lambda)) return NaN
    if (!(x > 0)) return -Infinity
    return (
      0.5 * Math.log(lam) -
      0.5 * Math.log(2 * Math.PI) -
      1.5 * Math.log(x) -
      (lam * (x - mu) * (x - mu)) / (2 * mu * mu * x)
    )
  },
  cdf(x, p) {
    const mu = p.mu
    const lam = p.lambda
    if (!(mu > 0) || !(lam > 0)) return NaN
    if (!(x > 0)) return 0
    const r = Math.sqrt(lam / x)
    const z1 = r * (x / mu - 1)
    const z2 = -r * (x / mu + 1)
    const logF = logaddexp(logNormCdf(z1), (2 * lam) / mu + logNormCdf(z2))
    return clamp01(logF >= 0 ? 1 : Math.exp(logF))
  },
  quantile(q, p) {
    const mu = p.mu
    const lam = p.lambda
    if (q <= 0) return 0
    if (q >= 1) return Infinity
    let hi = mu
    let guard = 0
    while (invgauss.cdf(hi, p) < q && guard++ < 400) hi *= 2
    if (!isNum(hi)) return Infinity
    const r = bisect((x) => invgauss.cdf(x, p) - q, 0, hi, {
      tol: 1e-14,
      maxIter: 140,
    })
    return r.x
  },
  initial(x) {
    const st = dataStats(x)
    const m = st.mean
    const v = st.variance
    const mu = Math.max(m, 1e-12)
    let lam = v > 0 ? (mu * mu * mu) / v : 1
    lam = clamp(lam, 1e-9, 1e12)
    return { mu, lambda: lam }
  },
  prepare: (x) => ({ x }),
  sumLogpdf(ctx, p) {
    const xs = ctx.x
    const mu = p.mu
    const lam = p.lambda
    const c = 0.5 * Math.log(lam) - 0.5 * Math.log(2 * Math.PI)
    const mu2 = mu * mu
    let acc = 0
    for (let i = 0; i < xs.length; i++) {
      const xi = xs[i]
      const d = xi - mu
      const v = c - 1.5 * Math.log(xi) - (lam * d * d) / (2 * mu2 * xi)
      if (!isNum(v)) return -Infinity
      acc += v
    }
    return acc
  },
  pack: (p) => [Math.log(p.mu), Math.log(p.lambda)],
  unpack: makeUnpack([['mu', 'log'], ['lambda', 'log']]),
  valid: (p) => p.mu > 0 && p.lambda > 0,
}

/* ------------------------------------------------------------------ *
 * 12. log-logistic (Fisk)
 * ------------------------------------------------------------------ */

const loglogistic = {
  id: 'loglogistic',
  name: '对数 Logistic',
  group: '正偏寿命型',
  k: 2,
  support: 'positive',
  paramNames: ['c', 'lambda'],
  params: [
    { name: 'c', label: 'c 形状', init: 2 },
    { name: 'lambda', label: 'λ 尺度', init: 1 },
  ],
  pdf(x, p) {
    const lp = loglogistic.logpdf(x, p)
    return lp === -Infinity ? 0 : Math.exp(lp)
  },
  logpdf(x, p) {
    const c = p.c
    const lam = p.lambda
    if (!(c > 0) || !(lam > 0) || !isNum(p.c) || !isNum(p.lambda)) return NaN
    if (!(x > 0)) return -Infinity
    const u = Math.log(x) - Math.log(lam)
    return Math.log(c) - Math.log(lam) + (c - 1) * u - 2 * log1pexp(c * u)
  },
  cdf(x, p) {
    const c = p.c
    const lam = p.lambda
    if (!(c > 0) || !(lam > 0)) return NaN
    if (!(x > 0)) return 0
    return clamp01(expit(c * (Math.log(x) - Math.log(lam))))
  },
  quantile(q, p) {
    if (q <= 0) return 0
    if (q >= 1) return Infinity
    return p.lambda * Math.pow(q / (1 - q), 1 / p.c)
  },
  initial(x) {
    const st = dataStats(x)
    const ratio = st.q3 / st.q1
    let c = ratio > 1 + 1e-9 ? Math.log(9) / Math.log(ratio) : 2
    c = clamp(c, 0.05, 100)
    return { c, lambda: Math.max(st.median, 1e-12) }
  },
  prepare(x) {
    const lnx = new Array(x.length)
    for (let i = 0; i < x.length; i++) lnx[i] = Math.log(x[i])
    return { x, lnx }
  },
  sumLogpdf(ctx, p) {
    const u0 = ctx.lnx
    const c = p.c
    const lam = p.lambda
    const lnLam = Math.log(lam)
    const lnC = Math.log(c)
    let acc = 0
    for (let i = 0; i < u0.length; i++) {
      const u = u0[i] - lnLam
      const v = lnC - lnLam + (c - 1) * u - 2 * log1pexp(c * u)
      if (!isNum(v)) return -Infinity
      acc += v
    }
    return acc
  },
  pack: (p) => [Math.log(p.c), Math.log(p.lambda)],
  unpack: makeUnpack([['c', 'log'], ['lambda', 'log']]),
  valid: (p) => p.c > 0 && p.lambda > 0,
}

/* ------------------------------------------------------------------ *
 * 13. Lomax (Pareto type II)
 * ------------------------------------------------------------------ */

const lomax = {
  id: 'lomax',
  name: 'Lomax 分布 (Pareto II)',
  group: '正偏寿命型',
  k: 2,
  support: 'positive',
  paramNames: ['alpha', 'lambda'],
  params: [
    { name: 'alpha', label: 'α 形状', init: 3 },
    { name: 'lambda', label: 'λ 尺度', init: 1 },
  ],
  pdf(x, p) {
    const lp = lomax.logpdf(x, p)
    return lp === -Infinity ? 0 : Math.exp(lp)
  },
  logpdf(x, p) {
    const a = p.alpha
    const lam = p.lambda
    if (!(a > 0) || !(lam > 0) || !isNum(p.alpha) || !isNum(p.lambda)) return NaN
    if (!(x >= 0)) return -Infinity
    if (x === 0) return Math.log(a) - Math.log(lam) // pdf(0) = α/λ
    return -Math.log(lam) + Math.log(a) - (a + 1) * log1pexp(Math.log(x) - Math.log(lam))
  },
  cdf(x, p) {
    const a = p.alpha
    const lam = p.lambda
    if (!(a > 0) || !(lam > 0)) return NaN
    if (!(x > 0)) return 0
    return clamp01(-Math.expm1(-a * log1pexp(Math.log(x) - Math.log(lam))))
  },
  quantile(q, p) {
    if (q <= 0) return 0
    if (q >= 1) return Infinity
    return p.lambda * Math.expm1(-Math.log1p(-q) / p.alpha)
  },
  initial(x) {
    const st = dataStats(x)
    const m = st.mean
    const v = st.variance
    const r = m > 0 ? v / (m * m) : 0
    let a
    let lam
    if (r > 1.02) {
      a = (2 * r) / (r - 1)
      a = clamp(a, 0.2, 200)
      lam = m * (a - 1)
      if (!(lam > 0)) lam = st.median / Math.max(Math.expm1(Math.LN2 / a), 1e-9)
    } else {
      a = 2.5
      lam = st.median / Math.max(Math.expm1(Math.LN2 / a), 1e-9)
    }
    return { alpha: a, lambda: Math.max(lam, 1e-12) }
  },
  prepare(x) {
    const lnx = new Array(x.length)
    for (let i = 0; i < x.length; i++) lnx[i] = Math.log(x[i])
    return { x, lnx }
  },
  sumLogpdf(ctx, p) {
    const u0 = ctx.lnx
    const a = p.alpha
    const lam = p.lambda
    const c = Math.log(a) - Math.log(lam)
    let acc = 0
    for (let i = 0; i < u0.length; i++) {
      const v = c - (a + 1) * log1pexp(u0[i] - Math.log(lam))
      if (!isNum(v)) return -Infinity
      acc += v
    }
    return acc
  },
  pack: (p) => [Math.log(p.alpha), Math.log(p.lambda)],
  unpack: makeUnpack([['alpha', 'log'], ['lambda', 'log']]),
  valid: (p) => p.alpha > 0 && p.lambda > 0,
}

/* ------------------------------------------------------------------ *
 * 14. Burr XII
 * ------------------------------------------------------------------ */

const burr = {
  id: 'burr',
  name: 'Burr XII 分布',
  group: '正偏寿命型',
  k: 3,
  support: 'positive',
  paramNames: ['c', 'k', 'lambda'],
  params: [
    { name: 'c', label: 'c 形状', init: 2 },
    { name: 'k', label: 'k 形状', init: 2 },
    { name: 'lambda', label: 'λ 尺度', init: 1 },
  ],
  pdf(x, p) {
    const lp = burr.logpdf(x, p)
    return lp === -Infinity ? 0 : Math.exp(lp)
  },
  logpdf(x, p) {
    const c = p.c
    const k = p.k
    const lam = p.lambda
    if (!(c > 0) || !(k > 0) || !(lam > 0)) return NaN
    if (!isNum(p.c) || !isNum(p.k) || !isNum(p.lambda)) return NaN
    if (!(x > 0)) return -Infinity
    const u = Math.log(x) - Math.log(lam)
    return Math.log(c) + Math.log(k) - Math.log(lam) + (c - 1) * u - (k + 1) * log1pexp(c * u)
  },
  cdf(x, p) {
    const c = p.c
    const k = p.k
    const lam = p.lambda
    if (!(c > 0) || !(k > 0) || !(lam > 0)) return NaN
    if (!(x > 0)) return 0
    return clamp01(-Math.expm1(-k * log1pexp(c * (Math.log(x) - Math.log(lam)))))
  },
  quantile(q, p) {
    if (q <= 0) return 0
    if (q >= 1) return Infinity
    const t = Math.expm1(-Math.log1p(-q) / p.k)
    return p.lambda * Math.pow(t, 1 / p.c)
  },
  initial(x) {
    const st = dataStats(x)
    if (st.n < 5 || !(st.min > 0)) return null
    const probs = [0.1, 0.3, 0.5, 0.7, 0.9]
    const emp = probs.map((p) => Math.log(sampleQuantile(st.x, p)))
    const lnMed = Math.log(st.median)
    const resid = (u) => {
      const c = Math.exp(u[0])
      const k = Math.exp(u[1])
      const lam = Math.exp(u[2])
      let s = 0
      for (let j = 0; j < probs.length; j++) {
        const sN = -Math.log1p(-probs[j]) / k
        const t = Math.expm1(sN)
        if (!(t > 0)) return 1e6
        const pred = Math.log(lam) + Math.log(t) / c
        const d = pred - emp[j]
        s += d * d
      }
      return s
    }
    const r = nelderMead(resid, [Math.log(1.5), Math.log(1.5), lnMed], {
      maxIter: 240,
      tol: 1e-10,
    })
    if (r.converged && isNum(r.fx) && r.fx < 1e-4) {
      return {
        c: clamp(Math.exp(r.x[0]), 0.05, 100),
        k: clamp(Math.exp(r.x[1]), 0.05, 100),
        lambda: clamp(Math.exp(r.x[2]), 1e-12, 1e12),
      }
    }
    return { c: 1.5, k: 1.5, lambda: Math.max(st.median, 1e-12) }
  },
  prepare(x) {
    const lnx = new Array(x.length)
    for (let i = 0; i < x.length; i++) lnx[i] = Math.log(x[i])
    return { x, lnx }
  },
  sumLogpdf(ctx, p) {
    const u0 = ctx.lnx
    const c = p.c
    const k = p.k
    const lam = p.lambda
    const lnLam = Math.log(lam)
    const cc = Math.log(c) + Math.log(k) - lnLam
    let acc = 0
    for (let i = 0; i < u0.length; i++) {
      const u = u0[i] - lnLam
      const v = cc + (c - 1) * u - (k + 1) * log1pexp(c * u)
      if (!isNum(v)) return -Infinity
      acc += v
    }
    return acc
  },
  pack: (p) => [Math.log(p.c), Math.log(p.k), Math.log(p.lambda)],
  unpack: makeUnpack([['c', 'log'], ['k', 'log'], ['lambda', 'log']]),
  valid: (p) => p.c > 0 && p.k > 0 && p.lambda > 0,
}

/* ------------------------------------------------------------------ *
 * 15. fatigue life (Birnbaum–Saunders)
 * ------------------------------------------------------------------ */

const fatiguelife = {
  id: 'fatiguelife',
  name: '疲劳寿命分布 (BS)',
  group: '正偏寿命型',
  k: 2,
  support: 'positive',
  paramNames: ['beta', 'c'],
  params: [
    { name: 'beta', label: 'β 尺度', init: 1 },
    { name: 'c', label: 'c 形状', init: 1 },
  ],
  pdf(x, p) {
    const lp = fatiguelife.logpdf(x, p)
    return lp === -Infinity ? 0 : Math.exp(lp)
  },
  logpdf(x, p) {
    const beta = p.beta
    const c = p.c
    if (!(beta > 0) || !(c > 0) || !isNum(p.beta) || !isNum(p.c)) return NaN
    if (!(x > 0)) return -Infinity
    const z = (Math.sqrt(x / beta) - Math.sqrt(beta / x)) / c
    return (
      -0.5 * z * z -
      LN_SQRT2PI -
      Math.log(2 * c) -
      0.5 * Math.log(beta) -
      1.5 * Math.log(x) +
      Math.log(x + beta)
    )
  },
  cdf(x, p) {
    const beta = p.beta
    const c = p.c
    if (!(beta > 0) || !(c > 0)) return NaN
    if (!(x > 0)) return 0
    const z = (Math.sqrt(x / beta) - Math.sqrt(beta / x)) / c
    return clamp01(normCdf(z))
  },
  quantile(q, p) {
    if (q <= 0) return 0
    if (q >= 1) return Infinity
    const z = normInv(q)
    const c = p.c
    const t = (c * z + Math.sqrt(c * c * z * z + 4)) / 2
    return p.beta * t * t
  },
  initial(x) {
    const st = dataStats(x)
    const beta = Math.max(st.median, 1e-12)
    const q75 = sampleQuantile(st.x, 0.75)
    const t = Math.sqrt(Math.max(q75, 1e-300) / beta)
    const c = (t - 1 / t) / Z75
    return { beta, c: clamp(c, 0.02, 50) }
  },
  prepare(x) {
    const lnx = new Array(x.length)
    for (let i = 0; i < x.length; i++) lnx[i] = Math.log(x[i])
    return { x, lnx }
  },
  sumLogpdf(ctx, p) {
    const xs = ctx.x
    const beta = p.beta
    const c = p.c
    const lnBeta = Math.log(beta)
    const cst = -LN_SQRT2PI - Math.log(2 * c) - 0.5 * lnBeta
    let acc = 0
    for (let i = 0; i < xs.length; i++) {
      const xi = xs[i]
      const z = (Math.sqrt(xi / beta) - Math.sqrt(beta / xi)) / c
      const v = -0.5 * z * z + cst - 1.5 * Math.log(xi) + Math.log(xi + beta)
      if (!isNum(v)) return -Infinity
      acc += v
    }
    return acc
  },
  pack: (p) => [Math.log(p.beta), Math.log(p.c)],
  unpack: makeUnpack([['beta', 'log'], ['c', 'log']]),
  valid: (p) => p.beta > 0 && p.c > 0,
}

/* ------------------------------------------------------------------ *
 * 16. Nakagami
 * ------------------------------------------------------------------ */

const nakagami = {
  id: 'nakagami',
  name: 'Nakagami 分布',
  group: '正偏寿命型',
  k: 2,
  support: 'positive',
  paramNames: ['nu', 'omega'],
  params: [
    { name: 'nu', label: 'ν 形状', init: 2 },
    { name: 'omega', label: 'ω 尺度²', init: 1 },
  ],
  pdf(x, p) {
    const lp = nakagami.logpdf(x, p)
    return lp === -Infinity ? 0 : Math.exp(lp)
  },
  logpdf(x, p) {
    const nu = p.nu
    const om = p.omega
    if (!(nu > 0) || !(om > 0) || !isNum(p.nu) || !isNum(p.omega)) return NaN
    if (!(x > 0)) return -Infinity
    return (
      Math.log(2) +
      nu * Math.log(nu) -
      lgamma(nu) -
      nu * Math.log(om) +
      (2 * nu - 1) * Math.log(x) -
      (nu * x * x) / om
    )
  },
  cdf(x, p) {
    const nu = p.nu
    const om = p.omega
    if (!(nu > 0) || !(om > 0)) return NaN
    if (!(x > 0)) return 0
    return clamp01(gammaIncompleteP(nu, (nu * x * x) / om))
  },
  quantile(q, p) {
    if (q <= 0) return 0
    if (q >= 1) return Infinity
    const g = gammaQuantileUnit(q, p.nu)
    return Math.sqrt((p.omega / p.nu) * g)
  },
  initial(x) {
    const st = dataStats(x)
    let m2 = 0
    for (let i = 0; i < st.n; i++) m2 += st.x[i] * st.x[i]
    m2 /= st.n
    let v2 = 0
    for (let i = 0; i < st.n; i++) {
      const d = st.x[i] * st.x[i] - m2
      v2 += d * d
    }
    v2 /= st.n
    const nu = v2 > 0 ? (m2 * m2) / v2 : 2
    return { nu: clamp(nu, 0.05, 200), omega: Math.max(m2, 1e-12) }
  },
  prepare(x) {
    const n = x.length
    const lnx = new Array(n)
    const x2 = new Array(n)
    for (let i = 0; i < n; i++) {
      lnx[i] = Math.log(x[i])
      x2[i] = x[i] * x[i]
    }
    return { x, lnx, x2 }
  },
  sumLogpdf(ctx, p) {
    const lnx = ctx.lnx
    const x2 = ctx.x2
    const nu = p.nu
    const om = p.omega
    const c = Math.log(2) + nu * Math.log(nu) - lgamma(nu) - nu * Math.log(om)
    const nuOverOm = nu / om
    let acc = 0
    for (let i = 0; i < lnx.length; i++) {
      const v = c + (2 * nu - 1) * lnx[i] - nuOverOm * x2[i]
      if (!isNum(v)) return -Infinity
      acc += v
    }
    return acc
  },
  pack: (p) => [Math.log(p.nu), Math.log(p.omega)],
  unpack: makeUnpack([['nu', 'log'], ['omega', 'log']]),
  valid: (p) => p.nu > 0 && p.omega > 0,
}

/* ------------------------------------------------------------------ *
 * 17. Maxwell
 * ------------------------------------------------------------------ */

const maxwell = {
  id: 'maxwell',
  name: 'Maxwell 分布',
  group: '正偏寿命型',
  k: 1,
  support: 'positive',
  paramNames: ['a'],
  params: [{ name: 'a', label: 'a 尺度', init: 1 }],
  pdf(x, p) {
    const a = p.a
    if (!(a > 0) || !isNum(x)) return 0
    if (!(x > 0)) return 0
    return Math.sqrt(2 / Math.PI) * (x * x) * Math.exp(-(x * x) / (2 * a * a)) / (a * a * a)
  },
  logpdf(x, p) {
    const a = p.a
    if (!(a > 0) || !isNum(x)) return NaN
    if (!(x > 0)) return -Infinity
    return LN_SQRT_2_OVER_PI + 2 * Math.log(x) - 3 * Math.log(a) - (x * x) / (2 * a * a)
  },
  cdf(x, p) {
    const a = p.a
    if (!(a > 0)) return NaN
    if (x <= 0) return 0
    return clamp01(gammaIncompleteP(1.5, (x * x) / (2 * a * a)))
  },
  quantile(q, p) {
    if (q <= 0) return 0
    if (q >= 1) return Infinity
    return p.a * Math.sqrt(2 * gammaQuantileUnit(q, 1.5))
  },
  initial(x) {
    const st = dataStats(x)
    let s2 = 0
    for (let i = 0; i < st.n; i++) s2 += st.x[i] * st.x[i]
    return { a: Math.max(Math.sqrt(s2 / (3 * st.n)), 1e-12) }
  },
  prepare: (x) => ({ x }),
  sumLogpdf(ctx, p) {
    const xs = ctx.x
    const a = p.a
    const a2 = a * a
    const c = LN_SQRT_2_OVER_PI - 3 * Math.log(a)
    let acc = 0
    for (let i = 0; i < xs.length; i++) {
      const v = c + 2 * Math.log(xs[i]) - (xs[i] * xs[i]) / (2 * a2)
      if (!isNum(v)) return -Infinity
      acc += v
    }
    return acc
  },
  valid: (p) => p.a > 0,
  customFit(x, o, init) {
    const st = dataStats(x)
    let s2 = 0
    for (let i = 0; i < st.n; i++) s2 += st.x[i] * st.x[i]
    const a = Math.sqrt(s2 / (3 * st.n))
    const loglik = maxwell.sumLogpdf({ x }, { a })
    return {
      params: { a },
      loglik,
      converged: isNum(loglik) && a > 0,
      iterations: 0,
      start: { a },
    }
  },
}

/* ------------------------------------------------------------------ *
 * 18. chi-square
 * ------------------------------------------------------------------ */

const chi2 = {
  id: 'chi2',
  name: '卡方分布',
  group: '正偏寿命型',
  k: 1,
  support: 'positive',
  paramNames: ['df'],
  params: [{ name: 'df', label: 'df 自由度', init: 4 }],
  pdf(x, p) {
    const lp = chi2.logpdf(x, p)
    return lp === -Infinity ? 0 : Math.exp(lp)
  },
  logpdf(x, p) {
    const df = p.df
    if (!(df > 0) || !isNum(p.df)) return NaN
    if (!(x > 0)) return -Infinity
    const h = df / 2
    return (h - 1) * Math.log(x) - x / 2 - h * Math.LN2 - lgamma(h)
  },
  cdf(x, p) {
    const df = p.df
    if (!(df > 0)) return NaN
    if (x <= 0) return 0
    return clamp01(gammaIncompleteP(df / 2, x / 2))
  },
  quantile(q, p) {
    if (q <= 0) return 0
    if (q >= 1) return Infinity
    return 2 * gammaQuantileUnit(q, p.df / 2)
  },
  initial(x) {
    const st = dataStats(x)
    return { df: clamp(st.mean, 1e-3, 1e7) }
  },
  prepare: (x) => ({ x }),
  sumLogpdf(ctx, p) {
    const xs = ctx.x
    const h = p.df / 2
    const c = -h * Math.LN2 - lgamma(h)
    let acc = 0
    for (let i = 0; i < xs.length; i++) {
      const v = (h - 1) * Math.log(xs[i]) - xs[i] / 2 + c
      if (!isNum(v)) return -Infinity
      acc += v
    }
    return acc
  },
  valid: (p) => p.df > 0,
  customFit(x, o, init) {
    const st = dataStats(x)
    let sumX = 0
    let sumLn = 0
    for (let i = 0; i < st.n; i++) {
      const v = st.x[i]
      if (!(v > 0)) return naFit({ df: st.mean }, 0)
      sumX += v
      sumLn += Math.log(v)
    }
    const mean = sumX / st.n
    const meanLn = sumLn / st.n
    const target = Math.log(mean) - meanLn
    let df
    if (!(target > 1e-9)) {
      // nearly degenerate data: variance-based moment fallback
      df = st.variance > 0 ? (2 * mean * mean) / st.variance : 1e6
    } else {
      const g = (nu) => Math.log(nu / 2) - digamma(nu / 2) - target
      let lo = 1e-6
      let hi = Math.max(4 * mean, 1)
      let guard = 0
      while (g(hi) > 0 && guard++ < 200) hi *= 2
      for (let i = 0; i < 200; i++) {
        const mid = 0.5 * (lo + hi)
        if (g(mid) > 0) lo = mid
        else hi = mid
      }
      df = 0.5 * (lo + hi)
    }
    if (!(df > 0) || !isNum(df)) return naFit({ df: st.mean }, 1)
    const loglik = chi2.sumLogpdf({ x }, { df })
    return {
      params: { df },
      loglik,
      converged: isNum(loglik),
      iterations: 1,
      start: { df: st.mean },
    }
  },
}

/* ------------------------------------------------------------------ *
 * 19. half-normal
 * ------------------------------------------------------------------ */

const halfnormal = {
  id: 'halfnormal',
  name: '半正态分布',
  group: '正偏寿命型',
  k: 1,
  support: 'positive',
  paramNames: ['sigma'],
  params: [{ name: 'sigma', label: 'σ 尺度', init: 1 }],
  pdf(x, p) {
    const lp = halfnormal.logpdf(x, p)
    return lp === -Infinity ? 0 : Math.exp(lp)
  },
  logpdf(x, p) {
    const s = p.sigma
    if (!(s > 0) || !isNum(p.sigma)) return NaN
    if (x < 0) return -Infinity
    return LN_SQRT_2_OVER_PI - Math.log(s) - (x * x) / (2 * s * s)
  },
  cdf(x, p) {
    const s = p.sigma
    if (!(s > 0)) return NaN
    if (x <= 0) return 0
    return clamp01(erf(x / (s * SQRT2)))
  },
  quantile(q, p) {
    if (q <= 0) return 0
    if (q >= 1) return Infinity
    return p.sigma * normInv(0.5 * (1 + q))
  },
  initial(x) {
    const st = dataStats(x)
    let s2 = 0
    for (let i = 0; i < st.n; i++) s2 += st.x[i] * st.x[i]
    return { sigma: Math.max(Math.sqrt(s2 / st.n), 1e-12) }
  },
  prepare: (x) => ({ x }),
  sumLogpdf(ctx, p) {
    const xs = ctx.x
    const s = p.sigma
    const s2 = s * s
    const c = LN_SQRT_2_OVER_PI - Math.log(s)
    let acc = 0
    for (let i = 0; i < xs.length; i++) {
      const v = c - (xs[i] * xs[i]) / (2 * s2)
      if (!isNum(v)) return -Infinity
      acc += v
    }
    return acc
  },
  valid: (p) => p.sigma > 0,
  customFit(x, o, init) {
    const st = dataStats(x)
    let s2 = 0
    for (let i = 0; i < st.n; i++) s2 += st.x[i] * st.x[i]
    const sigma = Math.sqrt(s2 / st.n)
    const loglik = halfnormal.sumLogpdf({ x }, { sigma })
    return {
      params: { sigma },
      loglik,
      converged: isNum(loglik) && sigma > 0,
      iterations: 0,
      start: { sigma },
    }
  },
}

/* ------------------------------------------------------------------ *
 * 20. beta (a, b, loc, scale)
 * ------------------------------------------------------------------ */

/**
 * Beta support frame.  The four parameters (a, b, loc, scale) are estimated
 * jointly by maximum likelihood: loc = min(x) - padLo and
 * loc + scale = max(x) + padHi, with padLo, padHi > 0 unknown.  The padding
 * keeps every observation strictly inside the support (required for a, b > 1).
 */
function betaFrame(x) {
  const st = dataStats(x)
  const r = st.max - st.min
  if (!(r > 0)) return null
  return { st, r, tiny: 1e-9 * r, pad0: 0.02 * r }
}

const beta = {
  id: 'beta',
  name: 'Beta 分布',
  group: '有界型',
  k: 4,
  support: 'real',
  paramNames: ['a', 'b', 'loc', 'scale'],
  params: [
    { name: 'a', label: 'a 形状', init: 2 },
    { name: 'b', label: 'b 形状', init: 2 },
    { name: 'loc', label: 'loc 下限', init: 0 },
    { name: 'scale', label: 'scale 区间宽度', init: 1 },
  ],
  pdf(x, p) {
    const lp = beta.logpdf(x, p)
    return lp === -Infinity ? 0 : Math.exp(lp)
  },
  logpdf(x, p) {
    const a = p.a
    const b = p.b
    const loc = p.loc
    const scale = p.scale
    if (!(a > 0) || !(b > 0) || !(scale > 0) || !isNum(p.a) || !isNum(p.b)) return NaN
    if (!isNum(x)) return NaN
    const u = (x - loc) / scale
    if (!(u > 0) || !(u < 1)) return -Infinity
    return -lbeta(a, b) - Math.log(scale) + (a - 1) * Math.log(u) + (b - 1) * Math.log(1 - u)
  },
  cdf(x, p) {
    const a = p.a
    const b = p.b
    if (!(a > 0) || !(b > 0) || !(p.scale > 0)) return NaN
    const u = (x - p.loc) / p.scale
    if (!(u > 0)) return 0
    if (u >= 1) return 1
    return clamp01(betaIncomplete(a, b, u))
  },
  quantile(q, p) {
    if (q <= 0) return p.loc
    if (q >= 1) return p.loc + p.scale
    return p.loc + p.scale * betaQuantileUnit(q, p.a, p.b)
  },
  initial(x) {
    const fr = betaFrame(x)
    if (!fr) return null
    const { st, r, pad0 } = fr
    const loc = st.min - pad0
    const scale = r + 2 * pad0
    let m = 0
    for (let i = 0; i < st.n; i++) m += (st.x[i] - loc) / scale
    m /= st.n
    let v = 0
    for (let i = 0; i < st.n; i++) {
      const d = (st.x[i] - loc) / scale - m
      v += d * d
    }
    v /= st.n
    let a = 2
    let b = 2
    const common = v > 0 ? (m * (1 - m)) / v - 1 : 0
    const am = m * common
    const bm = (1 - m) * common
    if (am > 0.01 && bm > 0.01 && isNum(am) && isNum(bm)) {
      a = clamp(am, 0.01, 500)
      b = clamp(bm, 0.01, 500)
    }
    return { a, b, loc, scale }
  },
  prepare(x) {
    const fr = betaFrame(x)
    if (!fr) return null
    const { st, r, tiny, pad0 } = fr
    const min = st.min
    const max = st.max
    const xs = st.x
    const n = st.n
    const pack = (p) => [
      Math.log(p.a),
      Math.log(p.b),
      Math.log(Math.max(min - p.loc, tiny)),
      Math.log(Math.max(p.loc + p.scale - max, tiny)),
    ]
    const unpack = (vec) => {
      const a = Math.exp(vec[0])
      const b = Math.exp(vec[1])
      let padLo = Math.exp(vec[2])
      let padHi = Math.exp(vec[3])
      if (!isNum(a) || !isNum(b) || a <= 0 || b <= 0) return null
      if (!isNum(padLo) || !isNum(padHi)) return null
      padLo = Math.min(padLo, 1e6 * r)
      padHi = Math.min(padHi, 1e6 * r)
      if (!(padLo > 0) || !(padHi > 0)) return null
      return { a, b, loc: min - padLo, scale: r + padLo + padHi }
    }
    return {
      x: xs,
      n,
      loc: min - pad0,
      scale: r + 2 * pad0,
      pack,
      unpack,
    }
  },
  sumLogpdf(ctx, p) {
    const xs = ctx.x
    const n = ctx.n
    const a = p.a
    const b = p.b
    const loc = p.loc
    const scale = p.scale
    if (!(scale > 0)) return -Infinity
    const c = -lbeta(a, b) - Math.log(scale)
    let acc = 0
    for (let i = 0; i < n; i++) {
      const u = (xs[i] - loc) / scale
      if (!(u > 0) || !(u < 1)) return -Infinity
      const v = c + (a - 1) * Math.log(u) + (b - 1) * Math.log1p(-u)
      if (!isNum(v)) return -Infinity
      acc += v
    }
    return acc
  },
  pack: (p) => [Math.log(p.a), Math.log(p.b), 0, 0],
  unpack: makeUnpack([['a', 'log'], ['b', 'log'], ['loc', 'id'], ['scale', 'log']]),
  valid: (p) =>
    isNum(p.loc) &&
    isNum(p.scale) &&
    p.a > 0 &&
    p.b > 0 &&
    p.scale > 0,
}

/* ------------------------------------------------------------------ *
 * 21. Gumbel (max; location β, scale α)
 * ------------------------------------------------------------------ */

const gumbel = {
  id: 'gumbel',
  name: '极值 I 型 (Gumbel)',
  group: '极值型',
  k: 2,
  support: 'real',
  paramNames: ['beta', 'alpha'],
  params: [
    { name: 'beta', label: 'β 位置', init: 0 },
    { name: 'alpha', label: 'α 尺度', init: 1 },
  ],
  pdf(x, p) {
    const lp = gumbel.logpdf(x, p)
    return lp === -Infinity ? 0 : Math.exp(lp)
  },
  logpdf(x, p) {
    const a = p.alpha
    if (!(a > 0) || !isNum(p.alpha) || !isNum(p.beta)) return NaN
    const z = (x - p.beta) / a
    return -Math.log(a) - z - Math.exp(-z)
  },
  cdf(x, p) {
    const a = p.alpha
    if (!(a > 0)) return NaN
    const z = (x - p.beta) / a
    return clamp01(Math.exp(-Math.exp(-z)))
  },
  quantile(q, p) {
    if (q <= 0) return -Infinity
    if (q >= 1) return Infinity
    return p.beta - p.alpha * Math.log(-Math.log(q))
  },
  initial(x) {
    const st = dataStats(x)
    const a = (st.sd * Math.sqrt(6)) / Math.PI
    return { beta: st.mean - EULER_GAMMA * a, alpha: Math.max(a, 1e-12) }
  },
  prepare: (x) => ({ x }),
  sumLogpdf(ctx, p) {
    const xs = ctx.x
    const a = p.alpha
    const beta = p.beta
    const lnA = Math.log(a)
    let acc = 0
    for (let i = 0; i < xs.length; i++) {
      const z = (xs[i] - beta) / a
      const v = -lnA - z - Math.exp(-z)
      if (!isNum(v)) return -Infinity
      acc += v
    }
    return acc
  },
  pack: (p) => [p.beta, Math.log(p.alpha)],
  unpack: makeUnpack([['beta', 'id'], ['alpha', 'log']]),
  valid: (p) => isNum(p.beta) && p.alpha > 0,
}

/* ------------------------------------------------------------------ *
 * 22. GEV
 * ------------------------------------------------------------------ */

/** Hosking L-moment start for the GEV shape/location/scale. */
function gevStart(st) {
  const n = st.n
  if (n < 5) return null
  const s = st.x
  let b0 = 0
  let b1 = 0
  let b2 = 0
  for (let i = 0; i < n; i++) {
    b0 += s[i]
    b1 += s[i] * (i / (n - 1))
    b2 += (s[i] * i * (i - 1)) / ((n - 1) * (n - 2))
  }
  b0 /= n
  b1 /= n
  b2 /= n
  const l1 = b0
  const l2 = 2 * b1 - b0
  const l3 = 6 * b2 - 6 * b1 + b0
  if (!(l2 > 0)) return null
  const t3 = l3 / l2
  const c = 2 / (3 + t3) - Math.log(2) / Math.log(3)
  const k = 7.8590 * c + 2.9554 * c * c
  const xi = -k
  let sigma
  let mu
  if (Math.abs(xi) < 1e-8) {
    sigma = l2 / Math.LN2
    mu = l1 - sigma * EULER_GAMMA
  } else {
    const g1 = gammaFn(1 - xi)
    if (!(g1 > 0) || !isNum(g1)) return null
    sigma = (l2 * xi) / ((Math.pow(2, xi) - 1) * g1)
    mu = l1 - (sigma * (g1 - 1)) / xi
  }
  if (!(sigma > 0) || !isNum(sigma) || !isNum(mu)) return null
  return { xi: clamp(xi, -0.8, 0.8), mu, sigma }
}

const gev = {
  id: 'gev',
  name: '广义极值 (GEV)',
  group: '极值型',
  k: 3,
  support: 'real',
  paramNames: ['xi', 'mu', 'sigma'],
  params: [
    { name: 'xi', label: 'ξ 形状', init: 0.1 },
    { name: 'mu', label: 'μ 位置', init: 0 },
    { name: 'sigma', label: 'σ 尺度', init: 1 },
  ],
  pdf(x, p) {
    const lp = gev.logpdf(x, p)
    return lp === -Infinity ? 0 : Math.exp(lp)
  },
  logpdf(x, p) {
    const xi = p.xi
    const mu = p.mu
    const sigma = p.sigma
    if (!(sigma > 0) || !isNum(xi) || !isNum(mu) || !isNum(sigma)) return NaN
    const z = (x - mu) / sigma
    if (Math.abs(xi) < 1e-8) {
      return -Math.log(sigma) - z - Math.exp(-z)
    }
    const s = Math.log1p(xi * z)
    if (!isNum(s)) return -Infinity
    const t = Math.exp(-s / xi)
    if (!isNum(t)) return -1e300
    return -Math.log(sigma) - s - s / xi - t
  },
  cdf(x, p) {
    const xi = p.xi
    const mu = p.mu
    const sigma = p.sigma
    if (!(sigma > 0)) return NaN
    const z = (x - mu) / sigma
    if (Math.abs(xi) < 1e-8) {
      return clamp01(Math.exp(-Math.exp(-z)))
    }
    const t0 = 1 + xi * z
    if (!(t0 > 0)) return xi > 0 ? 0 : 1
    const s = Math.log(t0)
    const w = Math.exp(-s / xi)
    if (!isNum(w)) return 0
    return clamp01(Math.exp(-w))
  },
  quantile(q, p) {
    const xi = p.xi
    const mu = p.mu
    const sigma = p.sigma
    if (q <= 0) return xi > 0 ? mu - sigma / xi : -Infinity
    if (q >= 1) return xi < 0 ? mu - sigma / xi : Infinity
    const lp = -Math.log(q)
    if (Math.abs(xi) < 1e-8) return mu - sigma * Math.log(lp)
    return mu + (sigma * Math.expm1(-xi * Math.log(lp))) / xi
  },
  initial(x) {
    const st = dataStats(x)
    const g = gevStart(st)
    if (g) return g
    const a = (st.sd * Math.sqrt(6)) / Math.PI
    return { xi: 0.05, mu: st.mean - EULER_GAMMA * a, sigma: Math.max(a, 1e-12) }
  },
  prepare: (x) => ({ x }),
  sumLogpdf(ctx, p) {
    const xs = ctx.x
    const xi = p.xi
    const mu = p.mu
    const sigma = p.sigma
    const lnS = Math.log(sigma)
    const small = Math.abs(xi) < 1e-8
    let acc = 0
    for (let i = 0; i < xs.length; i++) {
      const z = (xs[i] - mu) / sigma
      let v
      if (small) {
        v = -lnS - z - Math.exp(-z)
      } else {
        const s = Math.log1p(xi * z)
        if (!isNum(s)) return -Infinity
        const t = Math.exp(-s / xi)
        if (!isNum(t)) return -Infinity
        v = -lnS - s - s / xi - t
      }
      if (!isNum(v)) return -Infinity
      acc += v
    }
    return acc
  },
  pack: (p) => [p.xi, p.mu, Math.log(p.sigma)],
  unpack: makeUnpack([['xi', 'id'], ['mu', 'id'], ['sigma', 'log']]),
  valid: (p) => isNum(p.xi) && isNum(p.mu) && p.sigma > 0,
}

/* ------------------------------------------------------------------ *
 * 23. GPD (generalized Pareto, threshold fixed at the sample minimum)
 * ------------------------------------------------------------------ */

function gpdStart(st) {
  const n = st.n
  if (n < 5) return null
  const mu0 = st.min
  // Method-of-moments on the exceedances y = x - min(x).  For a GPD,
  // var/mean^2 = 1 / (1 + 2 xi)  =>  xi = (mean^2 / var - 1) / 2.
  let m = 0
  for (let i = 0; i < n; i++) m += st.x[i] - mu0
  m /= n
  if (!(m > 0)) return null
  let v = 0
  for (let i = 0; i < n; i++) {
    const d = st.x[i] - mu0 - m
    v += d * d
  }
  v /= n
  let xi
  let sigma
  if (v > 1e-14 * m * m) {
    xi = 0.5 * ((m * m) / v - 1)
    sigma = m * (1 + xi)
  } else {
    // Near-degenerate exceedances: fall back to a light-tailed start.
    xi = 0.1
    sigma = m * 1.1
  }
  if (!(sigma > 0) || !isNum(sigma) || !isNum(xi)) return null
  return { xi: clamp(xi, -0.6, 3), mu: mu0, sigma }
}

const gpd = {
  id: 'gpd',
  name: '广义帕累托 (GPD)',
  group: '极值型',
  k: 3,
  support: 'real',
  paramNames: ['xi', 'mu', 'sigma'],
  params: [
    { name: 'xi', label: 'ξ 形状', init: 0.2 },
    { name: 'mu', label: 'μ 阈值', init: 0 },
    { name: 'sigma', label: 'σ 尺度', init: 1 },
  ],
  pdf(x, p) {
    const lp = gpd.logpdf(x, p)
    return lp === -Infinity ? 0 : Math.exp(lp)
  },
  logpdf(x, p) {
    const xi = p.xi
    const mu = p.mu
    const sigma = p.sigma
    if (!(sigma > 0) || !isNum(xi) || !isNum(mu) || !isNum(sigma)) return NaN
    if (!(x >= mu)) return -Infinity
    const z = (x - mu) / sigma
    if (Math.abs(xi) < 1e-8) return -Math.log(sigma) - z
    const s = Math.log1p(xi * z)
    if (!isNum(s)) return -Infinity
    return -Math.log(sigma) - (1 + 1 / xi) * s
  },
  cdf(x, p) {
    const xi = p.xi
    const mu = p.mu
    const sigma = p.sigma
    if (!(sigma > 0)) return NaN
    if (!(x > mu)) return 0
    const z = (x - mu) / sigma
    if (Math.abs(xi) < 1e-8) return clamp01(-Math.expm1(-z))
    const s = Math.log1p(xi * z)
    if (!isNum(s)) return 1
    const w = Math.exp(-s / xi)
    if (!isNum(w)) return 1
    return clamp01(1 - w)
  },
  quantile(q, p) {
    const xi = p.xi
    const mu = p.mu
    const sigma = p.sigma
    if (q <= 0) return mu
    if (q >= 1) return xi < 0 ? mu - sigma / xi : Infinity
    if (Math.abs(xi) < 1e-8) return mu - sigma * Math.log1p(-q)
    return mu + (sigma * Math.expm1(-xi * Math.log1p(-q))) / xi
  },
  initial(x) {
    const st = dataStats(x)
    const g = gpdStart(st)
    if (g) return g
    const m = st.mean
    return { xi: 0.2, mu: st.min, sigma: Math.max(0.5 * Math.max(m - st.min, 1e-9), 1e-12) }
  },
  prepare(x) {
    const st = dataStats(x)
    const mu0 = st.min
    return {
      x: st.x,
      mu0,
      pack: (p) => [p.xi, Math.log(p.sigma)],
      unpack: (u) => {
        const xi = u[0]
        const sigma = Math.exp(u[1])
        if (!isNum(xi) || !isNum(sigma) || sigma <= 0) return null
        return { xi, mu: mu0, sigma }
      },
    }
  },
  sumLogpdf(ctx, p) {
    const xs = ctx.x
    const xi = p.xi
    const mu = p.mu
    const sigma = p.sigma
    const lnS = Math.log(sigma)
    const small = Math.abs(xi) < 1e-8
    let acc = 0
    for (let i = 0; i < xs.length; i++) {
      const z = (xs[i] - mu) / sigma
      let v
      if (small) {
        v = -lnS - z
      } else {
        const s = Math.log1p(xi * z)
        if (!isNum(s)) return -Infinity
        v = -lnS - (1 + 1 / xi) * s
      }
      if (!isNum(v)) return -Infinity
      acc += v
    }
    return acc
  },
  pack: (p) => [p.xi, Math.log(p.sigma)],
  unpack: makeUnpack([['xi', 'id'], ['sigma', 'log']]),
  valid: (p) => isNum(p.xi) && isNum(p.mu) && p.sigma > 0,
}

/* ------------------------------------------------------------------ *
 * registry
 * ------------------------------------------------------------------ */

const DISTS = [
  normal,
  logistic,
  laplace,
  cauchy,
  uniform,
  lognormal,
  gamma,
  weibull,
  exponential,
  rayleigh,
  invgauss,
  loglogistic,
  lomax,
  burr,
  fatiguelife,
  nakagami,
  maxwell,
  chi2,
  halfnormal,
  beta,
  gumbel,
  gev,
  gpd,
]

for (let i = 0; i < DISTS.length; i++) attachFit(DISTS[i])

const DIST_BY_ID = {}
for (let i = 0; i < DISTS.length; i++) DIST_BY_ID[DISTS[i].id] = DISTS[i]

function getDist(id) {
  return Object.prototype.hasOwnProperty.call(DIST_BY_ID, id) ? DIST_BY_ID[id] : null
}

export { DISTS, getDist }
export default DISTS
