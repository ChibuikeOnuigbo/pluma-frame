/**
 * Chibuike color picker — a custom popover with a complex curated palette
 * (neutrals through vivid to pastel, multi hue), an opacity slider and a hex
 * field. No native color control anywhere; swatches give one tap access to
 * colors that actually work on screenshots.
 */
import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { ChibuikePopover, useChibuikePopover } from './Overlay';
import { chibuikeParseCssColor, chibuikeRgbToHex } from '../chibuike/chibuikeColor';

/** Complex palette, grouped by intent. First of each row is the anchor. */
export const CHIBUIKE_PALETTE: { group: string; colors: string[] }[] = [
  { group: 'Paper', colors: ['#ffffff', '#f4f5fa', '#e8eaf2', '#c9cede', '#a6adc2', '#6b7288', '#3a4158', '#23283a', '#14161d', '#0b0d12'] },
  { group: 'Violet', colors: ['#f0ebff', '#d4c7ff', '#b39dff', '#9d85ff', '#7c5cff', '#5b3df5', '#4530c4', '#31218f', '#23134d'] },
  { group: 'Blue', colors: ['#e3f2ff', '#a8d4ff', '#7fb2ff', '#4cc2ff', '#2196f3', '#1565c0', '#0e4a94', '#0b2e5e'] },
  { group: 'Teal', colors: ['#d7fff9', '#8ff2e4', '#00d4c8', '#00a896', '#02735e', '#043f33'] },
  { group: 'Green', colors: ['#e2f9ec', '#a9edc8', '#3fda8c', '#22b573', '#0f7b4f', '#0a3d2a'] },
  { group: 'Amber', colors: ['#fff3d6', '#ffe08f', '#ffc247', '#ff9f1c', '#e2711d', '#7a3b06'] },
  { group: 'Red', colors: ['#ffe5e9', '#ffb3be', '#ff5d73', '#ff2e54', '#c9184a', '#7a0c2e'] },
  { group: 'Pink', colors: ['#ffe0f6', '#ff9fe8', '#ff5fd2', '#b5179e', '#7209b7', '#3c096c'] },
];

interface Props {
  value: string;               // any css color (hex, 8 digit hex, rgba)
  onChange: (v: string) => void;
  label: string;
}

export function ChibuikeColorPicker({ value, onChange, label }: Props) {
  const { open, setOpen, ref } = useChibuikePopover();
  const parsed = chibuikeParseCssColor(value || '#ffffff');
  const [hex, setHex] = useState(chibuikeRgbToHex(parsed.r, parsed.g, parsed.b));
  const [alpha, setAlpha] = useState(parsed.a);

  useEffect(() => {
    const p = chibuikeParseCssColor(value || '#ffffff');
    setHex(chibuikeRgbToHex(p.r, p.g, p.b));
    setAlpha(p.a);
  }, [value]);

  const emit = (h: string, a: number) => {
    setHex(h); setAlpha(a);
    onChange(a >= 1 ? h : `rgba(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)},${Math.round(a * 100) / 100})`);
  };

  return (
    <div className="pf-colorpick" ref={ref}>
      <button
        className="pf-swatch" aria-label={label} title={`${label}: ${value}`}
        style={{ background: value || '#ffffff' }}
        onClick={() => setOpen(!open)}
      >
        <span className="pf-swatch-checker" aria-hidden />
      </button>
      <ChibuikePopover open={open} onClose={() => setOpen(false)} anchor="left" width={236}>
        <div className="pf-pal-head">
          <span className="pf-pop-title" style={{ padding: 0 }}>{label}</span>
          <span className="pf-tiny pf-muted">{Math.round(alpha * 100)}%</span>
        </div>
        {CHIBUIKE_PALETTE.map(group => (
          <div key={group.group} className="pf-pal-group">
            <div className="pf-pal-group-name">{group.group}</div>
            <div className="pf-pal-grid">
              {group.colors.map(c => (
                <button
                  key={c} className={`pf-pal-swatch${hex.toLowerCase() === c.toLowerCase() ? ' on' : ''}`}
                  style={{ background: c }} title={c} aria-label={c}
                  onClick={() => emit(c, alpha)}
                />
              ))}
            </div>
          </div>
        ))}
        <div className="pf-row" style={{ marginTop: 8 }}>
          <span className="pf-swatch" style={{ background: value || '#ffffff' }} aria-hidden />
          <input
            className="grow" type="text" value={hex} aria-label="Hex color" spellCheck={false}
            onChange={e => { const v = e.target.value; if (/^#?[0-9a-fA-F]{6}$/.test(v.replace('#', '').length === 6 ? v : `#${v.replace('#', '')}`)) emit(v.startsWith('#') ? v : `#${v}`, alpha); setHex(v.startsWith('#') ? v : `#${v}`); }}
            onKeyDown={e => e.stopPropagation()}
          />
        </div>
        <div className="pf-row" style={{ marginBottom: 2 }}>
          <label style={{ width: 52 }}>Opacity</label>
          <input type="range" style={{ flex: 1 }} min={0.1} max={1} step={0.05} value={alpha}
            onChange={e => emit(hex, parseFloat(e.target.value))} aria-label="Opacity" />
        </div>
        <div className="pf-menu-note" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Icon name="sparkle" size={12} /> Curated for screenshots: vivid on dark, deep on light.
        </div>
      </ChibuikePopover>
    </div>
  );
}
