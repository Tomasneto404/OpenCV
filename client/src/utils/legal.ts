/**
 * Legal / GDPR helpers.
 *
 * Two distinct "consent" surfaces, kept in localStorage so we don't ship any
 * tracking server-side:
 *
 *   - Checkout consent (T&C + Privacy + age 16+): explicit, granular,
 *     gated on the Pay button. We store the timestamp + versions so an
 *     audit trail exists locally; if either version bumps the user
 *     re-accepts.
 *
 *   - Privacy notice dismissal: a one-time discreet bar — not a cookie
 *     banner (we use cookieless analytics + no PII), so a single
 *     "Got it" without a Reject option is enough.
 *
 * Version constants live here so the rest of the codebase (Privacy.tsx,
 * Terms.tsx) can read the same date string.
 */
export const TERMS_VERSION   = '2026-05-28';
export const PRIVACY_VERSION = '2026-05-28';

/** Minimum age to give consent to a digital service (PT ePrivacy / RGPD: 16). */
export const MIN_AGE = 16;

const CONSENT_KEY = 'cveaver:checkoutConsent';
const NOTICE_KEY  = 'cveaver:privacyNoticeDismissed';

export interface CheckoutConsent {
  acceptedAt: string;          // ISO timestamp
  termsVersion: string;
  privacyVersion: string;
  ageConfirmed: true;
}

/** Read the stored checkout consent, if still matching the current versions. */
export function readCheckoutConsent(): CheckoutConsent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CheckoutConsent>;
    if (
      parsed.acceptedAt &&
      parsed.ageConfirmed === true &&
      parsed.termsVersion   === TERMS_VERSION &&
      parsed.privacyVersion === PRIVACY_VERSION
    ) {
      return parsed as CheckoutConsent;
    }
    return null;
  } catch {
    return null;
  }
}

/** Persist a fresh consent record. Silent on quota errors. */
export function writeCheckoutConsent(): CheckoutConsent {
  const consent: CheckoutConsent = {
    acceptedAt: new Date().toISOString(),
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    ageConfirmed: true,
  };
  try { window.localStorage.setItem(CONSENT_KEY, JSON.stringify(consent)); } catch { /* quota */ }
  return consent;
}

/** True once the user has dismissed the privacy notice on this device. */
export function isPrivacyNoticeDismissed(): boolean {
  if (typeof window === 'undefined') return true;
  try { return window.localStorage.getItem(NOTICE_KEY) === '1'; } catch { return true; }
}

export function dismissPrivacyNotice(): void {
  try { window.localStorage.setItem(NOTICE_KEY, '1'); } catch { /* quota */ }
}
