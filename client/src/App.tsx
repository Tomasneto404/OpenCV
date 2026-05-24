/**
 * App shell — owns:
 *   - Top-level screen routing via window.location.pathname (no react-router
 *     dependency; the surface is small enough to handle inline).
 *   - The currently-edited CV (via useCV), payment state, meta state.
 *   - The Stripe return URL handler that swaps the user into the Paid screen.
 *
 * Update-tier gate:
 *   - `mode` becomes 'update' only when the loaded content came from a
 *     verified source (a JSON config or a server-verified PDF upload).
 *   - The Pay button in Builder always uses €1 unless this flag is true.
 *
 * Meta / badges:
 *   - `currentMeta` carries the editCount + createdAt + lastSentEmail
 *     decoded from the user's previous PDF (update flow). The cipher blob
 *     (`prevPayloadB64`) is passed back to the server when saving so the
 *     chain is tamper-evident.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Landing } from './components/Landing';
import { Builder } from './components/Builder';
import { Paid } from './components/Paid';
import { Pending } from './components/Pending';
import { Support } from './components/Support';
import { FAQ } from './components/FAQ';
import { Terms } from './components/Terms';
import { useCV } from './state/useCV';
import type { CVData, CVMeta } from './types';
import type { Locale } from './i18n/types';
import { createCheckout, fetchCV, saveCV, verifySession } from './api';
import { useToast } from './components/Toast';
import { useT } from './i18n';
import { PRICES, formatPrice } from './utils/format';
import { buildSampleEnhanced } from './utils/sampleAssets';
import { sampleCVByLocale } from './utils/sampleCvByLocale';

// =====================================================================
// FIXME: PAYMENT BYPASS — TEST MODE ONLY · REMOVE BEFORE PRODUCTION
// =====================================================================
// While true, the Pay button skips Stripe entirely. It still saves the CV
// to the server, then jumps straight to the Paid screen which downloads
// the PDF through /dev/pdf (no payment gate). This lets us iterate on the
// full Builder → Paid → Badge flow without burning Stripe test sessions
// or needing SMTP configured.
//
// Set to `false` (or delete the branch in pay() below) before deploying.
// The Builder shows a loud amber banner whenever this is on.
// =====================================================================
export const BYPASS_PAYMENT_FOR_TESTING = false;

// =====================================================================
// BETA flag — payments are not live yet (Stripe in TEST mode).
// =====================================================================
// While true, the UI shows a "Beta" badge + a banner telling visitors the
// payment flow is still in testing (no real charges). The checkout itself
// still runs against Stripe TEST keys.
//
// To go live it should be enough to:
//   1. Swap the Stripe keys to live (sk_live_… on the server,
//      VITE_STRIPE_PUBLISHABLE_KEY=pk_live_… if/when used client-side).
//   2. Set this flag to `false`.
// =====================================================================
export const BETA_PAYMENTS = false;

type Screen = 'landing' | 'builder' | 'paid' | 'pending' | 'support' | 'faq' | 'terms';

function pathToScreen(path: string): Screen {
  if (path.startsWith('/support') || path.startsWith('/verify')) return 'support';
  if (path.startsWith('/faq'))     return 'faq';
  if (path.startsWith('/terms'))   return 'terms';
  return 'landing';
}

export function App() {
  const { cv, replace, undo, redo, clear, hardReset, canUndo, canRedo, saving } = useCV();
  const [screen, setScreen] = useState<Screen>(() => pathToScreen(window.location.pathname));
  const [mode, setMode] = useState<'new' | 'update'>('new');
  const [paying, setPaying] = useState(false);
  /** Meta from the uploaded previous PDF (update flow) or from the latest
   *  paid render (post-payment). Drives the badge chip everywhere. */
  const [currentMeta, setCurrentMeta] = useState<CVMeta | undefined>(undefined);
  /** Opaque ciphertext of the previous payload — passed back to /cv. */
  const [prevPayloadB64, setPrevPayloadB64] = useState<string | undefined>(undefined);
  /** Stripe session + CV id used to redeem the paid PDF. */
  const [paidSessionId, setPaidSessionId] = useState<string | undefined>(undefined);
  const [paidCvId,      setPaidCvId]      = useState<string | undefined>(undefined);
  /**
   * When non-null, the CV currently in state is the localised sample —
   * i.e. it was loaded via "Ver exemplo" / "loadSampleInBuilder" and the
   * user has not yet touched anything. We use this flag to re-translate
   * the demo when the user switches language inside the Builder. Once any
   * user edit lands (handleEdit), we set this to null and the auto-retranslation stops.
   */
  const [sampleLocale, setSampleLocale] = useState<Locale | null>(null);
  /* Suppress the "user-edit" listener while we ourselves are replacing
     the CV because of a sample re-load (locale change). Otherwise the
     subsequent replace() would set sampleLocale back to null. */
  const replacingSampleRef = useRef(false);
  const toast = useToast();
  const { t, locale } = useT();

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setScreen(pathToScreen(path));
  }, []);

  useEffect(() => {
    const onPop = () => setScreen(pathToScreen(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Stripe checkout return handler.
  useEffect(() => {
    const url = new URL(window.location.href);
    const success = url.searchParams.get('success');
    const sessionId = url.searchParams.get('session_id');
    const cvId = url.searchParams.get('cv_id');
    const kind = url.searchParams.get('kind') as 'new' | 'update' | null;

    if (success === 'true' && sessionId && cvId) {
      void (async () => {
        const result = await verifySession(sessionId);
        if (result.paid || result.status) {
          // Restore the paid CV so the Preview matches what was bought.
          try {
            const fetched = await fetchCV(cvId);
            replace(fetched);
          } catch {
            /* fall back to whatever's in localStorage */
          }
          if (kind) setMode(kind);
        }
        if (result.paid) {
          setPaidSessionId(sessionId);
          setPaidCvId(cvId);
          setScreen('paid');
        } else if (result.status) {
          // Session is valid but not yet paid → async method (Multibanco /
          // MB WAY). The webhook will email the PDF once payment confirms.
          setScreen('pending');
        }
        window.history.replaceState({}, '', '/');
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startNew = () => {
    setMode('new');
    setCurrentMeta(undefined);
    setPrevPayloadB64(undefined);
    navigate('/');
    setScreen('builder');
  };

  /**
   * Apply a loaded CV. `verified=true` ⇒ eligible for the update tier and
   * carries the encrypted prev payload + meta for chaining.
   */
  const loadConfig = (
    loaded: CVData,
    opts?: { verified?: boolean; meta?: CVMeta; prevPayloadB64?: string },
  ) => {
    replace(loaded);
    const verified = Boolean(opts?.verified);
    setMode(verified ? 'update' : 'new');
    setCurrentMeta(verified ? opts?.meta : undefined);
    setPrevPayloadB64(verified ? opts?.prevPayloadB64 : undefined);

    if (!verified) {
      toast.push({
        kind: 'info',
        title: t('toast.updateBlockedTitle'),
        body: t('toast.updateBlockedBody', {
          price: formatPrice(PRICES.newCents, locale),
          updatePrice: formatPrice(PRICES.updateCents, locale),
        }),
      });
    }

    navigate('/');
    setScreen('builder');
  };

  const loadSample = async () => {
    // Load the demo CV (in the user's current locale) + enrich with the
    // profile photo and a fictional sample certificate.
    replacingSampleRef.current = true;
    const enriched = await buildSampleEnhanced(sampleCVByLocale(locale));
    replace(enriched);
    setMode('new');
    setCurrentMeta(undefined);
    setPrevPayloadB64(undefined);
    setSampleLocale(locale);
    navigate('/');
    setScreen('builder');
  };

  const loadSampleInBuilder = async () => {
    replacingSampleRef.current = true;
    const enriched = await buildSampleEnhanced(sampleCVByLocale(locale));
    replace(enriched);
    setSampleLocale(locale);
  };

  /* Wraps the useCV replace() for the Builder's onChange so any user-
     initiated edit clears the sample flag. */
  const handleEdit = useCallback((next: CVData) => {
    if (replacingSampleRef.current) {
      replacingSampleRef.current = false;
    } else {
      setSampleLocale(null);
    }
    replace(next);
  }, [replace]);

  /* Clear / undo / redo bypass `handleEdit` (they touch the CV state
     directly via useCV). If we don't also drop the sample flag here, a
     user who clears the form and then switches language sees the sample
     pop back in. Same logic for undo/redo. */
  const handleClear = useCallback(() => { setSampleLocale(null); clear(); }, [clear]);
  const handleUndo  = useCallback(() => { setSampleLocale(null); undo();  }, [undo]);
  const handleRedo  = useCallback(() => { setSampleLocale(null); redo();  }, [redo]);

  /* Re-translate the sample whenever the locale changes — but only if
     the current CV is still the untouched sample. */
  useEffect(() => {
    if (!sampleLocale || sampleLocale === locale) return;
    let cancelled = false;
    void (async () => {
      replacingSampleRef.current = true;
      const enriched = await buildSampleEnhanced(sampleCVByLocale(locale));
      if (cancelled) return;
      replace(enriched);
      setSampleLocale(locale);
    })();
    return () => { cancelled = true; };
  }, [locale, sampleLocale, replace]);

  const pay = async () => {
    if (BETA_PAYMENTS) {
      // Payments (and therefore PDF generation) are disabled during beta.
      toast.push({ kind: 'info', title: t('beta.badge'), body: t('beta.banner') });
      return;
    }
    setPaying(true);
    try {
      const customerEmail = currentMeta?.lastSentEmail ?? undefined;
      // Lock the CV's label language to the current UI locale at pay time,
      // so the generated PDF renders section headings in that language.
      const cvToSave: CVData = { ...cv, locale };
      const id = await saveCV(cvToSave, { prevPayloadB64, customerEmail });

      if (BYPASS_PAYMENT_FOR_TESTING) {
        // TEST MODE — skip Stripe and jump to Paid screen. The Paid screen's
        // download button will hit /dev/pdf instead of the real /pdf endpoint
        // because of the sentinel sessionId='TEST'.
        setPaidSessionId('TEST');
        setPaidCvId(id);
        setScreen('paid');
        setPaying(false);
        return;
      }

      const url = await createCheckout(id, mode, customerEmail);
      window.location.href = url;
    } catch (err) {
      toast.push({ kind: 'error', title: t('toast.paymentFailTitle'), body: (err as Error).message });
      setPaying(false);
    }
  };

  if (screen === 'pending') {
    return (
      <Pending
        cv={cv}
        onReset={() => {
          hardReset();
          setCurrentMeta(undefined);
          setPrevPayloadB64(undefined);
          setMode('new');
          navigate('/');
        }}
      />
    );
  }

  if (screen === 'support') return <Support onBack={() => navigate('/')} />;
  if (screen === 'faq')     return <FAQ     onBack={() => navigate('/')} onNavigate={navigate} />;
  if (screen === 'terms')   return <Terms   onBack={() => navigate('/')} onNavigate={navigate} />;

  if (screen === 'landing') {
    return <Landing onNew={startNew} onLoadConfig={loadConfig} onSample={loadSample} onNavigate={navigate} />;
  }

  if (screen === 'paid') {
    return (
      <Paid
        cv={cv}
        sessionId={paidSessionId}
        cvId={paidCvId}
        initialMeta={currentMeta}
        onMetaUpdate={setCurrentMeta}
        onReset={() => {
          hardReset();
          setCurrentMeta(undefined);
          setPrevPayloadB64(undefined);
          setPaidSessionId(undefined);
          setPaidCvId(undefined);
          setMode('new');
          navigate('/');
        }}
        onEditAgain={() => { setMode('update'); setScreen('builder'); }}
      />
    );
  }

  return (
    <Builder
      cv={cv}
      mode={mode}
      meta={currentMeta}
      onChange={handleEdit}
      onBack={() => navigate('/')}
      onPay={pay}
      paying={paying}
      onUndo={handleUndo}
      onRedo={handleRedo}
      onClear={handleClear}
      canUndo={canUndo}
      canRedo={canRedo}
      saving={saving}
      onLoadSample={loadSampleInBuilder}
    />
  );
}
