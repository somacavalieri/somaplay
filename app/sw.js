/* Soma_play — Service Worker: shell precache + cache-first (offline total) */
const VERSION = 'somaplay-v22';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/main.js',
  './js/state.js',
  './js/db.js',
  './js/audio.js',
  './js/chords.js',
  './js/chords-catalog.js',
  './js/chordbook.js',
  './js/chord-notation.js',
  './js/scroll-speed.js',
  './js/backup.js',
  './js/merge.js',
  './js/icons.js',
  './js/samples.js',
  './js/i18n.js',
  './js/i18n/pt.js',
  './js/i18n/en.js',
  './js/render/home.js',
  './js/render/artist.js',
  './js/render/listscreen.js',
  './js/render/listdrag.js',
  './js/render/play.js',
  './js/render/chordeditor.js',
  './js/render/chordpop.js',
  './js/render/chordbookscreen.js',
  './js/render/addedit.js',
  './js/render/settings.js',
  './js/render/estilo.js',
  './js/render/popover.js',
  './fonts/sora-latin.woff2',
  './fonts/sora-latin-ext.woff2',
  './fonts/inter-latin.woff2',
  './fonts/inter-latin-ext.woff2',
  './fonts/jbmono-latin.woff2',
  './fonts/jbmono-latin-ext.woff2',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Cache-first; fallback pra rede e guarda o que vier (mesma origem).
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(e.request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      });
    })
  );
});
