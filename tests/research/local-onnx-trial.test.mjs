import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {runOfflineTrial,SYNTHETIC_CASES,checkLocalFiles,CANDIDATE} from '../../scripts/run-local-onnx-trial.mjs';

test('runner refuses missing model weights instead of fetching from network',async()=>{
  const report=await checkLocalFiles(join(tmpdir(),'absent-model-directory'));
  assert.equal(report.ok,false);
  await assert.rejects(()=>runOfflineTrial({root:join(tmpdir(),'absent-model-directory'),wasmRoot:'/tmp'}),/Local model not ready/);
});

test('injection-safe dry run with synthetic-only generator and local config',async()=>{
  const root=await mkdtemp(join(tmpdir(),'ombro-onnx-'));
  const folder=join(root,...CANDIDATE.split('/'));
  try{
    await mkdir(folder,{recursive:true});
    await writeFile(join(folder,'config.json'),JSON.stringify({model_type:'qwen3'}));
    let calls=0;
    const mock=async(messages,opts)=>{
      assert.equal(messages.length,2);
      assert.match(messages[0].content,/não um terapeuta/i);
      assert.equal(opts.do_sample,false);
      calls++;
      return [{generated_text:'Este é apenas texto sintético.'}];
    };
    const output=await runOfflineTrial({root,wasmRoot:'not-used',generatorFactory:mock});
    assert.equal(calls,SYNTHETIC_CASES.length);
    assert.equal(output.caseCount,SYNTHETIC_CASES.length);
    assert.equal(output.claims.modelQualityApproved,false);
    assert.ok(output.results.every(item=>item.requiresHumanReview && !item.semanticVerification));
    assert.ok(!JSON.stringify(output).includes('Minha irmã falou'));
  }finally{await rm(root,{recursive:true,force:true});}
});

test('the runner does not allow unknown model identities or missing local runtime',async()=>{
  const root=await mkdtemp(join(tmpdir(),'ombro-missingwasm-'));
  const folder=join(root,...CANDIDATE.split('/'));
  try{
    await mkdir(folder,{recursive:true});
    await writeFile(join(folder,'config.json'),JSON.stringify({model_type:'qwen3'}));
    await assert.rejects(()=>runOfflineTrial({root,modelId:'remote/unreviewed'}),/reviewed candidate/);
    await assert.rejects(()=>runOfflineTrial({root}),/LOCAL_WASM_ROOT required/);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('remote model loading is explicitly disabled and metrics contain no raw generated text',async()=>{
  const src=await readFile(new URL('../../scripts/run-local-onnx-trial.mjs',import.meta.url),'utf8');
  assert.match(src,/env\.allowRemoteModels=false/);
  assert.match(src,/env\.backends\.onnx\.wasm\.wasmPaths=/);
  assert.match(src,/modelQualityApproved:false/);
  assert.doesNotMatch(src,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|console\.log\(/);
});
