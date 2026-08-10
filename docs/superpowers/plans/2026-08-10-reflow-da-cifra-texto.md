# Reflow da cifra em texto — plano

Spec: `docs/superpowers/specs/2026-08-10-reflow-da-cifra-texto-design.md`

## 1. `app/js/chords.js` — `wrapBlock` (lógica pura)

`export function wrapBlock(chords, lyric, cols)` → `[{chords, lyric}, ...]`.

- `cols` inválido/0 → devolve o par inteiro num pedaço só (sem reflow).
- corte na mesma coluna nas duas linhas, nunca no meio de token;
- maior coluna válida até `cols`; sem nenhuma, corta em `cols`;
- tira o mesmo recuo das duas linhas em cada pedaço;
- descarta pedaço vazio nos dois lados.

## 2. `app/test/cifrawrap.test.js` — testes

- linha que já cabe volta inteira, sem alteração;
- acorde e sílaba continuam na mesma coluna depois da quebra (checar coluna do acorde
  contra a da sílaba antes e depois);
- não corta acorde no meio (`E7(4/9)` inteiro em algum pedaço);
- não corta palavra no meio;
- token maior que `cols` corta em `cols` em vez de entrar em laço;
- `cols` 0/negativo/undefined → um pedaço só;
- concatenar os pedaços reproduz o par original, fora os espaços de recuo/fim.

## 3. `app/js/render/play.js` — usar a medida

- `let cifraCols = 0;` no módulo (0 = ainda não medido → sem reflow).
- `cifraTextHTML`: para cada bloco com acorde **e** letra, `wrapBlock(...)` e emitir um
  par `.ch`/`.ly` por pedaço (com miniatura, uma `ch-diag-row` por pedaço). Bloco só de
  acorde ou só de letra continua como está.
- `measureCifraCols()`: largura de `.cifra-text` (`clientWidth`) ÷ largura do caractere
  mono em `fontPx` (reusa `textMeasurer`, peso 700 como a `.ch`).
- `afterRenderPlay`: mede; se mudou, grava e chama `update()` **uma vez**.
- `ResizeObserver` na `.cifra-text` para rotação/mixer, com o mesmo guarda.
- Trocar de música/zoom não precisa de nada novo: já re-renderiza e a medição refaz.

## 4. `app/css/app.css`

- `.cifra-text .ly` → `white-space:pre` (era `pre-wrap`);
- `.cifra-text` → `overflow-x:auto`.

## 5. Service Worker

Nenhum arquivo novo em `app/js/` — só bump de `VERSION` em `app/sw.js` (v22 → v23).

## 6. Verificação

- `cd app && node --test` (suíte inteira, não só o arquivo novo);
- `node --check` nos arquivos tocados;
- navegador: abrir uma música do lote do Gil em largura de tablet e de celular,
  confirmar que nenhum acorde some e que cada acorde continua sobre a sílaba certa;
  conferir com miniaturas ligadas e desligadas, e no zoom mínimo e máximo.

## 7. Depois

Com o reflow no app, o gerador do songbook pode parar de quebrar em 56 colunas e voltar
a emitir o sistema inteiro do livro — deixa a decisão de largura para o aparelho. Fica
para depois de a verificação no navegador passar.
