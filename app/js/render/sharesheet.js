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
import { DB } from '../db.js';
import { I, esc } from '../icons.js';
import { t, getLang } from '../i18n.js';

export const OPCOES = [
  { id: 'cifras', partes: ['cifra'] },
  { id: 'ambos', partes: ['cifra', 'audio'] },
  { id: 'audio', partes: ['audio'] },
];

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

// Os bytes de cada opção, medidos e não estimados. Só é chamada para um recorte
// limitado (uma lista, um artista): numa biblioteca inteira seriam milhares de
// handles, e é por isso que Configurações não mostra tamanho.
export async function calculaTamanhos(songs) {
  const soma = async (ids) => {
    let total = 0;
    for (const id of ids) {
      const n = await DB.blobSize(id);
      if (n === null) return null;    // fallback IDB: prefere não mostrar
      total += n;
    }
    return total;
  };
  const cifras = await soma(blobIdsDasMusicas(podaPorPartes(songs, ['cifra'])));
  const audio = await soma(blobIdsDasMusicas(podaPorPartes(songs, ['audio'])));
  return {
    cifras,
    audio,
    ambos: cifras === null || audio === null ? null : cifras + audio,
  };
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

  // O backdrop leva o data-a e o painel leva data-stop="1", como o .scrim e o
  // .popover já fazem: a delegação global (main.js) descarta o closeShare
  // quando o clique nasceu dentro do conteúdo protegido. Testar o alvo direto
  // não serviria — num botão com ícone o alvo real é o <svg> de dentro.
  return `<div class="sheet-backdrop" data-a="closeShare">
    <div class="sheet" data-stop="1">
      <div style="font-family:var(--f-title);font-weight:600;font-size:17px">${esc(t('share.title', { name: sh.titulo }))}</div>
      <div style="color:var(--muted);font-size:13px;margin:2px 0 14px">${songs.length} ${t(songs.length === 1 ? 'common.song' : 'common.songs')}</div>
      ${linhas}
      <button class="btn-primary" style="width:100%;margin-top:14px" data-a="doShare">${I.uploadSm()}${t('common.share')}</button>
    </div>
  </div>`;
}
