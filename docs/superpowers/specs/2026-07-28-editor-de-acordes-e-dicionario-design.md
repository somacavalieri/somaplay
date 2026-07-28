# Soma_play — Editor de acordes (pestana) & Dicionário de acordes (design)

**Data:** 2026-07-28 · **Estado:** aprovado (brainstorming) → próximo passo `writing-plans`
**Estende:** [`2026-07-06-importacao-e-catalogo-acordes-design.md`](2026-07-06-importacao-e-catalogo-acordes-design.md) — traz para dentro do escopo os dois itens que ele deixou "fora do MVP": **catálogo editável dentro do app** (com promoção de voicing) e **sincronização do catálogo no backup**.
**PRD:** [`2026-06-25-soma-play-design.md`](2026-06-25-soma-play-design.md) — Anexo A#3 (acordes e diagramas), §10 (Configurações).

---

## 1. Problema e origem

Com o app em uso real, a edição de acordes travou em três pontos e faltou um lugar para guardar o trabalho:

1. **Não dá para fazer pestana.** O editor ([`addedit.js`](../../../app/js/render/addedit.js) L59-81) é só uma grade de pontos: `setFret` mexe em `frets[i]` e apenas *copia* o `barre` da forma de origem. Formas embutidas têm pestana (o `chordSVG` desenha), mas o usuário não consegue criar, mover nem remover uma.
2. **Não dá para gerenciar variações.** Editar um acorde grava só em `song.cifra.digitacoes` (snapshot). O catálogo é **só-leitura em runtime** ([`chords-catalog.js`](../../../app/js/chords-catalog.js)), então a forma nova nunca vira variação — foi o que aconteceu em *Queremos Saber*. Pior: o seletor da tela de toque ([`play.js`](../../../app/js/render/play.js) L256-275) lista apenas `catalogShapes(nome)`, então a forma editada pela própria música **some da lista** (só aparece marcada se coincidir com uma do catálogo).
3. **A tela sobe a cada toque.** `update()` faz `app.innerHTML = html` e só preserva a rolagem da tela *play* ([`main.js`](../../../app/js/main.js) L37-51). Na tela de edição, cada toque numa casa recria o `.content-scroll` e a rolagem volta a zero.
4. **Falta o dicionário.** Não existe onde registrar as variações de cada acorde nem como reaproveitá-las em outras músicas.

## 2. Decisões (do brainstorming)

- **Pestana por botão de casa.** Cada linha da grade ganha um botão `[⌐]` na margem que liga/desliga a barra naquela casa; as pontas se ajustam tocando nas células da mesma casa. Sem gestos escondidos — um toque resolve o caso comum (pestana cheia).
- **Editar de três lugares.** O mesmo editor abre em *Editar música*, no **Dicionário** (Configurações) e no seletor da **tela de toque** — corrigir uma digitação durante o ensaio não deve exigir sair da música.
- **Dois botões no rodapé do editor.** Quando a forma veio de uma variação e mudou: `Atualizar variação` ou `Salvar como nova`. Decisão em um toque, sem diálogo — não gera lixo nem sobrescreve sem querer.
- **Toda forma salva entra no dicionário.** Não há saída de escape "só nesta música"; era o pedido original ("a variação automaticamente vai para o dicionário").
- **Dicionário por sobreposição.** O `CATALOG` do código continua como semente só-leitura; o IndexedDB guarda só o delta do usuário. Preserva o canal de eu mandar acordes novos por código/import (`.somaplay` em modo merge).
- **Corrigir no dicionário propaga.** Atualizar uma variação atualiza as músicas que a usam (por `varId`), com toast "N músicas atualizadas". Música com forma própria não é tocada.
- **Dicionário em tela única**, agrupado por tônica, com todas as variações visíveis em miniatura — a tarefa principal é registrar e conferir em lote.

## 3. Escopo

**Dentro:**
- **A.** Editor de casas compartilhado, com **pestana** e **casa base**.
- **B.** **Dicionário de acordes** em Configurações (criar, editar, apagar, marcar padrão, renomear rótulo).
- **C.** Seletor da tela de toque completo (lista fundida + criar/editar ali mesmo).
- **D.** *Adicionar/editar música* usando o editor compartilhado.
- **E.** Correção da rolagem em re-render.
- **F.** Dicionário no backup `.somaplay` (substituir e merge).

**Fora (registrado):** transposição, mais de uma pestana por forma, indicação de dedos (1-2-3-4) nos pontos, afinação alternativa, geração de diagramas a partir do texto.

## 4. Modelo de dados

### 4.1 Dicionário fundido (`app/js/chordbook.js`, novo)

Duas fontes, fundidas em leitura:

```
EMBUTIDO   chords-catalog.js (código, só-leitura)
           id sintético = "b:<nome>:<índice no array>"   ex.: "b:Bb7M:0"

SEU        IndexedDB store 'chordbook' (keyPath 'name'), um registro por nome:
           { name: 'Bb7M',
             vars: [ { id:'u:a1b2', frets:[...], barre?:{fret,from,to}, label:'pestana 1ª' } ],
             hidden: ['b:Bb7M:1'],     // embutida apagada (lápide)
             defaultId: 'u:a1b2' }     // qual variação é a padrão deste nome
```

- **Variação sua** nasce com id `u:<uid()>`.
- **Correção de embutida:** uma variação sua cujo id começa com `b:` **substitui a embutida no lugar dela** (mantém a posição na lista).
- **Exclusão:** variação sua é removida do array; embutida vira lápide em `hidden`.

**API (síncrona, sobre um mapa em memória carregado no `initState`):**

| função | devolve / faz |
|---|---|
| `loadChordbook()` | lê o store para a memória (chamada no `initState`, como as settings) |
| `shapesOf(nome)` | `[{ id, frets, barre?, label, origin:'builtin'\|'user', isDefault }]` — embutidas na ordem do código (sem as escondidas, com override aplicado no lugar), depois as suas na ordem de criação |
| `defaultShape(nome)` | a forma padrão: `defaultId` → embutida com `default:true` → primeira → `null` |
| `upsertVar(nome, var)` | grava/atualiza uma variação (id `b:` = override) e persiste |
| `removeVar(nome, id)` | remove sua / adiciona lápide de embutida; limpa `defaultId` se era ela |
| `setDefault(nome, id)` | define `defaultId` |
| `restoreBuiltins(nome)` | esvazia `hidden` daquele nome |
| `songsUsingVar(songs, nome, id)` | músicas que usam aquela variação (por `varId`) — pura, recebe a lista de músicas para o módulo não depender do estado da biblioteca |

O merge é síncrono sobre objeto em memória, então `chordSVG` continua síncrono e os testes em Node (sem IndexedDB) rodam vendo só as embutidas.

### 4.2 Música (retrocompatível)

`song.cifra.digitacoes[nome]` ganha campo opcional:

```
{ frets:[...], barre?:{fret,from,to}, varId?:'u:a1b2' }
```

`varId` é o que habilita a propagação. Músicas antigas (sem `varId`) continuam funcionando e nunca são alcançadas por ela; forma cujo `varId` aponta para uma variação apagada também não — o seletor a mostra como "desta música".

### 4.3 Resolução na renderização

Ordem inalterada em espírito, só troca a fonte do fallback:

```
song.cifra.digitacoes[nome]  →  defaultShape(nome)  →  "?"
```

`chords.js` passa a importar `defaultShape` de `chordbook.js` em vez de `catalogDefault` de `chords-catalog.js`.

### 4.4 Estado do editor

Um objeto só, que faz o mesmo componente servir aos três pontos de entrada:

```js
S.chordEd = {
  name, frets:[6], barre: null | {fret,from,to}, base: 1, label: '',
  origin: { kind:'draft'|'song'|'book', songId?: id, varId?: id|null }
}
```

`varId: null` = forma inédita (rodapé mostra só `Salvar`). O `kind` diz **onde a forma escolhida é gravada** — o dicionário é atualizado igual nos três casos:

| `kind` | aberto de | ao salvar, a forma vai para |
|---|---|---|
| `draft` | Adicionar/editar música | `S.draft.digitacoes[nome]` (só chega ao IndexedDB quando a música for salva) |
| `song` | seletor da tela de toque | `song.cifra.digitacoes[nome]` + `saveSong` na hora |
| `book` | Dicionário | nenhuma música — só o dicionário (e a propagação da §7.2) |

A variação entra no dicionário **no ato de salvar**, inclusive no `kind:'draft'` — cancelar o cadastro da música depois não a remove de lá.

## 5. A — Editor de casas (`app/js/render/chordeditor.js`, novo)

```
┌ Bb7M · casa base [◂ 1ª ▸] ────────────────────── [✕] ┐
│           Mi   Lá   Ré  Sol   Si   Mi                │
│           ✕    ·    ·    ·    ·    ·     ← ✕ / ○ / · │
│   [⌐] 1ª ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬                 │
│   [⌐] 2ª [  ][  ][  ][  ][  ][  ]                    │
│   [⌐] 3ª [  ][  ][ ● ][ ● ][ ● ][  ]                 │
│   [⌐] 4ª [  ][  ][  ][  ][  ][  ]                    │
│   [⌐] 5ª [  ][  ][  ][  ][  ][  ]                    │
│                                                      │
│   rótulo [ pestana 1ª            ]                   │
│   vindo de "aberto" · usada em 3 músicas             │
│   [ Atualizar variação ]  [ Salvar como nova ]       │
└──────────────────────────────────────────────────────┘
```

### 5.1 Regras da pestana (reducers puros, testáveis)

- **`toggleBarre(casa F)`** — botão `[⌐]` da linha:
  - sem pestana → cria `{fret:F, from:0, to:5}`; toda corda com `frets[i] < F` (inclui `-1` abafada e `0` solta) passa a `F`; corda presa acima de `F` fica onde está;
  - pestana já naquela casa → remove a barra; as cordas **mantêm os valores** (viram pontos normais);
  - pestana em outra casa → move para a nova casa com vão cheio (a anterior vira pontos normais). Uma pestana por forma.
- **Toque numa célula da MESMA casa da pestana** → move a **ponta mais próxima** até aquela corda (encurta ou estende): você toca na corda onde quer que a ponta **fique**. Corda que entra no vão e está abaixo de `F` sobe para `F`; corda que sai **mantém o valor** (ponto normal em `F`), e a partir daí a cabeça ✕/○ dela volta a funcionar. Por esse caminho o vão nunca fica menor que 2 cordas — para tirar a barra inteira, o botão `[⌐]`.
  Com pestana ativa, **tocar na casa `F` sempre significa mover a ponta** — inclusive fora do vão (é assim que se estende). Não há como criar um ponto avulso na mesma casa da barra; para o violão dá no mesmo som, e a regra fica sem exceção.
- **Toque numa célula de outra casa, ou na cabeça (✕/○):**
  - corda **fora** do vão → comportamento normal (alterna valor; tocar na casa já marcada solta a corda);
  - corda **dentro** do vão, casa **acima** de `F` → permitido, a barra continua (nota tocada por outro dedo);
  - corda **dentro** do vão, casa **abaixo** de `F` ou cabeça ✕/○ → se a corda é uma **ponta**, o vão encolhe uma corda e o valor é aplicado (e se sobrar uma corda só, a pestana some e fica o ponto normal); se é **interna**, o toque não faz nada (não se abre buraco embaixo da própria barra). Essas células internas são desenhadas **travadas** (esmaecidas), para o toque morto não parecer bug.

### 5.2 Casa base

Stepper `◂ N ▸` (1..15) que só desloca a janela de 5 linhas da grade, para alcançar voicings altos. **Não é dado persistido** — o `chordSVG` continua derivando a base dos próprios `frets`. Ao abrir o editor, a base inicial é derivada da forma (como hoje).

### 5.3 Rótulo e rodapé

- **Rótulo:** campo de texto, pré-preenchido ao criar: `pestana Nª` se tem barra, senão `casa Nª` se a base > 1, senão `aberto`; nome repetido no mesmo acorde ganha sufixo `(2)`.
- **Rodapé:**
  - `varId == null` → `[ Salvar ]` — cria a variação e aponta a música para ela;
  - `varId != null` → `[ Atualizar variação ]` e `[ Salvar como nova ]`.
- **Dedupe:** se a forma salva (frets + barre) já existir na lista fundida daquele nome, **reaproveita a variação existente** em vez de criar duplicata — a música só passa a apontar para ela.
- **`Atualizar variação`** grava por id (id `b:` vira override) e **propaga** (§7.2).

## 6. B — Dicionário de acordes (Configurações)

Nova linha em Configurações abre a tela `chordbook`:

```
┌ Dicionário de acordes ──────────────────────────────┐
│ [🔍 buscar]    A B C D E F G       [ + acorde ]     │
│                                                     │
│ ── C ──                                             │
│  C      [□★][□ ][□ ]  [+]                           │
│  C/E    [□★]          [+]                           │
│  C7M    [□★][□ ]      [+]                           │
│ ── D ──                                             │
│  D      [□★][□ ]      [+]                           │
└─────────────────────────────────────────────────────┘
```

- Agrupado por tônica (`A`…`G`, com alterações junto da sua tônica); busca filtra por nome; chips saltam para o grupo.
- Cada linha: nome + todas as variações em miniatura (`chordSVG` small), ★ na padrão, "N músicas" sob as que estão em uso, e `[+]` para criar.
- Tocar numa miniatura abre o **editor** logo abaixo da linha. As ações `★ tornar padrão` e `🗑 apagar` são renderizadas **pela tela do dicionário, em volta do editor** — o componente do editor não ganha ramo por origem (o rótulo editável, esse sim, é dele).
- Apagar embutida vira lápide; nome com embutida escondida mostra `↺ restaurar embutidas`.
- `[+ acorde]` pede o nome (validado por `isChordTok`) e abre o editor com a grade vazia.

## 7. C — Seletor na tela de toque

### 7.1 Popover

- Lista `shapesOf(nome)` **mais** a forma que a música usa quando não estiver na lista, rotulada "desta música" (hoje ela desaparece).
- Marca a selecionada comparando `varId` (com fallback para comparação de `frets`, para músicas antigas).
- Rodapé: `[ + Nova variação ]` (editor com grade vazia) e `[ Editar ]` (editor sobre a variação selecionada). O editor abre **dentro do popover**.
- Escolher uma variação grava `{frets, barre?, varId}` na música e persiste (como hoje, `saveSong`).

### 7.2 Propagação

`applyVarToSongs(nome, varId, forma)` percorre `S.songs`; para cada música com `digitacoes[nome].varId === varId` e forma diferente, substitui `frets`/`barre` e salva. Devolve a contagem para o toast "N músicas atualizadas" (silencioso quando 0).

## 8. D — Adicionar/editar música

- A seção "Digitações dos acordes" continua igual, mas usa o **editor compartilhado** (pestana, casa base, rodapé de salvar).
- A fileira "catálogo:" (hoje botões de texto) vira **miniaturas** das variações de `shapesOf(nome)`, com a padrão marcada.
- No `commitDraft`, acorde sem digitação continua recebendo a padrão do dicionário — agora **com `varId`**.

## 9. E — Correção da rolagem

`update()` passa a guardar `scrollTop` de `.content-scroll` (e do `[data-autoscroll]`, como já faz) e a restaurá-los **quando a tela renderizada é a mesma da renderização anterior** — um `lastScreen` no módulo. Troca de tela continua começando do topo. Conserta a edição de casas e qualquer re-render de formulário.

## 10. F — Backup

- O manifest do `.somaplay` ganha `chordbook` (array dos registros do store).
- **Substituir:** troca o dicionário inteiro pelo do arquivo.
- **Adicionar/atualizar (merge):** por nome — une `vars` por id (**conflito de id mantém o local**), une `hidden`, e adota `defaultId` do arquivo só se o local não tiver.
- É o que faz os `.somaplay` que eu gerar levarem acordes e variações novas.

## 11. Persistência

- `db.js`: novo store `chordbook` (keyPath `name`), **`DB_VERSION` 1 → 2**. Acréscimo puro — `onupgradeneeded` já cria só o que falta e nenhuma tabela existente é tocada.
- `DB.loadChordbook()` / `DB.putChordName(rec)` / `DB.clearChordbook()`.

## 12. Verificação

**Testes em Node (`node --test app/test/`):**
- `chordbook`: ordem da lista fundida; override de embutida por id (mantém posição); lápide esconde; `defaultId` vence `default:true`; `defaultShape` cai para `null` em nome desconhecido.
- Reducers do editor: ligar pestana sobe as cordas abaixo e preserva as acima; encurtar/estender ponta; vão < 2 cordas remove a barra; corda interna abaixo da barra é no-op; desligar preserva os valores; round-trip (editar → salvar → reabrir → mesma forma).
- Dedupe: salvar forma idêntica a uma existente não cria variação nova.
- Propagação: `applyVarToSongs` muda **só** as músicas com aquele `varId`.
- Backup: merge de `chordbook` (união por id, local vence conflito).

**Manual no tablet:**
- Fazer a pestana do F (e de um Bm7 com vão da Lá ao Mi agudo) em *Queremos Saber*, salvar, reabrir e conferir o desenho.
- Editar uma variação numa música e vê-la aparecer como opção em outra música com o mesmo acorde.
- Corrigir uma variação no Dicionário e ver o toast com a contagem.
- Conferir que a tela **não sobe mais** a cada toque numa casa.
- Rodar local: `cd app && python3 -m http.server 8137`.

## 13. Arquivos afetados

- **Novos:** `app/js/chordbook.js`, `app/js/render/chordeditor.js`, `app/js/render/chordbook.js`, testes em `app/test/`.
- **Editar:** `app/js/chords.js` (resolve via `defaultShape`), `app/js/db.js` (store + versão), `app/js/state.js` (`S.chordEd`, `loadChordbook` no `initState`), `app/js/main.js` (ações novas + rolagem), `app/js/render/addedit.js`, `app/js/render/play.js`, `app/js/render/settings.js` (linha do Dicionário), `app/js/backup.js`, `app/css/app.css`, `app/sw.js` (bump da versão do cache + arquivos novos na lista).
- **De carona, no `sw.js`:** `./js/render/estilo.js` **não está** no `SHELL` — a tela de estilos não é pré-cacheada e pode falhar offline numa instalação nova. Como a lista já será mexida, incluir.
- **Docs:** marcar no spec de 2026-07-06 os dois itens que saíram de "fora do MVP".
