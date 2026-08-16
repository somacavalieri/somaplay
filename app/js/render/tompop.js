// render/tompop.js — popover do tom, ancorado na pílula do cabeçalho. Formato da
// referência do CifraClub: dois passos de meio tom, grade de doze tons em ordem
// alfabética e restaurar.
// Spec: docs/superpowers/specs/2026-08-16-transposicao-design.md
import { S } from '../state.js';
import { I, esc } from '../icons.js';
import { gradeDeTons, semitonsEntre } from '../transpose.js';
import { popPosition } from './chordpop.js';
import { t } from '../i18n.js';

// Estimativas só para o 1º posicionamento do render em string; afterRenderPlay
// re-clampa com o tamanho real medido no DOM, como já faz com o chord-pop.
const W = 320, H = 260;

export function tomPopHTML(song, tom) {
  const tp = S.tomPop;
  if (!tp) return '';
  const vw = window.innerWidth, vh = window.innerHeight;
  const w = Math.min(W, vw - 16);
  const p = popPosition(tp.anchor, w, H, vw, vh);

  const grade = gradeDeTons(tom.base);
  const atual = tom.label;
  const gradeHTML = grade.length ? `<div class="tom-grid">${grade.map((n) => {
    // Comparar por SEMITOM, não por string: a grade só emite o alfabeto
    // canônico, e o campo `tom` guarda o que o usuário escreveu — 'Db' nunca
    // seria igual a 'C#' e a célula não acendia. Nove das vinte e uma grafias
    // aceitas caíam nisso. A fundamental basta: a grade é homogênea em modo.
    const on = atual !== null && semitonsEntre(atual, n) === 0;
    const orig = semitonsEntre(tom.base, n) === 0;
    return `<button class="tom-cell ${on ? 'on' : ''} ${orig && !on ? 'orig' : ''}"
      data-a="setTom" data-id="${esc(n)}"
      ${orig ? `title="${t('play.tom.original')}"` : ''}>${esc(n)}</button>`;
  }).join('')}</div>` : '';

  return `<div class="tom-pop" data-stop="1" style="left:${p.left}px;top:${p.top}px;width:${w}px">
    <div class="nm">${t('play.song.key')} <b>${esc(atual || '—')}</b>${tom.palpite ? ` <span class="guess" title="${t('play.tom.guess')}">?</span>` : ''}</div>
    <div class="tom-steps">
      <button class="btn-ghost sm" data-a="transposeBy" data-id="-1">${t('play.tom.down')}</button>
      <button class="btn-ghost sm" data-a="transposeBy" data-id="1">${t('play.tom.up')}</button>
    </div>
    ${gradeHTML}
    <button class="btn-ghost sm tom-reset" data-a="resetTom" ${S.transpose ? '' : 'disabled'}>${I.undo(16)}${t('play.tom.reset')}</button>
  </div>`;
}
