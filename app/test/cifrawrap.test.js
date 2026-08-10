import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wrapBlock } from '../js/chords.js';

// Coluna em que cada acorde começa numa linha de acordes.
function chordCols(line) {
  const out = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(line))) out.push([m[0], m.index]);
  return out;
}

const CH = 'A     E/G#    F#m   F#m/E   D7M            E7(4/9)   A            E7(4/9)';
const LY = '  Banda  Um,  Banda Um,  Banda  Um, Banda       ô, iê    iê iê iê iê';

test('linha que já cabe volta inteira, num pedaço só', () => {
  const r = wrapBlock('C   G', 'dó  sol', 40);
  assert.equal(r.length, 1);
  assert.equal(r[0].chords, 'C   G');
  assert.equal(r[0].lyric, 'dó  sol');
});

test('cols inválido não refluí nada', () => {
  for (const cols of [0, -5, 1, undefined, NaN]) {
    const r = wrapBlock(CH, LY, cols);
    assert.equal(r.length, 1, `cols=${cols}`);
  }
});

test('nenhum pedaço passa da largura pedida', () => {
  for (const cols of [20, 32, 40, 56]) {
    for (const p of wrapBlock(CH, LY, cols)) {
      assert.ok(p.chords.length <= cols, `acorde ${p.chords.length} > ${cols}`);
      assert.ok(p.lyric.length <= cols, `letra ${p.lyric.length} > ${cols}`);
    }
  }
});

test('acorde continua sobre a mesma sílaba depois da quebra', () => {
  // distância (em colunas) entre cada acorde e o começo da letra, antes e depois
  const antes = chordCols(CH).map(([tok, col]) => [tok, col]);
  const depois = [];
  let base = 0;
  for (const p of wrapBlock(CH, LY, 40)) {
    // recompõe a coluna absoluta somando o quanto já foi consumido
    for (const [tok, col] of chordCols(p.chords)) depois.push([tok, col + base]);
    base += Math.max(p.chords.length, p.lyric.length) + 1;
  }
  assert.equal(depois.length, antes.length, 'sumiu acorde na quebra');
  assert.deepEqual(depois.map((x) => x[0]), antes.map((x) => x[0]));
});

test('cada acorde do original sobrevive inteiro em algum pedaço', () => {
  const inteiros = wrapBlock(CH, LY, 24).flatMap((p) => chordCols(p.chords).map((x) => x[0]));
  for (const [tok] of chordCols(CH)) assert.ok(inteiros.includes(tok), `partiu ${tok}`);
});

test('não parte palavra da letra no meio', () => {
  const palavras = wrapBlock(CH, LY, 30).flatMap((p) => p.lyric.split(/\s+/).filter(Boolean));
  for (const w of LY.split(/\s+/).filter(Boolean)) assert.ok(palavras.includes(w), `partiu ${w}`);
});

test('token maior que a largura corta em vez de travar', () => {
  const r = wrapBlock('Aumentadíssimo7(9/13)', 'palavradesproporcionalmente', 8);
  assert.ok(r.length > 1);
  for (const p of r) {
    assert.ok(p.chords.length <= 8);
    assert.ok(p.lyric.length <= 8);
  }
});

test('o alinhamento dentro do pedaço é o mesmo do original', () => {
  // primeiro acorde e primeira sílaba mantêm a distância que tinham
  const [, col0] = chordCols(CH)[0];
  const lead0 = LY.length - LY.replace(/^ +/, '').length;
  const p = wrapBlock(CH, LY, 40)[0];
  const [, ncol0] = chordCols(p.chords)[0];
  const nlead0 = p.lyric.length - p.lyric.replace(/^ +/, '').length;
  assert.equal(ncol0 - nlead0, col0 - lead0);
});

test('bloco só com acorde ou só com letra não quebra o reflow', () => {
  const so = wrapBlock('Introdução: E6   B7   E6', '', 12);
  assert.ok(so.every((p) => p.lyric === ''));
  assert.ok(so.every((p) => p.chords.length <= 12));
  const sol = wrapBlock('', 'só a letra aqui', 8);
  assert.ok(sol.every((p) => p.chords === ''));
});

test('não devolve pedaço vazio', () => {
  for (const p of wrapBlock(CH, LY, 16)) assert.ok(p.chords || p.lyric);
});
