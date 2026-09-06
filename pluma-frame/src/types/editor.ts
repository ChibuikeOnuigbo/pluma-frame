export type ChromeStyle = "none" | "mac-sleek" | "mac-classic" | "windows-minimal" | "browser-bar";

export type BackgroundType = "solid" | "linear-gradient" | "radial-mesh" | "image";

export interface GradientStop {
  id: string;
  color: string;
  position: number; // 0-100
}

export interface CanvasPreset {
  id: string;
  label: string;
  group: string;
  width: number;
  height: number;
}

export interface BackgroundConfig {
  type: BackgroundType;
  solidColor: string;
  gradientAngle: number; // degrees, used for linear-gradient
  stops: GradientStop[];
  // radial mesh = multiple overlapping radial gradients for a "mesh" look
  meshStops: GradientStop[];
  blur: number; // px, blurs the background layer itself
  padding: number; // px, inner padding between canvas edge and asset wrapper
  shadow: {
    enabled: boolean;
    x: number;
    y: number;
    blur: number;
    spread: number;
    color: string;
    opacity: number;
  };
  cornerRadius: number;
}

export interface AssetTransform {
  widthPct: number; // 10-100, relative to wrapper
  heightPct: number; // 10-100, relative to wrapper
  aspectLocked: boolean;
  cornerRadius: number;
  borderWidth: number;
  borderColor: string;
}

export interface AnimationConfig {
  preset: string | null; // GSAP animation preset id, e.g. "fadeInUp" (see lib/animations.ts)
  duration: number; // seconds
  delay: number; // seconds
  infinite: boolean;
  playToken: number; // bumped to force re-trigger of the animation
}

export interface CanvasConfig {
  width: number;
  height: number;
  presetId: string | null;
}

export type PanelKey = "background" | "asset" | "fx";

export interface EditorState {
  canvas: CanvasConfig;
  background: BackgroundConfig;
  chromeStyle: ChromeStyle;
  asset: AssetTransform;
  animation: AnimationConfig;
  assetSrc: string | null;
  assetFileName: string | null;
  activePanel: PanelKey;
  assetSelected: boolean;
}
