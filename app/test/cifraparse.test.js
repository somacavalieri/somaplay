import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCifraText, extractChords, isChordTok, layoutChordRow, chordLineSegs, chordName, splitChordTok, isTabLine } from '../js/chords.js';

// Helper: só as linhas com acordes, na ordem
const chordLines = (t) => parseCifraText(t).filter((l) => l.hasChords).map((l) => l.chords);

// --- Rótulo de seção na mesma linha dos acordes (estilo CifraClub) ---------

test('[Intro] com acordes na mesma linha é linha de acordes', () => {
  const p = parseCifraText('[Intro] Em7  Am7  Em7  Am7  Cm6');
  assert.equal(p[0].hasChords, true);
  assert.equal(p[0].chords, '[Intro] Em7  Am7  Em7  Am7  Cm6');
});

test('[Intro] com acordes: o rótulo não entra na lista de acordes', () => {
  assert.deepEqual(extractChords(parseCifraText('[Intro] Em7  Am7  Cm6')), ['Em7', 'Am7', 'Cm6']);
});

test('rótulo de duas palavras no fim da linha ([Frase 1]) mantém o par acorde/letra', () => {
  const p = parseCifraText('     Fm7        Bb/D  [Frase 1]\nAlvorada lá no morro');
  assert.equal(p.length, 1);
  assert.equal(p[0].hasChords, true);
  assert.equal(p[0].lyric, 'Alvorada lá no morro');
});

test('rótulo entre parênteses ((Frase 2)) também é ignorado na classificação', () => {
  assert.equal(parseCifraText('  Gb°   Fm7 (Frase 2)')[0].hasChords, true);
});

test('linha com diminuto do CifraClub (A#º) continua sendo linha de acordes', () => {
  const p = parseCifraText('A  A7M    A     A7M  A#º\n       Me esquecer');
  assert.equal(p.length, 1);
  assert.equal(p[0].hasChords, true);
  assert.equal(p[0].lyric, '       Me esquecer');
});

test('rótulo com dois-pontos no início da linha ("Intro: Am  G  F")', () => {
  assert.equal(parseCifraText('Intro: Am  G  F  E7')[0].hasChords, true);
  assert.equal(parseCifraText('INTRO : E')[0].hasChords, true);
  assert.equal(parseCifraText('Tone: Am')[0].hasChords, true);
});

test('rótulo com dois-pontos preserva as colunas', () => {
  assert.equal(parseCifraText('Intro:  Am   G')[0].chords, 'Intro:  Am   G');
});

test('dois-pontos no meio da letra não transforma a linha em acordes', () => {
  assert.equal(parseCifraText('Ela disse: eu vou')[0].hasChords, false);
  assert.equal(parseCifraText('E ela: me ama')[0].hasChords, false);
});

test('linha só com [Seção] continua sendo seção, não linha de acordes', () => {
  const p = parseCifraText('[Intro]');
  assert.equal(p[0].isSection, true);
  assert.equal(p[0].hasChords, false);
});

test('letra com trecho entre parênteses não vira linha de acordes', () => {
  const p = parseCifraText('Ela (ela) me ama');
  assert.equal(p[0].hasChords, false);
  assert.equal(p[0].hasLyric, true);
});

// --- Trecho instrumental entre parênteses ---------------------------------

test('acordes entre parênteses soltos: "( G  F  G  F )" é linha de acordes', () => {
  const p = parseCifraText('( G  F  G  F )');
  assert.equal(p[0].hasChords, true);
  assert.deepEqual(extractChords(p), ['G', 'F']);
});

test('parênteses com acordes complexos: "( C4+(9)  C9  C2(9)  G5 )"', () => {
  assert.equal(parseCifraText('( C4+(9)  C9  C2(9)  G5 )')[0].hasChords, true);
});

// --- Alinhamento: a linha de acordes é preservada byte a byte --------------

test('linha de acordes preserva espaços originais (alinhamento com a letra)', () => {
  const linha = '     Fm7        Bb/D  [Frase 1]';
  assert.equal(chordLines(linha + '\nAlvorada lá no morro')[0], linha);
});

// --- isChordTok: notação CifraClub de extensão depois da barra ------------

test('isChordTok aceita extensão após a barra (/9, /13, /5-, /11, /4, /6)', () => {
  ['C7M/6', 'Bm5-/7', 'A7/13', 'F#m5-/7', 'D7/9-', 'Em7/9', 'E7/4', 'D7/9',
    'D#5-/6', 'E6/9', 'Em7/5-', 'Bm7/5-', 'G7M/5-', 'C#m7/5-', 'Bm7/11', 'D7/4(9)',
  ].forEach((t) => assert.equal(isChordTok(t), true, `${t} deveria ser acorde`));
});

test('isChordTok continua aceitando baixo depois da barra', () => {
  ['D/F#', 'Am/E', 'C/E', 'Cm6/Eb', 'E6/B', 'G7/B'].forEach((t) => assert.equal(isChordTok(t), true, t));
});

// --- diminuto escrito com "o" minúsculo (spec 2026-08-10) -----------------
// Quem digita a cifra num teclado comum escreve "Ebo" em vez de "Eb°". O token
// reprovado derrubava a linha inteira e levava junto os acordes vizinhos.

test('isChordTok aceita o diminuto escrito com "o" minúsculo', () => {
  // formas que existem de fato no acervo, por frequência
  ['Ebo', 'Fo', 'Co', 'F#o', 'Bo', 'Bbo', 'G#o', 'D#o', 'Go', 'C#o', 'A#o'].forEach(
    (t) => assert.equal(isChordTok(t), true, `${t} deveria ser acorde`));
});

test('isChordTok recusa palavra em que o "o" não é o fim da qualidade', () => {
  // "Com", "Bom", "Como" e "Dom" abrem com nota e têm letra depois do "o":
  // aceitar "o" em qualquer posição transformaria palavra comum em acorde.
  ['Com', 'Bom', 'Como', 'Dom', 'Coma', 'Bola'].forEach(
    (t) => assert.equal(isChordTok(t), false, `${t} não deveria ser acorde`));
});

test('chordName preserva o token cru do diminuto com "o"', () => {
  // o alinhamento acorde<->sílaba depende de cada caractere: nada de renotar
  assert.equal(chordName('Ebo'), 'Ebo');
});

test('linha de cifra com "Ebo" volta a ser linha de acordes, com os vizinhos', () => {
  const linhas = parseCifraText('C         Ebo       Dm         G\nVocê me pergunta pela paixão');
  const acordes = extractChords(linhas);
  assert.deepEqual(acordes, ['C', 'Ebo', 'Dm', 'G']);
});

test('token ambíguo sozinho não faz linha de acordes', () => {
  // "Amo", "Ao" e "Do" são palavras; sem um acorde inequívoco por perto a linha
  // continua sendo letra.
  ['Amo', 'Ao', 'Do Ao', 'Do'].forEach((l) => {
    assert.deepEqual(extractChords(parseCifraText(l)), [], `${l} não deveria ter acorde`);
  });
});

test('token ambíguo vale quando a linha tem um acorde inequívoco', () => {
  assert.deepEqual(extractChords(parseCifraText('Bo Em')), ['Bo', 'Em']);
  assert.deepEqual(extractChords(parseCifraText('C Fo Dm7')), ['C', 'Fo', 'Dm7']);
});

test('linha de letra com palavras que abrem com nota continua letra', () => {
  assert.deepEqual(extractChords(parseCifraText('Como amo você')), []);
});

test('isChordTok continua recusando palavra comum', () => {
  ['Alvorada', 'Ela', 'de', 'Frase', 'Cansei', 'Bb7M/oi'].forEach((t) => assert.equal(isChordTok(t), false, t));
});

test('linha com acorde de extensão pós-barra é linha de acordes', () => {
  const p = parseCifraText('Em7              F#m5-/7 B7    Bm5-/7                E9-\nletra aqui');
  assert.equal(p[0].hasChords, true);
  assert.equal(p[0].lyric, 'letra aqui');
});

// --- Ornamentos e sujeira que a fonte cola na linha -----------------------

test('chordName limpa o que a fonte cola no acorde sem ser acorde', () => {
  assert.equal(chordName('C*'), 'C');
  assert.equal(chordName('F#m7(b5)*'), 'F#m7(b5)');
  assert.equal(chordName('E.'), 'E');
  assert.equal(chordName('(Dm'), 'Dm');
  assert.equal(chordName('Gm7)'), 'Gm7');
  assert.equal(chordName('[A#m7'), 'A#m7');
  assert.equal(chordName('D#7]'), 'D#7');
});

test('chordName não mexe em acorde já válido (parêntese de extensão fica)', () => {
  ['Bm7(b5)', 'Am7(9)/G', 'C4+(9)', 'D7(4)', 'E7(13)'].forEach((t) => assert.equal(chordName(t), t));
});

test('chordName devolve o token cru quando não é acorde', () => {
  ['Alvorada', 'x2x243', '^^^^', 'E7(13)E7(b13)'].forEach((t) => assert.equal(chordName(t), t));
});

test('asterisco de nota de rodapé não derruba a linha', () => {
  assert.equal(parseCifraText('A7/13     F#m7(b5)*   B7(b9)')[0].hasChords, true);
  assert.equal(parseCifraText('Gm   F   C*   D   D(sus9)')[0].hasChords, true);
});

test('setas e ornamentos da fonte não derrubam a linha', () => {
  ['Am ^^^^^^ Gm7        C7', 'F7M     Bm7(5-) ^ E7', '-> B7          Em7(9)',
    'G !----> F#  !----->  Bm', 'B7(#5) - x2x243',
  ].forEach((l) => assert.equal(parseCifraText(l)[0].hasChords, true, l));
});

test('parêntese que nunca fecha não derruba a linha', () => {
  assert.equal(parseCifraText('( Am  G  Am  G  Am  Bm')[0].hasChords, true);
});

test('acorde sujo é tocável com o nome limpo, mas na tela sai como está', () => {
  const segs = chordLineSegs('Gm   F   C*   D');
  assert.equal(segs.map((s) => s.text).join(''), 'Gm   F   C*   D'); // alinhamento intacto
  const cs = segs.filter((s) => s.isChord);
  assert.deepEqual(cs.map((s) => s.text), ['Gm', 'F', 'C*', 'D']);
  assert.deepEqual(cs.map((s) => s.name), ['Gm', 'F', 'C', 'D']);
});

test('extractChords usa o nome limpo e não repete', () => {
  assert.deepEqual(extractChords(parseCifraText('C*  Gm7)  C  (Dm')), ['C', 'Gm7', 'Dm']);
});

test('layoutChordRow expõe o nome limpo junto do token cru', () => {
  const items = layoutChordRow('C*  ^^  Dm', 10, () => 30);
  assert.deepEqual(items.map((i) => [i.tok, i.name, i.isChord]),
    [['C*', 'C', true], ['^^', '^^', false], ['Dm', 'Dm', true]]);
});

test('linha sem nenhum acorde não é linha de acordes (só ornamento/marca)', () => {
  assert.equal(parseCifraText('^^^^^^')[0].hasChords, false);
  assert.equal(parseCifraText('-> ->')[0].hasChords, false);
});

// --- Fileira de miniaturas: rótulo não se parte ao meio -------------------

test('layoutChordRow: "[Frase 1]" é um token só (não quebra em "[Frase" + "1]")', () => {
  const items = layoutChordRow('  Fm7   Bb/D  [Frase 1]', 10, () => 40);
  assert.deepEqual(items.map((i) => i.tok), ['Fm7', 'Bb/D', '[Frase 1]']);
  assert.deepEqual(items.map((i) => i.isChord), [true, true, false]);
});

test('layoutChordRow: "[Intro] Em7 Am7" — rótulo primeiro, acordes tocáveis', () => {
  const items = layoutChordRow('[Intro] Em7  Am7', 10, () => 40);
  assert.deepEqual(items.map((i) => i.tok), ['[Intro]', 'Em7', 'Am7']);
  assert.deepEqual(items.map((i) => i.isChord), [false, true, true]);
});

// --- Não-regressão do comportamento já existente --------------------------

test('parêntese colado no acorde é extensão, não rótulo (Am7(9)/G segue acorde)', () => {
  ['Am7(9)/G', 'C6(9)/G', 'Db6(9)/Ab', 'Eb7(9)(11#)', 'A7(13b)', 'D7M(6)', 'Am6(5+)', 'F#m7(5b)',
  ].forEach((t) => assert.equal(isChordTok(t), true, `${t} deveria ser acorde`));
});

test('linha com extensão entre parênteses seguida de baixo continua linha de acordes', () => {
  assert.equal(parseCifraText('   Em7               Am7(9)   Am7(9)/G')[0].hasChords, true);
  assert.equal(parseCifraText('Am6(5+)         Db6(9)/Ab    D6(9)/A     D7M(6)')[0].hasChords, true);
});

test('marcas comuns seguem aceitas na linha de acordes', () => {
  assert.equal(parseCifraText('C N.C. x2 Bm7 | % (2x)')[0].hasChords, true);
});

test('barra solta separando acordes é marca, não derruba a linha', () => {
  // Introdução do CifraClub em "É D'Oxum": os acordes vêm separados por "/".
  assert.equal(parseCifraText('Introdução: D / G / Em / A7 / D6/9 / % /')[0].hasChords, true);
  assert.equal(parseCifraText('D / G / Em / A7')[0].hasChords, true);
  // a barra colada continua sendo baixo/extensão do acorde, não separador
  assert.deepEqual(extractChords(parseCifraText('D / G / Em / A7 / D6/9 / % /')), ['D', 'G', 'Em', 'A7', 'D6/9']);
});

test('barra sozinha sem nenhum acorde não vira linha de acordes', () => {
  assert.equal(parseCifraText('/ / /')[0].hasChords, false);
});

// --- Dois acordes colados sem espaço (spec 2026-07-30, revisto em 2026-08-08) ---

test('splitChordTok parte a colagem e recusa o que não é colagem', () => {
  assert.deepEqual(splitChordTok('E7(13)E7(b13)'), ['E7(13)', 'E7(b13)']);
  assert.deepEqual(splitChordTok('Am7G'), ['Am7', 'G']);
  // acorde inteiro nunca é partido, por mais que caiba mais de um pedaço dentro
  assert.equal(splitChordTok('Am7(9)/G'), null);
  assert.equal(splitChordTok('Bm7(b5)'), null);
  assert.equal(splitChordTok('D6/9'), null);
  // guarda do caractere não-palavra: letra em maiúsculas feita só de notas A–G
  assert.equal(splitChordTok('CADE'), null);
  assert.equal(splitChordTok('FACE'), null);
  assert.equal(splitChordTok('AmD'), null);
  // sobra que não é acorde derruba a partição inteira
  assert.equal(splitChordTok('E7(13)xyz'), null);
});

test('acordes colados não derrubam mais a linha (Andança)', () => {
  const linha = 'Bb7M        Bm7(b5) E7(13)E7(b13)';
  assert.equal(parseCifraText(linha)[0].hasChords, true);
  assert.equal(parseCifraText(linha)[0].chords, linha);
});

test('linha só de letra em maiúsculas com notas A–G continua sendo letra', () => {
  assert.equal(parseCifraText('CADE FACE')[0].hasChords, false);
});

test('os dois acordes colados entram na grade separados', () => {
  assert.deepEqual(
    extractChords(parseCifraText('Bb7M        Bm7(b5) E7(13)E7(b13)')),
    ['Bb7M', 'Bm7(b5)', 'E7(13)', 'E7(b13)'],
  );
});

test('chordLineSegs dá um botão por acorde colado sem mexer no texto', () => {
  const linha = 'Bb7M   Bm7(b5) E7(13)E7(b13)';
  const segs = chordLineSegs(linha);
  // alinhamento: concatenar os text reproduz a linha byte a byte
  assert.equal(segs.map((s) => s.text).join(''), linha);
  assert.deepEqual(segs.filter((s) => s.isChord).map((s) => s.name),
    ['Bb7M', 'Bm7(b5)', 'E7(13)', 'E7(b13)']);
  const colados = segs.filter((s) => s.name.startsWith('E7'));
  assert.deepEqual(colados.map((s) => s.text), ['E7(13)', 'E7(b13)']);
});

test('layoutChordRow põe cada acorde colado na coluna do seu 1º caractere', () => {
  // chPx = 10, miniatura de 40px e gap 0 → sem colisão, x é a coluna pura
  const items = layoutChordRow('E7(13)E7(b13)', 10, () => 40, 0);
  assert.deepEqual(items.map((i) => [i.tok, i.isChord, i.x]),
    [['E7(13)', true, 0], ['E7(b13)', true, 60]]);
});

test('linha de acordes sem letra embaixo fica sozinha', () => {
  const p = parseCifraText('C  G\n\nAm');
  assert.equal(p[0].chords, 'C  G');
  assert.equal(p[0].hasLyric, false);
});

test('par acorde/letra clássico continua pareado', () => {
  const p = parseCifraText('C       G\nQuando eu vi');
  assert.equal(p.length, 1);
  assert.deepEqual([p[0].chords, p[0].lyric], ['C       G', 'Quando eu vi']);
});

test('linha de tablatura é reconhecida', () => {
  assert.equal(isTabLine('E|-0---0----------0-----------------------------------|'), true);
  assert.equal(isTabLine('A|-0--------------------------------------------------|'), true);
  assert.equal(isTabLine('E|----------------------------------------------------|'), true);
  // tab curta: corridas de dois traços, sem nenhum "---"
  assert.equal(isTabLine('E|--0--2--3--|'), true);
  // sem nome de corda, e com dois-pontos no lugar da barra
  assert.equal(isTabLine('|---3---5---|'), true);
  assert.equal(isTabLine('e:---3---5---|'), true);
  // símbolos de técnica: hammer, pull, bend, slide
  assert.equal(isTabLine('G|--5h7p5--7b9--5/7--|'), true);
  // espaço à esquerda não atrapalha
  assert.equal(isTabLine('  D|-2-----2-----2-----2--------------------------------|'), true);
});

test('o que não é tablatura continua não sendo', () => {
  // linha de acordes com traço separando — maiúscula fora do nome da corda derruba
  assert.equal(isTabLine('C ---- G'), false);
  assert.equal(isTabLine('Am7  ----  D7'), false);
  // ornamento e marca, que já são tratados por MARK
  assert.equal(isTabLine('!---->'), false);
  assert.equal(isTabLine('^^^^^^'), false);
  assert.equal(isTabLine('%'), false);
  // digitação inline: alfabeto bate, mas não tem traço nenhum
  assert.equal(isTabLine('0221xx'), false);
  // letra com travessão
  assert.equal(isTabLine('Ela disse — vou embora'), false);
  assert.equal(isTabLine('Ela disse: eu vou'), false);
  // linha de acordes e vazio
  assert.equal(isTabLine('   A'), false);
  assert.equal(isTabLine(''), false);
  assert.equal(isTabLine('   '), false);
});

test('linhas de tab consecutivas viram um bloco só', () => {
  const p = parseCifraText([
    'E|-0---0---|',
    'B|-2---2---|',
    'G|-2---2---|',
  ].join('\n'));
  assert.equal(p.length, 1);
  assert.equal(p[0].isTab, true);
  assert.deepEqual(p[0].tab, ['E|-0---0---|', 'B|-2---2---|', 'G|-2---2---|']);
  assert.equal(p[0].hasLyric, false);
});

test('linha em branco encerra o bloco de tab', () => {
  const p = parseCifraText('E|-0---0---|\n\nB|-2---2---|');
  assert.equal(p.length, 3);
  assert.deepEqual(p[0].tab, ['E|-0---0---|']);
  assert.equal(p[1].isTab, false);
  assert.deepEqual(p[2].tab, ['B|-2---2---|']);
});

test('a linha de acordes logo acima entra no bloco de tab', () => {
  const p = parseCifraText('   A\nE|-0---0---|\nB|-2---2---|');
  assert.equal(p.length, 1);
  assert.equal(p[0].isTab, true);
  assert.equal(p[0].hasChords, true);
  assert.equal(p[0].chords, '   A');          // coluna preservada byte a byte
  assert.equal(p[0].hasLyric, false);          // não vira par acorde/letra
  assert.deepEqual(p[0].tab, ['E|-0---0---|', 'B|-2---2---|']);
});

test('acorde acima da tab continua entrando na grade da música', () => {
  assert.deepEqual(extractChords(parseCifraText('   A   C#m7\nE|-0---0---|')), ['A', 'C#m7']);
});

test('tab não atrapalha o par acorde/letra normal', () => {
  const p = parseCifraText('[Tab]\nE|-0---0---|\n\n     C      G\nEla me disse assim');
  assert.equal(p[0].isSection, true);
  assert.equal(p[1].isTab, true);
  assert.equal(p[3].hasChords, true);
  assert.equal(p[3].chords, '     C      G');
  assert.equal(p[3].lyric, 'Ela me disse assim');
  assert.equal(p[3].isTab, false);
});

test('linha que não é tab segue com tab vazio', () => {
  const p = parseCifraText('Ela me disse assim');
  assert.equal(p[0].isTab, false);
  assert.deepEqual(p[0].tab, []);
});
