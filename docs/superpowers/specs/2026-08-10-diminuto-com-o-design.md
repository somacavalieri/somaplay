# Diminuto escrito com "o" minúsculo

**Data:** 2026-08-10
**Estado:** aprovado, a implementar

## O problema

Uma parte grande do acervo escreve o acorde diminuto com a **letra `o` minúscula** em vez
do símbolo de grau: `Ebo`, `Fo`, `Co`, `A#o`, `G#o`, `F#o`, `Bo`. É o que sai quando se
digita a cifra num teclado comum, sem caçar o `°` na tabela de caracteres.

O `isChordTok` de `js/chords.js` aceita duas grafias do diminuto — `°` (U+00B0, grau) e
`º` (U+00BA, ordinal masculino, o que o CifraClub usa) — mas não a letra `o`.

O estrago não é o acorde diminuto ficar sem diagrama. É que `isChordLine` exige que
**todos** os tokens da linha sejam acorde ou marca; um único token reprovado derruba a
linha inteira, que deixa de ser linha de acordes e vira linha de letra. Nesta linha:

```
C         Ebo       Dm         G
Você me pergunta pela minha paixão
```

o `Ebo` leva `C`, `Dm` e `G` junto — três acordes que o app conhece de cor ficam brancos,
sem diagrama e sem clique.

## Escala medida

Sobre as 1.032 músicas convertidas do acervo VJ (22.082 linhas de acorde):

- **284 linhas** não são reconhecidas como linha de acordes (1,3%)
- **71 dessas 284** (25%) têm o `Xo` como **único** estorvo — some o problema, a linha volta
- **69 acordes distintos** são perdidos por tabela nessas linhas

E o acervo VJ está em 14 dos 169 artistas. O padrão se repete no que falta.

## A decisão

Ensinar o `isChordTok` a aceitar `o` como grafia do diminuto — **não** reescrever a cifra
do usuário. Trocar `Ebo` por `Eb°` no conteúdo teria a mesma largura (3 caracteres) e não
quebraria o alinhamento, mas a regra do projeto é não renotar o que o usuário escreveu, e
a correção no app vale para toda a biblioteca de uma vez, inclusive para cifras coladas no
futuro.

## A ambiguidade, e as duas guardas

`o` é uma letra, e em português palavras comuns começam com nota seguida de `o`. Sem
cuidado, a mudança faz palavra virar acorde:

| Palavra | Leitura como acorde | Vira acorde? |
|---|---|---|
| `Com` | C + o + m | sim, se `o` valer em qualquer posição |
| `Bom` | B + o + m | idem |
| `Como` | C + o + m + o | idem |
| `Do` | D + o | sim |
| `Ao` | A + o | sim |
| `Amo` | A + m + o | sim |

Duas guardas, e as duas juntas são o que torna a mudança segura:

**Guarda 1 — `o` só vale no fim da parte de qualidade.** O diminuto é sufixo: `Ebo`, `Bo`,
`Gom6` não existe. Aceitar `o` apenas como último caractere da qualidade (antes de
parênteses e de baixo invertido) já elimina `Com`, `Bom`, `Como`, `Dom` — em todas elas o
`o` tem letra depois.

Sobram `Do`, `Ao`, `Amo`, `Emo`: nessas o `o` é mesmo o último caractere. A guarda 1 não
resolve, e nem pode — `Do` é indistinguível de um Ré diminuto escrito assim.

**Guarda 2 — token ambíguo só conta com companhia.** Ambíguo é o token **feito só de
letras** e terminado em `o`: `^[A-G][a-z]*o$`. Isso pega `Do`, `Ao`, `Amo`, `Bo`, `Co`,
`Fo`, `Go` e também `Ebo` e `Bbo` — o bemol é a letra `b`, então não desambigua nada.
Já `F#o`, `G#o`, `C#o`, `D#o` e `A#o` têm `#`, caractere que não existe em palavra, e por
isso são inequívocos.

Um token ambíguo só é aceito **se a linha tiver pelo menos um acorde não-ambíguo**. Numa
linha de cifra o diminuto nunca anda sozinho — há sempre outro acorde ao redor. Numa linha
de letra, "Amo" ou "Ao" aparece cercado de palavras, que já reprovam a linha.

A contagem no acervo mostra por que isso não é preciosismo: `Do` aparece **150 vezes** e
`Ao` **48**, quase sempre como palavra da letra, contra 29 de `Ebo` e 17 de `Fo`. Sem a
guarda 2, a grafia mais comum no acervo seria a palavra, não o acorde.

Isso cobre o caso que sobrava: a linha de letra curta, de um ou dois tokens, feita só
dessas palavras.

Note que a guarda 2 é uma regra **de linha**, não de token: `isChordTok('Do')` continua
respondendo `true`. Quem decide é `isChordLine`, que já hoje é o dono da regra "todos os
tokens têm de ser acorde ou marca, e ao menos um tem de ser acorde de verdade".

## O que fica de fora

Só o reconhecimento do nome. O **diagrama** dos diminutos é outro assunto — hoje 42 acordes
diminutos estão sem forma no `chordbook`, junto com outros 1.191. Isso é trabalho separado,
já mapeado.

Também ficam de fora as outras causas das 284 linhas: `Intro.:` / `Intr.:` / `Int.:` (o
ponto antes dos dois-pontos escapa do `LABEL_DOISPONTOS`), `Cadd9  /Eb` com a barra
separada por espaço, e rótulos soltos no meio da linha. Juntas são 213 linhas — vale uma
rodada própria depois, medindo de novo.

## Como saber se deu certo

O acervo convertido é o banco de provas: 1.032 músicas, 22.082 linhas de acorde, 36.374 de
letra. Antes e depois da mudança, medir sobre ele:

1. **linhas que passam a ser reconhecidas** — esperado ~71, e nenhuma a menos que hoje
2. **linhas de letra que viram linha de acordes** — esperado **zero**. Esta é a métrica que
   mata a mudança se falhar: uma frase de letra rendida como acorde é pior que um diminuto
   sem clique.

Mais os testes unitários das duas guardas e a suíte existente inteira.

## Distribuição

`js/chords.js` já está no `SHELL` do `sw.js`, e o Service Worker é **cache-first**. Sem
subir o `VERSION` (hoje `somaplay-v23`), quem já instalou continua com o arquivo antigo.
O bump faz parte da mudança.
