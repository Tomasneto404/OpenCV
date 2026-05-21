/**
 * Price formatting — keeps "€1,00" / "€0,50" rendering consistent with the
 * user's locale. Currency is hard-coded EUR (Stripe PT setup).
 */
import type { Locale } from '../i18n/types';

export const PRICES = {
  newCents:    100,
  updateCents: 50,
} as const;

const LOCALE_MAP: Record<Locale, string> = {
  pt: 'pt-PT',
  en: 'en-GB',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
};

export function formatPrice(cents: number, locale: Locale = 'pt'): string {
  return new Intl.NumberFormat(LOCALE_MAP[locale], {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
