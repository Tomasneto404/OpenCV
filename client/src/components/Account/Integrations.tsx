import { useEffect, useState } from 'react';
import { notificationChannels, type IntegrationsConfig, type NotificationChannel, type PublicNotificationConfig, type PublicOIDCConfig } from '../../../../shared/integrations';
import { accountRequest, type Session } from '../../accounts';
import { useIntegrationCopy } from '../../i18n/integrations';
import { useAccountCopy, accountErrorMessage } from '../../i18n/accounts';
import { useT } from '../../i18n';
import { useAuth } from './Auth';
import { useToast } from '../Toast';

export function IntegrationSettings() {
  const i = useIntegrationCopy(); const c = useAccountCopy(); const auth = useAuth(); const toast = useToast();
  const [data, setData] = useState<IntegrationsConfig | null>(null); const [error, setError] = useState(''); const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const explain = (cause: unknown) => { const code = cause instanceof Error ? cause.message : ''; return code in i ? i[code as keyof typeof i] : accountErrorMessage(cause, c); };
  useEffect(() => {
    let active = true;
    accountRequest<IntegrationsConfig>('/admin/integrations').then(result => { if (active) setData(result); }).catch(cause => { if (active) setError(explain(cause)); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload, i, c]);
  return <section className="admin-integrations" aria-labelledby="integrations-title">
    <h2 id="integrations-title">{i.title}</h2><p className="account-description">{i.intro}</p>
    {error && <p role="alert" className="notice error">{error}<button className="btn-link" onClick={() => { setError(''); setReload(n => n + 1); }}>{c.retry}</button></p>}
    {!data ? <p role="status">{c.loading}</p> : <>
      {!auth.user?.local && <section className="admin-panel"><h3>{i.recovery}</h3><p className="account-description">{i.recoveryHint}</p><form onSubmit={async event => {
        event.preventDefault(); setBusy(true); setError(''); const values = new FormData(event.currentTarget);
        try { await accountRequest('/admin/local-login', 'POST', { email: values.get('email'), password: values.get('password') }); const session = await accountRequest<Session>('/auth/session'); if (session.user) auth.accept(session.user); toast.push({ kind: 'success', title: i.saved }); }
        catch (cause) { setError(explain(cause)); } finally { setBusy(false); }
      }}><label>{c.email}<input className="field" name="email" type="email" defaultValue={auth.user?.email || ''} maxLength={254} required autoComplete="username" /></label><label>{c.newPassword}<input className="field" name="password" type="password" minLength={12} maxLength={128} required autoComplete="new-password" /></label><button className="btn-primary" disabled={busy}>{i.recoverySave}</button></form></section>}
      <section className="admin-panel" aria-labelledby="oidc-title"><h3 id="oidc-title">{i.sso}</h3><p className="account-description">{i.secretHint}</p>
        <form onSubmit={async event => {
          event.preventDefault(); setBusy(true); setError('');
          try { const oidc = await accountRequest<PublicOIDCConfig>('/admin/integrations/oidc', 'PUT', data.oidc); setData(previous => previous && ({ ...previous, oidc })); toast.push({ kind: 'success', title: i.saved }); }
          catch (cause) { setError(explain(cause)); } finally { setBusy(false); }
        }}>
          <label className="admin-check"><input type="checkbox" checked={data.oidc.enabled} onChange={event => setData({ ...data, oidc: { ...data.oidc, enabled: event.target.checked } })} />{i.enableSSO}</label>
          <div className="integration-fields">{(['issuer', 'clientId', 'clientSecret', 'label'] as const).map(key => <label key={key}>{i[key]}<input className="field" type={key === 'clientSecret' ? 'password' : key === 'issuer' ? 'url' : 'text'} value={data.oidc[key]} autoComplete="off" maxLength={key === 'clientSecret' ? 4096 : key === 'label' ? 60 : 2048} placeholder={key === 'clientSecret' && data.oidc.hasSecret ? i.configured : undefined} onChange={event => setData({ ...data, oidc: { ...data.oidc, [key]: event.target.value } })} /></label>)}</div>
          <label>{i.callback}<input className="field" value={data.oidc.callback} readOnly onClick={event => event.currentTarget.select()} /></label><p className="account-hint">{i.callbackHint}</p>
          <button className="btn-primary" disabled={busy}>{busy ? c.saving : i.save}</button>
        </form>
      </section>
      <h3>{i.notifications}</h3><p className="account-description">{i.notificationsHint}</p>
      <div className="admin-settings-grid integration-channels">{notificationChannels.map(channel => <NotificationSettings key={channel} channel={channel} initial={data.notifications[channel]} />)}</div>
    </>}
  </section>;
}

function NotificationSettings({ channel, initial }: { channel: NotificationChannel; initial: PublicNotificationConfig }) {
  const i = useIntegrationCopy(); const c = useAccountCopy(); const { locale } = useT(); const toast = useToast();
  const [config, setConfig] = useState(initial); const [busy, setBusy] = useState(false); const [testing, setTesting] = useState(false);
  const [error, setError] = useState(''); const [clearToken, setClearToken] = useState(false); const [dirty, setDirty] = useState(false);
  const name = { discord: 'Discord', telegram: 'Telegram', ntfy: 'ntfy', gotify: 'Gotify' }[channel];
  const edit = (next: PublicNotificationConfig) => { setConfig(next); setDirty(true); };
  const explain = (cause: unknown) => { const code = cause instanceof Error ? cause.message : ''; return code in i ? i[code as keyof typeof i] : accountErrorMessage(cause, c); };
  return <details className="admin-panel integration-channel"><summary><strong>{name}</strong><span className={`integration-indicator${config.enabled ? ' enabled' : ''}`} aria-hidden="true" /></summary>
    <form onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError('');
      try { const result = await accountRequest<PublicNotificationConfig>(`/admin/integrations/${channel}`, 'PUT', { ...config, clearToken }); setConfig(result); setClearToken(false); setDirty(false); toast.push({ kind: 'success', title: `${name} · ${i.saved}` }); }
      catch (cause) { setError(explain(cause)); } finally { setBusy(false); }
    }}>
      <label className="admin-check"><input type="checkbox" checked={config.enabled} onChange={event => edit({ ...config, enabled: event.target.checked })} />{i.enable}</label>
      {channel !== 'telegram' && <label>{channel === 'discord' ? i.webhook : i.url}<input className="field" type={channel === 'discord' ? 'password' : 'url'} value={config.url} placeholder={channel === 'discord' && config.hasUrl ? i.configured : undefined} autoComplete="off" maxLength={2048} onChange={event => edit({ ...config, url: event.target.value })} /></label>}
      {channel !== 'discord' && <><label>{channel === 'telegram' ? i.botToken : i.token}<input className="field" type="password" value={config.token} placeholder={config.hasToken ? i.configured : undefined} autoComplete="off" maxLength={2048} onChange={event => { setClearToken(false); edit({ ...config, token: event.target.value }); }} /></label>{config.hasToken && <label className="admin-check"><input type="checkbox" checked={clearToken} onChange={event => { setClearToken(event.target.checked); setDirty(true); }} />{i.removeToken}</label>}</>}
      {channel === 'telegram' && <label>{i.chat}<input className="field" value={config.chatId} maxLength={100} onChange={event => edit({ ...config, chatId: event.target.value })} /></label>}
      {channel === 'ntfy' && <label>{i.topic}<input className="field" value={config.topic} maxLength={128} onChange={event => edit({ ...config, topic: event.target.value })} /></label>}
      {(channel === 'ntfy' || channel === 'gotify') && <p className="account-hint">{channel === 'ntfy' ? i.ntfyHint : i.gotifyHint}</p>}
      <fieldset className="integration-events"><legend>{i.events}</legend>{(['registration', 'pdf_export'] as const).map(event => <label className="admin-check" key={event}><input type="checkbox" checked={config.events.includes(event)} onChange={change => edit({ ...config, events: change.target.checked ? [...config.events, event] : config.events.filter(value => value !== event) })} />{i[event]}</label>)}</fieldset>
      {error && <p className="notice error" role="alert">{error}</p>}
      <div className="account-save-actions"><button className="btn-primary" disabled={busy || testing}>{busy ? c.saving : i.save}</button><button type="button" className="btn-ghost" disabled={busy || testing || dirty || !config.enabled} onClick={async () => {
        setTesting(true); setError('');
        try { await accountRequest(`/admin/integrations/${channel}/test`, 'POST'); toast.push({ kind: 'success', title: i.tested }); }
        catch (cause) { setError(explain(cause)); }
        finally { try { const next = await accountRequest<IntegrationsConfig>('/admin/integrations'); setConfig(next.notifications[channel]); } catch { /* Keep form values if refresh fails. */ } setTesting(false); }
      }}>{testing ? i.testing : i.test}</button></div>
      <p className="account-hint">{i.testHint} {i.secretHint}</p>
      <p className="account-hint" role="status">{config.lastDelivery ? `${i.lastDelivery}: ${new Date(config.lastDelivery.at).toLocaleString(locale)} · ${config.lastDelivery.ok ? i.delivered : i.failed}` : i.noDelivery}</p>
    </form>
  </details>;
}
