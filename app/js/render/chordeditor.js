// render/chordeditor.js — editor de casas compartilhado (adicionar/editar música,
// dicionário e seletor da tela de toque). Reducers puros + HTML derivado.
// estado: { name, frets:[6], barre:null|{fret,from,to}, base, label, origin }
// origin: { kind:'draft'|'song'|'book', songId?, varId? } — diz onde a forma é gravada.
import { I, esc } from '../icons.js';
import { chordSVG } from '../chords.js';

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

// ---------- HTML ----------
const CW = 34, GAP = 8; // precisam bater com .fcell{width} e .fcells{gap} no CSS
const CORDAS = ['Mi', 'Lá', 'Ré', 'Sol', 'Si', 'Mi'];

export function chordEditorHTML(st, opts = {}) {
  const travada = (i) => !!st.barre && i > st.barre.from && i < st.barre.to;

  const heads = st.frets.map((f, i) =>
    `<button class="fcell head ${f === -1 ? 'x' : ''} ${f === 0 ? 'o' : ''} ${travada(i) ? 'lock' : ''}" data-a="ceHead" data-id="${i}">${f === -1 ? '✕' : (f === 0 ? '○' : '·')}</button>`).join('');

  let linhas = '';
  for (let r = 0; r < 5; r++) {
    const casa = st.base + r;
    const naCasa = !!st.barre && st.barre.fret === casa;
    const bar = naCasa
      ? `<div class="fbar" style="left:${st.barre.from * (CW + GAP)}px;width:${(st.barre.to - st.barre.from) * (CW + GAP) + CW}px"></div>`
      : '';
    const cells = st.frets.map((f, i) =>
      `<button class="fcell ${f === casa ? 'on' : ''} ${travada(i) && st.barre.fret > casa ? 'lock' : ''}" data-a="ceCell" data-id="${i}" data-fret="${casa}"></button>`).join('');
    linhas += `<div class="frow">
      <button class="fbarre ${naCasa ? 'on' : ''}" data-a="ceBarre" data-id="${casa}" title="Pestana na ${casa}ª casa">⌐</button>
      <span class="fnum">${casa}ª</span>
      <div class="fcells">${cells}${bar}</div></div>`;
  }

  const meta = [];
  if (opts.fromLabel) meta.push(`vindo de “${esc(opts.fromLabel)}”`);
  if (opts.usage) meta.push(`usada em ${opts.usage} música${opts.usage === 1 ? '' : 's'}`);

  const foot = st.origin.varId
    ? `<button class="btn-ghost sm" data-a="ceSave">Atualizar variação</button><button class="btn-save sm" data-a="ceSaveNew">Salvar como nova</button>`
    : `<button class="btn-save sm" data-a="ceSaveNew">Salvar</button>`;

  return `<div class="chord-editor">
    <div class="ce-hd"><b>${esc(st.name)}</b>
      <span class="ce-base">casa base
        <button class="btn-icon xs" data-a="ceBase" data-id="-1">−</button><b>${st.base}ª</b><button class="btn-icon xs" data-a="ceBase" data-id="1">+</button></span>
      <button class="btn-icon xs" style="margin-left:auto" data-a="ceClose" title="Fechar">${I.close()}</button></div>
    <div class="fgrid">
      <div class="frow"><span class="fbarre-pad"></span><span class="fnum"></span>
        <div class="fcells">${CORDAS.map((n) => `<span class="fstr">${n}</span>`).join('')}</div></div>
      <div class="frow"><span class="fbarre-pad"></span><span class="fnum"></span>
        <div class="fcells">${heads}</div></div>
      ${linhas}
    </div>
    ${meta.length ? `<div class="ce-meta">${meta.join(' · ')}</div>` : ''}
    <div class="ce-foot">
      <input type="text" class="input" id="ce-label" placeholder="rótulo (ex.: pestana 3ª)" value="${esc(st.label)}">
      ${foot}</div>
  </div>`;
}

// Fileira de variações (miniatura + rótulo). Quem chama decide a ação.
export function shapeStripHTML(name, shapes, selId, action) {
  if (!shapes.length) return '';
  return `<div class="shape-strip">${shapes.map((s) => `
    <button class="pick-opt ${s.id === selId ? 'sel' : ''}" data-a="${action}" data-id="${esc(name)}" data-var="${esc(s.id)}">
      ${chordSVG(name, true, { [name]: s })}
      <span class="lbl">${esc(s.label || 'variação')}${s.isDefault ? ' ★' : ''}</span>
    </button>`).join('')}</div>`;
}
