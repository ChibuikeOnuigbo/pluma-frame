import { gsap } from "gsap";

type TweenVars = NonNullable<Parameters<typeof gsap.to>[1]>;

export interface AnimationPreset {
  id: string;
  label: string;
  /** Starting GSAP vars, applied before the tween plays. */
  from: TweenVars;
  /** Target GSAP vars the asset animates to. */
  to: TweenVars;
  /** GSAP ease string. Defaults to "power2.out" when omitted. */
  ease?: string;
  /** True for continuous flourishes (pulse, wobble) that always loop while active. */
  continuous?: boolean;
}

export const ANIMATION_GROUPS: { group: string; items: AnimationPreset[] }[] = [
  {
    group: "Fade",
    items: [
      { id: "fadeIn", label: "Fade In", from: { opacity: 0 }, to: { opacity: 1 } },
      { id: "fadeInUp", label: "Fade Up", from: { opacity: 0, y: 40 }, to: { opacity: 1, y: 0 } },
      { id: "fadeInDown", label: "Fade Down", from: { opacity: 0, y: -40 }, to: { opacity: 1, y: 0 } },
      { id: "fadeInLeft", label: "Fade Left", from: { opacity: 0, x: -50 }, to: { opacity: 1, x: 0 } },
      { id: "fadeInRight", label: "Fade Right", from: { opacity: 0, x: 50 }, to: { opacity: 1, x: 0 } },
      { id: "fadeInScale", label: "Fade + Scale", from: { opacity: 0, scale: 0.9 }, to: { opacity: 1, scale: 1 } },
    ],
  },
  {
    group: "Slide",
    items: [
      { id: "slideInUp", label: "Slide Up", from: { y: 120, opacity: 0 }, to: { y: 0, opacity: 1 }, ease: "power3.out" },
      { id: "slideInDown", label: "Slide Down", from: { y: -120, opacity: 0 }, to: { y: 0, opacity: 1 }, ease: "power3.out" },
      { id: "slideInLeft", label: "Slide Left", from: { x: -150, opacity: 0 }, to: { x: 0, opacity: 1 }, ease: "power3.out" },
      { id: "slideInRight", label: "Slide Right", from: { x: 150, opacity: 0 }, to: { x: 0, opacity: 1 }, ease: "power3.out" },
    ],
  },
  {
    group: "Zoom & scale",
    items: [
      { id: "zoomIn", label: "Zoom In", from: { scale: 0.4, opacity: 0 }, to: { scale: 1, opacity: 1 }, ease: "power2.out" },
      { id: "zoomInUp", label: "Zoom + Up", from: { scale: 0.5, y: 80, opacity: 0 }, to: { scale: 1, y: 0, opacity: 1 }, ease: "power2.out" },
      { id: "popIn", label: "Pop In", from: { scale: 0.3, opacity: 0 }, to: { scale: 1, opacity: 1 }, ease: "back.out(2.2)" },
      { id: "scaleUp", label: "Scale Up", from: { scale: 0.85 }, to: { scale: 1 }, ease: "power1.out" },
    ],
  },
  {
    group: "Rotate & flip",
    items: [
      { id: "rotateIn", label: "Rotate In", from: { rotation: -25, opacity: 0, scale: 0.9 }, to: { rotation: 0, opacity: 1, scale: 1 }, ease: "power2.out" },
      { id: "rotateInLeft", label: "Rotate Left", from: { rotation: -90, opacity: 0 }, to: { rotation: 0, opacity: 1 }, ease: "power2.out" },
      { id: "flipInX", label: "Flip X", from: { rotationX: 90, opacity: 0 }, to: { rotationX: 0, opacity: 1 }, ease: "power2.out" },
      { id: "flipInY", label: "Flip Y", from: { rotationY: 90, opacity: 0 }, to: { rotationY: 0, opacity: 1 }, ease: "power2.out" },
    ],
  },
  {
    group: "Bounce & elastic",
    items: [
      { id: "bounceIn", label: "Bounce In", from: { scale: 0.3, opacity: 0 }, to: { scale: 1, opacity: 1 }, ease: "bounce.out" },
      { id: "bounceInUp", label: "Bounce Up", from: { y: 150, opacity: 0 }, to: { y: 0, opacity: 1 }, ease: "bounce.out" },
      { id: "elasticIn", label: "Elastic In", from: { scale: 0.4, opacity: 0 }, to: { scale: 1, opacity: 1 }, ease: "elastic.out(1, 0.4)" },
      { id: "springIn", label: "Spring In", from: { y: -60, opacity: 0 }, to: { y: 0, opacity: 1 }, ease: "elastic.out(1, 0.5)" },
    ],
  },
  {
    group: "Blur & skew",
    items: [
      { id: "blurIn", label: "Blur In", from: { opacity: 0, filter: "blur(16px)" }, to: { opacity: 1, filter: "blur(0px)" } },
      { id: "blurInUp", label: "Blur + Up", from: { opacity: 0, y: 30, filter: "blur(12px)" }, to: { opacity: 1, y: 0, filter: "blur(0px)" } },
      { id: "skewInLeft", label: "Skew Left", from: { skewX: -12, opacity: 0, x: -40 }, to: { skewX: 0, opacity: 1, x: 0 } },
      { id: "skewInRight", label: "Skew Right", from: { skewX: 12, opacity: 0, x: 40 }, to: { skewX: 0, opacity: 1, x: 0 } },
    ],
  },
  {
    group: "Attention (loop)",
    items: [
      { id: "pulse", label: "Pulse", from: { scale: 1 }, to: { scale: 1.04 }, ease: "sine.inOut", continuous: true },
      { id: "wobble", label: "Wobble", from: { rotation: -3 }, to: { rotation: 3 }, ease: "sine.inOut", continuous: true },
      { id: "float", label: "Float", from: { y: -6 }, to: { y: 6 }, ease: "sine.inOut", continuous: true },
      { id: "heartbeat", label: "Heartbeat", from: { scale: 1 }, to: { scale: 1.06 }, ease: "power1.inOut", continuous: true },
    ],
  },
];

export const ANIMATION_PRESET_MAP: Record<string, AnimationPreset> = Object.fromEntries(
  ANIMATION_GROUPS.flatMap((g) => g.items).map((p) => [p.id, p])
);
