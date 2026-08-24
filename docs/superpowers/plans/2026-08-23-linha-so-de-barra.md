# Linha só de barra de compasso — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uma linha de acordes que só tem barra de compasso passa a ser pareada com a linha de letra logo abaixo, para que as duas refluam juntas e a barra continue caindo sobre a sílaba quando a linha quebra.

**Architecture:** Um ramo novo e isolado dentro de `parseCifraText`, antes do ramo do `isChordLine`. A função `isChordLine` **não muda** — ela é usada também pelo detector de tablatura, e afrouxá-la mexeria em casos não medidos. O ramo novo só dispara quando a linha é composta apenas de `/` e espaço **e** a linha seguinte é letra.

**Tech Stack:** ES modules puros, sem build e sem dependência. Testes com `node --test` (Node ≥ 20).

**Spec:** `docs/superpowers/specs/2026-08-23-linha-so-de-barra-design.md`

## Global Constraints

- **Branch base: `feat/livros-pdf`** (está em `0.17.0`). Não sair da `main` — decisão registrada na spec.
- **Worktree obrigatório, não `checkout`.** `README.md` e `README.pt-BR.md` têm modificação pendente em `feat/transposicao` e divergem entre as branches; trocar de branch na árvore atual conflita. O worktree também preserva `chords/` e `scripts/new_songbook/books/`, ignorados pelo git e com extração em andamento.
- **Versão: `0.17.0` → `0.17.1`**, em `app/js/version.js` e na linha 2 de `app/sw.js`. `app/test/version.test.js` exige os dois em sincronia **e** uma entrada `## [0.17.1]` em `CHANGELOG.md`.
- **Só o caractere `/`.** Nunca `|`: pipe captura as 1720 linhas de grade de diagrama em ASCII do acervo do Vitor (137 músicas) e quebraria todas.
- **Nunca reescrever a cifra do usuário.** Nada de inserir o acorde regente no começo da linha de barras.
- Comentário de código novo em **português** neste arquivo — `chords.js` já é comentado em português, e a regra do projeto é seguir o arquivo.
- Rodar os testes sempre de dentro de `app/`: `cd app && node --test`.

---

### Task 1: Worktree e a spec na branch nova

**Files:**
- Create: worktree em `../somaplay-linha-barra` na branch `fix/linha-so-de-barra`
- Modify: nenhum arquivo de código

**Interfaces:**
- Consumes: nada
- Produces: uma árvore de trabalho limpa em `fix/linha-so-de-barra`, saída de `feat/livros-pdf`, com a spec presente em `docs/superpowers/specs/2026-08-23-linha-so-de-barra-design.md`

- [ ] **Step 1: Criar o worktree a partir de `feat/livros-pdf`**

```bash
cd "/Users/somacavalieri/Library/CloudStorage/GoogleDrive-somacavalieri@gmail.com/My Drive/_claude/somaplay"
git worktree add -b fix/linha-so-de-barra ../somaplay-linha-barra feat/livros-pdf
```

- [ ] **Step 2: Conferir que a base está certa**

```bash
cd ../somaplay-linha-barra
grep VERSION app/js/version.js
sed -n '2p' app/sw.js
```

Esperado: `export const VERSION = '0.17.0';` e `const VERSION = 'somaplay-0.17.0';`

- [ ] **Step 3: Trazer os dois commits da spec**

A spec nasceu em `feat/transposicao`. Levar os dois commits para cá:

```bash
git cherry-pick 12d1df3 0779aa3
```

Se algum conflitar, o arquivo é novo em ambos — ficar com a versão de `feat/transposicao` inteira.

- [ ] **Step 4: Conferir que os testes passam ANTES de qualquer mudança**

```bash
cd app && node --test
```

Esperado: tudo verde. Este é o baseline; se já houver teste vermelho aqui, parar e reportar em vez de seguir.

- [ ] **Step 5: Commit (nada a commitar além do cherry-pick)**

O cherry-pick já commitou. Conferir:

```bash
git log --oneline -3
```

---

### Task 2: A linha de barra pura pareia com a letra

**Files:**
- Modify: `app/js/chords.js` — acrescenta `SO_BARRA` perto das outras constantes de reconhecimento (junto de `MARK`, hoje na linha 94) e um ramo em `parseCifraText` imediatamente antes de `if (isChordLine(raw)) {` (hoje linha 217)
- Test: `app/test/cifraparse.test.js` (acrescentar ao fim do arquivo)

**Interfaces:**
- Consumes: `parseCifraText` de `../js/chords.js`, já importado no arquivo de teste
- Produces: nenhum símbolo exportado novo. `SO_BARRA` é interno ao módulo; a mudança é só de comportamento de `parseCifraText`

- [ ] **Step 1: Escrever o teste que falha**

Acrescentar ao fim de `app/test/cifraparse.test.js`:

```js
// --- Linha só de barra de compasso ----------------------------------------
// Spec: docs/superpowers/specs/2026-08-23-linha-so-de-barra-design.md

test('linha só de barra pareia com a letra seguinte', () => {
  const p = parseCifraText([
    'E7(#9)   /    /',
    '   A sala cala e o jornal',
    '   /     /    /',
    'Manso        O tempo corre',
  ].join('\n'));
  assert.equal(p.length, 2, 'a barra e a letra têm de sair num bloco só');
  assert.equal(p[1].hasChords, true);
  assert.equal(p[1].chords, '   /     /    /');
  assert.equal(p[1].hasLyric, true);
  assert.equal(p[1].lyric, 'Manso        O tempo corre');
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd app && node --test test/cifraparse.test.js
```

Esperado: FALHA em `a barra e a letra têm de sair num bloco só` — hoje saem **3** blocos, com a barra sozinha em `{chords:'', lyric:'   /     /    /'}`.

- [ ] **Step 3: Implementar**

Em `app/js/chords.js`, logo depois da constante `MARK` (hoje linha 94), acrescentar:

```js
// Linha só de barra de compasso. Nos songbooks do Chediak a harmonia segue de um
// sistema para o outro sem o nome do acorde ser repetido, e a página imprime só
// as barras. A linha É de acordes — marca em que coluna cai cada compasso — mas
// `isChordLine` a reprova por não ter nenhum acorde nomeado. Essa guarda existe
// para não promover uma linha de letra que seja só "..." ou "---", e continua
// valendo: quem afrouxa é o PAREAMENTO em parseCifraText, não a função.
//
// Só `/`. Aceitar `|` capturaria as grades de diagrama em ASCII do acervo do
// Vitor — 1720 linhas em 137 músicas, medidas — que não são linha de acordes.
// Spec: docs/superpowers/specs/2026-08-23-linha-so-de-barra-design.md
const SO_BARRA = /^[ \t/]*\/[ \t/]*$/;
```

Em `parseCifraText`, imediatamente **antes** de `if (isChordLine(raw)) {` (hoje linha 217), acrescentar:

```js
    // Barra pura seguida de letra: pareia, para `wrapBlock` refluir as duas na
    // mesma coluna. Sem isto viram dois blocos soltos, que quebram em pontos
    // diferentes e tiram a barra de cima da sílaba. Fica DEPOIS da corrida de
    // tab (uma linha de barras casa em `isTabLine`) e ANTES do ramo de acordes,
    // que esta linha não alcança.
    if (SO_BARRA.test(raw)) {
      const depois = lines[i + 1];
      if (depois !== undefined && depois.trim() && !SO_BARRA.test(depois)
          && !isChordLine(depois) && !/^\[.+\]$/.test(depois.trim())) {
        out.push({ chords: semRabo(raw), lyric: semRabo(depois) });
        i += 2;
        continue;
      }
    }
```

- [ ] **Step 4: Rodar e ver passar**

```bash
cd app && node --test test/cifraparse.test.js
```

Esperado: PASSA. Depois a suíte inteira:

```bash
cd app && node --test
```

Esperado: tudo verde — em especial os 69 testes de `cifraparse` e os 27 de `cifrawrap` que já existiam.

- [ ] **Step 5: Commit**

```bash
git add app/js/chords.js app/test/cifraparse.test.js
git commit -m "fix(cifra): pair a bar-only chord line with its lyric line

A chord line carrying only measure bars fails isChordLine by design, so
parseCifraText left it unpaired and wrapBlock refluxed the two loose blocks
at different points — the bar stopped falling on the syllable.

isChordLine is untouched: it also feeds the tab-anchor guard.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Travar a fronteira da regra

Estes testes **passam já no primeiro run** — não são TDD, são travas de regressão. Existem para que a próxima pessoa que mexer na regra descubra na hora se ela vazou para além do que a spec autoriza. Escrever depois da Task 2, com a implementação no lugar.

**Files:**
- Test: `app/test/cifraparse.test.js` (acrescentar logo depois do teste da Task 2)
- Test: `app/test/cifrawrap.test.js` (acrescentar ao fim)

**Interfaces:**
- Consumes: `parseCifraText` e `wrapBlock` de `../js/chords.js`
- Produces: nada

- [ ] **Step 1: Escrever as travas do pareamento**

Em `app/test/cifraparse.test.js`, depois do teste da Task 2:

```js
test('barra pura SEM letra depois continua bloco de letra, como antes', () => {
  const p = parseCifraText('C   G\ndó  sol\n/  /  /');
  assert.equal(p.length, 2);
  assert.equal(p[1].hasChords, false, 'sem letra depois, nada muda');
  assert.equal(p[1].lyric, '/  /  /');
});

test('barra pura seguida de outra barra pura não pareia', () => {
  const p = parseCifraText('/  /  /\n/  /  /');
  assert.equal(p.length, 2);
  assert.equal(p[0].hasChords, false);
  assert.equal(p[1].hasChords, false);
});

// Esta é a trava que protege 137 músicas do acervo do Vitor: linha só de pipe é
// grade de diagrama desenhada em ASCII, não linha de acordes.
test('linha só de pipe NÃO pareia com a letra seguinte', () => {
  const p = parseCifraText('||||||   ||||||\n O ooo    O ooo');
  assert.equal(p.length, 2);
  assert.equal(p[0].hasChords, false);
  assert.equal(p[1].hasChords, false);
});

// A spec diz que a regra NÃO olha a linha anterior. Uma barra pura abrindo a
// música, sem nenhum acorde nomeado antes, pareia igual.
test('barra pura abrindo a música pareia, sem acorde antes dela', () => {
  const p = parseCifraText('/   /   /\numa letra qualquer');
  assert.equal(p.length, 1);
  assert.equal(p[0].chords, '/   /   /');
  assert.equal(p[0].lyric, 'uma letra qualquer');
});

test('linha de letra que é só reticências ou traços não pareia', () => {
  for (const marca of ['...', '---']) {
    const p = parseCifraText(`${marca}\numa letra qualquer`);
    assert.equal(p[0].hasChords, false, `"${marca}" não pode virar linha de acordes`);
  }
});

// isChordLine não é exportado; a prova de que continua reprovando a barra pura é
// que uma barra pura SEM letra depois segue caindo no ramo de letra (teste
// acima) e que uma linha de acordes seguida de barra pura continua pareando as
// duas como acorde/letra, que é o comportamento de hoje.
test('acorde seguido de barra pura continua pareando como acorde/letra', () => {
  const p = parseCifraText('C   G\n/   /');
  assert.equal(p.length, 1);
  assert.equal(p[0].chords, 'C   G');
  assert.equal(p[0].lyric, '/   /');
});
```

- [ ] **Step 2: Escrever a trava do reflow**

Em `app/test/cifrawrap.test.js`, ao fim:

```js
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
```

Acrescentar `parseCifraText` ao import no topo de `app/test/cifrawrap.test.js`:

```js
import { wrapBlock, layoutChordRow, chordDiagWidth, chordName, parseCifraText } from '../js/chords.js';
```

- [ ] **Step 3: Rodar**

```bash
cd app && node --test
```

Esperado: tudo verde. Se `barra pura e letra quebram juntas` falhar na comparação exata, **não ajustar o valor esperado sem olhar** — conferir primeiro se a Task 2 foi aplicada, porque o `assert.deepEqual` foi medido contra o `wrapBlock` real.

- [ ] **Step 4: Commit**

```bash
git add app/test/cifraparse.test.js app/test/cifrawrap.test.js
git commit -m "test(cifra): lock the bar-only rule to slashes and to a lyric below

Pipes stay out: a pipe-only line is the Vitor collection's ASCII chord-box
art, 1720 lines across 137 songs.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Subir a versão para 0.17.1

`app/js/chords.js` está no `SHELL`, então pela regra do projeto a mudança é no mínimo PATCH. `version.test.js` guarda os três lugares.

**Files:**
- Modify: `app/js/version.js:11`
- Modify: `app/sw.js:2`
- Modify: `CHANGELOG.md` — nova seção depois de `## [Unreleased]`

**Interfaces:**
- Consumes: nada
- Produces: `VERSION === '0.17.1'`, chave de cache `somaplay-0.17.1`

- [ ] **Step 1: Ver o teste de versão falhar por causa do CHANGELOG**

Subir os dois literais primeiro, de propósito, para ver a trava do CHANGELOG agir:

Os passos anteriores deixam o shell dentro de `app/`; subir um nível primeiro.

```bash
cd "$(git rev-parse --show-toplevel)"
sed -i '' "s/export const VERSION = '0.17.0';/export const VERSION = '0.17.1';/" app/js/version.js
sed -i '' "s/const VERSION = 'somaplay-0.17.0';/const VERSION = 'somaplay-0.17.1';/" app/sw.js
cd app && node --test test/version.test.js
```

Esperado: FALHA em `o CHANGELOG tem entrada para a versão atual`.

- [ ] **Step 2: Escrever a entrada do CHANGELOG**

Em `CHANGELOG.md`, entre `## [Unreleased]` / `Nothing yet.` e `## [0.17.0] - 2026-08-23`:

```markdown
## [0.17.1] - 2026-08-23

### Fixed

- **A barra de compasso volta a cair sobre a sílaba quando a linha quebra.** Uma
  linha de acordes que só tem barra — os songbooks do Chediak não repetem o nome
  do acorde enquanto a harmonia se mantém — não era pareada com a linha de letra,
  e as duas quebravam em pontos diferentes na tela. Só vale para a barra `/`: uma
  linha só de `|` é grade de diagrama em ASCII e continua como está.
```

- [ ] **Step 3: Rodar**

```bash
cd app && node --test
```

Esperado: tudo verde, inclusive os três testes de `version.test.js`.

- [ ] **Step 4: Commit**

```bash
git add app/js/version.js app/sw.js CHANGELOG.md
git commit -m "chore(release): 0.17.1

chords.js is in SHELL, so the fix needs a new cache key.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Conferir no navegador

O projeto tem três camadas de verificação e a terceira é a que conta: não há harness de DOM, de propósito. Esta task não tem teste automatizado — o entregável é a confirmação visual.

**Files:**
- Modify: nenhum (só verificação)

**Interfaces:**
- Consumes: `joao-bosco-2.somaplay`, gerado em `chords/-new-songbook/João Bosco Vol 2 - Almir Chediak/` na árvore principal (o worktree não tem `chords/`, que é ignorado pelo git)
- Produces: nada

- [ ] **Step 1: Subir o servidor no worktree**

```bash
cd ../somaplay-linha-barra/app && python3 -m http.server 8137
```

- [ ] **Step 2: Importar a música**

Abrir `http://localhost:8137`, e em Ajustes usar **Adicionar/atualizar do backup** (modo merge) apontando para:

```
<árvore principal>/chords/-new-songbook/João Bosco Vol 2 - Almir Chediak/joao-bosco-2.somaplay
```

- [ ] **Step 3: Conferir a versão na tela**

Ajustes tem de mostrar **0.17.1**. Se mostrar 0.17.0, o Service Worker está servindo do cache velho: recarregar com o cache desligado, ou desregistrar o SW nas DevTools.

- [ ] **Step 4: Abrir *Bala com bala* e olhar os dois pontos relatados**

Numa largura que force quebra (a linha mais larga tem 122 colunas):

- **depois de “voando”** e **depois de “mocinho”** não deve mais aparecer o vão de duas fileiras de barra seguidas de duas de letra;
- cada fileira de barra tem de vir **imediatamente acima** da fileira de letra a que pertence, com a barra na coluna da sílaba;
- as duas linhas passam a ser desenhadas na cor de acorde (âmbar, negrito) em vez de cor de letra — é a mudança esperada, não defeito.

- [ ] **Step 5: Conferir que a *Nação* não mudou**

*Nação* não tem linha de barra pura. Abrir e confirmar que continua igual — é o controle de que a regra não vazou.

---

## Notas para quem executar

- **Não exportar `isChordLine`** para testá-la direto. Ela é interna de propósito, e a trava indireta da Task 3 cobre o que a spec pede.
- **Se aparecer vontade de aceitar `|`**, releia a seção “Por que só `/`” da spec: são 1720 linhas de arte ASCII contra 4 de barra. A regra só se amplia com contagem nova.
- **O worktree fica.** Só remover com `git worktree remove` depois que a branch for mergeada, e conferir antes que nada de `chords/` ou `books/` foi parar lá dentro (não deveria: os dois são ignorados).
