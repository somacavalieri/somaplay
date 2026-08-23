// panzoom.test.js — a matemática do gesto, que é a parte testável sem tela.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampZoom, escalaDaPinca, distanciaEntre, ZOOM_MIN, ZOOM_MAX } from '../js/panzoom.js';

test('o zoom não sai da faixa', () => {
  assert.equal(clampZoom(0.1), ZOOM_MIN);
  assert.equal(clampZoom(99), ZOOM_MAX);
  assert.equal(clampZoom(1.5), 1.5);
});

test('a pinça multiplica o zoom inicial pela razão das distâncias', () => {
  assert.equal(escalaDaPinca(1, 200, 100), 2);
  assert.equal(escalaDaPinca(2, 50, 100), 1);
});

test('a pinça também respeita a faixa', () => {
  assert.equal(escalaDaPinca(3, 400, 100), ZOOM_MAX);
  assert.equal(escalaDaPinca(1, 1, 100), ZOOM_MIN);
});

test('distância inicial zero não vira divisão por zero', () => {
  // Dois toques exatamente no mesmo pixel acontecem, e um NaN aqui congelaria
  // o zoom até recarregar o app.
  assert.equal(Number.isFinite(escalaDaPinca(1, 100, 0)), true);
});

test('distância entre dois toques é a hipotenusa', () => {
  assert.equal(distanciaEntre([{ clientX: 0, clientY: 0 }, { clientX: 3, clientY: 4 }]), 5);
});

test('a faixa de zoom é a mesma que a tela de tocar já usava', () => {
  // play.js clampava em 0.4 e 4 na mão; extrair o gesto não pode mudar a faixa
  // debaixo de quem já usa o app no palco.
  assert.equal(ZOOM_MIN, 0.4);
  assert.equal(ZOOM_MAX, 4);
});
