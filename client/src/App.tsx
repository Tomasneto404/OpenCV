/**
 * App shell — owns:
 *   - Top-level screen routing via window.location.pathname (no react-router
 *     dependency; the surface is small enough to handle inline).
 *   - The currently-edited CV (via useCV), payment state, signature state.
 *   - The Stripe return URL handler that swaps the user into the Paid screen.
 *
 * Update-tier gate (strict mode):
 *   - `eligibleForUpdate` is true only when the loaded content came from
 *     either an original JSON config or a PDF with a verified signature.
 *   - The Pay button in Builder always uses €1 unless this flag is true.
 *   - Without this, anyone could craft an arbitrary PDF/JSON and claim the
 *     €0.50 update price.
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
import type { CVData } from './types';
import type { SignatureEnvelope, PublicKeyInfo } from './utils/pdfEnhance';
import { createCheckout, fetchCV, saveCV, verifySession } from './api';
import { useToast } from './components/Toast';
import { useT } from './i18n';
import { PRICES, formatPrice } from './utils/format';

type Screen = 'landing' | 'builder' | 'paid' | 'support' | 'faq' | 'terms';

/** Resolve the screen from the current URL pathname. */
function pathToScreen(path: string): Screen {
  if (path.startsWith('/support') || path.startsWith('/verify')) return 'support';
  if (path.startsWith('/faq'))     return 'faq';
  if (path.startsWith('/terms'))   return 'terms';
  return 'landing';
}

export function App() {
  const { cv, replace, undo, redo, clear, hardReset, canUndo, canRedo, saving } = useCV();
  const [screen, setScreen] = useState<Screen>(() => pathToScreen(window.location.pathname));
  /**
   * `mode` doubles as the update-eligibility flag: it only becomes 'update'
   * when the loaded source is verified (JSON or signed PDF). PDFs with
   * invalid/missing signatures stay on 'new'.
   */
  const [mode, setMode] = useState<'new' | 'update'>('new');
  const [paying, setPaying] = useState(false);
  const [signature, setSignature] = useState<SignatureEnvelope | undefined>(undefined);
  const [publicKey, setPublicKey] = useState<PublicKeyInfo | undefined>(undefined);
  const toast = useToast();
  const { t, locale } = useT();

  /** Push a new URL without reloading, switch screen, update history. */
  const navigate = useCallback((path: string) => {
    window.history.pushState({}, '', path);
    setScreen(pathToScreen(path));
  }, []);

  useEffect(() => {
    const onPop = () => setScreen(pathToScreen(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Stripe checkout return handler
  useEffect(() => {
    const url = new URL(window.location.href);
    const success = url.searchParams.get('success');
    const sessionId = url.searchParams.get('session_id');
    const cvId = url.searchParams.get('cv_id');
    const kind = url.searchParams.get('kind') as 'new' | 'update' | null;

    if (success === 'true' && sessionId && cvId) {
      void (async () => {
        const result = await verifySession(sessionId, cvId);
        if (result.paid) {
          try {
            const fetched = await fetchCV(cvId);
            const { ...rest } = fetched as CVData & { savedAt?: number };
            replace(rest as CVData);
          } catch {
            /* fall back to localStorage */
          }
          if (result.signature) setSignature(result.signature);
          if (result.publicKey) setPublicKey(result.publicKey);
          if (kind) setMode(kind);
          setScreen('paid');
        }
        window.history.replaceState({}, '', '/');
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startNew = () => {
    setMode('new');
setSignature(undefined);
    navigate('/');
    setScreen('builder');
  };

  /**
   * Apply a loaded CV from JSON or PDF.
   *
   *   sourceVerified=true  → eligible for €0.50 update tier.
   *   sourceVerified=false → loaded for editing but Pay button stays at €1
   *                          (and we toast to explain why).
   */
  const loadConfig = (
    loaded: CVData,
    opts?: { signature?: SignatureEnvelope; sourceVerified?: boolean },
  ) => {
    replace(loaded);
    const verified = Boolean(opts?.sourceVerified);
    setMode(verified ? 'update' : 'new');
    if (opts?.signature && verified) setSignature(opts.signature);
    else setSignature(undefined);

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
setSignature(undefined);
    navigate('/');
    setScreen('builder');
  };

  const loadSampleInBuilder = () => { replace(sampleCV()); };

  const pay = async () => {
    setPaying(true);
    try {
      const id = await saveCV(cv);
      const url = await createCheckout(id, mode);
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
        signature={signature}
        publicKey={publicKey}
        onReset={() => {
          hardReset();
          setSignature(undefined);
          setPublicKey(undefined);
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
