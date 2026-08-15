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
  fonteFilter: [],         // lente por fonte: grafias marcadas; [] = todas
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
  // folha de compartilhar (contextual, ⋯ da lista e do artista)
  // Vive só na sessão, como exportFontes: uma seleção que sobrevive ao fechar o
  // app vira um arquivo misteriosamente incompleto no próximo ensaio.
  shareSheet: null,        // { titulo, songIds:Set, listIds:Set|null, opcao, tamanhos }
  artistMenuOpen: false,
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
    fonteFilter: [],               // persiste entre sessões; podado no boot
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

// Filtro por fonte — o segundo eixo da lente global. Multisseleção: um
// conjunto de grafias marcadas, vazio = todas. O sentinela agrupa as músicas
// sem fonte; ele nunca colide com uma fonte de verdade, porque nome de fonte é
// o que o usuário digitou e passa por trim().
export const SEM_FONTE = '__sem_fonte';
export function fonteOf(s) { return ((s && s.fonte) || '').trim(); }

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
export function matchesFonte(s) { return fonteCasaAlguma(fonteOf(s), S.fonteFilter); }

// A grafia normalizada — a mesma regra de fonteCasa e de fontesSugeridas, isolada
// porque agora quatro funções dependem dela.
const chaveFonte = (nome) => String(nome || '').trim().toLowerCase();

// A versão de conjunto do fonteCasa. Deliberadamente uma função nova, e não um
// parâmetro a mais no fonteCasa: aquele serve o export filtrado e o apagar em
// lote, que passam UMA fonte e têm testes próprios contando com isso.
// Conjunto vazio = todas as fontes, e é isso que faz uma fonte importada amanhã
// entrar no resultado sem ninguém ir marcá-la.
export function fonteCasaAlguma(fonteDaMusica, filtros) {
  if (!filtros || !filtros.length) return true;
  return filtros.some((f) => fonteCasa(fonteDaMusica, f));
}

// A regra de clique da faixa de pílulas, pura para poder ser testada sem DOM.
// O primeiro clique a partir de "todas" ISOLA a fonte — é o gesto mais comum, e
// era o comportamento inteiro do filtro antigo. Daí em diante soma e remove.
// Dois caminhos voltam para "todas" (o array vazio): tirar a última marcada, e
// marcar todas as fontes que existem. O segundo importa porque "estas seis"
// envelheceria a cada import, e o array vazio não.
export function toggleFonte(atual, nome, daBiblioteca) {
  const marcadas = atual || [];
  const k = chaveFonte(nome);
  if (!marcadas.length) return [nome];
  const jaTem = marcadas.some((f) => chaveFonte(f) === k);
  const prox = jaTem ? marcadas.filter((f) => chaveFonte(f) !== k) : [...marcadas, nome];
  if (!prox.length) return [];
  const todas = (daBiblioteca || []).map((f) => chaveFonte(f.nome));
  const agora = new Set(prox.map(chaveFonte));
  if (todas.length && todas.every((f) => agora.has(f))) return [];
  return prox;
}

// A seleção salva guarda GRAFIAS, e a biblioteca muda debaixo dela — a fonte pode
// ter sido apagada em lote, ou o backup restaurado pode não trazê-la. Sem a poda,
// o app abriria numa biblioteca vazia sem pílula nenhuma explicando o porquê.
// Devolve as grafias DA BIBLIOTECA, não as salvas: assim uma fonte que mudou de
// grafia entre um import e outro se auto-corrige em vez de sumir.
export function podaFontes(salvas, daBiblioteca) {
  const porChave = new Map((daBiblioteca || []).map((f) => [chaveFonte(f.nome), f.nome]));
  const out = [];
  for (const s of salvas || []) {
    const nome = porChave.get(chaveFonte(s));
    if (nome && !out.includes(nome)) out.push(nome);
  }
  return out;
}

// A poda de podaFontes(), já lendo e escrevendo S: prune, persiste em
// S.settings.fonteFilter, salva. As mesmas três linhas apareciam copiadas em
// cinco lugares — boot, apagar por fonte, importar backup, e as duas onde
// FALTAVAM (apagar uma música avulsa, editar/salvar uma música) — e foi
// exatamente por serem cópia, e não uma função nomeada, que ninguém notou a
// falta. Lê S.fonteFilter como a seleção corrente: quem só tem a seleção nos
// settings recém-carregados (o boot) precisa copiá-la para S.fonteFilter antes
// de chamar.
export function podarFonteFilter() {
  S.fonteFilter = podaFontes(S.fonteFilter, fontesDaBiblioteca(S.songs));
  S.settings.fonteFilter = S.fonteFilter;
  saveSettings();
}

// Quantas músicas cada pílula representa. Três decisões moram aqui:
//
//   1. conta MÚSICAS mesmo na aba Artistas, onde os cards contam artistas — a
//      pílula tem que querer dizer a mesma coisa em toda aba;
//   2. aplica busca e lente de modos, mas NUNCA o próprio filtro de fonte: se
//      aplicasse, toda pílula não marcada mostraria zero;
//   3. o conjunto e a ordem saem de fontesDaBiblioteca(songs) — biblioteca
//      inteira, sem busca. Só o número reage ao que se digita, e é por isso que
//      dá para atualizar a faixa escrevendo só os contadores.
//
// nomeDoArtista é injetável porque artistName() lê S.artists, e o teste não pode.
export function contagensPorFonte(songs, opts = {}) {
  const { query = '', modeFilter = [], nomeDoArtista = artistName } = opts;
  const q = query.trim().toLowerCase();
  const conta = new Map();
  let total = 0;
  for (const s of songs || []) {
    if (q && !(s.title || '').toLowerCase().includes(q)
          && !nomeDoArtista(s).toLowerCase().includes(q)) continue;
    if (modeFilter.length) {
      const modos = modesOf(s);
      if (!modeFilter.every((f) => modos.includes(f))) continue;
    }
    total++;
    const k = fonteOf(s) ? chaveFonte(fonteOf(s)) : SEM_FONTE;
    conta.set(k, (conta.get(k) || 0) + 1);
  }
  const itens = fontesDaBiblioteca(songs)
    .map(({ nome }) => ({ nome, n: conta.get(chaveFonte(nome)) || 0 }));
  return { itens, total };
}

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
export function lensAtiva() { return S.modeFilter.length > 0 || S.fonteFilter.length > 0; }
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
  // A seleção salva guarda grafias, e a biblioteca pode ter mudado desde a última
  // sessão — uma fonte apagada em lote, um backup restaurado sem ela. Sem a poda o
  // app abriria numa biblioteca vazia sem nenhuma pílula explicando o porquê.
  // A fonte da seleção ainda não podada é S.settings (recém-carregado do disco),
  // não S.fonteFilter (que só tem o valor inicial []) — por isso a cópia antes
  // de chamar a função compartilhada.
  S.fonteFilter = S.settings.fonteFilter;
  podarFonteFilter();
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

// Apaga um conjunto de músicas de uma vez. O motor NÃO sabe o que é fonte:
// quem chama traduz o eixo dele para ids — songIdsDasFontes, para o eixo fonte.
//
// A ordem é deliberada: metadados primeiro, arquivos depois. A operação não é
// atômica (são várias transações mais um removeEntry por arquivo no OPFS), e se
// o navegador morrer no meio, o pior caso desta ordem é byte órfão ocupando
// espaço — invisível e recuperável. Na ordem inversa o pior caso seria música
// na biblioteca apontando para imagem e áudio que não existem mais.
//
// manterEmListas: os ids continuam nas listas, sem aparecer, e reimportar
// aquela fonte cura o repertório sozinho. É o modo do apagar-por-fonte. O
// padrão (false) poda, que é o que apagar uma música avulsa sempre fez: ali
// você matou AQUELA música, e ela não deve voltar sozinha.
export async function deleteSongs(ids, { manterEmListas = false } = {}) {
  const alvo = ids instanceof Set ? ids : new Set(ids || []);
  if (!alvo.size) return;
  const vitimas = S.songs.filter((s) => alvo.has(s.id));
  if (!vitimas.length) return;

  const blobs = blobIdsDasMusicas(vitimas);
  const orfaos = artistasOrfaos(S.songs, alvo);   // antes de mexer em S.songs

  if (!manterEmListas) {
    const mudadas = S.lists.filter((l) => l.musicas.some((id) => alvo.has(id)));
    if (mudadas.length) {
      // Grava as cópias podadas ANTES de mexer na memória. Se a escrita falhar,
      // a tela continua contando a verdade do disco em vez de mostrar as
      // músicas já fora da lista com um toast dizendo que deu errado.
      const podadas = mudadas.map((l) => ({ ...l, musicas: l.musicas.filter((id) => !alvo.has(id)) }));
      await DB.putLists(podadas);
      mudadas.forEach((l, i) => { l.musicas = podadas[i].musicas; });
    }
  }

  await DB.deleteSongs(alvo);
  S.songs = S.songs.filter((s) => !alvo.has(s.id));

  // Artista sem música nenhuma some da biblioteca: artista vazio é lixo para o
  // usuário apagar à mão.
  if (orfaos.length) {
    await DB.deleteArtists(orfaos);
    const fora = new Set(orfaos);
    S.artists = S.artists.filter((a) => !fora.has(a.id));
  }

  if (S.currentSongId && alvo.has(S.currentSongId)) S.currentSongId = null;

  for (const id of blobs) await DB.deleteBlob(id);
}

export function deleteSong(songId) { return deleteSongs([songId]); }

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
