import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moveItem } from '../js/state.js';

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
