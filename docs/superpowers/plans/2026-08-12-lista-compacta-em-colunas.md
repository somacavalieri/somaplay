# Lista compacta em colunas — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A aba Músicas renderiza a biblioteca como grade responsiva de linhas compactas de uma linha só, com badge de fonte colorido em toda linha.

**Architecture:** Função de render nova (`songLine`) ao lado da `songRow` existente em `app/js/render/home.js`; CSS aditivo em `app/css/app.css` (grid `auto-fill` + linha + badges); uma função pura nova (`corDaFonte`) em `app/js/state.js`. Nenhum dado persistido muda; nenhum módulo novo.

**Tech Stack:** ES modules puros, sem build; `node:test` (Node >= 20); template strings + delegação de clique por `data-a` (padrão do app).

**Spec:** `docs/superpowers/specs/2026-08-12-lista-compacta-em-colunas-design.md`

## Global Constraints

- **Nunca renomear `DB_NAME`** em `app/js/db.js` (não tocamos em db.js neste plano).
- **Nenhum módulo novo em `app/js/`** — o `SHELL` de `app/sw.js` fica intacto; mas `app.css` e `home.js` cacheados mudam, então **`VERSION` em `app/sw.js:2` bomba de `somaplay-v34` para `somaplay-v35`** (Task 2).
- **Nenhuma chave i18n nova** — o badge reusa `home.song.sourceQualifier` ('Fonte: {fonte}' / 'Source: {fonte}'), já presente nas duas tabelas.
- **Valor de `data-*` nunca passa por `t()`**; conteúdo de usuário (nome de fonte, título, artista) sempre passa por `esc()`.
- **As telas Artista e Estilo não mudam** — continuam usando `songRow` e o qualificador de colisão integral. Só a aba Músicas (`songsTab`) troca de render.
- Testes rodam com `cd app && node --test`; sintaxe com `node --check <arquivo>`.
- Commits em inglês (convenção do repo), specs/planos em português.

---

### Task 1: `corDaFonte` em `state.js`

A cor do badge é função pura do nome da fonte: hash djb2a do nome `trim().toLowerCase()`, módulo 5. djb2a (`h*33 + c`) e não djb2 (`h*33 ^ c`): foi testado com os nomes reais do acervo e é a variante que separa `cifraclub → 1`, `songbook → 2`, `vj → 4` — que, com a paleta `f0..f4 = [verde, âmbar, teal, dourado, neutro]`, reproduz exatamente as cores do mockup.

**Files:**
- Modify: `app/js/state.js` (inserir após `fonteOf`, ~linha 135)
- Test: `app/test/fontes.test.js` (append ao final; ampliar o import do topo)

**Interfaces:**
- Consumes: nada novo — vive ao lado de `fonteOf` (`state.js:135`).
- Produces: `corDaFonte(nome: string) → int 0..4`, determinística, exportada de `app/js/state.js`. Task 2 a importa em `home.js` para montar a classe CSS `f${corDaFonte(nome)}`.

- [ ] **Step 1: Escrever os testes que falham**

Em `app/test/fontes.test.js`, ampliar o import do topo (linhas 8–11) para incluir `corDaFonte`:

```js
import {
  fontesSugeridas, FONTES_FIXAS,
  fontesDaBiblioteca, fonteCasa, fonteOf, SEM_FONTE, songIdsDasFontes,
  corDaFonte,
} from '../js/state.js';
```

E acrescentar ao final do arquivo:

```js
// corDaFonte: a cor do badge é função do NOME, não do ranking de uso — uso
// muda a cada import e a cor não pode dançar. Hash do lowercase: grafias da
// mesma fonte (regra de dedupe da biblioteca) recebem a mesma cor.
test('corDaFonte é determinística e ignora caixa e espaços', () => {
  assert.equal(corDaFonte('CifraClub'), corDaFonte('cifraclub'));
  assert.equal(corDaFonte('  Songbook  '), corDaFonte('songbook'));
  assert.equal(corDaFonte('VJ'), corDaFonte('vj'));
});

test('os três nomes reais do acervo caem nas cores do mockup', () => {
  assert.equal(corDaFonte('CifraClub'), 1); // f1 = âmbar
  assert.equal(corDaFonte('Songbook'), 2);  // f2 = teal
  assert.equal(corDaFonte('VJ'), 4);        // f4 = neutro
});

test('corDaFonte devolve sempre um índice inteiro 0–4', () => {
  for (const nome of ['', 'Real Book', 'YouTube', 'Ouvido', 'x', 'Bossa Nova 1 - Almir Chediak']) {
    const i = corDaFonte(nome);
    assert.ok(Number.isInteger(i) && i >= 0 && i <= 4, `${nome} → ${i}`);
  }
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && node --test test/fontes.test.js`
Expected: FAIL — `SyntaxError: The requested module '../js/state.js' does not provide an export named 'corDaFonte'`

- [ ] **Step 3: Implementar `corDaFonte`**

Em `app/js/state.js`, logo após a linha `export function fonteOf(s) { … }` (~135):

```js
// Cor do badge de fonte (spec 2026-08-12-lista-compacta): índice 0–4 estável
// por NOME — não por ranking de uso, que dançaria a cada import. Hash do
// lowercase porque "cifraclub" e "CifraClub" são a mesma fonte pela regra de
// dedupe. djb2a (h*33+c), e não djb2 (h*33^c): é a variante que separa os
// três nomes reais do acervo — cifraclub→1 (âmbar), songbook→2 (teal),
// vj→4 (neutro), exatamente as cores do mockup. Paleta em .src-badge.f0–.f4.
export function corDaFonte(nome) {
  const s = (nome || '').trim().toLowerCase();
  let h = 5381;
  for (const c of s) h = ((h * 33) + c.codePointAt(0)) >>> 0;
  return h % 5;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd app && node --test test/fontes.test.js`
Expected: PASS — todos os testes do arquivo, incluindo os 3 novos.

- [ ] **Step 5: Suíte inteira**

Run: `cd app && node --test`
Expected: PASS — nada mais depende de `state.js` de forma que quebre.

- [ ] **Step 6: Commit**

```bash
git add app/js/state.js app/test/fontes.test.js
git commit -m "feat: deterministic source badge color (corDaFonte)"
```

---

### Task 2: grade compacta na aba Músicas (`songLine` + CSS + bump do SW)

O deliverable é a aba Músicas renderizando a grade — CSS e markup são um único deliverable (um sem o outro é código morto), então vivem na mesma task, junto com o bump de `VERSION` que os leva aos clientes instalados.

**Files:**
- Modify: `app/css/app.css` (seção "Linhas de música / lista": estender o seletor `.src-qual` na linha ~165 e inserir bloco novo após `.tag-karaoke`, linha ~177)
- Modify: `app/js/render/home.js:2` (import), `home.js:75` (funções novas após `qualificadorHTML`), `home.js:109-117` (`songsTab` usa `songLine` e `songs-grid`)
- Modify: `app/sw.js:2` (`VERSION`)

**Interfaces:**
- Consumes: `corDaFonte(nome) → 0..4` e `fonteOf(s) → string` de `../state.js` (Task 1); `qualificadorDe(s, songs)`, `modesOf(s)`, `SEM_FONTE`, `eqBars()`, `I.play/mic/heart/addList`, `esc()`, `t()` — tudo já importado ou disponível em `home.js`.
- Produces: `songLine(s) → string` (privada de `home.js`, usada só por `songsTab`); classes CSS `.songs-grid`, `.song-line`, `.src-badge.f0`–`.f4` (usadas só pela aba Músicas). `songRow` continua exportada e intacta.

- [ ] **Step 1: CSS — estender o seletor do qualificador**

Em `app/css/app.css` (~linha 165), o seletor do qualificador ganha o escopo da linha compacta. De:

```css
.song-row .titles .t .src-qual{
```

para:

```css
.song-row .titles .t .src-qual,.song-line .src-qual{
```

- [ ] **Step 2: CSS — bloco da grade, da linha e dos badges**

Em `app/css/app.css`, inserir após a regra `.tag-karaoke{…}` (~linha 177):

```css
/* --- Aba Músicas: grade compacta (spec 2026-08-12-lista-compacta) --- */
/* O nº de colunas emerge da largura: auto-fill com min(340px,100%) — o min()
   evita coluna mais larga que o viewport no celular. overflow:hidden clipa o
   hairline ::before fantasma da primeira coluna. */
.songs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(340px,100%),1fr));column-gap:28px;overflow:hidden}
.songs-grid .empty{grid-column:1/-1}
.song-line{position:relative;display:flex;align-items:center;gap:10px;min-height:48px;padding:2px 4px;border-bottom:1px solid var(--border);cursor:pointer}
.song-line:hover{background:var(--surface-hover)}
.song-line::before{content:'';position:absolute;top:0;bottom:0;left:-14px;width:1px;background:var(--border)}
.song-line .pg{width:24px;display:flex;align-items:center;justify-content:center;color:var(--muted2);flex-shrink:0}
/* Título tem prioridade de largura (shrink:0 + max-width) — o artista encolhe
   primeiro; os dois truncam com ellipsis. */
.song-line .tt{flex:1;min-width:0;display:flex;align-items:baseline;gap:8px;white-space:nowrap;overflow:hidden}
.song-line .tt .t{font-family:var(--f-title);font-weight:600;font-size:15px;flex-shrink:0;max-width:100%;overflow:hidden;text-overflow:ellipsis}
.song-line .tt .a{color:var(--muted);font-size:13px;min-width:0;overflow:hidden;text-overflow:ellipsis}
.song-line .mic{width:26px;height:26px;border-radius:7px;background:var(--gold-tint);color:var(--gold);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.song-line .ib{width:40px;height:40px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:transparent;border:none;border-radius:10px;color:var(--muted2);cursor:pointer;padding:0}
.song-line .ib:hover{color:var(--text);background:var(--surface2)}
.song-line .ib.fav{color:var(--accent)}
.src-badge{flex-shrink:0;max-width:96px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:3px 8px;border-radius:6px;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
.src-badge.f0{background:var(--green-tint);color:var(--green)}
.src-badge.f1{background:var(--accent-tint);color:var(--accent)}
.src-badge.f2{background:var(--teal-tint);color:var(--teal)}
.src-badge.f3{background:var(--gold-tint);color:var(--gold)}
.src-badge.f4{background:var(--surface2);color:var(--muted)}
```

- [ ] **Step 3: `home.js` — import**

Linha 2 de `app/js/render/home.js` ganha `fonteOf` e `corDaFonte`:

```js
import { S, songsOfArtist, modesOf, matchesLens, artistName, favList, listById, estiloOf, SEM_ESTILO, fontesDaBiblioteca, SEM_FONTE, lensAtiva, musicasPresentes, qualificadorDe, fonteOf, corDaFonte } from '../state.js';
```

- [ ] **Step 4: `home.js` — `songLine` e auxiliares**

Inserir após a função `qualificadorHTML` (que termina na linha ~75; ela fica intacta — `songRow` continua usando):

```js
// A linha compacta tem badge de fonte em TODA linha, então o qualificador
// inline fica só para o caso ordinal — colisão em que NENHUMA das músicas tem
// fonte, o único em que não há badge para distinguir. Nos demais casos o
// badge (ou a ausência dele) já separa (spec 2026-08-12-lista-compacta).
function ordinalHTML(s) {
  const q = qualificadorDe(s, S.songs);
  if (!q || q === SEM_FONTE || fonteOf(s)) return '';
  return ` <em class="src-qual">${esc(q)}</em>`;
}

function fonteBadge(s) {
  const nome = fonteOf(s);
  if (!nome) return ''; // sem fonte: sem badge — a ausência é informação
  return `<span class="src-badge f${corDaFonte(nome)}" title="${t('home.song.sourceQualifier', { fonte: esc(nome) })}">${esc(nome)}</span>`;
}

// Linha compacta da aba Músicas: uma linha só, em grade responsiva
// (.songs-grid). Artista e Estilo seguem com songRow — decisão da spec.
function songLine(s) {
  const isCur = S.currentSongId === s.id && S.transportPlaying;
  return `<div class="song-line" data-a="openSong" data-id="${s.id}" data-from="home">
    ${isCur ? eqBars() : `<div class="pg">${I.play(16)}</div>`}
    <div class="tt"><span class="t">${esc(s.title)}${ordinalHTML(s)}</span><span class="a">${esc(artistName(s))}</span></div>
    ${fonteBadge(s)}
    ${modesOf(s).includes('T3') ? `<span class="mic" title="${t('home.song.hasKaraoke')}">${I.mic(15)}</span>` : ''}
    <button class="ib ${s.favorita ? 'fav' : ''}" data-a="toggleFav" data-id="${s.id}" title="${t('common.favorite')}">${I.heart(s.favorita, 19)}</button>
    <button class="ib" data-a="openPopover" data-id="${s.id}" title="${t('home.song.addToList')}">${I.addList(19)}</button>
  </div>`;
}
```

- [ ] **Step 5: `home.js` — `songsTab` usa a grade**

Na função `songsTab` (linhas ~109–117), duas trocas. As linhas:

```js
  const rows = flat.length
    ? flat.map((s) => songRow(s)).join('')
    : `<div class="empty"><div class="t">${t('home.songs.emptyTitle')}</div><div class="s">${t('home.songs.emptySub')}</div></div>`;
```

viram (só `songRow(s)` → `songLine(s)`):

```js
  const rows = flat.length
    ? flat.map((s) => songLine(s)).join('')
    : `<div class="empty"><div class="t">${t('home.songs.emptyTitle')}</div><div class="s">${t('home.songs.emptySub')}</div></div>`;
```

E o container, de:

```js
    <div class="rows">${rows}</div>`;
```

para:

```js
    <div class="songs-grid">${rows}</div>`;
```

**Atenção:** as outras ocorrências de `.rows` no arquivo (`listsTab`, linha ~157) e nos outros módulos (`artist.js:22`, `estilo.js:23`, `listscreen.js`) **não mudam**.

- [ ] **Step 6: bump do service worker**

Em `app/sw.js:2`, de:

```js
const VERSION = 'somaplay-v34';
```

para:

```js
const VERSION = 'somaplay-v35';
```

- [ ] **Step 7: Verificar sintaxe e suíte**

Run: `cd app && node --check js/render/home.js && node --check js/state.js && node --check sw.js && node --test`
Expected: nenhum erro de sintaxe; suíte inteira PASS (inclui `i18n.test.js` — sem chave nova, paridade mantida — e `shell.test.js` — `SHELL` intacto).

- [ ] **Step 8: Commit**

```bash
git add app/css/app.css app/js/render/home.js app/sw.js
git commit -m "feat: songs tab as responsive compact grid with source badges"
```

---

### Task 3: verificação manual no navegador

A terceira camada de verificação do projeto — a que conta para UI. Roda na biblioteca de exemplo do app e, depois, no acervo real do usuário.

**Files:** nenhum (só correções que a verificação apontar; se houver, commit `fix:` ao final).

**Interfaces:**
- Consumes: o app servido por HTTP (Service Worker + OPFS não funcionam em `file://`).
- Produces: checklist abaixo confirmado, com ajuste fino de medidas (340px, gaps, tamanhos de fonte) se o visual pedir.

- [ ] **Step 1: Servir o app**

```bash
cd app && python3 -m http.server 8137
```

Abrir `http://localhost:8137`.

- [ ] **Step 2: Checklist da grade (aba Músicas)**

- Redimensionar a janela: ~600px de largura → **1 coluna**; ~1100px → **2–3 colunas**; ~1600px → **3–4 colunas**. Sem media query nova; hairline vertical entre colunas presente, ausente à esquerda da primeira.
- Ordem de leitura linha-a-linha: com ordenação por Título, o 2º título alfabético fica à **direita** do 1º, não abaixo.
- Badges: música com fonte `CifraClub` → âmbar; `Songbook` → teal; `VJ` → neutro; caps via CSS; música sem fonte → sem badge.
- Fonte com nome longo → badge trunca com ellipsis e o `title` mostra o nome inteiro.
- Título longo trunca antes de empurrar o badge; artista encolhe antes do título.
- Tocar na linha abre a música; tocar no coração alterna favorita **sem** abrir; tocar no ícone de lista abre o popover **sem** abrir a música.
- Música tocando mostra as barras de EQ no lugar do glifo de play.
- Colisão de título em que **nenhuma** das músicas tem fonte → qualificador `1`/`2` inline; colisão com fontes distintas → sem qualificador, badges distinguem.
- Estado vazio (busca sem resultado) ocupa a largura toda da grade.

- [ ] **Step 3: Checklist do entorno**

- Tema claro (Configurações): badges legíveis nos cinco tints; hairlines visíveis.
- Telas Artista e Estilo: **card antigo intacto**, qualificador de colisão integral (com fonte), sem badge.
- Aba Listas e tela de lista: intactas.
- Busca, ordenação (Título/Artista/Recentes) e lente T2/T3/fonte continuam recortando a grade.
- DevTools → Application → Service Worker: após reload, `somaplay-v35` ativo; com "Offline" marcado o app continua servindo a aba Músicas nova.

- [ ] **Step 4: Ajustes finos, se houver**

Medidas candidatas a ajuste ao vivo (mudar só se o checklist apontar desconforto): `minmax(min(340px,100%),1fr)`, `column-gap:28px`, `font-size` do título (15px) e do artista (13px), `max-width:96px` do badge. Qualquer mudança fica em `app/css/app.css`, seguida de reload e re-checagem do item afetado.

- [ ] **Step 5: Commit (só se o Step 4 mudou algo)**

```bash
git add app/css/app.css
git commit -m "fix: compact grid polish from manual verification"
```
