// Chibuike capability flags — ONE place decides what this build can do.
// No scattered paywall/feature checks across components (and nothing is
// paywalled here — this exists so future tiers never fragment the UI).
export interface ChibuikeCapability {
  enabled: boolean;
  reason?: string;
  upgradeRequired?: false | string;
}

export const CHIBUIKE_CAPABILITIES = {
  pngExport: { enabled: true },
  jpegExport: { enabled: true },
  webpExport: { enabled: true },
  svgExport: { enabled: true },
  webmExport: { enabled: true },
  gifExport: { enabled: false, reason: 'Weak GIF encoders produce heavy, low-quality files — export WebM instead.' },
  mp4Export: { enabled: false, reason: 'WebCodecs H.264 muxing not included in this build.' },
  pdfExport: { enabled: false, reason: 'PDF font embedding not verified — deliberately not shipped.' },
  videoInput: { enabled: false, reason: 'Pluma is a screenshot/graphic editor, not a video editor.' },
  aiVision: { enabled: false, reason: 'Optional AI assistance deferred; deterministic tools cover the workflow. Architecture notes in docs/AI.md.' },
  bgRemove: { enabled: false, reason: 'Local segmentation model not bundled in this build.' },
  websiteScreenshot: { enabled: false, reason: 'Needs a server-side renderer; browsers cannot capture cross-origin DOM.' },
  threeD: { enabled: false, reason: 'CSS/canvas perspective tilt covers screenshot mockups; GLB workspace deferred.' },
} as const satisfies Record<string, ChibuikeCapability>;

export type ChibuikeCapabilityKey = keyof typeof CHIBUIKE_CAPABILITIES;

export function chibuikeCan(key: ChibuikeCapabilityKey): ChibuikeCapability {
  return CHIBUIKE_CAPABILITIES[key];
}
