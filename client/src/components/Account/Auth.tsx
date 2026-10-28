import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { accountRequest, setExpectedAccount, type AccountUser, type Session } from '../../accounts';

interface AuthState extends Session {
  loading: boolean;
  accept: (user: AccountUser) => void;
  logout: () => Promise<void>;
}
const Context = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ user: null, sso: null, registrationEnabled: true });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    accountRequest<Session>('/auth/session').then(next => {
      if (active) { setExpectedAccount(next.user?.id || null); setSession(next); }
    }).catch(() => {}).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const accept = useCallback((user: AccountUser) => { setExpectedAccount(user.id); setSession(previous => ({ ...previous, user })); }, []);
  const logout = useCallback(async () => {
    await accountRequest('/auth/logout', 'POST');
    setExpectedAccount(null);
    setSession(previous => ({ ...previous, user: null }));
  }, []);
  return <Context.Provider value={{ ...session, loading, accept, logout }}>{children}</Context.Provider>;
}
export function useAuth() { return useContext(Context)!; }
