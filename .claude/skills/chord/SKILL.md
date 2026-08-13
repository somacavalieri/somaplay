---
name: chord
description: Indexa, extrai e acompanha o progresso do acervo de cifras em chords/. Use sempre que o usuário rodar /chord (com ou sem subcomando — indice, update, extract), pedir para levantar o índice de um songbook, PDF, pasta de imagens ou acervo .doc, extrair uma música de um livro para o app, ou atualizar o dashboard de progresso da extração.
---

# `/chord` — índice, progresso e extração do acervo

O acervo em `chords/` é um projeto de meses, feito em sessões esparsas, pulando
entre livros e voltando semanas depois. O que garante que dá para retomar é o
registro escrito. Esta skill mantém esse registro correto sem que nenhum número
seja digitado duas vezes.

Spec: `docs/superpowers/specs/2026-08-13-skill-chord-design.md`.

## A hierarquia, e a regra de ouro

```
chords/PROGRESSO.md                      ← dashboard, 100% gerado
├── -new-songbook/PROGRESSO.md           ← acervo: método comum + bloco gerado
│   └── Bossa Nova 1 - Almir Chediak/INDICE.md   ← documento: fonte de verdade
├── -pasta-vitor/PROGRESSO.md
├── -Artistas/PROGRESSO.md
├── new-general/PROGRESSO.md
└── _a-identificar/PROGRESSO.md
```

**Só o `INDICE.md` é editado à mão.** Os dois níveis acima são gerados por:

```bash
python3 scripts/chords/progresso.py            # reescreve os blocos gerados
python3 scripts/chords/progresso.py --check    # não escreve; sai 1 se há divergência
python3 scripts/chords/progresso.py -new-songbook   # limita a um acervo
```

**Nunca edite nada entre `<!-- chord:auto -->` e `<!-- /chord:auto -->`.** Vai ser
sobrescrito. Para mudar um número, mude o status no `INDICE.md` e rode o script.

Uma pasta entra no dashboard **tendo um `PROGRESSO.md`**. É assim que
`-dicionario`, `-notion` e `-soma-play` ficam de fora: não são frentes de
extração.

## O contrato do `INDICE.md`

Front matter, prosa livre, tabela — nessa ordem. O script lê o front matter e a
coluna Status; ignora todo o resto.

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
atualizado: 2026-08-13
---
```

- **Obrigatórios:** `documento`, `acervo`, `tipo`, `dificuldade`. Sem eles o
  documento cai na seção *fora do padrão* do dashboard — que é melhor que sumir
  da conta, mas precisa ser resolvido.
- `gerador` e `saida` não existem para acervo de imagens soltas.
- O front matter é **`chave: valor` plano**, lido por um parser de 15 linhas. Não
  use listas nem aninhamento; valor com dois-pontos precisa de aspas.

Depois vem a **prosa**: mapa de páginas, estado do scan medido, anomalias,
decisões, pendências. É o conteúdo mais valioso do acervo e mora no arquivo do
documento a que se refere — não no `PROGRESSO.md` do acervo.

Por último a **tabela**, com uma coluna cujo cabeçalho começa com `Status` e cuja
célula **começa pelo emoji**. Negrito antes do emoji é tolerado
(`**🔲 gerada…**`); texto antes, não.

`Bossa Nova 1 - Almir Chediak/INDICE.md` é o modelo migrado — leia antes de criar
ou migrar outro.

## Os seis status

| | Significado | Conta onde |
|---|---|---|
| ⬜ | não extraída | denominador |
| 🔲 | gerada, ainda não conferida no app | feita, parcial |
| ✅ | conferida no app contra o impresso | feita, completa |
| ⚠️ | extraída com pendência conhecida e anotada | feita, com dívida |
| 🚫 | não extraível — perda real | **fora do denominador** |
| ⏸️ | duplicada; decidido extrair de outro documento | **fora do denominador** |

*Feitas* = ✅ + 🔲 + ⚠️. *Extraíveis* = total − 🚫 − ⏸️.

**Esta skill nunca marca ✅.** ✅ significa alguém abriu no app e comparou com o
impresso. É a terceira camada de conferência, é humana, e é o custo irredutível
do projeto. O máximo que a skill alcança é 🔲 — ou ⚠️, quando a conferência
automática acusou algo.

**⚠️ conta como feita.** A música está no `.somaplay` e abre no app; o que ela
tem é dívida anotada. Contar como pendente esconderia trabalho real; misturar
com ✅ esconderia a dívida.

## A escala de dificuldade (1-10, 1 é o mais fácil)

Vai no front matter junto com a linha que a justifica. Não é fórmula: o que
torna o número defensável é o fato ao lado dele. É **por música**, não pelo
tamanho do documento — o volume já está na contagem.

| Nota | Perfil | Exemplo |
|---|---|---|
| 1-2 | PDF nativo com camada de texto e índice interativo | Rodrigo Vianna vol. 3 |
| 3-4 | `.docx`, ou scan limpo com offset constante e índice no próprio PDF | Chico Buarque vol. 1 |
| 5-6 | scan bom, uma anomalia de paginação | Bossa Nova 1 |
| 7-8 | offset mudando várias vezes, páginas perdidas, ou ~100 dpi | Bossa Nova 3 e 4 |
| 9-10 | bitonal + espiral encostando no texto + offset mudando 4× + página não escaneada | Caetano Veloso vol. 2 |

Fatores, em ordem de peso:

1. **Camada de texto no PDF** — muda a ordem de grandeza do trabalho, não a
   margem. Sem OCR e sem medição de pixel, o custo cai para a conferência.
2. **Mapa de páginas** — offset constante, offset que muda, ou índice impresso
   ausente do próprio volume.
3. **Resolução** — ≥280 dpi é confortável; ~150 dá para ler; ~100 dpi não
   sustenta leitura de grade de diagramas por pixel.
4. **Bitonal sem cinza** — a letra fina esfarela e o primeiro acorde da pauta sai
   corrompido.
5. **Integridade do scan** — páginas faltando, duplicadas ou trocadas.
6. **Inclinação por página** — obriga deskew individual, um ângulo só não serve.
7. **Sujeira de borda que encosta no texto** — espiral de fichário é a pior.
8. **Grade de diagramas legível** — decide se `cifra.digitacoes` é possível.

## Os comandos

### `/chord` (sem argumento)

Ler `chords/PROGRESSO.md` e resumir: total feito, por acervo, o que está mais
barato (menor dificuldade com músicas ⬜), e os bloqueios. Não escrever nada.

### `/chord indice <pasta ou arquivo>`

1. **Identificar o tipo** — `pdf-texto` se o PDF tem camada de texto útil,
   `pdf-scan` se não; `docx` para o acervo do Vitor; `imagens` para pasta de
   `.png`/`.jpg`/`.psd`.
2. **Carregar a recipe do tipo**: `recipes/<tipo>.md`, desta pasta. Não seguir de
   memória — cada recipe carrega armadilhas medidas que custaram sessões.
3. Rodar o levantamento que a recipe descreve.
4. Escrever o `INDICE.md`: front matter, a prosa do que foi medido, e a tabela
   com **todas as músicas em ⬜**.
5. Atribuir `dificuldade` e `dificuldade_por_que` pela escala acima.
6. Rodar `python3 scripts/chords/progresso.py`.

Se já existir `INDICE.md` na pasta, **perguntar antes de sobrescrever** e
oferecer atualizar só a tabela, preservando a prosa.

### `/chord update [acervo]`

Rodar o script e relatar o que mudou. Nada de julgamento, nada de prosa. Se algum
documento aparecer como *fora do padrão*, dizer qual e por quê.

### `/chord extract <documento> <música | página>`

Ciclo fechado, uma música por vez:

1. Extrair a cifra pelo caminho que a recipe do tipo descreve.
2. Escrever ou atualizar o módulo do livro em `scripts/new_songbook/books/<slug>.py`
   (gitignored — é onde a letra transcrita mora, fora do repositório).
3. Gerar: `python3 scripts/new_songbook/make_somaplay.py <slug>`.
4. **As duas conferências.** Falham por motivos diferentes e nenhuma substitui a
   outra:
   - **bem formada?** — passar a cifra pelo `parseCifraText` do app
     (`app/js/chords.js`), conferindo se cada linha de acorde é reconhecida como
     tal. `scripts/new_songbook/check_cifra.py` faz isso;
   - **completa?** — comparar os acordes extraídos com a **grade de diagramas
     impressa** da página, quando o documento traz uma. É a única das duas que
     enxerga acorde faltando, e foi ela que achou três bugs no Rodrigo Vianna.

   A cifra **bem formada e incompleta** é o defeito que passa: nada dá erro, a
   música abre, e o acorde simplesmente não está lá.
5. Marcar 🔲 na tabela do `INDICE.md` — ou ⚠️, com a pendência escrita na coluna
   de observação, se a segunda conferência acusou algo.
6. Rodar `python3 scripts/chords/progresso.py`.

Ao comparar a grade com a cifra, comparar como **conjunto** e classificar cada
diferença em *perda real* (o acorde existe na página e sumiu) versus *grade
extra* (o livro desenha diagrama de acorde que a cifra não usa). O diff cru
mente.

## Três regras que não se negociam

Do `CLAUDE.md` do projeto, e valem em todo comando desta skill.

1. **Nunca traduzir nem renotar a cifra do usuário.** Uma cifra em texto alinha
   acorde sobre sílaba por coluna de caractere: `A7M` tem 3 caracteres e `Amaj7`
   tem 5. Qualquer substituição desloca todos os acordes da linha.
2. **Nenhuma letra ou cifra de terceiro no repositório versionado.** Os
   `INDICE.md` ficam em `chords/`, gitignored; os módulos por livro em
   `scripts/new_songbook/books/`, gitignored. Em PDF nativo, prefira o extrator
   reconstruir a cifra na geração a escrevê-la no módulo.
3. **Não apagar PDF duplicado.** Registrar no `INDICE.md` que existe, se é
   byte-idêntico e qual é a melhor cópia. A decisão de apagar é do usuário.

## Quando algo não bate

O script nunca inventa número. Se o dashboard mostrar algo inesperado:

- **documento em "fora do padrão"** — falta front matter, falta coluna Status, ou
  há status fora dos seis. A mensagem diz qual;
- **contagem menor que o esperado** — provavelmente a tabela tem linhas cuja
  célula de status não começa pelo emoji;
- **`--check` acusando divergência** — alguém editou o `INDICE.md` e não rodou o
  script, ou editou dentro do bloco gerado. Rodar sem `--check` resolve.

Ao migrar um índice antigo, conferir a contagem nova **contra o que o arquivo
declarava antes**. Divergência aí é erro de leitura na migração, não do script.
