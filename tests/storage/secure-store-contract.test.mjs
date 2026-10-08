import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('conteúdo sensível não tem função de persistência em localStorage',async()=>{
  const source=await readFile('storage/local-store.js','utf8');
  assert.doesNotMatch(source,/saveLocalState|summaryDraft:String\(state|session:state/);
  assert.match(source,/saveAcknowledgement/);
});

test('armazenamento persistente usa IndexedDB e AES-GCM',async()=>{
  const secure=await readFile('storage/secure-store.js','utf8');
  const crypto=await readFile('storage/crypto.js','utf8');
  assert.match(secure,/indexedDB|indexedDbApi/);
  assert.match(secure,/encrypted-indexeddb/);
  assert.match(crypto,/AES-GCM/);
  assert.match(crypto,/iv\.length!==12/);
});

test('fallback seguro é memória, não conversa em localStorage',async()=>{
  const secure=await readFile('storage/secure-store.js','utf8');
  assert.match(secure,/memory-only/);
  assert.doesNotMatch(secure,/localStorage\.setItem/);
});

test('aplicativo usa o secure store para conteúdo sensível',async()=>{
  const app=await readFile('app/main.js','utf8');
  assert.match(app,/storage\/secure-store\.js/);
  assert.match(app,/saveConversationState/);
  assert.match(app,/loadConversationState/);
  assert.doesNotMatch(app,/saveLocalState|loadLocalState/);
});

test('exclusão segura inclui registro atual, backup e chave',async()=>{
  const secure=await readFile('storage/secure-store.js','utf8');
  assert.match(secure,/state\.delete\(STATE_ID\)/);
  assert.match(secure,/state\.delete\(BACKUP_ID\)/);
  assert.match(secure,/keys\.delete\(KEY_ID\)/);
});
