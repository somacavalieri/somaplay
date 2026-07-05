// render/artist.js — tela do artista: lista de músicas (respeitando a lente)
import { S, artistById, songsOfArtist, matchesLens } from '../state.js';
import { I, esc } from '../icons.js';
import { songRow, offlineBadge } from './home.js';

export function renderArtist() {
  const a = artistById(S.artistId);
  if (!a) { S.screen = 'home'; return '<div></div>'; }
  const songs = songsOfArtist(a.id).filter(matchesLens);
  return `<div class="screen">
    <div class="topbar">
      <button class="btn-icon" data-a="goHome" title="Voltar">${I.back()}</button>
      <div class="avatar md ${a.av}">${esc(a.name[0] || '?')}</div>
      <div style="flex:1;min-width:0">
        <div class="page-title" style="line-height:1.1">${esc(a.name)}</div>
        <div style="color:var(--muted);font-size:13px;margin-top:3px">${songs.length} ${songs.length === 1 ? 'música' : 'músicas'} · toque para tocar</div>
      </div>
      ${offlineBadge}
    </div>
    <div class="content-scroll tight">
      <div class="rows" style="max-width:840px">
        ${songs.length
          ? songs.map((s) => songRow(s, { showArtist: false, from: 'artist' })).join('')
          : '<div class="empty"><div class="t">Nada neste modo</div><div class="s">Este artista não tem músicas na categoria selecionada</div></div>'}
      </div>
    </div>
  </div>`;
}
