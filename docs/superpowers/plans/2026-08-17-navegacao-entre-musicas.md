# Navegação entre músicas dentro da música — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dentro de uma música, andar para as irmãs do mesmo contexto — por uma gaveta sobreposta com a lista, e por setas anterior/próxima na camada de controles flutuantes.

**Architecture:** `S.backTo` (só o tipo da origem) vira `S.navCtx` (tipo **e** id). A lista de irmãs é **derivada** desse contexto por `songsDoContexto()` em `state.js`, que passa a ser a definição única de "quais músicas, nesta ordem" — as telas Home e Lista passam a beber dela. A gaveta **sobrepõe** a cifra em vez de empurrá-la, porque a cifra em texto se re-diagrama pela largura da caixa.

**Tech Stack:** ES modules puros, sem build e sem dependências. Testes com `node --test` (Node ≥ 20). CSS em arquivo único. PWA com Service Worker de precache.

**Spec:** [`docs/superpowers/specs/2026-08-17-navegacao-entre-musicas-design.md`](../specs/2026-08-17-navegacao-entre-musicas-design.md)

## Global Constraints

- **Comentários em português** neste projeto: todos os arquivos tocados aqui já são comentados em português, e um módulo que troca de língua no meio é pior que qualquer das duas escolhas. **Mensagens de commit em inglês.**
- **Todo módulo novo em `app/js/` entra no array `SHELL` de `app/sw.js`**, senão o app quebra offline. `app/test/shell.test.js` pega.
- **Chave de tradução entra nas DUAS tabelas** (`app/js/i18n/pt.js` e `app/js/i18n/en.js`). `app/test/i18n.test.js` falha se faltar em uma.
- **Nunca colocar valor de `data-*` atrás de `t()`.** Só o rótulo visível é traduzido.
- **Strings traduzidas são produzidas em tempo de render**, nunca em constante de módulo.
- **Versão:** `0.14.3` → **`0.15.0`** (MINOR: capacidade nova). Dois literais em sincronia — `export const VERSION = '0.15.0'` em `app/js/version.js` e `const VERSION = 'somaplay-0.15.0'` na linha 2 de `app/sw.js`. `app/test/version.test.js` pega.
- **Nenhum campo novo na música.** Nada a acrescentar em `CAMPOS` (`app/js/partes.js`); o `.somaplay`, o export e o merge não mudam.
- **Rodar a suíte inteira** (`cd app && node --test`) antes de cada commit, não só o teste do momento.
- **`localeCompare(..., 'pt')`** em toda ordenação por nome, como o resto do código já faz.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `app/js/state.js` *(modificar)* | `navCtx`/`navOpen` no `S`; `listaAberta`, `songsDaBusca`, `songsDoContexto`, `posicaoNoContexto`. A verdade sobre **quais músicas, nesta ordem**. |
| `app/js/render/songnav.js` *(criar)* | A gaveta e as setas. Só desenha e traduz; não decide quais músicas. |
| `app/js/render/play.js` *(modificar)* | Botão da gaveta, injeção da gaveta e das setas, `CTL_SEL`, linha de posição no cabeçalho. |
| `app/js/render/home.js` *(modificar)* | `songsTab` passa a chamar `songsDaBusca()`. |
| `app/js/render/listscreen.js` *(modificar)* | Passa a chamar `listaAberta()`. |
| `app/js/main.js` *(modificar)* | `goBack` lê `navCtx.kind`; ações novas; teardown na troca; `Esc` fecha a gaveta. |
| `app/css/app.css` *(modificar)* | `.songnav`, `.songnav-scrim`, `.songnav-arrow`. |
| `app/js/i18n/pt.js`, `app/js/i18n/en.js` *(modificar)* | Chaves `play.nav.*`. |
| `app/test/navctx.test.js` *(criar)* | Testes da derivação e da posição. |
| `app/js/version.js`, `app/sw.js`, `CHANGELOG.md` *(modificar)* | Bump e registro. |

---

### Task 1: A derivação do contexto (lógica pura, testada)

**Files:**
- Modify: `app/js/state.js` (adicionar depois de `favList()`, ~linha 603, antes de `// ---------- tela de toque ----------`)
- Test: `app/test/navctx.test.js` (criar)

**Interfaces:**
- Consumes: `songsOfArtist`, `songsOfEstilo`, `musicasPresentes`, `songById`, `listById`, `favList`, `matchesLens`, `artistName` — todas já exportadas de `state.js`.
- Produces:
  - `listaAberta(id) → lista | null`
  - `songsDaBusca() → [song]`
  - `songsDoContexto(ctx = S.navCtx) → [song]`
  - `posicaoNoContexto(songs = songsDoContexto()) → { i, n }` — `i` é índice 0-based, `-1` quando a música atual não está no contexto.

- [ ] **Step 1: Escrever o teste que falha**

Criar `app/test/navctx.test.js`:

```js
// navctx.test.js — a lista de irmãs derivada do contexto de navegação.
//
// O que este teste protege: que a gaveta mostre EXATAMENTE o que a tela de
// origem mostrou. Cada caso aqui corresponde a uma tela — artista, estilo,
// lista, busca — e as diferenças entre elas são de propósito: a lista ignora a
// lente porque Listas são globais (PRD §7), e o id órfão fica de fora porque a
// numeração da gaveta precisa bater com a da tela da lista.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  S, listaAberta, songsDaBusca, songsDoContexto, posicaoNoContexto,
} from '../js/state.js';

// Biblioteca mínima do teste. songById/artistName leem S, então a "biblioteca"
// mora ali — mesmo padrão de listorder.test.js.
function biblioteca() {
  S.artists = [{ id: 'a1', name: 'Djavan' }, { id: 'a2', name: 'Caetano' }];
  S.songs = [
    { id: 's1', artistId: 'a1', title: 'Oceano', estilo: 'MPB', createdAt: 10 },
    { id: 's2', artistId: 'a1', title: 'Flor de Lis', estilo: 'MPB', createdAt: 30, stems: [{ id: 'x' }] },
    { id: 's3', artistId: 'a1', title: 'Sina', estilo: 'Samba', createdAt: 20 },
    // Título no fim do alfabeto e artista no começo, de propósito: assim a
    // ordenação por título e a por artista dão resultados DIFERENTES, e um teste
    // não passa por acidente confirmando a outra.
    { id: 's4', artistId: 'a2', title: 'Zabelê', estilo: 'MPB', createdAt: 40 },
  ];
  S.lists = [{ id: 'l1', nome: 'Show', musicas: ['s3', 'sX', 's1'] }];
  S.query = '';
  S.sort = 'title';
  S.modeFilter = [];
  S.fonteFilter = [];
  S.currentSongId = null;
  S.navCtx = null;
}

const ids = (songs) => songs.map((s) => s.id);

test('artista: em ordem alfabética', () => {
  biblioteca();
  assert.deepEqual(ids(songsDoContexto({ kind: 'artist', id: 'a1' })), ['s2', 's1', 's3']);
});

test('artista: a lente de modo corta a lista', () => {
  biblioteca();
  S.modeFilter = ['T2'];   // só quem tem acompanhamento
  assert.deepEqual(ids(songsDoContexto({ kind: 'artist', id: 'a1' })), ['s2']);
});

test('estilo: junta artistas diferentes, em ordem alfabética', () => {
  biblioteca();
  assert.deepEqual(ids(songsDoContexto({ kind: 'estilo', id: 'MPB' })), ['s2', 's1', 's4']);
});

test('lista: ordem do show, e o id órfão fica de fora', () => {
  biblioteca();
  // 'sX' não existe na biblioteca: viaja num export por fonte e se cura quando
  // a outra fonte for importada. Até lá a gaveta não pode prometê-lo.
  assert.deepEqual(ids(songsDoContexto({ kind: 'list', id: 'l1' })), ['s3', 's1']);
});

test('lista: a lente NÃO se aplica — Listas são globais', () => {
  biblioteca();
  S.modeFilter = ['T2'];
  assert.deepEqual(ids(songsDoContexto({ kind: 'list', id: 'l1' })), ['s3', 's1']);
});

test('lista: Favoritas é virtual e mesmo assim resolve', () => {
  biblioteca();
  S.songs[0].favorita = true;
  S.songs[2].favorita = true;
  assert.equal(listaAberta('__fav').id, '__fav');
  assert.deepEqual(ids(songsDoContexto({ kind: 'list', id: '__fav' })), ['s1', 's3']);
});

test('lista: id inexistente devolve lista vazia, sem estourar', () => {
  biblioteca();
  assert.deepEqual(songsDoContexto({ kind: 'list', id: 'nao-existe' }), []);
});

test('busca: ordenação por título', () => {
  biblioteca();
  assert.deepEqual(ids(songsDaBusca()), ['s2', 's1', 's3', 's4']);
});

test('busca: ordenação por artista, desempatando por título', () => {
  biblioteca();
  S.sort = 'artist';
  // Caetano antes de Djavan; dentro de Djavan, por título.
  assert.deepEqual(ids(songsDaBusca()), ['s4', 's2', 's1', 's3']);
});

test('busca: ordenação por recente', () => {
  biblioteca();
  S.sort = 'recent';
  assert.deepEqual(ids(songsDaBusca()), ['s4', 's2', 's3', 's1']);
});

test('busca: o termo filtra por título e por artista', () => {
  biblioteca();
  S.query = 'caetano';
  assert.deepEqual(ids(songsDaBusca()), ['s4']);
  S.query = 'sina';
  assert.deepEqual(ids(songsDaBusca()), ['s3']);
});

test('contexto home usa a busca', () => {
  biblioteca();
  S.query = 'oce';
  assert.deepEqual(ids(songsDoContexto({ kind: 'home', id: null })), ['s1']);
});

test('sem contexto: lista vazia', () => {
  biblioteca();
  assert.deepEqual(songsDoContexto(null), []);
});

test('posição: primeira, meio, última', () => {
  biblioteca();
  const ctx = { kind: 'artist', id: 'a1' };   // s2, s1, s3
  S.currentSongId = 's2';
  assert.deepEqual(posicaoNoContexto(songsDoContexto(ctx)), { i: 0, n: 3 });
  S.currentSongId = 's1';
  assert.deepEqual(posicaoNoContexto(songsDoContexto(ctx)), { i: 1, n: 3 });
  S.currentSongId = 's3';
  assert.deepEqual(posicaoNoContexto(songsDoContexto(ctx)), { i: 2, n: 3 });
});

test('posição: música ausente do contexto devolve i = -1', () => {
  biblioteca();
  // O caso real: desfavoritar a música de dentro dela tira a atual do contexto
  // Favoritas sob os próprios pés. Ninguém pode travar por causa disso.
  S.songs[0].favorita = true;
  S.currentSongId = 's3';
  assert.deepEqual(posicaoNoContexto(songsDoContexto({ kind: 'list', id: '__fav' })), { i: -1, n: 1 });
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd app && node --test test/navctx.test.js`
Expected: FAIL — `SyntaxError: The requested module '../js/state.js' does not provide an export named 'listaAberta'`

- [ ] **Step 3: Implementar em `state.js`**

Inserir depois de `favList()` (que hoje termina na linha 603) e **antes** do comentário `// ---------- tela de toque ----------`:

```js
// ---------- contexto de navegação (spec 2026-08-17) ----------
// De onde a música foi aberta: o TIPO e QUAL. `S.backTo` guardava só o tipo, que
// bastava para o botão voltar; a gaveta e as setas precisam saber quais são as
// irmãs. Uma variável só para as duas coisas porque duas verdades sobre "de onde
// você veio" é como as duas passam a discordar.

// "Favoritas" não está em S.lists — favList() a monta na hora a partir do campo
// `favorita` das músicas. Uma única porta para resolver um id de lista; a tela da
// lista (render/listscreen.js) bebe daqui pelo mesmo motivo.
export function listaAberta(id) {
  return id === '__fav' ? favList() : listById(id);
}

// A ordenação da aba Músicas. Morava dentro do render (render/home.js): a gaveta
// precisa da MESMA ordem que a tela mostrou, e a regra escrita duas vezes é a
// regra que vai divergir.
export function songsDaBusca() {
  const q = S.query.trim().toLowerCase();
  const flat = S.songs.filter((s) =>
    (!q || s.title.toLowerCase().includes(q) || artistName(s).toLowerCase().includes(q)) && matchesLens(s));
  if (S.sort === 'title') flat.sort((a, b) => a.title.localeCompare(b.title, 'pt'));
  else if (S.sort === 'artist') flat.sort((a, b) => artistName(a).localeCompare(artistName(b), 'pt') || a.title.localeCompare(b.title, 'pt'));
  else flat.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return flat;
}

// As irmãs da música atual, na ordem em que a tela de origem as mostrou.
export function songsDoContexto(ctx = S.navCtx) {
  if (!ctx) return [];
  if (ctx.kind === 'artist') return songsOfArtist(ctx.id).filter(matchesLens);
  if (ctx.kind === 'estilo') return songsOfEstilo(ctx.id).filter(matchesLens);
  if (ctx.kind === 'list') {
    // Sem `matchesLens`: Listas são globais e ignoram a lente (PRD §7) — a gaveta
    // mostra o show inteiro mesmo com a lente ligada. E `musicasPresentes` é o que
    // deixa o id órfão de fora, que é o que faz a numeração daqui bater com a da
    // tela da lista.
    const l = listaAberta(ctx.id);
    return l ? musicasPresentes(l).map(songById) : [];
  }
  return songsDaBusca();
}

// Onde a atual está no contexto. `i === -1` quando ela não está mais lá — não é
// hipotético: desfavoritar a música de dentro dela a tira do contexto Favoritas.
export function posicaoNoContexto(songs = songsDoContexto()) {
  return { i: songs.findIndex((s) => s.id === S.currentSongId), n: songs.length };
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd app && node --test test/navctx.test.js`
Expected: PASS, 15 testes.

Depois a suíte inteira: `cd app && node --test`
Expected: PASS (nada mais foi tocado ainda).

- [ ] **Step 5: Commit**

```bash
git add app/js/state.js app/test/navctx.test.js
git commit -m "feat(nav): derive the sibling songs of a navigation context

One definition of which songs and in which order, so the drawer can show
exactly what the origin screen showed. Lists skip the lens on purpose and
orphan ids stay out, which is what keeps the numbering in agreement."
```

---

### Task 2: `navCtx` substitui `backTo`

**Files:**
- Modify: `app/js/state.js:14` (o campo no `S`), `app/js/state.js:606-630` (`openSong`)
- Modify: `app/js/main.js:279-286` (`goBack`), `app/js/main.js:473` (`duplicateInKey`)

**Interfaces:**
- Consumes: nada de tarefas anteriores.
- Produces: `S.navCtx = { kind, id }` e `S.navOpen: boolean`, lidos pelas Tasks 4–7. `S.backTo` deixa de existir.

- [ ] **Step 1: Trocar o campo no `S`**

Em `app/js/state.js`, na declaração do `S`, substituir a linha 14:

```js
  backTo: 'home',          // de onde a tela play foi aberta
```

por:

```js
  // De onde a tela play foi aberta — o tipo E qual. Só na sessão: um contexto
  // que sobrevive ao fechar o app é uma promessa que a biblioteca pode não
  // conseguir cumprir na volta. Spec 2026-08-17.
  navCtx: null,            // { kind: 'artist'|'estilo'|'list'|'home', id } | null
  navOpen: false,          // a gaveta de navegação está aberta?
```

- [ ] **Step 2: `openSong` captura o id**

Em `app/js/state.js`, dentro de `openSong`, substituir:

```js
  S.backTo = from || 'home';
```

por:

```js
  // O `kind` vem do chamador (os data-from que já existem nas telas); o `id` vem
  // do estado da tela que estava aberta. Nenhum chamador precisou mudar.
  const kind = from || 'home';
  const idDoContexto = kind === 'artist' ? S.artistId
    : kind === 'estilo' ? S.estiloId
      : kind === 'list' ? S.openListId : null;
  S.navCtx = { kind, id: idDoContexto };
  S.navOpen = false;
```

- [ ] **Step 3: `goBack` lê o `kind`**

Em `app/js/main.js`, substituir o corpo de `goBack` (linhas 279-286):

```js
  goBack() {
    leavePlay();
    if (S.backTo === 'artist') { S.screen = 'artist'; S.artistMenuOpen = false; }
    else if (S.backTo === 'estilo') S.screen = 'estilo';
    else if (S.backTo === 'list') S.screen = 'list';
    else { S.screen = 'home'; }
    update();
  },
```

por:

```js
  goBack() {
    leavePlay();
    const kind = S.navCtx?.kind;
    S.navOpen = false;
    if (kind === 'artist') { S.screen = 'artist'; S.artistMenuOpen = false; }
    else if (kind === 'estilo') S.screen = 'estilo';
    else if (kind === 'list') S.screen = 'list';
    else { S.screen = 'home'; }
    update();
  },
```

- [ ] **Step 4: `duplicateInKey` passa o kind**

Em `app/js/main.js:473`, substituir:

```js
      await openSongAction(novoId, S.backTo);
```

por:

```js
      await openSongAction(novoId, S.navCtx?.kind);
```

- [ ] **Step 5: Garantir que `backTo` sumiu de vez**

Run: `cd app && grep -rn "backTo" js/ test/`
Expected: nenhuma saída. Se aparecer alguma linha, trocar por `navCtx?.kind` e rodar de novo.

- [ ] **Step 6: Sintaxe e suíte**

Run: `cd app && node --check js/state.js && node --check js/main.js && node --test`
Expected: PASS.

- [ ] **Step 7: Verificar no navegador**

Run: `cd app && python3 -m http.server 8137` → http://localhost:8137

Abrir uma música por **cada** um dos quatro caminhos e conferir que o botão voltar vai para a tela certa:
1. Aba Músicas → volta para a Home
2. Artistas → um artista → uma música → volta para o artista
3. Estilos → um estilo → uma música → volta para o estilo
4. Listas → uma lista → uma música → volta para a lista

- [ ] **Step 8: Commit**

```bash
git add app/js/state.js app/js/main.js
git commit -m "refactor(nav): record which place the song was opened from

backTo knew the kind of origin but not which one. navCtx carries both, and
goBack reads it, so there is still exactly one answer to where you came from."
```

---

### Task 3: As telas bebem da fonte única

Refatoração sem mudança de comportamento: Home e Lista passam a usar as funções da Task 1, em vez de repetir a regra.

**Files:**
- Modify: `app/js/render/home.js:127-133` (`songsTab`) e o bloco de imports no topo
- Modify: `app/js/render/listscreen.js:2` (import) e `:17-18` (resolução do `__fav`)

**Interfaces:**
- Consumes: `songsDaBusca()`, `listaAberta(id)` da Task 1.
- Produces: nada novo.

- [ ] **Step 1: `home.js` chama `songsDaBusca`**

No topo de `app/js/render/home.js`, acrescentar `songsDaBusca` à lista de imports vinda de `../state.js`.

Depois, em `songsTab()`, substituir as linhas 128-133:

```js
  const q = S.query.trim().toLowerCase();
  const all = S.songs.slice();
  let flat = all.filter((s) => (!q || s.title.toLowerCase().includes(q) || artistName(s).toLowerCase().includes(q)) && matchesLens(s));
  if (S.sort === 'title') flat.sort((a, b) => a.title.localeCompare(b.title, 'pt'));
  else if (S.sort === 'artist') flat.sort((a, b) => artistName(a).localeCompare(artistName(b), 'pt') || a.title.localeCompare(b.title, 'pt'));
  else flat.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
```

por:

```js
  // A regra de "quais músicas, nesta ordem" mora em state.js: a gaveta de
  // navegação precisa da MESMA ordem que esta tela mostra.
  const flat = songsDaBusca();
```

Na linha do contador (hoje `t('home.songs.summary', { shown: flat.length, total: all.length, ... })`), trocar `all.length` por `S.songs.length`.

- [ ] **Step 2: Conferir se `artistName` e `matchesLens` ainda são usados em `home.js`**

Run: `cd app && grep -n "artistName\|matchesLens" js/render/home.js`
Expected: ambos ainda aparecem (`artistName` em `songLine`/`songRow`, `matchesLens` em `artistsTab`). Se algum tiver ficado sem uso, removê-lo do import.

- [ ] **Step 3: `listscreen.js` chama `listaAberta`**

Em `app/js/render/listscreen.js`, na linha 2, trocar `listById, favList` por `listaAberta` na lista de imports (conferindo com `grep -n "listById\|favList" js/render/listscreen.js` se sobrou outro uso; se sobrar, manter também o nome antigo no import).

Depois, substituir as linhas 17-18:

```js
  const isFav = S.openListId === '__fav';
  const l = isFav ? favList() : listById(S.openListId);
```

por:

```js
  // A resolução do '__fav' virtual mora em state.js — a gaveta de navegação
  // precisa resolvê-lo do mesmo jeito.
  const l = listaAberta(S.openListId);
```

Run: `cd app && grep -n "isFav" js/render/listscreen.js`
Se `isFav` for usado mais abaixo, declarar de volta como `const isFav = S.openListId === '__fav';` logo acima. Se não for, seguir sem ele.

- [ ] **Step 4: Sintaxe e suíte**

Run: `cd app && node --check js/render/home.js && node --check js/render/listscreen.js && node --test`
Expected: PASS.

- [ ] **Step 5: Verificar no navegador que NADA mudou**

1. Aba Músicas: as três ordenações (Título, Artista, Recentes) dão a mesma ordem de antes; o contador `X de Y` mostra o total da biblioteca em Y.
2. Buscar por um trecho de título e por um nome de artista: os dois filtram.
3. Ligar a lente T2: a aba Músicas encolhe e o sufixo do filtro aparece.
4. Abrir a lista **Favoritas** e uma lista comum: as duas abrem, com nome e contagem certos.

- [ ] **Step 6: Commit**

```bash
git add app/js/render/home.js app/js/render/listscreen.js
git commit -m "refactor(nav): let the screens drink from the shared source

The Songs tab kept its own copy of the filter and sort, and the list screen
its own copy of resolving the virtual Favorites list. Both now call the
shared function, so the drawer cannot disagree with the screen it came from."
```

---

### Task 4: Trocar de música não deixa rastro

Correção autônoma: `openSongAction` não faz o teardown do play. Hoje só o caminho de `duplicateInKey` sofre; a partir da Task 5 é o caminho principal.

**Files:**
- Modify: `app/js/main.js:176-184` (`openSongAction`)

**Interfaces:**
- Consumes: `leavePlay()` (já existe em `main.js:168`).
- Produces: `openSongAction(id, from)` seguro para chamar de dentro da tela de toque — usado pelas Tasks 5 e 6.

- [ ] **Step 1: Reproduzir o defeito no navegador**

Abrir uma música com áudio, dar play no transporte, abrir o `⋯` → transpor um tom → **Duplicar neste tom**. Observar que o áudio da música original continua tocando por cima da cópia recém-aberta.

- [ ] **Step 2: Implementar o teardown**

Em `app/js/main.js`, substituir `openSongAction` (linhas 176-184):

```js
async function openSongAction(id, from) {
  goSong(id, from);
  update();
```

por:

```js
async function openSongAction(id, from) {
  // Trocar de música ESTANDO na tela de toque precisa do mesmo desmonte que
  // sair dela: sem isto ficam para trás o transporte tocando, os timers de
  // rolagem e de controles vivos, e a mídia da anterior carregada. Era latente
  // enquanto duplicateInKey era o único caminho; a gaveta e as setas o tornam
  // o caminho de todo dia.
  if (S.screen === 'play') leavePlay();
  goSong(id, from);
  update();
```

- [ ] **Step 3: Confirmar que o defeito sumiu**

Repetir o Step 1. Esperado: ao abrir a cópia, o transporte está parado em 0:00 e nada do áudio anterior continua tocando.

- [ ] **Step 4: Sintaxe e suíte**

Run: `cd app && node --check js/main.js && node --test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/js/main.js
git commit -m "fix(play): tear the previous song down when switching in place

Switching songs while already on the play screen left the transport running,
the scroll and control timers alive, and the previous media loaded. Only
duplicate-in-key reached this path; the drawer is about to make it routine."
```

---

### Task 5: A gaveta

**Files:**
- Create: `app/js/render/songnav.js`
- Modify: `app/sw.js` (o array `SHELL`)
- Modify: `app/js/i18n/pt.js`, `app/js/i18n/en.js`
- Modify: `app/css/app.css`
- Modify: `app/js/render/play.js` (import, botão na `.play-head`, injeção no fim de `renderPlay`, rolar a linha atual em `afterRenderPlay`)
- Modify: `app/js/main.js` (ações `toggleSongNav`, `closeSongNav`, `navGoToSource`; `Esc`)

**Interfaces:**
- Consumes: `songsDoContexto`, `posicaoNoContexto`, `listaAberta` (Task 1); `S.navCtx`, `S.navOpen` (Task 2); `openSongAction` (Task 4).
- Produces:
  - `songNavHTML() → string` (gaveta + scrim, ou `''` quando fechada)
  - `songNavButtonHTML() → string` (o botão da top-bar, ou `''` quando não há contexto)
  - `scrollNavAtual() → void` (rola a linha atual para a vista; chamada depois do render)

- [ ] **Step 1: Chaves de tradução nas duas tabelas**

Em `app/js/i18n/pt.js`, junto do bloco `play.*`:

```js
  'play.nav.open': 'Navegar entre músicas',
  'play.nav.close': 'Fechar',
  'play.nav.fromArtist': 'Músicas do artista',
  'play.nav.fromEstilo': 'Músicas do estilo',
  'play.nav.fromList': 'Músicas da lista',
  'play.nav.fromHome': 'Todas as músicas',
  'play.nav.goToSource': 'Abrir a lista completa',
  'play.nav.now': 'Agora',
  'play.nav.position': '{i} de {n}',
  'play.nav.positionIn': '{i} de {n} em {nome}',
  'play.nav.prev': 'Música anterior',
  'play.nav.next': 'Próxima música',
  'play.nav.empty': 'Nada aqui',
```

Em `app/js/i18n/en.js`, nas mesmas posições:

```js
  'play.nav.open': 'Browse songs',
  'play.nav.close': 'Close',
  'play.nav.fromArtist': 'Songs by this artist',
  'play.nav.fromEstilo': 'Songs in this style',
  'play.nav.fromList': 'Songs in this list',
  'play.nav.fromHome': 'All songs',
  'play.nav.goToSource': 'Open the full list',
  'play.nav.now': 'Now',
  'play.nav.position': '{i} of {n}',
  'play.nav.positionIn': '{i} of {n} in {nome}',
  'play.nav.prev': 'Previous song',
  'play.nav.next': 'Next song',
  'play.nav.empty': 'Nothing here',
```

> O mockup dizia "MÚSICAS DA PASTA". "Pasta" ainda não é um conceito do app — nomear aqui uma coisa que não existe confundiria. Os rótulos são por tipo; quando pastas chegarem, é mais uma chave.

Run: `cd app && node --test test/i18n.test.js`
Expected: PASS (paridade entre as tabelas).

- [ ] **Step 2: Criar `app/js/render/songnav.js`**

```js
// render/songnav.js — andar entre as músicas do contexto de navegação.
//
// A gaveta SOBREPÕE a cifra em vez de empurrá-la, e isso não é preferência
// estética: a cifra em texto se re-diagrama pela largura da caixa (reflowCifra e
// fontQueCabe, em render/play.js). Uma coluna que empurra mudaria o tamanho da
// fonte e o ponto de quebra de cada linha a cada abre/fecha — a música se
// mexendo debaixo do dedo no meio do ensaio. De brinde: não disputa a vaga do
// mixer e não precisa de breakpoint novo.
//
// Este módulo só desenha e traduz. Quais músicas, e em que ordem, é assunto de
// songsDoContexto() em state.js.
//
// Cada função aqui chama songsDoContexto() por conta própria, e um render da tela
// de toque a chama umas quatro vezes. É deliberado: nos contextos artista, estilo
// e lista o trabalho é sobre um punhado de músicas, e o único caso que ordena a
// biblioteca inteira — a busca — é exatamente o que a tela Home já faz a cada
// render dela. Passar a lista por parâmetro obrigaria a enfiá-la também em
// songHeaderHTML e nas três funções de corpo que a chamam; o cache vale a pena
// quando alguém medir que vale.
// Spec: docs/superpowers/specs/2026-08-17-navegacao-entre-musicas-design.md
import {
  S, songsDoContexto, posicaoNoContexto, listaAberta,
  artistById, modesOf, SEM_ESTILO,
} from '../state.js';
import { I, esc } from '../icons.js';
import { t } from '../i18n.js';

// Rótulo do tipo do contexto. Traduzido no render, nunca em constante de módulo:
// uma constante congelaria o idioma no import.
function rotuloDoTipo(kind) {
  if (kind === 'artist') return t('play.nav.fromArtist');
  if (kind === 'estilo') return t('play.nav.fromEstilo');
  if (kind === 'list') return t('play.nav.fromList');
  return t('play.nav.fromHome');
}

// Nome próprio do contexto — o que a tela de origem mostrou no título. Os casos
// especiais são os mesmos que as telas já tratam: 'Sem estilo' (render/estilo.js)
// e a lista de sistema Favoritas (render/listscreen.js).
export function contextoNome(ctx = S.navCtx) {
  if (!ctx) return '';
  if (ctx.kind === 'artist') return (artistById(ctx.id) || {}).name || '';
  if (ctx.kind === 'estilo') return ctx.id === SEM_ESTILO ? t('estilo.none') : (ctx.id || '');
  if (ctx.kind === 'list') {
    const l = listaAberta(ctx.id);
    return l ? (l.sistema ? t('list.favoritesName') : l.nome) : '';
  }
  return '';
}

// "3 de 24 em Djavan" — ou "3 de 24" quando o contexto não tem nome próprio
// (a busca). Vazio quando a atual não está no contexto: melhor não dizer nada
// do que dizer "0 de 24".
export function posicaoTexto() {
  const { i, n } = posicaoNoContexto();
  if (i < 0 || !n) return '';
  const nome = contextoNome();
  return nome
    ? t('play.nav.positionIn', { i: i + 1, n, nome })
    : t('play.nav.position', { i: i + 1, n });
}

// O botão que abre a gaveta. Some quando não há contexto ou quando ele tem uma
// música só — uma gaveta para navegar entre uma música é ruído.
export function songNavButtonHTML() {
  if (songsDoContexto().length < 2) return '';
  return `<button class="btn-icon ${S.navOpen ? 'accent-on' : ''}" data-a="toggleSongNav" title="${t('play.nav.open')}">${I.listIcon(22)}</button>`;
}

// Mesmo rótulo de modo da tela da lista. `bestLabel()` de state.js devolve
// português cru — aqui a linha precisa seguir o idioma escolhido.
const modeLabel = (so) => modesOf(so).includes('T2') ? t('list.modeChartAccomp') : t('list.modeChart');

export function songNavHTML() {
  if (!S.navOpen) return '';
  const songs = songsDoContexto();
  const { i, n } = posicaoNoContexto(songs);
  const nome = contextoNome();
  const linhas = songs.length
    ? songs.map((so, idx) => {
      const atual = so.id === S.currentSongId;
      return `<div class="songnav-row ${atual ? 'now' : ''}" data-a="navPick" data-id="${so.id}">
        <div class="num">${idx + 1}</div>
        <div class="tt">
          <div class="t">${esc(so.title)}</div>
          <div class="m">${modeLabel(so)}</div>
        </div>
        ${atual
          ? `<div class="now-tag"><span class="dot"></span>${t('play.nav.now')}</div>`
          : `<div class="go">${I.play(14)}</div>`}
      </div>`;
    }).join('')
    : `<div class="songnav-empty">${t('play.nav.empty')}</div>`;

  return `<div class="songnav-scrim" data-a="closeSongNav"></div>
    <aside class="songnav" data-stop="1" data-nopan="1">
      <div class="songnav-head">
        <div class="ic">${I.listIcon(20)}</div>
        <div class="tt">
          <div class="k">${rotuloDoTipo(S.navCtx?.kind)}</div>
          <div class="n">${esc(nome)}</div>
        </div>
        <div class="pos">${i >= 0 ? t('play.nav.position', { i: i + 1, n }) : ''}</div>
        <button class="btn-icon" data-a="navGoToSource" title="${t('play.nav.goToSource')}">${I.chevR(20)}</button>
      </div>
      <div class="songnav-body" id="songnav-body">${linhas}</div>
    </aside>`;
}

// Depois do render: a linha atual precisa estar visível sem rolar à mão. Numa
// lista de 24 a atual costuma estar fora da primeira tela.
export function scrollNavAtual() {
  if (!S.navOpen) return;
  const row = document.querySelector('.songnav-row.now');
  if (row) row.scrollIntoView({ block: 'center' });
}
```

- [ ] **Step 3: Registrar o módulo no `SHELL`**

Em `app/sw.js`, no array `SHELL`, acrescentar a linha logo depois de `'./js/render/play.js',`:

```js
  './js/render/songnav.js',
```

Run: `cd app && node --test test/shell.test.js`
Expected: PASS.

- [ ] **Step 4: CSS da gaveta**

Em `app/css/app.css`, depois do bloco do mixer (a regra `.mixer .body`, ~linha 435):

```css
/* Gaveta de navegação entre músicas (spec 2026-08-17). Sobrepõe a cifra: um
   painel que empurrasse forçaria o reflow do texto a cada abre/fecha. */
.songnav-scrim{position:absolute;inset:0;background:rgba(6,6,8,.5);z-index:48}
.songnav{position:absolute;top:0;right:0;bottom:0;width:min(380px,88vw);z-index:49;background:var(--surface);border-left:1px solid var(--border);display:flex;flex-direction:column;box-shadow:-16px 0 46px rgba(0,0,0,.5);animation:navIn .24s cubic-bezier(.32,.72,0,1)}
@keyframes navIn{from{transform:translateX(100%)}to{transform:translateX(0)}}
.songnav-head{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--border);flex-shrink:0}
.songnav-head .ic{display:flex;color:var(--accent)}
.songnav-head .tt{flex:1;min-width:0}
.songnav-head .tt .k{color:var(--accent);font-size:10.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase}
.songnav-head .tt .n{font-family:var(--f-title);font-weight:600;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.songnav-head .pos{color:var(--muted);font-size:12px;flex-shrink:0}
.songnav-body{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:7px}
.songnav-row{display:flex;align-items:center;gap:12px;padding:11px 13px;background:var(--surface2);border:1px solid var(--border);border-radius:12px;cursor:pointer}
.songnav-row:hover{border-color:var(--muted3)}
.songnav-row.now{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 9%,var(--surface2))}
.songnav-row .num{width:18px;text-align:center;color:var(--muted);font-family:var(--f-mono);font-size:13px;flex-shrink:0}
.songnav-row.now .num{color:var(--accent)}
.songnav-row .tt{flex:1;min-width:0}
.songnav-row .tt .t{font-weight:600;font-size:14.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.songnav-row.now .tt .t{color:var(--accent)}
.songnav-row .tt .m{color:var(--muted);font-size:11.5px;margin-top:2px}
.songnav-row .go{display:flex;color:var(--muted3);flex-shrink:0}
.songnav-row .now-tag{display:flex;align-items:center;gap:5px;color:var(--accent);font-size:11.5px;font-weight:600;flex-shrink:0}
.songnav-row .now-tag .dot{width:6px;height:6px;border-radius:50%;background:var(--accent)}
.songnav-empty{color:var(--muted);font-size:13px;text-align:center;padding:28px 12px}
```

- [ ] **Step 5: Ligar na tela de toque**

Em `app/js/render/play.js`, no bloco de imports do topo, acrescentar:

```js
import { songNavHTML, songNavButtonHTML, scrollNavAtual } from './songnav.js';
```

Na `.play-head` de `renderPlay`, inserir o botão **logo antes** do `<div class="menu-wrap">` (hoje linha 556):

```js
      ${songNavButtonHTML()}
```

E no fim de `renderPlay`, acrescentar a gaveta como **última** linha antes do `</div>` que fecha `.screen` — depois de `${S.tomPop ? ... : ''}`:

```js
    ${songNavHTML()}
```

Em `afterRenderPlay`, acrescentar como primeira linha depois de `if (!song) return;`:

```js
  scrollNavAtual();
```

- [ ] **Step 6: As ações**

Em `app/js/main.js`, dentro do objeto `actions`, junto das outras ações de navegação (depois de `goBack`):

```js
  toggleSongNav() { S.navOpen = !S.navOpen; S.imgMenuOpen = false; update(); },
  closeSongNav() { S.navOpen = false; update(); },
  // O chevron do cabeçalho da gaveta leva à tela de onde o contexto veio — o
  // mesmo destino do botão voltar, e por isso a mesma função.
  navGoToSource() { actions.goBack(); },
  navPick(d) { if (d.id !== S.currentSongId) openSongAction(d.id, S.navCtx?.kind); else actions.closeSongNav(); },
```

Ainda em `main.js`, na delegação global de clique (linha ~1020), acrescentar `closeSongNav` à lista de ações protegidas pelo `data-stop`, para que um clique dentro da gaveta não a feche:

```js
      if ((name === 'closePopover' || name === 'toggleMixer' || name === 'closeSongNav' || name === 'closeChordPicker' || name === 'closeShare') && stop && !stop.contains(t)) return;
```

E no handler de `keydown`, dentro do `if (e.key === 'Escape')`, acrescentar **antes** do teste de `S.chordPop` (a gaveta cobre a cifra, então tem prioridade sobre o que está por baixo — mas não sobre a folha de compartilhar):

```js
    if (S.navOpen) { S.navOpen = false; update(); return; }
```

- [ ] **Step 7: `navPick` fecha a gaveta ao trocar**

`openSongAction` chama `goSong`, e `openSong` (Task 2, Step 2) já faz `S.navOpen = false`. Confirmar:

Run: `cd app && grep -n "navOpen = false" js/state.js`
Expected: uma linha, dentro de `openSong`.

- [ ] **Step 8: Sintaxe e suíte**

Run: `cd app && node --check js/render/songnav.js && node --check js/render/play.js && node --check js/main.js && node --test`
Expected: PASS.

- [ ] **Step 9: Verificar no navegador**

1. Artista com 5+ músicas → abrir a 3ª → o botão de lista aparece na top-bar → abrir: rótulo "MÚSICAS DO ARTISTA", nome do artista, `3 de N`, linha atual com `● Agora` e **visível sem rolar**.
2. Escolher outra música na gaveta: ela abre e a gaveta fecha.
3. Fechar por: scrim, `Esc`, e escolher a música atual de novo. Clicar **dentro** da gaveta (fora de uma linha) não fecha.
4. O chevron do cabeçalho leva à tela do artista.
5. Abrir de uma **lista**: a ordem é a do show, não a alfabética; a numeração bate com a da tela da lista.
6. Abrir de **Favoritas**: a gaveta lista as favoritas com o nome "Favoritas". Desfavoritar pela `⋯` de dentro da música: nada trava, a linha só perde o `● Agora`.
7. Abrir de **Estilos** e da aba **Músicas**: rótulos "MÚSICAS DO ESTILO" e "TODAS AS MÚSICAS".
8. Artista com **uma** música só: o botão não aparece.
9. **Cifra em texto: abrir e fechar a gaveta NÃO muda a fonte nem as quebras de linha.**
10. Com o mixer aberto: a gaveta cobre o mixer e o transporte continua tocando por baixo.
11. Trocar o idioma em Ajustes para English e reabrir: rótulos e "Now" traduzidos.
12. Janela estreita (~420px): a gaveta ocupa 88% da largura e continua utilizável.

- [ ] **Step 10: Commit**

```bash
git add app/js/render/songnav.js app/js/render/play.js app/js/main.js app/js/i18n/pt.js app/js/i18n/en.js app/css/app.css app/sw.js
git commit -m "feat(nav): add the song drawer to the play screen

An overlay panel listing the songs of the context you came from, with the
current one marked and scrolled into view. It overlays rather than pushes
because the text chart refits its font and line breaks to the box width."
```

---

### Task 6: As setas na camada flutuante

**Files:**
- Modify: `app/js/render/songnav.js` (acrescentar `songNavArrowsHTML`)
- Modify: `app/js/render/play.js` (`CTL_SEL`, `showControls`, `hideControls`, `manageScroll`, injeção das setas)
- Modify: `app/js/main.js` (ações `songPrev`, `songNext`)
- Modify: `app/css/app.css`

**Interfaces:**
- Consumes: `songsDoContexto`, `posicaoNoContexto` (Task 1); `openSongAction` (Task 4).
- Produces: `songNavArrowsHTML() → string`; `vizinhaNoContexto(delta) → song | null`.

- [ ] **Step 1: Acrescentar o teste da vizinhança**

Em `app/test/navctx.test.js`, no topo trocar o import para incluir `vizinhaNoContexto`, e acrescentar ao fim do arquivo:

```js
test('vizinha: anda para frente e para trás dentro do contexto', () => {
  biblioteca();
  S.navCtx = { kind: 'artist', id: 'a1' };   // s2, s1, s3
  S.currentSongId = 's1';
  assert.equal(vizinhaNoContexto(-1).id, 's2');
  assert.equal(vizinhaNoContexto(1).id, 's3');
});

test('vizinha: null nas pontas — as setas se desabilitam, não dão a volta', () => {
  biblioteca();
  S.navCtx = { kind: 'artist', id: 'a1' };   // s2, s1, s3
  S.currentSongId = 's2';
  assert.equal(vizinhaNoContexto(-1), null);
  S.currentSongId = 's3';
  assert.equal(vizinhaNoContexto(1), null);
});

test('vizinha: null quando a atual não está no contexto', () => {
  biblioteca();
  // Favoritas com UMA música, e a atual não sendo ela — o caso real de
  // desfavoritar a música de dentro dela. Um contexto VAZIO não serviria de
  // teste: com songs = [] o acesso songs[i + delta] já devolve undefined
  // sozinho, e o teste passaria igual com ou sem a guarda `if (i < 0)` que ele
  // existe justamente para proteger.
  S.songs[0].favorita = true;            // Favoritas = [s1]
  S.navCtx = { kind: 'list', id: '__fav' };
  S.currentSongId = 's3';                // fora do contexto
  assert.equal(vizinhaNoContexto(1), null);
  assert.equal(vizinhaNoContexto(-1), null);
});
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `cd app && node --test test/navctx.test.js`
Expected: FAIL — `does not provide an export named 'vizinhaNoContexto'`

- [ ] **Step 3: Implementar `vizinhaNoContexto` em `state.js`**

Em `app/js/state.js`, logo depois de `posicaoNoContexto`:

```js
// A vizinha `delta` passos adiante, ou null. Não dá a volta de propósito: as
// setas se desabilitam nas pontas, e a última música de um show não deve
// reabrir a primeira sozinha.
export function vizinhaNoContexto(delta) {
  const songs = songsDoContexto();
  const { i } = posicaoNoContexto(songs);
  if (i < 0) return null;
  return songs[i + delta] || null;
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `cd app && node --test test/navctx.test.js`
Expected: PASS, 18 testes.

- [ ] **Step 5: O HTML das setas**

Em `app/js/render/songnav.js`, acrescentar `posicaoNoContexto` já está importado; acrescentar ao fim do arquivo:

```js
// As setas moram na camada flutuante que já aparece ao toque e some em 3,2s
// (showControls/hideControls, em render/play.js) — e não na top-bar, esvaziada
// de propósito pela spec 2026-07-06. Ficam coladas nas laterais, com o controle
// de rolagem seguindo centralizado entre elas.
//
// Nas pontas ficam DESABILITADAS, não escondidas: sumir moveria o controle de
// rolagem de lugar entre uma música e outra, e o dedo aprende posição antes de
// aprender rótulo.
export function songNavArrowsHTML() {
  const songs = songsDoContexto();
  if (songs.length < 2) return '';
  const { i } = posicaoNoContexto(songs);
  const semAnterior = i <= 0;
  const semProxima = i < 0 || i >= songs.length - 1;
  return `<button class="songnav-arrow prev" data-a="songPrev" ${semAnterior ? 'disabled' : ''} title="${t('play.nav.prev')}">${I.back(26)}</button>
    <button class="songnav-arrow next" data-a="songNext" ${semProxima ? 'disabled' : ''} title="${t('play.nav.next')}">${I.chevR(26)}</button>`;
}
```

- [ ] **Step 6: Injetar as setas e unificar o seletor dos controles**

Em `app/js/render/play.js`, acrescentar `songNavArrowsHTML` ao import de `./songnav.js`.

Na `.cifra-col` de `renderPlay`, logo **depois** de `${scrollCtl}`:

```js
        ${songNavArrowsHTML()}
```

Acrescentar, junto das outras constantes do topo do bloco de comportamento pós-render (perto de `let scrollTimer = null;`):

```js
// Os três elementos da camada flutuante. Uma constante e não três listas soltas:
// showControls, hideControls e o laço da rolagem automática precisam concordar,
// e a terceira lista é justamente a que esquece o membro novo — deixando as
// setas presas na tela durante a rolagem.
const CTL_SEL = '.scroll-ctl, .zoom-ctl, .songnav-arrow';
```

Substituir `showControls` e `hideControls`:

```js
function showControls() {
  document.querySelectorAll(CTL_SEL).forEach((c) => c.classList.remove('ctl-hidden'));
  clearTimeout(ctlTimer);
  ctlTimer = setTimeout(hideControls, 3200);
}
function hideControls() {
  if (S.screen !== 'play') return;
  document.querySelectorAll(CTL_SEL).forEach((c) => c.classList.add('ctl-hidden'));
}
```

E dentro de `manageScroll`, substituir:

```js
      const ctl = document.querySelector('.scroll-ctl');
      if (ctl) { ctl.classList.remove('ctl-hidden'); clearTimeout(ctlTimer); }
```

por:

```js
      const ctls = document.querySelectorAll(CTL_SEL);
      if (ctls.length) { ctls.forEach((c) => c.classList.remove('ctl-hidden')); clearTimeout(ctlTimer); }
```

- [ ] **Step 7: As ações**

Em `app/js/main.js`, acrescentar `vizinhaNoContexto` ao import vindo de `./state.js` e, no objeto `actions`, junto das ações da gaveta:

```js
  songPrev() { const s = vizinhaNoContexto(-1); if (s) openSongAction(s.id, S.navCtx?.kind); },
  songNext() { const s = vizinhaNoContexto(1); if (s) openSongAction(s.id, S.navCtx?.kind); },
```

- [ ] **Step 8: CSS das setas**

Em `app/css/app.css`, junto das regras de `.scroll-ctl` (~linha 425), acrescentar:

```css
/* Setas anterior/próxima: mesma altura e mesmo ciclo de aparecer/sumir do
   controle de rolagem, coladas nas laterais da coluna da cifra. O .ctl-hidden
   que as apaga é o mesmo, declarado junto com .scroll-ctl. */
.songnav-arrow{position:absolute;bottom:18px;z-index:20;width:52px;height:52px;display:flex;align-items:center;justify-content:center;background:var(--surface2);border:1px solid var(--border);border-radius:15px;color:var(--text);cursor:pointer;box-shadow:0 8px 26px rgba(0,0,0,.45);transition:opacity .25s ease}
.songnav-arrow.prev{left:14px}
.songnav-arrow.next{right:14px}
/* Desabilitada se marca por cor, NÃO por opacity: `.ctl-hidden` também usa
   opacity e tem a mesma especificidade que `:disabled`, então quem viesse
   depois no arquivo venceria — uma seta desabilitada e escondida reapareceria
   a 45%. Sem opacity aqui, as duas regras não têm o que disputar. */
.songnav-arrow:disabled{color:var(--muted3);background:var(--surface);cursor:default}
```

O apagar em si não é declarado aqui: a regra da linha 418 é a dona dele, e as setas entram nela. Substituir a linha 418:

```css
.scroll-ctl.ctl-hidden,.zoom-ctl.ctl-hidden{opacity:0;pointer-events:none}
```

por:

```css
.scroll-ctl.ctl-hidden,.zoom-ctl.ctl-hidden,.songnav-arrow.ctl-hidden{opacity:0;pointer-events:none}
```

- [ ] **Step 9: Sintaxe e suíte**

Run: `cd app && node --check js/state.js && node --check js/render/songnav.js && node --check js/render/play.js && node --check js/main.js && node --test`
Expected: PASS.

- [ ] **Step 10: Verificar no navegador**

1. Abrir a 2ª música de um artista com 3+: as duas setas aparecem ao tocar a cifra, nas laterais, na mesma altura do controle de rolagem — que continua centralizado.
2. Somem juntas depois de ~3,2s sem toque.
3. Ligar a rolagem automática: as setas **continuam visíveis** junto com o controle de rolagem, e não somem no meio.
4. Primeira música do contexto: `‹` desabilitada, `›` ativa. Última: o inverso. Nenhuma das duas some — e, esperando os 3,2s na primeira música, a `‹` desabilitada **some junto** com as outras em vez de ficar meio visível.
5. `›` abre a próxima na ordem do contexto; `‹` volta.
6. Numa lista: as setas seguem a ordem do show; com a lente T3 ligada, andar não pula para o karaokê.
7. Com o mixer aberto (tela larga): a seta `›` fica na borda direita da **coluna da cifra**, não sob o mixer.
8. Cifra em imagem e karaokê: as setas aparecem e funcionam nos dois.
9. Trocar de música com o áudio tocando: o transporte para e o mixer é o da nova (regressão da Task 4).

- [ ] **Step 11: Commit**

```bash
git add app/js/state.js app/js/render/songnav.js app/js/render/play.js app/js/main.js app/css/app.css app/test/navctx.test.js
git commit -m "feat(nav): add previous/next arrows to the floating control layer

They ride the same show-and-fade cycle as the autoscroll control instead of
adding weight to the deliberately thin top bar. One selector constant now
feeds all three places that had to agree about which controls to fade."
```

---

### Task 7: A linha de posição no cabeçalho da cifra

**Files:**
- Modify: `app/js/render/play.js:104-124` (`songHeaderHTML`)

**Interfaces:**
- Consumes: `posicaoTexto()` de `render/songnav.js` (Task 5).
- Produces: nada.

- [ ] **Step 1: Acrescentar `posicaoTexto` ao import**

Em `app/js/render/play.js`, o import de `./songnav.js` passa a ser:

```js
import { songNavHTML, songNavButtonHTML, songNavArrowsHTML, scrollNavAtual, posicaoTexto } from './songnav.js';
```

- [ ] **Step 2: Injetar a linha na meta**

Em `songHeaderHTML`, logo **depois** do `if (song.fonte) meta.push(...)` (hoje linha 118):

```js
  // "3 de 24 em Djavan": entra junto de Tom e Fonte, no cabeçalho que já existe
  // no corpo da cifra. Não vai para a top-bar — ela foi esvaziada de propósito
  // pela spec 2026-07-06, e a resposta glanceável para "onde eu estou" é a
  // própria gaveta, a um toque.
  const pos = posicaoTexto();
  if (pos) meta.push(`<span class="src">${esc(pos)}</span>`);
```

- [ ] **Step 3: Sintaxe e suíte**

Run: `cd app && node --check js/render/play.js && node --test`
Expected: PASS.

- [ ] **Step 4: Verificar no navegador**

1. Abrir a 3ª música de um artista: o cabeçalho da cifra mostra `Tom C · CifraClub · 3 de 24 em Djavan`.
2. Abrir da aba Músicas: mostra `3 de 24`, sem o `em`.
3. Abrir de Favoritas e desfavoritar pelo `⋯`: a linha some (a atual saiu do contexto), sem sobrar `0 de N`.
4. Nos três modos — texto, imagem e karaokê — a linha aparece, porque `songHeaderHTML` serve os três.
5. Em English, a linha lê `3 of 24 in Djavan`.

- [ ] **Step 5: Commit**

```bash
git add app/js/render/play.js
git commit -m "feat(nav): show the position in the chart header

It joins Key and Source on the meta line that already carries the song's
identity, instead of putting weight back on the top bar."
```

---

### Task 8: Versão e changelog

**Files:**
- Modify: `app/js/version.js`, `app/sw.js:2`, `CHANGELOG.md`

**Interfaces:** nenhuma.

- [ ] **Step 1: Bump nos dois literais**

Em `app/js/version.js`:

```js
export const VERSION = '0.15.0';
```

Em `app/sw.js`, linha 2:

```js
const VERSION = 'somaplay-0.15.0';
```

- [ ] **Step 2: Confirmar a sincronia**

Run: `cd app && node --test test/version.test.js test/shell.test.js`
Expected: PASS.

- [ ] **Step 3: Entrada no CHANGELOG**

Em `CHANGELOG.md`, acrescentar a seção nova no topo da lista de versões (acima da entrada de 0.14.3), em inglês, seguindo o formato das que já estão lá:

```markdown
## [0.15.0] — 2026-08-17

### Added
- Navigate between songs from inside a song. A drawer lists the songs of the
  context you came from — artist, style, list, or the search results — with the
  current one marked and scrolled into view, and previous/next arrows ride the
  same show-and-fade cycle as the autoscroll control.
- The chart header now says where you are: `3 of 24 in Djavan`.

### Fixed
- Switching songs while already on the play screen left the previous song's
  transport running and its media loaded. Only duplicate-in-key reached that
  path before.
```

- [ ] **Step 4: Suíte inteira e verificação final**

Run: `cd app && node --test`
Expected: PASS, tudo.

No navegador, com o Service Worker: recarregar com hard reload, conferir que **Ajustes mostra 0.15.0**, depois desligar a rede (DevTools → Network → Offline), recarregar, e conferir que a gaveta e as setas funcionam offline.

- [ ] **Step 5: Commit**

```bash
git add app/js/version.js app/sw.js CHANGELOG.md
git commit -m "release: 0.15.0 — navigating between songs"
```

---

## Auto-revisão deste plano

**Cobertura da spec**, seção por seção:

| Seção da spec | Task |
|---|---|
| 1. Contexto de navegação (`navCtx` substitui `backTo`) | 2 |
| 2. Lista derivada (`songsDoContexto`, `listaAberta`, Favoritas, `home`) | 1, 3 |
| 3. A gaveta sobrepõe | 5 |
| 4. As setas na camada flutuante (`CTL_SEL`, desabilitadas nas pontas) | 6 |
| 5. Teardown na troca de música | 4 |
| 6. Indicador de posição no cabeçalho da cifra | 7 |
| Componentes: `render/listscreen.js` usa `listaAberta` | 3 |
| Componentes: SHELL, i18n nas duas tabelas, bump MINOR | 5, 8 |
| Verificação: os 11 passos de navegador | distribuídos nas Tasks 2, 3, 5, 6, 7, 8 |

**Consistência de nomes** entre tasks: `songsDoContexto`, `songsDaBusca`, `listaAberta`, `posicaoNoContexto`, `vizinhaNoContexto` (state.js); `songNavHTML`, `songNavButtonHTML`, `songNavArrowsHTML`, `scrollNavAtual`, `posicaoTexto`, `contextoNome` (songnav.js); ações `toggleSongNav`, `closeSongNav`, `navGoToSource`, `navPick`, `songPrev`, `songNext` (main.js). Cada nome é definido em uma task e consumido com a mesma grafia nas seguintes.

**Ordem das dependências:** Task 1 (lógica) → 2 (estado) → 3 (consumidores) → 4 (correção do caminho de troca, antes de quem passa a usá-lo) → 5 (gaveta) → 6 (setas) → 7 (indicador) → 8 (release).
