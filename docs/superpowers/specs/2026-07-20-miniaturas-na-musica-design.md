# Soma_play — Miniaturas na música (diagramas inline na cifra em texto) — design

**Data:** 2026-07-20 · **Estado:** aprovado (brainstorming) → plano
**Referência visual:** CifraClub antigo ("exibir acordes no meio da cifra"), print de As Pastorinhas.

## Objetivo
Na cifra em **texto**, poder ver a **miniatura do diagrama de cada acorde no meio da música**, sobre a sílaba onde ele ataca — como o CifraClub fazia (recurso que estão removendo de lá). Liga/desliga pelo **menu kebab** da tela da música, item "**Miniaturas na música**". Recurso de leitura: a página fica mais longa e a rolagem (inclusive automática) segue funcionando sem mudanças.

## Comportamento (UX)
- **Item no kebab** (padrão visual do "Inverter cores": ícone + rótulo + estado `Ligado/Desligado`). Aparece **só quando a cifra da música é texto**; em cifra de imagem o item não existe (mesmo padrão dos itens exclusivos de imagem hoje).
- **Preferência global** `settings.cifraMiniaturas` (padrão `false`), persistida com as demais configurações — ligou uma vez, vale para todas as músicas em texto e sobrevive a fechar o app.
- Com o toggle **ligado**, em cada linha parseada da cifra:
  - **Acordes + letra** (par `hasChords && hasLyric`): a linha de texto dos acordes é **substituída** por uma fileira de blocos **nome + diagrama SVG pequeno** (o mesmo `chordSVG(nome, small, digitações)` da barra de fixados), cada bloco na coluna do caractere onde o acorde está.
  - **Só acordes** (sem letra embaixo — intro, solos, passagens): continua **texto puro**, fiel ao CifraClub.
  - Diagrama **repetido a cada ocorrência** do acorde, linha a linha (fiel ao CifraClub).
  - Tokens **não-acorde** numa linha com letra (`%`, `|`, `x2`, `N.C.`…) aparecem como **texto pequeno na própria fileira**, na coluna deles — não somem.
- **Formas:** digitação da música (`cifra.digitacoes[nome]`) tem precedência; senão a padrão do catálogo; sem forma conhecida → diagrama "?" já existente no `chordSVG`.
- **Toque no diagrama abre o seletor de variações** (`openChordPicker`), igual à grade "Acordes desta música".
- **Zoom da cifra** segue valendo para o texto; diagramas têm tamanho fixo (small, como os fixados) e as **posições acompanham o zoom**.
- **Karaokê e cifra por imagem: intocados.** Grade "Acordes desta música" e barra de fixados: intocadas (convivem com as miniaturas).

## Alinhamento e colisão (o núcleo técnico)
A fonte da cifra é monoespaçada (`--f-mono`, `white-space:pre`), então **coluna do caractere = posição horizontal exata**.
- Posição ideal do bloco = `coluna do primeiro caractere do token × largura do caractere`.
- A **largura do caractere é medida uma vez por render** (canvas `measureText`, com a fonte e o `font-size` efetivos — por isso o alinhamento acompanha o zoom automaticamente). Abordagem escolhida no brainstorm: **render derivado em string** (padrão do app), com medição; alternativas descartadas: pós-processamento no DOM (briga com o re-render por string) e blocos inline no fluxo (desalinha acorde↔sílaba).
- **Colisão:** varrendo da esquerda, posição real = `max(ideal, fim do bloco anterior + gap ~6px)`; o empurrão se propaga. Larguras dos blocos são determinísticas (SVG small: 64px, +12px quando há indicação de casa; nome pode alargar o bloco).
- Fileira = contêiner `position:relative` de altura fixa (nome + diagrama small); blocos absolutos. Linhas largas podem passar de 720px como o `.ch` de hoje já pode.

## Mudanças por arquivo (sem mudança de modelo de dados nem de backup)
- **`app/js/state.js`** — `settings.cifraMiniaturas: false` no default de `S.settings`.
- **`app/js/main.js`** — ação `toggleMiniaturas`: inverte, `saveSettings()`, `update()` (padrão do `toggleInvert`).
- **`app/js/render/play.js`** — item no kebab (só cifra texto); em `cifraTextHTML`, função `chordDiagramRowHTML(linha, dict, chPx)` gerando a fileira; medição do caractere por render.
- **`app/css/app.css`** — `.ch-diag-row` (relative, altura fixa) e `.ch-diag` (nome + SVG, visual derivado do `chord-mini` sem o card).
- **`app/sw.js`** — bump `v7 → v8` (mudança de shell).

## Verificação (manual, com "Manhã de Carnaval" em texto)
1. Diagramas sobre as sílabas certas; 2. intro continua texto; 3. acordes vizinhos não se sobrepõem (empurram); 4. toque no diagrama abre variações; 5. zoom mantém alinhamento; 6. tema claro ok; 7. preferência sobrevive a fechar/reabrir; 8. cifra de imagem sem o item no kebab; 9. acorde sem forma mostra "?"; 10. rolagem automática chega ao fim da página mais longa.

## Fora do escopo (YAGNI)
- Miniaturas em cifra de **imagem** (o diagrama já está na imagem "aberta").
- Dedup de diagramas repetidos ("só a primeira ocorrência").
- Preferência por música.
- Geração de diagramas no karaokê.
