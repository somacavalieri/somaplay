// export.test.js — o recorte que a exportação filtrada usa.
//
// O motor não sabe o que é fonte: recebe um conjunto de ids de música e um de
// ids de lista, e devolve as três coleções recortadas. É esse desenho que deixa
// "exportar este artista" e "exportar esta lista" entrarem depois sem mexer
// aqui.
//
// A asserção que mais importa é a primeira: com null nos dois, o recorte
// devolve a biblioteca inteira. É ela que garante que o backup completo — o
// caminho que todo usuário já usa hoje — não regrediu quando o filtro entrou.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recorteParaExport, recorteDeFontes, nomeDoExport, stampDeHoje, avisosDeSubstituir, conflitosDeNotas } from '../js/backup.js';
import { PARTES_TODAS } from '../js/partes.js';

// 'ar3' não tem música de propósito: sem ele, o teste do recorte nulo passaria
// mesmo se os artistas fossem filtrados, e a asserção que mais importa não
// poderia falhar. Ele é o que separa "devolveu tudo" de "filtrou e coube".
const lib = () => ({
  artists: [{ id: 'ar1', name: 'Gil' }, { id: 'ar2', name: 'Caetano' }, { id: 'ar3', name: 'Sem músicas' }],
  songs: [
    { id: 's1', artistId: 'ar1', fonte: 'Songbook' },
    { id: 's2', artistId: 'ar1', fonte: 'CifraClub' },
    { id: 's3', artistId: 'ar2', fonte: 'CifraClub' },
  ],
  lists: [
    { id: 'l1', nome: 'Show', musicas: ['s1', 's3'] },
    { id: 'l2', nome: 'Estudo', musicas: ['s2'] },
  ],
});

test('null nos dois campos devolve a biblioteca inteira', () => {
  const estado = lib();
  const r = recorteParaExport(estado, { songIds: null, listIds: null });
  assert.deepEqual(r.artists, estado.artists);
  assert.deepEqual(r.songs, estado.songs);
  assert.deepEqual(r.lists, estado.lists);
});

test('sem o segundo argumento, também devolve tudo', () => {
  const estado = lib();
  assert.deepEqual(recorteParaExport(estado).songs, estado.songs);
});

test('leva só as músicas do conjunto', () => {
  const r = recorteParaExport(lib(), { songIds: new Set(['s1']) });
  assert.deepEqual(r.songs.map((s) => s.id), ['s1']);
});

test('leva só os artistas que têm música no recorte', () => {
  const r = recorteParaExport(lib(), { songIds: new Set(['s1']) });
  assert.deepEqual(r.artists.map((a) => a.id), ['ar1']);
});

test('as listas viajam inteiras, com os ids órfãos preservados', () => {
  // 's3' fica de fora do recorte, mas continua na lista: quando a outra fonte
  // for importada, a lista se completa sozinha no destino.
  const r = recorteParaExport(lib(), { songIds: new Set(['s1']) });
  assert.deepEqual(r.lists.map((l) => l.id), ['l1', 'l2']);
  assert.deepEqual(r.lists[0].musicas, ['s1', 's3']);
});

test('listIds recorta as listas — é o que "exportar esta lista" vai usar', () => {
  const r = recorteParaExport(lib(), { songIds: null, listIds: new Set(['l1']) });
  assert.deepEqual(r.lists.map((l) => l.id), ['l1']);
});

test('conjunto vazio devolve recorte vazio, sem quebrar', () => {
  const r = recorteParaExport(lib(), { songIds: new Set() });
  assert.deepEqual(r.songs, []);
  assert.deepEqual(r.artists, []);
});

test('não muta o estado recebido', () => {
  const estado = lib();
  recorteParaExport(estado, { songIds: new Set(['s1']) });
  assert.equal(estado.songs.length, 3);
  assert.equal(estado.artists.length, 3);
});

test('tolera biblioteca com campos ausentes', () => {
  const r = recorteParaExport({}, { songIds: new Set(['s1']) });
  assert.deepEqual(r, { artists: [], songs: [], lists: [] });
});

// --- nome do arquivo -------------------------------------------------------
// Quatro arquivos chamados somaplay-backup-2026-08-11 na pasta de Downloads não
// servem para nada. O nome diz o recorte e, quando cifra e áudio se separam,
// diz também qual metade é esta.
const PALAVRAS = { cifras: 'cifras', audio: 'audio' };

test('sem recorte, o miolo é o de sempre', () => {
  assert.equal(recorteDeFontes(null, 'fontes'), 'backup');
  assert.equal(recorteDeFontes([], 'fontes'), 'backup');
});

test('uma fonte vira o nome dela; o slug tira acento e espaço', () => {
  assert.equal(recorteDeFontes(['Songbook'], 'fontes'), 'songbook');
  assert.equal(recorteDeFontes(['Coletâneas VJ'], 'fontes'), 'coletaneas-vj');
});

test('o balde sem fonte tem nome legível', () => {
  assert.equal(recorteDeFontes(['__sem_fonte'], 'fontes'), 'sem-fonte');
});

test('duas ou mais fontes viram a contagem, na língua do app', () => {
  assert.equal(recorteDeFontes(['A', 'B', 'C'], 'fontes'), '3-fontes');
  assert.equal(recorteDeFontes(['A', 'B'], 'sources'), '2-sources');
});

test('uma fonte que vira slug vazio cai no miolo genérico', () => {
  assert.equal(recorteDeFontes(['###'], 'fontes'), 'backup');
});

test('todas as partes não qualificam nada — o backup mantém o nome de hoje', () => {
  assert.equal(nomeDoExport('backup', '2026-08-15', PARTES_TODAS, PALAVRAS), 'somaplay-backup-2026-08-15.somaplay');
  assert.equal(nomeDoExport('backup', '2026-08-15', null, PALAVRAS), 'somaplay-backup-2026-08-15.somaplay');
  assert.equal(nomeDoExport('songbook', '2026-08-15', PARTES_TODAS, PALAVRAS), 'somaplay-songbook-2026-08-15.somaplay');
});

test('cifra e audio juntas também não qualificam', () => {
  assert.equal(nomeDoExport('show-sabado', '2026-08-15', ['cifra', 'audio'], PALAVRAS), 'somaplay-show-sabado-2026-08-15.somaplay');
});

test('cifra sozinha e audio sozinho viram sufixo', () => {
  assert.equal(nomeDoExport('show-sabado', '2026-08-15', ['cifra'], PALAVRAS), 'somaplay-show-sabado-cifras-2026-08-15.somaplay');
  assert.equal(nomeDoExport('show-sabado', '2026-08-15', ['audio'], PALAVRAS), 'somaplay-show-sabado-audio-2026-08-15.somaplay');
  assert.equal(nomeDoExport('songbook', '2026-08-15', ['cifra', 'pessoal'], PALAVRAS), 'somaplay-songbook-cifras-2026-08-15.somaplay');
});

test('tirar só o pessoal não muda o nome', () => {
  assert.equal(nomeDoExport('backup', '2026-08-15', ['cifra', 'audio'], PALAVRAS), 'somaplay-backup-2026-08-15.somaplay');
});

test('a palavra do sufixo vem traduzida de fora', () => {
  assert.equal(nomeDoExport('setlist', '2026-08-15', ['cifra'], { cifras: 'charts', audio: 'audio' }), 'somaplay-setlist-charts-2026-08-15.somaplay');
});

test('o nome de uma lista é slugado', () => {
  assert.equal(nomeDoExport('Show de Sábado!', '2026-08-15', PARTES_TODAS, PALAVRAS), 'somaplay-show-de-sabado-2026-08-15.somaplay');
});

test('recorte vazio cai no nome genérico', () => {
  assert.equal(nomeDoExport('', '2026-08-15', PARTES_TODAS, PALAVRAS), 'somaplay-backup-2026-08-15.somaplay');
});

test('o carimbo de data é zero-padded', () => {
  assert.equal(stampDeHoje(new Date(2026, 0, 5)), '2026-01-05');
});

// --- o aviso do substituir -------------------------------------------------
// "Substituir tudo" com um arquivo parcial apaga o que o arquivo não traz. É a
// leitura honesta de "substituir", mas é fácil de fazer sem querer e é
// irreversível. A função devolve NOMES DE CHAVE, não texto: assim ela é pura e
// o teste não depende da tabela de tradução.
//
// A armadilha que a função existe para fechar: um export sem `pessoal` e sem
// listas tem o MESMO NOME de um backup completo, porque nem `pessoal` nem as
// listas qualificam o nome. Meses depois não há como distinguir os dois na pasta
// de Downloads — a única defesa é este aviso.
const COMPLETO = { partes: PARTES_TODAS, lists: [{ id: 'l1' }] };

test('arquivo completo não gera aviso nenhum', () => {
  assert.deepEqual(avisosDeSubstituir(COMPLETO, { temListas: true }), []);
  assert.deepEqual(avisosDeSubstituir({ lists: [{ id: 'l1' }] }, { temListas: true }), []);
});

test('arquivo sem áudio avisa que o áudio some', () => {
  assert.deepEqual(avisosDeSubstituir({ ...COMPLETO, partes: ['cifra', 'pessoal'] }, { temListas: true }),
    ['msg.backup.replaceNoAudio']);
});

test('pacote só de áudio avisa que as cifras somem', () => {
  assert.deepEqual(avisosDeSubstituir({ ...COMPLETO, partes: ['audio', 'pessoal'] }, { temListas: true }),
    ['msg.backup.replaceNoCifra']);
});

// A regra que esta branch fabricou: antes dela todo .somaplay levava as
// favoritas, então substituir nunca as perdia. Agora perde, e em silêncio.
test('arquivo sem o pessoal avisa que favoritas e ajustes somem', () => {
  assert.deepEqual(avisosDeSubstituir({ partes: ['cifra', 'audio'], lists: [{ id: 'l1' }] }, { temListas: true }),
    ['msg.backup.replaceNoPessoal']);
});

test('arquivo sem lista avisa quando o aparelho tem listas', () => {
  assert.deepEqual(avisosDeSubstituir({ partes: PARTES_TODAS, lists: [] }, { temListas: true }),
    ['msg.backup.replaceNoLists']);
});

test('arquivo COM lista não gera o aviso de listas', () => {
  assert.deepEqual(avisosDeSubstituir({ partes: PARTES_TODAS, lists: [{ id: 'l1' }] }, { temListas: true }), []);
});

// Não há o que perder: quem nunca criou uma lista não pode ser avisado de que
// vai perder as suas.
test('arquivo sem lista NÃO avisa se o aparelho também não tem', () => {
  assert.deepEqual(avisosDeSubstituir({ partes: PARTES_TODAS, lists: [] }, { temListas: false }), []);
  assert.deepEqual(avisosDeSubstituir({ partes: PARTES_TODAS, lists: [] }), []);
});

test('os dois eixos se acumulam, na ordem do dano', () => {
  // O arquivo da folha de compartilhar, mais perigoso de todos: só cifras.
  assert.deepEqual(avisosDeSubstituir({ partes: ['cifra'], lists: [] }, { temListas: true }), [
    'msg.backup.replaceNoAudio',
    'msg.backup.replaceNoPessoal',
    'msg.backup.replaceNoLists',
  ]);
  assert.deepEqual(avisosDeSubstituir({ partes: ['audio'], lists: [] }, { temListas: true }), [
    'msg.backup.replaceNoCifra',
    'msg.backup.replaceNoPessoal',
    'msg.backup.replaceNoLists',
  ]);
});

test('um partes corrompido é lido como arquivo completo, não explode', () => {
  // Vale para qualquer coisa que não seja array: número, objeto, string.
  const lists = [{ id: 'l1' }];
  assert.deepEqual(avisosDeSubstituir({ partes: 42, lists }, { temListas: true }), []);
  assert.deepEqual(avisosDeSubstituir({ partes: {}, lists }, { temListas: true }), []);
  assert.deepEqual(avisosDeSubstituir({ partes: 'cifra', lists }, { temListas: true }), []);
});

test('lists malformado conta como "não traz lista"', () => {
  for (const lists of [undefined, null, 42, {}, 'l1']) {
    assert.deepEqual(avisosDeSubstituir({ partes: PARTES_TODAS, lists }, { temListas: true }),
      ['msg.backup.replaceNoLists'], String(lists));
  }
});

test('sem argumento nenhum a função é total', () => {
  // Roda ANTES do try do diálogo: quebrar aqui deixaria o import sem caminho.
  assert.deepEqual(avisosDeSubstituir(), []);
});

test('conflito so quando os dois lados tem anotacao e elas diferem', () => {
  const atuais = [
    { id: 'a', anotacoes: '<p>minha</p>' },
    { id: 'b', anotacoes: '<p>igual</p>' },
    { id: 'c' },
  ];
  const arq = [
    { id: 'a', anotacoes: '<p>do professor</p>' },
    { id: 'b', anotacoes: '<p>igual</p>' },
    { id: 'c', anotacoes: '<p>nova</p>' },
  ];
  assert.deepEqual(conflitosDeNotas(atuais, arq, ['cifra', 'anotacoes']), ['a']);
  assert.deepEqual(conflitosDeNotas(atuais, arq, ['cifra']), []);
  assert.deepEqual(conflitosDeNotas(atuais, arq, undefined), ['a']);
});
