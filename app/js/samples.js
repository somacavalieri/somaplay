// samples.js — importa a música de exemplo (validação imediata do app)
// Conteúdo 100% autoral do projeto: o app não distribui cifras, letras nem áudio
// de terceiros. Stems de áudio entram quando houver gravação própria.
import { uid } from './db.js';
import { S, upsertArtist, saveSong } from './state.js';
import { t } from './i18n.js';

// Título e artista são conteúdo da música-exemplo (nunca traduzidos, como
// qualquer cifra) — só a descrição do que foi importado usa i18n.
const DEMO_TITLE = 'Groove de teste';
const DEMO_ARTIST = 'Demonstração';

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

export async function importSamples() {
  const done = [];
  // -- Groove de teste — cifra em texto (diagramas vêm do catálogo) + letra p/ karaokê --
  if (!S.songs.some((s) => s.title === DEMO_TITLE)) {
    const demo = await upsertArtist(DEMO_ARTIST);
    await saveSong({
      id: uid(), artistId: demo.id, title: DEMO_TITLE, tom: 'Am', favorita: false,
      createdAt: Date.now(),
      cifra: { fonte: 'texto', texto: DEMO_CIFRA, digitacoes: null, acordes: ['Am', 'F', 'C', 'G'] },
      letra: DEMO_LETRA, stems: [], full: [],
    });
    done.push(t('msg.samples.demoDescription', { title: DEMO_TITLE, artist: DEMO_ARTIST }));
  }
  return done;
}
