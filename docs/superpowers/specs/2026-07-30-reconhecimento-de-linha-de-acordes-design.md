# Soma_play — Reconhecimento de linha de acordes na cifra em texto — design

**Data:** 2026-07-30 · **Estado:** implementado e verificado
**Origem:** defeito relatado — a linha de introdução (`[Intro] Em7  Am7  Em7  Am7  Cm6`) aparecia branca, como letra, e os acordes não eram tocáveis. Auditoria do acervo mostrou **85 de 104** cifras em texto com pelo menos uma linha quebrada.

## Objetivo
Fixar **quais linhas de uma cifra colada são linha de acordes**, para que o reconhecimento não dependa da faxina manual do texto colado. A regra vale no `parseCifraText` e é o que sustenta cor, toque no acorde, diagrama, grade "Acordes desta música" e miniaturas.

## A regra
Uma linha é **linha de acordes** quando, **tirados os rótulos**, todos os tokens são **acorde ou marca**, e **ao menos um é acorde de verdade**.

O último requisito existe para uma linha só de ornamento (`^^^^^^`, `-> ->`, uma régua de pontos) continuar sendo letra.

### Rótulo — o que sai da conta
Cifra do CifraClub costuma pôr o rótulo da parte **na mesma linha dos acordes**, no começo ou no fim:

```
[Intro] Em7  Am7  Em7  Am7  Cm6
     Fm7        Bb/D  [Frase 1]
  Gb°   Fm7 (Frase 2)
Intro: Am  G  F  E7
INTRO : E
```

- Trecho entre `[]` ou `()` cujo conteúdo **não** é todo acorde/marca é rótulo e sai inteiro.
- Trecho cujo conteúdo **é** todo acorde/marca **permanece** — é passagem instrumental, não rótulo: `( G  F  G  F )`, `( C4+(9)  C9  C2(9)  G5 )`, `[A#m7   D#7]`.
- Rótulo com dois-pontos sai também, mas **só no começo da linha e só uma palavra** — senão `Ela disse: ...` entraria na conta.

Duas armadilhas no casamento do trecho, ambas cobertas por teste:
- **Fronteira de token.** Só conta como trecho o que abre e fecha entre espaços. Parêntese colado no acorde é **extensão dele** — `Am7(9)/G`, `Db6(9)/Ab` — e apagá-lo partiria o acorde em dois (`Db6` + `/Ab`), quebrando linhas que funcionavam.
- **Um nível de aninhamento.** Sem isso a extensão do acorde fecharia o trecho cedo: em `( C4+(9)  C9 )` o `)` de `(9)` encerraria o trecho no meio.

**O rótulo sai trocado por espaço do mesmo tamanho.** O reconhecimento não pode deslocar coluna: a linha vai para a tela **byte a byte**, e o alinhamento acorde↔sílaba depende de cada caractere.

### Acorde — notação aceita
Além do que já valia (`Bm7(b5)`, `D7(4)`, `C/E`, `Cm6/Eb`), depois da barra vale **também a extensão**, no estilo CifraClub: `Bm5-/7`, `A7/13`, `Em7/5-`, `C7M/6`, `D7/9-`, `E7/4(9)`, `Bm7/11`. Antes só nota de baixo era aceita, e **um** token desses derrubava a linha inteira.

### Marca — token que divide a linha sem ser acorde
Repetição e compasso (`N.C.`, `%`, `|`, `x2`, `(2x)`), ornamentos e setas que a fonte cola na linha (`^`, `^^^^^^`, `->`, `!---->`, `-`), delimitador de trecho que ficou sozinho (parêntese que nunca fecha), e digitação inline (`x2x243`, `0221xx`).

### Nome limpo (`chordName`)
A fonte às vezes cola no acorde algo que não é acorde: asterisco ou ponto de nota de rodapé (`C*`, `F#m7(b5)*`, `E.`), ou o delimitador do trecho grudado (`(Dm`, `Gm7)`, `[A#m7`). `chordName` devolve o acorde limpo — é **ele** que reconhece a linha, desenha o diagrama, entra na grade e abre o popover. O **token cru continua na tela**, pelo mesmo motivo de sempre: alinhamento.

## Consequência agradável
Como a cifra é guardada em `cifra.texto` **cru** e reprocessada a cada abertura, mudar a regra **conserta o acervo inteiro retroativamente** — sem migração e sem reimportar. Confirmado que `cifra.acordes` (persistido, com precedência sobre o parser em `render/play.js`) não tinha nenhum acorde faltando nas 99 músicas que o têm.

## Mudanças por arquivo (sem mudança de modelo de dados nem de backup)
- **`app/js/chords.js`** — `chordName` (novo, exportado); `isChordTok` aceita extensão pós-barra; `MARK` cobre ornamentos/delimitador solto/digitação inline; `stripLabels` + `isChordLine` implementam a regra; `chordLineSegs` e `layoutChordRow` passam a expor `name` (nome limpo) ao lado do token cru; `extractChords` usa o nome limpo; `layoutChordRow` trata `[Frase 1]` como um token só (partido em dois viraria `[Frase    1]` depois que a miniatura empurra o resto).
- **`app/js/render/play.js`** — `data-id` do botão e o diagrama usam `name`; a tela continua mostrando `tok`.
- **`app/js/samples.js`** — Andança: `E7(13)E7(b13)` → `E7(13) E7(b13)` (dois acordes colados, typo da fonte).
- **`app/sw.js`** — bump `v11 → v12` (mudança de shell).

## Verificação
- **`app/test/cifraparse.test.js`** (novo) — 33 casos cobrindo cada forma acima, mais os falsos positivos que precisam continuar sendo letra (`Ela (ela) me ama`, `Ela disse: eu vou`, linha só de ornamento) e as não-regressões (`Am7(9)/G`, par acorde/letra clássico, marcas antigas). Suíte: 117 testes.
- **A/B contra o acervo** — parser antigo vs novo em 222 cifras (3 backups + samples): **605 linhas promovidas de letra para acorde, 0 regressões**. Esse A/B pegou uma regressão introduzida no meio do caminho (apagar parêntese de extensão partia `Db6(9)/Ab` e quebrava 24 linhas que funcionavam) — vale manter o método para qualquer mexida futura nessa regra.
- **No app** — "Queremos Saber" (intro tocável, âmbar), "Alvorada" (`[Frase N]` no fim da linha, alinhamento com a letra intacto nos dois modos, com e sem miniaturas), "Pela décima vez" (legenda `.:ACORDES:.` com nomes tocáveis), "Bloco do Prazer" (`Intro:` com 16 acordes).

## Ainda fora do reconhecimento (decidido)
- **Dois acordes colados sem espaço** (`E7(13)E7(b13)`): ambíguo de separar com segurança. É typo da fonte, corrigido no texto — no sample e, na biblioteca, por `fix-andanca-cifra.somaplay` (merge por id).
- **Linhas de tablatura** (`E|---5---5---`): ficam como texto de propósito.
