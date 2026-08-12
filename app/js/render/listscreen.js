// render/listscreen.js — tela de uma lista (ordem manual, tocar, remover, renomear...)
import { S, listById, favList, songById, artistName, modesOf, musicasPresentes, qualificadorDe, SEM_FONTE } from '../state.js';
import { I, esc } from '../icons.js';
import { offlineBadge } from './home.js';
import { t } from '../i18n.js';

// Numa lista de show a ambiguidade é pior que na biblioteca: o usuário monta a
// ordem antes de subir no palco e não pode abrir cada música para conferir.
function qualLista(so) {
  const q = qualificadorDe(so, S.songs);
  if (!q) return '';
  const rotulo = q === SEM_FONTE ? t('home.fonte.none') : q;
  return ` <em style="font-style:normal;font-weight:500;font-size:.7em;color:var(--muted)">${esc(rotulo)}</em>`;
}

export function renderListScreen() {
  const isFav = S.openListId === '__fav';
  const l = isFav ? favList() : listById(S.openListId);
  if (!l) { S.screen = 'home'; S.tab = 'lists'; return '<div></div>'; }
  const cnt = (n) => `${n} ${n === 1 ? t('common.song') : t('common.songs')}`;
  const modeLabel = (so) => modesOf(so).includes('T2') ? t('list.modeChartAccomp') : t('list.modeChart');
  const total = musicasPresentes(l).length;
  const iconCls = l.sistema ? 'fav' : (l.fixada ? 'pin' : 'plain');
  const iconSvg = l.sistema ? I.heart(true, 24) : (l.fixada ? I.pin(24) : I.listIcon(24));

  const titleArea = S.renamingList
    ? `<div style="display:flex;align-items:center;gap:8px">
        <input type="text" id="rename-input" class="input" style="height:44px;font-family:var(--f-title);font-weight:600;font-size:18px;min-width:280px;border-color:var(--accent)" value="${l.sistema ? esc(t('list.favoritesName')) : esc(l.nome)}">
        <button class="btn-primary small" data-a="confirmRename">${t('common.save')}</button>
        <button class="btn-ghost" data-a="cancelRename">${t('common.cancel')}</button>
      </div>`
    : `<div style="display:flex;align-items:center;gap:10px">
        <div style="font-family:var(--f-title);font-weight:700;font-size:22px;line-height:1.1">${l.sistema ? esc(t('list.favoritesName')) : esc(l.nome)}</div>
        ${l.fixada && !l.sistema ? `<span class="pin-ind" title="${t('common.pinned')}">${I.pin(16)}</span>` : ''}
        ${l.sistema ? `<span class="badge-system">${t('common.system')}</span>` : ''}
      </div>
      <div style="color:var(--muted);font-size:13px;margin-top:2px">${cnt(total)} ${l.sistema ? t('list.poweredByHearts') : t('list.showOrder')}</div>`;

  const menu = !l.sistema ? `<div class="menu-wrap">
      <button class="btn-icon" data-a="toggleListMenu">${I.dots(22)}</button>
      ${S.listMenuOpen ? `<div class="menu-pop" style="width:218px">
        <button data-a="startRename">${I.pencil()}${t('list.rename')}</button>
        <button data-a="togglePinList">${I.pinStroke()}${l.fixada ? t('list.unpin') : t('list.pinToTop')}</button>
        <button class="danger" data-a="deleteList">${I.trash()}${t('list.deleteList')}</button>
      </div>` : ''}
    </div>` : '';

  const canDrag = !l.sistema && total > 1;

  // ATENÇÃO: l.musicas pode ter id sem música — o export filtrado leva a lista
  // inteira, e o que falta chega quando a outra fonte for importada. Essas linhas
  // não são desenhadas, então POSIÇÃO NA TELA ≠ índice em l.musicas.
  // data-idx carrega a posição VISÍVEL (`pos - 1`), o mesmo espaço em que o
  // arraste conta as linhas; quem traduz para o índice real que moveItem usa é
  // applyReorder(), via indicesPresentes(). `pos` numera 1..n sem buraco.
  let pos = 0;
  const rows = l.musicas.map((id) => {
    const so = songById(id);
    if (!so) return '';
    pos += 1;
    const idx = pos - 1;
    const handle = canDrag
      ? `<button class="drag-handle" data-idx="${idx}" title="${t('list.dragHandle')}"
          aria-label="${t('list.dragHandleAria', { title: esc(so.title), pos, total })}">${I.grip()}</button>`
      : '';
    return `<div class="listsong-row" data-idx="${idx}">
      ${handle}
      <div class="pos-num">${pos}</div>
      <button class="btn-icon sm play-tint" data-a="openSong" data-id="${so.id}" data-from="list" title="${t('list.play')}">${I.play()}</button>
      <div style="flex:1;min-width:0;cursor:pointer" data-a="openSong" data-id="${so.id}" data-from="list">
        <div style="font-family:var(--f-title);font-weight:600;font-size:17px">${esc(so.title)}${qualLista(so)}</div>
        <div style="color:var(--muted);font-size:13px;margin-top:2px">${esc(artistName(so))} ${t('list.opensIn', { mode: modeLabel(so) })}</div>
      </div>
      <button class="btn-icon sm ${so.favorita ? 'fav' : 'muted'}" data-a="toggleFav" data-id="${so.id}" title="${t('common.favorite')}">${I.heart(so.favorita)}</button>
      <button class="btn-icon sm muted danger-h" data-a="removeFromList" data-id="${so.id}" title="${t('list.removeFromList')}">${I.minus()}</button>
    </div>`;
  }).join('');

  return `<div class="screen">
    <div class="topbar">
      <button class="btn-icon" data-a="backToLists" title="${t('common.back')}">${I.back()}</button>
      <div class="list-icon lg ${iconCls}">${iconSvg}</div>
      <div style="flex:1;min-width:0">${titleArea}</div>
      ${menu}
      ${offlineBadge}
    </div>
    <div class="content-scroll tight">
      <div class="rows" style="max-width:860px">
        ${rows || `<div class="empty"><div class="box">${I.listIcon(28)}</div>
          <div class="t">${t('list.empty.title')}</div>
          <div class="s">${t('list.empty.sub')}</div></div>`}
      </div>
    </div>
  </div>`;
}
