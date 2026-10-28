import { readFile } from 'node:fs/promises';
import { test, expect, type Page } from '@playwright/test';
import { sampleCVByLocale } from '../../client/src/utils/sampleCvByLocale';
import type { CVData } from '../../shared/cv';

const sample = sampleCVByLocale('pt');
const upload = (page: Page, cv: CVData) => page.locator('.upload-cv input').setInputFiles({
  name: 'curriculo.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(cv)),
});
const nameField = (page: Page) => page.getByLabel('Nome completo', { exact: true });

test('upload on landing and editor: validation, cancel, replace, undo and persistence', async ({ page }) => {
  await page.goto('/');
  const button = page.getByRole('button', { name: 'Upload CV já existente', exact: true });
  await expect(button).toBeVisible();
  const chooser = page.waitForEvent('filechooser');
  await button.click();
  await (await chooser).setFiles({ name: 'curriculo.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(sample)) });
  await expect(page).toHaveURL(/\/builder$/);
  await expect(nameField(page)).toHaveValue(sample.personal.fullName);
  await expect(button).toBeVisible();
  await page.locator('.upload-cv input').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{') });
  await expect(page.getByText('JSON inválido.', { exact: true })).toBeVisible();
  await expect(nameField(page)).toHaveValue(sample.personal.fullName);

  const replacement = { ...sample, personal: { ...sample.personal, fullName: 'Tomás Neto' } };
  page.once('dialog', dialog => dialog.dismiss());
  await upload(page, replacement);
  await expect(nameField(page)).toHaveValue(sample.personal.fullName);
  page.once('dialog', dialog => dialog.accept());
  await upload(page, replacement);
  await expect(nameField(page)).toHaveValue('Tomás Neto');
  await page.getByRole('button', { name: /Desfazer/ }).click();
  await expect(nameField(page)).toHaveValue(sample.personal.fullName);
  page.once('dialog', dialog => dialog.accept());
  await upload(page, replacement);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('opencv:draft') || 'null')?.personal?.fullName)).toBe('Tomás Neto');
  await page.reload();
  await expect(nameField(page)).toHaveValue('Tomás Neto');
  await page.getByRole('button', { name: 'Voltar ao início' }).click();
  page.once('dialog', dialog => dialog.dismiss());
  await upload(page, sample);
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole('button', { name: 'Continuar rascunho' }).first().click();
  await expect(nameField(page)).toHaveValue('Tomás Neto');
});

test('PDF export and upload restores editable data through the real API', async ({ page }) => {
  await page.goto('/');
  await upload(page, sample);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descarregar PDF', exact: false }).filter({ visible: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  const path = await download.path();
  expect(path).toBeTruthy();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Recomeçar', exact: true }).click();
  await expect(nameField(page)).toHaveValue('');
  await page.locator('.upload-cv input').setInputFiles({ name: download.suggestedFilename(), mimeType: 'application/pdf', buffer: await readFile(path!) });
  await expect(nameField(page)).toHaveValue(sample.personal.fullName);
  await nameField(page).fill('Nome alterado após upload');
  await expect(nameField(page)).toHaveValue('Nome alterado após upload');
});

test('reset can be cancelled or undone and persists after reload', async ({ page }) => {
  await page.goto('/');
  await upload(page, sample);
  const reset = page.getByRole('button', { name: 'Recomeçar', exact: true });
  page.once('dialog', dialog => dialog.dismiss());
  await reset.click();
  await expect(nameField(page)).toHaveValue(sample.personal.fullName);
  page.once('dialog', dialog => dialog.accept());
  await reset.click();
  await expect(nameField(page)).toHaveValue('');
  await expect(nameField(page)).toBeFocused();
  await page.getByRole('button', { name: /Desfazer/ }).click();
  await expect(nameField(page)).toHaveValue(sample.personal.fullName);
  page.once('dialog', dialog => dialog.accept());
  await reset.click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('opencv:draft') || 'null')?.personal?.fullName)).toBe('');
  await page.reload();
  await expect(nameField(page)).toHaveValue('');
});

test('long preview scrolls to its final page after editing', async ({ page }, testInfo) => {
  const longCV = { ...sample, experience: Array.from({ length: 14 }, (_, i) => ({ ...sample.experience[0], id: `long-${i}`, role: `Experiência ${i + 1}`, description: 'Texto extenso para verificar a pré-visualização. '.repeat(12) })) };
  await page.goto('/');
  await upload(page, longCV);
  await page.getByRole('button', { name: /Resumo/ }).first().click();
  await page.getByLabel('Resumo profissional').fill('Conteúdo acrescentado durante a edição. '.repeat(60));
  const mobile = testInfo.project.name === 'mobile';
  if (mobile) await page.getByRole('button', { name: /Pré-visualização/ }).click();
  const scroll = page.locator(mobile ? '.preview-dialog' : '.preview-scroll');
  await expect.poll(() => scroll.locator('.cv-page-frame').count()).toBeGreaterThan(2);
  await scroll.evaluate(el => { el.scrollTop = el.scrollHeight; });
  await expect.poll(() => scroll.evaluate(el => {
    const last = el.querySelectorAll('.cv-page-frame');
    const end = last[last.length - 1].getBoundingClientRect();
    const box = el.getBoundingClientRect();
    return el.scrollTop > 0 && end.bottom <= box.bottom + 1 && end.bottom > box.top;
  })).toBe(true);
});

test('developer credits link to GitHub and Konami opens outside inputs', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.site-footer').getByRole('link', { name: 'Tomás Neto', exact: true })).toHaveAttribute('href', 'https://github.com/Tomasneto404');
  await expect(page.locator('.footer-credit')).toHaveText('Developed with care by Tomás Neto and Maria Luísa');
  for (const key of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']) await page.keyboard.press(key);
  const dialog = page.getByRole('dialog', { name: 'Engineered by Tomás Neto in Portugal' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('link')).toHaveAttribute('href', 'https://github.com/Tomasneto404');
  await expect(dialog.getByRole('img', { name: 'Portugal' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await upload(page, sample);
  await nameField(page).focus();
  for (const key of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']) await page.keyboard.press(key);
  await expect(dialog).not.toBeVisible();
});

test('API rejects PDFs without editable data and exposes no signing endpoint', async ({ request }) => {
  const health = await request.get('/api/health');
  expect(health.ok()).toBe(true);
  expect(await health.json()).toEqual({ ok: true, service: 'opencv' });
  const missing = await request.get('/api/public-key');
  expect(missing.status()).toBe(404);
  const invalid = await request.post('/api/decode-pdf', { headers: { 'Content-Type': 'application/pdf' }, data: Buffer.from('invalid PDF') });
  expect(invalid.status()).toBe(422);
});
