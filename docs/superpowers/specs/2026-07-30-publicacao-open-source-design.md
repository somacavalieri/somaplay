# Publicação open source — checklist

**Data:** 2026-07-30
**Atualizado:** 2026-08-04 — Nível 1 executado, mais CI e proteção da `main`.
**Status:** em execução — **15 de 31 tarefas feitas**
**Repo:** `github.com/somacavalieri/somaplay` — público desde 2026-07-05, no ar em
[somacavalieri.github.io/somaplay](https://somacavalieri.github.io/somaplay/)

## Placar

| Fase | Feito | Situação |
|---|---|---|
| 0 — Higiene | 3 / 5 | Riscos fechados. Os dois restantes viraram arrumação, não proteção |
| 1 — Jurídico | 5 / 6 | **Sem pendência jurídica.** Falta só o áudio demo (T-08), que é conteúdo |
| 2 — Vitrine | 4 / 5 | Falta screenshots (T-14) |
| 3 — Contribuição | 3 / 7 | CI verde e `main` protegida. Falta o que convida alguém a entrar |
| 4 — Rename | 0 / 7 | Não começou, por decisão |
| Extra | 1 / 1 | i18n PT/EN entregue e no ar |

---

## 1. Contexto

Amigos se interessaram pelo projeto e ele vai deixar de ser só pessoal. O repositório
**já está público**, mas não está *publicável*: sem licença, sem README na raiz, sem
descrição, sem caminho de contribuição, e com conteúdo de terceiros no código-fonte.

"Publicar" aqui significa: tornar o repositório apresentável, legalmente limpo e aberto
a contribuição.

## 2. Decisões tomadas

| # | Decisão | Motivo |
|---|---|---|
| D1 | **Manter `soma_play` por enquanto.** Renomear depois (candidato: SomaChords) | Só 4 tarefas dependem do nome; o resto não fica esperando branding |
| D2 | **Licença MIT** | Máxima adoção, texto curto, padrão para projeto pessoal que abre |
| D3 | **Renomear o repo existente** (quando o nome fechar), não criar um novo | GitHub redireciona a URL antiga; preserva histórico e issues |
| D4 | **Inglês** em README, docs públicas e commits novos | Alcance internacional |
| D5 | ~~UI do app segue em português. i18n vira issue futura~~ → **revertida em 2026-08-01: a UI ganha seletor PT/EN** | Ver [`2026-08-01-i18n-pt-en-design.md`](2026-08-01-i18n-pt-en-design.md). Um visitante que chega pelo README em inglês e cai numa tela em português queima a primeira impressão |
| D6 | **Specs internas (`docs/superpowers/`) seguem em português** | São o histórico real de design; traduzir 14 documentos não paga |
| D7 | **Remover todas as músicas demo de terceiros** | Ver §3.1 — é o único bloqueio jurídico real |
| D8 | **Substituir por conteúdo demo de autoria própria** | Sem demo, o primeiro acesso é uma tela vazia. Ver T-07 |

## 3. Achados da auditoria

### 3.1 Conteúdo de terceiros — o bloqueio ✅ RESOLVIDO

> **Correção de 2026-08-03:** esta seção dizia "4 músicas demo". Eram **8** — a auditoria
> original leu só até a linha 440 de um arquivo de 499. Sete continham obra de terceiros,
> quatro delas marcadas explicitamente `fonte: 'CifraClub'`. Registrado porque o erro é
> instrutivo: uma leitura parcial produziu um número que parecia verificado.

| Demo | O que estava versionado | Situação |
|---|---|---|
| Paralelas (Fagner) | `app/samples/paralelas.png` — imagem de cifra | Protegida |
| Andança (Beth Carvalho) | `ANDANCA_CIFRA` + **`ANDANCA_LETRA` (letra integral)** | Protegida — letra completa hardcoded |
| Groove de teste | 4 × `app/samples/demo/*.mp3` | Autoral (texto e letra ficaram) |
| As Pastorinhas (Noel Rosa) | Texto + 15 digitações | **Não é domínio público** — co-autoria com João de Barro (Braguinha, †2006), protegida até 2077 |
| Oxum (Serena Assumpção) | Texto + digitações, `fonte: 'CifraClub'` | Protegida |
| Queremos Saber (Cássia Eller) | Texto, `fonte: 'CifraClub'` | Protegida |
| Disfarça e Chora (Cartola) | Texto, `fonte: 'CifraClub'` | Protegida |
| Me Dê Motivo (Tim Maia) | Texto, `fonte: 'CifraClub'` | Protegida |

**Resolvido em `622350b`:** `samples.js` foi de 499 para 45 linhas, de 8 músicas para 1.
Sobrou "Groove de teste", cuja cifra e letra foram escritas para o projeto — autoral, entra
sob MIT. Os 5 arquivos de mídia (1,1 MB) saíram, o `SHELL` do Service Worker foi ajustado e
o `VERSION` subiu no mesmo commit.

**Nota sobre o plano B:** disponibilizar um `.somaplay` para download público é
publicação igual. Se o arquivo contiver cifras e letras de terceiros, o problema muda de
lugar, não desaparece. Compartilhamento direto e privado com amigos é outra situação.

### 3.2 O que já está certo (não vira tarefa)

- `chords/` (1,8 GB de songbooks em PDF) **nunca foi commitado** — o `.gitignore` pegou
  desde o primeiro commit. Este era o risco grande e ele não existe.
- Testes rodam com `cd app && node --test`, **zero dependências**, Node ≥ 20.
  Ótimo para CI e para baixar a barreira de contribuição.
- `.DS_Store` não está versionado.
- Deploy no GitHub Pages já automatizado em `.github/workflows/pages.yml`.

### 3.3 Higiene pendente

- `.git` local com **850 MB** em objetos soltos — blobs órfãos de 187 MB, 173 MB e 80 MB
  (áudio adicionado e descartado). Nunca subiram ao remoto, mas ocupam disco e o Google
  Drive sincroniza.
- Solto na raiz e fora do `.gitignore`: `bkp/`, `recordings/`, `untitled folder/`,
  `andanca-audio.somaplay` (37 MB), `chega-de-saudade-songbook.somaplay`,
  `fix-andanca-cifra.somaplay`.
- Branch `feat/editor-acordes-e-dicionario` com trabalho não finalizado.
- Fontes (Inter, JetBrains Mono, Sora) redistribuídas **sem os arquivos de licença**.
- `CLAUDE.md` desatualizado: diz *"design/PRD stage — there is no application code yet"*
  com o app no ar, e manda discutir em português contra D4.

---

## 4. Checklist

Marcador de esforço: 🟢 minutos · 🟡 ~1h · 🔴 meio dia ou mais

### Fase 0 — Higiene (não depende de nada)

- [x] **T-01** ✅ A branch `feat/editor-acordes-e-dicionario` não existe mais — o trabalho
      do editor de acordes foi fechado antes desta execução.
- [x] **T-02** ✅ `git gc --prune=now --aggressive` rodado em 2026-08-04: **852 MB → 5,8 MB**.
      Antes: confirmado que as 5 branches eram alcançáveis, sem stash e com uma só worktree.
      Depois: `git fsck` limpo, histórico e branches intactos.
- [x] **T-03** ✅ `.gitignore` cobre `*.somaplay`, `bkp/`, `recordings/` e
      `untitled folder/`. Confirmado antes que nenhum `.somaplay` estava versionado — se
      estivesse, o ignore não bastaria e exigiria `git rm --cached`.
- [ ] **T-04** 🟢 Remover `untitled folder/` e mover `recordings/` para fora do repositório.
      **Despriorizado:** o `.gitignore` (T-03) neutralizou o risco real. O que sobra é
      arrumação de disco, não proteção.
- [ ] **T-05** 🟢 Decidir o destino de `-DESIGN/` (`Soma Play.html`, `top-bar-chord.psd`
      1,6 MB). Continua versionado. Sem urgência — é material de design próprio, não pesa
      no clone e não tem problema jurídico.

### Fase 1 — Limpeza jurídica (bloqueia divulgação)

- [x] **T-06** ✅ **Removidas as 7 músicas de terceiros** (eram 7, não 3 — ver §3.1).
      `samples.js` 499 → 45 linhas; 5 arquivos de mídia apagados; `SHELL` e `VERSION`
      ajustados no mesmo commit. Commit `622350b`.
- [x] **T-07** ⚠️ **Parcial.** A cifra e a letra de "Groove de teste" já eram autorais e
      ficaram — o primeiro acesso mostra uma música de verdade, não tela vazia.
      **O que falta é só o áudio:** sem stems, o modo T2 Acompanhamento não tem demo.
- [ ] **T-08** 🟡 Gravar 3-4 stems próprios e religá-los em `importSamples()`, mais as
      entradas no `SHELL` e o bump de `VERSION`. Depende de T-07 (a parte de áudio).
- [x] **T-09** ✅ `LICENSE` MIT na raiz, em nome de Flavio Soma Cavalieri, 2026.
- [x] **T-10** ✅ Licenças em `app/fonts/LICENSES/`, baixadas de `google/fonts` em vez de
      escritas de memória, e conferidas uma a uma (cabeçalho OFL 1.1, seção de condições,
      linha de copyright). Mais um `app/fonts/README.md` mapeando fonte → uso → licença, e
      um ponteiro na seção de licença dos dois README.
      **Com isso a Fase 1 fecha: não há mais pendência jurídica.**
- [x] **T-11** ✅ Seção "Bring your own content" / "Traga o seu conteúdo" nos dois README.

### Fase 2 — Vitrine

- [x] **T-12** ✅ **README bilíngue.** `README.md` (inglês, padrão) e `README.pt-BR.md`,
      com troca de idioma no topo de cada um. Cobrem o resumo, *Why this exists*, os três
      modos, funcionalidades, como rodar, arquitetura, contribuição, roadmap e status.
- [ ] **T-13** 🟢 Mover `app/README.md` → `docs/pt-BR/manual.md`. **Não feito** — o
      `app/README.md` continua onde estava e agora duplica parte do `README.pt-BR.md`.
- [ ] **T-14** 🟡 Screenshots. **Continua só `screens/karaoke.png`.** Faltam Cifra,
      Acompanhamento (mixer), biblioteca e editor de acordes. Para um app visual, é o
      maior fator de conversão de quem abre a página.
- [x] **T-15** ✅ Descrição, homepage (apontando para o app no ar) e **10 topics**:
      `pwa`, `offline-first`, `guitar`, `chords`, `music`, `web-audio`, `karaoke`,
      `vanilla-js`, mais `indexeddb` e `service-worker` — por onde chega quem procura
      "PWA offline de verdade".
- [x] **T-16** ✅ `CLAUDE.md` reescrito. Descreve o projeto que existe (em produção, 27
      módulos, ~4.200 linhas), a divisão de idiomas e o fluxo spec → plano → implementação.
      Ganhou uma seção **"Things that will bite you"** com as quatro armadilhas que este
      ciclo revelou: `DB_NAME`, `SHELL`/`VERSION`, `data-*` atrás de `t()`, e renotar a
      cifra. Nenhuma é dedutível lendo o código.

### Fase 3 — Abrir para contribuição

- [x] **T-17** ✅ `CONTRIBUTING.md` escrito. Além do setup, documenta três armadilhas
      não óbvias: bumpar `VERSION` ao mexer no `SHELL`, nunca renomear `DB_NAME`, e não
      commitar conteúdo musical de terceiros. Issue e PR em português são bem-vindos.
- [x] **T-18** ✅ `.github/workflows/test.yml` — sintaxe + suíte em todo PR e push na
      `main`, no Node 20 e 22. Passou verde na primeira execução. **Sem filtro de `paths`,
      de propósito:** um check obrigatório que é *pulado* em vez de reportado trava o PR
      para sempre.
      Junto veio `app/test/shell.test.js`, que vira asserção a armadilha do Service
      Worker — todo caminho do `SHELL` existe, todo módulo está registrado. Verificado que
      morde: remover um módulo do `SHELL` faz a suíte falhar.
- [x] **T-19** ✅ `main` protegida: PR obrigatório, 0 aprovações exigidas, `test (20)` e
      `test (22)` como checks obrigatórios, force-push e deleção bloqueados.
      **`enforce_admins` desligado** — o dono continua com push direto, então o fluxo do dia
      a dia não muda; a regra vale para quem chegar por PR. Apertar depois é uma caixa de
      seleção.
- [ ] **T-20** 🟢 `CODE_OF_CONDUCT.md` — Contributor Covenant. Não existe.
- [ ] **T-21** 🟢 `.github/ISSUE_TEMPLATE/` e `PULL_REQUEST_TEMPLATE.md`. Não existem.
- [ ] **T-22** 🟡 **Abrir o roadmap como issues.** **Verificado: zero issues abertas.**
      A §11 do PRD já é a lista pronta; vira ~10 issues, algumas `good first issue`.
- [x] **T-31** ✅ **Interface PT/EN entregue e no ar.** 8 tasks, 16 commits, 272 chaves,
      seletor com detecção pelo navegador e ajuste independente de notação de acordes
      (brasileira ↔ internacional). Ver [`2026-08-01-i18n-pt-en-design.md`](2026-08-01-i18n-pt-en-design.md)
      e o plano [`2026-08-03-i18n-pt-en.md`](../plans/2026-08-03-i18n-pt-en.md).
- [ ] **T-23** 🟢 `docs/README.md` — índice do histórico de design. Não existe.

### Fase 4 — Rename (adiado, executar quando o nome fechar)

**Barato — buscar e trocar, ~20 ocorrências:**

- [ ] **T-24** 🟢 README, docs, `app/package.json` (`"name": "somaplay-app"`),
      `<title>` em `index.html`, `manifest.webmanifest`, logo em
      `app/js/render/home.js:163`, `VERSION` em `app/sw.js:2`, `scripts/somaplay_edit.py`.
- [ ] **T-25** 🟢 Renomear o repo no GitHub (a URL antiga passa a redirecionar sozinha) e
      a pasta local.

**Perigoso — três armadilhas que apagam dados:**

- [ ] **T-26** ⛔ **`DB_NAME = 'somaplay'` em `app/js/db.js:6` — NÃO renomear.**
      Trocar isso faz o app abrir um IndexedDB vazio, ou seja, **apaga a biblioteca de
      todo mundo**. O nome interno do banco não é visível para ninguém. Só mexer com
      migração explícita, e não há motivo.
- [ ] **T-27** 🟡 Extensão `.somaplay` (`app/js/backup.js:41`,
      `app/js/render/settings.js:80`) e o campo `app: 'soma_play'` dentro do arquivo
      (`backup.js:27`). Trocar quebra os backups existentes.
      **Receita segura: escrever no formato novo, aceitar os dois na importação.**
- [ ] **T-28** 🟢 A URL do Pages muda de `/somaplay` para `/<novo-nome>`.
      *Confirmado: IndexedDB é por **origem**, não por caminho — como continua em
      `somacavalieri.github.io`, os dados no tablet sobrevivem.* Mas o PWA instalado
      aponta para o caminho antigo e **precisa ser reinstalado**.
- [ ] **T-29** 🟢 Não usar `sed` cego: "soma" é palavra portuguesa. Hoje há 1 falso
      positivo apenas (o logo em `home.js`), mas isso muda depois de aceitar PRs de
      terceiros.
- [ ] **T-30** 🟢 Antes de fechar o nome, checar disponibilidade no GitHub, npm e domínio.
      *Registro da rodada anterior: `OpenChord` colide com `artutra/OpenChord`, um app de
      songbook do mesmo nicho. Livres e verificados: `songstand`, `chordstand`,
      `stagestand`, `ponteio`. `SomaChords` ainda não foi verificado — e mantém a marca
      pessoal que a abertura pretendia diluir.*

---

## 5. Prioridade do que resta (revisado em 2026-08-03)

A ordem original por fases perdeu sentido: a Fase 1 caiu, a Fase 3 nem começou, e a i18n
passou na frente de tudo. O que segue está ordenado por **risco e por razão valor/esforço**,
não por fase.

### ✅ Feito em 2026-08-03/04

**T-03** `.gitignore` · **T-02** `git gc` (852 MB → 5,8 MB) · **T-15** metadados do repo ·
**T-16** `CLAUDE.md` · **T-18** CI em PR · **T-19** proteção da `main` · **T-10** licenças das fontes

### Nível 1 — Agora

| # | Por quê |
|---|---|
| **T-14** screenshots | Um app visual com uma única imagem no README. É o que decide se quem abre a página entende o que é em cinco segundos |
| **T-22** roadmap como issues | Zero issues hoje. Sem elas, um amigo interessado abre o repo e não tem por onde começar. A §11 do PRD já é a lista pronta |

T-14 e T-22 formam um par: são o que transforma "repositório público" em "projeto onde
alguém entra". Agora que o CI está verde e a `main` protegida, receber esse alguém é
seguro — o que faltava era o convite.

### Nível 2 — Acabamento

**T-20** código de conduta · **T-21** templates de issue/PR · **T-23** índice de `docs/` ·
**T-13** mover o `app/README.md`

### Nível 3 — Quando houver vontade

**T-08** gravar os stems do demo (destrava o modo T2 para quem chega) ·
**T-04** / **T-05** arrumação de disco (o risco já foi fechado pelo `.gitignore`) ·
**Fase 4** o rename, quando o nome fechar

## 5.1 Débito técnico registrado na execução da i18n

Levantado pelas revisões, julgado aceitável, nenhum quebra nada. Rende issues:

- Um mesmo conceito com três nomes em inglês: a lente de modo aparece como *mode*,
  *category* e *lens*. Dois tooltips vizinhos se contradizem
- *stem* vs *channel* usados de forma intercambiável; o README diz *stem*
- Nomes dos modos espalhados por três famílias de chave (`home.mode.*`,
  `play.modeSwitch.*`, `list.modeChart*`) — renomear um modo exige editar três lugares
- `bestLabel()` em `state.js` e a chave `common.delete`: código e chave mortos
- Contagem + substantivo montada por concatenação em sete arquivos de render. Correto
  para PT/EN, quebra no primeiro idioma que flexiona
- `i18n.test.js` faz `delete` na tabela `EN` sem `try/finally`
- **A verificação manual no navegador nunca foi feita.** A feature foi para produção com
  cobertura automatizada completa e nenhuma tela conferida por olho humano

## 6. Riscos

| Risco | Situação em 2026-08-03 |
|---|---|
| ~~T-06 quebra o Service Worker de quem já instalou~~ | **Não ocorreu.** `VERSION` subiu no mesmo commit e o `SHELL` foi validado contra o disco a cada mudança |
| ~~T-07 vira gargalo~~ | **Contornado.** A cifra e a letra do demo já eram autorais; só o áudio ficou pendente, e sem bloquear nada |
| Rename depois de divulgar quebra links salvos | Aberto. GitHub redireciona o repo; a URL do Pages não |
| ~~Aceitar PR sem CI verde derruba o app no palco~~ | **Fechado.** CI obrigatório em PR (Node 20 e 22) e `main` protegida. O `shell.test.js` cobre a falha que só apareceria offline |
| ~~Arquivo grande entra no histórico por acidente~~ | **Fechado.** `.gitignore` cobre `*.somaplay`, `bkp/` e `recordings/` |
| ~~Fontes redistribuídas sem o texto da licença~~ | **Fechado.** OFL 1.1 das três em `app/fonts/LICENSES/` |
