// db.js — persistência: IndexedDB (metadados) + OPFS (arquivos grandes; fallback IDB)
// Modelo (v1): artists { id, name, av } · songs { id, artistId, title, tom, favorita,
//   createdAt, cifra{fonte,imagens[],texto,acordes[],digitacoes{}}, letra, stems[], full[] }
//   lists { id, nome, fixada, musicas[] } · settings { key:'main', ... }

const DB_NAME = 'somaplay';
const DB_VERSION = 1;

let _db = null;
let _opfsRoot = null; // null = ainda não checado; false = indisponível

function idb() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains('artists')) d.createObjectStore('artists', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('songs')) d.createObjectStore('songs', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('lists')) d.createObjectStore('lists', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('settings')) d.createObjectStore('settings', { keyPath: 'key' });
      if (!d.objectStoreNames.contains('blobs')) d.createObjectStore('blobs', { keyPath: 'id' }); // fallback OPFS
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(store, mode, fn) {
  return idb().then((d) => new Promise((resolve, reject) => {
    const t = d.transaction(store, mode);
    const s = t.objectStore(store);
    const out = fn(s);
    t.oncomplete = () => resolve(out && out._result !== undefined ? out._result : out);
    t.onerror = () => reject(t.error);
  }));
}

function reqAll(store) {
  return idb().then((d) => new Promise((resolve, reject) => {
    const r = d.transaction(store, 'readonly').objectStore(store).getAll();
    r.onsuccess = () => resolve(r.result || []);
    r.onerror = () => reject(r.error);
  }));
}

// ---------- OPFS ----------
async function opfs() {
  if (_opfsRoot !== null) return _opfsRoot;
  try {
    if (navigator.storage && navigator.storage.getDirectory) {
      const root = await navigator.storage.getDirectory();
      _opfsRoot = await root.getDirectoryHandle('library', { create: true });
    } else _opfsRoot = false;
  } catch (e) { _opfsRoot = false; }
  return _opfsRoot;
}

export const DB = {
  async init() {
    await idb();
    await opfs();
    // Pede persistência pro navegador não despejar a biblioteca.
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  },

  // ---------- metadados ----------
  loadAll() {
    return Promise.all([reqAll('artists'), reqAll('songs'), reqAll('lists')])
      .then(([artists, songs, lists]) => ({ artists, songs, lists }));
  },
  putArtist(a) { return tx('artists', 'readwrite', (s) => s.put(a)); },
  deleteArtist(id) { return tx('artists', 'readwrite', (s) => s.delete(id)); },
  putSong(sg) { return tx('songs', 'readwrite', (s) => s.put(sg)); },
  deleteSong(id) { return tx('songs', 'readwrite', (s) => s.delete(id)); },
  putList(l) { return tx('lists', 'readwrite', (s) => s.put(l)); },
  deleteList(id) { return tx('lists', 'readwrite', (s) => s.delete(id)); },

  loadSettings() {
    return idb().then((d) => new Promise((resolve) => {
      const r = d.transaction('settings', 'readonly').objectStore('settings').get('main');
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => resolve(null);
    }));
  },
  saveSettings(obj) { return tx('settings', 'readwrite', (s) => s.put({ key: 'main', ...obj })); },

  // ---------- blobs (OPFS com fallback IDB) ----------
  async saveBlob(id, blob) {
    const dir = await opfs();
    if (dir) {
      const fh = await dir.getFileHandle(id, { create: true });
      const w = await fh.createWritable();
      await w.write(blob);
      await w.close();
      return { id, store: 'opfs' };
    }
    await tx('blobs', 'readwrite', (s) => s.put({ id, blob }));
    return { id, store: 'idb' };
  },
  async getBlob(id) {
    const dir = await opfs();
    if (dir) {
      try {
        const fh = await dir.getFileHandle(id);
        return await fh.getFile();
      } catch (e) { /* cai pro fallback */ }
    }
    return idb().then((d) => new Promise((resolve) => {
      const r = d.transaction('blobs', 'readonly').objectStore('blobs').get(id);
      r.onsuccess = () => resolve(r.result ? r.result.blob : null);
      r.onerror = () => resolve(null);
    }));
  },
  async deleteBlob(id) {
    const dir = await opfs();
    if (dir) { try { await dir.removeEntry(id); return; } catch (e) { /* segue */ } }
    return tx('blobs', 'readwrite', (s) => s.delete(id));
  },
  async listBlobIds() {
    const ids = new Set();
    const dir = await opfs();
    if (dir) for await (const [name] of dir.entries()) ids.add(name);
    const fromIdb = await reqAll('blobs');
    fromIdb.forEach((r) => ids.add(r.id));
    return [...ids];
  },

  // URL de objeto pra usar em <img>/<audio> (chamador revoga quando trocar de tela)
  async blobURL(id) {
    if (!id) return null;
    const b = await this.getBlob(id);
    return b ? URL.createObjectURL(b) : null;
  },

  async storageEstimate() {
    if (navigator.storage && navigator.storage.estimate) {
      try { return await navigator.storage.estimate(); } catch (e) { /* ignore */ }
    }
    return { usage: 0, quota: 0 };
  },
};

export function uid() {
  return (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2));
}
