// render/chordeditor.js — editor de casas compartilhado (adicionar/editar música,
// dicionário e seletor da tela de toque). Reducers puros + HTML derivado.
// estado: { name, frets:[6], barre:null|{fret,from,to}, base, label, origin }
// origin: { kind:'draft'|'song'|'book', songId?, varId? } — diz onde a forma é gravada.

export const VAZIO = [-1, -1, -1, -1, -1, -1];

export function openEditor(name, shape, origin) {
  const frets = shape && shape.frets ? shape.frets.slice() : VAZIO.slice();
  const pos = frets.filter((f) => f > 0);
  return {
    name,
    frets,
    barre: shape && shape.barre ? { ...shape.barre } : null,
    base: pos.length && Math.max(...pos) > 4 ? Math.min(...pos) : 1,
    label: (shape && shape.label) || '',
    origin,
  };
}

const noVao = (st, i) => !!st.barre && i >= st.barre.from && i <= st.barre.to;
const ehPonta = (st, i) => !!st.barre && (i === st.barre.from || i === st.barre.to);

// [⌐] da linha: liga a pestana cheia naquela casa, desliga se já está lá,
// ou muda de casa (só uma pestana por forma).
export function toggleBarre(st, F) {
  if (st.barre && st.barre.fret === F) return { ...st, barre: null };
  return { ...st, frets: st.frets.map((f) => (f < F ? F : f)), barre: { fret: F, from: 0, to: 5 } };
}

// Toque numa célula da grade (corda i, casa fret).
export function tapCell(st, i, fret) {
  if (st.barre && fret === st.barre.fret) return moverPonta(st, i);
  if (noVao(st, i) && fret < st.barre.fret) {
    if (!ehPonta(st, i)) return st;            // corda interna: travada
    return liberarPonta(st, i, fret);
  }
  const frets = st.frets.slice();
  frets[i] = frets[i] === fret ? 0 : fret;
  return { ...st, frets };
}

// Toque na cabeça da corda: solta (○) o que estava preso, e alterna ○ ↔ ✕.
export function tapHead(st, i) {
  const val = st.frets[i] === 0 ? -1 : 0;
  if (noVao(st, i)) {
    if (!ehPonta(st, i)) return st;
    return liberarPonta(st, i, val);
  }
  const frets = st.frets.slice();
  frets[i] = val;
  return { ...st, frets };
}

// Encolhe o vão para excluir a corda i (uma das pontas) e aplica o valor nela.
function liberarPonta(st, i, val) {
  const { fret, from, to } = st.barre;
  const nf = i === from ? from + 1 : from;
  const nt = i === to ? to - 1 : to;
  const frets = st.frets.slice();
  frets[i] = val;
  return { ...st, frets, barre: nt - nf >= 1 ? { fret, from: nf, to: nt } : null };
}

// Move a ponta mais próxima até a corda tocada (encurta ou estende).
function moverPonta(st, i) {
  const { fret, from, to } = st.barre;
  let nf = from, nt = to;
  if (Math.abs(i - from) <= Math.abs(i - to)) nf = i; else nt = i;
  if (nf > nt) { const t = nf; nf = nt; nt = t; }
  const frets = st.frets.slice();
  for (let k = nf; k <= nt; k++) if (frets[k] < fret) frets[k] = fret;
  return { ...st, frets, barre: { fret, from: nf, to: nt } };
}

// Janela de 5 linhas da grade — só visual, não é dado da forma.
export function setBase(st, delta) {
  return { ...st, base: Math.max(1, Math.min(15, st.base + delta)) };
}

// Rótulo sugerido para uma forma nova, sem repetir os já usados no acorde.
export function suggestLabel(st, usados) {
  const base = st.barre ? `pestana ${st.barre.fret}ª` : (st.base > 1 ? `casa ${st.base}ª` : 'aberto');
  if (!usados.includes(base)) return base;
  let n = 2;
  while (usados.includes(`${base} (${n})`)) n++;
  return `${base} (${n})`;
}

// Dado (forma) a partir do estado do editor.
export function editorShape(st) {
  return { frets: st.frets.slice(), ...(st.barre ? { barre: { ...st.barre } } : {}), label: st.label };
}
