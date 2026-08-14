# Filtro de fontes em pílulas — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o dropdown de fonte única por uma faixa de pílulas sempre visível na
linha das abas, com multisseleção, contagens reativas e persistência entre sessões.

**Architecture:** A camada pura (casamento, regra de clique, poda, contagem) entra em
`js/state.js` ao lado do que já existe de fonte, e é onde ficam todos os testes
automáticos. A faixa vira um módulo próprio, `js/render/fontestrip.js`, com HTML de um
lado e comportamento imperativo do outro — o mesmo molde do `js/render/listdrag.js`.
`matchesLens` não muda de forma, então as cinco telas que já filtram pela lente herdam o
comportamento novo sem uma linha de código cada.

**Tech Stack:** ES modules servidos como estão. Sem build, sem dependências, sem
gerenciador de pacotes. Testes com `node --test` (Node ≥ 20). CSS num arquivo só,
`app/css/app.css`.

**Spec:** `docs/superpowers/specs/2026-08-14-filtro-fontes-pilulas-design.md`

## Global Constraints

- **Rodar os testes:** `cd app && node --test`. Sintaxe de um módulo: `cd app && node --check js/<arquivo>.js`.
- **Servidor manual:** `cd app && python3 -m http.server 8137` → http://localhost:8137. `file://` não funciona (Service Worker, OPFS, ES modules).
- **Todo módulo novo em `app/js/` PRECISA entrar no array `SHELL` de `app/sw.js`**, ou o app quebra offline. `app/test/shell.test.js` reprova se faltar.
- **Mexeu no `SHELL` → suba `VERSION` na linha 2 de `app/sw.js`.** Hoje: `somaplay-v38`. Este plano deixa em `somaplay-v39`.
- **Chave de tradução nova entra nas DUAS tabelas** (`app/js/i18n/pt.js` e `app/js/i18n/en.js`), senão `app/test/i18n.test.js` reprova por paridade.
- **`t()` não escapa parâmetro.** Nome de fonte é conteúdo do usuário: `esc()` antes de passar para `t()`.
- **Nunca traduzir um valor de `data-*`.** `data-id` carrega a grafia salva da fonte; só o rótulo visível passa por `t()`.
- **Cores de fonte são fixas nos dois temas; todo o resto do cromo usa token** (`var(--surface2)`, `var(--border)`, `var(--text)`, `var(--muted)`, `var(--deep)`, `var(--muted2)`). Única exceção: a tinta `#0E0E11` do texto da pílula ativa, cravada de propósito (Task 3, Step 9).
- **Comentários e docs em português**, como o resto de `app/js/`; commits em português, no padrão `tipo(escopo): assunto`.
- **Não tocar** em `fonteCasa`, `songIdsDasFontes`, `fontesDaBiblioteca`, `DB_NAME`, no formato do registro salvo nem no `.somaplay`. Nenhuma migração de dados.

---

### Task 1: Camada pura em `state.js`

Só adiciona funções. Nada passa a chamá-las ainda, e o app continua funcionando
exatamente como antes desta task.

**Files:**
- Modify: `app/js/state.js` (junto do bloco de fonte, depois de `fonteCasa`/`matchesFonte`, ~linha 160)
- Test: `app/test/fontes.test.js`

**Interfaces:**
- Consumes: `fonteCasa`, `fonteOf`, `fontesDaBiblioteca`, `SEM_FONTE`, `modesOf`, `artistName` — todos já existem em `app/js/state.js`.
- Produces:
  - `fonteCasaAlguma(fonteDaMusica: string, filtros: string[]) → boolean`
  - `toggleFonte(atual: string[], nome: string, daBiblioteca: {nome,n}[]) → string[]`
  - `podaFontes(salvas: string[], daBiblioteca: {nome,n}[]) → string[]`
  - `contagensPorFonte(songs, opts?) → { itens: {nome:string,n:number}[], total:number }`
    com `opts = { query?: string, modeFilter?: string[], nomeDoArtista?: (song)=>string }`

- [ ] **Step 1: Escrever os testes que falham**

No topo de `app/test/fontes.test.js`, o `import` (linhas 8-11) ganha os quatro nomes novos:

```js
import {
  fontesSugeridas, FONTES_FIXAS,
  fontesDaBiblioteca, fonteCasa, fonteOf, SEM_FONTE, songIdsDasFontes,
  fonteCasaAlguma, toggleFonte, podaFontes, contagensPorFonte,
} from '../js/state.js';
```

E no fim do arquivo:

```js
// ---------- multisseleção: casamento com um conjunto de fontes ----------

test('array de filtros vazio passa qualquer música', () => {
  assert.equal(fonteCasaAlguma('VJ', []), true);
  assert.equal(fonteCasaAlguma('', []), true);
  assert.equal(fonteCasaAlguma('VJ', undefined), true);
});

test('duas fontes marcadas passam as duas e barram a terceira', () => {
  const f = ['CifraClub', 'VJ'];
  assert.equal(fonteCasaAlguma('CifraClub', f), true);
  assert.equal(fonteCasaAlguma('VJ', f), true);
  assert.equal(fonteCasaAlguma('Songbook', f), false);
});

test('grafia divergente casa dentro do conjunto', () => {
  assert.equal(fonteCasaAlguma('songbook ', ['Songbook']), true);
});

test('SEM_FONTE dentro do conjunto pega só as músicas sem fonte', () => {
  assert.equal(fonteCasaAlguma('', [SEM_FONTE]), true);
  assert.equal(fonteCasaAlguma('VJ', [SEM_FONTE]), false);
  assert.equal(fonteCasaAlguma('VJ', [SEM_FONTE, 'VJ']), true);
});

// ---------- a regra de clique ----------

const bib = (...nomes) => nomes.map((nome) => ({ nome, n: 1 }));

test('primeiro clique a partir de Todas isola a fonte', () => {
  assert.deepEqual(toggleFonte([], 'CifraClub', bib('CifraClub', 'VJ', 'RV')), ['CifraClub']);
});

test('clique seguinte soma a fonte ao conjunto', () => {
  assert.deepEqual(toggleFonte(['CifraClub'], 'VJ', bib('CifraClub', 'VJ', 'RV')), ['CifraClub', 'VJ']);
});

test('clicar numa fonte marcada remove ela', () => {
  assert.deepEqual(toggleFonte(['CifraClub', 'VJ'], 'VJ', bib('CifraClub', 'VJ', 'RV')), ['CifraClub']);
});

test('tirar a última fonte volta para Todas', () => {
  assert.deepEqual(toggleFonte(['VJ'], 'VJ', bib('CifraClub', 'VJ', 'RV')), []);
});

test('marcar todas as fontes da biblioteca colapsa para Todas', () => {
  assert.deepEqual(toggleFonte(['CifraClub', 'VJ'], 'RV', bib('CifraClub', 'VJ', 'RV')), []);
});

test('a regra de clique compara por grafia, e guarda a grafia recebida', () => {
  assert.deepEqual(toggleFonte(['Songbook'], 'songbook ', bib('Songbook', 'VJ')), []);
  assert.deepEqual(toggleFonte([], 'songbook ', bib('Songbook', 'VJ')), ['songbook ']);
});

// ---------- poda no boot ----------

test('grafia órfã cai fora da seleção salva', () => {
  assert.deepEqual(podaFontes(['VJ', 'Fonte Apagada'], bib('VJ', 'RV')), ['VJ']);
});

test('grafia divergente se corrige para a da biblioteca', () => {
  assert.deepEqual(podaFontes(['songbook '], bib('Songbook')), ['Songbook']);
});

test('seleção inteiramente órfã volta para Todas', () => {
  assert.deepEqual(podaFontes(['Fonte Apagada'], bib('VJ')), []);
});

test('seleção vazia continua vazia, e a poda não inventa fonte', () => {
  assert.deepEqual(podaFontes([], bib('VJ', 'RV')), []);
  assert.deepEqual(podaFontes(undefined, bib('VJ')), []);
});

test('a poda não duplica quando duas grafias salvas apontam para a mesma fonte', () => {
  assert.deepEqual(podaFontes(['VJ', 'vj'], bib('VJ')), ['VJ']);
});

// ---------- contagens das pílulas ----------

const m = (title, fonte, extra = {}) => ({ title, fonte, artistId: 'a1', ...extra });
const nomeFixo = () => 'Gil';

test('sem busca nem modo, a contagem é a da biblioteca', () => {
  const songs = [m('Aquele Abraço', 'VJ'), m('Domingo', 'VJ'), m('Drão', 'RV')];
  const { itens, total } = contagensPorFonte(songs, { nomeDoArtista: nomeFixo });
  assert.deepEqual(itens, [{ nome: 'VJ', n: 2 }, { nome: 'RV', n: 1 }]);
  assert.equal(total, 3);
});

test('a busca reduz as contagens mas não o conjunto de pílulas', () => {
  const songs = [m('Aquele Abraço', 'VJ'), m('Domingo', 'VJ'), m('Drão', 'RV')];
  const { itens, total } = contagensPorFonte(songs, { query: 'dr', nomeDoArtista: nomeFixo });
  assert.deepEqual(itens, [{ nome: 'VJ', n: 0 }, { nome: 'RV', n: 1 }]);
  assert.equal(total, 1);
});

test('a busca também casa pelo nome do artista', () => {
  const songs = [m('Drão', 'RV')];
  const { total } = contagensPorFonte(songs, { query: 'gil', nomeDoArtista: nomeFixo });
  assert.equal(total, 1);
});

test('a lente de modos reduz as contagens', () => {
  const songs = [
    m('Aquele Abraço', 'VJ', { stems: [{ id: 's1' }] }),
    m('Domingo', 'VJ'),
  ];
  const { itens, total } = contagensPorFonte(songs, { modeFilter: ['T2'], nomeDoArtista: nomeFixo });
  assert.deepEqual(itens, [{ nome: 'VJ', n: 1 }]);
  assert.equal(total, 1);
});

test('SEM_FONTE entra por último, com a contagem das músicas sem fonte', () => {
  const songs = [m('Drão', 'RV'), m('Palco', ''), m('Refazenda', '  ')];
  const { itens, total } = contagensPorFonte(songs, { nomeDoArtista: nomeFixo });
  assert.deepEqual(itens, [{ nome: SEM_FONTE, n: 2 }, { nome: 'RV', n: 1 }]);
  assert.equal(total, 3);
});

test('o total é sempre a soma dos itens', () => {
  const songs = [m('a', 'VJ'), m('b', 'RV'), m('c', ''), m('d', 'VJ')];
  const { itens, total } = contagensPorFonte(songs, { nomeDoArtista: nomeFixo });
  assert.equal(itens.reduce((acc, i) => acc + i.n, 0), total);
});

test('grafias divergentes da mesma fonte somam na mesma pílula', () => {
  const songs = [m('a', 'Songbook'), m('b', 'songbook'), m('c', 'SONGBOOK ')];
  const { itens } = contagensPorFonte(songs, { nomeDoArtista: nomeFixo });
  assert.deepEqual(itens, [{ nome: 'Songbook', n: 3 }]);
});
```

Duas coisas para não estranhar na leitura: `nomeDoArtista` é injetado porque `artistName`
lê `S.artists`, e um teste puro não pode depender do estado global; e `SEM_FONTE` aparece
antes de `RV` no penúltimo caso porque `fontesDaBiblioteca` ordena por contagem (2 antes
de 1) e só empurra o balde para o fim quando empata.

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && node --test test/fontes.test.js`
Expected: FAIL — `SyntaxError: The requested module '../js/state.js' does not provide an
export named 'fonteCasaAlguma'`.

- [ ] **Step 3: Implementar**

Em `app/js/state.js`, logo depois de `matchesFonte` (~linha 160), antes de
`songIdsDasFontes`:

```js
// A grafia normalizada — a mesma regra de fonteCasa e de fontesSugeridas, isolada
// porque agora quatro funções dependem dela.
const chaveFonte = (nome) => String(nome || '').trim().toLowerCase();

// A versão de conjunto do fonteCasa. Deliberadamente uma função nova, e não um
// parâmetro a mais no fonteCasa: aquele serve o export filtrado e o apagar em
// lote, que passam UMA fonte e têm testes próprios contando com isso.
// Conjunto vazio = todas as fontes, e é isso que faz uma fonte importada amanhã
// entrar no resultado sem ninguém ir marcá-la.
export function fonteCasaAlguma(fonteDaMusica, filtros) {
  if (!filtros || !filtros.length) return true;
  return filtros.some((f) => fonteCasa(fonteDaMusica, f));
}

// A regra de clique da faixa de pílulas, pura para poder ser testada sem DOM.
// O primeiro clique a partir de "todas" ISOLA a fonte — é o gesto mais comum, e
// era o comportamento inteiro do filtro antigo. Daí em diante soma e remove.
// Dois caminhos voltam para "todas" (o array vazio): tirar a última marcada, e
// marcar todas as fontes que existem. O segundo importa porque "estas seis"
// envelheceria a cada import, e o array vazio não.
export function toggleFonte(atual, nome, daBiblioteca) {
  const marcadas = atual || [];
  const k = chaveFonte(nome);
  if (!marcadas.length) return [nome];
  const jaTem = marcadas.some((f) => chaveFonte(f) === k);
  const prox = jaTem ? marcadas.filter((f) => chaveFonte(f) !== k) : [...marcadas, nome];
  if (!prox.length) return [];
  const todas = (daBiblioteca || []).map((f) => chaveFonte(f.nome));
  const agora = new Set(prox.map(chaveFonte));
  if (todas.length && todas.every((f) => agora.has(f))) return [];
  return prox;
}

// A seleção salva guarda GRAFIAS, e a biblioteca muda debaixo dela — a fonte pode
// ter sido apagada em lote, ou o backup restaurado pode não trazê-la. Sem a poda,
// o app abriria numa biblioteca vazia sem pílula nenhuma explicando o porquê.
// Devolve as grafias DA BIBLIOTECA, não as salvas: assim uma fonte que mudou de
// grafia entre um import e outro se auto-corrige em vez de sumir.
export function podaFontes(salvas, daBiblioteca) {
  const porChave = new Map((daBiblioteca || []).map((f) => [chaveFonte(f.nome), f.nome]));
  const out = [];
  for (const s of salvas || []) {
    const nome = porChave.get(chaveFonte(s));
    if (nome && !out.includes(nome)) out.push(nome);
  }
  return out;
}

// Quantas músicas cada pílula representa. Três decisões moram aqui:
//
//   1. conta MÚSICAS mesmo na aba Artistas, onde os cards contam artistas — a
//      pílula tem que querer dizer a mesma coisa em toda aba;
//   2. aplica busca e lente de modos, mas NUNCA o próprio filtro de fonte: se
//      aplicasse, toda pílula não marcada mostraria zero;
//   3. o conjunto e a ordem saem de fontesDaBiblioteca(songs) — biblioteca
//      inteira, sem busca. Só o número reage ao que se digita, e é por isso que
//      dá para atualizar a faixa escrevendo só os contadores.
//
// nomeDoArtista é injetável porque artistName() lê S.artists, e o teste não pode.
export function contagensPorFonte(songs, opts = {}) {
  const { query = '', modeFilter = [], nomeDoArtista = artistName } = opts;
  const q = query.trim().toLowerCase();
  const conta = new Map();
  let total = 0;
  for (const s of songs || []) {
    if (q && !(s.title || '').toLowerCase().includes(q)
          && !nomeDoArtista(s).toLowerCase().includes(q)) continue;
    if (modeFilter.length) {
      const modos = modesOf(s);
      if (!modeFilter.every((f) => modos.includes(f))) continue;
    }
    total++;
    const k = fonteOf(s) ? chaveFonte(fonteOf(s)) : SEM_FONTE;
    conta.set(k, (conta.get(k) || 0) + 1);
  }
  const itens = fontesDaBiblioteca(songs)
    .map(({ nome }) => ({ nome, n: conta.get(chaveFonte(nome)) || 0 }));
  return { itens, total };
}
```

`chaveFonte(SEM_FONTE)` devolve o próprio `'__sem_fonte'` (já é minúsculo e sem espaço),
então o balde e as fontes de verdade compartilham o mesmo `Map` sem caso especial.

- [ ] **Step 4: Rodar e ver passar**

Run: `cd app && node --test`
Expected: PASS em tudo — inclusive os testes antigos de `fontes.test.js`, `export.test.js`
e `merge.test.js`, que continuam exercitando `fonteCasa` com uma fonte só.

- [ ] **Step 5: Commit**

```bash
git add app/js/state.js app/test/fontes.test.js
git commit -m "feat(fontes): camada pura da multisseleção (casamento, clique, poda, contagem)"
```

---

### Task 2: Módulo `fontestrip.js` com a paleta

O módulo nasce com a cor e o HTML. Ninguém importa ele ainda; o app continua igual.
Ele entra no `SHELL` nesta task porque `shell.test.js` varre `js/**` e reprova qualquer
módulo de fora — o teste passa a cobrar assim que o arquivo existe.

**Files:**
- Create: `app/js/render/fontestrip.js`
- Modify: `app/sw.js:2` (VERSION) e o array `SHELL`
- Test: `app/test/fontestrip.test.js` (novo)

**Interfaces:**
- Consumes: `S`, `SEM_FONTE`, `contagensPorFonte` de `../state.js`; `I`, `esc` de `../icons.js`; `t` de `../i18n.js`.
- Produces:
  - `corDaFonte(nome: string) → string` (hex)
  - `fonteStripHTML(desligada?: boolean) → string`

- [ ] **Step 1: Escrever o teste que falha**

Criar `app/test/fontestrip.test.js`:

```js
// fontestrip.test.js — a paleta da faixa de fontes.
//
// Nome de fonte é texto livre: o usuário digita o que quiser. Então a cor tem
// que sair do NOME, e não da posição na lista — por posição, a cor de uma fonte
// mudaria quando outra ganhasse músicas, e seria diferente em cada aparelho.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { corDaFonte } from '../js/render/fontestrip.js';
import { SEM_FONTE } from '../js/state.js';

test('as fontes do mapa fixo têm a cor cravada', () => {
  assert.equal(corDaFonte('VJ'), '#34D399');
  assert.equal(corDaFonte('RV'), '#F4B860');
  assert.equal(corDaFonte('CifraClub'), '#E8A23D');
  assert.equal(corDaFonte('RN'), '#60A5FA');
  assert.equal(corDaFonte('Songbook'), '#2DD4BF');
  assert.equal(corDaFonte(SEM_FONTE), '#9A9AA5');
});

test('grafia divergente dá a mesma cor', () => {
  assert.equal(corDaFonte('cifraclub'), corDaFonte('CifraClub'));
  assert.equal(corDaFonte(' songbook '), corDaFonte('Songbook'));
});

test('fonte desconhecida cai na paleta, sempre na mesma cor', () => {
  const c = corDaFonte('Real Book');
  assert.match(c, /^#[0-9A-F]{6}$/i);
  assert.equal(corDaFonte('Real Book'), c);
  assert.equal(corDaFonte('real book'), c);
});

// Um nome de fonte não pode alcançar o Object.prototype. Com um objeto literal,
// corDaFonte('constructor') devolveria a função Object — e a pílula sairia com
// style="--fc:function Object()...". Por isso o mapa é um Map.
test('nome que colide com o Object.prototype cai na paleta como qualquer outro', () => {
  for (const nome of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
    assert.match(corDaFonte(nome), /^#[0-9A-F]{6}$/i, `${nome} não devolveu uma cor`);
  }
});

test('nome vazio ou ausente devolve uma cor válida em vez de quebrar', () => {
  assert.match(corDaFonte(''), /^#[0-9A-F]{6}$/i);
  assert.match(corDaFonte(undefined), /^#[0-9A-F]{6}$/i);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && node --test test/fontestrip.test.js`
Expected: FAIL — `Cannot find module .../js/render/fontestrip.js`.

- [ ] **Step 3: Criar o módulo**

Criar `app/js/render/fontestrip.js`:

```js
// render/fontestrip.js — a faixa de pílulas do filtro de fonte.
//
// HTML de um lado, comportamento imperativo do outro, no mesmo molde do
// listdrag.js: fonteStripHTML() é chamada pelo render da Home, e
// wireFonteStrip() pelo afterRender() do main.js.
import { S, SEM_FONTE, contagensPorFonte } from '../state.js';
import { I, esc } from '../icons.js';
import { t } from '../i18n.js';

// Um Map, e não um objeto literal: a chave vem de um nome de fonte que o usuário
// digitou, e num objeto 'constructor' ou 'toString' devolveriam algo do
// Object.prototype em vez de undefined.
const CORES = new Map([
  ['vj', '#34D399'],
  ['rv', '#F4B860'],
  ['cifraclub', '#E8A23D'],
  ['rn', '#60A5FA'],
  ['songbook', '#2DD4BF'],
  [SEM_FONTE, '#9A9AA5'],
]);

// Para as fontes que o usuário cadastrar depois. Mesma família visual das fixas.
const PALETA = ['#A78BFA', '#F472B6', '#60A5FA', '#34D399', '#F4B860', '#2DD4BF', '#FB923C', '#C084FC'];

// A cor sai do nome, por hash determinístico — nunca da posição na lista, que
// mudaria quando outra fonte ganhasse músicas e seria diferente em cada
// aparelho. Duas fontes podem colidir na mesma cor: o nome e a contagem seguem
// sendo os identificadores, e a cor nunca é o único indicador.
export function corDaFonte(nome) {
  const k = String(nome || '').trim().toLowerCase();
  const fixa = CORES.get(k);
  if (fixa) return fixa;
  let h = 0;
  for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0;
  return PALETA[h % PALETA.length];
}

// A faixa inteira. `desligada` é a aba Listas, onde a lente não vale (§7 do PRD):
// a faixa aparece apagada e inerte, exatamente como a .lens já faz hoje.
export function fonteStripHTML(desligada = false) {
  const { itens, total } = contagensPorFonte(S.songs, { query: S.query, modeFilter: S.modeFilter });
  const marcadas = S.fonteFilter;
  const todas = !marcadas.length;
  const estaMarcada = (nome) => marcadas.some((f) => f.trim().toLowerCase() === nome.trim().toLowerCase());

  const pilulas = itens.map(({ nome, n }) => {
    const ativa = estaMarcada(nome);
    // O sentinela é traduzido só no que se vê; o data-id leva a grafia salva.
    const rotulo = nome === SEM_FONTE ? t('home.fonte.none') : nome;
    const p = { fonte: esc(rotulo), n };
    const dica = ativa ? t('home.fonte.tipRemove', p)
      : todas ? t('home.fonte.tipOnly', p)
      : t('home.fonte.tipInclude', p);
    return `<button class="fpill${n ? '' : ' zero'}" data-a="toggleFonte" data-id="${esc(nome)}" aria-pressed="${ativa}" style="--fc:${corDaFonte(nome)}" title="${dica}"><span class="dot"></span><span class="nm">${esc(rotulo)}</span><em>${n}</em></button>`;
  }).join('');

  return `<div class="fonte-strip ${desligada ? 'off' : ''}" id="fonte-strip" role="group" aria-label="${t('home.fonte.hint')}">
    <span class="tagico">${I.tag(15)}</span>
    <div class="fonte-scroll" data-hscroll>
      <button class="fpill todas" data-a="clearFonte" aria-pressed="${todas}" title="${t('home.fonte.tipAll', { n: total })}"><span class="nm">${t('home.fonte.all')}</span><em>${total}</em></button>
      <span class="sep"></span>
      ${pilulas}
    </div>
    <button class="fscroll-next" data-a="fonteScrollNext" title="${t('home.fonte.next')}">${I.chevR(18)}</button>
  </div>`;
}
```

As chaves de tradução usadas aqui entram na Task 3, Step 4. Até lá `t()` devolve a própria
chave em vez de quebrar — e o módulo ainda não é chamado por ninguém.

- [ ] **Step 4: Registrar no `SHELL` e subir a versão**

Em `app/sw.js`, linha 2: `const VERSION = 'somaplay-v38';` → `const VERSION = 'somaplay-v39';`

E no array `SHELL`, junto das outras entradas de `./js/render/`:

```js
  './js/render/fontestrip.js',
```

- [ ] **Step 5: Rodar tudo e ver passar**

Run: `cd app && node --test`
Expected: PASS. Em particular `fontestrip.test.js` e os quatro testes de `shell.test.js` —
"todo módulo JS do app está registrado no SHELL" é o que cobra o passo anterior.

Run: `cd app && node --check js/render/fontestrip.js`
Expected: sem saída.

- [ ] **Step 6: Commit**

```bash
git add app/js/render/fontestrip.js app/test/fontestrip.test.js app/sw.js
git commit -m "feat(fontes): módulo fontestrip com a paleta por fonte e o HTML da faixa"
```

---

### Task 3: A troca — faixa no lugar do dropdown

A task grande, e atômica de propósito: `S.fonteFilter` muda de forma, e qualquer corte
menor deixaria o app quebrado entre dois commits. Ao fim dela a faixa está na tela, filtra
ao clique e sobrevive a um reload. O overflow e as contagens durante a digitação são a
Task 4.

**Files:**
- Modify: `app/js/state.js` (o `S`, `matchesFonte`, `lensAtiva`, `S.settings`, `initState`)
- Modify: `app/js/render/home.js` (remove `fonteControl`, ajusta `filtroAtivoLabel` e a `.tabrow`)
- Modify: `app/js/main.js` (ações, poda pós-import, remoções do menu)
- Modify: `app/js/i18n/pt.js` e `app/js/i18n/en.js`
- Modify: `app/css/app.css`
- Test: `app/test/i18n.test.js` (sem código novo — a paridade já cobra)

**Interfaces:**
- Consumes: `fonteCasaAlguma`, `toggleFonte`, `podaFontes` (Task 1) e `fonteStripHTML(desligada)` (Task 2).
- Produces: `S.fonteFilter: string[]` (era `string | null`) e `S.settings.fonteFilter: string[]`. `S.fonteMenuOpen` deixa de existir.

- [ ] **Step 1: Virar a forma do estado em `state.js`**

No objeto `S` (~linha 16):

```js
  fonteFilter: [],         // lente por fonte: grafias marcadas; [] = todas
```

Apagar a linha seguinte, `fonteMenuOpen: false,`.

Em `S.settings` (~linha 76), depois de `cifraMiniaturas`:

```js
    fonteFilter: [],               // persiste entre sessões; podado no boot
```

- [ ] **Step 2: Ligar o casamento novo**

Em `app/js/state.js`, trocar `matchesFonte` e `lensAtiva`:

```js
export function matchesFonte(s) { return fonteCasaAlguma(fonteOf(s), S.fonteFilter); }
```

```js
export function lensAtiva() { return S.modeFilter.length > 0 || S.fonteFilter.length > 0; }
```

`matchesLens` **não muda** — e é por isso que os cards de artista, a aba Músicas, os cards
de estilo, a tela do artista e a tela do estilo herdam a multisseleção sem edição.

O comentário acima do bloco de fonte que hoje diz "a grafia exibida | SEM_FONTE | null"
passa a descrever o conjunto.

- [ ] **Step 3: Podar no boot**

Em `initState()`, **depois** do merge de `S.settings` (a linha `if (st) { delete st.key; ... }`)
e antes de `setLang(S.settings.lang)`:

```js
  // A seleção salva guarda grafias, e a biblioteca pode ter mudado desde a última
  // sessão — uma fonte apagada em lote, um backup restaurado sem ela. Sem a poda o
  // app abriria numa biblioteca vazia sem nenhuma pílula explicando o porquê.
  S.fonteFilter = podaFontes(S.settings.fonteFilter, fontesDaBiblioteca(S.songs));
  S.settings.fonteFilter = S.fonteFilter;
```

O `saveSettings()` que já existe logo abaixo grava o resultado. A ordem importa: a poda
precisa das músicas (carregadas no topo da função) **e** das configurações (carregadas
logo acima dela).

- [ ] **Step 4: As chaves de tradução, nas duas tabelas**

Em `app/js/i18n/pt.js`, no bloco `home.fonte.*` (~linha 71): trocar o valor de
`home.fonte.all`, apagar `home.fonte.clear`, acrescentar as cinco novas.

```js
  'home.fonte.hint': 'Filtrar por fonte',
  'home.fonte.all': 'Todas',
  'home.fonte.none': 'Sem fonte',
  'home.fonte.tipAll': 'Todas as fontes · {n} músicas',
  'home.fonte.tipOnly': '{fonte} · {n} músicas · clique para ver somente esta',
  'home.fonte.tipInclude': '{fonte} · {n} músicas · clique para incluir',
  'home.fonte.tipRemove': '{fonte} · {n} músicas · clique para remover',
  'home.fonte.next': 'Ver mais fontes',
```

Em `app/js/i18n/en.js`, no mesmo lugar:

```js
  'home.fonte.hint': 'Filter by source',
  'home.fonte.all': 'All',
  'home.fonte.none': 'No source',
  'home.fonte.tipAll': 'All sources · {n} songs',
  'home.fonte.tipOnly': '{fonte} · {n} songs · click to see only this',
  'home.fonte.tipInclude': '{fonte} · {n} songs · click to include',
  'home.fonte.tipRemove': '{fonte} · {n} songs · click to remove',
  'home.fonte.next': 'See more sources',
```

- [ ] **Step 5: Rodar os testes de tradução**

Run: `cd app && node --test test/i18n.test.js`
Expected: PASS. Se falhar por paridade, uma chave entrou numa tabela só.

- [ ] **Step 6: Trocar o controle em `home.js`**

Apagar a função `fonteControl()` inteira (do comentário "O controle de fonte é um camaleão"
até o `}` que a fecha, ~linhas 138-167).

Trocar `filtroAtivoLabel()` (~linha 10):

```js
// O que está recortando a biblioteca agora, em texto puro. Quem imprime no HTML
// escapa: o nome da fonte é conteúdo do usuário e t() não escapa parâmetro.
function filtroAtivoLabel() {
  const partes = S.modeFilter.slice();
  for (const f of S.fonteFilter) partes.push(f === SEM_FONTE ? t('home.fonte.none') : f);
  return partes.join(' · ');
}
```

No `import` do topo, tirar `fontesDaBiblioteca` (não é mais usada aqui) e acrescentar:

```js
import { fonteStripHTML } from './fontestrip.js';
```

Na `.tabrow` do `renderHome()`, pôr a faixa entre o `.tabsub` e a `.lens`:

```js
    <div class="tabrow">
      <div class="segtab">
        <button class="${S.tab === 'artists' ? 'on' : ''}" data-a="setTab" data-id="artists">${I.grid()}${t('home.tabs.artists')}</button>
        <button class="${S.tab === 'songs' ? 'on' : ''}" data-a="setTab" data-id="songs">${I.music()}${t('home.tabs.songs')}</button>
        <button class="${S.tab === 'estilos' ? 'on' : ''}" data-a="setTab" data-id="estilos">${I.disc(18)}${t('home.tabs.styles')}</button>
        <button class="${S.tab === 'lists' ? 'on' : ''}" data-a="setTab" data-id="lists">${I.listIcon()}${t('home.tabs.lists')}</button>
      </div>
      <div class="tabsub">${tabsub}</div>
      ${fonteStripHTML(isL)}
      <div class="lens ${isL ? 'off' : ''}" title="${isL ? t('home.lens.disabledHint') : t('home.lens.filterHint')}">
        ${I.funnel()}${chips}
      </div>
    </div>
```

O funil deixa de rotular o grupo todo e passa a rotular só os chips T2/T3, que é o que
sobra na `.lens`; a etiqueta na frente da faixa faz esse papel do outro lado da linha.

- [ ] **Step 7: As ações em `main.js`**

No `import` de `./state.js` do topo (~linha 6), acrescentar a função pura com apelido — o
apelido evita confundi-la com a ação de mesmo nome — e a poda:

```js
  toggleFonte as calcToggleFonte, podaFontes,
```

Junto das outras variáveis de módulo do topo (perto de `let pendingHandleIdx`):

```js
let pendingFonte = null;
```

Trocar as três ações de fonte (~linhas 235-237) por estas duas:

```js
  // setFonte (mais abaixo) já é dos atalhos do formulário — esta é a da lente.
  // pendingFonte devolve o foco à pílula depois do re-render: update() reescreve
  // o app inteiro, e sem isso a navegação por teclado morre no primeiro clique.
  toggleFonte(d) {
    S.fonteFilter = calcToggleFonte(S.fonteFilter, d.id, fontesDaBiblioteca(S.songs));
    S.settings.fonteFilter = S.fonteFilter;
    saveSettings();
    pendingFonte = d.id;
    update();
  },
  clearFonte() {
    S.fonteFilter = [];
    S.settings.fonteFilter = [];
    saveSettings();
    update();
  },
```

Nas ações `goHome` (~linha 211) e `setTab` (~linha 225), apagar `S.fonteMenuOpen = false;`.

Apagar a linha do clique-fora (~linha 758):

```js
  if (S.fonteMenuOpen && !e.target.closest('.fonte-wrap')) { S.fonteMenuOpen = false; update(); }
```

Tirar `fonteMenuOpen` das duas linhas do `Esc` (~linhas 810-811), que passam a ser:

```js
    else if (S.imgMenuOpen || S.sortMenuOpen || S.listMenuOpen) {
      S.imgMenuOpen = S.sortMenuOpen = S.listMenuOpen = false;
```

E, no trecho que trata o import de backup, junto do `S.exportFontes = null;` (~linha 726),
acrescentar a poda — a biblioteca acabou de trocar debaixo de uma seleção que guarda
grafias, que é exatamente o motivo daquela linha existir:

```js
      S.fonteFilter = podaFontes(S.fonteFilter, fontesDaBiblioteca(S.songs));
      S.settings.fonteFilter = S.fonteFilter;
      saveSettings();
```

- [ ] **Step 8: Verificar a sintaxe**

Run: `cd app && node --check js/main.js && node --check js/state.js && node --check js/render/home.js`
Expected: sem saída.

Run: `cd app && node --test`
Expected: PASS. Nenhum teste toca no DOM, mas `state.js` é importado por vários — um erro
de sintaxe ou um nome que sobrou apareceria aqui.

- [ ] **Step 9: O CSS das pílulas**

Em `app/css/app.css`, **apagar** as regras do controle antigo (linhas ~120-137):
`.fonte-wrap`, `.chip.fonte`, `.fonte-pill` e suas quatro filhas, o comentário de âncora do
menu e `.fonte-menu` com suas quatro regras. Apagar também `.fonte-menu{left:0;right:auto}`
do bloco `@media (max-width:900px)`.

No lugar, logo depois das regras `.chip.t3`:

```css
/* --- Faixa de fontes: o filtro sempre visível, na própria linha das abas --- */
.fonte-strip{display:flex;align-items:center;gap:8px;flex:1 1 auto;min-width:0}
.fonte-strip.off{opacity:.32;pointer-events:none}
.fonte-strip .tagico{display:flex;color:var(--muted);flex-shrink:0}
.fonte-scroll{display:flex;align-items:center;gap:6px;min-width:0;overflow-x:auto;scrollbar-width:none;scroll-behavior:smooth}
.fonte-scroll::-webkit-scrollbar{display:none}
.fonte-scroll .sep{width:1px;height:22px;margin:0 2px;background:var(--border);flex-shrink:0}
.fpill{display:flex;align-items:center;gap:7px;height:36px;padding:0 13px;border-radius:999px;flex-shrink:0;cursor:pointer;
  background:var(--surface2);border:1px solid var(--border);color:var(--text);transition:background .12s,color .12s}
.fpill .dot{width:7px;height:7px;border-radius:999px;background:var(--fc);flex-shrink:0}
.fpill .nm{font-family:var(--f-body);font-weight:500;font-size:13px;white-space:nowrap}
.fpill em{font-family:var(--f-mono);font-style:normal;font-size:11px;color:var(--muted)}
.fpill.todas{--fc:var(--accent)}
/* Tinta escura CRAVADA, e não var(--bg): o fundo da pílula ativa é a cor da fonte
   — saturada e clara nos dois temas — e o que contrasta com ela é tinta escura.
   No tema claro, var(--bg) daria bege sobre verde. É a única cor da faixa que
   não passa por token, e é de propósito. */
.fpill[aria-pressed="true"]{background:var(--fc);border-color:var(--fc);color:#0E0E11}
.fpill[aria-pressed="true"] .nm{font-weight:700}
.fpill[aria-pressed="true"] .dot{background:rgba(14,14,17,.5)}
.fpill[aria-pressed="true"] em{color:rgba(14,14,17,.6)}
/* Zero resultados fica apagada, mas continua clicável: "o VJ não tem nada que
   case com o que você digitou" é informação, e a pílula sumindo é a ausência dela. */
.fpill.zero{background:var(--deep);border-color:var(--border);color:var(--muted2)}
.fpill.zero .dot{background:var(--muted2);opacity:.55}
.fscroll-next{display:none;width:30px;height:30px;border-radius:999px;flex-shrink:0;align-items:center;justify-content:center;
  background:var(--surface2);border:1px solid var(--border);color:var(--muted);cursor:pointer}
@media (pointer:coarse){.fpill{height:44px}.fscroll-next{width:44px;height:44px}}
```

As regras de overflow (`.ov`, a máscara de fade e o `display:flex` da seta) entram na
Task 4, junto do código que liga a classe.

- [ ] **Step 10: Verificar no navegador**

Run: `cd app && python3 -m http.server 8137` → http://localhost:8137 (recarregar com
Ctrl+Shift+R; o Service Worker é cache-first).

Conferir:
- A faixa aparece na linha das abas, com `Todas` ativa em âmbar e uma pílula por fonte, cada uma com ponto colorido e contagem.
- **A altura do cabeçalho não cresceu** — é a restrição dura do pedido.
- Primeiro clique numa fonte isola; o segundo clique noutra soma; clicar de novo remove; tirar a última volta pra `Todas`; marcar todas colapsa pra `Todas`.
- Aba Artistas esconde quem não tem música na fonte e o card conta só as que passaram; aba Músicas recorta e o resumo cita as fontes; Estilos idem; entrar num artista mantém o recorte.
- Aba Listas: a faixa apagada e sem resposta ao clique; abrir uma lista mostra todas as músicas dela.
- Recarregar a página: a seleção volta.
- Alternar PT/EN em Configurações: `Todas` e os `title` traduzem; o nome da fonte não.
- Tema claro: a faixa não vira uma ilha escura e a pílula ativa tem contraste.

- [ ] **Step 11: Commit**

```bash
git add app/js/state.js app/js/main.js app/js/render/home.js app/js/i18n/pt.js app/js/i18n/en.js app/css/app.css
git commit -m "feat(fontes): faixa de pílulas multisseleção no lugar do dropdown"
```

---

### Task 4: A camada imperativa — rolagem, foco e contagens vivas

Três defeitos que só aparecem com a faixa na tela, e que o protótipo não podia prever. Um
revisor pode aceitar a Task 3 e rejeitar esta.

**Files:**
- Modify: `app/js/render/fontestrip.js` (acrescenta `wireFonteStrip` e `refreshFonteCounts`)
- Modify: `app/js/main.js` (`captureUI`, `restoreUI`, `afterRender`, `updateHomeResults`, ação `fonteScrollNext`)
- Modify: `app/css/app.css` (as regras de `.ov`)

**Interfaces:**
- Consumes: o marcador `[data-hscroll]` e as classes `.fpill`/`.fonte-scroll` do HTML da Task 2; `contagensPorFonte` e `S`, já importados no topo do módulo na Task 2; a variável `pendingFonte` declarada na Task 3, Step 7.
- Produces: `wireFonteStrip() → void` e `refreshFonteCounts() → void`, exportados de `js/render/fontestrip.js`; `captureUI`/`restoreUI` passam a carregar `snap.hscrolls: number[]`.

- [ ] **Step 1: O comportamento no módulo**

Acrescentar ao fim de `app/js/render/fontestrip.js`:

```js
// O ResizeObserver guardado em módulo: update() troca o nó da faixa a cada
// render, e um observer novo por render, apontando para nós já descartados,
// vazaria memória num app que fica aberto o ensaio inteiro.
let ro = null;

// Há conteúdo à direita fora da vista? É isso que acende o fade e a seta. Some
// ao chegar no fim: nada mais à direita, nada a anunciar.
function medirOverflow(strip) {
  const sc = strip.querySelector('.fonte-scroll');
  if (!sc) return;
  const max = sc.scrollWidth - sc.clientWidth;
  strip.classList.toggle('ov', max > 1 && sc.scrollLeft < max - 1);
}

export function wireFonteStrip() {
  const strip = document.getElementById('fonte-strip');
  ro?.disconnect();
  ro = null;
  if (!strip) return;
  const sc = strip.querySelector('.fonte-scroll');
  if (!sc) return;

  // Roda do mouse rola a faixa na horizontal, sem exigir shift. O
  // preventDefault() só sai enquanto há para onde rolar NAQUELE sentido: nas
  // pontas o evento passa adiante e a página volta a rolar, que é o que o dedo
  // e a roda esperam.
  sc.addEventListener('wheel', (e) => {
    const d = e.deltaY || e.deltaX;
    if (!d) return;
    const max = sc.scrollWidth - sc.clientWidth;
    if (max <= 0) return;
    if (d < 0 && sc.scrollLeft <= 0) return;
    if (d > 0 && sc.scrollLeft >= max - 1) return;
    e.preventDefault();
    sc.scrollLeft += d;
  }, { passive: false });

  sc.addEventListener('scroll', () => medirOverflow(strip));
  // ResizeObserver, e não o resize da janela: a .tabrow reflui sozinha quando o
  // .tabsub some ou a faixa desce de linha, sem a janela mudar de tamanho.
  ro = new ResizeObserver(() => medirOverflow(strip));
  ro.observe(sc);
  medirOverflow(strip);
}

// Só os números e a classe .zero — nada de estrutura. É o que permite atualizar
// a faixa a cada tecla digitada sem zerar o scrollLeft nem religar os listeners,
// e só é possível porque o conjunto de pílulas vem da biblioteca, não da busca.
export function refreshFonteCounts() {
  const strip = document.getElementById('fonte-strip');
  if (!strip) return;
  const { itens, total } = contagensPorFonte(S.songs, { query: S.query, modeFilter: S.modeFilter });
  const porNome = new Map(itens.map((i) => [i.nome, i.n]));
  strip.querySelectorAll('.fpill').forEach((el) => {
    const todas = el.classList.contains('todas');
    const n = todas ? total : porNome.get(el.dataset.id);
    if (n == null) return;
    el.querySelector('em').textContent = n;
    if (!todas) el.classList.toggle('zero', n === 0);
  });
  medirOverflow(strip);
}
```

- [ ] **Step 2: `scrollLeft` sobrevive ao re-render**

Em `app/js/main.js`, `captureUI` (~linha 46) e `restoreUI` (~linha 56) ganham uma linha
cada:

```js
function captureUI(same) {
  if (!same) return null;
  const scrolls = [...document.querySelectorAll('.content-scroll,[data-autoscroll]')].map((el) => el.scrollTop);
  // A faixa de fontes rola na horizontal, e update() reescreve o app inteiro:
  // sem isto, clicar numa pílula joga a faixa de volta ao começo e as fontes do
  // fim viram inalcançáveis na prática.
  const hscrolls = [...document.querySelectorAll('[data-hscroll]')].map((el) => el.scrollLeft);
  const a = document.activeElement;
  const focus = a && a.id && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && a.type === 'text'))
    ? { id: a.id, start: a.selectionStart, end: a.selectionEnd }
    : null;
  return { scrolls, hscrolls, focus };
}
```

```js
function restoreUI(snap) {
  if (!snap) return;
  const els = document.querySelectorAll('.content-scroll,[data-autoscroll]');
  els.forEach((el, i) => { if (snap.scrolls[i] != null) el.scrollTop = snap.scrolls[i]; });
  const hels = document.querySelectorAll('[data-hscroll]');
  hels.forEach((el, i) => { if (snap.hscrolls[i] != null) el.scrollLeft = snap.hscrolls[i]; });
  if (!snap.focus) return;
  const el = document.getElementById(snap.focus.id);
  if (!el) return;
  el.focus();
  try { el.setSelectionRange(snap.focus.start, snap.focus.end); } catch (e) { /* tipo sem seleção */ }
}
```

- [ ] **Step 3: Ligar a faixa e devolver o foco no `afterRender`**

No topo de `main.js`:

```js
import { wireFonteStrip, refreshFonteCounts } from './render/fontestrip.js';
```

Em `afterRender()` (~linha 92), junto do bloco do `pendingHandleIdx`:

```js
  wireFonteStrip();

  // Depois do re-render o foco cai no <body>. Varredura, e nunca uma string de
  // seletor: nome de fonte é texto livre, e uma aspa ou colchete quebraria o
  // querySelector. preventScroll porque o foco arrastaria a faixa e desfaria o
  // scrollLeft que o restoreUI acabou de devolver.
  if (pendingFonte != null) {
    const alvo = [...document.querySelectorAll('.fpill')].find((el) => el.dataset.id === pendingFonte);
    alvo?.focus({ preventScroll: true });
    pendingFonte = null;
  }
```

- [ ] **Step 4: Contagens vivas durante a digitação**

`updateHomeResults()` (~linha 86) troca só o `#home-results` — a `.tabrow` não é tocada, e
sem esta linha as contagens congelam na primeira letra digitada:

```js
function updateHomeResults() {
  const el = document.getElementById('home-results');
  if (el) { el.innerHTML = homeResults(); refreshFonteCounts(); }
  else update();
}
```

- [ ] **Step 5: A ação da seta**

Em `main.js`, junto de `clearFonte`. Não chama `update()`: é DOM puro, e o listener de
`scroll` do módulo recalcula o `.ov` sozinho.

```js
  fonteScrollNext() {
    const sc = document.querySelector('#fonte-strip .fonte-scroll');
    if (sc) sc.scrollBy({ left: Math.round(sc.clientWidth * 0.7), behavior: 'smooth' });
  },
```

- [ ] **Step 6: O CSS do overflow**

Em `app/css/app.css`, logo depois de `.fscroll-next`:

```css
/* Duas afordâncias quando há fonte fora da vista: o fade na borda direita e a
   seta. Ambas presas à mesma classe, que o medirOverflow() liga e desliga. */
.fonte-strip.ov .fonte-scroll{-webkit-mask-image:linear-gradient(90deg,#000 0,#000 calc(100% - 34px),transparent);mask-image:linear-gradient(90deg,#000 0,#000 calc(100% - 34px),transparent)}
.fonte-strip.ov .fscroll-next{display:flex}
```

- [ ] **Step 7: Verificar no navegador**

Run: `cd app && node --check js/main.js && node --check js/render/fontestrip.js && node --test`
Expected: sem saída do `--check`; PASS no `--test`.

Depois, em http://localhost:8137 (Ctrl+Shift+R):
- Digitar na busca: **as contagens mudam e as pílulas ficam paradas**; a que zera fica apagada e continua clicável.
- Ligar T2: as contagens caem de acordo, e continuam refletindo a busca junto.
- Estreitar a janela até a faixa cortar: o fade aparece na direita e a seta também; a seta avança ~70% e o fade some ao chegar no fim.
- Rolar a faixa até o meio e clicar numa pílula: **a faixa continua onde estava**.
- Depois de clicar numa pílula, apertar `Tab`: o foco sai da pílula clicada, não do começo da página.
- Roda do mouse sobre a faixa rola ela; nas pontas, a página volta a rolar.

- [ ] **Step 8: Commit**

```bash
git add app/js/render/fontestrip.js app/js/main.js app/css/app.css
git commit -m "feat(fontes): overflow, foco e contagens vivas da faixa"
```

---

### Task 5: Responsivo e limpeza

**Files:**
- Modify: `app/css/app.css` (os `@media`)

**Interfaces:**
- Consumes: as classes `.fonte-strip` e `.fpill` das Tasks 3 e 4.
- Produces: nada que outra task consuma.

- [ ] **Step 1: Os dois breakpoints novos**

Em `app/css/app.css`, **acima** do bloco `@media (max-width:900px)` existente — a ordem
importa, a cascata deixa o bloco mais estreito sobrescrever o mais largo:

```css
/* O subtítulo "N artistas na biblioteca" some cedo: é o que libera espaço para a
   faixa antes de ela precisar descer de linha. */
@media (max-width:1280px){ .tabsub{display:none} }
/* Abaixo daqui a faixa desce para uma segunda linha da própria .tabrow, em vez
   de espremer as abas. A .lens fica na primeira linha, onde já cabe sem o .tabsub. */
@media (max-width:1180px){
  .tabrow{flex-wrap:wrap}
  .fonte-strip{flex-basis:100%;order:5}
}
```

- [ ] **Step 2: Acertar o bloco de 900px**

No `@media (max-width:900px)` existente: apagar `.tabsub{display:none}` (redundante, o
bloco de 1280px já resolve) e acrescentar a ordem da `.lens`, para que a faixa venha antes
dos chips de modo quando as três coisas viram três linhas:

```css
  .lens{margin-left:0;flex:1 1 100%;justify-content:flex-start;order:6}
```

Conferir também que `.fonte-menu{left:0;right:auto}` já saiu daqui na Task 3, Step 9.

- [ ] **Step 3: Verificar nas três larguras**

Em http://localhost:8137, com o DevTools aberto e a janela redimensionada:
- **1280px:** o `.tabsub` some; a faixa continua na mesma linha das abas.
- **1180px:** a faixa desce para a segunda linha; as abas não são espremidas; a `.lens` fica na primeira linha.
- **900px e abaixo:** as abas ocupam a linha inteira, a faixa vem em seguida, os chips de modo por último.
- Em emulação de toque (ponteiro grosso): as pílulas têm 44px de altura e dá para acertar uma com o dedo; a faixa rola por arrasto.
- Em nenhuma largura o cabeçalho cresce a ponto de comer a lista.

- [ ] **Step 4: Rodar tudo uma última vez**

Run: `cd app && node --test`
Expected: PASS.

Run: `cd app && grep -rn "fonteMenuOpen\|fonte-wrap\|fonte-menu\|setFonteFilter\|fonteControl\|home.fonte.clear" js css`
Expected: nenhuma saída. É a varredura que confirma que o dropdown antigo saiu inteiro.

- [ ] **Step 5: Commit**

```bash
git add app/css/app.css
git commit -m "feat(fontes): quebra da faixa em telas estreitas e alvos de toque"
```

---

## Verificação final

Antes de considerar o trabalho pronto, o roteiro manual do spec na íntegra (seção
*Verificação*). Os pontos que nenhum teste automático alcança e que decidem se isto
funcionou:

- Estado inicial numa biblioteca real: `Todas` ativa, nenhuma música escondida.
- Apagar em lote a fonte que está selecionada e recarregar: volta para `Todas`, biblioteca inteira à vista. É a poda do boot fazendo o trabalho dela.
- Importar um backup com uma fonte nova: ela aparece na faixa, e o filtro em `Todas` já a inclui sem nenhum clique.
- Com dez fontes cadastradas: nada cortado sem afordância — fade, seta, roda e toque.
