/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  PLUMA FRAME NEXT — Chibuike Document Model
 *  Handcrafted by Chibuike. No scene-graph PhD required: one flat object list
 *  per document, z-order = array order (index 0 paints first = bottom).
 *  Every object carries a stable `id` (never identified by array index).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const CHIBUIKE_PROJECT_KIND = 'pluma-frame-next';
export const CHIBUIKE_DOC_VERSION = 1;

export type ChibuikeId = string;

/** Chibuike blend modes — the useful subset, not all 25. */
export type ChibuikeBlend =
  | 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'difference';

export interface ChibuikeShadow {
  x: number; y: number; blur: number; spread: number;
  color: string; opacity: number;
}
export interface ChibuikeBorder { width: number; color: string; }
export interface ChibuikeFilters {
  brightness: number;  // 1 = neutral
  contrast: number;    // 1 = neutral
  saturate: number;    // 1 = neutral
  grayscale: number;   // 0..1
  sepia: number;       // 0..1
  hueRotate: number;   // deg
  blur: number;        // px (source-space)
}
export const chibuikeNeutralFilters = (): ChibuikeFilters =>
  ({ brightness: 1, contrast: 1, saturate: 1, grayscale: 0, sepia: 0, hueRotate: 0, blur: 0 });

export interface ChibuikeAnim {
  preset: ChibuikeAnimPreset;
  duration: number; // seconds
  delay: number;    // seconds
  easing: ChibuikeEase;
  loop: boolean;
}
export type ChibuikeAnimPreset =
  | 'none' | 'fade' | 'slide-up' | 'slide-down' | 'slide-left' | 'slide-right'
  | 'scale' | 'pop' | 'bounce' | 'shake' | 'rotate' | 'blur-in' | 'float' | 'wipe' | 'pulse';
export type ChibuikeEase =
  | 'linear' | 'ease' | 'ease-out' | 'ease-in' | 'ease-in-out'
  | 'spring' | 'bounce-out' | 'back-out';

export interface ChibuikeObjectBase {
  id: ChibuikeId;
  name: string;
  kind: ChibuikeKind;
  x: number; y: number; w: number; h: number; // doc-space bounding box
  rotation: number; // degrees
  opacity: number;  // 0..1
  visible: boolean;
  locked: boolean;
  blend: ChibuikeBlend;
  groupId: ChibuikeId | null;
  anim: ChibuikeAnim | null;
}
export type ChibuikeKind =
  | 'image' | 'text' | 'rect' | 'ellipse' | 'line' | 'arrow' | 'pen'
  | 'blur' | 'spotlight' | 'number' | 'callout' | 'qr' | 'icon'
  | 'mockup' | 'magnify' | 'badge';

export interface ChibuikeImageObject extends ChibuikeObjectBase {
  kind: 'image';
  assetId: ChibuikeId | null;
  fit: 'cover' | 'contain' | 'fill';
  /** Crop stored in source pixel coords — the original asset is never touched. */
  srcRect: { sx: number; sy: number; sw: number; sh: number } | null;
  radius: number;
  border: ChibuikeBorder | null;
  shadow: ChibuikeShadow | null;
  filters: ChibuikeFilters;
  flipX: boolean; flipY: boolean;
  tilt: { rx: number; ry: number } | null; // Chibuike perspective tilt (degrees)
}
export interface ChibuikeTextObject extends ChibuikeObjectBase {
  kind: 'text';
  text: string;
  font: string;       // css font-family
  size: number;       // px
  weight: number;     // 100..900
  color: string;
  align: 'left' | 'center' | 'right';
  lineHeight: number; // multiplier
  letterSpacing: number; // px
  bg: { color: string; padX: number; padY: number; radius: number } | null;
  stroke: { width: number; color: string } | null;
  shadow: ChibuikeShadow | null;
  transform: 'none' | 'upper' | 'lower';
  autoFit: boolean;   // shrink to fit box width
}
export interface ChibuikeShapeObject extends ChibuikeObjectBase {
  kind: 'rect' | 'ellipse';
  fill: string | null;
  stroke: ChibuikeBorder | null;
  radius: number;
  shadow: ChibuikeShadow | null;
}
export interface ChibuikeLineObject extends ChibuikeObjectBase {
  kind: 'line';
  x2: number; y2: number; // absolute doc-space end point
  width: number; color: string;
}
export interface ChibuikeArrowObject extends ChibuikeObjectBase {
  kind: 'arrow';
  x2: number; y2: number;
  width: number; color: string;
  head: number;        // head size multiplier
  curve: number;       // 0 = straight, 0.5 = nice arc
  double: boolean;
  dashed: boolean;
}
export interface ChibuikePenObject extends ChibuikeObjectBase {
  kind: 'pen';
  points: { x: number; y: number }[]; // doc-space
  width: number; color: string;
  alpha: number;       // 1 = marker, 0.35 = highlighter
}
export interface ChibuikeBlurObject extends ChibuikeObjectBase {
  kind: 'blur';
  shape: 'rect' | 'ellipse';
  mode: 'blur' | 'pixelate' | 'solid';
  strength: number;    // px / block size
  feather: number;     // px edge softness
  color: string;       // solid redaction color
}
export interface ChibuikeSpotlightObject extends ChibuikeObjectBase {
  kind: 'spotlight';
  shape: 'rect' | 'ellipse';
  dim: number;         // 0..1 darkness outside
  feather: number;
  ring: { width: number; color: string } | null;
}
export interface ChibuikeNumberObject extends ChibuikeObjectBase {
  kind: 'number';
  n: number;
  style: 'circle' | 'square' | 'pill';
  fill: string; textColor: string; fontSize: number;
  shadow: ChibuikeShadow | null;
}
export interface ChibuikeCalloutObject extends ChibuikeObjectBase {
  kind: 'callout';
  text: string; font: string; fontSize: number; weight: number;
  fill: string; textColor: string; radius: number;
  tail: 'bl' | 'br' | 'tl' | 'tr';
  tailX: number; tailY: number; // doc-space tip
  shadow: ChibuikeShadow | null;
}
export interface ChibuikeQrObject extends ChibuikeObjectBase {
  kind: 'qr';
  data: string;
  dark: string; light: string;
  ec: 'L' | 'M' | 'Q' | 'H';
  quiet: number; // modules of quiet zone
}
export interface ChibuikeIconObject extends ChibuikeObjectBase {
  kind: 'icon';
  path: string;        // svg path data in a 24x24 viewBox
  fill: string;
  stroke: string | null;
  strokeWidth: number;
}
export interface ChibuikeMockupObject extends ChibuikeObjectBase {
  kind: 'mockup';
  device: 'browser' | 'browser-dark' | 'mac' | 'phone' | 'laptop';
  assetId: ChibuikeId | null;
  fit: 'cover' | 'contain';
  radius: number;
  shadow: ChibuikeShadow | null;
  urlText: string;     // browser address bar
  tilt: { rx: number; ry: number } | null;
}
export interface ChibuikeMagnifyObject extends ChibuikeObjectBase {
  kind: 'magnify';
  assetId: ChibuikeId | null;
  srcRect: { sx: number; sy: number; sw: number; sh: number }; // region to magnify (source px)
  zoom: number;
  ring: { width: number; color: string };
  shadow: ChibuikeShadow | null;
}
export interface ChibuikeBadgeObject extends ChibuikeObjectBase {
  kind: 'badge';
  store: 'appstore' | 'gplay' | 'custom';
  top: string; bottom: string;
  fill: string; textColor: string;
  shadow: ChibuikeShadow | null;
}
export type ChibuikeObject =
  | ChibuikeImageObject | ChibuikeTextObject | ChibuikeShapeObject
  | ChibuikeLineObject | ChibuikeArrowObject | ChibuikePenObject
  | ChibuikeBlurObject | ChibuikeSpotlightObject | ChibuikeNumberObject
  | ChibuikeCalloutObject | ChibuikeQrObject | ChibuikeIconObject
  | ChibuikeMockupObject | ChibuikeMagnifyObject | ChibuikeBadgeObject;

/* ── Background ─────────────────────────────────────────────────────────── */

export type ChibuikeBackground =
  | { type: 'solid'; color: string }
  | { type: 'linear'; angle: number; stops: { o: number; color: string }[] }
  | { type: 'radial'; stops: { o: number; color: string }[] }
  | { type: 'mesh'; points: { x: number; y: number; r: number; color: string }[]; softness: number; base: string }
  | { type: 'pattern'; kind: 'dots' | 'grid' | 'diag' | 'noise' | 'cross'; color: string; base: string; scale: number; opacity: number }
  | { type: 'image'; assetId: ChibuikeId | null; fit: 'cover' | 'contain'; blur: number; overlay: { color: string; opacity: number } | null }
  | { type: 'transparent' };

/* ── Document ───────────────────────────────────────────────────────────── */

export interface ChibuikeWatermark {
  text: string; position: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8; // 3x3 grid, 4 = center
  size: number; opacity: number; color: string; margin: number;
}

export interface ChibuikeGuidesSettings { snap: boolean; }

export interface ChibuikeExportSettings {
  format: 'png' | 'jpeg' | 'webp';
  scale: number;
  quality: number;      // 0..1 for jpeg/webp
  transparent: boolean; // png only; overrides bg
}

export interface ChibuikeDoc {
  chibuike: typeof CHIBUIKE_PROJECT_KIND;
  version: number;
  id: ChibuikeId;
  name: string;
  width: number;
  height: number;
  background: ChibuikeBackground;
  objects: ChibuikeObject[];
  watermark: ChibuikeWatermark | null;
  guides: ChibuikeGuidesSettings;
  exportSettings: ChibuikeExportSettings;
  templateId: string | null;
  meta: { createdAt: string; updatedAt: string };
  /** Assets travel with the project (dataURL or asset-store reference). */
  assets: ChibuikeAssetRef[];
}

export interface ChibuikeAssetRef {
  id: ChibuikeId;
  name: string;
  kind: 'image';
  src: string | null;       // dataURL when embedded
  w: number; h: number;
  bytes: number;
  origin: 'local' | 'embedded' | 'remote';
  remoteUrl?: string;
}

export interface ChibuikeProjectFile {
  chibuike: typeof CHIBUIKE_PROJECT_KIND;
  plumaProjectVersion: number;
  doc: ChibuikeDoc;
  assetBlobs?: Record<ChibuikeId, string>;
}
