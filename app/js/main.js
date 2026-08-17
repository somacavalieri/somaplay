// main.js — bootstrap, roteador e ações (delegação de eventos)
import {
  S, audio, initState, applyTheme, saveSettings,
  songById, openSong as goSong, currentSong, toggleFav, deleteSong, deleteSongs, saveSong,
  createList, listById, toggleSongInList, reorderInList, favList, indicesPresentes,
  persistCurrentStems, applyVarToSongs, fontesDaBiblioteca, songIdsDasFontes,
  SEM_FONTE,
  toggleFonte as calcToggleFonte, podarFonteFilter,
  musicasPresentes, songsOfArtist, artistById, matchesLens,
  duplicarMusicaNoTom,
} from './state.js';
import { DB } from './db.js';
import { esc } from './icons.js';
import { renderHome, homeResults } from './render/home.js';
import { renderArtist } from './render/artist.js';
import { renderListScreen } from './render/listscreen.js';
import { wireListDrag } from './render/listdrag.js';
import { renderPopover } from './render/popover.js';
import { renderShareSheet, calculaTamanhos, OPCOES } from './render/sharesheet.js';
import { renderPlay, afterRenderPlay, loadSongMedia, unloadSongMedia, manageScroll, zoomBy, stopPlayTimers, tomAtual } from './render/play.js';
import { renderAddEdit, newDraft, syncDraftFromDOM, commitDraft } from './render/addedit.js';
import { renderEstilo } from './render/estilo.js';
import { renderSettings, fillStorageInfo } from './render/settings.js';
import { renderChordbook } from './render/chordbookscreen.js';
import { exportLibrary, entregaArquivo, baixaArquivo, importLibrary, recorteDeFontes, nomeDoExport, stampDeHoje, lerManifest, avisosDeSubstituir } from './backup.js';
import { PARTES_TODAS } from './partes.js';
import { importSamples } from './samples.js';
import { openEditor, toggleBarre, tapCell, tapHead, setBase, suggestLabel, editorShape } from './render/chordeditor.js';
import { defaultShape, shapeById, findShape, upsertVar, removeVar, setDefault, restoreBuiltins, labelsOf, pickerShapes } from './chordbook.js';
import { isChordTok } from './chords.js';
import { semitonsEntre, tomDeSemitons } from './transpose.js';
import { clampSpeed } from './scroll-speed.js';
import { t, setLang as applyLang } from './i18n.js';
import { wireFonteStrip, refreshFonteCounts } from './render/fontestrip.js';

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
  // A faixa de fontes rola na horizontal, e update() reescreve o app inteiro:
  // sem isto, clicar numa pílula joga a faixa de volta ao começo e as fontes do
  // fim viram inalcançáveis na prática.
  const hscrolls = [...document.querySelectorAll('[data-hscroll]')].map((el) => el.scrollLeft);
  const a = document.activeElement;
  const focus = a && a.id && (a.tagName === 'TEXTAREA' || (a.tagName === 'INPUT' && a.type === 'text'))
    ? { id: a.id, start: a.selectionStart, end: a.selectionEnd }
    : null;
  return { scrolls, hscrolls, focus };
}

function restoreUI(snap) {
  if (!snap) return;
  const els = document.querySelectorAll('.content-scroll,[data-autoscroll]');
  els.forEach((el, i) => { if (snap.scrolls[i] != null) el.scrollTop = snap.scrolls[i]; });
  const hels = document.querySelectorAll('[data-hscroll]');
  hels.forEach((el, i) => { if (snap.hscrolls[i] != null) el.scrollLeft = snap.hscrolls[i]; });
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
  html += renderShareSheet();
  app.innerHTML = html;
  restoreUI(snap);
  lastScreen = scr;
  afterRender();
}

function updateHomeResults() {
  const el = document.getElementById('home-results');
  if (el) { el.innerHTML = homeResults(); refreshFonteCounts(); }
  else update();
}

function afterRender() {
  if (S.screen === 'play') afterRenderPlay(update);
  else stopPlayTimers();
  if (S.screen === 'settings') { fillStorageInfo(); wireBackupInput(); }
  if (S.screen === 'addedit') wireAddEditFiles();

  if (pendingHandleIdx != null) {
    document.querySelector(`.drag-handle[data-idx="${pendingHandleIdx}"]`)?.focus();
    pendingHandleIdx = null;
  }

  wireFonteStrip();

  // Depois do re-render o foco cai no <body>. Varredura, e nunca uma string de
  // seletor: nome de fonte é texto livre, e uma aspa ou colchete quebraria o
  // querySelector. preventScroll porque o foco arrastaria a faixa e desfaria o
  // scrollLeft que o restoreUI acabou de devolver.
  if (pendingFonte != null) {
    const alvo = pendingFonte === PENDING_TODAS
      ? [...document.querySelectorAll('.fpill')].find((el) => el.classList.contains('todas'))
      : [...document.querySelectorAll('.fpill')].find((el) => el.dataset.id === pendingFonte);
    alvo?.focus({ preventScroll: true });
    pendingFonte = null;
  }

  if (S.screen === 'list') {
    const rows = document.querySelector('.rows');
    if (rows?.querySelector('.drag-handle')) {
      wireListDrag(rows, { onReorder: (from, to) => { focusHandle(to); applyReorder(from, to); } });
    }
  }

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
  // Trocar de música ESTANDO na tela de toque precisa do mesmo desmonte que
  // sair dela: sem isto ficam para trás o transporte tocando, os timers de
  // rolagem e de controles vivos, e a mídia da anterior carregada. Era latente
  // enquanto duplicateInKey era o único caminho; a gaveta e as setas o tornam
  // o caminho de todo dia.
  if (S.screen === 'play') leavePlay();
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
//
// Enquanto a cifra está transposta, `name` é o nome TRANSPOSTO — gravar aqui
// persistiria digitacoes[nome-transposto] na música ORIGINAL: uma digitação
// para um acorde que ela nem tem no seu próprio tom. A regra é que fingering
// vira somente-leitura enquanto transposto; o catálogo continua valendo (ver
// os quatro dict = S.transpose ? ... de render/play.js).
async function applyShapeToSong(song, name, s) {
  if (S.transpose) { toast(t('play.tom.noEditWhileTransposed')); return; }
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
// A porta 'song' é a mesma que applyShapeToSong guarda: st.name é o nome
// TRANSPOSTO enquanto a cifra está transposta, e song é o registro ORIGINAL —
// gravar aqui persistiria a mesma entrada errada que a outra porta recusa. O
// draft não passa por isto: a tela de adicionar/editar não tem transposição.
//
// Devolve false quando a porta 'song' foi recusada, true nos outros dois
// casos (draft, ou 'song' que gravou). O toast NÃO fica aqui dentro — ao
// contrário de applyShapeToSong (cujos dois chamadores não tocam o toast
// depois de chamá-la), ceSave/ceSaveNew sempre disparam o PRÓPRIO toast de
// sucesso logo depois de chamar isto, e ele substituiria (toast() reseta o
// texto e o timer) o aviso de somente-leitura antes de alguém o ler. Devolver
// o sinal e deixar o chamador escolher qual toast mostrar é o que evita a
// corrida.
async function gravarNoDestino(st, shape, varId) {
  const dado = { frets: shape.frets.slice(), ...(shape.barre ? { barre: { ...shape.barre } } : {}), varId };
  if (st.origin.kind === 'draft' && S.draft) {
    S.draft.digitacoes = { ...(S.draft.digitacoes || {}), [st.name]: dado };
  } else if (st.origin.kind === 'song') {
    if (S.transpose) return false;
    const song = songById(st.origin.songId);
    if (song) {
      song.cifra = song.cifra || {};
      song.cifra.digitacoes = { ...(song.cifra.digitacoes || {}), [st.name]: dado };
      await saveSong(song);
    }
  }
  return true;
}

// ---------- ações ----------
// Uma exclusão de fonte por vez. O confirm() é modal e segura a thread, mas o
// trabalho DEPOIS dele é assíncrono: sem esta guarda, dois cliques em lixeiras
// diferentes rodam concorrentes, e o segundo S.songs = S.songs.filter(...)
// escreve por cima do primeiro sem deixar rastro.
let apagandoFonte = false;

// Mesma guarda, mesmo motivo: duplicateInKey copia áudio no meio de um await, e
// o botão continua clicável durante ele — sem isto dois toques rápidos criam
// duas cópias.
let duplicandoTom = false;

const actions = {
  // navegação
  goHome() { if (S.screen === 'play') leavePlay(); S.screen = 'home'; S.sortMenuOpen = false; update(); },
  goSettings() { S.screen = 'settings'; update(); },
  goAdd() { S.editSongId = null; S.draft = newDraft(null); S.chordEd = null; S.screen = 'addedit'; update(); },
  openArtist(d) { S.artistId = d.id; S.screen = 'artist'; S.artistMenuOpen = false; update(); },
  openEstilo(d) { S.estiloId = d.id; S.screen = 'estilo'; update(); },
  openSong(d) { openSongAction(d.id, d.from || 'home'); },
  goBack() {
    leavePlay();
    const kind = S.navCtx?.kind;
    S.navOpen = false;
    if (kind === 'artist') { S.screen = 'artist'; S.artistMenuOpen = false; }
    else if (kind === 'estilo') S.screen = 'estilo';
    else if (kind === 'list') S.screen = 'list';
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
  // setFonte (mais abaixo) já é dos atalhos do formulário — esta é a da lente.
  toggleFonte(d) {
    S.fonteFilter = calcToggleFonte(S.fonteFilter, d.id, fontesDaBiblioteca(S.songs));
    S.settings.fonteFilter = S.fonteFilter;
    saveSettings();
    pendingFonte = d.id;
    update();
  },
  clearFonte() {
    S.fonteFilter = [];
    S.settings.fonteFilter = [];
    saveSettings();
    pendingFonte = PENDING_TODAS;
    update();
  },
  fonteScrollNext() {
    const sc = document.querySelector('#fonte-strip .fonte-scroll');
    if (sc) sc.scrollBy({ left: Math.round(sc.clientWidth * 0.7), behavior: 'smooth' });
  },

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
    toast(t('msg.list.created', { name }));
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
    if (!confirm(t('msg.list.confirmDelete', { name: l.nome }))) return;
    S.lists = S.lists.filter((x) => x.id !== l.id);
    DB.deleteList(l.id);
    actions.backToLists();
  },
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
    if (!confirm(t('msg.song.confirmDelete', { title: song.title }))) return;
    leavePlay();
    await deleteSong(song.id);
    // Apagar a última música de uma fonte pequena não deixa pílula nenhuma
    // marcada — a mesma poda do apagar-em-lote, aqui pro apagar avulso.
    podarFonteFilter();
    S.screen = 'home';
    update();
    toast(t('msg.song.deleted'));
  },
  toggleChordFav(d) {
    const id = S.currentSongId;
    const cur = S.chordFavs[id] || [];
    S.chordFavs[id] = cur.includes(d.id) ? cur.filter((x) => x !== d.id) : [...cur, d.id];
    update();
  },
  openChordPicker(d) { S.chordPicker = d.id; S.chordEd = null; S.chordPop = null; update(); },
  closeChordPicker() { S.chordPicker = null; S.chordEd = null; update(); },
  // ---- popover do tom (spec 2026-08-16) ----
  openTomPop(d, ev, el) {
    if (S.tomPop) { S.tomPop = null; update(); return; }
    const r = el.getBoundingClientRect();
    const sc = document.querySelector('[data-autoscroll]');
    S.tomPop = {
      anchor: { x: r.left, y: r.top, w: r.width, h: r.height },
      scrollTop: sc ? sc.scrollTop : 0,   // rolagem REAL fecha, igual ao chord-pop
    };
    update();
  },
  closeTomPop() { S.tomPop = null; update(); },
  transposeBy(d) {
    S.transpose = (((S.transpose + Number(d.id)) % 12) + 12) % 12;
    update();
  },
  setTom(d) {
    const song = currentSong();
    if (!song) return;
    const n = semitonsEntre(tomAtual(song).base, d.id);
    if (n !== null) S.transpose = n;
    update();
  },
  resetTom() { S.transpose = 0; update(); },
  async duplicateInKey() {
    if (duplicandoTom) return;
    const song = currentSong();
    if (!song || !S.transpose) return;
    duplicandoTom = true;
    try {
      const { base } = tomAtual(song);
      const tomNovo = tomDeSemitons(base, S.transpose) || '';
      const novoId = await duplicarMusicaNoTom(song, S.transpose, base);
      S.tomPop = null;
      S.transpose = 0;
      toast(t('play.tom.duplicated', { tom: tomNovo }));
      // openSongAction (não goSong+update): a cópia tem blobId PRÓPRIO nos
      // stems/imagens, mas media.songId e media.urls (render/play.js) ainda
      // apontam para os bytes da ORIGINAL até loadSongMedia rodar. Sem isto o
      // mixer da cópia toca os bytes certos por coincidência (blobId igual
      // quando a cópia deu certo) e passa a apontar para bytes apagados assim
      // que a original for excluída.
      await openSongAction(novoId, S.navCtx?.kind);
    } catch (e) {
      toast(t('play.tom.duplicateFailed'));
    } finally {
      duplicandoTom = false;
    }
  },
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
  incSpeed() { S.scrollSpeed = clampSpeed(S.scrollSpeed + 1); patchSpeed(); },
  decSpeed() { S.scrollSpeed = clampSpeed(S.scrollSpeed - 1); patchSpeed(); },

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
    // upsertVar e applyVarToSongs continuam mesmo transposto: o catálogo não é
    // por música, e o nome na tela (transposto ou não) é o que o usuário
    // desenhou — só a gravação NESTA música (gravarNoDestino) é que recusa.
    upsertVar(st.name, { id: st.origin.varId, ...shape });
    const n = await applyVarToSongs(st.name, st.origin.varId, shape);
    const gravou = await gravarNoDestino(st, shape, st.origin.varId);
    S.chordEd = null;
    update();
    if (!gravou) { toast(t('play.tom.noEditWhileTransposed')); return; }
    toast(n
      ? t(n === 1 ? 'msg.chordbook.variantUpdatedOne' : 'msg.chordbook.variantUpdatedMany', { count: n })
      : t('msg.chordbook.variantUpdated'));
  },
  async ceSaveNew() {   // salvar como variação nova (reaproveitando forma idêntica)
    syncCE();
    const st = S.chordEd;
    const shape = editorShape(st);
    const igual = findShape(st.name, shape.frets, shape.barre);
    const varId = igual ? igual.id : upsertVar(st.name, { ...shape, label: st.label || suggestLabel(st, labelsOf(st.name)) });
    const gravou = await gravarNoDestino(st, shape, varId);
    S.chordEd = null;
    update();
    if (!gravou) { toast(t('play.tom.noEditWhileTransposed')); return; }
    toast(igual ? t('msg.chordbook.shapeExists') : t('msg.chordbook.variantSaved'));
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
      // Editar a fonte da última música que a tinha esvazia aquela pílula do
      // mesmo jeito que apagar a música esvaziaria — mesma poda.
      podarFonteFilter();
      S.screen = 'home';
      update();
      toast(t('msg.song.saved', { title: song.title }));
    } catch (e) {
      toast(e.message || t('msg.song.saveFailed'));
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
  toggleExportAll() {
    // null = todas. Marcada, desmarca tudo; desmarcada ou parcial, marca tudo.
    S.exportFontes = S.exportFontes === null ? [] : null;
    update();
  },
  toggleExportFonte(d) {
    const todas = fontesDaBiblioteca(S.songs).map((f) => f.nome);
    const atual = S.exportFontes === null ? todas : S.exportFontes;
    const prox = atual.includes(d.id) ? atual.filter((x) => x !== d.id) : [...atual, d.id];
    // Remarcar tudo volta para o sentinela: sem isso "todas" teria duas
    // representações, e o nome do arquivo não voltaria a ser somaplay-backup-*.
    S.exportFontes = todas.every((x) => prox.includes(x)) ? null : prox;
    update();
  },
  // A remarcação reconstrói a partir de PARTES_TODAS para a ordem do array ser
  // sempre a canônica — assim o `partes` gravado no arquivo não depende da
  // ordem em que as caixas foram clicadas.
  toggleExportParte(d) {
    S.exportPartes = S.exportPartes.includes(d.id)
      ? S.exportPartes.filter((p) => p !== d.id)
      : [...PARTES_TODAS.filter((p) => p === d.id || S.exportPartes.includes(p))];
    update();
  },
  toggleExportListas() { S.exportListas = !S.exportListas; update(); },
  // Apaga todas as músicas de uma fonte. O motor recebe ids: aqui só se traduz
  // o eixo, se confirma e se reconcilia o que ficou apontando para o vazio.
  async deleteFonteAsk(d) {
    if (apagandoFonte) return;
    const ids = songIdsDasFontes(S.songs, [d.id]);
    if (!ids.size) return;
    const n = ids.size;
    // O nome vai CRU no confirm(): diálogo nativo é texto puro, e um esc()
    // aqui faria aparecer &quot; na tela. No aria-label da lixeira é o oposto.
    const name = d.id === SEM_FONTE ? t('home.fonte.none') : d.id;
    const song = t(n === 1 ? 'common.song' : 'common.songs');
    if (!confirm(t('msg.fonte.confirmDelete', { count: n, song, name }))) return;
    apagandoFonte = true;
    try {
      toast(t('msg.fonte.deleting'));
      await deleteSongs(ids, { manterEmListas: true });
      // Os ids ficam nas listas de propósito: reimportar esta fonte depois cura
      // o repertório sozinho, que é o principal motivo de apagar por fonte.
      //
      // Duas coisas guardam GRAFIA de fonte e podem estar apontando para a que
      // acabou de sumir. A seleção do export volta para "todas", como no
      // import; a seleção da lente é podada — a mesma regra do boot e do
      // import, aqui a biblioteca é quem mudou por baixo dela.
      S.exportFontes = null;
      podarFonteFilter();
      update();
      toast(t('msg.fonte.deleted', { name, count: n, song }));
    } catch (e) {
      update();
      toast(t('msg.fonte.deleteFailed', { error: e.message }));
    } finally {
      apagandoFonte = false;
    }
  },
  async exportBackup() {
    const fontes = S.exportFontes;
    const partes = S.exportPartes;
    const sel = {
      songIds: fontes?.length ? songIdsDasFontes(S.songs, fontes) : null,
      listIds: S.exportListas ? null : new Set(),
    };
    const fileName = nomeDoExport(
      recorteDeFontes(fontes, t('settings.export.fileMulti')),
      stampDeHoje(),
      partes,
      { cifras: t('share.word.cifras'), audio: t('share.word.audio') },
    );
    toast(t('msg.backup.exporting'));
    try { baixaArquivo(await exportLibrary({ ...sel, partes, fileName })); toast(t('msg.backup.exported')); }
    catch (e) { toast(t('msg.backup.exportFailed', { error: e.message })); }
  },
  toggleArtistMenu() { S.artistMenuOpen = !S.artistMenuOpen; update(); },

  // O ⋯ traduz o seu eixo em ids e entrega ao motor, que não sabe o que é lista
  // nem artista. listIds é o que impede que os outros repertórios do usuário
  // viajem junto para o amigo — e um artista não leva lista nenhuma.
  //
  // O artista passa pela LENTE, porque a tela do artista passa
  // (artist.js:10): sem isso a tela mostra 3 músicas com o T2 ligado e a folha
  // se oferece para mandar 40. A lista, não — listas ignoram a lente por
  // desenho, e musicasPresentes já é exatamente o que aquela tela desenha.
  async openShare(d) {
    const daLista = d.id === 'list';
    const l = daLista ? listById(S.openListId) : null;
    const a = daLista ? null : artistById(S.artistId);
    if (daLista && !l) return;
    if (!daLista && !a) return;
    const songIds = daLista
      ? new Set(musicasPresentes(l))
      : new Set(songsOfArtist(a.id).filter(matchesLens).map((s) => s.id));
    S.shareSheet = {
      titulo: daLista ? l.nome : a.name,
      songIds,
      listIds: daLista ? new Set([l.id]) : new Set(),
      opcao: 'cifras',
      tamanhos: null,
    };
    S.listMenuOpen = false;
    S.artistMenuOpen = false;
    update();
    // Os números chegam depois: medir são ~4 handles por música, e a folha não
    // pode esperar por eles para abrir.
    const songs = [...songIds].map(songById).filter(Boolean);
    const tam = await calculaTamanhos(songs);
    // Identidade pela referência do Set, não pelo título: abrir duas folhas
    // seguidas com o mesmo nome faria a medição da primeira sobrescrever a
    // segunda.
    if (S.shareSheet && S.shareSheet.songIds === songIds) {
      S.shareSheet.tamanhos = tam;
      update();
    }
  },
  closeShare() { S.shareSheet = null; update(); },
  pickShareOpt(d) { if (S.shareSheet) { S.shareSheet.opcao = d.id; update(); } },
  async doShare() {
    const sh = S.shareSheet;
    if (!sh) return;
    const opt = OPCOES.find((o) => o.id === sh.opcao);
    if (!opt) return;
    const fileName = nomeDoExport(sh.titulo, stampDeHoje(), opt.partes, {
      cifras: t('share.word.cifras'), audio: t('share.word.audio'),
    });
    S.shareSheet = null;
    update();
    toast(t('msg.backup.exporting'));
    try {
      if (await entregaArquivo(await exportLibrary({ songIds: sh.songIds, listIds: sh.listIds, partes: opt.partes, fileName }))) {
        toast(t('msg.backup.exported'));
      }
    } catch (e) { toast(t('msg.backup.exportFailed', { error: e.message })); }
  },
  importBackup() { S.importMode = 'replace'; document.getElementById('file-backup').click(); },
  importBackupMerge() { S.importMode = 'merge'; document.getElementById('file-backup').click(); },
  async importSamples() {
    try {
      const done = await importSamples();
      update();
      toast(done.length ? t('msg.samples.imported', { items: done.join(' · ') }) : t('msg.samples.alreadyImported'));
    } catch (e) { toast(t('msg.samples.importFailed', { error: e.message })); }
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
  cbSetDefault(d, ev, el) { setDefault(d.id, el.dataset.var); update(); toast(t('msg.chordbook.defaultUpdated')); },
  cbDeleteVar(d, ev, el) {
    const id = el.dataset.var;
    const s = shapeById(d.id, id);
    if (!s) return;
    if (!confirm(t('msg.chordbook.confirmDeleteVariant', { label: s.label || t('msg.chordbook.variantFallbackLabel'), chord: d.id }))) return;
    removeVar(d.id, id);
    S.chordEd = null;
    update();
  },
  cbRestore(d) { restoreBuiltins(d.id); update(); toast(t('msg.chordbook.builtinsRestored')); },
  cbStartAdd() { S.cbAdding = true; S.chordEd = null; update(); },
  cbCancelAdd() { S.cbAdding = false; update(); },
  cbConfirmAdd() {
    const inp = document.getElementById('cb-new-name');
    const nome = inp ? inp.value.trim() : '';
    if (!nome) return;
    if (!isChordTok(nome)) { toast(t('msg.chordbook.invalidChordName')); return; }
    S.cbAdding = false;
    S.cbQuery = nome;
    S.cbFilter = null;   // senão o chip de tônica pode esconder o acorde recém-criado
    S.chordEd = openEditor(nome, null, { kind: 'book', varId: null });
    update();
  },
};

// Posição VISÍVEL da alça que deve receber o foco depois do próximo render —
// o mesmo espaço do data-idx que o seletor lá em cima procura.
let pendingHandleIdx = null;
function focusHandle(idx) { pendingHandleIdx = idx; }

// Id da fonte cuja pílula deve receber o foco depois do próximo render —
// mesmo padrão do pendingHandleIdx acima. A pílula "Todas" não tem data-id (não
// é uma fonte de verdade), então usa este sentinela em vez de uma grafia — um
// Symbol nunca colide com o que dataset.id devolve, que é sempre string.
let pendingFonte = null;
const PENDING_TODAS = Symbol('todas');

// Reordena e re-renderiza uma única vez. Usado pelo teclado e pelo arraste.
// AMBOS falam em POSIÇÃO VISÍVEL, porque é isso que o usuário vê e move; a
// tradução para o índice real de l.musicas — que pode ter id órfão, e aí os dois
// espaços se separam — acontece aqui, num lugar só.
function applyReorder(fromVis, toVis) {
  if (S.openListId === '__fav') return; // Favoritas: ordem automática, nunca tem órfão
  const l = listById(S.openListId);
  if (!l) return;
  const idx = indicesPresentes(l);
  const from = idx[fromVis];
  const to = idx[toVis];
  if (from == null || to == null) return;
  reorderInList(S.openListId, from, to);
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
      if (!confirm(t('msg.backup.confirmMerge', { name: f.name }))) return;
    } else if (total > 0) {
      // O aviso precisa do manifest, então ele é lido ANTES do confirm. É só o
      // cabeçalho — alguns KB, não o arquivo.
      let manifest = null;
      try { manifest = (await lerManifest(f)).manifest; }
      catch (e) { toast(t('msg.backup.importFailed', { error: e.message })); return; }
      // O manifest inteiro, porque o aviso das listas depende de o arquivo
      // trazer lista; e o aparelho ter lista, porque não há o que perder quem
      // não tem nenhuma.
      const avisos = avisosDeSubstituir(manifest, { temListas: S.lists.length > 0 })
        .map((k) => t(k)).join('\n');
      const pergunta = t('msg.backup.confirmReplace', { name: f.name, count: total, song: total === 1 ? t('common.song') : t('common.songs') });
      if (!confirm(avisos ? `${avisos}\n\n${pergunta}` : pergunta)) return;
    }
    toast(merge ? t('msg.backup.merging') : t('msg.backup.importing'));
    try {
      const res = await importLibrary(f, { merge });
      // A seleção de export guarda GRAFIAS de fonte, e a biblioteca acabou de
      // mudar por baixo dela — nos dois modos. Voltar para null ("todas") evita
      // que as fontes novas apareçam desmarcadas e, no caso de uma seleção
      // vazia, que o bloco inteiro suma deixando o botão travado sem controle.
      S.exportFontes = null;
      podarFonteFilter();
      applyTheme();
      update();
      toast(merge
        ? t('msg.backup.mergedDone', {
            added: res.added,
            newWord: t(res.added === 1 ? 'msg.backup.mergedNew' : 'msg.backup.mergedNewPlural'),
            updated: res.updated,
            updatedWord: t(res.updated === 1 ? 'msg.backup.mergedUpdated' : 'msg.backup.mergedUpdatedPlural'),
          })
        : t('msg.backup.importedDone', { artists: res.artists, songs: res.songs }));
    } catch (e) { toast(t('msg.backup.importFailed', { error: e.message })); }
  };
}

// ---------- delegação global ----------
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-a]');
  if (t) {
    const name = t.dataset.a;
    if (actions[name]) {
      // scrim fecha só se o clique nasceu fora do conteúdo protegido.
      // Testar `t !== e.target` não serve: o alvo real de um botão com ícone é o
      // <svg> de dentro, então o X do próprio popover seria descartado aqui.
      const stop = e.target.closest('[data-stop]');
      if ((name === 'closePopover' || name === 'toggleMixer' || name === 'closeChordPicker' || name === 'closeShare') && stop && !stop.contains(t)) return;
      actions[name](t.dataset, e, t);
      return;
    }
  }
  // clique fora fecha menus abertos
  if (S.sortMenuOpen && !e.target.closest('.sort-wrap')) { S.sortMenuOpen = false; update(); }
  if (S.imgMenuOpen && !e.target.closest('.menu-wrap')) { S.imgMenuOpen = false; update(); }
  if (S.listMenuOpen && !e.target.closest('.menu-wrap')) { S.listMenuOpen = false; update(); }
  if (S.artistMenuOpen && !e.target.closest('.menu-wrap')) { S.artistMenuOpen = false; update(); }
  if (S.chordPop && !e.target.closest('.chord-pop')) { S.chordPop = null; update(); }
  if (S.tomPop && !e.target.closest('.tom-pop') && !e.target.closest('.tag-tom')) { S.tomPop = null; update(); }
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
    S.settings.defaultSpeed = clampSpeed(t.value);
    const v = document.getElementById('v-speed');
    if (v) v.textContent = S.settings.defaultSpeed;
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
    // A folha cobre a tela inteira — tem prioridade sobre qualquer coisa por
    // baixo dela.
    if (S.shareSheet) { S.shareSheet = null; update(); return; }
    if (S.chordPop) { S.chordPop = null; update(); }
    else if (S.popoverSongId) { S.popoverSongId = null; update(); }
    else if (S.imgMenuOpen || S.sortMenuOpen || S.listMenuOpen || S.artistMenuOpen) {
      S.imgMenuOpen = S.sortMenuOpen = S.listMenuOpen = S.artistMenuOpen = false;
      update();
    }
  }
  // ↑/↓ com foco na alça movem a música uma posição (substitui as setas antigas)
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    const h = document.activeElement?.closest?.('.drag-handle');
    if (h) {
      // data-idx é a posição VISÍVEL, igual à que o arraste entrega: o limite é
      // o número de linhas na tela, não o tamanho de l.musicas.
      const from = +h.dataset.idx;
      const to = from + (e.key === 'ArrowUp' ? -1 : 1);
      const l = listById(S.openListId);
      if (l && to >= 0 && to < indicesPresentes(l).length) {
        e.preventDefault();
        focusHandle(to);
        applyReorder(from, to);
      }
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
      <div style="font-family:var(--f-title);font-weight:700;font-size:19px;margin-bottom:10px">${esc(t('msg.boot.failedTitle'))}</div>
      <div style="color:var(--muted);font-size:14px;line-height:1.5">${esc((e && e.message) || t('msg.boot.dbFailed'))}</div>
    </div>`;
    return;
  }
  update();
  manageWakeLock();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
