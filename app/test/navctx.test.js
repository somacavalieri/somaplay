// navctx.test.js — a lista de irmãs derivada do contexto de navegação.
//
// O que este teste protege: que a gaveta mostre EXATAMENTE o que a tela de
// origem mostrou. Cada caso aqui corresponde a uma tela — artista, estilo,
// lista, busca — e as diferenças entre elas são de propósito: a lista ignora a
// lente porque Listas são globais (PRD §7), e o id órfão fica de fora porque a
// numeração da gaveta precisa bater com a da tela da lista.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  S, listaAberta, songsDaBusca, songsDoContexto, posicaoNoContexto,
} from '../js/state.js';

// Biblioteca mínima do teste. songById/artistName leem S, então a "biblioteca"
// mora ali — mesmo padrão de listorder.test.js.
function biblioteca() {
  S.artists = [{ id: 'a1', name: 'Djavan' }, { id: 'a2', name: 'Caetano' }];
  S.songs = [
    { id: 's1', artistId: 'a1', title: 'Oceano', estilo: 'MPB', createdAt: 10 },
    { id: 's2', artistId: 'a1', title: 'Flor de Lis', estilo: 'MPB', createdAt: 30, stems: [{ id: 'x' }] },
    { id: 's3', artistId: 'a1', title: 'Sina', estilo: 'Samba', createdAt: 20 },
    // Título no fim do alfabeto e artista no começo, de propósito: assim a
    // ordenação por título e a por artista dão resultados DIFERENTES, e um teste
    // não passa por acidente confirmando a outra.
    { id: 's4', artistId: 'a2', title: 'Zabelê', estilo: 'MPB', createdAt: 40 },
  ];
  S.lists = [{ id: 'l1', nome: 'Show', musicas: ['s3', 'sX', 's1'] }];
  S.query = '';
  S.sort = 'title';
  S.modeFilter = [];
  S.fonteFilter = [];
  S.currentSongId = null;
  S.navCtx = null;
}

const ids = (songs) => songs.map((s) => s.id);

test('artista: em ordem alfabética', () => {
  biblioteca();
  assert.deepEqual(ids(songsDoContexto({ kind: 'artist', id: 'a1' })), ['s2', 's1', 's3']);
});

test('artista: a lente de modo corta a lista', () => {
  biblioteca();
  S.modeFilter = ['T2'];   // só quem tem acompanhamento
  assert.deepEqual(ids(songsDoContexto({ kind: 'artist', id: 'a1' })), ['s2']);
});

test('estilo: junta artistas diferentes, em ordem alfabética', () => {
  biblioteca();
  assert.deepEqual(ids(songsDoContexto({ kind: 'estilo', id: 'MPB' })), ['s2', 's1', 's4']);
});

test('lista: ordem do show, e o id órfão fica de fora', () => {
  biblioteca();
  // 'sX' não existe na biblioteca: viaja num export por fonte e se cura quando
  // a outra fonte for importada. Até lá a gaveta não pode prometê-lo.
  assert.deepEqual(ids(songsDoContexto({ kind: 'list', id: 'l1' })), ['s3', 's1']);
});

test('lista: a lente NÃO se aplica — Listas são globais', () => {
  biblioteca();
  S.modeFilter = ['T2'];
  assert.deepEqual(ids(songsDoContexto({ kind: 'list', id: 'l1' })), ['s3', 's1']);
});

test('lista: Favoritas é virtual e mesmo assim resolve', () => {
  biblioteca();
  S.songs[0].favorita = true;
  S.songs[2].favorita = true;
  assert.equal(listaAberta('__fav').id, '__fav');
  assert.deepEqual(ids(songsDoContexto({ kind: 'list', id: '__fav' })), ['s1', 's3']);
});

test('lista: id inexistente devolve lista vazia, sem estourar', () => {
  biblioteca();
  assert.deepEqual(songsDoContexto({ kind: 'list', id: 'nao-existe' }), []);
});

test('busca: ordenação por título', () => {
  biblioteca();
  assert.deepEqual(ids(songsDaBusca()), ['s2', 's1', 's3', 's4']);
});

test('busca: ordenação por artista, desempatando por título', () => {
  biblioteca();
  S.sort = 'artist';
  // Caetano antes de Djavan; dentro de Djavan, por título.
  assert.deepEqual(ids(songsDaBusca()), ['s4', 's2', 's1', 's3']);
});

test('busca: ordenação por recente', () => {
  biblioteca();
  S.sort = 'recent';
  assert.deepEqual(ids(songsDaBusca()), ['s4', 's2', 's3', 's1']);
});

test('busca: o termo filtra por título e por artista', () => {
  biblioteca();
  S.query = 'caetano';
  assert.deepEqual(ids(songsDaBusca()), ['s4']);
  S.query = 'sina';
  assert.deepEqual(ids(songsDaBusca()), ['s3']);
});

test('contexto home usa a busca', () => {
  biblioteca();
  S.query = 'oce';
  assert.deepEqual(ids(songsDoContexto({ kind: 'home', id: null })), ['s1']);
});

test('sem contexto: lista vazia', () => {
  biblioteca();
  assert.deepEqual(songsDoContexto(null), []);
});

test('posição: primeira, meio, última', () => {
  biblioteca();
  const ctx = { kind: 'artist', id: 'a1' };   // s2, s1, s3
  S.currentSongId = 's2';
  assert.deepEqual(posicaoNoContexto(songsDoContexto(ctx)), { i: 0, n: 3 });
  S.currentSongId = 's1';
  assert.deepEqual(posicaoNoContexto(songsDoContexto(ctx)), { i: 1, n: 3 });
  S.currentSongId = 's3';
  assert.deepEqual(posicaoNoContexto(songsDoContexto(ctx)), { i: 2, n: 3 });
});

test('posição: música ausente do contexto devolve i = -1', () => {
  biblioteca();
  // O caso real: desfavoritar a música de dentro dela tira a atual do contexto
  // Favoritas sob os próprios pés. Ninguém pode travar por causa disso.
  S.songs[0].favorita = true;
  S.currentSongId = 's3';
  assert.deepEqual(posicaoNoContexto(songsDoContexto({ kind: 'list', id: '__fav' })), { i: -1, n: 1 });
});
