import express, { type Request, type Response, type NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { createHash, randomBytes } from 'node:crypto';
import * as oidc from 'openid-client';
import { AccountStore, type User } from './store';
import { hashPassword, verifyPassword } from './password';
import { normalizeCV } from '../../shared/normalizeCV';

interface Options {
  store: AccountStore;
  origin: string;
  oidc?: { issuer: string; clientId: string; clientSecret: string; label: string; allowHttp?: boolean };
  rateLimits?: boolean;
}
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const token = () => randomBytes(32).toString('base64url');
const publicUser = (u: User) => ({ id: u.id, name: u.name, email: u.email, local: !!u.password_hash });
function cookie(req: Request, name: string) {
  const value = req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith(`${name}=`))?.slice(name.length + 1);
  return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : '';
}
const wrap = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => { void fn(req, res).catch(next); };

export function createAccountRouter({ store, origin, oidc: provider, rateLimits = true }: Options) {
  const router = express.Router();
  const publicURL = new URL(origin);
  const secure = publicURL.protocol === 'https:';
  const cookieName = secure ? '__Host-opencv_session' : 'opencv_session';
  const flowCookie = secure ? '__Host-opencv_oidc' : 'opencv_oidc';
  const cookieOptions = { httpOnly: true, secure, sameSite: 'lax' as const, path: '/' };
  const user = (req: Request) => store.session(digest(cookie(req, cookieName)));
  const limited = (max: number) => rateLimit({ windowMs: 15 * 60_000, max, standardHeaders: true, legacyHeaders: false, skip: () => !rateLimits, message: { error: 'rate_limit' } });
  router.use(['/auth', '/cvs'], (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  const mutation = (req: Request, res: Response, next: NextFunction) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    if (req.get('X-OpenCV-Request') !== '1' || req.get('Sec-Fetch-Site') === 'cross-site' || (req.get('Origin') && req.get('Origin') !== publicURL.origin)) {
      return res.status(403).json({ error: 'invalid_origin' });
    }
    next();
  };
  router.use(['/auth', '/cvs'], mutation);
  const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const current = user(req);
    if (!current) return res.status(401).json({ error: 'session_expired' });
    if (req.get('X-OpenCV-User') && req.get('X-OpenCV-User') !== current.id) return res.status(401).json({ error: 'session_expired' });
    res.locals.user = current;
    next();
  };
  const establish = (req: Request, res: Response, current: User) => {
    store.cleanup();
    store.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(digest(cookie(req, cookieName)));
    const value = token();
    const duration = 7 * 24 * 60 * 60_000;
    store.db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(digest(value), current.id, Date.now() + duration);
    res.cookie(cookieName, value, { ...cookieOptions, maxAge: duration });
  };
  router.get('/auth/session', (req, res) => {
    const current = user(req);
    res.json({ user: current ? publicUser(current) : null, sso: provider ? { label: provider.label } : null });
  });
  router.post('/auth/register', limited(10), express.json({ limit: '16kb' }), wrap(async (req, res) => {
    const { email, password, name } = req.body || {};
    if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || typeof name !== 'string' || !name.trim() || name.length > 100 || typeof password !== 'string' || password.length < 12 || password.length > 128) return res.status(400).json({ error: 'invalid_registration' });
    const normalized = email.trim().toLowerCase();
    const hash = await hashPassword(password);
    // Recheck after the asynchronous hash to make concurrent registrations safe.
    if (store.localUser(normalized)) return res.status(409).json({ error: 'email_taken' });
    const current = store.createUser(name.trim(), normalized, hash);
    establish(req, res, current);
    res.status(201).json({ user: publicUser(current) });
  }));
  router.post('/auth/login', limited(30), express.json({ limit: '16kb' }), wrap(async (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || email.length > 254 || typeof password !== 'string' || password.length > 128) return res.status(400).json({ error: 'invalid_credentials' });
    const current = store.localUser(email.trim().toLowerCase());
    if (!await verifyPassword(password, current?.password_hash) || !current) return res.status(401).json({ error: 'invalid_credentials' });
    establish(req, res, current);
    res.json({ user: publicUser(current) });
  }));
  router.post('/auth/logout', (req, res) => {
    store.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(digest(cookie(req, cookieName)));
    res.clearCookie(cookieName, cookieOptions).status(204).end();
  });
  router.post('/auth/password', limited(15), authenticate, express.json({ limit: '16kb' }), wrap(async (req, res) => {
    const current = res.locals.user as User;
    const { currentPassword, password } = req.body || {};
    if (!current.password_hash || typeof currentPassword !== 'string' || currentPassword.length > 128 || typeof password !== 'string' || password.length < 12 || password.length > 128) return res.status(400).json({ error: 'invalid_password' });
    if (!await verifyPassword(currentPassword, current.password_hash)) return res.status(401).json({ error: 'invalid_credentials' });
    const hash = await hashPassword(password);
    store.db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, current.id);
    store.db.prepare('DELETE FROM sessions WHERE user_id = ?').run(current.id);
    establish(req, res, current);
    res.status(204).end();
  }));

  let configuration: Promise<oidc.Configuration> | undefined;
  const getConfiguration = () => {
    if (!provider) throw new Error('SSO disabled');
    configuration ??= oidc.discovery(new URL(provider.issuer), provider.clientId, provider.clientSecret, undefined, {
      execute: [oidc.enableNonRepudiationChecks, ...(provider.allowHttp ? [oidc.allowInsecureRequests] : [])],
    }).catch(error => { configuration = undefined; throw error; });
    return configuration;
  };
  const callback = new URL('/api/auth/sso/callback', publicURL).href;
  router.get('/auth/sso', limited(30), wrap(async (req, res) => {
    if (!provider) return res.status(404).json({ error: 'sso_disabled' });
    try {
      const config = await getConfiguration();
      store.cleanup();
      const correlation = token();
      const state = oidc.randomState();
      const nonce = oidc.randomNonce();
      const verifier = oidc.randomPKCECodeVerifier();
      store.db.prepare('DELETE FROM oidc_attempts WHERE token_hash = ?').run(digest(cookie(req, flowCookie)));
      store.db.prepare('INSERT INTO oidc_attempts VALUES (?, ?, ?, ?, ?)').run(digest(correlation), state, nonce, verifier, Date.now() + 10 * 60_000);
      res.cookie(flowCookie, correlation, { ...cookieOptions, maxAge: 10 * 60_000 });
      const url = oidc.buildAuthorizationUrl(config, { redirect_uri: callback, scope: 'openid profile email', state, nonce, code_challenge: await oidc.calculatePKCECodeChallenge(verifier), code_challenge_method: 'S256' });
      res.redirect(url.href);
    } catch { res.redirect(new URL('/login?error=sso_unavailable', publicURL).href); }
  }));
  router.get('/auth/sso/callback', limited(30), wrap(async (req, res) => {
    const hash = digest(cookie(req, flowCookie));
    const attempt = store.db.prepare('DELETE FROM oidc_attempts WHERE token_hash = ? RETURNING *').get(hash) as { state: string; nonce: string; verifier: string; expires_at: number } | undefined;
    res.clearCookie(flowCookie, cookieOptions);
    try {
      if (!provider || !attempt || attempt.expires_at <= Date.now()) throw new Error('Invalid SSO attempt');
      const config = await getConfiguration();
      const responseURL = new URL(callback);
      responseURL.search = new URL(req.originalUrl, publicURL).search;
      const tokens = await oidc.authorizationCodeGrant(config, responseURL, { expectedState: attempt.state, expectedNonce: attempt.nonce, pkceCodeVerifier: attempt.verifier, idTokenExpected: true });
      const claims = tokens.claims()!;
      const email = typeof claims.email === 'string' ? claims.email.slice(0, 254) : null;
      const name = typeof claims.name === 'string' && claims.name.trim() ? claims.name.slice(0, 100) : 'OpenCV user';
      const current = store.ssoUser(claims.iss, claims.sub, name, email);
      establish(req, res, current);
      res.redirect(new URL('/account', publicURL).href);
    } catch { res.redirect(new URL('/login?error=sso_failed', publicURL).href); }
  }));

  router.use('/cvs', authenticate);
  router.get('/cvs', (_req, res) => res.json({ cvs: store.list(res.locals.user.id) }));
  router.get('/cvs/:id', (req, res) => {
    const cv = store.get(res.locals.user.id, String(req.params.id));
    if (!cv) return res.status(404).json({ error: 'cv_not_found' });
    res.json(cv);
  });
  const cvBody = express.json({ limit: '80mb' });
  const validBody = (req: Request) => {
    const cv = normalizeCV(req.body?.cv);
    const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
    return cv && title && title.length <= 120 ? { cv, title } : null;
  };
  router.post('/cvs', limited(120), cvBody, (req, res) => {
    const body = validBody(req);
    if (!body) return res.status(400).json({ error: 'invalid_cv' });
    res.status(201).json(store.create(res.locals.user.id, body.title, body.cv));
  });
  router.put('/cvs/:id', limited(300), cvBody, (req, res) => {
    const body = validBody(req);
    if (!body || !Number.isSafeInteger(req.body.revision) || req.body.revision < 1) return res.status(400).json({ error: 'invalid_cv' });
    if (!store.get(res.locals.user.id, String(req.params.id))) return res.status(404).json({ error: 'cv_not_found' });
    const cv = store.update(res.locals.user.id, String(req.params.id), req.body.revision, body.title, body.cv);
    if (!cv) return res.status(409).json({ error: 'cv_conflict' });
    res.json(cv);
  });
  router.delete('/cvs/:id', express.json({ limit: '1kb' }), (req, res) => {
    if (!Number.isSafeInteger(req.body?.revision)) return res.status(400).json({ error: 'invalid_cv' });
    if (!store.get(res.locals.user.id, String(req.params.id))) return res.status(404).json({ error: 'cv_not_found' });
    if (!store.remove(res.locals.user.id, String(req.params.id), req.body.revision)) return res.status(409).json({ error: 'cv_conflict' });
    res.status(204).end();
  });
  return router;
}
