/**
 * Human-readable formulas / support / parameter meaning for every family.
 * Display-only: the engine owns the numerics, this table explains them.
 */

export const FORMULAS = {
  normal: {
    plain: 'f(x) = 1/(σ√(2π)) · exp[−(x−μ)²/(2σ²)]',
    support: 'x ∈ (−∞, +∞)',
    note: 'μ 为均值（位置），σ 为标准差（尺度）',
  },
  logistic: {
    plain: 'f(x) = exp[−(x−μ)/s] / {s·[1+exp(−(x−μ)/s)]²}',
    support: 'x ∈ (−∞, +∞)',
    note: 'μ 为位置，s 为尺度，标准差 = πs/√3',
  },
  laplace: {
    plain: 'f(x) = 1/(2b) · exp(−|x−μ|/b)',
    support: 'x ∈ (−∞, +∞)',
    note: 'μ 为位置（中位数），b 为尺度，标准差 = √2·b',
  },
  cauchy: {
    plain: 'f(x) = 1/{πγ[1+((x−x₀)/γ)²]}',
    support: 'x ∈ (−∞, +∞)',
    note: 'x₀ 为中位数（位置），γ 为半高半宽（尺度）；无有限方差',
  },
  uniform: {
    plain: 'f(x) = 1/(b−a)，a ≤ x ≤ b',
    support: 'a ≤ x ≤ b',
    note: 'a 为下限，b 为上限',
  },
  lognormal: {
    plain: 'f(x) = 1/(xσ√(2π)) · exp[−(ln x−μ)²/(2σ²)]',
    support: 'x > 0',
    note: 'μ、σ 为 ln x 的均值与标准差；均值 = exp(μ+σ²/2)',
  },
  gamma: {
    plain: 'f(x) = x^(α−1)·exp(−x/β) / [β^α·Γ(α)]',
    support: 'x > 0',
    note: 'α 为形状，β 为尺度，均值 = αβ，方差 = αβ²',
  },
  weibull: {
    plain: 'f(x) = (k/λ)·(x/λ)^(k−1)·exp[−(x/λ)^k]',
    support: 'x > 0',
    note: 'k 为形状（k<1 早期失效、k≈1 随机失效、k>1 磨损失效），λ 为尺度',
  },
  exponential: {
    plain: 'f(x) = (1/λ)·exp(−x/λ)',
    support: 'x > 0',
    note: 'λ 为尺度，等于均值与标准差',
  },
  rayleigh: {
    plain: 'f(x) = (x/σ²)·exp[−x²/(2σ²)]',
    support: 'x ≥ 0',
    note: 'σ 为尺度；均值 = σ√(π/2)',
  },
  invgauss: {
    plain: 'f(x) = √(λ/(2πx³))·exp[−λ(x−μ)²/(2μ²x)]',
    support: 'x > 0',
    note: 'μ 为均值，λ 为形状参数',
  },
  loglogistic: {
    plain: 'f(x) = (c/λ)(x/λ)^(c−1) / [1+(x/λ)^c]²',
    support: 'x > 0',
    note: 'c 为形状，λ 为尺度（中位数）；c < 1 时尾部更重',
  },
  lomax: {
    plain: 'f(x) = α/λ · [1+x/λ]^(−(α+1))',
    support: 'x > 0',
    note: 'α 为形状（尾部指数），λ 为尺度；α > 2 时方差有限',
  },
  burr: {
    plain: 'f(x) = ck/λ · (x/λ)^(c−1) · [1+(x/λ)^c]^(−k−1)',
    support: 'x > 0',
    note: 'c、k 为形状，λ 为尺度；三参数族，覆盖较宽偏度/峰度',
  },
  fatiguelife: {
    plain: 'f(x) = [√(x/β)+√(β/x)]/(2cφ(x/β)) · exp[−(√(x/β)−√(β/x))²/(2c²)]',
    support: 'x > 0',
    note: 'β 为尺度（中位数），c 为形状；Birnbaum–Saunders 疲劳寿命模型',
  },
  nakagami: {
    plain: 'f(x) = 2ν^ν/(Γ(ν)ω^ν) · x^(2ν−1)·exp(−νx²/ω)',
    support: 'x > 0',
    note: 'ν 为形状，ω 为尺度平方（E[x²]）',
  },
  maxwell: {
    plain: 'f(x) = √(2/π)·x²/a³ · exp[−x²/(2a²)]',
    support: 'x > 0',
    note: 'a 为尺度（分子速率参数），均值 = 2a√(2/π)',
  },
  chi2: {
    plain: 'f(x) = x^(df/2−1)·exp(−x/2) / [2^(df/2)·Γ(df/2)]',
    support: 'x > 0',
    note: 'df 为自由度（形状），尺度固定为 1',
  },
  halfnormal: {
    plain: 'f(x) = √(2)/(σ√π) · exp[−x²/(2σ²)]',
    support: 'x > 0',
    note: 'σ 为母体正态的标准差（尺度）',
  },
  beta: {
    plain: 'f(x) = (x−loc)^(a−1)(loc+scale−x)^(b−1) / [B(a,b)·scale^(a+b−1)]',
    support: 'loc < x < loc+scale',
    note: 'a、b 为形状参数，loc/scale 把 [0,1] 映射到实际区间',
  },
  gumbel: {
    plain: 'f(x) = (1/α)·exp[−(x−β)/α]·exp{−exp[−(x−β)/α]}',
    support: 'x ∈ (−∞, +∞)',
    note: 'β 为位置，α 为尺度；年最大值型的经典极值分布',
  },
  gev: {
    plain: 'f(x) = (1/σ)[1+ξ(x−μ)/σ]^(−1/ξ−1)·exp{−[1+ξ(x−μ)/σ]^(−1/ξ)}',
    support: '1 + ξ(x−μ)/σ > 0',
    note: 'ξ 为形状（ξ=0 退化为 Gumbel，ξ<0 Weibull 型，ξ>0 Fréchet 型）',
  },
  gpd: {
    plain: 'f(x) = (1/σ)[1+ξ(x−μ)/σ]^(−1/ξ−1)',
    support: 'x > μ 且 1+ξ(x−μ)/σ > 0',
    note: 'ξ 为形状（尾部指数），μ 为阈值，σ 为尺度；超阈值极值建模',
  },
}

/** One-line recommendation hint shown next to a family in the picker. */
export const FAMILY_HINT = {
  normal: '对称、轻尾的测量数据',
  logistic: '比正态尾部略重的对称数据',
  laplace: '双指数、尖峰厚尾',
  cauchy: '极重尾、中位数稳定',
  uniform: '等可能的有界数据',
  lognormal: '正偏的强度/寿命/粒径',
  gamma: '正偏、可含零点的持续量',
  weibull: '寿命、疲劳、强度（可靠性）',
  exponential: '恒定失效率的寿命',
  rayleigh: '幅值、振动、风载',
  invgauss: '首达时间、退化失效',
  loglogistic: '正偏、尾部适中的寿命',
  lomax: '厚尾损失/收入类数据',
  burr: '偏度峰度跨度大的厚尾数据',
  fatiguelife: '裂纹扩展、疲劳寿命',
  nakagami: '无线信道、回波幅值',
  maxwell: '分子速率、三维幅值',
  chi2: '方差估计、独立性检验量',
  halfnormal: '｜正态｜的半正态量',
  beta: '比例、合格率等有界量',
  gumbel: '年最大洪水/风速/极值',
  gev: '多站点极值、重现期设计值',
  gpd: '超阈值（POT）极值尾部',
}
