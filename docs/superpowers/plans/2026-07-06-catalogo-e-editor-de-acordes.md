# Catálogo de acordes + Editor de casas + Seletor de variação — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o soma_play renderizar, editar e trocar as digitações de acorde por música, com um catálogo de formas reutilizável semeado no app.

**Architecture:** Novo módulo `chords-catalog.js` guarda formas por nome (`nome → [variações]`, uma padrão), semeado com o dicionário atual + os acordes de As Pastorinhas. `chordSVG` resolve a forma por `digitacoes` da música → padrão do catálogo → "?". A tela "Adicionar/editar" ganha um **editor de casas** que grava em `cifra.digitacoes`; a Tela Cifra ganha um **seletor de variação** que grava a forma escolhida naquela música (snapshot). Música é self-contained — **sem migração de schema**.

**Tech Stack:** JavaScript vanilla (ES modules, sem build), IndexedDB/OPFS, Web Audio. Testes de lógica pura com `node --test` (Node ≥ 20, embutido, sem dependências).

## Global Constraints

- **Sem toolchain de build.** ES modules servidos estáticos; nada de bundler/transpiler.
- **Discutir/escrever em português** (código, UI, comentários).
- **Forma (voicing):** `{ frets:[Mi grave, Lá, Ré, Sol, Si, Mi agudo], barre?:{fret,from,to} }` — `-1`=abafada, `0`=solta, `n`=casa.
- **Música self-contained:** a forma escolhida é copiada (snapshot) para `song.cifra.digitacoes[nome]`. Nunca referência ao catálogo em runtime.
- **Catálogo só-leitura no app** neste MVP (cresce no repo). Editável-no-app/promover/sync = fora do MVP.
- **Tokens visuais:** fundo `#0E0E11`, superfícies `#1A1A20/#23232B`, borda `#2E2E37`, texto `#F5F4F2`, âmbar `#E8A23D`; ver [`app.css:24`](../../../app/css/app.css).
- **Rodar local:** `cd app && python3 -m http.server 8137` → `http://localhost:8137`.

**Escopo:** este plano entrega A (editor) + B (catálogo) + C (seletor) + o caso-ouro As Pastorinhas. O **pipeline de importação em massa (arquivos por música no repo + gerador `.somaplay`)** é a peça D do spec e vai num plano separado — não é necessária aqui: uma música entra pelo formulário e o catálogo preenche as formas.

---

## File Structure

- **Create** `app/js/chords-catalog.js` — dados do catálogo + `catalogShapes(name)`, `catalogDefault(name)`.
- **Create** `app/package.json` — `{"type":"module"}` (declara os módulos como ESM; habilita `node --test`; ignorado por navegador e servidor estático).
- **Create** `app/test/catalog.test.js` — testes de `node --test` da lógica pura.
- **Modify** `app/js/chords.js` — `chordSVG` resolve via catálogo; remover `CHORDS` local (movido pro catálogo).
- **Modify** `app/js/render/addedit.js` — seção "Digitações dos acordes" + editor de casas (fluxos texto e imagem); snapshot no save.
- **Modify** `app/js/render/play.js` — acorde tocável → seletor de variação (overlay).
- **Modify** `app/js/main.js` — ações `editChord`, `setFret`, `useCatShape`, `openChordPicker`, `pickChordShape`, `closeChordPicker`.
- **Modify** `app/js/samples.js` — semear As Pastorinhas (caso-ouro).
- **Modify** `app/css/app.css` — estilos do editor e do seletor.
- **Modify** `docs/superpowers/specs/2026-06-25-soma-play-design.md` — Anexo A#3 e §11.

---

### Task 1: Catálogo de formas (dados + helpers) com testes

**Files:**
- Create: `app/js/chords-catalog.js`
- Create: `app/package.json`
- Test: `app/test/catalog.test.js`

**Interfaces:**
- Produces: `CATALOG` (objeto `nome → [{frets, barre?, label?, default?}]`), `catalogShapes(name): Array`, `catalogDefault(name): shape|null`.

- [ ] **Step 1: Escrever o teste que falha**

Create `app/test/catalog.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalogShapes, catalogDefault } from '../js/chords-catalog.js';

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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && node --test`
Expected: FAIL — `Cannot find module '.../js/chords-catalog.js'`.

- [ ] **Step 3: Criar `app/package.json`**

```json
{
  "name": "somaplay-app",
  "private": true,
  "type": "module"
}
```

- [ ] **Step 4: Criar `app/js/chords-catalog.js`**

```js
// chords-catalog.js — catálogo de formas (voicings). Um nome tem 1..n variações;
// a marcada `default:true` (ou a primeira) é a padrão. Só-leitura em runtime (MVP);
// cresce no repo à medida que músicas são importadas.
// forma: { frets:[Mi grave, Lá, Ré, Sol, Si, Mi agudo], barre?:{fret,from,to}, label?, default? }

export const CATALOG = {
  // — semente: formas antes embutidas em chords.js (cada uma vira a padrão do seu nome) —
  'C':    [{ frets: [-1, 3, 2, 0, 1, 0], default: true }],
  'C#m':  [{ frets: [-1, 4, 6, 6, 5, 4], barre: { fret: 4, from: 1, to: 5 }, default: true }],
  'D':    [{ frets: [-1, -1, 0, 2, 3, 2], default: true }],
  'D7':   [{ frets: [-1, -1, 0, 2, 1, 2], default: true }],
  'Dm':   [{ frets: [-1, -1, 0, 2, 3, 1], default: true }],
  'Dm7':  [{ frets: [-1, -1, 0, 2, 1, 1], default: true }],
  'D#m':  [{ frets: [-1, 6, 8, 8, 7, 6], barre: { fret: 6, from: 1, to: 5 }, default: true }],
  'E':    [{ frets: [0, 2, 2, 1, 0, 0], default: true }],
  'Em':   [{ frets: [0, 2, 2, 0, 0, 0], default: true }],
  'Em7':  [{ frets: [0, 2, 0, 0, 0, 0], default: true }],
  'E7':   [{ frets: [0, 2, 0, 1, 0, 0], label: 'simples', default: true },
           { frets: [0, 2, 2, 1, 3, 0], label: 'com 3ª e 7ª' }],
  'F':    [{ frets: [1, 3, 3, 2, 1, 1], barre: { fret: 1, from: 0, to: 5 }, default: true }],
  'F#':   [{ frets: [2, 4, 4, 3, 2, 2], barre: { fret: 2, from: 0, to: 5 }, default: true }],
  'F#m':  [{ frets: [2, 4, 4, 2, 2, 2], barre: { fret: 2, from: 0, to: 5 }, default: true }],
  'G':    [{ frets: [3, 2, 0, 0, 0, 3], default: true }],
  'G7':   [{ frets: [3, 2, 0, 0, 0, 1], default: true }],
  'G/B':  [{ frets: [-1, 2, 0, 0, 3, 3], default: true }],
  'G#m':  [{ frets: [4, 6, 6, 4, 4, 4], barre: { fret: 4, from: 0, to: 5 }, default: true }],
  'Gmaj7':[{ frets: [3, 2, 0, 0, 0, 2], default: true }],
  'G7M':  [{ frets: [3, 2, 0, 0, 0, 2], default: true }],
  'Gm':   [{ frets: [3, 5, 5, 3, 3, 3], barre: { fret: 3, from: 0, to: 5 }, default: true }],
  'D7/C': [{ frets: [-1, 3, 0, 2, 1, 2], default: true }],
  'A':    [{ frets: [-1, 0, 2, 2, 2, 0], default: true }],
  'A7':   [{ frets: [-1, 0, 2, 0, 2, 0], default: true }],
  'Am':   [{ frets: [-1, 0, 2, 2, 1, 0], default: true }],
  'Am7':  [{ frets: [-1, 0, 2, 0, 1, 0], default: true }],
  'A#':   [{ frets: [-1, 1, 3, 3, 3, 1], barre: { fret: 1, from: 1, to: 5 }, default: true }],
  'B':    [{ frets: [-1, 2, 4, 4, 4, 2], barre: { fret: 2, from: 1, to: 5 }, default: true }],
  'B7':   [{ frets: [-1, 2, 1, 2, 0, 2], default: true }],
  'Bm':   [{ frets: [-1, 2, 4, 4, 3, 2], barre: { fret: 2, from: 1, to: 5 }, default: true }],
  'Bm7':  [{ frets: [-1, 2, 4, 2, 3, 2], barre: { fret: 2, from: 1, to: 5 }, default: true }],
  'Cmaj7':[{ frets: [-1, 3, 2, 0, 0, 0], default: true }],
  'C7M':  [{ frets: [-1, 3, 2, 0, 0, 0], default: true }],
  // — novas formas de As Pastorinhas (Noel Rosa), conferidas contra o CifraClub —
  'C/E':    [{ frets: [0, 3, 2, 0, 1, 0], default: true }],
  'Cm':     [{ frets: [-1, 3, 5, 5, 4, 3], barre: { fret: 3, from: 1, to: 5 }, label: 'pestana 3ª', default: true }],
  'Cm6/Eb': [{ frets: [-1, -1, 1, 2, 1, 3], default: true }],
  'G/D':    [{ frets: [-1, 5, 5, 4, 3, -1], label: 'baixo em Ré', default: true }],
  'G7/B':   [{ frets: [-1, 2, 3, 0, 3, -1], default: true }],
  'Gm6/Bb': [{ frets: [-1, 1, 2, 0, 3, 0], default: true }],
};

export function catalogShapes(name) {
  return CATALOG[name] ? CATALOG[name].slice() : [];
}

export function catalogDefault(name) {
  const v = CATALOG[name];
  if (!v || !v.length) return null;
  return v.find((s) => s.default) || v[0];
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `cd app && node --test`
Expected: PASS (4 testes).

- [ ] **Step 6: Commit**

```bash
git add app/package.json app/js/chords-catalog.js app/test/catalog.test.js
git commit -m "feat(acordes): catálogo de formas semeado (nome → variações)"
```

---

### Task 2: `chordSVG` resolve a forma via catálogo

**Files:**
- Modify: `app/js/chords.js` (remover `CHORDS` L5–39; ajustar `chordSVG` L98–99)
- Test: `app/test/catalog.test.js` (adicionar casos)

**Interfaces:**
- Consumes: `catalogDefault(name)` de `chords-catalog.js`.
- Produces: `chordSVG(name, small, dict)` inalterado na assinatura; passa a cair no catálogo quando `dict` não tem o nome.

- [ ] **Step 1: Escrever os testes que falham**

Adicionar em `app/test/catalog.test.js`:
```js
import { chordSVG } from '../js/chords.js';

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
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && node --test`
Expected: FAIL — ao importar `chords.js`, `CHORDS` é usado mas o teste exercita nomes fora do dicionário (`G/D` → hoje viraria "?").

- [ ] **Step 3: Editar `app/js/chords.js`**

No topo, adicionar o import (após a linha de comentário do cabeçalho, antes de `export const CHORDS`):
```js
import { catalogDefault } from './chords-catalog.js';
```
Remover o bloco `export const CHORDS = { ... };` inteiro (linhas 5–39 do arquivo atual — as formas agora vivem no catálogo). Em `chordSVG`, trocar a linha:
```js
  const d = (dict && dict[name]) || CHORDS[name];
```
por:
```js
  const d = (dict && dict[name]) || catalogDefault(name);
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd app && node --test`
Expected: PASS (todos).

- [ ] **Step 5: Verificar que ninguém mais importa `CHORDS`**

Run: `cd app && grep -rn "CHORDS" js/`
Expected: nenhuma ocorrência (o símbolo foi removido e não era importado por outros módulos).

- [ ] **Step 6: Commit**

```bash
git add app/js/chords.js app/test/catalog.test.js
git commit -m "feat(acordes): chordSVG resolve a forma pelo catálogo"
```

---

### Task 3: Editor de casas no "Adicionar/editar música"

**Files:**
- Modify: `app/js/render/addedit.js`
- Modify: `app/js/main.js` (ações `editChord`, `setFret`, `useCatShape`)
- Modify: `app/css/app.css`

**Interfaces:**
- Consumes: `extractChords`, `parseCifraText`, `chordSVG` (`chords.js`); `catalogShapes`, `catalogDefault` (`chords-catalog.js`).
- Produces: escreve formas em `S.draft.digitacoes[nome]`; `commitDraft` grava snapshot de todo acorde usado em `cifra.digitacoes`.

- [ ] **Step 1: Imports e estado do draft em `addedit.js`**

No topo de `app/js/render/addedit.js`, ampliar o import de chords e adicionar o do catálogo:
```js
import { parseCifraText, extractChords, chordSVG } from '../chords.js';
import { catalogShapes, catalogDefault } from '../chords-catalog.js';
```
Em `newDraft`, garantir dicionário mutável + estado do editor. Trocar, no ramo de música existente, `digitacoes: song.cifra?.digitacoes || null` por:
```js
      digitacoes: { ...(song.cifra?.digitacoes || {}) }, editingChord: null,
```
e no `return` do rascunho novo, trocar `digitacoes: null,` por:
```js
    digitacoes: {}, editingChord: null,
```

- [ ] **Step 2: Funções de render do editor em `addedit.js`**

Adicionar, antes de `export function renderAddEdit()`:
```js
function draftChordNames(d) {
  if (d.cifraFonte === 'texto') return extractChords(parseCifraText(d.cifraTexto || ''));
  return (d.acordes || '').trim() ? d.acordes.trim().split(/\s+/) : [];
}

function chordEditorHTML(d, name) {
  const dict = d.digitacoes || {};
  const shape = dict[name] || catalogDefault(name) || { frets: [-1, -1, -1, -1, -1, -1] };
  const frets = shape.frets;
  const pos = frets.filter((f) => f > 0);
  const base = pos.length && Math.max(...pos) > 4 ? Math.min(...pos) : 1;
  const nomes = ['Mi', 'Lá', 'Ré', 'Sol', 'Si', 'Mi'];
  const cols = nomes.map((s, i) => {
    const f = frets[i];
    const head = `<button class="fcell head ${f === -1 ? 'x' : ''} ${f === 0 ? 'o' : ''}" data-a="setFret" data-id="${i}" data-fret="${f === 0 ? -1 : 0}">${f === -1 ? '✕' : (f === 0 ? '○' : '·')}</button>`;
    let cells = '';
    for (let r = 0; r < 5; r++) { const fr = base + r; cells += `<button class="fcell ${f === fr ? 'on' : ''}" data-a="setFret" data-id="${i}" data-fret="${fr}"></button>`; }
    return `<div class="fcol"><div class="fstr">${s}</div>${head}${cells}</div>`;
  }).join('');
  const cat = catalogShapes(name);
  const catBtns = cat.map((s, ix) => `<button class="btn-ghost sm" data-a="useCatShape" data-id="${esc(name)}" data-ix="${ix}">${esc(s.label || ('variação ' + (ix + 1)))}</button>`).join('');
  return `<div class="chord-editor">
    <div class="ce-hd"><b>${esc(name)}</b><span class="mut">base ${base}ª · toque a casa; toque de novo p/ soltar</span>
      <button class="btn-icon xs" style="margin-left:auto" data-a="editChord" data-id="">${I.close()}</button></div>
    <div class="fgrid">${cols}</div>
    ${catBtns ? `<div class="ce-cat"><span class="mut">catálogo:</span>${catBtns}</div>` : ''}
  </div>`;
}

function chordDigHTML(d) {
  const names = draftChordNames(d);
  if (!names.length) return '';
  const dict = d.digitacoes || {};
  const chips = names.map((n) => `<button class="digchip ${d.editingChord === n ? 'on' : ''} ${dict[n] ? 'set' : ''}" data-a="editChord" data-id="${esc(n)}">
      <span class="dnm">${esc(n)}</span>${chordSVG(n, true, dict)}
    </button>`).join('');
  return `<div class="card-section">
    <div class="hd"><span style="color:var(--accent);display:flex">${I.cifraLines(19)}</span>
      <div class="t">Digitações dos acordes</div><div class="s">toque um acorde para ajustar as casas</div></div>
    <div class="digchips">${chips}</div>
    ${d.editingChord ? chordEditorHTML(d, d.editingChord) : ''}
  </div>`;
}
```

- [ ] **Step 3: Montar a seção no formulário**

Em `renderAddEdit`, logo após o `card-section` da cifra (o bloco que termina antes do `card-section` da "Letra (karaokê)"), inserir:
```js
        ${chordDigHTML(d)}
```

- [ ] **Step 4: Snapshot no save (`commitDraft`)**

Em `commitDraft`, antes de montar `const song = {...}`, calcular o dicionário self-contained:
```js
  const usados = draftChordNames(d);
  const dig = { ...(d.digitacoes || {}) };
  for (const n of usados) {
    if (!dig[n]) { const def = catalogDefault(n); if (def) dig[n] = { frets: def.frets.slice(), ...(def.barre ? { barre: { ...def.barre } } : {}) }; }
  }
```
E nos dois ramos do campo `cifra:`, trocar `digitacoes: d.digitacoes || null` por `digitacoes: dig`.

- [ ] **Step 5: Ações em `main.js`**

Adicionar o import no topo de `main.js` (junto aos demais de render/estado):
```js
import { catalogShapes, catalogDefault } from './chords-catalog.js';
```
E, dentro do objeto `actions` (junto às ações de add/editar, ~L269+):
```js
  editChord(d) { syncDraftFromDOM(); S.draft.editingChord = d.id || null; update(); },
  setFret(d) {
    syncDraftFromDOM();
    const name = S.draft.editingChord; if (!name) return;
    const dict = S.draft.digitacoes || (S.draft.digitacoes = {});
    const base = dict[name] || catalogDefault(name) || { frets: [-1, -1, -1, -1, -1, -1] };
    const frets = base.frets.slice();
    const i = +d.id; const fret = +d.fret;
    frets[i] = (frets[i] === fret) ? 0 : fret;
    dict[name] = { frets, ...(base.barre ? { barre: { ...base.barre } } : {}) };
    update();
  },
  useCatShape(d, ev, el) {
    const name = d.id; const s = catalogShapes(name)[+el.dataset.ix]; if (!s) return;
    const dict = S.draft.digitacoes || (S.draft.digitacoes = {});
    dict[name] = { frets: s.frets.slice(), ...(s.barre ? { barre: { ...s.barre } } : {}) };
    update();
  },
```
> `syncDraftFromDOM` já existe e preserva textarea/inputs antes do re-render (padrão das outras ações de draft).

- [ ] **Step 6: Estilos em `app.css`**

Acrescentar ao fim de `app/css/app.css`:
```css
.digchips{display:flex;flex-wrap:wrap;gap:10px}
.digchip{display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 8px 6px;background:var(--surface2);border:1px solid var(--border);border-radius:12px;cursor:pointer;color:var(--text)}
.digchip.on{border-color:var(--accent)}
.digchip.set .dnm{color:var(--accent)}
.digchip .dnm{font-family:var(--f-title);font-weight:600;font-size:13px}
.chord-editor{margin-top:14px;padding:14px;background:var(--bg);border:1px solid var(--border);border-radius:14px}
.ce-hd{display:flex;align-items:center;gap:10px;margin-bottom:12px;font-size:14px}
.ce-hd .mut{color:var(--muted);font-size:12px}
.fgrid{display:flex;gap:8px;justify-content:center}
.fcol{display:flex;flex-direction:column;gap:5px;align-items:center}
.fstr{font-size:11px;color:var(--muted);font-family:var(--f-mono)}
.fcell{width:34px;height:30px;border:1px solid var(--border2);border-radius:7px;background:var(--surface);color:var(--muted);cursor:pointer;font-size:13px}
.fcell.head{background:transparent;border-style:dashed}
.fcell.head.x{color:var(--red)}
.fcell.head.o{color:var(--muted)}
.fcell.on{background:var(--accent);border-color:var(--accent);color:var(--bg)}
.ce-cat{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px}
.ce-cat .mut{color:var(--muted);font-size:12px}
.btn-ghost.sm{height:32px;padding:0 12px;font-size:12px}
```

- [ ] **Step 7: Verificação manual**

Run: `cd app && python3 -m http.server 8137` → abrir `http://localhost:8137`.
Passos e resultado esperado:
1. Adicionar música → Fonte da cifra **Texto** → colar uma cifra com `G/D` e `Cm` → a seção **"Digitações dos acordes"** lista os acordes com mini-diagramas (G/D e Cm já desenhados, vindos do catálogo). **Esperado:** nenhum "?".
2. Tocar em `G/D` → abre o editor com a forma `x 5 5 4 3 x` marcada e "base 3ª". Tocar numa casa muda a corda; tocar de novo na mesma célula solta a corda.
3. Botão **catálogo → "baixo em Ré"** repõe a forma. Salvar; reabrir em **Editar** → a mesma forma aparece (round-trip).

- [ ] **Step 8: Commit**

```bash
git add app/js/render/addedit.js app/js/main.js app/css/app.css
git commit -m "feat(acordes): editor de casas no add/edit (grava em digitacoes)"
```

---

### Task 4: Seletor de variação na Tela Cifra

**Files:**
- Modify: `app/js/render/play.js`
- Modify: `app/js/main.js` (ações `openChordPicker`, `pickChordShape`, `closeChordPicker`)
- Modify: `app/css/app.css`

**Interfaces:**
- Consumes: `catalogShapes` (`chords-catalog.js`); `currentSong`, `saveSong` (`state.js`); `chordSVG`.
- Produces: `S.chordPicker` (`string|null`); grava `song.cifra.digitacoes[nome]` e persiste com `saveSong`.

- [ ] **Step 1: Import do catálogo e de `saveSong` em `play.js`**

No topo de `app/js/render/play.js`:
```js
import { S, currentSong, artistName, audio, persistCurrentStems, saveSong } from '../state.js';
import { catalogShapes } from '../chords-catalog.js';
```
> `saveSong` já é exportado por `state.js` (usado em `addedit.js`).

- [ ] **Step 2: Tornar o acorde tocável na grade**

Em `chordsGridHTML` (`play.js` ~L61–66), trocar a `<div>` do diagrama por um botão que abre o seletor:
```js
    return `<div class="chord-card ${f ? 'pinned' : ''}">
      <div class="nm"><span>${esc(n)}</span><button class="star-btn ${f ? 'on' : ''}" data-a="toggleChordFav" data-id="${esc(n)}" title="Fixar acorde no topo">${I.star(f)}</button></div>
      <button class="chord-diag" data-a="openChordPicker" data-id="${esc(n)}" title="Trocar variação">${chordSVG(n, false, dict)}</button>
    </div>`;
```

- [ ] **Step 3: Render do seletor (overlay) em `play.js`**

Adicionar antes de `export function renderPlay()`:
```js
function chordPickerHTML(song) {
  const name = S.chordPicker;
  const dict = song.cifra?.digitacoes || {};
  const atual = dict[name] ? JSON.stringify(dict[name].frets) : null;
  const shapes = catalogShapes(name);
  const opts = shapes.map((s, ix) => {
    const sel = atual && JSON.stringify(s.frets) === atual;
    return `<button class="pick-opt ${sel ? 'sel' : ''}" data-a="pickChordShape" data-id="${esc(name)}" data-ix="${ix}">
      ${chordSVG(name, false, { [name]: s })}
      <span class="lbl">${esc(s.label || ('variação ' + (ix + 1)))}</span>
    </button>`;
  }).join('');
  return `<div class="scrim" data-a="closeChordPicker">
    <div class="popover" data-stop="1">
      <div class="head"><div class="head-row"><div class="title">Variações de ${esc(name)}</div>
        <button class="btn-icon xs" data-a="closeChordPicker">${I.close()}</button></div></div>
      <div class="body pick-grid">${opts || '<div style="padding:14px;color:var(--muted);font-size:13px">Só a forma atual — edite as casas em “Editar música”.</div>'}</div>
    </div>
  </div>`;
}
```
E no `return` de `renderPlay` (antes do `</div>` final que fecha `.screen`, após `${hasMixer ? transportHTML() : ''}`), inserir:
```js
    ${S.chordPicker ? chordPickerHTML(song) : ''}
```

- [ ] **Step 4: Ações em `main.js`**

Dentro de `actions` (junto às de acorde, perto de `toggleChordFav` ~L230):
```js
  openChordPicker(d) { S.chordPicker = d.id; update(); },
  closeChordPicker() { S.chordPicker = null; update(); },
  async pickChordShape(d, ev, el) {
    const song = currentSong(); if (!song) return;
    const s = catalogShapes(d.id)[+el.dataset.ix]; if (!s) return;
    song.cifra.digitacoes = { ...(song.cifra.digitacoes || {}), [d.id]: { frets: s.frets.slice(), ...(s.barre ? { barre: { ...s.barre } } : {}) } };
    await saveSong(song);
    S.chordPicker = null;
    update();
  },
```
Garantir que `currentSong`, `saveSong` e `catalogShapes` estejam importados em `main.js` (os dois primeiros já são usados/importados; adicionar `catalogShapes` ao import de `chords-catalog.js` da Task 3). Inicializar `S.chordPicker = null` no estado (em `state.js`, junto aos demais campos de UI como `chordFavs`).

- [ ] **Step 5: Estilos em `app.css`**

Acrescentar:
```css
.chord-diag{background:none;border:none;padding:0;cursor:pointer;display:block}
.pick-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:10px}
.pick-opt{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 6px;background:var(--surface2);border:1px solid var(--border);border-radius:12px;cursor:pointer;color:var(--text)}
.pick-opt.sel{border-color:var(--accent)}
.pick-opt .lbl{font-size:11px;color:var(--muted)}
```

- [ ] **Step 6: Verificação manual**

Run: `cd app && python3 -m http.server 8137`.
1. Abrir uma música com `E7` na grade "Acordes desta música" → tocar no diagrama do `E7` → abre o seletor com **2 variações** (simples / com 3ª e 7ª).
2. Escolher a outra variação → o diagrama na cifra troca e persiste (recarregar a página, reabrir a música → a escolha permanece).
3. Abrir **outra** música que também use `E7` → continua na forma original (a troca foi só na primeira — self-contained).

- [ ] **Step 7: Commit**

```bash
git add app/js/render/play.js app/js/main.js app/js/state.js app/css/app.css
git commit -m "feat(acordes): seletor de variação na Tela Cifra (snapshot por música)"
```

---

### Task 5: Caso-ouro — semear As Pastorinhas

**Files:**
- Modify: `app/js/samples.js`

**Interfaces:**
- Consumes: `upsertArtist`, `saveSong`, `uid` (já importados no arquivo).

- [ ] **Step 1: Adicionar dados e o seeder em `samples.js`**

Adicionar as constantes (perto das demais cifras) e um bloco em `importSamples()` (guardado por título, como os outros):
```js
const PASTORINHAS_CIFRA = `[Intro] C/E  Cm6/Eb  G/D  E7  A7  D7  Gm

          Gm          G7/B    Cm
A estrela d'alva, no céu   desponta
             D7                       Gm
E a lua anda tonta, com tamanho esplendor
          Cm             D7      Gm
E as moreninhas, pra consolo da lua
                A7    D7                  G
Vão cantando na rua,    lindos versos de amor

         G                 G/B    Gm6/Bb  Am7   D7
Linda morena, morenaa, da cor de Mada    le    na

Tu não tens pena de mim
G
Que vivo louco com esse seu olhar
         G      G7                     C
Linda criança,    tu não me sais da lembrança
        Cm6/Eb         G/D   E7
Meu coração    não se can....sa
A7           D7        Gm
De sempre e sempre te amar`;

const PASTORINHAS_DIG = {
  'C/E': { frets: [0, 3, 2, 0, 1, 0] }, 'Cm6/Eb': { frets: [-1, -1, 1, 2, 1, 3] },
  'G/D': { frets: [-1, 5, 5, 4, 3, -1] }, 'E7': { frets: [0, 2, 2, 1, 3, 0] },
  'A7': { frets: [-1, 0, 2, 0, 2, 0] }, 'D7': { frets: [-1, -1, 0, 2, 1, 2] },
  'Gm': { frets: [3, 5, 5, 3, 3, 3], barre: { fret: 3, from: 0, to: 5 } },
  'G7/B': { frets: [-1, 2, 3, 0, 3, -1] }, 'Cm': { frets: [-1, 3, 5, 5, 4, 3], barre: { fret: 3, from: 1, to: 5 } },
  'G': { frets: [3, 2, 0, 0, 0, 3] }, 'G/B': { frets: [-1, 2, 0, 0, 3, 3] },
  'Gm6/Bb': { frets: [-1, 1, 2, 0, 3, 0] }, 'Am7': { frets: [-1, 0, 2, 0, 1, 0] },
  'G7': { frets: [3, 2, 0, 0, 0, 1] }, 'C': { frets: [-1, 3, 2, 0, 1, 0] },
};
```
E no corpo de `importSamples`, antes do `return done;`:
```js
  if (!S.songs.some((s) => s.title === 'As Pastorinhas')) {
    const noel = await upsertArtist('Noel Rosa');
    await saveSong({
      id: uid(), artistId: noel.id, title: 'As Pastorinhas', tom: 'G', favorita: false,
      createdAt: Date.now(),
      cifra: { fonte: 'texto', texto: PASTORINHAS_CIFRA, digitacoes: PASTORINHAS_DIG,
        acordes: ['C/E', 'Cm6/Eb', 'G/D', 'E7', 'A7', 'D7', 'Gm', 'G7/B', 'Cm', 'G', 'G/B', 'Gm6/Bb', 'Am7', 'G7', 'C'] },
      letra: '', stems: [], full: [],
    });
    done.push('As Pastorinhas (Noel Rosa) — cifra em texto + 15 digitações conferidas');
  }
```

- [ ] **Step 2: Verificação manual (end-to-end)**

Run: `cd app && python3 -m http.server 8137` → Configurações → **Importar exemplos**.
Abrir **As Pastorinhas**. **Esperado:** os 15 acordes na grade desenhados corretos (Cm/Gm com pestana, G/D, G7/B, Gm6/Bb, Cm6/Eb sem "?"), batendo com as imagens do CifraClub. Tocar num acorde abre o seletor.

- [ ] **Step 3: Commit**

```bash
git add app/js/samples.js
git commit -m "feat(exemplos): As Pastorinhas (Noel Rosa) como caso-ouro de digitações"
```

---

### Task 6: Atualizar o PRD

**Files:**
- Modify: `docs/superpowers/specs/2026-06-25-soma-play-design.md`

- [ ] **Step 1: Anexo A#3** — trocar "dicionário de digitações embutido + `digitacoes` opcionais por música" por: "**catálogo de formas** (nome → variações, semeado e só-leitura no MVP); a música guarda a forma escolhida em `digitacoes` (snapshot); **editor de casas** no add/edit e **seletor de variação** na Tela Cifra".

- [ ] **Step 2: §11 (Fora do MVP)** — acrescentar os itens: "Catálogo **editável dentro do app** + **promover voicing** + **sincronizar catálogo no backup**"; "Imagem chapada dos diagramas como fallback de exibição por acorde".

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-06-25-soma-play-design.md
git commit -m "docs(prd): registra catálogo de acordes, editor de casas e itens fora do MVP"
```

---

## Self-Review

**1. Cobertura do spec:**
- §3 A (editor) → Task 3. §3 B (catálogo semeado) → Tasks 1–2. §3 C (seletor) → Task 4. §4 (modelo/resolução) → Tasks 1–2. §5 (editor detalhes) → Task 3. §7 (seletor detalhes) → Task 4. §9 (verificação/caso-ouro) → Task 5. §10 (arquivos/PRD) → Tasks 1–6. §3 D (pipeline `.somaplay`) → **fora deste plano** (declarado no escopo; plano próprio).
- Item fora do MVP (catálogo editável/promover/sync, imagem-fallback) → registrado na Task 6.

**2. Placeholders:** nenhum passo usa "TBD/etc."; todo passo de código traz o código real.

**3. Consistência de tipos/nomes:** `catalogShapes`/`catalogDefault` idênticos em Tasks 1→2→3→4. Forma sempre `{frets, barre?}`. `S.draft.digitacoes` (objeto) e `song.cifra.digitacoes` (objeto) coerentes entre editor (Task 3), snapshot no save (Task 3) e seletor (Task 4). `S.chordPicker` (string|null) inicializado na Task 4/Step 4. Ações `data-a` batem com os handlers em `main.js`.

---

## Notas de verificação para quem executa

Este projeto **não tem harness de DOM**: as Tasks 1–2 (lógica pura) usam `node --test`; as Tasks 3–5 (UI) usam **verificação manual no navegador** com os passos/observações descritos. Rodar o servidor local e conferir o comportamento real conta como o "teste" dessas tasks (padrão do projeto).
