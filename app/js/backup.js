// backup.js — exporta/importa a biblioteca inteira num arquivo .somaplay
// Formato: "SOMAPLAY1\n" + tamanho do JSON (10 dígitos) + "\n" + JSON + bytes dos blobs
// concatenados na ordem do manifest. Sem base64 — leitura por slice (memória ok).
import { DB } from './db.js';
import { S, blobIdsDasMusicas } from './state.js';
import { mergePlan } from './merge.js';
import { chordbookRecords, replaceChordbook, mergeChordbookRecords } from './chordbook.js';
import { t } from './i18n.js';
import { PARTES_TODAS, podaPorPartes, fundeMusica } from './partes.js';

const MAGIC = 'SOMAPLAY1\n';

// O recorte de uma exportação. Não sabe o que é fonte: recebe conjuntos de ids
// prontos, e por isso um eixo novo (artista, lista) entra sem mexer aqui.
// null em qualquer campo significa "tudo" — e com null nos dois o resultado é
// a biblioteca inteira, que é o caminho do backup completo de sempre.
//
// Artista sem música no recorte fica de fora: um artista vazio no destino é
// lixo para o usuário apagar à mão. As listas, ao contrário, viajam inteiras —
// são só ids, não pesam nada, e os que faltam se resolvem quando a outra fonte
// for importada. Podá-las perderia dado: o merge substitui a lista pelo id.
export function recorteParaExport(estado, sel) {
  const { artists = [], songs = [], lists = [] } = estado || {};
  const { songIds = null, listIds = null } = sel || {};
  const songsOut = songIds ? songs.filter((s) => songIds.has(s.id)) : songs;
  const comMusica = new Set(songsOut.map((s) => s.artistId));
  const artistsOut = songIds ? artists.filter((a) => comMusica.has(a.id)) : artists;
  const listsOut = listIds ? lists.filter((l) => listIds.has(l.id)) : lists;
  return { artists: artistsOut, songs: songsOut, lists: listsOut };
}

export function stampDeHoje(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

const slug = (parte) => String(parte || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // tira acento
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// O miolo do nome quando o recorte é por fonte. Sem seleção é 'backup', e é isso
// que faz um backup completo continuar se chamando o que sempre se chamou.
// `palavraFontes` chega de fora ("fontes"/"sources") para a função ficar pura:
// nome de arquivo não é dado persistido, então traduzir aqui é seguro.
export function recorteDeFontes(fontes, palavraFontes) {
  if (!fontes || !fontes.length) return 'backup';
  if (fontes.length === 1) return slug(fontes[0]) || 'backup';
  return `${fontes.length}-${slug(palavraFontes)}`;
}

// `recorte` é o miolo: de recorteDeFontes, ou o nome de uma lista/artista.
//
// A regra do qualificador é uma só, e vale nas duas superfícies: cifra e audio
// JUNTAS não qualificam nada; sozinhas viram sufixo. `pessoal` e as listas ficam
// fora do nome — quatro sufixos combinados dariam
// somaplay-show-sabado-cifras-sem-listas-…, que não ajuda ninguém a escolher um
// arquivo na pasta de Downloads.
export function nomeDoExport(recorte, stamp, partes, palavras = {}) {
  const ps = partes || PARTES_TODAS;
  const temCifra = ps.includes('cifra');
  const temAudio = ps.includes('audio');
  const qual = temCifra === temAudio ? '' : slug(temCifra ? palavras.cifras : palavras.audio);
  return `somaplay-${slug(recorte) || 'backup'}-${qual ? `${qual}-` : ''}${stamp}.somaplay`;
}

// Sem argumento, o comportamento é o de sempre: a biblioteca inteira, todas as
// partes.
export async function exportLibrary({ songIds = null, listIds = null, partes = null, fileName = null } = {}) {
  const ps = partes || PARTES_TODAS;
  const corte = recorteParaExport({ artists: S.artists, songs: S.songs, lists: S.lists }, { songIds, listIds });
  // Podar PRIMEIRO, coletar depois: um pacote só de áudio tem registros sem
  // cifra.imagens, então blobIdsDasMusicas naturalmente devolve só os stems.
  // Ela NÃO ganha um parâmetro `partes` — é a definição única de "quais blobs
  // são desta música" (state.js:279), e um segundo eixo de verdade ali é
  // exatamente como apagar e exportar passam a discordar.
  const podadas = podaPorPartes(corte.songs, ps);
  const blobIds = blobIdsDasMusicas(podadas);
  const parts = [];
  const manifestBlobs = [];
  for (const id of blobIds) {
    const b = await DB.getBlob(id);
    if (!b) continue;
    manifestBlobs.push({ id, size: b.size, type: b.type || 'application/octet-stream' });
    parts.push(b);
  }
  // `version` continua 1: um arquivo parcial é um .somaplay v1 legítimo, e
  // `partes` ausente significa completo — que é como todo arquivo antigo é lido.
  const manifest = {
    version: 1,
    app: 'soma_play',
    partes: ps,
    artists: corte.artists,
    songs: podadas,
    lists: corte.lists,
    blobs: manifestBlobs,
  };
  if (ps.includes('cifra')) manifest.chordbook = chordbookRecords();
  if (ps.includes('pessoal')) manifest.settings = S.settings;
  const json = JSON.stringify(manifest);
  const header = MAGIC + String(new TextEncoder().encode(json).byteLength).padStart(10, '0') + '\n' + json;
  const blob = new Blob([header, ...parts], { type: 'application/octet-stream' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  // `palavras` real, não `{}`: sem ela um recorte parcial pela fronteira de
  // fallback perderia o qualificador (cifras/áudio) do nome, e um backup
  // parcial ficaria com o mesmo nome de um completo.
  a.download = fileName || nomeDoExport('backup', stampDeHoje(), ps, {
    cifras: t('share.word.cifras'), audio: t('share.word.audio'),
  });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
}

// Lê só o cabeçalho: magic + tamanho + JSON. O import precisa disso, e o
// diálogo de confirmação do "Substituir tudo" vai precisar do mesmo
// cabeçalho, por isso a função existe sozinha.
export async function lerManifest(file) {
  const headProbe = await file.slice(0, MAGIC.length + 11).text();
  if (!headProbe.startsWith(MAGIC)) throw new Error(t('msg.backup.notASomaplayFile'));
  const jsonLen = parseInt(headProbe.slice(MAGIC.length, MAGIC.length + 10), 10);
  const jsonStart = MAGIC.length + 11;
  const json = await file.slice(jsonStart, jsonStart + jsonLen).text();
  const manifest = JSON.parse(json);
  if (!manifest.songs || !manifest.artists) throw new Error(t('msg.backup.invalidBackup'));
  return { manifest, blobsStart: jsonStart + jsonLen };
}

// Devolve NOMES DE CHAVE, não texto traduzido: assim a função continua pura e o
// teste não depende da tabela de i18n. `pessoal` não gera aviso — perder as
// favoritas num "substituir tudo" é o que substituir sempre fez.
export function avisosDeSubstituir(partes) {
  const ps = partes || PARTES_TODAS;
  const out = [];
  if (!ps.includes('audio')) out.push('msg.backup.replaceNoAudio');
  if (!ps.includes('cifra')) out.push('msg.backup.replaceNoCifra');
  return out;
}

export async function importLibrary(file, { merge = false } = {}) {
  const { manifest, blobsStart } = await lerManifest(file);
  // Um arquivo corrompido ou feito à mão pode trazer `partes` que não é array —
  // e sem essa guarda o `.includes` mais abaixo lançaria DEPOIS do DB.wipe() no
  // modo substituir. Tratar como "completo" é a mesma regra de "partes ausente".
  const partes = Array.isArray(manifest.partes) ? manifest.partes : PARTES_TODAS;

  // Substituir apaga tudo antes; merge preserva a biblioteca (upsert por id).
  if (!merge) await DB.wipe();

  // blobs — upsert por id nos dois modos
  let off = blobsStart;
  for (const meta of manifest.blobs || []) {
    const chunk = file.slice(off, off + meta.size, meta.type);
    await DB.saveBlob(meta.id, chunk);
    off += meta.size;
  }

  let result;
  if (merge) {
    const plan = mergePlan({ artists: S.artists, songs: S.songs, lists: S.lists }, manifest);
    for (const a of plan.artists) await DB.putArtist(a);
    for (const s of plan.songs) await DB.putSong(s);
    for (const l of plan.lists) await DB.putList(l);
    // Ausência não é deleção, também aqui: um pacote só de áudio não fala do
    // dicionário, e não pode encostar nele.
    if (partes.includes('cifra')) await mergeChordbookRecords(manifest.chordbook || []);
    result = { added: plan.added, updated: plan.updated };
  } else {
    for (const a of manifest.artists) await DB.putArtist(a);
    // Mesmo no modo espelho a música precisa sair com a invariante da cifra —
    // um arquivo só de áudio criaria registros sem o objeto que todo render
    // assume que existe.
    for (const s of manifest.songs) await DB.putSong(fundeMusica(null, s, partes));
    for (const l of manifest.lists || []) await DB.putList(l);
    if (partes.includes('pessoal') && manifest.settings) {
      // lang/notação são preferências do aparelho: não viajam entre bibliotecas
      const { lang, chordNotation, chordNotationTouched, ...rest } = manifest.settings;
      S.settings = { ...S.settings, ...rest };
      await DB.saveSettings(S.settings);
    }
    if (partes.includes('cifra')) await replaceChordbook(manifest.chordbook || []);
    result = { artists: manifest.artists.length, songs: manifest.songs.length };
  }

  // recarrega o estado do IndexedDB (consistente nos dois modos)
  const all = await DB.loadAll();
  S.artists = all.artists.sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  S.songs = all.songs;
  S.lists = all.lists;
  return result;
}
