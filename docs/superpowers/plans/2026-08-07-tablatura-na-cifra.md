# Tablatura na cifra em texto — plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para executar tarefa a tarefa. Os passos usam checkbox (`- [ ]`).

**Objetivo:** fazer a tablatura de uma cifra em texto caber na largura disponível em vez de quebrar linha, encolhendo o bloco em vez de rolar.

**Arquitetura:** tablatura ganha um tipo próprio de linha no parser (`isTabLine` + agrupamento em bloco), um bloco próprio no render (`.tabwrap > .tab` com `--cols`) e uma regra CSS que calcula a fonte em que `--cols` colunas cabem no container (`min(1em, 100cqi/(cols*.6))`). Nada de medição em JS, nada de ouvinte de resize.

**Stack:** ES modules puros, sem build e sem dependências. Testes com `node --test` (Node ≥ 20). CSS com container queries.

**Spec:** `docs/superpowers/specs/2026-08-07-tablatura-na-cifra-design.md`

## Restrições globais

- **Nada de dependência nova, nada de build.** O app é servido como está.
- **Nunca alterar o texto da cifra do usuário.** `esc()` imprime a linha byte a byte. Nenhuma substituição de caractere dentro da tab — a coluna é a informação.
- **Toda mudança em `app/css/` ou `app/js/` exige bump de `VERSION` em `app/sw.js:2`.** O `SHELL` **não** muda aqui: nenhum módulo novo.
- **Nada de `t()` em valor de `data-*`.** Não se aplica a este plano (não há `data-*` novo), mas vale se surgir.
- **Verificar com `cd app && node --test` e `node --check`.** UI é verificação manual no navegador — não há harness de DOM, de propósito.
- **Commitar apenas os arquivos listados em cada tarefa, nunca `git add -A`.** Há trabalho não relacionado sem rastrear em `docs/campo_armonico/`.
- **Âncoras conferidas em `5a5c44b`** (2026-08-10): `isChordOrMark` em `chords.js:70`, `parseCifraText` em `chords.js:109-139`, `cifraTextHTML` em `play.js:148`, `.cifra-text` em `app.css:245`, `VERSION = 'somaplay-v20'` em `sw.js:2`. Suíte verde nessa base. Se algum número não bater, achar pelo nome — o conteúdo é que vale.

## Estrutura de arquivos

| Arquivo | Responsabilidade | Tarefa |
|---|---|---|
| `app/js/chords.js` | `isTabLine` (nova, exportada) e agrupamento de bloco em `parseCifraText` | 1, 2 |
| `app/test/cifraparse.test.js` | testes de reconhecimento e de agrupamento | 1, 2 |
| `app/js/render/play.js` | `tabBlockHTML` e desvio em `cifraTextHTML` | 3 |
| `app/css/app.css` | `.tabwrap` / `.tab` e ligadura desligada | 3 |
| `app/sw.js` | bump de `VERSION` | 3 |
| `scripts/ab-tab.mjs` (temporário) | A/B do reconhecimento contra o acervo | 4 |

---

### Tarefa 1: reconhecer linha de tablatura

**Arquivos:**
- Modificar: `app/js/chords.js` (inserir logo depois de `isChordOrMark`, linha 70)
- Testar: `app/test/cifraparse.test.js` (o import fica na linha 3, já com `splitChordTok`)

**Interfaces:**
- Consome: nada.
- Produz: `export function isTabLine(line: string): boolean` — verdadeiro para a pauta de uma corda. Usada pela Tarefa 2.

- [ ] **Passo 1: escrever os testes que falham**

Adicionar ao fim de `app/test/cifraparse.test.js`, e incluir `isTabLine` no import da linha 3:

```js
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
```

- [ ] **Passo 2: rodar e confirmar que falha**

```bash
cd app && node --test test/cifraparse.test.js
```

Esperado: FAIL — `SyntaxError` ou `The requested module '../js/chords.js' does not provide an export named 'isTabLine'`.

- [ ] **Passo 3: implementar `isTabLine`**

Em `app/js/chords.js`, logo depois da linha `const isChordOrMark = ...`:

```js
// Alfabeto de tablatura: nome da corda opcional, barra ou dois-pontos, e daí em
// diante só traço, dígito, barra de compasso e os símbolos de técnica e
// ornamento. Maiúscula fora do nome da corda derruba o casamento — é o que
// mantém "C ---- G" como linha de acordes e "Ela disse: ---" como letra.
const TAB_ALFABETO = /^[A-Ga-g]?[#b]?\s*[|:]{0,2}[-\d|:hpbsrtvx~^*.+()<>\\/ ]+$/;

// Linha de tablatura — a pauta de uma corda ("E|-0---0---|", "|---3---|").
// Não é letra nem linha de acordes: é grade de largura fixa, onde a coluna
// carrega a informação, e quebrar a linha destrói a grade.
// O critério de traço é proporção, não corrida: tab curta tem corrida curta
// ("E|--0--2--3--|" não tem nenhum "---"), e a proporção pega as duas. É ela
// também que separa a pauta da digitação inline "0221xx", que não tem traço.
// O piso é 30% porque tab densa de técnica é pouco tracejada — em
// "G|--5h7p5--7b9--5/7--|" o traço é só 36% da linha.
export function isTabLine(line) {
  const s = String(line).trim();
  if (!TAB_ALFABETO.test(s)) return false;
  const tracos = (s.match(/-/g) || []).length;
  return tracos >= 3 && tracos >= s.length * 0.3;
}
```

- [ ] **Passo 4: rodar e confirmar que passa**

```bash
cd app && node --test test/cifraparse.test.js && node --check js/chords.js
```

Esperado: PASS, sem falha nova na suíte.

- [ ] **Passo 5: commitar**

```bash
git add app/js/chords.js app/test/cifraparse.test.js
git commit -m "feat: recognize tablature lines in the cifra parser"
```

---

### Tarefa 2: agrupar tablatura em bloco

**Arquivos:**
- Modificar: `app/js/chords.js:109-139` (comentário de bloco + `parseCifraText`)
- Testar: `app/test/cifraparse.test.js`

**Interfaces:**
- Consome: `isTabLine(line)` da Tarefa 1.
- Produz: cada linha devolvida por `parseCifraText` ganha dois campos — `tab: string[]` (linhas cruas da pauta, vazio quando não é tab) e `isTab: boolean`. Um bloco de tab pode trazer `chords`/`hasChords` preenchidos: é a linha de acordes que estava logo acima. Consumido pela Tarefa 3.

- [ ] **Passo 1: escrever os testes que falham**

Adicionar ao fim de `app/test/cifraparse.test.js`:

```js
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
```

- [ ] **Passo 2: rodar e confirmar que falha**

```bash
cd app && node --test test/cifraparse.test.js
```

Esperado: FAIL — `p.length` 3 em vez de 1, e `p[0].isTab` `undefined`.

- [ ] **Passo 3: reescrever `parseCifraText`**

Substituir o corpo inteiro de `parseCifraText` em `app/js/chords.js` por:

```js
export function parseCifraText(text) {
  const out = [];
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
  const semRabo = (s) => s.replace(/\s+$/, '');
  // Corrida de linhas de tab a partir de i. As cordas de um mesmo bloco têm de
  // sair juntas: elas compartilham a fonte, e fonte diferente desalinha coluna.
  const corridaTab = (i) => {
    const run = [];
    while (i < lines.length && isTabLine(lines[i])) run.push(semRabo(lines[i++]));
    return run;
  };
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (!trimmed) { out.push({ lyric: ' ' }); i++; continue; }
    if (/^\[.+\]$/.test(trimmed)) { out.push({ section: trimmed }); i++; continue; }
    if (isTabLine(raw)) {
      const run = corridaTab(i);
      out.push({ tab: run });
      i += run.length;
      continue;
    }
    if (isChordLine(raw)) {
      const next = lines[i + 1];
      // Tab logo abaixo: a linha de acordes entra no bloco em vez de virar par
      // acorde/letra. Ela marca a coluna onde o acorde vale — fora do bloco, o
      // bloco encolheria e ela não, e a coluna se perderia.
      if (next !== undefined && isTabLine(next)) {
        const run = corridaTab(i + 1);
        out.push({ chords: semRabo(raw), tab: run });
        i += 1 + run.length;
        continue;
      }
      if (next !== undefined && next.trim() && !isChordLine(next) && !/^\[.+\]$/.test(next.trim())) {
        out.push({ chords: semRabo(raw), lyric: semRabo(next) });
        i += 2;
      } else {
        out.push({ chords: semRabo(raw) });
        i++;
      }
      continue;
    }
    out.push({ lyric: semRabo(raw) });
    i++;
  }
  return out.map((l) => ({
    section: l.section || '', isSection: !!l.section,
    chords: l.chords || '', hasChords: !!l.chords,
    lyric: l.lyric || '', hasLyric: !!l.lyric,
    tab: l.tab || [], isTab: !!(l.tab && l.tab.length),
  }));
}
```

Atualizar também o comentário de bloco acima da função (linhas 109-110) para citar o novo formato:

```js
// Parser de cifra colada (estilo CifraClub): [Seção] / linha de acordes / letra /
// bloco de tablatura.
// Retorna linhas normalizadas:
// { isSection, section, hasChords, chords, hasLyric, lyric, isTab, tab }
```

- [ ] **Passo 4: rodar a suíte inteira**

```bash
cd app && node --test && node --check js/chords.js
```

Esperado: PASS em tudo. Atenção especial aos testes antigos de par acorde/letra — nenhum pode regredir.

- [ ] **Passo 5: commitar**

```bash
git add app/js/chords.js app/test/cifraparse.test.js
git commit -m "feat: group consecutive tablature lines into a single block"
```

---

### Tarefa 3: renderizar o bloco encolhendo para caber

**Arquivos:**
- Modificar: `app/js/render/play.js` (nova `tabBlockHTML` antes de `cifraTextHTML`; desvio dentro de `cifraTextHTML:155-165`)
- Modificar: `app/css/app.css:245` e `:248` (inserir depois)
- Modificar: `app/sw.js:2`

**Interfaces:**
- Consome: `ln.isTab`, `ln.tab`, `ln.chords`, `ln.hasChords` da Tarefa 2; `chordLineHTML(chordLine)` e `esc()`, já existentes em `play.js`.
- Produz: marcação `.tabwrap > .tab[style="--cols:N"]`, consumida pelo CSS desta mesma tarefa.

- [ ] **Passo 1: adicionar o CSS**

Em `app/css/app.css`, trocar a linha 245 por (acrescenta só o desligamento de ligadura):

```css
.cifra-text{font-family:var(--f-mono);font-size:20px;line-height:1.5;max-width:720px;margin:0 auto;font-variant-ligatures:none;font-feature-settings:"liga" 0,"calt" 0}
```

E inserir logo depois da linha `.cifra-text .ly{...}`:

```css
/* Tablatura: grade de largura fixa. Nunca quebra e nunca rola — encolhe.
   --cols é a maior largura do bloco em caracteres, escrita pelo render.
   1em é a fonte do zoom (teto); 100cqi/(cols*.6) é a fonte em que cols colunas
   ocupam a largura do container, dado o avanço .6em da monoespaçada.
   O container-type fica aqui e não no .cifra-text de propósito: ele implica
   contain:layout, que criaria bloco contentor para position:fixed e alcançaria
   o popover de acorde. O overflow-x é rede de segurança para fallback de fonte
   com avanço diferente de .6em — vira rolagem mínima em vez de voltar a quebrar. */
.cifra-text .tabwrap{container-type:inline-size;overflow-x:auto;margin:6px 0}
.cifra-text .tab{white-space:pre;font-size:min(1em,calc(100cqi/(var(--cols) * .6)))}
```

- [ ] **Passo 2: adicionar `tabBlockHTML` em `play.js`**

Inserir logo antes de `function cifraTextHTML(song) {` (linha 148):

```js
// Bloco de tablatura: uma corda por linha, sem quebra, com a linha de acordes de
// cima junto para escalar com ele e não perder a coluna. O CSS calcula a fonte a
// partir de --cols; aqui só se mede a largura em caracteres.
// Miniaturas não entram: diagrama de 100px posicionado em pixel não pertence a
// uma grade de tab.
function tabBlockHTML(ln) {
  const cols = Math.max(ln.chords.length, ...ln.tab.map((l) => l.length));
  const acordes = ln.hasChords ? `<div class="ch">${chordLineHTML(ln.chords)}</div>` : '';
  const cordas = ln.tab.map((l) => `<div>${esc(l)}</div>`).join('');
  return `<div class="tabwrap"><div class="tab" style="--cols:${cols}">${acordes}${cordas}</div></div>`;
}
```

- [ ] **Passo 3: desviar em `cifraTextHTML`**

Em `app/js/render/play.js`, trocar a primeira linha do `.map` do bloco `const lines = parsed.map((ln) => {`:

```js
  const lines = parsed.map((ln) => {
    if (ln.isTab) return tabBlockHTML(ln);
    let h = '';
```

O resto do callback fica exatamente como está.

- [ ] **Passo 4: bump do Service Worker**

Em `app/sw.js`, linha 2: `const VERSION = 'somaplay-v20';` → `'somaplay-v21'`.

O `SHELL` não muda — nenhum módulo novo. (Se o working tree já estiver em `v20` por trabalho não commitado, `v21` continua correto: a versão só precisa ser monotônica.)

- [ ] **Passo 5: rodar a suíte e o check de sintaxe**

```bash
cd app && node --test && node --check js/render/play.js
```

Esperado: PASS. `shell.test.js` continua verde (nenhum módulo novo).

- [ ] **Passo 6: verificar no navegador — esta é a verificação que conta**

```bash
cd app && python3 -m http.server 8137
```

Importar `forca-estranha-cifraclub.somaplay` (Ajustes → Importar, modo merge) e abrir a música em modo T1 Cifra. Conferir, um a um:

1. **Zoom 100%** — seis cordas, seis linhas. Nada quebrado.
2. **Zoom 110%, 150%, 200%** — continua seis linhas; o bloco encolhe, a letra e os acordes fora do bloco crescem normalmente.
3. **`A` na coluna certa** — o `A` de "Parte 1 de 6" fica sobre a 4ª coluna da tab em todos os zooms; o `C#m7` de "Parte 2 de 6" idem.
4. **`|` limpo** — o começo de cada corda é `E|-0`, não `E├─0`.
5. **Sem rolagem horizontal** — nem no bloco, nem na página.
6. **Sem barra de rolagem vertical no bloco** — `overflow-x:auto` faz o navegador computar `overflow-y:auto`; confirmar que nenhuma barra aparece.
7. **Miniaturas ligadas e desligadas** (Ajustes → miniaturas) — com miniaturas, o bloco de tab continua sem diagramas; o resto da música continua com.
8. **Janela estreita** (arrastar até ~400px) e **rotação** — o bloco reflui sozinho.
9. **Popover de acorde** — clicar num acorde dentro e fora do bloco de tab: abre e posiciona certo (é o que o `container-type` no wrapper protege).
10. **Uma música sem tab** — "Andança" ou o sample que acompanha o app: nada mudou.

- [ ] **Passo 7: commitar**

```bash
git add app/js/render/play.js app/css/app.css app/sw.js
git commit -m "feat: render tablature as a block that shrinks to fit"
```

---

### Tarefa 4: A/B do reconhecimento contra o acervo

Mesmo método que pegou a regressão do design de 2026-07-30: rodar o parser novo contra todas as cifras que existem e olhar o que mudou de classificação. É a única forma de saber que `isTabLine` não capturou linha de acordes ou de letra em música nenhuma.

**Arquivos:**
- Criar (temporário, **não commitar**): `scripts/ab-tab.mjs`

**Interfaces:**
- Consome: `parseCifraText` e `isTabLine` das Tarefas 1 e 2.
- Produz: relatório no terminal. Nenhum artefato no repositório.

- [ ] **Passo 1: escrever o script**

```js
// scripts/ab-tab.mjs — A/B do reconhecimento de tablatura contra o acervo.
// Temporário: roda, lê-se o relatório, apaga-se. Não vai para o repositório.
import { readFileSync, readdirSync } from 'node:fs';
import { isTabLine } from '../app/js/chords.js';

const arquivos = readdirSync('.').filter((f) => f.endsWith('.somaplay'));
const cifras = [];

for (const f of arquivos) {
  const raw = readFileSync(f, 'utf8');
  const inicio = raw.indexOf('{');
  const len = parseInt(raw.split('\n')[1], 10);
  const j = JSON.parse(raw.slice(inicio, inicio + len));
  for (const s of j.songs || []) {
    if (s.cifra?.texto) cifras.push({ arquivo: f, titulo: s.title, texto: s.cifra.texto });
  }
}

const { SAMPLES } = await import('../app/js/samples.js').catch(() => ({ SAMPLES: null }));
if (SAMPLES) {
  for (const s of (SAMPLES.songs || SAMPLES)) {
    if (s?.cifra?.texto) cifras.push({ arquivo: 'samples.js', titulo: s.title, texto: s.cifra.texto });
  }
}

let totalLinhas = 0, promovidas = 0;
const porMusica = new Map();
for (const c of cifras) {
  for (const linha of c.texto.replace(/\r\n?/g, '\n').split('\n')) {
    totalLinhas++;
    if (!isTabLine(linha)) continue;
    promovidas++;
    const k = `${c.arquivo} :: ${c.titulo}`;
    if (!porMusica.has(k)) porMusica.set(k, []);
    porMusica.get(k).push(linha);
  }
}

console.log(`cifras: ${cifras.length} · linhas: ${totalLinhas} · promovidas a tab: ${promovidas}\n`);
for (const [k, linhas] of porMusica) {
  console.log(`── ${k} (${linhas.length})`);
  for (const l of linhas.slice(0, 8)) console.log(`   |${l}|`);
  if (linhas.length > 8) console.log(`   … +${linhas.length - 8}`);
  console.log();
}
```

- [ ] **Passo 2: rodar**

```bash
node scripts/ab-tab.mjs
```

- [ ] **Passo 3: ler o relatório linha a linha**

Critério de aprovação: **toda** linha listada é pauta de tablatura de verdade. Uma única linha de acordes ou de letra na lista reprova — nesse caso, apertar `TAB_ALFABETO` ou a proporção de traços na Tarefa 1, adicionar o caso como teste de falso positivo, e rodar de novo.

Se `SAMPLES` não for exportado com esse nome, ajustar o import olhando `app/js/samples.js` — o script é descartável, não vale inventar abstração para ele.

- [ ] **Passo 4: apagar o script**

```bash
rm scripts/ab-tab.mjs
git status --short   # confirmar que nada de scripts/ ficou para trás
```

- [ ] **Passo 5: registrar o resultado no spec**

Em `docs/superpowers/specs/2026-08-07-tablatura-na-cifra-design.md`, na seção "Verificação", trocar a descrição do A/B pelo número real (ex.: "A/B em 222 cifras: 312 linhas promovidas a tab, 0 falso positivo"), e trocar `**Estado:** especificado` por `**Estado:** implementado e verificado`.

```bash
git add docs/superpowers/specs/2026-08-07-tablatura-na-cifra-design.md
git commit -m "docs: record the tablature A/B result against the library"
```

---

## Auto-revisão

**Cobertura do spec:**

| Requisito do spec | Tarefa |
|---|---|
| `isTabLine` — alfabeto + proporção de traços | 1 |
| Bloco de linhas consecutivas | 2 |
| Linha em branco encerra o bloco | 2 |
| Linha de acordes anterior absorvida | 2 |
| `hasChords` preservado para `extractChords` | 2 (teste) |
| `--cols` inclui a linha de acordes | 3 (`Math.max(ln.chords.length, ...)`) |
| `min(1em, 100cqi/(cols*.6))` | 3 |
| `container-type` no wrapper, não no `.cifra-text` | 3 |
| `overflow-x:auto` como rede de segurança | 3 |
| Ligadura desligada | 3 |
| Bloco de tab sem miniaturas | 3 |
| `.ly` continua `pre-wrap` | 3 (não se toca nele) |
| Bump de `VERSION` | 3 |
| Testes de reconhecimento e agrupamento | 1, 2 |
| A/B contra o acervo | 4 |
| Verificação no navegador | 3, passo 6 |

**Nomes:** `isTabLine`, `TAB_ALFABETO`, `corridaTab`, `semRabo`, `tabBlockHTML`, `--cols`, `.tabwrap`, `.tab` — usados com a mesma grafia em todas as tarefas.

**Sem placeholder:** todo passo de código traz o código.
