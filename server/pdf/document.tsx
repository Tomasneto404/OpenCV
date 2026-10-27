import type { ReactElement } from 'react';
import type { DocumentProps } from '@react-pdf/renderer';
import type { CVData } from '../types';
import { EditorialPdf } from './templates/EditorialPdf';
import { ModernPdf } from './templates/ModernPdf';
import { ClassicPdf } from './templates/ClassicPdf';
import { MinimalPdf } from './templates/MinimalPdf';
import { CreativePdf } from './templates/CreativePdf';
import { ExecutivePdf } from './templates/ExecutivePdf';

export function PdfDocument({ cv }: { cv: CVData }): ReactElement<DocumentProps> {
  switch (cv.template) {
    case 'classic':   return <ClassicPdf   cv={cv} />;
    case 'minimal':   return <MinimalPdf   cv={cv} />;
    case 'creative':  return <CreativePdf  cv={cv} />;
    case 'executive': return <ExecutivePdf cv={cv} />;
    case 'compact':
    case 'studio':
    case 'technical':
    case 'academic': return <EditorialPdf cv={cv} />;
    case 'modern':
    default:          return <ModernPdf    cv={cv} />;
  }
}
