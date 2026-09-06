import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { useEditorStore } from "@/store/editorStore";
import { buildBackgroundStyle, buildShadowStyle } from "@/lib/background";
import { ANIMATION_PRESET_MAP } from "@/lib/animations";
import { WindowChrome } from "./WindowChrome";
import { AssetUploader } from "./AssetUploader";
import { SelectionToolbar } from "./SelectionToolbar";

/**
 * Renders the full mockup at its true pixel dimensions inside a wrapper that's
 * scaled down (via CSS transform) to fit the available viewport — so exports
 * always capture the real, un-scaled canvas.
 */
export const CanvasStage = forwardRef<HTMLDivElement, object>(function CanvasStage(_props, ref) {
  const canvas = useEditorStore((s) => s.canvas);
  const background = useEditorStore((s) => s.background);
  const chromeStyle = useEditorStore((s) => s.chromeStyle);
  const asset = useEditorStore((s) => s.asset);
  const animation = useEditorStore((s) => s.animation);
  const assetSrc = useEditorStore((s) => s.assetSrc);
  const assetSelected = useEditorStore((s) => s.assetSelected);
  const selectAsset = useEditorStore((s) => s.selectAsset);
  const deselectAsset = useEditorStore((s) => s.deselectAsset);
  const setAsset = useEditorStore((s) => s.setAsset);

  const viewportRef = useRef<HTMLDivElement>(null);
  const assetAnimRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const computeScale = () => {
      const padding = 64;
      const availableW = el.clientWidth - padding;
      const availableH = el.clientHeight - padding;
      const next = Math.min(availableW / canvas.width, availableH / canvas.height, 1);
      setScale(Number.isFinite(next) && next > 0 ? next : 1);
    };

    computeScale();
    const observer = new ResizeObserver(computeScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, [canvas.width, canvas.height]);

  const backgroundStyle = buildBackgroundStyle(background);
  const shadowStyle = buildShadowStyle(background.shadow);

  // Drag-to-resize from any corner handle. The asset box is centered inside
  // its wrapper, so growing it in one direction grows both opposing edges —
  // hence the *2 factor when converting a screen-space drag into a %.
  const startResize = (e: React.PointerEvent, signX: -1 | 1, signY: -1 | 1) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidthPct = asset.widthPct;
    const startHeightPct = asset.heightPct;
    const ratio = startHeightPct / startWidthPct;
    const availW = Math.max(1, canvas.width - background.padding * 2);
    const availH = Math.max(1, canvas.height - background.padding * 2);
    const clamp = (v: number) => Math.min(100, Math.max(10, v));

    const onMove = (ev: PointerEvent) => {
      const dxCanvas = (ev.clientX - startX) / scale;
      const dyCanvas = (ev.clientY - startY) / scale;
      const widthDeltaPct = ((signX * dxCanvas * 2) / availW) * 100;
      const heightDeltaPct = ((signY * dyCanvas * 2) / availH) * 100;

      let nextWidthPct = clamp(startWidthPct + widthDeltaPct);
      let nextHeightPct = clamp(startHeightPct + heightDeltaPct);

      if (asset.aspectLocked) {
        if (Math.abs(widthDeltaPct) >= Math.abs(heightDeltaPct)) {
          nextHeightPct = clamp(nextWidthPct * ratio);
        } else {
          nextWidthPct = clamp(nextHeightPct / ratio);
        }
      }

      setAsset({ widthPct: Math.round(nextWidthPct), heightPct: Math.round(nextHeightPct) });
    };

    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  // Drives the entrance/attention animation with GSAP. Re-runs on replay
  // (playToken) and whenever the preset or its timing controls change, so
  // adjusting a slider gives a live preview.
  useEffect(() => {
    const el = assetAnimRef.current;
    const preset = animation.preset ? ANIMATION_PRESET_MAP[animation.preset] : null;

    if (!el) return;
    gsap.killTweensOf(el);

    if (!preset || !assetSrc) {
      gsap.set(el, { clearProps: "all" });
      return;
    }

    gsap.set(el, preset.from);
    const tween = gsap.to(el, {
      ...preset.to,
      duration: animation.duration,
      delay: animation.delay,
      ease: preset.ease ?? "power2.out",
      repeat: preset.continuous || animation.infinite ? -1 : 0,
      yoyo: preset.continuous ?? false,
    });

    return () => {
      tween.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animation.playToken, animation.preset, animation.duration, animation.delay, animation.infinite, assetSrc]);

  return (
    <div
      ref={viewportRef}
      onClick={() => deselectAsset()}
      className="checker-bg relative flex h-full w-full items-center justify-center overflow-hidden"
    >
      <div
        className="relative"
        style={{
          width: canvas.width * scale,
          height: canvas.height * scale,
        }}
      >
        <div
          ref={ref}
          data-pluma-export-root
          style={{
            width: canvas.width,
            height: canvas.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            borderRadius: background.cornerRadius,
          }}
          className="relative flex items-center justify-center overflow-hidden bg-base-900"
        >
          {/* background layer — blur only affects this, never the asset content */}
          <div
            aria-hidden
            style={{
              ...backgroundStyle,
              filter: background.blur > 0 ? `blur(${background.blur}px)` : undefined,
              transform: background.blur > 0 ? "scale(1.08)" : undefined,
            }}
            className="absolute inset-0"
          />
          <div
            style={{ padding: background.padding }}
            className="relative z-10 flex h-full w-full items-center justify-center"
          >
            {/* wrapper: the asset's width/height % are relative to this box */}
            <div className="relative flex h-full w-full items-center justify-center">
              <div
                ref={assetAnimRef}
                data-pluma-asset-anim
                onClick={(e) => {
                  if (assetSrc) {
                    e.stopPropagation();
                    selectAsset();
                  }
                }}
                style={{
                  width: `${asset.widthPct}%`,
                  height: `${asset.heightPct}%`,
                  ...shadowStyle,
                  borderRadius: chromeStyle === "none" ? asset.cornerRadius : undefined,
                  cursor: assetSrc ? "pointer" : undefined,
                }}
              >
                {assetSrc ? (
                  <WindowChrome
                    style={chromeStyle}
                    cornerRadius={asset.cornerRadius}
                    borderWidth={asset.borderWidth}
                    borderColor={asset.borderColor}
                  >
                    <img
                      src={assetSrc}
                      alt="Uploaded asset"
                      className="h-full w-full object-fill"
                      draggable={false}
                    />
                  </WindowChrome>
                ) : (
                  <AssetUploader />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* selection overlay — lives outside the scale() transform so the
            toolbar and handles stay at native size regardless of zoom */}
        {assetSrc && assetSelected && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{ padding: background.padding * scale }}
          >
            <div className="relative flex h-full w-full items-center justify-center">
              <div
                className="pointer-events-auto relative"
                style={{ width: `${asset.widthPct}%`, height: `${asset.heightPct}%` }}
              >
                <div className="absolute inset-0 rounded-[inherit] ring-2 ring-accent-400" />
                {(
                  [
                    { pos: "-top-1.5 -left-1.5", signX: -1, signY: -1, cursor: "nwse-resize" },
                    { pos: "-top-1.5 -right-1.5", signX: 1, signY: -1, cursor: "nesw-resize" },
                    { pos: "-bottom-1.5 -left-1.5", signX: -1, signY: 1, cursor: "nesw-resize" },
                    { pos: "-bottom-1.5 -right-1.5", signX: 1, signY: 1, cursor: "nwse-resize" },
                  ] as const
                ).map(({ pos, signX, signY, cursor }) => (
                  <span
                    key={pos}
                    onPointerDown={(e) => startResize(e, signX, signY)}
                    style={{ cursor }}
                    className={`absolute z-10 h-3.5 w-3.5 touch-none rounded-full border-2 border-accent-400 bg-base-950 hover:scale-125 hover:bg-accent-400 ${pos}`}
                  />
                ))}
                <SelectionToolbar />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
