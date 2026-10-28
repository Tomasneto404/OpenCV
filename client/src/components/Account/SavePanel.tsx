import { useState } from 'react';
import { accountRequest, type SavedCV } from '../../accounts';
import type { CVData } from '../../types';
import { useAccountCopy, accountErrorMessage } from '../../i18n/accounts';
import { useAuth } from './Auth';

export function SavePublicCV({ cv, onSaved, onLogin }: { cv: CVData; onSaved: (cv: SavedCV) => void; onLogin: () => void }) {
  const c = useAccountCopy(); const auth = useAuth();
  const [title, setTitle] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  if (auth.loading) return null;
  if (!auth.user) return <div className="account-save-panel"><p>{c.guestHint}</p><button className="btn-link" onClick={onLogin}>{c.login} →</button></div>;
  return <div className="account-save-panel"><p>{c.saveHint}</p><label>{c.title}<input className="field" value={title} placeholder={cv.personal.fullName || c.untitled} maxLength={120} onChange={event => setTitle(event.target.value)} /></label>
    {error && <p role="alert" className="notice error">{error}</p>}
    <button className="btn-primary" disabled={busy} onClick={async () => {
      setBusy(true); setError('');
      try { onSaved(await accountRequest<SavedCV>('/cvs', 'POST', { cv, title: title.trim() || cv.personal.fullName || c.untitled })); }
      catch (cause) { setError(accountErrorMessage(cause, c)); } finally { setBusy(false); }
    }}>{busy ? c.saving : c.save}</button>
  </div>;
}
