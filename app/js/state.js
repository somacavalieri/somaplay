// state.js — estado central + operações da biblioteca (write-through pro IndexedDB)
import { DB, uid } from './db.js';
import { AudioEngine } from './audio.js';

export const S = {
  // navegação
  screen: 'home',          // home | artist | list | play | addedit | settings
  tab: 'artists',          // artists | songs | lists
  backTo: 'home',          // de onde a tela play foi aberta
  query: '',
  sort: 'title',           // title | artist | recent
  sortMenuOpen: false,
  modeFilter: [],          // lente global: subset de ['T2','T3']
  artistId: null,
  openListId: null,        // id da lista aberta ('__fav' = Favoritas)
  listMenuOpen: false,
  creatingList: false,
  renamingList: false,

  // popover adicionar-à-lista
  popoverSongId: null,

  // biblioteca (cache em memória, espelho do IDB)
  artists: [],
  songs: [],
  lists: [],

  // tela de toque
  currentSongId: null,
  viewMode: 'cifra',       // cifra | karaoke
  t2Source: 'stems',
  mixerCollapsed: false,
  scrollPlaying: false,
  scrollSpeed: 3,
  imgZoom: 1,
  imgInvert: false,
  imgVariant: 'aberta',
  imgMenuOpen: false,
  ctlVisible: true,
  chordFavs: {},           // songId -> [acorde]
  chordPicker: null,       // nome do acorde com o seletor de variação aberto
  pinnedOpen: true,
  transportPlaying: false,
  position: 0,
  duration: 0,

  // edição
  editSongId: null,        // null = novo
  draft: null,             // rascunho da tela adicionar/editar

  // configurações
  settings: {
    theme: 'dark', awake: true, cifraZoom: 110, defaultSpeed: 3, masterVol: 80,
  },
};

export const audio = new AudioEngine();

// ---------- helpers de biblioteca ----------
export function artistById(id) { return S.artists.find((a) => a.id === id) || null; }
export function songById(id) { return S.songs.find((s) => s.id === id) || null; }
export function songsOfArtist(artistId) {
  return S.songs.filter((s) => s.artistId === artistId)
    .sort((a, b) => a.title.localeCompare(b.title, 'pt'));
}
export function artistName(song) { const a = artistById(song.artistId); return a ? a.name : '?'; }

// Modos disponíveis de uma música (T1 = sempre; T2 = tem áudio; T3 = tem letra)
export function modesOf(s) {
  const m = ['T1'];
  if ((s.stems && s.stems.length) || (s.full && s.full.length)) m.push('T2');
  if (s.letra && s.letra.trim()) m.push('T3');
  return m;
}
export function matchesLens(s) {
  if (!S.modeFilter.length) return true;
  const m = modesOf(s);
  return S.modeFilter.every((f) => m.includes(f));
}
export function bestLabel(s) {
  return modesOf(s).includes('T2') ? 'Cifra + acompanhamento' : 'Cifra';
}

// ---------- inicialização ----------
export async function initState() {
  await DB.init();
  const lib = await DB.loadAll();
  S.artists = lib.artists.sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  S.songs = lib.songs;
  S.lists = lib.lists;
  const st = await DB.loadSettings();
  if (st) { delete st.key; S.settings = { ...S.settings, ...st }; }
  S.scrollSpeed = S.settings.defaultSpeed;
  applyTheme();
}

export function applyTheme() {
  document.documentElement.dataset.theme = S.settings.theme;
  const meta = document.querySelector('meta[name=theme-color]');
  if (meta) meta.content = S.settings.theme === 'light' ? '#F1EFEA' : '#0E0E11';
}

export function saveSettings() { DB.saveSettings(S.settings); }

// ---------- mutações ----------
export async function upsertArtist(name) {
  const found = S.artists.find((a) => a.name.toLowerCase() === name.toLowerCase());
  if (found) return found;
  const a = { id: uid(), name, av: S.artists.length % 2 === 0 ? 'amber' : 'teal' };
  S.artists.push(a);
  S.artists.sort((x, y) => x.name.localeCompare(y.name, 'pt'));
  await DB.putArtist(a);
  return a;
}

export async function saveSong(song) {
  const i = S.songs.findIndex((s) => s.id === song.id);
  if (i >= 0) S.songs[i] = song; else S.songs.push(song);
  await DB.putSong(song);
}

export async function deleteSong(songId) {
  const song = songById(songId);
  if (!song) return;
  // apaga blobs
  const blobIds = [];
  (song.cifra?.imagens || []).forEach((im) => blobIds.push(im.blobId));
  (song.stems || []).forEach((st) => blobIds.push(st.blobId));
  (song.full || []).forEach((f) => blobIds.push(f.blobId));
  for (const id of blobIds.filter(Boolean)) await DB.deleteBlob(id);
  // remove de todas as listas (§7)
  for (const l of S.lists) {
    if (l.musicas.includes(songId)) {
      l.musicas = l.musicas.filter((x) => x !== songId);
      await DB.putList(l);
    }
  }
  S.songs = S.songs.filter((s) => s.id !== songId);
  await DB.deleteSong(songId);
  // artista sem músicas some da biblioteca
  const remaining = S.songs.some((s) => s.artistId === song.artistId);
  if (!remaining) {
    S.artists = S.artists.filter((a) => a.id !== song.artistId);
    await DB.deleteArtist(song.artistId);
  }
}

export function toggleFav(songId) {
  const s = songById(songId);
  if (!s) return;
  s.favorita = !s.favorita;
  DB.putSong(s);
}

export async function createList(nome, withSongId) {
  const l = { id: uid(), nome, fixada: false, musicas: withSongId ? [withSongId] : [] };
  S.lists.push(l);
  await DB.putList(l);
  return l;
}
export function listById(id) { return S.lists.find((l) => l.id === id) || null; }
export function toggleSongInList(listId, songId) {
  const l = listById(listId);
  if (!l) return;
  l.musicas = l.musicas.includes(songId) ? l.musicas.filter((x) => x !== songId) : [...l.musicas, songId];
  DB.putList(l);
}
export function moveInList(listId, idx, dir) {
  const l = listById(listId);
  if (!l) return;
  const j = idx + dir;
  if (j < 0 || j >= l.musicas.length) return;
  [l.musicas[idx], l.musicas[j]] = [l.musicas[j], l.musicas[idx]];
  DB.putList(l);
}

// "Favoritas" — lista virtual de sistema
export function favList() {
  return {
    id: '__fav', nome: 'Favoritas', sistema: true, fixada: false,
    musicas: S.songs.filter((s) => s.favorita).map((s) => s.id),
  };
}

// ---------- tela de toque ----------
export function openSong(songId, from) {
  const s = songById(songId);
  if (!s) return;
  const modes = modesOf(s);
  const wantKaraoke = S.modeFilter.includes('T3') && modes.includes('T3') && from !== 'list';
  S.currentSongId = songId;
  S.backTo = from || 'home';
  S.screen = 'play';
  S.viewMode = wantKaraoke ? 'karaoke' : 'cifra';
  S.t2Source = (s.stems && s.stems.length) ? 'stems' : (s.full && s.full[0] ? s.full[0].id : 'stems');
  S.mixerCollapsed = false;
  S.scrollPlaying = false;
  S.scrollSpeed = S.settings.defaultSpeed;
  S.imgZoom = 1;
  S.imgInvert = false;
  S.imgVariant = 'aberta';
  S.imgMenuOpen = false;
  S.ctlVisible = true;
  S.pinnedOpen = true;
  S.transportPlaying = false;
  S.position = 0;
  S.duration = 0;
}

export function currentSong() { return songById(S.currentSongId); }

// Persiste vol/mute dos stems da música atual (debounced)
let _stemSaveTimer = null;
export function persistCurrentStems() {
  clearTimeout(_stemSaveTimer);
  _stemSaveTimer = setTimeout(() => {
    const s = currentSong();
    if (s) DB.putSong(s);
  }, 600);
}
