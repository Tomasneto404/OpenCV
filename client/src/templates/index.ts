/**
 * Registry of available templates. `available: false` entries appear in the
 * picker grayed out with a "coming soon" badge and refuse selection.
 *
 * When adding a new template:
 *   1. Create components/templates/<Name>.tsx for on-screen preview.
 *   2. Create pdf/templates/<Name>Pdf.tsx for PDF rendering.
 *   3. Add an entry here.
 *   4. Wire the switch in pdf/document.tsx.
 *   5. Extend TemplateId in types.ts.
 */
import type { ComponentType } from 'react';
import type { CVData, TemplateId } from '../types';
import { ModernTemplate } from './Modern';
import { ClassicTemplate } from './Classic';
import { MinimalTemplate } from './Minimal';
import { CreativeTemplate } from './Creative';
import { ExecutiveTemplate } from './Executive';
import { CompactTemplate } from './Compact';

interface TemplateEntry {
  id: TemplateId;
  label: string;
  description: string;
  component: ComponentType<{ cv: CVData }>;
  available: boolean;
}

export const TEMPLATES: Record<TemplateId, TemplateEntry> = {
  modern: {
    id: 'modern',
    label: 'Modern',
    description: 'Two-column com sidebar colorida.',
    component: ModernTemplate,
    available: true,
  },
  classic: {
    id: 'classic',
    label: 'Classic',
    description: 'Serif, single-column, ATS-friendly.',
    component: ClassicTemplate,
    available: true,
  },
  minimal: {
    id: 'minimal',
    label: 'Minimal',
    description: 'Espaço branco, hierarquia leve.',
    component: MinimalTemplate,
    available: true,
  },
  creative: {
    id: 'creative',
    label: 'Creative',
    description: 'Header com cor e cartões destacados.',
    component: CreativeTemplate,
    available: true,
  },
  executive: {
    id: 'executive',
    label: 'Executive',
    description: 'Serif premium, double-rule, two-column tail.',
    component: ExecutiveTemplate,
    available: true,
  },
  compact: {
    id: 'compact',
    label: 'Compact',
    description: 'Single-page denso. Em breve.',
    component: CompactTemplate,
    available: false,
  },
};
