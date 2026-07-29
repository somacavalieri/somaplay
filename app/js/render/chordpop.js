// render/chordpop.js — popover ancorado do acorde tocado na cifra (estilo
// CifraClub): mini (nome + diagrama + bolinhas + Variar) e carrossel de formas
// com Aplicar. Spec: docs/superpowers/specs/2026-07-29-popover-de-acorde-na-cifra-design.md

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
