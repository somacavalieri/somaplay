// render/home.js — Home: abas Artistas · Músicas · Listas + lente de modo + busca
import { S, songsOfArtist, modesOf, matchesLens, artistName, favList, listById, estiloOf, SEM_ESTILO, fontesDaBiblioteca, SEM_FONTE, lensAtiva, musicasPresentes } from '../state.js';
import { I, esc, eqBars } from '../icons.js';
import { t } from '../i18n.js';

const offlineBadge = `<span class="badge-offline">Offline ${I.check()}</span>`;

// O que está recortando a biblioteca agora, em texto puro. Quem imprime no HTML
// escapa: o nome da fonte é conteúdo do usuário e t() não escapa parâmetro.
function filtroAtivoLabel() {
  const partes = S.modeFilter.slice();
  if (S.fonteFilter) partes.push(S.fonteFilter === SEM_FONTE ? t('home.fonte.none') : S.fonteFilter);
  return partes.join(' · ');
}

function artistCards() {
  const q = S.query.trim().toLowerCase();
  const items = S.artists
    .map((a) => {
      const songs = songsOfArtist(a.id);
      const matching = songs.filter(matchesLens);
      return { a, songs, matching };
    })
    .filter(({ a, songs, matching }) =>
      (!q || a.name.toLowerCase().includes(q) || songs.some((s) => s.title.toLowerCase().includes(q))) && matching.length > 0);

  if (!items.length) {
    return `<div class="empty"><div class="t">${S.artists.length ? t('home.empty.noArtistsMode') : t('home.empty.library')}</div>
      <div class="s">${S.artists.length ? t('home.empty.noArtistsModeSub') : t('home.empty.addSongHint')}</div></div>`;
  }
  return `<div class="artist-grid">` + items.map(({ a, songs, matching }) => {
    const label = lensAtiva()
      ? `${matching.length} ${matching.length === 1 ? t('common.song') : t('common.songs')} · ${esc(filtroAtivoLabel())}`
      : `${songs.length} ${songs.length === 1 ? t('common.song') : t('common.songs')}`;
    return `<div class="card-artist" data-a="openArtist" data-id="${a.id}">
      <div class="avatar ${a.av}">${esc(a.name[0] || '?')}</div>
      <div><div class="name">${esc(a.name)}</div><div class="count">${label}</div></div>
    </div>`;
  }).join('') + `</div>`;
}

function estiloCards() {
  const q = S.query.trim().toLowerCase();
  const groups = {};
  S.songs.forEach((s) => {
    if (!matchesLens(s)) return;
    const e = estiloOf(s);
    (groups[e] || (groups[e] = [])).push(s);
  });
  let names = Object.keys(groups);
  if (q) names = names.filter((e) => e.toLowerCase().includes(q) || groups[e].some((s) => s.title.toLowerCase().includes(q) || artistName(s).toLowerCase().includes(q)));
  names.sort((a, b) => ((a === SEM_ESTILO) - (b === SEM_ESTILO)) || a.localeCompare(b, 'pt'));
  if (!names.length) {
    return `<div class="empty"><div class="t">${S.songs.length ? t('home.empty.noStylesMode') : t('home.empty.library')}</div>
      <div class="s">${S.songs.length ? t('home.empty.noSongsMode') : t('home.empty.addSongHint')}</div></div>`;
  }
  return `<div class="artist-grid">` + names.map((e) => {
    const n = groups[e].length;
    const label = e === SEM_ESTILO ? t('estilo.none') : e;
    return `<div class="card-artist" data-a="openEstilo" data-id="${esc(e)}">
      <div class="avatar teal">${esc(label[0] || '?')}</div>
      <div><div class="name">${esc(label)}</div><div class="count">${n} ${n === 1 ? t('common.song') : t('common.songs')}</div></div>
    </div>`;
  }).join('') + `</div>`;
}

function songRow(s, { showArtist = true, from = 'home' } = {}) {
  const modes = modesOf(s);
  const isCur = S.currentSongId === s.id && S.transportPlaying;
  return `<div class="song-row" data-a="openSong" data-id="${s.id}" data-from="${from}">
    ${isCur ? eqBars() : `<div class="play-glyph">${I.play()}</div>`}
    <div class="titles">
      <div class="t">${esc(s.title)}</div>
      ${showArtist ? `<div class="a">${esc(artistName(s))}</div>` : (isCur ? `<div class="now">${t('home.song.playingNow')}</div>` : '')}
    </div>
    <div class="row-actions">
      ${modes.includes('T3') ? `<span class="tag-karaoke" title="${t('home.song.hasKaraoke')}">${I.mic()}</span>` : ''}
      <button class="btn-icon sm ${s.favorita ? 'fav' : 'muted'}" data-a="toggleFav" data-id="${s.id}" title="${t('common.favorite')}">${I.heart(s.favorita)}</button>
      <button class="btn-icon sm muted" data-a="openPopover" data-id="${s.id}" title="${t('home.song.addToList')}">${I.addList()}</button>
    </div>
  </div>`;
}

function songsTab() {
  const q = S.query.trim().toLowerCase();
  const all = S.songs.slice();
  let flat = all.filter((s) => (!q || s.title.toLowerCase().includes(q) || artistName(s).toLowerCase().includes(q)) && matchesLens(s));
  if (S.sort === 'title') flat.sort((a, b) => a.title.localeCompare(b.title, 'pt'));
  else if (S.sort === 'artist') flat.sort((a, b) => artistName(a).localeCompare(artistName(b), 'pt') || a.title.localeCompare(b.title, 'pt'));
  else flat.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const sortLabels = { title: t('home.sort.title'), artist: t('home.sort.artist'), recent: t('home.sort.recent') };
  const menu = S.sortMenuOpen ? `<div class="sort-menu">` + ['title', 'artist', 'recent'].map((k) =>
    `<button class="${S.sort === k ? 'on' : ''}" data-a="setSort" data-id="${k}">${sortLabels[k]} ${S.sort === k ? I.check(16, 2.5) : ''}</button>`).join('') + `</div>` : '';

  const count = t('home.songs.summary', { shown: flat.length, total: all.length, sort: sortLabels[S.sort] })
    + (lensAtiva() ? t('home.songs.filterSuffix', { filter: esc(filtroAtivoLabel()) }) : '');

  const rows = flat.length
    ? flat.map((s) => songRow(s)).join('')
    : `<div class="empty"><div class="t">${t('home.songs.emptyTitle')}</div><div class="s">${t('home.songs.emptySub')}</div></div>`;

  return `<div class="songs-toolbar"><div style="flex:1"></div>
      <div class="sort-wrap"><button class="sort-btn" data-a="toggleSortMenu">${I.sort()} ${sortLabels[S.sort]} ${I.chevD()}</button>${menu}</div>
    </div>
    <div class="count-lbl">${count}</div>
    <div class="rows">${rows}</div>`;
}

function listsTab() {
  const fav = favList();
  const pinned = S.lists.filter((l) => l.fixada).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
  const others = S.lists.filter((l) => !l.fixada).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'));
  const ordered = [fav, ...pinned, ...others];
  const cnt = (n) => `${n} ${n === 1 ? t('common.song') : t('common.songs')}`;

  const creating = S.creatingList ? `
    <div class="creating-bar">
      <span style="color:var(--accent);display:flex">${I.listIcon(20)}</span>
      <input type="text" id="new-list-name" class="input grow" placeholder="${t('home.list.newNamePlaceholder')}">
      <button class="btn-primary small" data-a="confirmCreateList">${t('common.create')}</button>
      <button class="btn-ghost" data-a="cancelCreateList">${t('common.cancel')}</button>
    </div>` : '';

  const rows = ordered.map((l) => {
    const icon = l.sistema ? 'fav' : (l.fixada ? 'pin' : 'plain');
    const iconSvg = l.sistema ? I.heart(true, 22) : (l.fixada ? I.pin(22) : I.listIcon(22));
    return `<div class="list-row ${l.sistema ? 'system' : ''}" data-a="openList" data-id="${l.id}">
      <div class="list-icon ${icon}">${iconSvg}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="font-family:var(--f-title);font-weight:600;font-size:17px">${l.sistema ? esc(t('list.favoritesName')) : esc(l.nome)}</div>
          ${l.sistema ? `<span class="badge-system">${t('common.system')}</span>` : ''}
          ${l.fixada && !l.sistema ? `<span class="pin-ind" title="${t('common.pinned')}">${I.pin()}</span>` : ''}
        </div>
        <div style="color:var(--muted);font-size:13px;margin-top:3px">${cnt(musicasPresentes(l).length)}</div>
      </div>
      ${I.chevR()}
    </div>`;
  }).join('');

  return `<div class="lists-head">
      <div><div class="t">${t('home.lists.title')}</div><div class="s">${t('home.lists.sub', { count: S.lists.length, fav: t('list.favoritesName') })}</div></div>
      <button class="btn-primary" data-a="startCreateList">${I.plus(20, 2.4)}${t('home.lists.new')}</button>
    </div>
    ${creating}
    <div class="rows narrow">${rows}</div>`;
}

export function homeResults() {
  if (S.tab === 'artists') return artistCards();
  if (S.tab === 'songs') return songsTab();
  if (S.tab === 'estilos') return estiloCards();
  return listsTab();
}

// O controle de fonte é um camaleão: ícone quando não filtra nada, pílula com o
// nome e um × quando filtra. O rótulo e o × são botões IRMÃOS, não aninhados —
// a delegação de clique usa closest('[data-a]'), e um <button> dentro de outro
// entregaria o clique errado.
function fonteControl() {
  const ativa = S.fonteFilter;
  const rotuloDe = (nome) => (nome === SEM_FONTE ? t('home.fonte.none') : esc(nome));
  const itens = fontesDaBiblioteca(S.songs);

  const menu = S.fonteMenuOpen ? `<div class="fonte-menu">
      <button class="${ativa ? '' : 'on'}" data-a="clearFonte">
        <span class="nm">${t('home.fonte.all')}</span>${ativa ? '' : I.check(16, 2.5)}</button>
      ${itens.map(({ nome, n }) => {
        const on = !!ativa && nome.toLowerCase() === ativa.toLowerCase();
        return `<button class="${on ? 'on' : ''}" data-a="setFonteFilter" data-id="${esc(nome)}">
          <span class="nm">${rotuloDe(nome)} <em>· ${n}</em></span>${on ? I.check(16, 2.5) : ''}</button>`;
      }).join('')}
    </div>` : '';

  const gatilho = ativa
    ? `<div class="fonte-pill">
        <button class="lbl" data-a="toggleFonteMenu" title="${t('home.fonte.hint')}">${I.tag()}<span>${rotuloDe(ativa)}</span></button>
        <button class="x" data-a="clearFonte" title="${t('home.fonte.clear')}">${I.close(15)}</button>
      </div>`
    : `<button class="chip fonte" data-a="toggleFonteMenu" title="${t('home.fonte.hint')}">${I.tag()}</button>`;

  return `<div class="fonte-wrap">${gatilho}${menu}</div>`;
}

export function renderHome() {
  const isL = S.tab === 'lists';
  const tabsub = isL
    ? t('home.tabsub.lists', { count: S.lists.length })
    : (S.tab === 'artists' ? t('home.tabsub.artists', { count: S.artists.length })
      : S.tab === 'estilos' ? t('home.tabsub.estilos')
      : t('home.tabsub.songs', { count: S.songs.length }));
  const chips = ['T2', 'T3'].map((m) => {
    const on = S.modeFilter.includes(m);
    const cls = m === 'T2' ? 't2' : 't3';
    const label = m === 'T2' ? t('home.mode.t2') : t('home.mode.t3');
    const icon = m === 'T2' ? I.mixer(17) : I.mic(17);
    return `<button class="chip ${cls} ${on ? 'on' : ''}" data-a="toggleLens" data-id="${m}" title="${label}">${icon}</button>`;
  }).join('');

  return `<div class="screen">
    <div class="topbar home">
      <div class="logo">Soma<em>_play</em></div>
      ${offlineBadge}
      <div class="searchbox">${I.search()}<input type="text" id="search-input" placeholder="${t('home.search.placeholder')}" value="${esc(S.query)}"></div>
      <button class="btn-icon" data-a="goSettings" title="${t('settings.title')}">${I.gear()}</button>
    </div>
    <div class="tabrow">
      <div class="segtab">
        <button class="${S.tab === 'artists' ? 'on' : ''}" data-a="setTab" data-id="artists">${I.grid()}${t('home.tabs.artists')}</button>
        <button class="${S.tab === 'songs' ? 'on' : ''}" data-a="setTab" data-id="songs">${I.music()}${t('home.tabs.songs')}</button>
        <button class="${S.tab === 'estilos' ? 'on' : ''}" data-a="setTab" data-id="estilos">${I.disc(18)}${t('home.tabs.styles')}</button>
        <button class="${S.tab === 'lists' ? 'on' : ''}" data-a="setTab" data-id="lists">${I.listIcon()}${t('home.tabs.lists')}</button>
      </div>
      <div class="tabsub">${tabsub}</div>
      <div class="lens ${isL ? 'off' : ''}" title="${isL ? t('home.lens.disabledHint') : t('home.lens.filterHint')}">
        ${I.funnel()}${fonteControl()}${chips}
      </div>
    </div>
    <div class="content-scroll" id="home-results">${homeResults()}</div>
  </div>`;
}

export { songRow, offlineBadge };
