// render/estilo.js — tela do estilo: lista de músicas (respeitando a lente)
import { S, songsOfEstilo, matchesLens } from '../state.js';
import { I, esc } from '../icons.js';
import { songRow, offlineBadge } from './home.js';

export function renderEstilo() {
  const e = S.estiloId;
  if (!e) { S.screen = 'home'; return '<div></div>'; }
  const songs = songsOfEstilo(e).filter(matchesLens);
  return `<div class="screen">
    <div class="topbar">
      <button class="btn-icon" data-a="goHome" title="Voltar">${I.back()}</button>
      <div class="avatar md teal">${esc(e[0] || '?')}</div>
      <div style="flex:1;min-width:0">
        <div class="page-title" style="line-height:1.1">${esc(e)}</div>
        <div style="color:var(--muted);font-size:13px;margin-top:3px">${songs.length} ${songs.length === 1 ? 'música' : 'músicas'} · toque para tocar</div>
      </div>
      ${offlineBadge}
    </div>
    <div class="content-scroll tight">
      <div class="rows" style="max-width:840px">
        ${songs.length
          ? songs.map((s) => songRow(s, { showArtist: true, from: 'estilo' })).join('')
          : '<div class="empty"><div class="t">Nada neste modo</div><div class="s">Nenhuma música deste estilo na categoria selecionada</div></div>'}
      </div>
    </div>
  </div>`;
}
