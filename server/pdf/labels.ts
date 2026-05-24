/**
 * Localised labels used by the PDF templates. Mirrors the client-side
 * dictionaries (cv.sections + cv.contactLabels) — kept in sync manually
 * because the server can't import the client i18n provider.
 *
 * `labelsFor(locale)` returns a fully-resolved map; templates pull
 * everything from there instead of hardcoding Portuguese strings.
 */
import type { Locale } from '../types.js';

export interface CvLabels {
  sections: {
    about:      string;
    experience: string;
    education:  string;
    skills:     string;
    languages:  string;
    projects:   string;
    contact:    string;
  };
  contactLabels: {
    email:    string;
    phone:    string;
    location: string;
    website:  string;
    linkedin: string;
    github:   string;
  };
}

const PT: CvLabels = {
  sections: {
    about: 'Sobre mim', experience: 'Experiência', education: 'Formação',
    skills: 'Competências', languages: 'Idiomas', projects: 'Projetos', contact: 'Contacto',
  },
  contactLabels: {
    email: 'Email', phone: 'Telefone', location: 'Local',
    website: 'Web', linkedin: 'LinkedIn', github: 'GitHub',
  },
};

const EN: CvLabels = {
  sections: {
    about: 'About me', experience: 'Experience', education: 'Education',
    skills: 'Skills', languages: 'Languages', projects: 'Projects', contact: 'Contact',
  },
  contactLabels: {
    email: 'Email', phone: 'Phone', location: 'Location',
    website: 'Website', linkedin: 'LinkedIn', github: 'GitHub',
  },
};

const ES: CvLabels = {
  sections: {
    about: 'Sobre mí', experience: 'Experiencia', education: 'Formación',
    skills: 'Habilidades', languages: 'Idiomas', projects: 'Proyectos', contact: 'Contacto',
  },
  contactLabels: {
    email: 'Email', phone: 'Teléfono', location: 'Ubicación',
    website: 'Web', linkedin: 'LinkedIn', github: 'GitHub',
  },
};

const FR: CvLabels = {
  sections: {
    about: 'À propos', experience: 'Expérience', education: 'Formation',
    skills: 'Compétences', languages: 'Langues', projects: 'Projets', contact: 'Contact',
  },
  contactLabels: {
    email: 'E-mail', phone: 'Téléphone', location: 'Lieu',
    website: 'Site web', linkedin: 'LinkedIn', github: 'GitHub',
  },
};

const DE: CvLabels = {
  sections: {
    about: 'Über mich', experience: 'Erfahrung', education: 'Bildung',
    skills: 'Fähigkeiten', languages: 'Sprachen', projects: 'Projekte', contact: 'Kontakt',
  },
  contactLabels: {
    email: 'E-Mail', phone: 'Telefon', location: 'Ort',
    website: 'Website', linkedin: 'LinkedIn', github: 'GitHub',
  },
};

const MAP: Record<Locale, CvLabels> = { pt: PT, en: EN, es: ES, fr: FR, de: DE };

export function labelsFor(locale: Locale | undefined): CvLabels {
  return MAP[locale ?? 'pt'] ?? PT;
}
