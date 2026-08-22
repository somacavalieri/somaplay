// partes.js — the vocabulary of "what does this file talk about".
//
// A .somaplay declares which parts it carries. The merge honours that
// declaration, so "the file says nothing about audio" stops meaning "delete the
// audio" — which is what lets a light file and an audio pack merge in any order.
//
// Both sides of the exchange live here on purpose: podaPorPartes (export) and
// fundeMusica (import) read the same field map, and a second source of truth for
// it is exactly how the two would drift apart.
// Design: docs/superpowers/specs/2026-08-15-partes-do-arquivo-design.md

// As partes de uma MÚSICA. É este conjunto que `todasAsPartes` mede, e mexer
// nele muda o que "arquivo completo" significa para todo .somaplay já gravado.
export const PARTES_DE_MUSICA = ['cifra', 'audio', 'pessoal'];

// O que um arquivo pode declarar que carrega. Livro é coleção de topo, como as
// listas — não é campo de música, e por isso NÃO entra em CAMPOS.
//
// Acrescentar 'livros' aqui é seguro porque `todasAsPartes` continua medindo
// PARTES_DE_MUSICA: um backup antigo, que declara as três, segue sendo lido como
// completo e volta com o registro intacto. Exigir as quatro faria todo backup já
// gravado perder campo na restauração — em silêncio, e na direção que ninguém confere.
export const PARTES_TODAS = [...PARTES_DE_MUSICA, 'livros'];

// How the file says "this song". Never pruned: without it an audio-only pack
// would carry orphan bytes instead of a named song.
export const IDENTIDADE = ['id', 'artistId', 'title'];

// A new field on the song record MUST be added here, or it will travel in a
// backup and silently vanish from every share.
export const CAMPOS = {
  cifra: ['tom', 'cifra', 'letra', 'estilo', 'fonte'],
  audio: ['stems', 'full'],
  pessoal: ['favorita', 'createdAt'],
};

// Anything that is not a list of parts reads as a complete file: that is what a
// .somaplay written before this format means, and what a corrupt one should mean
// instead of bringing the import down. Every reader goes through here — the
// guard lives with the vocabulary, by the same argument that put CAMPOS here.
export function normalizaPartes(partes) {
  return Array.isArray(partes) ? partes : PARTES_TODAS;
}

const todasAsPartes = (ps) => PARTES_DE_MUSICA.every((p) => ps.includes(p));

// The one copy loop both sides share: identity always, plus the fields of the
// declared parts. `k in src` and not `src[k] !== undefined`, so a field the
// record simply does not have stays absent instead of becoming undefined.
const copiaCampos = (dest, src, ps) => {
  for (const k of IDENTIDADE) if (k in src) dest[k] = src[k];
  for (const p of ps) for (const k of (CAMPOS[p] || [])) if (k in src) dest[k] = src[k];
  return dest;
};

// null = every part. With every part the records come back untouched — that is
// the complete-backup path, and the test asserts it rather than hoping for it.
export function podaPorPartes(songs, partes) {
  const ps = normalizaPartes(partes);
  if (todasAsPartes(ps)) return (songs || []).slice();
  return (songs || []).map((s) => copiaCampos({}, s, ps));
}

// The app-wide invariant: every song has a cifra object, because the add/edit
// form always creates one. An audio-only pack would break it, and normalizaCifra
// (db.js:186) returns the song untouched when cifra is missing instead of
// filling in a default. Restoring it here means one place, rather than auditing
// every render for an unguarded `.cifra.`.
const cifraVazia = () => ({ tipo: null, imagens: [], texto: '', acordes: [], digitacoes: {} });

// Merge one incoming song onto what the device already has.
//
// The whole rule: a field belonging to a part the file does NOT declare is never
// touched. That is what keeps an audio pack alive when a light file lands after
// it, and what keeps the recipient's favourites when a repertoire update lands.
//
// `atual` is null for a song the device does not have yet. `agora` is the
// import's clock, passed in rather than read here so the function stays pure —
// see the createdAt rule at the bottom.
//
// CONTRACT: the returned record is a SHALLOW merge — its nested values are the
// same objects as the inputs', not copies. Callers persist it and drop it:
// DB.putSong structured-clones on the way into IndexedDB, and the import
// reloads S.songs from disk right after. Mutating a nested field of the
// returned record in place would write through into the caller's library — do
// not do that. This matches mergePlan, which has always returned
// `{ ...s, artistId }`; a deep copy here would be the only one in the codebase.
export function fundeMusica(atual, doArquivo, partes, agora = null) {
  const ps = normalizaPartes(partes);
  const out = { ...(atual || {}) };
  // The same fast path podaPorPartes has, and for the same reason. A file that
  // declares every part is a complete backup, and restoring one has to give the
  // record back WHOLE — including a field this module has never heard of. The
  // copy loop below would drop it silently, and only on the way back IN, which
  // is the direction nobody thinks to check.
  if (todasAsPartes(ps)) Object.assign(out, doArquivo);
  else copiaCampos(out, doArquivo, ps);
  if (!out.cifra) out.cifra = cifraVazia();
  // A shared song must arrive dated TODAY. createdAt sits in `pessoal` so it
  // does not travel — but with nothing filling the gap the song lands with no
  // date at all, and Recentes sorts on `(b.createdAt || 0)`, which parks a whole
  // imported repertoire at the bottom, at epoch 0. That is the lie the spec was
  // avoiding, inverted. Only for a song the device does not have yet and whose
  // file did not carry the date: an existing record keeps its own, and a
  // complete backup keeps the one it restored.
  if (!atual && !out.createdAt && agora) out.createdAt = agora;
  return out;
}
