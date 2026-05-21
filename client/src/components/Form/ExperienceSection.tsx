import type { ExperienceItem } from '../../types';
import { newId } from '../../types';

interface Props {
  items: ExperienceItem[];
  onChange: (next: ExperienceItem[]) => void;
}

export function ExperienceSection({ items, onChange }: Props) {
  const add = () => onChange([...items, {
    id: newId(), role: '', company: '', location: '', startDate: '', endDate: '', description: '',
  }]);

  const update = (id: string, patch: Partial<ExperienceItem>) =>
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
            <span className="text-xs uppercase tracking-wide text-white/40">Experiência {i + 1}</span>
            <div className="flex gap-1">
              <button className="btn-ghost text-xs px-2 py-1" onClick={() => move(it.id, -1)} disabled={i === 0}>↑</button>
              <button className="btn-ghost text-xs px-2 py-1" onClick={() => move(it.id, +1)} disabled={i === items.length - 1}>↓</button>
              <button className="btn-ghost text-xs px-2 py-1" onClick={() => remove(it.id)}>Remover</button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input className="field" placeholder="Cargo" value={it.role}
              onChange={(e) => update(it.id, { role: e.target.value })} />
            <input className="field" placeholder="Empresa" value={it.company}
              onChange={(e) => update(it.id, { company: e.target.value })} />
            <input className="field" placeholder="Localização" value={it.location}
              onChange={(e) => update(it.id, { location: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className="field" placeholder="Início (Jan 2022)" value={it.startDate}
                onChange={(e) => update(it.id, { startDate: e.target.value })} />
              <input className="field" placeholder="Fim (Presente)" value={it.endDate}
                onChange={(e) => update(it.id, { endDate: e.target.value })} />
            </div>
          </div>
          <textarea className="field" rows={3}
            placeholder="Uma frase por linha. Cada linha será um bullet point."
            value={it.description}
            onChange={(e) => update(it.id, { description: e.target.value })} />
        </div>
      ))}
      <button className="btn-ghost w-full justify-center" onClick={add}>+ Adicionar experiência</button>
    </div>
  );
}
