import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readLegacyConversationState,
  clearLegacyConversationState,
  hasLegacyConversationState,
  saveAcknowledgement,
  loadAcknowledgement,
  clearAcknowledgement
} from '../../storage/local-store.js';

function fakeStorage() {
  const map=new Map();
  return {
    getItem:key=>map.has(key)?map.get(key):null,
    setItem:(key,value)=>map.set(key,String(value)),
    removeItem:key=>map.delete(key)
  };
}

test('lê formato legado apenas para migração',()=>{
  const storage=fakeStorage();
  storage.setItem('ombro-amigo.local-state.v2',JSON.stringify({
    version:2,
    savedAt:'2026-01-01T00:00:00.000Z',
    session:{entries:[{text:'x'}]},
    view:'summary',
    summaryDraft:'r'
  }));
  const state=readLegacyConversationState(storage);
  assert.equal(state.view,'summary');
  assert.equal(state.summaryDraft,'r');
  assert.equal(hasLegacyConversationState(storage),true);
});

test('limpeza remove apenas chaves antigas de conversa',()=>{
  const storage=fakeStorage();
  storage.setItem('ombro-amigo.local-state.v2','{}');
  storage.setItem('ombro-amigo.session.v1','{}');
  saveAcknowledgement(storage);
  clearLegacyConversationState(storage);
  assert.equal(storage.getItem('ombro-amigo.local-state.v2'),null);
  assert.equal(storage.getItem('ombro-amigo.session.v1'),null);
  assert.ok(loadAcknowledgement(storage));
});

test('ciência do teste continua separada e não sensível',()=>{
  const storage=fakeStorage();
  const acknowledgement=saveAcknowledgement(storage);
  assert.equal(acknowledgement.version,1);
  assert.ok(acknowledgement.acceptedAt);
  clearAcknowledgement(storage);
  assert.equal(loadAcknowledgement(storage),null);
});
