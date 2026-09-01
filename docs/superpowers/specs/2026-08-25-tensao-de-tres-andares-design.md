# A tensão de três andares cabe no acorde

**Data:** 2026-08-25
**Estado:** aprovado, a implementar

## O problema

Os songbooks do Chediak imprimem a tensão **empilhada** dentro do parêntese. Com
dois andares é o caso comum, e o acervo já tem 37 músicas assim só no songbook do
Gil — `A7(9/#11)`, `A7(b9/13)`, `E7(4/9)`. Com **três** andares o acorde não passa
mais no parser:

```
C#7(#9 )
   (#11)          -> C#7(#9/#11/b13)
   (b13)
```

`app/js/chords.js` limita o miolo do parêntese a **7 caracteres**:

```js
const PAREN = '(?:\\([^)]{1,7}\\))*';
```

`#9/#11/b13` tem 10. `isChordTok('C#7(#9/#11/b13)')` devolve **false** — e como
`isChordLine` exige que *todo* token da linha seja acorde ou marca, **a linha
inteira é reprovada**. Os outros acordes daquela linha, que o app conhece
perfeitamente, somem da grade "Acordes desta música", perdem o diagrama e o
popover, e a linha deixa de parear com a letra. Nada dá erro.

É o defeito mais caro que este parser tem: um acorde desconhecido não fica
sozinho na sombra, ele leva a linha junto.

## A medida, no acervo inteiro

O A/B rodou `parseCifraText` + `extractChords` sobre **as 6098 cifras únicas** de
todos os `.somaplay` do repositório (backups, lotes do acervo VJ, songbooks
gerados), com `{1,7}` e com `{1,12}`. **Duas cifras mudam. As duas ganham.**

| música | fonte | linhas de acorde | acordes | token que voltou |
|---|---|---|---|---|
| *A Nível De… (versão 2)* — João Bosco | VJ | 55 → **61** | 28 → 29 | `C#7(#9/#11/b13)` |
| *Fotografia* — Tom Jobim | VJ | 25 → **26** | 14 → 15 | `F7(9/#11/13)` |

**Nenhuma outra cifra muda um byte** — nem na estrutura dos blocos, nem na lista
de acordes.

Duas coisas que esse número diz, e que mudam a leitura do problema:

1. **O defeito já está na biblioteca do usuário, hoje.** Não é hipótese da
   extração em curso: *A Nível De…* já entrou pelo acervo do Vitor e tem **seis
   linhas de acorde mortas** desde então, em silêncio;
2. **a folga não é perigosa.** O `PAREN` só é testado depois de um corpo de
   acorde válido (`[A-G][#b]?…`) e a expressão inteira é ancorada em `^…$`, então
   um parêntese maior não promove palavra de letra a acorde. As 6096 cifras
   restantes são a prova disso medida, não argumentada.

## A decisão

`PAREN` passa de `{1,7}` para **`{1,12}`**.

12 e não 10: `#9/#11/b13` tem 10 e `9/#11/13` tem 8, mas a mesma tipografia
comporta `b9/#11/b13`, com 11. 12 é o teto do que três andares de tensão
escrevem; 7 era o teto de dois. Não é número redondo escolhido no ar — é o que a
grafia de três tensões pede, com um caractere de folga.

**Só o limite muda.** A grafia continua a do acervo, registrada na recipe do
`/chord`: tensão empilhada vira `(a/b)` — e agora `(a/b/c)` — dentro do
parêntese, nunca fora dele. Nada no `QUAL`, no `CORPO`, no `EXT_CC` ou no
`isChordLine` é tocado.

### Alternativas descartadas

- **`C#7(#9)(#11)(b13)`**, parênteses consecutivos, que o regex de hoje já
  aceita. Não perde nenhuma tensão e não mexe no app, mas gasta **17 caracteres**
  para um glifo que ocupa ~5 colunas no impresso. Medido em *A nível de…*: 7
  empurrões contra 4, e o pior deles de 6 colunas contra 4. Também é grafia que
  ninguém escreve — a busca por acorde e o catálogo não a encontrariam.
- **Largar o `b13`** (`C#7(#9/#11)`, 11 caracteres). É a única opção com zero
  empurrão, e perde uma tensão que o livro imprime. Perda desnecessária quando a
  causa é um limite de uma constante.
- **Relaxar `isChordLine`** para tolerar um token desconhecido no meio de
  acordes. Muda o comportamento de milhares de linhas para consertar duas, e
  apaga justamente a guarda que separa linha de acordes de linha de letra.

## O que muda na tela

Nas duas músicas acima: as **sete linhas de acorde** que hoje são desenhadas como
letra voltam a ser linha de acordes — cor de acento, negrito, pareadas com a
letra na quebra, com diagrama e popover em cada acorde. E os dois acordes entram
na grade "Acordes desta música".

Fora delas, nada muda.

## Testes

Em `app/test/cifraparse.test.js`, ao lado dos que já cobrem parêntese de
extensão:

1. `isChordTok` aceita `C#7(#9/#11/b13)` e `F7(9/#11/13)`;
2. uma linha com o acorde de três andares **no meio de outros** é linha de
   acordes, e `extractChords` devolve todos eles — é o teste que prova que a
   linha não cai junto;
3. `chordName` não mexe no token (o parêntese é extensão, não delimitador);
4. o teto continua existindo: um parêntese de 13 caracteres **não** vira acorde.
   Sem isso o limite viraria "qualquer coisa entre parênteses", que é o que a
   ancoragem não garante sozinha;
5. palavra de letra com parêntese longo (`Bem(alguma coisa)`) continua fora —
   guarda contra a promoção acidental de linha de letra.

## Versão

Mexe em `app/js/chords.js`, que está no `SHELL`. Pela regra do projeto é no
mínimo **PATCH**: **0.18.0 → 0.18.1**, nos dois lugares
(`app/js/version.js` e linha 2 de `app/sw.js`), com `app/test/version.test.js`
guardando a sincronia e uma entrada no `CHANGELOG.md`.

Entra na `feat/export-livros`, onde a 0.18.0 vive e ainda não chegou na `main` —
o mesmo caminho que a 0.17.1 fez sobre a 0.17.0.

## De onde veio

Extração de *A nível de…* (João Bosco vol. 3, livro pp. 33–34) pela skill
`/chord`, 2026-08-25. A grade da p.33 traz o acorde nos 29 diagramas e ele
aparece em 4 dos 17 sistemas da música.
