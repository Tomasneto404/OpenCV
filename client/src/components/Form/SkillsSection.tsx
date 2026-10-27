import type { SkillGroup } from '../../types';
import { useT } from '../../i18n';
import { CollectionEditor } from './CollectionEditor';
export function SkillsSection({ items, onChange }: { items: SkillGroup[]; onChange: (items: SkillGroup[]) => void }) {
  const { t } = useT();
  return <CollectionEditor items={items} onChange={onChange} title={t('builder.sections.skills')} limit={50} fields={[{ key: 'category', wide: true, multiline: false }, { key: 'items', wide: true, multiline: true }]} />;
}
