import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toIntl, toBr, display } from '../js/chord-notation.js';
import { CATALOG } from '../js/chords-catalog.js';

test('converte os sufixos maiores para notação internacional', () => {
  assert.equal(toIntl('C7M'), 'Cmaj7');
  assert.equal(toIntl('Am7(5-)'), 'Am7b5');
  assert.equal(toIntl('C#°'), 'C#dim');
  assert.equal(toIntl('C7(9-)'), 'C7b9');
  assert.equal(toIntl('D7(4)'), 'D7sus4');
  assert.equal(toIntl('E7(13)'), 'E713');
});

test('o diminuto com ordinal masculino do CifraClub também converte', () => {
  assert.equal(toIntl('A#º'), 'A#dim');
});

test('converte de volta para notação brasileira', () => {
  assert.equal(toBr('Cmaj7'), 'C7M');
  assert.equal(toBr('C#dim'), 'C#°');
  assert.equal(toBr('D7sus4'), 'D7(4)');
});

test('preserva a fundamental com sustenido e bemol', () => {
  assert.equal(toIntl('Bb7M'), 'Bbmaj7');
  assert.equal(toIntl('C#m7'), 'C#m7');
});

test('preserva o baixo invertido', () => {
  assert.equal(toIntl('G7M/B'), 'Gmaj7/B');
  assert.equal(toIntl('Cm6/Eb'), 'Cm6/Eb');
  assert.equal(toBr('Gmaj7/B'), 'G7M/B');
});

test('acorde sem sufixo conversível passa incólume', () => {
  assert.equal(toIntl('Am'), 'Am');
  assert.equal(toIntl('G'), 'G');
  assert.equal(toIntl('D7/F#'), 'D7/F#');
  assert.equal(toIntl('coisa estranha'), 'coisa estranha');
});

test('ida e volta preserva a forma canônica internacional', () => {
  for (const name of Object.keys(CATALOG)) {
    const intl = toIntl(name);
    assert.equal(toIntl(toBr(intl)), intl, `instável: ${name}`);
  }
});

test('converter um nome que já está na convenção de destino não o corrompe', () => {
  for (const name of Object.keys(CATALOG)) {
    assert.equal(toBr(toBr(name)), toBr(name), `toBr não é idempotente: ${name}`);
    assert.equal(toIntl(toIntl(name)), toIntl(name), `toIntl não é idempotente: ${name}`);
  }
});

test('número solto não é convertido no meio do nome', () => {
  // 'C7(9-)' já é brasileiro: o '9' interno não pode virar '(9)'
  assert.equal(toBr('C7(9-)'), 'C7(9-)');
  assert.equal(toBr('E7(13)'), 'E7(13)');
  // mas no fim do nome, aí sim
  assert.equal(toBr('E713'), 'E7(13)');
});

test('nenhum acorde do catálogo vira string vazia ou perde a fundamental', () => {
  for (const name of Object.keys(CATALOG)) {
    for (const out of [toIntl(name), toBr(name)]) {
      assert.match(out, /^[A-G]/, `${name} → ${out} perdeu a fundamental`);
    }
  }
});

test('display() escolhe a convenção pedida', () => {
  assert.equal(display('C7M', 'intl'), 'Cmaj7');
  assert.equal(display('C7M', 'br'), 'C7M');
  assert.equal(display('Cmaj7', 'br'), 'C7M');
});

test('cobre sufixos raros que o catálogo não exercita: (b13), (11), (9), (b9)', () => {
  // Nenhuma entrada do CATALOG usa estas grafias, então os loops sobre
  // Object.keys(CATALOG) não as cobrem — precisam de asserção direta.
  assert.equal(toIntl('E7(b13)'), 'E7b13');
  assert.equal(toBr('E7b13'), 'E7(b13)');

  assert.equal(toIntl('Am7(11)'), 'Am711');
  assert.equal(toBr('Am711'), 'Am7(11)');

  assert.equal(toIntl('E7(9)'), 'E79');
  assert.equal(toBr('E79'), 'E7(9)');

  assert.equal(toIntl('C7(b9)'), 'C7b9');
  assert.equal(toBr('C7b9'), 'C7(b9)');
});
