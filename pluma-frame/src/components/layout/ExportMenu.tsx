import { useEffect, useRef, useState, type RefObject } from "react";
import { ChevronDown, Download, FileVideo, ImageDown, Loader2 } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import { exportNodeAsGif, exportNodeAsPng, exportNodeAsVideo } from "@/lib/exportImage";
import { cn } from "@/lib/utils";

type Format = "png" | "gif" | "video";

export function ExportMenu({ canvasRef }: { canvasRef: RefObject<HTMLDivElement | null> }) {
  const assetSrc = useEditorStore((s) => s.assetSrc);
  const animation = useEditorStore((s) => s.animation);
  const hasAnimation = !!animation.preset;

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<Format | null>(null);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close, true);
    return () => document.removeEventListener("pointerdown", close, true);
  }, [open]);

  const run = async (format: Format) => {
    if (!canvasRef.current) return;
    setBusy(format);
    setError(null);
    try {
      if (format === "png") {
        await exportNodeAsPng(canvasRef.current, "plumaframe-export.png");
      } else if (format === "gif") {
        await exportNodeAsGif(canvasRef.current, "plumaframe-export.gif", animation);
      } else {
        await exportNodeAsVideo(canvasRef.current, "plumaframe-export.mp4", animation);
      }
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed — try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={!assetSrc}
        className="flex items-center gap-1.5 rounded-md bg-base-100 px-3 py-1.5 text-xs font-semibold text-base-950 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        Export
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-[260px] overflow-hidden rounded-xl border border-base-700 bg-base-900 p-1.5 shadow-2xl shadow-black/50">
          <ExportOption
            icon={ImageDown}
            label="PNG image"
            hint="Full-resolution still frame"
            busy={busy === "png"}
            disabled={!!busy}
            onClick={() => run("png")}
          />
          <ExportOption
            icon={FileVideo}
            label="Animated GIF"
            hint={hasAnimation ? "Loops the entrance animation" : "Set an effect in Effects first"}
            busy={busy === "gif"}
            disabled={!!busy || !hasAnimation}
            onClick={() => run("gif")}
          />
          <ExportOption
            icon={FileVideo}
            label="Video (MP4/WebM)"
            hint={hasAnimation ? "Same motion, smaller file" : "Set an effect in Effects first"}
            busy={busy === "video"}
            disabled={!!busy || !hasAnimation}
            onClick={() => run("video")}
          />
          {error && <p className="px-2.5 pt-1 text-[10px] text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}

function ExportOption({
  icon: Icon,
  label,
  hint,
  busy,
  disabled,
  onClick,
}: {
  icon: typeof ImageDown;
  label: string;
  hint: string;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-base-200 transition-colors hover:bg-base-800 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-base-800 text-base-300">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-medium leading-tight">{label}</span>
        <span className="block truncate text-[10px] leading-tight text-base-500">{hint}</span>
      </span>
    </button>
  );
}
