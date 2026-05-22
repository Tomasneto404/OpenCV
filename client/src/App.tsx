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
import { useCallback, useEffect, useState } from 'react';
import { Landing } from './components/Landing';
import { Builder } from './components/Builder';
import { Paid } from './components/Paid';
import { Support } from './components/Support';
import { FAQ } from './components/FAQ';
import { Terms } from './components/Terms';
import { useCV } from './state/useCV';
import { sampleCV } from './types';
import type { CVData, CVMeta } from './types';
import { createCheckout, fetchCV, saveCV, verifySession } from './api';
import { useToast } from './components/Toast';
import { useT } from './i18n';
import { PRICES, formatPrice } from './utils/format';

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
export const BYPASS_PAYMENT_FOR_TESTING = true;

type Screen = 'landing' | 'builder' | 'paid' | 'support' | 'faq' | 'terms';

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
        if (result.paid) {
          try {
            const fetched = await fetchCV(cvId);
            replace(fetched);
          } catch {
            /* fall back to whatever's in localStorage */
          }
          if (kind) setMode(kind);
          setPaidSessionId(sessionId);
          setPaidCvId(cvId);
          setScreen('paid');
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

  const loadSample = () => {
    replace(sampleCV());
    setMode('new');
    setCurrentMeta(undefined);
    setPrevPayloadB64(undefined);
    navigate('/');
    setScreen('builder');
  };

  const loadSampleInBuilder = () => { replace(sampleCV()); };

  const pay = async () => {
    setPaying(true);
    try {
      const customerEmail = currentMeta?.lastSentEmail ?? undefined;
      const id = await saveCV(cv, { prevPayloadB64, customerEmail });

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
      onChange={replace}
      onBack={() => navigate('/')}
      onPay={pay}
      paying={paying}
      onUndo={undo}
      onRedo={redo}
      onClear={clear}
      canUndo={canUndo}
      canRedo={canRedo}
      saving={saving}
      onLoadSample={loadSampleInBuilder}
    />
  );
}
