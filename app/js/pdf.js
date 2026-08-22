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
// disk. 128 KB of head data is enough for pdf.js to find the trailer and start.
const CABECA = 128 * 1024;

class FatiaDeArquivo extends pdfjs.PDFDataRangeTransport {
  constructor(file, inicio) {
    super(file.size, inicio, false, file.name || null);
    this.file = file;
  }
  requestDataRange(begin, end) {
    this.file.slice(begin, end).arrayBuffer()
      .then((buf) => this.onDataRange(begin, new Uint8Array(buf)));
  }
  abort() { this.file = null; }
}

// `file` is what DB.getBlob() hands back for a stored book (a File on OPFS, a
// Blob on the IndexedDB fallback). Throws on a PDF pdf.js cannot open — the
// caller turns that into a message and leaves no orphan record behind.
export async function abrirLivro(file) {
  const inicio = new Uint8Array(await file.slice(0, Math.min(CABECA, file.size)).arrayBuffer());
  return pdfjs.getDocument({
    range: new FatiaDeArquivo(file, inicio),
    wasmUrl: WASM_URL,
    standardFontDataUrl: FONTS_URL,
    disableAutoFetch: true,
    isEvalSupported: false,
  }).promise;
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
