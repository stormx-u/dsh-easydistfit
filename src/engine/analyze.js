/**
 * analyze.js — the single entry point used by the panel and the agent tool.
 *
 * Pure ESM, zero dependencies, no DOM / Node built-ins.
 *
 * `analyze(datasets, options)` fits every requested distribution family to every
 * numeric column and returns everything a UI needs in ONE plain object
 * (docs/DESIGN.md, engine contract): per-column descriptive statistics, one row per
 * (column, family) with AIC/BIC/params/tests, an AIC ranking with ΔAIC and
 * Akaike weights, histograms, the empirical CDF, shared-grid PDF/CDF curves,
 * P-P and Q-Q points, a quantile table and the best family per column.
 *
 * Design rules:
 *  - NEVER throw because one family failed: a failed fit / a family whose support
 *    rejects the data / a failed test becomes a `warnings` entry and the run
 *    continues. The function only throws for a non-array `datasets` argument.
 *  - Rows that could not be fitted keep their place in `rows` (`converged:false`,
 *    `na:true`, `aic:null`, `bic:null`, empty `tests`) but never enter `ranking`.
 *  - `rows[i].tests` only contains the tests that actually ran and produced a
 *    finite p-value (no `undefined` placeholders).
 *  - `dataset.stats` holds the SAMPLE statistics; `row.mean` / `row.sd` are the
 *    moments implied by the FITTED distribution (numeric quantile integration).
 */

import { DISTS } from './distributions.js';
import { describe, histogram, ecdf, quantile, sortNumbers, quantileMoments } from './stats.js';
import { TESTS, TEST_IDS } from './tests.js';

/* ------------------------------------------------------------------ */
/* defaults                                                           */
/* ------------------------------------------------------------------ */

/**
 * Documented `analyze` defaults. Any field may be overridden via `options`.
 * @type {{
 *   dists: string[], tests: string[], alpha: number, B: number, bins: number,
 *   seed: number, maxDists: number, gridSize: number, mcRefit: boolean
 * }}
 */
export const ANALYZE_DEFAULTS = Object.freeze({
  dists: Object.freeze([]), // [] => every supported family
  tests: Object.freeze(['ks', 'ad', 'cvm', 'chi2']),
  alpha: 0.05,
  B: 0, // Monte-Carlo replicates, 0 => asymptotic p-values only
  bins: 0, // histogram bins, 0 => Freedman–Diaconis auto
  seed: 20260101,
  maxDists: 12, // guard: how many families to fit per dataset
  gridSize: 240, // curve resolution
  mcRefit: false, // MC re-fits every replicate (calibrated composite p-values)
});

/** Quantile-table probabilities (SPEC §2.6). */
export const QUANTILE_PROBS = Object.freeze([0.01, 0.05, 0.25, 0.5, 0.75, 0.95, 0.99]);

/* ------------------------------------------------------------------ */
/* model selection helpers                                             */
/* ------------------------------------------------------------------ */

/**
 * Akaike Information Criterion, AIC = 2k − 2ℓ.
 * @param {number} loglik maximised log-likelihood
 * @param {number} k number of free parameters
 */
export function aic(loglik, k) {
  return 2 * k - 2 * loglik;
}

/**
 * Bayesian Information Criterion, BIC = k·ln(n) − 2ℓ.
 * @param {number} loglik maximised log-likelihood
 * @param {number} k number of free parameters
 * @param {number} n sample size
 */
export function bic(loglik, k, n) {
  return k * Math.log(n) - 2 * loglik;
}

/**
 * Akaike weights from a list of AIC values: w_i = exp(−Δ_i/2) / Σ exp(−Δ_j/2)
 * with Δ_i = AIC_i − min(AIC). Non-finite AIC values get weight 0.
 * @param {number[]} aics
 * @returns {number[]} weights summing to 1 (all zeros when no finite AIC)
 */
export function aicWeights(aics) {
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
  let sum = 0;
  for (let i = 0; i < raw.length; i++) sum += raw[i];
  if (!(sum > 0)) return list.map(() => 0);
  return raw.map((w) => w / sum);
}

/* ------------------------------------------------------------------ */
/* small helpers                                                      */
/* ------------------------------------------------------------------ */

function clamp(v, lo, hi) {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

/** All distribution families, array-form or registry-object form. */
function familyList() {
  const list = Array.isArray(DISTS) ? DISTS : Object.values(DISTS || {});
  return list.filter((d) => d && typeof d.id === 'string' && typeof d.cdf === 'function');
}

/** Dataset value extractor: accepts `{values}` (UI/host) or `{x}`. */
function datasetValues(ds) {
  if (!ds) return [];
  if (Array.isArray(ds.values)) return ds.values;
  if (Array.isArray(ds.x)) return ds.x;
  if (Array.isArray(ds.data)) return ds.data;
  return [];
}

/** Human-readable parameter string, e.g. `μ=10.2, σ=1.35`. */
function paramsTextOf(dist, params) {
  const names =
    Array.isArray(dist.paramNames) && dist.paramNames.length
      ? dist.paramNames
      : Object.keys(params || {});
  const labels = new Map(
    (Array.isArray(dist.params) ? dist.params : []).map((p) => [p.name, p.label || p.name]),
  );
  const fmt = (v) => {
    if (!Number.isFinite(v)) return '—';
    const a = Math.abs(v);
    if (a !== 0 && (a >= 1e5 || a < 1e-3)) return v.toExponential(3);
    const r = Number(v.toPrecision(4));
    return String(r);
  };
  return names.map((nm) => `${labels.get(nm) || nm}=${fmt(params?.[nm])}`).join(', ');
}

/** `support` string → numeric domain (null entries mean unbounded). */
function supportDomain(support) {
  switch (support) {
    case 'positive':
      return { lo: 0, loOpen: true, hi: null };
    case 'unit':
      return { lo: 0, loOpen: false, hi: 1 };
    case 'interval':
      return null; // parameter-estimated bounds: nothing to enforce
    default:
      return null; // 'real'
  }
}

/** Does a family with this `support` accept every observation? */
function supportOk(support, xs) {
  if (!xs.length) return false;
  if (support === 'positive') return xs[0] > 0;
  if (support === 'unit') return xs[0] >= 0 && xs[xs.length - 1] <= 1;
  return true;
}

/** Is x inside the family's support? */
function inSupport(support, x) {
  if (!Number.isFinite(x)) return false;
  if (support === 'positive') return x > 0;
  if (support === 'unit') return x >= 0 && x <= 1;
  return true;
}

/**
 * Shared curve grid for one dataset (SPEC §2.6): linear over
 * [min − 0.15·range, max + 0.15·range], clipped to the intersection of the
 * supports of the plotted families so every overlay uses the same abscissae.
 */
function buildGrid(xSorted, used, gridSize) {
  const n = xSorted.length;
  const lo0 = xSorted[0];
  const hi0 = xSorted[n - 1];
  let range = hi0 - lo0;
  if (!(range > 0)) range = Math.abs(hi0) > 0 ? Math.abs(hi0) : 1;
  let lo = lo0 - 0.15 * range;
  let hi = hi0 + 0.15 * range;

  // Clip only when EVERY plotted family is bounded — otherwise the real-support
  // families would lose their left/right tail.
  const allLowerBounded = used.length > 0 && used.every((d) => d.support === 'positive' || d.support === 'unit');
  const allUnit = used.length > 0 && used.every((d) => d.support === 'unit');
  if (allLowerBounded) lo = Math.max(lo, 0);
  if (allUnit) hi = Math.min(hi, 1);
  if (!(hi > lo)) {
    lo = lo0;
    hi = hi0;
    if (!(hi > lo)) hi = lo + 1;
  }

  const size = clamp(Math.round(Number(gridSize) || ANALYZE_DEFAULTS.gridSize), 2, 4000);
  const out = new Array(size);
  const step = (hi - lo) / (size - 1);
  for (let i = 0; i < size; i++) out[i] = lo + i * step;
  return out;
}

/* ------------------------------------------------------------------ */
/* analyze                                                            */
/* ------------------------------------------------------------------ */

/**
 * Fit and rank distribution families for one or more numeric columns.
 *
 * @param {{name?:string, values?:number[]}[]} datasets columns, `{name, values}`
 * @param {object} [options] see `ANALYZE_DEFAULTS`
 * @returns {{
 *   datasets: {name:string, n:number, removed:number, stats:object}[],
 *   rows: object[], ranking: object[], histograms: object[], ecdf: object[],
 *   curves: object[], pp: object[], qq: object[], quantiles: object[],
 *   optimal: object[], warnings: object[]
 * }}
 */
export function analyze(datasets, options = {}) {
  if (!Array.isArray(datasets)) {
    throw new TypeError('analyze(datasets, options): `datasets` must be an array of { name, values }');
  }
  const o = { ...ANALYZE_DEFAULTS, ...(options || {}) };

  const alphaRaw = Number(o.alpha);
  const alpha = alphaRaw > 0 && alphaRaw < 1 ? alphaRaw : ANALYZE_DEFAULTS.alpha;
  const Breps = Math.max(0, Math.floor(Number(o.B) || 0));
  const binsOpt = Math.max(0, Math.floor(Number(o.bins) || 0));
  const seed = Math.floor(Number(o.seed) || ANALYZE_DEFAULTS.seed);
  const gridSize = Number(o.gridSize) || ANALYZE_DEFAULTS.gridSize;
  const mcRefit = Boolean(o.mcRefit);

  const wantedTests = (Array.isArray(o.tests) ? o.tests : ANALYZE_DEFAULTS.tests)
    .map((t) => String(t))
    .filter((t) => TEST_IDS.includes(t));

  // ---- family selection ---------------------------------------------------
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
    warnings: [],
  };

  datasets.forEach((ds, idx) => {
    const name = String((ds && ds.name) ?? `列${idx + 1}`);
    const raw = datasetValues(ds);
    const xs = sortNumbers(raw); // sorted, finite only
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
        iqr: desc.iqr,
      },
    });

    if (skippedFamilies.length) {
      out.warnings.push({
        dataset: name,
        distId: null,
        reason: `超出 maxDists=${maxDists} 上限，已跳过：${skippedFamilies.join(', ')}`,
      });
    }

    if (n < 5) {
      out.warnings.push({ dataset: name, distId: null, reason: `有效样本不足（n=${n} < 5），跳过全部拟合` });
      out.histograms.push({ dataset: name, bins: [], n });
      out.ecdf.push({ dataset: name, x: [], y: [] });
      return;
    }

    // ---- fit every family ----------------------------------------------
    const fitted = []; // { dist, params, fit }
    for (const dist of families) {
      if (!supportOk(dist.support, xs)) {
        out.warnings.push({
          dataset: name,
          distId: dist.id,
          reason: `数据超出支撑集（support=${String(dist.support)}，最小值 ${xs[0]}）`,
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
          reason: `拟合失败：${err && err.message ? err.message : String(err)}`,
        });
        out.rows.push(makeNaRow(name, dist));
        continue;
      }
      const params = fit && fit.params;
      const loglik = fit ? Number(fit.loglik) : NaN;
      const converged = Boolean(fit && fit.converged) && Number.isFinite(loglik);
      const paramsFinite =
        params &&
        typeof params === 'object' &&
        Object.keys(params).length > 0 &&
        Object.values(params).every((v) => Number.isFinite(Number(v)));
      if (!converged || !paramsFinite) {
        out.warnings.push({
          dataset: name,
          distId: dist.id,
          reason: '拟合未收敛或对数似然非有限，标记为 na（不参与排序）',
        });
        out.rows.push(makeNaRow(name, dist, 'not-converged'));
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
        tests: {},
      };

      // Fitted-distribution implied moments (numeric quantile integration).
      try {
        const qf = (p) => dist.quantile(p, params);
        const mom = quantileMoments(qf, 1025);
        row.mean = Number.isFinite(mom.mean) ? mom.mean : null;
        row.sd = Number.isFinite(mom.sd) ? mom.sd : null;
      } catch {
        row.mean = null;
        row.sd = null;
      }

      // Goodness-of-fit tests — each one isolated so a failure only skips it.
      const cdfFn = (v) => dist.cdf(v, params);
      const quantileFn = (p) => dist.quantile(p, params);
      const refitHook = mcRefit
        ? (simSorted) => {
            try {
              const f2 = dist.fit(simSorted, { seed });
              if (!f2 || !f2.converged || !Number.isFinite(Number(f2.loglik))) return null;
              const p2 = f2.params;
              return (v) => dist.cdf(v, p2);
            } catch {
              return null;
            }
          }
        : undefined;
      for (const id of wantedTests) {
        const testFn = TESTS[id];
        if (typeof testFn !== 'function') continue;
        try {
          const res = testFn(xs, cdfFn, {
            k: row.k,
            alpha,
            B: Breps,
            seed,
            bins: binsOpt,
            quantileFn,
            refit: refitHook,
          });
          if (res && res.method !== 'none' && Number.isFinite(res.p)) {
            row.tests[id] = {
              stat: res.stat,
              p: res.p,
              crit: res.crit,
              pass: Boolean(res.pass),
              method: res.method,
            };
          }
        } catch (err) {
          out.warnings.push({
            dataset: name,
            distId: dist.id,
            reason: `检验 ${id} 失败：${err && err.message ? err.message : String(err)}`,
          });
        }
      }

      out.rows.push(row);
      fitted.push({ dist, params, row });
    }

    // ---- AIC ranking ----------------------------------------------------
    const usable = fitted
      .filter((f) => Number.isFinite(f.row.aic))
      .sort((a, b) => a.row.aic - b.row.aic);
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
          rank: i + 1,
        });
      });
      out.optimal.push({ dataset: name, distId: usable[0].dist.id, aic: usable[0].row.aic });
    } else {
      out.warnings.push({ dataset: name, distId: null, reason: '没有可排序的拟合结果（全部 na）' });
    }

    // ---- histogram / ECDF / curves / P-P / Q-Q / quantiles --------------
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
        cdf[i] = Number.isFinite(cv) ? clamp(cv, 0, 1) : null;
      }
      out.curves.push({ dataset: name, distId: dist.id, x: grid.slice(), pdf, cdf });

      const ppPoints = new Array(n);
      const qqPoints = new Array(n);
      for (let i = 0; i < n; i++) {
        const F = dist.cdf(xs[i], params);
        const emp = (i + 0.5) / n;
        ppPoints[i] = {
          theoretical: Number.isFinite(F) ? clamp(F, 0, 1) : emp,
          empirical: emp,
        };
        const Q = dist.quantile(emp, params);
        qqPoints[i] = {
          theoretical: Number.isFinite(Q) ? Q : null,
          sample: xs[i],
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
        values,
      });
    }
  });

  return out;
}

/** A row for a family that could not be fitted (kept for table completeness). */
function makeNaRow(dataset, dist, note) {
  return {
    dataset,
    distId: dist.id,
    distName: dist.name || dist.id,
    k: Number(dist.k) || 0,
    params: null,
    paramsText: '—',
    mean: null,
    sd: null,
    loglik: null,
    aic: null,
    bic: null,
    converged: false,
    na: true,
    note: note || 'fit-failed',
    tests: {},
  };
}
