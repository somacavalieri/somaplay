// render/popover.js — popover "Adicionar à lista" (checkbox por lista + nova lista)
import { S, songById, artistName } from '../state.js';
import { I, esc } from '../icons.js';

export function renderPopover() {
  const song = songById(S.popoverSongId);
  if (!song) return '';
  const rows = S.lists.map((l) => {
    const checked = l.musicas.includes(song.id);
    return `<button class="check-row" data-a="popToggleList" data-id="${l.id}">
      <span class="checkbox ${checked ? 'on' : ''}">${checked ? I.check(15) : ''}</span>
      <span class="nm">${esc(l.nome)}</span>
      <span class="ct">${l.musicas.length} ${l.musicas.length === 1 ? 'música' : 'músicas'}</span>
    </button>`;
  }).join('');

  return `<div class="scrim" data-a="closePopover">
    <div class="popover" data-stop="1">
      <div class="head">
        <div class="head-row">
          <div class="title">Adicionar à lista</div>
          <button class="btn-icon xs" data-a="closePopover">${I.close()}</button>
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-top:12px">
          <button class="btn-icon sm ${song.favorita ? 'fav' : 'muted'}" data-a="toggleFav" data-id="${song.id}">${I.heart(song.favorita)}</button>
          <div style="min-width:0">
            <div style="font-family:var(--f-title);font-weight:600;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(song.title)}</div>
            <div style="color:var(--muted);font-size:13px">${esc(artistName(song))} · ${song.favorita ? 'Nas Favoritas' : 'Tocar o coração p/ favoritar'}</div>
          </div>
        </div>
      </div>
      <div class="body">${rows || '<div style="padding:14px;color:var(--muted);font-size:13px;text-align:center">Nenhuma lista ainda — crie a primeira abaixo</div>'}</div>
      <div class="foot">
        <input type="text" id="pop-new-name" class="input grow" placeholder="Nova lista...">
        <button class="btn-primary small" data-a="popCreateList">Criar</button>
      </div>
    </div>
  </div>`;
}
