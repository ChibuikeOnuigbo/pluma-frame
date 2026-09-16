// Chibuike history — command-grade undo/redo with transaction merging.
// One drag = one entry. Snapshots are structural JSON clones; cheap at this
// document scale and bulletproof against partial-mutation bugs.

import { ChibuikeDoc } from './chibuikeTypes';

export interface ChibuikeHistoryEntry {
  label: string;
  doc: ChibuikeDoc; // snapshot AFTER the change
  at: number;
}

const CHIBUIKE_COALESCE_MS = 750; // rapid same-label edits merge into one undo step
const CHIBUIKE_MAX_HISTORY = 80;

export class ChibuikeHistory {
  private past: ChibuikeHistoryEntry[] = [];
  private future: ChibuikeHistoryEntry[] = [];
  private current: ChibuikeDoc;
  private pending: { label: string; before: ChibuikeDoc } | null = null;
  private depth = 0;
  onDirty?: () => void;

  constructor(initial: ChibuikeDoc) {
    this.current = initial;
  }

  /** Begin a transaction. Nested calls only deepen; the outermost snapshot wins. */
  begin(label: string): void {
    this.depth++;
    if (this.pending) return;
    this.pending = { label, before: JSON.parse(JSON.stringify(this.current)) };
  }

  /** Live mutation target during a transaction (callers mutate, then commit). */
  liveDoc(): ChibuikeDoc {
    return this.current;
  }

  commit(): void {
    if (this.depth > 0) this.depth--;
    if (this.depth > 0 || !this.pending) return; // nested commit → outer transaction continues
    const { label, before } = this.pending;
    this.pending = null;
    const changed = JSON.stringify(before) !== JSON.stringify(this.current);
    if (!changed) return; // a no-op drag must not pollute undo
    // Coalesce rapid same-label edits (typing bursts, slider drags) into ONE
    // undo step — a ⌘Z should undo the word, not the last keystroke.
    const last = this.past[this.past.length - 1];
    if (last && last.label === label && Date.now() - last.at < CHIBUIKE_COALESCE_MS) {
      last.at = Date.now();
      this.future = [];
      this.onDirty?.();
      return;
    }
    this.past.push({ label, doc: before, at: Date.now() });
    if (this.past.length > CHIBUIKE_MAX_HISTORY) this.past.shift();
    this.future = [];
    this.onDirty?.();
  }

  cancel(): void {
    this.depth = 0;
    if (!this.pending) return;
    this.current = this.pending.before;
    this.pending = null;
  }

  canUndo(): boolean { return this.past.length > 0; }
  canRedo(): boolean { return this.future.length > 0; }

  undo(): ChibuikeDoc | null {
    if (!this.past.length) return null;
    const entry = this.past.pop()!;
    this.future.push({ label: entry.label, doc: JSON.parse(JSON.stringify(this.current)), at: Date.now() });
    this.current = entry.doc;
    this.onDirty?.();
    return this.current;
  }

  redo(): ChibuikeDoc | null {
    if (!this.future.length) return null;
    const entry = this.future.pop()!;
    this.past.push({ label: entry.label, doc: JSON.parse(JSON.stringify(this.current)), at: Date.now() });
    this.current = entry.doc;
    this.onDirty?.();
    return this.current;
  }

  /** Replace everything (load project / apply template) without a way back. */
  reset(doc: ChibuikeDoc): void {
    this.current = doc;
    this.past = [];
    this.future = [];
    this.onDirty?.();
  }

  undoLabel(): string | null { return this.past.length ? this.past[this.past.length - 1].label : null; }
  redoLabel(): string | null { return this.future.length ? this.future[this.future.length - 1].label : null; }
}
