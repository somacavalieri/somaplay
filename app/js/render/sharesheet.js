// render/sharesheet.js — the contextual share sheet, opened from the ⋯ of a list
// or an artist.
//
// A sheet rather than three menu items because this is where the SIZE fits, and
// the size is exactly the decision being made: does this go through WhatsApp or
// through Drive.
//
// None of these options carries `pessoal`. Sharing is giving someone content,
// not dumping the sender's taste and settings on them — that is what the
// Settings block is for, where the normal job is backup.
import { S, blobIdsDasMusicas, songById } from '../state.js';
import { podaPorPartes } from '../partes.js';
import { chordbookRecords } from '../chordbook.js';
import { DB } from '../db.js';
import { I, esc } from '../icons.js';
import { t, getLang } from '../i18n.js';

export const OPCOES = [
  { id: 'cifras', partes: ['cifra'] },
  { id: 'ambos', partes: ['cifra', 'audio'] },
  { id: 'audio', partes: ['audio'] },
];

// A caixa acrescenta uma parte à opção escolhida, em vez de a lista ganhar uma
// linha. A lista de presets cresce por MULTIPLICAÇÃO — uma linha "cifras +
// anotações" pediria em seguida "cifras + áudio + anotações", e com quatro partes
// seriam oito linhas. A caixa cresce por soma.
export function partesDaEscolha(opcaoId, incluirNotas) {
  const base = (OPCOES.find((o) => o.id === opcaoId) || OPCOES[0]).partes;
  return incluirNotas && base.includes('cifra') ? [...base, 'anotacoes'] : [...base];
}

// 1,8 MB reads; 1887436,8 bytes does not. One decimal below ten, none above, and
// KB always whole — nobody chooses a delivery channel over half a kilobyte.
// '' means "not measured yet", never 0, which would read as an empty file. The
// decimal separator follows the language, like the storage bar in settings.js:
// in English a comma would read as a thousands separator, not a decimal point.
export function formataTamanho(bytes) {
  if (bytes === null || bytes === undefined) return '';
  const b = Math.max(bytes, 0);
  const dec = getLang() === 'pt' ? ',' : '.';
  const um = (n, u) => `${(n < 10 ? n.toFixed(1) : String(Math.round(n))).replace('.', dec)} ${u}`;
  if (b >= 1e9) return um(b / 1e9, 'GB');
  if (b >= 1e6) return um(b / 1e6, 'MB');
  return `${Math.round(b / 1e3)} KB`;
}

// The metadata half of an option: the JSON exportLibrary would write for it —
// the songs pruned to those parts, plus the chordbook, which travels with
// `cifra` (backup.js gates it on that part) and can be substantial.
//
// Byte length, not String.length: an accented Portuguese title is more bytes
// than characters, and it is bytes that go through WhatsApp.
function tamanhoDoJson(songs, partes) {
  const m = { songs: podaPorPartes(songs, partes) };
  if (partes.includes('cifra')) m.chordbook = chordbookRecords();
  return new TextEncoder().encode(JSON.stringify(m)).byteLength;
}

// The bytes of each option, measured rather than estimated. Only called for a
// limited slice (one list, one artist): a whole library would be thousands of
// handles, which is why Settings shows no size at all.
//
// Blobs AND metadata. Blobs alone made a text chart read "0 KB" — it has no blob
// — when the real file is a couple of kilobytes; "0 KB" reads as an empty file,
// the one thing formataTamanho was written never to say.
//
// The blobs of `cifra` and of `audio` are disjoint sets, so adding them is
// exact and costs no extra handles. The JSON is NOT: identity fields and the
// chordbook appear in both, so `ambos` measures its own instead of summing.
export async function calculaTamanhos(songs) {
  const soma = async (ids) => {
    let total = 0;
    for (const id of ids) {
      const n = await DB.blobSize(id);
      if (n === null) return null;    // IDB fallback: would rather show nothing
      total += n;
    }
    return total;
  };
  const bCifras = await soma(blobIdsDasMusicas(podaPorPartes(songs, ['cifra'])));
  const bAudio = await soma(blobIdsDasMusicas(podaPorPartes(songs, ['audio'])));
  const blobs = { cifras: bCifras, audio: bAudio, ambos: bCifras === null || bAudio === null ? null : bCifras + bAudio };
  const out = {};
  // Driven by OPCOES so the estimate and the file can never disagree about what
  // an option means.
  for (const o of OPCOES) out[o.id] = blobs[o.id] === null ? null : blobs[o.id] + tamanhoDoJson(songs, o.partes);
  return out;
}

export function renderShareSheet() {
  const sh = S.shareSheet;
  if (!sh) return '';
  const songs = [...sh.songIds].map(songById).filter(Boolean);
  const tam = sh.tamanhos || {};

  const linhas = OPCOES.map((o) => `
    <button class="check-row" data-a="pickShareOpt" data-id="${o.id}">
      <span class="checkbox ${sh.opcao === o.id ? 'on' : ''}">${sh.opcao === o.id ? I.check(15) : ''}</span>
      <span class="nm">
        <span>${t(`share.opt.${o.id}`)}</span>
        <span style="display:block;color:var(--muted);font-size:12px;margin-top:2px">${t(`share.opt.${o.id}Sub`)}</span>
      </span>
      <span class="ct">${formataTamanho(tam[o.id])}</span>
    </button>`).join('');

  // A caixa aparece logo depois da linha da opção ativa, quando **alguma** música
  // selecionada tem anotação e a opção leva cifra.
  const temAlguma = songs.some((s) => String(s.anotacoes || '').trim());
  const levaCifra = partesDaEscolha(sh.opcao, false).includes('cifra');
  const caixaNotas = (temAlguma && levaCifra) ? `
    <button class="check-row" data-a="toggleShareNotas" style="margin:2px 0 6px 40px;padding:8px 12px;background:var(--accent-tint);min-height:0">
      <span class="checkbox ${sh.incluirNotas ? 'on' : ''}" style="width:22px;height:22px;border-radius:7px">${sh.incluirNotas ? I.check(13) : ''}</span>
      <span class="nm" style="font-size:14px">${t('share.incluirNotas')}</span>
    </button>` : '';

  // The backdrop carries the data-a and the panel carries data-stop="1", the way
  // .scrim and .popover already do: the global delegation (main.js) drops the
  // closeShare when the click was born inside protected content. Testing the
  // direct target would not work — in a button with an icon the real target is
  // the <svg> inside it.
  return `<div class="sheet-backdrop" data-a="closeShare">
    <div class="sheet" data-stop="1">
      <div style="font-family:var(--f-title);font-weight:600;font-size:17px">${esc(t('share.title', { name: sh.titulo }))}</div>
      <div style="color:var(--muted);font-size:13px;margin:2px 0 14px">${songs.length} ${t(songs.length === 1 ? 'common.song' : 'common.songs')}</div>
      ${linhas}${caixaNotas}
      <button class="btn-primary" style="width:100%;margin-top:14px" data-a="doShare">${I.uploadSm()}${t('common.share')}</button>
    </div>
  </div>`;
}
