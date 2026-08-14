"""Argument handling shared by the chord scripts.

Every acervo in this library is named with a leading dash — `-new-songbook`,
`-pasta-vitor`, `-Artistas`. argparse reads those as option strings and refuses
them, so `progresso.py -new-songbook` fails with "unrecognized arguments".

The same dash has now bitten `ls`, `grep` and argparse in this codebase. Rather
than make the user remember `--`, insert it for them.
"""

FLAGS = ("-h",)


def normaliza_argv(argv):
    """Move dash-named positionals to the end, behind a `--` separator.

    `['-pasta-vitor', '--data', 'X']` -> `['--data', 'X', '--', '-pasta-vitor']`.

    Inserting `--` in place is not enough: everything after it becomes
    positional, so a flag written after the acervo (`musicas.py -pasta-vitor
    --data X`) turned into "unrecognized arguments". Moving the acervo to the
    end keeps the flags in front of the separator, where argparse still reads
    them.

    Limitation: a long option whose *value* starts with a single dash would be
    mistaken for the positional. None of these scripts has one.
    """
    argv = list(argv)
    if "--" in argv:
        return argv
    posicionais = [a for a in argv
                   if a.startswith("-") and not a.startswith("--")
                   and a not in FLAGS]
    if not posicionais:
        return argv
    resto = [a for a in argv if a not in posicionais]
    return resto + ["--"] + posicionais
