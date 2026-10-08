import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createConversation,
  openingQuestion,
  nextQuestion,
  skipQuestion,
  chooseAdaptiveQuestion,
  buildSummary,
  buildStructuredSummary
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
  assert.match(question, /descrevendo desse jeito|tirarmos o rótulo/i);
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

test('síntese estruturada separa conteúdo declarado sem inventar diagnóstico', () => {
  const state = createConversation({ mode: 'session', depth: 'medium' });
  nextQuestion(state, 'Briguei com meu namorado ontem.');
  nextQuestion(state, 'Tenho vergonha de falar sobre meu relacionamento.');
  nextQuestion(state, 'Tenho medo de contar isso na sessão.');

  const structured = buildStructuredSummary(state);
  assert.deepEqual(structured.facts, [
    'Briguei com meu namorado ontem.',
    'Tenho vergonha de falar sobre meu relacionamento.'
  ]);
  assert.deepEqual(structured.emotions, [
    'Tenho vergonha de falar sobre meu relacionamento.',
    'Tenho medo de contar isso na sessão.'
  ]);
  assert.deepEqual(structured.difficulties, [
    'Tenho vergonha de falar sobre meu relacionamento.',
    'Tenho medo de contar isso na sessão.'
  ]);

  const summary = buildSummary(state);
  assert.match(summary, /O que aconteceu/i);
  assert.match(summary, /O que eu disse que senti/i);
  assert.match(summary, /O que está difícil de dizer/i);
  assert.match(summary, /O que eu gostaria de levar para a sessão/i);
  assert.doesNotMatch(summary, /diagnóstico|dependência emocional|transtorno/i);
});

test('síntese deixa lacuna explícita quando uma categoria não foi declarada', () => {
  const state = createConversation({ mode: 'event', depth: 'light' });
  nextQuestion(state, 'Briguei com meu namorado ontem.');
  const summary = buildSummary(state);
  assert.match(summary, /O que eu disse que senti\n• Ainda não ficou claro para mim\./i);
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


test('transcript preserva sequência de mensagens para retomada local', () => {
  const state=createConversation({mode:'session',depth:'light'});
  const first=openingQuestion(state);
  const next=nextQuestion(state,'Tenho algo difícil para contar.');
  assert.deepEqual(state.transcript,[
    {role:'ai',text:first},
    {role:'user',text:'Tenho algo difícil para contar.'},
    {role:'ai',text:next}
  ]);
});


test('usuário pode pular pergunta sem criar conteúdo declarado', () => {
  const state=createConversation({mode:'session',depth:'medium'});
  openingQuestion(state);
  const before=state.entries.length;
  const question=skipQuestion(state);
  assert.equal(state.entries.length,before);
  assert.match(question,/outro caminho|síntese/i);
  assert.equal(state.transcript.at(-2).meta,'skip');
});

test('pulos repetidos reduzem pressão e oferecem parar', () => {
  const state=createConversation({mode:'session',depth:'deep'});
  openingQuestion(state);
  skipQuestion(state);
  const second=skipQuestion(state);
  assert.match(second,/parar por aqui|voltar quando quiser/i);
  assert.equal(state.entries.length,0);
});


test('pedido de diagnóstico recebe limite explícito e não vira fato na síntese', () => {
  const state=createConversation({mode:'feeling',depth:'medium'});
  const question=nextQuestion(state,'Você acha que eu tenho depressão?');
  assert.match(question,/não consigo confirmar nem descartar um diagnóstico/i);
  const structured=buildStructuredSummary(state);
  assert.deepEqual(structured.facts,[]);
  assert.deepEqual(state.entries[0].categories,['question']);
});

test('frase de vínculo exclusivo não é reforçada pela ferramenta', () => {
  const state=createConversation({mode:'session',depth:'medium'});
  const question=nextQuestion(state,'Só consigo falar com você sobre isso.');
  assert.match(question,/não quero ocupar o lugar de uma pessoa ou profissional/i);
  assert.match(question,/alguém de confiança|psicólogo/i);
  assert.doesNotMatch(question,/só precisa de mim|estou sempre aqui para você/i);
});

test('pedido explícito para parar encerra aprofundamento sem pressão', () => {
  const state=createConversation({mode:'session',depth:'deep'});
  const question=nextQuestion(state,'Não quero aprofundar.');
  assert.match(question,/podemos parar por aqui|voltar quando quiser/i);
  assert.deepEqual(state.entries[0].categories,['control']);
  assert.deepEqual(buildStructuredSummary(state).facts,[]);
});

test('contradição é explorada como coexistência e não como rótulo', () => {
  const state=createConversation({mode:'session',depth:'deep'});
  const question=nextQuestion(state,'Quero me afastar, mas tenho medo de perder essa pessoa.');
  assert.match(question,/duas coisas juntas|verdadeiras ao mesmo tempo/i);
  assert.doesNotMatch(question,/ambivalência|dependência|transtorno/i);
});

test('resposta longa é organizada sem reescrever a experiência', () => {
  const state=createConversation({mode:'event',depth:'medium'});
  const longText='Ontem aconteceu muita coisa no trabalho. '.repeat(10);
  const question=nextQuestion(state,longText);
  assert.match(question,/várias partes|aconteceu primeiro|levar à sessão/i);
  assert.doesNotMatch(question,/isso significa|você sente porque/i);
});
