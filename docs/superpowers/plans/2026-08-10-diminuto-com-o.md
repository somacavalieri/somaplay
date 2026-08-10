# Plano — diminuto escrito com "o" minúsculo

Spec: `docs/superpowers/specs/2026-08-10-diminuto-com-o-design.md`

Cada passo termina com `cd app && node --test` verde.

## 1. Teste vermelho para a guarda 1 (token)

Em `app/test/cifraparse.test.js`, junto dos testes de `isChordTok`:

- `isChordTok` aceita `Ebo`, `Bo`, `F#o`, `A#o`, `Ebo7`, `Co/E`
- `isChordTok` **recusa** `Com`, `Bom`, `Como`, `Dom` — `o` no meio não é diminuto
- `chordName('Ebo')` devolve `'Ebo'` (o token cru é o que vai para a tela)

Rodar e ver falhar.

## 2. Implementar a guarda 1 em `js/chords.js`

Na regex de `isChordTok`, a qualidade hoje é

```
(m|maj|min|dim|aug|sus2|sus4|sus|add\d+|M|°|º|\+|-|\d)*
```

Acrescentar um `o` **opcional e terminal** depois desse grupo, não dentro dele — dentro,
`o` valeria em qualquer posição e `Como` passaria. Comentar o porquê no código.

Verificar que a suíte inteira continua verde: `Gºm6` (teste existente em `catalog.test.js`)
não pode quebrar.

## 3. Teste vermelho para a guarda 2 (linha)

Em `app/test/cifraparse.test.js`, sobre `parseCifraText`:

- `'C   Ebo   Dm   G'` é linha de acordes, e `extractChords` traz os quatro
- `'Amo'` sozinho **não** é linha de acordes
- `'Ao'` sozinho **não** é linha de acordes
- `'Do Ao'` (dois tokens ambíguos, nenhum acorde inequívoco) **não** é linha de acordes
- `'Bo Em'` **é** linha de acordes — `Em` é inequívoco e dá companhia ao `Bo`
- linha de letra real (`'Como amo você'`) continua letra

## 4. Implementar a guarda 2 em `isChordLine`

Definir "ambíguo" como o token feito **só de letras** e terminado em `o`: `^[A-G][a-z]*o$`.
Pega `Do`, `Ao`, `Amo`, `Bo`, `Co`, `Fo`, `Go`, `Ebo`, `Bbo`. Não pega `F#o` nem `A#o` — o
`#` não existe em palavra.

Em `isChordLine`, depois de confirmar que todos os tokens são acorde ou marca: se **algum**
token for ambíguo, exigir que exista pelo menos um acorde **não-ambíguo** na linha.

Cuidado para não mexer em `chordsOfTok` nem em `chordLineSegs` — a regra é de linha, e
`isChordTok` tem de continuar respondendo `true` para `Do` (o spec diz isso explicitamente).

## 5. Medir sobre o acervo convertido

Regerar `/tmp/_all.json` a partir dos 14 `.somaplay` e rodar o script de aferição:

- linhas de acorde **antes**: 22.082 · linhas não reconhecidas: 284
- esperado **depois**: ~22.153 linhas de acorde, ~213 não reconhecidas
- **linhas de letra que viraram linha de acordes: tem de ser 0** — comparar o conjunto de
  linhas classificadas como letra antes e depois; qualquer linha que saiu de "letra" e não
  estava na lista das 284 é uma regressão e derruba a mudança

## 6. Subir o Service Worker

`app/sw.js`: `VERSION` de `somaplay-v23` para `somaplay-v24`. O `SHELL` não muda (nenhum
módulo novo), mas o cache é cache-first e sem o bump ninguém recebe o `chords.js` novo.

## 7. Fechar

- `cd app && node --test` verde
- `node --check app/js/chords.js`
- verificação manual no navegador: abrir "Meu Caro Amigo" (Chico Buarque) e confirmar que
  a linha `C  Ebo  Dm  G` mostra os quatro acordes clicáveis
- commit
