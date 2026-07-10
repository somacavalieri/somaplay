# Import com merge/upsert (Peça 1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Importar um backup `.somaplay` **sem apagar** a biblioteca (upsert por id), destravando editar/adicionar músicas em massa por fora do app.

**Architecture:** A reconciliação (upsert por id + dedup de artista por nome + remap de `artistId`) fica num módulo **puro** `app/js/merge.js` (`mergePlan`), testável em `node --test`. `backup.js` ganha `importLibrary(file, {merge})` que, no modo merge, aplica o plano e recarrega o estado do IndexedDB. UI: um botão novo em Configurações + flag `S.importMode`. Um script Python (`scripts/somaplay_edit.py`) lê/edita/reescreve o `.somaplay` para a autoria em massa.

**Tech Stack:** JavaScript vanilla (ES modules, sem build); IndexedDB/OPFS; testes com `node --test` (Node ≥ 20); script auxiliar em Python 3.

## Global Constraints

- **Sem toolchain de build.** ES modules servidos estáticos.
- **Português** em código/UI/comentários.
- **Formato `.somaplay`:** `SOMAPLAY1\n` + tamanho do JSON em **10 dígitos** + `\n` + JSON (UTF-8) + bytes dos blobs concatenados na ordem do `manifest.blobs` (ver [`app/js/backup.js`](../../../app/js/backup.js)).
- **Merge = upsert por id**; **dedup de artista por nome**; **não** mexe em settings; **não** apaga listas ausentes.
- **Modo replace inalterado** (comportamento atual).
- **Bump do Service Worker** ao mudar JS do shell.
- **Rodar local:** `cd app && python3 -m http.server 8137`.

---

### Task 1: Módulo de reconciliação `merge.js` (puro, testável)

**Files:**
- Create: `app/js/merge.js`
- Test: `app/test/merge.test.js`

**Interfaces:**
- Produces: `mergePlan(existing, incoming)` → `{ artists, songs, lists, added, updated, remap }`.
  - `existing`: `{ artists:[{id,name,...}], songs:[{id,artistId,...}], lists:[{id,...}] }` (o estado atual `S`).
  - `incoming`: manifesto do backup (mesmas chaves + `blobs`).
  - `artists`/`songs`/`lists`: objetos a gravar (upsert). `songs` já com `artistId` remapeado. `added`/`updated`: contagem de músicas. `remap`: `{artistIdBackup: idUsar}`.

- [ ] **Step 1: Escrever o teste que falha**

Create `app/test/merge.test.js`:
```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergePlan } from '../js/merge.js';

test('upsert por id: música existente atualiza, nova adiciona', () => {
  const existing = { artists: [{ id: 'a1', name: 'X' }], songs: [{ id: 's1', artistId: 'a1', title: 'Old' }], lists: [] };
  const incoming = { artists: [{ id: 'a1', name: 'X' }], songs: [{ id: 's1', artistId: 'a1', title: 'New' }, { id: 's2', artistId: 'a1', title: 'Nova' }], lists: [] };
  const p = mergePlan(existing, incoming);
  assert.equal(p.added, 1);
  assert.equal(p.updated, 1);
  assert.equal(p.songs.find((s) => s.id === 's1').title, 'New');
});

test('dedup de artista por nome + remap de artistId', () => {
  const existing = { artists: [{ id: 'DEV', name: 'Noel Rosa' }], songs: [], lists: [] };
  const incoming = { artists: [{ id: 'BKP', name: 'Noel Rosa' }], songs: [{ id: 's9', artistId: 'BKP', title: 'As Pastorinhas' }], lists: [] };
  const p = mergePlan(existing, incoming);
  assert.equal(p.artists.length, 0);          // não regrava o duplicado
  assert.equal(p.songs[0].artistId, 'DEV');   // remapeia pro id do aparelho
  assert.equal(p.added, 1);
});

test('artista novo é adicionado; suas músicas mantêm o id', () => {
  const existing = { artists: [], songs: [], lists: [] };
  const incoming = { artists: [{ id: 'NEW', name: 'Cartola' }], songs: [{ id: 's1', artistId: 'NEW', title: 'Disfarça' }], lists: [] };
  const p = mergePlan(existing, incoming);
  assert.equal(p.artists.length, 1);
  assert.equal(p.songs[0].artistId, 'NEW');
  assert.equal(p.added, 1);
});

test('campos ausentes não quebram', () => {
  assert.deepEqual(mergePlan({}, {}), { artists: [], songs: [], lists: [], added: 0, updated: 0, remap: {} });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd app && node --test`
Expected: FAIL — `Cannot find module '.../js/merge.js'`.

- [ ] **Step 3: Criar `app/js/merge.js`**

```js
// merge.js — reconciliação de import com merge (upsert). Puro (sem DOM/DB), testável.
// Dado o estado atual e o manifesto de um backup, decide o que gravar (upsert por id),
// deduplicando artistas por nome e remapeando o artistId das músicas.

export function mergePlan(existing, incoming) {
  const exArtists = (existing && existing.artists) || [];
  const exSongIds = new Set(((existing && existing.songs) || []).map((s) => s.id));

  const byName = new Map();
  for (const a of exArtists) byName.set(a.name, a);

  const remap = {};
  const artists = [];
  for (const a of ((incoming && incoming.artists) || [])) {
    const ex = byName.get(a.name);
    if (ex) {
      if (ex.id !== a.id) remap[a.id] = ex.id;   // reusa o existente; não regrava
    } else {
      artists.push(a);
      byName.set(a.name, a);                       // dedup entre entradas do próprio backup
    }
  }

  const songs = ((incoming && incoming.songs) || []).map((s) => {
    const artistId = remap[s.artistId] || s.artistId;
    return artistId === s.artistId ? s : { ...s, artistId };
  });

  let added = 0;
  for (const s of songs) if (!exSongIds.has(s.id)) added++;

  return {
    artists,
    songs,
    lists: (incoming && incoming.lists) || [],
    added,
    updated: songs.length - added,
    remap,
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd app && node --test`
Expected: PASS (todos, incluindo os 4 novos).

- [ ] **Step 5: Commit**

```bash
git add app/js/merge.js app/test/merge.test.js
git commit -m "feat(backup): mergePlan — reconciliação de import por upsert (puro)"
```

---

### Task 2: `importLibrary(file, { merge })` em `backup.js`

**Files:**
- Modify: `app/js/backup.js` (import no topo; reescrever `importLibrary`)

**Interfaces:**
- Consumes: `mergePlan` (Task 1); `DB.loadAll()`, `DB.wipe()`, `DB.saveBlob/putArtist/putSong/putList` (já existentes).
- Produces: `importLibrary(file, { merge = false } = {})` → replace: `{ artists, songs }`; merge: `{ added, updated }`.

- [ ] **Step 1: Adicionar o import de `mergePlan`**

No topo de `app/js/backup.js`, após `import { S } from './state.js';`:
```js
import { mergePlan } from './merge.js';
```

- [ ] **Step 2: Substituir a função `importLibrary` inteira**

Trocar toda a função `export async function importLibrary(file) { ... }` por:
```js
export async function importLibrary(file, { merge = false } = {}) {
  const headProbe = await file.slice(0, MAGIC.length + 11).text();
  if (!headProbe.startsWith(MAGIC)) throw new Error('Arquivo não é um backup do Soma_play');
  const jsonLen = parseInt(headProbe.slice(MAGIC.length, MAGIC.length + 10), 10);
  const jsonStart = MAGIC.length + 11;
  const json = await file.slice(jsonStart, jsonStart + jsonLen).text();
  const manifest = JSON.parse(json);
  if (!manifest.songs || !manifest.artists) throw new Error('Backup inválido');

  // Substituir apaga tudo antes; merge preserva.
  if (!merge) await DB.wipe();

  // blobs — upsert por id nos dois modos
  let off = jsonStart + jsonLen;
  for (const meta of manifest.blobs || []) {
    const chunk = file.slice(off, off + meta.size, meta.type);
    await DB.saveBlob(meta.id, chunk);
    off += meta.size;
  }

  let result;
  if (merge) {
    const plan = mergePlan({ artists: S.artists, songs: S.songs, lists: S.lists }, manifest);
    for (const a of plan.artists) await DB.putArtist(a);
    for (const s of plan.songs) await DB.putSong(s);
    for (const l of plan.lists) await DB.putList(l);
    result = { added: plan.added, updated: plan.updated };
  } else {
    for (const a of manifest.artists) await DB.putArtist(a);
    for (const s of manifest.songs) await DB.putSong(s);
    for (const l of manifest.lists || []) await DB.putList(l);
    if (manifest.settings) {
      S.settings = { ...S.settings, ...manifest.settings };
      await DB.saveSettings(S.settings);
    }
    result = { artists: manifest.artists.length, songs: manifest.songs.length };
  }

  // recarrega o estado do IndexedDB (consistente nos dois modos)
  const all = await DB.loadAll();
  S.artists = all.artists.sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  S.songs = all.songs;
  S.lists = all.lists;
  return result;
}
```

- [ ] **Step 3: Verificar sintaxe**

Run: `cd app && node --check js/backup.js && echo ok`
Expected: `ok`

- [ ] **Step 4: Rodar os testes (garantir que nada quebrou)**

Run: `cd app && node --test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/js/backup.js
git commit -m "feat(backup): importLibrary aceita modo merge (upsert, sem wipe)"
```

---

### Task 3: UI — botão "Adicionar/atualizar do backup"

**Files:**
- Modify: `app/js/render/settings.js` (bloco `.pair-btns`, ~L59-62)
- Modify: `app/js/state.js` (novo campo `importMode`)
- Modify: `app/js/main.js` (ações `importBackup`/`importBackupMerge`; `wireBackupInput`)

**Interfaces:**
- Consumes: `importLibrary(file, { merge })` (Task 2); `S.importMode`.
- Produces: ação `importBackupMerge`; `wireBackupInput` ramifica por `S.importMode`.

- [ ] **Step 1: Estado `importMode` em `state.js`**

Em `app/js/state.js`, logo após `popoverSongId: null,`:
```js
  importMode: 'replace',   // replace | merge — modo do próximo import de backup
```

- [ ] **Step 2: Botão em `settings.js`**

Trocar o bloco:
```js
          <div class="pair-btns">
            <button data-a="exportBackup">${I.download()}Exportar biblioteca</button>
            <button data-a="importBackup">${I.uploadSm()}Importar biblioteca</button>
          </div>
```
por:
```js
          <div class="pair-btns">
            <button data-a="exportBackup">${I.download()}Exportar biblioteca</button>
            <button data-a="importBackup">${I.uploadSm()}Importar (substituir)</button>
          </div>
          <button class="btn-ghost" style="width:100%;margin-top:8px;height:44px;justify-content:center" data-a="importBackupMerge">${I.uploadSm()}Adicionar/atualizar do backup</button>
```

- [ ] **Step 3: Ações em `main.js`**

Trocar a ação atual `importBackup() { document.getElementById('file-backup').click(); },` por:
```js
  importBackup() { S.importMode = 'replace'; document.getElementById('file-backup').click(); },
  importBackupMerge() { S.importMode = 'merge'; document.getElementById('file-backup').click(); },
```

- [ ] **Step 4: `wireBackupInput` ramifica por modo**

Substituir a função `wireBackupInput()` inteira (em `main.js`) por:
```js
// A tela de Configurações tem o <input id="file-backup">. Religado a cada render.
function wireBackupInput() {
  const backup = document.getElementById('file-backup');
  if (!backup) return;
  backup.onchange = async () => {
    const f = backup.files[0];
    backup.value = '';
    if (!f) return;
    const merge = S.importMode === 'merge';
    const total = S.songs.length;
    if (merge) {
      if (!confirm(`Adicionar/atualizar do backup "${f.name}"? As músicas atuais NÃO serão apagadas — as com o mesmo id são atualizadas.`)) return;
    } else if (total > 0 && !confirm(`Importar "${f.name}" vai SUBSTITUIR a biblioteca deste aparelho (${total} música${total === 1 ? '' : 's'}) pela do backup. As músicas atuais deste aparelho serão apagadas. Continuar?`)) {
      return;
    }
    toast(merge ? 'Mesclando do backup...' : 'Importando biblioteca...');
    try {
      const res = await importLibrary(f, { merge });
      applyTheme();
      update();
      toast(merge
        ? `Backup mesclado: +${res.added} nova${res.added === 1 ? '' : 's'}, ${res.updated} atualizada${res.updated === 1 ? '' : 's'}`
        : `Biblioteca importada: ${res.artists} artistas, ${res.songs} músicas`);
    } catch (e) { toast('Falha na importação: ' + e.message); }
  };
}
```

- [ ] **Step 5: Verificar sintaxe**

Run: `cd app && node --check js/main.js && node --check js/render/settings.js && node --check js/state.js && echo ok`
Expected: `ok`

- [ ] **Step 6: Verificação manual (navegador)**

Run: `cd app && python3 -m http.server 8137`. Abrir `http://localhost:8137` (Clear site data se necessário).
1. Configurações → **Exportar biblioteca** (guarda o `.somaplay`).
2. **Adicionar/atualizar do backup** → escolher esse arquivo → aparece o confirm de *merge* → confirmar → toast **"Backup mesclado: +0 novas, N atualizadas"** e a biblioteca **continua igual** (nada apagado).
3. **Importar (substituir)** → o confirm antigo ("vai SUBSTITUIR…") ainda aparece.

- [ ] **Step 7: Commit**

```bash
git add app/js/render/settings.js app/js/state.js app/js/main.js
git commit -m "feat(backup): UI de merge — botão Adicionar/atualizar do backup"
```

---

### Task 4: Ferramenta de autoria `scripts/somaplay_edit.py`

**Files:**
- Create: `scripts/somaplay_edit.py`

**Interfaces:**
- Produces: `read_somaplay(path) -> (manifest: dict, blobs: bytes)`, `write_somaplay(path, manifest, blobs)`; CLI `list <arquivo>` e `test`.

- [ ] **Step 1: Criar `scripts/somaplay_edit.py`**

```python
#!/usr/bin/env python3
"""Lê/edita/reescreve um backup .somaplay.
Formato: b'SOMAPLAY1\\n' + tamanho do JSON em 10 dígitos + b'\\n' + JSON(UTF-8) + bytes dos blobs.

Uso:
  python3 scripts/somaplay_edit.py list <in.somaplay>   # lista as músicas
  python3 scripts/somaplay_edit.py test                 # self-test de round-trip

Como biblioteca:
  from somaplay_edit import read_somaplay, write_somaplay
  m, blobs = read_somaplay('in.somaplay')
  for s in m['songs']: s['estilo'] = ...   # edita metadados; blobs ficam intactos
  write_somaplay('out.somaplay', m, blobs)
"""
import json
import sys

MAGIC = b'SOMAPLAY1\n'


def read_somaplay(path):
    data = open(path, 'rb').read()
    if not data.startswith(MAGIC):
        raise ValueError('não é um backup .somaplay')
    p = len(MAGIC)
    json_len = int(data[p:p + 10])
    p += 11  # 10 dígitos + '\n'
    manifest = json.loads(data[p:p + json_len].decode('utf-8'))
    blobs = data[p + json_len:]
    return manifest, blobs


def write_somaplay(path, manifest, blobs):
    body = json.dumps(manifest, ensure_ascii=False).encode('utf-8')
    header = MAGIC + str(len(body)).zfill(10).encode('ascii') + b'\n' + body
    open(path, 'wb').write(header + blobs)


def _cmd_list(path):
    m, _ = read_somaplay(path)
    arts = {a['id']: a['name'] for a in m.get('artists', [])}
    for s in m.get('songs', []):
        print(f"{s.get('id', '?')[:8]}  {arts.get(s.get('artistId'), '?'):20}  "
              f"{s.get('title', '?'):28}  estilo={s.get('estilo', '—')}")


def _cmd_test():
    manifest = {'version': 1, 'app': 'soma_play',
                'artists': [{'id': 'a1', 'name': 'X'}],
                'songs': [{'id': 's1', 'artistId': 'a1', 'title': 'T', 'estilo': ''}],
                'lists': [], 'blobs': [{'id': 'b1', 'size': 3, 'type': 'x'}]}
    blobs = b'abc'
    write_somaplay('/tmp/_st.somaplay', manifest, blobs)
    m2, b2 = read_somaplay('/tmp/_st.somaplay')
    assert b2 == blobs, 'blobs mudaram na leitura'
    m2['songs'][0]['estilo'] = 'Samba'
    write_somaplay('/tmp/_st.somaplay', m2, b2)
    m3, b3 = read_somaplay('/tmp/_st.somaplay')
    assert b3 == blobs, 'blobs mudaram após editar metadados'
    assert m3['songs'][0]['estilo'] == 'Samba', 'estilo não persistiu'
    print('round-trip OK')


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'test'
    if cmd == 'list':
        _cmd_list(sys.argv[2])
    elif cmd == 'test':
        _cmd_test()
    else:
        print(__doc__)
```

- [ ] **Step 2: Rodar o self-test**

Run: `python3 scripts/somaplay_edit.py test`
Expected: `round-trip OK`

- [ ] **Step 3: Commit**

```bash
git add scripts/somaplay_edit.py
git commit -m "feat(tooling): somaplay_edit.py — ler/editar/reescrever backup .somaplay"
```

---

### Task 5: Service Worker (bump + precache) e PRD

**Files:**
- Modify: `app/sw.js` (VERSION + SHELL)
- Modify: `docs/superpowers/specs/2026-06-25-soma-play-design.md` (§10)

- [ ] **Step 1: Bump da versão e precache do `merge.js`**

Em `app/sw.js`: trocar `const VERSION = 'somaplay-v6';` por `const VERSION = 'somaplay-v7';`. E em `SHELL`, após `'./js/backup.js',`, acrescentar:
```js
  './js/merge.js',
```

- [ ] **Step 2: Nota no PRD (§10 Configurações)**

Em `docs/superpowers/specs/2026-06-25-soma-play-design.md`, na seção **§10** (backup), acrescentar a linha:
```markdown
- **Importar** tem dois modos: **substituir** (apaga e troca pela do backup) e **adicionar/atualizar (merge)** — faz upsert por id, deduplica artista por nome e **não apaga** a biblioteca. Ver design `../specs/2026-07-10-import-com-merge-design.md`.
```

- [ ] **Step 3: Verificar**

Run: `cd app && grep -n "somaplay-v7\|merge.js" sw.js && node --test 2>&1 | grep -E "pass |fail "`
Expected: mostra `v7` + `./js/merge.js`; testes `pass` > 0, `fail 0`.

- [ ] **Step 4: Commit**

```bash
git add app/sw.js docs/superpowers/specs/2026-06-25-soma-play-design.md
git commit -m "chore(sw): bump v6→v7 + precache merge.js; PRD nota do import merge"
```

---

## Self-Review

**1. Cobertura do spec:**
- Reconciliação `mergePlan` (puro/testável) → Task 1. `importLibrary(file,{merge})` → Task 2. UI dois botões + `importMode` → Task 3. `scripts/somaplay_edit.py` → Task 4. Bump SW v6→v7 + precache → Task 5. Verificação (testes de mergePlan, manual do import, self-test do script) → Tasks 1/3/4.
- Fora do escopo (Peça 2, reconciliação reversa, merge de settings) → não implementado, por design.

**2. Placeholders:** nenhum — todo passo de código traz o código real.

**3. Consistência de tipos/nomes:** `mergePlan(existing, incoming)` e seu retorno `{artists,songs,lists,added,updated,remap}` idênticos entre Task 1 (def) e Task 2 (uso). `importLibrary(file,{merge})` e retornos (`{artists,songs}` / `{added,updated}`) coerentes entre Task 2 e o `wireBackupInput` da Task 3. `S.importMode` (`replace|merge`) definido na Task 3/Step 1 e lido no Step 4. `read_somaplay/write_somaplay` consistentes dentro da Task 4.

## Notas para quem executa
Sem harness de DOM: Tasks 1 (mergePlan) e 4 (script) têm teste automatizado (`node --test` / `python3 ... test`); Tasks 2–3 (que tocam DB/DOM) usam **verificação manual no navegador** com os passos descritos.
