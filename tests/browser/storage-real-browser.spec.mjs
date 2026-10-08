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


test('fluxo real do app grava o relato somente no IndexedDB cifrado',async({page})=>{
  await page.goto('/');

  await page.locator('#adult-confirm').check();
  await page.locator('#acknowledge-test').click();
  await page.locator('[data-start="event"]').click();

  const sensitive='texto pessoal para validar integração real';
  await page.locator('#reply').fill(sensitive);
  await page.locator('#reply-form button[type="submit"]').click();

  await expect.poll(async()=>page.evaluate(async()=>{
    const request=indexedDB.open('ombro-amigo.secure.v1',1);
    const db=await new Promise((resolve,reject)=>{
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
    const tx=db.transaction('state','readonly');
    const get=tx.objectStore('state').get('conversation');
    const record=await new Promise((resolve,reject)=>{
      get.onsuccess=()=>resolve(get.result);
      get.onerror=()=>reject(get.error);
    });
    db.close();
    return Boolean(record?.encrypted?.ciphertext?.length);
  })).toBe(true);

  const persisted=await page.evaluate(async sensitiveText=>{
    const localValues=Object.keys(localStorage).map(key=>({
      key,
      value:localStorage.getItem(key)
    }));

    const request=indexedDB.open('ombro-amigo.secure.v1',1);
    const db=await new Promise((resolve,reject)=>{
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
    const tx=db.transaction(['state','keys'],'readonly');
    const stateRequest=tx.objectStore('state').get('conversation');
    const keyRequest=tx.objectStore('keys').get('conversation-key');
    const [state,key]=await Promise.all([
      new Promise((resolve,reject)=>{
        stateRequest.onsuccess=()=>resolve(stateRequest.result);
        stateRequest.onerror=()=>reject(stateRequest.error);
      }),
      new Promise((resolve,reject)=>{
        keyRequest.onsuccess=()=>resolve(keyRequest.result);
        keyRequest.onerror=()=>reject(keyRequest.error);
      })
    ]);
    db.close();

    return {
      localValues,
      stateSerialized:JSON.stringify(state),
      keyExtractable:key?.extractable ?? null,
      plaintextInLocalStorage:localValues.some(item=>item.value?.includes(sensitiveText))
    };
  },sensitive);

  expect(persisted.plaintextInLocalStorage).toBe(false);
  expect(persisted.localValues.map(item=>item.key)).toEqual(['ombro-amigo.acknowledgement.v1']);
  expect(persisted.stateSerialized).not.toContain(sensitive);
  expect(persisted.keyExtractable).toBe(false);

  await page.reload();
  await expect(page.locator('#resume-panel')).not.toHaveClass(/hidden/);
  await expect(page.locator('#resume-info')).toContainText('persistida cifrada neste navegador');
});
