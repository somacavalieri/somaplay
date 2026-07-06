# Soma_play — Importação de músicas & Catálogo de acordes (design)

**Data:** 2026-07-06 · **Estado:** aprovado (brainstorming) → próximo passo `writing-plans`
**Estende:** [`2026-06-25-soma-play-design.md`](2026-06-25-soma-play-design.md) — §5 (modelo de conteúdo), §8/Anexo A#3 (acordes e diagramas), §11 (fora do MVP).

---

## 1. Problema e origem

O MVP já está no ar. Ao subir a primeira música real (**As Pastorinhas**, Noel Rosa) colando a cifra em **texto**, três lacunas apareceram:

1. O fluxo "Adicionar música" em modo **texto** **não tem campo nenhum** para acordes/digitações ([`addedit.js`](../../../app/js/render/addedit.js) — o campo `f-acordes` só existe no ramo *imagem*). A digitação custom (`digitacoes`) nunca é preenchida pela interface.
2. O **dicionário embutido é pequeno** (~33 formas em [`chords.js`](../../../app/js/chords.js)). Acordes fora dele (**Cm, Cm6/Eb, G/D, G7/B, Gm6/Bb**) viram **"?"**; os que existem saem numa pegada genérica, não a que a música pede.
3. Um mesmo **nome** de acorde pede **variações diferentes** conforme a música — logo, um dicionário `nome → uma forma` está errado por construção.

## 2. Decisões (do brainstorming)

- **Dado editável é a primeira escolha.** A digitação vive como dado (casas por corda) e o app desenha com o `chordSVG` (nítido, tematizável, mantém o "☆ fixar"). **Imagem chapada dos diagramas é plano C** (exibição, último recurso) — fora do MVP.
- **A forma (voicing) é o "componente" reutilizável, não o nome.** Um nome tem **várias formas** (uma marcada como padrão). Isso é o que habilita "trocar a variação na interface".
- **Música é self-contained (snapshot).** A música guarda a forma escolhida no seu próprio `digitacoes` (modelo atual — **sem migração**). O catálogo é a **biblioteca de onde a autoria e a UI puxam**; editar o catálogo **não** altera músicas já afinadas.
- **A digitação exata não vem de graça da URL.** O CifraClub desenha os diagramas por JavaScript; o HTML não expõe as casas. Fontes confiáveis: (a) eu leio a imagem **e o usuário confirma**, ou (b) um navegador roda o widget. Nos dois casos sobra conferência → **o editor de casas no app é obrigatório**.
- **Autoria acontece comigo.** A conversão imagem→dado é feita por mim (o app é offline, sem IA/servidor). O lugar do "colar imagem/URL/texto" é o **fluxo de importação comigo**, não o formulário offline.

## 3. Escopo

**Neste MVP (fazer agora):**
- **A. Editor de casas** no "Adicionar/editar música" — para os fluxos **texto e imagem**; escreve em `cifra.digitacoes`.
- **B. Catálogo de formas semeado** (`nome → [variações]`, uma padrão) — módulo **só-leitura** no app; cresce no repo.
- **C. Seletor de variação** na Tela Cifra — tocar num acorde → escolher a variante → grava no `digitacoes` **daquela** música.
- **D. Pipeline de importação (autoria comigo)** — convenção de arquivo por música no repo + gerador → `.somaplay`.

**Fora deste MVP (registrado):**
- Catálogo **editável dentro do app**, botão **"promover voicing"** para o catálogo, e **sincronização do catálogo no backup**.
- **Imagem chapada dos diagramas** como fallback de exibição por acorde.
- Geração de diagramas a partir do texto / transposição (já em §11 do PRD).

## 4. Modelo de dados

### 4.1 Forma (voicing)
Formato já usado em [`chords.js`](../../../app/js/chords.js) e `digitacoes`, sem mudança:
```
{ frets: [Mi grave, Lá, Ré, Sol, Si, Mi agudo], barre?: { fret, from, to } }
//  -1 = abafada (✕) · 0 = solta (○) · n = casa
```

### 4.2 Catálogo (novo — `app/js/chords-catalog.js`)
```js
CATALOG = {
  'Cm':  [ { frets:[-1,3,5,5,4,3], barre:{fret:3,from:1,to:5}, label:'pestana 3ª', default:true },
           { frets:[-1,3,1,0,1,3], label:'aberto' } ],
  'G/D': [ { frets:[-1,5,5,4,3,-1], label:'baixo em Ré', default:true } ],
  // ...cresce a cada música importada
}
```
- **Semeadura:** cada entrada do `CHORDS` atual vira uma variação única (default) do nome correspondente. `CHORDS` deixa de ser consultado diretamente; o catálogo passa a ser a fonte.
- **Helpers:** `catalogShapes(name)` → array (pode ser vazio); `catalogDefault(name)` → variação `default` (ou a primeira), com fallback ao `CHORDS` legado durante a migração.

### 4.3 Música (inalterada)
`song.cifra.digitacoes = { [nome]: {frets, barre?} }` — **snapshot** da forma escolhida por acorde. A importação preenche `digitacoes` para **todo** acorde que a música usa (determinismo/self-contained).

### 4.4 Resolução de forma na renderização (`chordSVG`)
Ordem de fallback ao desenhar um acorde `n` de uma música:
```
song.cifra.digitacoes[n]  →  catalogDefault(n)  →  (legado) CHORDS[n]  →  "?"
```
Só a 1ª fonte (o snapshot) é autoritativa por música; catálogo é rede de segurança e origem das variações.

## 5. A — Editor de casas (add/edit)

- Nos dois fluxos (**texto** e **imagem**), a seção de acordes lista os acordes **detectados** da música (texto: `extractChords`; imagem: campo `acordes`) e, para cada um, um **mini-diagrama** (o `chordSVG` do próprio app) que abre o editor ao toque.
- **Editor:** grade de 6 cordas; por corda define **abafada (✕) / solta (○) / casa (n)**; **casa-base** (stepper, para voicings altos); **pestana** opcional (casa + da corda X à Y). Botão **"usar variação do catálogo"** preenche a partir de `catalogShapes(nome)` (atalho de 1 toque quando o catálogo já conhece a forma).
- **Saída:** grava a forma em `S.draft.digitacoes[nome]`; `commitDraft` já persiste `cifra.digitacoes` ([`addedit.js`](../../../app/js/render/addedit.js) L231) — nenhuma mudança de schema.
- **Sem digitação:** acorde sem forma cai no `catalogDefault`; se nem isso, desenha "?" (comportamento atual, degradação graciosa).

## 6. B — Catálogo semeado

- Novo módulo `app/js/chords-catalog.js` exportando `CATALOG`, `catalogShapes`, `catalogDefault`.
- `chords.js` passa a resolver formas via `catalogDefault` (mantendo `CHORDS` como semente/legado).
- **Crescimento:** ao importar músicas (comigo), acordes/variações novos são acrescentados ao `CATALOG` no repo. Só-leitura em runtime no MVP.

## 7. C — Seletor de variação (Tela Cifra)

- No card "Acordes desta música" ([`play.js`](../../../app/js/render/play.js) L57) e na barra de fixados, tocar no **nome/diagrama** abre um **popover** (padrão de [`popover.js`](../../../app/js/render/popover.js)) listando `catalogShapes(nome)` — cada opção desenhada com `chordSVG` + label.
- Escolher uma opção **grava** `song.cifra.digitacoes[nome] = forma`, persiste (`saveSong`) e re-renderiza. Convive com o "☆ fixar" (ações irmãs via `data-a`).
- Sem variações no catálogo além da atual: o popover oferece **"editar casas"** (reusa o editor da §5).

## 8. D — Pipeline de importação (autoria comigo)

- **Aquisição:** usuário me passa **URL do CifraClub** e/ou **texto** e/ou **imagem dos diagramas**. Preferência de resolução por acorde: (1) forma já no **catálogo** → (2) leitura da **imagem** (confirmada) → (3) voicing padrão conhecido que *bata*. Marco quais são padrão e quais específicos.
- **Fonte-da-verdade:** um **arquivo por música** no repo (formalizando `chords/-selected/`), com cabeçalho (artista, título, tom) + bloco de cifra em texto + formas dos acordes.
- **Entrega:** um **gerador** lê os arquivos e produz `.somaplay` (formato de [`backup.js`](../../../app/js/backup.js)); o usuário importa no tablet (fluxo "importar substitui" já existente).
- **Texto verbatim:** preservar o alinhamento das linhas de acorde (o `parseCifraText` e a renderização dependem do espaçamento).

## 9. Verificação

- **Caso-ouro:** As Pastorinhas com os 15 acordes corretos (incl. Cm, Cm6/Eb, G/D, G7/B, Gm6/Bb) renderizando pelo `chordSVG` — comparar contra as imagens do CifraClub.
- Editor de casas produz `frets` corretos (round-trip: editar → salvar → reabrir → mesma forma).
- Seletor de variação troca a forma **só naquela música** (outra música com o mesmo nome não muda).
- Rodar local: `cd app && python3 -m http.server 8137`.

## 10. Arquivos afetados

- **Novo:** `app/js/chords-catalog.js`.
- **Editar:** `app/js/chords.js` (resolução via catálogo), `app/js/render/addedit.js` (seção de acordes + editor no fluxo texto/imagem), `app/js/render/play.js` (seletor de variação), `app/js/main.js` (ações `data-a` novas), `app/css/app.css` (estilos do editor/seletor).
- **Repo/autoria:** convenção `chords/<Artista>/...` + gerador de `.somaplay` (fora do bundle do app).
- **Atualizar PRD:** Anexo A#3 e §11 (mover "catálogo editável no app" para registrado).
