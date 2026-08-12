# Desambiguação por fonte — design

2026-08-12

## O problema

Duas músicas do mesmo artista com o **mesmo título** e ids diferentes ficam
indistinguíveis nas listagens. A tela mostra duas linhas iguais e não há como saber
qual é qual sem abrir cada uma.

Aconteceu na importação do acervo do Vitor (fonte **VJ**): **21 músicas** têm título
igual a músicas que já estavam na biblioteca, vindas do CifraClub — `Sampa`,
`Chega de Saudade`, `Gostoso Demais`, e outras. Registrado em `pendencias.md`
(2026-08-11).

O contorno em produção hoje é um **sufixo no título**: as do VJ entraram como
`Sampa (v2)`, `Chega de Saudade (v2)`. Isso codifica a procedência dentro do campo
errado, e cobra por isso em quatro lugares:

- **busca** — `s.title.toLowerCase().includes(q)` (`home.js:25`, `:51`, `:87`) casa
  `Sampa (v2)` com a query `sampa`, mas o `(v2)` também entra no texto pesquisável;
- **ordenação** — `a.title.localeCompare(b.title, 'pt')` (`state.js`) ordena pelo
  sufixo;
- **exibição** — o `(v2)` vaza para o cabeçalho do player (`play.js:68`), para o
  popover (`popover.js:29`) e para as listas de show;
- **manutenção** — o sufixo é temporário por construção: quando o usuário escolher a
  versão preferida, precisa apagar a outra **e** editar o título da que ficou. Um
  passo manual, música por música, que ninguém vai lembrar de fazer.

E não escala: uma terceira fonte com o mesmo título pediria `(v3)`.

## O que já existe

O dado que resolve isso **já está no modelo**. `fonte` é campo da música desde
`2026-08-10-atalhos-de-fonte-design.md`, e já é usado como:

- eixo da lente global — `S.fonteFilter`, `matchesFonte(s)` (`state.js:159-165`);
- meta no cabeçalho do player — `play.js:66`;
- recorte de export — `songIdsDasFontes` (`state.js:172`), `nomeDoExport`
  (`backup.js:39`).

`FONTES_FIXAS = ['CifraClub', 'Songbook']` são só os atalhos do formulário; a lista
real vem do que a biblioteca usa, via `fontesSugeridas` / `fontesDaBiblioteca`. Fonte
é **texto livre com dedupe por grafia** — `VJ` entra sem mudar código, e as próximas
fontes também.

Ou seja: as músicas do VJ e as do CifraClub já são distinguíveis **nos dados**. O que
falta é isso aparecer nas listagens.

## A decisão

**Fonte não vira chave de identidade.** O `id` já é a identidade, e continua sendo —
`(artista, título, fonte)` como chave composta quebraria o merge por id, que é a base
do import (`merge.js`) e o motivo de listas com órfãos curarem sozinhas.

Fonte vira **desambiguador de exibição, aplicado só onde há colisão**:

> Para cada par `(artistId, title)` com mais de uma música na biblioteca, as linhas
> dessas músicas mostram a fonte como qualificador secundário. Onde o título é único,
> nada muda.

Uma função pura em `state.js`:

```js
// Retorna a fonte da música quando ela precisa aparecer para desambiguar —
// isto é, quando outra música do mesmo artista tem o mesmo título. Fora de
// colisão retorna '', e a listagem não muda em nada.
export function qualificadorDe(song, songs) { … }
```

Comparação de título por `trim().toLowerCase()` e de artista por `artistId`, para
`Sampa` e `sampa ` colidirem como o usuário espera.

O render exibe título e qualificador como **elementos separados** — nunca
concatenados numa string —, para que a busca e a ordenação continuem vendo só
`s.title`:

```html
<div class="t">Sampa <em class="src-qual">VJ</em></div>
```

Pontos de exibição a cobrir: lista de músicas e lista dentro do artista
(`home.js:73`), popover de música (`popover.js:29`), seletor de música ao montar
lista, e as linhas de uma lista de show. O cabeçalho do player (`play.js:66`) já
mostra a fonte sempre, e fica como está.

### Por que assim

- **O título continua sendo o título.** Busca, ordenação, export e backup ficam
  corretos sem tratamento especial.
- **Some sozinho.** Apagada a duplicata, a colisão deixa de existir e o qualificador
  desaparece — sem editar registro nenhum. É o passo manual da pendência atual que
  deixa de existir.
- **Escala para N fontes.** Três músicas com o mesmo título mostram três fontes. Não
  há `(v3)`.
- **Casa com o filtro que já existe.** "Quero só as do songbook" já é a lente por
  fonte; a desambiguação é o caso em que as duas convivem na tela.

### Alternativas descartadas

- **Manter o sufixo no título, só automatizado.** Ainda contamina busca, ordenação e
  export, e ainda precisa ser desfeito à mão.
- **Chave composta `(artista, título, fonte)`.** Quebra o merge por id e transforma
  "corrigir a fonte de uma música" em "criar outra música".
- **Mostrar a fonte em toda linha, sempre.** Polui a listagem inteira — a biblioteca é
  majoritariamente de títulos únicos — e rouba largura do título num tablet em pé na
  estante.
  *Revisado em 2026-08-12* (`2026-08-12-lista-compacta-em-colunas-design.md`): na
  **aba Músicas**, a linha compacta em colunas mostra a fonte como badge em toda
  linha — lá o badge não compete com o título, e o qualificador inline fica só para o
  caso ordinal. A análise acima segue valendo para o card largo das telas Artista e
  Estilo, onde o qualificador continua integral.
- **Deduplicar na importação.** Não dá: as duas versões são conteúdo diferente e o
  usuário quer justamente comparar antes de escolher.

## Colisão sem fonte preenchida

Se as duas músicas em colisão não têm `fonte`, o qualificador não desambigua nada — a
tela volta a mostrar duas linhas iguais.

**O formulário já resolve o caso novo.** `addedit.js:291` nunca salva fonte vazia —
sem preenchimento, ela cai para `'CifraClub'` ou `'Songbook'` conforme o tipo de
cifra:

```js
fonte: (d.fonte && d.fonte.trim()) || (d.cifraFonte === 'texto' ? 'CifraClub' : 'Songbook'),
```

Então toda música salva pelo formulário já tem fonte, e uma exigência extra no save
seria redundante. **Não vamos adicioná-la.**

O buraco real é outro: **biblioteca antiga e conteúdo importado**, que podem ter
`fonte` vazia porque nunca passaram por esse default — inclusive as músicas geradas
por script e entregues via `.somaplay`.

**Decisão:** quando a colisão tem fonte vazia dos dois lados, a listagem cai para um
qualificador ordinal — `1`, `2` — pela ordem de `createdAt` (estável e já presente no
registro), com desempate por `id` para nunca ficar indeterminado. Deliberadamente
feio: é um convite a preencher a fonte, e o único caso em que aparece é aquele em que
o usuário não tem outra forma de distinguir.

Quando **só um lado** tem fonte, o lado com fonte mostra a fonte e o lado sem mostra
o rótulo de sem-fonte já existente (`home.fonte.none`), reaproveitando o vocabulário
da lente.

## O conflito de nome: `song.fonte` vs `song.cifra.fonte`

Dois campos chamados `fonte` no mesmo registro, com significados diferentes:

- `song.fonte` — **de onde a cifra veio**: `'CifraClub'`, `'Songbook'`, `'VJ'`,
  texto livre;
- `song.cifra.fonte` — **o tipo da cifra**: `'imagem'` ou `'texto'`
  (`play.js:383-390`, `addedit.js:291`).

`addedit.js:291` já concilia os dois numa linha só, e ela é difícil de ler justamente
por isso. Enquanto este trabalho mexe em ambos, vale renomear o interno para
`cifra.tipo`.

**Decisão:** renomear `song.cifra.fonte` → `song.cifra.tipo`, com migração na leitura
(`db.js`) que aceita os dois e normaliza para o novo, para que biblioteca antiga e
arquivo `.somaplay` antigo continuem abrindo. Nenhum valor persistido muda — só o
nome do campo. `'imagem'` e `'texto'` continuam fora de `t()`, pela regra de nunca
traduzir valor de `data-*` persistido.

Se na implementação isso mostrar risco maior que o ganho, é a parte que sai — ela é
higiene, não requisito.

## Migração das 21 do VJ

Passo de dados, **independente do de UI** e aplicável antes dele:

1. nas 21 músicas importadas do VJ, definir `fonte: 'VJ'`;
2. remover o sufixo ` (v2)` do `title` dessas músicas;
3. garantir que as originais correspondentes tenham `fonte: 'CifraClub'` — as que
   estiverem sem fonte precisam receber, senão a colisão fica meio-cega.

Feito isso, cada colisão fica legível por si: `Sampa · CifraClub` e `Sampa · VJ`.
O usuário compara, escolhe, apaga a perdedora — e a que fica volta a ser só `Sampa`,
sem edição nenhuma.

O caminho de execução é o mesmo já usado para entrar com o acervo: gerar um
`.somaplay` e importar em modo merge, que faz upsert por id
(`adicionar-musica-por-merge`). Como os ids não mudam, o merge sobrescreve título e
fonte das 21 sem criar registro novo.

## Fora deste trabalho

- **Comparar duas versões lado a lado.** É a pergunta natural depois de ver as duas
  linhas, e é outra tela.
- **Mesclar duas músicas** (herdar stems de uma, cifra de outra).
- **Fonte com metadados** (URL de origem, data de captura, autor da transcrição).
  Fonte segue sendo uma string.
- **Colisão entre artistas diferentes.** Dois artistas com música de mesmo nome não é
  colisão — a listagem de músicas já mostra o artista embaixo do título.

## Verificação

- `node --test` — testes de `qualificadorDe`: sem colisão retorna `''`; colisão com
  fontes distintas retorna a fonte; colisão com fonte vazia dos dois lados cai no
  ordinal; título com espaço/caixa diferente colide; mesmo título em artistas
  diferentes **não** colide.
- `node --test` — migração `cifra.fonte` → `cifra.tipo`: registro antigo lido
  normaliza; registro novo passa intacto.
- **Navegador** — a busca por `sampa` traz as duas e o texto pesquisável não contém
  `v2`; a ordenação alfabética não muda; a colisão aparece qualificada na lista de
  músicas, dentro do artista, no popover e na lista de show; apagar uma faz o
  qualificador sumir da outra.
- **Offline** — se algum módulo novo entrar em `app/js/`, adicionar ao `SHELL` de
  `app/sw.js` **e** bombar `VERSION`.
