// sharesheet.test.js — as duas peças puras da folha de compartilhar.
//
// OPCOES é o contrato: cada opção da folha vira um conjunto de partes, e é ele
// que chega no exportLibrary. Se alguém trocar 'ambos' por ['cifra'], nenhum
// teste de UI pega — este pega.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OPCOES, formataTamanho, calculaTamanhos, partesDaEscolha } from '../js/render/sharesheet.js';
import { DB } from '../js/db.js';
import { setLang } from '../js/i18n.js';

test('cada opção da folha mapeia para as partes certas', () => {
  const porId = Object.fromEntries(OPCOES.map((o) => [o.id, o.partes]));
  assert.deepEqual(porId.cifras, ['cifra']);
  assert.deepEqual(porId.ambos, ['cifra', 'audio']);
  assert.deepEqual(porId.audio, ['audio']);
});

test('a caixa acrescenta anotacoes so onde ha cifra', () => {
  assert.deepEqual(partesDaEscolha('cifras', false), ['cifra']);
  assert.deepEqual(partesDaEscolha('cifras', true), ['cifra', 'anotacoes']);
  assert.deepEqual(partesDaEscolha('ambos', true), ['cifra', 'audio', 'anotacoes']);
  assert.deepEqual(partesDaEscolha('audio', true), ['audio']);
});

test('nenhuma opção da folha compartilha o pessoal', () => {
  // Compartilhar é dar conteúdo a alguém, não despejar o gosto de quem mandou.
  for (const o of OPCOES) assert.ok(!o.partes.includes('pessoal'), o.id);
});

test('o tamanho é legível na escala que importa', () => {
  setLang('pt');
  assert.equal(formataTamanho(0), '0 KB');
  assert.equal(formataTamanho(1536), '2 KB');          // KB é sempre inteiro
  assert.equal(formataTamanho(1_800_000), '1,8 MB');
  assert.equal(formataTamanho(184_000_000), '184 MB');
  assert.equal(formataTamanho(2_500_000_000), '2,5 GB');
});

// O separador decimal segue o idioma, como a barra de armazenamento em
// settings.js já faz. Em inglês a vírgula leria como separador de milhar.
test('o separador decimal segue o idioma', () => {
  setLang('en');
  assert.equal(formataTamanho(1_800_000), '1.8 MB');
  assert.equal(formataTamanho(2_500_000_000), '2.5 GB');
  assert.equal(formataTamanho(184_000_000), '184 MB');  // sem decimal, igual nos dois
  setLang('pt');                                        // não vaza para os outros testes
});

test('tamanho desconhecido não vira zero', () => {
  assert.equal(formataTamanho(null), '');
});

// --- os tamanhos -----------------------------------------------------------
// A soma era só de blobs. Uma cifra de TEXTO não tem blob nenhum, então a opção
// "só as cifras" lia 0 KB — que é exatamente o que formataTamanho existe para
// nunca dizer — enquanto o arquivo de verdade tem alguns KB de JSON. E o
// chordbook, que viaja com `cifra`, ficava fora da conta inteira.
//
// DB.blobSize é trocada aqui: sob Node não há OPFS, e a função devolveria null
// para tudo. Com um número fixo dá para afirmar a conta, não só o sinal dela.
const blobSizeReal = DB.blobSize;
const comBlobsDe = (n) => { DB.blobSize = async () => n; };
const restauraBlobSize = () => { DB.blobSize = blobSizeReal; };

// ~1,8 KB de cifra, que é o tamanho de uma música de verdade em texto.
const cifraDeTexto = () => ({
  id: 's1', artistId: 'ar1', title: 'Aquele Abraço',
  tom: 'D', estilo: 'Samba', fonte: 'Songbook',
  cifra: {
    tipo: 'texto', imagens: [], acordes: ['D', 'A7'], digitacoes: {},
    texto: ('D       A7      D\nAlô, alô, Realengo\n').repeat(50),
  },
});

test('uma cifra de texto não vale 0 KB', async () => {
  comBlobsDe(0);
  try {
    const tam = await calculaTamanhos([cifraDeTexto()]);
    assert.ok(tam.cifras > 1000, `esperava mais de 1 KB, veio ${tam.cifras}`);
    assert.notEqual(formataTamanho(tam.cifras), '0 KB');
  } finally { restauraBlobSize(); }
});

test('ambos não conta a identidade nem o chordbook duas vezes', async () => {
  comBlobsDe(0);
  try {
    const m = { ...cifraDeTexto(), stems: [{ blobId: 'a1', vol: 60 }] };
    const tam = await calculaTamanhos([m]);
    assert.ok(tam.ambos < tam.cifras + tam.audio,
      `ambos (${tam.ambos}) deveria ser menor que a soma (${tam.cifras + tam.audio})`);
    assert.ok(tam.ambos > tam.cifras);
  } finally { restauraBlobSize(); }
});

test('os bytes dos blobs entram, e cifra e áudio não dividem blob', async () => {
  comBlobsDe(1_000_000);
  try {
    const m = {
      id: 's1', artistId: 'ar1', title: 'X',
      cifra: { tipo: 'imagem', imagens: [{ blobId: 'i1' }], texto: '', acordes: [], digitacoes: {} },
      stems: [{ blobId: 'a1' }, { blobId: 'a2' }],
    };
    const tam = await calculaTamanhos([m]);
    assert.ok(tam.cifras >= 1_000_000 && tam.cifras < 1_100_000);
    assert.ok(tam.audio >= 2_000_000 && tam.audio < 2_100_000);
    assert.ok(tam.ambos >= 3_000_000 && tam.ambos < 3_100_000);
  } finally { restauraBlobSize(); }
});

// O fallback IDB não sabe o tamanho sem carregar o blob inteiro na memória, e a
// folha prefere não mostrar número a travar um tablet.
test('tamanho desconhecido continua null, e não um número só de metadado', async () => {
  DB.blobSize = async () => null;
  try {
    const m = { ...cifraDeTexto(), stems: [{ blobId: 'a1' }] };
    const tam = await calculaTamanhos([m]);
    assert.equal(tam.audio, null);
    assert.equal(tam.ambos, null);
  } finally { restauraBlobSize(); }
});
