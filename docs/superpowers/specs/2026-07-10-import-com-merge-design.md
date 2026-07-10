# Soma_play — Import com merge / upsert (Peça 1 do pipeline) — design

**Data:** 2026-07-10 · **Estado:** aprovado (brainstorming) → implementação · **Linear:** SOM-336 (Peça 1)
**Estende:** [`2026-07-06-importacao-e-catalogo-acordes-design.md`](2026-07-06-importacao-e-catalogo-acordes-design.md) §D.

## Objetivo
Importar backup `.somaplay` **sem apagar** a biblioteca — **upsert por id** — para destravar:
- **Editar em massa** (eu preencho `estilo`/campos no `.somaplay` mantendo os ids → import merge atualiza no lugar).
- **Adicionar** músicas novas sem re-exportar tudo, preservando favoritas/listas/edições do aparelho.

## Decisão de escopo
Fazer só a **Peça 1** (import com merge + ferramenta de edição do `.somaplay`). A **Peça 2** (repo de arquivos por música + gerador + histórico git) fica registrada para depois — evita o problema de "duas fontes-da-verdade" com as edições que o usuário faz no aparelho.

## Reconciliação (a lógica, isolada e testável)
Novo módulo **`app/js/merge.js`** (puro, sem dependência de DOM/DB) com `mergePlan(existing, incoming)`:
- **Artista:** dedup **por nome**. Se já existe artista com o mesmo nome e id diferente → reusa o id existente e **remapeia** `artistId` das músicas que vierem. Mesmo id → upsert. Nome novo → adiciona.
- **Música:** upsert **por id** (id igual atualiza; id novo adiciona), com `artistId` remapeado.
- **Listas:** upsert por id.
- Retorna `{ artists, songs, lists, added, updated, remap }` (listas de objetos a gravar + contagens).

## `backup.js` — `importLibrary(file, { merge = false })`
- **`merge: false`** (padrão): comportamento atual — `DB.wipe()` + carrega tudo (substituir). **Inalterado.**
- **`merge: true`**: **não** apaga. Carrega os blobs (upsert por id), aplica `mergePlan` (grava artists/songs/lists), **não mexe em settings**, **não apaga** listas ausentes do arquivo. Ao fim, recarrega o estado via `DB.loadAll()`.
- Retorno: replace → `{ artists, songs }`; merge → `{ added, updated }`.

## UI (Configurações)
Dois botões:
- **"Importar biblioteca (substituir)"** — o atual, confirm de sempre.
- **"Adicionar/atualizar do backup"** (novo) — merge; confirm próprio: *"vai adicionar/atualizar sem apagar as atuais"*; toast final *"+N novas, M atualizadas"*.
- Implementação: um único `<input id="file-backup">` + flag `S.importMode` (`replace|merge`) setada pelo botão; `wireBackupInput()` (já religado na tela de Config) lê a flag.

## Ferramenta de autoria (eu, fora do app)
**`scripts/somaplay_edit.py`** — lê o `.somaplay` (cabeçalho `SOMAPLAY1\n` + tamanho JSON 10 dígitos + `\n` + JSON + blobs concatenados; ver [`app/js/backup.js`](../../../app/js/backup.js)), expõe `read_somaplay(path) -> (manifest, blobs)` e `write_somaplay(path, manifest, blobs)` (recomputa o tamanho do JSON; **blobs intactos**), + CLI que lista as músicas. É como eu edito em massa (ex.: preencher `estilo`) e devolvo o arquivo pro usuário importar em merge.

## Verificação
- `mergePlan`: testes em `node --test` (upsert por id; dedup de artista por nome + remap; contagem added/updated).
- `importLibrary(merge)`: conferência manual — exportar, editar via script, **Adicionar/atualizar do backup**, checar que atualizou no lugar e não apagou nada.
- `somaplay_edit.py`: self-test de round-trip (ler → editar `estilo` → escrever → reler → blobs idênticos, campo alterado).
- **Bump do Service Worker** (mudança de shell JS): `v6 → v7`.

## Fora do escopo (YAGNI)
- Peça 2 (repo de arquivos por música + gerador).
- Reconciliação reversa (aparelho → repo).
- Merge de settings.
