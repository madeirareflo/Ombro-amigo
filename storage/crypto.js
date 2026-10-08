const encoder=new TextEncoder();
const decoder=new TextDecoder();

function requireCrypto(cryptoApi){
  if(!cryptoApi?.subtle || typeof cryptoApi.getRandomValues!=='function'){
    throw new Error('Web Crypto unavailable');
  }
  return cryptoApi;
}

export async function generateLocalEncryptionKey(cryptoApi=globalThis.crypto){
  const api=requireCrypto(cryptoApi);
  return api.subtle.generateKey(
    {name:'AES-GCM',length:256},
    false,
    ['encrypt','decrypt']
  );
}

export async function encryptJson(value,key,cryptoApi=globalThis.crypto){
  const api=requireCrypto(cryptoApi);
  const iv=api.getRandomValues(new Uint8Array(12));
  const plain=encoder.encode(JSON.stringify(value));
  const encrypted=await api.subtle.encrypt({name:'AES-GCM',iv},key,plain);
  return {
    version:1,
    algorithm:'AES-GCM',
    iv:Array.from(iv),
    ciphertext:Array.from(new Uint8Array(encrypted))
  };
}

export async function decryptJson(record,key,cryptoApi=globalThis.crypto){
  const api=requireCrypto(cryptoApi);
  if(
    record?.version!==1
    || record?.algorithm!=='AES-GCM'
    || !Array.isArray(record?.iv)
    || record.iv.length!==12
    || !Array.isArray(record?.ciphertext)
    || record.ciphertext.length<16
  ){
    throw new Error('Invalid encrypted record');
  }
  const iv=Uint8Array.from(record.iv);
  const ciphertext=Uint8Array.from(record.ciphertext);
  const decrypted=await api.subtle.decrypt({name:'AES-GCM',iv},key,ciphertext);
  return JSON.parse(decoder.decode(decrypted));
}
