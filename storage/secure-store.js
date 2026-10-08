import { generateLocalEncryptionKey, encryptJson, decryptJson } from './crypto.js';
import {
  readLegacyConversationState,
  clearLegacyConversationState,
  hasLegacyConversationState
} from './local-store.js';

const DB_NAME='ombro-amigo.secure.v1';
const DB_VERSION=1;
const STATE_STORE='state';
const KEY_STORE='keys';
const STATE_ID='conversation';
const BACKUP_ID='conversation-backup';
const KEY_ID='conversation-key';

function browserStorage(){
  return typeof localStorage==='undefined' ? null : localStorage;
}

function secureApisAvailable(indexedDbApi=globalThis.indexedDB,cryptoApi=globalThis.crypto){
  return Boolean(indexedDbApi && cryptoApi?.subtle && typeof cryptoApi?.getRandomValues==='function');
}

function openDb(indexedDbApi){
  return new Promise((resolve,reject)=>{
    const request=indexedDbApi.open(DB_NAME,DB_VERSION);
    request.onupgradeneeded=()=>{
      const db=request.result;
      if(!db.objectStoreNames.contains(STATE_STORE)) db.createObjectStore(STATE_STORE);
      if(!db.objectStoreNames.contains(KEY_STORE)) db.createObjectStore(KEY_STORE);
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error || new Error('IndexedDB open failed'));
    request.onblocked=()=>reject(new Error('IndexedDB blocked'));
  });
}

function idbOperation(db,storeName,mode,operation){
  return new Promise((resolve,reject)=>{
    let result;
    const tx=db.transaction(storeName,mode);
    const store=tx.objectStore(storeName);
    const request=operation(store);
    request.onsuccess=()=>{ result=request.result; };
    request.onerror=()=>reject(request.error || new Error('IndexedDB request failed'));
    tx.oncomplete=()=>resolve(result);
    tx.onerror=()=>reject(tx.error || new Error('IndexedDB transaction failed'));
    tx.onabort=()=>reject(tx.error || new Error('IndexedDB transaction aborted'));
  });
}

const idbGet=(db,store,key)=>idbOperation(db,store,'readonly',store=>store.get(key));
const idbPut=(db,store,key,value)=>idbOperation(db,store,'readwrite',target=>target.put(value,key));

function idbCommitState(db,record){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STATE_STORE,'readwrite');
    const store=tx.objectStore(STATE_STORE);
    const current=store.get(STATE_ID);

    current.onerror=()=>reject(current.error || new Error('IndexedDB state read failed'));
    current.onsuccess=()=>{
      if(current.result) store.put(current.result,BACKUP_ID);
      store.put(record,STATE_ID);
    };
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error || new Error('IndexedDB state commit failed'));
    tx.onabort=()=>reject(tx.error || new Error('IndexedDB state commit aborted'));
  });
}

function idbDeleteAllSensitive(db){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction([STATE_STORE,KEY_STORE],'readwrite');
    const state=tx.objectStore(STATE_STORE);
    const keys=tx.objectStore(KEY_STORE);
    state.delete(STATE_ID);
    state.delete(BACKUP_ID);
    keys.delete(KEY_ID);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error || new Error('IndexedDB secure deletion failed'));
    tx.onabort=()=>reject(tx.error || new Error('IndexedDB secure deletion aborted'));
  });
}

async function createDefaultBackend(){
  const indexedDbApi=globalThis.indexedDB;
  const cryptoApi=globalThis.crypto;
  if(!secureApisAvailable(indexedDbApi,cryptoApi)){
    return {mode:'memory-only',persistent:false,encrypted:false};
  }

  const db=await openDb(indexedDbApi);
  const [primary,backup]=await Promise.all([
    idbGet(db,STATE_STORE,STATE_ID),
    idbGet(db,STATE_STORE,BACKUP_ID)
  ]);
  let key=await idbGet(db,KEY_STORE,KEY_ID);

  if(!key && (primary?.encrypted || backup?.encrypted)){
    return {
      mode:'locked-indexeddb',
      persistent:false,
      encrypted:true,
      key:null,
      cryptoApi,
      initialError:'missing-encryption-key',
      hasUnreadableData:true,
      getRecord:id=>idbGet(db,STATE_STORE,id),
      deleteAllSensitive:()=>idbDeleteAllSensitive(db),
      close:()=>db.close()
    };
  }

  if(!key){
    key=await generateLocalEncryptionKey(cryptoApi);
    await idbPut(db,KEY_STORE,KEY_ID,key);
  }

  return {
    mode:'encrypted-indexeddb',
    persistent:true,
    encrypted:true,
    key,
    cryptoApi,
    hasUnreadableData:false,
    getRecord:id=>idbGet(db,STATE_STORE,id),
    commitEncryptedRecord:record=>idbCommitState(db,record),
    deleteAllSensitive:()=>idbDeleteAllSensitive(db),
    close:()=>db.close()
  };
}

function buildPayload(state,now,{preserveSavedAt=false}={}){
  return {
    version:3,
    savedAt:preserveSavedAt && state?.savedAt ? state.savedAt : now(),
    session:state?.session || null,
    view:state?.view || 'conversation',
    summaryDraft:String(state?.summaryDraft || ''),
    summaryModel:state?.summaryModel || null
  };
}

async function decryptRecord(record,key,cryptoApi){
  if(!record?.encrypted) return null;
  const value=await decryptJson(record.encrypted,key,cryptoApi);
  return value?.session ? value : null;
}

export async function decryptEncryptedState({primary,backup},key,cryptoApi=globalThis.crypto){
  let primaryError=null;
  if(primary?.encrypted){
    try{
      return {value:await decryptRecord(primary,key,cryptoApi),recoveredFromBackup:false};
    }catch(error){
      primaryError=error;
    }
  }

  if(backup?.encrypted){
    try{
      return {value:await decryptRecord(backup,key,cryptoApi),recoveredFromBackup:true};
    }catch(error){
      if(!primaryError) primaryError=error;
    }
  }

  if(primaryError) throw primaryError;
  return {value:null,recoveredFromBackup:false};
}

export async function migrateLegacySafely(legacy,persistEncrypted,clearLegacy){
  if(!legacy) return false;
  await persistEncrypted(legacy);
  clearLegacy();
  return true;
}

export function createConversationStorage({
  backendFactory=createDefaultBackend,
  legacyStorage=browserStorage(),
  now=()=>new Date().toISOString()
}={}){
  let backendPromise=null;
  let memoryState=null;
  let lastError=null;
  let recoveredFromBackup=false;
  let writeQueue=Promise.resolve();

  async function getBackend(){
    if(!backendPromise){
      backendPromise=Promise.resolve()
        .then(()=>backendFactory())
        .then(target=>{
          if(target?.initialError) lastError=target.initialError;
          return target;
        })
        .catch(error=>{
          lastError=error?.name || 'secure-storage-init-failed';
          return {mode:'memory-only',persistent:false,encrypted:false};
        });
    }
    return backendPromise;
  }

  function enqueue(task){
    const run=writeQueue.then(task,task);
    writeQueue=run.catch(()=>{});
    return run;
  }

  async function readEncryptedState(target){
    const [primary,backup]=await Promise.all([
      target.getRecord(STATE_ID),
      target.getRecord(BACKUP_ID)
    ]);
    const result=await decryptEncryptedState({primary,backup},target.key,target.cryptoApi);
    recoveredFromBackup=result.recoveredFromBackup;
    if(result.recoveredFromBackup) lastError='recovered-from-backup';
    return result.value;
  }

  async function writeEncryptedState(target,payload){
    const encrypted=await encryptJson(payload,target.key,target.cryptoApi);
    await target.commitEncryptedRecord({
      id:STATE_ID,
      savedAt:payload.savedAt,
      encrypted
    });
  }

  async function migrateLegacyIfNeeded(target){
    const legacy=readLegacyConversationState(legacyStorage);
    if(!legacy) return false;

    if(target.mode!=='encrypted-indexeddb'){
      memoryState=buildPayload(legacy,now,{preserveSavedAt:true});
      return false;
    }

    try{
      const existing=await readEncryptedState(target);
      if(existing?.session){
        clearLegacyConversationState(legacyStorage);
        return true;
      }
    }catch{
      // A cópia legada continua sendo a fonte de recuperação e só será
      // removida depois de uma nova gravação cifrada confirmada.
    }

    const payload=buildPayload(legacy,now,{preserveSavedAt:true});
    await migrateLegacySafely(
      payload,
      value=>writeEncryptedState(target,value),
      ()=>clearLegacyConversationState(legacyStorage)
    );
    memoryState=null;
    recoveredFromBackup=false;
    lastError=null;
    return true;
  }

  async function initialize(){
    const target=await getBackend();
    try{
      await migrateLegacyIfNeeded(target);
    }catch(error){
      lastError=error?.name || 'legacy-migration-failed';
      const legacy=readLegacyConversationState(legacyStorage);
      if(legacy) memoryState=buildPayload(legacy,now,{preserveSavedAt:true});
    }
    return status();
  }

  async function save(state){
    const payload=buildPayload(state,now);
    return enqueue(async()=>{
      const target=await getBackend();

      if(target.mode==='encrypted-indexeddb'){
        try{
          await writeEncryptedState(target,payload);
          clearLegacyConversationState(legacyStorage);
          memoryState=null;
          recoveredFromBackup=false;
          lastError=null;
          return payload;
        }catch(error){
          lastError=error?.name || 'secure-save-failed';
          memoryState=payload;
          return payload;
        }
      }

      memoryState=payload;
      return payload;
    });
  }

  async function load(){
    await writeQueue;
    const target=await getBackend();

    // Se a última gravação segura falhou, memoryState é a cópia mais recente
    // desta sessão. Não devemos substituí-la silenciosamente por um registro
    // cifrado anterior apenas porque ele ainda é legível.
    if(memoryState) return memoryState;

    if(target.mode==='encrypted-indexeddb'){
      try{
        const value=await readEncryptedState(target);
        if(value){
          if(!recoveredFromBackup) lastError=null;
          return value;
        }
      }catch(error){
        lastError=error?.name || 'secure-load-failed';
      }

      const legacy=readLegacyConversationState(legacyStorage);
      if(legacy){
        memoryState=buildPayload(legacy,now,{preserveSavedAt:true});
        return memoryState;
      }
      return null;
    }

    const legacy=readLegacyConversationState(legacyStorage);
    if(legacy){
      memoryState=buildPayload(legacy,now,{preserveSavedAt:true});
      return memoryState;
    }
    return null;
  }

  async function clear(){
    return enqueue(async()=>{
      const target=await getBackend();
      memoryState=null;
      recoveredFromBackup=false;

      if(typeof target.deleteAllSensitive==='function'){
        try{
          await target.deleteAllSensitive();
          target.close?.();
          backendPromise=null;
        }catch(error){
          lastError=error?.name || 'secure-delete-failed';
          clearLegacyConversationState(legacyStorage);
          throw error;
        }
      }

      clearLegacyConversationState(legacyStorage);
      lastError=null;
      return true;
    });
  }

  async function status(){
    await writeQueue;
    const target=await getBackend();
    let hasConversation=Boolean(memoryState?.session);
    let savedAt=memoryState?.savedAt || null;
    let persistenceConfirmed=false;

    if(target.mode==='encrypted-indexeddb'){
      try{
        const [primary,backup]=await Promise.all([
          target.getRecord(STATE_ID),
          target.getRecord(BACKUP_ID)
        ]);
        const record=primary || backup;
        if(record?.encrypted){
          hasConversation=true;
          if(!memoryState) savedAt=record.savedAt || savedAt;
          persistenceConfirmed=!memoryState;
        }
      }catch(error){
        lastError=error?.name || 'secure-status-failed';
      }
    }

    return {
      hasConversation,
      savedAt,
      mode:target.mode,
      encrypted:target.encrypted,
      persistent:target.persistent,
      persistenceConfirmed,
      keyStrategy:target.mode==='encrypted-indexeddb'
        ? 'device-bound-non-extractable-same-origin'
        : target.hasUnreadableData
          ? 'missing-local-key'
          : 'none',
      hasUnreadableData:Boolean(target.hasUnreadableData),
      recoveredFromBackup,
      legacyPlaintextPresent:hasLegacyConversationState(legacyStorage),
      error:lastError
    };
  }

  return {
    initializeConversationStorage:initialize,
    saveConversationState:save,
    loadConversationState:load,
    clearConversationState:clear,
    clearAllSensitiveState:clear,
    getConversationStorageStatus:status
  };
}

const defaultStore=createConversationStorage();

export const initializeConversationStorage=(...args)=>defaultStore.initializeConversationStorage(...args);
export const saveConversationState=(...args)=>defaultStore.saveConversationState(...args);
export const loadConversationState=(...args)=>defaultStore.loadConversationState(...args);
export const clearConversationState=(...args)=>defaultStore.clearConversationState(...args);
export const clearAllSensitiveState=(...args)=>defaultStore.clearAllSensitiveState(...args);
export const getConversationStorageStatus=(...args)=>defaultStore.getConversationStorageStatus(...args);
