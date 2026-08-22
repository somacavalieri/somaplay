# Soma_play — Livros em PDF — design

**Data:** 2026-08-22 · **Estado:** especificado
**Origem:** pedido do usuário — "eu como usuário gostaria de poder adicionar livros em .pdf
e transformar eles em arquivo .somaplay igual fazemos com as imagens. Muitas vezes não é
possível converter o arquivo e isso impede de subir todos os livros." Com dois exemplos:
`555027200-The-Beatles-Essential-Songs.pdf` e `889817455-Michael-Jackson-Complete-Songbook.pdf`,
os dois em `chords/_a-identificar/`.

## O problema

O acervo tem livro que o app não alcança. A única porta de entrada de cifra em imagem é o
editor de música, que aceita `image/*` e nada mais (`render/addedit.js`), e a única maneira
de transformar um songbook em música do app é o pipeline de extração — scripts Python,
skill `/chord`, receita `pdf-scan.md`. Esse pipeline é bom no que faz e vai continuar
existindo, mas ele tem um custo por música e um custo por livro, e é isso que trava:
**enquanto o livro não é extraído, ele não existe no tablet.** Há livro parado em
`_a-identificar/` desde que o acervo começou.

O pedido inverte a ordem. Primeiro o livro sobe inteiro e legível na estante; extrair
música dele vira uma coisa que se faz depois, quando valer a pena, ou nunca.

### O que os arquivos são, medido

| Livro | Págs | Imagem por página | Filtro | Peso |
|---|---|---|---|---|
| The Beatles Essential Songs | 401 | 2480×3507 cinza (≈300 dpi) | CCITTFaxDecode, 1 bit | 14,5 MB |
| Michael Jackson Complete Songbook | 61 | 1239×1702 (≈150 dpi) | Flate + DCTDecode | 11,7 MB |
| Beatles Fake Book | 176 | 1700×2800 color | DCTDecode | **301 MB** |

Três fatos que decidem o resto do documento:

1. **São scans**: uma imagem por página, camada de texto ausente ou residual. Não há o que
   parsear — há o que desenhar.
2. **O PDF pesa o mesmo ou menos que as imagens dele.** Converter não economiza disco.
3. **O Beatles é CCITT G4.** Só um decodificador de fax lê aquilo. Isso elimina, sozinho, a
   ideia de extrair as imagens embutidas com um parser próprio: funcionaria no Michael
   Jackson e falharia exatamente no livro que motivou o pedido.

E um ganho colateral que vale registrar: 2480×3507 é **melhor** que as cifras soltas de
hoje, capturadas a ~595 px e que borram no tablet.

## Decisão

### Abordagem: guardar o PDF, desenhar a página na hora

O `.pdf` vai inteiro para o OPFS. Uma cópia do **pdf.js** entra no repositório e a tela do
livro desenha a página pedida num `<canvas>`, na resolução que o zoom pedir.

As duas alternativas consideradas e por que caíram:

- **Rasterizar no import** (401 páginas → 401 imagens): para rasterizar no navegador é
  preciso pdf.js **do mesmo jeito**, então o custo da dependência é pago igual — só que
  agora ele fica no caminho do import, a espera vira minutos com risco de falhar no meio, e
  a resolução congela num valor escolhido na hora de importar. Paga o custo e perde a
  fidelidade.
- **Extrair a imagem embutida sem pdf.js**: morre no CCITT G4, como dito acima.

### O preço, dito por extenso

O pdf.js é a **primeira dependência de terceiro** do soma_play. Ele entra vendorizado em
`app/js/vendor/pdfjs/` — versão fixada, `LICENSE` junto, e uma nota em `CONTRIBUTING.md`
dizendo o que é e como atualizar. O valor "sem dependências" do projeto sempre significou
*sem build step e sem gerenciador de pacotes*, e um arquivo estático copiado para dentro do
repositório não fere isso.

O que ele fere é a contagem de bytes. **Medido**, não estimado, no build `legacy` da
v6.2.108:

| Arquivo | Peso |
|---|---|
| `pdf.mjs` | 1,03 MB |
| `pdf.worker.mjs` | 2,38 MB |
| `wasm/` (jbig2, openjpeg, qcms) | 0,45 MB |
| `standard_fonts/` (16 arquivos) | 0,80 MB |
| **total** | **~4,7 MB** |

O app inteiro pesa 1,0 MB hoje, então o precache vai para cerca de 5,7 MB. Fica **de
fora**, de propósito: os `*.map` (8 MB de sourcemap que ninguém lê no tablet),
`web/cmaps/` (1,6 MB e 169 arquivos para codificação CJK, que o acervo não usa) e
`quickjs-eval.wasm` (JavaScript embutido em formulário PDF, fora do escopo).

Os `.wasm` não são opcionais para este acervo: songbook escaneado usa JBIG2 com
frequência, e sem o decodificador a página abre em branco. `standard_fonts` cobre o PDF
de texto cuja fonte não está embutida.

Ele entra no `SHELL` desde a instalação — decisão do usuário, tomada de novo depois desta
medição, contra a alternativa de buscá-lo na primeira importação, que deixaria o shell
magro ao custo de exigir estar online para importar o primeiro livro. Cinco megabytes uma
vez por versão é ruído ao lado de um songbook de 300 MB.

### Livro não é música

Um livro é uma entidade nova, e não um caso especial de música. Não entra em `S.songs`, não
participa da lente T1/T2/T3, não aparece em Artistas nem em Estilos. É o mesmo argumento que
faz Listas ignorarem a lente hoje: um livro não é "cifra, acompanhamento ou karaokê" — é o
material de onde uma cifra pode um dia sair.

```js
{
  id, titulo, autor, fileName,
  blobId,        // o PDF no OPFS
  capaBlobId,    // página 1 renderizada pequena, no import
  paginas,       // contagem lida no import
  bytes,
  ultimaPagina,  // onde a leitura parou
  createdAt,
}
```

`autor` é **texto livre, não um `artistId`**. O Fake Book dos Beatles e uma coletânea Lumiar
não cabem no mesmo campo, e amarrar livro a artista agora obrigaria a inventar um artista
"Vários" que ninguém pediu. Se um dia o livro precisar apontar para artistas, ele aponta
para vários, e esse é um problema do índice — não deste documento.

`capaBlobId` existe para a estante não precisar abrir todos os PDFs de uma vez. A capa é
renderizada uma única vez, no import, com a largura de um cartão da estante (na ordem de
320 px), e a estante passa a ser só imagem — carrega como a tela de Artistas carrega hoje.

`ultimaPagina` é pequeno e decisivo: reabrir um livro de 401 páginas na página 1 toda vez é
o detalhe que faz o recurso não ser usado.

### Persistência

Object store novo `books` no IndexedDB. `DB_VERSION` vai de 2 para 3; **`DB_NAME` não é
tocado**. Os bytes do PDF usam o `DB.saveBlob()` que já existe e já é genérico — ele não sabe
se está guardando áudio, imagem ou livro, e não precisa saber. Nenhuma infraestrutura de
arquivo é criada.

### A fronteira do pdf.js

**Nenhum módulo do app importa pdf.js diretamente.** Entre os dois fica `app/js/pdf.js`:

```js
abrirLivro(blobId)                    → doc
paginasDe(doc)                        → n
renderPagina(doc, n, larguraCss, dpr) → canvas
fecharLivro(doc)
```

Isso não é cerimônia. É o que permite absorver uma quebra de API do pdf.js, ou trocar de
renderizador, mexendo em um arquivo só; e é o que mantém todo o resto testável sem PDF
nenhum.

O `workerSrc` aponta para o arquivo local. O padrão do pdf.js é um CDN, e um app servido do
GitHub Pages com `workerSrc` no CDN **funciona em desenvolvimento e morre offline** — a
classe exata de bug que o `shell.test.js` existe para pegar. Consequência: os arquivos
vendorizados entram no `SHELL`, e o `modulesOnDisk()` do teste passa a varrer `vendor/`.

### O risco medido antes de qualquer tela

O Fake Book tem 301 MB. Se o pdf.js carregar o arquivo inteiro em memória, o Chrome do
tablet mata a aba. A saída conhecida é abrir por URL com leitura por faixa
(`disableAutoFetch`, `rangeChunkSize`), mas **isso é para medir, não para deduzir**: é o
primeiro passo do plano, antes de escrever tela. Se falhar, o livro grande recebe uma
mensagem honesta em vez de travar o app; os dois livros que motivaram o pedido (14,5 MB e
11,7 MB) não têm esse problema.

## Telas

### Aba Livros

Quinta pílula na `segtab` da home, ao lado de Listas. Estante com capa, título, autor e
`401 páginas · 14,5 MB`. Ignora a lente de modo. Estado vazio com o botão **Adicionar
livro**.

### Import

`<input type="file" accept="application/pdf" multiple>`. Para cada arquivo: contar páginas,
renderizar a capa, salvar registro e blob. O título chega pré-preenchido pelo nome do
arquivo já limpo — `555027200-The-Beatles-Essential-Songs.pdf` vira
`The Beatles Essential Songs`. O prefixo numérico é id do Scribd e está em quase tudo que
está hoje em `_a-identificar/`. Título e autor são editáveis antes de salvar.

Um PDF que o pdf.js não conseguir abrir falha com mensagem e **não deixa registro órfão nem
blob órfão** — o registro só é gravado depois de a contagem de páginas e a capa terem saído.

### Tela do livro (`screen: 'book'`)

A página ocupa a tela. Em cima: voltar, título, menu (renomear · exportar · apagar).
Embaixo, o HUD: `‹ 42 de 401 ›`, o controle de zoom e o botão da grade.

A regra de gesto, que é onde esse tipo de tela costuma ficar irritante:

- **zoom = 100%** → deslizar na horizontal vira a página;
- **zoom > 100%** → arrastar move dentro da página, e a virada só acontece pelas setas do HUD.

Pinça dá zoom nos dois casos. A página é **redesenhada** na resolução do zoom, nunca
esticada — é o ganho da abordagem escolhida, e o motivo de os 300 dpi do Beatles aparecerem
de verdade quando se aproxima. A próxima página é desenhada em segundo plano enquanto a
atual é lida, para a virada ser instantânea.

O canvas tem teto de dimensão (o Chrome tem limite de área de canvas, e 300 dpi × zoom 4
passa dele em tablet). Acima do teto, o zoom continua ampliando por escala em vez de
redesenhar — perde nitidez em vez de perder a página.

### Grade de páginas

Sobreposição dentro da tela do livro: miniaturas com o número embaixo, renderizadas conforme
a rolagem, mais um campo "ir para a página". Enquanto não existe índice de músicas, é assim
que se acha algo em 401 páginas.

As miniaturas ficam em cache **de memória, na sessão**. Persistir 401 miniaturas em OPFS é
otimização a fazer com medida na mão, não antes.

### Um ajuste no código existente

A pinça e o arrasto vivem hoje em `render/play.js:755-793`, amarrados a `[data-imgscroll]` e
a `S.imgZoom`. A **detecção do gesto** sai para um módulo pequeno que as duas telas usam;
o que se faz com o número fica em cada tela (a de tocar muda a largura da `<img>`; a do
livro redesenha o canvas). Duplicar o bloco significaria que a próxima correção de pinça
seria feita em apenas um dos dois lugares.

## O arquivo `.somaplay`

Três superfícies, e só uma é nova:

- **Backup completo** passa a carregar os livros. Um backup que deixa a estante para trás
  mente sobre o que é.
- **Compartilhar um livro**: ação no menu do próprio livro, gerando
  `somaplay-livro-the-beatles-essential-songs-2026-08-22.somaplay`.
- **A folha de compartilhar músicas não muda.** Ela recorta repertório por fonte e por
  lista; um livro de 300 MB naquele diálogo estragaria a coisa que ela faz bem.

O manifesto ganha um `books: []` no topo, ao lado de `artists`, `songs` e `lists`, e os
blobs dos livros entram na lista de blobs como qualquer outro.

### A armadilha do vocabulário de partes

O movimento óbvio seria acrescentar `'livros'` a `PARTES_TODAS` (`partes.js:12`). **Isso
quebraria a restauração de todo backup já gravado em disco.**

O mecanismo: `exportLibrary` grava `partes: ['cifra','audio','pessoal']` explicitamente nos
backups completos de hoje. `fundeMusica` e `podaPorPartes` só devolvem o registro **intacto**
quando `todasAsPartes()` diz sim, e ela passaria a exigir quatro elementos. Todo backup
antigo cairia na cópia campo a campo e perderia, em silêncio, qualquer campo fora de
`CAMPOS` — e perderia **na volta**, que é a direção que ninguém confere.

Então o vocabulário passa a ter dois eixos explícitos:

```js
export const PARTES_DE_MUSICA = ['cifra', 'audio', 'pessoal'];  // o que todasAsPartes() mede
export const PARTES_TODAS = [...PARTES_DE_MUSICA, 'livros'];    // o que um arquivo pode declarar
```

`todasAsPartes()` mede `PARTES_DE_MUSICA`. Livro **não entra em `CAMPOS`**: `CAMPOS` mapeia
campos da música, e livro não é campo de música — é uma coleção de topo, como `lists`.

Arquivo sem `partes` continua lendo como completo, pela mesma `normalizaPartes`.

### Quais bytes são de um livro

Um livro tem dois blobs: o PDF e a capa. A coleta deles é uma função própria,
`blobIdsDosLivros(books)`, e **`blobIdsDasMusicas` não ganha um parâmetro nem um caso
especial**: ela é a definição única de "quais blobs são desta música" (`state.js:296`), e um
segundo eixo de verdade ali é exatamente como apagar e exportar passam a discordar — o
comentário no próprio arquivo já diz isso, e vale igual para o eixo novo.

Apagar um livro apaga os dois blobs junto com o registro. Não existe varredura de blob órfão
no app hoje, então nenhum recolhimento de lixo pode confundir o PDF de um livro com resto de
música apagada.

### Fusão

Livro se funde por `id`. Se o aparelho já tem aquele livro, **mantém o que está lá** em vez
de reescrever 300 MB. Ausência nunca apaga, como em todo o resto do formato. Um arquivo que
declara `livros` e traz zero livros não mexe na estante.

## Fora do escopo, de propósito

- **Índice de músicas dentro do livro** ("*Yesterday* começa na pág. 42"). É a spec seguinte,
  escrita em cima de um livro que já está no app e já foi lido no tablet. `marcadores[]`
  entra no registro do livro quando chegar a hora.
- **Criar Música a partir de páginas do livro.** Depende do índice.
- **Busca de texto dentro do PDF.** Os livros do acervo são scans sem camada de texto; a
  busca acharia nada e pareceria quebrada.
- **OCR.** Continua sendo trabalho do pipeline em `scripts/`, onde há CPU e ferramenta.
- **Rolagem contínua** entre páginas. A leitura é página a página, escolha do usuário.
- **Livro dentro de Lista.** Lista é repertório de show; livro não é item de repertório.

## Verificação

**Testes puros (`node --test`), o que dá para testar sem DOM e sem PDF:**

- limpeza do título a partir do nome do arquivo (prefixo do Scribd, hífens, extensão);
- `podaPorPartes` com o eixo novo, incluindo o caso de arquivo só de livros;
- fusão de livro: novo entra, existente é preservado, ausência não apaga;
- **regressão do backup antigo**: manifesto com `partes: ['cifra','audio','pessoal']` restaura
  o registro intacto, inclusive um campo que `CAMPOS` não conhece;
- `shell.test.js` estendido para varrer `vendor/`;
- `version.test.js` mantendo `version.js` e a linha 2 do `sw.js` casados.

**Manual, no tablet, que é o que conta:** importar os dois livros citados; folhear; aproximar
até enxergar a cifra; abrir a grade e pular para o meio; fechar e reabrir o app offline;
exportar um livro e importar de volta noutro perfil.

**Versão:** MINOR — `0.16.0` em `app/js/version.js` e na linha 2 de `app/sw.js`.

**i18n:** chaves novas nas **duas** tabelas (`pt.js` e `en.js`), produzidas em tempo de
render. Nenhum valor de `data-*` traduzido — `data-id` de livro é id persistido.
