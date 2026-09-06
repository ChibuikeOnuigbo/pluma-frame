import { useEditorStore } from "@/store/editorStore";
import { ANIMATION_GROUPS, ANIMATION_PRESET_MAP } from "@/lib/animations";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Play, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function EffectsAnimationPanel() {
  const animation = useEditorStore((s) => s.animation);
  const setAnimation = useEditorStore((s) => s.setAnimation);
  const replayAnimation = useEditorStore((s) => s.replayAnimation);
  const activePreset = animation.preset ? ANIMATION_PRESET_MAP[animation.preset] : null;
  const isContinuous = activePreset?.continuous ?? false;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Entrance animation</Label>
          {animation.preset && (
            <button
              onClick={() => setAnimation({ preset: null })}
              className="flex items-center gap-1 text-[10px] text-base-400 hover:text-red-400"
            >
              <XCircle className="h-3 w-3" /> Clear
            </button>
          )}
        </div>

        <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
          {ANIMATION_GROUPS.map((group) => (
            <div key={group.group}>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-base-500">
                {group.group}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {group.items.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setAnimation({ preset: id });
                      replayAnimation();
                    }}
                    className={cn(
                      "truncate rounded-md border px-2 py-1.5 text-left text-[11px] transition-colors",
                      animation.preset === id
                        ? "border-accent-500 bg-accent-500/10 text-accent-300"
                        : "border-base-800 bg-base-900 text-base-300 hover:border-base-600"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <Label>Duration</Label>
            <span className="text-xs text-base-400">{animation.duration.toFixed(1)}s</span>
          </div>
          <Slider
            min={0.2}
            max={5}
            step={0.1}
            value={[animation.duration]}
            onValueChange={([v]) => setAnimation({ duration: v })}
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label>Delay</Label>
            <span className="text-xs text-base-400">{animation.delay.toFixed(1)}s</span>
          </div>
          <Slider
            min={0}
            max={3}
            step={0.1}
            value={[animation.delay]}
            onValueChange={([v]) => setAnimation({ delay: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Loop infinitely</Label>
            {isContinuous && <p className="text-[10px] text-base-500">This preset always loops</p>}
          </div>
          <Switch
            checked={isContinuous || animation.infinite}
            disabled={isContinuous}
            onCheckedChange={(v) => setAnimation({ infinite: v })}
          />
        </div>
      </section>

      <Button
        variant="secondary"
        className="w-full"
        disabled={!animation.preset}
        onClick={replayAnimation}
      >
        <Play className="h-3.5 w-3.5" />
        Replay animation
      </Button>
    </div>
  );
}
