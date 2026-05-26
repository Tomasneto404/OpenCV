/**
 * Personal section — name, contact details, photo, accent colour.
 *
 * Two pieces that warrant a comment:
 *
 *   - Photo: the picker accepts any image but we always normalise to a 480×480
 *     JPEG in memory before storing. Keeps localStorage usage predictable
 *     and avoids HEIC / odd-aspect issues in react-pdf.
 *
 *   - Accent colour: there are three entry points (swatch chip, OS picker,
 *     hex input). The hex input has its own draft state so an in-progress
 *     "#abc" doesn't blink the preview red on every keystroke; we commit to
 *     `accentColor` only when the value is a valid #rrggbb.
 */
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { CVData, PersonalInfo } from '../../types';
import { processPhoto, PhotoError } from '../../utils/photo';
import { useT } from '../../i18n';

interface Props {
  value: PersonalInfo;
  onChange: (next: PersonalInfo) => void;
  accentColor: CVData['accentColor'];
  onAccentChange: (color: string) => void;
  /** On the paid-update flow the name is pinned to the original CV (anti-fraud,
   *  enforced server-side too). When true the name field is read-only. */
  nameLocked?: boolean;
}

const SWATCHES = [
  '#1f2937', // charcoal
  '#334155', // slate
  '#475569', // graphite
  '#1e3a8a', // navy
  '#1d4ed8', // royal blue
  '#0f766e', // teal escuro
  '#166534', // forest
  '#7f1d1d', // burgundy
  '#7c2d12', // copper
];

const HEX_RE = /^#?[0-9a-fA-F]{6}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeHex(input: string): string | null {
  const v = input.trim();
  if (!HEX_RE.test(v)) return null;
  return v.startsWith('#') ? v.toLowerCase() : `#${v.toLowerCase()}`;
}

function isLikelyEmail(v: string): boolean {
  return EMAIL_RE.test(v.trim());
}

export function PersonalSection({ value, onChange, accentColor, onAccentChange, nameLocked = false }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [hexDraft, setHexDraft] = useState(accentColor);
  const [hexInvalid, setHexInvalid] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const { t } = useT();

  useEffect(() => {
    if (!hexInvalid) setHexDraft(accentColor);
  }, [accentColor, hexInvalid]);

  const set = <K extends keyof PersonalInfo>(key: K, v: PersonalInfo[K]) =>
    onChange({ ...value, [key]: v });

  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    setPhotoError(null);
    setPhotoBusy(true);
    try {
      const res = await processPhoto(file);
      set('photoDataUrl', res.dataUrl);
    } catch (err) {
      setPhotoError(err instanceof PhotoError ? err.message : 'Falha a processar a imagem.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = () => {
    set('photoDataUrl', undefined);
    setPhotoError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const applyHexDraft = (raw: string) => {
    setHexDraft(raw);
    const v = normalizeHex(raw);
    if (v) {
      setHexInvalid(false);
      onAccentChange(v);
    } else {
      setHexInvalid(true);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="sm:col-span-2">
        <label className="label flex items-center gap-1.5">
          {t('personal.fullName')}
          {nameLocked && (
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-white/40">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          )}
        </label>
        <input
          className="field disabled:opacity-60 disabled:cursor-not-allowed"
          value={value.fullName}
          onChange={(e) => set('fullName', e.target.value)}
          disabled={nameLocked}
          readOnly={nameLocked}
          title={nameLocked ? t('personal.nameLockedHint') : undefined}
        />
        {nameLocked && <p className="mt-1 text-[11px] text-white/45">{t('personal.nameLockedHint')}</p>}
      </div>
      <div className="sm:col-span-2">
        <label className="label">{t('personal.headline')}</label>
        <input className="field" value={value.headline} onChange={(e) => set('headline', e.target.value)} />
      </div>
      <div>
        <label className="label">{t('personal.email')}</label>
        <input
          className={['field', value.email && !isLikelyEmail(value.email) ? 'border-amber-400/40' : ''].join(' ')}
          type="email" inputMode="email" autoComplete="email"
          value={value.email}
          onChange={(e) => set('email', e.target.value)}
          aria-invalid={value.email ? !isLikelyEmail(value.email) : undefined}
        />
        {value.email && !isLikelyEmail(value.email) && (
          <p className="mt-1 text-[11px] text-amber-300/85">{t('personal.invalidEmail')}</p>
        )}
      </div>
      <div>
        <label className="label">{t('personal.phone')}</label>
        <input className="field" type="tel" inputMode="tel" autoComplete="tel"
          value={value.phone} onChange={(e) => set('phone', e.target.value)} />
      </div>
      <div>
        <label className="label">{t('personal.location')}</label>
        <input className="field" value={value.location} onChange={(e) => set('location', e.target.value)} />
      </div>
      <div>
        <label className="label">{t('personal.website')}</label>
        <input className="field" value={value.website} onChange={(e) => set('website', e.target.value)} />
      </div>
      <div>
        <label className="label">{t('personal.linkedin')}</label>
        <input className="field" value={value.linkedin} onChange={(e) => set('linkedin', e.target.value)} />
      </div>
      <div>
        <label className="label">{t('personal.github')}</label>
        <input className="field" value={value.github} onChange={(e) => set('github', e.target.value)} />
      </div>

      <div className="sm:col-span-2 pt-3 border-t border-white/10">
        <label className="label">{t('personal.photo')}</label>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="h-14 w-14 rounded-full border border-white/10 bg-white/[0.04] overflow-hidden flex items-center justify-center text-white/30 text-[10px]">
            {value.photoDataUrl
              ? <img src={value.photoDataUrl} alt="" className="h-full w-full object-cover" />
              : t('personal.photoPlaceholder')}
          </div>
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-ghost text-xs"
                onClick={() => fileRef.current?.click()} disabled={photoBusy}>
                {photoBusy ? t('personal.photoProcessing') : value.photoDataUrl ? t('personal.photoChange') : t('personal.photoChoose')}
              </button>
              {value.photoDataUrl && (
                <button type="button" className="btn-ghost text-xs" onClick={removePhoto}>{t('common.remove')}</button>
              )}
            </div>
            <p className="text-[11px] text-white/45">{t('personal.photoHelp')}</p>
            {photoError && <p className="text-[11px] text-red-300">{photoError}</p>}
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/*" hidden onChange={onPhoto} />
        </div>
      </div>

      <div className="sm:col-span-2 pt-3 border-t border-white/10">
        <label className="label">{t('personal.accent')}</label>
        <div className="flex flex-wrap items-center gap-2">
          {SWATCHES.map((c) => {
            const active = c.toLowerCase() === accentColor.toLowerCase();
            return (
              <button key={c} type="button"
                onClick={() => { onAccentChange(c); setHexDraft(c); setHexInvalid(false); }}
                title={c} aria-label={`${t('personal.accent')} ${c}`}
                className={[
                  'h-7 w-7 rounded-full ring-1 ring-inset transition',
                  active ? 'ring-white scale-110' : 'ring-white/15 hover:ring-white/40',
                ].join(' ')}
                style={{ backgroundColor: c }}
              />
            );
          })}
          <label className="inline-flex items-center gap-2 ml-1 cursor-pointer">
            <span className="text-[11px] text-white/50">{t('personal.custom')}</span>
            <input
              type="color"
              value={accentColor}
              onChange={(e) => { const v = e.target.value; onAccentChange(v); setHexDraft(v); setHexInvalid(false); }}
              className="h-7 w-7 rounded-full overflow-hidden border border-white/10 bg-transparent cursor-pointer p-0"
              style={{ appearance: 'none' }}
            />
          </label>
          <input
            value={hexDraft}
            onChange={(e) => applyHexDraft(e.target.value)}
            onBlur={() => { if (hexInvalid) { setHexDraft(accentColor); setHexInvalid(false); } }}
            spellCheck={false}
            aria-invalid={hexInvalid || undefined}
            className={[
              'field w-28 text-[12.5px] font-mono uppercase',
              hexInvalid ? 'border-red-400/60 focus:border-red-400' : '',
            ].join(' ')}
            placeholder="#1e3a8a"
          />
        </div>
        {hexInvalid && <p className="mt-1 text-[11px] text-red-300">{t('personal.invalidHex')}</p>}
      </div>
    </div>
  );
}
