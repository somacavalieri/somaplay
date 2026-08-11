# Plano — lote 1 do catálogo (os elementares)

Spec: `docs/superpowers/specs/2026-08-11-catalogo-completo-design.md`

Alvo: **167 nomes, 2.376 usos** — tríades, sétimas, sétimas maiores, sus/add9/6. Depois de
unificar sinônimos e enarmonia, são **99 formas** a gerar.

Cada passo termina com `cd app && node --test` verde.

## 1. Harness de regressão (antes de qualquer forma nova)

É o trilho da spec, e tem de existir **antes** do primeiro lote, senão não há linha de base.

Script no scratchpad, alimentado pelo backup real
(`bkp/somaplay-backup-2026-08-10 (1).somaplay`):

- carrega os 308 registros de dicionário do usuário em `BOOK` (via `loadChordbook` não dá —
  não há IndexedDB em Node; usar `mergeShapes(builtinsResolvidos(nome), registro)` direto);
- para **todo nome de acorde usado no acervo**, grava `defaultShape(nome).frets`;
- guarda o resultado como linha de base em `/tmp/_baseline.json`.

Depois de cada mudança, recalcular e **comparar**. Qualquer diferença reprova.

Cobrir também as **1.055 digitações por música**: para cada `(música, acorde)` com digitação
gravada, o que o app desenha é `dict[nome]`, e o teste tem de mostrar que esse valor não
depende do catálogo.

## 2. Sinônimos que faltam unificar

`7+` é o mesmo que `7M` e que `maj7`; `4` é `sus4`; `9` é `add9`. Hoje não estão unificados,
e por isso `C7+` (82 usos) conta como faltante embora o catálogo tenha `C7M`.

Acrescentar esses pares ao `nomesDeBusca` — **não** ao `canonico`, pela mesma razão do
PR #12: mexer no canônico muda o que aparece na tela de quem usa notação brasileira.

Testes: `nomesDeBusca('C7+')` inclui `'C7M'`; `'Dmaj7'` inclui `'D7M'`; `'A4'` inclui
`'A(4)'` e `'Asus4'`; `'G9'` inclui `'G(9)'` e `'Gadd9'`.

Aferição esperada: **5 nomes, 269 usos** passam a resolver sem nenhuma forma nova
(`C7+`, `F7+`, `G7+`, `Bb7+`, `Bbmaj7`). Rodar o harness: **zero** mudanças.

## 3. Gerador de formas (scratchpad, não vai para o app)

Três partes, cada uma testável isolada:

**Parser do nome** → `{ fundamental, terça, quinta, sétima, extensões, baixo }`. Gramática
explícita e pequena, cobrindo só o que o lote 1 tem: tríade maior/menor, `7`, `7M`, `6`,
`m6`, `m7`, `m7M`, `(4)`, `(9)`, `m9`. Nada de tentar ser geral — a cauda é o lote 3.

**Conjunto de notas** que o nome exige, em classes de altura.

**Busca de digitação**: varre combinações numa janela de 4 casas e escolhe por critério
explícito, nesta ordem:
1. todas as notas exigidas presentes, e nenhuma nota estranha;
2. fundamental (ou o baixo escrito) na corda mais grave tocada;
3. sem corda muda no meio das tocadas;
4. menor casa possível, depois menos cordas mudas, depois menos dedos.

**A conferência é a mesma dos diminutos** e roda sobre 100% do lote antes de commitar.

## 4. Gerar e conferir as 99 formas

- rodar o gerador sobre a lista canônica;
- **conferir por notas** todas as 99 (falha bloqueia);
- **conferir à mão as 12 mais usadas** (`F#m7`, `F#7`, `Cm7`, `F7`, `Fm7`, `A7M`, `D7M`,
  `A#7`, `Fm`, `G#`, `D#`, `C#`) contra uma referência — é onde erro de gramática apareceria;
- rodar o harness: **zero** mudanças em desenho existente.

## 5. Commitar no catálogo

Só nomes que **hoje não resolvem para nada** — a garantia da spec. Nenhuma variação nova em
nome que já tem forma. Todos com `default: true`, já que são entradas novas.

Bloco próprio no `chords-catalog.js`, comentado com a origem (gerado + conferido por notas) e
a data.

## 6. Aferir e publicar

- cobertura do acervo antes/depois: nomes e **usos**;
- alvo: usos cobertos passam de ~52% para ~70%;
- nenhum nome perde forma;
- `sw.js`: `VERSION` de `somaplay-v26` para `v27`;
- PR, deploy, e conferir no ar com `curl` como nos PRs #10-12.

## 7. Verificação no navegador

Abrir três músicas de estilos diferentes e conferir os diagramas dos acordes mais usados.
Sugestão: uma do songbook (que tem digitação própria — não pode ter mudado nada), uma do
CifraClub e uma do acervo VJ.

## Depois

Lote 2 (baixo invertido, 350 nomes / 1.249 usos) e lote 3 (cauda com extensão, 886 / 2.631).
