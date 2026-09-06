import { useEditorStore } from "@/store/editorStore";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Lock, Unlock, RefreshCw } from "lucide-react";
import type { ChromeStyle } from "@/types/editor";

const CHROME_OPTIONS: { id: ChromeStyle; label: string; hint: string }[] = [
  { id: "none", label: "None", hint: "Raw asset, no frame" },
  { id: "mac-sleek", label: "macOS Sleek", hint: "Minimal traffic-light bar" },
  { id: "mac-classic", label: "macOS Classic", hint: "Full title bar" },
  { id: "windows-minimal", label: "Windows", hint: "Minimalist window actions" },
  { id: "browser-bar", label: "Browser", hint: "Traffic lights + address bar" },
];

export function AssetStylingPanel() {
  const asset = useEditorStore((s) => s.asset);
  const setAsset = useEditorStore((s) => s.setAsset);
  const chromeStyle = useEditorStore((s) => s.chromeStyle);
  const setChromeStyle = useEditorStore((s) => s.setChromeStyle);
  const assetSrc = useEditorStore((s) => s.assetSrc);
  const assetFileName = useEditorStore((s) => s.assetFileName);
  const setAssetSrc = useEditorStore((s) => s.setAssetSrc);

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <Label>Uploaded asset</Label>
        {assetSrc ? (
          <div className="flex items-center justify-between rounded-lg border border-base-800 bg-base-900 px-3 py-2">
            <span className="truncate text-xs text-base-300">{assetFileName ?? "image"}</span>
            <button
              onClick={() => setAssetSrc(null, null)}
              className="text-[10px] font-medium text-red-400 hover:text-red-300"
            >
              Remove
            </button>
          </div>
        ) : (
          <p className="text-xs text-base-500">Upload an image on the canvas to start styling it.</p>
        )}
      </section>

      <Separator />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Independent sizing</Label>
          <button
            onClick={() => setAsset({ aspectLocked: !asset.aspectLocked })}
            className="flex items-center gap-1.5 rounded-md bg-base-800 px-2 py-1 text-[10px] text-base-200 hover:bg-base-700"
          >
            {asset.aspectLocked ? (
              <>
                <Lock className="h-3 w-3" /> Locked
              </>
            ) : (
              <>
                <Unlock className="h-3 w-3" /> Unlocked
              </>
            )}
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label>Asset width</Label>
            <span className="text-xs text-base-400">{asset.widthPct}%</span>
          </div>
          <Slider
            min={10}
            max={100}
            value={[asset.widthPct]}
            onValueChange={([v]) => setAsset({ widthPct: v })}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label>Asset height</Label>
            <span className="text-xs text-base-400">{asset.heightPct}%</span>
          </div>
          <Slider
            min={10}
            max={100}
            value={[asset.heightPct]}
            onValueChange={([v]) => setAsset({ heightPct: v })}
          />
        </div>

        <button
          onClick={() => setAsset({ widthPct: 90, heightPct: 90 })}
          className="flex items-center gap-1.5 text-[10px] text-base-400 hover:text-base-200"
        >
          <RefreshCw className="h-3 w-3" /> Reset sizing
        </button>
      </section>

      <Separator />

      <section className="space-y-2">
        <Label>Window chrome</Label>
        <div className="grid grid-cols-2 gap-2">
          {CHROME_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setChromeStyle(opt.id)}
              className={`rounded-lg border p-2 text-left transition-colors ${
                chromeStyle === opt.id
                  ? "border-accent-500 bg-accent-500/10"
                  : "border-base-800 bg-base-900 hover:border-base-600"
              }`}
            >
              <div className="text-xs font-medium text-base-100">{opt.label}</div>
              <div className="mt-0.5 text-[10px] text-base-500">{opt.hint}</div>
            </button>
          ))}
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <Label>Corner radius</Label>
            <span className="text-xs text-base-400">{asset.cornerRadius}px</span>
          </div>
          <Slider
            min={0}
            max={60}
            value={[asset.cornerRadius]}
            onValueChange={([v]) => setAsset({ cornerRadius: v })}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label>Border width</Label>
            <span className="text-xs text-base-400">{asset.borderWidth}px</span>
          </div>
          <Slider
            min={0}
            max={20}
            value={[asset.borderWidth]}
            onValueChange={([v]) => setAsset({ borderWidth: v })}
          />
        </div>

        {asset.borderWidth > 0 && (
          <div className="flex items-center justify-between">
            <Label>Border color</Label>
            <input
              type="color"
              value={asset.borderColor}
              onChange={(e) => setAsset({ borderColor: e.target.value })}
              className="h-7 w-7 cursor-pointer rounded-md border border-base-700 bg-transparent p-0"
            />
          </div>
        )}
      </section>
    </div>
  );
}
