// samples.js — importa músicas de exemplo (validação imediata do app)
// Paralelas (Fagner) — cifra por imagem · Andança (Beth Carvalho) — cifra em texto
import { DB, uid } from './db.js';
import { S, upsertArtist, saveSong } from './state.js';

const ANDANCA_CIFRA = `[Parte A]
A7M
  Vim, tanta areia andei
F7M
  Da lua cheia eu sei
Bb7M        Bm7(b5) E7(13)E7(b13)
  Uma saudade imensa
A7M
  Vagando em verso eu vim
F7M
  Vestido de cetim
Bb7M           Bm7(b5) E7
  Na mão direita rosas
Am7(11)
  Vou levar

[Parte B]
A          A7M     A6
  Olha a lua mansa a se derramar
  (Me leva amor)
A7M              B/A
  Ao luar descansa meu caminhar
  (Amor)
B/A
  Seu olhar em festa se fez feliz
E/G#        D/F#
  Lembrando a seresta que um dia eu fiz
Bm7            C#m7       D7M E7(9)
  Por onde for   quero ser  seu par

[Refrão]
A                  A7M A6
  Já me fiz a guerra por não saber
  (Me leva amor)
A7M                    B/A
  Que essa terra encerra meu bem-querer
  (Amor)
B/A
  E jamais termina meu caminhar
E/G# D/F#
  Só o amor me ensina onde vou chegar
Bm7            C#m7       D7M E7(9)
  Por onde for   quero ser  seu par

[Parte A]
A7M
  Rodei de roda andei
F7M
  Dança da moda eu sei
Bb7M          Bm7(b5)  E7(13)E7(b13)
  Cansei de ser sozinho
A7M
  Verso encantado usei
F7M
  Meu namorado é rei
Bb7M          Bm7(b5)  E7
  Nas lendas do caminho
Am7(11)
  Onde andei

[Final]
A             A6            A7M
  La-laia-lai-a La-lai-alai-a La-laialai-a
B/A         E/G#         D/F#
  Lalaialai-a La-laialai-a Lalaialai-a
Bm7            C#m7       D7M      E7(9)
  Por onde for   quero ser  seu      par`;

const ANDANCA_DIGITACOES = {
  'A7M': { frets: [5, -1, 6, 6, 5, -1] }, 'F7M': { frets: [1, -1, 2, 2, 1, -1] }, 'Bb7M': { frets: [-1, 1, 3, 2, 3, -1] },
  'Bm7(b5)': { frets: [-1, 2, 3, 2, 3, -1] }, 'E7(13)': { frets: [0, -1, 0, 1, 2, -1] }, 'E7(b13)': { frets: [0, -1, 0, 1, 1, -1] },
  'E7': { frets: [0, 2, 2, 1, 3, -1] }, 'Am7(11)': { frets: [-1, 0, 5, 5, 3, -1] }, 'A': { frets: [-1, 0, 7, 6, 5, -1] },
  'A6': { frets: [5, -1, 4, 6, 5, -1] }, 'B/A': { frets: [5, -1, 4, 4, 4, -1] }, 'E/G#': { frets: [4, -1, 2, 4, 5, -1] },
  'D/F#': { frets: [2, -1, 0, 2, 3, -1] }, 'Bm7': { frets: [-1, 2, 4, 2, 3, -1] }, 'C#m7': { frets: [-1, 4, 6, 4, 5, -1] },
  'D7M': { frets: [-1, 5, 7, 6, 7, -1] }, 'E7(9)': { frets: [-1, 7, 6, 7, 7, -1] },
};

const ANDANCA_LETRA = `Vim, tanta areia andei
Da lua cheia eu sei
Uma saudade imensa
Vagando em verso eu vim
Vestido de cetim
Na mão direita rosas
Vou levar

Olha a lua mansa a se derramar
Ao luar descansa meu caminhar
Seu olhar em festa se fez feliz
Lembrando a seresta que um dia eu fiz
Por onde for quero ser seu par`;

export async function importSamples() {
  const done = [];
  // -- Paralelas (imagem) --
  if (!S.songs.some((s) => s.title === 'Paralelas')) {
    const res = await fetch('samples/paralelas.png');
    if (res.ok) {
      const blob = await res.blob();
      const blobId = uid();
      await DB.saveBlob(blobId, blob);
      const fagner = await upsertArtist('Fagner');
      await saveSong({
        id: uid(), artistId: fagner.id, title: 'Paralelas', tom: 'G', favorita: false,
        createdAt: Date.now(),
        cifra: {
          fonte: 'imagem',
          imagens: [{ blobId, tipo: 'aberta' }],
          acordes: ['D', 'D7/C', 'G', 'Gm', 'G7M', 'E'],
        },
        letra: '', stems: [], full: [],
      });
      done.push('Paralelas (Fagner) — cifra por imagem');
    }
  }
  // -- Andança (texto) --
  if (!S.songs.some((s) => s.title === 'Andança')) {
    const beth = await upsertArtist('Beth Carvalho');
    await saveSong({
      id: uid(), artistId: beth.id, title: 'Andança', tom: 'A', favorita: false,
      createdAt: Date.now(),
      cifra: {
        fonte: 'texto', texto: ANDANCA_CIFRA, digitacoes: ANDANCA_DIGITACOES,
        acordes: ['A7M', 'F7M', 'Bb7M', 'Bm7(b5)', 'E7(13)', 'E7(b13)', 'E7', 'Am7(11)', 'A', 'A6', 'B/A', 'E/G#', 'D/F#', 'Bm7', 'C#m7', 'D7M', 'E7(9)'],
      },
      letra: ANDANCA_LETRA, stems: [], full: [],
    });
    done.push('Andança (Beth Carvalho) — cifra em texto + letra');
  }
  return done;
}
