import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openEditor, toggleBarre, tapCell, tapHead, setBase, suggestLabel, editorShape } from '../js/render/chordeditor.js';

const ORIG = { kind: 'book', varId: null };

test('openEditor: sem forma começa com tudo abafado na 1ª casa', () => {
  const st = openEditor('X', null, ORIG);
  assert.deepEqual(st.frets, [-1, -1, -1, -1, -1, -1]);
  assert.equal(st.barre, null);
  assert.equal(st.base, 1);
});

test('openEditor: deriva a casa base de voicing alto', () => {
  assert.equal(openEditor('X', { frets: [-1, 7, 9, 9, 8, 7] }, ORIG).base, 7);
  assert.equal(openEditor('X', { frets: [-1, 3, 2, 0, 1, 0] }, ORIG).base, 1);
});

test('toggleBarre: cria pestana cheia e sobe as cordas abaixo da casa', () => {
  const r = toggleBarre(openEditor('F', null, ORIG), 1);
  assert.deepEqual(r.frets, [1, 1, 1, 1, 1, 1]);
  assert.deepEqual(r.barre, { fret: 1, from: 0, to: 5 });
});

test('toggleBarre: corda presa acima da casa não é rebaixada', () => {
  const r = toggleBarre(openEditor('F', { frets: [-1, -1, 3, 2, -1, -1] }, ORIG), 1);
  assert.deepEqual(r.frets, [1, 1, 3, 2, 1, 1]);
});

test('toggleBarre na mesma casa desliga e preserva os valores', () => {
  const r = toggleBarre(toggleBarre(openEditor('F', null, ORIG), 1), 1);
  assert.equal(r.barre, null);
  assert.deepEqual(r.frets, [1, 1, 1, 1, 1, 1]);
});

test('toggleBarre em outra casa move a pestana (só uma por forma)', () => {
  const r = toggleBarre(toggleBarre(openEditor('F', null, ORIG), 1), 3);
  assert.deepEqual(r.barre, { fret: 3, from: 0, to: 5 });
  assert.deepEqual(r.frets, [3, 3, 3, 3, 3, 3]);
});

test('tapCell na casa da pestana move a ponta mais próxima (encurta)', () => {
  const st = toggleBarre(openEditor('Bm7', null, ORIG), 2);
  const r = tapCell(st, 1, 2);
  assert.deepEqual(r.barre, { fret: 2, from: 1, to: 5 });
  assert.deepEqual(r.frets, [2, 2, 2, 2, 2, 2]); // a corda que saiu mantém o valor
});

test('corda liberada volta a aceitar ✕/○ e a pestana não muda', () => {
  let st = tapCell(toggleBarre(openEditor('Bm7', null, ORIG), 2), 1, 2);
  st = tapHead(st, 0);
  assert.equal(st.frets[0], 0);
  st = tapHead(st, 0);
  assert.equal(st.frets[0], -1);
  assert.deepEqual(st.barre, { fret: 2, from: 1, to: 5 });
});

test('tapCell fora do vão estende a pestana', () => {
  const st = { name: 'X', frets: [-1, 2, 2, 2, 2, 2], barre: { fret: 2, from: 1, to: 5 }, base: 1, label: '', origin: ORIG };
  const r = tapCell(st, 0, 2);
  assert.deepEqual(r.barre, { fret: 2, from: 0, to: 5 });
  assert.equal(r.frets[0], 2);
});

test('tapCell numa casa abaixo encolhe o vão pela ponta e a pestana sobrevive', () => {
  const st = { name: 'X', frets: [-1, 3, 3, 3, 3, -1], barre: { fret: 3, from: 1, to: 4 }, base: 1, label: '', origin: ORIG };
  const r = tapCell(st, 1, 2);
  assert.deepEqual(r.barre, { fret: 3, from: 2, to: 4 });
  assert.deepEqual(r.frets, [-1, 2, 3, 3, 3, -1]);
});

test('tapCell encolhendo até sobrar uma corda remove a pestana', () => {
  const st = { name: 'X', frets: [0, 3, 3, 0, 0, 0], barre: { fret: 3, from: 1, to: 2 }, base: 1, label: '', origin: ORIG };
  const r = tapCell(st, 2, 1);
  assert.equal(r.barre, null);
  assert.equal(r.frets[2], 1);
  assert.equal(r.frets[1], 3);
});

test('corda interna abaixo da pestana está travada (no-op)', () => {
  const st = toggleBarre(openEditor('F', null, ORIG), 3);
  assert.equal(tapCell(st, 2, 1), st);
  assert.equal(tapHead(st, 2), st);
});

test('nota acima da pestana é permitida e mantém a barra', () => {
  const st = toggleBarre(openEditor('Bm7', null, ORIG), 2);
  const r = tapCell(st, 2, 4);
  assert.equal(r.frets[2], 4);
  assert.deepEqual(r.barre, { fret: 2, from: 0, to: 5 });
});

test('encolher pela cabeça até sobrar uma corda remove a pestana', () => {
  const st = { name: 'X', frets: [0, 3, 3, 0, 0, 0], barre: { fret: 3, from: 1, to: 2 }, base: 1, label: '', origin: ORIG };
  const r = tapHead(st, 2);
  assert.equal(r.barre, null);
  assert.equal(r.frets[2], 0);
  assert.equal(r.frets[1], 3);
});

test('tapCell fora do vão alterna: mesma casa de novo solta a corda', () => {
  let st = openEditor('X', null, ORIG);
  st = tapCell(st, 3, 2);
  assert.equal(st.frets[3], 2);
  st = tapCell(st, 3, 2);
  assert.equal(st.frets[3], 0);
});

test('setBase desloca a janela e respeita os limites 1..15', () => {
  const st = openEditor('C', null, ORIG);
  assert.equal(setBase(st, -1).base, 1);
  assert.equal(setBase(st, 1).base, 2);
  let hi = st;
  for (let i = 0; i < 20; i++) hi = setBase(hi, 1);
  assert.equal(hi.base, 15);
});

test('suggestLabel: pestana, casa alta, aberto e desempate', () => {
  const b = toggleBarre(openEditor('F', null, ORIG), 3);
  assert.equal(suggestLabel(b, []), 'pestana 3ª');
  assert.equal(suggestLabel(b, ['pestana 3ª']), 'pestana 3ª (2)');
  assert.equal(suggestLabel(b, ['pestana 3ª', 'pestana 3ª (2)']), 'pestana 3ª (3)');
  assert.equal(suggestLabel(openEditor('C', null, ORIG), []), 'aberto');
  assert.equal(suggestLabel(setBase(openEditor('C', null, ORIG), 4), []), 'casa 5ª');
});

test('editorShape → openEditor: round-trip preserva casas e pestana', () => {
  const st = toggleBarre(openEditor('Bm7', { frets: [-1, 2, 4, 2, 3, 2] }, ORIG), 2);
  const shape = editorShape(st);
  const back = openEditor('Bm7', shape, ORIG);
  assert.deepEqual(back.frets, shape.frets);
  assert.deepEqual(back.barre, shape.barre);
});

test('editorShape: sem pestana não emite a chave barre', () => {
  const s = editorShape(openEditor('C', { frets: [-1, 3, 2, 0, 1, 0] }, ORIG));
  assert.equal('barre' in s, false);
});
