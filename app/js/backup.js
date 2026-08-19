// backup.js — exporta/importa a biblioteca inteira num arquivo .somaplay
// Formato: "SOMAPLAY1\n" + tamanho do JSON (10 dígitos) + "\n" + JSON + bytes dos blobs
// concatenados na ordem do manifest. Sem base64 — leitura por slice (memória ok).
import { DB } from './db.js';
import { S, blobIdsDasMusicas } from './state.js';
import { mergePlan } from './merge.js';
import { chordbookRecords, replaceChordbook, mergeChordbookRecords } from './chordbook.js';
import { t } from './i18n.js';
import { PARTES_TODAS, normalizaPartes, podaPorPartes, fundeMusica } from './partes.js';
import { limpaHTML } from './anotacoes.js';

const MAGIC = 'SOMAPLAY1\n';

// O recorte de uma exportação. Não sabe o que é fonte: recebe conjuntos de ids
// prontos, e por isso um eixo novo (artista, lista) entra sem mexer aqui.
// null em qualquer campo significa "tudo" — e com null nos dois o resultado é
// a biblioteca inteira, que é o caminho do backup completo de sempre.
//
// Artista sem música no recorte fica de fora: um artista vazio no destino é
// lixo para o usuário apagar à mão. As listas, ao contrário, viajam inteiras —
// são só ids, não pesam nada, e os que faltam se resolvem quando a outra fonte
// for importada. Podá-las perderia dado: o merge substitui a lista pelo id.
export function recorteParaExport(estado, sel) {
  const { artists = [], songs = [], lists = [] } = estado || {};
  const { songIds = null, listIds = null } = sel || {};
  const songsOut = songIds ? songs.filter((s) => songIds.has(s.id)) : songs;
  const comMusica = new Set(songsOut.map((s) => s.artistId));
  const artistsOut = songIds ? artists.filter((a) => comMusica.has(a.id)) : artists;
  const listsOut = listIds ? lists.filter((l) => listIds.has(l.id)) : lists;
  return { artists: artistsOut, songs: songsOut, lists: listsOut };
}

export function stampDeHoje(d = new Date()) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

const slug = (parte) => String(parte || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // tira acento
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// O miolo do nome quando o recorte é por fonte. Sem seleção é 'backup', e é isso
// que faz um backup completo continuar se chamando o que sempre se chamou.
// `palavraFontes` chega de fora ("fontes"/"sources") para a função ficar pura:
// nome de arquivo não é dado persistido, então traduzir aqui é seguro.
export function recorteDeFontes(fontes, palavraFontes) {
  if (!fontes || !fontes.length) return 'backup';
  if (fontes.length === 1) return slug(fontes[0]) || 'backup';
  return `${fontes.length}-${slug(palavraFontes)}`;
}

// `recorte` é o miolo: de recorteDeFontes, ou o nome de uma lista/artista.
//
// A regra do qualificador é uma só, e vale nas duas superfícies: cifra e audio
// JUNTAS não qualificam nada; sozinhas viram sufixo. `pessoal` e as listas ficam
// fora do nome — quatro sufixos combinados dariam
// somaplay-show-sabado-cifras-sem-listas-…, que não ajuda ninguém a escolher um
// arquivo na pasta de Downloads.
export function nomeDoExport(recorte, stamp, partes, palavras = {}) {
  const ps = partes || PARTES_TODAS;
  const temCifra = ps.includes('cifra');
  const temAudio = ps.includes('audio');
  const qual = temCifra === temAudio ? '' : slug(temCifra ? palavras.cifras : palavras.audio);
  return `somaplay-${slug(recorte) || 'backup'}-${qual ? `${qual}-` : ''}${stamp}.somaplay`;
}

// Sem argumento, o comportamento é o de sempre: a biblioteca inteira, todas as
// partes.
export async function exportLibrary({ songIds = null, listIds = null, partes = null, fileName = null } = {}) {
  const ps = partes || PARTES_TODAS;
  const corte = recorteParaExport({ artists: S.artists, songs: S.songs, lists: S.lists }, { songIds, listIds });
  // Podar PRIMEIRO, coletar depois: um pacote só de áudio tem registros sem
  // cifra.imagens, então blobIdsDasMusicas naturalmente devolve só os stems.
  // Ela NÃO ganha um parâmetro `partes` — é a definição única de "quais blobs
  // são desta música" (state.js:279), e um segundo eixo de verdade ali é
  // exatamente como apagar e exportar passam a discordar.
  const podadas = podaPorPartes(corte.songs, ps);
  const blobIds = blobIdsDasMusicas(podadas);
  const parts = [];
  const manifestBlobs = [];
  for (const id of blobIds) {
    const b = await DB.getBlob(id);
    if (!b) continue;
    manifestBlobs.push({ id, size: b.size, type: b.type || 'application/octet-stream' });
    parts.push(b);
  }
  // `version` continua 1: um arquivo parcial é um .somaplay v1 legítimo, e
  // `partes` ausente significa completo — que é como todo arquivo antigo é lido.
  const manifest = {
    version: 1,
    app: 'soma_play',
    partes: ps,
    artists: corte.artists,
    songs: podadas,
    lists: corte.lists,
    blobs: manifestBlobs,
  };
  if (ps.includes('cifra')) manifest.chordbook = chordbookRecords();
  if (ps.includes('pessoal')) manifest.settings = S.settings;
  const json = JSON.stringify(manifest);
  const header = MAGIC + String(new TextEncoder().encode(json).byteLength).padStart(10, '0') + '\n' + json;
  // `palavras` real, não `{}`: sem ela um recorte parcial que caia neste
  // fallback perderia o qualificador (cifras/áudio) do nome, e um backup
  // parcial ficaria com o mesmo nome de um completo.
  const nome = fileName || nomeDoExport('backup', stampDeHoje(), ps, {
    cifras: t('share.word.cifras'), audio: t('share.word.audio'),
  });
  return new File([header, ...parts], nome, { type: 'application/octet-stream' });
}

// O caminho de sempre: o arquivo cai na pasta de downloads. É o que Exportar
// (backup) usa, porque backup é "me dê um arquivo para guardar" — abrir a folha
// do sistema para isso obrigaria a escolher um destino a cada vez.
export function baixaArquivo(file) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 30000);
}

// Devolve false só quando a pessoa desistiu na folha do sistema: nada foi
// entregue, e quem chama não pode dizer que foi.
export async function entregaArquivo(file) {
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return true; }
    // Desistir não é falha: sai quieto, sem baixar e sem toast de erro.
    catch (e) { if (e && e.name === 'AbortError') return false; }
    // Qualquer OUTRA falha do compartilhamento cai no download de propósito:
    // a pessoa continua ficando com o arquivo, só por outro caminho.
  }
  baixaArquivo(file);
  return true;
}

// Lê só o cabeçalho: magic + tamanho + JSON. O import precisa disso, e o
// diálogo de confirmação do "Substituir tudo" vai precisar do mesmo
// cabeçalho, por isso a função existe sozinha.
export async function lerManifest(file) {
  const headProbe = await file.slice(0, MAGIC.length + 11).text();
  if (!headProbe.startsWith(MAGIC)) throw new Error(t('msg.backup.notASomaplayFile'));
  const jsonLen = parseInt(headProbe.slice(MAGIC.length, MAGIC.length + 10), 10);
  const jsonStart = MAGIC.length + 11;
  const json = await file.slice(jsonStart, jsonStart + jsonLen).text();
  const manifest = JSON.parse(json);
  if (!manifest.songs || !manifest.artists) throw new Error(t('msg.backup.invalidBackup'));
  return { manifest, blobsStart: jsonStart + jsonLen };
}

// Devolve NOMES DE CHAVE, não texto traduzido: assim a função continua pura e o
// teste não depende da tabela de i18n.
//
// Recebe o MANIFEST inteiro, e não só `partes`, porque os dois eixos que
// somem num "substituir tudo" moram em lugares diferentes do arquivo: as partes
// no campo `partes`, as listas na presença de `lists`.
//
// `pessoal` avisa. A regra antiga — "perder as favoritas num substituir tudo é o
// que substituir sempre fez" — era verdade até esta branch: ANTES dela todo
// .somaplay carregava as favoritas, então substituir nunca as perdia. É esta
// branch que fabrica o arquivo que perde, e ele tem o MESMO NOME de um backup
// completo (`pessoal` e as listas não qualificam o nome, de propósito). Sem o
// aviso, o único sinal de que a biblioteca foi reescrita sem favorita, sem
// createdAt, sem ajustes e sem lista nenhuma seria a biblioteca depois.
//
// Um `partes` que não é array vem de arquivo corrompido ou feito à mão, e
// normalizaPartes o lê como completo — a mesma leitura de importLibrary. A
// guarda mora aqui, e não em quem chama, para a função ser total: ela roda ANTES
// do try do diálogo.
export function avisosDeSubstituir({ partes, lists } = {}, { temListas = false } = {}) {
  const ps = normalizaPartes(partes);
  const out = [];
  if (!ps.includes('audio')) out.push('msg.backup.replaceNoAudio');
  if (!ps.includes('cifra')) out.push('msg.backup.replaceNoCifra');
  if (!ps.includes('pessoal')) out.push('msg.backup.replaceNoPessoal');
  // Assimétrico de propósito: o arquivo TRAZER anotação não avisa nada — isso é
  // substituir normal. O aviso é só para quando ele NÃO traz: aí a anotação
  // some sem nada para tomar o lugar dela, e substituir não pergunta por
  // música (essa pergunta é só do merge, em conflitosDeNotas).
  if (!ps.includes('anotacoes')) out.push('msg.backup.replaceNoAnotacoes');
  // Só avisa quando há o que perder: um aparelho sem lista nenhuma não perde
  // nada, e o aviso viraria ruído no import de quem nunca criou uma lista.
  if (!(Array.isArray(lists) && lists.length) && temListas) out.push('msg.backup.replaceNoLists');
  return out;
}

// A anotação é o único campo que o merge sobrescreve e que foi digitado à mão.
// Sem anotação de um dos lados, ou com as duas iguais, não há o que perguntar.
//
// Pura e chamada pelo chamador, como avisosDeSubstituir: perguntar de dentro de
// importLibrary seria tarde demais no modo substituir, onde o DB.wipe() já
// aconteceu.
//
// Na prática só faz sentido perguntar no MERGE — no substituir o aparelho
// inteiro é apagado antes de gravar (DB.wipe()), então "manter a minha" não
// tem onde pousar; ali o aviso certo é avisosDeSubstituir, não esta pergunta
// por música. A função continua total e sem saber de modo, de propósito: quem
// decide se pergunta é o chamador (main.js), não ela.
export function conflitosDeNotas(atuais, doArquivo, partes) {
  if (!normalizaPartes(partes).includes('anotacoes')) return [];
  const mapa = new Map((atuais || []).map((s) => [s.id, s]));
  return (doArquivo || []).filter((f) => {
    const a = mapa.get(f.id);
    const minha = String((a && a.anotacoes) || '').trim();
    const dela = String(f.anotacoes || '').trim();
    return minha && dela && minha !== dela;
  }).map((f) => f.id);
}

export async function importLibrary(file, { merge = false, decisaoNotas = 'substituir' } = {}) {
  const { manifest, blobsStart } = await lerManifest(file);
  // Um arquivo corrompido ou feito à mão pode trazer `partes` que não é array —
  // e sem essa guarda o `.includes` mais abaixo lançaria DEPOIS do DB.wipe() no
  // modo substituir. Tratar como "completo" é a mesma regra de "partes ausente".
  const partes = normalizaPartes(manifest.partes);

  // Antes de qualquer gravação: daqui para baixo a anotação do arquivo já é
  // confiável, nos dois modos. O .somaplay chegou de fora (WhatsApp, outro
  // aparelho) e o campo vai direto para um innerHTML — sem isso um arquivo
  // malicioso ou só malformado escreveria HTML cru na biblioteca.
  for (const s of manifest.songs || []) {
    if (s.anotacoes) s.anotacoes = limpaHTML(s.anotacoes);
  }
  // "Manter as minhas": apaga o campo do ARQUIVO em memória, e não de `partes`.
  // Tirar 'anotacoes' de `partes` não bastaria: um `partes` de 4 itens menos
  // 'anotacoes' vira exatamente PARTES_LEGADO, e fundeMusica trata
  // PARTES_LEGADO como "arquivo legado completo" (partes.js) — o
  // Object.assign daquele atalho copiaria a anotação de qualquer jeito,
  // porque ele copia a partir do objeto, não da lista de partes. Apagar a
  // chave é imune a esse atalho, porque ambos os caminhos de fundeMusica só
  // tocam num campo que existe no objeto de origem.
  //
  // Isto SÓ preserva a anotação local no MERGE. No substituir, `atual` chega
  // `null` em fundeMusica (a linha do DB.wipe() logo abaixo já rodou por
  // baixo, e a chamada de replace usa `fundeMusica(null, s, partes, agora)`)
  // — não há registro local para a anotação apagada "voltar a valer", então
  // apagar a chave ali só faria a anotação sumir, não mantê-la. main.js sabe
  // disso e só passa `decisaoNotas: 'manter'` quando `merge` é true; no
  // substituir o aviso é outro (avisosDeSubstituir → replaceNoAnotacoes),
  // dado ANTES da troca, porque depois do wipe já é tarde para perguntar.
  if (decisaoNotas === 'manter') {
    for (const s of manifest.songs || []) delete s.anotacoes;
  }

  // Um relógio só para o import inteiro: uma música que chega sem `createdAt`
  // (todo compartilhamento, porque a data é `pessoal`) nasce com a data de hoje,
  // e o repertório inteiro entra JUNTO no topo de Recentes.
  const agora = Date.now();

  // Substituir apaga tudo antes; merge preserva a biblioteca (upsert por id).
  if (!merge) await DB.wipe();

  // blobs — upsert por id nos dois modos
  let off = blobsStart;
  for (const meta of manifest.blobs || []) {
    const chunk = file.slice(off, off + meta.size, meta.type);
    await DB.saveBlob(meta.id, chunk);
    off += meta.size;
  }

  let result;
  if (merge) {
    const plan = mergePlan({ artists: S.artists, songs: S.songs, lists: S.lists }, manifest, agora);
    for (const a of plan.artists) await DB.putArtist(a);
    for (const s of plan.songs) await DB.putSong(s);
    for (const l of plan.lists) await DB.putList(l);
    // Ausência não é deleção, também aqui: um pacote só de áudio não fala do
    // dicionário, e não pode encostar nele.
    if (partes.includes('cifra')) await mergeChordbookRecords(manifest.chordbook || []);
    result = { added: plan.added, updated: plan.updated };
  } else {
    for (const a of manifest.artists) await DB.putArtist(a);
    // Mesmo no modo espelho a música precisa sair com a invariante da cifra —
    // um arquivo só de áudio criaria registros sem o objeto que todo render
    // assume que existe.
    for (const s of manifest.songs) await DB.putSong(fundeMusica(null, s, partes, agora));
    for (const l of manifest.lists || []) await DB.putList(l);
    if (partes.includes('pessoal') && manifest.settings) {
      // lang/notação são preferências do aparelho: não viajam entre bibliotecas
      const { lang, chordNotation, chordNotationTouched, ...rest } = manifest.settings;
      S.settings = { ...S.settings, ...rest };
      await DB.saveSettings(S.settings);
    }
    if (partes.includes('cifra')) await replaceChordbook(manifest.chordbook || []);
    result = { artists: manifest.artists.length, songs: manifest.songs.length };
  }

  // recarrega o estado do IndexedDB (consistente nos dois modos)
  const all = await DB.loadAll();
  S.artists = all.artists.sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  S.songs = all.songs;
  S.lists = all.lists;
  return result;
}
