import test from 'node:test';
import assert from 'node:assert/strict';
import { createConversation, openingQuestion, nextQuestion, buildSummary } from '../../conversation/engine.js';
import { assessSafety, AI_BOUNDARIES } from '../../safety/policy.js';

test('começa com pergunta proporcional e não exige relato longo', () => {
  const state=createConversation({mode:'feeling',depth:'light'});
  assert.match(openingQuestion(state),/pensamentos|corpo|vontade|relações/i);
});

test('registra resposta como declaração do usuário', () => {
  const state=createConversation({mode:'event',depth:'medium'});
  nextQuestion(state,'Briguei com meu namorado ontem.');
  assert.equal(state.entries[0].source,'declared');
  assert.equal(state.entries[0].text,'Briguei com meu namorado ontem.');
});

test('síntese usa primeira pessoa e não cria diagnóstico', () => {
  const state=createConversation({mode:'session',depth:'medium'});
  nextQuestion(state,'Tenho vergonha de falar sobre meu relacionamento.');
  nextQuestion(state,'Tenho medo de ser julgada.');
  const summary=buildSummary(state);
  assert.match(summary,/Quero falar sobre/i);
  assert.doesNotMatch(summary,/diagnóstico|dependência emocional|transtorno/i);
});

test('situação de perigo imediato interrompe fluxo comum', () => {
  const result=assessSafety({explicitImmediateDanger:true});
  assert.equal(result.interrupt,true);
  assert.equal(result.level,'immediate-risk');
  assert.match(result.message,/apoio humano|emergência/i);
});

test('limites clínicos permanecem desativados', () => {
  assert.equal(AI_BOUNDARIES.diagnose,false);
  assert.equal(AI_BOUNDARIES.prescribe,false);
  assert.equal(AI_BOUNDARIES.clinicalInterpretation,false);
  assert.equal(AI_BOUNDARIES.automaticSharing,false);
});
