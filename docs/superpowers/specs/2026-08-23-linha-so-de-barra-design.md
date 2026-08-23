# Linha só de barra de compasso é linha de acordes

**Data:** 2026-08-23
**Estado:** abordagem aprovada; spec em revisão

## O problema

Nos songbooks do Chediak a harmonia costuma seguir de um sistema para o outro sem
o nome do acorde ser repetido. A página imprime só as barras de compasso:

```
E7(#9)   /    /    /    /    /    /    /    /    /    /    /
   A sala cala e o jornal prepara Quem está na sala com pipoca e bala
   /     /    /    /    /    /    /    /    /    /    /    /
Manso        O tempo corre, o suor escorre Vem alguém de porre e há um
```

A segunda linha de barras é linha de acordes: ela marca em que coluna cai cada
compasso. Mas o `isChordLine` de `app/js/chords.js` exige que **pelo menos um**
token da linha seja acorde de verdade:

```js
if (!toks.some((t) => chordsOfTok(t).length)) return false;
```

Sem nenhum acorde nomeado, a linha é reprovada. O `parseCifraText` então não a
pareia com a linha de letra abaixo: cada uma vira um **bloco solto**.

### Por que isso aparece na tela

O `wrapBlock` reflui acorde e letra **do mesmo bloco**, na mesma coluna — é o que
mantém o acorde sobre a sílaba quando a linha não cabe na largura do tablet. Dois
blocos soltos quebram em pontos diferentes, e o resultado é este:

```
/  /   /  /   /       /       /       /       /        /      ← barras, 1ª parte
/            /                                                ← barras, 2ª parte
Manso        O tempo corre, o suor escorre Vem alguém de      ← letra, 1ª parte
porre e há um corre-corre E o mocinho                         ← letra, 2ª parte
```

em vez de barra/letra, barra/letra. A barra deixa de cair sobre a sílaba.

Relatado pelo usuário em 2026-08-23, olhando *Bala com bala* no tablet: "uns
espaços estranhos na quebra do texto, depois de voando e depois de mocinho".

Há um segundo efeito, menor: o bloco solto é desenhado como letra
(`.ly`, cor de texto) em vez de acorde (`.ch`, cor de acento e negrito).

## Escala medida — e uma contagem errada, corrigida

A primeira medição deste problema falou em **1724 linhas órfãs** no acervo
gerado. **O número estava errado** e é registrado aqui porque a correção mudou a
decisão de projeto.

O filtro usado era `^[\s/|%]+$` — barra **ou pipe**. Separando os dois:

| linha órfã | linhas | músicas | seguidas de letra (quebram) |
|---|---|---|---|
| só barra `/` | **4** | **2** | **2** |
| só pipe `\|` | 1720 | 137 | 148 |

As de pipe **não são linha de acordes**. São desenho de diagrama em ASCII, do
acervo do Vitor — grade de cordas com `o`/`O` de dedo e dígito de casa:

```
 ||||||      ||||||      ||||||      3||4||
 ||||||      ||||||      ||||||      ||||||
  O ooo      O ooo       O ooo       O ooo
```

Parear essas com a linha de baixo **quebraria 137 músicas para consertar 1**.

O problema real, hoje, são **2 linhas em 1 música** (*Bala com bala*, sistemas 2
e 8). As outras 2 linhas de barra pura do acervo estão em *A Ilha* (Rodrigo
Vianna vol. 2) e não quebram, porque não vêm seguidas de letra.

**Por que vale corrigir mesmo assim:** é defeito de correção no parser, não
enfeite, e vai voltar. Toda cifra vinda de songbook Chediak carrega barra — 31
músicas extraídas já usam — e a linha de barra pura aparece a cada ~30. O acervo
de songbooks está no começo.

## A decisão

Ensinar o **pareamento** do `parseCifraText` a aceitar a linha de barra pura como
linha de acordes. **Não** mexer no `isChordLine`.

### Por que no pareamento, e não no `isChordLine`

`isChordLine` é usado em três lugares, e um deles muda de comportamento se a
regra for relaxada lá: em `chords.js:232`, uma linha de acordes seguida de outra
linha reprovada pareia as duas como acorde+letra. Uma linha de acordes seguida de
linha de barra pura hoje vira um par; relaxando `isChordLine`, deixaria de virar.
Isso mexe em músicas que não foram medidas, para ganhar nada — o caso que
interessa é o da barra **seguida de letra**.

`isChordLine` também alimenta o `isTabAnchor` (`chords.js:130`), a guarda que
impede uma linha como `D7 ------` de ser promovida a bloco de tablatura. Deixar a
função em paz mantém essa guarda e os 69 testes de `cifraparse` intactos.

### A regra

Uma linha entra no pareamento como linha de acordes quando as **três** condições
valem:

1. todos os seus tokens são barra de compasso — só os caracteres `/` e espaço;
2. há **pelo menos uma** barra (linha em branco não conta, e já é tratada antes);
3. a linha **seguinte** existe, não é vazia, não é rótulo `[...]` e não é ela
   própria linha de acordes — isto é, é letra.

Faltando a condição 3, nada muda: a linha continua caindo no fluxo de hoje — vira
bloco de letra. É o que deixa as duas linhas de *A Ilha* exatamente como estão.

**A regra não olha a linha anterior.** Uma linha de barra pura seguida de letra
pareia mesmo abrindo a música, sem acorde nomeado antes dela. Exigir contexto
anterior seria mais estreito, mas obrigaria um predicado de linha a carregar
estado do bloco anterior, e não há caso medido que peça isso.

### Por que só `/`, e não toda marca

O `MARK` de `chords.js` aceita `%`, `|`, `N.C.`, `x2`, `(2x)`, `...`, `---` e
mais. Aceitar tudo capturaria as 1720 linhas de arte ASCII e uma linha de letra
que fosse só reticências.

`|` fica de fora **por medição**, não por princípio: neste acervo, linha só de
pipe é desenho de diagrama. Se um dia aparecer songbook que use `|` como barra de
compasso, a regra se amplia com a mesma evidência que a fechou — contando quantas
linhas de cada tipo existem antes de mexer.

`%` fica de fora por não existir nenhum caso: zero linhas só de `%` no acervo.
Não se escreve regra para caso que não se mediu.

## O que muda na tela

Nas 2 linhas afetadas:

- **barra e sílaba voltam a quebrar juntas**, na mesma coluna — o defeito relatado;
- a linha passa de `.ly` (cor de texto) para `.ch` (cor de acento, negrito),
  igual às outras linhas de acorde em volta. É correção, não efeito colateral: a
  linha é de acordes.

Nenhuma outra música do acervo muda. As 1720 linhas de pipe seguem exatamente
como estão.

## Fora de escopo

- **Reescrever a cifra do usuário.** Repetir o acorde regente no começo da linha
  de barras deixaria a linha "legítima" aos olhos do parser, e é renotação: a
  página não imprime aquele nome ali. A regra do projeto vale inteira.
- **Ampliar para `|`.** Ver acima.
- **`chordLineSegs` e a linha de diagramas.** A linha de barra pura não tem token
  de acorde, então não gera botão nem diagrama; nada a decidir.

## Testes

Em `app/test/cifraparse.test.js` (pareamento) e `app/test/cifrawrap.test.js`
(reflow), seguindo o que já existe nesses arquivos:

1. linha só de `/` seguida de letra → um bloco com `chords` **e** `lyric`;
2. o mesmo bloco, largo demais para a largura dada, quebra com barra e sílaba na
   mesma coluna — a prova do defeito relatado;
3. linha só de `/` **não** seguida de letra (fim do texto, ou seguida de outra
   linha de acordes) → **segue bloco de letra, exatamente como hoje**. Não é o
   estado ideal — a linha é de acordes e é desenhada como letra —, mas está fora
   deste escopo: mexer nela mudaria as 2 linhas de *A Ilha* sem defeito relatado
   para justificar;
4. linha só de `|` seguida de letra → **não** pareia; continua dois blocos. É o
   teste que protege as 137 músicas do acervo do Vitor;
5. linha de letra que é só `...` ou `---` seguida de outra letra → não pareia;
6. `isChordLine` continua reprovando a linha de barra pura — a função não mudou.

## Versão

Mexe em `app/js/chords.js`, que está no `SHELL`. Pela regra do projeto é no
mínimo **PATCH**: `0.15.0` → `0.15.1`, nos dois lugares (`app/js/version.js` e
linha 2 de `app/sw.js`), com `app/test/version.test.js` guardando a sincronia.
