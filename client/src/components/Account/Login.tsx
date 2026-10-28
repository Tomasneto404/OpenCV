import { useEffect, useState } from 'react';
import { accountRequest, type AccountUser, type Session } from '../../accounts';
import { useAccountCopy, accountErrorMessage } from '../../i18n/accounts';
import { BrandMark } from '../BrandMark';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { useAuth } from './Auth';
import { useAdminCopy } from '../../i18n/admin';

export function Login({ onNavigate }: { onNavigate: (path: string) => void }) {
  const auth = useAuth();
  const c = useAccountCopy();
  const a = useAdminCopy();
  const [invite] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('invite') || '');
  const [invitedEmail, setInvitedEmail] = useState('');
  const [checking, setChecking] = useState(!!invite);
  const [registrationEnabled, setRegistrationEnabled] = useState(auth.registrationEnabled);
  const [sso, setSSO] = useState(auth.sso);
  const [register, setRegister] = useState(!!invite);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(() => {
    const code = new URLSearchParams(window.location.search).get('error');
    return ['sso_failed', 'sso_unavailable', 'registration_closed', 'invalid_invitation'].includes(code || '') ? code! : '';
  });
  useEffect(() => {
    let active = true;
    accountRequest<Session>('/auth/session').then(session => { if (active) { setRegistrationEnabled(session.registrationEnabled); setSSO(session.sso); } }).catch(() => {});
    if (invite) accountRequest<{ email: string }>('/auth/invitation', 'POST', { invite }).then(data => { if (active) setInvitedEmail(data.email); }).catch(() => { if (active) setError('invalid_invitation'); }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [invite]);
  const canRegister = invitedEmail || (!invite && registrationEnabled);
  return <main className="account-page auth-page">
    <header className="account-header"><button onClick={() => onNavigate('/')} className="btn-link"><BrandMark withWordmark /></button><LanguageSwitcher /></header>
    <section className="auth-card">
      <p className="eyebrow">OpenCV · {c.login}</p><h1>{c.intro}</h1><p className="account-description">{c.subtitle}</p>
      {checking ? <p className="notice" role="status">{a.checking}</p> : invitedEmail ? <p className="notice">{a.invited}</p> : !registrationEnabled && <p className="notice">{a.closed}</p>}
      <form onSubmit={async event => {
        event.preventDefault(); if (busy) return;
        const data = new FormData(event.currentTarget);
        setBusy(true); setError('');
        try {
          const response = await accountRequest<{ user: AccountUser }>(register ? '/auth/register' : '/auth/login', 'POST', { name: data.get('name'), email: data.get('email'), password: data.get('password'), ...(register && invite ? { invite } : {}) });
          auth.accept(response.user); onNavigate('/account');
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'error'); }
        finally { setBusy(false); }
      }}>
        {register && <label>{c.name}<input name="name" className="field" autoComplete="name" required maxLength={100} /></label>}
        <label>{c.email}<input key={invitedEmail} name="email" type="email" className="field" autoComplete="username" required maxLength={254} defaultValue={invitedEmail} readOnly={register && !!invitedEmail} /></label>
        <label>{c.password}<input key={String(register)} name="password" type="password" className="field" autoComplete={register ? 'new-password' : 'current-password'} required minLength={register ? 12 : undefined} maxLength={128} /></label>
        {register && <p className="account-hint">{c.passwordHint}</p>}
        {error && <p className="notice error" role="alert">{error in a ? a[error as keyof typeof a] : accountErrorMessage(new Error(error), c)}</p>}
        <button type="submit" className="btn-primary" disabled={busy || checking || (register && !canRegister)}>{busy ? c.loading : register ? c.register : c.login} →</button>
      </form>
      {(register || canRegister) && <button disabled={busy} className="btn-link auth-switch" onClick={() => { setRegister(!register); setError(''); }}>{register ? c.existing : c.create}</button>}
      {sso && <button disabled={busy || checking || (!!invite && !invitedEmail)} className="btn-ghost auth-sso" onClick={async () => {
        setBusy(true); setError('');
        try { const result = await accountRequest<{ url: string }>('/auth/sso', 'POST', invite ? { invite } : {}); window.location.assign(result.url); }
        catch (cause) { setError(cause instanceof Error ? cause.message : 'sso_unavailable'); setBusy(false); }
      }}>{c.sso} {sso.label} ↗</button>}
      <button className="btn-link auth-public" onClick={() => onNavigate('/builder')}>{c.publicEditor} →</button>
    </section>
  </main>;
}
