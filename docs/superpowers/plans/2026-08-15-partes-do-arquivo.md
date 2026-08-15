# Partes do arquivo — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Um `.somaplay` passa a declarar *sobre o que ele fala* (`partes`), e o merge passa a respeitar essa declaração — o que permite compartilhar cifras sem áudio, mandar o áudio depois como pacote separado, e nunca mais apagar as favoritas de quem recebe.

**Architecture:** Um módulo novo `js/partes.js` é dono do vocabulário: quais campos pertencem a `cifra`, `audio` e `pessoal`, mais `podaPorPartes` (usada na exportação) e `fundeMusica` (usada na importação). `backup.js` poda os registros antes de coletar os blobs, então um arquivo sem `audio` naturalmente não carrega os bytes de áudio. `merge.js` funde campo a campo: uma parte não declarada nunca é tocada — é essa regra que faz leve→pacote e pacote→leve chegarem no mesmo lugar. A UI ganha uma folha de compartilhar contextual (`js/render/sharesheet.js`) no `⋯` da lista e do artista, e Configurações ganha as quatro caixas que são o vocabulário literal.

**Tech Stack:** ES modules puros, sem build e sem dependências. `node --test` para a lógica pura, `node --check` para sintaxe, navegador para o resto. Web Audio API, OPFS, IndexedDB.

**Spec:** `docs/superpowers/specs/2026-08-15-partes-do-arquivo-design.md`

## Global Constraints

- **Comentários e mensagens de commit em inglês.** Specs e planos em português. A interface do app é PT/EN via `t()`.
- **`DB_NAME` em `app/js/db.js` nunca muda.** Renomear apaga a biblioteca de todo usuário.
- **Todo módulo novo em `app/js/` entra no `SHELL` de `app/sw.js`.** Este plano adiciona dois: `./js/partes.js` e `./js/render/sharesheet.js`. `app/test/shell.test.js` cobra.
- **A versão sobe para `0.12.0`** (MINOR — capacidade nova). Dois literais: `app/js/version.js` e a linha 2 de `app/sw.js`. `app/test/version.test.js` cobra a sincronia.
- **Chave de tradução nova entra nas DUAS tabelas** (`app/js/i18n/pt.js` e `app/js/i18n/en.js`). `app/test/i18n.test.js` cobra a paridade. Strings traduzidas são produzidas em tempo de render, nunca em constante de módulo.
- **Nenhum valor de `data-*` passa por `t()`.** Os nomes de parte (`cifra`, `audio`, `pessoal`) são constantes internas e vão crus no `data-id`.
- **Nunca traduzir nem renotar a cifra do usuário.** Nada neste plano toca em texto de cifra.
- **`version: 1` no manifest não muda.** `partes` ausente significa arquivo completo.
- Rodar: `cd app && node --test` · `cd app && node --check js/<arquivo>.js` · `cd app && python3 -m http.server 8137`

## Desvio da spec, deliberado

A spec põe `podaPorPartes` em `js/backup.js`. O plano cria **`js/partes.js`** e põe lá `podaPorPartes` *e* `fundeMusica`, porque as duas dependem do mesmo mapa parte→campos e ele não pode ter duas verdades — é o mesmo motivo pelo qual `blobIdsDasMusicas` existe só uma vez (`state.js:279`). `backup.js` e `merge.js` importam de lá. Custa uma entrada no `SHELL`.

---

### Task 1: `js/partes.js` — o vocabulário e a poda

**Files:**
- Create: `app/js/partes.js`
- Create: `app/test/partes.test.js`
- Modify: `app/sw.js:3-40` (SHELL)

**Interfaces:**
- Consumes: nada.
- Produces: `PARTES_TODAS: string[]` (`['cifra','audio','pessoal']`), `CAMPOS: Record<string,string[]>`, `IDENTIDADE: string[]` (`['id','artistId','title']`), `podaPorPartes(songs: object[], partes: string[]|null) → object[]`.

- [ ] **Step 1: Write the failing test**

Criar `app/test/partes.test.js`:

```js
// partes.test.js — o vocabulário de "sobre o que este arquivo fala".
//
// A asserção que mais importa é a primeira: com todas as partes, o registro sai
// IDÊNTICO. É ela que garante que o backup completo — o caminho que todo
// usuário já usa — não regrediu quando as partes entraram.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { podaPorPartes, PARTES_TODAS } from '../js/partes.js';

const musica = () => ({
  id: 's1', artistId: 'ar1', title: 'Aquele Abraço',
  tom: 'D', estilo: 'Samba', fonte: 'Songbook', letra: 'la la',
  cifra: { tipo: 'texto', imagens: [{ blobId: 'img1' }], texto: 'D A7', acordes: ['D'], digitacoes: {} },
  stems: [{ blobId: 'aud1', name: 'violao', vol: 60, mute: false }],
  full: [{ id: 'f1', blobId: 'aud2' }],
  favorita: true, createdAt: 1700000000000,
});

test('todas as partes devolvem o registro idêntico', () => {
  const m = musica();
  assert.deepEqual(podaPorPartes([m], PARTES_TODAS), [m]);
});

test('partes nulo significa todas', () => {
  const m = musica();
  assert.deepEqual(podaPorPartes([m], null), [m]);
});

test('a identidade viaja em qualquer parte', () => {
  for (const p of PARTES_TODAS) {
    const [out] = podaPorPartes([musica()], [p]);
    assert.equal(out.id, 's1');
    assert.equal(out.artistId, 'ar1');
    assert.equal(out.title, 'Aquele Abraço');
  }
});

test('cifra leva o conteúdo e não leva áudio nem pessoal', () => {
  const [out] = podaPorPartes([musica()], ['cifra']);
  assert.equal(out.tom, 'D');
  assert.equal(out.estilo, 'Samba');
  assert.equal(out.fonte, 'Songbook');
  assert.equal(out.letra, 'la la');
  assert.equal(out.cifra.texto, 'D A7');
  assert.ok(!('stems' in out));
  assert.ok(!('full' in out));
  assert.ok(!('favorita' in out));
  assert.ok(!('createdAt' in out));
});

test('audio leva os stems com a mixagem dentro', () => {
  const [out] = podaPorPartes([musica()], ['audio']);
  assert.deepEqual(out.stems, [{ blobId: 'aud1', name: 'violao', vol: 60, mute: false }]);
  assert.deepEqual(out.full, [{ id: 'f1', blobId: 'aud2' }]);
  assert.ok(!('cifra' in out));
  assert.ok(!('letra' in out));
  assert.ok(!('estilo' in out));
  assert.ok(!('fonte' in out));
  assert.ok(!('favorita' in out));
});

test('pessoal leva só favorita e createdAt', () => {
  const [out] = podaPorPartes([musica()], ['pessoal']);
  assert.equal(out.favorita, true);
  assert.equal(out.createdAt, 1700000000000);
  assert.ok(!('cifra' in out));
  assert.ok(!('stems' in out));
});

test('cifra + audio é o compartilhar pesado: tudo menos o pessoal', () => {
  const [out] = podaPorPartes([musica()], ['cifra', 'audio']);
  assert.ok('cifra' in out);
  assert.ok('stems' in out);
  assert.ok(!('favorita' in out));
});

test('campo ausente na música não vira undefined no recorte', () => {
  const [out] = podaPorPartes([{ id: 's2', artistId: 'ar1', title: 'X' }], ['cifra']);
  assert.deepEqual(out, { id: 's2', artistId: 'ar1', title: 'X' });
});

test('lista vazia e entradas ausentes não quebram', () => {
  assert.deepEqual(podaPorPartes([], ['cifra']), []);
  assert.deepEqual(podaPorPartes(null, ['cifra']), []);
  assert.deepEqual(podaPorPartes([musica()], []).length, 1);
});

test('não muta a música recebida', () => {
  const m = musica();
  podaPorPartes([m], ['audio']);
  assert.equal(m.cifra.texto, 'D A7');
  assert.equal(m.favorita, true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && node --test test/partes.test.js`
Expected: FAIL — `Cannot find module '../js/partes.js'`

- [ ] **Step 3: Write minimal implementation**

Criar `app/js/partes.js`:

```js
// partes.js — the vocabulary of "what does this file talk about".
//
// A .somaplay declares which parts it carries. The merge honours that
// declaration, so "the file says nothing about audio" stops meaning "delete the
// audio" — which is what lets a light file and an audio pack merge in any order.
//
// Both sides of the exchange live here on purpose: podaPorPartes (export) and
// fundeMusica (import) read the same field map, and a second source of truth for
// it is exactly how the two would drift apart.
// Design: docs/superpowers/specs/2026-08-15-partes-do-arquivo-design.md

export const PARTES_TODAS = ['cifra', 'audio', 'pessoal'];

// How the file says "this song". Never pruned: without it an audio-only pack
// would carry orphan bytes instead of a named song.
export const IDENTIDADE = ['id', 'artistId', 'title'];

// A new field on the song record MUST be added here, or it will travel in a
// backup and silently vanish from every share.
export const CAMPOS = {
  cifra: ['tom', 'cifra', 'letra', 'estilo', 'fonte'],
  audio: ['stems', 'full'],
  pessoal: ['favorita', 'createdAt'],
};

// null = every part. With every part the records come back untouched — that is
// the complete-backup path, and the test asserts it rather than hoping for it.
export function podaPorPartes(songs, partes) {
  const ps = partes || PARTES_TODAS;
  if (PARTES_TODAS.every((p) => ps.includes(p))) return (songs || []).slice();
  const manter = ps.flatMap((p) => CAMPOS[p] || []);
  return (songs || []).map((s) => {
    const out = {};
    for (const k of IDENTIDADE) if (k in s) out[k] = s[k];
    for (const k of manter) if (k in s) out[k] = s[k];
    return out;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && node --test test/partes.test.js`
Expected: PASS, 10 testes.

- [ ] **Step 5: Add the module to SHELL**

Em `app/sw.js`, na lista `SHELL`, depois de `'./js/merge.js',`:

```js
  './js/partes.js',
```

- [ ] **Step 6: Run the whole suite**

Run: `cd app && node --test`
Expected: PASS — inclusive `shell.test.js`, que agora vê `partes.js` no disco e no SHELL.

- [ ] **Step 7: Commit**

```bash
cd app && node --check js/partes.js
git add app/js/partes.js app/test/partes.test.js app/sw.js
git commit -m "feat(partes): the file-parts vocabulary and export pruning

A .somaplay becomes able to declare what it talks about. podaPorPartes
strips a song record down to the declared parts, with identity always
kept so an audio-only pack still names its songs.

With every part declared the records come back untouched — asserted, so
the complete-backup path cannot regress silently.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `fundeMusica` — a regra que sustenta a extensão

**Files:**
- Modify: `app/js/partes.js`
- Modify: `app/test/partes.test.js`

**Interfaces:**
- Consumes: `PARTES_TODAS`, `CAMPOS`, `IDENTIDADE` da Task 1.
- Produces: `fundeMusica(atual: object|null, doArquivo: object, partes: string[]|null) → object`.

- [ ] **Step 1: Write the failing test**

Primeiro, trocar o import do topo de `app/test/partes.test.js` por:

```js
import { podaPorPartes, fundeMusica, PARTES_TODAS } from '../js/partes.js';
```

Depois, acrescentar ao fim do arquivo:

```js
// --- a fusão -------------------------------------------------------------
// A regra inteira: um campo de parte NÃO declarada nunca é tocado. É o que faz
// o pacote de áudio sobreviver a um arquivo leve importado depois, e as
// favoritas de quem recebe sobreviverem a uma atualização de repertório.
const CIFRA_VAZIA = { tipo: null, imagens: [], texto: '', acordes: [], digitacoes: {} };

test('arquivo leve não encosta no áudio que já existe', () => {
  const atual = musica();
  const leve = { id: 's1', artistId: 'ar1', title: 'Aquele Abraço', tom: 'E', cifra: { tipo: 'texto', texto: 'E B7' } };
  const out = fundeMusica(atual, leve, ['cifra']);
  assert.equal(out.tom, 'E');
  assert.equal(out.cifra.texto, 'E B7');
  assert.deepEqual(out.stems, atual.stems);
});

test('arquivo compartilhado não encosta nas favoritas de quem recebe', () => {
  const atual = { ...musica(), favorita: true };
  const compartilhado = { id: 's1', artistId: 'ar1', title: 'Aquele Abraço', favorita: false, tom: 'E' };
  const out = fundeMusica(atual, compartilhado, ['cifra']);
  assert.equal(out.favorita, true);
  assert.equal(out.tom, 'E');
});

test('pacote de áudio não encosta na cifra que já existe', () => {
  const atual = musica();
  const pacote = { id: 's1', artistId: 'ar1', title: 'Aquele Abraço', stems: [{ blobId: 'novo', vol: 80 }] };
  const out = fundeMusica(atual, pacote, ['audio']);
  assert.deepEqual(out.stems, [{ blobId: 'novo', vol: 80 }]);
  assert.equal(out.cifra.texto, 'D A7');
  assert.equal(out.letra, 'la la');
});

test('backup completo sobrescreve tudo', () => {
  const atual = musica();
  const doBackup = { ...musica(), tom: 'G', favorita: false, stems: [] };
  const out = fundeMusica(atual, doBackup, PARTES_TODAS);
  assert.equal(out.tom, 'G');
  assert.equal(out.favorita, false);
  assert.deepEqual(out.stems, []);
});

test('música nova de pacote de áudio nasce com cifra VAZIA, nunca ausente', () => {
  const pacote = { id: 'novo', artistId: 'ar1', title: 'Refazenda', stems: [{ blobId: 'a' }] };
  const out = fundeMusica(null, pacote, ['audio']);
  assert.deepEqual(out.cifra, CIFRA_VAZIA);
  assert.deepEqual(out.stems, [{ blobId: 'a' }]);
});

test('música nova de arquivo leve mantém a cifra que veio', () => {
  const leve = { id: 'novo', artistId: 'ar1', title: 'Refazenda', cifra: { tipo: 'texto', texto: 'C G' } };
  const out = fundeMusica(null, leve, ['cifra']);
  assert.equal(out.cifra.texto, 'C G');
});

// A PROPRIEDADE que sustenta a extensão: as duas ordens chegam no mesmo lugar.
// Se este teste cair, o pacote de áudio deixou de ser uma extensão.
test('leve→pacote e pacote→leve chegam no mesmo registro', () => {
  const leve = { id: 's9', artistId: 'ar1', title: 'Domingo no Parque', tom: 'A', cifra: { tipo: 'texto', texto: 'A E' }, letra: 'oi', estilo: 'MPB', fonte: 'VJ' };
  const pacote = { id: 's9', artistId: 'ar1', title: 'Domingo no Parque', stems: [{ blobId: 'x', vol: 70 }], full: [] };

  const leveDepoisPacote = fundeMusica(fundeMusica(null, leve, ['cifra']), pacote, ['audio']);
  const pacoteDepoisLeve = fundeMusica(fundeMusica(null, pacote, ['audio']), leve, ['cifra']);

  assert.deepEqual(leveDepoisPacote, pacoteDepoisLeve);
  assert.equal(leveDepoisPacote.cifra.texto, 'A E');
  assert.deepEqual(leveDepoisPacote.stems, [{ blobId: 'x', vol: 70 }]);
});

test('partes vazio não explode: só a identidade e a invariante da cifra', () => {
  const out = fundeMusica(null, { id: 'z', artistId: 'a', title: 'T', tom: 'C' }, []);
  assert.equal(out.id, 'z');
  assert.ok(!('tom' in out));
  assert.deepEqual(out.cifra, CIFRA_VAZIA);
});

test('não muta nenhum dos dois lados', () => {
  const atual = musica();
  const doArquivo = { id: 's1', artistId: 'ar1', title: 'X', stems: [] };
  fundeMusica(atual, doArquivo, ['audio']);
  assert.equal(atual.stems.length, 1);
  assert.equal(atual.title, 'Aquele Abraço');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && node --test test/partes.test.js`
Expected: FAIL — `The requested module '../js/partes.js' does not provide an export named 'fundeMusica'`

- [ ] **Step 3: Write minimal implementation**

Acrescentar ao fim de `app/js/partes.js`:

```js
// The app-wide invariant: every song has a cifra object, because the add/edit
// form always creates one. An audio-only pack would break it, and normalizaCifra
// (db.js:186) returns the song untouched when cifra is missing instead of
// filling in a default. Restoring it here means one place, rather than auditing
// every render for an unguarded `.cifra.`.
const cifraVazia = () => ({ tipo: null, imagens: [], texto: '', acordes: [], digitacoes: {} });

// Merge one incoming song onto what the device already has.
//
// The whole rule: a field belonging to a part the file does NOT declare is never
// touched. That is what keeps an audio pack alive when a light file lands after
// it, and what keeps the recipient's favourites when a repertoire update lands.
//
// `atual` is null for a song the device does not have yet.
export function fundeMusica(atual, doArquivo, partes) {
  const ps = partes || PARTES_TODAS;
  const out = { ...(atual || {}) };
  for (const k of IDENTIDADE) if (k in doArquivo) out[k] = doArquivo[k];
  for (const p of ps) for (const k of (CAMPOS[p] || [])) if (k in doArquivo) out[k] = doArquivo[k];
  if (!out.cifra) out.cifra = cifraVazia();
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && node --test test/partes.test.js`
Expected: PASS, 19 testes.

- [ ] **Step 5: Run the whole suite**

Run: `cd app && node --test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd app && node --check js/partes.js
git add app/js/partes.js app/test/partes.test.js
git commit -m "feat(partes): field-aware merge — absence is not deletion

fundeMusica merges an incoming song onto what the device has, touching
only the fields of the declared parts. A light file no longer wipes the
audio, and a shared repertoire no longer wipes the recipient's favourites.

The load-bearing test is the order property: light-then-pack and
pack-then-light reach the same record. If it fails, the audio pack has
stopped being an extension.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `nomeDoExport` — o qualificador de partes

**Files:**
- Modify: `app/js/backup.js:35-49`
- Modify: `app/test/export.test.js:85-113`
- Modify: `app/js/main.js:666`

**Interfaces:**
- Consumes: `PARTES_TODAS` da Task 1.
- Produces: `recorteDeFontes(fontes: string[]|null, palavraFontes: string) → string`; `nomeDoExport(recorte: string, stamp: string, partes: string[]|null, palavras: {cifras: string, audio: string}) → string`.

**Nota:** a assinatura de `nomeDoExport` muda. O único chamador é `main.js:666`; os testes antigos do nome viram os novos abaixo.

- [ ] **Step 1: Write the failing test**

Em `app/test/export.test.js`, substituir **todo** o bloco `--- nome do arquivo ---` (linhas 85 até o fim) por:

```js
// --- nome do arquivo -------------------------------------------------------
// Quatro arquivos chamados somaplay-backup-2026-08-11 na pasta de Downloads não
// servem para nada. O nome diz o recorte e, quando cifra e áudio se separam,
// diz também qual metade é esta.
const PALAVRAS = { cifras: 'cifras', audio: 'audio' };

test('sem recorte, o miolo é o de sempre', () => {
  assert.equal(recorteDeFontes(null, 'fontes'), 'backup');
  assert.equal(recorteDeFontes([], 'fontes'), 'backup');
});

test('uma fonte vira o nome dela; o slug tira acento e espaço', () => {
  assert.equal(recorteDeFontes(['Songbook'], 'fontes'), 'songbook');
  assert.equal(recorteDeFontes(['Coletâneas VJ'], 'fontes'), 'coletaneas-vj');
});

test('o balde sem fonte tem nome legível', () => {
  assert.equal(recorteDeFontes(['__sem_fonte'], 'fontes'), 'sem-fonte');
});

test('duas ou mais fontes viram a contagem, na língua do app', () => {
  assert.equal(recorteDeFontes(['A', 'B', 'C'], 'fontes'), '3-fontes');
  assert.equal(recorteDeFontes(['A', 'B'], 'sources'), '2-sources');
});

test('uma fonte que vira slug vazio cai no miolo genérico', () => {
  assert.equal(recorteDeFontes(['###'], 'fontes'), 'backup');
});

test('todas as partes não qualificam nada — o backup mantém o nome de hoje', () => {
  assert.equal(nomeDoExport('backup', '2026-08-15', PARTES_TODAS, PALAVRAS), 'somaplay-backup-2026-08-15.somaplay');
  assert.equal(nomeDoExport('backup', '2026-08-15', null, PALAVRAS), 'somaplay-backup-2026-08-15.somaplay');
  assert.equal(nomeDoExport('songbook', '2026-08-15', PARTES_TODAS, PALAVRAS), 'somaplay-songbook-2026-08-15.somaplay');
});

test('cifra e audio juntas também não qualificam', () => {
  assert.equal(nomeDoExport('show-sabado', '2026-08-15', ['cifra', 'audio'], PALAVRAS), 'somaplay-show-sabado-2026-08-15.somaplay');
});

test('cifra sozinha e audio sozinho viram sufixo', () => {
  assert.equal(nomeDoExport('show-sabado', '2026-08-15', ['cifra'], PALAVRAS), 'somaplay-show-sabado-cifras-2026-08-15.somaplay');
  assert.equal(nomeDoExport('show-sabado', '2026-08-15', ['audio'], PALAVRAS), 'somaplay-show-sabado-audio-2026-08-15.somaplay');
  assert.equal(nomeDoExport('songbook', '2026-08-15', ['cifra', 'pessoal'], PALAVRAS), 'somaplay-songbook-cifras-2026-08-15.somaplay');
});

test('tirar só o pessoal não muda o nome', () => {
  assert.equal(nomeDoExport('backup', '2026-08-15', ['cifra', 'audio'], PALAVRAS), 'somaplay-backup-2026-08-15.somaplay');
});

test('a palavra do sufixo vem traduzida de fora', () => {
  assert.equal(nomeDoExport('setlist', '2026-08-15', ['cifra'], { cifras: 'charts', audio: 'audio' }), 'somaplay-setlist-charts-2026-08-15.somaplay');
});

test('o nome de uma lista é slugado', () => {
  assert.equal(nomeDoExport('Show de Sábado!', '2026-08-15', PARTES_TODAS, PALAVRAS), 'somaplay-show-de-sabado-2026-08-15.somaplay');
});

test('recorte vazio cai no nome genérico', () => {
  assert.equal(nomeDoExport('', '2026-08-15', PARTES_TODAS, PALAVRAS), 'somaplay-backup-2026-08-15.somaplay');
});

test('o carimbo de data é zero-padded', () => {
  assert.equal(stampDeHoje(new Date(2026, 0, 5)), '2026-01-05');
});
```

E trocar a linha 13 do mesmo arquivo por:

```js
import { recorteParaExport, recorteDeFontes, nomeDoExport, stampDeHoje } from '../js/backup.js';
import { PARTES_TODAS } from '../js/partes.js';
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && node --test test/export.test.js`
Expected: FAIL — `does not provide an export named 'recorteDeFontes'`

- [ ] **Step 3: Write minimal implementation**

Em `app/js/backup.js`, substituir o bloco `nomeDoExport` (linhas 35-49) por:

```js
const slug = (parte) => String(parte || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')  // tira acento
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// O miolo do nome quando o recorte é por fonte. Sem seleção é 'backup', e é isso
// que faz um backup completo continuar se chamando o que sempre se chamou.
// `palavraFontes` chega de fora ("fontes"/"sources") para a função ficar pura:
// nome de arquivo não é dado persistido, então traduzir aqui é seguro.
export function recorteDeFontes(fontes, palavraFontes) {
  if (!fontes || !fontes.length) return 'backup';
  if (fontes.length === 1) return slug(fontes[0]) || 'backup';
  return `${fontes.length}-${slug(palavraFontes)}`;
}

// `recorte` é o miolo: de recorteDeFontes, ou o nome de uma lista/artista.
//
// A regra do qualificador é uma só, e vale nas duas superfícies: cifra e audio
// JUNTAS não qualificam nada; sozinhas viram sufixo. `pessoal` e as listas ficam
// fora do nome — quatro sufixos combinados dariam
// somaplay-show-sabado-cifras-sem-listas-…, que não ajuda ninguém a escolher um
// arquivo na pasta de Downloads.
export function nomeDoExport(recorte, stamp, partes, palavras = {}) {
  const ps = partes || PARTES_TODAS;
  const temCifra = ps.includes('cifra');
  const temAudio = ps.includes('audio');
  const qual = temCifra === temAudio ? '' : slug(temCifra ? palavras.cifras : palavras.audio);
  return `somaplay-${slug(recorte) || 'backup'}-${qual ? `${qual}-` : ''}${stamp}.somaplay`;
}
```

E acrescentar ao bloco de imports do topo de `app/js/backup.js` — **só `PARTES_TODAS` nesta tarefa**; `podaPorPartes` e `fundeMusica` entram na Task 4, que é onde eles passam a ser usados. Import morto num commit é ruído:

```js
import { PARTES_TODAS } from './partes.js';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && node --test test/export.test.js`
Expected: PASS.

- [ ] **Step 5: Fix the only caller**

Em `app/js/main.js:663-670`, trocar a montagem do nome dentro de `exportBackup`:

```js
    const fileName = nomeDoExport(
      recorteDeFontes(fontes, t('settings.export.fileMulti')),
      stampDeHoje(),
      null,
      {},
    );
```

E acrescentar `recorteDeFontes` ao import de `./backup.js` no topo de `main.js`.

*(A Task 8 substitui esse `null` pelas partes escolhidas em Configurações. Aqui só se preserva o comportamento atual.)*

- [ ] **Step 6: Run the whole suite and syntax-check**

Run: `cd app && node --test && node --check js/backup.js && node --check js/main.js`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add app/js/backup.js app/js/main.js app/test/export.test.js
git commit -m "feat(backup): file name qualifies the split, not the parts

Split nomeDoExport in two: recorteDeFontes builds the middle from the
source selection, nomeDoExport adds the stamp and a suffix.

cifra and audio together qualify nothing, so a complete backup keeps the
name it has always had — asserted. Alone they become -cifras / -audio.
pessoal and lists stay out of the name; four stacked suffixes help nobody
pick a file out of a Downloads folder.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: `exportLibrary` e `importLibrary` falam partes

**Files:**
- Modify: `app/js/backup.js:52-135`
- Modify: `app/js/merge.js`
- Modify: `app/test/merge.test.js`

**Interfaces:**
- Consumes: `podaPorPartes`, `fundeMusica`, `PARTES_TODAS` (Tasks 1-2).
- Produces: `exportLibrary({songIds, listIds, partes, fileName})`; `lerManifest(file) → {manifest, blobsStart}`; `mergePlan(existing, incoming)` passa a devolver `songs` já fundidas e a ler `incoming.partes`.

- [ ] **Step 1: Write the failing test**

Primeiro, acrescentar ao topo de `app/test/merge.test.js`:

```js
import { PARTES_TODAS } from '../js/partes.js';
```

Depois, acrescentar ao fim do arquivo:

```js
// --- partes ----------------------------------------------------------------
// mergePlan passa a devolver a música FUNDIDA com a que já existe, e não a do
// arquivo. Quem grava (importLibrary) continua fazendo DB.putSong do que vem
// daqui — a fusão é que mudou de lugar.
const comAudio = () => ({
  artists: [{ id: 'a1', name: 'Gil' }],
  songs: [{ id: 's1', artistId: 'a1', title: 'Aquele Abraço', tom: 'D', favorita: true,
            cifra: { tipo: 'texto', texto: 'D A7', imagens: [], acordes: [], digitacoes: {} },
            stems: [{ blobId: 'aud1', vol: 60 }] }],
  lists: [],
});

test('manifest sem partes se comporta como arquivo completo', () => {
  const incoming = { artists: [{ id: 'a1', name: 'Gil' }], songs: [{ id: 's1', artistId: 'a1', title: 'Novo', tom: 'E' }], lists: [] };
  const p = mergePlan(comAudio(), incoming);
  assert.equal(p.songs[0].title, 'Novo');
  assert.equal(p.songs[0].tom, 'E');
});

test('arquivo leve não apaga o áudio nem a favorita de quem recebe', () => {
  const incoming = {
    partes: ['cifra'],
    artists: [{ id: 'a1', name: 'Gil' }],
    songs: [{ id: 's1', artistId: 'a1', title: 'Aquele Abraço', tom: 'E', cifra: { tipo: 'texto', texto: 'E B7' } }],
    lists: [],
  };
  const p = mergePlan(comAudio(), incoming);
  assert.deepEqual(p.songs[0].stems, [{ blobId: 'aud1', vol: 60 }]);
  assert.equal(p.songs[0].favorita, true);
  assert.equal(p.songs[0].cifra.texto, 'E B7');
  assert.equal(p.updated, 1);
  assert.equal(p.added, 0);
});

test('pacote de áudio não apaga a cifra de quem recebe', () => {
  const incoming = {
    partes: ['audio'],
    artists: [{ id: 'a1', name: 'Gil' }],
    songs: [{ id: 's1', artistId: 'a1', title: 'Aquele Abraço', stems: [{ blobId: 'novo', vol: 80 }] }],
    lists: [],
  };
  const p = mergePlan(comAudio(), incoming);
  assert.deepEqual(p.songs[0].stems, [{ blobId: 'novo', vol: 80 }]);
  assert.equal(p.songs[0].cifra.texto, 'D A7');
});

test('música nova de pacote de áudio nasce com cifra vazia e artista remapeado', () => {
  const existing = { artists: [{ id: 'DEV', name: 'Gil' }], songs: [], lists: [] };
  const incoming = {
    partes: ['audio'],
    artists: [{ id: 'BKP', name: 'Gil' }],
    songs: [{ id: 's7', artistId: 'BKP', title: 'Refazenda', stems: [{ blobId: 'x' }] }],
    lists: [],
  };
  const p = mergePlan(existing, incoming);
  assert.equal(p.added, 1);
  assert.equal(p.songs[0].artistId, 'DEV');
  assert.deepEqual(p.songs[0].cifra, { tipo: null, imagens: [], texto: '', acordes: [], digitacoes: {} });
});

test('backup completo continua sobrescrevendo tudo', () => {
  const incoming = {
    partes: PARTES_TODAS,
    artists: [{ id: 'a1', name: 'Gil' }],
    songs: [{ id: 's1', artistId: 'a1', title: 'Aquele Abraço', tom: 'G', favorita: false, stems: [], cifra: { tipo: 'texto', texto: 'G D' } }],
    lists: [],
  };
  const p = mergePlan(comAudio(), incoming);
  assert.equal(p.songs[0].tom, 'G');
  assert.equal(p.songs[0].favorita, false);
  assert.deepEqual(p.songs[0].stems, []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && node --test test/merge.test.js`
Expected: FAIL — "arquivo leve não apaga o áudio…" falha, porque hoje `p.songs[0]` é o registro do arquivo e não tem `stems`.

- [ ] **Step 3: Write minimal implementation**

Em `app/js/merge.js`, no topo:

```js
import { fundeMusica } from './partes.js';
```

Substituir o bloco que monta `songs` e `added` por:

```js
  const exById = new Map(((existing && existing.songs) || []).map((s) => [s.id, s]));
  const partes = (incoming && incoming.partes) || null;   // null = arquivo completo

  // A música que sai daqui é a FUNDIDA, não a do arquivo: quem grava faz
  // DB.putSong(s), que substitui o registro inteiro, e é essa substituição que
  // apagava o áudio e as favoritas de quem recebia.
  const songs = ((incoming && incoming.songs) || []).map((s) => {
    const artistId = remap[s.artistId] || s.artistId;
    return fundeMusica(exById.get(s.id) || null, { ...s, artistId }, partes);
  });

  let added = 0;
  for (const s of songs) if (!exById.has(s.id)) added++;
```

E trocar `const exSongIds = new Set(...)` da linha 7 — ele deixa de existir, substituído por `exById`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && node --test test/merge.test.js`
Expected: PASS, 9 testes.

- [ ] **Step 5: Wire the export side**

Primeiro, estender o import de `./partes.js` no topo de `app/js/backup.js` (a Task 3 deixou só `PARTES_TODAS`):

```js
import { PARTES_TODAS, podaPorPartes, fundeMusica } from './partes.js';
```

Depois, substituir a assinatura e o miolo de `exportLibrary`:

```js
// Sem argumento, o comportamento é o de sempre: a biblioteca inteira, todas as
// partes.
export async function exportLibrary({ songIds = null, listIds = null, partes = null, fileName = null } = {}) {
  const ps = partes || PARTES_TODAS;
  const corte = recorteParaExport({ artists: S.artists, songs: S.songs, lists: S.lists }, { songIds, listIds });
  // Podar PRIMEIRO, coletar depois: um pacote só de áudio tem registros sem
  // cifra.imagens, então blobIdsDasMusicas naturalmente devolve só os stems.
  // Ela NÃO ganha um parâmetro `partes` — é a definição única de "quais blobs
  // são desta música" (state.js:279), e um segundo eixo de verdade ali é
  // exatamente como apagar e exportar passam a discordar.
  const podadas = podaPorPartes(corte.songs, ps);
  const blobIds = blobIdsDasMusicas(podadas);
  const parts = [];
  const manifestBlobs = [];
  for (const id of blobIds) {
    const b = await DB.getBlob(id);
    if (!b) continue;
    manifestBlobs.push({ id, size: b.size, type: b.type || 'application/octet-stream' });
    parts.push(b);
  }
  // `version` continua 1: um arquivo parcial é um .somaplay v1 legítimo, e
  // `partes` ausente significa completo — que é como todo arquivo antigo é lido.
  const manifest = {
    version: 1,
    app: 'soma_play',
    partes: ps,
    artists: corte.artists,
    songs: podadas,
    lists: corte.lists,
    blobs: manifestBlobs,
  };
  if (ps.includes('cifra')) manifest.chordbook = chordbookRecords();
  if (ps.includes('pessoal')) manifest.settings = S.settings;
  const json = JSON.stringify(manifest);
  const header = MAGIC + String(new TextEncoder().encode(json).byteLength).padStart(10, '0') + '\n' + json;
  const blob = new Blob([header, ...parts], { type: 'application/octet-stream' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName || nomeDoExport('backup', stampDeHoje(), ps, {});
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
}
```

- [ ] **Step 6: Wire the import side**

Em `app/js/backup.js`, extrair a leitura do cabeçalho e usar as partes. Substituir `importLibrary` por:

```js
// Lê só o cabeçalho: magic + tamanho + JSON. O import precisa disso, e o diálogo
// de confirmação do "Substituir tudo" também — daí a função existir sozinha.
export async function lerManifest(file) {
  const headProbe = await file.slice(0, MAGIC.length + 11).text();
  if (!headProbe.startsWith(MAGIC)) throw new Error(t('msg.backup.notASomaplayFile'));
  const jsonLen = parseInt(headProbe.slice(MAGIC.length, MAGIC.length + 10), 10);
  const jsonStart = MAGIC.length + 11;
  const json = await file.slice(jsonStart, jsonStart + jsonLen).text();
  const manifest = JSON.parse(json);
  if (!manifest.songs || !manifest.artists) throw new Error(t('msg.backup.invalidBackup'));
  return { manifest, blobsStart: jsonStart + jsonLen };
}

export async function importLibrary(file, { merge = false } = {}) {
  const { manifest, blobsStart } = await lerManifest(file);
  const partes = manifest.partes || PARTES_TODAS;

  // Substituir apaga tudo antes; merge preserva a biblioteca (upsert por id).
  if (!merge) await DB.wipe();

  // blobs — upsert por id nos dois modos
  let off = blobsStart;
  for (const meta of manifest.blobs || []) {
    const chunk = file.slice(off, off + meta.size, meta.type);
    await DB.saveBlob(meta.id, chunk);
    off += meta.size;
  }

  let result;
  if (merge) {
    const plan = mergePlan({ artists: S.artists, songs: S.songs, lists: S.lists }, manifest);
    for (const a of plan.artists) await DB.putArtist(a);
    for (const s of plan.songs) await DB.putSong(s);
    for (const l of plan.lists) await DB.putList(l);
    // Ausência não é deleção, também aqui: um pacote só de áudio não fala do
    // dicionário, e não pode encostar nele.
    if (partes.includes('cifra')) await mergeChordbookRecords(manifest.chordbook || []);
    result = { added: plan.added, updated: plan.updated };
  } else {
    for (const a of manifest.artists) await DB.putArtist(a);
    // Mesmo no modo espelho a música precisa sair com a invariante da cifra —
    // um arquivo só de áudio criaria registros sem o objeto que todo render
    // assume que existe.
    for (const s of manifest.songs) await DB.putSong(fundeMusica(null, s, partes));
    for (const l of manifest.lists || []) await DB.putList(l);
    if (manifest.settings) {
      // lang/notação são preferências do aparelho: não viajam entre bibliotecas
      const { lang, chordNotation, chordNotationTouched, ...rest } = manifest.settings;
      S.settings = { ...S.settings, ...rest };
      await DB.saveSettings(S.settings);
    }
    if (partes.includes('cifra')) await replaceChordbook(manifest.chordbook || []);
    result = { artists: manifest.artists.length, songs: manifest.songs.length };
  }

  // recarrega o estado do IndexedDB (consistente nos dois modos)
  const all = await DB.loadAll();
  S.artists = all.artists.sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  S.songs = all.songs;
  S.lists = all.lists;
  return result;
}
```

- [ ] **Step 7: Run the whole suite and syntax-check**

Run: `cd app && node --test && node --check js/backup.js && node --check js/merge.js`
Expected: PASS.

- [ ] **Step 8: Verify in the browser — this is the layer the tests do not reach**

`cd app && python3 -m http.server 8137`, abrir `http://localhost:8137`.

1. Exportar um backup completo em Configurações. Abrir o `.somaplay` num editor de texto: o cabeçalho deve conter `"partes":["cifra","audio","pessoal"]`.
2. Importar esse arquivo em "Adicionar / atualizar": a biblioteca continua inteira, sem música duplicada.
3. Importar um `.somaplay` **antigo** (gerado antes desta branch, sem o campo `partes`): importa igual, nos dois modos.

- [ ] **Step 9: Commit**

```bash
git add app/js/backup.js app/js/merge.js app/test/merge.test.js
git commit -m "feat(backup): export and import speak parts

exportLibrary prunes the records before collecting blobs, so a file
without the audio part simply does not carry the audio bytes — and
blobIdsDasMusicas keeps being the single definition of what media a song
owns.

importLibrary reads manifest.partes and lets mergePlan fuse. Replace mode
routes through fundeMusica too, so a partial file cannot produce a song
without the cifra object every render assumes. The chordbook is only
touched when the file declares cifra.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: As chaves de tradução

**Files:**
- Modify: `app/js/i18n/pt.js`
- Modify: `app/js/i18n/en.js`

**Interfaces:**
- Consumes: nada.
- Produces: as chaves abaixo, usadas pelas Tasks 6-9.

- [ ] **Step 1: Add the keys to BOTH tables**

Acrescentar em `app/js/i18n/pt.js` e `app/js/i18n/en.js`, junto do bloco `settings.*` e num bloco novo `share.*`:

| chave | PT | EN |
|---|---|---|
| `common.share` | Compartilhar | Share |
| `common.moreOptions` | Mais opções | More options |
| `share.title` | Compartilhar "{name}" | Share "{name}" |
| `share.opt.cifras` | Só as cifras | Charts only |
| `share.opt.cifrasSub` | Cabe no WhatsApp. O áudio pode ir depois. | Fits in WhatsApp. The audio can follow later. |
| `share.opt.ambos` | Cifras + áudio | Charts + audio |
| `share.opt.ambosSub` | Tudo de uma vez. Melhor por Drive. | Everything at once. Better over Drive. |
| `share.opt.audio` | Só o áudio | Audio only |
| `share.opt.audioSub` | Pra quem já recebeu as cifras. | For someone who already has the charts. |
| `share.word.cifras` | cifras | charts |
| `share.word.audio` | audio | audio |
| `settings.export.what` | O que incluir | What to include |
| `settings.export.partCifra` | Cifras | Charts |
| `settings.export.partAudio` | Áudio | Audio |
| `settings.export.partListas` | Minhas listas | My lists |
| `settings.export.partPessoal` | Minhas favoritas e ajustes | My favourites and settings |
| `settings.export.nothingPart` | Marque cifras ou áudio | Check charts or audio |
| `msg.backup.replaceNoAudio` | Este arquivo não tem áudio. Substituir vai apagar o áudio da sua biblioteca. | This file has no audio. Replacing will delete your library's audio. |
| `msg.backup.replaceNoCifra` | Este arquivo não tem cifras. Substituir vai apagar as cifras da sua biblioteca. | This file has no charts. Replacing will delete your library's charts. |

`share.word.cifras` e `share.word.audio` viram **slug de nome de arquivo**, não rótulo de tela — por isso "audio" sem acento nas duas línguas.

- [ ] **Step 2: Run the parity test**

Run: `cd app && node --test test/i18n.test.js`
Expected: PASS — as duas tabelas têm exatamente o mesmo conjunto de chaves.

- [ ] **Step 3: Commit**

```bash
cd app && node --check js/i18n/pt.js && node --check js/i18n/en.js
git add app/js/i18n/pt.js app/js/i18n/en.js
git commit -m "i18n: keys for the share sheet and the export parts

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: `js/render/sharesheet.js` — a folha

**Files:**
- Create: `app/js/render/sharesheet.js`
- Create: `app/test/sharesheet.test.js`
- Modify: `app/sw.js` (SHELL)
- Modify: `app/js/db.js:147` (nova `blobSize`)
- Modify: `app/js/state.js:33` (novo `S.shareSheet`)

**Interfaces:**
- Consumes: `podaPorPartes` (Task 1), `blobIdsDasMusicas` de `state.js`, as chaves `share.*` (Task 5).
- Produces: `OPCOES: {id, partes}[]`, `formataTamanho(bytes: number|null) → string`, `renderShareSheet() → string`, `calculaTamanhos(songs) → Promise<{cifras, ambos, audio}>`.

- [ ] **Step 1: Write the failing test**

Criar `app/test/sharesheet.test.js`:

```js
// sharesheet.test.js — as duas peças puras da folha de compartilhar.
//
// OPCOES é o contrato: cada opção da folha vira um conjunto de partes, e é ele
// que chega no exportLibrary. Se alguém trocar 'ambos' por ['cifra'], nenhum
// teste de UI pega — este pega.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OPCOES, formataTamanho } from '../js/render/sharesheet.js';

test('cada opção da folha mapeia para as partes certas', () => {
  const porId = Object.fromEntries(OPCOES.map((o) => [o.id, o.partes]));
  assert.deepEqual(porId.cifras, ['cifra']);
  assert.deepEqual(porId.ambos, ['cifra', 'audio']);
  assert.deepEqual(porId.audio, ['audio']);
});

test('nenhuma opção da folha compartilha o pessoal', () => {
  // Compartilhar é dar conteúdo a alguém, não despejar o gosto de quem mandou.
  for (const o of OPCOES) assert.ok(!o.partes.includes('pessoal'), o.id);
});

test('o tamanho é legível na escala que importa', () => {
  assert.equal(formataTamanho(0), '0 KB');
  assert.equal(formataTamanho(1536), '2 KB');          // KB é sempre inteiro
  assert.equal(formataTamanho(1_800_000), '1,8 MB');
  assert.equal(formataTamanho(184_000_000), '184 MB');
  assert.equal(formataTamanho(2_500_000_000), '2,5 GB');
});

test('tamanho desconhecido não vira zero', () => {
  assert.equal(formataTamanho(null), '');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && node --test test/sharesheet.test.js`
Expected: FAIL — `Cannot find module '../js/render/sharesheet.js'`

- [ ] **Step 3: Add `DB.blobSize`**

Em `app/js/db.js`, logo depois de `deleteBlob` (linha 147):

```js
  // Only the size, without bringing the bytes. On OPFS getFile() is metadata, so
  // this is a stat. On the IDB fallback there is no way to know without loading
  // the whole blob into memory, and the share sheet would rather show no size
  // than stall a tablet — so it returns null.
  async blobSize(id) {
    const dir = await opfs();
    if (!dir) return null;
    try { return (await (await dir.getFileHandle(id)).getFile()).size; }
    catch (e) { return null; }
  },
```

- [ ] **Step 4: Write the module**

Criar `app/js/render/sharesheet.js`:

```js
// render/sharesheet.js — the contextual share sheet, opened from the ⋯ of a list
// or an artist.
//
// A sheet rather than three menu items because this is where the SIZE fits, and
// the size is exactly the decision being made: does this go through WhatsApp or
// through Drive.
//
// None of these options carries `pessoal`. Sharing is giving someone content,
// not dumping the sender's taste and settings on them — that is what the
// Settings block is for, where the normal job is backup.
import { S, blobIdsDasMusicas, songById } from '../state.js';
import { podaPorPartes } from '../partes.js';
import { DB } from '../db.js';
import { I, esc } from '../icons.js';
import { t } from '../i18n.js';

export const OPCOES = [
  { id: 'cifras', partes: ['cifra'] },
  { id: 'ambos', partes: ['cifra', 'audio'] },
  { id: 'audio', partes: ['audio'] },
];

// 1,8 MB reads; 1887436,8 bytes does not. One decimal below ten, none above, and
// KB always whole — nobody chooses a delivery channel over half a kilobyte.
// '' means "not measured yet", never 0, which would read as an empty file.
export function formataTamanho(bytes) {
  if (bytes === null || bytes === undefined) return '';
  const b = Math.max(bytes, 0);
  const um = (n, u) => `${(n < 10 ? n.toFixed(1) : String(Math.round(n))).replace('.', ',')} ${u}`;
  if (b >= 1e9) return um(b / 1e9, 'GB');
  if (b >= 1e6) return um(b / 1e6, 'MB');
  return `${Math.round(b / 1e3)} KB`;
}

// Os bytes de cada opção, medidos e não estimados. Só é chamada para um recorte
// limitado (uma lista, um artista): numa biblioteca inteira seriam milhares de
// handles, e é por isso que Configurações não mostra tamanho.
export async function calculaTamanhos(songs) {
  const soma = async (ids) => {
    let total = 0;
    for (const id of ids) {
      const n = await DB.blobSize(id);
      if (n === null) return null;    // fallback IDB: prefere não mostrar
      total += n;
    }
    return total;
  };
  const cifras = await soma(blobIdsDasMusicas(podaPorPartes(songs, ['cifra'])));
  const audio = await soma(blobIdsDasMusicas(podaPorPartes(songs, ['audio'])));
  return {
    cifras,
    audio,
    ambos: cifras === null || audio === null ? null : cifras + audio,
  };
}

export function renderShareSheet() {
  const sh = S.shareSheet;
  if (!sh) return '';
  const songs = [...sh.songIds].map(songById).filter(Boolean);
  const tam = sh.tamanhos || {};

  const linhas = OPCOES.map((o) => `
    <button class="check-row" data-a="pickShareOpt" data-id="${o.id}">
      <span class="checkbox ${sh.opcao === o.id ? 'on' : ''}">${sh.opcao === o.id ? I.check(15) : ''}</span>
      <span class="nm">
        <span>${t(`share.opt.${o.id}`)}</span>
        <span style="display:block;color:var(--muted);font-size:12px;margin-top:2px">${t(`share.opt.${o.id}Sub`)}</span>
      </span>
      <span class="ct">${formataTamanho(tam[o.id])}</span>
    </button>`).join('');

  // O data-a fica no backdrop, e a ação confere que o clique foi NELE: a
  // delegação global usa closest('[data-a]'), então sem essa checagem um clique
  // no fundo do painel encontraria o backdrop e fecharia a folha.
  return `<div class="sheet-backdrop" data-a="closeShare">
    <div class="sheet">
      <div style="font-family:var(--f-title);font-weight:600;font-size:17px">${esc(t('share.title', { name: sh.titulo }))}</div>
      <div style="color:var(--muted);font-size:13px;margin:2px 0 14px">${songs.length} ${t(songs.length === 1 ? 'common.song' : 'common.songs')}</div>
      ${linhas}
      <button class="btn-primary" style="width:100%;margin-top:14px" data-a="doShare">${I.uploadSm()}${t('common.share')}</button>
    </div>
  </div>`;
}
```

- [ ] **Step 5: Add the sheet state**

Em `app/js/state.js`, junto de `popoverSongId` (linha 32):

```js
  // folha de compartilhar (contextual, ⋯ da lista e do artista)
  // Vive só na sessão, como exportFontes: uma seleção que sobrevive ao fechar o
  // app vira um arquivo misteriosamente incompleto no próximo ensaio.
  shareSheet: null,        // { titulo, songIds:Set, listIds:Set|null, opcao, tamanhos }
  artistMenuOpen: false,
```

- [ ] **Step 6: Add the module to SHELL**

Em `app/sw.js`, depois de `'./js/render/settings.js',`:

```js
  './js/render/sharesheet.js',
```

- [ ] **Step 7: Add the sheet CSS**

Em `app/css/app.css`, ao fim:

```css
/* Folha de compartilhar — backdrop + painel ancorado embaixo, que é onde o
   polegar chega num tablet na estante. */
.sheet-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:60;display:flex;align-items:flex-end;justify-content:center}
.sheet{background:var(--panel);border:1px solid var(--border);border-radius:16px 16px 0 0;padding:20px;width:100%;max-width:520px;max-height:80vh;overflow-y:auto}
@media (min-width:560px){.sheet-backdrop{align-items:center}.sheet{border-radius:16px}}
```

- [ ] **Step 8: Run the tests**

Run: `cd app && node --test && node --check js/render/sharesheet.js && node --check js/db.js && node --check js/state.js`
Expected: PASS — `sharesheet.test.js` com 4 testes, e `shell.test.js` vendo o módulo novo.

- [ ] **Step 9: Commit**

```bash
git add app/js/render/sharesheet.js app/test/sharesheet.test.js app/js/db.js app/js/state.js app/sw.js app/css/app.css
git commit -m "feat(share): the contextual share sheet

A sheet rather than three menu items, because this is where the size fits
— and the size is the decision being made: WhatsApp or Drive.

DB.blobSize stats the OPFS file instead of reading it, and returns null on
the IDB fallback: the sheet would rather show no size than stall a tablet.
No option carries the pessoal part.

The sheet is not reachable yet; the next task wires the menus.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: O `⋯` da lista e do artista abrem a folha

**Files:**
- Modify: `app/js/render/listscreen.js:39-46`
- Modify: `app/js/render/artist.js:11-20`
- Modify: `app/js/main.js` (actions, render root, click-outside, Escape)

**Interfaces:**
- Consumes: `renderShareSheet`, `calculaTamanhos`, `OPCOES` (Task 6); `recorteDeFontes`, `nomeDoExport`, `exportLibrary` (Tasks 3-4).
- Produces: as ações `openShare`, `closeShare`, `pickShareOpt`, `doShare`, `toggleArtistMenu`.

- [ ] **Step 1: Add the menu item to the list screen**

Em `app/js/render/listscreen.js`, dentro do `.menu-pop` (linha 41-45), entre `togglePinList` e `deleteList`:

```js
        <button data-a="openShare" data-id="list">${I.uploadSm()}${t('common.share')}</button>
```

- [ ] **Step 2: Give the artist screen a ⋯**

Em `app/js/render/artist.js`, substituir a linha 19 (`${offlineBadge}`) por:

```js
      ${offlineBadge}
      <div class="menu-wrap">
        <button class="btn-icon" data-a="toggleArtistMenu" aria-label="${t('common.moreOptions')}">${I.dots(22)}</button>
        ${S.artistMenuOpen ? `<div class="menu-pop" style="width:218px">
          <button data-a="openShare" data-id="artist">${I.uploadSm()}${t('common.share')}</button>
        </div>` : ''}
      </div>
```

- [ ] **Step 3: Add the actions**

Em `app/js/main.js`, junto das outras ações de export (perto da linha 663):

```js
  toggleArtistMenu() { S.artistMenuOpen = !S.artistMenuOpen; update(); },

  // O ⋯ traduz o seu eixo em ids e entrega ao motor, que não sabe o que é lista
  // nem artista. listIds é o que impede que os outros repertórios do usuário
  // viajem junto para o amigo — e um artista não leva lista nenhuma.
  async openShare(d) {
    const daLista = d.id === 'list';
    const l = daLista ? listById(S.openListId) : null;
    const a = daLista ? null : artistById(S.artistId);
    if (daLista && !l) return;
    if (!daLista && !a) return;
    const songIds = daLista
      ? new Set(musicasPresentes(l))
      : new Set(songsOfArtist(a.id).map((s) => s.id));
    S.shareSheet = {
      titulo: daLista ? l.nome : a.name,
      songIds,
      listIds: daLista ? new Set([l.id]) : new Set(),
      opcao: 'cifras',
      tamanhos: null,
    };
    S.listMenuOpen = false;
    S.artistMenuOpen = false;
    update();
    // Os números chegam depois: medir são ~4 handles por música, e a folha não
    // pode esperar por eles para abrir.
    const songs = [...songIds].map(songById).filter(Boolean);
    const tam = await calculaTamanhos(songs);
    // Identidade pela referência do Set, não pelo título: abrir duas folhas
    // seguidas com o mesmo nome faria a medição da primeira sobrescrever a
    // segunda.
    if (S.shareSheet && S.shareSheet.songIds === songIds) {
      S.shareSheet.tamanhos = tam;
      update();
    }
  },
  // Só fecha se o clique foi no backdrop. A delegação global procura o
  // closest('[data-a]'), então um clique no fundo do painel também chega aqui.
  closeShare(d, ev) {
    if (ev && !ev.target.classList.contains('sheet-backdrop')) return;
    S.shareSheet = null;
    update();
  },
  pickShareOpt(d) { if (S.shareSheet) { S.shareSheet.opcao = d.id; update(); } },
  async doShare() {
    const sh = S.shareSheet;
    if (!sh) return;
    const opt = OPCOES.find((o) => o.id === sh.opcao);
    if (!opt) return;
    const fileName = nomeDoExport(sh.titulo, stampDeHoje(), opt.partes, {
      cifras: t('share.word.cifras'), audio: t('share.word.audio'),
    });
    S.shareSheet = null;
    update();
    toast(t('msg.backup.exporting'));
    try {
      await exportLibrary({ songIds: sh.songIds, listIds: sh.listIds, partes: opt.partes, fileName });
      toast(t('msg.backup.exported'));
    } catch (e) { toast(t('msg.backup.exportFailed', { error: e.message })); }
  },
```

Acrescentar aos imports do topo de `main.js`:

```js
import { renderShareSheet, calculaTamanhos, OPCOES } from './render/sharesheet.js';
```

E garantir que `musicasPresentes`, `songsOfArtist`, `artistById` e `songById` estejam no import de `./state.js`.

- [ ] **Step 4: Render the sheet over the screen**

Localizar a função que monta a tela em `main.js` (a que concatena `renderPopover()` ao HTML da tela) e acrescentar `renderShareSheet()` ao lado dela, no mesmo nível.

Run: `cd app && grep -n "renderPopover()" js/main.js` para achar o ponto exato.

- [ ] **Step 5: Close on outside click and on Escape**

Em `app/js/main.js:851`, ao lado da guarda do `listMenuOpen`:

```js
  if (S.artistMenuOpen && !e.target.closest('.menu-wrap')) { S.artistMenuOpen = false; update(); }
```

E em `main.js:901`, acrescentar `S.artistMenuOpen` à condição e ao reset. Antes dessa linha, a folha tem prioridade no Escape:

```js
    if (S.shareSheet) { S.shareSheet = null; update(); return; }
```

- [ ] **Step 6: Syntax-check and run the suite**

Run: `cd app && node --check js/main.js && node --check js/render/artist.js && node --check js/render/listscreen.js && node --test`
Expected: PASS.

- [ ] **Step 7: Verify in the browser**

1. Abrir uma lista com músicas que tenham áudio → `⋯` → Compartilhar. A folha abre com "Só as cifras" marcada e os tamanhos aparecem um instante depois.
2. Escolher "Só as cifras" → Compartilhar. O arquivo baixado se chama `somaplay-<lista>-cifras-<data>.somaplay` e é **muito menor** que o backup completo.
3. Abrir a tela de um artista → o `⋯` novo existe → Compartilhar → o arquivo baixado **não contém lista nenhuma** (abrir num editor e conferir `"lists":[]`).
4. Tocar fora da folha e apertar Escape fecham sem exportar.

- [ ] **Step 8: Commit**

```bash
git add app/js/main.js app/js/render/artist.js app/js/render/listscreen.js
git commit -m "feat(share): reach the sheet from the list and artist menus

The ⋯ translates its own axis into song ids and hands them to the engine,
which knows nothing about lists or artists. Sharing a list carries that
one list; sharing an artist carries none — which is 'send it without my
playlists', answered by the cut rather than by a checkbox.

The artist screen had no menu at all; it gets one.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Configurações — as quatro caixas

**Files:**
- Modify: `app/js/render/settings.js:135-177`
- Modify: `app/js/main.js:615-670`
- Modify: `app/js/state.js:34`

**Interfaces:**
- Consumes: `PARTES_TODAS` (Task 1), `recorteDeFontes`/`nomeDoExport` (Task 3), chaves `settings.export.part*` (Task 5).
- Produces: `S.exportPartes: string[]`, `S.exportListas: boolean`; ações `toggleExportParte`, `toggleExportListas`.

- [ ] **Step 1: Add the state**

Em `app/js/state.js`, junto de `exportFontes` (linha 34):

```js
  exportPartes: ['cifra', 'audio', 'pessoal'],  // o que de cada música; todas = backup
  exportListas: true,                           // as listas viajam? backup quer que sim
```

- [ ] **Step 2: Render the four checkboxes**

Em `app/js/render/settings.js`, dentro de `blocoExportar()`, acrescentar antes do `return`:

```js
  // As quatro caixas SÃO o vocabulário de partes, sem tradução de conceito. O
  // data-id vai cru: nome de parte é constante interna, nunca conteúdo do
  // usuário, e por isso nunca passa por t().
  const caixas = [
    { id: 'cifra', label: t('settings.export.partCifra'), on: S.exportPartes.includes('cifra') },
    { id: 'audio', label: t('settings.export.partAudio'), on: S.exportPartes.includes('audio') },
    { id: 'listas', label: t('settings.export.partListas'), on: S.exportListas },
    { id: 'pessoal', label: t('settings.export.partPessoal'), on: S.exportPartes.includes('pessoal') },
  ].map((c) => `
    <button class="check-row" data-a="${c.id === 'listas' ? 'toggleExportListas' : 'toggleExportParte'}" data-id="${c.id}">
      <span class="checkbox ${c.on ? 'on' : ''}">${c.on ? I.check(15) : ''}</span>
      <span class="nm">${c.label}</span>
    </button>`).join('');

  // Cifras e Áudio ambas desmarcadas geram um arquivo sem conteúdo nenhum. É
  // acidente, não caso de uso — o botão trava, pela mesma regra de "nenhuma
  // fonte marcada".
  const temConteudo = S.exportPartes.some((p) => p === 'cifra' || p === 'audio');
```

E substituir o cálculo de `acao` e o `return`:

```js
  const acao = !temConteudo
    ? t('settings.export.nothingPart')
    : n
      ? t('settings.export.action', { count: n, song: t(n === 1 ? 'common.song' : 'common.songs') })
      : t('settings.export.nothing');

  return `<div class="setting-block" style="padding:20px;margin-top:6px">
    <div style="font-family:var(--f-title);font-weight:600;font-size:17px;margin-bottom:4px">${t('settings.export.heading')}</div>
    <div style="color:var(--muted);font-size:13px;margin-bottom:10px">${t('settings.export.sub')}</div>
    ${linhas}
    <div style="color:var(--muted);font-size:12px;margin:16px 2px 6px;text-transform:uppercase;letter-spacing:.04em">${t('settings.export.what')}</div>
    ${caixas}
    <button class="btn-primary" style="width:100%;margin-top:12px" data-a="exportBackup" ${n && temConteudo ? '' : 'disabled'}>${I.download()}${acao}</button>
  </div>`;
```

- [ ] **Step 3: Add the actions**

Em `app/js/main.js`, junto de `toggleExportFonte`:

```js
  toggleExportParte(d) {
    S.exportPartes = S.exportPartes.includes(d.id)
      ? S.exportPartes.filter((p) => p !== d.id)
      : [...PARTES_TODAS.filter((p) => p === d.id || S.exportPartes.includes(p))];
    update();
  },
  toggleExportListas() { S.exportListas = !S.exportListas; update(); },
```

*(A remarcação reconstrói a partir de `PARTES_TODAS` para a ordem do array ser sempre a canônica — assim o `partes` gravado no arquivo não depende da ordem em que as caixas foram clicadas.)*

- [ ] **Step 4: Wire the export action**

Substituir `exportBackup` em `app/js/main.js:663-670` por:

```js
  async exportBackup() {
    const fontes = S.exportFontes;
    const partes = S.exportPartes;
    const sel = {
      songIds: fontes?.length ? songIdsDasFontes(S.songs, fontes) : null,
      listIds: S.exportListas ? null : new Set(),
    };
    const fileName = nomeDoExport(
      recorteDeFontes(fontes, t('settings.export.fileMulti')),
      stampDeHoje(),
      partes,
      { cifras: t('share.word.cifras'), audio: t('share.word.audio') },
    );
    toast(t('msg.backup.exporting'));
    try { await exportLibrary({ ...sel, partes, fileName }); toast(t('msg.backup.exported')); }
    catch (e) { toast(t('msg.backup.exportFailed', { error: e.message })); }
  },
```

E acrescentar `PARTES_TODAS` ao import de `./partes.js` no topo de `main.js`.

- [ ] **Step 5: Syntax-check and run the suite**

Run: `cd app && node --check js/main.js && node --check js/render/settings.js && node --check js/state.js && node --test`
Expected: PASS.

- [ ] **Step 6: Verify in the browser**

1. Com tudo marcado, exportar: o arquivo tem o mesmo nome de hoje (`somaplay-backup-<data>.somaplay`) e `"partes":["cifra","audio","pessoal"]`.
2. Desmarcar **Áudio**: o nome vira `somaplay-backup-cifras-<data>.somaplay` e o arquivo encolhe muito.
3. Desmarcar **Minhas listas**: abrir o arquivo e conferir `"lists":[]`.
4. Desmarcar **Minhas favoritas e ajustes**: conferir que não há `"settings"` no manifest e que nenhuma música tem `"favorita"`.
5. Desmarcar **Cifras** e **Áudio**: o botão fica desabilitado com "Marque cifras ou áudio".

- [ ] **Step 7: Commit**

```bash
git add app/js/main.js app/js/render/settings.js app/js/state.js
git commit -m "feat(settings): the export block speaks parts literally

Four checkboxes that ARE the parts vocabulary: Charts, Audio, My lists, My
favourites and settings. All checked by default, because in Settings the
normal job is backup.

Unchecking Audio is the WhatsApp-sized file; unchecking My lists is 'send
it without my playlists'; unchecking the last one says 'this goes to
someone else'. Charts and Audio both off disables the button — an empty
file is an accident, not a use case.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: O aviso do "Substituir tudo" com arquivo parcial

**Files:**
- Modify: `app/js/backup.js`
- Modify: `app/test/export.test.js`
- Modify: `app/js/main.js:796-831`

**Interfaces:**
- Consumes: `lerManifest` (Task 4), chaves `msg.backup.replaceNo*` (Task 5).
- Produces: `avisosDeSubstituir(partes: string[]|null) → string[]` (nomes de chave de tradução).

- [ ] **Step 1: Write the failing test**

Acrescentar a `app/test/export.test.js`:

```js
// --- o aviso do substituir -------------------------------------------------
// "Substituir tudo" com um arquivo parcial apaga o que o arquivo não traz. É a
// leitura honesta de "substituir", mas é fácil de fazer sem querer e é
// irreversível. A função devolve NOMES DE CHAVE, não texto: assim ela é pura e
// o teste não depende da tabela de tradução.
test('arquivo completo não gera aviso nenhum', () => {
  assert.deepEqual(avisosDeSubstituir(PARTES_TODAS), []);
  assert.deepEqual(avisosDeSubstituir(null), []);
});

test('arquivo sem áudio avisa que o áudio some', () => {
  assert.deepEqual(avisosDeSubstituir(['cifra']), ['msg.backup.replaceNoAudio']);
});

test('pacote só de áudio avisa que as cifras somem', () => {
  assert.deepEqual(avisosDeSubstituir(['audio']), ['msg.backup.replaceNoCifra']);
});

test('faltar só o pessoal não gera aviso', () => {
  assert.deepEqual(avisosDeSubstituir(['cifra', 'audio']), []);
});
```

E acrescentar `avisosDeSubstituir` ao import de `../js/backup.js` no topo do arquivo.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && node --test test/export.test.js`
Expected: FAIL — `does not provide an export named 'avisosDeSubstituir'`

- [ ] **Step 3: Write the implementation**

Em `app/js/backup.js`, logo depois de `lerManifest`:

```js
// Devolve NOMES DE CHAVE, não texto traduzido: assim a função continua pura e o
// teste não depende da tabela de i18n. `pessoal` não gera aviso — perder as
// favoritas num "substituir tudo" é o que substituir sempre fez.
export function avisosDeSubstituir(partes) {
  const ps = partes || PARTES_TODAS;
  const out = [];
  if (!ps.includes('audio')) out.push('msg.backup.replaceNoAudio');
  if (!ps.includes('cifra')) out.push('msg.backup.replaceNoCifra');
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && node --test test/export.test.js`
Expected: PASS.

- [ ] **Step 5: Show the warning before the confirm**

Em `app/js/main.js`, dentro de `wireBackupInput`, substituir o bloco de confirmação (linhas 803-809) por:

```js
    const merge = S.importMode === 'merge';
    const total = S.songs.length;
    if (merge) {
      if (!confirm(t('msg.backup.confirmMerge', { name: f.name }))) return;
    } else if (total > 0) {
      // O aviso precisa do manifest, então ele é lido ANTES do confirm. É só o
      // cabeçalho — alguns KB, não o arquivo.
      let partes = null;
      try { partes = (await lerManifest(f)).manifest.partes || null; }
      catch (e) { toast(t('msg.backup.importFailed', { error: e.message })); return; }
      const avisos = avisosDeSubstituir(partes).map((k) => t(k)).join('\n');
      const pergunta = t('msg.backup.confirmReplace', { name: f.name, count: total, song: total === 1 ? t('common.song') : t('common.songs') });
      if (!confirm(avisos ? `${avisos}\n\n${pergunta}` : pergunta)) return;
    }
```

E acrescentar `lerManifest, avisosDeSubstituir` ao import de `./backup.js` no topo de `main.js`.

- [ ] **Step 6: Syntax-check and run the suite**

Run: `cd app && node --check js/backup.js && node --check js/main.js && node --test`
Expected: PASS.

- [ ] **Step 7: Verify in the browser**

1. Gerar um arquivo "só as cifras" pela folha. Em Configurações, "Substituir tudo" com ele: o diálogo mostra a linha do áudio **antes** da pergunta de sempre.
2. "Substituir tudo" com um backup completo: nenhum aviso extra.
3. Cancelar o diálogo não importa nada.
4. Escolher um arquivo que não é `.somaplay`: o toast de erro aparece e nenhum diálogo abre.

- [ ] **Step 8: Commit**

```bash
git add app/js/backup.js app/js/main.js app/test/export.test.js
git commit -m "feat(backup): warn before replacing everything with a partial file

Replace-all with a chart-only file deletes the whole library's audio. That
is the honest reading of 'replace', but it is easy to do by accident and
it does not come back.

avisosDeSubstituir returns key names rather than text, so it stays pure
and the test does not depend on the translation tables. The manifest is
read before the confirm — a few KB of header, not the file.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: `navigator.share` — mandar sem passar por Downloads

**Files:**
- Modify: `app/js/backup.js` (`exportLibrary` devolve o arquivo)
- Modify: `app/js/main.js` (`doShare`)

**Interfaces:**
- Consumes: `exportLibrary` (Task 4), `doShare` (Task 7).
- Produces: `exportLibrary()` passa a devolver `File`; `entregaArquivo(file) → Promise<void>`.

- [ ] **Step 1: Make exportLibrary return the file instead of only downloading**

Em `app/js/backup.js`, substituir o fim de `exportLibrary` (o trecho do `<a download>`) por:

```js
  const nome = fileName || nomeDoExport('backup', stampDeHoje(), ps, {});
  return new File([header, ...parts], nome, { type: 'application/octet-stream' });
}

// Como o arquivo chega na mão da pessoa. No Chrome Android a folha do sistema
// manda direto pro WhatsApp — um toque, em vez de baixar, achar em Downloads e
// anexar. Onde não existir, o caminho de sempre continua inteiro por baixo.
//
// Cancelar a folha do sistema lança AbortError, e isso NÃO é uma falha: sem
// esta guarda o usuário veria um toast de erro por ter mudado de ideia.
export async function entregaArquivo(file) {
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return; }
    catch (e) { if (e && e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
}
```

- [ ] **Step 2: Deliver the file at both call sites**

Em `app/js/main.js`, em `doShare` (Task 7) e em `exportBackup` (Task 8), trocar a chamada:

```js
      await entregaArquivo(await exportLibrary({ songIds: sh.songIds, listIds: sh.listIds, partes: opt.partes, fileName }));
```

```js
    try { await entregaArquivo(await exportLibrary({ ...sel, partes, fileName })); toast(t('msg.backup.exported')); }
```

E acrescentar `entregaArquivo` ao import de `./backup.js`.

- [ ] **Step 3: Syntax-check and run the suite**

Run: `cd app && node --check js/backup.js && node --check js/main.js && node --test`
Expected: PASS — nenhum teste puro toca em `exportLibrary`, que sempre dependeu de DOM.

- [ ] **Step 4: Verify in the browser — this one only proves itself on the tablet**

1. Desktop (Chrome sem suporte a compartilhar arquivo): tanto a folha quanto Configurações continuam **baixando** o arquivo, com o nome certo. Nenhum erro no console.
2. Tablet Android: Compartilhar abre a folha do sistema; escolher WhatsApp anexa o `.somaplay`.
3. Tablet Android: abrir a folha do sistema e **cancelar** — nenhum toast de erro aparece.

- [ ] **Step 5: Commit**

```bash
git add app/js/backup.js app/js/main.js
git commit -m "feat(share): hand the file to the system share sheet when there is one

exportLibrary returns a File; entregaArquivo decides how it reaches the
person. On Chrome Android that is one tap into WhatsApp instead of
download, find in Downloads, attach. Everywhere else the download path is
untouched underneath.

Cancelling the system sheet raises AbortError and is not a failure —
without the guard, changing your mind would show an error toast.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Versão 0.12.0 e a verificação de ponta a ponta

**Files:**
- Modify: `app/js/version.js`
- Modify: `app/sw.js:2`
- Modify: `CHANGELOG.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: tudo.
- Produces: release.

- [ ] **Step 0: Add the CHANGELOG entry**

`app/test/version.test.js:27` exige `## [<VERSION>]` em `CHANGELOG.md` — subir a versão sem isso deixa a suíte vermelha. Acrescentar no topo da lista de versões, **acima** de `## [0.11.0]`, no formato Keep a Changelog que o arquivo já usa:

```markdown
## [0.12.0] - 2026-08-15

### Added

- A `.somaplay` file now declares which **parts** it carries — `cifra`, `audio`,
  `pessoal` — and sharing can leave parts out. You can send a repertoire as
  charts only, small enough for WhatsApp, and send the audio afterwards as a
  separate pack that finds its own songs.

  New: **Compartilhar** in the ⋯ of a list and of an artist, with the size of
  each option shown before you choose; and four checkboxes in Settings — Charts,
  Audio, My lists, My favourites and settings — that are the same vocabulary,
  so a backup can be narrowed the same way.

### Fixed

- Importing a file no longer overwrites what the receiving device did with those
  songs. The merge now only touches the fields of the parts the file actually
  declares, so a shared repertoire stops wiping the recipient's favourites, and
  a chart-only file stops deleting audio that is already there. Absence in a
  file is no longer read as an instruction to delete.
```

- [ ] **Step 1: Bump both literals**

`app/js/version.js`:

```js
export const VERSION = '0.12.0';
```

`app/sw.js`, linha 2:

```js
const VERSION = 'somaplay-0.12.0';
```

MINOR porque é capacidade nova, pela tabela de `2026-08-14-versionamento-design.md`.

- [ ] **Step 2: Run the full suite**

Run: `cd app && node --test`
Expected: PASS — `version.test.js` confirma os dois literais em sincronia, `shell.test.js` confirma `partes.js` e `sharesheet.js` no SHELL, `i18n.test.js` confirma a paridade.

- [ ] **Step 3: The end-to-end verification the tests cannot reach**

`cd app && python3 -m http.server 8137`. Em **três perfis limpos** do navegador (janela anônima serve), rodar os três roteiros:

**Roteiro A — o caso do WhatsApp**
1. No perfil 1 (biblioteca cheia), abrir uma lista com áudio → `⋯` → Compartilhar → **Só as cifras** → o tamanho na folha bate com o do arquivo baixado.
2. Importar esse arquivo no perfil 2 em "Adicionar / atualizar": as músicas aparecem em **T1**, sem botão de play quebrado, e a lista aparece.
3. No perfil 1, compartilhar a mesma lista como **Só o áudio**; importar no perfil 2.
4. **O T2 acende sozinho** nas músicas, com a mixagem que foi mandada.

**Roteiro B — a ordem invertida**
1. No perfil 3, importar primeiro o pacote **Só o áudio**: as músicas aparecem com áudio e cifra vazia.
2. Importar depois o arquivo **Só as cifras**: a cifra preenche e **o áudio continua lá**.
3. O resultado final é igual ao do perfil 2.

**Roteiro C — o que era o bug**
1. No perfil 2, favoritar duas das músicas recebidas e mudar o tom de uma.
2. No perfil 1, editar a cifra de uma delas e compartilhar a lista de novo como **Só as cifras**.
3. Importar no perfil 2 em "Adicionar / atualizar": a cifra atualiza, e **as duas favoritas continuam marcadas**.

E os casos de borda:
- Backup completo em Configurações: mesmo nome de hoje; importar em "Substituir tudo" restaura favoritas e ajustes.
- Um `.somaplay` gerado **antes desta branch** importa igual, nos dois modos.
- "Substituir tudo" com um arquivo leve mostra o aviso novo antes.
- Trocar PT/EN com a folha aberta: os rótulos traduzem; nome de lista e de fonte, não.
- No tablet: as opções da folha dão para acertar com o dedo, e `navigator.share` abre a folha do sistema.

- [ ] **Step 4: Update CLAUDE.md**

Em `CLAUDE.md`, na seção "Things that will bite you", acrescentar:

```markdown
**Um campo novo na música precisa entrar em `CAMPOS`, em `app/js/partes.js`.** O mapa
parte→campos é o que decide o que viaja num arquivo compartilhado. Um campo que não está
lá viaja no backup completo (que devolve o registro intacto) e **some silenciosamente de
todo compartilhamento** — o pior tipo de bug, porque o caminho que você testa é o que
funciona. O mesmo mapa é lido pela poda da exportação e pela fusão da importação, de
propósito: duas verdades ali é como as duas passam a discordar.
```

E na seção **Architecture**, trocar o marcador `**Storage:**` por:

```markdown
- **Storage:** large files (audio, images) in OPFS; metadata in IndexedDB. A `.somaplay`
  file declares which `partes` it carries — `cifra`, `audio`, `pessoal` — and the merge
  only touches the fields of the declared parts. Absence is not deletion, which is what
  lets a chart-only file and an audio pack merge in either order.
```

- [ ] **Step 5: Commit**

```bash
git add app/js/version.js app/sw.js CHANGELOG.md CLAUDE.md
git commit -m "release: 0.12.0 — file parts

MINOR: new capability. Both version literals move together, and the SHELL
gains partes.js and render/sharesheet.js — without the new cache key,
installed clients keep serving the old module list.

CLAUDE.md gains the trap: a new song field must be added to CAMPOS in
partes.js, or it travels in a backup and silently vanishes from every
share.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Self-review deste plano

**Cobertura da spec.** Cada seção da spec tem tarefa: `partes` no manifest (T1, T4) · identidade sempre (T1) · mixagem com o áudio (T1, teste explícito) · `createdAt` pessoal (T1) · chordbook com cifra (T4) · merge campo-a-campo (T2, T4) · invariante da cifra vazia (T2, T4) · pacote sozinho cria a música (T2, T4) · nome do arquivo (T3) · folha de compartilhar com tamanhos (T6) · `⋯` da lista e do artista (T7) · quatro caixas em Configurações (T8) · aviso do substituir (T9) · `navigator.share` (T10) · versão e SHELL (T11) · i18n nas duas tabelas (T5).

**Fora do plano, e é de propósito:** fundir listas por união, marcar "áudio disponível", compartilhar pela pílula de fonte, tamanho em Configurações, persistir a seleção entre sessões — todos registrados na spec como fora de escopo.

**Consistência de nomes entre tarefas.** `PARTES_TODAS`, `CAMPOS`, `IDENTIDADE`, `podaPorPartes`, `fundeMusica` (T1-T2, `partes.js`) · `recorteDeFontes`, `nomeDoExport`, `lerManifest`, `avisosDeSubstituir`, `entregaArquivo` (T3, T4, T9, T10, `backup.js`) · `OPCOES`, `formataTamanho`, `calculaTamanhos`, `renderShareSheet` (T6, `sharesheet.js`) · `S.shareSheet`, `S.artistMenuOpen`, `S.exportPartes`, `S.exportListas` (T6, T8, `state.js`) · `DB.blobSize` (T6, `db.js`).

**Uma mudança de assinatura, num só chamador.** `nomeDoExport` muda na T3; o único chamador é `main.js`, ajustado na mesma tarefa, e reajustado na T8 quando as partes existem para passar.
