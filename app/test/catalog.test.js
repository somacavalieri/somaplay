import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG, catalogShapes, catalogDefault } from '../js/chords-catalog.js';
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

// O CifraClub escreve o diminuto com o ordinal masculino 'º' (U+00BA), não com o
// grau '°' (U+00B0) do catálogo. Sem os dois, uma linha com "A#º" deixa de ser
// linha de acordes e a cifra inteira desanda (Detalhes, Roberto Carlos).
test('isChordTok aceita o diminuto com ordinal masculino do CifraClub', () => {
  assert.ok(isChordTok('A#º'), 'não reconheceu A#º');
  assert.ok(isChordTok('Gºm6'), 'não reconheceu Gºm6');
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

// ---------- formas CAGED ----------
// Rede de segurança: uma forma é uma lista de casas, e um dígito trocado desenha
// um diagrama perfeitamente plausível que soa errado. Estes testes leem as notas.

const CAGED = ['C', 'A', 'G', 'E', 'D'];

// Semitons das cordas soltas, com C = 0: Mi Lá Ré Sol Si Mi.
const SOLTAS = [4, 9, 2, 7, 11, 4];
const PC = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

// Classes de altura que a forma produz, sem repetição e ordenadas. Corda
// abafada (-1) sai fora; corda solta (0) entra como a nota da própria corda.
function notasDaForma(forma) {
  const ns = forma.frets
    .map((f, i) => (f < 0 ? null : (SOLTAS[i] + f) % 12))
    .filter((n) => n !== null);
  return [...new Set(ns)].sort((a, b) => a - b);
}

// Tônica, terça maior e quinta justa.
function triadeMaior(nome) {
  const r = PC[nome];
  return [r, (r + 4) % 12, (r + 7) % 12].sort((a, b) => a - b);
}

test('notasDaForma lê o C aberto como dó–mi–sol', () => {
  assert.deepEqual(notasDaForma({ frets: [-1, 3, 2, 0, 1, 0] }), [0, 4, 7]);
});

test('notasDaForma denuncia um dígito trocado', () => {
  // C aberto com a corda Lá uma casa acima: entra dó# no lugar do dó.
  assert.deepEqual(notasDaForma({ frets: [-1, 4, 2, 0, 1, 0] }), [0, 1, 4, 7]);
});

test('toda forma de C, A, G, E e D soa a tríade maior certa', () => {
  for (const nome of CAGED) {
    for (const f of catalogShapes(nome)) {
      assert.deepEqual(
        notasDaForma(f), triadeMaior(nome),
        `${nome} / ${f.label || 'aberta'}: notas erradas em [${f.frets.join(', ')}]`
      );
    }
  }
});

test('C tem as cinco formas CAGED', () => {
  const l = catalogShapes('C');
  assert.equal(l.length, 5);
  assert.deepEqual(l.slice(1).map((s) => s.label), ['forma A', 'forma G', 'forma E', 'forma D']);
});

test('C: a forma aberta continua a padrão', () => {
  assert.deepEqual(catalogDefault('C').frets, [-1, 3, 2, 0, 1, 0]);
  assert.equal(catalogShapes('C').filter((s) => s.default).length, 1);
});

test('A tem as cinco formas CAGED', () => {
  const l = catalogShapes('A');
  assert.equal(l.length, 5);
  assert.deepEqual(l.slice(1).map((s) => s.label), ['forma G', 'forma E', 'forma D', 'forma C']);
});

test('A: a forma aberta continua a padrão', () => {
  assert.deepEqual(catalogDefault('A').frets, [-1, 0, 2, 2, 2, 0]);
  assert.equal(catalogShapes('A').filter((s) => s.default).length, 1);
});

test('G tem as cinco formas CAGED', () => {
  const l = catalogShapes('G');
  assert.equal(l.length, 5);
  assert.deepEqual(l.slice(1).map((s) => s.label), ['forma E', 'forma D', 'forma C', 'forma A']);
});

test('G: a forma aberta continua a padrão', () => {
  assert.deepEqual(catalogDefault('G').frets, [3, 2, 0, 0, 0, 3]);
  assert.equal(catalogShapes('G').filter((s) => s.default).length, 1);
});

test('E tem as cinco formas CAGED', () => {
  const l = catalogShapes('E');
  assert.equal(l.length, 5);
  assert.deepEqual(l.slice(1).map((s) => s.label), ['forma D', 'forma C', 'forma A', 'forma G']);
});

test('E: a forma aberta continua a padrão', () => {
  assert.deepEqual(catalogDefault('E').frets, [0, 2, 2, 1, 0, 0]);
  assert.equal(catalogShapes('E').filter((s) => s.default).length, 1);
});

test('D tem as cinco formas CAGED', () => {
  const l = catalogShapes('D');
  assert.equal(l.length, 5);
  assert.deepEqual(l.slice(1).map((s) => s.label), ['forma C', 'forma A', 'forma G', 'forma E']);
});

test('D: a forma aberta continua a padrão', () => {
  assert.deepEqual(catalogDefault('D').frets, [-1, -1, 0, 2, 3, 2]);
  assert.equal(catalogShapes('D').filter((s) => s.default).length, 1);
});

test('nenhuma forma CAGED estoura a janela de 4 casas do diagrama', () => {
  for (const nome of CAGED) {
    for (const f of catalogShapes(nome)) {
      const pos = f.frets.filter((x) => x > 0);
      if (!pos.length) continue;
      const casas = Math.max(...pos) - Math.min(...pos) + 1;
      assert.ok(casas <= 4, `${nome} / ${f.label || 'aberta'}: ${casas} casas em [${f.frets.join(', ')}]`);
    }
  }
});

// --- diminutos (spec 2026-08-10-diminutos-no-catalogo) --------------------
// Lidos por pixel da tabela do usuário e conferidos pelas notas. O teste
// RECALCULA as notas em vez de repetir os frets: repetir os números duplicaria
// um eventual erro de digitação em vez de pegá-lo.
const SEMI = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6,
               G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const AFINACAO = [4, 9, 2, 7, 11, 4];   // Mi grave, Lá, Ré, Sol, Si, Mi agudo
// só as 12 grafias que o catálogo usa; bemol resolve por canonização, não por entrada
const RAIZES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

test('catálogo tem os 12 diminutos, e cada um soa o acorde certo', () => {
  for (const raiz of RAIZES) {
    const nome = `${raiz}°`;
    const f = catalogDefault(nome);
    assert.ok(f, `${nome} não está no catálogo`);
    // diminuto de sétima: fundamental, 3ª menor, 5ª diminuta e 7ª diminuta
    const alvo = new Set([0, 3, 6, 9].map((i) => (SEMI[raiz] + i) % 12));
    const soa = new Set(f.frets.map((x, i) => (x < 0 ? null : (AFINACAO[i] + x) % 12)).filter((n) => n !== null));
    assert.deepEqual([...soa].sort((a, b) => a - b), [...alvo].sort((a, b) => a - b),
      `${nome} soa notas erradas em [${f.frets.join(', ')}]`);
  }
});

test('o diminuto do catálogo tem a fundamental no baixo', () => {
  for (const raiz of RAIZES) {
    const f = catalogDefault(`${raiz}°`);
    const i = f.frets.findIndex((x) => x >= 0);
    assert.equal((AFINACAO[i] + f.frets[i]) % 12, SEMI[raiz], `${raiz}° não tem ${raiz} no baixo`);
  }
});

test('C#° preserva a forma antiga no índice 0 (catálogo é append-only)', () => {
  // o índice vira o id persistido `b:C#°:0`, gravado em lápides e digitações
  assert.deepEqual(catalogShapes('C#°')[0].frets, [-1, 4, 5, 3, 5, 3]);
});

// --- conferência permanente das formas elementares (spec 2026-08-11) -------
// Todo acorde do catálogo cuja gramática é simples o bastante para calcular as
// notas tem de soar exatamente o que o nome diz. É o que trava erro de digitação
// num lote gerado — e o que autoriza confiar em gerar em lote.
const INTERVALOS = {
  '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10],
  '7M': [0, 4, 7, 11], 'm7M': [0, 3, 7, 11], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9],
  '(4)': [0, 5, 7], '(9)': [0, 4, 7, 2], 'm(9)': [0, 3, 7, 2],
};
const RE_SIMPLES = /^([A-G][#b]?)(m?)(7M|7|6|\(4\)|\(9\)|)$/;

test('toda forma elementar do catálogo soa o acorde do seu nome', () => {
  let conferidas = 0;
  for (const nome of Object.keys(CATALOG)) {
    const m = RE_SIMPLES.exec(nome);
    if (!m) continue;
    const q = INTERVALOS[(m[2] || '') + (m[3] || '')];
    if (!q) continue;
    const raiz = SEMI[m[1]];
    const alvo = new Set(q.map((i) => (raiz + i) % 12));
    const quinta = (raiz + 7) % 12;
    for (const f of catalogShapes(nome)) {
      const soa = new Set(f.frets.map((x, i) => (x < 0 ? null : (AFINACAO[i] + x) % 12))
        .filter((n) => n !== null));
      // nota estranha nunca é aceitável
      for (const n of soa) assert.ok(alvo.has(n), `${nome} tem nota estranha em [${f.frets.join(', ')}]`);
      // a fundamental tem de estar lá
      assert.ok(soa.has(raiz), `${nome} sem a fundamental em [${f.frets.join(', ')}]`);
      // a única nota dispensável é a quinta — é praxe omiti-la num acorde de
      // sétima, e o "C7" do catálogo (x 3 2 3 1 0) faz exatamente isso
      for (const n of alvo) {
        if (soa.has(n) || n === quinta) continue;
        assert.fail(`${nome} não soa ${n} em [${f.frets.join(', ')}]`);
      }
      conferidas++;
    }
  }
  assert.ok(conferidas >= 90, `esperava conferir 90+ formas, conferi ${conferidas}`);
});

test('nenhuma forma elementar exige vão maior que 4 casas', () => {
  for (const nome of Object.keys(CATALOG)) {
    if (!RE_SIMPLES.test(nome)) continue;
    for (const f of catalogShapes(nome)) {
      const d = f.frets.filter((x) => x > 0);
      if (d.length < 2) continue;
      const vao = Math.max(...d) - Math.min(...d) + 1;
      assert.ok(vao <= 4, `${nome}: ${vao} casas em [${f.frets.join(', ')}]`);
    }
  }
});
