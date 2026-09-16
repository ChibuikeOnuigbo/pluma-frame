// Chibuike id forge — stable identities, tiny and collision-free enough for a lifetime of edits.
let chibuikeCounter = 0;
export function chibuikeId(prefix = 'o'): string {
  chibuikeCounter = (chibuikeCounter + 1) % 1e6;
  return `${prefix}_${Date.now().toString(36)}${chibuikeCounter.toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
