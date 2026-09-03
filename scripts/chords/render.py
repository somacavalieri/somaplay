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
    if feitas and not n_feitas:
        n_feitas = 1          # 2 de 62 arredonda a zero; começado ≠ intocado
    n_conf = min(int(round(largura * conferidas / extraiveis)), n_feitas)
    if conferidas and not n_conf and n_feitas:
        n_conf = 1            # nunca acima de n_feitas, ou a barra estoura
    return CHEIO * n_conf + MEIO * (n_feitas - n_conf) + VAZIO * (largura - n_feitas)


def _pct(feitas, extraiveis):
    return 0 if extraiveis <= 0 else int(round(100 * feitas / extraiveis))


def _ordem(doc):
    try:
        dif = int(doc.meta.get("dificuldade", "99"))
    except ValueError:
        dif = 99
    return (dif, doc.meta.get("documento", str(doc.caminho)))


LIMITE_POR_QUE = 90


def _por_que(doc):
    """The line from the front matter that makes the difficulty defensible.

    Trimmed at a word boundary: without a cap one Caetano vol. 2 justification
    is 190 characters and pushes every other column off the screen.
    """
    texto = doc.meta.get("dificuldade_por_que", "").replace("|", "/").strip()
    if len(texto) <= LIMITE_POR_QUE:
        return texto or "—"
    corte = texto.rfind(" ", 0, LIMITE_POR_QUE)
    return texto[:corte if corte > 0 else LIMITE_POR_QUE].rstrip(" ,;:") + "…"


def tabela_de_documentos(docs, com_acervo=False, com_por_que=False):
    cab = ["Documento"] + (["Acervo"] if com_acervo else []) + [
        "Dif.", "Feitas", "Extraíveis", "Progresso", "Atualizado",
    ] + (["Por que essa dificuldade"] if com_por_que else [])
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
        if com_por_que:
            celulas.append(_por_que(d))
        linhas.append("| " + " | ".join(celulas) + " |")
    return "\n".join(linhas)


def concluido(doc):
    """No song left to extract. Not the same as checked in the app.

    A document with nothing extractable at all (every row 🚫 or ⏸️) is *not*
    concluded — it is an anomaly, and hiding it in a count line would bury it.
    """
    return doc.extraiveis > 0 and doc.feitas >= doc.extraiveis


def em_progresso(doc):
    """Started and not finished — the only documents the dashboard names.

    The `extraiveis == 0` clause keeps the anomaly above visible: it has no
    música feita and never will, and falling into the not-started count would
    hide it behind a number.
    """
    return not concluido(doc) and (doc.feitas > 0 or doc.extraiveis == 0)


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


def _resumo_por_acervo(por_acervo, filtro, coluna, medida, vazio):
    """One count line per acervo, for the documents the dashboard does not name.

    Both collapsed sections have the same shape, and writing it twice is how
    the two would drift apart.
    """
    linhas = ["| Acervo | Documentos | %s | Lista completa |" % coluna,
              "|---|---|---|---|"]
    total_docs = total_mus = 0
    for acervo in sorted(por_acervo):
        docs = [d for d in por_acervo[acervo]
                if not d.fora_do_padrao and filtro(d)]
        if not docs:
            continue
        mus = sum(medida(d) for d in docs)
        total_docs += len(docs)
        total_mus += mus
        linhas.append("| `%s` | %d | %d | `chords/%s/PROGRESSO.md` |"
                      % (acervo, len(docs), mus, acervo))
    if total_docs == 0:
        return vazio
    linhas.append("| **total** | **%d** | **%d** | |" % (total_docs, total_mus))
    return "\n".join(linhas)


def _nao_comecados(por_acervo):
    return _resumo_por_acervo(
        por_acervo,
        lambda d: not concluido(d) and not em_progresso(d),
        "Músicas mapeadas",
        lambda d: d.extraiveis,
        "_Nenhum documento parado em zero._")


def _concluidos(por_acervo):
    """One line per acervo for the documents with nothing left to extract.

    -pasta-vitor alone is 168 finished artists; listing them here pushed the
    working front three screens down. The names did not disappear — they are
    in that acervo's own PROGRESSO.md, which is what the hierarchy is for.
    """
    return _resumo_por_acervo(por_acervo, concluido, "Músicas feitas",
                              lambda d: d.feitas,
                              "_Nenhum documento concluído ainda._")


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

    andando = [d for d in todos if em_progresso(d)]

    linhas = [
        AVISO, "",
        "**Acervo inteiro: %d de %d feitas** (%d%%) — %d conferidas no app"
        % (feitas, extr, _pct(feitas, extr), conf),
        "",
        "| Acervo | Feitas | Extraíveis | Progresso | Docs | Em progresso | Zerados |",
        "|---|---|---|---|---|---|---|",
    ]
    for acervo in sorted(por_acervo):
        docs = [d for d in por_acervo[acervo] if not d.fora_do_padrao]
        f = sum(d.feitas for d in docs)
        c = sum(d.conferidas for d in docs)
        e = sum(d.extraiveis for d in docs)
        linhas.append("| `%s` | %d | %d | %s %d%% | %d | %d | %d |"
                      % (acervo, f, e, barra(c, f, e), _pct(f, e), len(docs),
                         len([d for d in docs if em_progresso(d)]),
                         len([d for d in docs
                              if not concluido(d) and not em_progresso(d)])))

    linhas += ["", "## Documentos em progresso", "",
               "Só o que já foi começado e ainda tem música ⬜. Zerados e",
               "concluídos estão contados abaixo; a lista completa de cada",
               "acervo está no `PROGRESSO.md` dele.", "",
               tabela_de_documentos(andando, com_acervo=True,
                                    com_por_que=True) if andando
               else "_Nenhum documento em progresso._",
               "", "## Ainda não começados", "", _nao_comecados(por_acervo),
               "", "## Documentos concluídos", "", _concluidos(por_acervo),
               "", "## Bloqueios e perdas", "", _bloqueios(por_acervo)]

    fora = _fora_do_padrao([d for docs in por_acervo.values() for d in docs])
    if fora:
        linhas += ["", "## Índices fora do padrão", fora]
    return "\n".join(linhas).rstrip() + "\n"
