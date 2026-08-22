// render/book.js — reading a book: one page at a time, redrawn at zoom.
//
// The page is REDRAWN at the zoom level, never stretched — that is what makes a
// 300 dpi scan actually readable when you lean in, and the reason the app keeps
// the PDF instead of a pile of images.
import { S, livroById, salvaLivro } from '../state.js';
import { DB } from '../db.js';
import { I, esc } from '../icons.js';
import { t } from '../i18n.js';
import { abrirLivro, paginasDe, renderPagina, fecharLivro } from '../pdf.js';
import { wireGestos, clampZoom } from '../panzoom.js';

// The open document lives here, not in S: it is a handle, not state, and putting
// it in S would tempt someone to serialise it.
let doc = null;
let docId = null;
let desenhando = null;   // page currently being drawn, to drop a superseded call

export function renderBook() {
  const b = livroById(S.livroId);
  if (!b) return '<div class="screen"></div>';
  const n = S.livroPagina;
  return `<div class="screen book-screen">
    <div class="topbar">
      <button class="btn-icon" data-a="sairDoLivro" title="${t('common.back')}">${I.back()}</button>
      <div class="page-title">${esc(b.titulo)}</div>
      <span style="margin-left:auto"></span>
      <button class="btn-icon" data-a="toggleBookGrid" title="${t('book.grid')}">${I.grid(20)}</button>
    </div>
    <div class="book-page-wrap">
      <div class="book-page" data-bookscroll="1">
        <div class="inner"><canvas id="book-canvas"></canvas></div>
      </div>
      <div class="book-status" id="book-status" hidden></div>
    </div>
    <div class="book-hud">
      <button data-a="paginaAnterior" title="${t('book.prev')}" ${n <= 1 ? 'disabled' : ''}>${I.chevL(20)}</button>
      <div class="pg">${t('book.pageOf', { n, total: b.paginas })}</div>
      <button data-a="proximaPagina" title="${t('book.next')}" ${n >= b.paginas ? 'disabled' : ''}>${I.chevR(20)}</button>
      <div class="zoom-ctl">
        <button data-a="bookZoomOut" title="−">−</button>
        <div class="pct" id="book-zoom-pct">${Math.round(S.livroZoom * 100)}%</div>
        <button data-a="bookZoomIn" title="+">+</button>
      </div>
    </div>
  </div>`;
}

function setStatus(msg) {
  const el = document.getElementById('book-status');
  if (!el) return;
  if (msg) { el.textContent = msg; el.hidden = false; }
  else { el.hidden = true; el.textContent = ''; }
}

// Sets the CSS (display) size of the canvas, in one place, so the fresh-render
// path and the prefetch-cache-hit path can never drift apart the way they did
// before: the cache-hit branch used to set canvas.width/height (the pixel
// buffer) and forget canvas.style.width/height (the display size), leaving the
// page shown at the wrong size whenever a prefetched page was used.
function aplicaTamanhoCanvas(canvas, w, h) {
  canvas.style.width = w + 'px';
  canvas.style.height = Math.round(h) + 'px';
}

// The in-flight document open, keyed by book id. Concurrent desenhaPagina()
// calls — three fast flicks before the first page has finished opening — used
// to each see `doc` still null and each call abrirLivro() on the same
// multi-hundred-MB file; only the last to resolve was ever kept, and the other
// PDFDocumentProxy instances leaked (~100 MB each, measured). Now every
// concurrent caller awaits this one promise instead of starting its own.
let abrindo = null; // { id, promise } | null

async function abreLivro(b) {
  if (abrindo && abrindo.id === b.id) { await abrindo.promise; return; }
  if (doc && docId === b.id) return; // another caller finished opening it while we were about to start
  const antigo = doc;
  doc = null; docId = null;
  const promise = (async () => {
    await fecharLivro(antigo);
    const file = await DB.getBlob(b.blobId);
    if (!file) throw new Error('blob do livro ausente');
    const novoDoc = await abrirLivro(file);
    // A document is only installed if its book is still the current one,
    // otherwise it is closed immediately: by the time a slow open on a
    // 300 MB songbook resolves, the reader may already have moved on to a
    // different book (S.livroId changed) or left the screen entirely
    // (S.screen is no longer 'book') — either way, installing it here would
    // leak it, since nothing else still holds a reference to close it later.
    if (S.livroId === b.id && S.screen === 'book') {
      doc = novoDoc;
      docId = b.id;
      if (paginasDe(doc) !== b.paginas) await salvaLivro({ ...b, paginas: paginasDe(doc) });
    } else {
      await fecharLivro(novoDoc);
    }
  })();
  abrindo = { id: b.id, promise };
  try {
    await promise;
  } finally {
    if (abrindo && abrindo.promise === promise) abrindo = null;
  }
}

// One page ahead, kept off-screen. A 300 dpi page takes a few hundred ms to
// rasterise, and that is exactly the pause you feel when turning. Only ever one:
// prefetching a whole book would be a background job competing with the page the
// eyes are actually on.
let adiantada = null;   // { id, n, z, bitmap, w, h } | null — z is the zoom it was rendered at

// Discards whatever is cached, closing the bitmap so its decoded pixels (held
// outside the JS heap) don't wait on the GC — tens of MB each, on a 401-page
// book flicked through quickly.
function descartaAdiantada() {
  if (!adiantada) return;
  try { adiantada.bitmap.close(); } catch (e) { /* já fechado */ }
  adiantada = null;
}

async function adiantaProxima() {
  const b = livroById(S.livroId);
  const n = S.livroPagina + 1;
  const z = S.livroZoom;
  if (!b || !doc || n > b.paginas) return;
  if (adiantada && adiantada.id === b.id && adiantada.n === n && Math.abs(adiantada.z - z) < 0.001) return;
  const el = document.querySelector('[data-bookscroll]');
  if (!el) return;
  const canvas = document.createElement('canvas');
  try {
    const { w, h } = await renderPagina(doc, n, Math.max(320, el.clientWidth * z), window.devicePixelRatio || 1, canvas);
    const bitmap = await createImageBitmap(canvas);
    // A newer prefetch replaces whatever was cached before — close it here,
    // not leave it for whoever notices next.
    descartaAdiantada();
    adiantada = { id: b.id, n, z, bitmap, w, h };
  } catch (e) { /* mantém o que já estava em cache, se houver algo válido */ }
}

// Draws the current page. Every call carries a token: a fast reader can turn
// three pages while the first is still rasterising, and without the token the
// slow one would land on top of the fast one — the same guard loadSongMedia has.
export async function desenhaPagina() {
  const b = livroById(S.livroId);
  const canvas = document.getElementById('book-canvas');
  if (!b || !canvas) return;
  const alvo = { n: S.livroPagina, z: S.livroZoom };
  desenhando = alvo;
  try {
    if (!doc || docId !== b.id) {
      setStatus(t('book.rendering'));
      await abreLivro(b);
      // `doc` is module state, shared by every caller that awaited the open
      // above — not something this call owns. If a faster flick superseded us
      // while we were waiting, the document is exactly what the newer call
      // needs too, so we hand it over as-is and just stop drawing OUR page;
      // closing it here would pull it out from under the call that is about
      // to use it.
      if (desenhando !== alvo) return;
    }
    const el = document.querySelector('[data-bookscroll]');
    const largura = Math.max(320, el.clientWidth * S.livroZoom);
    if (adiantada && adiantada.id === b.id && adiantada.n === alvo.n
        && Math.abs(adiantada.z - alvo.z) < 0.001) {
      const cache = adiantada;
      adiantada = null;
      canvas.width = cache.bitmap.width;
      canvas.height = cache.bitmap.height;
      canvas.getContext('2d', { alpha: false }).drawImage(cache.bitmap, 0, 0);
      aplicaTamanhoCanvas(canvas, cache.w, cache.h);
      cache.bitmap.close();
    } else {
      const { w, h } = await renderPagina(doc, alvo.n, largura, window.devicePixelRatio || 1, canvas);
      if (desenhando !== alvo) return;
      aplicaTamanhoCanvas(canvas, w, h);
    }
    el.querySelector('.inner').style.alignItems = S.livroZoom > 1.001 ? 'flex-start' : 'center';
    setStatus(null);
    setTimeout(() => adiantaProxima(), 120);
  } catch (e) {
    if (desenhando === alvo) { console.warn('book render', e); setStatus(t('book.error.page')); }
  }
}

// `onUpdate` is main.js's update(), injected the same way afterRenderPlay(update)
// already does — the render module never imports main.js, or the cycle would
// close on itself.
export function afterRenderBook(onUpdate) {
  const el = document.querySelector('[data-bookscroll]');
  if (el && !el._panWired) {
    el._panWired = true;
    wireGestos(el, {
      getZoom: () => S.livroZoom,
      setZoom: (z) => { S.livroZoom = z; atualizaPct(); descartaAdiantada(); desenhaPagina(); },
      onSwipe: (dir) => { viraPagina(dir).then((n) => { if (n) onUpdate(); }); },
    });
  }
  desenhaPagina();
}

function atualizaPct() {
  const pct = document.getElementById('book-zoom-pct');
  if (pct) pct.textContent = Math.round(S.livroZoom * 100) + '%';
}

export function bookZoomBy(d) {
  S.livroZoom = clampZoom(S.livroZoom + d);
  atualizaPct();
  descartaAdiantada();
  desenhaPagina();
}

// Page turns are persisted, but lazily: writing to IndexedDB on every turn of a
// 401-page book is a write per flick of the finger.
export async function viraPagina(dir) {
  const b = livroById(S.livroId);
  if (!b) return;
  const n = Math.max(1, Math.min(b.paginas, S.livroPagina + dir));
  if (n === S.livroPagina) return;
  S.livroPagina = n;
  return n;
}

export async function sairDoLivro() {
  const b = livroById(S.livroId);
  if (b && b.ultimaPagina !== S.livroPagina) await salvaLivro({ ...b, ultimaPagina: S.livroPagina });
  await fecharLivro(doc);
  doc = null; docId = null; desenhando = null;
  descartaAdiantada();
}
