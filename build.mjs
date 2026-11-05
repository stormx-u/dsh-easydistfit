import { build } from 'esbuild'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(root, 'lib/client.js')

/**
 * The DSH web shell loads a plugin's browser half as a classic script that
 * registers itself on `window.__ModuleLoader__`; the factory receives a
 * `require` bound to the shell's shared modules (react, react-dom, ...).
 * esbuild produces the CJS body, this wrapper supplies the loader contract.
 */
function wrapBody(id, code) {
  return `window.__ModuleLoader__.load({
	id: ${JSON.stringify(id)},
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
${code}
		return module.exports;
	}
});
`
}

async function bundleClient() {
  const result = await build({
    entryPoints: [resolve(root, 'src/client/index.jsx')],
    bundle: true,
    write: false,
    format: 'cjs',
    platform: 'browser',
    target: ['chrome120'],
    jsx: 'automatic',
    external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'],
    legalComments: 'none',
    logLevel: 'warning',
    define: {
      'process.env.NODE_ENV': '"production"',
    },
  })
  const code = result.outputFiles[0].text
  await mkdir(dirname(OUT), { recursive: true })
  await writeFile(OUT, wrapBody('dsh-distfit', code), 'utf8')
  const kb = (Buffer.byteLength(code) / 1024).toFixed(1)
  console.log(`✓ lib/client.js  (${kb} kB bundled + loader wrapper)`)
}

await bundleClient()
