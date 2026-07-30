# Reordenação por arraste nas Listas

**Data:** 2026-07-30
**Status:** aprovado, aguardando plano de implementação
**Escopo:** tela de uma Lista (`app/js/render/listscreen.js`) — PRD §7 (Listas)

---

## 1. Problema

A ordem das músicas dentro de uma Lista é a ordem do show, então ela é reorganizada com
frequência — e sempre perto do momento de tocar. Hoje cada linha traz um par de setas
↑/↓ que troca a música com a vizinha, uma posição por toque:

```
listscreen.js:41-44  →  main.js:272-273  →  moveList()  →  moveInList()  →  swap + update()
```

Mover a 11ª música para a 1ª posição custa **10 toques**, e cada um deles reescreve o
`innerHTML` do app inteiro. A ação mais comum da tela é a mais cara.

## 2. Decisões tomadas

| # | Decisão | Motivo |
|---|---|---|
| D1 | **Alça dedicada (⠿) + long-press na linha** para pegar a música | A alça dá affordance visível e funciona bem no mouse; o long-press dá um alvo grande no tablet, sem roubar o scroll |
| D2 | **Remover as setas ↑/↓** | A alça ocupa o lugar delas; o ajuste fino de uma posição migra para o teclado |
| D3 | **↑/↓ do teclado com foco na alça** substituem as setas | Mantém precisão e acessibilidade no desktop sem poluir cada linha |
| D4 | **Pointer Events nativos**, sem biblioteca | Ver §3 |
| D5 | **Nenhum `update()` durante o arraste** | `update()` reescreve o `innerHTML` global e destruiria o elemento que está na mão do usuário |
| D6 | **Sem undo e sem toast ao soltar** | Arrastar é ação direta e reversível arrastando de volta; toast a cada arraste irrita |
| D7 | **Sem "Mover para o topo/fim"** | O autoscroll (§4.4) já resolve o caso longo; um menu extra seria peso sem ganho |

## 3. Alternativas descartadas

**HTML5 Drag & Drop (`draggable=true`).** O Chrome do Android não dispara os eventos de
drag por toque — exigiria polyfill. O feedback visual (ghost image do navegador) é feio e
praticamente incontrolável. Descartado.

**SortableJS vendorizado (~45KB).** Resolve touch e autoscroll de graça, mas o projeto é
ESM puro sem build: entraria dependência de terceiros no repo e no cache do Service
Worker, e a lib assume dono do DOM, o que briga com o `innerHTML` global do `update()`.
Para uma tela só, o controle fino do feedback vale mais. Descartado.

**Escolhido: Pointer Events nativos.** Pointer Events unificam mouse e toque num único
conjunto de handlers, não têm dependência, e custam apenas mais um arquivo no SHELL do
Service Worker.

## 4. Interação

### 4.1 A alça

Ícone ⠿ (dois por três pontos) no espaço que hoje é das setas. Alvo de toque 44×44,
`cursor: grab` → `grabbing` durante o arraste. Cor `--muted`, acende no hover e no foco.

**Não aparece** em Favoritas (lista de sistema, ordem automática — o mesmo `return`
antecipado que `moveList` já faz hoje) nem quando a lista tem uma única música.

### 4.2 Pegar a música

| Entrada | Gesto | Regra |
|---|---|---|
| Mouse | `pointerdown` na alça + 4px de movimento | O limiar impede que um clique acidental vire arraste |
| Dedo na alça | `pointerdown` pega imediatamente | `touch-action: none` **apenas na alça** — o scroll do resto da linha segue intacto |
| Dedo na linha | segurar **350ms** | Vibração curta (`navigator.vibrate(15)`) confirma que pegou |

O long-press é **cancelado** se o ponteiro se mover mais de 10px antes dos 350ms — nesse
caso o gesto vira scroll normal. Botões dentro da linha (▶, ♥, −) não iniciam long-press.

### 4.3 Durante o arraste

A linha pega sombra forte, borda `--accent`, escala 1.02 e acompanha o ponteiro no eixo Y
via `transform: translateY()`. As demais deslizam com transição de 160ms, abrindo o buraco
onde a música vai cair — sem placeholder tracejado.

**Os números de posição renumeram ao vivo** (via `textContent`, sem re-render), então o
"1" aparece na música antes de soltar.

### 4.4 Autoscroll

É o que resolve o caso "última → primeira". Quando o ponteiro chega a **80px** do topo ou
da base da área rolável (`.content-scroll`), a lista rola sozinha num loop de
`requestAnimationFrame`, com velocidade proporcional à proximidade da borda. Basta manter
a música encostada no topo e a lista sobe até a posição 1.

### 4.5 Soltar e cancelar

Ao soltar, a linha anima até a posição final (180ms), o estado persiste e a tela
re-renderiza uma única vez. `Esc` durante o arraste — e também `pointercancel` — devolve a
música ao lugar de origem sem gravar nada.

Depois de um arraste, o `click` seguinte é **suprimido**: soltar a música em cima da
própria linha nunca abre a música por engano.

### 4.6 Teclado e acessibilidade

A alça é um `<button>` focável com `aria-label="Reordenar: <título>, posição <n> de <total>"`.
Com o foco nela, ↑/↓ movem a música uma posição por vez e o foco acompanha a música após o
re-render. Este é o substituto direto das setas removidas.

## 5. Arquitetura

### 5.1 Módulo novo: `app/js/render/listdrag.js`

Unidade isolada, ~180 linhas.

- **Interface:** `wireListDrag(root, { onReorder })`. Recebe o container das linhas e um
  callback `onReorder(from, to)` chamado uma vez, ao soltar. A quantidade de itens vem dos
  próprios filhos de `root`, não é parâmetro.
- **Dependências:** nenhuma. O módulo não conhece `S`, listas nem músicas — só "linhas com
  índice que trocam de lugar". Se um dia stems ou outra coleção precisarem de arraste, ele
  serve sem alteração.
- **Estado:** o estado do arraste (item pego, offset, índice de destino, timer do
  long-press, loop de autoscroll) é **local ao módulo**, nunca vai para `S` — é efêmero e
  não deve disparar render.
- **Ativação:** chamado de `afterRender()` em `main.js` quando `S.screen === 'list'`, junto
  dos wirings que já existem ali.

### 5.2 Alterações nos arquivos existentes

| Arquivo | Mudança |
|---|---|
| `app/js/state.js` | Nova `reorderInList(listId, from, to)` — `splice` de remoção + `splice` de inserção + `DB.putList`. A `moveInList` atual (linhas 188-195) vira wrapper de uma linha sobre ela, para que teclado e arraste compartilhem o mesmo código de persistência |
| `app/js/render/listscreen.js` | O bloco `.updown` sai; entra a alça com `data-idx`. A linha ganha `data-idx` |
| `app/js/main.js` | `moveList` segue servindo o teclado; nova ação de reorder por arraste chama `reorderInList` + `update()`; restaura o foco na alça da música movida quando a origem foi o teclado |
| `app/css/app.css` | `.drag-handle`, `.listsong-row.dragging`, `.listsong-row.shifting`, `touch-action`. Usa apenas variáveis existentes (`--accent`, `--surface2`, `--shadow`) |
| `app/sw.js` | `./js/render/listdrag.js` entra no `SHELL` e `VERSION` sobe para `somaplay-v13`. Sem isso o arquivo novo não existe offline — foi o que aconteceu com `chordpop.js` no commit `60c2a23` |

### 5.3 A regra que organiza tudo

`update()` reescreve o `innerHTML` do app inteiro. Portanto:

> Durante o arraste, o módulo manipula o DOM diretamente (`transform` e `textContent`).
> `update()` só é chamado **uma vez**, depois de soltar.

## 6. Verificação

Não há suíte de testes no projeto; a validação é manual, via Chrome DevTools MCP sobre o
`serve.command`:

1. **Mouse:** arrastar a 11ª música para a 1ª posição num único gesto, com autoscroll.
2. **Toque emulado:** long-press pega a música; swipe rápido na linha rola a lista em vez
   de arrastar.
3. **Teclado:** Tab até a alça, ↑/↓ movem, o foco acompanha.
4. **Persistência:** recarregar a página e confirmar a nova ordem (IndexedDB).
5. **Favoritas:** continua sem alça.
6. **Cancelamento:** `Esc` no meio do arraste devolve a música e não grava.

## 7. Fora de escopo

- Arrastar entre listas diferentes.
- Reordenar stems, artistas ou a própria lista de Listas.
- Seleção múltipla para mover várias músicas de uma vez.
- Undo/refazer.
