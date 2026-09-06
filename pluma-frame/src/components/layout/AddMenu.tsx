import { useEffect, useRef, useState } from "react";
import { ChevronDown, Clipboard, ImageIcon, Link2, Plus, UploadCloud } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import heroSample from "@/assets/hero.png";

/**
 * Header "Add" button — a single entry point for getting an asset onto the
 * canvas, with a few extra ways in beyond the plain file picker.
 */
export function AddMenu() {
  const setAssetSrc = useEditorStore((s) => s.setAssetSrc);
  const [open, setOpen] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const [showUrlField, setShowUrlField] = useState(false);
  const [clipboardError, setClipboardError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setShowUrlField(false);
        setClipboardError(null);
      }
    };
    document.addEventListener("pointerdown", close, true);
    return () => document.removeEventListener("pointerdown", close, true);
  }, [open]);

  const handleFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setAssetSrc(reader.result, file.name);
    };
    reader.readAsDataURL(file);
    setOpen(false);
  };

  const handlePasteFromClipboard = async () => {
    setClipboardError(null);
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith("image/"));
        if (!type) continue;
        const blob = await item.getType(type);
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") setAssetSrc(reader.result, "pasted-image");
        };
        reader.readAsDataURL(blob);
        setOpen(false);
        return;
      }
      setClipboardError("No image found on your clipboard.");
    } catch {
      setClipboardError("Clipboard access was blocked by the browser.");
    }
  };

  const handleUrlSubmit = () => {
    if (!urlValue.trim()) return;
    setAssetSrc(urlValue.trim(), urlValue.trim().split("/").pop() ?? "image");
    setUrlValue("");
    setShowUrlField(false);
    setOpen(false);
  };

  const handleSample = () => {
    setAssetSrc(heroSample, "sample-image.png");
    setOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md bg-accent-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-600"
      >
        <Plus className="h-3.5 w-3.5" />
        Add
        <ChevronDown className="h-3 w-3 opacity-80" />
      </button>

      {open && (
        <div className="absolute left-0 top-11 z-50 w-[260px] overflow-hidden rounded-xl border border-base-700 bg-base-900 p-1.5 shadow-2xl shadow-black/50">
          <MenuButton icon={UploadCloud} label="Upload image" hint="From your device" onClick={() => inputRef.current?.click()} />
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          <MenuButton icon={Clipboard} label="Paste from clipboard" hint="Copied screenshot or image" onClick={handlePasteFromClipboard} />
          {clipboardError && <p className="px-2.5 pb-1 text-[10px] text-red-400">{clipboardError}</p>}

          <MenuButton
            icon={Link2}
            label="Add from URL"
            hint="Paste an image link"
            onClick={() => setShowUrlField((v) => !v)}
          />
          {showUrlField && (
            <div className="flex items-center gap-1.5 px-2 pb-1.5 pt-1">
              <input
                autoFocus
                type="text"
                placeholder="https://…"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                className="w-full rounded-md border border-base-700 bg-base-950 px-2 py-1 text-xs text-base-100 outline-none focus:border-accent-500"
              />
              <button
                type="button"
                onClick={handleUrlSubmit}
                className="shrink-0 rounded-md bg-accent-500 px-2 py-1 text-[10px] font-semibold text-white hover:bg-accent-600"
              >
                Add
              </button>
            </div>
          )}

          <div className="my-1 h-px bg-base-800" />

          <MenuButton icon={ImageIcon} label="Load sample image" hint="Try it without your own asset" onClick={handleSample} />
        </div>
      )}
    </div>
  );
}

function MenuButton({
  icon: Icon,
  label,
  hint,
  onClick,
}: {
  icon: typeof UploadCloud;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-base-200 transition-colors hover:bg-base-800"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-base-800 text-base-300">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-medium leading-tight">{label}</span>
        <span className="block truncate text-[10px] leading-tight text-base-500">{hint}</span>
      </span>
    </button>
  );
}
