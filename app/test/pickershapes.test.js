import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickerShapes, shapesOf, defaultShape } from '../js/chordbook.js';

test('pickerShapes: sem digitação → padrão do dicionário selecionada', () => {
  const { shapes, selId } = pickerShapes('C', null);
  assert.equal(selId, defaultShape('C').id);
  assert.equal(shapes.length, shapesOf('C').length);
});

test('pickerShapes: match por varId vence o match por forma', () => {
  const alvo = shapesOf('C')[1] || shapesOf('C')[0];
  const cur = { frets: [9, 9, 9, 9, 9, 9], varId: alvo.id }; // frets não batem — varId decide
  assert.equal(pickerShapes('C', cur).selId, alvo.id);
});

test('pickerShapes: sem varId, match pela forma (shapeKey)', () => {
  const alvo = shapesOf('C')[0];
  const cur = { frets: alvo.frets.slice(), ...(alvo.barre ? { barre: { ...alvo.barre } } : {}) };
  assert.equal(pickerShapes('C', cur).selId, alvo.id);
});

test('pickerShapes: digitação custom → pseudo-item __song "desta música" no fim', () => {
  const { shapes, selId } = pickerShapes('C', { frets: [-1, 9, 8, 7, 9, -1] });
  assert.equal(selId, '__song');
  const last = shapes[shapes.length - 1];
  assert.equal(last.id, '__song');
  assert.equal(last.label, 'desta música');
  assert.equal(shapes.length, shapesOf('C').length + 1);
});

test('pickerShapes: acorde desconhecido sem digitação → sem formas, selId null', () => {
  const { shapes, selId } = pickerShapes('Zx9', null);
  assert.deepEqual(shapes, []);
  assert.equal(selId, null);
});
