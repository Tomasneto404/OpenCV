export type TemplateId = 'modern' | 'classic' | 'minimal' | 'creative' | 'executive' | 'compact' | 'studio' | 'technical' | 'academic';

export interface PersonalInfo {
  fullName: string;
  headline: string;       // e.g. "Senior Software Engineer"
  email: string;
  phone: string;
  location: string;
  website: string;
  linkedin: string;
  github: string;
  photoDataUrl?: string;  // base64 (optional)
}

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  location: string;
  startDate: string;      // free text: "Jan 2022"
  endDate: string;        // "Presente" | "Dez 2024"
  description: string;    // bullet points separated by newlines
}

export interface EducationItem {
  id: string;
  degree: string;
  institution: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  url: string;
  description: string;
  stack: string;
}

export interface SkillGroup {
  id: string;
  category: string;       // "Frontend", "Backend", "DevOps"
  items: string;          // comma-separated
}

export interface LanguageItem {
  id: string;
  name: string;           // "Português"
  level: string;          // "Nativo" | "C1" | "B2"
}

/**
 * A PDF certificate (diploma / certification) attached to the CV.
 *
 * `pdfDataUrl` is `data:application/pdf;base64,...` — we keep the raw bytes
 * in the CV so the user can re-edit and re-export without re-uploading. The
 * size budgets are enforced in CertificatesSection (5 MB / file, 15 MB total).
 *
 * Hash is the sha256 over the binary; we expose it in the UI so the user can
 * confirm two certificates differ (and in the PDF metadata for verification).
 */
export interface CertificateItem {
  id: string;
  name: string;
  description: string;
  pdfDataUrl: string;
  bytes: number;
  pageCount: number;
  hash: string;
  /** When true (default), the server embeds the certificate inside a
   *  branded page template (header with name/description + accent colour
   *  border) instead of copying the raw pages 1:1. Toggle in the UI. */
  framed?: boolean;
}

export interface CVData {
  version: 1;
  template: TemplateId;
  accentColor: string;
  personal: PersonalInfo;
  summary: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: SkillGroup[];
  languages: LanguageItem[];
  projects: ProjectItem[];
  /** Optional in v1 — older configs won't have it. */
  certificates?: CertificateItem[];
  /** Locale the CV's labels (SOBRE MIM / EXPERIENCE / ...) are rendered
   *  in by the PDF templates. Defaults to 'pt' server-side if missing.
   *  Set by the client at save time from the current UI locale. */
  locale?: 'pt' | 'en' | 'es' | 'fr' | 'de';
}
