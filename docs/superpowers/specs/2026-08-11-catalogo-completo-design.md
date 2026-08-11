# Encher o catálogo de acordes

**Data:** 2026-08-11
**Estado:** a aprovar
**Vem de:** `2026-08-10-diminutos-no-catalogo-design.md` (as 12 formas + nome canônico)

## O buraco

O `chords-catalog.js` cresceu música a música: cada importação acrescentava o que faltava
naquela música, e nunca houve uma passada sistemática. O resultado, medido contra as 1.032
músicas convertidas do acervo VJ (1.542 acordes distintos):

| | nomes | usos |
|---|---|---|
| o catálogo cobre | 139 | 6.751 |
| **sem forma nenhuma** | **1.403** | **6.256** |

Quase metade das ocorrências abre um popover vazio. E não é cauda exótica: entre os que
faltam estão `F#m7` (136 usos), `F#7` (123), `Cm7` (93), `C7+` (82), `F7+` (81), `F7` (78),
`D/F#` (60), `Bb7` (56), `Fm7` (53).

## Composição do que falta

| família | nomes | usos | exemplos |
|---|---|---|---|
| com extensão | 886 | 2.631 | `D7/9` `C7/9` `E7/9-` `B7(9)` |
| baixo invertido | 350 | 1.249 | `D/F#` `G/A` `E/G#` `Am/G` |
| sétima maior | 62 | 822 | `C7+` `F7+` `A7+` `D7M` |
| sus / add9 / 6 | 76 | 584 | `Am6` `Gm6` `G6` `D4` |
| tríade + 7 | 19 | 754 | `F#m7` `F#7` `Cm7` `F7` |
| tríade simples | 10 | 216 | `Fm` `G#` `Eb` `Bbm` |

Duas leituras importam:

- **167 nomes (2.376 usos) são acordes elementares** — tríades, sétimas, sétimas maiores,
  sextas. Que o catálogo não tenha `Fm` nem `F#m7` é uma lacuna de manutenção, não de
  repertório difícil.
- **55% dos 1.403 aparecem numa única música.** Os 40 mais usados cobrem 1.999 dos 6.256
  usos. Tratar tudo com o mesmo esforço seria desperdício.

## A decisão

**Gerar as formas fora do app, conferir por notas, e commitar no `chords-catalog.js`.**

Não gerar em tempo de execução. É tentador — resolveria qualquer nome, para sempre, sem
inchar arquivo — mas uma forma gerada errada é pior que popover vazio: o usuário toca o
acorde errado sem desconfiar. Forma commitada passa pelo teste em CI toda vez, e pode ser
lida por gente.

O gerador tem três partes:

1. **Parser do nome** → `{ fundamental, qualidade, extensões, baixo }`. É a parte difícil,
   porque a notação brasileira tem sinônimos (`7M` = `7+` = `maj7`), alterações em duas
   grafias (`(5-)` = `(b5)`) e extensão depois da barra (`A7/13`). O `chord-notation.js` já
   resolve parte disso e é onde o conhecimento deve morar.
2. **Conjunto de notas** que o nome exige.
3. **Busca de digitação**: varre as combinações dentro de uma janela de 4 casas e escolhe
   por critério explícito — todas as notas presentes, fundamental (ou o baixo escrito) na
   corda mais grave, sem corda muda no meio, menor posição possível, menos cordas mudas.

**A conferência é a mesma dos diminutos**, e é ela que autoriza confiar no lote: as notas
soantes têm de bater com as que o nome exige, e o baixo com o que está escrito.

## Prioridade

Por uso, não por família. Três lotes, cada um medido e commitado separadamente:

- **Lote 1 — os elementares (167 nomes, 2.376 usos).** Tríades, sétimas, sétimas maiores,
  sus/add9/6. São formas conhecidas; o gerador só evita digitar 167 vezes à mão.
- **Lote 2 — baixo invertido (350 nomes, 1.249 usos).** `X/Y` é a forma de `X` com o baixo
  trocado; sai por regra a partir do lote 1.
- **Lote 3 — a cauda com extensão (886 nomes, 2.631 usos).** Aqui o gerador trabalha de
  verdade. Conferir por amostragem os mais usados.

## Não mexer no que já funciona

Esta é a restrição mais dura da spec, e ela veio de uma preocupação do autor: as digitações
que vêm do songbook e do CifraClub são específicas daquele arranjo, e mudá-las estraga
justamente o que ele conferiu tocando.

Medido na biblioteca real (`bkp/somaplay-backup-2026-08-10 (1).somaplay`):

- **1.055 digitações gravadas em 100 das 174 músicas.** Essas são intocáveis por
  construção: `chordSVG` faz `(dict && dict[name]) || defaultShape(name)` — a digitação da
  música é lida **antes** do catálogo. Nenhum lote pode alterá-las, porque o catálogo nem
  chega a ser consultado para elas.
- **308 registros no dicionário do usuário**, dos quais 306 têm `defaultId` explícito. Para
  esses, `mergeShapes` mantém o padrão do usuário mesmo quando o catálogo ganha o nome: a
  forma nova entra no carrossel "Variar" como alternativa, e o desenho exibido não muda.

**O ponto cego são os registros com variação mas SEM `defaultId`.** Aí o padrão cai para a
forma do catálogo marcada `default: true`, e a variação importada perde o lugar. Hoje isso
vale para exatamente **dois nomes — `Em7` e `F7M`** — e não é efeito de nenhuma mudança
recente: os dois já estavam no catálogo antes. Na prática, o `Em7` do usuário mostra
`0 2 0 0 0 0` (catálogo) enquanto a forma que ele importou, `0 2 2 0 3 0`, está no
carrossel sem ser a padrão.

Isso é uma decisão à parte, não deste lote: **corrigir mudaria o desenho atual desses dois
acordes**, que é exatamente o tipo de mudança retroativa que esta spec quer evitar. Fica
registrado para o autor decidir separadamente.

### O trilho: harness de regressão sobre a biblioteca real

Antes e depois de **cada lote**, rodar sobre o backup do usuário:

1. para cada nome de acorde usado, calcular `defaultShape(nome)` com o dicionário real
   carregado;
2. comparar a lista inteira, forma por forma;
3. **qualquer diferença reprova o lote.**

Não é promessa, é aferição — a mesma lógica que provou "0 linhas perdidas" nos PRs #10 e #12.
Se um lote mudar um desenho que hoje aparece, ele não sobe.

## O que este desenho não promete

**Não promete a "melhor" digitação.** Promete correta e tocável. Onde houver escolha
musical — qual inversão, qual região do braço —, a máquina escolhe a mais baixa e simples,
que nem sempre é a que um violonista usaria. O usuário edita no dicionário, e a edição dele
vence (`mergeShapes` já garante isso).

**Não mexe no que já está publicado.** O `chords-catalog.js` é append-only: o índice da
forma é o id persistido `b:<nome>:<índice>`. Nome que já existe só recebe forma nova **no
fim** do array; nada é reordenado nem removido.

**Só entram nomes que hoje não resolvem para nada.** Nenhum lote acrescenta variação a um
nome que já tem forma — nem do catálogo, nem pela canonização. Isso zera o raio de alcance
sobre o que está funcionando: 200 dos 1.403 nomes já têm registro no dicionário do usuário,
e para todos eles a forma nova entra como alternativa, nunca por cima do padrão dele.

## Um efeito colateral desejado

O mesmo verificador que valida o lote pode rodar sobre o **catálogo inteiro**, como teste
permanente: toda forma publicada tem de soar o acorde do seu nome. Isso trava erro de
digitação futuro — e provavelmente encontra algum já existente. Se encontrar, cada caso vira
decisão explícita (corrigir acrescentando forma nova, nunca editando a antiga no lugar).

## Como saber se deu certo

1. O verificador de notas passa para 100% do lote gerado, dentro do teste.
2. Aferição sobre o acervo: nomes cobertos e usos cobertos, antes e depois de cada lote.
   Alvo do lote 1: cobertura de usos passa de 52% para ~70%.
3. Nenhum nome perde forma (regressão zero), como nos PRs #11 e #12.
4. Verificação no navegador por amostragem: abrir 3 músicas de estilos diferentes e conferir
   os diagramas dos acordes mais usados contra uma referência.

## Distribuição

`chords-catalog.js` está no `SHELL` e o Service Worker é cache-first: cada lote sobe o
`VERSION` (hoje `somaplay-v26`).
