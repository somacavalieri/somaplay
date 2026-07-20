# Miniaturas na música — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toggle "Miniaturas na música" no kebab da tela de toque que troca as linhas de acorde (com letra) da cifra em texto por blocos nome+diagrama SVG posicionados na coluna exata do acorde.

**Architecture:** Spec: [`docs/superpowers/specs/2026-07-20-miniaturas-na-musica-design.md`](../specs/2026-07-20-miniaturas-na-musica-design.md). Render derivado em string (padrão do app): a lógica pura de layout (posição por coluna × largura do caractere + resolução de colisão) vai em `app/js/chords.js` para ser testável em `node --test` (extensão deliberada da lista de arquivos do spec — `play.js` fica só com a montagem de HTML/medição por canvas, que exige DOM). Preferência global `settings.cifraMiniaturas` persistida com as demais.

**Tech Stack:** Vanilla ES modules, sem dependências. Testes: `node --test` (rodar de `app/`: `node --test 'test/*.test.js'` — **com aspas**; `node --test test/` falha neste Node v25).

## Global Constraints

- Todo texto de UI, comentários e commits em **português** (padrão do projeto).
- Sem toolchain: nenhum `npm install`, nenhum import novo de fora de `app/js/`.
- Qualquer mudança de arquivo do shell exige bump do Service Worker: `somaplay-v7` → `somaplay-v8` (uma vez, na Task 5).
- Arquitetura de render por string: nada de manipular DOM nos renders; medições via canvas são permitidas (não tocam o DOM da página).
- Baseline de testes: 15 passando antes da Task 1; nenhuma task pode reduzir isso.
- Commits frequentes, um por task, mensagens no padrão `feat(...)`/`test(...)` do histórico.

---

### Task 1: `chordDiagWidth` em chords.js (largura determinística do diagrama)

O layout precisa saber a largura do SVG **sem renderizar**: 64px (small) ou 84px (grande), +12/+15px quando a forma começa em casa alta (indicador "3ª"). Essa conta já existe dentro de `chordSVG` — extraí-la evita duplicação.

**Files:**
- Modify: `app/js/chords.js:63-75` (função `chordSVG`, início)
- Test: `app/test/chordrow.test.js` (criar)

**Interfaces:**
- Consumes: `catalogDefault(name)` de `chords-catalog.js` (já importado em chords.js).
- Produces: `chordDiagWidth(name, small, dict) -> number` (px). `dict` é o mapa `cifra.digitacoes` da música (`{ [nome]: { frets, barre? } }`) ou `null`. Usada na Task 4.

- [ ] **Step 1: Write the failing tests**

Criar `app/test/chordrow.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chordDiagWidth } from '../js/chords.js';

test('chordDiagWidth: forma na 1ª posição, small = 64', () => {
  assert.equal(chordDiagWidth('C', true, null), 64);
});

test('chordDiagWidth: forma em casa alta ganha margem do indicador (small = 76)', () => {
  // G/D no catálogo: frets [-1,5,5,4,3,-1] → base na 3ª casa → +12
  assert.equal(chordDiagWidth('G/D', true, null), 76);
});

test('chordDiagWidth: acorde desconhecido usa largura base (placeholder "?")', () => {
  assert.equal(chordDiagWidth('Zx9', true, null), 64);
});

test('chordDiagWidth: digitação da música tem prioridade sobre o catálogo', () => {
  const dict = { C: { frets: [-1, -1, 10, 9, 8, 8] } }; // casa alta → +12
  assert.equal(chordDiagWidth('C', true, dict), 76);
});

test('chordDiagWidth: tamanho grande (small=false) = 84 / 99', () => {
  assert.equal(chordDiagWidth('C', false, null), 84);
  assert.equal(chordDiagWidth('G/D', false, null), 99);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && node --test 'test/*.test.js' 2>&1 | tail -8`
Expected: FAIL — os 5 testes novos com `chordDiagWidth is not a function` (ou import error); os 15 antigos seguem passando.

- [ ] **Step 3: Implement — extrair `diagLm` e exportar `chordDiagWidth`**

Em `app/js/chords.js`, inserir **antes** de `chordSVG` (linha 62):

```js
// Margem esquerda do indicador de casa (ex.: "3ª") — 0 quando a forma começa na 1ª posição.
function diagLm(d, small) {
  if (!d) return 0;
  const FR = 4;
  const p = d.frets.filter((f) => f > 0);
  const mx = p.length ? Math.max(...p) : 1, mn = p.length ? Math.min(...p) : 1;
  return (mx <= FR ? 1 : mn) > 1 ? (small ? 12 : 15) : 0;
}

// Largura total (px) do SVG que chordSVG(name, small, dict) gera — permite ao
// layout das miniaturas inline calcular posições sem renderizar o SVG.
export function chordDiagWidth(name, small, dict) {
  const d = (dict && dict[name]) || catalogDefault(name);
  return (small ? 64 : 84) + diagLm(d, small);
}
```

E dentro de `chordSVG`, substituir o bloco:

```js
  let baseCalc = 1;
  if (d) {
    const p = d.frets.filter((f) => f > 0);
    const mx = p.length ? Math.max(...p) : 1, mn = p.length ? Math.min(...p) : 1;
    baseCalc = mx <= FR ? 1 : mn;
  }
  const lm = baseCalc > 1 ? (small ? 12 : 15) : 0;
```

por:

```js
  const lm = diagLm(d, small);
```

(`baseCalc` não é usado em mais nenhum lugar — o `base` do desenho é recalculado adiante na própria função.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && node --test 'test/*.test.js' 2>&1 | tail -8`
Expected: PASS — `tests 20, pass 20, fail 0` (15 antigos, inclusive os de `chordSVG`, + 5 novos).

- [ ] **Step 5: Commit**

```bash
git add app/js/chords.js app/test/chordrow.test.js
git commit -m "feat(chords): chordDiagWidth — largura determinística do diagrama (extrai diagLm do chordSVG)"
```

---

### Task 2: `layoutChordRow` em chords.js (posições com colisão)

**Files:**
- Modify: `app/js/chords.js` (após `extractChords`, antes de `diagLm`)
- Test: `app/test/chordrow.test.js` (estender)

**Interfaces:**
- Consumes: `isChordTok(t)` (mesma unidade).
- Produces: `layoutChordRow(chordLine, chPx, blockWidth, gap = 6) -> [{ tok, isChord, x }]` — `chordLine` é a string crua da linha de acordes (`ln.chords` do parser); `chPx` a largura px de um caractere da cifra; `blockWidth(tok, isChord) -> number` a largura px do bloco; `x` em px, ordem de aparição. Usada na Task 4.

- [ ] **Step 1: Write the failing tests**

Acrescentar em `app/test/chordrow.test.js` (e trocar a linha de import para incluir `layoutChordRow`):

```js
import { chordDiagWidth, layoutChordRow } from '../js/chords.js';
```

```js
const w64 = () => 64; // largura fixa: isola o layout do catálogo

test('layoutChordRow: sem colisão, x = coluna × largura do caractere', () => {
  // 'Gm' + 9 espaços → 'G7/B' começa na coluna 11
  const r = layoutChordRow('Gm         G7/B', 10, w64);
  assert.deepEqual(r.map((i) => [i.tok, i.x]), [['Gm', 0], ['G7/B', 110]]);
});

test('layoutChordRow: colisão empurra para a direita com gap de 6px', () => {
  const r = layoutChordRow('C D', 10, w64);
  assert.equal(r[0].x, 0);
  assert.equal(r[1].x, 70); // ideal 20, mas 0+64+6 = 70
});

test('layoutChordRow: empurrão se propaga em cadeia', () => {
  const r = layoutChordRow('C D E', 10, w64);
  assert.deepEqual(r.map((i) => i.x), [0, 70, 140]);
});

test('layoutChordRow: token não-acorde é marcado e participa do layout', () => {
  const r = layoutChordRow('Gm % x2', 10, (tok, isChord) => (isChord ? 64 : 20));
  assert.deepEqual(r.map((i) => [i.tok, i.isChord]),
    [['Gm', true], ['%', false], ['x2', false]]);
  assert.equal(r[1].x, 70); // ideal 30, empurrado para 0+64+6
  assert.equal(r[2].x, 96); // ideal 50, empurrado para 70+20+6
});

test('layoutChordRow: linha vazia → sem itens', () => {
  assert.deepEqual(layoutChordRow('', 10, w64), []);
  assert.deepEqual(layoutChordRow('   ', 10, w64), []);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && node --test 'test/*.test.js' 2>&1 | tail -8`
Expected: FAIL — 5 novos com `layoutChordRow is not a function`; 20 passando.

- [ ] **Step 3: Implement**

Em `app/js/chords.js`, inserir após `extractChords`:

```js
// Layout da fileira de miniaturas (spec 2026-07-20): tokens da linha de acordes
// → posição x (px) na coluna do caractere (fonte mono), colisões empurram para
// a direita e o empurrão se propaga. blockWidth(tok, isChord) → largura px.
export function layoutChordRow(chordLine, chPx, blockWidth, gap = 6) {
  const out = [];
  let cursor = 0;
  const re = /\S+/g;
  let m;
  while ((m = re.exec(chordLine))) {
    const tok = m[0];
    const isChord = isChordTok(tok);
    const x = Math.max(m.index * chPx, cursor);
    out.push({ tok, isChord, x });
    cursor = x + blockWidth(tok, isChord) + gap;
  }
  return out;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && node --test 'test/*.test.js' 2>&1 | tail -8`
Expected: PASS — `tests 25, pass 25, fail 0`.

- [ ] **Step 5: Commit**

```bash
git add app/js/chords.js app/test/chordrow.test.js
git commit -m "feat(chords): layoutChordRow — posições das miniaturas por coluna com resolução de colisão"
```

---

### Task 3: Preferência + ação + item no kebab

Sem teste unitário (estado + DOM); a verificação de comportamento é na Task 5. O item aparece para toda música cuja cifra **não é imagem** e alterna `Ligado/Desligado` já persistindo — o efeito visual chega na Task 4.

**Files:**
- Modify: `app/js/state.js:54-56` (default de `settings`)
- Modify: `app/js/main.js:207` (após `toggleInvert`, no objeto de ações)
- Modify: `app/js/render/play.js:242` (junto a `isImg`) e `app/js/render/play.js:263-273` (HTML do menu)

**Interfaces:**
- Consumes: padrão de ações `data-a` de main.js; `saveSettings()` (já importado em main.js); `I.gridChord(w)` de icons.js (já importado em play.js via `I`).
- Produces: `S.settings.cifraMiniaturas: boolean` (default `false`) — lida na Task 4; ação `toggleMiniaturas`.

- [ ] **Step 1: Default da preferência em state.js**

Substituir:

```js
  settings: {
    theme: 'dark', awake: true, cifraZoom: 110, defaultSpeed: 3, masterVol: 80,
  },
```

por:

```js
  settings: {
    theme: 'dark', awake: true, cifraZoom: 110, defaultSpeed: 3, masterVol: 80,
    cifraMiniaturas: false,
  },
```

(Settings antigos salvos no IDB não têm a chave; o merge `{ ...S.settings, ...st }` de `initState` preserva o default `false`.)

- [ ] **Step 2: Ação em main.js**

Inserir após a linha `toggleInvert() { S.imgInvert = !S.imgInvert; update(); },`:

```js
  toggleMiniaturas() {
    S.settings.cifraMiniaturas = !S.settings.cifraMiniaturas;
    saveSettings();
    update();
  },
```

(Menu fica aberto, como no Inverter cores — o efeito aparece atrás do menu.)

- [ ] **Step 3: Item no kebab em play.js**

Em `renderPlay`, logo após `const isImg = ...`:

```js
  const isTextCifra = song.cifra?.fonte !== 'imagem';
```

No template `const menu = S.imgMenuOpen ? ...`, inserir entre o primeiro `<div class="sep"></div>` e o bloco `${isImg ? ...}`:

```js
      ${isTextCifra ? `
        <button data-a="toggleMiniaturas">${I.gridChord(18)}<span style="flex:1;text-align:left">Miniaturas na música</span><span class="state ${S.settings.cifraMiniaturas ? 'on' : ''}">${S.settings.cifraMiniaturas ? 'Ligado' : 'Desligado'}</span></button>
        <div class="sep"></div>` : ''}
```

- [ ] **Step 4: Run tests (regressão)**

Run: `cd app && node --test 'test/*.test.js' 2>&1 | tail -5`
Expected: PASS — `tests 25, pass 25, fail 0`.

- [ ] **Step 5: Commit**

```bash
git add app/js/state.js app/js/main.js app/js/render/play.js
git commit -m "feat(play): preferência cifraMiniaturas + item 'Miniaturas na música' no kebab"
```

---

### Task 4: Render da fileira de miniaturas + CSS

**Files:**
- Modify: `app/js/render/play.js:7` (import), `play.js:105-121` (`cifraTextHTML` + helpers novos antes dela)
- Modify: `app/css/app.css:240` (após a regra `.cifra-text .ly`)

**Interfaces:**
- Consumes: `layoutChordRow(chordLine, chPx, blockWidth)` e `chordDiagWidth(name, true, dict)` (Tasks 1–2); `chordSVG(name, true, dict)`; `esc()`; `S.settings.cifraMiniaturas` (Task 3); ação existente `openChordPicker` (recebe `data-id` = nome do acorde).
- Produces: nada consumido adiante (fim da cadeia).

- [ ] **Step 1: Import em play.js**

Substituir a linha 7:

```js
import { parseCifraText, extractChords, chordSVG } from '../chords.js';
```

por:

```js
import { parseCifraText, extractChords, chordSVG, chordDiagWidth, layoutChordRow } from '../chords.js';
```

- [ ] **Step 2: Helpers de medição + fileira (antes de `cifraTextHTML`)**

```js
// ---- miniaturas inline (spec 2026-07-20) ----
// Medição de texto com as fontes reais (canvas compartilhado; não toca o DOM).
let _measureCtx = null;
function textMeasurer(px, family, weight = 700) {
  if (!_measureCtx) _measureCtx = document.createElement('canvas').getContext('2d');
  const font = `${weight} ${px}px ${family}`;
  return (t) => { _measureCtx.font = font; return _measureCtx.measureText(t).width; };
}

// Medidores da fileira — recriados a cada render da cifra (acompanham o zoom).
function rowMeasurers(cifraFontPx) {
  const css = getComputedStyle(document.documentElement);
  const mono = css.getPropertyValue('--f-mono');
  const title = css.getPropertyValue('--f-title');
  return {
    chPx: textMeasurer(cifraFontPx, mono)('0'), // largura do caractere da cifra (.ch é mono bold)
    label: textMeasurer(13, title),             // nome do acorde (.ch-diag .nm)
    tok: textMeasurer(13, mono),                // token não-acorde (.ch-tok)
  };
}

// Fileira nome+diagrama no lugar da linha de acordes (só linhas com letra).
function chordDiagRowHTML(chordLine, dict, meas) {
  const items = layoutChordRow(chordLine, meas.chPx, (tok, isChord) =>
    (isChord ? Math.max(chordDiagWidth(tok, true, dict), meas.label(tok)) : meas.tok(tok)));
  const inner = items.map((it) => (it.isChord
    ? `<button class="ch-diag" style="left:${Math.round(it.x)}px" data-a="openChordPicker" data-id="${esc(it.tok)}" title="Trocar variação"><span class="nm">${esc(it.tok)}</span>${chordSVG(it.tok, true, dict)}</button>`
    : `<span class="ch-tok" style="left:${Math.round(it.x)}px">${esc(it.tok)}</span>`)).join('');
  return `<div class="ch-diag-row">${inner}</div>`;
}
```

- [ ] **Step 3: Usar na `cifraTextHTML`**

Substituir o início da função:

```js
function cifraTextHTML(song) {
  const parsed = parsedCifra(song);
  const zoom = S.settings.cifraZoom / 100;
  const lines = parsed.map((ln) => {
    let h = '';
    if (ln.isSection) h += `<div class="sec">${esc(ln.section)}</div>`;
    if (ln.hasChords) h += `<div class="ch">${esc(ln.chords)}</div>`;
    if (ln.hasLyric) h += `<div class="ly">${esc(ln.lyric)}</div>`;
    return h;
  }).join('');
```

por:

```js
function cifraTextHTML(song) {
  const parsed = parsedCifra(song);
  const zoom = S.settings.cifraZoom / 100;
  const fontPx = Math.round(20 * zoom);
  const mini = S.settings.cifraMiniaturas;
  const dict = song.cifra?.digitacoes || null;
  const meas = mini ? rowMeasurers(fontPx) : null;
  const lines = parsed.map((ln) => {
    let h = '';
    if (ln.isSection) h += `<div class="sec">${esc(ln.section)}</div>`;
    if (ln.hasChords) {
      h += (mini && ln.hasLyric)
        ? chordDiagRowHTML(ln.chords, dict, meas)
        : `<div class="ch">${esc(ln.chords)}</div>`;
    }
    if (ln.hasLyric) h += `<div class="ly">${esc(ln.lyric)}</div>`;
    return h;
  }).join('');
```

E na linha do contêiner, trocar `style="font-size:${Math.round(20 * zoom)}px"` por `style="font-size:${fontPx}px"`.

Regras cobertas de graça: linha só de acordes (`hasLyric` falso) continua `.ch` texto; acorde sem forma → `chordSVG` desenha "?"; repetição a cada ocorrência (layout é por linha).

- [ ] **Step 4: CSS**

Em `app/css/app.css`, inserir após `.cifra-text .ly{...}` (linha 240):

```css
/* miniaturas inline ("Miniaturas na música") */
.cifra-text .ch-diag-row{position:relative;height:100px;margin:6px 0 2px}
.ch-diag{position:absolute;top:0;display:flex;flex-direction:column;align-items:flex-start;gap:2px;background:none;border:0;padding:0;cursor:pointer}
.ch-diag .nm{font-family:var(--f-title);font-weight:700;font-size:13px;line-height:1;color:var(--accent);white-space:nowrap}
.ch-diag-row .ch-tok{position:absolute;top:0;font-family:var(--f-mono);font-weight:700;font-size:13px;color:var(--accent);white-space:pre}
```

(Altura: nome 13 + gap 2 + SVG small 80 = 95 → 100px dá respiro antes da letra. `align-items:flex-start` mantém a borda esquerda do diagrama ancorada na coluna do acorde.)

- [ ] **Step 5: Run tests (regressão)**

Run: `cd app && node --test 'test/*.test.js' 2>&1 | tail -5`
Expected: PASS — `tests 25, pass 25, fail 0`.

- [ ] **Step 6: Commit**

```bash
git add app/js/render/play.js app/css/app.css
git commit -m "feat(play): miniaturas inline na cifra em texto — fileira nome+diagrama alinhada por coluna"
```

---

### Task 5: Bump do Service Worker + verificação manual

**Files:**
- Modify: `app/sw.js:2`

**Interfaces:**
- Consumes: tudo das tasks anteriores (verificação de ponta a ponta).
- Produces: release pronto.

- [ ] **Step 1: Bump**

Em `app/sw.js`, substituir:

```js
const VERSION = 'somaplay-v7';
```

por:

```js
const VERSION = 'somaplay-v8';
```

- [ ] **Step 2: Suíte completa**

Run: `cd app && node --test 'test/*.test.js' 2>&1 | tail -5`
Expected: PASS — `tests 25, pass 25, fail 0`.

- [ ] **Step 3: Verificação manual no navegador (checklist do spec)**

Servir: `cd app && python3 -m http.server 8137` (ou dois cliques em `serve.command`) → `http://localhost:8137/`. Se a biblioteca estiver vazia, importar os samples pela tela inicial (inclui "As Pastorinhas" em texto). Com uma música de cifra em **texto** aberta, conferir:

1. Kebab mostra "Miniaturas na música · Desligado"; ao tocar vira "Ligado" e os diagramas aparecem.
2. Diagramas sobre as sílabas certas (comparar com a mesma linha com o toggle desligado).
3. Linha só de acordes (intro/solo) continua texto puro.
4. Acordes vizinhos não se sobrepõem (se empurram com folga).
5. Toque num diagrama abre o seletor de variações.
6. Zoom da cifra (Configurações → tamanho) mantém o alinhamento.
7. Tema claro legível.
8. Recarregar o app (fechar aba, reabrir): preferência mantida.
9. Música com cifra por **imagem**: item ausente no kebab.
10. Rolagem automática chega ao fim da página (mais longa).
11. Acorde sem forma no catálogo/digitações mostra o diagrama "?".

Quem executa com navegador automatizado (Chrome DevTools MCP) pode cobrir 1–5 e 9 com screenshots; 6–8 e 10–11 valem conferência do usuário no tablet.

- [ ] **Step 4: Commit**

```bash
git add app/sw.js
git commit -m "chore(sw): bump v7→v8 — miniaturas inline na cifra em texto"
```
