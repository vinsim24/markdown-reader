import type { FileHandleLike } from './fileAccess';

const databaseName = 'markdown-reader';
const storeName = 'recent-documents';
const maximumEntries = 20;

export type RecentSourceType = 'bundled' | 'file' | 'folder' | 'remote';

export interface RecentDocument {
  id: string;
  title: string;
  sourceType: RecentSourceType;
  lastOpened: number;
  sourceUrl?: string;
  handle?: FileHandleLike;
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) {
        request.result.createObjectStore(storeName, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
) {
  const database = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = action(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function loadRecentDocuments(): Promise<RecentDocument[]> {
  if (!('indexedDB' in window)) return [];
  try {
    const entries = await withStore<RecentDocument[]>('readonly', (store) =>
      store.getAll()
    );
    return entries
      .sort((left, right) => right.lastOpened - left.lastOpened)
      .slice(0, maximumEntries);
  } catch {
    return [];
  }
}

async function loadAllRecentDocuments(): Promise<RecentDocument[]> {
  if (!('indexedDB' in window)) return [];
  return withStore<RecentDocument[]>('readonly', (store) => store.getAll());
}

export async function rememberRecentDocument(entry: RecentDocument) {
  if (!('indexedDB' in window)) return;
  try {
    await withStore('readwrite', (store) => store.put(entry));
    const entries = (await loadAllRecentDocuments()).sort(
      (left, right) => right.lastOpened - left.lastOpened
    );
    await Promise.all(
      entries.slice(maximumEntries).map((item) =>
        withStore('readwrite', (store) => store.delete(item.id))
      )
    );
  } catch {
    // History is an enhancement. Opening a document must still succeed.
  }
}

export async function forgetRecentDocument(id: string) {
  if (!('indexedDB' in window)) return;
  try {
    await withStore('readwrite', (store) => store.delete(id));
  } catch {
    // Keep the in-memory list responsive if storage is unavailable.
  }
}

export async function clearRecentDocuments() {
  if (!('indexedDB' in window)) return;
  try {
    await withStore('readwrite', (store) => store.clear());
  } catch {
    // Keep the in-memory list responsive if storage is unavailable.
  }
}
