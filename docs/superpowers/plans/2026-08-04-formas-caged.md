# Formas CAGED no dicionário — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** acrescentar as quatro posições CAGED que faltam a cada um dos acordes `C`, `A`, `G`, `E` e `D` do dicionário — 20 formas novas.

**Architecture:** mudança de dados, não de código. As formas entram no fim do array de cada nome em `app/js/chords-catalog.js`, no formato que o arquivo já usa (`frets`, `barre`, `label`). Nenhum módulo novo, nenhuma função nova, nada em render, i18n ou banco. A rede de segurança é um teste que confere as **notas** de cada forma contra a tríade maior do acorde — é ele que pega um dígito trocado numa tabela de 20 linhas digitada à mão.

**Tech Stack:** JavaScript ES modules puro, sem build e sem dependências. Testes com `node --test` (Node >= 20). Spec: [`docs/superpowers/specs/2026-08-04-formas-caged-design.md`](../specs/2026-08-04-formas-caged-design.md).

## Global Constraints

- **Só ACRESCENTAR ao FIM do array de cada nome.** Nunca reordenar, nunca remover, nunca inserir no meio. O índice de cada forma vira o id persistido `b:<nome>:<índice>`, gravado em lápides, overrides do usuário e no `varId` das digitações das músicas. Os índices 0 (`b:C:0`, `b:A:0`, `b:G:0`, `b:E:0`, `b:D:0`) têm que continuar apontando para as mesmas casas.
- **A forma aberta (índice 0) de cada acorde fica intocada.** Não ganha `label`, não perde `default: true`.
- **Nenhuma forma nova leva `default: true`.** O padrão de cada acorde continua sendo a aberta; nenhuma música existente pode renderizar diferente.
- **Nenhum campo novo no objeto forma.** Só `frets`, `barre` e `label` — os que o catálogo já usa.
- **Não tocar** em `chordbook.js`, `chords.js`, nos módulos de `js/render/`, nem nas tabelas de i18n.
- **Escopo:** só as tônicas maiores `C`, `A`, `G`, `E`, `D`. Nada de menores, sétimas ou outras tônicas.
- Ordem dos `frets`: `[Mi grave, Lá, Ré, Sol, Si, Mi agudo]`. `-1` = corda abafada, `0` = corda solta.
- Índices de `barre.from` / `barre.to` contam de 0 (Mi grave) a 5 (Mi agudo).
- Rodar os testes de dentro de `app/`: `cd app && node --test`.
- **Os números de linha de `chords-catalog.js` citados nas tarefas são do arquivo original.** Cada tarefa acrescenta quatro linhas e empurra o resto para baixo — localize a entrada pela chave (`'A':`, `'G':`, …), não pelo número.

## Arquivos

| arquivo | responsabilidade | tarefas |
|---|---|---|
| `app/test/catalog.test.js` | helper de notas + todos os testes CAGED | 1–7 |
| `app/js/chords-catalog.js` | as 20 formas, nos arrays de C/A/G/E/D | 2–6 |
| `app/sw.js` (linha 2) | bump do `VERSION` para entregar o catálogo novo | 7 |

---

### Task 1: Rede de segurança — conferir as notas de uma forma

O teste que protege as cinco tarefas seguintes. Traduz cada forma nas classes de altura que ela produz e compara com a tríade maior do acorde. Nesta tarefa ele roda sobre o catálogo atual (as cinco formas abertas) e passa; a partir da Task 2 ele é o que denuncia um dígito errado.

**Files:**
- Modify: `app/test/catalog.test.js` (acrescentar no fim do arquivo)

**Interfaces:**
- Consumes: `catalogShapes(name)` de `../js/chords-catalog.js` — já importado na linha 3 do arquivo de teste.
- Produces: `notasDaForma(forma)` → `number[]` ordenado, classes de altura (0–11, C = 0) sem repetição; `triadeMaior(nome)` → `number[]` ordenado com tônica, terça maior e quinta; `CAGED` → `['C', 'A', 'G', 'E', 'D']`. Todos locais ao arquivo de teste, usados pelas Tasks 2–7.

- [ ] **Step 1: Escrever os testes que falham (só os testes, sem o helper)**

Acrescentar no fim de `app/test/catalog.test.js`. **Não escreva ainda o corpo de `notasDaForma`** — os testes têm que falhar primeiro:

```js
// ---------- formas CAGED ----------
// Rede de segurança: uma forma é uma lista de casas, e um dígito trocado desenha
// um diagrama perfeitamente plausível que soa errado. Estes testes leem as notas.

test('notasDaForma lê o C aberto como dó–mi–sol', () => {
  assert.deepEqual(notasDaForma({ frets: [-1, 3, 2, 0, 1, 0] }), [0, 4, 7]);
});

test('notasDaForma denuncia um dígito trocado', () => {
  // C aberto com a corda Lá uma casa acima: entra dó# no lugar do dó.
  assert.deepEqual(notasDaForma({ frets: [-1, 4, 2, 0, 1, 0] }), [0, 1, 4, 7]);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && node --test test/catalog.test.js`
Expected: FAIL nos dois testes novos — `ReferenceError: notasDaForma is not defined`

- [ ] **Step 3: Escrever o helper**

Acrescentar **acima** dos dois testes, logo depois do comentário `// ---------- formas CAGED ----------`:

```js
const CAGED = ['C', 'A', 'G', 'E', 'D'];

// Semitons das cordas soltas, com C = 0: Mi Lá Ré Sol Si Mi.
const SOLTAS = [4, 9, 2, 7, 11, 4];
const PC = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

// Classes de altura que a forma produz, sem repetição e ordenadas. Corda
// abafada (-1) sai fora; corda solta (0) entra como a nota da própria corda.
function notasDaForma(forma) {
  const ns = forma.frets
    .map((f, i) => (f < 0 ? null : (SOLTAS[i] + f) % 12))
    .filter((n) => n !== null);
  return [...new Set(ns)].sort((a, b) => a - b);
}

// Tônica, terça maior e quinta justa.
function triadeMaior(nome) {
  const r = PC[nome];
  return [r, (r + 4) % 12, (r + 7) % 12].sort((a, b) => a - b);
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd app && node --test test/catalog.test.js`
Expected: PASS, os dois testes novos.

- [ ] **Step 5: Acrescentar a rede de segurança sobre o catálogo**

Acrescentar no fim do arquivo:

```js
test('toda forma de C, A, G, E e D soa a tríade maior certa', () => {
  for (const nome of CAGED) {
    for (const f of catalogShapes(nome)) {
      assert.deepEqual(
        notasDaForma(f), triadeMaior(nome),
        `${nome} / ${f.label || 'aberta'}: notas erradas em [${f.frets.join(', ')}]`
      );
    }
  }
});
```

- [ ] **Step 6: Rodar e ver passar**

Run: `cd app && node --test test/catalog.test.js`
Expected: PASS, 3 testes novos no total. Este último passa sobre as cinco formas abertas que já existem — é essa a linha de base a partir da qual as Tasks 2–6 trabalham.

- [ ] **Step 7: Commit**

```bash
git add app/test/catalog.test.js
git commit -m "test: check a chord shape against the notes it sounds"
```

---

### Task 2: As quatro formas de C

**Files:**
- Modify: `app/js/chords-catalog.js:17`
- Modify: `app/test/catalog.test.js` (acrescentar no fim)

**Interfaces:**
- Consumes: `CAGED`, `notasDaForma`, `triadeMaior` da Task 1; `catalogShapes` e `catalogDefault` de `../js/chords-catalog.js`.
- Produces: nada que outra tarefa consuma.

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar no fim de `app/test/catalog.test.js`:

```js
test('C tem as cinco formas CAGED', () => {
  const l = catalogShapes('C');
  assert.equal(l.length, 5);
  assert.deepEqual(l.slice(1).map((s) => s.label), ['forma A', 'forma G', 'forma E', 'forma D']);
});

test('C: a forma aberta continua a padrão', () => {
  assert.deepEqual(catalogDefault('C').frets, [-1, 3, 2, 0, 1, 0]);
  assert.equal(catalogShapes('C').filter((s) => s.default).length, 1);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && node --test test/catalog.test.js`
Expected: FAIL — `Expected values to be strictly equal: 1 !== 5`

- [ ] **Step 3: Acrescentar as formas**

Em `app/js/chords-catalog.js`, trocar a linha 17:

```js
  'C':    [{ frets: [-1, 3, 2, 0, 1, 0], default: true }],
```

por:

```js
  'C':    [{ frets: [-1, 3, 2, 0, 1, 0], default: true },
           { frets: [-1, 3, 5, 5, 5, 3],     barre: { fret: 3, from: 1, to: 5 }, label: 'forma A' },
           { frets: [8, 7, 5, 5, 5, -1],     barre: { fret: 5, from: 2, to: 4 }, label: 'forma G' },
           { frets: [8, 10, 10, 9, 8, 8],    barre: { fret: 8, from: 0, to: 5 }, label: 'forma E' },
           { frets: [-1, -1, 10, 12, 13, 12],                                    label: 'forma D' }],
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd app && node --test test/catalog.test.js`
Expected: PASS. O teste de notas da Task 1 agora cobre as quatro formas novas — se alguma casa saiu errada na digitação, ele acusa com o nome da forma e os frets.

- [ ] **Step 5: Commit**

```bash
git add app/js/chords-catalog.js app/test/catalog.test.js
git commit -m "feat: add the four missing CAGED shapes for C"
```

---

### Task 3: As quatro formas de A

**Files:**
- Modify: `app/js/chords-catalog.js:41`
- Modify: `app/test/catalog.test.js` (acrescentar no fim)

**Interfaces:**
- Consumes: `CAGED`, `notasDaForma`, `triadeMaior` da Task 1; `catalogShapes` e `catalogDefault`.
- Produces: nada que outra tarefa consuma.

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar no fim de `app/test/catalog.test.js`:

```js
test('A tem as cinco formas CAGED', () => {
  const l = catalogShapes('A');
  assert.equal(l.length, 5);
  assert.deepEqual(l.slice(1).map((s) => s.label), ['forma G', 'forma E', 'forma D', 'forma C']);
});

test('A: a forma aberta continua a padrão', () => {
  assert.deepEqual(catalogDefault('A').frets, [-1, 0, 2, 2, 2, 0]);
  assert.equal(catalogShapes('A').filter((s) => s.default).length, 1);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && node --test test/catalog.test.js`
Expected: FAIL — `Expected values to be strictly equal: 1 !== 5`

- [ ] **Step 3: Acrescentar as formas**

Em `app/js/chords-catalog.js`, trocar a linha 41:

```js
  'A':    [{ frets: [-1, 0, 2, 2, 2, 0], default: true }],
```

por:

```js
  'A':    [{ frets: [-1, 0, 2, 2, 2, 0], default: true },
           { frets: [5, 4, 2, 2, 2, -1],     barre: { fret: 2, from: 2, to: 4 }, label: 'forma G' },
           { frets: [5, 7, 7, 6, 5, 5],      barre: { fret: 5, from: 0, to: 5 }, label: 'forma E' },
           { frets: [-1, -1, 7, 9, 10, 9],                                       label: 'forma D' },
           { frets: [-1, 12, 11, 9, 10, 9],  barre: { fret: 9, from: 3, to: 5 }, label: 'forma C' }],
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd app && node --test test/catalog.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/js/chords-catalog.js app/test/catalog.test.js
git commit -m "feat: add the four missing CAGED shapes for A"
```

---

### Task 4: As quatro formas de G

**Files:**
- Modify: `app/js/chords-catalog.js:33`
- Modify: `app/test/catalog.test.js` (acrescentar no fim)

**Interfaces:**
- Consumes: `CAGED`, `notasDaForma`, `triadeMaior` da Task 1; `catalogShapes` e `catalogDefault`.
- Produces: nada que outra tarefa consuma.

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar no fim de `app/test/catalog.test.js`:

```js
test('G tem as cinco formas CAGED', () => {
  const l = catalogShapes('G');
  assert.equal(l.length, 5);
  assert.deepEqual(l.slice(1).map((s) => s.label), ['forma E', 'forma D', 'forma C', 'forma A']);
});

test('G: a forma aberta continua a padrão', () => {
  assert.deepEqual(catalogDefault('G').frets, [3, 2, 0, 0, 0, 3]);
  assert.equal(catalogShapes('G').filter((s) => s.default).length, 1);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && node --test test/catalog.test.js`
Expected: FAIL — `Expected values to be strictly equal: 1 !== 5`

- [ ] **Step 3: Acrescentar as formas**

Em `app/js/chords-catalog.js`, trocar a linha 33:

```js
  'G':    [{ frets: [3, 2, 0, 0, 0, 3], default: true }],
```

por:

```js
  'G':    [{ frets: [3, 2, 0, 0, 0, 3], default: true },
           { frets: [3, 5, 5, 4, 3, 3],     barre: { fret: 3, from: 0, to: 5 },  label: 'forma E' },
           { frets: [-1, -1, 5, 7, 8, 7],                                        label: 'forma D' },
           { frets: [-1, 10, 9, 7, 8, 7],   barre: { fret: 7, from: 3, to: 5 },  label: 'forma C' },
           { frets: [-1, 10, 12, 12, 12, 10], barre: { fret: 10, from: 1, to: 5 }, label: 'forma A' }],
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd app && node --test test/catalog.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/js/chords-catalog.js app/test/catalog.test.js
git commit -m "feat: add the four missing CAGED shapes for G"
```

---

### Task 5: As quatro formas de E

**Files:**
- Modify: `app/js/chords-catalog.js:25`
- Modify: `app/test/catalog.test.js` (acrescentar no fim)

**Interfaces:**
- Consumes: `CAGED`, `notasDaForma`, `triadeMaior` da Task 1; `catalogShapes` e `catalogDefault`.
- Produces: nada que outra tarefa consuma.

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar no fim de `app/test/catalog.test.js`:

```js
test('E tem as cinco formas CAGED', () => {
  const l = catalogShapes('E');
  assert.equal(l.length, 5);
  assert.deepEqual(l.slice(1).map((s) => s.label), ['forma D', 'forma C', 'forma A', 'forma G']);
});

test('E: a forma aberta continua a padrão', () => {
  assert.deepEqual(catalogDefault('E').frets, [0, 2, 2, 1, 0, 0]);
  assert.equal(catalogShapes('E').filter((s) => s.default).length, 1);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && node --test test/catalog.test.js`
Expected: FAIL — `Expected values to be strictly equal: 1 !== 5`

- [ ] **Step 3: Acrescentar as formas**

Em `app/js/chords-catalog.js`, trocar a linha 25:

```js
  'E':    [{ frets: [0, 2, 2, 1, 0, 0], default: true }],
```

por:

```js
  'E':    [{ frets: [0, 2, 2, 1, 0, 0], default: true },
           { frets: [-1, -1, 2, 4, 5, 4],                                       label: 'forma D' },
           { frets: [-1, 7, 6, 4, 5, 4],    barre: { fret: 4, from: 3, to: 5 }, label: 'forma C' },
           { frets: [-1, 7, 9, 9, 9, 7],    barre: { fret: 7, from: 1, to: 5 }, label: 'forma A' },
           { frets: [12, 11, 9, 9, 9, -1],  barre: { fret: 9, from: 2, to: 4 }, label: 'forma G' }],
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd app && node --test test/catalog.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/js/chords-catalog.js app/test/catalog.test.js
git commit -m "feat: add the four missing CAGED shapes for E"
```

---

### Task 6: As quatro formas de D

**Files:**
- Modify: `app/js/chords-catalog.js:20`
- Modify: `app/test/catalog.test.js` (acrescentar no fim)

**Interfaces:**
- Consumes: `CAGED`, `notasDaForma`, `triadeMaior` da Task 1; `catalogShapes` e `catalogDefault`.
- Produces: nada que outra tarefa consuma.

- [ ] **Step 1: Escrever os testes que falham**

Acrescentar no fim de `app/test/catalog.test.js`:

```js
test('D tem as cinco formas CAGED', () => {
  const l = catalogShapes('D');
  assert.equal(l.length, 5);
  assert.deepEqual(l.slice(1).map((s) => s.label), ['forma C', 'forma A', 'forma G', 'forma E']);
});

test('D: a forma aberta continua a padrão', () => {
  assert.deepEqual(catalogDefault('D').frets, [-1, -1, 0, 2, 3, 2]);
  assert.equal(catalogShapes('D').filter((s) => s.default).length, 1);
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && node --test test/catalog.test.js`
Expected: FAIL — `Expected values to be strictly equal: 1 !== 5`

- [ ] **Step 3: Acrescentar as formas**

Em `app/js/chords-catalog.js`, trocar a linha 20:

```js
  'D':    [{ frets: [-1, -1, 0, 2, 3, 2], default: true }],
```

por:

```js
  'D':    [{ frets: [-1, -1, 0, 2, 3, 2], default: true },
           { frets: [-1, 5, 4, 2, 3, 2],       barre: { fret: 2, from: 3, to: 5 },  label: 'forma C' },
           { frets: [-1, 5, 7, 7, 7, 5],       barre: { fret: 5, from: 1, to: 5 },  label: 'forma A' },
           { frets: [10, 9, 7, 7, 7, -1],      barre: { fret: 7, from: 2, to: 4 },  label: 'forma G' },
           { frets: [10, 12, 12, 11, 10, 10],  barre: { fret: 10, from: 0, to: 5 }, label: 'forma E' }],
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd app && node --test test/catalog.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/js/chords-catalog.js app/test/catalog.test.js
git commit -m "feat: add the four missing CAGED shapes for D"
```

---

### Task 7: Cabem no diagrama, e o service worker entrega

Duas coisas que só fazem sentido com as 20 formas no lugar: o teste de que nenhuma estoura a janela de quatro casas que o `chordSVG` desenha, e o bump do `VERSION` — sem ele, quem já instalou o app nunca recebe o catálogo novo.

**Files:**
- Modify: `app/test/catalog.test.js` (acrescentar no fim)
- Modify: `app/sw.js:2`

**Interfaces:**
- Consumes: `CAGED` da Task 1; `catalogShapes`.
- Produces: nada.

- [ ] **Step 1: Escrever o teste que falha**

`chordSVG` desenha `FR = 4` linhas de casa. Quando a forma passa da 4ª casa, ele ancora a janela na casa mais baixa (`base = minPos`) e desenha a casa `f` na linha `f - base + 1`. Uma forma cujas casas se espalham por mais de quatro tem dedos que caem fora do desenho, sem aviso nenhum. Acrescentar no fim de `app/test/catalog.test.js`:

```js
test('nenhuma forma CAGED estoura a janela de 4 casas do diagrama', () => {
  for (const nome of CAGED) {
    for (const f of catalogShapes(nome)) {
      const pos = f.frets.filter((x) => x > 0);
      if (!pos.length) continue;
      const casas = Math.max(...pos) - Math.min(...pos) + 1;
      assert.ok(casas <= 4, `${nome} / ${f.label || 'aberta'}: ${casas} casas em [${f.frets.join(', ')}]`);
    }
  }
});
```

- [ ] **Step 2: Rodar e ver passar**

Run: `cd app && node --test test/catalog.test.js`
Expected: PASS. Este é um teste de invariante, não de comportamento novo — ele já passa se as Tasks 2–6 foram feitas certo. Se falhar, a forma acusada tem um dígito errado que o teste de notas deixou passar (dá para trocar duas casas e manter a tríade).

- [ ] **Step 3: Bump do `VERSION` no service worker**

O `sw.js` é cache-first **sem revalidação**: uma vez no cache, o arquivo nunca é buscado de novo. Sem o bump, quem já instalou o app continua servindo o `chords-catalog.js` velho para sempre e nunca vê as formas novas. O `SHELL` não muda — nenhum módulo novo.

Em `app/sw.js`, linha 2, trocar:

```js
const VERSION = 'somaplay-v16';
```

por:

```js
const VERSION = 'somaplay-v17';
```

- [ ] **Step 4: Rodar a suíte inteira**

Run: `cd app && node --test`
Expected: PASS, tudo. Confirmar em especial que `test/pickershapes.test.js`, `test/chordrow.test.js` e `test/chordbook.test.js` continuam verdes — `pickerShapes('C', …)` e `chordDiagWidth('C', …)` agora enxergam cinco formas onde antes havia uma.

- [ ] **Step 5: Commit**

```bash
git add app/test/catalog.test.js app/sw.js
git commit -m "feat: ship the CAGED shapes to installed clients"
```

- [ ] **Step 6: Verificação manual no navegador**

Não há harness de DOM neste projeto — esta etapa é a que conta, e nenhuma das anteriores a substitui.

```bash
cd app && python3 -m http.server 8137
```

Abrir <http://localhost:8137>. Como o service worker é cache-first, **forçar a atualização**: DevTools → Application → Service Workers → Update, depois recarregar. (Ou marcar "Update on reload".) Sem isso você vê a versão velha e conclui errado.

Conferir, nesta ordem:

1. **Configurações → Dicionário de acordes**, filtro na letra `C`: o acorde `C` mostra cinco miniaturas, a primeira marcada ★, as outras rotuladas `forma A`, `forma G`, `forma E`, `forma D`. Repetir em `A`, `G`, `E` e `D`.
2. **Indicador de casa de dois dígitos** — é o que nunca apareceu no app: o catálogo hoje não passa da 6ª. Olhar `forma D` de `C` (`10ª`) e `forma A` de `G` (`10ª`): o número tem que caber à esquerda do diagrama, sem cortar nem invadir a grade. Se estourar, é `diagLm` em `app/js/chords.js:148` que precisa de mais margem — anotar e tratar como trabalho separado.
3. **Numa música com C/G/D**, tocar num acorde da cifra: o popover abre com as cinco opções; escolher a `forma E` e ver o diagrama da música mudar. A miniatura que abre por padrão continua sendo a aberta.
4. **Cinco opções no popover** ainda cabem bem na tela do tablet? É o único efeito colateral de UI da mudança.

- [ ] **Step 7: Marcar as tarefas do spec como feitas**

Se tudo passou, o spec [`docs/superpowers/specs/2026-08-04-formas-caged-design.md`](../specs/2026-08-04-formas-caged-design.md) está inteiramente implementado. Nada a mudar nele — a menos que a verificação do passo 6 tenha revelado algo (indicador de casa estourando, popover apertado), que deve virar uma seção nova de "descobertas" no spec.

```bash
git add docs/superpowers/
git commit -m "docs: record what the browser verification found"
```

(Pular este commit se não houve descoberta nenhuma.)
