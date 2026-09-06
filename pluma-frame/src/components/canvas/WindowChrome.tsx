import type { ChromeStyle } from "@/types/editor";
import { cn } from "@/lib/utils";

interface WindowChromeProps {
  style: ChromeStyle;
  children: React.ReactNode;
  cornerRadius: number;
  borderWidth: number;
  borderColor: string;
}

/**
 * Wraps the user's asset in a "device chrome" — a fake OS window bar.
 * The bar height is baked into the wrapper so the whole chrome (bar + asset)
 * respects the asset's own width/height sizing from the sidebar.
 */
export function WindowChrome({
  style,
  children,
  cornerRadius,
  borderWidth,
  borderColor,
}: WindowChromeProps) {
  const radiusStyle = { borderRadius: `${cornerRadius}px` };
  const borderStyle =
    borderWidth > 0 ? { border: `${borderWidth}px solid ${borderColor}` } : undefined;

  if (style === "none") {
    return (
      <div className="h-full w-full overflow-hidden" style={{ ...radiusStyle, ...borderStyle }}>
        {children}
      </div>
    );
  }

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden bg-[#232228] shadow-2xl"
      style={{ ...radiusStyle, ...borderStyle }}
    >
      <ChromeBar style={style} />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

function ChromeBar({ style }: { style: ChromeStyle }) {
  if (style === "mac-sleek") {
    return (
      <div className="flex h-7 shrink-0 items-center gap-1.5 bg-[#2c2b32] px-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
      </div>
    );
  }

  if (style === "mac-classic") {
    return (
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-black/20 bg-gradient-to-b from-[#e8e8e8] to-[#cfcfcf] px-3">
        <div className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full border border-black/20 bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full border border-black/20 bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full border border-black/20 bg-[#28c840]" />
        </div>
        <div className="h-2 w-24 rounded-full bg-black/10" />
        <div className="w-9" />
      </div>
    );
  }

  if (style === "windows-minimal") {
    return (
      <div className="flex h-8 shrink-0 items-center justify-between bg-[#1f1f1f] px-3">
        <div className="h-2 w-20 rounded-full bg-white/15" />
        <div className="flex items-center gap-4 text-white/70">
          <span className="block h-px w-3 bg-current" />
          <span className="block h-2.5 w-2.5 border border-current" />
          <span className="relative block h-2.5 w-2.5">
            <span className="absolute inset-0 rotate-45 border-t border-current" />
            <span className="absolute inset-0 -rotate-45 border-t border-current" />
          </span>
        </div>
      </div>
    );
  }

  // browser-bar
  return (
    <div className="flex h-9 shrink-0 items-center gap-2 bg-[#33323a] px-3">
      <div className="flex gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
      </div>
      <div
        className={cn(
          "ml-2 flex h-5 flex-1 items-center rounded-md bg-black/25 px-2 text-[10px] text-white/40"
        )}
      >
        pluma://frame
      </div>
    </div>
  );
}
