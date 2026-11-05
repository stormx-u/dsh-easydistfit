/**
 * Bundle smoke test: load `lib/client.js` in a VM with stubbed React and a fake
 * `window.__ModuleLoader__`, then run the module factory.
 *
 * This catches template-string / top-level errors that a successful esbuild run
 * does not (e.g. a stray backtick inside the injected CSS string), which would
 * otherwise only surface as "client-modules: dsh-distfit import failed" in the
 * browser.
 */
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const bundlePath = path.join(root, 'lib', 'client.js')

const fails = []
const check = (label, ok, detail) => {
  if (!ok) fails.push(`${label}${detail ? ` - ${detail}` : ''}`)
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok || !detail ? '' : ` - ${detail}`}`)
}

const code = fs.readFileSync(bundlePath, 'utf8')
const react = {
  createElement: () => null,
  Fragment: 'frag',
  useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
  useEffect: () => {},
  useLayoutEffect: () => {},
  useMemo: (fn) => fn(),
  useRef: () => ({ current: null }),
  useCallback: (fn) => fn,
  useReducer: (reducer, init) => [init, () => {}],
  memo: (component) => component,
}
const requireStub = (name) => {
  if (name === 'react') return react
  if (name === 'react/jsx-runtime') return { jsx: () => null, jsxs: () => null, Fragment: 'frag' }
  if (name === 'react-dom' || name === 'react-dom/client') {
    return new Proxy({}, { get: () => () => null })
  }
  throw new Error(`unexpected external require: ${name}`)
}

const sandbox = {
  window: { __ModuleLoader__: { load: (entry) => (sandbox.__entry = entry) } },
  console,
  document: {
    createElement: () => ({ style: {} }),
    head: { appendChild() {} },
    body: { appendChild() {} },
    querySelector: () => null,
  },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  setTimeout,
  clearTimeout,
  requestAnimationFrame: (fn) => setTimeout(fn, 0),
  cancelAnimationFrame: (id) => clearTimeout(id),
  ResizeObserver: class {
    observe() {}
    disconnect() {}
  },
}
vm.createContext(sandbox)

let error = null
try {
  vm.runInContext(code, sandbox, { filename: 'client.js' })
} catch (thrown) {
  error = thrown
}
check('bundle evaluates in a DOM-less sandbox', error === null, error?.message)
check('bundle registers itself with __ModuleLoader__', sandbox.__entry?.id === 'dsh-distfit', sandbox.__entry?.id)

let mod = null
try {
  mod = sandbox.__entry?.factory(requireStub)
} catch (thrown) {
  error = thrown
}
check('module factory runs without throwing', mod !== null, error?.message)
check('module exports apply()', typeof mod?.apply === 'function')
check('module declares its inject list', Array.isArray(mod?.inject) && mod.inject.includes('slots'), JSON.stringify(mod?.inject))
check('bundle carries the loader wrapper', code.includes('window.__ModuleLoader__.load({'))

const kb = Math.round(code.length / 1024)
console.log(`bundle size ${kb} kB`)
if (fails.length) {
  console.log(`FAILED (${fails.length})`)
  for (const fail of fails) console.log(` - ${fail}`)
  process.exit(1)
}
console.log('PASS - client bundle loads and exports apply()')

