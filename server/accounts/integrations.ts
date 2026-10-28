import type { AccountStore } from './store';
import { notificationChannels, type NotificationChannel, type NotificationConfig, type NotificationEvent, type OIDCConfig } from '../../shared/integrations';

export type Provider = { issuer: string; clientId: string; clientSecret: string; label: string; allowHttp?: boolean };
export class ConfigurationError extends Error {}
const emptyChannel = (): NotificationConfig => ({ enabled: false, events: ['registration'], url: '', token: '', chatId: '', topic: '' });
const text = (value: unknown, max = 2048) => {
  if (typeof value !== 'string' || value.length > max || /[\r\n\0]/.test(value)) throw new ConfigurationError('invalid_integration');
  return value.trim();
};
function endpoint(value: string) {
  let url: URL; try { url = new URL(value); } catch { throw new ConfigurationError('invalid_integration'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) throw new ConfigurationError('invalid_integration');
  return url;
}

export class Integrations {
  private active = 0;
  constructor(readonly store: AccountStore, readonly origin: string, readonly allowHttp: boolean, fallback?: Provider, private fetcher: typeof fetch = fetch) {
    if (!this.read<OIDCConfig>('oidc')) this.write('oidc', { enabled: !!fallback, issuer: fallback?.issuer || '', clientId: fallback?.clientId || '', clientSecret: fallback?.clientSecret || '', label: fallback?.label || 'SSO' });
  }
  private read<T>(key: string): T | null {
    const row = this.store.db.prepare('SELECT value FROM settings WHERE key = ?').get(`integration:${key}`);
    return row ? JSON.parse(String(row.value)) as T : null;
  }
  private write(key: string, value: unknown) {
    this.store.db.prepare('INSERT INTO settings VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(`integration:${key}`, JSON.stringify(value));
  }
  provider(): Provider | undefined {
    const config = this.read<OIDCConfig>('oidc')!;
    return config.enabled ? { ...config, allowHttp: this.allowHttp } : undefined;
  }
  publicConfig() {
    const config = this.read<OIDCConfig>('oidc')!;
    const notifications = Object.fromEntries(notificationChannels.map(channel => {
      const data = this.channel(channel);
      return [channel, { ...data, token: '', url: channel === 'discord' ? '' : data.url, hasToken: !!data.token, hasUrl: !!data.url, lastDelivery: this.read(`delivery:${channel}`) }];
    }));
    return { oidc: { ...config, clientSecret: '', hasSecret: !!config.clientSecret, callback: new URL('/api/auth/sso/callback', this.origin).href }, notifications };
  }
  saveOIDC(body: Record<string, unknown>) {
    const old = this.read<OIDCConfig>('oidc')!;
    if (typeof body.enabled !== 'boolean') throw new ConfigurationError('invalid_integration');
    const config = { enabled: body.enabled, issuer: text(body.issuer), clientId: text(body.clientId, 512), label: text(body.label, 60) || 'SSO', clientSecret: text(body.clientSecret, 4096) || old.clientSecret };
    if (config.issuer) {
      const url = endpoint(config.issuer);
      if (url.protocol !== 'https:' && !this.allowHttp) throw new ConfigurationError('oidc_https_required');
    }
    if (config.enabled && (!config.issuer || !config.clientId || !config.clientSecret)) throw new ConfigurationError('invalid_integration');
    // Do not disable the only sign-in method of an SSO administrator.
    if (JSON.stringify(config) !== JSON.stringify(old) && this.store.db.prepare("SELECT 1 FROM users WHERE role = 'admin' AND password_hash IS NULL").get()) throw new ConfigurationError('sso_admin_local_required');
    this.write('oidc', config);
    this.store.db.prepare('DELETE FROM oidc_attempts').run();
    return this.publicConfig().oidc;
  }
  channel(channel: NotificationChannel): NotificationConfig { return this.read<NotificationConfig>(channel) || emptyChannel(); }
  saveChannel(channel: NotificationChannel, body: Record<string, unknown>) {
    const old = this.channel(channel);
    if (typeof body.enabled !== 'boolean' || !Array.isArray(body.events) || body.events.some(event => !['registration', 'pdf_export'].includes(event))) throw new ConfigurationError('invalid_integration');
    const config: NotificationConfig = {
      enabled: body.enabled, events: [...new Set(body.events)] as NotificationEvent[], url: text(body.url) || (channel === 'discord' ? old.url : ''),
      token: body.clearToken === true ? '' : text(body.token) || old.token, chatId: text(body.chatId, 100), topic: text(body.topic, 128),
    };
    if (config.url) {
      const url = endpoint(config.url);
      if (channel === 'discord' && (url.protocol !== 'https:' || url.hostname !== 'discord.com' || url.port || !/^\/api(?:\/v\d+)?\/webhooks\/\d+\/[A-Za-z0-9_-]+$/.test(url.pathname))) throw new ConfigurationError('invalid_integration');
    }
    if (channel === 'telegram' && config.token && !/^\d+:[A-Za-z0-9_-]+$/.test(config.token)) throw new ConfigurationError('invalid_integration');
    if (channel === 'ntfy' && config.topic && !/^[A-Za-z0-9_-]{1,128}$/.test(config.topic)) throw new ConfigurationError('invalid_integration');
    if (config.enabled && (
      (channel === 'discord' && !config.url) || (channel === 'telegram' && (!config.token || !config.chatId)) ||
      (channel === 'ntfy' && (!config.url || !config.topic)) || (channel === 'gotify' && (!config.url || !config.token))
    )) throw new ConfigurationError('invalid_integration');
    this.write(channel, config);
    return this.publicConfig().notifications[channel];
  }
  async send(channel: NotificationChannel, message: string) {
    const config = this.channel(channel);
    if (!config.enabled) throw new ConfigurationError('notification_disabled');
    if (this.active >= 20) throw new ConfigurationError('notification_busy');
    this.active++;
    let ok = false; let code = 'network_error';
    try {
      let url: string; let body: unknown; const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (channel === 'discord') {
        url = config.url + '?wait=true'; body = { content: message, allowed_mentions: { parse: [] } };
      } else if (channel === 'telegram') {
        url = `https://api.telegram.org/bot${config.token}/sendMessage`; body = { chat_id: config.chatId, text: message, link_preview_options: { is_disabled: true } };
      } else if (channel === 'ntfy') {
        url = config.url.replace(/\/$/, '') + '/'; body = { topic: config.topic, title: 'OpenCV', message };
        if (config.token) headers.Authorization = `Bearer ${config.token}`;
      } else {
        url = config.url.replace(/\/$/, '') + '/message'; headers['X-Gotify-Key'] = config.token; body = { title: 'OpenCV', message, priority: 5 };
      }
      const response = await this.fetcher(url, { method: 'POST', headers, body: JSON.stringify(body), redirect: 'error', signal: AbortSignal.timeout(8000) });
      ok = response.ok;
      if (channel === 'telegram' && ok) ok = (await response.json() as { ok?: boolean }).ok === true;
      else await response.body?.cancel();
      code = ok ? 'delivered' : `http_${response.status}`;
    } catch { /* Never return provider URLs, tokens or error bodies. */ }
    finally {
      this.active--;
      try { this.write(`delivery:${channel}`, { at: new Date().toISOString(), ok, code }); } catch { /* Database may be closing during shutdown. */ }
    }
    if (!ok) throw new ConfigurationError('notification_failed');
  }
  notify(event: NotificationEvent) {
    const message = event === 'registration' ? 'OpenCV: a new account has been registered.' : 'OpenCV: a CV PDF has been exported.';
    for (const channel of notificationChannels) {
      const config = this.channel(channel);
      if (config.enabled && config.events.includes(event)) void this.send(channel, message).catch(() => {});
    }
  }
}
