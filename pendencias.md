# Pendências

Histórico do que foi adaptado, pulado ou ficou meia-boca. Cada item diz **o que**,
**por quê** e **o que fazer se incomodar**.

---

## Songbook Gilberto Gil — vol. 2

Conversão do PDF `chords/Gilberto Gil/songbook/356224778-Gil-Songbook-Vol-1-e-2-Cancoes.pdf`
(páginas 31–175 do livro) para `.somaplay`. Ferramenta em `scripts/gil_songbook/`.

### Decisões que valem para o livro inteiro

| # | O quê | Por quê | Se incomodar |
|---|---|---|---|
| 1 | **Barras de compasso removidas** (`/`, `///`) | pedido seu, para simplificar | dá para reemitir com elas: o `MARK` do `chords.js` aceita barra isolada, mas precisa de espaço em volta |
| 2 | **`A*` virou `A`** (e todo `X*` virou `X`) | no Chediak o `*` só marca *outro voicing do mesmo acorde*, não é nome de acorde. O app trabalha com forma, não com nome | a forma do songbook entra como **variação extra** de `A` no dicionário — está lá, é só escolher no "Variar" |
| 3 | **`E` com 7 sobrescrito e 4 subscrito + `(9)` virou `E7(4/9)`** | é o padrão que sua biblioteca já usa (`B7(4/9)`, `D7(4/9)`, `G7(4/9)`) | — |
| 4 | Tensão empilhada dentro do parêntese virou `(a/b)`: `B7(b9/#11)`, `A7(9/#11)`, `Db7(9/#11)`, `Em7M(9)`, `Em6(9)` | mesma razão: casar com `A7(9/11)`, `B6(9)` que já existem | — |
| 5 | **Partituras ignoradas** (metade direita de cada página dupla) | pedido seu | — |
| 6 | Acorde que **já está no `chords-catalog.js`** (A, B, B7, C#7, F#m, G#m…) entra no dicionário **sem virar padrão** | `mergeRecords` faz `base.defaultId \|\| inc.defaultId`; um `defaultId` importado roubaria o seu padrão do acorde | a forma do livro fica como variação, acessível pelo "Variar" |
| 7 | Sílabas separadas por travessão foram **remontadas em palavra inteira** (`Ban——da` → `Banda`) | travessão de melisma não é hífen de verdade; manter partia a busca e a leitura | — |
| 8 | **Espaçamento entre palavras comprimido (2026-08-11)** — o gerador media a coluna de cada palavra pela largura em pixels do livro, e o traço de melisma (`ve—a————do`) infla essa largura bem além do texto remontado (chegava a 115 px/caractere numa palavra normal, contra ~20-28 px/caractere sem melisma). Toda música com melisma pesado saía com buracos enormes entre palavras — "O Veado" foi o caso que você reportou. | pedido seu, depois de ver "O Veado" na tela — mantendo alguma proporção de espaço (não achatar tudo igual), já que sem barra de compasso o espaçamento é o único sinal visual de fraseado | `cap_widths()` em `gilbook.py`: nenhuma palavra "empurra" a próxima além de ~30 px/caractere do seu próprio texto; o excesso vira desconto em cascata nos tokens seguintes, na mesma escala pras duas linhas (acorde continua em cima da sílaba certa). Testado nas 32 músicas: contagem de linha e de sistema idêntica à do lote anterior, só o espaçamento horizontal mudou. |

### Por música

| Música | Página | O quê |
|---|---|---|
| Banda Um | 31-32 | A cifra usa **F#m7**, que **não está na grade de diagramas** do livro. Não é erro de leitura — o livro não desenhou. Cai no dicionário/catálogo, é o único acorde da música sem a forma do songbook. |
| A Rua | 42-43 | Mesmo caso: a cifra usa **A7** e **Bbm**, que o livro não desenhou. Caem no dicionário. |
| A Linha e o Linho | 34 | Três acordes (`Em7M(9)`, `Em7(9)`, `Em6(9)`) têm **casa-base ambígua** pelo teste das notas; assumi 1ª casa (posição solta), que é o que o desenho mostra (sem algarismo romano, com ○ de corda solta). Conferido no olho. |
| A Linha e o Linho | 34 | `A7(9/#11)` e `A7(4/9)` precisaram de **casa-base fixada à mão** (IV e III) — o teste das notas aceitava mais de uma posição e o OCR do algarismo romano é ruim. Conferido no olho contra o desenho. |
| Andar com Fé | 36 | Sem pendência. |
| Aquele Abraço | 38 | A **dedicatória** impressa acima da cifra ("Este samba vai pra Dorival Caymmi, João Gilberto e Caetano Veloso") foi mantida, como linha de texto sem acorde. |
| Aquele Abraço | 38 | Duas **marcas de coda** soltas acima da pauta (perto de "Quem sabe de mim sou eu") foram descartadas — não são acorde nem letra. |
| Aqui e Agora | 40-41 | A cifra **não coube na página par**: os 6 últimos sistemas estão no alto da p.41, acima da partitura. Foram incluídos. Sem isso a música pararia em "Aqui perto passa um". |
| A Rua | 42-43 | Ocupa **duas páginas inteiras de cifra** (a p.43 não tem partitura). 49 diagramas, 20 sistemas — a maior até agora. |
| A Rua | 43 | Quatro **figuras rítmicas** desenhadas entre os sistemas (hastes e barras de colcheia, sem acorde nem letra) foram descartadas. |
| Barato Total | 46 | Sem pendência. |
| Bat Macumba | 48 | Sete **pausas** desenhadas no meio de uma linha de acorde foram tratadas como compasso vazio. A letra é o poema concreto (a frase encurta até sobrar "Ba") e foi transcrita como está impressa, truncagem por truncagem. |
| Chororô | 51-52 | Primeira música em **página ímpar** (metade direita) do livro — o mapa de páginas segurou. Continua na p.52. Onze **figuras rítmicas** entre os sistemas foram descartadas. A grade traz três voicings de `A7(b9/13)`; no texto os três aparecem com o mesmo nome (as formas extras ficam como variação no dicionário). |
| Buda Nagô | 54 | Sem pendência. O `F` com 6 e 9 empilhados virou **`F6(9)`**. |
| Cérebro Eletrônico | 60 | Sem pendência. |
| Copo Vazio | 62 | Sem pendência. O `D` com 6/9 empilhados virou **`D6(9)`** (casa IV). |
| Cores Vivas | 64 | Sem pendência. |
| Divino Maravilhoso | 66 | Sem pendência. |
| Domingou | 68-69 | Continua no alto da p.69. Abre com **linha só de acorde** ("Introdução:"), mantida. |
| Eu Vim da Bahia | 71 | Página **ímpar** (metade direita). Termina com um **vamp instrumental** sem letra (`Am7 / D7(9) / Am7 / D7(9) / Am7 /`), mantido. |
| Dono do Pedaço | 74 | O livro desenha **`D7M(#5)`** na grade mas **não usa** o acorde na cifra. A forma entra no dicionário mesmo assim. |
| Drão | 76 | Abre com **linha só de acorde** ("Introdução:"), mantida. Convive com a *Drão* que você já tem do CifraClub — ids diferentes, títulos diferentes. |
| Esotérico | 82 | Abre com **linha só de acorde** e fecha com uma linha de **compassos vazios** (`////`), as duas mantidas. `E7(♭5/9)`, `E7(4/9)`, `A7(4/9)` e `A7(9/#11)` vieram de tensão empilhada. |
| Indigo Blue | 94 | Sem pendência. Só 6 acordes na grade, estrutura muito repetitiva. |
| Lamento Sertanejo | 98 | Abre com **duas linhas seguidas só de acorde** (o vamp da introdução), as duas mantidas. Convive com o *Lamento Sertanejo* que você já tem do CifraClub — ids e títulos diferentes. |
| Logunedé | 104 | Fecha com **linha só de acorde** (`A7(4/9) / A7 / F7M/A`), mantida. |
| Lugar Comum | 106 | O livro desenha **`Bb7(9/13)`** na grade mas não usa o acorde na cifra. Duas linhas de borrão/número de página descartadas. |
| Lunik 9 | 108-109 | **A p.108 é quase toda grade (44 diagramas) e a cifra inteira está na p.109**, que não tem partitura. Único caso assim. 18 sistemas. |
| Mancada | 112 | **A partitura vem impressa no RODAPÉ da própria página da cifra** (9 últimas linhas), não na página ímpar ao lado — era isso, e não marcas soltas, a "cauda perigosa" que eu tinha sinalizado. Três pausas desenhadas no começo de cada refrão viraram compasso vazio. |
| Maria (Me Perdoe, Maria) | 114 | **`C#m7(9)` aparece na cifra mas o livro NÃO desenhou o diagrama** — e o nome também não existe no catálogo do app nem na sua biblioteca, então vai aparecer **sem diagrama**. Confirmado com zoom no impresso: é `C#m7(9)` mesmo, não `C#m7`. |
| Maria (Me Perdoe, Maria) | 114 | `E7(9/b5)`: eu tinha lido `E7(b9/b5)` e o teste das notas rejeitou todas as casas. Com 9 fecha nas casas 2 e 6; ficou a 2. |
| Maria (Me Perdoe, Maria) | 114 | **Corrigido (2026-08-11) — o final estava sem a última linha de letra.** O último sistema (`Bm7 / / / / / / / Eb6(9) / / / D6(9) / / / D6(9/#11)`) tinha ido para o `.somaplay` como linha só de acorde (`None` no lugar da letra); faltava por isso o "Ma-ri-a" final, que no livro vem como melisma esticado sob `Eb6(9)`/`D6(9)` — achado ao conferir a imagem contra o crop original (`M114_3.png`), que eu tinha lido cortado demais cedo na primeira passada. Também sobrava um `None` de "número da página" no fim do `BODY` que não correspondia a linha nenhuma detectada — os dois erros se cancelavam na contagem do `G.build()`, por isso passaram batidos. Reidentificado via `text_lines`/`segs` do próprio `gilbook.py` (20 linhas detectadas = 10 sistemas × 2), com o "Ma-ri-a" como token único (mesmo padrão de `pau-á-aa` em Domingou), não três palavras separadas. `.somaplay` regerado com o mesmo id (`sb-dd54ee1e70725272`), reimportar por cima resolve. |
| Oriente | 116-117 | Continua na p.117. Marca solta descartada abaixo do último sistema. |
| Meditação | 119 | Página ímpar. **A partitura vem no rodapé da própria página** (25 últimas linhas) — mesmo caso da Mancada. Só 4 sistemas. |
| Menina do Sonho | 120-121 | Abre com **três linhas seguidas só de acorde** (a introdução). Continua na p.121, que fecha com uma coda em marcas de repetição, descartada. |
| Meu Amigo, Meu Herói | 122 | Sem pendência. |
| O Veado | 124-125 | Continua na p.125. Régua do cabeçalho e cifrado sobre a pauta descartados. |
| Cada Tempo em Seu Lugar | 58 | Termina com uma **linha só de acorde** (`Am(add9) / E(add9) / D6(9/#11)`), sem letra — mantida. O `D` com 6/9 empilhados e `(#11)` virou **`D6(9/#11)`**. |

### Estado da conversão (2026-08-11)

**32 de 64 músicas prontas** — 421 sistemas, 259 acordes no dicionário, **576 formas do
songbook fixadas nas músicas** (179 delas diferentes do que o catálogo do app desenharia).

Faltam **32 músicas**. Já com levantamento pronto (grade detectada e sistemas recortados),
prontas para transcrever:

| Página | Música | Levantamento |
|---|---|---|
| 78 | Ele e Eu | 37 diagramas, 13 sistemas |
| 80 | Era Nova | grade validada 11/11, 15 sistemas |
| 84 | Extra | 9 sistemas |
| 87 | Miserere Nobis | 17 diagramas, continua na p.88 |
| 90 | Flora | **59 diagramas** (8 linhas de grade), a maior do livro |
| 96 | Ladeira da Preguiça | 22 diagramas, 12 sistemas |
| 100 | Lente do Amor | 23 diagramas, continua na p.101 |
| 102 | Logo Versus Logos | 5 diagramas, continua na p.103 |

As demais (104 a 174) ainda não foram levantadas.


#### Pré-prontas (grade lida e validada, falta transcrever a letra)

Em `scripts/gil_songbook/songs/_pre/` — **10 músicas, 144 formas já conferidas**. Cada arquivo já traz `TITLE`, `PAGES`, `TOM`,
o `GRID` **validado pelo teste das notas** e, em comentário, a faixa `y0/y1` da cifra,
a contagem de segmentos linha a linha e quantos sistemas esperar. Falta só preencher
o `BODY` lendo os sistemas.

| Página | Música | Grade | Alerta |
|---|---|---|---|
| 127 | Morena | 13/13 | página ímpar: **não** continua na p.128; cauda com muitas linhas de 1-5 segmentos |
| 128 | O Rouxinol | 27/28 | **divergência do livro**: o 3º diagrama tem rótulo `Ab/Gb` e desenho `[-1,-1,4,4,4,-1]` (F#, B, D# = B/F#). Nenhuma casa faz as notas caberem no nome. Nome mantido, casa fixada em 1 — conferir no impresso |
| 130 | O Sonho Acabou | 17/17 | 12 sistemas |
| 132+133 | Palco | 13/13 | continua na p.133 |
| 134 | Pé da Roseira | 15/15 | 14 sistemas |
| 136 | Pessoa Nefasta | 8/8 | **18 sistemas** — a mais longa do lote |
| 138 | Preciso Aprender a Só Ser | 26/26 | 9 sistemas |
| 140 | Procissão | 7/7 | 11 sistemas |
| 142+143 | Punk da Periferia | 10/10 | continua na p.143; convive com a versão do CifraClub |
| 144 | Raça Humana | 7/7 | 15 sistemas |

**Ritmo real:** cada música leva de 8 a 12 leituras de imagem mais as conferências de
contagem. Não dá para fechar o livro numa sessão só; o caminho é continuar em lotes,
sempre regerando o mesmo `.somaplay` (ids estáveis, o merge atualiza no lugar).

### Coisas do PDF que dão trabalho (para quem retomar)

- **O livro foi escaneado torto.** Na p. 34 a inclinação sozinha fez o detector perder
  10 das 26 grades. Hoje a página é endireitada antes de qualquer leitura.
- **OCR do algarismo romano não é confiável** — errou 6 de 18 em Banda Um (troca IV por
  X, VII por VIII). A casa-base sai do teste das notas contra o nome do acorde; o
  romano só desempata. Quando sobra ambiguidade, a ferramenta **avisa** (`!?`) em vez
  de chutar calado.
- **A sombra da lombada** (coluna escura na borda interna da página) cola todas as
  linhas de texto numa faixa só se não for cortada antes.
- **O número da página entra como linha de texto.** No pé de cada página o algarismo
  ("46", "48") é detectado como mais uma linha e desloca todo o pareamento acorde/letra
  a partir dali. Fechar o `y1` da página antes dele. O sinal é uma última linha com 1
  segmento só.
- **Corda desbotada come a caixa inteira.** No G#7 da p.42 a 6ª corda sumiu na metade
  de baixo: o detector exigia linha inteira e descartou o diagrama, deixando 48 caixas
  para 49 nomes — e a grade inteira teria entrado deslocada. Hoje casa pelo topo da
  caixa, não pelo pé, e funde cordas partidas que viram duas linhas coladas. **Conferir
  sempre o número de diagramas contra o número de rótulos** antes de nomear a grade.
- **Cifra nem sempre acaba na página par.** Quando não cabe, o resto é impresso no alto
  da página ímpar, ACIMA da partitura ("Aqui e Agora" é assim). Conferir SEMPRE com
  `survey.continua(pagina)`: 1 a 3 linhas acima da 1ª pauta são só o cifrado impresso
  sobre a melodia; mais que isso é cifra de verdade. Sem essa conferência a música
  entra cortada no meio de uma frase e nada avisa.
- **Um `(acordes, None)` errado no fim da música não quebra a contagem de linhas se
  vier acompanhado de um `None` sobrando também no fim.** Foi o que aconteceu em Maria:
  faltava a letra do último sistema E sobrava um `None` de "número da página" que não
  existia — os dois erros se cancelavam em `G.build()`, que só confere o total, não
  linha por linha. Pega esse caso: sempre que o **último** sistema de uma música virar
  `(acordes, None)`, vale a pena conferir a imagem da linha seguinte antes de aceitar —
  pode ser mesmo instrumental, mas pode ser corte de leitura apressada. Foi assim que
  passou batido até o usuário notar pelo app.
- **O traço de melisma engorda a medição de largura da palavra, não só a leitura.** O
  `layout()` posiciona a PRÓXIMA palavra proporcionalmente à largura do segmento de
  tinta medido — e "ve—a————do" mede a largura da palavra MAIS o traço, mesmo que o
  traço não apareça no texto final (decisão #7). Numa música com melisma pesado isso
  empurra cada palavra seguinte para uma coluna bem mais à direita do que o texto
  precisa, e o efeito se acumula linha a linha. Passou batido em 32 músicas porque
  `G.build()` só confere CONTAGEM de linha, não espaçamento — não tem warning que pegue
  isso sozinho. `cap_widths()` (decisão #8) resolve, aplicado por padrão em todo
  `build()`; **não precisa fazer nada música por música**, mas vale reconferir no olho
  qualquer música com bastante melisma ("Domingou", "Chororô", "A Linha e o Linho")
  depois de reimportar.

---

## App

| Data | O quê | Situação |
|---|---|---|
| 2026-08-10 | **Cifra longa perdia os acordes**: `.ch` era `white-space:pre` (não quebrava, era cortada pelo `overflow:hidden`) e `.ly` era `pre-wrap` (quebrava sozinha), então metade da letra ficava sem acorde. No celular era inutilizável. | **Resolvido** — reflow do par acorde/letra na mesma coluna (`wrapBlock` em `chords.js`, medição no DOM em `play.js`). Spec `2026-08-10-reflow-da-cifra-texto-design.md`. SW v23. |
| 2026-08-10 | **miniaturas na música vazam da caixa.** Com as miniaturas ligadas, o diagrama é bem mais largo que o nome do acorde, então a fileira passa da caixa de texto (~44 px na Banda Um, 6 fileiras de 49) e rola de lado. Antes do reflow isso ficava **escondido** pelo `overflow:hidden`; hoje pelo menos rola, que é honesto, mas ainda não é o certo. A causa é o reflow quebrar por **coluna de caractere**, métrica que não vale quando a linha vira fileira de diagramas — o conserto pede um wrap próprio do modo miniatura, medindo a largura de cada diagrama. | **Resolvido — pela outra tarefa em paralelo**, não por mim. `wrapBlock` ganhou um 4º parâmetro (`cabe`, "este trecho cabe na caixa?") que `play.js` alimenta com a largura real dos diagramas; quando a fileira estouraria a caixa, quebra ali em vez de deixar vazar. Spec `2026-08-11-wrap-das-miniaturas-design.md`, PR #15 (mergeado). Confirmado presente e testado (`cifrawrap.test.js`, "composição real: linha densa não deixa fileira acima da caixa") ao mexer na mesma função hoje. |
| 2026-08-11 | **RESOLVIDO** — o gerador passou a gravar a forma do livro em `cifra.digitacoes` de cada música (`{frets, varId}`), que tem precedência sobre o catálogo em `chordSVG`. São **166 formas fixadas nas 11 músicas, 58 delas diferentes do padrão do catálogo**. O `varId` continua apontando para a variação do dicionário, então "Variar" e a propagação seguem funcionando. Os 44 nomes que o catálogo já tinha continuam **sem `defaultId`** — o padrão da biblioteca não muda para nenhuma outra música. Verificado no navegador: F7M em "Aqui e Agora" agora sai `[1,-1,2,2,1,-1]`, o desenho do livro. | Fechado |
| 2026-08-12 | **Palavra sozinha numa linha depois do reflow** — "Mesmo" (Meditação) ficava numa fileira própria, só ela e o acorde acima, porque `wrapBlock` corta de forma gulosa (pega o máximo que cabe em `n` colunas) sem olhar à frente; quando sobra pouco depois do corte — o caso mais comum sendo uma linha 1-2 caracteres mais longa que `n` — a "migalha" que sobra vira uma fileira curta e solta. Reportado pelo usuário com a comparação lado a lado contra a página do livro. | **Resolvido** — `wrapBlock` em `chords.js` ganhou `semMigalha()`: quando o resto após o corte guloso é pequeno (≤ 12 ou 25% de `n`, o que for menor), refaz o corte mirando o **meio** do texto que sobra, equilibrando as duas fileiras finais em vez de uma cheia + uma migalha — sem nunca ultrapassar `n` em nenhuma delas (mesma garantia de sempre, só muda ONDE dentro do limite se corta). Testado contra as 406 linhas reais das 32 músicas do songbook × 9 larguras plausíveis (3654 combinações): 0 estouros, 0 palavras partidas/perdidas, migalhas caindo de 1545 para 604 casos (-61%). Suíte completa (325 testes, incl. os 20 de `cifrawrap.test.js`) passa. SW v32. |
| 2026-08-12 | **Miniaturas ligadas + linha só-de-acorde ficava confusa** — "Lamento Sertanejo": o vamp instrumental (`G7(#11) G7(#11) C/G Gm C/G Gm...`) aparecia como texto puro grande no meio de fileiras de diagrama, porque a spec original (2026-07-20) deixou linha-sem-letra fora do modo miniatura de propósito, pra não repetir o mesmo diagrama a cada ocorrência num vamp longo. Na prática, misturar os dois estilos na mesma tela ficou mais confuso do que a repetição que a spec queria evitar. Reportado pelo usuário com print. | **Resolvido, com dedup** — `layoutChordRow` (`chords.js`) ganhou um 5º parâmetro `dedup`; quando ligado, só a 1ª ocorrência de cada nome **na linha** carrega `isRepeat:false` (desenha o diagrama) — da 2ª em diante `isRepeat:true` (só o nome, sem redesenhar, e reservando só a largura do texto, não do diagrama). `play.js` liga `dedup` exatamente quando a linha não tem letra; linha com letra continua desenhando toda ocorrência, sem mudança. Testado com as 3 linhas reais do vamp de Lamento Sertanejo via Node — dedup correto em cada uma, reinicia a cada linha nova. Suíte completa (325 testes) passa. SW v33. |
| 2026-08-12 | **Pedido do usuário**: respiro antes do primeiro sistema da cifra (a introdução colava embaixo do cabeçalho). | **Resolvido** — `.cifra-text` ganhou `margin-top:16px` em `app.css` (antes só o `padding-bottom:16px` do `.song-id`). SW v33. |
| 2026-08-12 | **Verificação visual pendente** — as três correções acima (`semMigalha`, dedup de miniatura, respiro do topo) foram validadas por teste automatizado (suíte completa + scripts Node com dados reais) mas **não confirmadas na tela**: a conexão do Claude Code com o Chrome DevTools MCP ficou indisponível nesta sessão (processo do navegador existe — perfil `~/.cache/chrome-devtools-mcp/chrome-profile` — mas a referência de página que o MCP mantém está órfã; reconectar não resolveu em várias tentativas). | **Aberto** — conferir na tela: Meditação (linha "Mesmo" deve ficar junto da anterior, não sozinha), Lamento Sertanejo com miniaturas ligadas (vamp deve virar fileira de diagrama com dedup, não texto puro), e o espaço acima do primeiro sistema em qualquer música. |
| 2026-08-11 | ~~**O catálogo cresceu e engoliu 38 formas do songbook do Gil.**~~ O lote 1 do catálogo (PR #13) acrescentou 86 acordes elementares. O `gil-songbook-vol2-lote1.somaplay` guarda as formas do livro **só no dicionário global**, sem digitação por música, e deixa `defaultId` nulo nos nomes que o catálogo já tinha (decisão #6 acima). Com o catálogo maior, **38 nomes que antes eram servidos pela forma do livro passam a ser servidos pelo catálogo**: `A B C D E G A7 B7 D7 G7 Am7 Bm7 Cm7 Dm7 Em7 Fm7 Gm7 F#m7 G#m7 C#m7 B7M C7M D7M F7M G7M Bb7M F7 F#7 C#7 G#7 E6 F6 G6 F#m G#m G/D C° C#°`. | **Aberto** — é *coerente* com a decisão #6 (o padrão é do usuário/app, a forma do livro fica no "Variar"), mas foi efeito colateral, não escolha. O conserto certo não é marcar `defaultId` — isso redefiniria `A` e `C` para a biblioteca **inteira**, inclusive músicas do CifraClub. É mover as formas para `cifra.digitacoes` das 8 músicas, que é onde voicing de arranjo específico deve morar. Por isso o arquivo ficou **fora** do `acervo-vj-completo.somaplay`. |
| 2026-08-11 | **21 músicas do acervo VJ têm título igual a músicas que já estavam na biblioteca**, com id diferente (vieram do CifraClub). Ficariam duas entradas de mesmo nome no mesmo artista, sem como distinguir. | **Contornado** — as do VJ entraram marcadas `(v2)` (`Sampa (v2)`, `Chega de Saudade (v2)`, `Gostoso Demais (v2)`…). As originais ficam intactas para comparação; escolhida a preferida, apagar a outra e tirar o sufixo. |
| 2026-08-11 | **"Cb" ficou sem forma** no lote 1 do catálogo — um uso só, e a fundamental não está na tabela de semitons do gerador. | **Aberto** — trivial de resolver junto com o lote 2. |
