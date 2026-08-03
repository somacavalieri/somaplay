// chord-notation.js — converte a grafia do acorde entre a convenção brasileira
// e a internacional. Puro, sem estado.
//
// IMPORTANTE: nunca aplicar à cifra em texto do usuário. A cifra alinha acordes
// sobre a letra por coluna de caractere, e os nomes têm larguras diferentes
// ('A7M' = 3, 'Amaj7' = 5). Ver §4.1 da spec de i18n.

// brasileiro → internacional. Várias grafias brasileiras caem no mesmo destino:
// '(5-)' e '(b5)' são o mesmo acorde, por isso NÃO existe identidade estrita de
// ida e volta — a propriedade que vale é a estabilidade da forma canônica.
const TO_INTL = {
  '(b13)': 'b13', '(13-)': 'b13',
  '(b5)': 'b5', '(5-)': 'b5', '5-': 'b5',
  '(b9)': 'b9', '(9-)': 'b9',
  '(11)': '11', '(13)': '13', '(9)': '9',
  '(4)': 'sus4',
  '7M': 'maj7',
  '°': 'dim',
};

// internacional → brasileiro (forma canônica de cada destino)
const TO_BR = {
  maj7: '7M', sus4: '(4)', dim: '°',
  b13: '(b13)', b5: '(b5)', b9: '(b9)',
  11: '(11)', 13: '(13)', 9: '(9)',
};

// Uma passada só, alternativas mais longas primeiro. Passada única importa: com
// substituições sequenciais, o resultado de uma vira entrada da seguinte e o
// nome se corrompe.
const RE_BR = /\(b13\)|\(13-\)|\(b5\)|\(5-\)|\(b9\)|\(9-\)|\(11\)|\(13\)|\(9\)|\(4\)|7M|5-|°/g;

// No sentido inverso os números soltos (9/11/13) só valem no FIM do nome. Sem a
// âncora, o '9' de 'C7(9-)' — que já é brasileiro — viraria 'C7((9)-)'.
const RE_INTL = /maj7|sus4|dim|b13|b5|b9|(?:11|13|9)$/g;

// A parte antes de '/' é o acorde; depois de '/' é o baixo e nunca muda.
function onBody(name, fn) {
  const s = String(name);
  const i = s.indexOf('/');
  if (i === -1) return fn(s);
  return fn(s.slice(0, i)) + s.slice(i);
}

export function toIntl(name) {
  return onBody(name, (body) => body.replace(RE_BR, (m) => TO_INTL[m]));
}

export function toBr(name) {
  return onBody(name, (body) => body.replace(RE_INTL, (m) => TO_BR[m]));
}

export function display(name, notation) {
  return notation === 'intl' ? toIntl(name) : toBr(name);
}
