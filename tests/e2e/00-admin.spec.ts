import { test, expect } from '@playwright/test';

// Run against the disposable Docker test database. The first registration owns administration.
const credentials = { name: 'OpenCV Admin', email: 'admin-e2e@example.com', password: 'test administrator password 2026' };
test('first admin controls registration, invites users and sees usage without exposing CV contents', async ({ page, browser, baseURL }, testInfo) => {
  test.setTimeout(90_000);
  const headers = { 'X-OpenCV-Request': '1', Origin: baseURL! };
  const registration = await page.request.post('/api/auth/register', { headers, data: credentials });
  if (registration.status() === 409) expect((await page.request.post('/api/auth/login', { headers, data: credentials })).status()).toBe(200);
  else expect(registration.status()).toBe(201);
  const session = await (await page.request.get('/api/auth/session')).json();
  expect(session.user.role, 'Admin tests require a fresh, disposable application database').toBe('admin');
  await page.request.put('/api/admin/settings', { headers, data: { registrationEnabled: true } });
  const guest = await browser.newContext({ baseURL, locale: 'pt-PT' });
  const guestPage = await guest.newPage();
  try {
    await page.goto('/account');
    await page.getByRole('button', { name: 'Administração' }).click();
    await expect(page.getByRole('heading', { name: 'Administração', exact: true })).toBeVisible();
    await expect(page.getByRole('switch', { name: 'Permitir novos registos' })).toBeChecked();
    await page.getByRole('switch', { name: 'Permitir novos registos' }).click();
    await expect(page.getByRole('switch')).not.toBeChecked();
    await guestPage.goto('/login');
    await expect(guestPage.getByText('Os novos registos estão limitados a convites. Podes entrar na tua conta ou usar o editor público.')).toBeVisible();
    await expect(guestPage.getByRole('button', { name: 'Ainda não tens conta? Criar conta' })).toHaveCount(0);
    expect((await guest.request.post('/api/auth/register', { headers, data: { ...credentials, email: 'blocked@example.com' } })).status()).toBe(403);
    await guestPage.getByRole('button', { name: /Editor público/ }).click();
    await guestPage.getByLabel('Nome completo', { exact: true }).fill('CV sem conta');
    const before = await (await page.request.get('/api/admin/overview')).json();
    const download = guestPage.waitForEvent('download');
    await guestPage.getByRole('button', { name: /Descarregar PDF/ }).filter({ visible: true }).click();
    expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
    await expect.poll(async () => (await (await page.request.get('/api/admin/overview')).json()).totals.pdfExports).toBe(before.totals.pdfExports + 1);
    const email = `invited-${testInfo.project.name}-${Date.now()}@example.com`;
    await page.getByLabel('Email do convite', { exact: true }).fill(email);
    await page.getByRole('button', { name: 'Criar convite' }).click();
    const link = page.getByLabel('Link do convite', { exact: true });
    await expect(link).toHaveValue(/\/login#invite=/);
    const url = await link.inputValue();
    await guestPage.goto(url);
    await expect(guestPage.getByLabel('Email', { exact: true })).toHaveValue(email);
    await guestPage.getByLabel('O teu nome', { exact: true }).fill('Utilizador Convidado');
    await guestPage.getByLabel('Palavra-passe', { exact: true }).fill('a strong invited user password');
    await guestPage.getByRole('button', { name: /^Criar conta/ }).click();
    await expect(guestPage).toHaveURL(/\/account$/);
    await expect(guestPage.getByRole('button', { name: 'Administração' })).toHaveCount(0);
    await guestPage.getByRole('button', { name: /Novo CV/ }).click();
    await expect(guestPage).toHaveURL(/\/builder\/[^/]+$/);
    await guestPage.goto('/admin');
    await expect(guestPage.getByRole('alert')).toHaveText('Esta página está disponível apenas para o administrador.');
    expect((await guest.request.get('/api/admin/overview')).status()).toBe(403);
    await page.getByRole('button', { name: 'Atualizar', exact: false }).click();
    await expect(page.getByRole('row').filter({ hasText: email }).first()).toContainText('Aceite');
    await page.getByLabel('Pesquisar utilizadores por nome ou email').fill(email);
    const userTable = page.locator('section[aria-labelledby="users-title"]');
    await expect(userTable.getByRole('row').filter({ hasText: email })).toContainText('Utilizador Convidado');
    await expect(userTable.getByRole('row').filter({ hasText: email }).getByRole('cell', { name: '1', exact: true })).toBeVisible();
    await page.getByLabel('Mostrar métrica').selectOption('pdf');
    await expect(page.locator('.admin-chart')).toHaveAttribute('aria-label', /^PDFs emitidos:/);
    await page.getByLabel('Email do convite', { exact: true }).fill(`revoked-${Date.now()}@example.com`);
    await page.getByRole('button', { name: 'Criar convite' }).click();
    await expect(link).not.toHaveValue(url);
    const revokedURL = await link.inputValue();
    await page.getByRole('button', { name: 'Revogar', exact: true }).first().click();
    await expect(page.getByRole('button', { name: 'Revogar', exact: true })).toHaveCount(0);
    await guest.request.post('/api/auth/logout', { headers });
    await guestPage.goto(revokedURL);
    await expect(guestPage.getByRole('alert')).toContainText('Este convite é inválido');
    await expect(guestPage.getByRole('button', { name: /^Criar conta/ })).toBeDisabled();
    await page.getByRole('switch').click();
    await expect(page.getByRole('switch')).toBeChecked();
    await guestPage.goto('/login');
    await expect(guestPage.getByRole('button', { name: 'Ainda não tens conta? Criar conta' })).toBeVisible();
    await page.getByLabel('Pesquisar utilizadores por nome ou email').fill('');
    await expect(userTable.getByRole('row').filter({ hasText: credentials.email })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: `.cache/admin-${testInfo.project.name}.png`, fullPage: true });
  } finally {
    await page.request.put('/api/admin/settings', { headers, data: { registrationEnabled: true } });
    await guest.close();
  }
});

test('action buttons have a consistent height on the landing page and editor', async ({ page }) => {
  for (const path of ['/', '/builder', '/login']) {
    await page.goto(path);
    await expect(page.locator('.btn-primary:visible').first()).toBeVisible();
    const sizes = await page.locator('.btn-primary, .btn-ghost, .icon-button').evaluateAll(elements => elements.filter(element => element.getClientRects().length).map(element => ({ text: element.textContent?.trim() || element.getAttribute('aria-label'), height: element.getBoundingClientRect().height })));
    expect(sizes.length).toBeGreaterThan(0);
    for (const size of sizes) expect(size.height, `${path}: ${size.text}`).toBe(44);
  }
});

test('admin can configure SSO and notification services without exposing stored credentials', async ({ page, baseURL }) => {
  const headers = { 'X-OpenCV-Request': '1', Origin: baseURL! };
  expect((await page.request.post('/api/auth/login', { headers, data: credentials })).status()).toBe(200);
  await page.goto('/admin');
  const sso = page.locator('section[aria-labelledby="oidc-title"]');
  await sso.getByLabel('URL do issuer').fill('https://identity.example.com');
  await sso.getByLabel('Client ID', { exact: true }).fill('opencv-browser-test');
  await sso.getByLabel('Client secret', { exact: true }).fill('synthetic-browser-test-secret');
  await sso.getByLabel('Texto do botão de login').fill('Company SSO');
  await sso.getByLabel('Ativar SSO').check();
  try {
    await sso.getByRole('button', { name: 'Guardar configuração' }).click();
    await expect(sso.getByLabel('Client secret', { exact: true })).toHaveValue('');
    await expect.poll(async () => (await (await page.request.get('/api/auth/session')).json()).sso).toEqual({ label: 'Company SSO' });
    await page.reload();
    await expect(sso.getByLabel('Ativar SSO')).toBeChecked();
    await expect(sso.getByLabel('Client secret', { exact: true })).toHaveAttribute('placeholder', 'Guardado · deixa vazio para manter');
    for (const [name, fields] of [
      ['Discord', { 'URL do webhook Discord': 'https://discord.com/api/webhooks/123/synthetic-browser-webhook' }],
      ['Telegram', { 'Token do bot Telegram': '123:synthetic-browser-token', 'Chat ID do Telegram': '-123' }],
      ['ntfy', { 'URL do servidor': 'https://push.example.com', 'Token de acesso': 'synthetic-browser-token', 'Tópico': 'opencv' }],
      ['Gotify', { 'URL do servidor': 'https://push.example.com', 'Token de acesso': 'synthetic-browser-token' }],
    ] as const) {
      const panel = page.locator('.integration-channel').filter({ has: page.locator('summary', { hasText: name }) });
      await panel.locator('summary').click();
      for (const [label, value] of Object.entries(fields)) await panel.getByLabel(label, { exact: true }).fill(value);
      await panel.getByLabel('Exportações de PDF').check();
      // Keep delivery disabled: browser tests must not send real external messages.
      await panel.getByRole('button', { name: 'Guardar configuração' }).click();
      const secret = panel.getByLabel(name === 'Discord' ? 'URL do webhook Discord' : name === 'Telegram' ? 'Token do bot Telegram' : 'Token de acesso', { exact: true });
      await expect(secret).toHaveValue('');
      await expect(secret).toHaveAttribute('placeholder', 'Guardado · deixa vazio para manter');
      await expect(panel.getByRole('button', { name: 'Enviar notificação de teste' })).toBeDisabled();
      await panel.locator('summary').click();
    }
    const config = await (await page.request.get('/api/admin/integrations')).json();
    expect(JSON.stringify(config)).not.toContain('synthetic-browser');
    expect(config.notifications.gotify.events).toContain('pdf_export');
  } finally {
    const config = await (await page.request.get('/api/admin/integrations')).json();
    await page.request.put('/api/admin/integrations/oidc', { headers, data: { ...config.oidc, enabled: false } });
  }
});
