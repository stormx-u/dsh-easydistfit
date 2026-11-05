# DistFit 设计说明

这份文档描述插件的内部分层与接口约定，方便二次开发；使用与功能说明见 [README](../README.md)。

## 1. 总体结构

一个 DSH 插件由两个半边组成，共用同一份纯 JS 统计引擎：

```
src/engine/        纯 JS 引擎（无 DOM、无 Node 内置模块），浏览器与 Host 共用
src/host/          Host 半边（ESM，Node 进程内直接加载）：工具 + HTTP 路由 + AI 调用
src/client/        浏览器半边（React，无 JSX 运行时依赖）：侧栏面板 + 图表 + 导出
lib/client.js      构建产物：esbuild 把 src/client 打成一个 CJS 工厂，外面套 DSH 的
                   window.__ModuleLoader__ 外壳，由 lib/client.js 直接提供
```

`package.json` 的 `exports`：

- `"."` → `src/host/index.js`（Host 半边入口，导出 `apply(ctx)`）
- `"./client"` → `lib/client.js`（浏览器半边，由 web 服务以 `/plugins/<id>/client.js` 提供）

`dsh.client.inject` 声明浏览器半边依赖的 DSH 客户端服务；Host 半边用 `ctx.inject([...], cb)` 惰性拿服务（`tools`、`webServer`、`llm`、`agentDefaultModel`）。两者都必须在 `ctx.effect(...)` 里注册可撤销的副作用，因为插件可能被热停用。

## 2. 引擎契约 `src/engine/**`

约束：只能使用 `Math`、TypedArray 与普通对象——同一份代码要能在浏览器、Host 进程、`node scripts/*.mjs` 三种环境跑；禁止 `fs` / `window` / `Buffer` / `require` / `process`。零第三方依赖（不依赖 scipy，特殊函数自己实现）。

### 2.1 分布注册表

`distributions.js` 的 `DISTS` 是数组，每项：

```js
{
  id, name,            // 'normal' / '正态分布'
  group,               // '位置-尺度型' | '正偏寿命型' | '极值型' | '有界与其他'
  k,                   // 参数个数
  support,             // 'real' | 'positive' | 'bounded'
  paramNames,          // 参数中文名，用于参数文本
  params,              // [{name, symbol, scale}] 估计与初值元数据
  fit(xs, opts),       // 极大似然
  pdf(x, p), cdf(x, p), quantile(q, p),
  supportOf(p),        // 有界分布的支撑
  describe(p),         // 中文参数文本，如 'μ 位置=20.53, σ 尺度=2.972'
}
```

新增分布族只需往 `DISTS` 加一项并补 `special.js` 需要的基础函数；引擎、表格、图例、AI 摘要、导出都会自动带上。

### 2.2 `analyze(table, options, log?)`

```js
analyze(
  { columns: [{ name, values }] },
  { dists: ['normal', ...], tests: ['ks','ad','cvm','chi2'], alpha: 0.05,
    B: 0, bins: 0, seed: 20260101, maxDists: 12, gridSize: 240, mcRefit: false },
)
```

返回：

```js
{
  datasets: [{ name, n, values, stats, quantiles, histogram, optimal, ... }],
  rows:      [{ dataset, distId, name, k, params, logLik, aic, bic, tests: {...} }],
  ranking:   [{ dataset, distId, rank, deltaAic, weight, verdict }],
  curves:    [{ dataset, distId, points: [{x, y}] }],
  pp, qq,    // 概率图点集 {dataset, distId, points:[{theoretical, empirical}]}
  quantiles, // 分位数表
  optimal,   // 每个数据集的最优分布
  warnings,
}
```

检验的 p 值默认用渐近近似；`B > 0` 时改为参数自举的蒙特卡洛校准（`mcRefit` 控制是否每次重估参数）。引擎不做任何渲染，图表所需的曲线网格由 `gridSize` 决定。

## 3. Host 半边 `src/host/**`

### 3.1 工具

`distfit_fit`：接收 CSV/TSV 文本或 `{name, values}[]`、列名与分布子集，返回排名表、最优分布、Markdown 摘要；`output.render` 给对话渲染文本。工具在 `ctx.effect(() => ctx.tools.register(def), 'distfit tool')` 里注册。

### 3.2 HTTP 路由

路由必须注册在 `/api/` 前缀下（其它前缀会被连接的信任层直接 400），处理器是 Node 风格 `(req, res)`：

| 路由 | 方法 | 说明 |
|---|---|---|
| `/api/dsh-distfit/health` | GET | `{ok, plugin, families, explain, chartStyle}` |
| `/api/dsh-distfit/families` | GET | 23 个分布族的元数据 |
| `/api/dsh-distfit/explain` | POST | 结果摘要 → AI 解读文本 |
| `/api/dsh-distfit/chart-style` | POST | 自然语言出图要求 → 样式补丁 |

请求体上限 64 KiB，`explain` 120 秒超时；失败一律 200 + `{ok:false, error}`，让前端能显示中文原因。

### 3.3 模型调用

不保存任何密钥：`POST .../explain` 与 `.../chart-style` 都用 DSH 的 `llm` 服务，按「助手当前默认模型」（`agentDefaultModel.currentSelection()`）发起一次短补全，取不到时按 provider 偏好与模型能力（`effort`/`maxTokens`）自动挑一个可用模型。浏览器永远不接触凭据。

- `explain.js`：把统计摘要压缩成结构化摘要（列形态、分位数、直方图、最优分布族与 P-P 偏差、AIC 排名、告警），提示词要求四段式输出，第一段专门解释「数据说明了什么」。
- `chartStyle.js`：`STYLE_FIELDS` 白名单 + 范围裁剪，模型只能产出样式补丁，不能改数据、不能注入任意 CSS/HTML。

## 4. 浏览器半边 `src/client/**`

### 4.1 注册

`index.jsx` 用 `ctx.slots.register` 注册侧栏图标 `sidebar.panellist`（id `distfit`）与中央面板 `main`（key `distfit`），面板根节点带 `data-distfit-root` 供测试定位。样式全部注入到 `ctx.styles`，颜色走主题变量（`--df-*` 由 `theme` 服务解析，跟随明暗模式）。

### 4.2 图表组件 `ui/charts.jsx`

`HistFitChart`、`CdfChart`、`PpChart`、`QqChart` 统一接受：

```js
{ /* 数据 */ ..., width?, height?, style?: ChartStyle, legendMode?: 'none'|'html'|'svg' }
```

- `ChartStyle` 由 `chartStyle.js` 归一化（字体栈、字号/线宽倍率、配色、灰度、网格、坐标轴 L/box、图例位置与字号、图注标题、柱体透明度/描边、透明背景）。
- 坐标轴边距与刻度数量随字号放大，避免打印大字号时标签被裁掉。
- 图表自身用 `ResizeObserver` 量尺寸，不传 `width/height` 时按容器宽度铺满。
- 图内图例排版集中在 `chartLegend.js`（换行、溢出、绘图区缩进），可回归测试。

### 4.3 导出管线 `ui/chartExport.js`

1. 对话框把图表离屏渲染到 `.df-export-stage`（尺寸 = 目标像素）；
2. `buildExportSvg(svgEl, options)` 把计算后的样式内联进一份独立 SVG（字体、渐变、灰度、背景、网格开关）；
3. 预览直接用这份 SVG 的 data URL —— 预览即导出；
4. PNG/JPG：把 SVG 画到 canvas 按 `scale` 栅格化；PDF：内嵌 2× JPEG 的单页 PDF（手写对象表，无第三方库）。

灰度按 BT.601 亮度换算；暗色主题下导出会自动把浅色文字/参考线换成适合白底的深色。

### 4.4 模板与 AI 样式 `ui/chartStyle.js`、`ui/exportPanel.jsx`

模板是样式补丁（`TEMPLATE_PRESETS`），用户自定义模板存 `localStorage`（`distfit.templates.v1`）。AI 页签把「用途描述 + 当前图表上下文」发给 `.../chart-style`，把返回的 `preset + style` 应用到预览并显示 `notes`。

## 5. 测试

```bash
npm test              # 引擎、端到端统计、Host 工具、AI 摘要、图表导出、图例、样式
npm run test:chart    # 只跑导出（灰度、文件名、PDF 结构）
npm run test:host     # 只跑 Host 工具与路由（伪造 Context）
```

所有测试都是 `node scripts/*.mjs` 形式的纯 Node 脚本，不依赖浏览器或测试框架。

## 6. 开发注意事项

- 改 `src/client/**` 后必须 `node build.mjs`，`lib/client.js` 是构建产物，不要手改。
- esbuild 会把字符串里的中文转成 `\uXXXX` 转义，`grep` 中文字面量在产物里搜不到，属正常现象。
- 插件安装进 profile 时是**复制**到 `.generations/live/<pkg>+<version>/`，不是软链；改完要重新构建并重装（或用 `dsh plugin --profile web add link:<path>` 链接安装，便于边改边看）。
- Host 半边在进程启动时加载：**改了 `src/host/**` 需要重启 DSH**；只改客户端刷新页面即可。
- 排版与统计约定：报告里所有阈值（α、AIC、ΔAIC ≤ 2）都应显式写出，避免读者把「排名第一」当成「就是它」。
