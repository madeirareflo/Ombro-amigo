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
});

test('fallback seguro é memória, não conversa em localStorage',async()=>{
  const secure=await readFile('storage/secure-store.js','utf8');
  assert.match(secure,/memory-only/);
  assert.doesNotMatch(secure,/localStorage\.setItem/);
});
