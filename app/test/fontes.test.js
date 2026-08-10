// fontes.test.js — os atalhos do campo Fonte no formulário de adicionar/editar.
//
// A lista não é escrita à mão: vem da biblioteca. O que este teste protege é a
// ordem (mais usadas primeiro), a dedupe por grafia (uma música salva com
// "cifraclub" não pode criar um segundo chip) e o corte, que conta os fixos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fontesSugeridas, FONTES_FIXAS } from '../js/state.js';

const song = (fonte) => ({ fonte });

test('biblioteca vazia mostra só os dois atalhos fixos', () => {
  assert.deepEqual(fontesSugeridas([]), ['CifraClub', 'Songbook']);
  assert.deepEqual(FONTES_FIXAS, ['CifraClub', 'Songbook']);
});

test('as fontes usadas vêm depois dos fixos, mais usadas primeiro', () => {
  const songs = [song('Real Book'), song('YouTube'), song('Real Book'), song('Real Book'), song('YouTube')];
  assert.deepEqual(fontesSugeridas(songs), ['CifraClub', 'Songbook', 'Real Book', 'YouTube']);
});

test('empate na contagem desempata em ordem alfabética', () => {
  const songs = [song('YouTube'), song('Real Book'), song('Ouvido')];
  assert.deepEqual(fontesSugeridas(songs), ['CifraClub', 'Songbook', 'Ouvido', 'Real Book', 'YouTube']);
});

test('grafia diferente da mesma fonte não vira chip novo', () => {
  const songs = [song('Real Book'), song('real book'), song('REAL BOOK  ')];
  assert.deepEqual(fontesSugeridas(songs), ['CifraClub', 'Songbook', 'Real Book']);
});

test('a primeira grafia encontrada é a que aparece', () => {
  const songs = [song('real book'), song('Real Book')];
  assert.deepEqual(fontesSugeridas(songs), ['CifraClub', 'Songbook', 'real book']);
});

test('uma fonte igual a um fixo não é duplicada, em qualquer caixa', () => {
  const songs = [song('cifraclub'), song('CifraClub'), song(' Songbook ')];
  assert.deepEqual(fontesSugeridas(songs), ['CifraClub', 'Songbook']);
});

test('fonte vazia, só espaço ou ausente é ignorada', () => {
  const songs = [song(''), song('   '), song(undefined), {}, song('Ouvido')];
  assert.deepEqual(fontesSugeridas(songs), ['CifraClub', 'Songbook', 'Ouvido']);
});

test('o corte conta os dois fixos', () => {
  const songs = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(song);
  assert.deepEqual(fontesSugeridas(songs), ['CifraClub', 'Songbook', 'A', 'B', 'C', 'D', 'E', 'F']);
  assert.equal(fontesSugeridas(songs).length, 8);
});

test('o limite é ajustável', () => {
  const songs = [song('Ouvido')];
  assert.deepEqual(fontesSugeridas(songs, 3), ['CifraClub', 'Songbook', 'Ouvido']);
  assert.deepEqual(fontesSugeridas(songs, 2), ['CifraClub', 'Songbook']);
});
