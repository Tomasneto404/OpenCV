/**
 * SMTP delivery of generated CVs.
 *
 * Off by default — when SMTP_* env vars are missing we log a warning and
 * skip silently so the paywall still works without an MTA configured.
 * In production this should always be configured.
 *
 * Required env:
 *   SMTP_HOST       (e.g. smtp.fastmail.com)
 *   SMTP_PORT       (587 typically)
 *   SMTP_USER
 *   SMTP_PASS
 *   SMTP_FROM       (display address; defaults to SMTP_USER)
 *   SMTP_SECURE     ("true" to force TLS; otherwise STARTTLS on 587)
 */
import nodemailer, { type Transporter } from 'nodemailer';

let transporter: Transporter | null = null;
let warned = false;

function getTransport(): Transporter | null {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    if (!warned) {
      console.warn('[mail] SMTP not configured — skipping email delivery. Set SMTP_HOST/USER/PASS to enable.');
      warned = true;
    }
    return null;
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

export interface SendCvOptions {
  to: string;
  pdf: Buffer;
  filename: string;
  /** Approximate user-name for the greeting line. Optional. */
  fullName?: string;
}

/**
 * Send the freshly-generated CV PDF as an email attachment.
 * Returns true on success, false if SMTP wasn't configured or delivery failed.
 * Callers should NOT block the paywall on this — log and move on.
 */
export async function sendCvByEmail(opts: SendCvOptions): Promise<boolean> {
  const t = getTransport();
  if (!t) return false;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
  const name = opts.fullName?.trim() || '';
  const greeting = name ? `Olá ${name},` : 'Olá,';
  try {
    await t.sendMail({
      from,
      to: opts.to,
      subject: 'O teu CV — CVeaver',
      text:
`${greeting}

Aqui vai o teu CV, em anexo, em PDF.

Para atualizar mais tarde, vai a https://cveaver.com, carrega este PDF e edita o que precisares — pagas apenas a tarifa de atualização.

Obrigado por usares o CVeaver.`,
      attachments: [
        { filename: opts.filename, content: opts.pdf, contentType: 'application/pdf' },
      ],
    });
    return true;
  } catch (err) {
    console.error('[mail] send failed:', (err as Error).message);
    return false;
  }
}
