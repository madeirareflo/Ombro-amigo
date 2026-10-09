import test from 'node:test';
import assert from 'node:assert/strict';
import {extractTraceableSummary,hasExactProvenance} from '../../app/extractive-summary.js';
import {normalizeSummaryModel} from '../../app/summary-model.js';

test('every extracted sentence refers to an exact original span',()=>{
  const input='Estou triste. Não sei explicar.\nMinha irmã falou que está feliz.';
  const m=extractTraceableSummary(input);
  const items=m.sections.flatMap(section=>section.items);
  assert.equal(items.length,3);
  assert.ok(items.every(item=>hasExactProvenance(input,item)));
  assert.ok(items.every(item=>item.origin==='user'));
  const restored=normalizeSummaryModel(m);
  assert.ok(restored.sections.flatMap(section=>section.items).every(item=>hasExactProvenance(input,item)));
});

test('negation and third-party text are not relabeled as patient emotions',()=>{
  const input='Não estou triste. Minha irmã está triste. Estou ansiosa.';
  const m=extractTraceableSummary(input);
  const emotion=m.sections.find(x=>x.id==='emotions').items;
  assert.deepEqual(emotion.map(x=>x.text),['Estou ansiosa.']);
  assert.equal(m.sections.find(x=>x.id==='facts').items.length,2);
});

test('empty, partial and quoted content never adds claims',()=>{
  const values=['','   ','Ela disse "estou triste".','Eu não consigo explicar direito.'];
  for(const v of values){
    const m=extractTraceableSummary(v);
    assert.ok(m.sections.flatMap(x=>x.items).every(item=>hasExactProvenance(v,item)));
    assert.ok(!JSON.stringify(m).includes('diagnóstico'));
  }
});

test('no external engine, network or browser APIs used',async()=>{
  const {readFile}=await import('node:fs/promises');
  const s=await readFile(new URL('../../app/extractive-summary.js',import.meta.url),'utf8');
  assert.doesNotMatch(s,/fetch\s*\(|WebSocket|XMLHttpRequest|indexedDB|localStorage|onnxruntime/i);
});
