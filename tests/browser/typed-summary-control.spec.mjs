import {test,expect} from '@playwright/test';

test('pedido escrito “me ajude a dizer isso” abre síntese e não vira relato',async({page})=>{
  await page.goto('/');
  await page.locator('#adult-confirm').check();
  await page.locator('#acknowledge-test').click();
  await page.locator('[data-start="feeling"]').click();

  await page.locator('#reply').fill('Sinto o mundo mais colorido e uma falsa sensação de felicidade.');
  await page.locator('#reply-form button[type="submit"]').click();
  await page.locator('#reply').fill('me ajude a dizer isso');
  await page.locator('#reply-form button[type="submit"]').click();

  await expect(page.locator('#summary-view')).toBeVisible();
  await expect(page.locator('#summary-title')).toBeVisible();
  await expect(page.locator('#summary-editor textarea').first()).toHaveValue(/mundo mais colorido/i);
  await expect(page.locator('#summary-editor')).not.toContainText(/me ajude a dizer isso/i);
  await expect(page.locator('#summary-text')).not.toHaveValue(/me ajude a dizer isso/i);
});
