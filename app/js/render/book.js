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
    <div class="book-page" data-bookscroll="1">
      <div class="inner"><canvas id="book-canvas"></canvas></div>
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

// One page ahead, kept off-screen. A 300 dpi page takes a few hundred ms to
// rasterise, and that is exactly the pause you feel when turning. Only ever one:
// prefetching a whole book would be a background job competing with the page the
// eyes are actually on.
let adiantada = null;   // { id, n, bitmap }

async function adiantaProxima() {
  const b = livroById(S.livroId);
  const n = S.livroPagina + 1;
  if (!b || !doc || n > b.paginas) return;
  if (adiantada && adiantada.id === b.id && adiantada.n === n) return;
  const el = document.querySelector('[data-bookscroll]');
  if (!el) return;
  const canvas = document.createElement('canvas');
  try {
    await renderPagina(doc, n, Math.max(320, el.clientWidth * S.livroZoom), window.devicePixelRatio || 1, canvas);
    adiantada = { id: b.id, n, bitmap: await createImageBitmap(canvas) };
  } catch (e) { adiantada = null; }
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
      await fecharLivro(doc);
      doc = null;
      const file = await DB.getBlob(b.blobId);
      if (!file) return;
      doc = await abrirLivro(file);
      docId = b.id;
      if (paginasDe(doc) !== b.paginas) await salvaLivro({ ...b, paginas: paginasDe(doc) });
    }
    if (desenhando !== alvo) return;
    const el = document.querySelector('[data-bookscroll]');
    const largura = Math.max(320, el.clientWidth * S.livroZoom);
    if (adiantada && adiantada.id === b.id && adiantada.n === alvo.n
        && Math.abs(alvo.z - S.livroZoom) < 0.001) {
      canvas.width = adiantada.bitmap.width;
      canvas.height = adiantada.bitmap.height;
      canvas.getContext('2d', { alpha: false }).drawImage(adiantada.bitmap, 0, 0);
      adiantada = null;
    } else {
      const { w, h } = await renderPagina(doc, alvo.n, largura, window.devicePixelRatio || 1, canvas);
      if (desenhando !== alvo) return;
      canvas.style.width = w + 'px';
      canvas.style.height = Math.round(h) + 'px';
    }
    el.querySelector('.inner').style.alignItems = S.livroZoom > 1.001 ? 'flex-start' : 'center';
    setTimeout(() => adiantaProxima(), 120);
  } catch (e) {
    if (desenhando === alvo) console.warn('book render', e);
  }
}

// `onUpdate` é o update() do main.js, injetado como afterRenderPlay(update) já
// faz (main.js:107): o render não importa o main, ou o ciclo fecha.
export function afterRenderBook(onUpdate) {
  const el = document.querySelector('[data-bookscroll]');
  if (el && !el._panWired) {
    el._panWired = true;
    wireGestos(el, {
      getZoom: () => S.livroZoom,
      setZoom: (z) => { S.livroZoom = z; atualizaPct(); desenhaPagina(); },
      onSwipe: (dir) => { viraPagina(dir).then((n) => { if (n) onUpdate(); }); },
      ignorar: (alvo) => !!(alvo.closest && alvo.closest('.book-hud')),
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
  adiantada = null;
}
