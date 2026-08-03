# Publicação open source — checklist

**Data:** 2026-07-30
**Status:** aprovado para execução (nada executado ainda)
**Repo:** `github.com/somacavalieri/somaplay` — já público desde 2026-07-05

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

### 3.1 Conteúdo de terceiros — o bloqueio

`app/js/samples.js` (499 linhas) cadastra 4 músicas demo. Três embutem obra protegida
**no próprio código-fonte**, não só em arquivo de mídia:

| Demo | O que está versionado | Situação |
|---|---|---|
| Paralelas (Fagner) | `app/samples/paralelas.png` — imagem de cifra | Protegida |
| Andança (Beth Carvalho) | `ANDANCA_CIFRA` + **`ANDANCA_LETRA` (letra integral)** em `samples.js:83` | Protegida — letra completa hardcoded |
| Groove de teste | 4 × `app/samples/demo/*.mp3` (áudio sintético) | Provavelmente autoral, mas sai junto |
| As Pastorinhas (Noel Rosa) | Texto + 15 digitações, `samples.js:441` | **Não é domínio público** — co-autoria com João de Barro (Braguinha, †2006), protegida até 2077 |

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

- [ ] **T-01** 🟢 Finalizar ou guardar a branch `feat/editor-acordes-e-dicionario`
      (4 arquivos modificados + `app/js/render/chordbookscreen.js` novo, não versionado).
      Merge em `main` ou `git stash` — nada abaixo deve começar com a árvore suja.
- [ ] **T-02** 🟢 `git gc --prune=now --aggressive` — recupera ~850 MB de objetos órfãos.
- [ ] **T-03** 🟢 Ampliar `.gitignore`: `bkp/`, `recordings/`, `*.somaplay`,
      `untitled folder/`. Impede que um `git add .` distraído versione o arquivo de 37 MB.
- [ ] **T-04** 🟢 Remover `untitled folder/` e mover `recordings/` (sessões do Audition)
      para fora do repositório.
- [ ] **T-05** 🟢 Decidir o destino de `-DESIGN/` (`Soma Play.html`, `top-bar-chord.psd`
      1,6 MB): mover para `docs/design/`, manter, ou remover do versionamento.

### Fase 1 — Limpeza jurídica (bloqueia divulgação)

- [ ] **T-06** 🟡 **Remover as 4 músicas demo de terceiros:**
  - `app/js/samples.js` — apagar `ANDANCA_CIFRA`, `ANDANCA_LETRA`, `ANDANCA_DIGITACOES`,
    o bloco de Paralelas, o de Groove de teste e o de As Pastorinhas (`samples.js:441`)
  - `git rm app/samples/paralelas.png app/samples/demo/*.mp3`
  - `app/sw.js` — remover as 5 entradas correspondentes do array `SHELL` (linhas 40-44)
    e **subir o `VERSION`** (`somaplay-v12` → `v13`), senão o SW velho tenta cachear
    arquivos que não existem mais e a instalação falha
- [ ] **T-07** 🔴 **Compor o conteúdo demo autoral** que substitui o removido.
      Meta: uma música com cifra em texto + letra + digitações, e uma com 3-4 stems de
      áudio para exercitar o mixer. Tudo composto/gravado por você → entra sob MIT junto
      com o código. Sem isso, o primeiro acesso é uma tela vazia.
- [ ] **T-08** 🟡 Reescrever `importSamples()` em `samples.js` com o conteúdo de T-07 e
      atualizar o `SHELL` do `sw.js` com os novos arquivos de áudio.
- [ ] **T-09** 🟢 Adicionar `LICENSE` (MIT) na raiz — nome completo e ano.
      *Hoje o repo é público sem licença, o que juridicamente significa "todos os direitos
      reservados": ninguém pode legalmente usar nem contribuir.*
- [ ] **T-10** 🟢 Incluir as licenças das fontes em `app/fonts/LICENSES/`
      (Inter e Sora = SIL OFL 1.1; JetBrains Mono = SIL OFL 1.1) — a redistribuição exige.
- [ ] **T-11** 🟢 Seção no README: **o app não distribui conteúdo.** É um leitor; cifras,
      áudio e letras são trazidos pelo usuário e ficam no dispositivo dele. Separa a
      licença do código da natureza do conteúdo.

### Fase 2 — Vitrine

- [ ] **T-12** 🔴 **`README.md` na raiz, em inglês.** Hoje não existe — `app/README.md` é o
      README de fato, em português e escrito para você mesmo. Estrutura:
  - Uma frase + link da demo (GitHub Pages) + screenshots
  - **Why this exists** — a justificativa: cifra impressa não toca junto; apps de cifra
    exigem conta e internet; no palco é preciso algo que funcione offline num tablet.
    Os três modos (Cifra / Acompanhamento / Karaokê) nascem daí
  - How it works — PWA offline, sem backend, IndexedDB + OPFS, Web Audio com clock único
  - Getting started — rodar local, instalar como PWA, cadastrar músicas
  - Status, roadmap, contributing, license
- [ ] **T-13** 🟢 Mover `app/README.md` → `docs/pt-BR/manual.md` (o guia de uso em
      português, que é bom), linkado a partir do README principal.
- [ ] **T-14** 🟡 Screenshots. Existe só `screens/karaoke.png`. Faltam Cifra,
      Acompanhamento (mixer), biblioteca e editor de acordes — de preferência um GIF curto
      de uso real no tablet.
- [ ] **T-15** 🟢 Preencher os metadados do repo (hoje `description`, `homepageUrl` e
      topics estão **vazios**). Topics sugeridos: `pwa`, `offline-first`, `guitar`,
      `chords`, `music`, `web-audio`, `karaoke`, `vanilla-js`.
- [ ] **T-16** 🟡 Reescrever `CLAUDE.md` — refletir que o app existe e está no ar, que o
      projeto é público, e as decisões D4/D5/D6 sobre idioma.

### Fase 3 — Abrir para contribuição

- [ ] **T-17** 🟡 `CONTRIBUTING.md`. O essencial já é um ponto forte do projeto:
      zero dependências · `cd app && python3 -m http.server 8137` para rodar ·
      `cd app && node --test` para testar (Node ≥ 20, sem instalar nada).
      Incluir o fluxo superpowers (spec → plan → implementação) e convenção de commit.
- [ ] **T-18** 🟡 `.github/workflows/test.yml` — `node --test` + `node --check` nos módulos,
      rodando em PR. É o que permite aceitar PR de desconhecido com segurança.
- [ ] **T-19** 🟢 Proteger a branch `main`: exigir PR e CI verde.
      *Hoje qualquer merge vai direto para o Pages em produção.*
- [ ] **T-20** 🟢 `CODE_OF_CONDUCT.md` — Contributor Covenant, texto padrão.
- [ ] **T-21** 🟢 `.github/ISSUE_TEMPLATE/` (bug + feature) e `PULL_REQUEST_TEMPLATE.md`.
- [ ] **T-22** 🟡 **Abrir o roadmap como issues.** A §11 do PRD ("Fora do MVP") já é uma
      lista pronta de trabalho futuro — vira ~10 issues, algumas marcadas
      `good first issue`. É isto que transforma "repo público" em "projeto onde dá para
      entrar".
- [ ] **T-31** 🔴 **Interface em dois idiomas (PT/EN)** — spec pronta em
      [`2026-08-01-i18n-pt-en-design.md`](2026-08-01-i18n-pt-en-design.md), 7 fases.
      Não bloqueia publicar, mas é o maior item aberto do roadmap.
- [ ] **T-23** 🟢 `docs/README.md` — índice explicando que `docs/superpowers/` é o
      histórico de design em português. Material raro e honesto; só não pode ser a
      primeira coisa que a pessoa encontra.

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

## 5. Ordem de execução

```
Fase 0  →  Fase 1  →  Fase 2  →  Fase 3  →  (nome fecha)  →  Fase 4
higiene    jurídico   vitrine    contrib.                    rename
```

- **Fase 1 bloqueia divulgar** para qualquer pessoa fora do círculo próximo.
- **Fase 3 bloqueia aceitar contribuição**, não bloqueia divulgar.
- **Fase 4 é independente** e não tem prazo.

## 6. Riscos

| Risco | Mitigação |
|---|---|
| T-06 quebra o Service Worker em produção para quem já instalou | Subir `VERSION` no mesmo commit; testar em aba anônima antes do merge |
| T-07 vira gargalo (é a única tarefa criativa da lista) | Se travar, publicar sem demo e deixar T-07/T-08 como issue — o README explica como cadastrar |
| Rename depois de divulgar quebra links que os amigos salvaram | GitHub redireciona o repo; a URL do Pages não. Fechar o nome antes de divulgar amplo |
| Aceitar PR sem CI verde derruba o app no palco | T-18 + T-19 antes de T-22 |
