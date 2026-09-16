/**
 * Chibuike icon system — professional 24×24 stroke icons (Lucide-grade
 * geometry, authored for this project; see ASSET_LICENSES.md). No unicode,
 * no emoji in UI chrome — every glyph is a real SVG icon.
 */
export type ChibuikeIconName =
  | 'cursor' | 'hand' | 'crop' | 'image' | 'type' | 'message' | 'steps' | 'badge'
  | 'square' | 'circle' | 'arrow' | 'line' | 'pen' | 'highlighter' | 'pixels' | 'focus'
  | 'zoomSearch' | 'qr' | 'star' | 'smile' | 'monitor' | 'laptop' | 'phone' | 'globe'
  | 'undo' | 'redo' | 'save' | 'folder' | 'folderOpen' | 'download' | 'upload' | 'copy'
  | 'x' | 'play' | 'pause' | 'stopSquare' | 'chevronDown' | 'chevronLeft' | 'chevronRight'
  | 'plus' | 'minus' | 'help' | 'home' | 'layers' | 'eye' | 'eyeOff' | 'lock' | 'unlock'
  | 'trash' | 'more' | 'panelRight' | 'sliders' | 'alignLeft' | 'alignCenterH' | 'alignRight'
  | 'alignTop' | 'alignCenterV' | 'alignBottom' | 'distributeH' | 'distributeV'
  | 'group' | 'toFront' | 'toBack' | 'up' | 'down' | 'check' | 'alert' | 'info' | 'checkCircle'
  | 'sparkle' | 'flipH' | 'flipV' | 'rotate' | 'wand' | 'keyboard' | 'external' | 'search' | 'grip'
  | 'clipboard' | 'film' | 'vector' | 'grid' | 'ruler' | 'text' | 'transparent';

const P: Record<ChibuikeIconName, { d: string[]; fill?: boolean; extra?: string[] }> = {
  cursor: { d: ['M4 3l7.1 17 2.5-7.4L21 10.1z'] },
  hand: { d: ['M18 11V6a1.5 1.5 0 00-3 0v5', 'M15 10V4.5a1.5 1.5 0 00-3 0V10', 'M12 10.5V6a1.5 1.5 0 00-3 0v8', 'M18 8a1.5 1.5 0 013 0v6a8 8 0 01-8 8h-1.5a7 7 0 01-5-2.1l-3.4-3.6a1.6 1.6 0 012.3-2.2L7 15.5'] },
  crop: { d: ['M6 2v14a2 2 0 002 2h14', 'M2 6h14a2 2 0 012 2v14'] },
  image: { d: ['M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z', 'M3 15l4.5-4.5a1 1 0 011.4 0L13 15', 'M12.5 12.5l2.6-2.6a1 1 0 011.4 0L21 14.5', 'M9 9.5a1 1 0 11-2 0 1 1 0 012 0z'] },
  type: { d: ['M5 7V5h14v2', 'M12 5v14', 'M9 19h6'] },
  message: { d: ['M21 14a2 2 0 01-2 2H8l-5 4V5a2 2 0 012-2h14a2 2 0 012 2z'] },
  steps: { d: ['M10 6h11', 'M10 12h11', 'M10 18h11', 'M4 6h1v4', 'M3 10h4', 'M6 18H4a1 1 0 01-1-1c0-1.5 3-2 3-3.5A1.5 1.5 0 004.5 12'] },
  badge: { d: ['M3.9 8.6a4 4 0 014.7-4.7 4 4 0 016.8 0 4 4 0 014.7 4.7 4 4 0 010 6.8 4 4 0 01-4.7 4.7 4 4 0 01-6.8 0 4 4 0 01-4.7-4.7 4 4 0 010-6.8z', 'm9 12 2 2 4-4'] },
  square: { d: ['M4 4h16v16H4z'] },
  circle: { d: ['M12 3a9 9 0 100 18 9 9 0 000-18z'] },
  arrow: { d: ['M6 18L18 6', 'M10 6h8v8'] },
  line: { d: ['M5 19L19 5'] },
  pen: { d: ['M17 3.5a2.6 2.6 0 013.7 3.7L7.6 20.3 2.5 21.5l1.2-5.1z', 'M14.5 6l3.5 3.5'] },
  highlighter: { d: ['m9 11-6 6v3.5h3.5l6-6', 'm11.5 5.5 3-3a2.1 2.1 0 013 3l-8.5 8.5-3-3z', 'M13 20h8'] },
  pixels: { d: ['M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01', 'M4 4h16v16H4z'] },
  focus: { d: ['M3 7V5a2 2 0 012-2h2', 'M17 3h2a2 2 0 012 2v2', 'M21 17v2a2 2 0 01-2 2h-2', 'M7 21H5a2 2 0 01-2-2v-2', 'M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z'] },
  zoomSearch: { d: ['M11 4a7 7 0 100 14 7 7 0 000-14z', 'm21 21-4.8-4.8', 'M11 8v6', 'M8 11h6'] },
  qr: { d: ['M4 4h6v6H4z', 'M14 4h6v6h-6z', 'M4 14h6v6H4z', 'M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z'] },
  star: { d: ['M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.9z'] },
  smile: { d: ['M12 3a9 9 0 100 18 9 9 0 000-18z', 'M9 10h.01M15 10h.01', 'M8.5 14.5a4.5 4.5 0 007 0'] },
  monitor: { d: ['M3 4h18a1 1 0 011 1v11a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1z', 'M8 21h8', 'M12 17v4'] },
  laptop: { d: ['M5 5h14a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z', 'M2 19h20'] },
  phone: { d: ['M7 2.5h10a1 1 0 011 1v17a1 1 0 01-1 1H7a1 1 0 01-1-1v-17a1 1 0 011-1z', 'M10.5 18.5h3'] },
  globe: { d: ['M12 3a9 9 0 100 18 9 9 0 000-18z', 'M3 12h18', 'M12 3c2.8 3 2.8 15 0 18-2.8-3-2.8-15 0-18z'] },
  undo: { d: ['M3 7v6h6', 'M21 17a9 9 0 00-15.5-6.4L3 13'] },
  redo: { d: ['M21 7v6h-6', 'M3 17a9 9 0 0115.5-6.4L21 13'] },
  save: { d: ['M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z', 'M17 21v-8H7v8', 'M7 3v5h8'] },
  folder: { d: ['M3 6a2 2 0 012-2h4l2 3h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2z'] },
  folderOpen: { d: ['M3 6a2 2 0 012-2h4l2 3h8a2 2 0 012 2v2H6.5L3 19z', 'M3 19l3.5-8H22l-3 8z'] },
  download: { d: ['M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4', 'M7 10l5 5 5-5', 'M12 15V3'] },
  upload: { d: ['M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4', 'M7 8l5-5 5 5', 'M12 3v12'] },
  copy: { d: ['M9 9h11a1 1 0 011 1v11a1 1 0 01-1 1H9a1 1 0 01-1-1V10a1 1 0 011-1z', 'M4 15V4a1 1 0 011-1h11'] },
  x: { d: ['M18 6L6 18', 'M6 6l12 12'] },
  play: { d: ['M7 4.5l12 7.5-12 7.5z'], fill: true },
  pause: { d: ['M7 5h3v14H7zM14 5h3v14h-3z'], fill: true },
  stopSquare: { d: ['M6 6h12v12H6z'], fill: true },
  chevronDown: { d: ['m6 9 6 6 6-6'] },
  chevronLeft: { d: ['m15 18-6-6 6-6'] },
  chevronRight: { d: ['m9 18 6-6-6-6'] },
  plus: { d: ['M12 5v14', 'M5 12h14'] },
  minus: { d: ['M5 12h14'] },
  help: { d: ['M12 3a9 9 0 100 18 9 9 0 000-18z', 'M9.5 9a2.5 2.5 0 114 2c-.8.7-1.5 1.2-1.5 2.3', 'M12 17h.01'] },
  home: { d: ['M4 11l8-7 8 7', 'M6 9.5V20h12V9.5', 'M10 20v-6h4v6'] },
  layers: { d: ['M12 3l9 5-9 5-9-5z', 'M3 13l9 5 9-5'] },
  eye: { d: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z', 'M12 9a3 3 0 100 6 3 3 0 000-6z'] },
  eyeOff: { d: ['M3 3l18 18', 'M10.6 5.2A10.6 10.6 0 0112 5c6.5 0 10 7 10 7a17.5 17.5 0 01-3.2 4M6.6 6.6A16.7 16.7 0 002 12s3.5 7 10 7a10 10 0 004.2-.9', 'M9.9 9.9a3 3 0 004.2 4.2'] },
  lock: { d: ['M6 11h12a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1v-8a1 1 0 011-1z', 'M9 11V8a3 3 0 016 0v3'] },
  unlock: { d: ['M6 11h12a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1v-8a1 1 0 011-1z', 'M9 11V8a3 3 0 015.9-.8'] },
  trash: { d: ['M4 7h16', 'M9 7V4h6v3', 'M6.5 7l1 13h9l1-13', 'M10 11v5', 'M14 11v5'] },
  more: { d: ['M5 12h.01M12 12h.01M19 12h.01'], fill: false },
  panelRight: { d: ['M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2z', 'M15 3v18'] },
  sliders: { d: ['M4 21v-7M4 10V3', 'M12 21v-9M12 8V3', 'M20 21v-5M20 12V3', 'M1 14h6', 'M9 8h6', 'M17 16h6'] },
  alignLeft: { d: ['M4 3v18', 'M8 7h12', 'M8 12h8', 'M8 17h10'] },
  alignCenterH: { d: ['M12 3v18', 'M5 7h14', 'M7 12h10', 'M6 17h12'] },
  alignRight: { d: ['M20 3v18', 'M4 7h12', 'M8 12h8', 'M6 17h10'] },
  alignTop: { d: ['M3 4h18', 'M7 8v12', 'M12 8v8', 'M17 8v10'] },
  alignCenterV: { d: ['M3 12h18', 'M7 5v14', 'M12 7v10', 'M17 6v12'] },
  alignBottom: { d: ['M3 20h18', 'M7 4v12', 'M12 8v8', 'M17 6v10'] },
  distributeH: { d: ['M4 3v18', 'M20 3v18', 'M8 8h8v4H8z', 'M9 16h6v3H9z'] },
  distributeV: { d: ['M3 4h18', 'M3 20h18', 'M8 8h4v8H8z', 'M16 9h3v6h-3z'] },
  group: { d: ['M4 4h9v9H4z', 'M11 11h9v9h-9z'] },
  toFront: { d: ['M4 8h8v8H4z', 'M12 4h8v8h-8'], fill: false },
  toBack: { d: ['M12 12h8v8h-8z', 'M4 4h8v8H4z'] },
  up: { d: ['m18 15-6-6-6 6'] },
  down: { d: ['m6 9 6 6 6-6'] },
  check: { d: ['M5 13l4 4L19 7'] },
  alert: { d: ['M21.7 18.3 13.4 4.3a1.6 1.6 0 00-2.8 0L2.3 18.3A1.6 1.6 0 003.7 20.7h16.6a1.6 1.6 0 001.4-2.4z', 'M12 9v4', 'M12 17h.01'] },
  info: { d: ['M12 3a9 9 0 100 18 9 9 0 000-18z', 'M12 11v5', 'M12 8h.01'] },
  checkCircle: { d: ['M12 3a9 9 0 100 18 9 9 0 000-18z', 'm8.5 12.5 2.5 2.5 4.5-5'] },
  sparkle: { d: ['M12 3l1.9 5.6a2 2 0 001.3 1.3L21 12l-5.8 1.9a2 2 0 00-1.3 1.3L12 21l-1.9-5.8a2 2 0 00-1.3-1.3L3 12l5.8-2.1a2 2 0 001.3-1.3z', 'M19 3v4', 'M17 5h4'] },
  flipH: { d: ['M12 2v20', 'M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h2', 'M16 4h2a2 2 0 012 2v12a2 2 0 01-2 2h-2'] },
  flipV: { d: ['M2 12h20', 'M4 8V6a2 2 0 012-2h12a2 2 0 012 2v2', 'M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2'] },
  rotate: { d: ['M21 12a9 9 0 11-2.6-6.4L21 8', 'M21 3v5h-5'] },
  wand: { d: ['M15 4V2', 'M15 10V8', 'M12.5 6.5h-2', 'M19.5 6.5h-2', 'M17.8 3.7 16.4 5', 'M17.8 9.3 16.4 8', 'm3 21 9-9', 'M12.2 6.5h.01'] },
  keyboard: { d: ['M3 6h18a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V7a1 1 0 011-1z', 'M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10'] },
  external: { d: ['M15 3h6v6', 'M10 14L21 3', 'M21 14v5a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h5'] },
  search: { d: ['M11 4a7 7 0 100 14 7 7 0 000-14z', 'm21 21-4.8-4.8'] },
  clipboard: { d: ['M9 4h6a1 1 0 011 1v1H8V5a1 1 0 011-1z', 'M16 6h3a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h3', 'M9 12h6', 'M9 16h6'] },
  film: { d: ['M3 4h18v16H3z', 'M7 4v16', 'M17 4v16', 'M3 9h4', 'M3 15h4', 'M17 9h4', 'M17 15h4'] },
  vector: { d: ['M5 5h4v4H5z', 'M15 15h4v4h-4z', 'M7 9c0 5 3 8 8 8', 'M5 3v2M5 9v2M3 7h2M9 7h2M17 19h2M13 17h2'] },
  grid: { d: ['M4 4h7v7H4z', 'M13 4h7v7h-7z', 'M4 13h7v7H4z', 'M13 13h7v7h-7z'] },
  grip: { d: ['M9 5.5h.01M15 5.5h.01M9 12h.01M15 12h.01M9 18.5h.01M15 18.5h.01'] },
  ruler: { d: ['M3 15 15 3l6 6L9 21z', 'M7 11l2 2', 'M10 8l2 2', 'M13 5l2 2'] },
  text: { d: ['M5 7V5h14v2', 'M12 5v14', 'M9 19h6'] },
  transparent: { d: ['M4 4h16v16H4z', 'M4 4l16 16', 'M12 4v4M4 12h4M16 20v-4M20 12h-4'] },
};

export function Icon({ name, size = 17, className, strokeWidth = 2.2 }: {
  name: ChibuikeIconName; size?: number; className?: string; strokeWidth?: number;
}) {
  const def = P[name];
  if (!def) return null;
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true"
    >
      {def.d.map((d, i) => <path key={i} d={d} fill={def.fill ? 'currentColor' : 'none'} stroke={def.fill && i === 0 ? 'none' : undefined} />)}
    </svg>
  );
}
