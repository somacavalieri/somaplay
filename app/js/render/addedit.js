// render/addedit.js — Adicionar / editar música (artista, cifra imagem/texto, letra, áudio)
import { S, songById, artistById, upsertArtist, saveSong, songsOfArtist } from '../state.js';
import { DB, uid } from '../db.js';
import { I, esc } from '../icons.js';
import { offlineBadge } from './home.js';

export function newDraft(song) {
  if (song) {
    const a = artistById(song.artistId);
    return {
      artistName: a ? a.name : '', artistOpen: false, artistQuery: '',
      title: song.title, tom: song.tom || '',
      cifraFonte: song.cifra?.fonte || 'imagem',
      imagens: (song.cifra?.imagens || []).map((im) => ({ ...im })),
      cifraTexto: song.cifra?.texto || '',
      acordes: (song.cifra?.acordes || []).join(' '),
      letra: song.letra || '',
      stems: (song.stems || []).map((st) => ({ ...st, fileName: st.fileName || '' })),
      full: (song.full || []).map((f) => ({ ...f, fileName: f.fileName || '' })),
      digitacoes: song.cifra?.digitacoes || null,
    };
  }
  return {
    artistName: '', artistOpen: false, artistQuery: '',
    title: '', tom: '', cifraFonte: 'imagem',
    imagens: [], cifraTexto: '', acordes: '', letra: '', stems: [], full: [],
    digitacoes: null,
  };
}

function artistDropdown(d) {
  if (!d.artistOpen) return '';
  const q = d.artistQuery.trim().toLowerCase();
  const list = S.artists.filter((a) => !q || a.name.toLowerCase().includes(q));
  const exact = S.artists.some((a) => a.name.toLowerCase() === q);
  return `<div style="position:fixed;inset:0;z-index:39" data-a="closeArtistDD"></div>
    <div class="dropdown">
      <div class="search"><div class="searchin">${I.search(17)}<input type="text" id="artist-query" placeholder="Buscar artista..." value="${esc(d.artistQuery)}"></div></div>
      <div class="opts">
        ${list.map((a) => `<div class="dd-row ${a.name === d.artistName ? 'sel' : ''}" data-a="pickArtist" data-id="${esc(a.name)}">
          <div class="avatar sm ${a.av}">${esc(a.name[0])}</div>
          <div style="flex:1;min-width:0"><div class="nm">${esc(a.name)}</div><div class="ct">${songsOfArtist(a.id).length} músicas</div></div>
          ${a.name === d.artistName ? `<span style="color:var(--accent)">${I.check(18, 2.4)}</span>` : ''}
        </div>`).join('') || '<div style="padding:14px 12px;color:var(--muted);font-size:13px;text-align:center">Nenhum artista encontrado</div>'}
      </div>
      ${q && !exact ? `<div class="dd-create" data-a="createArtistFromQuery">${I.plus()}<span>Criar novo artista: "${esc(d.artistQuery.trim())}"</span></div>` : ''}
    </div>`;
}

export function renderAddEdit() {
  const d = S.draft;
  const editing = !!S.editSongId;

  const imgRows = d.imagens.map((im, i) => `
    <div class="imgitem-row">
      ${im._thumbURL ? `<img class="thumb" src="${im._thumbURL}" alt="">` : `<span style="color:var(--muted);display:flex">${I.img()}</span>`}
      <span class="file-name">${esc(im.name || im.blobId || 'imagem')}</span>
      <div class="seg-mini">
        <button class="${im.tipo === 'aberta' ? 'on' : ''}" data-a="setImgTipo" data-id="${i}" data-tipo="aberta">Aberta</button>
        <button class="${im.tipo === 'fechada' ? 'on' : ''}" data-a="setImgTipo" data-id="${i}" data-tipo="fechada">Fechada</button>
      </div>
      <button class="btn-del" data-a="removeImg" data-id="${i}">${I.trash(16)}</button>
    </div>`).join('');

  const cifraBody = d.cifraFonte === 'imagem'
    ? `${imgRows}
       <div class="dropzone" data-a="pickImages">
         ${I.upload()}
         <div class="l1">Arraste imagens ou <em>selecione arquivos</em></div>
         <div class="l2">PNG, JPG · aberta (com diagramas) e fechada</div>
       </div>
       <div class="field" style="margin-top:14px">
         <label>Acordes da música (opcional, separados por espaço — mostra os diagramas no fim da cifra)</label>
         <input type="text" class="input lg" id="f-acordes" placeholder="Ex.: D D7/C G Gm G7M E" value="${esc(d.acordes)}">
       </div>`
    : `<textarea class="textarea mono" id="f-cifratexto" placeholder="Cole a cifra aqui (linhas de acordes sobre as linhas de letra, seções entre [colchetes])...">${esc(d.cifraTexto)}</textarea>`;

  const stemRows = d.stems.map((st, i) => `
    <div class="stem-row">
      <span style="color:var(--teal);display:flex">${I.music(18)}</span>
      <input type="text" value="${esc(st.name)}" data-in="stemName" data-id="${i}" placeholder="Nome do canal">
      <span class="file-name">${esc(st.fileName || (st.blobId ? 'arquivo salvo' : 'sem arquivo'))}</span>
      ${st.blobId || st._file ? '' : `<button class="btn-ghost" style="height:38px" data-a="pickStemFile" data-id="${i}">Escolher arquivo</button>`}
      <button class="btn-del" data-a="removeStem" data-id="${i}">${I.trash(16)}</button>
    </div>`).join('');

  const fullRows = d.full.map((f, i) => `
    <div class="stem-row">
      ${I.disc(18, true)}
      <input type="text" value="${esc(f.nome)}" data-in="fullName" data-id="${i}" placeholder="Nome da versão (ex.: Original — estúdio)">
      <span class="file-name">${esc(f.fileName || (f.blobId ? 'arquivo salvo' : 'sem arquivo'))}</span>
      ${f.blobId || f._file ? '' : `<button class="btn-ghost" style="height:38px" data-a="pickFullFile" data-id="${i}">Escolher arquivo</button>`}
      <button class="btn-del" data-a="removeFull" data-id="${i}">${I.trash(16)}</button>
    </div>`).join('');

  return `<div class="screen">
    <div class="topbar">
      <button class="btn-icon" data-a="cancelAddEdit" title="Voltar">${I.back()}</button>
      <div class="page-title">${editing ? 'Editar música' : 'Adicionar música'}</div>
      <span style="margin-left:auto"></span>
      ${offlineBadge}
    </div>
    <div class="content-scroll" style="padding:26px 28px">
      <div class="form-wrap">
        <div class="form-grid">
          <div class="field">
            <label>Artista</label>
            <div style="position:relative">
              <div class="select-like ${d.artistOpen ? 'open' : ''}" data-a="toggleArtistDD">
                <span class="val ${d.artistName ? '' : 'placeholder'}">${esc(d.artistName || 'Selecionar artista')}</span>
                ${I.chevD(18)}
              </div>
              ${artistDropdown(d)}
            </div>
          </div>
          <div class="field">
            <label>Nome da música</label>
            <input type="text" class="input lg" id="f-title" placeholder="Título" value="${esc(d.title)}">
          </div>
        </div>
        <div class="form-grid">
          <div class="field">
            <label>Tom (opcional)</label>
            <input type="text" class="input lg" id="f-tom" placeholder="Ex.: G" value="${esc(d.tom)}">
          </div>
          <div class="field">
            <label>Fonte da cifra</label>
            <div class="seg-mini" style="height:52px;align-items:center;padding:6px">
              <button style="height:40px" class="${d.cifraFonte === 'imagem' ? 'on' : ''}" data-a="setCifraFonte" data-id="imagem">Imagem</button>
              <button style="height:40px" class="${d.cifraFonte === 'texto' ? 'on' : ''}" data-a="setCifraFonte" data-id="texto">Texto</button>
            </div>
          </div>
        </div>

        <div class="card-section">
          <div class="hd"><span style="color:var(--accent);display:flex">${d.cifraFonte === 'imagem' ? I.img() : I.cifraLines(19)}</span>
            <div class="t">${d.cifraFonte === 'imagem' ? 'Imagens de cifra' : 'Cifra em texto'}</div></div>
          ${cifraBody}
        </div>

        <div class="card-section">
          <div class="hd"><span style="color:var(--accent);display:flex">${I.textLines()}</span><div class="t">Letra (karaokê)</div>
            <div class="s">separe estrofes com linha em branco</div></div>
          <textarea class="textarea" id="f-letra" placeholder="Cole a letra da música aqui...">${esc(d.letra)}</textarea>
        </div>

        <div class="card-section">
          <div class="hd"><span style="color:var(--teal);display:flex">${I.mixer(19)}</span><div class="t">Canais de áudio (stems)</div>
            <div class="s">${d.stems.length} adicionado${d.stems.length === 1 ? '' : 's'}</div></div>
          ${stemRows}
          <button class="add-slot" data-a="addStems">${I.plus(18)}Adicionar canais de áudio</button>
        </div>

        <div class="card-section">
          <div class="hd">${I.disc(19, true)}<div class="t">Versão completa (música inteira)</div>
            <div class="s">opcional · gravação sem separar canais</div></div>
          ${fullRows}
          <button class="add-slot amber" data-a="addFull">${I.plus(18)}Adicionar versão completa</button>
        </div>
      </div>
    </div>
    <div class="foot-actions">
      <button class="btn-ghost lg" data-a="cancelAddEdit">Cancelar</button>
      <button class="btn-save" data-a="saveDraft">${I.save()}Salvar na biblioteca (offline)</button>
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
  if (g('f-acordes')) d.acordes = g('f-acordes').value;
  if (g('f-cifratexto')) d.cifraTexto = g('f-cifratexto').value;
  if (g('f-letra')) d.letra = g('f-letra').value;
}

// Salva o draft: blobs pendentes → OPFS; monta a música; persiste
export async function commitDraft() {
  const d = S.draft;
  syncDraftFromDOM();
  if (!d.artistName.trim()) throw new Error('Escolha ou crie um artista');
  if (!d.title.trim()) throw new Error('Dê um nome à música');

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
    if (blobId) full.push({ id: f.id || uid(), nome: f.nome || 'Versão completa', meta: f.meta || '', blobId, fileName: f.fileName || '' });
  }

  const existing = S.editSongId ? songById(S.editSongId) : null;
  const song = {
    id: existing ? existing.id : uid(),
    artistId: artist.id,
    title: d.title.trim(),
    tom: d.tom || '',
    favorita: existing ? existing.favorita : false,
    createdAt: existing ? existing.createdAt : Date.now(),
    cifra: d.cifraFonte === 'imagem'
      ? { fonte: imagens.length ? 'imagem' : null, imagens, texto: '', acordes: d.acordes.trim() ? d.acordes.trim().split(/\s+/) : [], digitacoes: d.digitacoes || null }
      : { fonte: d.cifraTexto.trim() ? 'texto' : null, imagens: [], texto: d.cifraTexto, acordes: [], digitacoes: d.digitacoes || null },
    letra: d.letra || '',
    stems, full,
  };
  await saveSong(song);
  return song;
}
