// Chibuike icon shelf — small original 24x24 stroke/fill paths authored for
// this project (simple geometric marks; see ASSET_LICENSES.md). Searchable.
export interface ChibuikeIconDef { name: string; path: string; tags: string; }

export const CHIBUIKE_ICONS: ChibuikeIconDef[] = [
  { name: 'Star', path: 'M12 3l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 16.9 6.4 20l1.3-6.2L3 9.5l6.3-.7z', tags: 'star rate favorite' },
  { name: 'Heart', path: 'M12 20s-7-4.3-7-9.5C5 7.5 7 6 9 6c1.3 0 2.4.7 3 1.7C12.6 6.7 13.7 6 15 6c2 0 4 1.5 4 4.5 0 5.2-7 9.5-7 9.5z', tags: 'heart love like' },
  { name: 'Check', path: 'M5 13l4 4L19 7', tags: 'check done ok' },
  { name: 'Check circle', path: 'M12 3a9 9 0 100 18 9 9 0 000-18zm-3.5 9.5l2.5 2.5 5-5', tags: 'check circle done' },
  { name: 'Camera', path: 'M4 8h3l2-2h6l2 2h3v11H4zM12 16a3.2 3.2 0 100-6.4A3.2 3.2 0 0012 16z', tags: 'camera photo' },
  { name: 'Bolt', path: 'M13 3L5 13h5l-1 8 8-10h-5z', tags: 'bolt fast zap power' },
  { name: 'Chat', path: 'M4 5h16v11H9l-5 4z', tags: 'chat message talk' },
  { name: 'Bell', path: 'M6 16V11a6 6 0 1112 0v5l1.5 2.5h-15zM10 19a2 2 0 004 0', tags: 'bell notify alert' },
  { name: 'Bookmark', path: 'M7 4h10v16l-5-3.5L7 20z', tags: 'bookmark save' },
  { name: 'Calendar', path: 'M5 6h14v14H5zM5 10h14M9 4v4M15 4v4', tags: 'calendar date' },
  { name: 'Clock', path: 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 4v5l3.5 2', tags: 'clock time' },
  { name: 'Compass', path: 'M12 3a9 9 0 100 18 9 9 0 000-18zm3.5 5.5l-2 5-5 2 2-5z', tags: 'compass explore' },
  { name: 'Copy', path: 'M8 8h12v12H8zM4 4h12v3H7v9H4z', tags: 'copy duplicate' },
  { name: 'Download', path: 'M12 4v10m0 0l-4-4m4 4l4-4M5 19h14', tags: 'download save' },
  { name: 'Flag', path: 'M6 4v16M6 5h11l-2 3.5L17 12H6', tags: 'flag report' },
  { name: 'Gift', path: 'M4 10h16v3H4zM6 13h12v7H6zM12 10v10M12 10s-4 0-4-3c0-1.5 3-2 4 1 1-3 4-2.5 4-1 0 3-4 3-4 3z', tags: 'gift present' },
  { name: 'Globe', path: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3.5 3 14 0 18-3-4-3-14.5 0-18z', tags: 'globe web world' },
  { name: 'Home', path: 'M4 11l8-7 8 7v9h-5v-6h-6v6H4z', tags: 'home house' },
  { name: 'Image', path: 'M4 5h16v14H4zM4 15l4-4 3 3 3-3 6 6M9.5 9a1 1 0 100-2 1 1 0 000 2z', tags: 'image photo picture' },
  { name: 'Key', path: 'M14 10a4 4 0 10-4 4l1 1-1 1 1 1-1 1 1 1 3-3-1-1a4 4 0 001-5z', tags: 'key password' },
  { name: 'Lightbulb', path: 'M9 18h6M10 21h4M12 4a5.5 5.5 0 013 10c-.7.5-1 1-1 2h-4c0-1-.3-1.5-1-2a5.5 5.5 0 013-10z', tags: 'idea light bulb tip' },
  { name: 'Lock', path: 'M6 11h12v9H6zM9 11V8a3 3 0 016 0v3', tags: 'lock secure private' },
  { name: 'Mail', path: 'M4 6h16v12H4zM4 7l8 6 8-6', tags: 'mail email' },
  { name: 'Map pin', path: 'M12 21s-6-5.5-6-10a6 6 0 1112 0c0 4.5-6 10-6 10zm0-8.5a1.8 1.8 0 100-3.6 1.8 1.8 0 000 3.6z', tags: 'pin location map' },
  { name: 'Mic', path: 'M12 3a3 3 0 013 3v5a3 3 0 01-6 0V6a3 3 0 013-3zM6 11a6 6 0 0012 0M12 17v4', tags: 'mic audio record' },
  { name: 'Moon', path: 'M20 14A8 8 0 019.5 3.5 8 8 0 1020 14z', tags: 'moon dark night' },
  { name: 'Music', path: 'M9 18V6l10-2v12M9 18a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zm10-2a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z', tags: 'music song audio' },
  { name: 'Paperclip', path: 'M8 12l6-6a3 3 0 014 4l-8 8a4.5 4.5 0 01-6-6l7-7', tags: 'attach clip file' },
  { name: 'Phone', path: 'M7 3h10a1 1 0 011 1v16a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zm3 16h4', tags: 'phone mobile' },
  { name: 'Play', path: 'M8 5l11 7-11 7z', tags: 'play start run' },
  { name: 'Search', path: 'M10.5 4a6.5 6.5 0 104.2 11.5L20 21', tags: 'search find magnify' },
  { name: 'Send', path: 'M4 12l16-7-4 16-4-6z', tags: 'send share message' },
  { name: 'Shield', path: 'M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z', tags: 'shield secure safe' },
  { name: 'Sun', path: 'M12 7a5 5 0 100 10 5 5 0 000-10zM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19', tags: 'sun light day bright' },
  { name: 'Tag', path: 'M4 4h7l9 9-7 7-9-9zM8.5 8.5a1 1 0 100-.01', tags: 'tag label price' },
  { name: 'Thumbs up', path: 'M7 11l4-7c1.5 0 2.5 1 2.5 2.5V10H19a1.5 1.5 0 011.5 2l-1.8 6A2 2 0 0116.8 20H7zM7 11H4v9h3z', tags: 'thumbs like good' },
  { name: 'Trash', path: 'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5m4-5v5', tags: 'trash delete remove' },
  { name: 'User', path: 'M12 4a4 4 0 110 8 4 4 0 010-8zM5 20c1-4 4-5.5 7-5.5s6 1.5 7 5.5', tags: 'user person profile' },
  { name: 'Wifi', path: 'M3 9a14 14 0 0118 0M6.5 12.5a9 9 0 0111 0M10 16a4.5 4.5 0 014 0M12 19.5a.8.8 0 100 .01', tags: 'wifi network signal' },
  { name: 'Rocket', path: 'M12 3c4 1.5 6 5 6 9l-3 3-6-6 3-3zM9 9l-4 2 3 3m9 1l-2 4-3-3M5 17c-1 1-1 3-1 3s2 0 3-1', tags: 'rocket launch ship startup' },
  { name: 'Layers', path: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5', tags: 'layers stack design' },
  { name: 'Grid', path: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', tags: 'grid apps layout' },
  { name: 'Palette', path: 'M12 3a9 9 0 100 18c1.5 0 2-1 2-2s-.5-2-2-2 0-3 2-3 5 0 5-5-3.5-6-7-6zM7.5 10.5a1 1 0 100-.01M10 7a1 1 0 100-.01', tags: 'palette color theme paint' },
  { name: 'Cursor', path: 'M6 3l12 8-5.5 1L15 19l-3 1-2.5-6.5L6 17z', tags: 'cursor click pointer select' },
];

export function chibuikeSearchIcons(q: string): ChibuikeIconDef[] {
  const s = q.trim().toLowerCase();
  if (!s) return CHIBUIKE_ICONS;
  return CHIBUIKE_ICONS.filter(i => i.name.toLowerCase().includes(s) || i.tags.includes(s));
}
