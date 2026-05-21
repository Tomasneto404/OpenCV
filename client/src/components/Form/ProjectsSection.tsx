import type { ProjectItem } from '../../types';
import { newId } from '../../types';

interface Props {
  items: ProjectItem[];
  onChange: (next: ProjectItem[]) => void;
}

export function ProjectsSection({ items, onChange }: Props) {
  const add = () => onChange([...items, { id: newId(), name: '', url: '', description: '', stack: '' }]);
  const update = (id: string, patch: Partial<ProjectItem>) =>
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  const remove = (id: string) => onChange(items.filter((it) => it.id !== id));

  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={it.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide text-white/40">Projeto {i + 1}</span>
            <button className="btn-ghost text-xs px-2 py-1" onClick={() => remove(it.id)}>Remover</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input className="field" placeholder="Nome" value={it.name}
              onChange={(e) => update(it.id, { name: e.target.value })} />
            <input className="field" placeholder="URL" value={it.url}
              onChange={(e) => update(it.id, { url: e.target.value })} />
            <input className="field sm:col-span-2" placeholder="Stack (React, Node, ...)" value={it.stack}
              onChange={(e) => update(it.id, { stack: e.target.value })} />
          </div>
          <textarea className="field" rows={2} placeholder="Descrição"
            value={it.description} onChange={(e) => update(it.id, { description: e.target.value })} />
        </div>
      ))}
      <button className="btn-ghost w-full justify-center" onClick={add}>+ Adicionar projeto</button>
    </div>
  );
}
