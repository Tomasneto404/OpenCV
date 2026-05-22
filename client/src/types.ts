/**
 * Templates available in the picker.
 *
 *   - modern, classic, minimal, creative, executive: real, exported in PDF.
 *   - compact: placeholder, marked `available: false` in templates/index.ts —
 *     it teases an upcoming style so visitors come back.
 *
 * When picking a template id, ALWAYS check `TEMPLATES[id].available` before
 * routing into PDF generation: the placeholder has no PDF renderer.
 */
export type TemplateId = 'modern' | 'classic' | 'minimal' | 'creative' | 'executive' | 'compact';

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
}

/**
 * Per-CV metadata returned by the server. The client only reads it — never
 * mutates. The server-side increment of editCount lives in /pdf/:sessionId.
 */
export interface CVMeta {
  createdAt: string;
  lastEditAt: string;
  editCount: number;
  lastSentEmail: string | null;
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function emptyCV(): CVData {
  return {
    version: 1,
    template: 'modern',
    accentColor: '#1e3a8a',
    personal: {
      fullName: '',
      headline: '',
      email: '',
      phone: '',
      location: '',
      website: '',
      linkedin: '',
      github: '',
    },
    summary: '',
    experience: [],
    education: [],
    skills: [],
    languages: [],
    projects: [],
    certificates: [],
  };
}

export function sampleCV(): CVData {
  return {
    version: 1,
    template: 'modern',
    accentColor: '#1e3a8a',
    personal: {
      fullName: 'Tomás Neto',
      headline: 'Full-Stack Engineer',
      email: 'tomas@example.com',
      phone: '+351 912 345 678',
      location: 'Lisboa, Portugal',
      website: 'tomasneto.dev',
      linkedin: 'linkedin.com/in/tomasneto',
      github: 'github.com/tomasneto',
    },
    summary:
      'Engenheiro de software com 6 anos de experiência a entregar produtos web modernos, do design ao deploy. Apaixonado por experiência de utilizador, performance e código limpo.',
    experience: [
      {
        id: newId(),
        role: 'Senior Full-Stack Engineer',
        company: 'Acme Cloud',
        location: 'Remoto',
        startDate: 'Jan 2023',
        endDate: 'Presente',
        description:
          'Liderei a migração do monólito para uma arquitetura modular em Node.js, reduzindo latência em 40%.\nMentor de 3 engenheiros júnior.\nLancei feature de billing self-service com Stripe (€2M ARR no 1.º ano).',
      },
      {
        id: newId(),
        role: 'Software Engineer',
        company: 'Beta Studio',
        location: 'Porto',
        startDate: 'Mar 2020',
        endDate: 'Dez 2022',
        description:
          'Desenvolvi dashboards em React com TypeScript para clientes B2B.\nAutomatizei pipelines de CI/CD em GitHub Actions.',
      },
    ],
    education: [
      {
        id: newId(),
        degree: 'Mestrado em Engenharia Informática',
        institution: 'Universidade do Porto',
        location: 'Porto',
        startDate: '2017',
        endDate: '2019',
        description: 'Tese: Otimização de consultas em bases de dados distribuídas.',
      },
    ],
    skills: [
      { id: newId(), category: 'Frontend', items: 'React, TypeScript, Tailwind, Vite' },
      { id: newId(), category: 'Backend',  items: 'Node.js, NestJS, PostgreSQL, Redis' },
      { id: newId(), category: 'DevOps',   items: 'Docker, GitHub Actions, AWS, Cloudflare' },
    ],
    languages: [
      { id: newId(), name: 'Português', level: 'Nativo' },
      { id: newId(), name: 'Inglês', level: 'C1' },
      { id: newId(), name: 'Espanhol', level: 'B2' },
    ],
    projects: [
      {
        id: newId(),
        name: 'CVeaver',
        url: 'cveaver.app',
        description: 'CV generator pay-per-use, sem registo. Stripe + PDF client-side.',
        stack: 'React, Vite, Express, Stripe',
      },
    ],
    certificates: [],
  };
}
