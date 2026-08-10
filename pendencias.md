# Pendências

Histórico do que foi adaptado, pulado ou ficou meia-boca. Cada item diz **o que**,
**por quê** e **o que fazer se incomodar**.

---

## Songbook Gilberto Gil — vol. 2

Conversão do PDF `chords/Gilberto Gil/songbook/356224778-Gil-Songbook-Vol-1-e-2-Cancoes.pdf`
(páginas 31–175 do livro) para `.somaplay`. Ferramenta em `scripts/gil_songbook/`.

### Decisões que valem para o livro inteiro

| # | O quê | Por quê | Se incomodar |
|---|---|---|---|
| 1 | **Barras de compasso removidas** (`/`, `///`) | pedido seu, para simplificar | dá para reemitir com elas: o `MARK` do `chords.js` aceita barra isolada, mas precisa de espaço em volta |
| 2 | **`A*` virou `A`** (e todo `X*` virou `X`) | no Chediak o `*` só marca *outro voicing do mesmo acorde*, não é nome de acorde. O app trabalha com forma, não com nome | a forma do songbook entra como **variação extra** de `A` no dicionário — está lá, é só escolher no "Variar" |
| 3 | **`E` com 7 sobrescrito e 4 subscrito + `(9)` virou `E7(4/9)`** | é o padrão que sua biblioteca já usa (`B7(4/9)`, `D7(4/9)`, `G7(4/9)`) | — |
| 4 | Tensão empilhada dentro do parêntese virou `(a/b)`: `B7(b9/#11)`, `A7(9/#11)`, `Db7(9/#11)`, `Em7M(9)`, `Em6(9)` | mesma razão: casar com `A7(9/11)`, `B6(9)` que já existem | — |
| 5 | **Partituras ignoradas** (metade direita de cada página dupla) | pedido seu | — |
| 6 | Acorde que **já está no `chords-catalog.js`** (A, B, B7, C#7, F#m, G#m…) entra no dicionário **sem virar padrão** | `mergeRecords` faz `base.defaultId \|\| inc.defaultId`; um `defaultId` importado roubaria o seu padrão do acorde | a forma do livro fica como variação, acessível pelo "Variar" |
| 7 | Sílabas separadas por travessão foram **remontadas em palavra inteira** (`Ban——da` → `Banda`) | travessão de melisma não é hífen de verdade; manter partia a busca e a leitura | — |

### Por música

| Música | Página | O quê |
|---|---|---|
| Banda Um | 31-32 | A cifra usa **F#m7**, que **não está na grade de diagramas** do livro. Não é erro de leitura — o livro não desenhou. Está sendo servido pela forma que já existia na sua biblioteca. |
| A Linha e o Linho | 34 | Três acordes (`Em7M(9)`, `Em7(9)`, `Em6(9)`) têm **casa-base ambígua** pelo teste das notas; assumi 1ª casa (posição solta), que é o que o desenho mostra (sem algarismo romano, com ○ de corda solta). Conferido no olho. |
| A Linha e o Linho | 34 | `A7(9/#11)` e `A7(4/9)` precisaram de **casa-base fixada à mão** (IV e III) — o teste das notas aceitava mais de uma posição e o OCR do algarismo romano é ruim. Conferido no olho contra o desenho. |
| Andar com Fé | 36 | Sem pendência. |

### Coisas do PDF que dão trabalho (para quem retomar)

- **O livro foi escaneado torto.** Na p. 34 a inclinação sozinha fez o detector perder
  10 das 26 grades. Hoje a página é endireitada antes de qualquer leitura.
- **OCR do algarismo romano não é confiável** — errou 6 de 18 em Banda Um (troca IV por
  X, VII por VIII). A casa-base sai do teste das notas contra o nome do acorde; o
  romano só desempata. Quando sobra ambiguidade, a ferramenta **avisa** (`!?`) em vez
  de chutar calado.
- **A sombra da lombada** (coluna escura na borda interna da página) cola todas as
  linhas de texto numa faixa só se não for cortada antes.

---

## App

| Data | O quê | Situação |
|---|---|---|
| 2026-08-10 | **Cifra longa perdia os acordes**: `.ch` era `white-space:pre` (não quebrava, era cortada pelo `overflow:hidden`) e `.ly` era `pre-wrap` (quebrava sozinha), então metade da letra ficava sem acorde. No celular era inutilizável. | **Resolvido** — reflow do par acorde/letra na mesma coluna (`wrapBlock` em `chords.js`, medição no DOM em `play.js`). Spec `2026-08-10-reflow-da-cifra-texto-design.md`. SW v23. |
| 2026-08-10 | **Miniaturas na música**: com as miniaturas ligadas, o diagrama é bem mais largo que o nome do acorde, então a fileira pode passar da caixa de texto (~44 px na Banda Um, 6 fileiras de 49). Antes isso ficava **escondido** pelo `overflow:hidden`; agora **rola** de lado, que pelo menos é honesto. | **Aberto** — o reflow quebra por coluna de caractere, que não é a métrica certa quando a linha vira fileira de diagramas. Consertar de verdade pede um wrap próprio do modo miniatura. |
