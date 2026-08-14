# Versionamento visível — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar a versão do app em Ajustes, num esquema `X.Y.Z`, onde o número é a própria chave do cache do Service Worker — de modo que ler o número na tela prove qual versão está cacheada.

**Architecture:** A versão vive em dois literais (`app/js/version.js` para a UI, `app/sw.js` para a chave do cache) mantidos em sincronia por um teste de paridade, no mesmo padrão que `app/test/i18n.test.js` usa para as tabelas de tradução. Não há build step: o projeto serve ES modules como estão, então não existe etapa onde injetar a versão. Um `CHANGELOG.md` na raiz registra cada versão, e o teste cobra que exista entrada para a versão corrente.

**Tech Stack:** JavaScript ES modules puro, sem dependências. Testes com `node --test` (Node >= 20). Service Worker clássico.

**Spec:** `docs/superpowers/specs/2026-08-14-versionamento-design.md`

## Global Constraints

- **Versão inicial: `0.9.0`.** Formato `X.Y.Z`, só dígitos, sem prefixo `v`.
- **A chave de cache do `sw.js` é `somaplay-<versão>`** — em `0.9.0`, exatamente `somaplay-0.9.0`.
- **Todo módulo novo em `app/js/` precisa entrar no array `SHELL` de `app/sw.js`.** Sem isso o app quebra offline. `app/test/shell.test.js` já cobra isso e vai falhar se esquecer.
- **Toda chave de i18n entra nas DUAS tabelas** — `app/js/i18n/pt.js` e `app/js/i18n/en.js`. `app/test/i18n.test.js` tem teste de paridade nos dois sentidos.
- **Strings traduzidas são produzidas em tempo de render.** Uma constante de módulo com texto traduzido congela no import e não acompanha a troca de idioma.
- **Nunca pôr valor de atributo `data-*` atrás de `t()`.**
- **O CHANGELOG.md é público e vai em inglês**; specs e planos em `docs/superpowers/` vão em português.
- Rodar tudo a partir de `app/`: `cd app && node --test`.

---

### Task 1: O módulo da versão e a paridade com o Service Worker

Cria a fonte que a UI vai ler, troca a chave de cache do `sw.js` e amarra as duas com um teste. Vai tudo junto porque um literal sozinho não tem como ser verificado — o teste de paridade é o entregável que dá sentido aos dois arquivos.

**Files:**
- Create: `app/js/version.js`
- Modify: `app/sw.js:2` (a linha `const VERSION = 'somaplay-v39';`)
- Modify: `app/sw.js` — acrescentar `'./js/version.js'` ao array `SHELL` (que hoje termina na linha 46)
- Test: `app/test/version.test.js`

**Interfaces:**
- Consumes: nada (primeira task)
- Produces: `app/js/version.js` exporta `export const VERSION = '0.9.0';` — uma string. As Tasks 2 e 3 importam esse símbolo com esse nome exato.

- [ ] **Step 1: Write the failing test**

Criar `app/test/version.test.js`:

```javascript
// version.test.js — a versão do app aparece em dois lugares e não pode divergir.
//
// O número é ao mesmo tempo o que o usuário lê em Ajustes e a chave do cache do
// Service Worker. Se os dois literais saírem de sincronia, a tela passa a mentir
// sobre qual versão está cacheada — que é exatamente o problema que o
// versionamento existe para resolver.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { VERSION } from '../js/version.js';

const APP = fileURLToPath(new URL('..', import.meta.url));
const SW = readFileSync(APP + 'sw.js', 'utf8');

test('a versão é X.Y.Z, só dígitos', () => {
  assert.match(VERSION, /^\d+\.\d+\.\d+$/, `versão fora do formato: ${VERSION}`);
});

test('a chave de cache do Service Worker é somaplay-<versão>', () => {
  const m = SW.match(/const VERSION = '([^']+)';/);
  assert.ok(m, 'não achei `const VERSION = ...` em sw.js');
  assert.equal(m[1], `somaplay-${VERSION}`,
    `sw.js está em '${m[1]}' e js/version.js em '${VERSION}'`);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && node --test test/version.test.js`
Expected: FAIL — `Cannot find module '../js/version.js'`, porque o módulo ainda não existe.

- [ ] **Step 3: Create the version module**

Criar `app/js/version.js`:

```javascript
// version.js — a versão do app, em X.Y.Z.
//
// Este número é lido em dois lugares: aqui, para mostrar em Ajustes, e em sw.js,
// como chave do cache (`somaplay-<versão>`). Os dois literais são mantidos em
// sincronia por app/test/version.test.js — o mesmo recurso que i18n.test.js usa
// para as duas tabelas de tradução. O projeto não tem build step, então não há
// etapa onde injetar a versão num só lugar.
//
// Regras de quando subir cada dígito, e o que marca a 1.0.0:
// docs/superpowers/specs/2026-08-14-versionamento-design.md
export const VERSION = '0.9.0';
```

- [ ] **Step 4: Run test to verify the format test passes and parity still fails**

Run: `cd app && node --test test/version.test.js`
Expected: o teste de formato PASSA; o de paridade FALHA com `sw.js está em 'somaplay-v39' e js/version.js em '0.9.0'`.

- [ ] **Step 5: Point the Service Worker at the new version**

Em `app/sw.js`, linha 2, trocar:

```javascript
const VERSION = 'somaplay-v39';
```

por:

```javascript
const VERSION = 'somaplay-0.9.0';
```

- [ ] **Step 6: Add the module to SHELL**

Em `app/sw.js`, dentro do array `SHELL`, acrescentar a entrada `'./js/version.js',` junto das outras de `./js/`. Sem isso o app abre quebrado sem internet.

- [ ] **Step 7: Run the whole suite**

Run: `cd app && node --test`
Expected: PASS em tudo. `test/version.test.js` passa nos dois testes; `test/shell.test.js` continua passando, agora cobrindo `js/version.js`.

- [ ] **Step 8: Commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add app/js/version.js app/sw.js app/test/version.test.js
git commit -m "feat(version): version module and the cache key that follows it

The service worker cache key becomes the product version, so reading the
number on screen proves which version is cached. Two literals kept in sync
by a parity test, the same device i18n.test.js uses for the two tables —
the project has no build step, so there is no place to inject one source.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: O CHANGELOG e o teste que cobra a entrada

Cria o arquivo e a asserção que impede subir número sem registrar o que mudou. Separado da Task 1 porque um revisor pode aprovar o mecanismo da versão e rejeitar o formato ou o conteúdo do changelog.

**Files:**
- Create: `CHANGELOG.md` (raiz do repositório, não dentro de `app/`)
- Modify: `app/test/version.test.js` (acrescentar um teste ao fim)

**Interfaces:**
- Consumes: `VERSION` de `app/js/version.js` (Task 1)
- Produces: `CHANGELOG.md` com cabeçalhos de versão no formato `## [X.Y.Z] - YYYY-MM-DD`. A Task 4 acrescenta uma linha à entrada `0.9.0` deste arquivo.

- [ ] **Step 1: Write the failing test**

Acrescentar ao fim de `app/test/version.test.js`:

```javascript
test('o CHANGELOG tem entrada para a versão atual', () => {
  const changelog = readFileSync(APP + '../CHANGELOG.md', 'utf8');
  assert.ok(changelog.includes(`## [${VERSION}]`),
    `CHANGELOG.md não tem "## [${VERSION}]" — subiu o número sem registrar o que mudou?`);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && node --test test/version.test.js`
Expected: FAIL — `ENOENT`, porque `CHANGELOG.md` ainda não existe.

- [ ] **Step 3: Write the CHANGELOG**

Criar `CHANGELOG.md` na raiz do repositório:

```markdown
# Changelog

All notable changes to soma_play are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the numbering follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
as adapted below.

## Versioning rules

While the version is `0.x`, the backup format may still change in incompatible
ways. `1.0.0` ships when the `.somaplay` format is frozen with a compatibility
guarantee for import and export.

- **MINOR** (`0.9 → 0.10`) — a change to what the app *does*: a new capability,
  or behaviour that changed or was removed.
- **PATCH** (`0.9.0 → 0.9.1`) — a fix or adjustment to behaviour that already
  existed.

Two rules keep the number honest:

- **Any release that touches the service worker `SHELL` is at least a PATCH.**
  The version *is* the cache key, so a new release always means a new cache —
  there is no way to ship stale files by forgetting to bump something.
- **Changes outside the app do not bump the version** — `docs/`, specs, plans,
  `scripts/`. The number tracks the app, not the repository.

## [0.9.0] - 2026-08-14

First numbered release. The app was already in production and in use on stage;
this is where it starts carrying a version you can read.

What it does today: chord charts as image or text, play-along with per-stem
volume on a shared transport clock, karaoke, songs organised by artist, style
and list, `.somaplay` backup with a merge mode that upserts by id, a chord
dictionary with custom fingerings, Brazilian and international chord spelling,
PT/EN interface, and full offline operation as an installable PWA.

### Added

- Version number in Settings, under **About**.
- This changelog.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && node --test test/version.test.js`
Expected: PASS nos três testes.

- [ ] **Step 5: Commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add CHANGELOG.md app/test/version.test.js
git commit -m "docs(changelog): the changelog and the test that demands an entry

The test asserts the current version has a heading in CHANGELOG.md, so a
bump without a record fails the suite — and a record without a bump does too.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: A seção Sobre em Ajustes

Mostra o número na tela. Inclui as chaves de tradução nas duas tabelas, porque a seção não existe sem elas e o teste de paridade falharia se fossem separadas.

**Files:**
- Modify: `app/js/render/settings.js` — importar `VERSION` e acrescentar o bloco antes do fechamento do render (hoje o último elemento é o botão `importSamples`, que termina na linha 92; a `</div>` de fechamento está na linha 94)
- Modify: `app/js/i18n/pt.js` — acrescentar 3 chaves junto das outras `settings.*`
- Modify: `app/js/i18n/en.js` — as mesmas 3 chaves
- Test: `app/test/i18n.test.js` (já existe; não precisa mudar, o teste de paridade cobre)

**Interfaces:**
- Consumes: `import { VERSION } from '../version.js';` (Task 1). Atenção ao caminho: `settings.js` está em `app/js/render/`, então sobe um nível.
- Produces: nada que outra task consuma.

- [ ] **Step 1: Add the i18n keys to both tables**

Em `app/js/i18n/pt.js`, junto do bloco `settings.*`:

```javascript
  'settings.about.title': 'Sobre',
  'settings.about.version': 'Versão',
  'settings.about.changelog': 'Ver novidades',
```

Em `app/js/i18n/en.js`, as mesmas chaves:

```javascript
  'settings.about.title': 'About',
  'settings.about.version': 'Version',
  'settings.about.changelog': "What's new",
```

- [ ] **Step 2: Run the i18n parity test**

Run: `cd app && node --test test/i18n.test.js`
Expected: PASS. Se falhar, alguma chave entrou numa tabela só.

- [ ] **Step 3: Import the version into the settings screen**

No topo de `app/js/render/settings.js`, junto dos outros imports, acrescentar:

```javascript
import { VERSION } from '../version.js';
```

- [ ] **Step 4: Add the About block**

Em `app/js/render/settings.js`, logo depois do botão `importSamples` (que fecha com `</button>` na linha 92) e antes da `</div>` da linha 94, inserir:

```javascript
        <div class="setting-row">
          <div class="info">
            <div class="t">${t('settings.about.title')}</div>
            <div class="s">soma_play · ${t('settings.about.version')} ${VERSION}</div>
          </div>
          <a class="btn-ghost" style="height:38px;padding:0 14px;display:inline-flex;align-items:center;text-decoration:none"
             href="https://github.com/somacavalieri/somaplay/blob/main/CHANGELOG.md"
             target="_blank" rel="noopener">${t('settings.about.changelog')}</a>
        </div>
```

O `VERSION` entra cru na interpolação: é dado, não texto traduzível, e por isso não passa por `t()`. Os rótulos passam, e são avaliados a cada render — não podem virar constante de módulo.

- [ ] **Step 5: Syntax check and full suite**

Run: `cd app && node --check js/render/settings.js && node --test`
Expected: sem erro de sintaxe; PASS em tudo.

- [ ] **Step 6: Verify in the browser — this is the layer that counts**

```bash
cd app && python3 -m http.server 8137
```

Abrir `http://localhost:8137`, ir em Ajustes, rolar até o fim. Conferir:
1. A seção **Sobre** aparece com `soma_play · Versão 0.9.0`.
2. Trocar o idioma para English e conferir que vira `About` / `Version` sem recarregar.
3. O link abre o CHANGELOG no GitHub em aba nova.

- [ ] **Step 7: Commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add app/js/render/settings.js app/js/i18n/pt.js app/js/i18n/en.js
git commit -m "feat(settings): show the app version in an About section

Reading the number proves which cache is being served, because the version
is the cache key. The label is translated in both tables and produced at
render time; the number itself is data and never goes through t().

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Registrar a regra no CLAUDE.md e fechar a entrada do changelog

O `CLAUDE.md` hoje diz que mexer no `SHELL` exige bumpar o `VERSION`. Essa frase fica errada depois da Task 1 — o número deixou de ser técnico. Task separada porque é documentação que um revisor avalia por si.

**Files:**
- Modify: `CLAUDE.md` — a seção "Things that will bite you", no parágrafo sobre `SHELL` e `VERSION`
- Modify: `CHANGELOG.md` — acrescentar a linha do `Changed` na entrada `0.9.0`

**Interfaces:**
- Consumes: `CHANGELOG.md` da Task 2
- Produces: nada

- [ ] **Step 1: Read the paragraph that is now wrong**

Run: `grep -n "SHELL" CLAUDE.md`
Ler o parágrafo que começa com **"Changing the `SHELL` array in `app/sw.js` requires bumping `VERSION` on line 2."**

- [ ] **Step 2: Rewrite it**

Substituir aquele parágrafo por:

```markdown
**Changing the `SHELL` array in `app/sw.js` requires bumping the version.** The
install step calls `cache.addAll(SHELL)`, which fails entirely if any path is
missing, and without a new cache key installed clients keep the old list. Since
0.9.0 the cache key *is* the product version (`somaplay-0.9.0`), declared in two
places — `app/js/version.js` and line 2 of `app/sw.js` — and kept in sync by
`app/test/version.test.js`. So any release that touches `SHELL` is at least a
PATCH, and the number on the Settings screen is proof of which cache is being
served. **Every new module under `app/js/` must be added to `SHELL`**, or the app
breaks offline; `app/test/shell.test.js` catches that one.
```

- [ ] **Step 3: Record the change in the changelog**

Em `CHANGELOG.md`, na entrada `0.9.0`, acrescentar depois da seção `### Added`:

```markdown
### Changed

- The service worker cache key is now the product version (`somaplay-0.9.0`)
  instead of an ad-hoc counter (`somaplay-v39`). One number, one meaning: a
  release cannot ship without a new cache.
```

- [ ] **Step 4: Run the full suite**

Run: `cd app && node --test`
Expected: PASS em tudo.

- [ ] **Step 5: Commit**

```bash
cd "$(git rev-parse --show-toplevel)"
git add CLAUDE.md CHANGELOG.md
git commit -m "docs: the SHELL rule now points at the product version

CLAUDE.md still described VERSION as a technical counter to bump. Since
0.9.0 it is the product version, so the rule reads differently: any release
touching SHELL is at least a PATCH.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Verificação final

Depois das quatro tasks:

- [ ] `cd app && node --test` — tudo passa, incluindo os 3 testes novos de `version.test.js`
- [ ] Ajustes mostra `soma_play · Versão 0.9.0`, e muda para `About / Version` ao trocar o idioma
- [ ] `grep -c "somaplay-v39" app/sw.js` devolve `0`
- [ ] O link do changelog abre no GitHub

**Teste de fumaça do mecanismo inteiro** — é ele que prova que o desenho funciona, e vale rodar uma vez:

1. Subir a versão para `0.9.1` nos dois arquivos (`app/js/version.js` e `app/sw.js`).
2. Acrescentar `## [0.9.1] - <data>` ao `CHANGELOG.md` com uma linha qualquer.
3. `cd app && node --test` — passa.
4. Recarregar o app duas vezes e conferir que Ajustes mostra `0.9.1`.
5. Desfazer os três (`git checkout -- app/js/version.js app/sw.js CHANGELOG.md`).

O passo 4 exige dois recarregamentos: no primeiro o Service Worker novo instala e assume (`skipWaiting` + `clients.claim`, `app/sw.js:49` e `:56`), mas a página na tela já tinha sido pintada com o cache anterior.
