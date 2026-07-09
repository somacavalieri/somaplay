# Soma_play — Categorização por estilo musical (design)

**Data:** 2026-07-08 · **Estado:** aprovado (brainstorming) → implementação · **Linear:** SOM-335
**Estende:** [`2026-06-25-soma-play-design.md`](2026-06-25-soma-play-design.md) §5 (modelo), §6/Anexo A#2 (navegação e lente).

## Objetivo
Ver as músicas agrupadas também por **estilo musical**, numa nova aba **Estilos** entre **Músicas** e **Listas**.

## Modelo de dados
- Novo campo **`song.estilo`** (string, **um por música**). Entra no backup automaticamente (faz parte da música). Música sem estilo cai no grupo **"Sem estilo"**.

## Navegação (aba Estilos)
- `S.tab` passa a aceitar **`estilos`**, renderizado **entre `songs` e `lists`** ([home.js:143-145](../../../app/js/render/home.js)).
- **Espelha a aba Artistas:** um **card por estilo** (nome + contagem de músicas) → toca no estilo → tela listando as músicas daquele estilo → voltar retorna à lista de estilos. Reaproveitar o padrão de `artistCards()` + tela do artista ([render/artist.js](../../../app/js/render/artist.js)); generalizar onde fizer sentido em vez de duplicar.
- **Respeita a lente de modo** (T2/T3), igual a Artistas e Músicas. **Listas** segue sendo a única exceção que ignora a lente.
- Ordenação: estilos por nome (A→Z); "Sem estilo" por último.

## Campo "Estilo" no Adicionar/editar
- Igual ao campo **Fonte**: `<input>` de texto + **atalhos (chips)** dos estilos comuns, aceitando qualquer texto. Presets iniciais: **MPB · Samba · Bossa Nova · Choro · Forró · Rock · Pop · Gospel · Jazz · Soul**.
- `d.estilo` no draft (`newDraft`/`syncDraftFromDOM`); `commitDraft` grava `song.estilo`.

## Autoria / "IA"
- O app é **offline, sem IA embutida** — a sugestão automática de estilo acontece **na autoria comigo** (na importação eu preencho o estilo com vocabulário consistente); o usuário edita no app. Cadastro manual no app = campo com presets.

## Exemplos
- Atribuir `estilo` aos exemplos: As Pastorinhas=Samba, Andança=Samba, Queremos Saber=MPB, Disfarça e Chora=Samba, Me Dê Motivo=Soul, Oxum=MPB, Paralelas=MPB. (Groove de teste sem estilo.)

## Arquivos afetados
- `app/js/state.js` — `tab` aceita `estilos`; `S.estiloId` (estilo aberto).
- `app/js/render/home.js` — 4º botão de aba; `estiloCards()`; subtítulo/contagem por estilo.
- `app/js/render/artist.js` (ou novo `estilo` screen) — tela listando as músicas de um estilo (reuso do padrão do artista).
- `app/js/main.js` — ações `openEstilo`, `setEstilo`; `setTab` já cobre a troca de aba.
- `app/js/render/addedit.js` — campo Estilo + draft + snapshot no save.
- `app/js/samples.js` — `estilo` nos exemplos.
- `app/css/app.css` — reuso dos estilos de card; ajustes mínimos.
- `app/sw.js` — **bump de versão** (mudança de shell JS).

## Fora do escopo (YAGNI)
- Múltiplos estilos por música.
- Busca/filtro por estilo dentro da aba Músicas.
- Detecção automática de estilo **dentro** do app (offline não tem IA).

## Verificação
- Aba **Estilos** aparece entre Músicas e Listas; agrupa as músicas por estilo; tocar num estilo lista suas músicas; voltar funciona.
- Add/editar tem o campo Estilo (com chips); salvar/reabrir mantém.
- Backup exporta/importa o `estilo`.
- `cd app && python3 -m http.server 8137` para conferência visual.
