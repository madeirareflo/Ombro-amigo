import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {runOfflineTrial,CANDIDATE,SYNTHETIC_CASES} from '../../scripts/run-local-onnx-trial.mjs';

test('explicit review report contains only synthetic fixtures and never approves text',async()=>{
 const root=await mkdtemp(join(tmpdir(),'ombro-review-'));
 try{
   const folder=join(root,...CANDIDATE.split('/'));
   await mkdir(join(folder,'onnx'),{recursive:true});
   await writeFile(join(folder,'config.json'),JSON.stringify({model_type:'qwen3'}));
   await writeFile(join(folder,'onnx','model_q4.onnx'),'simulated');
   const path=join(root,'review.json');
   const output=await runOfflineTrial({root,generatorFactory:async()=>[{generated_text:'Síntese de teste, não aprovada.'}],reviewOutput:path});
   const file=JSON.parse(await readFile(path,'utf8'));
   assert.equal(file.reviewStatus,'pending-human-review');
   assert.equal(file.reviews.length,SYNTHETIC_CASES.length);
   assert.deepEqual(file.reviews.map(x=>x.original),SYNTHETIC_CASES.map(x=>x.input));
   assert.ok(file.reviews.every(x=>x.reviewer.unsupportedClaims==='not-reviewed'));
   assert.equal(output.claims.modelQualityApproved,false);
   assert.ok(!JSON.stringify(output).includes('Síntese de teste'));
   assert.ok((await stat(path)).size>0);
   await assert.rejects(()=>runOfflineTrial({root,generatorFactory:async()=>[{generated_text:'outro'}],reviewOutput:path}),/EEXIST/);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('without explicit output path no generated content is written',async()=>{
 const root=await mkdtemp(join(tmpdir(),'ombro-no-review-'));
 try{
   const folder=join(root,...CANDIDATE.split('/'));
   await mkdir(join(folder,'onnx'),{recursive:true});
   await writeFile(join(folder,'config.json'),JSON.stringify({model_type:'qwen3'}));
   await writeFile(join(folder,'onnx','model_q4.onnx'),'mock');
   const r=await runOfflineTrial({root,generatorFactory:async()=>[{generated_text:'texto de teste'}]});
   assert.equal(r.caseCount,SYNTHETIC_CASES.length);
   assert.ok(!JSON.stringify(r).includes('texto de teste'));
 }finally{await rm(root,{recursive:true,force:true});}
});
