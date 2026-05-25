/**
 * Public changelog data — surfaced on the /changelog page (footer-only link).
 *
 * Guidelines for new entries:
 *  - English only. Keep it user-facing and high-level.
 *  - Newest entry first.
 *  - NEVER expose sensitive/internal detail: no security specifics, infra,
 *    secrets, keys, env vars, server internals or anything an attacker could
 *    use. Describe what changed for the *user*, not how it works inside.
 *  - `date` is ISO (YYYY-MM-DD); the page renders it as a full date.
 *  - `version` is optional (a friendly tag, not a build/commit id).
 *
 * These entries are seed content — adjust dates/wording to match your real
 * release history.
 */
export interface ChangelogEntry {
  date: string;        // ISO date, e.g. '2026-05-25'
  version?: string;    // optional friendly tag, e.g. 'v1.2'
  title: string;
  items: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    date: '2026-05-25',
    title: 'About & Contact pages',
    items: [
      'Added an About page explaining how CVeaver works and our privacy approach.',
      'Added a Contact page with email and social links.',
      'New footer navigation to find everything more easily.',
    ],
  },
  {
    date: '2026-05-24',
    title: 'A better builder on mobile',
    items: [
      'Redesigned the CV builder for small screens.',
      'Primary actions (preview and pay) are now within thumb reach.',
    ],
  },
  {
    date: '2026-05-23',
    title: 'Payments are live',
    items: [
      'Pay securely with card, Multibanco, MB WAY, Apple Pay or Google Pay.',
      'Your finished CV is emailed to you automatically once payment confirms.',
      'Update an existing CVeaver PDF later for half the price.',
    ],
  },
  {
    date: '2026-05-15',
    version: 'v1.0',
    title: 'CVeaver launch',
    items: [
      'Create a professional CV in minutes with a live preview — no sign-up.',
      'Several premium templates to choose from.',
      'Available in Portuguese, English, Spanish, French and German.',
      'Light and dark themes.',
    ],
  },
];
