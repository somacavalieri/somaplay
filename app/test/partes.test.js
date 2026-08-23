// partes.test.js — o vocabulário de "sobre o que este arquivo fala".
//
// A asserção que mais importa é a primeira: com todas as partes, o registro sai
// IDÊNTICO. É ela que garante que o backup completo — o caminho que todo
// usuário já usa — não regrediu quando as partes entraram.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { podaPorPartes, fundeMusica, normalizaPartes, PARTES_TODAS, PARTES_DE_MUSICA, CAMPOS } from '../js/partes.js';
import { blobIdsDasMusicas } from '../js/state.js';

const musica = () => ({
  id: 's1', artistId: 'ar1', title: 'Aquele Abraço',
  tom: 'D', estilo: 'Samba', fonte: 'Songbook', letra: 'la la',
  cifra: { tipo: 'texto', imagens: [{ blobId: 'img1' }], texto: 'D A7', acordes: ['D'], digitacoes: {} },
  stems: [{ blobId: 'aud1', name: 'violao', vol: 60, mute: false }],
  full: [{ id: 'f1', blobId: 'aud2' }],
  favorita: true, createdAt: 1700000000000,
});

test('todas as partes devolvem o registro idêntico', () => {
  const m = musica();
  assert.deepEqual(podaPorPartes([m], PARTES_TODAS), [m]);
});

test('partes nulo significa todas', () => {
  const m = musica();
  assert.deepEqual(podaPorPartes([m], null), [m]);
});

test('a identidade viaja em qualquer parte', () => {
  for (const p of PARTES_TODAS) {
    const [out] = podaPorPartes([musica()], [p]);
    assert.equal(out.id, 's1');
    assert.equal(out.artistId, 'ar1');
    assert.equal(out.title, 'Aquele Abraço');
  }
});

test('cifra leva o conteúdo e não leva áudio nem pessoal', () => {
  const [out] = podaPorPartes([musica()], ['cifra']);
  assert.equal(out.tom, 'D');
  assert.equal(out.estilo, 'Samba');
  assert.equal(out.fonte, 'Songbook');
  assert.equal(out.letra, 'la la');
  assert.equal(out.cifra.texto, 'D A7');
  assert.ok(!('stems' in out));
  assert.ok(!('full' in out));
  assert.ok(!('favorita' in out));
  assert.ok(!('createdAt' in out));
});

test('audio leva os stems com a mixagem dentro', () => {
  const [out] = podaPorPartes([musica()], ['audio']);
  assert.deepEqual(out.stems, [{ blobId: 'aud1', name: 'violao', vol: 60, mute: false }]);
  assert.deepEqual(out.full, [{ id: 'f1', blobId: 'aud2' }]);
  assert.ok(!('cifra' in out));
  assert.ok(!('letra' in out));
  assert.ok(!('estilo' in out));
  assert.ok(!('fonte' in out));
  assert.ok(!('favorita' in out));
});

test('pessoal leva só favorita e createdAt', () => {
  const [out] = podaPorPartes([musica()], ['pessoal']);
  assert.equal(out.favorita, true);
  assert.equal(out.createdAt, 1700000000000);
  assert.ok(!('cifra' in out));
  assert.ok(!('stems' in out));
});

test('cifra + audio é o compartilhar pesado: tudo menos o pessoal', () => {
  const [out] = podaPorPartes([musica()], ['cifra', 'audio']);
  assert.ok('cifra' in out);
  assert.ok('stems' in out);
  assert.ok(!('favorita' in out));
});

test('campo ausente na música não vira undefined no recorte', () => {
  const [out] = podaPorPartes([{ id: 's2', artistId: 'ar1', title: 'X' }], ['cifra']);
  assert.deepEqual(out, { id: 's2', artistId: 'ar1', title: 'X' });
});

test('lista vazia e entradas ausentes não quebram', () => {
  assert.deepEqual(podaPorPartes([], ['cifra']), []);
  assert.deepEqual(podaPorPartes(null, ['cifra']), []);
  assert.deepEqual(podaPorPartes([musica()], []).length, 1);
});

test('não muta a música recebida', () => {
  const m = musica();
  podaPorPartes([m], ['audio']);
  assert.equal(m.cifra.texto, 'D A7');
  assert.equal(m.favorita, true);
});

// --- podar primeiro, coletar depois ----------------------------------------
// A composição inteira da feature em duas linhas. blobIdsDasMusicas NÃO ganhou
// um parâmetro `partes` — ela é a definição única de "quais blobs são desta
// música", e um segundo eixo de verdade ali é como apagar e exportar passam a
// discordar. O que faz o arquivo leve encolher é a ORDEM: a poda tira
// cifra.imagens, e aí a função existente naturalmente não acha imagem nenhuma.
test('o pacote de áudio não leva nenhum blob de imagem', () => {
  const ids = blobIdsDasMusicas(podaPorPartes([musica()], ['audio']));
  assert.deepEqual(ids, ['aud1', 'aud2']);
  assert.ok(!ids.includes('img1'));
});

test('o arquivo de cifras não leva nenhum blob de áudio', () => {
  const ids = blobIdsDasMusicas(podaPorPartes([musica()], ['cifra']));
  assert.deepEqual(ids, ['img1']);
  assert.ok(!ids.includes('aud1'));
  assert.ok(!ids.includes('aud2'));
});

// --- a normalização do vocabulário -----------------------------------------
// Uma guarda só, no módulo dono das partes, em vez de uma por leitor — e o
// merge era justamente o quarto leitor que não tinha a sua.
test('o que não é lista de partes significa arquivo completo', () => {
  assert.equal(normalizaPartes(null), PARTES_TODAS);
  assert.equal(normalizaPartes(undefined), PARTES_TODAS);
  assert.equal(normalizaPartes(42), PARTES_TODAS);
  assert.equal(normalizaPartes({}), PARTES_TODAS);
  assert.equal(normalizaPartes('cifra'), PARTES_TODAS);
});

test('uma lista de partes passa intacta, inclusive vazia', () => {
  const ps = ['cifra'];
  assert.equal(normalizaPartes(ps), ps);
  assert.deepEqual(normalizaPartes([]), []);
});

test('nenhum leitor quebra com um partes corrompido', () => {
  assert.deepEqual(podaPorPartes([musica()], 42), [musica()]);
  assert.equal(fundeMusica(null, musica(), 'lixo').tom, 'D');
});

// --- a fusão -------------------------------------------------------------
// A regra inteira: um campo de parte NÃO declarada nunca é tocado. É o que faz
// o pacote de áudio sobreviver a um arquivo leve importado depois, e as
// favoritas de quem recebe sobreviverem a uma atualização de repertório.
const CIFRA_VAZIA = { tipo: null, imagens: [], texto: '', acordes: [], digitacoes: {} };

test('arquivo leve não encosta no áudio que já existe', () => {
  const atual = musica();
  const leve = { id: 's1', artistId: 'ar1', title: 'Aquele Abraço', tom: 'E', cifra: { tipo: 'texto', texto: 'E B7' } };
  const out = fundeMusica(atual, leve, ['cifra']);
  assert.equal(out.tom, 'E');
  assert.equal(out.cifra.texto, 'E B7');
  assert.deepEqual(out.stems, atual.stems);
});

test('arquivo compartilhado não encosta nas favoritas de quem recebe', () => {
  const atual = { ...musica(), favorita: true };
  const compartilhado = { id: 's1', artistId: 'ar1', title: 'Aquele Abraço', favorita: false, tom: 'E' };
  const out = fundeMusica(atual, compartilhado, ['cifra']);
  assert.equal(out.favorita, true);
  assert.equal(out.tom, 'E');
});

test('pacote de áudio não encosta na cifra que já existe', () => {
  const atual = musica();
  const pacote = { id: 's1', artistId: 'ar1', title: 'Aquele Abraço', stems: [{ blobId: 'novo', vol: 80 }] };
  const out = fundeMusica(atual, pacote, ['audio']);
  assert.deepEqual(out.stems, [{ blobId: 'novo', vol: 80 }]);
  assert.equal(out.cifra.texto, 'D A7');
  assert.equal(out.letra, 'la la');
});

test('backup completo sobrescreve tudo', () => {
  const atual = musica();
  const doBackup = { ...musica(), tom: 'G', favorita: false, stems: [] };
  const out = fundeMusica(atual, doBackup, PARTES_TODAS);
  assert.equal(out.tom, 'G');
  assert.equal(out.favorita, false);
  assert.deepEqual(out.stems, []);
});

// A simétrica da primeira asserção deste arquivo, e a que faltava. Na volta
// também: restaurar um backup completo tem que devolver o registro INTEIRO. O
// campo `velocidade` não está em IDENTIDADE nem em CAMPOS de propósito — é o
// próximo campo que alguém vai adicionar à música, vai vê-lo sobreviver ao
// arquivo, e nunca vai vê-lo sumir na volta. No modo substituir `atual` é sempre
// null (o DB.wipe() já rodou), então era exatamente aí que ele sumiria.
test('todas as partes devolvem o registro idêntico, também na fusão', () => {
  const m = { ...musica(), velocidade: 42 };
  assert.deepEqual(fundeMusica(null, m, PARTES_TODAS), m);
  assert.equal(fundeMusica(null, m, PARTES_TODAS).velocidade, 42);
  assert.equal(fundeMusica(null, m, null).velocidade, 42);
});

test('um recorte parcial continua levando só o que declara', () => {
  const m = { ...musica(), velocidade: 42 };
  assert.ok(!('velocidade' in fundeMusica(null, m, ['cifra'])));
});

test('música nova de pacote de áudio nasce com cifra VAZIA, nunca ausente', () => {
  const pacote = { id: 'novo', artistId: 'ar1', title: 'Refazenda', stems: [{ blobId: 'a' }] };
  const out = fundeMusica(null, pacote, ['audio']);
  assert.deepEqual(out.cifra, CIFRA_VAZIA);
  assert.deepEqual(out.stems, [{ blobId: 'a' }]);
});

test('música nova de arquivo leve mantém a cifra que veio', () => {
  const leve = { id: 'novo', artistId: 'ar1', title: 'Refazenda', cifra: { tipo: 'texto', texto: 'C G' } };
  const out = fundeMusica(null, leve, ['cifra']);
  assert.equal(out.cifra.texto, 'C G');
});

// A PROPRIEDADE que sustenta a extensão: as duas ordens chegam no mesmo lugar.
// Se este teste cair, o pacote de áudio deixou de ser uma extensão.
test('leve→pacote e pacote→leve chegam no mesmo registro', () => {
  const leve = { id: 's9', artistId: 'ar1', title: 'Domingo no Parque', tom: 'A', cifra: { tipo: 'texto', texto: 'A E' }, letra: 'oi', estilo: 'MPB', fonte: 'VJ' };
  const pacote = { id: 's9', artistId: 'ar1', title: 'Domingo no Parque', stems: [{ blobId: 'x', vol: 70 }], full: [] };

  const leveDepoisPacote = fundeMusica(fundeMusica(null, leve, ['cifra']), pacote, ['audio']);
  const pacoteDepoisLeve = fundeMusica(fundeMusica(null, pacote, ['audio']), leve, ['cifra']);

  assert.deepEqual(leveDepoisPacote, pacoteDepoisLeve);
  assert.equal(leveDepoisPacote.cifra.texto, 'A E');
  assert.deepEqual(leveDepoisPacote.stems, [{ blobId: 'x', vol: 70 }]);
});

test('partes vazio não explode: só a identidade e a invariante da cifra', () => {
  const out = fundeMusica(null, { id: 'z', artistId: 'a', title: 'T', tom: 'C' }, []);
  assert.equal(out.id, 'z');
  assert.ok(!('tom' in out));
  assert.deepEqual(out.cifra, CIFRA_VAZIA);
});

test('não reescreve propriedade de nenhum dos dois lados', () => {
  const atual = musica();
  const doArquivo = { id: 's1', artistId: 'ar1', title: 'Novo', stems: [{ blobId: 'z' }] };
  const out = fundeMusica(atual, doArquivo, ['audio']);
  assert.equal(atual.title, 'Aquele Abraço');
  assert.deepEqual(atual.stems, [{ blobId: 'aud1', name: 'violao', vol: 60, mute: false }]);
  assert.equal(doArquivo.title, 'Novo');
  assert.deepEqual(doArquivo.stems, [{ blobId: 'z' }]);
  assert.equal(out.title, 'Novo');
});

// --- a data de quem recebe -------------------------------------------------
// `createdAt` é "quando EU adicionei", e por isso mora em `pessoal` e não viaja
// num compartilhamento. Sem alguém preencher o buraco na chegada, a música entra
// sem data nenhuma — e a aba Recentes ordena por `(b.createdAt || 0)`, o que
// joga o repertório inteiro para o FIM da lista, na época zero. É a mentira que
// a spec queria evitar, ao contrário. O relógio chega de fora para a função
// continuar pura.
const AGORA = 1800000000000;

test('música nova de arquivo compartilhado chega com a data de hoje', () => {
  const leve = { id: 'novo', artistId: 'ar1', title: 'Refazenda', cifra: { tipo: 'texto', texto: 'C G' } };
  assert.equal(fundeMusica(null, leve, ['cifra'], AGORA).createdAt, AGORA);
});

test('a data do arquivo ganha da de hoje: um backup completo restaura a original', () => {
  const doBackup = { ...musica(), createdAt: 1700000000000 };
  assert.equal(fundeMusica(null, doBackup, PARTES_TODAS, AGORA).createdAt, 1700000000000);
  assert.equal(fundeMusica(null, doBackup, ['pessoal'], AGORA).createdAt, 1700000000000);
});

test('a data de quem já tinha a música nunca é reescrita por um compartilhamento', () => {
  const atual = musica();                       // createdAt: 1700000000000
  const leve = { id: 's1', artistId: 'ar1', title: 'Aquele Abraço', tom: 'E' };
  assert.equal(fundeMusica(atual, leve, ['cifra'], AGORA).createdAt, 1700000000000);
});

test('sem relógio a fusão fica como era: nada de data inventada', () => {
  const leve = { id: 'novo', artistId: 'ar1', title: 'Refazenda' };
  assert.ok(!fundeMusica(null, leve, ['cifra']).createdAt);
});

// O contrato, afirmado em vez de suposto: a fusão é RASA. Quem chama grava e
// descarta — DB.putSong clona ao entrar no IndexedDB e o import recarrega
// S.songs do disco logo depois. Este teste existe para que trocar a fusão por
// uma cópia profunda seja uma decisão consciente, e não um acidente silencioso.
test('o registro devolvido compartilha as estruturas aninhadas com as entradas', () => {
  const atual = musica();
  const pacote = { id: 's1', artistId: 'ar1', title: 'Aquele Abraço', stems: [{ blobId: 'novo' }] };
  const out = fundeMusica(atual, pacote, ['audio']);
  assert.equal(out.stems, pacote.stems);   // parte declarada: a referência vem do arquivo
  assert.equal(out.cifra, atual.cifra);    // parte não declarada: fica a do aparelho
});

test('anotacoes viaja quando declarada e some quando nao', () => {
  const s = { id: 's1', artistId: 'a1', title: 'X', tom: 'G', anotacoes: '<p>oi</p>' };
  assert.equal(podaPorPartes([s], ['cifra'])[0].anotacoes, undefined);
  assert.equal(podaPorPartes([s], ['anotacoes'])[0].anotacoes, '<p>oi</p>');
});

test('cifra sozinha nao encosta na anotacao que ja existe', () => {
  const atual = { id: 's1', artistId: 'a1', title: 'X', anotacoes: '<p>do aluno</p>' };
  const r = fundeMusica(atual, { id: 's1', artistId: 'a1', title: 'X', tom: 'A' }, ['cifra']);
  assert.equal(r.anotacoes, '<p>do aluno</p>');
  assert.equal(r.tom, 'A');
});

test('anotacoes declarada sobrescreve', () => {
  const atual = { id: 's1', artistId: 'a1', title: 'X', anotacoes: '<p>do aluno</p>' };
  const r = fundeMusica(atual, { id: 's1', artistId: 'a1', title: 'X', anotacoes: '<p>do professor</p>' }, ['anotacoes']);
  assert.equal(r.anotacoes, '<p>do professor</p>');
});

test('backup antigo, com as tres partes de entao, volta INTEIRO', () => {
  // O caminho rapido do backup completo promete devolver ate um campo que este
  // modulo nunca ouviu falar. Somar uma parte a PARTES_TODAS quebraria isso em
  // silencio, e so na direcao de entrada.
  const doArquivo = { id: 's1', artistId: 'a1', title: 'X', campoDesconhecido: 42 };
  const r = fundeMusica(null, doArquivo, ['cifra', 'audio', 'pessoal'], 1);
  assert.equal(r.campoDesconhecido, 42);
});

test('backup novo, com as quatro partes, tambem volta inteiro', () => {
  const doArquivo = { id: 's1', artistId: 'a1', title: 'X', campoDesconhecido: 42 };
  const r = fundeMusica(null, doArquivo, ['cifra', 'audio', 'pessoal', 'anotacoes'], 1);
  assert.equal(r.campoDesconhecido, 42);
});

// --- livros: um quarto eixo que não é parte de música ----------------------
// A armadilha inteira desta tarefa: `todasAsPartes` tem que continuar medindo
// PARTES_DE_MUSICA, e não PARTES_TODAS, ou todo .somaplay já gravado no disco
// do usuário (que declara três partes, não quatro) cai na cópia campo a campo
// e perde, EM SILÊNCIO e NA VOLTA, todo campo fora de CAMPOS.
test('livros é uma parte declarável, mas não é parte de música', () => {
  // Toda parte de MÚSICA tem entrada em CAMPOS; livro não tem, porque não é
  // campo de música — é coleção de topo, como as listas.
  for (const p of PARTES_DE_MUSICA) assert.ok(CAMPOS[p], `${p} sem entrada em CAMPOS`);
  assert.ok(PARTES_TODAS.includes('livros'));
  assert.equal(CAMPOS.livros, undefined);
});

test('REGRESSÃO: backup gravado antes dos livros restaura o registro INTACTO', () => {
  // O .somaplay que já está no disco do usuário declara as três partes de
  // então. É na ENTRADA que isso precisa ser honrado: `arquivoCompleto` mede o
  // vocabulário da época do arquivo, então ele volta INTEIRO — inclusive um
  // campo que este módulo nunca ouviu falar. Medir o vocabulário de hoje aqui
  // derrubaria todo backup já gravado na cópia campo a campo, e ele perderia
  // esse campo em silêncio, na direção que ninguém confere.
  const antigas = ['cifra', 'audio', 'pessoal'];
  const registro = { id: 's1', artistId: 'a1', title: 'X', cifra: { tipo: 'texto' },
    favorita: true, campoQueNinguemConhece: 42 };
  assert.deepEqual(fundeMusica(null, registro, antigas), registro);
});

test('na SAÍDA, as três partes de então são um recorte, não um backup completo', () => {
  // A assimetria deliberada, e o contrário do teste acima: `podaPorPartes`
  // escreve um arquivo AGORA, então vale o vocabulário de hoje. Um export que
  // declara só as três partes antigas não pode levar de carona a anotação (nem
  // qualquer campo) que ele não declarou — foi para isso que a branch das
  // anotações separou `exportCompleto` de `arquivoCompleto`.
  const registro = { id: 's1', artistId: 'a1', title: 'X', cifra: { tipo: 'texto' },
    favorita: true, anotacoes: '<p>minha</p>' };
  const [saiu] = podaPorPartes([registro], ['cifra', 'audio', 'pessoal']);
  assert.equal(saiu.anotacoes, undefined);
  assert.equal(saiu.favorita, true);
  // e com o vocabulário inteiro de hoje, o registro sai intacto
  assert.deepEqual(podaPorPartes([registro], PARTES_TODAS), [registro]);
});

test('um arquivo só de livros não poda música nenhuma para dentro', () => {
  const registro = { id: 's1', artistId: 'a1', title: 'X', cifra: { tipo: 'texto' } };
  const [saiu] = podaPorPartes([registro], ['livros']);
  assert.deepEqual(saiu, { id: 's1', artistId: 'a1', title: 'X' });
});
