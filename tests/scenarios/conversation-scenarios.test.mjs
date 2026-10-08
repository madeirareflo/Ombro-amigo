import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createConversation,
  openingQuestion,
  nextQuestion,
  chooseAdaptiveQuestion,
  buildSummary
} from '../../conversation/engine.js';
import { assessSafety, AI_BOUNDARIES } from '../../safety/policy.js';

test('começa com pergunta proporcional e não exige relato longo', () => {
  const state = createConversation({ mode: 'feeling', depth: 'light' });
  assert.match(openingQuestion(state), /pensamentos|corpo|vontade|relações/i);
});

test('registra resposta como declaração do usuário', () => {
  const state = createConversation({ mode: 'event', depth: 'medium' });
  nextQuestion(state, 'Briguei com meu namorado ontem.');
  assert.equal(state.entries[0].source, 'declared');
  assert.equal(state.entries[0].text, 'Briguei com meu namorado ontem.');
});

test('resposta "não sei" reduz a exigência em vez de pressionar', () => {
  const state = createConversation({ mode: 'feeling', depth: 'light' });
  openingQuestion(state);
  const question = nextQuestion(state, 'Não sei');
  assert.match(question, /não saber|corpo|pensamentos|vontade|relações|leve|pesado/i);
  assert.doesNotMatch(question, /por quê|porque você/i);
});

test('menção ao corpo gera pergunta sobre a experiência corporal', () => {
  const state = createConversation({ mode: 'feeling', depth: 'medium' });
  const question = chooseAdaptiveQuestion(state, 'Sinto um aperto no peito e fico tenso.');
  assert.match(question, /corpo|sensação|acontecendo/i);
});

test('menção a pensamento gera pergunta sobre o pensamento declarado', () => {
  const state = createConversation({ mode: 'session', depth: 'medium' });
  const question = chooseAdaptiveQuestion(state, 'Fico pensando que ela vai me julgar.');
  assert.match(question, /pensamento|antes|durante|depois/i);
});

test('autojulgamento não é reforçado como rótulo', () => {
  const state = createConversation({ mode: 'session', depth: 'medium' });
  const question = chooseAdaptiveQuestion(state, 'Sou ridículo por ter feito isso.');
  assert.match(question, /aconteceu|fato|situação/i);
  assert.doesNotMatch(question, /você é|realmente ridículo/i);
});

test('perguntas adaptativas não repetem imediatamente a mesma formulação', () => {
  const state = createConversation({ mode: 'event', depth: 'medium' });
  openingQuestion(state);
  const first = nextQuestion(state, 'Tenho vergonha disso.');
  const second = nextQuestion(state, 'Continuo com vergonha.');
  assert.notEqual(first, second);
});

test('profundidade leve converge cedo para síntese em vez de interrogatório', () => {
  const state = createConversation({ mode: 'session', depth: 'light' });
  openingQuestion(state);
  nextQuestion(state, 'É uma coisa da minha família.');
  nextQuestion(state, 'Eu travo quando tento falar.');
  const q = nextQuestion(state, 'Ainda é difícil.');
  assert.match(q, /rascunho|Me ajuda a dizer isso|acrescentar/i);
});

test('síntese usa primeira pessoa e não cria diagnóstico', () => {
  const state = createConversation({ mode: 'session', depth: 'medium' });
  nextQuestion(state, 'Tenho vergonha de falar sobre meu relacionamento.');
  nextQuestion(state, 'Tenho medo de ser julgada.');
  const summary = buildSummary(state);
  assert.match(summary, /Quero falar sobre/i);
  assert.doesNotMatch(summary, /diagnóstico|dependência emocional|transtorno/i);
});

test('situação de perigo imediato interrompe fluxo comum', () => {
  const result = assessSafety({ explicitImmediateDanger: true });
  assert.equal(result.interrupt, true);
  assert.equal(result.level, 'immediate-risk');
  assert.match(result.message, /apoio humano|emergência/i);
});

test('limites clínicos permanecem desativados', () => {
  assert.equal(AI_BOUNDARIES.diagnose, false);
  assert.equal(AI_BOUNDARIES.prescribe, false);
  assert.equal(AI_BOUNDARIES.clinicalInterpretation, false);
  assert.equal(AI_BOUNDARIES.automaticSharing, false);
});
