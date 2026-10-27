import type { ExperienceItem } from '../../types';
import { useT } from '../../i18n';
import { CollectionEditor } from './CollectionEditor';
export function ExperienceSection({ items, onChange }: { items: ExperienceItem[]; onChange: (items: ExperienceItem[]) => void }) {
  const { t } = useT();
  return <CollectionEditor items={items} onChange={onChange} title={t('builder.sections.experience')} limit={50} fields={[{ key: 'role', wide: true, multiline: false }, { key: 'company', wide: false, multiline: false }, { key: 'location', wide: false, multiline: false }, { key: 'startDate', wide: false, multiline: false }, { key: 'endDate', wide: false, multiline: false }, { key: 'description', wide: true, multiline: true }]} />;
}
