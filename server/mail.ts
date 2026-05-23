/**
 * Resend-backed email delivery for the freshly-generated CV PDF.
 *
 * Off when RESEND_API_KEY is missing — we log a warning once and let
 * the rest of the paywall flow proceed. In that case the user still
 * gets the PDF (via the download response); only the email copy is
 * skipped. In production this env var must be set.
 *
 * The HTML template is intentionally table-based with 100% inline styles:
 * that's still the only reliable way to render across Gmail desktop,
 * Outlook (which ignores most modern CSS), Apple Mail and the major
 * webmail clients. A plain-text alternative is bundled for clients that
 * strip HTML.
 *
 * Required env:
 *   RESEND_API_KEY   — Resend API key (starts with re_...)
 *   RESEND_FROM      — verified sender, e.g. "CVeaver <noreply@cveaver.com>".
 *                      Domain must be verified in the Resend dashboard
 *                      (DKIM/DMARC) for delivery to inbox.
 */
import { Resend } from 'resend';

let client: Resend | null = null;
let warned = false;

function getClient(): Resend | null {
  if (client) return client;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (!warned) {
      console.warn('[mail] RESEND_API_KEY not set — skipping email delivery. Configure it in .env to enable.');
      warned = true;
    }
    return null;
  }
  client = new Resend(key);
  return client;
}

export interface SendCvOptions {
  to: string;
  pdf: Buffer;
  filename: string;
  /** Approximate user-name for the greeting line. Optional. */
  fullName?: string;
}

export async function sendCvByEmail(opts: SendCvOptions): Promise<boolean> {
  const c = getClient();
  if (!c) return false;

  const from = process.env.RESEND_FROM || 'CVeaver <noreply@cveaver.com>';
  const name = sanitiseName(opts.fullName);

  try {
    const { data, error } = await c.emails.send({
      from,
      to: opts.to,
      subject: 'O teu CV está pronto · CVeaver',
      text: buildPlainText(name),
      html: buildHtml(name),
      attachments: [
        {
          filename: opts.filename,
          /* Resend accepts a Buffer directly, but we send a base64 string
             so the request body stays JSON-safe across SDK versions. */
          content: opts.pdf.toString('base64'),
        },
      ],
      headers: {
        'X-Entity-Ref-ID': 'cveaver-cv-delivery',
      },
    });
    if (error) {
      console.error('[mail] resend rejected:', error.message);
      return false;
    }
    if (data?.id) console.log(`[mail] queued id=${data.id}`);
    return true;
  } catch (err) {
    console.error('[mail] send failed:', (err as Error).message);
    return false;
  }
}

/* ── Templating helpers ──────────────────────────────────────────────── */

function sanitiseName(raw?: string): string {
  if (!raw) return '';
  /* HTML-escape the user-supplied name before we inline it into the
     template. Belt-and-braces — Resend already escapes inputs, but never
     interpolate untrusted strings raw. */
  return raw.trim().slice(0, 80)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildPlainText(name: string): string {
  const greeting = name ? `Olá ${name},` : 'Olá,';
  return `${greeting}

O teu CV está pronto e segue em anexo.

Tudo o que precisares para atualizar mais tarde está guardado dentro do próprio ficheiro: basta voltares a cveaver.com e carregar este PDF — pagas apenas a tarifa de atualização.

Obrigado por usares o CVeaver.

— A equipa CVeaver
https://cveaver.com`;
}

function buildHtml(name: string): string {
  const greeting = name ? `Olá ${name},` : 'Olá,';
  /* Logo URL override is useful while the production domain isn't live
     yet — point it at any HTTPS-served PNG. Defaults to the production
     domain so deploys "just work". */
  const logoUrl = process.env.LOGO_URL || 'https://cveaver.com/logo.png';

  // Brand palette (mirrors index.css)
  const C = {
    brand:   '#98641f',
    brandDk: '#794d16',
    accent:  '#538a4c',
    ink:     '#1c1308',
    inkMute: 'rgba(28,19,8,0.62)',
    inkFain: 'rgba(28,19,8,0.40)',
    bg:      '#f8f4ec',
    card:    '#ffffff',
    border:  'rgba(28,19,8,0.08)',
    accentLine: 'rgba(28,19,8,0.06)',
  };

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="pt">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="color-scheme" content="light"/>
<meta name="supported-color-schemes" content="light"/>
<title>O teu CV — CVeaver</title>
</head>
<body style="margin:0; padding:0; background:${C.bg}; color:${C.ink}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing:antialiased;">

<!-- Hidden preheader (preview text in inbox list) -->
<div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:${C.bg};">
O teu CV está em anexo. Para atualizar mais tarde, carrega este PDF em cveaver.com.
</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${C.bg};">
  <tr>
    <td align="center" style="padding: 40px 16px;">

      <!-- Card -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px; width:100%; background:${C.card}; border:1px solid ${C.border}; border-radius:20px; box-shadow: 0 14px 40px -18px rgba(67,44,20,0.18); overflow:hidden;">

        <!-- Accent stripe -->
        <tr><td style="background: linear-gradient(90deg, ${C.brand} 0%, ${C.accent} 100%); height:4px; font-size:0; line-height:0;">&nbsp;</td></tr>

        <!-- Logo + brand row -->
        <tr>
          <td align="center" style="padding: 36px 32px 8px 32px;">
            <img src="${logoUrl}" alt="CVeaver" width="80" height="80" style="display:block; margin: 0 auto 10px auto; border:0; outline:none; text-decoration:none; height:80px; width:80px;"/>
            <div style="font-family: 'Fraunces', Georgia, 'Times New Roman', serif; font-size:24px; font-weight:700; color:${C.ink}; letter-spacing:-0.01em;">
              CVeaver
            </div>
          </td>
        </tr>

        <!-- Hero -->
        <tr>
          <td align="center" style="padding: 8px 32px 24px 32px;">
            <p style="margin:0 0 8px 0; font-size:12px; letter-spacing:0.20em; text-transform:uppercase; color:${C.brand}; font-weight:600;">
              CV pronto
            </p>
            <h1 style="margin:0 0 12px 0; font-family:'Fraunces', Georgia, serif; font-size:32px; line-height:1.15; font-weight:700; color:${C.ink}; letter-spacing:-0.02em;">
              O teu CV está pronto.
            </h1>
            <p style="margin:0; font-size:15px; line-height:1.55; color:${C.inkMute}; max-width: 440px;">
              Segue em anexo, em PDF, pronto a enviar.
            </p>
          </td>
        </tr>

        <!-- Greeting block -->
        <tr>
          <td style="padding: 8px 40px 24px 40px;">
            <p style="margin:0 0 12px 0; font-size:15px; line-height:1.6; color:${C.ink};">
              ${greeting}
            </p>
            <p style="margin:0; font-size:15px; line-height:1.6; color:${C.inkMute};">
              Obrigado por usares o CVeaver. Esperamos que o teu CV abra a próxima porta — boa sorte.
            </p>
          </td>
        </tr>

        <!-- Info box: update info -->
        <tr>
          <td style="padding: 0 40px 16px 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${C.border}; border-radius:14px; background:${C.card};">
              <tr>
                <td style="padding: 18px 20px;">
                  <p style="margin:0 0 6px 0; font-size:11px; letter-spacing:0.18em; text-transform:uppercase; color:${C.accent}; font-weight:600;">
                    Atualizações futuras
                  </p>
                  <p style="margin:0; font-size:14px; line-height:1.55; color:${C.inkMute};">
                    Guarda este PDF. Quando quiseres mudar algo, basta voltar a
                    <a href="https://cveaver.com" style="color:${C.brand}; text-decoration:underline; font-weight:500;">cveaver.com</a>,
                    carregar este ficheiro e editar — só pagas a tarifa de atualização.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td align="center" style="padding: 8px 40px 36px 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
              <tr>
                <td align="center" style="border-radius:10px; background:${C.brand}; box-shadow: 0 8px 24px -10px rgba(152,100,31,0.5);">
                  <a href="https://cveaver.com" target="_blank" rel="noopener" style="display:inline-block; padding: 12px 28px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size:15px; font-weight:500; color:#ffffff; text-decoration:none; border-radius:10px;">
                    Visitar cveaver.com
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding: 0 32px;"><div style="height:1px; background:${C.accentLine}; line-height:1px; font-size:0;">&nbsp;</div></td></tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="padding: 22px 32px 32px 32px;">
            <p style="margin:0 0 4px 0; font-size:12px; color:${C.inkMute};">
              Feito em Portugal · 🐾
            </p>
            <p style="margin:0; font-size:11px; color:${C.inkFain};">
              Recebeste este email porque pagaste para gerar um CV em cveaver.com.
            </p>
          </td>
        </tr>
      </table>

      <!-- Bottom legal -->
      <p style="margin:16px 0 0 0; font-size:11px; color:${C.inkFain}; max-width:600px;">
        © ${new Date().getFullYear()} CVeaver · <a href="https://cveaver.com/terms" style="color:${C.inkMute}; text-decoration:underline;">Termos</a> · <a href="https://cveaver.com/support" style="color:${C.inkMute}; text-decoration:underline;">Suporte</a>
      </p>

    </td>
  </tr>
</table>

</body>
</html>`;
}
