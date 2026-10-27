interface Props { withWordmark?: boolean; size?: number; className?: string; }
export function BrandMark({ withWordmark = false, size = 30, className = '' }: Props) {
  return <span className={`brand ${className}`}>
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect width="32" height="32" rx="9" fill="currentColor"/><path d="M19 7h-8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V11l-4-4Z" stroke="var(--brand-on)" strokeWidth="1.6"/><path d="M18 7v5h5M13 17h6M13 21h4" stroke="var(--brand-on)" strokeWidth="1.6" strokeLinecap="round"/></svg>
    {withWordmark && <span className="wordmark">Open<span>CV</span><span className="brand-dot">.</span></span>}
  </span>;
}
