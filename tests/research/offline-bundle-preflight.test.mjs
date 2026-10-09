import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {preflightLocalBundle,REQUIRED_METADATA} from '../../research/offline-bundle-preflight.js';

test('missing bundle does not claim model ready',async()=>{
  const r=await preflightLocalBundle({modelPath:'/not-present-model',wasmRoot:'/not-present-wasm'});
  assert.equal(r.ready,false);
  assert.equal(r.runtimeTested,false);
  assert.equal(r.mobileSupported,false);
  assert.equal(r.wasmVersionVerified,false);
  assert.ok(r.failures.some(x=>x.startsWith('missing:')));
  assert.ok(r.failures.some(x=>x.startsWith('weights:')));
});

test('corrupt metadata and fake weight are rejected before real inference',async()=>{
  const root=await mkdtemp(join(tmpdir(),'ombro-bundle-'));
  const modelPath=join(root,'model'),wasmRoot=join(root,'wasm');
  try{
    await mkdir(join(modelPath,'onnx'),{recursive:true});
    await mkdir(wasmRoot);
    for(const filename of REQUIRED_METADATA){
      await writeFile(join(modelPath,filename),filename==='config.json'?'not-json':'{}');
    }
    await writeFile(join(modelPath,'onnx','model_q4.onnx'),'fake weight');
    await writeFile(join(wasmRoot,'ort-wasm-simd.wasm'),'placeholder');
    const r=await preflightLocalBundle({modelPath,wasmRoot});
    assert.equal(r.ready,false);
    assert.ok(r.failures.includes('invalid-json:config.json'));
    assert.ok(r.failures.includes('weights:weight-sha256-mismatch'));
    assert.equal(r.wasmCandidates,1);
    assert.equal(r.wasmVersionVerified,false);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('preflight refuses unreviewed dtype',async()=>{
 const r=await preflightLocalBundle({modelPath:'/unavailable',wasmRoot:'/unavailable',dtype:'float64'});
 assert.ok(r.failures.includes('weights:unreviewed-quantization'));
});

test('metadata contracts include both tokenizer and generation config',()=>{
  assert.ok(REQUIRED_METADATA.includes('tokenizer.json'));
  assert.ok(REQUIRED_METADATA.includes('tokenizer_config.json'));
  assert.ok(REQUIRED_METADATA.includes('generation_config.json'));
});
