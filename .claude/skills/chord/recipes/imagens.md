# Recipe: `imagens` — cifras soltas em `.png` / `.jpg` / `.psd`

Cobre `chords/-Artistas/<Artista>/chords/`, `chords/new-general/<coletânea>/` e
`chords/_a-identificar/`. Aqui a cifra é **imagem**, e o app suporta isso
nativamente: a música tem chart de imagem em vez de texto. Não há transcrição
obrigatória.

**Um documento = uma pasta.** Para `-Artistas`, as cifras soltas de um artista
contam como um documento só; um songbook na mesma pasta é outro documento.

## O que o índice precisa registrar

Uma linha por arquivo, e três colunas que decidem o trabalho:

| Coluna | Por quê |
|---|---|
| **Arquivo** | é a identidade; o título nem sempre está no nome |
| **Música / Artista** | identificado a partir da imagem, não do nome do arquivo |
| **Largura em px** | decide se serve no tablet — ver abaixo |
| **Tipo** | `aberta` (com diagramas de acorde) ou `fechada` (só cifra) |
| **Status** | os seis de sempre |

`aberta`/`fechada` é campo real da música no app. **Não traduzir esse valor** —
ele é persistido no registro, e um `data-tipo` traduzido faz a biblioteca salva
em inglês divergir da salva em português.

## Resolução é o critério que mais elimina

Capturas de ~595 px de largura **borram no tablet**, que é onde o app é usado, na
estante de partitura. O alvo é **~2×** disso. Medir e registrar:

```bash
sips -g pixelWidth -g pixelHeight arquivo.png
```

Uma imagem abaixo de ~1000 px de largura merece uma anotação no índice: ou se
procura fonte melhor, ou se aceita conscientemente. **Não é 🚫** — a música sai,
só sai ruim. 🚫 é para o que não existe.

## `.psd`

Não abre no app. Precisa ser exportado para `.png` antes de virar cifra, e o
índice registra o `.psd` como origem e o `.png` como o que entra. Exportar na
resolução do arquivo, não na de tela.

## Identificar artista

Em `_a-identificar/` o artista é o que falta, e é o único bloqueio. Uma música sai
dessa pasta quando o artista for descoberto e ela for movida para a pasta dele —
o que **muda o documento a que ela pertence**. Ao mover, tirar a linha de um
índice e pôr no outro; o script recontará os dois.

Enquanto não houver artista, a música fica ⬜ com a observação do que já se sabe
(trecho de letra legível, estilo aparente).

## Front matter típico

```yaml
---
documento: Cartola — cifras soltas
acervo: -Artistas
fonte: CifraClub
tipo: imagens
dificuldade: 2
dificuldade_por_que: "imagem entra direto no app; o custo é identificar título/artista e conferir resolução"
atualizado: 2026-08-13
---
```

`fonte` aqui costuma ser a origem da captura (`CifraClub`), não `Songbook`. Se a
origem for desconhecida, deixar em branco em vez de chutar — `fonte` é o que
desambigua título repetido nas listagens.

## Dificuldade

**1-3.** É o tipo mais barato: não há extração de cifra, só catalogação. Sobe
quando a resolução obriga a procurar fonte melhor, ou quando o artista precisa ser
descoberto música a música.
