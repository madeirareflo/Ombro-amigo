import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {verifyPinnedWeight,MODEL_ARTIFACTS,PINNED_MODEL_REVISION,hashFile} from '../../research/pinned-model-integrity.js';
import {runOfflineTrial,CANDIDATE} from '../../scripts/run-local-onnx-trial.mjs';

test('pinned reference identifies exact upstream commit and two allowed artifact digests',()=>{
  assert.match(PINNED_MODEL_REVISION,/^[a-f0-9]{40}$/);
  for(const dtype of ['q4','q4f16']) assert.match(MODEL_ARTIFACTS[dtype].sha256,/^[a-f0-9]{64}$/);
});

test('a real hash mismatch rejects fake or truncated model weights',async()=>{
  const folder=await mkdtemp(join(tmpdir(),'ombro-integrity-'));
  try{
    await mkdir(join(folder,'onnx'));
    const path=join(folder,'onnx','model_q4.onnx');
    await writeFile(path,'fake incomplete weights');
    const expected=createHash('sha256').update('fake incomplete weights').digest('hex');
    assert.equal(await hashFile(path),expected);
    const outcome=await verifyPinnedWeight(folder,'q4');
    assert.deepEqual({ok:outcome.ok,reason:outcome.reason},{ok:false,reason:'weight-sha256-mismatch'});
    assert.equal((await verifyPinnedWeight(folder,'q4f16')).reason,'weight-missing-or-unreadable');
  }finally{await rm(folder,{recursive:true,force:true});}
});

test('successful hash match can be tested with injected digest without pretending to run model',async()=>{
  const folder=await mkdtemp(join(tmpdir(),'ombro-integrity-'));
  try{
    await mkdir(join(folder,'onnx'));
    await writeFile(join(folder,'onnx','model_q4.onnx'),'fixture');
    const result=await verifyPinnedWeight(folder,'q4',{hash:async()=>MODEL_ARTIFACTS.q4.sha256});
    assert.equal(result.ok,true);
    assert.equal(result.actualBytes,7);
  }finally{await rm(folder,{recursive:true,force:true});}
});

test('real trial blocks corrupted weights before importing Transformers.js',async()=>{
  const root=await mkdtemp(join(tmpdir(),'ombro-real-trial-'));
  const folder=join(root,...CANDIDATE.split('/'));
  try{
    await mkdir(join(folder,'onnx'),{recursive:true});
    await writeFile(join(folder,'config.json'),JSON.stringify({model_type:'qwen3'}));
    await writeFile(join(folder,'onnx','model_q4.onnx'),'not model data');
    await assert.rejects(
      ()=>runOfflineTrial({root,wasmRoot:root,dtype:'q4'}),
      /Offline model preflight failed: .*weights:weight-sha256-mismatch/
    );
  }finally{await rm(root,{recursive:true,force:true});}
});
