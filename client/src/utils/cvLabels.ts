/**
 * CV section labels per locale, mirroring server/pdf/labels.ts.
 *
 * Templates consume `labelsForLocale(cv.locale)` so the on-screen preview
 * matches what the PDF will render. Keeping a separate copy in the client
 * (instead of pulling from the i18n provider) means the preview reflects
 * the CV's own locale field, not the UI locale — which is what users
 * expect when they paid in a given language.
 */
import type { Locale } from '../i18n/types';

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
  sections: { about: 'Sobre mim', experience: 'Experiência', education: 'Formação', skills: 'Competências', languages: 'Idiomas', projects: 'Projetos', contact: 'Contacto' },
  contactLabels: { email: 'Email', phone: 'Telefone', location: 'Local', website: 'Web', linkedin: 'LinkedIn', github: 'GitHub' },
};
const EN: CvLabels = {
  sections: { about: 'About me', experience: 'Experience', education: 'Education', skills: 'Skills', languages: 'Languages', projects: 'Projects', contact: 'Contact' },
  contactLabels: { email: 'Email', phone: 'Phone', location: 'Location', website: 'Website', linkedin: 'LinkedIn', github: 'GitHub' },
};
const ES: CvLabels = {
  sections: { about: 'Sobre mí', experience: 'Experiencia', education: 'Formación', skills: 'Habilidades', languages: 'Idiomas', projects: 'Proyectos', contact: 'Contacto' },
  contactLabels: { email: 'Email', phone: 'Teléfono', location: 'Ubicación', website: 'Web', linkedin: 'LinkedIn', github: 'GitHub' },
};
const FR: CvLabels = {
  sections: { about: 'À propos', experience: 'Expérience', education: 'Formation', skills: 'Compétences', languages: 'Langues', projects: 'Projets', contact: 'Contact' },
  contactLabels: { email: 'E-mail', phone: 'Téléphone', location: 'Lieu', website: 'Site web', linkedin: 'LinkedIn', github: 'GitHub' },
};
const DE: CvLabels = {
  sections: { about: 'Über mich', experience: 'Erfahrung', education: 'Bildung', skills: 'Fähigkeiten', languages: 'Sprachen', projects: 'Projekte', contact: 'Kontakt' },
  contactLabels: { email: 'E-Mail', phone: 'Telefon', location: 'Ort', website: 'Website', linkedin: 'LinkedIn', github: 'GitHub' },
};

const MAP: Record<Locale, CvLabels> = { pt: PT, en: EN, es: ES, fr: FR, de: DE };

export function labelsForLocale(locale: Locale | undefined): CvLabels {
  return MAP[locale ?? 'pt'] ?? PT;
}
