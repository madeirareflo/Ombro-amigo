/**
 * Manual, local-only inference experiment. NOT imported by the PWA.
 * Requires separately provisioned ONNX weights and pinned local runtime.
 * Never use private user writing in this benchmark.
 */
import {resolve,join,sep} from 'node:path';
import {stat,readFile,readdir,writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {assessRewriteProposal} from '../research/local-rewrite-gate.js';
import {preflightLocalBundle} from '../research/offline-bundle-preflight.js';

export const CANDIDATE='onnx-community/Qwen3-0.6B-ONNX';
export const SYNTHETIC_CASES=Object.freeze([
  {id:'negation',input:'Não estou triste. Estou preocupado com uma prova amanhã.'},
  {id:'third-party',input:'Minha irmã falou que estava triste. Eu não disse como me senti.'},
  {id:'uncertainty',input:'Não sei por que tenho dificuldade de explicar isso na sessão.'},
  {id:'timeline',input:'Ontem fiquei ansioso. Hoje estou um pouco mais tranquilo.'},
  {id:'ambiguous',input:'Me sinto só, até quando tem gente perto de mim.'},
  {id:'choice',input:'Quero falar na terapia sobre como travei na reunião.'}
]);
const prompt=input=>[
  {role:'system',content:'Você é um assistente de escrita, não um terapeuta. Reescreva o relato apenas em primeira pessoa, com clareza e sem acrescentar causas, diagnósticos, intenções, emoções ou fatos. Preserve negações, tempo e quem disse cada coisa. Não dê conselhos. Responda só com o texto reescrito.'},
  {role:'user',content:'Relato original:\n'+input}
];
export function allowedModelPath(root,modelId=CANDIDATE){
  if(typeof root!=='string'||!root.trim())throw Error('Missing LOCAL_MODEL_ROOT');
  const absolute=resolve(root);
  const folder=resolve(absolute,...modelId.split('/'));
  if(!folder.startsWith(absolute+sep))throw Error('Invalid model path');
  return folder;
}
export async function checkLocalFiles(root,modelId=CANDIDATE){
  const path=allowedModelPath(root,modelId);
  const config=join(path,'config.json');
  try{
    const details=await stat(config);
    if(!details.isFile())return {ok:false,reason:'config-missing'};
    const settings=JSON.parse(await readFile(config,'utf8'));
    if(!settings.model_type)return {ok:false,reason:'model-type-missing'};
    const files=await readdir(join(path,'onnx')).catch(()=>[]);
    if(!files.some(name=>name.endsWith('.onnx')))return {ok:false,reason:'onnx-weights-missing'};
    return {ok:true,reason:'ready-for-manual-trial',path};
  }catch{return {ok:false,reason:'config-missing'};}
}
export function measureCandidate(result,input,elapsedMs){
  // Heuristic gate NEVER approves a generated paragraph or verifies semantics.
  const check=assessRewriteProposal(input,{text:result,evidence:[{start:0,end:input.length,text:input}]});
  return {elapsedMs:Math.round(elapsedMs),outputCharacters:String(result||'').length,
    gateStatus:check.status,redFlags:check.failures,semanticVerification:false,requiresHumanReview:true};
}
export async function runOfflineTrial({root,wasmRoot,modelId=CANDIDATE,device='wasm',dtype='q4',generatorFactory=null,reviewOutput=null}={}){
  if(modelId!==CANDIDATE)throw Error('Only explicitly reviewed candidate permitted');
  if(!wasmRoot && !generatorFactory)throw Error('LOCAL_WASM_ROOT required: remote runtime downloads are forbidden');
  const local=await checkLocalFiles(root,modelId);
  if(!local.ok)throw Error('Local model not ready: '+local.reason);
  // Mock is only used in automated code tests. Real inference must verify bytes.
  if(!generatorFactory){
    const preflight=await preflightLocalBundle({modelPath:local.path,wasmRoot,dtype});
    if(!preflight.ready)throw Error('Offline model preflight failed: '+preflight.failures.join(', '));
  }
  if(!['wasm','webgpu'].includes(device))throw Error('Unsupported device');
  if(!['q4','q4f16'].includes(dtype))throw Error('Unreviewed quantization');
  let generator=generatorFactory;
  if(!generator){
    // Lazy import: no dependencies installed or models downloaded automatically.
    const {env,pipeline}=await import('@huggingface/transformers');
    env.allowRemoteModels=false;
    env.allowLocalModels=true;
    env.localModelPath=resolve(root)+sep;
    env.useBrowserCache=false;
    env.useFSCache=false;
    // Require local ONNX WASM artifacts rather than default CDN.
    env.backends.onnx.wasm.wasmPaths=resolve(wasmRoot)+sep;
    generator=await pipeline('text-generation',modelId,{device,dtype});
  }
  const rows=[];
  const reviews=[];
  for(const fixture of SYNTHETIC_CASES){
    const start=performance.now();
    const output=await generator(prompt(fixture.input),{
      max_new_tokens:130,do_sample:false,return_full_text:false
    });
    const generated=output?.[0]?.generated_text;
    const text=typeof generated==='string'?generated:
      Array.isArray(generated)?String(generated.at(-1)?.content||''):'';
    const metrics=measureCandidate(text,fixture.input,performance.now()-start);
    rows.push({id:fixture.id,...metrics});
    if(reviewOutput)reviews.push({id:fixture.id,original:fixture.input,candidate:text,
      checks:{gateStatus:metrics.gateStatus,redFlags:metrics.redFlags},
      reviewer:{negation:'not-reviewed',thirdParty:'not-reviewed',time:'not-reviewed',
        unsupportedClaims:'not-reviewed',omissions:'not-reviewed',naturalnessPtBR:'not-reviewed',notes:''}});
  }
  if(reviewOutput){
    // Explicit opt-in: ONLY synthetic fixture text; restrictive file permissions.
    // The output is a research artifact, NEVER loaded by the PWA.
    await writeFile(resolve(reviewOutput),JSON.stringify({schema:'synthetic-review-v1',
      modelId,device,dtype,reviewStatus:'pending-human-review',reviews},null,2),{encoding:'utf8',flag:'wx',mode:0o600});
  }
  return {modelId,device,dtype,caseCount:rows.length,results:rows,
    claims:{offlineConfigured:true,provenOnPhysicalMobile:false,clinicalValidation:false,
      semanticValidation:false,modelQualityApproved:false}};
}
if(process.argv[1] && import.meta.url===new URL('file://'+resolve(process.argv[1])).href){
  const root=process.env.LOCAL_MODEL_ROOT;
  const wasmRoot=process.env.LOCAL_WASM_ROOT;
  try{
    const result=await runOfflineTrial({root,wasmRoot,reviewOutput:process.env.SYNTHETIC_REVIEW_OUTPUT||null});
    // Metrics only: never print prompts, drafts, user input, or generated text.
    process.stdout.write(JSON.stringify(result,null,2)+'\n');
  }catch(e){
    process.stderr.write('Offline trial not executed: '+e.message+'\n');
    process.exitCode=1;
  }
}
