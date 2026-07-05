// backup.js — exporta/importa a biblioteca inteira num arquivo .somaplay
// Formato: "SOMAPLAY1\n" + tamanho do JSON (10 dígitos) + "\n" + JSON + bytes dos blobs
// concatenados na ordem do manifest. Sem base64 — leitura por slice (memória ok).
import { DB } from './db.js';
import { S } from './state.js';

const MAGIC = 'SOMAPLAY1\n';

export async function exportLibrary() {
  const blobIds = [];
  S.songs.forEach((s) => {
    (s.cifra?.imagens || []).forEach((im) => im.blobId && blobIds.push(im.blobId));
    (s.stems || []).forEach((st) => st.blobId && blobIds.push(st.blobId));
    (s.full || []).forEach((f) => f.blobId && blobIds.push(f.blobId));
  });
  const parts = [];
  const manifestBlobs = [];
  for (const id of blobIds) {
    const b = await DB.getBlob(id);
    if (!b) continue;
    manifestBlobs.push({ id, size: b.size, type: b.type || 'application/octet-stream' });
    parts.push(b);
  }
  const manifest = {
    version: 1,
    app: 'soma_play',
    artists: S.artists,
    songs: S.songs,
    lists: S.lists,
    settings: S.settings,
    blobs: manifestBlobs,
  };
  const json = JSON.stringify(manifest);
  const header = MAGIC + String(new TextEncoder().encode(json).byteLength).padStart(10, '0') + '\n' + json;
  const blob = new Blob([header, ...parts], { type: 'application/octet-stream' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const d = new Date();
  const stamp = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  a.download = `somaplay-backup-${stamp}.somaplay`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
}

export async function importLibrary(file) {
  const headProbe = await file.slice(0, MAGIC.length + 11).text();
  if (!headProbe.startsWith(MAGIC)) throw new Error('Arquivo não é um backup do Soma_play');
  const jsonLen = parseInt(headProbe.slice(MAGIC.length, MAGIC.length + 10), 10);
  const jsonStart = MAGIC.length + 11;
  const json = await file.slice(jsonStart, jsonStart + jsonLen).text();
  const manifest = JSON.parse(json);
  if (!manifest.songs || !manifest.artists) throw new Error('Backup inválido');

  // Substitui a biblioteca deste aparelho pela do backup (evita duplicatas ao
  // reimportar). É seguro: settings ficam; o backup traz artistas/músicas/listas/arquivos.
  await DB.wipe();

  // blobs
  let off = jsonStart + jsonLen;
  for (const meta of manifest.blobs || []) {
    const chunk = file.slice(off, off + meta.size, meta.type);
    await DB.saveBlob(meta.id, chunk);
    off += meta.size;
  }
  // metadados (substitui a biblioteca)
  for (const a of manifest.artists) await DB.putArtist(a);
  for (const s of manifest.songs) await DB.putSong(s);
  for (const l of manifest.lists || []) await DB.putList(l);
  if (manifest.settings) {
    S.settings = { ...S.settings, ...manifest.settings };
    await DB.saveSettings(S.settings);
  }
  S.artists = manifest.artists.sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  S.songs = manifest.songs;
  S.lists = manifest.lists || [];
  return { songs: S.songs.length, artists: S.artists.length };
}
