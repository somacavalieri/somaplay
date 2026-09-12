# Soma_play — A home de primeira visita — design

**Data:** 2026-09-11 · **Estado:** especificado
**Origem:** pedido do usuário — "hoje a tela inicial do APP não vende nada do app. Me ajude
a pensar o que podemos colocar para quem entra pela primeira vez. Eu quero que o assunto
direcione para o uso e explique um pouco das ações principais possíveis para fazer no app."
A tela foi prototipada no Claude Design a partir de sete hipóteses. O usuário escolheu a
direção A, "Guia de uma tela"; esta spec é essa direção depois da revisão contra o código.

## O problema

Quem abre o app pela primeira vez lê "Biblioteca vazia — Adicione músicas em Configurações
→ Adicionar música". A frase tem quatro defeitos:

- **Não diz o que o app é.** A ideia central — a mesma música em três modos — aparece como
  dois ícones sem rótulo no canto da faixa de abas.
- **Oferece só a saída mais trabalhosa**, e ela mora dentro de Configurações. "Importar
  exemplos" existe, mas também em Configurações, onde quem chega não procura.
- **Ignora quem chega com um arquivo na mão.** O amigo que recebe um `.somaplay` pelo
  WhatsApp cai nesta tela, e o caminho dele é Configurações → Importar / atualizar.
- **Mostra o cromo inteiro com zeros**: cinco abas, a lente de modo, "0 artistas na
  biblioteca", a pílula "Todas 0".

## Decisão

### A tela aparece quando não há música nem livro

`primeiraVisita(songs, books)` é verdadeira quando as duas coleções estão vazias. Contar
livros é obrigatório: um aparelho que só tem songbooks em PDF é um caso real — o import já
trata dele, no `wireBackupInput` de `main.js` — e, com a regra "sem música", esse aparelho
ganharia a tela de boas-vindas com as abas escondidas e nenhum caminho de volta para a aba
Livros.

Listas não entram na conta: uma lista sem música nenhuma não tem o que mostrar.

Enquanto a função for verdadeira, a Home troca a faixa de abas e o conteúdo pelo guia. A
barra do topo não muda: logo, selo "Offline ✓", busca, engrenagem. A primeira música, o
primeiro livro ou o primeiro import devolvem a biblioteca de sempre.

### O que a tela mostra

A direção A do protótipo, com as correções da revisão:

1. **Topo, à esquerda:** título, uma frase de apoio e três botões — **Adicionar música**
   (o principal, em âmbar), **Adicionar livro** e **Abrir .somaplay**. Embaixo, a linha
   da demo: "Sem nada à mão agora?", o botão **Carregar demo** e o link "ou baixe o
   arquivo .somaplay".
2. **Topo, à direita:** uma prévia da cifra do Groove de teste, com o diagrama de Am e a
   legenda "toque no acorde e veja o desenho".
3. **Três cartões:** Crie sua música · Traga o que você já tem · Compartilhe com os amigos.
4. **Uma música, três jeitos:** T1, T2 e T3, cada um com uma frase e uma prévia.
5. **Faixa de garantias**, com o botão **Instalar o app**.

O que muda em relação ao protótipo, e por quê:

- **"Adicionar música" continua o botão principal**, como desenhado — decisão do usuário.
  A demo continua secundária, mas deixa de ser um link do tamanho do texto: vira um botão
  de verdade, com alvo de 44 px no mínimo, e "Abrir .somaplay" também. O tablet é lido a
  um braço de distância.
- **Os cartões perdem os botões.** O protótipo repetia as três ações duas vezes, no topo e
  nos cartões. Os cartões explicam; o topo age.
- **A frase de apoio perde "Sem conta e sem internet"**, que a faixa de garantias já diz.
- **A demo é uma música, não cinco**, e o texto conta o que o arquivo tem.
- **"Sai com um toque" passa a ser verdade** — ver o cartão "Comece por aqui".
- **O link de download volta.** Estava no pedido original e o protótipo o perdeu.
- **A tela rola.** "Tudo numa tela só" vale em 1280×800; o app instalado num tablet menor
  tem menos altura. Em retrato, cartões e prévias empilham numa coluna.

### Texto

| Onde | Texto |
|---|---|
| Título | A cifra que toca junto com você. |
| Apoio | Leia a cifra, tire o violão do mix ou cante no karaokê: a mesma música, três jeitos. |
| Botões | Adicionar música · Adicionar livro · Abrir .somaplay |
| Linha da demo | Sem nada à mão agora? **Carregar demo** — uma música de exemplo, com cifra, mixer e karaokê, que sai com um toque. *ou baixe o arquivo .somaplay* |
| Sem internet | Sem internet agora: a demo precisa de conexão na primeira vez. |
| Prévia | T1 · Groove de teste · tom Am — toque no acorde e veja o desenho |
| Crie sua música | Escreva ou cole a cifra, ou fotografe a do caderno. Junte a letra para o karaokê e o áudio de cada instrumento. |
| Traga o que você já tem | Songbook em PDF entra inteiro na estante. O .somaplay de um amigo entra num toque, sem apagar nada. |
| Compartilhe com os amigos | Um artista ou uma lista vira um arquivo que cabe no WhatsApp. Quem recebe abre aqui mesmo. *Disponível assim que tiver músicas na estante.* |
| Uma música, três jeitos | **Cifra · para tocar** — a cifra rola no seu ritmo e as duas mãos ficam no instrumento. **Acompanhamento · para ensaiar** — tire o violão do mix e faça a sua parte. **Karaokê · para cantar** — a base toca e a letra aparece. |
| Garantias | Sem conta · Funciona sem internet · Nada sai do aparelho sem você mandar — **Instalar o app** |
| Cartão | **Comece por aqui** — Abra o Groove de teste: a cifra rola sozinha, cada acorde mostra o desenho, e no mixer você tira o violão. **Abrir Groove de teste** · **Tirar a demo** |

O inglês é escrito na implementação, com o mesmo tom; o título vira "The chord chart that
plays along with you." O teste de paridade cobre as duas tabelas, e todo texto sai de `t()`
na hora do render — nenhuma constante de módulo guarda texto traduzido.

### As prévias usam as peças do próprio app

O protótipo desenhou à mão um "Am" com quatro cordas, que não é um Am. Na primeira tela de
um app de cifra, isso custa confiança. Por isso nenhuma prévia é desenhada à mão:

- o diagrama sai de `chordSVG` (`chords.js`), o mesmo das músicas — certo por construção;
- a linha de cifra usa as classes de CSS da cifra em texto;
- o mini mixer usa o slider horizontal do mixer de verdade, e não os faders verticais do
  protótipo;
- a linha de karaokê destaca a frase atual em dourado, na ordem da letra.

As prévias são decorativas (`aria-hidden`, sem clique). O conteúdo delas é a cifra do
Groove de teste: conteúdo de música, que nunca passa por `t()`, como qualquer cifra.

### A demo é um arquivo `.somaplay` de verdade

Um arquivo só, `app/demo/soma_play-demo.somaplay`, com uma música:

- **Groove de teste**, do artista "Demonstração", fonte **"Demo"**: a cifra em texto que já
  existe em `samples.js`, a letra, e os quatro stems sintéticos do MVP — baixo, violão,
  piano e bateria, do commit `d3ea232`. Foram apagados em `622350b` junto com o conteúdo de
  terceiros, e o usuário confirmou que foram feitos para o projeto. Somam cerca de 0,9 MB.
  Com eles a música cobre T1, T2 e T3: `modesOf` só pede stems para o T2 e letra para o T3.
- **Ids fixos**, para carregar a demo duas vezes não duplicar nada.
- **`partes: ['cifra', 'audio']`, nunca `pessoal`.** Um arquivo com `pessoal` traz
  `settings`, e importá-lo trocaria o tema e o idioma de quem só queria experimentar.
- **Sem `chordbook`.** Am, F, C e G já estão no catálogo do app.

Carregar a demo é buscar esse arquivo e passá-lo pelo mesmo import (merge) que "Abrir
.somaplay" usa; o link de download aponta para a mesma URL. Um arquivo, dois usos — e a
demo percorre exatamente o caminho do arquivo que um amigo manda, o que a torna também um
teste de ponta a ponta do import.

- **Fora do `SHELL`.** No precache, toda instalação baixaria quase 1 MB que talvez nunca
  use. O `fetch` do service worker já guarda em cache o que busca da mesma origem, então,
  carregada uma vez, a demo funciona offline até a próxima versão — o `activate` apaga os
  caches antigos.
- **Exceção no `.gitignore`**, que ignora `*.somaplay`.
- **Gerado por script, a partir de fontes versionadas** (`scripts/demo/`): o registro da
  música e os quatro mp3. O script pode reusar o `escreveBundle` do compilador do livro, se
  `feat/somaplay-book` já estiver na main; senão, escreve ele mesmo o cabeçalho — `MAGIC`, o
  tamanho do JSON em dez dígitos, o JSON, os blobs. Nos dois casos, um teste lê o arquivo
  com `lerManifest` e confere o formato.
- **`samples.js` deixa de montar a música em código** e vira o carregador: a URL e a busca
  que devolve um `File`. "Importar exemplos", em Configurações, passa a usar o mesmo
  carregador.
- **"Demo" é dado, não interface.** A fonte fica gravada na música; é "Demo" nos dois
  idiomas e nunca passa por `t()`.

Quem importou o Groove de teste antigo (id aleatório, sem fonte) e carregar a demo por
Configurações fica com duas cópias. É raro — a demo da home só aparece com a biblioteca
vazia — e a cópia nova sai com "Tirar a demo".

### Depois da demo: o cartão "Comece por aqui"

Com a demo carregada, a biblioteca deixa de estar vazia: as abas voltam e a faixa de fontes
mostra a pílula "Demo". Acima do conteúdo das abas Artistas, Músicas e Estilos aparece um
cartão com o texto da tabela, os botões **Abrir Groove de teste** e **Tirar a demo**, e um
**×**.

"Tirar a demo" é o `deleteFonteAsk` que já existe, chamado com a fonte "Demo": confirmação,
apagar, podar os filtros, avisos — nada novo. Se a biblioteca ficar vazia, o guia volta.

O × grava `settings.guiaDemoFechado`, e o cartão não volta. O ajuste viaja na parte
`pessoal` de um backup, o que é inofensivo.

O cartão aparece quando alguma música tem a fonte "Demo" e o ajuste não está gravado. A
regra é uma função pura em `state.js`, com teste.

### Um fluxo de importação, três portas

O `<input id="file-backup">` só existe em Configurações, e o corpo de `wireBackupInput`
(`main.js`) é o fluxo inteiro: ler o manifest, confirmar, perguntar das anotações,
importar, podar os filtros, avisar. Esse corpo vira uma função,
`importarArquivo(file, { merge, confirmar })`, chamada de três lugares:

- **Configurações**, como hoje;
- **"Abrir .somaplay" na home** — sempre merge e sem confirmação, porque a biblioteca está
  vazia e não há o que perder. A home ganha o seu próprio input escondido;
- **"Carregar demo"**, com o `File` que o carregador devolve — merge, sem confirmação.

"Adicionar livro" na home abre o mesmo fluxo da aba Livros — seletor de PDF, rascunho com
título e autor, salvar — e deixa a pessoa na aba Livros. "Adicionar música" é o `goAdd` de
sempre.

### Sem internet

A demo precisa de rede na primeira vez. Com `navigator.onLine` falso, a linha da demo mostra
o aviso da tabela. O botão continua ativo, porque a demo pode já estar no cache; se a busca
falhar, um toast explica. O app escuta `online` e `offline` para redesenhar a linha.

### Instalar o app

O rótulo não fala de tablet: o app instala em telefone e computador também. "Instalar o
app" / "Install the app" é o mais curto, e o diálogo do navegador já diz onde vai instalar.

O botão depende do evento `beforeinstallprompt`, que o app hoje não trata. `main.js` o
captura logo no carregamento (`preventDefault`, guarda o evento) e o descarta em
`appinstalled`. O botão só aparece com o evento em mãos — o que nunca acontece no iOS, no
Firefox, nem com o app já instalado — e, nesta versão, só na faixa de garantias da tela de
boas-vindas.

## Componentes

### `js/state.js`
- `FONTE_DEMO = 'Demo'`.
- `primeiraVisita(songs, books)` e `mostraGuiaDemo(songs, settings)`, puras e com teste.

### `js/render/welcome.js` (novo)
A tela de boas-vindas e o cartão "Comece por aqui", com as prévias. Módulo novo: comentários
em inglês, e entra no `SHELL`.

### `js/render/home.js`
`renderHome` escolhe entre o guia e a biblioteca, e põe o cartão acima do conteúdo das três
abas de música.

### `js/main.js`
- `importarArquivo`, extraído de `wireBackupInput`.
- Ações novas: carregar a demo, abrir `.somaplay` pela home, adicionar livro pela home,
  fechar o cartão, instalar.
- Os eventos `beforeinstallprompt`, `appinstalled`, `online` e `offline`.

### `js/samples.js`
O carregador da demo: a URL e a busca que devolve um `File`.

### `js/render/settings.js`
"Importar exemplos" chama o carregador. A descrição muda para "Groove de teste — cifra,
mixer com 4 canais e karaokê".

### `js/i18n/pt.js` e `js/i18n/en.js`
Chaves `home.welcome.*` e `home.guia.*`, e a nova descrição em `settings.samples.sub`.

### `css/app.css`
Estilos do guia e do cartão, só com os tokens existentes — o tema claro funciona sem regra
própria.

### `app/demo/soma_play-demo.somaplay` e `scripts/demo/`
O arquivo e o gerador, com as fontes: o registro da música e os quatro mp3 recuperados de
`d3ea232`.

### `sw.js` e `js/version.js`
Versão **0.20.0** — MINOR, recurso novo. O `SHELL` ganha `./js/render/welcome.js`; o arquivo
da demo não entra.

### `CHANGELOG.md`, `README.md` e `README.pt-BR.md`
A entrada da versão. O "Para ver funcionando" passa a apontar para a home.

## O que não muda

- A Home de quem já tem música ou livro, a não ser pelo cartão enquanto a demo estiver lá.
- O import: merge continua sem apagar nada, e Configurações continua perguntando antes.
- `DB_NAME`, o formato do `.somaplay` e o `CAMPOS` de `partes.js`.
- Nenhum conteúdo musical de terceiros entra no repositório.

## Fora de escopo

- **Mais músicas na demo**, a lista "Show de exemplo" e o livro "Caderno Demo". A demo nasce
  com uma música; crescer é acrescentar ao arquivo.
- **O botão "+" na barra do topo**, que tiraria "Adicionar música" de Configurações para
  todo mundo.
- **"Instalar o app" em Configurações**, e instruções de instalação para o iOS.
- **Web Share Target** — receber o `.somaplay` direto do WhatsApp.
- **Medição.** O app não tem backend; a validação é olho no olho.

## Verificação

**`node --test`:**
- `primeiraVisita`: biblioteca vazia; só livros; só músicas.
- `mostraGuiaDemo`: com demo e sem o ajuste; com o ajuste; sem demo.
- O arquivo da demo, lido por `lerManifest`: `partes` igual a `['cifra', 'audio']`, uma
  música com fonte "Demo", quatro stems cujos `blobId` estão em `manifest.blobs`, sem
  `settings` e sem `chordbook`.
- `shell.test.js`, `i18n.test.js` e `version.test.js`, que já existem, cobrem o `SHELL`, a
  paridade das tabelas e a versão.

**No navegador**, num perfil limpo (aba anônima), em 1280×800 e em retrato:
- A tela de boas-vindas aparece, sem a faixa de abas.
- **Adicionar música** abre o cadastro. **Adicionar livro** passa pelo PDF e termina na aba
  Livros, com as abas de volta.
- **Abrir .somaplay**, com um artista exportado de outro aparelho: importa sem perguntar, e
  as abas voltam.
- **Carregar demo**: aparecem o cartão e a pílula "Demo". No Groove de teste, a cifra rola,
  o acorde abre o desenho, o mixer tem quatro canais em sincronia e o karaokê mostra a letra.
- **Tirar a demo**: confirma, apaga, e a tela de boas-vindas volta. O × do cartão sobrevive
  a recarregar a página.
- Offline no DevTools: o aviso aparece; com a demo já carregada uma vez, ela carrega de novo
  sem rede.
- **Instalar o app** aparece no Chrome (Android e desktop), e não aparece no Firefox nem com
  o app instalado.
- Inglês e tema claro.
- Um aparelho só com livros não vê a tela de boas-vindas.

## Próximos passos

- Músicas autorais para a demo (bossa, samba), a lista e o livro de exemplo.
- Refazer os screenshots do README com a demo — os de hoje mostram trechos de "A Alma e a
  Matéria" e "Andança".
- O "+" no topo, se a tela de boas-vindas mostrar que criar precisa estar mais perto.
