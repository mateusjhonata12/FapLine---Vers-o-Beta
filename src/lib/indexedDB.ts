// Service to manage persistent offline files using IndexedDB

const DB_NAME = 'LocalLessonsDB';
const STORE_NAME = 'files';

export function initIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function saveLocalFile(key: string, file: File | Blob): Promise<void> {
  return initIndexedDB().then((db) => {
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(file, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

export function getLocalFile(key: string): Promise<Blob | null> {
  return initIndexedDB().then((db) => {
    return new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }).catch((err) => {
    console.error("Erro do IndexedDB ao buscar arquivo:", err);
    return null;
  });
}
