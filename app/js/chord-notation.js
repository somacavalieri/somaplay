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
  // '°' é o sinal de grau (U+00B0); 'º' é o ordinal masculino (U+00BA), o que o
  // CifraClub escreve. A terceira grafia — a letra 'o' de quem digita num teclado
  // comum ("Ebo") — é tratada à parte, na RE_DIM_O, porque só vale como corpo
  // inteiro. Só '°' é canônico na volta (TO_BR).
  '°': 'dim', 'º': 'dim',
};

// internacional → brasileiro (forma canônica de cada destino)
const TO_BR = {
  maj7: '7M', sus4: '(4)', dim: '°', dim7: '°',
  b13: '(b13)', b5: '(b5)', b9: '(b9)',
  11: '(11)', 13: '(13)', 9: '(9)',
};

// Uma passada só, alternativas mais longas primeiro. Passada única importa: com
// substituições sequenciais, o resultado de uma vira entrada da seguinte e o
// nome se corrompe.
const RE_BR = /\(b13\)|\(13-\)|\(b5\)|\(5-\)|\(b9\)|\(9-\)|\(11\)|\(13\)|\(9\)|\(4\)|7M|5-|°|º/g;

// O diminuto com a letra 'o' vem à parte, e não como alternativa da RE_BR: ele
// só vale quando o corpo inteiro é "nota + o" ('Ebo', 'Fo', 'C#o'), que é a
// única forma em que aparece no acervo. Solto na RE_BR, um 'o' final bastaria e
// "Como" viraria "Comdim". Um lookbehind resolveria em uma linha, mas o Safari
// só o suporta desde a 16.4 e regex não suportada derruba o módulo inteiro.
const RE_DIM_O = /^([A-G][#b]?)o$/;

// No sentido inverso os números soltos (9/11/13) só valem no FIM do nome. Sem a
// âncora, o '9' de 'C7(9-)' — que já é brasileiro — viraria 'C7((9)-)'.
const RE_INTL = /maj7|sus4|dim7|dim|b13|b5|b9|(?:11|13|9)$/g;

// A parte antes de '/' é o acorde; depois de '/' é o baixo e nunca muda.
function onBody(name, fn) {
  const s = String(name);
  const i = s.indexOf('/');
  if (i === -1) return fn(s);
  return fn(s.slice(0, i)) + s.slice(i);
}

export function toIntl(name) {
  return onBody(name, (body) => body.replace(RE_DIM_O, '$1dim').replace(RE_BR, (m) => TO_INTL[m]));
}

export function toBr(name) {
  return onBody(name, (body) => body.replace(RE_INTL, (m) => TO_BR[m]));
}

export function display(name, notation) {
  return notation === 'intl' ? toIntl(name) : toBr(name);
}

// O catálogo escreve as alterações com sustenido ('C#°', 'D#m', 'F#m'); a cifra
// escreve o que quiser. Só a fundamental (e o baixo) mudam — 'b5' e 'b9' são
// extensão, não nota, e por isso a troca é ancorada no INÍCIO do nome.
const ENARMONIA = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
const RE_BEMOL = /^[A-G]b/;
const semBemol = (s) => s.replace(RE_BEMOL, (m) => ENARMONIA[m] || m);

// Nome canônico de um acorde: uma só grafia por acorde, para achar a forma no
// catálogo. 'Fº', 'Fo', 'Fdim' e 'Fdim7' viram 'F°'; 'Bb°' vira 'A#°'.
// É busca, não exibição: o nome que vai para a tela continua sendo o da cifra.
export function canonico(name) {
  const s = toBr(toIntl(name));
  const i = s.indexOf('/');
  return i === -1 ? semBemol(s) : semBemol(s.slice(0, i)) + '/' + semBemol(s.slice(i + 1));
}

// A alteração tem duas grafias vivas e nenhuma é "a certa": o catálogo escreve
// '(5-)' e '(9-)', o toBr canoniza para '(b5)' e '(b9)'. Alinhar o toBr mudaria
// o que aparece na tela de quem usa notação brasileira — então a permissividade
// fica AQUI, na busca, e a exibição continua estável.
const ALTERACOES = [['(b5)', '(5-)'], ['(b9)', '(9-)'], ['(b13)', '(13-)']];
const NOTA = /^[A-G][#b]?$/;

// Sufixos que a cifra trata como o mesmo acorde e o catálogo guarda numa grafia
// só: '7+' = '7M' = 'maj7', '4' = 'sus4' = '(4)', '9' = 'add9' = '(9)'.
// A âncora no fim é o que separa '7M' de '7' — "A7" não pode virar "A7M", que é
// outro acorde. Por isso a alternativa longa vem antes da curta em cada regex.
const SINONIMOS = [
  [/(?:7\+|maj7|7M)$/, ['7M', '7+', 'maj7']],
  [/(?:sus4|\(4\)|4)$/, ['(4)', '4', 'sus4']],
  [/(?:add9|\(9\)|9)$/, ['(9)', '9', 'add9']],
];

function comSinonimos(nome) {
  for (const [re, formas] of SINONIMOS) {
    if (!re.test(nome)) continue;
    return formas.map((f) => nome.replace(re, f));
  }
  return [nome];
}

function comAlteracoes(nome) {
  // '5b' é uma terceira grafia da mesma coisa, e aparece depois da barra
  const base = nome.replace(/\(5b\)/g, '(b5)').replace(/\(9b\)/g, '(b9)').replace(/\(13b\)/g, '(b13)');
  const out = [base];
  for (const [a, b] of ALTERACOES) {
    for (const v of [...out]) {
      if (v.includes(a)) out.push(v.split(a).join(b));
      else if (v.includes(b)) out.push(v.split(b).join(a));
    }
  }
  return out;
}

// Nomes a tentar no catálogo, em ordem, começando pelo literal. É BUSCA, não
// exibição: o nome que vai para a tela continua sendo o que a cifra escreveu.
export function nomesDeBusca(name) {
  const s = String(name);
  const bases = [s];
  // Na notação do CifraClub a barra carrega extensão além de baixo — 'Em7/5b',
  // 'A7/13', 'F#7/5+'. Quando o que vem depois NÃO é nota, vale tentar como
  // extensão entre parênteses; quando é nota, é baixo e fica quieto.
  const i = s.indexOf('/');
  if (i > 0 && !NOTA.test(s.slice(i + 1))) bases.push(`${s.slice(0, i)}(${s.slice(i + 1)})`);

  const out = [];
  for (const b of bases) {
    for (const v of [b, canonico(b)]) {
      for (const w of comAlteracoes(v)) {
        for (const x of comSinonimos(w)) if (!out.includes(x)) out.push(x);
      }
    }
  }
  return out;
}
