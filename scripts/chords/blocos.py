"""Replaces the generated region of a markdown file, and nothing else.

Everything outside the markers is hand-written prose — page maps, measured
scan state, decisions. It is the most valuable content in the acervo and this
module is the only thing standing between it and a bad regex.
"""

ABRE = "<!-- chord:auto -->"
FECHA = "<!-- /chord:auto -->"


def _limites(text):
    if text.count(ABRE) != 1 or text.count(FECHA) != 1:
        raise ValueError(
            "esperado exatamente um %s e um %s (achei %d e %d)"
            % (ABRE, FECHA, text.count(ABRE), text.count(FECHA))
        )
    i = text.index(ABRE)
    f = text.index(FECHA)
    if f < i:
        raise ValueError("%s aparece antes de %s" % (FECHA, ABRE))
    return i, f


def bloco_atual(text):
    """The generated region as it stands, so --check can compare without writing."""
    i, f = _limites(text)
    return text[i + len(ABRE):f]


def substitui(text, novo):
    i, f = _limites(text)
    return text[:i + len(ABRE)] + "\n" + novo.strip("\n") + "\n" + text[f:]
