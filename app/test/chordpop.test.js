import { test } from 'node:test';
import assert from 'node:assert/strict';
import { popPosition } from '../js/render/chordpop.js';

const A = (x, y) => ({ x, y, w: 40, h: 20 });

test('popPosition: acima do acorde e centrado quando cabe', () => {
  const p = popPosition(A(400, 500), 200, 240, 1024, 768);
  assert.deepEqual(p, { left: 320, top: 254 }); // 400+20−100 · 500−6−240
});

test('popPosition: vira para baixo quando não cabe acima', () => {
  const p = popPosition(A(400, 100), 200, 240, 1024, 768);
  assert.equal(p.top, 126); // 100+20+6
});

test('popPosition: clampa nas bordas esquerda e direita', () => {
  assert.equal(popPosition(A(0, 500), 200, 240, 1024, 768).left, 8);
  assert.equal(popPosition(A(1000, 500), 200, 240, 1024, 768).left, 816); // 1024−200−8
});

test('popPosition: clampa embaixo quando não cabe nem acima nem abaixo', () => {
  const p = popPosition(A(400, 300), 200, 700, 1024, 768);
  assert.equal(p.top, 60); // 768−700−8
});
