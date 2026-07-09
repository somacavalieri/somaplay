import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalogShapes, catalogDefault } from '../js/chords-catalog.js';
import { chordSVG, isChordTok } from '../js/chords.js';

test('catalogDefault devolve forma conhecida', () => {
  assert.deepEqual(catalogDefault('G').frets, [3, 2, 0, 0, 0, 3]);
});

test('catalogDefault resolve os exóticos de As Pastorinhas', () => {
  assert.deepEqual(catalogDefault('G/D').frets, [-1, 5, 5, 4, 3, -1]);
  assert.deepEqual(catalogDefault('G7/B').frets, [-1, 2, 3, 0, 3, -1]);
  assert.deepEqual(catalogDefault('Gm6/Bb').frets, [-1, 1, 2, 0, 3, 0]);
  assert.deepEqual(catalogDefault('Cm').barre, { fret: 3, from: 1, to: 5 });
});

test('um nome pode ter várias variações', () => {
  assert.equal(catalogShapes('E7').length, 2);
  assert.ok(catalogShapes('E7').some((s) => s.label === 'com 3ª e 7ª'));
});

test('acorde desconhecido não tem padrão', () => {
  assert.equal(catalogDefault('Zx9'), null);
  assert.deepEqual(catalogShapes('Zx9'), []);
});

test('catálogo cobre todos os acordes de As Pastorinhas (caso-ouro)', () => {
  const nomes = ['C/E', 'Cm6/Eb', 'G/D', 'E7', 'A7', 'D7', 'Gm', 'G7/B', 'Cm', 'G', 'G/B', 'Gm6/Bb', 'Am7', 'G7', 'C'];
  for (const n of nomes) assert.ok(catalogDefault(n), `sem forma para ${n}`);
});

test('catálogo cobre os acordes de Oxum (Serena Assumpção)', () => {
  for (const n of ['F#m', 'Bm7', 'C#m', 'C#m7']) assert.ok(catalogDefault(n), `sem forma para ${n}`);
});

test('isChordTok reconhece notação do CifraClub (°, 5-, parênteses)', () => {
  for (const t of ['C#°', 'C#m5-', 'Am7(5-)', 'C7(9-)', 'D7(4)', 'F7M', 'Cm6', 'G/F']) {
    assert.ok(isChordTok(t), `não reconheceu ${t}`);
  }
});

test('catálogo cobre os acordes do lote (Queremos Saber, Disfarça e Chora, Me Dê Motivo)', () => {
  const nomes = ['Em7', 'Am7', 'Cm6', 'G', 'G/F', 'C/E', 'D7(4)', 'C', 'F7M', 'Bm7', 'C#°', 'C/D', 'Bb7M', 'G7M',
    'C#7', 'C7', 'Am/E', 'Cm/Eb', 'D7', 'Gm7', 'C7/E', 'Am7(5-)', 'Am7/E', 'G7',
    'Dm', 'A7', 'C7(4)', 'C7(9-)', 'Em7(5-)', 'C#m5-', 'Dm7/C', 'E7', 'D7/F#'];
  for (const n of nomes) assert.ok(catalogDefault(n), `sem forma para ${n}`);
});

test('chordSVG usa o padrão do catálogo quando a música não tem digitação', () => {
  const svg = chordSVG('G/D', false, null);
  assert.ok(svg.includes('<circle'));   // desenhou casas
  assert.ok(!svg.includes('>?<'));      // não é o placeholder
});

test('chordSVG desenha "?" para acorde desconhecido', () => {
  assert.ok(chordSVG('Zx9', false, null).includes('>?<'));
});

test('digitacoes da música têm prioridade sobre o catálogo', () => {
  const dict = { 'G': { frets: [3, 2, 0, 0, 3, 3] } };
  assert.ok(chordSVG('G', false, dict).includes('<circle'));
});
