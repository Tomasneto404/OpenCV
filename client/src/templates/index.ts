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
import { EditorialTemplate } from './Editorial';

interface TemplateEntry {
  id: TemplateId;
  label: string;
  description: string;
  component: ComponentType<{ cv: CVData }>;
  available: boolean;
  /** Width of the full-bleed coloured sidebar accent in px, measured at the
   *  template's native 794 px width. The PaginatedCanvas uses this so the
   *  inter-page safe-area strips paint the accent colour over the sidebar
   *  region (keeping it full-bleed) and the surface colour over the main
   *  column. Omit / 0 → no sidebar; strips paint the surface colour edge
   *  to edge. */
  sidebarEnd?: number;
  /** Page background colour, painted full-bleed behind the sliced content
   *  and used for the inter-page safe-area strips over the main column.
   *  Defaults to white. */
  surfaceBg?: string;
}

export const TEMPLATES: Record<TemplateId, TemplateEntry> = {
  modern: {
    id: 'modern',
    label: 'Modern',
    description: 'Two-column com sidebar colorida.',
    component: ModernTemplate,
    available: true,
    sidebarEnd: 260,
    surfaceBg: '#ffffff',
  },
  classic: {
    id: 'classic',
    label: 'Classic',
    description: 'Serif, single-column, ATS-friendly.',
    component: ClassicTemplate,
    available: true,
    surfaceBg: '#ffffff',
  },
  minimal: {
    id: 'minimal',
    label: 'Minimal',
    description: 'Espaço branco, hierarquia leve.',
    component: MinimalTemplate,
    available: true,
    surfaceBg: '#ffffff',
  },
  creative: {
    id: 'creative',
    label: 'Creative',
    description: 'Header com cor e cartões destacados.',
    component: CreativeTemplate,
    available: true,
    surfaceBg: '#fafaf7',
  },
  executive: {
    id: 'executive',
    label: 'Executive',
    description: 'Serif premium, double-rule, two-column tail.',
    component: ExecutiveTemplate,
    available: true,
    surfaceBg: '#ffffff',
  },
  compact: {
    id: 'compact',
    label: 'Compact',
    description: 'Compact layout',
    component: EditorialTemplate,
    available: true,
  },
  studio: { id: 'studio', label: 'Studio', description: 'Editorial', component: EditorialTemplate, available: true },
  technical: { id: 'technical', label: 'Technical', description: 'Technical', component: EditorialTemplate, available: true },
  academic: { id: 'academic', label: 'Academic', description: 'Academic', component: EditorialTemplate, available: true },
};
