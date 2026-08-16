import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transporAcorde } from '../js/transpose.js';

test('desloca a fundamental', () => {
  assert.equal(transporAcorde('C', 2), 'D');
  assert.equal(transporAcorde('A', 1), 'Bb');
  assert.equal(transporAcorde('G', -1), 'F#');
});

test('qualidade, extensões e parênteses viajam intactos', () => {
  assert.equal(transporAcorde('Am7', 2), 'Bm7');
  assert.equal(transporAcorde('C7M', 1), 'C#7M');
  assert.equal(transporAcorde('F#m7(b5)', 1), 'Gm7(b5)');
  assert.equal(transporAcorde('E7(13)', 3), 'G7(13)');
  assert.equal(transporAcorde('A#º', 2), 'Cº');
});

test('desloca o baixo invertido', () => {
  assert.equal(transporAcorde('D/F#', 2), 'E/G#');
  assert.equal(transporAcorde('Cm6/Eb', 1), 'C#m6/E');
});

test('extensão depois da barra NÃO é baixo e não se desloca', () => {
  assert.equal(transporAcorde('Em7/5-', 2), 'F#m7/5-');
  assert.equal(transporAcorde('A7/13', 1), 'Bb7/13');
  assert.equal(transporAcorde('Bm5-/7', 2), 'C#m5-/7');
});

test('aceita as duas grafias na entrada e canoniza na saída', () => {
  assert.equal(transporAcorde('Db', 0), 'C#');
  assert.equal(transporAcorde('A#m', 0), 'Bbm');
  assert.equal(transporAcorde('Gb7', 0), 'F#7');
});

test('a volta cromática fecha, e ±12 é identidade', () => {
  assert.equal(transporAcorde('B', 1), 'C');
  assert.equal(transporAcorde('C', -1), 'B');
  assert.equal(transporAcorde('Am7', 12), 'Am7');
  assert.equal(transporAcorde('D/F#', -12), 'D/F#');
});

test('o que não começa por nota passa incólume', () => {
  assert.equal(transporAcorde('%', 2), '%');
  assert.equal(transporAcorde('[Intro]', 2), '[Intro]');
  assert.equal(transporAcorde('', 2), '');
});
