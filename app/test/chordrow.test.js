import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chordDiagWidth, layoutChordRow } from '../js/chords.js';

test('chordDiagWidth: forma na 1ª posição, small = 64', () => {
  assert.equal(chordDiagWidth('C', true, null), 64);
});

test('chordDiagWidth: forma em casa alta ganha margem do indicador (small = 76)', () => {
  // G/D no catálogo: frets [-1,5,5,4,3,-1] → base na 3ª casa → +12
  assert.equal(chordDiagWidth('G/D', true, null), 76);
});

test('chordDiagWidth: acorde desconhecido usa largura base (placeholder "?")', () => {
  assert.equal(chordDiagWidth('Zx9', true, null), 64);
});

test('chordDiagWidth: digitação da música tem prioridade sobre o catálogo', () => {
  const dict = { C: { frets: [-1, -1, 10, 9, 8, 8] } }; // casa alta → +12
  assert.equal(chordDiagWidth('C', true, dict), 76);
});

test('chordDiagWidth: tamanho grande (small=false) = 84 / 99', () => {
  assert.equal(chordDiagWidth('C', false, null), 84);
  assert.equal(chordDiagWidth('G/D', false, null), 99);
});

const w64 = () => 64; // largura fixa: isola o layout do catálogo

test('layoutChordRow: sem colisão, x = coluna × largura do caractere', () => {
  // 'Gm' + 9 espaços → 'G7/B' começa na coluna 11
  const r = layoutChordRow('Gm         G7/B', 10, w64);
  assert.deepEqual(r.map((i) => [i.tok, i.x]), [['Gm', 0], ['G7/B', 110]]);
});

test('layoutChordRow: colisão empurra para a direita com gap de 6px', () => {
  const r = layoutChordRow('C D', 10, w64);
  assert.equal(r[0].x, 0);
  assert.equal(r[1].x, 70); // ideal 20, mas 0+64+6 = 70
});

test('layoutChordRow: empurrão se propaga em cadeia', () => {
  const r = layoutChordRow('C D E', 10, w64);
  assert.deepEqual(r.map((i) => i.x), [0, 70, 140]);
});

test('layoutChordRow: token não-acorde é marcado e participa do layout', () => {
  const r = layoutChordRow('Gm % x2', 10, (tok, isChord) => (isChord ? 64 : 20));
  assert.deepEqual(r.map((i) => [i.tok, i.isChord]),
    [['Gm', true], ['%', false], ['x2', false]]);
  assert.equal(r[1].x, 70); // ideal 30, empurrado para 0+64+6
  assert.equal(r[2].x, 96); // ideal 50, empurrado para 70+20+6
});

test('layoutChordRow: linha vazia → sem itens', () => {
  assert.deepEqual(layoutChordRow('', 10, w64), []);
  assert.deepEqual(layoutChordRow('   ', 10, w64), []);
});
