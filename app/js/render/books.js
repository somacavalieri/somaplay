// render/books.js — the Books tab: the shelf, and the import form.
//
// A book never answers to the T1/T2/T3 lens, the same way lists do not: it is
// not "chart, backing track or karaoke", it is the material a chart may one day
// come out of.
import { S } from '../state.js';
import { I, esc } from '../icons.js';
import { t } from '../i18n.js';
import { abrirLivro, paginasDe, renderPagina, fecharLivro } from '../pdf.js';

// Cover width in CSS pixels. Rendered once, at import: opening every PDF just to
// paint the shelf is what this blob avoids.
const CAPA_PX = 320;

// Opens the PDF far enough to learn its page count and paint page 1. Throws if
// pdf.js cannot read it — the caller shows the message and saves nothing, so a
// failed import leaves neither record nor blob behind.
export async function capaDoArquivo(file) {
  const doc = await abrirLivro(file);
  try {
    const paginas = paginasDe(doc);
    const canvas = document.createElement('canvas');
    await renderPagina(doc, 1, CAPA_PX, 2, canvas);
    const capaBlob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.82));
    return { paginas, capaBlob };
  } finally {
    await fecharLivro(doc);
  }
}

function draftCard() {
  const d = S.livroDraft;
  if (!d) return '';
  const fila = S.livroFila && S.livroFila.length
    ? `<div class="s">${t('books.draft.remaining', { count: S.livroFila.length })}</div>` : '';
  return `<div class="card-section" style="margin-bottom:18px">
    <div class="hd"><span style="color:var(--accent);display:flex">${I.book(19)}</span>
      <div class="t">${t('books.draft.title')}</div>${fila}</div>
    <div class="book-draft">
      ${d.capaURL ? `<img class="book-cover" src="${d.capaURL}" alt="">` : ''}
      <div class="book-draft-fields">
        <div class="field"><label>${t('books.draft.name')}</label>
          <input type="text" class="input lg" id="f-livro-titulo" value="${esc(d.titulo)}"></div>
        <div class="field"><label>${t('books.draft.author')}</label>
          <input type="text" class="input lg" id="f-livro-autor" placeholder="${t('books.draft.authorPlaceholder')}" value="${esc(d.autor)}"></div>
        <div class="s">${t('books.card.pages', { count: d.paginas })} · ${(d.file.size / 1e6).toFixed(1)} MB</div>
        <div class="foot-inline">
          <button class="btn-ghost" data-a="cancelLivroDraft">${t('common.cancel')}</button>
          <button class="btn-save" data-a="saveLivroDraft">${I.save()}${t('books.draft.save')}</button>
        </div>
      </div>
    </div>
  </div>`;
}

function bookCard(b) {
  const capa = S.capaURLs && S.capaURLs[b.id];
  return `<div class="book-card" data-a="openBook" data-id="${esc(b.id)}">
    <div class="book-cover-wrap">${capa
      ? `<img class="book-cover" src="${capa}" alt="">`
      : `<span class="book-cover ph">${I.book(28)}</span>`}</div>
    <div class="nm">${esc(b.titulo)}</div>
    <div class="ct">${b.autor ? esc(b.autor) + ' · ' : ''}${t('books.card.pages', { count: b.paginas })}</div>
  </div>`;
}

export function renderBooksTab() {
  const q = S.query.trim().toLowerCase();
  const lista = S.books.filter((b) => !q
    || b.titulo.toLowerCase().includes(q) || (b.autor || '').toLowerCase().includes(q));
  const vazio = `<div class="empty">
      <span style="color:var(--muted)">${I.book(34)}</span>
      <div class="t">${t('books.empty.title')}</div>
      <div class="s">${t('books.empty.hint')}</div>
    </div>`;
  return `<div class="books-head">
      <div><div class="t">${t('home.tabs.books')}</div>
        <div class="s">${t('home.tabsub.books', { count: S.books.length })}</div></div>
      <button class="btn-primary" data-a="pickLivro">${I.plus(20, 2.4)}${t('books.add')}</button>
    </div>
    ${draftCard()}
    ${lista.length ? `<div class="book-grid">${lista.map(bookCard).join('')}</div>` : vazio}
    <input type="file" id="file-livro" accept="application/pdf" multiple hidden>`;
}
