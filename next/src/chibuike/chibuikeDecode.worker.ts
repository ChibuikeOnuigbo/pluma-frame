// Chibuike decode worker — image decode + preview downsizing happen OFF the
// main thread so a 12MP screenshot never blocks a drag.
self.onmessage = async (e: MessageEvent) => {
  const { jobId, assetId, blob } = e.data as { jobId: number; assetId: string; blob: Blob };
  try {
    const full = await createImageBitmap(blob);
    let preview: ImageBitmap | null = null;
    const maxSide = Math.max(full.width, full.height);
    if (maxSide > 2048) {
      const s = 2048 / maxSide;
      preview = await createImageBitmap(blob, { resizeWidth: Math.round(full.width * s), resizeHeight: Math.round(full.height * s), resizeQuality: 'medium' });
    }
    (self as unknown as Worker).postMessage(
      { jobId, assetId, ok: true, full, preview, w: full.width, h: full.height },
      [full, ...(preview ? [preview] : [])],
    );
  } catch (err) {
    (self as unknown as Worker).postMessage({ jobId, assetId, ok: false, error: String(err) });
  }
};
