// @vitest-environment happy-dom
/**
 * UI smoke — mounts each chrome component under happy-dom and asserts it
 * renders without throwing, produces sensible markup, and contains no
 * pictographic unicode glyphs.
 */
import { describe, it, expect } from 'vitest';
import { createRoot } from 'react-dom/client';
import React from 'react';

const PICT = /[\u2190-\u21FF\u2300-\u23FF\u2460-\u24FF\u25A0-\u25FF\u2600-\u27BF\u2B00-\u2BFF\u2900-\u297F\u{1F000}-\u{1FAFF}]/u;

async function mount(el: React.ReactElement): Promise<HTMLDivElement> {
  const div = document.createElement('div');
  document.body.appendChild(div);
  await new Promise<void>(res => {
    createRoot(div).render(el);
    setTimeout(res, 60);
  });
  return div;
}

describe('ui smoke', () => {
  it('landing mounts', async () => {
    const { Landing } = await import('../src/ui/Landing');
    const div = await mount(React.createElement(Landing));
    expect(div.textContent).toContain('Pluma Frame');
    expect(div.querySelectorAll('svg').length).toBeGreaterThan(0);
    expect(PICT.test(div.textContent ?? '')).toBe(false);
  });

  it('topbar mounts: export button present, no unicode glyphs, icon-only buttons labelled', async () => {
    const { Topbar } = await import('../src/ui/studio/Topbar');
    const div = await mount(React.createElement(Topbar, { onIngest: () => {} }));
    expect(div.textContent).toContain('Export');
    expect(PICT.test(div.textContent ?? '')).toBe(false);
    const btns = Array.from(div.querySelectorAll('button'));
    expect(btns.length).toBeGreaterThan(4);
    for (const b of btns) {
      const hasText = (b.textContent ?? '').trim().length > 0;
      const hasSvg = b.querySelector('svg') !== null;
      if (!hasText && hasSvg) {
        expect(b.getAttribute('aria-label') || b.getAttribute('title')).toBeTruthy();
      }
    }
  });

  it('toolrail renders icon-only labelled tools', async () => {
    const { ToolRail } = await import('../src/ui/studio/ToolRail');
    const div = await mount(React.createElement(ToolRail));
    const iconBtns = Array.from(div.querySelectorAll('button svg'));
    expect(iconBtns.length).toBeGreaterThan(5);
    for (const b of Array.from(div.querySelectorAll('button'))) {
      const hasText = (b.textContent ?? '').trim().length > 0;
      const hasSvg = b.querySelector('svg') !== null;
      if (!hasText && hasSvg) {
        expect(b.getAttribute('aria-label') || b.getAttribute('title') || b.getAttribute('data-tip')).toBeTruthy();
      }
    }
  });
});
