const CACHE = 'usev-v3.6';
const SHELL = [
  './',
  './index.html',
  './login.html',
  './moderator.html',
  './editor.html',
  './projeksiyon.html',
  './istatistik.html',
  './usev-sound.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-apple.png',
  './favicon.png',
  './js/core/firebase.js',
  './js/core/auth.js',
  './js/core/paths.js',
  './js/moderator/game.js',
  './js/moderator/ui.js',
  './js/moderator/listeners.js',
  './js/moderator/shortcuts.js',
  './js/moderator/account.js',
  './js/moderator/stats.js',
  './js/utils/crypto.js'
];


// Install: cache the app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate: clear old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: Stale-while-revalidate for local assets, network-only for Firebase/CDNs
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always network for external APIs / CDNs
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('google') ||
    url.hostname.includes('jsdelivr') ||
    url.hostname.includes('cdnjs') ||
    url.hostname.includes('qrserver')
  ) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      const networked = fetch(e.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return response;
      }).catch(() => null);

      return cached || networked;
    }).catch(() => caches.match('./index.html'))
  );
});
