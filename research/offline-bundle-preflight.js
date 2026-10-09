/**
 * Strict read-only preparation for offline ONNX inference.
 * No network, no user writing, no model load. All paths local.
 */
import {stat,readFile,readdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {verifyPinnedWeight,PINNED_MODEL_REVISION} from './pinned-model-integrity.js';

export const REQUIRED_METADATA=Object.freeze([
  'config.json','tokenizer.json','tokenizer_config.json',
  'special_tokens_map.json','generation_config.json'
]);

async function regularNonempty(path){
  try{const st=await stat(path);return st.isFile()&&st.size>0;}
  catch{return false;}
}

export async function preflightLocalBundle({modelPath,wasmRoot,dtype='q4'}={}){
  const failures=[];
  if(!modelPath||!wasmRoot)return {ready:false,failures:['missing-local-path'],revision:PINNED_MODEL_REVISION};
  const root=resolve(modelPath),wasm=resolve(wasmRoot);
  for(const filename of REQUIRED_METADATA){
    const path=join(root,filename);
    if(!(await regularNonempty(path))){failures.push('missing:'+filename);continue;}
    if(filename.endsWith('.json')){
      try{
        const value=JSON.parse(await readFile(path,'utf8'));
        if(!value||typeof value!=='object'||Array.isArray(value))failures.push('invalid-json:'+filename);
      }catch{failures.push('invalid-json:'+filename);}
    }
  }
  const verified=await verifyPinnedWeight(root,dtype);
  if(!verified.ok)failures.push('weights:'+verified.reason);
  let wasmFiles=[];
  try{wasmFiles=(await readdir(wasm)).filter(name=>/^ort-wasm.*\.wasm$/.test(name));}
  catch{failures.push('wasm-directory-missing');}
  if(!wasmFiles.length)failures.push('wasm-artifact-missing');
  // Presence is NOT version compatibility or a complete runtime integrity check.
  return {
    ready:failures.length===0,failures,revision:PINNED_MODEL_REVISION,
    checkedMetadata:REQUIRED_METADATA.length,
    weightVerified:verified.ok,
    wasmCandidates:wasmFiles.length,
    wasmVersionVerified:false,
    runtimeTested:false,
    mobileSupported:false
  };
}
