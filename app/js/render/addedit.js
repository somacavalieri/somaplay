// render/addedit.js — Adicionar / editar música (artista, cifra imagem/texto, letra, áudio)
import { S, songById, artistById, upsertArtist, saveSong, songsOfArtist, fontesSugeridas } from '../state.js';
import { DB, uid } from '../db.js';
import { I, esc } from '../icons.js';
import { iniciais } from '../initials.js';
import { offlineBadge } from './home.js';
import { parseCifraText, extractChords, chordSVG } from '../chords.js';
import { shapesOf, defaultShape } from '../chordbook.js';
import { chordEditorHTML, shapeStripHTML } from './chordeditor.js';
import { t } from '../i18n.js';

export function newDraft(song) {
  if (song) {
    const a = artistById(song.artistId);
    return {
      artistName: a ? a.name : '', artistOpen: false, artistQuery: '',
      title: song.title, tom: song.tom || '',
      fonte: song.fonte || '',
      estilo: song.estilo || '',
      cifraFonte: song.cifra?.tipo || (song.cifra?.imagens?.length ? 'imagem' : 'texto'),
      imagens: (song.cifra?.imagens || []).map((im) => ({ ...im })),
      cifraTexto: song.cifra?.texto || '',
      acordes: (song.cifra?.acordes || []).join(' '),
      letra: song.letra || '',
      stems: (song.stems || []).map((st) => ({ ...st, fileName: st.fileName || '' })),
      full: (song.full || []).map((f) => ({ ...f, fileName: f.fileName || '' })),
      digitacoes: { ...(song.cifra?.digitacoes || {}) },
    };
  }
  return {
    artistName: '', artistOpen: false, artistQuery: '',
    title: '', tom: '', fonte: '', estilo: '', cifraFonte: 'texto',
    imagens: [], cifraTexto: '', acordes: '', letra: '', stems: [], full: [],
    digitacoes: {},
  };
}

function artistDropdown(d) {
  if (!d.artistOpen) return '';
  const q = d.artistQuery.trim().toLowerCase();
  const list = S.artists.filter((a) => !q || a.name.toLowerCase().includes(q));
  const exact = S.artists.some((a) => a.name.toLowerCase() === q);
  return `<div style="position:fixed;inset:0;z-index:39" data-a="closeArtistDD"></div>
    <div class="dropdown">
      <div class="search"><div class="searchin">${I.search(17)}<input type="text" id="artist-query" placeholder="${t('addedit.artistDropdown.searchPlaceholder')}" value="${esc(d.artistQuery)}"></div></div>
      <div class="opts">
        ${list.map((a) => {
          const n = songsOfArtist(a.id).length;
          return `<div class="dd-row ${a.name === d.artistName ? 'sel' : ''}" data-a="pickArtist" data-id="${esc(a.name)}">
          <div class="avatar sm ${a.av}">${esc(iniciais(a.name))}</div>
          <div style="flex:1;min-width:0"><div class="nm">${esc(a.name)}</div><div class="ct">${n} ${n === 1 ? t('common.song') : t('common.songs')}</div></div>
          ${a.name === d.artistName ? `<span style="color:var(--accent)">${I.check(18, 2.4)}</span>` : ''}
        </div>`;
        }).join('') || `<div style="padding:14px 12px;color:var(--muted);font-size:13px;text-align:center">${t('addedit.artistDropdown.notFound')}</div>`}
      </div>
      ${q && !exact ? `<div class="dd-create" data-a="createArtistFromQuery">${I.plus()}<span>${t('addedit.artistDropdown.createNew', { name: esc(d.artistQuery.trim()) })}</span></div>` : ''}
    </div>`;
}

function draftChordNames(d) {
  if (d.cifraFonte === 'texto') return extractChords(parseCifraText(d.cifraTexto || ''));
  return (d.acordes || '').trim() ? d.acordes.trim().split(/\s+/) : [];
}

function chordDigHTML(d) {
  const isText = d.cifraFonte === 'texto';
  const names = draftChordNames(d);
  if (!isText && !names.length) return '';
  const dict = d.digitacoes || {};
  const ed = S.chordEd && S.chordEd.origin.kind === 'draft' ? S.chordEd : null;
  const chips = names.map((n) => `<button class="digchip ${ed && ed.name === n ? 'on' : ''} ${dict[n] ? 'set' : ''}" data-a="editChord" data-id="${esc(n)}">
      <span class="dnm">${esc(n)}</span>${chordSVG(n, true, dict)}
    </button>`).join('');
  const editor = ed
    ? shapeStripHTML(ed.name, shapesOf(ed.name), ed.origin.varId, 'ceUseVar') + chordEditorHTML(ed)
    : '';
  return `<div class="card-section">
    <div class="hd"><span style="color:var(--accent);display:flex">${I.cifraLines(19)}</span>
      <div class="t">${t('addedit.chordDig.title')}</div>
      <div class="s">${t('addedit.chordDig.hint')}</div>
      <button class="btn-ghost sm" style="margin-left:auto" data-a="refreshChords">${t('addedit.chordDig.detectBtn')}</button></div>
    <div class="digchips">${chips || `<div style="color:var(--muted);font-size:13px">${t('addedit.chordDig.emptyHint', { action: t('addedit.chordDig.detectBtn') })}</div>`}</div>
    ${editor}
  </div>`;
}

export function renderAddEdit() {
  const d = S.draft;
  const editing = !!S.editSongId;

  const imgRows = d.imagens.map((im, i) => `
    <div class="imgitem-row">
      ${im._thumbURL ? `<img class="thumb" src="${im._thumbURL}" alt="">` : `<span style="color:var(--muted);display:flex">${I.img()}</span>`}
      <span class="file-name">${esc(im.name || im.blobId || t('addedit.image.fallbackName'))}</span>
      <div class="seg-mini">
        <button class="${im.tipo === 'aberta' ? 'on' : ''}" data-a="setImgTipo" data-id="${i}" data-tipo="aberta">${t('addedit.imgType.withDiagrams')}</button>
        <button class="${im.tipo === 'fechada' ? 'on' : ''}" data-a="setImgTipo" data-id="${i}" data-tipo="fechada">${t('addedit.imgType.noDiagrams')}</button>
      </div>
      <button class="btn-del" data-a="removeImg" data-id="${i}">${I.trash(16)}</button>
    </div>`).join('');

  const cifraBody = d.cifraFonte === 'imagem'
    ? `${imgRows}
       <div class="dropzone" data-a="pickImages">
         ${I.upload()}
         <div class="l1">${t('addedit.dropzone.line1', { em: `<em>${t('addedit.dropzone.selectFiles')}</em>` })}</div>
         <div class="l2">${t('addedit.dropzone.line2')}</div>
       </div>
       <div class="field" style="margin-top:14px">
         <label>${t('addedit.chordsField.label')}</label>
         <input type="text" class="input lg" id="f-acordes" placeholder="${t('addedit.chordsField.placeholder')}" value="${esc(d.acordes)}">
       </div>`
    : `<textarea class="textarea mono" id="f-cifratexto" placeholder="${t('addedit.cifraText.placeholder')}">${esc(d.cifraTexto)}</textarea>`;

  const stemRows = d.stems.map((st, i) => `
    <div class="stem-row">
      <span style="color:var(--teal);display:flex">${I.music(18)}</span>
      <input type="text" value="${esc(st.name)}" data-in="stemName" data-id="${i}" placeholder="${t('addedit.stem.namePlaceholder')}">
      <span class="file-name">${esc(st.fileName || (st.blobId ? t('addedit.file.saved') : t('addedit.file.none')))}</span>
      ${st.blobId || st._file ? '' : `<button class="btn-ghost" style="height:38px" data-a="pickStemFile" data-id="${i}">${t('addedit.file.choose')}</button>`}
      <button class="btn-del" data-a="removeStem" data-id="${i}">${I.trash(16)}</button>
    </div>`).join('');

  const fullRows = d.full.map((f, i) => `
    <div class="stem-row">
      ${I.disc(18, true)}
      <input type="text" value="${esc(f.nome)}" data-in="fullName" data-id="${i}" placeholder="${t('addedit.full.namePlaceholder')}">
      <span class="file-name">${esc(f.fileName || (f.blobId ? t('addedit.file.saved') : t('addedit.file.none')))}</span>
      ${f.blobId || f._file ? '' : `<button class="btn-ghost" style="height:38px" data-a="pickFullFile" data-id="${i}">${t('addedit.file.choose')}</button>`}
      <button class="btn-del" data-a="removeFull" data-id="${i}">${I.trash(16)}</button>
    </div>`).join('');

  return `<div class="screen">
    <div class="topbar">
      <button class="btn-icon" data-a="cancelAddEdit" title="${t('common.back')}">${I.back()}</button>
      <div class="page-title">${editing ? t('addedit.title.edit') : t('settings.addSong.title')}</div>
      <span style="margin-left:auto"></span>
      ${offlineBadge}
    </div>
    <div class="content-scroll" style="padding:26px 28px">
      <div class="form-wrap">
        <div class="form-grid">
          <div class="field">
            <label>${t('addedit.field.artist')}</label>
            <div style="position:relative">
              <div class="select-like ${d.artistOpen ? 'open' : ''}" data-a="toggleArtistDD">
                <span class="val ${d.artistName ? '' : 'placeholder'}">${esc(d.artistName || t('addedit.field.selectArtist'))}</span>
                ${I.chevD(18)}
              </div>
              ${artistDropdown(d)}
            </div>
          </div>
          <div class="field">
            <label>${t('addedit.field.songName')}</label>
            <input type="text" class="input lg" id="f-title" placeholder="${t('addedit.field.titlePlaceholder')}" value="${esc(d.title)}">
          </div>
        </div>
        <div class="form-grid">
          <div class="field">
            <label>${t('addedit.field.key')}</label>
            <input type="text" class="input lg" id="f-tom" placeholder="${t('addedit.field.keyPlaceholder')}" value="${esc(d.tom)}">
          </div>
          <div class="field">
            <label>${t('addedit.field.chartSource')}</label>
            <div class="seg-mini" style="height:52px;align-items:center;padding:6px">
              <button style="height:40px" class="${d.cifraFonte === 'texto' ? 'on' : ''}" data-a="setCifraFonte" data-id="texto">${t('addedit.chartSource.text')}</button>
              <button style="height:40px" class="${d.cifraFonte === 'imagem' ? 'on' : ''}" data-a="setCifraFonte" data-id="imagem">${t('addedit.chartSource.image')}</button>
            </div>
          </div>
        </div>

        <div class="field">
          <label>${t('addedit.field.source')}</label>
          <div class="chip-row">
            <input type="text" class="input lg" id="f-fonte" placeholder="${t('addedit.field.sourcePlaceholder')}" value="${esc(d.fonte)}">
            ${fontesSugeridas(S.songs).map((nome) => `<button type="button" class="btn-ghost sm ${d.fonte === nome ? 'on' : ''}" data-a="setFonte" data-id="${esc(nome)}">${esc(nome)}</button>`).join('')}
          </div>
        </div>

        <div class="field">
          <label>${t('addedit.field.style')}</label>
          <div class="chip-row">
            <input type="text" class="input lg" id="f-estilo" placeholder="${t('addedit.field.stylePlaceholder')}" value="${esc(d.estilo)}">
            ${['MPB', 'Samba', 'Bossa Nova', 'Choro', 'Forró', 'Carimbó', 'Rock', 'Pop', 'Alternativo', 'Jazz', 'Soul'].map((genero) => `<button type="button" class="btn-ghost sm ${d.estilo === genero ? 'on' : ''}" data-a="setEstilo" data-id="${genero}">${genero}</button>`).join('')}
          </div>
        </div>

        <div class="card-section">
          <div class="hd"><span style="color:var(--accent);display:flex">${d.cifraFonte === 'imagem' ? I.img() : I.cifraLines(19)}</span>
            <div class="t">${d.cifraFonte === 'imagem' ? t('addedit.chartSection.imageTitle') : t('addedit.chartSection.textTitle')}</div></div>
          ${cifraBody}
        </div>

        ${chordDigHTML(d)}

        <div class="card-section">
          <div class="hd"><span style="color:var(--accent);display:flex">${I.textLines()}</span><div class="t">${t('addedit.lyrics.title')}</div>
            <div class="s">${t('addedit.lyrics.hint')}</div></div>
          <textarea class="textarea" id="f-letra" placeholder="${t('addedit.lyrics.placeholder')}">${esc(d.letra)}</textarea>
        </div>

        <div class="card-section">
          <div class="hd"><span style="color:var(--teal);display:flex">${I.mixer(19)}</span><div class="t">${t('addedit.stems.title')}</div>
            <div class="s">${d.stems.length} ${d.stems.length === 1 ? t('addedit.stems.added') : t('addedit.stems.addedPlural')}</div></div>
          ${stemRows}
          <button class="add-slot" data-a="addStems">${I.plus(18)}${t('addedit.stems.addBtn')}</button>
        </div>

        <div class="card-section">
          <div class="hd">${I.disc(19, true)}<div class="t">${t('addedit.full.title')}</div>
            <div class="s">${t('addedit.full.hint')}</div></div>
          ${fullRows}
          <button class="add-slot amber" data-a="addFull">${I.plus(18)}${t('addedit.full.addBtn')}</button>
        </div>
      </div>
    </div>
    <div class="foot-actions">
      <button class="btn-ghost lg" data-a="cancelAddEdit">${t('common.cancel')}</button>
      <button class="btn-save" data-a="saveDraft">${I.save()}${t('addedit.saveBtn')}</button>
    </div>
    <input type="file" id="file-images" accept="image/*" multiple hidden>
    <input type="file" id="file-audio" accept="audio/*" multiple hidden>
    <input type="file" id="file-audio-single" accept="audio/*" hidden>
  </div>`;
}

// Coleta os campos de texto do DOM pro draft (antes de qualquer re-render/salvar)
export function syncDraftFromDOM() {
  const d = S.draft;
  if (!d) return;
  const g = (id) => document.getElementById(id);
  if (g('f-title')) d.title = g('f-title').value;
  if (g('f-tom')) d.tom = g('f-tom').value.trim();
  if (g('f-fonte')) d.fonte = g('f-fonte').value.trim();
  if (g('f-estilo')) d.estilo = g('f-estilo').value.trim();
  if (g('f-acordes')) d.acordes = g('f-acordes').value;
  if (g('f-cifratexto')) d.cifraTexto = g('f-cifratexto').value;
  if (g('f-letra')) d.letra = g('f-letra').value;
}

// Salva o draft: blobs pendentes → OPFS; monta a música; persiste
export async function commitDraft() {
  const d = S.draft;
  syncDraftFromDOM();
  if (!d.artistName.trim()) throw new Error(t('addedit.error.needArtist'));
  if (!d.title.trim()) throw new Error(t('addedit.error.needTitle'));

  const artist = await upsertArtist(d.artistName.trim());

  const imagens = [];
  for (const im of d.imagens) {
    let blobId = im.blobId;
    if (!blobId && im._file) {
      blobId = uid();
      await DB.saveBlob(blobId, im._file);
    }
    if (blobId) imagens.push({ blobId, tipo: im.tipo || 'aberta', name: im.name || '' });
  }
  const stems = [];
  for (const st of d.stems) {
    let blobId = st.blobId;
    if (!blobId && st._file) {
      blobId = uid();
      await DB.saveBlob(blobId, st._file);
    }
    if (blobId) stems.push({ id: st.id || uid(), name: st.name || 'Canal', blobId, fileName: st.fileName || '', vol: st.vol ?? 80, muted: st.muted ?? false });
  }
  const full = [];
  for (const f of d.full) {
    let blobId = f.blobId;
    if (!blobId && f._file) {
      blobId = uid();
      await DB.saveBlob(blobId, f._file);
    }
    if (blobId) full.push({ id: f.id || uid(), nome: f.nome || '', meta: f.meta || '', blobId, fileName: f.fileName || '' });
  }

  const usados = draftChordNames(d);
  const dig = { ...(d.digitacoes || {}) };
  for (const n of usados) {
    if (dig[n]) continue;
    const def = defaultShape(n);
    if (def) dig[n] = { frets: def.frets.slice(), ...(def.barre ? { barre: { ...def.barre } } : {}), varId: def.id };
  }

  const existing = S.editSongId ? songById(S.editSongId) : null;
  const song = {
    id: existing ? existing.id : uid(),
    artistId: artist.id,
    title: d.title.trim(),
    tom: d.tom || '',
    fonte: (d.fonte && d.fonte.trim()) || (d.cifraFonte === 'texto' ? 'CifraClub' : 'Songbook'),
    estilo: d.estilo ? d.estilo.trim() : '',
    favorita: existing ? existing.favorita : false,
    createdAt: existing ? existing.createdAt : Date.now(),
    // Este formulário só conhece os campos acima — qualquer campo da música que
    // ele NÃO tem input para é destruído no save (DB.putSong é um `store.put`,
    // não um merge) a menos que seja resgatado aqui, à mão, do registro
    // existente. Mesma armadilha que `CAMPOS` resolve em partes.js, só que
    // este formulário fica fora do alcance daquela regra.
    anotacoes: existing ? existing.anotacoes : undefined,
    cifra: d.cifraFonte === 'imagem'
      ? { tipo: imagens.length ? 'imagem' : null, imagens, texto: '', acordes: d.acordes.trim() ? d.acordes.trim().split(/\s+/) : [], digitacoes: dig }
      : { tipo: d.cifraTexto.trim() ? 'texto' : null, imagens: [], texto: d.cifraTexto, acordes: [], digitacoes: dig },
    letra: d.letra || '',
    stems, full,
  };
  await saveSong(song);
  return song;
}
