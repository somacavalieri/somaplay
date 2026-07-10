#!/usr/bin/env python3
"""Lê/edita/reescreve um backup .somaplay.
Formato: b'SOMAPLAY1\\n' + tamanho do JSON em 10 dígitos + b'\\n' + JSON(UTF-8) + bytes dos blobs.

Uso:
  python3 scripts/somaplay_edit.py list <in.somaplay>   # lista as músicas
  python3 scripts/somaplay_edit.py test                 # self-test de round-trip

Como biblioteca:
  from somaplay_edit import read_somaplay, write_somaplay
  m, blobs = read_somaplay('in.somaplay')
  for s in m['songs']: s['estilo'] = ...   # edita metadados; blobs ficam intactos
  write_somaplay('out.somaplay', m, blobs)
"""
import json
import sys

MAGIC = b'SOMAPLAY1\n'


def read_somaplay(path):
    data = open(path, 'rb').read()
    if not data.startswith(MAGIC):
        raise ValueError('não é um backup .somaplay')
    p = len(MAGIC)
    json_len = int(data[p:p + 10])
    p += 11  # 10 dígitos + '\n'
    manifest = json.loads(data[p:p + json_len].decode('utf-8'))
    blobs = data[p + json_len:]
    return manifest, blobs


def write_somaplay(path, manifest, blobs):
    body = json.dumps(manifest, ensure_ascii=False).encode('utf-8')
    header = MAGIC + str(len(body)).zfill(10).encode('ascii') + b'\n' + body
    open(path, 'wb').write(header + blobs)


def _cmd_list(path):
    m, _ = read_somaplay(path)
    arts = {a['id']: a['name'] for a in m.get('artists', [])}
    for s in m.get('songs', []):
        print(f"{s.get('id', '?')[:8]}  {arts.get(s.get('artistId'), '?'):20}  "
              f"{s.get('title', '?'):28}  estilo={s.get('estilo', '—')}")


def _cmd_test():
    manifest = {'version': 1, 'app': 'soma_play',
                'artists': [{'id': 'a1', 'name': 'X'}],
                'songs': [{'id': 's1', 'artistId': 'a1', 'title': 'T', 'estilo': ''}],
                'lists': [], 'blobs': [{'id': 'b1', 'size': 3, 'type': 'x'}]}
    blobs = b'abc'
    write_somaplay('/tmp/_st.somaplay', manifest, blobs)
    m2, b2 = read_somaplay('/tmp/_st.somaplay')
    assert b2 == blobs, 'blobs mudaram na leitura'
    m2['songs'][0]['estilo'] = 'Samba'
    write_somaplay('/tmp/_st.somaplay', m2, b2)
    m3, b3 = read_somaplay('/tmp/_st.somaplay')
    assert b3 == blobs, 'blobs mudaram após editar metadados'
    assert m3['songs'][0]['estilo'] == 'Samba', 'estilo não persistiu'
    print('round-trip OK')


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'test'
    if cmd == 'list':
        _cmd_list(sys.argv[2])
    elif cmd == 'test':
        _cmd_test()
    else:
        print(__doc__)
