# A demo do soma_play

`app/demo/soma_play-demo.somaplay` é o arquivo que a home carrega em
"Carregar demo" e oferece para download. Ele é **gerado**, não editado:

    node scripts/demo/gerar-demo.mjs

Fontes, todas versionadas:

- `musica.mjs` — o registro da música (cifra, letra, tom, estilo, fonte "Demo")
- `stems/*.mp3` — os quatro canais sintéticos escritos para o projeto, de volta
  do commit `d3ea232`

Depois de regerar, rode `cd app && node --test test/demo.test.js` — é ele que
confere o contêiner contra o leitor do app.

Conteúdo de terceiros não entra aqui. Cifra, letra e áudio da demo são do
projeto, pela mesma regra que vale para o repositório inteiro.
