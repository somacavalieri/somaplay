# Plano — diminutos no catálogo e nome canônico na busca

Spec: `docs/superpowers/specs/2026-08-10-diminutos-no-catalogo-design.md`

Cada passo termina com `cd app && node --test` verde.

## 1. Teste vermelho das 12 formas

Novo bloco em `app/test/catalog.test.js`.

O teste **calcula as notas** de cada forma em vez de repetir os frets — é a conta que pega
erro de digitação, e repetir os números só duplicaria o engano:

- para cada `X°` das 12 raízes: `catalogDefault('X°')` existe;
- as notas soantes são exatamente `{raiz, +3, +6, +9}` semitons;
- a corda mais grave tocada é a fundamental;
- o vão entre a menor e a maior casa pisada é ≤ 3.

Rodar e ver falhar (hoje só `C#°` existe).

## 2. As 12 formas em `chords-catalog.js`

| | frets | | frets |
|---|---|---|---|
| `C°` | `x 3 4 2 4 x` | `F#°` | `2 x 1 2 1 x` |
| `C#°` | `x 4 5 3 5 x` | `G°` | `3 x 2 3 2 x` |
| `D°` | `x 5 6 4 6 x` | `G#°` | `4 x 3 4 3 x` |
| `D#°` | `x x 1 2 1 2` | `A°` | `5 x 4 5 4 x` |
| `E°` | `x x 2 3 2 3` | `A#°` | `x 1 2 0 2 x` |
| `F°` | `x x 3 4 3 4` | `B°` | `x 2 3 1 3 x` |

**`C#°` já existe** com `x 4 5 3 5 3`. A regra do arquivo é append-only: a forma nova entra
**no fim** do array, e a antiga continua no índice 0 com `default: true`. Inserir no meio
desloca o índice, e o índice é o id persistido `b:<nome>:<índice>` — re-ligaria lápides e
`digitacoes` já gravadas para formas erradas.

Os outros 11 nomes são novos: cada um vira uma entrada com uma forma só, `default: true`.

## 3. Teste vermelho da canonização

Em `app/test/chord-notation.test.js`:

- `toIntl('Fo')` → `'Fdim'`, e `toBr` de volta → `'F°'`
- `toIntl('Fº')` → `'Fdim'` (já passa, é a garantia de não regredir)
- o `o` **só** vale no fim do corpo: `toIntl('Como')` não vira acorde nenhum, `toIntl('D/F#')`
  não muda o baixo
- nova função de enarmonia: `Bb° → A#°`, `Eb° → D#°`, `Gb° → F#°`, `Ab° → G#°`, `Db° → C#°`,
  e nome sem bemol volta inalterado

## 4. Ensinar o `o` ao `chord-notation.js`

Acrescentar `o` ao `TO_INTL` e à `RE_BR`, **ancorado no fim** (`o$`). A `onBody` já isola o
corpo do baixo, então a âncora vale contra o fim do corpo e `D/F#` não é afetado.

Sem a âncora, o `o` casaria em qualquer posição e corromperia nome — é o mesmo cuidado que
o `isChordTok` já toma.

## 5. Função de nome canônico

Nova exportação em `chord-notation.js`:

```
canonico(nome) = enarmonia(toBr(toIntl(nome)))
```

A enarmonia é um mapa de 5 entradas aplicado **só à fundamental** (e ao baixo depois da
barra, pela mesma `onBody`): `Db→C#`, `Eb→D#`, `Gb→F#`, `Ab→G#`, `Bb→A#`. Sustenido é a
convenção do catálogo hoje (`C#°`, `D#m`, `F#m`).

## 6. Fallback em `shapesOf`

Em `app/js/chordbook.js`:

```js
let builtins = builtinShapes(name);
if (!builtins.length) {
  const alt = canonico(name);
  if (alt !== name) builtins = builtinShapes(alt);
}
const list = mergeShapes(builtins, BOOK.get(name));
```

Dois pontos a preservar:

- **o id continua carregando o nome canônico** (`b:F°:0` mesmo quando pedido por `Fº`) —
  é desejável: a mesma forma tem o mesmo id em qualquer grafia;
- **a escrita continua pelo nome literal** — `BOOK.get(name)`, não o canônico. O
  `mergeShapes` casa por id, então override e lápide funcionam.

Testes em `app/test/chordbook.test.js`: `shapesOf('Fº')`, `shapesOf('Fo')`, `shapesOf('Fdim')`
e `shapesOf('Bbo')` devolvem forma; `shapesOf('Xyz')` continua vazio.

## 7. Aferir sobre o acervo

Rodar o script de aferição sobre os 14 `.somaplay` da raiz e conferir quantos acordes
distintos deixam de estar sem diagrama.

Esperado: os **61 nomes de diminuto puro** medidos no acervo passam a ter forma. Registrar o
número antes e depois; se a canonização pegar mais que diminuto (deve pegar — `Bbm7`,
`Ebmaj7`), registrar também.

## 8. Subir o Service Worker

`app/sw.js`: `VERSION` de `somaplay-v24` para `somaplay-v25`. O `SHELL` não muda — nenhum
módulo novo —, mas o cache é cache-first.

## 9. Fechar

- `cd app && node --test` verde, incluindo o teste de append-only do catálogo
- `node --check` nos três arquivos tocados
- verificação no navegador: abrir "Meu Caro Amigo" e clicar no `Ebo` — o popover tem de
  mostrar o diagrama
- commit, PR para `main`, e conferir o deploy com `curl` como no PR #10

## Depois disto

Sobra a cauda: **1.233 acordes sem diagrama**, dos quais 467 são mecânicos (baixo invertido,
sus/add9/6, sétima maior, tensão simples) e 766 exóticos — 60% aparecem numa música só.
Assunto de outra spec.
