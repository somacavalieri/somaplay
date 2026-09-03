# Skill `/chord` — índice, progresso e extração do acervo — design

2026-08-13

## O problema

A extração de cifras do acervo em `chords/` é um projeto de meses, feito em sessões
esparsas, pulando entre livros e voltando semanas depois. O que garante que dá para
retomar é o registro escrito — e hoje ele existe **em um acervo só**.

`chords/-new-songbook/PROGRESSO-EXTRACAO.md` tem 1258 linhas e é excelente: mapa de
páginas verificado, estado do scan medido, decisões com o porquê, armadilhas de
ferramenta. Ao lado dele, 15 `INDICE.md`, um por livro. Isso cobre um dos cinco
acervos. Os outros quatro não têm registro nenhum:

| Acervo | Conteúdo | Registro hoje |
| --- | --- | --- |
| `-new-songbook/` | ~15 livros com pasta + PDF | `PROGRESSO-EXTRACAO.md` + 15 `INDICE.md` |
| `-pasta-vitor/` | 158 + 39 pastas de artista em `.doc` (fonte `VJ`) | um `o-progresso.txt` solto |
| `-Artistas/` | 31 artistas, cifras soltas e songbooks | nenhum |
| `new-general/` | 5 coletâneas | nenhum |
| `_a-identificar/` | 6 imagens sem artista identificado | nenhum |

Três problemas concretos:

- **não existe visão geral.** Para saber quanto do acervo inteiro está extraído é
  preciso abrir cinco pastas e somar de cabeça — e quatro delas não têm o que somar;
- **os números são digitados à mão em dois lugares.** A tabela de resumo no topo do
  `PROGRESSO-EXTRACAO.md` e o status música a música em cada `INDICE.md` são a mesma
  informação escrita duas vezes. Já divergem: o resumo diz "Bossa Nova 1 — 2 prontas"
  e a tabela do livro é onde isso de fato se verifica;
- **o denominador é ambíguo.** "62 (61 extraíveis)" é prosa, não conta. A página 119
  do Bossa Nova 2 não foi escaneada e a música nunca vai sair dali; isso precisa sair
  do denominador sem sumir do registro.

E o método já provado no `-new-songbook` — levantar índice, verificar o mapa de
páginas, extrair, conferir duas vezes, anotar — está descrito em prosa, no meio de
1258 linhas. Não é executável nem transferível para os outros quatro acervos.

## A decisão

Uma skill `/chord` com três comandos, sobre uma hierarquia de três níveis onde
**só um arquivo é editado à mão** e os outros dois são somados por script.

```
chords/PROGRESSO.md                          ← dashboard, 100% gerado
├── -new-songbook/PROGRESSO.md               ← acervo: método comum + tabelas geradas
│   └── Bossa Nova 1 - Almir Chediak/INDICE.md   ← documento: a fonte de verdade
├── -pasta-vitor/PROGRESSO.md
│   └── Chico Buarque/INDICE.md
├── -Artistas/PROGRESSO.md
├── new-general/PROGRESSO.md
└── _a-identificar/PROGRESSO.md
```

**O `INDICE.md` do documento é a única fonte de verdade.** Os dois níveis acima
apenas agregam. Nenhum número é digitado duas vezes — é isso que impede o dashboard
de mentir depois de três meses sem ninguém olhar.

## O contrato do `INDICE.md`

Três partes, nessa ordem: front matter, prosa livre, tabela de músicas. O script lê
**o front matter e a coluna Status**, e ignora todo o resto.

```yaml
---
documento: Bossa Nova 1
acervo: -new-songbook
fonte: Songbook              # Songbook | RV | VJ | CifraClub | …
tipo: pdf-scan               # pdf-scan | pdf-texto | docx | imagens
arquivo: "[Songbook] Bossa Nova 1 [Almir Chediak].pdf"
gerador: books/bossa_nova_1.py
saida: bossa-nova-1.somaplay
dificuldade: 5
dificuldade_por_que: "300 dpi limpo e índice impresso no PDF, mas o offset muda uma vez"
atualizado: 2026-08-12
---
```

`gerador` e `saida` são opcionais — um acervo de imagens soltas não tem nenhum dos
dois. `documento`, `acervo`, `tipo` e `dificuldade` são obrigatórios.

Depois do front matter vem **a prosa**, que é onde mora o valor: mapa de páginas,
estado do scan medido, anomalias, decisões e pendências daquele documento. Hoje ela
está no `PROGRESSO-EXTRACAO.md`; passa a morar aqui (ver Migração).

Por último **a tabela**, com uma coluna `Status` cujo primeiro caractere é o emoji.
Só o emoji é lido; o resto da célula é observação livre. As outras colunas variam por
tipo de documento e o script não olha para elas.

## Os seis status

| | Significado | Efeito na conta |
| --- | --- | --- |
| ⬜ | não extraída | denominador |
| 🔲 | gerada, ainda não conferida no app | feita, parcial |
| ✅ | conferida no app contra o impresso | feita, completa |
| ⚠️ | extraída com pendência conhecida e anotada | feita, com dívida |
| 🚫 | não extraível — perda real | **fora do denominador** |
| ⏸️ | duplicada; decidido extrair de outro documento | **fora do denominador** |

Com isso `62 no livro = 61 extraíveis + 1 perdida no scan` deixa de ser prosa e vira
conta. Os três primeiros já são o vocabulário em uso; os três últimos existem hoje
apenas como texto na coluna Obs, e por isso não aparecem em lugar nenhum.

**⚠️ conta como feita**, não como pendente: a música está no `.somaplay` e abre no
app. O que ela tem é uma dívida anotada — um acorde preso na linha `Intro.:`, uma
digitação que não bate com o nome. Contar como não-feita esconderia trabalho real;
não distinguir de ✅ esconderia a dívida.

## O script — `scripts/chords/progresso.py`

Python puro, sem dependência, como o resto de `scripts/`. Faz três coisas:

- **`progresso.py`** — varre `chords/*/`, lê todo `INDICE.md`, recalcula e reescreve
  os blocos gerados de cada `PROGRESSO.md` de acervo e do dashboard;
- **`progresso.py --check`** — não escreve nada; sai com código ≠ 0 e lista o que
  está fora de sync. É como se sabe que alguém esqueceu de rodar;
- **`progresso.py <acervo>`** — limita a um acervo.

Três garantias que o script precisa dar:

1. **só reescreve entre marcadores** `<!-- chord:auto -->` e `<!-- /chord:auto -->`.
   Tudo fora deles é intocável. É essa regra que protege as 1258 linhas já escritas —
   e ela vale também para o `INDICE.md`, que o script **nunca** escreve. Quem edita
   `INDICE.md` é a skill (em `/chord indice` e `/chord extract`) ou a mão; o script
   só lê;
2. **nunca some com o que não entende.** Um `INDICE.md` sem front matter, ou com
   front matter incompleto, entra no dashboard numa seção *fora do padrão*, com o
   caminho do arquivo. Não é ignorado nem estimado;
3. **nunca inventa número.** Toda contagem sai de emoji contado em tabela. Se a
   tabela não tem coluna Status, o documento cai no caso 2.

## O dashboard — `chords/PROGRESSO.md`

Gerado inteiro. Mostra, por acervo e no total:

- **contagem** `feitas / extraíveis`, onde feitas = ✅ + 🔲 + ⚠️ e extraíveis =
  total − 🚫 − ⏸️. O termo é *feitas*, e não *prontas*, de propósito: "pronta" é o
  nome de ✅ na legenda em uso, e usar a mesma palavra para a soma dos três faria o
  dashboard dizer que 37 músicas do Gil estão conferidas no app quando nenhuma está;
- **barra de progresso** `████░░░░░░ 37/64`, com ✅ e 🔲/⚠️ em caracteres distintos —
  a distância entre gerada e conferida é o que resta de trabalho em todo o acervo;
- **dificuldade** de cada documento (ver escala abaixo), que é o que responde "o que
  é barato fazer agora";
- **data da última atualização** por documento, do campo `atualizado` — mostra o que
  está parado há meses sem ninguém precisar lembrar;
- **bloqueios e perdas**: todos os 🚫 e ⚠️ dos cinco acervos numa lista só, com a
  observação de cada um. É o que evita redescobrir a página faltante do Bossa Nova 2
  daqui a seis meses.

### O dashboard lista só o que está em progresso (2026-08-30, revisto em 31)

A tabela por documento começou listando os cinco acervos inteiros. Com o acervo do
Vitor extraído, isso virou 199 linhas — 172 delas em 100% — e a frente de trabalho
real, os 24 songbooks com música ⬜, ficava três telas abaixo do topo. Um dashboard
que obriga a rolar para achar o que fazer não é dashboard.

A tabela por documento passa a nomear **só os documentos em progresso** — começados
e inacabados, `0 < feitas < extraíveis`. Os outros dois estados viram uma linha por
acervo, com contagem de documentos e de músicas, apontando para o `PROGRESSO.md` do
acervo — que continua listando todos, um a um:

- **ainda não começados** (`feitas = 0`), contados pelas músicas **mapeadas**: é a
  fila, e o que interessa dela é o tamanho;
- **concluídos**, contados pelas músicas **feitas**.

Nada some: muda o nível da hierarquia em que cada coisa é lida. A tabela por acervo
ganha as colunas **Em progresso** e **Zerados** — juntas com **Docs**, dizem de longe
onde há trabalho andando, onde há fila e o que já fechou.

Um documento com `extraíveis = 0` (tudo 🚫 ou ⏸️) **não** conta como concluído nem
como não começado: fica nomeado na tabela, marcando 0 de 0. Não há trabalho ali, mas
cair numa linha de contagem esconderia uma perda inteira.

E como a tabela encolheu, cabe nela a coluna que faltava: **por que essa
dificuldade**, copiada de `dificuldade_por_que`. O número sozinho não decide nada —
"8" não diz se o problema é resolução, offset ou página faltando. A justificativa
é cortada em 90 caracteres na borda de palavra; a íntegra está no `INDICE.md`.

## A escala de dificuldade

Um número de 1 a 10 por documento, **1 é o mais fácil**. Mora no front matter junto
com a linha que o justifica, e o script apenas copia — não calcula. O que torna o
número defensável é a justificativa ao lado, não uma fórmula.

Âncoras, calibradas nos documentos já conhecidos:

| Nota | Perfil | Exemplo |
| --- | --- | --- |
| 1-2 | PDF nativo com camada de texto e índice interativo | Rodrigo Vianna vol. 3 |
| 3-4 | `.docx`, ou scan limpo com offset constante e índice impresso no próprio PDF | Chico Buarque vol. 1 |
| 5-6 | scan bom com uma anomalia de paginação | Bossa Nova 1 |
| 7-8 | offset mudando várias vezes, páginas perdidas, ou resolução ~100 dpi | Bossa Nova 3 e 4 |
| 9-10 | bitonal + espiral encostando no texto + offset mudando 4× + página não escaneada | Caetano Veloso vol. 2 |

Os fatores que movem a nota, documentados na skill: camada de texto (o que mais pesa
— muda a ordem de grandeza do trabalho), resolução, bitonal, inclinação por página,
mapa de páginas, integridade do scan, sujeira de borda que encosta no texto, e se a
grade de diagramas é legível.

A dificuldade é **por música**, não pelo tamanho do documento. O volume já está na
contagem; multiplicar os dois é o custo real de fechar o livro.

## Os comandos

### `/chord indice <pasta ou arquivo>`

Detecta o tipo do material, roda o levantamento adequado, e escreve o `INDICE.md`
com front matter, prosa do que foi medido, e a tabela com todas as músicas em ⬜.
Atribui a dificuldade com a escala acima. Ao final roda o script.

Se já existir `INDICE.md` na pasta, **pergunta antes de sobrescrever** e oferece
atualizar só a tabela, preservando a prosa.

### `/chord update [acervo]`

Roda o script e relata o diff. Barato, sem julgamento, sem escrever prosa.

### `/chord extract <documento> <música | página>`

Ciclo fechado, uma música por vez:

1. extrai a cifra pelo caminho do tipo daquele documento;
2. escreve ou atualiza o módulo do livro (`scripts/new_songbook/books/<slug>.py`);
3. gera o `.somaplay`;
4. roda **as duas conferências**, que falham por motivos diferentes e nenhuma
   substitui a outra:
   - a cifra está *bem formada*? — passar pelo `parseCifraText` do próprio app;
   - a cifra está *completa*? — comparar os acordes extraídos com a grade de
     diagramas impressa da página, quando o documento traz uma. É a única das duas
     que enxerga acorde faltando, e é a que achou três bugs no Rodrigo Vianna;
5. marca 🔲 no `INDICE.md` — ou ⚠️ com a pendência escrita, se a segunda conferência
   acusou algo;
6. roda o script.

**Nunca marca ✅.** ✅ significa aberta no app e comparada com o impresso, o que é
trabalho humano e a terceira camada de conferência. A skill só chega a 🔲.

### `/chord` sozinho

Mostra o dashboard resumido.

## As recipes por tipo

`pdf-scan`, `pdf-texto`, `docx` e `imagens` têm procedimentos muito diferentes —
levantar fólio a fólio não tem nada a ver com rodar `textutil`. Cada tipo é um
arquivo separado dentro da skill, carregado só quando aquele tipo aparece. Crescer
para um tipo novo não incha os outros.

Os quatro cobrem a maioria do acervo; tipos novos entram sob demanda, quando
aparecerem.

## O que a skill não faz

- **não marca ✅** — ver acima;
- **não traduz nem renota a cifra do usuário.** A regra do `CLAUDE.md` vale aqui
  inteira: alinhamento por coluna de caractere, `A7M` tem 3 caracteres e `Amaj7`
  tem 5;
- **não põe letra nem cifra de terceiro no repositório.** Os `INDICE.md` ficam em
  `chords/`, que é gitignored; os módulos por livro em `books/`, também gitignored.
  A skill e o script são código nosso e ficam versionados;
- **não apaga PDF duplicado.** O `PROGRESSO-EXTRACAO.md` registra vários casos de
  cópias byte-idênticas conferidas e deliberadamente não apagadas. A skill registra,
  não decide.

## Migração

O trabalho real está aqui, e é feito em duas fases para que o formato seja visto
funcionando antes de tocar em 15 arquivos.

**Fase 1 — formato provado em um piloto:**

- `scripts/chords/progresso.py` com teste;
- a skill em `.claude/skills/chord/`;
- `chords/PROGRESSO.md` e os 5 `PROGRESSO.md` de acervo, criados com os marcadores;
- **Bossa Nova 1 migrado como piloto** — é o mais simples e tem seção completa no
  arquivo atual;
- os outros 14 documentos aparecem no dashboard como *fora do padrão*, que é o
  comportamento correto e visível.

**Fase 2 — os outros 14:**

- front matter e status normalizado em cada `INDICE.md`;
- a prosa por documento desce do `PROGRESSO-EXTRACAO.md` para o `INDICE.md` do
  documento;
- o que sobra de método comum a todos os livros (limiares de leitura de diagrama,
  gap de token, escala por música, as duas conferências) fica em
  `-new-songbook/PROGRESSO.md`;
- `PROGRESSO-EXTRACAO.md` é renomeado para `PROGRESSO.md`.

Nomes uniformes nos três níveis: `PROGRESSO.md` na raiz e em cada acervo,
`INDICE.md` em cada documento. O script acha tudo por nome, sem lista fixa.

## Como se verifica

Não há DOM nem app envolvidos; a verificação é do script e da aritmética.

- **teste do script** — fixtures com `INDICE.md` de cada tipo, incluindo os casos
  ruins: sem front matter, sem coluna Status, com emoji desconhecido, com marcador
  de bloco ausente. O caso que mais importa: **prosa fora dos marcadores sobrevive a
  uma reescrita**;
- **`--check` dá zero divergência** no estado migrado;
- **as contagens batem com o que o arquivo atual declara**: 37/64 Gil, 60/60
  Rodrigo Vianna, 5/50 melhores vol. 1, 4/56 Chico vol. 1, 2/62 Bossa Nova 1, 1/68
  Caetano vol. 2, 2/49 Caymmi vol. 2. Divergência aqui é erro de leitura minha na
  migração, não do script — e é justamente o que a fase 1 existe para pegar cedo.

## Fora de escopo

- **contagem a partir dos `.somaplay`.** Enxergaria o que foi gerado, mas não o que
  falta nem o que já foi conferido no app — que é metade do que o registro precisa
  dizer;
- **"próximo passo" por documento** no dashboard. A dificuldade e a lista de
  bloqueios cobrem parte disso; se depois faltar, é um campo a mais no front matter;
- **histórico por mês.** O campo `atualizado` diz o que está parado; série temporal
  é outra coisa e não foi pedida;
- **automatizar a conferência no app (✅).** É trabalho humano contra o impresso, e
  é o custo irredutível de todo o projeto.
