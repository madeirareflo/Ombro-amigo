import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function openFresh(page){
  await page.goto('/');
  await page.evaluate(async()=>{
    localStorage.clear();
    const databases=await indexedDB.databases?.() || [];
    await Promise.all(databases.map(db=>new Promise(resolve=>{
      if(!db.name) return resolve();
      const request=indexedDB.deleteDatabase(db.name);
      request.onsuccess=request.onerror=request.onblocked=()=>resolve();
    })));
  });
  await page.reload();
}

async function acknowledge(page){
  await page.locator('#adult-confirm').check();
  await page.locator('#acknowledge-test').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#home-view')).not.toHaveClass(/hidden/);
}

async function assertNoAxeViolations(page,label){
  const result=await new AxeBuilder({page})
    .withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa'])
    .analyze();
  expect(result.violations, label+'\n'+JSON.stringify(result.violations,null,2)).toEqual([]);
}

test('mudanças de vista levam o foco para um contexto útil',async({page})=>{
  await openFresh(page);
  await acknowledge(page);

  await expect(page.locator('#home-title')).toBeFocused();

  await page.locator('[data-start="event"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#reply')).toBeFocused();

  await page.locator('#reply').fill('Briguei com meu namorado ontem.');
  await page.locator('#reply-form button[type="submit"]').click();
  await page.locator('#say-this').click();
  await expect(page.locator('#summary-title')).toBeFocused();

  await page.locator('#summary-back').click();
  await expect(page.locator('#reply')).toBeFocused();

  await page.locator('[data-urgent-help]').filter({hasText:'Preciso de ajuda urgente'}).last().click();
  await expect(page.locator('#safety-title')).toBeFocused();
});

test('adicionar e remover itens da síntese preserva foco no editor',async({page})=>{
  await openFresh(page);
  await acknowledge(page);
  await page.locator('[data-start="event"]').click();
  await page.locator('#reply').fill('Briguei com meu namorado ontem.');
  await page.locator('#reply-form button[type="submit"]').click();
  await page.locator('#say-this').click();

  const section=page.locator('.summary-section').first();
  await section.locator('.add-item').click();

  const added=section.locator('textarea').last();
  await expect(added).toBeFocused();
  await expect(added).toHaveValue('Novo ponto');

  await section.locator('.summary-item').last().locator('.remove-item').click();
  await expect(section.locator('textarea').first()).toBeFocused();
});

test('controles interativos visíveis mantêm alvo de toque de pelo menos 44px de altura',async({page})=>{
  await openFresh(page);
  await acknowledge(page);

  for(const selector of ['button:visible','summary:visible']){
    const targets=page.locator(selector);
    const count=await targets.count();
    for(let index=0;index<count;index++){
      const target=targets.nth(index);
      const box=await target.boundingBox();
      expect(box, selector+' sem caixa visível').not.toBeNull();
      expect(box.height, selector+' índice '+index).toBeGreaterThanOrEqual(44);
    }
  }
});

test('vistas principais não apresentam violações WCAG A/AA detectáveis pelo axe',async({page})=>{
  await openFresh(page);
  await assertNoAxeViolations(page,'onboarding');

  await acknowledge(page);
  await assertNoAxeViolations(page,'home');

  await page.locator('[data-start="event"]').click();
  await page.locator('#reply').fill('Briguei com meu namorado ontem.');
  await page.locator('#reply-form button[type="submit"]').click();
  await assertNoAxeViolations(page,'conversation');

  await page.locator('#say-this').click();
  await assertNoAxeViolations(page,'summary');

  await page.locator('#summary-back').click();
  await page.locator('#back-home').click();
  await page.locator('#privacy-link').click();
  await assertNoAxeViolations(page,'privacy');

  await page.locator('#privacy-back').click();
  await page.locator('#home-view [data-urgent-help]').click();
  await assertNoAxeViolations(page,'safety');
});
