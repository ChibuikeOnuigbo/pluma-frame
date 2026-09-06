import type { BackgroundConfig } from "@/types/editor";
import type { CSSProperties } from "react";

/** Builds the CSS background layer (gradient / mesh / solid) for the canvas. */
export function buildBackgroundStyle(bg: BackgroundConfig): CSSProperties {
  if (bg.type === "solid") {
    return { backgroundColor: bg.solidColor };
  }

  if (bg.type === "linear-gradient") {
    const sorted = [...bg.stops].sort((a, b) => a.position - b.position);
    const stops = sorted.map((s) => `${s.color} ${s.position}%`).join(", ");
    return { backgroundImage: `linear-gradient(${bg.gradientAngle}deg, ${stops})` };
  }

  if (bg.type === "radial-mesh") {
    // Simulate a "mesh" gradient by layering several offset radial gradients.
    const sorted = [...bg.meshStops].sort((a, b) => a.position - b.position);
    const anchors: [number, number][] = [
      [15, 20],
      [85, 25],
      [25, 85],
      [80, 80],
      [50, 50],
    ];
    const layers = sorted.map((stop, i) => {
      const [x, y] = anchors[i % anchors.length];
      return `radial-gradient(circle at ${x}% ${y}%, ${stop.color} 0%, transparent 60%)`;
    });
    return {
      backgroundImage: layers.join(", "),
      backgroundColor: sorted[sorted.length - 1]?.color ?? "#111",
    };
  }

  return {};
}

export function buildShadowStyle(bg: BackgroundConfig["shadow"]): CSSProperties {
  if (!bg.enabled) return {};
  const rgba = hexToRgba(bg.color, bg.opacity);
  return {
    boxShadow: `${bg.x}px ${bg.y}px ${bg.blur}px ${bg.spread}px ${rgba}`,
  };
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const bigint = parseInt(
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean,
    16
  );
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
