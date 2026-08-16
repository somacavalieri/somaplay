import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transporAcorde, transporLinha } from '../js/transpose.js';
import { parseCifraText } from '../js/chords.js';

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

test('mantém a coluna quando o acorde não muda de largura', () => {
  assert.equal(transporLinha('C       G       Am', 2), 'D       A       Bm');
});

test('com folga, o acorde que cresce não empurra os vizinhos', () => {
  //                       C vira C#: a folga de 7 espaços absorve o caractere a mais
  assert.equal(transporLinha('C       G', 1), 'C#      G#');
});

test('sem folga, empurra o mínimo e mantém um espaço de separação', () => {
  // 'C G' -> 'C# G#': não há como devolver a coluna original sem colar os dois
  assert.equal(transporLinha('C G', 1), 'C# G#');
});

test('quando encolhe, devolve o espaço e a coluna volta ao lugar', () => {
  assert.equal(transporLinha('C#      G#', -1), 'C       G');
});

test('o recuo inicial é preservado', () => {
  assert.equal(transporLinha('    Am      D7', 2), '    Bm      E7');
});

test('token que não é acorde fica onde está, sem ser tocado', () => {
  assert.equal(transporLinha('Am  %  D7', 2), 'Bm  %  E7');
  assert.equal(transporLinha('[Intro] Am  D7', 2), '[Intro] Bm  E7');
});

test('decoração colada no acorde sobrevive', () => {
  assert.equal(transporLinha('C*  (Dm  Gm7)', 2), 'D*  (Em  Am7)');
});

test('a linha transposta continua sendo linha de acordes para o parser', () => {
  const linha = transporLinha('C       G7      Am7  F#m7(b5)', 3);
  const parsed = parseCifraText(`${linha}\nletra qualquer aqui`);
  assert.equal(parsed[0].hasChords, true, `deixou de ser linha de acordes: "${linha}"`);
  assert.equal(parsed[0].lyric, 'letra qualquer aqui');
});

test('transposição de zero devolve a linha byte a byte', () => {
  const l = '  C7M    G/B   Am7(9)  ';
  assert.equal(transporLinha(l, 0), l);
});
