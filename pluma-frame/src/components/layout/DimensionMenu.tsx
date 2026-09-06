import { useEffect, useRef, useState } from "react";
import { ChevronDown, Ruler } from "lucide-react";
import { useEditorStore } from "@/store/editorStore";
import { CANVAS_PRESETS, CANVAS_PRESET_GROUPS } from "@/store/presets";
import { cn } from "@/lib/utils";

/**
 * Header dropdown for picking the canvas/output dimensions — grouped presets
 * plus a custom width/height field, all in one place at the top of the app
 * instead of buried in the sidebar.
 */
export function DimensionMenu() {
  const canvas = useEditorStore((s) => s.canvas);
  const applyPreset = useEditorStore((s) => s.applyPreset);
  const setCanvasSize = useEditorStore((s) => s.setCanvasSize);

  const [open, setOpen] = useState(false);
  const [customW, setCustomW] = useState(canvas.width);
  const [customH, setCustomH] = useState(canvas.height);
  const menuRef = useRef<HTMLDivElement>(null);

  const activePreset = CANVAS_PRESETS.find((p) => p.id === canvas.presetId);

  const toggleOpen = () => {
    setOpen((v) => {
      const next = !v;
      if (next) {
        // Sync the custom-size draft fields to the current canvas size
        // right when the popover opens (not via an effect on every render).
        setCustomW(canvas.width);
        setCustomH(canvas.height);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close, true);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("pointerdown", close, true);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={toggleOpen}
        className="flex items-center gap-2 rounded-md border border-base-700 bg-base-900 px-2.5 py-1.5 text-xs font-medium text-base-200 transition-colors hover:border-base-600 hover:bg-base-800"
      >
        <Ruler className="h-3.5 w-3.5 text-base-400" />
        <span className="max-w-[140px] truncate">
          {activePreset ? activePreset.label : "Custom size"}
        </span>
        <span className="text-base-500">
          {canvas.width}×{canvas.height}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-base-500 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-11 z-50 w-[320px] overflow-hidden rounded-xl border border-base-700 bg-base-900 shadow-2xl shadow-black/50">
          <div className="max-h-[60vh] space-y-3 overflow-y-auto p-3">
            {CANVAS_PRESET_GROUPS.map((group) => (
              <section key={group} className="space-y-1">
                <p className="px-1 text-[10px] font-semibold uppercase tracking-wider text-base-500">
                  {group}
                </p>
                {CANVAS_PRESETS.filter((p) => p.group === group).map((preset) => {
                  const active = canvas.presetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        applyPreset(preset.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-left text-xs transition-colors",
                        active
                          ? "border-accent-500/60 bg-accent-500/10 text-accent-300"
                          : "border-base-800 bg-base-900 text-base-300 hover:border-base-600"
                      )}
                    >
                      <span className="truncate pr-2">{preset.label}</span>
                      <span className="shrink-0 text-base-500">
                        {preset.width}×{preset.height}
                      </span>
                    </button>
                  );
                })}
              </section>
            ))}
          </div>

          <div className="border-t border-base-800 p-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-base-500">
              Custom size
            </p>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <input
                type="number"
                min={100}
                max={6000}
                value={customW}
                onChange={(e) => setCustomW(Number(e.target.value) || 1)}
                className="w-full rounded-md border border-base-700 bg-base-950 px-2 py-1.5 text-xs text-base-100 outline-none focus:border-accent-500"
              />
              <span className="text-xs text-base-500">×</span>
              <input
                type="number"
                min={100}
                max={6000}
                value={customH}
                onChange={(e) => setCustomH(Number(e.target.value) || 1)}
                className="w-full rounded-md border border-base-700 bg-base-950 px-2 py-1.5 text-xs text-base-100 outline-none focus:border-accent-500"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setCanvasSize(customW, customH);
                setOpen(false);
              }}
              className="mt-2 w-full rounded-md border border-accent-500/60 bg-accent-500/15 px-2 py-1.5 text-xs font-semibold text-accent-300 transition-colors hover:bg-accent-500/25"
            >
              Use custom size
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
