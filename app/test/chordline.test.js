import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chordLineSegs } from '../js/chords.js';

test('chordLineSegs: espaços preservados byte a byte (concat == original)', () => {
  const line = '  C   D7/F#     Em  ';
  assert.equal(chordLineSegs(line).map((s) => s.text).join(''), line);
});

test('chordLineSegs: só tokens-acorde são marcados', () => {
  const segs = chordLineSegs('C N.C. x2 Bm7 | %');
  assert.deepEqual(segs.filter((s) => s.isChord).map((s) => s.text), ['C', 'Bm7']);
});

test('chordLineSegs: linha vazia → sem segmentos', () => {
  assert.deepEqual(chordLineSegs(''), []);
});

test('chordLineSegs: linha só de espaços vira um segmento não-acorde', () => {
  assert.deepEqual(chordLineSegs('   '), [{ text: '   ', name: '   ', isChord: false }]);
});
