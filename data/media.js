// Media storage for uploaded post assets.
// Keeps large files out of localStorage; posts only store short media: IDs.
(function () {
  const DB_NAME = 'cheervinsky_media';
  const STORE_NAME = 'assets';
  const VERSION = 1;

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, VERSION);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function withStore(mode, callback) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode);
      const store = tx.objectStore(STORE_NAME);
      const result = callback(store);
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async function saveFile(file) {
    const id = 'media-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    await withStore('readwrite', store => store.put({
      id,
      name: file.name,
      type: file.type,
      size: file.size,
      blob: file,
      createdAt: new Date().toISOString(),
    }));
    return id;
  }

  async function get(id) {
    return withStore('readonly', store => {
      const request = store.get(id);
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    });
  }

  async function getUrl(id) {
    const asset = await get(id);
    return asset ? URL.createObjectURL(asset.blob) : '';
  }

  window.cheerMedia = { saveFile, get, getUrl };
})();
