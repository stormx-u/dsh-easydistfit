window.__ModuleLoader__.load({
	id: "dsh-distfit",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.jsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react2 = require("react");

// src/client/ui/App.jsx
var import_react = require("react");

// src/engine/special.js
var LN_SQRT_2PI = 0.5 * Math.log(2 * Math.PI);
var SQRT_2PI = Math.sqrt(2 * Math.PI);
var SQRT2 = Math.SQRT2;
var LOG_2PI = Math.log(2 * Math.PI);
var FPMIN = 1e-300;
var EULER_GAMMA = 0.5772156649015329;
var LANCZOS_G = 7;
var LANCZOS = [
  0.9999999999998099,
  676.5203681218851,
  -1259.1392167224028,
  771.3234287776531,
  -176.6150291621406,
  12.507343278686905,
  -0.13857109526572012,
  9984369578019572e-21,
  15056327351493116e-23
];
function lgamma(x) {
  if (Number.isNaN(x)) return NaN;
  if (x === Infinity) return Infinity;
  if (x === 1 || x === 2) return 0;
  if (x < 0.5) {
    const s = Math.sin(Math.PI * x);
    if (s === 0) return NaN;
    return Math.log(Math.PI / Math.abs(s)) - lgamma(1 - x);
  }
  const y = x - 1;
  const t = y + LANCZOS_G + 0.5;
  let a = LANCZOS[0];
  for (let i = 1; i < LANCZOS.length; i++) a += LANCZOS[i] / (y + i);
  return LN_SQRT_2PI + (y + 0.5) * Math.log(t) - t + Math.log(a);
}
function gammaFn(x) {
  if (!(x > 0)) return NaN;
  if (x === 1 || x === 2) return 1;
  return Math.exp(lgamma(x));
}
function gammaSeries(a, x) {
  let ap = a;
  let sum2 = 1 / a;
  let del = sum2;
  for (let it = 0; it < 2e3; it++) {
    ap += 1;
    del *= x / ap;
    sum2 += del;
    if (Math.abs(del) < Math.abs(sum2) * 1e-16) break;
  }
  return sum2 * Math.exp(-x + a * Math.log(x) - lgamma(a));
}
function gammaContinuedFraction(a, x) {
  let b = x + 1 - a;
  let c = 1 / FPMIN;
  let d = 1 / b;
  if (!Number.isFinite(d)) d = FPMIN;
  let h2 = d;
  for (let i = 1; i < 2e3; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h2 *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return Math.exp(-x + a * Math.log(x) - lgamma(a)) * h2;
}
function gammaIncompleteP(a, x) {
  if (!(a > 0) || !(x >= 0)) return NaN;
  if (x === 0) return 0;
  if (x < a + 1) return gammaSeries(a, x);
  return 1 - gammaContinuedFraction(a, x);
}
function gammaIncompleteQ(a, x) {
  if (!(a > 0) || !(x >= 0)) return NaN;
  if (x === 0) return 1;
  if (x < a + 1) return 1 - gammaSeries(a, x);
  return gammaContinuedFraction(a, x);
}
function betaContinuedFraction(a, b, x) {
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h2 = d;
  for (let m = 1; m <= 600; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h2 *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h2 *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return h2;
}
function betaIncomplete(a, b, x) {
  if (!(a > 0) || !(b > 0)) return NaN;
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const logBt = lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log1p(-x);
  const bt = Math.exp(logBt);
  if (x < (a + 1) / (a + b + 2)) return bt * betaContinuedFraction(a, b, x) / a;
  return 1 - bt * betaContinuedFraction(b, a, 1 - x) / b;
}
function erf(x) {
  if (Number.isNaN(x)) return NaN;
  if (x > 6) return 1;
  if (x < -6) return -1;
  if (x === 0) return 0;
  return x > 0 ? gammaIncompleteP(0.5, x * x) : -gammaIncompleteP(0.5, x * x);
}
function erfc(x) {
  if (Number.isNaN(x)) return NaN;
  if (x > 27) return 0;
  if (x < -6) return 2;
  if (x >= 0) return gammaIncompleteQ(0.5, x * x);
  return 1 + gammaIncompleteP(0.5, x * x);
}
function normCdf(x) {
  if (Number.isNaN(x)) return NaN;
  if (x === Infinity) return 1;
  if (x === -Infinity) return 0;
  return 0.5 * erfc(-x / SQRT2);
}
function logNormCdf(x) {
  if (Number.isNaN(x)) return NaN;
  if (x === Infinity) return 0;
  if (x === -Infinity) return -Infinity;
  if (x > -30) {
    const v = 0.5 * erfc(-x / SQRT2);
    if (v > 0) return Math.log(v);
  }
  const z2 = x * x;
  return -0.5 * z2 - Math.log(-x) - 0.5 * LOG_2PI + Math.log1p(-1 / z2 + 3 / (z2 * z2));
}
var A0 = -39.69683028665376;
var A1 = 220.9460984245205;
var A2 = -275.9285104469687;
var A3 = 138.357751867269;
var A4 = -30.66479806614716;
var A5 = 2.506628277459239;
var B0 = -54.47609879822406;
var B1 = 161.5858368580409;
var B2 = -155.6989798598866;
var B3 = 66.80131188771972;
var B4 = -13.28068155288572;
var C0 = -0.007784894002430293;
var C1 = -0.3223964580411365;
var C2 = -2.400758277161838;
var C3 = -2.549732539343734;
var C4 = 4.374664141464968;
var C5 = 2.938163982698783;
var D0 = 0.007784695709041462;
var D1 = 0.3224671290700398;
var D2 = 2.445134137142996;
var D3 = 3.754408661907416;
function normInv(p) {
  if (!(p >= 0 && p <= 1)) return NaN;
  if (p === 0) return -Infinity;
  if (p === 1) return Infinity;
  const q = p - 0.5;
  let x;
  if (Math.abs(q) <= 0.425) {
    const r = q * q;
    const num2 = ((((A0 * r + A1) * r + A2) * r + A3) * r + A4) * r + A5;
    const den = ((((B0 * r + B1) * r + B2) * r + B3) * r + B4) * r + 1;
    x = q * num2 / den;
  } else {
    const qq = p < 0.5 ? Math.sqrt(-2 * Math.log(p)) : Math.sqrt(-2 * Math.log(1 - p));
    const num2 = ((((C0 * qq + C1) * qq + C2) * qq + C3) * qq + C4) * qq + C5;
    const den = (((D0 * qq + D1) * qq + D2) * qq + D3) * qq + 1;
    x = p < 0.5 ? num2 / den : -num2 / den;
  }
  if (Math.abs(x) < 37) {
    const e = 0.5 * erfc(-x / SQRT2) - p;
    const u = e * SQRT_2PI * Math.exp(0.5 * x * x);
    const denom = 1 + 0.5 * x * u;
    if (Number.isFinite(u) && Number.isFinite(denom) && denom !== 0) x -= u / denom;
  }
  return x;
}
function digamma(x) {
  if (Number.isNaN(x)) return NaN;
  if (x === 0) return NaN;
  if (x < 0) {
    if (x === Math.round(x)) return NaN;
    return digamma(1 - x) - Math.PI / Math.tan(Math.PI * x);
  }
  let result = 0;
  let y = x;
  while (y < 6) {
    result -= 1 / y;
    y += 1;
  }
  const f = 1 / (y * y);
  result += Math.log(y) - 0.5 / y - f * (1 / 12 - f * (1 / 120 - f * (1 / 252 - f * (1 / 240 - f * (1 / 132)))));
  return result;
}
function log1pexp(x) {
  if (x > 18) return x + Math.exp(-x);
  return Math.log1p(Math.exp(x));
}
function expit(x) {
  if (x >= 0) return 1 / (1 + Math.exp(-x));
  const e = Math.exp(x);
  return e / (1 + e);
}
function mulberry32(seed) {
  let a = seed >>> 0 || 2654435769;
  const rand = () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  let spare = null;
  rand.nextGauss = () => {
    if (spare !== null) {
      const v2 = spare;
      spare = null;
      return v2;
    }
    let u = 0;
    let v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    const mag = Math.sqrt(-2 * Math.log(u));
    spare = mag * Math.sin(2 * Math.PI * v);
    return mag * Math.cos(2 * Math.PI * v);
  };
  return rand;
}
function nelderMead(f, x0, opts = {}) {
  const dim = x0.length;
  const maxIter = opts.maxIter ?? 800;
  const tol = opts.tol ?? 1e-11;
  const stepOpt = opts.step ?? 0.1;
  const stepOf = (i) => Array.isArray(stepOpt) ? stepOpt[i] ?? 0.1 : stepOpt;
  const safeF = (v) => {
    const y = f(v);
    return Number.isNaN(y) ? Infinity : y;
  };
  const simplex = [x0.slice()];
  const vals = [safeF(simplex[0])];
  for (let i = 0; i < dim; i++) {
    const v = x0.slice();
    const s = stepOf(i);
    v[i] += s !== 0 ? s : 0.1;
    simplex.push(v);
    vals.push(safeF(v));
  }
  const ALPHA = 1;
  const GAMMA = 2;
  const RHO = 0.5;
  const SIGMA = 0.5;
  let iterations = 0;
  let converged = false;
  let bestIdx = 0;
  for (; iterations < maxIter; iterations++) {
    const order2 = vals.map((_, i) => i).sort((i, j) => vals[i] - vals[j]);
    const lo = order2[0];
    const hi = order2[order2.length - 1];
    const nxt = order2[order2.length - 2];
    bestIdx = lo;
    const flo = vals[lo];
    const fhi = vals[hi];
    if (flo === Infinity) break;
    if (fhi - flo <= tol * (1 + Math.abs(flo))) {
      converged = true;
      break;
    }
    const centroid = new Array(dim).fill(0);
    for (let k = 0; k < order2.length - 1; k++) {
      const idx = order2[k];
      for (let j = 0; j < dim; j++) centroid[j] += simplex[idx][j];
    }
    for (let j = 0; j < dim; j++) centroid[j] /= dim;
    const worst = simplex[hi];
    const reflected = centroid.map((c, j) => c + ALPHA * (c - worst[j]));
    const fr = safeF(reflected);
    if (fr < flo) {
      const expanded = centroid.map((c, j) => c + GAMMA * (reflected[j] - c));
      const fe = safeF(expanded);
      if (fe < fr) {
        simplex[hi] = expanded;
        vals[hi] = fe;
      } else {
        simplex[hi] = reflected;
        vals[hi] = fr;
      }
      continue;
    }
    if (fr < vals[nxt]) {
      simplex[hi] = reflected;
      vals[hi] = fr;
      continue;
    }
    if (fr < fhi) {
      const contracted = centroid.map((c, j) => c + RHO * (reflected[j] - c));
      const fc = safeF(contracted);
      if (fc < fr) {
        simplex[hi] = contracted;
        vals[hi] = fc;
        continue;
      }
    } else {
      const contracted = centroid.map((c, j) => c + RHO * (worst[j] - c));
      const fc = safeF(contracted);
      if (fc < fhi) {
        simplex[hi] = contracted;
        vals[hi] = fc;
        continue;
      }
    }
    const best = simplex[lo];
    for (let i = 0; i < simplex.length; i++) {
      if (i === lo) continue;
      simplex[i] = simplex[i].map((v, j) => best[j] + SIGMA * (v - best[j]));
      vals[i] = safeF(simplex[i]);
    }
  }
  const order = vals.map((_, i) => i).sort((i, j) => vals[i] - vals[j]);
  const bi = order[0];
  return { x: simplex[bi].slice(), fx: vals[bi], iterations, converged };
}
function bisect(f, a, b, opts = {}) {
  const tol = opts.tol ?? 1e-12;
  const maxIter = opts.maxIter ?? 200;
  let lo = a;
  let hi = b;
  let flo = f(lo);
  let fhi = f(hi);
  if (flo === 0) return { x: lo, fx: 0, iterations: 0, converged: true };
  if (fhi === 0) return { x: hi, fx: 0, iterations: 0, converged: true };
  if (!(flo * fhi < 0)) return { x: NaN, fx: NaN, iterations: 0, converged: false };
  for (let i = 0; i < maxIter; i++) {
    const mid = 0.5 * (lo + hi);
    const fm = f(mid);
    if (fm === 0 || Math.abs(hi - lo) <= tol * (1 + Math.abs(mid))) {
      return { x: mid, fx: fm, iterations: i + 1, converged: true };
    }
    if (flo * fm < 0) {
      hi = mid;
      fhi = fm;
    } else {
      lo = mid;
      flo = fm;
    }
  }
  const x = 0.5 * (lo + hi);
  return { x, fx: f(x), iterations: maxIter, converged: false };
}

// src/engine/distributions.js
var LN_SQRT2PI = 0.9189385332046728;
var LN_SQRT_2_OVER_PI = 0.5 * Math.log(2 / Math.PI);
var SQRT22 = Math.SQRT2;
var Z75 = 0.6744897501960817;
function isNum(v) {
  return typeof v === "number" && Number.isFinite(v);
}
function clamp01(v) {
  return v <= 0 ? 0 : v >= 1 ? 1 : v;
}
function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
function sortedCopy(x) {
  return x.slice().sort((a, b) => a - b);
}
function sampleQuantile(sorted, p) {
  const n = sorted.length;
  if (n === 0) return NaN;
  if (n === 1) return sorted[0];
  const h2 = (n - 1) * p;
  const i = Math.floor(h2);
  const f = h2 - i;
  if (i + 1 >= n) return sorted[n - 1];
  return sorted[i] + f * (sorted[i + 1] - sorted[i]);
}
function dataStats(x) {
  const s = sortedCopy(x);
  const n = s.length;
  let sum2 = 0;
  for (let i = 0; i < n; i++) sum2 += s[i];
  const mean2 = sum2 / n;
  let ss = 0;
  for (let i = 0; i < n; i++) {
    const d = s[i] - mean2;
    ss += d * d;
  }
  const variance2 = n > 1 ? ss / n : 0;
  return {
    n,
    x: s,
    mean: mean2,
    variance: variance2,
    sd: Math.sqrt(variance2),
    min: s[0],
    max: s[n - 1],
    median: sampleQuantile(s, 0.5),
    q1: sampleQuantile(s, 0.25),
    q3: sampleQuantile(s, 0.75)
  };
}
function logaddexp(a, b) {
  if (a === -Infinity) return b;
  if (b === -Infinity) return a;
  const m = a > b ? a : b;
  return m + Math.log(Math.exp(a - m) + Math.exp(b - m));
}
function lbeta(a, b) {
  return lgamma(a) + lgamma(b) - lgamma(a + b);
}
function hashSeed(seed, str) {
  let h2 = seed >>> 0 ^ 2654435769;
  for (let i = 0; i < str.length; i++) {
    h2 = Math.imul(h2 ^ str.charCodeAt(i), 16777619) >>> 0;
  }
  return h2 >>> 0;
}
function gammaQuantileUnit(q, a) {
  if (!(q > 0)) return 0;
  if (q >= 1) return Infinity;
  if (!(a > 0) || !isNum(a)) return NaN;
  let hi = a > 1e-12 ? a : 1e-12;
  let guard = 0;
  while (gammaIncompleteP(a, hi) < q && guard++ < 400) hi *= 1.7;
  if (!isNum(hi)) return Infinity;
  const r = bisect((x) => gammaIncompleteP(a, x) - q, 0, hi, {
    tol: 1e-15,
    maxIter: 140
  });
  return r.converged ? r.x : r.x;
}
function betaQuantileUnit(q, a, b) {
  if (!(q > 0)) return 0;
  if (q >= 1) return 1;
  if (!(a > 0) || !(b > 0)) return NaN;
  const r = bisect((x) => betaIncomplete(a, b, x) - q, 0, 1, {
    tol: 1e-15,
    maxIter: 120
  });
  return r.converged ? r.x : r.x;
}
function naFit(init, iterations) {
  return {
    params: init || null,
    loglik: -Infinity,
    converged: false,
    iterations: iterations || 0,
    start: init || null
  };
}
function attachFit(fam) {
  if (!fam.prepare) {
    fam.prepare = (x) => ({ x });
  }
  fam.fit = function(x, options) {
    try {
      return fitImpl(fam, x, options || {});
    } catch (err) {
      return naFit(null, 0);
    }
  };
}
function fitImpl(fam, x, o) {
  const n = x.length;
  let init = null;
  try {
    init = fam.initial(x);
  } catch (err) {
    init = null;
  }
  if (!init || n < fam.k + 2) return naFit(init, 0);
  if (fam.customFit) return fam.customFit(x, o, init);
  const ctx = fam.prepare(x);
  const pack = ctx && ctx.pack || fam.pack;
  const unpack = ctx && ctx.unpack || fam.unpack;
  const u0 = pack(init);
  if (!Array.isArray(u0) || u0.length === 0) return naFit(init, 0);
  for (let i = 0; i < u0.length; i++) if (!isNum(u0[i])) return naFit(init, 0);
  const nll = (u) => {
    const p = unpack(u);
    if (!p) return Infinity;
    if (fam.valid && !fam.valid(p, ctx)) return Infinity;
    const ll2 = fam.sumLogpdf(ctx, p);
    return isNum(ll2) ? -ll2 : Infinity;
  };
  const maxIter = isNum(o.maxIter) ? o.maxIter : 400;
  const tol = isNum(o.tol) ? o.tol : 1e-9;
  const restarts = isNum(o.restarts) ? o.restarts : 1;
  const seed = isNum(o.seed) ? o.seed : 20260101;
  let bestU = null;
  let bestF = Infinity;
  let iterations = 0;
  const f0 = nll(u0);
  if (isNum(f0)) bestF = f0;
  if (f0 < Infinity) {
    const r = nelderMead(nll, u0, { maxIter, tol });
    iterations += r.iterations;
    if (isNum(r.fx) && r.fx < bestF) {
      bestF = r.fx;
      bestU = r.x.slice();
    }
  }
  if (restarts > 0) {
    const rng = mulberry32(hashSeed(seed, fam.id));
    const gauss = typeof rng.nextGauss === "function" ? rng.nextGauss : null;
    const u1 = new Array(u0.length);
    for (let i = 0; i < u0.length; i++) {
      const jitter = gauss ? gauss.call(rng) : 0;
      u1[i] = u0[i] + 0.6 * jitter;
    }
    const f1 = nll(u1);
    if (f1 < Infinity) {
      const r = nelderMead(nll, u1, {
        maxIter: Math.max(150, Math.floor(maxIter * 0.6)),
        tol: Math.max(tol * 10, 1e-8)
      });
      iterations += r.iterations;
      if (isNum(r.fx) && r.fx < bestF) {
        bestF = r.fx;
        bestU = r.x.slice();
      }
    }
  }
  if (!bestU) {
    if (isNum(f0) && f0 < Infinity) bestU = u0.slice();
    else return naFit(init, iterations);
  }
  const params = unpack(bestU);
  if (!params) return naFit(init, iterations);
  if (fam.valid && !fam.valid(params, ctx)) return naFit(init, iterations);
  let ll = 0;
  for (let i = 0; i < n; i++) {
    const lp = fam.logpdf(x[i], params);
    if (!isNum(lp)) return naFit(init, iterations);
    ll += lp;
  }
  if (!isNum(ll)) return naFit(init, iterations);
  return {
    params,
    loglik: ll,
    converged: true,
    iterations,
    start: init
  };
}
function packLocScale(p) {
  return [p.mu, Math.log(p.sigma)];
}
function makeUnpack(order) {
  return function unpack(u) {
    const p = {};
    for (let i = 0; i < order.length; i++) {
      const key = order[i][0];
      const mode = order[i][1];
      const v = mode === "log" ? Math.exp(u[i]) : u[i];
      if (!isNum(v)) return null;
      p[key] = v;
    }
    return p;
  };
}
var normal = {
  id: "normal",
  name: "\u6B63\u6001\u5206\u5E03",
  group: "\u4F4D\u7F6E-\u5C3A\u5EA6\u578B",
  k: 2,
  support: "real",
  paramNames: ["mu", "sigma"],
  params: [
    { name: "mu", label: "\u03BC \u4F4D\u7F6E", init: 0 },
    { name: "sigma", label: "\u03C3 \u5C3A\u5EA6", init: 1 }
  ],
  pdf(x, p) {
    const lp = normal.logpdf(x, p);
    return lp === -Infinity ? 0 : Math.exp(lp);
  },
  logpdf(x, p) {
    const s = p.sigma;
    if (!(s > 0) || !isNum(x) || !isNum(p.mu)) return NaN;
    const z = (x - p.mu) / s;
    return -0.5 * z * z - Math.log(s) - LN_SQRT2PI;
  },
  cdf(x, p) {
    if (!(p.sigma > 0)) return NaN;
    return clamp01(normCdf((x - p.mu) / p.sigma));
  },
  quantile(q, p) {
    if (q <= 0) return -Infinity;
    if (q >= 1) return Infinity;
    return p.mu + p.sigma * normInv(q);
  },
  initial(x) {
    const st = dataStats(x);
    return { mu: st.mean, sigma: Math.max(st.sd, 1e-12) };
  },
  prepare: (x) => ({ x }),
  sumLogpdf(ctx, p) {
    const xs = ctx.x;
    const mu = p.mu;
    const s = p.sigma;
    const lnS = Math.log(s);
    let acc = 0;
    for (let i = 0; i < xs.length; i++) {
      const z = (xs[i] - mu) / s;
      const v = -0.5 * z * z - lnS - LN_SQRT2PI;
      if (!isNum(v)) return -Infinity;
      acc += v;
    }
    return acc;
  },
  pack: packLocScale,
  unpack: makeUnpack([["mu", "id"], ["sigma", "log"]]),
  valid: (p) => isNum(p.mu) && p.sigma > 0
};
var logistic = {
  id: "logistic",
  name: "Logistic \u5206\u5E03",
  group: "\u4F4D\u7F6E-\u5C3A\u5EA6\u578B",
  k: 2,
  support: "real",
  paramNames: ["mu", "s"],
  params: [
    { name: "mu", label: "\u03BC \u4F4D\u7F6E", init: 0 },
    { name: "s", label: "s \u5C3A\u5EA6", init: 1 }
  ],
  pdf(x, p) {
    const lp = logistic.logpdf(x, p);
    return lp === -Infinity ? 0 : Math.exp(lp);
  },
  logpdf(x, p) {
    const s = p.s;
    if (!(s > 0) || !isNum(x) || !isNum(p.mu)) return NaN;
    const z = (x - p.mu) / s;
    return -z - Math.log(s) - 2 * log1pexp(-z);
  },
  cdf(x, p) {
    if (!(p.s > 0)) return NaN;
    return clamp01(expit((x - p.mu) / p.s));
  },
  quantile(q, p) {
    if (q <= 0) return -Infinity;
    if (q >= 1) return Infinity;
    return p.mu + p.s * Math.log(q / (1 - q));
  },
  initial(x) {
    const st = dataStats(x);
    return { mu: st.median, s: Math.max(st.sd * Math.sqrt(3) / Math.PI, 1e-12) };
  },
  prepare: (x) => ({ x }),
  sumLogpdf(ctx, p) {
    const xs = ctx.x;
    const mu = p.mu;
    const s = p.s;
    const lnS = Math.log(s);
    let acc = 0;
    for (let i = 0; i < xs.length; i++) {
      const z = (xs[i] - mu) / s;
      const v = -z - lnS - 2 * log1pexp(-z);
      if (!isNum(v)) return -Infinity;
      acc += v;
    }
    return acc;
  },
  pack: (p) => [p.mu, Math.log(p.s)],
  unpack: makeUnpack([["mu", "id"], ["s", "log"]]),
  valid: (p) => isNum(p.mu) && p.s > 0
};
var laplace = {
  id: "laplace",
  name: "Laplace \u5206\u5E03",
  group: "\u4F4D\u7F6E-\u5C3A\u5EA6\u578B",
  k: 2,
  support: "real",
  paramNames: ["mu", "b"],
  params: [
    { name: "mu", label: "\u03BC \u4F4D\u7F6E", init: 0 },
    { name: "b", label: "b \u5C3A\u5EA6", init: 1 }
  ],
  pdf(x, p) {
    const b = p.b;
    if (!(b > 0) || !isNum(x) || !isNum(p.mu)) return 0;
    return Math.exp(-Math.abs(x - p.mu) / b) / (2 * b);
  },
  logpdf(x, p) {
    const b = p.b;
    if (!(b > 0) || !isNum(x) || !isNum(p.mu)) return NaN;
    return -Math.abs(x - p.mu) / b - Math.log(2 * b);
  },
  cdf(x, p) {
    const b = p.b;
    if (!(b > 0)) return NaN;
    const z = (x - p.mu) / b;
    return z < 0 ? 0.5 * Math.exp(z) : clamp01(1 - 0.5 * Math.exp(-z));
  },
  quantile(q, p) {
    if (q <= 0) return -Infinity;
    if (q >= 1) return Infinity;
    return q < 0.5 ? p.mu + p.b * Math.log(2 * q) : p.mu - p.b * Math.log(2 * (1 - q));
  },
  initial(x) {
    const st = dataStats(x);
    let mad = 0;
    for (let i = 0; i < st.n; i++) mad += Math.abs(st.x[i] - st.median);
    mad /= Math.max(1, st.n);
    return { mu: st.median, b: Math.max(mad, 1e-12) };
  },
  prepare: (x) => ({ x }),
  sumLogpdf(ctx, p) {
    const xs = ctx.x;
    const mu = p.mu;
    const b = p.b;
    const ln2b = Math.log(2 * b);
    let acc = 0;
    for (let i = 0; i < xs.length; i++) {
      const v = -Math.abs(xs[i] - mu) / b - ln2b;
      if (!isNum(v)) return -Infinity;
      acc += v;
    }
    return acc;
  },
  pack: (p) => [p.mu, Math.log(p.b)],
  unpack: makeUnpack([["mu", "id"], ["b", "log"]]),
  valid: (p) => isNum(p.mu) && p.b > 0
};
var cauchy = {
  id: "cauchy",
  name: "Cauchy \u5206\u5E03",
  group: "\u4F4D\u7F6E-\u5C3A\u5EA6\u578B",
  k: 2,
  support: "real",
  paramNames: ["x0", "gamma"],
  params: [
    { name: "x0", label: "x\u2080 \u4F4D\u7F6E", init: 0 },
    { name: "gamma", label: "\u03B3 \u5C3A\u5EA6", init: 1 }
  ],
  pdf(x, p) {
    const g = p.gamma;
    if (!(g > 0) || !isNum(x) || !isNum(p.x0)) return 0;
    const z = (x - p.x0) / g;
    return 1 / (Math.PI * g * (1 + z * z));
  },
  logpdf(x, p) {
    const g = p.gamma;
    if (!(g > 0) || !isNum(x) || !isNum(p.x0)) return NaN;
    const z = (x - p.x0) / g;
    return -Math.log(Math.PI * g) - Math.log1p(z * z);
  },
  cdf(x, p) {
    const g = p.gamma;
    if (!(g > 0)) return NaN;
    return clamp01(0.5 + Math.atan((x - p.x0) / g) / Math.PI);
  },
  quantile(q, p) {
    if (q <= 0) return -Infinity;
    if (q >= 1) return Infinity;
    if (q === 0.5) return p.x0;
    const z = q < 0.5 ? -1 / Math.tan(Math.PI * q) : 1 / Math.tan(Math.PI * (1 - q));
    return p.x0 + p.gamma * z;
  },
  initial(x) {
    const st = dataStats(x);
    const g = (st.q3 - st.q1) / 2;
    return {
      x0: st.median,
      gamma: Math.max(g > 0 ? g : st.sd, 1e-12)
    };
  },
  prepare: (x) => ({ x }),
  sumLogpdf(ctx, p) {
    const xs = ctx.x;
    const g = p.gamma;
    const x0 = p.x0;
    const ln = Math.log(Math.PI * g);
    let acc = 0;
    for (let i = 0; i < xs.length; i++) {
      const z = (xs[i] - x0) / g;
      const v = -ln - Math.log1p(z * z);
      if (!isNum(v)) return -Infinity;
      acc += v;
    }
    return acc;
  },
  pack: (p) => [p.x0, Math.log(p.gamma)],
  unpack: makeUnpack([["x0", "id"], ["gamma", "log"]]),
  valid: (p) => isNum(p.x0) && p.gamma > 0
};
var uniform = {
  id: "uniform",
  name: "\u5747\u5300\u5206\u5E03",
  group: "\u6709\u754C\u578B",
  k: 2,
  support: "real",
  paramNames: ["a", "b"],
  params: [
    { name: "a", label: "a \u4E0B\u9650", init: 0 },
    { name: "b", label: "b \u4E0A\u9650", init: 1 }
  ],
  pdf(x, p) {
    const a = p.a;
    const b = p.b;
    if (!(b > a) || !isNum(x)) return 0;
    return x < a || x > b ? 0 : 1 / (b - a);
  },
  logpdf(x, p) {
    const a = p.a;
    const b = p.b;
    if (!(b > a) || !isNum(x) || x < a || x > b) return -Infinity;
    return -Math.log(b - a);
  },
  cdf(x, p) {
    const a = p.a;
    const b = p.b;
    if (!(b > a)) return NaN;
    return clamp01((x - a) / (b - a));
  },
  quantile(q, p) {
    if (q <= 0) return p.a;
    if (q >= 1) return p.b;
    return p.a + q * (p.b - p.a);
  },
  initial(x) {
    const st = dataStats(x);
    return { a: st.min, b: st.max };
  },
  prepare: (x) => ({ x }),
  sumLogpdf(ctx, p) {
    const a = p.a;
    const b = p.b;
    if (!(b > a)) return -Infinity;
    return -ctx.x.length * Math.log(b - a);
  },
  valid: (p) => isNum(p.a) && isNum(p.b) && p.b > p.a,
  customFit(x, o, init) {
    const st = dataStats(x);
    const a = st.min;
    const b = st.max;
    if (!(b > a)) return naFit(init, 0);
    const loglik = -st.n * Math.log(b - a);
    return {
      params: { a, b },
      loglik,
      converged: true,
      iterations: 0,
      start: { a, b }
    };
  }
};
var lognormal = {
  id: "lognormal",
  name: "\u5BF9\u6570\u6B63\u6001\u5206\u5E03",
  group: "\u6B63\u504F\u5BFF\u547D\u578B",
  k: 2,
  support: "positive",
  paramNames: ["mu", "sigma"],
  params: [
    { name: "mu", label: "\u03BC (ln x \u5747\u503C)", init: 0 },
    { name: "sigma", label: "\u03C3 (ln x \u6807\u51C6\u5DEE)", init: 1 }
  ],
  pdf(x, p) {
    const lp = lognormal.logpdf(x, p);
    return lp === -Infinity ? 0 : Math.exp(lp);
  },
  logpdf(x, p) {
    const s = p.sigma;
    if (!(s > 0) || !(x > 0) || !isNum(p.mu)) return x > 0 ? NaN : -Infinity;
    const u = Math.log(x);
    const z = (u - p.mu) / s;
    return -u - Math.log(s) - LN_SQRT2PI - 0.5 * z * z;
  },
  cdf(x, p) {
    if (!(p.sigma > 0)) return NaN;
    if (!(x > 0)) return 0;
    return clamp01(normCdf((Math.log(x) - p.mu) / p.sigma));
  },
  quantile(q, p) {
    if (q <= 0) return 0;
    if (q >= 1) return Infinity;
    return Math.exp(p.mu + p.sigma * normInv(q));
  },
  initial(x) {
    const st = dataStats(x);
    let s = 0;
    let c = 0;
    for (let i = 0; i < st.n; i++) {
      s += Math.log(st.x[i]);
      c++;
    }
    const m = s / c;
    let ss = 0;
    for (let i = 0; i < st.n; i++) {
      const d = Math.log(st.x[i]) - m;
      ss += d * d;
    }
    return { mu: m, sigma: Math.max(Math.sqrt(ss / c), 1e-9) };
  },
  prepare(x) {
    const lnx = new Array(x.length);
    for (let i = 0; i < x.length; i++) lnx[i] = Math.log(x[i]);
    return { x, lnx };
  },
  sumLogpdf(ctx, p) {
    const u = ctx.lnx;
    const mu = p.mu;
    const s = p.sigma;
    const lnS = Math.log(s);
    let acc = 0;
    for (let i = 0; i < u.length; i++) {
      const z = (u[i] - mu) / s;
      const v = -u[i] - lnS - LN_SQRT2PI - 0.5 * z * z;
      if (!isNum(v)) return -Infinity;
      acc += v;
    }
    return acc;
  },
  pack: packLocScale,
  unpack: makeUnpack([["mu", "id"], ["sigma", "log"]]),
  valid: (p) => isNum(p.mu) && p.sigma > 0
};
var gamma = {
  id: "gamma",
  name: "Gamma \u5206\u5E03",
  group: "\u6B63\u504F\u5BFF\u547D\u578B",
  k: 2,
  support: "positive",
  paramNames: ["alpha", "beta"],
  params: [
    { name: "alpha", label: "\u03B1 \u5F62\u72B6", init: 2 },
    { name: "beta", label: "\u03B2 \u5C3A\u5EA6", init: 1 }
  ],
  pdf(x, p) {
    const lp = gamma.logpdf(x, p);
    return lp === -Infinity ? 0 : Math.exp(lp);
  },
  logpdf(x, p) {
    const a = p.alpha;
    const b = p.beta;
    if (!(a > 0) || !(b > 0) || !isNum(p.alpha) || !isNum(p.beta)) return NaN;
    if (!(x > 0)) return -Infinity;
    return (a - 1) * Math.log(x) - x / b - lgamma(a) - a * Math.log(b);
  },
  cdf(x, p) {
    const a = p.alpha;
    const b = p.beta;
    if (!(a > 0) || !(b > 0)) return NaN;
    if (!(x > 0)) return 0;
    return clamp01(gammaIncompleteP(a, x / b));
  },
  quantile(q, p) {
    if (q <= 0) return 0;
    if (q >= 1) return Infinity;
    return p.beta * gammaQuantileUnit(q, p.alpha);
  },
  initial(x) {
    const st = dataStats(x);
    const m = st.mean;
    const v = st.variance;
    if (!(m > 0)) return null;
    let a = v > 0 ? m * m / v : 1;
    a = clamp(a, 0.05, 1e5);
    const b = m / a;
    return { alpha: a, beta: b };
  },
  prepare(x) {
    const lnx = new Array(x.length);
    for (let i = 0; i < x.length; i++) lnx[i] = Math.log(x[i]);
    return { x, lnx };
  },
  sumLogpdf(ctx, p) {
    const xs = ctx.x;
    const lnx = ctx.lnx;
    const a = p.alpha;
    const b = p.beta;
    const c = lgamma(a) + a * Math.log(b);
    let acc = 0;
    for (let i = 0; i < xs.length; i++) {
      const v = (a - 1) * lnx[i] - xs[i] / b - c;
      if (!isNum(v)) return -Infinity;
      acc += v;
    }
    return acc;
  },
  pack: (p) => [Math.log(p.alpha), Math.log(p.beta)],
  unpack: makeUnpack([["alpha", "log"], ["beta", "log"]]),
  valid: (p) => p.alpha > 0 && p.beta > 0
};
var weibull = {
  id: "weibull",
  name: "Weibull \u5206\u5E03",
  group: "\u6B63\u504F\u5BFF\u547D\u578B",
  k: 2,
  support: "positive",
  paramNames: ["k", "lambda"],
  params: [
    { name: "k", label: "k \u5F62\u72B6", init: 2 },
    { name: "lambda", label: "\u03BB \u5C3A\u5EA6", init: 1 }
  ],
  pdf(x, p) {
    const lp = weibull.logpdf(x, p);
    return lp === -Infinity ? 0 : Math.exp(lp);
  },
  logpdf(x, p) {
    const k = p.k;
    const lam = p.lambda;
    if (!(k > 0) || !(lam > 0) || !isNum(p.k) || !isNum(p.lambda)) return NaN;
    if (!(x > 0)) return -Infinity;
    const u = Math.log(x) - Math.log(lam);
    const t = Math.exp(k * u);
    if (!isNum(t)) return -1e300;
    return Math.log(k) - Math.log(lam) + (k - 1) * u - t;
  },
  cdf(x, p) {
    const k = p.k;
    const lam = p.lambda;
    if (!(k > 0) || !(lam > 0)) return NaN;
    if (!(x > 0)) return 0;
    const t = Math.exp(k * (Math.log(x) - Math.log(lam)));
    if (!isNum(t)) return 1;
    return clamp01(-Math.expm1(-t));
  },
  quantile(q, p) {
    if (q <= 0) return 0;
    if (q >= 1) return Infinity;
    return p.lambda * Math.pow(-Math.log1p(-q), 1 / p.k);
  },
  initial(x) {
    const st = dataStats(x);
    let m = 0;
    for (let i = 0; i < st.n; i++) m += Math.log(st.x[i]);
    m /= st.n;
    let ss = 0;
    for (let i = 0; i < st.n; i++) {
      const d = Math.log(st.x[i]) - m;
      ss += d * d;
    }
    const sl = Math.sqrt(ss / st.n);
    let k = sl > 1e-9 ? 1.282549830161864 / sl : 2;
    k = clamp(k, 0.05, 100);
    const lam = Math.exp(m + EULER_GAMMA / k);
    return { k, lambda: Math.max(lam, 1e-12) };
  },
  prepare(x) {
    const lnx = new Array(x.length);
    for (let i = 0; i < x.length; i++) lnx[i] = Math.log(x[i]);
    return { x, lnx };
  },
  sumLogpdf(ctx, p) {
    const u = ctx.lnx;
    const k = p.k;
    const lam = p.lambda;
    const lnLam = Math.log(lam);
    const lnK = Math.log(k);
    let acc = 0;
    for (let i = 0; i < u.length; i++) {
      const t = u[i] - lnLam;
      const exp = Math.exp(k * t);
      if (!isNum(exp)) return -Infinity;
      const v = lnK - lnLam + (k - 1) * t - exp;
      if (!isNum(v)) return -Infinity;
      acc += v;
    }
    return acc;
  },
  pack: (p) => [Math.log(p.k), Math.log(p.lambda)],
  unpack: makeUnpack([["k", "log"], ["lambda", "log"]]),
  valid: (p) => p.k > 0 && p.lambda > 0
};
var exponential = {
  id: "exponential",
  name: "\u6307\u6570\u5206\u5E03",
  group: "\u6B63\u504F\u5BFF\u547D\u578B",
  k: 1,
  support: "positive",
  paramNames: ["lambda"],
  params: [{ name: "lambda", label: "\u03BB \u5C3A\u5EA6 (= \u5747\u503C)", init: 1 }],
  pdf(x, p) {
    const lam = p.lambda;
    if (!(lam > 0) || !isNum(x)) return 0;
    if (x < 0) return 0;
    return Math.exp(-x / lam) / lam;
  },
  logpdf(x, p) {
    const lam = p.lambda;
    if (!(lam > 0) || !isNum(x)) return NaN;
    if (x < 0) return -Infinity;
    return -x / lam - Math.log(lam);
  },
  cdf(x, p) {
    const lam = p.lambda;
    if (!(lam > 0)) return NaN;
    if (x <= 0) return 0;
    return clamp01(-Math.expm1(-x / lam));
  },
  quantile(q, p) {
    if (q <= 0) return 0;
    if (q >= 1) return Infinity;
    return -p.lambda * Math.log1p(-q);
  },
  initial(x) {
    const st = dataStats(x);
    return { lambda: Math.max(st.mean, 1e-12) };
  },
  prepare: (x) => ({ x }),
  sumLogpdf(ctx, p) {
    const xs = ctx.x;
    const lam = p.lambda;
    const lnLam = Math.log(lam);
    let acc = 0;
    for (let i = 0; i < xs.length; i++) {
      const v = -xs[i] / lam - lnLam;
      if (!isNum(v)) return -Infinity;
      acc += v;
    }
    return acc;
  },
  valid: (p) => p.lambda > 0,
  customFit(x, o, init) {
    const st = dataStats(x);
    const lam = st.mean;
    if (!(lam > 0)) return naFit({ lambda: lam }, 0);
    const loglik = exponential.sumLogpdf({ x }, { lambda: lam });
    return {
      params: { lambda: lam },
      loglik,
      converged: isNum(loglik),
      iterations: 0,
      start: { lambda: lam }
    };
  }
};
var rayleigh = {
  id: "rayleigh",
  name: "Rayleigh \u5206\u5E03",
  group: "\u6B63\u504F\u5BFF\u547D\u578B",
  k: 1,
  support: "positive",
  paramNames: ["sigma"],
  params: [{ name: "sigma", label: "\u03C3 \u5C3A\u5EA6", init: 1 }],
  pdf(x, p) {
    const s = p.sigma;
    if (!(s > 0) || !isNum(x) || x < 0) return 0;
    return x / (s * s) * Math.exp(-(x * x) / (2 * s * s));
  },
  logpdf(x, p) {
    const s = p.sigma;
    if (!(s > 0) || !isNum(x)) return NaN;
    if (!(x > 0)) return -Infinity;
    return Math.log(x) - 2 * Math.log(s) - x * x / (2 * s * s);
  },
  cdf(x, p) {
    const s = p.sigma;
    if (!(s > 0)) return NaN;
    if (x <= 0) return 0;
    return clamp01(-Math.expm1(-(x * x) / (2 * s * s)));
  },
  quantile(q, p) {
    if (q <= 0) return 0;
    if (q >= 1) return Infinity;
    return p.sigma * Math.sqrt(-2 * Math.log1p(-q));
  },
  initial(x) {
    const st = dataStats(x);
    let s2 = 0;
    for (let i = 0; i < st.n; i++) s2 += st.x[i] * st.x[i];
    return { sigma: Math.max(Math.sqrt(s2 / (2 * st.n)), 1e-12) };
  },
  prepare: (x) => ({ x }),
  sumLogpdf(ctx, p) {
    const xs = ctx.x;
    const s = p.sigma;
    const s2 = s * s;
    let acc = 0;
    for (let i = 0; i < xs.length; i++) {
      const v = Math.log(xs[i]) - 2 * Math.log(s) - xs[i] * xs[i] / (2 * s2);
      if (!isNum(v)) return -Infinity;
      acc += v;
    }
    return acc;
  },
  valid: (p) => p.sigma > 0,
  customFit(x, o, init) {
    const st = dataStats(x);
    let s2 = 0;
    for (let i = 0; i < st.n; i++) s2 += st.x[i] * st.x[i];
    const sigma = Math.sqrt(s2 / (2 * st.n));
    const loglik = rayleigh.sumLogpdf({ x }, { sigma });
    return {
      params: { sigma },
      loglik,
      converged: isNum(loglik) && sigma > 0,
      iterations: 0,
      start: { sigma }
    };
  }
};
var invgauss = {
  id: "invgauss",
  name: "\u9006\u9AD8\u65AF\u5206\u5E03",
  group: "\u6B63\u504F\u5BFF\u547D\u578B",
  k: 2,
  support: "positive",
  paramNames: ["mu", "lambda"],
  params: [
    { name: "mu", label: "\u03BC \u5747\u503C", init: 1 },
    { name: "lambda", label: "\u03BB \u5F62\u72B6", init: 1 }
  ],
  pdf(x, p) {
    const lp = invgauss.logpdf(x, p);
    return lp === -Infinity ? 0 : Math.exp(lp);
  },
  logpdf(x, p) {
    const mu = p.mu;
    const lam = p.lambda;
    if (!(mu > 0) || !(lam > 0) || !isNum(p.mu) || !isNum(p.lambda)) return NaN;
    if (!(x > 0)) return -Infinity;
    return 0.5 * Math.log(lam) - 0.5 * Math.log(2 * Math.PI) - 1.5 * Math.log(x) - lam * (x - mu) * (x - mu) / (2 * mu * mu * x);
  },
  cdf(x, p) {
    const mu = p.mu;
    const lam = p.lambda;
    if (!(mu > 0) || !(lam > 0)) return NaN;
    if (!(x > 0)) return 0;
    const r = Math.sqrt(lam / x);
    const z1 = r * (x / mu - 1);
    const z2 = -r * (x / mu + 1);
    const logF = logaddexp(logNormCdf(z1), 2 * lam / mu + logNormCdf(z2));
    return clamp01(logF >= 0 ? 1 : Math.exp(logF));
  },
  quantile(q, p) {
    const mu = p.mu;
    const lam = p.lambda;
    if (q <= 0) return 0;
    if (q >= 1) return Infinity;
    let hi = mu;
    let guard = 0;
    while (invgauss.cdf(hi, p) < q && guard++ < 400) hi *= 2;
    if (!isNum(hi)) return Infinity;
    const r = bisect((x) => invgauss.cdf(x, p) - q, 0, hi, {
      tol: 1e-14,
      maxIter: 140
    });
    return r.x;
  },
  initial(x) {
    const st = dataStats(x);
    const m = st.mean;
    const v = st.variance;
    const mu = Math.max(m, 1e-12);
    let lam = v > 0 ? mu * mu * mu / v : 1;
    lam = clamp(lam, 1e-9, 1e12);
    return { mu, lambda: lam };
  },
  prepare: (x) => ({ x }),
  sumLogpdf(ctx, p) {
    const xs = ctx.x;
    const mu = p.mu;
    const lam = p.lambda;
    const c = 0.5 * Math.log(lam) - 0.5 * Math.log(2 * Math.PI);
    const mu2 = mu * mu;
    let acc = 0;
    for (let i = 0; i < xs.length; i++) {
      const xi = xs[i];
      const d = xi - mu;
      const v = c - 1.5 * Math.log(xi) - lam * d * d / (2 * mu2 * xi);
      if (!isNum(v)) return -Infinity;
      acc += v;
    }
    return acc;
  },
  pack: (p) => [Math.log(p.mu), Math.log(p.lambda)],
  unpack: makeUnpack([["mu", "log"], ["lambda", "log"]]),
  valid: (p) => p.mu > 0 && p.lambda > 0
};
var loglogistic = {
  id: "loglogistic",
  name: "\u5BF9\u6570 Logistic",
  group: "\u6B63\u504F\u5BFF\u547D\u578B",
  k: 2,
  support: "positive",
  paramNames: ["c", "lambda"],
  params: [
    { name: "c", label: "c \u5F62\u72B6", init: 2 },
    { name: "lambda", label: "\u03BB \u5C3A\u5EA6", init: 1 }
  ],
  pdf(x, p) {
    const lp = loglogistic.logpdf(x, p);
    return lp === -Infinity ? 0 : Math.exp(lp);
  },
  logpdf(x, p) {
    const c = p.c;
    const lam = p.lambda;
    if (!(c > 0) || !(lam > 0) || !isNum(p.c) || !isNum(p.lambda)) return NaN;
    if (!(x > 0)) return -Infinity;
    const u = Math.log(x) - Math.log(lam);
    return Math.log(c) - Math.log(lam) + (c - 1) * u - 2 * log1pexp(c * u);
  },
  cdf(x, p) {
    const c = p.c;
    const lam = p.lambda;
    if (!(c > 0) || !(lam > 0)) return NaN;
    if (!(x > 0)) return 0;
    return clamp01(expit(c * (Math.log(x) - Math.log(lam))));
  },
  quantile(q, p) {
    if (q <= 0) return 0;
    if (q >= 1) return Infinity;
    return p.lambda * Math.pow(q / (1 - q), 1 / p.c);
  },
  initial(x) {
    const st = dataStats(x);
    const ratio = st.q3 / st.q1;
    let c = ratio > 1 + 1e-9 ? Math.log(9) / Math.log(ratio) : 2;
    c = clamp(c, 0.05, 100);
    return { c, lambda: Math.max(st.median, 1e-12) };
  },
  prepare(x) {
    const lnx = new Array(x.length);
    for (let i = 0; i < x.length; i++) lnx[i] = Math.log(x[i]);
    return { x, lnx };
  },
  sumLogpdf(ctx, p) {
    const u0 = ctx.lnx;
    const c = p.c;
    const lam = p.lambda;
    const lnLam = Math.log(lam);
    const lnC = Math.log(c);
    let acc = 0;
    for (let i = 0; i < u0.length; i++) {
      const u = u0[i] - lnLam;
      const v = lnC - lnLam + (c - 1) * u - 2 * log1pexp(c * u);
      if (!isNum(v)) return -Infinity;
      acc += v;
    }
    return acc;
  },
  pack: (p) => [Math.log(p.c), Math.log(p.lambda)],
  unpack: makeUnpack([["c", "log"], ["lambda", "log"]]),
  valid: (p) => p.c > 0 && p.lambda > 0
};
var lomax = {
  id: "lomax",
  name: "Lomax \u5206\u5E03 (Pareto II)",
  group: "\u6B63\u504F\u5BFF\u547D\u578B",
  k: 2,
  support: "positive",
  paramNames: ["alpha", "lambda"],
  params: [
    { name: "alpha", label: "\u03B1 \u5F62\u72B6", init: 3 },
    { name: "lambda", label: "\u03BB \u5C3A\u5EA6", init: 1 }
  ],
  pdf(x, p) {
    const lp = lomax.logpdf(x, p);
    return lp === -Infinity ? 0 : Math.exp(lp);
  },
  logpdf(x, p) {
    const a = p.alpha;
    const lam = p.lambda;
    if (!(a > 0) || !(lam > 0) || !isNum(p.alpha) || !isNum(p.lambda)) return NaN;
    if (!(x >= 0)) return -Infinity;
    if (x === 0) return Math.log(a) - Math.log(lam);
    return -Math.log(lam) + Math.log(a) - (a + 1) * log1pexp(Math.log(x) - Math.log(lam));
  },
  cdf(x, p) {
    const a = p.alpha;
    const lam = p.lambda;
    if (!(a > 0) || !(lam > 0)) return NaN;
    if (!(x > 0)) return 0;
    return clamp01(-Math.expm1(-a * log1pexp(Math.log(x) - Math.log(lam))));
  },
  quantile(q, p) {
    if (q <= 0) return 0;
    if (q >= 1) return Infinity;
    return p.lambda * Math.expm1(-Math.log1p(-q) / p.alpha);
  },
  initial(x) {
    const st = dataStats(x);
    const m = st.mean;
    const v = st.variance;
    const r = m > 0 ? v / (m * m) : 0;
    let a;
    let lam;
    if (r > 1.02) {
      a = 2 * r / (r - 1);
      a = clamp(a, 0.2, 200);
      lam = m * (a - 1);
      if (!(lam > 0)) lam = st.median / Math.max(Math.expm1(Math.LN2 / a), 1e-9);
    } else {
      a = 2.5;
      lam = st.median / Math.max(Math.expm1(Math.LN2 / a), 1e-9);
    }
    return { alpha: a, lambda: Math.max(lam, 1e-12) };
  },
  prepare(x) {
    const lnx = new Array(x.length);
    for (let i = 0; i < x.length; i++) lnx[i] = Math.log(x[i]);
    return { x, lnx };
  },
  sumLogpdf(ctx, p) {
    const u0 = ctx.lnx;
    const a = p.alpha;
    const lam = p.lambda;
    const c = Math.log(a) - Math.log(lam);
    let acc = 0;
    for (let i = 0; i < u0.length; i++) {
      const v = c - (a + 1) * log1pexp(u0[i] - Math.log(lam));
      if (!isNum(v)) return -Infinity;
      acc += v;
    }
    return acc;
  },
  pack: (p) => [Math.log(p.alpha), Math.log(p.lambda)],
  unpack: makeUnpack([["alpha", "log"], ["lambda", "log"]]),
  valid: (p) => p.alpha > 0 && p.lambda > 0
};
var burr = {
  id: "burr",
  name: "Burr XII \u5206\u5E03",
  group: "\u6B63\u504F\u5BFF\u547D\u578B",
  k: 3,
  support: "positive",
  paramNames: ["c", "k", "lambda"],
  params: [
    { name: "c", label: "c \u5F62\u72B6", init: 2 },
    { name: "k", label: "k \u5F62\u72B6", init: 2 },
    { name: "lambda", label: "\u03BB \u5C3A\u5EA6", init: 1 }
  ],
  pdf(x, p) {
    const lp = burr.logpdf(x, p);
    return lp === -Infinity ? 0 : Math.exp(lp);
  },
  logpdf(x, p) {
    const c = p.c;
    const k = p.k;
    const lam = p.lambda;
    if (!(c > 0) || !(k > 0) || !(lam > 0)) return NaN;
    if (!isNum(p.c) || !isNum(p.k) || !isNum(p.lambda)) return NaN;
    if (!(x > 0)) return -Infinity;
    const u = Math.log(x) - Math.log(lam);
    return Math.log(c) + Math.log(k) - Math.log(lam) + (c - 1) * u - (k + 1) * log1pexp(c * u);
  },
  cdf(x, p) {
    const c = p.c;
    const k = p.k;
    const lam = p.lambda;
    if (!(c > 0) || !(k > 0) || !(lam > 0)) return NaN;
    if (!(x > 0)) return 0;
    return clamp01(-Math.expm1(-k * log1pexp(c * (Math.log(x) - Math.log(lam)))));
  },
  quantile(q, p) {
    if (q <= 0) return 0;
    if (q >= 1) return Infinity;
    const t = Math.expm1(-Math.log1p(-q) / p.k);
    return p.lambda * Math.pow(t, 1 / p.c);
  },
  initial(x) {
    const st = dataStats(x);
    if (st.n < 5 || !(st.min > 0)) return null;
    const probs = [0.1, 0.3, 0.5, 0.7, 0.9];
    const emp = probs.map((p) => Math.log(sampleQuantile(st.x, p)));
    const lnMed = Math.log(st.median);
    const resid = (u) => {
      const c = Math.exp(u[0]);
      const k = Math.exp(u[1]);
      const lam = Math.exp(u[2]);
      let s = 0;
      for (let j = 0; j < probs.length; j++) {
        const sN = -Math.log1p(-probs[j]) / k;
        const t = Math.expm1(sN);
        if (!(t > 0)) return 1e6;
        const pred = Math.log(lam) + Math.log(t) / c;
        const d = pred - emp[j];
        s += d * d;
      }
      return s;
    };
    const r = nelderMead(resid, [Math.log(1.5), Math.log(1.5), lnMed], {
      maxIter: 240,
      tol: 1e-10
    });
    if (r.converged && isNum(r.fx) && r.fx < 1e-4) {
      return {
        c: clamp(Math.exp(r.x[0]), 0.05, 100),
        k: clamp(Math.exp(r.x[1]), 0.05, 100),
        lambda: clamp(Math.exp(r.x[2]), 1e-12, 1e12)
      };
    }
    return { c: 1.5, k: 1.5, lambda: Math.max(st.median, 1e-12) };
  },
  prepare(x) {
    const lnx = new Array(x.length);
    for (let i = 0; i < x.length; i++) lnx[i] = Math.log(x[i]);
    return { x, lnx };
  },
  sumLogpdf(ctx, p) {
    const u0 = ctx.lnx;
    const c = p.c;
    const k = p.k;
    const lam = p.lambda;
    const lnLam = Math.log(lam);
    const cc = Math.log(c) + Math.log(k) - lnLam;
    let acc = 0;
    for (let i = 0; i < u0.length; i++) {
      const u = u0[i] - lnLam;
      const v = cc + (c - 1) * u - (k + 1) * log1pexp(c * u);
      if (!isNum(v)) return -Infinity;
      acc += v;
    }
    return acc;
  },
  pack: (p) => [Math.log(p.c), Math.log(p.k), Math.log(p.lambda)],
  unpack: makeUnpack([["c", "log"], ["k", "log"], ["lambda", "log"]]),
  valid: (p) => p.c > 0 && p.k > 0 && p.lambda > 0
};
var fatiguelife = {
  id: "fatiguelife",
  name: "\u75B2\u52B3\u5BFF\u547D\u5206\u5E03 (BS)",
  group: "\u6B63\u504F\u5BFF\u547D\u578B",
  k: 2,
  support: "positive",
  paramNames: ["beta", "c"],
  params: [
    { name: "beta", label: "\u03B2 \u5C3A\u5EA6", init: 1 },
    { name: "c", label: "c \u5F62\u72B6", init: 1 }
  ],
  pdf(x, p) {
    const lp = fatiguelife.logpdf(x, p);
    return lp === -Infinity ? 0 : Math.exp(lp);
  },
  logpdf(x, p) {
    const beta2 = p.beta;
    const c = p.c;
    if (!(beta2 > 0) || !(c > 0) || !isNum(p.beta) || !isNum(p.c)) return NaN;
    if (!(x > 0)) return -Infinity;
    const z = (Math.sqrt(x / beta2) - Math.sqrt(beta2 / x)) / c;
    return -0.5 * z * z - LN_SQRT2PI - Math.log(2 * c) - 0.5 * Math.log(beta2) - 1.5 * Math.log(x) + Math.log(x + beta2);
  },
  cdf(x, p) {
    const beta2 = p.beta;
    const c = p.c;
    if (!(beta2 > 0) || !(c > 0)) return NaN;
    if (!(x > 0)) return 0;
    const z = (Math.sqrt(x / beta2) - Math.sqrt(beta2 / x)) / c;
    return clamp01(normCdf(z));
  },
  quantile(q, p) {
    if (q <= 0) return 0;
    if (q >= 1) return Infinity;
    const z = normInv(q);
    const c = p.c;
    const t = (c * z + Math.sqrt(c * c * z * z + 4)) / 2;
    return p.beta * t * t;
  },
  initial(x) {
    const st = dataStats(x);
    const beta2 = Math.max(st.median, 1e-12);
    const q75 = sampleQuantile(st.x, 0.75);
    const t = Math.sqrt(Math.max(q75, 1e-300) / beta2);
    const c = (t - 1 / t) / Z75;
    return { beta: beta2, c: clamp(c, 0.02, 50) };
  },
  prepare(x) {
    const lnx = new Array(x.length);
    for (let i = 0; i < x.length; i++) lnx[i] = Math.log(x[i]);
    return { x, lnx };
  },
  sumLogpdf(ctx, p) {
    const xs = ctx.x;
    const beta2 = p.beta;
    const c = p.c;
    const lnBeta = Math.log(beta2);
    const cst = -LN_SQRT2PI - Math.log(2 * c) - 0.5 * lnBeta;
    let acc = 0;
    for (let i = 0; i < xs.length; i++) {
      const xi = xs[i];
      const z = (Math.sqrt(xi / beta2) - Math.sqrt(beta2 / xi)) / c;
      const v = -0.5 * z * z + cst - 1.5 * Math.log(xi) + Math.log(xi + beta2);
      if (!isNum(v)) return -Infinity;
      acc += v;
    }
    return acc;
  },
  pack: (p) => [Math.log(p.beta), Math.log(p.c)],
  unpack: makeUnpack([["beta", "log"], ["c", "log"]]),
  valid: (p) => p.beta > 0 && p.c > 0
};
var nakagami = {
  id: "nakagami",
  name: "Nakagami \u5206\u5E03",
  group: "\u6B63\u504F\u5BFF\u547D\u578B",
  k: 2,
  support: "positive",
  paramNames: ["nu", "omega"],
  params: [
    { name: "nu", label: "\u03BD \u5F62\u72B6", init: 2 },
    { name: "omega", label: "\u03C9 \u5C3A\u5EA6\xB2", init: 1 }
  ],
  pdf(x, p) {
    const lp = nakagami.logpdf(x, p);
    return lp === -Infinity ? 0 : Math.exp(lp);
  },
  logpdf(x, p) {
    const nu = p.nu;
    const om = p.omega;
    if (!(nu > 0) || !(om > 0) || !isNum(p.nu) || !isNum(p.omega)) return NaN;
    if (!(x > 0)) return -Infinity;
    return Math.log(2) + nu * Math.log(nu) - lgamma(nu) - nu * Math.log(om) + (2 * nu - 1) * Math.log(x) - nu * x * x / om;
  },
  cdf(x, p) {
    const nu = p.nu;
    const om = p.omega;
    if (!(nu > 0) || !(om > 0)) return NaN;
    if (!(x > 0)) return 0;
    return clamp01(gammaIncompleteP(nu, nu * x * x / om));
  },
  quantile(q, p) {
    if (q <= 0) return 0;
    if (q >= 1) return Infinity;
    const g = gammaQuantileUnit(q, p.nu);
    return Math.sqrt(p.omega / p.nu * g);
  },
  initial(x) {
    const st = dataStats(x);
    let m2 = 0;
    for (let i = 0; i < st.n; i++) m2 += st.x[i] * st.x[i];
    m2 /= st.n;
    let v2 = 0;
    for (let i = 0; i < st.n; i++) {
      const d = st.x[i] * st.x[i] - m2;
      v2 += d * d;
    }
    v2 /= st.n;
    const nu = v2 > 0 ? m2 * m2 / v2 : 2;
    return { nu: clamp(nu, 0.05, 200), omega: Math.max(m2, 1e-12) };
  },
  prepare(x) {
    const n = x.length;
    const lnx = new Array(n);
    const x2 = new Array(n);
    for (let i = 0; i < n; i++) {
      lnx[i] = Math.log(x[i]);
      x2[i] = x[i] * x[i];
    }
    return { x, lnx, x2 };
  },
  sumLogpdf(ctx, p) {
    const lnx = ctx.lnx;
    const x2 = ctx.x2;
    const nu = p.nu;
    const om = p.omega;
    const c = Math.log(2) + nu * Math.log(nu) - lgamma(nu) - nu * Math.log(om);
    const nuOverOm = nu / om;
    let acc = 0;
    for (let i = 0; i < lnx.length; i++) {
      const v = c + (2 * nu - 1) * lnx[i] - nuOverOm * x2[i];
      if (!isNum(v)) return -Infinity;
      acc += v;
    }
    return acc;
  },
  pack: (p) => [Math.log(p.nu), Math.log(p.omega)],
  unpack: makeUnpack([["nu", "log"], ["omega", "log"]]),
  valid: (p) => p.nu > 0 && p.omega > 0
};
var maxwell = {
  id: "maxwell",
  name: "Maxwell \u5206\u5E03",
  group: "\u6B63\u504F\u5BFF\u547D\u578B",
  k: 1,
  support: "positive",
  paramNames: ["a"],
  params: [{ name: "a", label: "a \u5C3A\u5EA6", init: 1 }],
  pdf(x, p) {
    const a = p.a;
    if (!(a > 0) || !isNum(x)) return 0;
    if (!(x > 0)) return 0;
    return Math.sqrt(2 / Math.PI) * (x * x) * Math.exp(-(x * x) / (2 * a * a)) / (a * a * a);
  },
  logpdf(x, p) {
    const a = p.a;
    if (!(a > 0) || !isNum(x)) return NaN;
    if (!(x > 0)) return -Infinity;
    return LN_SQRT_2_OVER_PI + 2 * Math.log(x) - 3 * Math.log(a) - x * x / (2 * a * a);
  },
  cdf(x, p) {
    const a = p.a;
    if (!(a > 0)) return NaN;
    if (x <= 0) return 0;
    return clamp01(gammaIncompleteP(1.5, x * x / (2 * a * a)));
  },
  quantile(q, p) {
    if (q <= 0) return 0;
    if (q >= 1) return Infinity;
    return p.a * Math.sqrt(2 * gammaQuantileUnit(q, 1.5));
  },
  initial(x) {
    const st = dataStats(x);
    let s2 = 0;
    for (let i = 0; i < st.n; i++) s2 += st.x[i] * st.x[i];
    return { a: Math.max(Math.sqrt(s2 / (3 * st.n)), 1e-12) };
  },
  prepare: (x) => ({ x }),
  sumLogpdf(ctx, p) {
    const xs = ctx.x;
    const a = p.a;
    const a2 = a * a;
    const c = LN_SQRT_2_OVER_PI - 3 * Math.log(a);
    let acc = 0;
    for (let i = 0; i < xs.length; i++) {
      const v = c + 2 * Math.log(xs[i]) - xs[i] * xs[i] / (2 * a2);
      if (!isNum(v)) return -Infinity;
      acc += v;
    }
    return acc;
  },
  valid: (p) => p.a > 0,
  customFit(x, o, init) {
    const st = dataStats(x);
    let s2 = 0;
    for (let i = 0; i < st.n; i++) s2 += st.x[i] * st.x[i];
    const a = Math.sqrt(s2 / (3 * st.n));
    const loglik = maxwell.sumLogpdf({ x }, { a });
    return {
      params: { a },
      loglik,
      converged: isNum(loglik) && a > 0,
      iterations: 0,
      start: { a }
    };
  }
};
var chi2 = {
  id: "chi2",
  name: "\u5361\u65B9\u5206\u5E03",
  group: "\u6B63\u504F\u5BFF\u547D\u578B",
  k: 1,
  support: "positive",
  paramNames: ["df"],
  params: [{ name: "df", label: "df \u81EA\u7531\u5EA6", init: 4 }],
  pdf(x, p) {
    const lp = chi2.logpdf(x, p);
    return lp === -Infinity ? 0 : Math.exp(lp);
  },
  logpdf(x, p) {
    const df = p.df;
    if (!(df > 0) || !isNum(p.df)) return NaN;
    if (!(x > 0)) return -Infinity;
    const h2 = df / 2;
    return (h2 - 1) * Math.log(x) - x / 2 - h2 * Math.LN2 - lgamma(h2);
  },
  cdf(x, p) {
    const df = p.df;
    if (!(df > 0)) return NaN;
    if (x <= 0) return 0;
    return clamp01(gammaIncompleteP(df / 2, x / 2));
  },
  quantile(q, p) {
    if (q <= 0) return 0;
    if (q >= 1) return Infinity;
    return 2 * gammaQuantileUnit(q, p.df / 2);
  },
  initial(x) {
    const st = dataStats(x);
    return { df: clamp(st.mean, 1e-3, 1e7) };
  },
  prepare: (x) => ({ x }),
  sumLogpdf(ctx, p) {
    const xs = ctx.x;
    const h2 = p.df / 2;
    const c = -h2 * Math.LN2 - lgamma(h2);
    let acc = 0;
    for (let i = 0; i < xs.length; i++) {
      const v = (h2 - 1) * Math.log(xs[i]) - xs[i] / 2 + c;
      if (!isNum(v)) return -Infinity;
      acc += v;
    }
    return acc;
  },
  valid: (p) => p.df > 0,
  customFit(x, o, init) {
    const st = dataStats(x);
    let sumX = 0;
    let sumLn = 0;
    for (let i = 0; i < st.n; i++) {
      const v = st.x[i];
      if (!(v > 0)) return naFit({ df: st.mean }, 0);
      sumX += v;
      sumLn += Math.log(v);
    }
    const mean2 = sumX / st.n;
    const meanLn = sumLn / st.n;
    const target = Math.log(mean2) - meanLn;
    let df;
    if (!(target > 1e-9)) {
      df = st.variance > 0 ? 2 * mean2 * mean2 / st.variance : 1e6;
    } else {
      const g = (nu) => Math.log(nu / 2) - digamma(nu / 2) - target;
      let lo = 1e-6;
      let hi = Math.max(4 * mean2, 1);
      let guard = 0;
      while (g(hi) > 0 && guard++ < 200) hi *= 2;
      for (let i = 0; i < 200; i++) {
        const mid = 0.5 * (lo + hi);
        if (g(mid) > 0) lo = mid;
        else hi = mid;
      }
      df = 0.5 * (lo + hi);
    }
    if (!(df > 0) || !isNum(df)) return naFit({ df: st.mean }, 1);
    const loglik = chi2.sumLogpdf({ x }, { df });
    return {
      params: { df },
      loglik,
      converged: isNum(loglik),
      iterations: 1,
      start: { df: st.mean }
    };
  }
};
var halfnormal = {
  id: "halfnormal",
  name: "\u534A\u6B63\u6001\u5206\u5E03",
  group: "\u6B63\u504F\u5BFF\u547D\u578B",
  k: 1,
  support: "positive",
  paramNames: ["sigma"],
  params: [{ name: "sigma", label: "\u03C3 \u5C3A\u5EA6", init: 1 }],
  pdf(x, p) {
    const lp = halfnormal.logpdf(x, p);
    return lp === -Infinity ? 0 : Math.exp(lp);
  },
  logpdf(x, p) {
    const s = p.sigma;
    if (!(s > 0) || !isNum(p.sigma)) return NaN;
    if (x < 0) return -Infinity;
    return LN_SQRT_2_OVER_PI - Math.log(s) - x * x / (2 * s * s);
  },
  cdf(x, p) {
    const s = p.sigma;
    if (!(s > 0)) return NaN;
    if (x <= 0) return 0;
    return clamp01(erf(x / (s * SQRT22)));
  },
  quantile(q, p) {
    if (q <= 0) return 0;
    if (q >= 1) return Infinity;
    return p.sigma * normInv(0.5 * (1 + q));
  },
  initial(x) {
    const st = dataStats(x);
    let s2 = 0;
    for (let i = 0; i < st.n; i++) s2 += st.x[i] * st.x[i];
    return { sigma: Math.max(Math.sqrt(s2 / st.n), 1e-12) };
  },
  prepare: (x) => ({ x }),
  sumLogpdf(ctx, p) {
    const xs = ctx.x;
    const s = p.sigma;
    const s2 = s * s;
    const c = LN_SQRT_2_OVER_PI - Math.log(s);
    let acc = 0;
    for (let i = 0; i < xs.length; i++) {
      const v = c - xs[i] * xs[i] / (2 * s2);
      if (!isNum(v)) return -Infinity;
      acc += v;
    }
    return acc;
  },
  valid: (p) => p.sigma > 0,
  customFit(x, o, init) {
    const st = dataStats(x);
    let s2 = 0;
    for (let i = 0; i < st.n; i++) s2 += st.x[i] * st.x[i];
    const sigma = Math.sqrt(s2 / st.n);
    const loglik = halfnormal.sumLogpdf({ x }, { sigma });
    return {
      params: { sigma },
      loglik,
      converged: isNum(loglik) && sigma > 0,
      iterations: 0,
      start: { sigma }
    };
  }
};
function betaFrame(x) {
  const st = dataStats(x);
  const r = st.max - st.min;
  if (!(r > 0)) return null;
  return { st, r, tiny: 1e-9 * r, pad0: 0.02 * r };
}
var beta = {
  id: "beta",
  name: "Beta \u5206\u5E03",
  group: "\u6709\u754C\u578B",
  k: 4,
  support: "real",
  paramNames: ["a", "b", "loc", "scale"],
  params: [
    { name: "a", label: "a \u5F62\u72B6", init: 2 },
    { name: "b", label: "b \u5F62\u72B6", init: 2 },
    { name: "loc", label: "loc \u4E0B\u9650", init: 0 },
    { name: "scale", label: "scale \u533A\u95F4\u5BBD\u5EA6", init: 1 }
  ],
  pdf(x, p) {
    const lp = beta.logpdf(x, p);
    return lp === -Infinity ? 0 : Math.exp(lp);
  },
  logpdf(x, p) {
    const a = p.a;
    const b = p.b;
    const loc = p.loc;
    const scale = p.scale;
    if (!(a > 0) || !(b > 0) || !(scale > 0) || !isNum(p.a) || !isNum(p.b)) return NaN;
    if (!isNum(x)) return NaN;
    const u = (x - loc) / scale;
    if (!(u > 0) || !(u < 1)) return -Infinity;
    return -lbeta(a, b) - Math.log(scale) + (a - 1) * Math.log(u) + (b - 1) * Math.log(1 - u);
  },
  cdf(x, p) {
    const a = p.a;
    const b = p.b;
    if (!(a > 0) || !(b > 0) || !(p.scale > 0)) return NaN;
    const u = (x - p.loc) / p.scale;
    if (!(u > 0)) return 0;
    if (u >= 1) return 1;
    return clamp01(betaIncomplete(a, b, u));
  },
  quantile(q, p) {
    if (q <= 0) return p.loc;
    if (q >= 1) return p.loc + p.scale;
    return p.loc + p.scale * betaQuantileUnit(q, p.a, p.b);
  },
  initial(x) {
    const fr = betaFrame(x);
    if (!fr) return null;
    const { st, r, pad0 } = fr;
    const loc = st.min - pad0;
    const scale = r + 2 * pad0;
    let m = 0;
    for (let i = 0; i < st.n; i++) m += (st.x[i] - loc) / scale;
    m /= st.n;
    let v = 0;
    for (let i = 0; i < st.n; i++) {
      const d = (st.x[i] - loc) / scale - m;
      v += d * d;
    }
    v /= st.n;
    let a = 2;
    let b = 2;
    const common = v > 0 ? m * (1 - m) / v - 1 : 0;
    const am = m * common;
    const bm = (1 - m) * common;
    if (am > 0.01 && bm > 0.01 && isNum(am) && isNum(bm)) {
      a = clamp(am, 0.01, 500);
      b = clamp(bm, 0.01, 500);
    }
    return { a, b, loc, scale };
  },
  prepare(x) {
    const fr = betaFrame(x);
    if (!fr) return null;
    const { st, r, tiny, pad0 } = fr;
    const min = st.min;
    const max = st.max;
    const xs = st.x;
    const n = st.n;
    const pack = (p) => [
      Math.log(p.a),
      Math.log(p.b),
      Math.log(Math.max(min - p.loc, tiny)),
      Math.log(Math.max(p.loc + p.scale - max, tiny))
    ];
    const unpack = (vec) => {
      const a = Math.exp(vec[0]);
      const b = Math.exp(vec[1]);
      let padLo = Math.exp(vec[2]);
      let padHi = Math.exp(vec[3]);
      if (!isNum(a) || !isNum(b) || a <= 0 || b <= 0) return null;
      if (!isNum(padLo) || !isNum(padHi)) return null;
      padLo = Math.min(padLo, 1e6 * r);
      padHi = Math.min(padHi, 1e6 * r);
      if (!(padLo > 0) || !(padHi > 0)) return null;
      return { a, b, loc: min - padLo, scale: r + padLo + padHi };
    };
    return {
      x: xs,
      n,
      loc: min - pad0,
      scale: r + 2 * pad0,
      pack,
      unpack
    };
  },
  sumLogpdf(ctx, p) {
    const xs = ctx.x;
    const n = ctx.n;
    const a = p.a;
    const b = p.b;
    const loc = p.loc;
    const scale = p.scale;
    if (!(scale > 0)) return -Infinity;
    const c = -lbeta(a, b) - Math.log(scale);
    let acc = 0;
    for (let i = 0; i < n; i++) {
      const u = (xs[i] - loc) / scale;
      if (!(u > 0) || !(u < 1)) return -Infinity;
      const v = c + (a - 1) * Math.log(u) + (b - 1) * Math.log1p(-u);
      if (!isNum(v)) return -Infinity;
      acc += v;
    }
    return acc;
  },
  pack: (p) => [Math.log(p.a), Math.log(p.b), 0, 0],
  unpack: makeUnpack([["a", "log"], ["b", "log"], ["loc", "id"], ["scale", "log"]]),
  valid: (p) => isNum(p.loc) && isNum(p.scale) && p.a > 0 && p.b > 0 && p.scale > 0
};
var gumbel = {
  id: "gumbel",
  name: "\u6781\u503C I \u578B (Gumbel)",
  group: "\u6781\u503C\u578B",
  k: 2,
  support: "real",
  paramNames: ["beta", "alpha"],
  params: [
    { name: "beta", label: "\u03B2 \u4F4D\u7F6E", init: 0 },
    { name: "alpha", label: "\u03B1 \u5C3A\u5EA6", init: 1 }
  ],
  pdf(x, p) {
    const lp = gumbel.logpdf(x, p);
    return lp === -Infinity ? 0 : Math.exp(lp);
  },
  logpdf(x, p) {
    const a = p.alpha;
    if (!(a > 0) || !isNum(p.alpha) || !isNum(p.beta)) return NaN;
    const z = (x - p.beta) / a;
    return -Math.log(a) - z - Math.exp(-z);
  },
  cdf(x, p) {
    const a = p.alpha;
    if (!(a > 0)) return NaN;
    const z = (x - p.beta) / a;
    return clamp01(Math.exp(-Math.exp(-z)));
  },
  quantile(q, p) {
    if (q <= 0) return -Infinity;
    if (q >= 1) return Infinity;
    return p.beta - p.alpha * Math.log(-Math.log(q));
  },
  initial(x) {
    const st = dataStats(x);
    const a = st.sd * Math.sqrt(6) / Math.PI;
    return { beta: st.mean - EULER_GAMMA * a, alpha: Math.max(a, 1e-12) };
  },
  prepare: (x) => ({ x }),
  sumLogpdf(ctx, p) {
    const xs = ctx.x;
    const a = p.alpha;
    const beta2 = p.beta;
    const lnA = Math.log(a);
    let acc = 0;
    for (let i = 0; i < xs.length; i++) {
      const z = (xs[i] - beta2) / a;
      const v = -lnA - z - Math.exp(-z);
      if (!isNum(v)) return -Infinity;
      acc += v;
    }
    return acc;
  },
  pack: (p) => [p.beta, Math.log(p.alpha)],
  unpack: makeUnpack([["beta", "id"], ["alpha", "log"]]),
  valid: (p) => isNum(p.beta) && p.alpha > 0
};
function gevStart(st) {
  const n = st.n;
  if (n < 5) return null;
  const s = st.x;
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  for (let i = 0; i < n; i++) {
    b0 += s[i];
    b1 += s[i] * (i / (n - 1));
    b2 += s[i] * i * (i - 1) / ((n - 1) * (n - 2));
  }
  b0 /= n;
  b1 /= n;
  b2 /= n;
  const l1 = b0;
  const l2 = 2 * b1 - b0;
  const l3 = 6 * b2 - 6 * b1 + b0;
  if (!(l2 > 0)) return null;
  const t3 = l3 / l2;
  const c = 2 / (3 + t3) - Math.log(2) / Math.log(3);
  const k = 7.859 * c + 2.9554 * c * c;
  const xi = -k;
  let sigma;
  let mu;
  if (Math.abs(xi) < 1e-8) {
    sigma = l2 / Math.LN2;
    mu = l1 - sigma * EULER_GAMMA;
  } else {
    const g1 = gammaFn(1 - xi);
    if (!(g1 > 0) || !isNum(g1)) return null;
    sigma = l2 * xi / ((Math.pow(2, xi) - 1) * g1);
    mu = l1 - sigma * (g1 - 1) / xi;
  }
  if (!(sigma > 0) || !isNum(sigma) || !isNum(mu)) return null;
  return { xi: clamp(xi, -0.8, 0.8), mu, sigma };
}
var gev = {
  id: "gev",
  name: "\u5E7F\u4E49\u6781\u503C (GEV)",
  group: "\u6781\u503C\u578B",
  k: 3,
  support: "real",
  paramNames: ["xi", "mu", "sigma"],
  params: [
    { name: "xi", label: "\u03BE \u5F62\u72B6", init: 0.1 },
    { name: "mu", label: "\u03BC \u4F4D\u7F6E", init: 0 },
    { name: "sigma", label: "\u03C3 \u5C3A\u5EA6", init: 1 }
  ],
  pdf(x, p) {
    const lp = gev.logpdf(x, p);
    return lp === -Infinity ? 0 : Math.exp(lp);
  },
  logpdf(x, p) {
    const xi = p.xi;
    const mu = p.mu;
    const sigma = p.sigma;
    if (!(sigma > 0) || !isNum(xi) || !isNum(mu) || !isNum(sigma)) return NaN;
    const z = (x - mu) / sigma;
    if (Math.abs(xi) < 1e-8) {
      return -Math.log(sigma) - z - Math.exp(-z);
    }
    const s = Math.log1p(xi * z);
    if (!isNum(s)) return -Infinity;
    const t = Math.exp(-s / xi);
    if (!isNum(t)) return -1e300;
    return -Math.log(sigma) - s - s / xi - t;
  },
  cdf(x, p) {
    const xi = p.xi;
    const mu = p.mu;
    const sigma = p.sigma;
    if (!(sigma > 0)) return NaN;
    const z = (x - mu) / sigma;
    if (Math.abs(xi) < 1e-8) {
      return clamp01(Math.exp(-Math.exp(-z)));
    }
    const t0 = 1 + xi * z;
    if (!(t0 > 0)) return xi > 0 ? 0 : 1;
    const s = Math.log(t0);
    const w = Math.exp(-s / xi);
    if (!isNum(w)) return 0;
    return clamp01(Math.exp(-w));
  },
  quantile(q, p) {
    const xi = p.xi;
    const mu = p.mu;
    const sigma = p.sigma;
    if (q <= 0) return xi > 0 ? mu - sigma / xi : -Infinity;
    if (q >= 1) return xi < 0 ? mu - sigma / xi : Infinity;
    const lp = -Math.log(q);
    if (Math.abs(xi) < 1e-8) return mu - sigma * Math.log(lp);
    return mu + sigma * Math.expm1(-xi * Math.log(lp)) / xi;
  },
  initial(x) {
    const st = dataStats(x);
    const g = gevStart(st);
    if (g) return g;
    const a = st.sd * Math.sqrt(6) / Math.PI;
    return { xi: 0.05, mu: st.mean - EULER_GAMMA * a, sigma: Math.max(a, 1e-12) };
  },
  prepare: (x) => ({ x }),
  sumLogpdf(ctx, p) {
    const xs = ctx.x;
    const xi = p.xi;
    const mu = p.mu;
    const sigma = p.sigma;
    const lnS = Math.log(sigma);
    const small = Math.abs(xi) < 1e-8;
    let acc = 0;
    for (let i = 0; i < xs.length; i++) {
      const z = (xs[i] - mu) / sigma;
      let v;
      if (small) {
        v = -lnS - z - Math.exp(-z);
      } else {
        const s = Math.log1p(xi * z);
        if (!isNum(s)) return -Infinity;
        const t = Math.exp(-s / xi);
        if (!isNum(t)) return -Infinity;
        v = -lnS - s - s / xi - t;
      }
      if (!isNum(v)) return -Infinity;
      acc += v;
    }
    return acc;
  },
  pack: (p) => [p.xi, p.mu, Math.log(p.sigma)],
  unpack: makeUnpack([["xi", "id"], ["mu", "id"], ["sigma", "log"]]),
  valid: (p) => isNum(p.xi) && isNum(p.mu) && p.sigma > 0
};
function gpdStart(st) {
  const n = st.n;
  if (n < 5) return null;
  const mu0 = st.min;
  let m = 0;
  for (let i = 0; i < n; i++) m += st.x[i] - mu0;
  m /= n;
  if (!(m > 0)) return null;
  let v = 0;
  for (let i = 0; i < n; i++) {
    const d = st.x[i] - mu0 - m;
    v += d * d;
  }
  v /= n;
  let xi;
  let sigma;
  if (v > 1e-14 * m * m) {
    xi = 0.5 * (m * m / v - 1);
    sigma = m * (1 + xi);
  } else {
    xi = 0.1;
    sigma = m * 1.1;
  }
  if (!(sigma > 0) || !isNum(sigma) || !isNum(xi)) return null;
  return { xi: clamp(xi, -0.6, 3), mu: mu0, sigma };
}
var gpd = {
  id: "gpd",
  name: "\u5E7F\u4E49\u5E15\u7D2F\u6258 (GPD)",
  group: "\u6781\u503C\u578B",
  k: 3,
  support: "real",
  paramNames: ["xi", "mu", "sigma"],
  params: [
    { name: "xi", label: "\u03BE \u5F62\u72B6", init: 0.2 },
    { name: "mu", label: "\u03BC \u9608\u503C", init: 0 },
    { name: "sigma", label: "\u03C3 \u5C3A\u5EA6", init: 1 }
  ],
  pdf(x, p) {
    const lp = gpd.logpdf(x, p);
    return lp === -Infinity ? 0 : Math.exp(lp);
  },
  logpdf(x, p) {
    const xi = p.xi;
    const mu = p.mu;
    const sigma = p.sigma;
    if (!(sigma > 0) || !isNum(xi) || !isNum(mu) || !isNum(sigma)) return NaN;
    if (!(x >= mu)) return -Infinity;
    const z = (x - mu) / sigma;
    if (Math.abs(xi) < 1e-8) return -Math.log(sigma) - z;
    const s = Math.log1p(xi * z);
    if (!isNum(s)) return -Infinity;
    return -Math.log(sigma) - (1 + 1 / xi) * s;
  },
  cdf(x, p) {
    const xi = p.xi;
    const mu = p.mu;
    const sigma = p.sigma;
    if (!(sigma > 0)) return NaN;
    if (!(x > mu)) return 0;
    const z = (x - mu) / sigma;
    if (Math.abs(xi) < 1e-8) return clamp01(-Math.expm1(-z));
    const s = Math.log1p(xi * z);
    if (!isNum(s)) return 1;
    const w = Math.exp(-s / xi);
    if (!isNum(w)) return 1;
    return clamp01(1 - w);
  },
  quantile(q, p) {
    const xi = p.xi;
    const mu = p.mu;
    const sigma = p.sigma;
    if (q <= 0) return mu;
    if (q >= 1) return xi < 0 ? mu - sigma / xi : Infinity;
    if (Math.abs(xi) < 1e-8) return mu - sigma * Math.log1p(-q);
    return mu + sigma * Math.expm1(-xi * Math.log1p(-q)) / xi;
  },
  initial(x) {
    const st = dataStats(x);
    const g = gpdStart(st);
    if (g) return g;
    const m = st.mean;
    return { xi: 0.2, mu: st.min, sigma: Math.max(0.5 * Math.max(m - st.min, 1e-9), 1e-12) };
  },
  prepare(x) {
    const st = dataStats(x);
    const mu0 = st.min;
    return {
      x: st.x,
      mu0,
      pack: (p) => [p.xi, Math.log(p.sigma)],
      unpack: (u) => {
        const xi = u[0];
        const sigma = Math.exp(u[1]);
        if (!isNum(xi) || !isNum(sigma) || sigma <= 0) return null;
        return { xi, mu: mu0, sigma };
      }
    };
  },
  sumLogpdf(ctx, p) {
    const xs = ctx.x;
    const xi = p.xi;
    const mu = p.mu;
    const sigma = p.sigma;
    const lnS = Math.log(sigma);
    const small = Math.abs(xi) < 1e-8;
    let acc = 0;
    for (let i = 0; i < xs.length; i++) {
      const z = (xs[i] - mu) / sigma;
      let v;
      if (small) {
        v = -lnS - z;
      } else {
        const s = Math.log1p(xi * z);
        if (!isNum(s)) return -Infinity;
        v = -lnS - (1 + 1 / xi) * s;
      }
      if (!isNum(v)) return -Infinity;
      acc += v;
    }
    return acc;
  },
  pack: (p) => [p.xi, Math.log(p.sigma)],
  unpack: makeUnpack([["xi", "id"], ["sigma", "log"]]),
  valid: (p) => isNum(p.xi) && isNum(p.mu) && p.sigma > 0
};
var DISTS = [
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
  gpd
];
for (let i = 0; i < DISTS.length; i++) attachFit(DISTS[i]);
var DIST_BY_ID = {};
for (let i = 0; i < DISTS.length; i++) DIST_BY_ID[DISTS[i].id] = DISTS[i];
function getDist(id) {
  return Object.prototype.hasOwnProperty.call(DIST_BY_ID, id) ? DIST_BY_ID[id] : null;
}

// src/engine/stats.js
function sum(arr) {
  let s = 0;
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i];
    if (Number.isFinite(v)) s += v;
  }
  return s;
}
function clamp2(v, lo, hi) {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}
function sortNumbers(x) {
  const out = [];
  if (!x) return out;
  for (let i = 0; i < x.length; i++) {
    let v = x[i];
    if (typeof v === "string") v = v.trim() === "" ? NaN : Number(v);
    if (Number.isFinite(v)) out.push(v);
  }
  out.sort((a, b) => a - b);
  return out;
}
function quantile(sortedArr, p) {
  if (!sortedArr || !sortedArr.length) return NaN;
  if (!Number.isFinite(p)) return NaN;
  const pp = clamp2(p, 0, 1);
  const n = sortedArr.length;
  if (n === 1) return sortedArr[0];
  const h2 = (n - 1) * pp;
  const i = Math.floor(h2);
  if (i >= n - 1) return sortedArr[n - 1];
  const f = h2 - i;
  return sortedArr[i] + f * (sortedArr[i + 1] - sortedArr[i]);
}
function round6(v) {
  return Number.isFinite(v) ? Math.round(v * 1e6) / 1e6 : null;
}
function describe(x) {
  const xs = sortNumbers(x);
  const n = xs.length;
  if (!n) {
    return {
      n: 0,
      mean: null,
      sd: null,
      cv: null,
      min: null,
      max: null,
      q1: null,
      median: null,
      q3: null,
      iqr: null,
      skew: null,
      kurt: null,
      range: null
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
  const sd = n >= 2 ? Math.sqrt(m2 * n / (n - 1)) : null;
  const cv = sd !== null && m !== 0 && Number.isFinite(m) ? sd / m : null;
  let skew = null;
  if (n >= 3 && m2 > 0) {
    const g1 = m3 / Math.pow(m2, 1.5);
    skew = Math.sqrt(n * (n - 1) / (n - 2)) * g1;
  }
  let kurt = null;
  if (n >= 4 && m2 > 0) {
    kurt = (n - 1) * ((n + 1) * (m4 / (m2 * m2)) - 3 * (n - 1)) / ((n - 2) * (n - 3));
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
    range: round6(max - min)
  };
}
function freedmanDiaconisBins(xs) {
  const n = xs.length;
  if (n < 2) return 5;
  const lo = xs[0];
  const hi = xs[n - 1];
  const range = hi - lo;
  if (!(range > 0)) return 5;
  const iqr = quantile(xs, 0.75) - quantile(xs, 0.25);
  let nb;
  if (iqr > 0) {
    const h2 = 2 * iqr * Math.pow(n, -1 / 3);
    nb = Math.ceil(range / h2);
  } else {
    nb = 0;
  }
  if (!(nb > 0) || !Number.isFinite(nb)) nb = Math.ceil(Math.log2(n)) + 1;
  return clamp2(nb, 5, 60);
}
function histogram(x, bins = 0) {
  const xs = sortNumbers(x);
  const n = xs.length;
  if (!n) return { n: 0, bins: [], width: 0, x0: NaN, x1: NaN };
  const x0 = xs[0];
  const x1 = xs[n - 1];
  const range = x1 - x0;
  let nb;
  const want = Math.floor(Number(bins) || 0);
  if (want > 0) nb = clamp2(want, 1, 1e3);
  else nb = freedmanDiaconisBins(xs);
  if (!(range > 0)) {
    return {
      n,
      bins: [{ x0, x1, count: n, density: 0 }],
      width: 0,
      x0,
      x1
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
      density: counts[i] / denom
    };
  }
  return { n, bins: out, width, x0, x1 };
}
function ecdf(x) {
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
function quantileMoments(qf, points = 1025, eps = 1e-7) {
  const m = points % 2 === 0 ? points + 1 : points;
  const h2 = 1 / (m - 1);
  const vals = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    const u = clamp2(i * h2, eps, 1 - eps);
    const q = qf(u);
    vals[i] = Number.isFinite(q) ? q : NaN;
  }
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
  const mu = s * h2 / 3;
  let v = 0;
  for (let i = 0; i < m; i++) {
    const d = vals[i] - mu;
    v += w[i] * d * d;
  }
  const varq = v * h2 / 3;
  const sd = varq > 0 ? Math.sqrt(varq) : 0;
  const LIMIT = 1e8;
  if (!Number.isFinite(mu) || Math.abs(mu) > LIMIT) return { mean: null, sd: null };
  if (!Number.isFinite(sd) || sd > LIMIT) return { mean: null, sd: null };
  return { mean: mu, sd };
}

// src/engine/tests.js
var SQRT_2PI2 = Math.sqrt(2 * Math.PI);
var PI_SQ = Math.PI * Math.PI;
var DEFAULT_SEED = 20260101;
function clamp3(v, lo, hi) {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}
function clamp012(v) {
  return clamp3(v, 0, 1);
}
function levelOpt(opts) {
  const a = Number(opts && opts.alpha);
  return a > 0 && a < 1 ? a : 0.05;
}
function replicates(opts) {
  const b = Math.floor(Number(opts && opts.B) || 0);
  return b > 0 ? Math.min(b, 1e5) : 0;
}
function sortedQuantile(sorted, p) {
  const n = sorted.length;
  if (!n) return NaN;
  const h2 = (n - 1) * clamp012(p);
  const i = Math.floor(h2);
  if (i >= n - 1) return sorted[n - 1];
  const f = h2 - i;
  return sorted[i] + f * (sorted[i + 1] - sorted[i]);
}
function mcDraws(xSorted, cdfFn, opts, salt, statFn) {
  const B = replicates(opts);
  const quantileFn = opts && opts.quantileFn;
  if (!(B > 0) || typeof quantileFn !== "function") return null;
  const n = xSorted.length;
  const rand = mulberry32((Number(opts && opts.seed) || DEFAULT_SEED) + salt >>> 0);
  const refit = typeof (opts && opts.refit) === "function" ? opts.refit : null;
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
      if (typeof fittedCdf === "function") cdf = fittedCdf;
    }
    const d = statFn(sim, cdf);
    if (Number.isFinite(d)) draws[good++] = d;
  }
  if (good === 0) return null;
  const out = draws.slice(0, good);
  out.sort();
  return out;
}
function mcResult(stat, draws, alpha) {
  let greater = 0;
  for (let i = 0; i < draws.length; i++) if (draws[i] >= stat) greater++;
  const B = draws.length;
  const p = (greater + 1) / (B + 1);
  const crit = sortedQuantile(draws, 1 - alpha);
  return { p, crit };
}
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
function ksStatistic(xSorted, cdfFn) {
  const n = xSorted.length;
  if (!n) return NaN;
  let dPlus = 0;
  let dMinus = 0;
  for (let i = 0; i < n; i++) {
    const F = cdfFn(xSorted[i]);
    if (!Number.isFinite(F)) return NaN;
    const Fc = clamp012(F);
    const up = (i + 1) / n - Fc;
    const dn = Fc - i / n;
    if (up > dPlus) dPlus = up;
    if (dn > dMinus) dMinus = dn;
  }
  return Math.max(dPlus > 0 ? dPlus : 0, dMinus > 0 ? dMinus : 0);
}
function ksPValue(lambda) {
  if (!Number.isFinite(lambda) || lambda < 0) return NaN;
  if (lambda === 0) return 1;
  if (lambda < 0.82) {
    let s2 = 0;
    const denom = 8 * lambda * lambda;
    for (let j = 1; j <= 200; j++) {
      const t = 2 * j - 1;
      const term = Math.exp(-t * t * PI_SQ / denom);
      s2 += term;
      if (term < 1e-18) break;
    }
    return clamp012(1 - SQRT_2PI2 / lambda * s2);
  }
  let s = 0;
  for (let j = 1; j <= 200; j++) {
    const term = Math.exp(-2 * j * j * lambda * lambda);
    s += j % 2 === 1 ? term : -term;
    if (term < 1e-18) break;
  }
  return clamp012(2 * s);
}
function ksTest(xSorted, cdfFn, opts = {}) {
  const n = Array.isArray(xSorted) ? xSorted.length : 0;
  const alpha = levelOpt(opts);
  const stat = typeof cdfFn === "function" && n >= 2 ? ksStatistic(xSorted, cdfFn) : NaN;
  if (!Number.isFinite(stat)) return none(stat, alpha, n);
  const draws = mcDraws(xSorted, cdfFn, opts, 101, ksStatistic);
  if (draws) {
    const { p: p2, crit: crit2 } = mcResult(stat, draws, alpha);
    return { stat, p: p2, crit: crit2, pass: p2 >= alpha, method: "mc" };
  }
  const sqrtN = Math.sqrt(n);
  const lambda = (sqrtN + 0.12 + 0.11 / sqrtN) * stat;
  const p = ksPValue(lambda);
  const crit = invertCritical(
    (d) => ksPValue((sqrtN + 0.12 + 0.11 / sqrtN) * d),
    alpha,
    0,
    1
  );
  return { stat, p, crit, pass: p >= alpha, method: "asymptotic" };
}
function adStatistic(xSorted, cdfFn) {
  const n = xSorted.length;
  if (!n) return NaN;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const lo = cdfFn(xSorted[i]);
    const hi = cdfFn(xSorted[n - 1 - i]);
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return NaN;
    const a = clamp3(lo, 1e-15, 1 - 1e-15);
    const b = clamp3(1 - hi, 1e-15, 1 - 1e-15);
    s += (2 * i + 1) * (Math.log(a) + Math.log(b));
  }
  return -n - s / n;
}
function adCorrect(a2, n) {
  return a2 * (1 + 0.75 / n + 2.25 / (n * n));
}
function adPValue(a2c) {
  if (!Number.isFinite(a2c) || a2c <= 0) return NaN;
  const a = a2c;
  let p;
  if (a < 0.2) p = 1 - Math.exp(-13.436 + 101.14 * a - 223.73 * a * a);
  else if (a < 0.34) p = 1 - Math.exp(-8.318 + 42.796 * a - 59.938 * a * a);
  else if (a < 0.6) p = Math.exp(0.9177 - 4.279 * a - 1.38 * a * a);
  else p = Math.exp(1.2937 - 5.709 * a + 0.0186 * a * a);
  return clamp012(p);
}
function adTest(xSorted, cdfFn, opts = {}) {
  const n = Array.isArray(xSorted) ? xSorted.length : 0;
  const alpha = levelOpt(opts);
  const stat = typeof cdfFn === "function" && n >= 2 ? adStatistic(xSorted, cdfFn) : NaN;
  if (!Number.isFinite(stat)) return none(stat, alpha, n);
  const draws = mcDraws(xSorted, cdfFn, opts, 202, adStatistic);
  if (draws) {
    const { p: p2, crit: crit2 } = mcResult(stat, draws, alpha);
    return { stat, p: p2, crit: crit2, pass: p2 >= alpha, method: "mc" };
  }
  const corr = (a) => adCorrect(a, n);
  const p = adPValue(corr(stat));
  const crit = invertCritical(
    (s) => adPValue(corr(s)),
    alpha,
    1e-6,
    10
  );
  return { stat, p, crit, pass: p >= alpha, method: "asymptotic" };
}
var BESSEL_S_MAX = 8;
var BESSEL_N = 200;
function besselKQuarterScaled(q, nu = 0.25) {
  if (!(q > 0) || !Number.isFinite(q)) return 0;
  if (2 * q > 700) return 0;
  const h2 = BESSEL_S_MAX / BESSEL_N;
  const invQ = 1 / q;
  let s = 0;
  for (let i = 0; i <= BESSEL_N; i++) {
    const x = i * h2;
    const w = x * x * invQ;
    const val = Math.exp(-x * x) * Math.cosh(nu * Math.acosh(1 + w)) * (2 / Math.sqrt(2 + w));
    s += i === 0 || i === BESSEL_N ? val : i % 2 === 1 ? 4 * val : 2 * val;
  }
  return Math.exp(-2 * q) / Math.sqrt(q) * (s * h2 / 3);
}
function cvmCdfInf(x) {
  if (!(x > 0) || !Number.isFinite(x)) return 0;
  const pref = Math.pow(Math.PI, 1.5) * Math.sqrt(x);
  let tot = 0;
  for (let k = 0; k < 60; k++) {
    const y = 4 * k + 1;
    const q = y * y / (16 * x);
    if (2 * q > 700) break;
    const u = Math.exp(lgamma(k + 0.5) - lgamma(k + 1)) / pref;
    const term = u * Math.sqrt(y) * besselKQuarterScaled(q);
    tot += term;
    if (k >= 1 && Math.abs(term) < 1e-13) break;
  }
  return tot;
}
function cvmPValue(w2) {
  if (!Number.isFinite(w2) || w2 <= 0) return NaN;
  return clamp012(1 - cvmCdfInf(w2));
}
function cvmStatistic(xSorted, cdfFn) {
  const n = xSorted.length;
  if (!n) return NaN;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const F = cdfFn(xSorted[i]);
    if (!Number.isFinite(F)) return NaN;
    const d = clamp012(F) - (2 * (i + 1) - 1) / (2 * n);
    s += d * d;
  }
  return 1 / (12 * n) + s;
}
function cvmTest(xSorted, cdfFn, opts = {}) {
  const n = Array.isArray(xSorted) ? xSorted.length : 0;
  const alpha = levelOpt(opts);
  const stat = typeof cdfFn === "function" && n >= 2 ? cvmStatistic(xSorted, cdfFn) : NaN;
  if (!Number.isFinite(stat)) return none(stat, alpha, n);
  const draws = mcDraws(xSorted, cdfFn, opts, 303, cvmStatistic);
  if (draws) {
    const { p: p2, crit: crit2 } = mcResult(stat, draws, alpha);
    return { stat, p: p2, crit: crit2, pass: p2 >= alpha, method: "mc" };
  }
  const p = cvmPValue(stat);
  const crit = invertCritical((s) => cvmPValue(s), alpha, 1e-6, 6);
  return { stat, p, crit, pass: p >= alpha, method: "asymptotic" };
}
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
    if (!(edges[j] > edges[j - 1])) return null;
  }
  return edges;
}
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
    stat += d * d / e;
    used++;
  }
  return { stat, bins: used };
}
function chi2Test(xSorted, cdfFn, opts = {}) {
  const n = Array.isArray(xSorted) ? xSorted.length : 0;
  const alpha = levelOpt(opts);
  const kParams = Math.max(0, Math.floor(Number(opts.k) || 0));
  const requested = Math.floor(Number(opts.bins) || 0);
  const m = requested > 0 ? clamp3(requested, 2, 200) : clamp3(Math.ceil(Math.sqrt(n)), 5, 30);
  const fail = (stat) => ({ stat, p: NaN, crit: NaN, pass: false, method: "none" });
  if (n < 5 || typeof cdfFn !== "function") return fail(NaN);
  const quantileFn = typeof opts.quantileFn === "function" ? opts.quantileFn : null;
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
    1e3
  );
  const B = replicates(opts);
  if (B > 0 && quantileFn) {
    const rand = mulberry32((Number(opts.seed) || DEFAULT_SEED) + 404 >>> 0);
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
      sim.sort((a, c2) => a - c2);
      const c = binCounts(sim, edges);
      const s = chi2FromCounts(c, groups, expected).stat;
      if (Number.isFinite(s)) draws.push(s);
    }
    if (draws.length) {
      draws.sort((a, c) => a - c);
      const arr = Float64Array.from(draws);
      const { p: p2, crit: mcCrit } = mcResult(base.stat, arr, alpha);
      return { stat: base.stat, p: p2, crit: mcCrit, pass: p2 >= alpha, method: "mc" };
    }
  }
  const p = gammaIncompleteQ(df / 2, base.stat / 2);
  return { stat: base.stat, p, crit, pass: p >= alpha, method: "asymptotic" };
}
function none(stat, alpha, n) {
  return {
    stat: Number.isFinite(stat) ? stat : NaN,
    p: NaN,
    crit: NaN,
    pass: false,
    method: "none",
    n
  };
}
var TESTS = { ks: ksTest, ad: adTest, cvm: cvmTest, chi2: chi2Test };
var TEST_IDS = ["ks", "ad", "cvm", "chi2"];

// src/engine/analyze.js
var ANALYZE_DEFAULTS = Object.freeze({
  dists: Object.freeze([]),
  // [] => every supported family
  tests: Object.freeze(["ks", "ad", "cvm", "chi2"]),
  alpha: 0.05,
  B: 0,
  // Monte-Carlo replicates, 0 => asymptotic p-values only
  bins: 0,
  // histogram bins, 0 => Freedman–Diaconis auto
  seed: 20260101,
  maxDists: 12,
  // guard: how many families to fit per dataset
  gridSize: 240,
  // curve resolution
  mcRefit: false
  // MC re-fits every replicate (calibrated composite p-values)
});
var QUANTILE_PROBS = Object.freeze([0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99]);
function aic(loglik, k) {
  return 2 * k - 2 * loglik;
}
function bic(loglik, k, n) {
  return k * Math.log(n) - 2 * loglik;
}
function aicWeights(aics) {
  const list = Array.isArray(aics) ? aics : [];
  let min = Infinity;
  for (let i = 0; i < list.length; i++) {
    const v = Number(list[i]);
    if (Number.isFinite(v) && v < min) min = v;
  }
  if (!Number.isFinite(min)) return list.map(() => 0);
  const raw = list.map((v) => {
    const x = Number(v);
    return Number.isFinite(x) ? Math.exp(-0.5 * (x - min)) : 0;
  });
  let sum2 = 0;
  for (let i = 0; i < raw.length; i++) sum2 += raw[i];
  if (!(sum2 > 0)) return list.map(() => 0);
  return raw.map((w) => w / sum2);
}
function clamp4(v, lo, hi) {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}
function familyList() {
  const list = Array.isArray(DISTS) ? DISTS : Object.values(DISTS || {});
  return list.filter((d) => d && typeof d.id === "string" && typeof d.cdf === "function");
}
function datasetValues(ds) {
  if (!ds) return [];
  if (Array.isArray(ds.values)) return ds.values;
  if (Array.isArray(ds.x)) return ds.x;
  if (Array.isArray(ds.data)) return ds.data;
  return [];
}
function paramsTextOf(dist, params) {
  const names = Array.isArray(dist.paramNames) && dist.paramNames.length ? dist.paramNames : Object.keys(params || {});
  const labels = new Map(
    (Array.isArray(dist.params) ? dist.params : []).map((p) => [p.name, p.label || p.name])
  );
  const fmt = (v) => {
    if (!Number.isFinite(v)) return "\u2014";
    const a = Math.abs(v);
    if (a !== 0 && (a >= 1e5 || a < 1e-3)) return v.toExponential(3);
    const r = Number(v.toPrecision(4));
    return String(r);
  };
  return names.map((nm) => `${labels.get(nm) || nm}=${fmt(params?.[nm])}`).join(", ");
}
function supportOk(support, xs) {
  if (!xs.length) return false;
  if (support === "positive") return xs[0] > 0;
  if (support === "unit") return xs[0] >= 0 && xs[xs.length - 1] <= 1;
  return true;
}
function inSupport(support, x) {
  if (!Number.isFinite(x)) return false;
  if (support === "positive") return x > 0;
  if (support === "unit") return x >= 0 && x <= 1;
  return true;
}
function buildGrid(xSorted, used, gridSize) {
  const n = xSorted.length;
  const lo0 = xSorted[0];
  const hi0 = xSorted[n - 1];
  let range = hi0 - lo0;
  if (!(range > 0)) range = Math.abs(hi0) > 0 ? Math.abs(hi0) : 1;
  let lo = lo0 - 0.15 * range;
  let hi = hi0 + 0.15 * range;
  const allLowerBounded = used.length > 0 && used.every((d) => d.support === "positive" || d.support === "unit");
  const allUnit = used.length > 0 && used.every((d) => d.support === "unit");
  if (allLowerBounded) lo = Math.max(lo, 0);
  if (allUnit) hi = Math.min(hi, 1);
  if (!(hi > lo)) {
    lo = lo0;
    hi = hi0;
    if (!(hi > lo)) hi = lo + 1;
  }
  const size = clamp4(Math.round(Number(gridSize) || ANALYZE_DEFAULTS.gridSize), 2, 4e3);
  const out = new Array(size);
  const step = (hi - lo) / (size - 1);
  for (let i = 0; i < size; i++) out[i] = lo + i * step;
  return out;
}
function analyze(datasets, options = {}) {
  if (!Array.isArray(datasets)) {
    throw new TypeError("analyze(datasets, options): `datasets` must be an array of { name, values }");
  }
  const o = { ...ANALYZE_DEFAULTS, ...options || {} };
  const alphaRaw = Number(o.alpha);
  const alpha = alphaRaw > 0 && alphaRaw < 1 ? alphaRaw : ANALYZE_DEFAULTS.alpha;
  const Breps = Math.max(0, Math.floor(Number(o.B) || 0));
  const binsOpt = Math.max(0, Math.floor(Number(o.bins) || 0));
  const seed = Math.floor(Number(o.seed) || ANALYZE_DEFAULTS.seed);
  const gridSize = Number(o.gridSize) || ANALYZE_DEFAULTS.gridSize;
  const mcRefit = Boolean(o.mcRefit);
  const wantedTests = (Array.isArray(o.tests) ? o.tests : ANALYZE_DEFAULTS.tests).map((t) => String(t)).filter((t) => TEST_IDS.includes(t));
  let families = familyList();
  if (Array.isArray(o.dists) && o.dists.length) {
    const allowed = new Set(o.dists.map((d) => String(d)));
    families = families.filter((d) => allowed.has(d.id));
  }
  const maxDists = Math.floor(Number(o.maxDists));
  const skippedFamilies = [];
  if (maxDists > 0 && families.length > maxDists) {
    skippedFamilies.push(...families.slice(maxDists).map((d) => d.id));
    families = families.slice(0, maxDists);
  }
  const out = {
    datasets: [],
    rows: [],
    ranking: [],
    histograms: [],
    ecdf: [],
    curves: [],
    pp: [],
    qq: [],
    quantiles: [],
    optimal: [],
    warnings: []
  };
  datasets.forEach((ds, idx) => {
    const name = String((ds && ds.name) ?? `\u5217${idx + 1}`);
    const raw = datasetValues(ds);
    const xs = sortNumbers(raw);
    const n = xs.length;
    const desc = describe(xs);
    out.datasets.push({
      name,
      n,
      removed: Math.max(0, raw.length - n),
      stats: {
        mean: desc.mean,
        sd: desc.sd,
        cv: desc.cv,
        min: desc.min,
        max: desc.max,
        q1: desc.q1,
        median: desc.median,
        q3: desc.q3,
        skew: desc.skew,
        kurt: desc.kurt,
        iqr: desc.iqr
      }
    });
    if (skippedFamilies.length) {
      out.warnings.push({
        dataset: name,
        distId: null,
        reason: `\u8D85\u51FA maxDists=${maxDists} \u4E0A\u9650\uFF0C\u5DF2\u8DF3\u8FC7\uFF1A${skippedFamilies.join(", ")}`
      });
    }
    if (n < 5) {
      out.warnings.push({ dataset: name, distId: null, reason: `\u6709\u6548\u6837\u672C\u4E0D\u8DB3\uFF08n=${n} < 5\uFF09\uFF0C\u8DF3\u8FC7\u5168\u90E8\u62DF\u5408` });
      out.histograms.push({ dataset: name, bins: [], n });
      out.ecdf.push({ dataset: name, x: [], y: [] });
      return;
    }
    const fitted = [];
    for (const dist of families) {
      if (!supportOk(dist.support, xs)) {
        out.warnings.push({
          dataset: name,
          distId: dist.id,
          reason: `\u6570\u636E\u8D85\u51FA\u652F\u6491\u96C6\uFF08support=${String(dist.support)}\uFF0C\u6700\u5C0F\u503C ${xs[0]}\uFF09`
        });
        out.rows.push(makeNaRow(name, dist, `support=${String(dist.support)}`));
        continue;
      }
      let fit = null;
      try {
        fit = dist.fit(xs, { seed, alpha, B: Breps });
      } catch (err) {
        out.warnings.push({
          dataset: name,
          distId: dist.id,
          reason: `\u62DF\u5408\u5931\u8D25\uFF1A${err && err.message ? err.message : String(err)}`
        });
        out.rows.push(makeNaRow(name, dist));
        continue;
      }
      const params = fit && fit.params;
      const loglik = fit ? Number(fit.loglik) : NaN;
      const converged = Boolean(fit && fit.converged) && Number.isFinite(loglik);
      const paramsFinite = params && typeof params === "object" && Object.keys(params).length > 0 && Object.values(params).every((v) => Number.isFinite(Number(v)));
      if (!converged || !paramsFinite) {
        out.warnings.push({
          dataset: name,
          distId: dist.id,
          reason: "\u62DF\u5408\u672A\u6536\u655B\u6216\u5BF9\u6570\u4F3C\u7136\u975E\u6709\u9650\uFF0C\u6807\u8BB0\u4E3A na\uFF08\u4E0D\u53C2\u4E0E\u6392\u5E8F\uFF09"
        });
        out.rows.push(makeNaRow(name, dist, "not-converged"));
        continue;
      }
      const row = {
        dataset: name,
        distId: dist.id,
        distName: dist.name || dist.id,
        k: Number(dist.k) || 0,
        params,
        paramsText: paramsTextOf(dist, params),
        mean: null,
        sd: null,
        loglik,
        aic: aic(loglik, Number(dist.k) || 0),
        bic: bic(loglik, Number(dist.k) || 0, n),
        converged: true,
        na: false,
        tests: {}
      };
      try {
        const qf = (p) => dist.quantile(p, params);
        const mom = quantileMoments(qf, 1025);
        row.mean = Number.isFinite(mom.mean) ? mom.mean : null;
        row.sd = Number.isFinite(mom.sd) ? mom.sd : null;
      } catch {
        row.mean = null;
        row.sd = null;
      }
      const cdfFn = (v) => dist.cdf(v, params);
      const quantileFn = (p) => dist.quantile(p, params);
      const refitHook = mcRefit ? (simSorted) => {
        try {
          const f2 = dist.fit(simSorted, { seed });
          if (!f2 || !f2.converged || !Number.isFinite(Number(f2.loglik))) return null;
          const p2 = f2.params;
          return (v) => dist.cdf(v, p2);
        } catch {
          return null;
        }
      } : void 0;
      for (const id of wantedTests) {
        const testFn = TESTS[id];
        if (typeof testFn !== "function") continue;
        try {
          const res = testFn(xs, cdfFn, {
            k: row.k,
            alpha,
            B: Breps,
            seed,
            bins: binsOpt,
            quantileFn,
            refit: refitHook
          });
          if (res && res.method !== "none" && Number.isFinite(res.p)) {
            row.tests[id] = {
              stat: res.stat,
              p: res.p,
              crit: res.crit,
              pass: Boolean(res.pass),
              method: res.method
            };
          }
        } catch (err) {
          out.warnings.push({
            dataset: name,
            distId: dist.id,
            reason: `\u68C0\u9A8C ${id} \u5931\u8D25\uFF1A${err && err.message ? err.message : String(err)}`
          });
        }
      }
      out.rows.push(row);
      fitted.push({ dist, params, row });
    }
    const usable = fitted.filter((f) => Number.isFinite(f.row.aic)).sort((a, b) => a.row.aic - b.row.aic);
    const weights = aicWeights(usable.map((f) => f.row.aic));
    if (usable.length) {
      const best = usable[0].row.aic;
      usable.forEach((f, i) => {
        out.ranking.push({
          dataset: name,
          distId: f.dist.id,
          aic: f.row.aic,
          deltaAic: f.row.aic - best,
          weight: weights[i],
          rank: i + 1
        });
      });
      out.optimal.push({ dataset: name, distId: usable[0].dist.id, aic: usable[0].row.aic });
    } else {
      out.warnings.push({ dataset: name, distId: null, reason: "\u6CA1\u6709\u53EF\u6392\u5E8F\u7684\u62DF\u5408\u7ED3\u679C\uFF08\u5168\u90E8 na\uFF09" });
    }
    const hist = histogram(xs, binsOpt);
    out.histograms.push({ dataset: name, bins: hist.bins, n: hist.n });
    out.ecdf.push({ dataset: name, ...ecdf(xs) });
    const usedDists = usable.map((f) => f.dist);
    const grid = buildGrid(xs, usedDists, gridSize);
    for (const f of usable) {
      const { dist, params } = f;
      const pdf = new Array(grid.length);
      const cdf = new Array(grid.length);
      for (let i = 0; i < grid.length; i++) {
        const x = grid[i];
        if (!inSupport(dist.support, x)) {
          pdf[i] = null;
          cdf[i] = null;
          continue;
        }
        let pv = dist.pdf(x, params);
        let cv = dist.cdf(x, params);
        pdf[i] = Number.isFinite(pv) ? pv : null;
        cdf[i] = Number.isFinite(cv) ? clamp4(cv, 0, 1) : null;
      }
      out.curves.push({ dataset: name, distId: dist.id, x: grid.slice(), pdf, cdf });
      const ppPoints = new Array(n);
      const qqPoints = new Array(n);
      for (let i = 0; i < n; i++) {
        const F = dist.cdf(xs[i], params);
        const emp = (i + 0.5) / n;
        ppPoints[i] = {
          theoretical: Number.isFinite(F) ? clamp4(F, 0, 1) : emp,
          empirical: emp
        };
        const Q = dist.quantile(emp, params);
        qqPoints[i] = {
          theoretical: Number.isFinite(Q) ? Q : null,
          sample: xs[i]
        };
      }
      out.pp.push({ dataset: name, distId: dist.id, points: ppPoints });
      out.qq.push({ dataset: name, distId: dist.id, points: qqPoints });
      const values = QUANTILE_PROBS.map((p) => {
        const q = dist.quantile(p, params);
        return Number.isFinite(q) ? q : null;
      });
      out.quantiles.push({
        dataset: name,
        distId: dist.id,
        probs: Array.from(QUANTILE_PROBS),
        values
      });
    }
  });
  return out;
}
function makeNaRow(dataset, dist, note) {
  return {
    dataset,
    distId: dist.id,
    distName: dist.name || dist.id,
    k: Number(dist.k) || 0,
    params: null,
    paramsText: "\u2014",
    mean: null,
    sd: null,
    loglik: null,
    aic: null,
    bic: null,
    converged: false,
    na: true,
    note: note || "fit-failed",
    tests: {}
  };
}

// src/client/ui/styles.js
var PALETTE = [
  "#4c7dff",
  "#f0a04b",
  "#17b3a3",
  "#e2556f",
  "#94a1b3",
  "#8b5cf6",
  "#c99a17",
  "#3ea45d",
  "#dd6ba8",
  "#a9713f",
  "#2f9ee8",
  "#0e8390",
  "#5c6fd6",
  "#d97b1f",
  "#3f9e86",
  "#a3568f",
  "#7fa53a",
  "#55708f",
  "#e8825f",
  "#7a6ff0",
  "#c94f68",
  "#b3591f",
  "#6b8f3a"
];
var CSS = `
.df-root {
  --df-fg: var(--dsw-alias-label-primary, #16181d);
  --df-fg-2: var(--dsw-alias-label-secondary, #6b7280);
  --df-fg-3: color-mix(in srgb, var(--df-fg-2) 70%, transparent);
  --df-bg: var(--dsw-alias-bg-base, #ffffff);
  --df-surface: var(--dsw-alias-bg-layer-1, #ffffff);
  --df-surface-2: var(--dsw-alias-bg-layer-2, #f6f7f9);
  --df-border: var(--dsw-alias-border-l1, #e6e8ee);
  --df-border-2: var(--dsw-alias-border-l2, #d5d9e2);
  --df-grid: color-mix(in srgb, var(--df-border) 82%, transparent);
  --df-accent: var(--dsw-alias-brand-primary, #4c7dff);
  --df-ok: var(--dsw-alias-state-success-primary, #16a06a);
  --df-warn: var(--dsw-alias-state-warn-primary, #c98a12);
  --df-err: var(--dsw-alias-state-error-primary, #d94a4a);
  --df-idle: var(--dsw-alias-state-idle-primary, #8a93a3);
  --df-radius: 12px;
  --df-radius-sm: 8px;
  --df-shadow: 0 1px 2px rgba(16, 24, 40, 0.04), 0 6px 18px -12px rgba(16, 24, 40, 0.18);
  color: var(--df-fg);
  background: var(--df-bg);
  height: 100%;
  overflow: auto;
  font-size: 13px;
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
}
.df-root *, .df-root *::before, .df-root *::after { box-sizing: border-box; }
.df-root ::selection { background: color-mix(in srgb, var(--df-accent) 24%, transparent); }

.df-shell { max-width: 1320px; margin: 0 auto; padding: 18px 22px 28px; }

/* ---------------------------------------------------------------- header --- */
.df-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.df-logo {
  width: 34px; height: 34px; flex: none; display: grid; place-items: center;
  border-radius: 10px; color: var(--df-accent);
  background: color-mix(in srgb, var(--df-accent) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--df-accent) 22%, transparent);
}
.df-titles { min-width: 0; }
.df-title { font-size: 16px; font-weight: 650; letter-spacing: -0.01em; margin: 0; }
.df-sub { font-size: 11.5px; color: var(--df-fg-2); margin: 1px 0 0; }
.df-actions { margin-left: auto; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }

.df-btn {
  display: inline-flex; align-items: center; gap: 6px;
  height: 30px; padding: 0 11px; border-radius: var(--df-radius-sm);
  border: 1px solid var(--df-border-2); background: var(--df-surface);
  color: var(--df-fg); font: inherit; font-size: 12.5px; cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease, transform 60ms ease;
  white-space: nowrap;
}
.df-btn:hover { background: var(--df-surface-2); }
.df-btn:active { transform: translateY(0.5px); }
.df-btn:disabled { opacity: 0.5; cursor: default; }
.df-btn-primary {
  background: var(--df-accent); border-color: transparent; color: var(--df-bg);
  box-shadow: 0 1px 2px color-mix(in srgb, var(--df-accent) 40%, transparent);
}
.df-btn-primary:hover { background: color-mix(in srgb, var(--df-accent) 88%, var(--df-bg)); }
.df-btn-ghost { border-color: transparent; background: transparent; color: var(--df-fg-2); }
.df-btn-ghost:hover { background: var(--df-surface-2); color: var(--df-fg); }
.df-btn-sm { height: 26px; padding: 0 9px; font-size: 12px; }

/* -------------------------------------------------------------- layout --- */
.df-grid { display: grid; grid-template-columns: 268px minmax(0, 1fr); gap: 16px; align-items: start; }
.df-rail { display: flex; flex-direction: column; gap: 12px; position: sticky; top: 0; }
.df-main { display: flex; flex-direction: column; gap: 14px; min-width: 0; }

.df-card {
  background: var(--df-surface); border: 1px solid var(--df-border);
  border-radius: var(--df-radius); box-shadow: var(--df-shadow);
  min-width: 0;
}
.df-card-head {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px; border-bottom: 1px solid var(--df-border);
}
.df-card-title { font-size: 12px; font-weight: 650; letter-spacing: 0.01em; margin: 0; }
.df-card-sub { font-size: 11px; color: var(--df-fg-2); }
.df-card-tools { margin-left: auto; display: flex; align-items: center; gap: 6px; }
.df-card-body { padding: 12px; }
.df-card-body-tight { padding: 8px 10px; }
.df-card-body-flush { padding: 0; }

.df-note { font-size: 11.5px; color: var(--df-fg-2); margin: 0; }
.df-hint { font-size: 11px; color: var(--df-fg-3); }

/* --------------------------------------------------------------- KPIs --- */
.df-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(148px, 1fr)); gap: 10px; }
.df-kpi {
  padding: 11px 12px; border-radius: var(--df-radius-sm);
  border: 1px solid var(--df-border); background: var(--df-surface);
}
.df-kpi-label { font-size: 11px; color: var(--df-fg-2); }
.df-kpi-value { font-size: 19px; font-weight: 620; letter-spacing: -0.015em; font-variant-numeric: tabular-nums; margin-top: 2px; }
.df-kpi-unit { font-size: 11px; color: var(--df-fg-2); font-weight: 500; margin-left: 4px; }
.df-kpi-foot { font-size: 11px; color: var(--df-fg-2); margin-top: 2px; }

/* -------------------------------------------------------------- chips --- */
.df-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.df-chip {
  display: inline-flex; align-items: center; gap: 6px;
  height: 26px; padding: 0 10px; border-radius: 999px;
  border: 1px solid var(--df-border-2); background: var(--df-surface);
  color: var(--df-fg-2); font: inherit; font-size: 12px; cursor: pointer;
  transition: all 120ms ease; max-width: 100%;
}
.df-chip:hover { border-color: var(--df-accent); color: var(--df-fg); }
.df-chip-on {
  background: color-mix(in srgb, var(--df-accent) 12%, transparent);
  border-color: color-mix(in srgb, var(--df-accent) 45%, transparent);
  color: var(--df-fg); font-weight: 550;
}
.df-chip-dot { width: 7px; height: 7px; border-radius: 50%; flex: none; }
.df-chip-count { font-size: 10.5px; color: var(--df-fg-2); font-variant-numeric: tabular-nums; }

/* ---------------------------------------------------------- check rows --- */
.df-checkgroup { display: flex; flex-direction: column; gap: 2px; }
.df-checkgroup-title {
  display: flex; align-items: center; gap: 6px;
  font-size: 10.5px; font-weight: 600; letter-spacing: 0.04em;
  color: var(--df-fg-3); text-transform: uppercase; margin: 8px 0 3px;
}
.df-checkgroup-title:first-child { margin-top: 0; }
.df-check {
  display: flex; align-items: center; gap: 8px; padding: 4px 6px;
  border-radius: 6px; cursor: pointer; border: 0; background: transparent;
  color: var(--df-fg); font: inherit; font-size: 12.5px; text-align: left; width: 100%;
}
.df-check:hover { background: var(--df-surface-2); }
.df-check-box {
  width: 14px; height: 14px; border-radius: 4px; flex: none;
  border: 1.5px solid var(--df-border-2); display: grid; place-items: center;
  color: #fff; transition: all 100ms ease;
}
.df-check-on .df-check-box { background: var(--df-check-accent, #3b6ef0); border-color: var(--df-check-accent, #3b6ef0); color: #fff; }
.df-check-k { margin-left: auto; font-size: 10.5px; color: var(--df-fg-3); font-variant-numeric: tabular-nums; }
.df-check-dot { width: 6px; height: 6px; border-radius: 50%; flex: none; }
.df-check-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* --------------------------------------------------------------- tabs --- */
.df-tabs { display: inline-flex; padding: 2px; gap: 2px; border-radius: 9px; background: var(--df-surface-2); border: 1px solid var(--df-border); }
.df-tab {
  height: 24px; padding: 0 10px; border-radius: 7px; border: 0; background: transparent;
  color: var(--df-fg-2); font: inherit; font-size: 12px; cursor: pointer;
}
.df-tab:hover { color: var(--df-fg); }
.df-tab-on { background: var(--df-surface); color: var(--df-fg); font-weight: 600; box-shadow: var(--df-shadow); }

/* -------------------------------------------------------------- chart --- */
.df-chartwrap { padding: 10px 12px 6px; min-height: 300px; }
.df-chart-svg { display: block; width: 100%; overflow: visible; }
.df-axis { fill: var(--df-fg-2); font-size: 11px; }
.df-axis-title { fill: var(--df-fg-2); font-size: 11px; font-weight: 500; }
.df-gridline { stroke: var(--df-grid); stroke-width: 1; stroke-dasharray: 2 4; }
.df-axisline { stroke: var(--df-border-2); stroke-width: 1; }
.df-ref-line { stroke: var(--df-fg-3); stroke-width: 1.2; stroke-dasharray: 5 4; }
.df-bar { fill: color-mix(in srgb, var(--df-accent) 18%, transparent); stroke: color-mix(in srgb, var(--df-accent) 42%, transparent); stroke-width: 1; stroke-linejoin: round; }
.df-bar-dim { fill: color-mix(in srgb, var(--df-fg-2) 12%, transparent); stroke: color-mix(in srgb, var(--df-fg-2) 22%, transparent); }
/* Bar tints selectable in the export dialog; .df-bar-active keeps the hover look. */
.df-bar.df-bar-soft:not(.df-bar-active) { fill: color-mix(in srgb, var(--df-accent) 18%, transparent); stroke: color-mix(in srgb, var(--df-accent) 42%, transparent); }
.df-bar.df-bar-medium:not(.df-bar-active) { fill: color-mix(in srgb, var(--df-accent) 30%, transparent); stroke: color-mix(in srgb, var(--df-accent) 56%, transparent); }
.df-bar.df-bar-bold:not(.df-bar-active) { fill: color-mix(in srgb, var(--df-accent) 46%, transparent); stroke: color-mix(in srgb, var(--df-accent) 68%, transparent); }
.df-bar.df-bar-outline:not(.df-bar-active) { fill: color-mix(in srgb, var(--df-surface) 92%, transparent); stroke: color-mix(in srgb, var(--df-accent) 66%, transparent); }
.df-cdf-emp { fill: none; stroke: var(--df-fg-2); stroke-width: 1.6; }
.df-dot { fill: var(--df-accent); opacity: 0.75; }
.df-crosshair { stroke: var(--df-fg-3); stroke-width: 1; stroke-dasharray: 3 3; }
.df-legend { display: flex; flex-wrap: wrap; gap: 4px 10px; padding: 4px 12px 10px; }
.df-legend-item { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--df-fg-2); background: none; border: 0; padding: 2px 3px; border-radius: 5px; cursor: pointer; font-family: inherit; }
.df-legend-item:hover { background: var(--df-surface-2); color: var(--df-fg); }
.df-legend-on { color: var(--df-fg); font-weight: 550; }
.df-legend-swatch { width: 12px; height: 3px; border-radius: 2px; flex: none; }
.df-legend-more { font-size: 11.5px; color: var(--df-accent); background: none; border: 0; padding: 2px 6px; border-radius: 5px; cursor: pointer; font-family: inherit; }
.df-legend-more:hover { background: var(--df-accent-soft); }
.df-alert { display: flex; align-items: flex-start; gap: 8px; padding: 9px 12px; margin-bottom: 10px; border-radius: 10px; font-size: 12px; line-height: 1.5; color: var(--df-fg-2); background: var(--df-warn-soft); border: 1px solid var(--df-warn-line); }
.df-alert > .df-badge { flex: none; margin-top: 1px; }
.df-flag { margin-left: 4px; font-size: 11px; color: var(--df-warn-fg); cursor: help; }
.df-tooltip {
  position: absolute; z-index: 30; pointer-events: none; min-width: 108px;
  padding: 6px 8px; border-radius: 8px; font-size: 11.5px; line-height: 1.45;
  background: var(--dsw-alias-bg-overlay, var(--df-surface));
  border: 1px solid var(--df-border-2); box-shadow: 0 8px 24px -8px rgba(16, 24, 40, 0.3);
  color: var(--df-fg); white-space: nowrap;
}
.df-tooltip b { font-weight: 600; font-variant-numeric: tabular-nums; }
.df-tooltip-row { display: flex; align-items: center; gap: 6px; justify-content: space-between; }
.df-tooltip-key { color: var(--df-fg-2); }

/* -------------------------------------------------------------- table --- */
.df-table-scroll { overflow-x: auto; }
.df-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 12px; }
.df-table th {
  position: sticky; top: 0; z-index: 1; text-align: left; font-weight: 600;
  font-size: 11px; letter-spacing: 0.02em; color: var(--df-fg-2);
  background: var(--df-surface-2); padding: 7px 10px; white-space: nowrap;
  border-bottom: 1px solid var(--df-border);
}
.df-table th.df-num, .df-table td.df-num { text-align: right; font-variant-numeric: tabular-nums; }
.df-table td { padding: 7px 10px; border-bottom: 1px solid var(--df-border); vertical-align: middle; }
.df-table tbody tr { cursor: pointer; }
.df-table tbody tr:hover td { background: var(--df-surface-2); }
.df-table tbody tr.df-row-on td { background: color-mix(in srgb, var(--df-accent) 8%, transparent); }
.df-table tbody tr.df-row-on td:first-child { box-shadow: inset 2px 0 0 var(--df-accent); }
.df-table-sortable { cursor: pointer; user-select: none; }
.df-table-sortable:hover { color: var(--df-fg); }
.df-swatch { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 7px; vertical-align: 1px; }
.df-params { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 11px; color: var(--df-fg-2); }

.df-badge {
  display: inline-flex; align-items: center; gap: 4px; height: 19px; padding: 0 7px;
  border-radius: 999px; font-size: 10.5px; font-weight: 600; letter-spacing: 0.01em;
  border: 1px solid transparent; white-space: nowrap;
}
.df-badge-ok { color: var(--df-ok); background: color-mix(in srgb, var(--df-ok) 12%, transparent); border-color: color-mix(in srgb, var(--df-ok) 26%, transparent); }
.df-badge-warn { color: var(--df-warn); background: color-mix(in srgb, var(--df-warn) 12%, transparent); border-color: color-mix(in srgb, var(--df-warn) 26%, transparent); }
.df-badge-err { color: var(--df-err); background: color-mix(in srgb, var(--df-err) 12%, transparent); border-color: color-mix(in srgb, var(--df-err) 26%, transparent); }
.df-badge-idle { color: var(--df-fg-2); background: var(--df-surface-2); border-color: var(--df-border); }
.df-badge-accent { color: var(--df-accent); background: color-mix(in srgb, var(--df-accent) 12%, transparent); border-color: color-mix(in srgb, var(--df-accent) 28%, transparent); }

/* --------------------------------------------------------------- misc --- */
.df-divider { height: 1px; background: var(--df-border); margin: 10px 0; }
.df-empty {
  display: grid; place-items: center; gap: 6px; min-height: 180px;
  color: var(--df-fg-2); font-size: 12px; text-align: center; padding: 20px;
}
.df-empty-icon { opacity: 0.5; }
.df-field { display: flex; align-items: center; gap: 8px; justify-content: space-between; font-size: 12px; }
.df-field + .df-field { margin-top: 8px; }
.df-field label { color: var(--df-fg-2); }
.df-select, .df-input {
  height: 28px; border-radius: 7px; border: 1px solid var(--df-border-2);
  background: var(--df-surface); color: var(--df-fg); font: inherit; font-size: 12px; padding: 0 8px;
}
.df-select:focus, .df-input:focus, .df-textarea:focus { outline: 2px solid color-mix(in srgb, var(--df-accent) 35%, transparent); outline-offset: 1px; }
.df-input-num { width: 74px; text-align: right; font-variant-numeric: tabular-nums; }
.df-textarea {
  width: 100%; min-height: 260px; resize: vertical; padding: 10px 12px;
  border-radius: 10px; border: 1px solid var(--df-border-2);
  background: var(--df-surface-2); color: var(--df-fg); font: inherit;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 12px; line-height: 1.6;
}

.df-overlay {
  position: fixed; inset: 0; z-index: 60; background: rgba(12, 16, 24, 0.42);
  display: grid; place-items: center; padding: 24px; backdrop-filter: blur(1.5px);
}
.df-modal {
  width: min(760px, 100%); max-height: min(86vh, 780px); display: flex; flex-direction: column;
  background: var(--df-surface); border: 1px solid var(--df-border-2);
  border-radius: 14px; box-shadow: 0 24px 60px -20px rgba(8, 12, 20, 0.5); overflow: hidden;
}
.df-modal-head { display: flex; align-items: center; gap: 8px; padding: 12px 14px; border-bottom: 1px solid var(--df-border); }
.df-modal-body { padding: 14px; overflow: auto; display: flex; flex-direction: column; gap: 10px; }
.df-modal-foot { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-top: 1px solid var(--df-border); }

.df-spinner {
  width: 14px; height: 14px; border-radius: 50%; flex: none;
  border: 2px solid color-mix(in srgb, var(--df-accent) 25%, transparent);
  border-top-color: var(--df-accent); animation: df-spin 700ms linear infinite;
}
@keyframes df-spin { to { transform: rotate(360deg); } }

.df-inline { display: inline-flex; align-items: center; gap: 6px; }
.df-row { display: flex; align-items: center; gap: 8px; }
.df-wrap { flex-wrap: wrap; }
.df-spacer { flex: 1 1 auto; }
.df-mono { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-variant-numeric: tabular-nums; }
.df-formula { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 11.5px; line-height: 1.7; color: var(--df-fg); overflow-wrap: anywhere; }
.df-scroll-y { max-height: 268px; overflow: auto; }

.df-root::-webkit-scrollbar, .df-card-body::-webkit-scrollbar, .df-scroll-y::-webkit-scrollbar, .df-modal-body::-webkit-scrollbar { width: 9px; height: 9px; }
.df-root::-webkit-scrollbar-thumb, .df-card-body::-webkit-scrollbar-thumb, .df-scroll-y::-webkit-scrollbar-thumb, .df-modal-body::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--df-fg-2) 26%, transparent); border-radius: 99px;
  border: 2px solid transparent; background-clip: content-box;
}
.df-root::-webkit-scrollbar-track { background: transparent; }

/* ---- chart internals (contract in src/client/ui/charts.jsx) ---------------- */
.df-chart { display: flex; flex-direction: column; height: 100%; min-height: 0; gap: 8px; }
.df-chart-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.df-chart-title { font-size: 13px; font-weight: 600; color: var(--df-fg); line-height: 1.35; }
.df-chart-sub { margin-top: 2px; font-size: 11px; color: var(--df-fg-2); }
.df-chart-right { display: flex; align-items: center; gap: 8px; flex: none; }
.df-chart-body { position: relative; flex: 1 1 auto; min-height: 120px; }
.df-chart-body-inner { position: absolute; inset: 0; }
.df-plot { position: relative; width: 100%; }
.df-chart-empty { display: grid; place-items: center; min-height: 180px; padding: 20px; text-align: center; font-size: 12px; color: var(--df-fg-2); }
.df-axes { pointer-events: none; }
.df-bar-active { fill: color-mix(in srgb, var(--df-accent) 26%, transparent); stroke: color-mix(in srgb, var(--df-accent) 46%, transparent); }
.df-curve { fill: none; stroke-linecap: round; stroke-linejoin: round; }
.df-curve-active { filter: drop-shadow(0 1px 2px color-mix(in srgb, currentColor 22%, transparent)); }
.df-point { stroke: none; }
.df-point-active { r: 4; opacity: 1; }
.df-focus-dot { fill: var(--df-fg); }
.df-chart-legend { display: flex; flex-wrap: wrap; gap: 6px 12px; margin-top: 2px; }
.df-chart-legend-chip { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--df-fg-2); }
.df-chart-legend-chip-active { color: var(--df-fg); }
.df-chart-legend-chip-active .df-chart-legend-name { font-weight: 600; }
.df-chart-legend-chip-inactive { opacity: 0.55; }
.df-chart-legend-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
.df-chart-legend-name { font-size: 11px; }
.df-tooltip-title { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; font-size: 11.5px; font-weight: 600; color: var(--df-fg); }
.df-tooltip-dot { width: 7px; height: 7px; border-radius: 50%; flex: none; }
.df-tooltip-value { font-variant-numeric: tabular-nums; font-weight: 600; color: var(--df-fg); }

/* ---- AI interpretation card ---------------------------------------------- */
.df-ai-card { border-color: color-mix(in srgb, var(--df-accent) 22%, var(--df-border)); }
.df-ai-card .df-card-head { align-items: center; }
.df-ai-dot {
  width: 8px; height: 8px; flex: none; border-radius: 50%;
  background: var(--df-accent);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--df-accent) 14%, transparent);
}
.df-ai-loading .df-ai-dot { animation: df-ai-pulse 1.15s ease-in-out infinite; }
.df-ai-err .df-ai-dot { background: var(--df-warn); box-shadow: 0 0 0 4px color-mix(in srgb, var(--df-warn) 16%, transparent); }
.df-ai-body { padding-top: 4px; }
.df-ai-text { display: flex; flex-direction: column; gap: 6px; }
.df-ai-h { margin: 8px 0 0; font-size: 12.5px; font-weight: 600; color: var(--df-fg); letter-spacing: 0.01em; }
.df-ai-h1 { font-size: 13.5px; }
.df-ai-h1:first-child, .df-ai-h:first-child { margin-top: 0; }
.df-ai-p { margin: 0; font-size: 12.5px; line-height: 1.72; color: var(--df-fg-2); }
.df-ai-list { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 4px; }
.df-ai-list li { font-size: 12.5px; line-height: 1.7; color: var(--df-fg-2); }
.df-ai-text strong { color: var(--df-fg); font-weight: 600; }
.df-ai-foot { margin-top: 4px; }
.df-ai-error { display: flex; flex-direction: column; gap: 6px; }
.df-ai-skeleton { display: flex; flex-direction: column; gap: 8px; padding: 2px 0; }
.df-ai-skeleton > span {
  height: 11px; border-radius: 5px;
  background: linear-gradient(90deg, var(--df-surface-2) 0%, color-mix(in srgb, var(--df-surface-2) 55%, var(--df-border)) 50%, var(--df-surface-2) 100%);
  background-size: 220% 100%;
  animation: df-ai-shimmer 1.5s ease-in-out infinite;
}
.df-ai-skeleton > span:nth-child(1) { width: 42%; }
.df-ai-skeleton > span:nth-child(2) { width: 96%; }
.df-ai-skeleton > span:nth-child(3) { width: 88%; }
.df-ai-skeleton > span:nth-child(4) { width: 64%; }
@keyframes df-ai-shimmer { from { background-position: 130% 0; } to { background-position: -30% 0; } }
@keyframes df-ai-pulse { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }

.df-modal-export { width: min(1240px, 100%); }
.df-export-meta { margin: 2px 0 0; font-size: 11px; line-height: 1.5; color: var(--df-fg-3); }
.df-export-body {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.65fr);
  gap: 14px;
  align-items: start;
}
.df-modal-wide { width: min(1080px, 100%); }
.df-export-preview {
  display: flex; flex-direction: column; gap: 10px;
  align-items: center; justify-content: center;
  min-height: 320px; padding: 12px;
  border: 1px solid var(--df-border); border-radius: 10px;
  background: #fff;
}
.df-export-preview img { display: block; max-width: 100%; max-height: 46vh; }
.df-export-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
.df-export-filename { margin: 0; font-size: 10.5px; line-height: 1.5; text-align: center; word-break: break-all; }
.df-export-controls { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.df-export-panes { align-self: flex-start; }
.df-export-pane {
  display: flex; flex-direction: column; gap: 10px; min-width: 0;
  max-height: 56vh; overflow: auto; padding-right: 4px;
}
.df-export-templates { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.df-export-tpl {
  position: relative; display: flex; flex-direction: column; gap: 3px;
  padding: 9px 10px; text-align: left;
  border: 1px solid var(--df-border); border-radius: 9px;
  background: var(--df-surface); color: var(--df-fg);
  font: inherit; cursor: pointer;
}
.df-export-tpl:hover { border-color: color-mix(in srgb, var(--df-accent) 45%, var(--df-border)); }
.df-export-tpl-on { border-color: var(--df-accent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--df-accent) 55%, transparent); }
.df-export-tpl-name { font-size: 12px; font-weight: 600; }
.df-export-tpl-desc { font-size: 10.5px; line-height: 1.5; color: var(--df-fg-3); }
.df-export-tpl-pick {
  display: flex; flex-direction: column; gap: 2px;
  padding: 0; border: 0; background: transparent; color: inherit;
  font: inherit; text-align: left; cursor: pointer;
}
.df-export-tpl-del {
  position: absolute; top: 3px; right: 6px;
  width: 18px; height: 18px; line-height: 1;
  border: 0; border-radius: 50%; background: transparent;
  color: var(--df-fg-3); font-size: 14px; cursor: pointer;
}
.df-export-tpl-del:hover { background: var(--df-warn-soft); color: var(--df-warn-fg); }
.df-export-sec-title { margin: 2px 0 0; font-size: 11px; font-weight: 600; color: var(--df-fg-2); }
.df-export-save { display: flex; gap: 8px; }
.df-export-save .df-input { flex: 1; min-width: 0; }
.df-export-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 10px; }
.df-export-grid2 > .df-field + .df-field { margin-top: 0; }
.df-export-grid2 > .df-field-check { margin: 0; }
.df-export-grid3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px 10px; }
.df-export-grid3 > .df-field + .df-field { margin-top: 0; }
/* narrow pane: stack the label above its select so two-character labels never wrap */
.df-export-grid3 > .df-field { flex-direction: column; align-items: stretch; gap: 4px; }
.df-export-grid3 > .df-field > .df-select { width: 100%; }
.df-export-x { color: var(--df-fg-3); }
.df-export-size { display: inline-flex; align-items: center; gap: 6px; color: var(--df-fg-3); }
.df-export-size .df-input { width: 78px; text-align: right; font-variant-numeric: tabular-nums; }
.df-export-note { margin: 0; font-size: 11px; line-height: 1.6; color: var(--df-fg-3); }
.df-export-color { display: inline-flex; align-items: center; gap: 8px; }
.df-color { width: 46px; height: 28px; padding: 2px; border: 1px solid var(--df-border); border-radius: 6px; background: var(--df-surface); cursor: pointer; }
.df-color::-webkit-color-swatch-wrapper { padding: 0; }
.df-color::-webkit-color-swatch { border: none; border-radius: 4px; }
.df-export-ai-actions { display: flex; align-items: center; gap: 8px; }
.df-export-ai-notes {
  display: flex; flex-direction: column; gap: 4px;
  padding: 9px 10px; border: 1px solid var(--df-border);
  border-radius: 9px; background: var(--df-surface-2);
}
.df-export-error { padding: 0 16px 8px; }
.df-field-check { cursor: pointer; user-select: none; }
.df-field-check input { width: 14px; height: 14px; accent-color: var(--df-accent); }
/* The off-screen render target: real layout, never visible, never scrolls the page. */
.df-export-stage { position: fixed; left: -20000px; top: 0; pointer-events: none; opacity: 0; }
@media (max-width: 860px) {
  .df-export-body { grid-template-columns: minmax(0, 1fr); }
  .df-export-pane { max-height: none; }
  .df-export-templates { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .df-ai-skeleton > span, .df-ai-loading .df-ai-dot { animation: none; }
}

@media (max-width: 1080px) {
  .df-grid { grid-template-columns: minmax(0, 1fr); }
  .df-rail { position: static; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
  .df-shell { padding: 14px 14px 22px; }
}
`;

// src/client/ui/formulas.js
var FORMULAS = {
  normal: {
    plain: "f(x) = 1/(\u03C3\u221A(2\u03C0)) \xB7 exp[\u2212(x\u2212\u03BC)\xB2/(2\u03C3\xB2)]",
    support: "x \u2208 (\u2212\u221E, +\u221E)",
    note: "\u03BC \u4E3A\u5747\u503C\uFF08\u4F4D\u7F6E\uFF09\uFF0C\u03C3 \u4E3A\u6807\u51C6\u5DEE\uFF08\u5C3A\u5EA6\uFF09"
  },
  logistic: {
    plain: "f(x) = exp[\u2212(x\u2212\u03BC)/s] / {s\xB7[1+exp(\u2212(x\u2212\u03BC)/s)]\xB2}",
    support: "x \u2208 (\u2212\u221E, +\u221E)",
    note: "\u03BC \u4E3A\u4F4D\u7F6E\uFF0Cs \u4E3A\u5C3A\u5EA6\uFF0C\u6807\u51C6\u5DEE = \u03C0s/\u221A3"
  },
  laplace: {
    plain: "f(x) = 1/(2b) \xB7 exp(\u2212|x\u2212\u03BC|/b)",
    support: "x \u2208 (\u2212\u221E, +\u221E)",
    note: "\u03BC \u4E3A\u4F4D\u7F6E\uFF08\u4E2D\u4F4D\u6570\uFF09\uFF0Cb \u4E3A\u5C3A\u5EA6\uFF0C\u6807\u51C6\u5DEE = \u221A2\xB7b"
  },
  cauchy: {
    plain: "f(x) = 1/{\u03C0\u03B3[1+((x\u2212x\u2080)/\u03B3)\xB2]}",
    support: "x \u2208 (\u2212\u221E, +\u221E)",
    note: "x\u2080 \u4E3A\u4E2D\u4F4D\u6570\uFF08\u4F4D\u7F6E\uFF09\uFF0C\u03B3 \u4E3A\u534A\u9AD8\u534A\u5BBD\uFF08\u5C3A\u5EA6\uFF09\uFF1B\u65E0\u6709\u9650\u65B9\u5DEE"
  },
  uniform: {
    plain: "f(x) = 1/(b\u2212a)\uFF0Ca \u2264 x \u2264 b",
    support: "a \u2264 x \u2264 b",
    note: "a \u4E3A\u4E0B\u9650\uFF0Cb \u4E3A\u4E0A\u9650"
  },
  lognormal: {
    plain: "f(x) = 1/(x\u03C3\u221A(2\u03C0)) \xB7 exp[\u2212(ln x\u2212\u03BC)\xB2/(2\u03C3\xB2)]",
    support: "x > 0",
    note: "\u03BC\u3001\u03C3 \u4E3A ln x \u7684\u5747\u503C\u4E0E\u6807\u51C6\u5DEE\uFF1B\u5747\u503C = exp(\u03BC+\u03C3\xB2/2)"
  },
  gamma: {
    plain: "f(x) = x^(\u03B1\u22121)\xB7exp(\u2212x/\u03B2) / [\u03B2^\u03B1\xB7\u0393(\u03B1)]",
    support: "x > 0",
    note: "\u03B1 \u4E3A\u5F62\u72B6\uFF0C\u03B2 \u4E3A\u5C3A\u5EA6\uFF0C\u5747\u503C = \u03B1\u03B2\uFF0C\u65B9\u5DEE = \u03B1\u03B2\xB2"
  },
  weibull: {
    plain: "f(x) = (k/\u03BB)\xB7(x/\u03BB)^(k\u22121)\xB7exp[\u2212(x/\u03BB)^k]",
    support: "x > 0",
    note: "k \u4E3A\u5F62\u72B6\uFF08k<1 \u65E9\u671F\u5931\u6548\u3001k\u22481 \u968F\u673A\u5931\u6548\u3001k>1 \u78E8\u635F\u5931\u6548\uFF09\uFF0C\u03BB \u4E3A\u5C3A\u5EA6"
  },
  exponential: {
    plain: "f(x) = (1/\u03BB)\xB7exp(\u2212x/\u03BB)",
    support: "x > 0",
    note: "\u03BB \u4E3A\u5C3A\u5EA6\uFF0C\u7B49\u4E8E\u5747\u503C\u4E0E\u6807\u51C6\u5DEE"
  },
  rayleigh: {
    plain: "f(x) = (x/\u03C3\xB2)\xB7exp[\u2212x\xB2/(2\u03C3\xB2)]",
    support: "x \u2265 0",
    note: "\u03C3 \u4E3A\u5C3A\u5EA6\uFF1B\u5747\u503C = \u03C3\u221A(\u03C0/2)"
  },
  invgauss: {
    plain: "f(x) = \u221A(\u03BB/(2\u03C0x\xB3))\xB7exp[\u2212\u03BB(x\u2212\u03BC)\xB2/(2\u03BC\xB2x)]",
    support: "x > 0",
    note: "\u03BC \u4E3A\u5747\u503C\uFF0C\u03BB \u4E3A\u5F62\u72B6\u53C2\u6570"
  },
  loglogistic: {
    plain: "f(x) = (c/\u03BB)(x/\u03BB)^(c\u22121) / [1+(x/\u03BB)^c]\xB2",
    support: "x > 0",
    note: "c \u4E3A\u5F62\u72B6\uFF0C\u03BB \u4E3A\u5C3A\u5EA6\uFF08\u4E2D\u4F4D\u6570\uFF09\uFF1Bc < 1 \u65F6\u5C3E\u90E8\u66F4\u91CD"
  },
  lomax: {
    plain: "f(x) = \u03B1/\u03BB \xB7 [1+x/\u03BB]^(\u2212(\u03B1+1))",
    support: "x > 0",
    note: "\u03B1 \u4E3A\u5F62\u72B6\uFF08\u5C3E\u90E8\u6307\u6570\uFF09\uFF0C\u03BB \u4E3A\u5C3A\u5EA6\uFF1B\u03B1 > 2 \u65F6\u65B9\u5DEE\u6709\u9650"
  },
  burr: {
    plain: "f(x) = ck/\u03BB \xB7 (x/\u03BB)^(c\u22121) \xB7 [1+(x/\u03BB)^c]^(\u2212k\u22121)",
    support: "x > 0",
    note: "c\u3001k \u4E3A\u5F62\u72B6\uFF0C\u03BB \u4E3A\u5C3A\u5EA6\uFF1B\u4E09\u53C2\u6570\u65CF\uFF0C\u8986\u76D6\u8F83\u5BBD\u504F\u5EA6/\u5CF0\u5EA6"
  },
  fatiguelife: {
    plain: "f(x) = [\u221A(x/\u03B2)+\u221A(\u03B2/x)]/(2c\u03C6(x/\u03B2)) \xB7 exp[\u2212(\u221A(x/\u03B2)\u2212\u221A(\u03B2/x))\xB2/(2c\xB2)]",
    support: "x > 0",
    note: "\u03B2 \u4E3A\u5C3A\u5EA6\uFF08\u4E2D\u4F4D\u6570\uFF09\uFF0Cc \u4E3A\u5F62\u72B6\uFF1BBirnbaum\u2013Saunders \u75B2\u52B3\u5BFF\u547D\u6A21\u578B"
  },
  nakagami: {
    plain: "f(x) = 2\u03BD^\u03BD/(\u0393(\u03BD)\u03C9^\u03BD) \xB7 x^(2\u03BD\u22121)\xB7exp(\u2212\u03BDx\xB2/\u03C9)",
    support: "x > 0",
    note: "\u03BD \u4E3A\u5F62\u72B6\uFF0C\u03C9 \u4E3A\u5C3A\u5EA6\u5E73\u65B9\uFF08E[x\xB2]\uFF09"
  },
  maxwell: {
    plain: "f(x) = \u221A(2/\u03C0)\xB7x\xB2/a\xB3 \xB7 exp[\u2212x\xB2/(2a\xB2)]",
    support: "x > 0",
    note: "a \u4E3A\u5C3A\u5EA6\uFF08\u5206\u5B50\u901F\u7387\u53C2\u6570\uFF09\uFF0C\u5747\u503C = 2a\u221A(2/\u03C0)"
  },
  chi2: {
    plain: "f(x) = x^(df/2\u22121)\xB7exp(\u2212x/2) / [2^(df/2)\xB7\u0393(df/2)]",
    support: "x > 0",
    note: "df \u4E3A\u81EA\u7531\u5EA6\uFF08\u5F62\u72B6\uFF09\uFF0C\u5C3A\u5EA6\u56FA\u5B9A\u4E3A 1"
  },
  halfnormal: {
    plain: "f(x) = \u221A(2)/(\u03C3\u221A\u03C0) \xB7 exp[\u2212x\xB2/(2\u03C3\xB2)]",
    support: "x > 0",
    note: "\u03C3 \u4E3A\u6BCD\u4F53\u6B63\u6001\u7684\u6807\u51C6\u5DEE\uFF08\u5C3A\u5EA6\uFF09"
  },
  beta: {
    plain: "f(x) = (x\u2212loc)^(a\u22121)(loc+scale\u2212x)^(b\u22121) / [B(a,b)\xB7scale^(a+b\u22121)]",
    support: "loc < x < loc+scale",
    note: "a\u3001b \u4E3A\u5F62\u72B6\u53C2\u6570\uFF0Cloc/scale \u628A [0,1] \u6620\u5C04\u5230\u5B9E\u9645\u533A\u95F4"
  },
  gumbel: {
    plain: "f(x) = (1/\u03B1)\xB7exp[\u2212(x\u2212\u03B2)/\u03B1]\xB7exp{\u2212exp[\u2212(x\u2212\u03B2)/\u03B1]}",
    support: "x \u2208 (\u2212\u221E, +\u221E)",
    note: "\u03B2 \u4E3A\u4F4D\u7F6E\uFF0C\u03B1 \u4E3A\u5C3A\u5EA6\uFF1B\u5E74\u6700\u5927\u503C\u578B\u7684\u7ECF\u5178\u6781\u503C\u5206\u5E03"
  },
  gev: {
    plain: "f(x) = (1/\u03C3)[1+\u03BE(x\u2212\u03BC)/\u03C3]^(\u22121/\u03BE\u22121)\xB7exp{\u2212[1+\u03BE(x\u2212\u03BC)/\u03C3]^(\u22121/\u03BE)}",
    support: "1 + \u03BE(x\u2212\u03BC)/\u03C3 > 0",
    note: "\u03BE \u4E3A\u5F62\u72B6\uFF08\u03BE=0 \u9000\u5316\u4E3A Gumbel\uFF0C\u03BE<0 Weibull \u578B\uFF0C\u03BE>0 Fr\xE9chet \u578B\uFF09"
  },
  gpd: {
    plain: "f(x) = (1/\u03C3)[1+\u03BE(x\u2212\u03BC)/\u03C3]^(\u22121/\u03BE\u22121)",
    support: "x > \u03BC \u4E14 1+\u03BE(x\u2212\u03BC)/\u03C3 > 0",
    note: "\u03BE \u4E3A\u5F62\u72B6\uFF08\u5C3E\u90E8\u6307\u6570\uFF09\uFF0C\u03BC \u4E3A\u9608\u503C\uFF0C\u03C3 \u4E3A\u5C3A\u5EA6\uFF1B\u8D85\u9608\u503C\u6781\u503C\u5EFA\u6A21"
  }
};
var FAMILY_HINT = {
  normal: "\u5BF9\u79F0\u3001\u8F7B\u5C3E\u7684\u6D4B\u91CF\u6570\u636E",
  logistic: "\u6BD4\u6B63\u6001\u5C3E\u90E8\u7565\u91CD\u7684\u5BF9\u79F0\u6570\u636E",
  laplace: "\u53CC\u6307\u6570\u3001\u5C16\u5CF0\u539A\u5C3E",
  cauchy: "\u6781\u91CD\u5C3E\u3001\u4E2D\u4F4D\u6570\u7A33\u5B9A",
  uniform: "\u7B49\u53EF\u80FD\u7684\u6709\u754C\u6570\u636E",
  lognormal: "\u6B63\u504F\u7684\u5F3A\u5EA6/\u5BFF\u547D/\u7C92\u5F84",
  gamma: "\u6B63\u504F\u3001\u53EF\u542B\u96F6\u70B9\u7684\u6301\u7EED\u91CF",
  weibull: "\u5BFF\u547D\u3001\u75B2\u52B3\u3001\u5F3A\u5EA6\uFF08\u53EF\u9760\u6027\uFF09",
  exponential: "\u6052\u5B9A\u5931\u6548\u7387\u7684\u5BFF\u547D",
  rayleigh: "\u5E45\u503C\u3001\u632F\u52A8\u3001\u98CE\u8F7D",
  invgauss: "\u9996\u8FBE\u65F6\u95F4\u3001\u9000\u5316\u5931\u6548",
  loglogistic: "\u6B63\u504F\u3001\u5C3E\u90E8\u9002\u4E2D\u7684\u5BFF\u547D",
  lomax: "\u539A\u5C3E\u635F\u5931/\u6536\u5165\u7C7B\u6570\u636E",
  burr: "\u504F\u5EA6\u5CF0\u5EA6\u8DE8\u5EA6\u5927\u7684\u539A\u5C3E\u6570\u636E",
  fatiguelife: "\u88C2\u7EB9\u6269\u5C55\u3001\u75B2\u52B3\u5BFF\u547D",
  nakagami: "\u65E0\u7EBF\u4FE1\u9053\u3001\u56DE\u6CE2\u5E45\u503C",
  maxwell: "\u5206\u5B50\u901F\u7387\u3001\u4E09\u7EF4\u5E45\u503C",
  chi2: "\u65B9\u5DEE\u4F30\u8BA1\u3001\u72EC\u7ACB\u6027\u68C0\u9A8C\u91CF",
  halfnormal: "\uFF5C\u6B63\u6001\uFF5C\u7684\u534A\u6B63\u6001\u91CF",
  beta: "\u6BD4\u4F8B\u3001\u5408\u683C\u7387\u7B49\u6709\u754C\u91CF",
  gumbel: "\u5E74\u6700\u5927\u6D2A\u6C34/\u98CE\u901F/\u6781\u503C",
  gev: "\u591A\u7AD9\u70B9\u6781\u503C\u3001\u91CD\u73B0\u671F\u8BBE\u8BA1\u503C",
  gpd: "\u8D85\u9608\u503C\uFF08POT\uFF09\u6781\u503C\u5C3E\u90E8"
};

// src/client/ui/sample.js
var SAMPLE_COLUMNS = [
  {
    name: "\u6728\u6750",
    unit: "MPa",
    values: [16.1, 22.6, 22.3, 17.9, 20.6, 23.6, 19.3, 22.2, 18.5, 21.2, 19.5, 22.7, 14.5, 19.2, 19.6, 21.9, 24.3, 20.3, 16.3, 26.9, 21.6, 20.1, 24, 22.9, 23.6, 17.4, 22, 20.8, 21.7, 25.1, 19.1, 24.5, 25, 21.4, 23.9, 17.5, 17.7, 19.7, 24.3, 25.4, 18.9, 17.1, 21.4, 20.2, 25.4, 20, 18.5, 18.2, 15.5, 22.7, 14.4, 19.7, 15.4, 20.4, 19.3, 15.1, 15.9, 22.4, 20.6, 14.3, 23.4, 22.9, 17, 25.1, 25, 16.6, 19.5, 19.5, 17.8, 23.6, 18.1, 20.8, 22.5, 21, 18.3, 23.3, 19.9, 27.2, 21.7, 21.1, 22.2, 20.8, 20, 19.7, 21.1, 22.7, 22.4, 22.9, 20.1, 20.9, 19.1, 21.9, 20.5, 22.8, 17.4, 16.8, 16.4, 18.4, 19.3, 18.9, 18, 17.8, 18.6, 23.9, 19.5, 14.5, 22.9, 19.5, 25.7, 23.5, 15.6, 17.4, 18.6, 19.4, 23.3, 17.9, 21.1, 21.1, 13.4, 22.8, 20.2, 24.8, 15.9, 20.1, 25, 24.7, 22.5, 17.4, 20.4, 18.6, 20.9, 19.6, 20.5, 23.3, 19.6, 19, 24.8, 19.1, 24.7, 27.4]
  },
  {
    name: "\u5851\u6599",
    unit: "MPa",
    values: [39.1, 22.1, 37.1, 23.6, 22.8, 16, 41.9, 24.9, 27.2, 22.7, 17.4, 26.1, 25.7, 29.1, 27.6, 31.8, 25.4, 36.1, 29.1, 30.1, 37.8, 21.5, 33.6, 22.6, 22.6, 28.1, 26.9, 35.1, 13.4, 24.1, 23.7, 28.6, 16.4, 27.7, 38.8, 28.5, 29.4, 26.9, 25.2, 27.3, 17.3, 50.3, 27.4, 29.2, 29.2, 36.9, 28.9, 21.2, 32.2, 28.6, 27.3, 32.9, 28.4, 22, 31.2, 18.8, 18.4, 17.8, 34.6, 32.9, 22.2, 15.6, 22.9, 26, 39.8, 28.6, 23.8, 21.1, 24, 22.1, 20, 24.1, 32.4, 22.4, 36.8, 19.9, 22.9, 28.5, 33.9, 27.3, 21.5, 33.3, 21, 15.5, 38, 13.1, 29.6, 34.3, 22.7, 37.3, 33.7, 31.2, 40.4, 39.5, 29.9, 33.5, 27.7, 26.6, 25.4, 21.2, 24.3, 20, 27.8, 34.3, 35.3, 33.9, 36, 41.8, 20.2, 23.4, 31.8, 40.6, 32.1, 29.2, 26.6, 26.9, 25.4, 29.4, 29.3, 28.7, 20.4, 27, 27.1, 15.2, 37.1, 40.9, 15.6, 28.1, 17.8, 27.7]
  },
  {
    name: "\u7EA4\u7EF4",
    unit: "MPa",
    values: [21.9, 19.6, 32.9, 26.8, 28.8, 27.9, 14.8, 23.7, 25.6, 27, 30.5, 15.6, 29.1, 35.1, 27, 29.1, 30.8, 29.4, 30.2, 24.9, 37.5, 21.2, 37.1, 32.1, 36.8, 18.2, 20.3, 24.1, 30.5, 18.6, 25.5, 19.3, 34.8, 33.9, 32, 29.7, 31, 30.4, 20.7, 38.8, 19.4, 30.9, 22.3, 26.3, 17.7, 20.6, 20.7, 29.2, 39.1, 27.3, 31.3, 24.1, 25.7, 32, 34.2, 25, 33, 39.8, 22.2, 31.5, 23.8, 29.9, 18.3, 37.1, 10.5, 31.9, 22, 17.9, 33.5, 23.6, 24.5, 27, 27.9, 34.4, 23.1, 30.4, 21.1, 26.5, 19.6, 32.7, 21.3, 40.1, 30.7, 35.5, 32.4, 19.2, 26.2, 28.1, 27.6, 22.6, 28.9, 13.5, 42.6, 17.9, 35.9, 27.9, 28, 28.3, 16.8, 34.2, 31, 31, 42, 36.5, 38.5, 24.8, 34, 23.7, 31.8, 14.7, 20.6, 26.1, 23.4, 33.6, 33.4, 23.1, 18.8, 23.9, 16.2, 20.2]
  }
];
var SAMPLE_NAME = "\u793A\u4F8B\uFF1A\u6728\u6750 / \u5851\u6599 / \u7EA4\u7EF4\uFF08390 \u4E2A\u6570\u503C\uFF0C\u5408\u6210\u6570\u636E\uFF09";
var SAMPLE_CSV = (() => {
  const names = SAMPLE_COLUMNS.map((column) => column.name);
  const rows = Math.max(...SAMPLE_COLUMNS.map((column) => column.values.length));
  const lines = [names.join(",")];
  for (let i = 0; i < rows; i += 1) {
    lines.push(SAMPLE_COLUMNS.map((column) => i < column.values.length ? column.values[i] : "").join(","));
  }
  return lines.join("\n");
})();

// src/client/ui/charts.jsx
var React = __toESM(require("react"), 1);

// src/client/ui/chartLegend.js
var LEGEND_MAX_ENTRIES = 12;
var DOT_SIZE = 8;
var DOT_GAP = 2;
var CHIP_GAP = 14;
var ROW_GAP = 6;
var MARGIN = 8;
var PAD = 6;
var LEGEND_GAP = 4;
var OVERFLOW_COLOR = "#9aa3ad";
var MODES = ["bottom", "right", "none"];
var ZERO_INSET = Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 });
var round2 = (value) => {
  const rounded = Math.round(Number(value) * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
};
function finiteOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function clampNumber(value, lo, hi, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
}
function isWideCodePoint(code) {
  return code >= 4352 && code <= 4447 || code >= 11904 && code <= 42191 || code >= 44032 && code <= 55203 || code >= 63744 && code <= 64255 || code >= 65072 && code <= 65103 || code >= 65280 && code <= 65376 || code >= 65504 && code <= 65510 || code >= 127744 && code <= 129791 || code >= 131072 && code <= 262141;
}
function legendTextWidth(text, fontSize) {
  const size = Math.max(1, finiteOr(fontSize, 11));
  let width = 0;
  for (const char of String(text ?? "")) {
    if (char === " " || char === "	" || char === "\xA0") {
      width += size * 0.32;
      continue;
    }
    const code = char.codePointAt(0);
    width += isWideCodePoint(code) ? size : size * 0.56;
  }
  return round2(width);
}
function normalizeMode(mode) {
  return MODES.includes(mode) ? mode : "none";
}
function normalizeItem(raw, index) {
  const item = raw && typeof raw === "object" ? raw : { name: raw };
  const name = String(item.name ?? item.label ?? "").trim();
  return {
    name: name || `\u56FE\u4F8B ${index + 1}`,
    color: typeof item.color === "string" && item.color ? item.color : "currentColor",
    active: item.active === true
  };
}
function emptyLayout(mode, overflow) {
  return {
    mode,
    entries: [],
    rows: 0,
    overflow,
    legendBox: { x: 0, y: 0, width: 0, height: 0 },
    plotInset: { top: 0, right: 0, bottom: 0, left: 0 }
  };
}
function computeLegendLayout(input) {
  const raw = input && typeof input === "object" ? input : {};
  const mode = normalizeMode(raw.mode);
  const width = Math.max(60, Math.round(finiteOr(raw.width, 640)));
  const height = Math.max(60, Math.round(finiteOr(raw.height, 320)));
  const fontSize = clampNumber(raw.fontSize, 6, 96, 11);
  const source = Array.isArray(raw.items) ? raw.items : [];
  const items = [];
  for (let i = 0; i < source.length; i += 1) {
    items.push(normalizeItem(source[i], i));
  }
  const shown = Math.min(items.length, LEGEND_MAX_ENTRIES);
  const hidden = Math.max(0, items.length - shown);
  const overflow = {
    shown,
    hidden,
    label: hidden > 0 ? `+${hidden} \u6761` : ""
  };
  if (mode === "none" || items.length === 0) return emptyLayout(mode, overflow);
  const chipHeight = round2(Math.max(DOT_SIZE + 4, fontSize * 1.5));
  const rowHeight = round2(chipHeight + ROW_GAP);
  const chips = items.slice(0, shown);
  if (hidden > 0) {
    chips.push({ name: overflow.label, color: OVERFLOW_COLOR, active: false, overflow: true });
  }
  const chipWidth = (chip) => round2(DOT_SIZE + DOT_GAP + legendTextWidth(chip.name, fontSize));
  if (mode === "right") {
    let widest = 0;
    for (const chip of chips) widest = Math.max(widest, chipWidth(chip));
    const boxWidth = round2(widest + PAD * 2);
    const boxX = round2(Math.max(0, width - boxWidth));
    const contentHeight2 = round2(chips.length * chipHeight + Math.max(0, chips.length - 1) * ROW_GAP);
    const boxHeight2 = round2(contentHeight2 + PAD);
    const boxY2 = round2(Math.max(0, (height - boxHeight2) / 2));
    const entries2 = chips.map((chip, index) => ({
      name: chip.name,
      color: chip.color,
      active: chip.active === true,
      x: round2(boxX + PAD),
      y: round2(boxY2 + PAD / 2 + index * rowHeight),
      w: chipWidth(chip),
      h: chipHeight
    }));
    return {
      mode,
      entries: entries2,
      rows: entries2.length,
      overflow,
      legendBox: { x: boxX, y: boxY2, width: boxWidth, height: boxHeight2 },
      plotInset: { top: 0, right: round2(boxWidth + LEGEND_GAP), bottom: 0, left: 0 }
    };
  }
  const placed = [];
  let x = MARGIN;
  let row = 0;
  for (const chip of chips) {
    const w = chipWidth(chip);
    if (x > MARGIN && x + w > width - MARGIN) {
      row += 1;
      x = MARGIN;
    }
    placed.push({ chip, x: round2(x), row, w });
    x = round2(x + w + CHIP_GAP);
  }
  const rows = row + 1;
  const contentHeight = round2(rows * chipHeight + Math.max(0, rows - 1) * ROW_GAP);
  const boxHeight = round2(contentHeight + PAD);
  const boxY = round2(Math.max(0, height - boxHeight));
  const entries = placed.map((entry) => ({
    name: entry.chip.name,
    color: entry.chip.color,
    active: entry.chip.active === true,
    x: entry.x,
    y: round2(boxY + PAD / 2 + entry.row * rowHeight),
    w: entry.w,
    h: chipHeight
  }));
  return {
    mode,
    entries,
    rows,
    overflow,
    legendBox: { x: 0, y: boxY, width, height: boxHeight },
    plotInset: { ...ZERO_INSET, bottom: round2(boxHeight + LEGEND_GAP) }
  };
}
var CHART_STYLE_FALLBACK = Object.freeze({
  fontStack: "",
  fontScale: 1,
  strokeScale: 1,
  palette: null,
  grid: true,
  axes: "L",
  legend: "bottom",
  legendSize: 1,
  title: "",
  barOpacity: null,
  barEdge: null,
  barTone: null,
  barGap: null,
  barRadius: null,
  barColor: null,
  pointSize: 1
});
var TONES = ["soft", "medium", "bold", "outline"];
function optionalNumber(value, lo, hi) {
  if (value === null || value === void 0 || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return round2(Math.min(hi, Math.max(lo, n)));
}
function optionalColor(value) {
  if (typeof value !== "string") return null;
  const raw = value.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(raw)) return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  return /^#[0-9a-f]{6}$/.test(raw) ? raw : null;
}
function resolveChartStyle(input) {
  const raw = input && typeof input === "object" ? input : {};
  const paletteRaw = Array.isArray(raw.palette) ? raw.palette : [];
  const palette = paletteRaw.filter((color) => typeof color === "string" && color.length > 0);
  const barEdge = typeof raw.barEdge === "boolean" ? raw.barEdge : null;
  return {
    fontStack: typeof raw.fontStack === "string" ? raw.fontStack.trim() : CHART_STYLE_FALLBACK.fontStack,
    fontScale: clampNumber(raw.fontScale, 0.5, 6, CHART_STYLE_FALLBACK.fontScale),
    strokeScale: clampNumber(raw.strokeScale, 0.3, 6, CHART_STYLE_FALLBACK.strokeScale),
    palette: palette.length > 0 ? palette.slice() : CHART_STYLE_FALLBACK.palette,
    grid: typeof raw.grid === "boolean" ? raw.grid : CHART_STYLE_FALLBACK.grid,
    axes: raw.axes === "box" ? "box" : "L",
    legend: raw.legend === "none" ? "none" : raw.legend === "right" ? "right" : "bottom",
    legendSize: clampNumber(raw.legendSize, 0.5, 2.5, CHART_STYLE_FALLBACK.legendSize),
    title: String(raw.title ?? "").slice(0, 64),
    barOpacity: optionalNumber(raw.barOpacity, 0.05, 1),
    barEdge,
    barTone: TONES.includes(raw.barTone) ? raw.barTone : CHART_STYLE_FALLBACK.barTone,
    barGap: optionalNumber(raw.barGap, 0, 40),
    barRadius: optionalNumber(raw.barRadius, 0, 40),
    barColor: optionalColor(raw.barColor),
    pointSize: clampNumber(raw.pointSize, 0.2, 3, CHART_STYLE_FALLBACK.pointSize)
  };
}

// src/client/ui/chartkit.js
var DEFAULT_SIZE = Object.freeze({ width: 640, height: 320 });
var MAX_TICK_COUNT = 64;
var DEFAULT_FALLBACK = [0, 1];
function round22(value) {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}
function clamp5(value, lo, hi) {
  const v = Number(value);
  const a = Number(lo);
  const b = Number(hi);
  if (!Number.isFinite(v)) return Number.isFinite(a) ? a : 0;
  if (!Number.isFinite(a) && !Number.isFinite(b)) return v;
  if (!Number.isFinite(a)) return Math.min(v, b);
  if (!Number.isFinite(b)) return Math.max(v, a);
  return a <= b ? Math.min(Math.max(v, a), b) : Math.min(Math.max(v, b), a);
}
function extent(values, fallback = DEFAULT_FALLBACK) {
  const fb = Array.isArray(fallback) ? fallback : DEFAULT_FALLBACK;
  const fbLo = Number(fb[0]);
  const fbHi = Number(fb[1]);
  let lo = Infinity;
  let hi = -Infinity;
  const iterable = values != null && typeof values !== "string" && typeof values[Symbol.iterator] === "function";
  if (iterable) {
    for (const item of values) {
      const v = typeof item === "number" ? item : Number(item);
      if (!Number.isFinite(v)) continue;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
  }
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    return [Number.isFinite(fbLo) ? fbLo : 0, Number.isFinite(fbHi) ? fbHi : 1];
  }
  return [lo, hi];
}
function linearScale(options = {}) {
  const domain = Array.isArray(options.domain) ? options.domain : DEFAULT_FALLBACK;
  const range = Array.isArray(options.range) ? options.range : [0, 1];
  let d0 = Number(domain[0]);
  let d1 = Number(domain[1]);
  let r0 = Number(range[0]);
  let r1 = Number(range[1]);
  if (!Number.isFinite(d0)) d0 = 0;
  if (!Number.isFinite(d1)) d1 = 1;
  if (!Number.isFinite(r0)) r0 = 0;
  if (!Number.isFinite(r1)) r1 = 1;
  if (d0 === d1) {
    d0 -= 0.5;
    d1 += 0.5;
  }
  const k = (r1 - r0) / (d1 - d0);
  const scale = (value) => {
    const v = Number(value);
    if (!Number.isFinite(v)) return NaN;
    return r0 + (v - d0) * k;
  };
  scale.domain = [d0, d1];
  scale.range = [r0, r1];
  scale.invert = (pixel) => {
    const p = Number(pixel);
    if (!Number.isFinite(p)) return NaN;
    return d0 + (p - r0) / k;
  };
  return scale;
}
function niceTicks(min, max, count = 5) {
  let lo = Number(min);
  let hi = Number(max);
  if (!Number.isFinite(lo)) lo = 0;
  if (!Number.isFinite(hi)) hi = 1;
  if (hi < lo) {
    const swap = lo;
    lo = hi;
    hi = swap;
  }
  if (!(hi > lo)) return [lo];
  const want = Math.max(1, Math.min(MAX_TICK_COUNT, Math.floor(Number(count) || 5)));
  const raw = (hi - lo) / want;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const normalized = raw / magnitude;
  const multiplier = normalized < 1.5 ? 1 : normalized < 3 ? 2 : normalized < 7 ? 5 : 10;
  let step = multiplier * magnitude;
  if (!Number.isFinite(step) || step <= 0) step = (hi - lo) / want;
  const start = Math.ceil(lo / step - 1e-9) * step;
  const ticks = [];
  for (let i = 0; i < MAX_TICK_COUNT; i += 1) {
    const value = start + i * step;
    if (value > hi + step * 1e-9) break;
    ticks.push(Number(value.toPrecision(12)));
  }
  if (ticks.length === 0) ticks.push(Number(lo.toPrecision(12)), Number(hi.toPrecision(12)));
  return ticks;
}
function fmtNum(value, sig = 4) {
  const v = typeof value === "number" ? value : Number(value);
  const digits = Math.max(1, Math.min(12, Math.floor(Number(sig)) || 4));
  if (Number.isNaN(v)) return "\u2014";
  if (!Number.isFinite(v)) return v > 0 ? "\u221E" : "\u2212\u221E";
  if (v === 0) return "0";
  const abs = Math.abs(v);
  if (abs >= 1e5 || abs < 1e-3) {
    let text2 = v.toExponential(digits - 1);
    text2 = text2.replace(/(\.\d*?)0+e/, "$1e").replace(/\.e/, "e");
    return text2.replace(/e\+?(-?)0*(\d)/, "e$1$2");
  }
  const decimals = Math.max(0, digits - 1 - Math.floor(Math.log10(abs)));
  let text = v.toFixed(Math.min(decimals, 12));
  if (text.includes(".")) text = text.replace(/0+$/, "").replace(/\.$/, "");
  return text === "-0" ? "0" : text;
}
function pathFromPoints(points) {
  if (!Array.isArray(points) || points.length === 0) return "";
  let d = "";
  for (const point of points) {
    const x = Array.isArray(point) ? Number(point[0]) : Number(point && point.x);
    const y = Array.isArray(point) ? Number(point[1]) : Number(point && point.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    d += d ? ` L ${round22(x)} ${round22(y)}` : `M ${round22(x)} ${round22(y)}`;
  }
  return d;
}
function stepPath(points, options = {}) {
  const opts = options || {};
  if (!Array.isArray(points) || points.length === 0) return "";
  const clean = [];
  for (const point of points) {
    const x = Array.isArray(point) ? Number(point[0]) : Number(point && point.x);
    const y = Array.isArray(point) ? Number(point[1]) : Number(point && point.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    clean.push([x, y]);
  }
  if (clean.length === 0) return "";
  let d = `M ${round22(clean[0][0])} ${round22(clean[0][1])}`;
  for (let i = 1; i < clean.length; i += 1) {
    const [x, y] = clean[i];
    d += ` H ${round22(x)} L ${round22(x)} ${round22(y)}`;
  }
  const toX = Number(opts.toX);
  if (Number.isFinite(toX)) {
    const last = clean[clean.length - 1];
    if (toX > last[0]) d += ` H ${round22(toX)}`;
  }
  return d;
}
function observeSize(element, onChange) {
  if (!element || typeof onChange !== "function") return () => {
  };
  const doc = element.ownerDocument;
  const win = doc && doc.defaultView || (typeof window !== "undefined" ? window : null);
  let observer = null;
  if (win && typeof win.ResizeObserver === "function") {
    try {
      observer = new win.ResizeObserver(() => onChange());
      observer.observe(element);
    } catch {
      observer = null;
    }
  }
  const onWindowResize = () => onChange();
  if (!observer && win && typeof win.addEventListener === "function") {
    win.addEventListener("resize", onWindowResize);
  }
  return () => {
    if (observer) {
      try {
        observer.disconnect();
      } catch {
      }
      return;
    }
    if (win && typeof win.removeEventListener === "function") {
      win.removeEventListener("resize", onWindowResize);
    }
  };
}
function normalizeFallbackSize(fallback) {
  if (Array.isArray(fallback)) {
    const w = Number(fallback[0]);
    const h2 = Number(fallback[1]);
    return {
      width: w > 0 && Number.isFinite(w) ? w : DEFAULT_SIZE.width,
      height: h2 > 0 && Number.isFinite(h2) ? h2 : DEFAULT_SIZE.height
    };
  }
  if (fallback && typeof fallback === "object") {
    const w = Number(fallback.width);
    const h2 = Number(fallback.height);
    return {
      width: w > 0 && Number.isFinite(w) ? w : DEFAULT_SIZE.width,
      height: h2 > 0 && Number.isFinite(h2) ? h2 : DEFAULT_SIZE.height
    };
  }
  return { width: DEFAULT_SIZE.width, height: DEFAULT_SIZE.height };
}
function makeChartSizeHook(react) {
  const useState4 = react ? react.useState : null;
  const useEffect3 = react ? react.useEffect : null;
  return function useChartSize2(ref, fallback) {
    if (typeof useState4 !== "function" || typeof useEffect3 !== "function") {
      throw new Error("[distfit] makeChartSizeHook(React) needs the React namespace with hooks");
    }
    const fb = normalizeFallbackSize(fallback);
    const [size, setSize] = useState4({ width: fb.width, height: fb.height });
    const fbWidth = fb.width;
    const fbHeight = fb.height;
    useEffect3(() => {
      const element = ref && ref.current;
      if (!element) return void 0;
      const read = () => {
        let width = 0;
        let height = 0;
        if (typeof element.getBoundingClientRect === "function") {
          const rect = element.getBoundingClientRect();
          width = Math.round(rect && rect.width || 0);
          height = Math.round(rect && rect.height || 0);
        }
        if (!(width > 0)) width = Math.round(element.clientWidth || 0);
        if (!(height > 0)) height = Math.round(element.clientHeight || 0);
        const next = width > 0 && height > 0 ? { width, height } : { width: fbWidth, height: fbHeight };
        setSize(
          (prev) => prev.width === next.width && prev.height === next.height ? prev : next
        );
      };
      read();
      return observeSize(element, read);
    }, [ref, fbWidth, fbHeight]);
    return size;
  };
}

// src/client/ui/charts.jsx
var import_jsx_runtime = require("react/jsx-runtime");
var { useMemo, useRef, useState } = React;
var useChartSize = makeChartSizeHook(React);
var LEGEND_H = 24;
var MAX_VISIBLE_CURVES = 10;
var PROB_TICKS = [0, 0.25, 0.5, 0.75, 1];
var HOVER_DOT_RADIUS = 3;
var uidSeq = 0;
function nextUid(prefix) {
  uidSeq += 1;
  return `${prefix}-${uidSeq}`;
}
function paletteAt(index) {
  if (Array.isArray(PALETTE) && PALETTE.length > 0) return PALETTE[index % PALETTE.length];
  return "currentColor";
}
function paletteColor(palette, index, explicit) {
  if (Array.isArray(palette) && palette.length > 0) return palette[index % palette.length];
  return explicit || paletteAt(index);
}
var PLAIN_CHART_STYLE = Object.freeze(resolveChartStyle(void 0));
function resolveLegendMode(requested, showLegend) {
  if (requested === "none" || requested === "html" || requested === "svg") return requested;
  return showLegend ? "html" : "none";
}
function legendFontSize(chartStyle) {
  return 11 * chartStyle.fontScale * chartStyle.legendSize;
}
function svgLegendLayout({ mode, items, width, height, chartStyle }) {
  if (mode !== "svg" || chartStyle.legend === "none") return null;
  if (!Array.isArray(items) || items.length === 0) return null;
  return computeLegendLayout({
    items,
    width,
    height,
    mode: chartStyle.legend === "right" ? "right" : "bottom",
    fontSize: legendFontSize(chartStyle)
  });
}
function titleInset(chartStyle) {
  return chartStyle.title ? Math.round(16 * chartStyle.fontScale) : 0;
}
function axisInsets(chartStyle, rightBase = 16) {
  const sc = Math.max(1, chartStyle.fontScale);
  return {
    top: Math.round(10 * sc + titleInset(chartStyle)),
    right: Math.round(rightBase * sc),
    bottom: Math.round(40 * sc),
    left: Math.round(52 * sc)
  };
}
function withLegendInsets(insets, layout) {
  if (!layout) return insets;
  const inset = layout.plotInset || {};
  return {
    top: insets.top + (inset.top || 0),
    right: insets.right + (inset.right || 0),
    bottom: insets.bottom + (inset.bottom || 0),
    left: insets.left + (inset.left || 0)
  };
}
function parseHexColor(value) {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  const short = /^#([0-9a-f]{3})$/i.exec(raw);
  if (short) {
    return short[1].split("").map((ch) => parseInt(ch + ch, 16));
  }
  const long = /^#([0-9a-f]{6})$/i.exec(raw);
  if (!long) return null;
  const int = parseInt(long[1], 16);
  return [int >> 16 & 255, int >> 8 & 255, int & 255];
}
var BAR_COLOR_ALPHA = {
  soft: { fill: 0.34, stroke: 0.55 },
  medium: { fill: 0.52, stroke: 0.7 },
  bold: { fill: 0.78, stroke: 0.85 },
  outline: { fill: 0, stroke: 0.85 }
};
function barPaint(chartStyle) {
  const paint = { strokeWidth: 1 * chartStyle.strokeScale };
  const rgb = parseHexColor(chartStyle.barColor);
  if (rgb === null) {
    if (chartStyle.barOpacity != null) paint.fillOpacity = chartStyle.barOpacity;
    if (chartStyle.barEdge === false) paint.stroke = "none";
    return paint;
  }
  const tone = ["soft", "medium", "bold", "outline"].includes(chartStyle.barTone) ? chartStyle.barTone : "soft";
  const alpha = BAR_COLOR_ALPHA[tone];
  const color = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
  const opacity = chartStyle.barOpacity != null ? chartStyle.barOpacity : 1;
  if (tone === "outline") {
    paint.fill = "#ffffff";
    paint.fillOpacity = 0.92;
  } else {
    paint.fill = color;
    paint.fillOpacity = Math.min(1, alpha.fill * opacity);
  }
  paint.stroke = color;
  paint.strokeOpacity = alpha.stroke;
  if (chartStyle.barEdge === false) paint.stroke = "none";
  return paint;
}
function barToneClass(chartStyle, hovered) {
  const tone = ["soft", "medium", "bold", "outline"].includes(chartStyle.barTone) ? chartStyle.barTone : "soft";
  return `df-bar df-bar-${tone}${hovered ? " df-bar-active" : ""}`;
}
function normalizeSize(width, height) {
  const w = Number(width);
  const h2 = Number(height);
  return [
    Number.isFinite(w) && w > 0 ? Math.round(w) : DEFAULT_SIZE.width,
    Number.isFinite(h2) && h2 > 0 ? Math.round(h2) : DEFAULT_SIZE.height
  ];
}
function positiveNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
function useChartLayout(width, height) {
  const rootRef = useRef(null);
  const measured = useChartSize(rootRef, {
    width: DEFAULT_SIZE.width,
    height: DEFAULT_SIZE.height
  });
  const explicitW = positiveNumber(width);
  const explicitH = positiveNumber(height);
  const w = explicitW || positiveNumber(measured.width) || DEFAULT_SIZE.width;
  const h2 = explicitH || positiveNumber(measured.height) || DEFAULT_SIZE.height;
  return {
    rootRef,
    width: Math.max(80, Math.round(w)),
    height: Math.max(80, Math.round(h2)),
    autoWidth: explicitW === 0
  };
}
function plotBox(width, height, options = {}) {
  const opts = options || {};
  const left = Number.isFinite(opts.left) ? opts.left : 52;
  const right = Number.isFinite(opts.right) ? opts.right : 16;
  const top = Number.isFinite(opts.top) ? opts.top : 10;
  const bottom = Number.isFinite(opts.bottom) ? opts.bottom : 36;
  const w = Math.max(8, width - left - right);
  const h2 = Math.max(8, height - top - bottom);
  return { x: left, y: top, width: w, height: h2, right: left + w, bottom: top + h2 };
}
function insidePlot(point, plot) {
  return point.x >= plot.x - 0.5 && point.x <= plot.x + plot.width + 0.5 && point.y >= plot.y - 0.5 && point.y <= plot.y + plot.height + 0.5;
}
function pointerPosition(event, width, height) {
  const element = event && event.currentTarget;
  if (!element || typeof element.getBoundingClientRect !== "function") return null;
  const rect = element.getBoundingClientRect();
  if (!rect || !(rect.width > 0) || !(rect.height > 0)) return null;
  const x = (event.clientX - rect.left) / rect.width * width;
  const y = (event.clientY - rect.top) / rect.height * height;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}
function maxFinite(values) {
  if (!Array.isArray(values)) return 0;
  let max = 0;
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max;
}
function binIndexAt(bins, xValue) {
  if (!bins.length) return -1;
  let lo = 0;
  let hi = bins.length - 1;
  while (lo <= hi) {
    const mid = lo + hi >> 1;
    const bin = bins[mid];
    if (xValue < bin.x0) hi = mid - 1;
    else if (xValue >= bin.x1) lo = mid + 1;
    else return mid;
  }
  if (lo <= 0) return 0;
  if (lo >= bins.length) return bins.length - 1;
  return lo;
}
function interpAt(xs, ys, xValue) {
  const n = Math.min(xs.length, ys.length);
  if (n === 0) return NaN;
  if (n === 1) return Number(ys[0]);
  if (!(xValue > xs[0])) return Number(ys[0]);
  if (!(xValue < xs[n - 1])) return Number(ys[n - 1]);
  let lo = 0;
  let hi = n - 1;
  while (hi - lo > 1) {
    const mid = lo + hi >> 1;
    if (Number(xs[mid]) <= xValue) lo = mid;
    else hi = mid;
  }
  const x0 = Number(xs[lo]);
  const x1 = Number(xs[hi]);
  const y0 = Number(ys[lo]);
  const y1 = Number(ys[hi]);
  if (!Number.isFinite(x0) || !Number.isFinite(x1) || x1 === x0) {
    return Number.isFinite(y1) ? y1 : y0;
  }
  return y0 + (y1 - y0) * (xValue - x0) / (x1 - x0);
}
function ecdfValueAt(points, xValue) {
  if (!points.length) return NaN;
  if (xValue < points[0].x) return 0;
  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = lo + hi + 1 >> 1;
    if (points[mid].x <= xValue) lo = mid;
    else hi = mid - 1;
  }
  return points[lo].y;
}
function normalizeBins(histogram2) {
  const source = Array.isArray(histogram2) ? histogram2 : Array.isArray(histogram2 && histogram2.bins) ? histogram2.bins : [];
  const sampleCount = Array.isArray(histogram2) ? 0 : Number(histogram2 && histogram2.n) || 0;
  const bins = [];
  for (const raw of source) {
    if (!raw) continue;
    const x0 = Number(raw.x0);
    const x1 = Number(raw.x1);
    if (!Number.isFinite(x0) || !Number.isFinite(x1) || !(x1 > x0)) continue;
    const count = Number.isFinite(Number(raw.count)) ? Number(raw.count) : 0;
    let density = Number(raw.density);
    if (!Number.isFinite(density)) {
      density = sampleCount > 0 ? count / ((x1 - x0) * sampleCount) : count / (x1 - x0);
    }
    bins.push({ x0, x1, count, density: density > 0 ? density : 0 });
  }
  bins.sort((a, b) => a.x0 - b.x0);
  return bins;
}
function normalizeEcdf(ecdf2) {
  if (!ecdf2) return [];
  if (Array.isArray(ecdf2)) {
    if (ecdf2.length === 0) return [];
    const first = ecdf2[0];
    if (!first) return [];
    if (typeof first === "object" && Array.isArray(first.x) && Array.isArray(first.y)) {
      return normalizeEcdf(first);
    }
    if (Array.isArray(first) || typeof first === "object" && "x" in first && "y" in first) {
      const points = [];
      for (const raw of ecdf2) {
        const x = Number(Array.isArray(raw) ? raw[0] : raw && raw.x);
        const y = Number(Array.isArray(raw) ? raw[1] : raw && raw.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        points.push({ x, y });
      }
      points.sort((a, b) => a.x - b.x);
      return points;
    }
    return [];
  }
  if (typeof ecdf2 === "object" && Array.isArray(ecdf2.x) && Array.isArray(ecdf2.y)) {
    const points = [];
    const n = Math.min(ecdf2.x.length, ecdf2.y.length);
    for (let i = 0; i < n; i += 1) {
      const x = Number(ecdf2.x[i]);
      const y = Number(ecdf2.y[i]);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      points.push({ x, y });
    }
    points.sort((a, b) => a.x - b.x);
    return points;
  }
  return [];
}
function normalizePairs(points, secondKey) {
  const source = Array.isArray(points) ? points : Array.isArray(points && points.points) ? points.points : [];
  const key = typeof secondKey === "string" && secondKey ? secondKey : "empirical";
  const pairs = [];
  for (const raw of source) {
    if (!raw) continue;
    const x = Number(raw.theoretical);
    let y = Number(raw[key]);
    if (!Number.isFinite(y) && key !== "empirical") y = Number(raw.empirical);
    if (!Number.isFinite(y) && key !== "sample") y = Number(raw.sample);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    pairs.push({ x, y });
  }
  return pairs;
}
function normalizeSeries(curves, valueKey, palette) {
  const source = Array.isArray(curves) ? curves : [];
  const list = [];
  for (let i = 0; i < source.length; i += 1) {
    const raw = source[i];
    if (!raw) continue;
    const xs = Array.isArray(raw.x) ? raw.x : [];
    const ys = Array.isArray(raw[valueKey]) ? raw[valueKey] : [];
    if (xs.length < 2 || ys.length < 2) continue;
    list.push({
      distId: raw.distId != null ? String(raw.distId) : `curve-${i}`,
      name: raw.name || raw.distName || (raw.distId != null ? String(raw.distId) : `\u66F2\u7EBF ${i + 1}`),
      color: paletteColor(palette, i, raw.color),
      active: raw.active === true,
      x: xs,
      y: ys
    });
  }
  const active = list.filter((series) => series.active);
  const muted = list.filter((series) => !series.active);
  if (list.length <= MAX_VISIBLE_CURVES) return [...muted, ...active];
  const room = Math.max(0, MAX_VISIBLE_CURVES - active.length);
  return [...muted.slice(0, room), ...active].slice(-MAX_VISIBLE_CURVES);
}
function useSeries(curves, valueKey, palette) {
  return useMemo(() => normalizeSeries(curves, valueKey, palette), [curves, valueKey, palette]);
}
function legendItemsOf(series) {
  return series.map((item) => ({
    distId: item.distId,
    name: item.name,
    color: item.color,
    active: item.active
  }));
}
function tooltipSeriesOf(series, max = 4) {
  const active = series.filter((item) => item.active);
  if (active.length > 0) return active.slice(0, max);
  return series.slice(0, max);
}
function tickLabel(value) {
  return fmtNum(value, 4);
}
function Axes({
  plot,
  xScale,
  yScale,
  xTicks,
  yTicks,
  xTickFormat,
  yTickFormat,
  xLabel,
  yLabel,
  chartStyle = PLAIN_CHART_STYLE
}) {
  const xFormat = typeof xTickFormat === "function" ? xTickFormat : tickLabel;
  const yFormat = typeof yTickFormat === "function" ? yTickFormat : tickLabel;
  const baseY = plot.y + plot.height;
  const tickStyle = { fontSize: 11 * chartStyle.fontScale };
  const strokeStyle = { strokeWidth: 1 * chartStyle.strokeScale };
  const sc = Math.max(1, chartStyle.fontScale);
  const boxed = chartStyle.axes === "box";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { className: "df-axes", children: [
    chartStyle.grid ? yTicks.map((value, index) => {
      const y = yScale(value);
      if (!Number.isFinite(y)) return null;
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "line",
        {
          className: "df-gridline",
          x1: plot.x,
          y1: y,
          x2: plot.x + plot.width,
          y2: y,
          style: strokeStyle
        },
        `ygrid-${index}`
      );
    }) : null,
    yTicks.map((value, index) => {
      const y = yScale(value);
      if (!Number.isFinite(y)) return null;
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "text",
        {
          className: "df-axis",
          x: plot.x - 8 * sc,
          y,
          textAnchor: "end",
          dominantBaseline: "middle",
          style: tickStyle,
          children: yFormat(value)
        },
        `y-${index}`
      );
    }),
    xTicks.map((value, index) => {
      const x = xScale(value);
      if (!Number.isFinite(x)) return null;
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "line",
          {
            className: "df-axisline",
            x1: x,
            y1: baseY,
            x2: x,
            y2: baseY + 4 * sc,
            style: strokeStyle
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", { className: "df-axis", x, y: baseY + 16 * sc, textAnchor: "middle", style: tickStyle, children: xFormat(value) })
      ] }, `x-${index}`);
    }),
    boxed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "rect",
      {
        className: "df-axisline df-axes-frame",
        x: plot.x,
        y: plot.y,
        width: plot.width,
        height: plot.height,
        fill: "none",
        style: strokeStyle
      }
    ) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "line",
        {
          className: "df-axisline",
          x1: plot.x,
          y1: baseY,
          x2: plot.x + plot.width,
          y2: baseY,
          style: strokeStyle
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "line",
        {
          className: "df-axisline",
          x1: plot.x,
          y1: plot.y,
          x2: plot.x,
          y2: baseY,
          style: strokeStyle
        }
      )
    ] }),
    xLabel ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "text",
      {
        className: "df-axis-title",
        x: plot.x + plot.width / 2,
        y: baseY + 32 * sc,
        textAnchor: "middle",
        style: tickStyle,
        children: xLabel
      }
    ) : null,
    yLabel ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "text",
      {
        className: "df-axis-title",
        transform: `translate(${13 * sc} ${plot.y + plot.height / 2}) rotate(-90)`,
        textAnchor: "middle",
        style: tickStyle,
        children: yLabel
      }
    ) : null
  ] });
}
function Legend({ items, chartStyle = PLAIN_CHART_STYLE }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const fontSize = 11.5 * chartStyle.fontScale * chartStyle.legendSize;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "div",
    {
      className: "df-chart-legend",
      style: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height: LEGEND_H,
        display: "flex",
        alignItems: "center",
        flexWrap: "nowrap",
        columnGap: 12,
        overflow: "hidden"
      },
      children: items.map((item, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "span",
        {
          className: item.active ? "df-chart-legend-chip df-chart-legend-chip-active" : "df-chart-legend-chip df-chart-legend-chip-inactive",
          title: item.name,
          "data-dist-id": item.distId || void 0,
          style: {
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            flex: "0 0 auto",
            minWidth: 0,
            maxWidth: 190,
            overflow: "hidden"
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "span",
              {
                className: "df-chart-legend-dot",
                style: {
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: item.color,
                  flex: "0 0 auto"
                }
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "span",
              {
                className: "df-chart-legend-name",
                style: {
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  minWidth: 0,
                  fontSize,
                  color: item.active ? "var(--df-fg)" : "var(--df-fg-2)"
                },
                children: item.name
              }
            )
          ]
        },
        `${item.distId || item.name}-${index}`
      ))
    }
  );
}
function SvgLegend({ layout, chartStyle = PLAIN_CHART_STYLE }) {
  if (!layout || !Array.isArray(layout.entries) || layout.entries.length === 0) return null;
  const fontSize = legendFontSize(chartStyle);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("g", { className: "df-chart-legend-svg", children: layout.entries.map((entry, index) => {
    const cy = entry.y + entry.h / 2;
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "circle",
        {
          className: "df-legend-dot",
          cx: entry.x + 4,
          cy,
          r: 4,
          fill: entry.color,
          style: { fill: entry.color }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "text",
        {
          className: "df-axis df-chart-legend-text",
          x: entry.x + 10,
          y: cy + fontSize * 0.35,
          textAnchor: "start",
          style: { fontSize, fill: entry.active ? "var(--df-fg)" : "var(--df-fg-2)" },
          children: entry.name
        }
      )
    ] }, `${entry.name}-${index}`);
  }) });
}
function SvgTitle({ width, chartStyle = PLAIN_CHART_STYLE }) {
  if (!chartStyle.title) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "text",
    {
      className: "df-axis-title df-chart-svg-title",
      x: width / 2,
      y: 11 * chartStyle.fontScale + 3,
      textAnchor: "middle",
      style: { fontSize: 12 * chartStyle.fontScale, fontWeight: 700, fill: "var(--df-fg)" },
      children: chartStyle.title
    }
  );
}
function Tooltip({ x, y, width, height, offsetY = 0, title, rows }) {
  const list = Array.isArray(rows) ? rows : [];
  if (list.length === 0 && !title) return null;
  const flip = x > width * 0.62;
  const left = clamp5(x, 6, Math.max(6, width - 6));
  const top = clamp5(y + offsetY, offsetY + 26, Math.max(offsetY + 26, height - 10));
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      className: "df-tooltip",
      style: {
        position: "absolute",
        left,
        top,
        zIndex: 3,
        pointerEvents: "none",
        transform: flip ? "translate(calc(-100% - 10px), -50%)" : "translate(10px, -50%)"
      },
      children: [
        title ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "div",
          {
            className: "df-tooltip-title",
            style: { fontSize: 11, lineHeight: 1.4, marginBottom: 2, color: "var(--df-fg-2)" },
            children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { style: { color: "var(--df-fg)" }, children: title })
          }
        ) : null,
        list.map((row, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "div",
          {
            className: "df-tooltip-row",
            style: { display: "flex", alignItems: "center", gap: 6 },
            children: [
              row.color ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "span",
                {
                  className: "df-tooltip-dot",
                  style: {
                    display: "inline-block",
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: row.color,
                    flex: "0 0 auto"
                  }
                }
              ) : null,
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "df-tooltip-key", children: row.key }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("b", { className: "df-tooltip-value", style: { marginLeft: "auto" }, children: row.value })
            ]
          },
          `${row.key}-${index}`
        ))
      ]
    }
  );
}
function ChartBody({
  width,
  height,
  title,
  desc,
  legend,
  tooltip,
  onPointerMove,
  onPointerLeave,
  rootRef,
  autoWidth,
  chartStyle = PLAIN_CHART_STYLE,
  children
}) {
  const [w, h2] = normalizeSize(width, height);
  const legendHeight = legend ? LEGEND_H : 0;
  const svgHeight = Math.max(60, h2 - legendHeight);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      className: "df-plot",
      ref: rootRef,
      style: { position: "relative", width: autoWidth ? "100%" : w, height: h2 },
      children: [
        legend,
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "svg",
          {
            className: "df-chart-svg",
            width: w,
            height: svgHeight,
            viewBox: `0 0 ${w} ${svgHeight}`,
            role: "img",
            "aria-label": title,
            style: {
              display: "block",
              position: "absolute",
              left: 0,
              top: legendHeight,
              fontFamily: chartStyle.fontStack || void 0
            },
            onPointerMove,
            onPointerLeave,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("title", { children: title }),
              desc ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("desc", { children: desc }) : null,
              typeof children === "function" ? children(w, svgHeight) : children
            ]
          }
        ),
        tooltip
      ]
    }
  );
}
function EmptyState({ width, height, text, rootRef, autoWidth }) {
  const [w, h2] = normalizeSize(width, height);
  const message = text || "\u6682\u65E0\u6570\u636E";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "div",
    {
      className: "df-plot",
      ref: rootRef,
      style: { position: "relative", width: autoWidth ? "100%" : w, height: h2 },
      role: "img",
      "aria-label": message,
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "div",
        {
          className: "df-chart-empty",
          style: {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            minHeight: 80,
            padding: "0 18px",
            textAlign: "center",
            color: "var(--df-fg-2)",
            fontSize: 12,
            lineHeight: 1.6
          },
          children: message
        }
      )
    }
  );
}
function HistFitChart({
  histogram: histogram2,
  curves,
  xLabel,
  yLabel,
  width,
  height,
  title,
  showLegend = false,
  style,
  legendMode
}) {
  const bins = useMemo(() => normalizeBins(histogram2), [histogram2]);
  const chartStyle = resolveChartStyle(style);
  const series = useSeries(curves, "pdf", chartStyle.palette);
  const [hover, setHover] = useState(null);
  const [clipId] = useState(() => nextUid("df-hist-clip"));
  const { rootRef, width: w, height: h2, autoWidth } = useChartLayout(width, height);
  const mode = resolveLegendMode(legendMode, showLegend);
  const legendItems = series.length ? legendItemsOf(series) : [];
  const legend = mode === "html" && chartStyle.legend !== "none" && legendItems.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Legend, { items: legendItems, chartStyle }) : null;
  const legendHeight = legend ? LEGEND_H : 0;
  const svgHeight = Math.max(60, h2 - legendHeight);
  const svgLegend = svgLegendLayout({ mode, items: legendItems, width: w, height: svgHeight, chartStyle });
  if (bins.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      EmptyState,
      {
        width: w,
        height: h2,
        rootRef,
        autoWidth,
        text: "\u6682\u65E0\u76F4\u65B9\u56FE\u6570\u636E\uFF1A\u89E3\u6790\u6570\u636E\u5E76\u5B8C\u6210\u62DF\u5408\u540E\u4F1A\u663E\u793A\u5206\u5E03\u76F4\u65B9\u56FE\u4E0E\u6982\u7387\u5BC6\u5EA6\u66F2\u7EBF\u3002"
      }
    );
  }
  let xLo = bins[0].x0;
  let xHi = bins[bins.length - 1].x1;
  for (const item of series) {
    const bounds = extent(item.x);
    if (Number.isFinite(bounds[0])) xLo = Math.min(xLo, bounds[0]);
    if (Number.isFinite(bounds[1])) xHi = Math.max(xHi, bounds[1]);
  }
  if (!(xHi > xLo)) {
    xLo -= 0.5;
    xHi += 0.5;
  }
  const xPadding = (xHi - xLo) * 0.015;
  const xDomain = [xLo - xPadding, xHi + xPadding];
  let maxBarDensity = 0;
  for (const bin of bins) if (bin.density > maxBarDensity) maxBarDensity = bin.density;
  let maxCurvePdf = 0;
  for (const item of series) maxCurvePdf = Math.max(maxCurvePdf, maxFinite(item.y));
  const base = maxBarDensity > 0 ? maxBarDensity : maxCurvePdf > 0 ? maxCurvePdf : 1;
  const cappedCurve = maxCurvePdf > 0 ? Math.min(maxCurvePdf, base * 1.9) : base;
  const yMax = Math.max(base * 1.06, cappedCurve * 1.04, 1e-9);
  const yDomain = [0, yMax];
  const plot = plotBox(
    w,
    svgHeight,
    withLegendInsets(
      axisInsets(chartStyle),
      svgLegend
    )
  );
  const xScale = linearScale({ domain: xDomain, range: [plot.x, plot.x + plot.width] });
  const yScale = linearScale({ domain: yDomain, range: [plot.y + plot.height, plot.y] });
  const xTicks = niceTicks(xDomain[0], xDomain[1], clamp5(Math.round(plot.width / (78 * Math.max(1, chartStyle.fontScale))), 3, 7));
  const yTicks = niceTicks(0, yMax, clamp5(Math.round(plot.height / (46 * Math.max(1, chartStyle.fontScale))), 3, 6));
  const focusCurve = series.find((item) => item.active) || series[0] || null;
  const hoveredIndex = hover ? hover.bin : -1;
  const hoveredBin = hoveredIndex >= 0 && hoveredIndex < bins.length ? bins[hoveredIndex] : null;
  const handlePointerMove = (event) => {
    const point = pointerPosition(event, w, svgHeight);
    if (!point || !insidePlot(point, plot)) {
      setHover(null);
      return;
    }
    const xValue = xScale.invert(point.x);
    setHover({
      px: clamp5(point.x, plot.x, plot.x + plot.width),
      py: clamp5(point.y, plot.y, plot.y + plot.height),
      xValue,
      bin: binIndexAt(bins, xValue)
    });
  };
  const handlePointerLeave = () => setHover(null);
  const rows = [];
  if (hoveredBin) {
    rows.push({ key: "\u9891\u6570", value: fmtNum(hoveredBin.count, 4) });
    rows.push({ key: "\u5BC6\u5EA6", value: fmtNum(hoveredBin.density, 4) });
    if (focusCurve) {
      rows.push({
        key: `${focusCurve.name}\xB7pdf`,
        value: fmtNum(interpAt(focusCurve.x, focusCurve.y, hover.xValue), 4),
        color: focusCurve.color
      });
    }
  }
  const tooltip = hover ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    Tooltip,
    {
      x: hover.px,
      y: hover.py,
      width: w,
      height: h2,
      offsetY: legendHeight,
      title: hoveredBin ? `${fmtNum(hoveredBin.x0, 4)} ~ ${fmtNum(hoveredBin.x1, 4)}` : "",
      rows
    }
  ) : null;
  const anyActive = series.some((item) => item.active);
  const svgTitle = title || `\u76F4\u65B9\u56FE\u4E0E\u62DF\u5408\u6982\u7387\u5BC6\u5EA6\uFF08${bins.length} \u4E2A\u533A\u95F4\uFF09`;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ChartBody,
    {
      width: w,
      height: h2,
      rootRef,
      autoWidth,
      title: svgTitle,
      legend,
      tooltip,
      chartStyle,
      onPointerMove: handlePointerMove,
      onPointerLeave: handlePointerLeave,
      children: () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("clipPath", { id: clipId, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: plot.x, y: plot.y, width: plot.width, height: plot.height }) }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SvgTitle, { width: w, chartStyle }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Axes,
          {
            plot,
            xScale,
            yScale,
            xTicks,
            yTicks,
            xLabel,
            yLabel: yLabel === void 0 ? "\u6982\u7387\u5BC6\u5EA6" : yLabel,
            chartStyle
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { clipPath: `url(#${clipId})`, children: [
          bins.map((bin, index) => {
            const x0 = xScale(bin.x0);
            const x1 = xScale(bin.x1);
            const y = yScale(bin.density);
            const zero = yScale(0);
            if (!Number.isFinite(x0) || !Number.isFinite(y) || !Number.isFinite(zero)) {
              return null;
            }
            const barWidth = Math.max(1, x1 - x0 - chartStyle.barGap);
            const barHeight = Math.max(0, zero - y);
            return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "rect",
              {
                className: barToneClass(chartStyle, index === hoveredIndex),
                x: x0 + chartStyle.barGap / 2,
                y,
                width: barWidth,
                height: barHeight,
                rx: Math.min(chartStyle.barRadius, barWidth / 2, barHeight / 2),
                style: barPaint(chartStyle)
              },
              `bin-${index}`
            );
          }),
          series.map((item, index) => {
            const points = [];
            const n = Math.min(item.x.length, item.y.length);
            for (let i = 0; i < n; i += 1) {
              const px = xScale(item.x[i]);
              const py = yScale(item.y[i]);
              if (Number.isFinite(px) && Number.isFinite(py)) points.push([px, py]);
            }
            const d = pathFromPoints(points);
            if (!d) return null;
            const isActive = item.active;
            const strokeWidth = isActive ? 2.6 : anyActive ? 1.6 : 1.8;
            const opacity = isActive ? 1 : anyActive ? 0.35 : 0.9;
            return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "path",
              {
                className: isActive ? "df-curve df-curve-active" : "df-curve",
                d,
                fill: "none",
                stroke: item.color,
                strokeWidth: strokeWidth * chartStyle.strokeScale,
                strokeLinecap: "round",
                strokeLinejoin: "round",
                opacity
              },
              `curve-${item.distId}-${index}`
            );
          })
        ] }),
        hover ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "line",
          {
            className: "df-crosshair",
            x1: hover.px,
            x2: hover.px,
            y1: plot.y,
            y2: plot.y + plot.height,
            style: { strokeWidth: 1 * chartStyle.strokeScale }
          }
        ) : null,
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SvgLegend, { layout: svgLegend, chartStyle })
      ] })
    }
  );
}
function CdfChart({
  ecdf: ecdf2,
  curves,
  xLabel,
  yLabel,
  width,
  height,
  title,
  showLegend = false,
  style,
  legendMode
}) {
  const points = useMemo(() => normalizeEcdf(ecdf2), [ecdf2]);
  const chartStyle = resolveChartStyle(style);
  const series = useSeries(curves, "cdf", chartStyle.palette);
  const [hover, setHover] = useState(null);
  const [clipId] = useState(() => nextUid("df-cdf-clip"));
  const { rootRef, width: w, height: h2, autoWidth } = useChartLayout(width, height);
  const mode = resolveLegendMode(legendMode, showLegend);
  const legendItems = series.length ? legendItemsOf(series) : [];
  const legend = mode === "html" && chartStyle.legend !== "none" && legendItems.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Legend, { items: legendItems, chartStyle }) : null;
  const legendHeight = legend ? LEGEND_H : 0;
  const svgHeight = Math.max(60, h2 - legendHeight);
  const svgLegend = svgLegendLayout({ mode, items: legendItems, width: w, height: svgHeight, chartStyle });
  if (points.length === 0 && series.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      EmptyState,
      {
        width: w,
        height: h2,
        rootRef,
        autoWidth,
        text: "\u6682\u65E0\u7D2F\u79EF\u5206\u5E03\u6570\u636E\uFF1A\u5B8C\u6210\u62DF\u5408\u540E\u4F1A\u663E\u793A\u7ECF\u9A8C\u5206\u5E03\u4E0E\u7406\u8BBA\u5206\u5E03\u51FD\u6570\u3002"
      }
    );
  }
  let xLo = points.length ? points[0].x : Infinity;
  let xHi = points.length ? points[points.length - 1].x : -Infinity;
  for (const item of series) {
    const bounds = extent(item.x);
    if (Number.isFinite(bounds[0])) xLo = Math.min(xLo, bounds[0]);
    if (Number.isFinite(bounds[1])) xHi = Math.max(xHi, bounds[1]);
  }
  if (!Number.isFinite(xLo) || !Number.isFinite(xHi)) {
    xLo = 0;
    xHi = 1;
  }
  if (!(xHi > xLo)) {
    xLo -= 0.5;
    xHi += 0.5;
  }
  const xPadding = (xHi - xLo) * 0.015;
  const xDomain = [xLo - xPadding, xHi + xPadding];
  const yDomain = [0, 1];
  const plot = plotBox(
    w,
    svgHeight,
    withLegendInsets(
      axisInsets(chartStyle),
      svgLegend
    )
  );
  const xScale = linearScale({ domain: xDomain, range: [plot.x, plot.x + plot.width] });
  const yScale = linearScale({ domain: yDomain, range: [plot.y + plot.height, plot.y] });
  const xTicks = niceTicks(xDomain[0], xDomain[1], clamp5(Math.round(plot.width / (78 * Math.max(1, chartStyle.fontScale))), 3, 7));
  const stepPoints = [[xScale(xDomain[0]), yScale(0)]];
  for (const point of points) {
    const px = xScale(point.x);
    const py = yScale(point.y);
    if (Number.isFinite(px) && Number.isFinite(py)) stepPoints.push([px, py]);
  }
  const empiricalPath = stepPath(stepPoints, { toX: plot.x + plot.width });
  const empiricalValue = hover ? ecdfValueAt(points, hover.xValue) : NaN;
  const focusPoints = tooltipSeriesOf(series, 4);
  const handlePointerMove = (event) => {
    const point = pointerPosition(event, w, svgHeight);
    if (!point || !insidePlot(point, plot)) {
      setHover(null);
      return;
    }
    setHover({
      px: clamp5(point.x, plot.x, plot.x + plot.width),
      py: clamp5(point.y, plot.y, plot.y + plot.height),
      xValue: xScale.invert(point.x)
    });
  };
  const handlePointerLeave = () => setHover(null);
  const rows = [];
  if (hover) {
    if (points.length > 0) rows.push({ key: "\u7ECF\u9A8C F\u0302", value: fmtNum(empiricalValue, 4) });
    for (const item of focusPoints) {
      rows.push({
        key: item.name,
        value: fmtNum(interpAt(item.x, item.y, hover.xValue), 4),
        color: item.color
      });
    }
  }
  const tooltip = hover ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    Tooltip,
    {
      x: hover.px,
      y: hover.py,
      width: w,
      height: h2,
      offsetY: legendHeight,
      title: `x = ${fmtNum(hover.xValue, 4)}`,
      rows
    }
  ) : null;
  const anyActive = series.some((item) => item.active);
  const svgTitle = title || "\u7ECF\u9A8C\u5206\u5E03\u51FD\u6570\u4E0E\u7406\u8BBA\u5206\u5E03\u51FD\u6570";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ChartBody,
    {
      width: w,
      height: h2,
      rootRef,
      autoWidth,
      title: svgTitle,
      legend,
      tooltip,
      chartStyle,
      onPointerMove: handlePointerMove,
      onPointerLeave: handlePointerLeave,
      children: () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("clipPath", { id: clipId, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: plot.x, y: plot.y, width: plot.width, height: plot.height }) }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SvgTitle, { width: w, chartStyle }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Axes,
          {
            plot,
            xScale,
            yScale,
            xTicks,
            yTicks: PROB_TICKS,
            xLabel,
            yLabel: yLabel === void 0 ? "F(x)" : yLabel,
            chartStyle
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { clipPath: `url(#${clipId})`, children: [
          points.length > 0 && empiricalPath ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "path",
            {
              className: "df-cdf-emp",
              d: empiricalPath,
              fill: "none",
              stroke: "currentColor",
              style: { strokeWidth: 1.6 * chartStyle.strokeScale },
              strokeLinejoin: "round",
              opacity: 0.85
            }
          ) : null,
          series.map((item, index) => {
            const curvePoints = [];
            const n = Math.min(item.x.length, item.y.length);
            for (let i = 0; i < n; i += 1) {
              const px = xScale(item.x[i]);
              const py = yScale(item.y[i]);
              if (Number.isFinite(px) && Number.isFinite(py)) curvePoints.push([px, py]);
            }
            const d = pathFromPoints(curvePoints);
            if (!d) return null;
            const isActive = item.active;
            const strokeWidth = isActive ? 2.6 : anyActive ? 1.6 : 1.8;
            const opacity = isActive ? 1 : anyActive ? 0.35 : 0.9;
            return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "path",
              {
                className: isActive ? "df-curve df-curve-active" : "df-curve",
                d,
                fill: "none",
                stroke: item.color,
                strokeWidth: strokeWidth * chartStyle.strokeScale,
                strokeLinecap: "round",
                strokeLinejoin: "round",
                opacity
              },
              `cdf-${item.distId}-${index}`
            );
          })
        ] }),
        hover ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "line",
            {
              className: "df-crosshair",
              x1: hover.px,
              x2: hover.px,
              y1: plot.y,
              y2: plot.y + plot.height,
              style: { strokeWidth: 1 * chartStyle.strokeScale }
            }
          ),
          points.length > 0 && Number.isFinite(empiricalValue) ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "circle",
            {
              className: "df-focus-dot",
              cx: hover.px,
              cy: yScale(empiricalValue),
              r: HOVER_DOT_RADIUS
            }
          ) : null
        ] }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SvgLegend, { layout: svgLegend, chartStyle })
      ] })
    }
  );
}
function ProbPlot({
  pairs,
  distName,
  color,
  xLabel,
  yLabel,
  width,
  height,
  title,
  unitSquare,
  emptyText,
  showLegend,
  style,
  legendMode
}) {
  const [hover, setHover] = useState(null);
  const chartStyle = resolveChartStyle(style);
  const { rootRef, width: w, height: h2, autoWidth } = useChartLayout(width, height);
  const pointColor = paletteColor(chartStyle.palette, 0, color);
  const mode = resolveLegendMode(legendMode, showLegend);
  const legendItems = distName ? [{ distId: "", name: distName, color: pointColor, active: true }] : [];
  const legend = mode === "html" && chartStyle.legend !== "none" && legendItems.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Legend, { items: legendItems, chartStyle }) : null;
  const legendHeight = legend ? LEGEND_H : 0;
  const svgHeight = Math.max(60, h2 - legendHeight);
  const svgLegend = svgLegendLayout({ mode, items: legendItems, width: w, height: svgHeight, chartStyle });
  if (pairs.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EmptyState, { width: w, height: h2, rootRef, autoWidth, text: emptyText || "\u6682\u65E0\u6982\u7387\u56FE\u6570\u636E" });
  }
  let lo = Infinity;
  let hi = -Infinity;
  for (const pair of pairs) {
    if (pair.x < lo) lo = pair.x;
    if (pair.x > hi) hi = pair.x;
    if (pair.y < lo) lo = pair.y;
    if (pair.y > hi) hi = pair.y;
  }
  if (unitSquare) {
    lo = Math.min(0, lo);
    hi = Math.max(1, hi);
  }
  if (!(hi > lo)) {
    lo -= 0.5;
    hi += 0.5;
  }
  const padding = unitSquare ? 0 : (hi - lo) * 0.04;
  const domain = [lo - padding, hi + padding];
  const rawPlot = plotBox(
    w,
    svgHeight,
    withLegendInsets(
      axisInsets(chartStyle, 18),
      svgLegend
    )
  );
  const side = Math.max(8, Math.floor(Math.min(rawPlot.width, rawPlot.height)));
  const plotX = rawPlot.x + Math.floor((rawPlot.width - side) / 2);
  const plotY = rawPlot.y + Math.floor((rawPlot.height - side) / 2);
  const plot = {
    x: plotX,
    y: plotY,
    width: side,
    height: side,
    right: plotX + side,
    bottom: plotY + side
  };
  const xScale = linearScale({ domain, range: [plot.x, plot.x + plot.width] });
  const yScale = linearScale({ domain, range: [plot.y + plot.height, plot.y] });
  const xTicks = unitSquare ? PROB_TICKS : niceTicks(domain[0], domain[1], clamp5(Math.round(plot.width / (78 * Math.max(1, chartStyle.fontScale))), 3, 7));
  const yTicks = unitSquare ? PROB_TICKS : niceTicks(domain[0], domain[1], clamp5(Math.round(plot.height / (46 * Math.max(1, chartStyle.fontScale))), 3, 6));
  const hoverPair = hover ? pairs[hover.index] : null;
  const handlePointerMove = (event) => {
    const point = pointerPosition(event, w, svgHeight);
    if (!point || !insidePlot(point, plot)) {
      setHover(null);
      return;
    }
    let best = -1;
    let bestDistance = 18;
    for (let i = 0; i < pairs.length; i += 1) {
      const dx = xScale(pairs[i].x) - point.x;
      const dy = yScale(pairs[i].y) - point.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= bestDistance) {
        best = i;
        bestDistance = distance;
      }
    }
    if (best < 0) {
      setHover(null);
      return;
    }
    setHover({
      index: best,
      px: xScale(pairs[best].x),
      py: yScale(pairs[best].y)
    });
  };
  const handlePointerLeave = () => setHover(null);
  const rows = hoverPair ? [
    { key: xLabel, value: fmtNum(hoverPair.x, 4) },
    { key: yLabel, value: fmtNum(hoverPair.y, 4) }
  ] : [];
  const tooltip = hover ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    Tooltip,
    {
      x: hover.px,
      y: hover.py,
      width: w,
      height: h2,
      offsetY: legendHeight,
      title: distName || "",
      rows
    }
  ) : null;
  const svgTitle = title || `${distName || "\u5206\u5E03"}\u6982\u7387\u56FE\uFF08${pairs.length} \u4E2A\u70B9\uFF09`;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ChartBody,
    {
      width: w,
      height: h2,
      rootRef,
      autoWidth,
      title: svgTitle,
      legend,
      tooltip,
      chartStyle,
      onPointerMove: handlePointerMove,
      onPointerLeave: handlePointerLeave,
      children: () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SvgTitle, { width: w, chartStyle }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          Axes,
          {
            plot,
            xScale,
            yScale,
            xTicks,
            yTicks,
            xLabel,
            yLabel,
            chartStyle
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "line",
          {
            className: "df-ref-line",
            x1: xScale(domain[0]),
            y1: yScale(domain[0]),
            x2: xScale(domain[1]),
            y2: yScale(domain[1]),
            style: { strokeWidth: 1.2 * chartStyle.strokeScale }
          }
        ),
        pairs.map((pair, index) => {
          const active = hover && hover.index === index;
          const radius = (active ? 4 : 2.2) * chartStyle.pointSize;
          return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "circle",
            {
              className: active ? "df-point df-point-active" : "df-point",
              cx: xScale(pair.x),
              cy: yScale(pair.y),
              r: radius,
              style: { r: `${radius}px` },
              fill: pointColor,
              opacity: active ? 1 : 0.75
            },
            `point-${index}`
          );
        }),
        hover ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "circle",
          {
            className: "df-focus-dot",
            cx: hover.px,
            cy: hover.py,
            r: HOVER_DOT_RADIUS,
            opacity: 0.55
          }
        ) : null,
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SvgLegend, { layout: svgLegend, chartStyle })
      ] })
    }
  );
}
function PpChart({
  points,
  distName,
  color,
  width,
  height,
  xLabel,
  yLabel,
  title,
  showLegend = false,
  style,
  legendMode
}) {
  const pairs = useMemo(() => normalizePairs(points, "empirical"), [points]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ProbPlot,
    {
      pairs,
      distName,
      color,
      width,
      height,
      title,
      showLegend,
      style,
      legendMode,
      unitSquare: true,
      xLabel: xLabel === void 0 ? "\u7406\u8BBA\u7D2F\u79EF\u6982\u7387" : xLabel,
      yLabel: yLabel === void 0 ? "\u7ECF\u9A8C\u7D2F\u79EF\u6982\u7387" : yLabel,
      emptyText: "\u6682\u65E0 P-P \u56FE\u6570\u636E\uFF1A\u5B8C\u6210\u62DF\u5408\u540E\u4F1A\u663E\u793A\u7406\u8BBA\u6982\u7387\u4E0E\u7ECF\u9A8C\u6982\u7387\u7684\u5BF9\u5E94\u70B9\u3002"
    }
  );
}
function QqChart({
  points,
  distName,
  color,
  width,
  height,
  xLabel,
  yLabel,
  title,
  showLegend = false,
  style,
  legendMode
}) {
  const pairs = useMemo(() => normalizePairs(points, "sample"), [points]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ProbPlot,
    {
      pairs,
      distName,
      color,
      width,
      height,
      title,
      showLegend,
      style,
      legendMode,
      xLabel: xLabel === void 0 ? "\u7406\u8BBA\u5206\u4F4D\u6570" : xLabel,
      yLabel: yLabel === void 0 ? "\u6837\u672C\u5206\u4F4D\u6570" : yLabel,
      emptyText: "\u6682\u65E0 Q-Q \u56FE\u6570\u636E\uFF1A\u5B8C\u6210\u62DF\u5408\u540E\u4F1A\u663E\u793A\u7406\u8BBA\u5206\u4F4D\u6570\u4E0E\u6837\u672C\u5206\u4F4D\u6570\u7684\u5BF9\u5E94\u70B9\u3002"
    }
  );
}

// src/client/ui/aiSummary.js
var TOP_PER_DATASET = 6;
var MAX_BINS = 14;
var SMALL_SAMPLE = 15;
var QUANTILE_LEVELS = [0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99];
var finite = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};
var round = (value, digits = 4) => {
  const n = finite(value);
  if (n === null) return null;
  return Number(n.toPrecision(digits));
};
var compactStats = (stats) => {
  if (!stats) return null;
  return {
    mean: round(stats.mean),
    sd: round(stats.sd),
    cv: round(stats.cv),
    skew: round(stats.skew),
    kurt: round(stats.kurt),
    min: round(stats.min),
    max: round(stats.max)
  };
};
function empiricalQuantiles(values, levels) {
  const xs = (values ?? []).filter((v) => Number.isFinite(v)).slice().sort((a, b) => a - b);
  const n = xs.length;
  if (!n) return null;
  const at = (level) => {
    const position = (n - 1) * level;
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    if (lower === upper) return xs[lower];
    return xs[lower] + (xs[upper] - xs[lower]) * (position - lower);
  };
  const out = {};
  for (const level of levels) out[`p${Math.round(level * 100)}`] = round(at(level), 5);
  return out;
}
function ppDeviation(points) {
  const usable = (points ?? []).filter(
    (p) => Number.isFinite(p?.theoretical) && Number.isFinite(p?.empirical)
  );
  if (!usable.length) return null;
  let max = 0;
  let at = 0;
  let lowerTail = 0;
  let upperTail = 0;
  for (const p of usable) {
    const dev = Math.abs(p.theoretical - p.empirical);
    if (dev > max) {
      max = dev;
      at = p.theoretical;
    }
    if (p.theoretical < 0.1) lowerTail = Math.max(lowerTail, dev);
    if (p.theoretical > 0.9) upperTail = Math.max(upperTail, dev);
  }
  return {
    maxDev: round(max, 3),
    atQuantile: round(at, 3),
    lowerTailDev: round(lowerTail, 3),
    upperTailDev: round(upperTail, 3)
  };
}
function compactHistogram(bins) {
  return (bins ?? []).slice(0, MAX_BINS).map((bin) => ({
    lo: round(bin?.x0, 4),
    hi: round(bin?.x1, 4),
    n: finite(bin?.count)
  }));
}
function familyOf(distId) {
  const dist = getDist(distId);
  if (!dist) return null;
  return { group: dist.group, support: dist.support, k: dist.k };
}
var truncateText = (value, limit) => {
  const text = String(value ?? "");
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}\u2026`;
};
function buildAiSummary(result, columns, chosen, alpha) {
  if (!result || !Array.isArray(result.rows) || !result.rows.length) return null;
  const names = (columns ?? []).map((c) => typeof c === "string" ? c : c.name).filter(Boolean);
  const datasets = [];
  const ranking = [];
  for (const name of names) {
    const dataset = (result.datasets ?? []).find((entry) => entry.name === name);
    const n = finite(dataset?.n) ?? 0;
    if (!n) continue;
    const column = (columns ?? []).find((c) => (typeof c === "string" ? c : c.name) === name);
    const values = typeof column === "object" ? column?.values : void 0;
    const histogram2 = (result.histograms ?? []).find((h2) => h2.dataset === name);
    const best = (result.optimal ?? []).find((o) => o.dataset === name);
    datasets.push({
      name,
      n,
      removed: finite(dataset?.removed) ?? 0,
      smallSample: n < SMALL_SAMPLE,
      stats: compactStats(dataset?.stats),
      // Numbers the model needs to describe the data itself, not just the fit.
      quantiles: empiricalQuantiles(values, QUANTILE_LEVELS),
      histogram: compactHistogram(histogram2?.bins),
      best: best ? {
        dist: truncateText(best.distId, 40),
        family: familyOf(best.distId),
        ppDeviation: ppDeviation(
          (result.pp ?? []).find((p) => p.dataset === name && p.distId === best.distId)?.points
        )
      } : null
    });
    const rows = (result.rows ?? []).filter((r) => r.dataset === name && Number.isFinite(r.aic));
    const byId = new Map(rows.map((r) => [r.distId, r]));
    const top = (result.ranking ?? []).filter((r) => r.dataset === name && Number.isFinite(r.aic)).slice(0, TOP_PER_DATASET);
    for (const entry of top) {
      const detail = byId.get(entry.distId) ?? {};
      ranking.push({
        dataset: name,
        dist: detail.distName ?? entry.distId,
        distId: entry.distId,
        family: familyOf(entry.distId),
        k: finite(detail.k),
        params: detail.paramsText ?? "",
        aic: round(entry.aic),
        deltaAic: round(entry.deltaAic),
        weight: round(entry.weight),
        p: {
          ks: round(detail.tests?.ks?.p),
          ad: round(detail.tests?.ad?.p),
          cvm: round(detail.tests?.cvm?.p),
          chi2: round(detail.tests?.chi2?.p)
        },
        verdict: detail.converged === false ? "\u672A\u6536\u655B" : ""
      });
    }
  }
  if (!datasets.length) return null;
  for (const row of ranking) {
    if (row.verdict) continue;
    const p = Object.values(row.p).filter((v) => v !== null);
    if (!p.length) {
      row.verdict = "\u65E0\u68C0\u9A8C";
      continue;
    }
    const failed = p.filter((v) => v < alpha).length;
    row.verdict = failed === 0 ? "\u63A5\u53D7" : failed === p.length ? "\u62D2\u7EDD" : "\u90E8\u5206\u62D2\u7EDD";
  }
  const warnings = (result.warnings ?? []).map((w) => typeof w === "string" ? w : w?.reason).filter(Boolean).slice(0, 8);
  return {
    alpha: finite(alpha) ?? 0.05,
    tests: Array.isArray(result.testsUsed) ? result.testsUsed : Object.keys(ranking[0]?.p ?? { ks: 1, ad: 1, cvm: 1, chi2: 1 }),
    chosen: Array.isArray(chosen) ? chosen.slice(0, 40) : [],
    datasets,
    ranking,
    warnings
  };
}

// src/client/ui/exportPanel.jsx
var React2 = __toESM(require("react"), 1);

// src/client/ui/chartExport.js
var PAINT_PROPS = [
  "fill",
  "fill-opacity",
  "fill-rule",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "opacity",
  "visibility",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "letter-spacing",
  "text-anchor",
  "dominant-baseline",
  "paint-order"
];
var EXPORT_FONT = "'Microsoft YaHei', 'PingFang SC', 'Noto Sans CJK SC', 'Segoe UI', sans-serif";
var HEX = /^#([0-9a-f]{3,8})$/i;
var RGB = /^rgba?\(([^)]+)\)$/i;
var clampChannel = (value) => Math.max(0, Math.min(255, Math.round(value)));
function luminance(r, g, b) {
  return clampChannel(0.299 * r + 0.587 * g + 0.114 * b);
}
function toGrayColor(value) {
  const text = String(value ?? "").trim();
  if (!text || text === "none" || text === "transparent" || text === "currentColor") return value;
  if (text.startsWith("url(")) return value;
  const hex = HEX.exec(text);
  if (hex) {
    const digits = hex[1];
    if (digits.length === 3) {
      const [r2, g2, b2] = digits.split("").map((c) => parseInt(c + c, 16));
      return `rgb(${luminance(r2, g2, b2)}, ${luminance(r2, g2, b2)}, ${luminance(r2, g2, b2)})`;
    }
    const r = parseInt(digits.slice(0, 2), 16);
    const g = parseInt(digits.slice(2, 4), 16);
    const b = parseInt(digits.slice(4, 6), 16);
    const grey = luminance(r, g, b);
    return `rgb(${grey}, ${grey}, ${grey})`;
  }
  const rgb = RGB.exec(text);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean);
    const nums = parts.slice(0, 4).map((part) => part.endsWith("%") ? parseFloat(part) / 100 * 255 : parseFloat(part));
    if (nums.length >= 3 && nums.every((n) => Number.isFinite(n))) {
      const grey = luminance(nums[0], nums[1], nums[2]);
      const alpha = nums.length > 3 ? nums[3] : 1;
      return alpha < 1 ? `rgba(${grey}, ${grey}, ${grey}, ${alpha})` : `rgb(${grey}, ${grey}, ${grey})`;
    }
  }
  return value;
}
function parseColor(value) {
  const text = String(value ?? "").trim();
  const hex = HEX.exec(text);
  if (hex) {
    const digits = hex[1];
    const expand = digits.length === 3 ? digits.split("").map((c) => c + c).join("") : digits;
    return {
      r: parseInt(expand.slice(0, 2), 16),
      g: parseInt(expand.slice(2, 4), 16),
      b: parseInt(expand.slice(4, 6), 16),
      a: 1
    };
  }
  const rgb = RGB.exec(text);
  if (!rgb) return null;
  const parts = rgb[1].split(/[\s,/]+/).filter(Boolean).map((part) => part.endsWith("%") ? parseFloat(part) / 100 * 255 : parseFloat(part));
  if (parts.length < 3 || parts.slice(0, 3).some((n) => !Number.isFinite(n))) return null;
  return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
}
var INK_TEXT = "#22262b";
var INK_LINE = "#8a9099";
var INK_FAINT = "#d9dee5";
function readableOnLight(value, faint) {
  const colour = parseColor(value);
  if (!colour || colour.a < 0.05) return value;
  if (luminance(colour.r, colour.g, colour.b) < 200) return value;
  if (colour.a < 0.6) return faint ? INK_FAINT : INK_LINE;
  return INK_TEXT;
}
function chartSize(svgEl) {
  const box = svgEl.getBoundingClientRect();
  const viewBox = svgEl.viewBox?.baseVal;
  const width = viewBox && viewBox.width || box.width || svgEl.clientWidth || 720;
  const height = viewBox && viewBox.height || box.height || svgEl.clientHeight || 360;
  return { width, height };
}
function buildExportSvg(svgEl, options = {}) {
  if (!svgEl || typeof svgEl.cloneNode !== "function") throw new Error("\u5F53\u524D\u9875\u7B7E\u8FD8\u6CA1\u6709\u53EF\u5BFC\u51FA\u7684\u56FE\u8868");
  const {
    width = 1200,
    height = 675,
    grayscale = false,
    background = "#ffffff",
    grid = true,
    fontScale = 1,
    strokeScale = 1,
    fontFamily = EXPORT_FONT
  } = options;
  const size = chartSize(svgEl);
  const clone = svgEl.cloneNode(true);
  const bgColour = parseColor(background);
  const lightBackground = !bgColour || bgColour.a > 0.05 && luminance(bgColour.r, bgColour.g, bgColour.b) > 190;
  const originals = [svgEl, ...svgEl.querySelectorAll("*")];
  const copies = [clone, ...clone.querySelectorAll("*")];
  const count = Math.min(originals.length, copies.length);
  for (let i = 0; i < count; i += 1) {
    const source = originals[i];
    const target = copies[i];
    if (!(source instanceof Element) || !(target instanceof Element)) continue;
    const computed = window.getComputedStyle(source);
    const className = source.getAttribute("class") || "";
    const hiddenByGrid = !grid && /gridline/.test(className);
    const tag = String(source.tagName || "").toLowerCase();
    const isText = tag === "text" || tag === "tspan";
    for (const prop of PAINT_PROPS) {
      const value = computed.getPropertyValue(prop);
      if (!value) continue;
      let next = value;
      if (prop === "font-size") next = `${parseFloat(value) * fontScale}px`;
      if (prop === "stroke-width") next = `${parseFloat(value) * strokeScale}`;
      if (prop === "font-family") next = fontFamily;
      if (lightBackground && (prop === "fill" || prop === "stroke")) next = readableOnLight(next, !isText);
      if (grayscale && (prop === "fill" || prop === "stroke")) next = String(toGrayColor(next));
      target.style.setProperty(prop, next);
      if ((prop === "fill" || prop === "stroke") && target.hasAttribute(prop)) target.setAttribute(prop, next);
    }
    if (hiddenByGrid) target.style.setProperty("visibility", "hidden");
    if (target.hasAttribute("class")) target.removeAttribute("class");
  }
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  clone.setAttribute("width", String(Math.round(width)));
  clone.setAttribute("height", String(Math.round(height)));
  clone.setAttribute("viewBox", `0 0 ${size.width} ${size.height}`);
  clone.setAttribute("preserveAspectRatio", "xMidYMid meet");
  if (typeof clone.style?.removeProperty === "function") {
    clone.style.removeProperty("font-family");
  }
  clone.style.setProperty("font-family", fontFamily);
  clone.style.setProperty("background", background ?? "transparent");
  if (background) {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", "0");
    rect.setAttribute("y", "0");
    rect.setAttribute("width", "100%");
    rect.setAttribute("height", "100%");
    rect.setAttribute("fill", grayscale ? "#ffffff" : background);
    clone.insertBefore(rect, clone.firstChild);
  }
  const serialized = new XMLSerializer().serializeToString(clone);
  return `<?xml version="1.0" encoding="UTF-8"?>
${serialized}`;
}
function rasterizeSvg(svgText, { width, height, type = "image/png", quality = 0.92, scale = 2 } = {}) {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("\u5F53\u524D\u73AF\u5883\u4E0D\u652F\u6301\u6805\u683C\u5316\u5BFC\u51FA"));
      return;
    }
    const url = URL.createObjectURL(new Blob([svgText], { type: "image/svg+xml;charset=utf-8" }));
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const factor = Math.max(1, Math.min(4, scale));
        canvas.width = Math.round(width * factor);
        canvas.height = Math.round(height * factor);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob(
          (blob) => blob ? resolve(blob) : reject(new Error("\u56FE\u50CF\u7F16\u7801\u5931\u8D25")),
          type,
          type === "image/jpeg" ? quality : void 0
        );
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("SVG \u6E32\u67D3\u5931\u8D25\uFF0C\u65E0\u6CD5\u5BFC\u51FA\u4F4D\u56FE"));
    };
    image.src = url;
  });
}
var ascii = (text) => new TextEncoder().encode(text);
function buildPdfBytes(jpeg, width, height) {
  const pageWidth = Number((width * 0.75).toFixed(2));
  const pageHeight = Number((height * 0.75).toFixed(2));
  const imageWidth = Math.round(width);
  const imageHeight = Math.round(height);
  const content = `q
${pageWidth} 0 0 ${pageHeight} 0 0 cm
/Im0 Do
Q
`;
  const contentBytes = ascii(content);
  const chunks = [];
  const offsets = [0];
  let length = 0;
  const push = (data) => {
    const bytes = typeof data === "string" ? ascii(data) : data;
    chunks.push(bytes);
    length += bytes.length;
  };
  const beginObject = () => {
    offsets.push(length);
  };
  push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  beginObject();
  push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  beginObject();
  push("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  beginObject();
  push(
    `3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>
endobj
`
  );
  beginObject();
  push(
    `4 0 obj
<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>
stream
`
  );
  push(jpeg);
  push("\nendstream\nendobj\n");
  beginObject();
  push(`5 0 obj
<< /Length ${contentBytes.length} >>
stream
`);
  push(contentBytes);
  push("endstream\nendobj\n");
  const xrefOffset = length;
  const xref = [`xref
0 ${offsets.length}
`, "0000000000 65535 f \n"];
  for (let i = 1; i < offsets.length; i += 1) {
    xref.push(`${String(offsets[i]).padStart(10, "0")} 00000 n 
`);
  }
  push(xref.join(""));
  push(`trailer
<< /Size ${offsets.length} /Root 1 0 R >>
startxref
${xrefOffset}
%%EOF
`);
  const out = new Uint8Array(length);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
}
function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4e3);
}
function exportName(prefix, format) {
  const raw = String(prefix ?? "").trim();
  const safe = (raw || "chart").replace(/[\\/:*?"<>|\s]+/g, "-");
  const now = /* @__PURE__ */ new Date();
  const pad = (value) => String(value).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `distfit-${safe}-${stamp}.${String(format || "png").toLowerCase()}`;
}

// src/client/ui/chartStyle.js
var FONT_STACKS = {
  sans: `'Segoe UI', 'Microsoft YaHei', 'PingFang SC', 'Noto Sans CJK SC', Arial, sans-serif`,
  hei: `'Microsoft YaHei', 'PingFang SC', 'Source Han Sans SC', 'Noto Sans CJK SC', 'Segoe UI', sans-serif`,
  song: `'Times New Roman', 'Nimbus Roman No9 L', 'Songti SC', SimSun, 'Noto Serif CJK SC', serif`,
  serif: `'Times New Roman', 'Nimbus Roman No9 L', Georgia, 'Songti SC', SimSun, serif`,
  mono: `'JetBrains Mono', Consolas, 'Courier New', monospace`
};
var PALETTES = {
  default: Array.isArray(PALETTE) && PALETTE.length > 0 ? PALETTE : ["#4c7dff"],
  cvd: [
    "#0072b2",
    "#e69f00",
    "#009e73",
    "#cc79a7",
    "#56b4e9",
    "#d55e00",
    "#f0e442",
    "#8c564b",
    "#7f7f7f",
    "#a6761d"
  ],
  mono: [
    "#1f4e9c",
    "#2f6fbf",
    "#4c8fd9",
    "#6da9e8",
    "#8dc1f2",
    "#2b3a55",
    "#546c8c",
    "#7b91ad",
    "#a3b4c9",
    "#c9d5e2"
  ],
  warm: [
    "#b3591f",
    "#d9822b",
    "#e8a33d",
    "#a13d2d",
    "#7b4a2e",
    "#c94f68",
    "#8b5cf6",
    "#3ea45d",
    "#3f7fb5",
    "#6f7680"
  ],
  gray: [
    "#1c2026",
    "#3b424b",
    "#5a626c",
    "#787f89",
    "#949ba4",
    "#adb3bb",
    "#c3c8ce",
    "#d6dade",
    "#e6e9ec",
    "#b0b6be"
  ]
};
var STYLE_DEFAULTS = {
  fontStack: FONT_STACKS.sans,
  fontScale: 1,
  strokeScale: 1,
  palette: "default",
  grayscale: false,
  grid: true,
  axes: "L",
  legend: "bottom",
  legendSize: 1,
  background: "white",
  title: "",
  // `styles.js` already paints bars with a 16 % colour mix, so 1 means "as on screen".
  barOpacity: 1,
  barEdge: true,
  // Bar look: how heavily the histogram is tinted, how far bars sit apart and
  // how round their tops are. `soft` is the default on-screen look.
  barTone: "soft",
  barGap: 2,
  barRadius: 3,
  // Explicit bar colour (`#rrggbb`); null = follow the panel theme.
  barColor: null,
  pointSize: 1
};
var FONT_KEYS = Object.keys(FONT_STACKS);
var PALETTE_KEYS = Object.keys(PALETTES);
var AXES = ["L", "box"];
var LEGENDS = ["bottom", "right", "none"];
var BACKGROUNDS = ["white", "transparent"];
var BAR_TONES = ["soft", "medium", "bold", "outline"];
var TITLE_LIMIT = 64;
var BAR_GAP_MAX = 40;
var BAR_RADIUS_MAX = 40;
function normalizeBarColor(value) {
  if (typeof value !== "string") return null;
  const raw = value.trim().toLowerCase();
  const short = /^#([0-9a-f]{3})$/.exec(raw);
  if (short) {
    const [r, g, b] = short[1].split("").map((ch) => ch + ch);
    return `#${r}${g}${b}`;
  }
  return /^#[0-9a-f]{6}$/.test(raw) ? raw : null;
}
var num = (value, min, max, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};
function normalizeStyle(input) {
  const raw = input && typeof input === "object" ? input : {};
  const base = STYLE_DEFAULTS;
  const palette = String(raw.palette ?? "");
  const axes = String(raw.axes ?? "");
  const legend = String(raw.legend ?? "");
  const background = String(raw.background ?? "");
  const fontStack = String(raw.fontStack ?? "");
  const barTone = String(raw.barTone ?? "");
  return {
    fontStack: fontStack.length > 0 ? fontStack : base.fontStack,
    fontScale: num(raw.fontScale, 0.5, 6, base.fontScale),
    strokeScale: num(raw.strokeScale, 0.3, 6, base.strokeScale),
    palette: PALETTE_KEYS.includes(palette) ? palette : base.palette,
    grayscale: typeof raw.grayscale === "boolean" ? raw.grayscale : base.grayscale,
    grid: typeof raw.grid === "boolean" ? raw.grid : base.grid,
    axes: AXES.includes(axes) ? axes : base.axes,
    legend: LEGENDS.includes(legend) ? legend : base.legend,
    legendSize: num(raw.legendSize, 0.7, 2, base.legendSize),
    background: BACKGROUNDS.includes(background) ? background : base.background,
    title: String(raw.title ?? "").slice(0, TITLE_LIMIT),
    barOpacity: num(raw.barOpacity, 0.05, 1, base.barOpacity),
    barEdge: typeof raw.barEdge === "boolean" ? raw.barEdge : base.barEdge,
    barTone: BAR_TONES.includes(barTone) ? barTone : base.barTone,
    barGap: num(raw.barGap, 0, BAR_GAP_MAX, base.barGap),
    barRadius: num(raw.barRadius, 0, BAR_RADIUS_MAX, base.barRadius),
    barColor: normalizeBarColor(raw.barColor),
    pointSize: num(raw.pointSize, 0.4, 3, base.pointSize)
  };
}
function paletteOf(style) {
  const key = PALETTE_KEYS.includes(style?.palette) ? style.palette : "default";
  return PALETTES[key];
}
function chartStyleProps(style) {
  const s = normalizeStyle(style);
  return {
    fontStack: s.fontStack,
    fontScale: s.fontScale,
    strokeScale: s.strokeScale,
    palette: paletteOf(s),
    grid: s.grid,
    axes: s.axes,
    legend: s.legend,
    legendSize: s.legendSize,
    title: s.title,
    barOpacity: s.barOpacity,
    barEdge: s.barEdge,
    barTone: s.barTone,
    barGap: s.barGap,
    barRadius: s.barRadius,
    barColor: s.barColor,
    pointSize: s.pointSize
  };
}
function exportOptionsOf(style, size) {
  const s = normalizeStyle(style);
  return {
    width: size?.width ?? 0,
    height: size?.height ?? 0,
    grayscale: s.grayscale,
    background: s.background === "transparent" ? "" : "#ffffff",
    grid: s.grid,
    fontFamily: s.fontStack,
    fontScale: 1,
    strokeScale: 1
  };
}
var TEMPLATE_PRESETS = [
  {
    id: "default",
    name: "\u9ED8\u8BA4\uFF08\u5F69\u8272 \xB7 \u7F51\u683C\uFF09",
    desc: "1280\xD7720 \xB7 \u65E0\u886C\u7EBF \xB7 \u6D45\u7F51\u683C",
    width: 1280,
    height: 720,
    style: { ...STYLE_DEFAULTS }
  },
  {
    id: "paper-cn",
    name: "\u4E2D\u6587\u671F\u520A \xB7 \u53CC\u680F",
    desc: "1800\xD71200 \xB7 \u5B8B\u4F53+Times \xB7 \u5168\u6846\u7EBF \xB7 \u65E0\u7F51\u683C",
    width: 1800,
    height: 1200,
    style: {
      fontStack: FONT_STACKS.song,
      fontScale: 3.2,
      strokeScale: 2.6,
      palette: "default",
      grid: false,
      axes: "box",
      legend: "bottom",
      legendSize: 1.05,
      title: "",
      barOpacity: 1,
      barTone: "medium",
      barGap: 2,
      barRadius: 0
    }
  },
  {
    id: "paper-en",
    name: "\u82F1\u6587\u671F\u520A \xB7 \u5355\u680F",
    desc: "1600\xD71200 \xB7 Times \xB7 Okabe-Ito \u8272 \xB7 \u56FE\u4F8B\u5728\u53F3",
    width: 1600,
    height: 1200,
    style: {
      fontStack: FONT_STACKS.serif,
      fontScale: 2.9,
      strokeScale: 2.4,
      palette: "cvd",
      grid: false,
      axes: "box",
      legend: "right",
      legendSize: 1,
      barOpacity: 1,
      barTone: "medium",
      barGap: 2,
      barRadius: 0
    }
  },
  {
    id: "thesis",
    name: "\u5B66\u4F4D\u8BBA\u6587 \xB7 \u5355\u680F",
    desc: "1800\xD71300 \xB7 \u5B8B\u4F53 \xB7 L \u5F62\u8F74 \xB7 \u65E0\u7F51\u683C",
    width: 1800,
    height: 1300,
    style: {
      fontStack: FONT_STACKS.song,
      fontScale: 3.3,
      strokeScale: 2.6,
      palette: "default",
      grid: false,
      axes: "L",
      legend: "bottom",
      barOpacity: 1,
      barTone: "medium",
      barGap: 3,
      barRadius: 2
    }
  },
  {
    id: "ppt",
    name: "\u6F14\u793A\u6587\u7A3F \xB7 16:9",
    desc: "1920\xD71080 \xB7 \u9ED1\u4F53 \xB7 \u7C97\u7EBF \xB7 \u5927\u5B57",
    width: 1920,
    height: 1080,
    style: {
      fontStack: FONT_STACKS.hei,
      fontScale: 3,
      strokeScale: 2.4,
      palette: "default",
      grid: false,
      axes: "L",
      legend: "bottom",
      legendSize: 1.2,
      barOpacity: 1,
      barTone: "medium",
      barGap: 3,
      barRadius: 4
    }
  },
  {
    id: "ppt-clear",
    name: "\u6F14\u793A\u6587\u7A3F \xB7 \u900F\u660E\u5E95",
    desc: "1600\xD7900 \xB7 \u900F\u660E\u80CC\u666F \xB7 \u8D34\u5230\u6DF1\u8272\u6BCD\u7248",
    width: 1600,
    height: 900,
    style: {
      fontStack: FONT_STACKS.hei,
      fontScale: 2.8,
      strokeScale: 2.3,
      palette: "default",
      grid: false,
      axes: "L",
      legend: "bottom",
      legendSize: 1.15,
      background: "transparent",
      barOpacity: 1,
      barTone: "soft",
      barGap: 3,
      barRadius: 4
    }
  },
  {
    id: "print-bw",
    name: "\u9ED1\u767D\u6253\u5370",
    desc: "1800\xD71200 \xB7 \u7070\u5EA6 \xB7 \u5168\u6846\u7EBF",
    width: 1800,
    height: 1200,
    style: {
      fontStack: FONT_STACKS.serif,
      fontScale: 3.2,
      strokeScale: 2.6,
      palette: "gray",
      grayscale: true,
      grid: false,
      axes: "box",
      legend: "bottom",
      barOpacity: 1,
      barTone: "outline",
      barGap: 2,
      barRadius: 0
    }
  }
];
var CUSTOM_TEMPLATE = {
  id: "custom",
  name: "\u81EA\u5B9A\u4E49",
  desc: "\u624B\u52A8\u8C03\u6574\u5C3A\u5BF8\u4E0E\u6837\u5F0F",
  width: 1280,
  height: 720,
  style: { ...STYLE_DEFAULTS }
};
var STORAGE_KEY = "distfit.templates.v1";
function storage() {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}
function loadTemplates() {
  const store = storage();
  if (!store) return [];
  try {
    const raw = store.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return list.filter((t) => t && typeof t === "object" && typeof t.id === "string").map((t) => ({
      id: `user:${t.id}`,
      name: String(t.name ?? "\u6211\u7684\u6A21\u677F").slice(0, 24),
      desc: String(t.desc ?? "\u81EA\u5B9A\u4E49\u6A21\u677F").slice(0, 60),
      width: Math.round(num(t.width, 320, 4e3, 1280)),
      height: Math.round(num(t.height, 240, 4e3, 720)),
      style: normalizeStyle(t.style)
    }));
  } catch {
    return [];
  }
}
function writeTemplates(list) {
  const store = storage();
  if (!store) return list;
  try {
    store.setItem(
      STORAGE_KEY,
      JSON.stringify(
        list.map((t) => ({
          id: String(t.id).replace(/^user:/, ""),
          name: t.name,
          desc: t.desc,
          width: t.width,
          height: t.height,
          style: normalizeStyle(t.style)
        }))
      )
    );
  } catch {
  }
  return list;
}
function saveTemplate({ id, name, desc, width, height, style }) {
  const list = loadTemplates();
  const rawId = String(id ?? "").replace(/^user:/, "");
  const key = rawId || `t${Date.now().toString(36)}`;
  const entry = {
    id: `user:${key}`,
    name: String(name || "\u6211\u7684\u6A21\u677F").slice(0, 24),
    desc: String(desc ?? "").slice(0, 60),
    width: Math.round(num(width, 320, 4e3, 1280)),
    height: Math.round(num(height, 240, 4e3, 720)),
    style: normalizeStyle(style)
  };
  const next = [entry, ...list.filter((t) => String(t.id).replace(/^user:/, "") !== key)];
  writeTemplates(next);
  return next;
}
function removeTemplate(id) {
  const key = String(id ?? "").replace(/^user:/, "");
  const next = loadTemplates().filter((t) => String(t.id).replace(/^user:/, "") !== key);
  writeTemplates(next);
  return next;
}
function describeStyle(style) {
  const s = normalizeStyle(style);
  const bits = [];
  const fontName = s.fontStack === FONT_STACKS.song ? "\u5B8B\u4F53" : s.fontStack === FONT_STACKS.serif ? "Times" : s.fontStack === FONT_STACKS.hei ? "\u9ED1\u4F53" : s.fontStack === FONT_STACKS.mono ? "\u7B49\u5BBD" : "\u65E0\u886C\u7EBF";
  bits.push(fontName);
  bits.push(`${s.fontScale.toFixed(2).replace(/0$/, "")}\xD7 \u5B57\u53F7`);
  bits.push(s.axes === "box" ? "\u5168\u6846\u7EBF" : "L \u5F62\u8F74");
  bits.push(s.grid ? "\u6709\u7F51\u683C" : "\u65E0\u7F51\u683C");
  bits.push(s.grayscale ? "\u7070\u5EA6" : `\u914D\u8272 ${s.palette}`);
  const toneName = { soft: "\u6D45", medium: "\u4E2D", bold: "\u6DF1", outline: "\u7A7A\u5FC3" }[s.barTone];
  if (toneName) bits.push(`\u67F1\u4F53${toneName}`);
  if (s.background === "transparent") bits.push("\u900F\u660E\u5E95");
  bits.push(s.legend === "none" ? "\u65E0\u56FE\u4F8B" : s.legend === "right" ? "\u56FE\u4F8B\u5728\u53F3" : "\u56FE\u4F8B\u5728\u4E0B");
  return bits.join(" \xB7 ");
}

// src/client/ui/exportPanel.jsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var { useCallback, useEffect, useLayoutEffect, useMemo: useMemo2, useRef: useRef2, useState: useState2 } = React2;
var SIZE_PRESETS = [
  { id: "p1280", label: "1280 \xD7 720\uFF0816:9 \u5E7B\u706F\u7247\uFF09", width: 1280, height: 720 },
  { id: "p1600", label: "1600 \xD7 900\uFF0816:9 \u9AD8\u6E05\uFF09", width: 1600, height: 900 },
  { id: "p1200x800", label: "1200 \xD7 800\uFF084:3 \u5E7B\u706F\u7247\uFF09", width: 1200, height: 800 },
  { id: "p1800x1200", label: "1800 \xD7 1200\uFF08\u53CC\u680F\u671F\u520A\uFF09", width: 1800, height: 1200 },
  { id: "p1600x1200", label: "1600 \xD7 1200\uFF08\u5355\u680F\u671F\u520A\uFF09", width: 1600, height: 1200 },
  { id: "p2400", label: "2400 \xD7 1350\uFF08\u5370\u5237\u9AD8\u6E05\uFF09", width: 2400, height: 1350 },
  { id: "p900", label: "900 \xD7 600\uFF08\u8349\u7A3F\uFF09", width: 900, height: 600 },
  { id: "custom", label: "\u81EA\u5B9A\u4E49\u5C3A\u5BF8\u2026", width: 0, height: 0 }
];
var FONT_OPTIONS = [
  ["sans", "\u65E0\u886C\u7EBF\uFF08Segoe / \u96C5\u9ED1\uFF09"],
  ["hei", "\u9ED1\u4F53\uFF08\u96C5\u9ED1 \xB7 \u601D\u6E90\u9ED1\uFF09"],
  ["song", "\u5B8B\u4F53 + Times\uFF08\u4E2D\u6587\u671F\u520A\uFF09"],
  ["serif", "Times\uFF08\u82F1\u6587\u671F\u520A\uFF09"],
  ["mono", "\u7B49\u5BBD"]
];
var PALETTE_OPTIONS = [
  ["default", "\u9ED8\u8BA4\u5F69\u8272"],
  ["cvd", "\u8272\u76F2\u53CB\u597D\uFF08Okabe-Ito\uFF09"],
  ["mono", "\u5355\u8272\u84DD"],
  ["warm", "\u6696\u8272\u7CFB"],
  ["gray", "\u7070\u9636"]
];
var AXES_OPTIONS = [
  ["L", "L \u5F62\u5750\u6807\u8F74"],
  ["box", "\u56DB\u8FB9\u6846\u7EBF"]
];
var LEGEND_OPTIONS = [
  ["bottom", "\u56FE\u4F8B\u5728\u4E0B\u65B9"],
  ["right", "\u56FE\u4F8B\u5728\u53F3\u4FA7"],
  ["none", "\u4E0D\u663E\u793A\u56FE\u4F8B"]
];
var BAR_TONE_OPTIONS = [
  ["soft", "\u6D45\uFF08\u9ED8\u8BA4\uFF09"],
  ["medium", "\u4E2D"],
  ["bold", "\u6DF1"],
  ["outline", "\u7A7A\u5FC3"]
];
var BAR_GAPS = [0, 1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40];
var BAR_RADII = [0, 1, 2, 3, 4, 6, 8, 10, 12, 16, 20, 24, 32, 40];
var BAR_COLOR_FALLBACK = "#c8ccd4";
var FONT_SCALES = [0.5, 0.7, 0.85, 1, 1.15, 1.3, 1.6, 2, 2.4, 2.8, 3.2, 3.6, 4, 5];
var STROKE_SCALES = [0.3, 0.5, 0.8, 1, 1.2, 1.6, 2, 2.4, 3, 3.6, 4.5, 6];
function scaleOptions(values, current) {
  const numeric = Number(current);
  if (!Number.isFinite(numeric) || values.includes(numeric)) return values;
  return [...values, numeric].sort((a, b) => a - b);
}
var clamp6 = (value, min, max, fallback) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};
function fromReplyStyle(reply, current) {
  const raw = reply && typeof reply === "object" ? reply : {};
  const next = { ...current };
  if (typeof raw.font === "string" && FONT_STACKS[raw.font]) next.fontStack = FONT_STACKS[raw.font];
  if (raw.fontStack) next.fontStack = raw.fontStack;
  for (const key of ["fontScale", "strokeScale", "legendSize", "barOpacity", "pointSize"]) {
    if (raw[key] !== void 0) next[key] = clamp6(raw[key], 0.05, 4, next[key]);
  }
  for (const key of ["barGap", "barRadius"]) {
    if (raw[key] !== void 0) next[key] = clamp6(raw[key], 0, BAR_GAP_MAX, next[key]);
  }
  if (["soft", "medium", "bold", "outline"].includes(raw.barTone)) next.barTone = raw.barTone;
  if (raw.barColor !== void 0) next.barColor = normalizeBarColor(raw.barColor);
  for (const key of ["grayscale", "grid", "barEdge"]) {
    if (typeof raw[key] === "boolean") next[key] = raw[key];
  }
  if (PALETTES[raw.palette]) next.palette = raw.palette;
  if (raw.axes === "L" || raw.axes === "box") next.axes = raw.axes;
  if (raw.legend === "bottom" || raw.legend === "right" || raw.legend === "none") next.legend = raw.legend;
  if (raw.background === "white" || raw.background === "transparent") next.background = raw.background;
  if (typeof raw.title === "string") next.title = raw.title.slice(0, 64);
  return normalizeStyle(next);
}
function ExportPanel({ open, onClose, tab, tabNames, chart, columns, chosen }) {
  const [templateId, setTemplateId] = useState2("default");
  const [sizeId, setSizeId] = useState2("p1280");
  const [width, setWidth] = useState2(1280);
  const [height, setHeight] = useState2(720);
  const [style, setStyle] = useState2(() => normalizeStyle(TEMPLATE_PRESETS[0].style));
  const [scale, setScale] = useState2(2);
  const [saved, setSaved] = useState2(() => loadTemplates());
  const [saveName, setSaveName] = useState2("");
  const [preview, setPreview] = useState2("");
  const [error, setError] = useState2("");
  const [busy, setBusy] = useState2("");
  const [pane, setPane] = useState2("template");
  const [aiReq, setAiReq] = useState2("");
  const [aiBusy, setAiBusy] = useState2(false);
  const [aiNotes, setAiNotes] = useState2("");
  const [aiErr, setAiErr] = useState2("");
  const stageRef = useRef2(null);
  const aiAbort = useRef2(null);
  useEffect(() => {
    if (!open) return void 0;
    setError("");
    setPane("template");
    return void 0;
  }, [open]);
  useEffect(() => () => aiAbort.current?.abort?.(), []);
  const applyTemplate = useCallback((template) => {
    if (!template) return;
    setTemplateId(template.id);
    setWidth(template.width);
    setHeight(template.height);
    setSizeId(SIZE_PRESETS.find((s) => s.width === template.width && s.height === template.height)?.id ?? "custom");
    setStyle(normalizeStyle(template.style));
  }, []);
  const patchStyle = useCallback((patch) => {
    setTemplateId("custom");
    setStyle((prev) => normalizeStyle({ ...prev, ...patch }));
  }, []);
  const legendMode = style.legend === "none" ? "none" : "svg";
  const styleProps = useMemo2(() => chartStyleProps(style), [style]);
  const chartNode = useMemo2(() => {
    if (!chart) return null;
    const common = { width, height, style: styleProps, legendMode };
    if (tab === "cdf") {
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(CdfChart, { ecdf: chart.ecdf, curves: chart.curves, xLabel: chart.xLabel, yLabel: chart.yLabel, ...common });
    }
    if (tab === "pp") {
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        PpChart,
        {
          points: chart.ppPoints,
          distName: chart.distName,
          color: chart.color,
          xLabel: chart.xLabel,
          yLabel: chart.yLabel,
          ...common
        }
      );
    }
    if (tab === "qq") {
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        QqChart,
        {
          points: chart.qqPoints,
          distName: chart.distName,
          color: chart.color,
          xLabel: chart.xLabel,
          yLabel: chart.yLabel,
          ...common
        }
      );
    }
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      HistFitChart,
      {
        histogram: chart.histogram,
        curves: chart.curves,
        xLabel: chart.xLabel,
        yLabel: chart.yLabel,
        ...common
      }
    );
  }, [chart, tab, width, height, styleProps, legendMode]);
  const exportOptions = useMemo2(() => exportOptionsOf(style, { width, height }), [style, width, height]);
  useLayoutEffect(() => {
    if (!open) return;
    const svg = stageRef.current?.querySelector("svg");
    if (!svg) {
      setPreview("");
      setError("\u5F53\u524D\u9875\u7B7E\u6CA1\u6709\u53EF\u5BFC\u51FA\u7684\u56FE\u8868");
      return;
    }
    try {
      const text = buildExportSvg(svg, exportOptions);
      setPreview(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`);
      setError("");
    } catch (err) {
      setPreview("");
      setError(err?.message ?? "\u9884\u89C8\u751F\u6210\u5931\u8D25");
    }
  }, [open, exportOptions, tab, chartNode]);
  const runExport = useCallback(
    async (format) => {
      const svg = stageRef.current?.querySelector("svg");
      if (!svg) {
        setError("\u5F53\u524D\u9875\u7B7E\u6CA1\u6709\u53EF\u5BFC\u51FA\u7684\u56FE\u8868");
        return;
      }
      setBusy(format);
      setError("");
      try {
        const text = buildExportSvg(svg, exportOptions);
        const base = `${chart?.xLabel || "data"}-${tab}`;
        if (format === "svg") {
          downloadBlob(exportName(base, "svg"), new Blob([text], { type: "image/svg+xml;charset=utf-8" }));
          return;
        }
        if (format === "pdf") {
          const jpeg = await rasterizeSvg(text, {
            width,
            height,
            type: "image/jpeg",
            quality: 0.95,
            scale: Math.max(2, scale)
          });
          const bytes = buildPdfBytes(new Uint8Array(await jpeg.arrayBuffer()), width, height);
          downloadBlob(exportName(base, "pdf"), new Blob([bytes], { type: "application/pdf" }));
          return;
        }
        const blob = await rasterizeSvg(text, {
          width,
          height,
          type: format === "jpg" ? "image/jpeg" : "image/png",
          quality: 0.92,
          scale
        });
        downloadBlob(exportName(base, format), blob);
      } catch (err) {
        setError(err?.message ?? "\u5BFC\u51FA\u5931\u8D25");
      } finally {
        setBusy("");
      }
    },
    [exportOptions, chart, tab, width, height, scale]
  );
  const askAi = useCallback(async () => {
    const request = aiReq.trim();
    if (!request || aiBusy) return;
    setAiBusy(true);
    setAiErr("");
    setAiNotes("");
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    aiAbort.current = controller;
    try {
      const res = await fetch("/api/dsh-distfit/chart-style", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          request,
          context: {
            tab,
            tabLabel: tabNames?.[tab] ?? tab,
            columns: Array.isArray(columns) ? columns : [],
            families: Array.isArray(chosen) ? chosen : [],
            size: { width, height },
            preset: templateId,
            style,
            summary: describeStyle(style)
          }
        }),
        signal: controller?.signal
      });
      if (res.status === 404) throw new Error("AI \u6837\u5F0F\u670D\u52A1\u5C1A\u672A\u5C31\u7EEA\uFF1A\u91CD\u542F\u4E00\u6B21 DeepSeek Harness \u540E\u518D\u8BD5");
      const payload = await res.json().catch(() => null);
      if (!payload) throw new Error(`\u670D\u52A1\u8FD4\u56DE\u5F02\u5E38\uFF08HTTP ${res.status}\uFF09`);
      if (!payload.ok) throw new Error(payload.error || "\u6A21\u578B\u6CA1\u6709\u7ED9\u51FA\u53EF\u7528\u7684\u6837\u5F0F");
      let nextStyle = fromReplyStyle(payload.style, style);
      let nextWidth = width;
      let nextHeight = height;
      const preset = TEMPLATE_PRESETS.find((p) => p.id === payload.preset);
      if (preset) {
        nextStyle = fromReplyStyle(payload.style, normalizeStyle(preset.style));
        nextWidth = preset.width;
        nextHeight = preset.height;
        setTemplateId(preset.id);
        setSizeId(SIZE_PRESETS.find((s) => s.width === preset.width && s.height === preset.height)?.id ?? "custom");
      } else {
        setTemplateId("custom");
      }
      if (/灰度|黑白|单色|灰阶|grayscale|print|打印/i.test(request) && typeof payload.style?.grayscale !== "boolean") {
        nextStyle = { ...nextStyle, grayscale: true };
      }
      setStyle(nextStyle);
      setWidth(nextWidth);
      setHeight(nextHeight);
      setAiNotes(
        [payload.notes, Array.isArray(payload.warnings) && payload.warnings.length ? `\u63D0\u793A\uFF1A${payload.warnings.join("\uFF1B")}` : ""].filter(Boolean).join("\n") || "\u5DF2\u6309\u63CF\u8FF0\u8C03\u6574\u6837\u5F0F\u3002"
      );
    } catch (err) {
      setAiErr(err?.message ?? "AI \u8C03\u6574\u5931\u8D25");
    } finally {
      setAiBusy(false);
      aiAbort.current = null;
    }
  }, [aiReq, aiBusy, tab, tabNames, columns, chosen, width, height, templateId, style]);
  if (!open) return null;
  const activeTemplate = templateId === "custom" ? null : [...TEMPLATE_PRESETS, ...saved].find((t) => t.id === templateId);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "df-overlay", role: "presentation", onMouseDown: (e) => e.target === e.currentTarget && onClose(), children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "df-modal df-modal-export", role: "dialog", "aria-modal": "true", "aria-label": "\u5BFC\u51FA\u56FE\u8868", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "df-modal-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { className: "df-card-title", children: "\u5BFC\u51FA\u56FE\u8868" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { className: "df-export-meta", children: [
          tabNames?.[tab] ?? tab,
          " \xB7 ",
          chart?.xLabel || "\u2014",
          " \xB7 ",
          width,
          " \xD7 ",
          height,
          " px \xB7 ",
          describeStyle(style)
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "df-btn df-btn-ghost df-btn-sm", onClick: onClose, children: "\u5173\u95ED" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "df-modal-body df-export-body", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "df-export-preview", children: [
        preview ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("img", { src: preview, alt: `${tabNames?.[tab] ?? tab} \u9884\u89C8` }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "df-hint", children: error || "\u6B63\u5728\u751F\u6210\u9884\u89C8\u2026" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "df-export-actions", children: ["svg", "png", "jpg", "pdf"].map((fmt) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: `df-btn${fmt === "svg" ? " df-btn-primary" : ""}`,
            disabled: Boolean(busy),
            onClick: () => void runExport(fmt),
            children: busy === fmt ? "\u5BFC\u51FA\u4E2D\u2026" : fmt.toUpperCase()
          },
          fmt
        )) }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { className: "df-hint df-export-filename", children: [
          "\u6587\u4EF6\u540D\uFF1Adistfit-",
          chart?.xLabel || "data",
          "-",
          tab,
          "-",
          "<\u65F6\u95F4\u6233>",
          ".",
          "{",
          "svg|png|jpg|pdf",
          "}"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "df-export-controls", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "df-tabs df-export-panes", role: "tablist", children: [
          ["template", "\u6A21\u677F"],
          ["style", "\u6837\u5F0F"],
          ["ai", "AI \u8C03\u6574"]
        ].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            role: "tab",
            "aria-selected": pane === id,
            className: `df-tab${pane === id ? " df-tab-on" : ""}`,
            onClick: () => setPane(id),
            children: label
          },
          id
        )) }),
        pane === "template" ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "df-export-pane", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "df-export-templates", children: TEMPLATE_PRESETS.map((t) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
            "button",
            {
              type: "button",
              className: `df-export-tpl${templateId === t.id ? " df-export-tpl-on" : ""}`,
              onClick: () => applyTemplate(t),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "df-export-tpl-name", children: t.name }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "df-export-tpl-desc", children: t.desc })
              ]
            },
            t.id
          )) }),
          saved.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "df-export-sec-title", children: "\u6211\u7684\u6A21\u677F" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "df-export-templates", children: saved.map((t) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: `df-export-tpl${templateId === t.id ? " df-export-tpl-on" : ""}`, children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("button", { type: "button", className: "df-export-tpl-pick", onClick: () => applyTemplate(t), children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "df-export-tpl-name", children: t.name }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "df-export-tpl-desc", children: [
                  t.width,
                  " \xD7 ",
                  t.height,
                  " \xB7 ",
                  describeStyle(t.style)
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "button",
                {
                  type: "button",
                  className: "df-export-tpl-del",
                  title: "\u5220\u9664\u6A21\u677F",
                  onClick: () => setSaved(removeTemplate(t.id)),
                  children: "\xD7"
                }
              )
            ] }, t.id)) })
          ] }) : null,
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "df-note", children: activeTemplate ? `\u5F53\u524D\uFF1A${activeTemplate.name}\uFF08${activeTemplate.desc}\uFF09` : "\u5F53\u524D\uFF1A\u81EA\u5B9A\u4E49\u6837\u5F0F\u3002\u53EF\u5207\u5230\u300C\u6837\u5F0F\u300D\u624B\u52A8\u5FAE\u8C03\uFF0C\u6216\u5728\u4E0B\u65B9\u4FDD\u5B58\u4E3A\u6A21\u677F\u3002" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "df-export-save", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "input",
              {
                className: "df-input",
                placeholder: "\u6A21\u677F\u540D\u79F0\uFF0C\u5982\u300C\u8BFE\u9898\u7EC4\u8BBA\u6587\u56FE\u300D",
                value: saveName,
                maxLength: 24,
                onChange: (e) => setSaveName(e.target.value)
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "button",
              {
                type: "button",
                className: "df-btn df-btn-sm",
                onClick: () => {
                  const name = saveName.trim() || `\u6211\u7684\u6A21\u677F ${saved.length + 1}`;
                  const list = saveTemplate({ name, desc: describeStyle(style), width, height, style });
                  setSaved(list);
                  setSaveName("");
                  setTemplateId(list[0]?.id ?? "custom");
                },
                children: "\u4FDD\u5B58\u4E3A\u6A21\u677F"
              }
            )
          ] })
        ] }) : null,
        pane === "style" ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "df-export-pane", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "df-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { htmlFor: "df-ex-size", children: "\u5C3A\u5BF8" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "select",
              {
                id: "df-ex-size",
                className: "df-select",
                value: sizeId,
                onChange: (e) => {
                  const id = e.target.value;
                  setSizeId(id);
                  const preset = SIZE_PRESETS.find((s) => s.id === id);
                  if (preset && preset.width) {
                    setWidth(preset.width);
                    setHeight(preset.height);
                  }
                  setTemplateId("custom");
                },
                children: SIZE_PRESETS.map((s) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: s.id, children: s.label }, s.id))
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "df-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { htmlFor: "df-ex-w", children: "\u5BBD \xD7 \u9AD8\uFF08px\uFF09" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "df-export-size", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "input",
                {
                  id: "df-ex-w",
                  className: "df-input",
                  type: "number",
                  min: 320,
                  max: 4e3,
                  value: width,
                  onChange: (e) => {
                    setWidth(clamp6(e.target.value, 320, 4e3, width));
                    setSizeId("custom");
                    setTemplateId("custom");
                  }
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "df-export-x", children: "\xD7" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "input",
                {
                  className: "df-input",
                  type: "number",
                  min: 240,
                  max: 4e3,
                  value: height,
                  onChange: (e) => {
                    setHeight(clamp6(e.target.value, 240, 4e3, height));
                    setSizeId("custom");
                    setTemplateId("custom");
                  }
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "df-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { htmlFor: "df-ex-font", children: "\u5B57\u4F53" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "select",
              {
                id: "df-ex-font",
                className: "df-select",
                value: Object.keys(FONT_STACKS).find((k) => FONT_STACKS[k] === style.fontStack) ?? "custom",
                onChange: (e) => {
                  const stack = FONT_STACKS[e.target.value];
                  if (stack) patchStyle({ fontStack: stack });
                },
                children: FONT_OPTIONS.map(([value, label]) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value, children: label }, value))
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "df-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { htmlFor: "df-ex-palette", children: "\u914D\u8272" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "select",
              {
                id: "df-ex-palette",
                className: "df-select",
                value: style.palette,
                onChange: (e) => patchStyle({ palette: e.target.value }),
                children: PALETTE_OPTIONS.map(([value, label]) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value, children: label }, value))
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "df-export-grid2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "df-field", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { htmlFor: "df-ex-fontscale", children: "\u5B57\u53F7" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "select",
                {
                  id: "df-ex-fontscale",
                  className: "df-select",
                  value: String(style.fontScale),
                  onChange: (e) => patchStyle({ fontScale: Number(e.target.value) }),
                  children: scaleOptions(FONT_SCALES, style.fontScale).map((v) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("option", { value: v, children: [
                    v,
                    "\xD7",
                    v === 1 ? "\uFF08\u9ED8\u8BA4\uFF09" : ""
                  ] }, v))
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "df-field", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { htmlFor: "df-ex-stroke", children: "\u7EBF\u5BBD" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "select",
                {
                  id: "df-ex-stroke",
                  className: "df-select",
                  value: String(style.strokeScale),
                  onChange: (e) => patchStyle({ strokeScale: Number(e.target.value) }),
                  children: scaleOptions(STROKE_SCALES, style.strokeScale).map((v) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("option", { value: v, children: [
                    v,
                    "\xD7",
                    v === 1 ? "\uFF08\u9ED8\u8BA4\uFF09" : ""
                  ] }, v))
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "df-export-grid2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "df-field", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { htmlFor: "df-ex-axes", children: "\u8FB9\u6846" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "select",
                {
                  id: "df-ex-axes",
                  className: "df-select",
                  value: style.axes,
                  onChange: (e) => patchStyle({ axes: e.target.value }),
                  children: AXES_OPTIONS.map(([value, label]) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value, children: label }, value))
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "df-field", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { htmlFor: "df-ex-legend", children: "\u56FE\u4F8B" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "select",
                {
                  id: "df-ex-legend",
                  className: "df-select",
                  value: style.legend,
                  onChange: (e) => patchStyle({ legend: e.target.value }),
                  children: LEGEND_OPTIONS.map(([value, label]) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value, children: label }, value))
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "df-export-grid3", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "df-field", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { htmlFor: "df-ex-bartone", children: "\u586B\u5145" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "select",
                {
                  id: "df-ex-bartone",
                  className: "df-select",
                  value: style.barTone,
                  onChange: (e) => patchStyle({ barTone: e.target.value }),
                  children: BAR_TONE_OPTIONS.map(([value, label]) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value, children: label }, value))
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "df-field", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { htmlFor: "df-ex-bargap", children: "\u95F4\u8DDD" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "select",
                {
                  id: "df-ex-bargap",
                  className: "df-select",
                  value: String(style.barGap),
                  onChange: (e) => patchStyle({ barGap: Number(e.target.value) }),
                  children: scaleOptions(BAR_GAPS, style.barGap).map((v) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: v, children: v === 0 ? "\u7D27\u8D34" : `${v} px` }, v))
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "df-field", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { htmlFor: "df-ex-barradius", children: "\u5706\u89D2" }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "select",
                {
                  id: "df-ex-barradius",
                  className: "df-select",
                  value: String(style.barRadius),
                  onChange: (e) => patchStyle({ barRadius: Number(e.target.value) }),
                  children: scaleOptions(BAR_RADII, style.barRadius).map((v) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: v, children: v === 0 ? "\u76F4\u89D2" : `${v} px` }, v))
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "df-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { htmlFor: "df-ex-barcolor", children: "\u67F1\u4F53\u989C\u8272" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "df-export-color", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "input",
                {
                  id: "df-ex-barcolor",
                  className: "df-color",
                  type: "color",
                  value: style.barColor ?? BAR_COLOR_FALLBACK,
                  onChange: (e) => patchStyle({ barColor: e.target.value })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "button",
                {
                  type: "button",
                  className: "df-btn df-btn-sm df-btn-ghost",
                  onClick: () => patchStyle({ barColor: null }),
                  title: "\u6E05\u7A7A\u81EA\u9009\u989C\u8272\uFF0C\u67F1\u4F53\u8DDF\u968F\u4E3B\u9898",
                  children: style.barColor ? "\u8DDF\u968F\u4E3B\u9898" : "\u8DDF\u968F\u4E3B\u9898\uFF08\u5F53\u524D\uFF09"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "df-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { htmlFor: "df-ex-title", children: "\u56FE\u6CE8\u6807\u9898\uFF08\u53EF\u7559\u7A7A\uFF09" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              "input",
              {
                id: "df-ex-title",
                className: "df-input",
                maxLength: 40,
                placeholder: "\u5982\uFF1A\u6728\u6750 / \u5851\u6599 / \u7EA4\u7EF4 \u5F3A\u5EA6\u5206\u5E03\u62DF\u5408",
                value: style.title,
                onChange: (e) => patchStyle({ title: e.target.value })
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "df-export-grid2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { className: "df-field-check", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "input",
                {
                  type: "checkbox",
                  checked: style.grayscale,
                  onChange: (e) => patchStyle({ grayscale: e.target.checked })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "\u7070\u5EA6\u56FE" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { className: "df-field-check", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "input",
                {
                  type: "checkbox",
                  checked: style.grid,
                  onChange: (e) => patchStyle({ grid: e.target.checked })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "\u663E\u793A\u7F51\u683C\u7EBF" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { className: "df-field-check", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "input",
                {
                  type: "checkbox",
                  checked: style.barEdge,
                  onChange: (e) => patchStyle({ barEdge: e.target.checked })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "\u67F1\u4F53\u63CF\u8FB9" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { className: "df-field-check", children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
                "input",
                {
                  type: "checkbox",
                  checked: style.background === "transparent",
                  onChange: (e) => patchStyle({ background: e.target.checked ? "transparent" : "white" })
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "\u900F\u660E\u80CC\u666F" })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "df-field", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { htmlFor: "df-ex-scale", children: "\u4F4D\u56FE\u500D\u7387" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
              "select",
              {
                id: "df-ex-scale",
                className: "df-select",
                value: String(scale),
                onChange: (e) => setScale(Number(e.target.value)),
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "1", children: "1\xD7\uFF08\u539F\u5C3A\u5BF8\uFF09" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "2", children: "2\xD7\uFF08\u6E05\u6670\uFF0C\u63A8\u8350\uFF09" }),
                  /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "3", children: "3\xD7\uFF08\u5370\u5237\uFF09" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "df-export-note", children: "SVG \u4FDD\u7559\u77E2\u91CF\u4E0E\u53EF\u7F16\u8F91\u6587\u5B57\uFF1BPNG / JPG \u6309\u500D\u7387\u6805\u683C\u5316\uFF1BPDF \u4E3A\u5185\u5D4C\u4F4D\u56FE\u7684\u5355\u9875\u3002\u900F\u660E\u5EA6\u4EC5\u5BF9 SVG \u4E0E PNG \u751F\u6548\u3002" })
        ] }) : null,
        pane === "ai" ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "df-export-pane", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "df-export-note", children: "\u7528\u4E00\u53E5\u8BDD\u8BF4\u660E\u7528\u9014\uFF0C\u6A21\u578B\u4F1A\u7ED9\u51FA\u5C3A\u5BF8 + \u6837\u5F0F\u65B9\u6848\uFF1A\u4F8B\u5982\u300C\u6295\u4E2D\u6587\u6838\u5FC3\u671F\u520A\uFF0C\u53CC\u680F\u3001\u7070\u5EA6\u53EF\u6253\u5370\u300D\u6216\u300C\u7EC4\u4F1A PPT\uFF0C\u7528\u5927\u5B57\u7C97\u7EBF\u300D\u3002" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "df-export-note", children: "AI \u53EA\u80FD\u8C03\u6574\u6837\u5F0F\u53C2\u6570\uFF08\u5B57\u4F53\u3001\u914D\u8272\u3001\u5750\u6807\u8F74\u3001\u56FE\u4F8B\u3001\u5C3A\u5BF8\u3001\u7070\u5EA6\uFF09\uFF1B\u6570\u636E\u3001\u591A\u5B50\u56FE\u6392\u7248\u3001\u67F1\u4F53\u82B1\u7EB9\u7B49\u9700\u8981\u624B\u52A8\u5904\u7406\u3002" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "textarea",
            {
              className: "df-textarea",
              rows: 3,
              maxLength: 600,
              placeholder: "\u6211\u8981\u628A\u8FD9\u5F20\u56FE\u653E\u8FDB\u5B66\u4F4D\u8BBA\u6587\uFF1AA4 \u5355\u680F\uFF0C\u5B8B\u4F53\uFF0C\u7070\u5EA6\u6253\u5370\u4E5F\u80FD\u5206\u6E05\u5404\u6761\u66F2\u7EBF",
              value: aiReq,
              onChange: (e) => setAiReq(e.target.value)
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "df-export-ai-actions", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "df-btn df-btn-primary df-btn-sm", disabled: aiBusy || !aiReq.trim(), onClick: () => void askAi(), children: aiBusy ? "\u6B63\u5728\u751F\u6210\u2026" : "AI \u751F\u6210\u6837\u5F0F" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "df-hint", children: "\u8C03\u7528 DSH \u6A21\u578B\u670D\u52A1\uFF0C\u7EA6 5\u201320 \u79D2" })
          ] }),
          aiErr ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "df-ai-error", children: aiErr }) : null,
          aiNotes ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "df-export-ai-notes", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "df-export-sec-title", children: "\u6A21\u578B\u8BF4\u660E" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "df-note", children: aiNotes })
          ] }) : null
        ] }) : null
      ] })
    ] }),
    error ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "df-ai-error df-export-error", children: error }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "df-export-stage", ref: stageRef, "aria-hidden": "true", style: { width, height }, children: chartNode })
  ] }) });
}

// src/client/ui/App.jsx
var import_jsx_runtime3 = require("react/jsx-runtime");
var DEFAULT_DISTS = ["normal", "lognormal", "gumbel", "gev", "gamma", "weibull"];
var TEST_DEFS = [
  { id: "ks", label: "K-S", full: "Kolmogorov\u2013Smirnov" },
  { id: "ad", label: "A-D", full: "Anderson\u2013Darling" },
  { id: "cvm", label: "CvM", full: "Cram\xE9r\u2013von Mises" },
  { id: "chi2", label: "\u03C7\xB2", full: "Pearson \u5361\u65B9" }
];
var GROUP_ORDER = ["\u4F4D\u7F6E-\u5C3A\u5EA6\u578B", "\u6B63\u504F\u5BFF\u547D\u578B", "\u6781\u503C\u578B", "\u6709\u754C\u578B"];
var DEFAULT_TESTS = ["ks", "ad", "cvm", "chi2"];
var QPROBS = [0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99];
var TAB_NAMES = { density: "\u6982\u7387\u5BC6\u5EA6", cdf: "\u7D2F\u79EF\u5206\u5E03", pp: "P-P", qq: "Q-Q" };
var nf = (v, d = 3) => v === null || v === void 0 || !Number.isFinite(Number(v)) ? "\u2014" : Number(v).toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: d });
function fmtP(p) {
  if (p === null || p === void 0 || !Number.isFinite(Number(p))) return "\u2014";
  const v = Number(p);
  if (v < 1e-3) return "<0.001";
  if (v > 0.999) return ">0.999";
  return v.toFixed(3);
}
function sigNum(v, n = 4) {
  if (!Number.isFinite(Number(v))) return "\u2014";
  const a = Math.abs(Number(v));
  if (a === 0) return "0";
  if (a >= 1e5 || a < 1e-3) return Number(v).toExponential(n - 1);
  return Number(Number(v).toPrecision(n)).toString();
}
function splitLine(line, delim) {
  if (delim === "	") return line.split("	");
  if (delim === ";") return line.split(";");
  return line.split(",");
}
function detectDelimiter(line) {
  const counts = [
    [",", (line.match(/,/g) || []).length],
    ["	", (line.match(/\t/g) || []).length],
    [";", (line.match(/;/g) || []).length]
  ].sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ",";
}
function isNumericCell(cell) {
  const t = String(cell ?? "").trim();
  if (t === "") return true;
  return Number.isFinite(Number(t.replace(/[,\s]/g, "")));
}
function parseTable(text) {
  const lines = String(text ?? "").replace(/\r\n?/g, "\n").split("\n").filter((line) => line.trim() !== "");
  if (lines.length === 0) return { header: [], columns: [] };
  const delim = detectDelimiter(lines[0]);
  const firstCells = splitLine(lines[0], delim).map((c) => c.trim());
  const headerless = firstCells.every(isNumericCell);
  const header = headerless ? firstCells.map((_, i) => `\u5217 ${i + 1}`) : firstCells.map((c, i) => c || `\u5217 ${i + 1}`);
  const body = headerless ? lines : lines.slice(1);
  const buckets = header.map((name) => ({ name, values: [], missing: 0 }));
  for (const line of body) {
    const cells = splitLine(line, delim);
    for (let i = 0; i < buckets.length; i += 1) {
      const raw = (cells[i] ?? "").trim().replace(/[,\s]/g, "");
      if (raw === "") {
        buckets[i].missing += 1;
        continue;
      }
      const v = Number(raw);
      if (Number.isFinite(v)) buckets[i].values.push(v);
      else buckets[i].missing += 1;
    }
  }
  return { header, columns: buckets.filter((c) => c.values.length >= 5) };
}
function buildCsv(rows, columns) {
  const head = ["\u6570\u636E\u96C6", "\u6392\u540D", "\u5206\u5E03", "\u53C2\u6570", "logL", "AIC", "BIC", "\u0394AIC", "\u6743\u91CD", ...TEST_DEFS.map((t) => `${t.label} p`), "\u5224\u5B9A"];
  const lines = [head.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.dataset,
        r.rank,
        r.distName,
        `"${r.paramsText ?? ""}"`,
        sigNum(r.loglik),
        sigNum(r.aic),
        sigNum(r.bic),
        sigNum(r.deltaAic),
        sigNum(r.weight),
        ...TEST_DEFS.map((t) => r.tests?.[t.id] ? sigNum(r.tests[t.id].p) : ""),
        r.verdict ?? ""
      ].join(",")
    );
  }
  return lines.join("\n");
}
function buildMarkdown(result, columns, chosen, alpha, aiText = "") {
  const stamp = (/* @__PURE__ */ new Date()).toLocaleString("zh-CN");
  const names = (columns ?? []).map((c) => typeof c === "string" ? c : c.name);
  const lines = [`# \u5206\u5E03\u62DF\u5408\u62A5\u544A`, "", `\u751F\u6210\u65F6\u95F4\uFF1A${stamp}`, `\u5019\u9009\u5206\u5E03\uFF1A${chosen.length} \u4E2A \xB7 \u663E\u8457\u6027\u6C34\u5E73 \u03B1 = ${alpha}`, ""];
  for (const col of names) {
    const rows = (result.rows ?? []).filter((r) => r.dataset === col);
    const dataset = (result.datasets ?? []).find((d) => d.name === col);
    const stats = dataset?.stats;
    if (!rows.length) continue;
    lines.push(`## ${col}`, "");
    if (stats) {
      lines.push(
        `- \u6837\u672C\u91CF n = ${nf(dataset.n, 0)}\uFF0C\u5747\u503C = ${nf(stats.mean)}\uFF0C\u6807\u51C6\u5DEE = ${nf(stats.sd)}\uFF0C\u504F\u5EA6 = ${nf(stats.skew, 2)}\uFF0C\u8D85\u989D\u5CF0\u5EA6 = ${nf(stats.kurt, 2)}`,
        ""
      );
    }
    lines.push("| # | \u5206\u5E03 | \u53C2\u6570\u4F30\u8BA1 | logL | AIC | \u0394AIC | \u6743\u91CD | \u7ED3\u8BBA |", "| --- | --- | --- | --- | --- | --- | --- | --- |");
    const usable = rows.filter((r) => Number.isFinite(r.aic));
    const sorted = [...usable].sort((a, b) => a.aic - b.aic);
    const minAic = sorted.length ? sorted[0].aic : NaN;
    const deltas = sorted.map((r) => Math.exp(-0.5 * (r.aic - minAic)));
    const total = deltas.reduce((acc, v) => acc + v, 0) || 1;
    sorted.forEach((r, i) => {
      const deltaAic = r.aic - minAic;
      const weight = deltas[i] / total;
      lines.push(
        `| ${i + 1} | ${r.distName} | ${(r.paramsText ?? "").replace(/\|/g, "/")} | ${sigNum(r.loglik)} | ${sigNum(r.aic)} | ${nf(deltaAic, 1)} | ${nf(weight, 3)} | ${verdictOf(r.tests, alpha).text} |`
      );
    });
    lines.push("");
    const best = sorted[0];
    if (best) {
      lines.push(`\u6700\u4F18\uFF1A**${best.distName}**\uFF08AIC ${sigNum(best.aic)}\uFF0C\u0394AIC 0\uFF09\u3002`, "");
    }
  }
  if (String(aiText || "").trim()) {
    lines.push(`## AI \u89E3\u8BFB`, "", String(aiText).trim(), "");
  }
  return lines.join("\n");
}
function buildJson(result, columns) {
  return JSON.stringify(
    {
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      columns: (columns ?? []).map((c) => typeof c === "string" ? { name: c } : { name: c.name, n: c.values?.length }),
      // The engine carries descriptive statistics on each dataset entry.
      stats: (result.datasets ?? []).map((d) => ({
        dataset: d.name,
        n: d.n,
        removed: d.removed ?? 0,
        ...d.stats ?? {}
      })),
      rows: (result.rows ?? []).map((r) => ({
        dataset: r.dataset,
        rank: r.rank,
        distId: r.distId,
        distName: r.distName,
        k: r.k,
        params: r.params,
        paramsText: r.paramsText,
        loglik: r.loglik,
        aic: r.aic,
        bic: r.bic,
        deltaAic: r.deltaAic,
        weight: r.weight,
        tests: r.tests
      }))
    },
    null,
    2
  );
}
function download(filename, text, mime = "text/csv;charset=utf-8", bom = true) {
  try {
    const blob = new Blob([bom ? `\uFEFF${text}` : text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 2e3);
  } catch (error) {
    console.warn("[distfit] download failed", error);
  }
}
function Check({ on, onClick, color, name, hint, k }) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
    "button",
    {
      type: "button",
      className: `df-check${on ? " df-check-on" : ""}`,
      onClick,
      title: hint ? `${name} \u2014 ${hint}` : name,
      "aria-pressed": on,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "df-check-box", "aria-hidden": "true", children: on ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("svg", { width: "9", height: "9", viewBox: "0 0 10 10", fill: "none", stroke: "currentColor", strokeWidth: "2", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M1.5 5.2l2.2 2.2 4.8-4.8", strokeLinecap: "round", strokeLinejoin: "round" }) }) : null }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "df-check-dot", style: { background: color || "transparent" }, "aria-hidden": "true" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "df-check-name", children: name }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "df-check-k", children: k ? `${k} \u53C2` : "" })
      ]
    }
  );
}
function Kpi({ label, value, unit, foot }) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-kpi", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "df-kpi-label", children: label }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-kpi-value", children: [
      value,
      unit ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "df-kpi-unit", children: unit }) : null
    ] }),
    foot ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "df-kpi-foot", children: foot }) : null
  ] });
}
function Badge({ kind = "idle", children }) {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: `df-badge df-badge-${kind}`, children });
}
function verdictOf(tests, alpha) {
  const entries = Object.values(tests || {}).filter((t) => t && Number.isFinite(t.p));
  if (!entries.length) return { kind: "idle", text: "\u2014", pass: null };
  const failed = entries.filter((t) => t.p < alpha);
  if (failed.length === 0) return { kind: "ok", text: "\u63A5\u53D7", pass: true };
  if (failed.length === entries.length) return { kind: "err", text: "\u62D2\u7EDD", pass: false };
  return { kind: "warn", text: "\u90E8\u5206\u62D2\u7EDD", pass: false };
}
var AI_ENDPOINT = "/api/dsh-distfit/explain";
function inlineRuns(text) {
  const out = [];
  let rest = String(text ?? "");
  let key = 0;
  while (rest) {
    const open = rest.indexOf("**");
    if (open < 0) {
      out.push(rest);
      break;
    }
    const close = rest.indexOf("**", open + 2);
    if (close < 0) {
      out.push(rest);
      break;
    }
    if (open > 0) out.push(rest.slice(0, open));
    out.push(/* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { children: rest.slice(open + 2, close) }, `b${key++}`));
    rest = rest.slice(close + 2);
  }
  return out;
}
function AiText({ text }) {
  const lines = String(text ?? "").split(/\r?\n/);
  const blocks = [];
  let list = null;
  const flushList = () => {
    if (!list) return;
    const items = list.items;
    blocks.push(
      list.ordered ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("ol", { className: "df-ai-list", children: items.map((item, i) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("li", { children: inlineRuns(item) }, i)) }, `l${blocks.length}`) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("ul", { className: "df-ai-list", children: items.map((item, i) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("li", { children: inlineRuns(item) }, i)) }, `l${blocks.length}`)
    );
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushList();
      continue;
    }
    const head = /^(#{1,4})\s+(.*)$/.exec(line);
    if (head) {
      flushList();
      const depth = Math.min(head[1].length, 3);
      const Tag = depth === 1 ? "h3" : "h4";
      blocks.push(
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Tag, { className: `df-ai-h df-ai-h${depth}`, children: inlineRuns(head[2]) }, `h${blocks.length}`)
      );
      continue;
    }
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push((bullet ?? numbered)[1]);
      continue;
    }
    flushList();
    blocks.push(
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "df-ai-p", children: inlineRuns(line) }, `p${blocks.length}`)
    );
  }
  flushList();
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "df-ai-text", children: blocks });
}
function LogoTile() {
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "df-logo", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M3 20h18", opacity: "0.5" }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M5 18V11M9 18V7M13 18v-5M17 18V8M21 18v-4", opacity: "0.75" }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M3.2 14.6c2.6-4.4 5-5.9 8.8-5.9s6.2 1.5 8.8 5.9" })
  ] }) });
}
function DistFitApp() {
  const [csvText, setCsvText] = (0, import_react.useState)(SAMPLE_CSV);
  const [activeCol, setActiveCol] = (0, import_react.useState)("");
  const [selected, setSelected] = (0, import_react.useState)(DEFAULT_DISTS);
  const [tests, setTests] = (0, import_react.useState)(DEFAULT_TESTS);
  const [alpha, setAlpha] = (0, import_react.useState)(0.05);
  const [mc, setMc] = (0, import_react.useState)(false);
  const [mcB, setMcB] = (0, import_react.useState)(999);
  const [bins, setBins] = (0, import_react.useState)(0);
  const [tab, setTab] = (0, import_react.useState)("density");
  const [focusId, setFocusId] = (0, import_react.useState)("");
  const [sortKey, setSortKey] = (0, import_react.useState)("aic");
  const [legendAll, setLegendAll] = (0, import_react.useState)(false);
  const [editorOpen, setEditorOpen] = (0, import_react.useState)(false);
  const [draft, setDraft] = (0, import_react.useState)("");
  const [result, setResult] = (0, import_react.useState)(null);
  const [busy, setBusy] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)("");
  const [ai, setAi] = (0, import_react.useState)({ status: "idle", text: "", model: "", provider: "", ms: 0, error: "", key: "" });
  const [aiOpen, setAiOpen] = (0, import_react.useState)(true);
  const [aiElapsed, setAiElapsed] = (0, import_react.useState)(0);
  const [exportOpen, setExportOpen] = (0, import_react.useState)(false);
  const aiCache = (0, import_react.useRef)(/* @__PURE__ */ new Map());
  const aiAbort = (0, import_react.useRef)(null);
  const fileRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    if (ai.status !== "loading") {
      setAiElapsed(0);
      return void 0;
    }
    const startedAt = Date.now();
    setAiElapsed(0);
    const timer = setInterval(() => setAiElapsed(Math.round((Date.now() - startedAt) / 1e3)), 1e3);
    return () => clearInterval(timer);
  }, [ai.status]);
  const table = (0, import_react.useMemo)(() => parseTable(csvText), [csvText]);
  const columns = table.columns;
  (0, import_react.useEffect)(() => {
    if (!columns.length) {
      setActiveCol("");
      return;
    }
    if (!columns.some((c) => c.name === activeCol)) setActiveCol(columns[0].name);
  }, [columns, activeCol]);
  const datasets = (0, import_react.useMemo)(
    () => columns.map((c) => ({ name: c.name, values: c.values })),
    [columns]
  );
  const dataKey = (0, import_react.useMemo)(() => datasets.map((d) => `${d.name}:${d.values.length}`).join("|"), [datasets]);
  const selKey = selected.join(",");
  const testKey = tests.join(",");
  (0, import_react.useEffect)(() => {
    if (!datasets.length || !selected.length) {
      setResult(null);
      return void 0;
    }
    setBusy(true);
    const timer = setTimeout(() => {
      try {
        const out = analyze(datasets, {
          dists: selected,
          tests,
          alpha,
          B: mc ? Math.max(99, Math.min(5e3, Number(mcB) || 999)) : 0,
          bins: Number(bins) || 0,
          seed: 20260101,
          maxDists: 32,
          gridSize: 260
        });
        setResult(out);
        setError("");
      } catch (err) {
        console.error("[distfit] analyze failed", err);
        setError(String(err?.message || err));
        setResult(null);
      } finally {
        setBusy(false);
      }
    }, 24);
    return () => clearTimeout(timer);
  }, [dataKey, selKey, testKey, alpha, mc, mcB, bins]);
  const aiSummary = (0, import_react.useMemo)(
    () => result ? buildAiSummary(result, columns, selected, alpha) : null,
    [result, columns, selected, alpha]
  );
  const aiSummaryKey = (0, import_react.useMemo)(() => aiSummary ? JSON.stringify(aiSummary) : "", [aiSummary]);
  (0, import_react.useEffect)(() => {
    if (!aiSummary) {
      setAi({ status: "idle", text: "", model: "", provider: "", ms: 0, error: "", key: "" });
      return void 0;
    }
    const cached = aiCache.current.get(aiSummaryKey);
    if (cached) {
      setAi(cached);
      return void 0;
    }
    const timer = setTimeout(() => {
      void requestAi(aiSummary, aiSummaryKey);
    }, 600);
    return () => clearTimeout(timer);
  }, [aiSummaryKey]);
  async function requestAi(payload, key, { force = false } = {}) {
    if (!force) {
      const cached = aiCache.current.get(key);
      if (cached) {
        setAi(cached);
        return;
      }
    }
    try {
      aiAbort.current?.abort();
    } catch {
    }
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    aiAbort.current = controller;
    const started = Date.now();
    setAi({ status: "loading", text: "", model: "", provider: "", ms: 0, error: "", key });
    try {
      const res = await fetch(AI_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ summary: payload }),
        signal: controller?.signal
      });
      const data = await res.json().catch(() => ({}));
      if (!data || data.ok !== true) {
        const fallback = res.status === 404 ? "AI \u670D\u52A1\u5C1A\u672A\u5C31\u7EEA\uFF1A\u91CD\u542F DSH \u540E\u518D\u8BD5" : `\u8BF7\u6C42\u5931\u8D25\uFF08HTTP ${res.status}\uFF09`;
        throw new Error(data?.error || fallback);
      }
      const text = String(data.text ?? "").trim();
      if (!text) throw new Error("\u6A21\u578B\u6CA1\u6709\u8FD4\u56DE\u5185\u5BB9");
      const next = {
        status: "ok",
        text,
        model: String(data.model ?? ""),
        provider: String(data.provider ?? ""),
        ms: Number(data.ms) || Date.now() - started,
        error: "",
        key
      };
      aiCache.current.set(key, next);
      if (controller?.signal?.aborted) return;
      setAi(next);
    } catch (err) {
      if (controller?.signal?.aborted) return;
      setAi({
        status: "err",
        text: "",
        model: "",
        provider: "",
        ms: Date.now() - started,
        error: String(err?.message || err),
        key
      });
    }
  }
  const orderIndex = (0, import_react.useMemo)(() => {
    const map = /* @__PURE__ */ new Map();
    const list = Array.isArray(DISTS) ? DISTS : Object.values(DISTS || {});
    list.forEach((d, i) => map.set(d.id, i));
    return map;
  }, []);
  const colorOf = (id) => PALETTE[(orderIndex.get(id) ?? 0) % PALETTE.length];
  const familyList2 = (0, import_react.useMemo)(() => {
    const list = Array.isArray(DISTS) ? DISTS : Object.values(DISTS || {});
    return list.slice().sort((a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group));
  }, []);
  const activeData = result?.datasets?.find((d) => d.name === activeCol);
  const activeValues = (0, import_react.useMemo)(
    () => columns.find((c) => c.name === activeCol)?.values ?? [],
    [columns, activeCol]
  );
  const activeRows = (0, import_react.useMemo)(() => {
    if (!result) return [];
    return result.rows.filter((r) => r.dataset === activeCol && r.converged);
  }, [result, activeCol]);
  const ranking = (0, import_react.useMemo)(() => {
    if (!result) return [];
    const byId = new Map(activeRows.map((r) => [r.distId, r]));
    const rows = result.ranking.filter((r) => r.dataset === activeCol).map((r) => {
      const detail = byId.get(r.distId) || {};
      const tests_ = detail.tests || {};
      return {
        ...detail,
        ...r,
        distName: detail.distName || r.distId,
        tests: tests_,
        verdict: verdictOf(tests_, alpha).text
      };
    });
    const dir = sortKey === "ks" ? -1 : 1;
    const val = (r) => {
      if (sortKey === "aic") return r.aic;
      if (sortKey === "bic") return r.bic;
      if (sortKey === "ks") return r.tests?.ks?.p ?? -1;
      return r.aic;
    };
    return rows.slice().sort((a, b) => dir * (Number(val(a)) - Number(val(b)))).map((r, i) => ({ ...r, rank: i + 1 }));
  }, [result, activeCol, activeRows, alpha, sortKey]);
  const best = ranking[0];
  const focus = (0, import_react.useMemo)(() => {
    if (!ranking.length) return null;
    return ranking.find((r) => r.distId === focusId) || best;
  }, [ranking, focusId, best]);
  (0, import_react.useEffect)(() => {
    if (ranking.length && !ranking.some((r) => r.distId === focusId)) setFocusId(ranking[0].distId);
  }, [ranking, focusId]);
  const curves = (0, import_react.useMemo)(() => {
    if (!result) return [];
    return result.curves.filter((c) => c.dataset === activeCol).map((c) => ({
      distId: c.distId,
      name: activeRows.find((r) => r.distId === c.distId)?.distName || c.distId,
      color: colorOf(c.distId),
      pdf: c.pdf,
      cdf: c.cdf,
      x: c.x,
      active: c.distId === focus?.distId
    }));
  }, [result, activeCol, focus, activeRows]);
  const histogram2 = (0, import_react.useMemo)(
    () => result?.histograms?.find((h2) => h2.dataset === activeCol) || null,
    [result, activeCol]
  );
  const ecdfData = (0, import_react.useMemo)(
    () => result?.ecdf?.find((e) => e.dataset === activeCol) || null,
    [result, activeCol]
  );
  const ppData = (0, import_react.useMemo)(() => {
    if (!result || !focus) return null;
    return result.pp.find((p) => p.dataset === activeCol && p.distId === focus.distId) || null;
  }, [result, activeCol, focus]);
  const qqData = (0, import_react.useMemo)(() => {
    if (!result || !focus) return null;
    return result.qq.find((p) => p.dataset === activeCol && p.distId === focus.distId) || null;
  }, [result, activeCol, focus]);
  const quantileRow = (0, import_react.useMemo)(() => {
    if (!result || !focus) return null;
    return result.quantiles.find((q) => q.dataset === activeCol && q.distId === focus.distId) || null;
  }, [result, activeCol, focus]);
  const exportChart = (0, import_react.useMemo)(
    () => ({
      histogram: histogram2,
      curves,
      ecdf: ecdfData,
      ppPoints: ppData?.points,
      qqPoints: qqData?.points,
      distName: activeRows.find((r) => r.distId === focus?.distId)?.distName,
      color: focus ? colorOf(focus.distId) : void 0,
      xLabel: activeCol,
      yLabel: "\u5BC6\u5EA6"
    }),
    [histogram2, curves, ecdfData, ppData, qqData, activeRows, focus, activeCol]
  );
  const toggleDist = (id) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.length > 1 ? prev.filter((x) => x !== id) : prev;
      return [...prev, id];
    });
  };
  const summaryText = () => {
    if (!result) return "";
    const parts = [`# DistFit \u62DF\u5408\u6458\u8981`, ""];
    for (const ds of result.datasets) {
      const rows = result.ranking.filter((r) => r.dataset === ds.name).slice(0, 3);
      parts.push(`## ${ds.name}\uFF08n=${ds.n}\uFF09`);
      rows.forEach((r, i) => {
        const detail = result.rows.find((x) => x.dataset === ds.name && x.distId === r.distId);
        parts.push(`${i + 1}. ${detail?.distName ?? r.distId}  AIC=${sigNum(r.aic)}  ${detail?.paramsText ?? ""}`);
      });
      parts.push("");
    }
    return parts.join("\n");
  };
  const openEditor = () => {
    setDraft(csvText);
    setEditorOpen(true);
  };
  const applyEditor = () => {
    setCsvText(draft);
    setEditorOpen(false);
  };
  const onPickFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result ?? ""));
      setEditorOpen(false);
    };
    reader.readAsText(file, "utf-8");
    event.target.value = "";
  };
  const colCountLabel = `${columns.length} \u5217 \xB7 ${columns.reduce((s, c) => s + c.values.length, 0)} \u4E2A\u6570\u503C`;
  const stats = activeData?.stats;
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-root", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-shell", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("header", { className: "df-header", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LogoTile, {}),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-titles", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h1", { className: "df-title", children: "\u5206\u5E03\u62DF\u5408 \xB7 DistFit" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("p", { className: "df-sub", children: [
            familyList2.length,
            " \u79CD\u5206\u5E03 \xB7 K-S / A-D / CvM / \u03C7\xB2 \u62DF\u5408\u4F18\u5EA6 \xB7 \u6781\u5927\u4F3C\u7136\u4F30\u8BA1",
            busy ? " \xB7 \u8BA1\u7B97\u4E2D\u2026" : ""
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-actions", children: [
          busy ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "df-spinner", "aria-label": "\u8BA1\u7B97\u4E2D" }) : null,
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "df-btn df-btn-sm", onClick: () => setCsvText(SAMPLE_CSV), children: "\u793A\u4F8B\u6570\u636E" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "df-btn df-btn-sm", onClick: openEditor, children: "\u7F16\u8F91\u6570\u636E" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "button",
            {
              type: "button",
              className: "df-btn df-btn-sm",
              onClick: () => download("distfit-\u62DF\u5408\u7ED3\u679C.csv", buildCsv(ranking, columns)),
              disabled: !ranking.length,
              children: "\u5BFC\u51FA CSV"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "button",
            {
              type: "button",
              className: "df-btn df-btn-sm df-btn-primary",
              onClick: () => {
                const text = summaryText();
                if (text) {
                  navigator.clipboard?.writeText(text).catch(() => {
                  });
                }
              },
              disabled: !result,
              children: "\u590D\u5236\u6458\u8981"
            }
          )
        ] })
      ] }),
      columns.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "df-card", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-empty", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "df-empty-icon", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("svg", { width: "34", height: "34", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.4", strokeLinecap: "round", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("path", { d: "M4 19h16M7 19V9M11 19V5M15 19v-6M19 19v-3" }) }) }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { children: "\u8FD8\u6CA1\u6709\u53EF\u5206\u6790\u7684\u6570\u636E" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "df-note", children: "\u7C98\u8D34 CSV / Excel \u590D\u5236\u51FA\u7684\u591A\u5217\u6570\u636E\uFF0C\u6216\u76F4\u63A5\u8F7D\u5165\u793A\u4F8B\u6570\u636E\uFF08\u6728\u6750 / \u5851\u6599 / \u7EA4\u7EF4\uFF09\u3002" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-row", style: { marginTop: 6 }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "df-btn df-btn-primary df-btn-sm", onClick: () => setCsvText(SAMPLE_CSV), children: "\u8F7D\u5165\u793A\u4F8B\u6570\u636E" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "df-btn df-btn-sm", onClick: openEditor, children: "\u7C98\u8D34\u6570\u636E" })
        ] })
      ] }) }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-grid", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("aside", { className: "df-rail", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("section", { className: "df-card", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-card-head", children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h2", { className: "df-card-title", children: "\u6570\u636E\u5217" }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "df-card-sub", children: colCountLabel }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "df-card-tools", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "df-btn df-btn-ghost df-btn-sm", onClick: openEditor, children: "\u7F16\u8F91" }) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-card-body df-card-body-tight", children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "df-chips", children: columns.map((c) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                "button",
                {
                  type: "button",
                  className: `df-chip${c.name === activeCol ? " df-chip-on" : ""}`,
                  onClick: () => setActiveCol(c.name),
                  title: `${c.name}\uFF1A${c.values.length} \u4E2A\u6709\u6548\u503C${c.missing ? `\uFF0C${c.missing} \u4E2A\u7F3A\u5931` : ""}`,
                  children: [
                    c.name,
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "df-chip-count", children: c.values.length })
                  ]
                },
                c.name
              )) }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "df-hint", style: { marginTop: 8 }, children: "\u9009\u4E2D\u5217\u5728\u53F3\u4FA7\u5206\u6790\uFF1B\u7F3A\u5931\u503C\u4E0E\u975E\u6570\u503C\u81EA\u52A8\u8DF3\u8FC7\u3002" })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("section", { className: "df-card", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-card-head", children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h2", { className: "df-card-title", children: "\u5019\u9009\u5206\u5E03" }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "df-card-sub", children: [
                selected.length,
                "/",
                familyList2.length
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-card-tools", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "df-btn df-btn-ghost df-btn-sm",
                    onClick: () => setSelected(familyList2.map((d) => d.id)),
                    title: "\u9009\u62E9\u5168\u90E8 23 \u79CD\u5206\u5E03",
                    children: "\u5168\u9009"
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "df-btn df-btn-ghost df-btn-sm",
                    onClick: () => setSelected(DEFAULT_DISTS),
                    title: "\u56DE\u5230\u5E38\u7528 6 \u79CD",
                    children: "\u5E38\u7528"
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "df-card-body df-card-body-tight", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "df-checkgroup df-scroll-y", children: GROUP_ORDER.map((group) => {
              const items = familyList2.filter((d) => d.group === group);
              if (!items.length) return null;
              return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "df-checkgroup-title", children: group }),
                items.map((d) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  Check,
                  {
                    on: selected.includes(d.id),
                    onClick: () => toggleDist(d.id),
                    color: colorOf(d.id),
                    name: d.name,
                    k: d.k,
                    hint: FAMILY_HINT[d.id]
                  },
                  d.id
                ))
              ] }, group);
            }) }) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("section", { className: "df-card", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "df-card-head", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h2", { className: "df-card-title", children: "\u68C0\u9A8C\u4E0E\u4F30\u8BA1" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-card-body", children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-field", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("label", { htmlFor: "df-alpha", children: "\u663E\u8457\u6027\u6C34\u5E73 \u03B1" }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("select", { id: "df-alpha", className: "df-select", value: alpha, onChange: (e) => setAlpha(Number(e.target.value)), children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: 0.1, children: "0.10" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: 0.05, children: "0.05" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: 0.01, children: "0.01" })
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-field", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("label", { htmlFor: "df-bins", children: "\u76F4\u65B9\u56FE\u5206\u7BB1" }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("select", { id: "df-bins", className: "df-select", value: bins, onChange: (e) => setBins(Number(e.target.value)), children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: 0, children: "\u81EA\u52A8" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: 6, children: "6" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: 8, children: "8" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: 10, children: "10" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: 14, children: "14" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: 20, children: "20" })
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-field", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("label", { htmlFor: "df-mc", children: "\u8499\u7279\u5361\u6D1B\u6821\u51C6" }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  "input",
                  {
                    id: "df-mc",
                    type: "checkbox",
                    checked: mc,
                    onChange: (e) => setMc(e.target.checked),
                    title: "\u53C2\u6570\u7531\u6837\u672C\u4F30\u8BA1\u65F6\uFF0C\u7ECF\u5178 p \u503C\u504F\u4E50\u89C2\uFF1B\u7528\u53C2\u6570\u81EA\u52A9\u6CD5\u91CD\u62BD\u6837\u6821\u51C6\u3002"
                  }
                )
              ] }),
              mc ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-field", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("label", { htmlFor: "df-mcb", children: "\u91CD\u62BD\u6837\u6B21\u6570 B" }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  "input",
                  {
                    id: "df-mcb",
                    className: "df-input df-input-num",
                    type: "number",
                    min: 99,
                    max: 5e3,
                    step: 100,
                    value: mcB,
                    onChange: (e) => setMcB(Number(e.target.value))
                  }
                )
              ] }) : null,
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "df-divider" }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "df-row df-wrap", style: { gap: 6 }, children: TEST_DEFS.map((t) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                "button",
                {
                  type: "button",
                  className: `df-chip${tests.includes(t.id) ? " df-chip-on" : ""}`,
                  onClick: () => setTests(
                    (prev) => prev.includes(t.id) ? prev.length > 1 ? prev.filter((x) => x !== t.id) : prev : [...prev, t.id]
                  ),
                  title: t.full,
                  children: t.label
                },
                t.id
              )) }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "df-hint", style: { marginTop: 8 }, children: mc ? `\u81EA\u52A9\u6CD5 B=${mcB}\uFF1A\u6162\u7EA6 ${Math.round((Number(mcB) || 999) / 500)} \u500D` : "\u7ECF\u5178\u6E10\u8FD1 p \u503C\uFF1B\u52FE\u9009\u5DE6\u9879\u53EF\u505A\u53C2\u6570\u81EA\u52A9\u6821\u51C6\u3002" })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("main", { className: "df-main", children: [
          error ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "df-card", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-card-body", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Badge, { kind: "err", children: "\u8BA1\u7B97\u51FA\u9519" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "df-note", style: { marginTop: 6 }, children: error })
          ] }) }) : null,
          activeData?.n > 0 && activeData.n < 15 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-alert", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Badge, { kind: "warn", children: "\u6837\u672C\u91CF\u504F\u5C0F" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { children: [
              "\u5F53\u524D\u53EA\u6709 ",
              activeData.n,
              " \u4E2A\u6709\u6548\u89C2\u6D4B\u3002Beta\u3001Burr XII\u3001GPD \u7B49 3\u20134 \u53C2\u6570\u5206\u5E03\u65CF\u5728\u5C11\u6837\u672C\u4E0B\u5BB9\u6613\u8FC7\u62DF\u5408\u800C\u5360\u636E AIC \u9996\u4F4D\uFF0C\u6392\u540D\u7ED3\u8BBA\u4EC5\u4F9B\u53C2\u8003\uFF0C\u5EFA\u8BAE\u6837\u672C\u91CF\u8FBE\u5230 30 \u4EE5\u4E0A\u518D\u6BD4\u8F83\u591A\u53C2\u6570\u65CF\u3002"
            ] })
          ] }) : null,
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-kpis", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Kpi, { label: "\u6837\u672C\u91CF", value: nf(activeData?.n, 0), foot: activeData?.removed ? `\u5254\u9664 ${activeData.removed} \u4E2A` : "\u6709\u6548\u89C2\u6D4B" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Kpi, { label: "\u5747\u503C \xB1 \u6807\u51C6\u5DEE", value: `${nf(stats?.mean)} \xB1 ${nf(stats?.sd)}` }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Kpi, { label: "\u53D8\u5F02\u7CFB\u6570 CV", value: stats ? nf(stats.cv, 3) : "\u2014", foot: stats ? `\u6781\u5DEE ${nf(stats.max - stats.min)}` : "" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Kpi, { label: "\u504F\u5EA6 / \u5CF0\u5EA6", value: `${stats ? nf(stats.skew, 2) : "\u2014"} / ${stats ? nf(stats.kurt, 2) : "\u2014"}`, foot: "\u5CF0\u5EA6\u4E3A\u8D85\u989D\u5CF0\u5EA6" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
              Kpi,
              {
                label: "AIC \u6700\u4F18\u5206\u5E03",
                value: best ? activeRows.find((r) => r.distId === best.distId)?.distName ?? best.distId : "\u2014",
                foot: best ? `AIC ${sigNum(best.aic)} \xB7 \u0394AIC ${nf(best.deltaAic, 1)}` : ""
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
              Kpi,
              {
                label: "\u62DF\u5408\u7ED3\u8BBA",
                value: best ? verdictOf(best.tests, alpha).text === "\u63A5\u53D7" ? "\u53EF\u63A5\u53D7" : "\u9700\u8C28\u614E" : "\u2014",
                foot: best ? `K-S p=${fmtP(best.tests?.ks?.p)} \xB7 A-D p=${fmtP(best.tests?.ad?.p)}` : ""
              }
            )
          ] }),
          aiSummary ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("section", { className: `df-card df-ai-card df-ai-${ai.status}`, "data-df-ai": ai.status, children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-card-head", children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "df-ai-dot", "aria-hidden": "true" }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h2", { className: "df-card-title", children: "AI \u89E3\u8BFB" }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "df-card-sub", children: ai.status === "loading" ? `\u6B63\u5728\u5206\u6790\u5F53\u524D\u7ED3\u679C\u2026${aiElapsed > 0 ? ` ${aiElapsed} s` : ""}` : ai.status === "ok" ? `${ai.model || "\u9ED8\u8BA4\u6A21\u578B"}${ai.ms ? ` \xB7 ${(ai.ms / 1e3).toFixed(1)} s` : ""}` : ai.status === "err" ? "\u5206\u6790\u5931\u8D25" : "" }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-card-tools", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "df-btn df-btn-ghost",
                    disabled: ai.status === "loading",
                    onClick: () => {
                      if (aiSummary) void requestAi(aiSummary, aiSummaryKey, { force: true });
                    },
                    title: "\u91CD\u65B0\u8C03\u7528\u6A21\u578B\u5206\u6790\u5F53\u524D\u7ED3\u679C",
                    children: ai.status === "loading" ? "\u5206\u6790\u4E2D\u2026" : "\u91CD\u65B0\u5206\u6790"
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "df-btn df-btn-ghost",
                    onClick: () => setAiOpen((v) => !v),
                    "aria-expanded": aiOpen,
                    children: aiOpen ? "\u6536\u8D77" : "\u5C55\u5F00"
                  }
                )
              ] })
            ] }),
            aiOpen ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-card-body df-ai-body", children: [
              ai.status === "loading" ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-ai-skeleton", "aria-busy": "true", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", {}),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", {}),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", {}),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", {})
              ] }) : null,
              ai.status === "loading" ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "df-hint", children: "\u6A21\u578B\u6B63\u5728\u8BFB\u53D6\u4E0A\u8868\u7684\u7EDF\u8BA1\u91CF\uFF0C\u901A\u5E38\u9700\u8981 10\u201390 \u79D2\uFF0C\u53D6\u51B3\u4E8E\u6240\u9009\u6A21\u578B\uFF1B\u8FD9\u671F\u95F4\u53EF\u4EE5\u7EE7\u7EED\u64CD\u4F5C\u3002" }) : null,
              ai.status === "ok" ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(AiText, { text: ai.text }) : null,
              ai.status === "err" ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-ai-error", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Badge, { kind: "warn", children: "\u672A\u751F\u6210\u89E3\u8BFB" }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "df-note", children: ai.error }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "df-hint", children: "\u8BE5\u529F\u80FD\u9700\u8981\u5BBF\u4E3B\u4FA7\u53EF\u7528\u7684\u6A21\u578B\u901A\u9053\uFF08DSH \u7684 llm \u670D\u52A1\uFF09\u3002\u82E5\u521A\u5347\u7EA7\u63D2\u4EF6\uFF0C\u8BF7\u91CD\u542F\u4E00\u6B21 DeepSeek Harness \u8BA9\u5BBF\u4E3B\u4EE3\u7801\u751F\u6548\u3002" })
              ] }) : null,
              ai.status === "ok" ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "df-hint df-ai-foot", children: "AI \u89E3\u8BFB\u57FA\u4E8E\u4E0A\u8868\u7EDF\u8BA1\u91CF\u81EA\u52A8\u751F\u6210\uFF0C\u7528\u4E8E\u5FEB\u901F\u5B9A\u4F4D\u95EE\u9898\uFF1B\u6700\u7EC8\u7ED3\u8BBA\u8BF7\u7ED3\u5408\u4E13\u4E1A\u5224\u65AD\u3002" }) : null
            ] }) : null
          ] }) : null,
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("section", { className: "df-card", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-card-head", children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h2", { className: "df-card-title", children: "\u62DF\u5408\u8BCA\u65AD\u56FE" }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "df-card-sub", children: focus ? `${activeRows.find((r) => r.distId === focus.distId)?.distName ?? focus.distId} \u9AD8\u4EAE` : "" }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-card-tools", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "df-btn df-btn-ghost df-btn-sm",
                    onClick: () => setExportOpen(true),
                    title: "\u9009\u62E9\u8BBA\u6587 / PPT \u6A21\u677F\u3001\u9884\u89C8\u5E76\u5BFC\u51FA SVG / PNG / JPG / PDF",
                    children: "\u5BFC\u51FA\u56FE"
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "df-tabs", role: "tablist", children: [
                  ["density", "\u6982\u7387\u5BC6\u5EA6"],
                  ["cdf", "\u7D2F\u79EF\u5206\u5E03"],
                  ["pp", "P-P"],
                  ["qq", "Q-Q"]
                ].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  "button",
                  {
                    type: "button",
                    role: "tab",
                    "aria-selected": tab === id,
                    className: `df-tab${tab === id ? " df-tab-on" : ""}`,
                    onClick: () => setTab(id),
                    children: label
                  },
                  id
                )) })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-chartwrap", children: [
              tab === "density" ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(HistFitChart, { histogram: histogram2, curves, xLabel: activeCol, yLabel: "\u5BC6\u5EA6" }) : null,
              tab === "cdf" ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(CdfChart, { ecdf: ecdfData, curves, xLabel: activeCol }) : null,
              tab === "pp" ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                PpChart,
                {
                  points: ppData?.points,
                  distName: activeRows.find((r) => r.distId === focus?.distId)?.distName,
                  color: focus ? colorOf(focus.distId) : void 0
                }
              ) : null,
              tab === "qq" ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                QqChart,
                {
                  points: qqData?.points,
                  distName: activeRows.find((r) => r.distId === focus?.distId)?.distName,
                  color: focus ? colorOf(focus.distId) : void 0
                }
              ) : null
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-legend", children: [
              (legendAll ? curves : curves.slice(0, 12)).map((c) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                "button",
                {
                  type: "button",
                  className: `df-legend-item${c.active ? " df-legend-on" : ""}`,
                  onClick: () => setFocusId(c.distId),
                  title: `\u9AD8\u4EAE ${c.name}`,
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "df-legend-swatch", style: { background: c.color } }),
                    c.name
                  ]
                },
                c.distId
              )),
              curves.length > 12 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                "button",
                {
                  type: "button",
                  className: "df-legend-more",
                  onClick: () => setLegendAll((v) => !v),
                  children: legendAll ? "\u6536\u8D77\u56FE\u4F8B" : `+${curves.length - 12} \u6761\u66F2\u7EBF`
                }
              ) : null
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("section", { className: "df-card", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-card-head", children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h2", { className: "df-card-title", children: "\u62DF\u5408\u6392\u540D" }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "df-card-sub", children: [
                activeCol,
                " \xB7 AIC \u8D8A\u5C0F\u8D8A\u597D\uFF0C\u0394AIC \u2264 2 \u89C6\u4E3A\u540C\u6863"
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-card-tools", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("select", { className: "df-select", value: sortKey, onChange: (e) => setSortKey(e.target.value), "aria-label": "\u6392\u5E8F\u4F9D\u636E", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: "aic", children: "\u6309 AIC \u6392\u5E8F" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: "bic", children: "\u6309 BIC \u6392\u5E8F" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: "ks", children: "\u6309 K-S p \u6392\u5E8F" })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "df-btn df-btn-sm df-btn-ghost",
                    disabled: !ranking.length,
                    onClick: () => download(
                      "distfit-report.md",
                      buildMarkdown(result, columns, selected, alpha, ai.status === "ok" ? ai.text : ""),
                      "text/markdown;charset=utf-8"
                    ),
                    title: "\u5BFC\u51FA Markdown \u62A5\u544A\uFF08\u542B KPI\u3001\u6392\u540D\u4E0E\u7ED3\u8BBA\uFF09",
                    children: "\u62A5\u544A .md"
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                  "button",
                  {
                    type: "button",
                    className: "df-btn df-btn-sm df-btn-ghost",
                    disabled: !ranking.length,
                    onClick: () => download("distfit-result.json", buildJson(result, columns), "application/json;charset=utf-8", false),
                    title: "\u5BFC\u51FA\u5B8C\u6574\u7ED3\u679C JSON\uFF08\u53C2\u6570\u3001AIC\u3001\u5404\u9879\u68C0\u9A8C p \u503C\uFF09",
                    children: "JSON"
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "df-card-body df-card-body-flush", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "df-table-scroll", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("table", { className: "df-table", children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("tr", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("th", { className: "df-num", style: { width: 44 }, children: "#" }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("th", { children: "\u5206\u5E03" }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("th", { children: "\u53C2\u6570\u4F30\u8BA1" }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("th", { className: "df-num", children: "logL" }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("th", { className: "df-num", children: "AIC" }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("th", { className: "df-num", children: "\u0394AIC" }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("th", { className: "df-num", children: "\u6743\u91CD" }),
                TEST_DEFS.filter((t) => tests.includes(t.id)).map((t) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("th", { className: "df-num", title: `${t.full} p \u503C`, children: [
                  t.label,
                  " p"
                ] }, t.id)),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("th", { children: "\u7ED3\u8BBA" })
              ] }) }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("tbody", { children: ranking.map((r) => {
                const v = verdictOf(r.tests, alpha);
                return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
                  "tr",
                  {
                    className: r.distId === focus?.distId ? "df-row-on" : "",
                    onClick: () => setFocusId(r.distId),
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("td", { className: "df-num", children: r.rank }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("td", { children: [
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "df-swatch", style: { background: colorOf(r.distId) } }),
                        r.distName,
                        r.k >= 3 && r.k * 10 > (activeData?.n ?? 0) ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                          "span",
                          {
                            className: "df-flag",
                            title: `\u8BE5\u65CF\u6709 ${r.k} \u4E2A\u53C2\u6570\uFF0C\u6837\u672C\u4EC5 ${activeData?.n ?? 0} \u4E2A\uFF1A\u4F30\u8BA1\u4E0E\u62DF\u5408\u4F18\u5EA6\u90FD\u53EF\u80FD\u5931\u771F`,
                            children: "\u26A0"
                          }
                        ) : null
                      ] }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("td", { className: "df-params", children: r.paramsText || "\u2014" }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("td", { className: "df-num", children: sigNum(r.loglik) }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("td", { className: "df-num", children: sigNum(r.aic) }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("td", { className: "df-num", children: nf(r.deltaAic, 1) }),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("td", { className: "df-num", children: nf(r.weight, 3) }),
                      TEST_DEFS.filter((t) => tests.includes(t.id)).map((t) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("td", { className: "df-num", children: fmtP(r.tests?.[t.id]?.p) }, t.id)),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("td", { children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Badge, { kind: v.kind, children: v.text }) })
                    ]
                  },
                  r.distId
                );
              }) })
            ] }) }) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-grid", style: { gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 1fr)", gap: 14 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("section", { className: "df-card", children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-card-head", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h2", { className: "df-card-title", children: "\u5206\u4F4D\u6570\u4F30\u8BA1" }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "df-card-sub", children: focus ? activeRows.find((r) => r.distId === focus.distId)?.distName : "" })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "df-card-body df-card-body-flush", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("table", { className: "df-table", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("tr", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("th", { children: "\u91CD\u73B0\u671F" }),
                  QPROBS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("th", { className: "df-num", children: [
                    "P",
                    Math.round(p * 100)
                  ] }, p))
                ] }) }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("tbody", { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("tr", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("td", { className: "df-note", children: [
                      activeCol,
                      " \u5206\u4F4D\u503C"
                    ] }),
                    QPROBS.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("td", { className: "df-num", children: nf(quantileRow?.values?.[i], 3) }, p))
                  ] }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("tr", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("td", { className: "df-note", children: "\u6837\u672C\u7ECF\u9A8C\u503C" }),
                    QPROBS.map((p) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("td", { className: "df-num", children: nf(sampleQuantile2(activeValues, p), 3) }, p))
                  ] })
                ] })
              ] }) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("section", { className: "df-card", children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-card-head", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h2", { className: "df-card-title", children: "\u5206\u5E03\u8BF4\u660E" }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "df-card-sub", children: "\u53C2\u6570\u542B\u4E49\u4E0E\u5BC6\u5EA6\u51FD\u6570" })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "df-card-body", children: focus ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-row", style: { marginBottom: 6 }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "df-swatch", style: { background: colorOf(focus.distId) } }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { style: { fontSize: 13 }, children: activeRows.find((r) => r.distId === focus.distId)?.distName }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(Badge, { kind: "idle", children: [
                    activeRows.find((r) => r.distId === focus.distId)?.k,
                    " \u53C2\u6570"
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "df-formula", children: FORMULAS[focus.distId]?.plain }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "df-divider" }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-field", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("label", { children: "\u652F\u6491\u96C6" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "df-mono", children: FORMULAS[focus.distId]?.support ?? "\u2014" })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-field", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("label", { children: "\u53C2\u6570\u4F30\u8BA1" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "df-params", children: focus.paramsText || "\u2014" })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-field", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("label", { children: "AIC / BIC" }),
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "df-mono", children: [
                    sigNum(focus.aic),
                    " / ",
                    sigNum(focus.bic)
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "df-hint", style: { marginTop: 8 }, children: FORMULAS[focus.distId]?.note })
              ] }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "df-note", children: "\u9009\u62E9\u4E00\u79CD\u5206\u5E03\u67E5\u770B\u8BE6\u60C5\u3002" }) })
            ] })
          ] }),
          activeData ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-row df-wrap", style: { gap: 10, justifyContent: "space-between" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "df-hint", children: [
              "\u6570\u636E\uFF1A",
              SAMPLE_NAME,
              " \xB7 \u5F53\u524D\u5217 ",
              activeCol,
              " \xB7 n=",
              activeData.n,
              " \xB7 \u4F30\u8BA1\u65B9\u6CD5\uFF1A\u6781\u5927\u4F3C\u7136\uFF08Nelder\u2013Mead \u591A\u8D77\u70B9\uFF09"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "df-hint", children: [
              "\u53C2\u6570\u4F30\u8BA1\u503C\u7531\u6837\u672C\u53CD\u63A8\uFF0Cp \u503C\u5BF9\u201C\u590D\u5408\u5047\u8BBE\u201D\u504F\u4E50\u89C2",
              alpha ? `\uFF1B\u5224\u5B9A\u9608\u503C \u03B1=${alpha}` : "",
              "\u3002"
            ] })
          ] }) : null
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      ExportPanel,
      {
        open: exportOpen,
        onClose: () => setExportOpen(false),
        tab,
        tabNames: TAB_NAMES,
        chart: exportChart,
        columns,
        chosen: selected
      }
    ),
    editorOpen ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "df-overlay", role: "dialog", "aria-modal": "true", "aria-label": "\u7F16\u8F91\u6570\u636E", onClick: () => setEditorOpen(false), children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-modal", onClick: (e) => e.stopPropagation(), children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-modal-head", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h2", { className: "df-card-title", children: "\u7F16\u8F91\u6570\u636E" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "df-card-sub", children: "\u7B2C\u4E00\u884C\u4E3A\u5217\u540D\uFF1B\u652F\u6301\u9017\u53F7 / \u5236\u8868\u7B26 / \u5206\u53F7\u5206\u9694\uFF0C\u7A7A\u5355\u5143\u683C\u89C6\u4E3A\u7F3A\u5931" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-card-tools", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "df-btn df-btn-sm", onClick: () => fileRef.current?.click(), children: "\u5BFC\u5165 CSV" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("input", { ref: fileRef, type: "file", accept: ".csv,.tsv,.txt,text/csv", hidden: true, onChange: onPickFile })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-modal-body", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("textarea", { className: "df-textarea", value: draft, spellCheck: false, onChange: (e) => setDraft(e.target.value) }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "df-note", children: describeParse(draft) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "df-modal-foot", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "df-btn df-btn-ghost df-btn-sm", onClick: () => setDraft(SAMPLE_CSV), children: "\u586B\u5165\u793A\u4F8B" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "df-spacer" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "df-btn df-btn-sm", onClick: () => setEditorOpen(false), children: "\u53D6\u6D88" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", className: "df-btn df-btn-primary df-btn-sm", onClick: applyEditor, children: "\u5E94\u7528" })
      ] })
    ] }) }) : null
  ] });
}
function describeParse(text) {
  const { columns } = parseTable(text);
  if (!columns.length) return "\u672A\u8BC6\u522B\u5230\u6570\u503C\u5217\uFF1A\u81F3\u5C11\u9700\u8981 5 \u4E2A\u6709\u6548\u6570\u503C\u3002";
  const parts = columns.map((c) => `${c.name}\uFF08${c.values.length}${c.missing ? `\uFF0C\u7F3A\u5931 ${c.missing}` : ""}\uFF09`);
  return `\u8BC6\u522B\u5230 ${columns.length} \u5217\uFF1A${parts.join("\u3001")}`;
}
function sampleQuantile2(values, p) {
  if (!Array.isArray(values) || values.length === 0) return NaN;
  const sorted = values.slice().sort((a, b) => a - b);
  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

// src/client/index.jsx
var PANEL_ID = "distfit";
var NS = "dsh-distfit";
var inject = ["slots"];
function DistFitIcon(props) {
  const size = props?.size ?? 22;
  return (0, import_react2.createElement)(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 1.7,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true"
    },
    (0, import_react2.createElement)("path", { d: "M3 20h18", opacity: 0.55 }),
    (0, import_react2.createElement)("path", { d: "M4 17V9" }),
    (0, import_react2.createElement)("path", { d: "M8 17V6" }),
    (0, import_react2.createElement)("path", { d: "M12 17v-4" }),
    (0, import_react2.createElement)("path", { d: "M16 17V6" }),
    (0, import_react2.createElement)("path", { d: "M20 17V9" }),
    (0, import_react2.createElement)("path", {
      d: "M2.5 15c2.6-6.2 4.7-8.3 9.5-8.3s6.9 2.1 9.5 8.3",
      stroke: "currentColor",
      opacity: 0.95
    })
  );
}
function installStyles() {
  const el = document.createElement("style");
  el.dataset.distfitStyle = "1";
  el.textContent = CSS;
  document.head.appendChild(el);
  return () => el.remove();
}
function apply(ctx) {
  const slots = ctx.slots ?? ctx.get?.("slots");
  if (!slots) {
    console.error("[distfit] slots service unavailable; panel not registered");
    return;
  }
  const register = (slot, descriptor, Component, label) => {
    try {
      const unregister = slots.register({ ...descriptor, name: slot }, Component);
      return () => {
        try {
          unregister();
        } catch {
        }
      };
    } catch (error) {
      console.error(`[distfit] ${label} registration failed`, error);
      return () => {
      };
    }
  };
  ctx.effect(() => {
    const disposeStyles = installStyles();
    const offIcon = slots.inject ? slots.inject(
      "sidebar.panellist",
      () => register(
        "sidebar.panellist",
        { id: PANEL_ID, order: 40, label: () => "\u5206\u5E03\u62DF\u5408" },
        DistFitIcon,
        "sidebar icon"
      )
    ) : register("sidebar.panellist", { id: PANEL_ID, order: 40, label: "\u5206\u5E03\u62DF\u5408" }, DistFitIcon, "sidebar icon");
    const offPanel = slots.inject ? slots.inject(
      "main",
      () => register("main", { key: PANEL_ID }, DistFitApp, "main panel")
    ) : register("main", { key: PANEL_ID }, DistFitApp, "main panel");
    return () => {
      try {
        offPanel?.();
      } catch {
      }
      try {
        offIcon?.();
      } catch {
      }
      try {
        disposeStyles?.();
      } catch {
      }
    };
  }, `${NS}: panel slots`);
  console.info("[distfit] client half applied");
}

		return module.exports;
	}
});
