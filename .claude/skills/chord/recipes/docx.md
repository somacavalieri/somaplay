# Recipe: `docx` — acervo em `.doc` / `.docx`

O acervo do Vitor (`chords/-pasta-vitor/`, fonte **`VJ`**): 170 pastas de
artista com arquivos `.doc`, uma música por arquivo. Sem OCR, sem medição de
pixel — o texto está lá. O trabalho é de identificação e limpeza, não de leitura.

**Um documento = uma pasta de artista.** O `INDICE.md` vai dentro dela, e cada
linha da tabela é uma música.

## Quando o acervo já foi extraído, o lote é a fonte de verdade

Foi o caso aqui, e é o que mais confunde: sobraram **1.361 arquivos `.doc`** nas
pastas para **5.523 músicas** geradas. Os `.doc` foram saindo conforme a extração
avançou — pasta vazia significa artista **extraído**, não o contrário.

Ao indexar um acervo nesse estado, **levantar a tabela do `.somaplay`**, não dos
arquivos que sobraram: leia o lote com `read_somaplay` de
`scripts/somaplay_edit.py` (o formato tem cabeçalho `SOMAPLAY1` + 10 dígitos de
tamanho antes do JSON, então `json.load` direto falha). Todas entram **🔲** —
geradas, ainda não conferidas no app.

Vale medir o lote na mesma passada, porque é barato e acha defeito que ninguém
veria: cifra em branco, título que não sobreviveu à conversão, título repetido
dentro do mesmo artista. Nas 5.523 apareceram duas — uma cifra vazia e um título
que virou `,,` com o nome real na primeira linha da cifra.

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
