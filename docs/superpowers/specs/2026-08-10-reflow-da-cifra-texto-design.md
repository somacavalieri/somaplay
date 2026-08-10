# Reflow da cifra em texto — design

2026-08-10

## O problema

Cifra de texto com linha mais larga que a tela **perde os acordes**. Reportado pelo
usuário no tablet e no computador; no celular a cifra fica inutilizável.

Causa, em `app/css/app.css`:

```css
.cifra-text .ch{ white-space:pre }        /* linha de acorde: nunca quebra */
.cifra-text .ly{ white-space:pre-wrap }   /* linha de letra: quebra */
```

Como `.cifra-col` é `overflow:hidden` e não há `overflow-x` em lugar nenhum, o que
acontece com uma linha larga é:

1. a **linha de acorde** não quebra, transborda e é **cortada pela direita** — os
   acordes do fim da linha simplesmente somem, sem nenhum indício visual;
2. a **linha de letra** quebra sozinha, e a segunda metade dela aparece **sem acorde
   nenhum em cima**, porque os acordes correspondentes foram cortados no item 1.

O par acorde↔sílaba é posicional (coluna de caractere, fonte monoespaçada). Quando as
duas linhas quebram por regras diferentes, o alinhamento — que é a única coisa que a
cifra em texto carrega — deixa de existir.

Isso atinge **toda a biblioteca**, não só o lote do Songbook do Gil: qualquer cifra
importada do CifraClub com linha longa tem o mesmo defeito.

## A decisão

**Refluir o par no render**: quebrar linha de acorde e linha de letra **na mesma
coluna**, em pedaços que caibam na largura disponível, e desenhar cada pedaço como um
par `.ch`/`.ly` próprio.

Alternativas descartadas:

- **Rolagem horizontal do bloco** (`.ly` também `white-space:pre` + `overflow-x:auto`).
  Mantém o alinhamento e é trivial, mas obriga a rolar de lado no meio da música — o
  oposto do que um app de estante de partitura precisa.
- **Encolher a fonte até caber.** A linha mais larga da música passaria a ditar o
  tamanho de todas; num songbook com sistemas de 90 colunas a fonte fica ilegível.
- **Quebrar as linhas na importação** (o que o gerador do Songbook faz hoje, em 56
  colunas). Resolve só o conteúdo novo, não conserta o que já está na biblioteca, e
  chuta uma largura que não é a do aparelho.

## Regras da quebra

Dada a linha de acorde `C`, a linha de letra `L` e a largura `n` em colunas:

- corta as duas na **mesma coluna** — é o que preserva o alinhamento;
- só corta numa coluna que **não parte token nenhum** das duas linhas (nem acorde, nem
  palavra): a coluna `c` vale se, em cada linha, `c` está além do fim ou tem espaço
  imediatamente antes ou depois;
- procura a maior coluna válida até `n`; se não houver nenhuma (token único mais largo
  que a tela), corta em `n` mesmo — melhor partir do que esconder;
- de cada pedaço tira o **mesmo** número de espaços à esquerda das duas linhas, senão o
  texto vai andando para a direita a cada quebra;
- pedaço que fica com as duas linhas vazias é descartado.

## Largura em colunas

`n = largura útil de .cifra-text / largura do caractere mono no tamanho de fonte atual`.

A largura útil depende do aparelho, da orientação, do zoom da cifra (`settings.cifraZoom`)
e de o mixer estar ou não ancorado ao lado — ou seja, **precisa ser medida no DOM**, não
deduzida da viewport. Medição em duas passadas, aproveitando o `afterRenderPlay` que já
existe: renderiza, mede `.cifra-text`, e só re-renderiza se o número de colunas mudou.
O guarda contra laço é comparar com o valor usado na render anterior.

`ResizeObserver` na `.cifra-text` cobre rotação de tela e o mixer abrindo/fechando.

## Rede de segurança

Junto com o reflow, `.ly` passa a `white-space:pre` (igual à `.ch`) e `.cifra-text`
ganha `overflow-x:auto`. Assim, se sobrar algum caso patológico que não coube, ele
**rola** em vez de sumir calado. O modo de falha deixa de ser "o acorde desapareceu".

## O que não muda

- O texto salvo da música. O reflow é só de exibição — o `cifra.texto` continua igual,
  e a mesma música reflui diferente em telas diferentes.
- Miniaturas inline e popover de acorde: cada pedaço é uma linha de acorde normal, então
  `layoutChordRow`/`chordLineSegs` seguem valendo sem alteração, por pedaço.
