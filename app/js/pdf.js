// pdf.js — the boundary around the vendored PDF renderer.
//
// Nothing else in the app imports pdf.js. A breaking change upstream, or
// swapping the renderer altogether, has to touch this file and no other.
// Design: docs/superpowers/specs/2026-08-22-livros-pdf-design.md
import * as pdfjs from './vendor/pdfjs/pdf.mjs';

// Local worker, never the CDN default: a CDN workerSrc works in development and
// dies offline, which is the whole point of this app.
pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.mjs', import.meta.url).href;

const WASM_URL = new URL('./vendor/pdfjs/wasm/', import.meta.url).href;
const FONTS_URL = new URL('./vendor/pdfjs/standard_fonts/', import.meta.url).href;

// Chrome refuses to allocate a canvas past a total area, and a 300 dpi page at
// zoom 4 walks straight into it. Past this the reader scales the bitmap instead
// of redrawing: it loses sharpness rather than losing the page.
export const MAX_CANVAS_PX = 16_000_000;

// Reads the file in slices instead of loading it whole. The Fake Book is 301 MB;
// a tablet does not have that to spare, and a File from OPFS slices lazily off
// disk. 128 KB of head data just gives pdf.js an initial chunk to start parsing
// from — everything else, including the xref/trailer (which sits at the END of
// the file for a non-linearized PDF), arrives later through requestDataRange
// like any other range.
const CABECA = 128 * 1024;

class FatiaDeArquivo extends pdfjs.PDFDataRangeTransport {
  constructor(file, inicio) {
    super(file.size, inicio, false, file.name || null);
    this.file = file;
    // The vendored PDFDataRangeTransport (pdf.mjs) only exposes a success
    // callback (onDataRange) — there is no error channel upstream. Without
    // this, a rejected range read (OPFS I/O error, storage pressure, a file
    // handle invalidated mid-read — plausible across the hundreds of range
    // reads a 301 MB songbook needs) leaves pdf.js waiting on a chunk that
    // never arrives: no error, no timeout, just a hang. `erro` is a capability
    // abrirLivro races against getDocument's own promise, so a failed range
    // read turns into a real rejection instead of silence.
    this.erro = Promise.withResolvers();
  }
  requestDataRange(begin, end) {
    if (!this.file) return; // abortado por fecharLivro — nada a fazer
    this.file.slice(begin, end).arrayBuffer()
      .then((buf) => this.onDataRange(begin, new Uint8Array(buf)))
      .catch((err) => this.erro.reject(err));
  }
  abort() { this.file = null; }
}

// `file` is what DB.getBlob() hands back for a stored book (a File on OPFS, a
// Blob on the IndexedDB fallback). Throws on a PDF pdf.js cannot open — the
// caller turns that into a message and leaves no orphan record behind.
export async function abrirLivro(file) {
  const inicio = new Uint8Array(await file.slice(0, Math.min(CABECA, file.size)).arrayBuffer());
  const transporte = new FatiaDeArquivo(file, inicio);
  const task = pdfjs.getDocument({
    range: transporte,
    wasmUrl: WASM_URL,
    standardFontDataUrl: FONTS_URL,
    disableAutoFetch: true,
    isEvalSupported: false,
  });
  // Race against the transport's own failure channel (see the `erro` comment
  // above): whichever settles first wins, so a broken range read fails the
  // open instead of leaving task.promise pending forever.
  return Promise.race([task.promise, transporte.erro.promise]);
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
  if (doc) { try { await doc.destroy(); } catch (e) { /* já fechado */ } }
}

export const versaoPdfJs = pdfjs.version;
