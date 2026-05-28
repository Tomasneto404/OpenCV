/**
 * Umami — privacy-friendly, cookieless analytics. No cookies, no PII, no
 * cross-site tracking, so it needs no consent banner and stays consistent with
 * CVeaver's "no analytics that identify you" promise.
 *
 * Loads ONLY when VITE_UMAMI_WEBSITE_ID is set at build time. Dev builds and
 * any environment without that var configured stay completely analytics-free —
 * nothing is requested, nothing breaks.
 *
 * The script is self-hosted (see VITE_UMAMI_SRC, default analytics.cveaver.com).
 * Its host MUST be allowed by the nginx CSP (script-src + connect-src) in
 * client/nginx.conf — keep the two in sync if you change the domain.
 */
const WEBSITE_ID = import.meta.env.VITE_UMAMI_WEBSITE_ID;
const SRC = import.meta.env.VITE_UMAMI_SRC || 'https://analytics.cveaver.com/script.js';

export function installAnalytics(): void {
  if (!WEBSITE_ID || typeof document === 'undefined') return;
  const s = document.createElement('script');
  s.defer = true;
  s.src = SRC;
  s.setAttribute('data-website-id', WEBSITE_ID);
  document.head.appendChild(s);
}
