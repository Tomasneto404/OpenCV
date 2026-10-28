import { useEffect, useState } from 'react';
import { accountRequest } from '../../accounts';
import { useAdminCopy } from '../../i18n/admin';
import { useAccountCopy, accountErrorMessage } from '../../i18n/accounts';
import { useT } from '../../i18n';
import { BrandMark } from '../BrandMark';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { ThemeToggle } from '../ThemeToggle';
import { useToast } from '../Toast';
import { IntegrationSettings } from './Integrations';

interface Day { day: string; visits: number; page_views: number; guest_exports: number; member_exports: number; cv_created: number; active_users: number; registrations: number }
interface Overview {
  registrationEnabled: boolean; since: string;
  totals: { users: number; localUsers: number; ssoUsers: number; active24h: number; active30d: number; savedCVs: number; visits: number; pageViews: number; pdfExports: number; guestExports: number; memberExports: number };
  series: Day[];
}
interface Directory { users: { id: string; name: string; email: string | null; role: string; method: string; createdAt: string; lastSeenAt: string | null; cvCount: number }[]; total: number; page: number; pageSize: number }
interface Invitation { id: string; email: string; expiresAt: number; usedAt: string | null; revokedAt: string | null }

export function Admin({ onNavigate }: { onNavigate: (path: string) => void }) {
  const a = useAdminCopy(); const c = useAccountCopy(); const { locale } = useT(); const toast = useToast();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [directory, setDirectory] = useState<Directory | null>(null);
  const [search, setSearch] = useState(''); const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0); const [busy, setBusy] = useState(false);
  const [error, setError] = useState(''); const [link, setLink] = useState('');
  const [metric, setMetric] = useState<'visits' | 'page_views' | 'pdf' | 'active_users' | 'registrations'>('visits');
  const message = (cause: unknown) => {
    const code = cause instanceof Error ? cause.message : '';
    return code in a ? a[code as keyof typeof a] : accountErrorMessage(cause, c);
  };
  useEffect(() => {
    let active = true; setError('');
    Promise.all([accountRequest<Overview>('/admin/overview'), accountRequest<{ invitations: Invitation[] }>('/admin/invitations')])
      .then(([data, invites]) => { if (active) { setOverview(data); setInvitations(invites.invitations); } })
      .catch(cause => { if (active) setError(message(cause)); });
    return () => { active = false; };
    // Copy dictionaries are stable per locale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload, a, c]);
  useEffect(() => {
    let active = true; setDirectory(null);
    const timer = window.setTimeout(() => {
      accountRequest<Directory>(`/admin/users?page=${page}&q=${encodeURIComponent(search)}`).then(data => { if (active) setDirectory(data); }).catch(cause => { if (active) setError(message(cause)); });
    }, 200);
    return () => { active = false; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, reload, a, c]);
  const number = (value: number) => value.toLocaleString(locale);
  const date = (value: string | number) => new Date(value).toLocaleDateString(locale, { timeZone: 'UTC' });
  const labels = { visits: a.visits, page_views: a.pageViews, pdf: a.pdfExports, active_users: a.active, registrations: a.registrations };
  const value = (day: Day) => metric === 'pdf' ? day.guest_exports + day.member_exports : day[metric];
  const max = Math.max(1, ...overview?.series.map(value) || []);
  const status = (invite: Invitation) => invite.usedAt ? a.used : invite.revokedAt ? a.revoked : invite.expiresAt <= Date.now() ? a.expired : a.pending;
  return <main className="account-page admin-page">
    <header className="account-header"><button className="btn-link" onClick={() => onNavigate('/')}><BrandMark withWordmark /></button><div className="nav-actions"><ThemeToggle /><LanguageSwitcher /><button className="btn-ghost" onClick={() => onNavigate('/account')}>{c.library}</button></div></header>
    <section className="library-heading"><div><p className="eyebrow">OpenCV · {a.overview}</p><h1>{a.admin}</h1><p className="account-description">{a.intro}</p></div><button className="btn-ghost" disabled={busy} onClick={() => setReload(n => n + 1)}>{a.refresh} ↻</button></section>
    {error && <p className="notice error" role="alert">{error}</p>}
    {!overview ? <p role="status">{error ? c.retry : c.loading}</p> : <>
      <section className="admin-stats" aria-label={a.overview}>
        {([
          ['users', a.users, `${a.local}: ${number(overview.totals.localUsers)} · ${a.sso}: ${number(overview.totals.ssoUsers)}`],
          ['active24h', a.active24h, `${a.active30d}: ${number(overview.totals.active30d)}`],
          ['savedCVs', a.savedCVs, c.library],
          ['pdfExports', a.pdfExports, `${a.guests}: ${number(overview.totals.guestExports)} · ${a.members}: ${number(overview.totals.memberExports)}`],
          ['visits', a.visits, '30 min'], ['pageViews', a.pageViews, `${a.since} ${date(overview.since)}`],
        ] as const).map(([key, label, hint]) => <article className="admin-stat" key={key}><h2>{label}</h2><strong>{number(overview.totals[key])}</strong><p>{hint}</p></article>)}
      </section>
      <section className="admin-panel" aria-labelledby="daily-title">
        <div className="admin-panel-heading"><h2 id="daily-title">{a.daily}</h2><label>{a.metric}<select className="field" value={metric} onChange={event => setMetric(event.target.value as typeof metric)}>{Object.entries(labels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label></div>
        <div className="admin-chart" role="img" aria-label={`${labels[metric]}: ${number(overview.series.reduce((sum, day) => sum + value(day), 0))}`}>
          {overview.series.map(day => <div className="admin-bar-track" key={day.day} title={`${date(day.day)}: ${number(value(day))}`}><span className="admin-bar" style={{ height: `${value(day) / max * 100}%` }} /></div>)}
        </div>
        <div className="admin-chart-axis"><span>{date(overview.series[0].day)}</span><strong>{labels[metric]}</strong><span>{date(overview.series[29].day)}</span></div>
        <details className="admin-data"><summary>{a.daily} · {a.total}</summary><div className="admin-table-scroll"><table><thead><tr><th scope="col">{a.date}</th><th scope="col">{labels[metric]}</th></tr></thead><tbody>{[...overview.series].reverse().map(day => <tr key={day.day}><td>{date(day.day)}</td><td>{number(value(day))}</td></tr>)}</tbody></table></div></details>
        <p className="account-hint">{a.since} {date(overview.since)}. {a.analyticsHint}</p>
      </section>
      <div className="admin-settings-grid">
        <section className="admin-panel" aria-labelledby="settings-title"><h2 id="settings-title">{a.settings}</h2><p className="account-description">{a.registrationHint}</p>
          <div className="admin-registration"><span>{a.registration}<small>{overview.registrationEnabled ? a.enabled : a.disabled}</small></span><button className="admin-switch" role="switch" aria-label={a.registration} aria-checked={overview.registrationEnabled} disabled={busy} onClick={async () => {
            setBusy(true); setError('');
            try { const settings = await accountRequest<{ registrationEnabled: boolean }>('/admin/settings', 'PUT', { registrationEnabled: !overview.registrationEnabled }); setOverview(previous => previous && ({ ...previous, ...settings })); toast.push({ kind: 'success', title: a.saved }); }
            catch (cause) { setError(message(cause)); } finally { setBusy(false); }
          }}><span /></button></div>
        </section>
        <section className="admin-panel" aria-labelledby="invite-title"><h2 id="invite-title">{a.invitations}</h2><p className="account-description">{a.inviteHint}</p>
          <form onSubmit={async event => {
            event.preventDefault(); if (busy) return; const form = event.currentTarget; const email = new FormData(form).get('email'); setBusy(true); setError('');
            try { const invite = await accountRequest<{ url: string }>('/admin/invitations', 'POST', { email }); setLink(invite.url); form.reset(); setReload(n => n + 1); }
            catch (cause) { setError(message(cause)); } finally { setBusy(false); }
          }}><label>{a.inviteEmail}<input className="field" type="email" name="email" required maxLength={254} autoComplete="off" /></label><button className="btn-primary" disabled={busy}>{a.invite} ↗</button></form>
          {link && <div className="admin-invite-result"><label>{a.inviteLink}<input className="field" readOnly value={link} onClick={event => event.currentTarget.select()} /></label><button className="btn-ghost" onClick={async () => {
            try { await navigator.clipboard.writeText(link); toast.push({ kind: 'success', title: a.copied }); } catch { toast.push({ kind: 'error', title: a.inviteLink, body: a.linkHint }); }
          }}>{a.copy}</button><p className="account-hint">{a.linkHint}</p></div>}
        </section>
      </div>
      <section className="admin-panel"><h2>{a.invitations}</h2>{!invitations.length ? <p className="account-description">{a.noInvites}</p> : <div className="admin-table-scroll"><table><thead><tr><th scope="col">{a.email}</th><th scope="col">{a.status}</th><th scope="col">{a.expires}</th><th scope="col"><span className="sr-only">{a.revoke}</span></th></tr></thead><tbody>{invitations.map(invite => <tr key={invite.id}><td>{invite.email}</td><td><span className="admin-badge">{status(invite)}</span></td><td>{date(invite.expiresAt)}</td><td>{status(invite) === a.pending && <button className="btn-ghost" disabled={busy} onClick={async () => {
        setBusy(true); setError(''); try { await accountRequest(`/admin/invitations/${invite.id}`, 'DELETE'); setReload(n => n + 1); } catch (cause) { setError(message(cause)); } finally { setBusy(false); }
      }}>{a.revoke}</button>}</td></tr>)}</tbody></table></div>}</section>
      <IntegrationSettings />
      <section className="admin-panel" aria-labelledby="users-title"><div className="admin-panel-heading"><h2 id="users-title">{a.users} {directory && <span className="admin-badge">{number(directory.total)}</span>}</h2><label className="admin-search">{a.search}<input className="field" type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} maxLength={100} /></label></div><p className="account-hint">{a.private}</p>
        {!directory ? <p role="status">{c.loading}</p> : <>{directory.users.length === 0 ? <p className="account-description">{a.noUsers}</p> : <div className="admin-table-scroll"><table><thead><tr>{[a.name, a.email, a.role, a.method, a.savedCVs, a.joined, a.lastSeen].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{directory.users.map(user => <tr key={user.id}><td>{user.name}</td><td>{user.email || '—'}</td><td><span className="admin-badge">{user.role === 'admin' ? a.administrator : a.member}</span></td><td>{user.method === 'local' ? a.local : a.sso}</td><td>{number(user.cvCount)}</td><td>{date(user.createdAt)}</td><td>{user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleString(locale, { timeZone: 'UTC' }) : a.never}</td></tr>)}</tbody></table></div>}
          <div className="admin-pagination"><button className="btn-ghost" disabled={page <= 1} onClick={() => setPage(n => n - 1)}>{a.previous}</button><span>{a.page} {page} {a.of} {Math.max(1, Math.ceil(directory.total / directory.pageSize))}</span><button className="btn-ghost" disabled={page * directory.pageSize >= directory.total} onClick={() => setPage(n => n + 1)}>{a.next}</button></div>
        </>}
      </section>
    </>}
  </main>;
}
