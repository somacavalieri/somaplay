/* Soma_play — Service Worker: shell precache + cache-first (offline total) */
const VERSION = 'somaplay-0.15.0';
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
  './js/transpose.js',
  './js/scroll-speed.js',
  './js/backup.js',
  './js/merge.js',
  './js/partes.js',
  './js/icons.js',
  './js/initials.js',
  './js/samples.js',
  './js/version.js',
  './js/pdf.js',
  './js/i18n.js',
  './js/i18n/pt.js',
  './js/i18n/en.js',
  './js/render/home.js',
  './js/render/artist.js',
  './js/render/listscreen.js',
  './js/render/listdrag.js',
  './js/render/play.js',
  './js/render/songnav.js',
  './js/render/chordeditor.js',
  './js/render/chordpop.js',
  './js/render/tompop.js',
  './js/render/chordbookscreen.js',
  './js/render/addedit.js',
  './js/render/settings.js',
  './js/render/sharesheet.js',
  './js/render/estilo.js',
  './js/render/popover.js',
  './js/render/fontestrip.js',
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

// A biblioteca de terceiro que desenha PDF. Array separado do SHELL de propósito:
// o install() abaixo cacheia este array à parte e engole a falha dele — um
// .wasm esquecido aqui não derruba a instalação do app todo, só deixa os
// livros sem funcionar offline. O teste do SHELL compara este array com o que
// existe em js/vendor.
const VENDOR = [
  './js/vendor/pdfjs/pdf.mjs',
  './js/vendor/pdfjs/pdf.worker.mjs',
  './js/vendor/pdfjs/LICENSE',
  './js/vendor/pdfjs/wasm/jbig2.wasm',
  './js/vendor/pdfjs/wasm/openjpeg.wasm',
  './js/vendor/pdfjs/wasm/qcms_bg.wasm',
  './js/vendor/pdfjs/wasm/LICENSE_JBIG2',
  './js/vendor/pdfjs/wasm/LICENSE_OPENJPEG',
  './js/vendor/pdfjs/wasm/LICENSE_PDFJS_JBIG2',
  './js/vendor/pdfjs/wasm/LICENSE_PDFJS_OPENJPEG',
  './js/vendor/pdfjs/wasm/LICENSE_PDFJS_QCMS',
  './js/vendor/pdfjs/wasm/LICENSE_QCMS',
  './js/vendor/pdfjs/standard_fonts/FoxitDingbats.pfb',
  './js/vendor/pdfjs/standard_fonts/FoxitFixed.pfb',
  './js/vendor/pdfjs/standard_fonts/FoxitFixedBold.pfb',
  './js/vendor/pdfjs/standard_fonts/FoxitFixedBoldItalic.pfb',
  './js/vendor/pdfjs/standard_fonts/FoxitFixedItalic.pfb',
  './js/vendor/pdfjs/standard_fonts/FoxitSerif.pfb',
  './js/vendor/pdfjs/standard_fonts/FoxitSerifBold.pfb',
  './js/vendor/pdfjs/standard_fonts/FoxitSerifBoldItalic.pfb',
  './js/vendor/pdfjs/standard_fonts/FoxitSerifItalic.pfb',
  './js/vendor/pdfjs/standard_fonts/FoxitSymbol.pfb',
  './js/vendor/pdfjs/standard_fonts/LICENSE_FOXIT',
  './js/vendor/pdfjs/standard_fonts/LICENSE_LIBERATION',
  './js/vendor/pdfjs/standard_fonts/LiberationSans-Bold.ttf',
  './js/vendor/pdfjs/standard_fonts/LiberationSans-BoldItalic.ttf',
  './js/vendor/pdfjs/standard_fonts/LiberationSans-Italic.ttf',
  './js/vendor/pdfjs/standard_fonts/LiberationSans-Regular.ttf',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(SHELL).then(() => c.addAll(VENDOR).catch((err) => {
        // VENDOR não pode derrubar a instalação do app inteiro: sem ele os
        // livros em PDF não abrem offline, mas cifra, áudio e tudo mais seguem
        // funcionando. SHELL continua exigindo tudo — essa parte é essencial.
        console.warn('SW: falha ao cachear VENDOR (livros em PDF ficarão sem offline)', err);
      })))
      .then(() => self.skipWaiting())
  );
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
