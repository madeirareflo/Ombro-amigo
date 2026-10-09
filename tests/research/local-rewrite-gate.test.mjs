import test from 'node:test';
import assert from 'node:assert/strict';
import {assessRewriteProposal,buildSafeExtractiveFallback} from '../../research/local-rewrite-gate.js';
import {hasExactProvenance} from '../../app/extractive-summary.js';

const source='Ultimamente me sinto triste. Tenho dificuldade de contar isso na sessão.';
const evidence=[{start:0,end:27,text:'Ultimamente me sinto triste.'}];

test('rewrite requires human verification even when all evidence matches',()=>{
  const p={text:'Ultimamente me sinto triste.',evidence};
  const result=assessRewriteProposal(source,p);
  assert.equal(result.status,'needs-human-review');
  assert.equal(result.automatedSemanticVerification,false);
  assert.equal(result.canPublishAutomatically,false);
});

test('fabricated, missing, out-of-bounds or duplicated evidence is rejected',()=>{
  for(const evidenceVariant of [
    [],[{start:0,end:27,text:'Não me sinto triste hoje.'}],
    [{start:-1,end:27,text:''}],[evidence[0],evidence[0]]
  ]){
    assert.equal(assessRewriteProposal(source,{text:'Sinto tristeza.',evidence:evidenceVariant}).status,'reject');
  }
});

test('obvious added diagnostic or absolute claims are rejected',()=>{
  for(const phrase of ['Tenho depressão.','Nunca me sinto bem.','Fui diagnosticada com bipolaridade.']){
    const r=assessRewriteProposal(source,{text:phrase,evidence});
    assert.equal(r.status,'reject',phrase);
    assert.ok(r.failures.includes('added-protected-term'),phrase);
  }
});

test('exact citations do not prove paraphrase fidelity',()=>{
  const p={text:'Meu trabalho provocou minha tristeza.',evidence};
  const r=assessRewriteProposal(source,p);
  assert.equal(r.status,'needs-human-review');
  assert.equal(r.automatedSemanticVerification,false);
});

test('rejected model outputs fall back to verified quotations',()=>{
  const fallback=buildSafeExtractiveFallback(source);
  assert.equal(fallback.kind,'extractive-fallback');
  assert.equal(fallback.requiresUserApproval,true);
  assert.ok(fallback.sections.flatMap(x=>x.items).every(item=>hasExactProvenance(source,item)));
});

test('rewrite gate is offline and never loads a model by itself',async()=>{
  const {readFile}=await import('node:fs/promises');
  const text=await readFile(new URL('../../research/local-rewrite-gate.js',import.meta.url),'utf8');
  assert.doesNotMatch(text,/\bfetch\s*\(|WebSocket|XMLHttpRequest|onnxruntime|WebLLM|localStorage|indexedDB|sendBeacon/);
});
