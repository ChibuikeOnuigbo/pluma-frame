import { type RefObject } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/store/editorStore";
import { DimensionMenu } from "./DimensionMenu";
import { AddMenu } from "./AddMenu";
import { ExportMenu } from "./ExportMenu";

export function Topbar({ canvasRef }: { canvasRef: RefObject<HTMLDivElement | null> }) {
  const reset = useEditorStore((s) => s.reset);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-base-800 bg-base-900/80 px-4 backdrop-blur">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 text-sm font-bold text-white">
          P
        </div>
        <h1 className="text-sm font-semibold leading-none text-base-100">PlumaFrame</h1>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-base-800 bg-base-950/40 p-1">
        <DimensionMenu />
        <div className="h-6 w-px bg-base-800" />
        <AddMenu />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </Button>
        <ExportMenu canvasRef={canvasRef} />
      </div>
    </header>
  );
}
