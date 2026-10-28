import { useEffect, useState } from 'react';
import { accountRequest, type CVSummary } from '../../accounts';
import { useAccountCopy, accountErrorMessage } from '../../i18n/accounts';
import { useT } from '../../i18n';
import { emptyCV } from '../../types';
import { BrandMark } from '../BrandMark';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { ThemeToggle } from '../ThemeToggle';
import { useAuth } from './Auth';
import { useToast } from '../Toast';
import { useAdminCopy } from '../../i18n/admin';

export function Library({ onNavigate }: { onNavigate: (path: string) => void }) {
  const auth = useAuth(); const c = useAccountCopy(); const { locale } = useT(); const toast = useToast();
  const a = useAdminCopy();
  const [cvs, setCVs] = useState<CVSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    accountRequest<{ cvs: CVSummary[] }>('/cvs').then(data => { if (active) setCVs(data.cvs); }).catch(cause => { if (active) setError(accountErrorMessage(cause, c)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload, c]);
  return <main className="account-page library-page">
    <header className="account-header"><button className="btn-link" onClick={() => onNavigate('/')}><BrandMark withWordmark /></button><div className="nav-actions"><ThemeToggle /><LanguageSwitcher /><button className="btn-ghost" disabled={busy} onClick={async () => {
      setBusy(true); try { await auth.logout(); onNavigate('/'); } catch (cause) { setError(accountErrorMessage(cause, c)); } finally { setBusy(false); }
    }}>{c.logout}</button></div></header>
    <section className="library-heading"><div><p className="eyebrow">{auth.user?.name}</p><h1>{c.library}</h1><p className="account-description">{c.libraryIntro}</p></div><button className="btn-primary" disabled={busy} onClick={async () => {
      setBusy(true); setError('');
      try { const saved = await accountRequest<CVSummary>('/cvs', 'POST', { title: c.untitled, cv: { ...emptyCV(), locale } }); onNavigate(`/builder/${saved.id}`); }
      catch (cause) { setError(accountErrorMessage(cause, c)); } finally { setBusy(false); }
    }}>＋ {c.newCV}</button></section>
    <div className="library-links"><button className="btn-link library-public" onClick={() => onNavigate('/builder')}>{c.publicEditor} →</button>{auth.user?.role === 'admin' && <button className="btn-ghost" onClick={() => onNavigate('/admin')}>{a.admin} ↗</button>}</div>
    {error && <div className="notice error" role="alert">{error}<button className="btn-link" onClick={() => setReload(n => n + 1)}>{c.retry}</button></div>}
    {loading ? <p role="status">{c.loading}</p> : cvs.length === 0 ? <div className="library-empty"><span aria-hidden="true">▤</span><h2>{c.empty}</h2><p>{c.emptyHint}</p></div> : <div className="library-grid">{cvs.map(cv => <article className="saved-cv-card" key={cv.id}>
      <div className="saved-cv-icon" aria-hidden="true">▤</div><h2>{cv.title}</h2><time dateTime={cv.updatedAt}>{new Date(cv.updatedAt).toLocaleString(locale)}</time>
      <div className="saved-cv-actions"><button className="btn-primary" onClick={() => onNavigate(`/builder/${cv.id}`)}>{c.open} ↗</button><button className="btn-link" disabled={busy} onClick={async () => {
        if (!window.confirm(c.removeConfirm)) return;
        setBusy(true); setError('');
        try { await accountRequest(`/cvs/${cv.id}`, 'DELETE', { revision: cv.revision }); setCVs(previous => previous.filter(item => item.id !== cv.id)); }
        catch (cause) { setError(accountErrorMessage(cause, c)); } finally { setBusy(false); }
      }}>{c.remove}</button></div>
    </article>)}</div>}
    {auth.user?.local && <details className="password-settings"><summary>{c.passwordChange}</summary><form onSubmit={async event => {
      event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); setBusy(true); setError('');
      try { await accountRequest('/auth/password', 'POST', { currentPassword: data.get('currentPassword'), password: data.get('password') }); form.reset(); toast.push({ kind: 'success', title: c.passwordChanged }); }
      catch (cause) { setError(accountErrorMessage(cause, c)); } finally { setBusy(false); }
    }}><label>{c.currentPassword}<input className="field" type="password" name="currentPassword" autoComplete="current-password" required maxLength={128} /></label><label>{c.newPassword}<input className="field" type="password" name="password" autoComplete="new-password" required minLength={12} maxLength={128} /></label><p className="account-hint">{c.passwordHint}</p><button className="btn-ghost" disabled={busy}>{c.passwordChange}</button></form></details>}
  </main>;
}
