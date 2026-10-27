import type { EducationItem } from '../../types';
import { useT } from '../../i18n';
import { CollectionEditor } from './CollectionEditor';
export function EducationSection({ items, onChange }: { items: EducationItem[]; onChange: (items: EducationItem[]) => void }) {
  const { t } = useT();
  return <CollectionEditor items={items} onChange={onChange} title={t('builder.sections.education')} limit={20} fields={[{ key: 'degree', wide: true, multiline: false }, { key: 'institution', wide: false, multiline: false }, { key: 'location', wide: false, multiline: false }, { key: 'startDate', wide: false, multiline: false }, { key: 'endDate', wide: false, multiline: false }, { key: 'description', wide: true, multiline: true }]} />;
}
