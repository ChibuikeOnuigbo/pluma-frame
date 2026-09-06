import { useRef } from "react";
import { Layers, RefreshCw, SlidersHorizontal, Sparkles, Trash2, X } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import { cn } from "@/lib/utils";

/**
 * The floating toolbar rendered directly above the selected asset, mirroring
 * the "AI Tools / Crop / Highlight / Padding / Blur" bar in the reference —
 * scoped to actions this app actually supports.
 */
export function SelectionToolbar() {
  const activePanel = useEditorStore((s) => s.activePanel);
  const setActivePanel = useEditorStore((s) => s.setActivePanel);
  const setAssetSrc = useEditorStore((s) => s.setAssetSrc);
  const deselectAsset = useEditorStore((s) => s.deselectAsset);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setAssetSrc(reader.result, file.name);
    };
    reader.readAsDataURL(file);
  };

  const items = [
    { key: "background" as const, label: "Background", icon: Layers },
    { key: "asset" as const, label: "Style", icon: SlidersHorizontal },
    { key: "fx" as const, label: "Effects", icon: Sparkles },
  ];

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute -top-11 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-lg border border-base-700 bg-base-900 p-1 text-xs shadow-lg shadow-black/40"
    >
      {items.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => setActivePanel(key)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium text-base-300 transition-colors hover:bg-base-800 hover:text-base-100",
            activePanel === key && "bg-accent-500/15 text-accent-400"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}

      <div className="mx-0.5 h-5 w-px bg-base-700" />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium text-base-300 transition-colors hover:bg-base-800 hover:text-base-100"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Replace
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <button
        type="button"
        onClick={() => setAssetSrc(null)}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-medium text-base-300 transition-colors hover:bg-red-500/15 hover:text-red-400"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        onClick={deselectAsset}
        className="ml-0.5 flex items-center rounded-md p-1.5 text-base-500 transition-colors hover:bg-base-800 hover:text-base-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
