// state.js — estado central + operações da biblioteca (write-through pro IndexedDB)
import { DB, uid, normalizaCifra } from './db.js';
import { AudioEngine } from './audio.js';
import { loadChordbook, songsUsingVar, shapeKey } from './chordbook.js';
import { setLang, detectLang } from './i18n.js';
import { clampSpeed } from './scroll-speed.js';

export const S = {
  // navegação
  screen: 'home',          // home | artist | list | play | addedit | settings | chordbook
  tab: 'artists',          // artists | songs | estilos | lists
  backTo: 'home',          // de onde a tela play foi aberta
  query: '',
  sort: 'title',           // title | artist | recent
  sortMenuOpen: false,
  modeFilter: [],          // lente global: subset de ['T2','T3']
  fonteFilter: null,       // lente por fonte: a grafia exibida | SEM_FONTE | null
  fonteMenuOpen: false,
  artistId: null,
  estiloId: null,          // estilo aberto (o nome do estilo é a chave)
  openListId: null,        // id da lista aberta ('__fav' = Favoritas)
  listMenuOpen: false,
  creatingList: false,
  renamingList: false,

  // dicionário de acordes
  cbQuery: '',
  cbFilter: null,          // tônica filtrada (A..G) ou null
  cbAdding: false,         // campo "novo acorde" aberto

  // popover adicionar-à-lista
  popoverSongId: null,
  importMode: 'replace',   // replace | merge — modo do próximo import de backup
  exportFontes: null,      // seleção do export: null = todas | array de grafias

  // biblioteca (cache em memória, espelho do IDB)
  artists: [],
  songs: [],
  lists: [],

  // tela de toque
  currentSongId: null,
  viewMode: 'cifra',       // cifra | karaoke
  t2Source: 'stems',
  mixerCollapsed: false,
  scrollPlaying: false,
  scrollSpeed: 3,
  imgZoom: 1,
  imgInvert: false,
  imgVariant: 'aberta',
  imgMenuOpen: false,
  ctlVisible: true,
  chordFavs: {},           // songId -> [acorde]
  chordPicker: null,       // nome do acorde com o seletor de variação aberto
  chordPop: null,          // popover do acorde tocado na cifra: { name, anchor, modo:'mini'|'carrossel', selId, scrollTop }
  pinnedOpen: true,
  transportPlaying: false,
  position: 0,
  duration: 0,

  // edição
  editSongId: null,        // null = novo
  draft: null,             // rascunho da tela adicionar/editar
  chordEd: null,           // estado do editor de casas (render/chordeditor.js)

  // configurações
  settings: {
    theme: 'dark', awake: true, cifraZoom: 110, defaultSpeed: 3, masterVol: 80,
    cifraMiniaturas: false,
    lang: null,                    // null = ainda não resolvido; boot() detecta
    chordNotation: null,           // null = segue o idioma
    chordNotationTouched: false,   // true depois que o usuário mexe na notação
  },
};

export const audio = new AudioEngine();

// ---------- helpers de biblioteca ----------
export function artistById(id) { return S.artists.find((a) => a.id === id) || null; }
export function songById(id) { return S.songs.find((s) => s.id === id) || null; }
// Id órfão numa lista existe de propósito: um export por fonte leva a lista
// inteira, e as músicas que faltam chegam quando a outra fonte for importada.
// Até lá o contador não pode prometer o que a tela não mostra.
export function musicasPresentes(l) {
  return ((l && l.musicas) || []).filter((id) => songById(id));
}
// Os índices REAIS das músicas que a tela mostra, na ordem em que aparecem: a
// ponte entre a POSIÇÃO VISÍVEL — o que o dedo arrasta, o que data-idx carrega —
// e o índice que moveItem move. Com um id órfão as duas coisas se separam, e sem
// esta tradução o arraste reordena a música errada.
export function indicesPresentes(l) {
  return ((l && l.musicas) || []).map((id, i) => (songById(id) ? i : -1)).filter((i) => i >= 0);
}
export function songsOfArtist(artistId) {
  return S.songs.filter((s) => s.artistId === artistId)
    .sort((a, b) => a.title.localeCompare(b.title, 'pt'));
}
export function artistName(song) { const a = artistById(song.artistId); return a ? a.name : '?'; }

// Estilo musical (um por música; sem estilo → "Sem estilo")
export const SEM_ESTILO = 'Sem estilo';
export function estiloOf(s) { return (s && s.estilo && s.estilo.trim()) || SEM_ESTILO; }
export function songsOfEstilo(estilo) {
  return S.songs.filter((s) => estiloOf(s) === estilo)
    .sort((a, b) => a.title.localeCompare(b.title, 'pt'));
}

// Fonte da cifra: de onde ela veio. Os atalhos do formulário não são uma lista
// escrita à mão — CifraClub e Songbook são fixos porque são os valores do
// preenchimento automático por tipo de cifra, e o resto vem do que a biblioteca
// já usa. Dedupe por grafia: "cifraclub" e "CifraClub" são a mesma fonte, e a
// primeira grafia encontrada é a que aparece. O registro salvo nunca é reescrito.
export const FONTES_FIXAS = ['CifraClub', 'Songbook'];
export function fontesSugeridas(songs, limit = 8) {
  const chave = (nome) => nome.trim().toLowerCase();
  const fixas = new Set(FONTES_FIXAS.map(chave));
  const usadas = new Map(); // chave → { nome, n }
  for (const s of songs || []) {
    const nome = ((s && s.fonte) || '').trim();
    if (!nome || fixas.has(chave(nome))) continue;
    const jaVista = usadas.get(chave(nome));
    if (jaVista) jaVista.n += 1;
    else usadas.set(chave(nome), { nome, n: 1 });
  }
  const resto = [...usadas.values()]
    .sort((a, b) => b.n - a.n || a.nome.localeCompare(b.nome, 'pt'))
    .map((f) => f.nome);
  return [...FONTES_FIXAS, ...resto].slice(0, limit);
}

// Filtro por fonte — o segundo eixo da lente global. O sentinela agrupa as
// músicas sem fonte; ele nunca colide com uma fonte de verdade, porque nome de
// fonte é o que o usuário digitou e passa por trim().
export const SEM_FONTE = '__sem_fonte';
export function fonteOf(s) { return ((s && s.fonte) || '').trim(); }

// Cor do badge de fonte (spec 2026-08-12-lista-compacta): índice 0–4 estável
// por NOME — não por ranking de uso, que dançaria a cada import. Hash do
// lowercase porque "cifraclub" e "CifraClub" são a mesma fonte pela regra de
// dedupe. djb2 (h*33+c), e não djb2a (h*33^c): é a variante que separa os
// três nomes reais do acervo — cifraclub→1 (âmbar), songbook→2 (teal),
// vj→4 (neutro), exatamente as cores do mockup. Paleta em .src-badge.f0–.f4.
export function corDaFonte(nome) {
  const s = (nome || '').trim().toLowerCase();
  let h = 5381;
  for (const c of s) h = ((h * 33) + c.codePointAt(0)) >>> 0;
  return h % 5;
}

// As fontes que a biblioteca realmente usa, mais usadas primeiro, desempate
// alfabético — determinístico, e portanto testável. Sem fontes fixas, ao
// contrário de fontesSugeridas: um filtro que não casa com nada só entrega uma
// tela vazia. Recebe songs por parâmetro para o teste não tocar em S.
export function fontesDaBiblioteca(songs) {
  const chave = (nome) => nome.toLowerCase();
  const usadas = new Map(); // chave → { nome, n }
  let semFonte = 0;
  for (const s of songs || []) {
    const nome = fonteOf(s);
    if (!nome) { semFonte++; continue; }
    const jaVista = usadas.get(chave(nome));
    if (jaVista) jaVista.n += 1;
    else usadas.set(chave(nome), { nome, n: 1 });
  }
  const out = [...usadas.values()]
    .sort((a, b) => b.n - a.n || a.nome.localeCompare(b.nome, 'pt'));
  if (semFonte) out.push({ nome: SEM_FONTE, n: semFonte });
  return out;
}

// Pura: os dois lados vêm por parâmetro. Filtro nulo = sem filtro.
export function fonteCasa(fonteDaMusica, filtro) {
  if (!filtro) return true;
  const nome = (fonteDaMusica || '').trim();
  if (filtro === SEM_FONTE) return !nome;
  return nome.toLowerCase() === filtro.trim().toLowerCase();
}
export function matchesFonte(s) { return fonteCasa(fonteOf(s), S.fonteFilter); }

// O motor de exportação não sabe o que é fonte: ele recebe um conjunto de ids
// de música. Esta é a função que traduz o eixo "fonte" nesse conjunto, e é o
// lugar onde um eixo novo (artista, lista) entraria sem tocar em backup.js.
// A comparação é fonteCasa, a mesma da lente: "songbook" e "Songbook " são a
// mesma fonte. Uma fonte marcada que sumiu da biblioteca não contribui.
export function songIdsDasFontes(songs, fontes) {
  const escolhidas = fontes || [];
  const out = new Set();
  for (const s of songs || []) {
    if (escolhidas.some((f) => fonteCasa(fonteOf(s), f))) out.add(s.id);
  }
  return out;
}

// Os arquivos que estas músicas levam junto quando somem. Também é o que o
// export precisa saber para montar o pacote — uma definição só de "quais blobs
// são desta música", para nenhuma das duas esquecer um campo novo de mídia.
export function blobIdsDasMusicas(songs) {
  const out = [];
  for (const s of songs) {
    (s.cifra?.imagens || []).forEach((im) => im && im.blobId && out.push(im.blobId));
    (s.stems || []).forEach((st) => st && st.blobId && out.push(st.blobId));
    (s.full || []).forEach((f) => f && f.blobId && out.push(f.blobId));
  }
  return out;
}

// Quem fica sem NENHUMA música depois de apagar `ids` (um Set). Uma passada
// sobre a biblioteca inteira, e não um `S.songs.some()` por música apagada:
// com 5 mil ids a segunda forma é O(n²) e trava o app.
export function artistasOrfaos(songs, ids) {
  const vivos = new Set();
  const tocados = new Set();
  for (const s of songs) {
    if (!s.artistId) continue;
    if (ids.has(s.id)) tocados.add(s.artistId); else vivos.add(s.artistId);
  }
  return [...tocados].filter((a) => !vivos.has(a));
}

// Duas músicas do mesmo artista com o mesmo título são indistinguíveis na
// listagem. A fonte é o que as separa — mas mostrar fonte em toda linha polui a
// biblioteca inteira, que é majoritariamente de títulos únicos. Então ela
// aparece SÓ na colisão: fora dela o qualificador é '' e a linha não muda.
//
// O separador U+0001 impede que ('gil','x y') e ('gil x','y') virem a mesma chave.
export function chaveDeColisao(song) {
  const artista = (song && song.artistId) || '';
  const titulo = ((song && song.title) || '').trim().toLowerCase();
  return `${artista}\u0001${titulo}`;
}

// O qualificador de exibição. Nunca é concatenado ao título: quem renderiza põe
// num elemento separado, senão a busca e a ordenação passariam a enxergar a
// fonte — que é exatamente o defeito do sufixo '(v2)' que isto substitui.
//
// Três saídas possíveis dentro de uma colisão:
//   'CifraClub'  → a fonte, o caso normal;
//   SEM_FONTE    → esta não tem fonte mas alguma colidida tem (biblioteca antiga);
//   '1','2',…    → NENHUMA das colididas tem fonte. Feio de propósito: é um
//                  convite a preencher a fonte, e o único caso em que o usuário
//                  não tem outra forma de distinguir as duas.
export function qualificadorDe(song, songs) {
  if (!song) return '';
  const chave = chaveDeColisao(song);
  const colididas = (songs || []).filter((s) => chaveDeColisao(s) === chave);
  if (colididas.length < 2) return '';

  const minha = fonteOf(song);
  if (minha) return minha;
  if (colididas.some((s) => fonteOf(s))) return SEM_FONTE;

  // Ordem estável: createdAt e, no empate, id — para o número nunca dançar
  // entre dois renders.
  const ordenadas = colididas.slice().sort((a, b) =>
    (a.createdAt || 0) - (b.createdAt || 0) || String(a.id).localeCompare(String(b.id)));
  return String(ordenadas.findIndex((s) => s.id === song.id) + 1);
}

// Modos disponíveis de uma música (T1 = sempre; T2 = tem áudio; T3 = tem letra)
export function modesOf(s) {
  const m = ['T1'];
  if ((s.stems && s.stems.length) || (s.full && s.full.length)) m.push('T2');
  if (s.letra && s.letra.trim()) m.push('T3');
  return m;
}
// A lente global tem dois eixos: modo (T2/T3) e fonte. Toda tela que lista
// música passa por aqui — Home, tela do artista, tela do estilo.
export function matchesLens(s) {
  if (!matchesFonte(s)) return false;
  if (!S.modeFilter.length) return true;
  const m = modesOf(s);
  return S.modeFilter.every((f) => m.includes(f));
}
// Há algum eixo da lente ligado? Os contadores usam isto para decidir se
// explicam o recorte.
export function lensAtiva() { return S.modeFilter.length > 0 || S.fonteFilter !== null; }
export function bestLabel(s) {
  return modesOf(s).includes('T2') ? 'Cifra + acompanhamento' : 'Cifra';
}

// ---------- inicialização ----------
export async function initState() {
  await DB.init();
  const lib = await DB.loadAll();
  S.artists = lib.artists.sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  S.songs = lib.songs;
  S.lists = lib.lists;
  await loadChordbook();
  const st = await DB.loadSettings();
  if (st) { delete st.key; S.settings = { ...S.settings, ...st }; }
  // a escala da rolagem tinha 10 níveis; um valor antigo acima do topo vira o topo
  S.settings.defaultSpeed = clampSpeed(S.settings.defaultSpeed);
  if (!S.settings.lang) S.settings.lang = detectLang(navigator.language);
  if (!S.settings.chordNotation) S.settings.chordNotation = S.settings.lang === 'pt' ? 'br' : 'intl';
  setLang(S.settings.lang);
  saveSettings();
  S.scrollSpeed = clampSpeed(S.settings.defaultSpeed);
  applyTheme();
}

export function applyTheme() {
  document.documentElement.dataset.theme = S.settings.theme;
  const meta = document.querySelector('meta[name=theme-color]');
  if (meta) meta.content = S.settings.theme === 'light' ? '#F1EFEA' : '#0E0E11';
}

export function saveSettings() { DB.saveSettings(S.settings); }

// ---------- mutações ----------
export async function upsertArtist(name) {
  const found = S.artists.find((a) => a.name.toLowerCase() === name.toLowerCase());
  if (found) return found;
  const a = { id: uid(), name, av: S.artists.length % 2 === 0 ? 'amber' : 'teal' };
  S.artists.push(a);
  S.artists.sort((x, y) => x.name.localeCompare(y.name, 'pt'));
  await DB.putArtist(a);
  return a;
}

export async function saveSong(song) {
  const normalized = normalizaCifra(song);
  const i = S.songs.findIndex((s) => s.id === normalized.id);
  if (i >= 0) S.songs[i] = normalized; else S.songs.push(normalized);
  await DB.putSong(normalized);
}

export async function deleteSong(songId) {
  const song = songById(songId);
  if (!song) return;
  // apaga blobs
  const blobIds = [];
  (song.cifra?.imagens || []).forEach((im) => blobIds.push(im.blobId));
  (song.stems || []).forEach((st) => blobIds.push(st.blobId));
  (song.full || []).forEach((f) => blobIds.push(f.blobId));
  for (const id of blobIds.filter(Boolean)) await DB.deleteBlob(id);
  // remove de todas as listas (§7)
  for (const l of S.lists) {
    if (l.musicas.includes(songId)) {
      l.musicas = l.musicas.filter((x) => x !== songId);
      await DB.putList(l);
    }
  }
  S.songs = S.songs.filter((s) => s.id !== songId);
  await DB.deleteSong(songId);
  // artista sem músicas some da biblioteca
  const remaining = S.songs.some((s) => s.artistId === song.artistId);
  if (!remaining) {
    S.artists = S.artists.filter((a) => a.id !== song.artistId);
    await DB.deleteArtist(song.artistId);
  }
}

export function toggleFav(songId) {
  const s = songById(songId);
  if (!s) return;
  s.favorita = !s.favorita;
  DB.putSong(s);
}

export async function createList(nome, withSongId) {
  const l = { id: uid(), nome, fixada: false, musicas: withSongId ? [withSongId] : [] };
  S.lists.push(l);
  await DB.putList(l);
  return l;
}
export function listById(id) { return S.lists.find((l) => l.id === id) || null; }
export function toggleSongInList(listId, songId) {
  const l = listById(listId);
  if (!l) return;
  l.musicas = l.musicas.includes(songId) ? l.musicas.filter((x) => x !== songId) : [...l.musicas, songId];
  DB.putList(l);
}
// Move um item de posição devolvendo uma cópia — não muta a entrada.
export function moveItem(arr, from, to) {
  const out = arr.slice();
  const [x] = out.splice(from, 1);
  out.splice(to, 0, x);
  return out;
}

export function reorderInList(listId, from, to) {
  const l = listById(listId);
  if (!l) return;
  const n = l.musicas.length;
  if (from === to || from < 0 || to < 0 || from >= n || to >= n) return;
  l.musicas = moveItem(l.musicas, from, to);
  DB.putList(l);
}

// Propaga a forma para as músicas que apontam para aquela variação. Devolve quantas mudaram.
export async function applyVarToSongs(name, varId, shape) {
  let n = 0;
  for (const s of songsUsingVar(S.songs, name, varId)) {
    const cur = s.cifra.digitacoes[name];
    if (shapeKey(cur) === shapeKey(shape)) continue;
    s.cifra.digitacoes = {
      ...s.cifra.digitacoes,
      [name]: { frets: shape.frets.slice(), ...(shape.barre ? { barre: { ...shape.barre } } : {}), varId },
    };
    await saveSong(s);
    n++;
  }
  return n;
}

// "Favoritas" — lista virtual de sistema
export function favList() {
  return {
    id: '__fav', nome: 'Favoritas', sistema: true, fixada: false,
    musicas: S.songs.filter((s) => s.favorita).map((s) => s.id),
  };
}

// ---------- tela de toque ----------
export function openSong(songId, from) {
  const s = songById(songId);
  if (!s) return;
  const modes = modesOf(s);
  const wantKaraoke = S.modeFilter.includes('T3') && modes.includes('T3') && from !== 'list';
  S.currentSongId = songId;
  S.backTo = from || 'home';
  S.screen = 'play';
  S.viewMode = wantKaraoke ? 'karaoke' : 'cifra';
  S.t2Source = (s.stems && s.stems.length) ? 'stems' : (s.full && s.full[0] ? s.full[0].id : 'stems');
  S.mixerCollapsed = false;
  S.scrollPlaying = false;
  S.scrollSpeed = clampSpeed(S.settings.defaultSpeed);
  S.imgZoom = 1;
  S.imgInvert = false;
  S.imgVariant = 'aberta';
  S.imgMenuOpen = false;
  S.ctlVisible = true;
  S.pinnedOpen = true;
  S.transportPlaying = false;
  S.position = 0;
  S.duration = 0;
}

export function currentSong() { return songById(S.currentSongId); }

// Persiste vol/mute dos stems da música atual (debounced)
let _stemSaveTimer = null;
export function persistCurrentStems() {
  clearTimeout(_stemSaveTimer);
  _stemSaveTimer = setTimeout(() => {
    const s = currentSong();
    if (s) DB.putSong(s);
  }, 600);
}
