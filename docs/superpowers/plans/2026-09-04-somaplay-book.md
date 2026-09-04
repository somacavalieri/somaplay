# O livro de arquivos `.somaplay` — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compilar um backup completo `.somaplay` em `chords/-somaplay-book/` — seis seções, 6.673 arquivos, regeneráveis do zero.

**Architecture:** Um compilador Node em `scripts/somaplay_book/` que **importa as funções puras do próprio app** (`recorteParaExport`, `podaPorPartes`, `songIdsDasFontes`, `blobIdsDasMusicas`, `blobIdsDosLivros`, `lerManifest`) e escreve o contêiner por offset. O único código de formato novo é `container.mjs`; o resto é agrupamento e nomeação. Nada em `app/` é modificado.

**Tech Stack:** Node >= 20 (medido em v25.9.0), ES modules `.mjs`, `node --test`, zero dependências.

**Spec:** `docs/superpowers/specs/2026-09-04-somaplay-book-design.md`

## Global Constraints

- **Zero dependências.** Sem `package.json`, sem npm, sem build. Só a biblioteca padrão do Node.
- **Nada em `app/` é modificado.** O compilador só importa. Se uma função do app parecer precisar de mudança, pare e reporte — é sinal de que o plano errou, não de que o app deve mudar.
- **Comentários dos arquivos novos em inglês**, pela regra do CLAUDE.md ("comments in new files"). Este plano e a spec continuam em português.
- **`partes` dos arquivos de música é exatamente `['cifra', 'anotacoes']`.** Nunca `audio` (levaria `stems: []` e apagaria áudio no destino), nunca `pessoal`.
- **`chordbook` só nos arquivos de `sources/`.** São 252 KB; em 6.169 arquivos seriam 1,5 GB.
- **Saída em `chords/-somaplay-book/`**, que é gitignored (`/chords/` e `*.somaplay` já estão no `.gitignore`). **Nenhum `.somaplay` gerado entra em commit.**
- **Backup de referência:** `bkp/somaplay-backup-2026-09-04.somaplay` — 284 artistas, 6.169 músicas, 10 listas, 35 livros, 79 blobs, 840 MB.
- **Testes:** `node --test scripts/somaplay_book/` a partir da raiz do repositório.
- Toda função pura recebe os dados por parâmetro. Nenhum módulo do compilador lê `S` (o estado global do app).

---

### Task 1: `container.mjs` — ler e escrever o contêiner

**Files:**
- Create: `scripts/somaplay_book/container.mjs`
- Test: `scripts/somaplay_book/container.test.mjs`

**Interfaces:**
- Consumes: nada (primeira task).
- Produces:
  - `MAGIC: string` — `'SOMAPLAY1\n'`
  - `montaCabecalho(manifest: object) => Buffer`
  - `leCabecalho(buf: Buffer) => { manifest: object, inicioDosBlobs: number }`
  - `indexaBlobs(manifest: object, inicioDosBlobs: number) => Map<string, {posicao: number, tamanho: number, type: string}>`
  - `abreBackup(caminho: string) => Promise<{ manifest, blobs: Map, fh: FileHandle, fecha: () => Promise<void> }>`
  - `escreveBundle(caminho: string, manifest: object, blobIds: string[], origem: {blobs, fh}) => Promise<object>` — devolve o manifesto realmente escrito (com o array `blobs` preenchido)
  - `confereBundle(caminho: string) => Promise<{manifest, blobsStart}>` — relê com o `lerManifest` do app

- [ ] **Step 1: Write the failing test**

Crie `scripts/somaplay_book/container.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  MAGIC, montaCabecalho, leCabecalho, indexaBlobs,
  abreBackup, escreveBundle, confereBundle,
} from './container.mjs';

// Um backup de mentira com dois blobs, para os testes de offset e de cópia.
async function backupFalso(dir) {
  const manifest = {
    version: 1, app: 'soma_play', partes: ['cifra', 'audio', 'pessoal'],
    artists: [{ id: 'a1', name: 'Artista' }],
    songs: [{ id: 's1', artistId: 'a1', title: 'Música' }],
    lists: [], books: [],
    blobs: [{ id: 'b1', size: 5, type: 'image/png' }, { id: 'b2', size: 3, type: 'audio/mp3' }],
  };
  const caminho = join(dir, 'falso.somaplay');
  await writeFile(caminho, Buffer.concat([
    montaCabecalho(manifest), Buffer.from('AAAAA'), Buffer.from('BBB'),
  ]));
  return caminho;
}

test('montaCabecalho e leCabecalho fecham o ciclo', () => {
  const manifest = { version: 1, app: 'soma_play', artists: [], songs: [], blobs: [] };
  const buf = montaCabecalho(manifest);
  assert.equal(buf.subarray(0, MAGIC.length).toString('utf8'), MAGIC);
  const { manifest: lido, inicioDosBlobs } = leCabecalho(buf);
  assert.deepEqual(lido, manifest);
  assert.equal(inicioDosBlobs, buf.length);
});

test('o tamanho no cabeçalho conta BYTES, não caracteres', () => {
  // 'ç' e 'ã' ocupam dois bytes em UTF-8. Se o cabeçalho contasse caracteres, o
  // JSON seria cortado no meio e o app não abriria o arquivo.
  const manifest = { app: 'soma_play', artists: [], songs: [{ title: 'Construção' }], blobs: [] };
  const { manifest: lido } = leCabecalho(montaCabecalho(manifest));
  assert.equal(lido.songs[0].title, 'Construção');
});

test('leCabecalho recusa um arquivo que não é .somaplay', () => {
  assert.throws(() => leCabecalho(Buffer.from('isto é um pdf qualquer')), /não é um arquivo/);
});

test('indexaBlobs soma os offsets na ordem do manifesto', () => {
  const manifest = { blobs: [{ id: 'b1', size: 5, type: 't' }, { id: 'b2', size: 3, type: 't' }] };
  const mapa = indexaBlobs(manifest, 100);
  assert.deepEqual(mapa.get('b1'), { posicao: 100, tamanho: 5, type: 't' });
  assert.deepEqual(mapa.get('b2'), { posicao: 105, tamanho: 3, type: 't' });
});

test('abreBackup entrega manifesto e índice de blobs', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'somabook-'));
  const origem = await abreBackup(await backupFalso(dir));
  assert.equal(origem.manifest.songs.length, 1);
  assert.equal(origem.blobs.size, 2);
  await origem.fecha();
});

test('escreveBundle copia os bytes do blob escolhido, e só dele', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'somabook-'));
  const origem = await abreBackup(await backupFalso(dir));
  const saida = join(dir, 'bundle.somaplay');
  const escrito = await escreveBundle(
    saida,
    { version: 1, app: 'soma_play', partes: ['cifra'], artists: [], songs: [], lists: [], books: [] },
    ['b2'],
    origem,
  );
  assert.deepEqual(escrito.blobs, [{ id: 'b2', size: 3, type: 'audio/mp3' }]);
  const bytes = await readFile(saida);
  const { inicioDosBlobs } = leCabecalho(bytes);
  assert.equal(bytes.subarray(inicioDosBlobs).toString(), 'BBB');
  await origem.fecha();
});

test('escreveBundle ignora um blob que o backup não tem', async () => {
  // Não é erro: o registro viaja sem os bytes, como um export feito num aparelho
  // onde o arquivo sumiu do OPFS.
  const dir = await mkdtemp(join(tmpdir(), 'somabook-'));
  const origem = await abreBackup(await backupFalso(dir));
  const saida = join(dir, 'bundle.somaplay');
  const escrito = await escreveBundle(saida, { app: 'soma_play', artists: [], songs: [] }, ['nao-existe'], origem);
  assert.deepEqual(escrito.blobs, []);
  await origem.fecha();
});

test('confereBundle relê com o lerManifest do app', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'somabook-'));
  const origem = await abreBackup(await backupFalso(dir));
  const saida = join(dir, 'bundle.somaplay');
  await escreveBundle(saida, {
    version: 1, app: 'soma_play', partes: ['cifra', 'anotacoes'],
    artists: [{ id: 'a1', name: 'Artista' }], songs: [{ id: 's1', artistId: 'a1', title: 'Música' }],
    lists: [], books: [],
  }, [], origem);
  const { manifest } = await confereBundle(saida);
  assert.equal(manifest.songs.length, 1);
  assert.deepEqual(manifest.partes, ['cifra', 'anotacoes']);
  await origem.fecha();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/somaplay_book/container.test.mjs`
Expected: FAIL — `Cannot find module .../container.mjs`

- [ ] **Step 3: Write the implementation**

Crie `scripts/somaplay_book/container.mjs`:

```javascript
// container.mjs — reading and writing the .somaplay container.
//
// The format, from backup.js: "SOMAPLAY1\n" + the JSON length in ten digits +
// "\n" + the JSON + the blob bytes, concatenated in the order of manifest.blobs.
//
// This is the ONLY part of the format the book implements for itself. What a
// file carries — which fields, which parts — comes from the app's own modules,
// deliberately: a second copy of that rule is how the book and the app would
// start disagreeing. See the spec, "O compilador".
//
// Reading is by offset. The backup is 840 MB and a single book inside it is
// 300 MB; neither is ever held whole in memory.

import { open } from 'node:fs/promises';
import { lerManifest } from '../../app/js/backup.js';

export const MAGIC = 'SOMAPLAY1\n';
const DIGITOS = 10;
const CABECALHO_FIXO = MAGIC.length + DIGITOS + 1; // magic + digits + '\n'

// The JSON length counts BYTES (the app writes it with TextEncoder). Counting
// characters would truncate the JSON on the first accented title.
export function montaCabecalho(manifest) {
  const json = Buffer.from(JSON.stringify(manifest), 'utf8');
  const tamanho = String(json.byteLength).padStart(DIGITOS, '0');
  return Buffer.concat([Buffer.from(MAGIC, 'utf8'), Buffer.from(`${tamanho}\n`, 'ascii'), json]);
}

export function leCabecalho(buf) {
  if (buf.subarray(0, MAGIC.length).toString('utf8') !== MAGIC) {
    throw new Error('não é um arquivo .somaplay');
  }
  const tamanho = parseInt(buf.subarray(MAGIC.length, MAGIC.length + DIGITOS).toString('ascii'), 10);
  if (!Number.isInteger(tamanho) || tamanho <= 0) throw new Error('cabeçalho corrompido');
  const json = buf.subarray(CABECALHO_FIXO, CABECALHO_FIXO + tamanho).toString('utf8');
  return { manifest: JSON.parse(json), inicioDosBlobs: CABECALHO_FIXO + tamanho };
}

// id → where its bytes are. The manifest lists the blobs in the order they were
// written and nothing else in the file marks the boundaries, so the offsets are
// a running sum of the sizes.
export function indexaBlobs(manifest, inicioDosBlobs) {
  const mapa = new Map();
  let posicao = inicioDosBlobs;
  for (const b of manifest.blobs || []) {
    mapa.set(b.id, { posicao, tamanho: b.size, type: b.type || 'application/octet-stream' });
    posicao += b.size;
  }
  return mapa;
}

// Reads the header in two passes: the fixed part tells how long the JSON is,
// then the JSON itself. Keeps the handle open — every bundle copies its bytes
// straight out of it.
export async function abreBackup(caminho) {
  const fh = await open(caminho, 'r');
  const fixo = Buffer.alloc(CABECALHO_FIXO);
  await fh.read(fixo, 0, CABECALHO_FIXO, 0);
  const tamanho = parseInt(fixo.subarray(MAGIC.length, MAGIC.length + DIGITOS).toString('ascii'), 10);
  const inteiro = Buffer.alloc(CABECALHO_FIXO + (Number.isInteger(tamanho) ? tamanho : 0));
  await fh.read(inteiro, 0, inteiro.length, 0);
  const { manifest, inicioDosBlobs } = leCabecalho(inteiro);
  return { manifest, blobs: indexaBlobs(manifest, inicioDosBlobs), fh, fecha: () => fh.close() };
}

const PEDACO = 1 << 20; // 1 MB

// `blobIds` decides BOTH the manifest's blob list and the bytes that follow, so
// the two cannot disagree — which is the failure that would produce a file the
// app opens and then reads garbage from.
//
// A blob the backup does not carry is skipped rather than fatal: the record
// travels without its bytes, exactly like an export from a device where the
// file had gone missing from the OPFS.
export async function escreveBundle(caminho, manifest, blobIds, origem) {
  const escolhidos = [];
  for (const id of blobIds) {
    const b = origem.blobs.get(id);
    if (b) escolhidos.push({ id, ...b });
  }
  const completo = {
    ...manifest,
    blobs: escolhidos.map((b) => ({ id: b.id, size: b.tamanho, type: b.type })),
  };
  const saida = await open(caminho, 'w');
  try {
    await saida.write(montaCabecalho(completo));
    const buf = Buffer.alloc(PEDACO);
    for (const b of escolhidos) {
      let lido = 0;
      while (lido < b.tamanho) {
        const n = Math.min(PEDACO, b.tamanho - lido);
        await origem.fh.read(buf, 0, n, b.posicao + lido);
        await saida.write(buf, 0, n);
        lido += n;
      }
    }
  } finally {
    await saida.close();
  }
  return completo;
}

// Verification layer two: read the file back with the APP's own reader, not
// ours. A bundle our leCabecalho accepts and lerManifest rejects is a bundle the
// app cannot open, and that is the only opinion that matters.
//
// Only the header is handed to it — lerManifest slices the head and then the
// JSON, never the blob bytes, so a 300 MB book is checked without loading it.
export async function confereBundle(caminho) {
  const fh = await open(caminho, 'r');
  try {
    const fixo = Buffer.alloc(CABECALHO_FIXO);
    await fh.read(fixo, 0, CABECALHO_FIXO, 0);
    const tamanho = parseInt(fixo.subarray(MAGIC.length, MAGIC.length + DIGITOS).toString('ascii'), 10);
    const inteiro = Buffer.alloc(CABECALHO_FIXO + (Number.isInteger(tamanho) ? tamanho : 0));
    await fh.read(inteiro, 0, inteiro.length, 0);
    return await lerManifest(new File([inteiro], caminho));
  } finally {
    await fh.close();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/somaplay_book/container.test.mjs`
Expected: PASS, 7 testes.

- [ ] **Step 5: Sanity check against the real backup**

Run:
```bash
node -e "
import('./scripts/somaplay_book/container.mjs').then(async (C) => {
  const o = await C.abreBackup('bkp/somaplay-backup-2026-09-04.somaplay');
  console.log(o.manifest.songs.length, 'músicas,', o.blobs.size, 'blobs');
  await o.fecha();
})"
```
Expected: `6169 músicas, 79 blobs`

- [ ] **Step 6: Commit**

```bash
git add scripts/somaplay_book/container.mjs scripts/somaplay_book/container.test.mjs
git commit -m "feat(book): read and write the .somaplay container from Node

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `nomes.mjs` — onde cada arquivo cai e como se chama

**Files:**
- Create: `scripts/somaplay_book/nomes.mjs`
- Test: `scripts/somaplay_book/nomes.test.mjs`

**Interfaces:**
- Consumes: nada da Task 1.
- Produces:
  - `slug(texto: string) => string` — vazio vira `'sem-nome'`
  - `pastaDeFonte(nome: string) => string` — `'__sem_fonte'` vira `'_sem-fonte'`
  - `arquivoDeFonte(nome: string) => string` — o mesmo, em forma de nome de arquivo
  - `pastaSegura(nome: string) => string` — nome legível de pasta, sem separador de caminho
  - `resolveColisoes(itens: {caminho, id}[]) => { itens: {caminho, id}[], colisoes: {caminho, resolvido, id}[] }`

- [ ] **Step 1: Write the failing test**

Crie `scripts/somaplay_book/nomes.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slug, pastaDeFonte, arquivoDeFonte, pastaSegura, resolveColisoes } from './nomes.mjs';

test('slug tira acento, caixa e pontuação', () => {
  assert.equal(slug('Construção'), 'construcao');
  assert.equal(slug('Ó Que Será?'), 'o-que-sera');
  assert.equal(slug('  Águas de Março  '), 'aguas-de-marco');
});

test('slug nunca devolve vazio', () => {
  // Um título só de pontuação existiria como arquivo sem nome, e o arquivo
  // seguinte na mesma pasta o sobrescreveria.
  assert.equal(slug('???'), 'sem-nome');
  assert.equal(slug(''), 'sem-nome');
  assert.equal(slug(null), 'sem-nome');
});

test('pastaDeFonte troca o sentinela do app por uma pasta legível', () => {
  assert.equal(pastaDeFonte('__sem_fonte'), '_sem-fonte');
  assert.equal(pastaDeFonte('CifraClub'), 'CifraClub');
  assert.equal(pastaDeFonte('VJ'), 'VJ');
});

test('arquivoDeFonte preserva o sublinhado que o slug comeria', () => {
  // slug('_sem-fonte') devolve 'sem-fonte': o sublinhado não é [a-z0-9] e o slug
  // apara os hífens das pontas. O marcador tem que sobreviver, senão a fonte sem
  // procedência deixa de ordenar antes das outras e passa a parecer uma fonte real.
  assert.equal(arquivoDeFonte('__sem_fonte'), '_sem-fonte');
  assert.equal(arquivoDeFonte('CifraClub'), 'cifraclub');
  assert.equal(arquivoDeFonte('VJ'), 'vj');
});

test('pastaSegura mantém a legibilidade e mata o separador de caminho', () => {
  // O acento fica: a pasta é para o olho de quem navega. A barra sai: um artista
  // chamado "AC/DC" viraria duas pastas.
  assert.equal(pastaSegura('Chico Buarque'), 'Chico Buarque');
  assert.equal(pastaSegura('AC/DC'), 'AC-DC');
  assert.equal(pastaSegura('a\\b'), 'a-b');
  assert.equal(pastaSegura('  Cartola  '), 'Cartola');
  assert.equal(pastaSegura(''), '_sem-nome');
});

test('resolveColisoes numera a partir da segunda ocorrência', () => {
  const { itens, colisoes } = resolveColisoes([
    { caminho: 'songs/Songbook/Tom Jobim/samba-de-uma-nota-so.somaplay', id: 'x1' },
    { caminho: 'songs/Songbook/Tom Jobim/samba-de-uma-nota-so.somaplay', id: 'x2' },
    { caminho: 'songs/VJ/Cartola/o-mundo-e-um-moinho.somaplay', id: 'x3' },
  ]);
  assert.equal(itens[0].caminho, 'songs/Songbook/Tom Jobim/samba-de-uma-nota-so.somaplay');
  assert.equal(itens[1].caminho, 'songs/Songbook/Tom Jobim/samba-de-uma-nota-so-2.somaplay');
  assert.equal(itens[2].caminho, 'songs/VJ/Cartola/o-mundo-e-um-moinho.somaplay');
  assert.equal(colisoes.length, 1);
  assert.equal(colisoes[0].id, 'x2');
});

test('resolveColisoes é determinística: a mesma entrada dá o mesmo sufixo', () => {
  const entrada = [
    { caminho: 'books/o-melhor-de-gonzaguinha.somaplay', id: 'b1' },
    { caminho: 'books/o-melhor-de-gonzaguinha.somaplay', id: 'b2' },
    { caminho: 'books/o-melhor-de-gonzaguinha.somaplay', id: 'b3' },
  ];
  const a = resolveColisoes(entrada).itens.map((i) => i.caminho);
  const b = resolveColisoes(entrada).itens.map((i) => i.caminho);
  assert.deepEqual(a, b);
  assert.deepEqual(a, [
    'books/o-melhor-de-gonzaguinha.somaplay',
    'books/o-melhor-de-gonzaguinha-2.somaplay',
    'books/o-melhor-de-gonzaguinha-3.somaplay',
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/somaplay_book/nomes.test.mjs`
Expected: FAIL — `Cannot find module .../nomes.mjs`

- [ ] **Step 3: Write the implementation**

Crie `scripts/somaplay_book/nomes.mjs`:

```javascript
// nomes.mjs — where each bundle lands and what it is called.
//
// The naming rule is the book's own, and NOT the app's nomeDoExport. That one
// names a file landing alone in a Downloads folder, where the date and the
// cifras/audio qualifier are the only clue to what it is. Here the folder says
// all of that already, and repeating it inside artists/VJ/ would be noise.
// Two naming schemes, two places, on purpose. Spec: "A estrutura".
//
// Folder names stay readable (accents and all — they are for the eye of whoever
// browses the Drive); file names are slugs, because a file name ends up in a
// Downloads folder, a message attachment, someone else's device, and has to
// survive any filesystem.

import { SEM_FONTE } from '../../app/js/state.js';

// The same rule as the private slug() in backup.js. It is copied rather than
// imported because it is not exported there, and because it is a filename rule,
// not a data rule — the thing CAMPOS warns about is duplicating what decides
// which FIELDS travel, and this decides none.
export function slug(texto) {
  const s = String(texto ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return s || 'sem-nome';
}

// fontesDaBiblioteca hands back the app's canonical spelling of every source,
// plus the SEM_FONTE sentinel for the songs that have none. The sentinel becomes
// a folder that sorts first and cannot collide with a real source name.
export function pastaDeFonte(nome) {
  return nome === SEM_FONTE ? '_sem-fonte' : pastaSegura(nome);
}

// The same, as a file name. Not slug(pastaDeFonte(nome)): the slug would eat the
// leading underscore ('_' is not [a-z0-9], and the trailing trim removes the
// hyphen it becomes), and '_sem-fonte' would land as 'sem-fonte' — a name that
// no longer sorts first and reads like a real source.
export function arquivoDeFonte(nome) {
  return nome === SEM_FONTE ? '_sem-fonte' : slug(nome);
}

// Readable, but never able to invent a directory level: an artist called "AC/DC"
// would otherwise become two folders.
export function pastaSegura(nome) {
  const s = String(nome ?? '').replace(/[/\\]/g, '-').replace(/\s+/g, ' ').trim();
  return s || '_sem-nome';
}

// Two songs with the same artist and title in the same source is a real
// duplicate in the library — there is exactly one today — not a defect of this
// naming scheme. So the file is written with a suffix and the case is reported;
// overwriting would hide a song, and aborting would let two records block the
// other 6.167.
//
// The suffix follows the caller's order, and the caller sorts by id, so
// recompiling always lands the same suffix on the same record.
export function resolveColisoes(itens) {
  const vistos = new Map();
  const colisoes = [];
  const out = [];
  for (const it of itens) {
    const n = (vistos.get(it.caminho) || 0) + 1;
    vistos.set(it.caminho, n);
    if (n === 1) { out.push(it); continue; }
    const resolvido = it.caminho.replace(/\.somaplay$/, `-${n}.somaplay`);
    colisoes.push({ caminho: it.caminho, resolvido, id: it.id });
    out.push({ ...it, caminho: resolvido });
  }
  return { itens: out, colisoes };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/somaplay_book/nomes.test.mjs`
Expected: PASS, 6 testes.

- [ ] **Step 5: Commit**

```bash
git add scripts/somaplay_book/nomes.mjs scripts/somaplay_book/nomes.test.mjs
git commit -m "feat(book): naming and collision rules for the book's files

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: `secoes.mjs` — a seção `sources/`

**Files:**
- Create: `scripts/somaplay_book/secoes.mjs`
- Test: `scripts/somaplay_book/secoes.test.mjs`

**Interfaces:**
- Consumes: `slug`, `pastaDeFonte` (Task 2).
- Produces:
  - `PARTES_DO_LIVRO: string[]` — `['cifra', 'anotacoes']`
  - `Bundle` = `{ secao: string, caminho: string, id: string, manifest: object, blobIds: string[] }`
  - `bundlesDeFontes(estado: {artists, songs, lists, chordbook}) => Bundle[]`

- [ ] **Step 1: Write the failing test**

Crie `scripts/somaplay_book/secoes.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PARTES_DO_LIVRO, bundlesDeFontes } from './secoes.mjs';

// Uma biblioteca mínima com o que importa: duas fontes, um artista em ambas,
// uma música sem fonte, campos pessoais e de áudio presentes para provar a poda.
function biblioteca() {
  return {
    artists: [{ id: 'a1', name: 'Cartola' }, { id: 'a2', name: 'Belchior' }],
    songs: [
      { id: 's1', artistId: 'a1', title: 'O mundo é um moinho', fonte: 'VJ', estilo: 'Samba',
        tom: 'C', cifra: { tipo: 'texto', texto: 'C G' }, letra: '', stems: [], full: [],
        favorita: true, createdAt: 1 },
      { id: 's2', artistId: 'a1', title: 'Alvorada', fonte: 'CifraClub', estilo: 'Samba',
        tom: 'D', cifra: { tipo: 'texto', texto: 'D A' }, letra: '', stems: [], full: [],
        favorita: false, createdAt: 2 },
      { id: 's3', artistId: 'a2', title: 'Como nossos pais', fonte: 'CifraClub', estilo: 'MPB',
        tom: 'E', cifra: { tipo: 'texto', texto: 'E B' }, letra: '', stems: [], full: [],
        favorita: false, createdAt: 3 },
      { id: 's4', artistId: 'a2', title: 'Sem procedência', tom: 'A',
        cifra: { tipo: 'texto', texto: 'A' }, letra: '', stems: [], full: [], createdAt: 4 },
    ],
    lists: [{ id: 'l1', nome: 'Roda', fixada: false, musicas: ['s1', 's2'] }],
    chordbook: [{ nome: 'C', shape: 'x32010' }],
  };
}

test('sai um arquivo por fonte, mais o balde de sem-fonte', () => {
  const bs = bundlesDeFontes(biblioteca());
  assert.deepEqual(bs.map((b) => b.caminho).sort(), [
    'sources/_sem-fonte.somaplay',
    'sources/cifraclub.somaplay',
    'sources/vj.somaplay',
  ]);
  assert.ok(bs.every((b) => b.secao === 'sources'));
});

test('cada arquivo leva só as músicas da sua fonte', () => {
  const bs = bundlesDeFontes(biblioteca());
  const cc = bs.find((b) => b.caminho === 'sources/cifraclub.somaplay');
  assert.deepEqual(cc.manifest.songs.map((s) => s.id).sort(), ['s2', 's3']);
});

test('o artista viaja só nas fontes onde ele tem música', () => {
  const bs = bundlesDeFontes(biblioteca());
  const vj = bs.find((b) => b.caminho === 'sources/vj.somaplay');
  assert.deepEqual(vj.manifest.artists.map((a) => a.id), ['a1']);
});

test('a poda tira áudio e pessoal, e mantém cifra, estilo e fonte', () => {
  const bs = bundlesDeFontes(biblioteca());
  const vj = bs.find((b) => b.caminho === 'sources/vj.somaplay');
  const s = vj.manifest.songs[0];
  assert.deepEqual(vj.manifest.partes, PARTES_DO_LIVRO);
  assert.deepEqual(PARTES_DO_LIVRO, ['cifra', 'anotacoes']);
  // O que NÃO pode estar: stems/full apagariam áudio no destino, favorita e
  // createdAt sobrescreveriam o que é de quem recebe.
  assert.equal('stems' in s, false);
  assert.equal('full' in s, false);
  assert.equal('favorita' in s, false);
  assert.equal('createdAt' in s, false);
  // O que precisa estar:
  assert.equal(s.title, 'O mundo é um moinho');
  assert.equal(s.fonte, 'VJ');
  assert.equal(s.estilo, 'Samba');
  assert.equal(s.tom, 'C');
  assert.equal(s.cifra.texto, 'C G');
});

test('as listas viajam inteiras nas fontes, com os ids órfãos', () => {
  // A regra do app (state.js:123): a lista vai inteira e as músicas que faltam
  // se curam quando a outra fonte for importada.
  const bs = bundlesDeFontes(biblioteca());
  const vj = bs.find((b) => b.caminho === 'sources/vj.somaplay');
  assert.deepEqual(vj.manifest.lists[0].musicas, ['s1', 's2']);
});

test('o chordbook viaja nas fontes', () => {
  const bs = bundlesDeFontes(biblioteca());
  assert.equal(bs[0].manifest.chordbook.length, 1);
});

test('nada de settings, e nenhum livro', () => {
  const bs = bundlesDeFontes(biblioteca());
  for (const b of bs) {
    assert.equal('settings' in b.manifest, false);
    assert.deepEqual(b.manifest.books, []);
    assert.deepEqual(b.blobIds, []);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/somaplay_book/secoes.test.mjs`
Expected: FAIL — `Cannot find module .../secoes.mjs`

- [ ] **Step 3: Write the implementation**

Crie `scripts/somaplay_book/secoes.mjs`:

```javascript
// secoes.mjs — the six sections of the book.
//
// Every function here is pure: it takes the library and returns a list of
// bundles to write. Nothing here knows about files.
//
// The one thing to keep in mind while reading: this module decides GROUPING
// only. What a bundle carries is decided by podaPorPartes, and which artists
// ride along by recorteParaExport — both the app's own, so a new song field
// starts travelling in the book without anyone editing this file.

import { recorteParaExport } from '../../app/js/backup.js';
import { podaPorPartes } from '../../app/js/partes.js';
import { songIdsDasFontes, blobIdsDasMusicas, fontesDaBiblioteca } from '../../app/js/state.js';
import { slug, pastaDeFonte, arquivoDeFonte } from './nomes.mjs';

// Never 'audio' (every record has stems: [] and full: [] PRESENT, and
// copiaCampos copies by `k in src` — so declaring audio would write [] over the
// recipient's stems). Never 'pessoal' (it would overwrite their favourites, and
// leaving createdAt out is what makes an imported song land at the top of
// Recentes instead of at the epoch). Spec: "O que cada arquivo carrega".
export const PARTES_DO_LIVRO = ['cifra', 'anotacoes'];

// The shape every music section produces. `chordbook` only ever arrives from
// bundlesDeFontes — 252 KB times 6.169 files is 1.5 GB of duplicated dictionary.
function bundleDeMusicas({ secao, caminho, id, artists, songs, lists, chordbook = null }) {
  // Prune first, collect after — the order backup.js uses, and for its reason:
  // with audio pruned away, blobIdsDasMusicas naturally returns only the images.
  const podadas = podaPorPartes(songs, PARTES_DO_LIVRO);
  const manifest = {
    version: 1,
    app: 'soma_play',
    partes: PARTES_DO_LIVRO,
    artists,
    songs: podadas,
    lists,
    books: [],
    blobs: [],
  };
  if (chordbook) manifest.chordbook = chordbook;
  return { secao, caminho, id, manifest, blobIds: blobIdsDasMusicas(podadas) };
}

// One file per source, plus the bucket for the songs that have none.
//
// The source list comes from fontesDaBiblioteca, so the folders are exactly the
// pills the app shows — what you filter on screen is what you download. It also
// dedupes spellings ("cifraclub" and "CifraClub" are one source), and
// songIdsDasFontes matches the same way, including the SEM_FONTE sentinel.
//
// listIds is null on purpose: the lists travel whole here, orphan ids included,
// which is what the app does for a source export (state.js:123).
export function bundlesDeFontes({ artists, songs, lists, chordbook = null }) {
  return fontesDaBiblioteca(songs).map(({ nome }) => {
    const songIds = songIdsDasFontes(songs, [nome]);
    const corte = recorteParaExport({ artists, songs, lists }, { songIds, listIds: null });
    return bundleDeMusicas({
      secao: 'sources',
      caminho: `sources/${arquivoDeFonte(nome)}.somaplay`,
      id: nome,
      artists: corte.artists,
      songs: corte.songs,
      lists: corte.lists,
      chordbook,
    });
  });
}

export { bundleDeMusicas };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/somaplay_book/secoes.test.mjs`
Expected: PASS, 7 testes.

- [ ] **Step 5: Commit**

```bash
git add scripts/somaplay_book/secoes.mjs scripts/somaplay_book/secoes.test.mjs
git commit -m "feat(book): the sources section, pruned by the app's own rules

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: `catalogo.mjs` — o índice e o catálogo

**Files:**
- Create: `scripts/somaplay_book/catalogo.mjs`
- Test: `scripts/somaplay_book/catalogo.test.mjs`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `markdownDeIndice({secao, linhas}) => string` — `linhas: {caminho, artistas, musicas, bytes}[]`
  - `markdownDeCatalogo({origem, geradoEm, secoes, colisoes}) => string` — `secoes: {secao, arquivos, musicas, bytes}[]`

- [ ] **Step 1: Write the failing test**

Crie `scripts/somaplay_book/catalogo.test.mjs`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markdownDeIndice, markdownDeCatalogo } from './catalogo.mjs';

test('o índice lista os arquivos com as contagens', () => {
  const md = markdownDeIndice({
    secao: 'sources',
    linhas: [
      { caminho: 'sources/vj.somaplay', artistas: 169, musicas: 5523, bytes: 12_000_000 },
      { caminho: 'sources/rn.somaplay', artistas: 36, musicas: 108, bytes: 300_000 },
    ],
  });
  assert.match(md, /# sources/);
  assert.match(md, /\| `vj\.somaplay` \| 169 \| 5\.523 \| 11,4 MB \|/);
  assert.match(md, /\| `rn\.somaplay` \| 36 \| 108 \| 293,0 KB \|/);
  assert.match(md, /gerado por `scripts\/somaplay_book`/);
});

test('o catálogo diz de qual backup a pasta nasceu', () => {
  // É a linha que responde "está batendo?": o número aqui contra o número na
  // tela do app.
  const md = markdownDeCatalogo({
    origem: 'bkp/somaplay-backup-2026-09-04.somaplay',
    geradoEm: '2026-09-04',
    secoes: [{ secao: 'sources', arquivos: 7, musicas: 6169, bytes: 14_000_000 }],
    colisoes: [],
  });
  assert.match(md, /somaplay-backup-2026-09-04\.somaplay/);
  assert.match(md, /2026-09-04/);
  assert.match(md, /\| `sources\/` \| 7 \| 6\.169 \|/);
});

test('o catálogo abre uma seção "A conferir" quando há colisão', () => {
  const md = markdownDeCatalogo({
    origem: 'x.somaplay', geradoEm: '2026-09-04', secoes: [],
    colisoes: [{ caminho: 'songs/Songbook/Tom Jobim/samba-de-uma-nota-so.somaplay',
                 resolvido: 'songs/Songbook/Tom Jobim/samba-de-uma-nota-so-2.somaplay', id: 'abc' }],
  });
  assert.match(md, /## A conferir/);
  assert.match(md, /samba-de-uma-nota-so-2\.somaplay/);
  assert.match(md, /abc/);
});

test('sem colisão, a seção "A conferir" não aparece', () => {
  const md = markdownDeCatalogo({ origem: 'x', geradoEm: 'y', secoes: [], colisoes: [] });
  assert.equal(md.includes('A conferir'), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/somaplay_book/catalogo.test.mjs`
Expected: FAIL — `Cannot find module .../catalogo.mjs`

- [ ] **Step 3: Write the implementation**

Crie `scripts/somaplay_book/catalogo.mjs`:

```javascript
// catalogo.mjs — the book's table of contents.
//
// Markdown, like the rest of the acervo (INDICE.md per document, PROGRESSO.md
// aggregated), for the same reason: it reads in the Drive and on GitHub, it
// takes a Cmd+F, and it survives having no tooling at hand.
//
// Unlike chords/, there is no hand-written prose to preserve here — the whole
// folder is generated, so there is no <!-- chord:auto --> region to respect and
// these files are rewritten whole.

const numero = (n) => new Intl.NumberFormat('pt-BR').format(n);

// KB and MB with a comma, because the rest of the book is in Portuguese.
export function tamanho(bytes) {
  const uma = (v, u) => `${v.toFixed(1).replace('.', ',')} ${u}`;
  if (bytes >= 1024 * 1024) return uma(bytes / (1024 * 1024), 'MB');
  if (bytes >= 1024) return uma(bytes / 1024, 'KB');
  return `${bytes} B`;
}

const rodape = '\n_Arquivo gerado por `scripts/somaplay_book`. Não edite à mão: ele é reescrito inteiro a cada compilação._\n';

export function markdownDeIndice({ secao, linhas }) {
  const nome = (c) => c.slice(c.indexOf('/') + 1);
  const corpo = linhas
    .map((l) => `| \`${nome(l.caminho)}\` | ${numero(l.artistas)} | ${numero(l.musicas)} | ${tamanho(l.bytes)} |`)
    .join('\n');
  return `# ${secao}

| Arquivo | Artistas | Músicas | Tamanho |
|---|---:|---:|---:|
${corpo}
${rodape}`;
}

export function markdownDeCatalogo({ origem, geradoEm, secoes, colisoes }) {
  const corpo = secoes
    .map((s) => `| \`${s.secao}/\` | ${numero(s.arquivos)} | ${numero(s.musicas)} | ${tamanho(s.bytes)} |`)
    .join('\n');
  const total = secoes.reduce((a, s) => a + s.arquivos, 0);
  let md = `# O livro — catálogo

**Gerado em:** ${geradoEm}
**A partir de:** \`${origem}\`

Esta pasta é **inteiramente derivada**. A biblioteca do app é a fonte de verdade;
aqui nada se edita à mão. Se um número abaixo não bate com a tela do app, o app
está certo — exporte um backup completo e recompile.

| Seção | Arquivos | Músicas | Tamanho |
|---|---:|---:|---:|
${corpo}

**${numero(total)} arquivos** ao todo.
`;
  if (colisoes.length) {
    md += `
## A conferir

${colisoes.length === 1 ? 'Um registro caiu' : `${numero(colisoes.length)} registros caíram`} no mesmo nome de arquivo que outro. Foram escritos com sufixo, para
nenhum deles sumir — mas duas músicas com o mesmo artista e o mesmo título na
mesma fonte são, quase sempre, uma duplicata de verdade na biblioteca. O lugar
de resolver é o app.

| Nome disputado | Escrito como | id do registro |
|---|---|---|
${colisoes.map((c) => `| \`${c.caminho}\` | \`${c.resolvido}\` | \`${c.id}\` |`).join('\n')}
`;
  }
  return md + rodape;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/somaplay_book/catalogo.test.mjs`
Expected: PASS, 4 testes.

- [ ] **Step 5: Commit**

```bash
git add scripts/somaplay_book/catalogo.mjs scripts/somaplay_book/catalogo.test.mjs
git commit -m "feat(book): generate CATALOGO.md and the per-section INDICE.md

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: `compilar.mjs` — o CLI, e a seção `sources/` de verdade

Esta é a **etapa 1 da spec**: o compilador inteiro, ponta a ponta, com sete arquivos.

**Files:**
- Create: `scripts/somaplay_book/compilar.mjs`
- Create: `scripts/somaplay_book/README.md`

**Interfaces:**
- Consumes: `abreBackup`, `escreveBundle`, `confereBundle` (Task 1); `resolveColisoes` (Task 2); `bundlesDeFontes` (Task 3); `markdownDeIndice`, `markdownDeCatalogo` (Task 4).
- Produces: o executável. Sem exports consumidos por outras tasks.

- [ ] **Step 1: Write the CLI**

Crie `scripts/somaplay_book/compilar.mjs`:

```javascript
#!/usr/bin/env node
// compilar.mjs — turns a full backup into chords/-somaplay-book/.
//
//   node scripts/somaplay_book/compilar.mjs [--backup <arquivo>] [--saida <dir>]
//                                           [--secao <nome>]... [--limpar] [--seco]
//
// With no --secao, every section except books/ is compiled: books/ is 826 MB of
// PDF and the only slow path, so it is asked for by name.
//
// --seco compiles and verifies without writing (a dry run).
// --limpar wipes the section folders first, so a file whose source record was
// deleted does not survive as a ghost.

import { mkdir, rm, writeFile, stat, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bundlesDeFontes } from './secoes.mjs';
import { abreBackup, escreveBundle, confereBundle } from './container.mjs';
import { resolveColisoes } from './nomes.mjs';
import { markdownDeIndice, markdownDeCatalogo } from './catalogo.mjs';

// fileURLToPath, e nunca .pathname: o repositório mora em ".../My Drive/...", e
// .pathname devolveria "My%20Drive" — todo caminho montado a partir dele
// apontaria para uma pasta que não existe.
const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const SAIDA_PADRAO = join(RAIZ, 'chords/-somaplay-book');

// The sections, in the order the spec builds them. Each is a function from the
// library to a list of bundles; adding one later is one line here plus one
// function in secoes.mjs.
const SECOES = {
  sources: bundlesDeFontes,
};
const PADRAO = ['sources'];

function argumentos(argv) {
  const out = { backup: null, saida: SAIDA_PADRAO, secoes: [], limpar: false, seco: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--backup') out.backup = argv[++i];
    else if (a === '--saida') out.saida = argv[++i];
    else if (a === '--secao') out.secoes.push(argv[++i]);
    else if (a === '--limpar') out.limpar = true;
    else if (a === '--seco') out.seco = true;
    else throw new Error(`argumento desconhecido: ${a}`);
  }
  if (!out.secoes.length) out.secoes = PADRAO;
  for (const s of out.secoes) {
    if (!SECOES[s]) throw new Error(`seção desconhecida: ${s} (há: ${Object.keys(SECOES).join(', ')})`);
  }
  return out;
}

// The newest backup in bkp/, by file name. The names carry the date, so sorting
// them is sorting by date — and a name that lies would be a lie in the
// CATALOGO.md too, where it is printed.
async function backupMaisNovo() {
  const dir = join(RAIZ, 'bkp');
  const nomes = (await readdir(dir))
    .filter((n) => n.startsWith('somaplay-backup-') && n.endsWith('.somaplay'))
    .sort();
  if (!nomes.length) throw new Error('nenhum backup em bkp/');
  return join(dir, nomes[nomes.length - 1]);
}

async function main() {
  const opts = argumentos(process.argv.slice(2));
  const caminhoDoBackup = opts.backup || await backupMaisNovo();
  console.log(`origem: ${caminhoDoBackup}`);

  const origem = await abreBackup(caminhoDoBackup);
  try {
    const { artists = [], songs = [], lists = [], books = [], chordbook = null } = origem.manifest;
    const estado = { artists, songs, lists, books, chordbook };
    console.log(`  ${artists.length} artistas · ${songs.length} músicas · ${lists.length} listas · ${books.length} livros`);

    // Collisions are resolved across ALL sections at once: a book and a source
    // never share a path, but resolving globally means one rule and one report.
    const brutos = opts.secoes.flatMap((s) => SECOES[s](estado));
    brutos.sort((a, b) => (a.caminho < b.caminho ? -1 : a.caminho > b.caminho ? 1 : (a.id < b.id ? -1 : 1)));
    const { itens: bundles, colisoes } = resolveColisoes(brutos);

    if (opts.limpar && !opts.seco) {
      for (const s of opts.secoes) await rm(join(opts.saida, s), { recursive: true, force: true });
    }

    const porSecao = new Map();
    for (const b of bundles) {
      const destino = join(opts.saida, b.caminho);
      let bytes = 0;
      if (!opts.seco) {
        await mkdir(dirname(destino), { recursive: true });
        await escreveBundle(destino, b.manifest, b.blobIds, origem);
        // Verification layer two: the app's own reader has to accept what we
        // wrote, and the counts have to match what we thought we were writing.
        const { manifest } = await confereBundle(destino);
        if (manifest.songs.length !== b.manifest.songs.length) {
          throw new Error(`${b.caminho}: escrevi ${b.manifest.songs.length} músicas e reli ${manifest.songs.length}`);
        }
        bytes = (await stat(destino)).size;
      }
      const linha = { caminho: b.caminho, artistas: b.manifest.artists.length, musicas: b.manifest.songs.length, bytes };
      if (!porSecao.has(b.secao)) porSecao.set(b.secao, []);
      porSecao.get(b.secao).push(linha);
    }

    if (!opts.seco) {
      for (const [secao, linhas] of porSecao) {
        // A pasta já existe quando houve bundle, mas uma seção vazia (uma
        // biblioteca sem lista nenhuma) chegaria aqui sem ela.
        await mkdir(join(opts.saida, secao), { recursive: true });
        await writeFile(join(opts.saida, secao, 'INDICE.md'), markdownDeIndice({ secao, linhas }));
      }
      const secoes = [...porSecao].map(([secao, linhas]) => ({
        secao,
        arquivos: linhas.length,
        musicas: linhas.reduce((a, l) => a + l.musicas, 0),
        bytes: linhas.reduce((a, l) => a + l.bytes, 0),
      }));
      await mkdir(opts.saida, { recursive: true });
      await writeFile(join(opts.saida, 'CATALOGO.md'), markdownDeCatalogo({
        origem: caminhoDoBackup.replace(RAIZ, ''),
        geradoEm: new Date().toISOString().slice(0, 10),
        secoes,
        colisoes,
      }));
    }

    for (const [secao, linhas] of porSecao) console.log(`  ${secao}: ${linhas.length} arquivos`);
    if (colisoes.length) console.log(`  ${colisoes.length} colisão(ões) — veja "A conferir" no CATALOGO.md`);
    console.log(opts.seco ? 'seco: nada foi escrito' : `pronto: ${opts.saida}`);
  } finally {
    await origem.fecha();
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); });
```

- [ ] **Step 2: Dry run against the real backup**

Run:
```bash
node scripts/somaplay_book/compilar.mjs --backup bkp/somaplay-backup-2026-09-04.somaplay --seco
```
Expected: imprime `284 artistas · 6169 músicas · 10 listas · 35 livros` e `sources: 7 arquivos`, sem escrever nada.

- [ ] **Step 3: Compile for real**

Run:
```bash
node scripts/somaplay_book/compilar.mjs --backup bkp/somaplay-backup-2026-09-04.somaplay --limpar
ls -la chords/-somaplay-book/sources/
cat chords/-somaplay-book/CATALOGO.md
```
Expected: 7 arquivos `.somaplay` (`vj`, `songbook`, `rv`, `cifraclub`, `rn`, `vitale`, `_sem-fonte`) mais `INDICE.md`; `vj.somaplay` é o maior, na casa de 11–12 MB. Nenhuma colisão nesta seção.

- [ ] **Step 4: Remove the hand-made folders that the new names replace**

As pastas `artists/cifraclub`, `artists/songbook`, `songs/cifraclub`, `songs/songbook`, `style/cifraclub`, `style/songbook` foram criadas à mão em minúsculas; a grafia da biblioteca é `CifraClub` e `Songbook`. Estão vazias.

Run:
```bash
find chords/-somaplay-book -type d -empty -print
rmdir chords/-somaplay-book/{artists,songs,style}/{cifraclub,songbook} 2>/dev/null
find chords/-somaplay-book -maxdepth 2 -type d
```
Expected: as pastas em minúsculas somem; as tasks seguintes recriam as corretas.

- [ ] **Step 5: Verify in the browser — the layer that counts**

1. `cd app && python3 -m http.server 8137` e abra `http://localhost:8137`
2. Anote antes: quantas favoritas você tem, e se "Oxum" (a música com áudio) ainda toca.
3. Importe `chords/-somaplay-book/sources/rn.somaplay` em modo **merge** (não substituir).
4. Confirme: 108 músicas da fonte RN presentes; **as favoritas continuam as mesmas**; o áudio continua tocando; as 10 listas continuam lá.

Expected: nada se perdeu. Se uma favorita sumiu, `pessoal` vazou para o `partes` — pare e revise `PARTES_DO_LIVRO`.

- [ ] **Step 6: Write the README**

Crie `scripts/somaplay_book/README.md`:

```markdown
# somaplay_book — o compilador do livro

Transforma um backup completo `.somaplay` na pasta `chords/-somaplay-book/`:
seções por fonte, artista, música, estilo, lista e livro.

```bash
node scripts/somaplay_book/compilar.mjs                      # o backup mais novo de bkp/, tudo menos livros
node scripts/somaplay_book/compilar.mjs --secao sources       # só uma seção
node scripts/somaplay_book/compilar.mjs --seco                # compila e confere sem escrever
node scripts/somaplay_book/compilar.mjs --limpar              # apaga as seções antes de reescrever
node --test scripts/somaplay_book/                            # os testes
```

## O que você precisa saber antes de mexer

**A pasta de saída é 100% derivada.** A biblioteca do app é a fonte de verdade.
Nada em `chords/-somaplay-book/` é editado à mão, e apagar a pasta inteira não
perde nada que um backup e um comando não devolvam.

**O compilador importa as funções do app** — `recorteParaExport`,
`podaPorPartes`, `songIdsDasFontes`, `blobIdsDasMusicas`, `blobIdsDosLivros`,
`lerManifest`. É de propósito: a regra de quais campos viajam mora em
`app/js/partes.js` (`CAMPOS`), e uma segunda cópia dela aqui é exatamente como o
livro passaria a perder, em silêncio, um campo novo da música. **Nunca
reimplemente uma dessas regras neste diretório.**

**`partes` é `['cifra', 'anotacoes']`, e não muda sem revisar a spec.** `audio`
levaria `stems: []` e apagaria áudio de quem importa; `pessoal` sobrescreveria
as favoritas de quem recebe.

Design: `docs/superpowers/specs/2026-09-04-somaplay-book-design.md`
```

- [ ] **Step 7: Commit**

```bash
git add scripts/somaplay_book/compilar.mjs scripts/somaplay_book/README.md
git commit -m "feat(book): compile the sources section end to end

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: `artists/` e `style/`

Etapa 2 da spec. 406 arquivos de artista, 46 de estilo.

**Files:**
- Modify: `scripts/somaplay_book/secoes.mjs` (acrescenta duas funções)
- Modify: `scripts/somaplay_book/secoes.test.mjs`
- Modify: `scripts/somaplay_book/compilar.mjs` (duas linhas no mapa `SECOES` e no `PADRAO`)

**Interfaces:**
- Consumes: `bundleDeMusicas`, `PARTES_DO_LIVRO` (Task 3); `pastaSegura` (Task 2).
- Produces:
  - `bundlesDeArtistas(estado) => Bundle[]`
  - `bundlesDeEstilos(estado) => Bundle[]`

- [ ] **Step 1: Write the failing tests**

Acrescente ao fim de `scripts/somaplay_book/secoes.test.mjs` (a função `biblioteca()` já está lá):

```javascript
import { bundlesDeArtistas, bundlesDeEstilos } from './secoes.mjs';

test('o artista sai uma vez por fonte em que ele tem música', () => {
  // Cartola tem música em VJ e em CifraClub: dois arquivos, um por fonte. É o
  // corte que impede artists/cartola.somaplay de misturar procedências.
  const caminhos = bundlesDeArtistas(biblioteca()).map((b) => b.caminho).sort();
  assert.deepEqual(caminhos, [
    'artists/CifraClub/belchior.somaplay',
    'artists/CifraClub/cartola.somaplay',
    'artists/VJ/cartola.somaplay',
    'artists/_sem-fonte/belchior.somaplay',
  ]);
});

test('o arquivo do artista leva só as músicas dele naquela fonte', () => {
  const bs = bundlesDeArtistas(biblioteca());
  const vj = bs.find((b) => b.caminho === 'artists/VJ/cartola.somaplay');
  assert.deepEqual(vj.manifest.songs.map((s) => s.id), ['s1']);
  assert.deepEqual(vj.manifest.artists.map((a) => a.id), ['a1']);
});

test('artista e estilo não levam lista nenhuma', () => {
  // Importar "Construção" não pode criar dez listas na biblioteca de quem recebe.
  for (const b of [...bundlesDeArtistas(biblioteca()), ...bundlesDeEstilos(biblioteca())]) {
    assert.deepEqual(b.manifest.lists, []);
    assert.equal('chordbook' in b.manifest, false);
  }
});

test('o estilo sai por fonte, e o vazio vira _sem-estilo', () => {
  const caminhos = bundlesDeEstilos(biblioteca()).map((b) => b.caminho).sort();
  assert.deepEqual(caminhos, [
    'style/CifraClub/mpb.somaplay',
    'style/CifraClub/samba.somaplay',
    'style/VJ/samba.somaplay',
    'style/_sem-fonte/_sem-estilo.somaplay',
  ]);
});

test('o arquivo de estilo leva todas as músicas daquele estilo naquela fonte', () => {
  const bs = bundlesDeEstilos(biblioteca());
  const cc = bs.find((b) => b.caminho === 'style/CifraClub/samba.somaplay');
  assert.deepEqual(cc.manifest.songs.map((s) => s.id), ['s2']);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/somaplay_book/secoes.test.mjs`
Expected: FAIL — `bundlesDeArtistas is not a function` (ou erro de import).

- [ ] **Step 3: Write the implementation**

Primeiro troque as duas linhas de import no topo de `scripts/somaplay_book/secoes.mjs`:

```javascript
import { songIdsDasFontes, blobIdsDasMusicas, fontesDaBiblioteca, fonteCasa, fonteOf } from '../../app/js/state.js';
import { slug, pastaDeFonte, arquivoDeFonte, pastaSegura } from './nomes.mjs';
```

Depois acrescente as funções ao fim do arquivo:

```javascript

// One pass over the library per source, grouping by a key. The two sections
// below differ only in the key and in the path, so the walk lives in one place.
function porFonteEChave(songs, chave) {
  const out = [];
  for (const { nome } of fontesDaBiblioteca(songs)) {
    const daFonte = songs.filter((s) => fonteCasa(fonteOf(s), nome));
    const grupos = new Map();
    for (const s of daFonte) {
      const k = chave(s);
      if (!grupos.has(k)) grupos.set(k, []);
      grupos.get(k).push(s);
    }
    out.push({ fonte: nome, grupos });
  }
  return out;
}

// One file per artist per source. 76 artists exist in more than one source, and
// merging them would produce a file that answers to no material anyone can check
// it against. Spec: "Por que a fonte é o primeiro eixo".
//
// The folder keeps the artist's real name, accents included — it is for the eye.
// The file name is a slug, because it ends up in a Downloads folder.
export function bundlesDeArtistas({ artists, songs }) {
  const nomeDoArtista = new Map(artists.map((a) => [a.id, a.name]));
  const out = [];
  for (const { fonte, grupos } of porFonteEChave(songs, (s) => s.artistId)) {
    for (const [artistId, suas] of grupos) {
      const songIds = new Set(suas.map((s) => s.id));
      const corte = recorteParaExport({ artists, songs, lists: [] }, { songIds, listIds: null });
      out.push(bundleDeMusicas({
        secao: 'artists',
        caminho: `artists/${pastaDeFonte(fonte)}/${slug(nomeDoArtista.get(artistId))}.somaplay`,
        id: `${fonte}/${artistId}`,
        artists: corte.artists,
        songs: corte.songs,
        lists: [],
      }));
    }
  }
  return out;
}

// One file per style per source. A song with no style lands in _sem-estilo,
// which sorts first and cannot collide with a real style name.
export function bundlesDeEstilos({ artists, songs }) {
  const out = [];
  for (const { fonte, grupos } of porFonteEChave(songs, (s) => (s.estilo || '').trim())) {
    for (const [estilo, suas] of grupos) {
      const songIds = new Set(suas.map((s) => s.id));
      const corte = recorteParaExport({ artists, songs, lists: [] }, { songIds, listIds: null });
      out.push(bundleDeMusicas({
        secao: 'style',
        caminho: `style/${pastaDeFonte(fonte)}/${estilo ? slug(estilo) : '_sem-estilo'}.somaplay`,
        id: `${fonte}/${estilo || '_sem-estilo'}`,
        artists: corte.artists,
        songs: corte.songs,
        lists: [],
      }));
    }
  }
  return out;
}
```

Em `scripts/somaplay_book/compilar.mjs`, troque o mapa e o padrão:

```javascript
import { bundlesDeFontes, bundlesDeArtistas, bundlesDeEstilos } from './secoes.mjs';

const SECOES = {
  sources: bundlesDeFontes,
  artists: bundlesDeArtistas,
  style: bundlesDeEstilos,
};
const PADRAO = ['sources', 'artists', 'style'];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/somaplay_book/`
Expected: PASS, todos os arquivos de teste.

- [ ] **Step 5: Compile and check the counts**

Run:
```bash
node scripts/somaplay_book/compilar.mjs --backup bkp/somaplay-backup-2026-09-04.somaplay --limpar
find chords/-somaplay-book/artists -name '*.somaplay' | wc -l
find chords/-somaplay-book/style   -name '*.somaplay' | wc -l
ls chords/-somaplay-book/artists/
```
Expected: **406** artistas, **46** estilos, e sete pastas de fonte (`VJ`, `Songbook`, `RV`, `CifraClub`, `RN`, `Vitale`, `_sem-fonte`).

- [ ] **Step 6: Verify in the browser**

Importe `chords/-somaplay-book/artists/RN/zeca-pagodinho.somaplay` em modo merge. Espere 12 músicas do Zeca sob a fonte RN, e nenhuma lista nova criada.

- [ ] **Step 7: Commit**

```bash
git add scripts/somaplay_book/secoes.mjs scripts/somaplay_book/secoes.test.mjs scripts/somaplay_book/compilar.mjs
git commit -m "feat(book): the artists and style sections, cut by source

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: `lists/`

Etapa 3 da spec. 10 arquivos.

**Files:**
- Modify: `scripts/somaplay_book/secoes.mjs`
- Modify: `scripts/somaplay_book/secoes.test.mjs`
- Modify: `scripts/somaplay_book/compilar.mjs`

**Interfaces:**
- Consumes: `bundleDeMusicas` (Task 3).
- Produces: `bundlesDeListas(estado) => Bundle[]`

- [ ] **Step 1: Write the failing test**

Acrescente a `scripts/somaplay_book/secoes.test.mjs`:

```javascript
import { bundlesDeListas } from './secoes.mjs';

test('sai um arquivo por lista, com a lista e as músicas dela', () => {
  const bs = bundlesDeListas(biblioteca());
  assert.deepEqual(bs.map((b) => b.caminho), ['lists/roda.somaplay']);
  const l = bs[0];
  assert.deepEqual(l.manifest.lists.map((x) => x.id), ['l1']);
  assert.deepEqual(l.manifest.songs.map((s) => s.id).sort(), ['s1', 's2']);
  // A lista atravessa fontes de propósito: s1 é VJ e s2 é CifraClub. Uma lista
  // é um repertório, não uma procedência.
  assert.deepEqual(l.manifest.artists.map((a) => a.id), ['a1']);
});

test('a lista guarda a ordem das músicas', () => {
  // A ordem de l.musicas é a ordem do show. Se ela se perder, a lista chega
  // embaralhada no aparelho de quem importa.
  const b = bundlesDeListas(biblioteca())[0];
  assert.deepEqual(b.manifest.lists[0].musicas, ['s1', 's2']);
});

test('uma lista com id órfão continua levando o id', () => {
  // O órfão se cura quando a outra fonte for importada (state.js:123). Podá-lo
  // perderia dado.
  const bib = biblioteca();
  bib.lists[0].musicas = ['s1', 'nao-existe', 's2'];
  const b = bundlesDeListas(bib)[0];
  assert.deepEqual(b.manifest.lists[0].musicas, ['s1', 'nao-existe', 's2']);
  assert.deepEqual(b.manifest.songs.map((s) => s.id).sort(), ['s1', 's2']);
});

test('uma lista vazia gera um arquivo com a lista e nenhuma música', () => {
  const bib = biblioteca();
  bib.lists = [{ id: 'l9', nome: 'learning', fixada: false, musicas: [] }];
  const b = bundlesDeListas(bib)[0];
  assert.equal(b.caminho, 'lists/learning.somaplay');
  assert.deepEqual(b.manifest.songs, []);
  assert.deepEqual(b.manifest.lists.map((x) => x.id), ['l9']);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/somaplay_book/secoes.test.mjs`
Expected: FAIL — `bundlesDeListas is not a function`.

- [ ] **Step 3: Write the implementation**

Acrescente a `scripts/somaplay_book/secoes.mjs`:

```javascript
// One file per list: the list itself and the songs it names.
//
// A list is a repertoire, not a provenance, so this is the one music section
// that does NOT cut by source — a set list crosses sources by definition.
//
// The orphan ids stay: pruning them would lose data, because the merge replaces
// the list by id and the missing songs heal when the other source arrives
// (state.js:123). recorteParaExport keeps the list whole for the same reason.
export function bundlesDeListas({ artists, songs, lists }) {
  return lists.map((l) => {
    const songIds = new Set(l.musicas || []);
    const corte = recorteParaExport({ artists, songs, lists }, { songIds, listIds: new Set([l.id]) });
    return bundleDeMusicas({
      secao: 'lists',
      caminho: `lists/${slug(l.nome)}.somaplay`,
      id: l.id,
      artists: corte.artists,
      songs: corte.songs,
      lists: corte.lists,
    });
  });
}
```

Em `compilar.mjs`, acrescente ao mapa e ao padrão:

```javascript
import { bundlesDeFontes, bundlesDeArtistas, bundlesDeEstilos, bundlesDeListas } from './secoes.mjs';

const SECOES = {
  sources: bundlesDeFontes,
  artists: bundlesDeArtistas,
  style: bundlesDeEstilos,
  lists: bundlesDeListas,
};
const PADRAO = ['sources', 'artists', 'style', 'lists'];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/somaplay_book/`
Expected: PASS.

- [ ] **Step 5: Compile and check**

Run:
```bash
node scripts/somaplay_book/compilar.mjs --backup bkp/somaplay-backup-2026-09-04.somaplay --secao lists --limpar
ls chords/-somaplay-book/lists/
cat chords/-somaplay-book/lists/INDICE.md
```
Expected: 10 arquivos — entre eles `carne-moida`, `acelera-brasil`, `slow-rock-jazz`, `friage-muderna`, `pernambuco`, `moda-veia`, `learning` (com 0 músicas), `roda-de-samba`, `friage-veia`, `infantil`.

- [ ] **Step 6: Verify in the browser**

Importe `chords/-somaplay-book/lists/pernambuco.somaplay` em modo merge e abra a lista no app. As 16 músicas têm que aparecer **na ordem em que estavam**.

- [ ] **Step 7: Commit**

```bash
git add scripts/somaplay_book/secoes.mjs scripts/somaplay_book/secoes.test.mjs scripts/somaplay_book/compilar.mjs
git commit -m "feat(book): the lists section, orphan ids and order intact

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: `songs/` — os 6.169 arquivos

Etapa 4 da spec.

**Files:**
- Modify: `scripts/somaplay_book/secoes.mjs`
- Modify: `scripts/somaplay_book/secoes.test.mjs`
- Modify: `scripts/somaplay_book/compilar.mjs`

**Interfaces:**
- Consumes: `porFonteEChave`, `bundleDeMusicas` (Tasks 3 e 6); `pastaSegura` (Task 2).
- Produces: `bundlesDeMusicas(estado) => Bundle[]`

- [ ] **Step 1: Write the failing test**

Acrescente a `scripts/somaplay_book/secoes.test.mjs`:

```javascript
import { bundlesDeMusicas } from './secoes.mjs';

test('sai um arquivo por música, aninhado em fonte/artista', () => {
  const caminhos = bundlesDeMusicas(biblioteca()).map((b) => b.caminho).sort();
  assert.deepEqual(caminhos, [
    'songs/CifraClub/Belchior/como-nossos-pais.somaplay',
    'songs/CifraClub/Cartola/alvorada.somaplay',
    'songs/VJ/Cartola/o-mundo-e-um-moinho.somaplay',
    'songs/_sem-fonte/Belchior/sem-procedencia.somaplay',
  ]);
});

test('cada arquivo leva uma música e o artista dela, e nada mais', () => {
  const b = bundlesDeMusicas(biblioteca())
    .find((x) => x.caminho === 'songs/VJ/Cartola/o-mundo-e-um-moinho.somaplay');
  assert.equal(b.manifest.songs.length, 1);
  assert.equal(b.manifest.songs[0].title, 'O mundo é um moinho');
  assert.deepEqual(b.manifest.artists.map((a) => a.name), ['Cartola']);
  assert.deepEqual(b.manifest.lists, []);
  assert.deepEqual(b.manifest.books, []);
  assert.equal('chordbook' in b.manifest, false);
});

test('a pasta do artista guarda o nome real, o arquivo guarda o slug', () => {
  const bib = biblioteca();
  bib.artists = [{ id: 'a1', name: 'Zé Ramalho' }];
  bib.songs = [{ id: 's1', artistId: 'a1', title: 'Avôhai', fonte: 'VJ',
                 cifra: { tipo: 'texto', texto: 'Am' }, stems: [], full: [] }];
  bib.lists = [];
  assert.equal(bundlesDeMusicas(bib)[0].caminho, 'songs/VJ/Zé Ramalho/avohai.somaplay');
});

test('o id do bundle é o id da música, para a colisão ser determinística', () => {
  // resolveColisoes ordena por caminho e desempata por id; sem um id estável, a
  // música que ganha o sufixo -2 mudaria a cada compilação.
  const b = bundlesDeMusicas(biblioteca())[0];
  assert.ok(['s1', 's2', 's3', 's4'].includes(b.id));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/somaplay_book/secoes.test.mjs`
Expected: FAIL — `bundlesDeMusicas is not a function`.

- [ ] **Step 3: Write the implementation**

Acrescente a `scripts/somaplay_book/secoes.mjs`:

```javascript
// One file per song, nested source/artist. The nesting is not decoration: VJ
// alone has 5.523 songs, and 5.523 files in one Drive folder is a folder nobody
// browses. Nested, it is 169 folders of about 33.
//
// It is also what kills the collisions: 537 titles repeat inside a single
// source, and putting the artist in the path takes that to one.
export function bundlesDeMusicas({ artists, songs }) {
  const nomeDoArtista = new Map(artists.map((a) => [a.id, a.name]));
  const out = [];
  for (const { fonte, grupos } of porFonteEChave(songs, (s) => s.artistId)) {
    for (const [artistId, suas] of grupos) {
      const pasta = `songs/${pastaDeFonte(fonte)}/${pastaSegura(nomeDoArtista.get(artistId))}`;
      for (const s of suas) {
        const corte = recorteParaExport({ artists, songs, lists: [] }, { songIds: new Set([s.id]), listIds: null });
        out.push(bundleDeMusicas({
          secao: 'songs',
          caminho: `${pasta}/${slug(s.title)}.somaplay`,
          id: s.id,
          artists: corte.artists,
          songs: corte.songs,
          lists: [],
        }));
      }
    }
  }
  return out;
}
```

Em `compilar.mjs`:

```javascript
import { bundlesDeFontes, bundlesDeArtistas, bundlesDeEstilos, bundlesDeListas, bundlesDeMusicas } from './secoes.mjs';

const SECOES = {
  sources: bundlesDeFontes,
  artists: bundlesDeArtistas,
  style: bundlesDeEstilos,
  lists: bundlesDeListas,
  songs: bundlesDeMusicas,
};
const PADRAO = ['sources', 'artists', 'style', 'lists', 'songs'];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/somaplay_book/`
Expected: PASS.

- [ ] **Step 5: Compile and check the counts and the collision**

Run:
```bash
time node scripts/somaplay_book/compilar.mjs --backup bkp/somaplay-backup-2026-09-04.somaplay --limpar
find chords/-somaplay-book/songs -name '*.somaplay' | wc -l
find chords/-somaplay-book -name '*.somaplay' | wc -l
sed -n '/A conferir/,$p' chords/-somaplay-book/CATALOGO.md
ls "chords/-somaplay-book/songs/Songbook/Tom Jobim/"
```
Expected: **6.169** em `songs/`, **6.638** ao todo (tudo menos os 35 livros). O `CATALOGO.md` traz a seção "A conferir" com **uma** linha, e a pasta do Tom Jobim tem `samba-de-uma-nota-so.somaplay` e `samba-de-uma-nota-so-2.somaplay`.

- [ ] **Step 6: Verify determinism**

Run:
```bash
find chords/-somaplay-book -name '*.somaplay' | sort | shasum -a 256 | tee /tmp/livro-1.txt
node scripts/somaplay_book/compilar.mjs --backup bkp/somaplay-backup-2026-09-04.somaplay --limpar >/dev/null
find chords/-somaplay-book -name '*.somaplay' | sort | shasum -a 256 | diff - /tmp/livro-1.txt && echo "determinístico"
```
Expected: `determinístico`. Se os nomes mudarem entre duas compilações, a resolução de colisão não está estável e o livro seria irreprodutível.

- [ ] **Step 7: Verify in the browser**

Importe `chords/-somaplay-book/songs/VJ/Cartola/o-mundo-e-um-moinho.somaplay` em modo merge, num app onde a música já existe. Ela não pode duplicar, e as favoritas e listas não podem mudar.

- [ ] **Step 8: Commit**

```bash
git add scripts/somaplay_book/secoes.mjs scripts/somaplay_book/secoes.test.mjs scripts/somaplay_book/compilar.mjs
git commit -m "feat(book): the songs section, one file per song under source/artist

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: `books/` — os 35 livros, 826 MB

Etapa 5 da spec. A única seção com bytes pesados e o único caminho que passa por `blobIdsDosLivros`.

**Files:**
- Modify: `scripts/somaplay_book/secoes.mjs`
- Modify: `scripts/somaplay_book/secoes.test.mjs`
- Modify: `scripts/somaplay_book/compilar.mjs`
- Modify: `scripts/somaplay_book/README.md`

**Interfaces:**
- Consumes: `blobIdsDosLivros` de `app/js/books.js`.
- Produces: `bundlesDeLivros(estado) => Bundle[]`

- [ ] **Step 1: Write the failing test**

Acrescente a `scripts/somaplay_book/secoes.test.mjs`:

```javascript
import { bundlesDeLivros } from './secoes.mjs';

const livros = () => ({
  artists: [], songs: [], lists: [],
  books: [
    { id: 'b1', blobId: 'pdf1', capaBlobId: 'capa1', titulo: 'Songbook Noel Rosa Vol 1',
      autor: '', fileName: 'x.pdf', paginas: 120, bytes: 5_000_000, ultimaPagina: 3 },
    { id: 'b2', blobId: 'pdf2', capaBlobId: null, titulo: 'A música de Guinga',
      autor: '', fileName: 'y.pdf', paginas: 80, bytes: 3_000_000, ultimaPagina: 1 },
  ],
});

test('sai um arquivo por livro, declarando só a parte livros', () => {
  const bs = bundlesDeLivros(livros());
  assert.deepEqual(bs.map((b) => b.caminho), [
    'books/songbook-noel-rosa-vol-1.somaplay',
    'books/a-musica-de-guinga.somaplay',
  ]);
  for (const b of bs) {
    assert.deepEqual(b.manifest.partes, ['livros']);
    assert.deepEqual(b.manifest.songs, []);
    assert.deepEqual(b.manifest.artists, []);
    assert.deepEqual(b.manifest.lists, []);
    assert.equal(b.manifest.books.length, 1);
  }
});

test('o livro leva o PDF e a capa; sem capa, leva só o PDF', () => {
  const bs = bundlesDeLivros(livros());
  assert.deepEqual(bs[0].blobIds, ['pdf1', 'capa1']);
  assert.deepEqual(bs[1].blobIds, ['pdf2']);
});

test('artists e songs vazios continuam sendo arrays, não ausência', () => {
  // lerManifest recusa o arquivo com `!manifest.songs || !manifest.artists`.
  // Um array vazio passa; undefined derrubaria a importação.
  const b = bundlesDeLivros(livros())[0];
  assert.ok(Array.isArray(b.manifest.songs));
  assert.ok(Array.isArray(b.manifest.artists));
});

test('dois livros com o mesmo título dão o mesmo caminho, e a colisão resolve depois', () => {
  // "O melhor de Gonzaguinha" e "O MELHOR DE Gonzaguinha" existem os dois na
  // biblioteca. Aqui eles colidem de propósito; resolveColisoes numera.
  const bib = livros();
  bib.books = [{ id: 'b1', blobId: 'p1', titulo: 'O melhor de Gonzaguinha' },
               { id: 'b2', blobId: 'p2', titulo: 'O MELHOR DE Gonzaguinha' }];
  const cs = bundlesDeLivros(bib).map((b) => b.caminho);
  assert.deepEqual(cs, ['books/o-melhor-de-gonzaguinha.somaplay', 'books/o-melhor-de-gonzaguinha.somaplay']);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test scripts/somaplay_book/secoes.test.mjs`
Expected: FAIL — `bundlesDeLivros is not a function`.

- [ ] **Step 3: Write the implementation**

Primeiro acrescente o import no topo de `scripts/somaplay_book/secoes.mjs`:

```javascript
import { blobIdsDosLivros } from '../../app/js/books.js';
```

Depois acrescente a função ao fim do arquivo:

```javascript

// One file per book. A book is not a song: it never enters S.songs, its fields
// are not in CAMPOS, and it declares the one part that is a top-level
// collection. So this section builds its manifest directly instead of going
// through bundleDeMusicas.
//
// artists and songs are empty ARRAYS, not absent: lerManifest rejects a file
// with `!manifest.songs || !manifest.artists`, and [] is truthy.
export function bundlesDeLivros({ books }) {
  return (books || []).map((b) => ({
    secao: 'books',
    caminho: `books/${slug(b.titulo || b.fileName || b.id)}.somaplay`,
    id: b.id,
    manifest: {
      version: 1,
      app: 'soma_play',
      partes: ['livros'],
      artists: [],
      songs: [],
      lists: [],
      books: [b],
      blobs: [],
    },
    blobIds: blobIdsDosLivros([b]),
  }));
}
```

Em `compilar.mjs`, acrescente `books` ao mapa — **e não ao `PADRAO`**:

```javascript
import {
  bundlesDeFontes, bundlesDeArtistas, bundlesDeEstilos,
  bundlesDeListas, bundlesDeMusicas, bundlesDeLivros,
} from './secoes.mjs';

const SECOES = {
  sources: bundlesDeFontes,
  artists: bundlesDeArtistas,
  style: bundlesDeEstilos,
  lists: bundlesDeListas,
  songs: bundlesDeMusicas,
  books: bundlesDeLivros,
};
// books/ fica fora do padrão: 826 MB de PDF é o único caminho lento, e é pedido
// pelo nome. Spec: "Regenerar é o caminho normal".
const PADRAO = ['sources', 'artists', 'style', 'lists', 'songs'];
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test scripts/somaplay_book/`
Expected: PASS.

- [ ] **Step 5: Compile the books and check the bytes**

Run:
```bash
time node scripts/somaplay_book/compilar.mjs --backup bkp/somaplay-backup-2026-09-04.somaplay --secao books --limpar
ls -la chords/-somaplay-book/books/ | head
du -sh chords/-somaplay-book/books/
find chords/-somaplay-book/books -name '*.somaplay' | wc -l
```
Expected: **35** arquivos somando aproximadamente **826 MB**; o maior perto de 300 MB. A memória do processo não pode explodir — a cópia é por pedaços de 1 MB.

- [ ] **Step 6: Verify in the browser — the PDF has to open**

Importe `chords/-somaplay-book/books/a-musica-de-guinga.somaplay` em modo merge, abra o livro na estante e vire algumas páginas. Se o PDF não renderiza, os bytes saíram deslocados e o problema é o índice de offsets de `container.mjs`.

- [ ] **Step 7: Update the README**

Em `scripts/somaplay_book/README.md`, acrescente depois do bloco de comandos:

```markdown
`books/` fica **fora do padrão** e se pede pelo nome:

```bash
node scripts/somaplay_book/compilar.mjs --secao books
```

São 35 arquivos somando 826 MB — o resto do livro inteiro cabe em 57 MB. É a
única seção lenta, e a única razão pela qual o "baixar sob demanda" existe.
```

- [ ] **Step 8: Full compile and final commit**

Run:
```bash
node scripts/somaplay_book/compilar.mjs --backup bkp/somaplay-backup-2026-09-04.somaplay \
  --secao sources --secao artists --secao style --secao lists --secao songs --secao books --limpar
cat chords/-somaplay-book/CATALOGO.md
find chords/-somaplay-book -name '*.somaplay' | wc -l
git status --short   # tem que estar limpo de .somaplay: a pasta é gitignored
```
Expected: **6.673** arquivos; `git status` não mostra nenhum `.somaplay`.

```bash
git add scripts/somaplay_book/secoes.mjs scripts/somaplay_book/secoes.test.mjs \
        scripts/somaplay_book/compilar.mjs scripts/somaplay_book/README.md
git commit -m "feat(book): the books section, 826 MB copied by offset

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```
