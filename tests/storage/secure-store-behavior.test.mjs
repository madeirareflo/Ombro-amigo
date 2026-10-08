import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { generateLocalEncryptionKey, encryptJson } from '../../storage/crypto.js';
import {
  createConversationStorage,
  decryptEncryptedState,
  migrateLegacySafely
} from '../../storage/secure-store.js';

function fakeStorage(){
  const map=new Map();
  return {
    getItem:key=>map.has(key)?map.get(key):null,
    setItem:(key,value)=>map.set(key,String(value)),
    removeItem:key=>map.delete(key),
    has:key=>map.has(key)
  };
}

async function makeBackend(){
  const records=new Map();
  const key=await generateLocalEncryptionKey(webcrypto);
  let deleted=false;
  return {
    mode:'encrypted-indexeddb',
    persistent:true,
    encrypted:true,
    key,
    cryptoApi:webcrypto,
    getRecord:async id=>records.get(id) || null,
    commitEncryptedRecord:async record=>{
      const current=records.get('conversation');
      if(current) records.set('conversation-backup',structuredClone(current));
      records.set('conversation',structuredClone(record));
    },
    deleteAllSensitive:async()=>{ records.clear(); deleted=true; },
    close:()=>{},
    records,
    wasDeleted:()=>deleted
  };
}

test('migração só limpa legado depois de persistência confirmada',async()=>{
  let cleared=false;
  await migrateLegacySafely({session:{entries:[{text:'x'}]}},async()=>{},()=>{cleared=true;});
  assert.equal(cleared,true);

  cleared=false;
  await assert.rejects(()=>migrateLegacySafely(
    {session:{entries:[{text:'x'}]}},
    async()=>{ throw new Error('write failed'); },
    ()=>{cleared=true;}
  ));
  assert.equal(cleared,false);
});

test('migra conversa v2, preserva savedAt e remove texto claro apenas após sucesso',async()=>{
  const legacy=fakeStorage();
  legacy.setItem('ombro-amigo.local-state.v2',JSON.stringify({
    version:2,
    savedAt:'2026-01-02T03:04:05.000Z',
    session:{mode:'session',entries:[{text:'conteúdo pessoal'}]},
    view:'summary',
    summaryDraft:'rascunho pessoal'
  }));
  const backend=await makeBackend();
  const store=createConversationStorage({
    backendFactory:async()=>backend,
    legacyStorage:legacy,
    now:()=> '2026-10-08T12:00:00.000Z'
  });

  const status=await store.initializeConversationStorage();
  assert.equal(status.mode,'encrypted-indexeddb');
  assert.equal(status.legacyPlaintextPresent,false);
  assert.equal(status.persistenceConfirmed,true);
  assert.equal(legacy.getItem('ombro-amigo.local-state.v2'),null);

  const loaded=await store.loadConversationState();
  assert.equal(loaded.savedAt,'2026-01-02T03:04:05.000Z');
  assert.equal(loaded.session.entries[0].text,'conteúdo pessoal');
  assert.doesNotMatch(JSON.stringify(backend.records.get('conversation')),/conteúdo pessoal|rascunho pessoal/);
});

test('falha de migração mantém legado e ainda permite leitura sem sobrescrever em texto claro',async()=>{
  const legacy=fakeStorage();
  legacy.setItem('ombro-amigo.local-state.v2',JSON.stringify({
    version:2,
    session:{entries:[{text:'não perder'}]},
    view:'conversation'
  }));
  const backend=await makeBackend();
  backend.commitEncryptedRecord=async()=>{ throw new Error('quota'); };
  const store=createConversationStorage({backendFactory:async()=>backend,legacyStorage:legacy});

  const status=await store.initializeConversationStorage();
  assert.equal(status.legacyPlaintextPresent,true);
  assert.equal(status.persistenceConfirmed,false);
  assert.ok(legacy.getItem('ombro-amigo.local-state.v2'));
  const loaded=await store.loadConversationState();
  assert.equal(loaded.session.entries[0].text,'não perder');
});

test('corrupção do registro atual recupera a cópia cifrada anterior',async()=>{
  const backend=await makeBackend();
  const store=createConversationStorage({backendFactory:async()=>backend,legacyStorage:fakeStorage()});

  await store.saveConversationState({session:{entries:[{text:'versão anterior'}]}});
  await store.saveConversationState({session:{entries:[{text:'versão atual'}]}});

  const primary=backend.records.get('conversation');
  primary.encrypted.ciphertext[0]^=1;
  backend.records.set('conversation',primary);

  const loaded=await store.loadConversationState();
  assert.equal(loaded.session.entries[0].text,'versão anterior');
  const status=await store.getConversationStorageStatus();
  assert.equal(status.recoveredFromBackup,true);
  assert.equal(status.error,'recovered-from-backup');
});

test('helper de recuperação falha se principal e backup não autenticam',async()=>{
  const key=await generateLocalEncryptionKey(webcrypto);
  const primary={encrypted:await encryptJson({session:{entries:[{text:'a'}]}},key,webcrypto)};
  const backup={encrypted:await encryptJson({session:{entries:[{text:'b'}]}},key,webcrypto)};
  primary.encrypted.ciphertext[0]^=1;
  backup.encrypted.ciphertext[0]^=1;
  await assert.rejects(()=>decryptEncryptedState({primary,backup},key,webcrypto));
});

test('apagar conversa remove estado cifrado e material de chave no backend',async()=>{
  const created=[];
  const factory=async()=>{
    const backend=await makeBackend();
    created.push(backend);
    return backend;
  };
  const store=createConversationStorage({backendFactory:factory,legacyStorage:fakeStorage()});

  await store.saveConversationState({session:{entries:[{text:'apagar'}]}});
  assert.ok(created[0].records.get('conversation'));
  await store.clearConversationState();
  assert.equal(created[0].records.size,0);
  assert.equal(created[0].wasDeleted(),true);
});
