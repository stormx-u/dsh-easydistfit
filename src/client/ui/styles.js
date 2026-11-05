/**
 * DistFit visual system — the single source of truth for the panel's colors,
 * spacing and CSS. `CSS` is inserted once by the client entry through the
 * shell's `styles` service, so every selector is namespaced with `df-`.
 * `PALETTE` is the distribution color wheel shared with the chart components.
 */

/** Mid-tone, colorblind-tolerant categorical palette that reads on light and dark. */
export const PALETTE = [
  '#4c7dff',
  '#f0a04b',
  '#17b3a3',
  '#e2556f',
  '#94a1b3',
  '#8b5cf6',
  '#c99a17',
  '#3ea45d',
  '#dd6ba8',
  '#a9713f',
  '#2f9ee8',
  '#0e8390',
  '#5c6fd6',
  '#d97b1f',
  '#3f9e86',
  '#a3568f',
  '#7fa53a',
  '#55708f',
  '#e8825f',
  '#7a6ff0',
  '#c94f68',
  '#b3591f',
  '#6b8f3a',
]

export const CSS = `
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
`
