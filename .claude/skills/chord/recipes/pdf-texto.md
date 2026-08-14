# Recipe: `pdf-texto` — PDF nativo, com camada de texto

O caso barato. A posição de cada glifo já vem no arquivo: **sem OCR, sem medir
pixel, sem transcrever da imagem**. O que sobra é reconstruir a cifra a partir das
coordenadas e conferir. Medido nos dois volumes do Rodrigo Vianna (PDFelement 6);
o extrator é `scripts/new_songbook/extract_rv.py`.

**O barato não é o fácil.** Nenhuma das armadilhas abaixo dá erro: todas produzem
cifra que abre no app e está errada ou incompleta.

## Confirmar que é `pdf-texto`

```python
len(doc[i].get_text().strip())     # >0 na maioria das páginas
```

Scan com OCR também devolve texto, mas sem posição confiável por glifo. O teste
que decide: `get_text("rawdict")` traz `chars` com `bbox` individual e coerente.

## Reconstruir a cifra

O extrator faz isto; a recipe explica o **porquê**, que é o que se perde ao mexer.

### A cor separa acorde de letra — não a fonte, não o tamanho

No Rodrigo Vianna: acorde vermelho, letra `#000000`, rótulo do diagrama
`#333333`, número de dedo `#ffffff`, cabeçalho/rodapé `#c0c0c0`.

**Testar a cor, não comparar.** O vol. 3 usa `#ff0033` em 65 páginas e `#ff0000`
em 14 — comparar com um valor só fazia **10 das 60** músicas saírem sem acorde
nenhum. O teste é "avermelhado": R alto, G e B baixos. Os outros tons do livro
são neutros (r=g=b), então não há com o que colidir.

Separar por tamanho **não** funciona: o rótulo do diagrama é 15pt e a raiz do
acorde é 14pt.

### Metade dos espaços da letra é falsa

O PDFelement quebra a palavra em saltos de kerning, e o extrator lê `A Rit a lev
ou` onde está escrito `A Rita levou`. Não dá para corrigir por dicionário — o
defeito atinge t, v, x e g, e "internet e" viraria "internete".

**Corrige-se por medida.** O espaço de verdade é o avanço do glifo espaço da
Helvetica: **0.278 do corpo**, em qualquer tamanho (3.89pt a 14pt, 3.34pt a
12pt). Qualquer coisa mais estreita é kerning. O corte fica logo abaixo de 0.278
e **não pode ser mais baixo**: a 12pt o espaço falso mede 0.22 do corpo.

Vale para o cabeçalho tanto quanto para o corpo — sem isso o artista sai
`Dj avan`, `W ando`, `I van Lins`, e cada grafia dessas cria um artista novo numa
biblioteca que reaproveita por **nome**.

### O nome do acorde se monta na ordem canônica, não pela coordenada

A extensão vem **empilhada**, em spans miúdos na mesma coluna: 6 sobre 9 é
`C6/9`; 7 sobre (b9) é `A7(b9)`. Dentro da pilha manda o y. **Entre a pilha e os
outros pedaços, manda a ordem canônica da cifra** — qualidade → extensão → tensão
→ baixo:

    Em7(b5)      m antes da pilha
    Bb7(4)(9)    pilha antes da tensão
    C7M(6)/G     pilha antes do baixo

Ordenar por x parece funcionar e não funciona: pilha e tensão ficam na mesma
coluna, separadas por décimos de ponto **cujo sinal muda de acorde para acorde**.
`D7(9)(#11)` saía certo por 0,1pt; `Bb7(4)(9)` virava `Bb(9)7(4)` por 0,3pt. E um
token reprovado pelo `isChordTok` derruba a linha inteira, levando junto os
acordes vizinhos, que estavam certos.

Agrupar a pilha pelo **centro**, não pela borda: os dois elementos são centrados
um sobre o outro e o mais largo começa antes — em `A7(b9)` são 5pt de diferença
na borda e 0,5pt no centro.

### Cabeçalho e grade de diagramas: como descartar

- **Cabeçalho** (título, artista, compositor) — só existe na página que ABRE uma
  música, e ela se reconhece pelo título, o único texto acima de 20pt. **Página
  de continuação não leva corte nenhum**: assumir que tinha, com corte fixo em
  11% da altura, comeu os dez primeiros acordes de uma página no vol. 3. Abaixo
  do título, descer de linha em linha enquanto houver **parênteses** (artista e
  compositor são parentéticos) em vez de somar margem fixa — no vol. 1 a cifra
  começa **6pt** abaixo do artista.
- **Grade de diagramas** — o app desenha a sua, então a do livro é lixo.
  Descartar por **retângulo**, nunca por altura: a grade mora no alto da coluna
  esquerda e um corte horizontal levaria junto o começo da coluna **direita**,
  que nessa altura já é cifra. No vol. 3 o retângulo se acha pelos números de
  dedo brancos; **no vol. 1 não há número branco**, e a grade sai pela cor do
  rótulo. Não confiar na cor do rótulo sozinha: ele é `#333333` em quase todo o
  vol. 3 e **preto** numa página.

### Duas miudezas que custam caro

- **Spans duplicados por sobreimpressão**, invisíveis no papel: as duas extensões
  caem na mesma raiz e sai `Gm11/Bbm11/Bb`. Descartar span idêntico na mesma
  coordenada.
- **Corpo do texto não é constante**: uma página inteira do vol. 3 está reduzida
  a 12pt. Limiar fixo para achar a raiz do acorde deixava a música sem acorde —
  os três níveis (raiz 1.0, sufixo ~0.78, pilha ~0.5) são **proporcionais**.

## O menu interativo: use, mas confira

Quando existe, cada entrada aponta para a página da música e o mapa de páginas
sai de graça — é o que torna este tipo o mais barato do acervo. **Mas ele mente.**

No vol. 1 do Rodrigo Vianna: o link de `28. LEMBRA DE MIM` aponta para a p.6, que
é outra música; o menu numera até 60 e tem 59 entradas; e grafa `FLOR DE LIZ`
onde a página diz *Flor de lis*. Seguir os links entrega 59 destinos e **perde uma
música em silêncio**.

**A fonte de verdade é o cabeçalho de cada página** — título e artista. Varrer as
páginas por ele dá o índice, e o menu vira conferência cruzada: quantas entradas
casam com a página que o número impresso prevê. No vol. 1, 58 de 59 casam com
`PDF = impressa + 1`, e a única divergência é grafia.

## Conferir

As duas conferências do `SKILL.md`, e aqui a segunda é barata porque a grade de
acordes impressa quase sempre existe:

1. **bem formada?** — `parseCifraText` do app sobre o texto de cada música.
   Ao medir linha perdida, **não** filtrar por `hasLyric && !hasChords`: o parser
   emparelha linha de acorde com a de baixo, e a linha de introdução costuma
   entrar como a *letra* do par de `Tom:`. Contar toda string `lyric`. Esse ponto
   cego fez a medição do vol. 3 dizer 6 quando eram 11.
2. **completa?** — cruzar com a grade de diagramas impressa. Foi ela que achou
   três bugs que o parser não tinha como achar, todos gerando cifra bem formada e
   incompleta. Comparar como **conjunto** e classificar cada diferença em *perda
   real* x *grade extra*; o diff cru mente. E o parse da grade não é verdade
   absoluta: excluir a linha do compositor e desconfiar dos nomes empilhados
   complexos, que erram pelos mesmos motivos que o corpo errava.

## Decisões que se repetem

- **Notação do livro não se renota.** O vol. 1 imprime `Bbb5/7` (= `Bb7(b5)`), que
  o `isChordTok` do app não aceita. Reescrever mudaria a contagem de caracteres e
  deslocaria a linha — é a primeira regra do projeto. Vira **⚠️** com a pendência
  anotada, e a saída real é o app aceitar a notação.
- **Rótulo com abreviatura** (`Intro.:`, `Intr.:`, `Introd.:`, `2X`) o app também
  não lê: `LABEL_DOISPONTOS` aceita `Intro:` sem o ponto. Mesmo tratamento.
- **Tom** costuma vir impresso em poucas músicas (11 de 60 no vol. 3, 5 de 60 no
  vol. 1). Inferir pela concordância entre primeiro e último acorde; onde não
  concordarem, pelo primeiro acorde quando ele for de qualidade tônica; onde nem
  isso decidir, **deixar vazio** e dizer que está vazio. Marcar *(inf.)* no
  `INDICE.md`: o app mostra esse campo, e chute silencioso vira erro invisível.
- **Estilo nunca vem do livro** — é atribuição nossa, restrita aos valores que a
  biblioteca já usa.
- **A cifra não vai para o módulo do livro.** Em PDF nativo o extrator a
  reconstrói na geração, e `books/<slug>.py` guarda só metadado. É o que mantém
  letra de terceiro fora do repositório sem custo nenhum.
