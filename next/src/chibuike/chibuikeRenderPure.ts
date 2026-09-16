// Chibuike pure render math — eased values and animation windows, separated
// from the painter so tests can verify them without a DOM.
export function chibuikeEase(p: number, easing: string): number {
  switch (easing) {
    case 'linear': return p;
    case 'ease-in': return p * p;
    case 'ease-out': return 1 - (1 - p) * (1 - p);
    case 'ease-in-out': return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    case 'spring': return 1 - Math.cos(p * Math.PI * 1.7) * Math.exp(-p * 4) * 0.5;
    case 'bounce-out': {
      const n1 = 7.5625, d1 = 2.75;
      let x = p;
      if (x < 1 / d1) return n1 * x * x;
      if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
      if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
      return n1 * (x -= 2.625 / d1) * x + 0.984375;
    }
    case 'back-out': { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); }
    default: return 1 - Math.pow(1 - p, 3);
  }
}
