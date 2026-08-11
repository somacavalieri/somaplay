# Exportar com filtro de fontes — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** permitir exportar a biblioteca recortada por fonte (só o Songbook, só a VJ, ou qualquer combinação), num arquivo `.somaplay` autossuficiente, e reorganizar Configurações em três blocos — Armazenamento, Exportar, Importar.

**Architecture:** o motor de exportação **não sabe o que é fonte**. `state.js` traduz o eixo fonte num `Set` de ids de música (`songIdsDasFontes`); `backup.js` recebe esse `Set` e devolve as coleções recortadas (`recorteParaExport`); a UI liga um no outro. É esse desenho que deixa "exportar este artista" e "exportar esta lista" entrarem depois sem tocar em `backup.js`. As listas viajam **inteiras**, com ids órfãos e tudo: elas se completam sozinhas quando a outra fonte for importada.

**Tech Stack:** ES modules servidos como estão. Sem dependência, sem build, sem gerenciador de pacote. Testes com `node --test` (Node ≥ 20). Spec: `docs/superpowers/specs/2026-08-11-export-com-filtro-design.md`.

## Global Constraints

- **Nada de dependência nova, nada de build.** O app é servido como está.
- **Toda mudança em `app/css/` ou `app/js/` exige bump de `VERSION` em `app/sw.js:2` antes do merge.** Neste plano o bump acontece **uma vez, na Tarefa 6** — não uma vez por tarefa. As Tarefas 1–5 mexem em `app/js/` sem bump de propósito: commit intermediário de branch não é publicado, e só o estado final do branch chega ao usuário. O `SHELL` **não** muda: nenhum módulo novo.
- **Nada de `t()` em valor de `data-*`.** O `data-id` da linha de fonte carrega a **grafia salva** (conteúdo do usuário), nunca traduzida. Só o balde sem fonte usa o sentinela `__sem_fonte` no `data-id`, com o rótulo traduzido no que se vê.
- **Chave de tradução entra nas DUAS tabelas** (`js/i18n/pt.js` e `js/i18n/en.js`). `test/i18n.test.js` cobra a paridade. Nada de constante de módulo guardando texto traduzido — ela congela no import e não acompanha a troca de idioma.
- **Nunca renomear `DB_NAME` em `app/js/db.js`.** Não se aplica a nenhuma tarefa aqui, mas vale se surgir.
- **Verificar com `cd app && node --test` e `node --check`.** UI é verificação manual no navegador — não há harness de DOM, de propósito.
- **Commitar apenas os arquivos listados em cada tarefa, nunca `git add -A`.** Há trabalho não relacionado na árvore: `pendencias.md` modificado e `docs/campo_armonico/` sem rastrear. Nenhum dos dois entra em commit nenhum deste plano.
- **Comentário de código novo em inglês** (regra do CLAUDE.md) — **exceto** em `app/js/` e `app/test/`, onde todo o código existente comenta em português. Siga o arquivo em que você está mexendo: neste plano, tudo é português.

## Estrutura de arquivos

| arquivo | responsabilidade | tarefa |
|---|---|---|
| `app/js/state.js` | domínio de fonte → `Set` de ids; `S.exportFontes`; contagem de lista sem órfão | 1, 4, 5 |
| `app/js/backup.js` | recorte e montagem do arquivo. Não sabe o que é fonte | 2, 3 |
| `app/test/fontes.test.js` | `songIdsDasFontes` (arquivo existente, ganha uma seção) | 1 |
| `app/test/export.test.js` | `recorteParaExport` e `nomeDoExport` (**arquivo novo**) | 2, 3 |
| `app/js/render/settings.js` | os três blocos | 4 |
| `app/js/main.js` | ações `toggleExportAll`, `toggleExportFonte`, `exportBackup` | 4 |
| `app/js/i18n/pt.js`, `en.js` | chaves novas, quatro aposentadas | 4 |
| `app/css/app.css` | uma linha: `.btn-ghost.danger` | 4 |
| `app/js/render/listscreen.js`, `home.js`, `popover.js` | contadores de lista | 5 |
| `app/sw.js` | bump de `VERSION` | 6 |

---

### Task 1: `songIdsDasFontes` — o eixo fonte vira um conjunto de ids

**Files:**
- Modify: `app/js/state.js` (inserir logo depois de `matchesFonte`, hoje na linha 151)
- Test: `app/test/fontes.test.js` (acrescentar seção ao final)

**Interfaces:**
- Consumes: `fonteOf(s)`, `fonteCasa(fonteDaMusica, filtro)`, `SEM_FONTE` — já existem em `state.js`.
- Produces: `songIdsDasFontes(songs, fontes) → Set<string>`. `songs` é um array de músicas; `fontes` é um array de grafias exibidas e/ou o sentinela `SEM_FONTE`. As Tarefas 2 e 4 dependem desse nome e desse tipo de retorno.

- [ ] **Passo 1: escrever os testes que falham**

Acrescente ao **final** de `app/test/fontes.test.js`:

```js
// --- a seleção que a exportação usa ---------------------------------------
// O motor de export não sabe o que é fonte: ele recebe um conjunto de ids.
// Esta é a função que traduz o eixo "fonte" nesse conjunto — e é aqui que um
// eixo novo (artista, lista) entraria amanhã, sem tocar em backup.js.

test('nenhuma fonte marcada não seleciona nada', () => {
  assert.deepEqual([...songIdsDasFontes([{ id: 'a', fonte: 'Songbook' }], [])], []);
});

test('marca as músicas da fonte escolhida, apesar da grafia', () => {
  const songs = [
    { id: 'a', fonte: 'Songbook' },
    { id: 'b', fonte: ' songbook ' },
    { id: 'c', fonte: 'CifraClub' },
  ];
  assert.deepEqual([...songIdsDasFontes(songs, ['Songbook'])], ['a', 'b']);
});

test('o balde sem fonte pega só quem não tem fonte', () => {
  const songs = [{ id: 'a', fonte: 'Songbook' }, { id: 'b', fonte: '   ' }, { id: 'c' }];
  assert.deepEqual([...songIdsDasFontes(songs, [SEM_FONTE])], ['b', 'c']);
});

test('várias fontes somam, sem repetir id', () => {
  const songs = [
    { id: 'a', fonte: 'Songbook' },
    { id: 'b', fonte: 'CifraClub' },
    { id: 'c', fonte: 'VJ' },
  ];
  const sel = songIdsDasFontes(songs, ['Songbook', 'CifraClub']);
  assert.equal(sel.size, 2);
  assert.deepEqual([...sel], ['a', 'b']);
});

test('fonte que não existe mais na biblioteca não contribui e não quebra', () => {
  assert.deepEqual([...songIdsDasFontes([{ id: 'a', fonte: 'Songbook' }], ['Fonte Apagada'])], []);
});

test('devolve um Set, não um array', () => {
  assert.ok(songIdsDasFontes([], []) instanceof Set);
});

test('tolera biblioteca e seleção ausentes', () => {
  assert.equal(songIdsDasFontes(null, null).size, 0);
});
```

E acrescente `songIdsDasFontes` ao import no topo do arquivo, que hoje é:

```js
import {
  fontesSugeridas, FONTES_FIXAS,
  fontesDaBiblioteca, fonteCasa, fonteOf, SEM_FONTE,
} from '../js/state.js';
```

passando a ser:

```js
import {
  fontesSugeridas, FONTES_FIXAS,
  fontesDaBiblioteca, fonteCasa, fonteOf, SEM_FONTE, songIdsDasFontes,
} from '../js/state.js';
```

- [ ] **Passo 2: rodar para ver falhar**

Rodar: `cd app && node --test test/fontes.test.js`
Esperado: FAIL — `songIdsDasFontes is not a function`.

- [ ] **Passo 3: implementar**

Em `app/js/state.js`, logo **depois** da linha `export function matchesFonte(s) { ... }` (hoje linha 151):

```js
// O motor de exportação não sabe o que é fonte: ele recebe um conjunto de ids
// de música. Esta é a função que traduz o eixo "fonte" nesse conjunto, e é o
// lugar onde um eixo novo (artista, lista) entraria sem tocar em backup.js.
// A comparação é fonteCasa, a mesma da lente: "songbook" e "Songbook " são a
// mesma fonte. Uma fonte marcada que sumiu da biblioteca não contribui.
export function songIdsDasFontes(songs, fontes) {
  const escolhidas = fontes || [];
  const out = new Set();
  for (const s of songs || []) {
    if (escolhidas.some((f) => fonteCasa(fonteOf(s), f))) out.add(s.id);
  }
  return out;
}
```

- [ ] **Passo 4: rodar para ver passar**

Rodar: `cd app && node --test test/fontes.test.js`
Esperado: PASS, todos.

Rodar também: `cd app && node --check js/state.js`
Esperado: sem saída.

- [ ] **Passo 5: commitar**

```bash
git add app/js/state.js app/test/fontes.test.js
git commit -m "feat: turn the source axis into a set of song ids"
```

---

### Task 2: `recorteParaExport` — o motor

**Files:**
- Modify: `app/js/backup.js` (inserir antes de `exportLibrary`, hoje na linha 12)
- Test: `app/test/export.test.js` (**criar**)

**Interfaces:**
- Consumes: nada de outras tarefas. `backup.js` já importa sob Node sem DOM — verificado com `node -e "import('./js/backup.js')"`.
- Produces: `recorteParaExport({ artists, songs, lists }, { songIds, listIds }) → { artists, songs, lists }`. `songIds` e `listIds` são `Set` ou `null`; `null` significa "tudo". A Tarefa 3 depende desse nome e dessa forma.

- [ ] **Passo 1: escrever os testes que falham**

Criar `app/test/export.test.js`:

```js
// export.test.js — o recorte que a exportação filtrada usa.
//
// O motor não sabe o que é fonte: recebe um conjunto de ids de música e um de
// ids de lista, e devolve as três coleções recortadas. É esse desenho que deixa
// "exportar este artista" e "exportar esta lista" entrarem depois sem mexer
// aqui.
//
// A asserção que mais importa é a primeira: com null nos dois, o recorte
// devolve a biblioteca inteira. É ela que garante que o backup completo — o
// caminho que todo usuário já usa hoje — não regrediu quando o filtro entrou.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recorteParaExport } from '../js/backup.js';

const lib = () => ({
  artists: [{ id: 'ar1', name: 'Gil' }, { id: 'ar2', name: 'Caetano' }],
  songs: [
    { id: 's1', artistId: 'ar1', fonte: 'Songbook' },
    { id: 's2', artistId: 'ar1', fonte: 'CifraClub' },
    { id: 's3', artistId: 'ar2', fonte: 'CifraClub' },
  ],
  lists: [
    { id: 'l1', nome: 'Show', musicas: ['s1', 's3'] },
    { id: 'l2', nome: 'Estudo', musicas: ['s2'] },
  ],
});

test('null nos dois campos devolve a biblioteca inteira', () => {
  const estado = lib();
  const r = recorteParaExport(estado, { songIds: null, listIds: null });
  assert.deepEqual(r.artists, estado.artists);
  assert.deepEqual(r.songs, estado.songs);
  assert.deepEqual(r.lists, estado.lists);
});

test('sem o segundo argumento, também devolve tudo', () => {
  const estado = lib();
  assert.deepEqual(recorteParaExport(estado).songs, estado.songs);
});

test('leva só as músicas do conjunto', () => {
  const r = recorteParaExport(lib(), { songIds: new Set(['s1']) });
  assert.deepEqual(r.songs.map((s) => s.id), ['s1']);
});

test('leva só os artistas que têm música no recorte', () => {
  const r = recorteParaExport(lib(), { songIds: new Set(['s1']) });
  assert.deepEqual(r.artists.map((a) => a.id), ['ar1']);
});

test('as listas viajam inteiras, com os ids órfãos preservados', () => {
  // 's3' fica de fora do recorte, mas continua na lista: quando a outra fonte
  // for importada, a lista se completa sozinha no destino.
  const r = recorteParaExport(lib(), { songIds: new Set(['s1']) });
  assert.deepEqual(r.lists.map((l) => l.id), ['l1', 'l2']);
  assert.deepEqual(r.lists[0].musicas, ['s1', 's3']);
});

test('listIds recorta as listas — é o que "exportar esta lista" vai usar', () => {
  const r = recorteParaExport(lib(), { songIds: null, listIds: new Set(['l1']) });
  assert.deepEqual(r.lists.map((l) => l.id), ['l1']);
});

test('conjunto vazio devolve recorte vazio, sem quebrar', () => {
  const r = recorteParaExport(lib(), { songIds: new Set() });
  assert.deepEqual(r.songs, []);
  assert.deepEqual(r.artists, []);
});

test('não muta o estado recebido', () => {
  const estado = lib();
  recorteParaExport(estado, { songIds: new Set(['s1']) });
  assert.equal(estado.songs.length, 3);
  assert.equal(estado.artists.length, 2);
});

test('tolera biblioteca com campos ausentes', () => {
  const r = recorteParaExport({}, { songIds: new Set(['s1']) });
  assert.deepEqual(r, { artists: [], songs: [], lists: [] });
});
```

- [ ] **Passo 2: rodar para ver falhar**

Rodar: `cd app && node --test test/export.test.js`
Esperado: FAIL — `recorteParaExport is not a function` (ou erro de import).

- [ ] **Passo 3: implementar**

Em `app/js/backup.js`, **antes** de `export async function exportLibrary` (hoje linha 12), depois da constante `MAGIC`:

```js
// O recorte de uma exportação. Não sabe o que é fonte: recebe conjuntos de ids
// prontos, e por isso um eixo novo (artista, lista) entra sem mexer aqui.
// null em qualquer campo significa "tudo" — e com null nos dois o resultado é
// a biblioteca inteira, que é o caminho do backup completo de sempre.
//
// Artista sem música no recorte fica de fora: um artista vazio no destino é
// lixo para o usuário apagar à mão. As listas, ao contrário, viajam inteiras —
// são só ids, não pesam nada, e os que faltam se resolvem quando a outra fonte
// for importada. Podá-las perderia dado: o merge substitui a lista pelo id.
export function recorteParaExport(estado, sel) {
  const { artists = [], songs = [], lists = [] } = estado || {};
  const { songIds = null, listIds = null } = sel || {};
  const songsOut = songIds ? songs.filter((s) => songIds.has(s.id)) : songs;
  const comMusica = new Set(songsOut.map((s) => s.artistId));
  const artistsOut = songIds ? artists.filter((a) => comMusica.has(a.id)) : artists;
  const listsOut = listIds ? lists.filter((l) => listIds.has(l.id)) : lists;
  return { artists: artistsOut, songs: songsOut, lists: listsOut };
}
```

- [ ] **Passo 4: rodar para ver passar**

Rodar: `cd app && node --test test/export.test.js`
Esperado: PASS, todos.

Rodar: `cd app && node --test`
Esperado: PASS. Em particular `shell.test.js` continua verde — `export.test.js` está em `test/`, não em `js/`, e portanto não entra no `SHELL`.

- [ ] **Passo 5: commitar**

```bash
git add app/js/backup.js app/test/export.test.js
git commit -m "feat: add the pure export slice, driven by ids instead of sources"
```

---

### Task 3: nome do arquivo e `exportLibrary` recortando de verdade

**Files:**
- Modify: `app/js/backup.js:12-47` (`exportLibrary`)
- Test: `app/test/export.test.js` (acrescentar seção)

**Interfaces:**
- Consumes: `recorteParaExport` da Tarefa 2.
- Produces:
  - `stampDeHoje(d = new Date()) → 'YYYY-MM-DD'`
  - `nomeDoExport(fontes, stamp, palavraFontes) → string` — `fontes` é `null`/vazio para "todas"; `palavraFontes` é o plural traduzido ("fontes"/"sources"), passado de fora para a função ficar pura.
  - `exportLibrary({ songIds, listIds, fileName }) → Promise<void>` — todos opcionais. Sem argumento nenhum, o comportamento é **exatamente** o de hoje. A Tarefa 4 depende dessas três assinaturas.

- [ ] **Passo 1: escrever os testes que falham**

Acrescentar ao final de `app/test/export.test.js`:

```js
// --- nome do arquivo -------------------------------------------------------
// Quatro arquivos chamados somaplay-backup-2026-08-11 na pasta de Downloads não
// servem para nada. O nome precisa dizer o recorte.

test('sem recorte, o nome é o de sempre', () => {
  assert.equal(nomeDoExport(null, '2026-08-11', 'fontes'), 'somaplay-backup-2026-08-11.somaplay');
  assert.equal(nomeDoExport([], '2026-08-11', 'fontes'), 'somaplay-backup-2026-08-11.somaplay');
});

test('uma fonte vira o nome dela', () => {
  assert.equal(nomeDoExport(['Songbook'], '2026-08-11', 'fontes'), 'somaplay-songbook-2026-08-11.somaplay');
});

test('o slug tira acento e espaço', () => {
  assert.equal(nomeDoExport(['Coletâneas VJ'], '2026-08-11', 'fontes'), 'somaplay-coletaneas-vj-2026-08-11.somaplay');
});

test('o balde sem fonte tem nome legível', () => {
  assert.equal(nomeDoExport(['__sem_fonte'], '2026-08-11', 'fontes'), 'somaplay-sem-fonte-2026-08-11.somaplay');
});

test('duas ou mais fontes viram a contagem, na língua do app', () => {
  assert.equal(nomeDoExport(['A', 'B', 'C'], '2026-08-11', 'fontes'), 'somaplay-3-fontes-2026-08-11.somaplay');
  assert.equal(nomeDoExport(['A', 'B'], '2026-08-11', 'sources'), 'somaplay-2-sources-2026-08-11.somaplay');
});

test('uma fonte que vira slug vazio cai no nome genérico', () => {
  assert.equal(nomeDoExport(['###'], '2026-08-11', 'fontes'), 'somaplay-backup-2026-08-11.somaplay');
});

test('o carimbo de data é zero-padded', () => {
  assert.equal(stampDeHoje(new Date(2026, 0, 5)), '2026-01-05');
});
```

E acrescente os dois nomes ao import no topo do arquivo:

```js
import { recorteParaExport, nomeDoExport, stampDeHoje } from '../js/backup.js';
```

- [ ] **Passo 2: rodar para ver falhar**

Rodar: `cd app && node --test test/export.test.js`
Esperado: FAIL — `nomeDoExport is not a function`.

- [ ] **Passo 3: implementar**

Em `app/js/backup.js`, logo depois de `recorteParaExport`:

```js
export function stampDeHoje(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// O nome diz o recorte. `fontes` é null ou vazio quando é tudo — aí o nome é o
// de sempre, e um backup completo continua se chamando o que sempre se chamou.
// `palavraFontes` chega de fora ("fontes"/"sources") para a função ficar pura:
// nome de arquivo não é dado persistido, então traduzir aqui é seguro.
export function nomeDoExport(fontes, stamp, palavraFontes) {
  const slug = (nome) => String(nome)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // tira acento
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const nome = () => {
    if (!fontes || !fontes.length) return 'backup';
    if (fontes.length === 1) return slug(fontes[0]) || 'backup';
    return `${fontes.length}-${slug(palavraFontes)}`;
  };
  return `somaplay-${nome()}-${stamp}.somaplay`;
}
```

Depois substitua o corpo de `exportLibrary` (hoje linhas 12–47). Só três coisas mudam: a assinatura, de onde vêm as coleções, e o nome do arquivo.

```js
// Sem argumento, o comportamento é exatamente o de hoje: a biblioteca inteira.
export async function exportLibrary({ songIds = null, listIds = null, fileName = null } = {}) {
  const corte = recorteParaExport({ artists: S.artists, songs: S.songs, lists: S.lists }, { songIds, listIds });
  const blobIds = [];
  corte.songs.forEach((s) => {
    (s.cifra?.imagens || []).forEach((im) => im.blobId && blobIds.push(im.blobId));
    (s.stems || []).forEach((st) => st.blobId && blobIds.push(st.blobId));
    (s.full || []).forEach((f) => f.blobId && blobIds.push(f.blobId));
  });
  const parts = [];
  const manifestBlobs = [];
  for (const id of blobIds) {
    const b = await DB.getBlob(id);
    if (!b) continue;
    manifestBlobs.push({ id, size: b.size, type: b.type || 'application/octet-stream' });
    parts.push(b);
  }
  // chordbook e settings não têm fonte: não passam pelo recorte. O chordbook é
  // JSON pequeno, e sem ele uma cifra pode chegar sem a forma customizada do
  // acorde. `version` continua 1 — um arquivo filtrado é um .somaplay legítimo,
  // e uma versão antiga do app lê ele sem saber que houve filtro.
  const manifest = {
    version: 1,
    app: 'soma_play',
    artists: corte.artists,
    songs: corte.songs,
    lists: corte.lists,
    settings: S.settings,
    chordbook: chordbookRecords(),
    blobs: manifestBlobs,
  };
  const json = JSON.stringify(manifest);
  const header = MAGIC + String(new TextEncoder().encode(json).byteLength).padStart(10, '0') + '\n' + json;
  const blob = new Blob([header, ...parts], { type: 'application/octet-stream' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName || nomeDoExport(null, stampDeHoje());
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
}
```

- [ ] **Passo 4: rodar para ver passar**

Rodar: `cd app && node --test`
Esperado: PASS, tudo.

Rodar: `cd app && node --check js/backup.js`
Esperado: sem saída.

- [ ] **Passo 5: commitar**

```bash
git add app/js/backup.js app/test/export.test.js
git commit -m "feat: export only the sliced library, and name the file after the slice"
```

---

### Task 4: a tela de Configurações — três blocos

**Files:**
- Modify: `app/js/state.js` (uma linha em `S`, perto de `importMode` na linha 33)
- Modify: `app/js/render/settings.js:79-88` (o bloco antigo vira três) e o import do topo
- Modify: `app/js/main.js:565-571` (as ações) e os imports do topo
- Modify: `app/js/i18n/pt.js`, `app/js/i18n/en.js`
- Modify: `app/css/app.css` (uma linha, junto das outras `.btn-ghost`, hoje linha 103-104)

**Interfaces:**
- Consumes: `songIdsDasFontes` (Tarefa 1), `nomeDoExport` e `stampDeHoje` e a nova assinatura de `exportLibrary` (Tarefa 3), e o que já existe: `fontesDaBiblioteca`, `SEM_FONTE`, `esc`.
- Produces: `S.exportFontes` — `null` significa **todas**, senão um array de grafias exibidas. Nenhuma tarefa posterior depende disso.

> **Por que uma tarefa só:** dividir "estado + ações" de "render" deixaria um commit
> intermediário com a tela de Configurações meio migrada — chave de tradução aposentada
> que o render antigo ainda pede, ou ação que ninguém dispara. O entregável é a tela
> nova inteira.

- [ ] **Passo 1: o estado**

Em `app/js/state.js`, dentro do objeto `S`, logo **abaixo** da linha `importMode: 'replace', // replace | merge — modo do próximo import de backup` (hoje linha 33):

```js
  exportFontes: null,      // seleção do export: null = todas | array de grafias
```

- [ ] **Passo 2: as chaves de tradução**

Em `app/js/i18n/pt.js`, **substitua** as quatro linhas do bloco antigo (hoje 37–40):

```js
  'settings.backup.heading': 'Armazenamento e backup',
  'settings.backup.export': 'Exportar biblioteca',
  'settings.backup.import': 'Importar (substituir)',
  'settings.backup.merge': 'Adicionar/atualizar do backup',
```

por:

```js
  'settings.storage.heading': 'Armazenamento',
  'settings.export.heading': 'Exportar biblioteca',
  'settings.export.sub': 'Gera um .somaplay para guardar ou levar para outro aparelho.',
  'settings.export.action': 'Exportar {count} {song}',
  'settings.export.nothing': 'Nenhuma fonte marcada',
  'settings.export.fileMulti': 'fontes',
  'settings.import.heading': 'Importar',
  'settings.import.merge': 'Adicionar / atualizar',
  'settings.import.mergeSub': 'Junta o arquivo à sua biblioteca. Nada do que você já tem é apagado.',
  'settings.import.replace': 'Substituir tudo',
  'settings.import.replaceSub': 'Apaga a biblioteca deste aparelho e põe a do arquivo no lugar.',
```

Em `app/js/i18n/en.js`, **substitua** as quatro linhas equivalentes:

```js
  'settings.backup.heading': 'Storage and backup',
  'settings.backup.export': 'Export library',
  'settings.backup.import': 'Import (replace)',
  'settings.backup.merge': 'Add/update from backup',
```

por:

```js
  'settings.storage.heading': 'Storage',
  'settings.export.heading': 'Export library',
  'settings.export.sub': 'Creates a .somaplay file to keep or move to another device.',
  'settings.export.action': 'Export {count} {song}',
  'settings.export.nothing': 'No source selected',
  'settings.export.fileMulti': 'sources',
  'settings.import.heading': 'Import',
  'settings.import.merge': 'Add / update',
  'settings.import.mergeSub': 'Merges the file into your library. Nothing you already have is deleted.',
  'settings.import.replace': 'Replace everything',
  'settings.import.replaceSub': "Wipes this device's library and puts the file's in its place.",
```

**Não crie** chave para "Todas as fontes" nem para "Sem fonte": `home.fonte.all` e `home.fonte.none` já existem com exatamente esse texto, e o rótulo do balde sem fonte **precisa** ser o mesmo nos dois lugares. Duplicar seria criar duas verdades.

- [ ] **Passo 3: o CSS**

Em `app/css/app.css`, logo depois da linha `.btn-ghost.lg{...}` (hoje 104):

```css
.btn-ghost.danger{color:var(--red)}
```

- [ ] **Passo 4: o render**

Em `app/js/render/settings.js`, troque o import de estado do topo, hoje:

```js
import { S } from '../state.js';
import { I } from '../icons.js';
```

por:

```js
import { S, fontesDaBiblioteca, songIdsDasFontes, SEM_FONTE } from '../state.js';
import { I, esc } from '../icons.js';
```

Acrescente estas duas funções ao final do arquivo, **depois** de `fillStorageInfo`:

```js
// O bloco Exportar. As linhas vêm de fontesDaBiblioteca — mais usadas primeiro,
// "Sem fonte" por último. O data-id carrega a GRAFIA SALVA da fonte, nunca
// traduzida: ela é conteúdo do usuário. Só o balde usa o sentinela, com o
// rótulo traduzido no que se vê.
function blocoExportar() {
  const fontes = fontesDaBiblioteca(S.songs);
  const sel = S.exportFontes;                        // null = todas
  const marcada = (nome) => sel === null || sel.includes(nome);
  const n = sel === null ? S.songs.length : songIdsDasFontes(S.songs, sel).size;

  // Menos de duas fontes: biblioteca nova não merece uma caixinha solitária.
  const linhas = fontes.length < 2 ? '' : `
    <button class="check-row" data-a="toggleExportAll">
      <span class="checkbox ${sel === null ? 'on' : ''}">${sel === null ? I.check(15) : ''}</span>
      <span class="nm">${t('home.fonte.all')}</span>
      <span class="ct">${S.songs.length}</span>
    </button>
    <div style="height:1px;background:var(--border);margin:4px 12px"></div>
    ${fontes.map((f) => `
      <button class="check-row" data-a="toggleExportFonte" data-id="${esc(f.nome)}">
        <span class="checkbox ${marcada(f.nome) ? 'on' : ''}">${marcada(f.nome) ? I.check(15) : ''}</span>
        <span class="nm">${f.nome === SEM_FONTE ? t('home.fonte.none') : esc(f.nome)}</span>
        <span class="ct">${f.n}</span>
      </button>`).join('')}`;

  const rotulo = n
    ? t('settings.export.action', { count: n, song: t(n === 1 ? 'common.song' : 'common.songs') })
    : t('settings.export.nothing');

  return `<div class="setting-block" style="padding:20px;margin-top:6px">
    <div style="font-family:var(--f-title);font-weight:600;font-size:17px;margin-bottom:4px">${t('settings.export.heading')}</div>
    <div style="color:var(--muted);font-size:13px;margin-bottom:10px">${t('settings.export.sub')}</div>
    ${linhas}
    <button class="btn-primary" style="width:100%;margin-top:12px" data-a="exportBackup" ${n ? '' : 'disabled'}>${I.download()}${rotulo}</button>
  </div>`;
}

// O bloco Importar. A hierarquia é o recado: adicionar/atualizar é o botão de
// todo dia, substituir é destrutivo e por isso é fantasma e vermelho.
function blocoImportar() {
  return `<div class="setting-block" style="padding:20px;margin-top:6px">
    <div style="font-family:var(--f-title);font-weight:600;font-size:17px;margin-bottom:14px">${t('settings.import.heading')}</div>
    <button class="btn-primary" style="width:100%" data-a="importBackupMerge">${I.uploadSm()}${t('settings.import.merge')}</button>
    <div style="color:var(--muted);font-size:13px;margin:8px 2px 18px">${t('settings.import.mergeSub')}</div>
    <button class="btn-ghost danger" style="width:100%;height:44px" data-a="importBackup">${t('settings.import.replace')}</button>
    <div style="color:var(--muted);font-size:13px;margin:8px 2px 0">${t('settings.import.replaceSub')}</div>
  </div>`;
}
```

E **substitua** o bloco antigo em `renderSettings` (hoje linhas 79–88):

```js
        <div class="setting-block" style="padding:20px;margin-top:6px">
          <div style="font-family:var(--f-title);font-weight:600;font-size:17px;margin-bottom:4px">${t('settings.backup.heading')}</div>
          <div style="color:var(--muted);font-size:13px;margin-bottom:14px" id="storage-label">${t('storage.calculating')}</div>
          <div class="storage-bar"><div id="storage-fill" style="width:2%"></div></div>
          <div class="pair-btns">
            <button data-a="exportBackup">${I.download()}${t('settings.backup.export')}</button>
            <button data-a="importBackup">${I.uploadSm()}${t('settings.backup.import')}</button>
          </div>
          <button class="btn-ghost" style="width:100%;margin-top:8px;height:44px;justify-content:center" data-a="importBackupMerge">${I.uploadSm()}${t('settings.backup.merge')}</button>
        </div>
```

por:

```js
        <div class="setting-block" style="padding:20px;margin-top:6px">
          <div style="font-family:var(--f-title);font-weight:600;font-size:17px;margin-bottom:4px">${t('settings.storage.heading')}</div>
          <div style="color:var(--muted);font-size:13px;margin-bottom:14px" id="storage-label">${t('storage.calculating')}</div>
          <div class="storage-bar" style="margin-bottom:0"><div id="storage-fill" style="width:2%"></div></div>
        </div>

        ${blocoExportar()}
        ${blocoImportar()}
```

O `<input type="file" id="file-backup" accept=".somaplay" hidden>` do fim da função **não muda**, nem a religação dele em `main.js`.

- [ ] **Passo 5: as ações**

Em `app/js/main.js`, o import de `backup.js` (hoje linha 20) passa de:

```js
import { exportLibrary, importLibrary } from './backup.js';
```

para:

```js
import { exportLibrary, importLibrary, nomeDoExport, stampDeHoje } from './backup.js';
```

E acrescente `fontesDaBiblioteca` e `songIdsDasFontes` ao import de `./state.js` que já existe no topo do arquivo.

Depois **substitua** `exportBackup` (hoje linhas 565–569) por:

```js
  toggleExportAll() {
    // null = todas. Marcada, desmarca tudo; desmarcada ou parcial, marca tudo.
    S.exportFontes = S.exportFontes === null ? [] : null;
    update();
  },
  toggleExportFonte(d) {
    const todas = fontesDaBiblioteca(S.songs).map((f) => f.nome);
    const atual = S.exportFontes === null ? todas : S.exportFontes;
    const prox = atual.includes(d.id) ? atual.filter((x) => x !== d.id) : [...atual, d.id];
    // Remarcar tudo volta para o sentinela: sem isso "todas" teria duas
    // representações, e o nome do arquivo não voltaria a ser somaplay-backup-*.
    // Pertinência, não tamanho: a seleção é da sessão e a biblioteca muda por
    // baixo dela. Com uma grafia velha guardada, contar daria "todas" errado.
    S.exportFontes = todas.every((x) => prox.includes(x)) ? null : prox;
    update();
  },
  async exportBackup() {
    const fontes = S.exportFontes;
    // `fontes?.length`, não `fontes`: [] é truthy, e nomeDoExport trata [] como
    // "tudo". Sem o .length, os dois lados discordariam do que [] significa.
    const sel = fontes?.length ? { songIds: songIdsDasFontes(S.songs, fontes) } : {};
    const fileName = nomeDoExport(fontes, stampDeHoje(), t('settings.export.fileMulti'));
    toast(t('msg.backup.exporting'));
    try { await exportLibrary({ ...sel, fileName }); toast(t('msg.backup.exported')); }
    catch (e) { toast(t('msg.backup.exportFailed', { error: e.message })); }
  },
```

`importBackup` e `importBackupMerge` (linhas 570–571) **não mudam** — só trocaram de lugar e de rótulo na tela.

- [ ] **Passo 6: rodar os testes e o check**

Rodar: `cd app && node --test`
Esperado: PASS. `i18n.test.js` é o que importa aqui — ele falha se uma chave entrou numa tabela só.

Rodar: `cd app && node --check js/render/settings.js && node --check js/main.js && node --check js/state.js`
Esperado: sem saída.

- [ ] **Passo 7: commitar**

```bash
git add app/js/state.js app/js/render/settings.js app/js/main.js app/js/i18n/pt.js app/js/i18n/en.js app/css/app.css
git commit -m "feat: split settings into storage, export and import blocks"
```

---

### Task 5: os contadores de lista param de contar id órfão

**Files:**
- Modify: `app/js/state.js` (uma função, perto de `songById`)
- Modify: `app/js/render/listscreen.js:27,38-50`
- Modify: `app/js/render/home.js:136`
- Modify: `app/js/render/popover.js:14`

**Interfaces:**
- Consumes: `songById(id)`, que já existe em `state.js`.
- Produces: `musicasPresentes(l) → string[]` — os ids da lista `l` cujas músicas existem na biblioteca. Nenhuma tarefa posterior depende disso.

> **Por que isto é parte deste plano:** é a decisão "as listas viajam inteiras" que
> torna o id órfão comum. O bug já existe hoje (a tela pula a música que não existe, o
> contador não), mas era raro. Deixar como está entregaria uma lista que diz 8 e mostra
> 5 logo depois do primeiro import filtrado.

- [ ] **Passo 1: a função**

Em `app/js/state.js`, logo **depois** da definição de `songById`:

```js
// Id órfão numa lista existe de propósito: um export por fonte leva a lista
// inteira, e as músicas que faltam chegam quando a outra fonte for importada.
// Até lá o contador não pode prometer o que a tela não mostra.
export function musicasPresentes(l) {
  return ((l && l.musicas) || []).filter((id) => songById(id));
}
```

- [ ] **Passo 2: a tela da lista**

Em `app/js/render/listscreen.js`, acrescente `musicasPresentes` ao import de `../state.js` do topo.

**Mova** a contagem para antes de `titleArea` — insira logo depois da linha do `modeLabel` (hoje 12):

```js
  const total = musicasPresentes(l).length;
```

Na linha 27, troque `${cnt(l.musicas.length)}` por `${cnt(total)}`.

**Apague** a linha 38, `const total = l.musicas.length;`, que agora está duplicada.

E troque o bloco das linhas 41–50 por:

```js
  // ATENÇÃO: o idx do map é o índice REAL em l.musicas, e é ele que data-idx
  // carrega e que moveItem usa para reordenar. Filtrar o array aqui quebraria o
  // arrastar em silêncio. Quem some é só o que se vê: `pos` numera o que aparece.
  let pos = 0;
  const rows = l.musicas.map((id, idx) => {
    const so = songById(id);
    if (!so) return '';
    pos += 1;
    const handle = canDrag
      ? `<button class="drag-handle" data-idx="${idx}" title="${t('list.dragHandle')}"
          aria-label="${t('list.dragHandleAria', { title: esc(so.title), pos, total })}">${I.grip()}</button>`
      : '';
    return `<div class="listsong-row" data-idx="${idx}">
      ${handle}
      <div class="pos-num">${pos}</div>
```

O resto do `return` (linhas 51–58) **não muda**.

- [ ] **Passo 3: o card da aba Listas e o popover**

Em `app/js/render/home.js:136`, troque `cnt(l.musicas.length)` por `cnt(musicasPresentes(l).length)` e acrescente `musicasPresentes` ao import de `../state.js`.

Em `app/js/render/popover.js`, troque a linha 14:

```js
      <span class="ct">${l.musicas.length} ${l.musicas.length === 1 ? t('common.song') : t('common.songs')}</span>
```

por:

```js
      <span class="ct">${nPresentes} ${nPresentes === 1 ? t('common.song') : t('common.songs')}</span>
```

e acrescente, dentro do `.map` logo depois de `const checked = ...` (linha 10):

```js
    const nPresentes = musicasPresentes(l).length;
```

Acrescente `musicasPresentes` ao import de `../state.js` do topo de `popover.js`.

- [ ] **Passo 4: rodar os testes e o check**

Rodar: `cd app && node --test`
Esperado: PASS. `listdrag.test.js` e `listorder.test.js` exercitam `moveItem`, que é puro e não foi tocado — se algum deles ficar vermelho, o `data-idx` foi mexido por engano.

Rodar: `cd app && node --check js/state.js && node --check js/render/listscreen.js && node --check js/render/home.js && node --check js/render/popover.js`
Esperado: sem saída.

- [ ] **Passo 5: commitar**

```bash
git add app/js/state.js app/js/render/listscreen.js app/js/render/home.js app/js/render/popover.js
git commit -m "fix: count only the songs a list can actually show"
```

---

### Task 6: bump do Service Worker e verificação no navegador

**Files:**
- Modify: `app/sw.js:2`

**Interfaces:**
- Consumes: tudo das Tarefas 1–5.
- Produces: nada.

- [ ] **Passo 1: bump da VERSION**

Em `app/sw.js`, linha 2, troque:

```js
const VERSION = 'somaplay-v28';
```

por:

```js
const VERSION = 'somaplay-v29';
```

O `SHELL` **não muda** — nenhum módulo novo entrou. `export.test.js` está em `app/test/`, que não é pré-cacheado.

- [ ] **Passo 2: rodar a bateria toda**

Rodar: `cd app && node --test`
Esperado: PASS, tudo. `shell.test.js` continua verde.

- [ ] **Passo 3: commitar**

```bash
git add app/sw.js
git commit -m "chore: bump the service worker to v29"
```

- [ ] **Passo 4: verificar no navegador — esta é a verificação que conta**

> **Quem faz:** este passo **não é do implementador** — ele não tem navegador nem a
> biblioteca do usuário no IndexedDB, e metade dos itens abaixo exige um acervo real com
> mais de uma fonte. O implementador vai até o Passo 3, commita e reporta. A verificação
> fica com quem coordena, que roda o que dá para rodar sem estado de usuário e entrega o
> resto ao usuário, dizendo **explicitamente** o que conferiu e o que não conferiu.

```bash
cd app && python3 -m http.server 8137
```

Em `http://localhost:8137`, com hard reload (o Service Worker é cache-first):

1. **Não regrediu.** Com tudo marcado, exportar: o arquivo se chama `somaplay-backup-<hoje>.somaplay` e tem o mesmo tamanho de um backup feito antes desta branch.
2. **O recorte encolhe de verdade.** Desmarcar uma fonte com áudio: a contagem do botão cai e o arquivo fica visivelmente menor.
3. **O nome diz o recorte.** Uma fonte só → `somaplay-songbook-<hoje>.somaplay`. Duas → `somaplay-2-fontes-<hoje>.somaplay`. Remarcar tudo → volta a `somaplay-backup-<hoje>.somaplay`.
4. **O arquivo é autossuficiente.** Noutro perfil do navegador (ou aba anônima), importar o arquivo filtrado em **Adicionar/atualizar**: só as músicas daquela fonte, só os artistas que têm música, as cifras e os áudios abrem.
5. **A lista se cura.** Nesse mesmo perfil, uma lista que misturava fontes aparece com as músicas que existem. Importar depois o arquivo da outra fonte: **as músicas que faltavam aparecem na lista, na posição certa.**
6. **O arrastar não quebrou.** Nessa lista com id órfão, o cabeçalho conta só o que aparece, a numeração vai 1..n sem buraco, e arrastar para reordenar continua salvando a ordem certa — fechar e reabrir a lista confirma.
7. **Os estados degenerados.** Desmarcar todas: o botão fica cinza, desabilitado, escrito "Nenhuma fonte marcada". Num perfil com uma fonte só: a lista de caixinhas não aparece, e o botão Exportar funciona sozinho.
8. **Idioma.** Trocar PT/EN com uma fonte desmarcada: "Todas as fontes" vira "All sources", "Sem fonte" vira "No source", e **"Songbook" continua "Songbook"**. Exportar duas fontes em EN → `somaplay-2-sources-<hoje>.somaplay`.
9. **O bloco Importar.** Adicionar/atualizar é claramente o botão principal; Substituir tudo é fantasma e vermelho, e o diálogo de confirmação continua avisando quantas músicas serão apagadas.
10. **No tablet.** As caixinhas dão para acertar com o dedo, e a lista de fontes não estoura a largura do bloco.

- [ ] **Passo 5: registrar o que ficou por conferir**

Se algum item de 1 a 10 não pôde ser verificado (falta de acervo real, falta de tablet), diga **qual** e **por quê**, em vez de dar a tarefa por concluída.

---

## Auto-revisão do plano

**Cobertura do spec.** Cada seção do spec tem tarefa: `songIdsDasFontes` → T1; `recorteParaExport` e a tabela do que viaja → T2; nome do arquivo e `exportLibrary` → T3; três blocos, `S.exportFontes`, ações, i18n, CSS → T4; contador da lista → T5; bump do SW → T6. As seções *O que não muda*, *Fora de escopo* e *Próximos passos* não pedem código, por construção.

**Sem placeholder.** Todo passo traz o código ou o comando exato. Nenhum "tratar erros adequadamente", nenhum "igual à Tarefa N".

**Consistência de tipos.** `songIdsDasFontes` devolve `Set` (T1) e é isso que `recorteParaExport` recebe em `songIds` (T2) e que `exportBackup` passa (T4). `nomeDoExport(fontes, stamp, palavraFontes)` recebe o **array de grafias** — `S.exportFontes`, não o `Set` de ids — nos dois lados (T3, T4). `musicasPresentes(l)` devolve array, e os três call sites usam `.length` (T5).
