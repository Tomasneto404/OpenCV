/**
 * Tiny dev logger.
 *
 * Off by default. Enable in the browser console with:
 *
 *   localStorage.setItem('opencv:debug', '1')   // enable
 *   localStorage.removeItem('opencv:debug')      // disable
 *
 * Use it instead of bare console.log so production builds don't spam the
 * console for users.
 */

function enabled(): boolean {
  try { return localStorage.getItem('opencv:debug') === '1'; } catch { return false; }
}

/** Returns a tagged logger so you can grep by component in DevTools. */
export function debugLogger(tag: string) {
  const prefix = `[OpenCV:${tag}]`;
  return {
    log:  (...args: unknown[]) => { if (enabled()) console.log(prefix, ...args); },
    warn: (...args: unknown[]) => { if (enabled()) console.warn(prefix, ...args); },
    /** Errors always log — they're rare and worth surfacing. */
    error:(...args: unknown[]) => { console.error(prefix, ...args); },
  };
}
