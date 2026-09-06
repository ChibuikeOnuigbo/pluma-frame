import { useCallback, useRef, useState } from "react";
import { ImagePlus, UploadCloud } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import { cn } from "@/lib/utils";

/** Empty-state dropzone shown inside the canvas before any asset is uploaded. */
export function AssetUploader() {
  const setAssetSrc = useEditorStore((s) => s.setAssetSrc);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const readFile = useCallback(
    (file: File | undefined) => {
      if (!file || !file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setAssetSrc(reader.result, file.name);
        }
      };
      reader.readAsDataURL(file);
    },
    [setAssetSrc]
  );

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors",
        isDragging ? "border-accent-400 bg-accent-500/10" : "border-white/20 bg-black/10"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        readFile(e.dataTransfer.files?.[0]);
      }}
    >
      <div className="rounded-full bg-white/10 p-4">
        <ImagePlus className="h-7 w-7 text-white/70" />
      </div>
      <div>
        <p className="text-sm font-medium text-white/90">Drop an image or screenshot</p>
        <p className="mt-1 text-xs text-white/50">PNG, JPG, or WebP</p>
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-1 inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-xs font-medium text-white hover:bg-white/20"
      >
        <UploadCloud className="h-3.5 w-3.5" />
        Browse files
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => readFile(e.target.files?.[0])}
      />
    </div>
  );
}
