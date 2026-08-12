# Desambiguação por fonte — verificação manual

2026-08-12 · branch `feature/desambiguacao-por-fonte`

As Tarefas 1–4 do plano estão implementadas e revisadas (341/341 testes verdes, review
final da branch limpo). **Falta a camada que os testes não cobrem**: este projeto não
tem harness de DOM, de propósito, então a correção de UI e de dados se confirma no
navegador.

```bash
cd app && python3 -m http.server 8137   # → http://localhost:8137
```

Ordenado por risco — os três primeiros são os que podem morder de verdade.

## 1. Biblioteca antiga abre (o risco de dados)

O rename `cifra.fonte` → `cifra.tipo` mexe em como o registro é lido. Se a migração
falhar, uma cifra em **imagem** renderiza silenciosamente como texto (`play.js:383`
decide por `cifra.tipo`).

- [ ] abrir o app com a biblioteca real e tocar uma música com cifra em **imagem**
- [ ] tocar uma música com cifra em **texto**
- [ ] editar uma música antiga e salvar; reabrir e conferir que o tipo de cifra continua
      o mesmo (o rádio do formulário vem pré-selecionado certo — `addedit.js:19`)

## 2. Import de `.somaplay` antigo

O arquivo exportado antes desta mudança carrega o campo velho. A migração existe para
isso.

- [ ] importar um `.somaplay` gerado antes desta branch, em modo **merge**
- [ ] repetir em modo **replace** (numa biblioteca descartável, não na real)
- [ ] abrir uma música de cifra em imagem vinda desse arquivo

## 3. Colisão + arrastar na lista de show

`listscreen.js` é vizinho do bug de reordenação que já custou caro (posição na tela ≠
índice do array, por causa dos ids órfãos). O qualificador agora renderiza dentro
daquela mesma linha.

- [ ] pôr duas músicas de mesmo título numa lista e **arrastar para reordenar**
- [ ] reabrir a lista e conferir que a ordem persistida é a que você viu na tela
- [ ] se tiver uma lista com id órfão (música que não existe mais), reordenar ela também

## 4. O qualificador aparece onde deve

Se você ainda não tem duas músicas de mesmo título, crie: mesmo artista, título `Teste`,
uma com fonte `CifraClub` e outra `Songbook`.

- [ ] aba **Músicas** — as duas linhas mostram título + fonte em cinza menor
- [ ] tela do **Artista** — idem
- [ ] tela de **Estilos** — idem
- [ ] **popover** de adicionar-à-lista — título qualificado
- [ ] linha dentro de uma **lista de show** — título qualificado
- [ ] música de título único **não** mostra qualificador nenhum
- [ ] apagar uma das duas faz o qualificador sumir da outra, sem editar nada
- [ ] trocar o idioma PT↔EN e conferir que o rótulo "Sem fonte" acompanha

**Risco visual conhecido:** no popover o título tem `nowrap` + `ellipsis`, e o
qualificador fica dentro dessa caixa — num título longo ele é a primeira coisa cortada,
justo o caso em que ele importa. Olhar num título comprido e decidir se incomoda.

## 5. Busca e ordenação não enxergam a fonte

É a razão de existir de toda a branch: o qualificador é elemento irmão do título, nunca
concatenado nele.

- [ ] buscar pelo título traz as duas músicas
- [ ] buscar por `cifraclub` **não** traz nada (correto e intencional — a fonte não é
      texto pesquisável; para recortar por fonte existe o filtro de fonte)
- [ ] a ordenação alfabética não mudou

## 6. Música exemplo

`samples.js` gravava o campo antigo; foi corrigido no round de fix.

- [ ] numa biblioteca limpa, tocar "importar exemplos" e conferir que a demo abre normal

---

## Depois que isso passar

Falta a **Tarefa 5** do plano — a migração das 21 músicas do VJ na biblioteca real
(tirar o sufixo `(v2)`, gravar `fonte: 'VJ'`, garantir `fonte: 'CifraClub'` do outro
lado), por `.somaplay` em modo merge. Ela é passo de dados, não de código, e depende
desta verificação ter passado: sem o qualificador funcionando, tirar o `(v2)`
reintroduz a ambiguidade.

O plano detalha os passos em "Task 5". O ponto de atenção: **todo `id` do arquivo de
correção precisa já existir na biblioteca** — id novo cria música duplicada em vez de
corrigir a existente.
