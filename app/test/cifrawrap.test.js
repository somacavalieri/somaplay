import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wrapBlock, layoutChordRow, chordDiagWidth } from '../js/chords.js';

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

// --- wrap ciente de diagrama (spec 2026-08-11) ----------------------------
// O 4º argumento é um predicado: "este trecho, montado como fileira de
// diagramas, cabe na caixa?". chords.js não sabe o que é diagrama — quem sabe
// medir é play.js. Aqui o predicado é de mentira, e é isso que torna o teste
// possível sem DOM.

const ate = (max) => (trecho) => trecho.length <= max;

test('sem o predicado, a saída é a de sempre', () => {
  for (const cols of [8, 16, 24, 32, 40, 56, 80]) {
    assert.deepEqual(wrapBlock(CH, LY, cols, undefined), wrapBlock(CH, LY, cols));
  }
});

test('predicado que aceita tudo é o mesmo que não passar nada', () => {
  for (const cols of [16, 40]) {
    assert.deepEqual(wrapBlock(CH, LY, cols, () => true), wrapBlock(CH, LY, cols));
  }
});

test('predicado mais apertado que as colunas corta mais cedo', () => {
  const sem = wrapBlock(CH, LY, 60);
  const com = wrapBlock(CH, LY, 60, ate(20));
  assert.ok(com.length > sem.length, `${com.length} pedaços não é mais que ${sem.length}`);
});

test('linha que cabe em colunas mas o predicado rejeita é quebrada mesmo assim', () => {
  // É o caso da MAIORIA das fileiras que vazam hoje: cabem em 60 colunas e não
  // cabem em pixel. Sem este teste o bug volta pelo atalho do início.
  const r = wrapBlock('C   G   Am  F', 'dó  sol lá  fá', 60, ate(8));
  assert.ok(r.length > 1, 'o atalho do início escapou do predicado');
});

test('o predicado recebe o pedaço aparado, não a fatia crua', () => {
  const vistos = [];
  // cols=8 força a passagem pelo loop (e não pelo atalho), onde peca() tira o recuo.
  // A linha '    C   G' tem 9 caracteres, então com 8 colunas precisa quebrar.
  wrapBlock('    C   G', '    dó  sol', 8, (t) => { vistos.push(t); return true; });
  assert.ok(vistos.length > 0, 'o predicado nem foi chamado');
  for (const t of vistos) assert.ok(!/^ /.test(t), `veio com recuo: ${JSON.stringify(t)}`);
});

test('com o predicado, nenhum acorde e nenhuma palavra são partidos', () => {
  const r = wrapBlock(CH, LY, 60, ate(24));
  const inteiros = r.flatMap((p) => chordCols(p.chords).map((x) => x[0]));
  for (const [tok] of chordCols(CH)) assert.ok(inteiros.includes(tok), `partiu ${tok}`);
  const palavras = r.flatMap((p) => p.lyric.split(/\s+/).filter(Boolean));
  for (const w of LY.split(/\s+/).filter(Boolean)) assert.ok(palavras.includes(w), `partiu ${w}`);
});

test('predicado que rejeita tudo não trava', () => {
  // Rejeitando tudo, a saída de emergência corta na largura crua — e aí NÃO há
  // promessa de token inteiro, porque o corte não olha mais o espaço. O que se
  // garante é que termina, devolve pedaço e não devolve pedaço vazio. Afirmar
  // "nenhum acorde partido" aqui passaria por sorte da fixture, não por regra.
  const r = wrapBlock(CH, LY, 40, () => false);
  assert.ok(r.length > 1);
  for (const p of r) assert.ok(p.chords || p.lyric);
});

test('o predicado só é consultado em corte válido', () => {
  let chamadas = 0;
  wrapBlock(CH, LY, 40, () => { chamadas++; return true; });
  // Ordem certa: 2 chamadas. Com `serve` antes dos `ok`, viram 6. O limite
  // frouxo de antes (< CH.length) deixava as duas passarem.
  assert.ok(chamadas <= 2, `${chamadas} chamadas; a ordem dos operandos inverteu?`);
});

test('o atalho testa exatamente o pedaço que devolve', () => {
  // Recuo comum às duas linhas: 17% das linhas do songbook têm. Se o atalho
  // testar o pedaço sem recuo e devolver o pedaço com, aprova uma fileira mais
  // estreita do que a desenhada — e ela vaza.
  const vistos = [];
  const r = wrapBlock('   Am   G', '  quando chove', 20, (t) => { vistos.push(t); return true; });
  assert.equal(vistos.length, 1);
  assert.equal(vistos[0], r[0].chords);
});

test('composição real: linha densa não deixa fileira acima da caixa', () => {
  // Sem predicado de mentira: as larguras vêm de chordDiagWidth, que é o que o
  // app usa de verdade. 300px é a caixa de um celular estreito.
  const CAIXA = 300;
  const larg = (tok, isChord) => (isChord ? chordDiagWidth(tok, true, null) : tok.length * 8);
  const cabe = (trecho) => {
    const it = layoutChordRow(trecho, 12, larg);
    if (!it.length) return true;
    const u = it[it.length - 1];
    return u.x + larg(u.tok, u.isChord) <= CAIXA;
  };
  const r = wrapBlock(CH, LY, 60, cabe);
  assert.ok(r.length > 1, 'não quebrou nada');
  for (const p of r) if (p.chords) assert.ok(cabe(p.chords), `fileira acima da caixa: ${p.chords}`);
});

