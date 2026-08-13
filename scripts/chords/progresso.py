#!/usr/bin/env python3
"""Recomputes the extraction dashboard from the INDICE.md files.

    python3 progresso.py                # rewrites every generated block
    python3 progresso.py -new-songbook  # one acervo only
    python3 progresso.py --check        # reports drift, writes nothing, exits 1

Reads INDICE.md; writes only between the markers of PROGRESSO.md files.
"""

import argparse
import sys
from pathlib import Path

from blocos import bloco_atual, substitui
from cli import normaliza_argv
from indice import read_indice
from render import bloco_acervo, bloco_dashboard

AQUI = Path(__file__).resolve().parent
RAIZ_PADRAO = AQUI.parent.parent / "chords"


def varre(raiz):
    """acervo -> [Documento]. An acervo is any directory directly under raiz.

    Paths on the returned documents are relative to raiz's parent, so the
    generated tables read `chords/…/INDICE.md` instead of a 120-char absolute
    path that wraps in every terminal.
    """
    raiz = Path(raiz)
    por_acervo = {}
    for pasta in sorted(p for p in raiz.iterdir() if p.is_dir()):
        docs = []
        for caminho in sorted(pasta.rglob("INDICE*.md")):
            doc = read_indice(caminho)
            doc.caminho = caminho.relative_to(raiz.parent)
            docs.append(doc)
        por_acervo[pasta.name] = docs
    return por_acervo


def _acervos_do_dashboard(raiz, por_acervo):
    """Only folders that opted in by having a PROGRESSO.md.

    chords/ also holds material that is not an extraction front — the chord
    dictionary, the Notion export, the .somaplay outputs. They have no
    progress file and must not show up as 0%% fronts.
    """
    return {nome: docs for nome, docs in por_acervo.items()
            if (Path(raiz) / nome / "PROGRESSO.md").exists()}


def _grava(caminho, novo, check):
    """Returns the path as a string when the file is (or would be) changed."""
    texto = caminho.read_text(encoding="utf-8")
    if bloco_atual(texto).strip() == novo.strip():
        return None
    if not check:
        caminho.write_text(substitui(texto, novo), encoding="utf-8")
    return str(caminho)


def atualiza(raiz=RAIZ_PADRAO, check=False, acervo=None):
    raiz = Path(raiz)
    por_acervo = varre(raiz)
    if acervo:
        por_acervo = {k: v for k, v in por_acervo.items() if k == acervo}
        if not por_acervo:
            raise ValueError("acervo não encontrado em %s: %s" % (raiz, acervo))

    mudou = []
    for nome, docs in por_acervo.items():
        alvo = raiz / nome / "PROGRESSO.md"
        if not alvo.exists():
            continue
        r = _grava(alvo, bloco_acervo(nome, docs), check)
        if r:
            mudou.append(r)

    dash = raiz / "PROGRESSO.md"
    if dash.exists() and not acervo:
        dados = _acervos_do_dashboard(raiz, varre(raiz))
        r = _grava(dash, bloco_dashboard(dados), check)
        if r:
            mudou.append(r)
    return mudou


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("acervo", nargs="?", help="limita a um acervo")
    ap.add_argument("--check", action="store_true",
                    help="não escreve; sai 1 se algo está fora de sync")
    ap.add_argument("--raiz", default=str(RAIZ_PADRAO))
    args = ap.parse_args(
        normaliza_argv(sys.argv[1:] if argv is None else argv))

    mudou = atualiza(Path(args.raiz), check=args.check, acervo=args.acervo)
    if args.check:
        if mudou:
            print("fora de sync (rode sem --check):")
            for m in mudou:
                print("  " + m)
            return 1
        print("tudo em sync")
        return 0
    for m in mudou:
        print("atualizado: " + m)
    if not mudou:
        print("nada mudou")
    return 0


if __name__ == "__main__":
    sys.exit(main())
