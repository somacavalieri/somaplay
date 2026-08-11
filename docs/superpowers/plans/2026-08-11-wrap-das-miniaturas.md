# Wrap ciente de diagrama no modo miniatura — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** com as miniaturas ligadas, a fileira de diagramas para de vazar a caixa da cifra — em qualquer largura de tela, sem encolher o diagrama.

**Architecture:** `wrapBlock` ganha um 4º argumento opcional, um predicado `cabe(trecho) → boolean`. Omitido, o comportamento é o de hoje byte a byte. `chords.js` continua sem saber o que é diagrama e sem tocar o DOM; quem constrói o predicado é `play.js`, que já tem `layoutChordRow`, `chordDiagWidth` e a medição da caixa. É a mesma divisão do export por fonte: o núcleo puro recebe o critério pronto, o chamador conhece o domínio.

**Tech Stack:** ES modules servidos como estão. Sem dependência, sem build. Testes com `node --test` (Node ≥ 20). Spec: `docs/superpowers/specs/2026-08-11-wrap-das-miniaturas-design.md`.

## Global Constraints

- **Nada de dependência nova, nada de build.**
- **Toda mudança em `app/css/` ou `app/js/` exige bump de `VERSION` em `app/sw.js:2` antes do merge.** Neste plano o bump acontece **uma vez, na Tarefa 3**. As Tarefas 1 e 2 mexem em `app/js/` sem bump de propósito: commit intermediário de branch não é publicado. Desta vez o bump é **necessário** — `somaplay-v29` já está publicado em `main`. O `SHELL` **não** muda: nenhum módulo novo.
- **`chords.js` é puro.** Sem DOM, sem `document`, sem medir pixel. Ele recebe o predicado; não o constrói.
- **Nunca alterar o texto da cifra do usuário.** O wrap é de exibição — `cifra.texto` não muda, e a mesma música reflui diferente em telas diferentes.
- **Nada de `t()` em valor de `data-*`.** Não se aplica aqui (nenhum `data-*` novo), mas vale se surgir.
- **Comentário de código novo em português** em `app/js/` e `app/test/`, como todo arquivo já existente lá.
- **Commitar apenas os arquivos listados em cada tarefa, nunca `git add -A`.**
- **Verificar com `cd app && node --test` e `node --check`.** UI é verificação manual no navegador — não há harness de DOM, de propósito.

## Estrutura de arquivos

| arquivo | responsabilidade | tarefa |
|---|---|---|
| `app/js/chords.js` | `wrapBlock` com predicado opcional; `peca()` extraída | 1 |
| `app/test/cifrawrap.test.js` | o predicado, e a trava de não-regressão | 1 |
| `app/js/render/play.js` | medir a caixa em px, um só `blockWidth`, ligar o predicado | 2 |
| `app/sw.js` | bump de `VERSION` | 3 |

---

### Task 1: `wrapBlock` aprende a perguntar "cabe?"

**Files:**
- Modify: `app/js/chords.js:377-406` (`wrapBlock`)
- Test: `app/test/cifrawrap.test.js` (acrescentar seção ao final, e estender o import)

**Interfaces:**
- Consumes: nada de outras tarefas.
- Produces: `wrapBlock(chords, lyric, cols, cabe)`. `cabe(trechoDeAcordes) → boolean` é **opcional**; omitido, a saída é idêntica à de hoje. O trecho entregue ao predicado é o pedaço **como será desenhado** — aparado à direita e sem o recuo esquerdo. A Tarefa 2 depende dessa assinatura e dessa garantia.

- [ ] **Passo 1: escrever os testes que falham**

Estenda o import do topo de `app/test/cifrawrap.test.js`, hoje:

```js
import { wrapBlock } from '../js/chords.js';
```

para:

```js
import { wrapBlock, layoutChordRow, chordDiagWidth } from '../js/chords.js';
```

E acrescente ao **final** do arquivo:

```js
// --- wrap ciente de diagrama (spec 2026-08-11) ----------------------------
// O 4º argumento é um predicado: "este trecho, montado como fileira de
// diagramas, cabe na caixa?". chords.js não sabe o que é diagrama — quem sabe
// medir é play.js. Aqui o predicado é de mentira, e é isso que torna o teste
// possível sem DOM.

const ate = (max) => (trecho) => trecho.length <= max;

test('sem o predicado, a saída é a de sempre', () => {
  for (const cols of [8, 16, 24, 32, 40, 56, 80]) {
    assert.deepEqual(wrapBlock(CH, LY, cols, undefined), wrapBlock(CH, LY, cols));
  }
});

test('predicado que aceita tudo é o mesmo que não passar nada', () => {
  for (const cols of [16, 40]) {
    assert.deepEqual(wrapBlock(CH, LY, cols, () => true), wrapBlock(CH, LY, cols));
  }
});

test('predicado mais apertado que as colunas corta mais cedo', () => {
  const sem = wrapBlock(CH, LY, 60);
  const com = wrapBlock(CH, LY, 60, ate(20));
  assert.ok(com.length > sem.length, `${com.length} pedaços não é mais que ${sem.length}`);
});

test('linha que cabe em colunas mas o predicado rejeita é quebrada mesmo assim', () => {
  // É o caso da MAIORIA das fileiras que vazam hoje: cabem em 60 colunas e não
  // cabem em pixel. Sem este teste o bug volta pelo atalho do início.
  const r = wrapBlock('C   G   Am  F', 'dó  sol lá  fá', 60, ate(8));
  assert.ok(r.length > 1, 'o atalho do início escapou do predicado');
});

test('o predicado recebe o pedaço aparado, não a fatia crua', () => {
  const vistos = [];
  wrapBlock('    C   G', '    dó  sol', 60, (t) => { vistos.push(t); return true; });
  assert.ok(vistos.length > 0, 'o predicado nem foi chamado');
  for (const t of vistos) assert.ok(!/^ /.test(t), `veio com recuo: ${JSON.stringify(t)}`);
});

test('com o predicado, nenhum acorde e nenhuma palavra são partidos', () => {
  const r = wrapBlock(CH, LY, 60, ate(24));
  const inteiros = r.flatMap((p) => chordCols(p.chords).map((x) => x[0]));
  for (const [tok] of chordCols(CH)) assert.ok(inteiros.includes(tok), `partiu ${tok}`);
  const palavras = r.flatMap((p) => p.lyric.split(/\s+/).filter(Boolean));
  for (const w of LY.split(/\s+/).filter(Boolean)) assert.ok(palavras.includes(w), `partiu ${w}`);
});

test('predicado que rejeita tudo não trava', () => {
  // Rejeitando tudo, a saída de emergência corta na largura crua — e aí NÃO há
  // promessa de token inteiro, porque o corte não olha mais o espaço. O que se
  // garante é que termina, devolve pedaço e não devolve pedaço vazio. Afirmar
  // "nenhum acorde partido" aqui passaria por sorte da fixture, não por regra.
  const r = wrapBlock(CH, LY, 40, () => false);
  assert.ok(r.length > 1);
  for (const p of r) assert.ok(p.chords || p.lyric);
});

test('o predicado só é consultado em corte válido', () => {
  let chamadas = 0;
  wrapBlock(CH, LY, 40, () => { chamadas++; return true; });
  // Ordem certa: 2 chamadas. Com `serve` antes dos `ok`, viram 6. Um limite
  // frouxo (< CH.length, que é 73) deixaria as duas passarem e não guardaria nada.
  assert.ok(chamadas <= 2, `${chamadas} chamadas; a ordem dos operandos inverteu?`);
});

test('o atalho testa exatamente o pedaço que devolve', () => {
  // Recuo comum às duas linhas: 17% das linhas do songbook têm, até 9 colunas.
  // Se o atalho testar o pedaço sem recuo e devolver o pedaço com, ele aprova
  // uma fileira mais estreita do que a desenhada — e ela vaza.
  const vistos = [];
  const r = wrapBlock('   Am   G', '  quando chove', 20, (t) => { vistos.push(t); return true; });
  assert.equal(vistos.length, 1);
  assert.equal(vistos[0], r[0].chords);
});

test('composição real: linha densa não deixa fileira acima da caixa', () => {
  // Sem predicado de mentira: as larguras vêm de chordDiagWidth, que é o que o
  // app usa de verdade. 300px é a caixa de um celular estreito.
  const CAIXA = 300;
  const larg = (tok, isChord) => (isChord ? chordDiagWidth(tok, true, null) : tok.length * 8);
  const cabe = (trecho) => {
    const it = layoutChordRow(trecho, 12, larg);
    if (!it.length) return true;
    const u = it[it.length - 1];
    return u.x + larg(u.tok, u.isChord) <= CAIXA;
  };
  const r = wrapBlock(CH, LY, 60, cabe);
  assert.ok(r.length > 1, 'não quebrou nada');
  for (const p of r) if (p.chords) assert.ok(cabe(p.chords), `fileira acima da caixa: ${p.chords}`);
});
```

- [ ] **Passo 2: rodar para ver falhar**

Rodar: `cd app && node --test test/cifrawrap.test.js`
Esperado: FAIL. Os testes que passam o 4º argumento falham porque ele é ignorado — em particular `predicado mais apertado que as colunas corta mais cedo` e `linha que cabe em colunas mas o predicado rejeita`.

- [ ] **Passo 3: implementar**

Substitua **todo** o corpo de `wrapBlock` em `app/js/chords.js` (hoje linhas 377-406) por:

```js
export function wrapBlock(chords, lyric, cols, cabe) {
  const c = String(chords == null ? '' : chords).replace(/\s+$/, '');
  const l = String(lyric == null ? '' : lyric).replace(/\s+$/, '');
  const end = Math.max(c.length, l.length);
  const n = Math.floor(cols);

  // corte válido: além do fim da linha, ou com espaço encostado de um dos lados
  const ok = (s, i) => i >= s.length || s[i - 1] === ' ' || s[i] === ' ';
  const lead = (s) => s.length - s.replace(/^ +/, '').length;

  // O pedaço COMO ELE VAI SER DESENHADO: aparado à direita e sem o recuo comum
  // às duas linhas. É isso que `cabe` precisa julgar — espaço que ninguém
  // desenha não pode entrar na conta da largura.
  const peca = (pos, cut) => {
    const a = c.slice(pos, cut).replace(/\s+$/, '');
    const b = l.slice(pos, cut).replace(/\s+$/, '');
    const pad = (a && b) ? Math.min(lead(a), lead(b)) : (a ? lead(a) : lead(b));
    return { chords: a.slice(pad), lyric: b.slice(pad) };
  };
  const serve = (pos, cut) => !cabe || cabe(peca(pos, cut).chords);

  if (!(n > 1)) return [{ chords: c, lyric: l }];
  // O atalho também consulta `cabe`: a maioria das fileiras de miniatura que
  // vazam cabe em colunas e não cabe em pixel.
  // Testa `c` CRU, porque é `c` cru que este atalho devolve — com recuo e tudo.
  // Testar o pedaço sem recuo (serve/peca) aprovaria uma fileira mais estreita
  // do que a que vai ser desenhada, e 17% das linhas do songbook têm recuo comum.
  if (end <= n && (!cabe || cabe(c))) return [{ chords: c, lyric: l }];

  const out = [];
  for (let pos = 0; pos < end;) {
    const lim = Math.min(pos + n, end);
    let k = lim;
    // `serve` só é avaliado depois de `ok` passar nas DUAS linhas: só nos
    // cortes válidos, não a cada caractere.
    while (k > pos + 1 && !((ok(c, k) && ok(l, k)) && serve(pos, k))) k--;
    // Não deu para recuar: corta na largura mesmo, para não travar. É a mesma
    // escapatória de sempre — token único mais largo que a tela, ou dois
    // acordes colados na mesma sílaba.
    const cut = k > pos + 1 ? k : lim;
    const p = peca(pos, cut);
    if (p.chords || p.lyric) out.push(p);
    pos = cut;
  }
  return out.length ? out : [{ chords: c, lyric: l }];
}
```

Três coisas que mudaram e uma que não pode mudar:

1. `peca()` extraída — o cálculo de `a`/`b`/`pad` que estava solto no fim do laço.
2. O atalho do início virou dois `if`, e o segundo consulta `serve`.
3. Os dois ramos do corte viraram um só, com `lim = Math.min(pos + n, end)`.
4. **A ordem `(ok && ok) && serve` não pode inverter** — inverter faz o predicado rodar a cada caractere.

Sem `cabe`, isto é o de hoje linha por linha: quando `end - pos <= n`, `lim` é `end` e `ok(c, end) && ok(l, end)` passa de primeira (`i >= s.length`), então o `while` nem gira; quando não cabe, `lim` é `pos + n` e a varredura é a mesma; o fallback `lim` é o antigo `pos + n`.

- [ ] **Passo 4: rodar para ver passar**

Rodar: `cd app && node --test test/cifrawrap.test.js`
Esperado: PASS, todos — os **10 que já existiam** e os 9 novos, 19 no total. Os 10 antigos
são a trava de não-regressão do modo texto; se algum ficar vermelho, a reestruturação do
laço não foi fiel.

Rodar: `cd app && node --test`
Esperado: PASS, tudo.

Rodar: `cd app && node --check js/chords.js`
Esperado: sem saída.

- [ ] **Passo 5: commitar**

```bash
git add app/js/chords.js app/test/cifrawrap.test.js
git commit -m "feat: let wrapBlock ask whether a piece fits, not just how wide it is"
```

---

### Task 2: `play.js` mede a caixa e liga o predicado

**Files:**
- Modify: `app/js/render/play.js` — `chordDiagRowHTML` (hoje 131-138), `measureCifraCols` (154-168), `reflowCifra` (171-178), `cifraTextHTML` (192-217)

**Interfaces:**
- Consumes: `wrapBlock(chords, lyric, cols, cabe)` da Tarefa 1.
- Produces: nada que outra tarefa consuma.

- [ ] **Passo 1: medir a caixa em pixel, não só em colunas**

`measureCifraCols` já mede `el.clientWidth` e joga fora. Renomeie para `measureCifra` e devolva os dois. Substitua as linhas 151-178 por:

```js
let cifraCols = 0;
let cifraColsPrev = 0;
let cifraBoxPx = 0;      // largura da caixa em px — a régua do modo miniatura

function measureCifra() {
  const el = document.querySelector('.cifra-text');
  const w = el ? el.clientWidth : 0;
  if (!w) return { cols: 0, px: 0 };
  // Sonda dentro da própria .cifra-text: herda fonte, tamanho e zoom exatos. Medir
  // pelo canvas dava caractere mais estreito que o real (720/12,8 = 56 colunas onde
  // só cabiam 54), e a linha continuava vazando.
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;font-weight:700';
  probe.textContent = '0'.repeat(100);
  el.appendChild(probe);
  const chPx = probe.getBoundingClientRect().width / 100;
  probe.remove();
  return chPx > 0 ? { cols: Math.max(8, Math.floor(w / chPx)), px: w } : { cols: 0, px: 0 };
}

// Mede e, se a largura em COLUNAS mudou, re-renderiza uma vez. A largura em px é
// guardada sempre: variação menor que um caractere não vale um re-render, e a
// fileira tem 6px de folga entre blocos para absorver isso.
function reflowCifra(update) {
  const { cols, px } = measureCifra();
  if (px) cifraBoxPx = px;
  if (!cols || cols === cifraCols || cols === cifraColsPrev) return false;
  cifraColsPrev = cifraCols;
  cifraCols = cols;
  update();
  return true;
}
```

- [ ] **Passo 2: uma medida só de largura de bloco**

Hoje `chordDiagRowHTML` calcula a largura por dentro. Ela passa a **receber** — a mesma função que o predicado usa. Substitua `chordDiagRowHTML` (hoje 131-138) por:

```js
// Fileira nome+diagrama no lugar da linha de acordes (só linhas com letra).
// `blockWidth` vem de fora: é a MESMA que o predicado do wrap usa. Duas medidas
// para a mesma coisa divergiriam no dia em que uma mudasse, e a fileira voltaria
// a vazar sem ninguém entender por quê.
function chordDiagRowHTML(chordLine, dict, meas, blockWidth) {
  const items = layoutChordRow(chordLine, meas.chPx, blockWidth);
  const inner = items.map((it) => (it.isChord
    ? `<button class="ch-diag" style="left:${Math.round(it.x)}px" data-a="openChordPop" data-id="${esc(it.name)}" title="${t('play.chordDiagRow.viewChord')}"><span class="nm">${esc(it.tok)}</span>${chordSVG(it.name, true, dict)}</button>`
    : `<span class="ch-tok" style="left:${Math.round(it.x)}px">${esc(it.tok)}</span>`)).join('');
  return `<div class="ch-diag-row">${inner}</div>`;
}
```

- [ ] **Passo 3: construir o predicado e passar ao wrap**

Em `cifraTextHTML`, depois da linha `const meas = mini ? rowMeasurers(fontPx) : null;` (hoje 198), acrescente:

```js
  // A largura de um bloco da fileira. Uma só, para o desenho e para o predicado.
  const blockWidth = !mini ? null : (tok, isChord) => (isChord
    ? Math.max(chordDiagWidth(chordName(tok), true, dict), meas.label(tok))
    : meas.tok(tok));

  // "Este trecho, montado como fileira, cabe na caixa?" Só o modo miniatura
  // pergunta — no modo texto a coluna do caractere é a régua certa. Sem medição
  // ainda (cifraBoxPx = 0), não pergunta nada e o wrap é o de sempre.
  const cabe = (!mini || !cifraBoxPx) ? undefined : (trecho) => {
    const itens = layoutChordRow(trecho, meas.chPx, blockWidth);
    if (!itens.length) return true;
    const u = itens[itens.length - 1];
    return u.x + blockWidth(u.tok, u.isChord) <= cifraBoxPx;
  };
```

E troque o `for` do reflow (hoje 207-208) e a chamada da fileira (210-212) por:

```js
    for (const p of wrapBlock(ln.hasChords ? ln.chords : '',
                              ln.hasLyric ? ln.lyric : '', cifraCols,
                              (mini && ln.hasLyric) ? cabe : undefined)) {
      if (ln.hasChords && p.chords) {
        h += (mini && ln.hasLyric)
          ? chordDiagRowHTML(p.chords, dict, meas, blockWidth)
          : `<div class="ch">${chordLineHTML(p.chords)}</div>`;
      }
```

`(mini && ln.hasLyric)` é exatamente a condição que já decide se a linha vira fileira — o predicado só entra onde a fileira existe.

`chordName` e `chordDiagWidth` já são importados por `play.js` (usados hoje dentro de `chordDiagRowHTML`); confira o import do topo e não acrescente nada que já esteja lá.

- [ ] **Passo 4: checar sintaxe e a suíte**

Rodar: `cd app && node --check js/render/play.js`
Esperado: sem saída.

Rodar: `cd app && node --test`
Esperado: PASS, tudo. Não há teste de DOM aqui, de propósito — a verificação desta tarefa é a do navegador, na Tarefa 3.

Rodar: `cd app && grep -n "measureCifraCols" js/render/play.js`
Esperado: **sem saída** — o nome antigo não pode ter sobrado em lugar nenhum.

- [ ] **Passo 5: commitar**

```bash
git add app/js/render/play.js
git commit -m "feat: measure the chart box in pixels and let the thumbnail row wrap by it"
```

---

### Task 3: bump do Service Worker e verificação no navegador

**Files:**
- Modify: `app/sw.js:2`

**Interfaces:**
- Consumes: Tarefas 1 e 2.
- Produces: nada.

- [ ] **Passo 1: bump da VERSION**

Em `app/sw.js`, linha 2, troque `somaplay-v29` por `somaplay-v30`.

Desta vez o bump é **necessário**: `v29` já está publicado em `main`, então sem ele quem já instalou continua rodando o JS antigo. O `SHELL` **não** muda — nenhum módulo novo.

- [ ] **Passo 2: rodar a bateria toda**

Rodar: `cd app && node --test`
Esperado: PASS, tudo, incluindo `shell.test.js` (que também confere o formato `somaplay-vN`).

- [ ] **Passo 3: commitar**

```bash
git add app/sw.js
git commit -m "chore: bump the service worker to v30"
```

- [ ] **Passo 4: verificar no navegador — esta é a verificação que conta**

> **Quem faz:** este passo **não é do implementador** — ele não tem navegador nem a
> biblioteca do usuário no IndexedDB, e os itens abaixo pedem as músicas do songbook do
> Gil. O implementador vai até o Passo 3, commita e reporta. A verificação fica com quem
> coordena, que roda o que dá sem estado de usuário e entrega o resto ao usuário, dizendo
> **explicitamente** o que conferiu e o que não.

```bash
cd app && python3 -m http.server 8137
```

Em `http://localhost:8137`, com hard reload (o Service Worker é cache-first):

1. **A música que mais vaza.** *Bat Macumba* do songbook, miniaturas ligadas: nenhuma fileira rola de lado. É a que hoje vaza 200 px — 24% das fileiras.
2. **A da pendência.** *Banda Um*: idem, e o diagrama continua em cima da sílaba certa.
3. **O modo texto não mudou.** Desligar as miniaturas: a cifra volta exatamente ao que era, mesma quebra, mesmas linhas.
4. **Estreitar.** Arrastar a janela até largura de celular com as miniaturas ligadas: quebra mais, não vaza. Alargar de volta: volta ao que era.
5. **Zoom nos dois extremos.** 70% e 180%: sem vazamento em nenhum dos dois. O diagrama não escala com o zoom (é ícone, não texto) — isso é esperado.
6. **Acordes colados.** Uma música com dois acordes na mesma sílaba (`splitChordTok`): não trava, não some diagrama, e se alguma fileira ainda passar da caixa é a saída de emergência funcionando — anote qual música e qual linha.
7. **Cifra por imagem:** sem efeito nenhum, o item nem aparece no kebab.
8. **No tablet:** ler uma música inteira do songbook de ponta a ponta, com miniaturas, sem precisar rolar de lado uma vez.

- [ ] **Passo 5: registrar o que ficou por conferir**

Se algum item de 1 a 8 não pôde ser verificado, diga **qual** e **por quê**, em vez de dar a tarefa por concluída.

---

## Auto-revisão do plano

**Cobertura do spec.** `wrapBlock` com predicado, `peca()` extraída, o atalho do início e a ordem dos operandos → T1; `measureCifra` devolvendo px, `blockWidth` único, `cabe` e a passagem condicional → T2; bump do SW e a verificação → T3. As seções *O que não muda* e *Fora de escopo* não pedem código.

**Sem placeholder.** Todo passo traz o código ou o comando exato. O único `…` é o corpo de `peca()` no spec, e aqui ele está escrito por inteiro.

**Consistência de tipos.** `cabe` recebe **string** (o trecho de acordes já aparado) e devolve **boolean**, nos dois lados (T1, T2). `blockWidth(tok, isChord)` devolve **number** e é a mesma função no predicado e em `chordDiagRowHTML` (T2). `measureCifra()` devolve `{ cols, px }` — ambos number, `{cols:0, px:0}` em erro (T2).
