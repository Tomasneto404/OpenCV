import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountStore } from '../accounts/store';
import { Integrations } from '../accounts/integrations';
import { notificationChannels, type NotificationChannel } from '../../shared/integrations';

const stores: AccountStore[] = [];
afterEach(() => { stores.splice(0).forEach(store => store.db.close()); });
function setup(fetcher: typeof fetch = vi.fn(async () => new Response('{}', { status: 200 }))) {
  const store = new AccountStore(':memory:'); stores.push(store);
  return { store, config: new Integrations(store, 'https://cv.example.com', false, undefined, fetcher) };
}
const secret = 'synthetic-test-secret';
const oidc = { enabled: true, issuer: 'https://id.example.com', clientId: 'opencv-client', clientSecret: secret, label: 'Company' };
const notification = (channel: NotificationChannel) => ({
  enabled: true, events: ['registration'], url: channel === 'discord' ? 'https://discord.com/api/webhooks/123/synthetic-test-webhook' : 'https://push.example.com',
  token: channel === 'telegram' ? '123:synthetic-test-token' : secret, chatId: '-1234', topic: 'opencv',
});

describe('administrator integration configuration', () => {
  it('saves OIDC settings, redacts secrets, retains blank secrets and persists across service instances', () => {
    const { store, config } = setup(); expect(config.provider()).toBeUndefined();
    const result = config.saveOIDC(oidc);
    expect(result).toMatchObject({ hasSecret: true, clientSecret: '', callback: 'https://cv.example.com/api/auth/sso/callback' });
    expect(JSON.stringify(config.publicConfig())).not.toContain(secret);
    config.saveOIDC({ ...oidc, clientSecret: '', label: 'Updated' });
    const reopened = new Integrations(store, 'https://cv.example.com', false, { issuer: 'https://env.example.com', clientId: 'ignored', clientSecret: 'ignored', label: 'ignored' });
    expect(reopened.provider()).toMatchObject({ clientSecret: secret, label: 'Updated', issuer: oidc.issuer });
    reopened.saveOIDC({ ...oidc, enabled: false, clientSecret: '' }); expect(reopened.provider()).toBeUndefined();
  });
  it('rejects unsafe issuer URLs and incomplete OIDC settings without overwriting saved configuration', () => {
    const { config } = setup(); config.saveOIDC(oidc);
    for (const issuer of ['http://id.example.com', 'file:///etc/passwd', 'https://user:pass@id.example.com', 'https://id.example.com/#secret']) expect(() => config.saveOIDC({ ...oidc, issuer })).toThrow();
    expect(() => config.saveOIDC({ ...oidc, clientId: '' })).toThrow(); expect(config.provider()!.issuer).toBe(oidc.issuer);
  });
  it('prevents an SSO-only administrator from removing their only login method', () => {
    const { store, config } = setup(); config.saveOIDC(oidc); const admin = store.ssoUser(oidc.issuer, 'subject', 'Admin', 'admin@example.com');
    expect(admin.role).toBe('admin');
    expect(() => config.saveOIDC({ ...oidc, enabled: false })).toThrow('sso_admin_local_required');
    store.db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run('local hash', admin.id);
    expect(() => config.saveOIDC({ ...oidc, enabled: false })).not.toThrow();
  });
  it.each(notificationChannels)('redacts %s credentials and sends the correct authenticated payload', async channel => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const { config } = setup(fetcher); const input = notification(channel); const saved = config.saveChannel(channel, input);
    expect(saved.token).toBe(''); expect(saved.hasToken).toBe(true);
    if (channel === 'discord') { expect(saved.url).toBe(''); expect(saved.hasUrl).toBe(true); }
    config.saveChannel(channel, { ...input, token: '', ...(channel === 'discord' ? { url: '' } : {}) });
    await config.send(channel, 'OpenCV test');
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.redirect).toBe('error'); expect(init.signal).toBeInstanceOf(AbortSignal);
    const body = JSON.parse(String(init.body));
    if (channel === 'discord') { expect(url).toBe(input.url + '?wait=true'); expect(body).toMatchObject({ content: 'OpenCV test', allowed_mentions: { parse: [] } }); }
    if (channel === 'telegram') { expect(url).toContain(`/bot${input.token}/sendMessage`); expect(body).toMatchObject({ chat_id: '-1234', text: 'OpenCV test' }); }
    if (channel === 'ntfy') { expect(url).toBe('https://push.example.com/'); expect(init.headers).toHaveProperty('Authorization', `Bearer ${secret}`); expect(body).toMatchObject({ topic: 'opencv', message: 'OpenCV test' }); }
    if (channel === 'gotify') { expect(url).toBe('https://push.example.com/message'); expect(init.headers).toHaveProperty('X-Gotify-Key', secret); expect(body).toMatchObject({ message: 'OpenCV test', priority: 5 }); }
    expect(config.publicConfig().notifications[channel].lastDelivery).toMatchObject({ ok: true, code: 'delivered' });
    expect(JSON.stringify(config.publicConfig())).not.toContain(input.token);
  });
  it('does not send when disabled, honors event selection and excludes personal data', async () => {
    const fetcher = vi.fn(async () => new Response('{}', { status: 200 })); const { config } = setup(fetcher);
    config.notify('registration'); expect(fetcher).not.toHaveBeenCalled();
    config.saveChannel('ntfy', notification('ntfy')); config.notify('pdf_export'); expect(fetcher).not.toHaveBeenCalled();
    config.notify('registration'); await vi.waitFor(() => expect(config.publicConfig().notifications.ntfy.lastDelivery).toMatchObject({ ok: true }));
    expect(fetcher).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String((fetcher.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.message).toBe('OpenCV: a new account has been registered.');
    config.saveChannel('ntfy', { ...notification('ntfy'), enabled: false });
    await expect(config.send('ntfy', 'test')).rejects.toThrow('notification_disabled');
  });
  it('sanitizes provider errors and fails Telegram responses with ok=false', async () => {
    for (const reply of [new Response('secret provider diagnostics', { status: 403 }), new Response('{"ok":false}', { status: 200 })]) {
      const { config } = setup(vi.fn(async () => reply)); config.saveChannel('telegram', notification('telegram'));
      await expect(config.send('telegram', 'test')).rejects.toThrow('notification_failed');
      expect(config.publicConfig().notifications.telegram.lastDelivery).toMatchObject({ ok: false });
      expect(JSON.stringify(config.publicConfig())).not.toContain('secret provider diagnostics');
    }
    const { config } = setup(vi.fn(async () => { throw new Error('secret-token network failure'); })); config.saveChannel('ntfy', notification('ntfy'));
    await expect(config.send('ntfy', 'test')).rejects.toThrow('notification_failed');
    expect(JSON.stringify(config.publicConfig())).not.toContain('secret-token');
  });
  it('rejects malformed channels and can clear an optional token', () => {
    const { config } = setup();
    expect(() => config.saveChannel('discord', { ...notification('discord'), url: 'https://evil.example/api/webhooks/123/token' })).toThrow();
    expect(() => config.saveChannel('telegram', { ...notification('telegram'), token: 'invalid' })).toThrow();
    expect(() => config.saveChannel('ntfy', { ...notification('ntfy'), topic: '../admin' })).toThrow();
    expect(() => config.saveChannel('gotify', { ...notification('gotify'), events: ['unknown'] })).toThrow();
    config.saveChannel('ntfy', notification('ntfy')); config.saveChannel('ntfy', { ...notification('ntfy'), token: '', clearToken: true });
    expect(config.channel('ntfy').token).toBe('');
  });
});
