# Diminutos no catálogo, e nome canônico na busca de formas

**Data:** 2026-08-10
**Estado:** aprovado, a implementar
**Antecede:** `2026-08-10-diminuto-com-o-design.md` (reconhecer `Ebo` como acorde)

## O erro que originou isto

As 12 formas de diminuto foram entregues num `.somaplay` para o usuário importar. Estava
errado. Forma de acorde é fato, não obra: **não tem restrição de direito autoral e não
precisa passar por importação**. O lugar dela é `app/js/chords-catalog.js`, que vai no repo,
entra no `SHELL` do Service Worker e chega em todo aparelho no deploy. O comentário no topo
do próprio catálogo já dizia isso: *"cresce no repo à medida que músicas são importadas"*.

O `.somaplay` existe para o que **não pode** ir ao repo: as músicas.

O arquivo errado (`diminutos-chordbook.somaplay`) foi apagado e o backup do usuário foi
limpo em `bkp/somaplay-backup-2026-08-10-limpo.somaplay`.

## O que entra no catálogo

As 12 formas lidas por pixel da tabela do usuário (`chords/_diagramas/diminutos.png`),
todas conferidas pelas notas — as quatro notas certas, fundamental no baixo, vão ≤ 3 casas:

| | frets | | frets |
|---|---|---|---|
| `C°` | `x 3 4 2 4 x` | `F#°` | `2 x 1 2 1 x` |
| `C#°` | `x 4 5 3 5 x` | `G°` | `3 x 2 3 2 x` |
| `D°` | `x 5 6 4 6 x` | `G#°` | `4 x 3 4 3 x` |
| `D#°` | `x x 1 2 1 2` | `A°` | `5 x 4 5 4 x` |
| `E°` | `x x 2 3 2 3` | `A#°` | `x 1 2 0 2 x` |
| `F°` | `x x 3 4 3 4` | `B°` | `x 2 3 1 3 x` |

Grafia com `°` e com sustenido, que é a convenção do catálogo hoje (`C#°`, `D#m`, `F#m`).

Duas ressalvas sobre a leitura, registradas para quem for conferir:

- **`D°` tem marcador de posição** (`4ª` na imagem, meio escondido por um balão). Sem o
  deslocamento de 2 casas ele sairia igual ao `C°`. A conferência por notas é que provou:
  só com o deslocamento dá D F G# B.
- **`A#°` está desenhado com 3 bolinhas.** A tabela não usa marcador de corda solta em
  lugar nenhum, e a nota que falta (G) é o Sol solto. Completado para `x 1 2 0 2 x`, que é
  exatamente o `C#°` três casas abaixo.

**`C#°` já existe no catálogo** (`x 4 5 3 5 3`, também correto). A regra do arquivo é
append-only — o índice de cada forma vira o id persistido `b:<nome>:<índice>`, e inserir no
meio re-liga silenciosamente referências gravadas. Então a forma nova do `C#°` **é
acrescentada no fim do array**, nunca por cima.

## O nome canônico na busca

O acervo escreve o mesmo acorde de cinco jeitos: `F°`, `Fº`, `Fo`, `Fdim`, `Fdim7`. Somando
enarmonia, `A#°` também aparece como `Bb°`, `Bbº`, `Bbo`, `Bbdim`. Despejar 45 grafias no
catálogo resolveria hoje e criaria manutenção para sempre.

Melhor: **`shapesOf(name)` cai para o nome canônico quando o literal não tem forma
embutida.** O `chord-notation.js` já faz metade disso — mapeia `°` e `º` para `dim` e
canoniza `dim` de volta para `°`. Falta ensinar-lhe a letra `o` e acrescentar um passo de
enarmonia.

```
shapesOf('Fº')  -> sem embutida -> canônico 'F°'  -> usa as formas de F°
shapesOf('Bbo') -> sem embutida -> canônico 'A#°' -> usa as formas de A#°
```

Isso conserta **toda** variação de grafia do catálogo de brinde, não só diminuto: `Bbm7`
passa a achar `A#m7`, `Ebmaj7` acha `D#7M`.

**O id da forma continua carregando o nome canônico** (`b:F°:0` mesmo quando pedido por
`Fº`). Isso é desejável: a mesma forma tem o mesmo id em qualquer grafia, e as referências
gravadas (`hidden`, `digitacoes`) param de depender de como a cifra escreveu o acorde.

**A escrita continua pelo nome literal.** `upsertVar('Fº', ...)` grava um registro `Fº`.
O `mergeShapes` casa por id, então a lápide e o override de uma forma embutida funcionam
mesmo com o registro sob a grafia da cifra. O preço é que, se o usuário customizar `Fº` e
`F°` separadamente, ficam dois registros — aceitável, e nada se perde.

## O que fica de fora

- **Diminuto com extensão** (`A#º(b13)`, `Ab°7M`, `Gb°(13)`) não é o mesmo acorde. São 10
  nomes, um uso cada, e vão junto com a leva geral dos exóticos.
- **A cauda de 1.233 acordes sem diagrama** continua pendente; isto resolve 42 deles mais
  o que a canonização alcançar.
- **Não mexer no `chords-catalog.js` para renomear ou reordenar nada** que já existe.

## Como saber se deu certo

1. Testes de unidade: as 12 formas conferidas pelas notas dentro do próprio teste (a
   conta é curta e é ela que pega erro de digitação nos frets), e a canonização
   (`Fº`, `Fo`, `Fdim`, `Bb°` chegam à forma de `F°`/`A#°`).
2. O teste existente de append-only do catálogo continua verde; `C#°` mantém a forma antiga
   no índice 0.
3. Aferição sobre as 1.032 músicas convertidas: quantos acordes distintos deixam de estar
   sem diagrama. Esperado ~61 nomes de diminuto puro cobertos.
4. Verificação no navegador: abrir uma música com `Ebo` e ver o diagrama no popover.

## Distribuição

`chords-catalog.js` e `chordbook.js` estão no `SHELL` e o Service Worker é cache-first:
subir o `VERSION` (hoje `somaplay-v24`) faz parte da mudança.
