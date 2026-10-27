import { useFormCopy } from '../../i18n/forms';
export function SummarySection({ value, onChange }: { value: string; onChange: (value:string) => void }) {
  const c=useFormCopy();
  return <div><label className="label" htmlFor="cv-summary">{c.summary}</label><textarea id="cv-summary" className="field" rows={8} maxLength={4096} placeholder={c.summaryHint} value={value} onChange={e=>onChange(e.target.value)} /><p className="summary-hint">{c.summaryHint}</p></div>;
}
