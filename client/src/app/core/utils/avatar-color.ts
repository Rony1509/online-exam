const PALETTE = [
  { bg: '#eaf0ff', fg: '#2245b8' },
  { bg: '#fef1e2', fg: '#b8630a' },
  { bg: '#e7f8f1', fg: '#0f7a4d' },
  { bg: '#fdecec', fg: '#b8332e' },
  { bg: '#f3e8fd', fg: '#7b2fb8' },
  { bg: '#e2f4fd', fg: '#0d6f95' },
];

/** Deterministic background/foreground color pair for a string (subject/chapter name), so the same name always gets the same color. */
export function colorFor(seed: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

export function initialsFor(name: string): string {
  return (name.trim().charAt(0) || '?').toUpperCase();
}
