import { useState } from 'react';
import { accountRequest, type AccountUser } from '../../accounts';
import { API_URL } from '../../api';
import { useAccountCopy, accountErrorMessage } from '../../i18n/accounts';
import { BrandMark } from '../BrandMark';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { useAuth } from './Auth';

export function Login({ onNavigate }: { onNavigate: (path: string) => void }) {
  const auth = useAuth();
  const c = useAccountCopy();
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(() => {
    const code = new URLSearchParams(window.location.search).get('error');
    return code === 'sso_failed' || code === 'sso_unavailable' ? code : '';
  });
  return <main className="account-page auth-page">
    <header className="account-header"><button onClick={() => onNavigate('/')} className="btn-link"><BrandMark withWordmark /></button><LanguageSwitcher /></header>
    <section className="auth-card">
      <p className="eyebrow">OpenCV · {c.login}</p><h1>{c.intro}</h1><p className="account-description">{c.subtitle}</p>
      <form onSubmit={async event => {
        event.preventDefault(); if (busy) return;
        const data = new FormData(event.currentTarget);
        setBusy(true); setError('');
        try {
          const response = await accountRequest<{ user: AccountUser }>(register ? '/auth/register' : '/auth/login', 'POST', { name: data.get('name'), email: data.get('email'), password: data.get('password') });
          auth.accept(response.user); onNavigate('/account');
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'error'); }
        finally { setBusy(false); }
      }}>
        {register && <label>{c.name}<input name="name" className="field" autoComplete="name" required maxLength={100} /></label>}
        <label>{c.email}<input name="email" type="email" className="field" autoComplete="username" required maxLength={254} /></label>
        <label>{c.password}<input key={String(register)} name="password" type="password" className="field" autoComplete={register ? 'new-password' : 'current-password'} required minLength={register ? 12 : undefined} maxLength={128} /></label>
        {register && <p className="account-hint">{c.passwordHint}</p>}
        {error && <p className="notice error" role="alert">{accountErrorMessage(new Error(error), c)}</p>}
        <button type="submit" className="btn-primary" disabled={busy}>{busy ? c.loading : register ? c.register : c.login} →</button>
      </form>
      <button className="btn-link auth-switch" onClick={() => { setRegister(!register); setError(''); }}>{register ? c.existing : c.create}</button>
      {auth.sso && <a className="btn-ghost auth-sso" href={`${API_URL}/auth/sso`}>{c.sso} {auth.sso.label} ↗</a>}
      <button className="btn-link auth-public" onClick={() => onNavigate('/builder')}>{c.publicEditor} →</button>
    </section>
  </main>;
}
