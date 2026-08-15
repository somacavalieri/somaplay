// baixocomposto.test.js — acorde SOBRE ACORDE no baixo (`Dm7/G7`).
//
// A barra do acorde já servia a dois usos: baixo como NOTA (`D/F#`, `Cm6/Eb`) e
// extensão no estilo CifraClub (`A7/13`, `Em7/5-`, `E7/4(9)`). O que faltava era
// o baixo ser um ACORDE inteiro — `Dm7/G7`, que o Chediak imprime 22 vezes só em
// *Beleza pura*.
//
// Por que isso é grave e não cosmético: um token que não casa em `isChordTok`
// derruba a LINHA inteira pela regra de `isChordLine` (todo token tem de ser
// acorde ou marca). A cifra é rebaixada a letra e a música abre **sem acorde
// nenhum**, sem erro. É o defeito que passa despercebido.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isChordTok, parseCifraText, extractChords } from '../js/chords.js';

test('acorde com ACORDE no baixo é acorde', () => {
  for (const t of ['Dm7/G7', 'C/Bb7M', 'Am7/D9', 'F/G7(9)', 'G/Am', 'Bb/C7']) {
    assert.equal(isChordTok(t), true, `deveria ser acorde: ${t}`);
  }
});

test('as duas formas antigas da barra continuam valendo', () => {
  // baixo como nota, e extensão no estilo CifraClub
  for (const t of ['D/F#', 'Cm6/Eb', 'A7/13', 'Em7/5-', 'Bm5-/7', 'E7/4(9)']) {
    assert.equal(isChordTok(t), true, `regressão, deixou de ser acorde: ${t}`);
  }
});

test('palavra de letra continua não sendo acorde', () => {
  // As quatro primeiras são as que o comentário de chords.js registra como já
  // tendo mordido o projeto: nota seguida de 'o' e mais letra.
  for (const t of ['Como', 'Bom', 'Dom', 'Como/Bom', 'C/Como', 'Sim/não', 'Ela/Ele']) {
    assert.equal(isChordTok(t), false, `virou acorde por engano: ${t}`);
  }
});

test('uma cifra com Dm7/G7 é reconhecida como linha de acordes', () => {
  const txt = 'C        Dm7/G7\nBeleza   pura';
  const [bloco] = parseCifraText(txt);
  assert.equal(bloco.hasChords, true, 'a linha de acordes foi rebaixada a letra');
  assert.deepEqual(extractChords([bloco]), ['C', 'Dm7/G7']);
});
