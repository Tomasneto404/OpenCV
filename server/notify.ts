/**
 * Owner notifications — "you made a sale" pings.
 *
 * Mirrors mail.ts in spirit: best-effort, never throws, and silently no-ops
 * when unconfigured (warns once). It must NOT be able to break PDF delivery or
 * the Stripe webhook ACK — callers fire it with `void` and we swallow errors.
 *
 * Channel: Telegram Bot API (a single HTTPS POST, no SDK). Create a bot via
 * @BotFather, then read your numeric chat id (message the bot, then check
 * https://api.telegram.org/bot<token>/getUpdates).
 *
 * PII: by default the message carries only sale facts (amount, kind, method,
 * time) — no customer email. The project's stance is "no PII storage", and a
 * Telegram message is transmission to a third party, so email is opt-in via
 * NOTIFY_INCLUDE_EMAIL (full | domain | off).
 *
 * Env:
 *   TELEGRAM_BOT_TOKEN     — bot token from @BotFather (123456:ABC-...)
 *   TELEGRAM_CHAT_ID       — your numeric chat id (or @channelusername)
 *   NOTIFY_INCLUDE_EMAIL   — 'full' | 'domain' | 'off' (default 'off')
 */

export interface SaleInfo {
  /** 'new' | 'update' from the Checkout session metadata. */
  mode?: string | null;
  /** Total charged, in the smallest currency unit (cents). */
  amount?: number | null;
  /** ISO-4217, lower-case as Stripe returns it (e.g. 'eur'). */
  currency?: string | null;
  /** First payment method type on the session (e.g. 'card', 'multibanco'). */
  method?: string | null;
  /** Stripe Checkout session id — for cross-referencing in the Dashboard. */
  sessionId?: string | null;
  /** Customer email, if the caller chooses to pass it (gated by env). */
  email?: string | null;
}

let warned = false;

/** Fire-and-forget owner notification. Resolves to true when a ping was sent. */
export async function notifyOwnerOfSale(info: SaleInfo): Promise<boolean> {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    if (!warned) {
      console.warn('[notify] TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set — sale pings disabled.');
      warned = true;
    }
    return false;
  }

  const text = buildMessage(info);

  try {
    const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
      // Don't let a slow Telegram hang the webhook path.
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) {
      const detail = await resp.text().catch(() => '');
      console.error(`[notify] telegram rejected ${resp.status}: ${detail.slice(0, 200)}`);
      return false;
    }
    console.log('[notify] sale ping sent');
    return true;
  } catch (err) {
    console.error('[notify] send failed:', (err as Error).message);
    return false;
  }
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

function buildMessage(info: SaleInfo): string {
  const kind = info.mode === 'update' ? 'Atualização de CV' : 'CV novo';
  const amount = formatAmount(info.amount, info.currency);
  const method = info.method ? prettyMethod(info.method) : '—';
  const time = new Date().toLocaleString('pt-PT', { timeZone: 'Europe/Lisbon' });

  const lines = [
    '🎉 <b>Nova venda CVeaver</b>',
    `• Tipo: ${kind}`,
    `• Valor: ${amount}`,
    `• Método: ${method}`,
    `• Hora: ${time}`,
  ];

  const emailLine = formatEmailLine(info.email);
  if (emailLine) lines.push(emailLine);

  if (info.sessionId) lines.push(`• Sessão: <code>${escapeHtml(info.sessionId)}</code>`);

  return lines.join('\n');
}

function formatAmount(amount?: number | null, currency?: string | null): string {
  if (typeof amount !== 'number') return '—';
  const cur = (currency || 'eur').toUpperCase();
  try {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: cur }).format(amount / 100);
  } catch {
    return `${(amount / 100).toFixed(2)} ${cur}`;
  }
}

function prettyMethod(m: string): string {
  const map: Record<string, string> = {
    card: 'Cartão',
    multibanco: 'Multibanco',
    mb_way: 'MB WAY',
  };
  return map[m] ?? m;
}

/** Email is opt-in. 'off' (default) → omitted; 'domain' → ***@domain; 'full'. */
function formatEmailLine(email?: string | null): string | null {
  const mode = (process.env.NOTIFY_INCLUDE_EMAIL || 'off').toLowerCase();
  if (mode === 'off' || !email) return null;
  if (mode === 'domain') {
    const at = email.lastIndexOf('@');
    const masked = at > 0 ? `***${escapeHtml(email.slice(at))}` : '***';
    return `• Cliente: ${masked}`;
  }
  return `• Cliente: ${escapeHtml(email)}`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
