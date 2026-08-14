# Versionamento visível — design

Data: 2026-08-14

## O problema

Não dá para saber, olhando o app, se o que está na tela é a versão mais nova.

O soma_play é offline-first e o Service Worker serve **cache-first**. Isso é
exatamente o que se quer no palco, com o tablet sem rede — e é o que engana no
desenvolvimento: a página abre normalmente, sem erro, com arquivos antigos. Já
aconteceu duas vezes na mesma semana:

- uma correção de CSS foi publicada e o site continuou igual, porque a mudança
  nunca tinha sido commitada — mas o sintoma era indistinguível de cache velho, e
  a investigação começou pelo lado errado;
- o servidor local estava derrubado e o app continuou abrindo, servido pelo
  cache. "Está aberto, logo está rodando" não vale num PWA.

Hoje o único número é o `VERSION` do `sw.js`, em `somaplay-v39`. Ele tem três
defeitos como versão de produto: é invisível para quem usa, sobe por motivo
técnico (qualquer arquivo do `SHELL`) e é bumpado à mão, então esquecer dele é
uma das armadilhas registradas no `CLAUDE.md`.

Não existe `CHANGELOG.md`, arquivo `VERSION` nem uma única tag git no repositório. Existe um
`app/package.json`, mas ele não carrega versão — só `name`, `private` e `type` — e continua
assim de propósito: um terceiro literal sem teste de paridade seria mais um lugar para divergir.

## A decisão

Quatro escolhas, tomadas no brainstorming de 2026-08-14:

1. **O app não detecta atualização.** Mostra o número; a comparação é humana.
2. **A numeração começa em `0.9.0`**, e a `1.0.0` sai quando o formato
   `.somaplay` congelar.
3. **Um número só.** A versão de produto **é** a chave do cache do Service
   Worker; o `v39` deixa de existir.
4. **O CHANGELOG começa na 0.9.0** com um resumo do que o app já faz.

### Por que não detectar atualização automaticamente

Seria o desenho mais completo, e foi descartado de propósito. Quem publica é o
próprio autor, que sabe qual número acabou de subir — então ver `0.9.0` na tela
logo depois de ter publicado `0.9.1` já denuncia o cache velho na hora. A
detecção automática exigiria fiar o ciclo de vida do Service Worker (`updatefound`,
`waiting`, `controllerchange`), que hoje não existe: o registro em
`app/js/main.js` é um `.catch(() => {})` sem tratamento.

Fica registrado como acréscimo possível, não como dívida.

### Por que 0.9.0

O app está em produção, sob MIT, com ~27 módulos e 353 testes, e é usado em
ensaio e show. Começar em `0.1.0` diria "protótipo", o que é falso. Começar em
`1.0.0` amarraria cedo demais: enquanto o formato `.somaplay` pode mudar de
maneira incompatível, o `0.x` é a afirmação honesta.

O critério da `1.0.0` é objetivo e não depende de sensação: **o formato
`.somaplay` congelado**, com garantia de compatibilidade em import/export.

## Onde o número mora

O projeto não tem build step — ES modules servidos como estão. Não há etapa de
publicação onde injetar a versão num template. E dois consumidores precisam dela:

- `app/sw.js`, para a chave do cache;
- a UI, para mostrar em Ajustes.

O `sw.js` é um worker **clássico** e não importa ES module. Registrá-lo com
`{ type: 'module' }` resolveria com uma fonte única, mas o suporte varia por
navegador e o custo de errar é o app não instalar offline — que é a função
central do produto. Descartado.

**Decisão: dois literais e um teste de paridade**, que é o padrão que o projeto
já usa para as tabelas de i18n (`app/test/i18n.test.js`).

```
app/js/version.js    export const VERSION = '0.9.0';
app/sw.js            const VERSION = 'somaplay-0.9.0';
```

O teste lê os dois arquivos e falha se divergirem. A duplicação é deliberada e
está protegida.

**`js/version.js` entra no `SHELL` do `sw.js`.** Módulo novo em `app/js/` que
fique fora do `SHELL` quebra o app offline — é uma das armadilhas do `CLAUDE.md`.

## As regras de numeração

| Dígito | Sobe quando | Exemplo real |
|---|---|---|
| **MAJOR** `0 → 1` | Reservado. O formato `.somaplay` congela com garantia de compatibilidade | — |
| **MINOR** `0.9 → 0.10` | Muda **o que o app faz**: capacidade nova, comportamento alterado ou removido | uma tela nova; mudar o que o modo T2 toca |
| **PATCH** `0.9.0 → 0.9.1` | Conserta ou ajusta comportamento existente | a correção da largura da cifra |

**A `0.9.0` é a própria release que introduz o versionamento** — não um estado
anterior a ela. Não existe versão do app mais velha que o arquivo que declara a
versão. Por isso a entrada `0.9.0` do CHANGELOG traz as duas coisas: o resumo do
que o app já fazia e o `Added` do número visível.

Duas regras sustentam o resto:

- **Toda publicação que toca o `SHELL` é no mínimo um PATCH.** É o que garante
  que não existe deploy sem chave de cache nova — o esquecimento continua possível — nada
  impede publicar um arquivo do `SHELL` sem subir o número —, mas passa a ter **sintoma
  visível**: o número na tela não muda, e é justamente ele que se olha quando se desconfia
  de cache velho.
- **Mudança que não é do app não mexe na versão.** `docs/`, specs, planos,
  `scripts/chords/`, `scripts/new_songbook/`. Sem essa regra o número giraria
  durante o trabalho de extração do acervo, que é a maior parte dos commits.

Note que MINOR sobe para `0.10.0`, não `1.0.0`: em semver o dígito não é decimal.

## Na tela

Seção **Sobre**, no fim de `app/js/render/settings.js`:

```
Sobre
soma_play  0.9.0
Ver novidades →        (link para o CHANGELOG.md no GitHub)
```

O rótulo é traduzido e as chaves entram nas **duas** tabelas (`js/i18n/pt.js` e
`js/i18n/en.js`) — o teste de paridade cobra. O número em si é dado, não passa
por `t()`.

O link do CHANGELOG aponta para o GitHub e portanto **exige rede**. É aceitável:
num app offline, saber o número é o que resolve o problema; ler o changelog é
consulta ocasional, e quem está sem rede está tocando, não conferindo release.
O número ao lado nunca depende de rede.

**O número quase não pode mentir, e quando mente é para menos.** Como a versão é a chave do
cache, ler `0.9.1` na tela prova que o Service Worker está servindo o cache da `0.9.1`. Há uma
janela transitória: com `skipWaiting()` e `clients.claim()` (`app/sw.js`), o Service Worker novo
assume enquanto a página já aberta continua pintada com os módulos do cache anterior — tela em
`0.9.0`, SW já em `somaplay-0.9.1`, até o próximo recarregamento. O desvio é sempre na direção
segura, porque a tela **sub-reporta**, e a reação que ele induz — recarregar — é exatamente a
correta. Fora dessa janela, o número e a chave do cache são a mesma coisa.

## O CHANGELOG

`CHANGELOG.md` na raiz do repositório, formato [Keep a
Changelog](https://keepachangelog.com), **em inglês** — é documento público, e o
`CLAUDE.md` põe doc público em inglês. Seções `Added` / `Changed` / `Fixed` /
`Removed`.

A entrada `0.9.0` abre com o resumo do que o app já faz, para que quem chegue ao
repositório entenda o estado inicial: cifra em imagem e em texto, acompanhamento
com stems, karaokê, listas, backup `.somaplay` com merge, dicionário de acordes,
PT/EN, offline total.

Reconstruir o histórico anterior foi descartado: os 39 bumps do Service Worker
não têm fronteira de release nenhuma, então versões retroativas seriam ficção
escolhida hoje.

## Como se verifica

Teste novo, `app/test/version.test.js`, com três asserções:

1. `sw.js` e `js/version.js` declaram a mesma versão;
2. o formato casa com `X.Y.Z`, só dígitos;
3. o `CHANGELOG.md` tem uma entrada para a versão atual.

O que a terceira asserção elimina é **subir o número e não registrar nada**. Ela não pega o
inverso: uma entrada escrita para uma versão futura passa, porque o teste só cobra a versão
corrente. E não pega um arquivo do `SHELL` mudado sem bump nenhum — isso continua sendo
disciplina humana, com o número na tela como sintoma.

O teste de paridade de i18n, que já existe, cobre as chaves novas do rótulo.

Conferência manual, que é a camada que conta neste projeto: abrir Ajustes e ver o
número; publicar um PATCH e confirmar que o número na tela muda depois do
recarregamento.

## O que isto não faz

- **Não detecta atualização.** Escolha explícita, justificada acima.
- **Não cria tags git nem GitHub Releases.** Podem vir depois; nada aqui impede.
- **Não muda o comportamento do cache**, só o nome da chave.
- **Não versiona o formato `.somaplay`.** O campo `version` que já existe dentro
  do arquivo de backup é outro número, com outra função, e continua como está.

## Fora de escopo

Automatizar o bump (hook de commit, CI). A regra é curta o bastante para ser
seguida à mão, e o teste da entrada no CHANGELOG pega o esquecimento. Se o
projeto ganhar mais de um autor, revisitar.
