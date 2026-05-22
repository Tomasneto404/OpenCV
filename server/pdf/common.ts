/**
 * Convert a #rrggbb hex to rgba() with given alpha.
 * react-pdf accepts rgba() strings as colour / backgroundColor.
 */
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const PALETTE = {
  ink:      '#111827',
  inkSoft:  '#374151',
  inkMuted: '#4b5563',
  inkDim:   '#6b7280',
  inkFaint: '#9ca3af',
  rule:     '#e5e7eb',
  surface:  '#fafaf7',
  white:    '#ffffff',
} as const;

export function bullets(text: string): string[] {
  return text.split('\n').map((l) => l.trim()).filter(Boolean);
}

export function contactList(p: {
  email: string; phone: string; location: string;
  website: string; linkedin: string; github: string;
}): string[] {
  return [p.email, p.phone, p.location, p.website, p.linkedin, p.github].filter(Boolean);
}
