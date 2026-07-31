// render/listdrag.js — reordenação por arraste (mouse + toque), sem dependências.
// A geometria é pura e testada; o wiring de ponteiro vive em wireListDrag.

// Índice de destino para um deslocamento vertical de dy px.
export function dropIndex(from, dy, step, count) {
  const to = from + Math.round(dy / step);
  return Math.max(0, Math.min(count - 1, to));
}

// Quanto a linha idx desliza enquanto a linha `from` viaja até `to`.
export function shiftFor(idx, from, to, step) {
  if (idx === from) return 0;
  if (from < to && idx > from && idx <= to) return -step;
  if (from > to && idx >= to && idx < from) return step;
  return 0;
}

// Número de posição (1-based) exibido na linha idx durante o arraste.
export function posLabel(idx, from, to) {
  if (idx === from) return to + 1;
  if (from < to && idx > from && idx <= to) return idx;
  if (from > to && idx >= to && idx < from) return idx + 2;
  return idx + 1;
}

// Velocidade de autoscroll em px/frame quando o ponteiro entra nas bordas.
export function edgeScroll(y, top, bottom, zone = 80, max = 14) {
  if (y < top + zone) return -Math.round(max * Math.min(1, (top + zone - y) / zone));
  if (y > bottom - zone) return Math.round(max * Math.min(1, (y - (bottom - zone)) / zone));
  return 0;
}
