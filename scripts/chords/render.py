"""Turns a list of Documento into the markdown that goes between the markers.

Pure: takes data, returns a string, touches no file. Output must be stable for
the same input, so --check can compare by equality.
"""

AVISO = "<!-- Gerado por scripts/chords/progresso.py — não editar à mão. -->"

CHEIO, MEIO, VAZIO = "█", "▓", "░"


def barra(conferidas, feitas, extraiveis, largura=10):
    """Progress bar where checked-in-app and merely-generated read differently."""
    if extraiveis <= 0:
        return VAZIO * largura
    n_feitas = min(int(round(largura * feitas / extraiveis)), largura)
    n_conf = min(int(round(largura * conferidas / extraiveis)), n_feitas)
    return CHEIO * n_conf + MEIO * (n_feitas - n_conf) + VAZIO * (largura - n_feitas)


def _pct(feitas, extraiveis):
    return 0 if extraiveis <= 0 else int(round(100 * feitas / extraiveis))


def _ordem(doc):
    try:
        dif = int(doc.meta.get("dificuldade", "99"))
    except ValueError:
        dif = 99
    return (dif, doc.meta.get("documento", str(doc.caminho)))


def tabela_de_documentos(docs, com_acervo=False):
    cab = ["Documento"] + (["Acervo"] if com_acervo else []) + [
        "Dif.", "Feitas", "Extraíveis", "Progresso", "Atualizado",
    ]
    linhas = ["| " + " | ".join(cab) + " |", "|" + "---|" * len(cab)]
    for d in sorted(docs, key=_ordem):
        celulas = [d.meta.get("documento", d.caminho.parent.name)]
        if com_acervo:
            celulas.append(d.meta.get("acervo", ""))
        celulas += [
            d.meta.get("dificuldade", "?"),
            str(d.feitas),
            str(d.extraiveis),
            "%s %d%%" % (barra(d.conferidas, d.feitas, d.extraiveis),
                         _pct(d.feitas, d.extraiveis)),
            d.meta.get("atualizado", "—"),
        ]
        linhas.append("| " + " | ".join(celulas) + " |")
    return "\n".join(linhas)


def _fora_do_padrao(docs):
    ruins = [d for d in docs if d.fora_do_padrao]
    if not ruins:
        return ""
    linhas = ["", "**Fora do padrão** — não entram na conta acima:", ""]
    for d in sorted(ruins, key=lambda d: str(d.caminho)):
        linhas.append("- `%s` — %s" % (d.caminho, "; ".join(d.problemas)))
    return "\n".join(linhas) + "\n"


def bloco_acervo(nome, docs):
    bons = [d for d in docs if not d.fora_do_padrao]
    feitas = sum(d.feitas for d in bons)
    conf = sum(d.conferidas for d in bons)
    extr = sum(d.extraiveis for d in bons)
    partes = [
        AVISO, "",
        "**%s — %d de %d feitas** (%d conferidas no app) %s"
        % (nome, feitas, extr, conf, barra(conf, feitas, extr)),
        "",
        tabela_de_documentos(bons) if bons
        else "_Nenhum documento com índice ainda._",
        _fora_do_padrao(docs),
    ]
    return "\n".join(partes).rstrip() + "\n"


def _bloqueios(por_acervo):
    linhas = []
    for acervo in sorted(por_acervo):
        for d in sorted(por_acervo[acervo], key=lambda d: str(d.caminho)):
            perdidas = d.contagem.get("nao_extraivel", 0)
            pendentes = d.contagem.get("pendencia", 0)
            duplicadas = d.contagem.get("duplicada", 0)
            if not (perdidas or pendentes or duplicadas):
                continue
            marcas = []
            if perdidas:
                marcas.append("🚫 %d não extraível(is)" % perdidas)
            if pendentes:
                marcas.append("⚠️ %d com pendência" % pendentes)
            if duplicadas:
                marcas.append("⏸️ %d duplicada(s)" % duplicadas)
            linhas.append("- **%s** (`%s`) — %s"
                          % (d.meta.get("documento", d.caminho.parent.name),
                             acervo, ", ".join(marcas)))
    if not linhas:
        return "_Nenhum bloqueio registrado._"
    return "\n".join(linhas)


def bloco_dashboard(por_acervo):
    todos = [d for docs in por_acervo.values() for d in docs
             if not d.fora_do_padrao]
    feitas = sum(d.feitas for d in todos)
    conf = sum(d.conferidas for d in todos)
    extr = sum(d.extraiveis for d in todos)

    linhas = [
        AVISO, "",
        "**Acervo inteiro: %d de %d feitas** (%d%%) — %d conferidas no app"
        % (feitas, extr, _pct(feitas, extr), conf),
        "",
        "| Acervo | Feitas | Extraíveis | Progresso | Documentos |",
        "|---|---|---|---|---|",
    ]
    for acervo in sorted(por_acervo):
        docs = [d for d in por_acervo[acervo] if not d.fora_do_padrao]
        f = sum(d.feitas for d in docs)
        c = sum(d.conferidas for d in docs)
        e = sum(d.extraiveis for d in docs)
        linhas.append("| `%s` | %d | %d | %s %d%% | %d |"
                      % (acervo, f, e, barra(c, f, e), _pct(f, e), len(docs)))

    linhas += ["", "## Documentos", "",
               tabela_de_documentos(todos, com_acervo=True) if todos
               else "_Nenhum documento com índice ainda._",
               "", "## Bloqueios e perdas", "", _bloqueios(por_acervo)]

    fora = _fora_do_padrao([d for docs in por_acervo.values() for d in docs])
    if fora:
        linhas += ["", "## Índices fora do padrão", fora]
    return "\n".join(linhas).rstrip() + "\n"
