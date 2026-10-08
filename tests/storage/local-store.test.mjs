import test from 'node:test';
import assert from 'node:assert/strict';
import { saveLocalState, loadLocalState, clearLocalState } from '../../storage/local-store.js';

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
