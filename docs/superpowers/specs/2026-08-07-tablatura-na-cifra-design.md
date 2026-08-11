# Soma_play — Tablatura na cifra em texto — design

**Data:** 2026-08-07 · **Estado:** implementado e verificado (A/B no acervo + navegador headless; ver "Verificação" para o que ficou por conferir no aparelho)
**Origem:** defeito relatado — a tab de "Força Estranha" (Caetano Veloso) quebra cada
corda em duas linhas. As seis cordas viram doze, o bloco dobra de altura e a grade
some.

Este design **revoga** a decisão registrada em
`2026-07-30-reconhecimento-de-linha-de-acordes-design.md` §"Ainda fora do
reconhecimento", que deixava linha de tablatura como texto de propósito.

**Revisto em 2026-08-11.** Entre a escrita deste design e a implementação entrou o
reflow do par acorde/letra (`fbf95a8`, spec `2026-08-10-reflow-da-cifra-texto-design.md`).
Ele mudou a mecânica do defeito sem consertá-lo — ver "Como o reflow mudou o defeito"
abaixo.

## Causa raiz

As linhas de tab do CifraClub vêm com largura fixa — em "Força Estranha", **55
colunas**:

```
E|-0---0----------0-----------------------------------|
```

Três coisas se somam:

1. `isChordLine` não reconhece a linha (`E|-0---…` não é acorde nem marca), então
   `parseCifraText` a joga no ramo `lyric`.
2. `.cifra-text .ly` é `white-space:pre-wrap` — quebra.
3. `.cifra-text` é `max-width:720px`.

Cabem `720 / (0,6 × fontPx)` colunas, porque o avanço da JetBrains Mono é 0,6em.
Com o zoom em 110% (`fontPx = 22`) cabem **54** colunas e a 55ª — o `|` de
fechamento — desce sozinha. Em 100% caberiam 60 e nada quebraria: por isso o
defeito só aparece com zoom ou em tela estreita, e por isso passou despercebido.

### Como o reflow mudou o defeito (2026-08-11)

`fbf95a8` trocou `.ly` de `pre-wrap` para `pre` e pôs `overflow-x:auto` na
`.cifra-text`, então a quebra por CSS descrita acima **não acontece mais**. No lugar
dela, `cifraTextHTML` passa toda linha por `wrapBlock` — inclusive as que só têm
letra, que é o caso da tab. E como tab não tem espaço nenhum, não existe coluna
válida de corte e o `wrapBlock` corta na largura medida:

```
wrapBlock('', 'E|-0---0----------0-----------------------------------|', 54)
  → [0] E|-0---0----------0-----------------------------------|   (54 col)
    [1] |                                                          (1 col)
```

Mesmo sintoma, mecanismo novo: o `|` de fechamento continua descendo sozinho e o
bloco continua dobrando de altura. A correção também muda de lugar — em vez de mexer
no `white-space`, o bloco de tab tem de **sair do `wrapBlock`**.

### Reflow e encolher não se contradizem

O spec do reflow descarta "encolher a fonte até caber" porque, para a cifra inteira,
a linha mais larga da música passaria a ditar o tamanho de todas — num songbook de 90
colunas a fonte fica ilegível. A objeção é correta e continua valendo.

A regra aqui é outra porque o conteúdo é outro. **Par acorde/letra reflui; tab
encolhe.** Cortar um par acorde/letra na coluna 54 e continuar embaixo é legível — é
o que uma cifra impressa faz. Cortar uma tab na coluna 54 e empilhar o resto não é
uma tab quebrada em duas: é uma tab destruída, porque a leitura depende de ver as
seis cordas em paralelo, e metade delas passa a estar noutro sistema. Tab não reflui,
então só resta encolher — e o custo do encolhimento é limitado, porque ele vale só
para o bloco, não para a música.

**Achado secundário:** a `jbmono-latin.woff2` embutida traz `liga` e `calt`, ativos
por padrão no navegador. É o que faz `|-` sair como `├─` em vez do `|` limpo.
Ligadura de programação não tem serventia nenhuma numa cifra.

## A regra

Tablatura **não é letra e não é linha de acordes**: é grade de largura fixa, onde a
coluna carrega a informação. Quebrar destrói a grade. Ela ganha um tipo próprio de
linha no parser e um tratamento próprio no render.

### Linha de tablatura — o que conta

```
E|-0---0----------0---|      E|--0--2--3--|      |---3---|      A|-0--------|
```

Duas condições, as duas obrigatórias:

- **Só o alfabeto de tab**: nome de corda opcional (`[A-Ga-g]` + `#b` opcional),
  barra ou dois-pontos, e daí em diante apenas `-`, dígitos, `|`, `:`, espaço, os
  símbolos de técnica (`h p b s r t v x`) e ornamento (`~ ^ * . + ( ) < > \ /`).
- **Traço domina a linha**: pelo menos 3 traços e pelo menos 30% dos caracteres.

Letra maiúscula fora do nome da corda derruba o casamento — é o que mantém `C ---- G`
como linha de acordes, e `Ela disse: ------` como letra.

A proporção existe no lugar de uma corrida mínima de traços porque tab curta tem
corridas curtas: `E|--0--2--3--|` não tem nenhum `---`, e uma regra de corrida a
deixaria de fora. Proporção pega as duas. E é ela que separa a pauta de tab de um
token que só *parece* tab: `0221xx` (digitação inline, já tratada como marca) não
tem traço nenhum.

O piso é 30% e não mais alto porque tab densa de técnica é pouco tracejada:
`G|--5h7p5--7b9--5/7--|` tem 8 traços em 22 caracteres — 36%. Um piso de 40%
rejeitaria uma pauta legítima.

Linha de técnica desconhecida cai no comportamento de hoje (vira letra e quebra).
É degradação aceitável: conserta-se ampliando o alfabeto quando aparecer.

### Âncora e corrida — o que o A/B obrigou a mudar (2026-08-11)

A regra acima decide **por linha**, e o A/B contra o acervo mostrou que ela não pode:
**uma linha só de traços é indistinguível de uma corda muda.** `-----------------` é
divisor decorativo de seção numa música e é a corda Mi grave calada na outra. Nenhuma
inspeção da linha isolada separa as duas.

O A/B (199 `.somaplay`, 5.733 cifras, 393.892 linhas) promoveu 12.002 linhas a tab, com
**40 falso positivo em 21 músicas**: 27 divisores decorativos, 11 linhas de diagrama de
acorde ASCII (`+-+-+-+-+-+`), 1 marcador de repetição (`<---`) e — o único de custo
real — `          D ------` em "Tô um Lixo", que é linha de acordes e perderia a cor de
acento e o toque.

Duas correções foram testadas contra as 12.002 linhas e **descartadas por derrubarem
tab legítima**:

- **Exigir a barra `|` ou `:`** — derruba 408 linhas. O acervo tem tab sem barra
  nenhuma: `E---------------12-10---------`.
- **Exigir o rótulo de corda grudado no corpo** — derruba 354. O acervo tem rótulo
  separado por espaço (`E |--------0-|`) e tem bloco sem rótulo nenhum
  (`-9-9----9-9-----9-----9---`).

Também foi considerada e rejeitada a inversão de ordem — testar `isChordLine` antes de
`isTabLine`. `isChordTok` aceita `-` e dígito depois da nota, então
`E---------12-10---` casa como acorde, e centenas de linhas de tab legítima voltariam a
ser linha de acordes.

**A regra que fica: âncora por linha, decisão por corrida.**

Uma linha de tab é **âncora** quando se decide sozinha:

- tem **rótulo de corda seguido de barra**, com ou sem espaço — `E|`, `E |`, `e:`; ou
- tem **rótulo de corda grudado num traço** — `E-------`; ou
- contém **algum dígito** de casa **e não é linha de acordes**.

A ressalva da terceira forma saiu da revisão final, e é estreita de propósito. Sem ela,
o dígito da *extensão* do acorde vira âncora e o acorde some da grade "Acordes desta
música":

```
D  ------    → linha de acordes, extractChords = ["D"]     (o `m` de Am7 já barrava
Am7 -------- → linha de acordes, extractChords = ["Am7"]    esse caso por acaso)
D7 ------    → sem a ressalva: bloco de tab, extractChords = []
A7 -------   → sem a ressalva: bloco de tab, extractChords = []
```

A ressalva vale **só** para a forma por dígito. As duas formas por rótulo continuam
incondicionais, e têm de continuar: `E---------12-10---------` é tab legítima e
**também** casa em `isChordTok` (que aceita `-` e dígito depois da nota). Se a guarda
valesse para elas, centenas de linhas de tab do acervo voltariam a ser linha de acordes
— é a mesma razão pela qual inverter a ordem de `isChordLine` e `isTabLine` foi
rejeitado acima.

Uma linha que passa no alfabeto e na proporção mas não é âncora é **ambígua**. Ambígua
só entra no bloco quando a corrida a que ela pertence tem **pelo menos uma âncora**.
Corrida sem âncora nenhuma não é tablatura: é divisor, diagrama ou marcador, e segue
como letra.

A medição justifica o desenho: **11.786 das 12.002 linhas (98,2%) são âncora** e se
decidem sozinhas. Só **216 (1,8%)** dependem da vizinhança — e é nesse resto que os 40
falso positivo moram, todos em corrida sem âncora.

### Bloco de tablatura

**Linhas de tab consecutivas formam um bloco único.** As seis cordas precisam da
mesma fonte — sem isso as colunas não alinham entre si, e uma tab desalinhada não
serve para nada. Linha em branco encerra o bloco.

**A linha de acordes imediatamente anterior entra no bloco.** No print do defeito o
`A` está na coluna 4, marcando *onde* na tab o acorde vale. Se ela ficasse fora, o
bloco encolheria e o `A` não. Dentro do bloco ela escala junto e a coluna se mantém.

Isso substitui o pareamento normal acorde↔letra: hoje `   A` + `E|-0---…` viram um
par `{chords, lyric}`, o que também faz a fileira de miniaturas tentar desenhar
diagramas de 100px sobre uma grade de tab. Dentro do bloco a linha de acordes é
sempre `.ch` simples — acorde tocável, cor de acento, sem miniatura.

Forma nova de linha no `parseCifraText`:

```js
{ isTab: true, tab: ['E|-0---…', 'B|-2---…', …], chords: '   A', hasChords: true }
```

`hasChords` continua verdadeiro, então `extractChords` e a grade "Acordes desta
música" seguem enxergando o acorde sem mudança.

### Encolher para caber

O bloco **nunca quebra e nunca rola**: ele encolhe até caber na largura disponível.

```css
.cifra-text .tabwrap{container-type:inline-size;overflow-x:auto}
.cifra-text .tab{white-space:pre;font-size:min(1em,calc(100cqi/(var(--cols)*.6)))}
```

`--cols` é a maior largura do bloco em caracteres — o comprimento da mais longa
entre as linhas de tab **e a linha de acordes absorvida** —, escrita inline no
render. O `min()` é o coração da regra:

- `1em` — a fonte do zoom, herdada de `.cifra-text`. É o teto.
- `100cqi/(cols*.6)` — a fonte em que `cols` colunas ocupam exatamente a largura do
  container, dado o avanço 0,6em da monoespaçada.

Em 100% de zoom uma tab de 55 colunas fica nos 20px normais (caberiam 60). A partir
de ~110% ela para de crescer e passa a caber. Reflui sozinha em resize e rotação,
sem medir nada em JS e sem ouvinte de evento.

O `container-type` fica no `.tabwrap`, não no `.cifra-text` — mas não pelo motivo que
uma revisão anterior deste spec afirmou. Medido em Chrome headless com controle:

```
sem contenção              → filho fixed em 10,10
container-type:inline-size → filho fixed em 10,10   (NÃO prende)
contain:layout              → filho fixed em 59,535    (prende)
```

`container-type:inline-size` sozinho **não** cria bloco contentor para descendente
`position:fixed` — a afirmação de que ele "implica `contain:layout`" e por isso
alcançaria o popover é falsa; só `contain:layout` produz esse efeito, medido acima.
Além disso `.chord-pop` é irmão de `.cifra-scroll`, não descendente do `.tabwrap` —
está duplamente fora do alcance de qualquer contenção aqui, então mesmo que
`container-type` prendesse `position:fixed`, o popover não seria afetado.

O motivo real é escopo: o `.tabwrap` é o menor elemento que fornece o `100cqi` de que a
conta do `min()` acima precisa. Pôr `container-type` na `.cifra-text` inteira seria
instrumento grosso — criaria contexto de empilhamento, mexeria em colapso de margem, e
envolveria justamente o elemento que `measureCifraCols()` mede para o reflow do
par acorde/letra. No `.tabwrap`, que só contém a tab, nada disso se aplica.

O `overflow-x:auto` é rede de segurança. Se a fonte cair para um fallback com avanço
diferente de 0,6em (Consolas é 0,55), o excesso vira uma rolagem mínima em vez de
voltar a quebrar.

### Ligadura desligada

`font-variant-ligatures:none` + `font-feature-settings:"liga" 0,"calt" 0` em
`.cifra-text`, valendo para cifra e tab.

Isto **não** infringe a regra de não renotar a cifra do usuário: nenhum caractere é
trocado, e em fonte monoespaçada a substituição por ligadura preserva o avanço. O
alinhamento acorde↔sílaba não se move; o que muda é `|-` deixar de parecer `├─`.

## O que não muda

- **Este trabalho não toca `.ly`.** O reflow (`fbf95a8`, anterior a este trabalho) já
  trocou `.ly` de `pre-wrap` para `pre` — ver "Como o reflow mudou o defeito" acima. Só
  tab ganha tratamento novo aqui.
- **`esc()` continua imprimindo a linha byte a byte.** Nada de substituição de
  caractere dentro da tab.
- **Modelo de dados e backup.** A cifra é guardada crua em `cifra.texto` e
  reprocessada a cada abertura — a regra nova conserta o acervo inteiro
  retroativamente, sem migração e sem reimportar.

## Mudanças por arquivo

- **`app/js/chords.js`** — `isTabLine` (novo, exportado); `parseCifraText` agrupa
  linhas de tab em bloco e absorve a linha de acordes anterior; a forma devolvida
  ganha `tab` / `isTab`.
- **`app/js/render/play.js`** — `cifraTextHTML` emite `.tabwrap > .tab` com `--cols`;
  bloco de tab não passa pela fileira de miniaturas.
- **`app/css/app.css`** — `.tabwrap` / `.tab`; ligadura desligada em `.cifra-text`.
- **`app/sw.js`** — bump de `VERSION` (mudança de css/js; o `SHELL` não muda, nenhum
  módulo novo).
- **`docs/superpowers/specs/2026-07-30-reconhecimento-de-linha-de-acordes-design.md`**
  — a seção "Ainda fora do reconhecimento" passa a apontar para este design.

## Verificação

- **`app/test/cifraparse.test.js`** — `isTabLine` nas formas aceitas (`E|-0---0---|`,
  `E|--0--2--3--|`, `|---3---|`, com técnica `h p b`) e nos falsos positivos que precisam
  continuar do jeito que estão: linha de acordes com traço (`C ---- G`), ornamento
  (`!---->`, `^^^`), letra com travessão, marca `%`. Mais o agrupamento: seis cordas
  num bloco só, linha em branco encerrando, linha de acordes anterior absorvida,
  `extractChords` seguindo enxergando o acorde.
- **A/B contra o acervo** — `isTabLine` rodado sobre **199 arquivos `.somaplay`,
  5.739 cifras únicas, 394.034 linhas** (árvore inteira do repo local, deduplicada por
  título+texto). Mesmo método que pegou a regressão do design de 2026-07-30, e que aqui
  fez o mesmo serviço: **a primeira versão promoveu 12.002 linhas com 40 falso positivo
  em 21 músicas**, o que obrigou a regra de âncora acima.

  Depois da âncora: **2.154 blocos, 11.950 linhas, zero bloco sem âncora.** Os quatro
  falso positivo nominais conferidos um a um — divisor decorativo, `+-+-+-+-+-+`,
  `<---`, e `          D ------`, que voltou a ser linha de acordes com o `D` em
  `extractChords`. As cinco formas legítimas seguem tab, inclusive a corrida mista com
  corda muda entre duas cordas ancoradas.

  **Vale manter o método para qualquer mexida nessa regra.** Nenhuma das duas correções
  descartadas parecia errada lendo código; foi a medição que as derrubou.

- **Desempenho** — a primeira versão da âncora reescaneava a corrida rejeitada a cada
  linha, O(n²): 8.000 linhas de traço levavam 3,5 s, 20.000 levavam ~20,8 s, o que
  travaria a thread principal ao abrir uma música colada de PDF mal convertido. A
  fronteira `semAncoraAte` guarda o fim da última corrida rejeitada e a escaneia uma
  vez só: 20.000 linhas em 11 ms.

- **No app** — "Força Estranha" nos zooms 100/110/150/200%, conferido em Chrome
  headless com o CSS real: seis cordas em **seis linhas** em todos eles, `A` sobre a
  coluna 4, `|` limpo, sem rolagem lateral. Em 110% a fonte do bloco encolhe de 22px
  para 21,82px e o conteúdo fica em 720px — exatamente a largura do container, porque
  `720/(55 × 0,6) = 21,818`. De 150% em diante o bloco fica no teto e só a letra cresce.

  **Fora do alcance do headless, fica com o usuário:** popover de acorde dentro do
  bloco, miniaturas ligadas e desligadas, `ResizeObserver` na rotação do tablet, uma
  música sem tab, e o reflow do par acorde/letra numa cifra longa.

## Fora de escopo (decidido)

- **Piso de legibilidade.** O bloco encolhe o quanto for preciso; não há tamanho
  mínimo abaixo do qual ele passe a rolar. Se aparecer tab larga demais em tela
  pequena, entra depois como `max()` no mesmo `min()`.
- **Tab como fonte de digitação.** Nada de ler a tab para deduzir voicing ou
  alimentar o dicionário de acordes. Ela é conteúdo do usuário e vai para a tela
  como está.
