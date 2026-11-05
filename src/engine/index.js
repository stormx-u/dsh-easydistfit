/**
 * index.js — public API of the DistFit engine.
 *
 * Pure ESM, zero dependencies, no DOM / Node built-ins. Both halves of the DSH
 * plugin (browser panel + host) and the node self-tests import everything from
 * here, so this file is the single place where the engine surface is declared.
 *
 * ```js
 * import { analyze, DISTS } from './src/engine/index.js'
 * const result = analyze([{ name: '木材', values: [1, 2, 3] }], { dists: ['normal'] })
 * ```
 */

/* analysis pipeline + model selection ------------------------------------ */
export {
  analyze,
  aic,
  bic,
  aicWeights,
  ANALYZE_DEFAULTS,
  QUANTILE_PROBS,
} from './analyze.js';

/* distribution registry --------------------------------------------------- */
export { DISTS } from './distributions.js';

/* descriptive statistics / plots data ------------------------------------ */
export {
  describe,
  histogram,
  ecdf,
  quantile,
  sortNumbers,
  sum,
  mean,
  variance,
  clamp,
  freedmanDiaconisBins,
  quantileMoments,
} from './stats.js';

/* goodness-of-fit tests --------------------------------------------------- */
export {
  ksTest,
  adTest,
  cvmTest,
  chi2Test,
  ksStatistic,
  adStatistic,
  cvmStatistic,
  ksPValue,
  adPValue,
  adCorrect,
  cvmPValue,
  cvmCdfInf,
  besselKQuarterScaled,
  TESTS,
  TEST_IDS,
} from './tests.js';
