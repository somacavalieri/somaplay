# Atalhos de fonte que crescem com a biblioteca — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** No formulário de adicionar/editar música, os atalhos do campo **Fonte** deixam de ser dois botões escritos à mão e passam a ser derivados da biblioteca: CifraClub e Songbook fixos, seguidos das fontes já usadas, mais usadas primeiro, até 8 no total.

**Spec:** `docs/superpowers/specs/2026-08-10-atalhos-de-fonte-design.md`

**Architecture:** Uma função pura nova em `js/state.js` (`fontesSugeridas(songs, limit)`) calcula a lista; `js/render/addedit.js` a renderiza com um `.map()` no lugar dos dois `<button>` fixos. Nada é persistido além do que já é — a string em `song.fonte`. Sem migração, sem módulo novo.

**Tech Stack:** ES modules puros, sem build e sem dependências. Testes com `node --test` (Node >= 20). Verificação de UI é manual, no navegador — não existe harness de DOM neste projeto, de propósito.

## Global Constraints

- **Nunca traduza um valor `data-*`.** `data-id` do chip carrega o nome da fonte, que é gravado em `song.fonte`. Só o rótulo visível poderia passar por `t()` — e aqui rótulo e valor são a mesma string, então nenhum dos dois passa.
- **Toda chave de i18n existe nas duas tabelas** (`js/i18n/pt.js` e `js/i18n/en.js`). Remover uma chave significa removê-la das duas, senão `test/i18n.test.js` quebra.
- **Mudou código em `app/`? Suba o `VERSION` na linha 2 de `app/sw.js`.** O Service Worker é cache-first: sem o bump, quem já instalou o app continua rodando o JS antigo. Nesta mudança: `somaplay-v20` → `somaplay-v21`.
- **Nenhum módulo novo sob `app/js/`.** Todo arquivo lá precisa entrar no array `SHELL` do `sw.js`, ou o app quebra offline (`test/shell.test.js` cobre isso). Este plano não cria módulo nenhum.
- **Nunca renomeie `DB_NAME` em `app/js/db.js`.** Não há motivo para tocar nesse arquivo aqui.
- Comentários de código novo em inglês; specs e planos em português.
- Rodar tudo a partir de `app/`: `cd app && node --test`.

---

### Task 1: `fontesSugeridas` — a lista de atalhos

**Files:**
- Modify: `app/js/state.js` (inserir logo depois do bloco de Estilo, hoje linhas 84-90)
- Test: `app/test/fontes.test.js` (criar)

**Interfaces:**
- Consumes: nada de tarefas anteriores. Lê apenas o campo `fonte` (string, opcional) de cada objeto música.
- Produces:
  - `export const FONTES_FIXAS = ['CifraClub', 'Songbook']` — array de strings.
  - `export function fontesSugeridas(songs, limit = 8) → string[]` — os dois fixos primeiro, depois as fontes usadas em `songs` ordenadas por contagem (desc) com desempate alfabético, cortado em `limit` no total. Usada pela Task 2 como `fontesSugeridas(S.songs)`.

- [ ] **Step 1: Write the failing test**

Criar `app/test/fontes.test.js`:

```js
// fontes.test.js — os atalhos do campo Fonte no formulário de adicionar/editar.
//
// A lista não é escrita à mão: vem da biblioteca. O que este teste protege é a
// ordem (mais usadas primeiro), a dedupe por grafia (uma música salva com
// "cifraclub" não pode criar um segundo chip) e o corte, que conta os fixos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fontesSugeridas, FONTES_FIXAS } from '../js/state.js';

const song = (fonte) => ({ fonte });

test('biblioteca vazia mostra só os dois atalhos fixos', () => {
  assert.deepEqual(fontesSugeridas([]), ['CifraClub', 'Songbook']);
  assert.deepEqual(FONTES_FIXAS, ['CifraClub', 'Songbook']);
});

test('as fontes usadas vêm depois dos fixos, mais usadas primeiro', () => {
  const songs = [song('Real Book'), song('YouTube'), song('Real Book'), song('Real Book'), song('YouTube')];
  assert.deepEqual(fontesSugeridas(songs), ['CifraClub', 'Songbook', 'Real Book', 'YouTube']);
});

test('empate na contagem desempata em ordem alfabética', () => {
  const songs = [song('YouTube'), song('Real Book'), song('Ouvido')];
  assert.deepEqual(fontesSugeridas(songs), ['CifraClub', 'Songbook', 'Ouvido', 'Real Book']);
});

test('grafia diferente da mesma fonte não vira chip novo', () => {
  const songs = [song('Real Book'), song('real book'), song('REAL BOOK  ')];
  assert.deepEqual(fontesSugeridas(songs), ['CifraClub', 'Songbook', 'Real Book']);
});

test('a primeira grafia encontrada é a que aparece', () => {
  const songs = [song('real book'), song('Real Book')];
  assert.deepEqual(fontesSugeridas(songs), ['CifraClub', 'Songbook', 'real book']);
});

test('uma fonte igual a um fixo não é duplicada, em qualquer caixa', () => {
  const songs = [song('cifraclub'), song('CifraClub'), song(' Songbook ')];
  assert.deepEqual(fontesSugeridas(songs), ['CifraClub', 'Songbook']);
});

test('fonte vazia, só espaço ou ausente é ignorada', () => {
  const songs = [song(''), song('   '), song(undefined), {}, song('Ouvido')];
  assert.deepEqual(fontesSugeridas(songs), ['CifraClub', 'Songbook', 'Ouvido']);
});

test('o corte conta os dois fixos', () => {
  const songs = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(song);
  assert.deepEqual(fontesSugeridas(songs), ['CifraClub', 'Songbook', 'A', 'B', 'C', 'D', 'E', 'F']);
  assert.equal(fontesSugeridas(songs).length, 8);
});

test('o limite é ajustável', () => {
  const songs = [song('Ouvido')];
  assert.deepEqual(fontesSugeridas(songs, 3), ['CifraClub', 'Songbook', 'Ouvido']);
  assert.deepEqual(fontesSugeridas(songs, 2), ['CifraClub', 'Songbook']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && node --test test/fontes.test.js`
Expected: FAIL — `SyntaxError: The requested module '../js/state.js' does not provide an export named 'FONTES_FIXAS'`.

- [ ] **Step 3: Write minimal implementation**

Em `app/js/state.js`, logo depois de `songsOfEstilo` (hoje linha 90) e antes do comentário `// Modos disponíveis de uma música`:

```js
// Fonte da cifra: de onde ela veio. Os atalhos do formulário não são uma lista
// escrita à mão — CifraClub e Songbook são fixos porque são os valores do
// preenchimento automático por tipo de cifra, e o resto vem do que a biblioteca
// já usa. Dedupe por grafia: "cifraclub" e "CifraClub" são a mesma fonte, e a
// primeira grafia encontrada é a que aparece. O registro salvo nunca é reescrito.
export const FONTES_FIXAS = ['CifraClub', 'Songbook'];
export function fontesSugeridas(songs, limit = 8) {
  const chave = (nome) => nome.trim().toLowerCase();
  const fixas = new Set(FONTES_FIXAS.map(chave));
  const usadas = new Map(); // chave → { nome, n }
  for (const s of songs || []) {
    const nome = ((s && s.fonte) || '').trim();
    if (!nome || fixas.has(chave(nome))) continue;
    const jaVista = usadas.get(chave(nome));
    if (jaVista) jaVista.n += 1;
    else usadas.set(chave(nome), { nome, n: 1 });
  }
  const resto = [...usadas.values()]
    .sort((a, b) => b.n - a.n || a.nome.localeCompare(b.nome, 'pt'))
    .map((f) => f.nome);
  return [...FONTES_FIXAS, ...resto].slice(0, limit);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && node --test`
Expected: PASS — os 9 testes novos de `fontes.test.js` e toda a suíte existente verde.

- [ ] **Step 5: Commit**

```bash
git add app/js/state.js app/test/fontes.test.js
git commit -m "feat: derive the chart source shortcuts from the library"
```

---

### Task 2: os chips no formulário

**Files:**
- Modify: `app/js/render/addedit.js:2` (import) e `app/js/render/addedit.js:171-178` (o campo Fonte)
- Modify: `app/css/app.css:510-512` (remover `.fonte-row`)
- Modify: `app/js/i18n/pt.js:171-172` e `app/js/i18n/en.js:171-172` (remover as duas chaves)
- Modify: `app/sw.js:2` (`VERSION`)
- Test: `app/test/i18n.test.js` (existente, não muda) + verificação manual no navegador

**Interfaces:**
- Consumes: `fontesSugeridas(songs, limit = 8)` e `FONTES_FIXAS` da Task 1, exportados por `js/state.js`. Esta task usa só `fontesSugeridas`.
- Produces: nada para tarefas posteriores — é a última.

- [ ] **Step 1: Importar a função no render**

Em `app/js/render/addedit.js`, linha 2, acrescentar `fontesSugeridas` à lista já importada de `../state.js`:

```js
import { S, songById, artistById, upsertArtist, saveSong, songsOfArtist, fontesSugeridas } from '../state.js';
```

- [ ] **Step 2: Trocar os dois botões fixos pelo `.map()`**

Em `app/js/render/addedit.js`, substituir o bloco do campo Fonte (hoje linhas 171-178) por:

```js
        <div class="field">
          <label>${t('addedit.field.source')}</label>
          <div class="chip-row">
            <input type="text" class="input lg" id="f-fonte" placeholder="${t('addedit.field.sourcePlaceholder')}" value="${esc(d.fonte)}">
            ${fontesSugeridas(S.songs).map((nome) => `<button type="button" class="btn-ghost sm ${d.fonte === nome ? 'on' : ''}" data-a="setFonte" data-id="${esc(nome)}">${esc(nome)}</button>`).join('')}
          </div>
        </div>
```

Três coisas mudaram e todas importam: a classe do container virou `chip-row` (a de Estilo, que quebra linha), o rótulo do botão é `esc(nome)` em vez de `t(...)`, e `data-id` também é `esc(nome)` — o nome pode ter aspas ou `<`, e ele entra num atributo HTML.

- [ ] **Step 3: Remover o CSS que não quebra linha**

Em `app/css/app.css`, apagar as três linhas 510-512 (o comentário e as duas regras). `.chip-row`, logo abaixo, continua e é a que passa a valer:

```css
/* fonte no formulário de adicionar/editar */
.fonte-row{display:flex;gap:8px;align-items:center}
.fonte-row .input{flex:1}
```

Conferir que sobrou zero referência: `cd app && grep -rn "fonte-row" .` não pode devolver nada.

- [ ] **Step 4: Remover as duas chaves de i18n órfãs**

As chaves guardam texto idêntico em PT e EN — não traduzem nada, e o rótulo agora é o valor persistido. Apagar de `app/js/i18n/pt.js` (linhas 171-172) **e** de `app/js/i18n/en.js` (linhas 171-172) as duas linhas, iguais nos dois arquivos:

```js
  'addedit.source.cifraclub': 'CifraClub',
  'addedit.source.songbook': 'Songbook',
```

Conferir que sobrou zero referência: `cd app && grep -rn "addedit.source\." .` não pode devolver nada. As chaves `addedit.field.source` e `addedit.field.sourcePlaceholder` **ficam** — são o rótulo e o placeholder do campo, e continuam em uso.

- [ ] **Step 5: Subir a versão do Service Worker**

Em `app/sw.js`, linha 2: `const VERSION = 'somaplay-v20';` → `const VERSION = 'somaplay-v21';`

- [ ] **Step 6: Rodar a suíte e o check de sintaxe**

Run: `cd app && node --test && node --check js/render/addedit.js && node --check js/state.js`
Expected: PASS — em especial `i18n.test.js` (paridade das tabelas) e `shell.test.js` (o `SHELL` continua batendo com o disco; nenhum módulo novo foi criado).

- [ ] **Step 7: Verificar no navegador — é esta etapa que conta**

Run: `cd app && python3 -m http.server 8137` e abrir `http://localhost:8137`. Com o app já instalado, recarregar com o cache desligado (DevTools → Application → *Update on reload*), senão o Service Worker serve o JS antigo.

Conferir, um a um:

1. **Adicionar música** → o campo Fonte mostra CifraClub e Songbook, mais as fontes já usadas na biblioteca.
2. Clicar num chip preenche o campo e acende o chip (fundo âmbar).
3. Digitar `Real Book` à mão e sair do campo: se existir chip com esse nome, ele acende.
4. Salvar uma música com uma fonte nova (ex.: `Tirei de ouvido`), abrir o formulário de novo: virou chip.
5. Trocar o tipo de cifra Imagem/Texto com o campo vazio: continua auto-preenchendo Songbook/CifraClub.
6. Com 8 chips, a linha quebra em duas e **nada vaza para fora do formulário** — conferir estreito (DevTools em largura de tablet, ~800px).
7. Abrir **Chega de Saudade**: o cabeçalho continua `Tom Dm · Songbook`.
8. Trocar PT/EN nas configurações e reabrir o formulário: os chips continuam com o nome da fonte, sem sumir nem virar chave crua.

- [ ] **Step 8: Commit**

```bash
git add app/js/render/addedit.js app/css/app.css app/js/i18n/pt.js app/js/i18n/en.js app/sw.js
git commit -m "feat: show every source already used as a shortcut in the song form"
```

---

## Self-review

**Cobertura do spec:** decisão dos fixos + ordem + limite 8 + dedupe por grafia → Task 1 (implementação e testes). Render com `.map()` → Task 2 Steps 1-2. `.chip-row` e remoção de `.fonte-row` → Step 3. Remoção das duas chaves de i18n → Step 4. Bump do `VERSION` → Step 5. Verificação automática → Task 1 Step 4 e Task 2 Step 6; verificação manual (os 8 itens do spec) → Task 2 Step 7. "O que não muda" (auto-preenchimento, texto livre, formato salvo) está coberto pelos itens 5 e 7 da verificação manual. Sem lacuna.

**Placeholders:** nenhum TBD; todo passo de código traz o código.

**Consistência de tipos:** `fontesSugeridas(songs, limit = 8) → string[]` é definida na Task 1 e chamada na Task 2 como `fontesSugeridas(S.songs)`, com o mesmo nome e a mesma aridade. `FONTES_FIXAS` é exportada na Task 1 e usada só pelo teste — proposital, é o que ancora a asserção da biblioteca vazia.
