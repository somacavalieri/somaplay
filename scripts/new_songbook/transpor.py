#!/usr/bin/env python3
"""Transpõe uma música já extraída, para gerar uma segunda versão em outro tom.

Serve o caso "quero a mesma música um tom abaixo, e quero as duas no acervo".
O app **não transpõe** — não há nada disso em `app/js/` (os `transpo` que
aparecem lá são "transporte" de áudio) —, então a segunda versão é uma música
separada no `.somaplay`.

## Por que transpor o TOKEN MEDIDO e não o texto da cifra

O `x` de cada token é a posição medida na página impressa. Transpor não muda
onde o acorde cai sobre a frase, muda só o nome. Se a substituição fosse feita
no texto já montado, `C` -> `Bb` ganharia um caractere e **empurraria todo o
resto da linha**, destruindo o alinhamento — que é exatamente o que o
CLAUDE.md alerta sobre mexer em texto de cifra. Aqui o nome é trocado sobre o
`x` medido e o `build_text` refaz as colunas do zero.

## Grafia

Bemol por padrão: descer de C cai em Bb, cujo campo de armadura tem Bb e Eb.
`--grafia #` força sustenidos quando o tom de destino pedir (ex.: subir para F#).

## Diagramas

A forma impressa só pode acompanhar a transposição quando é **móvel**: sem
corda solta e sem casa baixa demais para descer. `formas_moveis()` decide isso
e devolve o que dá para mover, incluindo o caso do **diminuto**, que se repete
a cada 3 casas — um `F#°` desce 2 semitons subindo 1 casa. O resto sai do
dicionário do app (`chordbook.shapesOf`), que é o comportamento padrão quando
a música não traz digitação própria.

**A versão transposta é derivada, não transcrita.** Nenhuma página do livro tem
esses diagramas; quem confere no app tem de saber disso.

Uso como módulo:
    from transpor import transpor, transpor_sistemas, formas_moveis
"""
import re

PC = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
BEMOL = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
SUSTENIDO = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
RAIZ = re.compile(r'^([A-G])([#b]?)')


def _nota(txt, semitons, grafia):
    """Troca só a fundamental; o sufixo (7, m7, (#5), °, o) vai intacto."""
    m = RAIZ.match(txt)
    if not m:
        return txt
    alt = 1 if m.group(2) == '#' else -1 if m.group(2) == 'b' else 0
    pc = (PC[m.group(1)] + alt + semitons) % 12
    return (BEMOL if grafia == 'b' else SUSTENIDO)[pc] + txt[m.end():]


def transpor(nome, semitons, grafia='b'):
    """Transpõe um token de acorde.

    A `/` aqui só pode ser de acorde com baixo (`Dm7/G7`): a barra de compasso
    já saiu na extração. As duas partes são transpostas.
    """
    return '/'.join(_nota(p, semitons, grafia) for p in nome.split('/'))


def transpor_sistemas(sistemas, semitons, grafia='b'):
    """Transpõe os nomes preservando cada `x` medido. A letra não é tocada."""
    return [([(x, transpor(t, semitons, grafia)) for x, t in acordes], letra)
            for acordes, letra in sistemas]


def _e_diminuto(nome):
    return '°' in nome or re.search(r'(?<![a-zA-Z])o\b', nome) is not None


def formas_moveis(digitacoes, semitons, grafia='b'):
    """Quais formas impressas acompanham a transposição, e como ficam.

    Devolve `(moveis, paradas)`: um dict nome-novo -> forma deslocada, e a lista
    de nomes que não deram. Uma forma anda quando não tem corda solta e todas as
    casas tocadas continuam >= 1 depois do deslocamento. Diminuto se repete a
    cada 3 casas, então um deslocamento equivalente dentro da oitava serve.
    """
    moveis, paradas = {}, []
    for nome, dado in digitacoes.items():
        frets = dado['frets']
        tocadas = [f for f in frets if f > 0]
        desloc = semitons
        if _e_diminuto(nome):
            # -2 == +1, -1 == +2: escolhe o giro que cabe no braço
            for cand in (semitons, semitons + 3, semitons - 3, semitons + 6):
                if tocadas and min(tocadas) + cand >= 1:
                    desloc = cand
                    break
        if any(f == 0 for f in frets) or not tocadas or min(tocadas) + desloc < 1:
            paradas.append(nome)
            continue
        novo = dict(dado)
        novo['frets'] = [f + desloc if f > 0 else f for f in frets]
        moveis[transpor(nome, semitons, grafia)] = novo
    return moveis, paradas
