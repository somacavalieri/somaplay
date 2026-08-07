// scroll-speed.js — a escala da rolagem automática da cifra. Puro, sem estado.
//
// A rolagem avança de 30 em 30 ms; cada nível diz quantos pixels andam por
// passo. A escala antiga era linear (nível × 0,7 px, de 1 a 10) e começava
// rápido demais: o nível 1 já corria a ~23 px/s, mais do que a maioria das
// músicas pede.
//
// A escala nova tem 5 níveis e é geométrica — cada degrau é cerca do dobro do
// anterior. Isso põe a resolução embaixo, onde de fato se toca, e mantém o
// topo intacto: o nível 5 é a antiga velocidade máxima. Em termos da escala
// antiga, os cinco níveis valem 0,5 · 1 · 2 · 4 · 10.
const STEPS = [0.35, 0.7, 1.4, 2.8, 7];

export const SCROLL_TICK_MS = 30;
export const SCROLL_MIN = 1;
export const SCROLL_MAX = STEPS.length;

/** Prende um nível (inclusive os 6..10 salvos pela escala antiga) em 1..5. */
export function clampSpeed(level) {
  const n = Math.round(Number(level));
  if (!Number.isFinite(n)) return SCROLL_MIN;
  return Math.min(SCROLL_MAX, Math.max(SCROLL_MIN, n));
}

/** Pixels por passo de rolagem para um nível. */
export function scrollStep(level) {
  return STEPS[clampSpeed(level) - 1];
}

/** Pixels por segundo — só para conferir a escala nos testes e na doc. */
export function scrollPxPerSecond(level) {
  return (scrollStep(level) * 1000) / SCROLL_TICK_MS;
}
