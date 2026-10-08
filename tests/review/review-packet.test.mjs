import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createReviewMaterials, reviewPacketMarkdown, simulateReviewCase } from '../../review/packet.js';

const definitions=JSON.parse(await readFile(new URL('./cases.json',import.meta.url),'utf8'));

test('pacote cego não expõe metadados técnicos nem identidade dos casos',()=>{
  const {packet,key}=createReviewMaterials(definitions,{seed:'fixed-seed'});
  assert.equal(packet.cases.length,definitions.length);
  assert.equal(key.cases.length,definitions.length);

  const keys=new Set();
  const visit=value=>{
    if(Array.isArray(value)) return value.forEach(visit);
    if(!value || typeof value!=='object') return;
    for(const [name,nested] of Object.entries(value)){
      keys.add(name);
      visit(nested);
    }
  };
  visit(packet);

  for(const forbidden of ['ruleId','ruleTrace','sourceId','purpose','tags','audit','structuredSummary']){
    assert.equal(keys.has(forbidden),false,`campo técnico vazou no pacote cego: ${forbidden}`);
  }

  const blinded=JSON.stringify(packet);
  for(const definition of definitions){
    assert.equal(blinded.includes(definition.id),false,`ID de origem vazou: ${definition.id}`);
  }

  assert.match(JSON.stringify(key),/sourceId/);
  assert.match(JSON.stringify(key),/ruleTrace|classification/);
});

test('ordem cega é reproduzível pelo seed sem depender da ordem original',()=>{
  const a=createReviewMaterials(definitions,{seed:'rodada-a'}).key.cases.map(item=>item.sourceId);
  const b=createReviewMaterials(definitions,{seed:'rodada-a'}).key.cases.map(item=>item.sourceId);
  const c=createReviewMaterials(definitions,{seed:'rodada-b'}).key.cases.map(item=>item.sourceId);
  assert.deepEqual(a,b);
  assert.notDeepEqual(a,c);
});

test('sínteses automáticas só reutilizam declarações do usuário nos casos fictícios',()=>{
  for(const definition of definitions.filter(item=>item.type!=='safety')){
    const result=simulateReviewCase(definition);
    const declared=new Set(definition.turns.map(text=>String(text).trim()));
    const claims=Object.values(result.structuredSummary).flat();
    for(const claim of claims){
      assert.ok(declared.has(claim),`${definition.id}: síntese contém conteúdo não declarado: ${claim}`);
    }
  }
});

test('casos de segurança incluem positivo explícito e controles de falso positivo',()=>{
  const safety=definitions.filter(item=>item.type==='safety');
  const byId=Object.fromEntries(safety.map(item=>[item.id,simulateReviewCase(item)]));
  assert.equal(byId['RV-012'].audit.assessment.interrupt,true);
  assert.equal(byId['RV-013'].audit.assessment.interrupt,false);
  assert.equal(byId['RV-014'].audit.assessment.interrupt,false);
  assert.equal(byId['RV-015'].audit.assessment.interrupt,false);
});

test('markdown de revisão contém campos de nota mas não o gabarito',()=>{
  const {packet}=createReviewMaterials(definitions,{seed:'markdown'});
  const markdown=reviewPacketMarkdown(packet);
  assert.match(markdown,/Fidelidade \(1–5\)/);
  assert.match(markdown,/Evento bloqueador/);
  assert.doesNotMatch(markdown,/ruleId|sourceId|RV-00/);
});
