import { describe, it, expect } from 'vitest';
import { labelsFor } from '../pdf/labels.ts';

describe('labelsFor', () => {
  it('returns localised section labels per supported locale', () => {
    expect(labelsFor('en').sections.about).toBe('About me');
    expect(labelsFor('es').sections.experience).toBe('Experiencia');
    expect(labelsFor('fr').sections.education).toBe('Formation');
    expect(labelsFor('de').sections.skills).toBe('Fähigkeiten');
  });

  it('defaults to Portuguese when locale is undefined', () => {
    expect(labelsFor(undefined).sections.about).toBe('Sobre mim');
  });

  it('falls back to Portuguese for an unknown locale', () => {
    // @ts-expect-error — exercising the runtime fallback for bad input.
    expect(labelsFor('zz').sections.contact).toBe('Contacto');
  });

  it('exposes contact labels', () => {
    expect(labelsFor('en').contactLabels.phone).toBe('Phone');
    expect(labelsFor('pt').contactLabels.location).toBe('Local');
  });
});
