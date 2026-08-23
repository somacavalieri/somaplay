// pdf.js — the boundary around the vendored PDF renderer.
//
// Nothing else in the app imports pdf.js. A breaking change upstream, or
// swapping the renderer altogether, has to touch this file and no other.
// Design: docs/superpowers/specs/2026-08-22-livros-pdf-design.md
//
// The vendored library is loaded LAZILY — `await import('./vendor/pdfjs/pdf.mjs')`
// inside carregaPdfjs(), cached after the first call — instead of a static
// top-level import (F5 do review final). Measured: importing pdf.mjs alone
// costs ~95 ms and ~40 MB RSS in Node; on a cold boot of an app whose whole
// promise is being ready instantly on a music stand, EVERY user paid that,
// books or not, because the import chain (main.js → render/home.js →
// render/books.js → pdf.js) was static all the way down. Now the cost is
// paid the first time a book is actually opened, and never otherwise.
//
// A dynamic import() still resolves to the same precached URL a static
// import would have: the module loader issues a normal same-origin fetch for
// './vendor/pdfjs/pdf.mjs', which the Service Worker's cache-first fetch
// handler (sw.js) serves from the VENDOR cache exactly like any other GET —
// nothing in sw.js special-cases *how* a URL was requested. Offline behaviour
// is unchanged by construction, and shell.test.js's vendor-precache check is
// untouched too: it scans js/vendor/ on disk against VENDOR in sw.js, not
// pdf.js's import style, and js/vendor/ was already excluded from the plain
// module scan (modulesOnDisk() skips the 'vendor' directory by name).
let pdfjsPromise = null;
// Built once pdf.js is loaded, since the class extends PDFDataRangeTransport
// — a symbol that does not exist until then. A top-level `class ... extends
// pdfjs.PDFDataRangeTransport` is exactly the kind of module-eval-time work
// that would force pdf.mjs to load at import time, defeating the whole point.
let FatiaDeArquivo = null;

function carregaPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('./vendor/pdfjs/pdf.mjs').then((pdfjs) => {
      // Local worker, never the CDN default: a CDN workerSrc works in
      // development and dies offline, which is the whole point of this app.
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.mjs', import.meta.url).href;
      FatiaDeArquivo = class extends pdfjs.PDFDataRangeTransport {
        constructor(file, inicio) {
          super(file.size, inicio, false, file.name || null);
          this.file = file;
          // The vendored PDFDataRangeTransport (pdf.mjs) only exposes a
          // success callback (onDataRange) — there is no error channel
          // upstream. Without this, a rejected range read (OPFS I/O error,
          // storage pressure, a file handle invalidated mid-read — plausible
          // across the hundreds of range reads a 301 MB songbook needs)
          // leaves pdf.js waiting on a chunk that never arrives: no error, no
          // timeout, just a hang. `erro` is a capability abrirLivro races
          // against getDocument's own promise, so a failed range read turns
          // into a real rejection instead of silence.
          this.erro = Promise.withResolvers();
        }
        requestDataRange(begin, end) {
          if (!this.file) return; // abortado por fecharLivro — nada a fazer
          this.file.slice(begin, end).arrayBuffer()
            .then((buf) => this.onDataRange(begin, new Uint8Array(buf)))
            .catch((err) => this.erro.reject(err));
        }
        abort() { this.file = null; }
      };
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

const WASM_URL = new URL('./vendor/pdfjs/wasm/', import.meta.url).href;
const FONTS_URL = new URL('./vendor/pdfjs/standard_fonts/', import.meta.url).href;

// Chrome refuses to allocate a canvas past a total area, and a 300 dpi page at
// zoom 4 walks straight into it. Past this the reader scales the bitmap instead
// of redrawing: it loses sharpness rather than losing the page. Stays a plain
// export — a caller may read this before ever touching a book.
export const MAX_CANVAS_PX = 16_000_000;

// Reads the file in slices instead of loading it whole. The Fake Book is 301 MB;
// a tablet does not have that to spare, and a File from OPFS slices lazily off
// disk. 128 KB of head data just gives pdf.js an initial chunk to start parsing
// from — everything else, including the xref/trailer (which sits at the END of
// the file for a non-linearized PDF), arrives later through requestDataRange
// like any other range.
const CABECA = 128 * 1024;

// `file` is what DB.getBlob() hands back for a stored book (a File on OPFS, a
// Blob on the IndexedDB fallback). Throws on a PDF pdf.js cannot open — the
// caller turns that into a message and leaves no orphan record behind.
export async function abrirLivro(file) {
  const pdfjs = await carregaPdfjs();
  const inicio = new Uint8Array(await file.slice(0, Math.min(CABECA, file.size)).arrayBuffer());
  const transporte = new FatiaDeArquivo(file, inicio);
  const task = pdfjs.getDocument({
    range: transporte,
    wasmUrl: WASM_URL,
    standardFontDataUrl: FONTS_URL,
    disableAutoFetch: true,
  });
  // Race against the transport's own failure channel (see the `erro` comment
  // above): whichever settles first wins, so a broken range read fails the
  // open instead of leaving task.promise pending forever.
  try {
    return await Promise.race([task.promise, transporte.erro.promise]);
  } catch (err) {
    // The error channel won the race. Without this, `task` is abandoned two
    // ways at once (F10 do review final): the worker thread it already
    // started stays alive with nothing left to stop it, and if task.promise
    // goes on to resolve anyway (the I/O error was transient, or only some
    // range reads failed) a real PDFDocumentProxy lands with nothing
    // referencing it to ever close. destroy() closes both — same call
    // fecharLivro makes on the success path, just reached from the loading
    // task directly since there is no `doc` yet to hang it off of.
    try { await task.destroy(); } catch (_) { /* melhor esforço */ }
    throw err;
  }
}

export function paginasDe(doc) { return doc.numPages; }

// Draws page `n` into `canvas` at `larguraCss` CSS pixels wide, times the device
// pixel ratio, capped by MAX_CANVAS_PX. Returns the CSS size the caller should
// give the element. Redrawing — not stretching — is what makes the 300 dpi scan
// actually show up when you zoom in.
export async function renderPagina(doc, n, larguraCss, dpr, canvas) {
  const page = await doc.getPage(n);
  const base = page.getViewport({ scale: 1 });
  let escala = (larguraCss * dpr) / base.width;
  const area = (base.width * escala) * (base.height * escala);
  if (area > MAX_CANVAS_PX) escala *= Math.sqrt(MAX_CANVAS_PX / area);
  const viewport = page.getViewport({ scale: escala });
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext('2d', { alpha: false });
  const task = page.render({ canvasContext: ctx, viewport });
  try { await task.promise; }
  finally { page.cleanup(); }
  return { w: larguraCss, h: larguraCss * (base.height / base.width) };
}

export async function fecharLivro(doc) {
  if (!doc) return;
  // PDFDocumentProxy (what abrirLivro resolves to) has no destroy() of its
  // own — confirmed by reading the vendored class in pdf.mjs and, at runtime,
  // by opening a real document and checking its prototype. The obvious
  // `doc.destroy()` throws TypeError; destroy() lives on
  // PDFDocumentLoadingTask instead, reached through the proxy's `loadingTask`
  // getter, and that's what actually tears the worker and its decoded-image
  // memory down. A blanket catch around the wrong call used to swallow that
  // TypeError as "already closed" — the worker leaked silently for the whole
  // page lifetime.
  try {
    await doc.loadingTask.destroy();
  } catch (err) {
    // pdf.js's own destroy() is safe to call twice (it guards its transport
    // with optional chaining), so a genuine double-close does not throw here.
    // Anything that does reach this catch is a real failure — surface it
    // instead of hiding it.
    console.warn('fecharLivro: falha ao destruir o documento PDF', err);
  }
}

// A function, not a constant (F5 do review final): a top-level `pdfjs.version`
// would force the lazy load right back to module-eval time. Its only
// consumer, diag-pdf.html, already awaits everything else in this file.
export async function versaoPdfJs() {
  const pdfjs = await carregaPdfjs();
  return pdfjs.version;
}
