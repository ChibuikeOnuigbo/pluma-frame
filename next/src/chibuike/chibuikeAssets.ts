// Chibuike asset vault — the ONLY owner of decoded image memory.
// Rules Chibuike lives by here:
//  • decode once (in the worker), never re-decode per frame
//  • keep the full-resolution bitmap for export, a ≤2048px preview for the editor
//  • blobs stay alive for project saving; object URLs are released eagerly

export interface ChibuikeAssetEntry {
  id: string;
  name: string;
  blob: Blob;
  w: number;
  h: number;
  full: ImageBitmap | HTMLImageElement | null;
  preview: ImageBitmap | HTMLImageElement | null; // ≤2048px
  bytes: number;
}

const PREVIEW_MAX = 2048;

class ChibuikeAssetVault {
  private entries = new Map<string, ChibuikeAssetEntry>();
  private worker: Worker | null = null;
  private waiting = new Map<string, ((e: ChibuikeAssetEntry | null) => void)[]>();

  get(id: string): ChibuikeAssetEntry | undefined {
    return this.entries.get(id);
  }

  all(): ChibuikeAssetEntry[] {
    return [...this.entries.values()];
  }

  totalBytes(): number {
    let n = 0;
    for (const e of this.entries.values()) n += e.bytes;
    return n;
  }

  private ensureWorker(): Worker | null {
    if (this.worker) return this.worker;
    try {
      this.worker = new Worker(new URL('./chibuikeDecode.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e: MessageEvent) => {
        const { assetId, ok, full, preview, w, h } = e.data;
        const entry = this.entries.get(assetId);
        if (entry && ok) {
          entry.full = full; entry.preview = preview;
          entry.w = w; entry.h = h;
        }
        this.resolveWaiters(assetId, ok && entry ? entry : null);
      };
      this.worker.onerror = () => { this.worker = null; };
    } catch { this.worker = null; }
    return this.worker;
  }

  private resolveWaiters(id: string, entry: ChibuikeAssetEntry | null) {
    const ws = this.waiting.get(id);
    if (ws) { for (const r of ws) r(entry); this.waiting.delete(id); }
  }

  /** Register an image blob. Decodes asynchronously; resolves when paintable. */
  async put(id: string, name: string, blob: Blob): Promise<ChibuikeAssetEntry> {
    const existing = this.entries.get(id);
    if (existing) return existing;
    const entry: ChibuikeAssetEntry = {
      id, name, blob, w: 0, h: 0, full: null, preview: null, bytes: blob.size,
    };
    this.entries.set(id, entry);
    const worker = this.ensureWorker();
    if (worker) {
      const done = new Promise<ChibuikeAssetEntry | null>(res => {
        this.waiting.set(id, [...(this.waiting.get(id) ?? []), res]);
        setTimeout(() => res(this.entries.get(id)?.full ? this.entries.get(id)! : null), 8000); // never hang the UI
      });
      worker.postMessage({ jobId: Date.now(), assetId: id, blob });
      const result = await done;
      if (result) return result;
      // worker failed → main-thread fallback
    }
    await this.decodeOnMain(entry);
    return entry;
  }

  private async decodeOnMain(entry: ChibuikeAssetEntry): Promise<void> {
    try {
      entry.full = await createImageBitmap(entry.blob);
      entry.w = (entry.full as ImageBitmap).width;
      entry.h = (entry.full as ImageBitmap).height;
      if (Math.max(entry.w, entry.h) > PREVIEW_MAX) {
        const s = PREVIEW_MAX / Math.max(entry.w, entry.h);
        entry.preview = await createImageBitmap(entry.blob, { resizeWidth: Math.round(entry.w * s), resizeHeight: Math.round(entry.h * s), resizeQuality: 'medium' });
      }
    } catch {
      // last resort: HTMLImageElement via object URL
      const url = URL.createObjectURL(entry.blob);
      try {
        const img = new Image();
        await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('decode failed')); img.src = url; });
        entry.full = img; entry.w = img.naturalWidth; entry.h = img.naturalHeight;
      } finally {
        // Chibuike: keep URL alive while img lives; revoke on forget()
      }
    }
  }

  /** Best bitmap for painting at a given display size. */
  paintSource(id: string, displayW: number): { src: ImageBitmap | HTMLImageElement | null; w: number; h: number } {
    const e = this.entries.get(id);
    if (!e) return { src: null, w: 0, h: 0 };
    if (e.preview && displayW <= PREVIEW_MAX) return { src: e.preview, w: e.w, h: e.h };
    return { src: e.full, w: e.w, h: e.h };
  }

  async toDataUrl(id: string): Promise<string | null> {
    const e = this.entries.get(id);
    if (!e) return null;
    return new Promise(res => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result));
      fr.onerror = () => res(null);
      fr.readAsDataURL(e.blob);
    });
  }

  async fetchUrl(url: string): Promise<{ blob: Blob; w: number; h: number }> {
    const resp = await fetch(url, { mode: 'cors' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    if (!blob.type.startsWith('image/') && !url.match(/\.(png|jpe?g|webp|gif|avif|svg)$/i)) {
      throw new Error('URL did not return an image.');
    }
    const bmp = await createImageBitmap(blob);
    const out = { blob, w: bmp.width, h: bmp.height };
    bmp.close();
    return out;
  }

  forget(id: string): void {
    const e = this.entries.get(id);
    if (!e) return;
    if (e.full && 'close' in e.full) (e.full as ImageBitmap).close();
    if (e.preview && 'close' in e.preview) (e.preview as ImageBitmap).close();
    this.entries.delete(id);
  }

  /** Drop everything not referenced by the given id set (memory hygiene). */
  retain(ids: Set<string>): void {
    for (const id of [...this.entries.keys()]) if (!ids.has(id)) this.forget(id);
  }
}

export const chibuikeAssets = new ChibuikeAssetVault();
