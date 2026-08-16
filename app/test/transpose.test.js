import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transporAcorde, transporLinha, leTom, tomDeSemitons, gradeDeTons, semitonsEntre, deduzTom, tituloNoTom } from '../js/transpose.js';
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

test('lê fundamental e modo do campo tom', () => {
  assert.deepEqual(leTom('Am'), { raiz: 'A', menor: true });
  assert.deepEqual(leTom('C'), { raiz: 'C', menor: false });
  assert.deepEqual(leTom('C#m'), { raiz: 'C#', menor: true });
  assert.deepEqual(leTom('  Bb  '), { raiz: 'Bb', menor: false });
  assert.deepEqual(leTom('C7M'), { raiz: 'C', menor: false });
});

test('maj não é modo menor', () => {
  assert.deepEqual(leTom('Cmaj7'), { raiz: 'C', menor: false });
});

test('campo livre que não é acorde não é tom', () => {
  assert.equal(leTom('E com capuz na 2ª'), null);
  assert.equal(leTom(''), null);
  assert.equal(leTom(null), null);
  assert.equal(leTom(undefined), null);
});

test('o tom resultante preserva o modo', () => {
  assert.equal(tomDeSemitons('C#m', 2), 'Ebm');
  assert.equal(tomDeSemitons('C', 2), 'D');
  assert.equal(tomDeSemitons('Am', -2), 'Gm');
  assert.equal(tomDeSemitons('E com capuz na 2ª', 2), null);
});

test('a grade tem doze tons em ordem alfabética, no modo do tom', () => {
  assert.deepEqual(gradeDeTons('C#m'),
    ['Am', 'Bbm', 'Bm', 'Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m']);
  assert.deepEqual(gradeDeTons('C'),
    ['A', 'Bb', 'B', 'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#']);
  assert.deepEqual(gradeDeTons(''), []);
});

test('a distância entre dois tons é o deslocamento a aplicar', () => {
  assert.equal(semitonsEntre('C', 'D'), 2);
  assert.equal(semitonsEntre('C#m', 'Ebm'), 2);
  assert.equal(semitonsEntre('C', 'B'), 11);
  assert.equal(semitonsEntre('C', 'C'), 0);
  assert.equal(semitonsEntre('', 'C'), null);
});

test('o palpite vem do último acorde da cifra', () => {
  const parsed = parseCifraText('C       G7\nprimeira linha\n\nAm7     Em\núltima linha');
  assert.equal(deduzTom(parsed), 'Em');
});

test('o palpite reduz o acorde a fundamental mais modo', () => {
  assert.equal(deduzTom(parseCifraText('G7\nfim')), 'G');
  assert.equal(deduzTom(parseCifraText('F#m7(b5)\nfim')), 'F#m');
});

test('cifra sem acorde nenhum não tem palpite', () => {
  assert.equal(deduzTom(parseCifraText('só letra aqui\ne mais letra')), null);
  assert.equal(deduzTom([]), null);
});

test('o título ganha o tom entre parênteses', () => {
  assert.equal(tituloNoTom('Wave', 'Bb'), 'Wave (Bb)');
});

test('o tom no título substitui em vez de acumular', () => {
  assert.equal(tituloNoTom('Wave (Bb)', 'C'), 'Wave (C)');
  assert.equal(tituloNoTom('Wave (C#m)', 'Em'), 'Wave (Em)');
});

test('parêntese que não é tom é preservado', () => {
  assert.equal(tituloNoTom('Wave (ao vivo)', 'Bb'), 'Wave (ao vivo) (Bb)');
});
