// render/estilo.js — tela do estilo: lista de músicas (respeitando a lente)
import { S, songsOfEstilo, matchesLens, SEM_ESTILO } from '../state.js';
import { I, esc } from '../icons.js';
import { iniciais } from '../initials.js';
import { songRow, offlineBadge } from './home.js';
import { t } from '../i18n.js';

export function renderEstilo() {
  const e = S.estiloId;
  if (!e) { S.screen = 'home'; return '<div></div>'; }
  const songs = songsOfEstilo(e).filter(matchesLens);
  const label = e === SEM_ESTILO ? t('estilo.none') : e;
  return `<div class="screen">
    <div class="topbar">
      <button class="btn-icon" data-a="goHome" title="${t('common.back')}">${I.back()}</button>
      <div class="avatar md teal">${esc(iniciais(label))}</div>
      <div style="flex:1;min-width:0">
        <div class="page-title" style="line-height:1.1">${esc(label)}</div>
        <div style="color:var(--muted);font-size:13px;margin-top:3px">${songs.length} ${songs.length === 1 ? t('common.song') : t('common.songs')} ${t('common.tapToPlay')}</div>
      </div>
      ${offlineBadge}
    </div>
    <div class="content-scroll tight">
      <div class="rows" style="max-width:840px">
        ${songs.length
          ? songs.map((s) => songRow(s, { showArtist: true, from: 'estilo' })).join('')
          : `<div class="empty"><div class="t">${t('common.nothingInMode')}</div><div class="s">${t('estilo.empty.sub')}</div></div>`}
      </div>
    </div>
  </div>`;
}
