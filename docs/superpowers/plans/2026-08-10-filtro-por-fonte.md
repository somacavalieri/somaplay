# Filtro por fonte na lente global — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir filtrar a biblioteca por fonte da cifra (CifraClub, Songbook, …), uma fonte por vez, com a fonte ativa destacada numa pílula com × para limpar.

**Architecture:** A fonte vira o segundo eixo da lente global que já existe. Toda a filtragem passa por `matchesLens()` em `js/state.js`, chamada por Home (Artistas/Músicas/Estilos), tela do artista e tela do estilo — estender essa função propaga o filtro para as cinco telas sem tocar em nenhuma delas. O controle é um botão-camaleão na `.lens`: ícone quando não há filtro, pílula `🏷 Songbook ×` quando há, com um menu suspenso no molde do `.sort-menu`.

**Tech Stack:** ES modules puros, sem build e sem dependências. Testes com `node --test` (Node ≥ 20). Service Worker cache-first.

## Global Constraints

- **Nunca renomear `DB_NAME` em `app/js/db.js`.** Nada neste plano encosta em `db.js`.
- **Nenhum módulo novo sob `app/js/`.** Tudo entra em arquivos existentes. O `SHELL` do `sw.js` fica igual; `VERSION` sobe de `somaplay-v21` para `somaplay-v22` (Task 5).
- **Chave de tradução entra nas DUAS tabelas** (`js/i18n/pt.js` e `js/i18n/en.js`) — `test/i18n.test.js` cobra paridade.
- **Nome de fonte nunca passa por `t()`.** É conteúdo do usuário. Só o sentinela `SEM_FONTE` e os rótulos fixos são traduzidos.
- **`t()` não escapa os parâmetros** ([i18n.js:27-31](../../../app/js/i18n.js#L27-L31)). Todo nome de fonte que vai para o HTML passa por `esc()` no ponto de uso.
- **Sem migração.** Nada muda no formato do registro da música nem no `.somaplay`.
- **Comandos:** `cd app && node --test` (suíte), `cd app && node --check js/<arquivo>.js` (sintaxe), `cd app && python3 -m http.server 8137` (navegador).
- Branch de trabalho: `feat/filtro-por-fonte` (já criada, com o spec commitado).

## Estrutura de arquivos

| Arquivo | Responsabilidade | Task |
|---|---|---|
| `app/js/state.js` | estado (`S.fonteFilter`, `S.fonteMenuOpen`) e regra pura de filtragem | 1, 4 |
| `app/test/fontes.test.js` | testes das funções puras de fonte (arquivo já existe) | 1 |
| `app/js/i18n/pt.js`, `app/js/i18n/en.js` | rótulos fixos do controle | 2 |
| `app/js/icons.js` | `I.tag()` | 2 |
| `app/js/render/home.js` | o controle na barra e os contadores | 3, 4 |
| `app/css/app.css` | `.fonte-wrap`, `.fonte-pill`, `.fonte-menu` | 3 |
| `app/js/main.js` | ações, clique-fora, Esc, fechar ao trocar de aba | 3 |
| `app/sw.js` | `VERSION` | 5 |

---

### Task 1: A regra de filtragem

**Files:**
- Modify: `app/js/state.js` — campos novos em `S` (perto da linha 16), bloco de funções depois de `fontesSugeridas` (linha 113), `matchesLens` (linha 122)
- Test: `app/test/fontes.test.js` (já existe; acrescentar ao final)

**Interfaces:**
- Consumes: `S` e `fonteOf` do próprio módulo.
- Produces:
  - `SEM_FONTE: string` — a constante `'__sem_fonte'`
  - `fonteOf(s: object) => string` — fonte trimada da música, `''` se não tem
  - `fontesDaBiblioteca(songs: object[]) => Array<{ nome: string, n: number }>`
  - `fonteCasa(fonteDaMusica: string, filtro: string|null) => boolean`
  - `matchesFonte(s: object) => boolean`
  - `S.fonteFilter: string|null`, `S.fonteMenuOpen: boolean`

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao final de `app/test/fontes.test.js`. O `song()` helper e os imports de `node:test`/`assert` já estão no topo do arquivo — só a linha de import de `../js/state.js` muda.

Trocar a linha 8 do arquivo, que hoje é:

```js
import { fontesSugeridas, FONTES_FIXAS } from '../js/state.js';
```

por:

```js
import {
  fontesSugeridas, FONTES_FIXAS,
  fontesDaBiblioteca, fonteCasa, fonteOf, SEM_FONTE,
} from '../js/state.js';
```

E acrescentar ao final do arquivo:

```js
// --- filtro por fonte (a lente) -------------------------------------------
// fontesSugeridas alimenta o formulário e crava CifraClub/Songbook mesmo sem
// uso. fontesDaBiblioteca alimenta o filtro e não crava nada: oferecer um
// filtro que não casa com nenhuma música é entregar uma tela vazia de bandeja.

test('biblioteca vazia não oferece nenhuma fonte para filtrar', () => {
  assert.deepEqual(fontesDaBiblioteca([]), []);
});

test('as fontes vêm ordenadas por uso, desempate alfabético', () => {
  const songs = [song('YouTube'), song('Real Book'), song('YouTube'), song('Ouvido')];
  assert.deepEqual(fontesDaBiblioteca(songs), [
    { nome: 'YouTube', n: 2 },
    { nome: 'Ouvido', n: 1 },
    { nome: 'Real Book', n: 1 },
  ]);
});

test('grafias diferentes contam para a mesma fonte, e a primeira aparece', () => {
  const songs = [song('real book'), song('Real Book'), song('REAL BOOK  ')];
  assert.deepEqual(fontesDaBiblioteca(songs), [{ nome: 'real book', n: 3 }]);
});

test('as músicas sem fonte viram um balde no fim da lista', () => {
  const songs = [song(''), song('   '), song(undefined), {}, song('Songbook')];
  assert.deepEqual(fontesDaBiblioteca(songs), [
    { nome: 'Songbook', n: 1 },
    { nome: SEM_FONTE, n: 4 },
  ]);
});

test('sem música sem fonte, o balde não aparece', () => {
  assert.deepEqual(fontesDaBiblioteca([song('Songbook')]), [{ nome: 'Songbook', n: 1 }]);
});

test('filtro nulo passa tudo', () => {
  assert.equal(fonteCasa('Songbook', null), true);
  assert.equal(fonteCasa('', null), true);
});

test('o filtro casa apesar da grafia', () => {
  assert.equal(fonteCasa('Songbook', 'songbook'), true);
  assert.equal(fonteCasa(' songbook ', 'Songbook'), true);
  assert.equal(fonteCasa('CifraClub', 'Songbook'), false);
});

test('o balde sem fonte só casa com quem não tem fonte', () => {
  assert.equal(fonteCasa('', SEM_FONTE), true);
  assert.equal(fonteCasa('   ', SEM_FONTE), true);
  assert.equal(fonteCasa('Songbook', SEM_FONTE), false);
});

test('fonteOf tira o espaço das pontas e tolera música sem o campo', () => {
  assert.equal(fonteOf({ fonte: '  Songbook ' }), 'Songbook');
  assert.equal(fonteOf({}), '');
  assert.equal(fonteOf(null), '');
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && node --test test/fontes.test.js`
Expected: FAIL — `SyntaxError: The requested module '../js/state.js' does not provide an export named 'fontesDaBiblioteca'`.

- [ ] **Step 3: Os campos novos no estado**

Em `app/js/state.js`, dentro do objeto `S`, logo depois da linha `modeFilter: [],`:

```js
  fonteFilter: null,       // lente por fonte: a grafia exibida | SEM_FONTE | null
  fonteMenuOpen: false,
```

- [ ] **Step 4: As funções**

Em `app/js/state.js`, logo depois do fecho de `fontesSugeridas` (hoje linha 113) e **antes** de `modesOf`:

```js
// Filtro por fonte — o segundo eixo da lente global. O sentinela agrupa as
// músicas sem fonte; ele nunca colide com uma fonte de verdade, porque nome de
// fonte é o que o usuário digitou e passa por trim().
export const SEM_FONTE = '__sem_fonte';
export function fonteOf(s) { return ((s && s.fonte) || '').trim(); }

// As fontes que a biblioteca realmente usa, mais usadas primeiro, desempate
// alfabético — determinístico, e portanto testável. Sem fontes fixas, ao
// contrário de fontesSugeridas: um filtro que não casa com nada só entrega uma
// tela vazia. Recebe songs por parâmetro para o teste não tocar em S.
export function fontesDaBiblioteca(songs) {
  const chave = (nome) => nome.toLowerCase();
  const usadas = new Map(); // chave → { nome, n }
  let semFonte = 0;
  for (const s of songs || []) {
    const nome = fonteOf(s);
    if (!nome) { semFonte++; continue; }
    const jaVista = usadas.get(chave(nome));
    if (jaVista) jaVista.n += 1;
    else usadas.set(chave(nome), { nome, n: 1 });
  }
  const out = [...usadas.values()]
    .sort((a, b) => b.n - a.n || a.nome.localeCompare(b.nome, 'pt'));
  if (semFonte) out.push({ nome: SEM_FONTE, n: semFonte });
  return out;
}

// Pura: os dois lados vêm por parâmetro. Filtro nulo = sem filtro.
export function fonteCasa(fonteDaMusica, filtro) {
  if (!filtro) return true;
  const nome = (fonteDaMusica || '').trim();
  if (filtro === SEM_FONTE) return !nome;
  return nome.toLowerCase() === filtro.trim().toLowerCase();
}
export function matchesFonte(s) { return fonteCasa(fonteOf(s), S.fonteFilter); }
```

- [ ] **Step 5: Estender a lente**

Em `app/js/state.js`, substituir `matchesLens` (hoje linhas 122-126) por:

```js
// A lente global tem dois eixos: modo (T2/T3) e fonte. Toda tela que lista
// música passa por aqui — Home, tela do artista, tela do estilo.
export function matchesLens(s) {
  if (!matchesFonte(s)) return false;
  if (!S.modeFilter.length) return true;
  const m = modesOf(s);
  return S.modeFilter.every((f) => m.includes(f));
}
```

- [ ] **Step 6: Rodar a suíte inteira**

Run: `cd app && node --test`
Expected: PASS em tudo, inclusive os testes antigos de `fontesSugeridas` (que não foi tocada).

- [ ] **Step 7: Commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add app/js/state.js app/test/fontes.test.js
git commit -m "feat: filtrar a lente global por fonte da cifra

matchesLens passa a ter dois eixos, modo e fonte. As cinco telas que
já chamam essa função herdam o filtro sem mudança."
```

---

### Task 2: Rótulos e ícone

**Files:**
- Modify: `app/js/i18n/pt.js` — depois de `'home.lens.disabledHint'`
- Modify: `app/js/i18n/en.js` — depois de `'home.lens.disabledHint'`
- Modify: `app/js/icons.js` — depois de `funnel` (linha 55)
- Test: `app/test/i18n.test.js` (existente, sem edição — é ele que cobra a paridade)

**Interfaces:**
- Produces: as chaves `home.fonte.hint`, `home.fonte.all`, `home.fonte.none`, `home.fonte.clear` nas duas tabelas, e `I.tag(w?: number) => string` (SVG com `stroke="currentColor"`).

- [ ] **Step 1: Acrescentar as chaves em pt.js**

Em `app/js/i18n/pt.js`, logo depois da linha `'home.lens.disabledHint': ...`:

```js
  'home.fonte.hint': 'Filtrar por fonte',
  'home.fonte.all': 'Todas as fontes',
  'home.fonte.none': 'Sem fonte',
  'home.fonte.clear': 'Limpar filtro de fonte',
```

- [ ] **Step 2: Rodar o teste de paridade e ver falhar**

Run: `cd app && node --test test/i18n.test.js`
Expected: FAIL — as quatro chaves existem em PT e não em EN.

- [ ] **Step 3: Acrescentar as chaves em en.js**

Em `app/js/i18n/en.js`, logo depois da linha `'home.lens.disabledHint': ...`:

```js
  'home.fonte.hint': 'Filter by source',
  'home.fonte.all': 'All sources',
  'home.fonte.none': 'No source',
  'home.fonte.clear': 'Clear source filter',
```

- [ ] **Step 4: Rodar o teste de paridade**

Run: `cd app && node --test test/i18n.test.js`
Expected: PASS.

- [ ] **Step 5: O ícone de etiqueta**

Em `app/js/icons.js`, logo depois da linha do `funnel`:

```js
  tag: (w = 17) => stroke(w, '<path d="M20.6 13.4 12 22l-9-9V3h10z"/><circle cx="7.6" cy="7.6" r="1.3"/>'),
```

Usa o helper `stroke()`, ou seja `stroke="currentColor"` — e **não** o `#9A9AA5` cravado do `funnel`. O ícone vive dentro da pílula, que troca de cor quando o filtro está ativo; com a cor cravada ele ficaria cinza sobre âmbar.

- [ ] **Step 6: Conferir sintaxe**

Run: `cd app && node --check js/icons.js && node --check js/i18n/pt.js && node --check js/i18n/en.js && node --test`
Expected: sem saída dos `--check`; suíte PASS.

- [ ] **Step 7: Commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add app/js/i18n/pt.js app/js/i18n/en.js app/js/icons.js
git commit -m "feat: rótulos e ícone do filtro por fonte"
```

---

### Task 3: O controle na barra

**Files:**
- Modify: `app/js/render/home.js` — import (linha 2), função nova, `.lens` dentro de `renderHome` (linhas 179-181)
- Modify: `app/css/app.css` — depois do bloco `.chip.t3.on` (linha 117)
- Modify: `app/js/main.js` — `goHome` (211), `setTab` (225), ações novas perto de `setSort` (233), clique-fora (718), Esc (770-772)

**Interfaces:**
- Consumes: `fontesDaBiblioteca`, `SEM_FONTE`, `S.fonteFilter`, `S.fonteMenuOpen` (Task 1); `I.tag`, `home.fonte.*` (Task 2).
- Produces: as ações `toggleFonteMenu`, `setFonteFilter`, `clearFonte`; as classes `.fonte-wrap`, `.fonte-pill`, `.fonte-menu`.

> **Por que `setFonteFilter` e não `setFonte`:** `setFonte` já existe em [main.js:471](../../../app/js/main.js#L471) e é a ação dos chips de atalho do formulário de adicionar/editar. O dispatcher é um objeto único — reusar o nome sequestraria o formulário.

- [ ] **Step 1: O import em home.js**

Em `app/js/render/home.js`, trocar a linha 2 inteira por:

```js
import { S, songsOfArtist, modesOf, matchesLens, artistName, favList, listById, estiloOf, SEM_ESTILO, fontesDaBiblioteca, SEM_FONTE } from '../state.js';
```

- [ ] **Step 2: A função do controle**

Em `app/js/render/home.js`, acrescentar logo antes de `export function renderHome()`:

```js
// O controle de fonte é um camaleão: ícone quando não filtra nada, pílula com o
// nome e um × quando filtra. O rótulo e o × são botões IRMÃOS, não aninhados —
// a delegação de clique usa closest('[data-a]'), e um <button> dentro de outro
// entregaria o clique errado.
function fonteControl() {
  const ativa = S.fonteFilter;
  const rotuloDe = (nome) => (nome === SEM_FONTE ? t('home.fonte.none') : esc(nome));
  const itens = fontesDaBiblioteca(S.songs);

  const menu = S.fonteMenuOpen ? `<div class="fonte-menu">
      <button class="${ativa ? '' : 'on'}" data-a="clearFonte">
        <span class="nm">${t('home.fonte.all')}</span>${ativa ? '' : I.check(16, 2.5)}</button>
      ${itens.map(({ nome, n }) => {
        const on = !!ativa && nome.toLowerCase() === ativa.toLowerCase();
        return `<button class="${on ? 'on' : ''}" data-a="setFonteFilter" data-id="${esc(nome)}">
          <span class="nm">${rotuloDe(nome)} <em>· ${n}</em></span>${on ? I.check(16, 2.5) : ''}</button>`;
      }).join('')}
    </div>` : '';

  const gatilho = ativa
    ? `<div class="fonte-pill">
        <button class="lbl" data-a="toggleFonteMenu" title="${t('home.fonte.hint')}">${I.tag()}<span>${rotuloDe(ativa)}</span></button>
        <button class="x" data-a="clearFonte" title="${t('home.fonte.clear')}">${I.close(15)}</button>
      </div>`
    : `<button class="chip fonte" data-a="toggleFonteMenu" title="${t('home.fonte.hint')}">${I.tag()}</button>`;

  return `<div class="fonte-wrap">${gatilho}${menu}</div>`;
}
```

O `data-id` carrega a grafia salva ou o sentinela `__sem_fonte` — nunca um rótulo traduzido, senão uma biblioteca filtrada em inglês divergiria de uma em português.

- [ ] **Step 3: Encaixar na lente**

Em `app/js/render/home.js`, dentro de `renderHome`, trocar

```js
      <div class="lens ${isL ? 'off' : ''}" title="${isL ? t('home.lens.disabledHint') : t('home.lens.filterHint')}">
        ${I.funnel()}${chips}
      </div>
```

por

```js
      <div class="lens ${isL ? 'off' : ''}" title="${isL ? t('home.lens.disabledHint') : t('home.lens.filterHint')}">
        ${I.funnel()}${fonteControl()}${chips}
      </div>
```

Na aba Listas a `.lens` inteira já recebe a classe `off`, que é `opacity:.32;pointer-events:none` — a pílula herda isso sem código novo.

- [ ] **Step 4: O CSS**

Em `app/css/app.css`, logo depois da linha `.chip.t3.on{...}`:

```css
.fonte-wrap{position:relative;display:flex}
.chip.fonte{background:var(--surface2);color:var(--muted);border-color:var(--border)}
.fonte-pill{display:flex;align-items:center;height:44px;border-radius:999px;background:var(--accent);color:var(--bg);border:1px solid var(--accent);overflow:hidden;max-width:min(46vw,260px)}
.fonte-pill button{height:100%;border:none;background:transparent;color:inherit;cursor:pointer;display:flex;align-items:center;min-width:0}
.fonte-pill .lbl{gap:8px;padding:0 6px 0 14px}
.fonte-pill .lbl span{font-family:var(--f-title);font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fonte-pill .x{padding:0 12px 0 6px;opacity:.75}
.fonte-pill .x:hover{opacity:1}
.fonte-menu{position:absolute;left:0;top:50px;width:252px;max-height:60vh;overflow-y:auto;background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:6px;z-index:30;box-shadow:var(--shadow)}
.fonte-menu button{width:100%;text-align:left;min-height:44px;padding:0 14px;border:none;border-radius:9px;background:transparent;color:var(--text);font-size:14px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:10px}
.fonte-menu button.on{background:var(--accent-tint);color:var(--accent);font-weight:700}
.fonte-menu .nm{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fonte-menu .nm em{font-style:normal;color:var(--muted)}
.fonte-menu button.on .nm em{color:inherit;opacity:.7}
```

A pílula usa `--accent` (âmbar), que não colide com o teal do chip T2 nem com o dourado do T3. 44px de altura é a altura do `.chip`, para a barra não desalinhar.

- [ ] **Step 5: As ações**

Em `app/js/main.js`, logo depois da linha do `setSort`:

```js
  toggleFonteMenu() { S.fonteMenuOpen = !S.fonteMenuOpen; update(); },
  setFonteFilter(d) { S.fonteFilter = d.id; S.fonteMenuOpen = false; update(); },
  clearFonte() { S.fonteFilter = null; S.fonteMenuOpen = false; update(); },
```

- [ ] **Step 6: Fechar o menu nos quatro caminhos**

Em `app/js/main.js`, quatro edições pontuais.

`goHome` (hoje linha 211) — acrescentar o reset:

```js
  goHome() { if (S.screen === 'play') leavePlay(); S.screen = 'home'; S.sortMenuOpen = false; S.fonteMenuOpen = false; update(); },
```

`setTab` (hoje linha 225):

```js
  setTab(d) { S.tab = d.id; S.sortMenuOpen = false; S.fonteMenuOpen = false; update(); },
```

Clique fora — logo depois da linha que trata o `S.sortMenuOpen` (hoje linha 718):

```js
  if (S.fonteMenuOpen && !e.target.closest('.fonte-wrap')) { S.fonteMenuOpen = false; update(); }
```

Esc — trocar o `else if` dos menus (hoje linhas 770-773) por:

```js
    else if (S.imgMenuOpen || S.sortMenuOpen || S.listMenuOpen || S.fonteMenuOpen) {
      S.imgMenuOpen = S.sortMenuOpen = S.listMenuOpen = S.fonteMenuOpen = false;
      update();
    }
```

- [ ] **Step 7: Sintaxe e suíte**

Run: `cd app && node --check js/render/home.js && node --check js/main.js && node --test`
Expected: sem saída dos `--check`; suíte PASS.

- [ ] **Step 8: Verificar no navegador**

Run: `cd app && python3 -m http.server 8137` e abrir http://localhost:8137

Conferir, nesta ordem:

1. Aba Artistas: o ícone de etiqueta aparece entre o funil e os chips T2/T3.
2. Clicar nele abre o menu com "Todas as fontes" marcada e as fontes com contagem.
3. Escolher Songbook: o menu fecha, o ícone vira a pílula âmbar `Songbook ×`, e a lista de artistas encolhe.
4. Reabrir o menu pelo nome na pílula: Songbook está marcada.
5. Clicar no ×: volta tudo.
6. Fechar o menu clicando fora, com Esc, e trocando de aba.

- [ ] **Step 9: Commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add app/js/render/home.js app/css/app.css app/js/main.js
git commit -m "feat: controle de filtro por fonte na barra da lente

Ícone quando não filtra, pílula com o nome e × quando filtra. O menu
lista só as fontes que a biblioteca usa, com a contagem de cada uma."
```

---

### Task 4: Os contadores citam o filtro

**Files:**
- Modify: `app/js/state.js` — uma função nova depois de `matchesLens`
- Modify: `app/js/render/home.js` — `artistCards` (linhas 24-26) e `songsTab` (linhas 88-89)

**Interfaces:**
- Consumes: `S.modeFilter`, `S.fonteFilter`, `SEM_FONTE` (Task 1); `home.fonte.none` (Task 2).
- Produces: `lensAtiva() => boolean` em `state.js`; `filtroAtivoLabel() => string` (texto puro, **não** escapado) em `home.js`.

> **Por quê:** hoje os dois rótulos decidem se mencionam filtro olhando só para `S.modeFilter.length`. Sem esta task, um artista de 12 músicas mostraria "3 músicas" com o filtro de fonte ligado e nenhuma pista do motivo.

- [ ] **Step 1: `lensAtiva` em state.js**

Em `app/js/state.js`, logo depois de `matchesLens`:

```js
// Há algum eixo da lente ligado? Os contadores usam isto para decidir se
// explicam o recorte.
export function lensAtiva() { return S.modeFilter.length > 0 || S.fonteFilter !== null; }
```

- [ ] **Step 2: O import e o rótulo em home.js**

Em `app/js/render/home.js`, acrescentar `lensAtiva` ao import da linha 2 (que a Task 3 já reescreveu):

```js
import { S, songsOfArtist, modesOf, matchesLens, artistName, favList, listById, estiloOf, SEM_ESTILO, fontesDaBiblioteca, SEM_FONTE, lensAtiva } from '../state.js';
```

E acrescentar, logo antes de `function artistCards()`:

```js
// O que está recortando a biblioteca agora, em texto puro. Quem imprime no HTML
// escapa: o nome da fonte é conteúdo do usuário e t() não escapa parâmetro.
function filtroAtivoLabel() {
  const partes = S.modeFilter.slice();
  if (S.fonteFilter) partes.push(S.fonteFilter === SEM_FONTE ? t('home.fonte.none') : S.fonteFilter);
  return partes.join(' · ');
}
```

- [ ] **Step 3: O rótulo do card de artista**

Em `app/js/render/home.js`, dentro de `artistCards`, trocar

```js
    const label = S.modeFilter.length
      ? `${matching.length} ${matching.length === 1 ? t('common.song') : t('common.songs')} · ${S.modeFilter.join('/')}`
      : `${songs.length} ${songs.length === 1 ? t('common.song') : t('common.songs')}`;
```

por

```js
    const label = lensAtiva()
      ? `${matching.length} ${matching.length === 1 ? t('common.song') : t('common.songs')} · ${esc(filtroAtivoLabel())}`
      : `${songs.length} ${songs.length === 1 ? t('common.song') : t('common.songs')}`;
```

- [ ] **Step 4: O resumo da aba Músicas**

Em `app/js/render/home.js`, dentro de `songsTab`, trocar

```js
  const count = t('home.songs.summary', { shown: flat.length, total: all.length, sort: sortLabels[S.sort] })
    + (S.modeFilter.length ? t('home.songs.filterSuffix', { filter: S.modeFilter.join(', ') }) : '');
```

por

```js
  const count = t('home.songs.summary', { shown: flat.length, total: all.length, sort: sortLabels[S.sort] })
    + (lensAtiva() ? t('home.songs.filterSuffix', { filter: esc(filtroAtivoLabel()) }) : '');
```

- [ ] **Step 5: Sintaxe e suíte**

Run: `cd app && node --check js/state.js && node --check js/render/home.js && node --test`
Expected: sem saída dos `--check`; suíte PASS.

- [ ] **Step 6: Verificar no navegador**

Com o servidor de pé (http://localhost:8137):

1. Aba Músicas sem filtro: o resumo não menciona filtro.
2. Filtrar por Songbook: o resumo vira "N de M músicas · ordenado por … · filtro: Songbook".
3. Ligar também o chip T2: o resumo cita "T2 · Songbook".
4. Aba Artistas com o filtro ligado: os cards mostram a contagem recortada e o nome do filtro.
5. Filtrar por "Sem fonte": o rótulo mostra "Sem fonte" traduzido, não `__sem_fonte`.

- [ ] **Step 7: Commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add app/js/state.js app/js/render/home.js
git commit -m "feat: contadores explicam o recorte da fonte

Sem isto, um artista de 12 músicas mostra 3 e não diz por quê."
```

---

### Task 5: Entregar aos clientes instalados

**Files:**
- Modify: `app/sw.js:2` — `VERSION`
- Test: `app/test/shell.test.js` (existente, sem edição)

**Interfaces:**
- Consumes: nada. Nenhum módulo novo foi criado, então o `SHELL` não muda.

> **Por quê:** o Service Worker é cache-first. Sem subir o `VERSION`, quem já instalou o app continua rodando o JS antigo e nunca vê o filtro.

- [ ] **Step 1: Subir a versão**

Em `app/sw.js`, linha 2, trocar

```js
const VERSION = 'somaplay-v21';
```

por

```js
const VERSION = 'somaplay-v22';
```

- [ ] **Step 2: Rodar a suíte inteira**

Run: `cd app && node --test`
Expected: PASS. O `shell.test.js` confere que todo módulo em disco está no `SHELL`, que todo caminho do `SHELL` existe, e que o `VERSION` segue o formato `somaplay-vN`.

- [ ] **Step 3: Verificação manual final**

Com o servidor de pé (http://localhost:8137), o roteiro completo do spec:

1. **Artistas:** filtrar por Songbook some com os artistas sem nenhuma música do songbook.
2. **Músicas:** a lista recorta; combinar com T2 e com a busca ao mesmo tempo.
3. **Estilos:** os cards recortam; entrar num estilo mantém o recorte.
4. **Tela do artista:** entrar com o filtro ligado mantém o recorte; voltar preserva o filtro.
5. **Listas:** a pílula fica esmaecida e não responde ao toque; abrir uma lista mostra todas as músicas dela, filtro ou não.
6. **PT/EN:** com o filtro ligado, trocar o idioma nas Configurações — "Todas as fontes"/"All sources" traduz, "Songbook" não.
7. **Tablet (ou janela estreita ~800px):** a `.lens` quebra para a linha inteira, a pílula não vaza da barra, o nome longo corta com reticências, e o × dá para acertar com o dedo.
8. **Tema claro:** a pílula âmbar continua legível.

- [ ] **Step 4: Commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add app/sw.js
git commit -m "chore: sobe o Service Worker para v22

Cache-first: sem isto, quem já instalou não recebe o filtro por fonte."
```
