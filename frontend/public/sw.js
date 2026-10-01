/*
 * NextViewMove admin service worker.
 *
 * Purpose: make the admin app installable and keep the static shell reachable
 * so a cold start still works. That is all it does.
 *
 * What it deliberately never does: store anything from the API. Leads,
 * customers, notes, follow-ups, documents, signatures and the admin profile
 * are always fetched live from the backend, so an offline session surfaces the
 * app's own error states instead of inventing or replaying data.
 */

const VERSION = 'v1'
const STATIC_CACHE = `nvm-static-${VERSION}`

/** Resolves against the worker's own URL, so a non-root Vite `base` works. */
const SHELL_URL = new URL('index.html', self.registration.scope).pathname

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.add(new Request(SHELL_URL, { cache: 'reload' })))
      // A failed precache must not block installation; navigations still
      // populate the cache on their first successful load.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  // Never intercept writes.
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Hard boundaries. The API lives on another origin in development and is
  // always authorised with a bearer token, so this keeps every lead, customer,
  // note, document, signature and admin response out of the cache even if the
  // API is ever served from the same origin.
  if (url.origin !== self.location.origin) return
  if (url.pathname.includes('/api/')) return
  if (request.headers.has('Authorization')) return

  // The manifest must stay fresh or install prompts go stale.
  if (url.pathname.endsWith('.webmanifest')) return

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request))
    return
  }

  event.respondWith(handleAsset(request))
})

/**
 * Network-first so the admin shell and its hashed bundles are always current
 * while online, falling back to the cached shell only when the network is
 * genuinely unavailable.
 */
async function handleNavigation(request) {
  const cache = await caches.open(STATIC_CACHE)
  try {
    const response = await fetch(request)
    if (response && response.ok && response.type === 'basic') {
      await cache.put(SHELL_URL, response.clone())
    }
    return response
  } catch (error) {
    const cached = await cache.match(SHELL_URL)
    if (cached) return cached
    throw error
  }
}

/**
 * Stale-while-revalidate for static build output. Vite fingerprints
 * `/assets/*`, so a redeploy produces new URLs and is picked up immediately;
 * icons and fonts simply refresh in the background.
 */
async function handleAsset(request) {
  const cache = await caches.open(STATIC_CACHE)
  const cached = await cache.match(request)

  const revalidate = fetch(request)
    .then((response) => {
      if (response && response.ok && response.type === 'basic') {
        void cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => undefined)

  if (cached) {
    void revalidate
    return cached
  }

  const response = await revalidate
  if (response) return response
  return new Response('', { status: 504, statusText: 'Offline and not cached' })
}
