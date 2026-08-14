// apagar.test.js — as duas decisões puras do apagar em lote.
//
// O motor de apagar não sabe o que é fonte: ele recebe ids. O que sobra de
// decidível sem navegador é (a) quais arquivos aquelas músicas levam junto e
// (b) quais artistas ficam sem música nenhuma. Os dois são O(n) de propósito:
// a versão "um some() por música apagada" é O(n²) e trava o app com 5 mil ids.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blobIdsDasMusicas, artistasOrfaos } from '../js/state.js';

const song = (id, artistId) => ({ id, artistId });

// ---------- artistasOrfaos ----------

test('artista que perde todas as músicas fica órfão', () => {
  const songs = [song('s1', 'a1'), song('s2', 'a1')];
  assert.deepEqual(artistasOrfaos(songs, new Set(['s1', 's2'])), ['a1']);
});

test('artista que sobrevive com uma música não fica órfão', () => {
  const songs = [song('s1', 'a1'), song('s2', 'a1')];
  assert.deepEqual(artistasOrfaos(songs, new Set(['s1'])), []);
});

test('cada artista órfão aparece uma vez só', () => {
  const songs = [song('s1', 'a1'), song('s2', 'a1'), song('s3', 'a2')];
  assert.deepEqual(artistasOrfaos(songs, new Set(['s1', 's2', 's3'])), ['a1', 'a2']);
});

test('conjunto vazio não deixa ninguém órfão', () => {
  assert.deepEqual(artistasOrfaos([song('s1', 'a1')], new Set()), []);
});

test('música sem artista não vira artista órfão', () => {
  assert.deepEqual(artistasOrfaos([song('s1', undefined)], new Set(['s1'])), []);
});

// ---------- blobIdsDasMusicas ----------

test('junta imagens, stems e full de várias músicas', () => {
  const songs = [
    { id: 's1', cifra: { imagens: [{ blobId: 'b1' }, { blobId: 'b2' }] }, stems: [{ blobId: 'b3' }] },
    { id: 's2', full: [{ blobId: 'b4' }] },
  ];
  assert.deepEqual(blobIdsDasMusicas(songs), ['b1', 'b2', 'b3', 'b4']);
});

test('ignora blobId nulo e coleções ausentes', () => {
  const songs = [
    { id: 's1', cifra: { imagens: [{ blobId: null }, { blobId: 'b1' }] } },
    { id: 's2', cifra: { tipo: 'texto', texto: 'C  G' }, stems: [], full: [] },
    { id: 's3' },
  ];
  assert.deepEqual(blobIdsDasMusicas(songs), ['b1']);
});

test('nenhuma música, nenhum arquivo', () => {
  assert.deepEqual(blobIdsDasMusicas([]), []);
});

// Este é o contrato que `exportLibrary` passa a consumir no lugar do laço
// inline dele: a mesma música, os mesmos ids, na mesma ordem.
test('a música completa devolve imagens, stems e full nessa ordem', () => {
  const s = {
    id: 's1',
    cifra: { tipo: 'imagem', imagens: [{ tipo: 'aberta', blobId: 'img-a' }, { tipo: 'fechada', blobId: 'img-f' }] },
    stems: [{ nome: 'voz', blobId: 'st-1' }, { nome: 'violão', blobId: 'st-2' }],
    full: [{ nome: 'original', blobId: 'fu-1' }],
  };
  assert.deepEqual(blobIdsDasMusicas([s]), ['img-a', 'img-f', 'st-1', 'st-2', 'fu-1']);
});
