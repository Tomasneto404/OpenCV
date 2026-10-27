import type { ProjectItem } from '../../types';
import { useT } from '../../i18n';
import { CollectionEditor } from './CollectionEditor';
export function ProjectsSection({ items, onChange }: { items: ProjectItem[]; onChange: (items: ProjectItem[]) => void }) {
  const { t } = useT();
  return <CollectionEditor items={items} onChange={onChange} title={t('builder.sections.projects')} limit={50} fields={[{ key: 'name', wide: true, multiline: false }, { key: 'url', wide: true, multiline: false }, { key: 'stack', wide: true, multiline: false }, { key: 'description', wide: true, multiline: true }]} />;
}
