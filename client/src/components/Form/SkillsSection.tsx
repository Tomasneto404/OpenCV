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

  const move = (id: string, dir: -1 | 1) => {
    const idx = items.findIndex((it) => it.id === id);
    if (idx < 0) return;
    const next = [...items];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={it.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-white/40">Grupo {i + 1}</span>
            <div className="flex gap-1">
              <button className="btn-ghost text-xs px-2 py-1" onClick={() => move(it.id, -1)} disabled={i === 0}>↑</button>
              <button className="btn-ghost text-xs px-2 py-1" onClick={() => move(it.id, +1)} disabled={i === items.length - 1}>↓</button>
              <button className="btn-ghost text-xs px-2 py-1" onClick={() => remove(it.id)}>Remover</button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input className="field" placeholder="Categoria (ex: Frontend)"
              value={it.category} onChange={(e) => update(it.id, { category: e.target.value })} />
            <input className="field sm:col-span-2" placeholder="React, TypeScript, Tailwind, ..."
              value={it.items} onChange={(e) => update(it.id, { items: e.target.value })} />
          </div>
        </div>
      ))}
      <button className="btn-ghost w-full justify-center" onClick={add}>+ Adicionar grupo de competências</button>
    </div>
  );
}
