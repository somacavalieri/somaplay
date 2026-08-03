// state.js — estado central + operações da biblioteca (write-through pro IndexedDB)
import { DB, uid } from './db.js';
import { AudioEngine } from './audio.js';
import { loadChordbook, songsUsingVar, shapeKey } from './chordbook.js';
import { setLang, detectLang } from './i18n.js';

export const S = {
  // navegação
  screen: 'home',          // home | artist | list | play | addedit | settings | chordbook
  tab: 'artists',          // artists | songs | estilos | lists
  backTo: 'home',          // de onde a tela play foi aberta
  query: '',
  sort: 'title',           // title | artist | recent
  sortMenuOpen: false,
  modeFilter: [],          // lente global: subset de ['T2','T3']
  artistId: null,
  estiloId: null,          // estilo aberto (o nome do estilo é a chave)
  openListId: null,        // id da lista aberta ('__fav' = Favoritas)
  listMenuOpen: false,
  creatingList: false,
  renamingList: false,

  // dicionário de acordes
  cbQuery: '',
  cbFilter: null,          // tônica filtrada (A..G) ou null
  cbAdding: false,         // campo "novo acorde" aberto

  // popover adicionar-à-lista
  popoverSongId: null,
  importMode: 'replace',   // replace | merge — modo do próximo import de backup

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
  chordPop: null,          // popover do acorde tocado na cifra: { name, anchor, modo:'mini'|'carrossel', selId, scrollTop }
  pinnedOpen: true,
  transportPlaying: false,
  position: 0,
  duration: 0,

  // edição
  editSongId: null,        // null = novo
  draft: null,             // rascunho da tela adicionar/editar
  chordEd: null,           // estado do editor de casas (render/chordeditor.js)

  // configurações
  settings: {
    theme: 'dark', awake: true, cifraZoom: 110, defaultSpeed: 3, masterVol: 80,
    cifraMiniaturas: false,
    lang: null,                    // null = ainda não resolvido; boot() detecta
    chordNotation: null,           // null = segue o idioma
    chordNotationTouched: false,   // true depois que o usuário mexe na notação
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

// Estilo musical (um por música; sem estilo → "Sem estilo")
export const SEM_ESTILO = 'Sem estilo';
export function estiloOf(s) { return (s && s.estilo && s.estilo.trim()) || SEM_ESTILO; }
export function songsOfEstilo(estilo) {
  return S.songs.filter((s) => estiloOf(s) === estilo)
    .sort((a, b) => a.title.localeCompare(b.title, 'pt'));
}

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
  await loadChordbook();
  const st = await DB.loadSettings();
  if (st) { delete st.key; S.settings = { ...S.settings, ...st }; }
  if (!S.settings.lang) S.settings.lang = detectLang(navigator.language);
  if (!S.settings.chordNotation) S.settings.chordNotation = S.settings.lang === 'pt' ? 'br' : 'intl';
  setLang(S.settings.lang);
  saveSettings();
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
// Move um item de posição devolvendo uma cópia — não muta a entrada.
export function moveItem(arr, from, to) {
  const out = arr.slice();
  const [x] = out.splice(from, 1);
  out.splice(to, 0, x);
  return out;
}

export function reorderInList(listId, from, to) {
  const l = listById(listId);
  if (!l) return;
  const n = l.musicas.length;
  if (from === to || from < 0 || to < 0 || from >= n || to >= n) return;
  l.musicas = moveItem(l.musicas, from, to);
  DB.putList(l);
}

// Propaga a forma para as músicas que apontam para aquela variação. Devolve quantas mudaram.
export async function applyVarToSongs(name, varId, shape) {
  let n = 0;
  for (const s of songsUsingVar(S.songs, name, varId)) {
    const cur = s.cifra.digitacoes[name];
    if (shapeKey(cur) === shapeKey(shape)) continue;
    s.cifra.digitacoes = {
      ...s.cifra.digitacoes,
      [name]: { frets: shape.frets.slice(), ...(shape.barre ? { barre: { ...shape.barre } } : {}), varId },
    };
    await saveSong(s);
    n++;
  }
  return n;
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
