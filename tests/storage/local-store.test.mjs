import test from 'node:test';
import assert from 'node:assert/strict';
import {
  saveLocalState,
  loadLocalState,
  clearLocalState,
  saveAcknowledgement,
  loadAcknowledgement,
  clearAcknowledgement,
  getLocalDataStatus,
  clearAllLocalData
} from '../../storage/local-store.js';

function fakeStorage() {
  const map=new Map();
  return {
    getItem:key=>map.has(key)?map.get(key):null,
    setItem:(key,value)=>map.set(key,String(value)),
    removeItem:key=>map.delete(key)
  };
}

test('salva e restaura conversa somente no storage fornecido', () => {
  const storage=fakeStorage();
  const session={mode:'session',depth:'light',entries:[{text:'Quero falar disso.'}]};
  const saved=saveLocalState({session,view:'conversation',summaryDraft:''},storage);
  const loaded=loadLocalState(storage);
  assert.equal(saved.version,2);
  assert.deepEqual(loaded.session,session);
  assert.equal(loaded.view,'conversation');
});

test('preserva rascunho da síntese ao recarregar', () => {
  const storage=fakeStorage();
  saveLocalState({
    session:{mode:'session',depth:'medium',entries:[{text:'Algo aconteceu.'}]},
    view:'summary',
    summaryDraft:'Meu rascunho editado'
  },storage);
  const loaded=loadLocalState(storage);
  assert.equal(loaded.view,'summary');
  assert.equal(loaded.summaryDraft,'Meu rascunho editado');
});

test('apagar remove o estado local', () => {
  const storage=fakeStorage();
  saveLocalState({session:{entries:[{text:'x'}]}},storage);
  clearLocalState(storage);
  assert.equal(loadLocalState(storage),null);
});


test('ciência do teste é local e separada do conteúdo da conversa', () => {
  const storage=fakeStorage();
  const acknowledgement=saveAcknowledgement(storage);
  assert.equal(acknowledgement.version,1);
  assert.ok(acknowledgement.acceptedAt);
  assert.equal(loadLocalState(storage),null);
  assert.equal(loadAcknowledgement(storage).version,1);
});

test('ciência do teste pode ser removida localmente', () => {
  const storage=fakeStorage();
  saveAcknowledgement(storage);
  clearAcknowledgement(storage);
  assert.equal(loadAcknowledgement(storage),null);
});


test('status local informa presença sem expor conteúdo', () => {
  const storage=fakeStorage();
  saveAcknowledgement(storage);
  saveLocalState({
    session:{mode:'session',entries:[{text:'conteúdo sensível'}]},
    view:'conversation',
    summaryDraft:'rascunho'
  },storage);
  const status=getLocalDataStatus(storage);
  assert.equal(status.hasConversation,true);
  assert.equal(status.hasAcknowledgement,true);
  assert.ok(status.savedAt);
  assert.ok(status.acceptedAt);
  assert.equal(Object.hasOwn(status,'session'),false);
  assert.equal(Object.hasOwn(status,'summaryDraft'),false);
});

test('apagar tudo remove conversa e ciência do teste', () => {
  const storage=fakeStorage();
  saveAcknowledgement(storage);
  saveLocalState({session:{entries:[{text:'x'}]}},storage);
  clearAllLocalData(storage);
  assert.equal(loadLocalState(storage),null);
  assert.equal(loadAcknowledgement(storage),null);
  assert.deepEqual(getLocalDataStatus(storage),{
    hasConversation:false,
    savedAt:null,
    hasAcknowledgement:false,
    acceptedAt:null
  });
});
