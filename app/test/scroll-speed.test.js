// scroll-speed.test.js — a escala da rolagem automática.
//
// A escala antiga era linear, de 1 a 10, a 0,7 px por passo de 30 ms. Ela
// começava rápido demais. A nova tem 5 níveis; o que os testes guardam é o
// formato dela: o piso é metade do antigo nível 1, o teto é o antigo nível 10,
// e no meio a subida é sempre crescente e sem degraus violentos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SCROLL_MIN, SCROLL_MAX, SCROLL_TICK_MS, clampSpeed, scrollStep, scrollPxPerSecond,
} from '../js/scroll-speed.js';

const ANTIGO = (nivel) => nivel * 0.7;   // px por passo na escala antiga

test('a escala tem cinco níveis', () => {
  assert.equal(SCROLL_MIN, 1);
  assert.equal(SCROLL_MAX, 5);
});

test('o nível 1 é a metade do antigo nível 1', () => {
  assert.equal(scrollStep(1), ANTIGO(1) / 2);
});

test('o nível 5 é o antigo nível 10', () => {
  assert.equal(scrollStep(5), ANTIGO(10));
});

test('a velocidade cresce a cada nível', () => {
  for (let n = SCROLL_MIN; n < SCROLL_MAX; n++) {
    assert.ok(scrollStep(n + 1) > scrollStep(n), `nível ${n + 1} não é mais rápido que ${n}`);
  }
});

test('nenhum degrau salta mais que o triplo do anterior', () => {
  for (let n = SCROLL_MIN; n < SCROLL_MAX; n++) {
    const razao = scrollStep(n + 1) / scrollStep(n);
    assert.ok(razao <= 3, `salto de ${n} para ${n + 1} é de ${razao.toFixed(2)}×`);
  }
});

test('níveis fora da faixa são presos nas pontas', () => {
  assert.equal(clampSpeed(0), 1);
  assert.equal(clampSpeed(-4), 1);
  assert.equal(clampSpeed(6), 5);          // valores salvos pela escala antiga
  assert.equal(clampSpeed(10), 5);
  assert.equal(clampSpeed(undefined), 1);
  assert.equal(clampSpeed('3'), 3);        // o range das configurações entrega texto
  assert.equal(clampSpeed(2.6), 3);
});

test('scrollStep aceita qualquer entrada sem devolver undefined', () => {
  for (const v of [0, 1, 5, 11, -2, null, undefined, NaN, '4']) {
    assert.equal(typeof scrollStep(v), 'number', `scrollStep(${v}) não é número`);
    assert.ok(scrollStep(v) > 0);
  }
});

test('o passo mais lento ainda rende mais de 10 px por segundo', () => {
  // abaixo disso a rolagem some: o navegador arredonda e a cifra parece parada
  assert.ok(scrollPxPerSecond(1) > 10, `${scrollPxPerSecond(1)} px/s`);
  assert.equal(SCROLL_TICK_MS, 30);
});
