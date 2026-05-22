/**
 * PDF template switch — maps cv.template to the matching @react-pdf component.
 *
 * The `compact` placeholder doesn't have a PDF renderer; if a CV somehow ends
 * up with that id at PDF time we fall back to Modern so the user gets *some*
 * valid PDF (TemplatePicker already prevents selecting `compact`).
 */
import type { ReactElement } from 'react';
import type { CVData } from '../types';
import { ModernPdf } from './templates/ModernPdf';
import { ClassicPdf } from './templates/ClassicPdf';
import { MinimalPdf } from './templates/MinimalPdf';
import { CreativePdf } from './templates/CreativePdf';
import { ExecutivePdf } from './templates/ExecutivePdf';

export function PdfDocument({ cv }: { cv: CVData }): ReactElement {
  switch (cv.template) {
    case 'classic':   return <ClassicPdf   cv={cv} />;
    case 'minimal':   return <MinimalPdf   cv={cv} />;
    case 'creative':  return <CreativePdf  cv={cv} />;
    case 'executive': return <ExecutivePdf cv={cv} />;
    case 'compact':
    case 'modern':
    default:          return <ModernPdf    cv={cv} />;
  }
}
