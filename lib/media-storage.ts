export type MediaType = "photo" | "audio";

export interface StoredMediaItem {
  id: string;
  observationId: string;
  projectId: string;
  type: MediaType;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
  blob: Blob;
}

export interface MediaSaveInput {
  observationId: string;
  projectId: string;
  type: MediaType;
  file: Blob;
  filename: string;
}

const DB_NAME = "inspection-media";
const DB_VERSION = 1;
const STORE = "media";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error ?? new Error("Failed to open IndexedDB"));
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("observationId", "observationId", { unique: false });
        store.createIndex("projectId", "projectId", { unique: false });
      }
    };
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        const request = fn(store);

        request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
        request.onsuccess = () => resolve(request.result as T);

        tx.oncomplete = () => db.close();
        tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
      }),
  );
}

export async function saveMediaItem(
  input: MediaSaveInput,
  id?: string,
): Promise<StoredMediaItem> {
  const item: StoredMediaItem = {
    id: id ?? crypto.randomUUID(),
    observationId: input.observationId,
    projectId: input.projectId,
    type: input.type,
    filename: input.filename,
    mimeType: input.file.type || "application/octet-stream",
    size: input.file.size,
    createdAt: new Date().toISOString(),
    blob: input.file,
  };

  await runTransaction("readwrite", (store) => store.put(item));
  return item;
}

export async function getMediaItem(id: string): Promise<StoredMediaItem | null> {
  return runTransaction<StoredMediaItem | undefined>("readonly", (store) =>
    store.get(id),
  ).then((result) => result ?? null);
}

export async function getMediaItemsByIds(
  ids: string[],
): Promise<StoredMediaItem[]> {
  if (ids.length === 0) return [];

  const items = await Promise.all(ids.map((id) => getMediaItem(id)));
  const byId = new Map(items.filter(Boolean).map((item) => [item!.id, item!]));

  return ids
    .map((id) => byId.get(id))
    .filter((item): item is StoredMediaItem => item !== undefined);
}

export async function deleteMediaItem(id: string): Promise<void> {
  await runTransaction("readwrite", (store) => store.delete(id));
}

export async function deleteMediaItems(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => deleteMediaItem(id)));
}

export async function deleteMediaForObservation(
  observationId: string,
): Promise<void> {
  const db = await openDB();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const index = store.index("observationId");
    const request = index.openCursor(IDBKeyRange.only(observationId));

    request.onerror = () => reject(request.error ?? new Error("Cursor failed"));
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error("Delete transaction failed"));
  });
}

export async function deleteMediaForProject(projectId: string): Promise<void> {
  const db = await openDB();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const index = store.index("projectId");
    const request = index.openCursor(IDBKeyRange.only(projectId));

    request.onerror = () => reject(request.error ?? new Error("Cursor failed"));
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error("Delete transaction failed"));
  });
}
