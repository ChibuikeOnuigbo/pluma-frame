// Chibuike type shop — font stacks, measurement and wrapping.
// System stacks only: zero font downloads, zero FOUT, deterministic export.
export const CHIBUIKE_FONTS: { id: string; label: string; stack: string }[] = [
  { id: 'var-chibuike-sans', label: 'System Sans', stack: '-apple-system, "Segoe UI", Inter, Roboto, "Helvetica Neue", Arial, sans-serif' },
  { id: 'var-chibuike-serif', label: 'Serif', stack: 'Georgia, "Times New Roman", serif' },
  { id: 'var-chibuike-mono', label: 'Mono', stack: 'ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace' },
  { id: 'var-chibuike-round', label: 'Rounded', stack: 'ui-rounded, "Hiragino Maru Gothic ProN", Quicksand, Comfortaa, Manjari, "Arial Rounded MT", "Arial Rounded MT Bold", sans-serif' },
];
export function chibuikeFontStack(id: string): string {
  return CHIBUIKE_FONTS.find(f => f.id === id)?.stack ?? id;
}

export interface ChibuikeTextStyle {
  font: string; size: number; weight: number; letterSpacing: number; lineHeight: number;
}

export function chibuikeFontCss(style: ChibuikeTextStyle): string {
  return `${style.weight} ${style.size}px ${chibuikeFontStack(style.font)}`;
}

export function chibuikeMeasureLine(ctx: CanvasRenderingContext2D, text: string, style: ChibuikeTextStyle): number {
  ctx.font = chibuikeFontCss(style);
  // letterSpacing via ctx.letterSpacing (Chromium/Safari 17+); fallback manual
  const anyCtx = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  const had = anyCtx.letterSpacing;
  if (style.letterSpacing) anyCtx.letterSpacing = `${style.letterSpacing}px`;
  const w = ctx.measureText(text).width;
  if (had !== undefined) anyCtx.letterSpacing = had ?? '0px';
  return w;
}

export function chibuikeWrapText(ctx: CanvasRenderingContext2D, text: string, style: ChibuikeTextStyle, maxW: number): string[] {
  const out: string[] = [];
  for (const rawLine of text.split('\n')) {
    const words = rawLine.split(' ');
    let line = '';
    for (const w of words) {
      const probe = line ? `${line} ${w}` : w;
      if (chibuikeMeasureLine(ctx, probe, style) > maxW && line) {
        out.push(line); line = w;
      } else line = probe;
    }
    out.push(line);
  }
  return out;
}

/** Auto-fit: shrink size until the longest line fits the box (never overflow silently). */
export function chibuikeFitSize(ctx: CanvasRenderingContext2D, text: string, style: ChibuikeTextStyle, boxW: number, minSize = 8): number {
  let size = style.size;
  for (; size > minSize; size -= 1) {
    const lines = chibuikeWrapText(ctx, text, { ...style, size }, boxW);
    const longest = Math.max(...lines.map(l => chibuikeMeasureLine(ctx, l, { ...style, size })));
    if (longest <= boxW) break;
  }
  return size;
}
