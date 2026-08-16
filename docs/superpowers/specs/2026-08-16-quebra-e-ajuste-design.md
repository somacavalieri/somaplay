# Quebra da cifra: caber primeiro, e quebrar onde a música respira

**Data:** 2026-08-16 · **Versão:** 0.13.0

## O problema, como ele apareceu

Usuários reclamaram das cifras extraídas do Songbook Caetano Veloso vol. 1: elas
"ocupam toda a tela e perdem a diagramação", e na *Meu bem, meu mal* apareceu
"uma quebra estranha a partir da terceira linha" com espaço vazio depois.

A queixa nasceu de uma correção anterior minha. O `.cifra-text` tinha
`max-width:720px`; o usuário reclamou de quebras desnecessárias e eu troquei por
`max-width:100%`. O pêndulo foi longe demais.

## O que a medição mostrou

Duas coisas separadas, e só uma era a que parecia.

**1. Na tela larga, no modo texto, nada quebrava.** Os sistemas têm 127–132
colunas e cabiam em ~1750 px. O que o usuário via quebrando era o **modo
miniatura**: cada diagrama ocupa ~65 px, então uma linha com 9 acordes exige
~640 px só de desenho, e é o diagrama — não o texto — que força a quebra.

**2. Quando quebrava, quebrava no lugar errado.** Na *Meu bem, meu mal*,
sistema 3, o corte caía na coluna 65, num vão de **1 espaço**, partindo
`Visão   do | espaço`. Três colunas antes, a coluna 62 está num vão de **9**.

O corte guloso andava para trás a partir do limite e parava no **primeiro**
espaço válido. Um espaço simples entre duas palavras valia tanto quanto um vão
de 26. Medido no acervo inteiro: **54 das 72 quebras caíam em vão de 1–2
espaços**.

## As decisões

### Largura máxima de leitura: 96 colunas

Primeira tentativa: só "caber primeiro". Na tela do usuário (~1650 px úteis,
137 colunas) os sistemas de 132 colunas **cabiam**, então nada mudou — e ele
reprovou de novo, com razão. O ajuste de fonte só age em tela estreita; a queixa
era de tela larga.

O que incomoda não é a quebra, é o **percurso do olho**: acompanhar o par
acorde/sílaba por 132 colunas não funciona. Então existe um teto de leitura, e
acima dele a linha quebra **mesmo cabendo**. Medido nas 11 músicas, 96 colunas
deixa toda quebra em fim de frase; 80 já parte `corro | perigo` na *Como dois e
dois*, porque nem toda frase tem vão largo a cada 80 colunas.

O cap vale para a **medida da quebra**, não para a caixa. Capar a caixa faria o
ajuste de fonte enxergar uma caixa menor e encolher a fonte sem necessidade: a
caixa é a régua do "cabe inteiro?", o cap é a régua do "vale ler tão largo?".

| música | sistemas | fileiras a 96 col |
|---|---|---|
| Como dois e dois | 8 | 15 |
| Eclipse oculto | 13 | 25 |
| Meu bem, meu mal | 6 | 11 |
| Odara | 4 | 6 |

### Caber primeiro, quebrar só no limite

A largura do sistema é a que o livro imprimiu, e quebrar um sistema em dois
desfaz o fraseado que o próprio livro escreveu. Então a fonte encolhe **antes**
de quebrar: cai até o sistema mais largo caber na caixa, com piso de **15 px** —
cifra ilegível na estante não serve para nada. Abaixo do piso a linha quebra
mesmo.

O zoom continua sendo o **teto**: quem aumentou a fonte não a vê diminuir além
do que pediu. O ajuste só encolhe.

Efeito medido na *Meu bem, meu mal* (132 colunas, 6 sistemas):

| caixa | fonte | colunas | fileiras |
|---|---|---|---|
| 1750 px | 20 px | 145 | 6 — sem quebra |
| 1400 px | 17 px | 137 | 6 — sem quebra |
| 1200 px | 15 px | 133 | 6 — sem quebra |
| 1000 px | 15 px | 111 | 11 — quebra na respiração |
| 700 px | 15 px | 77 | 11 — quebra na respiração |

O avanço do caractere é **medido na fonte real**, não os `.6` de chute que o CSS
da tablatura usa: fallback de fonte com avanço diferente sairia estreito.

### Quebrar onde a música respira

O gráfico impresso já codifica a frase como **vão largo** — onde a música
respira, o livro deixa vários espaços seguidos. A quebra passa a procurar isso:
entre os cortes válidos nos últimos 25 % do limite, o que tem o maior
`min(vão na linha de acorde, vão na letra)`.

O **menor** dos dois vãos, porque um vão largo na letra que cai no meio de um
acorde não respira nada — as duas linhas têm de estar folgadas no mesmo ponto.

A janela de 25 % é o preço da troca. Medido no acervo:

| largura | mudança | no meio da frase (vão 1–2) | com respiro (vão ≥ 6) |
|---|---|---|---|
| 72 colunas | antes | 54 | 4 |
| 72 colunas | depois | **35** | **19** |
| 90 colunas | antes | 60 | 5 |
| 90 colunas | depois | **29** | **14** |

Custo: 3 quebras a mais em 72 colunas, ~4 colunas de largura por quebra.

A regra da **migalha** (2026-08-11) continua mandando no equilíbrio das duas
últimas fileiras; a respiração entra lá só como desempate, senão as duas regras
disputam o mesmo corte.

## O que ficou de fora, e por quê

**O modo miniatura continua quebrando em sistema denso.** Cada diagrama ocupa a
mesma largura em px seja qual for a fonte da letra, então encolher o texto não
resolve — ajuda um pouco, porque os acordes ficam mais perto uns dos outros, mas
uma linha de 9 acordes vai quebrar. A quebra agora cai na frase, que era a
queixa. Encolher os diagramas junto é outra mudança.

**Não se acrescentou margem lateral.** A hipótese era que a cifra encostava na
borda; o `.cifra-scroll` já tem 56 px de padding (16 no mobile). Mais margem só
brigaria com o pedido de aproveitar a tela.

## Teste

O contrato de `wrapBlock` já tinha 20 testes de invariante — nenhum fixa a
coluna do corte, então a mudança coube sem reescrevê-los. Foram acrescentados
quatro, sobre o sistema 3 real da *Meu bem, meu mal*.

Um teste existente precisou mudar: *"o predicado só é consultado em corte
válido"* media o contrato pela **contagem** de chamadas (`<= 2`). O proxy
caducou quando a busca pela respiração passou a varrer uma janela de cortes —
todos válidos, e por isso muitos. O contrato agora é verificado direto: nenhum
pedaço entregue ao predicado contém token que não exista inteiro no original. A
contagem virou sinal secundário contra inversão da ordem dos operandos.
