import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  builtinShapes, mergeShapes, shapeKey, mergeRecords, songsUsingVar,
  shapesOf, defaultShape, shapeById, findShape, labelsOf,
  upsertVar, removeVar, setDefault, restoreBuiltins, hasHidden, allNames,
} from '../js/chordbook.js';

test('builtinShapes: ids sintéticos pela posição no catálogo', () => {
  const l = builtinShapes('E7'); // E7 tem 2 formas no catálogo
  assert.equal(l.length, 2);
  assert.equal(l[0].id, 'b:E7:0');
  assert.equal(l[1].id, 'b:E7:1');
  assert.equal(l[0].origin, 'builtin');
});

test('builtinShapes: nome desconhecido → lista vazia', () => {
  assert.deepEqual(builtinShapes('Zx9'), []);
});

test('mergeShapes: sem delta do usuário sai o catálogo com a padrão marcada', () => {
  const l = mergeShapes(builtinShapes('E7'), null);
  assert.equal(l.length, 2);
  assert.equal(l[0].isDefault, true);
  assert.equal(l[1].isDefault, false);
});

test('mergeShapes: variação do usuário entra depois das embutidas', () => {
  const rec = { name: 'E7', vars: [{ id: 'u:1', frets: [0, 2, 0, 1, 3, 0], label: 'minha' }], hidden: [], defaultId: null };
  const l = mergeShapes(builtinShapes('E7'), rec);
  assert.equal(l.length, 3);
  assert.equal(l[2].id, 'u:1');
  assert.equal(l[2].origin, 'user');
});

test('mergeShapes: override por id substitui a embutida no lugar dela', () => {
  const rec = { name: 'E7', vars: [{ id: 'b:E7:0', frets: [0, 2, 0, 1, 0, 3], label: 'corrigida' }], hidden: [], defaultId: null };
  const l = mergeShapes(builtinShapes('E7'), rec);
  assert.equal(l.length, 2);
  assert.equal(l[0].id, 'b:E7:0');
  assert.equal(l[0].label, 'corrigida');
  assert.deepEqual(l[0].frets, [0, 2, 0, 1, 0, 3]);
  assert.equal(l[0].origin, 'user');
});

test('mergeShapes: override sem pestana apaga a pestana da embutida', () => {
  // F embutido tem barre {fret:1,from:0,to:5}; o override não tem
  const rec = { name: 'F', vars: [{ id: 'b:F:0', frets: [-1, -1, 3, 2, 1, 1] }], hidden: [], defaultId: null };
  const l = mergeShapes(builtinShapes('F'), rec);
  assert.equal(l[0].barre, undefined);
});

test('mergeShapes: lápide esconde a embutida e a padrão cai para a que sobrou', () => {
  const rec = { name: 'E7', vars: [], hidden: ['b:E7:0'], defaultId: null };
  const l = mergeShapes(builtinShapes('E7'), rec);
  assert.equal(l.length, 1);
  assert.equal(l[0].id, 'b:E7:1');
  assert.equal(l[0].isDefault, true);
});

test('mergeShapes: defaultId do usuário vence o default do catálogo', () => {
  const rec = { name: 'E7', vars: [], hidden: [], defaultId: 'b:E7:1' };
  const l = mergeShapes(builtinShapes('E7'), rec);
  assert.equal(l[0].isDefault, false);
  assert.equal(l[1].isDefault, true);
});

test('mergeShapes: defaultId órfão volta para o padrão do catálogo', () => {
  const rec = { name: 'E7', vars: [], hidden: [], defaultId: 'u:apagada' };
  const l = mergeShapes(builtinShapes('E7'), rec);
  assert.equal(l[0].isDefault, true);
});

test('shapeKey: pestana faz parte da identidade da forma', () => {
  const a = shapeKey({ frets: [1, 3, 3, 2, 1, 1], barre: { fret: 1, from: 0, to: 5 } });
  const b = shapeKey({ frets: [1, 3, 3, 2, 1, 1] });
  assert.notEqual(a, b);
  assert.equal(shapeKey({ frets: [1, 3, 3, 2, 1, 1] }), b);
});

test('mergeRecords: une por id e o local vence o conflito', () => {
  const local = { name: 'C', vars: [{ id: 'u:1', frets: [1, 1, 1, 1, 1, 1], label: 'local' }], hidden: ['b:C:0'], defaultId: 'u:1' };
  const inc = { name: 'C', vars: [{ id: 'u:1', frets: [2, 2, 2, 2, 2, 2], label: 'importada' }, { id: 'u:2', frets: [3, 3, 3, 3, 3, 3] }], hidden: ['b:C:9'], defaultId: 'u:2' };
  const m = mergeRecords(local, inc);
  assert.equal(m.vars.length, 2);
  assert.equal(m.vars[0].label, 'local');
  assert.deepEqual(m.hidden.slice().sort(), ['b:C:0', 'b:C:9']);
  assert.equal(m.defaultId, 'u:1');
});

test('mergeRecords: sem registro local adota o importado', () => {
  const m = mergeRecords(null, { name: 'C', vars: [{ id: 'u:9', frets: [0, 0, 0, 0, 0, 0] }], hidden: [], defaultId: 'u:9' });
  assert.equal(m.name, 'C');
  assert.equal(m.vars.length, 1);
  assert.equal(m.defaultId, 'u:9');
});

test('mergeRecords: lápide importada não apaga override local do mesmo id', () => {
  // local tem um override salvo por cima da embutida b:E7:0; o arquivo importado
  // (de outro aparelho, que apagou essa mesma variação) traz uma lápide pro mesmo
  // id. "O local vence" precisa valer aqui também — a forma não pode sumir.
  const local = { name: 'E7', vars: [{ id: 'b:E7:0', frets: [0, 2, 0, 1, 0, 3], label: 'corrigida' }], hidden: [], defaultId: null };
  const inc = { name: 'E7', vars: [], hidden: ['b:E7:0'], defaultId: null };
  const m = mergeRecords(local, inc);
  assert.deepEqual(m.hidden, []);
  const l = mergeShapes(builtinShapes('E7'), m);
  const achou = l.find((s) => s.id === 'b:E7:0');
  assert.ok(achou, 'override b:E7:0 devia continuar aparecendo em mergeShapes');
  assert.equal(achou.label, 'corrigida');
});

test('songsUsingVar: só as músicas que apontam para aquela variação', () => {
  const songs = [
    { id: 's1', cifra: { digitacoes: { Bb7M: { frets: [], varId: 'u:1' } } } },
    { id: 's2', cifra: { digitacoes: { Bb7M: { frets: [], varId: 'u:2' } } } },
    { id: 's3', cifra: { digitacoes: { Bb7M: { frets: [] } } } }, // legado, sem varId
    { id: 's4', cifra: { digitacoes: {} } },
    { id: 's5' },
  ];
  assert.deepEqual(songsUsingVar(songs, 'Bb7M', 'u:1').map((s) => s.id), ['s1']);
});

test('mergeShapes: a forma devolvida não compartilha frets/barre com o catálogo', () => {
  const l = mergeShapes(builtinShapes('F'), null);
  l[0].frets[0] = 99;
  l[0].barre.fret = 9;
  const de_novo = mergeShapes(builtinShapes('F'), null);
  assert.equal(de_novo[0].frets[0], 1);
  assert.equal(de_novo[0].barre.fret, 1);
});

test('mergeShapes: a forma devolvida não compartilha frets com o registro do usuário', () => {
  const rec = { name: 'E7', vars: [{ id: 'u:1', frets: [0, 2, 0, 1, 3, 0] }], hidden: [], defaultId: null };
  mergeShapes(builtinShapes('E7'), rec)[2].frets[0] = 99;
  assert.equal(rec.vars[0].frets[0], 0);
});

test('upsertVar: cria variação nova com id u: e ela aparece em shapesOf', () => {
  const id = upsertVar('A7', { frets: [-1, 0, 2, 0, 2, 3], label: 'com 9ª' });
  assert.ok(id.startsWith('u:'));
  const l = shapesOf('A7');
  assert.equal(l.length, 2); // 1 embutida + 1 nova
  assert.equal(l[1].id, id);
  assert.equal(l[1].label, 'com 9ª');
});

test('upsertVar com id existente atualiza no lugar (não duplica)', () => {
  const id = upsertVar('Am7', { frets: [-1, 0, 2, 0, 1, 3] });
  upsertVar('Am7', { id, frets: [-1, 0, 2, 0, 1, 0], label: 'ajustada' });
  const l = shapesOf('Am7');
  assert.equal(l.length, 2);
  assert.deepEqual(l[1].frets, [-1, 0, 2, 0, 1, 0]);
  assert.equal(l[1].label, 'ajustada');
});

test('upsertVar com id de embutida vira override e o desenho muda', () => {
  upsertVar('D7', { id: 'b:D7:0', frets: [-1, -1, 0, 2, 1, 3] });
  const l = shapesOf('D7');
  assert.equal(l.length, 1);
  assert.deepEqual(l[0].frets, [-1, -1, 0, 2, 1, 3]);
  assert.deepEqual(defaultShape('D7').frets, [-1, -1, 0, 2, 1, 3]);
});

test('removeVar: variação do usuário some da lista', () => {
  const id = upsertVar('Dm7', { frets: [-1, -1, 0, 2, 1, 1] });
  assert.equal(shapesOf('Dm7').length, 2);
  removeVar('Dm7', id);
  assert.equal(shapesOf('Dm7').length, 1);
});

test('removeVar: embutida vira lápide e restoreBuiltins traz de volta', () => {
  removeVar('Em7', 'b:Em7:0');
  assert.equal(shapesOf('Em7').length, 0);
  assert.equal(hasHidden('Em7'), true);
  restoreBuiltins('Em7');
  assert.equal(shapesOf('Em7').length, 1);
  assert.equal(hasHidden('Em7'), false);
});

test('setDefault muda a padrão e defaultShape acompanha', () => {
  const id = upsertVar('G7', { frets: [3, 5, 3, 4, 3, 3], label: 'pestana 3ª' });
  setDefault('G7', id);
  assert.equal(defaultShape('G7').id, id);
  assert.equal(shapeById('G7', id).label, 'pestana 3ª');
});

test('findShape acha forma idêntica (dedupe) e ignora forma diferente', () => {
  const id = upsertVar('B7', { frets: [-1, 2, 1, 2, 0, 2], barre: { fret: 2, from: 1, to: 5 } });
  const achou = findShape('B7', [-1, 2, 1, 2, 0, 2], { fret: 2, from: 1, to: 5 });
  assert.equal(achou.id, id);
  assert.equal(findShape('B7', [-1, 2, 1, 2, 0, 2], null).id, 'b:B7:0'); // sem pestana = a embutida
  assert.equal(findShape('B7', [9, 9, 9, 9, 9, 9], null), null);
});

test('labelsOf devolve os rótulos já usados naquele nome', () => {
  upsertVar('Bm', { frets: [-1, 2, 4, 4, 3, 2], label: 'minha pestana' });
  assert.ok(labelsOf('Bm').includes('minha pestana'));
});

test('allNames inclui nome que só existe no dicionário do usuário', () => {
  upsertVar('Zz9', { frets: [1, 1, 1, 1, 1, 1] });
  const n = allNames();
  assert.ok(n.includes('Zz9'));
  assert.ok(n.includes('C'));
});

test('defaultShape: nome desconhecido → null', () => {
  assert.equal(defaultShape('Qq0'), null);
});

test('mergeRecords sobre uma lista: nomes novos entram, existentes se fundem', () => {
  const locais = new Map([['C', { name: 'C', vars: [{ id: 'u:a', frets: [0, 0, 0, 0, 0, 0] }], hidden: [], defaultId: null }]]);
  const incoming = [
    { name: 'C', vars: [{ id: 'u:b', frets: [1, 1, 1, 1, 1, 1] }], hidden: [], defaultId: 'u:b' },
    { name: 'G', vars: [{ id: 'u:c', frets: [3, 2, 0, 0, 0, 3] }], hidden: [], defaultId: null },
  ];
  const out = incoming.map((inc) => mergeRecords(locais.get(inc.name), inc));
  assert.equal(out[0].vars.length, 2);
  assert.equal(out[0].defaultId, 'u:b');   // local não tinha padrão → adota a do arquivo
  assert.equal(out[1].name, 'G');
  assert.equal(out[1].vars.length, 1);
});
