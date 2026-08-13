# Apagar uma fonte inteira — verificação manual

2026-08-13 · branch `feature/apagar-fonte`

As quatro tarefas do plano estão implementadas e revisadas, mais uma onda de correção da
revisão final: 350/350 testes verdes, paridade PT/EN e `shell.test.js` incluídos.
**Falta inteira a camada que os testes não cobrem.** Este projeto não tem harness de DOM,
de propósito, e desta vez a lacuna é maior que o normal: **nada desta branch foi aberto num
navegador**. A verificação foi reservada para você porque esta máquina serve a sua
biblioteca real — 5.925 músicas — no mesmo `origin`, e este é o primeiro caminho do app que
apaga milhares de músicas de uma vez, sem desfazer.

## Antes de qualquer coisa

1. **Exporte um backup completo.** Configurações → Exportar biblioteca, tudo marcado.
   Confira que o `.somaplay` está no disco com tamanho plausível. Este arquivo é o único
   desfazer que existe.
2. **Faça os testes destrutivos numa janela anônima.** No Chrome ela tem IndexedDB e OPFS
   próprios: o que você apagar lá não é a sua biblioteca. Importe nela um `.somaplay`
   pequeno, ou use "Trazer músicas de exemplo".
3. Só depois, e só se quiser, apague de verdade no tablet — com o backup do passo 1 em mãos.

```bash
cd app && python3 -m http.server 8137   # → http://localhost:8137
```

Ordenado por risco. Os três primeiros são os que podem morder de verdade.

## 1. Cronometrar um apagar de fonte com imagem ou áudio ⏱️

**Esta é a única pergunta em aberto da branch, e a resposta decide se falta um conserto.**

A tela só repinta depois que o **último arquivo** é apagado do OPFS, um por um. Nas fontes
de texto (VJ) não existe arquivo nenhum e isso é invisível. Nas de imagem, são centenas de
`removeEntry` em sequência.

- [ ] apagar uma fonte com imagem (CifraClub ou Songbook) e **contar os segundos** entre o
      toast "Excluindo..." e a linha sumir da lista
- [ ] apagar uma fonte só de texto do mesmo tamanho e comparar

**Como ler o resultado:**

| o que você viu | o que significa |
|---|---|
| a linha some em ~1 s | está bom, não precisa mexer |
| demora mais que ~2,5 s | **precisa consertar**: o toast dura 2.600 ms, então a tela fica parada, sem aviso nenhum, e a reação natural é tocar de novo (não faz nada, silenciosamente) ou recarregar a página — que é exatamente a interrupção no meio, e deixa bytes órfãos que nada varre, justo o contrário de liberar espaço |
| a fonte de **texto** demora dezenas de segundos | algo regrediu para O(n²) — era para ser uma transação só |

**O conserto, se precisar:** fazer `deleteSongs` avisar quando os metadados ficaram
consistentes, e o `main.js` repintar aí, antes da varredura dos arquivos. Um parâmetro
opcional (`aoLimparMetadados`) chamado logo antes do laço de blobs resolve sem quebrar o
contrato — a varredura continua dentro do motor, então nenhum chamador pode esquecer dela.
Junto com isso, dar retorno ao segundo clique em vez do no-op silencioso.

Deixei fora de propósito: mudar o contrato do motor por causa de um número que ninguém
mediu seria adivinhação.

## 2. A lista se cura sozinha 🔁

É a justificativa inteira da decisão de manter os ids nas listas. Nada automatizado
encosta nisso.

- [ ] montar uma lista misturando músicas de **duas** fontes
- [ ] exportar só a fonte A (Exportar biblioteca, com só ela marcada)
- [ ] apagar a fonte A pela lixeira
- [ ] abrir a lista: só as músicas da fonte B aparecem, **numeradas 1..n sem buraco**, e
      **arrastar continua reordenando certo**
- [ ] importar o arquivo de volta em **Adicionar / atualizar**
- [ ] a lista volta inteira, com as músicas de A **nas posições originais**

## 3. O espaço é liberado de verdade 💾

- [ ] anotar a barra de armazenamento antes
- [ ] apagar uma fonte com imagem ou áudio
- [ ] a barra encolhe

Se não mexer na hora, **reabra Configurações antes de concluir que os arquivos
sobreviveram**: `navigator.storage.estimate()` é grosseiro e atrasa no Chrome. Confira
também em DevTools → Application → Storage.

## 4. O dedo acerta o que quer 👆

`.check-main` é `flex:1` e a lixeira tem 44px, **sem espaço entre os dois**: um toque um
pixel para cada lado faz coisas opostas.

- [ ] no tablet (ou DevTools em modo dispositivo), com um nome de fonte comprido, acertar a
      caixinha sem acertar a lixeira
- [ ] e a lixeira sem acertar a caixinha

## 5. A linha virou `<div>` com dois botões

- [ ] passar o mouse: a linha inteira destaca, e a lixeira fica vermelha por conta própria
- [ ] Tab alcança os dois botões, na ordem, com foco visível; Enter/Espaço fazem o certo
- [ ] o popover "Adicionar à lista" (numa música, botão de lista) está **igual ao de antes**
      — ele usa a mesma classe `.check-row`

## 6. Apagar a fonte da música que está tocando

Ir para Configurações não descarrega a música: dá para apagar a fonte de uma música ainda
aberta no player.

- [ ] abrir uma música, voltar, apagar a fonte dela
- [ ] o áudio e a imagem degradam sem quebrar, e voltar não cai numa tela de toque morta

## 7. Cancelar, e não derrubar o que é dos outros

- [ ] Cancelar no diálogo não apaga nada
- [ ] com a home filtrada pela fonte A, apagar a fonte **B**: o filtro em A continua de pé
- [ ] com a home filtrada pela fonte A, apagar a fonte **A**: a home volta cheia, sem filtro
- [ ] com uma seleção de export parcial, apagar qualquer fonte devolve tudo para
      "Todas as fontes"

## 8. Uma fonte só, e nenhuma

Numa janela anônima → "Trazer músicas de exemplo" (a biblioteca fica com uma fonte só):

- [ ] a linha aparece **com lixeira** e **sem** a linha "Todas as fontes"
- [ ] tocar na própria linha desmarca e desabilita o botão Exportar — e tocar de novo
      recupera (é o comportamento, não um travamento: não há linha mestra para restaurar)
- [ ] apagar a última fonte: a lista some, o botão Exportar fica desabilitado, o app fica
      de pé

## 9. PT / EN

- [ ] com o app em inglês, o diálogo e o rótulo da lixeira estão em inglês
- [ ] **o nome da fonte não traduz** — só "Sem fonte" / "No source", que é rótulo e não
      grafia salva

## 10. F5 depois de cada exclusão

- [ ] recarregar e conferir que nada voltou

Se voltou, a gravação não aconteceu — e é exatamente o caso que a onda de correção
endereçou: a tela agora só mostra a fonte sumida **depois** de o disco confirmar.

## O que os testes já garantem, e você não precisa refazer

- `artistasOrfaos` e `blobIdsDasMusicas`: 9 testes, incluindo o contrato de ordem que o
  `exportLibrary` consome
- paridade PT/EN de todas as chaves novas
- `SHELL` íntegro e `VERSION` no formato certo (hoje `somaplay-v38`)
- a suíte inteira: 350 testes
