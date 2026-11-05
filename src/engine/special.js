/**
 * special.js — numerical special functions and optimisers for the DistFit engine.
 *
 * Pure ESM, zero dependencies, no DOM / Node built-ins. This file is bundled into
 * the browser half *and* imported directly by the Node host, so it may only use
 * `Math` and plain JavaScript.
 *
 * Exports (contract, see docs/DESIGN.md):
 *   lgamma / logGamma, gammaFn, gammaIncompleteP, gammaIncompleteQ, betaIncomplete,
 *   erf, erfc, normInv, normCdf, normPdf, digamma, trigamma, log1mexp, log1pexp,
 *   expit, logit, mulberry32, brentMin, nelderMead, bisect
 */

const LN_SQRT_2PI = 0.5 * Math.log(2 * Math.PI)
const SQRT_2PI = Math.sqrt(2 * Math.PI)
const SQRT2 = Math.SQRT2
const LN2 = Math.LN2
const LOG_2PI = Math.log(2 * Math.PI)
const FPMIN = 1e-300

export const EULER_GAMMA = 0.5772156649015328606065120900824024

/* ------------------------------------------------------------------ *
 * log-gamma
 * ------------------------------------------------------------------ */

const LANCZOS_G = 7
const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028,
  771.32342877765313, -176.61502916214059, 12.507343278686905,
  -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
]

/**
 * log |Γ(x)| via the Lanczos approximation (reflection for x < 0.5).
 * @param {number} x
 * @returns {number}
 */
export function lgamma(x) {
  if (Number.isNaN(x)) return NaN
  if (x === Infinity) return Infinity
  if (x === 1 || x === 2) return 0
  if (x < 0.5) {
    const s = Math.sin(Math.PI * x)
    if (s === 0) return NaN // pole at 0, -1, -2, ...
    return Math.log(Math.PI / Math.abs(s)) - lgamma(1 - x)
  }
  const y = x - 1
  const t = y + LANCZOS_G + 0.5
  let a = LANCZOS[0]
  for (let i = 1; i < LANCZOS.length; i++) a += LANCZOS[i] / (y + i)
  return LN_SQRT_2PI + (y + 0.5) * Math.log(t) - t + Math.log(a)
}

export const logGamma = lgamma

/**
 * Γ(x) for x > 0 (finite by construction; Inf on overflow).
 * @param {number} x
 * @returns {number}
 */
export function gammaFn(x) {
  if (!(x > 0)) return NaN
  if (x === 1 || x === 2) return 1
  return Math.exp(lgamma(x))
}

/* ------------------------------------------------------------------ *
 * incomplete gamma
 * ------------------------------------------------------------------ */

/** Series representation of the regularized lower incomplete gamma P(a,x) (x < a+1). */
function gammaSeries(a, x) {
  let ap = a
  let sum = 1 / a
  let del = sum
  for (let it = 0; it < 2000; it++) {
    ap += 1
    del *= x / ap
    sum += del
    if (Math.abs(del) < Math.abs(sum) * 1e-16) break
  }
  return sum * Math.exp(-x + a * Math.log(x) - lgamma(a))
}

/** Continued-fraction representation of Q(a,x) (x >= a+1), Lentz's method. */
function gammaContinuedFraction(a, x) {
  let b = x + 1 - a
  let c = 1 / FPMIN
  let d = 1 / b
  if (!Number.isFinite(d)) d = FPMIN
  let h = d
  for (let i = 1; i < 2000; i++) {
    const an = -i * (i - a)
    b += 2
    d = an * d + b
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = b + an / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < 1e-16) break
  }
  return Math.exp(-x + a * Math.log(x) - lgamma(a)) * h
}

/**
 * Regularized lower incomplete gamma function P(a,x) = γ(a,x)/Γ(a).
 * @param {number} a shape > 0
 * @param {number} x argument >= 0
 * @returns {number}
 */
export function gammaIncompleteP(a, x) {
  if (!(a > 0) || !(x >= 0)) return NaN
  if (x === 0) return 0
  if (x < a + 1) return gammaSeries(a, x)
  return 1 - gammaContinuedFraction(a, x)
}

/**
 * Regularized upper incomplete gamma function Q(a,x) = Γ(a,x)/Γ(a).
 * @param {number} a shape > 0
 * @param {number} x argument >= 0
 * @returns {number}
 */
export function gammaIncompleteQ(a, x) {
  if (!(a > 0) || !(x >= 0)) return NaN
  if (x === 0) return 1
  if (x < a + 1) return 1 - gammaSeries(a, x)
  return gammaContinuedFraction(a, x)
}

/* ------------------------------------------------------------------ *
 * incomplete beta
 * ------------------------------------------------------------------ */

/** Continued fraction for the incomplete beta function (Lentz). */
function betaContinuedFraction(a, b, x) {
  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let c = 1
  let d = 1 - (qab * x) / qap
  if (Math.abs(d) < FPMIN) d = FPMIN
  d = 1 / d
  let h = d
  for (let m = 1; m <= 600; m++) {
    const m2 = 2 * m
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    h *= d * c
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < FPMIN) d = FPMIN
    c = 1 + aa / c
    if (Math.abs(c) < FPMIN) c = FPMIN
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < 1e-16) break
  }
  return h
}

/**
 * Regularized incomplete beta I_x(a,b).
 * @param {number} a shape > 0
 * @param {number} b shape > 0
 * @param {number} x in [0,1]
 * @returns {number}
 */
export function betaIncomplete(a, b, x) {
  if (!(a > 0) || !(b > 0)) return NaN
  if (x <= 0) return 0
  if (x >= 1) return 1
  const logBt =
    lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log1p(-x)
  const bt = Math.exp(logBt)
  if (x < (a + 1) / (a + b + 2)) return (bt * betaContinuedFraction(a, b, x)) / a
  return 1 - (bt * betaContinuedFraction(b, a, 1 - x)) / b
}

/* ------------------------------------------------------------------ *
 * error function / normal distribution
 * ------------------------------------------------------------------ */

/**
 * Error function erf(x).  Uses erf(x) = P(1/2, x²) for x >= 0, which reuses the
 * accurate incomplete-gamma routines above.
 * @param {number} x
 * @returns {number}
 */
export function erf(x) {
  if (Number.isNaN(x)) return NaN
  if (x > 6) return 1
  if (x < -6) return -1
  if (x === 0) return 0
  return x > 0 ? gammaIncompleteP(0.5, x * x) : -gammaIncompleteP(0.5, x * x)
}

/**
 * Complementary error function erfc(x) = 1 - erf(x), evaluated to preserve the
 * small tail for large positive x.
 * @param {number} x
 * @returns {number}
 */
export function erfc(x) {
  if (Number.isNaN(x)) return NaN
  if (x > 27) return 0
  if (x < -6) return 2
  if (x >= 0) return gammaIncompleteQ(0.5, x * x)
  return 1 + gammaIncompleteP(0.5, x * x)
}

/** Standard normal density. */
export function normPdf(x) {
  return Math.exp(-0.5 * x * x) / SQRT_2PI
}

/** Standard normal CDF Φ(x). */
export function normCdf(x) {
  if (Number.isNaN(x)) return NaN
  if (x === Infinity) return 1
  if (x === -Infinity) return 0
  return 0.5 * erfc(-x / SQRT2)
}

/**
 * log Φ(x), numerically safe far into the left tail (used by the inverse
 * Gaussian CDF).
 * @param {number} x
 * @returns {number}
 */
export function logNormCdf(x) {
  if (Number.isNaN(x)) return NaN
  if (x === Infinity) return 0
  if (x === -Infinity) return -Infinity
  if (x > -30) {
    const v = 0.5 * erfc(-x / SQRT2)
    if (v > 0) return Math.log(v)
  }
  // Mills-ratio asymptotic for the deep left tail.
  const z2 = x * x
  return -0.5 * z2 - Math.log(-x) - 0.5 * LOG_2PI + Math.log1p(-1 / z2 + 3 / (z2 * z2))
}

/* Acklam's inverse normal CDF coefficients (|rel err| < 1.15e-9, improved by
 * one Halley step to ~1e-15). */
const A0 = -3.969683028665376e1
const A1 = 2.209460984245205e2
const A2 = -2.759285104469687e2
const A3 = 1.38357751867269e2
const A4 = -3.066479806614716e1
const A5 = 2.506628277459239
const B0 = -5.447609879822406e1
const B1 = 1.615858368580409e2
const B2 = -1.556989798598866e2
const B3 = 6.680131188771972e1
const B4 = -1.328068155288572e1
const C0 = -7.784894002430293e-3
const C1 = -3.223964580411365e-1
const C2 = -2.400758277161838
const C3 = -2.549732539343734
const C4 = 4.374664141464968
const C5 = 2.938163982698783
const D0 = 7.784695709041462e-3
const D1 = 3.224671290700398e-1
const D2 = 2.445134137142996
const D3 = 3.754408661907416

/**
 * Inverse standard normal CDF (quantile function), p ∈ (0,1).
 * @param {number} p
 * @returns {number}
 */
export function normInv(p) {
  if (!(p >= 0 && p <= 1)) return NaN
  if (p === 0) return -Infinity
  if (p === 1) return Infinity
  const q = p - 0.5
  let x
  if (Math.abs(q) <= 0.425) {
    const r = q * q
    const num = (((((A0 * r + A1) * r + A2) * r + A3) * r + A4) * r + A5)
    const den = (((((B0 * r + B1) * r + B2) * r + B3) * r + B4) * r + 1)
    x = (q * num) / den
  } else {
    // Acklam tail rational approximations, evaluated in q = sqrt(-2 ln tail).
    const qq = p < 0.5 ? Math.sqrt(-2 * Math.log(p)) : Math.sqrt(-2 * Math.log(1 - p))
    const num = (((((C0 * qq + C1) * qq + C2) * qq + C3) * qq + C4) * qq + C5)
    const den = ((((D0 * qq + D1) * qq + D2) * qq + D3) * qq + 1)
    x = p < 0.5 ? num / den : -num / den
  }
  // One Halley step against the accurate erfc-based CDF.
  if (Math.abs(x) < 37) {
    const e = 0.5 * erfc(-x / SQRT2) - p
    const u = e * SQRT_2PI * Math.exp(0.5 * x * x)
    const denom = 1 + 0.5 * x * u
    if (Number.isFinite(u) && Number.isFinite(denom) && denom !== 0) x -= u / denom
  }
  return x
}

/* ------------------------------------------------------------------ *
 * polygamma
 * ------------------------------------------------------------------ */

/**
 * Digamma ψ(x) = d/dx ln Γ(x).
 * @param {number} x
 * @returns {number}
 */
export function digamma(x) {
  if (Number.isNaN(x)) return NaN
  if (x === 0) return NaN
  if (x < 0) {
    if (x === Math.round(x)) return NaN
    return digamma(1 - x) - Math.PI / Math.tan(Math.PI * x)
  }
  let result = 0
  let y = x
  while (y < 6) {
    result -= 1 / y
    y += 1
  }
  const f = 1 / (y * y)
  result +=
    Math.log(y) -
    0.5 / y -
    f *
      (1 / 12 -
        f * (1 / 120 - f * (1 / 252 - f * (1 / 240 - f * (1 / 132)))))
  return result
}

/**
 * Trigamma ψ'(x) = d²/dx² ln Γ(x).
 * @param {number} x
 * @returns {number}
 */
export function trigamma(x) {
  if (Number.isNaN(x)) return NaN
  if (x <= 0) {
    if (x === Math.round(x)) return NaN
    const s = Math.sin(Math.PI * x)
    return -trigamma(1 - x) + (Math.PI * Math.PI) / (s * s)
  }
  let result = 0
  let y = x
  while (y < 6) {
    result += 1 / (y * y)
    y += 1
  }
  const t = 1 / y
  const t2 = t * t
  result +=
    t + 0.5 * t2 + (t2 * t) / 6 - (t2 * t2 * t) / 30 + (t2 * t2 * t2 * t) / 42 -
    (t2 * t2 * t2 * t2 * t) / 30
  return result
}

/* ------------------------------------------------------------------ *
 * small numeric helpers
 * ------------------------------------------------------------------ */

/**
 * log(1 - exp(x)) for x < 0, numerically stable.
 * @param {number} x
 * @returns {number}
 */
export function log1mexp(x) {
  if (!(x < 0)) return NaN
  if (x >= -LN2) return Math.log(-Math.expm1(x))
  return Math.log1p(-Math.exp(x))
}

/**
 * log(1 + exp(x)) without overflow.
 * @param {number} x
 * @returns {number}
 */
export function log1pexp(x) {
  if (x > 18) return x + Math.exp(-x)
  return Math.log1p(Math.exp(x))
}

/** Logistic function 1/(1+e^{-x}), stable in both tails. */
export function expit(x) {
  if (x >= 0) return 1 / (1 + Math.exp(-x))
  const e = Math.exp(x)
  return e / (1 + e)
}

/** Inverse logistic log(p/(1-p)) for p ∈ (0,1). */
export function logit(p) {
  return Math.log(p / (1 - p))
}

/* ------------------------------------------------------------------ *
 * seeded RNG
 * ------------------------------------------------------------------ */

/**
 * Deterministic 32-bit PRNG (mulberry32).
 *
 * Returns `() => number` in [0,1) with an extra `.nextGauss()` method drawing
 * from N(0,1) (Box–Muller with a cached spare).
 *
 * @param {number} seed
 * @returns {(() => number) & { nextGauss: () => number }}
 */
export function mulberry32(seed) {
  let a = (seed >>> 0) || 0x9e3779b9
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  let spare = null
  rand.nextGauss = () => {
    if (spare !== null) {
      const v = spare
      spare = null
      return v
    }
    let u = 0
    let v = 0
    while (u === 0) u = rand()
    while (v === 0) v = rand()
    const mag = Math.sqrt(-2 * Math.log(u))
    spare = mag * Math.sin(2 * Math.PI * v)
    return mag * Math.cos(2 * Math.PI * v)
  }
  return rand
}

/* ------------------------------------------------------------------ *
 * optimisation / root finding
 * ------------------------------------------------------------------ */

/**
 * Brent's method for one-dimensional minimisation on a bracketing interval.
 *
 * @param {(x:number)=>number} f
 * @param {number} a lower bound
 * @param {number} b upper bound
 * @param {{tol?:number, maxIter?:number}} [opts]
 * @returns {{x:number, fx:number, iterations:number, converged:boolean}}
 */
export function brentMin(f, a, b, opts = {}) {
  const tol = opts.tol ?? 1e-12
  const maxIter = opts.maxIter ?? 300
  const CGOLD = 0.3819660112501051
  const ZEPS = 1e-15
  let ax = a
  let bx = b
  let x = ax + CGOLD * (bx - ax)
  let w = x
  let v = x
  let fx = f(x)
  let fw = fx
  let fv = fx
  let d = 0
  let e = 0
  let iter = 0
  let converged = false
  for (; iter < maxIter; iter++) {
    const xm = 0.5 * (ax + bx)
    const tol1 = tol * Math.abs(x) + ZEPS
    const tol2 = 2 * tol1
    if (Math.abs(x - xm) <= tol2 - 0.5 * (bx - ax)) {
      converged = true
      break
    }
    let u
    if (Math.abs(e) > tol1) {
      const r = (x - w) * (fx - fv)
      let q = (x - v) * (fx - fw)
      let p = (x - v) * q - (x - w) * r
      q = 2 * (q - r)
      if (q > 0) p = -p
      q = Math.abs(q)
      const etemp = e
      e = d
      if (
        Math.abs(p) >= Math.abs(0.5 * q * etemp) ||
        p <= q * (ax - x) ||
        p >= q * (bx - x)
      ) {
        e = x >= xm ? ax - x : bx - x
        d = CGOLD * e
      } else {
        d = p / q
        const uu = x + d
        if (uu - ax < tol2 || bx - uu < tol2) d = xm - x >= 0 ? tol1 : -tol1
      }
    } else {
      e = x >= xm ? ax - x : bx - x
      d = CGOLD * e
    }
    u = x + (Math.abs(d) >= tol1 ? d : d >= 0 ? tol1 : -tol1)
    const fu = f(u)
    if (fu <= fx) {
      if (u >= x) ax = x
      else bx = x
      v = w
      fv = fw
      w = x
      fw = fx
      x = u
      fx = fu
    } else {
      if (u < x) ax = u
      else bx = u
      if (fu <= fw || w === x) {
        v = w
        fv = fw
        w = u
        fw = fu
      } else if (fu <= fv || v === x || v === w) {
        v = u
        fv = fu
      }
    }
  }
  return { x, fx, iterations: iter, converged }
}

/**
 * Nelder–Mead downhill simplex minimisation (reflection / expansion /
 * contraction / shrink).  Robust to `Infinity` objective values: those vertices
 * are simply the worst.
 *
 * @param {(u:number[])=>number} f objective
 * @param {number[]} x0 initial point
 * @param {{maxIter?:number, tol?:number, step?:number|number[]}} [opts]
 * @returns {{x:number[], fx:number, iterations:number, converged:boolean}}
 */
export function nelderMead(f, x0, opts = {}) {
  const dim = x0.length
  const maxIter = opts.maxIter ?? 800
  const tol = opts.tol ?? 1e-11
  const stepOpt = opts.step ?? 0.1
  const stepOf = (i) => (Array.isArray(stepOpt) ? stepOpt[i] ?? 0.1 : stepOpt)
  const safeF = (v) => {
    const y = f(v)
    return Number.isNaN(y) ? Infinity : y
  }

  const simplex = [x0.slice()]
  const vals = [safeF(simplex[0])]
  for (let i = 0; i < dim; i++) {
    const v = x0.slice()
    const s = stepOf(i)
    v[i] += s !== 0 ? s : 0.1
    simplex.push(v)
    vals.push(safeF(v))
  }

  const ALPHA = 1
  const GAMMA = 2
  const RHO = 0.5
  const SIGMA = 0.5
  let iterations = 0
  let converged = false
  let bestIdx = 0

  for (; iterations < maxIter; iterations++) {
    // Sort indices by objective value.
    const order = vals.map((_, i) => i).sort((i, j) => vals[i] - vals[j])
    const lo = order[0]
    const hi = order[order.length - 1]
    const nxt = order[order.length - 2]
    bestIdx = lo
    const flo = vals[lo]
    const fhi = vals[hi]
    if (flo === Infinity) break // nothing usable
    if (fhi - flo <= tol * (1 + Math.abs(flo))) {
      converged = true
      break
    }
    // Centroid of all but the worst vertex.
    const centroid = new Array(dim).fill(0)
    for (let k = 0; k < order.length - 1; k++) {
      const idx = order[k]
      for (let j = 0; j < dim; j++) centroid[j] += simplex[idx][j]
    }
    for (let j = 0; j < dim; j++) centroid[j] /= dim

    const worst = simplex[hi]
    const reflected = centroid.map((c, j) => c + ALPHA * (c - worst[j]))
    const fr = safeF(reflected)
    if (fr < flo) {
      const expanded = centroid.map((c, j) => c + GAMMA * (reflected[j] - c))
      const fe = safeF(expanded)
      if (fe < fr) {
        simplex[hi] = expanded
        vals[hi] = fe
      } else {
        simplex[hi] = reflected
        vals[hi] = fr
      }
      continue
    }
    if (fr < vals[nxt]) {
      simplex[hi] = reflected
      vals[hi] = fr
      continue
    }
    // Contraction.
    if (fr < fhi) {
      const contracted = centroid.map((c, j) => c + RHO * (reflected[j] - c))
      const fc = safeF(contracted)
      if (fc < fr) {
        simplex[hi] = contracted
        vals[hi] = fc
        continue
      }
    } else {
      const contracted = centroid.map((c, j) => c + RHO * (worst[j] - c))
      const fc = safeF(contracted)
      if (fc < fhi) {
        simplex[hi] = contracted
        vals[hi] = fc
        continue
      }
    }
    // Shrink towards the best vertex.
    const best = simplex[lo]
    for (let i = 0; i < simplex.length; i++) {
      if (i === lo) continue
      simplex[i] = simplex[i].map((v, j) => best[j] + SIGMA * (v - best[j]))
      vals[i] = safeF(simplex[i])
    }
  }

  const order = vals.map((_, i) => i).sort((i, j) => vals[i] - vals[j])
  const bi = order[0]
  return { x: simplex[bi].slice(), fx: vals[bi], iterations, converged }
}

/**
 * Bisection root finder for a monotone function with a sign change on [a,b].
 *
 * @param {(x:number)=>number} f
 * @param {number} a
 * @param {number} b
 * @param {{tol?:number, maxIter?:number}} [opts]
 * @returns {{x:number, fx:number, iterations:number, converged:boolean}}
 */
export function bisect(f, a, b, opts = {}) {
  const tol = opts.tol ?? 1e-12
  const maxIter = opts.maxIter ?? 200
  let lo = a
  let hi = b
  let flo = f(lo)
  let fhi = f(hi)
  if (flo === 0) return { x: lo, fx: 0, iterations: 0, converged: true }
  if (fhi === 0) return { x: hi, fx: 0, iterations: 0, converged: true }
  if (!(flo * fhi < 0)) return { x: NaN, fx: NaN, iterations: 0, converged: false }
  for (let i = 0; i < maxIter; i++) {
    const mid = 0.5 * (lo + hi)
    const fm = f(mid)
    if (fm === 0 || Math.abs(hi - lo) <= tol * (1 + Math.abs(mid))) {
      return { x: mid, fx: fm, iterations: i + 1, converged: true }
    }
    if (flo * fm < 0) {
      hi = mid
      fhi = fm
    } else {
      lo = mid
      flo = fm
    }
  }
  const x = 0.5 * (lo + hi)
  return { x, fx: f(x), iterations: maxIter, converged: false }
}
