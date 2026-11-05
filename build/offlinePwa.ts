import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'

export function offlineWorkerSource(
  urls: string[],
  cacheName: string,
  base: string,
): string {
  return `/* EIDA public application shell only. Private data belongs in IndexedDB. */
const CACHE = ${JSON.stringify(cacheName)};
const URLS = ${JSON.stringify(urls)};
const ALLOWED = new Set(URLS.map(path => new URL(path, self.location.origin).href));
const SHELL = ${JSON.stringify(base + 'index.html')};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(URLS.map(url => new Request(url, { credentials: 'omit', cache: 'reload' })))));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('eida-offline-shell-') && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  const localPath = url.pathname.slice(${base.length - 1});
  if (request.mode === 'navigate' && (/^\\/exams\\/[1-9]\\d*\\/offline\\/?$/.test(localPath) || /^\\/offline\\/?$/.test(localPath))) {
    event.respondWith(caches.open(CACHE).then(cache => cache.match(SHELL)).then(response => response || fetch(request)));
    return;
  }
  // No runtime caching: API, storage/photos, auth, cross-origin and other URLs bypass this worker.
  if (!ALLOWED.has(url.href) || request.mode === 'navigate') return;
  event.respondWith(caches.open(CACHE).then(cache => cache.match(request, { ignoreVary: true })).then(response => response || fetch(request)));
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'EIDA_VERIFY_SHELL' || !event.ports[0]) return;
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);
      const ready = (await Promise.all(URLS.map(url => cache.match(url)))).every(Boolean);
      event.ports[0].postMessage({ type: 'EIDA_SHELL_STATUS', ready, version: CACHE });
    } catch { event.ports[0].postMessage({ type: 'EIDA_SHELL_STATUS', ready: false }); }
  })());
});
`
}

export function offlinePwaPlugin(): Plugin {
  let base = '/'
  let publicDir = ''
  return {
    name: 'eida-offline-shell',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      base = config.base
      publicDir = config.publicDir
      if (base !== '/')
        throw new Error(
          'EIDA offline currently requires root-path deployment; review manifest and routes before using a subpath.',
        )
    },
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const files = Object.values(bundle).filter((item) =>
          /\.(?:html|js|css|woff2?|svg|png|webp|jpe?g)$/.test(item.fileName),
        )
        const version = createHash('sha256')
        version.update(readFileSync(resolve(publicDir, 'manifest.webmanifest')))
        version.update(readFileSync(resolve(publicDir, 'eida-offline.svg')))
        for (const item of files.sort((a, b) =>
          a.fileName.localeCompare(b.fileName),
        )) {
          version.update(item.fileName)
          version.update(
            item.type === 'chunk'
              ? item.code
              : typeof item.source === 'string'
                ? item.source
                : item.source,
          )
        }
        const urls = [
          ...new Set([
            ...files.map((item) => base + item.fileName),
            base + 'index.html',
            base + 'manifest.webmanifest',
            base + 'eida-offline.svg',
          ]),
        ]
        this.emitFile({
          type: 'asset',
          fileName: 'offline-sw.js',
          source: offlineWorkerSource(
            urls,
            'eida-offline-shell-' + version.digest('hex').slice(0, 16),
            base,
          ),
        })
      },
    },
  }
}
