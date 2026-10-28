import { test, expect, type Page } from '@playwright/test';

async function register(page: Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Ainda não tens conta? Criar conta' }).click();
  await page.getByLabel('O teu nome', { exact: true }).fill('Ana da Conta');
  const email = `account-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Palavra-passe', { exact: true }).fill('uma palavra passe de teste');
  await page.getByRole('button', { name: 'Criar conta', exact: false }).filter({ hasText: /^Criar conta/ }).click();
  await expect(page).toHaveURL(/\/account$/);
  return email;
}

test('account CVs are editable, persist, stay private on logout and leave the public draft intact', async ({ page }) => {
  await page.goto('/builder');
  await page.getByLabel('Nome completo', { exact: true }).fill('Rascunho Público');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('opencv:draft') || 'null')?.personal.fullName)).toBe('Rascunho Público');
  const email = await register(page);
  await page.getByRole('button', { name: /Novo CV/ }).click();
  await expect(page).toHaveURL(/\/builder\/[\w-]+$/);
  await page.getByLabel('Título do CV', { exact: true }).fill('Candidatura a Designer');
  await page.getByLabel('Nome completo', { exact: true }).fill('CV Privado da Ana');
  await page.getByRole('button', { name: 'Guardar alterações', exact: true }).click();
  await expect(page.locator('.account-save-panel').getByRole('status')).toHaveText('Guardado na tua conta');
  await page.reload();
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue('CV Privado da Ana');
  await page.getByLabel('Título do CV', { exact: true }).fill('Cópia de Designer');
  await page.getByRole('button', { name: 'Guardar uma cópia', exact: true }).click();
  await expect(page.locator('.account-save-panel').getByRole('status')).toHaveText('Guardado na tua conta');
  await page.getByLabel('Nome completo', { exact: true }).fill('Alteração por guardar');
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Os meus CVs', exact: true }).click();
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue('Alteração por guardar');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Os meus CVs', exact: true }).click();
  await expect(page.locator('.saved-cv-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await page.goto('/builder');
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue('Rascunho Público');
  expect(await page.evaluate(() => localStorage.getItem('opencv:draft'))).not.toContain('CV Privado da Ana');
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Palavra-passe', { exact: true }).fill('uma palavra passe de teste');
  await page.getByRole('button', { name: 'Entrar', exact: false }).filter({ hasText: /^Entrar/ }).click();
  await expect(page.locator('.saved-cv-card')).toHaveCount(2);
  page.once('dialog', dialog => dialog.accept());
  await page.locator('.saved-cv-card').filter({ hasText: 'Cópia de Designer' }).getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.locator('.saved-cv-card')).toHaveCount(1);
});

test('signed-in users can save the public editor draft to their account', async ({ page }) => {
  await register(page);
  await page.getByRole('button', { name: /Editor público/ }).click();
  await page.getByLabel('Nome completo', { exact: true }).fill('Guardado do editor público');
  await page.getByLabel('Título do CV', { exact: true }).fill('CV importado');
  await page.getByRole('button', { name: 'Guardar na conta', exact: true }).click();
  await expect(page).toHaveURL(/\/builder\/[\w-]+$/);
  await expect(page.getByLabel('Nome completo', { exact: true })).toHaveValue('Guardado do editor público');
  await page.getByRole('button', { name: 'Os meus CVs', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'CV importado' })).toBeVisible();
});
