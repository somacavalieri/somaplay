# Formas CAGED no dicionário de acordes — design

**Data:** 2026-08-04
**Estado:** aprovado

## Problema

O dicionário tem uma forma só para os acordes maiores mais tocados: `C` é
`x32010`, `G` é `320003`, e ponto. Quem toca no braço inteiro sente falta das
outras posições do mesmo acorde — o sistema CAGED, que dá cinco maneiras de
tocar qualquer acorde maior, cada uma derivada de uma das cinco formas abertas
(C, A, G, E, D) deslocada pelo braço.

O usuário trouxe uma tabela de referência com as 25 formas (5 tônicas × 5
posições) e pediu que elas entrassem no dicionário.

## Escopo

**Dentro:** as cinco tônicas maiores da tabela — `C`, `A`, `G`, `E`, `D` — com
as cinco formas CAGED cada. A primeira forma de cada acorde (a aberta) já existe
no catálogo, então são **20 formas novas**.

**Fora:** menores, sétimas e as outras sete tônicas; geração por transposição;
qualquer badge, filtro ou tela nova de "CAGED". Se as maiores provarem valor, o
mesmo formato acomoda o resto depois.

## As 20 formas

Conferidas nota a nota contra as cordas soltas (E2 A2 D3 G3 B3 E4). Ordem dos
`frets`: `[Mi grave, Lá, Ré, Sol, Si, Mi agudo]`; `-1` é corda abafada. Na
coluna da pestana, os números das cordas são os índices `from`/`to` do campo
`barre`, contados de 0 (Mi grave) a 5 (Mi agudo) — "cordas 2–4" é Ré/Sol/Si.

| acorde | forma | frets | pestana |
|---|---|---|---|
| C | A | `-1, 3, 5, 5, 5, 3` | 3ª, cordas 1–5 |
| C | G | `8, 7, 5, 5, 5, -1` | 5ª, cordas 2–4 |
| C | E | `8, 10, 10, 9, 8, 8` | 8ª, cordas 0–5 |
| C | D | `-1, -1, 10, 12, 13, 12` | — |
| A | G | `5, 4, 2, 2, 2, -1` | 2ª, cordas 2–4 |
| A | E | `5, 7, 7, 6, 5, 5` | 5ª, cordas 0–5 |
| A | D | `-1, -1, 7, 9, 10, 9` | — |
| A | C | `-1, 12, 11, 9, 10, 9` | 9ª, cordas 3–5 |
| G | E | `3, 5, 5, 4, 3, 3` | 3ª, cordas 0–5 |
| G | D | `-1, -1, 5, 7, 8, 7` | — |
| G | C | `-1, 10, 9, 7, 8, 7` | 7ª, cordas 3–5 |
| G | A | `-1, 10, 12, 12, 12, 10` | 10ª, cordas 1–5 |
| E | D | `-1, -1, 2, 4, 5, 4` | — |
| E | C | `-1, 7, 6, 4, 5, 4` | 4ª, cordas 3–5 |
| E | A | `-1, 7, 9, 9, 9, 7` | 7ª, cordas 1–5 |
| E | G | `12, 11, 9, 9, 9, -1` | 9ª, cordas 2–4 |
| D | C | `-1, 5, 4, 2, 3, 2` | 2ª, cordas 3–5 |
| D | A | `-1, 5, 7, 7, 7, 5` | 5ª, cordas 1–5 |
| D | G | `10, 9, 7, 7, 7, -1` | 7ª, cordas 2–4 |
| D | E | `10, 12, 12, 11, 10, 10` | 10ª, cordas 0–5 |

Na forma G o Mi agudo fica abafado (a tabela de referência marca `×`), então a
pestana vai só até a corda Si — a pestana não passa por cima de corda abafada.

Nenhuma forma passa de quatro casas de extensão, que é a janela que o
`chordSVG` desenha (`FR = 4`).

## Decisões

### Nenhum campo novo

As formas entram no formato que `chords-catalog.js` já usa — `frets`, `barre`,
`label`. Não há campo `caged`, função de rótulo, chave de i18n nem mudança em
nenhum módulo de render. A alternativa (um campo `caged` lido em tempo de render
para montar "forma A · pestana 3ª" traduzido) foi descartada: custa três
arquivos a mais para uma diferença de texto.

### Rótulo curto: `label: 'forma A'`

O `label` diz só qual forma CAGED é. A casa não some: o `chordSVG` já imprime o
indicador (`3ª`, `10ª`) ao lado do diagrama, e repetir no rótulo estoura o
espaço da miniatura. É texto fixo em português, igual aos rótulos que o catálogo
já tem (`'simples'`, `'com 3ª e 7ª'`, `'baixo em Ré'`).

### A forma aberta de cada acorde fica intocada

A aberta é a forma C de Dó, a forma A de Lá, e assim por diante — mas ela também
é a padrão (★) de toda música que usa o acorde, e hoje o rótulo dela sai de
`descreveForma`, traduzido ("aberto" / "open"). Dar a ela um `label: 'forma C'`
fixo trocaria isso por português no app em inglês, num lugar muito visível. Fica
como está, e o diff continua puramente aditivo.

### Diff aditivo, índices preservados

`chords-catalog.js` avisa que o índice de cada forma vira o id persistido
`b:<nome>:<índice>`, referenciado por lápides, overrides do usuário e pelo
`varId` das digitações das músicas. As formas novas vão **no fim** do array de
cada nome; os índices 0 (`b:C:0`, `b:A:0`, `b:G:0`, `b:E:0`, `b:D:0`) continuam
apontando para as mesmas casas. Nada é reordenado nem removido.

### O padrão de cada acorde não muda

As formas novas não levam `default: true`, então `mergeShapes` continua elegendo
a aberta como padrão. **Nenhuma música existente renderiza diferente.** As formas
novas aparecem como opções a mais no popover da cifra, no picker de digitação e
no dicionário.

`labelsOf()` só recolhe `label` preenchido, então `suggestLabel` passa a evitar
os nomes novos ao sugerir rótulo para uma variação do usuário — comportamento
correto, sem efeito colateral.

### `sw.js`: `VERSION` de `v16` para `v17`

O service worker é cache-first **sem revalidação**: uma vez em cache, o arquivo
nunca é buscado de novo. Sem o bump, quem já instalou o app continuaria servindo
o `chords-catalog.js` velho para sempre e nunca veria as formas. O `SHELL` não
muda (nenhum módulo novo) — o bump é pela mudança de conteúdo.

## Verificação

Testes novos em `app/test/catalog.test.js`:

1. `C`, `A`, `G`, `E` e `D` têm cinco formas cada.
2. Os quatro rótulos CAGED esperados estão presentes em cada um.
3. `catalogDefault` de cada um continua devolvendo a forma aberta.
4. **Cada uma das 25 formas soa o acorde certo**: para cada forma, as notas
   produzidas (corda solta + casa, ignorando `-1`) formam exatamente o conjunto
   tônica/terça/quinta do acorde. É o teste que importa — protege contra um
   dígito trocado numa tabela grande digitada à mão.
5. Nenhuma forma passa de quatro casas de extensão (cabe no `chordSVG`).

Depois, `node --test` inteiro e verificação manual no navegador:

- Dicionário (Configurações → Dicionário de acordes): as cinco variações de cada
  acorde, com os diagramas certos e a aberta marcada ★.
- Popover de acorde numa música com C/G/D: as opções novas aparecem e podem ser
  escolhidas.
- **Indicador de casa com dois dígitos** (`10ª`, `13ª`) — inédito, o catálogo
  hoje não passa da 6ª. A margem em `diagLm` é fixa (12px na miniatura, 15px no
  diagrama grande); pelas contas cabe, mas só o navegador confirma.

## Riscos

**Um dígito errado numa das 20 formas** passa despercebido na tela (o diagrama
desenha qualquer coisa) e só aparece quando alguém toca. Mitigado pelo teste de
notas, que é a razão de ele existir.

**Cinco opções no picker** deixam a lista mais longa em cinco acordes muito
usados. É o efeito pretendido, mas vale olhar se o popover na música ainda cabe
bem no tablet.

## Descobertas da verificação no navegador

Implementado e verificado em 2026-08-05. Os dois riscos acima se resolveram, e a
verificação levantou um item novo.

**O indicador de casa de dois dígitos cabe.** Era o único desconhecido real:
`10ª` é o rótulo mais largo que o app já desenhou, e ele sai com a mesma margem
limpa dos de um dígito — sem corte na borda, sem invadir a grade, sem encostar na
miniatura vizinha. Vale tanto no dicionário quanto no picker do popover. `diagLm`
não precisa de ajuste.

**A tira de miniaturas perde a posição de rolagem a cada re-render.** No tablet
(1280×800) a tira mostra três cartões por vez e exige arrastar na horizontal para
chegar em `forma E` e `forma D` — isso é intencional: `.chord-pop.car .strip-wrap`
tem `overflow-x:auto`, `scroll-snap-type:x mandatory` e
`-webkit-overflow-scrolling:touch`, e `.pick-opt` tem `scroll-snap-align:center`.
É um carrossel de propósito, não um problema de tamanho. O defeito de verdade é
que essa rolagem some a cada re-render: `chordPopSelect` chama `update()`, que em
`main.js` troca `app.innerHTML` inteiro; `captureUI`/`restoreUI` só preservam o
`scrollTop` de elementos `.content-scroll` ou `[data-autoscroll]`, e a tira do
carrossel não tem nem uma coisa nem outra. Resultado: quem arrasta até `forma E` e
toca nela vê a tira saltar de volta pro cartão mais à esquerda, com a seleção que
acabou de fazer fora da tela. O mesmo acontece ao abrir o popover pela primeira
vez numa música que já usa a forma 3 ou 4: o cartão certo fica marcado, mas
invisível. Nada se perde nem aplica errado — a forma correta é gravada ao Aplicar
— é só um momento confuso. O conserto natural é restaurar o `scrollLeft` no
re-render, ou rolar o cartão selecionado para dentro da vista depois de renderizar;
`afterRenderPlay`, em `render/play.js`, já reposiciona o popover com o tamanho real
medido no DOM depois do render, então é o gancho natural para isso também. Encolher
os cartões para caber os cinco de uma vez deixaria essa rolagem-fantasma intacta —
não é o conserto certo. É anterior a esta mudança e pertence ao spec do próprio
popover (`docs/superpowers/specs/2026-07-29-popover-de-acorde-na-cifra-design.md`);
fica adiado de propósito.
