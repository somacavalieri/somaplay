// merge.js — reconciliação de import com merge (upsert). Puro (sem DOM/DB), testável.
// Dado o estado atual e o manifesto de um backup, decide o que gravar (upsert por id),
// deduplicando artistas por nome e remapeando o artistId das músicas.
import { fundeMusica, normalizaPartes } from './partes.js';
import { fundeLivros } from './books.js';

// `agora` é o relógio do import, injetado para o módulo continuar puro. Um só
// por import, e não um Date.now() por música: um repertório importado junto tem
// que chegar junto no topo de Recentes, e não escorrer alguns milissegundos.
export function mergePlan(existing, incoming, agora = null) {
  const exArtists = (existing && existing.artists) || [];
  const exById = new Map(((existing && existing.songs) || []).map((s) => [s.id, s]));

  const byName = new Map();
  for (const a of exArtists) byName.set(a.name, a);

  const remap = {};
  const artists = [];
  for (const a of ((incoming && incoming.artists) || [])) {
    const ex = byName.get(a.name);
    if (ex) {
      if (ex.id !== a.id) remap[a.id] = ex.id;   // reusa o existente; não regrava
    } else {
      artists.push(a);
      byName.set(a.name, a);                       // dedup entre entradas do próprio backup
    }
  }

  // Quem normaliza é partes.js, dono do vocabulário: ausente OU corrompido
  // significa arquivo completo, e sem isso um `partes` que não é array derrubava
  // o merge aqui dentro.
  const partes = normalizaPartes(incoming && incoming.partes);

  // A música que sai daqui é a FUNDIDA, não a do arquivo: quem grava faz
  // DB.putSong(s), que substitui o registro inteiro, e é essa substituição que
  // apagava o áudio e as favoritas de quem recebia.
  const songs = ((incoming && incoming.songs) || []).map((s) => {
    const artistId = remap[s.artistId] || s.artistId;
    // Só reescreve artistId quando a música traz um: com `{ ...s, artistId }` a
    // chave passa a existir sempre, e a fusão gravaria `undefined` por cima do
    // artista que o aparelho já tinha.
    const doArquivo = 'artistId' in s ? { ...s, artistId } : s;
    return fundeMusica(exById.get(s.id) || null, doArquivo, partes, agora);
  });

  let added = 0;
  for (const s of songs) if (!exById.has(s.id)) added++;

  // Livro é coleção de topo, como lista: sem parte de música nenhuma para
  // fundir campo a campo. `fundeLivros` já é a regra inteira (mantém o que o
  // aparelho tem, soma o que é novo) — mergePlan só liga as duas pontas.
  //
  // Só funde quando o arquivo DECLARA falar de livro — o mesmo guard que
  // importLibrary já aplica ao dicionário de acordes e às configurações no
  // caminho de substituir. Sem ele, um pacote que nunca fala de `livros` mas
  // por acaso chega com `books` populado (uma exportação feita por outra
  // versão, um arquivo montado à mão) empurraria livros para dentro da estante
  // por um campo que o próprio arquivo não assumiu carregar.
  const livros = partes.includes('livros')
    ? fundeLivros((existing && existing.books) || [], (incoming && incoming.books) || [])
    : { books: (existing && existing.books) || [], added: 0 };

  return {
    artists,
    songs,
    lists: (incoming && incoming.lists) || [],
    books: livros.books,
    booksAdded: livros.added,
    added,
    updated: songs.length - added,
    remap,
  };
}
