/**
 * Builder — the editing surface.
 *
 *   Left pane (≤ 420 px): section chips + active section form.
 *   Right pane: live preview (rendered with the same React components used in
 *               the on-screen preview; the actual PDF goes through react-pdf
 *               at download time).
 *
 * The toolbar shows undo/redo/clear, a "saving / saved" pulse, dev shortcuts
 * (only in `import.meta.env.DEV`), and the primary Pay CTA which switches its
 * label between €1 (new) and €0,50 (update) based on App.tsx's `mode` prop.
 *
 * All visible strings come from the i18n dictionary.
 */
import { useState, type ReactNode } from 'react';
import type { CVData, CVMeta } from '../types';
import { PersonalSection } from './Form/PersonalSection';
import { SummarySection } from './Form/SummarySection';
import { ExperienceSection } from './Form/ExperienceSection';
import { EducationSection } from './Form/EducationSection';
import { SkillsSection } from './Form/SkillsSection';
import { LanguagesSection } from './Form/LanguagesSection';
import { ProjectsSection } from './Form/ProjectsSection';
import { CertificatesSection } from './Form/CertificatesSection';
import { TemplatePicker } from './TemplatePicker';
import { Preview } from './Preview';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { sectionStatus, isCvEmpty, type SectionKey } from '../utils/completion';
import { useT } from '../i18n';
import { PRICES, formatPrice } from '../utils/format';
import { BrandMark } from './BrandMark';
import { Badge } from './Badge';
import { BetaBadge } from './BetaBadge';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { BYPASS_PAYMENT_FOR_TESTING, BETA_PAYMENTS } from '../App';

interface Props {
  cv: CVData;
  mode: 'new' | 'update';
  /** Rank info from the previously-loaded PDF (update flow). Drives the badge chip. */
  meta?: CVMeta;
  onChange: (next: CVData) => void;
  onBack: () => void;
  onPay: () => void;
  paying: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
  saving: boolean;
  onLoadSample: () => void;
}

const SECTION_KEYS: SectionKey[] = [
  'template', 'personal', 'summary', 'experience',
  'education', 'skills', 'languages', 'projects', 'certificates',
];

export function Builder({
  cv, mode, meta, onChange, onBack, onPay, paying,
  onUndo, onRedo, onClear, canUndo, canRedo,
  saving, onLoadSample,
}: Props) {
  const [active, setActive] = useState<SectionKey>('personal');
  const [previewOpen, setPreviewOpen] = useState(false);
  const { t, locale } = useT();

  useKeyboardShortcuts({ onUndo, onRedo });

  /** Helper: replace a top-level CV slice without mutating. */
  const patch = <K extends keyof CVData>(key: K, value: CVData[K]) =>
    onChange({ ...cv, [key]: value });

  const handleClear = () => {
    if (window.confirm(t('builder.actions.clearConfirm'))) onClear();
  };

  const handleLoadSample = () => {
    if (!isCvEmpty(cv) && !window.confirm(t('builder.emptySwitchConfirm'))) return;
    onLoadSample();
  };

  const priceNew    = formatPrice(PRICES.newCents,    locale);
  const priceUpdate = formatPrice(PRICES.updateCents, locale);

  const isPayable = cv.personal.fullName.trim().length > 0;
  const payLabel = BETA_PAYMENTS
    ? t('beta.payDisabled')
    : paying
      ? t('builder.actions.payPreparing')
      : mode === 'update'
        ? t('builder.actions.payUpdate', { updatePrice: priceUpdate })
        : t('builder.actions.payNew',    { price: priceNew });

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 sm:gap-3 border-b border-[color:var(--color-border)] sticky top-0 z-20 bg-[color:var(--color-surface-2)]/85 backdrop-blur">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button className="btn-ghost text-sm shrink-0" onClick={onBack} title={t('builder.backTitle')}>←</button>
          <BrandMark size={36} className="shrink-0" />
          <BetaBadge className="shrink-0" />
          {meta && <Badge meta={meta} compact />}
          <SaveIndicator saving={saving} t={t} />
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <IconBtn onClick={onUndo} disabled={!canUndo} title={t('builder.actions.undo')}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-15-6.7L3 13"/></svg>
          </IconBtn>
          <IconBtn onClick={onRedo} disabled={!canRedo} title={t('builder.actions.redo')}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 15-6.7L21 13"/></svg>
          </IconBtn>
          <IconBtn onClick={handleClear} title={t('builder.actions.clear')}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </IconBtn>

          <IconBtn onClick={() => setPreviewOpen(true)} title={t('builder.actions.preview')} extraClass="lg:hidden">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
          </IconBtn>

          <span className="mx-1 h-5 w-px bg-white/10" />

          <ThemeToggle />

          <LanguageSwitcher />

          <span className="mx-1 h-5 w-px bg-white/10" />

          <div className="hidden md:block text-xs text-white/50 whitespace-nowrap">
            {mode === 'update'
              ? t('builder.modeUpdateCaption', { updatePrice: priceUpdate })
              : t('builder.modeNewCaption',    { price: priceNew })}
          </div>
          <button
            className="btn-primary text-sm whitespace-nowrap"
            onClick={onPay}
            disabled={BETA_PAYMENTS || paying || !isPayable}
            title={BETA_PAYMENTS ? t('beta.badgeTitle') : (isPayable ? '' : t('builder.actions.nameRequired'))}
          >{payLabel}</button>
        </div>
      </nav>

      {!isPayable && (
        <div className="px-4 sm:px-6 py-2 text-[12px] text-amber-200/90 bg-amber-500/10 border-b border-amber-400/15">
          {t('builder.fillNameWarning')}{' '}
          <button className="underline underline-offset-2" onClick={() => setActive('personal')}>{t('builder.fillNameWarningAction')}</button>{' '}
          {t('builder.fillNameWarningTail')}
        </div>
      )}

      {/* FIXME: TEST MODE banner — remove with BYPASS_PAYMENT_FOR_TESTING. */}
      {BYPASS_PAYMENT_FOR_TESTING && (
        <div className="px-4 sm:px-6 py-2 text-[12px] text-amber-100 bg-amber-600/30 border-b border-amber-400/40 text-center font-medium tracking-wide">
          ⚠ TEST MODE — botão de pagar ignora o Stripe e descarrega directo. Lembra-te de remover antes de produção.
        </div>
      )}

      {/* Beta banner — payments not live yet. Hidden once BETA_PAYMENTS is off. */}
      {BETA_PAYMENTS && !BYPASS_PAYMENT_FOR_TESTING && (
        <div className="px-4 sm:px-6 py-2 text-[12px] text-center border-b text-amber-800 bg-amber-400/15 border-amber-500/30 dark:text-amber-200/90 dark:bg-amber-500/10 dark:border-amber-400/15">
          {t('beta.banner')}
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-0">
        <aside className="border-r border-white/5 p-4 sm:p-5 space-y-4 lg:max-h-[calc(100vh-65px)] overflow-y-auto">
          <div className="flex flex-wrap gap-1.5">
            {SECTION_KEYS.map((key) => {
              const st = sectionStatus(cv, key);
              const isActive = active === key;
              const label = t(`builder.sections.${key}` as const);
              return (
                <button key={key}
                  onClick={() => setActive(key)}
                  className={[
                    'group inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition',
                    isActive
                      ? 'bg-white/10 border-white/20 text-white'
                      : 'bg-transparent border-white/10 text-white/55 hover:text-white/85 hover:border-white/15',
                  ].join(' ')}
                >
                  <span>{label}</span>
                  {key !== 'template' && <SectionBadge state={st.state} count={st.count} />}
                </button>
              );
            })}
          </div>

          {isCvEmpty(cv) && (
            <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] p-3 flex items-start gap-3">
              <div className="h-7 w-7 rounded-md bg-gradient-to-br from-brand-500/30 to-accent-500/30 border border-white/10 flex items-center justify-center text-white/80">✨</div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] text-white/80 leading-snug">{t('builder.emptyHint')}</p>
                <button className="mt-2 text-[12px] text-brand-300 hover:text-brand-200 underline underline-offset-4" onClick={handleLoadSample}>
                  {t('builder.emptyCta')}
                </button>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
            {active === 'template' && (
              <TemplatePicker value={cv.template} onChange={(t2) => patch('template', t2)} />
            )}
            {active === 'personal' && (
              <PersonalSection
                value={cv.personal}
                onChange={(p) => patch('personal', p)}
                accentColor={cv.accentColor}
                onAccentChange={(c) => patch('accentColor', c)}
              />
            )}
            {active === 'summary'      && <SummarySection      value={cv.summary} onChange={(s) => patch('summary', s)} />}
            {active === 'experience'   && <ExperienceSection   items={cv.experience} onChange={(v) => patch('experience', v)} />}
            {active === 'education'    && <EducationSection    items={cv.education}  onChange={(v) => patch('education',  v)} />}
            {active === 'skills'       && <SkillsSection       items={cv.skills}     onChange={(v) => patch('skills',     v)} />}
            {active === 'languages'    && <LanguagesSection    items={cv.languages}  onChange={(v) => patch('languages',  v)} />}
            {active === 'projects'     && <ProjectsSection     items={cv.projects}   onChange={(v) => patch('projects',   v)} />}
            {active === 'certificates' && <CertificatesSection items={cv.certificates} onChange={(v) => patch('certificates', v)} />}
          </div>
        </aside>

        <main className="hidden lg:block p-6 lg:p-8 bg-black/20 overflow-auto max-h-[calc(100vh-65px)]">
          <Preview cv={cv} />
        </main>

        {previewOpen && (
          <div className="lg:hidden fixed inset-0 z-30 bg-black/80 backdrop-blur-sm flex flex-col">
            <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
              <span className="text-sm text-white/80">{t('builder.mobilePreviewLabel')}</span>
              <button className="btn-ghost text-sm" onClick={() => setPreviewOpen(false)}>{t('common.close')} ✕</button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-black/40">
              <Preview cv={cv} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function IconBtn({ onClick, disabled, title, children, extraClass = '' }: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: ReactNode;
  extraClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={[
        'inline-flex items-center justify-center h-8 w-8 rounded-md border transition',
        disabled
          ? 'border-white/5 text-white/25 cursor-not-allowed'
          : 'border-white/10 text-white/75 hover:text-white hover:bg-white/5 hover:border-white/20',
        extraClass,
      ].join(' ')}
    >{children}</button>
  );
}

function SectionBadge({ state, count }: { state: 'filled' | 'empty'; count: number }) {
  if (state === 'filled' && count > 0) {
    return (
      <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-emerald-400/15 text-emerald-300 text-[10px] font-semibold">
        {count}
      </span>
    );
  }
  if (state === 'filled') return <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />;
  return <span className="h-1.5 w-1.5 rounded-full bg-white/15" />;
}

function SaveIndicator({ saving, t }: { saving: boolean; t: (k: 'common.saving' | 'common.saved') => string }) {
  return (
    <span
      className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-white/45"
      title="Os teus dados são guardados localmente no browser"
    >
      <span
        className={[
          'h-1.5 w-1.5 rounded-full transition-colors',
          saving ? 'bg-amber-300 animate-pulse' : 'bg-emerald-400',
        ].join(' ')}
        aria-live="polite"
      />
      {saving ? t('common.saving') : t('common.saved')}
    </span>
  );
}
