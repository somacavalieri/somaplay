# Anotações da Música — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar a cada música uma seção de anotações em texto rico, que viaja no
`.somaplay` como uma parte própria.

**Architecture:** Um campo string `anotacoes` no registro da música, guardando
HTML restrito a uma lista branca de 14 tags. Um módulo novo (`js/anotacoes.js`)
filtra tudo que entra — colagem, importação e renderização — com o núcleo puro
(árvore simples de objetos) separado do parse, que é do navegador. Uma quarta
parte `anotacoes` em `partes.js` decide quando a anotação viaja. A edição é um
`contenteditable` com barra de `execCommand`.

**Tech Stack:** ES modules puros, sem build e sem dependências. `node --test`
para a lógica pura, `node --check` para sintaxe, navegador para a UI.

**Spec:** `docs/superpowers/specs/2026-08-18-anotacoes-da-musica-design.md`

## Global Constraints

- **Sem dependências.** Nada de npm install, nada de bundler.
- **Toda chave de i18n entra nas DUAS tabelas** (`js/i18n/pt.js` e
  `js/i18n/en.js`); `test/i18n.test.js` falha se faltar em uma. E string
  traduzida se produz em tempo de render — uma constante de módulo congela no
  import e não acompanha a troca de idioma.
- **Todo módulo novo sob `app/js/` entra em `SHELL`**, em `app/sw.js`;
  `test/shell.test.js` falha se faltar.
- **Nenhum valor de `data-*` passa por `t()`** — é persistido no registro.
- **A cifra do usuário não se toca.** A anotação é conteúdo separado, jamais
  inserido dentro do texto da cifra.
- **Comentários em português neste conjunto**, seguindo `partes.js` e
  `transpose.js`, que já são em português.
- **Versão final: 0.16.0**, em `js/version.js` e na linha 2 de `sw.js`, mais
  entrada no `CHANGELOG.md`.
- Rodar `cd app && node --test` ao fim de cada tarefa. Verde antes de commitar.

---

### Task 1: `js/anotacoes.js` — o filtro

**Files:**
- Create: `app/js/anotacoes.js`
- Create: `app/test/anotacoes.test.js`
- Modify: `app/sw.js` (array `SHELL`)

**Interfaces:**
- Produces:
  - `TAGS: string[]`, `ATRIBS: Record<string,string[]>`, `RENOMEIA: Record<string,string>`
  - `hrefSeguro(href: string): string | null`
  - `filtra(nos: No[]): No[]` — puro
  - `paraHTML(nos: No[]): string` — puro
  - `deTexto(txt: string): string` — puro
  - `paraArvore(html: string): No[]` — só navegador (`DOMParser`)
  - `limpaHTML(html: string): string` — só navegador
  - `No` é `{ texto: string }` ou `{ tag: string, atribs: Record<string,string>, filhos: No[] }`

- [ ] **Step 1: Escrever o teste que falha**

Criar `app/test/anotacoes.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert';
import { filtra, paraHTML, hrefSeguro, deTexto } from '../js/anotacoes.js';

const tx = (s) => ({ texto: s });
const el = (tag, filhos = [], atribs = {}) => ({ tag, atribs, filhos });
const limpa = (nos) => paraHTML(filtra(nos));

test('style e class do Word somem, o texto fica', () => {
  const entrada = [el('p', [el('span', [tx('estudar devagar')], { style: 'font-family:Calibri;color:#000', class: 'MsoNormal' })])];
  assert.equal(limpa(entrada), '<p>estudar devagar</p>');
});

test('b e i viram strong e em', () => {
  assert.equal(limpa([el('p', [el('b', [tx('x')]), el('i', [tx('y')])])]), '<p><strong>x</strong><em>y</em></p>');
});

test('img some, inclusive base64 colado', () => {
  const entrada = [el('p', [tx('antes'), el('img', [], { src: 'data:image/png;base64,AAAA' }), tx('depois')])];
  assert.equal(limpa(entrada), '<p>antesdepois</p>');
});

test('script some COM o conteudo', () => {
  assert.equal(limpa([el('p', [tx('ok')]), el('script', [tx('alert(1)')])]), '<p>ok</p>');
});

test('href javascript: perde o link mas mantem o texto', () => {
  assert.equal(limpa([el('p', [el('a', [tx('clique')], { href: 'javascript:alert(1)' })])]), '<p>clique</p>');
});

test('href https sobrevive', () => {
  assert.equal(limpa([el('p', [el('a', [tx('aula')], { href: 'https://ex.com/a' })])]),
    '<p><a href="https://ex.com/a">aula</a></p>');
});

test('pre preserva o alinhamento por coluna', () => {
  assert.equal(limpa([el('pre', [tx('| Am  | F   |\n| C   | G   |')])]),
    '<pre>| Am  | F   |\n| C   | G   |</pre>');
});

test('texto e escapado, nao interpretado', () => {
  assert.equal(limpa([el('p', [tx('a < b & c')])]), '<p>a &lt; b &amp; c</p>');
});

test('paragrafo vazio some, br fica', () => {
  assert.equal(limpa([el('p', []), el('p', [tx('a'), el('br')])]), '<p>a<br></p>');
});

test('hrefSeguro recusa esquema desconhecido, relativo e caractere de controle', () => {
  assert.equal(hrefSeguro('https://ex.com'), 'https://ex.com');
  assert.equal(hrefSeguro('mailto:a@b.c'), 'mailto:a@b.c');
  assert.equal(hrefSeguro('java\u0000script:alert(1)'), null);
  assert.equal(hrefSeguro('/relativo'), null);
  assert.equal(hrefSeguro(''), null);
});

test('deTexto quebra linhas em paragrafos e escapa', () => {
  assert.equal(deTexto('um\n\ndois <b>'), '<p>um</p><p>dois &lt;b&gt;</p>');
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && node --test test/anotacoes.test.js`
Expected: FAIL — `Cannot find module '../js/anotacoes.js'`

- [ ] **Step 3: Escrever o módulo**

Criar `app/js/anotacoes.js`:

```js
// anotacoes.js — o filtro das anotações da música.
//
// A anotação é o primeiro conteúdo do app que entra num innerHTML SEM passar por
// esc() — é o ponto dela: o usuário escreve texto formatado. Só que ela também
// chega dentro de um .somaplay recebido por WhatsApp, de uma origem que o app não
// controla. Por isso tudo passa por aqui: ao colar, ao importar e ao renderizar.
//
// O parse é do navegador (DOMParser) e o filtro é puro, sobre uma árvore de
// objetos simples. Essa separação é o que deixa a regra — quem sobrevive e quem
// não — testável em `node --test`, onde não há DOM. Regex sobre HTML falharia
// exatamente nos casos que interessam.
// Design: docs/superpowers/specs/2026-08-18-anotacoes-da-musica-design.md

export const TAGS = ['p', 'br', 'strong', 'em', 'u', 's', 'h3', 'ul', 'ol', 'li', 'blockquote', 'mark', 'pre', 'a'];
export const ATRIBS = { a: ['href'] };

// O que o Word e o Google Docs mandam no lugar do que a lista aceita. Sem este
// mapa, um documento inteiro em <b>/<h2>/<div> chegaria como texto corrido.
export const RENOMEIA = {
  b: 'strong', i: 'em', strike: 's', del: 's',
  h1: 'h3', h2: 'h3', h4: 'h3', h5: 'h3', h6: 'h3',
  div: 'p', section: 'p', article: 'p',
};

// Some com os filhos junto. Todo o resto que não está na lista é DESEMBRULHADO —
// um <span style> do Word perde a casca e entrega o texto.
const APAGA_TUDO = ['script', 'style', 'head', 'title', 'noscript', 'iframe', 'object', 'embed', 'template'];
const ESQUEMAS = ['http:', 'https:', 'mailto:'];
const VAZIAS = ['br'];

const escTexto = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const escAtrib = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Só absoluto e só nestes três esquemas. Um href relativo devolve null de
// propósito: dentro de um PWA ele apontaria para a própria casca do app.
// Os caracteres de controle saem ANTES do teste — senão um `java\u0000script:`
// passaria pelo regex e viraria um link executável.
export function hrefSeguro(href) {
  const v = String(href ?? '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
  const m = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(v);
  if (!m) return null;
  return ESQUEMAS.includes(m[1].toLowerCase() + ':') ? v : null;
}

export function filtra(nos) {
  const out = [];
  for (const n of nos || []) {
    if (n && n.texto !== undefined) { if (n.texto) out.push({ texto: n.texto }); continue; }
    if (!n || !n.tag) continue;
    const original = String(n.tag).toLowerCase();
    if (APAGA_TUDO.includes(original)) continue;
    const tag = RENOMEIA[original] || original;
    const filhos = filtra(n.filhos);
    if (!TAGS.includes(tag)) { out.push(...filhos); continue; }
    if (!filhos.length && !VAZIAS.includes(tag)) continue;

    const atribs = {};
    for (const a of (ATRIBS[tag] || [])) {
      const bruto = n.atribs ? n.atribs[a] : undefined;
      if (bruto === undefined) continue;
      const v = a === 'href' ? hrefSeguro(bruto) : String(bruto);
      if (v !== null) atribs[a] = v;
    }
    // Link sem href válido vira texto, em vez de virar <a> morto.
    if (tag === 'a' && atribs.href === undefined) { out.push(...filhos); continue; }
    out.push({ tag, atribs, filhos });
  }
  return out;
}

export function paraHTML(nos) {
  return (nos || []).map((n) => {
    if (n.texto !== undefined) return escTexto(n.texto);
    const at = Object.keys(n.atribs || {}).map((k) => ` ${k}="${escAtrib(n.atribs[k])}"`).join('');
    if (VAZIAS.includes(n.tag)) return `<${n.tag}${at}>`;
    return `<${n.tag}${at}>${paraHTML(n.filhos)}</${n.tag}>`;
  }).join('');
}

// Colar sem formatação, e o caminho de escape para qualquer texto solto.
export function deTexto(txt) {
  const linhas = String(txt ?? '').split(/\r?\n/).filter((l) => l.trim() !== '');
  return paraHTML(linhas.map((l) => ({ tag: 'p', atribs: {}, filhos: [{ texto: l }] })));
}

// --- daqui para baixo, só navegador ---

export function paraArvore(html) {
  const doc = new DOMParser().parseFromString(String(html ?? ''), 'text/html');
  const conv = (el) => Array.from(el.childNodes).map((n) => {
    if (n.nodeType === 3) return { texto: n.nodeValue };
    if (n.nodeType !== 1) return null;
    const atribs = {};
    for (const a of n.attributes) atribs[a.name.toLowerCase()] = a.value;
    return { tag: n.tagName.toLowerCase(), atribs, filhos: conv(n) };
  }).filter(Boolean);
  return conv(doc.body);
}

export function limpaHTML(html) {
  return paraHTML(filtra(paraArvore(html)));
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd app && node --test test/anotacoes.test.js`
Expected: PASS, 11 testes.

- [ ] **Step 5: Registrar no SHELL**

Em `app/sw.js`, no array `SHELL`, logo depois de `'./js/partes.js',`:

```js
  './js/anotacoes.js',
```

- [ ] **Step 6: Suíte inteira verde**

Run: `cd app && node --test`
Expected: PASS. `test/shell.test.js` confirma o registro.

- [ ] **Step 7: Commit**

```bash
git add app/js/anotacoes.js app/test/anotacoes.test.js app/sw.js
git commit -m "feat(notes): add the allowlist filter for song annotations"
```

---

### Task 2: `js/partes.js` — a parte `anotacoes`

**Files:**
- Modify: `app/js/partes.js`
- Modify: `app/test/partes.test.js`

**Interfaces:**
- Consumes: nada da Task 1.
- Produces: `PARTES_TODAS` passa a incluir `'anotacoes'`; `CAMPOS.anotacoes === ['anotacoes']`.

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar ao fim de `app/test/partes.test.js`:

```js
test('anotacoes viaja quando declarada e some quando nao', () => {
  const s = { id: 's1', artistId: 'a1', title: 'X', tom: 'G', anotacoes: '<p>oi</p>' };
  assert.equal(podaPorPartes([s], ['cifra'])[0].anotacoes, undefined);
  assert.equal(podaPorPartes([s], ['anotacoes'])[0].anotacoes, '<p>oi</p>');
});

test('cifra sozinha nao encosta na anotacao que ja existe', () => {
  const atual = { id: 's1', artistId: 'a1', title: 'X', anotacoes: '<p>do aluno</p>' };
  const r = fundeMusica(atual, { id: 's1', artistId: 'a1', title: 'X', tom: 'A' }, ['cifra']);
  assert.equal(r.anotacoes, '<p>do aluno</p>');
  assert.equal(r.tom, 'A');
});

test('anotacoes declarada sobrescreve', () => {
  const atual = { id: 's1', artistId: 'a1', title: 'X', anotacoes: '<p>do aluno</p>' };
  const r = fundeMusica(atual, { id: 's1', artistId: 'a1', title: 'X', anotacoes: '<p>do professor</p>' }, ['anotacoes']);
  assert.equal(r.anotacoes, '<p>do professor</p>');
});

test('backup antigo, com as tres partes de entao, volta INTEIRO', () => {
  // O caminho rapido do backup completo promete devolver ate um campo que este
  // modulo nunca ouviu falar. Somar uma parte a PARTES_TODAS quebraria isso em
  // silencio, e so na direcao de entrada.
  const doArquivo = { id: 's1', artistId: 'a1', title: 'X', campoDesconhecido: 42 };
  const r = fundeMusica(null, doArquivo, ['cifra', 'audio', 'pessoal'], 1);
  assert.equal(r.campoDesconhecido, 42);
});

test('backup novo, com as quatro partes, tambem volta inteiro', () => {
  const doArquivo = { id: 's1', artistId: 'a1', title: 'X', campoDesconhecido: 42 };
  const r = fundeMusica(null, doArquivo, ['cifra', 'audio', 'pessoal', 'anotacoes'], 1);
  assert.equal(r.campoDesconhecido, 42);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && node --test test/partes.test.js`
Expected: FAIL nos cinco. O do backup antigo falha com `undefined !== 42` — é a
regressão que o spec §7 mediu.

- [ ] **Step 3: Implementar**

Em `app/js/partes.js`, trocar a linha de `PARTES_TODAS`:

```js
export const PARTES_TODAS = ['cifra', 'audio', 'pessoal', 'anotacoes'];

// As partes que existiam antes da 0.16.0. Um arquivo que declara todas ELAS era
// completo na época em que foi escrito, e continua sendo — completude é
// propriedade do arquivo, não da versão do código que o lê.
const PARTES_LEGADO = ['cifra', 'audio', 'pessoal'];
```

Acrescentar a `CAMPOS`:

```js
  anotacoes: ['anotacoes'],
```

Trocar o `todasAsPartes` único por duas perguntas distintas:

```js
// Duas perguntas parecidas que NÃO são a mesma.
//
// Na saída: "este export é um backup completo?" — escrito por este código, então
// vale o vocabulário de hoje. Sem isso, um export que declarasse só as três
// partes antigas cairia no caminho rápido e levaria junto a anotação que não
// declarou.
//
// Na entrada: "este arquivo era completo quando foi escrito?" — e aí vale o
// vocabulário da época dele.
const exportCompleto = (ps) => PARTES_TODAS.every((p) => ps.includes(p));
const arquivoCompleto = (ps) => PARTES_LEGADO.every((p) => ps.includes(p));
```

Em `podaPorPartes`, trocar `todasAsPartes(ps)` por `exportCompleto(ps)`.
Em `fundeMusica`, trocar `todasAsPartes(ps)` por `arquivoCompleto(ps)`.

- [ ] **Step 4: Rodar e ver passar**

Run: `cd app && node --test test/partes.test.js`
Expected: PASS, incluindo os testes que já existiam.

- [ ] **Step 5: Suíte inteira**

Run: `cd app && node --test`
Expected: PASS. `test/export.test.js` e `test/merge.test.js` exercitam os mesmos
caminhos e precisam continuar verdes.

- [ ] **Step 6: Commit**

```bash
git add app/js/partes.js app/test/partes.test.js
git commit -m "feat(notes): give annotations their own file part"
```

---

### Task 3: A seção em leitura

**Files:**
- Modify: `app/css/app.css` (fim do arquivo)
- Modify: `app/js/render/play.js`
- Modify: `app/js/main.js` (ação `jumpNotas`)
- Modify: `app/js/state.js` (`notasVolta`)
- Modify: `app/js/i18n/pt.js`, `app/js/i18n/en.js`

**Interfaces:**
- Consumes: `limpaHTML` de `js/anotacoes.js`.
- Produces: `notasBlockHTML(song): string` e `temNotas(song): boolean`, exportadas
  de `play.js`.

Sem teste em `node --test`: é render de DOM, e o projeto não tem harness de DOM,
de propósito. A verificação é no navegador, no Step 6.

- [ ] **Step 1: CSS**

Acrescentar ao fim de `app/css/app.css`:

```css
/* --- Anotações da música --- */
.notas .sp{flex:1}
.notas-vazia{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.notas-vazia .txt{color:var(--muted);font-size:14px;line-height:1.55;max-width:400px}
.notas-saved{display:flex;align-items:center;gap:5px;color:var(--muted2);font-size:12px;font-weight:600}
.notas-body{font-size:16px;line-height:1.7;color:var(--text)}
.notas-body p{margin:0 0 14px}
.notas-body h3{font-family:var(--f-title);font-weight:600;font-size:16px;margin:20px 0 8px}
.notas-body ol,.notas-body ul{margin:0 0 14px;padding-left:22px}
.notas-body li{margin-bottom:5px}
.notas-body mark{background:var(--accent-tint2);color:var(--accent);padding:1px 4px;border-radius:4px}
.notas-body blockquote{border-left:2px solid var(--accent-soft);padding-left:14px;margin:0 0 14px;color:var(--muted)}
.notas-body pre{font-family:var(--f-mono);font-size:14px;line-height:1.65;background:var(--deep);border:1px solid var(--border);border-radius:10px;padding:14px 16px;margin:0 0 14px;overflow-x:auto;white-space:pre;color:var(--text)}
.notas-body a{color:var(--accent);text-decoration:underline;text-underline-offset:2px}
.notas-body > :last-child{margin-bottom:0}
```

- [ ] **Step 2: Render da seção**

Em `app/js/render/play.js`, importar no topo:

```js
import { limpaHTML } from '../anotacoes.js';
```

E acrescentar, logo depois de `chordsGridHTML`:

```js
export const temNotas = (song) => !!(song && String(song.anotacoes || '').trim());

// O filtro roda AQUI também, e não só na escrita. É barato e é a rede que pega
// um registro que entrou por outro caminho — um backup antigo, uma escrita
// direta no IndexedDB.
export function notasBlockHTML(song) {
  const tem = temNotas(song);
  const cabeca = `<div class="blk-hd">
      <span class="ic" style="color:${tem ? 'var(--accent)' : 'var(--muted2)'};display:flex">${I.textLines(18)}</span>
      <div class="t"${tem ? '' : ' style="color:var(--muted)"'}>${t('notas.title')}</div>
      <span class="sp"></span>
      <button class="btn-ghost" style="height:38px;padding:0 13px;font-size:13px" data-a="editNotas">${I.pencil(14)}${t(tem ? 'notas.edit' : 'notas.write')}</button>
    </div>`;
  const corpo = tem
    ? `<div class="notas-body">${limpaHTML(song.anotacoes)}</div>`
    : `<div class="notas-vazia"><div class="txt">${t('notas.empty')}</div></div>`;
  return `<div class="blk notas" id="notas" data-nopan="1">${cabeca}${corpo}</div>`;
}
```

O `data-nopan="1"` é o mesmo que `chords-block` usa: sem ele, o arraste da imagem
come o toque dentro do bloco.

- [ ] **Step 3: Pendurar a seção e a pílula**

Ainda em `play.js`, nas duas telas de cifra, logo depois da chamada de
`chordsGridHTML(...)`, acrescentar `${notasBlockHTML(song)}` — no `cifra-scroll`
do modo texto e no `chords-under-img` do modo imagem.

E na construção do array `meta` do cabeçalho (perto da linha 118), antes de
`song.fonte`:

```js
  if (temNotas(song)) meta.push(`<button class="tag-tom" data-a="jumpNotas" style="gap:5px">${I.textLines(13)}${t('notas.jump')}</button>`);
```

- [ ] **Step 4: Salto e volta**

Em `app/js/state.js`, acrescentar ao objeto `S`:

```js
  notasVolta: null,   // scrollTop de onde o salto para as anotações partiu
```

Em `app/js/main.js`, junto das outras ações do dispatch por `data-a`:

```js
    case 'jumpNotas': {
      const cx = document.querySelector('[data-autoscroll="1"]');
      const alvo = document.getElementById('notas');
      if (cx && alvo) {
        // Ida e volta no mesmo botão: com a seção já visível, ele devolve o
        // lugar de onde o salto partiu.
        const jaLa = S.notasVolta !== null && alvo.getBoundingClientRect().top < cx.clientHeight * 0.5;
        if (jaLa) { cx.scrollTo({ top: S.notasVolta, behavior: 'smooth' }); S.notasVolta = null; }
        else { S.notasVolta = cx.scrollTop; alvo.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      }
      break;
    }
```

Sem `update()` aqui: mexer na rolagem não muda estado de tela, e um re-render
jogaria a rolagem fora.

- [ ] **Step 5: Chaves de i18n**

Em `app/js/i18n/pt.js`:

```js
  'notas.title': 'Anotações',
  'notas.empty': 'Nada anotado aqui ainda. O que estudar, a levada, o que o professor falou.',
  'notas.write': 'Escrever',
  'notas.edit': 'Editar',
  'notas.jump': 'Anotações',
```

Em `app/js/i18n/en.js`:

```js
  'notas.title': 'Notes',
  'notas.empty': 'Nothing written here yet. What to practise, the strumming, what your teacher said.',
  'notas.write': 'Write',
  'notas.edit': 'Edit',
  'notas.jump': 'Notes',
```

- [ ] **Step 6: Verificar no navegador**

Run: `cd app && python3 -m http.server 8137` e abrir `http://localhost:8137`.

Conferir, numa música em T1 texto E numa em T1 imagem:
1. Sem anotação: a seção aparece discreta, com "Escrever", e **não** há pílula no
   cabeçalho.
2. Com anotação (gravar uma à mão no IndexedDB pelo DevTools, já que o editor só
   chega na Task 4): o texto renderiza formatado, a pílula aparece, leva até a
   seção, e um segundo toque devolve o lugar na cifra.
3. Tema claro e tema escuro.
4. O botão "Escrever" ainda não faz nada — é a Task 4.

- [ ] **Step 7: Sintaxe e suíte**

Run: `cd app && node --check js/render/play.js && node --check js/main.js && node --test`
Expected: PASS. `test/i18n.test.js` confirma a paridade das tabelas.

- [ ] **Step 8: Commit**

```bash
git add app/css/app.css app/js/render/play.js app/js/main.js app/js/state.js app/js/i18n/pt.js app/js/i18n/en.js
git commit -m "feat(notes): render the notes section and its header pill"
```

---

### Task 4: O editor

**Files:**
- Modify: `app/css/app.css`
- Modify: `app/js/icons.js`
- Modify: `app/js/render/play.js`
- Modify: `app/js/main.js`
- Modify: `app/js/state.js`
- Modify: `app/js/i18n/pt.js`, `app/js/i18n/en.js`

**Interfaces:**
- Consumes: `limpaHTML`, `deTexto` de `js/anotacoes.js`; `notasBlockHTML` da Task 3.
- Produces: `S.notasEdit: boolean`; ações `editNotas` e `closeNotas`; botões com
  `data-cmd` na barra.

**O risco central desta tarefa:** `update()` faz `app.innerHTML = html`
(`main.js:94`) e destrói o DOM inteiro. Um `contenteditable` não sobrevive a isso,
e a posição do cursor menos ainda. Portanto, **enquanto `S.notasEdit` for true,
nenhuma interação do editor pode chamar `update()`** — a barra age por
`execCommand` direto no DOM, e só entrar e sair do modo re-renderiza.

- [ ] **Step 1: Completar o import e os treze ícones**

Em `app/js/render/play.js`, a linha que a Task 3 criou passa a trazer as duas:

```js
import { limpaHTML, deTexto } from '../anotacoes.js';
```

E `salvaNotasPendente` (Step 5) entra na lista que `main.js` já importa de
`./render/play.js`, na linha 20.

Em `app/js/icons.js`, dentro de `export const I`, no mesmo traço dos outros
(`stroke`, viewBox 24, largura 2):

```js
  tbBold: (w = 19) => stroke(w, '<path d="M6 4h7a4 4 0 0 1 0 8H6zM6 12h8a4 4 0 0 1 0 8H6z"/>'),
  tbItalic: (w = 19) => stroke(w, '<path d="M19 4h-9M14 20H5M15 4 9 20"/>'),
  tbUnderline: (w = 19) => stroke(w, '<path d="M6 4v6a6 6 0 0 0 12 0V4M4 21h16"/>'),
  tbStrike: (w = 19) => stroke(w, '<path d="M16 5H9.5a3.5 3.5 0 0 0-2.4 6M13.5 12A3.5 3.5 0 0 1 14 19H7M4 12h16"/>'),
  tbMark: (w = 19) => stroke(w, '<path d="m9 11-6 6v3h9l3-3"/><path d="M22 12 17.4 16.6a2 2 0 0 1-2.8 0L9.4 11.4a2 2 0 0 1 0-2.8L14 4z"/>'),
  tbHeading: (w = 19) => stroke(w, '<path d="M6 12h12M6 20V4M18 20V4"/>'),
  tbUl: (w = 19) => stroke(w, '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>'),
  tbOl: (w = 19) => stroke(w, '<path d="M10 6h11M10 12h11M10 18h11M4 4h1v4M4 8h2M6 18H4c0-1 2-1.6 2-2.6S5 14 4 14.6"/>'),
  tbQuote: (w = 19) => stroke(w, '<path d="M10 11H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v7a4 4 0 0 1-4 4M20 11h-5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v7a4 4 0 0 1-4 4"/>'),
  tbLink: (w = 19) => stroke(w, '<path d="M10.5 13.5a5 5 0 0 0 7.3.4l2.4-2.4a5 5 0 0 0-7.1-7.1l-1.4 1.4"/><path d="M13.5 10.5a5 5 0 0 0-7.3-.4l-2.4 2.4a5 5 0 0 0 7.1 7.1l1.4-1.4"/>'),
  tbMono: (w = 19) => stroke(w, '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>'),
  tbUndo: (w = 19) => stroke(w, '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/>'),
  tbRedo: (w = 19) => stroke(w, '<path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 15-6.7L21 13"/>'),
```

- [ ] **Step 2: CSS do editor**

Acrescentar ao fim de `app/css/app.css`:

```css
.notas-edit{background:var(--bg);border:1px solid var(--accent-soft3);border-radius:12px;padding:16px 18px;min-height:180px;outline:none}
.notas-edit:focus{border-color:var(--accent-soft2)}
.notas-tb{position:sticky;bottom:0;z-index:15;display:flex;justify-content:center;padding:10px 0 12px;background:linear-gradient(to top,var(--bg) 72%,transparent)}
.notas-tb .tb{display:flex;align-items:center;gap:3px;background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:5px;box-shadow:var(--shadow)}
.notas-tb .tb button{width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:transparent;border:none;border-radius:9px;color:var(--text);cursor:pointer}
.notas-tb .tb button:hover{background:var(--surface2-hover)}
.notas-tb .tb .sep{width:1px;height:24px;background:var(--border2);margin:0 5px;flex-shrink:0}
.notas-tb .tb .mais{display:none}
@media (max-width:700px){
  .notas-tb .tb .opt{display:none}
  .notas-tb .tb .mais{display:flex}
}
.notas-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:22px;z-index:70;display:flex;align-items:center;gap:12px;background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:11px 12px 11px 15px;box-shadow:var(--shadow)}
.notas-toast .msg{color:var(--muted);font-size:13px}
.notas-toast .div{width:1px;height:20px;background:var(--border2)}
.notas-toast button{background:none;border:none;color:var(--accent);font-size:13px;font-weight:600;font-family:inherit;cursor:pointer}
```

- [ ] **Step 3: Render do modo edição**

Em `play.js`, acima de `notasBlockHTML`:

```js
// Os treze controles SÃO a lista branca: a barra não pode oferecer o que o filtro
// apagaria — por isso não há cor, fonte, tamanho nem alinhamento. `opt` marca os
// cinco que somem abaixo de 700px (spec §9).
const TB = [
  [['bold', 'Bold', ''], ['italic', 'Italic', ''], ['underline', 'Underline', 'opt'], ['strikeThrough', 'Strike', 'opt']],
  [['mark', 'Mark', ''], ['formatBlock:h3', 'Heading', 'opt']],
  [['insertUnorderedList', 'Ul', ''], ['insertOrderedList', 'Ol', ''], ['formatBlock:blockquote', 'Quote', 'opt']],
  [['link', 'Link', 'opt'], ['formatBlock:pre', 'Mono', '']],
  [['undo', 'Undo', ''], ['redo', 'Redo', '']],
];

function barraHTML() {
  const grupos = TB.map((g) => g.map(([cmd, icone, cls]) =>
    `<button class="${cls}" data-cmd="${cmd}" title="${t('notas.tb.' + icone.toLowerCase())}">${I['tb' + icone]()}</button>`
  ).join('')).join('<span class="sep"></span>');
  return `<div class="notas-tb"><div class="tb">${grupos}<button class="mais" data-a="notasMais" title="${t('notas.tb.more')}">${I.dots(19)}</button></div></div>`;
}
```

E no começo de `notasBlockHTML`, o ramo de edição:

```js
  if (S.notasEdit) {
    return `<div class="blk notas" id="notas" data-nopan="1">
      <div class="blk-hd">
        <span class="ic" style="color:var(--accent);display:flex">${I.textLines(18)}</span>
        <div class="t">${t('notas.title')}</div>
        <span class="sp"></span>
        <span class="notas-saved" id="notas-saved">${I.check(13, 2.6)}${t('notas.saved')}</span>
        <button class="btn-ghost" style="height:38px;padding:0 13px;font-size:13px;margin-left:10px;color:var(--text)" data-a="closeNotas">${t('notas.done')}</button>
      </div>
      <div class="notas-edit notas-body" id="notas-edit" contenteditable="true">${limpaHTML(song.anotacoes || '')}</div>
      ${barraHTML()}
    </div>`;
  }
```

- [ ] **Step 4: Estado e ações**

Em `app/js/state.js`, acrescentar a `S`:

```js
  notasEdit: false,
```

Em `app/js/main.js`, nas ações:

```js
    case 'editNotas': S.notasEdit = true; update(); break;
    case 'closeNotas': salvaNotasPendente(); S.notasEdit = false; update(); break;
```

- [ ] **Step 5: Ligar o editor ao DOM**

Em `play.js`, e chamado no fim de `afterRenderPlay` quando `S.notasEdit`:

```js
// Grava na hora, sem esperar o debounce — é o que o "Pronto" chama. Lê o DOM em
// vez de um estado paralelo: enquanto o editor está aberto, o campo É a verdade.
// `saveSong` e `currentSong` já são importados por play.js.
export function salvaNotasPendente() {
  const campo = document.getElementById('notas-edit');
  const song = currentSong();
  if (!campo || !song) return;
  song.anotacoes = limpaHTML(campo.innerHTML);
  saveSong(song);
}

// Tudo aqui é DOM direto, sem update(): um re-render mataria o contenteditable e
// a posição do cursor junto.
function ligaEditor(song) {
  const campo = document.getElementById('notas-edit');
  if (!campo || campo.dataset.ligado) return;
  campo.dataset.ligado = '1';
  campo.focus();

  let timer = null;
  const salva = () => {
    clearTimeout(timer);
    timer = setTimeout(() => { song.anotacoes = limpaHTML(campo.innerHTML); saveSong(song); }, 600);
  };
  campo.addEventListener('input', salva);

  campo.addEventListener('paste', (e) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const puro = e.clipboardData.getData('text/plain');
    document.execCommand('insertHTML', false, html ? limpaHTML(html) : deTexto(puro));
    if (html) mostraToastColagem(campo, puro, salva);
    salva();
  });

  for (const b of document.querySelectorAll('.notas-tb [data-cmd]')) {
    // mousedown e não click: o click já teria tirado o foco do campo e perdido a
    // seleção, que é justamente o que os comandos operam.
    b.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const cmd = b.dataset.cmd;
      if (cmd === 'mark') {
        const sel = String(document.getSelection());
        // hiliteColor produziria <span style>, que o filtro apaga. <mark> é o que
        // a lista branca aceita.
        if (sel) document.execCommand('insertHTML', false, `<mark>${esc(sel)}</mark>`);
      } else if (cmd === 'link') {
        const url = prompt(t('notas.tb.linkPrompt'));
        if (url) document.execCommand('createLink', false, url);
      } else if (cmd.startsWith('formatBlock:')) {
        document.execCommand('formatBlock', false, cmd.slice(12));
      } else {
        document.execCommand(cmd);
      }
      campo.focus();
      salva();
    });
  }
}

// Vive FORA do app.innerHTML, criado e removido à mão: é o único jeito de um
// aviso sobreviver sem um re-render, que aqui é proibido.
function mostraToastColagem(campo, puro, salva) {
  document.querySelector('.notas-toast')?.remove();
  const el = document.createElement('div');
  el.className = 'notas-toast';
  el.innerHTML = `<span class="msg">${t('notas.paste.cleaned')}</span><span class="div"></span><button>${t('notas.paste.plain')}</button>`;
  el.querySelector('button').addEventListener('click', () => {
    document.execCommand('undo');
    document.execCommand('insertHTML', false, deTexto(puro));
    el.remove();
    salva();
  });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 8000);
}
```

- [ ] **Step 6: Chaves de i18n**

Nas duas tabelas: `notas.done`, `notas.saved`, `notas.tb.bold`, `.italic`,
`.underline`, `.strike`, `.mark`, `.heading`, `.ul`, `.ol`, `.quote`, `.link`,
`.mono`, `.undo`, `.redo`, `.more`, `.linkPrompt`, `notas.paste.cleaned`,
`notas.paste.plain`.

PT, na ordem: 'Pronto', 'Salvo', 'Negrito', 'Itálico', 'Sublinhado', 'Tachado',
'Marca-texto', 'Título', 'Lista', 'Lista numerada', 'Citação', 'Link',
'Alinhado', 'Desfazer', 'Refazer', 'Mais', 'Endereço do link:',
'Formatação simplificada', 'Colar sem formatação'.

EN, na ordem: 'Done', 'Saved', 'Bold', 'Italic', 'Underline', 'Strikethrough',
'Highlight', 'Heading', 'List', 'Numbered list', 'Quote', 'Link', 'Aligned',
'Undo', 'Redo', 'More', 'Link address:', 'Formatting simplified',
'Paste without formatting'.

- [ ] **Step 7: Verificar no navegador — é aqui que a tarefa se prova**

Run: `cd app && python3 -m http.server 8137`

1. "Escrever" abre o campo com foco; a barra aparece grudada embaixo.
2. Cada um dos treze botões faz o que promete, **sem** perder a seleção.
3. O bloco alinhado preserva `| Am  | F   |` em colunas.
4. Colar do Google Docs e de uma mensagem de WhatsApp: negrito e listas
   sobrevivem; cor e fonte não; o texto fica legível no tema escuro.
5. Colar uma imagem: **nada** é inserido.
6. "Colar sem formatação" no aviso troca o bloco colado por texto puro.
7. "Pronto" fecha, e o texto reaparece renderizado igual ao que estava sendo
   editado.
8. Recarregar a página: o texto continua lá.
9. Numa janela de 375px de largura, os cinco `opt` somem e o "mais" aparece.

- [ ] **Step 8: Sintaxe e suíte**

Run: `cd app && node --check js/render/play.js && node --check js/main.js && node --check js/icons.js && node --test`

- [ ] **Step 9: Commit**

```bash
git add app/css/app.css app/js/render/play.js app/js/main.js app/js/state.js app/js/icons.js app/js/i18n/pt.js app/js/i18n/en.js
git commit -m "feat(notes): add the rich text editor and paste sanitising"
```

---

### Task 5: Compartilhar com anotações

**Files:**
- Modify: `app/js/render/sharesheet.js`
- Modify: `app/js/main.js`
- Modify: `app/js/state.js`
- Modify: `app/test/sharesheet.test.js`
- Modify: `app/js/i18n/pt.js`, `app/js/i18n/en.js`

**Interfaces:**
- Consumes: `CAMPOS`/`PARTES_TODAS` da Task 2.
- Produces: `partesDaEscolha(opcaoId: string, incluirNotas: boolean): string[]`,
  exportada de `sharesheet.js` — é a função pura que os testes exercitam.

- [ ] **Step 1: Teste que falha**

Acrescentar a `app/test/sharesheet.test.js` (e ao import do topo,
`partesDaEscolha`):

```js
test('a caixa acrescenta anotacoes so onde ha cifra', () => {
  assert.deepEqual(partesDaEscolha('cifras', false), ['cifra']);
  assert.deepEqual(partesDaEscolha('cifras', true), ['cifra', 'anotacoes']);
  assert.deepEqual(partesDaEscolha('ambos', true), ['cifra', 'audio', 'anotacoes']);
  assert.deepEqual(partesDaEscolha('audio', true), ['audio']);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && node --test test/sharesheet.test.js`
Expected: FAIL — `partesDaEscolha is not a function`.

- [ ] **Step 3: Implementar**

Em `app/js/render/sharesheet.js`:

```js
// A caixa acrescenta uma parte à opção escolhida, em vez de a lista ganhar uma
// linha. A lista de presets cresce por MULTIPLICAÇÃO — uma linha "cifras +
// anotações" pediria em seguida "cifras + áudio + anotações", e com quatro partes
// seriam oito linhas. A caixa cresce por soma.
export function partesDaEscolha(opcaoId, incluirNotas) {
  const base = (OPCOES.find((o) => o.id === opcaoId) || OPCOES[0]).partes;
  return incluirNotas && base.includes('cifra') ? [...base, 'anotacoes'] : [...base];
}
```

Em `renderShareSheet`, a caixa aparece logo depois da linha da opção ativa,
quando **alguma** música selecionada tem anotação e a opção leva cifra:

```js
  const temAlguma = songs.some((s) => String(s.anotacoes || '').trim());
  const levaCifra = partesDaEscolha(sh.opcao, false).includes('cifra');
  const caixaNotas = (temAlguma && levaCifra) ? `
    <button class="check-row" data-a="toggleShareNotas" style="margin:2px 0 6px 40px;padding:8px 12px;background:var(--accent-tint);min-height:0">
      <span class="checkbox ${sh.incluirNotas ? 'on' : ''}" style="width:22px;height:22px;border-radius:7px">${sh.incluirNotas ? I.check(13) : ''}</span>
      <span class="nm" style="font-size:14px">${t('share.incluirNotas')}</span>
    </button>` : '';
```

`S.shareSheet` ganha `incluirNotas: false`; `main.js` ganha
`case 'toggleShareNotas': S.shareSheet.incluirNotas = !S.shareSheet.incluirNotas; update(); break;`;
e `doShare` passa a chamar `partesDaEscolha(sh.opcao, sh.incluirNotas)` no lugar
de ler `o.partes` direto.

- [ ] **Step 4: Rodar e ver passar**

Run: `cd app && node --test test/sharesheet.test.js`
Expected: PASS.

- [ ] **Step 5: i18n**

`'share.incluirNotas'` → PT: `'Incluir minhas anotações'`; EN: `'Include my notes'`.

- [ ] **Step 6: Verificar no navegador**

Exportar uma música com anotação, com e sem a caixa, e importar num perfil limpo
(janela anônima): com a caixa, a anotação chega; sem ela, não. Numa música sem
anotação, a caixa não aparece.

- [ ] **Step 7: Commit**

```bash
git add app/js/render/sharesheet.js app/js/main.js app/js/state.js app/test/sharesheet.test.js app/js/i18n/pt.js app/js/i18n/en.js
git commit -m "feat(notes): let a share carry the sender's notes"
```

---

### Task 6: Confirmar antes de substituir

**Files:**
- Modify: `app/js/backup.js`
- Modify: `app/js/main.js`
- Modify: `app/js/state.js`
- Modify: `app/test/merge.test.js`
- Modify: `app/js/i18n/pt.js`, `app/js/i18n/en.js`

**Interfaces:**
- Consumes: `normalizaPartes` da Task 2.
- Produces: `conflitosDeNotas(atuais: Song[], doArquivo: Song[], partes: string[]): string[]`
  — ids das músicas em que os dois lados têm anotação e elas diferem.

- [ ] **Step 1: Teste que falha**

Em `app/test/merge.test.js` (importando `conflitosDeNotas` de `../js/backup.js`):

```js
test('conflito so quando os dois lados tem anotacao e elas diferem', () => {
  const atuais = [
    { id: 'a', anotacoes: '<p>minha</p>' },
    { id: 'b', anotacoes: '<p>igual</p>' },
    { id: 'c' },
  ];
  const arq = [
    { id: 'a', anotacoes: '<p>do professor</p>' },
    { id: 'b', anotacoes: '<p>igual</p>' },
    { id: 'c', anotacoes: '<p>nova</p>' },
  ];
  assert.deepEqual(conflitosDeNotas(atuais, arq, ['cifra', 'anotacoes']), ['a']);
  assert.deepEqual(conflitosDeNotas(atuais, arq, ['cifra']), []);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && node --test test/merge.test.js`
Expected: FAIL — `conflitosDeNotas is not a function`.

- [ ] **Step 3: Implementar a detecção**

Em `app/js/backup.js`:

```js
// A anotação é o único campo que o merge sobrescreve e que foi digitado à mão.
// Sem anotação de um dos lados, ou com as duas iguais, não há o que perguntar.
export function conflitosDeNotas(atuais, doArquivo, partes) {
  if (!normalizaPartes(partes).includes('anotacoes')) return [];
  const mapa = new Map((atuais || []).map((s) => [s.id, s]));
  return (doArquivo || []).filter((f) => {
    const a = mapa.get(f.id);
    const minha = String((a && a.anotacoes) || '').trim();
    const dela = String(f.anotacoes || '').trim();
    return minha && dela && minha !== dela;
  }).map((f) => f.id);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd app && node --test test/merge.test.js`
Expected: PASS.

- [ ] **Step 5: Filtrar o que vem do arquivo**

Este é o segundo dos três pontos de chamada do filtro (spec §5), e o mais
importante: o `.somaplay` chegou por WhatsApp, de uma origem que o app não
controla, e o campo vai direto para um `innerHTML`.

Um lugar só resolve os dois modos de importação. Em `app/js/backup.js`, logo
depois de o manifesto ser lido e **antes** do `if (merge)` da linha ~202:

```js
  // Antes de qualquer gravação, e antes até da detecção de conflito: daqui para
  // baixo a anotação do arquivo já é confiável, nos dois modos.
  for (const s of manifest.songs || []) {
    if (s.anotacoes) s.anotacoes = limpaHTML(s.anotacoes);
  }
```

Acrescentar `limpaHTML` a um import de `./anotacoes.js` em `backup.js`.

- [ ] **Step 6: A confirmação**

`importFile` ganha uma decisão explícita em vez de adivinhar. Assinatura:
`importFile(file, { merge, decisaoNotas })`, onde `decisaoNotas` é
`'perguntar'` (padrão), `'manter'` ou `'substituir'`.

Em `backup.js`, depois do Step 5 e antes do `if (merge)`:

```js
  const conflitos = conflitosDeNotas(S.songs, manifest.songs, partes);
  if (conflitos.length && decisaoNotas === 'perguntar') {
    // Nada foi gravado ainda: devolver AQUI deixa o import inteiro pendente da
    // resposta, em vez de gravar metade e perguntar depois.
    return { pergunta: 'notas', conflitos: conflitos.length };
  }
  if (decisaoNotas === 'manter') partes = partes.filter((x) => x !== 'anotacoes');
```

Em `app/js/state.js`:

```js
  importNotas: null,   // { file, merge, conflitos } — o import parado esperando resposta
```

Em `renderPopover()`, no `main.js`, um ramo novo antes do retorno final:

```js
  if (S.importNotas) {
    return `<div class="scrim">
      <div class="popover" data-stop="1">
        <div class="head"><div class="title">${t('import.notas.title')}</div></div>
        <div style="padding:16px 22px;color:var(--muted);font-size:14px;line-height:1.65">${t('import.notas.body', { n: S.importNotas.conflitos })}</div>
        <div class="foot">
          <button class="btn-ghost lg" style="flex:1" data-a="importNotasManter">${t('import.notas.keep')}</button>
          <button class="btn-primary" style="flex:1" data-a="importNotasSubstituir">${t('import.notas.replace')}</button>
        </div>
      </div>
    </div>`;
  }
```

E as duas ações, que reexecutam o import guardado com a decisão tomada:

```js
    case 'importNotasManter': retomaImport('manter'); break;
    case 'importNotasSubstituir': retomaImport('substituir'); break;
```

```js
async function retomaImport(decisaoNotas) {
  const pend = S.importNotas;
  S.importNotas = null;
  if (!pend) return;
  await importFile(pend.file, { merge: pend.merge, decisaoNotas });
  update();
}
```

Quem chama `importFile` hoje passa a testar `r.pergunta === 'notas'` e, nesse
caso, guardar `S.importNotas = { file, merge, conflitos: r.conflitos }` e
chamar `update()`, em vez de mostrar o resultado.

No fluxo de importação, antes de gravar: se `conflitosDeNotas(...)` não estiver
vazio, guardar o import pendente em `S.importNotas = { plano, ids }` e renderizar
um `.popover` de 420px com título `t('import.notas.title')`, corpo
`t('import.notas.body', { n: ids.length })` e dois botões — **"Manter as minhas"**
(tira `'anotacoes'` das partes e segue) e **"Substituir"** (segue como está).
Cifra e áudio entram nos dois caminhos: a pergunta é só sobre a anotação.

- [ ] **Step 7: i18n**

PT:

```js
  'import.notas.title': 'Substituir suas anotações?',
  'import.notas.body': 'O arquivo traz anotações para {n} música(s) em que você já escreveu. As cifras e o áudio entram de qualquer jeito.',
  'import.notas.keep': 'Manter as minhas',
  'import.notas.replace': 'Substituir',
```

EN:

```js
  'import.notas.title': 'Replace your notes?',
  'import.notas.body': 'The file carries notes for {n} song(s) where you have already written. Charts and audio come in either way.',
  'import.notas.keep': 'Keep mine',
  'import.notas.replace': 'Replace',
```

- [ ] **Step 8: Verificar no navegador**

Exportar uma música com anotação, mudar a anotação no aparelho, reimportar: a
pergunta aparece. "Manter as minhas" preserva; "Substituir" troca. Importar só a
cifra: nenhuma pergunta.

- [ ] **Step 9: Commit**

```bash
git add app/js/backup.js app/js/main.js app/js/state.js app/test/merge.test.js app/js/i18n/pt.js app/js/i18n/en.js
git commit -m "feat(notes): ask before an import overwrites written notes"
```

---

### Task 7: Versão 0.16.0

**Files:**
- Modify: `app/js/version.js`
- Modify: `app/sw.js` (linha 2)
- Modify: `CHANGELOG.md`

Qualquer mudança sob `app/` obriga o bump: sem chave de cache nova, o cliente
instalado continua sendo servido do cache antigo para sempre.

- [ ] **Step 1: Subir os dois literais**

`app/js/version.js`: `export const VERSION = '0.16.0';`
`app/sw.js`, linha 2: `const VERSION = 'somaplay-0.16.0';`

- [ ] **Step 2: CHANGELOG**

Entrada `## 0.16.0` cobrindo: a seção de anotações por música, o editor de texto
rico com lista branca, a parte `anotacoes` no arquivo compartilhado, e a
compatibilidade preservada dos backups anteriores.

- [ ] **Step 3: Verificação final**

Run: `cd app && node --test`
Expected: PASS. `version.test.js` confirma os dois literais em sincronia e a
entrada no CHANGELOG.

No navegador, com o app já instalado: recarregar, conferir que Ajustes mostra
**0.16.0** e que o app abre offline (DevTools → Network → Offline).

- [ ] **Step 4: Commit**

```bash
git add app/js/version.js app/sw.js CHANGELOG.md
git commit -m "chore(release): 0.16.0 — song annotations"
```
