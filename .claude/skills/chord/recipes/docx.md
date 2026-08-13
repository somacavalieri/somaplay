# Recipe: `docx` — acervo em `.doc` / `.docx`

O acervo do Vitor (`chords/-pasta-vitor/`, fonte **`VJ`**): ~197 pastas de
artista, cada uma com arquivos `.doc` de uma música. Sem OCR, sem medição de
pixel — o texto está lá. O trabalho é de identificação e limpeza, não de leitura.

**Um documento = uma pasta de artista.** O `INDICE.md` vai dentro dela, e cada
linha da tabela é uma música.

## Converter

`.doc` antigo não é `.docx`. No macOS:

```bash
textutil -convert txt -output /tmp/saida.txt "arquivo.doc"
```

Converter para `txt`, não para `rtf` nem `html`: o que importa é o alinhamento de
coluna entre acorde e sílaba, e qualquer formato com marcação o destrói.

**Conferir a codificação.** Acento saindo errado indica que o `textutil` leu como
Latin-1; reconverter com `-inputencoding`.

## O que olhar em cada arquivo

- **Alinhamento por coluna sobreviveu?** A cifra em texto alinha acorde sobre
  sílaba contando caracteres. Se o `.doc` usava fonte proporcional e tabulação, o
  alinhamento pode estar quebrado na origem — é o caso que decide se a música sai
  ou não.
- **Tom no corpo do texto x tom no metadado.** Estes arquivos costumam trazer o
  tom escrito no cabeçalho da própria música. Ele é o que vale; o campo `tom` da
  música recebe esse valor. Quando o corpo não traz, inferir do primeiro/último
  acorde e marcar como inferido — vazio é melhor que errado.
- **Nome do arquivo x título dentro do arquivo.** O de dentro vale. Nome de
  arquivo carrega abreviação, numeração de pasta e grafia inconsistente.
- **Grafia do artista.** Vem do nome da pasta e frequentemente está errada ou
  abreviada. Artista é reaproveitado por nome no import: um "Jorge Ben Jor" e um
  "Jorge Benjor" viram dois artistas que nenhum import futuro casa. Padronizar
  contra o que a biblioteca já usa, e registrar a correção no `INDICE.md`.

## Colisão de título com o que já está na biblioteca

Este acervo já causou isso: **21 músicas** do `VJ` têm título igual a músicas
vindas do CifraClub. Não é problema de dados — `fonte` distingue as duas na
interface (ver `docs/superpowers/specs/2026-08-12-desambiguacao-por-fonte-design.md`).

Mas **se a intenção for ficar com uma só**, a outra vira ⏸️ no índice de quem não
vai fornecê-la, e a decisão fica escrita.

## Front matter típico

```yaml
---
documento: Chico Buarque
acervo: -pasta-vitor
fonte: VJ
tipo: docx
dificuldade: 3
dificuldade_por_que: "texto direto do .doc; o custo é identificar título/tom e conferir alinhamento"
atualizado: 2026-08-13
---
```

Sem `arquivo` (são muitos) e sem `gerador`/`saida` enquanto não houver um módulo
para o artista.

## Dificuldade

Fica em **3-4** por padrão: o texto vem de graça, mas cada música ainda precisa
de identificação, checagem de alinhamento e conferência no app. Sobe se o
alinhamento estiver quebrado na origem, o que transforma o trabalho em
transcrição.
