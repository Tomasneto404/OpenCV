import type { EducationItem } from '../../types';
import { newId } from '../../types';

interface Props {
  items: EducationItem[];
  onChange: (next: EducationItem[]) => void;
}

export function EducationSection({ items, onChange }: Props) {
  const add = () => onChange([...items, {
    id: newId(), degree: '', institution: '', location: '', startDate: '', endDate: '', description: '',
  }]);
  const update = (id: string, patch: Partial<EducationItem>) =>
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id: string) => onChange(items.filter((it) => it.id !== id));

  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={it.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-white/40">Formação {i + 1}</span>
            <button className="btn-ghost text-xs px-2 py-1" onClick={() => remove(it.id)}>Remover</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input className="field" placeholder="Grau / Curso" value={it.degree}
              onChange={(e) => update(it.id, { degree: e.target.value })} />
            <input className="field" placeholder="Instituição" value={it.institution}
              onChange={(e) => update(it.id, { institution: e.target.value })} />
            <input className="field" placeholder="Localização" value={it.location}
              onChange={(e) => update(it.id, { location: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className="field" placeholder="Início" value={it.startDate}
                onChange={(e) => update(it.id, { startDate: e.target.value })} />
              <input className="field" placeholder="Fim" value={it.endDate}
                onChange={(e) => update(it.id, { endDate: e.target.value })} />
            </div>
          </div>
          <textarea className="field" rows={2} placeholder="Descrição (opcional)"
            value={it.description} onChange={(e) => update(it.id, { description: e.target.value })} />
        </div>
      ))}
      <button className="btn-ghost w-full justify-center" onClick={add}>+ Adicionar formação</button>
    </div>
  );
}
