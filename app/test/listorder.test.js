import { test } from 'node:test';
import assert from 'node:assert/strict';
import { S, moveItem, indicesPresentes } from '../js/state.js';

test('moveItem: última para a primeira posição', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c', 'd'], 3, 0), ['d', 'a', 'b', 'c']);
});

test('moveItem: primeira para o fim', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c', 'd'], 0, 3), ['b', 'c', 'd', 'a']);
});

test('moveItem: um passo para baixo', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c'], 0, 1), ['b', 'a', 'c']);
});

test('moveItem: um passo para cima', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c'], 2, 1), ['a', 'c', 'b']);
});

test('moveItem: mesma posição não muda nada', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c'], 1, 1), ['a', 'b', 'c']);
});

test('moveItem: não muta o array original', () => {
  const orig = ['a', 'b', 'c'];
  moveItem(orig, 2, 0);
  assert.deepEqual(orig, ['a', 'b', 'c']);
});

// --- a ponte entre a posição visível e o índice real -------------------------
// Uma lista pode guardar id sem música: o export filtrado leva a lista inteira,
// e o que falta chega quando a outra fonte for importada. Até lá a tela pula
// essas linhas, então POSIÇÃO VISÍVEL ≠ índice em l.musicas. indicesPresentes é
// a tradução entre as duas; sem ela o arraste move a música errada.

// songById lê S.songs, então a "biblioteca" do teste mora ali.
const comBiblioteca = (ids) => { S.songs = ids.map((id) => ({ id })); };

test('indicesPresentes: sem órfão, é a identidade', () => {
  comBiblioteca(['a', 'b', 'c']);
  assert.deepEqual(indicesPresentes({ musicas: ['a', 'b', 'c'] }), [0, 1, 2]);
});

test('indicesPresentes: pula o id que não tem música', () => {
  comBiblioteca(['a', 'b', 'c']);
  assert.deepEqual(indicesPresentes({ musicas: ['a', 'x', 'b', 'c'] }), [0, 2, 3]);
  assert.deepEqual(indicesPresentes({ musicas: ['x', 'a', 'b'] }), [1, 2]);
  assert.deepEqual(indicesPresentes({ musicas: ['a', 'b', 'x'] }), [0, 1]);
});

test('indicesPresentes: só órfãos devolve vazio', () => {
  comBiblioteca(['a']);
  assert.deepEqual(indicesPresentes({ musicas: ['x', 'y'] }), []);
});

test('indicesPresentes: lista vazia, sem musicas e sem lista não quebram', () => {
  comBiblioteca(['a']);
  assert.deepEqual(indicesPresentes({ musicas: [] }), []);
  assert.deepEqual(indicesPresentes({}), []);
  assert.deepEqual(indicesPresentes(null), []);
  assert.deepEqual(indicesPresentes(undefined), []);
});

// A composição que applyReorder faz: a tela e o arraste falam em posição
// visível, moveItem só entende índice real.
const reordenaVisivel = (musicas, fromVis, toVis) => {
  const idx = indicesPresentes({ musicas });
  return moveItem(musicas, idx[fromVis], idx[toVis]);
};
const naTela = (musicas) => indicesPresentes({ musicas }).map((i) => musicas[i]);

test('arrastar a última para o topo com um órfão no meio', () => {
  comBiblioteca(['A', 'B', 'C']);
  const depois = reordenaVisivel(['A', 'ORPHAN', 'B', 'C'], 2, 0);
  assert.deepEqual(naTela(depois), ['C', 'A', 'B']);
  assert.equal(depois.length, 4, 'o id órfão continua na lista, para curar depois');
});

test('subir uma posição com o órfão na frente não é no-op', () => {
  comBiblioteca(['A', 'B']);
  const depois = reordenaVisivel(['ORPHAN', 'A', 'B'], 1, 0);
  assert.deepEqual(naTela(depois), ['B', 'A']);
});

test('descer a primeira até o fim atravessando o órfão', () => {
  comBiblioteca(['A', 'B', 'C']);
  const depois = reordenaVisivel(['A', 'B', 'ORPHAN', 'C'], 0, 2);
  assert.deepEqual(naTela(depois), ['B', 'C', 'A']);
});

test('sem órfão, reordenar por posição visível é o moveItem de sempre', () => {
  comBiblioteca(['A', 'B', 'C', 'D']);
  assert.deepEqual(reordenaVisivel(['A', 'B', 'C', 'D'], 3, 0), ['D', 'A', 'B', 'C']);
});
