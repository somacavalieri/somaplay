# Interface em dois idiomas (PT/EN) — design

**Data:** 2026-08-01
**Status:** design aprovado, sem implementação
**Relacionado:** [`2026-07-30-publicacao-open-source-design.md`](2026-07-30-publicacao-open-source-design.md) — reverte a decisão **D5** daquele documento
**PRD:** [`2026-06-25-soma-play-design.md`](2026-06-25-soma-play-design.md)

---

## 1. Problema e origem

O projeto está sendo aberto. O README passou a existir em inglês e português, mas a
interface do app é **só português, com as strings hardcoded** dentro de template literals
de HTML espalhados por 12 telas. Um visitante que chega pelo README em inglês, clica na
demo e cai numa tela em português — a primeira impressão queima exatamente com o público
que o README pretendia atrair.

Na spec de publicação isto tinha ficado registrado como issue futura (D5). A decisão
mudou: a interface passa a ter **seletor PT/EN**.

### O achado que mudou o desenho

Traduzir os botões não é suficiente. O catálogo de acordes usa **notação de cifra
brasileira** — 63 formas escritas como `C7M`, `Am7(5-)`, `C#°`, `C7(9-)`, `D7(4)`. O
mesmo acorde em notação internacional é `Cmaj7`, `Am7b5`, `C#dim`, `C7b9`, `Dsus4`. Um
app "em inglês" que mostra `A7M` está falando português com letras.

Então "duas línguas" tem duas dimensões independentes: **idioma da interface** e
**convenção de notação musical**.

## 2. Decisões

| # | Decisão | Motivo |
|---|---|---|
| **I1** | Duas preferências **independentes**: `lang` (pt/en) e `chordNotation` (br/intl) | Notação é formação musical, não idioma. Um brasileiro pode querer UI em inglês com cifra brasileira, e um estrangeiro o inverso |
| **I2** | Escolher o idioma **sugere** a notação (pt→br, en→intl), mas não a força | Padrão certo na maioria dos casos, sem tirar a escolha |
| **I3** | Detecção por `navigator.language` no primeiro acesso, troca nas Configurações, escolha persistida | Comportamento esperado, sem fricção |
| **I4** | **Só a interface é traduzida.** Dados do usuário — músicas, letras, cifras, estilos, listas — nunca | Estilos e músicas são dados no IndexedDB digitados pelo usuário. "Samba" e "Bossa Nova" também não se traduzem |
| **I5** | A conversão de notação **nunca reescreve a cifra do usuário** | Restrição técnica dura — ver §4 |
| **I6** | `lang` e `chordNotation` **não viajam no backup** | Ver §5 |

## 3. Arquitetura

### 3.1 O módulo

**`app/js/i18n.js`** — novo, sem dependências, testável em `node --test`.

```js
export function t(key, params)   // 'settings.backup.export' → "Export library"
export function setLang(lang)    // grava e devolve; quem chama re-renderiza
export function getLang()
```

`t()` lê o idioma de uma variável de módulo. Como [`update()`](../../../app/js/main.js)
reconstrói `app.innerHTML` inteiro a cada render, **trocar de idioma é
`setLang() → saveSettings() → update()`** — não precisa de observadores nem de binding.

**Interpolação** por chaves nomeadas: `t('storage.used', { used: '1,5 GB' })` substitui
`{used}`. Sem lógica de plural na v1 — se aparecer necessidade, entra depois com
`Intl.PluralRules`.

**Fallback:** chave ausente cai para português e não quebra a tela. O teste de paridade
(§6) é que impede a chave ausente de chegar em produção.

### 3.2 As tabelas

**`app/js/i18n/pt.js`** e **`app/js/i18n/en.js`** — mapas planos de chave → string.

Chaves planas e namespaced por tela: `settings.backup.export`, `play.scrollSpeed`,
`home.tabs.artists`. Planas porque são greppáveis e o diff entre os dois arquivos mostra
gaps na hora.

### 3.3 A notação

**`app/js/chord-notation.js`** — puro, sem estado, totalmente testável.

```js
export function toIntl(name)   // 'A7M' → 'Amaj7'
export function toBr(name)     // 'Amaj7' → 'A7M'
export function display(name)  // aplica a preferência ativa
```

Mapeamento de sufixos: `7M`↔`maj7`, `(5-)`/`m5-`↔`b5`, `°`↔`dim`, `(9-)`↔`b9`,
`(4)`↔`sus4`, `(11)`↔`11`, `(13)`↔`13`. A fundamental (`A`, `C#`, `Bb`) é idêntica nas
duas convenções — só o sufixo muda.

### 3.4 Onde fica o seletor

Configurações, num bloco novo **"Idioma · Language"** com duas linhas: **Idioma** (PT/EN)
e **Notação** (Brasileira/Internacional). Trocar o idioma ajusta a notação **se o usuário
ainda não a tiver mexido na mão** (I2) — um flag `chordNotationTouched` guarda isso.

### 3.5 Estado

```js
settings: {
  theme, awake, cifraZoom, defaultSpeed, masterVol, cifraMiniaturas,
  lang: 'pt' | 'en',                     // novo
  chordNotation: 'br' | 'intl',          // novo
  chordNotationTouched: false,           // novo, interno
}
```

Persistidas pelo mecanismo existente (`saveSettings()` → `DB.saveSettings`).

## 4. A fronteira — o que é traduzido e o que não é

Esta seção é a mais importante do documento.

### 4.1 Por que a cifra do usuário nunca é convertida

Cifra em texto alinha a **linha de acordes** sobre a **linha de letra** por coluna de
caractere:

```
A7M              F7M
  Vim, tanta areia andei
```

`A7M` tem 3 caracteres; `Amaj7` tem 5. Converter a notação **desloca todos os acordes da
linha** e destrói o alinhamento com a letra. Não há conserto barato: reflowar exigiria
reparsear e reposicionar cada linha, e ainda assim mudaria o texto que o usuário digitou.

**Portanto: a cifra é renderizada exatamente como o usuário a escreveu, sempre.**

### 4.2 A tabela

| Elemento | Traduzido? | Notação convertida? |
|---|---|---|
| Botões, abas, títulos de tela, mensagens, diálogos | **Sim** | — |
| Texto da cifra (imagem ou texto) | Não — é conteúdo | **Não** — §4.1 |
| Título, artista, estilo, nome de lista, letra | Não — é conteúdo | — |
| **Dicionário de acordes** (as 63 formas do catálogo) | Rótulos sim | **Sim** — é conteúdo do app, sem alinhamento em jogo |
| Grade "Acordes desta música" e popover de acorde | Rótulos sim | **Não** — o nome mostrado é o que está na cifra, senão o usuário vê dois nomes para o mesmo acorde |
| Busca/entrada de acorde no dicionário | Rótulos sim | **Aceita as duas** — procurar `Cmaj7` acha `C7M` |
| Separador decimal ([settings.js:90](../../../app/js/render/settings.js)) | **Sim** — hoje está fixo em vírgula | — |

A regra que resolve os casos duvidosos: **o app converte a notação do que ele mesmo
produz; nunca a do que o usuário trouxe.**

## 5. Backup

As settings viajam no `.somaplay` ([backup.js:32](../../../app/js/backup.js), importadas
em `backup.js:80-82`). Com o app público e pessoas trocando arquivos, importar a
biblioteca de outra pessoa **trocaria o seu idioma** — papercut real.

**Decisão (I6):** `lang`, `chordNotation` e `chordNotationTouched` são **preferências do
aparelho** e ficam de fora do merge na importação. Continuam sendo exportadas (não custa
nada e ajuda em diagnóstico), mas o import as descarta. É a mesma natureza de `theme` —
que hoje viaja e provavelmente também não deveria, mas isso fica fora do escopo aqui.

## 6. Testes

`node --test`, sem instalar nada, no padrão do projeto.

**`app/test/i18n.test.js`**
- **Paridade de chaves** — todo chave em `pt.js` existe em `en.js` e vice-versa. Este é o
  teste que mais paga: é ele que impede uma tela meio traduzida de chegar em produção
- Interpolação substitui os parâmetros e deixa intacto o que não foi passado
- Chave ausente cai para português em vez de estourar

**`app/test/chord-notation.test.js`**
- `toIntl`/`toBr` cobrem todos os 63 acordes do catálogo
- **Estabilidade da forma canônica** — `toIntl(toBr(toIntl(x))) === toIntl(x)`.
  Note que **não vale identidade estrita** `toBr(toIntl(x)) === x`: `(5-)` e `(b5)` são
  grafias brasileiras diferentes do mesmo acorde e ambas convertem para `b5`, então a
  volta escolhe uma forma canônica só
- **Idempotência** — converter um nome que já está na convenção de destino não o altera.
  É o que protege contra o caso `toBr('C7(9-)')`, em que o `9` interno não pode virar
  `(9)`. Exige passada única de regex e âncora de fim de string nos números soltos
- Fundamental com sustenido e bemol sobrevive à conversão; baixo invertido (`/G#`) nunca muda
- Nome desconhecido passa incólume em vez de virar lixo

## 7. Faseamento

Cada fase deixa o app funcionando; nenhuma exige as seguintes.

| Fase | Entrega | Arquivos |
|---|---|---|
| **1** | Módulo `i18n.js` + tabelas + testes de paridade. Nada consumido ainda | `i18n.js`, `i18n/pt.js`, `i18n/en.js`, `test/i18n.test.js` |
| **2** | Estado, seletor e re-render funcionando ponta a ponta, traduzindo **só as Configurações** | `state.js`, `render/settings.js`, `main.js` |
| **3** | Navegação e biblioteca — o que o visitante vê primeiro | `render/home.js`, `artist.js`, `estilo.js`, `listscreen.js` |
| **4** | Tela de toque — a mais usada no palco | `render/play.js`, `chordpop.js`, `popover.js` |
| **5** | Cadastro e editores | `render/addedit.js`, `chordeditor.js`, `chordbookscreen.js` |
| **6** | Notação de acordes | `chord-notation.js`, `chords-catalog.js`, `chordbook.js`, `test/chord-notation.test.js` |
| **7** | Mensagens dinâmicas, toasts e os 5 `alert/confirm` | `main.js`, `backup.js`, `db.js`, `audio.js` |

A Fase 2 é a que prova a arquitetura inteira com custo baixo. Se algo estiver errado no
desenho, aparece ali — antes de 12 arquivos terem sido reescritos.

## 8. Riscos

| Risco | Mitigação |
|---|---|
| Tela meio traduzida escapa para produção | Teste de paridade de chaves na CI (T-18 da spec de publicação) |
| Extração quebra HTML dentro de template literal | Fase por fase, com `node --check` e verificação manual no navegador — padrão do projeto |
| Conversão de notação corrompe nome de acorde | Teste de ida e volta sobre os 63 do catálogo; nome desconhecido passa incólume |
| Tradução do autor para inglês soa artificial | O README já está em inglês e serve de referência de tom. Contribuição de terceiros é bem-vinda justamente aqui |
| Escopo cresce para outros idiomas | Estrutura suporta, mas a v1 entrega **só PT e EN**. Espanhol é issue, não requisito |

## 9. Fora de escopo

- Idiomas além de PT e EN
- Plurais com `Intl.PluralRules` — entra quando alguma string precisar
- Tradução de dados do usuário ou migração retroativa de estilos
- Conversão de notação dentro da cifra em texto (§4.1)
- `theme` sair do backup — problema vizinho, documento próprio
