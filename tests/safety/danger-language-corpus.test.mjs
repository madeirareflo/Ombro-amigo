import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { detectExplicitImmediateDanger } from '../../safety/policy.js';

const cases=JSON.parse(await readFile(new URL('./danger-language-corpus.json',import.meta.url),'utf8'));

test('corpus de segurança tem diversidade contextual e não é chamado de validação clínica',()=>{
  assert.ok(cases.length>=30);
  assert.ok(new Set(cases.map(item=>item.group)).size>=7);
});

for(const item of cases){
  test(item.id+' '+item.group,()=>{
    assert.equal(detectExplicitImmediateDanger(item.text),item.trigger,item.text);
  });
}
