#!/usr/bin/env python3
"""Gera/atualiza o .somaplay de um livro em chords/-new-songbook/.

Cada livro tem um módulo em books/<slug>.py com:
  BOOK   = 'bossa-nova-1'          # namespace estável para os ids
  FOLDER = '.../Bossa Nova 1 - Almir Chediak'
  SONGS  = [{'title', 'artist', 'tom', 'estilo', 'pagina_livro', 'pagina_pdf',
             'texto', 'fonte': 'Songbook'}, ...]

Ids: artista reaproveitado por NOME (procurado em bkp/*.somaplay e nos .somaplay
soltos da raiz); se não existir, ganha id novo `nsb-<md5(nome)[:16]>`. Música
sempre `sb-<md5('<BOOK>:<título>')[:16]>` — estável entre reruns, então rodar de
novo sobre o mesmo livro faz merge/upsert em vez de duplicar.

Uso:
  python3 scripts/new_songbook/make_somaplay.py bossa_nova_1
Escreve <FOLDER>/<BOOK>.somaplay.
"""
import glob
import hashlib
import importlib
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from somaplay_edit import write_somaplay, read_somaplay  # noqa: E402
from layout import build_text  # noqa: E402


def md5(s):
    return hashlib.md5(s.encode('utf-8')).hexdigest()


def song_id(book, title):
    return 'sb-' + md5(f'{book}:{title}')[:16]


def dedup_keep_order(xs):
    seen = set()
    return [x for x in xs if not (x in seen or seen.add(x))]


def find_existing_artist_id(name):
    for path in glob.glob(os.path.join(ROOT, 'bkp', '*.somaplay')) + glob.glob(os.path.join(ROOT, '*.somaplay')):
        try:
            m, _ = read_somaplay(path)
        except Exception:
            continue
        for a in m.get('artists', []):
            if a.get('name', '').strip().lower() == name.strip().lower():
                return a['id']
    return None


def confere_digitacoes(titulo, dig):
    """Recusa `digitacoes` fora do contrato do app, ANTES de gravar o arquivo.

    O contrato é nome -> {'frets': [6 casas], 'barre'?: {...}, 'varId'?: str}.
    A lista crua (`{'Bm7': [-1,2,-1,2,3,2]}`) parece certa, passa nas duas
    conferências da recipe e produz um .somaplay que o app importa sem reclamar
    — e aí `chordSVG` faz `d.frets.filter(...)` sobre uma lista, dá TypeError no
    meio do render, e a música APARECE NA LISTA MAS NÃO ABRE, sem erro visível
    em lugar nenhum. Três músicas do Caetano vol. 2 saíram assim.

    Falhar aqui é barato; descobrir no tablet, no palco, não é.
    """
    for nome, forma in (dig or {}).items():
        onde = f'{titulo!r}, acorde {nome!r}'
        if not isinstance(forma, dict):
            raise SystemExit(
                f'digitacoes de {onde}: esperava dict com "frets", veio '
                f'{type(forma).__name__}. Use {{"frets": [...]}}, não a lista crua.')
        casas = forma.get('frets')
        if not isinstance(casas, list) or len(casas) != 6:
            raise SystemExit(f'digitacoes de {onde}: "frets" tem de ser lista de 6 casas, veio {casas!r}')
        if not all(isinstance(c, int) and c >= -1 for c in casas):
            raise SystemExit(f'digitacoes de {onde}: casa inválida em {casas!r} (-1 não toca, 0 solta)')
        sobra = set(forma) - {'frets', 'barre', 'varId'}
        if sobra:
            raise SystemExit(f'digitacoes de {onde}: chave desconhecida {sorted(sobra)}')


def build(book_module_name):
    mod = importlib.import_module(f'books.{book_module_name}')
    book, folder, songs = mod.BOOK, mod.FOLDER, mod.SONGS

    artists = {}
    out_songs = []
    for s in songs:
        confere_digitacoes(s['title'], s.get('digitacoes'))
        aid = artists.get(s['artist']) or find_existing_artist_id(s['artist'])
        if not aid:
            aid = 'nsb-' + md5(s['artist'])[:16]
        if s['artist'] not in artists:
            artists[s['artist']] = aid

        # 'texto' pronto, ou 'systems' = tokens medidos por pixel na página.
        # 'scale' (px por coluna) é por música: o corpo do texto muda de livro
        # para livro, e escala errada faz token empurrar token e desalinhar.
        texto = (s['texto'] if 'texto' in s else
                 build_text(s['systems'], s.get('x0', 0), **({'scale': s['scale']} if 'scale' in s else {})))

        out_songs.append({
            'id': song_id(book, s['title']),
            'artistId': aid,
            'title': s['title'],
            'tom': s.get('tom', ''),
            'fonte': s.get('fonte', 'Songbook'),
            'estilo': s.get('estilo', ''),
            'favorita': False,
            'cifra': {
                # 'tipo', não 'fonte': o nome antigo colidia com song.fonte (a
                # procedência, 'Songbook'). `normalizaCifra` em db.js ainda migra
                # o antigo na leitura, mas gerar já com o nome certo evita que
                # todo .somaplay novo dependa da migração.
                'tipo': 'texto',
                'imagens': [],
                'texto': texto,
                # ordem de APARIÇÃO (= ordem da grade de diagramas do livro), não
                # alfabética: é ela que o painel "Acordes desta música" exibe.
                'acordes': dedup_keep_order(s.get('acordes', [])),
                'digitacoes': s.get('digitacoes', {}),
            },
            'letra': '',
            'stems': [],
            'full': [],
        })

    manifest = {
        'version': 1,
        'app': 'soma_play',
        'artists': [{'id': aid, 'name': name} for name, aid in
                    ((s['artist'], artists[s['artist']]) for s in songs)],
        'songs': out_songs,
        'lists': [],
        'blobs': [],
    }
    # dedup artists (mesmo nome pode repetir por música)
    seen = {}
    dedup = []
    for a in manifest['artists']:
        if a['id'] in seen:
            continue
        seen[a['id']] = True
        dedup.append(a)
    manifest['artists'] = dedup

    out_path = os.path.join(folder, f'{book}.somaplay')
    write_somaplay(out_path, manifest, b'')
    print(f'{out_path}: {len(out_songs)} música(s), {len(dedup)} artista(s)')
    return out_path


if __name__ == '__main__':
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    build(sys.argv[1])
