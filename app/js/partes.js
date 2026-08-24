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

// As partes que descrevem uma MÚSICA — todas elas têm entrada em CAMPOS.
export const PARTES_DE_MUSICA = ['cifra', 'audio', 'pessoal', 'anotacoes'];

// As partes que existiam antes da 0.16.0. Um arquivo que declara todas ELAS era
// completo na época em que foi escrito, e continua sendo — completude é
// propriedade do arquivo, não da versão do código que o lê.
const PARTES_LEGADO = ['cifra', 'audio', 'pessoal'];

// Tudo que um arquivo pode declarar que carrega: as partes de música mais as
// coleções de topo. `livros` é a primeira coleção de topo a entrar aqui, e por
// isso NÃO tem entrada em CAMPOS — livro não é campo de música, é uma coleção
// ao lado de `lists`.
//
// As duas coleções entram no arquivo por regras diferentes, de propósito:
// `anotacoes` é campo de música e viaja junto com a música, inclusive num
// recorte; `livros` pesa centenas de megabytes, então quem decide se ele viaja
// é uma caixa própria em Settings — a única parte cuja pergunta vale a pena
// fazer em voz alta, porque é a única que muda o arquivo de dezenas para
// centenas de MB.
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
  anotacoes: ['anotacoes'],
};

// Anything that is not a list of parts reads as a complete file: that is what a
// .somaplay written before this format means, and what a corrupt one should mean
// instead of bringing the import down. Every reader goes through here — the
// guard lives with the vocabulary, by the same argument that put CAMPOS here.
export function normalizaPartes(partes) {
  return Array.isArray(partes) ? partes : PARTES_TODAS;
}

// Duas perguntas parecidas que NÃO são a mesma.
//
// Na saída: "este export é um backup completo?" — escrito por este código, então
// vale o vocabulário de hoje. Sem isso, um export que declarasse só as três
// partes antigas cairia no caminho rápido e levaria junto a anotação que não
// declarou.
//
// Na entrada: "este arquivo era completo quando foi escrito?" — e aí vale o
// vocabulário da época dele. É esta assimetria que faz todo .somaplay já gravado
// continuar restaurando o registro INTEIRO: exigir dele as partes que nem
// existiam quando foi escrito o derrubaria na cópia campo a campo, e ele perderia
// em silêncio qualquer campo fora de CAMPOS — na volta, que é a direção que
// ninguém confere.
const exportCompleto = (ps) => PARTES_TODAS.every((p) => ps.includes(p));
const arquivoCompleto = (ps) => PARTES_LEGADO.every((p) => ps.includes(p));

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
  if (exportCompleto(ps)) return (songs || []).slice();
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
  if (arquivoCompleto(ps)) Object.assign(out, doArquivo);
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
