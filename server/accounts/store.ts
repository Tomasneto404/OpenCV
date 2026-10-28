import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { CVData } from '../../shared/cv';

export interface User { id: string; name: string; email: string | null; password_hash: string | null }
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
    `);
  }
  localUser(email: string) { return this.db.prepare('SELECT * FROM users WHERE email = ? AND password_hash IS NOT NULL').get(email) as unknown as User | undefined; }
  createUser(name: string, email: string | null, password: string | null) {
    const user = { id: randomUUID(), name, email, password_hash: password };
    this.db.prepare('INSERT INTO users VALUES (?, ?, ?, ?, ?)').run(user.id, name, email, password, new Date().toISOString());
    return user;
  }
  ssoUser(issuer: string, subject: string, name: string, email: string | null) {
    const existing = this.db.prepare('SELECT users.* FROM identities JOIN users ON users.id = user_id WHERE issuer = ? AND subject = ?').get(issuer, subject) as unknown as User | undefined;
    if (existing) return existing;
    // Never merge identities based on an email claim (including verified emails).
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const user = this.createUser(name, email, null);
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
