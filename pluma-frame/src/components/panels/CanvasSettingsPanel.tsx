import { useEditorStore } from "@/store/editorStore";
import { GRADIENT_PALETTES } from "@/store/presets";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Plus, Trash2 } from "lucide-react";
import type { GradientStop } from "@/types/editor";

export function CanvasSettingsPanel() {
  const background = useEditorStore((s) => s.background);
  const setBackground = useEditorStore((s) => s.setBackground);
  const setShadow = useEditorStore((s) => s.setShadow);
  const addGradientStop = useEditorStore((s) => s.addGradientStop);
  const updateGradientStop = useEditorStore((s) => s.updateGradientStop);
  const removeGradientStop = useEditorStore((s) => s.removeGradientStop);

  const activeStops = background.type === "radial-mesh" ? background.meshStops : background.stops;
  const stopsKey: "stops" | "meshStops" = background.type === "radial-mesh" ? "meshStops" : "stops";

  return (
    <div className="space-y-6">
      <p className="rounded-md border border-base-800 bg-base-900/60 px-2.5 py-2 text-[11px] text-base-500">
        Canvas dimensions moved to the size picker in the header ↑
      </p>

      <section className="space-y-3">
        <Label>Background type</Label>
        <ToggleGroup
          type="single"
          value={background.type}
          onValueChange={(v) => v && setBackground({ type: v as typeof background.type })}
        >
          <ToggleGroupItem value="solid">Solid</ToggleGroupItem>
          <ToggleGroupItem value="linear-gradient">Gradient</ToggleGroupItem>
          <ToggleGroupItem value="radial-mesh">Mesh</ToggleGroupItem>
        </ToggleGroup>

        {background.type === "solid" && (
          <ColorField
            label="Color"
            value={background.solidColor}
            onChange={(v) => setBackground({ solidColor: v })}
          />
        )}

        {background.type !== "solid" && (
          <div className="space-y-3">
            {background.type === "linear-gradient" && (
              <div>
                <div className="flex items-center justify-between">
                  <Label>Angle</Label>
                  <span className="text-xs text-base-400">{background.gradientAngle}°</span>
                </div>
                <Slider
                  min={0}
                  max={360}
                  step={1}
                  value={[background.gradientAngle]}
                  onValueChange={([v]) => setBackground({ gradientAngle: v })}
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{background.type === "radial-mesh" ? "Mesh stops" : "Gradient stops"}</Label>
                <button
                  onClick={() => addGradientStop(stopsKey)}
                  className="flex items-center gap-1 rounded-md bg-base-800 px-2 py-1 text-[10px] text-base-200 hover:bg-base-700"
                >
                  <Plus className="h-3 w-3" /> Stop
                </button>
              </div>
              {activeStops.map((stop) => (
                <GradientStopRow
                  key={stop.id}
                  stop={stop}
                  canRemove={activeStops.length > 2}
                  onChange={(patch) => updateGradientStop(stopsKey, stop.id, patch)}
                  onRemove={() => removeGradientStop(stopsKey, stop.id)}
                />
              ))}
            </div>

            <div className="grid max-h-40 grid-cols-6 gap-2 overflow-y-auto pt-1 pr-1">
              {GRADIENT_PALETTES.map((palette) => (
                <button
                  key={palette.id}
                  title={palette.label}
                  onClick={() => {
                    const stops: GradientStop[] = palette.colors.map((color, i) => ({
                      id: `${palette.id}-${i}`,
                      color,
                      position: palette.colors.length === 1 ? 0 : (i / (palette.colors.length - 1)) * 100,
                    }));
                    setBackground({ [stopsKey]: stops } as Partial<typeof background>);
                  }}
                  className="h-7 w-7 rounded-full border border-white/20 ring-offset-2 ring-offset-base-900 hover:ring-2 hover:ring-accent-400"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${palette.colors.join(", ")})`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <Label>Background blur</Label>
            <span className="text-xs text-base-400">{background.blur}px</span>
          </div>
          <Slider
            min={0}
            max={60}
            value={[background.blur]}
            onValueChange={([v]) => setBackground({ blur: v })}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label>Padding</Label>
            <span className="text-xs text-base-400">{background.padding}px</span>
          </div>
          <Slider
            min={0}
            max={400}
            value={[background.padding]}
            onValueChange={([v]) => setBackground({ padding: v })}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label>Canvas corner radius</Label>
            <span className="text-xs text-base-400">{background.cornerRadius}px</span>
          </div>
          <Slider
            min={0}
            max={120}
            value={[background.cornerRadius]}
            onValueChange={([v]) => setBackground({ cornerRadius: v })}
          />
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Drop shadow</Label>
          <Switch
            checked={background.shadow.enabled}
            onCheckedChange={(v) => setShadow({ enabled: v })}
          />
        </div>

        {background.shadow.enabled && (
          <div className="space-y-3 rounded-lg border border-base-800 p-3">
            <SliderRow
              label="Offset X"
              value={background.shadow.x}
              min={-100}
              max={100}
              onChange={(v) => setShadow({ x: v })}
            />
            <SliderRow
              label="Offset Y"
              value={background.shadow.y}
              min={-100}
              max={100}
              onChange={(v) => setShadow({ y: v })}
            />
            <SliderRow
              label="Blur"
              value={background.shadow.blur}
              min={0}
              max={150}
              onChange={(v) => setShadow({ blur: v })}
            />
            <SliderRow
              label="Spread"
              value={background.shadow.spread}
              min={-50}
              max={50}
              onChange={(v) => setShadow({ spread: v })}
            />
            <SliderRow
              label="Opacity"
              value={Math.round(background.shadow.opacity * 100)}
              min={0}
              max={100}
              onChange={(v) => setShadow({ opacity: v / 100 })}
            />
            <ColorField
              label="Color"
              value={background.shadow.color}
              onChange={(v) => setShadow({ color: v })}
            />
          </div>
        )}
      </section>
    </div>
  );
}

function GradientStopRow({
  stop,
  onChange,
  onRemove,
  canRemove,
}: {
  stop: GradientStop;
  onChange: (patch: Partial<{ color: string; position: number }>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={stop.color}
        onChange={(e) => onChange({ color: e.target.value })}
        className="h-7 w-7 shrink-0 cursor-pointer rounded-md border border-base-700 bg-transparent p-0"
      />
      <Slider
        min={0}
        max={100}
        value={[stop.position]}
        onValueChange={([v]) => onChange({ position: v })}
        className="flex-1"
      />
      <span className="w-8 shrink-0 text-right text-[10px] text-base-400">{stop.position}%</span>
      <button
        onClick={onRemove}
        disabled={!canRemove}
        className="shrink-0 text-base-500 hover:text-red-400 disabled:opacity-30"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-xs text-base-400">{value}</span>
      </div>
      <Slider min={min} max={max} value={[value]} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-7 cursor-pointer rounded-md border border-base-700 bg-transparent p-0"
        />
        <span className="font-mono text-[10px] text-base-400">{value}</span>
      </div>
    </div>
  );
}
