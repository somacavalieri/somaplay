# Reordenação por arraste nas Listas — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir as setas ↑/↓ da tela de Lista por reordenação com arraste (mouse e toque), com autoscroll nas bordas e ↑/↓ do teclado como ajuste fino.

**Architecture:** Um módulo novo e isolado, `app/js/render/listdrag.js`, cuida do arraste. Ele exporta quatro funções puras de geometria (testáveis em Node, sem DOM) e uma função de wiring `wireListDrag(root, { onReorder })` que não conhece `S`, listas nem músicas — só "linhas com índice que trocam de lugar". Durante o arraste o módulo manipula o DOM diretamente (`transform` e `textContent`); `update()` é chamado **uma única vez**, depois de soltar, porque `update()` reescreve o `innerHTML` do app inteiro e destruiria o elemento que está na mão do usuário.

**Tech Stack:** JavaScript ESM puro (sem build, sem dependências), Pointer Events, testes com `node:test`.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-07-30-reordenacao-drag-listas-design.md`. Toda decisão de comportamento vem dela.
- **Sem dependências novas.** O projeto é ESM puro servido estaticamente; nada de bibliotecas, bundler ou build.
- **Nenhum `update()` durante o arraste.** Só depois de soltar, uma vez.
- **Constantes exatas:** long-press `350ms`; tolerância que cancela o long-press `10px`; limiar que inicia o arraste pela alça no mouse `4px`; zona de autoscroll `80px`; velocidade máxima de autoscroll `14px` por frame; transição das linhas que deslizam `160ms`; animação de assentamento ao soltar `180ms`.
- **Sem alça** em listas de sistema (Favoritas) nem quando a lista tem uma única música.
- **Rodar testes:** de dentro de `app/`, `node --test test/*.test.js`. (Passar o diretório `test/` em vez do glob **falha** nesta versão do Node — use o glob.) Baseline atual: 117 testes passando.
- **Idioma:** código, comentários, mensagens de commit e textos de UI em português.
- **Todo arquivo `.js` novo em `app/js/` precisa entrar no `SHELL` do `app/sw.js`** e o `VERSION` precisa subir, senão o arquivo não existe offline.

---

### Task 1: `moveItem` puro + `reorderInList` no estado

Substitui o swap de uma posição (`moveInList`) por um reordenamento de qualquer origem para qualquer destino. A função pura `moveItem` é o que os testes cobrem; `reorderInList` é a casca fina que persiste.

**Files:**
- Modify: `app/js/state.js:188-195` (substitui `moveInList`)
- Modify: `docs/superpowers/specs/2026-07-30-reordenacao-drag-listas-design.md` (corrige §6 e a linha de `state.js` na tabela §5.2)
- Test: `app/test/listorder.test.js` (criar)

**Interfaces:**
- Consumes: nada de tarefas anteriores.
- Produces:
  - `moveItem(arr: any[], from: number, to: number): any[]` — devolve **cópia** do array com o item movido; não muta a entrada.
  - `reorderInList(listId: string, from: number, to: number): void` — aplica `moveItem` em `l.musicas` e chama `DB.putList(l)`. Ignora chamadas inválidas (lista inexistente, índices fora de faixa, `from === to`).

- [ ] **Step 1: Escrever o teste que falha**

Criar `app/test/listorder.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moveItem } from '../js/state.js';

test('moveItem: última para a primeira posição', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c', 'd'], 3, 0), ['d', 'a', 'b', 'c']);
});

test('moveItem: primeira para o fim', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c', 'd'], 0, 3), ['b', 'c', 'd', 'a']);
});

test('moveItem: um passo para baixo', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c'], 0, 1), ['b', 'a', 'c']);
});

test('moveItem: um passo para cima', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c'], 2, 1), ['a', 'c', 'b']);
});

test('moveItem: mesma posição não muda nada', () => {
  assert.deepEqual(moveItem(['a', 'b', 'c'], 1, 1), ['a', 'b', 'c']);
});

test('moveItem: não muta o array original', () => {
  const orig = ['a', 'b', 'c'];
  moveItem(orig, 2, 0);
  assert.deepEqual(orig, ['a', 'b', 'c']);
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

De dentro de `app/`:

```bash
node --test test/listorder.test.js
```

Esperado: FAIL — `The requested module '../js/state.js' does not provide an export named 'moveItem'`.

- [ ] **Step 3: Implementar**

Em `app/js/state.js`, substituir a função `moveInList` inteira (linhas 188-195) por:

```js
// Move um item de posição devolvendo uma cópia — não muta a entrada.
export function moveItem(arr, from, to) {
  const out = arr.slice();
  const [x] = out.splice(from, 1);
  out.splice(to, 0, x);
  return out;
}

export function reorderInList(listId, from, to) {
  const l = listById(listId);
  if (!l) return;
  const n = l.musicas.length;
  if (from === to || from < 0 || to < 0 || from >= n || to >= n) return;
  l.musicas = moveItem(l.musicas, from, to);
  DB.putList(l);
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

```bash
node --test test/listorder.test.js
```

Esperado: PASS, 6 testes.

- [ ] **Step 5: Corrigir a spec**

Dois pontos da spec estão errados ou desatualizados:

1. Em **§6 Verificação**, trocar a frase de abertura
   `Não há suíte de testes no projeto; a validação é manual, via Chrome DevTools MCP sobre o `serve.command`:`
   por:
   `O projeto tem suíte de testes (`node --test test/*.test.js`, 117 testes na linha de base). As funções puras de geometria e de reordenação entram nela; a parte de ponteiro/DOM é validada manualmente via Chrome DevTools MCP sobre o `serve.command`:`

2. Na tabela de **§5.2**, na linha de `app/js/state.js`, trocar
   `A `moveInList` atual (linhas 188-195) vira wrapper de uma linha sobre ela, para que teclado e arraste compartilhem o mesmo código de persistência`
   por:
   ``moveInList` é removida: teclado e arraste chamam `reorderInList` direto, então o wrapper seria código morto`

- [ ] **Step 6: Commit**

```bash
git add app/js/state.js app/test/listorder.test.js docs/superpowers/specs/2026-07-30-reordenacao-drag-listas-design.md
git commit -m "feat(state): reorderInList move de qualquer posição para qualquer outra"
```

---

### Task 2: Geometria pura do arraste

Todo o raciocínio numérico do arraste (para onde o item cai, quanto cada vizinha desliza, que número mostrar, quão rápido rolar) vive em funções puras, testadas sem DOM. O `wireListDrag` da Task 4 só as orquestra.

`step` é sempre a **altura da linha + o gap** entre linhas (`.rows` usa `gap:10px`).

**Files:**
- Create: `app/js/render/listdrag.js`
- Test: `app/test/listdrag.test.js` (criar)

**Interfaces:**
- Consumes: nada.
- Produces:
  - `dropIndex(from: number, dy: number, step: number, count: number): number` — índice de destino, já limitado a `[0, count-1]`.
  - `shiftFor(idx: number, from: number, to: number, step: number): number` — deslocamento em px da linha `idx` (a linha arrastada devolve `0`).
  - `posLabel(idx: number, from: number, to: number): number` — número de posição (1-based) a exibir na linha `idx` durante o arraste.
  - `edgeScroll(y: number, top: number, bottom: number, zone?: number, max?: number): number` — px por frame; negativo sobe, `0` fora das zonas de borda.

- [ ] **Step 1: Escrever o teste que falha**

Criar `app/test/listdrag.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dropIndex, shiftFor, posLabel, edgeScroll } from '../js/render/listdrag.js';

// step = altura da linha (66) + gap (10)
const STEP = 76;

test('dropIndex: sem deslocamento fica na mesma posição', () => {
  assert.equal(dropIndex(3, 0, STEP, 11), 3);
});

test('dropIndex: menos de meia linha não muda de posição', () => {
  assert.equal(dropIndex(3, 30, STEP, 11), 3);
  assert.equal(dropIndex(3, -30, STEP, 11), 3);
});

test('dropIndex: passando de meia linha cai na vizinha', () => {
  assert.equal(dropIndex(3, 45, STEP, 11), 4);
  assert.equal(dropIndex(3, -45, STEP, 11), 2);
});

test('dropIndex: da última para a primeira', () => {
  assert.equal(dropIndex(10, -10 * STEP, STEP, 11), 0);
});

test('dropIndex: limita nas duas pontas', () => {
  assert.equal(dropIndex(10, -5000, STEP, 11), 0);
  assert.equal(dropIndex(0, 5000, STEP, 11), 10);
});

test('shiftFor: arrastando para cima, as de cima descem uma linha', () => {
  assert.equal(shiftFor(0, 10, 0, STEP), STEP);
  assert.equal(shiftFor(9, 10, 0, STEP), STEP);
  assert.equal(shiftFor(10, 10, 0, STEP), 0); // a própria linha arrastada
});

test('shiftFor: arrastando para baixo, as de baixo sobem uma linha', () => {
  assert.equal(shiftFor(1, 0, 2, STEP), -STEP);
  assert.equal(shiftFor(2, 0, 2, STEP), -STEP);
  assert.equal(shiftFor(3, 0, 2, STEP), 0); // fora do intervalo afetado
});

test('shiftFor: sem movimento, ninguém desliza', () => {
  assert.equal(shiftFor(0, 5, 5, STEP), 0);
  assert.equal(shiftFor(7, 5, 5, STEP), 0);
});

test('posLabel: a linha arrastada mostra o destino', () => {
  assert.equal(posLabel(10, 10, 0), 1);
  assert.equal(posLabel(0, 0, 2), 3);
});

test('posLabel: arrastando para cima, as afetadas somam 1', () => {
  assert.equal(posLabel(0, 10, 0), 2);
  assert.equal(posLabel(9, 10, 0), 11);
});

test('posLabel: arrastando para baixo, as afetadas perdem 1', () => {
  assert.equal(posLabel(1, 0, 2), 1);
  assert.equal(posLabel(2, 0, 2), 2);
});

test('posLabel: fora do intervalo afetado, número original', () => {
  assert.equal(posLabel(3, 0, 2), 4);
  assert.equal(posLabel(4, 10, 8), 5);
});

test('edgeScroll: no meio da área não rola', () => {
  assert.equal(edgeScroll(500, 100, 900), 0);
});

test('edgeScroll: encostado no topo sobe na velocidade máxima', () => {
  assert.equal(edgeScroll(100, 100, 900), -14);
  assert.equal(edgeScroll(50, 100, 900), -14); // acima do topo continua no máximo
});

test('edgeScroll: encostado na base desce na velocidade máxima', () => {
  assert.equal(edgeScroll(900, 100, 900), 14);
  assert.equal(edgeScroll(950, 100, 900), 14);
});

test('edgeScroll: no meio da zona, velocidade proporcional', () => {
  assert.equal(edgeScroll(140, 100, 900), -7);  // 40px dentro de uma zona de 80
  assert.equal(edgeScroll(860, 100, 900), 7);
});
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

```bash
node --test test/listdrag.test.js
```

Esperado: FAIL — `Cannot find module .../js/render/listdrag.js`.

- [ ] **Step 3: Implementar**

Criar `app/js/render/listdrag.js` com **apenas** a geometria por enquanto (o wiring entra na Task 4). Nada de acesso a `document` no escopo do módulo — ele precisa importar limpo no Node.

```js
// render/listdrag.js — reordenação por arraste (mouse + toque), sem dependências.
// A geometria é pura e testada; o wiring de ponteiro vive em wireListDrag.

// Índice de destino para um deslocamento vertical de dy px.
export function dropIndex(from, dy, step, count) {
  const to = from + Math.round(dy / step);
  return Math.max(0, Math.min(count - 1, to));
}

// Quanto a linha idx desliza enquanto a linha `from` viaja até `to`.
export function shiftFor(idx, from, to, step) {
  if (idx === from) return 0;
  if (from < to && idx > from && idx <= to) return -step;
  if (from > to && idx >= to && idx < from) return step;
  return 0;
}

// Número de posição (1-based) exibido na linha idx durante o arraste.
export function posLabel(idx, from, to) {
  if (idx === from) return to + 1;
  if (from < to && idx > from && idx <= to) return idx;
  if (from > to && idx >= to && idx < from) return idx + 2;
  return idx + 1;
}

// Velocidade de autoscroll em px/frame quando o ponteiro entra nas bordas.
export function edgeScroll(y, top, bottom, zone = 80, max = 14) {
  if (y < top + zone) return -Math.round(max * Math.min(1, (top + zone - y) / zone));
  if (y > bottom - zone) return Math.round(max * Math.min(1, (y - (bottom - zone)) / zone));
  return 0;
}
```

- [ ] **Step 4: Rodar os testes e confirmar que passam**

```bash
node --test test/listdrag.test.js
node --test test/*.test.js
```

Esperado: 16 testes novos passando; a suíte inteira em 139 (117 + 6 + 16).

- [ ] **Step 5: Commit**

```bash
git add app/js/render/listdrag.js app/test/listdrag.test.js
git commit -m "feat(listdrag): geometria pura do arraste (destino, deslize, numeração, autoscroll)"
```

---

### Task 3: A alça na UI, sem as setas

Troca o par de setas pela alça ⠿ e liga o ajuste fino por teclado. Ao fim desta tarefa a tela já funciona **sem arraste**: a alça aparece, recebe foco e ↑/↓ movem a música. O arraste entra na Task 4.

**Files:**
- Modify: `app/js/icons.js` (novo ícone `grip`)
- Modify: `app/js/render/listscreen.js:36-54` (linha da música)
- Modify: `app/js/main.js:272-273` (ações `moveUp`/`moveDown`), `app/js/main.js:587-591` (`moveList`), `app/js/main.js:730+` (keydown), `app/js/main.js:88-121` (`afterRender`), `app/js/main.js:2-7` (import)
- Modify: `app/css/app.css:167-171` (bloco `.listsong-row` / `.updown` / `.pos-num`)

**Interfaces:**
- Consumes: `reorderInList(listId, from, to)` da Task 1.
- Produces:
  - Marcação: cada `.listsong-row` carrega `data-idx="<índice 0-based>"`; a alça é `button.drag-handle` com o mesmo `data-idx`.
  - `focusHandle(idx: number)` em `main.js` (módulo-local, não exportada): agenda o foco na alça de índice `idx` para depois do próximo `update()`.

- [ ] **Step 1: Adicionar o ícone da alça**

Em `app/js/icons.js`, dentro do objeto `I`, logo depois da linha do `dots` (linha 33):

```js
  grip: (w = 20) => fill(w, '<circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/>'),
```

- [ ] **Step 2: Trocar as setas pela alça na linha**

Em `app/js/render/listscreen.js`, substituir o bloco `const rows = ...` inteiro (linhas 36-54) por:

```js
  const total = l.musicas.length;
  const canDrag = !l.sistema && total > 1;

  const rows = l.musicas.map((id, idx) => {
    const so = songById(id);
    if (!so) return '';
    const handle = canDrag
      ? `<button class="drag-handle" data-idx="${idx}" title="Arraste para reordenar"
          aria-label="Reordenar: ${esc(so.title)}, posição ${idx + 1} de ${total}">${I.grip()}</button>`
      : '';
    return `<div class="listsong-row" data-idx="${idx}">
      ${handle}
      <div class="pos-num">${idx + 1}</div>
      <button class="btn-icon sm play-tint" data-a="openSong" data-id="${so.id}" data-from="list" title="Tocar">${I.play()}</button>
      <div style="flex:1;min-width:0;cursor:pointer" data-a="openSong" data-id="${so.id}" data-from="list">
        <div style="font-family:var(--f-title);font-weight:600;font-size:17px">${esc(so.title)}</div>
        <div style="color:var(--muted);font-size:13px;margin-top:2px">${esc(artistName(so))} · abre em ${bestLabel(so)}</div>
      </div>
      <button class="btn-icon sm ${so.favorita ? 'fav' : 'muted'}" data-a="toggleFav" data-id="${so.id}" title="Favoritar">${I.heart(so.favorita)}</button>
      <button class="btn-icon sm muted danger-h" data-a="removeFromList" data-id="${so.id}" title="Remover da lista">${I.minus()}</button>
    </div>`;
  }).join('');
```

Na linha 25, `cnt(l.musicas.length)` continua igual — `total` é só para o `aria-label`.

- [ ] **Step 3: Estilo da alça e dos estados de arraste**

Em `app/css/app.css`, substituir as linhas 167-171 (bloco `.listsong-row` até `.pos-num`) por:

```css
.listsong-row{display:flex;align-items:center;gap:14px;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:12px 16px;min-height:66px;touch-action:pan-y}
.pos-num{width:30px;text-align:center;font-family:var(--f-mono);color:var(--muted);font-size:15px}

/* --- Arraste para reordenar --- */
.drag-handle{width:34px;height:44px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:transparent;border:none;border-radius:8px;color:var(--knob);cursor:grab;touch-action:none}
.drag-handle:hover,.drag-handle:focus-visible{color:var(--text);background:var(--surface2)}
.drag-handle:active{cursor:grabbing}
.listsong-row.shifting{transition:transform 160ms ease}
.listsong-row.settling{transition:transform 180ms ease}
.listsong-row.dragging{position:relative;z-index:5;border-color:var(--accent);box-shadow:var(--shadow);opacity:.97;cursor:grabbing}
.rows.dragging-active{user-select:none}
.rows.dragging-active .listsong-row{cursor:grabbing}
```

Repare que `.updown` sai inteiro e que `.listsong-row` ganha `touch-action:pan-y` (a linha rola normalmente; só a alça, com `touch-action:none`, é que segura o dedo).

- [ ] **Step 4: Trocar as ações de seta pelo teclado na alça**

Em `app/js/main.js`:

1. No import de `./state.js` (linhas 2-7), trocar `moveInList` por `reorderInList`.

2. Remover as duas ações de seta (linhas 272-273):

```js
  moveUp(d) { moveList(+d.id, -1); },
  moveDown(d) { moveList(+d.id, +1); },
```

3. Remover a função `moveList` inteira (linhas 587-591) e, no lugar dela, colocar o par que serve alça e arraste:

```js
// Índice da alça que deve receber o foco depois do próximo render.
let pendingHandleIdx = null;
function focusHandle(idx) { pendingHandleIdx = idx; }

// Reordena e re-renderiza uma única vez. Usado pelo teclado e pelo arraste.
function applyReorder(from, to) {
  if (S.openListId === '__fav') return; // Favoritas: ordem automática
  reorderInList(S.openListId, from, to);
  update();
}
```

4. Em `afterRender()` (linhas 88-121), antes do bloco do `search`, adicionar a restauração de foco:

```js
  if (pendingHandleIdx != null) {
    document.querySelector(`.drag-handle[data-idx="${pendingHandleIdx}"]`)?.focus();
    pendingHandleIdx = null;
  }
```

5. No listener de `keydown` (a partir da linha 730), depois do bloco do `Escape`, adicionar:

```js
  // ↑/↓ com foco na alça movem a música uma posição (substitui as setas antigas)
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    const h = document.activeElement?.closest?.('.drag-handle');
    if (h) {
      const from = +h.dataset.idx;
      const to = from + (e.key === 'ArrowUp' ? -1 : 1);
      const l = listById(S.openListId);
      if (l && to >= 0 && to < l.musicas.length) {
        e.preventDefault();
        focusHandle(to);
        applyReorder(from, to);
      }
    }
  }
```

- [ ] **Step 5: Conferir que nada ficou órfão**

```bash
cd app && grep -rn "moveInList\|moveUp\|moveDown\|updown" js/ css/
```

Esperado: **nenhuma linha**. Se algo aparecer, é resto das setas — remova.

```bash
node --test test/*.test.js
```

Esperado: 139 passando (nada quebrou).

- [ ] **Step 6: Conferir no navegador**

Subir o servidor (na raiz do projeto): `./serve.command` e abrir a lista "Friage muderna".

Verificar: a alça ⠿ aparece no lugar das setas; Favoritas **não** tem alça; `Tab` chega na alça e ela acende; com foco nela, ↑ e ↓ movem a música e o foco acompanha; recarregar a página mantém a nova ordem.

- [ ] **Step 7: Commit**

```bash
git add app/js/icons.js app/js/render/listscreen.js app/js/main.js app/css/app.css
git commit -m "feat(listas): alça de reordenação no lugar das setas, com ajuste fino no teclado"
```

---

### Task 4: O arraste

Fecha o recurso: alça arrastável no mouse e no dedo, long-press na linha, deslize das vizinhas, numeração ao vivo, autoscroll nas bordas, `Esc` para cancelar e supressão do clique pós-arraste.

**Files:**
- Modify: `app/js/render/listdrag.js` (acrescenta `wireListDrag` abaixo da geometria)
- Modify: `app/js/main.js` (import + wiring em `afterRender`)
- Modify: `app/sw.js:3-45` (SHELL) e `app/sw.js:2` (VERSION)

**Interfaces:**
- Consumes: `dropIndex`, `shiftFor`, `posLabel`, `edgeScroll` da Task 2; a marcação `data-idx` e as classes CSS da Task 3; `applyReorder(from, to)` e `focusHandle(idx)` da Task 3.
- Produces: `wireListDrag(root: HTMLElement, opts: { onReorder: (from: number, to: number) => void }): void` — liga o arraste nas `.listsong-row` filhas de `root`. Idempotente por render: os únicos listeners persistentes ficam em `root` (que morre junto com o DOM no próximo `update()`); os de janela são adicionados e removidos por gesto, então não acumulam.

- [ ] **Step 1: Implementar `wireListDrag`**

Acrescentar ao fim de `app/js/render/listdrag.js`:

```js
const LONG_PRESS_MS = 350;  // segurar a linha para pegar
const CANCEL_TOL = 10;      // mover mais que isso antes do tempo = scroll, não arraste
const HANDLE_TOL = 4;       // pela alça no mouse, arraste começa após este movimento

// Liga o arraste nas linhas filhas de `root`. Chame depois de cada render.
export function wireListDrag(root, { onReorder }) {
  const scroller = root.closest('.content-scroll') || document.scrollingElement;
  let drag = null;    // arraste em curso
  let press = null;   // toque/clique pendente, ainda não virou arraste
  let raf = 0;
  let suppressClick = false;

  const rowsOf = () => [...root.querySelectorAll('.listsong-row')];

  function clearPress() {
    if (press?.timer) clearTimeout(press.timer);
    press = null;
  }

  function paint() {
    const { row, list, from, to, step, dy } = drag;
    // O scale vem junto no transform (e não no CSS) porque o translateY o sobrescreveria.
    row.style.transform = `translateY(${dy}px) scale(1.02)`;
    list.forEach((r, i) => {
      if (r !== row) r.style.transform = `translateY(${shiftFor(i, from, to, step)}px)`;
      const n = r.querySelector('.pos-num');
      if (n) n.textContent = posLabel(i, from, to);
    });
  }

  function tick() {
    raf = 0;
    if (!drag) return;
    const box = scroller.getBoundingClientRect();
    const v = edgeScroll(drag.pointerY, box.top, box.bottom);
    if (v) {
      const before = scroller.scrollTop;
      scroller.scrollTop += v;
      if (scroller.scrollTop !== before) recompute();
    }
    raf = requestAnimationFrame(tick);
  }

  // dy é medido em coordenadas do conteúdo: o que o ponteiro andou mais o que a lista rolou.
  function recompute() {
    drag.dy = (drag.pointerY - drag.startY) + (scroller.scrollTop - drag.scrollTop0);
    drag.to = dropIndex(drag.from, drag.dy, drag.step, drag.list.length);
    paint();
  }

  function start(row, clientY, pointerId) {
    const list = rowsOf();
    const from = list.indexOf(row);
    if (from < 0 || list.length < 2) { clearPress(); return; }
    const h = row.getBoundingClientRect().height;
    const gap = parseFloat(getComputedStyle(root).rowGap) || 0;
    drag = {
      row, list, from, to: from, step: h + gap, dy: 0,
      startY: clientY, pointerY: clientY, scrollTop0: scroller.scrollTop,
    };
    clearPress();
    list.forEach((r) => { if (r !== row) r.classList.add('shifting'); });
    row.classList.add('dragging');
    root.classList.add('dragging-active');
    try { row.setPointerCapture(pointerId); } catch (err) { /* ponteiro já solto */ }
    navigator.vibrate?.(15);
    window.addEventListener('keydown', onKey, true);
    raf = requestAnimationFrame(tick);
  }

  function end(commit) {
    if (!drag) { clearPress(); return; }
    const { row, list, from, to, step } = drag;
    const target = commit ? to : from;
    cancelAnimationFrame(raf); raf = 0;
    window.removeEventListener('keydown', onKey, true);
    drag = null;
    suppressClick = true;

    // Assenta a linha no lugar final antes de devolver o controle ao render.
    row.classList.add('settling');
    row.style.transform = `translateY(${(target - from) * step}px)`;
    setTimeout(() => {
      list.forEach((r, i) => {
        r.classList.remove('shifting', 'settling', 'dragging');
        r.style.transform = '';
        const n = r.querySelector('.pos-num');
        if (n) n.textContent = i + 1;
      });
      root.classList.remove('dragging-active');
      if (target !== from) onReorder(from, target);
    }, 180);
  }

  function onKey(e) {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    end(false);
  }

  function onMove(e) {
    if (!drag) {
      if (!press) return;
      const dx = Math.abs(e.clientX - press.x);
      const dy = Math.abs(e.clientY - press.y);
      if (press.viaHandle) {
        if (dy > HANDLE_TOL) start(press.row, press.y, press.pointerId);
      } else if (dx > CANCEL_TOL || dy > CANCEL_TOL) {
        clearPress(); // virou scroll
      }
      return;
    }
    e.preventDefault();
    drag.pointerY = e.clientY;
    recompute();
  }

  function onUp() {
    if (drag) end(true);
    else clearPress();
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
  }

  function onCancel() {
    if (drag) end(false);
    else clearPress();
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
  }

  root.addEventListener('pointerdown', (e) => {
    if (e.button != null && e.button !== 0) return;
    const row = e.target.closest('.listsong-row');
    if (!row || !root.contains(row)) return;
    suppressClick = false;
    const handle = e.target.closest('.drag-handle');
    // Sem alça na linha = lista de sistema ou lista de uma música: não arrasta.
    if (!row.querySelector('.drag-handle')) return;

    press = { row, x: e.clientX, y: e.clientY, pointerId: e.pointerId, viaHandle: !!handle, timer: null };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);

    if (handle) {
      // No dedo a alça pega na hora; no mouse espera um movimento mínimo.
      if (e.pointerType !== 'mouse') { e.preventDefault(); start(row, e.clientY, e.pointerId); }
      return;
    }
    // Long-press só na área "morta" da linha — botões continuam sendo botões.
    if (e.target.closest('button,[data-a]')) { clearPress(); return; }
    press.timer = setTimeout(() => start(row, press.y, press.pointerId), LONG_PRESS_MS);
  });

  // Depois de arrastar, o clique que o navegador dispara não deve abrir a música.
  root.addEventListener('click', (e) => {
    if (!suppressClick) return;
    suppressClick = false;
    e.stopPropagation();
    e.preventDefault();
  }, true);
}
```

- [ ] **Step 2: Ligar na tela de Lista**

Em `app/js/main.js`:

1. Junto dos outros imports de `./render/`, adicionar:

```js
import { wireListDrag } from './render/listdrag.js';
```

2. Em `afterRender()`, logo depois do bloco `if (pendingHandleIdx != null) { ... }` da Task 3:

```js
  if (S.screen === 'list') {
    const rows = document.querySelector('.rows');
    if (rows?.querySelector('.drag-handle')) {
      wireListDrag(rows, { onReorder: (from, to) => { focusHandle(to); applyReorder(from, to); } });
    }
  }
```

- [ ] **Step 3: Registrar no Service Worker**

Em `app/sw.js`:

1. Linha 2: `const VERSION = 'somaplay-v12';` → `const VERSION = 'somaplay-v13';`
2. No array `SHELL`, depois de `'./js/render/listscreen.js',` (linha 21), acrescentar:

```js
  './js/render/listdrag.js',
```

- [ ] **Step 4: Rodar os testes**

```bash
cd app && node --test test/*.test.js
```

Esperado: 139 passando. A geometria não mudou; isto é uma rede de segurança contra erro de digitação no arquivo.

- [ ] **Step 5: Commit**

```bash
git add app/js/render/listdrag.js app/js/main.js app/sw.js
git commit -m "feat(listas): arraste para reordenar com long-press, autoscroll e cancelamento"
```

---

### Task 5: Verificação no navegador

O arraste é 100% interação de ponteiro — nenhum teste unitário cobre isso. Esta tarefa é a prova de que funciona, com a spec §6 como roteiro. Use o Chrome DevTools MCP.

**Files:**
- Nenhum arquivo novo. Correções que aparecerem entram nos arquivos das Tasks 3 e 4.

**Interfaces:**
- Consumes: tudo das Tasks 1-4.
- Produces: recurso verificado; nenhuma interface nova.

- [ ] **Step 1: Subir o app**

Na raiz do projeto: `./serve.command`. Abrir a URL local, ir em **Listas → Friage muderna** (11 músicas).

- [ ] **Step 2: Mouse — o caso que originou tudo**

Arrastar a 11ª música até a 1ª posição **num único gesto**, segurando o ponteiro no topo da área rolável para o autoscroll trabalhar.

Esperado: a lista rola sozinha ao encostar a 80px do topo; as vizinhas deslizam; os números renumeram durante o arraste; ao soltar, "Com Açúcar, Com Afeto" está em 1 e a numeração 1-11 está correta.

- [ ] **Step 3: Toque emulado**

Em `Emulation`, ligar emulação de touch (`emulate` com um dispositivo móvel) e repetir:

1. Segurar 350ms no meio de uma linha → a música é pega (a linha ganha borda de destaque).
2. Swipe rápido na linha (sem segurar) → a lista **rola**, nada é pego.
3. Arrastar pela alça → pega imediatamente, sem espera.

- [ ] **Step 4: Teclado**

`Tab` até uma alça, ↑ e ↓ movem a música uma posição por vez e o foco acompanha a música movida.

- [ ] **Step 5: Cancelamento e clique**

1. Começar um arraste, apertar `Esc` no meio → a música volta para o lugar de origem, a numeração volta ao normal e nada é gravado.
2. Pegar uma música e soltá-la no mesmo lugar → **não** abre a tela de toque.
3. Um clique simples na linha (sem arrastar) → abre a música normalmente.

- [ ] **Step 6: Persistência e listas especiais**

1. Recarregar a página (F5) → a ordem nova continua lá (veio do IndexedDB).
2. Abrir **Favoritas** → nenhuma alça, e long-press na linha não pega nada.
3. Abrir uma lista com **uma única música** → nenhuma alça.

- [ ] **Step 7: Console limpo**

`list_console_messages`: nenhum erro novo. `list_network_requests`: `listdrag.js` carregou (200).

- [ ] **Step 8: Commit de qualquer correção**

Se algum passo falhou e exigiu ajuste:

```bash
git add -A app/
git commit -m "fix(listas): <o que foi corrigido na verificação>"
```

Se nada falhou, não há o que commitar — a verificação em si não gera arquivo.

---

## Notas de execução

- **A ordem importa.** As Tasks 1 e 2 são independentes entre si, mas a 3 depende da 1 e a 4 depende da 2 e da 3.
- **A Task 3 é entregável sozinha:** se algo der errado na 4, a tela ainda funciona (alça + teclado), sem regressão em relação às setas.
- **Ao terminar a Task 5,** vale atualizar a spec principal do produto (`docs/superpowers/specs/2026-06-25-soma-play-design.md`, §7 Listas) mencionando que a ordem manual é feita por arraste — a convenção do projeto é manter o PRD vivo.
