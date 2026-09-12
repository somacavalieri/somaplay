# A home de primeira visita — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o "Biblioteca vazia — Adicione músicas em Configurações" por uma tela que diz o que o app é, oferece as três ações principais e carrega uma demo de verdade com um toque.

**Architecture:** Duas funções puras em `state.js` decidem o que a Home mostra; um módulo novo (`render/welcome.js`) desenha a tela de boas-vindas e o cartão "Comece por aqui"; a demo é um arquivo `.somaplay` gerado por script e importado pelo mesmo caminho de qualquer arquivo compartilhado — o corpo de `wireBackupInput` vira uma função chamada de três portas.

**Tech Stack:** ES modules servidos como estão, sem build e sem dependências. Node >= 20 para `node --test` e para o gerador da demo.

**Spec:** `docs/superpowers/specs/2026-09-11-home-primeira-visita-design.md`

## Global Constraints

- **Sem dependências e sem build.** Nada de npm, nada de bundler.
- **Todo módulo novo em `app/js/**` entra no `SHELL` de `app/sw.js`**, no mesmo commit em que o arquivo nasce — `app/test/shell.test.js` fica vermelho até isso acontecer, e sem a entrada o app quebra offline.
- **Toda chave de texto nova entra nas DUAS tabelas** (`app/js/i18n/pt.js` e `app/js/i18n/en.js`) — `app/test/i18n.test.js` compara as duas. Texto traduzido é produzido em tempo de render: nenhuma constante de módulo guarda o resultado de `t()`.
- **Conteúdo de música nunca passa por `t()`**: título, cifra, letra, nome do artista e o nome da fonte são dados. O título da música entra nas frases como parâmetro (`t('home.guia.text', { title })`), nunca escrito dentro da tradução.
- **A fonte da demo é a string `'Demo'`**, igual nos dois idiomas, exportada como `FONTE_DEMO` por `state.js`.
- **O `partes` do arquivo da demo é exatamente `['cifra', 'audio']`.** Nunca `pessoal` — um arquivo com `pessoal` carrega `settings` e trocaria o tema e o idioma de quem só quis experimentar.
- **Comentários dos arquivos novos em `app/js/**` em inglês** (regra do CLAUDE.md, como `app/js/render/book.js`). **Os testes seguem a suíte, em português** (como `app/test/bookzoom.test.js`, o mais recente). Spec e plano em português.
- **Cor só por token** (`var(--accent)`, `var(--surface)`, …). Nenhum hexadecimal novo no CSS, ou o tema claro quebra.
- **Alvo de toque mínimo de 44 px** em tudo que se toca. O tablet é lido a um braço de distância.
- **O arquivo da demo NÃO entra no `SHELL`.** No precache, toda instalação baixaria ~1 MB que talvez nunca use. O `fetch` do Service Worker já guarda o que busca da mesma origem, então ele cruza a rede uma vez só.
- **Testes:** `cd app && node --test`. Sintaxe de um módulo: `cd app && node --check js/<arquivo>.js`.
- **A verificação que conta é no navegador.** Não existe harness de DOM, de propósito. `cd app && python3 -m http.server 8137`.
- **Commits em inglês**, um por task.
- **Nenhum `.somaplay` entra em commit além de `app/demo/soma_play-demo.somaplay`**, que ganha exceção explícita no `.gitignore`.

---

### Task 1: as duas regras puras

`primeiraVisita` decide se a Home mostra o guia; `mostraGuiaDemo` decide se o cartão aparece. As duas são puras e recebem tudo por parâmetro, para o teste não tocar em `S`.

**Files:**
- Modify: `app/js/state.js` (o bloco `settings` por volta da linha 108, e os helpers de fonte por volta da linha 178)
- Test: `app/test/welcome.test.js` (criar)

**Interfaces:**
- Produces:
  - `FONTE_DEMO: string` — `'Demo'`
  - `primeiraVisita(songs: array, books: array) => boolean`
  - `mostraGuiaDemo(songs: array, settings: object) => boolean`
  - `S.settings.guiaDemoFechado: boolean` — default `false`

- [ ] **Step 1: Escrever o teste que falha**

Criar `app/test/welcome.test.js`:

```js
// welcome.test.js — as duas regras que decidem o que a Home mostra antes de a
// biblioteca existir: a tela de boas-vindas e o cartão da demo.
//
// Puras de propósito: a tela em si não tem teste automatizado (não há harness de
// DOM no projeto), então o que dá para blindar é a decisão.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { primeiraVisita, mostraGuiaDemo, FONTE_DEMO } from '../js/state.js';

test('a fonte da demo é "Demo", e é dado — não texto de interface', () => {
  assert.equal(FONTE_DEMO, 'Demo');
});

test('sem música e sem livro é primeira visita', () => {
  assert.equal(primeiraVisita([], []), true);
});

test('um livro sozinho já tira a tela de boas-vindas', () => {
  // Um aparelho que só tem songbook em PDF é caso real. Sem esta regra ele
  // ficaria com as abas escondidas e sem caminho de volta para a estante.
  assert.equal(primeiraVisita([], [{ id: 'b1' }]), false);
});

test('uma música sozinha também tira', () => {
  assert.equal(primeiraVisita([{ id: 's1' }], []), false);
});

test('argumentos ausentes contam como vazio', () => {
  assert.equal(primeiraVisita(undefined, undefined), true);
});

test('o cartão aparece com música da fonte Demo e o ajuste desligado', () => {
  assert.equal(mostraGuiaDemo([{ id: 's1', fonte: FONTE_DEMO }], {}), true);
});

test('a grafia da fonte segue a regra da lente: " demo " é a mesma fonte', () => {
  assert.equal(mostraGuiaDemo([{ id: 's1', fonte: ' demo ' }], {}), true);
});

test('fechado uma vez, o cartão não volta', () => {
  assert.equal(mostraGuiaDemo([{ id: 's1', fonte: FONTE_DEMO }], { guiaDemoFechado: true }), false);
});

test('sem demo na biblioteca não há cartão', () => {
  assert.equal(mostraGuiaDemo([{ id: 's1', fonte: 'VJ' }], {}), false);
});

test('settings ausente não derruba a regra', () => {
  assert.equal(mostraGuiaDemo([{ id: 's1', fonte: FONTE_DEMO }], undefined), true);
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `cd app && node --test test/welcome.test.js`
Expected: FAIL — `primeiraVisita`, `mostraGuiaDemo` e `FONTE_DEMO` não existem em `state.js`.

- [ ] **Step 3: Implementar**

Em `app/js/state.js`, no bloco `settings` (por volta da linha 110, junto de `cifraMiniaturas`), acrescentar:

```js
    guiaDemoFechado: false,        // o × do cartão "Comece por aqui"
```

E, logo depois de `fonteCasaAlguma` (por volta da linha 222), acrescentar:

```js
// A fonte que a demo carrega. É DADO, gravado na música: fica "Demo" nos dois
// idiomas e nunca passa por t(). Sair da demo é a mesma porta de qualquer outra
// fonte — "Excluir as músicas da fonte", que já existe.
export const FONTE_DEMO = 'Demo';

// A biblioteca está vazia? Livro conta. Um aparelho que só tem songbook em PDF é
// um caso real — o import já trata dele — e, com a regra "sem música", ele veria
// a tela de boas-vindas com as abas escondidas e nenhum caminho de volta para a
// estante. Listas não entram: uma lista sem música não tem o que mostrar.
export function primeiraVisita(songs, books) {
  return !(songs || []).length && !(books || []).length;
}

// O cartão "Comece por aqui" vive enquanto a demo estiver na biblioteca e a
// pessoa não o tiver fechado. A comparação é fonteCasa, a mesma da lente: quem
// reimportar um arquivo com "demo" minúsculo continua com o mesmo cartão.
export function mostraGuiaDemo(songs, settings) {
  if ((settings || {}).guiaDemoFechado) return false;
  return (songs || []).some((s) => fonteCasa(fonteOf(s), FONTE_DEMO));
}
```

- [ ] **Step 4: Rodar o teste e ver passar**

Run: `cd app && node --test test/welcome.test.js`
Expected: PASS, 10 testes.

- [ ] **Step 5: Rodar a suíte inteira**

Run: `cd app && node --test`
Expected: tudo verde — o campo novo em `settings` não quebra `settings-export.test.js`.

- [ ] **Step 6: Commit**

```bash
git add app/js/state.js app/test/welcome.test.js
git commit -m "feat(home): the two rules that decide the welcome screen

primeiraVisita counts books, not only songs: a device that holds nothing but
PDF songbooks is a real case, and the songs-only rule would hide the tabs from
it with no way back to the shelf.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: o arquivo da demo e o gerador

A demo é um `.somaplay` de verdade, gerado de fontes versionadas. Os quatro stems sintéticos do MVP voltam do git: foram apagados em `622350b` junto com o conteúdo de terceiros, mas são do projeto (`d3ea232` — "groove sintético Am-F-C-G de ~19s em 4 canais").

**Files:**
- Create: `scripts/demo/stems/{baixo,violao,piano,bateria}.mp3` (recuperados do git)
- Create: `scripts/demo/musica.mjs`, `scripts/demo/gerar-demo.mjs`, `scripts/demo/README.md`
- Create: `app/demo/soma_play-demo.somaplay` (gerado)
- Create: `app/test/demo.test.js`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nada do app em runtime; o teste usa `lerManifest` de `app/js/backup.js`.
- Produces: o arquivo `app/demo/soma_play-demo.somaplay`, com `manifest.songs[0].id === 'demo-groove-de-teste'`, `fonte === 'Demo'`, quatro stems e `partes === ['cifra', 'audio']`.

- [ ] **Step 1: Recuperar os quatro stems do git**

```bash
mkdir -p scripts/demo/stems
for f in baixo violao piano bateria; do
  git show "d3ea232:app/samples/demo/$f.mp3" > "scripts/demo/stems/$f.mp3"
done
ls -l scripts/demo/stems
```
Expected: quatro arquivos de 231.071 bytes cada.

- [ ] **Step 2: Escrever a fonte da música**

Criar `scripts/demo/musica.mjs`:

```js
// musica.mjs — the demo song, in one place: the record the generator writes
// into the .somaplay, and nothing else reads.
//
// The ids are FIXED, not uid(): loading the demo twice has to land on the same
// song instead of a second copy. The fields follow CAMPOS (app/js/partes.js) for
// the parts this file declares — cifra and audio — so nothing belonging to
// `pessoal` (favorita, createdAt) travels: the import stamps those itself.
export const ARTISTA = { id: 'demo-artista', name: 'Demonstração', av: 'amber' };

// Written for this project. The app ships no chart, lyric or recording it does
// not own, and that rule covers the demo.
const CIFRA = `[Groove · 100 bpm]
Am              F
  Toca junto e ouve o mix
C               G
  Cada canal no seu lugar
Am              F
  Sobe o baixo, tira a voz
C               G
  A levada vai rolar

[Refrão]
Am        F
  Play, pause e seek
C         G
  Tudo em sincronia`;

const LETRA = `Toca junto e ouve o mix
Cada canal no seu lugar
Sobe o baixo, tira a voz
A levada vai rolar

Play, pause e seek
Tudo em sincronia`;

// `name` is what the mixer shows; `arquivo` is the source on disk.
export const STEMS = [
  { id: 'demo-baixo', name: 'Baixo', arquivo: 'baixo.mp3', vol: 80 },
  { id: 'demo-violao', name: 'Violão', arquivo: 'violao.mp3', vol: 80 },
  { id: 'demo-piano', name: 'Piano', arquivo: 'piano.mp3', vol: 80 },
  { id: 'demo-bateria', name: 'Bateria', arquivo: 'bateria.mp3', vol: 80 },
];

export const MUSICA = {
  id: 'demo-groove-de-teste',
  artistId: ARTISTA.id,
  title: 'Groove de teste',
  tom: 'Am',
  fonte: 'Demo',
  estilo: 'Groove',
  cifra: { tipo: 'texto', texto: CIFRA, digitacoes: null, acordes: ['Am', 'F', 'C', 'G'] },
  letra: LETRA,
  full: [],
};
```

- [ ] **Step 3: Escrever o gerador**

Criar `scripts/demo/gerar-demo.mjs`:

```js
// gerar-demo.mjs — writes app/demo/soma_play-demo.somaplay from the sources in
// this folder. Run it from the repo root:
//
//   node scripts/demo/gerar-demo.mjs
//
// The container is the one app/js/backup.js writes: MAGIC, the JSON length in
// ten digits, a newline, the JSON, then the blobs back to back in the order of
// manifest.blobs. app/test/demo.test.js reads the result with the app's own
// lerManifest, which is what keeps this writer honest.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARTISTA, MUSICA, STEMS } from './musica.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..', '..');
const SAIDA = join(RAIZ, 'app', 'demo', 'soma_play-demo.somaplay');
const MAGIC = 'SOMAPLAY1\n';

const bytesPorStem = [];
const stems = [];
for (const s of STEMS) {
  const bytes = await readFile(join(AQUI, 'stems', s.arquivo));
  const blobId = `demo-blob-${s.arquivo.replace('.mp3', '')}`;
  bytesPorStem.push({ bytes, meta: { id: blobId, size: bytes.length, type: 'audio/mpeg' } });
  stems.push({ id: s.id, name: s.name, blobId, fileName: s.arquivo, vol: s.vol, muted: false });
}

const manifest = {
  version: 1,
  app: 'soma_play',
  partes: ['cifra', 'audio'],
  artists: [ARTISTA],
  songs: [{ ...MUSICA, stems }],
  lists: [],
  books: [],
  blobs: bytesPorStem.map((b) => b.meta),
};

const json = JSON.stringify(manifest);
const cabecalho = MAGIC + String(Buffer.byteLength(json)).padStart(10, '0') + '\n' + json;
const arquivo = Buffer.concat([Buffer.from(cabecalho), ...bytesPorStem.map((b) => b.bytes)]);
await mkdir(dirname(SAIDA), { recursive: true });
await writeFile(SAIDA, arquivo);
console.log(`${SAIDA}\n${stems.length} canais · ${(arquivo.length / 1e6).toFixed(2)} MB`);
```

- [ ] **Step 4: Gerar o arquivo**

Run: `node scripts/demo/gerar-demo.mjs`
Expected: imprime o caminho, `4 canais` e algo perto de `0,93 MB`.

- [ ] **Step 5: Abrir a exceção no `.gitignore`**

`*.somaplay` está ignorado (linha 8). Acrescentar logo abaixo dela:

```gitignore
# O arquivo da demo é a única exceção: ele é servido pelo app, e o link de
# download da home aponta para ele. Gerado por scripts/demo/gerar-demo.mjs.
!app/demo/soma_play-demo.somaplay
```

Conferir: `git check-ignore -v app/demo/soma_play-demo.somaplay` não deve mais listar o arquivo.

- [ ] **Step 6: Escrever o teste do arquivo**

Criar `app/test/demo.test.js`:

```js
// demo.test.js — o arquivo da demo, lido pelo MESMO leitor que o app usa.
//
// O gerador (scripts/demo/gerar-demo.mjs) escreve o contêiner por conta própria.
// É este teste que impede o formato de divergir: se o cabeçalho, a ordem dos
// blobs ou os campos da música saírem do lugar, lerManifest reclama aqui, e não
// no tablet de alguém.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { lerManifest } from '../js/backup.js';

const CAMINHO = fileURLToPath(new URL('../demo/soma_play-demo.somaplay', import.meta.url));
const bytes = await readFile(CAMINHO);
const arquivo = new File([bytes], 'soma_play-demo.somaplay');
const { manifest, blobsStart } = await lerManifest(arquivo);

test('o arquivo declara cifra e áudio, e nada além disso', () => {
  // 'pessoal' traria settings e trocaria o tema de quem só quis experimentar.
  assert.deepEqual(manifest.partes, ['cifra', 'audio']);
  assert.equal(manifest.settings, undefined);
  assert.equal(manifest.chordbook, undefined);
});

test('uma música, com id fixo e fonte Demo', () => {
  assert.equal(manifest.songs.length, 1);
  const s = manifest.songs[0];
  assert.equal(s.id, 'demo-groove-de-teste');
  assert.equal(s.fonte, 'Demo');
  assert.equal(s.title, 'Groove de teste');
  assert.equal(s.cifra.tipo, 'texto');
  assert.ok(s.letra.trim(), 'sem letra não há karaokê (T3)');
});

test('campos de "pessoal" não viajam', () => {
  const s = manifest.songs[0];
  assert.equal(s.favorita, undefined);
  assert.equal(s.createdAt, undefined);
});

test('os quatro canais apontam para blobs que existem no arquivo', () => {
  const s = manifest.songs[0];
  assert.equal(s.stems.length, 4);
  const ids = new Set(manifest.blobs.map((b) => b.id));
  for (const st of s.stems) assert.ok(ids.has(st.blobId), `stem sem blob: ${st.blobId}`);
});

test('os offsets fecham: cabeçalho + blobs é o arquivo inteiro', () => {
  const soma = manifest.blobs.reduce((n, b) => n + b.size, 0);
  assert.equal(blobsStart + soma, bytes.length);
});

test('o artista tem nome e avatar, como qualquer artista da biblioteca', () => {
  assert.equal(manifest.artists.length, 1);
  assert.equal(manifest.artists[0].name, 'Demonstração');
  assert.ok(manifest.artists[0].av, 'sem `av` o card do artista fica sem cor');
});
```

- [ ] **Step 7: Rodar o teste**

Run: `cd app && node --test test/demo.test.js`
Expected: PASS, 6 testes. Se `lerManifest` reclamar de `File`, confira a versão do Node: `node --version` precisa ser >= 20.

- [ ] **Step 8: Escrever o README do gerador**

Criar `scripts/demo/README.md`:

```markdown
# A demo do soma_play

`app/demo/soma_play-demo.somaplay` é o arquivo que a home carrega em
"Carregar demo" e oferece para download. Ele é **gerado**, não editado:

    node scripts/demo/gerar-demo.mjs

Fontes, todas versionadas:

- `musica.mjs` — o registro da música (cifra, letra, tom, estilo, fonte "Demo")
- `stems/*.mp3` — os quatro canais sintéticos escritos para o projeto, de volta
  do commit `d3ea232`

Depois de regerar, rode `cd app && node --test test/demo.test.js` — é ele que
confere o contêiner contra o leitor do app.

Conteúdo de terceiros não entra aqui. Cifra, letra e áudio da demo são do
projeto, pela mesma regra que vale para o repositório inteiro.
```

- [ ] **Step 9: Commit**

```bash
git add scripts/demo app/demo/soma_play-demo.somaplay app/test/demo.test.js .gitignore
git commit -m "feat(demo): the demo pack as a real .somaplay file

Groove de teste with the four synthetic stems the MVP shipped (d3ea232),
deleted in 622350b along with the third-party songs. They were written for the
project, so they come back — and with them one song covers T1, T2 and T3.

The file is generated from versioned sources; app/test/demo.test.js reads it
back with the app's own lerManifest so the container cannot drift.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---
### Task 3: um fluxo de importação, três portas

O corpo de `wireBackupInput` é o fluxo inteiro de importar e mora dentro do listener de um input que só existe em Configurações. Ele vira uma função; o carregador da demo passa a ser a terceira porta.

**Files:**
- Modify: `app/js/main.js` (`wireBackupInput`, por volta da linha 1255; o objeto `actions`, por volta da linha 1055)
- Modify: `app/js/samples.js` (substituir o conteúdo)
- Modify: `app/js/render/settings.js` (a linha "Importar exemplos", por volta da linha 89)
- Modify: `app/js/i18n/pt.js` e `app/js/i18n/en.js`

**Interfaces:**
- Consumes: `primeiraVisita` (Task 1), o arquivo de `app/demo/` (Task 2).
- Produces:
  - `importarArquivo(f: File, { merge?: boolean, confirmar?: boolean }) => Promise<void>` (módulo-local em `main.js`)
  - `DEMO_URL: string`, `buscaDemo() => Promise<File>` (em `samples.js`)
  - ação `carregarDemo`

- [ ] **Step 1: Trocar o conteúdo de `app/js/samples.js`**

O módulo deixa de montar a música em código. Ele já está no `SHELL`, e continua — só muda por dentro.

```js
// samples.js — the demo pack: one URL, fetched and handed to the importer.
//
// The demo is a real .somaplay file, generated by scripts/demo/gerar-demo.mjs
// from versioned sources. Loading it walks exactly the path a file shared by a
// friend walks, which is why this module builds no song of its own: a second way
// to create the demo would be a second thing to keep in sync.
//
// Deliberately NOT precached. The file is about 1 MB and every install would pay
// for it; the Service Worker caches it on the first fetch instead, so it crosses
// the network once. Offline and never fetched, this throws and the caller says so.
export const DEMO_URL = 'demo/soma_play-demo.somaplay';
const DEMO_FILE_NAME = 'soma_play-demo.somaplay';

export async function buscaDemo() {
  const res = await fetch(DEMO_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return new File([await res.blob()], DEMO_FILE_NAME, { type: 'application/octet-stream' });
}
```

- [ ] **Step 2: Extrair o fluxo de importação em `main.js`**

Trocar a função `wireBackupInput` inteira (hoje em `app/js/main.js:1255-1321`) por estas duas. O corpo é o mesmo de hoje: só sai de dentro do listener e ganha os dois parâmetros.

```js
// O fluxo de importar um arquivo, sem o input: ler o cabeçalho, confirmar,
// negociar as anotações, importar e reconciliar o que guardava grafia de fonte.
// Três portas chamam isto — Configurações, "Abrir .somaplay" da home e "Carregar
// demo" — e é por isso que a função não conhece nenhuma delas.
//
// `confirmar` é falso quando não há o que perder (biblioteca vazia) e quando a
// pessoa já disse o que queria ao tocar em "Carregar demo": perguntar ali seria
// pedir confirmação de um toque que acabou de acontecer.
async function importarArquivo(f, { merge = false, confirmar = true } = {}) {
  const total = S.songs.length;

  // Só o cabeçalho — alguns KB, não o arquivo. Lido uma vez para os dois modos.
  let manifest = null;
  try { manifest = (await lerManifest(f)).manifest; }
  catch (e) { toast(t('msg.backup.importFailed', { error: e.message })); return; }

  // Um aparelho pode ser só uma estante de songbooks e não ter música nenhuma.
  const temAlgoAPerder = total > 0 || S.books.length > 0;
  if (merge) {
    if (confirmar && !confirm(t('msg.backup.confirmMerge', { name: f.name }))) return;
  } else if (temAlgoAPerder) {
    const avisos = avisosDeSubstituir(manifest, { temListas: S.lists.length > 0, temLivros: S.books.length > 0 })
      .map((k) => t(k)).join('\n');
    const pergunta = t('msg.backup.confirmReplace', { name: f.name, count: total, song: total === 1 ? t('common.song') : t('common.songs') });
    if (!confirm(avisos ? `${avisos}\n\n${pergunta}` : pergunta)) return;
  }

  // Só no merge há o que negociar (ver o comentário longo em importLibrary).
  const conflitos = merge ? conflitosDeNotas(S.songs, manifest.songs, manifest.partes) : [];
  const decisaoNotas = conflitos.length
    ? (confirm(t('msg.notas.confirmReplace', { n: conflitos.length })) ? 'substituir' : 'manter')
    : 'substituir';

  toast(merge ? t('msg.backup.merging') : t('msg.backup.importing'));
  try {
    const res = await importLibrary(f, { merge, decisaoNotas, conflitosNotas: conflitos });
    // A seleção de export guarda GRAFIAS de fonte, e a biblioteca acabou de
    // mudar por baixo dela — nos dois modos.
    S.exportFontes = null;
    podarFonteFilter();
    applyTheme();
    update();
    toast(merge
      ? t('msg.backup.mergedDone', {
          added: res.added,
          newWord: t(res.added === 1 ? 'msg.backup.mergedNew' : 'msg.backup.mergedNewPlural'),
          updated: res.updated,
          updatedWord: t(res.updated === 1 ? 'msg.backup.mergedUpdated' : 'msg.backup.mergedUpdatedPlural'),
        })
      : t('msg.backup.importedDone', { artists: res.artists, songs: res.songs }));
  } catch (e) { toast(t('msg.backup.importFailed', { error: e.message })); }
}

// O input existe em duas telas — Configurações e a tela de boas-vindas — e é
// religado a cada render, como o de livro.
function wireBackupInput() {
  const backup = document.getElementById('file-backup');
  if (!backup) return;
  backup.onchange = async () => {
    const f = backup.files[0];
    backup.value = '';
    if (!f) return;
    // Biblioteca vazia não tem o que perder: a pergunta do merge só existe para
    // quem já tem biblioteca.
    await importarArquivo(f, {
      merge: S.importMode === 'merge',
      confirmar: !primeiraVisita(S.songs, S.books),
    });
  };
}
```

No topo de `main.js`, acrescentar `primeiraVisita` à lista importada de `./state.js` e trocar o import de `samples.js`:

```js
import { buscaDemo } from './samples.js';
```

- [ ] **Step 3: Trocar a ação `importSamples` por `carregarDemo`**

Perto das outras declarações de módulo em `main.js` (junto de `apagandoFonte`):

```js
// Um toque só: sem a trava, dois toques seguidos baixam o arquivo duas vezes e
// disparam dois merges do mesmo id.
let carregandoDemo = false;
```

E, no objeto `actions`, substituir `importSamples()` por:

```js
  async carregarDemo() {
    if (carregandoDemo) return;
    carregandoDemo = true;
    try {
      toast(t('msg.demo.loading'));
      await importarArquivo(await buscaDemo(), { merge: true, confirmar: false });
    } catch (e) {
      // Offline e sem cache é o caso normal aqui, não um bug.
      toast(t('msg.demo.failed', { error: e.message }));
    } finally { carregandoDemo = false; }
  },
```

- [ ] **Step 4: Apontar a linha de Configurações para a ação nova**

Em `app/js/render/settings.js`, na linha do botão (por volta da linha 89):

```js
        <button class="setting-row link" data-a="carregarDemo">
          <div style="width:46px;height:46px;flex-shrink:0;border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--teal-tint2);color:var(--teal)">${I.music(20)}</div>
          <div class="info"><div class="t title">${t('settings.demo.title')}</div><div class="s">${t('settings.demo.sub')}</div></div>
          ${I.chevR()}
        </button>
```

- [ ] **Step 5: Mexer nas duas tabelas de i18n**

Em `app/js/i18n/pt.js`, trocar `settings.samples.*` por:

```js
  'settings.demo.title': 'Carregar a demo',
  'settings.demo.sub': 'Groove de teste — cifra, mixer com 4 canais e karaokê',
```

e trocar o bloco `msg.samples.*` por:

```js
  'msg.demo.loading': 'Carregando a demo…',
  'msg.demo.failed': 'Não deu para carregar a demo: {error}',
```

Em `app/js/i18n/en.js`, os mesmos pares:

```js
  'settings.demo.title': 'Load the demo',
  'settings.demo.sub': 'Groove de teste — chart, four-channel mixer and karaoke',
```
```js
  'msg.demo.loading': 'Loading the demo…',
  'msg.demo.failed': "Couldn't load the demo: {error}",
```

Apagar das duas tabelas as quatro chaves `msg.samples.*` e as duas `settings.samples.*`, que ficaram sem uso.

- [ ] **Step 6: Checar sintaxe e rodar a suíte**

Run: `cd app && node --check js/main.js && node --check js/samples.js && node --test`
Expected: PASS — `i18n.test.js` confirma que as duas tabelas continuam iguais.

- [ ] **Step 7: Verificar no navegador**

```bash
cd app && python3 -m http.server 8137
```
Numa aba anônima em `http://localhost:8137`:
1. Configurações → **Carregar a demo**. O toast diz "Carregando a demo…" e depois quantas músicas entraram.
2. Voltar: "Groove de teste" está na biblioteca, com a pílula **Demo** na faixa de fontes.
3. Abrir a música: a cifra aparece; o mixer (T2) mostra **quatro canais**; tocar mantém os canais em sincronia; o karaokê (T3) mostra a letra.
4. Configurações → **Carregar a demo** de novo: nada duplica (mesmo id), o toast fala em atualizadas.

- [ ] **Step 8: Commit**

```bash
git add app/js/main.js app/js/samples.js app/js/render/settings.js app/js/i18n/pt.js app/js/i18n/en.js
git commit -m "feat(demo): load the demo through the ordinary import path

The import flow lived inside the change listener of an input that only Settings
renders. It becomes a function with two parameters, and the demo becomes its
third caller — so loading the demo exercises the same path a file from a friend
takes, instead of a second way of creating songs.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: a tela de boas-vindas

**Files:**
- Create: `app/js/render/welcome.js`
- Modify: `app/js/render/home.js` (`renderHome`, no fim do arquivo)
- Modify: `app/js/state.js` (dois campos em `S`)
- Modify: `app/js/main.js` (duas ações e o `afterRender`)
- Modify: `app/css/app.css` (fim do arquivo)
- Modify: `app/js/i18n/pt.js`, `app/js/i18n/en.js`
- Modify: `app/sw.js` (`SHELL`)

**Interfaces:**
- Consumes: `primeiraVisita` (Task 1), `DEMO_URL` e a ação `carregarDemo` (Task 3).
- Produces:
  - `welcomeHTML() => string` (em `render/welcome.js`)
  - `S.online: boolean` (default `true`) e `S.podeInstalar: boolean` (default `false`) — a Task 6 é quem os mexe
  - ações `pickLivroHome`, `abrirSomaplayHome`

- [ ] **Step 1: Dois campos novos em `S`**

Em `app/js/state.js`, junto dos outros campos de sessão (perto de `importMode`):

```js
  // Sessão, não ajuste: os dois são condição do aparelho AGORA. main.js os
  // alimenta (Task 6); aqui eles nascem com o valor que não promete nada.
  online: true,            // navigator.onLine, lido no boot e nos eventos
  podeInstalar: false,     // o Chrome ofereceu instalar? (beforeinstallprompt)
```

- [ ] **Step 2: Criar `app/js/render/welcome.js`**

```js
// render/welcome.js — the first screen, while the library has nothing in it.
//
// The old empty state named a menu item inside Settings and stopped there. This
// one says what the app is, and every action it offers is one tap away. Spec:
// docs/superpowers/specs/2026-09-11-home-primeira-visita-design.md
//
// Every preview is drawn with the app's own parts, so that what the screen
// promises is what the person finds inside. The diagram in particular comes from
// chordSVG: the prototype drew an "Am" with four strings by hand, and a wrong
// chord on the first screen of a chord app costs more than the shortcut saves.
import { I, esc } from '../icons.js';
import { chordSVG } from '../chords.js';
import { S } from '../state.js';
import { t } from '../i18n.js';
import { DEMO_URL } from '../samples.js';

// The demo song's own words, title, key and channel names. Content, not
// interface: never translated, like any chart in the app.
const TRECHO = [
  ['Am              F', '  Toca junto e ouve o mix'],
  ['C               G', '  Cada canal no seu lugar'],
];
const DEMO_TITULO = 'Groove de teste';
const DEMO_TOM = 'Am';
const DEMO_CANAIS = [['Baixo', 80], ['Violão', 0], ['Bateria', 70]];

// A <pre> in the chart's monospace, and not a call into the chart layout: that
// layout measures the DOM and needs a saved song. Two lines is the same picture
// at a tenth of the cost.
function trechoHTML() {
  return `<pre class="wc-chart">${TRECHO.map(([ac, ly]) =>
    `<span class="wc-ch">${esc(ac)}</span>\n${esc(ly)}`).join('\n')}</pre>`;
}

function previaCifra() {
  return `<div class="wc-preview" aria-hidden="true">
    <div class="wc-preview-hd">
      <span class="wc-badge t1">T1</span>
      <span class="wc-preview-nm">${esc(DEMO_TITULO)}</span>
      <span class="wc-preview-tom">${t('home.welcome.previewKey', { tom: esc(DEMO_TOM) })}</span>
    </div>
    <div class="wc-preview-body">
      ${trechoHTML()}
      <div class="wc-preview-diag">
        <span class="wc-ch">${esc(DEMO_TOM)}</span>
        ${chordSVG(DEMO_TOM, false, null)}
        <span class="wc-preview-hint">${t('home.welcome.previewHint')}</span>
      </div>
    </div>
  </div>`;
}

function previaMixer() {
  return `<div class="wc-mixer" aria-hidden="true">${DEMO_CANAIS.map(([nome, pct]) => `
    <div class="wc-fader">
      <span class="wc-fader-nm">${esc(nome)}</span>
      <span class="wc-fader-track"><span class="wc-fader-fill" style="width:${pct}%"></span></span>
    </div>`).join('')}</div>`;
}

function previaKaraoke() {
  // The current line first, the next one under it — the order of the lyrics.
  return `<div class="wc-karaoke" aria-hidden="true">
    <div class="wc-kline on">${esc(TRECHO[0][1].trim())}</div>
    <div class="wc-kline">${esc(TRECHO[1][1].trim())}</div>
  </div>`;
}

function cartao(titulo, texto, extra = '') {
  return `<div class="wc-card">
    <div class="wc-card-t">${titulo}</div>
    <div class="wc-card-s">${texto}</div>
    ${extra}
  </div>`;
}

function modo(classe, badge, titulo, texto, previa) {
  return `<div class="wc-mode">
    <div class="wc-mode-txt">
      <div class="wc-mode-t"><span class="wc-badge ${classe}">${badge}</span>${titulo}</div>
      <div class="wc-mode-s">${texto}</div>
    </div>
    ${previa}
  </div>`;
}

export function welcomeHTML() {
  return `<div class="content-scroll wc">
    <div class="wc-hero">
      <div class="wc-hero-txt">
        <h1 class="wc-title">${t('home.welcome.title')}</h1>
        <p class="wc-sub">${t('home.welcome.sub')}</p>
        <div class="wc-actions">
          <button class="btn-primary" data-a="goAdd">${I.plus(20, 2.4)}${t('home.welcome.addSong')}</button>
          <button class="btn-ghost lg" data-a="pickLivroHome">${I.book(18)}${t('home.welcome.addBook')}</button>
          <button class="btn-ghost lg" data-a="abrirSomaplayHome">${I.upload(18)}${t('home.welcome.openFile')}</button>
        </div>
        <div class="wc-demo">
          <span class="wc-demo-lead">${t('home.welcome.demoLead')}</span>
          <button class="btn-ghost lg wc-demo-btn" data-a="carregarDemo">${I.play(16)}${t('home.welcome.demoBtn')}</button>
          <span class="wc-demo-sub">${t('home.welcome.demoSub')}</span>
          <a class="wc-demo-dl" href="${DEMO_URL}" download>${t('home.welcome.demoDownload')}</a>
        </div>
        ${S.online === false ? `<div class="wc-offline">${t('home.welcome.demoOffline')}</div>` : ''}
      </div>
      ${previaCifra()}
    </div>

    <div class="wc-cards">
      ${cartao(`${I.pencil(18)}${t('home.welcome.create.title')}`, t('home.welcome.create.text'))}
      ${cartao(`${I.book(18)}${t('home.welcome.bring.title')}`, t('home.welcome.bring.text'))}
      ${cartao(`${I.uploadSm(18)}${t('home.welcome.share.title')}`, t('home.welcome.share.text'),
        `<div class="wc-card-later">${t('home.welcome.share.later')}</div>`)}
    </div>

    <div class="wc-modes-t">${t('home.welcome.modes.title')}</div>
    <div class="wc-modes">
      ${modo('t1', 'T1', t('home.welcome.modes.t1'), t('home.welcome.modes.t1sub'), trechoHTML())}
      ${modo('t2', 'T2', t('home.welcome.modes.t2'), t('home.welcome.modes.t2sub'), previaMixer())}
      ${modo('t3', 'T3', t('home.welcome.modes.t3'), t('home.welcome.modes.t3sub'), previaKaraoke())}
    </div>

    <div class="wc-trust">
      <span class="wc-trust-txt">${I.check(16)}${t('home.welcome.trust')}</span>
      ${S.podeInstalar ? `<button class="btn-ghost lg" data-a="instalarApp">${I.download(18)}${t('home.welcome.install')}</button>` : ''}
    </div>

    <input type="file" id="file-backup" accept=".somaplay" hidden>
    <input type="file" id="file-livro" accept="application/pdf" multiple hidden>
  </div>`;
}
```

- [ ] **Step 3: Ramificar a Home**

Em `app/js/render/home.js`: acrescentar `primeiraVisita` à lista já importada de `../state.js`, importar `import { welcomeHTML } from './welcome.js';` e reescrever `renderHome` extraindo a barra do topo, que agora serve às duas telas:

```js
export function renderHome() {
  const topbar = `<div class="topbar home">
      <div class="logo">Soma<em>_play</em></div>
      ${offlineBadge}
      <div class="searchbox">${I.search()}<input type="text" id="search-input" placeholder="${t('home.search.placeholder')}" value="${esc(S.query)}"></div>
      <button class="btn-icon" data-a="goSettings" title="${t('settings.title')}">${I.gear()}</button>
    </div>`;

  // A tela de boas-vindas toma a Home inteira enquanto não houver música nem
  // livro — menos com um livro a caminho: o rascunho do PDF mora na aba Livros,
  // e sem a aba ele não teria onde aparecer.
  if (primeiraVisita(S.songs, S.books) && !S.livroDraft && !(S.livroFila || []).length) {
    return `<div class="screen">${topbar}${welcomeHTML()}</div>`;
  }

  const isL = S.tab === 'lists';
  // ... daqui para baixo, exatamente o que já existe ...
  return `<div class="screen">
    ${topbar}
    <div class="tabrow">
      ... igual ao de hoje ...
    </div>
    <div class="content-scroll" id="home-results">${homeResults()}</div>
  </div>`;
}
```

- [ ] **Step 4: As duas ações e o `afterRender`**

Em `app/js/main.js`, no objeto `actions`:

```js
  // A tela de boas-vindas não tem abas, então ela mesma emite o input de PDF. A
  // aba certa é marcada ANTES do seletor abrir: quando o rascunho do livro
  // chegar, o próximo render já cai na estante, que é onde o rascunho aparece.
  pickLivroHome() { S.tab = 'books'; document.getElementById('file-livro')?.click(); },
  abrirSomaplayHome() { S.importMode = 'merge'; document.getElementById('file-backup')?.click(); },
```

E, em `afterRender()`, junto da linha que cuida da aba Livros:

```js
  // A tela de boas-vindas emite os dois inputs escondidos que Configurações e a
  // estante emitem — é o preço de oferecer as mesmas portas sem as abas.
  if (S.screen === 'home' && primeiraVisita(S.songs, S.books)) { wireBackupInput(); wireBookFileInput(); }
```

- [ ] **Step 5: As chaves nas duas tabelas**

Em `app/js/i18n/pt.js`, junto do bloco `home.*`:

```js
  'home.welcome.title': 'A cifra que toca junto com você.',
  'home.welcome.sub': 'Leia a cifra, tire o violão do mix ou cante no karaokê: a mesma música, três jeitos.',
  'home.welcome.addSong': 'Adicionar música',
  'home.welcome.addBook': 'Adicionar livro',
  'home.welcome.openFile': 'Abrir .somaplay',
  'home.welcome.demoLead': 'Sem nada à mão agora?',
  'home.welcome.demoBtn': 'Carregar demo',
  'home.welcome.demoSub': 'Uma música de exemplo, com cifra, mixer e karaokê — sai com um toque.',
  'home.welcome.demoDownload': 'ou baixe o arquivo .somaplay',
  'home.welcome.demoOffline': 'Sem internet agora: a demo precisa de conexão na primeira vez.',
  'home.welcome.previewKey': 'tom {tom}',
  'home.welcome.previewHint': 'toque no acorde e veja o desenho',
  'home.welcome.create.title': 'Crie sua música',
  'home.welcome.create.text': 'Escreva ou cole a cifra, ou fotografe a do caderno. Junte a letra para o karaokê e o áudio de cada instrumento.',
  'home.welcome.bring.title': 'Traga o que você já tem',
  'home.welcome.bring.text': 'Songbook em PDF entra inteiro na estante. O .somaplay de um amigo entra num toque, sem apagar nada.',
  'home.welcome.share.title': 'Compartilhe com os amigos',
  'home.welcome.share.text': 'Um artista ou uma lista vira um arquivo que cabe no WhatsApp. Quem recebe abre aqui mesmo.',
  'home.welcome.share.later': 'Disponível assim que tiver músicas na estante.',
  'home.welcome.modes.title': 'Uma música, três jeitos.',
  'home.welcome.modes.t1': 'Cifra · para tocar',
  'home.welcome.modes.t1sub': 'A cifra rola no seu ritmo e as duas mãos ficam no instrumento.',
  'home.welcome.modes.t2': 'Acompanhamento · para ensaiar',
  'home.welcome.modes.t2sub': 'Tire o violão do mix e faça a sua parte.',
  'home.welcome.modes.t3': 'Karaokê · para cantar',
  'home.welcome.modes.t3sub': 'A base toca e a letra aparece.',
  'home.welcome.trust': 'Sem conta · Funciona sem internet · Nada sai do aparelho sem você mandar',
  'home.welcome.install': 'Instalar o app',
```

Em `app/js/i18n/en.js`, as mesmas chaves:

```js
  'home.welcome.title': 'The chord chart that plays along with you.',
  'home.welcome.sub': 'Read the chart, pull the guitar out of the mix or sing karaoke: one song, three ways.',
  'home.welcome.addSong': 'Add song',
  'home.welcome.addBook': 'Add book',
  'home.welcome.openFile': 'Open .somaplay',
  'home.welcome.demoLead': 'Nothing at hand right now?',
  'home.welcome.demoBtn': 'Load demo',
  'home.welcome.demoSub': 'One example song, with chart, mixer and karaoke — one tap removes it.',
  'home.welcome.demoDownload': 'or download the .somaplay file',
  'home.welcome.demoOffline': 'Offline right now: the demo needs a connection the first time.',
  'home.welcome.previewKey': 'key {tom}',
  'home.welcome.previewHint': 'tap a chord to see its shape',
  'home.welcome.create.title': 'Write your own',
  'home.welcome.create.text': 'Type or paste the chart, or photograph the one in your notebook. Add the lyrics for karaoke and one audio file per instrument.',
  'home.welcome.bring.title': 'Bring what you already have',
  'home.welcome.bring.text': 'A PDF songbook goes on the shelf whole. A friend\'s .somaplay comes in with one tap, erasing nothing.',
  'home.welcome.share.title': 'Share with your friends',
  'home.welcome.share.text': 'An artist or a list becomes a file that fits in WhatsApp. Whoever gets it opens it right here.',
  'home.welcome.share.later': 'Available as soon as you have songs on the shelf.',
  'home.welcome.modes.title': 'One song, three ways.',
  'home.welcome.modes.t1': 'Chart · to play',
  'home.welcome.modes.t1sub': 'The chart scrolls at your pace, and both hands stay on the instrument.',
  'home.welcome.modes.t2': 'Backing · to rehearse',
  'home.welcome.modes.t2sub': 'Pull the guitar out of the mix and play that part yourself.',
  'home.welcome.modes.t3': 'Karaoke · to sing',
  'home.welcome.modes.t3sub': 'The backing plays and the lyrics come up.',
  'home.welcome.trust': 'No account · Works offline · Nothing leaves the device unless you send it',
  'home.welcome.install': 'Install the app',
```

- [ ] **Step 6: O CSS**

No fim de `app/css/app.css`, um bloco só, e só com tokens:

```css
/* --- Tela de boas-vindas (primeira visita) --- */
.wc{padding:34px 40px 48px;display:flex;flex-direction:column;gap:30px}
.wc-hero{display:flex;gap:34px;align-items:flex-start}
.wc-hero-txt{flex:1;min-width:0}
.wc-title{font-family:var(--f-title);font-weight:700;font-size:44px;line-height:1.08;letter-spacing:-1px;margin-bottom:14px}
.wc-sub{color:var(--muted);font-size:17px;line-height:1.5;max-width:620px;margin-bottom:22px}
.wc-actions{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:16px}
.wc-demo{display:flex;flex-wrap:wrap;align-items:center;gap:12px}
.wc-demo-lead{color:var(--text);font-size:15px}
.wc-demo-btn{border-color:var(--accent-soft3);color:var(--accent)}
.wc-demo-sub,.wc-demo-dl{color:var(--muted);font-size:13px}
.wc-demo-dl{display:inline-flex;align-items:center;min-height:44px;color:var(--accent);text-decoration:underline}
.wc-offline{margin-top:12px;color:var(--muted);font-size:13px}

.wc-preview{width:390px;flex-shrink:0;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px}
.wc-preview-hd{display:flex;align-items:center;gap:9px;font-size:13px;color:var(--muted);margin-bottom:12px}
.wc-preview-nm{color:var(--text);font-weight:600}
.wc-preview-body{display:flex;gap:14px;align-items:flex-start}
.wc-preview-diag{display:flex;flex-direction:column;align-items:center;gap:4px;width:96px;flex-shrink:0}
.wc-preview-hint{color:var(--muted3);font-size:11px;text-align:center;line-height:1.35}
.wc-chart{font-family:var(--f-mono);font-size:13px;line-height:1.5;white-space:pre;overflow-x:auto;flex:1;min-width:0;font-variant-ligatures:none}
.wc-ch{color:var(--accent)}

.wc-badge{display:inline-flex;align-items:center;justify-content:center;min-width:30px;height:22px;padding:0 7px;border-radius:999px;font-size:11px;font-weight:700}
.wc-badge.t1{background:var(--accent-tint2);color:var(--accent)}
.wc-badge.t2{background:var(--teal-tint2);color:var(--teal)}
.wc-badge.t3{background:var(--gold-tint);color:var(--gold)}

.wc-cards,.wc-modes{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.wc-card{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:18px 20px}
.wc-card-t{display:flex;align-items:center;gap:9px;font-family:var(--f-title);font-weight:600;font-size:17px;color:var(--accent);margin-bottom:8px}
.wc-card-s{color:var(--muted);font-size:14px;line-height:1.55}
.wc-card-later{color:var(--muted3);font-size:13px;margin-top:12px}
.wc-modes-t{font-family:var(--f-title);font-weight:600;font-size:18px}
.wc-mode{background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:16px 18px;display:flex;gap:14px;align-items:flex-start}
.wc-mode-txt{flex:1;min-width:0}
.wc-mode-t{display:flex;align-items:center;gap:8px;font-family:var(--f-title);font-weight:600;font-size:15px;margin-bottom:6px}
.wc-mode-s{color:var(--muted);font-size:13px;line-height:1.5}
.wc-mixer{width:140px;flex-shrink:0;display:flex;flex-direction:column;gap:8px}
.wc-fader{display:flex;flex-direction:column;gap:3px}
.wc-fader-nm{color:var(--muted);font-size:11px}
.wc-fader-track{height:6px;border-radius:6px;background:var(--border);display:block}
.wc-fader-fill{display:block;height:100%;border-radius:6px;background:var(--teal)}
.wc-karaoke{width:170px;flex-shrink:0;font-size:13px;line-height:1.5}
.wc-kline{color:var(--muted3)}
.wc-kline.on{color:var(--gold);font-weight:600}

.wc-trust{display:flex;flex-wrap:wrap;align-items:center;gap:14px;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:14px 18px}
.wc-trust-txt{display:flex;align-items:center;gap:9px;color:var(--muted);font-size:14px;flex:1;min-width:240px}

/* Retrato e telas estreitas: tudo empilha, e a prévia vai para baixo do texto */
@media (max-width:1100px){
  .wc{padding:24px 20px 40px}
  .wc-title{font-size:34px}
  .wc-hero{flex-direction:column}
  .wc-preview{width:100%}
  .wc-cards,.wc-modes{grid-template-columns:1fr}
}
```

- [ ] **Step 7: Registrar o módulo no `SHELL`**

Em `app/sw.js`, na lista `SHELL`, junto das outras telas:

```js
  './js/render/welcome.js',
```

- [ ] **Step 8: Rodar a suíte**

Run: `cd app && node --check js/render/welcome.js && node --test`
Expected: PASS — `shell.test.js` confirma o módulo novo no `SHELL`, `i18n.test.js` a paridade das tabelas.

- [ ] **Step 9: Verificar no navegador**

Numa **aba anônima** (biblioteca vazia de verdade), em `http://localhost:8137`:
1. A tela de boas-vindas aparece **sem a faixa de abas** e sem a lente.
2. **Adicionar música** abre o cadastro; voltar traz a tela de novo.
3. **Adicionar livro** abre o seletor de PDF; escolher um leva ao rascunho na aba Livros, com as abas de volta.
4. **Abrir .somaplay** importa um arquivo sem perguntar nada.
5. **Carregar demo** funciona daqui igual a Configurações.
6. O diagrama do Am é um Am de verdade (comparar com o dicionário de acordes).
7. Estreitar a janela para menos de 1100 px: tudo empilha e nada vaza na horizontal.
8. Configurações → Tema claro: a tela continua legível.
9. Idioma English: o texto cabe nos botões.

- [ ] **Step 10: Commit**

```bash
git add app/js/render/welcome.js app/js/render/home.js app/js/state.js app/js/main.js app/css/app.css app/js/i18n/pt.js app/js/i18n/en.js app/sw.js
git commit -m "feat(home): a welcome screen while the library is empty

Says what the app is, offers the three actions one tap away, and explains the
three modes the lens chips never named. The previews are drawn with the app's
own parts — chordSVG for the diagram — so the screen cannot promise a chord the
app would draw differently.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---
### Task 5: o cartão "Comece por aqui"

Com a demo carregada a biblioteca deixa de estar vazia, e a tela de boas-vindas some. O cartão é o que sobra dela: por onde começar, e como tirar a demo quando ela já cumpriu o papel.

**Files:**
- Modify: `app/js/render/welcome.js` (uma função nova)
- Modify: `app/js/render/home.js` (`homeResults`)
- Modify: `app/js/main.js` (uma ação)
- Modify: `app/css/app.css`
- Modify: `app/js/i18n/pt.js`, `app/js/i18n/en.js`

**Interfaces:**
- Consumes: `mostraGuiaDemo`, `FONTE_DEMO` (Task 1); `deleteFonteAsk`, que já existe em `main.js`.
- Produces: `guiaDemoHTML(song: object|null) => string`; ação `fecharGuiaDemo`.

- [ ] **Step 1: A função em `welcome.js`**

No fim de `app/js/render/welcome.js` — e acrescentar `FONTE_DEMO` ao import de `../state.js` no topo do arquivo, que hoje traz só `S`:

```js
// What is left of the welcome screen once the demo is in: where to start, and
// the way out. "Tirar a demo" is deleteFonteAsk with the demo's source — the
// same door any other source leaves by, confirmation and toasts included.
//
// The song title is a parameter, never part of the translated string: it is
// content, and t() does not escape parameters, so it arrives escaped.
export function guiaDemoHTML(song) {
  const titulo = song ? esc(song.title) : '';
  return `<div class="wc-guia">
    <div class="wc-guia-txt">
      <div class="wc-guia-t">${t('home.guia.title')}</div>
      <div class="wc-guia-s">${t('home.guia.text', { title: titulo })}</div>
    </div>
    ${song ? `<button class="btn-primary small" data-a="openSong" data-id="${esc(song.id)}" data-from="home">${I.play(16)}${t('home.guia.open', { title: titulo })}</button>` : ''}
    <button class="btn-ghost" data-a="deleteFonteAsk" data-id="${FONTE_DEMO}">${I.trash(17)}${t('home.guia.remove')}</button>
    <button class="btn-icon xs" data-a="fecharGuiaDemo" title="${t('home.guia.close')}">${I.close(18)}</button>
  </div>`;
}
```

- [ ] **Step 2: Pendurar o cartão nas três abas de música**

Em `app/js/render/home.js`, acrescentar `mostraGuiaDemo`, `FONTE_DEMO` e `fonteCasa` aos imports de `../state.js`, importar `guiaDemoHTML` de `./welcome.js`, e reescrever `homeResults`:

```js
// O cartão mora acima do conteúdo das três abas de MÚSICA. Listas e Livros não
// falam de música solta, e o cartão ali seria um aviso fora de lugar.
function guiaHTML() {
  if (!mostraGuiaDemo(S.songs, S.settings)) return '';
  if (!['artists', 'songs', 'estilos'].includes(S.tab)) return '';
  return guiaDemoHTML(S.songs.find((s) => fonteCasa(fonteOf(s), FONTE_DEMO)) || null);
}

export function homeResults() {
  const guia = guiaHTML();
  if (S.tab === 'artists') return guia + artistCards();
  if (S.tab === 'songs') return guia + songsTab();
  if (S.tab === 'estilos') return guia + estiloCards();
  if (S.tab === 'books') return renderBooksTab();
  return listsTab();
}
```

- [ ] **Step 3: A ação de fechar**

Em `app/js/main.js`, no objeto `actions`:

```js
  // O × é para sempre: quem fechou já sabe por onde começar. O ajuste viaja na
  // parte `pessoal` de um backup, o que é inofensivo.
  fecharGuiaDemo() { S.settings.guiaDemoFechado = true; saveSettings(); update(); },
```

- [ ] **Step 4: As chaves**

`app/js/i18n/pt.js`:

```js
  'home.guia.title': 'Comece por aqui',
  'home.guia.text': 'Abra {title}: a cifra rola sozinha, cada acorde mostra o desenho, e no mixer você tira o violão.',
  'home.guia.open': 'Abrir {title}',
  'home.guia.remove': 'Tirar a demo',
  'home.guia.close': 'Fechar',
```

`app/js/i18n/en.js`:

```js
  'home.guia.title': 'Start here',
  'home.guia.text': 'Open {title}: the chart scrolls on its own, every chord shows its shape, and in the mixer you pull the guitar out.',
  'home.guia.open': 'Open {title}',
  'home.guia.remove': 'Remove the demo',
  'home.guia.close': 'Close',
```

- [ ] **Step 5: O CSS**

No bloco da tela de boas-vindas, em `app/css/app.css`:

```css
.wc-guia{display:flex;flex-wrap:wrap;align-items:center;gap:12px;background:var(--surface);border:1px solid var(--accent-soft3);border-radius:14px;padding:14px 16px;margin-bottom:16px}
.wc-guia-txt{flex:1;min-width:240px}
.wc-guia-t{font-family:var(--f-title);font-weight:600;font-size:16px;margin-bottom:3px}
.wc-guia-s{color:var(--muted);font-size:13px;line-height:1.5}
```

- [ ] **Step 6: Rodar a suíte**

Run: `cd app && node --check js/render/welcome.js && node --check js/render/home.js && node --test`
Expected: PASS.

- [ ] **Step 7: Verificar no navegador**

1. Aba anônima → **Carregar demo**. As abas voltam, a pílula **Demo 1** aparece na faixa de fontes e o cartão fica acima dos cards de artista.
2. Trocar para Músicas e Estilos: o cartão continua. Listas e Livros: não aparece.
3. **Abrir Groove de teste** pelo cartão abre a música.
4. **×** fecha o cartão; recarregar a página (F5) e ele continua fechado.
5. Em Configurações, **Carregar a demo** de novo: o cartão continua fechado — o ajuste é mais forte que a presença da demo, e está certo assim.
6. Numa aba anônima nova (ajuste zerado), carregar a demo e usar **Tirar a demo** no próprio cartão: pede confirmação, apaga a música e devolve a tela de boas-vindas.
7. Com o cartão fechado, a saída continua sendo Configurações → "Excluir as músicas da fonte Demo", que faz exatamente a mesma coisa.

- [ ] **Step 8: Commit**

```bash
git add app/js/render/welcome.js app/js/render/home.js app/js/main.js app/css/app.css app/js/i18n/pt.js app/js/i18n/en.js
git commit -m "feat(home): a Start here card while the demo is in the library

The welcome screen disappears the moment the demo lands, which is exactly when
the person still needs to be told where to start. The card says it, and carries
the way out: Remove the demo is deleteFonteAsk with the demo's source, so the
one-tap promise in the copy is a promise the app keeps.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: instalar o app, e o aviso de offline

**Files:**
- Modify: `app/js/main.js` (listeners de módulo, uma ação, o `boot`)

**Interfaces:**
- Consumes: `S.online` e `S.podeInstalar` (Task 4).
- Produces: ação `instalarApp`.

- [ ] **Step 1: Segurar o convite do navegador**

Em `app/js/main.js`, a variável fica junto das outras flags de módulo (perto de `carregandoDemo`, da Task 3), e não no fim do arquivo — é lá que se procura por ela, e a ação `instalarApp` a lê:

```js
// O convite de instalação do Chrome. Não existe no iOS nem no Firefox, e não
// chega com o app já instalado: nesses casos S.podeInstalar fica falso e o
// botão simplesmente não aparece.
let convite = null;
```

Os listeners ficam junto dos outros listeners de módulo (perto do `visibilitychange`, no fim do arquivo). O evento chega uma vez, logo depois do load, e some se ninguém o segurar — por isso ele é capturado aqui, e não dentro de um render:

```js
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  convite = e;
  S.podeInstalar = true;
  if (S.screen === 'home') update();
});
window.addEventListener('appinstalled', () => {
  convite = null;
  S.podeInstalar = false;
  if (S.screen === 'home') update();
});

// A demo é a única coisa nesta tela que precisa de rede. O resto do app não.
const marcaRede = () => {
  const antes = S.online;
  S.online = navigator.onLine;
  if (antes !== S.online && S.screen === 'home') update();
};
window.addEventListener('online', marcaRede);
window.addEventListener('offline', marcaRede);
```

E, dentro de `boot()`, antes do primeiro `update()`:

```js
  S.online = navigator.onLine;
```

- [ ] **Step 2: A ação**

No objeto `actions`:

```js
  async instalarApp() {
    if (!convite) return;
    const e = convite;
    // O evento é de uso único: descartar ANTES de esperar a escolha evita dois
    // prompts se o botão for tocado duas vezes.
    convite = null;
    S.podeInstalar = false;
    update();
    try { await e.prompt(); } catch { /* o navegador já explicou na tela */ }
  },
```

- [ ] **Step 3: Checar sintaxe e rodar a suíte**

Run: `cd app && node --check js/main.js && node --test`
Expected: PASS.

- [ ] **Step 4: Verificar no navegador**

1. Chrome, aba anônima: o botão **Instalar o app** aparece na faixa de garantias (pode levar um instante — o evento chega depois do load).
2. Tocar nele abre o diálogo do Chrome; cancelar faz o botão sumir (o convite é de uso único) — recarregar a página o traz de volta.
3. Firefox: o botão não aparece, e nada quebra.
4. DevTools → Network → **Offline**: a linha "Sem internet agora…" aparece; voltar para Online a faz sumir sem recarregar.
5. Offline e sem a demo em cache: tocar em **Carregar demo** mostra o aviso de falha, e o resto do app continua funcionando.
6. Online, carregar a demo uma vez; voltar para Offline, **Tirar a demo** e **Carregar demo** de novo: funciona, agora pelo cache do Service Worker.

- [ ] **Step 5: Commit**

```bash
git add app/js/main.js
git commit -m "feat(home): offer to install the app, and say when the demo needs the network

beforeinstallprompt is held at module level because it fires once, right after
load, and evaporates if nobody keeps it. The button shows only where the browser
actually offers to install — never on iOS, Firefox, or an installed app.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: a release 0.20.0

Recurso novo, e o `SHELL` mudou: MINOR, pela régua de `docs/superpowers/specs/2026-08-14-versionamento-design.md`. `app/test/changelog-precache.test.js` exige uma entrada no CHANGELOG para a versão atual — sem ela, a suíte fica vermelha.

**Files:**
- Modify: `app/js/version.js`, `app/sw.js` (a linha 2), `CHANGELOG.md`, `README.md`, `README.pt-BR.md`

- [ ] **Step 1: Subir a versão nos dois lugares**

`app/js/version.js`:
```js
export const VERSION = '0.20.0';
```

`app/sw.js`, linha 2:
```js
const VERSION = 'somaplay-0.20.0';
```

- [ ] **Step 2: A entrada do CHANGELOG**

No topo de `CHANGELOG.md`, abaixo de `## [Unreleased]`:

```markdown
## [0.20.0] - 2026-09-12

### Added

- **A first screen for someone who has never opened the app.** While the library
  holds no song and no book, the home says what the app is and offers the three
  actions one tap away: add a song, add a PDF book, open a `.somaplay` a friend
  sent. The old empty state named a menu item inside Settings and stopped there.
- **A demo that loads with one tap.** "Carregar demo" fetches a real `.somaplay`
  file — Groove de teste with four channels and lyrics, so it covers chart,
  mixer and karaoke — and imports it through the ordinary merge path. It comes
  in under the source "Demo" and leaves the way any source leaves.
- **A "Comece por aqui" card** while the demo is in the library, with a way out.
- **An install button**, where the browser offers to install.

### Changed

- The import flow is one function now, called by Settings, by the home and by
  the demo loader, instead of living inside the change listener of an input that
  only Settings renders.
- Settings: "Importar exemplos" is now "Carregar a demo", and loads the same file
  the home does. The example song is no longer built in code.
```

- [ ] **Step 3: Os dois READMEs**

`README.pt-BR.md`, na seção "Como rodar" (por volta da linha 118), trocar o parágrafo "Para ver funcionando" por:

```markdown
Na primeira abertura, com a biblioteca vazia, a própria tela inicial explica o
app e oferece **Carregar demo** — uma música de exemplo com cifra, mixer e
karaokê, que sai com um toque. **Adicionar música** é onde entram as suas —
imagens de cifra ou texto colado, letra para karaokê e um arquivo de áudio por
canal.
```

`README.md` (linha 117), o equivalente em inglês:

```markdown
On the first visit, with an empty library, the home screen itself explains the
app and offers **Load demo** — one example song with chart, mixer and karaoke,
which one tap removes. **Add song** is where yours go in: chart images or pasted
text, lyrics for karaoke, and one audio file per channel.
```

- [ ] **Step 4: Rodar a suíte inteira**

Run: `cd app && node --test`
Expected: PASS — em especial `version.test.js` (os dois literais), `shell.test.js` e `changelog-precache.test.js` (a entrada da versão existe e não cita "~1 MB").

- [ ] **Step 5: Commit**

```bash
git add app/js/version.js app/sw.js CHANGELOG.md README.md README.pt-BR.md
git commit -m "chore(release): 0.20.0 — a first screen, and a demo that loads

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## A conferir antes de abrir o PR

No tablet, ou pelo menos numa janela de 1280×800 e numa de 800×1280, sempre em **aba anônima** (biblioteca vazia de verdade):

- [ ] A tela de boas-vindas aparece sem a faixa de abas, e some assim que existir uma música ou um livro.
- [ ] Um aparelho **só com livro** (adicionar um PDF e nada mais) não vê a tela de boas-vindas e cai na estante.
- [ ] **Carregar demo** deixa a pessoa dentro da música em menos de 30 segundos, contando do toque.
- [ ] No Groove de teste: a cifra rola, o acorde abre o desenho, o mixer tem quatro canais em sincronia, o karaokê mostra a letra.
- [ ] **Tirar a demo** devolve a tela de boas-vindas.
- [ ] O × do cartão sobrevive a um F5.
- [ ] O link "ou baixe o arquivo .somaplay" baixa um arquivo que o próprio app reimporta.
- [ ] Offline (DevTools): o aviso aparece; com a demo já carregada uma vez, ela carrega de novo sem rede.
- [ ] Tema claro e idioma English: nada estoura, nada fica ilegível.
- [ ] Depois do deploy, **Cmd+Shift+R** antes de concluir qualquer coisa: o Service Worker serve o shell antigo na primeira abertura.

## O que você precisa saber antes de mexer

- **O Service Worker engana.** Depois de qualquer mudança, a primeira abertura serve o shell antigo. Recarregue com Cmd+Shift+R (ou abra duas vezes) antes de dizer que algo não subiu.
- **Existem duas bibliotecas.** `localhost:8137` e `somacavalieri.github.io` são origens diferentes, logo IndexedDB diferentes. Teste aqui; a biblioteca de verdade do usuário é a do github.io, e ela tem mais de 6 mil músicas — nada neste plano pode encostar nela.
- **`DB_NAME` em `app/js/db.js` não se toca.** Trocar o nome faz o app abrir um banco vazio.
- **Um campo novo na música precisaria entrar em `CAMPOS`** (`app/js/partes.js`). Este plano não cria nenhum: a música da demo só usa campos que já existem.
- **`app/js/chords-catalog.js` é append-only** — o índice da forma no array vira id persistido. Nada aqui mexe nele: Am, F, C e G já estão lá.
- **Nada de conteúdo musical de terceiros.** Cifra, letra e áudio da demo são do projeto. Se em algum momento parecer mais fácil usar uma música conhecida, pare e pergunte.
