# Acordes colados sem espaço — plano

**Spec:** `../specs/2026-07-30-reconhecimento-de-linha-de-acordes-design.md`,
§"Acordes colados sem espaço (revisto em 2026-08-08)".

**Defeito:** em Andança, a linha `Bb7M   Bm7(b5) E7(13)E7(b13)` aparece branca. O
token `E7(13)E7(b13)` não é acorde; como a regra exige que todos os tokens sejam
acorde ou marca, ele derruba a linha inteira e leva junto `Bb7M` e `Bm7(b5)`, que
estão certos.

**Escopo medido:** varredura dos 11 `.somaplay` (77 cifras em texto, 7.035 linhas) —
2 linhas afetadas, ambas em Andança, um único padrão de token. A/B do protótipo:
**2 promovidas, 0 regressões**.

## Passos

1. **`splitChordTok(tok)` em `app/js/chords.js`** (novo, exportado).
   Devolve o array de acordes quando o token é colagem de dois ou mais, senão `null`.
   - Guarda: só tenta se `!isChordTok(tok)` e o token casa `/[0-9()#°º+\/]/`.
   - Busca gulosa da esquerda: maior prefixo que é `isChordTok`; repete no resto.
   - Só devolve array se consumiu o token todo em ≥ 2 pedaços.
   - Teste antes: `E7(13)E7(b13)` → `['E7(13)','E7(b13)']`; `Am7(9)/G` → `null`
     (acorde inteiro, não pode partir); `CADE` → `null` (guarda); `Bm7(b5)` → `null`.

2. **`isChordOrMark` aceita token colado** — a linha volta a ser linha de acordes.
   - Teste antes: `parseCifraText('Bb7M  Bm7(b5) E7(13)E7(b13)')[0].hasChords === true`.

3. **`extractChords` devolve os dois** — grade "Acordes desta música".
   - Teste antes: a linha acima → `['Bb7M','Bm7(b5)','E7(13)','E7(b13)']`.

4. **`chordLineSegs` parte o token em segmentos** — cada pedaço vira botão próprio.
   - Invariante sob teste: concatenar os `text` reproduz a linha **byte a byte**.

5. **`layoutChordRow` parte o token em itens** — miniatura por pedaço, cada uma na
   coluna do seu primeiro caractere (`m.index + offset`), colisão empurrando como já faz.

6. **Não-regressão:** rodar o A/B do acervo de novo (0 regressões) e `node --test`.

7. **`app/sw.js`** — sem módulo novo, o `SHELL` não muda; nada a bumpar por causa
   disso. Confirmar antes de fechar.

## Verificação
- `cd app && node --test` — suíte inteira verde.
- A/B contra os 11 `.somaplay`: promovidas = 2, regressões = 0.
- No app: Andança, os dois modos (com e sem miniaturas) — os 4 acordes da linha
  âmbar e tocáveis, `E7(13)` e `E7(b13)` com popover próprio, letra embaixo alinhada.

## Fora do escopo
- `fix-andanca-cifra.somaplay` deixa de ser necessário; não apagar sem o usuário pedir.
- Colagem de tríades simples sem dígito/parêntese (`AmD`) segue não reconhecida — é
  a guarda, e é de propósito.
