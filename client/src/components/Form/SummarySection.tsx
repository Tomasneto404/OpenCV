interface Props {
  value: string;
  onChange: (next: string) => void;
}

export function SummarySection({ value, onChange }: Props) {
  return (
    <div>
      <label className="label">Resumo profissional</label>
      <textarea className="field" rows={5}
        placeholder="2-4 linhas. Quem és, o que fazes melhor, que valor entregas."
        value={value} onChange={(e) => onChange(e.target.value)} />
      <p className="text-xs text-white/40 mt-1">Sugestão: contextualiza experiência + área de força + objetivo.</p>
    </div>
  );
}
