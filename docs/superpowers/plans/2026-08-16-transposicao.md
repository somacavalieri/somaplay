# Transposição de tom — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir subir e descer o tom da cifra em texto dentro da música, com um popover no formato do CifraClub, e guardar um tom escolhido duplicando a música.

**Architecture:** Um módulo puro novo (`js/transpose.js`) carrega todo o risco — deslocamento de acorde e reposição das colunas — e é o único pedaço testável sem navegador. A transposição é estado efêmero (`S.transpose`, em semitons), aplicada **depois** do `parsedCifra` (que continua cacheado por música) na hora do render. Nenhum campo novo entra no registro da música, e por isso o formato `.somaplay`, `partes.js` e o merge não são tocados. Guardar um tom é duplicar a música — cópia idêntica, com bytes de áudio próprios.

**Tech Stack:** ES modules puros, sem build e sem dependências. `node --test` para lógica pura, `node --check` para sintaxe, navegador para tudo que toca DOM.

**Spec:** `docs/superpowers/specs/2026-08-16-transposicao-design.md`

## Global Constraints

- **Sem dependências novas.** Nenhum `package.json`, nenhum import externo.
- **Todo módulo novo em `app/js/` entra no `SHELL` de `app/sw.js`**, no mesmo commit que o cria. `app/test/shell.test.js` reprova se faltar, e sem isso o app quebra offline.
- **Chave de tradução entra nas DUAS tabelas** (`app/js/i18n/pt.js` e `app/js/i18n/en.js`). `app/test/i18n.test.js` cobra a paridade.
- **Nunca traduzir valor de `data-*`.** A grade emite `data-id="Bb"`, que é dado, não rótulo.
- **String traduzida é produzida no render**, nunca em constante de módulo — constante congela no import e não acompanha a troca de idioma.
- **Comentário em arquivo novo é em inglês**; arquivo já comentado em português continua em português. `chords.js`, `chord-notation.js`, `state.js` e `render/play.js` são português. `js/partes.js` é inglês. `transpose.js` e `render/tompop.js` são novos e ficam **em português**, porque vivem colados em `chords.js` e `play.js` e são lidos junto com eles.
- **A versão sobe uma única vez, na última tarefa:** `0.13.0` → `0.14.0`, em `app/js/version.js` e na linha 2 de `app/sw.js` (`somaplay-0.14.0`). `app/test/version.test.js` cobra a sincronia — mexer num só quebra o teste.
- **A versão nova precisa de entrada no `CHANGELOG.md`**, no formato `## [0.14.0] - AAAA-MM-DD`. `version.test.js` também cobra isso: subir o número sem registrar o que mudou reprova a suíte.
- **Base:** branch `feat/transposicao`, a partir de `5c5ed30` (merge do PR #25). Baseline verificado: **470 testes, 0 falhas**.
- **Commits em inglês.**
- Todos os comandos rodam a partir de `app/`.

---

### Task 1: O deslocamento de um acorde

**Files:**
- Create: `app/js/transpose.js`
- Create: `app/test/transpose.test.js`
- Modify: `app/sw.js` (array `SHELL`)

**Interfaces:**
- Consumes: nada — o módulo nasce sem imports; a Task 2 traz os de `js/chords.js`.
- Produces: `transporAcorde(nome, semitons) → string` — deslocamento de fundamental e baixo, tudo o mais intacto. `transporNota(nota, semitons) → string|null` e a constante `INDICE` são internos e assim permanecem.

- [ ] **Step 1: Write the failing test**

Criar `app/test/transpose.test.js`:

```js
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
  // 12 e não 0: com a guarda de identidade, zero devolve o nome como está —
  // a oitava inteira mostra a canonização sem mudar a classe de altura.
  assert.equal(transporAcorde('Db', 12), 'C#');
  assert.equal(transporAcorde('A#m', 12), 'Bbm');
  assert.equal(transporAcorde('Gb7', 12), 'F#7');
});

test('deslocamento zero devolve o acorde como o usuário escreveu', () => {
  for (const n of ['Db', 'Ab', 'Gb', 'A#m', 'Dbm7', 'Cb', 'E#7', 'Am', 'C']) {
    assert.equal(transporAcorde(n, 0), n, `renotou '${n}' sem transpor nada`);
  }
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && node --test test/transpose.test.js`
Expected: FAIL — `Cannot find module '../js/transpose.js'`

- [ ] **Step 3: Write minimal implementation**

Criar `app/js/transpose.js`:

```js
// transpose.js — transposição da cifra em texto. Puro, sem estado e sem DOM.
//
// IMPORTANTE: este é o único lugar do app autorizado a reescrever a cifra do
// usuário, e é exceção deliberada à regra do CLAUDE.md. Ver o porquê — e por
// que a reposição por coluna é o que a torna segura — em
// docs/superpowers/specs/2026-08-16-transposicao-design.md

// Os doze nomes, sempre os mesmos. Não é armadura calculada por ciclo de
// quintas: é o array que a grade do CifraClub mostra (Am, Bbm, Bm, Cm, C#m, Dm,
// Ebm, Em, Fm, F#m, Gm, G#m) — bemol no Bb e no Eb, sustenido no C#, F# e G#.
// O preço é teórico e conhecido: uma música em F# escreve 'Bb' onde a teoria
// pede 'A#'. É o que o músico está acostumado a ler.
const NOTAS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];

// Na ENTRADA as duas grafias valem — a cifra escreve o que quiser, e o acervo
// tem as duas. Só a saída é canônica.
const INDICE = {
  C: 0, 'B#': 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4,
  F: 5, 'E#': 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9,
  'A#': 10, Bb: 10, B: 11, Cb: 11,
};

const RE_FUND = /^[A-G][#b]?/;

// A mesma regex que chord-notation.js usa para separar baixo de extensão. Na
// notação do CifraClub a barra tem os dois sentidos — 'D/F#' é baixo, 'Em7/5-'
// e 'A7/13' são extensão — e só o baixo se transpõe.
const NOTA = /^[A-G][#b]?$/;

// Desloca uma fundamental isolada. null quando não é nota.
function transporNota(nota, semitons) {
  const i = INDICE[nota];
  if (i === undefined) return null;
  return NOTAS[(((i + semitons) % 12) + 12) % 12];
}

// Desloca fundamental e baixo; qualidade, extensões e parênteses viajam
// intactos. Corta em TODAS as barras (há acorde com mais de uma) e desloca só
// os pedaços que são nota sozinha.
export function transporAcorde(nome, semitons) {
  // Deslocamento zero devolve o nome COMO ESTÁ. Sem isto, abrir a música já
  // renotava 'Db' para 'C#' — o app reescrevendo a grafia do usuário sem que
  // ninguém tivesse transposto nada. É a mesma guarda que transporLinha tem, e
  // a assimetria entre as duas era o bug.
  if (!semitons) return String(nome);
  const s = String(nome);
  const partes = s.split('/');
  const m = partes[0].match(RE_FUND);
  if (!m) return s;
  const raiz = transporNota(m[0], semitons);
  if (raiz === null) return s;
  partes[0] = raiz + partes[0].slice(m[0].length);
  for (let k = 1; k < partes.length; k++) {
    if (NOTA.test(partes[k])) partes[k] = transporNota(partes[k], semitons);
  }
  return partes.join('/');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && node --test test/transpose.test.js`
Expected: PASS, 7 testes.

- [ ] **Step 5: Adicionar o módulo ao SHELL**

Em `app/sw.js`, dentro do array `SHELL`, logo depois de `'./js/chord-notation.js',`:

```js
  './js/transpose.js',
```

- [ ] **Step 6: Rodar a suíte inteira**

Run: `cd app && node --test`
Expected: PASS — incluindo `shell.test.js`, que reprovaria se o módulo novo estivesse fora do `SHELL`.

- [ ] **Step 7: Commit**

```bash
git add app/js/transpose.js app/test/transpose.test.js app/sw.js
git commit -m "feat(transpose): shift a chord's root and bass"
```

---

### Task 2: A reposição por coluna

**Files:**
- Modify: `app/js/transpose.js`
- Modify: `app/test/transpose.test.js`

**Interfaces:**
- Consumes: `transporAcorde` (Task 1); `chordLineSegs` de `js/chords.js`
- Produces: `transporLinha(linha, semitons) → string` — a linha de acordes transposta com as colunas repostas. Consumida pelo render na Task 4.

- [ ] **Step 1: Write the failing test**

Trocar o import do topo de `app/test/transpose.test.js` por:

```js
import { transporAcorde, transporLinha } from '../js/transpose.js';
import { parseCifraText } from '../js/chords.js';
```

`isChordLine` não é exportada por `chords.js` — quem prova que a linha continua sendo linha de acordes é `parseCifraText`, que é a mesma pergunta pela porta da frente. E acrescentar os testes:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && node --test test/transpose.test.js`
Expected: FAIL — `transporLinha is not a function`

- [ ] **Step 3: Write minimal implementation**

Acrescentar a `app/js/transpose.js`, logo abaixo do comentário de cabeçalho:

```js
import { chordLineSegs } from './chords.js';
```

E, ao final do arquivo (o bloco de comentário faz parte do código — transcreva-o junto):

```js
// Transpõe uma linha de acordes REPONDO cada token na coluna original.
//
// O alinhamento da cifra é posicional: acorde e sílaba se encontram pela coluna
// do caractere, e 'C' tem 1 caractere enquanto 'C#' tem 2. Reescrever no lugar
// empurraria a linha inteira. Aqui cada token volta para a coluna de onde saiu,
// e só anda quando o vizinho anterior cresceu a ponto de encostar.
//
// A folga mínima é UM espaço: sem ela 'C' e 'G' em colunas vizinhas virariam
// 'C#G#' e deixariam de ser dois acordes — inclusive para o parser, que perderia
// a linha toda e com ela os acordes que estavam certos.
//
// Os segmentos de espaço são descartados de propósito: quem recria o espaçamento
// é o preenchimento até a coluna alvo. O acorde vem de `sg.name` (o nome limpo) e
// é costurado de volta em `sg.text`, que pode ter decoração — 'C*', '(Dm', 'Gm7)'.
export function transporLinha(linha, semitons) {
  const s = String(linha);
  if (!semitons) return s;
  let out = '';
  let col = 0;
  for (const sg of chordLineSegs(s)) {
    const larg = sg.text.length;
    if (!/\S/.test(sg.text)) { col += larg; continue; }
    const texto = sg.isChord
      ? sg.text.replace(sg.name, transporAcorde(sg.name, semitons))
      : sg.text;
    const alvo = out.length === 0 ? col : Math.max(col, out.length + 1);
    out += ' '.repeat(alvo - out.length) + texto;
    col += larg;
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && node --test test/transpose.test.js`
Expected: PASS.

Se o teste do recuo inicial falhar, o culpado é o ramo `out.length === 0`: com recuo, `col` já vale 4 quando o primeiro acorde chega, e o alvo tem de ser `col`, não `0`.

- [ ] **Step 5: Rodar a suíte inteira**

Run: `cd app && node --test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/js/transpose.js app/test/transpose.test.js
git commit -m "feat(transpose): re-place transposed chords in their original columns"
```

---

### Task 3: Tom, grade, palpite e título

**Files:**
- Modify: `app/js/transpose.js`
- Modify: `app/test/transpose.test.js`

**Interfaces:**
- Consumes: `transporAcorde`, `INDICE` (internos); `isChordTok`, `chordName` de `js/chords.js`
- Produces:
  - `leTom(tom) → {raiz, menor}|null`
  - `tomDeSemitons(tom, semitons) → string|null`
  - `gradeDeTons(tom) → string[]` (12 nomes, ordem alfabética, com o modo)
  - `semitonsEntre(tomOrigem, tomDestino) → number|null` (0–11)
  - `deduzTom(parsed) → string|null`
  - `tituloNoTom(title, tom) → string`

- [ ] **Step 1: Write the failing test**

Acrescentar a `app/test/transpose.test.js` (e ao import: `leTom, tomDeSemitons, gradeDeTons, semitonsEntre, deduzTom, tituloNoTom`):

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && node --test test/transpose.test.js`
Expected: FAIL — `leTom is not a function`

- [ ] **Step 3: Write minimal implementation**

Ajustar o import no topo de `app/js/transpose.js`:

```js
import { chordLineSegs, chordName, isChordTok } from './chords.js';
```

E acrescentar ao final:

```js
// Fundamental e modo de um tom. O 'm' do modo menor não pode ser o 'm' de
// 'maj7' — daí o lookahead negativo.
const RE_TOM = /^([A-G][#b]?)(m(?!aj))?/;

// O campo `tom` é texto livre (render/addedit.js:160). Só vale o que o parser já
// reconhece como acorde — 'Am', 'C', 'C#m', 'Am7'. Qualquer outra coisa ('E com
// capuz na 2ª', vazio) não é tom, e quem chama cai na regra do palpite.
export function leTom(tom) {
  const s = String(tom == null ? '' : tom).trim();
  if (!s || !isChordTok(s)) return null;
  const m = s.match(RE_TOM);
  return m ? { raiz: m[1], menor: !!m[2] } : null;
}

// Rótulo do tom depois de deslocar. Preserva o modo: C#m +2 = Ebm.
export function tomDeSemitons(tom, semitons) {
  const p = leTom(tom);
  if (!p) return null;
  return transporNota(p.raiz, semitons) + (p.menor ? 'm' : '');
}

// Ordem ALFABÉTICA, não cromática — é a ordem da grade na referência.
const ALFABETICA = ['A', 'Bb', 'B', 'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#'];

// Os doze tons da grade, no modo do tom original: 'C#m' mostra doze menores.
export function gradeDeTons(tom) {
  const p = leTom(tom);
  if (!p) return [];
  return ALFABETICA.map((n) => n + (p.menor ? 'm' : ''));
}

// Quantos semitons separam dois tons, em 0–11. É o que a grade precisa: tocar
// em 'Ebm' com o original em 'C#m' define S.transpose = 2.
export function semitonsEntre(tomOrigem, tomDestino) {
  const a = leTom(tomOrigem);
  const b = leTom(tomDestino);
  if (!a || !b) return null;
  return (((INDICE[b.raiz] - INDICE[a.raiz]) % 12) + 12) % 12;
}

// Palpite de tom pelo último acorde: cifra popular quase sempre termina no tom.
// Reduz a fundamental mais modo e descarta o resto — 'G7' vira 'G', 'F#m7(b5)'
// vira 'F#m'. É palpite de TOM, não catalogação de acorde.
//
// Erra na relativa menor: 'Em' e 'G' têm os mesmos acordes, e nada no texto
// separa os dois. Por isso quem exibe marca como chute — ver render/play.js.
export function deduzTom(parsed) {
  const linhas = parsed || [];
  for (let i = linhas.length - 1; i >= 0; i--) {
    if (!linhas[i].hasChords) continue;
    const toks = String(linhas[i].chords).trim().split(/\s+/).filter(Boolean);
    for (let k = toks.length - 1; k >= 0; k--) {
      const nome = chordName(toks[k]);
      if (!isChordTok(nome)) continue;
      const m = nome.match(RE_TOM);
      if (m && INDICE[m[1]] !== undefined) return m[1] + (m[2] ? 'm' : '');
    }
  }
  return null;
}

// Tom entre parênteses no fim do título. SUBSTITUI quando já há um: testar três
// tons em sequência produziria 'Wave (Bb) (C) (D)'. Só casa o que parece tom —
// 'Wave (ao vivo)' fica inteiro.
const RE_TOM_NO_TITULO = /\s*\([A-G][#b]?m?\)\s*$/;

export function tituloNoTom(title, tom) {
  return `${String(title).replace(RE_TOM_NO_TITULO, '')} (${tom})`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && node --test test/transpose.test.js`
Expected: PASS.

- [ ] **Step 5: Rodar a suíte inteira e checar sintaxe**

Run: `cd app && node --test && node --check js/transpose.js`
Expected: PASS, sem saída do `--check`.

- [ ] **Step 6: Commit**

```bash
git add app/js/transpose.js app/test/transpose.test.js
git commit -m "feat(transpose): key labels, the twelve-key grid, and the guessed key"
```

---

### Task 4: A cifra renderiza no tom escolhido

**Files:**
- Modify: `app/js/state.js` (bloco de estado da tela de toque, linha 62; e `openSong`, linha 541)
- Modify: `app/js/render/play.js` (`songHeaderHTML` 63-72; `cifraTextHTML` a partir de 247; `renderPlay` ~436)

**Interfaces:**
- Consumes: `transporLinha`, `tomDeSemitons`, `deduzTom` (Tasks 2 e 3)
- Produces: `S.transpose` (inteiro, semitons) e `tomAtual(song) → {label, palpite, base}` exportada de `render/play.js` — consumida pelo popover na Task 5.

Nesta tarefa ainda **não há controle na tela**. A verificação é pelo console do navegador. Isso é de propósito: a transposição aplicada ao render é a metade arriscada, e vale ter um portão de revisão só dela antes de encostar em UI.

- [ ] **Step 1: Acrescentar o estado**

Em `app/js/state.js`, no bloco da tela de toque (junto de `imgVariant`, ~linha 62):

```js
  transpose: 0,            // semitons; efêmero — zera ao trocar de música
```

E em `openSong` (~linha 546, junto de `S.currentSongId = songId;`):

```js
  S.transpose = 0;
```

- [ ] **Step 2: Aplicar a transposição no render da cifra**

Em `app/js/render/play.js`, acrescentar ao import de `../chords.js` nada — os novos vêm de outro módulo. Acrescentar depois dele:

```js
import { transporLinha, tomDeSemitons, deduzTom } from '../transpose.js';
```

Acrescentar, logo abaixo de `parsedCifra` (linha 61):

```js
// A transposição é aplicada DEPOIS do parse, e não invalidando o cache dele: a
// cifra é parseada uma vez por música e transposta a cada render. A linha de
// acordes do bloco de tab também anda — senão a cifra ficaria meio transposta,
// que é pior que qualquer das duas pontas. A tab em si não anda: casa é
// absoluta (ver o aviso em renderPlay).
function transposto(parsed, semitons) {
  if (!semitons) return parsed;
  return parsed.map((l) => (l.hasChords
    ? { ...l, chords: transporLinha(l.chords, semitons) }
    : l));
}

// O tom que a pílula mostra, e se ele é chute. `base` é o tom original — de
// onde a grade parte.
//
// Recebe a MÚSICA, não o parsed, de propósito: o palpite tem de ler a cifra
// crua. Deduzir do texto já deslocado e depois deslocar o rótulo transporia
// duas vezes, e o parâmetro extra seria só o convite para alguém passar o
// parsed errado — inclusive daqui a seis meses.
export function tomAtual(song) {
  const declarado = song.tom && String(song.tom).trim();
  const base = declarado || deduzTom(parsedCifra(song));
  const palpite = !declarado && !!base;
  if (!base) return { label: null, palpite: false, base: null };
  // Em zero, a pílula mostra o tom COMO FOI DECLARADO — 'Db' continua 'Db', e
  // 'Am7' continua 'Am7'. tomDeSemitons canoniza para fundamental + modo, o que
  // é certo para o tom RESULTANTE e errado para o tom que o usuário digitou.
  const label = S.transpose ? (tomDeSemitons(base, S.transpose) || base) : base;
  return { label, palpite, base };
}
```

- [ ] **Step 3: Consumir em `cifraTextHTML`**

Em `cifraTextHTML` (linha 248), trocar a primeira linha:

```js
  const parsed = transposto(parsedCifra(song), S.transpose);
```

Isso alimenta também o `fontQueCabe(...)` da linha seguinte, que passa a ajustar a fonte à cifra **já transposta** — correto, porque acorde transposto pode ser mais largo.

E a linha dos nomes de acorde (301) — a lista curada `song.cifra.acordes` também precisa acompanhar:

```js
  const chordNames = song.cifra?.acordes?.length
    ? song.cifra.acordes.map((n) => transporAcorde(n, S.transpose))
    : extractChords(parsed);
```

Acrescentar `transporAcorde` ao import de `../transpose.js`.

Em `renderPlay` (linha 436), a mesma correção para o cálculo que alimenta a barra de fixados:

```js
  const chordNames = song.cifra?.tipo === 'imagem'
    ? (song.cifra?.acordes || [])
    : (song.cifra?.acordes?.length
        ? song.cifra.acordes.map((n) => transporAcorde(n, S.transpose))
        : extractChords(transposto(parsedCifra(song), S.transpose)));
```

A cifra em imagem fica de fora, sem transposição — é o que o spec declara.

- [ ] **Step 4: A pílula mostra o tom resultante**

Substituir `songHeaderHTML` (linhas 63-72) por:

```js
// Cabeçalho de identidade da música (no topo do conteúdo, rola junto).
// A pílula do tom passa a existir SEMPRE na cifra em texto: hoje ela só aparecia
// com o campo preenchido, e uma feature cujo botão some na maior parte do acervo
// não é feature. Vira botão na Task 5.
// `S.transpose` é guardado em 0–11 (um domínio só; ver Task 5). Para LER, a
// forma assinada mais curta é a que o músico espera: 11 semitons acima é
// "−1", não "+11". Só a exibição converte; o estado continua em 0–11.
export const assinado = (n) => (n > 6 ? n - 12 : n);

function songHeaderHTML(song, tom) {
  const meta = [];
  if (tom && tom.label) {
    meta.push(`<span class="tag-tom">${t('play.song.key')} ${esc(tom.label)}${tom.palpite ? ' ?' : ''}</span>`);
  } else if (tom) {
    const d = assinado(S.transpose);
    meta.push(`<span class="tag-tom">${t('play.song.key')} ${d ? (d > 0 ? '+' : '') + d : '—'}</span>`);
  } else if (song.tom) {
    meta.push(`<span class="tag-tom">${t('play.song.key')} ${esc(song.tom)}</span>`);
  }
  if (song.fonte) meta.push(`<span class="src">${esc(song.fonte)}</span>`);
  return `<div class="song-id">
    <div class="ttl">${esc(song.title)}</div>
    <div class="art">${esc(artistName(song))}</div>
    ${meta.length ? `<div class="meta">${meta.join('<span class="mdot">·</span>')}</div>` : ''}
  </div>`;
}
```

O terceiro ramo (`song.tom` sem objeto `tom`) é o caminho da imagem e do karaokê, que chamam sem transposição e continuam exibindo o campo cru.

Atualizar as três chamadas:
- em `cifraTextHTML`: `${songHeaderHTML(song, tomAtual(song))}`
- em `cifraImageHTML`: `${songHeaderHTML(song)}` (sem mudança)
- em `karaokeHTML`: `${songHeaderHTML(song)}` (sem mudança)

- [ ] **Step 5: Verificar sintaxe e a suíte**

Run: `cd app && node --check js/render/play.js && node --check js/state.js && node --test`
Expected: sem saída do `--check`; suíte PASS.

- [ ] **Step 6: Verificar no navegador**

```bash
cd app && python3 -m http.server 8137
```

Abrir `http://localhost:8137`, entrar numa música com cifra em texto e, no console:

```js
// o app expõe o update pelo módulo; se não estiver global, recarregue a página
// depois de mudar o valor — o objetivo aqui é ver a cifra transposta.
```

Se `S` não estiver acessível no console, adicione temporariamente `window.S = S;` ao final de `js/state.js`, verifique, e **remova antes do commit**. Confirmar, com `S.transpose = 2` e um re-render (tocar em qualquer botão da tela):

- os acordes subiram dois semitons
- **cada acorde continua em cima da mesma sílaba** — este é o ponto da tarefa inteira
- a grade "Acordes desta música" mostra os nomes novos
- a pílula mostra o tom resultante
- numa música sem `tom`, a pílula mostra o palpite com ` ?`
- com `S.transpose = 0`, a cifra volta byte a byte ao que era

Testar também numa cifra com tablatura (a linha de acordes anda, a tab não) e numa cifra em imagem (nada muda).

- [ ] **Step 7: Commit**

```bash
git add app/js/state.js app/js/render/play.js
git commit -m "feat(transpose): render the chart in the chosen key"
```

---

### Task 5: O popover do tom

**Files:**
- Create: `app/js/render/tompop.js`
- Modify: `app/sw.js` (array `SHELL`)
- Modify: `app/js/render/play.js` (a pílula vira botão; montar o popover em `renderPlay`)
- Modify: `app/js/main.js` (ações e o clique-fora)
- Modify: `app/js/i18n/pt.js`, `app/js/i18n/en.js`
- Modify: `app/css/app.css`

**Interfaces:**
- Consumes: `tomAtual` (Task 4); `gradeDeTons`, `semitonsEntre` (Task 3); `popPosition` de `render/chordpop.js`
- Produces: `tomPopHTML(song, tom) → string`; ações `openTomPop`, `closeTomPop`, `transposeBy`, `setTom`, `resetTom`

- [ ] **Step 1: Chaves de tradução nas DUAS tabelas**

Em `app/js/i18n/pt.js`, junto de `'play.song.key'` (~linha 141):

```js
  'play.tom.open': 'Mudar o tom',
  'play.tom.down': '−½ tom',
  'play.tom.up': '+½ tom',
  'play.tom.reset': 'Restaurar',
  'play.tom.original': 'tom original',
  'play.tom.guess': 'tom deduzido da cifra — preencha o campo na edição para confirmar',
```

Em `app/js/i18n/en.js`, nas mesmas posições:

```js
  'play.tom.open': 'Change key',
  'play.tom.down': '−½ step',
  'play.tom.up': '+½ step',
  'play.tom.reset': 'Reset',
  'play.tom.original': 'original key',
  'play.tom.guess': 'key guessed from the chart — fill the field in edit to confirm',
```

- [ ] **Step 2: Criar o popover**

Criar `app/js/render/tompop.js`:

```js
// render/tompop.js — popover do tom, ancorado na pílula do cabeçalho. Formato da
// referência do CifraClub: dois passos de meio tom, grade de doze tons em ordem
// alfabética e restaurar.
// Spec: docs/superpowers/specs/2026-08-16-transposicao-design.md
import { S } from '../state.js';
import { I, esc } from '../icons.js';
import { gradeDeTons, semitonsEntre } from '../transpose.js';
import { popPosition } from './chordpop.js';
import { t } from '../i18n.js';

// Estimativas só para o 1º posicionamento do render em string; afterRenderPlay
// re-clampa com o tamanho real medido no DOM, como já faz com o chord-pop.
const W = 320, H = 260;

export function tomPopHTML(song, tom) {
  const tp = S.tomPop;
  if (!tp) return '';
  const vw = window.innerWidth, vh = window.innerHeight;
  const w = Math.min(W, vw - 16);
  const p = popPosition(tp.anchor, w, H, vw, vh);

  const grade = gradeDeTons(tom.base);
  const atual = tom.label;
  const gradeHTML = grade.length ? `<div class="tom-grid">${grade.map((n) => {
    // Comparar por SEMITOM, não por string: a grade só emite o alfabeto
    // canônico, e o campo `tom` guarda o que o usuário escreveu — 'Db' nunca
    // seria igual a 'C#' e a célula não acendia. Nove das vinte e uma grafias
    // aceitas caíam nisso. A fundamental basta: a grade é homogênea em modo.
    const on = atual !== null && semitonsEntre(atual, n) === 0;
    const orig = semitonsEntre(tom.base, n) === 0;
    return `<button class="tom-cell ${on ? 'on' : ''} ${orig && !on ? 'orig' : ''}"
      data-a="setTom" data-id="${esc(n)}"
      ${orig ? `title="${t('play.tom.original')}"` : ''}>${esc(n)}</button>`;
  }).join('')}</div>` : '';

  return `<div class="tom-pop" data-stop="1" style="left:${p.left}px;top:${p.top}px;width:${w}px">
    <div class="nm">${t('play.song.key')} <b>${esc(atual || '—')}</b>${tom.palpite ? ` <span class="guess" title="${t('play.tom.guess')}">?</span>` : ''}</div>
    <div class="tom-steps">
      <button class="btn-ghost sm" data-a="transposeBy" data-id="-1">${t('play.tom.down')}</button>
      <button class="btn-ghost sm" data-a="transposeBy" data-id="1">${t('play.tom.up')}</button>
    </div>
    ${gradeHTML}
    <button class="btn-ghost sm tom-reset" data-a="resetTom" ${S.transpose ? '' : 'disabled'}>${I.undo(16)}${t('play.tom.reset')}</button>
  </div>`;
}
```

- [ ] **Step 3: Registrar no SHELL**

Em `app/sw.js`, junto dos outros `./js/render/`:

```js
  './js/render/tompop.js',
```

- [ ] **Step 4: A pílula vira botão e o popover entra na tela**

Em `app/js/render/play.js`, importar:

```js
import { tomPopHTML } from './tompop.js';
```

Em `songHeaderHTML`, trocar os dois primeiros ramos do `<span class="tag-tom">` por `<button>`:

```js
  if (tom && tom.label) {
    meta.push(`<button class="tag-tom" data-a="openTomPop" title="${t('play.tom.open')}">${t('play.song.key')} ${esc(tom.label)}${tom.palpite ? ' ?' : ''}</button>`);
  } else if (tom) {
    const d = assinado(S.transpose);
    meta.push(`<button class="tag-tom" data-a="openTomPop" title="${t('play.tom.open')}">${t('play.song.key')} ${d ? (d > 0 ? '+' : '') + d : '—'}</button>`);
  } else if (song.tom) {
```

Em `renderPlay`, junto de `${S.chordPop ? chordPopHTML(song) : ''}`:

```js
    ${S.tomPop ? tomPopHTML(song, tomAtual(song)) : ''}
```

- [ ] **Step 5: Estado e ações**

Em `app/js/state.js`, junto de `chordPop`:

```js
  tomPop: null,            // popover do tom aberto: { anchor }
```

E em `openSong`, junto de `S.transpose = 0;`:

```js
  S.tomPop = null;
```

Em `app/js/main.js`, no objeto de ações, junto de `openChordPop` (~linha 403):

```js
  // ---- popover do tom (spec 2026-08-16) ----
  openTomPop(d, ev, el) {
    if (S.tomPop) { S.tomPop = null; update(); return; }
    const r = el.getBoundingClientRect();
    S.tomPop = { anchor: { x: r.left, y: r.top, w: r.width, h: r.height } };
    update();
  },
  closeTomPop() { S.tomPop = null; update(); },
  transposeBy(d) {
    S.transpose = (((S.transpose + Number(d.id)) % 12) + 12) % 12;
    update();
  },
  setTom(d) {
    const song = currentSong();
    if (!song) return;
    const n = semitonsEntre(tomAtual(song).base, d.id);
    if (n !== null) S.transpose = n;
    update();
  },
  resetTom() { S.transpose = 0; update(); },
```

`transposeBy` guarda o valor em 0–11 e não em −6…+5: os dois são o mesmo deslocamento módulo 12, e um só domínio evita `+11` e `−1` serem estados diferentes exibindo a mesma cifra.

Ao import de `./render/play.js` em `main.js`, acrescentar `tomAtual`; e criar o import de `./transpose.js` com `semitonsEntre`.

Por fim, o clique-fora, junto da linha 947 de `main.js`:

```js
  if (S.tomPop && !e.target.closest('.tom-pop') && !e.target.closest('.tag-tom')) { S.tomPop = null; update(); }
```

- [ ] **Step 6: CSS**

Em `app/css/app.css`, depois da regra `.tag-tom` (linha 297) — que ganha cursor e borda de botão:

```css
.tag-tom{display:inline-flex;align-items:center;gap:4px;padding:2px 9px;border-radius:999px;background:var(--accent-tint);color:var(--accent);font-size:12px;font-weight:600;border:none;cursor:pointer;font-family:inherit}
.tom-pop{position:fixed;z-index:60;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:12px;box-shadow:0 12px 32px rgba(0,0,0,.4);display:flex;flex-direction:column;gap:10px}
.tom-pop .nm{font-size:13px;color:var(--muted)}
.tom-pop .nm b{color:var(--accent);font-size:15px}
.tom-pop .guess{color:var(--muted3);cursor:help}
.tom-steps{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.tom-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:6px}
.tom-cell{height:38px;border-radius:9px;border:1px solid transparent;background:var(--surface2);color:var(--text);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit}
.tom-cell.on{background:var(--text);color:var(--bg)}
.tom-cell.orig{border-color:var(--muted2)}
.tom-reset{justify-content:center}
```

- [ ] **Step 7: Verificar sintaxe e suíte**

Run: `cd app && node --check js/render/tompop.js && node --check js/render/play.js && node --check js/main.js && node --test`
Expected: sem saída dos `--check`; suíte PASS — incluindo `shell.test.js` (módulo novo no SHELL) e `i18n.test.js` (paridade das tabelas).

- [ ] **Step 8: Verificar no navegador**

Com o servidor rodando, numa música com cifra em texto:

- tocar na pílula abre o popover ancorado nela
- `−½ tom` e `+½ tom` movem a cifra e o rótulo acompanha
- a grade mostra doze tons no modo certo (menor para música menor)
- o tom atual aparece preenchido; o original, contornado
- tocar num tom da grade salta direto para ele
- `Restaurar` volta ao original e fica desabilitado quando já se está nele
- tocar fora fecha; tocar na pílula de novo fecha
- rolar a cifra não deixa o popover órfão
- numa música sem `tom`, a pílula mostra ` ?` e a grade parte do palpite
- em cifra de imagem e no karaokê, a pílula continua não sendo botão
- trocar o idioma em Ajustes troca os rótulos do popover

- [ ] **Step 9: Commit**

```bash
git add app/js/render/tompop.js app/js/render/play.js app/js/main.js app/js/state.js app/js/i18n/pt.js app/js/i18n/en.js app/css/app.css app/sw.js
git commit -m "feat(transpose): the key popover, in the shape musicians already know"
```

---

### Task 6: O aviso do que não acompanha

**Files:**
- Modify: `app/js/render/play.js` (`renderPlay`)
- Modify: `app/js/i18n/pt.js`, `app/js/i18n/en.js`
- Modify: `app/css/app.css`

**Interfaces:**
- Consumes: `S.transpose`, `parsedCifra`
- Produces: nada consumido adiante.

- [ ] **Step 1: Chaves nas DUAS tabelas**

`pt.js`:

```js
  'play.tom.warnAudio': 'áudio no tom original',
  'play.tom.warnTab': 'tablatura no tom original',
```

`en.js`:

```js
  'play.tom.warnAudio': 'audio in the original key',
  'play.tom.warnTab': 'tablature in the original key',
```

- [ ] **Step 2: Montar o aviso**

Em `app/js/render/play.js`, dentro de `renderPlay`, depois de `const hasMixer = ...`:

```js
  // Um mecanismo, dois gatilhos: o que a transposição não consegue levar junto.
  // Áudio não muda de tom, e tab é casa absoluta. Só aparece quando há o que
  // avisar — fora do tom original e com a coisa presente na música.
  const avisos = [];
  if (S.transpose && !isImg && !isKar) {
    if (hasMixer) avisos.push(t('play.tom.warnAudio'));
    if (parsedCifra(song).some((l) => l.isTab)) avisos.push(t('play.tom.warnTab'));
  }
  const avisoHTML = avisos.length
    ? `<div class="tom-warn">${esc(avisos.join(' · '))}</div>` : '';
```

Sem ícone: `js/icons.js` não tem `info` nem `warn`, e o aviso é uma pílula discreta que não precisa de um.

Inserir `${avisoHTML}` na `.cifra-col`, logo antes de `${scrollCtl}`.

- [ ] **Step 3: CSS**

O `bottom` tem de limpar o controle de rolagem, que ocupa de 18px a **82px** do fundo
(`.scroll-ctl` em bottom:18px, com padding 7px, borda 1px e o botão `.pp` de 48px).
90px deixa 8px de folga.

```css
.tom-warn{position:absolute;bottom:90px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;background:var(--surface2);border:1px solid var(--border);color:var(--muted);font-size:11px;white-space:nowrap;pointer-events:none;z-index:5}
```

- [ ] **Step 4: Verificar sintaxe e suíte**

Run: `cd app && node --check js/render/play.js && node --test`
Expected: PASS.

- [ ] **Step 5: Verificar no navegador**

- música com stems, transposta: aparece "áudio no tom original"
- de volta ao tom original: some
- música com tablatura, transposta: aparece "tablatura no tom original"
- música com os dois: os dois, separados por `·`
- música sem áudio e sem tab: nada aparece nunca
- o aviso não cobre o controle de rolagem nem some atrás do mixer

- [ ] **Step 6: Commit**

```bash
git add app/js/render/play.js app/js/i18n/pt.js app/js/i18n/en.js app/css/app.css
git commit -m "feat(transpose): say plainly what the transposition left behind"
```

---

### Task 7: Duplicar a música no tom

**Files:**
- Modify: `app/js/state.js`
- Modify: `app/js/render/tompop.js`
- Modify: `app/js/main.js`
- Modify: `app/js/i18n/pt.js`, `app/js/i18n/en.js`

**Interfaces:**
- Consumes: `transporLinha`, `transporAcorde`, `tomDeSemitons`, `tituloNoTom` (Tasks 2 e 3); `blobIdsDasMusicas`, `saveSong`, `uid` de `state.js`/`db.js`
- Produces: `duplicarMusicaNoTom(song, semitons, tomBase) → Promise<string>` (id da música nova)

- [ ] **Step 1: Chaves nas DUAS tabelas**

`pt.js`:

```js
  'play.tom.duplicate': 'Duplicar neste tom',
  'play.tom.duplicated': 'Música duplicada em {tom}',
```

`en.js`:

```js
  'play.tom.duplicate': 'Duplicate in this key',
  'play.tom.duplicated': 'Song duplicated in {tom}',
```

- [ ] **Step 2: Write the failing test — a cifra inteira transposta**

Transpor uma cifra inteira **não** é aplicar `transporLinha` em toda linha: só as linhas de acorde andam, e quem sabe quais são é o parser. Isso é lógica pura e pertence a `transpose.js`, não a `state.js` (que toca o banco e não é testável em node).

Acrescentar a `app/test/transpose.test.js` (e `textoTransposto` ao import):

```js
test('a cifra inteira transposta preserva letra, seção e tablatura', () => {
  const cifra = [
    '[Intro]',
    'C       G',
    '',
    'C       G',
    'Andei por andar',
    'E|--0---2---|',
  ].join('\n');
  const out = textoTransposto(cifra, 2);
  assert.match(out, /^\[Intro\]/);
  assert.ok(out.includes('D       A'), `linha de acordes não subiu:\n${out}`);
  assert.ok(out.includes('Andei por andar'), 'a letra foi alterada');
  assert.ok(out.includes('E|--0---2---|'), 'a tablatura foi alterada');
});

test('transpor a cifra de zero devolve o texto intacto', () => {
  const cifra = 'C       G\nAndei por andar';
  assert.equal(textoTransposto(cifra, 0), cifra);
});
```

Run: `cd app && node --test test/transpose.test.js`
Expected: FAIL — `textoTransposto is not a function`

- [ ] **Step 3: Implementar `textoTransposto`**

Ajustar o import de `app/js/transpose.js` para incluir `parseCifraText`:

```js
import { chordLineSegs, chordName, isChordTok, parseCifraText } from './chords.js';
```

E acrescentar ao final do arquivo:

```js
// Transpõe uma cifra inteira preservando tudo o que não é linha de acordes.
// Quem decide o que é linha de acordes é o parser, não uma heurística nova — e
// ele devolve as linhas normalizadas, então o texto é remontado a partir delas
// na mesma ordem em que o parser as separa: seção, acordes, tab, letra.
export function textoTransposto(texto, semitons) {
  if (!semitons) return texto;
  return parseCifraText(texto).map((l) => {
    const partes = [];
    if (l.isSection) partes.push(l.section);
    if (l.hasChords) partes.push(transporLinha(l.chords, semitons));
    if (l.isTab) partes.push(...l.tab);
    if (l.hasLyric) partes.push(l.lyric);
    return partes.join('\n');
  }).join('\n');
}
```

Run: `cd app && node --test test/transpose.test.js`
Expected: PASS.

- [ ] **Step 4: A duplicação**

Em `app/js/state.js`, acrescentar junto de `saveSong` (~linha 425). `DB` e `uid` já estão importados no topo do arquivo; falta só a linha de `./transpose.js`:

```js
import { textoTransposto, transporAcorde, tomDeSemitons, tituloNoTom } from './transpose.js';
```

```js
// Duplica a música num tom novo. A cópia é IDÊNTICA à original salvo pelo que a
// duplicação obriga a mudar: id, título, a cifra transposta, o tom e os blobs.
// Isso inclui o áudio — você duplica justamente para testar outro tom, e uma
// cópia sem os recursos não é cópia.
//
// Os bytes são COPIADOS, não referenciados. Compartilhar blobId entre duas
// músicas quebraria calado duas coisas que assumem dono exclusivo: deleteSongs
// (apaga todo blob das vítimas sem checar quem mais usa) e o laço do export em
// backup.js (não deduplica, e gravaria os mesmos bytes duas vezes no arquivo).
//
// O mapa de ids vem de blobIdsDasMusicas, que é a definição única de "quais
// blobs são desta música" — listar stems e full à mão aqui é como duplicar e
// apagar passariam a discordar.
export async function duplicarMusicaNoTom(song, semitons, tomBase) {
  const mapa = new Map();
  for (const id of blobIdsDasMusicas([song])) {
    const b = await DB.getBlob(id);
    if (!b) continue;
    const novo = uid();
    await DB.saveBlob(novo, b);
    mapa.set(id, novo);
  }
  const remapa = (arr) => (arr || []).map((x) => (x && x.blobId && mapa.has(x.blobId)
    ? { ...x, blobId: mapa.get(x.blobId) } : { ...x }));

  const tomNovo = tomDeSemitons(tomBase, semitons) || tomBase || '';
  const copia = {
    ...song,
    id: uid(),
    title: tomNovo ? tituloNoTom(song.title, tomNovo) : song.title,
    tom: tomNovo,
    createdAt: Date.now(),
    stems: remapa(song.stems),
    full: remapa(song.full),
    cifra: {
      ...(song.cifra || {}),
      texto: textoTransposto(song.cifra?.texto || '', semitons),
      imagens: remapa(song.cifra?.imagens),
      acordes: (song.cifra?.acordes || []).map((n) => transporAcorde(n, semitons)),
      // Digitação é casa ABSOLUTA, e a chave é o nome do acorde. Carregar o mapa
      // para a cópia transposta não é inofensivo: transpor mapeia nome em nome,
      // então o antigo C vira D e HERDA a digitação que era do D — forma errada
      // no acorde errado, em silêncio. Renomear as chaves seria pior ainda: a
      // forma de C rotulada D continua sendo a forma de C. A cópia começa limpa
      // e cai no catálogo, que é o certo para um tom que não é o mesmo.
      digitacoes: {},
    },
  };
  await saveSong(copia);
  return copia.id;
}
```

- [ ] **Step 5: O botão no popover**

Em `app/js/render/tompop.js`, antes do `tom-reset`:

```js
    <button class="btn-primary small tom-dup" data-a="duplicateInKey" ${S.transpose ? '' : 'disabled'}>${t('play.tom.duplicate')}</button>
```

- [ ] **Step 6: A ação**

Em `app/js/main.js`, junto das outras ações do tom:

```js
  async duplicateInKey() {
    const song = currentSong();
    if (!song || !S.transpose) return;
    const { base } = tomAtual(song);
    const tomNovo = tomDeSemitons(base, S.transpose) || '';
    const novoId = await duplicarMusicaNoTom(song, S.transpose, base);
    S.tomPop = null;
    S.transpose = 0;
    toast(t('play.tom.duplicated', { tom: tomNovo }));
    goSong(novoId, S.backTo);
    update();
  },
```

Acrescentar `duplicarMusicaNoTom` ao import de `./state.js` e `tomDeSemitons` ao de `./transpose.js`. `toast` é função local de `main.js` (linha 38) — não precisa de import.

- [ ] **Step 7: Verificar sintaxe e suíte**

Run: `cd app && node --check js/state.js && node --check js/main.js && node --check js/render/tompop.js && node --test`
Expected: PASS.

- [ ] **Step 8: Verificar no navegador**

Numa música **com áudio** (usar a música de exemplo com stems, ou cadastrar uma):

- transpor, tocar em "Duplicar neste tom"
- o app abre a música nova, chamada `Título (Tom)`, já no tom novo e com `S.transpose` zerado
- a música nova aparece em Artistas, Músicas e Recentes
- o mixer da cópia toca — os stems vieram junto
- **apagar a original não afeta o áudio da cópia** (é o teste que prova que os bytes foram copiados, não referenciados)
- duplicar a cópia para um terceiro tom dá `Título (TomNovo)`, e não `Título (Tom) (TomNovo)`
- exportar as duas num `.somaplay` e reimportar num navegador limpo: as duas chegam íntegras
- a cifra da cópia mantém letra, seções e tablatura no lugar

- [ ] **Step 9: Commit**

```bash
git add app/js/state.js app/js/transpose.js app/test/transpose.test.js app/js/render/tompop.js app/js/main.js app/js/i18n/pt.js app/js/i18n/en.js
git commit -m "feat(transpose): keep a key by duplicating the song, audio and all"
```

---

### Task 8: Fechamento — versão e a exceção no CLAUDE.md

**Files:**
- Modify: `app/js/version.js`
- Modify: `app/sw.js` (linha 2)
- Modify: `CLAUDE.md`

- [ ] **Step 1: Subir a versão nos dois lugares**

`app/js/version.js`:

```js
export const VERSION = '0.14.0';
```

`app/sw.js`, linha 2:

```js
const VERSION = 'somaplay-0.14.0';
```

MINOR porque é feature nova. Qualquer valor diferente entre os dois reprova em `version.test.js`. O `0.13.0` **já foi usado** pela quebra-na-respiração (PR #25, mergeado em 2026-08-16) — daí o salto para `0.14.0`.

- [ ] **Step 1b: Entrada no CHANGELOG**

`version.test.js` exige `## [0.14.0]` em `CHANGELOG.md`. Acrescentar acima da entrada `## [0.13.0]`, seguindo o formato das existentes (Keep a Changelog, em inglês):

```markdown
## [0.14.0] - 2026-08-16

### Added

- **Key transposition.** Tapping the key pill in a text chart opens a popover
  with half-step buttons, a twelve-key grid and a reset — the shape musicians
  already know from CifraClub. Chords are re-placed in their original character
  columns, so a chord stays over its syllable even when `C` becomes `C#`.
- A song with no key recorded now shows one **guessed from the last chord of the
  chart**, marked with `?` until the field is filled in on the edit screen.
- **Duplicate in this key** saves a transposed chart as a new song named
  `Title (Key)` — an identical copy, audio included, with its own bytes.

### Notes

- Transposition is ephemeral: it resets when you leave the song, and no field is
  added to the song record. The `.somaplay` format is unchanged.
- Audio and tablature do not follow the transposition, and the app says so while
  you are away from the original key. Image charts are out of scope.
```

- [ ] **Step 2: Registrar a exceção no CLAUDE.md**

Na seção "Things that will bite you", logo depois do parágrafo **"Never translate or renotate the user's chart"**, acrescentar:

```markdown
**A transposição é a única exceção à regra acima, e é deliberada.**
`app/js/transpose.js` reescreve os acordes da cifra do usuário — porque subir de
tom é o que o violeiro pediu, e não há como entregar isso sem tocar no texto. O
que a torna segura é a *reposição por coluna*: cada acorde volta para a coluna
de onde saiu, e só anda quando o vizinho cresceu a ponto de encostar, com um
espaço de folga mínima. Fora desse módulo a regra continua valendo inteira.
Spec: `docs/superpowers/specs/2026-08-16-transposicao-design.md`.
```

- [ ] **Step 3: Verificação final completa**

Run: `cd app && node --test`
Expected: toda a suíte PASS, incluindo `version.test.js`, `shell.test.js` e `i18n.test.js`.

- [ ] **Step 4: Verificação de instalação offline**

Com o servidor rodando, abrir o app, confirmar em Ajustes que a versão mostrada é **0.13.0**, desligar a rede (DevTools → Network → Offline), recarregar e confirmar que o app abre e que a transposição funciona. É o que prova que os dois módulos novos entraram no `SHELL` de verdade.

- [ ] **Step 5: Commit**

```bash
git add app/js/version.js app/sw.js CLAUDE.md
git commit -m "release: 0.13.0 — key transposition"
```

---

## Ordem e portões

As Tasks 1–3 são puras e testáveis sem navegador; é onde mora o risco e onde a revisão é barata. A Task 4 mostra a cifra transposta sem nenhum controle na tela, de propósito: é o portão do alinhamento, que é a coisa que pode dar errado de forma difícil de ver. Só depois dela é que entra UI.

Se alguma coisa quebrar o alinhamento acorde↔sílaba, a suspeita começa em `transporLinha` — e o teste que pega isso é o `'a linha transposta continua sendo linha de acordes para o parser'`, porque uma linha que o parser deixa de reconhecer some inteira da tela em vez de aparecer torta.
