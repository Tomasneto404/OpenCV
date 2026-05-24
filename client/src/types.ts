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

/** Crypto-strong local id for CV sub-items (experience, education, etc.). */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().slice(0, 8);
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buf = new Uint8Array(4);
    crypto.getRandomValues(buf);
    return Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).slice(2, 10);
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
    accentColor: '#5b3a11',
    personal: {
      fullName: 'Zé Castor',
      headline: 'Engenheiro Civil · Especialista em Pontes de Madeira',
      email: 'ze.castor@cveaver.com',
      phone: '+351 925 678 901',
      location: 'Paços de Ferreira, Portugal',
      website: 'cveaver.com',
      linkedin: 'linkedin.com/in/ze-castor',
      github: '',
    },
    summary:
      'Engenheiro civil com 8 anos de experiência em estruturas de madeira e infraestruturas sustentáveis. Combina rigor técnico com forte espírito de equipa — fruto da formação como escuteiro e do serviço militar. Proativo, apaixonado pela natureza e pelo trabalho de campo. Quando não está a desenhar pontes, está a nadar no Rio Sousa ou a animar a bancada do FC Paços de Ferreira como mascote oficial.',
    experience: [
      {
        id: newId(),
        role: 'Engenheiro Civil Sénior',
        company: 'Pontes & Diques, Lda.',
        location: 'Porto',
        startDate: 'Mar 2022',
        endDate: 'Presente',
        description:
          'Liderança técnica do projeto da Ponte Pedonal do Rio Sousa (40 m de vão, madeira lamelada-colada) — premiada nos PT Wood Construction Awards 2024.\nGestão de equipa de 6 engenheiros e 18 operários, garantindo entrega 2 meses antes do prazo.\nRedução de 18% nos custos de material via fornecimento local certificado FSC.',
      },
      {
        id: newId(),
        role: 'Engenheiro de Projeto',
        company: 'BridgeWorks Portugal',
        location: 'Lisboa',
        startDate: 'Set 2019',
        endDate: 'Fev 2022',
        description:
          'Desenho estrutural de 12 passadiços em parques naturais (Peneda-Gerês, Sintra-Cascais, Vale do Sousa).\nResponsável pelo cumprimento dos Eurocódigos 5 (estruturas de madeira) e estudos de impacto ambiental.\nMentor técnico de 2 engenheiros estagiários.',
      },
      {
        id: newId(),
        role: 'Engenheiro Júnior · Estagiário',
        company: 'CM Paços de Ferreira',
        location: 'Paços de Ferreira',
        startDate: 'Jul 2017',
        endDate: 'Ago 2019',
        description:
          'Apoio na revisão de projetos urbanísticos e licenciamentos de construção.\nFiscalização de obras públicas locais (Centro Cívico, Parque Urbano).',
      },
      {
        id: newId(),
        role: 'Sargento Miliciano · Engenharia',
        company: 'Exército Português · Regimento de Engenharia n.º 3',
        location: 'Espinho',
        startDate: 'Mar 2019',
        endDate: 'Set 2019',
        description:
          'Serviço militar obrigatório no Regimento de Engenharia.\nFormação em construção de pontes Bailey e apoio logístico de campanha.\nDesenvolveu disciplina, capacidade de comando e resiliência sob pressão.',
      },
      {
        id: newId(),
        role: 'Chefe de Patrulha · Voluntariado',
        company: 'Corpo Nacional de Escutas — Agrupamento 314',
        location: 'Paços de Ferreira',
        startDate: '2008',
        endDate: '2017',
        description:
          'Liderança de patrulhas em acampamentos, raids e atividades de pioneirismo.\nFormação em primeiros socorros, orientação e conservação da natureza.\nResponsável por iniciativas locais de limpeza de margens fluviais.',
      },
    ],
    education: [
      {
        id: newId(),
        degree: 'Mestrado em Engenharia Civil — Estruturas',
        institution: 'Faculdade de Engenharia da Universidade do Porto (FEUP)',
        location: 'Porto',
        startDate: '2015',
        endDate: '2017',
        description:
          'Tese: «Comportamento sismo-resistente de pontes em madeira lamelada-colada no Norte de Portugal». Classificação final: 18 valores.',
      },
      {
        id: newId(),
        degree: 'Licenciatura em Engenharia Civil',
        institution: 'Instituto Superior de Engenharia do Porto (ISEP)',
        location: 'Porto',
        startDate: '2012',
        endDate: '2015',
        description: 'Diploma de Mérito · Membro do Núcleo de Estudantes de Engenharia Civil.',
      },
      {
        id: newId(),
        degree: 'Curso de Especialização — Construção de Pontes em Madeira',
        institution: 'CIM-PT · Centro de Inovação em Madeira',
        location: 'Viana do Castelo',
        startDate: '2021',
        endDate: '2021',
        description: 'Formação intensiva certificada em projeto, dimensionamento e execução de pontes em madeira lamelada-colada.',
      },
    ],
    skills: [
      { id: newId(), category: 'Estruturas', items: 'Madeira lamelada-colada, Betão armado, Aço, Eurocódigos 0-9' },
      { id: newId(), category: 'Software',  items: 'AutoCAD, Revit, Robot Structural, SAP2000, QGIS' },
      { id: newId(), category: 'Gestão',    items: 'Liderança de equipa, Orçamentação, Project Management' },
      { id: newId(), category: 'Soft skills', items: 'Proatividade, Trabalho em equipa, Resolução de problemas, Comunicação' },
      { id: newId(), category: 'Interesses', items: 'Natação, Viagens, Conservação da natureza, Pioneirismo' },
    ],
    languages: [
      { id: newId(), name: 'Português', level: 'Nativo' },
      { id: newId(), name: 'Inglês',    level: 'C1 — fluente' },
      { id: newId(), name: 'Espanhol',  level: 'B2' },
      { id: newId(), name: 'Francês',   level: 'A2' },
    ],
    projects: [
      {
        id: newId(),
        name: 'Ponte Pedonal do Rio Sousa',
        url: 'pontes-sousa.pt',
        description: 'Vão de 40 m em madeira lamelada-colada certificada, integrada em zona protegida. Premiada nos PT Wood Construction Awards 2024.',
        stack: 'Pinho-bravo lamelado-colado, Aço inox, Eurocódigo 5',
      },
      {
        id: newId(),
        name: 'Rede de Passadiços do Vale do Sousa',
        url: 'vale-sousa.eco',
        description: 'Conjunto de 12 passadiços ecológicos em zonas húmidas, com impacto ambiental zero e materiais 100% renováveis.',
        stack: 'Madeira termo-tratada, Estacas helicoidais',
      },
      {
        id: newId(),
        name: 'Mascote Oficial do FC Paços de Ferreira',
        url: 'fcpf.pt',
        description: 'Anima a bancada nos jogos em casa do FCPF desde 2021. Já apareceu em mais de 80 jogos oficiais.',
        stack: 'Fato de castor · Cauda à prova de água · Energia infinita',
      },
    ],
    certificates: [],
  };
}
