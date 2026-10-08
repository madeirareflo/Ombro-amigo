import test from 'node:test';
import assert from 'node:assert/strict';
import { CONVERSATION_POLICY, getPolicyRule, validatePolicy } from '../../conversation/policy.js';
import { createConversation, nextQuestion } from '../../conversation/engine.js';

test('policy v2 tem ids únicos, evidência e limitações',()=>{
  const result=validatePolicy();
  assert.equal(result.uniqueIds,true);
  assert.equal(result.hasEvidence,true);
  assert.equal(result.hasLimitations,true);
  assert.ok(result.count>=10);
});

test('regras protegidas estão no catálogo',()=>{
  for(const id of ['CONV-DIAGNOSIS-01','CONV-DEPENDENCY-01','CONV-REPAIR-01','SAFETY-SENSITIVE-01','CONV-AFFECT-LABEL-01','CONV-THERAPIST-PREDICTION-01','SAFETY-EXPLICIT-DANGER-01','SUMMARY-DECLARED-ONLY-01']){
    assert.ok(getPolicyRule(id),id);
  }
});

test('motor registra rule id de respostas',()=>{
  const state=createConversation({mode:'session',depth:'medium'});
  nextQuestion(state,'Você acha que eu tenho depressão?');
  assert.equal(state.lastRuleId,'CONV-DIAGNOSIS-01');
  assert.equal(state.ruleHistory.at(-1).ruleId,'CONV-DIAGNOSIS-01');
});

test('catálogo não declara eficácia clínica',()=>{
  const dump=JSON.stringify(CONVERSATION_POLICY).toLocaleLowerCase('pt-BR');
  assert.doesNotMatch(dump,/cura|eficácia clínica comprovada|trata depressão/);
});
