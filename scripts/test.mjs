// Bundles the pure-logic tests with esbuild (stubbing Vite's import.meta.env)
// and runs them in node. No test framework — the assertions are in the file.
import { build } from 'esbuild'
import { spawnSync } from 'node:child_process'
import { rmSync } from 'node:fs'

const out = '.tmp-test.mjs'

await build({
  entryPoints: ['tests/logic.test.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  external: ['firebase', 'firebase/*'],
  define: { 'import.meta.env': '{}' },
  outfile: out,
  logLevel: 'error',
})

const res = spawnSync(process.execPath, [out], { stdio: 'inherit' })
rmSync(out, { force: true })
process.exit(res.status ?? 1)
