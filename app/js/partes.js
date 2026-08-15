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

export const PARTES_TODAS = ['cifra', 'audio', 'pessoal'];

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

// null = every part. With every part the records come back untouched — that is
// the complete-backup path, and the test asserts it rather than hoping for it.
export function podaPorPartes(songs, partes) {
  const ps = partes || PARTES_TODAS;
  if (PARTES_TODAS.every((p) => ps.includes(p))) return (songs || []).slice();
  const manter = ps.flatMap((p) => CAMPOS[p] || []);
  return (songs || []).map((s) => {
    const out = {};
    for (const k of IDENTIDADE) if (k in s) out[k] = s[k];
    for (const k of manter) if (k in s) out[k] = s[k];
    return out;
  });
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
// `atual` is null for a song the device does not have yet.
//
// CONTRACT: the returned record is a SHALLOW merge — its nested values are the
// same objects as the inputs', not copies. Callers persist it and drop it:
// DB.putSong structured-clones on the way into IndexedDB, and the import
// reloads S.songs from disk right after. Mutating a nested field of the
// returned record in place would write through into the caller's library — do
// not do that. This matches mergePlan, which has always returned
// `{ ...s, artistId }`; a deep copy here would be the only one in the codebase.
export function fundeMusica(atual, doArquivo, partes) {
  const ps = partes || PARTES_TODAS;
  const out = { ...(atual || {}) };
  for (const k of IDENTIDADE) if (k in doArquivo) out[k] = doArquivo[k];
  for (const p of ps) for (const k of (CAMPOS[p] || [])) if (k in doArquivo) out[k] = doArquivo[k];
  if (!out.cifra) out.cifra = cifraVazia();
  return out;
}
