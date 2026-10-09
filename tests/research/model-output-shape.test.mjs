import test from 'node:test';
import assert from 'node:assert/strict';
import {extractCandidateText} from '../../research/model-output-shape.js';

test('accepts plain output without claiming semantic verification',()=>{
 const r=extractCandidateText([{generated_text:'Às vezes me sinto sozinho.'}]);
 assert.equal(r.ok,true);
 assert.equal(r.verbatim,false);
});
test('rejects reasoning tokens, echoed roles and prompts',()=>{
 for(const generated_text of [
 '<think>vou avaliar</think> Sinto tristeza.',
 'Assistant: Sinto tristeza.',
 'Relato original: Estou triste.',
 '<|im_start|>assistant',
 '<tool_call>something</tool_call>'
 ]){
   assert.equal(extractCandidateText([{generated_text}]).ok,false,generated_text);
 }
});
test('rejects multiple assistants and nonstring content',()=>{
 assert.equal(extractCandidateText([{generated_text:[{role:'assistant',content:'a'},{role:'assistant',content:'b'}]}]).ok,false);
 assert.equal(extractCandidateText([{generated_text:[{role:'assistant',content:{foo:1}}]}]).ok,false);
 assert.equal(extractCandidateText([{generated_text:''}]).ok,false);
});
test('preserves exact user text as verbatim',()=>{
 const original='Não estou triste.';
 const r=extractCandidateText([{generated_text:original}],{original});
 assert.equal(r.ok,true);
 assert.equal(r.verbatim,true);
});
