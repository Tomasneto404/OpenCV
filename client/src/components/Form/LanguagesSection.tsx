import type { LanguageItem } from '../../types';
import { useT } from '../../i18n';
import { CollectionEditor } from './CollectionEditor';
export function LanguagesSection({ items, onChange }: { items: LanguageItem[]; onChange: (items: LanguageItem[]) => void }) {
  const { t } = useT();
  return <CollectionEditor items={items} onChange={onChange} title={t('builder.sections.languages')} limit={30} fields={[{ key: 'name', wide: false, multiline: false }, { key: 'level', wide: false, multiline: false }]} />;
}
