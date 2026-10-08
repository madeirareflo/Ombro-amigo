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
const KEY_ID='conversation-key';

let backendPromise=null;
let memoryState=null;
let lastError=null;

function hasSecureApis(){
  return Boolean(globalThis.indexedDB && globalThis.crypto?.subtle && globalThis.crypto?.getRandomValues);
}

function openDb(indexedDbApi=globalThis.indexedDB){
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

const idbGet=(db,store,key)=>idbOperation(db,store,'readonly',s=>s.get(key));
const idbPut=(db,store,key,value)=>idbOperation(db,store,'readwrite',s=>s.put(value,key));
const idbDelete=(db,store,key)=>idbOperation(db,store,'readwrite',s=>s.delete(key));

async function getOrCreateKey(db){
  const existing=await idbGet(db,KEY_STORE,KEY_ID);
  if(existing) return existing;
  const key=await generateLocalEncryptionKey();
  await idbPut(db,KEY_STORE,KEY_ID,key);
  return key;
}

async function createBackend(){
  if(!hasSecureApis()){
    lastError='secure-apis-unavailable';
    return {mode:'memory-only',persistent:false,encrypted:false};
  }

  try{
    const db=await openDb();
    const key=await getOrCreateKey(db);
    lastError=null;
    return {mode:'encrypted-indexeddb',persistent:true,encrypted:true,db,key};
  }catch(error){
    lastError=error?.name || 'secure-storage-init-failed';
    return {mode:'memory-only',persistent:false,encrypted:false};
  }
}

async function backend(){
  if(!backendPromise) backendPromise=createBackend();
  return backendPromise;
}

function buildPayload(state){
  return {
    version:3,
    savedAt:new Date().toISOString(),
    session:state?.session || null,
    view:state?.view || 'conversation',
    summaryDraft:String(state?.summaryDraft || ''),
    summaryModel:state?.summaryModel || null
  };
}

async function saveToEncryptedBackend(target,payload){
  const encrypted=await encryptJson(payload,target.key);
  await idbPut(target.db,STATE_STORE,STATE_ID,{
    id:STATE_ID,
    savedAt:payload.savedAt,
    encrypted
  });
}

async function readEncryptedRecord(target){
  return idbGet(target.db,STATE_STORE,STATE_ID);
}

async function migrateLegacyIfNeeded(target){
  const legacy=readLegacyConversationState();
  if(!legacy) return false;

  if(target.mode==='encrypted-indexeddb'){
    const existing=await readEncryptedRecord(target);
    if(!existing) await saveToEncryptedBackend(target,buildPayload(legacy));
    clearLegacyConversationState();
    return true;
  }

  if(!memoryState) memoryState=buildPayload(legacy);
  return false;
}

export async function initializeConversationStorage(){
  const target=await backend();
  try{
    await migrateLegacyIfNeeded(target);
  }catch(error){
    lastError=error?.name || 'legacy-migration-failed';
  }
  return getConversationStorageStatus();
}

export async function saveConversationState(state){
  const payload=buildPayload(state);
  const target=await backend();

  if(target.mode==='encrypted-indexeddb'){
    try{
      await saveToEncryptedBackend(target,payload);
      clearLegacyConversationState();
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
}

export async function loadConversationState(){
  const target=await backend();

  if(target.mode==='encrypted-indexeddb'){
    try{
      const record=await readEncryptedRecord(target);
      if(!record?.encrypted) return null;
      const value=await decryptJson(record.encrypted,target.key);
      lastError=null;
      return value?.session ? value : null;
    }catch(error){
      lastError=error?.name || 'secure-load-failed';
      return memoryState;
    }
  }

  if(memoryState) return memoryState;
  const legacy=readLegacyConversationState();
  if(legacy) {
    memoryState=buildPayload(legacy);
    return memoryState;
  }
  return null;
}

export async function clearConversationState(){
  const target=await backend();
  memoryState=null;
  clearLegacyConversationState();

  if(target.mode==='encrypted-indexeddb'){
    try{
      await idbDelete(target.db,STATE_STORE,STATE_ID);
      lastError=null;
    }catch(error){
      lastError=error?.name || 'secure-delete-failed';
    }
  }
}

export async function clearAllSensitiveState(){
  const target=await backend();
  memoryState=null;
  clearLegacyConversationState();

  if(target.mode==='encrypted-indexeddb'){
    try{
      await idbDelete(target.db,STATE_STORE,STATE_ID);
      await idbDelete(target.db,KEY_STORE,KEY_ID);
      target.db.close();
      backendPromise=null;
      lastError=null;
    }catch(error){
      lastError=error?.name || 'secure-clear-all-failed';
    }
  }
}

export async function getConversationStorageStatus(){
  const target=await backend();
  let hasConversation=false;
  let savedAt=null;

  if(target.mode==='encrypted-indexeddb'){
    try{
      const record=await readEncryptedRecord(target);
      hasConversation=Boolean(record?.encrypted);
      savedAt=record?.savedAt || null;
    }catch(error){
      lastError=error?.name || 'secure-status-failed';
    }
  }else if(memoryState){
    hasConversation=Boolean(memoryState.session);
    savedAt=memoryState.savedAt || null;
  }

  return {
    hasConversation,
    savedAt,
    mode:target.mode,
    encrypted:target.encrypted,
    persistent:target.persistent,
    legacyPlaintextPresent:hasLegacyConversationState(),
    error:lastError
  };
}
