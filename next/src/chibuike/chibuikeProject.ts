// Chibuike project desk — save/load .pluma.json, IndexedDB autosave + recovery.
// Autosave is debounced; a panel crash must never eat a project.
import { ChibuikeDoc, ChibuikeProjectFile, CHIBUIKE_PROJECT_KIND } from './chibuikeTypes';
import { chibuikeParseProject, chibuikeCloneDoc } from './chibuikeDoc';
import { chibuikeAssets } from './chibuikeAssets';

const CHIBUIKE_DB = 'chibuike-pluma';
const CHIBUIKE_STORE = 'autosave';
const EMBED_LIMIT = 1_500_000; // bytes — above this, blobs go to IndexedDB instead of the JSON

function chibuikeOpenDb(): Promise<IDBDatabase | null> {
  return new Promise(res => {
    try {
      const req = indexedDB.open(CHIBUIKE_DB, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(CHIBUIKE_STORE)) db.createObjectStore(CHIBUIKE_STORE, { keyPath: 'id' });
      };
      req.onsuccess = () => res(req.result);
      req.onerror = () => res(null);
    } catch { res(null); }
  });
}

/** Build the serializable project file, embedding small assets as dataURLs. */
export async function chibuikeBuildProjectFile(doc: ChibuikeDoc): Promise<ChibuikeProjectFile> {
  const assetBlobs: Record<string, string> = {};
  const fileDoc = chibuikeCloneDoc(doc);
  for (const a of fileDoc.assets) {
    if (a.bytes <= EMBED_LIMIT && !a.src) {
      a.src = await chibuikeAssets.toDataUrl(a.id);
      if (a.src) a.origin = 'embedded';
    } else if (a.bytes > EMBED_LIMIT) {
      const du = await chibuikeAssets.toDataUrl(a.id);
      if (du) assetBlobs[a.id] = du;
    }
  }
  return { chibuike: CHIBUIKE_PROJECT_KIND, plumaProjectVersion: 1, doc: fileDoc, assetBlobs };
}

export async function chibuikeDownloadProject(doc: ChibuikeDoc): Promise<void> {
  const file = await chibuikeBuildProjectFile(doc);
  const blob = new Blob([JSON.stringify(file)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(doc.name || 'untitled').replace(/[^\w-]+/g, '-')}.pluma.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Parse + hydrate a project file into the asset vault. Rejects gracefully. */
export async function chibuikeLoadProjectFile(text: string): Promise<ChibuikeDoc> {
  let json: unknown;
  try { json = JSON.parse(text); } catch { throw new Error('Not valid JSON.'); }
  const file = chibuikeParseProject(json);
  // hydrate blobs into the vault with the SAME ids the doc references
  for (const a of file.doc.assets) {
    if (chibuikeAssets.get(a.id)) continue;
    let dataUrl = a.src ?? file.assetBlobs?.[a.id] ?? null;
    if (!dataUrl) continue;
    const blob = await (await fetch(dataUrl)).blob();
    await chibuikeAssets.put(a.id, a.name, blob);
  }
  return file.doc;
}

/* ── autosave ────────────────────────────────────────────────────────────── */
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function chibuikeScheduleAutosave(doc: ChibuikeDoc): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { void chibuikeAutosaveNow(doc); }, 1600);
}

export async function chibuikeAutosaveNow(doc: ChibuikeDoc): Promise<void> {
  const db = await chibuikeOpenDb();
  if (!db) return;
  const file = await chibuikeBuildProjectFile(doc);
  await new Promise<void>(res => {
    const tx = db.transaction(CHIBUIKE_STORE, 'readwrite');
    tx.objectStore(CHIBUIKE_STORE).put({ id: 'current', file, savedAt: Date.now() });
    tx.oncomplete = () => res();
    tx.onerror = () => res();
  });
}

export interface ChibuikeAutosaveRecord { file: ChibuikeProjectFile; savedAt: number; }

export async function chibuikeReadAutosave(): Promise<ChibuikeAutosaveRecord | null> {
  const db = await chibuikeOpenDb();
  if (!db) return null;
  return new Promise(res => {
    const tx = db.transaction(CHIBUIKE_STORE, 'readonly');
    const req = tx.objectStore(CHIBUIKE_STORE).get('current');
    req.onsuccess = () => res((req.result as ChibuikeAutosaveRecord) ?? null);
    req.onerror = () => res(null);
  });
}

export async function chibuikeClearAutosave(): Promise<void> {
  const db = await chibuikeOpenDb();
  if (!db) return;
  const tx = db.transaction(CHIBUIKE_STORE, 'readwrite');
  tx.objectStore(CHIBUIKE_STORE).delete('current');
}
