import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chordDiagWidth } from '../js/chords.js';

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
