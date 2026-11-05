/**
 * DistFit client half entry — registers the sidebar panel icon and the central
 * panel into DSH's own slot tree.
 *
 * Slots used:
 *   sidebar.panellist  (list)  one icon cell; its list id addresses the main panel
 *   main               (keyed) central panel, keyed by that same id
 */
import { createElement as h } from 'react'
import DistFitApp from './ui/App.jsx'
import { CSS } from './ui/styles.js'

const PANEL_ID = 'distfit'
const NS = 'dsh-distfit'

export const inject = ['slots']

/** Sidebar icon: a fitted density curve over a histogram. */
function DistFitIcon(props) {
  const size = props?.size ?? 22
  return h(
    'svg',
    {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.7,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': 'true',
    },
    h('path', { d: 'M3 20h18', opacity: 0.55 }),
    h('path', { d: 'M4 17V9' }),
    h('path', { d: 'M8 17V6' }),
    h('path', { d: 'M12 17v-4' }),
    h('path', { d: 'M16 17V6' }),
    h('path', { d: 'M20 17V9' }),
    h('path', {
      d: 'M2.5 15c2.6-6.2 4.7-8.3 9.5-8.3s6.9 2.1 9.5 8.3',
      stroke: 'currentColor',
      opacity: 0.95,
    }),
  )
}

/**
 * Install the panel stylesheet once, as a plain <style> element. We deliberately
 * avoid the shell's `styles` service: reaching it would require declaring it in
 * `inject`, and the panel stylesheet is fully self-contained anyway.
 */
function installStyles() {
  const el = document.createElement('style')
  el.dataset.distfitStyle = '1'
  el.textContent = CSS
  document.head.appendChild(el)
  return () => el.remove()
}

export function apply(ctx) {
  const slots = ctx.slots ?? ctx.get?.('slots')
  if (!slots) {
    console.error('[distfit] slots service unavailable; panel not registered')
    return
  }

  const register = (slot, descriptor, Component, label) => {
    try {
      const unregister = slots.register({ ...descriptor, name: slot }, Component)
      return () => {
        try {
          unregister()
        } catch {}
      }
    } catch (error) {
      console.error(`[distfit] ${label} registration failed`, error)
      return () => {}
    }
  }

  ctx.effect(() => {
    const disposeStyles = installStyles()

    const offIcon = slots.inject
      ? slots.inject('sidebar.panellist', () =>
          register(
            'sidebar.panellist',
            { id: PANEL_ID, order: 40, label: () => '分布拟合' },
            DistFitIcon,
            'sidebar icon',
          ),
        )
      : register('sidebar.panellist', { id: PANEL_ID, order: 40, label: '分布拟合' }, DistFitIcon, 'sidebar icon')

    const offPanel = slots.inject
      ? slots.inject('main', () =>
          register('main', { key: PANEL_ID }, DistFitApp, 'main panel'),
        )
      : register('main', { key: PANEL_ID }, DistFitApp, 'main panel')

    return () => {
      try {
        offPanel?.()
      } catch {}
      try {
        offIcon?.()
      } catch {}
      try {
        disposeStyles?.()
      } catch {}
    }
  }, `${NS}: panel slots`)

  console.info('[distfit] client half applied')
}
