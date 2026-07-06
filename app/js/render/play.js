// render/play.js — Tela Cifra (T1 + T2 unificado) + visão Karaokê
// Cifra por texto ou imagem · rolagem automática · acordes/diagramas/fixados
// mixer (stems + versão completa) · transporte global
import { S, currentSong, artistName, audio, persistCurrentStems, saveSong } from '../state.js';
import { DB } from '../db.js';
import { I, esc, fmtTime } from '../icons.js';
import { parseCifraText, extractChords, chordSVG } from '../chords.js';
import { catalogShapes } from '../chords-catalog.js';
import { offlineBadge } from './home.js';

// -------- mídia da música atual (blob URLs, cache por música) --------
const media = { songId: null, urls: new Map(), parsed: null, parsedFor: null };

export async function loadSongMedia(song) {
  // revoga URLs da música anterior (áudio é revogado pelo engine)
  if (media.songId !== song.id) {
    for (const [, u] of media.urls) URL.revokeObjectURL(u);
    media.urls.clear();
    media.songId = song.id;
    media.parsed = null;
    media.parsedFor = null;
  }
  const need = [];
  (song.cifra?.imagens || []).forEach((im) => { if (im.blobId && !media.urls.has(im.blobId)) need.push(im.blobId); });
  for (const id of need) {
    const u = await DB.blobURL(id);
    if (u) media.urls.set(id, u);
  }
  // carrega o áudio no motor
  const stems = [];
  for (const st of song.stems || []) {
    stems.push({ id: st.id, blobURL: st.blobId ? await DB.blobURL(st.blobId) : null });
  }
  const fulls = [];
  for (const f of song.full || []) {
    fulls.push({ id: f.id, blobURL: f.blobId ? await DB.blobURL(f.blobId) : null });
  }
  await audio.load(stems, fulls, { source: S.t2Source, channels: song.stems || [] });
  audio.setChannels(song.stems || []);
  audio.setMaster(S.settings.masterVol / 100);
}

export function unloadSongMedia() {
  for (const [, u] of media.urls) URL.revokeObjectURL(u);
  media.urls.clear();
  media.songId = null;
  audio.unload();
}

function parsedCifra(song) {
  if (media.parsedFor === song.id && media.parsed) return media.parsed;
  media.parsed = parseCifraText(song.cifra?.texto || '');
  media.parsedFor = song.id;
  return media.parsed;
}

// -------- blocos --------
function chordsGridHTML(song, chordNames) {
  if (!chordNames.length) return '';
  const favs = S.chordFavs[song.id] || [];
  const dict = song.cifra?.digitacoes || null;
  const cards = chordNames.map((n) => {
    const f = favs.includes(n);
    return `<div class="chord-card ${f ? 'pinned' : ''}">
      <div class="nm"><span>${esc(n)}</span><button class="star-btn ${f ? 'on' : ''}" data-a="toggleChordFav" data-id="${esc(n)}" title="Fixar acorde no topo">${I.star(f)}</button></div>
      <button class="chord-diag" data-a="openChordPicker" data-id="${esc(n)}" title="Trocar variação">${chordSVG(n, false, dict)}</button>
    </div>`;
  }).join('');
  return `<div class="chords-block" data-nopan="1">
    <div class="hd"><span style="color:var(--accent);display:flex">${I.gridChord()}</span>
      <div class="t">Acordes desta música</div><div class="n">${chordNames.length}</div></div>
    <div class="chords-grid">${cards}</div>
    <div class="chords-hint"><span style="display:flex;color:var(--muted3)">${I.star(false, 13)}</span>Toque a estrela para fixar o acorde na barra do topo</div>
  </div>`;
}

function pinnedBarHTML(song, chordNames) {
  const favs = (S.chordFavs[song.id] || []).filter((n) => chordNames.includes(n));
  if (!favs.length || S.viewMode === 'karaoke') return '';
  const dict = song.cifra?.digitacoes || null;
  const strip = S.pinnedOpen ? `<div class="strip">` + favs.map((n) =>
    `<div class="chord-mini"><div class="nm"><span>${esc(n)}</span><button class="star-btn on" data-a="toggleChordFav" data-id="${esc(n)}" title="Desafixar">${I.star(true)}</button></div>
     <div>${chordSVG(n, true, dict)}</div></div>`).join('') + `</div>` : '';
  return `<div class="pinnedbar" data-nopan="1">
    <div class="bar">
      <span style="color:var(--accent);display:flex">${I.starSmall()}</span>
      <div class="lbl">Acordes fixados</div><div class="cnt">${favs.length}</div>
      <button class="toggle" data-a="togglePinnedBar">${S.pinnedOpen ? 'Esconder ' + I.chevU() : 'Mostrar ' + I.chevD()}</button>
    </div>${strip}
  </div>`;
}

function cifraTextHTML(song) {
  const parsed = parsedCifra(song);
  const zoom = S.settings.cifraZoom / 100;
  const lines = parsed.map((ln) => {
    let h = '';
    if (ln.isSection) h += `<div class="sec">${esc(ln.section)}</div>`;
    if (ln.hasChords) h += `<div class="ch">${esc(ln.chords)}</div>`;
    if (ln.hasLyric) h += `<div class="ly">${esc(ln.lyric)}</div>`;
    return h;
  }).join('');
  const chordNames = song.cifra?.acordes?.length ? song.cifra.acordes : extractChords(parsed);
  return `<div class="cifra-scroll" data-autoscroll="1">
    <div class="cifra-text" style="font-size:${Math.round(20 * zoom)}px">${lines || '<div class="ly" style="color:var(--muted)">Sem cifra em texto.</div>'}</div>
    ${chordsGridHTML(song, chordNames)}
  </div>`;
}

function cifraImageHTML(song) {
  const imgs = song.cifra?.imagens || [];
  let variant = S.imgVariant;
  if (!imgs.some((i) => i.tipo === variant)) variant = imgs[0] ? imgs[0].tipo : 'aberta';
  const cur = imgs.find((i) => i.tipo === variant) || imgs[0];
  const url = cur ? media.urls.get(cur.blobId) : null;
  const chordNames = song.cifra?.acordes || [];
  return `<div class="cifra-imgwrap" data-autoscroll="1" data-imgscroll="1">
    <div class="inner">
      ${url ? `<img src="${url}" alt="Cifra" draggable="false" class="${S.imgInvert ? 'inverted' : ''}">` : '<div style="padding:60px;color:var(--muted)">Imagem não encontrada</div>'}
      ${chordNames.length ? `<div class="chords-under-img" data-nopan="1">${chordsGridHTML(song, chordNames)}</div>` : ''}
    </div>
  </div>`;
}

function karaokeHTML(song) {
  const verses = (song.letra || '').replace(/\r\n?/g, '\n').split(/\n{2,}/).map((v) => v.split('\n').filter(Boolean));
  return `<div class="cifra-scroll" data-autoscroll="1">
    <div class="karaoke">
      ${verses.map((v, i) => `<div class="verse ${i === 0 ? 'cur' : ''}">${v.map((l) => `<div>${esc(l)}</div>`).join('')}</div>`).join('')
        || '<div style="color:var(--muted)">Sem letra cadastrada.</div>'}
    </div>
  </div>`;
}

function mixerHTML(song) {
  const hasStems = (song.stems || []).length > 0;
  const fulls = song.full || [];
  const hasFull = fulls.length > 0;
  const stemsActive = hasStems && S.t2Source === 'stems';
  const fullActive = fulls.some((f) => f.id === S.t2Source);

  const channels = hasStems ? (`
    <div class="stems-hd">
      <div class="lbl ${stemsActive ? 'on' : ''}">CANAIS SEPARADOS</div>
      ${stemsActive && S.transportPlaying ? `<span style="display:flex;align-items:center;gap:5px"><span class="live-dot"></span><span class="live-lbl">Tocando</span></span>` : ''}
      ${hasStems && fullActive ? `<button class="use-stems" data-a="selectSource" data-id="stems">Usar canais</button>` : ''}
    </div>
    <div class="stems-list ${stemsActive ? '' : 'dim'}">
      ${song.stems.map((c) => `
        <div class="channel">
          <div class="row1">
            <button class="mute-btn ${c.muted ? 'muted' : ''}" data-a="toggleMute" data-id="${c.id}">${c.muted ? I.volOff() : I.volOn()}</button>
            <div style="flex:1">
              <div class="nm ${c.muted ? 'dim' : ''}">${esc(c.name)}</div>
              ${c.muted ? '<div class="st-mute">Mutado</div>'
                : (stemsActive && S.transportPlaying ? '<div class="st-on"><span class="live-dot"></span><span class="live-lbl">Ativo</span></div>' : '')}
            </div>
            <div class="val ${c.muted ? 'muted' : ''}" id="vol-val-${c.id}">${c.vol}%</div>
          </div>
          <input type="range" min="0" max="100" value="${c.vol}" data-in="stemVol" data-id="${c.id}">
        </div>`).join('')}
    </div>`) : '';

  const fullBlock = hasFull ? `
    <div class="fullver ${hasStems ? 'after-stems' : ''}">
      <div class="hd2">${I.disc(18, fullActive)}<div class="t">Versão completa</div><div class="s">música inteira</div></div>
      ${fulls.map((v) => {
        const on = S.t2Source === v.id;
        return `<div class="ver-row ${on ? 'on' : ''}" data-a="selectSource" data-id="${v.id}">
          <div class="ic">${on ? I.pause(18) : I.play(18)}</div>
          <div class="meta"><div class="n">${esc(v.nome)}</div><div class="m">${esc(v.meta || '')}</div></div>
          ${on && S.transportPlaying ? '<span class="amber-live" style="display:flex;align-items:center;gap:5px"><span class="live-dot"></span><span class="live-lbl">Tocando</span></span>' : ''}
        </div>`;
      }).join('')}
    </div>` : '';

  return `
    <div class="mixer-scrim" data-a="toggleMixer"></div>
    <div class="mixer">
      <div class="sheet-handle"><div></div></div>
      <div class="hd">
        <span style="color:var(--teal);display:flex">${I.mixer(20)}</span>
        <div class="t">Mixer</div>
        <div class="sub">${stemsActive ? `${song.stems.length} canais` : 'versão completa'}</div>
        <button class="collapse" data-a="toggleMixer" title="Recolher mixer">${I.chevR(18)}</button>
      </div>
      <div class="body">${channels}${fullBlock}</div>
    </div>`;
}

function transportHTML() {
  return `<div class="transport">
    <button class="btn-play-round" data-a="toggleTransport" id="transport-btn">${S.transportPlaying ? I.pause(26) : I.play(28)}</button>
    <div class="t-pos" id="t-pos">${fmtTime(S.position)}</div>
    <input type="range" min="0" max="${Math.max(1, Math.round(S.duration))}" value="${Math.round(S.position)}" data-in="seek" id="t-range">
    <div class="t-dur" id="t-dur">${fmtTime(S.duration)}</div>
    <div class="t-vdiv"></div>
    <div class="t-vol">${I.volFull()}<input type="range" min="0" max="100" value="${S.settings.masterVol}" data-in="master"></div>
  </div>`;
}

function chordPickerHTML(song) {
  const name = S.chordPicker;
  const dict = song.cifra?.digitacoes || {};
  const atual = dict[name] ? JSON.stringify(dict[name].frets) : null;
  const shapes = catalogShapes(name);
  const opts = shapes.map((s, ix) => {
    const sel = atual && JSON.stringify(s.frets) === atual;
    return `<button class="pick-opt ${sel ? 'sel' : ''}" data-a="pickChordShape" data-id="${esc(name)}" data-ix="${ix}">
      ${chordSVG(name, false, { [name]: s })}
      <span class="lbl">${esc(s.label || ('variação ' + (ix + 1)))}</span>
    </button>`;
  }).join('');
  return `<div class="scrim" data-a="closeChordPicker">
    <div class="popover" data-stop="1">
      <div class="head"><div class="head-row"><div class="title">Variações de ${esc(name)}</div>
        <button class="btn-icon xs" data-a="closeChordPicker">${I.close()}</button></div></div>
      <div class="body pick-grid">${opts || '<div style="padding:14px;color:var(--muted);font-size:13px">Só a forma atual — edite as casas em “Editar música”.</div>'}</div>
    </div>
  </div>`;
}

// -------- tela --------
export function renderPlay() {
  const song = currentSong();
  if (!song) { S.screen = 'home'; return '<div></div>'; }
  const isImg = S.viewMode === 'cifra' && song.cifra?.fonte === 'imagem';
  const isKar = S.viewMode === 'karaoke';
  const hasKaraoke = !!(song.letra && song.letra.trim());
  const hasMixer = (song.stems || []).length > 0 || (song.full || []).length > 0;
  const imgs = song.cifra?.imagens || [];
  const variantEnabled = imgs.some((i) => i.tipo === 'aberta') && imgs.some((i) => i.tipo === 'fechada');
  const chordNames = song.cifra?.fonte === 'imagem'
    ? (song.cifra?.acordes || [])
    : (song.cifra?.acordes?.length ? song.cifra.acordes : extractChords(parsedCifra(song)));

  const modeSwitch = hasKaraoke ? `<div class="mode-switch">
      <button class="${!isKar ? 'on' : ''}" data-a="setViewMode" data-id="cifra">${I.cifraLines()}Cifra</button>
      <button class="${isKar ? 'on' : ''}" data-a="setViewMode" data-id="karaoke">${I.mic(16)}Karaokê</button>
    </div>` : '';

  const zoomCtl = isImg ? `<div class="zoom-ctl">
      <button data-a="imgZoomOut" title="Diminuir zoom">−</button>
      <div class="pct" id="zoom-pct">${Math.round(S.imgZoom * 100)}%</div>
      <button data-a="imgZoomIn" title="Aumentar zoom">+</button>
    </div>` : '';

  const menu = S.imgMenuOpen ? `<div class="menu-pop">
      <button data-a="menuFav"><span style="display:flex;color:${song.favorita ? 'var(--accent)' : 'var(--muted)'}">${I.heart(song.favorita, 18)}</span><span style="flex:1;text-align:left">Favoritar</span><span class="state ${song.favorita ? 'on' : ''}">${song.favorita ? 'Favoritada' : ''}</span></button>
      <button data-a="menuAddList">${I.addList(18)}<span style="flex:1;text-align:left">Adicionar à lista</span></button>
      <div class="sep"></div>
      ${isImg ? `
        <button data-a="toggleInvert">${I.invert()}<span style="flex:1;text-align:left">Inverter cores</span><span class="state ${S.imgInvert ? 'on' : ''}">${S.imgInvert ? 'Ligado' : 'Desligado'}</span></button>
        <button data-a="toggleVariant" ${variantEnabled ? '' : 'disabled'}>${I.swap()}<span style="flex:1;text-align:left">Formato da cifra</span><span class="state">${S.imgVariant === 'fechada' ? 'Fechada' : 'Aberta'}</span></button>
        <div class="sep"></div>` : ''}
      <button data-a="editSong">${I.pencil()}<span style="flex:1;text-align:left">Editar música</span></button>
      <button class="danger" data-a="deleteSongAsk">${I.trash()}<span style="flex:1;text-align:left">Excluir música</span></button>
    </div>` : '';

  const body = isKar ? karaokeHTML(song) : (isImg ? cifraImageHTML(song) : cifraTextHTML(song));

  const scrollCtl = `<div class="scroll-ctl">
      <button class="pp" data-a="toggleScroll">${S.scrollPlaying ? I.pause(22) : I.play(22)}</button>
      <div class="div"></div>
      <button class="pm" data-a="decSpeed">−</button>
      <div class="mid"><div class="l1">Rolagem automática</div><div class="l2">Velocidade <span id="speed-val">${S.scrollSpeed}</span></div></div>
      <button class="pm" data-a="incSpeed">+</button>
    </div>`;

  return `<div class="screen">
    <div class="play-head">
      <button class="btn-icon" data-a="goBack" title="Voltar">${I.back()}</button>
      <div class="play-title">
        <div class="t">${esc(song.title)}</div>
        <div class="sub">${esc(artistName(song))}${song.tom ? ` <span class="tag-tom">Tom ${esc(song.tom)}</span>` : ''}</div>
      </div>
      ${modeSwitch}
      ${zoomCtl}
      <div class="menu-wrap">
        <button class="btn-icon ${S.imgMenuOpen ? 'accent-on' : ''}" data-a="toggleImgMenu" title="Opções">${I.dots()}</button>
        ${menu}
      </div>
      ${hasMixer ? `<button class="btn-icon ${S.mixerCollapsed ? '' : 'teal-on'}" data-a="toggleMixer" title="${S.mixerCollapsed ? 'Mostrar mixer' : 'Recolher mixer'}">${I.mixer()}</button>` : ''}
      ${offlineBadge}
    </div>
    <div class="play-body">
      <div class="cifra-col">
        ${pinnedBarHTML(song, chordNames)}
        ${body}
        ${scrollCtl}
      </div>
      ${hasMixer && !S.mixerCollapsed ? mixerHTML(song) : ''}
    </div>
    ${hasMixer ? transportHTML() : ''}
    ${S.chordPicker ? chordPickerHTML(song) : ''}
  </div>`;
}

// -------- comportamento pós-render (gestos, autoscroll, relógio) --------
let scrollTimer = null;
let ctlTimer = null;
let mixerWasOpen = false;

export function afterRenderPlay(update) {
  const song = currentSong();
  if (!song) return;

  // relógio do transporte → patch direto no DOM (sem re-render)
  audio.onTime = (pos, dur) => {
    S.position = pos;
    S.duration = dur;
    const p = document.getElementById('t-pos');
    const d = document.getElementById('t-dur');
    const r = document.getElementById('t-range');
    if (p) p.textContent = fmtTime(pos);
    if (d) d.textContent = fmtTime(dur);
    if (r && !r.matches(':active')) {
      r.max = Math.max(1, Math.round(dur));
      r.value = Math.round(pos);
    }
  };
  audio.onEnded = () => { S.transportPlaying = false; update(); };

  // autoscroll
  manageScroll();

  // auto-hide dos controles (via classe CSS, SEM re-render) + gestos da imagem
  const el = document.querySelector('[data-autoscroll]');
  if (el && !el._ctlWired) {
    el._ctlWired = true;
    ['pointerdown', 'pointermove', 'wheel', 'touchstart', 'touchmove'].forEach((ev) =>
      el.addEventListener(ev, showControls, { passive: true }));
    el.addEventListener('scroll', () => { if (!S.scrollPlaying) showControls(); }, { passive: true });
  }
  showControls();

  // anima a entrada do bottom sheet só quando ele acabou de abrir (não a cada re-render)
  const mx = document.querySelector('.mixer');
  if (mx && !mixerWasOpen) mx.classList.add('sheet-enter');
  mixerWasOpen = !!mx;

  setupImgGestures(update);
  applyImgZoom();
}

function showControls() {
  document.querySelectorAll('.scroll-ctl, .zoom-ctl').forEach((c) => c.classList.remove('ctl-hidden'));
  clearTimeout(ctlTimer);
  ctlTimer = setTimeout(hideControls, 3200);
}
function hideControls() {
  if (S.screen !== 'play') return;
  document.querySelectorAll('.scroll-ctl, .zoom-ctl').forEach((c) => c.classList.add('ctl-hidden'));
}

export function manageScroll() {
  const active = S.scrollPlaying && S.screen === 'play';
  if (active && !scrollTimer) {
    scrollTimer = setInterval(() => {
      const el = document.querySelector('[data-autoscroll]');
      if (!el) return;
      // mantém os controles visíveis durante a rolagem (para poder pausar)
      const ctl = document.querySelector('.scroll-ctl');
      if (ctl) { ctl.classList.remove('ctl-hidden'); clearTimeout(ctlTimer); }
      el.scrollTop += S.scrollSpeed * 0.7;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) {
        S.scrollPlaying = false;
        clearInterval(scrollTimer); scrollTimer = null;
        const btn = document.querySelector('.scroll-ctl .pp');
        if (btn) btn.innerHTML = I.play(22);
        showControls();
      }
    }, 30);
  } else if (!active && scrollTimer) {
    clearInterval(scrollTimer); scrollTimer = null;
  }
}

function applyImgZoom() {
  const el = document.querySelector('[data-imgscroll]');
  if (!el) return;
  const img = el.querySelector('img');
  if (!img) return;
  img.style.width = (el.clientWidth * S.imgZoom) + 'px';
  el.querySelector('.inner').style.alignItems = S.imgZoom > 1.001 ? 'flex-start' : 'center';
  const pct = document.getElementById('zoom-pct');
  if (pct) pct.textContent = Math.round(S.imgZoom * 100) + '%';
}

export function zoomBy(d) {
  S.imgZoom = Math.max(0.4, Math.min(4, +(S.imgZoom + d).toFixed(3)));
  applyImgZoom();
}

function imgDist(t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY); }

function setupImgGestures() {
  const el = document.querySelector('[data-imgscroll]');
  if (!el || el._gesturesWired) return;
  el._gesturesWired = true;
  let dragging = false, sx = 0, sy = 0, sl = 0, stp = 0, pinching = false;
  el.addEventListener('pointerdown', (e) => {
    if (pinching) return;
    if (e.target.closest && e.target.closest('[data-nopan]')) return;
    dragging = true; sx = e.clientX; sy = e.clientY; sl = el.scrollLeft; stp = el.scrollTop;
    el.classList.add('grabbing');
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
  });
  el.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    el.scrollLeft = sl - (e.clientX - sx);
    el.scrollTop = stp - (e.clientY - sy);
  });
  const end = () => { dragging = false; el.classList.remove('grabbing'); };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 0.15 : -0.15);
  }, { passive: false });
  let startDist = 0, startZoom = 1;
  el.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) { pinching = true; startDist = imgDist(e.touches); startZoom = S.imgZoom; }
  }, { passive: false });
  el.addEventListener('touchmove', (e) => {
    if (pinching && e.touches.length === 2) {
      e.preventDefault();
      S.imgZoom = Math.max(0.4, Math.min(4, +(startZoom * (imgDist(e.touches) / (startDist || 1))).toFixed(3)));
      applyImgZoom();
    }
  }, { passive: false });
  el.addEventListener('touchend', (e) => { if (e.touches.length < 2) pinching = false; });
}

export function stopPlayTimers() {
  if (scrollTimer) { clearInterval(scrollTimer); scrollTimer = null; }
  clearTimeout(ctlTimer);
  mixerWasOpen = false;
  audio.onTime = null;
  audio.onEnded = null;
}
