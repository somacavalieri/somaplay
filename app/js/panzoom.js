// panzoom.js — pinch, drag and wheel, detected in one place.
//
// The chart screen and the book reader both need the same gesture and do
// different things with the number: one resizes an <img>, the other redraws a
// canvas. So this module detects; the caller decides. Copying the block instead
// would mean the next pinch fix lands in only one of the two screens.
export const ZOOM_MIN = 0.4;
export const ZOOM_MAX = 4;

export function clampZoom(z) {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, +(z).toFixed(3)));
}

export function distanciaEntre(touches) {
  return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
}

// Two fingers landing on the same pixel gives distInicial 0; without the guard
// the ratio is Infinity and the zoom freezes until the app is reloaded.
export function escalaDaPinca(zoomInicial, distAtual, distInicial) {
  return clampZoom(zoomInicial * (distAtual / (distInicial || 1)));
}

// Wires an element that SCROLLS (the pan is its scrollLeft/scrollTop).
//
//   getZoom()        → current zoom
//   setZoom(z)       → apply it; the caller redraws or resizes
//   onSwipe(dir)     → optional: -1 previous, +1 next. Only fires at zoom 1,
//                      which is the whole disambiguation: zoomed in, a drag is a
//                      pan and never a page turn.
//   ignorar(target)  → optional: true for controls that must not start a drag
//
// The wheel zooms only with Ctrl held, and plain wheel is left alone: the chart
// screen has always behaved that way, and swallowing plain wheel would take
// scrolling away from every desktop reader.
export function wireGestos(el, { getZoom, setZoom, onSwipe = null, ignorar = () => false }) {
  if (el._gesturesWired) return;
  el._gesturesWired = true;
  let arrastando = false, sx = 0, sy = 0, sl = 0, stp = 0, pincando = false;
  let distInicial = 0, zoomInicial = 1, movimento = 0;

  el.addEventListener('pointerdown', (e) => {
    if (pincando || ignorar(e.target)) return;
    arrastando = true; movimento = 0;
    sx = e.clientX; sy = e.clientY; sl = el.scrollLeft; stp = el.scrollTop;
    el.classList.add('grabbing');
    // Without the capture a drag that leaves the element dies mid-gesture.
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
  });
  el.addEventListener('pointermove', (e) => {
    if (!arrastando || pincando) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    movimento = Math.max(movimento, Math.hypot(dx, dy));
    el.scrollLeft = sl - dx;
    el.scrollTop = stp - dy;
  });
  const solta = (e) => {
    if (!arrastando) return;
    arrastando = false;
    el.classList.remove('grabbing');
    if (!onSwipe || getZoom() > 1.001 || movimento < 60) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > Math.abs(dy) * 1.5) onSwipe(dx < 0 ? 1 : -1);
  };
  el.addEventListener('pointerup', solta);
  el.addEventListener('pointercancel', () => { arrastando = false; el.classList.remove('grabbing'); });

  el.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    setZoom(clampZoom(getZoom() + (e.deltaY < 0 ? 0.15 : -0.15)));
  }, { passive: false });

  el.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      pincando = true; arrastando = false; el.classList.remove('grabbing');
      distInicial = distanciaEntre(e.touches);
      zoomInicial = getZoom();
    }
  }, { passive: false });
  el.addEventListener('touchmove', (e) => {
    if (!pincando || e.touches.length !== 2) return;
    e.preventDefault();
    setZoom(escalaDaPinca(zoomInicial, distanciaEntre(e.touches), distInicial));
  }, { passive: false });
  el.addEventListener('touchend', (e) => { if (e.touches.length < 2) pincando = false; });
}
