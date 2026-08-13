# Recipe: `pdf-texto` — PDF nativo com camada de texto

O caso barato. Um PDF com camada de texto **muda a ordem de grandeza do
trabalho**, não a margem: não há OCR, não há medição de pixel, e o mapa de
páginas costuma vir de graça. Referência viva: o Rodrigo Vianna vol. 3
(`chords/-new-songbook/Rodrigo Vianna Vol 3/INDICE.md`), 60 músicas de 42
artistas, extraídas todas.

Comparado ao scan:

| | scan Chediak | PDF nativo |
|---|---|---|
| ler a cifra | medir tinta em pixel, ou transcrever da imagem | vem do arquivo |
| mapa de páginas | fólio a fólio, offset que muda no meio | links do índice interativo |
| conferir | música a música contra o impresso | **idem — é o que sobra de trabalho** |

## Antes de tudo: confirmar que a camada é de verdade

Nem todo PDF com texto tem texto útil. O
`611997521-fdocuments-in-caetano-veloso-vol-2` tem "camada de texto" que é só o
cabeçalho do slidepdf, não OCR. E scan com OCR (Chico vol. 1) é `pdf-scan`, não
`pdf-texto`: o OCR é péssimo para acorde (`G7(13)` vira `G⁻(13)`, `I` vira `l`)
mas ótimo para localizar título, `Copyright` e trechos de letra.

Critério: **os acordes saem corretos dos spans?** Se não, é `pdf-scan`.

## Mapa de páginas

Um PDF nativo montado a partir de um site costuma **não ter paginação impressa**
— só existe página do PDF. Nesse caso não há mapa a levantar, e o índice sai dos
**links do índice interativo**. Foi o gargalo do Gil vol. 2 e do Bossa Nova 1;
aqui ele simplesmente não existe.

Registrar no `INDICE.md`: páginas em branco, páginas de template antigo, e
quantas músicas ocupam 1 e quantas ocupam 2 páginas.

## A cifra NÃO fica escrita no módulo

Esta é a regra que vale mais neste tipo. O módulo do livro guarda **só metadado**
e chama o extrator na geração; a cifra é reconstruída do PDF a cada `make_somaplay`.
É o que mantém letra de terceiro fora do código — mesmo o código sendo gitignored.

`scripts/new_songbook/extract_rv.py` é o modelo (`--indice`, ou `<pág> [pág]`).

## As sete armadilhas medidas

Nenhuma é visível lendo o arquivo por cima. Cada uma apareceu como sintoma, e o
sintoma quase nunca aponta para a causa.

| O que parece | O que é | O que quebrou |
|---|---|---|
| o acorde é vermelho `#ff0033` | são **dois vermelhos**: `#ff0033` em 65 páginas, `#ff0000` em 14 | **10 das 60** saíam sem acorde nenhum |
| os espaços da letra são espaços | metade é **salto de kerning**. O espaço real é o avanço do glifo da Helvetica, 0.278 do corpo, em qualquer tamanho; o falso é mais estreito | "A Rit a lev ou" no lugar de "A Rita levou" |
| a ordem dos pedaços do acorde sai da posição | é a **ordem canônica da cifra** (qualidade → extensão → tensão → baixo). Pilha e tensão ficam na *mesma* coluna, separadas por décimos de ponto cujo **sinal muda de acorde para acorde** | `Bb7(4)(9)` virava `Bb(9)7(4)` por 0,3 pt |
| toda página tem título e cabeçalho | **página que abre música ≠ página de continuação**; a de continuação começa com cifra no alto | corte fixo em 11% da altura comeu os **dez primeiros acordes** de uma página |
| a grade de diagramas se descarta pela cor do rótulo | o rótulo é cinza em quase todo o livro e **preto numa página** — cor da letra. Descartar por **retângulo**, achado pelos números de dedo brancos | descartar por altura levava junto a coluna direita, que ali já era cifra |
| cada elemento aparece uma vez | algumas páginas trazem **spans duplicados** por sobreimpressão, invisível no papel | as duas extensões caíam na mesma raiz: `Gm11/Bbm11/Bb` |
| o corpo do texto é 14 pt | uma página está **inteira reduzida** a 12 pt | corte fixo em 13 pt para achar a raiz do acorde deixava a música sem acorde |

E um detalhe do livro: o marcador `[2]` anda colado no acorde e às vezes **no
meio dele** (`D[2]/E`). Tem de sair como token à parte, no fim — no meio, parte o
acorde em dois e derruba a linha.

## Metadado que o PDF não traz

- **Tom**: quando impresso, ler. Quando não, inferir do primeiro/último acorde e
  **marcar como inferido** no índice. Quando a cifra não decide, **deixar vazio**
  — vazio é melhor que errado. Três das 60 do Rodrigo Vianna ficaram sem tom de
  propósito.
- **Estilo**: atribuir por artista/música, **restrito aos valores que a
  biblioteca já usa**. Não criar estilo novo sem necessidade.
- **Artista**: numa coletânea, cada música tem o seu. Corrigir grafia errada do
  índice (o livro escreve "Dona Yovone Lara"; o certo é Dona Ivone Lara) — artista
  é reaproveitado por nome, e o errado cria um duplicado que nenhum import futuro
  casa. O `INDICE` do módulo fica fiel ao impresso; a correção mora na chamada de
  `musica(artista=…)`.
- **`fonte`**: coletânea de site não é `Songbook`. O Rodrigo Vianna é `RV`, como o
  acervo do Vitor é `VJ`.

## Conferir

As duas conferências de sempre. Duas armadilhas ao **medir** o resultado, que
deram número errado antes de serem notadas:

- **contar linha perdida como `hasLyric && !hasChords` subestima.** O parser
  emparelha linha de acorde com a de baixo, e a linha de introdução costuma
  entrar como a *letra* do par de `Tom:` — tem `hasChords` verdadeiro e escapa do
  filtro. Contar **toda** string `lyric`. Isso disse 6 quando eram 11;
- **o parse da grade não é verdade absoluta.** Excluir a linha do compositor (que
  entra se o retângulo esticar para cima) e comparar como **conjunto**,
  classificando cada diferença em *perda real* x *grade extra*. O diff cru mente.

### A linha `Intro.:`, que o app não lê

`LABEL_DOISPONTOS` em `chords.js` aceita `Intro:` mas **não o ponto de
abreviatura** antes dos dois-pontos, e `MARK` aceita `x2` mas não `2X`. O efeito é
local — aquela linha vira letra, sem diagrama e sem popover — e só atrapalha de
verdade quando um acorde aparece **apenas** ali, saindo do painel "Acordes desta
música".

É **limitação do app, não erro de extração**. Duas saídas, nenhuma tomada ainda:
mudar o app (passa por spec → plano) ou normalizar `Intro.:` → `Intro: ` no
extrator preservando o comprimento, para não deslocar as colunas. A segunda mexe
no texto do impresso. Enquanto não houver decisão, a música vale **⚠️**, com o
acorde preso anotado.
