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

const LONG_PRESS_MS = 350;  // segurar a linha para pegar
const CANCEL_TOL = 10;      // mover mais que isso antes do tempo = scroll, não arraste
const HANDLE_TOL = 4;       // pela alça no mouse, arraste começa após este movimento

// Liga o arraste nas linhas filhas de `root`. Chame depois de cada render.
export function wireListDrag(root, { onReorder }) {
  const scroller = root.closest('.content-scroll') || document.scrollingElement;
  let drag = null;    // arraste em curso
  let press = null;   // toque/clique pendente, ainda não virou arraste
  let raf = 0;
  let suppressClick = false;

  const rowsOf = () => [...root.querySelectorAll('.listsong-row')];

  function clearPress() {
    if (press?.timer) clearTimeout(press.timer);
    press = null;
  }

  function paint() {
    const { row, list, from, to, step, dy } = drag;
    // O scale vem junto no transform (e não no CSS) porque o translateY o sobrescreveria.
    row.style.transform = `translateY(${dy}px) scale(1.02)`;
    list.forEach((r, i) => {
      if (r !== row) r.style.transform = `translateY(${shiftFor(i, from, to, step)}px)`;
      const n = r.querySelector('.pos-num');
      if (n) n.textContent = posLabel(i, from, to);
    });
  }

  // dy é medido em coordenadas do conteúdo: o que o ponteiro andou mais o que a lista rolou.
  function recompute() {
    drag.dy = (drag.pointerY - drag.startY) + (scroller.scrollTop - drag.scrollTop0);
    drag.to = dropIndex(drag.from, drag.dy, drag.step, drag.list.length);
    paint();
  }

  function tick() {
    raf = 0;
    if (!drag) return;
    const box = scroller.getBoundingClientRect();
    const v = edgeScroll(drag.pointerY, box.top, box.bottom);
    if (v) {
      const before = scroller.scrollTop;
      scroller.scrollTop += v;
      if (scroller.scrollTop !== before) recompute();
    }
    raf = requestAnimationFrame(tick);
  }

  function start(row, clientY, pointerId) {
    const list = rowsOf();
    const from = list.indexOf(row);
    if (from < 0 || list.length < 2) { clearPress(); return; }
    const h = row.getBoundingClientRect().height;
    const gap = parseFloat(getComputedStyle(root).rowGap) || 0;
    drag = {
      row, list, from, to: from, step: h + gap, dy: 0,
      startY: clientY, pointerY: clientY, scrollTop0: scroller.scrollTop,
    };
    clearPress();
    list.forEach((r) => { if (r !== row) r.classList.add('shifting'); });
    row.classList.add('dragging');
    root.classList.add('dragging-active');
    try { row.setPointerCapture(pointerId); } catch (err) { /* ponteiro já solto */ }
    navigator.vibrate?.(15);
    window.addEventListener('keydown', onKey, true);
    raf = requestAnimationFrame(tick);
  }

  function end(commit) {
    if (!drag) { clearPress(); return; }
    const { row, list, from, to, step } = drag;
    const target = commit ? to : from;
    cancelAnimationFrame(raf); raf = 0;
    window.removeEventListener('keydown', onKey, true);
    drag = null;
    suppressClick = true;

    // Assenta a linha no lugar final antes de devolver o controle ao render.
    row.classList.add('settling');
    row.style.transform = `translateY(${(target - from) * step}px)`;
    setTimeout(() => {
      list.forEach((r, i) => {
        r.classList.remove('shifting', 'settling', 'dragging');
        r.style.transform = '';
        const n = r.querySelector('.pos-num');
        if (n) n.textContent = i + 1;
      });
      root.classList.remove('dragging-active');
      if (target !== from) onReorder(from, target);
    }, 180);
  }

  function onKey(e) {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    end(false);
  }

  function onMove(e) {
    if (!drag) {
      if (!press) return;
      const dx = Math.abs(e.clientX - press.x);
      const dy = Math.abs(e.clientY - press.y);
      if (press.viaHandle) {
        if (dy > HANDLE_TOL) start(press.row, press.y, press.pointerId);
      } else if (dx > CANCEL_TOL || dy > CANCEL_TOL) {
        clearPress(); // virou scroll
      }
      return;
    }
    e.preventDefault();
    drag.pointerY = e.clientY;
    recompute();
  }

  function unwire() {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onCancel);
  }

  function onUp() {
    if (drag) end(true);
    else clearPress();
    unwire();
  }

  function onCancel() {
    if (drag) end(false);
    else clearPress();
    unwire();
  }

  root.addEventListener('pointerdown', (e) => {
    if (e.button != null && e.button !== 0) return;
    const row = e.target.closest('.listsong-row');
    if (!row || !root.contains(row)) return;
    suppressClick = false;
    const handle = e.target.closest('.drag-handle');
    // Sem alça na linha = lista de sistema ou lista de uma música: não arrasta.
    if (!row.querySelector('.drag-handle')) return;

    press = { row, x: e.clientX, y: e.clientY, pointerId: e.pointerId, viaHandle: !!handle, timer: null };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);

    if (handle) {
      // No dedo a alça pega na hora; no mouse espera um movimento mínimo.
      if (e.pointerType !== 'mouse') { e.preventDefault(); start(row, e.clientY, e.pointerId); }
      return;
    }
    // Long-press só na área "morta" da linha — botões continuam sendo botões.
    if (e.target.closest('button,[data-a]')) { clearPress(); return; }
    press.timer = setTimeout(() => start(press.row, press.y, press.pointerId), LONG_PRESS_MS);
  });

  // Depois de arrastar, o clique que o navegador dispara não deve abrir a música.
  root.addEventListener('click', (e) => {
    if (!suppressClick) return;
    suppressClick = false;
    e.stopPropagation();
    e.preventDefault();
  }, true);
}
