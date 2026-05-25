import type { TemplateId } from '../types';
import { TEMPLATES } from '../templates';
import { useT } from '../i18n';

interface Props {
  value: TemplateId;
  onChange: (id: TemplateId) => void;
}

export function TemplatePicker({ value, onChange }: Props) {
  const { t: tr } = useT();
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
            <div className="flex items-center justify-between gap-1.5 mb-1">
              <span className="text-sm font-semibold truncate min-w-0">{t.label}</span>
              {!t.available && (
                <span className="shrink-0 whitespace-nowrap rounded-full border border-white/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white/45">
                  {tr('landing.templates.comingSoon')}
                </span>
              )}
            </div>
            <p className="text-[11.5px] text-white/55 leading-snug">{t.description}</p>
          </button>
        );
      })}
    </div>
  );
}
