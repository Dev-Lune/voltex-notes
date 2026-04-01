// scripts/electron-build.mjs
import { build } from 'esbuild'
import { mkdir } from 'fs/promises'

await mkdir('dist-electron', { recursive: true })

// Bundle main process (includes ipc/ modules)
await build({
  entryPoints: ['electron/main.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  external: [
    'electron',
  ],
  outfile: 'dist-electron/main.js',
  format: 'cjs',
})

// Bundle preload separately (renderer context)
await build({
  entryPoints: ['electron/preload.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  external: ['electron'],
  outfile: 'dist-electron/preload.js',
  format: 'cjs',
})

console.log('Electron build complete.')
