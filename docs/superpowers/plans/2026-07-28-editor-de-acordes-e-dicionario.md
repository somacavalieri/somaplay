# Editor de acordes (pestana) & Dicionário de acordes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Editor de casas com **pestana** e casa base, reaproveitado em três telas, mais um **Dicionário de acordes** editável em Configurações que acumula as variações e as oferece em todas as músicas — e a correção da rolagem que sobe a cada toque.

**Architecture:** Spec: [`docs/superpowers/specs/2026-07-28-editor-de-acordes-e-dicionario-design.md`](../specs/2026-07-28-editor-de-acordes-e-dicionario-design.md). O dicionário é **sobreposição**: `chords-catalog.js` continua semente só-leitura (ids sintéticos `b:<nome>:<i>`) e o delta do usuário vive num store novo do IndexedDB; a fusão é uma função **pura** (`mergeShapes`), o que deixa toda a regra testável em `node --test` sem DOM nem IndexedDB. O editor segue o padrão de render por string do app: **reducers puros** (`toggleBarre`, `tapCell`, `tapHead`) + um builder de HTML, sem manipular DOM.

**Desvio deliberado do spec §13:** a tela do dicionário fica em `app/js/render/chordbookscreen.js` (não `render/chordbook.js`), para não existirem dois `chordbook.js` no projeto — mesmo padrão de `render/listscreen.js`.

**Tech Stack:** Vanilla ES modules, sem dependências. Testes: rodar de `app/`: `node --test 'test/*.test.js'` — **com aspas** (`node --test test/` falha neste Node).

## Global Constraints

- Todo texto de UI, comentários e commits em **português** (padrão do projeto).
- Sem toolchain: nenhum `npm install`, nenhum import de fora de `app/js/`.
- Render por string: nada de manipular DOM dentro dos renders (medição por canvas é permitida).
- Formato da forma, inalterado: `{ frets:[Mi grave, Lá, Ré, Sol, Si, Mi agudo], barre?:{fret,from,to} }` · `-1` = abafada, `0` = solta, `n` = casa. Índices de corda 0..5 (0 = Mi grave).
- Ids de variação: embutida `b:<nome>:<índice>`, do usuário `u:<uid()>`.
- Bump do Service Worker uma única vez, na Task 8: `somaplay-v9` → `somaplay-v10`.
- Baseline de testes: **25 passando** antes da Task 1; nenhuma task pode reduzir isso.
- Um commit por task, mensagens no padrão `feat(...)`/`fix(...)`/`test(...)` do histórico.

---

### Task 1: Rolagem e foco preservados no re-render

Hoje `update()` só preserva a rolagem da tela *play*; em qualquer outra tela o `app.innerHTML = html` recria o `.content-scroll` e a página volta ao topo — é o bug que atrapalha editar casas. A mesma troca de HTML também derruba o foco de inputs, o que vai quebrar a busca do dicionário (Task 7) e o campo de rótulo do editor (Task 5). Os dois se resolvem no mesmo lugar.

**Files:**
- Modify: `app/js/main.js:34-53` (função `update`)

**Interfaces:**
- Consumes: nada novo.
- Produces: `update()` com a mesma assinatura; passa a restaurar `scrollTop` de todo `.content-scroll` / `[data-autoscroll]` e o foco/cursor de `input[type=text]`/`textarea` **quando a tela renderizada é a mesma da renderização anterior**.

- [ ] **Step 1: Substituir a função `update`**

Em `app/js/main.js`, trocar o bloco `// ---------- render ----------` inteiro (linhas 33-53) por:

```js
// ---------- render ----------
let lastScreen = null;

// Rolagens e foco só são preservados quando a tela é a mesma da renderização
// anterior — trocar de tela continua começando do topo.
function captureUI(same) {
  if (!same) return null;
  const scrolls = [...document.querySelectorAll('.content-scroll,[data-autoscroll]')].map((el) => el.scrollTop);
  const a = document.activeElement;
  const focus = a && a.id && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && a.type === 'text'))
    ? { id: a.id, start: a.selectionStart, end: a.selectionEnd }
    : null;
  return { scrolls, focus };
}

function restoreUI(snap) {
  if (!snap) return;
  const els = document.querySelectorAll('.content-scroll,[data-autoscroll]');
  els.forEach((el, i) => { if (snap.scrolls[i] != null) el.scrollTop = snap.scrolls[i]; });
  if (!snap.focus) return;
  const el = document.getElementById(snap.focus.id);
  if (!el) return;
  el.focus();
  try { el.setSelectionRange(snap.focus.start, snap.focus.end); } catch (e) { /* tipo sem seleção */ }
}

export function update() {
  const scr = S.screen;
  const snap = captureUI(lastScreen === scr);
  let html = '';
  if (scr === 'home') html = renderHome();
  else if (scr === 'artist') html = renderArtist();
  else if (scr === 'estilo') html = renderEstilo();
  else if (scr === 'list') html = renderListScreen();
  else if (scr === 'play') html = renderPlay();
  else if (scr === 'addedit') html = renderAddEdit();
  else if (scr === 'settings') html = renderSettings();
  html += renderPopover();
  app.innerHTML = html;
  restoreUI(snap);
  lastScreen = scr;
  afterRender();
}
```

- [ ] **Step 2: Verificar sintaxe e testes**

Run: `cd app && node --check js/main.js && node --test 'test/*.test.js' 2>&1 | tail -5`
Expected: sem saída do `--check`; `pass 25 · fail 0`.

- [ ] **Step 3: Verificar no navegador**

Run: `cd app && python3 -m http.server 8137` e abrir `http://localhost:8137`.

Conferir:
1. Configurações → **Adicionar música** → Fonte da cifra **Texto** → colar qualquer cifra com acordes → **Detectar acordes** → rolar até as digitações → tocar num acorde e depois numa casa: **a página não sobe mais**.
2. Home → abrir uma música com cifra em texto → rolar → tocar num acorde (abre o seletor) → fechar: a cifra continua na mesma altura (comportamento antigo preservado).
3. Voltar para a Home: a lista começa do topo (troca de tela ainda reseta).

- [ ] **Step 4: Commit**

```bash
git add app/js/main.js
git commit -m "fix(render): preserva rolagem e foco entre re-renders da mesma tela"
```

---

### Task 2: `chordbook.js` — fusão pura do dicionário

O coração do dicionário: dadas as formas embutidas de um nome e o registro do usuário, produzir a lista fundida (override no lugar, lápide escondendo, padrão resolvida). Tudo puro, sem estado nem IndexedDB — é o que permite testar a regra inteira em Node.

**Files:**
- Create: `app/js/chordbook.js`
- Test: `app/test/chordbook.test.js` (criar)

**Interfaces:**
- Consumes: `CATALOG` de `chords-catalog.js`.
- Produces:
  - `builtinShapes(name) -> [{...forma, id:'b:<name>:<i>', origin:'builtin'}]`
  - `mergeShapes(builtins, rec) -> [{ id, frets, barre?, label?, origin:'builtin'|'user', isDefault }]` (pura)
  - `shapeKey(shape) -> string` — identidade da forma (frets + pestana), usada para dedupe
  - `mergeRecords(local, incoming) -> rec` (pura; usada no backup da Task 8)
  - `songsUsingVar(songs, name, varId) -> [song]` (pura; usada na propagação da Task 6)
  - Formato do registro: `{ name, vars:[{id,frets,barre?,label}], hidden:[id], defaultId }`

- [ ] **Step 1: Escrever os testes que falham**

Criar `app/test/chordbook.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { builtinShapes, mergeShapes, shapeKey, mergeRecords, songsUsingVar } from '../js/chordbook.js';

test('builtinShapes: ids sintéticos pela posição no catálogo', () => {
  const l = builtinShapes('E7'); // E7 tem 2 formas no catálogo
  assert.equal(l.length, 2);
  assert.equal(l[0].id, 'b:E7:0');
  assert.equal(l[1].id, 'b:E7:1');
  assert.equal(l[0].origin, 'builtin');
});

test('builtinShapes: nome desconhecido → lista vazia', () => {
  assert.deepEqual(builtinShapes('Zx9'), []);
});

test('mergeShapes: sem delta do usuário sai o catálogo com a padrão marcada', () => {
  const l = mergeShapes(builtinShapes('E7'), null);
  assert.equal(l.length, 2);
  assert.equal(l[0].isDefault, true);
  assert.equal(l[1].isDefault, false);
});

test('mergeShapes: variação do usuário entra depois das embutidas', () => {
  const rec = { name: 'E7', vars: [{ id: 'u:1', frets: [0, 2, 0, 1, 3, 0], label: 'minha' }], hidden: [], defaultId: null };
  const l = mergeShapes(builtinShapes('E7'), rec);
  assert.equal(l.length, 3);
  assert.equal(l[2].id, 'u:1');
  assert.equal(l[2].origin, 'user');
});

test('mergeShapes: override por id substitui a embutida no lugar dela', () => {
  const rec = { name: 'E7', vars: [{ id: 'b:E7:0', frets: [0, 2, 0, 1, 0, 3], label: 'corrigida' }], hidden: [], defaultId: null };
  const l = mergeShapes(builtinShapes('E7'), rec);
  assert.equal(l.length, 2);
  assert.equal(l[0].id, 'b:E7:0');
  assert.equal(l[0].label, 'corrigida');
  assert.deepEqual(l[0].frets, [0, 2, 0, 1, 0, 3]);
  assert.equal(l[0].origin, 'user');
});

test('mergeShapes: override sem pestana apaga a pestana da embutida', () => {
  // F embutido tem barre {fret:1,from:0,to:5}; o override não tem
  const rec = { name: 'F', vars: [{ id: 'b:F:0', frets: [-1, -1, 3, 2, 1, 1] }], hidden: [], defaultId: null };
  const l = mergeShapes(builtinShapes('F'), rec);
  assert.equal(l[0].barre, undefined);
});

test('mergeShapes: lápide esconde a embutida e a padrão cai para a que sobrou', () => {
  const rec = { name: 'E7', vars: [], hidden: ['b:E7:0'], defaultId: null };
  const l = mergeShapes(builtinShapes('E7'), rec);
  assert.equal(l.length, 1);
  assert.equal(l[0].id, 'b:E7:1');
  assert.equal(l[0].isDefault, true);
});

test('mergeShapes: defaultId do usuário vence o default do catálogo', () => {
  const rec = { name: 'E7', vars: [], hidden: [], defaultId: 'b:E7:1' };
  const l = mergeShapes(builtinShapes('E7'), rec);
  assert.equal(l[0].isDefault, false);
  assert.equal(l[1].isDefault, true);
});

test('mergeShapes: defaultId órfão volta para o padrão do catálogo', () => {
  const rec = { name: 'E7', vars: [], hidden: [], defaultId: 'u:apagada' };
  const l = mergeShapes(builtinShapes('E7'), rec);
  assert.equal(l[0].isDefault, true);
});

test('shapeKey: pestana faz parte da identidade da forma', () => {
  const a = shapeKey({ frets: [1, 3, 3, 2, 1, 1], barre: { fret: 1, from: 0, to: 5 } });
  const b = shapeKey({ frets: [1, 3, 3, 2, 1, 1] });
  assert.notEqual(a, b);
  assert.equal(shapeKey({ frets: [1, 3, 3, 2, 1, 1] }), b);
});

test('mergeRecords: une por id e o local vence o conflito', () => {
  const local = { name: 'C', vars: [{ id: 'u:1', frets: [1, 1, 1, 1, 1, 1], label: 'local' }], hidden: ['b:C:0'], defaultId: 'u:1' };
  const inc = { name: 'C', vars: [{ id: 'u:1', frets: [2, 2, 2, 2, 2, 2], label: 'importada' }, { id: 'u:2', frets: [3, 3, 3, 3, 3, 3] }], hidden: ['b:C:9'], defaultId: 'u:2' };
  const m = mergeRecords(local, inc);
  assert.equal(m.vars.length, 2);
  assert.equal(m.vars[0].label, 'local');
  assert.deepEqual(m.hidden.slice().sort(), ['b:C:0', 'b:C:9']);
  assert.equal(m.defaultId, 'u:1');
});

test('mergeRecords: sem registro local adota o importado', () => {
  const m = mergeRecords(null, { name: 'C', vars: [{ id: 'u:9', frets: [0, 0, 0, 0, 0, 0] }], hidden: [], defaultId: 'u:9' });
  assert.equal(m.name, 'C');
  assert.equal(m.vars.length, 1);
  assert.equal(m.defaultId, 'u:9');
});

test('songsUsingVar: só as músicas que apontam para aquela variação', () => {
  const songs = [
    { id: 's1', cifra: { digitacoes: { Bb7M: { frets: [], varId: 'u:1' } } } },
    { id: 's2', cifra: { digitacoes: { Bb7M: { frets: [], varId: 'u:2' } } } },
    { id: 's3', cifra: { digitacoes: { Bb7M: { frets: [] } } } }, // legado, sem varId
    { id: 's4', cifra: { digitacoes: {} } },
    { id: 's5' },
  ];
  assert.deepEqual(songsUsingVar(songs, 'Bb7M', 'u:1').map((s) => s.id), ['s1']);
});
```

- [ ] **Step 2: Rodar os testes e ver falhar**

Run: `cd app && node --test 'test/*.test.js' 2>&1 | tail -6`
Expected: FAIL — erro de import (`Cannot find module .../js/chordbook.js`); os 25 antigos seguem passando.

- [ ] **Step 3: Criar `app/js/chordbook.js` com a parte pura**

```js
// chordbook.js — dicionário de acordes: catálogo embutido (semente só-leitura) +
// delta do usuário no IndexedDB, fundidos em leitura.
// forma fundida: { id, frets, barre?, label?, origin:'builtin'|'user', isDefault }
// registro do usuário: { name, vars:[{id,frets,barre?,label}], hidden:[id], defaultId }
import { CATALOG } from './chords-catalog.js';

// Formas embutidas de um nome, com id sintético pela posição no catálogo.
export function builtinShapes(name) {
  return (CATALOG[name] || []).map((s, i) => ({ ...s, id: `b:${name}:${i}`, origin: 'builtin' }));
}

// Identidade de uma forma (casas + pestana) — usada para não duplicar variação.
export function shapeKey(s) {
  return s.frets.join(',') + '|' + (s.barre ? `${s.barre.fret}:${s.barre.from}-${s.barre.to}` : '');
}

// Funde embutidas + delta do usuário. Override (id 'b:...') entra no lugar da
// embutida; lápide esconde; variações novas vão para o fim.
export function mergeShapes(builtins, rec) {
  const hidden = new Set((rec && rec.hidden) || []);
  const vars = (rec && rec.vars) || [];
  const byId = new Map(vars.map((v) => [v.id, v]));
  const out = [];
  for (const b of builtins) {
    if (hidden.has(b.id)) continue;
    const ov = byId.get(b.id);
    if (!ov) { out.push(b); continue; }
    const m = { ...b, ...ov, id: b.id, origin: 'user' };
    if (!ov.barre) delete m.barre;   // o usuário tirou a pestana da embutida
    out.push(m);
  }
  for (const v of vars) if (!v.id.startsWith('b:')) out.push({ ...v, origin: 'user' });
  const wanted = rec && rec.defaultId;
  const defId = (wanted && out.some((s) => s.id === wanted) ? wanted : null)
    || (out.find((s) => s.default) || {}).id
    || (out[0] ? out[0].id : null);
  return out.map((s) => ({ ...s, isDefault: s.id === defId }));
}

// Reconciliação de dois registros no import com merge — o local vence o conflito.
export function mergeRecords(local, incoming) {
  const inc = incoming || {};
  const base = local || { name: inc.name, vars: [], hidden: [], defaultId: null };
  const ids = new Set((base.vars || []).map((v) => v.id));
  return {
    name: base.name,
    vars: [...(base.vars || []), ...((inc.vars || []).filter((v) => !ids.has(v.id)))],
    hidden: [...new Set([...(base.hidden || []), ...(inc.hidden || [])])],
    defaultId: base.defaultId || inc.defaultId || null,
  };
}

// Músicas que apontam para uma variação (via digitacoes[nome].varId).
export function songsUsingVar(songs, name, varId) {
  if (!varId) return [];
  return (songs || []).filter((s) => {
    const d = s && s.cifra && s.cifra.digitacoes && s.cifra.digitacoes[name];
    return !!d && d.varId === varId;
  });
}
```

- [ ] **Step 4: Rodar os testes e ver passar**

Run: `cd app && node --test 'test/*.test.js' 2>&1 | tail -6`
Expected: `pass 38 · fail 0` (25 antigos + 13 novos).

- [ ] **Step 5: Commit**

```bash
git add app/js/chordbook.js app/test/chordbook.test.js
git commit -m "feat(chordbook): fusão pura de catálogo embutido + delta do usuário"
```

---

### Task 3: Persistência do dicionário e resolução de forma pelo `chordbook`

Agora o estado: o mapa em memória, as mutações (criar, apagar, padrão, restaurar) persistindo no IndexedDB, e o `chords.js` deixando de consultar o catálogo direto.

**Files:**
- Modify: `app/js/db.js:6-27` (versão + store) e `app/js/db.js:72-86` (métodos)
- Modify: `app/js/chordbook.js` (acrescentar a camada com estado)
- Modify: `app/js/chords.js:1-4,91-98` (importar `defaultShape`)
- Modify: `app/js/state.js:96-106` (carregar no boot)
- Test: `app/test/chordbook.test.js` (acrescentar)

**Interfaces:**
- Consumes: `mergeShapes`, `builtinShapes`, `shapeKey` (Task 2); `DB`, `uid` de `db.js`.
- Produces:
  - `loadChordbook() -> Promise<void>` · `chordbookRecords() -> [rec]`
  - `shapesOf(name) -> [forma fundida]` · `defaultShape(name) -> forma|null` · `shapeById(name, id) -> forma|null`
  - `findShape(name, frets, barre) -> forma|null` (dedupe) · `labelsOf(name) -> [string]`
  - `upsertVar(name, shape) -> id` · `removeVar(name, id)` · `setDefault(name, id)` · `restoreBuiltins(name)` · `hasHidden(name) -> bool`
  - `allNames() -> [string]` (catálogo ∪ dicionário, ordenado)
  - `replaceChordbook(recs) -> Promise` · `mergeChordbookRecords(recs) -> Promise` (Task 8)
  - `DB.loadChordbook()` · `DB.putChordName(rec)` · `DB.clearChordbook()`

- [ ] **Step 1: Escrever os testes que falham**

Em `app/test/chordbook.test.js`, acrescentar os nomes novos ao import que já existe no topo:

```js
import {
  builtinShapes, mergeShapes, shapeKey, mergeRecords, songsUsingVar,
  shapesOf, defaultShape, shapeById, findShape, labelsOf,
  upsertVar, removeVar, setDefault, restoreBuiltins, hasHidden, allNames,
} from '../js/chordbook.js';
```

E os testes ao fim do arquivo (cada um usa um nome de acorde diferente — o estado do módulo é global no processo):

```js
test('upsertVar: cria variação nova com id u: e ela aparece em shapesOf', () => {
  const id = upsertVar('A7', { frets: [-1, 0, 2, 0, 2, 3], label: 'com 9ª' });
  assert.ok(id.startsWith('u:'));
  const l = shapesOf('A7');
  assert.equal(l.length, 2); // 1 embutida + 1 nova
  assert.equal(l[1].id, id);
  assert.equal(l[1].label, 'com 9ª');
});

test('upsertVar com id existente atualiza no lugar (não duplica)', () => {
  const id = upsertVar('Am7', { frets: [-1, 0, 2, 0, 1, 3] });
  upsertVar('Am7', { id, frets: [-1, 0, 2, 0, 1, 0], label: 'ajustada' });
  const l = shapesOf('Am7');
  assert.equal(l.length, 2);
  assert.deepEqual(l[1].frets, [-1, 0, 2, 0, 1, 0]);
  assert.equal(l[1].label, 'ajustada');
});

test('upsertVar com id de embutida vira override e o desenho muda', () => {
  upsertVar('D7', { id: 'b:D7:0', frets: [-1, -1, 0, 2, 1, 3] });
  const l = shapesOf('D7');
  assert.equal(l.length, 1);
  assert.deepEqual(l[0].frets, [-1, -1, 0, 2, 1, 3]);
  assert.deepEqual(defaultShape('D7').frets, [-1, -1, 0, 2, 1, 3]);
});

test('removeVar: variação do usuário some da lista', () => {
  const id = upsertVar('Dm7', { frets: [-1, -1, 0, 2, 1, 1] });
  assert.equal(shapesOf('Dm7').length, 2);
  removeVar('Dm7', id);
  assert.equal(shapesOf('Dm7').length, 1);
});

test('removeVar: embutida vira lápide e restoreBuiltins traz de volta', () => {
  removeVar('Em7', 'b:Em7:0');
  assert.equal(shapesOf('Em7').length, 0);
  assert.equal(hasHidden('Em7'), true);
  restoreBuiltins('Em7');
  assert.equal(shapesOf('Em7').length, 1);
  assert.equal(hasHidden('Em7'), false);
});

test('setDefault muda a padrão e defaultShape acompanha', () => {
  const id = upsertVar('G7', { frets: [3, 5, 3, 4, 3, 3], label: 'pestana 3ª' });
  setDefault('G7', id);
  assert.equal(defaultShape('G7').id, id);
  assert.equal(shapeById('G7', id).label, 'pestana 3ª');
});

test('findShape acha forma idêntica (dedupe) e ignora forma diferente', () => {
  const id = upsertVar('B7', { frets: [-1, 2, 1, 2, 0, 2], barre: { fret: 2, from: 1, to: 5 } });
  const achou = findShape('B7', [-1, 2, 1, 2, 0, 2], { fret: 2, from: 1, to: 5 });
  assert.equal(achou.id, id);
  assert.equal(findShape('B7', [-1, 2, 1, 2, 0, 2], null).id, 'b:B7:0'); // sem pestana = a embutida
  assert.equal(findShape('B7', [9, 9, 9, 9, 9, 9], null), null);
});

test('labelsOf devolve os rótulos já usados naquele nome', () => {
  upsertVar('Bm', { frets: [-1, 2, 4, 4, 3, 2], label: 'minha pestana' });
  assert.ok(labelsOf('Bm').includes('minha pestana'));
});

test('allNames inclui nome que só existe no dicionário do usuário', () => {
  upsertVar('Zz9', { frets: [1, 1, 1, 1, 1, 1] });
  const n = allNames();
  assert.ok(n.includes('Zz9'));
  assert.ok(n.includes('C'));
});

test('defaultShape: nome desconhecido → null', () => {
  assert.equal(defaultShape('Qq0'), null);
});
```

- [ ] **Step 2: Rodar os testes e ver falhar**

Run: `cd app && node --test 'test/*.test.js' 2>&1 | tail -6`
Expected: FAIL — `upsertVar is not a function` (ou erro de import).

- [ ] **Step 3: Acrescentar o store no `db.js`**

Em `app/js/db.js`, trocar a linha 7 e acrescentar o store:

```js
const DB_VERSION = 2;
```

Dentro de `req.onupgradeneeded` (depois da linha do store `blobs`):

```js
      if (!d.objectStoreNames.contains('chordbook')) d.createObjectStore('chordbook', { keyPath: 'name' });
```

E, junto dos outros métodos de metadados (depois de `deleteList`):

```js
  loadChordbook() { return reqAll('chordbook'); },
  putChordName(rec) { return tx('chordbook', 'readwrite', (s) => s.put(rec)); },
  clearChordbook() { return tx('chordbook', 'readwrite', (s) => s.clear()); },
```

- [ ] **Step 4: Acrescentar a camada com estado em `chordbook.js`**

No topo, completar o import:

```js
import { CATALOG } from './chords-catalog.js';
import { DB, uid } from './db.js';
```

E acrescentar ao fim do arquivo:

```js
// ---------- estado (espelho do store 'chordbook') ----------
const BOOK = new Map();   // nome -> registro do usuário
const CACHE = new Map();  // nome -> lista fundida (invalidada a cada escrita)

function rec(name) {
  let r = BOOK.get(name);
  if (!r) { r = { name, vars: [], hidden: [], defaultId: null }; BOOK.set(name, r); }
  return r;
}

// Persistência é "melhor esforço": em Node (testes) não há IndexedDB e o
// dicionário funciona só em memória.
function persist(r) {
  CACHE.delete(r.name);
  DB.putChordName(r).catch(() => {});
}

export async function loadChordbook() {
  BOOK.clear(); CACHE.clear();
  let recs = [];
  try { recs = await DB.loadChordbook(); } catch (e) { recs = []; }
  for (const r of recs) BOOK.set(r.name, { name: r.name, vars: r.vars || [], hidden: r.hidden || [], defaultId: r.defaultId || null });
}

export function chordbookRecords() { return [...BOOK.values()]; }

export function shapesOf(name) {
  if (CACHE.has(name)) return CACHE.get(name);
  const list = mergeShapes(builtinShapes(name), BOOK.get(name));
  CACHE.set(name, list);
  return list;
}

export function defaultShape(name) { return shapesOf(name).find((s) => s.isDefault) || null; }
export function shapeById(name, id) { return shapesOf(name).find((s) => s.id === id) || null; }
export function labelsOf(name) { return shapesOf(name).map((s) => s.label || '').filter(Boolean); }
export function hasHidden(name) { const r = BOOK.get(name); return !!(r && r.hidden.length); }

export function findShape(name, frets, barre) {
  const k = shapeKey({ frets, barre: barre || null });
  return shapesOf(name).find((s) => shapeKey(s) === k) || null;
}

export function allNames() {
  return [...new Set([...Object.keys(CATALOG), ...BOOK.keys()])].sort((a, b) => a.localeCompare(b, 'pt'));
}

// Grava/atualiza uma variação; sem id, cria uma nova. Devolve o id.
export function upsertVar(name, shape) {
  const r = rec(name);
  const v = {
    id: shape.id || ('u:' + uid()),
    frets: shape.frets.slice(),
    ...(shape.barre ? { barre: { ...shape.barre } } : {}),
    label: shape.label || '',
  };
  const i = r.vars.findIndex((x) => x.id === v.id);
  if (i >= 0) r.vars[i] = v; else r.vars.push(v);
  r.hidden = r.hidden.filter((x) => x !== v.id);
  persist(r);
  return v.id;
}

export function removeVar(name, id) {
  const r = rec(name);
  r.vars = r.vars.filter((v) => v.id !== id);
  if (id.startsWith('b:') && !r.hidden.includes(id)) r.hidden.push(id);
  if (r.defaultId === id) r.defaultId = null;
  persist(r);
}

export function setDefault(name, id) { const r = rec(name); r.defaultId = id; persist(r); }
export function restoreBuiltins(name) { const r = rec(name); r.hidden = []; persist(r); }

// ---------- backup (Task 8) ----------
export async function replaceChordbook(recs) {
  try { await DB.clearChordbook(); } catch (e) { /* sem IndexedDB */ }
  BOOK.clear(); CACHE.clear();
  for (const r of recs || []) {
    const n = { name: r.name, vars: r.vars || [], hidden: r.hidden || [], defaultId: r.defaultId || null };
    BOOK.set(n.name, n);
    await DB.putChordName(n).catch(() => {});
  }
}

export async function mergeChordbookRecords(recs) {
  for (const inc of recs || []) {
    if (!inc || !inc.name) continue;
    const m = mergeRecords(BOOK.get(inc.name), inc);
    BOOK.set(m.name, m);
    CACHE.delete(m.name);
    await DB.putChordName(m).catch(() => {});
  }
}
```

- [ ] **Step 5: Apontar `chords.js` para o dicionário**

Em `app/js/chords.js`, trocar a linha 4:

```js
import { defaultShape } from './chordbook.js';
```

E as duas ocorrências de `catalogDefault(name)` (dentro de `chordDiagWidth` na linha ~92 e de `chordSVG` na linha ~98) por `defaultShape(name)`.

- [ ] **Step 6: Carregar o dicionário no boot**

Em `app/js/state.js`, acrescentar ao import block do topo:

```js
import { loadChordbook } from './chordbook.js';
```

E dentro de `initState()`, logo depois de `S.lists = lib.lists;`:

```js
  await loadChordbook();
```

- [ ] **Step 7: Rodar os testes e ver passar**

Run: `cd app && node --check js/chordbook.js && node --check js/db.js && node --check js/chords.js && node --test 'test/*.test.js' 2>&1 | tail -6`
Expected: `pass 48 · fail 0` (38 + 10 novos).

- [ ] **Step 8: Verificar no navegador**

Run: `cd app && python3 -m http.server 8137`

Abrir uma música com cifra e conferir que **os diagramas continuam desenhando iguais** (a resolução mudou de `catalogDefault` para `defaultShape`, o resultado não deve mudar). No console do DevTools, `indexedDB.databases()` deve mostrar `somaplay` na **versão 2** e nenhuma música pode ter sumido.

- [ ] **Step 9: Commit**

```bash
git add app/js/chordbook.js app/js/db.js app/js/chords.js app/js/state.js app/test/chordbook.test.js
git commit -m "feat(chordbook): store no IndexedDB, mutações e resolução de forma pelo dicionário"
```

---

### Task 4: `chordeditor.js` — reducers da pestana e da casa base

A lógica do editor, pura e testável: ligar/desligar/mover pestana, mover as pontas, travar corda interna, deslocar a janela de casas e sugerir rótulo. Ainda sem tela.

**Files:**
- Create: `app/js/render/chordeditor.js`
- Test: `app/test/chordeditor.test.js` (criar)

**Interfaces:**
- Consumes: nada (módulo puro nesta task).
- Produces (estado `st = { name, frets, barre, base, label, origin }`):
  - `openEditor(name, shape|null, origin) -> st`
  - `toggleBarre(st, fret) -> st` · `tapCell(st, corda, fret) -> st` · `tapHead(st, corda) -> st` · `setBase(st, delta) -> st`
  - `suggestLabel(st, usados) -> string` · `editorShape(st) -> { frets, barre?, label }`
  - Reducers devolvem **o mesmo objeto** quando o toque é no-op (corda interna travada).

- [ ] **Step 1: Escrever os testes que falham**

Criar `app/test/chordeditor.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openEditor, toggleBarre, tapCell, tapHead, setBase, suggestLabel, editorShape } from '../js/render/chordeditor.js';

const ORIG = { kind: 'book', varId: null };

test('openEditor: sem forma começa com tudo abafado na 1ª casa', () => {
  const st = openEditor('X', null, ORIG);
  assert.deepEqual(st.frets, [-1, -1, -1, -1, -1, -1]);
  assert.equal(st.barre, null);
  assert.equal(st.base, 1);
});

test('openEditor: deriva a casa base de voicing alto', () => {
  assert.equal(openEditor('X', { frets: [-1, 7, 9, 9, 8, 7] }, ORIG).base, 7);
  assert.equal(openEditor('X', { frets: [-1, 3, 2, 0, 1, 0] }, ORIG).base, 1);
});

test('toggleBarre: cria pestana cheia e sobe as cordas abaixo da casa', () => {
  const r = toggleBarre(openEditor('F', null, ORIG), 1);
  assert.deepEqual(r.frets, [1, 1, 1, 1, 1, 1]);
  assert.deepEqual(r.barre, { fret: 1, from: 0, to: 5 });
});

test('toggleBarre: corda presa acima da casa não é rebaixada', () => {
  const r = toggleBarre(openEditor('F', { frets: [-1, -1, 3, 2, -1, -1] }, ORIG), 1);
  assert.deepEqual(r.frets, [1, 1, 3, 2, 1, 1]);
});

test('toggleBarre na mesma casa desliga e preserva os valores', () => {
  const r = toggleBarre(toggleBarre(openEditor('F', null, ORIG), 1), 1);
  assert.equal(r.barre, null);
  assert.deepEqual(r.frets, [1, 1, 1, 1, 1, 1]);
});

test('toggleBarre em outra casa move a pestana (só uma por forma)', () => {
  const r = toggleBarre(toggleBarre(openEditor('F', null, ORIG), 1), 3);
  assert.deepEqual(r.barre, { fret: 3, from: 0, to: 5 });
  assert.deepEqual(r.frets, [3, 3, 3, 3, 3, 3]);
});

test('tapCell na casa da pestana move a ponta mais próxima (encurta)', () => {
  const st = toggleBarre(openEditor('Bm7', null, ORIG), 2);
  const r = tapCell(st, 1, 2);
  assert.deepEqual(r.barre, { fret: 2, from: 1, to: 5 });
  assert.deepEqual(r.frets, [2, 2, 2, 2, 2, 2]); // a corda que saiu mantém o valor
});

test('corda liberada volta a aceitar ✕/○ e a pestana não muda', () => {
  let st = tapCell(toggleBarre(openEditor('Bm7', null, ORIG), 2), 1, 2);
  st = tapHead(st, 0);
  assert.equal(st.frets[0], 0);
  st = tapHead(st, 0);
  assert.equal(st.frets[0], -1);
  assert.deepEqual(st.barre, { fret: 2, from: 1, to: 5 });
});

test('tapCell fora do vão estende a pestana', () => {
  const st = { name: 'X', frets: [-1, 2, 2, 2, 2, 2], barre: { fret: 2, from: 1, to: 5 }, base: 1, label: '', origin: ORIG };
  const r = tapCell(st, 0, 2);
  assert.deepEqual(r.barre, { fret: 2, from: 0, to: 5 });
  assert.equal(r.frets[0], 2);
});

test('corda interna abaixo da pestana está travada (no-op)', () => {
  const st = toggleBarre(openEditor('F', null, ORIG), 3);
  assert.equal(tapCell(st, 2, 1), st);
  assert.equal(tapHead(st, 2), st);
});

test('nota acima da pestana é permitida e mantém a barra', () => {
  const st = toggleBarre(openEditor('Bm7', null, ORIG), 2);
  const r = tapCell(st, 2, 4);
  assert.equal(r.frets[2], 4);
  assert.deepEqual(r.barre, { fret: 2, from: 0, to: 5 });
});

test('encolher pela cabeça até sobrar uma corda remove a pestana', () => {
  const st = { name: 'X', frets: [0, 3, 3, 0, 0, 0], barre: { fret: 3, from: 1, to: 2 }, base: 1, label: '', origin: ORIG };
  const r = tapHead(st, 2);
  assert.equal(r.barre, null);
  assert.equal(r.frets[2], 0);
  assert.equal(r.frets[1], 3);
});

test('tapCell fora do vão alterna: mesma casa de novo solta a corda', () => {
  let st = openEditor('X', null, ORIG);
  st = tapCell(st, 3, 2);
  assert.equal(st.frets[3], 2);
  st = tapCell(st, 3, 2);
  assert.equal(st.frets[3], 0);
});

test('setBase desloca a janela e respeita os limites 1..15', () => {
  const st = openEditor('C', null, ORIG);
  assert.equal(setBase(st, -1).base, 1);
  assert.equal(setBase(st, 1).base, 2);
  let hi = st;
  for (let i = 0; i < 20; i++) hi = setBase(hi, 1);
  assert.equal(hi.base, 15);
});

test('suggestLabel: pestana, casa alta, aberto e desempate', () => {
  const b = toggleBarre(openEditor('F', null, ORIG), 3);
  assert.equal(suggestLabel(b, []), 'pestana 3ª');
  assert.equal(suggestLabel(b, ['pestana 3ª']), 'pestana 3ª (2)');
  assert.equal(suggestLabel(b, ['pestana 3ª', 'pestana 3ª (2)']), 'pestana 3ª (3)');
  assert.equal(suggestLabel(openEditor('C', null, ORIG), []), 'aberto');
  assert.equal(suggestLabel(setBase(openEditor('C', null, ORIG), 4), []), 'casa 5ª');
});

test('editorShape → openEditor: round-trip preserva casas e pestana', () => {
  const st = toggleBarre(openEditor('Bm7', { frets: [-1, 2, 4, 2, 3, 2] }, ORIG), 2);
  const shape = editorShape(st);
  const back = openEditor('Bm7', shape, ORIG);
  assert.deepEqual(back.frets, shape.frets);
  assert.deepEqual(back.barre, shape.barre);
});

test('editorShape: sem pestana não emite a chave barre', () => {
  const s = editorShape(openEditor('C', { frets: [-1, 3, 2, 0, 1, 0] }, ORIG));
  assert.equal('barre' in s, false);
});
```

- [ ] **Step 2: Rodar os testes e ver falhar**

Run: `cd app && node --test 'test/*.test.js' 2>&1 | tail -6`
Expected: FAIL — `Cannot find module .../js/render/chordeditor.js`.

- [ ] **Step 3: Criar `app/js/render/chordeditor.js` (só os reducers)**

```js
// render/chordeditor.js — editor de casas compartilhado (adicionar/editar música,
// dicionário e seletor da tela de toque). Reducers puros + HTML derivado.
// estado: { name, frets:[6], barre:null|{fret,from,to}, base, label, origin }
// origin: { kind:'draft'|'song'|'book', songId?, varId? } — diz onde a forma é gravada.

export const VAZIO = [-1, -1, -1, -1, -1, -1];

export function openEditor(name, shape, origin) {
  const frets = shape && shape.frets ? shape.frets.slice() : VAZIO.slice();
  const pos = frets.filter((f) => f > 0);
  return {
    name,
    frets,
    barre: shape && shape.barre ? { ...shape.barre } : null,
    base: pos.length && Math.max(...pos) > 4 ? Math.min(...pos) : 1,
    label: (shape && shape.label) || '',
    origin,
  };
}

const noVao = (st, i) => !!st.barre && i >= st.barre.from && i <= st.barre.to;
const ehPonta = (st, i) => !!st.barre && (i === st.barre.from || i === st.barre.to);

// [⌐] da linha: liga a pestana cheia naquela casa, desliga se já está lá,
// ou muda de casa (só uma pestana por forma).
export function toggleBarre(st, F) {
  if (st.barre && st.barre.fret === F) return { ...st, barre: null };
  return { ...st, frets: st.frets.map((f) => (f < F ? F : f)), barre: { fret: F, from: 0, to: 5 } };
}

// Toque numa célula da grade (corda i, casa fret).
export function tapCell(st, i, fret) {
  if (st.barre && fret === st.barre.fret) return moverPonta(st, i);
  if (noVao(st, i) && fret < st.barre.fret) {
    if (!ehPonta(st, i)) return st;            // corda interna: travada
    return liberarPonta(st, i, fret);
  }
  const frets = st.frets.slice();
  frets[i] = frets[i] === fret ? 0 : fret;
  return { ...st, frets };
}

// Toque na cabeça da corda: solta (○) o que estava preso, e alterna ○ ↔ ✕.
export function tapHead(st, i) {
  const val = st.frets[i] === 0 ? -1 : 0;
  if (noVao(st, i)) {
    if (!ehPonta(st, i)) return st;
    return liberarPonta(st, i, val);
  }
  const frets = st.frets.slice();
  frets[i] = val;
  return { ...st, frets };
}

// Encolhe o vão para excluir a corda i (uma das pontas) e aplica o valor nela.
function liberarPonta(st, i, val) {
  const { fret, from, to } = st.barre;
  const nf = i === from ? from + 1 : from;
  const nt = i === to ? to - 1 : to;
  const frets = st.frets.slice();
  frets[i] = val;
  return { ...st, frets, barre: nt - nf >= 1 ? { fret, from: nf, to: nt } : null };
}

// Move a ponta mais próxima até a corda tocada (encurta ou estende).
function moverPonta(st, i) {
  const { fret, from, to } = st.barre;
  let nf = from, nt = to;
  if (Math.abs(i - from) <= Math.abs(i - to)) nf = i; else nt = i;
  if (nf > nt) { const t = nf; nf = nt; nt = t; }
  const frets = st.frets.slice();
  for (let k = nf; k <= nt; k++) if (frets[k] < fret) frets[k] = fret;
  return { ...st, frets, barre: { fret, from: nf, to: nt } };
}

// Janela de 5 linhas da grade — só visual, não é dado da forma.
export function setBase(st, delta) {
  return { ...st, base: Math.max(1, Math.min(15, st.base + delta)) };
}

// Rótulo sugerido para uma forma nova, sem repetir os já usados no acorde.
export function suggestLabel(st, usados) {
  const base = st.barre ? `pestana ${st.barre.fret}ª` : (st.base > 1 ? `casa ${st.base}ª` : 'aberto');
  if (!usados.includes(base)) return base;
  let n = 2;
  while (usados.includes(`${base} (${n})`)) n++;
  return `${base} (${n})`;
}

// Dado (forma) a partir do estado do editor.
export function editorShape(st) {
  return { frets: st.frets.slice(), ...(st.barre ? { barre: { ...st.barre } } : {}), label: st.label };
}
```

- [ ] **Step 4: Rodar os testes e ver passar**

Run: `cd app && node --test 'test/*.test.js' 2>&1 | tail -6`
Expected: `pass 65 · fail 0` (48 + 17 novos).

- [ ] **Step 5: Commit**

```bash
git add app/js/render/chordeditor.js app/test/chordeditor.test.js
git commit -m "feat(chordeditor): reducers de pestana, pontas e casa base"
```

---

### Task 5: Editor na tela Adicionar/editar música

Trocar o editor antigo (grade de pontos, sem pestana) pelo componente compartilhado, com grade em linhas, botão de pestana por casa, stepper de casa base, rótulo e o rodapé de salvar. É aqui que a variação passa a ir para o dicionário.

**Files:**
- Modify: `app/js/render/chordeditor.js` (acrescentar `chordEditorHTML` e `shapeStripHTML`)
- Modify: `app/js/render/addedit.js:1-33,59-99,293-297` (usar o componente; tirar `editingChord`)
- Modify: `app/js/state.js:49-52` (campo `S.chordEd`)
- Modify: `app/js/main.js` (ações `ce*` e `editChord`)
- Modify: `app/css/app.css:458-478` (grade em linhas, pestana, rodapé)

**Interfaces:**
- Consumes: reducers da Task 4; `shapesOf`, `findShape`, `upsertVar`, `labelsOf`, `defaultShape` (Task 3).
- Produces:
  - `chordEditorHTML(st, opts) -> string`, `opts = { fromLabel?, usage? }`
  - `shapeStripHTML(name, shapes, selId, action) -> string` — fileira de miniaturas; cada botão emite `data-a=<action> data-id=<nome> data-var=<id>`
  - `S.chordEd` (estado do editor, `null` quando fechado)
  - Ações: `editChord` · `ceCell` · `ceHead` · `ceBarre` · `ceBase` · `ceClose` · `ceSave` · `ceSaveNew` · `ceUseVar`
  - Constantes de layout `CW = 34` e `GAP = 8` **precisam bater** com `.fcell{width:34px}` e o `gap:8px` de `.fcells` no CSS.

- [ ] **Step 1: Acrescentar o HTML ao `chordeditor.js`**

No topo do arquivo, acrescentar:

```js
import { I, esc } from '../icons.js';
import { chordSVG } from '../chords.js';
```

E ao fim:

```js
// ---------- HTML ----------
const CW = 34, GAP = 8; // precisam bater com .fcell{width} e .fcells{gap} no CSS
const CORDAS = ['Mi', 'Lá', 'Ré', 'Sol', 'Si', 'Mi'];

export function chordEditorHTML(st, opts = {}) {
  const travada = (i) => !!st.barre && i > st.barre.from && i < st.barre.to;

  const heads = st.frets.map((f, i) =>
    `<button class="fcell head ${f === -1 ? 'x' : ''} ${f === 0 ? 'o' : ''} ${travada(i) ? 'lock' : ''}" data-a="ceHead" data-id="${i}">${f === -1 ? '✕' : (f === 0 ? '○' : '·')}</button>`).join('');

  let linhas = '';
  for (let r = 0; r < 5; r++) {
    const casa = st.base + r;
    const naCasa = !!st.barre && st.barre.fret === casa;
    const bar = naCasa
      ? `<div class="fbar" style="left:${st.barre.from * (CW + GAP)}px;width:${(st.barre.to - st.barre.from) * (CW + GAP) + CW}px"></div>`
      : '';
    const cells = st.frets.map((f, i) =>
      `<button class="fcell ${f === casa ? 'on' : ''} ${travada(i) && st.barre.fret > casa ? 'lock' : ''}" data-a="ceCell" data-id="${i}" data-fret="${casa}"></button>`).join('');
    linhas += `<div class="frow">
      <button class="fbarre ${naCasa ? 'on' : ''}" data-a="ceBarre" data-id="${casa}" title="Pestana na ${casa}ª casa">⌐</button>
      <span class="fnum">${casa}ª</span>
      <div class="fcells">${cells}${bar}</div></div>`;
  }

  const meta = [];
  if (opts.fromLabel) meta.push(`vindo de “${esc(opts.fromLabel)}”`);
  if (opts.usage) meta.push(`usada em ${opts.usage} música${opts.usage === 1 ? '' : 's'}`);

  const foot = st.origin.varId
    ? `<button class="btn-ghost sm" data-a="ceSave">Atualizar variação</button><button class="btn-save sm" data-a="ceSaveNew">Salvar como nova</button>`
    : `<button class="btn-save sm" data-a="ceSaveNew">Salvar</button>`;

  return `<div class="chord-editor">
    <div class="ce-hd"><b>${esc(st.name)}</b>
      <span class="ce-base">casa base
        <button class="btn-icon xs" data-a="ceBase" data-id="-1">−</button><b>${st.base}ª</b><button class="btn-icon xs" data-a="ceBase" data-id="1">+</button></span>
      <button class="btn-icon xs" style="margin-left:auto" data-a="ceClose" title="Fechar">${I.close()}</button></div>
    <div class="fgrid">
      <div class="frow"><span class="fbarre-pad"></span><span class="fnum"></span>
        <div class="fcells">${CORDAS.map((n) => `<span class="fstr">${n}</span>`).join('')}</div></div>
      <div class="frow"><span class="fbarre-pad"></span><span class="fnum"></span>
        <div class="fcells">${heads}</div></div>
      ${linhas}
    </div>
    ${meta.length ? `<div class="ce-meta">${meta.join(' · ')}</div>` : ''}
    <div class="ce-foot">
      <input type="text" class="input" id="ce-label" placeholder="rótulo (ex.: pestana 3ª)" value="${esc(st.label)}">
      ${foot}</div>
  </div>`;
}

// Fileira de variações (miniatura + rótulo). Quem chama decide a ação.
export function shapeStripHTML(name, shapes, selId, action) {
  if (!shapes.length) return '';
  return `<div class="shape-strip">${shapes.map((s) => `
    <button class="pick-opt ${s.id === selId ? 'sel' : ''}" data-a="${action}" data-id="${esc(name)}" data-var="${esc(s.id)}">
      ${chordSVG(name, true, { [name]: s })}
      <span class="lbl">${esc(s.label || 'variação')}${s.isDefault ? ' ★' : ''}</span>
    </button>`).join('')}</div>`;
}
```

- [ ] **Step 2: Estado do editor em `state.js`**

Em `app/js/state.js`, no bloco `// edição`, acrescentar depois de `draft: null,`:

```js
  chordEd: null,           // estado do editor de casas (render/chordeditor.js)
```

- [ ] **Step 3: Usar o componente no `addedit.js`**

Trocar as linhas 6-7 (imports de `chords.js` e `chords-catalog.js`) exatamente por:

```js
import { parseCifraText, extractChords, chordSVG } from '../chords.js';
import { shapesOf, defaultShape } from '../chordbook.js';
import { chordEditorHTML, shapeStripHTML } from './chordeditor.js';
```

(`S` já vem do import da linha 2 — não duplicar.)

Em `newDraft`, remover `editingChord: null,` das **duas** ramificações (linhas 24 e 31), deixando só `digitacoes`.

Apagar a função `chordEditorHTML` local (linhas 59-81) e trocar `chordDigHTML` por:

```js
function chordDigHTML(d) {
  const isText = d.cifraFonte === 'texto';
  const names = draftChordNames(d);
  if (!isText && !names.length) return '';
  const dict = d.digitacoes || {};
  const ed = S.chordEd && S.chordEd.origin.kind === 'draft' ? S.chordEd : null;
  const chips = names.map((n) => `<button class="digchip ${ed && ed.name === n ? 'on' : ''} ${dict[n] ? 'set' : ''}" data-a="editChord" data-id="${esc(n)}">
      <span class="dnm">${esc(n)}</span>${chordSVG(n, true, dict)}
    </button>`).join('');
  const editor = ed
    ? shapeStripHTML(ed.name, shapesOf(ed.name), ed.origin.varId, 'ceUseVar') + chordEditorHTML(ed)
    : '';
  return `<div class="card-section">
    <div class="hd"><span style="color:var(--accent);display:flex">${I.cifraLines(19)}</span>
      <div class="t">Digitações dos acordes</div>
      <div class="s">toque um acorde para ajustar as casas</div>
      <button class="btn-ghost sm" style="margin-left:auto" data-a="refreshChords">Detectar acordes</button></div>
    <div class="digchips">${chips || '<div style="color:var(--muted);font-size:13px">Cole a cifra e toque em “Detectar acordes”.</div>'}</div>
    ${editor}
  </div>`;
}
```

Em `commitDraft` (linha ~296), trocar o bloco que preenche as digitações faltantes por uma versão que grava o `varId`:

```js
  const usados = draftChordNames(d);
  const dig = { ...(d.digitacoes || {}) };
  for (const n of usados) {
    if (dig[n]) continue;
    const def = defaultShape(n);
    if (def) dig[n] = { frets: def.frets.slice(), ...(def.barre ? { barre: { ...def.barre } } : {}), varId: def.id };
  }
```

- [ ] **Step 4: Ações no `main.js`**

Acrescentar aos imports do topo:

```js
import { openEditor, toggleBarre, tapCell, tapHead, setBase, suggestLabel, editorShape } from './render/chordeditor.js';
import { shapesOf, defaultShape, shapeById, findShape, upsertVar, labelsOf, shapeKey } from './chordbook.js';
```

E remover o import antigo `import { catalogShapes, catalogDefault } from './chords-catalog.js';` (linha 19).

Acrescentar, antes do objeto `actions`:

```js
// O rótulo é um input dentro do editor — precisa ir pro estado antes de qualquer re-render.
function syncChordEd() {
  const el = document.getElementById('ce-label');
  if (el && S.chordEd) S.chordEd.label = el.value;
}

// Forma que a música/rascunho usa hoje para um acorde (ou a padrão do dicionário).
function shapeAtual(dict, name) {
  const cur = dict && dict[name];
  if (cur) {
    const varId = cur.varId || (findShape(name, cur.frets, cur.barre) || {}).id || null;
    return { shape: { ...cur, label: (shapeById(name, varId) || {}).label || '' }, varId };
  }
  const def = defaultShape(name);
  return { shape: def, varId: def ? def.id : null };
}

// Grava a forma no destino do editor (rascunho, música ou nada, no caso do dicionário).
async function gravarNoDestino(st, shape, varId) {
  const dado = { frets: shape.frets.slice(), ...(shape.barre ? { barre: { ...shape.barre } } : {}), varId };
  if (st.origin.kind === 'draft' && S.draft) {
    S.draft.digitacoes = { ...(S.draft.digitacoes || {}), [st.name]: dado };
  } else if (st.origin.kind === 'song') {
    const song = songById(st.origin.songId);
    if (song) {
      song.cifra = song.cifra || {};
      song.cifra.digitacoes = { ...(song.cifra.digitacoes || {}), [st.name]: dado };
      await saveSong(song);
    }
  }
}
```

Nas ações, substituir `editChord`, `setFret` e `useCatShape` (linhas 320-339) por:

```js
  editChord(d) {
    syncDraftFromDOM();
    if (!d.id) { S.chordEd = null; update(); return; }
    const { shape, varId } = shapeAtual(S.draft.digitacoes, d.id);
    S.chordEd = openEditor(d.id, shape, { kind: 'draft', varId });
    update();
  },
  refreshChords() { syncDraftFromDOM(); update(); },
  ceCell(d) { syncChordEd(); S.chordEd = tapCell(S.chordEd, +d.id, +d.fret); update(); },
  ceHead(d) { syncChordEd(); S.chordEd = tapHead(S.chordEd, +d.id); update(); },
  ceBarre(d) { syncChordEd(); S.chordEd = toggleBarre(S.chordEd, +d.id); update(); },
  ceBase(d) { syncChordEd(); S.chordEd = setBase(S.chordEd, +d.id); update(); },
  ceClose() { S.chordEd = null; update(); },
  ceUseVar(d, ev, el) {
    const s = shapeById(d.id, el.dataset.var);
    if (!s) return;
    S.chordEd = openEditor(d.id, s, { ...S.chordEd.origin, varId: s.id });
    update();
  },
  async ceSave() {   // atualizar a variação de origem (e propagar)
    syncChordEd();
    const st = S.chordEd;
    const shape = editorShape(st);
    upsertVar(st.name, { id: st.origin.varId, ...shape });
    const n = await applyVarToSongs(st.name, st.origin.varId, shape);
    await gravarNoDestino(st, shape, st.origin.varId);
    S.chordEd = null;
    update();
    toast(n ? `Variação atualizada · ${n} música${n === 1 ? '' : 's'} atualizada${n === 1 ? '' : 's'}` : 'Variação atualizada');
  },
  async ceSaveNew() {   // salvar como variação nova (reaproveitando forma idêntica)
    syncChordEd();
    const st = S.chordEd;
    const shape = editorShape(st);
    const igual = findShape(st.name, shape.frets, shape.barre);
    const varId = igual ? igual.id : upsertVar(st.name, { ...shape, label: st.label || suggestLabel(st, labelsOf(st.name)) });
    await gravarNoDestino(st, shape, varId);
    S.chordEd = null;
    update();
    toast(igual ? 'Forma já existia no dicionário' : 'Variação salva no dicionário');
  },
```

E acrescentar `applyVarToSongs` ao import de `./state.js` no topo (a função entra na Task 6; **nesta task**, criar já a versão definitiva em `state.js` conforme o Step 5).

- [ ] **Step 5: `applyVarToSongs` no `state.js`**

Em `app/js/state.js`, acrescentar ao import do `chordbook`:

```js
import { loadChordbook, songsUsingVar, shapeKey } from './chordbook.js';
```

E, no fim da seção `// ---------- mutações ----------`:

```js
// Propaga a forma para as músicas que apontam para aquela variação. Devolve quantas mudaram.
export async function applyVarToSongs(name, varId, shape) {
  let n = 0;
  for (const s of songsUsingVar(S.songs, name, varId)) {
    const cur = s.cifra.digitacoes[name];
    if (shapeKey(cur) === shapeKey(shape)) continue;
    s.cifra.digitacoes = {
      ...s.cifra.digitacoes,
      [name]: { frets: shape.frets.slice(), ...(shape.barre ? { barre: { ...shape.barre } } : {}), varId },
    };
    await saveSong(s);
    n++;
  }
  return n;
}
```

- [ ] **Step 6: CSS da grade em linhas**

Em `app/css/app.css`, substituir o bloco `.fgrid`/`.fcol`/`.fstr`/`.fcell` (linhas 467-474) por:

```css
.fgrid{display:flex;flex-direction:column;gap:5px;align-items:flex-start}
.frow{display:flex;align-items:center;gap:8px}
.fcells{position:relative;display:flex;gap:8px}
.fstr{width:34px;text-align:center;font-size:11px;color:var(--muted);font-family:var(--f-mono)}
.fnum{width:24px;text-align:right;font-size:11px;color:var(--muted)}
.fbarre{width:26px;height:26px;border:1px solid var(--border2);border-radius:7px;background:var(--surface);color:var(--muted);cursor:pointer;font-size:14px;line-height:1;padding:0}
.fbarre.on{background:var(--accent);border-color:var(--accent);color:var(--bg)}
.fbarre-pad{width:26px}
.fbar{position:absolute;top:3px;height:24px;border-radius:12px;background:var(--accent);pointer-events:none}
.fcell{width:34px;height:30px;border:1px solid var(--border2);border-radius:7px;background:var(--surface);color:var(--muted);cursor:pointer;font-size:13px}
.fcell.head{background:transparent;border-style:dashed}
.fcell.head.x{color:var(--red)}
.fcell.head.o{color:var(--muted)}
.fcell.on{background:var(--accent);border-color:var(--accent);color:var(--bg)}
.fcell.lock{opacity:.3;cursor:default}
```

E substituir as regras `.ce-cat` e `.ce-cat .mut` (linhas 475-476, cuja marcação deixou de existir) por:

```css
.ce-base{display:flex;align-items:center;gap:6px;color:var(--muted);font-size:12px}
.ce-meta{margin-top:10px;color:var(--muted);font-size:12px}
.ce-foot{display:flex;gap:10px;align-items:center;margin-top:12px;flex-wrap:wrap}
.ce-foot .input{flex:1;min-width:140px}
.btn-save.sm{height:40px;padding:0 16px;font-size:14px}
.shape-strip{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px}
```

- [ ] **Step 7: Verificar sintaxe e testes**

Run: `cd app && node --check js/main.js && node --check js/state.js && node --check js/render/addedit.js && node --check js/render/chordeditor.js && node --test 'test/*.test.js' 2>&1 | tail -5`
Expected: `pass 65 · fail 0`.

- [ ] **Step 8: Verificar no navegador**

Run: `cd app && python3 -m http.server 8137`

1. Abrir uma música com cifra em texto → kebab → **Editar música** → rolar até "Digitações dos acordes".
2. Tocar num acorde: aparecem a fileira de variações e a grade em linhas com `[⌐]` por casa.
3. Tocar `[⌐]` na 1ª casa: **a barra aparece** cobrindo as 6 cordas e todas sobem para a 1ª.
4. Tocar na célula da 1ª casa da corda **Lá**: a barra encurta para Lá→Mi agudo; tocar duas vezes na cabeça do **Mi grave** deixa ✕.
5. Célula interna abaixo da barra fica esmaecida e não responde.
6. `+` na casa base leva a grade para 2ª..6ª; a barra continua desenhada na casa certa.
7. **Salvar** → o chip do acorde mostra o diagrama novo, com a pestana.
8. A página **não sobe** em nenhum desses toques.

- [ ] **Step 9: Commit**

```bash
git add app/js/render/chordeditor.js app/js/render/addedit.js app/js/state.js app/js/main.js app/css/app.css
git commit -m "feat(chordeditor): editor com pestana e casa base no adicionar/editar música"
```

---

### Task 6: Seletor completo na tela de toque

O popover passa a listar a lista fundida **mais** a forma própria da música (que hoje desaparece), e ganha criar/editar ali mesmo. É o caminho de conserto durante o ensaio.

**Files:**
- Modify: `app/js/render/play.js:1-10,256-275` (imports e `chordPickerHTML`)
- Modify: `app/js/main.js:246-255` (ações do seletor)

**Interfaces:**
- Consumes: `shapesOf`, `shapeById`, `shapeKey`, `defaultShape`; `openEditor`, `chordEditorHTML`, `shapeStripHTML`; `applyVarToSongs` (Task 5).
- Produces: ações `pickChordShape` (agora por `data-var`), `pickNewVar`, `pickEditVar`; id sintético `__song` para a forma que só existe naquela música.

- [ ] **Step 1: Trocar `chordPickerHTML` em `play.js`**

Trocar o import da linha 8 por:

```js
import { shapesOf, shapeById, shapeKey } from '../chordbook.js';
import { chordEditorHTML, shapeStripHTML } from './chordeditor.js';
```

E substituir `chordPickerHTML` (linhas 256-275) por:

```js
function chordPickerHTML(song) {
  const name = S.chordPicker;
  const dict = song.cifra?.digitacoes || {};
  const cur = dict[name] || null;
  const shapes = shapesOf(name).slice();
  let selId = null;
  if (cur) {
    const k = shapeKey(cur);
    const achou = (cur.varId && shapes.find((s) => s.id === cur.varId)) || shapes.find((s) => shapeKey(s) === k);
    if (achou) selId = achou.id;
    else {
      selId = '__song';
      shapes.push({ id: '__song', frets: cur.frets, ...(cur.barre ? { barre: cur.barre } : {}), label: 'desta música' });
    }
  }
  const ed = S.chordEd && S.chordEd.origin.kind === 'song' ? S.chordEd : null;
  const corpo = ed
    ? chordEditorHTML(ed, { fromLabel: (shapeById(name, ed.origin.varId) || {}).label })
    : (shapeStripHTML(name, shapes, selId, 'pickChordShape')
       || '<div style="padding:14px;color:var(--muted);font-size:13px">Nenhuma forma registrada — toque em “Nova variação”.</div>');
  return `<div class="scrim" data-a="closeChordPicker">
    <div class="popover" data-stop="1">
      <div class="head"><div class="head-row"><div class="title">Variações de ${esc(name)}</div>
        <button class="btn-icon xs" data-a="closeChordPicker">${I.close()}</button></div></div>
      <div class="body">${corpo}</div>
      ${ed ? '' : `<div class="foot">
        <button class="btn-ghost sm" data-a="pickNewVar" data-id="${esc(name)}">${I.plus(16)}Nova variação</button>
        ${selId ? `<button class="btn-ghost sm" data-a="pickEditVar" data-id="${esc(name)}" data-var="${esc(selId)}">${I.pencil(16)}Editar</button>` : ''}
      </div>`}
    </div>
  </div>`;
}
```

- [ ] **Step 2: Trocar as ações do seletor no `main.js`**

Substituir `openChordPicker`/`closeChordPicker`/`pickChordShape` (linhas 246-255) por:

```js
  openChordPicker(d) { S.chordPicker = d.id; S.chordEd = null; update(); },
  closeChordPicker() { S.chordPicker = null; S.chordEd = null; update(); },
  async pickChordShape(d, ev, el) {
    const song = currentSong(); if (!song) return;
    const id = el.dataset.var;
    const s = id === '__song' ? null : shapeById(d.id, id);
    if (!s) { S.chordPicker = null; update(); return; }
    song.cifra.digitacoes = {
      ...(song.cifra.digitacoes || {}),
      [d.id]: { frets: s.frets.slice(), ...(s.barre ? { barre: { ...s.barre } } : {}), varId: s.id },
    };
    await saveSong(song);
    S.chordPicker = null;
    update();
  },
  pickNewVar(d) {
    S.chordEd = openEditor(d.id, null, { kind: 'song', songId: S.currentSongId, varId: null });
    update();
  },
  pickEditVar(d, ev, el) {
    const song = currentSong(); if (!song) return;
    const id = el.dataset.var;
    if (id === '__song') {
      const cur = song.cifra.digitacoes[d.id];
      S.chordEd = openEditor(d.id, cur, { kind: 'song', songId: song.id, varId: null });
    } else {
      const s = shapeById(d.id, id);
      S.chordEd = openEditor(d.id, s, { kind: 'song', songId: song.id, varId: id });
    }
    update();
  },
```

- [ ] **Step 3: Verificar sintaxe e testes**

Run: `cd app && node --check js/render/play.js && node --check js/main.js && node --test 'test/*.test.js' 2>&1 | tail -5`
Expected: `pass 65 · fail 0`.

- [ ] **Step 4: Verificar no navegador**

Run: `cd app && python3 -m http.server 8137`

1. Abrir uma música → tocar num acorde do card "Acordes desta música".
2. O popover lista as variações; a que a música usa aparece marcada. Se a música tiver forma própria, ela aparece com o rótulo **"desta música"**.
3. **Nova variação** → grade vazia → montar uma forma com pestana → **Salvar** → o popover volta para a lista, agora com a variação nova marcada, e o diagrama da música muda ao fechar.
4. Reabrir o popover: a variação nova continua lá.
5. Abrir **outra** música que use o mesmo acorde → o popover **oferece a variação criada na outra música**.
6. **Editar** numa variação e **Atualizar variação**: toast diz quantas músicas foram atualizadas.

- [ ] **Step 5: Commit**

```bash
git add app/js/render/play.js app/js/main.js
git commit -m "feat(play): seletor de variação com lista fundida, criar e editar no popover"
```

---

### Task 7: Tela do Dicionário de acordes

A tela de registro/consulta: busca, chips por tônica, uma linha por acorde com todas as variações, e o editor abrindo embaixo da linha.

**Files:**
- Create: `app/js/render/chordbookscreen.js`
- Modify: `app/js/render/settings.js:15-21` (linha de entrada)
- Modify: `app/js/main.js` (rota, ações `cb*`, busca no `afterRender`, Enter do campo novo)
- Modify: `app/js/state.js:6-20` (campos de navegação do dicionário)
- Modify: `app/css/app.css` (bloco novo no fim)

**Interfaces:**
- Consumes: `allNames`, `shapesOf`, `shapeById`, `upsertVar`, `removeVar`, `setDefault`, `restoreBuiltins`, `hasHidden`, `songsUsingVar`; `openEditor`, `chordEditorHTML`; `isChordTok` de `chords.js`.
- Produces: `renderChordbook() -> string`; `S.screen === 'chordbook'`; `S.cbQuery`, `S.cbFilter`, `S.cbAdding`; ações `goChordbook`, `cbLetter`, `cbEditVar`, `cbNewVar`, `cbSetDefault`, `cbDeleteVar`, `cbRestore`, `cbStartAdd`, `cbConfirmAdd`, `cbCancelAdd`.

- [ ] **Step 1: Campos de estado**

Em `app/js/state.js`, no bloco de navegação (depois de `renamingList: false,`):

```js
  // dicionário de acordes
  cbQuery: '',
  cbFilter: null,          // tônica filtrada (A..G) ou null
  cbAdding: false,         // campo "novo acorde" aberto
```

E ampliar o comentário da linha 7 para `home | artist | list | play | addedit | settings | chordbook`.

- [ ] **Step 2: Criar `app/js/render/chordbookscreen.js`**

```js
// render/chordbookscreen.js — Dicionário de acordes (Configurações).
// Tela única agrupada por tônica: cada acorde traz todas as suas variações.
import { S } from '../state.js';
import { I, esc } from '../icons.js';
import { allNames, shapesOf, hasHidden, songsUsingVar } from '../chordbook.js';
import { chordSVG } from '../chords.js';
import { chordEditorHTML } from './chordeditor.js';

const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const tonica = (n) => n[0].toUpperCase();

function varHTML(name, s, ed) {
  const usos = songsUsingVar(S.songs, name, s.id).length;
  return `<div class="cb-var ${ed && ed.origin.varId === s.id ? 'on' : ''}">
    <button class="pick-opt ${s.isDefault ? 'sel' : ''}" data-a="cbEditVar" data-id="${esc(name)}" data-var="${esc(s.id)}">
      ${chordSVG(name, true, { [name]: s })}
      <span class="lbl">${esc(s.label || 'variação')}${s.isDefault ? ' ★' : ''}</span>
    </button>
    <div class="cb-uso">${usos ? `${usos} música${usos === 1 ? '' : 's'}` : ''}</div>
  </div>`;
}

function linhaHTML(name, ed) {
  const shapes = shapesOf(name);
  const vars = shapes.map((s) => varHTML(name, s, ed)).join('')
    || '<div class="cb-uso">sem formas registradas</div>';
  const editando = ed && ed.name === name;
  const sel = editando && ed.origin.varId ? shapes.find((s) => s.id === ed.origin.varId) : null;
  return `<div class="cb-row ${editando ? 'on' : ''}">
    <div class="cb-name">${esc(name)}</div>
    <div class="cb-body">
      <div class="cb-vars">${vars}
        <button class="cb-plus" data-a="cbNewVar" data-id="${esc(name)}" title="Nova variação">${I.plus(18)}</button>
      </div>
      ${hasHidden(name) ? `<button class="btn-ghost sm" data-a="cbRestore" data-id="${esc(name)}" style="margin-top:10px">↺ restaurar embutidas</button>` : ''}
      ${editando ? `${chordEditorHTML(ed, { usage: sel ? songsUsingVar(S.songs, name, sel.id).length : 0 })}
        ${sel ? `<div class="cb-actions">
          <button class="btn-ghost sm" data-a="cbSetDefault" data-id="${esc(name)}" data-var="${esc(sel.id)}">★ tornar padrão</button>
          <button class="btn-ghost sm danger" data-a="cbDeleteVar" data-id="${esc(name)}" data-var="${esc(sel.id)}">${I.trash(15)} apagar</button>
        </div>` : ''}` : ''}
    </div>
  </div>`;
}

export function renderChordbook() {
  const q = S.cbQuery.trim().toLowerCase();
  const ed = S.chordEd && S.chordEd.origin.kind === 'book' ? S.chordEd : null;
  const nomes = allNames()
    .filter((n) => (!q || n.toLowerCase().includes(q)) && (!S.cbFilter || tonica(n) === S.cbFilter));

  const grupos = [];
  let atual = null;
  for (const n of nomes) {
    const t = tonica(n);
    if (t !== atual) { grupos.push({ t, nomes: [] }); atual = t; }
    grupos[grupos.length - 1].nomes.push(n);
  }

  const corpo = grupos.map((g) => `<div class="cb-group">${esc(g.t)}</div>
    ${g.nomes.map((n) => linhaHTML(n, ed)).join('')}`).join('')
    || '<div style="color:var(--muted);font-size:13px;padding:20px 4px">Nenhum acorde encontrado.</div>';

  return `<div class="screen">
    <div class="topbar">
      <button class="btn-icon" data-a="goSettings" title="Voltar">${I.back()}</button>
      <div class="page-title">Dicionário de acordes</div>
    </div>
    <div class="content-scroll" style="padding:26px 28px">
      <div class="cb-wrap">
        <div class="cb-bar">
          <div class="searchin" style="flex:1;min-width:180px">${I.search(17)}
            <input type="text" id="cb-query" placeholder="Buscar acorde..." value="${esc(S.cbQuery)}"></div>
          ${LETRAS.map((l) => `<button class="btn-ghost sm ${S.cbFilter === l ? 'on' : ''}" data-a="cbLetter" data-id="${l}">${l}</button>`).join('')}
          <button class="btn-ghost sm" data-a="cbStartAdd">${I.plus(16)}Acorde</button>
        </div>
        ${S.cbAdding ? `<div class="cb-bar">
          <input type="text" class="input" id="cb-new-name" placeholder="Nome do acorde (ex.: Cm7(9))" style="flex:1;min-width:200px">
          <button class="btn-save sm" data-a="cbConfirmAdd">Criar</button>
          <button class="btn-ghost sm" data-a="cbCancelAdd">Cancelar</button></div>` : ''}
        ${corpo}
      </div>
    </div>
  </div>`;
}
```

- [ ] **Step 3: Entrada em Configurações**

Em `app/js/render/settings.js`, acrescentar logo depois do botão "Adicionar música" (linha 20):

```js
        <button class="setting-row link" data-a="goChordbook">
          <div style="width:46px;height:46px;flex-shrink:0;border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--accent-tint2);color:var(--accent)">${I.gridChord(22)}</div>
          <div class="info"><div class="t title">Dicionário de acordes</div><div class="s">Variações de cada acorde, usadas em todas as músicas</div></div>
          ${I.chevR()}
        </button>
```

- [ ] **Step 4: Rota e ações no `main.js`**

No import de renders, acrescentar:

```js
import { renderChordbook } from './render/chordbookscreen.js';
```

E ao dicionário de imports do `chordbook.js` (já existente), acrescentar `removeVar, setDefault, restoreBuiltins`:

```js
import { shapesOf, defaultShape, shapeById, findShape, upsertVar, removeVar, setDefault, restoreBuiltins, labelsOf, shapeKey } from './chordbook.js';
```

Na função `update()`, acrescentar a rota depois da linha do `settings`:

```js
  else if (scr === 'chordbook') html = renderChordbook();
```

Em `afterRender()`, acrescentar depois do bloco do `#artist-query`:

```js
  const cbq = document.getElementById('cb-query');
  if (cbq) cbq.addEventListener('input', () => { S.cbQuery = cbq.value; update(); });
  const cbn = document.getElementById('cb-new-name');
  if (cbn) cbn.focus();
```

No objeto `actions`, acrescentar (junto das ações de configurações):

```js
  // dicionário de acordes
  goChordbook() { S.screen = 'chordbook'; S.chordEd = null; S.cbQuery = ''; S.cbFilter = null; S.cbAdding = false; update(); },
  cbLetter(d) { S.cbFilter = S.cbFilter === d.id ? null : d.id; update(); },
  cbEditVar(d, ev, el) {
    const s = shapeById(d.id, el.dataset.var);
    if (!s) return;
    S.chordEd = openEditor(d.id, s, { kind: 'book', varId: s.id });
    update();
  },
  cbNewVar(d) { S.chordEd = openEditor(d.id, null, { kind: 'book', varId: null }); update(); },
  cbSetDefault(d, ev, el) { setDefault(d.id, el.dataset.var); update(); toast('Padrão do acorde atualizada'); },
  cbDeleteVar(d, ev, el) {
    const id = el.dataset.var;
    const s = shapeById(d.id, id);
    if (!s) return;
    if (!confirm(`Apagar a variação “${s.label || 'variação'}” de ${d.id}? As músicas que já a usam mantêm a forma delas.`)) return;
    removeVar(d.id, id);
    S.chordEd = null;
    update();
  },
  cbRestore(d) { restoreBuiltins(d.id); update(); toast('Formas embutidas restauradas'); },
  cbStartAdd() { S.cbAdding = true; update(); },
  cbCancelAdd() { S.cbAdding = false; update(); },
  cbConfirmAdd() {
    const inp = document.getElementById('cb-new-name');
    const nome = inp ? inp.value.trim() : '';
    if (!nome) return;
    if (!isChordTok(nome)) { toast('Nome de acorde inválido'); return; }
    S.cbAdding = false;
    S.cbQuery = nome;
    S.cbFilter = null;   // senão o chip de tônica pode esconder o acorde recém-criado
    S.chordEd = openEditor(nome, null, { kind: 'book', varId: null });
    update();
  },
```

Acrescentar `isChordTok` ao import de `./chords.js` no topo do `main.js` (o arquivo ainda não importa nada de `chords.js` — criar o import):

```js
import { isChordTok } from './chords.js';
```

E no handler de `keydown`, junto dos outros Enter:

```js
    if (document.activeElement?.id === 'cb-new-name') actions.cbConfirmAdd();
```

- [ ] **Step 5: CSS do dicionário**

Acrescentar ao fim de `app/css/app.css`:

```css
/* ---- dicionário de acordes ---- */
.cb-wrap{max-width:900px;margin:0 auto}
.cb-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:14px}
.cb-group{font-family:var(--f-title);font-weight:700;font-size:13px;color:var(--muted);margin:16px 0 6px;letter-spacing:.04em}
.cb-row{display:flex;gap:14px;align-items:flex-start;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:12px 14px;margin-bottom:8px}
.cb-row.on{border-color:var(--accent)}
.cb-name{font-family:var(--f-title);font-weight:700;font-size:15px;min-width:84px;padding-top:22px}
.cb-body{flex:1;min-width:0}
.cb-vars{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-start}
.cb-var{display:flex;flex-direction:column;align-items:center;gap:3px}
.cb-var.on .pick-opt{border-color:var(--accent)}
.cb-uso{font-size:10px;color:var(--muted3)}
.cb-plus{width:64px;height:80px;border:1px dashed var(--border2);border-radius:12px;background:transparent;color:var(--muted);cursor:pointer;display:flex;align-items:center;justify-content:center}
.cb-plus:hover{border-color:var(--accent);color:var(--accent)}
.cb-actions{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
.btn-ghost.sm.danger{color:var(--red)}
```

- [ ] **Step 6: Verificar sintaxe e testes**

Run: `cd app && node --check js/render/chordbookscreen.js && node --check js/main.js && node --check js/render/settings.js && node --test 'test/*.test.js' 2>&1 | tail -5`
Expected: `pass 65 · fail 0`.

- [ ] **Step 7: Verificar no navegador**

Run: `cd app && python3 -m http.server 8137`

1. Configurações → **Dicionário de acordes**: lista agrupada por tônica, com as miniaturas.
2. Digitar "bm" na busca: filtra e **o cursor continua no campo** (Task 1).
3. Chips A–G filtram; tocar de novo desliga o filtro.
4. Tocar numa miniatura: abre o editor embaixo da linha, com `★ tornar padrão` e `apagar`.
5. `★ tornar padrão` muda a estrela; abrir uma música nova que use o acorde mostra a forma nova como padrão.
6. `+` na linha cria variação; **+ Acorde** cria um nome que não existe (ex.: `F#m7(11)`); nome inválido (ex.: `xyz`) mostra "Nome de acorde inválido".
7. Apagar uma embutida faz surgir **↺ restaurar embutidas**; restaurar traz de volta.
8. Corrigir uma variação usada por músicas → toast com a contagem; abrir as músicas e conferir o desenho novo.

- [ ] **Step 8: Commit**

```bash
git add app/js/render/chordbookscreen.js app/js/render/settings.js app/js/main.js app/js/state.js app/css/app.css
git commit -m "feat(chordbook): tela do dicionário de acordes em Configurações"
```

---

### Task 8: Dicionário no backup e bump do Service Worker

Fecha o ciclo: o dicionário viaja no `.somaplay` (substituir troca, merge une por id) e o app passa a pré-cachear os arquivos novos.

**Files:**
- Modify: `app/js/backup.js:10-40` (export) e `:45-85` (import)
- Modify: `app/sw.js:2-24` (versão + lista do shell)
- Test: `app/test/chordbook.test.js` (já cobre `mergeRecords`; acrescentar o caso de lista)

**Interfaces:**
- Consumes: `chordbookRecords`, `replaceChordbook`, `mergeChordbookRecords`, `mergeRecords`.
- Produces: campo `chordbook` no manifest do `.somaplay` (array de registros).

- [ ] **Step 1: Escrever o teste de contrato do backup**

Este é o único teste do plano que **não** começa falhando: `mergeRecords` já existe desde a Task 2, e as funções que faltam (`replaceChordbook` / `mergeChordbookRecords`) tocam o IndexedDB e não rodam em Node. O teste fixa o contrato que o import com merge depende — rede de segurança, não TDD.

Acrescentar ao fim de `app/test/chordbook.test.js`:

```js
test('mergeRecords sobre uma lista: nomes novos entram, existentes se fundem', () => {
  const locais = new Map([['C', { name: 'C', vars: [{ id: 'u:a', frets: [0, 0, 0, 0, 0, 0] }], hidden: [], defaultId: null }]]);
  const incoming = [
    { name: 'C', vars: [{ id: 'u:b', frets: [1, 1, 1, 1, 1, 1] }], hidden: [], defaultId: 'u:b' },
    { name: 'G', vars: [{ id: 'u:c', frets: [3, 2, 0, 0, 0, 3] }], hidden: [], defaultId: null },
  ];
  const out = incoming.map((inc) => mergeRecords(locais.get(inc.name), inc));
  assert.equal(out[0].vars.length, 2);
  assert.equal(out[0].defaultId, 'u:b');   // local não tinha padrão → adota a do arquivo
  assert.equal(out[1].name, 'G');
  assert.equal(out[1].vars.length, 1);
});
```

- [ ] **Step 2: Rodar e conferir que passa**

Run: `cd app && node --test 'test/*.test.js' 2>&1 | tail -5`
Expected: `pass 66 · fail 0`. Se **falhar**, a implementação de `mergeRecords` (Task 2) está errada — consertar lá antes de seguir.

- [ ] **Step 3: Dicionário no `backup.js`**

Acrescentar ao import do topo:

```js
import { chordbookRecords, replaceChordbook, mergeChordbookRecords } from './chordbook.js';
```

Em `exportLibrary`, acrescentar o campo ao `manifest` (depois de `settings: S.settings,`):

```js
    chordbook: chordbookRecords(),
```

Em `importLibrary`, no ramo `merge`, depois de gravar listas:

```js
    await mergeChordbookRecords(manifest.chordbook || []);
```

E no ramo de substituição, depois de gravar as settings:

```js
    await replaceChordbook(manifest.chordbook || []);
```

- [ ] **Step 4: Service Worker**

Em `app/sw.js`, trocar a linha 2:

```js
const VERSION = 'somaplay-v10';
```

E acrescentar ao array `SHELL`, junto dos outros módulos:

```js
  './js/chordbook.js',
  './js/render/chordeditor.js',
  './js/render/chordbookscreen.js',
  './js/render/estilo.js',
```

(`estilo.js` estava faltando desde a categorização por estilo — sem ele a tela de estilos pode falhar offline numa instalação nova.)

- [ ] **Step 5: Rodar os testes**

Run: `cd app && node --check js/backup.js && node --check sw.js && node --test 'test/*.test.js' 2>&1 | tail -5`
Expected: `pass 66 · fail 0`.

- [ ] **Step 6: Verificar no navegador**

Run: `cd app && python3 -m http.server 8137`

1. Criar uma variação nova em qualquer acorde.
2. Configurações → **Exportar biblioteca** → salvar o `.somaplay`.
3. Aba anônima → mesma URL → **Importar (substituir)** com esse arquivo → abrir o Dicionário: **a variação está lá**.
4. Voltar à aba normal, apagar a variação, e usar **Adicionar/atualizar do backup** com o mesmo arquivo → a variação volta, e nenhuma das outras é duplicada.
5. DevTools → Application → Service Workers: versão `somaplay-v10` ativa; em Cache Storage, `js/chordbook.js`, `js/render/chordeditor.js`, `js/render/chordbookscreen.js` e `js/render/estilo.js` na lista.

- [ ] **Step 7: Commit**

```bash
git add app/js/backup.js app/sw.js app/test/chordbook.test.js
git commit -m "feat(backup): dicionário de acordes no .somaplay + bump do service worker"
```

---

## Verificação final (depois da Task 8)

- [ ] `cd app && node --test 'test/*.test.js' 2>&1 | tail -5` → `pass 66 · fail 0`
- [ ] Caso-ouro da pestana: em *Queremos Saber*, montar o **F** com pestana na 1ª casa e o **Bm7** com a barra da Lá ao Mi agudo e o Mi grave em ✕; salvar, sair da música e voltar — os dois desenham certo.
- [ ] Uma variação criada numa música aparece como opção em outra música com o mesmo acorde.
- [ ] Corrigir uma variação no Dicionário mostra o toast com a contagem e muda as músicas que a usam; música com forma própria fica intacta.
- [ ] Editar casas não faz a página subir em nenhuma das três telas.
- [ ] Exportar/importar backup preserva o dicionário nos dois modos.
