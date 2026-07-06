// main.js — bootstrap, roteador e ações (delegação de eventos)
import {
  S, audio, initState, applyTheme, saveSettings,
  songById, openSong as goSong, currentSong, toggleFav, deleteSong, saveSong,
  createList, listById, toggleSongInList, moveInList, favList,
  persistCurrentStems,
} from './state.js';
import { DB } from './db.js';
import { renderHome, homeResults } from './render/home.js';
import { renderArtist } from './render/artist.js';
import { renderListScreen } from './render/listscreen.js';
import { renderPopover } from './render/popover.js';
import { renderPlay, afterRenderPlay, loadSongMedia, unloadSongMedia, manageScroll, zoomBy, stopPlayTimers } from './render/play.js';
import { renderAddEdit, newDraft, syncDraftFromDOM, commitDraft } from './render/addedit.js';
import { renderSettings, fillStorageInfo } from './render/settings.js';
import { exportLibrary, importLibrary } from './backup.js';
import { importSamples } from './samples.js';
import { catalogShapes, catalogDefault } from './chords-catalog.js';

const app = document.getElementById('app');

// ---------- toast ----------
let toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

// ---------- render ----------
export function update() {
  const scr = S.screen;
  // preserva a rolagem da cifra entre re-renders da tela de toque
  const prevScroll = scr === 'play' ? document.querySelector('[data-autoscroll]')?.scrollTop : null;
  let html = '';
  if (scr === 'home') html = renderHome();
  else if (scr === 'artist') html = renderArtist();
  else if (scr === 'list') html = renderListScreen();
  else if (scr === 'play') html = renderPlay();
  else if (scr === 'addedit') html = renderAddEdit();
  else if (scr === 'settings') html = renderSettings();
  html += renderPopover();
  app.innerHTML = html;
  if (prevScroll != null) {
    const el = document.querySelector('[data-autoscroll]');
    if (el) el.scrollTop = prevScroll;
  }
  afterRender();
}

function updateHomeResults() {
  const el = document.getElementById('home-results');
  if (el) el.innerHTML = homeResults();
  else update();
}

function afterRender() {
  if (S.screen === 'play') afterRenderPlay(update);
  else stopPlayTimers();
  if (S.screen === 'settings') fillStorageInfo();
  if (S.screen === 'addedit') wireAddEditFiles();

  const search = document.getElementById('search-input');
  if (search) {
    search.addEventListener('input', () => {
      S.query = search.value;
      updateHomeResults();
    });
  }
  const aq = document.getElementById('artist-query');
  if (aq) {
    aq.focus();
    aq.setSelectionRange(aq.value.length, aq.value.length);
    aq.addEventListener('input', () => {
      S.draft.artistQuery = aq.value;
      syncDraftFromDOM();
      update();
    });
  }
  const nl = document.getElementById('new-list-name');
  if (nl) nl.focus();
  const rn = document.getElementById('rename-input');
  if (rn) { rn.focus(); rn.setSelectionRange(rn.value.length, rn.value.length); }
}

// ---------- navegação/áudio ao sair da tela de toque ----------
function leavePlay() {
  S.transportPlaying = false;
  S.scrollPlaying = false;
  stopPlayTimers();
  unloadSongMedia();
}

async function openSongAction(id, from) {
  goSong(id, from);
  update();
  const song = currentSong();
  if (!song) return;
  const sid = S.currentSongId;
  await loadSongMedia(song);
  if (S.currentSongId === sid && S.screen === 'play') update();
}

// ---------- ações ----------
const actions = {
  // navegação
  goHome() { if (S.screen === 'play') leavePlay(); S.screen = 'home'; S.sortMenuOpen = false; update(); },
  goSettings() { S.screen = 'settings'; update(); },
  goAdd() { S.editSongId = null; S.draft = newDraft(null); S.screen = 'addedit'; update(); },
  openArtist(d) { S.artistId = d.id; S.screen = 'artist'; update(); },
  openSong(d) { openSongAction(d.id, d.from || 'home'); },
  goBack() {
    leavePlay();
    if (S.backTo === 'artist') S.screen = 'artist';
    else if (S.backTo === 'list') S.screen = 'list';
    else { S.screen = 'home'; }
    update();
  },
  setTab(d) { S.tab = d.id; S.sortMenuOpen = false; update(); },
  toggleLens(d) {
    S.modeFilter = S.modeFilter.includes(d.id)
      ? S.modeFilter.filter((x) => x !== d.id)
      : [...S.modeFilter, d.id];
    update();
  },
  toggleSortMenu() { S.sortMenuOpen = !S.sortMenuOpen; update(); },
  setSort(d) { S.sort = d.id; S.sortMenuOpen = false; update(); },

  // favoritos / popover de listas
  toggleFav(d) { toggleFav(d.id); update(); },
  openPopover(d) { S.popoverSongId = d.id; update(); },
  closePopover() { S.popoverSongId = null; update(); },
  popToggleList(d) { toggleSongInList(d.id, S.popoverSongId); update(); },
  async popCreateList() {
    const inp = document.getElementById('pop-new-name');
    const name = inp ? inp.value.trim() : '';
    if (!name) return;
    await createList(name, S.popoverSongId);
    update();
    toast(`Lista "${name}" criada com a música dentro`);
  },

  // listas
  openList(d) { S.openListId = d.id; S.screen = 'list'; S.listMenuOpen = false; S.renamingList = false; update(); },
  backToLists() { S.screen = 'home'; S.tab = 'lists'; S.openListId = null; S.listMenuOpen = false; S.renamingList = false; update(); },
  startCreateList() { S.creatingList = !S.creatingList; update(); },
  cancelCreateList() { S.creatingList = false; update(); },
  async confirmCreateList() {
    const inp = document.getElementById('new-list-name');
    const name = inp ? inp.value.trim() : '';
    if (!name) return;
    await createList(name);
    S.creatingList = false;
    update();
  },
  toggleListMenu() { S.listMenuOpen = !S.listMenuOpen; update(); },
  startRename() { S.renamingList = true; S.listMenuOpen = false; update(); },
  cancelRename() { S.renamingList = false; update(); },
  confirmRename() {
    const inp = document.getElementById('rename-input');
    const name = inp ? inp.value.trim() : '';
    const l = listById(S.openListId);
    if (l && name) { l.nome = name; DB.putList(l); }
    S.renamingList = false;
    update();
  },
  togglePinList() {
    const l = listById(S.openListId);
    if (l) { l.fixada = !l.fixada; DB.putList(l); }
    S.listMenuOpen = false;
    update();
  },
  deleteList() {
    const l = listById(S.openListId);
    if (!l) return;
    if (!confirm(`Excluir a lista "${l.nome}"? As músicas continuam na biblioteca.`)) return;
    S.lists = S.lists.filter((x) => x.id !== l.id);
    DB.deleteList(l.id);
    actions.backToLists();
  },
  moveUp(d) { moveList(+d.id, -1); },
  moveDown(d) { moveList(+d.id, +1); },
  removeFromList(d) {
    if (S.openListId === '__fav') { toggleFav(d.id); }
    else {
      const l = listById(S.openListId);
      if (l) { l.musicas = l.musicas.filter((x) => x !== d.id); DB.putList(l); }
    }
    update();
  },

  // tela de toque
  setViewMode(d) {
    S.viewMode = d.id;
    S.scrollPlaying = false;
    update();
  },
  toggleImgMenu() { S.imgMenuOpen = !S.imgMenuOpen; update(); },
  menuFav() { toggleFav(S.currentSongId); S.imgMenuOpen = false; update(); },
  menuAddList() { S.imgMenuOpen = false; S.popoverSongId = S.currentSongId; update(); },
  toggleInvert() { S.imgInvert = !S.imgInvert; update(); },
  toggleVariant() {
    S.imgVariant = S.imgVariant === 'fechada' ? 'aberta' : 'fechada';
    S.imgMenuOpen = false;
    update();
  },
  imgZoomIn() { zoomBy(0.2); },
  imgZoomOut() { zoomBy(-0.2); },
  editSong() {
    S.imgMenuOpen = false;
    const song = currentSong();
    if (!song) return;
    leavePlay();
    S.editSongId = song.id;
    S.draft = newDraft(song);
    S.screen = 'addedit';
    update();
  },
  async deleteSongAsk() {
    const song = currentSong();
    if (!song) return;
    if (!confirm(`Excluir "${song.title}" da biblioteca? Sai de todas as listas também.`)) return;
    leavePlay();
    await deleteSong(song.id);
    S.screen = 'home';
    update();
    toast('Música excluída');
  },
  toggleChordFav(d) {
    const id = S.currentSongId;
    const cur = S.chordFavs[id] || [];
    S.chordFavs[id] = cur.includes(d.id) ? cur.filter((x) => x !== d.id) : [...cur, d.id];
    update();
  },
  togglePinnedBar() { S.pinnedOpen = !S.pinnedOpen; update(); },
  toggleScroll() {
    S.scrollPlaying = !S.scrollPlaying;
    manageScroll();
    update();
  },
  incSpeed() { S.scrollSpeed = Math.min(10, S.scrollSpeed + 1); patchSpeed(); },
  decSpeed() { S.scrollSpeed = Math.max(1, S.scrollSpeed - 1); patchSpeed(); },

  // mixer / transporte
  toggleMixer() { S.mixerCollapsed = !S.mixerCollapsed; update(); },
  selectSource(d) {
    S.t2Source = d.id;
    audio.setSource(d.id);
    update();
  },
  toggleMute(d) {
    const song = currentSong();
    if (!song) return;
    const ch = (song.stems || []).find((c) => c.id === d.id);
    if (!ch) return;
    ch.muted = !ch.muted;
    if (S.t2Source !== 'stems') { S.t2Source = 'stems'; audio.setSource('stems'); }
    audio.setChannels(song.stems);
    persistCurrentStems();
    update();
  },
  toggleTransport() {
    S.transportPlaying = !S.transportPlaying;
    if (S.transportPlaying) audio.play(); else audio.pause();
    update();
  },

  // adicionar/editar
  toggleArtistDD() { syncDraftFromDOM(); S.draft.artistOpen = !S.draft.artistOpen; S.draft.artistQuery = ''; update(); },
  closeArtistDD() { syncDraftFromDOM(); S.draft.artistOpen = false; update(); },
  pickArtist(d) { syncDraftFromDOM(); S.draft.artistName = d.id; S.draft.artistOpen = false; update(); },
  createArtistFromQuery() {
    syncDraftFromDOM();
    const n = S.draft.artistQuery.trim();
    if (!n) return;
    S.draft.artistName = n;
    S.draft.artistOpen = false;
    update();
  },
  setCifraFonte(d) { syncDraftFromDOM(); S.draft.cifraFonte = d.id; update(); },
  editChord(d) { syncDraftFromDOM(); S.draft.editingChord = d.id || null; update(); },
  refreshChords() { syncDraftFromDOM(); update(); },
  setFret(d) {
    syncDraftFromDOM();
    const name = S.draft.editingChord; if (!name) return;
    const dict = S.draft.digitacoes || (S.draft.digitacoes = {});
    const base = dict[name] || catalogDefault(name) || { frets: [-1, -1, -1, -1, -1, -1] };
    const frets = base.frets.slice();
    const i = +d.id; const fret = +d.fret;
    frets[i] = (frets[i] === fret) ? 0 : fret;
    dict[name] = { frets, ...(base.barre ? { barre: { ...base.barre } } : {}) };
    update();
  },
  useCatShape(d, ev, el) {
    syncDraftFromDOM();
    const name = d.id; const s = catalogShapes(name)[+el.dataset.ix]; if (!s) return;
    const dict = S.draft.digitacoes || (S.draft.digitacoes = {});
    dict[name] = { frets: s.frets.slice(), ...(s.barre ? { barre: { ...s.barre } } : {}) };
    update();
  },
  pickImages() { document.getElementById('file-images').click(); },
  setImgTipo(d, ev, el) { syncDraftFromDOM(); S.draft.imagens[+d.id].tipo = el.dataset.tipo; update(); },
  removeImg(d) { syncDraftFromDOM(); S.draft.imagens.splice(+d.id, 1); update(); },
  addStems() { document.getElementById('file-audio').click(); },
  pickStemFile(d) { fileTarget = { kind: 'stem', index: +d.id }; document.getElementById('file-audio-single').click(); },
  removeStem(d) { syncDraftFromDOM(); S.draft.stems.splice(+d.id, 1); update(); },
  addFull() { fileTarget = { kind: 'full', index: -1 }; document.getElementById('file-audio-single').click(); },
  pickFullFile(d) { fileTarget = { kind: 'full', index: +d.id }; document.getElementById('file-audio-single').click(); },
  removeFull(d) { syncDraftFromDOM(); S.draft.full.splice(+d.id, 1); update(); },
  cancelAddEdit() { S.draft = null; S.editSongId = null; S.screen = 'home'; update(); },
  async saveDraft() {
    try {
      const song = await commitDraft();
      S.draft = null;
      S.editSongId = null;
      S.screen = 'home';
      update();
      toast(`"${song.title}" salva na biblioteca`);
    } catch (e) {
      toast(e.message || 'Não foi possível salvar');
    }
  },

  // configurações
  toggleAwake() {
    S.settings.awake = !S.settings.awake;
    saveSettings();
    manageWakeLock();
    update();
  },
  setTheme(d) { S.settings.theme = d.id; saveSettings(); applyTheme(); update(); },
  async exportBackup() {
    toast('Gerando backup...');
    try { await exportLibrary(); toast('Backup exportado'); }
    catch (e) { toast('Falha ao exportar: ' + e.message); }
  },
  importBackup() { document.getElementById('file-backup').click(); },
  async importSamples() {
    try {
      const done = await importSamples();
      update();
      toast(done.length ? `Importado: ${done.join(' · ')}` : 'Exemplos já estavam na biblioteca');
    } catch (e) { toast('Falha ao importar exemplos: ' + e.message); }
  },
};

function moveList(idx, dir) {
  if (S.openListId === '__fav') return; // Favoritas: ordem automática
  moveInList(S.openListId, idx, dir);
  update();
}

function patchSpeed() {
  const el = document.getElementById('speed-val');
  if (el) el.textContent = S.scrollSpeed;
}

// ---------- arquivos (tela adicionar/editar) ----------
let fileTarget = null;

function wireAddEditFiles() {
  const imgs = document.getElementById('file-images');
  const audioMulti = document.getElementById('file-audio');
  const audioSingle = document.getElementById('file-audio-single');
  if (imgs) imgs.onchange = () => {
    syncDraftFromDOM();
    for (const f of imgs.files) {
      const hasAberta = S.draft.imagens.some((i) => i.tipo === 'aberta');
      S.draft.imagens.push({ _file: f, name: f.name, tipo: hasAberta ? 'fechada' : 'aberta', _thumbURL: URL.createObjectURL(f) });
    }
    imgs.value = '';
    update();
  };
  if (audioMulti) audioMulti.onchange = () => {
    syncDraftFromDOM();
    for (const f of audioMulti.files) {
      const base = f.name.replace(/\.[^.]+$/, '');
      S.draft.stems.push({ id: null, name: base.charAt(0).toUpperCase() + base.slice(1), _file: f, fileName: f.name });
    }
    audioMulti.value = '';
    update();
  };
  if (audioSingle) audioSingle.onchange = () => {
    syncDraftFromDOM();
    const f = audioSingle.files[0];
    if (f && fileTarget) {
      if (fileTarget.kind === 'stem') {
        const st = S.draft.stems[fileTarget.index];
        if (st) { st._file = f; st.fileName = f.name; }
      } else if (fileTarget.kind === 'full') {
        const base = f.name.replace(/\.[^.]+$/, '');
        if (fileTarget.index < 0) S.draft.full.push({ id: null, nome: base, meta: '', _file: f, fileName: f.name });
        else { const fu = S.draft.full[fileTarget.index]; if (fu) { fu._file = f; fu.fileName = f.name; } }
      }
    }
    audioSingle.value = '';
    fileTarget = null;
    update();
  };
  const backup = document.getElementById('file-backup');
  if (backup) backup.onchange = async () => {
    const f = backup.files[0];
    backup.value = '';
    if (!f) return;
    const total = S.songs.length;
    if (total > 0 && !confirm(`Importar "${f.name}" vai SUBSTITUIR a biblioteca deste aparelho (${total} música${total === 1 ? '' : 's'}) pela do backup. As músicas atuais deste aparelho serão apagadas. Continuar?`)) return;
    toast('Importando biblioteca...');
    try {
      const res = await importLibrary(f);
      applyTheme();
      update();
      toast(`Biblioteca importada: ${res.artists} artistas, ${res.songs} músicas`);
    } catch (e) { toast('Falha na importação: ' + e.message); }
  };
}

// ---------- delegação global ----------
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-a]');
  if (t) {
    const name = t.dataset.a;
    if (actions[name]) {
      // scrim fecha só se o clique foi nele mesmo (não no conteúdo)
      if ((name === 'closePopover' || name === 'toggleMixer') && t !== e.target && e.target.closest('[data-stop]')) return;
      actions[name](t.dataset, e, t);
      return;
    }
  }
  // clique fora fecha menus abertos
  if (S.sortMenuOpen && !e.target.closest('.sort-wrap')) { S.sortMenuOpen = false; update(); }
  if (S.imgMenuOpen && !e.target.closest('.menu-wrap')) { S.imgMenuOpen = false; update(); }
  if (S.listMenuOpen && !e.target.closest('.menu-wrap')) { S.listMenuOpen = false; update(); }
});

document.addEventListener('input', (e) => {
  const t = e.target;
  const kind = t.dataset.in;
  if (!kind) return;
  const song = currentSong();
  if (kind === 'stemVol' && song) {
    const ch = (song.stems || []).find((c) => c.id === t.dataset.id);
    if (!ch) return;
    ch.vol = +t.value;
    const lbl = document.getElementById('vol-val-' + ch.id);
    if (lbl) lbl.textContent = ch.vol + '%';
    audio.setChannels(song.stems);
    persistCurrentStems();
  } else if (kind === 'seek') {
    audio.seek(+t.value);
  } else if (kind === 'master') {
    S.settings.masterVol = +t.value;
    audio.setMaster(S.settings.masterVol / 100);
    saveSettingsDebounced();
  } else if (kind === 'setZoom') {
    S.settings.cifraZoom = +t.value;
    const v = document.getElementById('v-zoom');
    if (v) v.textContent = t.value + '%';
    saveSettingsDebounced();
  } else if (kind === 'setDefSpeed') {
    S.settings.defaultSpeed = +t.value;
    const v = document.getElementById('v-speed');
    if (v) v.textContent = t.value;
    saveSettingsDebounced();
  } else if (kind === 'setMasterVol') {
    S.settings.masterVol = +t.value;
    audio.setMaster(S.settings.masterVol / 100);
    const v = document.getElementById('v-master');
    if (v) v.textContent = t.value + '%';
    saveSettingsDebounced();
  } else if (kind === 'stemName') {
    if (S.draft) S.draft.stems[+t.dataset.id].name = t.value;
  } else if (kind === 'fullName') {
    if (S.draft) S.draft.full[+t.dataset.id].nome = t.value;
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (S.popoverSongId) { S.popoverSongId = null; update(); }
    else if (S.imgMenuOpen || S.sortMenuOpen || S.listMenuOpen) {
      S.imgMenuOpen = S.sortMenuOpen = S.listMenuOpen = false;
      update();
    }
  }
  if (e.key === 'Enter') {
    if (document.activeElement?.id === 'new-list-name') actions.confirmCreateList();
    if (document.activeElement?.id === 'pop-new-name') actions.popCreateList();
    if (document.activeElement?.id === 'rename-input') actions.confirmRename();
  }
  // espaço = play/pause do transporte na tela de toque (fora de inputs)
  if (e.key === ' ' && S.screen === 'play' && !/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '')) {
    const song = currentSong();
    if (song && ((song.stems || []).length || (song.full || []).length)) {
      e.preventDefault();
      actions.toggleTransport();
    }
  }
});

let _setTimer = null;
function saveSettingsDebounced() {
  clearTimeout(_setTimer);
  _setTimer = setTimeout(saveSettings, 500);
}

// ---------- wake lock ----------
let wakeLock = null;
async function manageWakeLock() {
  if (S.settings.awake && 'wakeLock' in navigator) {
    try {
      if (!wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      }
    } catch (e) { /* sem permissão/foco — tenta de novo no próximo visibilitychange */ }
  } else if (!S.settings.awake && wakeLock) {
    wakeLock.release().catch(() => {});
    wakeLock = null;
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') manageWakeLock();
});

// ---------- boot ----------
(async function boot() {
  await initState();
  update();
  manageWakeLock();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
