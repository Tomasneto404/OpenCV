import type { TemplateId } from '../types';
import { TEMPLATES } from '../templates';

interface Props {
  value: TemplateId;
  onChange: (id: TemplateId) => void;
}

export function TemplatePicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {Object.values(TEMPLATES).map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            disabled={!t.available}
            onClick={() => t.available && onChange(t.id)}
            className={[
              'rounded-lg p-3 text-left border transition',
              active ? 'border-brand-400 bg-white/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]',
              !t.available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            ].join(' ')}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold">{t.label}</span>
              {!t.available && <span className="text-[10px] uppercase tracking-wide text-white/40">em breve</span>}
            </div>
            <p className="text-[11.5px] text-white/55 leading-snug">{t.description}</p>
          </button>
        );
      })}
    </div>
  );
}
