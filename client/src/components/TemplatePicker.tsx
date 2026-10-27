import { useMemo } from 'react';
import type { TemplateId } from '../types';
import { TEMPLATES } from '../templates';
import { useT } from '../i18n';
import { useCopy } from '../i18n/workspace';
import { sampleCVByLocale } from '../utils/sampleCvByLocale';

export const templateCategories: Record<TemplateId, 'clean' | 'expressive' | 'formal'> = { modern: 'formal', classic: 'formal', minimal: 'clean', creative: 'expressive', executive: 'formal', compact: 'clean', studio: 'expressive', technical: 'clean', academic: 'formal' };
export const galleryOrder: TemplateId[] = ['studio', 'modern', 'minimal', 'technical', 'classic', 'creative', 'academic', 'executive', 'compact'];
export function TemplateMiniature({ id }: { id: TemplateId }) {
  const { locale } = useT();
  const cv = useMemo(() => ({ ...sampleCVByLocale(locale), template: id }), [locale, id]);
  const Template = TEMPLATES[id].component;
  return <div className={`template-miniature miniature-${id}`} aria-hidden="true"><div className="miniature-paper"><Template cv={cv} /></div></div>;
}
export function TemplatePicker({ value, onChange }: { value: TemplateId; onChange: (id: TemplateId) => void }) {
  const c = useCopy();
  return <div className="template-picker">{galleryOrder.map(id => <button key={id} className={`picker-card ${value === id ? 'selected' : ''}`} onClick={() => onChange(id)} aria-pressed={value === id}>
    <TemplateMiniature id={id} /><span><strong>{TEMPLATES[id].label}</strong><span>{value === id ? '✓' : '↗'}</span></span><small>{c[templateCategories[id]]}</small>
  </button>)}</div>;
}
