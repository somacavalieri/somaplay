// render/chordbookscreen.js — Dicionário de acordes (Configurações).
// Tela única agrupada por tônica: cada acorde traz todas as suas variações.
import { S } from '../state.js';
import { I, esc } from '../icons.js';
import { allNames, shapesOf, hasHidden, songsUsingVar } from '../chordbook.js';
import { chordSVG } from '../chords.js';
import { chordEditorHTML, descreveForma } from './chordeditor.js';
import { t } from '../i18n.js';

const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const tonica = (n) => n[0].toUpperCase();

function varHTML(name, s, ed) {
  const usos = songsUsingVar(S.songs, name, s.id).length;
  return `<div class="cb-var ${ed && ed.origin.varId === s.id ? 'on' : ''}">
    <button class="pick-opt ${s.isDefault ? 'sel' : ''}" data-a="cbEditVar" data-id="${esc(name)}" data-var="${esc(s.id)}">
      ${chordSVG(name, true, { [name]: s })}
      <span class="lbl">${esc(s.label || descreveForma(s))}${s.isDefault ? ' ★' : ''}</span>
    </button>
    <div class="cb-uso">${usos ? `${usos} ${usos === 1 ? t('common.song') : t('common.songs')}` : ''}</div>
  </div>`;
}

function linhaHTML(name, ed) {
  const shapes = shapesOf(name);
  const vars = shapes.map((s) => varHTML(name, s, ed)).join('')
    || `<div class="cb-uso">${t('chordbook.row.noneRegistered')}</div>`;
  const editando = ed && ed.name === name;
  const sel = editando && ed.origin.varId ? shapes.find((s) => s.id === ed.origin.varId) : null;
  return `<div class="cb-row ${editando ? 'on' : ''}">
    <div class="cb-name">${esc(name)}</div>
    <div class="cb-body">
      <div class="cb-vars">${vars}
        <button class="cb-plus" data-a="cbNewVar" data-id="${esc(name)}" title="${t('chordbook.row.newVariation')}">${I.plus(18)}</button>
      </div>
      ${hasHidden(name) ? `<button class="btn-ghost sm" data-a="cbRestore" data-id="${esc(name)}" style="margin-top:10px">↺ ${t('chordbook.row.restoreBuiltins')}</button>` : ''}
      ${editando ? `${chordEditorHTML(ed, { usage: sel ? songsUsingVar(S.songs, name, sel.id).length : 0 })}
        ${sel ? `<div class="cb-actions">
          <button class="btn-ghost sm" data-a="cbSetDefault" data-id="${esc(name)}" data-var="${esc(sel.id)}">★ ${t('chordbook.row.setDefault')}</button>
          <button class="btn-ghost sm danger" data-a="cbDeleteVar" data-id="${esc(name)}" data-var="${esc(sel.id)}">${I.trash(15)} ${t('chordbook.row.delete')}</button>
        </div>` : ''}` : ''}
    </div>
  </div>`;
}

export function renderChordbook() {
  const q = S.cbQuery.trim().toLowerCase();
  const ed = S.chordEd && S.chordEd.origin.kind === 'book' ? S.chordEd : null;
  // Um acorde recém-criado (cbConfirmAdd) só entra em allNames() ao salvar a 1ª
  // variação — mas precisa da linha (com o editor embutido) pra o usuário
  // desenhar essa 1ª variação. Sem isto a linha nunca aparece e "+ Acorde" não
  // leva a lugar nenhum.
  const catalogo = allNames();
  const universo = ed && !catalogo.includes(ed.name)
    ? [...catalogo, ed.name].sort((a, b) => a.localeCompare(b, 'pt'))
    : catalogo;
  const nomes = universo
    .filter((n) => (!q || n.toLowerCase().includes(q)) && (!S.cbFilter || tonica(n) === S.cbFilter));

  const grupos = [];
  let atual = null;
  for (const n of nomes) {
    const t = tonica(n);
    if (t !== atual) { grupos.push({ t, nomes: [] }); atual = t; }
    grupos[grupos.length - 1].nomes.push(n);
  }

  const corpo = grupos.map((g) => `<div class="cb-group">${esc(g.t)}</div>
    ${g.nomes.map((n) => linhaHTML(n, ed)).join('')}`).join('')
    || `<div style="color:var(--muted);font-size:13px;padding:20px 4px">${t('chordbook.empty.noneFound')}</div>`;

  return `<div class="screen">
    <div class="topbar">
      <button class="btn-icon" data-a="goSettings" title="${t('common.back')}">${I.back()}</button>
      <div class="page-title">${t('settings.chordbook.title')}</div>
    </div>
    <div class="content-scroll" style="padding:26px 28px">
      <div class="cb-wrap">
        <div class="cb-bar">
          <div class="searchin" style="flex:1;min-width:180px">${I.search(17)}
            <input type="text" id="cb-query" placeholder="${t('chordbook.search.placeholder')}" value="${esc(S.cbQuery)}"></div>
          ${LETRAS.map((l) => `<button class="btn-ghost sm ${S.cbFilter === l ? 'on' : ''}" data-a="cbLetter" data-id="${l}">${l}</button>`).join('')}
          <button class="btn-ghost sm" data-a="cbStartAdd">${I.plus(16)}${t('chordbook.addChord.label')}</button>
        </div>
        ${S.cbAdding ? `<div class="cb-bar">
          <input type="text" class="input" id="cb-new-name" placeholder="${t('chordbook.addChord.namePlaceholder')}" style="flex:1;min-width:200px">
          <button class="btn-save sm" data-a="cbConfirmAdd">${t('common.create')}</button>
          <button class="btn-ghost sm" data-a="cbCancelAdd">${t('common.cancel')}</button></div>` : ''}
        ${corpo}
      </div>
    </div>
  </div>`;
}
