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
