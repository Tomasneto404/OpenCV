import type { SkillGroup } from '../../types';
import { newId } from '../../types';

interface Props {
  items: SkillGroup[];
  onChange: (next: SkillGroup[]) => void;
}

export function SkillsSection({ items, onChange }: Props) {
  const add = () => onChange([...items, { id: newId(), category: '', items: '' }]);
  const update = (id: string, patch: Partial<SkillGroup>) =>
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id: string) => onChange(items.filter((it) => it.id !== id));

  return (
    <div className="space-y-3">
      {items.map((it) => (
        <div key={it.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input className="field" placeholder="Categoria (ex: Frontend)"
              value={it.category} onChange={(e) => update(it.id, { category: e.target.value })} />
            <input className="field sm:col-span-2" placeholder="React, TypeScript, Tailwind, ..."
              value={it.items} onChange={(e) => update(it.id, { items: e.target.value })} />
          </div>
          <button className="text-xs text-white/40 hover:text-white/70" onClick={() => remove(it.id)}>Remover grupo</button>
        </div>
      ))}
      <button className="btn-ghost w-full justify-center" onClick={add}>+ Adicionar grupo de competências</button>
    </div>
  );
}
