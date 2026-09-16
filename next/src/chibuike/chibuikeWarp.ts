/**
 * Chibuike warp — perspective tilt for screenshots via strip projection.
 * A per-pixel homography needs WebGL; for marketing tilt (≤ ~35°) strip
 * projection is visually indistinguishable, runs on the plain 2D canvas
 * everywhere, and is deterministic at export time. Chibuike's signature trick.
 *
 * rotateY → vertical strips whose height and x-spacing shrink with depth.
 * rotateX → horizontal strips whose width and y-spacing shrink with depth.
 */
import { ChibuikePt } from './chibuikeGeom';

export interface ChibuikeTilt { rx: number; ry: number; }

const CHIBUIKE_TILT_MAX = 40;
const CHIBUIKE_CAM_D = 3.4; // camera distance in plane-widths — higher = flatter look

export function chibuikeClampTilt(t: ChibuikeTilt): ChibuikeTilt {
  return {
    rx: Math.max(-CHIBUIKE_TILT_MAX, Math.min(CHIBUIKE_TILT_MAX, t.rx || 0)),
    ry: Math.max(-CHIBUIKE_TILT_MAX, Math.min(CHIBUIKE_TILT_MAX, t.ry || 0)),
  };
}

/** scale of a point at fraction f (−0.5..0.5) across the tilt axis. */
function chibuikePerspScale(f: number, rad: number): number {
  const z = Math.sin(rad) * f;
  return CHIBUIKE_CAM_D / (CHIBUIKE_CAM_D + z);
}

export function chibuikeHasTilt(t: ChibuikeTilt | null | undefined): boolean {
  return !!t && (!!t.rx || !!t.ry);
}

function slicePass(src: CanvasImageSource, sw: number, sh: number, deg: number, axis: 'h' | 'v'): HTMLCanvasElement {
  const N = 36;
  const out = document.createElement('canvas');
  out.width = Math.max(1, sw); out.height = Math.max(1, sh);
  const octx = out.getContext('2d')!;
  const rad = (deg * Math.PI) / 180;
  for (let i = 0; i < N; i++) {
    const f = (i + 0.5) / N - 0.5;      // −0.5..0.5 across the axis
    const s = chibuikePerspScale(f, rad);
    const ov = 1.5;                      // overlap to hide hairline seams
    if (axis === 'v') {
      const sWidth = sw / N + ov;
      const sx = i * (sw / N);
      const dw = sWidth * s;
      const dh = sh * s;
      const dx = (f * sw) * s + sw / 2 - dw / 2;
      const dy = (sh - dh) / 2;
      octx.drawImage(src, sx, 0, sWidth, sh, dx, dy, dw, dh);
    } else {
      const sHeight = sh / N + ov;
      const sy = i * (sh / N);
      const dh = sHeight * s;
      const dw = sw * s;
      const dy = (f * sh) * s + sh / 2 - dh / 2;
      const dx = (sw - dw) / 2;
      octx.drawImage(src, 0, sy, sw, sHeight, dx, dy, dw, dh);
    }
  }
  return out;
}

/** Render src tilted into ctx at (x,y,w,h). Returns silhouette quad in doc space. */
export function chibuikeDrawWarped(
  ctx: CanvasRenderingContext2D,
  src: CanvasImageSource, sw: number, sh: number,
  x: number, y: number, w: number, h: number,
  tilt: ChibuikeTilt | null,
): ChibuikePt[] {
  const t = tilt ? chibuikeClampTilt(tilt) : null;
  if (!t || (!t.rx && !t.ry)) {
    ctx.drawImage(src, x, y, w, h);
    return [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
  }
  let stage: CanvasImageSource = src;
  if (t.rx) stage = slicePass(stage, sw, sh, t.rx, 'h');
  if (t.ry) stage = slicePass(stage, sw, sh, t.ry, 'v');
  ctx.drawImage(stage, x, y, w, h);
  return chibuikeTiltQuad(t, x, y, w, h);
}

/** Outer silhouette quad of a tilted rect (drives shadow, border, selection). */
export function chibuikeTiltQuad(t: ChibuikeTilt, x: number, y: number, w: number, h: number): ChibuikePt[] {
  const t2 = chibuikeClampTilt(t);
  const radX = (t2.rx * Math.PI) / 180;
  const radY = (t2.ry * Math.PI) / 180;
  const sL = chibuikePerspScale(-0.5, radY), sR = chibuikePerspScale(0.5, radY);
  const sT = chibuikePerspScale(-0.5, radX), sB = chibuikePerspScale(0.5, radX);
  const cx = x + w / 2, cy = y + h / 2;
  const hw = w / 2, hh = h / 2;
  return [
    { x: cx - hw * sL, y: cy - hh * sT }, // tl
    { x: cx + hw * sR, y: cy - hh * sT }, // tr
    { x: cx + hw * sR, y: cy + hh * sB }, // br
    { x: cx - hw * sL, y: cy + hh * sB }, // bl
  ];
}

