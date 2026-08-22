# Livros em PDF — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Importar um songbook em PDF no soma_play e lê-lo página a página com zoom, sem extrair música nenhuma, com o livro viajando no `.somaplay`.

**Architecture:** O PDF inteiro vai para o OPFS pelo `DB.saveBlob()` que já existe. Uma cópia vendorizada do pdf.js desenha a página pedida num `<canvas>` na resolução do zoom. Todo contato com a biblioteca de terceiro fica atrás de `app/js/pdf.js`. Livro é entidade própria (store `books` no IndexedDB, aba própria na home), nunca um caso especial de música.

**Tech Stack:** ES modules servidos como estão (sem build, sem gerenciador de pacotes) · IndexedDB + OPFS · Canvas 2D · pdf.js v6.2.108 (legacy build) · `node --test` para lógica pura.

**Spec:** `docs/superpowers/specs/2026-08-22-livros-pdf-design.md` — leia antes da Tarefa 1. O plano argumenta a partir dela.

## Global Constraints

- **Sem build step e sem gerenciador de pacotes.** O pdf.js entra como arquivo estático copiado para dentro do repositório. Nada de `npm install`.
- **Rodar e testar:** `cd app && python3 -m http.server 8137` para servir; `cd app && node --test` para a suíte; `cd app && node --check js/<arquivo>.js` para sintaxe. Node ≥ 20.
- **`file://` não serve.** Service Worker, OPFS e ES modules exigem servidor HTTP.
- **Língua dos comentários:** arquivo **novo** é comentado em **inglês**; arquivo existente mantém a língua que já tem (os módulos do app são em português). Um arquivo que troca de língua no meio é pior que qualquer uma das duas escolhas.
- **Commits em inglês**, sempre.
- **Chave de i18n nova entra nas DUAS tabelas** (`app/js/i18n/pt.js` e `app/js/i18n/en.js`), ou `app/test/i18n.test.js` quebra. String traduzida é produzida em tempo de render, nunca em constante de módulo.
- **Nunca traduzir valor de `data-*`.** `data-id` de livro é id persistido.
- **`DB_NAME` continua `'somaplay'`.** Renomear apaga a biblioteca de todo mundo.
- **Todo arquivo novo sob `app/js/` entra no `SHELL` do `app/sw.js`**, ou o app quebra offline.
- **Versão do produto em dois lugares:** `app/js/version.js` e a linha 2 de `app/sw.js`. `app/test/version.test.js` mantém os dois casados.
- **pdf.js v6.2.108, build `legacy`.** Versão fixada; atualizar é uma decisão consciente, não um efeito colateral.

## Estrutura de arquivos

**Criados:**

| Arquivo | Responsabilidade |
|---|---|
| `app/js/vendor/pdfjs/` | a biblioteca de terceiro, copiada. Ninguém edita nada aqui. |
| `app/js/pdf.js` | a fronteira. Abrir documento, contar páginas, desenhar página, fechar. **Único** módulo que importa o pdf.js. |
| `app/js/books.js` | lógica pura de livro: limpar título de nome de arquivo, coletar blobIds, fundir livros de um import. Sem DOM, sem DB. |
| `app/js/panzoom.js` | detecção de gesto (pinça e arrasto), compartilhada pela tela de tocar e pela do livro. |
| `app/js/render/books.js` | a estante (aba Livros) e o formulário de import. |
| `app/js/render/book.js` | a tela de leitura: página, HUD, grade de miniaturas. |
| `app/diag-pdf.html` | página de diagnóstico avulsa, no espírito do `diag.html` que já existe. Fora do `SHELL`. |
| `app/test/books.test.js` | testes puros de `books.js`. |
| `app/test/panzoom.test.js` | testes puros da matemática do gesto. |

**Modificados:** `app/js/db.js` (store `books`, v3, `wipe`) · `app/js/state.js` (`S.books`, carregar, criar, apagar) · `app/js/partes.js` (dois eixos de partes) · `app/js/backup.js` (livro no arquivo) · `app/js/merge.js` (fusão de livros) · `app/js/main.js` (rota, ações, input de arquivo) · `app/js/render/home.js` (quinta aba) · `app/js/render/play.js` (passa a usar `panzoom.js`) · `app/js/icons.js` · `app/css/app.css` · `app/js/i18n/pt.js` e `en.js` · `app/sw.js` · `app/js/version.js` · `app/test/shell.test.js` · `app/test/partes.test.js`.

---

### Task 1: Vendorizar o pdf.js e provar que ele abre os três livros

O primeiro passo é o que a spec chama de risco medido: o Fake Book tem 301 MB e ninguém sabe ainda se o pdf.js o abre num tablet sem estourar memória. Nada de tela antes disso.

**Files:**
- Create: `app/js/vendor/pdfjs/pdf.mjs`, `app/js/vendor/pdfjs/pdf.worker.mjs`, `app/js/vendor/pdfjs/wasm/*`, `app/js/vendor/pdfjs/standard_fonts/*`, `app/js/vendor/pdfjs/LICENSE`, `app/js/vendor/pdfjs/VERSAO.md`
- Create: `app/js/pdf.js`
- Create: `app/diag-pdf.html`
- Modify: `app/sw.js` (array `VENDOR` novo)
- Test: `app/test/shell.test.js`

**Interfaces:**
- Consumes: nada.
- Produces: `abrirLivro(file) → Promise<doc>`, `paginasDe(doc) → number`, `renderPagina(doc, n, larguraCss, dpr, canvas) → Promise<{w,h}>`, `fecharLivro(doc) → Promise<void>`, `MAX_CANVAS_PX` (number). `doc` é opaco para o resto do app.

- [ ] **Step 1: Escrever o teste que falha — o SHELL precisa cobrir o vendor**

Em `app/test/shell.test.js`, acrescente ao final (o arquivo já lê `SHELL` do `sw.js`; agora lê também `VENDOR`):

```js
const vendor = [...SW.match(/const VENDOR = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)]
  .map((m) => m[1]);

function vendorOnDisk(dir = 'js/vendor') {
  if (!existsSync(APP + dir)) return [];
  return readdirSync(APP + dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? vendorOnDisk(`${dir}/${e.name}`) : [`./${dir}/${e.name}`]);
}

test('todo arquivo vendorizado está no VENDOR do Service Worker', () => {
  // Sem isto, um .wasm esquecido some offline e o livro escaneado abre em branco
  // — falha que só aparece no tablet, depois de instalado.
  const naoPrecacheados = vendorOnDisk().filter((f) => !vendor.includes(f) && !f.endsWith('.md'));
  assert.deepEqual(naoPrecacheados, [],
    `arquivos em js/vendor fora do VENDOR: ${naoPrecacheados.join(', ')}`);
});

test('todo caminho do VENDOR existe em disco', () => {
  const faltando = vendor.filter((p) => !existsSync(APP + p));
  assert.deepEqual(faltando, [], `caminhos no VENDOR sem arquivo: ${faltando.join(', ')}`);
});
```

E ajuste `modulesOnDisk()` para **não** varrer `js/vendor` (ele exige `.js` no `SHELL`, e o vendor é `.mjs` no `VENDOR`):

```js
function modulesOnDisk(dir = 'js') {
  return readdirSync(APP + dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? (e.name === 'vendor' ? [] : modulesOnDisk(`${dir}/${e.name}`))
      : e.name.endsWith('.js') ? [`./${dir}/${e.name}`] : []);
}
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd app && node --test test/shell.test.js
```

Esperado: FAIL — `SW.match(...)` devolve `null` porque `sw.js` ainda não tem `const VENDOR`, e o teste estoura em `Cannot read properties of null`. É a falha certa.

- [ ] **Step 3: Baixar e copiar os arquivos do pdf.js**

```bash
cd /tmp && rm -rf pdfjs-vendor && mkdir pdfjs-vendor && cd pdfjs-vendor
curl -sSL -o pdfjs.zip https://github.com/mozilla/pdf.js/releases/download/v6.2.108/pdfjs-6.2.108-legacy-dist.zip
unzip -q pdfjs.zip

APP=~/"Library/CloudStorage/GoogleDrive-somacavalieri@gmail.com/My Drive/_claude/somaplay/app"
mkdir -p "$APP/js/vendor/pdfjs/wasm" "$APP/js/vendor/pdfjs/standard_fonts"
cp build/pdf.mjs build/pdf.worker.mjs "$APP/js/vendor/pdfjs/"
cp web/wasm/jbig2.wasm web/wasm/openjpeg.wasm web/wasm/qcms_bg.wasm web/wasm/LICENSE_* "$APP/js/vendor/pdfjs/wasm/"
cp web/standard_fonts/* "$APP/js/vendor/pdfjs/standard_fonts/"
cp LICENSE "$APP/js/vendor/pdfjs/LICENSE"
ls -la "$APP/js/vendor/pdfjs/"
```

Os `.map` **não** vão junto (8 MB de sourcemap que ninguém vai ler no tablet). `cmaps/` também não: são 1,6 MB e 169 arquivos para codificação CJK, que nenhum songbook do acervo usa. `quickjs-eval.wasm` também não: é para JavaScript embutido em formulário PDF, que a spec não suporta.

Escreva `app/js/vendor/pdfjs/VERSAO.md`:

```markdown
# pdf.js vendorizado

Versão: **v6.2.108** (build `legacy`), baixada de
https://github.com/mozilla/pdf.js/releases/download/v6.2.108/pdfjs-6.2.108-legacy-dist.zip

Copiados daqui: `build/pdf.mjs`, `build/pdf.worker.mjs`, `web/wasm/{jbig2,openjpeg,qcms_bg}.wasm`
(mais as licenças em `web/wasm/LICENSE_*`), `web/standard_fonts/*` e `LICENSE`.

Deixados de fora de propósito: os `*.map` (8 MB de sourcemap), `web/cmaps/` (1,6 MB
para codificação CJK, que o acervo não usa) e `quickjs-eval.wasm` (JavaScript
embutido em formulário PDF, fora do escopo).

**Nada aqui é editado.** Atualizar = baixar a versão nova, repetir a cópia acima,
atualizar este arquivo e rodar `node --test` (o teste do SHELL cobre arquivo novo
ou removido). Código de terceiro sob a licença Apache 2.0 em `LICENSE`.
```

- [ ] **Step 4: Escrever a fronteira `app/js/pdf.js`**

```js
// pdf.js — the boundary around the vendored PDF renderer.
//
// Nothing else in the app imports pdf.js. A breaking change upstream, or
// swapping the renderer altogether, has to touch this file and no other.
// Design: docs/superpowers/specs/2026-08-22-livros-pdf-design.md
import * as pdfjs from './vendor/pdfjs/pdf.mjs';

// Local worker, never the CDN default: a CDN workerSrc works in development and
// dies offline, which is the whole point of this app.
pdfjs.GlobalWorkerOptions.workerSrc = new URL('./vendor/pdfjs/pdf.worker.mjs', import.meta.url).href;

const WASM_URL = new URL('./vendor/pdfjs/wasm/', import.meta.url).href;
const FONTS_URL = new URL('./vendor/pdfjs/standard_fonts/', import.meta.url).href;

// Chrome refuses to allocate a canvas past a total area, and a 300 dpi page at
// zoom 4 walks straight into it. Past this the reader scales the bitmap instead
// of redrawing: it loses sharpness rather than losing the page.
export const MAX_CANVAS_PX = 16_000_000;

// Reads the file in slices instead of loading it whole. The Fake Book is 301 MB;
// a tablet does not have that to spare, and a File from OPFS slices lazily off
// disk. 128 KB of head data is enough for pdf.js to find the trailer and start.
const CABECA = 128 * 1024;

class FatiaDeArquivo extends pdfjs.PDFDataRangeTransport {
  constructor(file, inicio) {
    super(file.size, inicio, false, file.name || null);
    this.file = file;
  }
  requestDataRange(begin, end) {
    this.file.slice(begin, end).arrayBuffer()
      .then((buf) => this.onDataRange(begin, new Uint8Array(buf)));
  }
  abort() { this.file = null; }
}

// `file` is what DB.getBlob() hands back for a stored book (a File on OPFS, a
// Blob on the IndexedDB fallback). Throws on a PDF pdf.js cannot open — the
// caller turns that into a message and leaves no orphan record behind.
export async function abrirLivro(file) {
  const inicio = new Uint8Array(await file.slice(0, Math.min(CABECA, file.size)).arrayBuffer());
  return pdfjs.getDocument({
    range: new FatiaDeArquivo(file, inicio),
    wasmUrl: WASM_URL,
    standardFontDataUrl: FONTS_URL,
    disableAutoFetch: true,
    isEvalSupported: false,
  }).promise;
}

export function paginasDe(doc) { return doc.numPages; }

// Draws page `n` into `canvas` at `larguraCss` CSS pixels wide, times the device
// pixel ratio, capped by MAX_CANVAS_PX. Returns the CSS size the caller should
// give the element. Redrawing — not stretching — is what makes the 300 dpi scan
// actually show up when you zoom in.
export async function renderPagina(doc, n, larguraCss, dpr, canvas) {
  const page = await doc.getPage(n);
  const base = page.getViewport({ scale: 1 });
  let escala = (larguraCss * dpr) / base.width;
  const area = (base.width * escala) * (base.height * escala);
  if (area > MAX_CANVAS_PX) escala *= Math.sqrt(MAX_CANVAS_PX / area);
  const viewport = page.getViewport({ scale: escala });
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext('2d', { alpha: false });
  const task = page.render({ canvasContext: ctx, viewport });
  try { await task.promise; }
  finally { page.cleanup(); }
  return { w: larguraCss, h: larguraCss * (base.height / base.width) };
}

export async function fecharLivro(doc) {
  if (doc) { try { await doc.destroy(); } catch (e) { /* já fechado */ } }
}

export const versaoPdfJs = pdfjs.version;
```

- [ ] **Step 5: Registrar o vendor no Service Worker**

Em `app/sw.js`, logo depois do array `SHELL`, acrescente:

```js
// A biblioteca de terceiro que desenha PDF. Array separado do SHELL de propósito:
// cache.addAll() rejeita inteiro se UM caminho faltar, e um .wasm esquecido aqui
// não pode derrubar a instalação do app todo. O teste do SHELL compara este array
// com o que existe em js/vendor.
const VENDOR = [
  './js/vendor/pdfjs/pdf.mjs',
  './js/vendor/pdfjs/pdf.worker.mjs',
  './js/vendor/pdfjs/LICENSE',
  './js/vendor/pdfjs/wasm/jbig2.wasm',
  './js/vendor/pdfjs/wasm/openjpeg.wasm',
  './js/vendor/pdfjs/wasm/qcms_bg.wasm',
  './js/vendor/pdfjs/wasm/LICENSE_JBIG2',
  './js/vendor/pdfjs/wasm/LICENSE_OPENJPEG',
  './js/vendor/pdfjs/wasm/LICENSE_PDFJS_JBIG2',
  './js/vendor/pdfjs/wasm/LICENSE_PDFJS_OPENJPEG',
  './js/vendor/pdfjs/wasm/LICENSE_PDFJS_QCMS',
  './js/vendor/pdfjs/wasm/LICENSE_QCMS',
  // standard_fonts: preencha com `ls app/js/vendor/pdfjs/standard_fonts` — são 16
  // arquivos, e o teste acusa qualquer um que faltar aqui.
];
```

No `install`, depois do `cache.addAll(SHELL)`:

```js
await cache.addAll(VENDOR);
```

Preencha as 16 linhas de `standard_fonts` com:

```bash
cd app && ls js/vendor/pdfjs/standard_fonts | sed "s|^|  './js/vendor/pdfjs/standard_fonts/|; s|$|',|"
```

- [ ] **Step 6: Rodar os testes**

```bash
cd app && node --test test/shell.test.js && node --check js/pdf.js
```

Esperado: PASS nos quatro testes do arquivo, e o `node --check` em silêncio.

- [ ] **Step 7: Escrever a página de diagnóstico `app/diag-pdf.html`**

```html
<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Soma Play — diagnóstico de PDF</title>
<style>
  body{background:#11151a;color:#e8eef5;font:14px/1.5 ui-monospace,Menlo,monospace;margin:0;padding:16px}
  h1{font-size:16px;color:#f0b23c;margin:0 0 12px}
  input,button{background:#f0b23c;color:#11151a;border:0;border-radius:8px;padding:10px 14px;font:600 14px system-ui;margin:0 8px 12px 0}
  pre{white-space:pre-wrap;background:#0b0e12;border:1px solid #223;border-radius:8px;padding:12px}
  canvas{max-width:100%;background:#fff;border-radius:6px}
  .ok{color:#4ade80}.bad{color:#f87171}
</style>
<h1>Soma Play — diagnóstico de PDF</h1>
<input type="file" id="f" accept="application/pdf">
<button id="p10">Desenhar página 10</button>
<pre id="out">Escolha um PDF.</pre>
<canvas id="c"></canvas>
<script type="module">
import { abrirLivro, paginasDe, renderPagina, fecharLivro, versaoPdfJs } from './js/pdf.js';
const out = document.getElementById('out'); const L = [];
const log = (s, cls) => { L.push(cls ? `<span class="${cls}">${s}</span>` : s); out.innerHTML = L.join('\n'); };
const mem = () => performance.memory ? ` · heap ${(performance.memory.usedJSHeapSize/1e6).toFixed(0)} MB` : '';
let doc = null;
document.getElementById('f').addEventListener('change', async (e) => {
  const file = e.target.files[0]; if (!file) return;
  L.length = 0; log(`pdf.js ${versaoPdfJs}`);
  log(`arquivo: ${file.name} · ${(file.size/1e6).toFixed(1)} MB`);
  await fecharLivro(doc);
  const t0 = performance.now();
  try {
    doc = await abrirLivro(file);
    log(`abriu em ${(performance.now()-t0).toFixed(0)} ms · ${paginasDe(doc)} páginas${mem()}`, 'ok');
  } catch (err) { log(`FALHOU: ${err && err.message}`, 'bad'); }
});
document.getElementById('p10').addEventListener('click', async () => {
  if (!doc) return log('abra um PDF primeiro', 'bad');
  const t0 = performance.now();
  const { w, h } = await renderPagina(doc, Math.min(10, paginasDe(doc)), 900, window.devicePixelRatio || 1, document.getElementById('c'));
  log(`desenhou em ${(performance.now()-t0).toFixed(0)} ms · ${w}×${Math.round(h)} css${mem()}`, 'ok');
});
</script>
```

- [ ] **Step 8: A medição — o passo que existe para esta tarefa existir**

```bash
cd app && python3 -m http.server 8137
```

Abra `http://localhost:8137/diag-pdf.html` e rode com os três arquivos de
`chords/_a-identificar/`, anotando tempo de abertura, tempo de desenho e heap:

| Arquivo | Páginas esperadas |
|---|---|
| `889817455-Michael-Jackson-Complete-Songbook.pdf` | 61 |
| `555027200-The-Beatles-Essential-Songs.pdf` | 401 |
| `664210815-Beatles-Fake-Book.pdf` (301 MB) | 176 |

Depois **repita no tablet Android**, que é onde a resposta conta. Critério: o
Fake Book abre e desenha sem a aba morrer. Se morrer, pare e reporte antes de
seguir — a spec prevê mensagem honesta para o livro grande, e essa decisão é do
usuário, não desta tarefa.

- [ ] **Step 9: Commit**

```bash
git add app/js/vendor app/js/pdf.js app/diag-pdf.html app/sw.js app/test/shell.test.js
git commit -m "feat(pdf): vendor pdf.js v6.2.108 behind a four-function boundary"
```

---

### Task 2: O registro do livro — lógica pura e persistência

**Files:**
- Create: `app/js/books.js`, `app/test/books.test.js`
- Modify: `app/js/db.js:9` (versão), `app/js/db.js:18-26` (stores), `app/js/db.js:82-90` (`loadAll`), `app/js/db.js:176-182` (`wipe`), `app/js/state.js:44-47` (`S`), `app/js/state.js:381-386` (`initState`)

**Interfaces:**
- Consumes: nada da Tarefa 1.
- Produces: `tituloDeArquivo(nome) → string`, `blobIdsDosLivros(books) → string[]`, `fundeLivros(atuais, doArquivo) → { books, added, updated }` (de `books.js`); `DB.putBook(b)`, `DB.deleteBook(id)`, `DB.loadAll()` passando a devolver `{ artists, songs, lists, books }`; `S.books`, `criarLivro(file, { titulo, autor })`, `apagarLivro(id)`, `renomearLivro(id, { titulo, autor })`, `livroById(id)` (de `state.js`).

- [ ] **Step 1: Escrever os testes que falham**

`app/test/books.test.js`:

```js
// books.test.js — a lógica de livro que dá para testar sem navegador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tituloDeArquivo, blobIdsDosLivros, fundeLivros } from '../js/books.js';

test('tira a extensão e troca separador por espaço', () => {
  assert.equal(tituloDeArquivo('O-Melhor-de-Gonzaguinha.pdf'), 'O Melhor de Gonzaguinha');
  assert.equal(tituloDeArquivo('livro_de_cifras.PDF'), 'livro de cifras');
});

test('tira o id numérico que o Scribd cola na frente', () => {
  // Quase todo arquivo de chords/_a-identificar/ chega assim.
  assert.equal(tituloDeArquivo('555027200-The-Beatles-Essential-Songs.pdf'),
    'The Beatles Essential Songs');
  assert.equal(tituloDeArquivo('889817455-Michael-Jackson-Complete-Songbook.pdf'),
    'Michael Jackson Complete Songbook');
});

test('não come um número que é o título', () => {
  // "101 Músicas" é nome de songbook de verdade; o corte só vale para o id
  // longo do Scribd seguido de hífen.
  assert.equal(tituloDeArquivo('101-Musicas-do-Seculo-XX.pdf'), '101 Musicas do Seculo XX');
});

test('nome vazio ou sem miolo devolve string vazia', () => {
  assert.equal(tituloDeArquivo(''), '');
  assert.equal(tituloDeArquivo('.pdf'), '');
  assert.equal(tituloDeArquivo(null), '');
});

test('colhe os dois blobs de cada livro, sem buraco', () => {
  const books = [
    { id: 'a', blobId: 'b1', capaBlobId: 'c1' },
    { id: 'b', blobId: 'b2' },                   // livro cuja capa não foi gerada
  ];
  assert.deepEqual(blobIdsDosLivros(books), ['b1', 'c1', 'b2']);
  assert.deepEqual(blobIdsDosLivros([]), []);
  assert.deepEqual(blobIdsDosLivros(null), []);
});

test('fusão: livro novo entra', () => {
  const r = fundeLivros([{ id: 'a', titulo: 'A' }], [{ id: 'b', titulo: 'B' }]);
  assert.deepEqual(r.books.map((b) => b.id), ['a', 'b']);
  assert.equal(r.added, 1);
  assert.equal(r.updated, 0);
});

test('fusão: livro que o aparelho já tem é PRESERVADO, não reescrito', () => {
  // 300 MB reescritos por um import é o custo que esta regra evita — e o
  // registro local pode ter título corrigido à mão e ultimaPagina de verdade.
  const atual = { id: 'a', titulo: 'Corrigido à mão', ultimaPagina: 42, blobId: 'b1' };
  const r = fundeLivros([atual], [{ id: 'a', titulo: 'Nome do arquivo', ultimaPagina: 1, blobId: 'b9' }]);
  assert.deepEqual(r.books, [atual]);
  assert.equal(r.added, 0);
  assert.equal(r.updated, 0);
});

test('fusão: arquivo sem livro nenhum não mexe na estante', () => {
  const atuais = [{ id: 'a', titulo: 'A' }];
  const r = fundeLivros(atuais, []);
  assert.deepEqual(r.books, atuais);
  const r2 = fundeLivros(atuais, undefined);
  assert.deepEqual(r2.books, atuais);
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd app && node --test test/books.test.js
```

Esperado: FAIL — `Cannot find module '../js/books.js'`.

- [ ] **Step 3: Escrever `app/js/books.js`**

```js
// books.js — everything about a book that needs no browser.
//
// A book is not a song: it never enters S.songs, never answers to the T1/T2/T3
// lens, and its fields are not in CAMPOS. What lives here is the part of it that
// is pure — naming, blob collection, merge — so it can be tested without a DOM,
// a database or a PDF.
// Design: docs/superpowers/specs/2026-08-22-livros-pdf-design.md

// The id Scribd glues to the front of every download. Six digits or more
// followed by a dash: "101-Musicas" keeps its 101, because a songbook really is
// called that, and losing the title is worse than keeping a stray number.
const ID_DE_DOWNLOAD = /^\d{6,}[-_]/;

export function tituloDeArquivo(nome) {
  return String(nome || '')
    .replace(/\.pdf$/i, '')
    .replace(ID_DE_DOWNLOAD, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// A book owns two blobs: the PDF and the cover. This is the single definition of
// "which bytes belong to a book" — the twin of blobIdsDasMusicas, deliberately
// separate from it. A second axis of truth inside that function is exactly how
// deleting and exporting start disagreeing.
export function blobIdsDosLivros(books) {
  const out = [];
  for (const b of (books || [])) {
    if (b.blobId) out.push(b.blobId);
    if (b.capaBlobId) out.push(b.capaBlobId);
  }
  return out;
}

// Merge on import. The rule is one line: a book the device already has is kept
// as it is. Rewriting it would cost 300 MB of copy and would overwrite a title
// the owner fixed by hand and the page they stopped on. Absence never deletes.
export function fundeLivros(atuais, doArquivo) {
  const books = (atuais || []).slice();
  const conhecidos = new Set(books.map((b) => b.id));
  let added = 0;
  for (const b of (doArquivo || [])) {
    if (!b || !b.id || conhecidos.has(b.id)) continue;
    books.push(b);
    conhecidos.add(b.id);
    added++;
  }
  return { books, added, updated: 0 };
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
cd app && node --test test/books.test.js
```

Esperado: PASS nos 7 testes.

- [ ] **Step 5: Abrir o store `books` no IndexedDB**

Em `app/js/db.js`, linha 9: `const DB_VERSION = 3;` (o `DB_NAME` **não** muda).

No `onupgradeneeded`, junto dos outros stores:

```js
      if (!d.objectStoreNames.contains('books')) d.createObjectStore('books', { keyPath: 'id' });
```

No `loadAll`:

```js
  loadAll() {
    return Promise.all([reqAll('artists'), reqAll('songs'), reqAll('lists'), reqAll('books')])
      .then(([artists, songs, lists, books]) => ({ artists, songs: songs.map(normalizaCifra), lists, books }));
  },
```

Junto de `putList`/`deleteList`:

```js
  putBook(b) { return tx('books', 'readwrite', (s) => s.put(b)); },
  deleteBook(id) { return tx('books', 'readwrite', (s) => s.delete(id)); },
```

E no `wipe` — **este é o ponto que morde**: ele já apaga todo blob do OPFS, então
um `books` não limpo deixaria registro apontando para PDF que não existe mais:

```js
    for (const store of ['artists', 'songs', 'lists', 'books']) {
      await tx(store, 'readwrite', (s) => s.clear());
    }
```

Atualize também o comentário do modelo no topo do arquivo (linhas 2-4), acrescentando:
`books { id, titulo, autor, fileName, blobId, capaBlobId, paginas, bytes, ultimaPagina, createdAt }`.

- [ ] **Step 6: Estado em memória**

Em `app/js/state.js`, junto de `artists/songs/lists`:

```js
  books: [],
```

E na navegação, o comentário da linha 12 passa a listar a tela nova:
`screen: 'home',          // home | artist | list | play | addedit | settings | chordbook | book`
mais `livroId: null,          // livro aberto (tela book)` junto de `openListId`.

Em `initState`, depois de `S.lists = lib.lists;`:

```js
  S.books = (lib.books || []).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
```

E as operações, ao lado das de lista (importando `uid` e `DB`, que o arquivo já importa,
mais `tituloDeArquivo` de `./books.js`):

```js
// ---------- livros ----------
export function livroById(id) { return S.books.find((b) => b.id === id) || null; }

// `capaBlob` e `paginas` chegam prontos de quem já abriu o PDF: state.js não
// conhece pdf.js, e não é aqui que essa dependência entra.
export async function criarLivro(file, { titulo, autor, paginas, capaBlob }) {
  const id = uid();
  const blobId = uid();
  await DB.saveBlob(blobId, file);
  let capaBlobId = null;
  if (capaBlob) { capaBlobId = uid(); await DB.saveBlob(capaBlobId, capaBlob); }
  const livro = {
    id, blobId, capaBlobId,
    titulo: (titulo || tituloDeArquivo(file.name) || file.name),
    autor: autor || '',
    fileName: file.name || '',
    paginas: paginas || 0,
    bytes: file.size || 0,
    ultimaPagina: 1,
    createdAt: Date.now(),
  };
  await DB.putBook(livro);
  S.books.unshift(livro);
  return livro;
}

export async function salvaLivro(livro) {
  await DB.putBook(livro);
  const i = S.books.findIndex((b) => b.id === livro.id);
  if (i >= 0) S.books[i] = livro; else S.books.unshift(livro);
  return livro;
}

export async function renomearLivro(id, { titulo, autor }) {
  const b = livroById(id);
  if (!b) return null;
  return salvaLivro({ ...b, titulo: titulo ?? b.titulo, autor: autor ?? b.autor });
}

// Apaga o registro E os dois blobs. Não existe varredura de órfão no app: o que
// não for apagado aqui fica ocupando disco para sempre.
export async function apagarLivro(id) {
  const b = livroById(id);
  if (!b) return;
  for (const bid of blobIdsDosLivros([b])) await DB.deleteBlob(bid);
  await DB.deleteBook(id);
  S.books = S.books.filter((x) => x.id !== id);
}
```

O import no topo de `state.js`: `import { tituloDeArquivo, blobIdsDosLivros } from './books.js';`

- [ ] **Step 7: Registrar o módulo novo no SHELL e checar sintaxe**

Em `app/sw.js`, no array `SHELL`, junto dos outros módulos: `'./js/books.js',`

```bash
cd app && node --check js/books.js && node --check js/state.js && node --check js/db.js && node --test
```

Esperado: PASS na suíte inteira, incluindo o `shell.test.js` (que agora exige `books.js` no SHELL).

- [ ] **Step 8: Verificar no navegador que o banco sobe para v3**

```bash
cd app && python3 -m http.server 8137
```

Abra `http://localhost:8137/`, e no DevTools → Application → IndexedDB → `somaplay`:
confirme versão 3 e o store `books` vazio. A biblioteca existente (artistas,
músicas, listas) **continua lá** — se sumiu, pare: é sinal de `DB_NAME` alterado.

- [ ] **Step 9: Commit**

```bash
git add app/js/books.js app/test/books.test.js app/js/db.js app/js/state.js app/sw.js
git commit -m "feat(books): book record, books store and pure book helpers"
```

---

### Task 3: A aba Livros e o import

**Files:**
- Create: `app/js/render/books.js`
- Modify: `app/js/render/home.js:191-196` (`homeResults`), `app/js/render/home.js:219-225` (a `segtab`), `app/js/render/home.js:198-204` (`tabsub`), `app/js/main.js:40-60` (imports), `app/js/main.js` (ações e `afterRender`), `app/js/icons.js`, `app/css/app.css`, `app/js/i18n/pt.js`, `app/js/i18n/en.js`, `app/sw.js`
- Test: `app/test/i18n.test.js` (já existe; a paridade das chaves novas é verificada por ele)

**Interfaces:**
- Consumes: `abrirLivro`, `paginasDe`, `renderPagina`, `fecharLivro` (Tarefa 1); `criarLivro`, `S.books`, `tituloDeArquivo` (Tarefa 2).
- Produces: `renderBooksTab() → string` (o HTML da estante, chamado por `homeResults`), `wireBookFileInput()` (chamado no `afterRender`), `capaDoArquivo(file) → Promise<{ paginas, capaBlob }>`.

- [ ] **Step 1: Chaves de i18n nas duas tabelas**

Em `app/js/i18n/pt.js`:

```js
  'home.tabs.books': 'Livros',
  'home.tabsub.books': '{count} livros',
  'books.empty.title': 'Nenhum livro ainda',
  'books.empty.hint': 'Um songbook em PDF entra inteiro e fica legível na estante, sem precisar recortar música nenhuma.',
  'books.add': 'Adicionar livro',
  'books.card.pages': '{count} páginas',
  'books.draft.title': 'Novo livro',
  'books.draft.name': 'Título',
  'books.draft.author': 'Autor',
  'books.draft.authorPlaceholder': 'opcional',
  'books.draft.save': 'Salvar livro',
  'books.draft.remaining': 'mais {count} na fila',
  'books.reading': 'Lendo o PDF…',
  'books.error.open': 'Não deu para abrir este PDF: {msg}',
  'books.error.notPdf': '{name} não é um PDF.',
  'books.saved': '{title} entrou na estante.',
```

E exatamente as mesmas chaves em `app/js/i18n/en.js`:

```js
  'home.tabs.books': 'Books',
  'home.tabsub.books': '{count} books',
  'books.empty.title': 'No books yet',
  'books.empty.hint': 'A songbook PDF goes in whole and stays readable on the shelf — no need to cut songs out of it.',
  'books.add': 'Add book',
  'books.card.pages': '{count} pages',
  'books.draft.title': 'New book',
  'books.draft.name': 'Title',
  'books.draft.author': 'Author',
  'books.draft.authorPlaceholder': 'optional',
  'books.draft.save': 'Save book',
  'books.draft.remaining': '{count} more queued',
  'books.reading': 'Reading the PDF…',
  'books.error.open': "Couldn't open this PDF: {msg}",
  'books.error.notPdf': '{name} is not a PDF.',
  'books.saved': '{title} is on the shelf.',
```

- [ ] **Step 2: Rodar o teste de paridade**

```bash
cd app && node --test test/i18n.test.js
```

Esperado: PASS. Se falhar, uma chave está em só uma das tabelas — é exatamente o que ele existe para pegar.

- [ ] **Step 3: Ícone de livro**

Em `app/js/icons.js`, junto dos outros (siga a assinatura dos vizinhos, que recebem `s` de tamanho):

```js
  chevL: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>`,
  book: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
```

- [ ] **Step 4: Escrever `app/js/render/books.js`**

```js
// render/books.js — the Books tab: the shelf, and the import form.
//
// A book never answers to the T1/T2/T3 lens, the same way lists do not: it is
// not "chart, backing track or karaoke", it is the material a chart may one day
// come out of.
import { S } from '../state.js';
import { I, esc } from '../icons.js';
import { t } from '../i18n.js';
import { abrirLivro, paginasDe, renderPagina, fecharLivro } from '../pdf.js';

// Cover width in CSS pixels. Rendered once, at import: opening every PDF just to
// paint the shelf is what this blob avoids.
const CAPA_PX = 320;

// Opens the PDF far enough to learn its page count and paint page 1. Throws if
// pdf.js cannot read it — the caller shows the message and saves nothing, so a
// failed import leaves neither record nor blob behind.
export async function capaDoArquivo(file) {
  const doc = await abrirLivro(file);
  try {
    const paginas = paginasDe(doc);
    const canvas = document.createElement('canvas');
    await renderPagina(doc, 1, CAPA_PX, 2, canvas);
    const capaBlob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.82));
    return { paginas, capaBlob };
  } finally {
    await fecharLivro(doc);
  }
}

function draftCard() {
  const d = S.livroDraft;
  if (!d) return '';
  const fila = S.livroFila && S.livroFila.length
    ? `<div class="s">${t('books.draft.remaining', { count: S.livroFila.length })}</div>` : '';
  return `<div class="card-section" style="margin-bottom:18px">
    <div class="hd"><span style="color:var(--accent);display:flex">${I.book(19)}</span>
      <div class="t">${t('books.draft.title')}</div>${fila}</div>
    <div class="book-draft">
      ${d.capaURL ? `<img class="book-cover" src="${d.capaURL}" alt="">` : ''}
      <div class="book-draft-fields">
        <div class="field"><label>${t('books.draft.name')}</label>
          <input type="text" class="input lg" id="f-livro-titulo" value="${esc(d.titulo)}"></div>
        <div class="field"><label>${t('books.draft.author')}</label>
          <input type="text" class="input lg" id="f-livro-autor" placeholder="${t('books.draft.authorPlaceholder')}" value="${esc(d.autor)}"></div>
        <div class="s">${t('books.card.pages', { count: d.paginas })} · ${(d.file.size / 1e6).toFixed(1)} MB</div>
        <div class="foot-inline">
          <button class="btn-ghost" data-a="cancelLivroDraft">${t('common.cancel')}</button>
          <button class="btn-save" data-a="saveLivroDraft">${I.save()}${t('books.draft.save')}</button>
        </div>
      </div>
    </div>
  </div>`;
}

function bookCard(b) {
  const capa = S.capaURLs && S.capaURLs[b.id];
  return `<div class="book-card" data-a="openBook" data-id="${esc(b.id)}">
    <div class="book-cover-wrap">${capa
      ? `<img class="book-cover" src="${capa}" alt="">`
      : `<span class="book-cover ph">${I.book(28)}</span>`}</div>
    <div class="nm">${esc(b.titulo)}</div>
    <div class="ct">${b.autor ? esc(b.autor) + ' · ' : ''}${t('books.card.pages', { count: b.paginas })}</div>
  </div>`;
}

export function renderBooksTab() {
  const q = S.query.trim().toLowerCase();
  const lista = S.books.filter((b) => !q
    || b.titulo.toLowerCase().includes(q) || (b.autor || '').toLowerCase().includes(q));
  const vazio = `<div class="empty">
      <span style="color:var(--muted)">${I.book(34)}</span>
      <div class="t">${t('books.empty.title')}</div>
      <div class="s">${t('books.empty.hint')}</div>
    </div>`;
  return `<div class="books-head">
      <div><div class="t">${t('home.tabs.books')}</div>
        <div class="s">${t('home.tabsub.books', { count: S.books.length })}</div></div>
      <button class="btn-primary" data-a="pickLivro">${I.plus(20, 2.4)}${t('books.add')}</button>
    </div>
    ${draftCard()}
    ${lista.length ? `<div class="book-grid">${lista.map(bookCard).join('')}</div>` : vazio}
    <input type="file" id="file-livro" accept="application/pdf" multiple hidden>`;
}
```

- [ ] **Step 5: Ligar a aba na home**

Em `app/js/render/home.js`, importe `renderBooksTab` e acrescente a aba:

```js
  if (S.tab === 'books') return renderBooksTab();
```

em `homeResults()` (antes do `return listsTab()`), o botão na `segtab`:

```js
        <button class="${S.tab === 'books' ? 'on' : ''}" data-a="setTab" data-id="books">${I.book(18)}${t('home.tabs.books')}</button>
```

e o `tabsub`, que passa a ter mais um ramo:

```js
  const tabsub = isL
    ? t('home.tabsub.lists', { count: S.lists.length })
    : S.tab === 'books' ? t('home.tabsub.books', { count: S.books.length })
      : (S.tab === 'artists' ? t('home.tabsub.artists', { count: S.artists.length })
        : S.tab === 'estilos' ? t('home.tabsub.estilos')
          : t('home.tabsub.songs', { count: S.songs.length }));
```

A lente de modo fica desligada em Livros como já fica em Listas — troque `isL` por
`const semLente = S.tab === 'lists' || S.tab === 'books';` e use `semLente` nas
duas ocorrências da `<div class="lens">` e em `fonteStripHTML(...)`.

- [ ] **Step 6: As ações no `main.js`**

Nos imports: `import { renderBooksTab, capaDoArquivo } from './render/books.js';` e
`import { criarLivro, apagarLivro, renomearLivro, livroById } from './state.js';`

No objeto de ações (junto de `startCreateList` e vizinhas):

```js
  pickLivro() { document.getElementById('file-livro')?.click(); },

  cancelLivroDraft() {
    if (S.livroDraft?.capaURL) URL.revokeObjectURL(S.livroDraft.capaURL);
    S.livroDraft = null;
    proximoLivroDaFila();
  },

  async saveLivroDraft() {
    const d = S.livroDraft;
    if (!d) return;
    d.titulo = document.getElementById('f-livro-titulo')?.value.trim() || d.titulo;
    d.autor = document.getElementById('f-livro-autor')?.value.trim() || '';
    try {
      const livro = await criarLivro(d.file, {
        titulo: d.titulo, autor: d.autor, paginas: d.paginas, capaBlob: d.capaBlob,
      });
      toast(t('books.saved', { title: livro.titulo }));
    } catch (e) {
      toast(t('books.error.open', { msg: e.message }));
    }
    if (d.capaURL) URL.revokeObjectURL(d.capaURL);
    S.livroDraft = null;
    await proximoLivroDaFila();
    update();
  },
```

E as duas funções de apoio, no mesmo arquivo (fora do objeto de ações):

```js
// Um livro por vez: o rascunho aberto é o da frente da fila, e salvar (ou
// cancelar) puxa o próximo. Importar 5 PDFs de uma vez sem passar por aqui
// significaria 5 livros com título de arquivo cru e nenhum autor.
async function proximoLivroDaFila() {
  const file = (S.livroFila || []).shift();
  if (!file) return;
  toast(t('books.reading'));
  try {
    const { paginas, capaBlob } = await capaDoArquivo(file);
    S.livroDraft = {
      file, paginas, capaBlob,
      capaURL: capaBlob ? URL.createObjectURL(capaBlob) : null,
      titulo: tituloDeArquivo(file.name) || file.name,
      autor: '',
    };
  } catch (e) {
    toast(t('books.error.open', { msg: e.message }));
    await proximoLivroDaFila();
  }
}

export function wireBookFileInput() {
  const inp = document.getElementById('file-livro');
  if (!inp || inp._wired) return;
  inp._wired = true;
  inp.addEventListener('change', async () => {
    const files = [...inp.files].filter((f) => /\.pdf$/i.test(f.name) || f.type === 'application/pdf');
    const recusados = [...inp.files].filter((f) => !files.includes(f));
    for (const f of recusados) toast(t('books.error.notPdf', { name: f.name }));
    inp.value = '';
    S.livroFila = (S.livroFila || []).concat(files);
    if (!S.livroDraft) await proximoLivroDaFila();
    update();
  });
}
```

`tituloDeArquivo` vem de `./books.js`; acrescente ao import. No `afterRender()`, junto
das outras ligações de input:

```js
  if (S.screen === 'home' && S.tab === 'books') wireBookFileInput();
```

Em `state.js`, os campos de sessão do rascunho (junto de `shareSheet`, com o mesmo
argumento: seleção que sobrevive ao fechar o app vira mistério no próximo ensaio):

```js
  livroDraft: null,        // { file, titulo, autor, paginas, capaBlob, capaURL } | null
  livroFila: [],           // PDFs escolhidos aguardando virar rascunho
  capaURLs: {},            // id do livro → object URL da capa (revogado ao sair da aba)
```

- [ ] **Step 7: As capas na estante**

As capas são blobs; a estante precisa de object URLs. No `afterRender()` do `main.js`,
depois do `wireBookFileInput()`:

```js
  if (S.screen === 'home' && S.tab === 'books') carregarCapas();
```

E a função (que só busca o que ainda não tem URL, e por isso pode ser chamada a cada render):

```js
// As capas entram depois do render, uma vez cada. Sem a guarda do `capaURLs`,
// cada re-render (digitar na busca, trocar de aba) criaria object URL novo para
// as mesmas capas e vazaria memória até o app engasgar.
async function carregarCapas() {
  let mudou = false;
  for (const b of S.books) {
    if (!b.capaBlobId || S.capaURLs[b.id]) continue;
    const url = await DB.blobURL(b.capaBlobId);
    if (url) { S.capaURLs[b.id] = url; mudou = true; }
  }
  if (mudou) updateHomeResults();
}
```

- [ ] **Step 8: CSS**

Em `app/css/app.css`, no fim, seguindo os nomes de variável que o arquivo já usa
(`--muted`, `--accent`, `--card`, `--line`):

```css
/* ---------- Livros ---------- */
.books-head{display:flex;align-items:center;gap:14px;padding:8px 4px 18px}
.books-head .t{font-size:19px;font-weight:700}
.books-head .s{color:var(--muted);font-size:13px}
.books-head .btn-primary{margin-left:auto}
.book-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:18px}
.book-card{cursor:pointer;display:flex;flex-direction:column;gap:8px}
.book-cover-wrap{aspect-ratio:1/1.414;background:var(--card);border:1px solid var(--line);
  border-radius:10px;overflow:hidden;display:flex;align-items:center;justify-content:center}
.book-cover{width:100%;height:100%;object-fit:cover;display:block}
.book-cover.ph{color:var(--muted);width:auto;height:auto}
.book-card .nm{font-weight:600;font-size:14px;line-height:1.3}
.book-card .ct{color:var(--muted);font-size:12px}
.book-draft{display:flex;gap:18px;align-items:flex-start}
.book-draft .book-cover{width:130px;height:auto;border-radius:8px;border:1px solid var(--line)}
.book-draft-fields{flex:1;min-width:0;display:flex;flex-direction:column;gap:12px}
.foot-inline{display:flex;gap:10px;justify-content:flex-end}
```

- [ ] **Step 9: SHELL, sintaxe e testes**

Acrescente `'./js/render/books.js',` ao `SHELL` em `app/sw.js`.

```bash
cd app && node --check js/render/books.js && node --check js/main.js && node --test
```

Esperado: PASS na suíte inteira.

- [ ] **Step 10: Verificação manual — é aqui que a tarefa se prova**

```bash
cd app && python3 -m http.server 8137
```

1. Abra a aba **Livros**: estado vazio com o botão.
2. Importe `chords/_a-identificar/889817455-Michael-Jackson-Complete-Songbook.pdf`.
   O rascunho aparece com a capa desenhada, título já limpo
   (`Michael Jackson Complete Songbook`, sem o `889817455-`) e 61 páginas.
3. Salve. O livro entra na estante com a capa.
4. Importe **dois** PDFs de uma vez: o segundo vira rascunho depois de salvar o primeiro,
   e o contador "mais 1 na fila" aparece.
5. Escolha um arquivo que não é PDF: recusa com mensagem, e nada entra na estante.
6. Recarregue a página: o livro continua lá (veio do IndexedDB, e a capa do OPFS).

- [ ] **Step 11: Commit**

```bash
git add app/js/render/books.js app/js/render/home.js app/js/main.js app/js/state.js \
        app/js/icons.js app/css/app.css app/js/i18n app/sw.js
git commit -m "feat(books): Books tab with PDF import and rendered cover"
```

---

### Task 4: A tela do livro — leitura, zoom e gestos

**Files:**
- Create: `app/js/panzoom.js`, `app/test/panzoom.test.js`, `app/js/render/book.js`
- Modify: `app/js/render/play.js:755-793` (passa a usar `panzoom.js`), `app/js/main.js` (rota `book`, ações), `app/css/app.css`, `app/js/i18n/pt.js`, `app/js/i18n/en.js`, `app/sw.js`

**Interfaces:**
- Consumes: `abrirLivro`, `paginasDe`, `renderPagina`, `fecharLivro` (Tarefa 1); `livroById`, `salvaLivro`, `S.books` (Tarefa 2).
- Produces: `clampZoom(z) → number`, `escalaDaPinca(zoomInicial, distAtual, distInicial) → number`, `distanciaEntre(touches) → number`, `wireGestos(el, opts)` (de `panzoom.js`); `renderBook() → string`, `afterRenderBook()`, `sairDoLivro()` (de `render/book.js`).

- [ ] **Step 1: Escrever os testes que falham**

`app/test/panzoom.test.js`:

```js
// panzoom.test.js — a matemática do gesto, que é a parte testável sem tela.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampZoom, escalaDaPinca, distanciaEntre, ZOOM_MIN, ZOOM_MAX } from '../js/panzoom.js';

test('o zoom não sai da faixa', () => {
  assert.equal(clampZoom(0.1), ZOOM_MIN);
  assert.equal(clampZoom(99), ZOOM_MAX);
  assert.equal(clampZoom(1.5), 1.5);
});

test('a pinça multiplica o zoom inicial pela razão das distâncias', () => {
  assert.equal(escalaDaPinca(1, 200, 100), 2);
  assert.equal(escalaDaPinca(2, 50, 100), 1);
});

test('a pinça também respeita a faixa', () => {
  assert.equal(escalaDaPinca(3, 400, 100), ZOOM_MAX);
  assert.equal(escalaDaPinca(1, 1, 100), ZOOM_MIN);
});

test('distância inicial zero não vira divisão por zero', () => {
  // Dois toques exatamente no mesmo pixel acontecem, e um NaN aqui congelaria
  // o zoom até recarregar o app.
  assert.equal(Number.isFinite(escalaDaPinca(1, 100, 0)), true);
});

test('distância entre dois toques é a hipotenusa', () => {
  assert.equal(distanciaEntre([{ clientX: 0, clientY: 0 }, { clientX: 3, clientY: 4 }]), 5);
});

test('a faixa de zoom é a mesma que a tela de tocar já usava', () => {
  // play.js clampava em 0.4 e 4 na mão; extrair o gesto não pode mudar a faixa
  // debaixo de quem já usa o app no palco.
  assert.equal(ZOOM_MIN, 0.4);
  assert.equal(ZOOM_MAX, 4);
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd app && node --test test/panzoom.test.js
```

Esperado: FAIL — `Cannot find module '../js/panzoom.js'`.

- [ ] **Step 3: Escrever `app/js/panzoom.js`**

```js
// panzoom.js — pinch, drag and wheel, detected in one place.
//
// The chart screen and the book reader both need the same gesture and do
// different things with the number: one resizes an <img>, the other redraws a
// canvas. So this module detects; the caller decides. Copying the block instead
// would mean the next pinch fix lands in only one of the two screens.
export const ZOOM_MIN = 0.4;
export const ZOOM_MAX = 4;

export function clampZoom(z) {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, +(z).toFixed(3)));
}

export function distanciaEntre(touches) {
  return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
}

// Two fingers landing on the same pixel gives distInicial 0; without the guard
// the ratio is Infinity and the zoom freezes until the app is reloaded.
export function escalaDaPinca(zoomInicial, distAtual, distInicial) {
  return clampZoom(zoomInicial * (distAtual / (distInicial || 1)));
}

// Wires an element that SCROLLS (the pan is its scrollLeft/scrollTop).
//
//   getZoom()        → current zoom
//   setZoom(z)       → apply it; the caller redraws or resizes
//   onSwipe(dir)     → optional: -1 previous, +1 next. Only fires at zoom 1,
//                      which is the whole disambiguation: zoomed in, a drag is a
//                      pan and never a page turn.
//   ignorar(target)  → optional: true for controls that must not start a drag
// Wires an element that SCROLLS (the pan is its scrollLeft/scrollTop).
//
//   getZoom()        → current zoom
//   setZoom(z)       → apply it; the caller redraws or resizes
//   onSwipe(dir)     → optional: -1 previous, +1 next. Only fires at zoom 1,
//                      which is the whole disambiguation: zoomed in, a drag is a
//                      pan and never a page turn.
//   ignorar(target)  → optional: true for controls that must not start a drag
//
// The wheel zooms only with Ctrl held, and plain wheel is left alone: the chart
// screen has always behaved that way, and swallowing plain wheel would take
// scrolling away from every desktop reader.
export function wireGestos(el, { getZoom, setZoom, onSwipe = null, ignorar = () => false }) {
  if (el._gesturesWired) return;
  el._gesturesWired = true;
  let arrastando = false, sx = 0, sy = 0, sl = 0, stp = 0, pincando = false;
  let distInicial = 0, zoomInicial = 1, movimento = 0;

  el.addEventListener('pointerdown', (e) => {
    if (pincando || ignorar(e.target)) return;
    arrastando = true; movimento = 0;
    sx = e.clientX; sy = e.clientY; sl = el.scrollLeft; stp = el.scrollTop;
    el.classList.add('grabbing');
    // Without the capture a drag that leaves the element dies mid-gesture.
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
  });
  el.addEventListener('pointermove', (e) => {
    if (!arrastando || pincando) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    movimento = Math.max(movimento, Math.hypot(dx, dy));
    el.scrollLeft = sl - dx;
    el.scrollTop = stp - dy;
  });
  const solta = (e) => {
    if (!arrastando) return;
    arrastando = false;
    el.classList.remove('grabbing');
    if (!onSwipe || getZoom() > 1.001 || movimento < 60) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > Math.abs(dy) * 1.5) onSwipe(dx < 0 ? 1 : -1);
  };
  el.addEventListener('pointerup', solta);
  el.addEventListener('pointercancel', () => { arrastando = false; el.classList.remove('grabbing'); });

  el.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    setZoom(clampZoom(getZoom() + (e.deltaY < 0 ? 0.15 : -0.15)));
  }, { passive: false });

  el.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      pincando = true; arrastando = false; el.classList.remove('grabbing');
      distInicial = distanciaEntre(e.touches);
      zoomInicial = getZoom();
    }
  }, { passive: false });
  el.addEventListener('touchmove', (e) => {
    if (!pincando || e.touches.length !== 2) return;
    e.preventDefault();
    setZoom(escalaDaPinca(zoomInicial, distanciaEntre(e.touches), distInicial));
  }, { passive: false });
  el.addEventListener('touchend', (e) => { if (e.touches.length < 2) pincando = false; });
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
cd app && node --test test/panzoom.test.js
```

Esperado: PASS nos 5 testes.

- [ ] **Step 5: A tela de tocar passa a usar o módulo**

Em `app/js/render/play.js`. Os nomes reais no arquivo são **`setupImgGestures()`** (linha 757) e
**`applyImgZoom()`** (linha 739) — confira antes de editar. O corpo inteiro de
`setupImgGestures` (linhas 757-794, do `let dragging` até o último `addEventListener`)
sai e vira uma chamada:

```js
import { wireGestos, clampZoom } from '../panzoom.js';

// …

function setupImgGestures() {
  const el = document.querySelector('[data-imgscroll]');
  if (!el) return;
  wireGestos(el, {
    getZoom: () => S.imgZoom,
    setZoom: (z) => { S.imgZoom = z; applyImgZoom(); },
    ignorar: (alvo) => !!(alvo.closest && alvo.closest('[data-nopan]')),
  });
}
```

A guarda de "já ligado" (`el._gesturesWired`) mudou de lugar: agora mora dentro de
`wireGestos`, com o mesmo nome de propriedade, então o comportamento é o de antes.
A função local `imgDist` sai junto — quem calcula distância agora é
`distanciaEntre`, no módulo.

E `zoomBy` passa a usar o clamp compartilhado:

```js
export function zoomBy(d) {
  S.imgZoom = clampZoom(S.imgZoom + d);
  applyImgZoom();
}
```

**Três comportamentos que NÃO podem mudar nessa troca** — são o que a tela de tocar
já faz hoje, e o `panzoom.js` acima os preserva de propósito: a roda do mouse só dá
zoom **com Ctrl** (sem Ctrl, a página rola); o ponteiro é capturado, para o arrasto
sobreviver a sair do elemento; e a classe `grabbing` entra e sai com o arrasto.

**Verificação obrigatória antes de seguir:** a tela de tocar é a que está no palco.
Sirva o app, abra uma música com cifra em imagem e confirme que pinça, arrasto,
roda do mouse e os botões `+`/`−` continuam funcionando, e que arrastar em cima
da grade de acordes (`[data-nopan]`) ainda não move a imagem.

- [ ] **Step 6: Chaves de i18n da tela do livro (nas duas tabelas)**

`pt.js`:

```js
  'book.pageOf': '{n} de {total}',
  'book.prev': 'Página anterior',
  'book.next': 'Próxima página',
  'book.grid': 'Páginas',
  'book.goTo': 'Ir para a página',
  'book.rendering': 'Desenhando…',
  'book.error.page': 'Não deu para desenhar esta página.',
```

`en.js`:

```js
  'book.pageOf': '{n} of {total}',
  'book.prev': 'Previous page',
  'book.next': 'Next page',
  'book.grid': 'Pages',
  'book.goTo': 'Go to page',
  'book.rendering': 'Rendering…',
  'book.error.page': "Couldn't render this page.",
```

- [ ] **Step 7: Escrever `app/js/render/book.js`**

```js
// render/book.js — reading a book: one page at a time, redrawn at zoom.
//
// The page is REDRAWN at the zoom level, never stretched — that is what makes a
// 300 dpi scan actually readable when you lean in, and the reason the app keeps
// the PDF instead of a pile of images.
import { S, livroById, salvaLivro } from '../state.js';
import { DB } from '../db.js';
import { I, esc } from '../icons.js';
import { t } from '../i18n.js';
import { abrirLivro, paginasDe, renderPagina, fecharLivro } from '../pdf.js';
import { wireGestos, clampZoom } from '../panzoom.js';

// The open document lives here, not in S: it is a handle, not state, and putting
// it in S would tempt someone to serialise it.
let doc = null;
let docId = null;
let desenhando = null;   // page currently being drawn, to drop a superseded call

export function renderBook() {
  const b = livroById(S.livroId);
  if (!b) return '<div class="screen"></div>';
  const n = S.livroPagina;
  return `<div class="screen book-screen">
    <div class="topbar">
      <button class="btn-icon" data-a="sairDoLivro" title="${t('common.back')}">${I.back()}</button>
      <div class="page-title">${esc(b.titulo)}</div>
      <span style="margin-left:auto"></span>
      <button class="btn-icon" data-a="toggleBookGrid" title="${t('book.grid')}">${I.grid(20)}</button>
    </div>
    <div class="book-page" data-bookscroll="1">
      <div class="inner"><canvas id="book-canvas"></canvas></div>
    </div>
    <div class="book-hud">
      <button data-a="paginaAnterior" title="${t('book.prev')}" ${n <= 1 ? 'disabled' : ''}>${I.chevL(20)}</button>
      <div class="pg">${t('book.pageOf', { n, total: b.paginas })}</div>
      <button data-a="proximaPagina" title="${t('book.next')}" ${n >= b.paginas ? 'disabled' : ''}>${I.chevR(20)}</button>
      <div class="zoom-ctl">
        <button data-a="bookZoomOut" title="−">−</button>
        <div class="pct" id="book-zoom-pct">${Math.round(S.livroZoom * 100)}%</div>
        <button data-a="bookZoomIn" title="+">+</button>
      </div>
    </div>
  </div>`;
}

// Draws the current page. Every call carries a token: a fast reader can turn
// three pages while the first is still rasterising, and without the token the
// slow one would land on top of the fast one — the same guard loadSongMedia has.
export async function desenhaPagina() {
  const b = livroById(S.livroId);
  const canvas = document.getElementById('book-canvas');
  if (!b || !canvas) return;
  const alvo = { n: S.livroPagina, z: S.livroZoom };
  desenhando = alvo;
  try {
    if (!doc || docId !== b.id) {
      await fecharLivro(doc);
      doc = null;
      const file = await DB.getBlob(b.blobId);
      if (!file) return;
      doc = await abrirLivro(file);
      docId = b.id;
      if (paginasDe(doc) !== b.paginas) await salvaLivro({ ...b, paginas: paginasDe(doc) });
    }
    if (desenhando !== alvo) return;
    const el = document.querySelector('[data-bookscroll]');
    const largura = Math.max(320, el.clientWidth * S.livroZoom);
    const { w, h } = await renderPagina(doc, alvo.n, largura, window.devicePixelRatio || 1, canvas);
    if (desenhando !== alvo) return;
    canvas.style.width = w + 'px';
    canvas.style.height = Math.round(h) + 'px';
    el.querySelector('.inner').style.alignItems = S.livroZoom > 1.001 ? 'flex-start' : 'center';
  } catch (e) {
    if (desenhando === alvo) console.warn('book render', e);
  }
}

// `onUpdate` é o update() do main.js, injetado como afterRenderPlay(update) já
// faz (main.js:107): o render não importa o main, ou o ciclo fecha.
export function afterRenderBook(onUpdate) {
  const el = document.querySelector('[data-bookscroll]');
  if (el && !el._panWired) {
    el._panWired = true;
    wireGestos(el, {
      getZoom: () => S.livroZoom,
      setZoom: (z) => { S.livroZoom = z; atualizaPct(); desenhaPagina(); },
      onSwipe: (dir) => { viraPagina(dir).then((n) => { if (n) onUpdate(); }); },
      ignorar: (alvo) => !!(alvo.closest && alvo.closest('.book-hud')),
    });
  }
  desenhaPagina();
}

function atualizaPct() {
  const pct = document.getElementById('book-zoom-pct');
  if (pct) pct.textContent = Math.round(S.livroZoom * 100) + '%';
}

export function bookZoomBy(d) {
  S.livroZoom = clampZoom(S.livroZoom + d);
  atualizaPct();
  desenhaPagina();
}

// Page turns are persisted, but lazily: writing to IndexedDB on every turn of a
// 401-page book is a write per flick of the finger.
export async function viraPagina(dir) {
  const b = livroById(S.livroId);
  if (!b) return;
  const n = Math.max(1, Math.min(b.paginas, S.livroPagina + dir));
  if (n === S.livroPagina) return;
  S.livroPagina = n;
  return n;
}

export async function sairDoLivro() {
  const b = livroById(S.livroId);
  if (b && b.ultimaPagina !== S.livroPagina) await salvaLivro({ ...b, ultimaPagina: S.livroPagina });
  await fecharLivro(doc);
  doc = null; docId = null; desenhando = null;
}
```

- [ ] **Step 7b: Desenhar a próxima página antes de ela ser pedida**

A spec pede que a virada seja instantânea, e ela só é se a página seguinte já estiver
pronta quando o dedo chegar. Em `render/book.js`:

```js
// One page ahead, kept off-screen. A 300 dpi page takes a few hundred ms to
// rasterise, and that is exactly the pause you feel when turning. Only ever one:
// prefetching a whole book would be a background job competing with the page the
// eyes are actually on.
let adiantada = null;   // { id, n, bitmap }

async function adiantaProxima() {
  const b = livroById(S.livroId);
  const n = S.livroPagina + 1;
  if (!b || !doc || n > b.paginas) return;
  if (adiantada && adiantada.id === b.id && adiantada.n === n) return;
  const el = document.querySelector('[data-bookscroll]');
  if (!el) return;
  const canvas = document.createElement('canvas');
  try {
    await renderPagina(doc, n, Math.max(320, el.clientWidth * S.livroZoom), window.devicePixelRatio || 1, canvas);
    adiantada = { id: b.id, n, bitmap: await createImageBitmap(canvas) };
  } catch (e) { adiantada = null; }
}
```

No `desenhaPagina()`, antes de rasterizar, use o que já está pronto — e só então
adiante a seguinte:

```js
    if (adiantada && adiantada.id === b.id && adiantada.n === alvo.n
        && Math.abs(alvo.z - S.livroZoom) < 0.001) {
      canvas.width = adiantada.bitmap.width;
      canvas.height = adiantada.bitmap.height;
      canvas.getContext('2d', { alpha: false }).drawImage(adiantada.bitmap, 0, 0);
      adiantada = null;
    } else {
      const { w, h } = await renderPagina(doc, alvo.n, largura, window.devicePixelRatio || 1, canvas);
      if (desenhando !== alvo) return;
      canvas.style.width = w + 'px';
      canvas.style.height = Math.round(h) + 'px';
    }
    el.querySelector('.inner').style.alignItems = S.livroZoom > 1.001 ? 'flex-start' : 'center';
    setTimeout(() => adiantaProxima(), 120);
```

O bitmap adiantado é descartado quando o zoom muda (a resolução deixa de servir) e em
`sairDoLivro()`: `adiantada = null;`.

**Verifique com o cronômetro na mão, e não no olho:** no Beatles, vire para a frente
três páginas seguidas e confirme que da segunda em diante a troca é imediata; vire para
trás e confirme que continua correta (a página anterior não é adiantada, e tem que
desenhar do zero sem piscar conteúdo errado).

- [ ] **Step 8: Rota e ações no `main.js`**

Estado novo em `state.js` (junto de `livroDraft`):

```js
  livroId: null,           // livro aberto na tela book
  livroPagina: 1,
  livroZoom: 1,
  livroGrade: false,       // a grade de miniaturas está aberta?
```

Em `main.js`, no `update()`:

```js
  else if (scr === 'book') html = renderBook();
```

no `afterRender()`:

```js
  if (S.screen === 'book') afterRenderBook(update);
```

e as ações:

```js
  openBook(d) {
    const b = livroById(d.id);
    if (!b) return;
    S.livroId = b.id;
    S.livroPagina = Math.min(Math.max(1, b.ultimaPagina || 1), b.paginas || 1);
    S.livroZoom = 1;
    S.livroGrade = false;
    S.screen = 'book';
    update();
  },
  async sairDoLivro() { await sairDoLivro(); S.screen = 'home'; S.tab = 'books'; update(); },
  async paginaAnterior() { if (await viraPagina(-1)) update(); },
  async proximaPagina() { if (await viraPagina(1)) update(); },
  bookZoomIn() { bookZoomBy(0.2); },
  bookZoomOut() { bookZoomBy(-0.2); },
```

O atalho de teclado (junto do bloco que já trata `' '` na tela play, ~linha 1148):

```js
  if (S.screen === 'book' && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
    viraPagina(e.key === 'ArrowRight' ? 1 : -1).then((n) => { if (n) update(); });
  }
```

- [ ] **Step 9: CSS da tela do livro**

```css
/* ---------- Tela do livro ---------- */
.book-screen{display:flex;flex-direction:column;height:100%}
.book-page{flex:1;overflow:auto;touch-action:none;background:var(--bg)}
.book-page .inner{min-height:100%;display:flex;align-items:center;justify-content:center;padding:10px}
.book-page canvas{display:block;background:#fff;border-radius:4px;box-shadow:0 2px 14px rgba(0,0,0,.35)}
.book-hud{display:flex;align-items:center;gap:14px;justify-content:center;
  padding:10px 16px;border-top:1px solid var(--line);background:var(--card)}
.book-hud button{background:transparent;border:1px solid var(--line);color:inherit;
  border-radius:8px;min-width:44px;height:40px;font-size:18px}
.book-hud button[disabled]{opacity:.35}
.book-hud .pg{min-width:110px;text-align:center;color:var(--muted);font-size:13px}
```

- [ ] **Step 10: SHELL, sintaxe, testes**

Acrescente `'./js/panzoom.js',` e `'./js/render/book.js',` ao `SHELL`.

```bash
cd app && node --check js/panzoom.js && node --check js/render/book.js && node --test
```

Esperado: PASS na suíte inteira.

- [ ] **Step 11: Verificação manual**

1. Abra o Michael Jackson pela estante: cai na página 1, nítida.
2. Setas do HUD e setas do teclado viram a página; o contador acompanha.
3. Pinça (ou roda) aproxima; a página **redesenha** — aproxime bastante e confirme que
   o texto continua nítido em vez de borrar.
4. Com zoom > 100%, arrastar move dentro da página e **não** vira a página.
5. Com zoom em 100%, deslizar na horizontal vira a página.
6. Volte e reabra o livro: ele reabre na página onde você parou.
7. Abra o Beatles (401 páginas) e pule para o fim: o desenho continua respondendo.
8. Reabra uma música com cifra em imagem e confirme, de novo, que a pinça de lá segue igual.

- [ ] **Step 12: Commit**

```bash
git add app/js/panzoom.js app/test/panzoom.test.js app/js/render/book.js \
        app/js/render/play.js app/js/main.js app/js/state.js app/css/app.css app/js/i18n app/sw.js
git commit -m "feat(books): page-by-page reader with redraw-on-zoom, sharing the pinch gesture"
```

---

### Task 5: A grade de páginas

Num livro de 401 páginas, "ir para a página 218" não é como se acha uma música. A grade é.

**Files:**
- Modify: `app/js/render/book.js` (a sobreposição), `app/js/main.js` (ações), `app/css/app.css`

**Interfaces:**
- Consumes: tudo da Tarefa 4.
- Produces: `gradeHTML() → string`, `desenhaMiniaturas()` (chamada pelo `afterRenderBook` quando `S.livroGrade`).

- [ ] **Step 1: A sobreposição no `render/book.js`**

```js
// Thumbnails at 120 CSS px: small enough that 401 of them are cheap, big enough
// to recognise a title. Kept in memory for the session only — persisting 401
// thumbnails per book is an optimisation to make with a measurement in hand.
const MINI_PX = 120;
const minis = new Map();   // `${livroId}:${n}` → dataURL

function gradeHTML(b) {
  if (!S.livroGrade) return '';
  const celulas = [];
  for (let n = 1; n <= b.paginas; n++) {
    const url = minis.get(`${b.id}:${n}`);
    celulas.push(`<button class="mini ${n === S.livroPagina ? 'on' : ''}" data-a="irParaPagina" data-id="${n}">
      ${url ? `<img src="${url}" alt="" loading="lazy">` : `<span class="ph" data-mini="${n}"></span>`}
      <span class="n">${n}</span>
    </button>`);
  }
  return `<div class="book-grid-overlay">
    <div class="hd">
      <div class="t">${t('book.grid')}</div>
      <div class="goto"><label for="f-goto">${t('book.goTo')}</label>
        <input type="number" id="f-goto" min="1" max="${b.paginas}" value="${S.livroPagina}"></div>
      <button class="btn-icon" data-a="toggleBookGrid">${I.close(20)}</button>
    </div>
    <div class="minis" data-autoscroll="1">${celulas.join('')}</div>
  </div>`;
}
```

Acrescente `${gradeHTML(b)}` dentro da `.book-screen`, depois da `.book-hud`.

- [ ] **Step 2: Desenhar as miniaturas visíveis, e só elas**

```js
// Draws only what is on screen, as the grid scrolls: rasterising 401 pages up
// front would freeze the tablet for the sake of thumbnails nobody scrolled to.
async function desenhaMiniaturas() {
  const b = livroById(S.livroId);
  const caixa = document.querySelector('.book-grid-overlay .minis');
  if (!b || !caixa || !doc) return;
  const pendentes = [...caixa.querySelectorAll('[data-mini]')].filter((el) => {
    const r = el.getBoundingClientRect();
    return r.bottom > -200 && r.top < window.innerHeight + 200;
  }).slice(0, 12);
  for (const el of pendentes) {
    const n = +el.dataset.mini;
    if (minis.has(`${b.id}:${n}`)) continue;
    const canvas = document.createElement('canvas');
    try { await renderPagina(doc, n, MINI_PX, 2, canvas); }
    catch (e) { continue; }
    const url = canvas.toDataURL('image/jpeg', 0.7);
    minis.set(`${b.id}:${n}`, url);
    const img = new Image();
    img.src = url;
    el.replaceWith(img);
  }
  if (pendentes.length) requestAnimationFrame(() => desenhaMiniaturas());
}
```

No `afterRenderBook()`, depois de `desenhaPagina()`:

```js
  if (S.livroGrade) {
    const caixa = document.querySelector('.book-grid-overlay .minis');
    if (caixa && !caixa._wired) {
      caixa._wired = true;
      caixa.addEventListener('scroll', () => desenhaMiniaturas(), { passive: true });
    }
    const goto = document.getElementById('f-goto');
    if (goto && !goto._wired) {
      goto._wired = true;
      goto.addEventListener('change', () => {
        const b = livroById(S.livroId);
        const n = Math.max(1, Math.min(b.paginas, +goto.value || 1));
        S.livroPagina = n; S.livroGrade = false; onUpdate();
      });
    }
    desenhaMiniaturas();
  }
```

`onUpdate` é o mesmo parâmetro que `afterRenderBook` já recebe desde a Tarefa 4.

E o cache morre junto com o livro, em `sairDoLivro()`:

```js
  minis.clear();
```

- [ ] **Step 3: Ações no `main.js`**

```js
  toggleBookGrid() { S.livroGrade = !S.livroGrade; update(); },
  irParaPagina(d) { S.livroPagina = +d.id; S.livroGrade = false; update(); },
```

- [ ] **Step 4: CSS**

```css
.book-grid-overlay{position:fixed;inset:0;z-index:60;background:var(--bg);display:flex;flex-direction:column}
.book-grid-overlay .hd{display:flex;align-items:center;gap:16px;padding:14px 18px;border-bottom:1px solid var(--line)}
.book-grid-overlay .hd .t{font-size:17px;font-weight:700}
.book-grid-overlay .goto{margin-left:auto;display:flex;align-items:center;gap:8px;color:var(--muted);font-size:13px}
.book-grid-overlay .goto input{width:90px;height:38px;border-radius:8px;border:1px solid var(--line);
  background:var(--card);color:inherit;padding:0 10px;font:inherit}
.book-grid-overlay .minis{flex:1;overflow:auto;padding:18px;
  display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:14px}
.mini{background:transparent;border:0;padding:0;cursor:pointer;display:flex;flex-direction:column;gap:6px;align-items:center}
.mini img,.mini .ph{width:100%;aspect-ratio:1/1.414;object-fit:cover;background:var(--card);
  border:1px solid var(--line);border-radius:6px;display:block}
.mini.on img,.mini.on .ph{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent)}
.mini .n{color:var(--muted);font-size:12px}
```

- [ ] **Step 5: Sintaxe e testes**

```bash
cd app && node --check js/render/book.js && node --test
```

Esperado: PASS.

- [ ] **Step 6: Verificação manual**

1. Abra o Beatles (401 páginas) e toque no botão da grade.
2. As miniaturas aparecem só conforme você rola — role rápido até o fim e confirme que
   o app não congela.
3. Toque numa miniatura: cai naquela página, e a grade fecha.
4. Digite `218` em "ir para a página": mesma coisa.
5. Feche e reabra a grade: as miniaturas já vistas aparecem na hora (cache da sessão).

- [ ] **Step 7: Commit**

```bash
git add app/js/render/book.js app/js/main.js app/css/app.css
git commit -m "feat(books): thumbnail grid with lazy rendering and go-to-page"
```

---

### Task 6: O livro dentro do `.somaplay`

**Files:**
- Modify: `app/js/partes.js:12-24` (dois eixos), `app/js/backup.js` (export e import), `app/js/merge.js` (plano de fusão), `app/js/state.js` (`S.books` depois do import)
- Test: `app/test/partes.test.js`, `app/test/books.test.js`, `app/test/export.test.js`

**Interfaces:**
- Consumes: `fundeLivros`, `blobIdsDosLivros` (Tarefa 2).
- Produces: `PARTES_DE_MUSICA` (novo export de `partes.js`); `manifest.books` no arquivo; `mergePlan(...)` passando a devolver também `books`, `booksAdded`.

- [ ] **Step 1: Escrever os testes que falham**

Em `app/test/partes.test.js`, acrescente:

```js
import { PARTES_DE_MUSICA, PARTES_TODAS, podaPorPartes, fundeMusica } from '../js/partes.js';

test('livros é uma parte declarável, mas não é parte de música', () => {
  assert.deepEqual(PARTES_DE_MUSICA, ['cifra', 'audio', 'pessoal']);
  assert.ok(PARTES_TODAS.includes('livros'));
});

test('REGRESSÃO: backup gravado antes dos livros restaura o registro INTACTO', () => {
  // O .somaplay que já está no disco do usuário declara três partes, não quatro.
  // Se `todasAsPartes` passar a exigir as quatro, esse arquivo cai na cópia campo
  // a campo e perde, EM SILÊNCIO e NA VOLTA, todo campo fora de CAMPOS.
  const antigas = ['cifra', 'audio', 'pessoal'];
  const registro = { id: 's1', artistId: 'a1', title: 'X', cifra: { tipo: 'texto' },
    favorita: true, campoQueNinguemConhece: 42 };
  assert.deepEqual(podaPorPartes([registro], antigas), [registro]);
  assert.deepEqual(fundeMusica(null, registro, antigas), registro);
});

test('um arquivo só de livros não poda música nenhuma para dentro', () => {
  const registro = { id: 's1', artistId: 'a1', title: 'X', cifra: { tipo: 'texto' } };
  const [saiu] = podaPorPartes([registro], ['livros']);
  assert.deepEqual(saiu, { id: 's1', artistId: 'a1', title: 'X' });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
cd app && node --test test/partes.test.js
```

Esperado: FAIL — `PARTES_DE_MUSICA` ainda não é exportado.

- [ ] **Step 3: Os dois eixos em `partes.js`**

```js
// As partes de uma MÚSICA. É este conjunto que `todasAsPartes` mede, e mexer
// nele muda o que "arquivo completo" significa para todo .somaplay já gravado.
export const PARTES_DE_MUSICA = ['cifra', 'audio', 'pessoal'];

// O que um arquivo pode declarar que carrega. Livro é coleção de topo, como as
// listas — não é campo de música, e por isso NÃO entra em CAMPOS.
//
// Acrescentar 'livros' aqui é seguro porque `todasAsPartes` continua medindo
// PARTES_DE_MUSICA: um backup antigo, que declara as três, segue sendo lido como
// completo e volta com o registro intacto. Exigir as quatro faria todo backup já
// gravado perder campo na restauração — em silêncio, e na direção que ninguém confere.
export const PARTES_TODAS = [...PARTES_DE_MUSICA, 'livros'];
```

E `todasAsPartes` passa a medir o eixo certo:

```js
const todasAsPartes = (ps) => PARTES_DE_MUSICA.every((p) => ps.includes(p));
```

`CAMPOS` **não muda**.

- [ ] **Step 4: Rodar e ver passar**

```bash
cd app && node --test test/partes.test.js
```

Esperado: PASS, incluindo o teste de regressão.

- [ ] **Step 5: O livro no arquivo exportado**

Em `app/js/backup.js`, `exportLibrary` ganha o recorte de livros. A assinatura passa a
aceitar `bookIds`:

```js
export async function exportLibrary({ songIds = null, listIds = null, bookIds = null, partes = null, fileName = null } = {}) {
  const ps = partes || PARTES_TODAS;
  const corte = recorteParaExport({ artists: S.artists, songs: S.songs, lists: S.lists }, { songIds, listIds });
  const podadas = podaPorPartes(corte.songs, ps);
  // Livro só viaja quando o arquivo declara que fala de livro. Um pacote de
  // repertório não arrasta 300 MB de songbook junto.
  const books = ps.includes('livros')
    ? (bookIds ? S.books.filter((b) => bookIds.has(b.id)) : S.books)
    : [];
  const blobIds = [...blobIdsDasMusicas(podadas), ...blobIdsDosLivros(books)];
```

e o manifesto:

```js
    lists: corte.lists,
    books,
    blobs: manifestBlobs,
```

Importe `blobIdsDosLivros` de `./books.js` no topo.

**Cuidado com a ordem:** os bytes são concatenados na ordem de `manifestBlobs`, e a
leitura no import percorre a mesma lista somando `size`. Manter a coleta numa lista só,
como acima, é o que mantém as duas pontas de acordo.

- [ ] **Step 6: O livro na importação**

Em `app/js/merge.js`, `mergePlan` passa a planejar livros:

```js
import { fundeLivros } from './books.js';

// … dentro de mergePlan, antes do return:
  const livros = fundeLivros((existing && existing.books) || [], (incoming && incoming.books) || []);

  return {
    artists,
    songs,
    lists: (incoming && incoming.lists) || [],
    books: livros.books,
    booksAdded: livros.added,
    added,
    updated: songs.length - added,
    remap,
  };
```

Em `app/js/backup.js`, `importLibrary`:

```js
  // merge
    for (const b of plan.books) await DB.putBook(b);
```

e no modo substituir, depois das listas:

```js
    for (const b of manifest.books || []) await DB.putBook(b);
```

E o recarregamento no fim da função:

```js
  S.books = (all.books || []).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
```

Passe `books: S.books` no estado que vai para `mergePlan`:

```js
    const plan = mergePlan({ artists: S.artists, songs: S.songs, lists: S.lists, books: S.books }, manifest, agora);
```

- [ ] **Step 7: Teste da fusão ponta a ponta**

Em `app/test/books.test.js`, acrescente (o `mergePlan` é puro e já é testado assim em
`app/test/merge.test.js`):

```js
import { mergePlan } from '../js/merge.js';

test('mergePlan traz o livro novo e preserva o que o aparelho já tem', () => {
  const atual = { artists: [], songs: [], lists: [], books: [{ id: 'l1', titulo: 'Meu', ultimaPagina: 88 }] };
  const arquivo = { artists: [], songs: [], lists: [], partes: ['livros'],
    books: [{ id: 'l1', titulo: 'Do arquivo', ultimaPagina: 1 }, { id: 'l2', titulo: 'Novo' }] };
  const plano = mergePlan(atual, arquivo);
  assert.deepEqual(plano.books.map((b) => b.titulo), ['Meu', 'Novo']);
  assert.equal(plano.booksAdded, 1);
});

test('mergePlan de arquivo antigo (sem books) não mexe na estante', () => {
  const atual = { artists: [], songs: [], lists: [], books: [{ id: 'l1', titulo: 'Meu' }] };
  const plano = mergePlan(atual, { artists: [], songs: [], lists: [] });
  assert.deepEqual(plano.books, atual.books);
});
```

- [ ] **Step 8: Rodar a suíte inteira**

```bash
cd app && node --test
```

Esperado: PASS. Preste atenção em `export.test.js` e `merge.test.js`, que já existiam:
se algum quebrou, foi a assinatura do `mergePlan`/`exportLibrary` que mudou de forma
incompatível, e é aí que se conserta.

- [ ] **Step 9: Verificação manual**

1. Com um livro na estante, Configurações → **Exportar (backup)**.
2. Confira o tamanho do arquivo gerado: precisa incluir os MB do PDF.
3. Num navegador limpo (janela anônima), importe o backup: o livro aparece na estante,
   abre e desenha.
4. Volte ao perfil original, importe o **mesmo** arquivo em modo merge: nada duplica,
   e a `ultimaPagina` local **não** volta para 1.

- [ ] **Step 10: Commit**

```bash
git add app/js/partes.js app/js/backup.js app/js/merge.js app/js/state.js app/test
git commit -m "feat(books): books travel in .somaplay, without breaking older backups"
```

---

### Task 7: Menu do livro — renomear, exportar, apagar

**Files:**
- Modify: `app/js/render/book.js` (menu na topbar), `app/js/main.js` (ações), `app/js/i18n/pt.js`, `app/js/i18n/en.js`, `app/css/app.css`

**Interfaces:**
- Consumes: `renomearLivro`, `apagarLivro` (Tarefa 2), `exportLibrary` com `bookIds` (Tarefa 6).
- Produces: nada para tarefas seguintes.

- [ ] **Step 1: Chaves nas duas tabelas**

`pt.js`:

```js
  'book.menu.rename': 'Renomear',
  'book.menu.export': 'Exportar livro',
  'book.menu.delete': 'Apagar livro',
  'book.delete.confirm': 'Apagar "{title}"? O PDF sai do aparelho.',
  'book.deleted': 'Livro apagado.',
  'book.exported': 'Livro exportado.',
```

`en.js`:

```js
  'book.menu.rename': 'Rename',
  'book.menu.export': 'Export book',
  'book.menu.delete': 'Delete book',
  'book.delete.confirm': 'Delete "{title}"? The PDF leaves this device.',
  'book.deleted': 'Book deleted.',
  'book.exported': 'Book exported.',
```

- [ ] **Step 2: O menu, no padrão da tela de tocar**

Em `render/book.js`, na topbar, ao lado do botão da grade (o `.menu-pop` já existe no
CSS, usado por `play.js:541`):

```js
      <button class="btn-icon ${S.livroMenu ? 'accent-on' : ''}" data-a="toggleBookMenu" title="${t('play.menu.options')}">${I.dots()}</button>
      ${S.livroMenu ? `<div class="menu-pop">
        <button data-a="renomearLivro">${I.pencil()}<span>${t('book.menu.rename')}</span></button>
        <button data-a="exportarLivro">${I.download()}<span>${t('book.menu.export')}</span></button>
        <button data-a="apagarLivro">${I.trash()}<span>${t('book.menu.delete')}</span></button>
      </div>` : ''}
```

Com `livroMenu: false` e `livroRenomeando: false` em `S` (`state.js`, junto de `livroGrade`).

A renomeação abre uma faixa com os dois campos abaixo da topbar, no lugar da página.
Em `render/book.js`, antes da `.book-page`:

```js
function renomeioHTML(b) {
  if (!S.livroRenomeando) return '';
  return `<div class="book-rename">
    <input type="text" class="input lg" id="f-ren-titulo" value="${esc(b.titulo)}" placeholder="${t('books.draft.name')}">
    <input type="text" class="input lg" id="f-ren-autor" value="${esc(b.autor || '')}" placeholder="${t('books.draft.author')}">
    <button class="btn-ghost" data-a="cancelRenomearLivro">${t('common.cancel')}</button>
    <button class="btn-save" data-a="confirmRenomearLivro">${I.save()}${t('common.save')}</button>
  </div>`;
}
```

Com `${renomeioHTML(b)}` na `.book-screen`, o CSS

```css
.book-rename{display:flex;gap:10px;align-items:center;padding:12px 16px;border-bottom:1px solid var(--line)}
.book-rename .input{flex:1;min-width:0}
```

e as três ações no `main.js`:

```js
  renomearLivro() { S.livroMenu = false; S.livroRenomeando = true; update(); },
  cancelRenomearLivro() { S.livroRenomeando = false; update(); },
  async confirmRenomearLivro() {
    await renomearLivro(S.livroId, {
      titulo: document.getElementById('f-ren-titulo')?.value.trim() || undefined,
      autor: document.getElementById('f-ren-autor')?.value.trim() ?? undefined,
    });
    S.livroRenomeando = false;
    update();
  },
```

- [ ] **Step 3: Ações no `main.js`**

```js
  toggleBookMenu() { S.livroMenu = !S.livroMenu; update(); },

  async exportarLivro() {
    const b = livroById(S.livroId);
    if (!b) return;
    S.livroMenu = false;
    const nome = nomeDoExport(`livro-${b.titulo}`, stampDeHoje(), ['livros'], {});
    const file = await exportLibrary({
      songIds: new Set(), listIds: new Set(), bookIds: new Set([b.id]),
      partes: ['livros'], fileName: nome,
    });
    await entregaArquivo(file);
    toast(t('book.exported'));
    update();
  },

  async apagarLivro() {
    const b = livroById(S.livroId);
    if (!b) return;
    S.livroMenu = false;
    if (!confirm(t('book.delete.confirm', { title: b.titulo }))) return update();
    await sairDoLivro();
    await apagarLivro(b.id);
    if (S.capaURLs[b.id]) { URL.revokeObjectURL(S.capaURLs[b.id]); delete S.capaURLs[b.id]; }
    S.screen = 'home'; S.tab = 'books';
    toast(t('book.deleted'));
    update();
  },
```

`nomeDoExport` e `stampDeHoje` vêm de `./backup.js`, que `main.js` já importa.
**`songIds: new Set()` e `listIds: new Set()` vazios, e não `null`:** `null` significa
"tudo" no recorte (`backup.js:23-28`), e exportar um livro arrastaria a biblioteca inteira.

- [ ] **Step 4: Sintaxe e testes**

```bash
cd app && node --check js/render/book.js && node --check js/main.js && node --test
```

Esperado: PASS.

- [ ] **Step 5: Verificação manual**

1. Renomeie um livro: o título muda na topbar e na estante, e sobrevive a recarregar.
2. Exporte um livro: o arquivo sai com o nome `somaplay-livro-<titulo>-<data>.somaplay`
   e pesa o tamanho do PDF (não a biblioteca inteira — confira o número).
3. Importe esse arquivo num perfil limpo, em modo merge: só o livro entra; artistas,
   músicas e listas de lá continuam intactos.
4. Apague um livro: sai da estante, e em DevTools → Application → OPFS os dois blobs
   sumiram junto.

- [ ] **Step 6: Commit**

```bash
git add app/js/render/book.js app/js/main.js app/js/state.js app/js/i18n app/css/app.css
git commit -m "feat(books): rename, export and delete a book"
```

---

### Task 8: Versão, documentação e fechamento

**Files:**
- Modify: `app/js/version.js`, `app/sw.js:2`, `CHANGELOG.md`, `README.md`, `README.pt-BR.md`, `CONTRIBUTING.md`, `CLAUDE.md`, `docs/superpowers/specs/2026-08-22-livros-pdf-design.md`

- [ ] **Step 1: Subir a versão nos dois lugares**

`app/js/version.js` → `0.16.0`; `app/sw.js` linha 2 → `const VERSION = 'somaplay-0.16.0';`

```bash
cd app && node --test test/version.test.js
```

Esperado: PASS (é o teste que existe para os dois nunca discordarem).

- [ ] **Step 2: `CHANGELOG.md`**

Confira o formato das entradas anteriores do arquivo e escreva, no topo:

```markdown
## 0.16.0 — 2026-08-22

### Added
- **Books.** A songbook PDF now goes into the library whole: a Books tab with covers,
  page-by-page reading, pinch zoom that redraws the page instead of stretching it, a
  thumbnail grid to jump across hundreds of pages, and the page you stopped on.
- Books travel in `.somaplay` — in a full backup, or shared one at a time.

### Changed
- pdf.js v6.2.108 is vendored under `app/js/vendor/` — the project's first third-party
  dependency. The precache goes from ~1 MB to ~5 MB; there is still no build step and no
  package manager.
- `PARTES_TODAS` gained `livros`; `todasAsPartes()` now measures `PARTES_DE_MUSICA`, so
  every `.somaplay` written before this release still restores untouched.
```

- [ ] **Step 3: `CONTRIBUTING.md`**

Uma seção curta: `app/js/vendor/` é código de terceiro copiado, ninguém edita nada lá,
e atualizar é o procedimento de `app/js/vendor/pdfjs/VERSAO.md`.

- [ ] **Step 4: `README.md` e `README.pt-BR.md`**

Uma linha na lista de recursos, nas duas línguas: songbook em PDF entra inteiro e é
lido no app, com zoom.

- [ ] **Step 5: `CLAUDE.md` — o que vai morder quem vier depois**

Acrescente à seção "Things that will bite you":

```markdown
**O pdf.js é vendorizado e ninguém edita `app/js/vendor/`.** É a única dependência de
terceiro do projeto, fixada em v6.2.108 e precacheada por um array `VENDOR` separado
do `SHELL` — separado porque `cache.addAll()` rejeita inteiro quando um caminho falta,
e um `.wasm` esquecido não pode derrubar a instalação do app todo. `shell.test.js`
compara o array com o que existe em disco. Atualizar: `app/js/vendor/pdfjs/VERSAO.md`.

**`PARTES_TODAS` deixou de ser o que `todasAsPartes()` mede.** Quem mede é
`PARTES_DE_MUSICA` (`partes.js`). Acrescentar uma parte nova ao primeiro é seguro;
acrescentar ao segundo faz **todo backup já gravado** cair na cópia campo a campo e
perder, em silêncio e na restauração, qualquer campo fora de `CAMPOS`.
```

- [ ] **Step 6: Marcar a spec como implementada**

No cabeçalho de `docs/superpowers/specs/2026-08-22-livros-pdf-design.md`, troque
**Estado:** `especificado` por `implementado`. E, se a medição da Tarefa 1 tiver mudado
alguma decisão (o Fake Book, o tamanho real do precache), **atualize a seção
correspondente da spec** — a spec é documento vivo, e uma decisão que só existe no chat
está perdida.

- [ ] **Step 7: A suíte inteira, uma última vez**

```bash
cd app && node --test
```

Esperado: PASS em tudo. Se algum teste falhar, ele volta a ser a tarefa — não se fecha
uma branch com teste vermelho.

- [ ] **Step 8: Verificação offline, que é a que o usuário sente**

1. Sirva o app, carregue-o, importe um livro.
2. DevTools → Network → **Offline**, e recarregue.
3. O app abre, a estante mostra a capa, o livro abre e **desenha a página**.
   Se a página não desenhar offline, o `workerSrc` ou os `.wasm` não estão no `VENDOR`.
4. Repita no tablet, instalado como PWA, com o aparelho em modo avião.

- [ ] **Step 9: Commit**

```bash
git add app/js/version.js app/sw.js CHANGELOG.md README.md README.pt-BR.md \
        CONTRIBUTING.md CLAUDE.md docs/superpowers/specs/2026-08-22-livros-pdf-design.md
git commit -m "chore(release): 0.16.0 — PDF books"
```
