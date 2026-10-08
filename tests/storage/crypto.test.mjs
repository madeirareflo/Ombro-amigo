import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { generateLocalEncryptionKey, encryptJson, decryptJson } from '../../storage/crypto.js';

test('AES-GCM cifra e restaura JSON localmente',async()=>{
  const key=await generateLocalEncryptionKey(webcrypto);
  const original={session:{entries:[{text:'conteúdo sensível'}]},summaryDraft:'rascunho'};
  const encrypted=await encryptJson(original,key,webcrypto);
  assert.equal(encrypted.algorithm,'AES-GCM');
  assert.ok(encrypted.ciphertext.length>20);
  assert.doesNotMatch(JSON.stringify(encrypted),/conteúdo sensível|rascunho/);
  assert.deepEqual(await decryptJson(encrypted,key,webcrypto),original);
});

test('chave gerada não é extraível',async()=>{
  const key=await generateLocalEncryptionKey(webcrypto);
  assert.equal(key.extractable,false);
  await assert.rejects(()=>webcrypto.subtle.exportKey('raw',key));
});

test('alteração do ciphertext faz autenticação falhar',async()=>{
  const key=await generateLocalEncryptionKey(webcrypto);
  const encrypted=await encryptJson({text:'segredo'},key,webcrypto);
  encrypted.ciphertext[0]^=1;
  await assert.rejects(()=>decryptJson(encrypted,key,webcrypto));
});
