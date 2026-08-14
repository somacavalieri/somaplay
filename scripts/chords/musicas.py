#!/usr/bin/env python3
"""Builds a flat, searchable song list for one acervo, from its INDICE.md files.

    python3 musicas.py -pasta-vitor        # writes chords/-pasta-vitor/MUSICAS.md

Answers "which document has this song?" without opening 168 files. Derived, not
authored: the INDICE.md files stay the single source of truth, and this is
regenerated from them.

The output is deliberately NOT called INDICE.md — progresso.py globs INDICE*.md
under each acervo, so a file by that name here would be read as a document and
every song would be counted twice.
"""

import argparse
import re
import sys
import unicodedata
from pathlib import Path

from cli import normaliza_argv
from indice import STATUS, read_indice, linhas_de_status

AQUI = Path(__file__).resolve().parent
RAIZ_PADRAO = AQUI.parent.parent / "chords"

GLIFO = {nome: glifo for glifo, nome in STATUS.items()}
COM_SELETOR = {"pendencia", "duplicada"}          # ⚠️ e ⏸️ levam U+FE0F
VS16 = "️"

CABECA = """# %(acervo)s — todas as músicas

**Arquivo gerado.** Não editar: `python3 scripts/chords/musicas.py %(acervo)s`
reescreve tudo. A fonte de verdade continua sendo o `INDICE.md` de cada
documento; isto aqui é só uma lista plana para procurar.

%(total)d músicas em %(docs)d documentos, em ordem alfabética de título.
Status em %(hoje)s — para o número atualizado, ver `PROGRESSO.md`.

| Música | Documento | Tom | Estilo | Status |
|---|---|---|---|---|
"""


def chave(s):
    s = unicodedata.normalize("NFKD", (s or "").lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9 ]+", "", s).strip()


def glifo_de(nome):
    g = GLIFO.get(nome, "")
    return g + VS16 if nome in COM_SELETOR else g


def _campo(campos, *nomes):
    for n in nomes:
        for k, v in campos.items():
            if k.startswith(n):
                return v
    return ""


def coleta(pasta):
    linhas = []
    docs = 0
    for caminho in sorted(pasta.rglob("INDICE*.md")):
        doc = read_indice(caminho)
        nome = doc.meta.get("documento") or caminho.parent.name
        docs += 1
        texto = caminho.read_text(encoding="utf-8")
        for campos, status in linhas_de_status(texto):
            if not status:
                continue
            titulo = _campo(campos, "música", "musica", "título", "titulo")
            if not titulo:
                continue
            linhas.append((
                titulo.strip(), nome,
                _campo(campos, "tom").strip() or "—",
                _campo(campos, "estilo").strip() or "—",
                glifo_de(status),
            ))
    linhas.sort(key=lambda r: (chave(r[0]), chave(r[1])))
    return linhas, docs


def escreve(raiz, acervo, hoje):
    pasta = Path(raiz) / acervo
    if not pasta.is_dir():
        raise ValueError("acervo não encontrado: %s" % pasta)
    linhas, docs = coleta(pasta)
    corpo = CABECA % {"acervo": acervo, "total": len(linhas), "docs": docs,
                      "hoje": hoje}
    corpo += "\n".join("| %s | %s | %s | %s | %s |" % r for r in linhas) + "\n"
    alvo = pasta / "MUSICAS.md"
    alvo.write_text(corpo, encoding="utf-8")
    return alvo, len(linhas), docs


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("acervo")
    ap.add_argument("--raiz", default=str(RAIZ_PADRAO))
    ap.add_argument("--data", default="", help="data mostrada no cabeçalho")
    args = ap.parse_args(
        normaliza_argv(sys.argv[1:] if argv is None else argv))

    alvo, n, docs = escreve(args.raiz, args.acervo, args.data or "hoje")
    print("%s — %d músicas de %d documentos" % (alvo, n, docs))
    return 0


if __name__ == "__main__":
    sys.exit(main())
