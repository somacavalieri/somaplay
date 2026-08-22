// books.js — everything about a book that needs no browser.
//
// A book is not a song: it never enters S.songs, never answers to the T1/T2/T3
// lens, and its fields are not in CAMPOS. What lives here is the part of it that
// is pure — naming, blob collection, merge — so it can be tested without a DOM,
// a database or a PDF.
// Design: docs/superpowers/specs/2026-08-22-livros-pdf-design.md

// The id Scribd glues to the front of every download. Six digits or more
// followed by a dash: "101-Musicas" keeps its 101, because a songbook really is
// called that, and losing the title is worse than keeping a stray number.
const ID_DE_DOWNLOAD = /^\d{6,}[-_]/;

export function tituloDeArquivo(nome) {
  return String(nome || '')
    .replace(/\.pdf$/i, '')
    .replace(ID_DE_DOWNLOAD, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// A book owns two blobs: the PDF and the cover. This is the single definition of
// "which bytes belong to a book" — the twin of blobIdsDasMusicas, deliberately
// separate from it. A second axis of truth inside that function is exactly how
// deleting and exporting start disagreeing.
export function blobIdsDosLivros(books) {
  const out = [];
  for (const b of (books || [])) {
    if (b.blobId) out.push(b.blobId);
    if (b.capaBlobId) out.push(b.capaBlobId);
  }
  return out;
}

// Merge on import. The rule is one line: a book the device already has is kept
// as it is. Rewriting it would cost 300 MB of copy and would overwrite a title
// the owner fixed by hand and the page they stopped on. Absence never deletes.
export function fundeLivros(atuais, doArquivo) {
  const books = (atuais || []).slice();
  const conhecidos = new Set(books.map((b) => b.id));
  let added = 0;
  for (const b of (doArquivo || [])) {
    if (!b || !b.id || conhecidos.has(b.id)) continue;
    books.push(b);
    conhecidos.add(b.id);
    added++;
  }
  return { books, added, updated: 0 };
}
