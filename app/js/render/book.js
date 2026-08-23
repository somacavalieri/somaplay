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

// True while the main page (or its one-page-ahead prefetch) is actually
// inside a renderPagina() call. The thumbnail grid checks this before every
// single thumbnail and bails out — rescheduled for later — so a page turn
// never has to share the main thread with a thumbnail raster mid-flight.
let paginaOcupada = false;

// The rename strip: swaps in for the page itself, right below the topbar —
// never a browser prompt(), which cannot be styled or translated and blocks
// the render loop.
function renomeioHTML(b) {
  if (!S.livroRenomeando) return '';
  return `<div class="book-rename">
    <input type="text" class="input lg" id="f-ren-titulo" value="${esc(b.titulo)}" placeholder="${t('books.draft.name')}">
    <input type="text" class="input lg" id="f-ren-autor" value="${esc(b.autor || '')}" placeholder="${t('books.draft.author')}">
    <button class="btn-ghost" data-a="cancelRenomearLivro">${t('common.cancel')}</button>
    <button class="btn-save" data-a="confirmRenomearLivro">${I.save()}${t('common.save')}</button>
  </div>`;
}

function menuHTML(b) {
  if (!S.livroMenu) return '';
  return `<div class="menu-pop">
    <button data-a="renomearLivro">${I.pencil()}<span>${t('book.menu.rename')}</span></button>
    <button data-a="exportarLivro">${I.download()}<span>${t('book.menu.export')}</span></button>
    <button class="danger" data-a="apagarLivro">${I.trash()}<span>${t('book.menu.delete')}</span></button>
  </div>`;
}

export function renderBook() {
  const b = livroById(S.livroId);
  // Same pattern as every sibling screen (artist/list/estilo/play): a missing
  // record navigates back out instead of drawing an empty screen with no
  // topbar, no back button and no way off it (F6 do review final).
  if (!b) { S.screen = 'home'; S.tab = 'books'; return '<div></div>'; }
  const n = S.livroPagina;
  return `<div class="screen book-screen">
    <div class="topbar">
      <button class="btn-icon" data-a="sairDoLivro" title="${t('common.back')}">${I.back()}</button>
      <div class="page-title">${esc(b.titulo)}</div>
      <span style="margin-left:auto"></span>
      <button class="btn-icon" data-a="toggleBookGrid" title="${t('book.grid')}">${I.grid(20)}</button>
      <div class="menu-wrap">
        <button class="btn-icon ${S.livroMenu ? 'accent-on' : ''}" data-a="toggleBookMenu" title="${t('play.menu.options')}">${I.dots()}</button>
        ${menuHTML(b)}
      </div>
    </div>
    ${renomeioHTML(b)}
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
    ${gradeHTML(b)}
  </div>`;
}

// Thumbnails at 120 CSS px: small enough that 401 of them are cheap to hold as
// data URLs, big enough to recognise a title on the page. Kept in memory for
// the session only — persisting 401 thumbnails per book is an optimisation to
// make with a measurement in hand, not up front. Keyed by book id AND page,
// so a book switch can never hand out a stale thumbnail from a different PDF,
// and cleared whole in sairDoLivro() so nothing survives past the book that
// made it.
const MINI_PX = 120;
const minis = new Map();   // `${livroId}:${n}` → dataURL

function gradeHTML(b) {
  if (!S.livroGrade) return '';
  const celulas = [];
  for (let n = 1; n <= b.paginas; n++) {
    const url = minis.get(`${b.id}:${n}`);
    celulas.push(`<button class="mini ${n === S.livroPagina ? 'on' : ''}" data-a="irParaPagina" data-id="${n}">
      ${url ? `<img src="${url}" alt="" loading="lazy">` : `<span class="ph" data-mini="${n}"></span>`}
      <span class="n">${n}</span>
    </button>`);
  }
  return `<div class="book-grid-overlay">
    <div class="hd">
      <div class="t">${t('book.grid')}</div>
      <div class="goto"><label for="f-goto">${t('book.goTo')}</label>
        <input type="number" id="f-goto" min="1" max="${b.paginas}" value="${S.livroPagina}"></div>
      <button class="btn-icon" data-a="toggleBookGrid">${I.close(20)}</button>
    </div>
    <div class="minis" data-autoscroll="1">${celulas.join('')}</div>
  </div>`;
}

// Schedules a thumbnail batch at low priority: requestIdleCallback runs it
// only when the main thread has slack, so it never competes for a frame with
// a page turn or the pan/zoom gesture handling. Falls back to a short timeout
// where requestIdleCallback doesn't exist (older Safari).
//
// `agendada` makes this idempotent — a second call while one is already
// pending is a no-op instead of a second, independent chain. That matters
// most for desenhaMiniaturas()'s own retry branch below (doc still opening,
// or a book whose document can never open): that branch schedules a retry
// WITHOUT setting `miniaturasEmExecucao` — there is no batch in flight to
// guard — so before this guard existed, every scroll event during the wait
// seeded its own independent idle-polling chain, and a fling could spawn
// dozens of them for the exact same zero work (F11 do review final).
let agendada = false;
function agendaMiniaturas(atrasoMs) {
  if (agendada) return;
  agendada = true;
  const rodar = () => { agendada = false; desenhaMiniaturas(); };
  const ric = typeof requestIdleCallback === 'function' ? requestIdleCallback : null;
  if (ric) ric(rodar, { timeout: 300 });
  else setTimeout(rodar, atrasoMs || 60);
}

// A placeholder counts as "on screen" with a small margin either side, so a
// thumbnail is ready slightly before it scrolls fully into view.
function estaVisivel(el) {
  const r = el.getBoundingClientRect();
  return r.bottom > -200 && r.top < window.innerHeight + 200;
}

// Reentrancy guard: a fling fires a scroll event per frame, and each one calls
// agendaMiniaturas() unconditionally. Without this, two runs of
// desenhaMiniaturas() could both be suspended mid-batch at the same time,
// both having captured the same `pendentes` snapshot (nothing had changed
// the DOM yet), and both try to render the same page through the same shared
// `doc` — pdf.js rejects the second concurrent render of one page, and the
// `catch` below quietly skips it. Net effect without this guard: doubled
// rasterisation work during exactly the scroll the "must not freeze" ruling
// is about. Released in `finally` so a thrown render can't wedge the grid
// closed for the rest of the session.
let miniaturasEmExecucao = false;

// Draws only the thumbnails currently on screen (plus a small margin), and
// only a handful per call: rasterising all 401 pages of a songbook up front
// would freeze the tablet the moment the grid opens, for the sake of
// thumbnails nobody has scrolled to yet. Recurses at idle priority while the
// visible batch still has placeholders, and yields immediately — rescheduling
// itself — the moment the page reader needs the main thread for something
// that actually matters (see paginaOcupada above).
async function desenhaMiniaturas() {
  if (S.screen !== 'book' || !S.livroGrade) return;
  const b = livroById(S.livroId);
  const caixa = document.querySelector('.book-grid-overlay .minis');
  // No grid mounted for this book — wrong screen, or the overlay isn't in the
  // DOM. Nothing will make this true later on its own, so stop for good.
  if (!b || !caixa) return;
  // A run is already in flight; it will reschedule itself on completion.
  if (miniaturasEmExecucao) return;
  // The page draw/prefetch has priority (paginaOcupada), OR the document is
  // still being opened by abreLivro() — started, not awaited, by
  // desenhaPagina() elsewhere the moment the book screen opened. Both
  // conditions are temporary and resolve on their own, so retry shortly
  // instead of giving up: this is what makes "tap the grid while a
  // several-hundred-page book is still opening" recover on its own, instead
  // of leaving nothing but numbered placeholders forever.
  if (paginaOcupada || !doc || docId !== b.id) { agendaMiniaturas(120); return; }
  miniaturasEmExecucao = true;
  try {
    const pendentes = [...caixa.querySelectorAll('[data-mini]')].filter(estaVisivel).slice(0, 12);
    for (const el of pendentes) {
      if (paginaOcupada) break; // a page turn started mid-batch — stop right away
      if (!estaVisivel(el)) continue; // scrolled away since the batch was built — don't chase it
      const n = +el.dataset.mini;
      const chave = `${b.id}:${n}`;
      if (minis.has(chave)) continue;
      const canvas = document.createElement('canvas');
      try { await renderPagina(doc, n, MINI_PX, Math.min(2, window.devicePixelRatio || 1), canvas); }
      catch (e) { continue; }
      // The reader may have left the grid, closed the book, or opened a
      // different one while this thumbnail was rasterising.
      if (S.screen !== 'book' || !S.livroGrade || S.livroId !== b.id) return;
      const url = canvas.toDataURL('image/jpeg', 0.7);
      minis.set(chave, url);
      const img = new Image();
      img.alt = '';
      img.loading = 'lazy';
      img.src = url;
      el.replaceWith(img);
    }
    // Only reschedule when this batch actually had visible work: an offscreen
    // placeholder is not this call's concern, and polling for it would just
    // spin idle callbacks forever while the grid sits open. The scroll
    // listener (wired in afterRenderBook) wakes this up again once it matters.
    if (pendentes.length) agendaMiniaturas();
  } finally {
    miniaturasEmExecucao = false;
  }
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

// In-flight document opens, keyed by book id. Concurrent desenhaPagina() calls
// — three fast flicks before the first page has finished opening — used to
// each see `doc` still null and each call abrirLivro() on the same
// multi-hundred-MB file; only the last to resolve was ever kept, and the
// other PDFDocumentProxy instances leaked (~100 MB each, measured). Now every
// concurrent caller for the SAME book awaits that book's one promise instead
// of starting its own. Keyed by id, not a single slot: a single slot can only
// remember one in-flight open at a time, so opening book B while A is still
// opening — then going back to A before either resolves — made the slot
// forget A was already in flight and start a second, undeduped open of it.
// Deleted on settle either way (success or failure), so a failed open stays
// retriable.
const abrindo = new Map(); // id -> Promise<void>

async function abreLivro(b) {
  if (abrindo.has(b.id)) { await abrindo.get(b.id); return; }
  if (doc && docId === b.id) return; // already open — nothing to do
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
      // Nothing overwrites `doc` without closing what was there first. The
      // per-id map above is what should prevent two independent opens of the
      // SAME book from both reaching here, but this is the backstop: if a
      // future variant of the race ever lets two opens of one book both pass
      // the check above, this is what stops whichever installs second from
      // dropping the first document unclosed.
      if (doc && doc !== novoDoc) await fecharLivro(doc);
      doc = novoDoc;
      docId = b.id;
      if (paginasDe(doc) !== b.paginas) await salvaLivro({ ...b, paginas: paginasDe(doc) });
    } else {
      await fecharLivro(novoDoc);
    }
  })();
  abrindo.set(b.id, promise);
  try {
    await promise;
  } finally {
    abrindo.delete(b.id);
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
  paginaOcupada = true;
  try {
    const { w, h } = await renderPagina(doc, n, Math.max(320, el.clientWidth * z), window.devicePixelRatio || 1, canvas);
    const bitmap = await createImageBitmap(canvas);
    // A newer prefetch replaces whatever was cached before — close it here,
    // not leave it for whoever notices next.
    descartaAdiantada();
    adiantada = { id: b.id, n, z, bitmap, w, h };
  } catch (e) { /* mantém o que já estava em cache, se houver algo válido */ }
  finally { paginaOcupada = false; }
}

// The last page successfully painted, kept as a bitmap so a re-render that
// only replaces the <canvas> — the ⋯ menu opening or closing, its
// click-outside handler, the grid overlay mounting — can repaint instantly
// instead of asking pdf.js to rasterize the SAME page a second time (F7 do
// review final: one menu tap used to cost two full 300 dpi rasters and two
// white flashes). Distinct from `adiantada`, which is the NEXT page, not yet
// shown; this is the page already on screen. Cleared in sairDoLivro, same as
// the other session-lived caches above.
let atualCache = null; // { id, n, z, bitmap, w, h } | null

function descartaAtual() {
  if (!atualCache) return;
  try { atualCache.bitmap.close(); } catch (e) { /* já fechado */ }
  atualCache = null;
}

function desenhaBitmapNoCanvas(canvas, cache) {
  canvas.width = cache.bitmap.width;
  canvas.height = cache.bitmap.height;
  canvas.getContext('2d', { alpha: false }).drawImage(cache.bitmap, 0, 0);
  aplicaTamanhoCanvas(canvas, cache.w, cache.h);
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
    // Nothing actually changed since the last successful draw — the canvas
    // here is a brand-new, empty element (update() rebuilt the whole screen),
    // but the pixels for THIS page at THIS zoom are already decoded.
    if (atualCache && atualCache.id === b.id && atualCache.n === alvo.n
        && Math.abs(atualCache.z - alvo.z) < 0.001) {
      desenhaBitmapNoCanvas(canvas, atualCache);
      const wrap = document.querySelector('[data-bookscroll] .inner');
      if (wrap) wrap.style.alignItems = S.livroZoom > 1.001 ? 'flex-start' : 'center';
      setStatus(null);
      return;
    }
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
    let bitmap, w, h;
    if (adiantada && adiantada.id === b.id && adiantada.n === alvo.n
        && Math.abs(adiantada.z - alvo.z) < 0.001) {
      ({ bitmap, w, h } = adiantada);
      adiantada = null;
      desenhaBitmapNoCanvas(canvas, { bitmap, w, h });
    } else {
      // Used to fire only while opening the document above — a plain page
      // turn (or a redraw after a real zoom change) can take just as long,
      // and a blank canvas with no status was a flash with no explanation
      // (F7 do review final).
      setStatus(t('book.rendering'));
      paginaOcupada = true;
      try { ({ w, h } = await renderPagina(doc, alvo.n, largura, window.devicePixelRatio || 1, canvas)); }
      finally { paginaOcupada = false; }
      if (desenhando !== alvo) return;
      aplicaTamanhoCanvas(canvas, w, h);
      bitmap = await createImageBitmap(canvas);
    }
    descartaAtual();
    atualCache = { id: b.id, n: alvo.n, z: alvo.z, bitmap, w, h };
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
  // desenhaPagina() runs first: opening (or re-rendering) the grid replaces
  // the canvas element, so the current page has to be redrawn either way, and
  // it must win the race for the main thread. The thumbnail pass is only
  // *scheduled* here (agendaMiniaturas, not called directly) so it starts at
  // idle priority, after this redraw has had the chance to claim
  // paginaOcupada first — see the comment on that flag above.
  desenhaPagina();
  if (S.livroGrade) {
    const caixa = document.querySelector('.book-grid-overlay .minis');
    if (caixa && !caixa._wired) {
      caixa._wired = true;
      caixa.addEventListener('scroll', () => agendaMiniaturas(), { passive: true });
    }
    const goto = document.getElementById('f-goto');
    if (goto && !goto._wired) {
      goto._wired = true;
      // `change` alone is not enough to trust: whether an Android numeric
      // keyboard's "Done" action fires `change` isn't something this code can
      // verify. Enter/`keydown` shares the exact same commit path, so the two
      // triggers can never clamp differently from one another.
      const commitGoto = () => {
        const b = livroById(S.livroId);
        if (!b) return;
        const n = Math.max(1, Math.min(b.paginas, +goto.value || 1));
        S.livroPagina = n; S.livroGrade = false; marcaPaginaMudou(); onUpdate();
      };
      goto.addEventListener('change', commitGoto);
      goto.addEventListener('keydown', (e) => { if (e.key === 'Enter') commitGoto(); });
    }
    agendaMiniaturas();
  }
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

// Page turns are persisted, but lazily: a debounced write, not one write to
// IndexedDB per flick of the finger through a 401-page book — the same
// pattern saveSettingsDebounced (main.js) already uses for the zoom/speed/
// volume sliders. `flushLivroPagina`, called from main.js's visibilitychange
// listener, is what makes the debounce safe: the Home button, an app switch
// or the tab being evicted can all happen before an 800 ms timer fires, and
// without a flush on hide that is exactly the gap that would make the field
// the spec calls "small and decisive" (F4 do review final) decorative instead.
let _pageSaveTimer = null;
function persistePaginaAgora() {
  clearTimeout(_pageSaveTimer);
  _pageSaveTimer = null;
  const b = livroById(S.livroId);
  if (b && b.ultimaPagina !== S.livroPagina) salvaLivro({ ...b, ultimaPagina: S.livroPagina });
}
function agendaSalvaPagina() {
  clearTimeout(_pageSaveTimer);
  _pageSaveTimer = setTimeout(persistePaginaAgora, 800);
}
// Called only while the book screen is showing: a flush after the reader has
// already left (S.screen no longer 'book') would be racing sairDoLivro(),
// which persists synchronously and then tears the book down.
export function flushLivroPagina() {
  if (S.screen === 'book') persistePaginaAgora();
}

export async function viraPagina(dir) {
  const b = livroById(S.livroId);
  if (!b) return;
  const n = Math.max(1, Math.min(b.paginas, S.livroPagina + dir));
  if (n === S.livroPagina) return;
  S.livroPagina = n;
  agendaSalvaPagina();
  return n;
}

// Jumping from the thumbnail grid or the "go to page" field also moves the
// reading position — same debounce, so a fling through the grid does not
// write once per cell either.
export function marcaPaginaMudou() {
  agendaSalvaPagina();
}

export async function sairDoLivro() {
  clearTimeout(_pageSaveTimer);
  _pageSaveTimer = null;
  const b = livroById(S.livroId);
  if (b && b.ultimaPagina !== S.livroPagina) await salvaLivro({ ...b, ultimaPagina: S.livroPagina });
  await fecharLivro(doc);
  doc = null; docId = null; desenhando = null;
  descartaAdiantada();
  descartaAtual();
  minis.clear(); // session cache dies with the book — never hand book A's thumbnail to book B
}
