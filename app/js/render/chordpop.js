// render/chordpop.js — popover ancorado do acorde tocado na cifra (estilo
// CifraClub): mini (nome + diagrama + bolinhas + Variar) e carrossel de formas
// com Aplicar. Spec: docs/superpowers/specs/2026-07-29-popover-de-acorde-na-cifra-design.md
import { S } from '../state.js';
import { I, esc } from '../icons.js';
import { chordSVG } from '../chords.js';
import { pickerShapes } from '../chordbook.js';
import { shapeStripHTML } from './chordeditor.js';

// Posição do card (coordenadas do viewport; o card é position:fixed): centrado
// no acorde, acima quando cabe, abaixo senão, clampado nas bordas. Pura para
// testes em node — não toca o DOM.
export function popPosition(anchor, cardW, cardH, vw, vh, margin = 8, gap = 6) {
  let left = anchor.x + anchor.w / 2 - cardW / 2;
  left = Math.max(margin, Math.min(left, vw - cardW - margin));
  let top = anchor.y - gap - cardH;
  if (top < margin) top = anchor.y + anchor.h + gap;
  top = Math.max(margin, Math.min(top, vh - cardH - margin));
  return { left: Math.round(left), top: Math.round(top) };
}

// Tamanhos estimados só para o 1º posicionamento do render em string;
// afterRenderPlay re-clampa com o tamanho real medido no DOM.
const MINI_W = 180, MINI_H = 232, CAR_W = 420, CAR_H = 264;

export function chordPopHTML(song) {
  const cp = S.chordPop;
  if (!cp) return '';
  const name = cp.name;
  const dict = song.cifra?.digitacoes || null;
  const { shapes, selId } = pickerShapes(name, (dict && dict[name]) || null);
  const vw = window.innerWidth, vh = window.innerHeight;

  if (cp.modo === 'carrossel') {
    const w = Math.min(CAR_W, vw - 16);
    const p = popPosition(cp.anchor, w, CAR_H, vw, vh);
    return `<div class="chord-pop car" style="left:${p.left}px;top:${p.top}px;width:${w}px">
      <div class="nm">${esc(name)}</div>
      <div class="strip-wrap">${shapeStripHTML(name, shapes, cp.selId, 'chordPopSelect', false)}</div>
      <div class="foot">
        <button class="btn-icon xs" data-a="chordPopReset" title="Voltar à forma salva">${I.undo(16)}</button>
        <button class="btn-primary small" data-a="chordPopApply">Aplicar</button>
      </div>
    </div>`;
  }

  const p = popPosition(cp.anchor, MINI_W, MINI_H, vw, vh);
  const dots = shapes.length > 1
    ? `<div class="dots">${shapes.map((s) => `<span class="dot ${s.id === selId ? 'on' : ''}"></span>`).join('')}</div>` : '';
  return `<div class="chord-pop" style="left:${p.left}px;top:${p.top}px">
    <div class="nm">${esc(name)}</div>
    <div class="diag">${chordSVG(name, false, dict)}</div>
    ${dots}
    ${shapes.length
      ? `<button class="btn-ghost sm variar" data-a="chordPopVariar" ${shapes.length > 1 ? '' : 'disabled'}>Variar</button>`
      : '<div class="hint">Sem formas — crie em “Acordes desta música”</div>'}
  </div>`;
}
