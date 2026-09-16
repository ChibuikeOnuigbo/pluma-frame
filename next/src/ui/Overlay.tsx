/**
 * Chibuike overlay primitives — anchored popovers, custom select, menus.
 * Close on outside click and Escape, stay inside the viewport, animate in.
 */
import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';

export function useChibuikePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('keydown', onKey, true);
    return () => { window.removeEventListener('pointerdown', onDown, true); window.removeEventListener('keydown', onKey, true); };
  }, [open]);
  return { open, setOpen, ref };
}

interface PopoverProps {
  open: boolean;
  onClose: () => void;
  anchor: 'left' | 'right' | 'center';
  children: ReactNode;
  width?: number;
  className?: string;
}

/** Renders panel content anchored under a relative parent. */
export function ChibuikePopover({ open, onClose, anchor, children, width, className }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ visibility: 'hidden' });
  useLayoutEffect(() => {
    if (!open || !ref.current) return;
    const parent = ref.current.parentElement!;
    const pr = parent.getBoundingClientRect();
    const w = ref.current.offsetWidth;
    let left = 0;
    if (anchor === 'right') left = pr.width - w;
    else if (anchor === 'center') left = (pr.width - w) / 2;
    // keep inside viewport
    const absLeft = pr.left + left;
    if (absLeft < 8) left += 8 - absLeft;
    if (absLeft + w > innerWidth - 8) left -= absLeft + w - (innerWidth - 8);
    setStyle({ visibility: 'visible', left, animation: 'pf-pop-in .13s ease' });
  }, [open, anchor]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('pointerdown', onDown, true);
    window.addEventListener('keydown', onKey, true);
    return () => { window.removeEventListener('pointerdown', onDown, true); window.removeEventListener('keydown', onKey, true); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div ref={ref} className={`pf-pop ${className ?? ''}`} style={{ top: 'calc(100% + 6px)', ...style }} role="menu">
      {children}
    </div>
  );
}

export function MenuItem({ icon, children, onClick, hint, danger, active }: {
  icon?: ReactNode; children: ReactNode; onClick?: () => void; hint?: string; danger?: boolean; active?: boolean;
}) {
  return (
    <button className={`pf-menu-item${danger ? ' danger' : ''}${active ? ' active' : ''}`} onClick={onClick} role="menuitem">
      {icon && <span className="pf-menu-ic">{icon}</span>}
      <span className="pf-menu-label">{children}</span>
      {hint && <kbd className="sc">{hint}</kbd>}
      {active && <span className="pf-menu-check"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg></span>}
    </button>
  );
}

export function MenuDivider() {
  return <div className="pf-menu-divider" />;
}

/** Custom select — styled listbox popover, never a raw OS dropdown. */
export function Select<T extends string>({ value, options, onChange, label, width }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label?: string; width?: number;
}) {
  const { open, setOpen, ref } = useChibuikePopover();
  const current = options.find(o => o.value === value);
  return (
    <div className="pf-select" ref={ref} style={width ? { width } : undefined}>
      <button
        type="button" className={`pf-select-btn${open ? ' open' : ''}`}
        aria-label={label} aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="pf-select-value">{current?.label ?? value}</span>
        <svg className={`pf-select-caret${open ? ' flip' : ''}`} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="pf-select-list" role="listbox" style={{ animation: 'pf-pop-in .12s ease' }}>
          {options.map(o => (
            <button key={o.value} type="button" role="option" aria-selected={o.value === value}
              className={`pf-select-opt${o.value === value ? ' sel' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false); }}>
              <span>{o.label}</span>
              {o.value === value && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Responsive flag hook (matchMedia). */
export function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(() => typeof matchMedia !== 'undefined' && matchMedia(query).matches);
  useEffect(() => {
    const mq = matchMedia(query);
    const on = () => setMatch(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return match;
}
