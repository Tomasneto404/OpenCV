import type { CVData } from '../types';

export type SectionKey =
  | 'template' | 'personal' | 'summary'
  | 'experience' | 'education' | 'skills' | 'languages' | 'projects' | 'certificates';

export interface SectionStatus {
  /** "filled" | "empty" — drives a green check / dot in the chip */
  state: 'filled' | 'empty';
  /** For collection sections: how many items. For text sections: 1 if filled else 0. */
  count: number;
}

const REQUIRED_PERSONAL: (keyof CVData['personal'])[] = ['fullName', 'email'];

export function sectionStatus(cv: CVData, key: SectionKey): SectionStatus {
  switch (key) {
    case 'template':
      return { state: 'filled', count: 0 };
    case 'personal': {
      const filled = REQUIRED_PERSONAL.every((k) => (cv.personal[k] ?? '').toString().trim().length > 0);
      return { state: filled ? 'filled' : 'empty', count: 0 };
    }
    case 'summary':
      return { state: cv.summary.trim().length >= 20 ? 'filled' : 'empty', count: 0 };
    case 'experience':
      return { state: cv.experience.length > 0 ? 'filled' : 'empty', count: cv.experience.length };
    case 'education':
      return { state: cv.education.length > 0 ? 'filled' : 'empty', count: cv.education.length };
    case 'skills':
      return { state: cv.skills.length > 0 ? 'filled' : 'empty', count: cv.skills.length };
    case 'languages':
      return { state: cv.languages.length > 0 ? 'filled' : 'empty', count: cv.languages.length };
    case 'projects':
      return { state: cv.projects.length > 0 ? 'filled' : 'empty', count: cv.projects.length };
    case 'certificates': {
      const n = cv.certificates?.length ?? 0;
      return { state: n > 0 ? 'filled' : 'empty', count: n };
    }
  }
}

/** Returns how "empty" the CV is — true when only the default template/colour are set. */
export function isCvEmpty(cv: CVData): boolean {
  return (
    cv.personal.fullName.trim() === '' &&
    cv.personal.email.trim() === '' &&
    cv.summary.trim() === '' &&
    cv.experience.length === 0 &&
    cv.education.length === 0 &&
    cv.skills.length === 0 &&
    cv.languages.length === 0 &&
    cv.projects.length === 0
  );
}
