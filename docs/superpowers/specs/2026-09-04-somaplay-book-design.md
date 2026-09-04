# Soma_play — O livro de arquivos `.somaplay` — design

**Data:** 2026-09-04 · **Estado:** especificado
**Origem:** pedido do usuário — "eu fui gerando vários arquivos separados, e eles estão
desorganizados ao ponto de eu não poder consumir e compartilhar facilmente. Eu quero criar,
como se fosse uma espécie de livro, em que eu vou ter todas essas fontes de dados
organizadas em sessões por artistas, músicas, estilos (…) e eu posso ir baixando por
demanda também e não necessariamente ter que andar sempre com todos os arquivos baixados."
Com a pasta `chords/-somaplay-book/` já criada à mão, vazia, com as seções previstas.

## O problema

Há meses de `.somaplay` avulsos espalhados — onze na raiz do repositório, dezesseis em
`bkp/`, outros em pastas de trabalho. Cada um nasceu de um recorte feito à mão na hora de
resolver alguma coisa (`forca-estranha-cifraclub.somaplay`, `gil-songbook-vol2-lote1.somaplay`,
`fix-andanca-cifra.somaplay`), e nenhum deles diz de que estado da biblioteca veio. Juntos
eles não formam uma coleção: formam um sedimento.

O sintoma que o usuário relata é de contagem — "a quantidade de arquivos não bate". A causa
não é aritmética. É que **existem duas verdades**: a biblioteca dentro do app e a pasta de
arquivos fora dele, cada uma andando por conta própria, e nenhuma das duas sabendo dizer o
que a outra tem. Reconciliar as duas arquivo a arquivo seria trabalho infinito e recorrente:
elas voltariam a divergir na semana seguinte.

### O que a biblioteca é, medido

Do backup completo `bkp/somaplay-backup-2026-09-04.somaplay` (840 MB):

| | |
|---|---|
| artistas | 284 |
| músicas | 6.169 — **6.168 delas cifra de texto** |
| listas | 10 |
| livros | 35 |
| blobs | 79, somando **826 MB** |

| Fonte | Músicas | Artistas | Estilos | O que é |
|---|---|---|---|---|
| VJ | 5.523 | 169 | 9 | o acervo `.doc` do Vitor |
| Songbook | 189 | 26 | 6 | extrações do pipeline `/chord` |
| RV | 180 | 82 | 11 | songbook do Rodrigo Vianna (PDF nativo) |
| CifraClub | 164 | 89 | 15 | capturas do CifraClub |
| RN | 108 | 36 | 3 | os dois cadernos do Rafa Nascimento |
| Vitale | 2 | 1 | 1 | edição Vitale, duas do Cartola |
| *(sem fonte)* | 3 | 3 | 1 | |

Quatro medições decidem o resto do documento:

1. **826 dos 840 MB são os 35 PDFs de livro.** Toda a biblioteca sem livros cabe em 13,6 MB
   de JSON. O "baixar sob demanda" que motivou o pedido é, na prática, uma questão apenas de
   `books/`; o resto cabe inteiro em qualquer aparelho.
2. **Os módulos do app importam no Node.** `backup.js`, `state.js`, `partes.js` e `books.js`
   carregam sem browser — as APIs de DOM e IndexedDB só são tocadas dentro das funções.
   Verificado com `node -e "import('./js/backup.js')"`. Isso muda o custo do projeto: o
   compilador não precisa reimplementar a exportação, ele a chama.
3. **537 títulos colidem dentro da mesma fonte** (`VJ/fotografia`, `CifraClub/força estranha`).
   Incluir o artista no caminho derruba isso para **1**.
4. **O `chordbook` pesa 252 KB** e `exportLibrary` o inclui sempre que `partes` contém
   `cifra`. Em 6.169 arquivos de música seriam 1,5 GB de dicionário repetido para 13,6 MB
   de música.

## Decisão

### O princípio: uma verdade, e ela é o app

**A biblioteca do app é a única fonte de verdade. `chords/-somaplay-book/` é inteiramente
derivada e regenerável.** Nenhum arquivo lá é escrito à mão, nenhum é editado no lugar. O
ciclo é: exportar um backup completo no app → rodar o compilador → a pasta nasce de novo.

É isto que dissolve o problema em vez de administrá-lo. Não existe divergência possível
entre duas coisas quando uma é função da outra; quando algo "não bate", a resposta é sempre
a mesma e é sempre barata — o app está certo, recompile. Os avulsos de hoje deixam de ser
uma coleção a manter e viram o que sempre foram: rascunhos, que podem ser jogados fora
depois que o livro existir.

As duas alternativas consideradas e por que caíram:

- **Reconciliar os avulsos** (ler cada um, casar com a biblioteca, renomear e arquivar).
  Resolve a foto de hoje e não impede a próxima divergência. O trabalho voltaria inteiro no
  mês seguinte.
- **Exportar tudo pela interface do app.** É possível — a tela de Settings já exporta por
  fonte, por lista e por artista. Seriam 6.673 idas ao diálogo de exportação, cada uma com
  uma escolha de destino. Além de inviável na primeira vez, tornaria a recompilação um ritual
  caro demais para acontecer, e o livro voltaria a envelhecer.

### A estrutura

```
chords/-somaplay-book/
  CATALOGO.md                                        ← totais + de qual backup veio
  sources/  <fonte>.somaplay                              7 arquivos
  artists/  <Fonte>/<artista>.somaplay                  406
  songs/    <Fonte>/<Artista>/<musica>.somaplay       6.169
  style/    <Fonte>/<estilo>.somaplay                    46
  lists/    <lista>.somaplay                             10
  books/    <livro>.somaplay                             35   ← 826 MB
```

**6.673 arquivos, ~880 MB, dos quais 826 MB em `books/`.** Tudo que não é livro soma 57 MB.

**Por que a fonte é o primeiro eixo em `artists/`, `songs/` e `style/`.** 76 artistas
existem em mais de uma fonte — Cartola, Tom Jobim, Gilberto Gil, Chico Buarque. Sem o corte
por fonte, `artists/cartola.somaplay` misturaria a versão do VJ com a do Songbook e com a
do Vitale numa coisa que não corresponde a nada que se possa conferir contra o material
original. O corte por fonte é o que mantém cada arquivo rastreável até de onde a cifra veio.

**As sete pastas de fonte usam a grafia exata da biblioteca:** `VJ`, `CifraClub`, `Songbook`,
`RV`, `RN`, `Vitale`, `_sem-fonte`. Não são inventadas nem agrupadas — são as mesmas que a
faixa de fontes do app mostra, e é isso que faz "o que eu filtro na tela" e "o que eu baixo
da pasta" serem a mesma coisa. As pastas `cifraclub/` e `songbook/` criadas à mão são
renomeadas para a grafia da biblioteca. O sublinhado em `_sem-fonte` é deliberado: ordena
antes de tudo e não pode colidir com nome de fonte real.

**Pasta de artista com o nome legível (`Chico Buarque/`), arquivo em slug
(`construcao.somaplay`).** A pasta é para o olho de quem navega no Drive; o nome do arquivo
vai parar numa pasta de Downloads, num anexo de mensagem, num aparelho alheio, e precisa
sobreviver a qualquer sistema de arquivos. O slug é o mesmo de `backup.js`: NFD, sem acento,
minúsculo, não-alfanumérico vira hífen.

**Por que o livro não usa `nomeDoExport`.** A função existe e é boa no que faz, mas resolve
outro problema: nomear um arquivo solto que vai cair na pasta de Downloads, onde a data e o
qualificador (`-cifras`, `-audio`) são a única pista do que ele é. No livro, a posição na
hierarquia já diz tudo isso, e um `somaplay-cartola-2026-09-04.somaplay` dentro de
`artists/VJ/` só repetiria com ruído o que a pasta afirma. Dois esquemas de nome, dois
lugares, de propósito.

### O que cada arquivo carrega

| | `partes` | `lists` | `chordbook` |
|---|---|---|---|
| `sources/` | `cifra, anotacoes` | as 10, inteiras | **sim** |
| `artists/` `songs/` `style/` | `cifra, anotacoes` | `[]` | não |
| `lists/` | `cifra, anotacoes` | a lista, sozinha | não |
| `books/` | `livros` | `[]` | não |

**`audio` nunca é declarado.** Todo registro de música tem `stems: []` e `full: []`
*presentes* — e `copiaCampos` copia por `k in src`, não por valor definido. Um arquivo que
declarasse `audio` levaria os dois vazios, e `fundeMusica` gravaria `[]` por cima dos stems
do destino. Só 2 músicas na biblioteca têm áudio de verdade; o risco não paga o ganho. Se um
dia houver acervo de áudio, ele entra como uma seção própria com `partes: ['audio']`, onde
os vazios não existem porque o recorte é justamente quem os tem.

**`pessoal` nunca é declarado.** Fora ficam `favorita` e `createdAt`. A consequência de
deixar `createdAt` de fora é deliberada e boa: `fundeMusica` data a música com o relógio da
importação, então o que chega aparece no topo de Recentes em vez de afundar no epoch. E
mantém cada arquivo compartilhável sem sobrescrever as favoritas de quem recebe — o mesmo
arquivo serve para reimportar e para dar de presente.

**`chordbook` só em `sources/`.** São 252 KB por arquivo; multiplicados por 6.169 seriam
1,5 GB de dicionário duplicado. Quem quer o dicionário de acordes importa a fonte, que é o
arquivo que já se propõe a ser completo. Esta é a única divergência consciente em relação a
`exportLibrary`, que o inclui sempre que há `cifra` — lá a premissa é "um arquivo por vez,
escolhido a dedo", aqui é "milhares de arquivos gerados", e a premissa muda a conta.

**As listas não viajam nos arquivos de música.** A regra do app — listas viajam inteiras,
com ids órfãos, porque os órfãos se curam quando a outra fonte chega (`state.js:123`) —
vale para um recorte por fonte, e por isso os sete arquivos de `sources/` a seguem. Não vale
para um arquivo de uma música: importar "Construção" não deve criar dez listas na biblioteca
de quem recebe. Em `lists/`, cada arquivo leva a sua lista e as músicas presentes nela.

### O compilador

`scripts/somaplay_book/`, Node, sem dependências, como o resto do projeto.

**Ele importa as funções do próprio app**, e essa é a decisão de arquitetura que mais importa
aqui:

| Função | Módulo | Papel |
|---|---|---|
| `recorteParaExport` | `app/js/backup.js` | o recorte de artistas/músicas/listas |
| `podaPorPartes` | `app/js/partes.js` | quais campos viajam, dado `partes` |
| `songIdsDasFontes` | `app/js/state.js` | o eixo fonte, com o casamento de grafia |
| `blobIdsDasMusicas` | `app/js/state.js` | quais bytes são desta música |
| `blobIdsDosLivros` | `app/js/books.js` | quais bytes são deste livro |

O CLAUDE.md avisa, sobre `CAMPOS`, que um campo novo que não entre no mapa "some
silenciosamente de todo compartilhamento — o pior tipo de bug, porque o caminho que você
testa é o que funciona". Um compilador com a sua própria cópia da regra de poda seria
exatamente essa segunda verdade, e a divergência apareceria só meses depois, num arquivo
gerado que perdeu um campo. Chamando as funções do app, o livro herda cada campo novo sem
que ninguém precise lembrar dele.

**O único código novo é `container.mjs`:** ler e escrever o formato
`SOMAPLAY1\n` + tamanho do JSON em 10 dígitos + `\n` + JSON + bytes dos blobs concatenados.
A leitura é por offset — o índice `id → (posição, tamanho)` sai do array `blobs` do manifesto
e do tamanho do cabeçalho, e a escrita de um livro copia o intervalo direto do backup para o
arquivo de saída. 826 MB nunca passam pela memória.

O resto do compilador é agrupamento: montar conjuntos de ids e chamar as funções acima uma
vez por arquivo.

### Colisões de nome

Com fonte, artista e música no caminho, sobra **uma** colisão em 6.169: Tom Jobim / "Samba
de uma nota só", duas vezes na fonte Songbook — uma duplicata real da biblioteca, não um
defeito do esquema de nomes.

O compilador **não sobrescreve calado nem aborta**. Escreve com sufixo determinístico (`-2`,
`-3`, por ordem de `id`, para que recompilar dê sempre o mesmo resultado) e lista o caso numa
seção **"A conferir"** do `CATALOGO.md`. Sobrescrever esconderia uma música; abortar
transformaria uma duplicata de dois registros num bloqueio para os outros 6.167. Escrever e
apontar deixa o livro completo e a pendência visível, para ser resolvida onde ela de fato
mora — no app.

### O índice

`CATALOGO.md` no topo e um `INDICE.md` por seção, ambos gerados. Mesma convenção do acervo
(`INDICE.md` por documento, `PROGRESSO.md` agregado, gerados por `scripts/chords/progresso.py`),
pelo mesmo motivo: markdown lê bem no Drive e no GitHub, procura com Cmd+F e sobrevive a não
ter ferramenta nenhuma à mão.

O `CATALOGO.md` registra **de qual backup a pasta nasceu** (nome do arquivo e data) e os
totais por seção. É onde a pergunta "está batendo?" se responde: comparar o número no
catálogo com o número na tela do app é uma conferência de dois segundos, e quando divergem a
ação é uma só, recompilar.

Diferente do acervo em `chords/`, aqui **não há prosa escrita à mão para preservar** — a
pasta inteira é gerada, então não existe a região `<!-- chord:auto -->` que `progresso.py`
precisa respeitar. Os arquivos são reescritos por completo.

## Consequências

**Nada disso entra no git.** `*.somaplay`, `/chords/` e `bkp/` já estão no `.gitignore`
(verificado). O conteúdo é musical e de terceiros, e a regra do projeto — "no third-party
musical content in the repo" — vale igual para arquivo gerado. Versionado é só o compilador,
em `scripts/somaplay_book/`.

**O livro é descartável, e isso é a característica, não a limitação.** Apagar
`chords/-somaplay-book/` inteiro não perde nada que um backup e um comando não devolvam.

**Os `.somaplay` avulsos da raiz e das pastas de trabalho ficam órfãos de propósito.** Não
são migrados nem convertidos: quando o livro existir e for conferido, eles podem ser
apagados. Os de `bkp/` continuam sendo o que são — backups datados, a matéria-prima.

**Regenerar é o caminho normal, não a exceção.** Custo medido: 13,6 MB de JSON e 6.169
arquivos pequenos, que é questão de segundos; `books/` é a única parte lenta (826 MB de
cópia), e por isso fica atrás de uma opção própria em vez de rodar por padrão.

## Verificação

Três camadas, e a terceira é a que conta:

1. **`node --test`** para as funções puras novas — slug, montagem de caminho, resolução de
   colisão, geração do índice, e um round-trip do `container.mjs` (escrever e reler um
   arquivo com blobs, byte a byte).
2. **Releitura com o código do app.** Todo arquivo gerado é relido com o `lerManifest` do
   próprio `backup.js`, e as contagens de artistas/músicas/listas conferidas contra o que o
   compilador achou que estava escrevendo. Um arquivo que o app não consegue abrir falha a
   compilação.
3. **Importação real no navegador.** Antes de declarar qualquer etapa pronta: importar no app
   um arquivo de cada seção gerada e confirmar que a biblioteca ganhou o que devia e não
   perdeu o que não devia — em particular que stems, favoritas e datas continuam onde
   estavam. É a única camada que prova a regra de `partes`, porque é a única que executa o
   merge de verdade.

## Etapas

| | Entrega | Prova |
|---|---|---|
| 0 | `container.mjs` + testes de round-trip | `node --test` |
| 1 | `sources/` (7) + `CATALOGO.md` | importar um no app; conferir totais |
| 2 | `artists/` (406) + `style/` (46) | importar um artista |
| 3 | `lists/` (10) | importar uma lista; conferir a ordem |
| 4 | `songs/` (6.169) | importar uma música; conferir colisão resolvida |
| 5 | `books/` (35, 826 MB) | importar um livro; conferir o PDF abre |

A ordem é do agregado para o particular, como o usuário propôs: a etapa 1 exercita o
compilador inteiro ponta a ponta com sete arquivos, e o que vem depois só troca o critério
de agrupamento. `books/` fica por último e sozinha por ser a única com bytes pesados e o
único caminho que passa por `blobIdsDosLivros`.
