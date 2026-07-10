# Soma_play — PRD (MVP)

**Data:** 2026-06-25
**Autor:** Soma (projeto pessoal)
**Status:** MVP implementado (`app/`) — ver Anexo A para as decisões do design visual
**Atualizado:** 2026-06-26 — adicionada a seção **7. Listas** (seções seguintes renumeradas); cifra por **imagem ou texto** com toggle **Aberta/Fechada** (§5 e §8)
**Atualizado:** 2026-07-05 — MVP implementado a partir do design visual aprovado (projeto Claude Design "Soma_play"); deltas registrados no **Anexo A**

---

## 1. Resumo

Soma_play é um aplicativo **pessoal** (não será publicado) para apoiar a prática e a apresentação de violão/guitarra. Ele organiza, por artista e música, todo o material que o usuário lê enquanto toca (cifras, letras e faixas de áudio) e adiciona recursos que apps de leitura comuns não têm: um **mixer de áudio multicanal** simples e **rolagem automática** da tela.

O app roda **offline** em **tablet Android (dispositivo principal)** e em **desktop (uso em eventos maiores)**, a partir de um único código, como **PWA instalável**.

---

## 2. Objetivos e não-objetivos

### Objetivos (MVP)
- Organizar conteúdo musical por **artista → música**, com uma **visão global por música** para acesso direto.
- Ler cifras/partituras com **rolagem automática de velocidade ajustável**.
- Tocar **faixas de áudio (stems) em sincronia**, com **volume e mute por canal** e **barra de posição + play/pause global**.
- Suportar uso de **karaokê** (base tocando + letra exibida; microfone externo).
- Funcionar **100% offline**, com importação manual de arquivos no aparelho.
- Rodar bem em **tablet Android** e razoavelmente em **desktop**.
- Agrupar músicas em **listas/setlists** pessoais (globais aos modos) e marcar **favoritas**.

### Não-objetivos (fora do MVP — ver §11)
- Extração automática de stems/acordes, mudança de tom/andamento, loop A-B.
- Rolagem sincronizada ao áudio e letra de karaokê sincronizada no tempo.
- Captura/mixagem de microfone dentro do app.
- Sincronização entre dispositivos / nuvem / multiusuário.
- Publicação em loja de apps ou venda do software.

---

## 3. Usuário e contexto de uso

Usuário único (o próprio autor), músico, tocando violão/guitarra. Três contextos:
1. **Estudo/leitura** em casa — lê cifra com rolagem automática.
2. **Ensaio** — toca acompanhado de stems (ex.: baixo + piano).
3. **Evento/palco** — usa desktop ou tablet; precisa de tela legível, que não apague, e áudio confiável.

Restrição central: **offline** e **legibilidade** (luz de palco varia).

---

## 4. Arquitetura técnica

- **PWA** (Progressive Web App) instalável, um único código para tablet Android (Chrome) e desktop.
- **Áudio:** Web Audio API. Cada stem é um nó de áudio com **ganho próprio** (volume/mute); todos compartilham um **relógio de transporte único** para play/pause/seek global em sincronia.
- **Offline:** Service Worker faz o app abrir e operar sem internet. Arquivos grandes (áudios/imagens) ficam em **OPFS** (com IndexedDB como apoio para metadados). Nenhuma dependência de servidor.
- **Sem backend.** Toda a biblioteca vive no dispositivo.

---

## 5. Modelo de conteúdo

```
Artista
  └── Música
        ├── Cifra (conteúdo do T1) — por música, a fonte mais prática:
        │     ├── Imagens de cifra (0..n)    — cada uma com tipo: aberta | fechada
        │     └── ou Cifra em texto (acordes + letra)   (0..1)
        ├── Letra pura (texto, p/ karaokê T3)           (0..1)
        ├── Canais de áudio / stems          (0..n)
        │     ├── nome (ex.: "Baixo", "Piano", "Voz")
        │     ├── arquivo de áudio
        │     ├── volume
        │     └── mute (ativo/silenciado)
        ├── fonte (origem: CifraClub | Songbook | ...)  (rótulo exibido no cabeçalho; auto pelo tipo da cifra)
        ├── estilo (estilo musical — um por música; agrupa na aba Estilos, ver §6)
        └── favorita (sim/não)               (coração → alimenta a lista "Favoritas")

Lista  (coleção pessoal — ver §7)
  ├── nome
  ├── fixada (sim/não)                       (📌 vai pro topo do menu)
  ├── sistema (sim/não)                      (true só para "Favoritas")
  └── músicas: referências em ordem manual   (0..n)
```

- Conteúdo entra por **importação manual** de arquivos já prontos no aparelho.
- **Cifra por imagem _ou_ texto, escolhido por música** (não há formato obrigatório): a maior parte é **imagem** (coluna única, estilo CifraClub); quando a fonte torna o **texto** mais prático, a música usa texto. **Aberta vs fechada:** na imagem = **duas figuras** (tipo `aberta`/`fechada`); no texto = **mesma cifra com/sem diagramas**. O toggle do T1 (§8) fica habilitado conforme as versões existirem.
- O **modo é uma lente global** (ver §6), padrão **T1 Cifra**. A biblioteca lista apenas o conteúdo disponível no modo ativo (ex.: música só com imagem aparece em T1; com imagem + stems aparece em T1 e T2; com base + letra aparece em T3). **Não há seletor de modo por música** — tocar numa música a abre direto no modo ativo.

---

## 6. Navegação

A navegação é guiada por **modo (lente global)**, para que **tocar uma música seja um único toque** — sem cliques intermediários.

- **Seletor de modo global**, sempre visível no topo: **T1 Cifra (padrão)**, **T2 Acompanhamento**, **T3 Karaokê**. Ele define a "lente" da biblioteca inteira.
- A biblioteca mostra **apenas o conteúdo que existe no modo ativo** (ex.: em T2, só aparecem artistas/músicas que têm acompanhamento).
- Dentro do modo ativo, **três visões** alternáveis por abas:
  - **Artistas:** grade de artistas (só os que têm música no modo ativo) → **Artista → lista de músicas** daquele artista (só as do modo ativo).
  - **Músicas:** lista global de **todas as músicas do modo ativo**, cada item com o **nome do artista**. Permite **ordenar** (título, artista, recém-adicionadas) e **buscar**.
  - **Estilos:** grade de estilos musicais (agrupa por `song.estilo`, análogo a Artistas) → **Estilo → lista de músicas** daquele estilo. Música sem estilo cai em "Sem estilo". Fica **entre Músicas e Listas** e respeita a lente. (As **Listas**, §7, são a 4ª aba e ignoram a lente.)
- **Tocar = um toque:** como o modo já está definido pela lente, tocar numa música **abre direto** o template correspondente. **Não há seletor de modo intermediário** entre a lista e o template.
- Trocar de modo no topo re-filtra toda a biblioteca; uma música com vários modos aparece em cada modo correspondente.
- **Troca de modo dentro da música:** todo template tem um **switch de modo (T1/T2/T3)** que serve também de **indicador de recursos** da faixa — os modos que a música possui ficam ativos (revelando que ela tem aquele recurso), os ausentes ficam desabilitados. Trocar ali alterna o template **sem sair da música**, mantendo o contexto.
- **Busca** por nome de artista/música (ativa nas duas visões) e **Configurações** acessíveis da tela inicial.

---

## 7. Listas

Coleções pessoais de músicas (ex.: **setlists** de show), no espírito do CifraClub.

### Navegação
- Uma **terceira aba** ao lado de Artistas e Músicas: **Artistas · Músicas · Listas**.
- **Listas são globais** — atravessam os modos (uma setlist mistura música só-cifra e música com acompanhamento). Ao entrar na aba Listas, o **seletor de modo no topo fica inativo/apagado**; ele só volta a valer quando uma música é aberta, que abre **no melhor modo disponível dela** (tem stems → T2; só cifra → T1).

### Tela "Listas"
- **Favoritas** sempre no topo (lista de sistema, alimentada pelo coração das músicas).
- **Listas fixadas (📌)** logo abaixo.
- Demais listas em **ordem alfabética**, cada item com **nome + contagem** (ex.: "acelera brasil (12)").
- Botão **Nova lista**.

### Tela de uma lista
- Músicas em **ordem manual** (ordem do show), cada item com **título + artista**.
- Ações na música: **tocar** (abre no melhor modo), **arrastar para reordenar**, **remover** da lista.
- Ações na lista: **renomear**, **excluir**, **fixar/desafixar**.
- **Favoritas** é de sistema: não pode ser excluída nem renomeada.

### Adicionar à lista (por música)
- Em cada música (aba Músicas, tela do Artista e dentro do template) há a ação **"Adicionar à lista"** + um **coração**.
- O popover de "Adicionar à lista" mostra um **checkbox por lista** (marcado = a música já está nela; marcar/desmarcar **adiciona/remove na hora**) e um campo **"Nova lista…" + Criar** que cria a lista já **com a música dentro**.
- O **coração** faz toggle de **favorita** (entra/sai de Favoritas).

### Regras
- Uma música pode estar em **várias listas** ao mesmo tempo.
- Excluir uma música da biblioteca a remove de **todas** as listas e do Favoritas.
- Excluir uma lista **não** apaga as músicas (continuam na biblioteca).
- **Lista vazia** é permitida.

### Fora do escopo (pós-MVP)
Capa/cor/ícone de lista, compartilhar lista, duplicar lista e definir **modo por música** dentro da lista.

---

## 8. Templates (telas de toque)

### T1 — Leitura/Cifra
- Lê a cifra a partir de **imagem** (coluna única) **ou texto** (acordes + letra), conforme a fonte da música.
- **Rolagem automática** com **velocidade ajustável** (botões +/−) e **play/pause da rolagem**. Na imagem é **pan vertical**; no texto, rolagem do conteúdo.
- **Toggle Aberta/Fechada:** na imagem alterna entre as **duas figuras**; no texto **mostra/esconde os diagramas**. Default **aberta**; o botão fica **desabilitado quando só existe uma versão** (mesma lógica do switch de modo). *No MVP a cifra em texto é exibida **fechada** (acordes sobre a letra); gerar diagramas a partir do texto é **pós-MVP** — ver §11.*
- **Inverter** (filtro de cor) para **leitura noturna** quando a fonte é imagem (fundo branco).
- Independente de áudio.

### T2 — Acompanhamento
- Imagem da cifra + **mixer de canais**.
- Cada stem com **volume** e **mute**.
- **Barra de posição** (mostra onde está na música) + **play/pause global** sincronizando todos os canais.
- **Rolagem manual** com o dedo enquanto toca (sem sincronia automática no MVP).

### T3 — Karaokê
- Mesma base/mixer do T2 tocando.
- **Letra exibida como texto estático** (sem sincronia no tempo no MVP).
- **Microfone é externo** (PA/mesa de som); o app não capta nem mistura mic.

---

## 9. Áudio — comportamento (MVP)

| Recurso | No MVP? |
|---|---|
| Volume por canal | ✅ |
| Mute/ativar por canal | ✅ |
| Play/pause global (todos os canais juntos) | ✅ |
| Barra de posição / seek | ✅ |
| Loop de trecho (A-B) | ❌ pós-MVP |
| Mudar tom/andamento | ❌ pós-MVP |
| Captura de microfone | ❌ pós-MVP |

Todos os canais de uma música tocam **alinhados ao mesmo relógio** (começam juntos; seek move todos).

---

## 10. Configurações (tela mínima do MVP)

- **Manter a tela ligada** (wake lock) durante o toque.
- **Tema** claro/escuro.
- **Tamanho/zoom** padrão da cifra.
- **Velocidade padrão** da rolagem automática.
- **Volume master** e, no desktop, **escolha da saída de áudio**.
- **Backup:** exportar/importar a biblioteca, **incluindo listas e favoritas** (seguro contra perda e para levar a outro aparelho). **Importar** tem dois modos: **substituir** (apaga e troca pela do backup) e **adicionar/atualizar (merge)** — upsert por id, deduplica artista por nome e **não apaga** a biblioteca. Ver design [`../specs/2026-07-10-import-com-merge-design.md`](2026-07-10-import-com-merge-design.md).

---

## 11. Fora do MVP (registrado para depois)

- Extração de stems/acordes embutida no app.
- Mudança de tom e de andamento do áudio.
- **Geração de diagramas de acorde a partir da cifra em texto** (visão "aberta" do texto) e transposição de tom da cifra em texto.
- Loop de trecho A-B.
- Rolagem sincronizada ao áudio.
- Letra de karaokê sincronizada no tempo.
- Captura/mixagem de microfone (reverb, volume do mic).
- Pedal de página Bluetooth (footswitch) para virar página/dar play com o pé.
- Afinação de referência / metrônomo.
- Latência/buffer de áudio avançado; idioma.
- Catálogo de acordes **editável dentro do app** + **promover voicing** para o catálogo + **sincronizar o catálogo no backup** (no MVP o catálogo é só-leitura e cresce no repo).
- **Imagem chapada dos diagramas** como fallback de exibição por acorde (no MVP a digitação é sempre dado editável).
- Pipeline de **importação em massa** (arquivo por música no repo + gerador `.somaplay`) — peça D do design de 2026-07-06, plano próprio.
- Sincronização entre dispositivos / nuvem.

---

## 12. Critérios de sucesso (MVP)

- Consigo cadastrar um artista e uma música importando arquivos do tablet, **offline**.
- Escolho o modo no topo e **abro a música com um único toque** (sem seletor intermediário).
- Abro uma cifra e leio com **rolagem automática** em velocidade confortável.
- Toco uma música com 2+ stems, ajustando **volume/mute por canal** e usando **play/pause + barra de posição**, tudo em sincronia.
- Uso o modo karaokê com a **letra na tela** e a base tocando.
- Crio uma **lista**, adiciono músicas pela ação **"Adicionar à lista"**, **reordeno** na ordem do show e marco **favoritas**; a lista aparece na aba **Listas** e abre cada música no melhor modo.
- O app **abre e funciona sem internet** depois de instalado, e a tela **não apaga** enquanto toco.
- Tudo isso roda no **tablet Android** (e idealmente no desktop).

---

## 13. Riscos e pontos de atenção

- **Armazenamento de arquivos grandes no navegador:** mitigar com OPFS e tela de gestão de armazenamento + backup.
- **Latência/sincronia de áudio no Android:** validar cedo com stems reais; é o recurso de maior risco técnico.
- **Persistência offline:** garantir que Service Worker + OPFS sobrevivam a reinícios e atualizações do app.
- **Legibilidade em palco:** testar tema/zoom em condições reais de luz.

---

## Anexo A — Decisões do design visual incorporadas no MVP (2026-07-05)

Fonte: projeto Claude Design "Soma_play" (`-DESIGN/Soma Play.html`). Onde este anexo divergir das seções acima, **vale o anexo** (é o desenho aprovado mais recente).

1. **T1 e T2 são uma tela única ("Tela Cifra")** — o mixer e o transporte aparecem quando a música tem áudio; não existe template T2 separado. O switch dentro da música tem 2 posições: **Cifra | Karaokê** (Karaokê desabilitado quando a música não tem letra — o switch segue sendo indicador de recursos, §6).
2. **Lente de modo = chips T2 e T3** (multi-seleção; T1 é implícito — toda música tem cifra). O filtro exige que a música tenha *todos* os modos selecionados. Na aba Listas a lente fica apagada/inativa (§7).
3. **Acordes e diagramas:** **catálogo de formas** (`chords-catalog.js`: nome → variações, uma marcada padrão; semeado e **só-leitura no MVP**, cresce no repo). A música guarda a forma escolhida em `cifra.digitacoes` (**snapshot** — self-contained, sem referência ao catálogo em runtime). **Editor de casas** no add/edit e **seletor de variação** na Tela Cifra (toca no acorde → escolhe a variante → grava **só naquela música**). Grade "Acordes desta música" no fim da cifra (texto e imagem); **acordes fixados** por estrela numa **barra recolhível no topo** (em fluxo — empurra a cifra, não sobrepõe). Resolução ao desenhar: `digitacoes` da música → padrão do catálogo → "?". Ver [`../plans/2026-07-06-catalogo-e-editor-de-acordes.md`](../plans/2026-07-06-catalogo-e-editor-de-acordes.md) e o design [`2026-07-06-importacao-e-catalogo-acordes-design.md`](2026-07-06-importacao-e-catalogo-acordes-design.md).
4. **Cifra-imagem:** fit-to-width com **zoom** (botões/pinch/ctrl+scroll), **pan por arrasto**, **inverter cores** para leitura noturna e toggle Aberta/Fechada quando existem as duas imagens.
5. **Fonte de áudio por música:** canais separados (stems) **ou** "**versão completa**" (gravação única, 1..n versões) — alternável no mixer; o transporte é o mesmo.
6. **Controle de rolagem automática** flutuante (play/pause + velocidade 1–10), com auto-ocultar por inatividade.
7. **Ações por música:** coração (favorita) e "adicionar à lista" nas linhas da biblioteca; menu ⋯ na Tela Cifra (favoritar, adicionar à lista, inverter, formato, **editar**, **excluir**).
8. **Tokens visuais:** fundo `#0E0E11`, superfícies `#1A1A20/#23232B`, borda `#2E2E37`, texto `#F5F4F2`, âmbar `#E8A23D` (ação/T1), teal `#2DD4BF` (T2/mixer), dourado `#F4B860` (T3); fontes **Sora** (títulos), **Inter** (corpo), **JetBrains Mono** (acordes/tempos).

### Implementação (registro)

- Código do MVP em **`app/`** (PWA vanilla, ES modules, sem build): `js/db.js` (IndexedDB + OPFS), `js/audio.js` (transporte único Web Audio; correção de drift entre faixas), `js/chords.js` (parser de cifra-texto + diagramas SVG), `js/backup.js` (formato `.somaplay`: manifest JSON + blobs concatenados), telas em `js/render/`.
- Rodar localmente: `cd app && python3 -m http.server 8137` → `http://localhost:8137`. Instalável como PWA; offline via Service Worker (precache do shell).
- Exemplos embutidos (Configurações → Importar exemplos): Paralelas (cifra-imagem) e Andança (cifra-texto com digitações próprias).
