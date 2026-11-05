/**
 * Regenerates `src/client/ui/sample.js` — the deterministic demo dataset the
 * panel opens with. Synthetic but statistically *clean*: each column is drawn
 * from one known family, so the ranking table demonstrates a real fit instead
 * of showing "everything rejected".
 *
 * Usage: node scripts/make-sample.mjs
 */
import { writeFileSync } from 'node:fs'

const mulberry32 = (seed) => {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const normal = (rand) => {
  let u = 0
  let v = 0
  while (u === 0) u = rand()
  while (v === 0) v = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

const round = (x, d = 1) => Number(x.toFixed(d))

function normalSample(rand, n, mu, sigma) {
  return Array.from({ length: n }, () => round(mu + sigma * normal(rand)))
}

function lognormalSample(rand, n, mu, sigma) {
  return Array.from({ length: n }, () => round(Math.exp(mu + sigma * normal(rand))))
}

function weibullSample(rand, n, k, lambda) {
  return Array.from({ length: n }, () => round(lambda * Math.pow(-Math.log(1 - rand()), 1 / k)))
}

function gammaSample(rand, n, k, theta) {
  // Marsaglia–Tsang
  const out = []
  while (out.length < n) {
    const d = k - 1 / 3
    const c = 1 / Math.sqrt(9 * d)
    let x = 0
    let v = 0
    do {
      x = normal(rand)
      v = 1 + c * x
    } while (v <= 0)
    v = v * v * v
    const u = rand()
    if (u < 1 - 0.0331 * x * x * x * x || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      out.push(round(theta * d * v))
    }
  }
  return out
}

const rand = mulberry32(20260101)
const wood = normalSample(rand, 140, 20.5, 3.2)
const plastic = lognormalSample(rand, 130, Math.log(28), 0.28)
const fiber = weibullSample(rand, 120, 4.6, 30)

const body = `/**
 * Deterministic demo dataset (synthetic, seeded) used the first time the panel
 * opens. Each column is drawn from one known family on purpose — 木材 ≈ 正态,
 * 塑料 ≈ 对数正态, 纤维 ≈ Weibull — so the ranking table has a clear winner.
 * Regenerate with \`node scripts/make-sample.mjs\`.
 */
export const SAMPLE_COLUMNS = [
  {
    name: '木材',
    unit: 'MPa',
    values: [${wood.join(', ')}],
  },
  {
    name: '塑料',
    unit: 'MPa',
    values: [${plastic.join(', ')}],
  },
  {
    name: '纤维',
    unit: 'MPa',
    values: [${fiber.join(', ')}],
  },
]

export const SAMPLE_NAME = '示例：木材 / 塑料 / 纤维（${wood.length + plastic.length + fiber.length} 个数值，合成数据）'

export const SAMPLE_CSV = (() => {
  const names = SAMPLE_COLUMNS.map((column) => column.name)
  const rows = Math.max(...SAMPLE_COLUMNS.map((column) => column.values.length))
  const lines = [names.join(',')]
  for (let i = 0; i < rows; i += 1) {
    lines.push(SAMPLE_COLUMNS.map((column) => (i < column.values.length ? column.values[i] : '')).join(','))
  }
  return lines.join('\\n')
})()
`

writeFileSync(new URL('../src/client/ui/sample.js', import.meta.url), body, 'utf8')
console.log(`sample.js written: 木材 ${wood.length}, 塑料 ${plastic.length}, 纤维 ${fiber.length}`)
