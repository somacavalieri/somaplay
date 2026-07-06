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

const DEMO_CIFRA = `[Groove · 100 bpm]
Am              F
  Toca junto e ouve o mix
C               G
  Cada canal no seu lugar
Am              F
  Sobe o baixo, tira a voz
C               G
  A levada vai rolar

[Refrão]
Am        F
  Play, pause e seek
C         G
  Tudo em sincronia`;

const DEMO_LETRA = `Toca junto e ouve o mix
Cada canal no seu lugar
Sobe o baixo, tira a voz
A levada vai rolar

Play, pause e seek
Tudo em sincronia`;

const PASTORINHAS_CIFRA = `[Intro] C/E  Cm6/Eb  G/D  E7  A7  D7  Gm

          Gm          G7/B    Cm
A estrela d'alva, no céu   desponta
             D7                       Gm
E a lua anda tonta, com tamanho esplendor
          Cm             D7      Gm
E as moreninhas, pra consolo da lua
                A7    D7                  G
Vão cantando na rua,    lindos versos de amor

         G                 G/B    Gm6/Bb  Am7   D7
Linda morena, morenaa, da cor de Mada    le    na

Tu não tens pena de mim
G
Que vivo louco com esse seu olhar
         G      G7                     C
Linda criança,    tu não me sais da lembrança
        Cm6/Eb         G/D   E7
Meu coração    não se can....sa
A7           D7        Gm
De sempre e sempre te amar`;

const PASTORINHAS_DIG = {
  'C/E': { frets: [0, 3, 2, 0, 1, 0] }, 'Cm6/Eb': { frets: [-1, -1, 1, 2, 1, 3] },
  'G/D': { frets: [-1, 5, 5, 4, 3, -1] }, 'E7': { frets: [0, 2, 2, 1, 3, 0] },
  'A7': { frets: [-1, 0, 2, 0, 2, 0] }, 'D7': { frets: [-1, -1, 0, 2, 1, 2] },
  'Gm': { frets: [3, 5, 5, 3, 3, 3], barre: { fret: 3, from: 0, to: 5 } },
  'G7/B': { frets: [-1, 2, 3, 0, 3, -1] }, 'Cm': { frets: [-1, 3, 5, 5, 4, 3], barre: { fret: 3, from: 1, to: 5 } },
  'G': { frets: [3, 2, 0, 0, 0, 3] }, 'G/B': { frets: [-1, 2, 0, 0, 3, 3] },
  'Gm6/Bb': { frets: [-1, 1, 2, 0, 3, 0] }, 'Am7': { frets: [-1, 0, 2, 0, 1, 0] },
  'G7': { frets: [3, 2, 0, 0, 0, 1] }, 'C': { frets: [-1, 3, 2, 0, 1, 0] },
};

const OXUM_CIFRA = `F#m
Iê iê iê iê

Iê iê iê iê

F#m                       Bm7
A sua luz reluz os seus encantos
C#m                       Bm7
A sua luz reluz o seu axé
C#m                       Bm7
A sua luz que vem da cachoeira
C#m                              F#m
Das santas águas doces de mamãe Oxum

F#m                       Bm7
A sua luz reluz os seus encantos
C#m                       Bm7
A sua luz reluz o seu axé
C#m                       Bm7
A sua luz que vem da cachoeira
C#m                              F#m
Das santas águas doces de mamãe Oxum

F#m    Bm7
Iê, iê, ô
Bm7   C#m7  
Iê, iê, ô

C#m7                              Bm7
Meu caminhar se enfeita com as miçangas
                                  F#m
Das santas águas doces de mamãe Oxum

F#m    Bm7
Iê, iê, ô
Bm7   C#m7  
Iê, iê, ô

C#m7                              Bm7
Meu caminhar se enfeita com as miçangas
                                  F#m
Das santas águas doces de mamãe Oxum`;

const OXUM_DIG = {
  'F#m': { frets: [2, 4, 4, 2, 2, 2], barre: { fret: 2, from: 0, to: 5 } },
  'Bm7': { frets: [-1, 2, 4, 2, 3, 2], barre: { fret: 2, from: 1, to: 5 } },
  'C#m': { frets: [-1, 4, 6, 6, 5, 4], barre: { fret: 4, from: 1, to: 5 } },
  'C#m7': { frets: [-1, 4, 6, 4, 5, 4], barre: { fret: 4, from: 1, to: 5 } },
};

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
  // -- Groove de teste (áudio sintético, 4 canais) — para experimentar o mixer --
  if (!S.songs.some((s) => s.title === 'Groove de teste')) {
    const canais = [
      { key: 'baixo', name: 'Baixo', vol: 85 },
      { key: 'violao', name: 'Violão', vol: 75 },
      { key: 'piano', name: 'Piano', vol: 60 },
      { key: 'bateria', name: 'Bateria', vol: 70 },
    ];
    const stems = [];
    let ok = true;
    for (const c of canais) {
      const res = await fetch(`samples/demo/${c.key}.mp3`);
      if (!res.ok) { ok = false; break; }
      const blobId = uid();
      await DB.saveBlob(blobId, await res.blob());
      stems.push({ id: c.key, name: c.name, blobId, fileName: `${c.key}.mp3`, vol: c.vol, muted: false });
    }
    if (ok) {
      const demo = await upsertArtist('Demonstração');
      await saveSong({
        id: uid(), artistId: demo.id, title: 'Groove de teste', tom: 'Am', favorita: false,
        createdAt: Date.now(),
        cifra: { fonte: 'texto', texto: DEMO_CIFRA, digitacoes: null, acordes: ['Am', 'F', 'C', 'G'] },
        letra: DEMO_LETRA, stems, full: [],
      });
      done.push('Groove de teste (Demonstração) — 4 canais de áudio p/ o mixer');
    }
  }
  // -- As Pastorinhas (Noel Rosa) — caso-ouro: texto + 15 digitações conferidas --
  if (!S.songs.some((s) => s.title === 'As Pastorinhas')) {
    const noel = await upsertArtist('Noel Rosa');
    await saveSong({
      id: uid(), artistId: noel.id, title: 'As Pastorinhas', tom: 'G', favorita: false,
      createdAt: Date.now(),
      cifra: {
        fonte: 'texto', texto: PASTORINHAS_CIFRA, digitacoes: PASTORINHAS_DIG,
        acordes: ['C/E', 'Cm6/Eb', 'G/D', 'E7', 'A7', 'D7', 'Gm', 'G7/B', 'Cm', 'G', 'G/B', 'Gm6/Bb', 'Am7', 'G7', 'C'],
      },
      letra: '', stems: [], full: [],
    });
    done.push('As Pastorinhas (Noel Rosa) — cifra em texto + 15 digitações conferidas');
  }
  // -- Oxum (Serena Assumpção) — importada do CifraClub (texto + 4 acordes) --
  if (!S.songs.some((s) => s.title === 'Oxum')) {
    const serena = await upsertArtist('Serena Assumpção');
    await saveSong({
      id: uid(), artistId: serena.id, title: 'Oxum', tom: 'F#m', favorita: false,
      createdAt: Date.now(),
      cifra: {
        fonte: 'texto', texto: OXUM_CIFRA, digitacoes: OXUM_DIG,
        acordes: ['F#m', 'Bm7', 'C#m', 'C#m7'],
      },
      letra: '', stems: [], full: [],
    });
    done.push('Oxum (Serena Assumpção) — cifra em texto importada do CifraClub');
  }
  return done;
}
