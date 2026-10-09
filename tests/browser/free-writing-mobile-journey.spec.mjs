import {test,expect} from '@playwright/test';

const story='Ontem fiquei muito ansioso.\nHoje não sei se quero falar disso.';

async function beginFree(page){
  await page.setViewportSize({width:375,height:812});
  await page.goto('/');
  await page.locator('#adult-confirm').check();
  await page.locator('#acknowledge-test').click();
  await page.locator('[data-start="free"]').click();
}

test('mobile free writing: highlighting, review, reorder, approval and retained original',async({page})=>{
  await beginFree(page);
  const editor=page.locator('#free-writing-text');
  await editor.fill(story);
  await page.locator('#save-free-writing').click();
  await expect(page.locator('#free-writing-status')).not.toContainText('Salvando alterações');
  await editor.evaluate(node=>{node.focus();node.setSelectionRange(0,29);});
  await page.locator('#highlight-free-writing').click();
  await expect(page.locator('#free-highlight-status')).toContainText('Trecho escolhido');
  await page.locator('#organize-free-writing').click();
  await expect(page.locator('#summary-view')).toBeVisible();
  await expect(page.locator('#summary-text')).toHaveValue(/Hoje não sei se quero falar disso\./);
  const points=page.locator('.summary-section[data-section-id="sessionPoints"]');
  await expect(points.locator('.summary-item').first()).toBeVisible();
  const facts=page.locator('.summary-section[data-section-id="facts"]');
  await facts.locator('.summary-section-fold').click();
  await expect(facts.locator('.summary-section-fold')).toHaveAttribute('aria-expanded','false');
  await facts.locator('.summary-section-fold').click();
  await expect(facts.locator('.summary-section-fold')).toHaveAttribute('aria-expanded','true');
  const item=facts.locator('.summary-item').first();
  await item.locator('textarea').fill('Ontem fiquei muito ansioso mesmo.');
  await expect(item.locator('.origin-badge')).toHaveText('Você editou');
  await page.locator('#accept-summary').click();
  await expect(page.locator('#copy-panel')).toBeVisible();
  await expect(page.locator('#summary-text')).toHaveValue(/Ontem fiquei muito ansioso mesmo\./);
  await page.locator('#summary-back').click();
  await expect(editor).toHaveValue(story);
});

test('narrow mobile review does not overflow horizontally and controls are usable',async({page})=>{
  await beginFree(page);
  await page.locator('#free-writing-text').fill(story);
  await page.locator('#organize-free-writing').click();
  const horizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
  expect(horizontalOverflow).toBe(false);
  for(const locator of [
    page.locator('.summary-section-fold').first(),
    page.locator('.summary-move-controls button').first(),
    page.locator('.summary-item textarea').first()
  ]){
    const box=await locator.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThan(0);
  }
  await expect(page.locator('.summary-section-fold').first()).toHaveAttribute('aria-expanded','true');
});
