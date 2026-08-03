// render/listscreen.js — tela de uma lista (ordem manual, tocar, remover, renomear...)
import { S, listById, favList, songById, artistName, modesOf } from '../state.js';
import { I, esc } from '../icons.js';
import { offlineBadge } from './home.js';
import { t } from '../i18n.js';

export function renderListScreen() {
  const isFav = S.openListId === '__fav';
  const l = isFav ? favList() : listById(S.openListId);
  if (!l) { S.screen = 'home'; S.tab = 'lists'; return '<div></div>'; }
  const cnt = (n) => `${n} ${n === 1 ? t('common.song') : t('common.songs')}`;
  const modeLabel = (so) => modesOf(so).includes('T2') ? t('list.modeChartAccomp') : t('list.modeChart');
  const iconCls = l.sistema ? 'fav' : (l.fixada ? 'pin' : 'plain');
  const iconSvg = l.sistema ? I.heart(true, 24) : (l.fixada ? I.pin(24) : I.listIcon(24));

  const titleArea = S.renamingList
    ? `<div style="display:flex;align-items:center;gap:8px">
        <input type="text" id="rename-input" class="input" style="height:44px;font-family:var(--f-title);font-weight:600;font-size:18px;min-width:280px;border-color:var(--accent)" value="${esc(l.nome)}">
        <button class="btn-primary small" data-a="confirmRename">${t('common.save')}</button>
        <button class="btn-ghost" data-a="cancelRename">${t('common.cancel')}</button>
      </div>`
    : `<div style="display:flex;align-items:center;gap:10px">
        <div style="font-family:var(--f-title);font-weight:700;font-size:22px;line-height:1.1">${esc(l.nome)}</div>
        ${l.fixada && !l.sistema ? `<span class="pin-ind" title="${t('common.pinned')}">${I.pin(16)}</span>` : ''}
        ${l.sistema ? `<span class="badge-system">${t('common.system')}</span>` : ''}
      </div>
      <div style="color:var(--muted);font-size:13px;margin-top:2px">${cnt(l.musicas.length)} ${l.sistema ? t('list.poweredByHearts') : t('list.showOrder')}</div>`;

  const menu = !l.sistema ? `<div class="menu-wrap">
      <button class="btn-icon" data-a="toggleListMenu">${I.dots(22)}</button>
      ${S.listMenuOpen ? `<div class="menu-pop" style="width:218px">
        <button data-a="startRename">${I.pencil()}${t('list.rename')}</button>
        <button data-a="togglePinList">${I.pinStroke()}${l.fixada ? t('list.unpin') : t('list.pinToTop')}</button>
        <button class="danger" data-a="deleteList">${I.trash()}${t('list.deleteList')}</button>
      </div>` : ''}
    </div>` : '';

  const rows = l.musicas.map((id, idx) => {
    const so = songById(id);
    if (!so) return '';
    const last = idx === l.musicas.length - 1;
    return `<div class="listsong-row">
      <div class="updown">
        <button data-a="moveUp" data-id="${idx}" title="${t('list.moveUp')}" ${idx === 0 ? 'disabled' : ''}>${I.chevU()}</button>
        <button data-a="moveDown" data-id="${idx}" title="${t('list.moveDown')}" ${last ? 'disabled' : ''}>${I.chevDn()}</button>
      </div>
      <div class="pos-num">${idx + 1}</div>
      <button class="btn-icon sm play-tint" data-a="openSong" data-id="${so.id}" data-from="list" title="${t('list.play')}">${I.play()}</button>
      <div style="flex:1;min-width:0;cursor:pointer" data-a="openSong" data-id="${so.id}" data-from="list">
        <div style="font-family:var(--f-title);font-weight:600;font-size:17px">${esc(so.title)}</div>
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
