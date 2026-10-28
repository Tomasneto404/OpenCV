import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { CVData } from '../../shared/cv';

export interface User { id: string; name: string; email: string | null; password_hash: string | null; role: 'admin' | 'user' }
export class RegistrationError extends Error {}
export interface SavedCV { id: string; title: string; cv: CVData; revision: number; updatedAt: string }
export class AccountStore {
  readonly db: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    if (path !== ':memory:') chmodSync(path, 0o600);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT, password_hash TEXT, created_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS local_email ON users(email) WHERE password_hash IS NOT NULL;
      CREATE TABLE IF NOT EXISTS identities (
        issuer TEXT NOT NULL, subject TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        PRIMARY KEY(issuer, subject)
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS session_expiry ON sessions(expires_at);
      CREATE TABLE IF NOT EXISTS oidc_attempts (
        token_hash TEXT PRIMARY KEY, state TEXT NOT NULL, nonce TEXT NOT NULL, verifier TEXT NOT NULL, expires_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS cvs (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL, data TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS cv_owner ON cvs(user_id, updated_at);
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT OR IGNORE INTO settings VALUES ('registration_enabled', 'true');
      CREATE TABLE IF NOT EXISTS invitations (
        id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE, email TEXT NOT NULL,
        created_by TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL,
        expires_at INTEGER NOT NULL, used_at TEXT, revoked_at TEXT
      );
      CREATE TABLE IF NOT EXISTS daily_metrics (
        day TEXT NOT NULL, metric TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(day, metric)
      );
      CREATE TABLE IF NOT EXISTS daily_users (
        day TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(day, user_id)
      );
      CREATE TABLE IF NOT EXISTS visits (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
    `);
    // Migrate existing installations once, preserving every account and CV.
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const columns = this.db.prepare('PRAGMA table_info(users)').all();
      if (!columns.some(column => column.name === 'role')) {
        this.db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'; UPDATE users SET role = 'admin' WHERE id = (SELECT id FROM users ORDER BY created_at, rowid LIMIT 1)");
      }
      if (!columns.some(column => column.name === 'last_seen_at')) this.db.exec('ALTER TABLE users ADD COLUMN last_seen_at TEXT');
      if (!this.db.prepare('PRAGMA table_info(oidc_attempts)').all().some(column => column.name === 'invite_hash')) this.db.exec('ALTER TABLE oidc_attempts ADD COLUMN invite_hash TEXT');
      if (!this.db.prepare('PRAGMA table_info(oidc_attempts)').all().some(column => column.name === 'provider_fingerprint')) this.db.exec('ALTER TABLE oidc_attempts ADD COLUMN provider_fingerprint TEXT');
      this.db.prepare("INSERT OR IGNORE INTO settings VALUES ('analytics_since', ?)").run(new Date().toISOString());
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  registrationEnabled() { return this.db.prepare("SELECT value FROM settings WHERE key = 'registration_enabled'").get()!.value === 'true'; }
  invitation(hash: string) {
    return this.db.prepare('SELECT email FROM invitations WHERE token_hash = ? AND used_at IS NULL AND revoked_at IS NULL AND expires_at > ?').get(hash, Date.now()) as { email: string } | undefined;
  }
  localUser(email: string) { return this.db.prepare('SELECT * FROM users WHERE email = ? AND password_hash IS NOT NULL').get(email) as unknown as User | undefined; }
  private insertUser(name: string, email: string | null, password: string | null, inviteHash?: string, verifiedEmail = true) {
    const first = !this.db.prepare('SELECT 1 FROM users LIMIT 1').get();
    if (inviteHash) {
      const invitation = this.invitation(inviteHash);
      if (!invitation || !verifiedEmail || invitation.email !== email?.toLowerCase()) throw new RegistrationError('invalid_invitation');
    } else if (!first && !this.registrationEnabled()) throw new RegistrationError('registration_closed');
    const user: User = { id: randomUUID(), name, email, password_hash: password, role: first ? 'admin' : 'user' };
    const now = new Date().toISOString();
    this.db.prepare('INSERT INTO users (id, name, email, password_hash, created_at, role) VALUES (?, ?, ?, ?, ?, ?)').run(user.id, name, email, password, now, user.role);
    if (inviteHash) this.db.prepare('UPDATE invitations SET used_at = ? WHERE token_hash = ?').run(now, inviteHash);
    return user;
  }
  createUser(name: string, email: string | null, password: string | null, inviteHash?: string) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const user = this.insertUser(name, email, password, inviteHash);
      this.db.exec('COMMIT'); return user;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  ssoUser(issuer: string, subject: string, name: string, email: string | null, inviteHash?: string, verifiedEmail = false) {
    // Never merge identities based on an email claim (including verified emails).
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const existing = this.db.prepare('SELECT users.* FROM identities JOIN users ON users.id = user_id WHERE issuer = ? AND subject = ?').get(issuer, subject) as unknown as User | undefined;
      if (existing) { this.db.exec('COMMIT'); return existing; }
      const user = this.insertUser(name, email, null, inviteHash, verifiedEmail);
      this.db.prepare('INSERT INTO identities VALUES (?, ?, ?)').run(issuer, subject, user.id);
      this.db.exec('COMMIT');
      return user;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  session(hash: string) {
    return this.db.prepare('SELECT users.* FROM sessions JOIN users ON users.id = user_id WHERE token_hash = ? AND expires_at > ?').get(hash, Date.now()) as unknown as User | undefined;
  }
  cleanup() {
    this.db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
    this.db.prepare('DELETE FROM oidc_attempts WHERE expires_at <= ?').run(Date.now());
    this.db.prepare('DELETE FROM visits WHERE expires_at <= ?').run(Date.now());
  }
  metric(metric: 'visits' | 'page_views' | 'guest_exports' | 'member_exports' | 'cv_created') {
    this.db.prepare('INSERT INTO daily_metrics VALUES (?, ?, 1) ON CONFLICT(day, metric) DO UPDATE SET count = count + 1').run(new Date().toISOString().slice(0, 10), metric);
  }
  activity(user: User) {
    const now = new Date();
    this.db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ? AND (last_seen_at IS NULL OR last_seen_at < ?)').run(now.toISOString(), user.id, new Date(now.getTime() - 60_000).toISOString());
    this.db.prepare('INSERT OR IGNORE INTO daily_users VALUES (?, ?)').run(now.toISOString().slice(0, 10), user.id);
  }
  list(user: string) {
    return this.db.prepare('SELECT id, title, revision, updated_at AS updatedAt FROM cvs WHERE user_id = ? ORDER BY updated_at DESC').all(user);
  }
  get(user: string, id: string): SavedCV | null {
    const row = this.db.prepare('SELECT id, title, data, revision, updated_at AS updatedAt FROM cvs WHERE id = ? AND user_id = ?').get(id, user) as { id: string; title: string; data: string; revision: number; updatedAt: string } | undefined;
    return row ? { id: row.id, title: row.title, cv: JSON.parse(row.data), revision: row.revision, updatedAt: row.updatedAt } : null;
  }
  create(user: string, title: string, cv: CVData) {
    const id = randomUUID();
    this.db.prepare('INSERT INTO cvs VALUES (?, ?, ?, ?, 1, ?)').run(id, user, title, JSON.stringify(cv), new Date().toISOString());
    this.metric('cv_created');
    return this.get(user, id)!;
  }
  update(user: string, id: string, revision: number, title: string, cv: CVData) {
    const result = this.db.prepare('UPDATE cvs SET title = ?, data = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND user_id = ? AND revision = ?').run(title, JSON.stringify(cv), new Date().toISOString(), id, user, revision);
    return result.changes ? this.get(user, id) : null;
  }
  remove(user: string, id: string, revision: number) {
    return this.db.prepare('DELETE FROM cvs WHERE id = ? AND user_id = ? AND revision = ?').run(id, user, revision).changes > 0;
  }
}
