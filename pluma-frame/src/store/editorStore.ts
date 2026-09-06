import { create } from "zustand";
import type {
  AnimationConfig,
  AssetTransform,
  BackgroundConfig,
  ChromeStyle,
  EditorState,
  PanelKey,
} from "@/types/editor";
import { CANVAS_PRESETS } from "./presets";
import { uid } from "@/lib/utils";

const defaultPreset = CANVAS_PRESETS[0];

const defaultBackground: BackgroundConfig = {
  type: "linear-gradient",
  solidColor: "#1c1c22",
  gradientAngle: 135,
  stops: [
    { id: uid(), color: "#6366f1", position: 0 },
    { id: uid(), color: "#a855f7", position: 50 },
    { id: uid(), color: "#ec4899", position: 100 },
  ],
  meshStops: [
    { id: uid(), color: "#6366f1", position: 20 },
    { id: uid(), color: "#22d3ee", position: 70 },
    { id: uid(), color: "#ec4899", position: 100 },
  ],
  blur: 0,
  padding: 80,
  shadow: {
    enabled: true,
    x: 0,
    y: 30,
    blur: 60,
    spread: -10,
    color: "#000000",
    opacity: 0.45,
  },
  cornerRadius: 24,
};

const defaultAsset: AssetTransform = {
  widthPct: 90,
  heightPct: 90,
  aspectLocked: true,
  cornerRadius: 10,
  borderWidth: 0,
  borderColor: "#ffffff",
};

const defaultAnimation: AnimationConfig = {
  preset: null,
  duration: 1,
  delay: 0,
  infinite: false,
  playToken: 0,
};

interface EditorActions {
  setCanvasSize: (width: number, height: number) => void;
  applyPreset: (presetId: string) => void;
  setBackground: (patch: Partial<BackgroundConfig>) => void;
  setShadow: (patch: Partial<BackgroundConfig["shadow"]>) => void;
  addGradientStop: (target: "stops" | "meshStops") => void;
  updateGradientStop: (
    target: "stops" | "meshStops",
    id: string,
    patch: Partial<{ color: string; position: number }>
  ) => void;
  removeGradientStop: (target: "stops" | "meshStops", id: string) => void;
  setChromeStyle: (style: ChromeStyle) => void;
  setAsset: (patch: Partial<AssetTransform>) => void;
  setAnimation: (patch: Partial<AnimationConfig>) => void;
  replayAnimation: () => void;
  setAssetSrc: (src: string | null, fileName?: string | null) => void;
  setActivePanel: (panel: PanelKey) => void;
  selectAsset: () => void;
  deselectAsset: () => void;
  reset: () => void;
}

const initialState: EditorState = {
  canvas: { width: defaultPreset.width, height: defaultPreset.height, presetId: defaultPreset.id },
  background: defaultBackground,
  chromeStyle: "mac-sleek",
  asset: defaultAsset,
  animation: defaultAnimation,
  assetSrc: null,
  assetFileName: null,
  activePanel: "background",
  assetSelected: false,
};

export const useEditorStore = create<EditorState & EditorActions>((set) => ({
  ...initialState,

  setCanvasSize: (width, height) =>
    set((s) => ({ canvas: { ...s.canvas, width, height, presetId: null } })),

  applyPreset: (presetId) => {
    const preset = CANVAS_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    set({ canvas: { width: preset.width, height: preset.height, presetId: preset.id } });
  },

  setBackground: (patch) => set((s) => ({ background: { ...s.background, ...patch } })),

  setShadow: (patch) =>
    set((s) => ({ background: { ...s.background, shadow: { ...s.background.shadow, ...patch } } })),

  addGradientStop: (target) =>
    set((s) => {
      const list = s.background[target];
      const nextPos = list.length ? Math.min(100, list[list.length - 1].position + 15) : 50;
      return {
        background: {
          ...s.background,
          [target]: [...list, { id: uid(), color: "#ffffff", position: nextPos }],
        },
      };
    }),

  updateGradientStop: (target, id, patch) =>
    set((s) => ({
      background: {
        ...s.background,
        [target]: s.background[target].map((stop) =>
          stop.id === id ? { ...stop, ...patch } : stop
        ),
      },
    })),

  removeGradientStop: (target, id) =>
    set((s) => ({
      background: {
        ...s.background,
        [target]: s.background[target].filter((stop) => stop.id !== id),
      },
    })),

  setChromeStyle: (chromeStyle) => set({ chromeStyle }),

  setAsset: (patch) =>
    set((s) => {
      const next = { ...s.asset, ...patch };
      // When aspect is locked and one dimension changes, mirror it to the other.
      if (next.aspectLocked) {
        if (patch.widthPct !== undefined && patch.heightPct === undefined) {
          next.heightPct = patch.widthPct;
        } else if (patch.heightPct !== undefined && patch.widthPct === undefined) {
          next.widthPct = patch.heightPct;
        }
      }
      return { asset: next };
    }),

  setAnimation: (patch) => set((s) => ({ animation: { ...s.animation, ...patch } })),

  replayAnimation: () =>
    set((s) => ({ animation: { ...s.animation, playToken: s.animation.playToken + 1 } })),

  setAssetSrc: (src, fileName = null) =>
    set({ assetSrc: src, assetFileName: fileName, assetSelected: !!src }),

  setActivePanel: (activePanel) => set({ activePanel }),

  selectAsset: () => set({ assetSelected: true }),

  deselectAsset: () => set({ assetSelected: false }),

  reset: () => set(initialState),
}));
