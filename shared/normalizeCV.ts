import type { CVData } from './cv';

export const templateIds = ['modern', 'classic', 'minimal', 'creative', 'executive', 'compact', 'studio', 'technical', 'academic'] as const;
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max = 4096) => v === undefined || (typeof v === 'string' && v.length <= max);

/** Validate imported data and fill optional fields used by every renderer. */
export function normalizeCV(input: unknown): CVData | null {
  if (!record(input) || input.version !== 1 || !templateIds.includes(input.template as CVData['template'])) return null;
  if (input.accentColor !== undefined && (typeof input.accentColor !== 'string' || !/^#[0-9a-f]{6}$/i.test(input.accentColor))) return null;
  if (!record(input.personal) || !text(input.summary)) return null;
  if (input.locale !== undefined && !['pt', 'en', 'es', 'fr', 'de'].includes(String(input.locale))) return null;
  const personal: Record<string, string> = {};
  for (const key of ['fullName', 'headline', 'email', 'phone', 'location', 'website', 'linkedin', 'github']) {
    if (!text(input.personal[key], 512)) return null;
    personal[key] = input.personal[key] as string ?? '';
  }
  const photo = input.personal.photoDataUrl;
  if (photo !== undefined) {
    if (typeof photo !== 'string' || photo.length > 6 * 1024 * 1024 || !/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(photo)) return null;
    personal.photoDataUrl = photo;
  }
  const specs: Record<string, [number, string[]]> = {
    experience: [50, ['role', 'company', 'location', 'startDate', 'endDate', 'description']],
    education: [20, ['degree', 'institution', 'location', 'startDate', 'endDate', 'description']],
    skills: [50, ['category', 'items']], languages: [30, ['name', 'level']],
    projects: [50, ['name', 'url', 'description', 'stack']],
  };
  const lists: Record<string, Record<string, string>[]> = {};
  for (const [key, [max, fields]] of Object.entries(specs)) {
    const value = input[key] ?? [];
    if (!Array.isArray(value) || value.length > max) return null;
    lists[key] = [];
    const ids = new Set<string>();
    for (const [index, item] of value.entries()) {
      if (!record(item) || !text(item.id, 128)) return null;
      const id = typeof item.id === 'string' && item.id ? item.id : `${key}-${index}`;
      if (ids.has(id)) return null;
      ids.add(id);
      const out: Record<string, string> = { id };
      for (const field of fields) {
        if (!text(item[field])) return null;
        out[field] = item[field] as string ?? '';
      }
      lists[key].push(out);
    }
  }
  const certificates = input.certificates ?? [];
  if (!Array.isArray(certificates) || certificates.length > 50) return null;
  let total = 0;
  const certs = [];
  const certIds = new Set<string>();
  for (const [index, cert] of certificates.entries()) {
    if (!record(cert) || typeof cert.pdfDataUrl !== 'string' || !/^data:application\/pdf;base64,[A-Za-z0-9+/=]+$/.test(cert.pdfDataUrl)) return null;
    const b64 = cert.pdfDataUrl.split(',')[1];
    const bytes = Math.floor(b64.length * 3 / 4) - (b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0);
    total += bytes;
    if (bytes > 10 * 1024 * 1024 || total > 50 * 1024 * 1024) return null;
    if (!text(cert.name, 256) || !text(cert.description) || !text(cert.id, 128) || !text(cert.hash, 128)) return null;
    if (cert.framed !== undefined && typeof cert.framed !== 'boolean') return null;
    const id = cert.id as string || `certificate-${index}`;
    if (certIds.has(id)) return null;
    certIds.add(id);
    certs.push({ id, name: cert.name ?? '', description: cert.description ?? '', pdfDataUrl: cert.pdfDataUrl, bytes, pageCount: typeof cert.pageCount === 'number' && Number.isInteger(cert.pageCount) && cert.pageCount > 0 ? cert.pageCount : 1, hash: cert.hash ?? '', framed: cert.framed !== false });
  }
  return { version: 1, template: input.template, accentColor: input.accentColor ?? '#146c60', personal, summary: input.summary ?? '', ...lists, certificates: certs, ...(input.locale ? { locale: input.locale } : {}) } as unknown as CVData;
}
