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
