import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ command, mode }) => {
  const localEnv = loadEnv(mode, process.cwd(), '')
  const keyPath = localEnv.EIDA_DEV_HTTPS_KEY
  const certPath = localEnv.EIDA_DEV_HTTPS_CERT

  if (command === 'serve' && Boolean(keyPath) !== Boolean(certPath)) {
    throw new Error('Configure both EIDA_DEV_HTTPS_KEY and EIDA_DEV_HTTPS_CERT, or neither.')
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      // Use --host 0.0.0.0 for LAN; keep the usual localhost default otherwise.
      port: 5173,
      strictPort: true,
      https: command === 'serve' && keyPath && certPath
        ? { key: readFileSync(keyPath), cert: readFileSync(certPath) }
        : undefined,
      proxy: {
        '^/backend(?:/|\\?|$)': {
          target: 'http://127.0.0.1:8000',
          // Preserve the browser's host/origin and forward its HTTP/HTTPS scheme.
          changeOrigin: false,
          xfwd: true,
          rewrite: (path) => {
            const rewritten = path.replace(/^\/backend(?=\/|\?|$)/, '')
            return rewritten.startsWith('/') ? rewritten : `/${rewritten}`
          },
        },
        // Laravel's asset('storage/...') also emits this unprefixed path.
        '^/storage(?:/|\\?|$)': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: false,
          xfwd: true,
        },
      },
    },
  }
})
