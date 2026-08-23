# pdf.js vendorizado

Versão: **v6.2.108** (build `legacy`), baixada de
https://github.com/mozilla/pdf.js/releases/download/v6.2.108/pdfjs-6.2.108-legacy-dist.zip

Copiados daqui: `build/pdf.mjs`, `build/pdf.worker.mjs`, `web/wasm/{jbig2,openjpeg,qcms_bg}.wasm`
(mais as licenças em `web/wasm/LICENSE_*`), `web/standard_fonts/*` e `LICENSE`.

Deixados de fora de propósito: os `*.map` (8 MB de sourcemap), `web/cmaps/` (1,6 MB
para codificação CJK, que o acervo não usa) e `quickjs-eval.wasm` (JavaScript
embutido em formulário PDF, fora do escopo).

**Nada aqui é editado.** Atualizar = baixar a versão nova, repetir a cópia acima,
atualizar este arquivo e rodar `node --test` (o teste do SHELL cobre arquivo novo
ou removido). Código de terceiro sob a licença Apache 2.0 em `LICENSE`.
