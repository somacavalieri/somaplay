# Apagar uma fonte inteira — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uma lixeira discreta em cada linha de fonte, no bloco "Exportar biblioteca" das Configurações, apaga de uma vez todas as músicas daquela fonte — com confirmação, e sem travar o app com 5.523 músicas.

**Architecture:** O motor recebe um conjunto de ids e **não sabe o que é fonte** — `deleteSongs(ids, { manterEmListas })` em `state.js`, e a tradução do eixo é `songIdsDasFontes`, a mesma função que o export já usa. As decisões viram duas funções puras testáveis sob Node (`blobIdsDasMusicas`, `artistasOrfaos`); a persistência ganha três operações em lote no `db.js`, uma transação para o conjunto inteiro. A ordem de execução é metadados primeiro e arquivos depois, para que um crash no meio deixe byte órfão em vez de música quebrada.

**Tech Stack:** ES modules puros, sem dependências e sem build. IndexedDB + OPFS. Testes com `node --test` (Node ≥ 20). Render por template string + delegação de clique via `data-a`.

**Spec:** `docs/superpowers/specs/2026-08-13-apagar-fonte-design.md`

## Global Constraints

- **Nunca renomear `DB_NAME` em `app/js/db.js`.** Trocar o nome faz o app abrir um banco vazio — a biblioteca do usuário some.
- **Nenhum módulo novo entra em `app/js/`** neste plano. Por isso o array `SHELL` de `app/sw.js` **não muda**. Mas `VERSION` (linha 2) **precisa subir**, porque JS e CSS mudam e o Service Worker é cache-first: hoje `'somaplay-v36'` no working tree → `'somaplay-v37'`.
- **Toda chave de i18n vai nas DUAS tabelas** (`app/js/i18n/pt.js` e `app/js/i18n/en.js`). `test/i18n.test.js` tem teste de paridade e falha se faltar em uma.
- **String traduzida é produzida em tempo de render**, nunca em constante de módulo.
- **Nunca colocar valor de `data-*` atrás de `t()`.** O `data-id` da linha e o da lixeira carregam a **grafia salva** da fonte; só o balde usa o sentinela `__sem_fonte`, com o rótulo traduzido apenas no que se vê.
- **Contexto de escape:** o que vai para atributo HTML (`title`, `aria-label`) passa por `esc()`; o que vai para o `confirm()` nativo **não** — diálogo do navegador é texto puro, e `&quot;` apareceria literal na tela.
- **Comandos:** `cd app && node --test` (suíte), `cd app && node --test test/<arquivo>` (um arquivo), `cd app && node --check js/<arquivo>.js` (sintaxe), `cd app && python3 -m http.server 8137` (verificação manual em `http://localhost:8137`).
- **Verificação manual no navegador conta** — não há harness de DOM, de propósito. Tarefa de UI só termina depois de olhar a tela.
- **Idioma:** comentários de código **em português**, seguindo o arquivo que você está editando. **Mensagem de commit em inglês**, como o `CLAUDE.md` manda. Não se guie pelo `git log` de uma branch local: as branches não mergeadas usam português e induzem ao erro. A história da `main` é o que vale.
- **Esta é a primeira feature destrutiva em lote do app.** Antes de qualquer verificação manual que apague de verdade, leia a seção "Segurança na verificação manual" no fim deste plano.

---

## File Structure

| Arquivo | Responsabilidade | Ação |
|---|---|---|
| `app/js/state.js` | As duas puras (`blobIdsDasMusicas`, `artistasOrfaos`) e o motor `deleteSongs`. Já é a casa de `songIdsDasFontes` e do `deleteSong` de hoje. | Modificar |
| `app/test/apagar.test.js` | Testes das duas puras — as únicas decisões que dá para testar sem navegador. | Criar |
| `app/js/db.js` | Três operações em lote: `deleteSongs`, `deleteArtists`, `putLists`. | Modificar |
| `app/js/backup.js` | Passa a usar `blobIdsDasMusicas` em vez do laço inline idêntico (`exportLibrary`). | Modificar |
| `app/js/render/settings.js` | A linha de fonte vira `<div>` com dois botões; a lixeira; as regras de exibição da lista. | Modificar |
| `app/css/app.css` | `.check-main`, `.check-row.has-del` e `.check-row .del`. | Modificar |
| `app/js/main.js` | A ação `deleteFonteAsk`: confirmação, toasts, guarda de reentrância, reconciliação de `S.exportFontes` e `S.fonteFilter`. | Modificar |
| `app/js/i18n/pt.js`, `app/js/i18n/en.js` | 5 chaves novas em cada. | Modificar |
| `app/sw.js` | `VERSION` de `v36` para `v37`. | Modificar |
| `pendencias.md` | Linha nova na tabela **App**. | Modificar |

**Ordem:** Tarefa 1 (puras, testadas) → Tarefa 2 (motor + persistência) → Tarefa 3 (a linha e a lixeira, ainda inerte) → Tarefa 4 (a ação, que liga tudo).

Cada tarefa deixa o app funcionando. A Tarefa 3 renderiza a lixeira antes de existir ação para ela: a delegação de clique em `main.js` procura `actions['deleteFonteAsk']`, não acha, e o clique cai no caminho de "clique fora fecha menus" — inofensivo. Isso é de propósito, para a revisão visual acontecer antes de existir qualquer caminho destrutivo.

---

### Task 1: As duas puras

O que dá para testar sem navegador: **quem fica órfão** e **quais arquivos somem**. O resto do apagar é orquestração sobre IndexedDB e OPFS.

**Files:**
- Modify: `app/js/state.js` — adicionar logo depois de `songIdsDasFontes` (~linha 180)
- Modify: `app/js/backup.js:54-59` — dentro de `exportLibrary`
- Test: `app/test/apagar.test.js` (criar)

**Interfaces:**
- Consumes: nada de tarefas anteriores. `S`, `DB` e `songIdsDasFontes` já existem em `state.js`.
- Produces:
  - `export function blobIdsDasMusicas(songs)` → `string[]`. Todos os `blobId` de `cifra.imagens`, `stems` e `full` das músicas dadas, na ordem em que aparecem, sem os nulos. Não deduplica.
  - `export function artistasOrfaos(songs, ids)` → `string[]`. `songs` é a biblioteca inteira; `ids` é um `Set` de ids que vão sumir. Devolve os `artistId` que ficam **sem nenhuma música sobrevivente**, cada um uma vez só.

- [ ] **Step 1: Escrever o teste que falha**

Criar `app/test/apagar.test.js`:

```js
// apagar.test.js — as duas decisões puras do apagar em lote.
//
// O motor de apagar não sabe o que é fonte: ele recebe ids. O que sobra de
// decidível sem navegador é (a) quais arquivos aquelas músicas levam junto e
// (b) quais artistas ficam sem música nenhuma. Os dois são O(n) de propósito:
// a versão "um some() por música apagada" é O(n²) e trava o app com 5 mil ids.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blobIdsDasMusicas, artistasOrfaos } from '../js/state.js';

const song = (id, artistId) => ({ id, artistId });

// ---------- artistasOrfaos ----------

test('artista que perde todas as músicas fica órfão', () => {
  const songs = [song('s1', 'a1'), song('s2', 'a1')];
  assert.deepEqual(artistasOrfaos(songs, new Set(['s1', 's2'])), ['a1']);
});

test('artista que sobrevive com uma música não fica órfão', () => {
  const songs = [song('s1', 'a1'), song('s2', 'a1')];
  assert.deepEqual(artistasOrfaos(songs, new Set(['s1'])), []);
});

test('cada artista órfão aparece uma vez só', () => {
  const songs = [song('s1', 'a1'), song('s2', 'a1'), song('s3', 'a2')];
  assert.deepEqual(artistasOrfaos(songs, new Set(['s1', 's2', 's3'])), ['a1', 'a2']);
});

test('conjunto vazio não deixa ninguém órfão', () => {
  assert.deepEqual(artistasOrfaos([song('s1', 'a1')], new Set()), []);
});

test('música sem artista não vira artista órfão', () => {
  assert.deepEqual(artistasOrfaos([song('s1', undefined)], new Set(['s1'])), []);
});

// ---------- blobIdsDasMusicas ----------

test('junta imagens, stems e full de várias músicas', () => {
  const songs = [
    { id: 's1', cifra: { imagens: [{ blobId: 'b1' }, { blobId: 'b2' }] }, stems: [{ blobId: 'b3' }] },
    { id: 's2', full: [{ blobId: 'b4' }] },
  ];
  assert.deepEqual(blobIdsDasMusicas(songs), ['b1', 'b2', 'b3', 'b4']);
});

test('ignora blobId nulo e coleções ausentes', () => {
  const songs = [
    { id: 's1', cifra: { imagens: [{ blobId: null }, { blobId: 'b1' }] } },
    { id: 's2', cifra: { tipo: 'texto', texto: 'C  G' }, stems: [], full: [] },
    { id: 's3' },
  ];
  assert.deepEqual(blobIdsDasMusicas(songs), ['b1']);
});

test('nenhuma música, nenhum arquivo', () => {
  assert.deepEqual(blobIdsDasMusicas([]), []);
});

// Este é o contrato que `exportLibrary` passa a consumir no lugar do laço
// inline dele: a mesma música, os mesmos ids, na mesma ordem.
test('a música completa devolve imagens, stems e full nessa ordem', () => {
  const s = {
    id: 's1',
    cifra: { tipo: 'imagem', imagens: [{ tipo: 'aberta', blobId: 'img-a' }, { tipo: 'fechada', blobId: 'img-f' }] },
    stems: [{ nome: 'voz', blobId: 'st-1' }, { nome: 'violão', blobId: 'st-2' }],
    full: [{ nome: 'original', blobId: 'fu-1' }],
  };
  assert.deepEqual(blobIdsDasMusicas([s]), ['img-a', 'img-f', 'st-1', 'st-2', 'fu-1']);
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `cd app && node --test test/apagar.test.js`
Expected: FAIL — o arquivo nem carrega. `SyntaxError: The requested module '../js/state.js' does not provide an export named 'blobIdsDasMusicas'`.

- [ ] **Step 3: Implementar as duas puras**

Em `app/js/state.js`, logo depois de `songIdsDasFontes` (~linha 180):

```js
// Os arquivos que estas músicas levam junto quando somem. Também é o que o
// export precisa saber para montar o pacote — uma definição só de "quais blobs
// são desta música", para nenhuma das duas esquecer um campo novo de mídia.
export function blobIdsDasMusicas(songs) {
  const out = [];
  for (const s of songs) {
    (s.cifra?.imagens || []).forEach((im) => im && im.blobId && out.push(im.blobId));
    (s.stems || []).forEach((st) => st && st.blobId && out.push(st.blobId));
    (s.full || []).forEach((f) => f && f.blobId && out.push(f.blobId));
  }
  return out;
}

// Quem fica sem NENHUMA música depois de apagar `ids` (um Set). Uma passada
// sobre a biblioteca inteira, e não um `S.songs.some()` por música apagada:
// com 5 mil ids a segunda forma é O(n²) e trava o app.
export function artistasOrfaos(songs, ids) {
  const vivos = new Set();
  const tocados = new Set();
  for (const s of songs) {
    if (!s.artistId) continue;
    if (ids.has(s.id)) tocados.add(s.artistId); else vivos.add(s.artistId);
  }
  return [...tocados].filter((a) => !vivos.has(a));
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `cd app && node --test test/apagar.test.js`
Expected: PASS, 9 testes.

- [ ] **Step 5: `exportLibrary` passa a usar a pura**

Em `app/js/backup.js`, trocar o laço inline por uma chamada. A linha do import (`app/js/backup.js:5`) já traz `S` de `state.js`, então basta acrescentar o nome:

```js
import { S, blobIdsDasMusicas } from './state.js';
```

e dentro de `exportLibrary`, substituir estas seis linhas:

```js
  const blobIds = [];
  corte.songs.forEach((s) => {
    (s.cifra?.imagens || []).forEach((im) => im.blobId && blobIds.push(im.blobId));
    (s.stems || []).forEach((st) => st.blobId && blobIds.push(st.blobId));
    (s.full || []).forEach((f) => f.blobId && blobIds.push(f.blobId));
  });
```

por esta:

```js
  const blobIds = blobIdsDasMusicas(corte.songs);
```

Isto não é escopo extra: sem a troca, o app passa a ter **duas** definições de "quais arquivos são desta música", e no dia em que um campo novo de mídia entrar, uma das duas vai esquecer dele — e a que esquecer no `exportLibrary` gera backup incompleto em silêncio.

- [ ] **Step 6: Verificar sintaxe e a suíte inteira**

Run: `cd app && node --check js/state.js && node --check js/backup.js && node --test`
Expected: os dois `--check` sem saída, e a suíte inteira PASS (incluindo `export.test.js`, que cobre `recorteParaExport`).

Nota: `exportLibrary` em si não tem teste automatizado — precisa de DOM e de DB. A troca do Step 5 é conferida na verificação manual da Tarefa 4 ("exportar uma fonte e conferir que o arquivo tem o tamanho de sempre").

- [ ] **Step 7: Commit**

```bash
git add app/js/state.js app/js/backup.js app/test/apagar.test.js
git commit -m "feat: artistasOrfaos e blobIdsDasMusicas, as puras do apagar em lote

Quem fica sem musica nenhuma e quais arquivos as musicas levam junto —
as duas decisoes do apagar em lote que dao para testar sem navegador.
Ambas O(n): a versao com um some() por musica apagada trava o app com
os 5.523 ids de uma fonte grande.

blobIdsDasMusicas tambem substitui o laco identico dentro de
exportLibrary, para nao existirem duas definicoes de 'quais blobs sao
desta musica' para um campo de midia novo dessincronizar."
```

---

### Task 2: O motor e a persistência em lote

**Files:**
- Modify: `app/js/db.js` — três métodos novos junto dos existentes (~linhas 84-89)
- Modify: `app/js/state.js:288-310` — `deleteSong` vira `deleteSongs`

**Interfaces:**
- Consumes: `blobIdsDasMusicas(songs)` e `artistasOrfaos(songs, ids)` da Tarefa 1.
- Produces:
  - `DB.deleteSongs(ids)`, `DB.deleteArtists(ids)`, `DB.putLists(ls)` → `Promise<void>`. Aceitam `Set` ou array.
  - `export async function deleteSongs(ids, { manterEmListas = false } = {})` → `Promise<void>`. `ids` aceita `Set` ou array.
  - `export function deleteSong(songId)` → `Promise<void>`. Mantém a assinatura de hoje; `main.js` e `play.js` não mudam.

**Sem teste automatizado nesta tarefa:** o orquestrador só faz sentido contra IndexedDB e OPFS, e não há harness de DOM no projeto. O que protege esta tarefa é (a) a suíte inteira continuar verde, porque quatro arquivos de teste importam `state.js` e qualquer erro de sintaxe ou de export os derruba, e (b) a verificação manual do Step 5, que exercita o caminho antigo — apagar **uma** música — agora reimplementado sobre o lote.

- [ ] **Step 1: Três operações em lote no `db.js`**

Em `app/js/db.js`, logo depois de `deleteList` (linha 89):

```js
  // Lote: uma transação para o conjunto inteiro. Apagar as 5.523 músicas de uma
  // fonte chamando deleteSong() seriam 5.523 transações — dezenas de segundos
  // com a tela travada. Aceitam Set ou array.
  deleteSongs(ids) { return tx('songs', 'readwrite', (s) => { for (const id of ids) s.delete(id); }); },
  deleteArtists(ids) { return tx('artists', 'readwrite', (s) => { for (const id of ids) s.delete(id); }); },
  putLists(ls) { return tx('lists', 'readwrite', (s) => { for (const l of ls) s.put(l); }); },
```

- [ ] **Step 2: Verificar a sintaxe**

Run: `cd app && node --check js/db.js`
Expected: sem saída.

- [ ] **Step 3: `deleteSong` vira um caso do lote**

Em `app/js/state.js`, substituir a função `deleteSong` inteira (linhas 288-310) por:

```js
// Apaga um conjunto de músicas de uma vez. O motor NÃO sabe o que é fonte:
// quem chama traduz o eixo dele para ids — songIdsDasFontes, para o eixo fonte.
//
// A ordem é deliberada: metadados primeiro, arquivos depois. A operação não é
// atômica (são várias transações mais um removeEntry por arquivo no OPFS), e se
// o navegador morrer no meio, o pior caso desta ordem é byte órfão ocupando
// espaço — invisível e recuperável. Na ordem inversa o pior caso seria música
// na biblioteca apontando para imagem e áudio que não existem mais.
//
// manterEmListas: os ids continuam nas listas, sem aparecer, e reimportar
// aquela fonte cura o repertório sozinho. É o modo do apagar-por-fonte. O
// padrão (false) poda, que é o que apagar uma música avulsa sempre fez: ali
// você matou AQUELA música, e ela não deve voltar sozinha.
export async function deleteSongs(ids, { manterEmListas = false } = {}) {
  const alvo = ids instanceof Set ? ids : new Set(ids || []);
  if (!alvo.size) return;
  const vitimas = S.songs.filter((s) => alvo.has(s.id));
  if (!vitimas.length) return;

  const blobs = blobIdsDasMusicas(vitimas);
  const orfaos = artistasOrfaos(S.songs, alvo);   // antes de mexer em S.songs

  if (!manterEmListas) {
    const mudadas = S.lists.filter((l) => l.musicas.some((id) => alvo.has(id)));
    for (const l of mudadas) l.musicas = l.musicas.filter((id) => !alvo.has(id));
    if (mudadas.length) await DB.putLists(mudadas);
  }

  S.songs = S.songs.filter((s) => !alvo.has(s.id));
  await DB.deleteSongs(alvo);

  // Artista sem música nenhuma some da biblioteca: artista vazio é lixo para o
  // usuário apagar à mão.
  if (orfaos.length) {
    const fora = new Set(orfaos);
    S.artists = S.artists.filter((a) => !fora.has(a.id));
    await DB.deleteArtists(orfaos);
  }

  if (S.currentSongId && alvo.has(S.currentSongId)) S.currentSongId = null;

  for (const id of blobs) await DB.deleteBlob(id);
}

export function deleteSong(songId) { return deleteSongs([songId]); }
```

- [ ] **Step 4: Verificar sintaxe e a suíte inteira**

Run: `cd app && node --check js/state.js && node --test`
Expected: `--check` sem saída, suíte inteira PASS.

- [ ] **Step 5: Verificação manual — o caminho antigo não regrediu**

Esta é a única proteção real do refactor: apagar uma música avulsa passou a ser um caso do lote, e o comportamento tem que ser idêntico ao de antes.

```bash
cd app && python3 -m http.server 8137
```

Em `http://localhost:8137`, numa biblioteca de teste (ver "Segurança na verificação manual"):

1. Abrir uma música que tenha **imagem ou áudio** e que esteja **dentro de alguma lista**.
2. Menu `⋯` → Excluir → confirmar.
3. Conferir: a música sumiu da biblioteca; **sumiu da lista** (o contador do cabeçalho da lista caiu); o artista sumiu das Artistas **se era a última música dele**, e continua lá se ainda tem outra; recarregar a página (F5) e tudo continuar como ficou — se voltou, o IndexedDB não foi escrito.
4. Repetir com uma música **de texto, sem mídia e fora de qualquer lista** — o caminho onde as coleções são vazias.

- [ ] **Step 6: Commit**

```bash
git add app/js/db.js app/js/state.js
git commit -m "feat: deleteSongs — apagar um conjunto de musicas de uma vez

Tres operacoes em lote no db.js (deleteSongs, deleteArtists, putLists),
uma transacao para o conjunto inteiro, e deleteSong passa a ser
deleteSongs([id]) — um codigo so para os dois caminhos.

Metadados primeiro, arquivos depois: a operacao nao e atomica, e nessa
ordem um crash no meio deixa byte orfao (invisivel, recuperavel) em vez
de musica apontando para imagem que nao existe mais.

manterEmListas deixa os ids nas listas para o apagar-por-fonte; o padrao
continua podando, como apagar uma musica avulsa sempre fez."
```

---

### Task 3: A linha de fonte com a lixeira

Ainda **inerte**: a lixeira renderiza, mas `deleteFonteAsk` não existe até a Tarefa 4. É de propósito — a revisão visual acontece antes de existir caminho destrutivo.

**Files:**
- Modify: `app/js/i18n/pt.js`, `app/js/i18n/en.js` — 1 chave em cada, junto das outras `settings.export.*` (~linha 42)
- Modify: `app/css/app.css` — 4 regras, junto das regras de `.check-row` (~linhas 227-232)
- Modify: `app/js/render/settings.js:120-151` — a função `blocoExportar`

**Interfaces:**
- Consumes: nada das tarefas anteriores.
- Produces: os botões `data-a="deleteFonteAsk"` com `data-id` = a grafia salva da fonte (ou `__sem_fonte`), que a Tarefa 4 vai atender.

- [ ] **Step 1: A chave do rótulo acessível, nas duas tabelas**

Em `app/js/i18n/pt.js`, depois de `'settings.export.fileMulti'` (linha 42):

```js
  'settings.export.delFonte': 'Excluir as músicas da fonte {name}',
```

Em `app/js/i18n/en.js`, na mesma posição:

```js
  'settings.export.delFonte': 'Delete the songs from the source {name}',
```

- [ ] **Step 2: Rodar o teste de paridade**

Run: `cd app && node --test test/i18n.test.js`
Expected: PASS. Se falhar com "faltam em en.js: settings.export.delFonte", a chave entrou em uma tabela só.

- [ ] **Step 3: O CSS da lixeira**

Em `app/css/app.css`, logo depois da regra `.check-row .ct` (linha 232):

```css
/* A linha de fonte em Configurações tem DOIS botões (marcar / excluir), então
   ela é um <div> e não um <button> — botão dentro de botão é HTML inválido.
   .check-main repete o layout que a .check-row tinha como botão, e quem usa a
   .check-row como botão (o popover "Adicionar à lista") não muda. */
.check-row.has-del{padding-right:4px}
.check-main{flex:1;min-width:0;display:flex;align-items:center;gap:13px;height:52px;background:transparent;border:none;padding:0;cursor:pointer}
.check-row .del{width:44px;height:44px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:transparent;border:none;border-radius:11px;color:var(--muted2);cursor:pointer}
.check-row .del:hover{color:var(--red);background:var(--red-tint)}
```

A lixeira é discreta (sem borda, sem fundo, `--muted2`, vermelha só no hover) mas o alvo de toque é **44×44** dentro da linha de 52px: no tablet não existe hover, e o dedo não negocia.

- [ ] **Step 4: A nova `blocoExportar`**

Em `app/js/render/settings.js`, substituir a função `blocoExportar` inteira (linhas 120-151) por:

```js
// O bloco Exportar. As linhas vêm de fontesDaBiblioteca — mais usadas primeiro,
// "Sem fonte" por último. O data-id carrega a GRAFIA SALVA da fonte, nunca
// traduzida: ela é conteúdo do usuário. Só o balde usa o sentinela, com o
// rótulo traduzido no que se vê.
//
// Cada linha tem dois botões: marcar (seleção do export) e a lixeira (apagar
// aquelas músicas). São ações opostas na mesma linha, e o que as separa é o
// confirm(), que nomeia a fonte e a contagem.
function blocoExportar() {
  const fontes = fontesDaBiblioteca(S.songs);
  const sel = S.exportFontes;                        // null = todas
  const marcada = (nome) => sel === null || sel.includes(nome);
  const n = sel === null ? S.songs.length : songIdsDasFontes(S.songs, sel).size;
  const rotulo = (f) => (f.nome === SEM_FONTE ? t('home.fonte.none') : f.nome);

  // A linha mestra só existe com duas fontes ou mais: com uma só ela seria uma
  // cópia da linha de baixo. As LINHAS, ao contrário, aparecem a partir de uma
  // — senão uma biblioteca de teste com fonte única ficaria sem lixeira
  // nenhuma, que é justamente o caso que motivou o recurso.
  const mestra = fontes.length < 2 ? '' : `
    <button class="check-row" data-a="toggleExportAll">
      <span class="checkbox ${sel === null ? 'on' : ''}">${sel === null ? I.check(15) : ''}</span>
      <span class="nm">${t('home.fonte.all')}</span>
      <span class="ct">${S.songs.length}</span>
    </button>
    <div style="height:1px;background:var(--border);margin:4px 12px"></div>`;

  const linhas = mestra + fontes.map((f) => {
    const del = esc(t('settings.export.delFonte', { name: rotulo(f) }));
    return `
    <div class="check-row has-del">
      <button class="check-main" data-a="toggleExportFonte" data-id="${esc(f.nome)}">
        <span class="checkbox ${marcada(f.nome) ? 'on' : ''}">${marcada(f.nome) ? I.check(15) : ''}</span>
        <span class="nm">${esc(rotulo(f))}</span>
        <span class="ct">${f.n}</span>
      </button>
      <button class="del" data-a="deleteFonteAsk" data-id="${esc(f.nome)}" title="${del}" aria-label="${del}">${I.trash(16)}</button>
    </div>`;
  }).join('');

  const acao = n
    ? t('settings.export.action', { count: n, song: t(n === 1 ? 'common.song' : 'common.songs') })
    : t('settings.export.nothing');

  return `<div class="setting-block" style="padding:20px;margin-top:6px">
    <div style="font-family:var(--f-title);font-weight:600;font-size:17px;margin-bottom:4px">${t('settings.export.heading')}</div>
    <div style="color:var(--muted);font-size:13px;margin-bottom:10px">${t('settings.export.sub')}</div>
    ${linhas}
    <button class="btn-primary" style="width:100%;margin-top:12px" data-a="exportBackup" ${n ? '' : 'disabled'}>${I.download()}${acao}</button>
  </div>`;
}
```

Três detalhes que não são óbvios:

- A variável local do rótulo do botão Exportar mudou de nome (`rotulo` → `acao`) porque `rotulo` agora é a função que dá o nome visível de uma fonte. Não trocar um dos dois deixa um `TypeError` silencioso.
- `esc()` embrulha o resultado de `t()`, e não o contrário: o nome da fonte é conteúdo do usuário e pode ter aspas, que quebrariam o atributo.
- Com `fontes.length === 0` (biblioteca vazia), `mestra` é `''` e o `.map` devolve `''` — a lista some sozinha, sem guarda extra.

- [ ] **Step 5: Verificar sintaxe e a suíte**

Run: `cd app && node --check js/render/settings.js && node --test`
Expected: `--check` sem saída, suíte PASS.

- [ ] **Step 6: Verificação manual — só olhar**

```bash
cd app && python3 -m http.server 8137
```

Em `http://localhost:8137` → Configurações → bloco "Exportar biblioteca":

1. Cada fonte tem uma lixeira **à direita da contagem**, apagadinha; passar o mouse deixa ela vermelha com fundo suave.
2. **"Todas as fontes" não tem lixeira.**
3. Clicar na lixeira **não faz nada** (a ação ainda não existe) e **não marca/desmarca** a caixinha da linha.
4. Clicar em qualquer outro ponto da linha continua marcando e desmarcando, e a contagem do botão Exportar continua acompanhando.
5. O popover "Adicionar à lista" (numa música, botão de lista) continua igual — ele usa a mesma `.check-row`.
6. **Caso de uma fonte só:** abrir uma janela anônima em `http://localhost:8137`, ir em Configurações → "Trazer músicas de exemplo". A biblioteca fica com uma fonte só ("Sem fonte"): a linha aparece **com lixeira** e **sem a linha "Todas as fontes"**.
7. No tablet (ou com o DevTools em modo dispositivo, ~800px): dá para acertar a lixeira sem acertar a caixinha, e vice-versa.

- [ ] **Step 7: Commit**

```bash
git add app/js/render/settings.js app/css/app.css app/js/i18n/pt.js app/js/i18n/en.js
git commit -m "feat: lixeira em cada linha de fonte no bloco Exportar

A linha vira um <div> com dois botoes — marcar e excluir — porque botao
dentro de botao e HTML invalido; .check-main repete o layout que a
.check-row tinha, e o popover que usa a mesma classe nao muda.

A lista de fontes passa a aparecer com UMA fonte (antes, duas): sem
isso, importar uma biblioteca de teste num aparelho vazio deixaria a
unica fonte sem lixeira nenhuma. Com uma so, some a linha mestra, que
seria copia dela.

A acao ainda nao existe: o clique cai no caminho de fechar menus. E de
proposito — a revisao visual vem antes do caminho destrutivo."
```

---

### Task 4: A ação — confirmar, apagar, reconciliar

**Files:**
- Modify: `app/js/i18n/pt.js`, `app/js/i18n/en.js` — 4 chaves em cada, depois do bloco `msg.backup.*` (~linha 277)
- Modify: `app/js/main.js` — o import de `state.js` (linhas 2-7), a flag de módulo e a ação nova
- Modify: `app/sw.js:2` — `VERSION`
- Modify: `pendencias.md`

**Interfaces:**
- Consumes: `deleteSongs(ids, { manterEmListas })` da Tarefa 2; os botões `data-a="deleteFonteAsk"` da Tarefa 3; `songIdsDasFontes`, `SEM_FONTE` e `matchesFonte`, já exportados de `state.js`.
- Produces: `actions.deleteFonteAsk(d)` — fecha o recurso.

- [ ] **Step 1: As quatro chaves, nas duas tabelas**

Em `app/js/i18n/pt.js`, depois de `'msg.backup.invalidBackup'` (~linha 277):

```js
  'msg.fonte.confirmDelete': 'Excluir as {count} {song} da fonte "{name}" deste aparelho? As cifras, os áudios e as imagens vão junto, e não dá para desfazer. Exporte antes se quiser guardar.',
  'msg.fonte.deleting': 'Excluindo...',
  'msg.fonte.deleted': 'Fonte excluída: {name} · {count} {song}',
  'msg.fonte.deleteFailed': 'Falha ao excluir: {error}',
```

Em `app/js/i18n/en.js`, na mesma posição:

```js
  'msg.fonte.confirmDelete': 'Delete the {count} {song} from the source "{name}" on this device? Charts, audio and images go with them, and there is no undo. Export first if you want to keep them.',
  'msg.fonte.deleting': 'Deleting...',
  'msg.fonte.deleted': 'Source deleted: {name} · {count} {song}',
  'msg.fonte.deleteFailed': 'Delete failed: {error}',
```

O plural sai de `common.song` / `common.songs`, como em `msg.backup.confirmReplace`. O rótulo do balde reaproveita `home.fonte.none`, que já existe — duplicar seria criar uma segunda verdade para o mesmo texto.

- [ ] **Step 2: Rodar o teste de paridade**

Run: `cd app && node --test test/i18n.test.js`
Expected: PASS.

- [ ] **Step 3: Os imports novos em `main.js`**

Em `app/js/main.js`, no import de `./state.js` (linhas 2-7), acrescentar `deleteSongs`, `SEM_FONTE` e `matchesFonte` — `songIdsDasFontes` e `fontesDaBiblioteca` já estão lá:

```js
import {
  S, audio, initState, applyTheme, saveSettings,
  songById, openSong as goSong, currentSong, toggleFav, deleteSong, deleteSongs, saveSong,
  createList, listById, toggleSongInList, reorderInList, favList, indicesPresentes,
  persistCurrentStems, applyVarToSongs, fontesDaBiblioteca, songIdsDasFontes,
  SEM_FONTE, matchesFonte,
} from './state.js';
```

- [ ] **Step 4: A guarda de reentrância**

Em `app/js/main.js`, imediatamente antes de `const actions = {` (linha 209):

```js
// Uma exclusão de fonte por vez. O confirm() é modal e segura a thread, mas o
// trabalho DEPOIS dele é assíncrono: sem esta guarda, dois cliques em lixeiras
// diferentes rodam concorrentes, e o segundo S.songs = S.songs.filter(...)
// escreve por cima do primeiro sem deixar rastro.
let apagandoFonte = false;
```

- [ ] **Step 5: A ação**

Em `app/js/main.js`, dentro do objeto `actions`, logo depois de `toggleExportFonte` (~linha 578) e antes de `exportBackup`:

```js
  // Apaga todas as músicas de uma fonte. O motor recebe ids: aqui só se traduz
  // o eixo, se confirma e se reconcilia o que ficou apontando para o vazio.
  async deleteFonteAsk(d) {
    if (apagandoFonte) return;
    const ids = songIdsDasFontes(S.songs, [d.id]);
    if (!ids.size) return;
    const n = ids.size;
    // O nome vai CRU no confirm(): diálogo nativo é texto puro, e um esc()
    // aqui faria aparecer &quot; na tela. No aria-label da lixeira é o oposto.
    const name = d.id === SEM_FONTE ? t('home.fonte.none') : d.id;
    const song = t(n === 1 ? 'common.song' : 'common.songs');
    if (!confirm(t('msg.fonte.confirmDelete', { count: n, song, name }))) return;
    apagandoFonte = true;
    toast(t('msg.fonte.deleting'));
    try {
      await deleteSongs(ids, { manterEmListas: true });
      // Os ids ficam nas listas de propósito: reimportar esta fonte depois cura
      // o repertório sozinho, que é o principal motivo de apagar por fonte.
      //
      // Duas coisas guardam GRAFIA de fonte e podem estar apontando para a que
      // acabou de sumir. A seleção do export volta para "todas", como no
      // import; a lente da home só cai se não sobrou música nenhuma para ela.
      S.exportFontes = null;
      if (S.fonteFilter !== null && !S.songs.some(matchesFonte)) S.fonteFilter = null;
      update();
      toast(t('msg.fonte.deleted', { name, count: n, song }));
    } catch (e) {
      update();
      toast(t('msg.fonte.deleteFailed', { error: e.message }));
    } finally {
      apagandoFonte = false;
    }
  },
```

A barra de armazenamento não precisa de nada: `main.js:94` já chama `fillStorageInfo()` a cada render de Configurações, então o `update()` acima mostra o espaço liberado sozinho.

- [ ] **Step 6: Verificar sintaxe e a suíte**

Run: `cd app && node --check js/main.js && node --test`
Expected: `--check` sem saída, suíte PASS.

- [ ] **Step 7: Subir a `VERSION` do Service Worker**

Em `app/sw.js`, linha 2: `const VERSION = 'somaplay-v36';` → `const VERSION = 'somaplay-v37';`

Sem isto, quem já instalou o app continua rodando o JS e o CSS antigos — o Service Worker é cache-first. O `SHELL` **não muda**: nenhum módulo novo entrou.

Run: `cd app && node --test test/shell.test.js`
Expected: PASS.

- [ ] **Step 8: Verificação manual — o roteiro completo**

**Leia antes a seção "Segurança na verificação manual".** Este é o primeiro caminho do app que apaga em lote.

```bash
cd app && python3 -m http.server 8137
```

Numa biblioteca de teste com pelo menos **duas fontes**, uma lista misturando as duas, e músicas com imagem e áudio:

1. **Cancelar não apaga.** Lixeira → o diálogo nomeia a fonte e a contagem → Cancelar → nada muda.
2. **Apagar apaga.** Lixeira → OK → toast "Excluindo...", depois "Fonte excluída: X · N músicas". A linha da fonte some da lista, e a contagem do botão Exportar cai.
3. **A barra de armazenamento encolhe** — de verdade, com fonte que tenha imagem ou áudio. É o teste de que os blobs foram apagados, e não só os metadados.
4. **F5.** Tudo continua como ficou. Se voltou, o IndexedDB não foi escrito.
5. **O artista certo some.** Um artista que só tinha músicas daquela fonte sai das Artistas; um que tinha das duas fontes fica, com as que sobraram.
6. **A lista se cura.** Antes de apagar, exporte aquela fonte pelo botão Exportar. Depois de apagar, confira que a lista mostra só as músicas que sobraram, com a numeração 1..n sem buraco e o arrastar funcionando. Então importe o arquivo de volta em **Adicionar/atualizar**: as músicas voltam **para dentro da lista**, no lugar delas. Este é o comportamento que justifica a decisão de manter os ids.
7. **O arquivo do export continua certo** (cobre o refactor da Tarefa 1): exportar com tudo marcado gera um arquivo do mesmo tamanho de sempre, com os áudios e as imagens dentro — importe num perfil limpo e abra uma música com mídia.
8. **A lente não fica fantasma.** Filtre a home por uma fonte, vá em Configurações, apague **essa** fonte: ao voltar, a home está cheia e sem filtro. Repita apagando **outra** fonte: o filtro anterior continua de pé.
9. **A seleção do export volta para "todas"** depois de qualquer exclusão.
10. **Apagar a última fonte** deixa a lista some, o botão Exportar desabilitado, e o app inteiro de pé.
11. **PT/EN:** com o app em inglês, o diálogo e o `aria-label` estão em inglês; o **nome da fonte não traduz**. Só "Sem fonte"/"No source" troca, porque é rótulo, não grafia salva.
12. **Fonte grande.** Se houver uma fonte com milhares de músicas numa biblioteca de teste, cronometre: o toast "Excluindo..." aparece **antes** do trabalho, e a tela volta em poucos segundos. Se demorar dezenas de segundos, algo voltou a ser O(n²).

- [ ] **Step 9: Registrar em `pendencias.md`**

Na tabela **App** de `pendencias.md`, acrescentar a linha:

```markdown
| 2026-08-13 | **Importar era irreversível na prática.** Só dava para sair de uma importação apagando música por música (inviável com 5.523) ou usando "Substituir tudo", que exige ter em mãos um arquivo com o que se queria manter. Pedido do usuário: "Sem ele, o Somaplay não pode nem ser usado por outras pessoas, porque fica muito difícil administrar um a um. Às vezes importamos bibliotecas inteiras como teste." | **Resolvido** — lixeira por fonte no bloco "Exportar biblioteca" das Configurações, com `confirm()` nomeando fonte e contagem. O motor (`deleteSongs`) recebe ids e não sabe o que é fonte, como o do export; as músicas apagadas **continuam nas listas como id órfão**, então reimportar aquela fonte cura o repertório sozinho. Spec `2026-08-13-apagar-fonte-design.md`. SW v37. |
```

- [ ] **Step 10: Commit**

```bash
git add app/js/main.js app/js/i18n/pt.js app/js/i18n/en.js app/sw.js pendencias.md
git commit -m "feat: apagar todas as musicas de uma fonte, com confirmacao

Fecha o recurso: a lixeira da linha traduz a fonte para ids com
songIdsDasFontes, confirma nomeando fonte e contagem, e chama
deleteSongs com manterEmListas — os ids ficam nas listas, entao
reimportar aquela fonte cura o repertorio sozinho.

Depois de apagar, duas coisas ficariam apontando para o vazio: a
selecao do export volta para 'todas' (como no import) e a lente da home
cai se nao sobrou musica para ela. Uma guarda de modulo impede duas
exclusoes concorrentes, que se sobrescreveriam em silencio.

SW v37."
```

---

## Segurança na verificação manual

Este plano cria o primeiro caminho do app que apaga milhares de músicas de uma vez, e a máquina de desenvolvimento pode ter a biblioteca real do autor — 5.925 músicas em `http://localhost:8137`, o mesmo `origin` de sempre.

**Antes de qualquer verificação que apague de verdade:**

1. **Exporte um backup completo** em Configurações → Exportar biblioteca, com tudo marcado, e confirme que o arquivo `.somaplay` está no disco com tamanho plausível.
2. **Prefira uma janela anônima.** No Chrome, uma janela anônima tem armazenamento próprio: o IndexedDB e o OPFS que o app usa lá **não são os da janela normal**. Importe nela um `.somaplay` pequeno (ou use "Trazer músicas de exemplo") e faça as exclusões ali.
3. **Nunca teste apagando a fonte VJ da biblioteca real** só para cronometrar. Se precisar medir com volume, importe um arquivo grande numa janela anônima.
4. A verificação no tablet, com a biblioteca de verdade, é a última — e só depois do backup do passo 1.

## Verificação final (depois das quatro tarefas)

- [ ] `cd app && node --test` — suíte inteira verde, incluindo os 9 testes novos de `apagar.test.js`
- [ ] `cd app && node --check js/state.js js/db.js js/backup.js js/main.js js/render/settings.js`
- [ ] O roteiro manual do Step 8 da Tarefa 4, ponto a ponto
- [ ] `git log --oneline -4` mostra os quatro commits, um por tarefa
- [ ] `app/sw.js` linha 2 em `'somaplay-v37'`, `SHELL` intocado
