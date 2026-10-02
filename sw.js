/* Service worker — lets the app OPEN without a connection (v1.3.5).
   - The app page (index.html / batch.html): network-first. Online you always get the
     latest deployed version; if the network is down or too slow (3 s), the last copy
     saved on this phone is used instead.
   - The Supabase library (CDN): served from the phone, refreshed in the background.
   - Supabase data/auth requests are never touched — the app's outbox handles those.
   Bump VERSION on every deploy that changes this file. */
const VERSION = '1.3.5';
const CACHE = 'couple-' + VERSION;
const SUPA_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
const PRECACHE = ['./', './index.html', SUPA_JS];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Add one by one so a single failure (e.g. CDN hiccup) doesn't abort install.
    await Promise.all(PRECACHE.map(u => cache.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('couple-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function timeout(ms) { return new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)); }

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await Promise.race([fetch(req), timeout(3000)]);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    // ignoreSearch: the home-screen link has ?v=2 — any query string maps to the same page.
    const hit = await cache.match(req, { ignoreSearch: true })
             || (req.mode === 'navigate' ? await cache.match('./', { ignoreSearch: true }) || await cache.match('./index.html') : null);
    if (hit) return hit;
    throw e;
  }
}

async function cacheFirstRefresh(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  const refresh = fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
  return hit || (await refresh) || Response.error();
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.href.startsWith(SUPA_JS) || url.hostname === 'cdn.jsdelivr.net') { event.respondWith(cacheFirstRefresh(req)); return; }
  if (url.origin === self.location.origin) { event.respondWith(networkFirst(req)); return; }
  // everything else (Supabase API, auth, realtime): straight to the network
});
