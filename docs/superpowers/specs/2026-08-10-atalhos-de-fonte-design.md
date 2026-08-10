# Soma_play — Atalhos de fonte que crescem com a biblioteca — design

**Data:** 2026-08-10 · **Estado:** especificado
**Origem:** pedido do usuário — "preciso ter a opção de adicionar outras fontes e não
somente CifraClub e Songbook".

Estende `2026-07-06-cabecalho-na-musica-e-fonte-design.md`, que criou o campo
`song.fonte` com exatamente dois atalhos fixos.

## O problema

O campo **Fonte** no formulário de adicionar/editar já é texto livre — dá para digitar
"Real Book", "Tirei de ouvido", o que for. Mas a linha só oferece dois botões,
**CifraClub** e **Songbook**, escritos à mão no template. Quem não sabe que o campo
aceita digitação lê os dois botões como a lista completa; quem sabe, redigita
"Real Book" por extenso a cada música e erra a grafia ("real book", "Realbook"), o que
espalha variantes no acervo.

O que falta não é um botão a mais: é o formulário lembrar as fontes que o usuário já
usou.

## Decisão

Os atalhos passam a ser **derivados da biblioteca**, não escritos no código.

- **CifraClub** e **Songbook** continuam fixos e sempre primeiro — eles são os valores
  do preenchimento automático por tipo de cifra, então precisam existir mesmo numa
  biblioteca vazia.
- Depois deles vêm as fontes já usadas em `S.songs`, ordenadas por **quantas músicas
  usam cada uma** (desc), desempate **alfabético** — determinístico, e portanto
  testável.
- **Máximo de 8 chips no total**, contando os dois fixos. Passou disso, a fonte rara
  fica de fora dos atalhos; o campo de texto continua aceitando qualquer coisa.
- Uma fonte **some sozinha** dos atalhos quando nenhuma música usa mais ela. Não existe
  tela de gerenciar fontes, e nada é persistido além do que já é: a string em
  `song.fonte`.

### Duplicatas

A dedupe ignora maiúsculas/minúsculas e espaço nas pontas: "cifraclub", "CifraClub " e
"CifraClub" são a mesma fonte. **A primeira grafia encontrada vence** e é a que aparece
no chip — na ordem de varredura, os fixos vêm antes, então uma música salva com
"cifraclub" não cria um segundo chip. O registro da música **não é reescrito**: o que
está salvo continua salvo como está.

## Componentes

**`fontesSugeridas(songs, limit = 8)` — nova função pura em `js/state.js`**

Ao lado de `estiloOf`/`songsOfEstilo`, junto da constante `FONTES_FIXAS`. Recebe a
lista de músicas por parâmetro em vez de ler `S.songs` por dentro — quem chama passa
`S.songs`, e o teste passa arrays literais sem tocar no estado global. Sem DOM: entra
em `app/test/` e roda com `node --test`.

Fica em `state.js` de propósito, e não num módulo novo: todo arquivo sob `app/js/`
precisa entrar no `SHELL` do Service Worker, e um módulo a mais é uma chance a mais de
quebrar o app offline sem ganho nenhum aqui.

**`js/render/addedit.js`** — os dois `<button>` escritos à mão viram um `.map()` sobre
`fontesSugeridas()`. O chip aceso continua sendo `d.fonte === nome`. O `data-id` carrega
o nome da fonte, como hoje.

**`css/app.css`** — a linha usa `.chip-row` (a mesma do Estilo, que já quebra linha) e a
regra `.fonte-row` sai. Hoje `.fonte-row` é `flex` sem `wrap`: com 8 chips, o conteúdo
vazaria para fora do formulário.

**`js/i18n/pt.js` e `js/i18n/en.js`** — `addedit.source.cifraclub` e
`addedit.source.songbook` saem das duas tabelas. As duas chaves guardam o texto
*idêntico* em PT e EN, ou seja, não traduzem nada; e o rótulo do chip agora é o próprio
valor persistido, que por regra do projeto não pode passar por `t()`. O rótulo vira
`esc(nome)`.

**`sw.js`** — `VERSION` sobe de `somaplay-v20` para `somaplay-v21`. O Service Worker é
cache-first: sem isso, quem já tem o app instalado continua rodando o JS antigo. O
`SHELL` não muda, porque nenhum módulo novo é criado.

## O que não muda

- O preenchimento automático em `main.js` (`setCifraFonte`: cifra texto → "CifraClub",
  cifra imagem → "Songbook", só quando o campo está vazio) e o default equivalente em
  `commitDraft`.
- O campo de texto livre e seu placeholder.
- O formato do registro salvo. **Nenhuma migração** — arquivos `.somaplay` antigos e
  bibliotecas existentes continuam válidos sem tocar em nada.

## Fora de escopo

- Tela de gerenciar/renomear/apagar fontes.
- Renomear em massa as variantes de grafia que já existam no acervo.
- Autocomplete no campo de texto, filtro ou busca por fonte, link clicável para a
  origem (este último já estava fora em 2026-07-06).
- O mesmo tratamento para o campo **Estilo**, que continua com sua lista fixa de
  gêneros.

## Verificação

**Automática** (`cd app && node --test`) — sobre `fontesSugeridas`:

- biblioteca vazia → exatamente `['CifraClub', 'Songbook']`;
- fontes usadas entram depois dos fixos, mais usadas primeiro;
- empate de contagem → ordem alfabética;
- "cifraclub" e "CifraClub " não viram chips novos; a primeira grafia vence;
- fonte vazia ou só espaço é ignorada;
- o corte respeita o limite de 8 contando os dois fixos.

**Manual, no navegador** (`cd app && python3 -m http.server 8137`) — o que o teste não
alcança:

- Adicionar música: os chips da biblioteca aparecem, clicar preenche o campo e acende o
  chip; digitar à mão acende o chip correspondente.
- A linha quebra em duas com muitos chips, sem vazar do formulário; conferir no tablet.
- Salvar uma música com fonte nova, reabrir o formulário: ela virou chip.
- Abrir "Chega de Saudade": o cabeçalho continua mostrando `Tom Dm · Songbook`.
- Trocar PT/EN com o formulário aberto: os chips continuam com o nome da fonte.
