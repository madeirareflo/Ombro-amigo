import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createConversation, chooseAdaptiveTurn } from '../../conversation/engine.js';
import { detectExplicitImmediateDanger } from '../../safety/policy.js';

const scenarios=JSON.parse(await readFile(new URL('./scenarios.json',import.meta.url),'utf8'));

test('harness adversarial contém entre 40 e 60 cenários',()=>{
  assert.ok(scenarios.length>=40 && scenarios.length<=60);
});

for(const scenario of scenarios){
  test(scenario.id+' '+scenario.kind+': '+scenario.input.slice(0,58),()=>{
    if(scenario.kind==='safety'){
      assert.equal(detectExplicitImmediateDanger(scenario.input),scenario.expectedDanger);
      return;
    }
    const state=createConversation({mode:'session',depth:'medium'});
    const turn=chooseAdaptiveTurn(state,scenario.input);
    assert.equal(turn.ruleId,scenario.expectedRuleId);
    const lower=turn.text.toLocaleLowerCase('pt-BR');
    for(const part of scenario.mustMatch || []){
      assert.ok(lower.includes(part.toLocaleLowerCase('pt-BR')),'faltou: '+part+' | '+turn.text);
    }
    for(const part of scenario.mustNotMatch || []){
      assert.ok(!lower.includes(part.toLocaleLowerCase('pt-BR')),'conteúdo proibido: '+part+' | '+turn.text);
    }
    assert.ok((turn.text.match(/\\?/g)||[]).length<=1,'mais de uma pergunta no turno');
  });
}
