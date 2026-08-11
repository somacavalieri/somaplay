# Campo Harmônico — Maior vs Menor

Guia de bolso para análise de progressões harmônicas. Transcrição fiel do quadro de
referência: cada linha é uma tonalidade, cada coluna é um grau.

A notação é a do quadro original (`m` para menor, `dim` para diminuto, `#`/`b` para
alterações). Não é a notação brasileira do app — este documento é material de estudo,
não conteúdo renderizado na tela.

## Campo harmônico maior

Graus: **I  ii  iii  IV  V  vi  vii°**

| Tom | I | ii | iii | IV | V | vi | vii° |
|-----|---|----|-----|----|---|----|------|
| A | A | Bm | C#m | D | E | F#m | G#dim |
| B | B | C#m | D#m | E | F# | G#m | A#dim |
| C | C | Dm | Em | F | G | Am | Bdim |
| D | D | Em | F#m | G | A | Bm | C#dim |
| E | E | F#m | G#m | A | B | C#m | D#dim |
| F | F | Gm | Am | Bb | C | Dm | Edim |
| G | G | Am | Bm | C | D | Em | F#dim |

Padrão de qualidades: **maior, menor, menor, maior, maior, menor, diminuto**.

## Campo harmônico menor

Graus: **i  ii°  III  iv  v  VI  VII**

| Tom | i | ii° | III | iv | v | VI | VII |
|-----|---|-----|-----|----|---|----|-----|
| Am | Am | Bdim | C | Dm | Em | F | G |
| Bm | Bm | C#dim | D | Em | F#m | G | A |
| Cm | Cm | Ddim | Eb | Fm | Gm | Ab | Bb |
| Dm | Dm | Edim | F | Gm | Am | Bb | C |
| Em | Em | F#dim | G | Am | Bm | C | D |
| Fm | Fm | Gdim | Ab | Bbm | Cm | Db | Eb |
| Gm | Gm | Adim | Bb | Cm | Dm | Eb | F |

Padrão de qualidades: **menor, diminuto, maior, menor, menor, maior, maior**.
Este é o menor **natural** — o V vem menor (`v`). Na prática, muita música usa o menor
harmônico, que eleva a sétima e transforma o `v` em **V maior** (em Am: `E` no lugar de
`Em`), criando a dominante que resolve na tônica.

## Relação entre os dois

Cada campo maior tem um **relativo menor** no vi grau, com exatamente as mesmas notas e
os mesmos sete acordes — muda só o centro tonal.

| Maior | Relativo menor |
|-------|----------------|
| C | Am |
| D | Bm |
| E | C#m |
| F | Dm |
| G | Em |
| A | F#m |
| B | G#m |

Confirmação: a linha de C maior (`C Dm Em F G Am Bdim`) e a de Am menor
(`Am Bdim C Dm Em F G`) contêm o mesmo conjunto, rotacionado.

## Como usar na análise de progressões

1. Liste os acordes da música.
2. Procure a linha (maior ou menor) que contém todos eles — essa é a tonalidade.
3. Traduza cada acorde para o seu grau romano. A progressão vira um padrão portátil,
   transponível para qualquer tom.
4. Acordes que **não** cabem na linha são o interessante: empréstimo modal, dominante
   secundária, modulação.

Exemplos comuns:

| Progressão | Graus | Onde aparece |
|------------|-------|--------------|
| C – Am – F – G | I – vi – IV – V | balada clássica |
| G – D – Em – C | I – V – vi – IV | pop |
| Dm – G – C | ii – V – I | jazz, bossa |
| Am – F – C – G | i – VI – III – VII | rock em menor |

## Limites deste quadro

- Só tríades, sem tétrades. O campo maior com sétimas é
  `Imaj7  ii7  iii7  IVmaj7  V7  vi7  viiø7` (em notação brasileira:
  `I7M  ii7  iii7  IV7M  V7  vi7  vii(m7b5)`).
- Sete tonalidades maiores e sete menores — faltam os tons com mais alterações
  (Db, Gb/F#, Eb maior; C#m, D#m, Ebm...). O padrão de qualidades é o mesmo, basta
  transpor.
- O `vii°` do campo maior e o `ii°` do menor são o mesmo acorde meio-diminuto na
  prática harmônica (`m7b5`), raramente usado como tríade diminuta pura.
