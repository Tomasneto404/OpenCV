import type { LanguageItem } from '../../types';
import { newId } from '../../types';

interface Props {
  items: LanguageItem[];
  onChange: (next: LanguageItem[]) => void;
}

export function LanguagesSection({ items, onChange }: Props) {
  const add = () => onChange([...items, { id: newId(), name: '', level: '' }]);
  const update = (id: string, patch: Partial<LanguageItem>) =>
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id: string) => onChange(items.filter((it) => it.id !== id));

  return (
    <div className="space-y-3">
      {items.map((it) => (
        <div key={it.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
          <input className="field" placeholder="Idioma" value={it.name}
            onChange={(e) => update(it.id, { name: e.target.value })} />
          <input className="field" placeholder="Nível (Nativo, C1, B2, ...)" value={it.level}
            onChange={(e) => update(it.id, { level: e.target.value })} />
          <button className="btn-ghost text-xs px-2 py-2" onClick={() => remove(it.id)}>✕</button>
        </div>
      ))}
      <button className="btn-ghost w-full justify-center" onClick={add}>+ Adicionar idioma</button>
    </div>
  );
}
