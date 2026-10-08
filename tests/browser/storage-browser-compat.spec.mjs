import { test, expect } from '@playwright/test';

async function openHarness(page){
  await page.goto('/tests/browser/storage-harness.html');
  await page.waitForFunction(()=>window.__storageHarnessReady===true);
}

test('migração e CryptoKey não extraível sobrevivem a reload no engine atual',async({page,browserName})=>{
  await openHarness(page);

  const sensitive='compatibilidade local '+browserName;
  await page.evaluate(text=>{
    window.storageHarness.seedLegacy({
      version:2,
      savedAt:'2026-10-08T15:00:00.000Z',
      session:{mode:'session',depth:'light',entries:[{text}]},
      view:'conversation',
      summaryDraft:''
    });
  },sensitive);

  const status=await page.evaluate(()=>window.storageHarness.initializeConversationStorage());
  expect(status.mode).toBe('encrypted-indexeddb');
  expect(status.persistenceConfirmed).toBe(true);
  expect(status.legacyPlaintextPresent).toBe(false);

  const stored=await page.evaluate(()=>window.storageHarness.inspectDb());
  expect(stored.primary).toBeTruthy();
  expect(stored.key.exists).toBe(true);
  expect(stored.key.constructor).toBe('CryptoKey');
  expect(stored.key.extractable).toBe(false);
  expect(stored.key.algorithm).toBe('AES-GCM');
  expect(JSON.stringify(stored.primary)).not.toContain(sensitive);

  await page.reload();
  await page.waitForFunction(()=>window.__storageHarnessReady===true);

  const restored=await page.evaluate(()=>window.storageHarness.loadConversationState());
  expect(restored.session.entries[0].text).toBe(sensitive);

  const reloaded=await page.evaluate(()=>window.storageHarness.inspectDb());
  expect(reloaded.key.exists).toBe(true);
  expect(reloaded.key.extractable).toBe(false);
  expect(reloaded.key.algorithm).toBe('AES-GCM');
});
