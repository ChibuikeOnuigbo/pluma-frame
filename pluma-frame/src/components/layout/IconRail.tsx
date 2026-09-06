import { useRef } from "react";
import { Layers, SlidersHorizontal, Sparkles, UploadCloud } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import type { PanelKey } from "@/types/editor";
import { cn } from "@/lib/utils";

interface RailItem {
  key: PanelKey;
  label: string;
  icon: typeof Layers;
}

const RAIL_ITEMS: RailItem[] = [
  { key: "background", label: "Background", icon: Layers },
  { key: "asset", label: "Asset", icon: SlidersHorizontal },
  { key: "fx", label: "Effects", icon: Sparkles },
];

/**
 * Thin vertical icon rail that switches the panel shown next to it.
 * Also hosts the "Upload" action, which doesn't open a panel — it just
 * replaces the current asset image, same as the reference's Uploads icon.
 */
export function IconRail() {
  const activePanel = useEditorStore((s) => s.activePanel);
  const setActivePanel = useEditorStore((s) => s.setActivePanel);
  const setAssetSrc = useEditorStore((s) => s.setAssetSrc);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setAssetSrc(reader.result, file.name);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex h-full w-[68px] shrink-0 flex-col items-center gap-1 border-r border-base-800 bg-base-950/60 py-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group flex w-14 flex-col items-center gap-1 rounded-lg px-1 py-2 text-base-400 transition-colors hover:bg-base-800 hover:text-base-100"
      >
        <UploadCloud className="h-4 w-4" />
        <span className="text-[10px] font-medium leading-none">Upload</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <div className="my-1 h-px w-8 bg-base-800" />

      {RAIL_ITEMS.map(({ key, label, icon: Icon }) => {
        const active = activePanel === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => setActivePanel(key)}
            className={cn(
              "flex w-14 flex-col items-center gap-1 rounded-lg px-1 py-2 text-base-400 transition-colors hover:bg-base-800 hover:text-base-100",
              active && "bg-accent-500/15 text-accent-400 hover:bg-accent-500/15 hover:text-accent-400"
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="text-[10px] font-medium leading-none">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
