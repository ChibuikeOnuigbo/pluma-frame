// Chibuike job desk — cancellable async work with generation tokens.
// Stale results (user kept typing/dragging) are dropped by token, never applied.

export class ChibuikeJobs {
  private seq = 0;
  private pending = new Map<number, { cancel: () => void }>();
  onChange?: () => void;

  get pendingCount(): number { return this.pending.size; }

  /** Run fn; returns a token. Call cancel(token) to release before completion. */
  run<T>(fn: (isStale: () => boolean) => Promise<T>): { token: number; promise: Promise<T> } {
    const token = ++this.seq;
    let cancelled = false;
    const entry = { cancel: () => { cancelled = true; } };
    this.pending.set(token, entry);
    this.onChange?.();
    const promise = fn(() => cancelled).finally(() => {
      this.pending.delete(token);
      this.onChange?.();
    });
    return { token, promise };
  }

  cancel(token: number): void {
    this.pending.get(token)?.cancel();
    this.pending.delete(token);
  }

  cancelAll(): void {
    for (const [, e] of this.pending) e.cancel();
    this.pending.clear();
    this.onChange?.();
  }
}
