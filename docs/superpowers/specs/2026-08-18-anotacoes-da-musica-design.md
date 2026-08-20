# Soma_play — Anotações da música — design

**Data:** 2026-08-18 · **Versão:** 0.16.0

## O problema

O app só lê. A música tem cifra, áudio, letra, tom — e nenhum lugar onde escrever
sobre ela.

A conversa que originou este spec foi uma entrevista com a persona do **professor
de violão online**, e ela devolveu uma lista grande: anotação presa a um trecho,
bloco de batida, bloco de progressão, digitação customizada, relatório de estudo.
O usuário cortou tudo isso deliberadamente e ficou com **uma seção de texto
livre por música**. O corte é bom: um editor de texto rico é a base de todos os
itens da lista. Se ele não funcionar num tablet, os blocos musicais não salvam;
se funcionar, eles viram blocos *dentro* dele depois.

O que se quer escrever ali, em ordem de frequência esperada: comentário do
professor, progressão de acordes, batida descrita em palavras, lembrete de
andamento, link de vídeo.

E o modo dominante de entrada **não é digitar, é colar** — de um Word, do Google
Docs, de uma mensagem de WhatsApp, de um site de cifras. Isso não é um detalhe de
implementação; é o que decide o formato de armazenamento.

## Decisão

### 1. Uma folha em branco, não um formulário

Nada de campos "progressão", "batida", "observações". O conteúdo é heterogêneo e
ainda não se sabe qual estrutura ele quer — estruturar agora é chutar. A seção é
um documento, e o usuário organiza como quiser.

O único recurso que existe por razão musical é o **bloco alinhado**
(monoespaçado): quem cola `| Am | F | C | G |`, ou duas linhas de acorde sobre
letra, precisa que o alinhamento por coluna sobreviva. Numa fonte proporcional
ele se desfaz. É o mesmo `<pre>` que um editor de código teria, com outro rótulo,
e entrega boa parte do que os blocos musicais dedicados entregariam.

### 2. `anotacoes` é uma parte própria do arquivo

Esta é a decisão central, e ela não é óbvia.

A anotação **viaja com a música** — é conteúdo que o professor dá ao aluno, não
gosto pessoal do remetente. Isso a tira de `pessoal`, que por decisão explícita
(`sharesheet.js:8`) nunca é compartilhada.

Mas ela também **não pode morar dentro de `cifra`**. O cenário que quebra:

1. O professor manda a música com as anotações da aula.
2. O aluno escreve as observações dele por cima, na mesma seção.
3. O professor corrige um acorde e reenvia **só a cifra**.
4. O merge sobrescreve, e tudo que o aluno escreveu some, sem aviso.

O passo 3 é justamente o que o sistema de partes existe para tornar seguro — "o
arquivo não fala de áudio" deixou de significar "apague o áudio". Enfiar a
anotação em `cifra` desfaz essa garantia no único campo em que o usuário digitou
texto à mão.

Então `anotacoes` é uma **quarta parte**. O vocabulário de partes é exatamente
para isso: "este arquivo fala de anotações" é uma frase legítima nele. Com isso:

| ação do professor | partes declaradas | efeito no aluno |
|---|---|---|
| manda a aula nova | `cifra` + `anotacoes` | sobrescreve a anotação — desejado |
| corrige um acorde | `cifra` | o que o aluno escreveu fica intacto |
| manda o pacote de áudio | `audio` | nada a ver |

A alternativa — manter em `cifra` e proteger com um `if` dentro do merge — foi
descartada. `partes.js` tem exatamente uma regra e se orgulha disso: campo de
parte não declarada não se toca. Um caso especial ali é a primeira rachadura.

**Sobre o nome.** Parte e campo se chamam ambos `anotacoes`, e há precedente
(a parte `cifra` contém um campo `cifra`). Descartei `notas`, que é mais curto e
seria a escolha natural — num app de música "notas" lê como notas musicais.

### 3. O formato é HTML com lista branca

Texto puro seria mais simples e mata o requisito: sem negrito, sem lista, sem
marca-texto, o professor perde o destaque do "ATENÇÃO aqui". O pedido foi
explicitamente "estilo Word".

HTML rico salvo cru é a rota fácil e a que cobra depois. O problema não é o
tamanho do HTML — é o **HTML colado**. Um parágrafo de 300 bytes vindo do Word
chega envolto em `<span style="font-family:Calibri;mso-...">` por palavra, mais
`<o:p>` e comentários condicionais; do Google Docs vem `<b style="font-weight:
normal">` em volta de tudo. O mesmo parágrafo vira 15–30 KB.

E o peso nem é o pior. Aquele HTML traz **cor e fonte grudadas**: texto colado do
Word chega preto sobre branco e desaparece no tema escuro do app. Não é
performance, é a anotação ficando ilegível.

A solução não é abrir mão de formatação, é filtrar na entrada. A lista branca:

```
p  br  strong  em  u  s  h3  ul  ol  li  blockquote  mark  pre  a[href]
```

E **nada mais**: zero `style`, zero `class`, zero `span`, zero `font`, zero
tabela. `a[href]` só com esquema `http`, `https` ou `mailto`.

O que a lista branca dá de graça:

- **O peso volta ao normal.** Sobra a estrutura; os 30 KB do Word viram centenas
  de bytes. Para dimensionar: uma página cheia de anotação digitada dá 2–4 KB de
  texto. Uma imagem de cifra escaneada tem 200 KB–2 MB; um stem, vários MB. Uma
  vez filtrada, a anotação é menos de 1% do peso de uma música, e vive no
  IndexedDB junto com os metadados — nunca toca o caminho do OPFS.
- **O tema volta a funcionar.** Sem `style` embutido, a anotação herda `--text` e
  `--accent` e fica certa no claro e no escuro.
- **Colar de qualquer origem converge.** WhatsApp, Docs, site de cifra: todos
  desembocam na mesma dúzia de tags.

Consequência de projeto: **a barra de ferramentas é a lista branca**. Ela não
pode oferecer o que o filtro apagaria. Isso elimina seletor de cor, de fonte e de
tamanho, e alinhamento — o que num tablet é ganho, não perda.

A regra é **um botão por capacidade da lista**, e ela fecha em onze:

| # | botão | tag |
|---|---|---|
| 1 | Negrito | `strong` |
| 2 | Itálico | `em` |
| 3 | Sublinhado | `u` |
| 4 | Tachado | `s` |
| 5 | Marca-texto | `mark` |
| 6 | Título de seção | `h3` |
| 7 | Lista com marcadores | `ul` + `li` |
| 8 | Lista numerada | `ol` + `li` |
| 9 | Citação | `blockquote` |
| 10 | Link | `a[href]` |
| 11 | Bloco alinhado | `pre` |

As outras três tags da lista — `p`, `br`, `li` — não têm botão: são estruturais e
nascem de Enter e dos botões de lista. Marca-texto é um toggle de **uma cor só**
(`--accent-tint`, coerente com a cor que o app já usa para acorde) e título é
**um nível só**.

Fora da regra ficam os controles que não são formatação: **desfazer** e
**refazer** (dois botões fixos, total treze), e **colar sem formatação** — que
não deve morar na barra. Ele só faz sentido no instante da colagem; como botão
permanente, ocupa espaço fixo para uma ação usada uma vez a cada dez. O lugar
dele é o próprio momento de colar, ou o menu de contexto.

### 4. Sem imagens — e o `<img>` é barrado explicitamente

O usuário chegou nisso pelo peso; o argumento forte é outro. Imagem deixa de ser
um campo de texto e vira um **ativo binário**: teria que ir para o OPFS, entrar
na exportação, ser podada pelas partes, e ser apagada junto quando a música some.
Isso é um subsistema, não um botão. Sem imagens, `anotacoes` é **uma string** —
a diferença entre um dia de trabalho e uma semana.

Não basta não oferecer o botão. Colar do Word pode trazer
`<img src="data:image/png;base64,…">` — meio megabyte entrando num campo que se
supõe texto. `img` fica **fora da lista branca por escrito**, e o teste cobre o
caso do `data:` colado. É a pegadinha clássica: o caminho que se testa (digitar)
é o que funciona.

Para o professor que quer mandar a foto de uma digitação, `a[href]` resolve.

### 5. O filtro roda na entrada E na renderização

Este ponto é novo para este código e merece cuidado.

Toda a UI se desenha com template string e `app.innerHTML = html` (`main.js:94`),
e **todo** dado de usuário passa por `esc()` antes. A anotação é o primeiro
conteúdo do app que precisa ser inserido **sem escapar** — é o ponto dela.

Só que ela não vem só do dono do aparelho. Ela chega dentro de um `.somaplay`
recebido por WhatsApp, de uma origem que o app não controla. Um arquivo
malicioso ou corrompido carrega HTML arbitrário direto para dentro de um
`innerHTML`.

Então o filtro é chamado em **três** lugares, não um:

1. ao **colar** — é onde ele limpa o Word e onde o usuário percebe o efeito;
2. ao **importar** — o conteúdo do arquivo é tão pouco confiável quanto o colado;
3. ao **renderizar** — barato, e é a rede que pega qualquer caminho esquecido
   (um backup antigo, uma escrita direta no IndexedDB).

O filtro é implementado com o parser do próprio navegador
(`DOMParser`/`<template>`) percorrendo a árvore e removendo o que não está na
lista, e não com regex sobre string. Regex sobre HTML falha exatamente nos casos
que interessam.

### 6. A seção mora na mesma coluna e no mesmo scroll

Abaixo do bloco "Acordes desta música". Sem painel lateral, sem folha inferior:
uma coluna, um scroll, nenhuma máquina nova de layout. É o que respeita a regra
de que ler importa mais que anotar — a anotação vazia é quase invisível e não
rouba área de cifra de quem só quer tocar.

O custo é a distância: para ler o comentário do professor no meio do estudo, o
usuário rolaria a cifra inteira e perderia o lugar. Resolve-se sem inventar
layout — um **indicador no cabeçalho** de que a música tem anotação, que ao ser
tocado salta para a seção, e um caminho de volta ao ponto de leitura.

### 7. Compatibilidade: `PARTES_TODAS` cresceu, e isso mexe no caminho do backup

Achado ao ler `partes.js`, e é a razão de este spec existir antes do código.

`todasAsPartes` é `PARTES_TODAS.every((p) => ps.includes(p))`, e é o que ativa o
caminho rápido do backup completo — o `Object.assign` que devolve o registro
**inteiro**, "incluindo um campo de que este módulo nunca ouviu falar".

Um backup gerado **antes** desta versão declara `['cifra','audio','pessoal']`.
Assim que `anotacoes` entra em `PARTES_TODAS`, esse arquivo deixa de passar no
teste, cai no `copiaCampos` e perde a garantia de voltar inteiro. Ou seja:
acrescentar uma parte quebra, em silêncio, a restauração de todo backup antigo —
e só na direção de entrada, que é a que ninguém pensa em conferir.

Medido, e não deduzido: `fundeMusica(null, {…, campoDesconhecido: 42}, ['cifra','audio','pessoal'])` devolve `42` hoje e **`undefined`** com `anotacoes` somada a `PARTES_TODAS`.

A correção: completude é uma propriedade **da época do arquivo**, não da versão
do código. Um arquivo que declara todas as partes que existiam quando foi escrito
é completo. Na prática, o conjunto legado `['cifra','audio','pessoal']` continua
valendo como "completo", e o teste passa a cobrir os dois formatos. O plano
decide a forma exata; o spec registra que **não se pode simplesmente somar um
item ao array**.

## Componentes

### `js/anotacoes.js` — o filtro (novo)

Exporta `limpaHTML(html)` — parse, percorre, aplica a lista branca, devolve
string — e a própria `LISTA_BRANCA`, para o teste e para a barra de ferramentas
lerem a mesma verdade. Puro, sem estado, sem DOM da aplicação.

Precisa entrar em `SHELL` (`sw.js`), ou o app quebra offline; `shell.test.js`
pega isso.

### `js/partes.js`

`PARTES_TODAS` ganha `'anotacoes'`. `CAMPOS` ganha `anotacoes: ['anotacoes']`.
`todasAsPartes` passa a tratar o conjunto legado como completo (§7).

### `js/render/play.js`

A seção depois de `chordsBlock`: estado vazio, estado de leitura, editor. O
indicador e o salto no cabeçalho.

### `js/render/sharesheet.js`

`OPCOES` hoje tem três presets fixos e a folha mede o **tamanho** de cada um. A
anotação é irrelevante em bytes, mas precisa ser escolhível: uma caixa "Incluir
minhas anotações" que acompanha a opção escolhida (§10), escondida quando nenhuma
das músicas selecionadas tem anotação.

### `js/i18n/pt.js` e `js/i18n/en.js`

Rótulos da seção, da barra de ferramentas e do compartilhamento, **nas duas
tabelas** — `i18n.test.js` falha se faltar em uma. Nada de constante de módulo
com texto traduzido: ela congela no import e não acompanha a troca de idioma.

### Versão

0.15.0 → **0.16.0**. Feature nova e mudança no formato do arquivo. Sobe em
`js/version.js` e na linha 2 de `sw.js`, que `version.test.js` mantém em
sincronia — e o mesmo teste exige **entrada no `CHANGELOG`** para a versão
corrente. Qualquer mudança sob `app/` já obrigaria o bump: sem chave de cache
nova, o cliente instalado continua sendo servido do cache antigo para sempre.

## O que o desenho fechou

Validado no canvas de design de 2026-08-18 (11 artboards). As cinco decisões que
o spec deixara em aberto, com o argumento que as sustenta — reverter qualquer uma
é barato, porque nenhuma muda o formato nem as partes.

### 8. Ler é o estado padrão; escrever pede um toque

Botão **Editar** no cabeçalho da seção, não campo sempre aberto. O tablet fica
apoiado numa estante enquanto a pessoa toca: com o campo sempre ativo, um toque
acidental abre o teclado e cobre metade da tela no meio da música. O custo do
outro lado é um toque a mais para quem vai escrever — e quem vai escrever já
parou de tocar.

### 9. A barra de ferramentas cola no topo do teclado

Medido no desenho: os treze controles somam **640 px**. Cabem inteiros nos 800 px
do retrato, e só apertam abaixo de ~700. Não há duas fileiras e não há "mais" na
largura de tablet.

A versão estreita (375 px) existe para telas menores e esconde **tachado,
sublinhado, título, citação e link**, mantendo negrito, marca-texto, as duas
listas e o bloco alinhado.

### 10. Compartilhar é uma caixa, não uma quarta opção

`OPCOES` continua com três presets, e uma caixa **"Incluir minhas anotações"**
acompanha a opção escolhida quando ela leva cifra.

O motivo é aritmético: a lista de presets cresce por **multiplicação**. Uma quarta
linha "cifras + anotações" cria imediatamente a falta de "cifras + áudio +
anotações"; com quatro partes seriam oito linhas. A caixa cresce por soma. Ela não
aparece quando nenhuma das músicas selecionadas tem anotação.

### 11. Substituir anotação pede confirmação

Importar anotação sobre anotação é o único ponto do recurso em que texto escrito à
mão é destruído. Uma confirmação com **"Manter as minhas"** e **"Substituir"**,
mostrada só quando os dois lados têm conteúdo. Cifra e áudio entram de qualquer
jeito — a pergunta é só sobre a anotação.

### 12. O salvamento se anuncia discretamente

Um "Salvo" em `--muted2`, 12 px, no cabeçalho da seção, ao lado do título. Sem
toast, sem botão de salvar: a gravação é local e automática.

## O que não muda

- A cifra. A anotação é conteúdo **separado**, nunca inserido dentro do texto da
  cifra — o acorde fica sobre a sílaba porque a contagem de caracteres importa, e
  nada da camada de anotação pode empurrar um caractere.
- `pessoal` continua não viajando em compartilhamento.
- Os três modos T1/T2/T3. A anotação é conteúdo da música, não um quarto modo.
- O caminho do OPFS. A anotação é string e vive no IndexedDB.

## Fora de escopo

Tudo que a entrevista levantou e o MVP cortou, listado aqui para não se perder:
anotação ancorada a um trecho da cifra; bloco de batida; bloco de progressão em
compassos; digitação customizada por acorde; marcadores de tempo no áudio;
relatório de estudo do aluno; gravação por cima do playback; imagens.

Nenhum deles é descartado — todos são blocos ou camadas **sobre** este editor, e
todos ficam mais fáceis de decidir depois de ver este funcionando num tablet.

## Verificação

- `anotacoes` em `CAMPOS`: uma música com anotação, exportada só com `cifra`,
  não carrega a anotação; exportada com `anotacoes`, carrega.
- O cenário do §2, ponta a ponta: importar `cifra` sozinha não toca no campo.
- **Backup antigo** declarando as três partes legadas volta inteiro (§7).
- `limpaHTML` contra amostras reais de colagem: Word, Google Docs, WhatsApp.
- `limpaHTML` remove `<img>`, inclusive `data:` base64; remove `style` e `class`;
  remove `href="javascript:"`; preserva `<pre>` e a formatação da lista branca.
- Alinhamento por coluna sobrevive dentro do `<pre>`.
- `shell.test.js`, `i18n.test.js`, `version.test.js` verdes.
- Navegador: tablet, tema claro e escuro, teclado virtual aberto, colar de fora.

## O que falta verificar num navegador

Implementado e revisado em 2026-08-19 (plano
`docs/superpowers/plans/2026-08-18-anotacoes-da-musica.md`, versão 0.16.0).
554 testes automatizados passam — mas eles cobrem só o núcleo **puro**.

**`paraArvore` e `limpaHTML` nunca executaram.** Elas dependem de `DOMParser`,
que não existe no Node, e o ambiente da implementação não tinha navegador. A
metade do filtro que efetivamente lê HTML de fora, portanto, está verificada
apenas por leitura. Isto não é ressalva de rotina: é a fronteira entre um
arquivo recebido por WhatsApp e um `innerHTML`.

Em ordem de risco:

1. **O filtro de verdade.** Colar do Word, do Google Docs e de uma mensagem de
   WhatsApp. Confirmar que sobrevivem só as 14 tags, que fonte e cor somem, e
   que uma imagem base64 (`data:`) colada não entra.
2. **Um `.somaplay` hostil, feito à mão** — anotação com `onerror`, `<svg><script>`,
   `href="javascript:"`, `<style>` — importado nos **dois** modos, merge e
   substituir. Nada deve executar nem sobreviver.
3. **Editar a música com anotação escrita** (⋯ → Editar música) e salvar: a
   anotação tem que continuar lá. Foi um bug real, corrigido em `cab9559`.
4. **Digitar espaço no editor** numa música com áudio: tem que escrever um
   espaço, não tocar. Também foi bug real, mesmo commit.
5. **Os treze botões no Chrome do Android.** `strikeThrough` e `underline` podem
   emitir `<span style>`, que o filtro desembrulha — a formatação sumiria ao
   salvar. É o ponto mais provável de surpresa.
6. **O bloco alinhado através de dois ciclos** salvar → reabrir → salvar: a
   coluna tem que sobreviver inteira.
7. **Modo imagem.** A seção vive dentro de `.cifra-imgwrap`, que tem
   `touch-action:none` e arraste por JS, e o `data-nopan="1"` desliga o arraste
   ali — conferir se aquela região rola. E a barra grudada com `imgZoom > 1`.
8. **Teclado virtual**: largura da barra, e o "mais" abaixo de 700 px.
9. **Tema claro e escuro** com texto colado do Word.
10. **A pílula de salto** ida e volta.

## Próximos passos

1. Executar `docs/superpowers/plans/2026-08-18-anotacoes-da-musica.md`.
2. Revisitar §Fora de escopo depois de o editor rodar num tablet de verdade — é
   ali que se decide se batida e progressão viram blocos dentro dele.
