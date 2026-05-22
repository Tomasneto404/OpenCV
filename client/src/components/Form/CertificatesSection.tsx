/**
 * Certificates section in the Builder.
 *
 * Lets the user attach PDFs (10 MB each, 50 MB combined, no count limit)
 * which the server appends to the generated CV PDF. By default each
 * certificate is embedded inside a CVeaver-branded "frame" page (name +
 * description + accent color + page indicator). The user can toggle the
 * frame off per-item to fall back to a raw copy of the source page.
 *
 * Real-time UX (Sessão 24):
 *   - Inline thumbnail of page 1 (via pdfjs-dist lazy-loaded).
 *   - Drag-and-drop reorder via @dnd-kit/sortable.
 *   - localStorage quota warning when total > 5 MB (the auto-save in
 *     useCV may start dropping silently above that).
 *
 * Storage model: raw bytes in cv.certificates[i].pdfDataUrl (base64) —
 * self-contained, so re-export/re-edit works without the source files.
 */
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CertificateItem } from '../../types';
import {
  processCertificate, totalCertBytes, formatBytes,
  CERT_TOTAL_CAP, CERT_LOCALSTORAGE_WARN, CertError,
  dataUrlToBytes,
} from '../../utils/certificate';
import { renderPdfThumbnail } from '../../utils/pdfThumbnail';
import { useT } from '../../i18n';

interface Props {
  items: CertificateItem[] | undefined;
  onChange: (next: CertificateItem[]) => void;
}

export function CertificatesSection({ items, onChange }: Props) {
  const certs = items ?? [];
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy,  setBusy]  = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useT();

  const totalBytes = totalCertBytes(certs);
  const overQuotaWarn = totalBytes > CERT_LOCALSTORAGE_WARN;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;

    setError(null);
    setBusy(true);
    try {
      const cert = await processCertificate(file, '', '');
      if (totalBytes + cert.bytes > CERT_TOTAL_CAP) {
        setError(t('certificates.errTotalCap'));
        return;
      }
      onChange([...certs, cert]);
    } catch (err) {
      if (err instanceof CertError) {
        const map: Record<typeof err.code, string> = {
          'too-large': t('certificates.errTooLarge'),
          'not-pdf':   t('certificates.errBadPdf'),
          'encrypted': t('certificates.errEncrypted'),
          'bad-pdf':   t('certificates.errBadPdf'),
        };
        setError(map[err.code]);
      } else {
        setError((err as Error).message);
      }
    } finally {
      setBusy(false);
    }
  };

  const removeAt = (id: string) => onChange(certs.filter((c) => c.id !== id));
  const updateAt = (id: string, patch: Partial<CertificateItem>) =>
    onChange(certs.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = certs.findIndex((c) => c.id === active.id);
    const newIndex = certs.findIndex((c) => c.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(certs, oldIndex, newIndex));
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">{t('certificates.title')}</h3>
        <p className="mt-1 text-[12px] text-[color:var(--color-ink-muted)] leading-relaxed">
          {t('certificates.help')}
        </p>
        <p className="mt-1 text-[11px] text-[color:var(--color-ink-faint)]">
          {t('certificates.totalLabel', { total: formatBytes(totalBytes), cap: formatBytes(CERT_TOTAL_CAP) })}
        </p>
        {overQuotaWarn && (
          <p className="mt-2 text-[11.5px] text-amber-300/85 rounded-md border border-amber-400/30 bg-amber-500/10 px-3 py-2">
            ⚠ {t('certificates.quotaWarn')}
          </p>
        )}
      </div>

      <input ref={fileRef} type="file" accept="application/pdf,.pdf" hidden onChange={onPick} />
      <button
        type="button"
        className="btn-ghost text-sm w-full justify-center"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
      >
        {busy ? t('common.loading') : t('certificates.addCta')}
      </button>

      {error && <p className="text-[12px] text-red-300">{error}</p>}

      {certs.length === 0 ? (
        <p className="text-[12px] text-[color:var(--color-ink-faint)]">{t('certificates.empty')}</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={certs.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2">
              {certs.map((c) => (
                <SortableCard
                  key={c.id}
                  cert={c}
                  onPatch={(patch) => updateAt(c.id, patch)}
                  onRemove={() => removeAt(c.id)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

/* ── Sortable card ───────────────────────────────────────────────────── */

interface CardProps {
  cert: CertificateItem;
  onPatch: (patch: Partial<CertificateItem>) => void;
  onRemove: () => void;
}

function SortableCard({ cert, onPatch, onRemove }: CardProps) {
  const { t } = useT();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cert.id });

  const [thumb, setThumb] = useState<string | null>(null);
  const [thumbBusy, setThumbBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setThumbBusy(true);
    (async () => {
      const res = await renderPdfThumbnail(dataUrlToBytes(cert.pdfDataUrl));
      if (cancelled) return;
      setThumb(res?.dataUrl ?? null);
      setThumbBusy(false);
    })();
    return () => { cancelled = true; };
  }, [cert.pdfDataUrl]);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : 'auto',
  };

  const framed = cert.framed !== false; // default ON

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-glass-bg)] p-3 transition-shadow"
    >
      <div className="flex items-start gap-3">
        {/* Drag handle */}
        <button
          type="button"
          className="mt-1 text-[color:var(--color-ink-faint)] hover:text-[color:var(--color-ink-muted)] cursor-grab active:cursor-grabbing touch-none"
          aria-label={t('certificates.dragHandle')}
          {...attributes}
          {...listeners}
        >
          <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor" aria-hidden>
            <circle cx="7" cy="5" r="1.5" /><circle cx="13" cy="5" r="1.5" />
            <circle cx="7" cy="10" r="1.5" /><circle cx="13" cy="10" r="1.5" />
            <circle cx="7" cy="15" r="1.5" /><circle cx="13" cy="15" r="1.5" />
          </svg>
        </button>

        {/* Thumbnail */}
        <div
          className="shrink-0 w-[92px] h-[122px] rounded-md overflow-hidden border border-[color:var(--color-border)] bg-white flex items-center justify-center"
          style={{ boxShadow: 'var(--shadow-soft)' }}
        >
          {thumb ? (
            <img src={thumb} alt="" className="w-full h-full object-contain" draggable={false} />
          ) : thumbBusy ? (
            <span className="text-[10px] text-[color:var(--color-ink-faint)]">…</span>
          ) : (
            <span className="text-[10px] text-[color:var(--color-ink-faint)] uppercase font-mono">PDF</span>
          )}
        </div>

        {/* Fields + meta */}
        <div className="flex-1 min-w-0 space-y-2">
          <input
            className="field text-sm"
            placeholder={t('certificates.namePlaceholder')}
            value={cert.name}
            onChange={(e) => onPatch({ name: e.target.value })}
          />
          <input
            className="field text-sm"
            placeholder={t('certificates.description')}
            value={cert.description}
            onChange={(e) => onPatch({ description: e.target.value })}
          />
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-[11px] text-[color:var(--color-ink-faint)]">
              {t('certificates.sizeLabel', {
                size: formatBytes(cert.bytes),
                pages: cert.pageCount,
                pageLabel: cert.pageCount === 1 ? t('certificates.page') : t('certificates.pages'),
              })}
            </p>

            <label className="inline-flex items-center gap-2 text-[11.5px] text-[color:var(--color-ink-muted)] cursor-pointer">
              <input
                type="checkbox"
                className="accent-[color:var(--color-brand-500)]"
                checked={framed}
                onChange={(e) => onPatch({ framed: e.target.checked })}
              />
              <span title={t('certificates.framedHelp')}>{t('certificates.framed')}</span>
            </label>
          </div>
        </div>

        {/* Remove */}
        <button
          type="button"
          className="text-[color:var(--color-ink-faint)] hover:text-red-400 text-lg leading-none"
          onClick={onRemove}
          aria-label={t('common.remove')}
        >×</button>
      </div>
    </li>
  );
}
