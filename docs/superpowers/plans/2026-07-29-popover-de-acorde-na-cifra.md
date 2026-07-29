# Popover de acorde na cifra — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tocar num acorde da cifra em texto abre um popover ancorado (nome + diagrama + bolinhas + "Variar"); "Variar" expande um carrossel de formas e "Aplicar" troca a digitação do acorde na música inteira.

**Architecture:** Estado global + re-render (padrão do app): `S.chordPop` guarda nome/âncora/modo/seleção; `renderPlay()` desenha o card `position:fixed` posicionado pela função pura `popPosition`. Reusa `chordSVG`, `shapeStripHTML` e a gravação do picker (`applyShapeToSong` extraído do `pickChordShape`); a resolução de formas+seleção do picker vira o helper compartilhado `pickerShapes` em `chordbook.js`.

**Tech Stack:** JavaScript vanilla (ES modules, sem build), IndexedDB, `node --test` (Node ≥ 20, sem dependências) para lógica pura, verificação manual no navegador para UI.

**Spec:** `docs/superpowers/specs/2026-07-29-popover-de-acorde-na-cifra-design.md`

## Global Constraints

- Sem build/bundler: o código roda direto no navegador; sintaxe conferida com `node --check`.
- Testes: `cd app && node --test` (todos os arquivos `app/test/*.test.js` devem passar sempre).
- UI, comentários e commits em **português (pt-BR)**; commits no padrão do repo (`feat(escopo): ...`, `fix(escopo): ...`).
- Todo commit termina com a trailer: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Servidor manual: `./serve.command` (ou `cd app && python3 -m http.server 8137`) → http://localhost:8137/.
- Alinhamento da cifra é sagrado: a linha `.ch` usa `white-space:pre` + fonte mono; nenhum wrapper pode alterar a largura renderizada dos tokens.
- Projeto **sem harness de DOM**: lógica pura com `node --test`; UI por verificação manual no navegador (padrão do projeto).

---

### Task 1: `chordLineSegs` — tokenização da linha de acordes (chords.js)

**Files:**
- Modify: `app/js/chords.js` (após `extractChords`, ~linha 60)
- Test: `app/test/chordline.test.js` (novo)

**Interfaces:**
- Consumes: `isChordTok(t)` (já existe em `chords.js`).
- Produces: `chordLineSegs(line) → [{ text: string, isChord: boolean }]` — segmentos na ordem original; concatenar todos os `text` reproduz a linha **byte a byte** (espaços são segmentos com `isChord:false`). Usada na Task 5 pelo `play.js`.

- [ ] **Step 1: Write the failing test**

Criar `app/test/chordline.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chordLineSegs } from '../js/chords.js';

test('chordLineSegs: espaços preservados byte a byte (concat == original)', () => {
  const line = '  C   D7/F#     Em  ';
  assert.equal(chordLineSegs(line).map((s) => s.text).join(''), line);
});

test('chordLineSegs: só tokens-acorde são marcados', () => {
  const segs = chordLineSegs('C N.C. x2 Bm7 | %');
  assert.deepEqual(segs.filter((s) => s.isChord).map((s) => s.text), ['C', 'Bm7']);
});

test('chordLineSegs: linha vazia → sem segmentos', () => {
  assert.deepEqual(chordLineSegs(''), []);
});

test('chordLineSegs: linha só de espaços vira um segmento não-acorde', () => {
  assert.deepEqual(chordLineSegs('   '), [{ text: '   ', isChord: false }]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && node --test test/chordline.test.js`
Expected: FAIL — `chordLineSegs` não é exportada por `js/chords.js`.

- [ ] **Step 3: Write minimal implementation**

Em `app/js/chords.js`, logo após `extractChords`:

```js
// Segmentos da linha de acordes para render tocável: split preservando os
// espaços (grupos capturados) — concatenar os text reproduz a linha byte a
// byte, obrigatório para o white-space:pre não desalinhar acorde↔sílaba.
export function chordLineSegs(line) {
  return String(line).split(/(\s+)/).filter((t) => t !== '')
    .map((t) => ({ text: t, isChord: !/\s/.test(t[0]) && isChordTok(t) }));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && node --test`
Expected: PASS (todos os arquivos, incluindo o novo).

- [ ] **Step 5: Commit**

```bash
git add app/js/chords.js app/test/chordline.test.js
git commit -m "feat(chords): chordLineSegs tokeniza a linha de acordes preservando espaços

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: `pickerShapes` — formas + seleção compartilhadas (chordbook.js) e refactor do picker

**Files:**
- Modify: `app/js/chordbook.js` (após `defaultShape`/`shapeById`, ~linha 116)
- Modify: `app/js/render/play.js:257-282` (`chordPickerHTML`) e `app/js/render/play.js:8` (import)
- Test: `app/test/pickershapes.test.js` (novo)

**Interfaces:**
- Consumes: `shapesOf(name)`, `shapeKey(s)`, `defaultShape(name)` (locais de `chordbook.js`).
- Produces: `pickerShapes(name, cur) → { shapes, selId }` onde `cur` é `cifra.digitacoes[nome]` (`{frets, barre?, varId?}`) ou `null`. Regras: match por `varId`; senão por `shapeKey`; senão anexa pseudo-item `{ id:'__song', frets, barre?, label:'desta música' }` ao fim com `selId='__song'`; sem `cur` → `selId` = id da padrão do dicionário (ou `null` se não há formas). Usada pelo picker (esta task), pelas ações do popover (Task 4) e pelo `chordpop.js` (Task 5).

- [ ] **Step 1: Write the failing test**

Criar `app/test/pickershapes.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickerShapes, shapesOf, defaultShape } from '../js/chordbook.js';

test('pickerShapes: sem digitação → padrão do dicionário selecionada', () => {
  const { shapes, selId } = pickerShapes('C', null);
  assert.equal(selId, defaultShape('C').id);
  assert.equal(shapes.length, shapesOf('C').length);
});

test('pickerShapes: match por varId vence o match por forma', () => {
  const alvo = shapesOf('C')[1] || shapesOf('C')[0];
  const cur = { frets: [9, 9, 9, 9, 9, 9], varId: alvo.id }; // frets não batem — varId decide
  assert.equal(pickerShapes('C', cur).selId, alvo.id);
});

test('pickerShapes: sem varId, match pela forma (shapeKey)', () => {
  const alvo = shapesOf('C')[0];
  const cur = { frets: alvo.frets.slice(), ...(alvo.barre ? { barre: { ...alvo.barre } } : {}) };
  assert.equal(pickerShapes('C', cur).selId, alvo.id);
});

test('pickerShapes: digitação custom → pseudo-item __song "desta música" no fim', () => {
  const { shapes, selId } = pickerShapes('C', { frets: [-1, 9, 8, 7, 9, -1] });
  assert.equal(selId, '__song');
  const last = shapes[shapes.length - 1];
  assert.equal(last.id, '__song');
  assert.equal(last.label, 'desta música');
  assert.equal(shapes.length, shapesOf('C').length + 1);
});

test('pickerShapes: acorde desconhecido sem digitação → sem formas, selId null', () => {
  const { shapes, selId } = pickerShapes('Zx9', null);
  assert.deepEqual(shapes, []);
  assert.equal(selId, null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && node --test test/pickershapes.test.js`
Expected: FAIL — `pickerShapes` não é exportada.

- [ ] **Step 3: Write minimal implementation**

Em `app/js/chordbook.js`, após a linha `export function shapeById(...)`:

```js
// Formas para seletor/popover + qual está selecionada. cur = digitação da
// música (cifra.digitacoes[nome]) ou null. Sem digitação, a selecionada é a
// padrão do dicionário (§4.3) — senão nenhuma miniatura fica marcada e o
// "Editar" some do rodapé do picker. Digitação que não bate com nenhuma forma
// vira o pseudo-item '__song' ("desta música") no fim da lista.
export function pickerShapes(name, cur) {
  const shapes = shapesOf(name).slice();
  let selId = null;
  if (cur) {
    const k = shapeKey(cur);
    const achou = (cur.varId && shapes.find((s) => s.id === cur.varId))
      || shapes.find((s) => shapeKey(s) === k);
    if (achou) selId = achou.id;
    else {
      selId = '__song';
      shapes.push({ id: '__song', frets: cur.frets, ...(cur.barre ? { barre: cur.barre } : {}), label: 'desta música' });
    }
  } else {
    const def = defaultShape(name);
    if (def) selId = def.id;
  }
  return { shapes, selId };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && node --test`
Expected: PASS.

- [ ] **Step 5: Refactor `chordPickerHTML` para usar `pickerShapes`**

Em `app/js/render/play.js`, o import da linha 8:

```js
import { shapesOf, shapeById, shapeKey, defaultShape } from '../chordbook.js';
```

vira:

```js
import { shapeById, pickerShapes } from '../chordbook.js';
```

E o início de `chordPickerHTML` (linhas 257–277), que hoje monta `shapes`/`selId` na mão, vira:

```js
function chordPickerHTML(song) {
  const name = S.chordPicker;
  const dict = song.cifra?.digitacoes || {};
  const { shapes, selId } = pickerShapes(name, dict[name] || null);
  const ed = S.chordEd && S.chordEd.origin.kind === 'song' ? S.chordEd : null;
```

(o restante da função — `corpo`, `return` — fica como está.)

- [ ] **Step 6: Verify syntax + tests**

Run: `cd app && node --check js/render/play.js && node --check js/chordbook.js && node --test`
Expected: sem erro de sintaxe; todos os testes PASS.

- [ ] **Step 7: Verificação manual rápida (picker inalterado)**

Com `./serve.command` aberto: numa música em texto, abrir a grade "Acordes desta música" → tocar num diagrama → o picker "Variações de X" abre com a forma atual marcada e "Editar" no rodapé, igual antes.

- [ ] **Step 8: Commit**

```bash
git add app/js/chordbook.js app/js/render/play.js app/test/pickershapes.test.js
git commit -m "refactor(chordbook): pickerShapes compartilha formas+seleção do picker

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: `popPosition` — posicionamento puro do card (render/chordpop.js)

**Files:**
- Create: `app/js/render/chordpop.js`
- Test: `app/test/chordpop.test.js` (novo)

**Interfaces:**
- Consumes: nada (função pura).
- Produces: `popPosition(anchor, cardW, cardH, vw, vh, margin = 8, gap = 6) → { left, top }` — `anchor` = `{x, y, w, h}` em coordenadas do viewport; centra horizontalmente no acorde, prefere acima (`anchor.y - gap - cardH`), vira para baixo quando não cabe, clampa nas quatro bordas com `margin`. Usada na Task 5 (render e re-clamp pós-render).

- [ ] **Step 1: Write the failing test**

Criar `app/test/chordpop.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { popPosition } from '../js/render/chordpop.js';

const A = (x, y) => ({ x, y, w: 40, h: 20 });

test('popPosition: acima do acorde e centrado quando cabe', () => {
  const p = popPosition(A(400, 500), 200, 240, 1024, 768);
  assert.deepEqual(p, { left: 320, top: 254 }); // 400+20−100 · 500−6−240
});

test('popPosition: vira para baixo quando não cabe acima', () => {
  const p = popPosition(A(400, 100), 200, 240, 1024, 768);
  assert.equal(p.top, 126); // 100+20+6
});

test('popPosition: clampa nas bordas esquerda e direita', () => {
  assert.equal(popPosition(A(0, 500), 200, 240, 1024, 768).left, 8);
  assert.equal(popPosition(A(1000, 500), 200, 240, 1024, 768).left, 816); // 1024−200−8
});

test('popPosition: clampa embaixo quando não cabe nem acima nem abaixo', () => {
  const p = popPosition(A(400, 300), 200, 700, 1024, 768);
  assert.equal(p.top, 60); // 768−700−8
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && node --test test/chordpop.test.js`
Expected: FAIL — módulo `../js/render/chordpop.js` não existe.

- [ ] **Step 3: Write minimal implementation**

Criar `app/js/render/chordpop.js`:

```js
// render/chordpop.js — popover ancorado do acorde tocado na cifra (estilo
// CifraClub): mini (nome + diagrama + bolinhas + Variar) e carrossel de formas
// com Aplicar. Spec: docs/superpowers/specs/2026-07-29-popover-de-acorde-na-cifra-design.md

// Posição do card (coordenadas do viewport; o card é position:fixed): centrado
// no acorde, acima quando cabe, abaixo senão, clampado nas bordas. Pura para
// testes em node — não toca o DOM.
export function popPosition(anchor, cardW, cardH, vw, vh, margin = 8, gap = 6) {
  let left = anchor.x + anchor.w / 2 - cardW / 2;
  left = Math.max(margin, Math.min(left, vw - cardW - margin));
  let top = anchor.y - gap - cardH;
  if (top < margin) top = anchor.y + anchor.h + gap;
  top = Math.max(margin, Math.min(top, vh - cardH - margin));
  return { left: Math.round(left), top: Math.round(top) };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && node --test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/js/render/chordpop.js app/test/chordpop.test.js
git commit -m "feat(chordpop): popPosition ancora o card no acorde com clamp de viewport

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Estado e ações do popover (state.js + main.js)

**Files:**
- Modify: `app/js/state.js:49` (estado volátil, junto de `chordPicker`)
- Modify: `app/js/main.js` — import (linha 22), `leavePlay()` (~linha 124), ações do picker (~linhas 321-335), delegação de clique (~linha 637) e `keydown` Escape (~linha 686)

**Interfaces:**
- Consumes: `pickerShapes(name, cur)` (Task 2), `shapeById(name, id)` e `saveSong(song)` (já importados no `main.js`).
- Produces: estado `S.chordPop = null | { name, anchor:{x,y,w,h}, modo:'mini'|'carrossel', selId, scrollTop }`; ações `openChordPop`, `chordPopVariar`, `chordPopSelect`, `chordPopReset`, `chordPopApply`; helper `applyShapeToSong(song, name, shape)` (grava `cifra.digitacoes[name]` + `saveSong`). Não há ação `closeChordPop` — o fechamento acontece na delegação de clique, no Escape e no `leavePlay` (Step 5). A Task 5 renderiza a partir desse estado e dispara essas ações por `data-a`.

- [ ] **Step 1: Estado em `state.js`**

Após a linha 49 (`chordPicker: null, ...`):

```js
  chordPop: null,          // popover do acorde tocado na cifra: { name, anchor, modo:'mini'|'carrossel', selId, scrollTop }
```

- [ ] **Step 2: Import de `pickerShapes` no `main.js`**

Linha 22, adicionar `pickerShapes` ao import de `./chordbook.js`:

```js
import { defaultShape, shapeById, findShape, upsertVar, removeVar, setDefault, restoreBuiltins, labelsOf, pickerShapes } from './chordbook.js';
```

- [ ] **Step 3: Helper `applyShapeToSong` + refactor do `pickChordShape`**

Em `main.js`, acima do objeto de ações (perto de `syncCE`, ~linha 154), criar:

```js
// Grava a forma como digitação do acorde na música inteira — usada pelo
// picker (pickChordShape) e pelo Aplicar do popover (chordPopApply).
async function applyShapeToSong(song, name, s) {
  song.cifra.digitacoes = {
    ...(song.cifra.digitacoes || {}),
    [name]: { frets: s.frets.slice(), ...(s.barre ? { barre: { ...s.barre } } : {}), varId: s.id },
  };
  await saveSong(song);
}
```

E `pickChordShape` (linhas 323-335) passa a usá-lo — comportamento idêntico (`__song`/forma inexistente só fecham):

```js
  async pickChordShape(d, ev, el) {
    const song = currentSong(); if (!song) return;
    const id = el.dataset.var;
    const s = id === '__song' ? null : shapeById(d.id, id);
    if (s) await applyShapeToSong(song, d.id, s);
    S.chordPicker = null;
    update();
  },
```

- [ ] **Step 4: Ações do popover**

Logo após `closeChordPicker()` (~linha 322), adicionar:

```js
  // ---- popover do acorde na cifra (spec 2026-07-29) ----
  openChordPop(d, ev, el) {
    const r = el.getBoundingClientRect();
    const sc = document.querySelector('[data-autoscroll]');
    S.chordPop = {
      name: d.id,
      anchor: { x: r.left, y: r.top, w: r.width, h: r.height },
      modo: 'mini',
      selId: null,
      scrollTop: sc ? sc.scrollTop : 0,  // rolagem REAL fecha; o restore do re-render (mesmo valor) não
    };
    update();
  },
  chordPopVariar() {
    const song = currentSong(); if (!song || !S.chordPop) return;
    const cur = (song.cifra?.digitacoes || {})[S.chordPop.name] || null;
    S.chordPop.modo = 'carrossel';
    S.chordPop.selId = pickerShapes(S.chordPop.name, cur).selId;
    update();
  },
  chordPopSelect(d, ev, el) {
    if (!S.chordPop) return;
    S.chordPop.selId = el.dataset.var;
    update();
  },
  chordPopReset() {
    const song = currentSong(); if (!song || !S.chordPop) return;
    const cur = (song.cifra?.digitacoes || {})[S.chordPop.name] || null;
    S.chordPop.selId = pickerShapes(S.chordPop.name, cur).selId;
    update();
  },
  async chordPopApply() {
    const song = currentSong(); if (!song || !S.chordPop) return;
    const { name, selId } = S.chordPop;
    const s = selId && selId !== '__song' ? shapeById(name, selId) : null;
    if (s) await applyShapeToSong(song, name, s);
    S.chordPop = null;
    update();
  },
```

- [ ] **Step 5: Fechar ao tocar fora, no Escape e ao sair da tela**

(a) Na delegação global de clique, junto dos "clique fora fecha menus abertos" (~linha 637), adicionar:

```js
  if (S.chordPop && !e.target.closest('.chord-pop')) { S.chordPop = null; update(); }
```

(Toque num acorde não passa por aqui — cai na ação `openChordPop` e **reancora**; botões internos do card também têm `data-a` e retornam antes.)

(b) No `keydown` Escape (~linha 686), o popover fecha primeiro:

```js
    if (S.chordPop) { S.chordPop = null; update(); }
    else if (S.popoverSongId) { S.popoverSongId = null; update(); }
    else if (S.imgMenuOpen || S.sortMenuOpen || S.listMenuOpen) {
```

(c) Em `leavePlay()` (~linha 124), adicionar `S.chordPop = null;` junto dos outros resets.

- [ ] **Step 6: Verify syntax + tests**

Run: `cd app && node --check js/main.js && node --check js/state.js && node --test`
Expected: sem erro; testes PASS. (As ações ainda não têm UI — Task 5.)

- [ ] **Step 7: Commit**

```bash
git add app/js/state.js app/js/main.js
git commit -m "feat(main): estado e ações do popover de acorde (abrir, variar, aplicar)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: HTML do popover + CSS + integração na tela Play + SW bump

**Files:**
- Modify: `app/js/render/chordpop.js` (adiciona `chordPopHTML`)
- Modify: `app/js/render/play.js` — imports (linhas 7-9), `chordDiagRowHTML` (linha 132), `cifraTextHTML` (linha 150), `renderPlay` (linha 369), `afterRenderPlay` (~linhas 402-409)
- Modify: `app/js/icons.js` (ícone `undo`)
- Modify: `app/css/app.css` (fim do arquivo)
- Modify: `app/sw.js:2` (bump de versão)

**Interfaces:**
- Consumes: `S.chordPop` e ações (Task 4), `popPosition` (Task 3), `chordLineSegs` (Task 1), `pickerShapes` (Task 2), `chordSVG(name, small, dict)` (chords.js), `shapeStripHTML(name, shapes, selId, action, small)` (chordeditor.js), `I`/`esc` (icons.js).
- Produces: `chordPopHTML(song) → string` (card mini ou carrossel, `''` sem estado); classes CSS `.ch-btn`, `.chord-pop` (+ `.car`, `.nm`, `.diag`, `.dots`, `.dot`, `.variar`, `.hint`, `.strip-wrap`, `.foot`); ícone `I.undo(w)`.

- [ ] **Step 1: Ícone `undo` em `icons.js`**

Junto dos outros ícones stroke (por ex. após `swap`, linha 44):

```js
  undo: (w = 16) => stroke(w, '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>'),
```

- [ ] **Step 2: `chordPopHTML` em `render/chordpop.js`**

Adicionar os imports no topo e a função após `popPosition`:

```js
import { S } from '../state.js';
import { I, esc } from '../icons.js';
import { chordSVG } from '../chords.js';
import { pickerShapes } from '../chordbook.js';
import { shapeStripHTML } from './chordeditor.js';

// Tamanhos estimados só para o 1º posicionamento do render em string;
// afterRenderPlay re-clampa com o tamanho real medido no DOM.
const MINI_W = 180, MINI_H = 232, CAR_W = 420, CAR_H = 264;

export function chordPopHTML(song) {
  const cp = S.chordPop;
  if (!cp) return '';
  const name = cp.name;
  const dict = song.cifra?.digitacoes || null;
  const { shapes, selId } = pickerShapes(name, (dict && dict[name]) || null);
  const vw = window.innerWidth, vh = window.innerHeight;

  if (cp.modo === 'carrossel') {
    const w = Math.min(CAR_W, vw - 16);
    const p = popPosition(cp.anchor, w, CAR_H, vw, vh);
    return `<div class="chord-pop car" style="left:${p.left}px;top:${p.top}px;width:${w}px">
      <div class="nm">${esc(name)}</div>
      <div class="strip-wrap">${shapeStripHTML(name, shapes, cp.selId, 'chordPopSelect', false)}</div>
      <div class="foot">
        <button class="btn-icon xs" data-a="chordPopReset" title="Voltar à forma salva">${I.undo(16)}</button>
        <button class="btn-primary small" data-a="chordPopApply">Aplicar</button>
      </div>
    </div>`;
  }

  const p = popPosition(cp.anchor, MINI_W, MINI_H, vw, vh);
  const dots = shapes.length > 1
    ? `<div class="dots">${shapes.map((s) => `<span class="dot ${s.id === selId ? 'on' : ''}"></span>`).join('')}</div>` : '';
  return `<div class="chord-pop" style="left:${p.left}px;top:${p.top}px">
    <div class="nm">${esc(name)}</div>
    <div class="diag">${chordSVG(name, false, dict)}</div>
    ${dots}
    ${shapes.length
      ? `<button class="btn-ghost sm variar" data-a="chordPopVariar" ${shapes.length > 1 ? '' : 'disabled'}>Variar</button>`
      : '<div class="hint">Sem formas — crie em “Acordes desta música”</div>'}
  </div>`;
}
```

- [ ] **Step 3: Integração no `play.js`**

(a) Imports (linhas 7-9): adicionar `chordLineSegs` ao import de `../chords.js` e importar o popover:

```js
import { parseCifraText, extractChords, chordSVG, chordDiagWidth, layoutChordRow, chordLineSegs } from '../chords.js';
import { shapeById, pickerShapes } from '../chordbook.js';
import { chordEditorHTML, shapeStripHTML } from './chordeditor.js';
import { chordPopHTML, popPosition } from './chordpop.js';
```

(b) Linha de acordes tocável — nova função antes de `cifraTextHTML`:

```js
// Linha de acordes tocável: só tokens-acorde viram botão (mesma fonte/cor —
// visual idêntico); espaços seguem no fluxo do white-space:pre.
function chordLineHTML(chordLine) {
  return chordLineSegs(chordLine).map((sg) => (sg.isChord
    ? `<button class="ch-btn" data-a="openChordPop" data-id="${esc(sg.text)}">${esc(sg.text)}</button>`
    : esc(sg.text))).join('');
}
```

E em `cifraTextHTML` (linha 150), `<div class="ch">${esc(ln.chords)}</div>` vira:

```js
        : `<div class="ch">${chordLineHTML(ln.chords)}</div>`;
```

(c) Miniaturas inline abrem o popover — em `chordDiagRowHTML` (linha 132), trocar `data-a="openChordPicker"` por `data-a="openChordPop"` e `title="Trocar variação"` por `title="Ver acorde"`.

(d) Renderizar o card — em `renderPlay` (linha 369), após a linha do `chordPicker`:

```js
    ${S.chordPicker ? chordPickerHTML(song) : ''}
    ${S.chordPop ? chordPopHTML(song) : ''}
```

(e) Em `afterRenderPlay`, no bloco de wiring do `[data-autoscroll]` (dentro do `if (el && !el._ctlWired)`, ~linha 404), adicionar o fechamento por rolagem real:

```js
    el.addEventListener('scroll', () => {
      // rolagem real fecha o popover do acorde; o restoreUI do re-render repõe
      // o MESMO scrollTop, então não dispara este fechamento
      if (S.chordPop && Math.abs(el.scrollTop - S.chordPop.scrollTop) > 1) { S.chordPop = null; update(); }
    }, { passive: true });
```

E após esse bloco (fora do `if`), o re-clamp com o tamanho real do card:

```js
  // popover do acorde: re-posiciona com o tamanho real (o render usou estimativa)
  const pop = document.querySelector('.chord-pop');
  if (pop && S.chordPop) {
    const r = pop.getBoundingClientRect();
    const p = popPosition(S.chordPop.anchor, r.width, r.height, window.innerWidth, window.innerHeight);
    pop.style.left = p.left + 'px';
    pop.style.top = p.top + 'px';
  }
```

- [ ] **Step 4: CSS**

No fim de `app/css/app.css`:

```css
/* --- Popover do acorde na cifra (spec 2026-07-29) --- */
.ch-btn{font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer;white-space:pre}
.chord-pop{position:fixed;z-index:70;display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 16px;background:var(--surface);border:1px solid var(--border);border-radius:16px;box-shadow:0 16px 48px rgba(0,0,0,.5)}
.chord-pop .nm{font-family:var(--f-title);font-weight:700;font-size:15px;color:var(--accent)}
.chord-pop .dots{display:flex;gap:5px}
.chord-pop .dot{width:7px;height:7px;border-radius:50%;background:var(--muted3)}
.chord-pop .dot.on{background:var(--accent)}
.chord-pop .variar{width:100%}
.chord-pop .variar:disabled{opacity:.45;cursor:default}
.chord-pop .hint{font-size:12px;color:var(--muted);max-width:170px;text-align:center}
.chord-pop.car{align-items:stretch}
.chord-pop.car .strip-wrap{overflow-x:auto;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}
.chord-pop.car .strip-wrap .shape-strip{flex-wrap:nowrap;width:max-content;margin-top:0}
.chord-pop.car .strip-wrap .pick-opt{scroll-snap-align:center}
.chord-pop.car .foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:2px}
```

- [ ] **Step 5: Bump do Service Worker**

`app/sw.js:2` — `const VERSION = 'somaplay-v10';` vira `const VERSION = 'somaplay-v11';` (mudança de shell: js/css novos).

- [ ] **Step 6: Verify syntax + tests**

Run: `cd app && node --check js/render/chordpop.js && node --check js/render/play.js && node --check js/icons.js && node --test`
Expected: sem erro; todos os testes PASS.

- [ ] **Step 7: Verificação manual (checklist do spec §Verificação)**

Com `./serve.command` → http://localhost:8137/, numa música com cifra em **texto** (ex.: Andança):

1. Tocar um acorde no meio da música abre o mini com a forma atual (digitação da música ou padrão do dicionário).
2. As bolinhas batem com a posição da variação atual.
3. "Variar" → carrossel com a forma atual destacada; rolagem horizontal funciona.
4. Selecionar outra forma + "Aplicar" troca na cifra toda — grade, miniaturas inline e fixados juntos.
5. ↺ volta a seleção para a forma salva.
6. Tocar fora fecha sem aplicar; Escape também.
7. Rolagem manual fecha; rolagem automática ligada fecha no primeiro passo.
8. Acorde encostado na borda esquerda/direita/topo: card não corta (clamp/flip).
9. Zoom da cifra (menu ⋮ → zoom nas configurações): linha de acordes continua alinhada com a letra.
10. Acorde sem forma no dicionário mostra "?" e a dica; sem botão ativo de Variar.
11. Miniaturas inline (menu ⋮ → "Miniaturas na música") abrem o popover; a grade "Acordes desta música" abre o picker completo.
12. Tocar noutro acorde com o popover aberto reancora nele (um toque só).
13. Tema claro: card legível (usa tokens `--surface`/`--border`).

- [ ] **Step 8: Commit**

```bash
git add app/js/render/chordpop.js app/js/render/play.js app/js/icons.js app/css/app.css app/sw.js
git commit -m "feat(play): popover de acorde na cifra — toque abre diagrama, Variar/Aplicar troca na música

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Notas para o executor

- **Não** re-introduzir scrim sob o `.chord-pop` — o fechamento é pela delegação global (Task 4, Step 5a); um scrim quebraria o "tocar noutro acorde reancora".
- Toque em botões `data-a` fora do card (ex.: play/pause) **não** fecha o popover — aceito pelo design; só toque "morto" fecha.
- A ordem `${S.chordPicker ...}${S.chordPop ...}` no `renderPlay` importa pouco (não coexistem na prática), mas mantenha ambos após o corpo da tela.
- `chordSVG(name, false, dict)` já resolve digitação da música → padrão do dicionário → "?" — não duplicar essa cascata no popover.
