# Categorização por estilo musical — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nova aba **Estilos** (entre Músicas e Listas) que agrupa as músicas por estilo musical, + campo `estilo` no cadastro.

**Architecture:** `song.estilo` (string, um por música). A aba Estilos espelha a aba Artistas: `estiloCards()` (em home.js) lista um card por estilo → toca → `renderEstilo()` (novo, espelha `renderArtist`) lista as músicas do estilo. O campo no add/edit espelha o campo Fonte. Tudo respeita a lente de modo (menos Listas).

**Tech Stack:** JavaScript vanilla (ES modules, sem build). Sem harness de DOM → verificação por `node --check` (sintaxe) + conferência manual no navegador (padrão do projeto).

## Global Constraints
- **Sem toolchain de build.** ES modules estáticos.
- **Português** em código/UI/comentários.
- **`song.estilo`**: string, **um estilo por música**. Distinto de `song.fonte` (origem) e `cifra.fonte` (formato).
- Música sem estilo → grupo **`Sem estilo`** (constante `SEM_ESTILO`).
- Estilos **respeita a lente de modo** (como Artistas/Músicas). Só **Listas** ignora.
- **Bumpar `sw.js` VERSION** a cada deploy com mudança de JS de shell.
- Rodar: `cd app && python3 -m http.server 8137`.

---

## File Structure
- **Modify** `app/js/state.js` — `S.estiloId`; helpers `SEM_ESTILO`, `estiloOf()`, `songsOfEstilo()`.
- **Modify** `app/js/render/home.js` — `estiloCards()`; 4º botão de aba; dispatch e subtítulo.
- **Create** `app/js/render/estilo.js` — `renderEstilo()` (tela do estilo).
- **Modify** `app/js/main.js` — import + rota `estilo`; ações `openEstilo`, `setEstilo`; `goBack` trata `estilo`.
- **Modify** `app/js/render/addedit.js` — campo Estilo + draft + snapshot no save.
- **Modify** `app/css/app.css` — `.chip-row` (linha de chips que quebra).
- **Modify** `app/js/samples.js` — `estilo` nos exemplos.
- **Modify** `app/sw.js` — bump de versão.
- **Modify** `docs/superpowers/specs/2026-06-25-soma-play-design.md` — §5 modelo, §6 navegação.

---

### Task 1: Modelo + helpers de estilo (state.js)

**Files:** Modify `app/js/state.js`

**Interfaces:**
- Produces: `SEM_ESTILO` (string), `estiloOf(song): string`, `songsOfEstilo(estilo): Song[]`, `S.estiloId: string|null`.

- [ ] **Step 1: Adicionar `estiloId` ao estado**

Em `app/js/state.js`, na seção de navegação do objeto `S`, após `artistId: null,` (L14), adicionar:
```js
  estiloId: null,          // estilo aberto (a tela do estilo usa o nome como chave)
```
E no comentário da linha `tab: 'artists',`, trocar `// artists | songs | lists` por `// artists | songs | estilos | lists`.

- [ ] **Step 2: Adicionar os helpers**

Em `app/js/state.js`, junto às funções auxiliares exportadas (perto de `songsOfArtist`), adicionar:
```js
export const SEM_ESTILO = 'Sem estilo';
export function estiloOf(s) { return (s && s.estilo && s.estilo.trim()) || SEM_ESTILO; }
export function songsOfEstilo(estilo) { return S.songs.filter((s) => estiloOf(s) === estilo); }
```

- [ ] **Step 3: Verificar sintaxe**

Run: `cd app && node --check js/state.js`
Expected: sem erro.

- [ ] **Step 4: Commit**
```bash
git add app/js/state.js
git commit -m "feat(estilo): campo song.estilo + helpers (estiloOf, songsOfEstilo)"
```

---

### Task 2: Aba Estilos (home.js)

**Files:** Modify `app/js/render/home.js`

**Interfaces:**
- Consumes: `estiloOf`, `songsOfEstilo`, `SEM_ESTILO`, `matchesLens`, `artistName` (state.js).
- Produces: aba `estilos` renderizando `estiloCards()`; card com `data-a="openEstilo" data-id="<nome do estilo>"`.

- [ ] **Step 1: Importar os helpers**

No topo de `app/js/render/home.js`, ampliar o import de `../state.js` para incluir `estiloOf, songsOfEstilo, SEM_ESTILO`:
```js
import { S, songsOfArtist, modesOf, matchesLens, artistName, favList, listById, estiloOf, songsOfEstilo, SEM_ESTILO } from '../state.js';
```

- [ ] **Step 2: Escrever `estiloCards()`**

Adicionar após `artistCards()` (antes de `songRow`):
```js
function estiloCards() {
  const q = S.query.trim().toLowerCase();
  const groups = {};
  S.songs.forEach((s) => {
    if (!matchesLens(s)) return;
    const e = estiloOf(s);
    (groups[e] || (groups[e] = [])).push(s);
  });
  let names = Object.keys(groups);
  if (q) names = names.filter((e) => e.toLowerCase().includes(q) || groups[e].some((s) => s.title.toLowerCase().includes(q) || artistName(s).toLowerCase().includes(q)));
  names.sort((a, b) => ((a === SEM_ESTILO) - (b === SEM_ESTILO)) || a.localeCompare(b, 'pt'));
  if (!names.length) {
    return `<div class="empty"><div class="t">${S.songs.length ? 'Nenhum estilo neste modo' : 'Biblioteca vazia'}</div>
      <div class="s">${S.songs.length ? 'Nenhuma música na categoria selecionada' : 'Adicione músicas em Configurações → Adicionar música'}</div></div>`;
  }
  return `<div class="artist-grid">` + names.map((e) => {
    const n = groups[e].length;
    return `<div class="card-artist" data-a="openEstilo" data-id="${esc(e)}">
      <div class="avatar teal">${esc(e[0] || '?')}</div>
      <div><div class="name">${esc(e)}</div><div class="count">${n} ${n === 1 ? 'música' : 'músicas'}</div></div>
    </div>`;
  }).join('') + `</div>`;
}
```

- [ ] **Step 3: Dispatch da aba**

Em `homeResults()`, trocar:
```js
export function homeResults() {
  if (S.tab === 'artists') return artistCards();
  if (S.tab === 'songs') return songsTab();
  return listsTab();
}
```
por:
```js
export function homeResults() {
  if (S.tab === 'artists') return artistCards();
  if (S.tab === 'songs') return songsTab();
  if (S.tab === 'estilos') return estiloCards();
  return listsTab();
}
```

- [ ] **Step 4: Botão da aba + subtítulo**

Em `renderHome`, no `.segtab`, inserir o botão Estilos **entre** Músicas e Listas:
```js
        <button class="${S.tab === 'songs' ? 'on' : ''}" data-a="setTab" data-id="songs">${I.music()}Músicas</button>
        <button class="${S.tab === 'estilos' ? 'on' : ''}" data-a="setTab" data-id="estilos">${I.disc(18)}Estilos</button>
        <button class="${S.tab === 'lists' ? 'on' : ''}" data-a="setTab" data-id="lists">${I.listIcon()}Listas</button>
```
E no cálculo de `tabsub`, trocar:
```js
    : (S.tab === 'artists' ? `${S.artists.length} artistas na biblioteca` : `${S.songs.length} músicas na biblioteca`);
```
por:
```js
    : (S.tab === 'artists' ? `${S.artists.length} artistas na biblioteca`
      : S.tab === 'estilos' ? 'músicas por estilo'
      : `${S.songs.length} músicas na biblioteca`);
```
> `I.disc` já existe em `icons.js` (usado no add/edit). Se preferir outro ícone, use `I.music()`.

- [ ] **Step 5: Verificar sintaxe**

Run: `cd app && node --check js/render/home.js`
Expected: sem erro.

- [ ] **Step 6: Commit**
```bash
git add app/js/render/home.js
git commit -m "feat(estilo): aba Estilos (cards por estilo) na home"
```

---

### Task 3: Tela do estilo (estilo.js + rota + ações)

**Files:** Create `app/js/render/estilo.js`; Modify `app/js/main.js`

**Interfaces:**
- Consumes: `songsOfEstilo`, `matchesLens` (state.js); `songRow`, `offlineBadge` (home.js).
- Produces: `renderEstilo()`; ações `openEstilo`, e `goBack` tratando `backTo === 'estilo'`.

- [ ] **Step 1: Criar `app/js/render/estilo.js`**
```js
// render/estilo.js — tela do estilo: lista de músicas (respeitando a lente)
import { S, songsOfEstilo, matchesLens } from '../state.js';
import { I, esc } from '../icons.js';
import { songRow, offlineBadge } from './home.js';

export function renderEstilo() {
  const e = S.estiloId;
  if (!e) { S.screen = 'home'; return '<div></div>'; }
  const songs = songsOfEstilo(e).filter(matchesLens);
  return `<div class="screen">
    <div class="topbar">
      <button class="btn-icon" data-a="goHome" title="Voltar">${I.back()}</button>
      <div class="avatar md teal">${esc(e[0] || '?')}</div>
      <div style="flex:1;min-width:0">
        <div class="page-title" style="line-height:1.1">${esc(e)}</div>
        <div style="color:var(--muted);font-size:13px;margin-top:3px">${songs.length} ${songs.length === 1 ? 'música' : 'músicas'} · toque para tocar</div>
      </div>
      ${offlineBadge}
    </div>
    <div class="content-scroll tight">
      <div class="rows" style="max-width:840px">
        ${songs.length
          ? songs.map((s) => songRow(s, { showArtist: true, from: 'estilo' })).join('')
          : '<div class="empty"><div class="t">Nada neste modo</div><div class="s">Nenhuma música deste estilo na categoria selecionada</div></div>'}
      </div>
    </div>
  </div>`;
}
```

- [ ] **Step 2: Registrar a rota em `main.js`**

No import de telas, adicionar:
```js
import { renderEstilo } from './render/estilo.js';
```
Em `update()`, após a linha `else if (scr === 'artist') html = renderArtist();`, adicionar:
```js
  else if (scr === 'estilo') html = renderEstilo();
```

- [ ] **Step 3: Ação `openEstilo` + back**

No objeto `actions`, junto de `openArtist`, adicionar:
```js
  openEstilo(d) { S.estiloId = d.id; S.screen = 'estilo'; update(); },
```
E em `goBack()`, adicionar o caso do estilo — trocar:
```js
    if (S.backTo === 'artist') S.screen = 'artist';
    else if (S.backTo === 'list') S.screen = 'list';
    else { S.screen = 'home'; }
```
por:
```js
    if (S.backTo === 'artist') S.screen = 'artist';
    else if (S.backTo === 'estilo') S.screen = 'estilo';
    else if (S.backTo === 'list') S.screen = 'list';
    else { S.screen = 'home'; }
```
> Confirmar que `openSongAction(id, from)` grava `S.backTo = from` (é o que faz o fluxo do artista funcionar). Se sim, `from: 'estilo'` no `songRow` já basta para o voltar da tela de toque cair na tela do estilo.

- [ ] **Step 4: Verificar sintaxe**

Run: `cd app && node --check js/render/estilo.js && node --check js/main.js`
Expected: sem erro.

- [ ] **Step 5: Verificação manual (aba + tela)**

`cd app && python3 -m http.server 8137` → abrir. (Se preciso, Importar exemplos.)
1. A aba **Estilos** aparece entre Músicas e Listas.
2. Mostra cards por estilo com contagem; tocar num estilo abre a tela listando as músicas dele.
3. Abrir uma música pela tela do estilo e **Voltar** retorna à tela do estilo.

- [ ] **Step 6: Commit**
```bash
git add app/js/render/estilo.js app/js/main.js
git commit -m "feat(estilo): tela do estilo + rota e navegação"
```

---

### Task 4: Campo Estilo no add/edit

**Files:** Modify `app/js/render/addedit.js`, `app/js/main.js`, `app/css/app.css`

**Interfaces:**
- Produces: `d.estilo` no draft; `song.estilo` gravado no `commitDraft`; ação `setEstilo`.

- [ ] **Step 1: Draft**

Em `newDraft` (addedit.js), no ramo da música existente, após `fonte: song.fonte || '',` adicionar:
```js
      estilo: song.estilo || '',
```
E no `return` do rascunho novo, na linha que tem `fonte: '',`, adicionar `estilo: ''`:
```js
    title: '', tom: '', fonte: '', estilo: '', cifraFonte: 'imagem',
```

- [ ] **Step 2: Campo no formulário**

Logo após o `<div class="field">` do campo **Fonte** (o que tem `id="f-fonte"`), inserir:
```html
        <div class="field">
          <label>Estilo musical</label>
          <div class="chip-row">
            <input type="text" class="input lg" id="f-estilo" placeholder="Ex.: Samba" value="${esc(d.estilo)}">
            ${['MPB', 'Samba', 'Bossa Nova', 'Choro', 'Forró', 'Rock', 'Pop', 'Gospel', 'Jazz', 'Soul'].map((g) => `<button type="button" class="btn-ghost sm ${d.estilo === g ? 'on' : ''}" data-a="setEstilo" data-id="${g}">${g}</button>`).join('')}
          </div>
        </div>
```

- [ ] **Step 3: Sync + save**

Em `syncDraftFromDOM`, após a linha do `f-fonte`, adicionar:
```js
  if (g('f-estilo')) d.estilo = g('f-estilo').value.trim();
```
Em `commitDraft`, no objeto `song`, após a linha `fonte: ...`, adicionar:
```js
    estilo: d.estilo ? d.estilo.trim() : '',
```

- [ ] **Step 4: Ação `setEstilo` (main.js)**

Junto de `setFonte`, adicionar:
```js
  setEstilo(d) { syncDraftFromDOM(); S.draft.estilo = d.id; update(); },
```

- [ ] **Step 5: CSS `.chip-row`**

Adicionar ao fim de `app/css/app.css`:
```css
.chip-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.chip-row .input{flex:1 1 200px}
```

- [ ] **Step 6: Verificar sintaxe + manual**

Run: `cd app && node --check js/render/addedit.js && node --check js/main.js`
Manual: Adicionar/editar música → o campo **Estilo musical** aparece com os chips; clicar num chip preenche; salvar e reabrir mantém; a música aparece sob esse estilo na aba Estilos.

- [ ] **Step 7: Commit**
```bash
git add app/js/render/addedit.js app/js/main.js app/css/app.css
git commit -m "feat(estilo): campo Estilo no add/edit (com chips)"
```

---

### Task 5: Exemplos + bump do Service Worker

**Files:** Modify `app/js/samples.js`, `app/sw.js`

- [ ] **Step 1: Estilo nos exemplos**

Em `app/js/samples.js`, acrescentar `estilo: '<X>'` (logo após `fonte: ...` ou `favorita: false`) em cada `saveSong`:
- Paralelas → `estilo: 'MPB'`
- Andança → `estilo: 'Samba'`
- Groove de teste → (não adicionar; fica sem estilo)
- As Pastorinhas → `estilo: 'Samba'`
- Oxum → `estilo: 'MPB'`
- Queremos Saber → `estilo: 'MPB'`
- Disfarça e Chora → `estilo: 'Samba'`
- Me Dê Motivo → `estilo: 'Soul'`

Exemplo (Paralelas): trocar
```js
        id: uid(), artistId: fagner.id, title: 'Paralelas', tom: 'G', fonte: 'Songbook', favorita: false,
```
por
```js
        id: uid(), artistId: fagner.id, title: 'Paralelas', tom: 'G', fonte: 'Songbook', estilo: 'MPB', favorita: false,
```
(análogo para os demais).

- [ ] **Step 2: Bump do SW**

Em `app/sw.js`, trocar `const VERSION = 'somaplay-v5';` por `const VERSION = 'somaplay-v6';`.

- [ ] **Step 3: Verificar sintaxe**

Run: `cd app && node --check js/samples.js && node --test 2>&1 | grep -E "pass |fail "`
Expected: sintaxe ok; testes existentes seguem passando (11/11).

- [ ] **Step 4: Commit**
```bash
git add app/js/samples.js app/sw.js
git commit -m "feat(estilo): estilo nos exemplos + bump sw v5→v6"
```

---

### Task 6: Atualizar o PRD

**Files:** Modify `docs/superpowers/specs/2026-06-25-soma-play-design.md`

- [ ] **Step 1: §5 modelo** — após a linha do campo `fonte` (`├── fonte (origem: ...)`) adicionar:
```
        ├── estilo (estilo musical — um por música; agrupa na aba Estilos)
```

- [ ] **Step 2: §6 navegação** — registrar a nova aba: acrescentar que a Home tem **quatro** visões — **Artistas, Músicas, Estilos, Listas** — sendo Estilos análoga a Artistas (agrupa por estilo, respeita a lente); Listas segue como a exceção que ignora a lente.

- [ ] **Step 3: Commit**
```bash
git add docs/superpowers/specs/2026-06-25-soma-play-design.md
git commit -m "docs(prd): registra campo estilo e a aba Estilos"
```

---

## Self-Review

**1. Cobertura do spec:**
- Modelo `song.estilo` → Task 1. Aba Estilos (entre Músicas/Listas, espelha Artistas, respeita lente) → Tasks 2–3. Campo no add/edit com chips → Task 4. "Sem estilo" → Task 1 (`SEM_ESTILO`) usado em 2. Exemplos com estilo → Task 5. SW bump → Task 5. PRD → Task 6. Autoria/IA (sugestão comigo) → sem código (fluxo de importação).
- Fora do escopo (múltiplos estilos, busca por estilo na aba Músicas, IA no app) → não implementados. ✓

**2. Placeholders:** nenhum passo sem código real.

**3. Consistência de tipos/nomes:** `estiloOf`/`songsOfEstilo`/`SEM_ESTILO`/`S.estiloId` idênticos entre Tasks 1→2→3. `data-a="openEstilo"` (home) ↔ `openEstilo` (main). `from: 'estilo'` (songRow) ↔ `backTo === 'estilo'` (goBack). `d.estilo`/`f-estilo`/`setEstilo` coerentes em Task 4. `song.estilo` gravado (Task 4) e lido (`estiloOf`, Task 1).

## Notas para quem executa
Projeto **sem harness de DOM**: sintaxe por `node --check`, lógica de acordes por `node --test` (inalterada), e **verificação manual no navegador** para a UI (aba/tela/campo). Rodar o servidor e conferir conta como teste dessas tasks (padrão do projeto). Verificar em Task 3/Step 3 que `openSongAction` grava `S.backTo = from`.
