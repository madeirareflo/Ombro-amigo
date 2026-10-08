import { test, expect } from '@playwright/test';

async function openHarness(page){
  await page.goto('/tests/browser/storage-harness.html');
  await page.waitForFunction(()=>window.__storageHarnessReady===true);
}

test('migra localStorage para IndexedDB cifrado e a CryptoKey sobrevive ao reload',async({page})=>{
  await openHarness(page);

  await page.evaluate(()=>{
    window.storageHarness.seedLegacy({
      version:2,
      savedAt:'2026-01-02T03:04:05.000Z',
      session:{mode:'session',depth:'light',entries:[{text:'relato que deve ficar cifrado'}]},
      view:'summary',
      summaryDraft:'rascunho privado'
    });
  });

  const status=await page.evaluate(()=>window.storageHarness.initializeConversationStorage());
  expect(status.mode).toBe('encrypted-indexeddb');
  expect(status.persistenceConfirmed).toBe(true);
  expect(status.legacyPlaintextPresent).toBe(false);

  const raw=await page.evaluate(()=>window.storageHarness.inspectDb());
  expect(raw.key.exists).toBe(true);
  expect(raw.key.constructor).toBe('CryptoKey');
  expect(raw.key.extractable).toBe(false);
  expect(raw.key.algorithm).toBe('AES-GCM');

  const serialized=JSON.stringify(raw.primary);
  expect(serialized).not.toContain('relato que deve ficar cifrado');
  expect(serialized).not.toContain('rascunho privado');
  expect(await page.evaluate(()=>window.storageHarness.legacyRaw())).toBeNull();

  await page.reload();
  await page.waitForFunction(()=>window.__storageHarnessReady===true);
  const restored=await page.evaluate(()=>window.storageHarness.loadConversationState());
  expect(restored.savedAt).toBe('2026-01-02T03:04:05.000Z');
  expect(restored.session.entries[0].text).toBe('relato que deve ficar cifrado');
  expect(restored.summaryDraft).toBe('rascunho privado');
});

test('recupera a versão cifrada anterior quando o registro atual é adulterado',async({page})=>{
  await openHarness(page);

  await page.evaluate(()=>window.storageHarness.saveConversationState({
    session:{mode:'session',entries:[{text:'versão anterior'}]},
    view:'conversation'
  }));
  await page.evaluate(()=>window.storageHarness.saveConversationState({
    session:{mode:'session',entries:[{text:'versão atual'}]},
    view:'conversation'
  }));

  await page.evaluate(()=>window.storageHarness.corruptPrimary());
  await page.reload();
  await page.waitForFunction(()=>window.__storageHarnessReady===true);

  const restored=await page.evaluate(()=>window.storageHarness.loadConversationState());
  expect(restored.session.entries[0].text).toBe('versão anterior');

  const status=await page.evaluate(()=>window.storageHarness.getConversationStorageStatus());
  expect(status.recoveredFromBackup).toBe(true);
  expect(status.error).toBe('recovered-from-backup');
});

test('apagar dados sensíveis remove estado atual, backup e CryptoKey',async({page})=>{
  await openHarness(page);

  await page.evaluate(()=>window.storageHarness.saveConversationState({
    session:{mode:'session',entries:[{text:'conteúdo a apagar'}]},
    view:'conversation'
  }));
  await page.evaluate(()=>window.storageHarness.saveConversationState({
    session:{mode:'session',entries:[{text:'segunda versão'}]},
    view:'conversation'
  }));

  let raw=await page.evaluate(()=>window.storageHarness.inspectDb());
  expect(raw.primary).toBeTruthy();
  expect(raw.backup).toBeTruthy();
  expect(raw.key.exists).toBe(true);

  await page.evaluate(()=>window.storageHarness.clearAllSensitiveState());

  raw=await page.evaluate(()=>window.storageHarness.inspectDb());
  expect(raw.primary).toBeUndefined();
  expect(raw.backup).toBeUndefined();
  expect(raw.key.exists).toBe(false);
});

test('PWA recarrega offline depois da primeira carga com os módulos de armazenamento seguro',async({page,context})=>{
  await page.goto('/');
  await page.waitForFunction(()=>navigator.serviceWorker?.controller || false,{timeout:10000});

  await context.setOffline(true);
  await page.reload({waitUntil:'domcontentloaded'});

  await expect(page.locator('#onboarding-title')).toContainText('Uma ferramenta para preparar uma conversa humana');
  await expect(page.locator('#pwa-status')).toContainText('Offline');
});
