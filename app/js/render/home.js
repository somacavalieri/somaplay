// render/home.js — Home: abas Artistas · Músicas · Listas + lente de modo + busca
import { S, songsOfArtist, modesOf, matchesLens, artistName, favList, listById } from '../state.js';
import { I, esc, eqBars } from '../icons.js';

const offlineBadge = `<span class="badge-offline">Offline ${I.check()}</span>`;

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
    return `<div class="empty"><div class="t">${S.artists.length ? 'Nenhum artista com esse modo' : 'Biblioteca vazia'}</div>
      <div class="s">${S.artists.length ? 'Nenhum artista tem músicas na categoria selecionada' : 'Adicione músicas em Configurações → Adicionar música'}</div></div>`;
  }
  return `<div class="artist-grid">` + items.map(({ a, songs, matching }) => {
    const label = S.modeFilter.length
      ? `${matching.length} ${matching.length === 1 ? 'música' : 'músicas'} · ${S.modeFilter.join('/')}`
      : `${songs.length} ${songs.length === 1 ? 'música' : 'músicas'}`;
    return `<div class="card-artist" data-a="openArtist" data-id="${a.id}">
      <div class="avatar ${a.av}">${esc(a.name[0] || '?')}</div>
      <div><div class="name">${esc(a.name)}</div><div class="count">${label}</div></div>
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
      ${showArtist ? `<div class="a">${esc(artistName(s))}</div>` : (isCur ? '<div class="now">Tocando agora</div>' : '')}
    </div>
    <div class="row-actions">
      ${modes.includes('T3') ? `<span class="tag-karaoke" title="Tem karaokê">${I.mic()}</span>` : ''}
      <button class="btn-icon sm ${s.favorita ? 'fav' : 'muted'}" data-a="toggleFav" data-id="${s.id}" title="Favoritar">${I.heart(s.favorita)}</button>
      <button class="btn-icon sm muted" data-a="openPopover" data-id="${s.id}" title="Adicionar à lista">${I.addList()}</button>
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

  const sortLabels = { title: 'Título (A–Z)', artist: 'Artista (A–Z)', recent: 'Recém-adicionadas' };
  const menu = S.sortMenuOpen ? `<div class="sort-menu">` + ['title', 'artist', 'recent'].map((k) =>
    `<button class="${S.sort === k ? 'on' : ''}" data-a="setSort" data-id="${k}">${sortLabels[k]} ${S.sort === k ? I.check(16, 2.5) : ''}</button>`).join('') + `</div>` : '';

  const count = `${flat.length} de ${all.length} músicas · ordenado por ${sortLabels[S.sort]}${S.modeFilter.length ? ' · filtro: ' + S.modeFilter.join(', ') : ''}`;

  const rows = flat.length
    ? flat.map((s) => songRow(s)).join('')
    : `<div class="empty"><div class="t">Nenhuma música encontrada</div><div class="s">Ajuste a busca ou os filtros de modo</div></div>`;

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
  const cnt = (n) => `${n} ${n === 1 ? 'música' : 'músicas'}`;

  const creating = S.creatingList ? `
    <div class="creating-bar">
      <span style="color:var(--accent);display:flex">${I.listIcon(20)}</span>
      <input type="text" id="new-list-name" class="input grow" placeholder="Nome da nova lista...">
      <button class="btn-primary small" data-a="confirmCreateList">Criar</button>
      <button class="btn-ghost" data-a="cancelCreateList">Cancelar</button>
    </div>` : '';

  const rows = ordered.map((l) => {
    const icon = l.sistema ? 'fav' : (l.fixada ? 'pin' : 'plain');
    const iconSvg = l.sistema ? I.heart(true, 22) : (l.fixada ? I.pin(22) : I.listIcon(22));
    return `<div class="list-row ${l.sistema ? 'system' : ''}" data-a="openList" data-id="${l.id}">
      <div class="list-icon ${icon}">${iconSvg}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="font-family:var(--f-title);font-weight:600;font-size:17px">${esc(l.nome)}</div>
          ${l.sistema ? '<span class="badge-system">Sistema</span>' : ''}
          ${l.fixada && !l.sistema ? `<span class="pin-ind" title="Fixada">${I.pin()}</span>` : ''}
        </div>
        <div style="color:var(--muted);font-size:13px;margin-top:3px">${cnt(l.musicas.length)}</div>
      </div>
      ${I.chevR()}
    </div>`;
  }).join('');

  return `<div class="lists-head">
      <div><div class="t">Suas listas</div><div class="s">${S.lists.length} listas + Favoritas</div></div>
      <button class="btn-primary" data-a="startCreateList">${I.plus(20, 2.4)}Nova lista</button>
    </div>
    ${creating}
    <div class="rows narrow">${rows}</div>`;
}

export function homeResults() {
  if (S.tab === 'artists') return artistCards();
  if (S.tab === 'songs') return songsTab();
  return listsTab();
}

export function renderHome() {
  const isL = S.tab === 'lists';
  const tabsub = isL
    ? `${S.lists.length} listas · lente de modo inativa`
    : (S.tab === 'artists' ? `${S.artists.length} artistas na biblioteca` : `${S.songs.length} músicas na biblioteca`);
  const chips = ['T2', 'T3'].map((m) => {
    const on = S.modeFilter.includes(m);
    const cls = m === 'T2' ? 't2' : 't3';
    const label = m === 'T2' ? 'Acompanhamento' : 'Karaokê';
    const icon = m === 'T2' ? I.mixer(17) : I.mic(17);
    return `<button class="chip ${cls} ${on ? 'on' : ''}" data-a="toggleLens" data-id="${m}" title="${label}">${icon}</button>`;
  }).join('');

  return `<div class="screen">
    <div class="topbar home">
      <div class="logo">Soma<em>_play</em></div>
      ${offlineBadge}
      <div class="searchbox">${I.search()}<input type="text" id="search-input" placeholder="Buscar artista ou música" value="${esc(S.query)}"></div>
      <button class="btn-icon" data-a="goSettings" title="Configurações">${I.gear()}</button>
    </div>
    <div class="tabrow">
      <div class="segtab">
        <button class="${S.tab === 'artists' ? 'on' : ''}" data-a="setTab" data-id="artists">${I.grid()}Artistas</button>
        <button class="${S.tab === 'songs' ? 'on' : ''}" data-a="setTab" data-id="songs">${I.music()}Músicas</button>
        <button class="${S.tab === 'lists' ? 'on' : ''}" data-a="setTab" data-id="lists">${I.listIcon()}Listas</button>
      </div>
      <div class="tabsub">${tabsub}</div>
      <div class="lens ${isL ? 'off' : ''}" title="${isL ? 'A lente de modo não se aplica a listas — cada música abre no melhor modo' : 'Filtrar por modo'}">
        ${I.funnel()}${chips}
      </div>
    </div>
    <div class="content-scroll" id="home-results">${homeResults()}</div>
  </div>`;
}

export { songRow, offlineBadge };
