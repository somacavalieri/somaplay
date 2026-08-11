// export.test.js — o recorte que a exportação filtrada usa.
//
// O motor não sabe o que é fonte: recebe um conjunto de ids de música e um de
// ids de lista, e devolve as três coleções recortadas. É esse desenho que deixa
// "exportar este artista" e "exportar esta lista" entrarem depois sem mexer
// aqui.
//
// A asserção que mais importa é a primeira: com null nos dois, o recorte
// devolve a biblioteca inteira. É ela que garante que o backup completo — o
// caminho que todo usuário já usa hoje — não regrediu quando o filtro entrou.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recorteParaExport, nomeDoExport, stampDeHoje } from '../js/backup.js';

// 'ar3' não tem música de propósito: sem ele, o teste do recorte nulo passaria
// mesmo se os artistas fossem filtrados, e a asserção que mais importa não
// poderia falhar. Ele é o que separa "devolveu tudo" de "filtrou e coube".
const lib = () => ({
  artists: [{ id: 'ar1', name: 'Gil' }, { id: 'ar2', name: 'Caetano' }, { id: 'ar3', name: 'Sem músicas' }],
  songs: [
    { id: 's1', artistId: 'ar1', fonte: 'Songbook' },
    { id: 's2', artistId: 'ar1', fonte: 'CifraClub' },
    { id: 's3', artistId: 'ar2', fonte: 'CifraClub' },
  ],
  lists: [
    { id: 'l1', nome: 'Show', musicas: ['s1', 's3'] },
    { id: 'l2', nome: 'Estudo', musicas: ['s2'] },
  ],
});

test('null nos dois campos devolve a biblioteca inteira', () => {
  const estado = lib();
  const r = recorteParaExport(estado, { songIds: null, listIds: null });
  assert.deepEqual(r.artists, estado.artists);
  assert.deepEqual(r.songs, estado.songs);
  assert.deepEqual(r.lists, estado.lists);
});

test('sem o segundo argumento, também devolve tudo', () => {
  const estado = lib();
  assert.deepEqual(recorteParaExport(estado).songs, estado.songs);
});

test('leva só as músicas do conjunto', () => {
  const r = recorteParaExport(lib(), { songIds: new Set(['s1']) });
  assert.deepEqual(r.songs.map((s) => s.id), ['s1']);
});

test('leva só os artistas que têm música no recorte', () => {
  const r = recorteParaExport(lib(), { songIds: new Set(['s1']) });
  assert.deepEqual(r.artists.map((a) => a.id), ['ar1']);
});

test('as listas viajam inteiras, com os ids órfãos preservados', () => {
  // 's3' fica de fora do recorte, mas continua na lista: quando a outra fonte
  // for importada, a lista se completa sozinha no destino.
  const r = recorteParaExport(lib(), { songIds: new Set(['s1']) });
  assert.deepEqual(r.lists.map((l) => l.id), ['l1', 'l2']);
  assert.deepEqual(r.lists[0].musicas, ['s1', 's3']);
});

test('listIds recorta as listas — é o que "exportar esta lista" vai usar', () => {
  const r = recorteParaExport(lib(), { songIds: null, listIds: new Set(['l1']) });
  assert.deepEqual(r.lists.map((l) => l.id), ['l1']);
});

test('conjunto vazio devolve recorte vazio, sem quebrar', () => {
  const r = recorteParaExport(lib(), { songIds: new Set() });
  assert.deepEqual(r.songs, []);
  assert.deepEqual(r.artists, []);
});

test('não muta o estado recebido', () => {
  const estado = lib();
  recorteParaExport(estado, { songIds: new Set(['s1']) });
  assert.equal(estado.songs.length, 3);
  assert.equal(estado.artists.length, 3);
});

test('tolera biblioteca com campos ausentes', () => {
  const r = recorteParaExport({}, { songIds: new Set(['s1']) });
  assert.deepEqual(r, { artists: [], songs: [], lists: [] });
});

// --- nome do arquivo -------------------------------------------------------
// Quatro arquivos chamados somaplay-backup-2026-08-11 na pasta de Downloads não
// servem para nada. O nome precisa dizer o recorte.

test('sem recorte, o nome é o de sempre', () => {
  assert.equal(nomeDoExport(null, '2026-08-11', 'fontes'), 'somaplay-backup-2026-08-11.somaplay');
  assert.equal(nomeDoExport([], '2026-08-11', 'fontes'), 'somaplay-backup-2026-08-11.somaplay');
});

test('uma fonte vira o nome dela', () => {
  assert.equal(nomeDoExport(['Songbook'], '2026-08-11', 'fontes'), 'somaplay-songbook-2026-08-11.somaplay');
});

test('o slug tira acento e espaço', () => {
  assert.equal(nomeDoExport(['Coletâneas VJ'], '2026-08-11', 'fontes'), 'somaplay-coletaneas-vj-2026-08-11.somaplay');
});

test('o balde sem fonte tem nome legível', () => {
  assert.equal(nomeDoExport(['__sem_fonte'], '2026-08-11', 'fontes'), 'somaplay-sem-fonte-2026-08-11.somaplay');
});

test('duas ou mais fontes viram a contagem, na língua do app', () => {
  assert.equal(nomeDoExport(['A', 'B', 'C'], '2026-08-11', 'fontes'), 'somaplay-3-fontes-2026-08-11.somaplay');
  assert.equal(nomeDoExport(['A', 'B'], '2026-08-11', 'sources'), 'somaplay-2-sources-2026-08-11.somaplay');
});

test('uma fonte que vira slug vazio cai no nome genérico', () => {
  assert.equal(nomeDoExport(['###'], '2026-08-11', 'fontes'), 'somaplay-backup-2026-08-11.somaplay');
});

test('o carimbo de data é zero-padded', () => {
  assert.equal(stampDeHoje(new Date(2026, 0, 5)), '2026-01-05');
});
