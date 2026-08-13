// backup.js — exporta/importa a biblioteca inteira num arquivo .somaplay
// Formato: "SOMAPLAY1\n" + tamanho do JSON (10 dígitos) + "\n" + JSON + bytes dos blobs
// concatenados na ordem do manifest. Sem base64 — leitura por slice (memória ok).
import { DB } from './db.js';
import { S, blobIdsDasMusicas } from './state.js';
import { mergePlan } from './merge.js';
import { chordbookRecords, replaceChordbook, mergeChordbookRecords } from './chordbook.js';
import { t } from './i18n.js';

const MAGIC = 'SOMAPLAY1\n';

// O recorte de uma exportação. Não sabe o que é fonte: recebe conjuntos de ids
// prontos, e por isso um eixo novo (artista, lista) entra sem mexer aqui.
// null em qualquer campo significa "tudo" — e com null nos dois o resultado é
// a biblioteca inteira, que é o caminho do backup completo de sempre.
//
// Artista sem música no recorte fica de fora: um artista vazio no destino é
// lixo para o usuário apagar à mão. As listas, ao contrário, viajam inteiras —
// são só ids, não pesam nada, e os que faltam se resolvem quando a outra fonte
// for importada. Podá-las perderia dado: o merge substitui a lista pelo id.
export function recorteParaExport(estado, sel) {
  const { artists = [], songs = [], lists = [] } = estado || {};
  const { songIds = null, listIds = null } = sel || {};
  const songsOut = songIds ? songs.filter((s) => songIds.has(s.id)) : songs;
  const comMusica = new Set(songsOut.map((s) => s.artistId));
  const artistsOut = songIds ? artists.filter((a) => comMusica.has(a.id)) : artists;
  const listsOut = listIds ? lists.filter((l) => listIds.has(l.id)) : lists;
  return { artists: artistsOut, songs: songsOut, lists: listsOut };
}

export function stampDeHoje(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// O nome diz o recorte. `fontes` é null ou vazio quando é tudo — aí o nome é o
// de sempre, e um backup completo continua se chamando o que sempre se chamou.
// `palavraFontes` chega de fora ("fontes"/"sources") para a função ficar pura:
// nome de arquivo não é dado persistido, então traduzir aqui é seguro.
export function nomeDoExport(fontes, stamp, palavraFontes) {
  const slug = (parte) => String(parte)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // tira acento
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const nome = () => {
    if (!fontes || !fontes.length) return 'backup';
    if (fontes.length === 1) return slug(fontes[0]) || 'backup';
    return `${fontes.length}-${slug(palavraFontes)}`;
  };
  return `somaplay-${nome()}-${stamp}.somaplay`;
}

// Sem argumento, o comportamento é exatamente o de hoje: a biblioteca inteira.
export async function exportLibrary({ songIds = null, listIds = null, fileName = null } = {}) {
  const corte = recorteParaExport({ artists: S.artists, songs: S.songs, lists: S.lists }, { songIds, listIds });
  const blobIds = blobIdsDasMusicas(corte.songs);
  const parts = [];
  const manifestBlobs = [];
  for (const id of blobIds) {
    const b = await DB.getBlob(id);
    if (!b) continue;
    manifestBlobs.push({ id, size: b.size, type: b.type || 'application/octet-stream' });
    parts.push(b);
  }
  // chordbook e settings não têm fonte: não passam pelo recorte. O chordbook é
  // JSON pequeno, e sem ele uma cifra pode chegar sem a forma customizada do
  // acorde. `version` continua 1 — um arquivo filtrado é um .somaplay legítimo,
  // e uma versão antiga do app lê ele sem saber que houve filtro.
  const manifest = {
    version: 1,
    app: 'soma_play',
    artists: corte.artists,
    songs: corte.songs,
    lists: corte.lists,
    settings: S.settings,
    chordbook: chordbookRecords(),
    blobs: manifestBlobs,
  };
  const json = JSON.stringify(manifest);
  const header = MAGIC + String(new TextEncoder().encode(json).byteLength).padStart(10, '0') + '\n' + json;
  const blob = new Blob([header, ...parts], { type: 'application/octet-stream' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName || nomeDoExport(null, stampDeHoje());
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
}

export async function importLibrary(file, { merge = false } = {}) {
  const headProbe = await file.slice(0, MAGIC.length + 11).text();
  if (!headProbe.startsWith(MAGIC)) throw new Error(t('msg.backup.notASomaplayFile'));
  const jsonLen = parseInt(headProbe.slice(MAGIC.length, MAGIC.length + 10), 10);
  const jsonStart = MAGIC.length + 11;
  const json = await file.slice(jsonStart, jsonStart + jsonLen).text();
  const manifest = JSON.parse(json);
  if (!manifest.songs || !manifest.artists) throw new Error(t('msg.backup.invalidBackup'));

  // Substituir apaga tudo antes; merge preserva a biblioteca (upsert por id).
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
    await mergeChordbookRecords(manifest.chordbook || []);
    result = { added: plan.added, updated: plan.updated };
  } else {
    for (const a of manifest.artists) await DB.putArtist(a);
    for (const s of manifest.songs) await DB.putSong(s);
    for (const l of manifest.lists || []) await DB.putList(l);
    if (manifest.settings) {
      // lang/notação são preferências do aparelho: não viajam entre bibliotecas
      const { lang, chordNotation, chordNotationTouched, ...rest } = manifest.settings;
      S.settings = { ...S.settings, ...rest };
      await DB.saveSettings(S.settings);
    }
    await replaceChordbook(manifest.chordbook || []);
    result = { artists: manifest.artists.length, songs: manifest.songs.length };
  }

  // recarrega o estado do IndexedDB (consistente nos dois modos)
  const all = await DB.loadAll();
  S.artists = all.artists.sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  S.songs = all.songs;
  S.lists = all.lists;
  return result;
}
