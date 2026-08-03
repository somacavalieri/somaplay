import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dropIndex, shiftFor, posLabel, edgeScroll } from '../js/render/listdrag.js';

// step = altura da linha (66) + gap (10)
const STEP = 76;

test('dropIndex: sem deslocamento fica na mesma posição', () => {
  assert.equal(dropIndex(3, 0, STEP, 11), 3);
});

test('dropIndex: menos de meia linha não muda de posição', () => {
  assert.equal(dropIndex(3, 30, STEP, 11), 3);
  assert.equal(dropIndex(3, -30, STEP, 11), 3);
});

test('dropIndex: passando de meia linha cai na vizinha', () => {
  assert.equal(dropIndex(3, 45, STEP, 11), 4);
  assert.equal(dropIndex(3, -45, STEP, 11), 2);
});

test('dropIndex: da última para a primeira', () => {
  assert.equal(dropIndex(10, -10 * STEP, STEP, 11), 0);
});

test('dropIndex: limita nas duas pontas', () => {
  assert.equal(dropIndex(10, -5000, STEP, 11), 0);
  assert.equal(dropIndex(0, 5000, STEP, 11), 10);
});

test('shiftFor: arrastando para cima, as de cima descem uma linha', () => {
  assert.equal(shiftFor(0, 10, 0, STEP), STEP);
  assert.equal(shiftFor(9, 10, 0, STEP), STEP);
  assert.equal(shiftFor(10, 10, 0, STEP), 0); // a própria linha arrastada
});

test('shiftFor: arrastando para baixo, as de baixo sobem uma linha', () => {
  assert.equal(shiftFor(1, 0, 2, STEP), -STEP);
  assert.equal(shiftFor(2, 0, 2, STEP), -STEP);
  assert.equal(shiftFor(3, 0, 2, STEP), 0); // fora do intervalo afetado
});

test('shiftFor: sem movimento, ninguém desliza', () => {
  assert.equal(shiftFor(0, 5, 5, STEP), 0);
  assert.equal(shiftFor(7, 5, 5, STEP), 0);
});

test('posLabel: a linha arrastada mostra o destino', () => {
  assert.equal(posLabel(10, 10, 0), 1);
  assert.equal(posLabel(0, 0, 2), 3);
});

test('posLabel: arrastando para cima, as afetadas somam 1', () => {
  assert.equal(posLabel(0, 10, 0), 2);
  assert.equal(posLabel(9, 10, 0), 11);
});

test('posLabel: arrastando para baixo, as afetadas perdem 1', () => {
  assert.equal(posLabel(1, 0, 2), 1);
  assert.equal(posLabel(2, 0, 2), 2);
});

test('posLabel: fora do intervalo afetado, número original', () => {
  assert.equal(posLabel(3, 0, 2), 4);
  assert.equal(posLabel(4, 10, 8), 5);
});

test('edgeScroll: no meio da área não rola', () => {
  assert.equal(edgeScroll(500, 100, 900), 0);
});

test('edgeScroll: encostado no topo sobe na velocidade máxima', () => {
  assert.equal(edgeScroll(100, 100, 900), -14);
  assert.equal(edgeScroll(50, 100, 900), -14); // acima do topo continua no máximo
});

test('edgeScroll: encostado na base desce na velocidade máxima', () => {
  assert.equal(edgeScroll(900, 100, 900), 14);
  assert.equal(edgeScroll(950, 100, 900), 14);
});

test('edgeScroll: no meio da zona, velocidade proporcional', () => {
  assert.equal(edgeScroll(140, 100, 900), -7);  // 40px dentro de uma zona de 80
  assert.equal(edgeScroll(860, 100, 900), 7);
});
