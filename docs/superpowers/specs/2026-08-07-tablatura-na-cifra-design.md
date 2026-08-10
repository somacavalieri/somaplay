# Soma_play — Tablatura na cifra em texto — design

**Data:** 2026-08-07 · **Estado:** especificado
**Origem:** defeito relatado — a tab de "Força Estranha" (Caetano Veloso) quebra cada
corda em duas linhas. As seis cordas viram doze, o bloco dobra de altura e a grade
some.

Este design **revoga** a decisão registrada em
`2026-07-30-reconhecimento-de-linha-de-acordes-design.md` §"Ainda fora do
reconhecimento", que deixava linha de tablatura como texto de propósito.

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

O `container-type` fica no `.tabwrap`, não no `.cifra-text`: `container-type` implica
`contain: layout style inline-size`, e `contain:layout` cria bloco contentor para
descendente `position:fixed` — no `.cifra-text` isso alcançaria o popover de acorde.
No wrapper, que só contém a tab, é inócuo.

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

- **`.ly` continua `pre-wrap`.** Letra comum deve quebrar. Só tab ganha tratamento.
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
- **A/B contra o acervo** — parser antigo vs novo sobre as cifras dos backups e do
  `samples.js`, contando linhas promovidas a tab e conferindo que nenhuma linha de
  acordes ou de letra foi capturada. Mesmo método que pegou a regressão do design de
  2026-07-30; vale manter para qualquer mexida nessa regra.
- **No app** — "Força Estranha" nos zooms 80/100/110/150/200%, com e sem miniaturas,
  em janela larga e estreita: seis cordas, seis linhas, `A` sobre a coluna certa,
  `|` limpo, sem rolagem horizontal.

## Fora de escopo (decidido)

- **Piso de legibilidade.** O bloco encolhe o quanto for preciso; não há tamanho
  mínimo abaixo do qual ele passe a rolar. Se aparecer tab larga demais em tela
  pequena, entra depois como `max()` no mesmo `min()`.
- **Tab como fonte de digitação.** Nada de ler a tab para deduzir voicing ou
  alimentar o dicionário de acordes. Ela é conteúdo do usuário e vai para a tela
  como está.
