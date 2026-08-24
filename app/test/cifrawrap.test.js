import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wrapBlock, layoutChordRow, chordDiagWidth, chordName, parseCifraText } from '../js/chords.js';

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
  // O contrato é este: `cabe` nunca é perguntado sobre um pedaço cortado no
  // MEIO de um acorde. Antes isto era medido pela contagem de chamadas (<= 2),
  // proxy que caducou quando a busca pela respiração passou a varrer uma janela
  // de cortes — todos válidos, e por isso muitos. A contagem virou sinal
  // secundário; o contrato agora é verificado direto.
  const inteiros = new Set(CH.match(/\S+/g));
  const vistos = [];
  wrapBlock(CH, LY, 40, (t) => { vistos.push(t); return true; });
  assert.ok(vistos.length > 0, 'o predicado tem de ser consultado');
  for (const pedaco of vistos) {
    for (const tok of (pedaco.match(/\S+/g) || [])) {
      assert.ok(inteiros.has(tok),
        `pedaço cortado no meio de um acorde: ${JSON.stringify(tok)} não é token do original`);
    }
  }
  // Com `serve` antes dos `ok`, o predicado passaria a ser chamado a cada
  // caractere da varredura — ordem de grandeza da largura da linha.
  assert.ok(vistos.length < CH.length / 2,
    `${vistos.length} chamadas; a ordem dos operandos inverteu?`);
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
  const larg = (tok, isChord) => (isChord ? chordDiagWidth(chordName(tok), true, null) : tok.length * 8);
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


// ---- quebra na respiração da frase (spec 2026-08-16) ----
//
// O gráfico impresso codifica a frase como VÃO LARGO: onde a música respira, o
// livro deixa vários espaços. O corte guloso não enxergava isso — parava no
// primeiro espaço válido, e um espaço simples entre duas palavras valia tanto
// quanto um vão de nove. Medido no acervo do Caetano vol. 1, 54 das 72 quebras
// caíam em vão de 1–2 espaços, ou seja no meio da frase.

// Largura do vão de espaços que contém a posição `i`.
function vao(s, i) {
  let a = i, b = i;
  while (a > 0 && s[a - 1] === ' ') a--;
  while (b < s.length && s[b] === ' ') b++;
  return b - a;
}

// Sistema 3 de "Meu bem, meu mal" (livro 93), o caso que motivou a mudança.
const MB_CH = 'B7(b9)     E7(9)                A7(9)    A/G    F#m7(b5)             B7(b9)       Em(7M/9)     Em7(9)         Gm6';
const MB_LY = 'mãe   Meu   medo     e meu  champanhe           Visão         do espaço      sideral                          Onde o que  eu sou se';

test('a quebra cai no vão largo, não no espaço simples do meio da frase', () => {
  const r = wrapBlock(MB_CH, MB_LY, 72);
  assert.ok(r.length >= 2, 'o sistema não cabe em 72 colunas, tem de quebrar');
  // O corte guloso terminava a 1ª fileira em "do", partindo "do espaço".
  assert.ok(!/\bdo$/.test(r[0].lyric),
    `1ª fileira não pode terminar em "do" (parte "do espaço"): ${JSON.stringify(r[0].lyric)}`);
  // Deve terminar em "Visão", que é onde o livro deixa nove espaços.
  assert.match(r[0].lyric, /Visão$/);
});

test('nenhuma quebra cai em vão de um espaço quando existe vão largo por perto', () => {
  for (const cols of [60, 66, 72, 80, 90]) {
    const r = wrapBlock(MB_CH, MB_LY, cols);
    let pos = 0;
    for (let i = 0; i < r.length - 1; i++) {
      pos += r[i].lyric.length;
      // reencontra a coluna do corte no original é frágil; basta conferir que a
      // fileira não termina no meio de uma frase com vão de 1
      assert.ok(!/ \S{1,3}$/.test(r[i].lyric) || vao(MB_LY, pos) > 1,
        `cols=${cols}, fileira ${i} termina em palavra solta: ${JSON.stringify(r[i].lyric)}`);
    }
  }
});

test('preferir o vão não faz nenhuma fileira passar da largura', () => {
  for (let cols = 24; cols <= 120; cols += 4) {
    for (const p of wrapBlock(MB_CH, MB_LY, cols)) {
      assert.ok(Math.max(p.chords.length, p.lyric.length) <= cols,
        `cols=${cols}: ${Math.max(p.chords.length, p.lyric.length)}`);
    }
  }
});

test('preferir o vão não perde nem parte acorde nenhum', () => {
  for (let cols = 24; cols <= 120; cols += 4) {
    const antes = chordCols(MB_CH).map((x) => x[0]);
    const depois = wrapBlock(MB_CH, MB_LY, cols).flatMap((p) => chordCols(p.chords).map((x) => x[0]));
    assert.deepEqual(depois, antes, `cols=${cols}`);
  }
});

// Spec: docs/superpowers/specs/2026-08-23-linha-so-de-barra-design.md
// O defeito relatado: dois blocos soltos quebravam em pontos diferentes. Pareados,
// acorde e letra saem no mesmo pedaço e na mesma coluna.
test('barra pura e letra quebram juntas, no mesmo pedaço', () => {
  const p = parseCifraText('   /     /    /\nManso        O tempo corre');
  assert.equal(p.length, 1, 'o pré-requisito é sair num bloco só');
  const r = wrapBlock(p[0].chords, p[0].lyric, 14);
  assert.deepEqual(r, [
    { chords: '   /     /', lyric: 'Manso' },
    { chords: ' /', lyric: 'O tempo corre' },
  ]);
});
