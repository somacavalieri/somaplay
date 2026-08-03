// main.js — bootstrap, roteador e ações (delegação de eventos)
import {
  S, audio, initState, applyTheme, saveSettings,
  songById, openSong as goSong, currentSong, toggleFav, deleteSong, saveSong,
  createList, listById, toggleSongInList, moveInList, favList,
  persistCurrentStems, applyVarToSongs,
} from './state.js';
import { DB } from './db.js';
import { esc } from './icons.js';
import { renderHome, homeResults } from './render/home.js';
import { renderArtist } from './render/artist.js';
import { renderListScreen } from './render/listscreen.js';
import { renderPopover } from './render/popover.js';
import { renderPlay, afterRenderPlay, loadSongMedia, unloadSongMedia, manageScroll, zoomBy, stopPlayTimers } from './render/play.js';
import { renderAddEdit, newDraft, syncDraftFromDOM, commitDraft } from './render/addedit.js';
import { renderEstilo } from './render/estilo.js';
import { renderSettings, fillStorageInfo } from './render/settings.js';
import { renderChordbook } from './render/chordbookscreen.js';
import { exportLibrary, importLibrary } from './backup.js';
import { importSamples } from './samples.js';
import { openEditor, toggleBarre, tapCell, tapHead, setBase, suggestLabel, editorShape } from './render/chordeditor.js';
import { defaultShape, shapeById, findShape, upsertVar, removeVar, setDefault, restoreBuiltins, labelsOf, pickerShapes } from './chordbook.js';
import { isChordTok } from './chords.js';
import { t, setLang as applyLang } from './i18n.js';

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
let lastScreen = null;

// Rolagens e foco só são preservados quando a tela é a mesma da renderização
// anterior — trocar de tela continua começando do topo.
function captureUI(same) {
  if (!same) return null;
  const scrolls = [...document.querySelectorAll('.content-scroll,[data-autoscroll]')].map((el) => el.scrollTop);
  const a = document.activeElement;
  const focus = a && a.id && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && a.type === 'text'))
    ? { id: a.id, start: a.selectionStart, end: a.selectionEnd }
    : null;
  return { scrolls, focus };
}

function restoreUI(snap) {
  if (!snap) return;
  const els = document.querySelectorAll('.content-scroll,[data-autoscroll]');
  els.forEach((el, i) => { if (snap.scrolls[i] != null) el.scrollTop = snap.scrolls[i]; });
  if (!snap.focus) return;
  const el = document.getElementById(snap.focus.id);
  if (!el) return;
  el.focus();
  try { el.setSelectionRange(snap.focus.start, snap.focus.end); } catch (e) { /* tipo sem seleção */ }
}

export function update() {
  const scr = S.screen;
  const snap = captureUI(lastScreen === scr);
  let html = '';
  if (scr === 'home') html = renderHome();
  else if (scr === 'artist') html = renderArtist();
  else if (scr === 'estilo') html = renderEstilo();
  else if (scr === 'list') html = renderListScreen();
  else if (scr === 'play') html = renderPlay();
  else if (scr === 'addedit') html = renderAddEdit();
  else if (scr === 'settings') html = renderSettings();
  else if (scr === 'chordbook') html = renderChordbook();
  html += renderPopover();
  app.innerHTML = html;
  restoreUI(snap);
  lastScreen = scr;
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
  if (S.screen === 'settings') { fillStorageInfo(); wireBackupInput(); }
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
  const cbq = document.getElementById('cb-query');
  if (cbq) cbq.addEventListener('input', () => { S.cbQuery = cbq.value; update(); });
  const cbn = document.getElementById('cb-new-name');
  const foco = document.activeElement;
  const jaDigitando = foco && (foco.tagName === 'TEXTAREA' || (foco.tagName === 'INPUT' && foco.type === 'text'));
  if (cbn && !jaDigitando) cbn.focus();
  const nl = document.getElementById('new-list-name');
  if (nl) nl.focus();
  const rn = document.getElementById('rename-input');
  if (rn) { rn.focus(); rn.setSelectionRange(rn.value.length, rn.value.length); }
}

// ---------- navegação/áudio ao sair da tela de toque ----------
function leavePlay() {
  S.transportPlaying = false;
  S.scrollPlaying = false;
  S.chordPop = null;
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

// O rótulo é um input dentro do editor — precisa ir pro estado antes de qualquer re-render.
function syncChordEd() {
  const el = document.getElementById('ce-label');
  if (el && S.chordEd) S.chordEd.label = el.value;
}

// Toda ação do editor de casas re-renderiza a tela inteira (update() → app.innerHTML).
// Quando o editor está embutido no formulário de Adicionar/editar (origin 'draft'),
// esse re-render também redesenha os campos de texto do formulário a partir de
// S.draft — então, sem sincronizar o draft primeiro, texto digitado em Título/Tom/
// Fonte/Estilo/Acordes/Cifra em texto/Letra volta ao valor antigo. syncDraftFromDOM()
// já é no-op quando S.draft é null, então este helper serve às três origens do
// editor (rascunho, música, dicionário) sem checar qual é.
function syncCE() { syncDraftFromDOM(); syncChordEd(); }

// Grava a forma como digitação do acorde na música inteira — usada pelo
// picker (pickChordShape) e pelo Aplicar do popover (chordPopApply).
async function applyShapeToSong(song, name, s) {
  song.cifra.digitacoes = {
    ...(song.cifra.digitacoes || {}),
    [name]: { frets: s.frets.slice(), ...(s.barre ? { barre: { ...s.barre } } : {}), varId: s.id },
  };
  await saveSong(song);
}

// Forma que a música/rascunho usa hoje para um acorde (ou a padrão do dicionário).
function shapeAtual(dict, name) {
  const cur = dict && dict[name];
  if (cur) {
    const varId = cur.varId || (findShape(name, cur.frets, cur.barre) || {}).id || null;
    return { shape: { ...cur, label: (shapeById(name, varId) || {}).label || '' }, varId };
  }
  const def = defaultShape(name);
  return { shape: def, varId: def ? def.id : null };
}

// Grava a forma no destino do editor (rascunho, música ou nada, no caso do dicionário).
async function gravarNoDestino(st, shape, varId) {
  const dado = { frets: shape.frets.slice(), ...(shape.barre ? { barre: { ...shape.barre } } : {}), varId };
  if (st.origin.kind === 'draft' && S.draft) {
    S.draft.digitacoes = { ...(S.draft.digitacoes || {}), [st.name]: dado };
  } else if (st.origin.kind === 'song') {
    const song = songById(st.origin.songId);
    if (song) {
      song.cifra = song.cifra || {};
      song.cifra.digitacoes = { ...(song.cifra.digitacoes || {}), [st.name]: dado };
      await saveSong(song);
    }
  }
}

// ---------- ações ----------
const actions = {
  // navegação
  goHome() { if (S.screen === 'play') leavePlay(); S.screen = 'home'; S.sortMenuOpen = false; update(); },
  goSettings() { S.screen = 'settings'; update(); },
  goAdd() { S.editSongId = null; S.draft = newDraft(null); S.chordEd = null; S.screen = 'addedit'; update(); },
  openArtist(d) { S.artistId = d.id; S.screen = 'artist'; update(); },
  openEstilo(d) { S.estiloId = d.id; S.screen = 'estilo'; update(); },
  openSong(d) { openSongAction(d.id, d.from || 'home'); },
  goBack() {
    leavePlay();
    if (S.backTo === 'artist') S.screen = 'artist';
    else if (S.backTo === 'estilo') S.screen = 'estilo';
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
  toggleMiniaturas() {
    S.settings.cifraMiniaturas = !S.settings.cifraMiniaturas;
    saveSettings();
    update();
  },
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
    S.chordEd = null;
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
  openChordPicker(d) { S.chordPicker = d.id; S.chordEd = null; S.chordPop = null; update(); },
  closeChordPicker() { S.chordPicker = null; S.chordEd = null; update(); },
  // ---- popover do acorde na cifra (spec 2026-07-29) ----
  openChordPop(d, ev, el) {
    const r = el.getBoundingClientRect();
    const sc = document.querySelector('[data-autoscroll]');
    S.chordPop = {
      name: d.id,
      anchor: { x: r.left, y: r.top, w: r.width, h: r.height },
      modo: 'mini',
      selId: null,
      scrollTop: sc ? sc.scrollTop : 0,  // rolagem REAL fecha; o restore do re-render (mesmo valor) não
    };
    update();
  },
  chordPopVariar() {
    const song = currentSong(); if (!song || !S.chordPop) return;
    const cur = (song.cifra?.digitacoes || {})[S.chordPop.name] || null;
    S.chordPop.modo = 'carrossel';
    S.chordPop.selId = pickerShapes(S.chordPop.name, cur).selId;
    update();
  },
  chordPopSelect(d, ev, el) {
    if (!S.chordPop) return;
    S.chordPop.selId = el.dataset.var;
    update();
  },
  chordPopReset() {
    const song = currentSong(); if (!song || !S.chordPop) return;
    const cur = (song.cifra?.digitacoes || {})[S.chordPop.name] || null;
    S.chordPop.selId = pickerShapes(S.chordPop.name, cur).selId;
    update();
  },
  async chordPopApply() {
    const song = currentSong(); if (!song || !S.chordPop) return;
    const { name, selId } = S.chordPop;
    const s = selId && selId !== '__song' ? shapeById(name, selId) : null;
    if (s) await applyShapeToSong(song, name, s);
    S.chordPop = null;
    update();
  },
  async pickChordShape(d, ev, el) {
    const song = currentSong(); if (!song) return;
    const id = el.dataset.var;
    const s = id === '__song' ? null : shapeById(d.id, id);
    if (s) await applyShapeToSong(song, d.id, s);
    S.chordPicker = null;
    update();
  },
  pickNewVar(d) {
    S.chordEd = openEditor(d.id, null, { kind: 'song', songId: S.currentSongId, varId: null });
    update();
  },
  pickEditVar(d, ev, el) {
    const song = currentSong(); if (!song) return;
    const id = el.dataset.var;
    if (id === '__song') {
      const cur = song.cifra.digitacoes[d.id];
      S.chordEd = openEditor(d.id, cur, { kind: 'song', songId: song.id, varId: null });
    } else {
      const s = shapeById(d.id, id);
      S.chordEd = openEditor(d.id, s, { kind: 'song', songId: song.id, varId: id });
    }
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
    const jaAtiva = S.t2Source === d.id;
    S.t2Source = d.id;
    audio.setSource(d.id);
    // A fileira de versão completa é um botão de play/pause, não só um seletor
    if (d.id !== 'stems') {
      if (jaAtiva) {
        S.transportPlaying = !S.transportPlaying;
        if (S.transportPlaying) audio.play(); else audio.pause();
      } else if (!S.transportPlaying) {
        S.transportPlaying = true;
        audio.play();
      }
    }
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
  setCifraFonte(d) {
    syncDraftFromDOM();
    S.draft.cifraFonte = d.id;
    if (!(S.draft.fonte && S.draft.fonte.trim())) S.draft.fonte = d.id === 'texto' ? 'CifraClub' : 'Songbook';
    update();
  },
  setFonte(d) { syncDraftFromDOM(); S.draft.fonte = d.id; update(); },
  setEstilo(d) { syncDraftFromDOM(); S.draft.estilo = d.id; update(); },
  editChord(d) {
    syncDraftFromDOM();
    if (!d.id) { S.chordEd = null; update(); return; }
    const { shape, varId } = shapeAtual(S.draft.digitacoes, d.id);
    S.chordEd = openEditor(d.id, shape, { kind: 'draft', varId });
    update();
  },
  refreshChords() { syncDraftFromDOM(); update(); },
  ceCell(d) { syncCE(); S.chordEd = tapCell(S.chordEd, +d.id, +d.fret); update(); },
  ceHead(d) { syncCE(); S.chordEd = tapHead(S.chordEd, +d.id); update(); },
  ceBarre(d) { syncCE(); S.chordEd = toggleBarre(S.chordEd, +d.id); update(); },
  ceBase(d) { syncCE(); S.chordEd = setBase(S.chordEd, +d.id); update(); },
  ceClose() { syncCE(); S.chordEd = null; update(); },
  ceUseVar(d, ev, el) {
    syncCE();
    const s = shapeById(d.id, el.dataset.var);
    if (!s) return;
    S.chordEd = openEditor(d.id, s, { ...S.chordEd.origin, varId: s.id });
    update();
  },
  async ceSave() {   // atualizar a variação de origem (e propagar)
    syncCE();
    const st = S.chordEd;
    const shape = editorShape(st);
    upsertVar(st.name, { id: st.origin.varId, ...shape });
    const n = await applyVarToSongs(st.name, st.origin.varId, shape);
    await gravarNoDestino(st, shape, st.origin.varId);
    S.chordEd = null;
    update();
    toast(n ? `Variação atualizada · ${n} música${n === 1 ? '' : 's'} atualizada${n === 1 ? '' : 's'}` : 'Variação atualizada');
  },
  async ceSaveNew() {   // salvar como variação nova (reaproveitando forma idêntica)
    syncCE();
    const st = S.chordEd;
    const shape = editorShape(st);
    const igual = findShape(st.name, shape.frets, shape.barre);
    const varId = igual ? igual.id : upsertVar(st.name, { ...shape, label: st.label || suggestLabel(st, labelsOf(st.name)) });
    await gravarNoDestino(st, shape, varId);
    S.chordEd = null;
    update();
    toast(igual ? 'Forma já existia no dicionário' : 'Variação salva no dicionário');
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
  cancelAddEdit() { S.draft = null; S.editSongId = null; S.chordEd = null; S.screen = 'home'; update(); },
  async saveDraft() {
    try {
      const song = await commitDraft();
      S.draft = null;
      S.editSongId = null;
      S.chordEd = null;
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
  setLang(d) {
    S.settings.lang = applyLang(d.id);
    if (!S.settings.chordNotationTouched) {
      S.settings.chordNotation = d.id === 'pt' ? 'br' : 'intl';
    }
    saveSettings(); update();
  },
  setNotation(d) {
    S.settings.chordNotation = d.id;
    S.settings.chordNotationTouched = true;
    saveSettings(); update();
  },
  async exportBackup() {
    toast('Gerando backup...');
    try { await exportLibrary(); toast('Backup exportado'); }
    catch (e) { toast('Falha ao exportar: ' + e.message); }
  },
  importBackup() { S.importMode = 'replace'; document.getElementById('file-backup').click(); },
  importBackupMerge() { S.importMode = 'merge'; document.getElementById('file-backup').click(); },
  async importSamples() {
    try {
      const done = await importSamples();
      update();
      toast(done.length ? `Importado: ${done.join(' · ')}` : 'Exemplos já estavam na biblioteca');
    } catch (e) { toast('Falha ao importar exemplos: ' + e.message); }
  },

  // dicionário de acordes
  goChordbook() { S.screen = 'chordbook'; S.chordEd = null; S.cbQuery = ''; S.cbFilter = null; S.cbAdding = false; update(); },
  cbLetter(d) { S.cbFilter = S.cbFilter === d.id ? null : d.id; update(); },
  cbEditVar(d, ev, el) {
    const s = shapeById(d.id, el.dataset.var);
    if (!s) return;
    S.chordEd = openEditor(d.id, s, { kind: 'book', varId: s.id });
    S.cbAdding = false;
    update();
  },
  cbNewVar(d) { S.chordEd = openEditor(d.id, null, { kind: 'book', varId: null }); S.cbAdding = false; update(); },
  cbSetDefault(d, ev, el) { setDefault(d.id, el.dataset.var); update(); toast('Padrão do acorde atualizado'); },
  cbDeleteVar(d, ev, el) {
    const id = el.dataset.var;
    const s = shapeById(d.id, id);
    if (!s) return;
    if (!confirm(`Apagar a variação “${s.label || 'variação'}” de ${d.id}? As músicas que já a usam mantêm a forma delas.`)) return;
    removeVar(d.id, id);
    S.chordEd = null;
    update();
  },
  cbRestore(d) { restoreBuiltins(d.id); update(); toast('Formas embutidas restauradas'); },
  cbStartAdd() { S.cbAdding = true; S.chordEd = null; update(); },
  cbCancelAdd() { S.cbAdding = false; update(); },
  cbConfirmAdd() {
    const inp = document.getElementById('cb-new-name');
    const nome = inp ? inp.value.trim() : '';
    if (!nome) return;
    if (!isChordTok(nome)) { toast('Nome de acorde inválido'); return; }
    S.cbAdding = false;
    S.cbQuery = nome;
    S.cbFilter = null;   // senão o chip de tônica pode esconder o acorde recém-criado
    S.chordEd = openEditor(nome, null, { kind: 'book', varId: null });
    update();
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
}

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

// ---------- delegação global ----------
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-a]');
  if (t) {
    const name = t.dataset.a;
    if (actions[name]) {
      // scrim fecha só se o clique foi nele mesmo (não no conteúdo)
      if ((name === 'closePopover' || name === 'toggleMixer' || name === 'closeChordPicker') && t !== e.target && e.target.closest('[data-stop]')) return;
      actions[name](t.dataset, e, t);
      return;
    }
  }
  // clique fora fecha menus abertos
  if (S.sortMenuOpen && !e.target.closest('.sort-wrap')) { S.sortMenuOpen = false; update(); }
  if (S.imgMenuOpen && !e.target.closest('.menu-wrap')) { S.imgMenuOpen = false; update(); }
  if (S.listMenuOpen && !e.target.closest('.menu-wrap')) { S.listMenuOpen = false; update(); }
  if (S.chordPop && !e.target.closest('.chord-pop')) { S.chordPop = null; update(); }
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
    if (S.chordPop) { S.chordPop = null; update(); }
    else if (S.popoverSongId) { S.popoverSongId = null; update(); }
    else if (S.imgMenuOpen || S.sortMenuOpen || S.listMenuOpen) {
      S.imgMenuOpen = S.sortMenuOpen = S.listMenuOpen = false;
      update();
    }
  }
  if (e.key === 'Enter') {
    if (document.activeElement?.id === 'new-list-name') actions.confirmCreateList();
    if (document.activeElement?.id === 'pop-new-name') actions.popCreateList();
    if (document.activeElement?.id === 'rename-input') actions.confirmRename();
    if (document.activeElement?.id === 'cb-new-name') actions.cbConfirmAdd();
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
  try {
    await initState();
  } catch (e) {
    // Tela branca sem explicação é o pior desfecho aqui (ex.: outra aba com o app
    // aberto segurando a conexão do IndexedDB numa versão antiga — indexedDB.open
    // fica bloqueado sem resolver nem rejeitar até db.js's onblocked entrar em ação).
    // O #toast não serve pra isto: ele é pensado pra conviver com uma tela já
    // desenhada, e neste ponto #app ainda está vazio — um toast sozinho ficaria
    // solto. Um bloco de texto simples dentro do próprio #app é mais honesto.
    app.innerHTML = `<div style="padding:60px 24px;max-width:440px;margin:0 auto;text-align:center">
      <div style="font-family:var(--f-title);font-weight:700;font-size:19px;margin-bottom:10px">Não foi possível abrir o Soma Play</div>
      <div style="color:var(--muted);font-size:14px;line-height:1.5">${esc((e && e.message) || 'Falha ao iniciar o banco de dados local.')}</div>
    </div>`;
    return;
  }
  update();
  manageWakeLock();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
