import { CanvasSettingsPanel } from "@/components/panels/CanvasSettingsPanel";
import { AssetStylingPanel } from "@/components/panels/AssetStylingPanel";
import { EffectsAnimationPanel } from "@/components/panels/EffectsAnimationPanel";
import { IconRail } from "./IconRail";
import { useEditorStore } from "@/store/editorStore";

const PANEL_META = {
  background: { title: "Background", subtitle: "Canvas size, gradients, shadow, padding" },
  asset: { title: "Asset", subtitle: "Size, chrome style, radius, border" },
  fx: { title: "Effects", subtitle: "Entrance animation, timing, replay" },
} as const;

export function Sidebar() {
  const activePanel = useEditorStore((s) => s.activePanel);
  const meta = PANEL_META[activePanel];

  return (
    <aside className="flex h-full w-[380px] shrink-0 border-l border-base-800 bg-base-900/60 backdrop-blur">
      <IconRail />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-base-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-base-100">{meta.title}</h2>
          <p className="text-xs text-base-500">{meta.subtitle}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {activePanel === "background" && <CanvasSettingsPanel />}
          {activePanel === "asset" && <AssetStylingPanel />}
          {activePanel === "fx" && <EffectsAnimationPanel />}
        </div>
      </div>
    </aside>
  );
}
